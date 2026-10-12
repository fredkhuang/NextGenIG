-- Schema changes from the step 2b extraction review (2026-10-11):
--   * sites: capacity (value + unit, initial phase), county; North America scope (US/CA/MX)
--   * milestones: one concrete calendar date, no precision column ("end of 2025" -> 2025-12-31)
--   * announcements: award_status for money items; new 'incentive' type (only logged with an amount)
--   * one article can carry several events of the same type, so the URL dedupe index now also
--     keys on milestone status/date and amount
--   * money & parties: organizations, programs, announcement_parties, funding_flows view

-- ---------------------------------------------------------------------------
-- Sites
-- ---------------------------------------------------------------------------
alter table sites
  add column county text,
  add column capacity_value numeric,
  add column capacity_unit text;   -- e.g. 'GWh/yr', 'tons/yr', 'MW'; always the initial phase
comment on column sites.capacity_value is 'Initial-phase capacity as announced';
comment on column sites.full_time_jobs is 'Initial-phase figure as announced';

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

create type award_status as enum ('selected', 'finalized', 'disbursed', 'rescinded');
alter table announcements add column award_status award_status;

drop view milestone_slips;
drop view site_timeline;
drop view site_milestones_current;

alter table announcements drop constraint milestone_fields;
alter table announcements drop column milestone_precision;
drop type milestone_precision;
alter table announcements add constraint milestone_fields check (
  case when type in ('construction_start', 'production_start', 'production_at_rate')
    then milestone_date is not null and milestone_status is not null
    else milestone_date is null and milestone_status is null
  end
);

drop index announcements_dedupe;
create unique index announcements_dedupe on announcements (
  company_id, site_id, type, milestone_status, milestone_date, amount_usd, canonical_url
) nulls not distinct where canonical_url is not null;

create view site_milestones_current with (security_invoker = true) as
select distinct on (site_id, type)
  site_id, company_id, type, milestone_date, milestone_status,
  announced_on, source_url, id as announcement_id
from announcements
where site_id is not null and milestone_date is not null
order by site_id, type, (milestone_status = 'actual') desc, announced_on desc nulls last, created_at desc;

create view milestone_slips with (security_invoker = true) as
with seq as (
  select
    site_id, company_id, type, announced_on, milestone_date, milestone_status, source_url,
    lag(milestone_date) over w as prev_date,
    lag(milestone_status) over w as prev_status,
    lag(announced_on) over w as prev_announced_on
  from announcements
  where site_id is not null and milestone_date is not null
  window w as (partition by site_id, type order by announced_on nulls first, created_at)
)
select *, (milestone_date - prev_date) as slip_days
from seq
where prev_date is not null
  and prev_status = 'planned'
  and milestone_date is distinct from prev_date;

create view site_timeline with (security_invoker = true) as
select
  s.id as site_id, s.company_id, c.name as company, c.industry, c.sub_industry, s.state, s.country,
  s.mfg_type, s.site_type, s.status, c.founded_year,
  (select min(announced_on) from announcements a where a.site_id = s.id and a.type = 'site_announced') as announced_on,
  max(m.milestone_date) filter (where m.type = 'construction_start' and m.milestone_status = 'actual') as construction_start,
  max(m.milestone_date) filter (where m.type = 'production_start' and m.milestone_status = 'actual') as production_start,
  max(m.milestone_date) filter (where m.type = 'production_at_rate' and m.milestone_status = 'actual') as production_at_rate,
  max(m.milestone_date) filter (where m.type = 'production_start' and m.milestone_status = 'actual')
    - make_date(c.founded_year, 7, 1) as days_founding_to_production
from sites s
join companies c on c.id = s.company_id
left join site_milestones_current m on m.site_id = s.id
group by s.id, c.id;

-- ---------------------------------------------------------------------------
-- Money & parties
-- ---------------------------------------------------------------------------
create type org_type as enum (
  'federal_agency', 'state_agency', 'local_gov', 'vc', 'corporate', 'bank', 'utility',
  'nonprofit', 'university', 'other'
);
create type party_role as enum (
  'lead_investor', 'investor', 'grantor', 'lender', 'customer', 'partner', 'acquirer', 'other'
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text generated always as (normalize_name(name)) stored unique,
  org_type org_type not null default 'other',
  parent_id uuid references organizations(id) on delete set null,
  jurisdiction_state text,      -- state/province for state & local bodies
  jurisdiction_country text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index organizations_name_trgm on organizations using gin (normalized_name extensions.gin_trgm_ops);

create table organization_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  alias text not null,
  normalized_alias text generated always as (normalize_name(alias)) stored unique
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table announcement_parties (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete restrict,
  role party_role not null,
  program_id uuid references programs(id) on delete set null,
  amount_usd numeric,           -- only when this party's own share is disclosed
  created_at timestamptz not null default now(),
  unique (announcement_id, organization_id, role)
);
create index announcement_parties_org on announcement_parties (organization_id);

create trigger organizations_history before update on organizations
  for each row execute function log_entity_changes();

-- Top-level parent for each organization (e.g. Office of Nuclear Energy -> DOE)
create view organization_roots with (security_invoker = true) as
with recursive walk as (
  select id, id as root_id, parent_id, 0 as depth from organizations
  union all
  select w.id, o.id, o.parent_id, w.depth + 1
  from walk w join organizations o on o.id = w.parent_id
  where w.depth < 10
)
select distinct on (id) id, root_id from walk order by id, depth desc;

-- One row per money flow. Amount: the party's disclosed share; otherwise the full total goes to the
-- sole grantor/lender or to the lead investor (or a lone investor), and other co-investors get
-- null, so totals never double-count.
create view funding_flows with (security_invoker = true) as
with money as (
  select a.*, count(*) over (partition by a.id) as funder_count,
         p.organization_id, p.role, p.program_id, p.amount_usd as party_amount
  from announcements a
  join announcement_parties p on p.announcement_id = a.id
  where a.type in ('funding_round', 'grant', 'loan', 'tax_credit', 'incentive')
    and p.role in ('lead_investor', 'investor', 'grantor', 'lender')
)
select
  m.id as announcement_id, m.type, m.award_status, m.announced_on,
  extract(year from m.announced_on)::int as year,
  m.company_id, c.name as company, c.industry, c.sub_industry,
  m.site_id,
  coalesce(s.state, c.hq_state) as state,
  coalesce(s.country, c.hq_country) as country,
  o.id as organization_id, o.name as organization, o.org_type,
  root.id as root_organization_id, root.name as root_organization,
  pr.name as program, m.role,
  coalesce(
    m.party_amount,
    case when m.role = 'lead_investor' or m.funder_count = 1 then m.amount_usd end
  ) as amount_usd
from money m
join companies c on c.id = m.company_id
left join sites s on s.id = m.site_id
join organizations o on o.id = m.organization_id
join organization_roots r on r.id = o.id
join organizations root on root.id = r.root_id
left join programs pr on pr.id = m.program_id;

-- ---------------------------------------------------------------------------
-- Review queue additions
-- ---------------------------------------------------------------------------
alter table proposed_changes
  add column kind text,          -- relabel | restated_date | new_announcement | site_update | possible_new_site
  add column rationale text,
  add column source text;        -- e.g. 'legacy-relabel', 'scrub'
create index proposed_changes_status on proposed_changes (status, created_at);

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;
alter table organization_aliases enable row level security;
alter table programs enable row level security;
alter table announcement_parties enable row level security;

do $$
declare t text;
begin
  foreach t in array array['organizations', 'organization_aliases', 'programs', 'announcement_parties'] loop
    execute format('create policy public_read on %I for select using (true)', t);
    execute format('create policy admin_insert on %I for insert with check (is_admin())', t);
    execute format('create policy admin_update on %I for update using (is_admin()) with check (is_admin())', t);
    execute format('create policy admin_delete on %I for delete using (is_admin())', t);
  end loop;
end $$;

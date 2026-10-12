-- Core schema: companies -> sites -> announcements.
-- Money/party tables (organizations, programs, announcement_parties) are deliberately
-- deferred until the extraction eval validates the structure (plan step 2b).

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type site_status as enum (
  'development', 'construction', 'commissioning', 'production',
  'active', 'delayed', 'inactive', 'canceled'
);
create type mfg_type as enum ('Discrete', 'Process');
create type site_type as enum ('Demo', 'Pilot', 'Full Size');
create type manufacturing_strategy as enum ('In-House', 'Contract');
create type announcement_type as enum (
  -- site milestones
  'site_announced', 'construction_start', 'production_start', 'production_at_rate',
  -- status events
  'status_change', 'delay', 'cancellation', 'bankruptcy',
  -- money and deals
  'funding_round', 'grant', 'loan', 'tax_credit', 'customer_award', 'partnership', 'acquisition',
  'other'
);
create type milestone_precision as enum ('day', 'month', 'quarter', 'year');
create type milestone_status as enum ('planned', 'actual');
create type record_origin as enum ('import', 'admin', 'submission', 'scrub');

-- ---------------------------------------------------------------------------
-- Name normalization (keep in sync with lib/dedupe.ts normalizeName)
-- ---------------------------------------------------------------------------
create or replace function normalize_name(n text) returns text
language sql immutable parallel safe as $$
  select nullif(trim(regexp_replace(
    regexp_replace(
      regexp_replace(lower(coalesce(n, '')), '&', ' and ', 'g'),
      '[^a-z0-9 ]', ' ', 'g'),
    '\m(inc|incorporated|llc|l l c|ltd|limited|corp|corporation|co|company|plc|gmbh|technologies|technology|holdings)\M|\s+', ' ', 'g'
  )), '')
$$;

-- ---------------------------------------------------------------------------
-- Admins (allowlist) and helper
-- ---------------------------------------------------------------------------
create table admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where email = lower(auth.jwt() ->> 'email'))
$$;

-- ---------------------------------------------------------------------------
-- Taxonomy (seeded from the sheet's Choices tab)
-- ---------------------------------------------------------------------------
create table taxonomy (
  industry text not null,
  sub_industry text not null,
  primary key (industry, sub_industry)
);

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  normalized_name text generated always as (normalize_name(name)) stored unique,
  website text,
  website_domain text unique,
  hq_city text,
  hq_state text,
  hq_country text,
  founded_year int check (founded_year between 1800 and 2100),
  industry text,
  sub_industry text,
  manufacturing_strategy manufacturing_strategy,
  description text,
  is_public boolean not null default false,
  ticker text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index companies_name_trgm on companies using gin (normalized_name gin_trgm_ops);

create table company_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  alias text not null,
  normalized_alias text generated always as (normalize_name(alias)) stored unique,
  created_at timestamptz not null default now()
);
create index company_aliases_trgm on company_aliases using gin (normalized_alias gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Sites (no milestone date columns: milestones live in announcements)
-- ---------------------------------------------------------------------------
create table sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete restrict,
  legacy_uid int unique,
  name text,
  address text,
  city text,
  state text,
  country text default 'United States',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  geom geography(Point, 4326) generated always as (
    case when lat is not null and lng is not null
      then st_setsrid(st_makepoint(lng, lat), 4326)::geography end
  ) stored,
  status site_status,
  mfg_type mfg_type,
  site_type site_type,
  first_of_kind boolean,
  construction_jobs int,
  full_time_jobs int,
  cost_mm numeric,
  sqft numeric,
  land_acres numeric,
  land_ownership text,
  envelope_ownership text,
  notes text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sites_company on sites (company_id);
create index sites_geom on sites using gist (geom);

-- ---------------------------------------------------------------------------
-- Announcements: one dated event, one source
-- ---------------------------------------------------------------------------
create table announcements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid references sites(id) on delete cascade,
  type announcement_type not null,
  announced_on date,
  milestone_date date,                -- first day of the period when precision > day
  milestone_precision milestone_precision,
  milestone_status milestone_status,
  amount_usd numeric,
  title text,
  summary text,
  source_url text,
  canonical_url text,
  source_domain text,
  evidence_quote text,
  origin record_origin not null default 'admin',
  import_key text unique,             -- makes re-imports idempotent
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- milestone fields are present exactly for milestone types
  constraint milestone_fields check (
    case when type in ('construction_start', 'production_start', 'production_at_rate')
      then milestone_date is not null and milestone_precision is not null and milestone_status is not null
      else milestone_date is null and milestone_precision is null and milestone_status is null
    end
  ),
  constraint site_belongs_to_company check (site_id is null or company_id is not null)
);
create index announcements_company on announcements (company_id);
create index announcements_site_type on announcements (site_id, type, announced_on);
create unique index announcements_dedupe on announcements (
  company_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid), type, canonical_url
) where canonical_url is not null;

-- Additional sources corroborating the same announcement
create table announcement_sources (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  source_url text not null,
  canonical_url text not null,
  source_domain text,
  published_on date,
  evidence_quote text,
  created_at timestamptz not null default now(),
  unique (announcement_id, canonical_url)
);

-- Pairs an admin has confirmed are NOT duplicates
create table duplicate_dismissals (
  entity_type text not null check (entity_type in ('company', 'site')),
  a_id uuid not null,
  b_id uuid not null,
  dismissed_by text,
  created_at timestamptz not null default now(),
  primary key (entity_type, a_id, b_id),
  check (a_id < b_id)
);

-- ---------------------------------------------------------------------------
-- Change log
-- ---------------------------------------------------------------------------
create table entity_history (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  field text not null,
  old_value jsonb,
  new_value jsonb,
  actor_type record_origin not null,
  actor text,
  created_at timestamptz not null default now()
);
create index entity_history_entity on entity_history (entity_type, entity_id, created_at);

-- Actor comes from `set local app.actor_type / app.actor` in server code; defaults to admin + JWT email.
create or replace function log_entity_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  k text;
  a_type record_origin := coalesce(nullif(current_setting('app.actor_type', true), '')::record_origin, 'admin');
  a text := coalesce(nullif(current_setting('app.actor', true), ''), auth.jwt() ->> 'email');
begin
  new.updated_at := now();
  for k in select jsonb_object_keys(n) loop
    if k not in ('updated_at', 'created_at', 'geom', 'normalized_name')
       and (o -> k) is distinct from (n -> k) then
      insert into entity_history (entity_type, entity_id, field, old_value, new_value, actor_type, actor)
      values (tg_table_name, new.id, k, o -> k, n -> k, a_type, a);
    end if;
  end loop;
  return new;
end $$;

create trigger companies_history before update on companies
  for each row execute function log_entity_changes();
create trigger sites_history before update on sites
  for each row execute function log_entity_changes();
create trigger announcements_history before update on announcements
  for each row execute function log_entity_changes();

-- ---------------------------------------------------------------------------
-- Submissions and scrub
-- ---------------------------------------------------------------------------
create table submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('new_company', 'new_site', 'new_announcement', 'correction')),
  company_id uuid references companies(id) on delete set null,
  site_id uuid references sites(id) on delete set null,
  payload jsonb not null,
  submitter_name text,
  submitter_email text,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table scrub_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  articles_fetched int default 0,
  articles_matched int default 0,
  proposals_created int default 0,
  error text
);

create table articles_seen (
  canonical_url text primary key,
  title text,
  source_domain text,
  published_on date,
  first_seen_run uuid references scrub_runs(id) on delete set null,
  first_seen_at timestamptz not null default now()
);

create table proposed_changes (
  id uuid primary key default gen_random_uuid(),
  scrub_run_id uuid references scrub_runs(id) on delete cascade,
  entity_type text not null check (entity_type in ('company', 'site', 'announcement')),
  op text not null check (op in ('create', 'update', 'add_source')),
  target_id uuid,
  matched_company_id uuid references companies(id) on delete set null,
  match_score real,
  changes jsonb not null,           -- {field: {old, new}} for update; full record for create
  evidence_url text,
  evidence_quote text,
  confidence real,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Analysis views
-- ---------------------------------------------------------------------------

-- Latest statement per (site, milestone); an actual date beats any planned one.
create view site_milestones_current with (security_invoker = true) as
select distinct on (site_id, type)
  site_id, company_id, type, milestone_date, milestone_precision, milestone_status,
  announced_on, source_url, id as announcement_id
from announcements
where site_id is not null and milestone_date is not null
order by site_id, type, (milestone_status = 'actual') desc, announced_on desc nulls last, created_at desc;

-- Every change in a stated milestone date, in announcement order.
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

-- One row per site: founding -> announcement -> construction -> production durations.
create view site_timeline with (security_invoker = true) as
select
  s.id as site_id, s.company_id, c.name as company, c.industry, c.sub_industry, s.state,
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

create view sites_public with (security_invoker = true) as
select s.*, c.name as company, c.slug as company_slug, c.industry, c.sub_industry,
       c.manufacturing_strategy, c.hq_city, c.hq_state, c.hq_country
from sites s join companies c on c.id = s.company_id
where s.is_published;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table admins enable row level security;
alter table taxonomy enable row level security;
alter table companies enable row level security;
alter table company_aliases enable row level security;
alter table sites enable row level security;
alter table announcements enable row level security;
alter table announcement_sources enable row level security;
alter table duplicate_dismissals enable row level security;
alter table entity_history enable row level security;
alter table submissions enable row level security;
alter table scrub_runs enable row level security;
alter table articles_seen enable row level security;
alter table proposed_changes enable row level security;

-- Public read
create policy public_read on taxonomy for select using (true);
create policy public_read on companies for select using (true);
create policy public_read on company_aliases for select using (true);
create policy public_read on sites for select using (is_published or is_admin());
create policy public_read on announcements for select using (is_public or is_admin());
create policy public_read on announcement_sources for select using (true);

-- Admin full access on everything
do $$
declare t text;
begin
  foreach t in array array[
    'admins', 'taxonomy', 'companies', 'company_aliases', 'sites', 'announcements',
    'announcement_sources', 'duplicate_dismissals', 'entity_history', 'submissions',
    'scrub_runs', 'articles_seen', 'proposed_changes'
  ] loop
    execute format('create policy admin_all on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Submissions have no anon insert policy: the /submit server action verifies Turnstile
-- and inserts with the service role key.

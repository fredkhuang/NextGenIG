-- Funding stage for funding rounds ("Series A", "Series B", ...), and a fingerprint on review
-- proposals so rebuilding the queue never re-proposes something already approved or rejected.

create type funding_stage as enum (
  'pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'series_d', 'series_e_plus',
  'growth', 'bridge', 'strategic', 'venture_debt', 'debt', 'ipo', 'spac', 'undisclosed'
);

alter table announcements
  add column funding_stage funding_stage,
  add constraint funding_stage_only_on_rounds check (funding_stage is null or type = 'funding_round');

-- funding_flows gains the stage (appended column; the rest of the view is unchanged).
create or replace view funding_flows with (security_invoker = true) as
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
  ) as amount_usd,
  m.funding_stage
from money m
join companies c on c.id = m.company_id
left join sites s on s.id = m.site_id
join organizations o on o.id = m.organization_id
join organization_roots r on r.id = o.id
join organizations root on root.id = r.root_id
left join programs pr on pr.id = m.program_id;

alter table proposed_changes add column fingerprint text;
create index proposed_changes_fingerprint on proposed_changes (fingerprint);

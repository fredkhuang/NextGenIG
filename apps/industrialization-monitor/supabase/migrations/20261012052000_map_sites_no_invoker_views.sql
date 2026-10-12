-- map.sites runs with its owner's rights, but views it references that are marked security_invoker
-- (site_milestones_current) check the caller's rights, which map_reader doesn't have. Compute the
-- current milestones directly from announcements instead (same rule: actual beats planned, latest wins).
create or replace view map.sites as
with current_milestones as (
  select distinct on (site_id, type) site_id, type, milestone_date, milestone_status
  from public.announcements
  where site_id is not null and milestone_date is not null
  order by site_id, type, (milestone_status = 'actual') desc, announced_on desc nulls last, created_at desc
),
milestones as (
  select site_id,
    max(milestone_date) filter (where type = 'construction_start') as construction_date,
    max(milestone_status::text) filter (where type = 'construction_start') as construction_status,
    max(milestone_date) filter (where type = 'production_start') as production_date,
    max(milestone_status::text) filter (where type = 'production_start') as production_status
  from current_milestones
  group by site_id
),
links as (
  select distinct on (site_id) site_id, source_url
  from public.announcements
  where type = 'site_announced' and is_public and source_url is not null and site_id is not null
  order by site_id, announced_on nulls last, created_at
)
select
  s.id, c.name as company, coalesce(c.industry, 'Other') as industry, c.sub_industry,
  s.status::text as status, s.mfg_type::text as mfg_type, s.site_type::text as site_type,
  c.manufacturing_strategy::text as strategy, s.first_of_kind,
  s.city, s.state, s.country, s.lat, s.lng,
  s.sqft, s.cost_mm, s.full_time_jobs, s.capacity_value, s.capacity_unit,
  c.hq_city, c.hq_state, c.hq_country,
  m.construction_date, m.construction_status, m.production_date, m.production_status,
  l.source_url
from public.sites s
join public.companies c on c.id = s.company_id
left join milestones m on m.site_id = s.id
left join links l on l.site_id = s.id
where s.is_published and s.lat is not null and s.lng is not null;

revoke all on map.sites from public, anon, authenticated;
grant select on map.sites to map_reader;

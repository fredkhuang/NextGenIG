-- Least-privilege access for the public map: a dedicated login that can read one view of published
-- sites (display fields only) and nothing else. The view lives in the `map` schema, which the
-- Supabase API does not expose, so it is reachable only over a direct database connection.
-- The role's password is set out-of-band (never committed): alter role map_reader with password '…'.

create schema if not exists map;
revoke all on schema map from public, anon, authenticated;

create view map.sites as
with milestones as (
  select site_id,
    max(milestone_date) filter (where type = 'construction_start') as construction_date,
    max(milestone_status::text) filter (where type = 'construction_start') as construction_status,
    max(milestone_date) filter (where type = 'production_start') as production_date,
    max(milestone_status::text) filter (where type = 'production_start') as production_status
  from public.site_milestones_current
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

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'map_reader') then
    create role map_reader nologin noinherit;
  end if;
end $$;
-- Nothing else is granted: no public schema tables, no functions, no writes.
grant usage on schema map to map_reader;
grant select on map.sites to map_reader;
alter role map_reader set statement_timeout = '10s';

-- Fixes from `supabase db advisors` after the core migration.

-- 1. Extensions out of the public schema (also removes spatial_ref_sys from the API).
--    pg_trgm is relocatable; postgis is not, so it is recreated and sites.geom re-added.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

drop view sites_public;
drop index if exists sites_geom;
alter table sites drop column geom;
drop extension postgis cascade;
create extension postgis with schema extensions;

alter table sites add column geom extensions.geography(Point, 4326) generated always as (
  case when lat is not null and lng is not null
    then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography end
) stored;
create index sites_geom on sites using gist (geom);

-- sites_public selects s.*, so it had to be dropped before geom; recreate it.
create view sites_public with (security_invoker = true) as
select s.*, c.name as company, c.slug as company_slug, c.industry, c.sub_industry,
       c.manufacturing_strategy, c.hq_city, c.hq_state, c.hq_country
from sites s join companies c on c.id = s.company_id
where s.is_published;

-- 2. Pin search_path on normalize_name (uses only pg_catalog functions).
alter function normalize_name(text) set search_path = '';

-- 3. Trigger function should not be callable through the API.
revoke execute on function log_entity_changes() from public, anon, authenticated;
-- is_admin() stays executable: RLS policies evaluate it for anonymous readers.

-- 4. One permissive policy per action: public tables get admin write-only policies.
do $$
declare t text;
begin
  foreach t in array array[
    'taxonomy', 'companies', 'company_aliases', 'sites', 'announcements', 'announcement_sources'
  ] loop
    execute format('drop policy admin_all on %I', t);
    execute format('create policy admin_insert on %I for insert with check (is_admin())', t);
    execute format('create policy admin_update on %I for update using (is_admin()) with check (is_admin())', t);
    execute format('create policy admin_delete on %I for delete using (is_admin())', t);
  end loop;
end $$;

-- Admin tools: duplicate candidates and merges for companies, sites and organizations.
-- Merge functions run as the calling admin (security invoker), so RLS and entity_history apply.

alter table duplicate_dismissals drop constraint duplicate_dismissals_entity_type_check;
alter table duplicate_dismissals add constraint duplicate_dismissals_entity_type_check
  check (entity_type in ('company', 'site', 'organization'));

create table merge_log (
  id bigint generated always as identity primary key,
  entity_type text not null,
  kept_id uuid not null,
  merged_id uuid not null,
  merged_name text,
  merged_by text default (auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);
alter table merge_log enable row level security;
create policy admin_all on merge_log for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Duplicate candidates
-- ---------------------------------------------------------------------------
create view possible_duplicate_companies with (security_invoker = true) as
select a.id as a_id, a.name as a_name, b.id as b_id, b.name as b_name,
       extensions.similarity(a.normalized_name, b.normalized_name) as score
from companies a
join companies b on a.id < b.id
  and extensions.similarity(a.normalized_name, b.normalized_name) >= 0.6
where not exists (
  select 1 from duplicate_dismissals d where d.entity_type = 'company' and d.a_id = a.id and d.b_id = b.id
);

create view possible_duplicate_organizations with (security_invoker = true) as
select a.id as a_id, a.name as a_name, b.id as b_id, b.name as b_name,
       extensions.similarity(a.normalized_name, b.normalized_name) as score
from organizations a
join organizations b on a.id < b.id
  and extensions.similarity(a.normalized_name, b.normalized_name) >= 0.6
where not exists (
  select 1 from duplicate_dismissals d where d.entity_type = 'organization' and d.a_id = a.id and d.b_id = b.id
);

create view possible_duplicate_sites with (security_invoker = true) as
select a.id as a_id, b.id as b_id, c.id as company_id, c.name as company,
       concat_ws(', ', a.address, a.city, a.state) as a_place,
       concat_ws(', ', b.address, b.city, b.state) as b_place,
       case when a.geom is not null and b.geom is not null
         then round((extensions.st_distance(a.geom, b.geom) / 1000)::numeric, 2) end as km_apart
from sites a
join sites b on a.company_id = b.company_id and a.id < b.id
join companies c on c.id = a.company_id
where (
    (a.geom is not null and b.geom is not null and extensions.st_dwithin(a.geom, b.geom, 2000))
    or (a.address is null and b.address is null and a.city is not null and lower(a.city) = lower(b.city)
        and coalesce(a.state, '') = coalesce(b.state, ''))
  )
  and not exists (
    select 1 from duplicate_dismissals d where d.entity_type = 'site' and d.a_id = a.id and d.b_id = b.id
  );

-- ---------------------------------------------------------------------------
-- Merges
-- ---------------------------------------------------------------------------
create or replace function merge_companies(keep_id uuid, merge_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare lost_name text;
begin
  if not is_admin() then raise exception 'admins only'; end if;
  if keep_id = merge_id then raise exception 'cannot merge a company into itself'; end if;
  select name into lost_name from companies where id = merge_id;
  if lost_name is null then raise exception 'company % not found', merge_id; end if;

  update sites set company_id = keep_id where company_id = merge_id;
  update announcements set company_id = keep_id where company_id = merge_id;
  update submissions set company_id = keep_id where company_id = merge_id;
  update proposed_changes set matched_company_id = keep_id where matched_company_id = merge_id;
  update company_aliases set company_id = keep_id where company_id = merge_id;
  -- Fill gaps on the kept company from the merged one
  update companies k set
    website = coalesce(k.website, m.website),
    hq_city = coalesce(k.hq_city, m.hq_city), hq_state = coalesce(k.hq_state, m.hq_state), hq_country = coalesce(k.hq_country, m.hq_country),
    founded_year = coalesce(k.founded_year, m.founded_year),
    industry = coalesce(k.industry, m.industry), sub_industry = coalesce(k.sub_industry, m.sub_industry),
    manufacturing_strategy = coalesce(k.manufacturing_strategy, m.manufacturing_strategy),
    description = coalesce(k.description, m.description)
  from companies m where k.id = keep_id and m.id = merge_id;
  delete from companies where id = merge_id;
  insert into company_aliases (company_id, alias) values (keep_id, lost_name) on conflict do nothing;
  insert into merge_log (entity_type, kept_id, merged_id, merged_name) values ('company', keep_id, merge_id, lost_name);
end $$;

create or replace function merge_sites(keep_id uuid, merge_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  if keep_id = merge_id then raise exception 'cannot merge a site into itself'; end if;
  if (select company_id from sites where id = keep_id) is distinct from (select company_id from sites where id = merge_id) then
    raise exception 'sites belong to different companies; merge the companies first';
  end if;
  update announcements set site_id = keep_id where site_id = merge_id;
  update submissions set site_id = keep_id where site_id = merge_id;
  update sites k set
    address = coalesce(k.address, m.address), city = coalesce(k.city, m.city), county = coalesce(k.county, m.county),
    state = coalesce(k.state, m.state), lat = coalesce(k.lat, m.lat), lng = coalesce(k.lng, m.lng),
    status = coalesce(k.status, m.status), mfg_type = coalesce(k.mfg_type, m.mfg_type), site_type = coalesce(k.site_type, m.site_type),
    first_of_kind = coalesce(k.first_of_kind, m.first_of_kind),
    construction_jobs = coalesce(k.construction_jobs, m.construction_jobs), full_time_jobs = coalesce(k.full_time_jobs, m.full_time_jobs),
    cost_mm = coalesce(k.cost_mm, m.cost_mm), sqft = coalesce(k.sqft, m.sqft), land_acres = coalesce(k.land_acres, m.land_acres),
    capacity_value = coalesce(k.capacity_value, m.capacity_value), capacity_unit = coalesce(k.capacity_unit, m.capacity_unit),
    notes = nullif(concat_ws(E'\n', k.notes, m.notes), '')
  from sites m where k.id = keep_id and m.id = merge_id;
  delete from sites where id = merge_id;
  insert into merge_log (entity_type, kept_id, merged_id) values ('site', keep_id, merge_id);
end $$;

create or replace function merge_organizations(keep_id uuid, merge_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare lost_name text;
begin
  if not is_admin() then raise exception 'admins only'; end if;
  if keep_id = merge_id then raise exception 'cannot merge an organization into itself'; end if;
  select name into lost_name from organizations where id = merge_id;
  if lost_name is null then raise exception 'organization % not found', merge_id; end if;

  -- Programs: re-point, folding same-named programs together
  update announcement_parties p set program_id = kp.id
    from programs mp join programs kp on kp.organization_id = keep_id and kp.name = mp.name
    where mp.organization_id = merge_id and p.program_id = mp.id;
  delete from programs mp where mp.organization_id = merge_id
    and exists (select 1 from programs kp where kp.organization_id = keep_id and kp.name = mp.name);
  update programs set organization_id = keep_id where organization_id = merge_id;
  -- Parties: drop rows that would duplicate an existing (announcement, org, role)
  delete from announcement_parties mp where mp.organization_id = merge_id
    and exists (select 1 from announcement_parties kp where kp.organization_id = keep_id
                and kp.announcement_id = mp.announcement_id and kp.role = mp.role);
  update announcement_parties set organization_id = keep_id where organization_id = merge_id;
  update organizations set parent_id = keep_id where parent_id = merge_id and id <> keep_id;
  update organization_aliases set organization_id = keep_id where organization_id = merge_id;
  delete from organizations where id = merge_id;
  insert into organization_aliases (organization_id, alias) values (keep_id, lost_name) on conflict do nothing;
  insert into merge_log (entity_type, kept_id, merged_id, merged_name) values ('organization', keep_id, merge_id, lost_name);
end $$;

revoke execute on function merge_companies(uuid, uuid), merge_sites(uuid, uuid), merge_organizations(uuid, uuid) from public, anon;

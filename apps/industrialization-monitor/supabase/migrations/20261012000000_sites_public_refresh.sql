-- sites_public expanded s.* at creation, so it missed columns added later (county, capacity).
drop view sites_public;
create view sites_public with (security_invoker = true) as
select s.*, c.name as company, c.slug as company_slug, c.industry, c.sub_industry,
       c.manufacturing_strategy, c.hq_city, c.hq_state, c.hq_country
from sites s join companies c on c.id = s.company_id
where s.is_published;

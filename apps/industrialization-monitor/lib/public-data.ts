import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { mapDb } from "@/lib/map-db";

// Published site data for the map and its list view, read on the server through the read-only
// map_reader login (lib/map-db.ts). The database exposes nothing to anonymous API callers, and the
// map.sites view returns only the fields the map displays.
// Cached under the "sites" tag; approving a review proposal calls updateTag("sites").

export const SITES_TAG = "sites";

/** Map color groups: the three largest industries get their own hue; the rest share one
 *  (8 hues can't stay distinguishable on a bubble map - see BRAND.md, data visualization). */
export const COLOR_GROUPS = ["Advanced Manufacturing", "Energy", "Batteries", "Other industries"] as const;
export type ColorGroup = (typeof COLOR_GROUPS)[number];
const OWN_HUE = new Set<string>(["Advanced Manufacturing", "Energy", "Batteries"]);
export const colorGroupFor = (industry: string | null): ColorGroup =>
  industry && OWN_HUE.has(industry) ? (industry as ColorGroup) : "Other industries";

export type Milestone = { date: string; status: "planned" | "actual" } | null;
export type MapSite = {
  id: string;
  company: string;
  industry: string | null;
  sub_industry: string | null;
  color_group: ColorGroup;
  status: string | null;
  mfg_type: string | null;
  site_type: string | null;
  strategy: string | null;
  first_of_kind: boolean | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number;
  lng: number;
  sqft: number | null;
  cost_mm: number | null;
  full_time_jobs: number | null;
  capacity: string | null;
  hq: string | null;
  construction_start: Milestone;
  production_start: Milestone;
  source_url: string | null;
};

type Row = {
  id: string; company: string; industry: string; sub_industry: string | null; status: string | null;
  mfg_type: string | null; site_type: string | null; strategy: string | null; first_of_kind: boolean | null;
  city: string | null; state: string | null; country: string | null; lat: number; lng: number;
  sqft: number | null; cost_mm: number | null; full_time_jobs: number | null; capacity_value: number | null; capacity_unit: string | null;
  hq_city: string | null; hq_state: string | null; hq_country: string | null;
  construction_date: string | null; construction_status: "planned" | "actual" | null;
  production_date: string | null; production_status: "planned" | "actual" | null; source_url: string | null;
};

export async function getMapSites(): Promise<MapSite[]> {
  "use cache";
  cacheTag(SITES_TAG);
  cacheLife("hours");

  // map.sites already filters to published, located sites and exposes only display fields.
  const rows = await mapDb()<Row[]>`
    select id, company, industry, sub_industry, status, mfg_type, site_type, strategy, first_of_kind,
           city, state, country, lat::float8 as lat, lng::float8 as lng,
           sqft::float8 as sqft, cost_mm::float8 as cost_mm, full_time_jobs, capacity_value::float8 as capacity_value, capacity_unit,
           hq_city, hq_state, hq_country,
           construction_date::text as construction_date, construction_status,
           production_date::text as production_date, production_status, source_url
    from map.sites
  `;
  const milestone = (date: string | null, status: "planned" | "actual" | null): Milestone =>
    date ? { date, status: status ?? "planned" } : null;

  return rows.map((s) => ({
    id: s.id,
    company: s.company,
    industry: s.industry,
    sub_industry: s.sub_industry,
    color_group: colorGroupFor(s.industry),
    status: s.status,
    mfg_type: s.mfg_type,
    site_type: s.site_type,
    strategy: s.strategy,
    first_of_kind: s.first_of_kind,
    city: s.city,
    state: s.state,
    country: s.country,
    lat: s.lat,
    lng: s.lng,
    sqft: s.sqft,
    cost_mm: s.cost_mm,
    full_time_jobs: s.full_time_jobs,
    capacity: s.capacity_value != null ? `${s.capacity_value.toLocaleString("en-US")} ${s.capacity_unit ?? ""}`.trim() : null,
    hq: [s.hq_city, s.hq_state ?? s.hq_country].filter(Boolean).join(", ") || null,
    construction_start: milestone(s.construction_date, s.construction_status),
    production_start: milestone(s.production_date, s.production_status),
    source_url: s.source_url,
  }));
}

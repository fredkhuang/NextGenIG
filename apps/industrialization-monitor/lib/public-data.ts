import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { serviceClient } from "@/lib/supabase/service";

// Published site data for the map and its list view, read on the server only (the database exposes
// nothing to anonymous API callers). Only fields the map displays are returned.
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

export async function getMapSites(): Promise<MapSite[]> {
  "use cache";
  cacheTag(SITES_TAG);
  cacheLife("hours");

  const db = serviceClient();
  const [sites, milestones, announced] = await Promise.all([
    db.from("sites_public")
      .select("id, company, industry, sub_industry, status, mfg_type, site_type, manufacturing_strategy, first_of_kind, city, state, country, lat, lng, sqft, cost_mm, full_time_jobs, capacity_value, capacity_unit, hq_city, hq_state, hq_country")
      .not("lat", "is", null).not("lng", "is", null).limit(5000),
    db.from("site_milestones_current").select("site_id, type, milestone_date, milestone_status").limit(10000),
    db.from("announcements").select("site_id, source_url, announced_on").eq("type", "site_announced").eq("is_public", true).not("source_url", "is", null).limit(10000),
  ]);
  if (sites.error) throw new Error(`sites_public: ${sites.error.message}`);

  const ms = new Map<string, Record<string, Milestone>>();
  for (const m of milestones.data ?? []) {
    const entry = ms.get(m.site_id) ?? {};
    entry[m.type] = { date: m.milestone_date, status: m.milestone_status };
    ms.set(m.site_id, entry);
  }
  const links = new Map<string, string>();
  for (const a of (announced.data ?? []).sort((x, y) => (x.announced_on ?? "").localeCompare(y.announced_on ?? ""))) {
    if (a.site_id && !links.has(a.site_id)) links.set(a.site_id, a.source_url);
  }

  return (sites.data ?? []).map((s) => ({
    id: s.id,
    company: s.company,
    industry: s.industry ?? "Other",
    sub_industry: s.sub_industry,
    color_group: colorGroupFor(s.industry),
    status: s.status,
    mfg_type: s.mfg_type,
    site_type: s.site_type,
    strategy: s.manufacturing_strategy,
    first_of_kind: s.first_of_kind,
    city: s.city,
    state: s.state,
    country: s.country,
    lat: s.lat,
    lng: s.lng,
    sqft: s.sqft,
    cost_mm: s.cost_mm,
    full_time_jobs: s.full_time_jobs,
    capacity: s.capacity_value != null ? `${Number(s.capacity_value).toLocaleString("en-US")} ${s.capacity_unit ?? ""}`.trim() : null,
    hq: [s.hq_city, s.hq_state ?? s.hq_country].filter(Boolean).join(", ") || null,
    construction_start: ms.get(s.id)?.construction_start ?? null,
    production_start: ms.get(s.id)?.production_start ?? null,
    source_url: links.get(s.id) ?? null,
  }));
}


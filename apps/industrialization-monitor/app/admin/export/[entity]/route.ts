import { createClient } from "@/lib/supabase/server";

// Admin CSV exports. Reads run as the signed-in user, so RLS limits them to admins' view.
const EXPORTS = {
  sites: {
    from: "sites",
    select: "legacy_uid, name, address, city, county, state, country, lat, lng, status, mfg_type, site_type, first_of_kind, sqft, cost_mm, full_time_jobs, construction_jobs, capacity_value, capacity_unit, land_acres, is_published, companies(name, industry, sub_industry), id",
  },
  companies: {
    from: "companies",
    select: "name, website, founded_year, industry, sub_industry, manufacturing_strategy, hq_city, hq_state, hq_country, is_public, ticker, id",
  },
  announcements: {
    from: "announcements",
    select: "announced_on, type, milestone_date, milestone_status, amount_usd, funding_stage, award_status, title, summary, source_url, origin, companies(name), sites(city, state), id",
  },
  funding: {
    from: "funding_flows",
    select: "announced_on, year, type, funding_stage, award_status, company, industry, sub_industry, state, country, organization, org_type, root_organization, program, role, amount_usd",
  },
} as const;

const cell = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return cell(Object.values(v as object).filter((x) => x != null).join(" / "));
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(_req: Request, ctx: RouteContext<"/admin/export/[entity]">) {
  const { entity } = await ctx.params;
  const spec = EXPORTS[entity as keyof typeof EXPORTS];
  if (!spec) return new Response("Unknown export", { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isAdmin } = user ? await supabase.rpc("is_admin") : { data: false };
  if (!isAdmin) return new Response("Admins only", { status: 403 });

  // The select string varies by export, so skip the client's select-string type inference.
  const { data, error } = await supabase.from(spec.from).select(spec.select as string).limit(20000);
  if (error) return new Response(error.message, { status: 500 });
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const csv = [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="monitor-${entity}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

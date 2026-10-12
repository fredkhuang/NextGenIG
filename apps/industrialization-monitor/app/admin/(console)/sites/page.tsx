import Link from "next/link";
import { Suspense } from "react";
import { dash, FilterBar, FilterField, hrefWith, PAGE_SIZE, Pager, param, SearchInput, Select, Table } from "@/components/admin/list";
import { label, SITE_STATUSES } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";

export default function SitesPage({ searchParams }: PageProps<"/admin/sites">) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl text-primary">Sites</h1>
        <a href="/admin/export/sites" download className="text-sm text-primary underline">Export CSV</a>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <SiteList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SiteList({ searchParams }: { searchParams: PageProps<"/admin/sites">["searchParams"] }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q), status = param(sp.status), shown = param(sp.shown);
  const page = Math.max(1, Number(sp.page) || 1);

  let query = supabase
    .from("sites")
    .select("id, name, city, state, country, status, site_type, mfg_type, sqft, is_published, lat, legacy_uid, companies!inner(id, name, industry)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  // Search matches the company name or the city.
  if (q) {
    const { data: matches } = await supabase.from("companies").select("id").ilike("name", `%${q}%`).limit(500);
    const ids = (matches ?? []).map((m) => m.id);
    query = query.or([`city.ilike.%${q.replace(/[,()]/g, " ")}%`, ids.length ? `company_id.in.(${ids.join(",")})` : null].filter(Boolean).join(","));
  }
  if (status) query = query.eq("status", status);
  if (shown === "unpublished") query = query.eq("is_published", false);
  if (shown === "unlocated") query = query.is("lat", null);
  const { data, count } = await query;

  return (
    <>
      <FilterBar action="/admin/sites">
        <FilterField label="Search"><SearchInput value={q} placeholder="Company or city" /></FilterField>
        <FilterField label="Status"><Select name="status" value={status} options={SITE_STATUSES.map((s) => [s, label(s)])} /></FilterField>
        <FilterField label="Map">
          <Select name="shown" value={shown} options={[["unpublished", "Unpublished"], ["unlocated", "Missing coordinates"]]} />
        </FilterField>
      </FilterBar>
      <Table head={["Company", "Location", "Status", "Type", "Sq ft", "Map"]}>
        {(data ?? []).map((s) => {
          const c = s.companies as unknown as { id: string; name: string; industry: string | null };
          return (
            <tr key={s.id} className="border-t border-border">
              <td className="px-3 py-1.5"><Link href={`/admin/companies/${c.id}`} className="hover:underline">{c.name}</Link></td>
              <td className="px-3 py-1.5">
                <Link href={`/admin/sites/${s.id}`} className="font-medium text-primary hover:underline">
                  {[s.name, s.city, s.state, s.country !== "United States" ? s.country : null].filter(Boolean).join(", ") || `Site ${s.legacy_uid ?? ""}`}
                </Link>
              </td>
              <td className="px-3 py-1.5">{s.status ? label(s.status) : "—"}</td>
              <td className="px-3 py-1.5">{dash([s.mfg_type, s.site_type].filter(Boolean).join(" · "))}</td>
              <td className="px-3 py-1.5 tabular-nums">{dash(s.sqft)}</td>
              <td className="px-3 py-1.5">{!s.is_published ? "Unpublished" : s.lat == null ? "No coordinates" : "Shown"}</td>
            </tr>
          );
        })}
      </Table>
      <Pager page={page} total={count ?? 0} href={hrefWith("/admin/sites", { q, status, shown })} />
    </>
  );
}

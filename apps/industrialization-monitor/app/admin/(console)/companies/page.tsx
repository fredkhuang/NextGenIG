import Link from "next/link";
import { Suspense } from "react";
import { dash, FilterBar, FilterField, hrefWith, PAGE_SIZE, Pager, param, SearchInput, Select, Table } from "@/components/admin/list";
import { requireAdmin } from "@/lib/auth";

export default function CompaniesPage({ searchParams }: PageProps<"/admin/companies">) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl text-primary">Companies</h1>
        <a href="/admin/export/companies" download className="text-sm text-primary underline">Export CSV</a>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <CompanyList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CompanyList({ searchParams }: { searchParams: PageProps<"/admin/companies">["searchParams"] }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q), industry = param(sp.industry);
  const page = Math.max(1, Number(sp.page) || 1);

  let query = supabase
    .from("companies")
    .select("id, name, industry, hq_city, hq_state, hq_country, manufacturing_strategy, sites(count), announcements(count)", { count: "exact" })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike("name", `%${q}%`);
  if (industry) query = query.eq("industry", industry);
  const [{ data, count }, { data: tax }] = await Promise.all([query, supabase.from("taxonomy").select("industry")]);
  const industries = [...new Set((tax ?? []).map((t) => t.industry))].sort();

  return (
    <>
      <FilterBar action="/admin/companies">
        <FilterField label="Search"><SearchInput value={q} placeholder="Company name" /></FilterField>
        <FilterField label="Industry"><Select name="industry" value={industry} options={industries.map((i) => [i, i])} /></FilterField>
      </FilterBar>
      <Table head={["Company", "Industry", "HQ", "Strategy", "Sites", "Announcements"]}>
        {(data ?? []).map((c) => (
          <tr key={c.id} className="border-t border-border">
            <td className="px-3 py-1.5"><Link href={`/admin/companies/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link></td>
            <td className="px-3 py-1.5">{dash(c.industry)}</td>
            <td className="px-3 py-1.5">{dash([c.hq_city, c.hq_state ?? c.hq_country].filter(Boolean).join(", "))}</td>
            <td className="px-3 py-1.5">{dash(c.manufacturing_strategy)}</td>
            <td className="px-3 py-1.5 tabular-nums">{(c.sites as unknown as { count: number }[])[0]?.count ?? 0}</td>
            <td className="px-3 py-1.5 tabular-nums">{(c.announcements as unknown as { count: number }[])[0]?.count ?? 0}</td>
          </tr>
        ))}
      </Table>
      <Pager page={page} total={count ?? 0} href={hrefWith("/admin/companies", { q, industry })} />
    </>
  );
}

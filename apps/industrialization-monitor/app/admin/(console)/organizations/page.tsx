import Link from "next/link";
import { Suspense } from "react";
import { dash, FilterBar, FilterField, hrefWith, PAGE_SIZE, Pager, param, SearchInput, Select, Table } from "@/components/admin/list";
import { label, ORG_TYPES } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";

export default function OrganizationsPage({ searchParams }: PageProps<"/admin/organizations">) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl text-primary">Organizations</h1>
        <a href="/admin/export/funding" download className="text-sm text-primary underline">Export funding flows (CSV)</a>
      </div>
      <p className="text-sm text-muted">Investors, agencies, customers and partners named in announcements. Set a parent (e.g. an office under DOE) so funding rolls up.</p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <OrgList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function OrgList({ searchParams }: { searchParams: PageProps<"/admin/organizations">["searchParams"] }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q), type = param(sp.type);
  const page = Math.max(1, Number(sp.page) || 1);
  let query = supabase
    .from("organizations")
    .select("id, name, org_type, jurisdiction_state, parent:parent_id(name), announcement_parties(count)", { count: "exact" })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike("name", `%${q}%`);
  if (type) query = query.eq("org_type", type);
  const { data, count } = await query;

  return (
    <>
      <FilterBar action="/admin/organizations">
        <FilterField label="Search"><SearchInput value={q} placeholder="Organization name" /></FilterField>
        <FilterField label="Type"><Select name="type" value={type} options={ORG_TYPES.map((t) => [t, label(t)])} /></FilterField>
      </FilterBar>
      <Table head={["Organization", "Type", "Parent", "Jurisdiction", "Announcements"]}>
        {(data ?? []).map((o) => (
          <tr key={o.id} className="border-t border-border">
            <td className="px-3 py-1.5"><Link href={`/admin/organizations/${o.id}`} className="font-medium text-primary hover:underline">{o.name}</Link></td>
            <td className="px-3 py-1.5">{label(o.org_type)}</td>
            <td className="px-3 py-1.5">{dash((o.parent as unknown as { name: string } | null)?.name)}</td>
            <td className="px-3 py-1.5">{dash(o.jurisdiction_state)}</td>
            <td className="px-3 py-1.5 tabular-nums">{(o.announcement_parties as unknown as { count: number }[])[0]?.count ?? 0}</td>
          </tr>
        ))}
      </Table>
      <Pager page={page} total={count ?? 0} href={hrefWith("/admin/organizations", { q, type })} />
    </>
  );
}

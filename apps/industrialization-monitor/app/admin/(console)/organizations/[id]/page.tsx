import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { addAlias, mergeRecords, removeAlias, saveRecord } from "@/app/admin/actions";
import { ActionForm, inputClass, RecordForm } from "@/components/admin/forms";
import { dash, Section, Table } from "@/components/admin/list";
import { History } from "@/components/admin/timeline";
import { ENTITIES, label } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";

export default function OrganizationPage({ params }: PageProps<"/admin/organizations/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Organization params={params} />
    </Suspense>
  );
}

async function Organization({ params }: { params: PageProps<"/admin/organizations/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: org }, { data: aliases }, { data: others }, { data: parties }, { data: children }, { data: programs }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
    supabase.from("organization_aliases").select("id, alias").eq("organization_id", id).order("alias"),
    supabase.from("organizations").select("id, name").neq("id", id).order("name"),
    supabase.from("announcement_parties")
      .select("id, role, amount_usd, programs(name), announcements(id, type, announced_on, amount_usd, funding_stage, companies(id, name))")
      .eq("organization_id", id),
    supabase.from("organizations").select("id, name").eq("parent_id", id).order("name"),
    supabase.from("programs").select("id, name").eq("organization_id", id).order("name"),
  ]);
  if (!org) notFound();
  type Party = { id: string; role: string; amount_usd: number | null; programs: { name: string } | null;
    announcements: { id: string; type: string; announced_on: string | null; amount_usd: number | null; companies: { id: string; name: string } } };
  const rows = ((parties ?? []) as unknown as Party[]).sort((a, b) => (b.announcements.announced_on ?? "").localeCompare(a.announcements.announced_on ?? ""));

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3">
        <Link href="/admin/organizations" className="text-sm text-muted underline">Organizations</Link>
        <h1 className="text-3xl text-primary">{org.name}</h1>
        <span className="text-sm text-muted">{label(org.org_type)}</span>
      </div>

      <Section title="Details">
        <RecordForm
          fields={ENTITIES.organizations.fields}
          values={org}
          options={{ organizations: (others ?? []).map((o) => [o.id, o.name]) }}
          action={saveRecord.bind(null, "organizations", id)}
        />
        {(children?.length ?? 0) > 0 && (
          <p className="text-sm">Sub-organizations: {children!.map((c, i) => (
            <span key={c.id}>{i > 0 && ", "}<Link href={`/admin/organizations/${c.id}`} className="text-primary underline">{c.name}</Link></span>
          ))}</p>
        )}
        {(programs?.length ?? 0) > 0 && <p className="text-sm">Programs: {programs!.map((p) => p.name).join(", ")}</p>}
      </Section>

      <Section title="Also known as">
        <ul className="flex flex-wrap gap-2">
          {(aliases ?? []).map((a) => (
            <li key={a.id} className="flex items-center gap-1 rounded-full border border-border px-3 py-0.5 text-sm">
              {a.alias}
              <form action={removeAlias.bind(null, "organizations", a.id)}><button type="submit" aria-label={`Remove alias ${a.alias}`} className="text-muted">×</button></form>
            </li>
          ))}
          {!aliases?.length && <li className="text-sm text-muted">No aliases.</li>}
        </ul>
        <ActionForm action={addAlias.bind(null, "organizations", id)} submit="Add alias" variant="secondary" className="flex flex-wrap items-center gap-2">
          <input name="alias" placeholder="e.g. DOE, U.S. Dept. of Energy" className={`${inputClass} max-w-xs`} />
        </ActionForm>
      </Section>

      <Section title={`Involvement (${rows.length})`}>
        <Table head={["Date", "Company", "Announcement", "Role", "Amount"]}>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="px-3 py-1.5 tabular-nums">{dash(p.announcements.announced_on)}</td>
              <td className="px-3 py-1.5"><Link href={`/admin/companies/${p.announcements.companies.id}`} className="text-primary hover:underline">{p.announcements.companies.name}</Link></td>
              <td className="px-3 py-1.5">{label(p.announcements.type)}{p.programs ? ` · ${p.programs.name}` : ""}</td>
              <td className="px-3 py-1.5">{label(p.role)}</td>
              <td className="px-3 py-1.5 tabular-nums">{p.amount_usd != null ? `$${p.amount_usd.toLocaleString()} (share)` : p.announcements.amount_usd != null ? `$${p.announcements.amount_usd.toLocaleString()} (total)` : "—"}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Merge a duplicate into this organization">
        <ActionForm action={mergeRecords.bind(null, "organizations", id)} submit="Merge into this organization" variant="secondary" className="flex flex-col gap-2 sm:max-w-md">
          <select name="merge_id" className={inputClass} defaultValue="">
            <option value="" disabled>Choose organization to merge in…</option>
            {(others ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="size-4" /> I understand this can&apos;t be undone</label>
        </ActionForm>
      </Section>

      <Section title="Change history">
        <History db={supabase} entityType="organizations" entityId={id} />
      </Section>
    </>
  );
}

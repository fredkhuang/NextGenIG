import Link from "next/link";
import { Suspense } from "react";
import { dismissDuplicate, mergePair } from "@/app/admin/actions";
import { Section, Table } from "@/components/admin/list";
import { requireAdmin } from "@/lib/auth";

export default function DuplicatesPage() {
  return (
    <>
      <h1 className="text-2xl text-primary">Possible duplicates</h1>
      <p className="text-sm text-muted">
        Companies and organizations with similar names, and sites of the same company within 2 km of each other (or in the same city with no address).
        Merging keeps the first record and turns the second&apos;s name into an alias. &quot;Not a duplicate&quot; is remembered.
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Duplicates />
      </Suspense>
    </>
  );
}

function Actions({ entity, merge, a, b }: { entity: "company" | "site" | "organization"; merge: "companies" | "sites" | "organizations"; a: string; b: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={mergePair.bind(null, merge, a, b)}>
        <button type="submit" className="rounded-md border border-primary px-2 py-1 text-xs font-semibold text-primary">Merge 2nd into 1st</button>
      </form>
      <form action={dismissDuplicate.bind(null, entity, a, b)}>
        <button type="submit" className="rounded-md px-2 py-1 text-xs text-muted underline">Not a duplicate</button>
      </form>
    </div>
  );
}

async function Duplicates() {
  const { supabase } = await requireAdmin();
  const [{ data: companies }, { data: sites }, { data: orgs }] = await Promise.all([
    supabase.from("possible_duplicate_companies").select("*").order("score", { ascending: false }).limit(200),
    supabase.from("possible_duplicate_sites").select("*").limit(200),
    supabase.from("possible_duplicate_organizations").select("*").order("score", { ascending: false }).limit(200),
  ]);
  const none = <p className="text-sm text-muted">None found.</p>;
  return (
    <>
      <Section title={`Companies (${companies?.length ?? 0})`}>
        {companies?.length ? (
          <Table head={["First", "Second", "Similarity", ""]}>
            {companies.map((d) => (
              <tr key={`${d.a_id}${d.b_id}`} className="border-t border-border">
                <td className="px-3 py-1.5"><Link href={`/admin/companies/${d.a_id}`} className="text-primary underline">{d.a_name}</Link></td>
                <td className="px-3 py-1.5"><Link href={`/admin/companies/${d.b_id}`} className="text-primary underline">{d.b_name}</Link></td>
                <td className="px-3 py-1.5 tabular-nums">{Number(d.score).toFixed(2)}</td>
                <td className="px-3 py-1.5"><Actions entity="company" merge="companies" a={d.a_id} b={d.b_id} /></td>
              </tr>
            ))}
          </Table>
        ) : none}
      </Section>
      <Section title={`Sites (${sites?.length ?? 0})`}>
        {sites?.length ? (
          <Table head={["Company", "First", "Second", "Apart", ""]}>
            {sites.map((d) => (
              <tr key={`${d.a_id}${d.b_id}`} className="border-t border-border">
                <td className="px-3 py-1.5">{d.company}</td>
                <td className="px-3 py-1.5"><Link href={`/admin/sites/${d.a_id}`} className="text-primary underline">{d.a_place || "Site"}</Link></td>
                <td className="px-3 py-1.5"><Link href={`/admin/sites/${d.b_id}`} className="text-primary underline">{d.b_place || "Site"}</Link></td>
                <td className="px-3 py-1.5 tabular-nums">{d.km_apart != null ? `${d.km_apart} km` : "same city"}</td>
                <td className="px-3 py-1.5"><Actions entity="site" merge="sites" a={d.a_id} b={d.b_id} /></td>
              </tr>
            ))}
          </Table>
        ) : none}
      </Section>
      <Section title={`Organizations (${orgs?.length ?? 0})`}>
        {orgs?.length ? (
          <Table head={["First", "Second", "Similarity", ""]}>
            {orgs.map((d) => (
              <tr key={`${d.a_id}${d.b_id}`} className="border-t border-border">
                <td className="px-3 py-1.5"><Link href={`/admin/organizations/${d.a_id}`} className="text-primary underline">{d.a_name}</Link></td>
                <td className="px-3 py-1.5"><Link href={`/admin/organizations/${d.b_id}`} className="text-primary underline">{d.b_name}</Link></td>
                <td className="px-3 py-1.5 tabular-nums">{Number(d.score).toFixed(2)}</td>
                <td className="px-3 py-1.5"><Actions entity="organization" merge="organizations" a={d.a_id} b={d.b_id} /></td>
              </tr>
            ))}
          </Table>
        ) : none}
      </Section>
    </>
  );
}

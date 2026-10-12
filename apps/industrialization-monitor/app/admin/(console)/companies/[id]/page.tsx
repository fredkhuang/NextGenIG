import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { addAlias, mergeRecords, removeAlias, saveRecord } from "@/app/admin/actions";
import { ActionForm, inputClass, RecordForm } from "@/components/admin/forms";
import { dash, Section, Table } from "@/components/admin/list";
import { AddAnnouncementForm, History, loadAnnouncements, OrgNames, Timeline } from "@/components/admin/timeline";
import { ENTITIES, label } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";
import { FUNDING_STAGE_LABELS, type FundingStage } from "@/lib/queue/types";

export default function CompanyPage({ params }: PageProps<"/admin/companies/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Company params={params} />
    </Suspense>
  );
}

async function Company({ params }: { params: PageProps<"/admin/companies/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: company }, { data: aliases }, { data: sites }, announcements, { data: tax }, { data: others }, { data: funding }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).maybeSingle(),
    supabase.from("company_aliases").select("id, alias").eq("company_id", id).order("alias"),
    supabase.from("sites").select("id, name, city, state, country, status, site_type, is_published, lat").eq("company_id", id).order("city"),
    loadAnnouncements(supabase, { company_id: id }),
    supabase.from("taxonomy").select("industry, sub_industry"),
    supabase.from("companies").select("id, name").neq("id", id).order("name"),
    supabase.from("announcements").select("type, amount_usd, funding_stage, announced_on, award_status")
      .eq("company_id", id).in("type", ["funding_round", "grant", "loan", "tax_credit", "incentive"]).order("announced_on"),
  ]);
  if (!company) notFound();

  const industries = [...new Set((tax ?? []).map((t) => t.industry))].sort();
  const subs = [...new Set((tax ?? []).filter((t) => !company.industry || t.industry === company.industry).map((t) => t.sub_industry))].sort();
  const raised = (funding ?? []).filter((f) => f.type === "funding_round").reduce((n, f) => n + (f.amount_usd ?? 0), 0);
  const publicMoney = (funding ?? []).filter((f) => f.type !== "funding_round" && f.award_status !== "rescinded").reduce((n, f) => n + (f.amount_usd ?? 0), 0);

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3">
        <Link href="/admin/companies" className="text-sm text-muted underline">Companies</Link>
        <h1 className="text-3xl text-primary">{company.name}</h1>
        <span className="text-sm text-muted">{dash(company.industry)}</span>
      </div>

      <Section title="Details">
        <RecordForm
          fields={ENTITIES.companies.fields}
          values={company}
          options={{ industries: industries.map((i) => [i, i]), sub_industries: subs.map((s) => [s, s]) }}
          action={saveRecord.bind(null, "companies", id)}
        />
      </Section>

      <Section title="Also known as">
        <ul className="flex flex-wrap gap-2">
          {(aliases ?? []).map((a) => (
            <li key={a.id} className="flex items-center gap-1 rounded-full border border-border px-3 py-0.5 text-sm">
              {a.alias}
              <form action={removeAlias.bind(null, "companies", a.id)}><button type="submit" aria-label={`Remove alias ${a.alias}`} className="text-muted">×</button></form>
            </li>
          ))}
          {!aliases?.length && <li className="text-sm text-muted">No aliases. Names merged into this company appear here automatically.</li>}
        </ul>
        <ActionForm action={addAlias.bind(null, "companies", id)} submit="Add alias" variant="secondary" className="flex flex-wrap items-center gap-2">
          <input name="alias" placeholder="Former name or spelling" className={`${inputClass} max-w-xs`} />
        </ActionForm>
      </Section>

      <Section title={`Sites (${sites?.length ?? 0})`}>
        <Table head={["Site", "Status", "Type", "Map"]}>
          {(sites ?? []).map((s) => (
            <tr key={s.id} className="border-t border-border">
              <td className="px-3 py-1.5"><Link href={`/admin/sites/${s.id}`} className="text-primary hover:underline">{[s.name, s.city, s.state, s.country !== "United States" ? s.country : null].filter(Boolean).join(", ") || "Unnamed site"}</Link></td>
              <td className="px-3 py-1.5">{s.status ? label(s.status) : "—"}</td>
              <td className="px-3 py-1.5">{dash(s.site_type)}</td>
              <td className="px-3 py-1.5">{!s.is_published ? "Unpublished" : s.lat == null ? "No coordinates" : "Shown"}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Funding">
        <p className="text-sm">
          Raised: <strong>${(raised / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M</strong> in {(funding ?? []).filter((f) => f.type === "funding_round").length} rounds ·
          Grants, loans, credits &amp; incentives: <strong>${(publicMoney / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M</strong>
        </p>
        <p className="text-sm text-muted">
          Rounds: {(funding ?? []).filter((f) => f.type === "funding_round").map((f) => `${f.funding_stage ? FUNDING_STAGE_LABELS[f.funding_stage as FundingStage] : "Round"} (${f.announced_on?.slice(0, 4) ?? "?"})`).join(", ") || "none recorded"}
        </p>
      </Section>

      <Section title={`Announcements (${announcements.length})`}>
        <AddAnnouncementForm companyId={id} siteId={null} />
        <OrgNames db={supabase} />
        <Timeline items={announcements} showSite />
      </Section>

      <Section title="Merge a duplicate into this company">
        <p className="text-sm text-muted">The other company&apos;s sites and announcements move here, its name becomes an alias, and it is deleted.</p>
        <ActionForm action={mergeRecords.bind(null, "companies", id)} submit="Merge into this company" variant="secondary" className="flex flex-col gap-2 sm:max-w-md">
          <select name="merge_id" className={inputClass} defaultValue="">
            <option value="" disabled>Choose company to merge in…</option>
            {(others ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="size-4" /> I understand this can&apos;t be undone</label>
        </ActionForm>
      </Section>

      <Section title="Change history">
        <History db={supabase} entityType="companies" entityId={id} />
      </Section>
    </>
  );
}


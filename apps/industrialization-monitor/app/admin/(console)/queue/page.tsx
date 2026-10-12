import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { type AnnouncementDraft, type Diff, FUNDING_STAGE_LABELS, type FundingStage, KIND_LABELS, type PartyDraft, type QueueKind, type QueuePayload } from "@/lib/queue/types";
import { ReviewButtons } from "./review-buttons";

const PAGE_SIZE = 40;

type Row = {
  id: string; kind: QueueKind; changes: QueuePayload; rationale: string | null; confidence: number | null;
  evidence_url: string | null; evidence_quote: string | null; created_at: string;
  companies: { name: string } | null;
};
type SiteLabel = { id: string; city: string | null; state: string | null; country: string | null; legacy_uid: number | null };

export default function QueuePage({ searchParams }: PageProps<"/admin/queue">) {
  return (
    <>
      <h1 className="text-2xl text-primary">Review queue</h1>
      <Suspense fallback={<p className="text-muted">Loading proposals…</p>}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Queue({ searchParams }: { searchParams: PageProps<"/admin/queue">["searchParams"] }) {
  const { supabase, email } = await requireAdmin();
  const params = await searchParams;
  const kind = typeof params.kind === "string" && params.kind in KIND_LABELS ? (params.kind as QueueKind) : null;
  const page = Math.max(1, Number(params.page) || 1);

  const { data: counts } = await supabase.from("proposed_changes").select("kind").eq("status", "pending");
  const byKind = new Map<string, number>();
  for (const c of counts ?? []) byKind.set(c.kind, (byKind.get(c.kind) ?? 0) + 1);
  const total = counts?.length ?? 0;

  let query = supabase
    .from("proposed_changes")
    .select("id, kind, changes, rationale, confidence, evidence_url, evidence_quote, created_at, companies:matched_company_id(name)", { count: "exact" })
    .eq("status", "pending")
    .order("matched_company_id")
    .order("kind")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (kind) query = query.eq("kind", kind);
  const { data, count } = await query;
  const rows = (data ?? []) as unknown as Row[];

  // Site labels for any site ids mentioned on this page
  const siteIds = new Set<string>();
  for (const r of rows) {
    const p = r.changes;
    if (p.kind === "site_update") siteIds.add(p.site_id);
    if (p.kind === "new_announcement" && p.create.site_id) siteIds.add(p.create.site_id);
    if (p.kind === "restated_date" && p.create.site_id) siteIds.add(p.create.site_id);
  }
  const { data: siteRows } = siteIds.size
    ? await supabase.from("sites").select("id, city, state, country, legacy_uid").in("id", [...siteIds])
    : { data: [] as SiteLabel[] };
  const sites = new Map((siteRows ?? []).map((s) => [s.id, s as SiteLabel]));

  const groups = Map.groupBy(rows, (r) => r.companies?.name ?? "Unknown company");
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (k: string | null, p = 1) => `/admin/queue?${new URLSearchParams({ ...(k ? { kind: k } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <p className="text-sm text-muted">Signed in as {email}. {total} pending.</p>
      <nav aria-label="Filter by kind" className="flex flex-wrap gap-2">
        <Chip href={href(null)} active={!kind}>All ({total})</Chip>
        {(Object.keys(KIND_LABELS) as QueueKind[]).filter((k) => byKind.has(k)).map((k) => (
          <Chip key={k} href={href(k)} active={kind === k}>{KIND_LABELS[k]} ({byKind.get(k)})</Chip>
        ))}
      </nav>

      {rows.length === 0 && <p className="rounded-md bg-surface-warm p-6 text-center">Nothing left to review here.</p>}

      {[...groups].map(([company, items]) => (
        <section key={company} className="flex flex-col gap-3">
          <h2 className="border-b border-border pb-1 text-xl">{company}</h2>
          {items.map((r) => <ProposalCard key={r.id} row={r} sites={sites} />)}
        </section>
      ))}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between border-t border-border pt-4 text-sm">
          {page > 1 ? <Link href={href(kind, page - 1)} className="text-primary underline">← Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={href(kind, page + 1)} className="text-primary underline">Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm ${active ? "border-primary bg-primary text-on-primary" : "border-border-strong hover:border-primary"}`}
    >
      {children}
    </Link>
  );
}

const fmt = (v: unknown) =>
  v == null || v === "" ? <span className="text-muted">—</span>
    : typeof v === "number" ? v.toLocaleString()
      : String(v);

const stageLabel = (v: unknown) => (typeof v === "string" && v in FUNDING_STAGE_LABELS ? FUNDING_STAGE_LABELS[v as FundingStage] : v);

const siteLabel = (sites: Map<string, SiteLabel>, id: string | null) => {
  if (!id) return "Company-level";
  const s = sites.get(id);
  return s ? [s.city, s.state, s.country !== "United States" ? s.country : null].filter(Boolean).join(", ") || `UID ${s.legacy_uid}` : "Site";
};

function DiffTable({ set }: { set: Diff }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted">
          <th className="py-1 pr-4 font-semibold">Field</th>
          <th className="py-1 pr-4 font-semibold">Current</th>
          <th className="py-1 font-semibold">Proposed</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(set).map(([field, v]) => (
          <tr key={field} className="border-t border-border align-top">
            <td className="py-1 pr-4 font-medium">{field.replace(/_/g, " ")}</td>
            <td className="py-1 pr-4">{fmt(field === "funding_stage" ? stageLabel(v.old) : v.old)}</td>
            <td className="py-1">{fmt(field === "funding_stage" ? stageLabel(v.new) : v.new)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Parties({ parties }: { parties: PartyDraft[] }) {
  if (!parties.length) return null;
  return (
    <ul className="text-sm">
      {parties.map((p, i) => (
        <li key={i}>
          <span className="font-medium">{p.name}</span> · {p.role.replace(/_/g, " ")} · {p.org_type.replace(/_/g, " ")}
          {p.parent_org && <> · parent {p.parent_org}</>}
          {p.program && <> · {p.program}</>}
          {p.amount_usd != null && <> · ${p.amount_usd.toLocaleString()}</>}
        </li>
      ))}
    </ul>
  );
}

function Draft({ d, sites }: { d: AnnouncementDraft; sites: Map<string, SiteLabel> }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted">Type</dt><dd>{d.type.replace(/_/g, " ")}{d.milestone_status ? ` (${d.milestone_status})` : ""}</dd>
      <dt className="text-muted">Site</dt><dd>{siteLabel(sites, d.site_id)}</dd>
      {d.milestone_date && <><dt className="text-muted">Milestone date</dt><dd>{d.milestone_date}</dd></>}
      <dt className="text-muted">Announced</dt><dd>{fmt(d.announced_on)}</dd>
      {d.amount_usd != null && <><dt className="text-muted">Amount</dt><dd>${d.amount_usd.toLocaleString()}</dd></>}
      {d.funding_stage && <><dt className="text-muted">Stage</dt><dd>{FUNDING_STAGE_LABELS[d.funding_stage]}</dd></>}
      {d.award_status && <><dt className="text-muted">Award status</dt><dd>{d.award_status}</dd></>}
      {d.parties.length > 0 && <><dt className="text-muted">Parties</dt><dd><Parties parties={d.parties} /></dd></>}
    </dl>
  );
}

function ProposalCard({ row, sites }: { row: Row; sites: Map<string, SiteLabel> }) {
  const p = row.changes;
  const confidence = row.confidence == null ? null : row.confidence >= 0.85 ? "high" : row.confidence >= 0.5 ? "medium" : "low";
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-surface-warm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">{KIND_LABELS[row.kind]}</span>
        {confidence && <span className="text-xs text-muted">{confidence} confidence</span>}
      </div>
      {row.rationale && <p>{row.rationale}</p>}

      {(p.kind === "relabel" || p.kind === "announcement_update" || p.kind === "unsupported_source") && <DiffTable set={p.set} />}
      {(p.kind === "relabel" || p.kind === "announcement_update") && p.parties.length > 0 && (
        <div><p className="text-sm font-semibold">Parties to add</p><Parties parties={p.parties} /></div>
      )}
      {p.kind === "restated_date" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div><p className="mb-1 text-sm font-semibold">Legacy row becomes</p><DiffTable set={p.set} /></div>
          <div><p className="mb-1 text-sm font-semibold">New sourced announcement</p><Draft d={p.create} sites={sites} /></div>
        </div>
      )}
      {p.kind === "new_announcement" && <Draft d={p.create} sites={sites} />}
      {p.kind === "site_update" && (<><p className="text-sm text-muted">Site: {siteLabel(sites, p.site_id)}</p><DiffTable set={p.set} /></>)}
      {p.kind === "add_source" && <p className="text-sm">Adds <a className="text-primary underline" href={p.source.source_url} target="_blank" rel="noreferrer">{p.source.source_domain}</a> as a source.</p>}
      {p.kind === "new_company" && (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            <strong>{p.company.name}</strong>
            {p.company.website && <> · <a className="text-primary underline" href={p.company.website} target="_blank" rel="noreferrer">{p.company.website}</a></>}
            {p.company.industry && <> · {p.company.industry}</>}
          </p>
          <p>
            Site: {[p.site.address, p.site.city, p.site.state, p.site.country].filter(Boolean).join(", ") || "location not given"}
            {p.site.status && <> · {p.site.status}</>}
            {p.site.site_type && <> · {p.site.site_type}</>}
            {p.site.sqft != null && <> · {p.site.sqft.toLocaleString()} sq ft</>}
            {p.site.full_time_jobs != null && <> · {p.site.full_time_jobs} jobs</>}
            {p.site.cost_mm != null && <> · ${p.site.cost_mm}M</>}
          </p>
          <p className="text-muted">If a company with this name already exists, the site is added to it instead.</p>
        </div>
      )}
      {p.kind === "tip" && (
        <div className="text-sm">
          <p>{p.company_name && <><strong>{p.company_name}</strong>: </>}<a className="text-primary underline" href={p.url} target="_blank" rel="noreferrer">{p.url}</a></p>
          {p.notes && <p className="text-muted">{p.notes}</p>}
          <p className="text-muted">Approving marks the tip handled. Add any facts on the company or site page.</p>
        </div>
      )}
      {p.kind === "possible_new_site" && (
        <div className="flex flex-col gap-2 text-sm">
          <p>New site (unpublished until you publish it): {[p.site.name, p.site.address, p.site.city, p.site.county, p.site.state, p.site.country].filter(Boolean).join(", ")}</p>
          {p.announcements.map((a, i) => <Draft key={i} d={a} sites={sites} />)}
        </div>
      )}

      {row.evidence_quote && (
        <blockquote className="border-l-2 border-accent pl-3 text-sm text-muted">
          “{row.evidence_quote}”
          {row.evidence_url && (
            <> — <a className="text-primary underline" href={row.evidence_url} target="_blank" rel="noreferrer">{new URL(row.evidence_url).hostname.replace(/^www\./, "")}</a></>
          )}
        </blockquote>
      )}
      <ReviewButtons id={row.id} />
    </article>
  );
}

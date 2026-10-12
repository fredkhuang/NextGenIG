import type { SupabaseClient } from "@supabase/supabase-js";
import { addAnnouncement, addParty, deleteAnnouncement, removeParty } from "@/app/admin/actions";
import {
  ANNOUNCEMENT_TYPES, AWARD_STATUSES, FUNDING_STAGES, label, MILESTONE_TYPES, ORG_TYPES, PARTY_ROLES,
} from "@/lib/admin/schema";
import { FUNDING_STAGE_LABELS, type FundingStage } from "@/lib/queue/types";
import { ActionForm, inputClass } from "./forms";

type Announcement = {
  id: string; type: string; site_id: string | null; announced_on: string | null; milestone_date: string | null;
  milestone_status: string | null; amount_usd: number | null; award_status: string | null; funding_stage: string | null;
  title: string | null; summary: string | null; source_url: string | null; source_domain: string | null; origin: string;
  evidence_quote: string | null;
  announcement_parties: { id: string; role: string; amount_usd: number | null; organizations: { name: string } | null; programs: { name: string } | null }[];
  announcement_sources: { source_url: string; source_domain: string | null }[];
  sites: { city: string | null; state: string | null } | null;
};

export async function loadAnnouncements(db: SupabaseClient, filter: { company_id?: string; site_id?: string }) {
  let q = db
    .from("announcements")
    .select("id, type, site_id, announced_on, milestone_date, milestone_status, amount_usd, award_status, funding_stage, title, summary, source_url, source_domain, origin, evidence_quote, announcement_parties(id, role, amount_usd, organizations(name), programs(name)), announcement_sources(source_url, source_domain), sites(city, state)")
    .order("announced_on", { ascending: false, nullsFirst: false });
  if (filter.company_id) q = q.eq("company_id", filter.company_id);
  if (filter.site_id) q = q.eq("site_id", filter.site_id);
  const { data } = await q;
  return (data ?? []) as unknown as Announcement[];
}

const money = (n: number | null) => (n == null ? null : `$${n >= 1e6 ? `${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M` : n.toLocaleString()}`);

export function Timeline({ items, showSite, slips }: {
  items: Announcement[]; showSite?: boolean; slips?: Map<string, number>;
}) {
  if (!items.length) return <p className="text-sm text-muted">No announcements yet.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {items.map((a) => {
        const isMoney = ["funding_round", "grant", "loan", "tax_credit", "incentive"].includes(a.type);
        const slip = slips?.get(a.id);
        return (
          <li key={a.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xs text-muted tabular-nums">{a.announced_on ?? "Undated"}</span>
              <span className="font-semibold">{label(a.type)}</span>
              {a.milestone_date && <span>{a.milestone_status === "planned" ? "planned for" : "on"} {a.milestone_date}</span>}
              {slip != null && slip !== 0 && (
                <span className="rounded-sm bg-surface-warm px-1.5 text-xs font-semibold">{slip > 0 ? `slipped ${slip} days` : `pulled in ${-slip} days`}</span>
              )}
              {a.funding_stage && <span>{FUNDING_STAGE_LABELS[a.funding_stage as FundingStage] ?? a.funding_stage}</span>}
              {money(a.amount_usd) && <span className="tabular-nums">{money(a.amount_usd)}</span>}
              {a.award_status && <span className="text-sm text-muted">({a.award_status})</span>}
              {showSite && <span className="text-sm text-muted">{a.sites ? [a.sites.city, a.sites.state].filter(Boolean).join(", ") || "Site" : "Company-level"}</span>}
              <span className="ml-auto text-xs text-muted">{a.origin}</span>
            </div>
            {(a.title || a.summary) && <p className="mt-1 text-sm">{a.title}{a.title && a.summary ? " — " : ""}{a.summary}</p>}
            {a.evidence_quote && <p className="mt-1 border-l-2 border-accent pl-2 text-sm text-muted">“{a.evidence_quote}”</p>}
            <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
              {a.source_url
                ? <a href={a.source_url} target="_blank" rel="noreferrer" className="text-primary underline">{a.source_domain ?? "Source"}</a>
                : <span className="text-muted">No source</span>}
              {a.announcement_sources.map((s) => (
                <a key={s.source_url} href={s.source_url} target="_blank" rel="noreferrer" className="text-primary underline">{s.source_domain ?? "Source"}</a>
              ))}
            </p>
            {a.announcement_parties.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {a.announcement_parties.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.organizations?.name}</span>
                    <span className="text-muted">{label(p.role)}{p.programs ? ` · ${p.programs.name}` : ""}{p.amount_usd != null ? ` · ${money(p.amount_usd)}` : ""}</span>
                    <form action={removeParty.bind(null, p.id)}>
                      <button type="submit" className="text-xs text-muted underline">remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-muted">Edit</summary>
              <div className="mt-2 flex flex-col gap-3">
                {(isMoney || a.type === "customer_award" || a.type === "partnership" || a.type === "acquisition") && (
                  <ActionForm action={addParty.bind(null, a.id)} submit="Add party" variant="secondary" className="grid gap-2 sm:grid-cols-3">
                    <input name="name" placeholder="Organization name" required className={inputClass} list="org-names" />
                    <select name="role" className={inputClass} defaultValue={isMoney ? "investor" : "partner"}>
                      {PARTY_ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
                    </select>
                    <select name="org_type" className={inputClass} defaultValue="other">
                      {ORG_TYPES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
                    </select>
                    <input name="parent_org" placeholder="Parent org (optional)" className={inputClass} />
                    <input name="program" placeholder="Program (optional)" className={inputClass} />
                    <input name="amount_usd" placeholder="Party's share USD (optional)" className={inputClass} />
                  </ActionForm>
                )}
                <form action={deleteAnnouncement.bind(null, a.id)}>
                  <button type="submit" className="text-sm text-accent-fill underline">Delete this announcement</button>
                </form>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function AddAnnouncementForm({ companyId, siteId }: { companyId: string; siteId: string | null }) {
  return (
    <details className="rounded-lg border border-border p-3">
      <summary className="cursor-pointer font-semibold text-primary">Add announcement</summary>
      <p className="mt-2 text-sm text-muted">
        To change a milestone date, add a new dated announcement rather than editing the old one, so the slip history is kept.
        Vague timing goes in as one day: &quot;end of 2025&quot; → 2025-12-31, &quot;mid-2026&quot; → 2026-07-01, &quot;Q1 2027&quot; → 2027-01-01.
      </p>
      <ActionForm action={addAnnouncement.bind(null, companyId, siteId)} submit="Add announcement" className="mt-3 grid gap-3 sm:grid-cols-3">
        <Labeled label="Type">
          <select name="type" required className={inputClass} defaultValue="">
            <option value="" disabled>Choose…</option>
            {ANNOUNCEMENT_TYPES.map((t) => <option key={t} value={t}>{label(t)}{MILESTONE_TYPES.has(t) ? " (milestone)" : ""}</option>)}
          </select>
        </Labeled>
        <Labeled label="Announced on"><input type="date" name="announced_on" defaultValue={today()} className={inputClass} /></Labeled>
        <Labeled label="Source URL"><input type="url" name="source_url" placeholder="https://…" className={inputClass} /></Labeled>
        <Labeled label="Milestone date"><input type="date" name="milestone_date" className={inputClass} /></Labeled>
        <Labeled label="Milestone status">
          <select name="milestone_status" className={inputClass} defaultValue="planned">
            <option value="planned">Planned</option><option value="actual">Actual</option>
          </select>
        </Labeled>
        <Labeled label="Amount (USD)"><input name="amount_usd" inputMode="decimal" placeholder="e.g. 50000000" className={inputClass} /></Labeled>
        <Labeled label="Funding stage">
          <select name="funding_stage" className={inputClass} defaultValue="">
            <option value="">—</option>
            {FUNDING_STAGES.map((s) => <option key={s} value={s}>{FUNDING_STAGE_LABELS[s]}</option>)}
          </select>
        </Labeled>
        <Labeled label="Award status">
          <select name="award_status" className={inputClass} defaultValue="">
            <option value="">—</option>
            {AWARD_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Labeled>
        <Labeled label="Title"><input name="title" className={inputClass} /></Labeled>
        <div className="sm:col-span-3"><Labeled label="Summary"><textarea name="summary" rows={2} className={inputClass} /></Labeled></div>
        {siteId && (
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input type="checkbox" name="company_level" className="size-4" /> Company-level (not tied to this site), e.g. a funding round
          </label>
        )}
      </ActionForm>
    </details>
  );
}

function Labeled({ label: text, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">{text}</span>{children}</label>;
}

export async function History({ db, entityType, entityId }: { db: SupabaseClient; entityType: string; entityId: string }) {
  const { data } = await db
    .from("entity_history").select("id, field, old_value, new_value, actor_type, actor, created_at")
    .eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false }).limit(50);
  if (!data?.length) return <p className="text-sm text-muted">No edits since import.</p>;
  const show = (v: unknown) => (v == null ? "—" : typeof v === "string" ? v : JSON.stringify(v));
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {data.map((h) => (
        <li key={h.id}>
          <span className="text-muted tabular-nums">{new Date(h.created_at).toLocaleString()}</span>{" "}
          <span className="font-medium">{label(h.field)}</span>: {show(h.old_value)} → {show(h.new_value)}{" "}
          <span className="text-muted">({h.actor ?? h.actor_type})</span>
        </li>
      ))}
    </ul>
  );
}

/** Datalist of organization names for the "Add party" inputs. */
export async function OrgNames({ db }: { db: SupabaseClient }) {
  const { data } = await db.from("organizations").select("name").order("name").limit(2000);
  return <datalist id="org-names">{(data ?? []).map((o) => <option key={o.name} value={o.name} />)}</datalist>;
}

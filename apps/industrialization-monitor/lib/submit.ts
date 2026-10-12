import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalUrl, normalizeName, sameCompany, sourceDomain } from "@/lib/dedupe";
import type { AnnouncementDraft, Diff, QueuePayload } from "@/lib/queue/types";

// Cloudflare's published test keys (always pass) are used only in development.
const DEV_SITE_KEY = "1x00000000000000000000AA";
const DEV_SECRET = "1x0000000000000000000000000000000AA";
const isDev = process.env.NODE_ENV !== "production";

export const turnstileSiteKey = () => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? (isDev ? DEV_SITE_KEY : null);
const turnstileSecret = () => process.env.TURNSTILE_SECRET_KEY ?? (isDev ? DEV_SECRET : null);

export async function verifyTurnstile(token: string | null, ip: string | null): Promise<boolean> {
  const secret = turnstileSecret();
  if (!secret || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const json = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return json?.success === true;
}

// Submissions are written with the service role after the Turnstile check (the anon role has no access).
export { serviceClient } from "@/lib/supabase/service";

export const hashIp = (ip: string | null) =>
  ip ? createHash("sha256").update(`${ip}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "ngig"}`).digest("hex").slice(0, 32) : null;

export const RATE_LIMIT_PER_HOUR = 5;

export async function rateLimited(db: SupabaseClient, ipHash: string | null) {
  if (!ipHash) return false;
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("submissions").select("id", { count: "exact", head: true }).eq("submitter_ip_hash", ipHash).gte("created_at", since);
  return (count ?? 0) >= RATE_LIMIT_PER_HOUR;
}

export type SubmissionInput = {
  kind: "new_site" | "correction" | "tip";
  site_id: string | null;
  company_name: string | null;
  website: string | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: string | null;
  mfg_type: string | null;
  site_type: string | null;
  sqft: number | null;
  cost_mm: number | null;
  full_time_jobs: number | null;
  production_date: string | null;
  production_status: "planned" | "actual" | null;
  source_url: string;
  notes: string | null;
};

type ProposalRow = {
  kind: QueuePayload["kind"]; entity_type: "company" | "site" | "announcement"; op: "create" | "update";
  target_id: string | null; matched_company_id: string | null; changes: QueuePayload; rationale: string;
};

/** Turns a submission into review-queue proposals. */
export async function proposalsFor(db: SupabaseClient, s: SubmissionInput): Promise<ProposalRow[]> {
  const source = { source_url: s.source_url, canonical_url: canonicalUrl(s.source_url), source_domain: sourceDomain(s.source_url) };
  const today = new Date().toISOString().slice(0, 10);
  const note = s.notes ? ` Submitter's note: "${s.notes}"` : "";
  const production = (companyId: string, siteId: string | null): AnnouncementDraft | null =>
    s.production_date ? {
      company_id: companyId, site_id: siteId, type: "production_start", announced_on: today,
      milestone_date: s.production_date, milestone_status: s.production_status ?? "planned",
      amount_usd: null, award_status: null, funding_stage: null, title: null, summary: "Community submission",
      ...source, evidence_quote: null, parties: [],
    } : null;

  if (s.kind === "tip") {
    return [{
      kind: "tip", entity_type: "announcement", op: "create", target_id: null, matched_company_id: null,
      changes: { kind: "tip", url: s.source_url, notes: s.notes, company_name: s.company_name },
      rationale: `News tip${s.company_name ? ` about ${s.company_name}` : ""}.${note}`,
    }];
  }

  // A "new site" for a tracked company in a city where it already has a site is really a correction.
  if (s.kind === "new_site" && s.company_name && s.city) {
    const { data: companies } = await db.from("companies").select("id, name, normalized_name");
    const company = companies?.find((c) => c.normalized_name === normalizeName(s.company_name)) ?? companies?.find((c) => sameCompany(c.name, s.company_name!));
    if (company) {
      const { data: existing } = await db.from("sites").select("id, city, state").eq("company_id", company.id).ilike("city", s.city);
      const same = existing?.find((x) => !s.state || !x.state || x.state.toLowerCase() === s.state.toLowerCase());
      if (same) return proposalsFor(db, { ...s, kind: "correction", site_id: same.id });
    }
  }

  if (s.kind === "correction" && s.site_id) {
    const { data: site } = await db.from("sites").select("id, company_id, address, city, state, country, status, mfg_type, site_type, sqft, cost_mm, full_time_jobs").eq("id", s.site_id).maybeSingle();
    if (!site) throw new Error("That site no longer exists.");
    const set: Diff = {};
    for (const k of ["address", "city", "state", "country", "status", "mfg_type", "site_type", "sqft", "cost_mm", "full_time_jobs"] as const) {
      if (s[k] != null && s[k] !== site[k]) set[k] = { old: site[k], new: s[k] };
    }
    const rows: ProposalRow[] = [];
    if (Object.keys(set).length) {
      rows.push({
        kind: "site_update", entity_type: "site", op: "update", target_id: site.id, matched_company_id: site.company_id,
        changes: { kind: "site_update", site_id: site.id, set }, rationale: `Community correction.${note}`,
      });
    }
    const prod = production(site.company_id, site.id);
    if (prod) {
      rows.push({
        kind: "new_announcement", entity_type: "announcement", op: "create", target_id: null, matched_company_id: site.company_id,
        changes: { kind: "new_announcement", create: prod }, rationale: `Community correction: production ${prod.milestone_status} ${prod.milestone_date}.${note}`,
      });
    }
    if (!rows.length) {
      rows.push({
        kind: "tip", entity_type: "announcement", op: "create", target_id: null, matched_company_id: site.company_id,
        changes: { kind: "tip", url: s.source_url, notes: s.notes, company_name: s.company_name },
        rationale: `Correction with no field changes, only a note and source.${note}`,
      });
    }
    return rows;
  }

  // New site: attach to an existing company when the name matches, otherwise propose a new company.
  const name = s.company_name!;
  const { data: companies } = await db.from("companies").select("id, name, normalized_name");
  const { data: aliases } = await db.from("company_aliases").select("company_id, normalized_alias");
  const norm = normalizeName(name);
  const match = companies?.find((c) => c.normalized_name === norm)
    ?? companies?.find((c) => c.id === aliases?.find((a) => a.normalized_alias === norm)?.company_id)
    ?? companies?.find((c) => sameCompany(c.name, name));
  const site = {
    address: s.address, city: s.city, county: null, state: s.state, country: s.country ?? "United States", name: null,
    status: s.status, mfg_type: s.mfg_type, site_type: s.site_type, sqft: s.sqft, cost_mm: s.cost_mm, full_time_jobs: s.full_time_jobs,
    is_published: true,
  };
  const announced = (companyId: string): AnnouncementDraft => ({
    company_id: companyId, site_id: null, type: "site_announced", announced_on: today, milestone_date: null, milestone_status: null,
    amount_usd: null, award_status: null, funding_stage: null, title: null, summary: "Community submission", ...source, evidence_quote: null, parties: [],
  });

  if (match) {
    const prod = production(match.id, null);
    return [{
      kind: "possible_new_site", entity_type: "site", op: "create", target_id: null, matched_company_id: match.id,
      changes: { kind: "possible_new_site", site: { ...site, company_id: match.id }, announcements: [announced(match.id), ...(prod ? [prod] : [])] },
      rationale: `Community submission of a new ${match.name} site${match.name !== name ? ` (submitted as "${name}")` : ""}.${note}`,
    }];
  }
  const strip = ({ company_id: _c, site_id: _s, ...a }: AnnouncementDraft) => a;
  const prod = production("", null);
  return [{
    kind: "new_company", entity_type: "company", op: "create", target_id: null, matched_company_id: null,
    changes: {
      kind: "new_company",
      company: { name, website: s.website, industry: s.industry, hq_city: null, hq_state: null, hq_country: null },
      site,
      announcements: [strip(announced("")), ...(prod ? [strip(prod)] : [])],
    },
    rationale: `Community submission of a company not yet tracked.${note}`,
  }];
}

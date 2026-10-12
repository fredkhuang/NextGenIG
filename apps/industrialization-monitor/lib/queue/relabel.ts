// Compares one article's extraction with what the database holds for that article's URL and
// proposes changes for review. Pure: the caller loads data and writes proposals.

import { ANNOUNCEMENT_MERGE_DAYS, sameCompany } from "@/lib/dedupe";
import type { ExtractionResult } from "@/lib/extract/extract";
import type { AnnouncementDraft, Diff, PartyDraft, QueuePayload, SiteDraft } from "./types";

type Extracted = ExtractionResult["announcements"][number];

export type DbSite = {
  id: string; legacy_uid: number | null; city: string | null; county: string | null; state: string | null; country: string | null;
  cost_mm: number | null; sqft: number | null; full_time_jobs: number | null; construction_jobs: number | null;
  capacity_value: number | null; capacity_unit: string | null;
};
export type DbAnnouncement = {
  id: string; site_id: string | null; type: string; origin: string;
  announced_on: string | null; milestone_date: string | null; milestone_status: string | null;
  amount_usd: number | null; award_status: string | null; funding_stage: string | null; canonical_url: string | null;
  extra_urls: string[]; party_count: number; site_legacy_uid: number | null;
};
export type Article = { url: string; canonical_url: string; source_domain: string | null };
export type Proposal = {
  kind: QueuePayload["kind"];
  entity_type: "announcement" | "site";
  op: "create" | "update" | "add_source";
  target_id: string | null;
  payload: QueuePayload;
  evidence_quote: string | null;
  confidence: number;
  rationale: string;
};

const MILESTONES = new Set(["construction_start", "production_start", "production_at_rate"]);
const MONEY = new Set(["funding_round", "grant", "loan", "tax_credit", "incentive"]);
// Imported "site_announced" rows are relabelled to what the article is really about, in this order.
const RELABEL_PREFERENCE = [
  "funding_round", "grant", "loan", "tax_credit", "incentive", "customer_award", "partnership",
  "acquisition", "status_change", "cancellation", "delay", "bankruptcy",
];
const CONFIDENCE = { high: 0.9, medium: 0.6, low: 0.3 } as const;

const daysApart = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\b(county|parish|city of)\b/g, "").replace(/[^a-z]/g, "");
const near = (a: number, b: number) => Math.abs(a - b) <= 0.1 * Math.max(Math.abs(a), Math.abs(b), 1);
const typeKey = (t: string, s: string | null) => (s ? `${t}:${s}` : t);

export function buildProposals(input: {
  article: Article;
  extraction: ExtractionResult;
  companyName: string;
  companyId: string;
  sites: DbSite[];
  announcements: DbAnnouncement[];
  expectedSiteUid: number | null;
  lastUpdatedByUid: Map<number, string | null>;
}): Proposal[] {
  const { article, extraction, companyName, companyId, sites, announcements } = input;
  const proposals: Proposal[] = [];
  if (!extraction.is_relevant) return proposals;

  // Milestones need a date to be stored; "other" is too vague to review usefully.
  const ours = extraction.announcements.filter((a) =>
    sameCompany(a.company_name, companyName) && a.type !== "other" && (!MILESTONES.has(a.type) || !!a.milestone_date));
  if (!ours.length) return proposals;

  const fromUrl = announcements.filter((a) => a.canonical_url === article.canonical_url || a.extra_urls.includes(article.canonical_url));
  const defaultSite =
    sites.find((s) => s.id === fromUrl.find((a) => a.site_id)?.site_id) ??
    sites.find((s) => s.legacy_uid === input.expectedSiteUid) ??
    (sites.length === 1 ? sites[0] : null); // new articles: a single-site company's news is about that site

  // --- site resolution -------------------------------------------------------------------------
  const newSites = new Map<string, { site: SiteDraft; announcements: AnnouncementDraft[]; quote: string; confidence: number }>();
  const siteNote = new Map<Extracted, string>();
  const resolveSite = (a: Extracted): string | null | "NEW" => {
    const siteLevel = MILESTONES.has(a.type) || a.type === "site_announced" || a.type === "status_change" ||
      a.type === "delay" || a.type === "cancellation";
    if (!a.site || (!a.site.city && !a.site.county && !a.site.state)) return siteLevel ? defaultSite?.id ?? null : null;
    const byPlace = sites.find((s) =>
      (a.site!.city && norm(s.city) === norm(a.site!.city)) || (a.site!.county && s.county && norm(s.county) === norm(a.site!.county)) ||
      (a.site!.county && norm(s.city) === norm(a.site!.county)));
    if (byPlace) return byPlace.id;
    // Neighbouring town / county naming: same state and the company has only one site there.
    const sameState = sites.filter((s) => s.state && a.site!.state && s.state.toUpperCase() === a.site!.state.toUpperCase());
    if (sameState.length === 1) {
      if (a.site.city && sameState[0].city) siteNote.set(a, `article says ${a.site.city}, site record says ${sameState[0].city}`);
      return sameState[0].id;
    }
    if (defaultSite && !defaultSite.city && !defaultSite.state) return defaultSite.id;
    if (!siteLevel && !a.site.city) return null;
    return "NEW";
  };

  const draft = (a: Extracted, siteId: string | null): AnnouncementDraft => ({
    company_id: companyId,
    site_id: siteId,
    type: a.type,
    announced_on: a.announced_on,
    milestone_date: MILESTONES.has(a.type) ? a.milestone_date : null,
    milestone_status: MILESTONES.has(a.type) ? a.milestone_status ?? "planned" : null,
    amount_usd: a.amount_usd,
    award_status: a.award_status,
    funding_stage: a.type === "funding_round" ? a.funding_stage : null,
    title: null,
    summary: null,
    source_url: article.url,
    canonical_url: article.canonical_url,
    source_domain: article.source_domain,
    evidence_quote: a.evidence_quote,
    parties: a.parties as PartyDraft[],
  });

  const push = (p: Omit<Proposal, "evidence_quote" | "confidence">, a: Extracted | null) =>
    proposals.push({ ...p, evidence_quote: a?.evidence_quote ?? null, confidence: a ? CONFIDENCE[a.confidence] : 0.6 });

  // --- match extracted announcements to DB rows from this URL ---------------------------------
  const used = new Set<DbAnnouncement>();
  const consumed = new Set<Extracted>();
  const resolved = new Map<Extracted, string | null | "NEW">();
  for (const a of ours) resolved.set(a, resolveSite(a));

  for (const a of ours) {
    const siteId = resolved.get(a)!;
    if (siteId === "NEW") continue;
    const status = MILESTONES.has(a.type) ? a.milestone_status : null;
    const candidates = fromUrl.filter((m) => !used.has(m) && m.type === a.type && (m.milestone_status ?? null) === (status ?? null));
    const m = candidates.find((c) => c.site_id === siteId) ?? candidates[0];
    if (!m) continue;
    used.add(m);
    consumed.add(a);

    if (MILESTONES.has(a.type) && a.milestone_date && m.milestone_date && a.milestone_date !== m.milestone_date) {
      if (m.origin === "import") {
        const legacyAnnounced = m.site_legacy_uid != null ? input.lastUpdatedByUid.get(m.site_legacy_uid) ?? null : null;
        push({
          kind: "restated_date", entity_type: "announcement", op: "update", target_id: m.id,
          payload: {
            kind: "restated_date", announcement_id: m.id,
            set: {
              source_url: { old: article.url, new: null },
              canonical_url: { old: m.canonical_url, new: null },
              announced_on: { old: m.announced_on, new: legacyAnnounced },
              summary: { old: null, new: "Legacy sheet value; source unknown (the linked article states a different date)" },
            },
            create: draft(a, m.site_id ?? siteId),
          },
          rationale: `${typeKey(a.type, status)}: article says ${a.milestone_date} (published ${a.announced_on ?? "?"}); sheet has ${m.milestone_date}. The sheet value was likely updated later without a new link, so it is kept as an unsourced restatement${legacyAnnounced ? ` dated ${legacyAnnounced} (sheet Last Updated)` : ""}, and the article's statement is added with its source.`,
        }, a);
      } else {
        push({
          kind: "announcement_update", entity_type: "announcement", op: "update", target_id: m.id,
          payload: { kind: "announcement_update", announcement_id: m.id, set: { milestone_date: { old: m.milestone_date, new: a.milestone_date } }, parties: [] },
          rationale: `${typeKey(a.type, status)} date differs from the article.`,
        }, a);
      }
      continue;
    }

    const set: Diff = {};
    if (a.announced_on && (!m.announced_on || daysApart(a.announced_on, m.announced_on) > 7)) set.announced_on = { old: m.announced_on, new: a.announced_on };
    if (a.amount_usd != null && (m.amount_usd == null || !near(a.amount_usd, m.amount_usd))) set.amount_usd = { old: m.amount_usd, new: a.amount_usd };
    if (a.award_status && a.award_status !== m.award_status) set.award_status = { old: m.award_status, new: a.award_status };
    if (a.type === "funding_round" && a.funding_stage && a.funding_stage !== m.funding_stage) set.funding_stage = { old: m.funding_stage, new: a.funding_stage };
    const parties = MONEY.has(a.type) && m.party_count === 0 ? (a.parties as PartyDraft[]) : [];
    if (Object.keys(set).length || parties.length) {
      push({
        kind: "announcement_update", entity_type: "announcement", op: "update", target_id: m.id,
        payload: { kind: "announcement_update", announcement_id: m.id, set, parties },
        rationale: `Article adds or corrects ${[...Object.keys(set), parties.length ? "parties" : null].filter(Boolean).join(", ")}.`,
      }, a);
    }
  }

  // --- imported rows from this URL that the article doesn't support ---------------------------
  for (const m of fromUrl.filter((x) => !used.has(x) && x.origin === "import" && x.canonical_url === article.canonical_url)) {
    if (m.type === "site_announced") {
      const target = RELABEL_PREFERENCE.map((t) => ours.find((a) => !consumed.has(a) && a.type === t && resolved.get(a) !== "NEW")).find(Boolean);
      if (target) {
        consumed.add(target);
        const set: Diff = { type: { old: m.type, new: target.type } };
        if (target.announced_on && target.announced_on !== m.announced_on) set.announced_on = { old: m.announced_on, new: target.announced_on };
        if (target.amount_usd != null) set.amount_usd = { old: m.amount_usd, new: target.amount_usd };
        if (target.award_status) set.award_status = { old: m.award_status, new: target.award_status };
        if (target.type === "funding_round" && target.funding_stage) set.funding_stage = { old: m.funding_stage, new: target.funding_stage };
        const siteId = resolved.get(target) as string | null;
        if (!MILESTONES.has(target.type) && siteId !== m.site_id && MONEY.has(target.type) && !siteId) set.site_id = { old: m.site_id, new: null };
        push({
          kind: "relabel", entity_type: "announcement", op: "update", target_id: m.id,
          payload: { kind: "relabel", announcement_id: m.id, set, parties: target.parties as PartyDraft[] },
          rationale: `The sheet's "Announcement Link" was imported as a site announcement, but the article is a ${target.type.replace(/_/g, " ")}.`,
        }, target);
        continue;
      }
    }
    push({
      kind: "unsupported_source", entity_type: "announcement", op: "update", target_id: m.id,
      payload: {
        kind: "unsupported_source", announcement_id: m.id,
        set: {
          source_url: { old: article.url, new: null },
          canonical_url: { old: m.canonical_url, new: null },
          summary: { old: null, new: "Legacy sheet value; the linked article does not state this" },
        },
      },
      rationale: `The article doesn't mention a ${typeKey(m.type, m.milestone_status).replace(/_/g, " ")}${m.milestone_date ? ` (${m.milestone_date})` : ""}. Keep the fact, detach the link.`,
    }, null);
  }

  // --- remaining extracted announcements: corroborate or create --------------------------------
  for (const a of ours.filter((x) => !consumed.has(x))) {
    const siteId = resolved.get(a)!;
    if (siteId === "NEW") {
      const key = `${norm(a.site?.city)}|${norm(a.site?.state)}`;
      const entry = newSites.get(key) ?? {
        site: { company_id: companyId, name: a.site?.name ?? null, address: a.site?.address ?? null, city: a.site?.city ?? null, county: a.site?.county ?? null, state: a.site?.state ?? null, country: a.site?.country ?? null },
        announcements: [], quote: a.evidence_quote, confidence: CONFIDENCE[a.confidence],
      };
      entry.announcements.push(draft(a, null));
      newSites.set(key, entry);
      continue;
    }
    const status = MILESTONES.has(a.type) ? a.milestone_status : null;
    const existing = announcements.find((m) =>
      m.type === a.type && (m.milestone_status ?? null) === (status ?? null) && (m.site_id ?? null) === (siteId ?? null) &&
      m.canonical_url !== article.canonical_url && !m.extra_urls.includes(article.canonical_url) &&
      (MILESTONES.has(a.type)
        ? m.milestone_date === a.milestone_date ||
          // An actual milestone happens once; "began production in June" corroborates June 10.
          (status === "actual" && !!m.milestone_date && !!a.milestone_date && daysApart(m.milestone_date, a.milestone_date) <= 31)
        : MONEY.has(a.type)
          ? (a.amount_usd != null && m.amount_usd != null && near(a.amount_usd, m.amount_usd)) ||
            (!!a.announced_on && !!m.announced_on && daysApart(a.announced_on, m.announced_on) <= ANNOUNCEMENT_MERGE_DAYS)
          : a.type === "site_announced" || (!!a.announced_on && !!m.announced_on && daysApart(a.announced_on, m.announced_on) <= ANNOUNCEMENT_MERGE_DAYS)));
    if (existing) {
      push({
        kind: "add_source", entity_type: "announcement", op: "add_source", target_id: existing.id,
        payload: { kind: "add_source", announcement_id: existing.id, source: { source_url: article.url, canonical_url: article.canonical_url, source_domain: article.source_domain, evidence_quote: a.evidence_quote } },
        rationale: `Same ${typeKey(a.type, status).replace(/_/g, " ")} is already recorded from another source; this article corroborates it.`,
      }, a);
      continue;
    }
    push({
      kind: "new_announcement", entity_type: "announcement", op: "create", target_id: null,
      payload: { kind: "new_announcement", create: draft(a, siteId) },
      rationale: `Not in the database: ${typeKey(a.type, status).replace(/_/g, " ")}${a.milestone_date ? ` ${a.milestone_date}` : ""}${a.amount_usd != null ? ` $${a.amount_usd.toLocaleString()}` : ""}${siteNote.has(a) ? ` (${siteNote.get(a)})` : ""}.`,
    }, a);
  }

  for (const [, s] of newSites) {
    proposals.push({
      kind: "possible_new_site", entity_type: "site", op: "create", target_id: null,
      payload: { kind: "possible_new_site", site: s.site, announcements: s.announcements },
      evidence_quote: s.quote, confidence: s.confidence,
      rationale: `Article describes a site in ${[s.site.city, s.site.county, s.site.state].filter(Boolean).join(", ")} that doesn't match any of ${companyName}'s ${sites.length} recorded site(s).`,
    });
  }

  // --- site facts --------------------------------------------------------------------------------
  const factSources = ours.filter((a) => a.site_facts && (resolved.get(a) === defaultSite?.id || resolved.get(a) == null));
  if (defaultSite && factSources.length) {
    const pick = <K extends keyof NonNullable<Extracted["site_facts"]>>(k: K) => factSources.find((a) => a.site_facts![k] != null)?.site_facts![k] ?? null;
    const set: Diff = {};
    const conflicts: string[] = [];
    for (const k of ["cost_mm", "sqft", "full_time_jobs", "construction_jobs", "capacity_value"] as const) {
      const got = pick(k) as number | null;
      const have = defaultSite[k];
      if (got == null) continue;
      if (have == null) set[k] = { old: null, new: got };
      else if (!near(got, have)) { set[k] = { old: have, new: got }; conflicts.push(k); }
    }
    if (set.capacity_value) set.capacity_unit = { old: defaultSite.capacity_unit, new: pick("capacity_unit") };
    const county = ours.find((a) => resolved.get(a) === defaultSite.id && a.site?.county)?.site?.county;
    if (county && !defaultSite.county) set.county = { old: null, new: county };
    if (Object.keys(set).length) {
      const quoteFrom = factSources.find((a) => a.site_facts && Object.keys(set).some((k) => (a.site_facts as Record<string, unknown>)[k] != null)) ?? factSources[0];
      proposals.push({
        kind: "site_update", entity_type: "site", op: "update", target_id: defaultSite.id,
        payload: { kind: "site_update", site_id: defaultSite.id, set },
        evidence_quote: quoteFrom.evidence_quote, confidence: CONFIDENCE[quoteFrom.confidence],
        rationale: conflicts.length
          ? `Article figures differ from the record for ${conflicts.join(", ")} (initial-phase figures per the new rule); other fields fill gaps.`
          : `Fills missing site facts from the article (initial phase).`,
      });
    }
  }
  return proposals;
}

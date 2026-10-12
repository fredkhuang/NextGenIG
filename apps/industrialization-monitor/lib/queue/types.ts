// Payloads stored in proposed_changes.changes. Shared by the queue builders and the apply step.

export type Diff = Record<string, { old: unknown; new: unknown }>;

export type PartyDraft = {
  name: string;
  role: "lead_investor" | "investor" | "grantor" | "lender" | "customer" | "partner" | "acquirer" | "other";
  org_type: "federal_agency" | "state_agency" | "local_gov" | "vc" | "corporate" | "bank" | "utility" | "nonprofit" | "university" | "other";
  parent_org: string | null;
  program: string | null;
  amount_usd: number | null;
};

export const FUNDING_STAGE_LABELS = {
  pre_seed: "Pre-seed", seed: "Seed", series_a: "Series A", series_b: "Series B", series_c: "Series C",
  series_d: "Series D", series_e_plus: "Series E+", growth: "Growth", bridge: "Bridge", strategic: "Strategic",
  venture_debt: "Venture debt", debt: "Debt", ipo: "IPO", spac: "SPAC", undisclosed: "Undisclosed",
} as const;
export type FundingStage = keyof typeof FUNDING_STAGE_LABELS;

export type AnnouncementDraft = {
  company_id: string;
  site_id: string | null;
  type: string;
  announced_on: string | null;
  milestone_date: string | null;
  milestone_status: "planned" | "actual" | null;
  amount_usd: number | null;
  award_status: "selected" | "finalized" | "disbursed" | "rescinded" | null;
  funding_stage: FundingStage | null;
  title: string | null;
  summary: string | null;
  source_url: string | null;
  canonical_url: string | null;
  source_domain: string | null;
  evidence_quote: string | null;
  parties: PartyDraft[];
};

export type SiteDraft = {
  company_id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
};

export type QueuePayload =
  /** Article states a different milestone date than the sheet: keep the sheet value as an unsourced
   *  legacy statement and add the article's statement as its own sourced announcement. */
  | { kind: "restated_date"; announcement_id: string; set: Diff; create: AnnouncementDraft }
  /** Imported row's type doesn't match what its article announces. */
  | { kind: "relabel"; announcement_id: string; set: Diff; parties: PartyDraft[] }
  /** Article doesn't support the imported fact: detach the URL, keep the fact. */
  | { kind: "unsupported_source"; announcement_id: string; set: Diff }
  /** Field corrections on a matched announcement (dates, amount, award status, missing parties). */
  | { kind: "announcement_update"; announcement_id: string; set: Diff; parties: PartyDraft[] }
  | { kind: "new_announcement"; create: AnnouncementDraft }
  | { kind: "add_source"; announcement_id: string; source: { source_url: string; canonical_url: string; source_domain: string | null; evidence_quote: string | null } }
  | { kind: "site_update"; site_id: string; set: Diff }
  | { kind: "possible_new_site"; site: SiteDraft; announcements: AnnouncementDraft[] };

export type QueueKind = QueuePayload["kind"];

export const KIND_LABELS: Record<QueueKind, string> = {
  restated_date: "Restated milestone date",
  relabel: "Relabel imported announcement",
  unsupported_source: "Source doesn't support fact",
  announcement_update: "Correct announcement",
  new_announcement: "New announcement",
  add_source: "Add corroborating source",
  site_update: "Update site facts",
  possible_new_site: "Possible new site",
};

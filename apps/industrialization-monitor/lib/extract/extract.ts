// Claude extraction of announcements from an article. Shared by the corpus eval and (later) the
// weekly scrub, so the eval measures exactly what production will run.
//
// Mirrors the database schema (after the 2026-10-11 review) plus schema_gaps, which keeps
// surfacing facts the model doesn't fit.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL ?? "claude-opus-5-5";
export const EXTRACTION_EFFORT = (process.env.EXTRACTION_EFFORT ?? "medium") as "low" | "medium" | "high";

const AnnouncementType = z.enum([
  "site_announced", "construction_start", "production_start", "production_at_rate",
  "status_change", "delay", "cancellation", "bankruptcy",
  "funding_round", "grant", "loan", "tax_credit", "incentive", "customer_award", "partnership", "acquisition",
  "other",
]);

const Party = z.object({
  name: z.string().describe("Organization name as written, e.g. 'U.S. Department of Energy'"),
  role: z.enum(["lead_investor", "investor", "grantor", "lender", "customer", "partner", "acquirer", "other"]).describe("Advisors/bankers are not parties"),
  org_type: z.enum([
    "federal_agency", "state_agency", "local_gov", "vc", "corporate", "bank", "utility",
    "nonprofit", "university", "other",
  ]),
  parent_org: z.string().nullable().describe("Parent organization if the party is a sub-office, e.g. DOE for 'Loan Programs Office'"),
  program: z.string().nullable().describe("Named program, e.g. '48C', 'DAC Hubs', 'Loan Programs Office'"),
  amount_usd: z.number().nullable().describe("This party's own disclosed share in USD, else null"),
});

const Site = z.object({
  name: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  county: z.string().nullable().describe("County / parish / regional municipality when stated"),
  state: z.string().nullable().describe("Two-letter US state, Canadian province or Mexican state code"),
  country: z.string().nullable(),
});

const Announcement = z.object({
  company_name: z.string(),
  type: AnnouncementType,
  announced_on: z.string().nullable().describe("YYYY-MM-DD the information was published"),
  site: Site.nullable().describe("The physical site this is about; null for company-level news like a raise"),
  milestone_date: z.string().nullable().describe(
    "Only for construction_start / production_start / production_at_rate: YYYY-MM-DD, converted to one calendar day per the date rules",
  ),
  milestone_status: z.enum(["planned", "actual"]).nullable(),
  amount_usd: z.number().nullable().describe("Total amount in USD for money/deal announcements"),
  funding_stage: z.enum([
    "pre_seed", "seed", "series_a", "series_b", "series_c", "series_d", "series_e_plus",
    "growth", "bridge", "strategic", "venture_debt", "debt", "ipo", "spac", "undisclosed",
  ]).nullable().describe("Only for funding_round: the round's stage"),
  award_status: z.enum(["selected", "finalized", "disbursed", "rescinded"]).nullable().describe(
    "For grant / loan / tax_credit / incentive: selected (e.g. 'selected for award negotiation', conditional commitment), finalized (agreement signed/closed), disbursed, rescinded",
  ),
  parties: z.array(Party),
  site_facts: z.object({
    cost_mm: z.number().nullable().describe("Site investment in USD millions"),
    sqft: z.number().nullable(),
    full_time_jobs: z.number().nullable(),
    construction_jobs: z.number().nullable(),
    capacity_value: z.number().nullable(),
    capacity_unit: z.string().nullable().describe("e.g. 'GWh/yr', 'tons/yr', 'MW', 'units/yr'"),
  }).nullable().describe("Initial-phase figures only"),
  evidence_quote: z.string().describe("Short verbatim quote from the article supporting this announcement"),
  confidence: z.enum(["high", "medium", "low"]),
});

export const ExtractionResult = z.object({
  is_relevant: z.boolean().describe("False if the article is not about a startup's US factory, pilot site, or its funding/deals"),
  announcements: z.array(Announcement),
  schema_gaps: z.array(z.string()).describe(
    "Facts in the article that matter for tracking this company/site but don't fit the fields above (e.g. phased milestones, multi-site deals, amount ranges, conditional awards). One short sentence each.",
  ),
});
export type ExtractionResult = z.infer<typeof ExtractionResult>;

const SYSTEM = `You extract structured facts for the NextGen Industry Group Startup Industrialization Monitor, which tracks startup factory and pilot sites in the United States, Canada and Mexico: where they are, their milestones (announced, construction start, production start, production at rate), status changes, and the money behind them (raises, grants, loans, tax credits, incentives, customer awards).

Rules:
- Record one announcement per distinct event. One article often carries several: e.g. a funding round plus a site selection plus a planned production start plus a state grant are four announcements. Two events of the same type (a federal grant and a state grant) are two announcements.
- Planned vs actual: "will begin production in 2027" is planned; "began production" / "opened" is actual. A planned date stated in an announcement is its own construction_start / production_start announcement with milestone_status "planned".
- announced_on is the article's publication date (or the stated date of the news).
- Milestone dates are always one calendar day:
  - an exact date stays as-is;
  - "end of", "by", "late", "before" a period -> the last day of that period ("end of 2025" -> 2025-12-31, "by Q3 2026" -> 2026-09-30, "late 2024" -> 2024-12-31);
  - "mid-" a period -> its midpoint ("mid-2026" -> 2026-07-01, "mid-Q2 2026" -> 2026-05-15);
  - "early", a bare year, quarter or month -> the first day ("early 2026" or "2026" -> 2026-01-01, "Q1 2027" -> 2027-01-01, "March 2026" -> 2026-03-01);
  - "first half"/H1 -> Jan 1, "second half"/H2 -> Jul 1; spring -> Apr 1, summer -> Jul 1, fall -> Oct 1, winter -> Jan 1.
- Phased figures: when jobs, investment, square footage or capacity are given for several phases ("200 jobs initially, 1,000 at full build-out"), record only the initial phase.
- Money: amount_usd is a single number in USD (not millions); for "up to $X" use X; for a range use the upper figure. Convert CAD/MXN at the rate stated in the article, otherwise leave amount_usd null and note it in schema_gaps. List each named funder/customer/partner in parties with its role; never list advisors, bankers or law firms.
- Funding rounds get a funding_stage: "Series B" or a "Series B extension" -> series_b; Series E or later -> series_e_plus; an unnamed round from a strategic/corporate investor -> strategic; a round with no stage given -> undisclosed. Leave it null for every other type.
- Incentives: only record a state/local incentive or abatement when the article states an amount; otherwise skip it entirely.
- Grants, loans and tax credits get an award_status ("selected for award negotiation" and conditional commitments are "selected").
- Only state facts the article supports. If something important doesn't fit the schema, describe it in schema_gaps instead of forcing it into a field.`;

export type ExtractInput = {
  url: string;
  title: string | null;
  text: string;
  publishedOn?: string | null;
  companyHint?: string | null;
};

export async function extractAnnouncements(client: Anthropic, input: ExtractInput) {
  const userText = [
    `URL: ${input.url}`,
    input.title ? `Title: ${input.title}` : null,
    input.publishedOn ? `Published: ${input.publishedOn}` : null,
    input.companyHint ? `Company of interest: ${input.companyHint}` : null,
    "",
    "<article>",
    input.text,
    "</article>",
  ].filter((l) => l !== null).join("\n");

  const response = await client.beta.messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: EXTRACTION_EFFORT, format: betaZodOutputFormat(ExtractionResult) },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userText }],
  });

  if (response.stop_reason === "refusal") {
    return { result: null, error: `refusal: ${response.stop_details?.category ?? "unknown"}`, usage: response.usage, model: response.model };
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    return { result: null, error: `no parsed output (stop_reason ${response.stop_reason})`, usage: response.usage, model: response.model };
  }
  return { result: response.parsed_output, error: null, usage: response.usage, model: response.model };
}

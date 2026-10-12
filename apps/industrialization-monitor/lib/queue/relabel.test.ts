import { describe, expect, it } from "vitest";
import type { ExtractionResult } from "@/lib/extract/extract";
import { type DbAnnouncement, type DbSite, buildProposals } from "./relabel";

type X = ExtractionResult["announcements"][number];
const URL_A = "https://example.com/a";
const site: DbSite = {
  id: "s1", legacy_uid: 7, city: "Exeter", county: null, state: "NH", country: "United States",
  cost_mm: null, sqft: 52000, full_time_jobs: null, construction_jobs: null, capacity_value: null, capacity_unit: null,
};
const ann = (o: Partial<DbAnnouncement>): DbAnnouncement => ({
  id: "a1", site_id: "s1", type: "site_announced", origin: "import", announced_on: "2024-01-10", milestone_date: null,
  milestone_status: null, amount_usd: null, award_status: null, funding_stage: null, canonical_url: URL_A, extra_urls: [], party_count: 0, site_legacy_uid: 7, ...o,
});
const x = (o: Partial<X>): X => ({
  company_name: "Phoenix Tailings", type: "site_announced", announced_on: "2024-01-10", site: null, milestone_date: null,
  milestone_status: null, amount_usd: null, award_status: null, funding_stage: null, parties: [], site_facts: null, evidence_quote: "quote", confidence: "high", ...o,
});
const run = (announcements: DbAnnouncement[], extracted: X[]) =>
  buildProposals({
    article: { url: URL_A, canonical_url: URL_A, source_domain: "example.com" },
    extraction: { is_relevant: true, announcements: extracted, schema_gaps: [] },
    companyName: "Phoenix Tailings", companyId: "c1", sites: [site], announcements, expectedSiteUid: 7,
    lastUpdatedByUid: new Map([[7, "2026-04-19"]]),
  });

describe("buildProposals", () => {
  it("keeps a restated sheet date as legacy and adds the article's own statement", () => {
    const [p] = run(
      [ann({ id: "m1", type: "production_start", milestone_status: "planned", milestone_date: "2025-03-01" })],
      [x({ type: "production_start", milestone_status: "planned", milestone_date: "2024-01-01" })],
    );
    expect(p.kind).toBe("restated_date");
    if (p.payload.kind !== "restated_date") throw new Error();
    expect(p.payload.set.announced_on.new).toBe("2026-04-19");
    expect(p.payload.set.source_url.new).toBeNull();
    expect(p.payload.create).toMatchObject({ milestone_date: "2024-01-01", site_id: "s1", canonical_url: URL_A });
  });

  it("relabels an imported site announcement whose article is a funding round", () => {
    const ps = run([ann({})], [x({ type: "funding_round", amount_usd: 33_000_000, parties: [
      { name: "BMW i Ventures", role: "investor", org_type: "corporate", parent_org: null, program: null, amount_usd: null },
    ] })]);
    expect(ps.map((p) => p.kind)).toEqual(["relabel"]);
    if (ps[0].payload.kind !== "relabel") throw new Error();
    expect(ps[0].payload.set.type).toEqual({ old: "site_announced", new: "funding_round" });
    expect(ps[0].payload.parties).toHaveLength(1);
  });

  it("treats the same event from another URL as a corroborating source, and fills site gaps", () => {
    const ps = run(
      [ann({ id: "other", canonical_url: "https://other.com/x" })],
      [x({ site: { name: null, address: null, city: "Exeter", county: "Rockingham", state: "NH", country: "United States" },
           site_facts: { cost_mm: 13, sqft: 52000, full_time_jobs: 30, construction_jobs: null, capacity_value: 200, capacity_unit: "tons/yr" } })],
    );
    expect(ps.map((p) => p.kind).sort()).toEqual(["add_source", "site_update"]);
    const upd = ps.find((p) => p.kind === "site_update")!;
    if (upd.payload.kind !== "site_update") throw new Error();
    expect(Object.keys(upd.payload.set).sort()).toEqual(["capacity_unit", "capacity_value", "cost_mm", "county", "full_time_jobs"]);
  });

  it("skips undated milestones and other companies' news", () => {
    expect(run([], [x({ type: "construction_start", milestone_status: "actual", milestone_date: null }), x({ company_name: "Someone Else", type: "funding_round" })])).toEqual([]);
  });
});

describe("actual milestones", () => {
  it("treats an actual date within a month as the same event", () => {
    const ps = run(
      [ann({ id: "p1", type: "production_start", milestone_status: "actual", milestone_date: "2026-06-10", canonical_url: "https://other.com/y" })],
      [x({ type: "production_start", milestone_status: "actual", milestone_date: "2026-06-01" })],
    );
    expect(ps.map((p) => p.kind)).toEqual(["add_source"]);
  });
});

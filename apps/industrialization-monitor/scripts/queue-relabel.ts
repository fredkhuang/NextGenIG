// Queues review proposals that reconcile imported legacy data with what its source articles say.
//
//   pnpm queue:relabel "<legacy .xlsx>" [--dry-run]
//
// Uses cached extractions only (run `pnpm eval:extract` first; it fills the cache). Replaces any
// still-pending proposals from a previous run of this script. Writes reports/queue-relabel.md.

import "@/lib/env";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { normalizeName, sameCompany } from "@/lib/dedupe";
import { readCached } from "@/lib/extract/cache";
import { fingerprint } from "@/lib/queue/fingerprint";
import { transformRow } from "@/lib/import/transform";
import { readLegacyWorkbook } from "@/lib/import/xlsx";
import { type DbAnnouncement, type DbSite, type Proposal, buildProposals } from "@/lib/queue/relabel";
import { KIND_LABELS } from "@/lib/queue/types";
import type { Fixture } from "./build-corpus";

const SOURCE = "legacy-relabel";
const args = process.argv.slice(2);
const xlsx = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
if (!xlsx) {
  console.error('Usage: pnpm queue:relabel "<legacy .xlsx>" [--dry-run]');
  process.exit(1);
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const must = <T>(r: { data: T; error: unknown }, what: string) => {
    if (r.error) throw new Error(`${what}: ${JSON.stringify(r.error)}`);
    return r.data;
  };

  // Sheet "Last Updated" per legacy UID: the best available date for restated (unsourced) values.
  const { rows } = await readLegacyWorkbook(xlsx!);
  const lastUpdatedByUid = new Map<number, string | null>();
  for (const r of rows) {
    const t = transformRow(r.cells, r.comments);
    if (t) lastUpdatedByUid.set(t.site.legacy_uid, t.last_updated);
  }

  const companies = must(await db.from("companies").select("id, name, normalized_name"), "companies") as { id: string; name: string; normalized_name: string }[];
  const sites = must(await db.from("sites").select("id, company_id, legacy_uid, city, county, state, country, cost_mm, sqft, full_time_jobs, construction_jobs, capacity_value, capacity_unit").limit(10000), "sites") as (DbSite & { company_id: string })[];
  const anns = must(await db.from("announcements").select("id, company_id, site_id, type, origin, announced_on, milestone_date, milestone_status, amount_usd, award_status, funding_stage, canonical_url, announcement_sources(canonical_url), announcement_parties(id), sites(legacy_uid)").limit(10000), "announcements") as unknown as {
    id: string; company_id: string; site_id: string | null; type: string; origin: string; announced_on: string | null;
    milestone_date: string | null; milestone_status: string | null; amount_usd: number | null; award_status: string | null; funding_stage: string | null;
    canonical_url: string | null; announcement_sources: { canonical_url: string }[]; announcement_parties: { id: string }[];
    sites: { legacy_uid: number | null } | null;
  }[];
  const dbAnns = anns.map((a) => ({
    ...a, extra_urls: a.announcement_sources.map((s) => s.canonical_url), party_count: a.announcement_parties.length,
    site_legacy_uid: a.sites?.legacy_uid ?? null,
  })) as (DbAnnouncement & { company_id: string })[];

  const dir = "fixtures/announcements";
  const fixtures = (await Promise.all((await readdir(dir)).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map(async (f) => JSON.parse(await readFile(`${dir}/${f}`, "utf8")) as Fixture))).filter((f) => f.fetch.ok && f.text);

  const proposals: (Proposal & { company_id: string; company: string; url: string })[] = [];
  const skipped: string[] = [];
  for (const f of fixtures) {
    const cached = await readCached(f.slug, f.text!);
    if (!cached?.result) {
      skipped.push(`${f.expected.company}: ${cached ? cached.error : "no cached extraction for the current prompt (run pnpm eval:extract)"}`);
      continue;
    }
    const norm = normalizeName(f.expected.company);
    const company = companies.find((c) => c.normalized_name === norm) ?? companies.find((c) => sameCompany(c.name, f.expected.company));
    if (!company) {
      skipped.push(`${f.expected.company}: company not found in database`);
      continue;
    }
    const ps = buildProposals({
      article: { url: f.url, canonical_url: f.canonical_url, source_domain: new URL(f.canonical_url).hostname },
      extraction: cached.result,
      companyName: company.name,
      companyId: company.id,
      sites: sites.filter((s) => s.company_id === company.id),
      announcements: dbAnns.filter((a) => a.company_id === company.id),
      expectedSiteUid: f.expected.site?.legacy_uid ?? null,
      lastUpdatedByUid,
    });
    proposals.push(...ps.map((p) => ({ ...p, company_id: company.id, company: company.name, url: f.url })));
  }

  // Several articles can propose the same site fact or the same new event; keep the first.
  const seen = new Set<string>();
  const unique = proposals.filter((p) => {
    const key = p.kind === "site_update"
      ? `site|${p.target_id}|${Object.keys((p.payload as { set: object }).set).sort().join(",")}`
      : p.kind === "new_announcement"
        ? `new|${JSON.stringify([(p.payload as { create: { site_id: string | null; type: string; milestone_date: string | null; amount_usd: number | null } }).create].map((c) => [p.company_id, c.site_id, c.type, c.milestone_date, c.amount_usd]))}`
        : `${p.kind}|${p.target_id}|${p.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Never re-propose something a reviewer already approved or rejected.
  // Older reviewed rows have no stored fingerprint, so derive it from their payload.
  const reviewedRows = must(
    await db.from("proposed_changes").select("fingerprint, kind, target_id, evidence_url, changes").neq("status", "pending"),
    "reviewed",
  ) as { fingerprint: string | null; kind: Proposal["kind"]; target_id: string | null; evidence_url: string; changes: Proposal["payload"] }[];
  const reviewed = new Set(reviewedRows.map((r) =>
    r.fingerprint ?? fingerprint({ kind: r.kind, target_id: r.target_id, url: r.evidence_url, payload: r.changes } as Proposal & { url: string })));
  const fresh = unique.filter((p) => !reviewed.has(fingerprint(p)));
  const alreadyReviewed = unique.length - fresh.length;

  if (!dryRun) {
    must(await db.from("proposed_changes").delete().eq("source", SOURCE).eq("status", "pending"), "clear pending");
    const run = must(await db.from("scrub_runs").insert({ articles_fetched: fixtures.length, articles_matched: fixtures.length - skipped.length, proposals_created: fresh.length }).select("id").single(), "scrub run") as { id: string };
    const rowsOut = fresh.map((p) => ({
      scrub_run_id: run.id, source: SOURCE, kind: p.kind, entity_type: p.entity_type, op: p.op, target_id: p.target_id,
      matched_company_id: p.company_id, match_score: 1, changes: p.payload, evidence_url: p.url, evidence_quote: p.evidence_quote,
      confidence: p.confidence, rationale: p.rationale, status: "pending", fingerprint: fingerprint(p),
    }));
    for (let i = 0; i < rowsOut.length; i += 200) must(await db.from("proposed_changes").insert(rowsOut.slice(i, i + 200)), "insert proposals");
    must(await db.from("scrub_runs").update({ finished_at: new Date().toISOString() }).eq("id", run.id), "finish run");
  }

  const byKind = Map.groupBy(fresh, (p) => p.kind);
  const report = `# Legacy relabel queue${dryRun ? " (dry run)" : ""}

${fresh.length} proposals from ${fixtures.length - skipped.length} articles (${proposals.length - unique.length} duplicates dropped, ${alreadyReviewed} already reviewed).

| Kind | Count |
|---|---|
${[...byKind].map(([k, v]) => `| ${KIND_LABELS[k]} | ${v.length} |`).join("\n")}

${[...byKind].map(([k, v]) => `## ${KIND_LABELS[k]}\n${v.slice(0, 25).map((p) => `- **${p.company}**: ${p.rationale}`).join("\n")}${v.length > 25 ? `\n- … ${v.length - 25} more` : ""}`).join("\n\n")}

## Skipped
${skipped.map((s) => `- ${s}`).join("\n") || "_None._"}
`;
  await mkdir("reports", { recursive: true });
  await writeFile("reports/queue-relabel.md", report);
  console.log([...byKind].map(([k, v]) => `${KIND_LABELS[k]}: ${v.length}`).join("\n"));
  console.log(`${fresh.length} proposals (${alreadyReviewed} already reviewed)${dryRun ? " (dry run, nothing written)" : " queued"} · ${skipped.length} articles skipped · wrote reports/queue-relabel.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

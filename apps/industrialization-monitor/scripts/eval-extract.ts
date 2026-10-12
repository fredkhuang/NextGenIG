// Scores Claude extraction against the corpus built by build-corpus.ts.
//
//   pnpm eval:extract [--limit N] [--no-cache]
//   EXTRACTION_MODEL=claude-sonnet-5-5 EXTRACTION_EFFORT=low pnpm eval:extract
//
// Extractions are cached per (model, effort, prompt, article) in reports/extract-cache/, so re-runs
// only pay for what changed. Writes reports/extract-eval.md and reports/extract-eval.json.

import "@/lib/env";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { sameCompany } from "@/lib/dedupe";
import { CACHE_DIR, type CacheEntry, getPromptVersion, readCached, sha, writeCached } from "@/lib/extract/cache";
import {
  EXTRACTION_EFFORT, EXTRACTION_MODEL, type ExtractionResult, extractAnnouncements,
} from "@/lib/extract/extract";
import type { ExpectedAnnouncement, Fixture } from "./build-corpus";

const FIXTURES = "fixtures/announcements";
const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;
const useCache = !args.includes("--no-cache");

// $ per million tokens (input, output) — from the Claude API model table, 2026-10.
const PRICING: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

type Extracted = ExtractionResult["announcements"][number];

const MILESTONES = new Set(["construction_start", "production_start", "production_at_rate"]);
const daysApart = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
const near = (a: number, b: number, tol = 0.1) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1);

class Tally {
  counts = new Map<string, { hit: number; total: number }>();
  add(field: string, hit: boolean) {
    const c = this.counts.get(field) ?? { hit: 0, total: 0 };
    c.total++;
    if (hit) c.hit++;
    this.counts.set(field, c);
  }
  rows() {
    return [...this.counts].map(([field, { hit, total }]) => ({ field, hit, total, pct: total ? Math.round((100 * hit) / total) : 0 }));
  }
}

async function main() {
  const promptVersion = await getPromptVersion();
  const files = (await readdir(FIXTURES)).filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();
  const fixtures = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(`${FIXTURES}/${f}`, "utf8")) as Fixture)))
    .filter((f) => f.fetch.ok && f.text)
    .sort((a, b) => sha(a.slug).localeCompare(sha(b.slug))) // stable pseudo-random order so --limit is a fair sample
    .slice(0, limit);
  console.log(`Evaluating ${fixtures.length} articles with ${EXTRACTION_MODEL} (effort ${EXTRACTION_EFFORT})`);

  const client = new Anthropic();
  await mkdir(CACHE_DIR, { recursive: true });
  const results = new Map<string, CacheEntry>();
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < fixtures.length) {
      const f = fixtures[next++];
      const cached = useCache ? await readCached(f.slug, f.text!) : null;
      if (cached) {
        results.set(f.slug, cached);
        process.stdout.write("c");
        continue;
      }
      try {
        const r = await extractAnnouncements(client, {
          url: f.url, title: f.title, text: f.text!, publishedOn: f.published_on, companyHint: f.expected.company,
        });
        const entry = { model: r.model, result: r.result, error: r.error, usage: r.usage };
        await writeCached(f.slug, f.text!, entry);
        results.set(f.slug, { key: "", ...entry });
        process.stdout.write(r.error ? "!" : ".");
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) {
          console.error(`\n${f.slug}: ${e.message} (not cached; re-run to retry)`);
        } else if (e instanceof Anthropic.APIError) {
          console.error(`\n${f.slug}: API error ${e.status}: ${e.message}`);
        } else {
          throw e;
        }
      }
    }
  }));
  console.log();

  // --- scoring ---------------------------------------------------------------------------------
  const tally = new Tally();
  const byType = new Tally();
  const misses: string[] = [];
  const mismatches: string[] = [];
  const extras = new Map<string, string[]>();
  const gaps: string[] = [];
  const parties: { name: string; role: string; org_type: string; parent_org: string | null; program: string | null }[] = [];
  const amountTexts: string[] = [];
  const capacities: string[] = [];
  const errors: string[] = [];
  let inTok = 0, outTok = 0, cost = 0;

  for (const f of fixtures) {
    const entry = results.get(f.slug);
    if (!entry) continue;
    const [pin, pout] = PRICING[entry.model] ?? PRICING[EXTRACTION_MODEL] ?? [0, 0];
    const u = entry.usage;
    const input = u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    inTok += input;
    outTok += u.output_tokens;
    cost += (u.input_tokens * pin + (u.cache_read_input_tokens ?? 0) * pin * 0.1 + (u.cache_creation_input_tokens ?? 0) * pin * 1.25 + u.output_tokens * pout) / 1e6;
    if (!entry.result) {
      errors.push(`${f.slug}: ${entry.error}`);
      continue;
    }
    const res = entry.result;
    const label = `[${f.expected.company}](${f.url})`;
    tally.add("article marked relevant", res.is_relevant);
    gaps.push(...res.schema_gaps.map((g) => `${f.expected.company}: ${g}`));
    for (const a of res.announcements) {
      parties.push(...a.parties);
      if (a.amount_usd != null) amountTexts.push(`${a.company_name} (${a.type}${a.award_status ? `, ${a.award_status}` : ""}): ${a.amount_usd.toLocaleString()} — "${a.evidence_quote.slice(0, 100)}"`);
      if (a.site_facts?.capacity_value != null) capacities.push(`${a.company_name}: ${a.site_facts.capacity_value} ${a.site_facts.capacity_unit ?? ""}`);
    }

    const ours = res.announcements.filter((a) => sameCompany(a.company_name, f.expected.company));
    tally.add("company identified", ours.length > 0);
    const used = new Set<Extracted>();

    for (const exp of f.expected.announcements as ExpectedAnnouncement[]) {
      const isMilestone = MILESTONES.has(exp.type);
      const candidates = ours.filter((a) => a.type === exp.type && (!isMilestone || a.milestone_status === exp.milestone_status));
      const typeKey = isMilestone ? `${exp.type}:${exp.milestone_status}` : exp.type;
      byType.add(typeKey, candidates.length > 0);
      if (!candidates.length) {
        misses.push(`${label}: expected **${typeKey}**${exp.milestone_date ? ` ${exp.milestone_date}` : ""}; extracted [${ours.map((a) => `${a.type}${a.milestone_status ? `:${a.milestone_status}` : ""}`).join(", ") || "nothing for this company"}]`);
        continue;
      }
      // Best candidate: closest milestone date, else first unused.
      const best = isMilestone && exp.milestone_date
        ? [...candidates].sort((x, y) => daysApart(x.milestone_date ?? "1900-01-01", exp.milestone_date!) - daysApart(y.milestone_date ?? "1900-01-01", exp.milestone_date!))[0]
        : candidates.find((c) => !used.has(c)) ?? candidates[0];
      used.add(best);

      if (isMilestone && exp.milestone_date) {
        const got = best.milestone_date;
        tally.add("milestone date: exact", got === exp.milestone_date);
        const close = !!got && daysApart(got, exp.milestone_date) <= 31;
        tally.add("milestone date: within 31 days", close);
        if (!close) mismatches.push(`${label} ${typeKey}: expected ${exp.milestone_date}, got ${got ?? "null"} — "${best.evidence_quote.slice(0, 140)}"`);
      }
      if (exp.announced_on) {
        const ok = !!best.announced_on && daysApart(best.announced_on, exp.announced_on) <= 7;
        tally.add("announced_on within 7 days", ok);
        if (!ok && exp.type === "site_announced") mismatches.push(`${label} announced_on: expected ${exp.announced_on}, got ${best.announced_on ?? "null"}`);
      }
    }

    // Site facts: compare against the extracted site / site_facts for this company.
    const site = f.expected.site;
    if (site) {
      const withSite = ours.find((a) => a.site?.city) ?? ours.find((a) => a.site);
      const facts = ours.map((a) => a.site_facts).filter(Boolean);
      const fact = <K extends "cost_mm" | "sqft" | "full_time_jobs" | "construction_jobs">(k: K) => facts.find((x) => x![k] != null)?.[k] ?? null;
      if (site.city) tally.add("site city", withSite?.site?.city?.toLowerCase() === site.city.toLowerCase());
      if (site.state) tally.add("site state", withSite?.site?.state?.toUpperCase() === site.state.toUpperCase());
      for (const k of ["cost_mm", "sqft", "full_time_jobs", "construction_jobs"] as const) {
        if (site[k] == null) continue;
        const got = fact(k);
        // The sheet often holds values from other sources than this URL, so "not extracted" is
        // tracked as coverage; only two different values count against accuracy.
        tally.add(`site ${k}: extracted at all`, got != null);
        if (got == null) continue;
        const ok = near(got, site[k]!);
        tally.add(`site ${k}: agrees with sheet (±10%)`, ok);
        if (!ok) mismatches.push(`${label} ${k}: sheet ${site[k]}, extracted ${got}`);
      }
    }

    for (const a of ours.filter((x) => !used.has(x))) {
      const k = `${a.type}${a.milestone_status ? `:${a.milestone_status}` : ""}`;
      extras.set(k, [...(extras.get(k) ?? []), `${label}: ${a.amount_usd != null ? `${a.amount_usd.toLocaleString()}` : a.milestone_date ?? ""} — "${a.evidence_quote.slice(0, 120)}"`]);
    }
  }

  // --- report ----------------------------------------------------------------------------------
  const table = (rows: ReturnType<Tally["rows"]>) =>
    `| Field | Correct | Total | % |\n|---|---|---|---|\n${rows.map((r) => `| ${r.field} | ${r.hit} | ${r.total} | ${r.pct}% |`).join("\n")}`;
  const list = (xs: string[], max = 60) =>
    xs.length ? xs.slice(0, max).map((x) => `- ${x}`).join("\n") + (xs.length > max ? `\n- … ${xs.length - max} more` : "") : "_None._";
  const countBy = <T>(xs: T[], k: (x: T) => string) =>
    [...Map.groupBy(xs, k)].map(([key, v]) => `${key} (${v.length})`).sort().join(", ") || "_none_";

  const scored = fixtures.filter((f) => results.get(f.slug)?.result).length;
  const report = `# Extraction eval

Model **${EXTRACTION_MODEL}**, effort **${EXTRACTION_EFFORT}**, prompt version \`${promptVersion}\`
Articles: ${scored} scored / ${fixtures.length} attempted. Tokens: ${inTok.toLocaleString()} in, ${outTok.toLocaleString()} out. Est. cost: **$${cost.toFixed(2)}** ($${(cost / Math.max(scored, 1)).toFixed(3)}/article).

Expected values come from the legacy sheet, which has its own errors. A "miss" can be a sheet error, so check the quote before blaming the extractor.

## Field accuracy
${table(tally.rows())}

## Recall by announcement type (expected → found)
${table(byType.rows())}

## Extra announcements (found in articles, not in the sheet)
${[...extras].map(([k, v]) => `### ${k} (${v.length})\n${list(v, 15)}`).join("\n\n") || "_None._"}

## Money & parties (not scored; the sheet has no linked funding facts)
- Party roles: ${countBy(parties, (p) => p.role)}
- Org types: ${countBy(parties, (p) => p.org_type)}
- Parties with a parent org: ${parties.filter((p) => p.parent_org).length}; with a program: ${parties.filter((p) => p.program).length}

### Amounts
${list(amountTexts, 40)}

### Capacities (initial phase)
${list(capacities, 40)}

### Parties with programs / parent orgs
${list(parties.filter((p) => p.program || p.parent_org).map((p) => `${p.name} — ${p.role}, ${p.org_type}${p.parent_org ? `, parent: ${p.parent_org}` : ""}${p.program ? `, program: ${p.program}` : ""}`), 40)}

## Schema gaps reported by the extractor
${list(gaps, 80)}

## Misses
${list(misses, 80)}

## Value mismatches
${list(mismatches, 80)}

## Errors
${list(errors)}
`;
  await writeFile("reports/extract-eval.md", report);
  await writeFile("reports/extract-eval.json", JSON.stringify({
    model: EXTRACTION_MODEL, effort: EXTRACTION_EFFORT, promptVersion, scored, cost,
    fields: tally.rows(), byType: byType.rows(),
  }, null, 2));
  console.log(table(tally.rows()));
  console.log(`\nEst. cost $${cost.toFixed(2)} · wrote reports/extract-eval.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

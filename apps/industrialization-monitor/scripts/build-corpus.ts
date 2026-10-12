// Builds the extraction test corpus from source links already in the database.
//
//   pnpm corpus:build [--refetch] [--limit N]
//
// For every distinct canonical source URL: fetch the article, extract readable text, and save it to
// fixtures/announcements/<slug>.json together with the facts the database holds for that URL
// (the expected values the extraction eval scores against).

import "@/lib/env";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { fetchArticle } from "@/lib/scrub/fetch-article";

const OUT = "fixtures/announcements";
const args = process.argv.slice(2);
const refetch = args.includes("--refetch");
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

export type ExpectedAnnouncement = {
  type: string;
  announced_on: string | null;
  milestone_date: string | null;
  milestone_status: string | null;
  amount_usd: number | null;
};

export type Fixture = {
  url: string;
  canonical_url: string;
  slug: string;
  fetch: { ok: boolean; status: number | null; error: string | null; fetched_at: string; content_type: string | null };
  title: string | null;
  published_on: string | null;
  text: string | null;
  expected: {
    company: string;
    site: {
      legacy_uid: number | null; city: string | null; state: string | null;
      cost_mm: number | null; sqft: number | null; full_time_jobs: number | null; construction_jobs: number | null;
    } | null;
    announcements: ExpectedAnnouncement[];
  };
};

const slugFor = (canonical: string) => {
  const u = new URL(canonical);
  const tail = (u.hostname + u.pathname).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${tail}-${createHash("sha1").update(canonical).digest("hex").slice(0, 8)}`;
};

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("announcements")
    .select(`type, announced_on, milestone_date, milestone_status, amount_usd, source_url, canonical_url,
             companies(name), sites(legacy_uid, city, state, cost_mm, sqft, full_time_jobs, construction_jobs),
             announcement_sources(source_url, canonical_url)`)
    .limit(10000);
  if (error) throw error;

  // Group expected facts by every URL that supports them (primary source + extra sources).
  type Row = NonNullable<typeof data>[number];
  const byUrl = new Map<string, { url: string; rows: Row[] }>();
  for (const row of data) {
    const urls = [
      { url: row.source_url, canonical: row.canonical_url },
      ...(row.announcement_sources ?? []).map((s) => ({ url: s.source_url, canonical: s.canonical_url })),
    ];
    for (const { url, canonical } of urls) {
      if (!url || !canonical) continue;
      const entry = byUrl.get(canonical) ?? { url, rows: [] as Row[] };
      entry.rows.push(row);
      byUrl.set(canonical, entry);
    }
  }
  console.log(`${byUrl.size} distinct source URLs`);

  await mkdir(OUT, { recursive: true });
  const entries = [...byUrl.entries()].slice(0, limit);
  const byDomain = Map.groupBy(entries, ([canonical]) => new URL(canonical).hostname);
  const summary: { slug: string; url: string; ok: boolean; error: string | null }[] = [];

  // One worker per domain (polite), at most 6 domains at a time.
  const domains = [...byDomain.values()];
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < domains.length) {
      for (const [canonical, { url, rows }] of domains[next++]) {
        const slug = slugFor(canonical);
        const path = `${OUT}/${slug}.json`;
        let prev: Fixture | null = null;
        try {
          prev = JSON.parse(await readFile(path, "utf8")) as Fixture;
        } catch { /* not fetched yet */ }
        // Already-fetched articles are reused; only the expected values are refreshed from the DB.
        const r = !refetch && prev?.fetch.ok
          ? { ok: true, status: prev.fetch.status, error: null, contentType: prev.fetch.content_type, title: prev.title, text: prev.text, published: prev.published_on }
          : await fetchArticle(url);
        const first = rows[0] as Row & { companies: { name: string } | null; sites: Fixture["expected"]["site"] };
        const fixture: Fixture = {
          url, canonical_url: canonical, slug,
          fetch: { ok: r.ok, status: r.status, error: r.error, fetched_at: prev?.fetch.ok && !refetch ? prev.fetch.fetched_at : new Date().toISOString(), content_type: r.contentType },
          title: r.title, published_on: r.published, text: r.ok ? r.text : null,
          expected: {
            company: first.companies?.name ?? "",
            site: first.sites ?? null,
            announcements: rows.map((a) => ({
              type: a.type, announced_on: a.announced_on, milestone_date: a.milestone_date,
              milestone_status: a.milestone_status, amount_usd: a.amount_usd,
            })),
          },
        };
        await writeFile(path, JSON.stringify(fixture, null, 2));
        summary.push({ slug, url, ok: r.ok, error: r.error });
        process.stdout.write(r.ok ? "." : "x");
      }
    }
  }));

  const ok = summary.filter((s) => s.ok).length;
  await writeFile(`${OUT}/_index.json`, JSON.stringify(summary.sort((a, b) => a.slug.localeCompare(b.slug)), null, 2));
  const failures = Map.groupBy(summary.filter((s) => !s.ok), (s) => s.error?.replace(/\d{3,}/, "N") ?? "unknown");
  console.log(`\n${ok}/${summary.length} fetched OK`);
  for (const [reason, xs] of failures) console.log(`  ${xs.length} × ${reason}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

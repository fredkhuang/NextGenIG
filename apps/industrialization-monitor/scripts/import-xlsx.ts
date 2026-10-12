// Imports the legacy Google Sheet export into companies / sites / announcements.
//
//   pnpm import:xlsx "<path to .xlsx>" [--dry-run] [--no-geocode] [--prune]
//
// Idempotent: companies upsert on normalized_name, sites on legacy_uid, announcements on import_key.
// Rows listed in config/site-merges.json are folded into one site. --prune deletes import-origin
// announcements the current sheet no longer produces.
// Writes reports/import-report.md listing everything that needs a human look.

import "@/lib/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  COMPANY_MATCH_THRESHOLD, SITE_DUPLICATE_KM, canonicalUrl, distanceKm, slugify, sourceDomain, trigramSimilarity,
} from "@/lib/dedupe";
import { Geocoder } from "@/lib/geocode";
import { type MergedRow, type SiteMerge, mergeRows } from "@/lib/import/merge";
import type { CompanyRecord, Issue, TransformedRow } from "@/lib/import/transform";
import { transformRow } from "@/lib/import/transform";
import { readLegacyWorkbook } from "@/lib/import/xlsx";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const geocode = !args.includes("--no-geocode");
const prune = args.includes("--prune");
if (!file) {
  console.error('Usage: pnpm import:xlsx "<file.xlsx>" [--dry-run] [--no-geocode] [--prune]');
  process.exit(1);
}

const chunk = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

async function main() {
  const { rows, taxonomy } = await readLegacyWorkbook(file!);
  const parsed = rows
    .map((r) => transformRow(r.cells, r.comments))
    .filter((r): r is TransformedRow => r !== null);
  const issues: Issue[] = parsed.flatMap((t) => t.issues);

  // Duplicate UIDs in the sheet: the later row gets a stable stand-in (100000 + uid) until the sheet is fixed.
  const duplicateUids: string[] = [];
  const firstByUid = new Map<number, TransformedRow>();
  for (const t of parsed) {
    const uid = t.site.legacy_uid;
    const first = firstByUid.get(uid);
    if (!first) {
      firstByUid.set(uid, t);
      continue;
    }
    const standIn = 100000 + uid;
    duplicateUids.push(`UID ${uid} is used by both **${first.company.name}** and **${t.company.name}**; ${t.company.name} imported as UID ${standIn}. Give it a unique UID in the sheet.`);
    t.site.legacy_uid = standIn;
    for (const a of t.announcements) a.import_key = a.import_key.replace(`uid:${uid}:`, `uid:${standIn}:`);
  }

  // Confirmed same-site rows (config/site-merges.json) fold into one site.
  const { merges } = JSON.parse(await readFile("config/site-merges.json", "utf8")) as { merges: SiteMerge[] };
  const byUid = new Map(parsed.map((t) => [t.site.legacy_uid, t]));
  const mergedAway = new Set<number>();
  const mergedRows = new Map<number, MergedRow>();
  const mergeLog: string[] = [];
  for (const m of merges) {
    const keep = byUid.get(m.keep);
    const dup = byUid.get(m.merge);
    if (!keep || !dup) {
      mergeLog.push(`⚠️ Merge ${m.merge} → ${m.keep} skipped: UID not found in sheet`);
      continue;
    }
    const merged = mergeRows(keep, dup, m.overrides);
    mergedRows.set(m.keep, merged);
    mergedAway.add(m.merge);
    const dropped = keep.announcements.length + dup.announcements.length - merged.announcements.length;
    mergeLog.push(`**${keep.company.name}**: UID ${m.merge} merged into UID ${m.keep} (${dropped} duplicate announcement(s) collapsed into extra sources)${m.note ? ` — ${m.note}` : ""}`);
  }
  const transformed: MergedRow[] = parsed
    .filter((t) => !mergedAway.has(t.site.legacy_uid))
    .map((t) => mergedRows.get(t.site.legacy_uid) ?? { ...t, announcements: t.announcements.map((a) => ({ ...a, extra_sources: [] })) });
  console.log(`Read ${rows.length} rows → ${transformed.length} sites (${mergedAway.size} merged)`);

  // --- companies: group by normalized name, report conflicting company-level fields ----------
  const companies = new Map<string, CompanyRecord & { slug: string; descriptions: Set<string> }>();
  const conflicts: string[] = [];
  const slugs = new Set<string>();
  for (const { company } of transformed) {
    const existing = companies.get(company.normalized_name);
    if (!existing) {
      let slug = slugify(company.name);
      for (let i = 2; slugs.has(slug); i++) slug = `${slugify(company.name)}-${i}`;
      slugs.add(slug);
      companies.set(company.normalized_name, {
        ...company, slug, descriptions: new Set(company.description ? [company.description] : []),
      });
      continue;
    }
    if (company.description) existing.descriptions.add(company.description);
    if (company.manufacturing_strategy === "Contract") existing.manufacturing_strategy = "Contract";
    for (const f of ["industry", "sub_industry", "hq_city", "hq_state", "hq_country"] as const) {
      if (company[f] && existing[f] && company[f] !== existing[f]) {
        conflicts.push(`**${existing.name}** \`${f}\`: kept "${existing[f]}", also saw "${company[f]}"`);
      } else if (company[f] && !existing[f]) {
        existing[f] = company[f];
      }
    }
    if (company.name !== existing.name) conflicts.push(`**${existing.name}** also spelled "${company.name}" (merged)`);
  }

  // Near-duplicate company names (different normalized names that look alike)
  const names = [...companies.values()];
  const nearDupes: string[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const s = trigramSimilarity(names[i].normalized_name, names[j].normalized_name);
      if (s >= COMPANY_MATCH_THRESHOLD) nearDupes.push(`"${names[i].name}" ↔ "${names[j].name}" (similarity ${s.toFixed(2)})`);
    }
  }

  // --- geocoding -------------------------------------------------------------------------------
  const unlocated: string[] = [];
  const geocoded: string[] = [];
  const geocoder = new Geocoder(".cache/geocode.json");
  await geocoder.load();
  for (const { site, company } of transformed) {
    if (site.lat != null && site.lng != null) continue;
    const label = `${company.name} (UID ${site.legacy_uid})`;
    if (!geocode || (!site.address && !site.city)) {
      unlocated.push(`${label}: ${[site.address, site.city, site.state].filter(Boolean).join(", ") || "no location"}`);
      continue;
    }
    const hit = await geocoder.geocode(site);
    if (hit) {
      site.lat = hit.lat;
      site.lng = hit.lng;
      geocoded.push(`${label}: ${[site.address, site.city, site.state].filter(Boolean).join(", ")} → ${hit.precision} (${hit.source})`);
    } else {
      unlocated.push(`${label}: geocoding failed for ${[site.address, site.city, site.state].filter(Boolean).join(", ")}`);
    }
  }
  await geocoder.save();

  // Possible duplicate sites within the same company
  const siteDupes: string[] = [];
  const byCompany = Map.groupBy(transformed, (t) => t.company.normalized_name);
  for (const [, group] of byCompany) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const [a, b] = [group[i].site, group[j].site];
        const near = a.lat != null && b.lat != null && distanceKm(a.lat, a.lng!, b.lat, b.lng!) <= SITE_DUPLICATE_KM;
        const sameCity = !a.address && !b.address && a.city && a.city === b.city && a.state === b.state;
        if (near || sameCity) {
          siteDupes.push(`**${group[i].company.name}**: UID ${a.legacy_uid} ↔ UID ${b.legacy_uid} (${near ? `within ${SITE_DUPLICATE_KM} km` : "same city, no address"})`);
        }
      }
    }
  }

  // --- write -----------------------------------------------------------------------------------
  const announcementCount = transformed.reduce((n, t) => n + t.announcements.length, 0);
  if (!dryRun) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
    const must = <T>(r: { data: T; error: unknown }, what: string) => {
      if (r.error) throw new Error(`${what}: ${JSON.stringify(r.error)}`);
      return r.data;
    };

    must(await db.from("taxonomy").upsert(taxonomy, { onConflict: "industry,sub_industry", ignoreDuplicates: true }), "taxonomy");

    const companyRows = [...companies.values()].map(({ descriptions, normalized_name: _n, description: _d, ...c }) => ({
      ...c, description: [...descriptions].join("; ") || null,
    }));
    const companyIds = new Map<string, string>();
    for (const batch of chunk(companyRows, 200)) {
      const data = must(
        await db.from("companies").upsert(batch, { onConflict: "normalized_name" }).select("id, normalized_name"),
        "companies",
      ) as { id: string; normalized_name: string }[];
      data.forEach((c) => companyIds.set(c.normalized_name, c.id));
    }

    const siteIds = new Map<number, string>();
    const siteRows = transformed.map((t) => ({ ...t.site, company_id: companyIds.get(t.company.normalized_name)! }));
    for (const batch of chunk(siteRows, 200)) {
      const data = must(
        await db.from("sites").upsert(batch, { onConflict: "legacy_uid" }).select("id, legacy_uid"),
        "sites",
      ) as { id: string; legacy_uid: number }[];
      data.forEach((s) => siteIds.set(s.legacy_uid, s.id));
    }

    const annRows = transformed.flatMap((t) =>
      t.announcements.map(({ extra_sources: _x, ...a }) => ({
        ...a,
        company_id: companyIds.get(t.company.normalized_name)!,
        site_id: siteIds.get(t.site.legacy_uid)!,
        origin: "import" as const,
      })),
    );

    // Prune first so stale rows can't collide with the dedupe index during the upsert.
    if (prune) {
      const current = new Set(annRows.map((a) => a.import_key));
      const existing = must(
        await db.from("announcements").select("import_key").eq("origin", "import").limit(10000),
        "list imported announcements",
      ) as { import_key: string }[];
      const stale = existing.map((a) => a.import_key).filter((k) => !current.has(k));
      for (const batch of chunk(stale, 100)) {
        must(await db.from("announcements").delete().in("import_key", batch), "prune announcements");
      }
      console.log(`Pruned ${stale.length} stale imported announcements`);
    }

    const annIds = new Map<string, string>();
    for (const batch of chunk(annRows, 200)) {
      const data = must(
        await db.from("announcements").upsert(batch, { onConflict: "import_key" }).select("id, import_key"),
        "announcements",
      ) as { id: string; import_key: string }[];
      data.forEach((a) => annIds.set(a.import_key, a.id));
    }

    // Extra sources from merged rows
    const sourceRows = transformed.flatMap((t) =>
      t.announcements.flatMap((a) =>
        a.extra_sources.map((url) => ({
          announcement_id: annIds.get(a.import_key)!,
          source_url: url,
          canonical_url: canonicalUrl(url)!,
          source_domain: sourceDomain(url),
        })),
      ),
    );
    if (sourceRows.length) {
      must(
        await db.from("announcement_sources").upsert(sourceRows, { onConflict: "announcement_id,canonical_url", ignoreDuplicates: true }),
        "announcement_sources",
      );
    }

    // Sites merged away: their announcements were re-pointed above, so the rows can go.
    if (mergedAway.size) {
      must(await db.from("sites").delete().in("legacy_uid", [...mergedAway]), "delete merged sites");
    }
    console.log(
      `Upserted ${companyIds.size} companies, ${siteIds.size} sites, ${annRows.length} announcements, ${sourceRows.length} extra sources`,
    );
  }

  // --- report ----------------------------------------------------------------------------------
  const sitesByIndustry = Object.entries(Object.groupBy(transformed, (t) => t.company.industry ?? "(none)"))
    .map(([k, v]) => [k, v!.length] as const)
    .sort((a, b) => b[1] - a[1]);
  const issuesByField = Map.groupBy(issues, (i) => i.field);
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "_None._");

  const report = `# Import report

Source: \`${file}\`${dryRun ? " (**dry run**, nothing written)" : ""}
Generated: ${new Date().toISOString()}

| | Count |
|---|---|
| Sheet rows | ${rows.length} |
| Sites (after merges) | ${transformed.length} |
| Companies (after merging same-name rows) | ${companies.size} |
| Announcements | ${announcementCount} |
| sqft = 1 placeholder treated as unknown | ${rows.filter((r) => r.cells.L === 1).length} |
| Sites with coordinates | ${transformed.filter((t) => t.site.lat != null).length} |

## Sites by industry
| Industry | Sites |
|---|---|
${sitesByIndustry.map(([k, v]) => `| ${k} | ${v} |`).join("\n")}

## Merged sites (config/site-merges.json)
${list(mergeLog)}

## Duplicate UIDs in the sheet
${list(duplicateUids)}

## Possible duplicate companies (review in /admin/duplicates)
${list(nearDupes)}

## Company field conflicts across rows
${list(conflicts)}

## Possible duplicate sites
${list(siteDupes)}

## Geocoded (verify city-level ones)
${list(geocoded)}

## No coordinates (won't appear on the map)
${list(unlocated)}

## Cell values needing review
${[...issuesByField].map(([field, xs]) => `### ${field} (${xs.length})\n${list(xs.map((i) => `${i.company} (UID ${i.uid}): "${i.value}" — ${i.note}`))}`).join("\n\n") || "_None._"}
`;
  await mkdir("reports", { recursive: true });
  await writeFile("reports/import-report.md", report);
  console.log("Wrote reports/import-report.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

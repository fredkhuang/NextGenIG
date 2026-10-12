// Weekly news scrub: discover articles, extract announcements with Claude, queue proposals for review.
//
//   pnpm scrub [--dry-run] [--company "Name"] [--no-feeds] [--no-search]
//              [--search-limit 40] [--days 8] [--max-articles 120] [--max-new-companies 15]
//
// Nothing is applied: every finding becomes a proposal in /admin/queue. Writes reports/scrub-<date>.md,
// appends it to the GitHub Actions job summary when run there, and emails it if Resend is configured.

import "@/lib/env";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { ALLOWED_DOMAINS, FEEDS, NORTH_AMERICA, SITE_KEYWORDS, STARTUP_KEYWORDS } from "@/config/sources";
import { canonicalUrl, normalizeName, sameCompany, sourceDomain } from "@/lib/dedupe";
import { readCached, sha, writeCached } from "@/lib/extract/cache";
import { EXTRACTION_MODEL, type ExtractionResult, extractAnnouncements } from "@/lib/extract/extract";
import { fingerprint } from "@/lib/queue/fingerprint";
import { buildProposals, type DbAnnouncement, type DbSite, type Proposal } from "@/lib/queue/relabel";
import { KIND_LABELS, type PartyDraft, type QueuePayload } from "@/lib/queue/types";
import { fetchArticle } from "@/lib/scrub/fetch-article";
import { readFeed } from "@/lib/scrub/feeds";
import { isRecent, searchCompanyNews } from "@/lib/scrub/search";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const onlyCompany = (() => { const i = args.indexOf("--company"); return i >= 0 ? args[i + 1] : null; })();
const dryRun = flag("dry-run");
const DAYS = opt("days", 8);
const SEARCH_LIMIT = opt("search-limit", 40);
const MAX_ARTICLES = opt("max-articles", 120);
const MAX_NEW_COMPANIES = opt("max-new-companies", 15);
// $ per million tokens (input, output) and per web search; Claude API price list, 2026-10.
const PRICE: Record<string, [number, number]> = { "claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10], "claude-haiku-5-5": [0.1, 0.5] };
const SEARCH_PRICE = 0.01;

type Company = { id: string; name: string; normalized_name: string; website_domain: string | null; aliases: string[] };
type Candidate = { url: string; canonical: string; title: string; published: string | null; summary: string; via: string; companyId: string | null };

/** A company's own site, from its record or inferred from existing announcement sources (twelve.co for "Twelve"). */
function companyDomain(c: Company, sourceDomains: string[]) {
  if (c.website_domain) return c.website_domain;
  const key = (normalizeName(c.name) ?? "").replace(/\s+/g, "");
  if (key.length < 4) return null;
  return sourceDomains.find((d) => d.replace(/^www\./, "").split(".")[0].replace(/-/g, "") === key) ?? null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const client = new Anthropic();
  const must = <T>(r: { data: T; error: { message: string } | null }, what: string) => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
    return r.data;
  };
  let cost = 0;
  const addUsage = (u: Pick<Anthropic.Usage, "input_tokens" | "output_tokens">, model = EXTRACTION_MODEL) => {
    const [pin, pout] = PRICE[model] ?? [0, 0];
    cost += (u.input_tokens * pin + u.output_tokens * pout) / 1e6;
  };

  // --- load the database -------------------------------------------------------------------------
  const companyRows = must(await db.from("companies").select("id, name, normalized_name, website_domain, last_news_check_at").order("last_news_check_at", { ascending: true, nullsFirst: true }), "companies") as (Omit<Company, "aliases"> & { last_news_check_at: string | null })[];
  const aliasRows = must(await db.from("company_aliases").select("company_id, alias"), "aliases") as { company_id: string; alias: string }[];
  const companies: Company[] = companyRows.map((c) => ({ ...c, aliases: aliasRows.filter((a) => a.company_id === c.id).map((a) => a.alias) }));
  const sites = must(await db.from("sites").select("id, company_id, legacy_uid, city, county, state, country, status, cost_mm, sqft, full_time_jobs, construction_jobs, capacity_value, capacity_unit").limit(10000), "sites") as (DbSite & { company_id: string; status: string | null })[];
  const annRows = must(await db.from("announcements").select("id, company_id, site_id, type, origin, announced_on, milestone_date, milestone_status, amount_usd, award_status, funding_stage, canonical_url, source_domain, announcement_sources(canonical_url), announcement_parties(id), sites(legacy_uid)").limit(20000), "announcements") as unknown as (Omit<DbAnnouncement, "extra_urls" | "party_count" | "site_legacy_uid"> & { company_id: string; announcement_sources: { canonical_url: string }[]; announcement_parties: { id: string }[]; sites: { legacy_uid: number | null } | null })[];
  const announcements = annRows.map((a) => ({ ...a, extra_urls: a.announcement_sources.map((s) => s.canonical_url), party_count: a.announcement_parties.length, site_legacy_uid: a.sites?.legacy_uid ?? null })) as (DbAnnouncement & { company_id: string })[];
  const reviewed = new Set((must(await db.from("proposed_changes").select("fingerprint").not("fingerprint", "is", null), "fingerprints") as { fingerprint: string }[]).map((r) => r.fingerprint));
  const seen = new Set((must(await db.from("articles_seen").select("canonical_url").limit(100000), "seen") as { canonical_url: string }[]).map((r) => r.canonical_url));
  for (const a of announcements) {
    if (a.canonical_url) seen.add(a.canonical_url); // already a source in the database
    a.extra_urls.forEach((u) => seen.add(u));
  }

  // Company-name matchers (whole words; short names also need site/money context)
  const matchers = companies.map((c) => ({
    c,
    re: new RegExp(`\\b(${[c.name, ...c.aliases].map(escapeRe).join("|")})\\b`, "i"),
    generic: c.name.length <= 6 || /^[A-Z][a-z]+$/.test(c.name),
  }));
  const matchCompany = (text: string) => matchers.find((m) => m.re.test(text) && (!m.generic || SITE_KEYWORDS.test(text)))?.c ?? null;

  const scope = onlyCompany ? companies.filter((c) => sameCompany(c.name, onlyCompany)) : companies;
  if (onlyCompany && !scope.length) throw new Error(`No tracked company matches "${onlyCompany}"`);

  const run = dryRun ? { id: null as string | null } : must(await db.from("scrub_runs").insert({}).select("id").single(), "scrub run") as { id: string };
  const candidates = new Map<string, Candidate>();
  const add = (c: Candidate) => {
    if (!c.canonical || seen.has(c.canonical) || candidates.has(c.canonical)) return;
    candidates.set(c.canonical, c);
  };
  const feedErrors: string[] = [];
  const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);

  // --- 1. feeds ------------------------------------------------------------------------------------
  if (!flag("no-feeds")) {
    for (const f of FEEDS) {
      const { items, error } = await readFeed(f.name, f.url);
      if (error) feedErrors.push(`${f.name}: ${error}`);
      for (const it of items) {
        if (it.published && it.published < cutoff) continue;
        const text = `${it.title} ${it.summary}`;
        const company = matchCompany(text);
        const canonical = canonicalUrl(it.url) ?? "";
        if (company && (!onlyCompany || scope.includes(company))) {
          add({ url: it.url, canonical, title: it.title, published: it.published, summary: it.summary, via: f.name, companyId: company.id });
        } else if (!company && !onlyCompany && STARTUP_KEYWORDS.test(text) && SITE_KEYWORDS.test(text) && NORTH_AMERICA.test(text)) {
          add({ url: it.url, canonical, title: it.title, published: it.published, summary: it.summary, via: `${f.name} (discovery)`, companyId: null });
        }
      }
    }
  }

  // --- 2. per-company web search (rotating) ------------------------------------------------------
  const searched: string[] = [];
  const searchErrors: string[] = [];
  if (!flag("no-search")) {
    const batch = onlyCompany ? scope : scope.slice(0, SEARCH_LIMIT);
    let next = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < batch.length) {
        const c = batch[next++];
        const places = sites.filter((s) => s.company_id === c.id).map((s) => [s.city, s.state].filter(Boolean).join(", ")).filter(Boolean);
        const domains = [...new Set(annRows.filter((a) => a.company_id === c.id).map((a) => (a as unknown as { source_domain: string | null }).source_domain).filter((d): d is string => !!d))];
        const r = await searchCompanyNews(client, { name: c.name, aliases: c.aliases, website_domain: companyDomain(c, domains), places }, ALLOWED_DOMAINS, DAYS);
        r.usage.forEach((u) => { addUsage(u); cost += (u.server_tool_use?.web_search_requests ?? 0) * SEARCH_PRICE; });
        if (r.error) searchErrors.push(`${c.name}: ${r.error}`);
        searched.push(c.name);
        for (const f of r.results.filter((x) => isRecent(x.page_age, DAYS))) {
          add({ url: f.url, canonical: canonicalUrl(f.url) ?? "", title: f.title, published: null, summary: "", via: "web search", companyId: c.id });
        }
        if (!dryRun) await db.from("companies").update({ last_news_check_at: new Date().toISOString() }).eq("id", c.id);
      }
    }));
  }

  const viaCounts = Map.groupBy([...candidates.values()], (c) => c.via.startsWith("web") ? "web search" : c.companyId ? "feeds" : "feed discovery");
  console.log(`Candidates: ${candidates.size} (${[...viaCounts].map(([k, v]) => `${k} ${v.length}`).join(", ") || "none"})${searched.length ? `; searched ${searched.length} companies` : ""}`);

  // --- 3. read + extract -------------------------------------------------------------------------
  const queue = [...candidates.values()].sort((a, b) => Number(!a.companyId) - Number(!b.companyId)).slice(0, MAX_ARTICLES);
  const unreadable: string[] = [];
  const extracted: { cand: Candidate; result: ExtractionResult; title: string | null }[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < queue.length) {
      const cand = queue[next++];
      const page = await fetchArticle(cand.url);
      // Blocked or paywalled pages fall back to the feed summary when it says enough.
      const text = page.ok ? page.text! : cand.summary.length > 300 ? `${cand.title}\n\n${cand.summary}` : null;
      if (!text) {
        unreadable.push(`[${cand.title || cand.url}](${cand.url}) — ${page.error ?? "no text"} (via ${cand.via})`);
        continue;
      }
      const slug = `scrub-${sha(cand.canonical)}`;
      let entry = await readCached(slug, text);
      if (!entry) {
        const company = companies.find((c) => c.id === cand.companyId);
        try {
          const r = await extractAnnouncements(client, { url: cand.url, title: page.title ?? cand.title, text, publishedOn: page.published ?? cand.published, companyHint: company?.name ?? null });
          addUsage(r.usage, r.model);
          entry = { key: "", model: r.model, result: r.result, error: r.error, usage: r.usage };
          await writeCached(slug, text, entry);
        } catch (e) {
          unreadable.push(`[${cand.title || cand.url}](${cand.url}) — extraction failed: ${(e as Error).message}`);
          continue;
        }
      }
      if (entry.result?.is_relevant) extracted.push({ cand, result: entry.result, title: page.title ?? cand.title });
    }
  }));

  // --- 4. proposals --------------------------------------------------------------------------------
  type Row = Proposal & { company_id: string | null; company: string; url: string };
  const rows: Row[] = [];
  let newCompanies = 0;
  for (const { cand, result } of extracted) {
    const article = { url: cand.url, canonical_url: cand.canonical, source_domain: sourceDomain(cand.url) };
    const names = [...new Set(result.announcements.map((a) => a.company_name))];
    for (const name of names) {
      const company = companies.find((c) => c.normalized_name === normalizeName(name)) ?? companies.find((c) => sameCompany(c.name, name) || c.aliases.some((al) => sameCompany(al, name)));
      if (company) {
        const ps = buildProposals({
          article, extraction: result, companyName: company.name, companyId: company.id,
          sites: sites.filter((s) => s.company_id === company.id), announcements: announcements.filter((a) => a.company_id === company.id),
          expectedSiteUid: null, lastUpdatedByUid: new Map(),
        });
        rows.push(...ps.map((p) => ({ ...p, company_id: company.id, company: company.name, url: cand.url })));
        continue;
      }
      // An untracked company announcing a North American site is a candidate for the monitor.
      const mine = result.announcements.filter((a) => a.company_name === name);
      const siteNews = mine.find((a) => a.type === "site_announced" && a.site && /^(us|usa|united states|canada|mexico)?$/i.test(a.site.country ?? ""));
      if (!siteNews || newCompanies >= MAX_NEW_COMPANIES) continue;
      newCompanies++;
      const payload: QueuePayload = {
        kind: "new_company",
        company: { name, website: null, industry: null, hq_city: null, hq_state: null, hq_country: null },
        site: {
          name: siteNews.site!.name, address: siteNews.site!.address, city: siteNews.site!.city, county: siteNews.site!.county,
          state: siteNews.site!.state, country: siteNews.site!.country ?? "United States", is_published: false,
          sqft: siteNews.site_facts?.sqft ?? null, cost_mm: siteNews.site_facts?.cost_mm ?? null, full_time_jobs: siteNews.site_facts?.full_time_jobs ?? null,
        },
        announcements: mine.filter((a) => a.type !== "other" && (!["construction_start", "production_start", "production_at_rate"].includes(a.type) || a.milestone_date)).map((a) => ({
          type: a.type, announced_on: a.announced_on, milestone_date: a.milestone_date, milestone_status: a.milestone_status,
          amount_usd: a.amount_usd, award_status: a.award_status, funding_stage: a.type === "funding_round" ? a.funding_stage : null,
          title: null, summary: null, source_url: cand.url, canonical_url: cand.canonical, source_domain: article.source_domain,
          evidence_quote: a.evidence_quote, parties: a.parties as PartyDraft[],
        })),
      };
      rows.push({
        kind: "new_company", entity_type: "announcement", op: "create", target_id: null, payload,
        evidence_quote: siteNews.evidence_quote, confidence: { high: 0.9, medium: 0.6, low: 0.3 }[siteNews.confidence],
        rationale: `Possible new startup for the monitor: ${name}, site in ${[siteNews.site!.city, siteNews.site!.state].filter(Boolean).join(", ") || "location unclear"}. The site is created unpublished; publish it from the site page once checked.`,
        company_id: null, company: name, url: cand.url,
      });
    }
  }
  const fresh = new Map<string, Row>();
  for (const r of rows) {
    const fp = fingerprint(r);
    if (!reviewed.has(fp) && !fresh.has(fp)) fresh.set(fp, r);
  }

  if (!dryRun && run.id) {
    const out = [...fresh].map(([fp, p]) => ({
      scrub_run_id: run.id, source: "scrub", kind: p.kind, entity_type: p.entity_type === "announcement" && p.kind === "new_company" ? "company" : p.entity_type,
      op: p.op, target_id: p.target_id, matched_company_id: p.company_id, match_score: 1, changes: p.payload,
      evidence_url: p.url, evidence_quote: p.evidence_quote, confidence: p.confidence, rationale: p.rationale, status: "pending", fingerprint: fp,
    }));
    for (let i = 0; i < out.length; i += 200) must(await db.from("proposed_changes").insert(out.slice(i, i + 200)), "insert proposals");
    const seenRows = queue.map((c) => ({ canonical_url: c.canonical, title: c.title.slice(0, 500), source_domain: sourceDomain(c.url), published_on: c.published, first_seen_run: run.id }));
    for (let i = 0; i < seenRows.length; i += 500) await db.from("articles_seen").upsert(seenRows.slice(i, i + 500), { onConflict: "canonical_url", ignoreDuplicates: true });
    await db.from("scrub_runs").update({
      finished_at: new Date().toISOString(), articles_fetched: queue.length, articles_matched: extracted.length, proposals_created: fresh.size,
      error: [...feedErrors, ...searchErrors].join("\n") || null,
    }).eq("id", run.id);
  }

  // --- 5. digest -----------------------------------------------------------------------------------
  const byKind = Map.groupBy([...fresh.values()], (p) => p.kind);
  const date = new Date().toISOString().slice(0, 10);
  const site = process.env.MONITOR_URL ?? "https://monitor.nextgenindustry.com";
  const digest = `# Monitor news scrub — ${date}${dryRun ? " (dry run)" : ""}

**${fresh.size} new proposals** waiting in the [review queue](${site}/admin/queue). Scanned ${FEEDS.length} feeds${searched.length ? ` and searched ${searched.length} companies` : ""} for the last ${DAYS} days; read ${queue.length} new articles, ${extracted.length} relevant. Est. cost $${cost.toFixed(2)}.

${[...byKind].map(([k, v]) => `## ${KIND_LABELS[k]} (${v.length})\n${v.slice(0, 30).map((p) => `- **${p.company}**: ${p.rationale} [source](${p.url})`).join("\n")}${v.length > 30 ? `\n- … ${v.length - 30} more` : ""}`).join("\n\n") || "_Nothing new this week._"}

${unreadable.length ? `## Couldn't read (${unreadable.length})\n${unreadable.slice(0, 30).map((u) => `- ${u}`).join("\n")}\n` : ""}
${feedErrors.length || searchErrors.length ? `## Errors\n${[...feedErrors, ...searchErrors].map((e) => `- ${e}`).join("\n")}\n` : ""}`;

  await mkdir("reports", { recursive: true });
  await writeFile(`reports/scrub-${date}.md`, digest);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, digest);
  if (!dryRun && process.env.RESEND_API_KEY && process.env.DIGEST_TO) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.DIGEST_FROM ?? "Startup Industrialization Monitor <onboarding@resend.dev>",
        to: process.env.DIGEST_TO.split(",").map((s) => s.trim()),
        subject: `Monitor scrub: ${fresh.size} proposals to review (${date})`,
        text: digest,
      }),
    });
    if (!res.ok) console.error("digest email failed:", res.status, await res.text());
  }
  console.log(digest.split("\n").slice(0, 4).join("\n"));
  console.log(`\nWrote reports/scrub-${date}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

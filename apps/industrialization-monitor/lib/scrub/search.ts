// Per-company news discovery with Claude's server-side web search, limited to reputable domains.
// Returns the URLs Claude's searches surfaced; reading and extraction happen in the normal pipeline.

import Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_MODEL } from "@/lib/extract/extract";

export type Found = { url: string; title: string; page_age: string | null };

export async function searchCompanyNews(
  client: Anthropic,
  company: { name: string; aliases: string[]; website_domain: string | null; places: string[] },
  allowedDomains: string[],
  days: number,
): Promise<{ results: Found[]; usage: Anthropic.Usage[]; error: string | null }> {
  const domains = [...new Set([...allowedDomains, ...(company.website_domain ? [company.website_domain] : [])])];
  const names = [company.name, ...company.aliases].map((n) => `"${n}"`).join(" or ");
  const messages: Anthropic.MessageParam[] = [{
    role: "user",
    content: `Search for news published in the last ${days} days about the startup ${names}${company.places.length ? ` (sites in ${company.places.join("; ")})` : ""}: new or existing factory, pilot or demo sites in the US, Canada or Mexico; construction or production milestones; delays, closures or cancellations; funding rounds, grants, loans, tax credits, incentives, customer deals. Run 1-3 focused searches. Then reply with just the titles of relevant articles, one per line, or "none".`,
  }];
  const results = new Map<string, Found>();
  const usage: Anthropic.Usage[] = [];
  try {
    // Server tools can pause long turns; resume up to a few times.
    for (let i = 0; i < 3; i++) {
      const res = await client.messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3, allowed_domains: domains }],
        messages,
      });
      usage.push(res.usage);
      for (const block of res.content) {
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const r of block.content) {
            if (r.type === "web_search_result") results.set(r.url, { url: r.url, title: r.title, page_age: r.page_age ?? null });
          }
        }
      }
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content });
    }
    return { results: [...results.values()], usage, error: null };
  } catch (e) {
    return { results: [...results.values()], usage, error: e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : (e as Error).message };
  }
}

/** Best-effort "is this recent?" from the search result's page_age ("3 days ago", "Oct 2, 2026"). */
export function isRecent(pageAge: string | null, days: number): boolean {
  if (!pageAge) return true; // unknown: let extraction decide via announced_on
  const rel = pageAge.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
  if (rel) {
    const n = Number(rel[1]);
    const unitDays = { minute: 0, hour: 0, day: 1, week: 7, month: 30, year: 365 }[rel[2].toLowerCase() as "day"];
    return n * unitDays <= days;
  }
  const t = Date.parse(pageAge);
  return !Number.isFinite(t) || Date.now() - t <= (days + 1) * 86400000;
}

// Fetches an article and extracts its readable text (Mozilla Readability).
// Shared by the corpus builder and the weekly scrub.

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

const MAX_CHARS = 120_000;
const USER_AGENT = "Mozilla/5.0 (compatible; NGIG-Industrialization-Monitor/0.1; +https://www.nextgenindustry.com)";

export type FetchedArticle = {
  ok: boolean; status: number | null; error: string | null; contentType: string | null;
  title: string | null; text: string | null; published: string | null;
};

export async function fetchArticle(url: string): Promise<FetchedArticle> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" }, redirect: "follow", signal: ctrl.signal });
    const contentType = res.headers.get("content-type");
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}`, contentType, title: null, text: null, published: null };
    if (!contentType?.includes("html")) {
      return { ok: false, status: res.status, error: `unsupported content-type ${contentType}`, contentType, title: null, text: null, published: null };
    }
    const html = await res.text();
    const { document } = parseHTML(html);
    const meta = (sel: string) => document.querySelector(sel)?.getAttribute("content") ?? null;
    const published =
      meta('meta[property="article:published_time"]') ?? meta('meta[name="date"]') ?? meta('meta[name="pubdate"]') ??
      meta('meta[itemprop="datePublished"]') ?? document.querySelector("time[datetime]")?.getAttribute("datetime") ?? null;
    const article = new Readability(document as unknown as Document).parse();
    const text = article?.textContent?.replace(/\n\s*\n+/g, "\n\n").trim() ?? null;
    if (!text || text.length < 300) {
      return { ok: false, status: res.status, error: "no readable article text (paywall, JS-rendered, or blocked)", contentType, title: article?.title ?? null, text, published };
    }
    if (text.length > MAX_CHARS) {
      return { ok: false, status: res.status, error: `article too long (${text.length} chars)`, contentType, title: article?.title ?? null, text: null, published };
    }
    return { ok: true, status: res.status, error: null, contentType, title: article?.title ?? null, text, published: published?.slice(0, 10) ?? null };
  } catch (e) {
    return { ok: false, status: null, error: (e as Error).name === "AbortError" ? "timeout" : (e as Error).message, contentType: null, title: null, text: null, published: null };
  } finally {
    clearTimeout(timer);
  }
}

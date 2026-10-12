// Minimal RSS 2.0 / Atom reader for the scrub (no dependency; feeds are well-formed enough).

export type FeedItem = { feed: string; title: string; url: string; published: string | null; summary: string };

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? null;

function isoDate(s: string | null) {
  if (!s) return null;
  const t = Date.parse(decode(s));
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

export function parseFeed(feed: string, xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const [, body] of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)) {
    const url = decode(tag(body, "link") ?? tag(body, "guid") ?? "");
    if (!/^https?:\/\//.test(url)) continue;
    items.push({
      feed,
      title: decode(tag(body, "title") ?? ""),
      url,
      published: isoDate(tag(body, "pubDate") ?? tag(body, "dc:date")),
      summary: decode(tag(body, "description") ?? "").slice(0, 1000),
    });
  }
  for (const [, body] of xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi)) {
    const url = body.match(/<link[^>]*href="([^"]+)"/i)?.[1];
    if (!url) continue;
    items.push({
      feed,
      title: decode(tag(body, "title") ?? ""),
      url,
      published: isoDate(tag(body, "published") ?? tag(body, "updated")),
      summary: decode(tag(body, "summary") ?? tag(body, "content") ?? "").slice(0, 1000),
    });
  }
  return items;
}

export async function readFeed(name: string, url: string): Promise<{ items: FeedItem[]; error: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NGIG-Industrialization-Monitor/0.1; +https://www.nextgenindustry.com)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { items: [], error: `HTTP ${res.status}` };
    return { items: parseFeed(name, await res.text()), error: null };
  } catch (e) {
    return { items: [], error: (e as Error).message };
  }
}

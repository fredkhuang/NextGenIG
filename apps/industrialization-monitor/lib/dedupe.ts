// Shared de-duplication helpers used by the importer, the review queue and the scrub.
// normalizeName must stay in sync with normalize_name() in supabase/migrations/*_core.sql.

const LEGAL_SUFFIXES =
  /\b(inc|incorporated|llc|l l c|ltd|limited|corp|corporation|co|company|plc|gmbh|technologies|technology|holdings)\b/g;

export function normalizeName(name: string | null | undefined): string | null {
  const n = (name ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(LEGAL_SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
  return n || null;
}

const TRACKING_PARAMS = /^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|cmpid|ocid|sr_share)$/i;

/** Canonical form of a source URL: https, no www, no tracking params, no fragment, no trailing slash. */
export function canonicalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  u.protocol = "https:";
  u.hostname = u.hostname.replace(/^www\./, "").toLowerCase();
  u.hash = ""; // also drops #:~:text= highlight fragments
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
  }
  u.searchParams.sort();
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
  return u.toString().replace(/\/(\?|$)/, "$1");
}

export function sourceDomain(raw: string | null | undefined): string | null {
  const c = canonicalUrl(raw);
  return c ? new URL(c).hostname : null;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Trigram similarity, matching pg_trgm's similarity() closely enough for client-side hints. */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const set = new Set<string>();
    for (const word of s.split(" ").filter(Boolean)) {
      const padded = `  ${word} `;
      for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
    }
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.size || !gb.size) return 0;
  let shared = 0;
  for (const g of ga) if (gb.has(g)) shared++;
  return shared / (ga.size + gb.size - shared);
}

export const COMPANY_MATCH_THRESHOLD = 0.6;

/** Loose company-name match for extracted names ("Twelve Benefit Corp" ~ "Twelve"). */
export function sameCompany(a: string, b: string): boolean {
  const [x, y] = [normalizeName(a) ?? "", normalizeName(b) ?? ""];
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x) || trigramSimilarity(x, y) >= COMPANY_MATCH_THRESHOLD;
}
export const SITE_DUPLICATE_KM = 2;
export const ANNOUNCEMENT_MERGE_DAYS = 10;

/** Great-circle distance in km. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

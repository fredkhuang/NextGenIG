// Pure transforms from the legacy "Sites" sheet to companies / sites / announcements.
// No I/O here so everything is unit-testable (transform.test.ts).

import { canonicalUrl, normalizeName, sourceDomain } from "@/lib/dedupe";

export type SiteStatus =
  | "development" | "construction" | "commissioning" | "production"
  | "active" | "delayed" | "inactive" | "canceled";
export type AnnouncementType =
  | "site_announced" | "construction_start" | "production_start" | "production_at_rate"
  | "status_change" | "delay" | "cancellation" | "bankruptcy" | "other";

/** A cell value as exceljs hands it over. */
export type CellValue =
  | string | number | boolean | Date | null | undefined
  | { text?: string; hyperlink?: string; result?: unknown; formula?: string; richText?: { text: string }[] };

export type Issue = { uid: number; company: string; field: string; value: string; note: string };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

export function cellText(v: CellValue): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((r) => r.text).join("").trim() || null;
    if (v.text != null) return String(v.text).trim() || null;
    if (v.result != null) return String(v.result).trim() || null;
    return null;
  }
  const s = String(v).trim();
  return s || null;
}

/** Text with "TBD"/"Unknown"-style placeholders mapped to null. */
export function textOrNull(v: CellValue): string | null {
  const t = cellText(v);
  return t && !NO_INFO.test(t) ? t : null;
}

export function cellUrl(v: CellValue): string | null {
  if (v && typeof v === "object" && !(v instanceof Date) && v.hyperlink) return v.hyperlink.trim();
  const t = cellText(v);
  const m = t?.match(/https?:\/\/\S+/);
  return m ? m[0] : null;
}

const NO_INFO = /^(no info(rmation)?|n\/?a|tbd|unknown|not available|hold|cant find|can't find|none|-)$/i;

/** Number from a cell; text like "No Information" → null; "22 (43 per pitchbook)" → 22 with an issue. */
export function parseNumber(v: CellValue): { value: number | null; issue?: string } {
  if (v == null) return { value: null };
  if (typeof v === "number") return { value: v };
  if (typeof v === "object" && !(v instanceof Date) && typeof v.result === "number") return { value: v.result };
  const t = cellText(v);
  if (!t || NO_INFO.test(t)) return { value: null };
  const cleaned = t.replace(/^[,;\s]+/, "").replace(/[$,]/g, "");
  const m = cleaned.match(/^~?\s*(-?\d+(\.\d+)?)/);
  if (m) {
    const value = Number(m[1]);
    return String(value) === cleaned ? { value } : { value, issue: `kept ${value}, dropped text` };
  }
  return { value: null, issue: "not a number" };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Vague timing → the closest single calendar day (convention confirmed 2026-10-11):
 *   "end of 2025" / "by 2025" / "late 2025" → 2025-12-31     (last day of the period)
 *   "mid-2026" → 2026-07-01, "mid-Q2 2026" → 2026-05-15     (midpoint)
 *   "early 2026" / "2026" / "Q1 2026" / "March 2026" → first day of the period
 *   "second half of 2026" / "H2 2026" → 2026-07-01, "first half" / "H1" → 2026-01-01
 *   seasons: spring → Apr 1, summer → Jul 1, fall/autumn → Oct 1, winter → Jan 1
 * Must match the rules in the extraction prompt (lib/extract/extract.ts).
 */
export function parseFuzzyDate(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\\.?";
  const end = /\b(end of|by (the )?end of|by|late|year-end|before)\b/.test(t);
  const mid = /\bmid(dle)?[- ]/.test(t);
  let m: RegExpMatchArray | null;

  // Exact days first
  m = t.match(new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)\\b`));
  if (m) return iso(Number(m[3]), MONTHS[m[1]], Number(m[2]));
  m = t.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/);
  if (m) return iso(Number(m[3]), Number(m[1]), Number(m[2]));

  // Quarters
  const q = t.match(/\bq([1-4])\b/)?.[1];
  const qy = t.match(/\b(20\d\d)\b/)?.[1];
  if (q && qy) {
    const y = Number(qy), first = (Number(q) - 1) * 3 + 1;
    if (end) return iso(y, first + 2, lastDay(y, first + 2));
    if (mid) return iso(y, first + 1, 15);
    return iso(y, first, 1);
  }

  // Months
  m = t.match(new RegExp(`\\b${MONTH},?\\s+(20\\d\\d)\\b`));
  if (m) {
    const y = Number(m[2]), mo = MONTHS[m[1]];
    if (end) return iso(y, mo, lastDay(y, mo));
    if (mid) return iso(y, mo, 15);
    return iso(y, mo, 1);
  }

  // Years, halves, seasons
  m = t.match(/\b(20\d\d)\b/);
  if (m) {
    const y = Number(m[1]);
    if (/\b(second half|h2|back half)\b/.test(t)) return end ? iso(y, 12, 31) : iso(y, 7, 1);
    if (/\b(first half|h1)\b/.test(t)) return end ? iso(y, 6, 30) : iso(y, 1, 1);
    if (/\bspring\b/.test(t)) return iso(y, 4, 1);
    if (/\bsummer\b/.test(t)) return iso(y, 7, 1);
    if (/\b(fall|autumn)\b/.test(t)) return iso(y, 10, 1);
    if (/\bwinter\b/.test(t)) return iso(y, 1, 1);
    if (end) return iso(y, 12, 31);
    if (mid) return iso(y, 7, 1);
    return iso(y, 1, 1);
  }
  return null;
}

/** Date cell → ISO date. Free text goes through parseFuzzyDate's calendar-day convention. */
export function parseDateCell(v: CellValue): { value: string | null; issue?: string } {
  if (v == null) return { value: null };
  let d: Date | null = null;
  if (v instanceof Date) d = v;
  else if (typeof v === "number" && v > 20000 && v < 80000) d = new Date(Math.round((v - 25569) * 86400000));
  if (d) return { value: iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) };
  const t = cellText(v);
  if (!t || NO_INFO.test(t)) return { value: null };
  if (/no news|no update/i.test(t) && !/^(q[1-4]|20\d\d|[a-z]{3,9}\.? 20\d\d)/i.test(t)) return { value: null, issue: "status note, not a date" };
  const f = parseFuzzyDate(t);
  return f ? { value: f, issue: `parsed "${t}" as ${f}` } : { value: null, issue: "unparseable date" };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, SiteStatus> = {
  production: "production",
  construction: "construction",
  active: "active",
  development: "development",
  inactive: "inactive",
  commissioning: "commissioning",
  delayed: "delayed",
  "canceled project": "canceled",
  canceled: "canceled",
  cancelled: "canceled",
  "cm/no mfg": "inactive",
};

export function parseStatus(raw: string | null): { status: SiteStatus | null; contract: boolean } {
  if (!raw) return { status: null, contract: false };
  const key = raw.trim().toLowerCase();
  return { status: STATUS_MAP[key] ?? null, contract: key === "cm/no mfg" };
}

/** "New Type" (Discrete/Process × Pilot/FOAK/Full Size) + "Type" (Factory, Deploy-Demo/ScaleUp/ScaleOut, CM). */
export function parseTypes(newType: string | null, type: string | null) {
  const nt = (newType ?? "").toLowerCase();
  const mfg_type = nt.startsWith("discrete") ? "Discrete" : nt.startsWith("process") ? "Process" : null;
  let site_type: "Demo" | "Pilot" | "Full Size" | null =
    nt.includes("pilot") ? "Pilot" : nt.includes("full size") || nt.includes("foak") ? "Full Size" : null;
  const foak = nt.includes("foak");
  const t = (type ?? "").toLowerCase();
  if (t === "deploy-demo") site_type = "Demo";
  return { mfg_type, site_type, foak, contract: t === "cm" } as const;
}

export function parseFirstOfKind(raw: string | null): { value: boolean | null; note?: string } {
  if (!raw) return { value: null };
  const t = raw.trim().toLowerCase();
  if (t === "yes") return { value: true };
  if (t === "no") return { value: false };
  return { value: null, note: raw.trim() };
}

const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR".split(" "),
);

/** "Mountain View, CA" → US; "Tel Aviv, Israel" → foreign. */
export function parseHq(raw: string | null) {
  if (!raw) return { hq_city: null, hq_state: null, hq_country: null };
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const last = parts.at(-1) ?? "";
  if (US_STATES.has(last.toUpperCase())) {
    return { hq_city: parts.slice(0, -1).join(", ") || null, hq_state: last.toUpperCase(), hq_country: "United States" };
  }
  return { hq_city: parts.slice(0, -1).join(", ") || null, hq_state: null, hq_country: last || null };
}

export function classifyComment(text: string): AnnouncementType {
  const t = text.toLowerCase();
  if (/bankrupt|chapter 11|chapter 7|in default|insolven|receivership/.test(t)) return "bankruptcy";
  if (/cancel|scrap|abandon|closed|shut ?down/.test(t)) return "cancellation";
  if (/delay|pause|postpone|push(ed)? (back|out)/.test(t)) return "delay";
  return "status_change";
}

// ---------------------------------------------------------------------------
// Row → entities
// ---------------------------------------------------------------------------

export type RawRow = Record<string, CellValue>; // keyed by column letter
export type CellComment = { ref: string; text: string };

export type CompanyRecord = {
  name: string;
  normalized_name: string;
  industry: string | null;
  sub_industry: string | null;
  hq_city: string | null;
  hq_state: string | null;
  hq_country: string | null;
  manufacturing_strategy: "In-House" | "Contract";
  description: string | null;
};

export type SiteRecord = {
  legacy_uid: number;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  status: SiteStatus | null;
  mfg_type: "Discrete" | "Process" | null;
  site_type: "Demo" | "Pilot" | "Full Size" | null;
  first_of_kind: boolean | null;
  construction_jobs: number | null;
  full_time_jobs: number | null;
  cost_mm: number | null;
  sqft: number | null;
  land_acres: number | null;
  land_ownership: string | null;
  envelope_ownership: string | null;
  notes: string | null;
};

export type AnnouncementRecord = {
  import_key: string;
  type: AnnouncementType;
  announced_on: string | null;
  milestone_date: string | null;
  milestone_status: "planned" | "actual" | null;
  title: string | null;
  summary: string | null;
  source_url: string | null;
  canonical_url: string | null;
  source_domain: string | null;
};

export type TransformedRow = {
  company: CompanyRecord;
  site: SiteRecord;
  announcements: AnnouncementRecord[];
  issues: Issue[];
  last_updated: string | null;
};

const FUNDING_TEMPLATE_ONLY = /^(\s*(federal|state|local)\s*:\s*)*$/i;

export function transformRow(row: RawRow, comments: CellComment[] = []): TransformedRow | null {
  const name = cellText(row.A);
  const uid = parseNumber(row.AI).value;
  if (!name || uid == null) return null;

  const issues: Issue[] = [];
  const issue = (field: string, value: CellValue, note: string) =>
    issues.push({ uid, company: name, field, value: cellText(value) ?? "", note });
  const num = (col: string, field: string) => {
    const r = parseNumber(row[col]);
    if (r.issue) issue(field, row[col], r.issue);
    return r.value;
  };
  const date = (col: string, field: string) => {
    const r = parseDateCell(row[col]);
    if (r.issue) issue(field, row[col], r.issue);
    return r.value;
  };

  const statusRaw = cellText(row.B);
  const { status, contract: cmStatus } = parseStatus(statusRaw);
  if (statusRaw && !status) issue("status", row.B, "unknown status");
  const types = parseTypes(cellText(row.Z), cellText(row.AB));
  const fok = parseFirstOfKind(cellText(row.AA));
  if (fok.note) issue("first_of_kind", row.AA, "free text moved to notes");

  const notes: string[] = [];
  if (cmStatus) notes.push('Legacy status "CM/No Mfg".');
  if (fok.note) notes.push(`First of a kind/Pilot: ${fok.note}`);
  for (const [col, field] of [["I", "construction_jobs"], ["J", "full_time_jobs"], ["K", "cost_mm"], ["M", "land_acres"]] as const) {
    const t = cellText(row[col]);
    if (t && parseNumber(row[col]).issue) notes.push(`${field}: ${t}`);
  }

  const sqft = num("L", "sqft");
  // The sheet uses sqft = 1 as a "not known" placeholder; anything else under 100 is suspicious.
  if (sqft != null && sqft > 1 && sqft < 100) issue("sqft", row.L, "implausibly small");

  const site: SiteRecord = {
    legacy_uid: uid,
    address: textOrNull(row.C),
    city: textOrNull(row.D),
    state: textOrNull(row.E),
    country: cellText(row.F) ?? "United States",
    lat: num("G", "lat"),
    lng: num("H", "lng"),
    status,
    mfg_type: types.mfg_type,
    site_type: types.site_type,
    first_of_kind: types.foak ? true : fok.value,
    construction_jobs: num("I", "construction_jobs"),
    full_time_jobs: num("J", "full_time_jobs"),
    cost_mm: num("K", "cost_mm"),
    sqft: sqft != null && sqft <= 1 ? null : sqft,
    land_acres: num("M", "land_acres"),
    land_ownership: cellText(row.N),
    envelope_ownership: cellText(row.O),
    notes: null,
  };

  const company: CompanyRecord = {
    name,
    normalized_name: normalizeName(name) ?? name.toLowerCase(),
    industry: cellText(row.AE),
    sub_industry: cellText(row.AF),
    ...parseHq(cellText(row.AD)),
    manufacturing_strategy: cmStatus || types.contract ? "Contract" : "In-House",
    description: cellText(row.AG),
  };

  // --- announcements -------------------------------------------------------
  const announcements: AnnouncementRecord[] = [];
  const lastUpdated = date("AH", "last_updated");
  const announced = date("Q", "announced_date");
  const announcementUrl = cellUrl(row.P);
  const src = (url: string | null) => ({
    source_url: url,
    canonical_url: canonicalUrl(url),
    source_domain: sourceDomain(url),
  });
  const push = (a: Omit<AnnouncementRecord, "canonical_url" | "source_domain" | "source_url">, url: string | null) =>
    announcements.push({ ...a, ...src(url) });

  if (announced || announcementUrl) {
    push({
      import_key: `uid:${uid}:site_announced`,
      type: "site_announced",
      announced_on: announced ?? null,
      milestone_date: null, milestone_status: null,
      title: `${name} announces site`, summary: null,
    }, announcementUrl);
  }

  const milestones = [
    { type: "construction_start", planned: "R", actual: "U", actualUrl: "T" },
    { type: "production_start", planned: "S", actual: "W", actualUrl: "V" },
    { type: "production_at_rate", planned: null, actual: "Y", actualUrl: "X" },
  ] as const;
  for (const m of milestones) {
    // Some rows have the date and the URL in each other's columns; swap them back.
    if (cellUrl(row[m.actual]) && parseDateCell(row[m.actualUrl]).value && !cellUrl(row[m.actualUrl])) {
      issue(`actual_${m.type}`, row[m.actual], "date and URL columns swapped; corrected");
      row = { ...row, [m.actual]: row[m.actualUrl], [m.actualUrl]: row[m.actual] };
    }
    const planned = m.planned ? date(m.planned, `planned_${m.type}`) : null;
    if (planned) {
      push({
        import_key: `uid:${uid}:${m.type}:planned`,
        type: m.type,
        announced_on: announced ?? lastUpdated,
        milestone_date: planned, milestone_status: "planned",
        title: null, summary: "Imported from legacy sheet (announced date)",
      }, announcementUrl);
    }
    const actual = date(m.actual, `actual_${m.type}`);
    if (actual) {
      push({
        import_key: `uid:${uid}:${m.type}:actual`,
        type: m.type,
        announced_on: actual,
        milestone_date: actual, milestone_status: "actual",
        title: null, summary: "Imported from legacy sheet (actual date)",
      }, cellUrl(row[m.actualUrl]) ?? cellUrl(row[m.actual]));
    }
  }

  const funding = cellText(row.AC);
  if (funding && !FUNDING_TEMPLATE_ONLY.test(funding)) {
    push({
      import_key: `uid:${uid}:funding_stack`,
      type: "other",
      announced_on: null,
      milestone_date: null, milestone_status: null,
      title: "Funding stack (imported, unparsed)", summary: funding,
    }, null);
  }

  comments.forEach((c, i) => {
    const when = parseFuzzyDate(c.text);
    push({
      import_key: `uid:${uid}:comment:${c.ref}:${i}`,
      type: classifyComment(c.text),
      announced_on: when ?? lastUpdated,
      milestone_date: null, milestone_status: null,
      title: null, summary: c.text,
    }, cellUrl(c.text));
  });

  site.notes = notes.join("\n") || null;
  return { company, site, announcements, issues, last_updated: lastUpdated };
}

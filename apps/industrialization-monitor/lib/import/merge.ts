// Folds legacy rows that describe the same physical site into one.

import { ANNOUNCEMENT_MERGE_DAYS } from "@/lib/dedupe";
import type { AnnouncementRecord, SiteRecord, TransformedRow } from "./transform";

export type SiteMerge = { keep: number; merge: number; overrides?: Partial<SiteRecord>; note?: string };

export type MergedAnnouncement = AnnouncementRecord & { extra_sources: string[] };
export type MergedRow = Omit<TransformedRow, "announcements"> & { announcements: MergedAnnouncement[] };

const daysApart = (a: string | null, b: string | null) =>
  a && b ? Math.abs(Date.parse(a) - Date.parse(b)) / 86400000 : a === b ? 0 : Infinity;

/**
 * Merge `dup` into `keep`. The row with the later Last Updated wins conflicting fields; nulls are
 * filled from the other. Announcements describing the same event (same type and milestone status,
 * announced within ANNOUNCEMENT_MERGE_DAYS) collapse to the newer row's, keeping the other URL as an
 * extra source.
 */
export function mergeRows(keep: TransformedRow, dup: TransformedRow, overrides: Partial<SiteRecord> = {}): MergedRow {
  const keepIsNewer = (keep.last_updated ?? "") >= (dup.last_updated ?? "");
  const [newer, older] = keepIsNewer ? [keep, dup] : [dup, keep];

  const site = { ...older.site } as Record<string, unknown>;
  for (const [k, v] of Object.entries(newer.site)) if (v != null) site[k] = v;
  site.legacy_uid = keep.site.legacy_uid;
  site.notes = [...new Set([keep.site.notes, dup.site.notes].filter(Boolean))].join("\n") || null;
  Object.assign(site, overrides);

  const announcements: MergedAnnouncement[] = newer.announcements.map((a) => ({ ...a, extra_sources: [] }));
  for (const a of older.announcements) {
    const same = announcements.find(
      (b) =>
        b.type === a.type &&
        b.milestone_status === a.milestone_status &&
        b.type !== "other" && // free-text funding notes are kept side by side
        daysApart(b.announced_on, a.announced_on) <= ANNOUNCEMENT_MERGE_DAYS,
    );
    if (!same) {
      announcements.push({ ...a, extra_sources: [] });
    } else if (a.source_url && a.canonical_url !== same.canonical_url) {
      if (!same.source_url) Object.assign(same, { source_url: a.source_url, canonical_url: a.canonical_url, source_domain: a.source_domain });
      else same.extra_sources.push(a.source_url);
    }
  }

  return {
    company: keep.company,
    site: site as SiteRecord,
    announcements,
    issues: [...keep.issues, ...dup.issues],
    last_updated: newer.last_updated,
  };
}

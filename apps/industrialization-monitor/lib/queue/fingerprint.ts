import { sha } from "@/lib/extract/cache";
import type { Proposal } from "./relabel";

/** Identity of a proposal that survives prompt changes (ignores enrichments like funding_stage). */
export function fingerprint(p: Proposal & { url: string }) {
  const c = (p.payload as { create?: { type: string; milestone_status: string | null; milestone_date: string | null; amount_usd: number | null; site_id: string | null } }).create;
  const set = (p.payload as { set?: Record<string, unknown> }).set;
  return sha(JSON.stringify([
    p.kind, p.target_id, p.url,
    c ? [c.type, c.milestone_status, c.milestone_date, c.amount_usd, c.site_id] : null,
    set ? Object.keys(set).filter((k) => k !== "funding_stage").sort() : null,
  ]));
}

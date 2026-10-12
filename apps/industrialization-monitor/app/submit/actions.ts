"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { hashIp, proposalsFor, rateLimited, RATE_LIMIT_PER_HOUR, serviceClient, verifyTurnstile } from "@/lib/submit";

export type SubmitState = { status: "idle" | "sent" | "error"; message?: string };

// Fields hidden for a submission kind are absent from FormData; treat absent and blank as null.
const blankToNull = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim() : v);
const optText = z.preprocess(blankToNull, z.string().max(300).nullable());
const optNum = z.preprocess(
  (v) => { const b = blankToNull(v); return b == null ? null : Number(String(b).replace(/[$,]/g, "")); },
  z.number().nonnegative().finite().nullable(),
);

const Schema = z.object({
  kind: z.enum(["new_site", "correction", "tip"]),
  site_id: z.preprocess(blankToNull, z.uuid().nullable()),
  company_name: optText,
  website: z.preprocess(blankToNull, z.url({ protocol: /^https?$/ }).nullable()),
  industry: optText,
  address: optText,
  city: optText,
  state: optText,
  country: z.preprocess(blankToNull, z.enum(["United States", "Canada", "Mexico"]).nullable()),
  status: z.preprocess(blankToNull, z.enum(["development", "construction", "commissioning", "production", "active", "delayed", "inactive", "canceled"]).nullable()),
  mfg_type: z.preprocess(blankToNull, z.enum(["Discrete", "Process"]).nullable()),
  site_type: z.preprocess(blankToNull, z.enum(["Demo", "Pilot", "Full Size"]).nullable()),
  sqft: optNum,
  cost_mm: optNum,
  full_time_jobs: optNum,
  production_date: z.preprocess(blankToNull, z.iso.date().nullable()),
  production_status: z.preprocess(blankToNull, z.enum(["planned", "actual"]).nullable()),
  source_url: z.preprocess(blankToNull, z.url({ protocol: /^https?$/, message: "A source link (http/https) is required." })),
  notes: z.preprocess(blankToNull, z.string().max(2000).nullable()),
  submitter_name: optText,
  submitter_email: z.preprocess(blankToNull, z.email().nullable()),
});

export async function submitEntry(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  // Honeypot: real visitors never see or fill this field.
  if (String(form.get("company_fax") ?? "") !== "") return { status: "sent", message: "Thanks!" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? "") || null, ip))) {
    return { status: "error", message: "Please complete the verification check and try again." };
  }

  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: parsed.error.issues.map((i) => i.message).join(" ") };
  const s = parsed.data;
  if (s.kind === "new_site" && !s.company_name) return { status: "error", message: "Company name is required." };
  if (s.kind === "new_site" && !s.city && !s.address) return { status: "error", message: "Give at least a city for the site." };
  if (s.kind === "correction" && !s.site_id) return { status: "error", message: "Open the correction form from a site on the map." };

  let db;
  try {
    db = serviceClient();
  } catch {
    return { status: "error", message: "Submissions are temporarily unavailable." };
  }
  const ipHash = hashIp(ip);
  if (await rateLimited(db, ipHash)) {
    return { status: "error", message: `You've reached the limit of ${RATE_LIMIT_PER_HOUR} submissions an hour. Please try again later.` };
  }

  const { submitter_name, submitter_email, ...payload } = s;
  const { data: submission, error } = await db.from("submissions").insert({
    kind: s.kind, site_id: s.site_id, payload, submitter_name, submitter_email, source_url: s.source_url, submitter_ip_hash: ipHash,
  }).select("id").single();
  if (error || !submission) return { status: "error", message: "Something went wrong saving your submission. Please try again." };

  try {
    const proposals = await proposalsFor(db, payload);
    await db.from("proposed_changes").insert(proposals.map((p) => ({
      ...p, source: "submission", submission_id: submission.id, evidence_url: s.source_url, status: "pending",
    })));
  } catch (e) {
    // The submission is saved either way; an admin can still see it in the submissions table.
    console.error("submission proposals failed", submission.id, e);
  }
  return { status: "sent", message: "Thank you! Your submission is in the review queue. We check every entry against its source before it appears on the map." };
}

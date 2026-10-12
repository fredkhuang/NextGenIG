"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { canonicalUrl, slugify, sourceDomain } from "@/lib/dedupe";
import { geocodeSite } from "@/lib/geocode";
import {
  ANNOUNCEMENT_TYPES, AWARD_STATUSES, ENTITIES, type EntityKey, FUNDING_STAGES, MILESTONE_TYPES, PARTY_ROLES, ORG_TYPES, parseRecord,
} from "@/lib/admin/schema";
import { SITES_TAG } from "@/lib/public-data";
import { resolveOrganization } from "@/lib/queue/apply";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { status: "idle" | "saved" | "error"; message?: string };
const ok = (message = "Saved."): ActionState => ({ status: "saved", message });
const fail = (message: string): ActionState => ({ status: "error", message });
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;
const done = (message?: string) => {
  updateTag(SITES_TAG);
  refresh();
  return ok(message);
};

export async function saveRecord(entity: EntityKey, id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { values, errors } = parseRecord(entity, form);
  if (errors.length) return fail(errors.join(" "));
  if (entity === "companies" && !values.slug) values.slug = slugify(String(values.name));
  if (entity === "organizations" && values.parent_id === id) return fail("An organization can't be its own parent.");
  const { error } = await supabase.from(ENTITIES[entity].table).update(values).eq("id", id);
  if (error) return fail(error.code === "23505" ? "Another record already uses that name or slug." : error.message);
  return done();
}

export async function geocodeSiteAction(id: string, _prev: ActionState): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { data: site } = await supabase.from("sites").select("address, city, state, country").eq("id", id).single();
  if (!site) return fail("Site not found.");
  const hit = await geocodeSite(site);
  if (!hit) return fail("No match from the geocoders. Check the address, city and state.");
  const { error } = await supabase.from("sites").update({ lat: hit.lat, lng: hit.lng }).eq("id", id);
  if (error) return fail(error.message);
  return done(`Located at ${hit.lat.toFixed(4)}, ${hit.lng.toFixed(4)} (${hit.precision}-level, ${hit.source}).`);
}

export async function addAnnouncement(companyId: string, siteId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const type = str(form, "type");
  if (!type || !(ANNOUNCEMENT_TYPES as readonly string[]).includes(type)) return fail("Pick an announcement type.");
  const milestone = MILESTONE_TYPES.has(type);
  const milestoneDate = str(form, "milestone_date");
  if (milestone && !milestoneDate) return fail("Milestones need a date.");
  const amount = str(form, "amount_usd");
  const amountUsd = amount ? Number(amount.replace(/[$,]/g, "")) : null;
  if (amount && !Number.isFinite(amountUsd)) return fail("Amount must be a number (USD).");
  const award = str(form, "award_status");
  const stage = str(form, "funding_stage");
  const url = str(form, "source_url");
  if (url && !/^https?:\/\//i.test(url)) return fail("Source URL must start with http:// or https://.");

  const { error } = await supabase.from("announcements").insert({
    company_id: companyId,
    site_id: form.get("company_level") === "on" ? null : siteId,
    type,
    announced_on: str(form, "announced_on"),
    milestone_date: milestone ? milestoneDate : null,
    milestone_status: milestone ? (str(form, "milestone_status") ?? "planned") : null,
    amount_usd: amountUsd,
    award_status: award && (AWARD_STATUSES as readonly string[]).includes(award) ? award : null,
    funding_stage: type === "funding_round" && stage && (FUNDING_STAGES as readonly string[]).includes(stage) ? stage : null,
    title: str(form, "title"),
    summary: str(form, "summary"),
    source_url: url,
    canonical_url: canonicalUrl(url),
    source_domain: sourceDomain(url),
    origin: "admin",
  });
  if (error) return fail(error.code === "23505" ? "That announcement already exists for this source." : error.message);
  return done("Announcement added.");
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.from("announcements").delete().eq("id", id);
  updateTag(SITES_TAG);
  refresh();
}

export async function addParty(announcementId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const name = str(form, "name");
  const role = str(form, "role");
  const orgType = str(form, "org_type") ?? "other";
  if (!name) return fail("Organization name is required.");
  if (!role || !(PARTY_ROLES as readonly string[]).includes(role)) return fail("Pick a role.");
  if (!(ORG_TYPES as readonly string[]).includes(orgType)) return fail("Pick an organization type.");
  const amount = str(form, "amount_usd");
  try {
    const orgId = await resolveOrganization(supabase, name, orgType as never, str(form, "parent_org"));
    let programId: string | null = null;
    const program = str(form, "program");
    if (program) {
      const { data } = await supabase.from("programs").upsert({ organization_id: orgId, name: program }, { onConflict: "organization_id,name" }).select("id").single();
      programId = data?.id ?? null;
    }
    const { error } = await supabase.from("announcement_parties").upsert(
      { announcement_id: announcementId, organization_id: orgId, role, program_id: programId, amount_usd: amount ? Number(amount.replace(/[$,]/g, "")) : null },
      { onConflict: "announcement_id,organization_id,role" },
    );
    if (error) return fail(error.message);
  } catch (e) {
    return fail((e as Error).message);
  }
  return done("Party added.");
}

export async function removeParty(id: string): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.from("announcement_parties").delete().eq("id", id);
  refresh();
}

export async function addAlias(entity: "companies" | "organizations", id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const alias = str(form, "alias");
  if (!alias) return fail("Enter an alias.");
  const row: Record<string, string> = { alias, [entity === "companies" ? "company_id" : "organization_id"]: id };
  const { error } = await supabase.from(entity === "companies" ? "company_aliases" : "organization_aliases").insert(row);
  if (error) return fail(error.code === "23505" ? "That alias is already used." : error.message);
  refresh();
  return ok("Alias added.");
}

export async function removeAlias(entity: "companies" | "organizations", aliasId: string): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.from(entity === "companies" ? "company_aliases" : "organization_aliases").delete().eq("id", aliasId);
  refresh();
}

const MERGE_FN = { companies: "merge_companies", sites: "merge_sites", organizations: "merge_organizations" } as const;

/** Merge `mergeId` into `keepId`; the merged record's name becomes an alias of the kept one. */
export async function mergeRecords(entity: keyof typeof MERGE_FN, keepId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const mergeId = str(form, "merge_id");
  if (!mergeId) return fail("Choose a record to merge in.");
  if (form.get("confirm") !== "on") return fail("Tick the confirmation box to merge.");
  const { error } = await supabase.rpc(MERGE_FN[entity], { keep_id: keepId, merge_id: mergeId });
  if (error) return fail(error.message);
  return done("Merged.");
}

export async function dismissDuplicate(entity: "company" | "site" | "organization", a: string, b: string): Promise<void> {
  const { supabase, email } = await requireAdmin();
  const [a_id, b_id] = a < b ? [a, b] : [b, a];
  await supabase.from("duplicate_dismissals").upsert({ entity_type: entity, a_id, b_id, dismissed_by: email });
  refresh();
}

export async function mergePair(entity: keyof typeof MERGE_FN, keepId: string, mergeId: string): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.rpc(MERGE_FN[entity], { keep_id: keepId, merge_id: mergeId });
  updateTag(SITES_TAG);
  refresh();
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// Applies an approved proposal. Runs with the reviewer's Supabase client, so RLS (admins only)
// and the entity_history trigger record who made each change.

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeName, slugify } from "@/lib/dedupe";
import { geocodeSite } from "@/lib/geocode";
import type { AnnouncementDraft, Diff, PartyDraft, QueuePayload } from "./types";

class ApplyError extends Error {}

const must = <T>(r: { data: T; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new ApplyError(`${what}: ${r.error.message}`);
  return r.data;
};

/** Like must(), for inserts/upserts that return exactly one row. */
const mustRow = <T>(r: { data: T; error: { message: string } | null }, what: string): NonNullable<T> => {
  const row = must(r, what);
  if (row == null) throw new ApplyError(`${what}: no row returned`);
  return row;
};

const newValues = (set: Diff) => Object.fromEntries(Object.entries(set).map(([k, v]) => [k, v.new]));

export async function resolveOrganization(db: SupabaseClient, name: string, orgType: PartyDraft["org_type"], parentName: string | null): Promise<string> {
  const normalized = normalizeName(name);
  const byName = must(await db.from("organizations").select("id").eq("normalized_name", normalized).maybeSingle(), "find organization");
  if (byName) return byName.id;
  const byAlias = must(await db.from("organization_aliases").select("organization_id").eq("normalized_alias", normalized).maybeSingle(), "find alias");
  if (byAlias) return byAlias.organization_id;
  const parentId = parentName && normalizeName(parentName) !== normalized ? await resolveOrganization(db, parentName, orgType, null) : null;
  return mustRow(await db.from("organizations").insert({ name, org_type: orgType, parent_id: parentId }).select("id").single(), "create organization").id;
}

async function addParties(db: SupabaseClient, announcementId: string, parties: PartyDraft[]) {
  for (const p of parties) {
    const orgId = await resolveOrganization(db, p.name, p.org_type, p.parent_org);
    let programId: string | null = null;
    if (p.program) {
      programId = mustRow(
        await db.from("programs").upsert({ organization_id: orgId, name: p.program }, { onConflict: "organization_id,name" }).select("id").single(),
        "upsert program",
      ).id;
    }
    must(
      await db.from("announcement_parties").upsert(
        { announcement_id: announcementId, organization_id: orgId, role: p.role, program_id: programId, amount_usd: p.amount_usd },
        { onConflict: "announcement_id,organization_id,role" },
      ),
      "add party",
    );
  }
}

async function createAnnouncement(db: SupabaseClient, d: AnnouncementDraft) {
  const { parties, ...row } = d;
  const id = mustRow(await db.from("announcements").insert({ ...row, origin: "scrub" }).select("id").single(), "create announcement").id;
  await addParties(db, id, parties);
  return id;
}

export async function applyProposal(db: SupabaseClient, p: QueuePayload): Promise<void> {
  switch (p.kind) {
    case "restated_date":
      must(await db.from("announcements").update(newValues(p.set)).eq("id", p.announcement_id), "detach legacy value");
      await createAnnouncement(db, p.create);
      return;
    case "relabel":
    case "announcement_update":
      if (Object.keys(p.set).length) must(await db.from("announcements").update(newValues(p.set)).eq("id", p.announcement_id), "update announcement");
      await addParties(db, p.announcement_id, p.parties);
      return;
    case "unsupported_source":
      must(await db.from("announcements").update(newValues(p.set)).eq("id", p.announcement_id), "detach source");
      return;
    case "new_announcement":
      await createAnnouncement(db, p.create);
      return;
    case "add_source":
      must(
        await db.from("announcement_sources").upsert(
          { announcement_id: p.announcement_id, source_url: p.source.source_url, canonical_url: p.source.canonical_url, source_domain: p.source.source_domain, evidence_quote: p.source.evidence_quote },
          { onConflict: "announcement_id,canonical_url", ignoreDuplicates: true },
        ),
        "add source",
      );
      return;
    case "site_update":
      must(await db.from("sites").update(newValues(p.set)).eq("id", p.site_id), "update site");
      return;
    case "possible_new_site": {
      const siteId = await createSite(db, { is_published: false, ...p.site });
      for (const a of p.announcements) await createAnnouncement(db, { ...a, site_id: siteId });
      return;
    }
    case "new_company": {
      const existing = must(await db.from("companies").select("id").eq("normalized_name", normalizeName(p.company.name)).maybeSingle(), "find company");
      const companyId = existing?.id ?? mustRow(
        await db.from("companies").insert({ ...p.company, slug: await freeSlug(db, p.company.name) }).select("id").single(),
        "create company",
      ).id;
      const siteId = await createSite(db, { ...p.site, company_id: companyId });
      for (const a of p.announcements) await createAnnouncement(db, { ...a, company_id: companyId, site_id: siteId });
      return;
    }
    case "tip":
      return; // handled by the reviewer outside the queue
  }
}

async function freeSlug(db: SupabaseClient, name: string) {
  const base = slugify(name);
  const { data } = await db.from("companies").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/** Inserts a site and geocodes it when it has no coordinates yet. */
async function createSite(db: SupabaseClient, site: Record<string, unknown>) {
  const id = mustRow(await db.from("sites").insert(site).select("id").single(), "create site").id;
  if (site.lat == null && (site.address || site.city)) {
    const hit = await geocodeSite({
      address: (site.address as string) ?? null, city: (site.city as string) ?? null,
      state: (site.state as string) ?? null, country: (site.country as string) ?? null,
    }).catch(() => null);
    if (hit) must(await db.from("sites").update({ lat: hit.lat, lng: hit.lng }).eq("id", id), "geocode site");
  }
  return id;
}


export { ApplyError };

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { geocodeSiteAction, mergeRecords, saveRecord } from "@/app/admin/actions";
import { ActionForm, inputClass, RecordForm } from "@/components/admin/forms";
import { Section } from "@/components/admin/list";
import { AddAnnouncementForm, History, loadAnnouncements, OrgNames, Timeline } from "@/components/admin/timeline";
import { ENTITIES, label } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";

export default function SitePage({ params }: PageProps<"/admin/sites/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Site params={params} />
    </Suspense>
  );
}

async function Site({ params }: { params: PageProps<"/admin/sites/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: site } = await supabase.from("sites").select("*, companies(id, name)").eq("id", id).maybeSingle();
  if (!site) notFound();
  const company = site.companies as { id: string; name: string };

  const [announcements, { data: current }, { data: slips }, { data: siblings }] = await Promise.all([
    loadAnnouncements(supabase, { site_id: id }),
    supabase.from("site_milestones_current").select("type, milestone_date, milestone_status, announced_on").eq("site_id", id),
    supabase.from("milestone_slips").select("type, announced_on, milestone_date, slip_days").eq("site_id", id),
    supabase.from("sites").select("id, name, city, state").eq("company_id", company.id).neq("id", id),
  ]);
  // Attach each slip to the announcement that restated the date
  const slipByAnnouncement = new Map<string, number>();
  for (const s of slips ?? []) {
    const a = announcements.find((x) => x.type === s.type && x.announced_on === s.announced_on && x.milestone_date === s.milestone_date);
    if (a) slipByAnnouncement.set(a.id, s.slip_days);
  }
  const place = [site.name, site.city, site.state].filter(Boolean).join(", ") || "Unnamed site";

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3">
        <Link href={`/admin/companies/${company.id}`} className="text-sm text-muted underline">{company.name}</Link>
        <h1 className="text-3xl text-primary">{place}</h1>
        {!site.is_published && <span className="rounded-sm bg-surface-warm px-2 text-sm">Unpublished</span>}
      </div>

      <Section title="Current milestones">
        <ul className="flex flex-wrap gap-4 text-sm">
          {["construction_start", "production_start", "production_at_rate"].map((t) => {
            const m = (current ?? []).find((c) => c.type === t);
            return (
              <li key={t} className="rounded-lg bg-bg-subtle px-3 py-2">
                <span className="block text-muted">{label(t)}</span>
                <span className="font-semibold">{m ? `${m.milestone_date} (${m.milestone_status})` : "—"}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Details">
        <RecordForm fields={ENTITIES.sites.fields} values={site} options={{}} action={saveRecord.bind(null, "sites", id)} />
        <ActionForm action={geocodeSiteAction.bind(null, id)} submit="Look up coordinates from address" variant="secondary" className="flex flex-col gap-2">
          <p className="text-sm text-muted">Save address changes first. Uses the US Census geocoder for street addresses, then OpenStreetMap by city.</p>
        </ActionForm>
      </Section>

      <Section title={`Announcements (${announcements.length})`}>
        <AddAnnouncementForm companyId={company.id} siteId={id} />
        <OrgNames db={supabase} />
        <Timeline items={announcements} slips={slipByAnnouncement} />
      </Section>

      {(siblings ?? []).length > 0 && (
        <Section title="Merge a duplicate site into this one">
          <p className="text-sm text-muted">Announcements move here, empty fields are filled from the other site, and it is deleted.</p>
          <ActionForm action={mergeRecords.bind(null, "sites", id)} submit="Merge into this site" variant="secondary" className="flex flex-col gap-2 sm:max-w-md">
            <select name="merge_id" className={inputClass} defaultValue="">
              <option value="" disabled>Choose another {company.name} site…</option>
              {(siblings ?? []).map((s) => <option key={s.id} value={s.id}>{[s.name, s.city, s.state].filter(Boolean).join(", ") || s.id}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="size-4" /> I understand this can&apos;t be undone</label>
          </ActionForm>
        </Section>
      )}

      <Section title="Change history">
        <History db={supabase} entityType="sites" entityId={id} />
      </Section>
    </>
  );
}

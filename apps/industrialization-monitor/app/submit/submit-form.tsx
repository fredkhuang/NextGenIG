"use client";

import { useActionState, useState } from "react";
import { type SubmitState, submitEntry } from "./actions";

type Kind = "new_site" | "correction" | "tip";
type SiteSummary = { id: string; company: string; place: string; status: string | null };

const input = "w-full rounded-md border border-border-strong bg-bg px-2 py-1.5 text-sm";
const STATUSES = ["development", "construction", "commissioning", "production", "active", "delayed", "inactive", "canceled"];

export function SubmitForm({ site, industries }: { site: SiteSummary | null; industries: string[] }) {
  const [kind, setKind] = useState<Kind>(site ? "correction" : "new_site");
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitEntry, { status: "idle" });

  if (state.status === "sent") {
    return <p role="status" className="rounded-lg bg-support-subtle p-6">{state.message}</p>;
  }

  const kinds: [Kind, string, string][] = [
    ["new_site", "New site", "A startup factory, pilot or demo site we're missing"],
    ["correction", "Correction", site ? `Update ${site.company} · ${site.place}` : "Open from a site on the map"],
    ["tip", "News tip", "A link to news about a tracked company"],
  ];

  return (
    <form action={action} className="flex flex-col gap-6">
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">What are you sending?</legend>
        {kinds.map(([k, title, desc]) => (
          <label key={k} className={`flex cursor-pointer flex-col rounded-lg border p-3 ${kind === k ? "border-primary bg-bg-subtle" : "border-border"} ${k === "correction" && !site ? "opacity-50" : ""}`}>
            <span className="flex items-center gap-2 font-semibold">
              <input type="radio" name="kind" value={k} checked={kind === k} disabled={k === "correction" && !site} onChange={() => setKind(k)} />
              {title}
            </span>
            <span className="text-sm text-muted">{desc}</span>
          </label>
        ))}
      </fieldset>
      {site && kind === "correction" && <input type="hidden" name="site_id" value={site.id} />}

      {kind !== "correction" && (
        <Group title="Company">
          <Field label={kind === "tip" ? "Company (optional)" : "Company name *"}><input name="company_name" required={kind === "new_site"} className={input} /></Field>
          {kind === "new_site" && (
            <>
              <Field label="Company website"><input name="website" type="url" placeholder="https://" className={input} /></Field>
              <Field label="Industry">
                <select name="industry" className={input} defaultValue=""><option value="">—</option>{industries.map((i) => <option key={i}>{i}</option>)}</select>
              </Field>
            </>
          )}
        </Group>
      )}

      {kind !== "tip" && (
        <Group title={kind === "correction" ? "What should change? Fill only what's different." : "Site"}>
          <Field label="Street address"><input name="address" className={input} /></Field>
          <Field label={kind === "new_site" ? "City *" : "City"}><input name="city" className={input} /></Field>
          <Field label="State / province"><input name="state" className={input} /></Field>
          <Field label="Country">
            <select name="country" className={input} defaultValue={kind === "new_site" ? "United States" : ""}>
              {kind === "correction" && <option value="">—</option>}
              <option>United States</option><option>Canada</option><option>Mexico</option>
            </select>
          </Field>
          <Field label="Status">
            <select name="status" className={input} defaultValue=""><option value="">—</option>{STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select>
          </Field>
          <Field label="Site type">
            <select name="site_type" className={input} defaultValue=""><option value="">—</option><option>Demo</option><option>Pilot</option><option>Full Size</option></select>
          </Field>
          <Field label="Manufacturing">
            <select name="mfg_type" className={input} defaultValue=""><option value="">—</option><option>Discrete</option><option>Process</option></select>
          </Field>
          <Field label="Square feet (initial phase)"><input name="sqft" inputMode="numeric" className={input} /></Field>
          <Field label="Investment ($ millions)"><input name="cost_mm" inputMode="decimal" className={input} /></Field>
          <Field label="Full-time jobs (initial phase)"><input name="full_time_jobs" inputMode="numeric" className={input} /></Field>
          <Field label="Production start"><input name="production_date" type="date" className={input} /></Field>
          <Field label="That date is">
            <select name="production_status" className={input} defaultValue="planned"><option value="planned">Planned</option><option value="actual">Actual</option></select>
          </Field>
        </Group>
      )}

      <Group title="Source">
        <Field label="Link to the announcement or article *" wide><input name="source_url" type="url" required placeholder="https://" className={input} /></Field>
        <Field label="Anything else we should know?" wide><textarea name="notes" rows={3} maxLength={2000} className={input} /></Field>
      </Group>

      <Group title="About you (optional)">
        <Field label="Name"><input name="submitter_name" autoComplete="name" className={input} /></Field>
        <Field label="Email, if we may follow up"><input name="submitter_email" type="email" autoComplete="email" className={input} /></Field>
      </Group>

      {/* Honeypot for bots; hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>Company fax<input name="company_fax" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 font-semibold text-on-primary disabled:opacity-60">
          {pending ? "Sending…" : "Send for review"}
        </button>
        {state.status === "error" && <p role="alert" className="text-sm text-accent-fill">{state.message}</p>}
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-1 font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`flex flex-col gap-1 text-sm ${wide ? "sm:col-span-2" : ""}`}><span className="font-medium">{label}</span>{children}</label>;
}

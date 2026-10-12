// Field definitions for the admin forms. One config drives rendering, parsing and saving,
// so sites, companies and organizations share a single form component and save action.

export const SITE_STATUSES = ["development", "construction", "commissioning", "production", "active", "delayed", "inactive", "canceled"] as const;
export const MFG_TYPES = ["Discrete", "Process"] as const;
export const SITE_TYPES = ["Demo", "Pilot", "Full Size"] as const;
export const STRATEGIES = ["In-House", "Contract"] as const;
export const ORG_TYPES = ["federal_agency", "state_agency", "local_gov", "vc", "corporate", "bank", "utility", "nonprofit", "university", "other"] as const;
export const PARTY_ROLES = ["lead_investor", "investor", "grantor", "lender", "customer", "partner", "acquirer", "other"] as const;
export const ANNOUNCEMENT_TYPES = [
  "site_announced", "construction_start", "production_start", "production_at_rate",
  "status_change", "delay", "cancellation", "bankruptcy",
  "funding_round", "grant", "loan", "tax_credit", "incentive", "customer_award", "partnership", "acquisition", "other",
] as const;
export const MILESTONE_TYPES = new Set(["construction_start", "production_start", "production_at_rate"]);
export const AWARD_STATUSES = ["selected", "finalized", "disbursed", "rescinded"] as const;
export const FUNDING_STAGES = [
  "pre_seed", "seed", "series_a", "series_b", "series_c", "series_d", "series_e_plus",
  "growth", "bridge", "strategic", "venture_debt", "debt", "ipo", "spac", "undisclosed",
] as const;

export const label = (v: string) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "integer" | "select" | "textarea" | "checkbox" | "url";
  options?: readonly string[];
  /** Options come from data at render time (e.g. taxonomy). */
  dynamicOptions?: "industries" | "sub_industries" | "organizations";
  required?: boolean;
  wide?: boolean;
  help?: string;
};

export const ENTITIES = {
  sites: {
    table: "sites",
    fields: [
      { name: "name", label: "Site name", type: "text" },
      { name: "status", label: "Status", type: "select", options: SITE_STATUSES },
      { name: "address", label: "Address", type: "text", wide: true },
      { name: "city", label: "City", type: "text" },
      { name: "county", label: "County", type: "text" },
      { name: "state", label: "State / province", type: "text" },
      { name: "country", label: "Country", type: "select", options: ["United States", "Canada", "Mexico"] },
      { name: "lat", label: "Latitude", type: "number" },
      { name: "lng", label: "Longitude", type: "number" },
      { name: "mfg_type", label: "Manufacturing type", type: "select", options: MFG_TYPES },
      { name: "site_type", label: "Site type", type: "select", options: SITE_TYPES },
      { name: "first_of_kind", label: "First of a kind", type: "checkbox" },
      { name: "is_published", label: "Published on the map", type: "checkbox" },
      { name: "sqft", label: "Square feet", type: "number", help: "Initial phase" },
      { name: "cost_mm", label: "Investment ($M)", type: "number", help: "Initial phase" },
      { name: "full_time_jobs", label: "Full-time jobs", type: "integer", help: "Initial phase" },
      { name: "construction_jobs", label: "Construction jobs", type: "integer" },
      { name: "capacity_value", label: "Capacity", type: "number", help: "Initial phase" },
      { name: "capacity_unit", label: "Capacity unit", type: "text", help: "e.g. GWh/yr, tons/yr, MW" },
      { name: "land_acres", label: "Land (acres)", type: "number" },
      { name: "land_ownership", label: "Land ownership", type: "text" },
      { name: "envelope_ownership", label: "Building ownership", type: "text" },
      { name: "notes", label: "Notes", type: "textarea", wide: true },
    ],
  },
  companies: {
    table: "companies",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "website", label: "Website", type: "url" },
      { name: "founded_year", label: "Founded", type: "integer" },
      { name: "industry", label: "Industry", type: "select", dynamicOptions: "industries" },
      { name: "sub_industry", label: "Sub-industry", type: "select", dynamicOptions: "sub_industries" },
      { name: "manufacturing_strategy", label: "Manufacturing strategy", type: "select", options: STRATEGIES },
      { name: "hq_city", label: "HQ city", type: "text" },
      { name: "hq_state", label: "HQ state / province", type: "text" },
      { name: "hq_country", label: "HQ country", type: "text" },
      { name: "is_public", label: "Publicly traded", type: "checkbox" },
      { name: "ticker", label: "Ticker", type: "text" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "notes", label: "Notes", type: "textarea", wide: true },
    ],
  },
  organizations: {
    table: "organizations",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "org_type", label: "Type", type: "select", options: ORG_TYPES, required: true },
      { name: "parent_id", label: "Parent organization", type: "select", dynamicOptions: "organizations" },
      { name: "jurisdiction_state", label: "Jurisdiction (state / province)", type: "text" },
      { name: "jurisdiction_country", label: "Jurisdiction (country)", type: "text" },
      { name: "website", label: "Website", type: "url" },
      { name: "notes", label: "Notes", type: "textarea", wide: true },
    ],
  },
} as const satisfies Record<string, { table: string; fields: readonly Field[] }>;

export type EntityKey = keyof typeof ENTITIES;

/** FormData → column values per the field config. Empty strings become null. */
export function parseRecord(entity: EntityKey, form: FormData): { values: Record<string, unknown>; errors: string[] } {
  const values: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const f of ENTITIES[entity].fields as readonly Field[]) {
    if (f.type === "checkbox") {
      values[f.name] = form.get(f.name) === "on";
      continue;
    }
    const raw = String(form.get(f.name) ?? "").trim();
    if (!raw) {
      if (f.required) errors.push(`${f.label} is required.`);
      values[f.name] = null;
      continue;
    }
    if (f.type === "number" || f.type === "integer") {
      const n = Number(raw.replace(/[$,]/g, ""));
      if (!Number.isFinite(n) || (f.type === "integer" && !Number.isInteger(n))) errors.push(`${f.label} must be a ${f.type === "integer" ? "whole number" : "number"}.`);
      values[f.name] = n;
    } else if (f.type === "select" && f.options && !f.options.includes(raw)) {
      errors.push(`${f.label} has an invalid value.`);
    } else if (f.type === "url" && !/^https?:\/\//i.test(raw)) {
      errors.push(`${f.label} must start with http:// or https://.`);
    } else {
      values[f.name] = raw;
    }
  }
  return { values, errors };
}

import { describe, expect, it } from "vitest";
import { parseRecord } from "./schema";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("parseRecord", () => {
  it("parses numbers, checkboxes and blanks", () => {
    const { values, errors } = parseRecord("sites", form({ sqft: "52,000", cost_mm: "$13", full_time_jobs: "30", is_published: "on", city: " Exeter ", notes: "" }));
    expect(errors).toEqual([]);
    expect(values).toMatchObject({ sqft: 52000, cost_mm: 13, full_time_jobs: 30, is_published: true, first_of_kind: false, city: "Exeter", notes: null });
  });
  it("rejects bad values", () => {
    expect(parseRecord("sites", form({ full_time_jobs: "12.5" })).errors).toEqual(["Full-time jobs must be a whole number."]);
    expect(parseRecord("sites", form({ status: "booming" })).errors).toEqual(["Status has an invalid value."]);
    expect(parseRecord("companies", form({ name: "", slug: "x" })).errors).toEqual(["Name is required."]);
    expect(parseRecord("companies", form({ name: "A", slug: "a", website: "acme.com" })).errors).toEqual(["Website must start with http:// or https://."]);
  });
});

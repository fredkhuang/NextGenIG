import { describe, expect, it } from "vitest";
import { mergeRows } from "./merge";
import { transformRow } from "./transform";

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

describe("mergeRows", () => {
  const keep = transformRow({
    A: "Twelve", AI: 120, B: "Construction", C: "13583 Wheeler Road NE", D: "Moses Lake", E: "WA", M: 13,
    P: { text: "a", hyperlink: "https://commerce.wa.gov/news/twelve" }, Q: d(2023, 6, 19), S: d(2025, 7, 1),
    U: d(2023, 7, 11), AB: "Deploy-Demo", AH: d(2025, 4, 22),
  })!;
  const dup = transformRow({
    A: "Twelve", AI: 210, B: "Production", C: "13583 Wheeler Road E", D: "Moses Lake", E: "WA", J: 20,
    P: { text: "b", hyperlink: "https://commerce.wa.gov/twelve" }, Q: d(2023, 6, 19), S: d(2024, 7, 1),
    T: { text: "c", hyperlink: "https://businesswire.com/twelve-construction" }, U: d(2023, 7, 11),
    Z: "Process FOAK", AH: d(2026, 6, 30),
  })!;
  const m = mergeRows(keep, dup, { city: "Moses Lake" });

  it("keeps the primary UID and lets the newer row win conflicts", () => {
    expect(m.site).toMatchObject({
      legacy_uid: 120, status: "production", address: "13583 Wheeler Road E", full_time_jobs: 20,
      land_acres: 13, site_type: "Full Size", first_of_kind: true,
    });
  });

  it("collapses same-event announcements and keeps the other URL as a source", () => {
    const announced = m.announcements.filter((a) => a.type === "site_announced");
    expect(announced).toHaveLength(1);
    expect(announced[0]).toMatchObject({ canonical_url: "https://commerce.wa.gov/twelve", extra_sources: ["https://commerce.wa.gov/news/twelve"] });
    const planned = m.announcements.filter((a) => a.type === "production_start" && a.milestone_status === "planned");
    expect(planned).toHaveLength(1);
    expect(planned[0].milestone_date).toBe("2024-07-01");
    const constr = m.announcements.filter((a) => a.type === "construction_start");
    expect(constr).toHaveLength(1);
    expect(constr[0].canonical_url).toBe("https://businesswire.com/twelve-construction");
  });
});

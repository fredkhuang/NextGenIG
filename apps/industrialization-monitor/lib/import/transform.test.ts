import { describe, expect, it } from "vitest";
import { canonicalUrl, normalizeName } from "@/lib/dedupe";
import {
  classifyComment, parseDateCell, parseFirstOfKind, parseFuzzyDate, parseHq, parseNumber,
  parseStatus, parseTypes, transformRow,
} from "./transform";

describe("dedupe normalizers", () => {
  it("collapses legal suffixes and punctuation", () => {
    expect(normalizeName("Acme, Inc.")).toBe(normalizeName("ACME Inc"));
    expect(normalizeName("ACME Technologies LLC")).toBe("acme");
    expect(normalizeName("Metals & Refining Co.")).toBe("metals and refining");
  });
  it("canonicalizes URLs", () => {
    expect(canonicalUrl("http://www.example.com/a/?utm_source=x&b=2#:~:text=hi")).toBe("https://example.com/a?b=2");
    expect(canonicalUrl("https://example.com/a/")).toBe(canonicalUrl("https://example.com/a?utm_medium=email"));
    expect(canonicalUrl("not a url")).toBeNull();
  });
});

describe("parseNumber", () => {
  it("handles numbers, no-info text and trailing text", () => {
    expect(parseNumber(250).value).toBe(250);
    expect(parseNumber("No Information").value).toBeNull();
    expect(parseNumber("TBD").issue).toBeUndefined();
    expect(parseNumber({ formula: "190*2", result: 380 }).value).toBe(380);
    expect(parseNumber("22 (43 per pitchbook)")).toEqual({ value: 22, issue: "kept 22, dropped text" });
    expect(parseNumber("$1,200")).toEqual({ value: 1200 });
    expect(parseNumber("occupies a portion of a 70-acre park").value).toBeNull();
  });
});

describe("dates", () => {
  it("keeps real dates as-is", () => {
    expect(parseDateCell(new Date(Date.UTC(2024, 4, 1))).value).toBe("2024-05-01");
    expect(parseDateCell(new Date(Date.UTC(2025, 5, 14))).value).toBe("2025-06-14");
  });
  it("converts Excel serials", () => {
    expect(parseDateCell(45413).value).toBe("2024-05-01");
  });
  it("maps vague timing to the closest calendar day", () => {
    expect(parseFuzzyDate("end of 2025")).toBe("2025-12-31");
    expect(parseFuzzyDate("by the end of 2025")).toBe("2025-12-31");
    expect(parseFuzzyDate("Late 2024")).toBe("2024-12-31");
    expect(parseFuzzyDate("mid-2026")).toBe("2026-07-01");
    expect(parseFuzzyDate("early 2026")).toBe("2026-01-01");
    expect(parseFuzzyDate("2026")).toBe("2026-01-01");
    expect(parseFuzzyDate("Q1 2027")).toBe("2027-01-01");
    expect(parseFuzzyDate("2024 Q3?")).toBe("2024-07-01");
    expect(parseFuzzyDate("end of Q3 2026")).toBe("2026-09-30");
    expect(parseFuzzyDate("by end of February 2028")).toBe("2028-02-29");
    expect(parseFuzzyDate("second half of 2026")).toBe("2026-07-01");
    expect(parseFuzzyDate("summer 2025")).toBe("2025-07-01");
    expect(parseFuzzyDate("fall 2025")).toBe("2025-10-01");
  });
  it("parses exact days in free text", () => {
    expect(parseFuzzyDate("Mar/Apr 2024 (building permit approved Mar 1 2024)")).toBe("2024-03-01");
    expect(parseFuzzyDate("Reannounced in Dec 12 2025")).toBe("2025-12-12");
    expect(parseFuzzyDate("Bankrupt as of June 2024")).toBe("2024-06-01");
    expect(parseFuzzyDate("JV MOU announced 4/26/2022")).toBe("2022-04-26");
    expect(parseFuzzyDate("Unknown")).toBeNull();
    expect(parseDateCell("Unknown").value).toBeNull();
  });
});

describe("classification", () => {
  it("maps statuses", () => {
    expect(parseStatus("Canceled Project")).toEqual({ status: "canceled", contract: false });
    expect(parseStatus("CM/No Mfg")).toEqual({ status: "inactive", contract: true });
  });
  it("splits New Type and Type", () => {
    expect(parseTypes("Process FOAK", "Factory")).toEqual({ mfg_type: "Process", site_type: "Full Size", foak: true, contract: false });
    expect(parseTypes("Discrete Pilot", "Deploy-Demo")).toMatchObject({ mfg_type: "Discrete", site_type: "Demo" });
    expect(parseTypes(null, "CM")).toMatchObject({ mfg_type: null, site_type: null, contract: true });
  });
  it("normalizes first of kind", () => {
    expect(parseFirstOfKind("Yes").value).toBe(true);
    expect(parseFirstOfKind("no").value).toBe(false);
    expect(parseFirstOfKind("R&D Facility")).toEqual({ value: null, note: "R&D Facility" });
  });
  it("parses HQ", () => {
    expect(parseHq("Mountain View, CA")).toEqual({ hq_city: "Mountain View", hq_state: "CA", hq_country: "United States" });
    expect(parseHq("Tel Aviv, Israel")).toEqual({ hq_city: "Tel Aviv", hq_state: null, hq_country: "Israel" });
  });
  it("classifies comments", () => {
    expect(classifyComment("Declared bankruptcy in April 2026")).toBe("bankruptcy");
    expect(classifyComment("Company in default as of May 2024")).toBe("bankruptcy");
    expect(classifyComment("Canceled as of Apr 2024")).toBe("cancellation");
    expect(classifyComment("Paused in Sep 2023 https://x.com")).toBe("delay");
    expect(classifyComment("No announced site yet as of Feb 2024")).toBe("status_change");
  });
});

describe("transformRow", () => {
  const row = {
    A: "280.earth", B: "Production", C: "4375 River Trail Way", D: "The Dalles", E: "OR",
    F: "United States", G: 45.63, H: -121.2, I: 15, K: 20, L: 80000, M: 2.8,
    Q: new Date(Date.UTC(2023, 11, 15)), S: new Date(Date.UTC(2024, 4, 1)),
    U: new Date(Date.UTC(2023, 11, 15)), W: new Date(Date.UTC(2024, 4, 20)),
    Z: "Process Pilot", AA: "yes", AB: "Deploy-Demo", AC: "DOE DAC hub grant",
    AD: "Mountain View, CA", AE: "Carbon Capture", AF: "Carbon Capture", AI: 2,
    P: { text: "link", hyperlink: "https://example.com/news?utm_source=x" },
  };

  it("splits a row into company, site and announcements", () => {
    const r = transformRow(row, [{ ref: "B3", text: "Paused in Sep 2023" }])!;
    expect(r.company).toMatchObject({ name: "280.earth", industry: "Carbon Capture", hq_state: "CA", manufacturing_strategy: "In-House" });
    expect(r.site).toMatchObject({ legacy_uid: 2, mfg_type: "Process", site_type: "Demo", first_of_kind: true, status: "production" });
    const keys = r.announcements.map((a) => a.import_key);
    expect(keys).toEqual([
      "uid:2:site_announced",
      "uid:2:construction_start:actual",
      "uid:2:production_start:planned",
      "uid:2:production_start:actual",
      "uid:2:funding_stack",
      "uid:2:comment:B3:0",
    ]);
    const planned = r.announcements.find((a) => a.import_key === "uid:2:production_start:planned")!;
    expect(planned).toMatchObject({ announced_on: "2023-12-15", milestone_date: "2024-05-01", canonical_url: "https://example.com/news" });
    expect(r.announcements.at(-1)).toMatchObject({ type: "delay", announced_on: "2023-09-01" });
  });

  it("skips empty funding templates and rows without a name", () => {
    expect(transformRow({ ...row, AC: "Federal:\nState:\nLocal:" })!.announcements.some((a) => a.type === "other")).toBe(false);
    expect(transformRow({ ...row, A: null })).toBeNull();
  });
});

describe("legacy quirks", () => {
  it("parses signed and comma-prefixed coordinates", () => {
    expect(parseNumber(", -118.22408235874076").value).toBe(-118.22408235874076);
    expect(parseNumber("-99.3").value).toBe(-99.3);
  });
  it("ignores 'no news' notes in date columns", () => {
    expect(parseDateCell("No news since 2022").value).toBeNull();
    expect(parseDateCell("2025 - no news since JV announced").value).toBe("2025-01-01");
  });
  it("treats sqft = 1 as unknown and TBD locations as empty", () => {
    const r = transformRow({ A: "X", AI: 9, L: 1, D: "TBD", E: "TBD" })!;
    expect(r.site).toMatchObject({ sqft: null, city: null, state: null });
    expect(r.issues).toEqual([]);
  });
});

describe("swapped columns and merges", () => {
  it("corrects a date/URL swap between the actual-date and announcement columns", () => {
    const r = transformRow({
      A: "Twelve", AI: 210, V: new Date(Date.UTC(2026, 5, 10)), W: { text: "x", hyperlink: "https://twelve.co/post/opens" },
    })!;
    const prod = r.announcements.find((a) => a.import_key === "uid:210:production_start:actual")!;
    expect(prod).toMatchObject({ milestone_date: "2026-06-10", canonical_url: "https://twelve.co/post/opens" });
  });
});

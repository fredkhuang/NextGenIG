// Geocoding: US Census geocoder for street addresses, Nominatim (OpenStreetMap) for city/state.
// Results are cached on disk so re-runs don't hit the services again.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type GeocodeResult = { lat: number; lng: number; source: "census" | "nominatim"; precision: "address" | "city" };

const USER_AGENT = "NGIG-Industrialization-Monitor/0.1 (+https://www.nextgenindustry.com)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function census(address: string): Promise<GeocodeResult | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const json = await res.json();
  const m = json?.result?.addressMatches?.[0]?.coordinates;
  return m ? { lat: m.y, lng: m.x, source: "census", precision: "address" } : null;
}

let lastNominatim = 0;
async function nominatim(city: string, state: string | null, country: string | null): Promise<GeocodeResult | null> {
  const wait = 1100 - (Date.now() - lastNominatim); // usage policy: max 1 request/second
  if (wait > 0) await sleep(wait);
  lastNominatim = Date.now();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("city", city);
  if (state) url.searchParams.set("state", state);
  url.searchParams.set("country", country ?? "United States");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const [hit] = await res.json();
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), source: "nominatim", precision: "city" } : null;
}

export class Geocoder {
  private cache: Record<string, GeocodeResult | null> = {};
  constructor(private cachePath: string) {}

  async load() {
    try {
      this.cache = JSON.parse(await readFile(this.cachePath, "utf8"));
    } catch {
      this.cache = {};
    }
  }

  async save() {
    await mkdir(dirname(this.cachePath), { recursive: true });
    await writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
  }

  async geocode(q: { address: string | null; city: string | null; state: string | null; country: string | null }) {
    const key = [q.address, q.city, q.state, q.country].map((s) => (s ?? "").trim().toLowerCase()).join("|");
    if (key in this.cache) return this.cache[key];
    const result = await geocodeSite(q);
    this.cache[key] = result;
    return result;
  }
}

/** One uncached lookup: Census for US street addresses, then Nominatim by city. */
export async function geocodeSite(q: { address: string | null; city: string | null; state: string | null; country: string | null }) {
  let result: GeocodeResult | null = null;
  const us = !q.country || /^(us|usa|united states)/i.test(q.country);
  if (q.address && us) result = await census([q.address, q.city, q.state].filter(Boolean).join(", "));
  if (!result && q.city) result = await nominatim(q.city, q.state, q.country);
  return result;
}

"use client";

import * as maplibregl from "maplibre-gl";
import type { ExpressionSpecification, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ColorGroup, MapSite, Milestone } from "@/lib/public-data";

const STYLES = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };
const GROUP_VAR: Record<ColorGroup, string> = {
  "Advanced Manufacturing": "--viz-cat-1",
  Energy: "--viz-cat-2",
  Batteries: "--viz-cat-3",
  "Other industries": "--viz-cat-4",
};
const STATUS_LABEL: Record<string, string> = {
  development: "Development", construction: "Construction", commissioning: "Commissioning", production: "Production",
  active: "Active", delayed: "Delayed", inactive: "Inactive", canceled: "Canceled",
};
const NORTH_AMERICA: [[number, number], [number, number]] = [[-127, 22], [-64, 52]];

type Filters = { industries: Set<string> | null; status: string; mfg: string; siteType: string; strategy: string };
const ALL = "";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fmtNum = (n: number | null) => (n == null ? null : n.toLocaleString("en-US"));
const fmtMilestone = (m: Milestone) =>
  m ? `${new Date(`${m.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}${m.status === "planned" ? " (planned)" : ""}` : null;
const place = (s: MapSite) => [s.city, s.state, s.country && s.country !== "United States" ? s.country : null].filter(Boolean).join(", ");

function readTokens() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    groups: Object.fromEntries(Object.entries(GROUP_VAR).map(([g, name]) => [g, v(name)])) as Record<ColorGroup, string>,
    surface: v("--color-bg") || "#ffffff",
  };
}

function prefersDark() {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function popupHtml(s: MapSite, embed: boolean) {
  const target = embed ? ' target="_blank" rel="noopener"' : "";
  const rows = [
    ["Status", s.status ? STATUS_LABEL[s.status] ?? s.status : null],
    ["Type", [s.mfg_type, s.site_type].filter(Boolean).join(" · ") || null],
    ["Strategy", s.strategy],
    ["Facility", s.sqft ? `${fmtNum(s.sqft)} sq ft` : null],
    ["Investment", s.cost_mm ? `$${fmtNum(s.cost_mm)}M` : null],
    ["Jobs", fmtNum(s.full_time_jobs)],
    ["Capacity", s.capacity],
    ["Construction", fmtMilestone(s.construction_start)],
    ["Production", fmtMilestone(s.production_start)],
    ["HQ", s.hq],
  ].filter(([, v]) => v);
  return `<div class="ngig-popup">
    <p class="ngig-popup-title">${esc(s.company)}${s.first_of_kind ? ' <span class="ngig-foak">First of a kind</span>' : ""}</p>
    <p class="ngig-popup-sub">${esc(place(s))} · ${esc(s.industry)}${s.sub_industry && s.sub_industry !== s.industry ? ` / ${esc(s.sub_industry)}` : ""}</p>
    <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    <p class="ngig-popup-links">${s.source_url ? `<a href="${esc(s.source_url)}" target="_blank" rel="noopener">Announcement</a> · ` : ""}<a href="/submit?site=${esc(s.id)}"${target}>Suggest a correction</a></p>
  </div>`;
}

export function MonitorMap({ sites, embed = false }: { sites: MapSite[]; embed?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [filters, setFilters] = useState<Filters>({ industries: null, status: ALL, mfg: ALL, siteType: ALL, strategy: ALL });
  const [colors, setColors] = useState<Record<ColorGroup, string> | null>(null);

  const industries = useMemo(() => {
    const counts = new Map<string, { count: number; group: ColorGroup }>();
    for (const s of sites) {
      const c = counts.get(s.industry ?? "Other") ?? { count: 0, group: s.color_group };
      c.count++;
      counts.set(s.industry ?? "Other", c);
    }
    return [...counts].sort((a, b) => b[1].count - a[1].count);
  }, [sites]);

  const visible = useMemo(() => sites.filter((s) =>
    (!filters.industries || filters.industries.has(s.industry ?? "Other")) &&
    (!filters.status || s.status === filters.status) &&
    (!filters.mfg || s.mfg_type === filters.mfg) &&
    (!filters.siteType || s.site_type === filters.siteType) &&
    (!filters.strategy || s.strategy === filters.strategy)), [sites, filters]);

  const geojson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: visible.map((s) => ({
      type: "Feature" as const,
      id: s.id,
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
      properties: { id: s.id, company: s.company, place: place(s), color_group: s.color_group, sqft: s.sqft },
    })),
  }), [visible]);
  // Map event handlers are bound once; they read current props/data through this ref.
  const latest = useRef({ geojson, sites, embed });
  useEffect(() => {
    latest.current = { geojson, sites, embed };
  }, [geojson, sites, embed]);

  // Create the map once; rebuild layers whenever the basemap style (light/dark) changes.
  useEffect(() => {
    if (!container.current) return;
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs"); // copied into public/ by scripts/copy-map-worker.mjs
    const map = new maplibregl.Map({
      container: container.current,
      style: prefersDark() ? STYLES.dark : STYLES.light,
      bounds: NORTH_AMERICA,
      fitBoundsOptions: { padding: 16 },
      attributionControl: { compact: true },
      cooperativeGestures: embed,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => console.warn("[map]", e.error?.message ?? e));

    const hover = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "ngig-tooltip" });

    const addLayers = () => {
      const t = readTokens();
      setColors(t.groups);
      if (map.getSource("sites")) return;
      // Quieter basemap at continental scale (as on the Flourish map): labels appear from zoom 5,
      // state/province borders from zoom 2 instead of 8.
      for (const layer of map.getStyle().layers) {
        if (layer.type === "symbol") map.setLayerZoomRange(layer.id, 5, 24);
      }
      if (map.getLayer("boundary_3")) map.setLayerZoomRange("boundary_3", 2, 24);
      map.addSource("sites", { type: "geojson", data: latest.current.geojson });
      const color: ExpressionSpecification = ["match", ["get", "color_group"],
        "Advanced Manufacturing", t.groups["Advanced Manufacturing"],
        "Energy", t.groups.Energy,
        "Batteries", t.groups.Batteries,
        t.groups["Other industries"]];
      // Bubble area tracks facility size; unknown size is a small fixed dot. Zoom must be the
      // top-level interpolation input, so the size expression is scaled at each zoom stop.
      const size = (k: number): ExpressionSpecification => ["*", k,
        ["case", ["==", ["get", "sqft"], null], 4, ["interpolate", ["linear"], ["sqrt", ["get", "sqft"]], 0, 5, 2000, 26]]];
      const radius: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 3, size(0.85), 8, size(1.6)];
      map.addLayer({
        id: "sites",
        type: "circle",
        source: "sites",
        paint: {
          "circle-color": color,
          "circle-radius": radius,
          "circle-opacity": 0.85,
          "circle-stroke-color": t.surface,
          "circle-stroke-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 1.5],
        },
      });
    };
    map.on("style.load", addLayers);

    let hovered: string | number | undefined;
    map.on("mousemove", "sites", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      if (hovered !== undefined) map.setFeatureState({ source: "sites", id: hovered }, { hover: false });
      hovered = f.id;
      if (hovered !== undefined) map.setFeatureState({ source: "sites", id: hovered }, { hover: true });
      hover.setLngLat((f.geometry as { coordinates: [number, number] }).coordinates)
        .setHTML(`<strong>${esc(f.properties.company)}</strong><br>${esc(f.properties.place)}`).addTo(map);
    });
    map.on("mouseleave", "sites", () => {
      map.getCanvas().style.cursor = "";
      if (hovered !== undefined) map.setFeatureState({ source: "sites", id: hovered }, { hover: false });
      hovered = undefined;
      hover.remove();
    });
    map.on("click", "sites", (e) => {
      const id = e.features?.[0]?.properties.id;
      const site = latest.current.sites.find((s) => s.id === id);
      if (!site) return;
      hover.remove();
      new maplibregl.Popup({ offset: 12, maxWidth: "320px", className: "ngig-popup-wrap" })
        .setLngLat([site.lng, site.lat]).setHTML(popupHtml(site, latest.current.embed)).addTo(map);
    });

    // Follow the OS / page theme
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    let dark = prefersDark();
    const onTheme = () => {
      const next = prefersDark();
      if (next === dark) return;
      dark = next;
      map.setStyle(next ? STYLES.dark : STYLES.light);
    };
    media.addEventListener("change", onTheme);
    const observer = new MutationObserver(onTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      media.removeEventListener("change", onTheme);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [embed]);

  useEffect(() => {
    (mapRef.current?.getSource("sites") as GeoJSONSource | undefined)?.setData(geojson);
  }, [geojson]);

  const toggleIndustry = (name: string) =>
    setFilters((f) => {
      const only = f.industries?.size === 1 && f.industries.has(name);
      return { ...f, industries: only ? null : new Set([name]) };
    });
  const options = (key: "status" | "mfg_type" | "site_type" | "strategy") =>
    [...new Set(sites.map((s) => s[key]).filter((v): v is string => !!v))].sort();
  const anyFilter = filters.industries || filters.status || filters.mfg || filters.siteType || filters.strategy;

  return (
    <div className="ngig-monitor flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-2 border-b border-border bg-bg p-3 md:w-72 md:gap-4 md:overflow-y-auto md:border-r md:border-b-0 md:p-4">
        <div className="flex items-baseline gap-2 md:block">
          <p className="ngig-display order-2 text-2xl text-fg md:text-4xl">{visible.length.toLocaleString()}</p>
          <p className="order-1 text-sm text-muted">Sites tracked</p>
        </div>
        <section aria-label="Industries">
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-muted md:block">Industry · click to isolate</p>
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {industries.map(([name, { count, group }]) => {
              const active = !filters.industries || filters.industries.has(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => toggleIndustry(name)}
                    aria-pressed={filters.industries?.has(name) ?? false}
                    className={`flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-left text-xs hover:bg-bg-subtle md:w-full md:gap-2 md:rounded-md md:border-0 md:py-1.5 md:text-sm ${active ? "" : "opacity-40"}`}
                  >
                    <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: colors?.[group] ?? `var(${GROUP_VAR[group]})` }} />
                    <span className="md:flex-1">{name}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 hidden text-xs text-muted md:block">Bubble size shows facility square footage; small dots mean size not yet known.</p>
        </section>
      </aside>

      <section className="flex min-h-[70vh] flex-1 flex-col md:min-h-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg px-4 py-2">
          <Select label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={options("status").map((s) => [s, STATUS_LABEL[s] ?? s])} />
          <Select label="Manufacturing" value={filters.mfg} onChange={(v) => setFilters((f) => ({ ...f, mfg: v }))}
            options={options("mfg_type").map((s) => [s, s])} />
          <Select label="Site type" value={filters.siteType} onChange={(v) => setFilters((f) => ({ ...f, siteType: v }))}
            options={options("site_type").map((s) => [s, s])} />
          <Select label="Strategy" value={filters.strategy} onChange={(v) => setFilters((f) => ({ ...f, strategy: v }))}
            options={options("strategy").map((s) => [s, s])} />
          {anyFilter && (
            <button type="button" className="text-sm text-primary underline"
              onClick={() => setFilters({ industries: null, status: ALL, mfg: ALL, siteType: ALL, strategy: ALL })}>
              Clear filters
            </button>
          )}
        </div>
        <div className="relative min-h-0 flex-1">
          {/* MapLibre sets position: relative on its container, so size it from an absolute wrapper */}
          <div className="absolute inset-0">
            <div ref={container} className="h-full w-full" aria-label="Map of startup factory and pilot sites" role="region" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border-strong bg-bg px-2 py-1 text-sm">
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}


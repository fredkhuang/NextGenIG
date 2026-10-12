import type { Metadata } from "next";
import { MonitorMap } from "@/components/monitor-map";
import { getMapSites } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Startup Industrialization Monitor (embed) | NextGen Industry Group",
  robots: { index: false },
};

// Runs before first paint: the host site is light, so the embed is light unless ?theme=dark.
const THEME_SCRIPT = `document.documentElement.dataset.theme = new URLSearchParams(location.search).get("theme") === "dark" ? "dark" : "light";`;

// Map only, for the iframe on nextgenindustry.com.
export default async function EmbedPage() {
  const sites = await getMapSites();
  return (
    <main className="flex h-dvh flex-col">
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <MonitorMap sites={sites} embed />
    </main>
  );
}

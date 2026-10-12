/* eslint-disable @next/next/no-img-element -- brand SVGs are static assets */
import Link from "next/link";
import { MonitorMap } from "@/components/monitor-map";
import { getMapSites } from "@/lib/public-data";

export default async function Home() {
  const sites = await getMapSites();
  return (
    <main className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 py-3 sm:px-6">
        <a href="https://www.nextgenindustry.com" className="shrink-0">
          <img src="/horizontal-small-color.svg" alt="NextGen Industry" className="h-8 w-auto dark:hidden" />
          <img src="/horizontal-small-white.svg" alt="NextGen Industry" className="hidden h-8 w-auto dark:block" />
        </a>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl text-primary sm:text-2xl">Startup Industrialization Monitor</h1>
          <p className="text-sm text-muted">Startup factory and pilot sites under development across North America.</p>
        </div>
        <Link href="/submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary">
          Submit a site
        </Link>
      </header>
      <MonitorMap sites={sites} />
    </main>
  );
}

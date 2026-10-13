/* eslint-disable @next/next/no-img-element -- brand SVGs are static assets */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getMapSites } from "@/lib/public-data";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = { title: "Submit a site | Startup Industrialization Monitor" };

export default function SubmitPage({ searchParams }: PageProps<"/submit">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <Link href="/" className="self-start">
        <img src="/horizontal-small-color.svg" alt="NextGen Industry" className="h-8 w-auto dark:hidden" />
        <img src="/horizontal-small-white.svg" alt="NextGen Industry" className="hidden h-8 w-auto dark:block" />
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl text-primary">Help us track startup industrialization</h1>
        <p className="text-muted">
          Know of a startup factory, pilot or demo site we&apos;re missing, or something we got wrong? Send it with a link to a public source.
          Every submission is reviewed before it appears on the <Link href="/" className="text-primary underline">map</Link>.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading form…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/submit">["searchParams"] }) {
  const { site: siteId } = await searchParams;
  const sites = await getMapSites();
  const s = typeof siteId === "string" ? sites.find((x) => x.id === siteId) : undefined;
  const industries = [...new Set(sites.map((x) => x.industry).filter((i): i is string => !!i))].sort();
  const site = s ? { id: s.id, company: s.company, place: [s.city, s.state].filter(Boolean).join(", "), status: s.status } : null;
  return <SubmitForm site={site} industries={industries} />;
}

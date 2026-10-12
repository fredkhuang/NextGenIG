/* eslint-disable @next/next/no-img-element -- brand SVGs are static assets */
import Link from "next/link";
import { signOut } from "../actions";

const NAV = [
  ["/admin/queue", "Review queue"],
  ["/admin/companies", "Companies"],
  ["/admin/sites", "Sites"],
  ["/admin/organizations", "Organizations"],
  ["/admin/duplicates", "Duplicates"],
] as const;

// Static shell; each page checks admin access itself (lib/auth.ts) inside its Suspense boundary.
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
          <Link href="/admin/queue" className="flex items-center gap-3">
            <img src="/lettermark-color.svg" alt="" className="h-6 w-auto" />
            <span className="ngig-display text-lg text-primary">Monitor admin</span>
          </Link>
          <nav aria-label="Admin" className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map(([href, text]) => <Link key={href} href={href} className="hover:text-primary hover:underline">{text}</Link>)}
            <Link href="/" className="text-muted hover:underline">View map ↗</Link>
          </nav>
          <form action={signOut}>
            <button type="submit" className="text-sm text-muted hover:underline">Sign out</button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">{children}</div>
    </div>
  );
}

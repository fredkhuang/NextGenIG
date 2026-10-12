import Link from "next/link";
import type { ReactNode } from "react";
import { inputClass } from "./forms";

// Shared pieces for admin list pages (server components; filters are plain GET forms).

export const PAGE_SIZE = 50;

export function FilterBar({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg bg-bg-subtle p-3">
      {children}
      <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary">Filter</button>
      <Link href={action} className="py-1.5 text-sm text-muted underline">Reset</Link>
    </form>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function SearchInput({ value, placeholder }: { value: string; placeholder: string }) {
  return <input name="q" defaultValue={value} placeholder={placeholder} className={`${inputClass} min-w-56`} />;
}

export function Select({ name, value, options }: { name: string; value: string; options: [string, string][] }) {
  return (
    <select name={name} defaultValue={value} className={inputClass}>
      <option value="">All</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-bg-subtle text-left">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Pager({ page, total, href }: { page: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <nav aria-label="Pages" className="flex items-center justify-between text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="text-primary underline">← Previous</Link> : <span />}
      <span className="text-muted">{total.toLocaleString()} total · page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className="text-primary underline">Next →</Link> : <span />}
    </nav>
  );
}

export const dash = (v: unknown) => (v == null || v === "" ? "—" : typeof v === "number" ? v.toLocaleString() : String(v));

/** Builds list URLs that keep the current filters. */
export function hrefWith(base: string, params: Record<string, string | undefined>) {
  return (page: number) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: page > 1 ? String(page) : undefined }).filter(([, v]) => v) as [string, string][]);
    return q.size ? `${base}?${q}` : base;
  };
}

export const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-border pb-1 text-xl">{title}</h2>
      {children}
    </section>
  );
}

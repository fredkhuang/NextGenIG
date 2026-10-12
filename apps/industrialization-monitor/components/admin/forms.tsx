"use client";

import { type ReactNode, useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";
import { type Field, label } from "@/lib/admin/schema";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

export const inputClass = "w-full rounded-md border border-border-strong bg-bg px-2 py-1.5 text-sm";

export function Status({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-accent-fill" : "text-muted"}`}>
      {state.message}
    </p>
  );
}

export function SubmitButton({ pending, children, variant = "primary" }: { pending: boolean; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <button
      type="submit" disabled={pending}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${variant === "primary" ? "bg-primary text-on-primary" : "border border-primary text-primary"}`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

/** Small form around a server action, with inline status. */
export function ActionForm({ action, children, submit, variant, className = "flex flex-col gap-3" }: {
  action: Action; children?: ReactNode; submit: string; variant?: "primary" | "secondary"; className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending} variant={variant}>{submit}</SubmitButton>
        <Status state={state} />
      </div>
    </form>
  );
}

/** Edit form generated from a field config (lib/admin/schema.ts). */
export function RecordForm({ fields, values, options, action }: {
  fields: readonly Field[];
  values: Record<string, unknown>;
  options: Record<string, [string, string][]>;
  action: Action;
}) {
  return (
    <ActionForm action={action} submit="Save changes">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => <FieldInput key={f.name} field={f} value={values[f.name]} options={options} />)}
      </div>
    </ActionForm>
  );
}

function FieldInput({ field: f, value, options }: { field: Field; value: unknown; options: Record<string, [string, string][]> }) {
  const id = `f-${f.name}`;
  const wrap = (input: ReactNode) => (
    <div className={`flex flex-col gap-1 ${f.wide ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-sm font-semibold">{f.label}{f.required && " *"}</label>
      {input}
      {f.help && <span className="text-xs text-muted">{f.help}</span>}
    </div>
  );
  const v = value == null ? "" : String(value);
  switch (f.type) {
    case "checkbox":
      return (
        <label className={`flex items-center gap-2 self-end py-1.5 text-sm font-semibold ${f.wide ? "sm:col-span-2" : ""}`}>
          <input type="checkbox" name={f.name} defaultChecked={value === true} className="size-4 accent-[var(--color-primary)]" />
          {f.label}
        </label>
      );
    case "textarea":
      return wrap(<textarea id={id} name={f.name} defaultValue={v} rows={3} className={inputClass} />);
    case "select": {
      const opts: [string, string][] = f.dynamicOptions ? options[f.dynamicOptions] ?? [] : (f.options ?? []).map((o) => [o, label(o)]);
      return wrap(
        <select id={id} name={f.name} defaultValue={v} className={inputClass} required={f.required}>
          <option value="">—</option>
          {/* Keep an unexpected current value selectable so saving doesn't silently drop it */}
          {v && !opts.some(([o]) => o === v) && <option value={v}>{v}</option>}
          {opts.map(([o, l]) => <option key={o} value={o}>{l}</option>)}
        </select>,
      );
    }
    default:
      return wrap(
        <input id={id} name={f.name} defaultValue={v} required={f.required}
          type={f.type === "url" ? "url" : "text"} inputMode={f.type === "number" || f.type === "integer" ? "decimal" : undefined}
          className={inputClass} />,
      );
  }
}

"use client";

import { useActionState } from "react";
import { type LoginState, sendMagicLink } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-semibold">Email</label>
      <input
        id="email" name="email" type="email" required autoComplete="email"
        className="rounded-md border border-border-strong bg-bg px-3 py-2"
      />
      <button
        type="submit" disabled={pending}
        className="rounded-md bg-primary px-4 py-2 font-semibold text-on-primary disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      {state.message && (
        <p role="status" className={state.status === "error" ? "text-sm text-accent-fill" : "text-sm text-muted"}>
          {state.message}
        </p>
      )}
    </form>
  );
}

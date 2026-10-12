"use client";

import { useActionState } from "react";
import { type ReviewState, reviewProposal } from "./actions";

export function ReviewButtons({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(reviewProposal, { status: "idle" });
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        name="decision" value="approve" disabled={pending}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary disabled:opacity-60"
      >
        Approve
      </button>
      <button
        name="decision" value="reject" disabled={pending}
        className="rounded-md border border-primary px-3 py-1.5 text-sm font-semibold text-primary disabled:opacity-60"
      >
        Reject
      </button>
      {pending && <span className="text-sm text-muted">Saving…</span>}
      {state.status === "error" && <span role="alert" className="text-sm text-accent-fill">{state.message}</span>}
    </form>
  );
}

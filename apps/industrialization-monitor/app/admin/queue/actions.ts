"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { ApplyError, applyProposal } from "@/lib/queue/apply";
import type { QueuePayload } from "@/lib/queue/types";

export type ReviewState = { status: "idle" | "done" | "error"; message?: string };

export async function reviewProposal(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const { supabase, email } = await requireAdmin();
  const id = String(formData.get("id"));
  const decision = formData.get("decision") === "approve" ? "approved" : "rejected";

  const { data: proposal, error } = await supabase
    .from("proposed_changes").select("id, status, changes").eq("id", id).maybeSingle();
  if (error || !proposal) return { status: "error", message: "Proposal not found." };
  if (proposal.status !== "pending") return { status: "error", message: `Already ${proposal.status}.` };

  if (decision === "approved") {
    try {
      await applyProposal(supabase, proposal.changes as QueuePayload);
    } catch (e) {
      return { status: "error", message: e instanceof ApplyError ? e.message : "Could not apply this change." };
    }
  }
  const { error: updateError } = await supabase
    .from("proposed_changes")
    .update({ status: decision, reviewed_by: email, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return { status: "error", message: updateError.message };

  refresh();
  return { status: "done" };
}

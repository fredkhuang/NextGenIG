"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { status: "error", message: "Enter a valid email address." };

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/admin/queue`, shouldCreateUser: false },
  });
  // Unknown addresses fail with "signups not allowed"; answer the same way so the form doesn't
  // reveal who is on the allowlist. Only surface rate limiting.
  if (error?.status === 429) return { status: "error", message: "Too many requests. Wait a minute and try again." };
  return { status: "sent", message: `If ${email} is an admin, a sign-in link is on its way.` };
}

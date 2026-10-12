import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Data-access-layer guard for admin pages and actions: a verified Supabase user whose email is in
 * the `admins` table. Returns a client acting as that user, so RLS and the change log apply.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/admin/login?error=not-admin");
  return { supabase, email: user.email ?? user.id };
}

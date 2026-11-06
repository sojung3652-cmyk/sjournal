import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE, dayInTimezone } from "@/lib/dates";

/**
 * Per-request user context for Server Components / actions.
 * Redirects to /login when there is no verified session.
 * Must be called inside a <Suspense> boundary (reads cookies).
 */
export async function getUserContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, display_name")
    .eq("id", userId)
    .maybeSingle();

  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  return {
    supabase,
    userId,
    timezone,
    displayName: profile?.display_name ?? null,
    today: dayInTimezone(timezone),
  };
}

/** For server actions: returns null instead of redirecting. */
export async function getActionContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  return { supabase, userId, timezone, today: dayInTimezone(timezone) };
}

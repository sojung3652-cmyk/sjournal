"use server";

import { refresh } from "next/cache";
import { isLocale } from "@/i18n/config";
import { writeLocaleCookie } from "@/i18n/locale-cookie";
import { createClient } from "@/lib/supabase/server";

/** Language switch: cookie always; profiles.locale too when logged in (source of truth). */
export async function setLocale(locale: string): Promise<{ ok: boolean }> {
  if (!isLocale(locale)) return { ok: false };
  await writeLocaleCookie(locale);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (userId) await supabase.from("profiles").update({ locale }).eq("id", userId);
  refresh();
  return { ok: true };
}

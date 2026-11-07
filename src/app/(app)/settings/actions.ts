"use server";

import { refresh } from "next/cache";
import { isValidTimezone } from "@/lib/dates";
import { getActionContext } from "@/lib/user";

export type SettingsState = { error?: string; ok?: boolean };

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };

  const timezone = String(formData.get("timezone") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 40);
  if (!isValidTimezone(timezone)) return { error: "Choose a valid time zone." };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ timezone, display_name: displayName || null })
    .eq("id", ctx.userId);
  if (error) return { error: "Couldn't save." };

  refresh();
  return { ok: true };
}

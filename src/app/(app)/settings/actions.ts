"use server";

import { refresh } from "next/cache";
import { isValidTimezone } from "@/lib/dates";
import { getActionContext } from "@/lib/user";

export type SettingsState = { error?: string; ok?: boolean };

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };

  const timezone = String(formData.get("timezone") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 40);
  if (!isValidTimezone(timezone)) return { error: "올바른 시간대를 선택해 주세요." };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ timezone, display_name: displayName || null })
    .eq("id", ctx.userId);
  if (error) return { error: "저장하지 못했습니다." };

  refresh();
  return { ok: true };
}

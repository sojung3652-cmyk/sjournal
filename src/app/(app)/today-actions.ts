"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { ensureDailyLog } from "@/lib/data/day";
import { isValidDay } from "@/lib/dates";
import { getActionContext } from "@/lib/user";

export type ReflectionResult = { error?: string; ok?: boolean };

export async function saveReflection(_prev: ReflectionResult, formData: FormData): Promise<ReflectionResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: (await getTranslations())("errors.login") };
  const day = String(formData.get("day") ?? ctx.today);
  if (!isValidDay(day)) return { error: (await getTranslations())("errors.invalidDate") };
  const reflection = String(formData.get("reflection") ?? "").trim().slice(0, 2000);

  const logId = await ensureDailyLog(ctx.supabase, ctx.userId, day);
  if (!logId) return { error: (await getTranslations())("errors.save") };
  const { error } = await ctx.supabase.from("daily_logs").update({ reflection: reflection || null }).eq("id", logId);
  if (error) return { error: (await getTranslations())("errors.save") };

  refresh();
  return { ok: true };
}

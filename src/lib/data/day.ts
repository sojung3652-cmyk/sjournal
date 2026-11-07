import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addDays, dayRangeUtc } from "@/lib/dates";

type Client = SupabaseClient<Database>;

/** Returns the daily_logs row id for `day`, creating it if missing (unique per user+date). */
export async function ensureDailyLog(supabase: Client, userId: string, day: string): Promise<string | null> {
  await supabase
    .from("daily_logs")
    .upsert({ user_id: userId, log_date: day }, { onConflict: "user_id,log_date", ignoreDuplicates: true });
  const { data } = await supabase.from("daily_logs").select("id").eq("log_date", day).maybeSingle();
  return data?.id ?? null;
}

/**
 * Consecutive active days ending today. If today has no activity yet, the streak
 * counts back from yesterday (so it doesn't reset to 0 every morning).
 */
export async function getStreak(supabase: Client, today: string): Promise<{ days: number; activeToday: boolean }> {
  const { data } = await supabase.rpc("activity_days", { p_from: addDays(today, -400), p_to: today });
  const active = new Set((data ?? []).map((d) => d.day));
  const activeToday = active.has(today);
  let cursor = activeToday ? today : addDays(today, -1);
  let days = 0;
  while (active.has(cursor)) {
    days++;
    cursor = addDays(cursor, -1);
  }
  return { days, activeToday };
}

export type DayItem = { id: string; title: string; status: Database["public"]["Enums"]["study_status"]; category_id: string | null };
export type DayNote = {
  id: string;
  title: string | null;
  content: string;
  source_type: string;
  category_id: string | null;
  created_at: string;
  ai_summary: Database["public"]["Tables"]["notes"]["Row"]["ai_summary"];
  attachments: { id: string; mime_type: string }[];
};
export type DayLink = {
  id: string;
  url: string;
  title: string | null;
  site_name: string | null;
  image_url: string | null;
  favicon_url: string | null;
  ai_summary: unknown;
  category_id: string | null;
  created_at: string;
  fetch_status: string;
};
export type DayLog = Database["public"]["Tables"]["daily_logs"]["Row"];

/** Everything shown for one day (today screen and /day/[date]). RLS scopes all reads to the user. */
export async function getDayData(supabase: Client, day: string, tz: string) {
  const { start, end } = dayRangeUtc(day, tz);
  const itemCols = "id, title, status, category_id";
  const [categories, log, planned, completed, inProgress] = await Promise.all([
    supabase.from("categories").select("id, name, color").order("sort_order").order("created_at"),
    supabase.from("daily_logs").select("*").eq("log_date", day).maybeSingle(),
    supabase.from("study_items").select(itemCols).eq("planned_date", day).order("position"),
    supabase.from("study_items").select(itemCols).eq("status", "done").gte("completed_at", start).lt("completed_at", end).order("completed_at"),
    supabase.from("study_items").select(itemCols).eq("status", "in_progress").order("position"),
  ]);

  let notes: DayNote[] = [];
  let links: DayLink[] = [];
  if (log.data) {
    const { data: l } = await supabase
      .from("links")
      .select("id, url, title, site_name, image_url, favicon_url, ai_summary, category_id, created_at, fetch_status")
      .eq("daily_log_id", log.data.id)
      .order("created_at", { ascending: false });
    links = l ?? [];
    const { data } = await supabase
      .from("notes")
      .select("id, title, content, source_type, category_id, created_at, ai_summary, attachments(id, mime_type)")
      .eq("daily_log_id", log.data.id)
      .order("created_at", { ascending: false });
    notes = data ?? [];
  }

  return {
    categories: categories.data ?? [],
    log: log.data as DayLog | null,
    planned: (planned.data ?? []) as DayItem[],
    completed: (completed.data ?? []) as DayItem[],
    inProgress: (inProgress.data ?? []) as DayItem[],
    notes,
    links,
  };
}

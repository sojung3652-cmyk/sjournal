import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addDays, dayInTimezone, dayRangeUtc } from "@/lib/dates";

type Client = SupabaseClient<Database>;

export type RecordType = "all" | "note" | "item" | "link";
export type RangeKey = "week" | "month" | "all";

export const RANGE_LABEL: Record<RangeKey, string> = { week: "1 week", month: "1 month", all: "All time" };
export const TYPE_LABEL: Record<RecordType, string> = { all: "All", note: "Notes", item: "Study items", link: "Links" };

export function parseRange(v: unknown): RangeKey {
  return v === "week" || v === "month" ? v : "all";
}
export function parseType(v: unknown): RecordType {
  return v === "note" || v === "item" || v === "link" ? v : "all";
}

/** Inclusive local-day window for a range key; start = null means "from the beginning". */
export function rangeWindow(range: RangeKey, today: string): { start: string | null; end: string } {
  if (range === "week") return { start: addDays(today, -6), end: today };
  if (range === "month") return { start: addDays(today, -29), end: today };
  return { start: null, end: today };
}

export type CategoryRecord = {
  kind: "note" | "item" | "link";
  id: string;
  title: string;
  day: string; // local YYYY-MM-DD
  at: string; // ISO timestamp, for ordering
  tags: string[];
  // note
  content?: string;
  sourceType?: string;
  // item
  status?: Database["public"]["Enums"]["study_status"];
  // link
  url?: string;
  siteName?: string | null;
  imageUrl?: string | null;
  faviconUrl?: string | null;
  summary?: string[];
  fetchStatus?: string;
};

/**
 * All records in a category for a window. Notes use their daily log date; study items use
 * completed_at, else started_at, else created_at (in the user's timezone).
 */
export async function getCategoryRecords(
  supabase: Client,
  categoryId: string,
  window: { start: string | null; end: string },
  tz: string,
): Promise<CategoryRecord[]> {
  const startIso = window.start ? dayRangeUtc(window.start, tz).start : null;
  const endIso = dayRangeUtc(window.end, tz).end;

  let notesQ = supabase
    .from("notes")
    .select("id, title, content, source_type, created_at, daily_logs(log_date), note_tags(tags(name))")
    .eq("category_id", categoryId)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(500);
  if (startIso) notesQ = notesQ.gte("created_at", startIso);

  const itemsQ = supabase
    .from("study_items")
    .select("id, title, status, created_at, started_at, completed_at")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
    .limit(500);

  const [{ data: notes }, { data: items }, links] = await Promise.all([notesQ, itemsQ, getCategoryLinks(supabase, categoryId, startIso, endIso)]);

  const out: CategoryRecord[] = [];
  for (const n of notes ?? []) {
    out.push({
      kind: "note",
      id: n.id,
      title: n.title || n.content.slice(0, 60) || "Untitled",
      day: n.daily_logs?.log_date ?? dayInTimezone(tz, new Date(n.created_at)),
      at: n.created_at,
      tags: (n.note_tags ?? []).map((t) => t.tags?.name).filter((x): x is string => Boolean(x)),
      content: n.content,
      sourceType: n.source_type,
    });
  }
  for (const it of items ?? []) {
    const at = it.completed_at ?? it.started_at ?? it.created_at;
    if (startIso && at < startIso) continue;
    if (at >= endIso) continue;
    out.push({ kind: "item", id: it.id, title: it.title, day: dayInTimezone(tz, new Date(at)), at, tags: [], status: it.status });
  }
  out.push(...links.map((l) => ({ ...l, day: dayInTimezone(tz, new Date(l.at)) })));
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Links for a category. Filled in by the link archive feature; returns [] until then. */
async function getCategoryLinks(
  _supabase: Client,
  _categoryId: string,
  _startIso: string | null,
  _endIso: string,
): Promise<Omit<CategoryRecord, "day">[]> {
  return [];
}

export function categoryStats(records: CategoryRecord[]) {
  const days = new Set(records.map((r) => r.day));
  return {
    total: records.length,
    completed: records.filter((r) => r.kind === "item" && r.status === "done").length,
    lastDay: records.reduce<string | null>((m, r) => (!m || r.day > m ? r.day : m), null),
    activeDays: days.size,
  };
}

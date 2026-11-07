"use server";

import { refresh } from "next/cache";
import { clip, runStructured } from "@/lib/ai/run";
import { ensureDailyLog, getDayData } from "@/lib/data/day";
import { setNoteTags } from "@/lib/data/tags";
import { addDays, dayRangeUtc, isValidDay } from "@/lib/dates";
import { parseTags } from "@/lib/notes";
import { buildClassifyInput, classifyPrompt } from "@/lib/prompts/classify";
import { guidePrompt, guideSchema, type Guide } from "@/lib/prompts/guide";
import { journalPrompt, journalSchema, type Journal } from "@/lib/prompts/journal";
import { buildSummarizeInput, summarizePrompt, summarySchema, type NoteSummary } from "@/lib/prompts/summarize";
import { topPosition } from "@/lib/study";
import { getActionContext } from "@/lib/user";

type Fail = { ok: false; error: string };
const LOGIN: Fail = { ok: false, error: "Please log in." };
const NOTE_CHARS = 6000; // per-note budget in prompts
const DAY_CHARS = 16000; // total notes budget for a day

// --- 1. Auto classification -------------------------------------------------

export type ClassifySuggestion = { categoryId: string | null; categoryName: string | null; tags: string[] };

export async function classifyNote(noteId: string): Promise<{ ok: true; suggestion: ClassifySuggestion } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const [{ data: note }, { data: categories }] = await Promise.all([
    ctx.supabase.from("notes").select("title, content").eq("id", noteId).maybeSingle(),
    ctx.supabase.from("categories").select("id, name").order("sort_order"),
  ]);
  if (!note) return { ok: false, error: "Note not found." };
  if (!note.content.trim() && !note.title) return { ok: false, error: "There's nothing to classify." };

  const res = await runStructured(
    ctx,
    classifyPrompt,
    buildClassifyInput({ title: note.title, content: clip(note.content, NOTE_CHARS) }, (categories ?? []).map((c) => c.name)),
  );
  if (!res.ok) return res;
  const match = (categories ?? []).find((c) => c.name === res.data.category);
  return {
    ok: true,
    suggestion: { categoryId: match?.id ?? null, categoryName: match?.name ?? null, tags: parseTags(res.data.tags.join(",")).slice(0, 4) },
  };
}

/** User accepted (possibly edited) the suggestion: set category, add tags to existing ones. */
export async function applyClassification(noteId: string, categoryId: string | null, tagsRaw: string): Promise<{ ok: true } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  if (categoryId) {
    const { error } = await ctx.supabase.from("notes").update({ category_id: categoryId }).eq("id", noteId);
    if (error) return { ok: false, error: "Couldn't save the category." };
  }
  const { data: current } = await ctx.supabase.from("note_tags").select("tags(name)").eq("note_id", noteId);
  const existing = (current ?? []).map((r) => r.tags?.name).filter((n): n is string => Boolean(n));
  const err = await setNoteTags(ctx.supabase, noteId, parseTags([...existing, ...parseTags(tagsRaw)].join(",")));
  if (err) return { ok: false, error: err };
  refresh();
  return { ok: true };
}

// --- 2. Note summary ----------------------------------------------------------

export async function summarizeNote(noteId: string): Promise<{ ok: true; summary: NoteSummary } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const { data: note } = await ctx.supabase.from("notes").select("title, content").eq("id", noteId).maybeSingle();
  if (!note) return { ok: false, error: "Note not found." };
  if (note.content.trim().length < 20) return { ok: false, error: "This note is too short to summarize." };
  const res = await runStructured(ctx, summarizePrompt, buildSummarizeInput({ title: note.title, content: clip(note.content, NOTE_CHARS * 2) }));
  return res.ok ? { ok: true, summary: res.data } : res;
}

export async function saveSummary(noteId: string, summary: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const parsed = summarySchema.safeParse(summary);
  if (!parsed.success) return { ok: false, error: "The summary is incomplete. Fill in the empty fields." };
  const { error } = await ctx.supabase.from("notes").update({ ai_summary: parsed.data }).eq("id", noteId);
  if (error) return { ok: false, error: "Couldn't save." };
  refresh();
  return { ok: true };
}

// --- 3. Day-close journal -----------------------------------------------------

function notesDigest(notes: { title: string | null; content: string }[], budget: number): string {
  const out: string[] = [];
  let used = 0;
  for (const n of notes) {
    const body = clip(n.content.trim(), Math.min(NOTE_CHARS, Math.max(0, budget - used)));
    const entry = `- ${n.title ?? "(untitled)"}${body ? `\n  ${body.replace(/\n/g, "\n  ")}` : ""}`;
    used += entry.length;
    out.push(entry);
    if (used >= budget) break;
  }
  return out.join("\n") || "(none)";
}

export async function draftJournal(day: string): Promise<{ ok: true; journal: Journal } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  if (!isValidDay(day)) return { ok: false, error: "Invalid date." };
  const { log, completed, notes } = await getDayData(ctx.supabase, day, ctx.timezone);
  if (!completed.length && !notes.length && !log?.reflection) {
    return { ok: false, error: "Nothing recorded today yet. Add a note or complete an item first." };
  }
  const input = [
    `Date: ${day}`,
    `Completed items:\n${completed.map((c) => `- ${c.title}`).join("\n") || "(none)"}`,
    `Notes:\n${notesDigest(notes, DAY_CHARS)}`,
    `One-line reflection: ${log?.reflection ?? "(none)"}`,
  ].join("\n\n");
  const res = await runStructured(ctx, journalPrompt, input);
  return res.ok ? { ok: true, journal: res.data } : res;
}

export async function saveJournal(day: string, journal: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  if (!isValidDay(day)) return { ok: false, error: "Invalid date." };
  const parsed = journalSchema.safeParse(journal);
  if (!parsed.success) return { ok: false, error: "Write at least one line for 'What I learned' and 'Tomorrow'." };
  const logId = await ensureDailyLog(ctx.supabase, ctx.userId, day);
  const { error } = await ctx.supabase.from("daily_logs").update({ ai_journal: parsed.data }).eq("id", logId ?? "");
  if (error || !logId) return { ok: false, error: "Couldn't save." };
  refresh();
  return { ok: true };
}

// --- 4. Next-day guide --------------------------------------------------------

export async function draftGuide(day: string): Promise<{ ok: true; guide: Guide } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  if (!isValidDay(day)) return { ok: false, error: "Invalid date." };
  const from = addDays(day, -6);

  const [{ data: logs }, { data: open }, { data: done }, { data: categories }] = await Promise.all([
    ctx.supabase
      .from("daily_logs")
      .select("log_date, reflection, ai_journal, notes(title, content)")
      .gte("log_date", from)
      .lte("log_date", day)
      .order("log_date"),
    ctx.supabase.from("study_items").select("title, status, categories(name)").in("status", ["backlog", "today", "in_progress"]).order("position").limit(40),
    ctx.supabase.from("study_items").select("title, completed_at").eq("status", "done").gte("completed_at", dayRangeUtc(from, ctx.timezone).start).order("completed_at").limit(40),
    ctx.supabase.from("categories").select("name").order("sort_order"),
  ]);

  const perDay = Math.floor(DAY_CHARS / 7);
  const history = (logs ?? [])
    .map((l) => {
      const j = journalSchema.safeParse(l.ai_journal);
      return [
        `## ${l.log_date}`,
        l.reflection ? `Reflection: ${l.reflection}` : "",
        j.success && j.data.difficult.length ? `Difficult: ${j.data.difficult.join(" / ")}` : "",
        `Notes:\n${notesDigest(l.notes ?? [], perDay)}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
  if (!history && !(open ?? []).length) return { ok: false, error: "No recent records to build a guide from." };

  const label = { backlog: "Backlog", today: "Today", in_progress: "In progress" } as Record<string, string>;
  const input = [
    `Reference date: ${day} (suggest tasks for the next day)`,
    `Categories: ${(categories ?? []).map((c) => c.name).join(", ") || "(none)"}`,
    `In progress / planned items:\n${(open ?? []).map((o) => `- [${label[o.status]}] ${o.title}${o.categories?.name ? ` (${o.categories.name})` : ""}`).join("\n") || "(none)"}`,
    `Recently completed:\n${(done ?? []).map((d) => `- ${d.title}`).join("\n") || "(none)"}`,
    `Last 7 days:\n${history || "(none)"}`,
  ].join("\n\n");

  const res = await runStructured(ctx, guidePrompt, input);
  return res.ok ? { ok: true, guide: res.data } : res;
}

export async function saveGuide(day: string, guide: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  if (!isValidDay(day)) return { ok: false, error: "Invalid date." };
  const parsed = guideSchema.safeParse(guide);
  if (!parsed.success) return { ok: false, error: "Add at least one task for tomorrow." };
  const logId = await ensureDailyLog(ctx.supabase, ctx.userId, day);
  const { error } = await ctx.supabase.from("daily_logs").update({ ai_guide: parsed.data }).eq("id", logId ?? "");
  if (error || !logId) return { ok: false, error: "Couldn't save." };
  refresh();
  return { ok: true };
}

/** Morning flow (PRD scenario A): add a suggested task to today's list. */
export async function addGuideTask(title: string, categoryName: string | null): Promise<{ ok: true } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const clean = title.trim().slice(0, 200);
  if (!clean) return { ok: false, error: "The task is empty." };
  const { data: cat } = categoryName
    ? await ctx.supabase.from("categories").select("id").eq("name", categoryName).maybeSingle()
    : { data: null };
  const { error } = await ctx.supabase
    .from("study_items")
    .insert({ title: clean, status: "today", category_id: cat?.id ?? null, position: topPosition() });
  if (error) return { ok: false, error: "Couldn't add it." };
  refresh();
  return { ok: true };
}

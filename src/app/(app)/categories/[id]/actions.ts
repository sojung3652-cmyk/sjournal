"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { clip, runStructured } from "@/lib/ai/run";
import { getCategoryRecords, parseRange, rangeWindow, type CategoryRecord } from "@/lib/data/category";
import { categorySummaryPrompt, categorySummarySchema, type CategorySummary } from "@/lib/prompts/category-summary";
import { getActionContext } from "@/lib/user";

type Fail = { ok: false; error: string };
const fail = async (key: string): Promise<Fail> => ({ ok: false, error: (await getTranslations())(key as never) });
const BUDGET = 40_000; // characters of records sent to the model
const PER_NOTE = 3_000;

function recordLine(r: CategoryRecord): string {
  if (r.kind === "item") return `- [${r.day}] study item (${r.status}): ${r.title}`;
  if (r.kind === "link") {
    const summary = r.summary?.length ? ` — ${r.summary.join(" ")}` : "";
    return `- [${r.day}] link: ${r.title}${summary}`;
  }
  const tags = r.tags.length ? ` #${r.tags.join(" #")}` : "";
  const body = clip((r.content ?? "").trim(), PER_NOTE).replace(/\n/g, "\n  ");
  return `- [${r.day}] note: ${r.title}${tags}${body ? `\n  ${body}` : ""}`;
}

export async function draftCategorySummary(
  categoryId: string,
  rangeRaw: string,
): Promise<{ ok: true; summary: CategorySummary; omitted: number } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return fail("errors.login");
  const { data: category } = await ctx.supabase.from("categories").select("name").eq("id", categoryId).maybeSingle();
  if (!category) return fail("categories.errors.notFound");

  const range = parseRange(rangeRaw);
  const window = rangeWindow(range, ctx.today);
  const records = await getCategoryRecords(ctx.supabase, categoryId, window, ctx.timezone);
  if (!records.length) return fail("categorySummary.errors.noRecords");

  // Newest first until the budget is used, then present oldest first (the timeline reads forward).
  const picked: string[] = [];
  let used = 0;
  for (const r of records) {
    const line = recordLine(r);
    if (used + line.length > BUDGET && picked.length) break;
    picked.push(line);
    used += line.length;
  }
  const omitted = records.length - picked.length;
  const input = [
    `Subject: ${category.name}`,
    `Period: ${window.start ?? "beginning"} to ${window.end}`,
    omitted ? `Note: ${omitted} older records were omitted for length.` : "",
    `Records (oldest first):\n${picked.reverse().join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await runStructured(ctx, categorySummaryPrompt, input);
  return res.ok ? { ok: true, summary: res.data, omitted } : res;
}

export async function saveCategorySummary(categoryId: string, rangeRaw: string, content: unknown): Promise<{ ok: true } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return fail("errors.login");
  const parsed = categorySummarySchema.safeParse(content);
  if (!parsed.success) return fail("categorySummary.errors.incomplete");
  const window = rangeWindow(parseRange(rangeRaw), ctx.today);
  const { error } = await ctx.supabase.from("category_summaries").insert({
    category_id: categoryId,
    period_start: window.start,
    period_end: window.end,
    content: parsed.data,
  });
  if (error) return fail("errors.save");
  refresh();
  return { ok: true };
}

export async function deleteCategorySummary(id: string): Promise<{ ok: true } | Fail> {
  const ctx = await getActionContext();
  if (!ctx) return fail("errors.login");
  const { error } = await ctx.supabase.from("category_summaries").delete().eq("id", id);
  if (error) return fail("errors.delete");
  refresh();
  return { ok: true };
}

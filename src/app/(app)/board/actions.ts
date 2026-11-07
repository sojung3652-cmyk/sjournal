"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getActionContext } from "@/lib/user";
import { isStudyStatus, STUDY_TITLE_MAX, topPosition, type StudyStatus } from "@/lib/study";

export type ItemResult = { error?: string; ok?: boolean };

async function parseTitle(raw: unknown) {
  const t = await getTranslations("board.errors");
  const title = String(raw ?? "").trim();
  if (!title) return { error: t("emptyTitle") } as const;
  if (title.length > STUDY_TITLE_MAX) return { error: t("titleTooLong", { max: STUDY_TITLE_MAX }) } as const;
  return { title } as const;
}

const errs = () => getTranslations("errors");

const categoryOrNull = (raw: unknown) => {
  const v = String(raw ?? "");
  return v ? v : null;
};

export async function createItem(_prev: ItemResult, formData: FormData): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: (await errs())("login") };
  const parsed = await parseTitle(formData.get("title"));
  if ("error" in parsed) return { error: parsed.error };
  const status = String(formData.get("status") ?? "backlog");

  const { error } = await ctx.supabase.from("study_items").insert({
    title: parsed.title,
    category_id: categoryOrNull(formData.get("category_id")),
    status: isStudyStatus(status) ? status : "backlog",
    position: topPosition(),
  });
  if (error) return { error: (await errs())("add") };

  refresh();
  return { ok: true };
}

export async function updateItem(_prev: ItemResult, formData: FormData): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: (await errs())("login") };
  const parsed = await parseTitle(formData.get("title"));
  if ("error" in parsed) return { error: parsed.error };

  const { error, count } = await ctx.supabase
    .from("study_items")
    .update({ title: parsed.title, category_id: categoryOrNull(formData.get("category_id")) }, { count: "exact" })
    .eq("id", String(formData.get("id") ?? ""));
  if (error || !count) return { error: (await errs())("save") };

  refresh();
  return { ok: true };
}

/** Status change; timestamps (started_at / completed_at / planned_date) are set by a DB trigger. */
export async function moveItem(id: string, status: StudyStatus): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: (await errs())("login") };
  if (!isStudyStatus(status)) return { error: (await getTranslations("board.errors"))("badStatus") };

  const { error, count } = await ctx.supabase
    .from("study_items")
    .update({ status, position: topPosition() }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { error: (await getTranslations("board.errors"))("move") };

  refresh();
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: (await errs())("login") };
  const { error } = await ctx.supabase.from("study_items").delete().eq("id", id);
  if (error) return { error: (await errs())("delete") };
  refresh();
  return { ok: true };
}

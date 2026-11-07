"use server";

import { refresh } from "next/cache";
import { getActionContext } from "@/lib/user";
import { isStudyStatus, STUDY_TITLE_MAX, topPosition, type StudyStatus } from "@/lib/study";

export type ItemResult = { error?: string; ok?: boolean };

function parseTitle(raw: unknown) {
  const title = String(raw ?? "").trim();
  if (!title) return { error: "Enter a task." } as const;
  if (title.length > STUDY_TITLE_MAX) return { error: `Keep it under ${STUDY_TITLE_MAX} characters.` } as const;
  return { title } as const;
}

const categoryOrNull = (raw: unknown) => {
  const v = String(raw ?? "");
  return v ? v : null;
};

export async function createItem(_prev: ItemResult, formData: FormData): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  const parsed = parseTitle(formData.get("title"));
  if ("error" in parsed) return { error: parsed.error };
  const status = String(formData.get("status") ?? "backlog");

  const { error } = await ctx.supabase.from("study_items").insert({
    title: parsed.title,
    category_id: categoryOrNull(formData.get("category_id")),
    status: isStudyStatus(status) ? status : "backlog",
    position: topPosition(),
  });
  if (error) return { error: "Couldn't add it." };

  refresh();
  return { ok: true };
}

export async function updateItem(_prev: ItemResult, formData: FormData): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  const parsed = parseTitle(formData.get("title"));
  if ("error" in parsed) return { error: parsed.error };

  const { error, count } = await ctx.supabase
    .from("study_items")
    .update({ title: parsed.title, category_id: categoryOrNull(formData.get("category_id")) }, { count: "exact" })
    .eq("id", String(formData.get("id") ?? ""));
  if (error || !count) return { error: "Couldn't save." };

  refresh();
  return { ok: true };
}

/** Status change; timestamps (started_at / completed_at / planned_date) are set by a DB trigger. */
export async function moveItem(id: string, status: StudyStatus): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  if (!isStudyStatus(status)) return { error: "Invalid status." };

  const { error, count } = await ctx.supabase
    .from("study_items")
    .update({ status, position: topPosition() }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { error: "Couldn't change the status." };

  refresh();
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  const { error } = await ctx.supabase.from("study_items").delete().eq("id", id);
  if (error) return { error: "Couldn't delete." };
  refresh();
  return { ok: true };
}

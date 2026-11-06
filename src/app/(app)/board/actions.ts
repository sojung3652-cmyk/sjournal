"use server";

import { refresh } from "next/cache";
import { getActionContext } from "@/lib/user";
import { isStudyStatus, STUDY_TITLE_MAX, topPosition, type StudyStatus } from "@/lib/study";

export type ItemResult = { error?: string; ok?: boolean };

function parseTitle(raw: unknown) {
  const title = String(raw ?? "").trim();
  if (!title) return { error: "할 일을 입력해 주세요." } as const;
  if (title.length > STUDY_TITLE_MAX) return { error: `${STUDY_TITLE_MAX}자 이내로 입력해 주세요.` } as const;
  return { title } as const;
}

const categoryOrNull = (raw: unknown) => {
  const v = String(raw ?? "");
  return v ? v : null;
};

export async function createItem(_prev: ItemResult, formData: FormData): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  const parsed = parseTitle(formData.get("title"));
  if ("error" in parsed) return { error: parsed.error };
  const status = String(formData.get("status") ?? "backlog");

  const { error } = await ctx.supabase.from("study_items").insert({
    title: parsed.title,
    category_id: categoryOrNull(formData.get("category_id")),
    status: isStudyStatus(status) ? status : "backlog",
    position: topPosition(),
  });
  if (error) return { error: "추가하지 못했습니다." };

  refresh();
  return { ok: true };
}

export async function updateItem(_prev: ItemResult, formData: FormData): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  const parsed = parseTitle(formData.get("title"));
  if ("error" in parsed) return { error: parsed.error };

  const { error, count } = await ctx.supabase
    .from("study_items")
    .update({ title: parsed.title, category_id: categoryOrNull(formData.get("category_id")) }, { count: "exact" })
    .eq("id", String(formData.get("id") ?? ""));
  if (error || !count) return { error: "저장하지 못했습니다." };

  refresh();
  return { ok: true };
}

/** Status change; timestamps (started_at / completed_at / planned_date) are set by a DB trigger. */
export async function moveItem(id: string, status: StudyStatus): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  if (!isStudyStatus(status)) return { error: "잘못된 상태입니다." };

  const { error, count } = await ctx.supabase
    .from("study_items")
    .update({ status, position: topPosition() }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { error: "상태를 바꾸지 못했습니다." };

  refresh();
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ItemResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  const { error } = await ctx.supabase.from("study_items").delete().eq("id", id);
  if (error) return { error: "삭제하지 못했습니다." };
  refresh();
  return { ok: true };
}

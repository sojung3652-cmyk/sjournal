"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_NAME_MAX, isCategoryColor } from "@/lib/categories";

export type ActionResult = { error?: string; ok?: boolean };

const DUPLICATE = "23505";

function parse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  if (!name) return { error: "이름을 입력해 주세요." } as const;
  if (name.length > CATEGORY_NAME_MAX) return { error: `이름은 ${CATEGORY_NAME_MAX}자 이내로 입력해 주세요.` } as const;
  if (!isCategoryColor(color)) return { error: "색상을 선택해 주세요." } as const;
  return { name, color } as const;
}

function dbError(code: string | undefined): ActionResult {
  return { error: code === DUPLICATE ? "이미 있는 이름입니다." : "저장하지 못했습니다. 다시 시도해 주세요." };
}

export async function createCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const input = parse(formData);
  if ("error" in input) return { error: input.error };

  const supabase = await createClient();
  // New category goes to the end of the list.
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    name: input.name,
    color: input.color,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return dbError(error.code);

  refresh();
  return { ok: true };
}

export async function updateCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const input = parse(formData);
  if ("error" in input) return { error: input.error };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("categories")
    .update({ name: input.name, color: input.color }, { count: "exact" })
    .eq("id", id);
  if (error) return dbError(error.code);
  if (!count) return { error: "카테고리를 찾을 수 없습니다." };

  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // study_items / notes keep their rows; category_id becomes null (FK on delete set null).
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "삭제하지 못했습니다. 다시 시도해 주세요." };

  refresh();
  return { ok: true };
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_categories", { ids });
  if (error) return { error: "순서를 저장하지 못했습니다." };

  refresh();
  return { ok: true };
}

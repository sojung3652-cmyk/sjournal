"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_NAME_MAX, isCategoryColor } from "@/lib/categories";

export type ActionResult = { error?: string; ok?: boolean };

const DUPLICATE = "23505";

async function parse(formData: FormData) {
  const t = await getTranslations("categories.errors");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  if (!name) return { error: t("name") } as const;
  if (name.length > CATEGORY_NAME_MAX) return { error: t("nameTooLong", { max: CATEGORY_NAME_MAX }) } as const;
  if (!isCategoryColor(color)) return { error: t("color") } as const;
  return { name, color } as const;
}

async function dbError(code: string | undefined): Promise<ActionResult> {
  const t = await getTranslations();
  return { error: code === DUPLICATE ? t("categories.errors.duplicate") : t("errors.saveRetry") };
}

export async function createCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const input = await parse(formData);
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
  if (error) return await dbError(error.code);

  refresh();
  return { ok: true };
}

export async function updateCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const input = await parse(formData);
  if ("error" in input) return { error: input.error };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("categories")
    .update({ name: input.name, color: input.color }, { count: "exact" })
    .eq("id", id);
  if (error) return await dbError(error.code);
  if (!count) return { error: (await getTranslations("categories.errors"))("notFound") };

  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // study_items / notes keep their rows; category_id becomes null (FK on delete set null).
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: (await getTranslations("errors"))("deleteRetry") };

  refresh();
  return { ok: true };
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_categories", { ids });
  if (error) return { error: (await getTranslations("categories.errors"))("order") };

  refresh();
  return { ok: true };
}

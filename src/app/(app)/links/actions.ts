"use server";

import { refresh } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createLink } from "@/lib/links/create";
import { processLink } from "@/lib/links/process";
import { getActionContext } from "@/lib/user";

export type LinkResult = { ok?: boolean; error?: string; id?: string };
const login = async () => ({ error: (await getTranslations())("errors.login") });
const NOTE_MAX = 10_000;

export async function addLink(_prev: LinkResult, formData: FormData): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return login();
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: (await getTranslations())("links.errors.empty") };
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const res = await createLink(ctx, url, categoryId);
  if (!res.ok) return { error: res.error };
  refresh();
  return { ok: true, id: res.id };
}

export async function saveLinkNote(id: string, note: string): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return login();
  const clean = note.slice(0, NOTE_MAX);
  const { error } = await ctx.supabase.from("links").update({ note: clean.trim() ? clean : null }).eq("id", id);
  if (error) return { error: (await getTranslations())("links.errors.memo") };
  refresh();
  return { ok: true };
}

export async function setLinkCategory(id: string, categoryId: string | null): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return login();
  const { error } = await ctx.supabase.from("links").update({ category_id: categoryId }).eq("id", id);
  if (error) return { error: (await getTranslations())("links.errors.category") };
  refresh();
  return { ok: true };
}

/** Re-run metadata + summary (e.g. after a failed fetch). */
export async function refetchLink(id: string): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return login();
  const { error } = await ctx.supabase.from("links").update({ fetch_status: "pending" }).eq("id", id);
  if (error) return { error: (await getTranslations())("links.errors.refresh") };
  const locale = await getLocale();
  after(() => processLink(ctx, id, locale));
  refresh();
  return { ok: true };
}

export async function deleteLink(id: string): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return login();
  const { error } = await ctx.supabase.from("links").delete().eq("id", id);
  if (error) return { error: (await getTranslations())("errors.delete") };
  redirect("/links");
}

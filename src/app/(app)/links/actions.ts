"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createLink } from "@/lib/links/create";
import { processLink } from "@/lib/links/process";
import { getActionContext } from "@/lib/user";

export type LinkResult = { ok?: boolean; error?: string; id?: string };
const LOGIN = { error: "Please log in." };
const NOTE_MAX = 10_000;

export async function addLink(_prev: LinkResult, formData: FormData): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "Paste a link first." };
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const res = await createLink(ctx, url, categoryId);
  if (!res.ok) return { error: res.error };
  refresh();
  return { ok: true, id: res.id };
}

export async function saveLinkNote(id: string, note: string): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const clean = note.slice(0, NOTE_MAX);
  const { error } = await ctx.supabase.from("links").update({ note: clean.trim() ? clean : null }).eq("id", id);
  if (error) return { error: "Couldn't save the memo." };
  refresh();
  return { ok: true };
}

export async function setLinkCategory(id: string, categoryId: string | null): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const { error } = await ctx.supabase.from("links").update({ category_id: categoryId }).eq("id", id);
  if (error) return { error: "Couldn't change the category." };
  refresh();
  return { ok: true };
}

/** Re-run metadata + summary (e.g. after a failed fetch). */
export async function refetchLink(id: string): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const { error } = await ctx.supabase.from("links").update({ fetch_status: "pending" }).eq("id", id);
  if (error) return { error: "Couldn't refresh." };
  after(() => processLink(ctx, id));
  refresh();
  return { ok: true };
}

export async function deleteLink(id: string): Promise<LinkResult> {
  const ctx = await getActionContext();
  if (!ctx) return LOGIN;
  const { error } = await ctx.supabase.from("links").delete().eq("id", id);
  if (error) return { error: "Couldn't delete." };
  redirect("/links");
}

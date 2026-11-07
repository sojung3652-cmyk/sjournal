"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ensureDailyLog } from "@/lib/data/day";
import { setNoteTags } from "@/lib/data/tags";
import { createLink } from "@/lib/links/create";
import { getActionContext } from "@/lib/user";
import { NOTE_CONTENT_MAX, deriveTitle, isUrl, parseTags } from "@/lib/notes";

export type NoteResult = { error?: string; ok?: boolean; noteId?: string; linkId?: string };

/**
 * Quick add. A bare URL goes to the link archive (links table, previews + AI summary);
 * anything else becomes a note. Both attach to today's daily log.
 */
export async function quickAddText(_prev: NoteResult, formData: FormData): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Write something first." };
  if (text.length > NOTE_CONTENT_MAX) return { error: "That's too long." };

  if (isUrl(text)) {
    const res = await createLink(ctx, text);
    if (!res.ok) return { error: res.error };
    refresh();
    return { ok: true, linkId: res.id };
  }

  const dailyLogId = await ensureDailyLog(ctx.supabase, ctx.userId, ctx.today);
  const { data, error } = await ctx.supabase
    .from("notes")
    .insert({
      daily_log_id: dailyLogId,
      title: deriveTitle(text),
      content: text,
      source_type: "text",
    })
    .select("id")
    .single();
  if (error) return { error: "Couldn't save." };

  refresh();
  return { ok: true, noteId: data.id };
}

/**
 * File quick add, step 1: create the note row and return where to upload.
 * The browser then uploads straight to Storage (avoids the server action body
 * size limit) and calls attachFile().
 */
export async function createFileNote(fileName: string, mimeType: string): Promise<NoteResult & { path?: string }> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  const isPdf = mimeType === "application/pdf";
  if (!isPdf && !mimeType.startsWith("image/")) return { error: "Only images and PDFs can be uploaded." };

  const dailyLogId = await ensureDailyLog(ctx.supabase, ctx.userId, ctx.today);
  const { data, error } = await ctx.supabase
    .from("notes")
    .insert({
      daily_log_id: dailyLogId,
      title: fileName.slice(0, 200),
      content: "",
      source_type: isPdf ? "pdf" : "image",
    })
    .select("id")
    .single();
  if (error) return { error: "Couldn't save." };

  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
  return { ok: true, noteId: data.id, path: `${ctx.userId}/${data.id}/${Date.now()}-${safe}` };
}

/** File quick add, step 2: record the uploaded object. On upload failure, call discardNote(). */
export async function attachFile(noteId: string, path: string, mimeType: string): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  const { error } = await ctx.supabase.from("attachments").insert({ note_id: noteId, storage_path: path, mime_type: mimeType });
  if (error) return { error: "Couldn't save the attachment." };
  refresh();
  return { ok: true, noteId };
}

export async function discardNote(noteId: string): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  await ctx.supabase.from("notes").delete().eq("id", noteId);
  return { ok: true };
}

export async function updateNote(_prev: NoteResult, formData: FormData): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const content = String(formData.get("content") ?? "");
  const categoryId = String(formData.get("category_id") ?? "") || null;
  if (content.length > NOTE_CONTENT_MAX) return { error: "That's too long." };

  const { error, count } = await ctx.supabase
    .from("notes")
    .update({ title: title || null, content, category_id: categoryId }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { error: "Couldn't save." };

  const tagError = await setNoteTags(ctx.supabase, id, parseTags(String(formData.get("tags") ?? "")));
  if (tagError) return { error: tagError };

  refresh();
  return { ok: true, noteId: id };
}

export async function deleteNote(noteId: string): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "Please log in." };
  const { data: files } = await ctx.supabase.from("attachments").select("storage_path").eq("note_id", noteId);
  if (files?.length) await ctx.supabase.storage.from("attachments").remove(files.map((f) => f.storage_path));
  const { error } = await ctx.supabase.from("notes").delete().eq("id", noteId);
  if (error) return { error: "Couldn't delete." };
  redirect("/");
}

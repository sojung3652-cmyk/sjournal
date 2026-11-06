"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ensureDailyLog } from "@/lib/data/day";
import { setNoteTags } from "@/lib/data/tags";
import { getActionContext } from "@/lib/user";
import { NOTE_CONTENT_MAX, deriveTitle, isUrl, parseTags } from "@/lib/notes";

export type NoteResult = { error?: string; ok?: boolean; noteId?: string };

/** Quick add (text or link). Notes always attach to today's daily log. */
export async function quickAddText(_prev: NoteResult, formData: FormData): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "내용을 입력해 주세요." };
  if (text.length > NOTE_CONTENT_MAX) return { error: "내용이 너무 깁니다." };

  const dailyLogId = await ensureDailyLog(ctx.supabase, ctx.userId, ctx.today);
  const link = isUrl(text);
  const { data, error } = await ctx.supabase
    .from("notes")
    .insert({
      daily_log_id: dailyLogId,
      title: deriveTitle(text),
      content: text,
      source_type: link ? "link" : "text",
    })
    .select("id")
    .single();
  if (error) return { error: "저장하지 못했습니다." };

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
  if (!ctx) return { error: "로그인이 필요합니다." };
  const isPdf = mimeType === "application/pdf";
  if (!isPdf && !mimeType.startsWith("image/")) return { error: "이미지나 PDF만 올릴 수 있습니다." };

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
  if (error) return { error: "저장하지 못했습니다." };

  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
  return { ok: true, noteId: data.id, path: `${ctx.userId}/${data.id}/${Date.now()}-${safe}` };
}

/** File quick add, step 2: record the uploaded object. On upload failure, call discardNote(). */
export async function attachFile(noteId: string, path: string, mimeType: string): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  const { error } = await ctx.supabase.from("attachments").insert({ note_id: noteId, storage_path: path, mime_type: mimeType });
  if (error) return { error: "첨부를 저장하지 못했습니다." };
  refresh();
  return { ok: true, noteId };
}

export async function discardNote(noteId: string): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  await ctx.supabase.from("notes").delete().eq("id", noteId);
  return { ok: true };
}

export async function updateNote(_prev: NoteResult, formData: FormData): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const content = String(formData.get("content") ?? "");
  const categoryId = String(formData.get("category_id") ?? "") || null;
  if (content.length > NOTE_CONTENT_MAX) return { error: "내용이 너무 깁니다." };

  const { error, count } = await ctx.supabase
    .from("notes")
    .update({ title: title || null, content, category_id: categoryId }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { error: "저장하지 못했습니다." };

  const tagError = await setNoteTags(ctx.supabase, id, parseTags(String(formData.get("tags") ?? "")));
  if (tagError) return { error: tagError };

  refresh();
  return { ok: true, noteId: id };
}

export async function deleteNote(noteId: string): Promise<NoteResult> {
  const ctx = await getActionContext();
  if (!ctx) return { error: "로그인이 필요합니다." };
  const { data: files } = await ctx.supabase.from("attachments").select("storage_path").eq("note_id", noteId);
  if (files?.length) await ctx.supabase.storage.from("attachments").remove(files.map((f) => f.storage_path));
  const { error } = await ctx.supabase.from("notes").delete().eq("id", noteId);
  if (error) return { error: "삭제하지 못했습니다." };
  redirect("/");
}

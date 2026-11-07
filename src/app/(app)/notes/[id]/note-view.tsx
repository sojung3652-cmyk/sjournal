"use client";

import { useActionState, useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteNote, updateNote, type NoteResult } from "@/app/(app)/notes/actions";
import { CategoryBadge } from "@/components/category-badge";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NOTE_CONTENT_MAX, SOURCE_TYPES } from "@/lib/notes";
import type { Json } from "@/types/database";

export type NoteData = {
  id: string;
  title: string | null;
  content: string;
  source_type: string;
  category_id: string | null;
  ai_summary: Json | null;
};
type Cat = { id: string; name: string; color: string };
type Attachment = { id: string; mime_type: string; name: string; url: string | null };

export function NoteView({
  note,
  tags,
  categories,
  attachments,
  aiSlot,
}: {
  note: NoteData;
  tags: string[];
  categories: Cat[];
  attachments: Attachment[];
  aiSlot?: React.ReactNode;
}) {
  const t = useTranslations("notes");
  const tc = useTranslations("common");
  const ts = useTranslations("source");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [state, action, pending] = useActionState<NoteResult, FormData>(async (prev, fd) => {
    const res = await updateNote(prev, fd);
    if (res.ok) setEditing(false);
    return res;
  }, {});
  const category = categories.find((c) => c.id === note.category_id);

  if (editing) {
    return (
      <form action={action} className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-6">
        <input type="hidden" name="id" value={note.id} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="note-title">{t("titleLabel")}</Label>
          <Input id="note-title" name="title" defaultValue={note.title ?? ""} maxLength={200} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="note-content">{t("content")}</Label>
          <textarea
            id="note-content"
            name="content"
            rows={14}
            maxLength={NOTE_CONTENT_MAX}
            defaultValue={note.content}
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="note-category">{tc("category")}</Label>
            <select
              id="note-category"
              name="category_id"
              defaultValue={note.category_id ?? ""}
              className="h-8 rounded-lg border border-input bg-card px-2 text-sm"
            >
              <option value="">{tc("noCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note-tags">{t("tagsLabel")}</Label>
            <Input id="note-tags" name="tags" defaultValue={tags.join(", ")} />
          </div>
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div className="flex gap-2">
          {/* The one primary (pink) button while editing. */}
          <Button type="submit" size="sm" disabled={pending}>
            {tc("save")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {tc("cancel")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{ts((SOURCE_TYPES as readonly string[]).includes(note.source_type) ? (note.source_type as (typeof SOURCE_TYPES)[number]) : "text")}</span>
          {category && <CategoryBadge name={category.name} color={category.color} />}
          {tags.map((t) => (
            <span key={t} className="rounded-full border px-2 py-0.5">
              #{t}
            </span>
          ))}
        </div>
        <h1 className="text-xl font-semibold break-words">{note.title || tc("untitled")}</h1>
      </header>

      {note.content ? (
        <Markdown>{note.content}</Markdown>
      ) : (
        attachments.length === 0 && <p className="text-sm text-muted-foreground">{t("noContent")}</p>
      )}

      {attachments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {attachments.map((a) =>
            a.mime_type.startsWith("image/") && a.url ? (
              <li key={a.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived Storage URL */}
                <img src={a.url} alt={a.name} className="max-h-[480px] rounded-lg border object-contain" />
              </li>
            ) : (
              <li key={a.id}>
                <a
                  href={a.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <FileText className="size-4 text-accent-strong" />
                  {a.name}
                </a>
              </li>
            ),
          )}
        </ul>
      )}

      {aiSlot}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          {tc("edit")}
        </Button>
        {confirmDelete ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={deleting}
            onClick={() => startDelete(async () => void (await deleteNote(note.id)))}
          >
            {tc("confirmDelete")}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
            {tc("delete")}
          </Button>
        )}
      </div>
    </article>
  );
}

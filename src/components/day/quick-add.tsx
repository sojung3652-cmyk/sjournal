"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { attachFile, createFileNote, discardNote, quickAddText, type NoteResult } from "@/app/(app)/notes/actions";
import { ClassifySuggestionPanel } from "@/components/ai/classify-suggestion";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { NOTE_CONTENT_MAX } from "@/lib/notes";

const MAX_BYTES = 20 * 1024 * 1024; // matches the Storage bucket limit
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/heic,application/pdf";

/** One input for text, links, images and PDFs (paste or pick a file). */
export function QuickAdd({ categories, aiEnabled }: { categories: { id: string; name: string }[]; aiEnabled: boolean }) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<NoteResult, FormData>(async (prev, fd) => {
    const res = await quickAddText(prev, fd);
    if (res.ok) formRef.current?.reset();
    return res;
  }, {});
  const [uploading, setUploading] = useState(false);
  const [fileMsg, setFileMsg] = useState<{ error?: string; ok?: string } | null>(null);

  async function upload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setFileMsg(null);
    const supabase = createClient();
    let done = 0;
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        setFileMsg({ error: `${file.name}: 20MB 이하만 올릴 수 있습니다.` });
        continue;
      }
      const created = await createFileNote(file.name, file.type);
      if (!created.ok || !created.noteId || !created.path) {
        setFileMsg({ error: created.error ?? "업로드하지 못했습니다." });
        continue;
      }
      const { error } = await supabase.storage.from("attachments").upload(created.path, file, { contentType: file.type });
      if (error) {
        await discardNote(created.noteId); // don't leave an empty note behind
        setFileMsg({ error: `${file.name}: 업로드하지 못했습니다.` });
        continue;
      }
      const attached = await attachFile(created.noteId, created.path, file.type);
      if (attached.error) setFileMsg({ error: attached.error });
      else done++;
    }
    if (done) setFileMsg({ ok: `${done}개 파일을 추가했습니다.` });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <label htmlFor="quick-add" className="sr-only">
        빠른 추가
      </label>
      <textarea
        id="quick-add"
        name="text"
        rows={3}
        maxLength={NOTE_CONTENT_MAX}
        placeholder="메모, 링크, 클로드 대화를 붙여넣거나 이미지·PDF를 붙여넣으세요"
        className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onPaste={(e) => {
          const files = [...e.clipboardData.files];
          if (files.length) {
            e.preventDefault();
            void upload(files);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            id="quick-add-file"
            onChange={(e) => void upload([...(e.target.files ?? [])])}
          />
          <label
            htmlFor="quick-add-file"
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-[0.8rem] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Paperclip className="size-3.5" />
            {uploading ? "올리는 중" : "파일"}
          </label>
          <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl+Enter로 추가</span>
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending || uploading}>
          추가
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {fileMsg?.error && <p className="text-sm text-destructive">{fileMsg.error}</p>}
      {fileMsg?.ok && <p className="text-sm text-muted-foreground">{fileMsg.ok}</p>}
    </form>
    {/* Auto classification right after a text/link note is saved (outside the form: its buttons must not submit). */}
    {state.ok && state.noteId && state.noteId !== dismissed && (
      <ClassifySuggestionPanel
        key={state.noteId}
        noteId={state.noteId}
        categories={categories}
        enabled={aiEnabled}
        auto
        onDone={() => setDismissed(state.noteId ?? null)}
      />
    )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { PageContainer } from "@/components/app/page-container";
import { ClassifySuggestionPanel } from "@/components/ai/classify-suggestion";
import { SummaryPanel } from "@/components/ai/summary-panel";
import { aiAvailable } from "@/lib/ai/run";
import { dayInTimezone } from "@/lib/dates";
import { summarySchema } from "@/lib/prompts/summarize";
import { getUserContext } from "@/lib/user";
import { NoteView } from "./note-view";

export default function NotePage({ params }: PageProps<"/notes/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading</p>}>
        <Note params={params} />
      </Suspense>
    </PageContainer>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Note({ params }: { params: PageProps<"/notes/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, timezone } = await getUserContext();

  const [{ data: note }, { data: categories }] = await Promise.all([
    supabase
      .from("notes")
      .select(
        "id, title, content, source_type, category_id, created_at, ai_summary, daily_logs(log_date), attachments(id, storage_path, mime_type), note_tags(tags(name))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name, color").order("sort_order").order("created_at"),
  ]);
  if (!note) notFound();

  // Private bucket: short-lived signed URLs, generated per request.
  const files = note.attachments ?? [];
  const { data: signed } = files.length
    ? await supabase.storage.from("attachments").createSignedUrls(files.map((f) => f.storage_path), 60 * 60)
    : { data: [] };
  const attachments = files.map((f, i) => ({
    id: f.id,
    mime_type: f.mime_type,
    name: f.storage_path.split("/").pop()?.replace(/^\d+-/, "") ?? "file",
    url: signed?.[i]?.signedUrl ?? null,
  }));

  const day = note.daily_logs?.log_date ?? dayInTimezone(timezone, new Date(note.created_at));
  const summary = summarySchema.safeParse(note.ai_summary);
  const aiEnabled = aiAvailable();
  const tags = (note.note_tags ?? []).map((nt) => nt.tags?.name).filter((n): n is string => Boolean(n));

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/day/${day}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Daily page
      </Link>
      <NoteView
        note={{
          id: note.id,
          title: note.title,
          content: note.content,
          source_type: note.source_type,
          category_id: note.category_id,
          ai_summary: note.ai_summary,
        }}
        tags={tags}
        categories={categories ?? []}
        attachments={attachments}
        aiSlot={
          <div className="flex flex-col gap-3 border-t pt-4">
            <SummaryPanel noteId={note.id} saved={summary.success ? summary.data : null} enabled={aiEnabled} />
            {note.content.trim() && <ClassifySuggestionPanel noteId={note.id} categories={categories ?? []} enabled={aiEnabled} />}
          </div>
        }
      />
    </div>
  );
}

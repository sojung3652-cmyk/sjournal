import Link from "next/link";
import { FileText, Image as ImageIcon, Link2, StickyNote } from "lucide-react";
import { CategoryBadge } from "@/components/category-badge";
import type { DayNote } from "@/lib/data/day";
import { getLocale, getTranslations } from "next-intl/server";
import { formatTime } from "@/lib/dates";

const ICON = { text: StickyNote, link: Link2, image: ImageIcon, pdf: FileText, claude_chat: StickyNote } as const;

export async function NoteList({
  notes,
  categories,
  timezone,
  empty,
}: {
  notes: DayNote[];
  categories: { id: string; name: string; color: string }[];
  timezone: string;
  empty?: string;
}) {
  const [t, tc, locale] = await Promise.all([getTranslations("source"), getTranslations("common"), getLocale()]);
  if (notes.length === 0) return <p className="text-sm text-muted-foreground">{empty ?? (await getTranslations("today"))("noNotes")}</p>;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const sourceLabel = (s: string) => (s in ICON ? t(s as keyof typeof ICON) : t("text"));
  return (
    <ul className="flex flex-col divide-y">
      {notes.map((n) => {
        const Icon = ICON[n.source_type as keyof typeof ICON] ?? StickyNote;
        const cat = n.category_id ? byId.get(n.category_id) : undefined;
        const preview = plainPreview(n.content);
        return (
          <li key={n.id}>
            <Link href={`/notes/${n.id}`} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted">
              <Icon className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-label={sourceLabel(n.source_type)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{n.title || preview.slice(0, 60) || tc("untitled")}</p>
                {preview && n.title && <p className="truncate text-xs text-muted-foreground">{preview}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">{formatTime(n.created_at, timezone, locale)}</span>
                {cat && <CategoryBadge name={cat.name} color={cat.color} />}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Markdown -> one-line plain preview (drops heading/list/quote/code marks). */
export function plainPreview(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+\.|>)\s+/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AiBox, AiList, LinesField, cleanLines } from "@/components/ai/ai-box";
import { Button } from "@/components/ui/button";
import type { CategorySummary } from "@/lib/prompts/category-summary";
import { deleteCategorySummary, draftCategorySummary, saveCategorySummary } from "./actions";

const inputCls = "h-8 w-full rounded-lg border border-ai-foreground/20 bg-card px-2.5 text-sm text-foreground";

export function SummaryView({ summary }: { summary: CategorySummary }) {
  const t = useTranslations("categorySummary");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {summary.topics.map((topic, i) => (
          <div key={i}>
            <p className="text-sm font-medium">{topic.heading}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {topic.points.map((p, j) => (
                <li key={j}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {summary.timeline.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium">{t("timeline")}</p>
          <ol className="space-y-1 border-l border-ai-foreground/30 pl-3 text-sm">
            {summary.timeline.map((row, i) => (
              <li key={i}>
                <span className="mr-2 text-xs opacity-75">{row.date}</span>
                {row.learned}
              </li>
            ))}
          </ol>
        </div>
      )}
      <AiList label={t("weak")} items={summary.weak_spots} />
      <AiList label={t("next")} items={summary.next_up.map((n) => (n.reason ? `${n.title} — ${n.reason}` : n.title))} />
    </div>
  );
}

/** Timeline is edited as "YYYY-MM-DD: what was learned" lines. */
const timelineToLines = (t: CategorySummary["timeline"]) => t.map((x) => `${x.date}: ${x.learned}`);
const linesToTimeline = (lines: string[]) =>
  cleanLines(lines).map((l) => {
    const m = l.match(/^(\S+?):\s*(.+)$/);
    return m ? { date: m[1], learned: m[2] } : { date: "-", learned: l };
  });

export function CategorySummaryPanel({
  categoryId,
  range,
  rangeLabel,
  enabled,
}: {
  categoryId: string;
  range: string;
  rangeLabel: string;
  enabled: boolean;
}) {
  const t = useTranslations("categorySummary");
  const tc = useTranslations("common");
  const [draft, setDraft] = useState<CategorySummary | null>(null);
  const [timelineLines, setTimelineLines] = useState<string[]>([]);
  const [omitted, setOmitted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  if (!enabled) return <p className="text-xs text-muted-foreground">{t("unavailable")}</p>;

  if (!draft) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() =>
              startLoading(async () => {
                setError(null);
                setSavedMsg(false);
                const res = await draftCategorySummary(categoryId, range);
                if (!res.ok) return setError(res.error);
                setDraft(res.summary);
                setTimelineLines(timelineToLines(res.summary.timeline));
                setOmitted(res.omitted);
              })
            }
          >
            {loading ? t("summarizing") : t("summarize", { range: rangeLabel })}
          </Button>
          {loading && <span className="text-xs text-muted-foreground">{t("slow")}</span>}
        </div>
        {savedMsg && <p className="text-sm text-muted-foreground">{t("savedMsg")}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const setTopic = (i: number, patch: Partial<CategorySummary["topics"][number]>) =>
    setDraft({ ...draft, topics: draft.topics.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setNext = (i: number, patch: Partial<CategorySummary["next_up"][number]>) =>
    setDraft({ ...draft, next_up: draft.next_up.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  return (
    <AiBox title={t("draftTitle", { range: rangeLabel })}>
      {omitted > 0 && <p className="text-xs opacity-80">{t("omitted", { count: omitted })}</p>}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium">{t("topics")}</p>
        {draft.topics.map((topic, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-ai-foreground/15 p-2">
            <div className="flex gap-2">
              <input aria-label={t("topicHeading", { n: i + 1 })} value={topic.heading} onChange={(e) => setTopic(i, { heading: e.target.value })} className={`${inputCls} font-medium`} />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t("removeTopic", { n: i + 1 })}
                onClick={() => setDraft({ ...draft, topics: draft.topics.filter((_, j) => j !== i) })}
              >
                <Trash2 />
              </Button>
            </div>
            <LinesField id={`topic-${i}`} label={t("keyPoints")} value={topic.points} onChange={(v) => setTopic(i, { points: v })} />
          </div>
        ))}
        <div>
          <Button size="xs" variant="ghost" onClick={() => setDraft({ ...draft, topics: [...draft.topics, { heading: "", points: [] }] })}>
            <Plus /> {t("addTopic")}
          </Button>
        </div>
      </div>

      <LinesField id="timeline" label={t("timelineEdit")} value={timelineLines} onChange={setTimelineLines} rows={5} />
      <LinesField id="weak" label={t("weak")} value={draft.weak_spots} onChange={(v) => setDraft({ ...draft, weak_spots: v })} />

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium">{t("next")}</p>
        {draft.next_up.map((n, i) => (
          <div key={i} className="grid gap-1.5 sm:grid-cols-2">
            <input aria-label={t("nextTitle", { n: i + 1 })} value={n.title} onChange={(e) => setNext(i, { title: e.target.value })} className={inputCls} />
            <input aria-label={t("nextReason", { n: i + 1 })} value={n.reason} onChange={(e) => setNext(i, { reason: e.target.value })} className={inputCls} />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            startSaving(async () => {
              const clean: CategorySummary = {
                topics: draft.topics
                  .map((topic) => ({ heading: topic.heading.trim(), points: cleanLines(topic.points) }))
                  .filter((topic) => topic.heading && topic.points.length),
                timeline: linesToTimeline(timelineLines),
                weak_spots: cleanLines(draft.weak_spots),
                next_up: draft.next_up.map((n) => ({ title: n.title.trim(), reason: n.reason.trim() })).filter((n) => n.title),
              };
              const res = await saveCategorySummary(categoryId, range, clean);
              if (!res.ok) return setError(res.error);
              setDraft(null);
              setSavedMsg(true);
            })
          }
        >
          {t("save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
          {tc("cancel")}
        </Button>
      </div>
    </AiBox>
  );
}

export function PastSummaries({ items }: { items: { id: string; label: string; summary: CategorySummary }[] }) {
  const t = useTranslations("categorySummary");
  const tc = useTranslations("common");
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, start] = useTransition();
  if (!items.length) return <p className="text-sm text-muted-foreground">{t("noPast")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => {
        const open = openId === it.id;
        return (
          <li key={it.id} className="rounded-lg border">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : it.id)}
              >
                {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                <span className="truncate">{it.label}</span>
              </button>
              {confirmId === it.id ? (
                <Button size="xs" variant="destructive" onClick={() => start(async () => void (await deleteCategorySummary(it.id)))}>
                  {tc("confirmDelete")}
                </Button>
              ) : (
                <Button size="icon-sm" variant="ghost" aria-label={t("deletePast", { label: it.label })} onClick={() => setConfirmId(it.id)}>
                  <Trash2 />
                </Button>
              )}
            </div>
            {open && (
              <div className="px-3 pb-3">
                <AiBox>
                  <SummaryView summary={it.summary} />
                </AiBox>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

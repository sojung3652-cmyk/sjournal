"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { AiBox, AiList, LinesField, cleanLines } from "@/components/ai/ai-box";
import { Button } from "@/components/ui/button";
import type { CategorySummary } from "@/lib/prompts/category-summary";
import { deleteCategorySummary, draftCategorySummary, saveCategorySummary } from "./actions";

const inputCls = "h-8 w-full rounded-lg border border-ai-foreground/20 bg-card px-2.5 text-sm text-foreground";

export function SummaryView({ summary }: { summary: CategorySummary }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {summary.topics.map((t, i) => (
          <div key={i}>
            <p className="text-sm font-medium">{t.heading}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {t.points.map((p, j) => (
                <li key={j}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {summary.timeline.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium">Timeline</p>
          <ol className="space-y-1 border-l border-ai-foreground/30 pl-3 text-sm">
            {summary.timeline.map((t, i) => (
              <li key={i}>
                <span className="mr-2 text-xs opacity-75">{t.date}</span>
                {t.learned}
              </li>
            ))}
          </ol>
        </div>
      )}
      <AiList label="Still weak" items={summary.weak_spots} />
      <AiList label="Study next" items={summary.next_up.map((n) => (n.reason ? `${n.title} — ${n.reason}` : n.title))} />
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
  const [draft, setDraft] = useState<CategorySummary | null>(null);
  const [timelineLines, setTimelineLines] = useState<string[]>([]);
  const [omitted, setOmitted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  if (!enabled) return <p className="text-xs text-muted-foreground">AI features are unavailable (no API key).</p>;

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
            {loading ? "Summarizing" : `Summarize ${rangeLabel.toLowerCase()} with AI`}
          </Button>
          {loading && <span className="text-xs text-muted-foreground">This can take up to a minute.</span>}
        </div>
        {savedMsg && <p className="text-sm text-muted-foreground">Saved. It&apos;s listed under past summaries.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const setTopic = (i: number, patch: Partial<CategorySummary["topics"][number]>) =>
    setDraft({ ...draft, topics: draft.topics.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setNext = (i: number, patch: Partial<CategorySummary["next_up"][number]>) =>
    setDraft({ ...draft, next_up: draft.next_up.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  return (
    <AiBox title={`Category summary · ${rangeLabel}`}>
      {omitted > 0 && <p className="text-xs opacity-80">{omitted} older records were left out because the period is long.</p>}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium">Topics</p>
        {draft.topics.map((t, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-ai-foreground/15 p-2">
            <div className="flex gap-2">
              <input aria-label={`Topic ${i + 1} heading`} value={t.heading} onChange={(e) => setTopic(i, { heading: e.target.value })} className={`${inputCls} font-medium`} />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove topic ${i + 1}`}
                onClick={() => setDraft({ ...draft, topics: draft.topics.filter((_, j) => j !== i) })}
              >
                <Trash2 />
              </Button>
            </div>
            <LinesField id={`topic-${i}`} label="Key points" value={t.points} onChange={(v) => setTopic(i, { points: v })} />
          </div>
        ))}
        <div>
          <Button size="xs" variant="ghost" onClick={() => setDraft({ ...draft, topics: [...draft.topics, { heading: "", points: [] }] })}>
            <Plus /> Add topic
          </Button>
        </div>
      </div>

      <LinesField id="timeline" label="Timeline (date: what you learned)" value={timelineLines} onChange={setTimelineLines} rows={5} />
      <LinesField id="weak" label="Still weak" value={draft.weak_spots} onChange={(v) => setDraft({ ...draft, weak_spots: v })} />

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium">Study next</p>
        {draft.next_up.map((n, i) => (
          <div key={i} className="grid gap-1.5 sm:grid-cols-2">
            <input aria-label={`Next ${i + 1} title`} value={n.title} onChange={(e) => setNext(i, { title: e.target.value })} className={inputCls} />
            <input aria-label={`Next ${i + 1} reason`} value={n.reason} onChange={(e) => setNext(i, { reason: e.target.value })} className={inputCls} />
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
                  .map((t) => ({ heading: t.heading.trim(), points: cleanLines(t.points) }))
                  .filter((t) => t.heading && t.points.length),
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
          Save summary
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
          Cancel
        </Button>
      </div>
    </AiBox>
  );
}

export function PastSummaries({ items }: { items: { id: string; label: string; summary: CategorySummary }[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, start] = useTransition();
  if (!items.length) return <p className="text-sm text-muted-foreground">No saved summaries yet.</p>;
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
                  Confirm delete
                </Button>
              ) : (
                <Button size="icon-sm" variant="ghost" aria-label={`Delete summary ${it.label}`} onClick={() => setConfirmId(it.id)}>
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

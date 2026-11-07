"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addGuideTask, draftGuide, draftJournal, saveGuide, saveJournal } from "@/app/(app)/ai-actions";
import { AiBox, AiList, LinesField, cleanLines } from "@/components/ai/ai-box";
import { Button } from "@/components/ui/button";
import type { Guide } from "@/lib/prompts/guide";
import type { Journal } from "@/lib/prompts/journal";

const NO_KEY = <p className="text-xs text-muted-foreground">AI features are unavailable (no API key).</p>;

export function JournalView({ journal }: { journal: Journal }) {
  return (
    <AiBox title="Journal">
      <AiList label="What I learned" items={journal.learned} />
      <AiList label="What was hard" items={journal.difficult} />
      <AiList label="Tomorrow" items={journal.tomorrow} />
    </AiBox>
  );
}

export function GuideView({ guide }: { guide: Guide }) {
  return (
    <AiBox title="Next-day guide">
      <AiList label="Tasks for tomorrow" items={guide.tasks.map((t) => (t.category ? `${t.title} (${t.category})` : t.title))} />
      <AiList label="Concepts to review" items={guide.review} />
      <AiList label="Tips for where you got stuck" items={guide.tips} />
    </AiBox>
  );
}

/** Day close: journal draft (learned / difficult / tomorrow) -> edit -> save to daily_logs.ai_journal. */
export function JournalDraft({ day, saved, enabled }: { day: string; saved: Journal | null; enabled: boolean }) {
  const [draft, setDraft] = useState<Journal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  if (draft) {
    return (
      <AiBox title="Journal draft">
        <LinesField id="j-learned" label="What I learned" value={draft.learned} onChange={(v) => setDraft({ ...draft, learned: v })} />
        <LinesField id="j-difficult" label="What was hard" value={draft.difficult} onChange={(v) => setDraft({ ...draft, difficult: v })} />
        <LinesField id="j-tomorrow" label="Tomorrow" value={draft.tomorrow} onChange={(v) => setDraft({ ...draft, tomorrow: v })} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() =>
              startSaving(async () => {
                const clean = { learned: cleanLines(draft.learned), difficult: cleanLines(draft.difficult), tomorrow: cleanLines(draft.tomorrow) };
                const res = await saveJournal(day, clean);
                if (!res.ok) return setError(res.error);
                setDraft(null);
              })
            }
          >
            Save journal
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        </div>
      </AiBox>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {saved && <JournalView journal={saved} />}
      {enabled ? (
        <div>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setError(null);
              startLoading(async () => {
                const res = await draftJournal(day);
                if (!res.ok) return setError(res.error);
                setDraft(res.journal);
              });
            }}
          >
            {loading ? "Writing journal" : saved ? "Redo journal" : "Draft journal with AI"}
          </Button>
        </div>
      ) : (
        NO_KEY
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Next-day guide: tasks 3 + review concepts + tips -> edit -> save to daily_logs.ai_guide. */
export function GuideDraft({ day, saved, enabled }: { day: string; saved: Guide | null; enabled: boolean }) {
  const [draft, setDraft] = useState<Guide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  if (draft) {
    return (
      <AiBox title="Next-day guide draft">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">Tasks for tomorrow</p>
          {draft.tasks.map((t, i) => (
            <input
              key={i}
              aria-label={`Task for tomorrow ${i + 1}`}
              value={t.title}
              onChange={(e) => setDraft({ ...draft, tasks: draft.tasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
              className="h-8 rounded-lg border border-ai-foreground/20 bg-card px-2.5 text-sm text-foreground"
            />
          ))}
        </div>
        <LinesField id="g-review" label="Concepts to review" value={draft.review} onChange={(v) => setDraft({ ...draft, review: v })} />
        <LinesField id="g-tips" label="Tips for where you got stuck" value={draft.tips} onChange={(v) => setDraft({ ...draft, tips: v })} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() =>
              startSaving(async () => {
                const clean: Guide = {
                  tasks: draft.tasks.map((t) => ({ ...t, title: t.title.trim() })).filter((t) => t.title),
                  review: cleanLines(draft.review),
                  tips: cleanLines(draft.tips),
                };
                const res = await saveGuide(day, clean);
                if (!res.ok) return setError(res.error);
                setDraft(null);
              })
            }
          >
            Save guide
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        </div>
      </AiBox>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {saved && <GuideView guide={saved} />}
      {enabled ? (
        <div>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setError(null);
              startLoading(async () => {
                const res = await draftGuide(day);
                if (!res.ok) return setError(res.error);
                setDraft(res.guide);
              });
            }}
          >
            {loading ? "Creating guide" : saved ? "Redo guide" : "Create next-day guide"}
          </Button>
        </div>
      ) : (
        NO_KEY
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Morning (PRD scenario A): yesterday's suggested tasks, one click to add to today. */
export function SuggestedTasks({ guide, existingTitles }: { guide: Guide; existingTitles: string[] }) {
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const existing = new Set(existingTitles);
  return (
    <AiBox title="Suggested for today (from yesterday)">
      <ul className="flex flex-col gap-2">
        {guide.tasks.map((t, i) => {
          const done = added.has(i) || existing.has(t.title);
          return (
            <li key={i} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">
                  {t.title}
                  {t.category && <span className="opacity-70"> · {t.category}</span>}
                </p>
                {t.reason && <p className="text-xs opacity-80">{t.reason}</p>}
              </div>
              <Button
                size="xs"
                variant="outline"
                disabled={done}
                onClick={() =>
                  start(async () => {
                    const res = await addGuideTask(t.title, t.category);
                    if (!res.ok) return setError(res.error);
                    setAdded((s) => new Set(s).add(i));
                  })
                }
              >
                {done ? "Added" : (
                  <>
                    <Plus /> Add to today
                  </>
                )}
              </Button>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </AiBox>
  );
}

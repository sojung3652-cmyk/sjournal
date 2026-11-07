"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { addGuideTask, draftGuide, draftJournal, saveGuide, saveJournal } from "@/app/(app)/ai-actions";
import { AiBox, AiList, LinesField, cleanLines } from "@/components/ai/ai-box";
import { Button } from "@/components/ui/button";
import type { Guide } from "@/lib/prompts/guide";
import type { Journal } from "@/lib/prompts/journal";

function NoKey() {
  const t = useTranslations("ai");
  return <p className="text-xs text-muted-foreground">{t("unavailable")}</p>;
}

export function JournalView({ journal }: { journal: Journal }) {
  const t = useTranslations("ai.journal");
  return (
    <AiBox title={t("title")}>
      <AiList label={t("learned")} items={journal.learned} />
      <AiList label={t("difficult")} items={journal.difficult} />
      <AiList label={t("tomorrow")} items={journal.tomorrow} />
    </AiBox>
  );
}

export function GuideView({ guide }: { guide: Guide }) {
  const t = useTranslations("ai.guide");
  return (
    <AiBox title={t("title")}>
      <AiList label={t("tasks")} items={guide.tasks.map((task) => (task.category ? `${task.title} (${task.category})` : task.title))} />
      <AiList label={t("review")} items={guide.review} />
      <AiList label={t("tips")} items={guide.tips} />
    </AiBox>
  );
}

/** Day close: journal draft (learned / difficult / tomorrow) -> edit -> save to daily_logs.ai_journal. */
export function JournalDraft({ day, saved, enabled }: { day: string; saved: Journal | null; enabled: boolean }) {
  const t = useTranslations("ai.journal");
  const tc = useTranslations("common");
  const [draft, setDraft] = useState<Journal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  if (draft) {
    return (
      <AiBox title={t("draftTitle")}>
        <LinesField id="j-learned" label={t("learned")} value={draft.learned} onChange={(v) => setDraft({ ...draft, learned: v })} />
        <LinesField id="j-difficult" label={t("difficult")} value={draft.difficult} onChange={(v) => setDraft({ ...draft, difficult: v })} />
        <LinesField id="j-tomorrow" label={t("tomorrow")} value={draft.tomorrow} onChange={(v) => setDraft({ ...draft, tomorrow: v })} />
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
            {t("save")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            {tc("cancel")}
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
            {loading ? t("running") : saved ? t("again") : t("button")}
          </Button>
        </div>
      ) : (
        <NoKey />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Next-day guide: tasks 3 + review concepts + tips -> edit -> save to daily_logs.ai_guide. */
export function GuideDraft({ day, saved, enabled }: { day: string; saved: Guide | null; enabled: boolean }) {
  const t = useTranslations("ai.guide");
  const tc = useTranslations("common");
  const [draft, setDraft] = useState<Guide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  if (draft) {
    return (
      <AiBox title={t("draftTitle")}>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">{t("tasks")}</p>
          {draft.tasks.map((task, i) => (
            <input
              key={i}
              aria-label={t("task", { n: i + 1 })}
              value={task.title}
              onChange={(e) => setDraft({ ...draft, tasks: draft.tasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
              className="h-8 rounded-lg border border-ai-foreground/20 bg-card px-2.5 text-sm text-foreground"
            />
          ))}
        </div>
        <LinesField id="g-review" label={t("review")} value={draft.review} onChange={(v) => setDraft({ ...draft, review: v })} />
        <LinesField id="g-tips" label={t("tips")} value={draft.tips} onChange={(v) => setDraft({ ...draft, tips: v })} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() =>
              startSaving(async () => {
                const clean: Guide = {
                  tasks: draft.tasks.map((task) => ({ ...task, title: task.title.trim() })).filter((task) => task.title),
                  review: cleanLines(draft.review),
                  tips: cleanLines(draft.tips),
                };
                const res = await saveGuide(day, clean);
                if (!res.ok) return setError(res.error);
                setDraft(null);
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
            {loading ? t("running") : saved ? t("again") : t("button")}
          </Button>
        </div>
      ) : (
        <NoKey />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Morning (PRD scenario A): yesterday's suggested tasks, one click to add to today. */
export function SuggestedTasks({ guide, existingTitles }: { guide: Guide; existingTitles: string[] }) {
  const t = useTranslations("ai.guide");
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const existing = new Set(existingTitles);
  return (
    <AiBox title={t("suggested")}>
      <ul className="flex flex-col gap-2">
        {guide.tasks.map((task, i) => {
          const done = added.has(i) || existing.has(task.title);
          return (
            <li key={i} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">
                  {task.title}
                  {task.category && <span className="opacity-70"> · {task.category}</span>}
                </p>
                {task.reason && <p className="text-xs opacity-80">{task.reason}</p>}
              </div>
              <Button
                size="xs"
                variant="outline"
                disabled={done}
                onClick={() =>
                  start(async () => {
                    const res = await addGuideTask(task.title, task.category);
                    if (!res.ok) return setError(res.error);
                    setAdded((s) => new Set(s).add(i));
                  })
                }
              >
                {done ? t("added") : (
                  <>
                    <Plus /> {t("addToday")}
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

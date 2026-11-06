"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addGuideTask, draftGuide, draftJournal, saveGuide, saveJournal } from "@/app/(app)/ai-actions";
import { AiBox, AiList, LinesField, cleanLines } from "@/components/ai/ai-box";
import { Button } from "@/components/ui/button";
import type { Guide } from "@/lib/prompts/guide";
import type { Journal } from "@/lib/prompts/journal";

const NO_KEY = <p className="text-xs text-muted-foreground">AI 기능을 사용할 수 없습니다. (API 키 없음)</p>;

export function JournalView({ journal }: { journal: Journal }) {
  return (
    <AiBox title="저널">
      <AiList label="배운 것" items={journal.learned} />
      <AiList label="어려웠던 것" items={journal.difficult} />
      <AiList label="내일 할 것" items={journal.tomorrow} />
    </AiBox>
  );
}

export function GuideView({ guide }: { guide: Guide }) {
  return (
    <AiBox title="다음 학습 가이드">
      <AiList label="내일 할 일" items={guide.tasks.map((t) => (t.category ? `${t.title} (${t.category})` : t.title))} />
      <AiList label="복습할 개념" items={guide.review} />
      <AiList label="막힌 부분 해결 팁" items={guide.tips} />
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
      <AiBox title="저널 초안">
        <LinesField id="j-learned" label="배운 것" value={draft.learned} onChange={(v) => setDraft({ ...draft, learned: v })} />
        <LinesField id="j-difficult" label="어려웠던 것" value={draft.difficult} onChange={(v) => setDraft({ ...draft, difficult: v })} />
        <LinesField id="j-tomorrow" label="내일 할 것" value={draft.tomorrow} onChange={(v) => setDraft({ ...draft, tomorrow: v })} />
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
            저널 저장
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            취소
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
            {loading ? "저널 쓰는 중" : saved ? "저널 다시 만들기" : "AI 저널 초안 만들기"}
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
      <AiBox title="다음 학습 가이드 초안">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">내일 할 일</p>
          {draft.tasks.map((t, i) => (
            <input
              key={i}
              aria-label={`내일 할 일 ${i + 1}`}
              value={t.title}
              onChange={(e) => setDraft({ ...draft, tasks: draft.tasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
              className="h-8 rounded-lg border border-ai-foreground/20 bg-card px-2.5 text-sm text-foreground"
            />
          ))}
        </div>
        <LinesField id="g-review" label="복습할 개념" value={draft.review} onChange={(v) => setDraft({ ...draft, review: v })} />
        <LinesField id="g-tips" label="막힌 부분 해결 팁" value={draft.tips} onChange={(v) => setDraft({ ...draft, tips: v })} />
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
            가이드 저장
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            취소
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
            {loading ? "가이드 만드는 중" : saved ? "가이드 다시 만들기" : "다음 학습 가이드 만들기"}
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
    <AiBox title="어제 제안한 오늘 할 일">
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
                {done ? "추가됨" : (
                  <>
                    <Plus /> 오늘 할 것에
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

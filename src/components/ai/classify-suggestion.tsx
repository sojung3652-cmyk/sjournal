"use client";

import { useEffect, useState, useTransition } from "react";
import { applyClassification, classifyNote, type ClassifySuggestion } from "@/app/(app)/ai-actions";
import { AiBox } from "@/components/ai/ai-box";
import { Button } from "@/components/ui/button";

type Cat = { id: string; name: string };

/**
 * Suggests category + 2–4 tags for a note. `auto` runs right after a note is saved
 * (quick add); otherwise the user presses the button (note page).
 */
export function ClassifySuggestionPanel({
  noteId,
  categories,
  auto = false,
  enabled,
  onDone,
}: {
  noteId: string;
  categories: Cat[];
  auto?: boolean;
  enabled: boolean;
  onDone?: () => void;
}) {
  const [suggestion, setSuggestion] = useState<ClassifySuggestion | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  function run() {
    startLoading(async () => {
      setError(null);
      const res = await classifyNote(noteId);
      if (!res.ok) return setError(res.error);
      setSuggestion(res.suggestion);
      setCategoryId(res.suggestion.categoryId ?? "");
      setTags(res.suggestion.tags.join(", "));
    });
  }

  useEffect(() => {
    if (auto && enabled) run();
    // Run once per note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  if (!enabled) {
    return auto ? null : <p className="text-xs text-muted-foreground">AI 기능을 사용할 수 없습니다. (API 키 없음)</p>;
  }
  if (saved) return <p className="text-sm text-muted-foreground">분류를 적용했습니다.</p>;

  if (!suggestion) {
    return (
      <div className="flex flex-col gap-2">
        {!auto && (
          <div>
            <Button size="sm" variant="outline" onClick={run} disabled={loading}>
              {loading ? "분류하는 중" : "AI로 분류하기"}
            </Button>
          </div>
        )}
        {auto && loading && <p className="text-xs text-muted-foreground">AI가 카테고리와 태그를 고르는 중</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <AiBox title="카테고리·태그 제안">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`cls-cat-${noteId}`} className="text-xs font-medium">
            카테고리
          </label>
          <select
            id={`cls-cat-${noteId}`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-8 rounded-lg border border-ai-foreground/20 bg-card px-2 text-sm text-foreground"
          >
            <option value="">선택 안 함</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`cls-tags-${noteId}`} className="text-xs font-medium">
            태그
          </label>
          <input
            id={`cls-tags-${noteId}`}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="h-8 rounded-lg border border-ai-foreground/20 bg-card px-2.5 text-sm text-foreground"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            startSaving(async () => {
              const res = await applyClassification(noteId, categoryId || null, tags);
              if (!res.ok) return setError(res.error);
              setSaved(true); // keep the panel to show the confirmation; only '무시' closes it
            })
          }
        >
          적용
        </Button>
        <Button size="sm" variant="ghost" onClick={() => (onDone ? onDone() : setSuggestion(null))}>
          무시
        </Button>
      </div>
    </AiBox>
  );
}

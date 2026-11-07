"use client";

import { useState, useTransition } from "react";
import { saveSummary, summarizeNote } from "@/app/(app)/ai-actions";
import { AiBox } from "@/components/ai/ai-box";
import { Button } from "@/components/ui/button";
import type { NoteSummary } from "@/lib/prompts/summarize";

/** Note summary: core concepts 3–5 + one line. Draft is editable; saved to notes.ai_summary. */
export function SummaryPanel({ noteId, saved, enabled }: { noteId: string; saved: NoteSummary | null; enabled: boolean }) {
  const [draft, setDraft] = useState<NoteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  const generate = () => {
    setError(null);
    startLoading(async () => {
      const res = await summarizeNote(noteId);
      if (!res.ok) return setError(res.error);
      setDraft(res.summary);
    });
  };

  if (draft) {
    const setConcept = (i: number, key: "name" | "explanation", v: string) =>
      setDraft({ ...draft, concepts: draft.concepts.map((c, j) => (j === i ? { ...c, [key]: v } : c)) });
    return (
      <AiBox title="Note summary">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sum-one" className="text-xs font-medium">
            One-line summary
          </label>
          <input
            id="sum-one"
            value={draft.one_line}
            onChange={(e) => setDraft({ ...draft, one_line: e.target.value })}
            className="h-8 rounded-lg border border-ai-foreground/20 bg-card px-2.5 text-sm text-foreground"
          />
        </div>
        <p className="text-xs font-medium">Key concepts</p>
        <ul className="flex flex-col gap-2">
          {draft.concepts.map((c, i) => (
            <li key={i} className="flex flex-col gap-1">
              <input
                aria-label={`Concept ${i + 1} name`}
                value={c.name}
                onChange={(e) => setConcept(i, "name", e.target.value)}
                className="h-8 rounded-lg border border-ai-foreground/20 bg-card px-2.5 text-sm font-medium text-foreground"
              />
              <textarea
                aria-label={`Concept ${i + 1} explanation`}
                rows={2}
                value={c.explanation}
                onChange={(e) => setConcept(i, "explanation", e.target.value)}
                className="resize-y rounded-lg border border-ai-foreground/20 bg-card px-2.5 py-1.5 text-sm text-foreground"
              />
            </li>
          ))}
        </ul>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() =>
              startSaving(async () => {
                const res = await saveSummary(noteId, draft);
                if (!res.ok) return setError(res.error);
                setDraft(null);
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

  return (
    <div className="flex flex-col gap-2">
      {saved && (
        <AiBox title="Note summary">
          <p className="text-sm font-medium">{saved.one_line}</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {saved.concepts.map((c, i) => (
              <li key={i}>
                <span className="font-medium">{c.name}</span> — {c.explanation}
              </li>
            ))}
          </ul>
        </AiBox>
      )}
      {enabled ? (
        <div>
          <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
            {loading ? "Summarizing" : saved ? "Summarize again" : "Summarize with AI"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">AI features are unavailable (no API key).</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { moveItem } from "@/app/(app)/board/actions";
import { CategoryBadge } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import type { StudyStatus } from "@/lib/study";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; status: StudyStatus; category_id: string | null };
type Cat = { id: string; name: string; color: string };

/** Checklist: checking marks done; unchecking returns the item to `uncheckedStatus`. */
export function ItemChecklist({
  items,
  categories,
  uncheckedStatus = "today",
  empty,
}: {
  items: Item[];
  categories: Cat[];
  uncheckedStatus?: StudyStatus;
  empty: string;
}) {
  const [optimistic, setStatus] = useOptimistic(items, (state, m: { id: string; status: StudyStatus }) =>
    state.map((it) => (it.id === m.id ? { ...it, status: m.status } : it)),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const byId = new Map(categories.map((c) => [c.id, c]));

  function toggle(it: Item) {
    const next: StudyStatus = it.status === "done" ? uncheckedStatus : "done";
    startTransition(async () => {
      setStatus({ id: it.id, status: next });
      const res = await moveItem(it.id, next);
      setError(res.error ?? null);
    });
  }

  if (optimistic.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <>
      <ul className="flex flex-col gap-1">
        {optimistic.map((it) => {
          const done = it.status === "done";
          const cat = it.category_id ? byId.get(it.category_id) : undefined;
          return (
            <li key={it.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
                <input type="checkbox" className="peer sr-only" checked={done} onChange={() => toggle(it)} />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                    done && "border-accent-strong bg-accent-strong text-card",
                  )}
                >
                  {done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={cn("min-w-0 flex-1 text-sm", done && "text-muted-foreground line-through")}>{it.title}</span>
                {cat && <CategoryBadge name={cat.name} color={cat.color} />}
              </label>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );
}

export function InProgressCards({ items, categories }: { items: Item[]; categories: Cat[] }) {
  const t = useTranslations("today");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const byId = new Map(categories.map((c) => [c.id, c]));
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{t("emptyInProgress")}</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((it) => {
        const cat = it.category_id ? byId.get(it.category_id) : undefined;
        return (
          <li key={it.id} className="flex flex-col items-start gap-2 rounded-lg border bg-card p-3">
            {cat && <CategoryBadge name={cat.name} color={cat.color} />}
            <p className="text-sm">{it.title}</p>
            <Button
              size="xs"
              variant="outline"
              disabled={pendingId === it.id}
              onClick={() => {
                setPendingId(it.id);
                startTransition(async () => {
                  await moveItem(it.id, "done");
                  setPendingId(null);
                });
              }}
            >
              <Check /> {t("done")}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

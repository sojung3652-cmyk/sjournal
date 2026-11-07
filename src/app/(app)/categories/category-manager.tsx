"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryBadge } from "@/components/category-badge";
import { CATEGORY_COLORS, CATEGORY_NAME_MAX } from "@/lib/categories";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type ActionResult,
} from "./actions";

type Category = { id: string; name: string; color: string; sort_order: number };
export type CategoryStats = { notes: number; done: number; total: number; lastStudied: string | null };

export function CategoryManager({
  categories,
  stats = {},
}: {
  categories: Category[];
  stats?: Record<string, CategoryStats>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    startTransition(async () => {
      const res = await reorderCategories(ids);
      setError(res.error ?? null);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteCategory(id);
      setError(res.error ?? null);
      setConfirmingId(null);
    });
  }

  return (
    <section className="flex flex-col gap-6">
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet. Add one below.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {categories.map((category, index) => (
            <li key={category.id} className="p-3">
              {editingId === category.id ? (
                <CategoryForm
                  key={category.id}
                  mode="edit"
                  category={category}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/categories/${category.id}`}
                    className="-m-1.5 flex min-w-0 flex-1 flex-col items-start gap-1.5 rounded-lg p-1.5 hover:bg-muted"
                    aria-label={`Open ${category.name}`}
                  >
                    <CategoryBadge name={category.name} color={category.color} />
                    <StatsLine stats={stats[category.id]} />
                  </Link>

                  {confirmingId === category.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Delete this?</span>
                      <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(category.id)}>
                        Delete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${category.name} up`}
                        disabled={pending || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${category.name} down`}
                        disabled={pending || index === categories.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => {
                          setConfirmingId(null);
                          setEditingId(category.id);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => {
                          setEditingId(null);
                          setConfirmingId(category.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {confirmingId && (
        <p className="text-xs text-muted-foreground">
          Deleting keeps this category&apos;s items and notes; they just become uncategorized.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <h3 className="text-sm font-medium">New category</h3>
        <CategoryForm mode="create" />
      </div>
    </section>
  );
}

function CategoryForm({
  mode,
  category,
  onDone,
}: {
  mode: "create" | "edit";
  category?: Category;
  onDone?: () => void;
}) {
  const action = mode === "create" ? createCategory : updateCategory;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = mode === "create" ? "new" : `edit-${category?.id}`;

  useEffect(() => {
    if (!state.ok) return;
    if (mode === "create") formRef.current?.reset();
    onDone?.();
  }, [state, mode, onDone]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`} className={mode === "edit" ? "sr-only" : undefined}>
          Name
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={category?.name}
          maxLength={CATEGORY_NAME_MAX}
          required
          autoFocus={mode === "edit"}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <label key={c.key} className="cursor-pointer" title={c.label}>
              <input
                type="radio"
                name="color"
                value={c.key}
                defaultChecked={category?.color === c.key}
                required
                className="peer sr-only"
              />
              <span
                className="block size-7 rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-accent-strong peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                style={{ backgroundColor: c.hex }}
              />
              <span className="sr-only">{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        {/* Design rule: only one primary (pink) button per screen — "Add". */}
        <Button type="submit" size="sm" variant={mode === "create" ? "default" : "outline"} disabled={pending}>
          {mode === "create" ? "Add" : "Save"}
        </Button>
        {mode === "edit" && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function StatsLine({ stats }: { stats?: CategoryStats }) {
  if (!stats) return null;
  const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  return (
    <p className="text-xs text-muted-foreground">
      {stats.notes} notes · {stats.done}/{stats.total} done
      {stats.total > 0 && ` (${progress}%)`}
      {stats.lastStudied && ` · last ${stats.lastStudied}`}
    </p>
  );
}

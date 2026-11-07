"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("categories");
  const tc = useTranslations("common");
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
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
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
                    aria-label={t("open", { name: category.name })}
                  >
                    <CategoryBadge name={category.name} color={category.color} />
                    <StatsLine stats={stats[category.id]} />
                  </Link>

                  {confirmingId === category.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("deleteConfirm")}</span>
                      <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(category.id)}>
                        {tc("delete")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                        {tc("cancel")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("moveUp", { name: category.name })}
                        disabled={pending || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("moveDown", { name: category.name })}
                        disabled={pending || index === categories.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("editName", { name: category.name })}
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
                        aria-label={t("deleteName", { name: category.name })}
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
          {t("deleteNote")}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <h3 className="text-sm font-medium">{t("new")}</h3>
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
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const tColor = useTranslations("colors");
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
          {tc("name")}
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
        <legend className="mb-2 text-sm font-medium">{t("color")}</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <label key={c.key} className="cursor-pointer" title={tColor(c.key)}>
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
              <span className="sr-only">{tColor(c.key)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        {/* Design rule: only one primary (pink) button per screen — "Add". */}
        <Button type="submit" size="sm" variant={mode === "create" ? "default" : "outline"} disabled={pending}>
          {mode === "create" ? tc("add") : tc("save")}
        </Button>
        {mode === "edit" && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            {tc("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

function StatsLine({ stats }: { stats?: CategoryStats }) {
  const t = useTranslations("categories");
  if (!stats) return null;
  const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  return (
    <p className="text-xs text-muted-foreground">
      {t("stats", { notes: stats.notes, done: stats.done, total: stats.total })}
      {stats.total > 0 && t("progress", { percent: progress })}
      {stats.lastStudied && t("last", { date: stats.lastStudied })}
    </p>
  );
}

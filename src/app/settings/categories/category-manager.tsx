"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_COLORS, CATEGORY_NAME_MAX, categoryHex } from "@/lib/categories";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type ActionResult,
} from "./actions";

type Category = { id: string; name: string; color: string; sort_order: number };

export function CategoryManager({ categories }: { categories: Category[] }) {
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
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">카테고리</h2>
        <p className="text-sm text-muted-foreground">과목별 색상은 모든 화면에서 똑같이 쓰입니다.</p>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">카테고리가 없습니다. 아래에서 추가해 주세요.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
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
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryHex(category.color) }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-sm">{category.name}</span>

                  {confirmingId === category.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">삭제할까요?</span>
                      <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(category.id)}>
                        삭제
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                        취소
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`${category.name} 위로`}
                        disabled={pending || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`${category.name} 아래로`}
                        disabled={pending || index === categories.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`${category.name} 수정`}
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
                        aria-label={`${category.name} 삭제`}
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
          삭제해도 이 카테고리의 학습 항목과 노트는 남고, 카테고리만 비워집니다.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">새 카테고리</h3>
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
          이름
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
        <legend className="mb-2 text-sm font-medium">색상</legend>
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
                className="block size-7 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                style={{ backgroundColor: c.hex }}
              />
              <span className="sr-only">{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {mode === "create" ? "추가" : "저장"}
        </Button>
        {mode === "edit" && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            취소
          </Button>
        )}
      </div>
    </form>
  );
}

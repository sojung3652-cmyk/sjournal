"use client";

import { useActionState, useOptimistic, useRef, useState, useTransition, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategoryBadge } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STUDY_STATUSES, STUDY_TITLE_MAX, isStudyStatus, type StudyStatus } from "@/lib/study";
import { cn } from "@/lib/utils";
import { createItem, deleteItem, moveItem, updateItem, type ItemResult } from "./actions";

export type BoardItem = {
  id: string;
  title: string;
  status: StudyStatus;
  category_id: string | null;
  position: number;
};
export type BoardCategory = { id: string; name: string; color: string };

type Move = { id: string; status: StudyStatus };

export function Board({ items, categories }: { items: BoardItem[]; categories: BoardCategory[] }) {
  const t = useTranslations("board");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const [filter, setFilter] = useState<string | "all" | "none">("all");
  const [mobileColumn, setMobileColumn] = useState<StudyStatus>("today");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Optimistic status change; the server refresh() then delivers the real rows.
  const [optimisticItems, applyMove] = useOptimistic(items, (state, move: Move) =>
    state.map((it) => (it.id === move.id ? { ...it, status: move.status, position: -Infinity } : it)),
  );

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const visible = optimisticItems.filter((it) =>
    filter === "all" ? true : filter === "none" ? !it.category_id : it.category_id === filter,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function changeStatus(id: string, status: StudyStatus) {
    const current = optimisticItems.find((it) => it.id === id);
    if (!current || current.status === status) return;
    startTransition(async () => {
      applyMove({ id, status });
      const res = await moveItem(id, status);
      setError(res.error ?? null);
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const target = e.over?.id ? String(e.over.id) : null;
    if (target && isStudyStatus(target)) changeStatus(String(e.active.id), target);
  }

  const activeItem = activeId ? optimisticItems.find((it) => it.id === activeId) : null;

  return (
    <div className="flex flex-col gap-5">
      <AddItemForm categories={categories} />

      <div className="flex flex-wrap gap-2" role="group" aria-label={t("categoryFilter")}>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          {tc("all")}
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
            <CategoryBadge name={c.name} color={c.color} />
          </FilterChip>
        ))}
        <FilterChip active={filter === "none"} onClick={() => setFilter("none")}>
          {tc("uncategorized")}
        </FilterChip>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Mobile: one column at a time, switched by tabs. */}
      <div className="grid grid-cols-4 rounded-lg border bg-card p-1 md:hidden" role="tablist">
        {STUDY_STATUSES.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={mobileColumn === s.key}
            onClick={() => setMobileColumn(s.key)}
            className={cn(
              "rounded-md py-1.5 text-xs text-muted-foreground",
              mobileColumn === s.key && "bg-muted font-medium text-foreground",
            )}
          >
            {ts(s.key)} {visible.filter((it) => it.status === s.key).length}
          </button>
        ))}
      </div>

      <DndContext id="board-dnd" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid gap-4 md:grid-cols-4">
          {STUDY_STATUSES.map((s) => (
            <Column
              key={s.key}
              status={s.key}
              label={ts(s.key)}
              hiddenOnMobile={mobileColumn !== s.key}
              items={visible.filter((it) => it.status === s.key).sort((a, b) => a.position - b.position)}
              categoryById={categoryById}
              categories={categories}
              onMove={changeStatus}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? (
            <CardBody item={activeItem} category={activeItem.category_id ? categoryById.get(activeItem.category_id) : undefined} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center rounded-full border bg-card px-2 text-xs text-muted-foreground",
        active && "border-accent-strong text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Column({
  status,
  label,
  items,
  hiddenOnMobile,
  categoryById,
  categories,
  onMove,
}: {
  status: StudyStatus;
  label: string;
  items: BoardItem[];
  hiddenOnMobile: boolean;
  categoryById: Map<string, BoardCategory>;
  categories: BoardCategory[];
  onMove: (id: string, status: StudyStatus) => void;
}) {
  const tc = useTranslations("common");
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      data-status={status}
      className={cn(
        "flex min-h-40 flex-col gap-2 rounded-xl border bg-muted/60 p-2",
        hiddenOnMobile && "hidden md:flex",
        isOver && "border-accent-strong",
      )}
    >
      <h2 className="flex items-center justify-between px-1 pt-1 text-sm font-medium">
        {label}
        <span className="text-xs font-normal text-muted-foreground">{items.length}</span>
      </h2>
      {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">{tc("empty")}</p>}
      {items.map((it) => (
        <DraggableCard
          key={it.id}
          item={it}
          category={it.category_id ? categoryById.get(it.category_id) : undefined}
          categories={categories}
          onMove={onMove}
        />
      ))}
    </section>
  );
}

function DraggableCard({
  item,
  category,
  categories,
  onMove,
}: {
  item: BoardItem;
  category?: BoardCategory;
  categories: BoardCategory[];
  onMove: (id: string, status: StudyStatus) => void;
}) {
  const t = useTranslations("board");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return <EditItemForm item={item} categories={categories} onDone={() => setEditing(false)} />;
  }

  return (
    <article
      ref={setNodeRef}
      data-item-id={item.id}
      className={cn("rounded-lg border bg-card", isDragging && "opacity-40")}
    >
      <div className="flex items-start gap-1">
        <div {...listeners} {...attributes} className="min-w-0 flex-1 cursor-grab touch-manipulation p-2.5 active:cursor-grabbing">
          <CardContent item={item} category={category} />
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          className="m-1"
          aria-label={t("menu", { title: item.title })}
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((v) => !v);
            setConfirmDelete(false);
          }}
        >
          <MoreHorizontal />
        </Button>
      </div>
      {menuOpen && (
        <div className="flex flex-col gap-2 border-t p-2">
          <div className="flex flex-wrap gap-1">
            {STUDY_STATUSES.filter((s) => s.key !== item.status).map((s) => (
              <Button key={s.key} size="xs" variant="outline" onClick={() => onMove(item.id, s.key)}>
                {t("moveTo", { status: ts(s.key) })}
              </Button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setMenuOpen(false);
                setEditing(true);
              }}
            >
              {tc("edit")}
            </Button>
            {confirmDelete ? (
              <Button
                size="xs"
                variant="destructive"
                disabled={pending}
                onClick={() => startTransition(async () => void (await deleteItem(item.id)))}
              >
                {tc("confirmDelete")}
              </Button>
            ) : (
              <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(true)}>
                {tc("delete")}
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function CardContent({ item, category }: { item: BoardItem; category?: BoardCategory }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {category && <CategoryBadge name={category.name} color={category.color} />}
      <p className={cn("text-sm break-words", item.status === "done" && "text-muted-foreground line-through")}>{item.title}</p>
    </div>
  );
}

function CardBody({ item, category }: { item: BoardItem; category?: BoardCategory }) {
  return (
    <div className="cursor-grabbing rounded-lg border border-accent-strong bg-card p-2.5">
      <CardContent item={item} category={category} />
    </div>
  );
}

function CategorySelect({ categories, defaultValue, id }: { categories: BoardCategory[]; defaultValue?: string | null; id: string }) {
  const tc = useTranslations("common");
  return (
    <select
      id={id}
      name="category_id"
      defaultValue={defaultValue ?? ""}
      aria-label={tc("category")}
      className="h-8 rounded-lg border border-input bg-card px-2 text-sm"
    >
      <option value="">{tc("noCategory")}</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

function AddItemForm({ categories }: { categories: BoardCategory[] }) {
  const t = useTranslations("board");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<ItemResult, FormData>(createItem, {});
  return (
    <form action={action} className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
      <Input name="title" placeholder={t("newItem")} aria-label={t("newItem")} maxLength={STUDY_TITLE_MAX} required className="sm:flex-1" />
      <div className="flex gap-2">
        <CategorySelect categories={categories} id="new-item-category" />
        <select name="status" defaultValue="backlog" aria-label={t("column")} className="h-8 rounded-lg border border-input bg-card px-2 text-sm">
          {STUDY_STATUSES.filter((s) => s.key !== "done").map((s) => (
            <option key={s.key} value={s.key}>
              {ts(s.key)}
            </option>
          ))}
        </select>
        {/* The one primary (pink) button on this screen. */}
        <Button type="submit" disabled={pending}>
          {tc("add")}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

function EditItemForm({ item, categories, onDone }: { item: BoardItem; categories: BoardCategory[]; onDone: () => void }) {
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<ItemResult, FormData>(updateItem, {});
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (state.ok) done.current();
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg border border-accent-strong bg-card p-2">
      <input type="hidden" name="id" value={item.id} />
      <Input name="title" defaultValue={item.title} aria-label={tc("title")} maxLength={STUDY_TITLE_MAX} required autoFocus />
      <CategorySelect categories={categories} defaultValue={item.category_id} id={`edit-${item.id}-category`} />
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex gap-1">
        <Button type="submit" size="xs" variant="outline" disabled={pending}>
          {tc("save")}
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

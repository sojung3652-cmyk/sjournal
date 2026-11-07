import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { dayInTimezone, formatDayShort } from "@/lib/dates";
import { getUserContext } from "@/lib/user";
import { PageContainer } from "@/components/app/page-container";
import { CategoryManager, type CategoryStats } from "./category-manager";

export default function CategoriesPage() {
  return (
    <PageContainer>
      <PageHeader title="Categories" description="Each subject keeps the same color on every screen." />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading</p>}>
        <CategoryList />
      </Suspense>
    </PageContainer>
  );
}

async function CategoryList() {
  const { supabase, timezone } = await getUserContext();
  // RLS limits every query to the signed-in user's rows.
  const [{ data, error }, { data: notes }, { data: items }] = await Promise.all([
    supabase.from("categories").select("id, name, color, sort_order").order("sort_order").order("created_at"),
    supabase.from("notes").select("category_id, created_at").not("category_id", "is", null),
    supabase.from("study_items").select("category_id, status, completed_at").not("category_id", "is", null),
  ]);

  if (error) {
    return <p className="text-sm text-destructive">Couldn&apos;t load categories.</p>;
  }

  const stats: Record<string, CategoryStats> = {};
  const get = (id: string) => (stats[id] ??= { notes: 0, done: 0, total: 0, lastStudied: null });
  const latest: Record<string, string> = {};
  const bump = (id: string, iso: string | null) => {
    if (iso && (!latest[id] || iso > latest[id])) latest[id] = iso;
  };
  for (const n of notes ?? []) {
    if (!n.category_id) continue;
    get(n.category_id).notes++;
    bump(n.category_id, n.created_at);
  }
  for (const it of items ?? []) {
    if (!it.category_id) continue;
    const s = get(it.category_id);
    s.total++;
    if (it.status === "done") s.done++;
    bump(it.category_id, it.completed_at);
  }
  for (const [id, iso] of Object.entries(latest)) {
    get(id).lastStudied = formatDayShort(dayInTimezone(timezone, new Date(iso)));
  }

  return <CategoryManager categories={data} stats={stats} />;
}

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "./category-manager";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중</p>}>
      <CategoryList />
    </Suspense>
  );
}

async function CategoryList() {
  const supabase = await createClient();
  // RLS limits this to the signed-in user's rows.
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, color, sort_order")
    .order("sort_order")
    .order("created_at");

  if (error) {
    return <p className="text-sm text-destructive">카테고리를 불러오지 못했습니다.</p>;
  }
  return <CategoryManager categories={data} />;
}

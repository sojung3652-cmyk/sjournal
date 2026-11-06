import { Suspense } from "react";
import { PageContainer } from "@/components/app/page-container";
import { PageHeader } from "@/components/app/page-header";
import { getUserContext } from "@/lib/user";
import { Board } from "./board";

export default function BoardPage() {
  return (
    <PageContainer wide>
      <PageHeader title="보드" description="카드를 끌어 상태를 바꿀 수 있습니다." />
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중</p>}>
        <BoardData />
      </Suspense>
    </PageContainer>
  );
}

// Done column only shows the most recent items to keep the board light.
const DONE_LIMIT = 30;

async function BoardData() {
  const { supabase } = await getUserContext();
  const cols = "id, title, status, category_id, position";
  const [{ data: categories }, { data: open }, { data: done }] = await Promise.all([
    supabase.from("categories").select("id, name, color").order("sort_order").order("created_at"),
    supabase.from("study_items").select(cols).neq("status", "done").order("position"),
    supabase.from("study_items").select(cols).eq("status", "done").order("completed_at", { ascending: false }).limit(DONE_LIMIT),
  ]);

  return <Board items={[...(open ?? []), ...(done ?? [])]} categories={categories ?? []} />;
}

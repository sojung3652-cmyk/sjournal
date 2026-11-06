import Link from "next/link";
import { Suspense } from "react";
import { PageContainer } from "@/components/app/page-container";
import { Section } from "@/components/app/section";
import { DayClose } from "@/components/day/day-close";
import { InProgressCards, ItemChecklist } from "@/components/day/item-checklist";
import { NoteList } from "@/components/day/note-list";
import { QuickAdd } from "@/components/day/quick-add";
import { getDayData, getStreak } from "@/lib/data/day";
import { formatDayLong } from "@/lib/dates";
import { getUserContext } from "@/lib/user";

export default function TodayPage() {
  return (
    <PageContainer>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중</p>}>
        <Today />
      </Suspense>
    </PageContainer>
  );
}

async function Today() {
  const { supabase, timezone, today } = await getUserContext();
  const [data, streak] = await Promise.all([getDayData(supabase, today, timezone), getStreak(supabase, today)]);
  const { categories, log, completed, inProgress, notes } = data;

  // Today's checklist: everything in the 'today' column (carried over until done) + what was finished today.
  const { data: todayItems } = await supabase
    .from("study_items")
    .select("id, title, status, category_id")
    .eq("status", "today")
    .order("position");
  const checklist = [...(todayItems ?? []), ...completed.filter((c) => !(todayItems ?? []).some((t) => t.id === c.id))];

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">오늘</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDayLong(today)}</p>
        </div>
        <p className="text-sm" aria-label="연속 기록">
          <span className="font-semibold text-accent-strong">{streak.days}일</span>{" "}
          <span className="text-muted-foreground">연속 기록</span>
        </p>
      </header>

      <Section title="빠른 추가">
        <QuickAdd />
      </Section>

      <Section
        title="오늘 할 것"
        aside={
          <Link href="/board" className="text-xs text-muted-foreground hover:text-foreground">
            보드에서 추가
          </Link>
        }
      >
        <ItemChecklist items={checklist} categories={categories} empty="오늘 할 일이 없습니다. 보드에서 '오늘' 칸으로 옮겨 보세요." />
      </Section>

      <Section title="진행 중">
        <InProgressCards items={inProgress} categories={categories} />
      </Section>

      <Section
        title="오늘의 노트"
        aside={
          <Link href={`/day/${today}`} className="text-xs text-muted-foreground hover:text-foreground">
            데일리 페이지
          </Link>
        }
      >
        <NoteList notes={notes} categories={categories} timezone={timezone} />
      </Section>

      <Section title="하루 마무리">
        <DayClose day={today} reflection={log?.reflection ?? null} />
      </Section>
    </div>
  );
}

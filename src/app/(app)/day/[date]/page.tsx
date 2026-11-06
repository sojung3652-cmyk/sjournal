import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/app/page-container";
import { Section } from "@/components/app/section";
import { GuideView, JournalView } from "@/components/ai/day-ai";
import { ItemChecklist } from "@/components/day/item-checklist";
import { NoteList } from "@/components/day/note-list";
import { buttonVariants } from "@/components/ui/button";
import { getDayData } from "@/lib/data/day";
import { addDays, formatDayLong, isValidDay } from "@/lib/dates";
import { guideSchema } from "@/lib/prompts/guide";
import { journalSchema } from "@/lib/prompts/journal";
import { getUserContext } from "@/lib/user";

export default function DayPage({ params }: PageProps<"/day/[date]">) {
  return (
    <PageContainer>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중</p>}>
        <Day params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function Day({ params }: { params: PageProps<"/day/[date]">["params"] }) {
  const { date } = await params;
  if (!isValidDay(date)) notFound();
  const { supabase, timezone, today } = await getUserContext();
  const { categories, log, planned, completed, notes } = await getDayData(supabase, date, timezone);
  const journal = journalSchema.safeParse(log?.ai_journal);
  const guide = guideSchema.safeParse(log?.ai_guide);
  const nav = buttonVariants({ variant: "ghost", size: "icon-sm" });

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2 flex items-center justify-between gap-2">
        <Link href={`/day/${addDays(date, -1)}`} className={nav} aria-label="이전 날">
          <ChevronLeft />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-semibold">{formatDayLong(date)}</h1>
          {date === today ? (
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              오늘 화면으로
            </Link>
          ) : (
            <Link href={`/day/${today}`} className="text-xs text-muted-foreground hover:text-foreground">
              오늘로 이동
            </Link>
          )}
        </div>
        <Link href={`/day/${addDays(date, 1)}`} className={nav} aria-label="다음 날">
          <ChevronRight />
        </Link>
      </header>

      <Section title="계획">
        <ItemChecklist items={planned} categories={categories} empty="이 날 계획한 항목이 없습니다." />
      </Section>

      <Section title="완료">
        <ItemChecklist items={completed} categories={categories} uncheckedStatus="in_progress" empty="이 날 완료한 항목이 없습니다." />
      </Section>

      <Section title="노트">
        <NoteList notes={notes} categories={categories} timezone={timezone} empty="이 날 노트가 없습니다." />
      </Section>

      <Section title="저널">
        <div className="flex flex-col gap-3">
          {log?.reflection && <p className="text-sm">&ldquo;{log.reflection}&rdquo;</p>}
          {journal.success && <JournalView journal={journal.data} />}
          {guide.success && <GuideView guide={guide.data} />}
          {!log?.reflection && !journal.success && !guide.success && (
            <p className="text-sm text-muted-foreground">이 날 저널이 없습니다.</p>
          )}
        </div>
      </Section>
    </div>
  );
}

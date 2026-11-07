import Link from "next/link";
import { Suspense } from "react";
import { PageContainer } from "@/components/app/page-container";
import { Section } from "@/components/app/section";
import { GuideDraft, JournalDraft, SuggestedTasks } from "@/components/ai/day-ai";
import { DayClose } from "@/components/day/day-close";
import { InProgressCards, ItemChecklist } from "@/components/day/item-checklist";
import { NoteList } from "@/components/day/note-list";
import { QuickAdd } from "@/components/day/quick-add";
import { getDayData, getStreak } from "@/lib/data/day";
import { aiAvailable } from "@/lib/ai/run";
import { getLocale, getTranslations } from "next-intl/server";
import { addDays, formatDayLong } from "@/lib/dates";
import { guideSchema } from "@/lib/prompts/guide";
import { journalSchema } from "@/lib/prompts/journal";
import { getUserContext } from "@/lib/user";

export default function TodayPage() {
  return (
    <PageContainer>
      <Suspense fallback={<span />}>
        <Today />
      </Suspense>
    </PageContainer>
  );
}

async function Today() {
  const { supabase, timezone, today } = await getUserContext();
  const [t, locale] = await Promise.all([getTranslations("today"), getLocale()]);
  const [data, streak] = await Promise.all([getDayData(supabase, today, timezone), getStreak(supabase, today)]);
  const { categories, log, completed, inProgress, notes } = data;

  // Today's checklist: everything in the 'today' column (carried over until done) + what was finished today.
  const { data: todayItems } = await supabase
    .from("study_items")
    .select("id, title, status, category_id")
    .eq("status", "today")
    .order("position");
  const { data: yesterday } = await supabase.from("daily_logs").select("ai_guide").eq("log_date", addDays(today, -1)).maybeSingle();
  const yesterdayGuide = guideSchema.safeParse(yesterday?.ai_guide);
  const savedJournal = journalSchema.safeParse(log?.ai_journal);
  const savedGuide = guideSchema.safeParse(log?.ai_guide);
  const aiEnabled = aiAvailable();
  const checklist = [...(todayItems ?? []), ...completed.filter((c) => !(todayItems ?? []).some((t) => t.id === c.id))];

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDayLong(today, locale)}</p>
        </div>
        <p className="text-sm font-medium text-accent-strong" title={t("streakLabel")}>
          {t("streak", { days: streak.days })}
        </p>
      </header>

      <Section title={t("quickAdd")}>
        <QuickAdd categories={categories} aiEnabled={aiEnabled} />
      </Section>

      {yesterdayGuide.success && (
        <SuggestedTasks
          guide={yesterdayGuide.data}
          existingTitles={[...(todayItems ?? []), ...completed, ...inProgress].map((i) => i.title)}
        />
      )}

      <Section
        title={t("tasks")}
        aside={
          <Link href="/board" className="text-xs text-muted-foreground hover:text-foreground">
            {t("addFromBoard")}
          </Link>
        }
      >
        <ItemChecklist items={checklist} categories={categories} empty={t("emptyTasks")} />
      </Section>

      <Section title={t("inProgress")}>
        <InProgressCards items={inProgress} categories={categories} />
      </Section>

      <Section
        title={t("notes")}
        aside={
          <Link href={`/day/${today}`} className="text-xs text-muted-foreground hover:text-foreground">
            {t("dailyPage")}
          </Link>
        }
      >
        <NoteList notes={notes} categories={categories} timezone={timezone} />
      </Section>

      <Section title={t("wrapUpTitle")}>
        <DayClose day={today} reflection={log?.reflection ?? null}>
          <JournalDraft day={today} saved={savedJournal.success ? savedJournal.data : null} enabled={aiEnabled} />
          <GuideDraft day={today} saved={savedGuide.success ? savedGuide.data : null} enabled={aiEnabled} />
        </DayClose>
      </Section>
    </div>
  );
}

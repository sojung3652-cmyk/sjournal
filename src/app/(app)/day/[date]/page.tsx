import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/app/page-container";
import { Section } from "@/components/app/section";
import { GuideView, JournalView } from "@/components/ai/day-ai";
import { ItemChecklist } from "@/components/day/item-checklist";
import { NoteList } from "@/components/day/note-list";
import { LinkCard, LinkGrid } from "@/components/links/link-card";
import { PendingRefresher } from "@/components/links/pending-refresher";
import { buttonVariants } from "@/components/ui/button";
import { getDayData } from "@/lib/data/day";
import { getLocale, getTranslations } from "next-intl/server";
import { addDays, formatDayLong, isValidDay } from "@/lib/dates";
import { guideSchema } from "@/lib/prompts/guide";
import { journalSchema } from "@/lib/prompts/journal";
import { getUserContext } from "@/lib/user";

export default function DayPage({ params }: PageProps<"/day/[date]">) {
  return (
    <PageContainer>
      <Suspense fallback={<span />}>
        <Day params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function Day({ params }: { params: PageProps<"/day/[date]">["params"] }) {
  const { date } = await params;
  if (!isValidDay(date)) notFound();
  const { supabase, timezone, today } = await getUserContext();
  const [t, locale] = await Promise.all([getTranslations("day"), getLocale()]);
  const { categories, log, planned, completed, notes, links } = await getDayData(supabase, date, timezone);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const journal = journalSchema.safeParse(log?.ai_journal);
  const guide = guideSchema.safeParse(log?.ai_guide);
  const nav = buttonVariants({ variant: "ghost", size: "icon-sm" });

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2 flex items-center justify-between gap-2">
        <Link href={`/day/${addDays(date, -1)}`} className={nav} aria-label={t("prev")}>
          <ChevronLeft />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-semibold">{formatDayLong(date, locale)}</h1>
          {date === today ? (
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              {t("goToday")}
            </Link>
          ) : (
            <Link href={`/day/${today}`} className="text-xs text-muted-foreground hover:text-foreground">
              {t("jumpToday")}
            </Link>
          )}
        </div>
        <Link href={`/day/${addDays(date, 1)}`} className={nav} aria-label={t("next")}>
          <ChevronRight />
        </Link>
      </header>

      <Section title={t("plan")}>
        <ItemChecklist items={planned} categories={categories} empty={t("noPlan")} />
      </Section>

      <Section title={t("done")}>
        <ItemChecklist items={completed} categories={categories} uncheckedStatus="in_progress" empty={t("noDone")} />
      </Section>

      <Section title={t("notes")}>
        <NoteList notes={notes} categories={categories} timezone={timezone} empty={t("noNotes")} />
      </Section>

      {links.length > 0 && (
        <Section title={t("links")}>
          <PendingRefresher active={links.some((l) => l.fetch_status === "pending")} />
          <LinkGrid>
            {links.map((l) => (
              <LinkCard key={l.id} link={l} category={l.category_id ? catById.get(l.category_id) : undefined} timezone={timezone} />
            ))}
          </LinkGrid>
        </Section>
      )}

      <Section title={t("journal")}>
        <div className="flex flex-col gap-3">
          {log?.reflection && <p className="text-sm">&ldquo;{log.reflection}&rdquo;</p>}
          {journal.success && <JournalView journal={journal.data} />}
          {guide.success && <GuideView guide={guide.data} />}
          {!log?.reflection && !journal.success && !guide.success && (
            <p className="text-sm text-muted-foreground">{t("noJournal")}</p>
          )}
        </div>
      </Section>
    </div>
  );
}

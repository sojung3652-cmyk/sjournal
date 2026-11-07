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
import { addDays, formatDayLong, isValidDay } from "@/lib/dates";
import { guideSchema } from "@/lib/prompts/guide";
import { journalSchema } from "@/lib/prompts/journal";
import { getUserContext } from "@/lib/user";

export default function DayPage({ params }: PageProps<"/day/[date]">) {
  return (
    <PageContainer>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading</p>}>
        <Day params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function Day({ params }: { params: PageProps<"/day/[date]">["params"] }) {
  const { date } = await params;
  if (!isValidDay(date)) notFound();
  const { supabase, timezone, today } = await getUserContext();
  const { categories, log, planned, completed, notes, links } = await getDayData(supabase, date, timezone);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const journal = journalSchema.safeParse(log?.ai_journal);
  const guide = guideSchema.safeParse(log?.ai_guide);
  const nav = buttonVariants({ variant: "ghost", size: "icon-sm" });

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2 flex items-center justify-between gap-2">
        <Link href={`/day/${addDays(date, -1)}`} className={nav} aria-label="Previous day">
          <ChevronLeft />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-semibold">{formatDayLong(date)}</h1>
          {date === today ? (
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              Go to Today
            </Link>
          ) : (
            <Link href={`/day/${today}`} className="text-xs text-muted-foreground hover:text-foreground">
              Jump to today
            </Link>
          )}
        </div>
        <Link href={`/day/${addDays(date, 1)}`} className={nav} aria-label="Next day">
          <ChevronRight />
        </Link>
      </header>

      <Section title="Plan">
        <ItemChecklist items={planned} categories={categories} empty="Nothing was planned for this day." />
      </Section>

      <Section title="Done">
        <ItemChecklist items={completed} categories={categories} uncheckedStatus="in_progress" empty="Nothing was completed this day." />
      </Section>

      <Section title="Notes">
        <NoteList notes={notes} categories={categories} timezone={timezone} empty="No notes for this day." />
      </Section>

      {links.length > 0 && (
        <Section title="Links">
          <PendingRefresher active={links.some((l) => l.fetch_status === "pending")} />
          <LinkGrid>
            {links.map((l) => (
              <LinkCard key={l.id} link={l} category={l.category_id ? catById.get(l.category_id) : undefined} timezone={timezone} />
            ))}
          </LinkGrid>
        </Section>
      )}

      <Section title="Journal">
        <div className="flex flex-col gap-3">
          {log?.reflection && <p className="text-sm">&ldquo;{log.reflection}&rdquo;</p>}
          {journal.success && <JournalView journal={journal.data} />}
          {guide.success && <GuideView guide={guide.data} />}
          {!log?.reflection && !journal.success && !guide.success && (
            <p className="text-sm text-muted-foreground">No journal for this day.</p>
          )}
        </div>
      </Section>
    </div>
  );
}

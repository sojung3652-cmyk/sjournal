import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/app/page-container";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { categoryHex } from "@/lib/categories";
import { addDays } from "@/lib/dates";
import { getUserContext } from "@/lib/user";
import { cn } from "@/lib/utils";

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <PageContainer>
      <PageHeader title="캘린더" description="기록한 날에는 과목 색 점이 표시됩니다." />
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중</p>}>
        <Month searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_DOTS = 3;

function parseMonth(raw: unknown, fallback: string): string {
  const v = typeof raw === "string" ? raw : "";
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : fallback;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

async function Month({ searchParams }: { searchParams: PageProps<"/calendar">["searchParams"] }) {
  const { supabase, today } = await getUserContext();
  const month = parseMonth((await searchParams).month, today.slice(0, 7));
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);

  const [{ data: activity }, { data: categories }] = await Promise.all([
    supabase.rpc("activity_days", { p_from: first, p_to: last }),
    supabase.from("categories").select("id, name, color").order("sort_order"),
  ]);
  const cats = categories ?? [];
  const catById = new Map(cats.map((c) => [c.id, c]));
  const order = new Map(cats.map((c, i) => [c.id, i]));
  const byDay = new Map((activity ?? []).map((a) => [a.day, a.category_ids]));

  // Grid starts on Sunday.
  const startOffset = new Date(`${first}T00:00:00Z`).getUTCDay();
  const gridStart = addDays(first, -startOffset);
  const totalCells = Math.ceil((startOffset + Number(last.slice(8))) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));
  const [y, m] = month.split("-");
  const nav = buttonVariants({ variant: "ghost", size: "icon-sm" });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href={`/calendar?month=${shiftMonth(month, -1)}`} className={nav} aria-label="이전 달">
          <ChevronLeft />
        </Link>
        <h2 className="text-base font-medium">
          {y}년 {Number(m)}월
        </h2>
        <Link href={`/calendar?month=${shiftMonth(month, 1)}`} className={nav} aria-label="다음 달">
          <ChevronRight />
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const inMonth = day.startsWith(month);
            const ids = byDay.get(day);
            const recorded = ids !== undefined;
            const dots = (ids ?? [])
              .filter((id) => catById.has(id))
              .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
              .slice(0, MAX_DOTS);
            const names = dots.map((id) => catById.get(id)?.name).join(", ");
            return (
              <Link
                key={day}
                href={`/day/${day}`}
                data-day={day}
                data-recorded={recorded || undefined}
                aria-label={`${day}${recorded ? ` 기록 있음${names ? ` (${names})` : ""}` : ""}`}
                className={cn(
                  "flex aspect-square flex-col items-center gap-1 border-t p-1 text-sm hover:bg-muted sm:aspect-auto sm:h-20 sm:items-start sm:p-2",
                  i % 7 !== 0 && "border-l",
                  !inMonth && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    day === today && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                {recorded && (
                  <span className="flex gap-0.5" aria-hidden>
                    {dots.length ? (
                      dots.map((id) => (
                        <span
                          key={id}
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: categoryHex(catById.get(id)?.color ?? "") }}
                        />
                      ))
                    ) : (
                      <span className="size-1.5 rounded-full bg-accent-strong" />
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {cats.length > 0 && (
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: categoryHex(c.color) }} aria-hidden />
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

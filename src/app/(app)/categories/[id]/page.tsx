import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, ChevronLeft, Circle, FileText, Link2, StickyNote } from "lucide-react";
import { PageContainer } from "@/components/app/page-container";
import { Section } from "@/components/app/section";
import { CategoryBadge } from "@/components/category-badge";
import { plainPreview } from "@/components/day/note-list";
import { LinkCard, LinkGrid, type LinkCardData } from "@/components/links/link-card";
import { PendingRefresher } from "@/components/links/pending-refresher";
import { aiAvailable } from "@/lib/ai/run";
import {
  RANGE_LABEL,
  TYPE_LABEL,
  categoryStats,
  getCategoryRecords,
  parseRange,
  parseType,
  rangeWindow,
  type CategoryRecord,
  type RangeKey,
  type RecordType,
} from "@/lib/data/category";
import { formatDayLong, formatDayShort } from "@/lib/dates";
import { categorySummarySchema } from "@/lib/prompts/category-summary";
import { STUDY_STATUSES } from "@/lib/study";
import { getUserContext } from "@/lib/user";
import { cn } from "@/lib/utils";
import { CategorySummaryPanel, PastSummaries } from "./category-summary";

export default function CategoryDetailPage({ params, searchParams }: PageProps<"/categories/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading</p>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_LABEL = Object.fromEntries(STUDY_STATUSES.map((s) => [s.key, s.label]));

async function Detail({
  params,
  searchParams,
}: {
  params: PageProps<"/categories/[id]">["params"];
  searchParams: PageProps<"/categories/[id]">["searchParams"];
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sp = await searchParams;
  const type = parseType(sp.type);
  const range = parseRange(sp.range);
  const byTag = sp.group === "tag";

  const { supabase, timezone, today } = await getUserContext();
  const { data: category } = await supabase.from("categories").select("id, name, color").eq("id", id).maybeSingle();
  if (!category) notFound();

  const window = rangeWindow(range, today);
  const [all, { data: summaries }] = await Promise.all([
    getCategoryRecords(supabase, id, window, timezone),
    supabase.from("category_summaries").select("id, period_start, period_end, content, created_at").eq("category_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const stats = categoryStats(all);
  const linkCards: LinkCardData[] = all
    .filter((r) => r.kind === "link")
    .map((r) => ({
      id: r.id,
      url: r.url ?? "",
      title: r.title,
      site_name: r.siteName ?? null,
      image_url: r.imageUrl ?? null,
      favicon_url: r.faviconUrl ?? null,
      ai_summary: { lines: r.summary ?? [] },
      category_id: id,
      created_at: r.at,
      fetch_status: r.fetchStatus ?? "done",
    }));
  const records = type === "all" ? all : all.filter((r) => r.kind === type);

  const href = (patch: Partial<{ type: RecordType; range: RangeKey; group: string }>) => {
    const q = new URLSearchParams();
    const next = { type, range, group: byTag ? "tag" : "", ...patch };
    if (next.type !== "all") q.set("type", next.type);
    if (next.range !== "all") q.set("range", next.range);
    if (next.group) q.set("group", next.group);
    const s = q.toString();
    return `/categories/${id}${s ? `?${s}` : ""}`;
  };

  const past = (summaries ?? []).flatMap((s) => {
    const parsed = categorySummarySchema.safeParse(s.content);
    if (!parsed.success) return [];
    const period = s.period_start ? `${formatDayShort(s.period_start)} – ${formatDayShort(s.period_end)}` : `Up to ${formatDayShort(s.period_end)}`;
    return [{ id: s.id, label: `${period} · saved ${new Date(s.created_at).toLocaleDateString("en-US", { timeZone: timezone, month: "short", day: "numeric" })}`, summary: parsed.data }];
  });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/categories" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Categories
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <CategoryBadge name={category.name} color={category.color} className="px-3 py-1 text-base" />
        <h1 className="sr-only">{category.name}</h1>
        <span className="text-sm text-muted-foreground">{RANGE_LABEL[range]}</span>
      </header>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4" aria-label="Summary">
        <Stat label="Records" value={stats.total} />
        <Stat label="Completed items" value={stats.completed} />
        <Stat label="Last studied" value={stats.lastDay ? formatDayShort(stats.lastDay) : "—"} />
        <Stat label="Days studied" value={stats.activeDays} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented label="Type" options={(Object.keys(TYPE_LABEL) as RecordType[]).map((k) => ({ key: k, label: TYPE_LABEL[k], href: href({ type: k }) }))} active={type} />
        <Segmented label="Period" options={(["week", "month", "all"] as RangeKey[]).map((k) => ({ key: k, label: RANGE_LABEL[k], href: href({ range: k }) }))} active={range} />
      </div>

      <Section title="AI summary">
        <CategorySummaryPanel categoryId={id} range={range} rangeLabel={RANGE_LABEL[range]} enabled={aiAvailable()} />
      </Section>

      <Section
        title={`${TYPE_LABEL[type]} · ${records.length}`}
        aside={
          <Link href={href({ group: byTag ? "" : "tag" })} className="text-xs text-muted-foreground hover:text-foreground" aria-pressed={byTag}>
            {byTag ? "Group by date" : "Group by tag"}
          </Link>
        }
      >
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded for this filter.</p>
        ) : type === "link" && !byTag ? (
          <LinkGrid>
            {linkCards.map((l) => (
              <LinkCard key={l.id} link={l} category={{ name: category.name, color: category.color }} timezone={timezone} />
            ))}
          </LinkGrid>
        ) : (
          <Grouped records={records} byTag={byTag} />
        )}
      </Section>

      {linkCards.length > 0 && type === "all" && (
        <Section title={`Links · ${linkCards.length}`}>
          <PendingRefresher active={linkCards.some((l) => l.fetch_status === "pending")} />
          <LinkGrid>
            {linkCards.map((l) => (
              <LinkCard key={l.id} link={l} category={{ name: category.name, color: category.color }} timezone={timezone} />
            ))}
          </LinkGrid>
        </Section>
      )}

      <Section title="Past summaries">
        {/* key: remount when a new summary is saved so the newest one opens */}
        <PastSummaries key={past[0]?.id ?? "none"} items={past} />
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Segmented<K extends string>({ label, options, active }: { label: string; options: { key: K; label: string; href: string }[]; active: K }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-lg border bg-card p-0.5">
      {options.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          aria-current={o.key === active ? "true" : undefined}
          className={cn("rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground", o.key === active && "bg-muted font-medium text-foreground")}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

function Grouped({ records, byTag }: { records: CategoryRecord[]; byTag: boolean }) {
  const groups = new Map<string, CategoryRecord[]>();
  for (const r of records) {
    const keys = byTag ? (r.tags.length ? r.tags : ["Untagged"]) : [r.day];
    for (const k of keys) groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const entries = [...groups.entries()];
  if (byTag) entries.sort(([a, x], [b, y]) => (a === "Untagged" ? 1 : b === "Untagged" ? -1 : y.length - x.length || a.localeCompare(b)));
  return (
    <div className="flex flex-col gap-5">
      {entries.map(([key, rs]) => (
        <div key={key}>
          <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">{byTag ? (key === "Untagged" ? key : `#${key}`) : formatDayLong(key)}</h3>
          <ul className="flex flex-col divide-y rounded-lg border">
            {rs.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <RecordRow r={r} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RecordRow({ r }: { r: CategoryRecord }) {
  if (r.kind === "item") {
    const done = r.status === "done";
    const Icon = done ? CheckCircle2 : Circle;
    return (
      <Link href="/board" className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted">
        <Icon className={cn("size-4 shrink-0", done ? "text-accent-strong" : "text-muted-foreground")} />
        <span className={cn("min-w-0 flex-1 truncate text-sm", done && "text-muted-foreground line-through")}>{r.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABEL[r.status ?? "backlog"]}</span>
      </Link>
    );
  }
  if (r.kind === "link") {
    return (
      <Link href={`/links/${r.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted">
        <Link2 className="size-4 shrink-0 text-accent-strong" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{r.title}</p>
          {r.summary?.[0] && <p className="truncate text-xs text-muted-foreground">{r.summary[0]}</p>}
        </div>
        {r.siteName && <span className="shrink-0 text-xs text-muted-foreground">{r.siteName}</span>}
      </Link>
    );
  }
  const Icon = r.sourceType === "pdf" || r.sourceType === "image" ? FileText : StickyNote;
  const preview = plainPreview(r.content ?? "");
  return (
    <Link href={`/notes/${r.id}`} className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted">
      <Icon className="mt-0.5 size-4 shrink-0 text-accent-strong" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{r.title}</p>
        {preview && preview !== r.title && <p className="truncate text-xs text-muted-foreground">{preview}</p>}
      </div>
      {r.tags.length > 0 && <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">#{r.tags.slice(0, 2).join(" #")}</span>}
    </Link>
  );
}

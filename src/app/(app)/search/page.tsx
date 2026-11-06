import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { PageContainer } from "@/components/app/page-container";
import { PageHeader } from "@/components/app/page-header";
import { CategoryBadge } from "@/components/category-badge";
import { plainPreview } from "@/components/day/note-list";
import { Input } from "@/components/ui/input";
import { formatDayShort } from "@/lib/dates";
import { getUserContext } from "@/lib/user";

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <PageContainer>
      <PageHeader title="검색" description="노트 제목, 본문, 태그를 함께 찾습니다." />
      <Suspense fallback={<SearchForm defaultValue="" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/search" role="search" className="relative mb-6">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        defaultValue={defaultValue}
        aria-label="검색어"
        placeholder="예: 역전파, 미분"
        className="h-10 pl-9"
        autoFocus
      />
    </form>
  );
}

/** About 140 chars around the first matching word. */
function snippet(text: string, q: string): string {
  const plain = plainPreview(text);
  const lower = plain.toLowerCase();
  const hits = q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => lower.indexOf(w))
    .filter((i) => i >= 0);
  if (!hits.length) return plain.slice(0, 140);
  const start = Math.max(0, Math.min(...hits) - 40);
  return (start > 0 ? "…" : "") + plain.slice(start, start + 140) + (start + 140 < plain.length ? "…" : "");
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);
  if (!q) return <SearchForm defaultValue="" />;

  const { supabase } = await getUserContext();
  const [{ data, error }, { data: categories }] = await Promise.all([
    supabase.rpc("search_notes", { q, max_results: 50 }),
    supabase.from("categories").select("id, name, color"),
  ]);
  const byId = new Map((categories ?? []).map((c) => [c.id, c]));

  return (
    <>
      <SearchForm defaultValue={q} />
      {error ? (
        <p className="text-sm text-destructive">검색하지 못했습니다.</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">&lsquo;{q}&rsquo;에 대한 결과가 없습니다.</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{data.length}개 결과</p>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {data.map((n) => {
              // Generated RPC types mark these non-null; they can be null at runtime.
              const categoryId = n.category_id as string | null;
              const cat = categoryId ? byId.get(categoryId) : undefined;
              const tags = n.tags ?? [];
              const logDate = n.log_date as string | null;
              return (
                <li key={n.id}>
                  <Link href={`/notes/${n.id}`} className="flex flex-col gap-1.5 p-4 hover:bg-muted">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{(n.title as string | null) || "제목 없음"}</p>
                      {logDate && <span className="shrink-0 text-xs text-muted-foreground">{formatDayShort(logDate)}</span>}
                    </div>
                    {n.content && <p className="line-clamp-2 text-xs text-muted-foreground">{snippet(n.content, q)}</p>}
                    {(cat || tags.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {cat && <CategoryBadge name={cat.name} color={cat.color} />}
                        {tags.map((t) => (
                          <span key={t} className="rounded-full border px-2 py-0.5">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { PageContainer } from "@/components/app/page-container";
import { PageHeader } from "@/components/app/page-header";
import { CategoryBadge } from "@/components/category-badge";
import { AddLinkForm } from "@/components/links/add-link-form";
import { LinkCard, LinkGrid } from "@/components/links/link-card";
import { PendingRefresher } from "@/components/links/pending-refresher";
import { Input } from "@/components/ui/input";
import { getUserContext } from "@/lib/user";
import { cn } from "@/lib/utils";

export default function LinksPage({ searchParams }: PageProps<"/links">) {
  return (
    <PageContainer wide>
      <PageHeader title="Links" description="Saved pages with previews and AI summaries." />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading</p>}>
        <LinksContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

const LINK_COLS = "id, url, title, site_name, image_url, favicon_url, ai_summary, category_id, created_at, fetch_status";

/** Escape LIKE wildcards so user input is matched literally. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

async function LinksContent({ searchParams }: { searchParams: PageProps<"/links">["searchParams"] }) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 100);
  const cat = typeof sp.category === "string" ? sp.category : "";
  const { supabase, timezone } = await getUserContext();

  let query = supabase.from("links").select(LINK_COLS).order("created_at", { ascending: false }).limit(120);
  if (cat === "none") query = query.is("category_id", null);
  else if (cat) query = query.eq("category_id", cat);
  // Every word must appear in title / description / summary / keywords / memo (search_text, trigram-indexed).
  for (const w of q.split(/\s+/).filter(Boolean)) query = query.ilike("search_text", `%${likeEscape(w)}%`);

  const [{ data: links }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, name, color").order("sort_order").order("created_at"),
  ]);
  const cats = categories ?? [];
  const byId = new Map(cats.map((c) => [c.id, c]));
  const href = (patch: { q?: string; category?: string }) => {
    const p = new URLSearchParams();
    const next = { q, category: cat, ...patch };
    if (next.q) p.set("q", next.q);
    if (next.category) p.set("category", next.category);
    const s = p.toString();
    return `/links${s ? `?${s}` : ""}`;
  };
  const list = links ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PendingRefresher active={list.some((l) => l.fetch_status === "pending")} />
      <AddLinkForm categories={cats} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category filter">
          <Chip href={href({ category: "" })} active={!cat}>
            All
          </Chip>
          {cats.map((c) => (
            <Chip key={c.id} href={href({ category: c.id })} active={cat === c.id}>
              <CategoryBadge name={c.name} color={c.color} />
            </Chip>
          ))}
          <Chip href={href({ category: "none" })} active={cat === "none"}>
            Uncategorized
          </Chip>
        </div>
        <form action="/links" role="search" className="relative sm:w-64">
          {cat && <input type="hidden" name="category" value={cat} />}
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={q} placeholder="Search links" aria-label="Search links" className="pl-8" />
        </form>
      </div>

      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {q || cat ? "No links match." : "No links yet. Paste a URL above or into Quick add on Today."}
        </p>
      ) : (
        <LinkGrid>
          {list.map((l) => (
            <LinkCard key={l.id} link={l} category={l.category_id ? byId.get(l.category_id) : undefined} timezone={timezone} />
          ))}
        </LinkGrid>
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn("inline-flex h-8 items-center rounded-full border bg-card px-2 text-xs text-muted-foreground", active && "border-accent-strong text-foreground")}
    >
      {children}
    </Link>
  );
}

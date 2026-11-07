import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { PageContainer } from "@/components/app/page-container";
import { hostOf, summaryLines } from "@/components/links/link-card";
import { PendingRefresher } from "@/components/links/pending-refresher";
import { getUserContext } from "@/lib/user";
import { LinkDetail } from "./link-detail";

export default function LinkPage({ params }: PageProps<"/links/[id]">) {
  return (
    <PageContainer>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading</p>}>
        <LinkContent params={params} />
      </Suspense>
    </PageContainer>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function LinkContent({ params }: { params: PageProps<"/links/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, timezone } = await getUserContext();
  const [{ data: link }, { data: categories }] = await Promise.all([
    supabase
      .from("links")
      .select("id, url, title, description, site_name, image_url, favicon_url, ai_summary, keywords, category_id, suggested_category_id, fetch_status, note, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name, color").order("sort_order").order("created_at"),
  ]);
  if (!link) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PendingRefresher active={link.fetch_status === "pending"} />
      <Link href="/links" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Links
      </Link>
      <LinkDetail
        link={{
          ...link,
          site_name: link.site_name ?? hostOf(link.url),
          lines: summaryLines(link.ai_summary),
          saved: new Date(link.created_at).toLocaleDateString("en-US", { timeZone: timezone, year: "numeric", month: "short", day: "numeric" }),
        }}
        categories={categories ?? []}
      />
    </div>
  );
}

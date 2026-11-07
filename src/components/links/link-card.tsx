import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryBadge } from "@/components/category-badge";
import { formatDate } from "@/lib/dates";
import { Favicon, LinkThumb } from "./link-thumb";

export type LinkCardData = {
  id: string;
  url: string;
  title: string | null;
  site_name: string | null;
  image_url: string | null;
  favicon_url: string | null;
  ai_summary: unknown;
  category_id: string | null;
  created_at: string;
  fetch_status: string;
};

export function summaryLines(v: unknown): string[] {
  const lines = (v as { lines?: unknown } | null)?.lines;
  return Array.isArray(lines) ? lines.filter((l): l is string => typeof l === "string").slice(0, 3) : [];
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function LinkCard({
  link,
  category,
  timezone,
}: {
  link: LinkCardData;
  category?: { name: string; color: string };
  timezone: string;
}) {
  const lines = summaryLines(link.ai_summary);
  const pending = link.fetch_status === "pending";
  const [t, locale] = await Promise.all([getTranslations("links"), getLocale()]);
  const date = formatDate(link.created_at, timezone, locale, false);
  return (
    <Link href={`/links/${link.id}`} className="group flex flex-col overflow-hidden rounded-xl border bg-card hover:border-accent-strong" data-link-card>
      <LinkThumb imageUrl={link.image_url} faviconUrl={link.favicon_url} siteName={link.site_name ?? hostOf(link.url)} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Favicon url={link.favicon_url} />
          <span className="truncate">{link.site_name ?? hostOf(link.url)}</span>
          <span className="ml-auto shrink-0">{date}</span>
        </div>
        <p className="line-clamp-2 text-sm font-medium break-words">{link.title ?? link.url}</p>
        {pending ? (
          <p className="text-xs text-muted-foreground">{t("fetching")}</p>
        ) : (
          lines.length > 0 && <p className="line-clamp-3 text-xs text-muted-foreground">{lines.join(" ")}</p>
        )}
        {category && (
          <div className="mt-auto pt-1">
            <CategoryBadge name={category.name} color={category.color} />
          </div>
        )}
      </div>
    </Link>
  );
}

export function LinkGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

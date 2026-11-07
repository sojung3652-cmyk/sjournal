import "server-only";
import { runStructured } from "@/lib/ai/run";
import { buildLinkSummaryInput, linkSummaryPrompt } from "@/lib/prompts/link-summary";
import type { getActionContext } from "@/lib/user";
import { fetchLinkMetadata } from "./metadata";
import { isPublicUrl } from "./safe-fetch";

type Ctx = NonNullable<Awaited<ReturnType<typeof getActionContext>>>;

/**
 * Runs after the link row is saved (via `after()`): metadata -> AI summary.
 * Never throws. If the page can't be fetched the card falls back to site name +
 * favicon; if the summary can't be made (no key, limit, API error) it is skipped quietly.
 */
export async function processLink(ctx: Ctx, linkId: string, locale: string): Promise<void> {
  const { data: link } = await ctx.supabase.from("links").select("url, title").eq("id", linkId).maybeSingle();
  if (!link) return;

  let meta;
  try {
    meta = await fetchLinkMetadata(link.url);
  } catch {
    await ctx.supabase.from("links").update({ fetch_status: "failed" }).eq("id", linkId);
    return;
  }

  // Display-only URLs are loaded by the browser: keep them only if they resolve to public hosts.
  const [imageOk, faviconOk] = await Promise.all([isPublicUrl(meta.imageUrl), isPublicUrl(meta.faviconUrl)]);
  const finalStatus = meta.fetched ? "done" : "failed";
  const canSummarize = meta.fetched || Boolean(meta.title || meta.description);
  // Metadata first (card shows title/image right away). Status stays 'pending' while the
  // summary is still coming, so the page keeps auto-refreshing until it lands.
  await ctx.supabase
    .from("links")
    .update({
      title: link.title ?? meta.title,
      description: meta.description,
      image_url: imageOk ? meta.imageUrl : null,
      site_name: meta.siteName,
      favicon_url: faviconOk ? meta.faviconUrl : null,
      ...(canSummarize ? {} : { fetch_status: finalStatus }),
    })
    .eq("id", linkId);
  if (!canSummarize) return; // nothing to summarize from: skip quietly

  let summary: { ai_summary: { lines: string[] }; keywords: string[]; suggested_category_id: string | null } | null = null;
  try {
    const { data: categories } = await ctx.supabase.from("categories").select("id, name").order("sort_order");
    const res = await runStructured(ctx, linkSummaryPrompt, buildLinkSummaryInput(meta, (categories ?? []).map((c) => c.name)), { locale });
    if (res.ok) {
      const suggested = (categories ?? []).find((c) => c.name === res.data.category);
      summary = { ai_summary: { lines: res.data.lines }, keywords: res.data.keywords, suggested_category_id: suggested?.id ?? null };
    }
  } catch {
    // summary is optional
  }
  await ctx.supabase
    .from("links")
    .update({ ...(summary ?? {}), fetch_status: finalStatus })
    .eq("id", linkId);
}

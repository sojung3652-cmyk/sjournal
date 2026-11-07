import "server-only";
import { after } from "next/server";
import { ensureDailyLog } from "@/lib/data/day";
import type { getActionContext } from "@/lib/user";
import { processLink } from "./process";
import { checkUrl, UnsafeUrlError } from "./safe-fetch";

type Ctx = NonNullable<Awaited<ReturnType<typeof getActionContext>>>;

/**
 * Saves a link for today and schedules metadata + AI summary with `after()`,
 * so the user gets the response immediately; the card shows "Fetching" until done.
 */
export async function createLink(ctx: Ctx, rawUrl: string, categoryId: string | null = null): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  let url: string;
  try {
    url = checkUrl(rawUrl.trim()).toString();
  } catch (e) {
    return { ok: false, error: e instanceof UnsafeUrlError ? "That address can't be saved (only public http/https links)." : "Invalid link." };
  }
  const dailyLogId = await ensureDailyLog(ctx.supabase, ctx.userId, ctx.today);
  const { data, error } = await ctx.supabase
    .from("links")
    .insert({ url, category_id: categoryId, daily_log_id: dailyLogId, fetch_status: "pending" })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Couldn't save the link." };

  after(() => processLink(ctx, data.id));
  return { ok: true, id: data.id };
}

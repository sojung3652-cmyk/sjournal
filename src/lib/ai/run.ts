import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { outputLanguageRule } from "@/lib/prompts/language";
import { AI_DAILY_LIMIT } from "@/lib/ai-limits";
import { dayRangeUtc } from "@/lib/dates";
import type { getActionContext } from "@/lib/user";
import type { Json } from "@/types/database";

type Ctx = NonNullable<Awaited<ReturnType<typeof getActionContext>>>;

export type AiKind = "classify" | "summarize" | "journal" | "guide" | "category_summary" | "link_summary";

export type PromptSpec<T> = {
  kind: AiKind;
  version: string; // bump when the prompt changes so old cache entries are not reused
  model: string;
  maxTokens: number;
  system: string;
  /** JSON schema for structured outputs (no minItems > 1 / maxItems; counts are enforced by `schema`). */
  jsonSchema: Record<string, unknown>;
  schema: z.ZodType<T>;
};

export type AiResult<T> = { ok: true; data: T; cached: boolean } | { ok: false; error: string };

/**
 * Why a fallback path: the app must keep working without AI (no key, no credit,
 * API outage, daily limit). Every caller shows `error` and leaves the rest of the
 * screen usable. Do not throw from here.
 */
export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
  return client;
}

export async function usageToday(ctx: Ctx): Promise<number> {
  const { start, end } = dayRangeUtc(ctx.today, ctx.timezone);
  const { count } = await ctx.supabase
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start)
    .lt("created_at", end);
  return count ?? 0;
}

/**
 * Structured call: output_config.format (JSON schema) -> tolerant JSON parse -> zod safeParse.
 * Why not forced tool_choice: claude-sonnet-5-5 rejects tool_choice "tool"/"any" (400), so
 * structured outputs are used for every model. Keep it this way unless that changes.
 * Order: same-day cache -> daily limit -> API -> validate -> log usage -> cache.
 */
export async function runStructured<T>(
  ctx: Ctx,
  spec: PromptSpec<T>,
  userContent: string,
  opts: { locale?: string } = {},
): Promise<AiResult<T>> {
  // Output language = the user's UI locale (passed explicitly from after() jobs, else from the request).
  const locale = opts.locale ?? (await getLocale());
  const t = await getTranslations({ locale: locale === "ko" ? "ko" : "en", namespace: "ai.errors" });
  const anthropic = getClient();
  if (!anthropic) return { ok: false, error: t("noKey") };

  const system = `${spec.system}\n${outputLanguageRule(locale)}`;
  // Locale is part of the key: the same input in another language is a different result.
  const inputHash = createHash("sha256").update(`${spec.kind}:${spec.version}:${spec.model}:${locale}\n${userContent}`).digest("hex");

  const { data: cached } = await ctx.supabase
    .from("ai_cache")
    .select("output")
    .eq("kind", spec.kind)
    .eq("input_hash", inputHash)
    .eq("day", ctx.today)
    .maybeSingle();
  if (cached) {
    const parsed = spec.schema.safeParse(cached.output);
    if (parsed.success) return { ok: true, data: parsed.data, cached: true };
  }

  if ((await usageToday(ctx)) >= AI_DAILY_LIMIT) {
    return { ok: false, error: t("limit", { limit: AI_DAILY_LIMIT }) };
  }

  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model: spec.model,
      max_tokens: spec.maxTokens,
      system,
      output_config: { format: { type: "json_schema", schema: spec.jsonSchema } },
      messages: [{ role: "user", content: userContent }],
    });
  } catch (e) {
    return { ok: false, error: t(apiErrorKey(e)) };
  }

  // Log usage even if parsing fails: the tokens were spent.
  await ctx.supabase.from("ai_runs").insert({
    kind: spec.kind,
    model: spec.model,
    input_tokens: message.usage?.input_tokens ?? 0,
    output_tokens: message.usage?.output_tokens ?? 0,
  });

  if (message.stop_reason === "max_tokens") {
    return { ok: false, error: t("truncated") };
  }
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = spec.schema.safeParse(safeJson(text));
  if (!parsed.success) {
    // Paths only (no content) so failures can be diagnosed from server logs.
    console.warn(`[ai] ${spec.kind} response failed validation:`, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    return { ok: false, error: t("format") };
  }

  await ctx.supabase
    .from("ai_cache")
    .upsert(
      { kind: spec.kind, input_hash: inputHash, day: ctx.today, output: parsed.data as Json },
      { onConflict: "user_id,kind,input_hash,day", ignoreDuplicates: true },
    );

  return { ok: true, data: parsed.data, cached: false };
}

function apiErrorKey(e: unknown): "badKey" | "credit" | "rateLimit" | "down" | "failed" {
  if (e instanceof Anthropic.APIError) {
    const msg = String(e.message ?? "");
    if (e.status === 401) return "badKey";
    if (e.status === 402 || /credit balance/i.test(msg)) return "credit";
    if (e.status === 429) return "rateLimit";
    if (e.status === 529 || (e.status ?? 0) >= 500) return "down";
  }
  return "failed";
}

/** Tolerant JSON parse (Rule 5): strips code fences / surrounding prose; returns undefined on failure. */
export function safeJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?s*/i, "").replace(/```s*$/, "");
  for (const candidate of [t, t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)]) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next
    }
  }
  return undefined;
}

/** Clip long text so prompts stay within budget. */
export function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}\n…(truncated)` : text;
}

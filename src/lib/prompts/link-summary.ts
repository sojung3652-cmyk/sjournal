import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";
import { LEARNER_LANGUAGE_RULE } from "./language";
import { strList } from "./zod-tolerant";

export const linkSummarySchema = z.object({
  lines: strList(240, 3, 1),
  keywords: strList(30, 3),
  category: z.string().nullable().default(null),
});
export type LinkSummary = z.infer<typeof linkSummarySchema>;

export const linkSummaryPrompt: PromptSpec<LinkSummary> = {
  kind: "link_summary",
  version: "1",
  model: MODELS.fast,
  maxTokens: 1500,
  system: [
    "You summarize a saved web page for a learner's study archive.",
    "- lines: exactly 3 short lines (one sentence each) on what the page is about and why it is useful to study.",
    "- keywords: exactly 3 key terms.",
    "- category: the best match from the given category list (exact name), or null if none fits.",
    "- If only metadata (title/description) is available, summarize from that and do not guess beyond it.",
    LEARNER_LANGUAGE_RULE,
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      lines: { type: "array", items: { type: "string" } },
      keywords: { type: "array", items: { type: "string" } },
      category: { type: ["string", "null"] },
    },
    required: ["lines", "keywords", "category"],
  },
  schema: linkSummarySchema,
};

export function buildLinkSummaryInput(m: { url: string; title: string | null; description: string | null; siteName: string | null; text: string }, categories: string[]) {
  return [
    `Categories: ${categories.join(", ") || "(none)"}`,
    `URL: ${m.url}`,
    `Site: ${m.siteName ?? "(unknown)"}`,
    `Title: ${m.title ?? "(none)"}`,
    `Description: ${m.description ?? "(none)"}`,
    m.text ? `Page text:\n${m.text}` : "Page text: (unavailable — use metadata only)",
  ].join("\n");
}

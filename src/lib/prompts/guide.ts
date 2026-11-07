import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";
import { LANGUAGE_RULE } from "./language";
import { objList, str, strList } from "./zod-tolerant";

export const guideSchema = z.object({
  tasks: objList(
    z.object({ title: str(160), category: z.string().nullable().default(null), reason: z.string().default("").transform((r) => r.trim().slice(0, 300)) }),
    3,
    (t) => Boolean(t.title),
    1,
  ),
  review: strList(160, 5),
  tips: strList(400, 4),
});
export type Guide = z.infer<typeof guideSchema>;

export const guidePrompt: PromptSpec<Guide> = {
  kind: "guide",
  version: "3",
  model: MODELS.smart,
  maxTokens: 8000, // Sonnet thinks first; keep headroom
  system: [
    "You are a study coach. Using the learner's last 7 days, plan the next day.",
    "- tasks: exactly 3 tasks for tomorrow. Prefer existing in-progress and backlog items; each should fit in one day.",
    "  category must be a name from the given category list, or null. reason: one sentence on why now.",
    "- review: 2-5 concepts worth reviewing, taken from recent notes.",
    "- tips: 1-3 concrete ways past the parts the learner found difficult. Empty list if nothing was difficult.",
    "- Do not invent facts that are not in the record.",
    LANGUAGE_RULE,
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { title: { type: "string" }, category: { type: ["string", "null"] }, reason: { type: "string" } },
          required: ["title", "category", "reason"],
        },
      },
      review: { type: "array", items: { type: "string" } },
      tips: { type: "array", items: { type: "string" } },
    },
    required: ["tasks", "review", "tips"],
  },
  schema: guideSchema,
};

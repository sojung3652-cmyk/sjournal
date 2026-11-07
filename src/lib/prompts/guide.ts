import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";
import { LANGUAGE_RULE } from "./language";

export const guideSchema = z.object({
  tasks: z
    .array(z.object({ title: z.string().min(1).max(120), category: z.string().nullable(), reason: z.string().max(200) }))
    .min(1)
    .transform((t) => t.slice(0, 3)),
  review: z.array(z.string().min(1).max(120)).transform((r) => r.slice(0, 5)),
  tips: z.array(z.string().min(1).max(300)).transform((t) => t.slice(0, 4)),
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

import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";
import { LANGUAGE_RULE } from "./language";
import { objList, str, strList } from "./zod-tolerant";

export const categorySummarySchema = z.object({
  topics: objList(z.object({ heading: str(120), points: strList(400, 8) }), 10, (t) => Boolean(t.heading && t.points.length), 1),
  timeline: objList(z.object({ date: str(40), learned: str(240) }), 30, (t) => Boolean(t.learned)),
  weak_spots: strList(400, 8),
  next_up: objList(z.object({ title: str(160), reason: z.string().default("").transform((r) => r.trim().slice(0, 300)) }), 3, (n) => Boolean(n.title), 1),
});
export type CategorySummary = z.infer<typeof categorySummarySchema>;

export const categorySummaryPrompt: PromptSpec<CategorySummary> = {
  kind: "category_summary",
  version: "2",
  model: MODELS.smart,
  maxTokens: 12000, // Sonnet thinks first and the output is long; keep headroom
  system: [
    "You are an editor who organizes everything a learner recorded for one subject over a period.",
    "Read the notes, study items and links, then produce:",
    "- topics: group the material by topic. Each topic has a short heading and 2-5 key points (one sentence each).",
    "- timeline: the order the learner studied things, oldest first. date = YYYY-MM-DD from the record; learned = one short phrase.",
    "- weak_spots: 1-4 things that still look weak, unclear or unfinished (open study items, notes that say confused/hard, gaps).",
    "- next_up: exactly 3 concrete next things to study, each with a one-sentence reason.",
    "- Use only what is in the records. Do not invent facts. If older records were omitted, focus on what is given.",
    LANGUAGE_RULE,
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { heading: { type: "string" }, points: { type: "array", items: { type: "string" } } },
          required: ["heading", "points"],
        },
      },
      timeline: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { date: { type: "string" }, learned: { type: "string" } },
          required: ["date", "learned"],
        },
      },
      weak_spots: { type: "array", items: { type: "string" } },
      next_up: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { title: { type: "string" }, reason: { type: "string" } },
          required: ["title", "reason"],
        },
      },
    },
    required: ["topics", "timeline", "weak_spots", "next_up"],
  },
  schema: categorySummarySchema,
};

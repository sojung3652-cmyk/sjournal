import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";
import { strList } from "./zod-tolerant";

export const classifySchema = z.object({
  category: z.string().nullable().default(null),
  tags: strList(30, 4, 1),
});
export type Classification = z.infer<typeof classifySchema>;

export const classifyPrompt: PromptSpec<Classification> = {
  kind: "classify",
  version: "4",
  model: MODELS.fast,
  maxTokens: 1024,
  system: [
    "You organize a learner's study notes.",
    "Read the note, pick the single best category from the given list, and suggest 2-4 topic tags.",
    "- category: use a name exactly as it appears in the list, or null if none fits.",
    "- tags: short nouns, no #, no duplicates. Proper nouns and technical terms may stay in their original form.",
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      category: { type: ["string", "null"], description: "a category name from the list, or null" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["category", "tags"],
  },
  schema: classifySchema,
};

export function buildClassifyInput(note: { title: string | null; content: string }, categories: string[]): string {
  return [
    `Categories: ${categories.length ? categories.join(", ") : "(none)"}`,
    "",
    `Title: ${note.title ?? "(none)"}`,
    "Content:",
    note.content,
  ].join("\n");
}

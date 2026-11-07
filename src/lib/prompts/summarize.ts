import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";
import { LANGUAGE_RULE } from "./language";
import { objList, str } from "./zod-tolerant";

export const summarySchema = z.object({
  one_line: str(300).refine(Boolean, { message: "empty" }),
  concepts: objList(z.object({ name: str(80), explanation: str(400) }), 5, (c) => Boolean(c.name && c.explanation), 1),
});
export type NoteSummary = z.infer<typeof summarySchema>;

export const summarizePrompt: PromptSpec<NoteSummary> = {
  kind: "summarize",
  version: "3",
  model: MODELS.fast,
  maxTokens: 3000,
  system: [
    "You are an editor who organizes a learner's study note. You summarize what they wrote; you do not study for them.",
    "Extract 3-5 key concepts, explain each in 1-2 sentences, and write a one-line summary of the whole note.",
    "- Do not add content that is not in the note. When unsure, reuse the note's wording.",
    "- Be concise.",
    LANGUAGE_RULE,
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      one_line: { type: "string", description: "one-line summary" },
      concepts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { name: { type: "string" }, explanation: { type: "string" } },
          required: ["name", "explanation"],
        },
      },
    },
    required: ["one_line", "concepts"],
  },
  schema: summarySchema,
};

export function buildSummarizeInput(note: { title: string | null; content: string }): string {
  return [`Title: ${note.title ?? "(none)"}`, "Content:", note.content].join("\n");
}

import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";
import { strList } from "./zod-tolerant";

const lines = (min: number) => strList(400, 6, min);
export const journalSchema = z.object({
  learned: lines(1),
  difficult: lines(0),
  tomorrow: lines(1),
});
export type Journal = z.infer<typeof journalSchema>;

export const journalPrompt: PromptSpec<Journal> = {
  kind: "journal",
  version: "4",
  model: MODELS.smart,
  maxTokens: 8000, // Sonnet thinks first; keep headroom
  system: [
    "You are an editor who turns a learner's day into a short study journal.",
    "From the completed items, notes and one-line reflection, write: learned / difficult / tomorrow.",
    "- Each entry is a one-sentence bullet, 2-4 per list. If nothing was difficult, return an empty list.",
    "- Do not invent facts that are not in the record. Respect the tone and feelings of the reflection.",
    "- Write in the learner's first person.",
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      learned: { type: "array", items: { type: "string" }, description: "what I learned" },
      difficult: { type: "array", items: { type: "string" }, description: "what was difficult" },
      tomorrow: { type: "array", items: { type: "string" }, description: "what to do tomorrow" },
    },
    required: ["learned", "difficult", "tomorrow"],
  },
  schema: journalSchema,
};

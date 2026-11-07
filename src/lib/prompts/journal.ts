import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";
import { LANGUAGE_RULE } from "./language";

const lines = (min: number) =>
  z
    .array(z.string().min(1).max(300))
    .min(min)
    .transform((l) => l.slice(0, 6));
export const journalSchema = z.object({
  learned: lines(1),
  difficult: lines(0),
  tomorrow: lines(1),
});
export type Journal = z.infer<typeof journalSchema>;

export const journalPrompt: PromptSpec<Journal> = {
  kind: "journal",
  version: "3",
  model: MODELS.smart,
  maxTokens: 8000, // Sonnet thinks first; keep headroom
  system: [
    "You are an editor who turns a learner's day into a short study journal.",
    "From the completed items, notes and one-line reflection, write: learned / difficult / tomorrow.",
    "- Each entry is a one-sentence bullet, 2-4 per list. If nothing was difficult, return an empty list.",
    "- Do not invent facts that are not in the record. Respect the tone and feelings of the reflection.",
    "- Write in the learner's first person.",
    LANGUAGE_RULE,
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

import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";

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
  version: "2",
  model: MODELS.smart,
  maxTokens: 8000, // Sonnet thinks first; keep headroom
  system: [
    "너는 학습자의 하루 기록을 저널로 정리하는 편집자다.",
    "완료한 항목, 노트, 학습자의 한 줄 소감을 바탕으로 '배운 것 / 어려웠던 것 / 내일 할 것'을 작성한다.",
    "- 각 항목은 1문장짜리 bullet, 2~4개. 어려웠던 것이 기록에 없으면 빈 배열.",
    "- 기록에 없는 사실을 지어내지 않는다. 소감의 말투와 감정을 존중한다.",
    "- 한국어, 학습자 1인칭 시점(~했다).",
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      learned: { type: "array", items: { type: "string" }, description: "배운 것" },
      difficult: { type: "array", items: { type: "string" }, description: "어려웠던 것" },
      tomorrow: { type: "array", items: { type: "string" }, description: "내일 할 것" },
    },
    required: ["learned", "difficult", "tomorrow"],
  },
  schema: journalSchema,
};

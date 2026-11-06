import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";

export const summarySchema = z.object({
  one_line: z.string().min(1).max(200),
  concepts: z
    .array(z.object({ name: z.string().min(1).max(60), explanation: z.string().min(1).max(300) }))
    .min(1)
    .transform((c) => c.slice(0, 5)),
});
export type NoteSummary = z.infer<typeof summarySchema>;

export const summarizePrompt: PromptSpec<NoteSummary> = {
  kind: "summarize",
  version: "2",
  model: MODELS.fast,
  maxTokens: 3000,
  system: [
    "너는 학습 노트를 정리하는 편집자다. 대신 공부해 주는 것이 아니라, 학습자가 쓴 내용을 정리한다.",
    "노트에서 핵심 개념 3~5개를 뽑아 각각 1~2문장으로 설명하고, 전체를 한 줄로 요약한다.",
    "- 노트에 없는 내용을 지어내지 않는다. 불확실하면 노트 표현을 그대로 쓴다.",
    "- 한국어로, 간결하게.",
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      one_line: { type: "string", description: "한 줄 요약" },
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
  return [`제목: ${note.title ?? "(없음)"}`, "본문:", note.content].join("\n");
}

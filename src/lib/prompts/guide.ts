import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";

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
  version: "2",
  model: MODELS.smart,
  maxTokens: 8000, // Sonnet thinks first; keep headroom
  system: [
    "너는 학습자의 최근 7일 기록을 보고 다음 날 학습을 안내하는 코치다.",
    "- tasks: 내일 할 일 정확히 3개. 진행 중·앞으로 할 것 항목을 우선 활용하고, 하루에 끝낼 수 있는 크기로.",
    "  category는 주어진 카테고리 목록의 이름 또는 null. reason은 왜 지금 해야 하는지 한 문장.",
    "- review: 복습하면 좋을 개념 2~5개 (최근 노트에서).",
    "- tips: 막힌 부분(어려웠던 것)에 대한 구체적인 해결 방향 1~3개. 막힌 부분이 없으면 빈 배열.",
    "- 기록에 없는 사실을 지어내지 않는다. 한국어로.",
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

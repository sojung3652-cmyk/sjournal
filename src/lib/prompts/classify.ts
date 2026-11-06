import { z } from "zod";
import { MODELS } from "@/lib/ai/models";
import type { PromptSpec } from "@/lib/ai/run";

export const classifySchema = z.object({
  category: z.string().nullable(),
  tags: z.array(z.string().min(1).max(30)).min(1).transform((t) => t.slice(0, 4)),
});
export type Classification = z.infer<typeof classifySchema>;

export const classifyPrompt: PromptSpec<Classification> = {
  kind: "classify",
  version: "2",
  model: MODELS.fast,
  maxTokens: 1024,
  system: [
    "너는 학습 노트를 정리하는 편집자다.",
    "노트를 읽고 주어진 카테고리 목록 중 가장 알맞은 하나를 고르고, 핵심 주제 태그 2~4개를 제안한다.",
    "- category는 목록에 있는 이름을 그대로 쓰고, 맞는 것이 없으면 null.",
    "- 태그는 짧은 명사(한국어 우선, 고유명사·기술 용어는 원어 허용), # 없이, 중복 없이.",
  ].join("\n"),
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      category: { type: ["string", "null"], description: "카테고리 목록 중 하나의 이름, 또는 null" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["category", "tags"],
  },
  schema: classifySchema,
};

export function buildClassifyInput(note: { title: string | null; content: string }, categories: string[]): string {
  return [
    `카테고리 목록: ${categories.length ? categories.join(", ") : "(없음)"}`,
    "",
    `제목: ${note.title ?? "(없음)"}`,
    "본문:",
    note.content,
  ].join("\n");
}

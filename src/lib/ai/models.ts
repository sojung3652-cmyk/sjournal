// Model IDs verified against the Anthropic Models API (models.list) on 2026-11-06.
// Haiku-class for classification / short summaries, Sonnet-class for journal / guide (PRD 5).
export const MODELS = {
  fast: "claude-haiku-5-5",
  smart: "claude-sonnet-5-5",
} as const;

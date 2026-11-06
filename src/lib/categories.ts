// Fixed category palette. DB stores the key (categories.color has a check
// constraint on these 8 keys); the UI maps key -> hex so every screen uses
// the same color per category.
export const CATEGORY_COLORS = [
  { key: "blue", label: "파랑", hex: "#3b82f6" },
  { key: "green", label: "초록", hex: "#22c55e" },
  { key: "orange", label: "주황", hex: "#f97316" },
  { key: "violet", label: "보라", hex: "#8b5cf6" },
  { key: "red", label: "빨강", hex: "#ef4444" },
  { key: "yellow", label: "노랑", hex: "#eab308" },
  { key: "teal", label: "청록", hex: "#14b8a6" },
  { key: "pink", label: "분홍", hex: "#ec4899" },
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number]["key"];

const COLOR_KEYS = new Set<string>(CATEGORY_COLORS.map((c) => c.key));

export function isCategoryColor(value: string): value is CategoryColor {
  return COLOR_KEYS.has(value);
}

export function categoryHex(color: string): string {
  return CATEGORY_COLORS.find((c) => c.key === color)?.hex ?? "#a3a3a3";
}

export const CATEGORY_NAME_MAX = 30;

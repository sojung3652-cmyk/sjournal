// Contrast audit for theme tokens and category badges.
// Run: npm run check:contrast   (exits 1 if any text pair is below its minimum)
import { CATEGORY_COLORS, categoryStyle, contrastRatio, MIN_CONTRAST } from "../src/lib/categories.ts";

// Keep in sync with src/app/globals.css.
const light = {
  background: "#FBF7F2", card: "#FFFFFF", foreground: "#3F3638", muted: "#F7F2ED",
  mutedForeground: "#766B6C", primary: "#EBC1C8", primaryForeground: "#5A2E36",
  accentStrong: "#B77A85", aiSurface: "#F6E3E6", aiForeground: "#5A3F44", destructive: "#B23A3A",
};
const dark = {
  background: "#2A2425", card: "#352E2F", foreground: "#F3ECE8", muted: "#3F3637",
  mutedForeground: "#B3A7A8", primary: "#D9A3AC", primaryForeground: "#2A1A1D",
  accentStrong: "#D9A3AC", aiSurface: "#4A3A3D", aiForeground: "#F3DDE1", destructive: "#F08A84",
};

type Row = [string, string, string, number];
const rows: Row[] = [];
for (const [mode, t] of [["light", light], ["dark", dark]] as const) {
  rows.push(
    [`${mode} foreground / background`, t.foreground, t.background, 4.5],
    [`${mode} foreground / card`, t.foreground, t.card, 4.5],
    [`${mode} muted-fg / background`, t.mutedForeground, t.background, 4.5],
    [`${mode} muted-fg / card`, t.mutedForeground, t.card, 4.5],
    [`${mode} muted-fg / muted`, t.mutedForeground, t.muted, 4.5],
    [`${mode} primary-fg / primary`, t.primaryForeground, t.primary, 4.5],
    [`${mode} ai-fg / ai-surface`, t.aiForeground, t.aiSurface, 4.5],
    [`${mode} destructive / card`, t.destructive, t.card, 4.5],
    [`${mode} accent-strong / card (icon)`, t.accentStrong, t.card, 3],
  );
}
for (const c of CATEGORY_COLORS) {
  const { bg, fg } = categoryStyle(c.key);
  rows.push([`badge ${c.key} ${fg} on ${bg}`, fg, bg, MIN_CONTRAST]);
}

let failed = 0;
for (const [name, fg, bg, min] of rows) {
  const r = contrastRatio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)} (min ${min})  ${name}`);
}
process.exit(failed ? 1 : 0);

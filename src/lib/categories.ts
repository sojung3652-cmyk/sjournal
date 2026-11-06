// Fixed category palette. DB stores the key (categories.color has a check
// constraint on these 8 keys); the UI maps key -> colors so every screen uses
// the same color per category. Same colors in light and dark mode.
export const CATEGORY_COLORS = [
  { key: "rose", label: "더스티 로즈", hex: "#E8B4BC" },
  { key: "sage", label: "세이지", hex: "#B8C9B0" },
  { key: "dusty_blue", label: "더스티 블루", hex: "#AFC3D6" },
  { key: "lavender", label: "라벤더", hex: "#C9B8D9" },
  { key: "butter", label: "버터", hex: "#EBD9A8" },
  { key: "peach", label: "피치", hex: "#EFC2A6" },
  { key: "mint", label: "민트", hex: "#B5D6CF" },
  { key: "greige", label: "그레이지", hex: "#CFC4B8" },
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number]["key"];

const FALLBACK_HEX = "#CFC4B8";
const COLOR_KEYS = new Set<string>(CATEGORY_COLORS.map((c) => c.key));

export function isCategoryColor(value: string): value is CategoryColor {
  return COLOR_KEYS.has(value);
}

export function categoryHex(color: string): string {
  return CATEGORY_COLORS.find((c) => c.key === color)?.hex ?? FALLBACK_HEX;
}

export const CATEGORY_NAME_MAX = 30;

// --- Badge text tone ---------------------------------------------------------
// Badge = pastel background + dark tone of the same hue. The tone is computed by
// lowering OKLCH lightness (same hue, slightly more chroma) until WCAG contrast
// against the pastel is >= BADGE_TARGET_CONTRAST (headroom over the 4.5 WCAG AA
// minimum). Do not replace with hand-picked hexes: the guarantee comes from this
// loop (checked by scripts/check-contrast.mts).
export const MIN_CONTRAST = 4.5;
const BADGE_TARGET_CONTRAST = 5;

type Oklch = { l: number; c: number; h: number };

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number];
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) };
}

function oklchToHex({ l: L, c, h }: Oklch): string {
  const A = c * Math.cos(h);
  const B = c * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    "#" +
    rgb
      .map((v) => Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function darkTone(bgHex: string, min = BADGE_TARGET_CONTRAST): string {
  const base = hexToOklch(bgHex);
  for (let l = base.l; l > 0; l -= 0.01) {
    const candidate = oklchToHex({ l, c: Math.min(base.c * 1.6, 0.12), h: base.h });
    if (contrastRatio(candidate, bgHex) >= min) return candidate;
  }
  return "#000000";
}

const toneCache = new Map<string, string>();

export function categoryStyle(color: string): { bg: string; fg: string } {
  const bg = categoryHex(color);
  let fg = toneCache.get(bg);
  if (!fg) {
    fg = darkTone(bg);
    toneCache.set(bg, fg);
  }
  return { bg, fg };
}

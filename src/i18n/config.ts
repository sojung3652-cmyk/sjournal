export const LOCALES = ["en", "ko"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_LABEL: Record<Locale, string> = { en: "English", ko: "한국어" };

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "ko";
}

/** BCP 47 tag for Intl APIs. */
export function intlLocale(l: string): string {
  return l === "ko" ? "ko-KR" : "en-US";
}

/** Best match from an Accept-Language header. */
export function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((p) => {
      const [tag, q] = p.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}

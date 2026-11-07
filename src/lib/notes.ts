export const NOTE_CONTENT_MAX = 50_000;
export const TAG_MAX = 30;
export const TAGS_PER_NOTE_MAX = 10;

export const SOURCE_LABEL: Record<string, string> = {
  text: "Memo",
  link: "Link",
  image: "Image",
  pdf: "PDF",
  claude_chat: "Chat",
};

export function isUrl(text: string): boolean {
  if (/\s/.test(text)) return false;
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Title from the first non-empty line (markdown heading marks stripped), max 60 chars. */
export function deriveTitle(text: string): string {
  if (isUrl(text)) {
    const u = new URL(text);
    return (u.hostname + u.pathname).replace(/\/$/, "").slice(0, 60);
  }
  const line = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const clean = line.replace(/^#+\s*/, "").trim();
  return clean.length > 60 ? `${clean.slice(0, 59)}…` : clean;
}

/** "a, b , #c" -> ["a","b","c"] (deduped, trimmed, length-capped). */
export function parseTags(raw: string): string[] {
  const out = new Set<string>();
  for (const part of raw.split(/[,\n]/)) {
    const t = part.trim().replace(/^#/, "").slice(0, TAG_MAX);
    if (t) out.add(t);
    if (out.size >= TAGS_PER_NOTE_MAX) break;
  }
  return [...out];
}

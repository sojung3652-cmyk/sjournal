import "server-only";
import { parse, type HTMLElement } from "node-html-parser";
import { safeFetch } from "./safe-fetch";

export type LinkMetadata = {
  url: string; // final URL after redirects
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  faviconUrl: string | null;
  text: string; // extracted body text for summarizing ("" when unavailable)
  fetched: boolean; // false = page could not be fetched; only URL-derived values are set
};

const TEXT_MAX = 12_000;

const clean = (s: string | null | undefined, max: number) => {
  const v = (s ?? "").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : null;
};

/** Resolve a possibly-relative URL; only http(s) results are kept (no data:/javascript:). */
function absolute(raw: string | null | undefined, base: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim(), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString().slice(0, 2048) : null;
  } catch {
    return null;
  }
}

export function youtubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/);
      return m?.[1] ?? null;
    }
  } catch {
    // not a URL
  }
  return null;
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Values derivable without fetching (fallback card). No favicon guess: if the page
 * couldn't be fetched the host may be unreachable or internal, and the browser
 * shouldn't be sent there either.
 */
export function baseMetadata(url: string): LinkMetadata {
  return { url, title: null, description: null, imageUrl: null, siteName: hostLabel(url), faviconUrl: null, text: "", fetched: false };
}

async function youtubeMetadata(url: string, id: string): Promise<LinkMetadata> {
  const base: LinkMetadata = {
    ...baseMetadata(url),
    siteName: "YouTube",
    faviconUrl: "https://www.youtube.com/favicon.ico",
    imageUrl: `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
  };
  const res = await safeFetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, ["application/json"]);
  if (!res) return base;
  try {
    const o = JSON.parse(res.body) as { title?: string; author_name?: string; thumbnail_url?: string };
    const title = clean(o.title, 500);
    return {
      ...base,
      title,
      description: clean(o.author_name ? `${o.author_name}` : null, 2000),
      imageUrl: absolute(o.thumbnail_url, "https://www.youtube.com") ?? base.imageUrl,
      text: [title, o.author_name ? `Channel: ${o.author_name}` : ""].filter(Boolean).join("\n"),
      fetched: true,
    };
  } catch {
    return base;
  }
}

function meta(root: HTMLElement, ...keys: string[]): string | null {
  for (const key of keys) {
    const el = root.querySelector(`meta[property="${key}"]`) ?? root.querySelector(`meta[name="${key}"]`);
    const v = el?.getAttribute("content");
    if (v?.trim()) return v;
  }
  return null;
}

function bodyText(root: HTMLElement): string {
  for (const sel of ["script", "style", "noscript", "svg", "nav", "header", "footer", "aside", "form", "iframe", "template"]) {
    for (const el of root.querySelectorAll(sel)) el.remove();
  }
  const main = root.querySelector("article") ?? root.querySelector("main") ?? root.querySelector("[role=main]") ?? root.querySelector("body") ?? root;
  return main.structuredText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, TEXT_MAX);
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const yt = youtubeId(url);
  if (yt) return youtubeMetadata(url, yt);

  let res = await safeFetch(url);
  if (!res) return baseMetadata(url);

  const opts = { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true } };
  let root = parse(res.body, opts);
  // <meta http-equiv="refresh" content="0; url=..."> redirect pages: follow once (safeFetch re-validates).
  const refresh = root.querySelector('meta[http-equiv="refresh"]')?.getAttribute("content") ?? root.querySelector('meta[http-equiv="Refresh"]')?.getAttribute("content");
  const refreshTarget = absolute(refresh?.match(/url\s*=\s*['"]?([^'";]+)/i)?.[1], res.url);
  if (refreshTarget && refreshTarget !== res.url) {
    const next = await safeFetch(refreshTarget);
    if (next) {
      res = next;
      root = parse(next.body, opts);
    }
  }
  const finalUrl = res.url;
  const iconHref =
    root.querySelector('link[rel="icon"]')?.getAttribute("href") ??
    root.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ??
    root.querySelector('link[rel~="icon"]')?.getAttribute("href") ??
    root.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") ??
    "/favicon.ico";

  return {
    url: finalUrl,
    title: clean(meta(root, "og:title", "twitter:title") ?? root.querySelector("title")?.text, 500),
    description: clean(meta(root, "og:description", "twitter:description", "description"), 2000),
    imageUrl: absolute(meta(root, "og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"), finalUrl),
    siteName: clean(meta(root, "og:site_name", "application-name"), 200) ?? hostLabel(finalUrl),
    faviconUrl: absolute(iconHref, finalUrl) ?? absolute("/favicon.ico", finalUrl), // data: icons are rejected
    text: bodyText(root),
    fetched: true,
  };
}

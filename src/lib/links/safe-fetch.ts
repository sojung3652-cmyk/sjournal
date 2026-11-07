import "server-only";
import dns from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

/**
 * Server-side fetch for user-supplied URLs (link previews). SSRF defenses:
 * - only http/https on default ports, no credentials in the URL
 * - every resolved address is checked AT CONNECT TIME via a custom `lookup`
 *   (blocks private/loopback/link-local/metadata ranges and DNS rebinding);
 *   IP-literal hosts never hit `lookup`, so they are checked in `checkUrl`
 * - redirects followed manually (max 3), each hop re-validated
 * - overall 5s timeout, body capped at 1MB, content-type allow-list
 * Do not replace with plain `fetch(url)`.
 */

export const FETCH_TIMEOUT_MS = 5_000;
export const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Mozilla/5.0 (compatible; StudyJournalLinkPreview/1.0)";

const blocked = new net.BlockList();
for (const [addr, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of [
  ["::", 128], ["::1", 128], ["100::", 64], ["2001:db8::", 32], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
] as const) blocked.addSubnet(addr, prefix, "ipv6");

/** True if the address must never be contacted. Handles IPv4-mapped / NAT64 / 6to4 embeddings. */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family !== 6) return true;
  const g = expandIPv6(address);
  const v4 = (hi: number, lo: number) => [hi >>> 8, hi & 255, lo >>> 8, lo & 255].join(".");
  const zeros = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
  // IPv4-mapped ::ffff:a.b.c.d, IPv4-compatible ::a.b.c.d, NAT64 64:ff9b::a.b.c.d
  if (zeros(0, 5) && (g[5] === 0xffff || g[5] === 0)) return isBlockedAddress(v4(g[6], g[7]));
  if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6)) return isBlockedAddress(v4(g[6], g[7]));
  // 6to4 2002:AABB:CCDD::/48
  if (g[0] === 0x2002 && isBlockedAddress(v4(g[1], g[2]))) return true;
  return blocked.check(address, "ipv6");
}

/** "::ffff:7f00:1" / "::ffff:127.0.0.1" -> 8 numeric groups. */
function expandIPv6(address: string): number[] {
  let a = address.toLowerCase().split("%")[0];
  const dotted = a.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (dotted) {
    const [b1, b2, b3, b4] = dotted.slice(1).map(Number);
    a = a.slice(0, -dotted[0].length) + `${((b1 << 8) | b2).toString(16)}:${((b3 << 8) | b4).toString(16)}`;
  }
  const [head, tail] = a.includes("::") ? a.split("::") : [a, undefined];
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail ? tail.split(":") : [];
  const fill = tail !== undefined ? Array(8 - h.length - t.length).fill("0") : [];
  return [...h, ...fill, ...t].map((x) => parseInt(x || "0", 16));
}

export class UnsafeUrlError extends Error {}

/** Validates scheme, port, credentials and literal-IP hosts. Returns a normalized URL. */
export function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("invalid url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("scheme");
  if (url.username || url.password) throw new UnsafeUrlError("credentials");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedAddress(host)) throw new UnsafeUrlError("blocked address");
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(host)) throw new UnsafeUrlError("blocked host");
  url.hash = "";
  return url;
}

/**
 * For URLs we only display (og:image, favicon): the browser will load them, so make sure
 * they don't point at the user's own network (private/loopback hosts, by DNS).
 */
export async function isPublicUrl(raw: string | null): Promise<boolean> {
  if (!raw) return false;
  let url: URL;
  try {
    url = checkUrl(raw);
  } catch {
    return false;
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return !isBlockedAddress(host);
  try {
    const list = await dns.promises.lookup(host, { all: true });
    return list.length > 0 && !list.some((a) => isBlockedAddress(a.address));
  } catch {
    return false;
  }
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;

function safeLookup(hostname: string, options: dns.LookupOptions, callback: LookupCb) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => isBlockedAddress(a.address))) {
      const e: NodeJS.ErrnoException = new UnsafeUrlError(`blocked address for ${hostname}`);
      e.code = "EBLOCKED";
      return callback(e, "");
    }
    if (options.all) callback(null, list);
    else callback(null, list[0].address, list[0].family);
  });
}

const agent = new Agent({
  connect: { lookup: safeLookup as unknown as net.LookupFunction, timeout: FETCH_TIMEOUT_MS },
  headersTimeout: FETCH_TIMEOUT_MS,
  bodyTimeout: FETCH_TIMEOUT_MS,
  maxResponseSize: MAX_BYTES * 2,
});

export type SafeResponse = { url: string; status: number; contentType: string; body: string };

/**
 * GET a user-supplied URL safely. Returns null on any failure (callers degrade quietly).
 * `accept` lists allowed content-type prefixes.
 */
export async function safeFetch(rawUrl: string, accept: string[] = ["text/html", "application/xhtml+xml"]): Promise<SafeResponse | null> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let url: URL;
  try {
    url = checkUrl(rawUrl);
  } catch {
    return null;
  }
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await undiciFetch(url, {
        dispatcher: agent,
        redirect: "manual",
        signal,
        headers: { "user-agent": USER_AGENT, accept: `${accept.join(",")};q=0.9,*/*;q=0.1`, "accept-language": "ko,en;q=0.8" },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        await res.body?.cancel();
        if (!location) return null;
        url = checkUrl(new URL(location, url).toString());
        continue;
      }
      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      if (!res.ok || !accept.some((a) => contentType.startsWith(a))) {
        await res.body?.cancel();
        return null;
      }
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > MAX_BYTES * 2) {
        await res.body?.cancel();
        return null;
      }
      const bytes = await readCapped(res.body as ReadableStream<Uint8Array> | null, MAX_BYTES);
      return { url: url.toString(), status: res.status, contentType, body: decode(bytes, contentType) };
    }
    return null; // too many redirects
  } catch {
    return null;
  }
}

async function readCapped(body: ReadableStream<Uint8Array> | null, max: number): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const out = new Uint8Array(Math.min(size, max));
  let offset = 0;
  for (const c of chunks) {
    const take = Math.min(c.byteLength, out.length - offset);
    out.set(c.subarray(0, take), offset);
    offset += take;
    if (offset >= out.length) break;
  }
  return out;
}

function decode(bytes: Uint8Array, contentType: string): string {
  const fromHeader = contentType.match(/charset=([\w-]+)/)?.[1];
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  for (const label of [fromHeader, fromMeta, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      // unknown label, try next
    }
  }
  return new TextDecoder().decode(bytes);
}

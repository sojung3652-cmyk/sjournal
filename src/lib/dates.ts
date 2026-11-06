// Date helpers. A "day" is a YYYY-MM-DD string in the user's timezone
// (profiles.timezone). Never use server-local or UTC dates for "today".

export const DEFAULT_TIMEZONE = "Asia/Seoul";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** YYYY-MM-DD for `now` in the given IANA timezone. */
export function dayInTimezone(tz: string, now: Date = new Date()): string {
  const safeTz = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Validates a YYYY-MM-DD string that is a real calendar date. */
export function isValidDay(day: string): boolean {
  if (!DAY_RE.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

/** Calendar arithmetic on day strings (timezone-free, done in UTC). */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function formatDayLong(day: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${day}T00:00:00Z`));
}

export function formatDayShort(day: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${day}T00:00:00Z`));
}

/** UTC instant range [start, end) covering the given local day in `tz`. */
export function dayRangeUtc(day: string, tz: string): { start: string; end: string } {
  return { start: localMidnightUtc(day, tz), end: localMidnightUtc(addDays(day, 1), tz) };
}

function localMidnightUtc(day: string, tz: string): string {
  const safeTz = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
  // Guess = midnight UTC, then correct by the zone offset at that instant (twice for DST edges).
  let guess = new Date(`${day}T00:00:00Z`).getTime();
  for (let i = 0; i < 2; i++) {
    const offset = tzOffsetMs(guess, safeTz);
    guess = new Date(`${day}T00:00:00Z`).getTime() - offset;
  }
  return new Date(guess).toISOString();
}

function tzOffsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant;
}

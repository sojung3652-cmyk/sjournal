import { z } from "zod";

// Model output length is unpredictable. Trim/clip instead of rejecting the whole response,
// and drop empty entries; only enforce the minimum counts that make a draft usable.

/** Trimmed string clipped to `max` chars (never fails on length). */
export const str = (max: number) => z.string().transform((s) => s.trim().slice(0, max));

/** List of strings: trimmed, clipped, empties dropped, at most `limit`; fails only below `min`. */
export const strList = (max: number, limit: number, min = 0) =>
  z
    .array(z.string())
    .transform((a) => a.map((s) => s.trim().slice(0, max)).filter(Boolean).slice(0, limit))
    .refine((a) => a.length >= min, { message: `needs at least ${min}` });

/** List of objects: invalid/empty entries dropped (via `keep`), at most `limit`; fails only below `min`. */
export const objList = <T extends z.ZodTypeAny>(item: T, limit: number, keep: (v: z.infer<T>) => boolean, min = 0) =>
  z
    .array(z.unknown())
    .transform((a) => a.flatMap((v) => {
      const r = item.safeParse(v);
      return r.success && keep(r.data) ? [r.data as z.infer<T>] : [];
    }).slice(0, limit))
    .refine((a) => a.length >= min, { message: `needs at least ${min}` });

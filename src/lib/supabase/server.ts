import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/types/database";

// Server client: create a new one per request (never share across requests).
// Reads cookies(), so callers must render inside a <Suspense> boundary
// (cacheComponents is enabled).
export async function createClient() {
  // Why: supabase-js calls Date.now() internally (token expiry checks). Under
  // cacheComponents that triggers "blocking-prerender-current-time" unless we
  // first mark the render as request-time. Resolves immediately in actions and
  // route handlers. Not usable inside "use cache" scopes (by design: no user
  // data in shared caches).
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore: proxy.ts refreshes the session on every request.
          }
        },
      },
    },
  );
}

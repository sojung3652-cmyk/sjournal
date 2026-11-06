@AGENTS.md

# Study Journal — CLAUDE.md

Personal study journal web app. Spec: `docs/PRD.md` (source of truth for scope and data model).
Daily flow: plan → in progress → done → reflection, with AI drafts the user edits before saving.

## Tech stack (actual installed versions — check package.json before writing framework code)
- Next.js 16.4.5 (App Router, Turbopack) + React 19.3 + TypeScript 5
  - `cacheComponents: true` and `partialPrefetching: true` are on (next.config.ts)
  - Middleware is called **Proxy** in Next 16: `src/proxy.ts`
  - Bundled docs: `node_modules/next/dist/docs/` — read before using unfamiliar APIs
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css`, no tailwind.config)
- shadcn/ui 4.23 (style `base-nova`, Base UI primitives, lucide icons). Add components with
  `npx shadcn@4.23.0 add <name>`; do not hand-edit `src/components/ui/*` unless necessary.
- Supabase: Postgres + Auth (email/password) + Storage + RLS, via `@supabase/ssr` 0.12 / `@supabase/supabase-js` 2.119
  - Project: `sjournal` (ref `bvgtvncwlxgiieuuxyql`, ap-south-1)
- Planned (not yet installed): Anthropic SDK (Claude API), Tiptap editor, Vercel hosting, PWA.

## Folder structure
```
docs/PRD.md                     product spec
supabase/migrations/            SQL migrations (file first, then apply via Supabase MCP)
src/proxy.ts                    session refresh + optimistic auth redirect
src/app/                        routes (App Router)
  page.tsx                      '오늘' home
  login/                        login / signup screen
  auth/actions.ts               login, signup, logout server actions
  auth/callback/route.ts        email-confirmation code exchange
src/components/ui/              shadcn components
src/lib/supabase/client.ts      browser client
src/lib/supabase/server.ts      server client (Server Components / actions / route handlers)
src/lib/supabase/proxy.ts       client used only by src/proxy.ts
src/lib/prompts/                AI prompts, one file per prompt (versioned)
src/types/database.ts           GENERATED Supabase types — never edit by hand
```

## Coding rules

### Data & security
- Browser talks to Supabase directly; RLS is the real authorization layer. Proxy redirects are only optimistic.
- Every table has `user_id uuid not null default auth.uid()` + RLS `(select auth.uid()) = user_id`
  for select/insert/update/delete. Exception: `profiles` uses `id = auth.uid()` (row created by the
  `on_auth_user_created` trigger). New tables must follow the same pattern.
- On the server, identify the user with `supabase.auth.getClaims()` (verifies the JWT), not `getSession()`.
- Claude API keys and any secret live only in server code (route handlers / server actions / Edge Functions).
  Never `NEXT_PUBLIC_` a secret. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public.
- `.env.local` holds real values (gitignored); `.env.example` lists the keys.

### Migrations & types
1. Write the migration in `supabase/migrations/<timestamp>_<name>.sql`.
2. Apply it with Supabase MCP `apply_migration` (created ≠ applied).
3. Verify: `list_tables` / query `pg_policies`, then `get_advisors` (security) — no RLS warnings allowed.
4. Regenerate `src/types/database.ts` with MCP `generate_typescript_types`.
- `study_items.status` is the `study_status` enum: `backlog | today | in_progress | done`.
- Dates: `log_date` is a `date`; compute "today" in `profiles.timezone`, never server/UTC time.

### Next.js 16 + cacheComponents
- Anything reading `cookies()` / the Supabase server client, or using `new Date()`, must render inside
  `<Suspense>`; call `await connection()` first when the component uses current time.
- Keep session reads out of layouts' top level — push them into a component behind a boundary.

### AI (later phases)
- Prompts in `src/lib/prompts/`. Parse model JSON with tolerant safeParse + `max_tokens` headroom.
- Haiku-class for classification/short summaries, Sonnet-class for journal/guide/scan.
- Log every call to `ai_runs`; enforce a per-user daily limit; cache same-day same-request results.
- AI output is always a draft shown with an 'AI 초안' label; saved only after user confirmation.

### UI
- Korean default, English toggle later. Show only the active locale — never KO+EN side by side.
- No emoji in UI. No pre-filled form fields. Quiet, minimal design. Dark mode supported.
- Same fixed color per category on every screen.

### Workflow
- One branch per feature; verify on Vercel preview before merge.
- Start each phase with a plan; implement after confirmation.
- Before "done": `npm run build` passes and the flow is exercised on the dev server.
- End of each phase: run Supabase advisors (security + performance).

## Status
- Week 1 setup done: scaffold, schema + RLS, email auth, generated types, empty '오늘' screen.
- Not built yet (do not add without a phase plan): board, daily page, quick add, calendar, AI features.

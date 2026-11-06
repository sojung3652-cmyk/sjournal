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
- FKs bypass RLS, so `*_check_refs` triggers verify that referenced rows (category, note, daily_log,
  study_item, tag) belong to the same user. New FK columns to user-owned tables must be added there.
- Internal helper functions go in the `private` schema (not exposed by the API).
- Storage: private bucket `attachments`, object path MUST be `{user_id}/...` (policy-enforced, and
  `attachments.storage_path` is checked too). Serve files via signed URLs, never public URLs.
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
  `<Suspense>`. `lib/supabase/server.ts` `createClient()` already calls `await connection()` (supabase-js
  uses `Date.now()` internally) — do not remove it. Components that use current time without it must call
  `connection()` themselves.
- After a server-action mutation, call `refresh()` from `next/cache` (data isn't cached, so this re-renders).
- When `tsc` complains about `LayoutProps<"/x">` for a new route, run `npx next typegen` first.

### Categories
- Palette is fixed in `src/lib/categories.ts` (8 keys, see 디자인 시스템). DB stores the key, not hex
  (`categories_color_check`). Render with `<CategoryBadge>` / `categoryStyle()`.
- Defaults (AI, 수학, 영어, 코딩) are created by `handle_new_user()` on signup only — not recreated on delete.
- Reorder via RPC `reorder_categories(ids uuid[])` (security invoker, RLS applies).
- Keep session reads out of layouts' top level — push them into a component behind a boundary.

### Board / study items
- Status changes go through `moveItem` (board/actions.ts). `started_at`, `completed_at`, `planned_date` are set
  by the `study_items_status_timestamps` trigger — do not set them from app code.
- Column order: `position` asc (smaller = top). New/moved items use `topPosition()`.
- dnd-kit: `@dnd-kit/core` 6.3.1. `DndContext` needs a fixed `id` (SSR hydration). Every drag action also has a
  menu/button fallback (mobile, keyboard).

### Days, notes, files
- Day data: `getDayData()` / `getStreak()` in `src/lib/data/day.ts`; activity = RPC `activity_days(from,to)`
  (notes, done items in user tz, saved reflection/journal). Streak counts back from yesterday if today is empty.
- Notes attach to the day via `daily_logs` (`ensureDailyLog`, unique user+date). Quick add text/link = server action;
  files = `createFileNote` -> browser uploads to Storage -> `attachFile` (bypasses the 1MB action body limit).
- Markdown: `<Markdown>` (react-markdown + remark-gfm, no raw HTML). Styles: `.md` in globals.css.
- Dynamic routes: `params` is a Promise; await it inside a component under `<Suspense>` (Cache Components).
- Client components using `usePathname()` in a layout need a Suspense boundary (see `(app)/layout.tsx`).
- Next keeps the previous route mounted but hidden; in Playwright tests use `:visible` selectors.

### Calendar & search
- Calendar dots come from `activity_days`; max 3 category dots per day, neutral dot when no category.
- Search = RPC `search_notes(q)`: every word must match title/body/tags as a substring (pg_trgm-indexed ILIKE,
  LIKE chars escaped) and `simple` FTS only adds ranking. Korean has no FTS segmentation — keep the ILIKE path.

### AI (later phases)
- Prompts in `src/lib/prompts/`. Parse model JSON with tolerant safeParse + `max_tokens` headroom.
- Haiku-class for classification/short summaries, Sonnet-class for journal/guide/scan.
- Log every call to `ai_runs`; enforce a per-user daily limit; cache same-day same-request results.
- AI output is always a draft shown with an 'AI 초안' label; saved only after user confirmation.

### UI
- Korean default, English toggle later. Show only the active locale — never KO+EN side by side.
- No emoji in UI. No pre-filled form fields. Quiet, minimal design. Dark mode supported.
- Same fixed color per category on every screen.

## 디자인 시스템 (design system)
Concept: warm paper notebook — ivory page, white cards, baby-pink accent, thin borders, no shadows.
Tokens live in `src/app/globals.css` (shadcn CSS variables). Use token classes (`bg-card`,
`text-muted-foreground`, …) — never hard-code hex in components.

| token | light | dark | use |
| --- | --- | --- | --- |
| background | #FBF7F2 | #2A2425 | page (ivory) |
| card / popover | #FFFFFF | #352E2F | cards, lists, forms |
| border / input | #EDE4DC | #4A4042 | all 1px borders |
| foreground | #3F3638 | #F3ECE8 | body text (warm charcoal) |
| muted-foreground | #766B6C | #B3A7A8 | secondary text (spec #8A7F80 failed 4.5:1, darkened) |
| muted / secondary / accent | #F7F2ED | #3F3637 | subtle fills, hover backgrounds |
| primary / primary-foreground | #EBC1C8 / #5A2E36 | #D9A3AC / #2A1A1D | the one main button |
| accent-strong | #B77A85 | #D9A3AC | accent icons, checks, selected rings, focus ring |
| ai-surface / ai-foreground | #F6E3E6 / #5A3F44 | #4A3A3D / #F3DDE1 | AI draft blocks |
| destructive | #B23A3A | #F08A84 | delete / errors |

Rules
- **Primary (pink) on at most one main button per screen.** Others: `outline`, `ghost`, `secondary`.
- shadcn `accent` = hover background, NOT the brand accent. Brand accent = `accent-strong`
  (`text-accent-strong`, `ring-accent-strong`). It is 3.4:1 on white → icons/borders only, not body text.
- **No shadows.** All `--shadow-*` tokens are zeroed in globals.css; don't add `box-shadow` or `ring-*` as a
  fake shadow. Separation = 1px `border` (`border-border`).
- Radius: buttons & inputs `rounded-lg` (8px), cards/lists `rounded-xl` (12px), badges `rounded-full`.
- Font: Pretendard Variable via `next/font/local` (`src/app/fonts/`, OFL-1.1) → `font-sans`.
- Dark mode follows the OS (`prefers-color-scheme`); `dark:` variant is media-based. A manual toggle later
  needs a class strategy.
- AI drafts: `bg-ai-surface text-ai-foreground` + an 'AI 초안' label, always visually distinct from user text.
- Category colors: 8 fixed pastels in `src/lib/categories.ts` — rose #E8B4BC, sage #B8C9B0,
  dusty_blue #AFC3D6, lavender #C9B8D9, butter #EBD9A8, peach #EFC2A6, mint #B5D6CF, greige #CFC4B8.
  Render with `<CategoryBadge>` (pill, pastel bg + computed dark tone, same in both modes). Text tone is
  computed (OKLCH darkening to ≥5:1) — never hand-pick badge text colors.
- Contrast: `npm run check:contrast` must pass after any color change (text ≥4.5:1, icons ≥3:1). Keep
  `scripts/check-contrast.mts` token values in sync with globals.css.

### Workflow
- One branch per feature; verify on Vercel preview before merge.
- Start each phase with a plan; implement after confirmation.
- Before "done": `npm run build` passes and the flow is exercised on the dev server.
- End of each phase: run Supabase advisors (security + performance).

## Status
- Week 1 setup done: scaffold, schema + RLS, email auth, generated types, empty '오늘' screen.
- Categories done: `/settings/categories` (add / rename / color / reorder / delete), signup defaults.
- Not built yet (do not add without a phase plan): board, daily page, quick add, calendar, AI features.

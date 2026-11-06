# Study Journal

A personal study journal: plan → in progress → done → reflection, with AI drafts for
summaries, a daily journal and a next-day study guide. Spec: [`docs/PRD.md`](docs/PRD.md).
Conventions for contributors (and Claude Code): [`CLAUDE.md`](CLAUDE.md).

## Stack

- Next.js 16 (App Router, Cache Components) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui (Base UI) · Pretendard
- Supabase: Postgres + Auth (email/password) + Storage + RLS
- Anthropic API (server only) · @dnd-kit · react-markdown

## Run locally

Requirements: Node.js 20+ (developed on 24), npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

Other scripts:

| command | what it does |
| --- | --- |
| `npm run build` | production build (must pass before every commit) |
| `npm run start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run check:contrast` | WCAG contrast audit for theme and category colors |

## Environment variables

Put these in `.env.local` (gitignored). Restart `npm run dev` after changing them.

| name | required | where it is used | notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | browser + server | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | browser + server | publishable key (`sb_publishable_...`). Safe to expose; data is protected by RLS |
| `ANTHROPIC_API_KEY` | no | server only | enables AI features. Without it the app works and AI buttons show a message |

Never put a secret behind a `NEXT_PUBLIC_` prefix.

## Database

Migrations live in `supabase/migrations/` and were applied with the Supabase MCP server
(project `sjournal`). Every table is owned by `user_id` with RLS `user_id = auth.uid()`;
files go to the private `attachments` bucket under `{user_id}/...`. After changing the
schema, regenerate `src/types/database.ts`.

Supabase dashboard settings worth checking:

- Authentication → URL Configuration: add `http://localhost:3000/auth/callback`
  (and your deployed URL + `/auth/callback`) to Redirect URLs, for email confirmation links.
- Authentication → Providers → Email: email confirmation is on by default.

## AI

- Haiku (`claude-haiku-5-5`): note classification, note summary.
- Sonnet (`claude-sonnet-5-5`): day-close journal, next-day guide.
- 50 AI calls per user per day (`ai_runs`), identical same-day requests are cached (`ai_cache`).
- Prompts: `src/lib/prompts/`.

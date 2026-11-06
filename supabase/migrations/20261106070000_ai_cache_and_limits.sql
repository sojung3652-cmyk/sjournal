-- AI: same-day result cache + tamper-resistant usage log.

-- Users could previously delete/update their own ai_runs rows and reset the daily
-- limit. Usage rows are append-only now (insert + select only).
drop policy if exists "ai_runs_update_own" on public.ai_runs;
drop policy if exists "ai_runs_delete_own" on public.ai_runs;

alter table public.ai_runs
  add constraint ai_runs_kind_check check (kind in ('classify', 'summarize', 'journal', 'guide'));

-- Same user + kind + identical input on the same local day returns the cached output.
create table public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  input_hash text not null,
  day date not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, input_hash, day)
);
alter table public.ai_cache enable row level security;

create policy "ai_cache_select_own" on public.ai_cache
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_cache_insert_own" on public.ai_cache
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ai_cache_delete_own" on public.ai_cache
  for delete to authenticated using ((select auth.uid()) = user_id);

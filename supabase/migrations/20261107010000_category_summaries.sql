-- Feature: category detail + AI category summary.

create table public.category_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  period_start date,            -- null = from the beginning ("all")
  period_end date not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  check (period_start is null or period_start <= period_end)
);
create index category_summaries_user_category_idx on public.category_summaries (user_id, category_id, created_at desc);
create index category_summaries_category_idx on public.category_summaries (category_id);

alter table public.category_summaries enable row level security;
create policy "category_summaries_select_own" on public.category_summaries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "category_summaries_insert_own" on public.category_summaries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "category_summaries_update_own" on public.category_summaries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "category_summaries_delete_own" on public.category_summaries
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.check_category_summary_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_owned('public.categories', new.category_id, new.user_id);
  return new;
end;
$$;
revoke execute on function public.check_category_summary_refs() from public, anon, authenticated;
create trigger category_summaries_check_refs before insert or update on public.category_summaries
  for each row execute function public.check_category_summary_refs();

-- New AI kinds (link_summary is used by the link archive feature).
alter table public.ai_runs drop constraint ai_runs_kind_check;
alter table public.ai_runs
  add constraint ai_runs_kind_check
  check (kind in ('classify', 'summarize', 'journal', 'guide', 'category_summary', 'link_summary'));

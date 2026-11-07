-- Feature: link archive.
create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  daily_log_id uuid references public.daily_logs (id) on delete set null,
  url text not null check (url ~* '^https?://' and length(url) <= 2048),
  title text check (title is null or length(title) <= 500),
  description text check (description is null or length(description) <= 2000),
  image_url text check (image_url is null or length(image_url) <= 2048),
  site_name text check (site_name is null or length(site_name) <= 200),
  favicon_url text check (favicon_url is null or length(favicon_url) <= 2048),
  ai_summary jsonb,                                  -- { lines: string[3] }
  keywords text[] not null default '{}',
  suggested_category_id uuid references public.categories (id) on delete set null,
  fetch_status text not null default 'pending' check (fetch_status in ('pending', 'done', 'failed')),
  note text check (note is null or length(note) <= 10000),
  search_text text not null default '',               -- maintained by trigger: title, description, site, summary, keywords, note
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index links_user_created_idx on public.links (user_id, created_at desc);
create index links_category_idx on public.links (category_id);
create index links_daily_log_idx on public.links (daily_log_id);
create index links_suggested_category_idx on public.links (suggested_category_id);
create index links_search_text_trgm_idx on public.links using gin (search_text extensions.gin_trgm_ops);

alter table public.links enable row level security;
create policy "links_select_own" on public.links for select to authenticated using ((select auth.uid()) = user_id);
create policy "links_insert_own" on public.links for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "links_update_own" on public.links for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "links_delete_own" on public.links for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.links_search_text()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.search_text := concat_ws(' ', new.title, new.description, new.site_name, new.url, new.note,
    (select string_agg(x, ' ') from jsonb_array_elements_text(coalesce(new.ai_summary->'lines', '[]'::jsonb)) as x),
    array_to_string(new.keywords, ' '));
  return new;
end;
$$;
revoke execute on function public.links_search_text() from public, anon, authenticated;
create trigger links_search_text before insert or update on public.links
  for each row execute function public.links_search_text();

create trigger links_set_updated_at before update on public.links
  for each row execute function public.set_updated_at();

create or replace function public.check_link_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_owned('public.categories', new.category_id, new.user_id);
  perform private.assert_owned('public.categories', new.suggested_category_id, new.user_id);
  perform private.assert_owned('public.daily_logs', new.daily_log_id, new.user_id);
  return new;
end;
$$;
revoke execute on function public.check_link_refs() from public, anon, authenticated;
create trigger links_check_refs before insert or update on public.links
  for each row execute function public.check_link_refs();

-- Links count as activity (streak + calendar dots).
create or replace function public.activity_days(p_from date, p_to date)
returns table (day date, category_ids uuid[])
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid,
           coalesce((select p.timezone from public.profiles p where p.id = (select auth.uid())), 'Asia/Seoul') as tz
  ),
  ev as (
    select dl.log_date as day, n.category_id
    from public.notes n
    join public.daily_logs dl on dl.id = n.daily_log_id
    where n.user_id = (select uid from me) and dl.log_date between p_from and p_to
    union all
    select (si.completed_at at time zone (select tz from me))::date, si.category_id
    from public.study_items si
    where si.user_id = (select uid from me)
      and si.status = 'done'
      and si.completed_at is not null
      and (si.completed_at at time zone (select tz from me))::date between p_from and p_to
    union all
    select (l.created_at at time zone (select tz from me))::date, l.category_id
    from public.links l
    where l.user_id = (select uid from me)
      and (l.created_at at time zone (select tz from me))::date between p_from and p_to
    union all
    select dl.log_date, null::uuid
    from public.daily_logs dl
    where dl.user_id = (select uid from me)
      and dl.log_date between p_from and p_to
      and (dl.reflection is not null or dl.ai_journal is not null)
  )
  select ev.day, coalesce(array_agg(distinct ev.category_id) filter (where ev.category_id is not null), '{}')
  from ev
  group by ev.day
  order by ev.day;
$$;

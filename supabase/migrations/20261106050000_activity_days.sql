-- Days with study activity (for streak + calendar dots).
-- A day counts when it has a note, a completed study item (in the user's timezone),
-- or a saved reflection/journal. Returns the distinct category ids seen that day.
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
revoke execute on function public.activity_days(date, date) from public, anon;
grant execute on function public.activity_days(date, date) to authenticated;

create index study_items_user_completed_idx on public.study_items (user_id, completed_at) where status = 'done';

alter table public.notes
  add constraint notes_title_len check (title is null or length(title) <= 200);
alter table public.daily_logs
  add constraint daily_logs_reflection_len check (reflection is null or length(reflection) <= 2000);

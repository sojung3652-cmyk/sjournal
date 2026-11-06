-- Board support: ordering within a column + automatic status timestamps.

alter table public.study_items
  add column position double precision not null default 0;

alter table public.study_items
  add constraint study_items_title_not_blank check (length(btrim(title)) between 1 and 200);

create index study_items_user_status_position_idx on public.study_items (user_id, status, position);

-- Status timestamps are owned by the DB so every client path behaves the same:
--   in_progress -> started_at (first time only)
--   done        -> completed_at = now() (and started_at if it was never set)
--   not done    -> completed_at cleared
--   today       -> planned_date = today in the user's timezone (if empty)
--   backlog     -> planned_date cleared
create or replace function public.study_items_status_timestamps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text;
  local_today date;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select coalesce(p.timezone, 'Asia/Seoul') into tz from public.profiles p where p.id = new.user_id;
  local_today := (now() at time zone coalesce(tz, 'Asia/Seoul'))::date;

  if new.status = 'in_progress' and new.started_at is null then
    new.started_at := now();
  end if;

  if new.status = 'done' then
    new.completed_at := now();
    new.started_at := coalesce(new.started_at, now());
  else
    new.completed_at := null;
  end if;

  if new.status = 'today' and new.planned_date is null then
    new.planned_date := local_today;
  elsif new.status = 'backlog' then
    new.planned_date := null;
  end if;

  return new;
end;
$$;
revoke execute on function public.study_items_status_timestamps() from public, anon, authenticated;

create trigger study_items_status_timestamps
  before insert or update of status on public.study_items
  for each row execute function public.study_items_status_timestamps();

-- Categories: preset color keys, default categories on signup, atomic reorder.

-- Colors are stored as palette keys (not hex) so the UI can map them per theme.
alter table public.categories
  add constraint categories_color_check
  check (color in ('blue', 'green', 'orange', 'violet', 'red', 'yellow', 'teal', 'pink'));

alter table public.categories
  add constraint categories_name_not_blank check (length(btrim(name)) between 1 and 30);

-- Signup: create profile + 4 default categories.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.categories (user_id, name, color, sort_order) values
    (new.id, 'AI', 'blue', 0),
    (new.id, '수학', 'green', 1),
    (new.id, '영어', 'orange', 2),
    (new.id, '코딩', 'violet', 3);

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Backfill defaults for existing users who have no categories yet.
insert into public.categories (user_id, name, color, sort_order)
select u.id, d.name, d.color, d.sort_order
from auth.users u
cross join (values ('AI', 'blue', 0), ('수학', 'green', 1), ('영어', 'orange', 2), ('코딩', 'violet', 3))
  as d (name, color, sort_order)
where not exists (select 1 from public.categories c where c.user_id = u.id);

-- Reorder in one statement. security invoker => RLS still applies;
-- the user_id filter is an extra guard so foreign ids are silently ignored.
create or replace function public.reorder_categories(ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.categories c
  set sort_order = o.ord - 1
  from unnest(ids) with ordinality as o (id, ord)
  where c.id = o.id
    and c.user_id = (select auth.uid());
$$;
revoke execute on function public.reorder_categories(uuid[]) from public, anon;
grant execute on function public.reorder_categories(uuid[]) to authenticated;

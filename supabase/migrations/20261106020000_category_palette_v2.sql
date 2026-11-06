-- Category palette v2 (design system): pastel paper-notebook colors.
-- Old keys are mapped to the closest new key, then the check constraint is swapped.

alter table public.categories drop constraint categories_color_check;

update public.categories set color = case color
  when 'blue' then 'dusty_blue'
  when 'green' then 'sage'
  when 'orange' then 'peach'
  when 'violet' then 'lavender'
  when 'red' then 'rose'
  when 'pink' then 'rose'
  when 'yellow' then 'butter'
  when 'teal' then 'mint'
  else color
end;

alter table public.categories
  add constraint categories_color_check
  check (color in ('rose', 'sage', 'dusty_blue', 'lavender', 'butter', 'peach', 'mint', 'greige'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.categories (user_id, name, color, sort_order) values
    (new.id, 'AI', 'dusty_blue', 0),
    (new.id, '수학', 'sage', 1),
    (new.id, '영어', 'peach', 2),
    (new.id, '코딩', 'lavender', 3);

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

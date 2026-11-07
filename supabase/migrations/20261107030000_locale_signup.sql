-- Bilingual app: English default, Korean supported.
-- Signup sends options.data.locale ('en' | 'ko'); it becomes profiles.locale and picks the
-- default category names. Auth email templates branch on {{ .Data.locale }} too.

alter table public.profiles alter column locale set default 'en';

-- Existing accounts never chose a locale (the old default was 'ko'); the owner asked for an
-- English UI, so start everyone on English. They can switch in Settings.
update public.profiles set locale = 'en' where locale = 'ko';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  loc text := case when new.raw_user_meta_data->>'locale' = 'ko' then 'ko' else 'en' end;
begin
  insert into public.profiles (id, locale) values (new.id, loc);

  if loc = 'ko' then
    insert into public.categories (user_id, name, color, sort_order) values
      (new.id, 'AI', 'dusty_blue', 0),
      (new.id, '수학', 'sage', 1),
      (new.id, '영어', 'peach', 2),
      (new.id, '코딩', 'lavender', 3);
  else
    insert into public.categories (user_id, name, color, sort_order) values
      (new.id, 'AI', 'dusty_blue', 0),
      (new.id, 'Math', 'sage', 1),
      (new.id, 'English', 'peach', 2),
      (new.id, 'Coding', 'lavender', 3);
  end if;

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

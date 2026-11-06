-- Keep internal helpers out of the PostgREST-exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter function public.assert_owned(regclass, uuid, uuid) set schema private;

create or replace function public.check_study_item_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_owned('public.categories', new.category_id, new.user_id);
  return new;
end;
$$;

create or replace function public.check_note_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_owned('public.categories', new.category_id, new.user_id);
  perform private.assert_owned('public.daily_logs', new.daily_log_id, new.user_id);
  perform private.assert_owned('public.study_items', new.study_item_id, new.user_id);
  return new;
end;
$$;

create or replace function public.check_attachment_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_owned('public.notes', new.note_id, new.user_id);
  if split_part(new.storage_path, '/', 1) <> new.user_id::text then
    raise exception 'storage_path must start with the owner folder' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.check_note_tag_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_owned('public.notes', new.note_id, new.user_id);
  perform private.assert_owned('public.tags', new.tag_id, new.user_id);
  return new;
end;
$$;

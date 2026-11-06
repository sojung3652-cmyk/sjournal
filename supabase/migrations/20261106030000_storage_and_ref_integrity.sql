-- 1) Private Storage bucket "attachments" with per-user folders: {user_id}/{...}
-- 2) Ownership checks for foreign keys. RLS only checks the row's own user_id;
--    FK checks bypass RLS, so without these a user could attach their row to
--    someone else's note/category by guessing a uuid.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 20971520,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "attachments_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Ownership helpers ------------------------------------------------------------
create or replace function public.assert_owned(tbl regclass, ref_id uuid, owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ok boolean;
begin
  if ref_id is null then
    return;
  end if;
  execute format('select exists (select 1 from %s where id = $1 and user_id = $2)', tbl)
    into ok using ref_id, owner;
  if not ok then
    raise exception 'referenced % row does not belong to the current user', tbl
      using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.assert_owned(regclass, uuid, uuid) from public, anon, authenticated;

create or replace function public.check_study_item_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_owned('public.categories', new.category_id, new.user_id);
  return new;
end;
$$;

create or replace function public.check_note_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_owned('public.categories', new.category_id, new.user_id);
  perform public.assert_owned('public.daily_logs', new.daily_log_id, new.user_id);
  perform public.assert_owned('public.study_items', new.study_item_id, new.user_id);
  return new;
end;
$$;

create or replace function public.check_attachment_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_owned('public.notes', new.note_id, new.user_id);
  if split_part(new.storage_path, '/', 1) <> new.user_id::text then
    raise exception 'storage_path must start with the owner folder' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.check_note_tag_refs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_owned('public.notes', new.note_id, new.user_id);
  perform public.assert_owned('public.tags', new.tag_id, new.user_id);
  return new;
end;
$$;

revoke execute on function public.check_study_item_refs() from public, anon, authenticated;
revoke execute on function public.check_note_refs() from public, anon, authenticated;
revoke execute on function public.check_attachment_refs() from public, anon, authenticated;
revoke execute on function public.check_note_tag_refs() from public, anon, authenticated;

create trigger study_items_check_refs before insert or update on public.study_items
  for each row execute function public.check_study_item_refs();
create trigger notes_check_refs before insert or update on public.notes
  for each row execute function public.check_note_refs();
create trigger attachments_check_refs before insert or update on public.attachments
  for each row execute function public.check_attachment_refs();
create trigger note_tags_check_refs before insert or update on public.note_tags
  for each row execute function public.check_note_tag_refs();

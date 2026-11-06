-- Study Journal initial schema (PRD section 8)
-- Every row is owned by a user; RLS restricts access to auth.uid().
-- profiles uses id = auth.users.id as its owner key (1:1 with the user).

create type public.study_status as enum ('backlog', 'today', 'in_progress', 'done');

-- updated_at helper -----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles --------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'ko' check (locale in ('ko', 'en')),
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- categories ------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create index categories_user_id_idx on public.categories (user_id);

-- study_items -----------------------------------------------------------------
create table public.study_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  status public.study_status not null default 'backlog',
  planned_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_items_user_status_idx on public.study_items (user_id, status);
create index study_items_user_planned_date_idx on public.study_items (user_id, planned_date);
create index study_items_category_id_idx on public.study_items (category_id);

-- daily_logs ------------------------------------------------------------------
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  plan_confirmed_at timestamptz,
  reflection text,
  ai_journal jsonb,
  ai_guide jsonb,
  study_minutes integer not null default 0 check (study_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- notes -----------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  daily_log_id uuid references public.daily_logs (id) on delete set null,
  study_item_id uuid references public.study_items (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  title text,
  content text not null default '',
  source_type text not null default 'text'
    check (source_type in ('text', 'link', 'image', 'pdf', 'claude_chat')),
  ai_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_id_idx on public.notes (user_id, created_at desc);
create index notes_daily_log_id_idx on public.notes (daily_log_id);
create index notes_study_item_id_idx on public.notes (study_item_id);
create index notes_category_id_idx on public.notes (category_id);

-- attachments -----------------------------------------------------------------
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  extracted_text text,
  created_at timestamptz not null default now()
);
create index attachments_user_id_idx on public.attachments (user_id);
create index attachments_note_id_idx on public.attachments (note_id);

-- tags / note_tags ------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.note_tags (
  note_id uuid not null references public.notes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);
create index note_tags_tag_id_idx on public.note_tags (tag_id);
create index note_tags_user_id_idx on public.note_tags (user_id);

-- weekly_reports --------------------------------------------------------------
create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ai_runs ---------------------------------------------------------------------
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index ai_runs_user_created_idx on public.ai_runs (user_id, created_at desc);

-- updated_at triggers ---------------------------------------------------------
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger study_items_set_updated_at before update on public.study_items
  for each row execute function public.set_updated_at();
create trigger daily_logs_set_updated_at before update on public.daily_logs
  for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- auto-create profile on signup -----------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS -------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.study_items enable row level security;
alter table public.daily_logs enable row level security;
alter table public.notes enable row level security;
alter table public.attachments enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.ai_runs enable row level security;

-- profiles: row is created by the signup trigger, so no insert/delete policy.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Owner-scoped CRUD policies for every user_id table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'study_items', 'daily_logs', 'notes', 'attachments',
    'tags', 'note_tags', 'weekly_reports', 'ai_runs'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;

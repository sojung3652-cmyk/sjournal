-- Note search: Postgres full-text (ranking) + pg_trgm partial matching.
-- 'simple' FTS doesn't segment Korean (e.g. "역전파" won't match "역전파를"), so every
-- query word must also match as a substring (ILIKE, trigram-indexed) in title, body or tags.
create extension if not exists pg_trgm with schema extensions;

alter table public.notes
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B')
  ) stored;

create index notes_search_vector_idx on public.notes using gin (search_vector);
create index notes_title_trgm_idx on public.notes using gin (title extensions.gin_trgm_ops);
create index notes_content_trgm_idx on public.notes using gin (content extensions.gin_trgm_ops);
create index tags_name_trgm_idx on public.tags using gin (name extensions.gin_trgm_ops);

create or replace function public.search_notes(q text, max_results int default 50)
returns table (
  id uuid,
  title text,
  content text,
  source_type text,
  category_id uuid,
  created_at timestamptz,
  log_date date,
  tags text[],
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select btrim(coalesce(q, '')) as raw
  ),
  words as (
    select array_agg('%' || replace(replace(replace(w, '\', '\'), '%', '\%'), '_', '\_') || '%') as pats
    from input, regexp_split_to_table(input.raw, '\s+') as w
    where w <> ''
  ),
  query as (
    select websearch_to_tsquery('simple', input.raw) as tsq, coalesce(words.pats, '{}') as pats
    from input, words
  ),
  note_tags_agg as (
    select nt.note_id, array_agg(t.name order by t.name) as names
    from public.note_tags nt
    join public.tags t on t.id = nt.tag_id
    where nt.user_id = (select auth.uid())
    group by nt.note_id
  )
  select
    n.id, n.title, n.content, n.source_type, n.category_id, n.created_at, dl.log_date,
    coalesce(nta.names, '{}'),
    (
      ts_rank(n.search_vector, query.tsq)
      + case when exists (select 1 from unnest(query.pats) p where n.title ilike p) then 1 else 0 end
      + case when exists (select 1 from unnest(query.pats) p, unnest(coalesce(nta.names, '{}')) tn where tn ilike p) then 0.5 else 0 end
    )::real as rank
  from public.notes n
  cross join query
  left join public.daily_logs dl on dl.id = n.daily_log_id
  left join note_tags_agg nta on nta.note_id = n.id
  where n.user_id = (select auth.uid())
    and cardinality(query.pats) > 0
    and not exists (
      select 1 from unnest(query.pats) p
      where not (
        coalesce(n.title, '') ilike p
        or n.content ilike p
        or exists (select 1 from unnest(coalesce(nta.names, '{}')) tn where tn ilike p)
      )
    )
  order by rank desc, n.created_at desc
  limit least(greatest(coalesce(max_results, 50), 1), 100);
$$;
revoke execute on function public.search_notes(text, int) from public, anon;
grant execute on function public.search_notes(text, int) to authenticated;

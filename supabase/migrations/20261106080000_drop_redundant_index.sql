-- Redundant: (user_id, status) is a prefix of study_items_user_status_position_idx.
drop index if exists public.study_items_user_status_idx;

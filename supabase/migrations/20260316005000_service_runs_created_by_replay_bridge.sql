-- Replay bridge for migration 094.
-- service_run_items_select references service_runs.created_by before migration
-- 094 adds that column, so replay must expose the column first.

alter table if exists public.service_runs
  add column if not exists created_by uuid references auth.users(id);

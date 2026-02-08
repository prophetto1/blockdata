-- Migration 005: v2 cutover — freeze v1 tables, remove v1 cron, drop v1 RPC
-- All Edge Functions now exclusively use v2 tables.
-- v1 tables are retained read-only for historical comparison.

-- ============================================================
-- 1. Reject-write trigger function for v1 tables
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_v1_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'v1 table "%" is frozen. All writes must use the v2 tables.', TG_TABLE_NAME;
END;
$$;

-- 2. Attach freeze triggers to all 4 v1 tables
CREATE TRIGGER freeze_v1_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.reject_v1_writes();

CREATE TRIGGER freeze_v1_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION public.reject_v1_writes();

CREATE TRIGGER freeze_v1_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.annotation_runs
  FOR EACH ROW EXECUTE FUNCTION public.reject_v1_writes();

CREATE TRIGGER freeze_v1_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.block_annotations
  FOR EACH ROW EXECUTE FUNCTION public.reject_v1_writes();

-- ============================================================
-- 3. Remove the v1 stale-conversion cron job
-- ============================================================
SELECT cron.unschedule('stale_conversion_cleanup');

-- ============================================================
-- 4. Drop the v1 RPC (resolves security advisory: search_path mutable)
-- ============================================================
DROP FUNCTION IF EXISTS public.create_annotation_run(uuid, text, uuid);

-- Migration 006: add block_overlays_v2 to Supabase Realtime publication
-- Applied live: 2026-02-08
-- Purpose: enable the web block viewer to subscribe to overlay updates via Supabase Realtime.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'block_overlays_v2'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.block_overlays_v2;
  END IF;
END $$;


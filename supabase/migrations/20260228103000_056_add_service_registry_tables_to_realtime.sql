-- Migration 056: add service registry tables to Supabase Realtime publication
-- Purpose: allow live superuser settings updates for service inventory.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'service_registry'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.service_registry;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'service_functions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.service_functions;
    END IF;
  END IF;
END $$;

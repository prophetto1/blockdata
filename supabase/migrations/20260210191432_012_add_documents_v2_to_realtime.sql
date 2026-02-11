DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'documents_v2'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents_v2;
  END IF;
END $$;

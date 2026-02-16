-- Migration 038: Canonical Track B source-catalog alias contract
-- Purpose:
-- - Make source-vs-output semantics explicit for Track B naming.
-- - Keep physical tables unchanged.
-- - Provide one canonical source alias to reduce ambiguity in docs/API design.

BEGIN;

CREATE OR REPLACE VIEW public.track_b_source_documents_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.documents_v2;

COMMENT ON VIEW public.track_b_source_documents_v2 IS
  'Canonical Track B alias for source document catalog (documents_v2). Use for source lifecycle operations.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'track_b_documents_v2'
  ) THEN
    EXECUTE $q$
      COMMENT ON VIEW public.track_b_documents_v2 IS
      'Legacy alias for source catalog. Prefer track_b_source_documents_v2 for clarity.';
    $q$;
  END IF;
END $$;

COMMIT;


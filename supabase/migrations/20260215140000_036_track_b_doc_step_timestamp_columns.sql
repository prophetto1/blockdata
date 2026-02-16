-- Migration 036: Add explicit step timestamp columns for enriching and extracting
-- Fixes: step_embedded_at was being overloaded for enriching status.
-- Worker code now writes step_enriched_at and step_extracted_at explicitly.

DO $$
DECLARE
  v_has_enriched BOOLEAN;
  v_has_embedded BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unstructured_run_docs_v2'
      AND column_name = 'step_enriched_at'
  ) INTO v_has_enriched;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unstructured_run_docs_v2'
      AND column_name = 'step_embedded_at'
  ) INTO v_has_embedded;

  -- If only legacy column exists, rename it.
  IF v_has_embedded AND NOT v_has_enriched THEN
    ALTER TABLE public.unstructured_run_docs_v2
      RENAME COLUMN step_embedded_at TO step_enriched_at;
    v_has_enriched := TRUE;
    v_has_embedded := FALSE;
  END IF;

  -- If enriched is still missing, create it.
  IF NOT v_has_enriched THEN
    ALTER TABLE public.unstructured_run_docs_v2
      ADD COLUMN step_enriched_at TIMESTAMPTZ;
    v_has_enriched := TRUE;
  END IF;

  -- Ensure extract timestamp exists.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unstructured_run_docs_v2'
      AND column_name = 'step_extracted_at'
  ) THEN
    ALTER TABLE public.unstructured_run_docs_v2
      ADD COLUMN step_extracted_at TIMESTAMPTZ;
  END IF;

  -- Keep embedded timestamp for future embedding stage/back-compat reads.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unstructured_run_docs_v2'
      AND column_name = 'step_embedded_at'
  ) THEN
    ALTER TABLE public.unstructured_run_docs_v2
      ADD COLUMN step_embedded_at TIMESTAMPTZ;
  END IF;

  -- If both columns exist, keep enriched populated from embedded when missing.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'unstructured_run_docs_v2'
      AND column_name = 'step_embedded_at'
  ) THEN
    UPDATE public.unstructured_run_docs_v2
    SET step_enriched_at = COALESCE(step_enriched_at, step_embedded_at)
    WHERE step_enriched_at IS NULL
      AND step_embedded_at IS NOT NULL;
  END IF;
END $$;

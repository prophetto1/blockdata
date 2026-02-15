-- Migration 033: Persist Track B run intent fields for extract/template traceability
--
-- Adds fields required to persist API intent for Extract and template-driven runs.

ALTER TABLE public.unstructured_workflow_runs_v2
  ADD COLUMN IF NOT EXISTS workflow_template_key TEXT,
  ADD COLUMN IF NOT EXISTS user_schema_uid TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unstructured_workflow_runs_v2_user_schema_uid_hex'
  ) THEN
    ALTER TABLE public.unstructured_workflow_runs_v2
      ADD CONSTRAINT unstructured_workflow_runs_v2_user_schema_uid_hex
      CHECK (user_schema_uid IS NULL OR user_schema_uid ~ '^[0-9a-f]{64}$');
  END IF;
END $$;

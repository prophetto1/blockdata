-- Migration 037: Track B semantic alias views aligned to Track A naming
-- Purpose:
-- - Reduce naming friction without renaming existing Track B physical tables.
-- - Provide Track-A-aligned table names under a Track B namespace.
-- - Keep rollout additive and reversible.

BEGIN;

-- ---------------------------------------------------------------------------
-- Core Track-A-aligned aliases for Track B usage
-- ---------------------------------------------------------------------------

-- Track B source document catalog alias (maps to shared source catalog).
CREATE OR REPLACE VIEW public.track_b_documents_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.documents_v2;

-- Track B run records alias (Track A analog: runs_v2).
CREATE OR REPLACE VIEW public.track_b_runs_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.unstructured_workflow_runs_v2;

-- Track B per-run document execution records.
CREATE OR REPLACE VIEW public.track_b_run_docs_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.unstructured_run_docs_v2;

-- Track B output document records (no direct Track A table analog).
CREATE OR REPLACE VIEW public.track_b_doc_outputs_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.unstructured_documents_v2;

-- Track B block records alias (Track A analog: blocks_v2).
CREATE OR REPLACE VIEW public.track_b_blocks_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.unstructured_blocks_v2;

-- Track B representation records alias (Track A analog: conversion_representations_v2).
CREATE OR REPLACE VIEW public.track_b_conversion_representations_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.unstructured_representations_v2;

-- ---------------------------------------------------------------------------
-- Additional Track B control-plane aliases
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.track_b_workflows_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.unstructured_workflows_v2;

CREATE OR REPLACE VIEW public.track_b_step_artifacts_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.unstructured_step_artifacts_v2;

CREATE OR REPLACE VIEW public.track_b_state_events_v2
WITH (security_invoker = true)
AS
SELECT *
FROM public.unstructured_state_events_v2;

-- ---------------------------------------------------------------------------
-- Canonical comments clarifying functional boundaries
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.documents_v2 IS
  'Source document catalog (Track A + Track B shared). One row per uploaded source file.';

COMMENT ON TABLE public.unstructured_run_docs_v2 IS
  'Track B run-doc execution state (per run_uid + source_uid), including step/status progression.';

COMMENT ON TABLE public.unstructured_documents_v2 IS
  'Track B output document identity rows (per run_uid + source_uid), parent for unstructured_blocks_v2.';

COMMENT ON VIEW public.track_b_documents_v2 IS
  'Track-B namespaced alias of shared source catalog documents_v2.';

COMMENT ON VIEW public.track_b_runs_v2 IS
  'Track-A-aligned alias for Track B run records (unstructured_workflow_runs_v2).';

COMMENT ON VIEW public.track_b_run_docs_v2 IS
  'Track B per-run document execution rows (alias of unstructured_run_docs_v2).';

COMMENT ON VIEW public.track_b_doc_outputs_v2 IS
  'Track B persisted output-document rows (alias of unstructured_documents_v2).';

COMMENT ON VIEW public.track_b_blocks_v2 IS
  'Track-A-aligned alias for Track B block output rows (unstructured_blocks_v2).';

COMMENT ON VIEW public.track_b_conversion_representations_v2 IS
  'Track-A-aligned alias for Track B representation artifacts (unstructured_representations_v2).';

COMMENT ON VIEW public.track_b_workflows_v2 IS
  'Track B workflow definitions (alias of unstructured_workflows_v2).';

COMMENT ON VIEW public.track_b_step_artifacts_v2 IS
  'Track B step artifact metadata rows (alias of unstructured_step_artifacts_v2).';

COMMENT ON VIEW public.track_b_state_events_v2 IS
  'Track B run/doc state transition event history (alias of unstructured_state_events_v2).';

COMMIT;

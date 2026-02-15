-- Migration 027: Track B explicit run/doc state transition enforcement

-- ---------------------------------------------------------------------------
-- Run status transition guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_unstructured_run_status_transition_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  from_status TEXT;
  to_status TEXT;
BEGIN
  from_status := OLD.status;
  to_status := NEW.status;

  IF to_status = from_status THEN
    RETURN NEW;
  END IF;

  IF from_status = 'queued' AND to_status IN ('running', 'cancelled', 'failed') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'running' AND to_status IN ('success', 'partial_success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status IN ('partial_success', 'success', 'failed', 'cancelled') THEN
    RAISE EXCEPTION
      'Illegal run status transition: % -> % (terminal state)',
      from_status,
      to_status;
  END IF;

  RAISE EXCEPTION 'Illegal run status transition: % -> %', from_status, to_status;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_unstructured_run_status_transition_v2 ON public.unstructured_workflow_runs_v2;
CREATE TRIGGER trg_enforce_unstructured_run_status_transition_v2
  BEFORE UPDATE OF status ON public.unstructured_workflow_runs_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_unstructured_run_status_transition_v2();

-- ---------------------------------------------------------------------------
-- Doc status transition guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_unstructured_doc_status_transition_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  from_status TEXT;
  to_status TEXT;
BEGIN
  from_status := OLD.status;
  to_status := NEW.status;

  IF to_status = from_status THEN
    RETURN NEW;
  END IF;

  IF from_status = 'queued' AND to_status IN ('indexing', 'downloading', 'partitioning', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'indexing' AND to_status IN ('downloading', 'partitioning', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'downloading' AND to_status IN ('partitioning', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'partitioning' AND to_status IN ('chunking', 'enriching', 'persisting', 'success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'chunking' AND to_status IN ('enriching', 'persisting', 'success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'enriching' AND to_status IN ('persisting', 'success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status = 'persisting' AND to_status IN ('success', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  IF from_status IN ('success', 'failed', 'cancelled') THEN
    RAISE EXCEPTION
      'Illegal doc status transition: % -> % (terminal state)',
      from_status,
      to_status;
  END IF;

  RAISE EXCEPTION 'Illegal doc status transition: % -> %', from_status, to_status;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_unstructured_doc_status_transition_v2 ON public.unstructured_run_docs_v2;
CREATE TRIGGER trg_enforce_unstructured_doc_status_transition_v2
  BEFORE UPDATE OF status ON public.unstructured_run_docs_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_unstructured_doc_status_transition_v2();

-- ---------------------------------------------------------------------------
-- Transition event logging for run/doc status changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_unstructured_run_status_transition_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.unstructured_state_events_v2 (
      run_uid,
      source_uid,
      entity_type,
      from_status,
      to_status,
      detail_json
    )
    VALUES (
      NEW.run_uid,
      NULL,
      'run',
      OLD.status,
      NEW.status,
      '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_unstructured_run_status_transition_v2 ON public.unstructured_workflow_runs_v2;
CREATE TRIGGER trg_log_unstructured_run_status_transition_v2
  AFTER UPDATE OF status ON public.unstructured_workflow_runs_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.log_unstructured_run_status_transition_v2();

CREATE OR REPLACE FUNCTION public.log_unstructured_doc_status_transition_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.unstructured_state_events_v2 (
      run_uid,
      source_uid,
      entity_type,
      from_status,
      to_status,
      detail_json
    )
    VALUES (
      NEW.run_uid,
      NEW.source_uid,
      'doc',
      OLD.status,
      NEW.status,
      '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_unstructured_doc_status_transition_v2 ON public.unstructured_run_docs_v2;
CREATE TRIGGER trg_log_unstructured_doc_status_transition_v2
  AFTER UPDATE OF status ON public.unstructured_run_docs_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.log_unstructured_doc_status_transition_v2();

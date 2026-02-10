-- RPC: Delete a document and all its children (overlays, runs, blocks)
-- Does NOT clean up storage — that's a separate concern.
CREATE OR REPLACE FUNCTION public.delete_document(p_source_uid TEXT)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_conv_uid TEXT;
BEGIN
  -- Look up the conv_uid for this document
  SELECT conv_uid INTO v_conv_uid
    FROM public.documents_v2
    WHERE source_uid = p_source_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', p_source_uid;
  END IF;

  IF v_conv_uid IS NOT NULL THEN
    -- Delete overlays for all runs on this document
    DELETE FROM public.block_overlays_v2
      WHERE run_id IN (SELECT run_id FROM public.runs_v2 WHERE conv_uid = v_conv_uid);

    -- Delete runs for this document
    DELETE FROM public.runs_v2 WHERE conv_uid = v_conv_uid;

    -- Delete blocks for this document
    DELETE FROM public.blocks_v2 WHERE conv_uid = v_conv_uid;
  END IF;

  -- Delete the document itself
  DELETE FROM public.documents_v2 WHERE source_uid = p_source_uid;
END;
$$;

-- RPC: Delete a run and its overlays
CREATE OR REPLACE FUNCTION public.delete_run(p_run_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all overlays for this run
  DELETE FROM public.block_overlays_v2 WHERE run_id = p_run_id;

  -- Delete the run
  DELETE FROM public.runs_v2 WHERE run_id = p_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run not found: %', p_run_id;
  END IF;
END;
$$;

-- RPC: Cancel a running run (release claimed blocks, set status)
CREATE OR REPLACE FUNCTION public.cancel_run(p_run_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
BEGIN
  -- Release any claimed blocks back to pending won't matter — they'll be
  -- skipped by the worker when it checks run.status = 'cancelled'
  UPDATE public.block_overlays_v2
    SET status = 'pending', claimed_by = NULL, claimed_at = NULL
    WHERE run_id = p_run_id AND status = 'claimed';

  -- Mark the run as cancelled
  UPDATE public.runs_v2
    SET status = 'cancelled', completed_at = NOW()
    WHERE run_id = p_run_id AND status = 'running';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run not found or not in running status: %', p_run_id;
  END IF;
END;
$$;

-- RPC: Delete a project and all its children
CREATE OR REPLACE FUNCTION public.delete_project(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_source_uid TEXT;
BEGIN
  -- Delete each document (which cascades to runs, blocks, overlays)
  FOR v_source_uid IN
    SELECT source_uid FROM public.documents_v2 WHERE project_id = p_project_id
  LOOP
    PERFORM public.delete_document(v_source_uid);
  END LOOP;

  -- Delete the project
  DELETE FROM public.projects WHERE project_id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;
END;
$$;

-- RPC: Delete a schema (only if no runs reference it)
CREATE OR REPLACE FUNCTION public.delete_schema(p_schema_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_run_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_run_count
    FROM public.runs_v2 WHERE schema_id = p_schema_id;

  IF v_run_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete schema: % runs still reference it', v_run_count;
  END IF;

  DELETE FROM public.schemas WHERE schema_id = p_schema_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schema not found: %', p_schema_id;
  END IF;
END;
$$;
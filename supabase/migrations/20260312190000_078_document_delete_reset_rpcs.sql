-- RPC: Delete source document and all related rows (blocks, conversion_parsing,
-- conversion_representations). Does NOT clean up storage files.
-- Ownership check: only the document owner can delete.
CREATE OR REPLACE FUNCTION public.delete_source_document(p_source_uid TEXT)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_conv_uid TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id
    FROM public.source_documents
    WHERE source_uid = p_source_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', p_source_uid;
  END IF;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to delete this document';
  END IF;

  -- Look up conv_uid from conversion_parsing
  SELECT conv_uid INTO v_conv_uid
    FROM public.conversion_parsing
    WHERE source_uid = p_source_uid;

  IF v_conv_uid IS NOT NULL THEN
    -- Delete overlays for runs on this document
    DELETE FROM public.block_overlays_v2
      WHERE run_id IN (SELECT run_id FROM public.runs_v2 WHERE conv_uid = v_conv_uid);

    -- Delete runs
    DELETE FROM public.runs_v2 WHERE conv_uid = v_conv_uid;

    -- Delete blocks
    DELETE FROM public.blocks WHERE conv_uid = v_conv_uid;
  END IF;

  -- Delete conversion artifacts
  DELETE FROM public.conversion_representations WHERE source_uid = p_source_uid;
  DELETE FROM public.conversion_parsing WHERE source_uid = p_source_uid;

  -- Delete the document
  DELETE FROM public.source_documents WHERE source_uid = p_source_uid;
END;
$$;

-- RPC: Reset a document back to 'uploaded' so it can be re-parsed.
-- Clears conversion data but keeps the source document row.
CREATE OR REPLACE FUNCTION public.reset_source_document(p_source_uid TEXT)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_conv_uid TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id
    FROM public.source_documents
    WHERE source_uid = p_source_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', p_source_uid;
  END IF;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to reset this document';
  END IF;

  -- Look up conv_uid
  SELECT conv_uid INTO v_conv_uid
    FROM public.conversion_parsing
    WHERE source_uid = p_source_uid;

  IF v_conv_uid IS NOT NULL THEN
    DELETE FROM public.block_overlays_v2
      WHERE run_id IN (SELECT run_id FROM public.runs_v2 WHERE conv_uid = v_conv_uid);
    DELETE FROM public.runs_v2 WHERE conv_uid = v_conv_uid;
    DELETE FROM public.blocks WHERE conv_uid = v_conv_uid;
  END IF;

  DELETE FROM public.conversion_representations WHERE source_uid = p_source_uid;
  DELETE FROM public.conversion_parsing WHERE source_uid = p_source_uid;

  -- Reset status back to uploaded
  UPDATE public.source_documents
    SET status = 'uploaded', error = NULL, conversion_job_id = NULL
    WHERE source_uid = p_source_uid;
END;
$$;

-- Grant execute to authenticated users (ownership checked inside the function)
GRANT EXECUTE ON FUNCTION public.delete_source_document(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_source_document(TEXT) TO authenticated;

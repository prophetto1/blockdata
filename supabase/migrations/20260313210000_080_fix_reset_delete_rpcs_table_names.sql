-- Migration 080: fix delete_source_document and reset_source_document RPCs.
-- Both referenced block_overlays_v2 and runs_v2 which were renamed to
-- block_overlays and runs. This caused both RPCs to fail with
-- "relation block_overlays_v2 does not exist".

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

  SELECT conv_uid INTO v_conv_uid
    FROM public.conversion_parsing
    WHERE source_uid = p_source_uid;

  IF v_conv_uid IS NOT NULL THEN
    DELETE FROM public.block_overlays
      WHERE run_id IN (SELECT run_id FROM public.runs WHERE conv_uid = v_conv_uid);
    DELETE FROM public.runs WHERE conv_uid = v_conv_uid;
    DELETE FROM public.blocks WHERE conv_uid = v_conv_uid;
  END IF;

  DELETE FROM public.conversion_representations WHERE source_uid = p_source_uid;
  DELETE FROM public.conversion_parsing WHERE source_uid = p_source_uid;
  DELETE FROM public.source_documents WHERE source_uid = p_source_uid;
END;
$$;

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

  SELECT conv_uid INTO v_conv_uid
    FROM public.conversion_parsing
    WHERE source_uid = p_source_uid;

  IF v_conv_uid IS NOT NULL THEN
    DELETE FROM public.block_overlays
      WHERE run_id IN (SELECT run_id FROM public.runs WHERE conv_uid = v_conv_uid);
    DELETE FROM public.runs WHERE conv_uid = v_conv_uid;
    DELETE FROM public.blocks WHERE conv_uid = v_conv_uid;
  END IF;

  DELETE FROM public.conversion_representations WHERE source_uid = p_source_uid;
  DELETE FROM public.conversion_parsing WHERE source_uid = p_source_uid;

  UPDATE public.source_documents
    SET status = 'uploaded', error = NULL, conversion_job_id = NULL
    WHERE source_uid = p_source_uid;
END;
$$;

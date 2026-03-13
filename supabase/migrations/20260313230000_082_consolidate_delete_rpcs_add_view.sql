-- Migration 082: Consolidate delete RPCs, add ownership checks, create view_documents.
--
-- 1. Drop delete_document (no ownership check, replaced by delete_source_document)
-- 2. Rewrite delete_project to use delete_source_document + add ownership check
-- 3. Create view_documents (was missing from migrations)

-- =========================================================================
-- 1. Drop the unsafe delete_document RPC
-- =========================================================================
DROP FUNCTION IF EXISTS public.delete_document(TEXT);

-- =========================================================================
-- 2. Rewrite delete_project with ownership check
-- =========================================================================
CREATE OR REPLACE FUNCTION public.delete_project(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_source_uid TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id
    FROM public.user_projects
    WHERE project_id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to delete this project';
  END IF;

  FOR v_source_uid IN
    SELECT source_uid FROM public.source_documents WHERE project_id = p_project_id
  LOOP
    PERFORM public.delete_source_document(v_source_uid);
  END LOOP;

  DELETE FROM public.user_projects WHERE project_id = p_project_id;
END;
$$;

-- =========================================================================
-- 3. Create view_documents (join source_documents + conversion_parsing)
-- =========================================================================
CREATE OR REPLACE VIEW public.view_documents AS
SELECT
  sd.source_uid,
  sd.owner_id,
  sd.source_type,
  sd.source_filesize,
  sd.source_total_characters,
  sd.source_locator,
  sd.doc_title,
  sd.uploaded_at,
  sd.updated_at,
  sd.status,
  sd.error,
  sd.conversion_job_id,
  sd.project_id,
  cp.conv_uid,
  cp.conv_status,
  cp.conv_parsing_tool,
  cp.conv_representation_type,
  cp.conv_total_blocks,
  cp.conv_block_type_freq,
  cp.conv_total_characters,
  cp.conv_locator
FROM public.source_documents sd
LEFT JOIN public.conversion_parsing cp ON cp.source_uid = sd.source_uid;

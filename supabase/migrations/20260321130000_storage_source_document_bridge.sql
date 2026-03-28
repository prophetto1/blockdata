-- Add source-document metadata to storage reservations so source uploads can
-- write through to source_documents on completion.

ALTER TABLE public.storage_upload_reservations
  ADD COLUMN IF NOT EXISTS doc_title text,
  ADD COLUMN IF NOT EXISTS source_type text;

UPDATE public.storage_upload_reservations
   SET doc_title = COALESCE(doc_title, original_filename)
 WHERE status = 'pending'
   AND doc_title IS NULL;

UPDATE public.storage_upload_reservations
   SET source_type = COALESCE(source_type, 'binary')
 WHERE status = 'pending'
   AND storage_kind = 'source'
   AND source_type IS NULL;

DROP FUNCTION IF EXISTS public.reserve_user_storage(UUID, UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.reserve_user_storage(
  p_user_id UUID,
  p_project_id UUID,
  p_bucket TEXT,
  p_object_key TEXT,
  p_requested_bytes BIGINT,
  p_content_type TEXT,
  p_original_filename TEXT,
  p_storage_kind TEXT DEFAULT 'source',
  p_source_uid TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_doc_title TEXT DEFAULT NULL
)
RETURNS public.storage_upload_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quota public.storage_quotas;
  v_reservation public.storage_upload_reservations;
BEGIN
  IF p_requested_bytes < 0 THEN
    RAISE EXCEPTION 'requested bytes must be non-negative';
  END IF;

  IF p_project_id IS NOT NULL AND NOT public._storage_user_owns_project(p_user_id, p_project_id) THEN
    RAISE EXCEPTION 'project does not belong to user';
  END IF;

  IF p_storage_kind NOT IN ('source', 'converted', 'parsed', 'export') THEN
    RAISE EXCEPTION 'invalid storage kind';
  END IF;

  SELECT *
  INTO v_quota
  FROM public.storage_quotas
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quota not provisioned for user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.storage_upload_reservations r
    WHERE r.owner_user_id = p_user_id
      AND r.object_key = p_object_key
      AND r.bucket = p_bucket
      AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'pending reservation already exists for this object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.storage_objects so
    WHERE so.owner_user_id = p_user_id
      AND so.bucket = p_bucket
      AND so.object_key = p_object_key
      AND so.status = 'active'
  ) THEN
    RAISE EXCEPTION 'object already exists';
  END IF;

  IF v_quota.used_bytes + v_quota.reserved_bytes + p_requested_bytes > v_quota.quota_bytes THEN
    RAISE EXCEPTION 'storage quota exceeded';
  END IF;

  UPDATE public.storage_quotas
  SET reserved_bytes = reserved_bytes + p_requested_bytes,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.storage_upload_reservations (
    owner_user_id,
    project_id,
    bucket,
    object_key,
    requested_bytes,
    content_type,
    original_filename,
    storage_kind,
    source_uid,
    source_type,
    doc_title
  )
  VALUES (
    p_user_id,
    p_project_id,
    p_bucket,
    p_object_key,
    p_requested_bytes,
    p_content_type,
    p_original_filename,
    p_storage_kind,
    p_source_uid,
    p_source_type,
    p_doc_title
  )
  RETURNING *
  INTO v_reservation;

  RETURN v_reservation;
END;
$$;

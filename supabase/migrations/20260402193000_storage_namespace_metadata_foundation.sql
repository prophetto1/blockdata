-- Add namespace metadata needed to preserve storage-surface ownership across
-- reservations, stored objects, and Assets-owned source documents.

ALTER TABLE public.storage_upload_reservations
  ADD COLUMN storage_surface TEXT;

ALTER TABLE public.storage_upload_reservations
  ADD COLUMN storage_service_slug TEXT;

ALTER TABLE public.storage_upload_reservations
  ADD CONSTRAINT storage_upload_reservations_storage_surface_check
  CHECK (storage_surface IN ('assets', 'pipeline-services'));

ALTER TABLE public.storage_upload_reservations
  ADD CONSTRAINT storage_upload_reservations_pipeline_service_slug_check
  CHECK (
    storage_surface IS DISTINCT FROM 'pipeline-services'
    OR storage_service_slug IS NOT NULL
  );

ALTER TABLE public.storage_objects
  ADD COLUMN storage_surface TEXT;

ALTER TABLE public.storage_objects
  ADD COLUMN storage_service_slug TEXT;

ALTER TABLE public.storage_objects
  ADD COLUMN doc_title TEXT;

ALTER TABLE public.storage_objects
  ADD COLUMN source_type TEXT;

ALTER TABLE public.storage_objects
  ADD CONSTRAINT storage_objects_storage_surface_check
  CHECK (storage_surface IN ('assets', 'pipeline-services'));

ALTER TABLE public.storage_objects
  ADD CONSTRAINT storage_objects_pipeline_service_slug_check
  CHECK (
    storage_surface IS DISTINCT FROM 'pipeline-services'
    OR storage_service_slug IS NOT NULL
  );

ALTER TABLE public.source_documents
  ADD COLUMN document_surface TEXT;

ALTER TABLE public.source_documents
  ADD COLUMN storage_object_id UUID;

ALTER TABLE public.source_documents
  ADD CONSTRAINT source_documents_document_surface_check
  CHECK (document_surface IN ('assets', 'pipeline-services'));

ALTER TABLE public.source_documents
  ADD CONSTRAINT source_documents_storage_object_id_fkey
  FOREIGN KEY (storage_object_id)
  REFERENCES public.storage_objects(storage_object_id)
  ON DELETE SET NULL;

CREATE INDEX storage_objects_owner_project_surface_idx
  ON public.storage_objects (owner_user_id, project_id, storage_surface, created_at DESC);

CREATE INDEX storage_objects_pipeline_surface_idx
  ON public.storage_objects (
    owner_user_id,
    project_id,
    storage_surface,
    storage_service_slug,
    storage_kind,
    created_at DESC
  );

CREATE INDEX source_documents_document_surface_idx
  ON public.source_documents (owner_id, project_id, document_surface, created_at DESC);

DROP FUNCTION IF EXISTS public.reserve_user_storage(
  UUID,
  UUID,
  TEXT,
  TEXT,
  BIGINT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);

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
  p_doc_title TEXT DEFAULT NULL,
  p_storage_surface TEXT DEFAULT NULL,
  p_storage_service_slug TEXT DEFAULT NULL
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

  IF p_storage_kind NOT IN ('source', 'converted', 'parsed', 'export', 'pipeline') THEN
    RAISE EXCEPTION 'invalid storage kind';
  END IF;

  IF p_storage_surface IS NOT NULL AND p_storage_surface NOT IN ('assets', 'pipeline-services') THEN
    RAISE EXCEPTION 'invalid storage surface';
  END IF;

  IF p_storage_surface = 'pipeline-services' AND p_storage_service_slug IS NULL THEN
    RAISE EXCEPTION 'pipeline service slug is required for pipeline-services surface';
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
    doc_title,
    storage_surface,
    storage_service_slug
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
    p_doc_title,
    p_storage_surface,
    p_storage_service_slug
  )
  RETURNING *
  INTO v_reservation;

  RETURN v_reservation;
END;
$$;

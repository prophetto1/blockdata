-- Storage quota + object + reservation model and RPCs.
--
-- This migration implements the storage RPC contract expected by
-- services/platform-api/app/api/routes/storage.py, including:
-- - storage_objects.reservation_id
-- - fixed complete_user_storage_upload path
-- - fixed reserve_user_storage
-- - fixed cancel_user_storage_reservation and release_expired_storage_reservations
-- - delete_user_storage_object
-- - reconcile_user_storage_usage
-- - storage_kind/status constraints and cleanup indexes

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Storage quota per user
CREATE TABLE IF NOT EXISTS public.storage_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_bytes BIGINT NOT NULL DEFAULT 53687091200 CHECK (quota_bytes >= 0),
  used_bytes BIGINT NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  reserved_bytes BIGINT NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  plan_code TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upload reservations created before upload completes
CREATE TABLE IF NOT EXISTS public.storage_upload_reservations (
  reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  requested_bytes BIGINT NOT NULL CHECK (requested_bytes >= 0),
  content_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_kind TEXT NOT NULL DEFAULT 'source'
    CHECK (storage_kind IN ('source', 'converted', 'parsed', 'export')),
  source_uid TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Stored object rows that count against used quota
CREATE TABLE IF NOT EXISTS public.storage_objects (
  storage_object_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  content_type TEXT NOT NULL,
  storage_kind TEXT NOT NULL DEFAULT 'source'
    CHECK (storage_kind IN ('source', 'converted', 'parsed', 'export')),
  source_uid TEXT,
  checksum_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deleted')),
  reservation_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'storage_objects_reservation_id_fkey'
      AND c.conrelid = 'public.storage_objects'::regclass
  ) THEN
    ALTER TABLE public.storage_objects
      ADD CONSTRAINT storage_objects_reservation_id_fkey
      FOREIGN KEY (reservation_id)
      REFERENCES public.storage_upload_reservations (reservation_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Hardening and lookup indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_storage_objects_bucket_object
  ON public.storage_objects (bucket, object_key);

CREATE INDEX IF NOT EXISTS idx_storage_objects_owner_user_id
  ON public.storage_objects (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_storage_objects_owner_status
  ON public.storage_objects (owner_user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_storage_upload_reservations_owner_key_active
  ON public.storage_upload_reservations (owner_user_id, object_key)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_storage_upload_reservations_owner_user_id
  ON public.storage_upload_reservations (owner_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_upload_reservations_status_expires_at
  ON public.storage_upload_reservations (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_storage_upload_reservations_project_id
  ON public.storage_upload_reservations (project_id);

-- Keep reservations short-lived (30 minutes)
ALTER TABLE public.storage_upload_reservations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 minutes');

-- Seed storage quota for existing users
INSERT INTO public.storage_quotas (user_id, quota_bytes, used_bytes, reserved_bytes, plan_code)
SELECT
  u.id,
  53687091200,
  0,
  0,
  'free'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.storage_quotas sq
  WHERE sq.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Extend signup behavior without overwriting existing handle_new_user_profile().
CREATE OR REPLACE FUNCTION public.handle_new_user_storage_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.storage_quotas (user_id, quota_bytes, used_bytes, reserved_bytes, plan_code)
  VALUES (NEW.id, 53687091200, 0, 0, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_storage_quota ON auth.users;
CREATE TRIGGER on_auth_user_created_storage_quota
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_storage_quota();

-- RLS
ALTER TABLE public.storage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_upload_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_quotas_select_own ON public.storage_quotas;
CREATE POLICY storage_quotas_select_own
  ON public.storage_quotas
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS storage_upload_reservations_select_own ON public.storage_upload_reservations;
CREATE POLICY storage_upload_reservations_select_own
  ON public.storage_upload_reservations
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS storage_upload_reservations_update_own ON public.storage_upload_reservations;
CREATE POLICY storage_upload_reservations_update_own
  ON public.storage_upload_reservations
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS storage_objects_select_own ON public.storage_objects;
CREATE POLICY storage_objects_select_own
  ON public.storage_objects
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid() AND status = 'active');

DROP POLICY IF EXISTS storage_objects_update_own ON public.storage_objects;
CREATE POLICY storage_objects_update_own
  ON public.storage_objects
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Internal helper: project ownership check against whichever project table is present.
CREATE OR REPLACE FUNCTION public._storage_user_owns_project(
  p_user_id UUID,
  p_project_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_has_user_projects BOOLEAN;
  v_count BIGINT := 0;
BEGIN
  IF p_project_id IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND c.relname = 'user_projects'
  ) INTO v_has_user_projects;

  IF v_has_user_projects THEN
    SELECT COUNT(*) INTO v_count
    FROM public.user_projects up
    WHERE up.project_id = p_project_id
      AND up.owner_id = p_user_id;
  ELSE
    SELECT COUNT(*) INTO v_count
    FROM public.projects p
    WHERE p.project_id = p_project_id
      AND p.owner_id = p_user_id;
  END IF;

  RETURN v_count > 0;
END;
$$;

-- Reserve quota for a new upload.
CREATE OR REPLACE FUNCTION public.reserve_user_storage(
  p_user_id UUID,
  p_project_id UUID,
  p_bucket TEXT,
  p_object_key TEXT,
  p_requested_bytes BIGINT,
  p_content_type TEXT,
  p_original_filename TEXT,
  p_storage_kind TEXT DEFAULT 'source',
  p_source_uid TEXT DEFAULT NULL
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
    source_uid
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
    p_source_uid
  )
  RETURNING *
  INTO v_reservation;

  RETURN v_reservation;
END;
$$;

-- Complete a reservation and account final bytes with guardrails.
CREATE OR REPLACE FUNCTION public.complete_user_storage_upload(
  p_reservation_id UUID,
  p_owner_user_id UUID,
  p_actual_bytes BIGINT DEFAULT NULL,
  p_checksum_sha256 TEXT DEFAULT NULL
)
RETURNS public.storage_objects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reservation public.storage_upload_reservations;
  v_finalized_bytes BIGINT;
  v_object public.storage_objects;
BEGIN
  SELECT *
  INTO v_reservation
  FROM public.storage_upload_reservations
  WHERE reservation_id = p_reservation_id
    AND owner_user_id = p_owner_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation not found';
  END IF;

  IF v_reservation.status = 'completed' THEN
    SELECT *
    INTO v_object
    FROM public.storage_objects
    WHERE reservation_id = p_reservation_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'object row missing';
    END IF;

    RETURN v_object;
  END IF;

  IF v_reservation.status <> 'pending' THEN
    RAISE EXCEPTION 'reservation already % — cannot complete', v_reservation.status;
  END IF;

  IF v_reservation.expires_at <= now() THEN
    RAISE EXCEPTION 'reservation expired';
  END IF;

  v_finalized_bytes := COALESCE(p_actual_bytes, v_reservation.requested_bytes);

  IF v_finalized_bytes < 0 THEN
    RAISE EXCEPTION 'actual bytes must be non-negative';
  END IF;

  IF v_finalized_bytes > v_reservation.requested_bytes THEN
    RAISE EXCEPTION 'actual bytes cannot exceed reserved bytes';
  END IF;

  INSERT INTO public.storage_objects (
    reservation_id,
    owner_user_id,
    project_id,
    bucket,
    object_key,
    byte_size,
    content_type,
    storage_kind,
    source_uid,
    checksum_sha256,
    status
  )
  VALUES (
    v_reservation.reservation_id,
    v_reservation.owner_user_id,
    v_reservation.project_id,
    v_reservation.bucket,
    v_reservation.object_key,
    v_finalized_bytes,
    v_reservation.content_type,
    v_reservation.storage_kind,
    v_reservation.source_uid,
    p_checksum_sha256,
    'active'
  )
  ON CONFLICT (reservation_id) DO UPDATE
    SET byte_size = EXCLUDED.byte_size,
        checksum_sha256 = EXCLUDED.checksum_sha256,
        status = EXCLUDED.status,
        content_type = EXCLUDED.content_type,
        source_uid = EXCLUDED.source_uid
  RETURNING * INTO v_object;

  UPDATE public.storage_quotas
  SET reserved_bytes = reserved_bytes - v_reservation.requested_bytes,
      used_bytes = used_bytes + v_finalized_bytes,
      updated_at = now()
  WHERE user_id = p_owner_user_id
    AND reserved_bytes >= v_reservation.requested_bytes;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserved bytes underflow';
  END IF;

  UPDATE public.storage_upload_reservations
  SET status = 'completed',
      completed_at = now()
  WHERE reservation_id = p_reservation_id;

  RETURN v_object;
END;
$$;

-- Cancel a pending reservation and release reserved bytes with clamping.
CREATE OR REPLACE FUNCTION public.cancel_user_storage_reservation(
  p_reservation_id UUID,
  p_owner_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reservation public.storage_upload_reservations;
BEGIN
  SELECT *
  INTO v_reservation
  FROM public.storage_upload_reservations
  WHERE reservation_id = p_reservation_id
    AND owner_user_id = p_owner_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation not found';
  END IF;

  IF v_reservation.status = 'cancelled' THEN
    RETURN;
  END IF;

  IF v_reservation.status <> 'pending' THEN
    RAISE EXCEPTION 'reservation already % — cannot cancel', v_reservation.status;
  END IF;

  UPDATE public.storage_quotas
  SET reserved_bytes = GREATEST(reserved_bytes - v_reservation.requested_bytes, 0),
      updated_at = now()
  WHERE user_id = p_owner_user_id;

  UPDATE public.storage_upload_reservations
  SET status = 'cancelled',
      completed_at = now()
  WHERE reservation_id = p_reservation_id;
END;
$$;

-- Reclaim expired reservations in bulk with clamped release.
CREATE OR REPLACE FUNCTION public.release_expired_storage_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_released INTEGER := 0;
BEGIN
  WITH expired AS (
    UPDATE public.storage_upload_reservations
    SET status = 'cancelled',
        completed_at = now()
    WHERE reservation_id IN (
      SELECT reservation_id
      FROM public.storage_upload_reservations r
      WHERE r.status = 'pending'
        AND r.expires_at <= now()
      FOR UPDATE SKIP LOCKED
    )
      AND status = 'pending'
      AND expires_at <= now()
    RETURNING owner_user_id, requested_bytes
  ),
  quota_update AS (
    UPDATE public.storage_quotas q
    SET reserved_bytes = GREATEST(q.reserved_bytes - e.total_requested, 0),
        updated_at = now()
    FROM (
      SELECT owner_user_id, COALESCE(SUM(requested_bytes), 0) AS total_requested
      FROM expired
      GROUP BY owner_user_id
    ) e
    WHERE q.user_id = e.owner_user_id
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO v_released FROM expired;

  RETURN v_released;
END;
$$;

-- Delete stored object metadata and release used bytes.
CREATE OR REPLACE FUNCTION public.delete_user_storage_object(
  p_user_id UUID,
  p_storage_object_id UUID
)
RETURNS public.storage_objects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_object public.storage_objects;
BEGIN
  SELECT *
  INTO v_object
  FROM public.storage_objects
  WHERE storage_object_id = p_storage_object_id
    AND owner_user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'object not found';
  END IF;

  IF v_object.status = 'deleted' THEN
    RETURN v_object;
  END IF;

  UPDATE public.storage_quotas
  SET used_bytes = GREATEST(used_bytes - v_object.byte_size, 0),
      updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.storage_objects
  SET status = 'deleted'
  WHERE storage_object_id = p_storage_object_id
  RETURNING * INTO v_object;

  RETURN v_object;
END;
$$;

-- Recompute counters from source-of-truth rows.
CREATE OR REPLACE FUNCTION public.reconcile_user_storage_usage(
  p_user_id UUID
)
RETURNS public.storage_quotas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_used BIGINT;
  v_reserved BIGINT;
  v_quota public.storage_quotas;
BEGIN
  SELECT COALESCE(SUM(byte_size), 0)
  INTO v_used
  FROM public.storage_objects
  WHERE owner_user_id = p_user_id
    AND status = 'active';

  SELECT COALESCE(SUM(requested_bytes), 0)
  INTO v_reserved
  FROM public.storage_upload_reservations
  WHERE owner_user_id = p_user_id
    AND status = 'pending';

  UPDATE public.storage_quotas
  SET used_bytes = v_used,
      reserved_bytes = v_reserved,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_quota;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quota not found';
  END IF;

  RETURN v_quota;
END;
$$;

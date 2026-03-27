-- Storage default quota policy for new signups.
--
-- Moves signup quota assignment from a hard-coded 50 GB literal to the
-- admin_runtime_policy table while preserving the current default.

INSERT INTO public.admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES (
  'storage.default_new_user_quota_bytes',
  '53687091200'::jsonb,
  'integer',
  'Default storage quota for newly created users'
)
ON CONFLICT (policy_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_default_user_storage_quota_bytes()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_raw jsonb;
BEGIN
  SELECT value_jsonb
    INTO v_raw
    FROM public.admin_runtime_policy
   WHERE policy_key = 'storage.default_new_user_quota_bytes';

  RETURN GREATEST(
    COALESCE(NULLIF(TRIM('"' FROM v_raw::text), '')::BIGINT, 53687091200),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_storage_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.storage_quotas (user_id, quota_bytes, used_bytes, reserved_bytes, plan_code)
  VALUES (NEW.id, public.current_default_user_storage_quota_bytes(), 0, 0, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

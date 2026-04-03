-- When the admin storage quota policy changes, propagate to all existing users.

CREATE OR REPLACE FUNCTION public.propagate_storage_quota_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new_quota BIGINT;
BEGIN
  -- Only fire for the storage quota policy key.
  IF NEW.policy_key <> 'storage.default_new_user_quota_bytes' THEN
    RETURN NEW;
  END IF;

  -- Only fire if the value actually changed.
  IF OLD IS NOT NULL AND OLD.value_jsonb IS NOT DISTINCT FROM NEW.value_jsonb THEN
    RETURN NEW;
  END IF;

  v_new_quota := GREATEST(
    COALESCE(NULLIF(TRIM('"' FROM NEW.value_jsonb::text), '')::BIGINT, 53687091200),
    0
  );

  UPDATE public.storage_quotas
     SET quota_bytes = v_new_quota,
         updated_at  = now()
   WHERE quota_bytes IS DISTINCT FROM v_new_quota;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_storage_quota_policy_changed ON public.admin_runtime_policy;
CREATE TRIGGER on_storage_quota_policy_changed
  AFTER INSERT OR UPDATE ON public.admin_runtime_policy
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_storage_quota_policy();
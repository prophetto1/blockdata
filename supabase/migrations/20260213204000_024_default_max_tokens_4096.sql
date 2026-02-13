-- Raise default max token baseline from 2000 -> 4096 across user key defaults and runtime policy.

-- 1) Table-level default for new user_api_keys rows.
ALTER TABLE public.user_api_keys
  ALTER COLUMN default_max_tokens SET DEFAULT 4096;

-- 2) Migrate existing rows still on the old baseline.
UPDATE public.user_api_keys
SET default_max_tokens = 4096,
    updated_at = now()
WHERE default_max_tokens = 2000;

-- 3) Refresh save_api_key fallback to the new baseline.
CREATE OR REPLACE FUNCTION public.save_api_key(
  p_provider TEXT,
  p_api_key_encrypted TEXT,
  p_key_suffix TEXT,
  p_default_model TEXT DEFAULT NULL,
  p_default_temperature NUMERIC DEFAULT NULL,
  p_default_max_tokens INTEGER DEFAULT NULL,
  p_base_url TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_api_key_encrypted IS NULL OR btrim(p_api_key_encrypted) = '' THEN
    RAISE EXCEPTION 'Missing encrypted API key';
  END IF;

  IF left(p_api_key_encrypted, 7) <> 'enc:v1:' THEN
    RAISE EXCEPTION 'API key must be encrypted (enc:v1:...)';
  END IF;

  IF p_key_suffix IS NULL OR length(p_key_suffix) <> 4 THEN
    RAISE EXCEPTION 'Invalid key suffix';
  END IF;

  INSERT INTO public.user_api_keys (
    user_id,
    provider,
    api_key_encrypted,
    key_suffix,
    default_model,
    default_temperature,
    default_max_tokens,
    base_url,
    updated_at
  ) VALUES (
    v_user_id,
    p_provider,
    p_api_key_encrypted,
    p_key_suffix,
    COALESCE(p_default_model, 'claude-sonnet-4-5-20250929'),
    COALESCE(p_default_temperature, 0.3),
    COALESCE(p_default_max_tokens, 4096),
    p_base_url,
    now()
  )
  ON CONFLICT (user_id, provider) DO UPDATE SET
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    key_suffix = EXCLUDED.key_suffix,
    default_model = COALESCE(EXCLUDED.default_model, public.user_api_keys.default_model),
    default_temperature = COALESCE(EXCLUDED.default_temperature, public.user_api_keys.default_temperature),
    default_max_tokens = COALESCE(EXCLUDED.default_max_tokens, public.user_api_keys.default_max_tokens),
    base_url = EXCLUDED.base_url,
    is_valid = NULL,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'suffix', p_key_suffix);
END;
$$;

-- 4) Keep runtime policy baseline aligned, but only if still on old default.
INSERT INTO public.admin_runtime_policy (
  policy_key,
  value_jsonb,
  value_type,
  description
) VALUES (
  'models.platform_default_max_tokens',
  '4096'::jsonb,
  'integer',
  'Platform baseline max tokens per block fallback'
)
ON CONFLICT (policy_key) DO UPDATE
SET value_jsonb = CASE
      WHEN public.admin_runtime_policy.value_jsonb = '2000'::jsonb THEN EXCLUDED.value_jsonb
      ELSE public.admin_runtime_policy.value_jsonb
    END,
    updated_at = CASE
      WHEN public.admin_runtime_policy.value_jsonb = '2000'::jsonb THEN now()
      ELSE public.admin_runtime_policy.updated_at
    END;

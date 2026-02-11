-- Harden user_api_keys so the browser cannot read/write api_key_encrypted directly.
-- Enforce that save_api_key only accepts encrypted keys.

-- Replace the original plaintext save_api_key signature.
DROP FUNCTION IF EXISTS public.save_api_key(TEXT, TEXT, TEXT, NUMERIC, INTEGER);

CREATE OR REPLACE FUNCTION public.save_api_key(
  p_provider TEXT,
  p_api_key_encrypted TEXT,
  p_key_suffix TEXT,
  p_default_model TEXT DEFAULT NULL,
  p_default_temperature NUMERIC DEFAULT NULL,
  p_default_max_tokens INTEGER DEFAULT NULL
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
    updated_at
  ) VALUES (
    v_user_id,
    p_provider,
    p_api_key_encrypted,
    p_key_suffix,
    COALESCE(p_default_model, 'claude-sonnet-4-5-20250929'),
    COALESCE(p_default_temperature, 0.3),
    COALESCE(p_default_max_tokens, 2000),
    now()
  )
  ON CONFLICT (user_id, provider) DO UPDATE SET
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    key_suffix = EXCLUDED.key_suffix,
    default_model = COALESCE(EXCLUDED.default_model, public.user_api_keys.default_model),
    default_temperature = COALESCE(EXCLUDED.default_temperature, public.user_api_keys.default_temperature),
    default_max_tokens = COALESCE(EXCLUDED.default_max_tokens, public.user_api_keys.default_max_tokens),
    is_valid = NULL,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'suffix', p_key_suffix);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_api_key_defaults(
  p_provider TEXT,
  p_default_model TEXT DEFAULT NULL,
  p_default_temperature NUMERIC DEFAULT NULL,
  p_default_max_tokens INTEGER DEFAULT NULL
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

  UPDATE public.user_api_keys
  SET default_model = COALESCE(p_default_model, default_model),
      default_temperature = COALESCE(p_default_temperature, default_temperature),
      default_max_tokens = COALESCE(p_default_max_tokens, default_max_tokens),
      updated_at = now()
  WHERE user_id = v_user_id
    AND provider = p_provider;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No API key configured for provider %', p_provider;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_api_key(p_provider TEXT)
RETURNS JSONB
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

  DELETE FROM public.user_api_keys
  WHERE user_id = v_user_id AND provider = p_provider;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Lock down table privileges.
REVOKE ALL ON TABLE public.user_api_keys FROM anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  provider,
  key_suffix,
  is_valid,
  default_model,
  default_temperature,
  default_max_tokens,
  created_at,
  updated_at
) ON TABLE public.user_api_keys TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_api_keys TO service_role;

-- Tighten RLS policies to authenticated role only.
DROP POLICY IF EXISTS user_api_keys_select ON public.user_api_keys;
DROP POLICY IF EXISTS user_api_keys_insert ON public.user_api_keys;
DROP POLICY IF EXISTS user_api_keys_update ON public.user_api_keys;
DROP POLICY IF EXISTS user_api_keys_delete ON public.user_api_keys;

CREATE POLICY user_api_keys_select ON public.user_api_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_api_keys_insert ON public.user_api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_api_keys_update ON public.user_api_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_api_keys_delete ON public.user_api_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Restrict RPC execute privileges.
REVOKE EXECUTE ON FUNCTION public.save_api_key(text, text, text, text, numeric, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_api_key_defaults(text, text, numeric, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_api_key(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_api_key(text, text, text, text, numeric, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_api_key_defaults(text, text, numeric, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_api_key(text) TO authenticated, service_role;

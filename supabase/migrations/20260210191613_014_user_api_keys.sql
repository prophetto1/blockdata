-- Table for per-user LLM API keys and model defaults
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'anthropic',
  api_key_encrypted TEXT NOT NULL,
  key_suffix TEXT NOT NULL DEFAULT '',
  is_valid BOOLEAN DEFAULT NULL,
  default_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  default_temperature NUMERIC(3,2) DEFAULT 0.3,
  default_max_tokens INTEGER DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- RLS: users can only see/modify their own keys
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_api_keys_select ON public.user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_api_keys_insert ON public.user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_api_keys_update ON public.user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY user_api_keys_delete ON public.user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- RPC: save_api_key — upserts key and extracts suffix
CREATE OR REPLACE FUNCTION public.save_api_key(
  p_provider TEXT,
  p_api_key TEXT,
  p_default_model TEXT DEFAULT NULL,
  p_default_temperature NUMERIC DEFAULT NULL,
  p_default_max_tokens INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_suffix TEXT;
BEGIN
  v_suffix := right(p_api_key, 4);

  INSERT INTO user_api_keys (user_id, provider, api_key_encrypted, key_suffix,
    default_model, default_temperature, default_max_tokens, updated_at)
  VALUES (
    auth.uid(), p_provider, p_api_key, v_suffix,
    COALESCE(p_default_model, 'claude-sonnet-4-5-20250929'),
    COALESCE(p_default_temperature, 0.3),
    COALESCE(p_default_max_tokens, 2000),
    now()
  )
  ON CONFLICT (user_id, provider) DO UPDATE SET
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    key_suffix = EXCLUDED.key_suffix,
    default_model = COALESCE(EXCLUDED.default_model, user_api_keys.default_model),
    default_temperature = COALESCE(EXCLUDED.default_temperature, user_api_keys.default_temperature),
    default_max_tokens = COALESCE(EXCLUDED.default_max_tokens, user_api_keys.default_max_tokens),
    is_valid = NULL,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'suffix', v_suffix);
END;
$$;

-- RPC: update_api_key_defaults — update model/temp/max_tokens without resending the key
CREATE OR REPLACE FUNCTION public.update_api_key_defaults(
  p_provider TEXT,
  p_default_model TEXT DEFAULT NULL,
  p_default_temperature NUMERIC DEFAULT NULL,
  p_default_max_tokens INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE user_api_keys
  SET default_model = COALESCE(p_default_model, default_model),
      default_temperature = COALESCE(p_default_temperature, default_temperature),
      default_max_tokens = COALESCE(p_default_max_tokens, default_max_tokens),
      updated_at = now()
  WHERE user_id = auth.uid()
    AND provider = p_provider;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No API key configured for provider %', p_provider;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: delete_api_key — remove a saved key
CREATE OR REPLACE FUNCTION public.delete_api_key(p_provider TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM user_api_keys
  WHERE user_id = auth.uid() AND provider = p_provider;

  RETURN jsonb_build_object('ok', true);
END;
$$;

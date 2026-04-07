UPDATE public.agchain_provider_registry
SET
  supported_auth_kinds_jsonb = '["access_token", "credential_json", "api_key"]'::jsonb,
  updated_at = now()
WHERE provider_slug = 'vertex-ai'
  AND supported_auth_kinds_jsonb IS DISTINCT FROM '["access_token", "credential_json", "api_key"]'::jsonb;

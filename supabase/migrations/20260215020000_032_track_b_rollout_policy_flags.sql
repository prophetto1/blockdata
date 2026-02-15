-- Migration 032: Track B rollout policy switches for superuser controls
--
-- Adds explicit runtime policy keys so Track B API and worker can be
-- disabled safely without code redeploy.

INSERT INTO public.admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES
  (
    'track_b.api_enabled',
    'true'::jsonb,
    'boolean',
    'Enable Track B run/read/cancel API surface.'
  ),
  (
    'track_b.worker_enabled',
    'true'::jsonb,
    'boolean',
    'Enable Track B worker claim/process loop.'
  )
ON CONFLICT (policy_key) DO NOTHING;

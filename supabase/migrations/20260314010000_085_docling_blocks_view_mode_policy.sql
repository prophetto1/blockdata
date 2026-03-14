INSERT INTO public.admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES (
  'platform.docling_blocks_mode',
  '"normalized"'::jsonb,
  'string',
  'Controls whether the Parse Blocks tab shows normalized Blockdata blocks or raw Docling-native items.'
)
ON CONFLICT (policy_key) DO NOTHING;

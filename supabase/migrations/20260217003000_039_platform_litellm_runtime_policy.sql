-- Add platform LLM transport controls.
-- Defaults preserve current behavior (Vertex AI path).

INSERT INTO public.admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES
  (
    'models.platform_llm_transport',
    '"vertex_ai"'::jsonb,
    'string',
    'Platform LLM transport: vertex_ai or litellm_openai'
  ),
  (
    'models.platform_litellm_base_url',
    '""'::jsonb,
    'string',
    'LiteLLM OpenAI-compatible base URL (for example: https://litellm.example.com/v1)'
  )
ON CONFLICT (policy_key) DO NOTHING;


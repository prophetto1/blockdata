-- Register javalang as a parse-stage integration service.

INSERT INTO public.service_registry
  (service_id, service_type, service_name, base_url, config, primary_stage, execution_plane)
VALUES
  ('b0000000-0000-0000-0000-000000000003', 'integration', 'javalang',
   'http://localhost:8000',
   '{"origin":"javalang","library":"javalang","version":"0.13.0"}'::jsonb,
   'parse', 'fastapi')
ON CONFLICT (service_type, service_name) DO UPDATE SET
  primary_stage = EXCLUDED.primary_stage,
  execution_plane = EXCLUDED.execution_plane,
  config = EXCLUDED.config;

INSERT INTO public.service_functions
  (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000003', 'javalang_tokenize', 'parse', 'parse',
   'Tokenize Java', '/javalang_tokenize', 'POST',
   '[{"name":"code","type":"string","required":true},{"name":"ignore_errors","type":"boolean","required":false,"default":false}]'::jsonb,
   'Tokenize Java source with javalang.', '["javalang","java","parse","tokenize"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000003', 'javalang_reformat_tokens', 'parse', 'parse',
   'Reformat Tokens', '/javalang_reformat_tokens', 'POST',
   '[{"name":"code","type":"string","required":true},{"name":"ignore_errors","type":"boolean","required":false,"default":false}]'::jsonb,
   'Tokenize and reformat Java source with javalang.', '["javalang","java","parse","tokens"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000003', 'javalang_parse', 'parse', 'parse',
   'Parse Java', '/javalang_parse', 'POST',
   '[{"name":"code","type":"string","required":true}]'::jsonb,
   'Parse Java compilation unit with javalang.', '["javalang","java","parse"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000003', 'javalang_parse_expression', 'parse', 'parse',
   'Parse Expression', '/javalang_parse_expression', 'POST',
   '[{"name":"expression","type":"string","required":true}]'::jsonb,
   'Parse Java expression with javalang.', '["javalang","java","parse","expression"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000003', 'javalang_parse_member_signature', 'parse', 'parse',
   'Parse Member Signature', '/javalang_parse_member_signature', 'POST',
   '[{"name":"signature","type":"string","required":true}]'::jsonb,
   'Parse Java member signature with javalang.', '["javalang","java","parse","signature"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000003', 'javalang_parse_constructor_signature', 'parse', 'parse',
   'Parse Constructor Signature', '/javalang_parse_constructor_signature', 'POST',
   '[{"name":"signature","type":"string","required":true}]'::jsonb,
   'Parse Java constructor signature with javalang.', '["javalang","java","parse","constructor"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000003', 'javalang_parse_type', 'parse', 'parse',
   'Parse Type', '/javalang_parse_type', 'POST',
   '[{"name":"type_source","type":"string","required":true}]'::jsonb,
   'Parse Java type with javalang.', '["javalang","java","parse","type"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000003', 'javalang_parse_type_signature', 'parse', 'parse',
   'Parse Type Signature', '/javalang_parse_type_signature', 'POST',
   '[{"name":"signature","type":"string","required":true}]'::jsonb,
   'Parse Java type signature with javalang.', '["javalang","java","parse","type-signature"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

NOTIFY pgrst, 'reload schema';
-- Register GCS source and ArangoDB destination as Load-capable services.

INSERT INTO public.service_type_catalog (service_type, label, description)
VALUES ('integration', 'Integration', 'External service integrations')
ON CONFLICT (service_type) DO NOTHING;

-- GCS service
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, primary_stage, execution_plane)
VALUES (
  'b0000000-0000-0000-0000-000000000001', 'integration', 'gcs',
  'http://localhost:8000',
  '{"origin": "io.kestra.plugin.gcp.gcs"}'::jsonb, 'source', 'fastapi'
) ON CONFLICT (service_type, service_name) DO UPDATE SET primary_stage = EXCLUDED.primary_stage, execution_plane = EXCLUDED.execution_plane;

INSERT INTO public.service_functions (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'gcs_list', 'source', 'source',
   'List Objects', '/gcs_list', 'POST',
   '[{"name":"connection_id","type":"string","required":true},
     {"name":"bucket","type":"string","required":true},
     {"name":"prefix","type":"string","required":false},
     {"name":"glob","type":"string","required":false,"default":"*.csv"}]'::jsonb,
   'List objects in a GCS bucket.', '["gcs","source","list"]'::jsonb),

  ('b0000000-0000-0000-0000-000000000001', 'gcs_download_csv', 'source', 'source',
   'Download CSV as JSON', '/gcs_download_csv', 'POST',
   '[{"name":"connection_id","type":"string","required":true},
     {"name":"bucket","type":"string","required":true},
     {"name":"object_name","type":"string","required":true},
     {"name":"key_column","type":"string","required":false}]'::jsonb,
   'Download a CSV from GCS, parse rows into JSON documents, write JSONL to platform storage.',
   '["gcs","source","csv","download"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- ArangoDB service (BD-native)
INSERT INTO public.service_registry (service_id, service_type, service_name, base_url, config, primary_stage, execution_plane)
VALUES (
  'b0000000-0000-0000-0000-000000000002', 'integration', 'arangodb',
  'http://localhost:8000',
  '{"origin": "blockdata.arangodb"}'::jsonb, 'destination', 'fastapi'
) ON CONFLICT (service_type, service_name) DO UPDATE SET primary_stage = EXCLUDED.primary_stage, execution_plane = EXCLUDED.execution_plane;

INSERT INTO public.service_functions (service_id, function_name, function_type, bd_stage, label, entrypoint, http_method, parameter_schema, description, tags)
VALUES
  ('b0000000-0000-0000-0000-000000000002', 'arangodb_load', 'destination', 'destination',
   'Load Documents', '/arangodb_load', 'POST',
   '[{"name":"connection_id","type":"string","required":true},
     {"name":"collection","type":"string","required":true},
     {"name":"source_uri","type":"string","required":false,"description":"JSONL file in platform storage"},
     {"name":"documents","type":"array","required":false,"description":"Inline JSON documents"},
     {"name":"create_collection","type":"boolean","required":false,"default":false}]'::jsonb,
   'Load JSON documents into an ArangoDB collection.',
   '["arangodb","destination","load","bulk"]'::jsonb)
ON CONFLICT (service_id, function_name) DO NOTHING;

-- Map GCS to imported catalog items
UPDATE public.integration_catalog_items
  SET mapped_service_id = 'b0000000-0000-0000-0000-000000000001'
  WHERE plugin_group = 'io.kestra.plugin.gcp.gcs' AND mapped_service_id IS NULL;

NOTIFY pgrst, 'reload schema';

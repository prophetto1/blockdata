-- Migration 063: Register 3 additional eyecite functions — reporters-db, courts-db, stats
-- These expose the reference databases that power citation extraction.

-- 1. Reporter lookup
INSERT INTO public.service_functions (
  service_id, function_name, function_type, label, description,
  entrypoint, http_method, parameter_schema, tags
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'eyecite_reporters',
  'utility',
  'Reporter Lookup',
  'Query the reporters-db database — 1,167 reporters, 2,102 variations across case reporters, statutory sources, and journals. Search by abbreviation, name, cite type, or category.',
  '/execute',
  'POST',
  '[
    {"name":"query","type":"string","required":false,"description":"Search term — matches against abbreviation, full name, and variations. Empty returns all."},
    {"name":"cite_type","type":"enum","required":false,"values":["federal","state","neutral","specialty","specialty_west","specialty_lexis","state_regional","scotus_early"],"description":"Filter by citation type."},
    {"name":"category","type":"enum","required":false,"default":"all","values":["all","reporters","laws","journals"],"description":"Which database to search: case reporters, statutory sources, journals, or all."},
    {"name":"include_variations","type":"boolean","required":false,"default":false,"description":"Include the full variation-to-edition mapping in results."},
    {"name":"limit","type":"integer","required":false,"default":50,"description":"Max results to return."}
  ]'::jsonb,
  '["eyecite","reporters","reference","legal","lookup"]'::jsonb
)
ON CONFLICT (service_id, function_name) DO UPDATE SET
  parameter_schema = EXCLUDED.parameter_schema,
  description = EXCLUDED.description,
  updated_at = now();

-- 2. Court lookup
INSERT INTO public.service_functions (
  service_id, function_name, function_type, label, description,
  entrypoint, http_method, parameter_schema, tags
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'eyecite_courts',
  'utility',
  'Court Lookup',
  'Query the courts-db database — ~400 US courts with hierarchy, date ranges, and appeals paths. Resolve court strings, look up by ID, or filter by system/level/type/location.',
  '/execute',
  'POST',
  '[
    {"name":"query","type":"string","required":false,"description":"Court name or string to resolve (e.g. ''Second Circuit'', ''S.D.N.Y.''). Uses find_court() regex matching."},
    {"name":"court_id","type":"string","required":false,"description":"Direct court ID lookup (e.g. ''scotus'', ''ca2'', ''cacd''). Returns full record with children and appeals chain."},
    {"name":"system","type":"enum","required":false,"values":["federal","state","tribal"],"description":"Filter by court system."},
    {"name":"level","type":"enum","required":false,"values":["colr","iac","gjc","ljc"],"description":"Filter by court level: colr (last resort/supreme), iac (intermediate appellate), gjc (general jurisdiction/trial), ljc (limited jurisdiction)."},
    {"name":"type","type":"enum","required":false,"values":["trial","appellate","bankruptcy","ag"],"description":"Filter by court type."},
    {"name":"location","type":"string","required":false,"description":"Filter by location (e.g. ''California'', ''New York''). Case-insensitive partial match."},
    {"name":"parent","type":"string","required":false,"description":"Filter by parent court ID (e.g. ''ca9'' to find all courts under the 9th Circuit)."},
    {"name":"limit","type":"integer","required":false,"default":50,"description":"Max results to return."}
  ]'::jsonb,
  '["eyecite","courts","reference","legal","lookup"]'::jsonb
)
ON CONFLICT (service_id, function_name) DO UPDATE SET
  parameter_schema = EXCLUDED.parameter_schema,
  description = EXCLUDED.description,
  updated_at = now();

-- 3. Database stats
INSERT INTO public.service_functions (
  service_id, function_name, function_type, label, description,
  entrypoint, http_method, parameter_schema, tags
) VALUES (
  'a0000000-0000-0000-0000-000000000010',
  'eyecite_stats',
  'utility',
  'Database Stats',
  'Summary statistics across all eyecite reference databases — reporter counts by cite type, court counts by system/level/type/location, edition and variation totals.',
  '/execute',
  'POST',
  '[]'::jsonb,
  '["eyecite","stats","reference","legal"]'::jsonb
)
ON CONFLICT (service_id, function_name) DO UPDATE SET
  parameter_schema = EXCLUDED.parameter_schema,
  description = EXCLUDED.description,
  updated_at = now();
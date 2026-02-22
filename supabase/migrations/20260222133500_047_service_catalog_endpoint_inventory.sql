-- Migration 047: upgrade conversion/edge catalogs to endpoint inventory
-- Scope:
-- - Keep existing tables, RLS, and grants.
-- - Replace track-as-primary-key shape with endpoint inventory rows.
-- - Add minimal execution metadata needed for operational cataloging.
-- - Backfill only currently implemented conversion/edge endpoints.

-- ---------------------------------------------------------------------------
-- conversion_service_catalog: schema upgrade
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversion_service_catalog
  ADD COLUMN IF NOT EXISTS catalog_id uuid;

UPDATE public.conversion_service_catalog
SET catalog_id = gen_random_uuid()
WHERE catalog_id IS NULL;

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN catalog_id SET DEFAULT gen_random_uuid();

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN catalog_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.conversion_service_catalog'::regclass
      AND conname = 'conversion_service_catalog_pkey'
  ) THEN
    ALTER TABLE public.conversion_service_catalog
      DROP CONSTRAINT conversion_service_catalog_pkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.conversion_service_catalog'::regclass
      AND conname = 'conversion_service_catalog_pkey'
  ) THEN
    ALTER TABLE public.conversion_service_catalog
      ADD CONSTRAINT conversion_service_catalog_pkey PRIMARY KEY (catalog_id);
  END IF;
END $$;

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN track DROP NOT NULL;

ALTER TABLE public.conversion_service_catalog
  ADD COLUMN IF NOT EXISTS http_method text;

ALTER TABLE public.conversion_service_catalog
  ADD COLUMN IF NOT EXISTS auth_mode text;

ALTER TABLE public.conversion_service_catalog
  ADD COLUMN IF NOT EXISTS execution_mode text;

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN primary_representation_type DROP NOT NULL;

UPDATE public.conversion_service_catalog
SET
  http_method = COALESCE(http_method, 'POST'),
  auth_mode = COALESCE(auth_mode, 'service_key'),
  execution_mode = COALESCE(execution_mode, 'async_callback');

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN http_method SET NOT NULL;

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN auth_mode SET NOT NULL;

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN execution_mode SET NOT NULL;

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN http_method SET DEFAULT 'POST';

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN auth_mode SET DEFAULT 'service_key';

ALTER TABLE public.conversion_service_catalog
  ALTER COLUMN execution_mode SET DEFAULT 'sync';

ALTER TABLE public.conversion_service_catalog
  DROP CONSTRAINT IF EXISTS conversion_service_catalog_primary_representation_type_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.conversion_service_catalog'::regclass
      AND conname = 'conversion_service_catalog_primary_representation_type_check'
  ) THEN
    ALTER TABLE public.conversion_service_catalog
      ADD CONSTRAINT conversion_service_catalog_primary_representation_type_check
      CHECK (
        primary_representation_type IS NULL OR
        primary_representation_type IN (
          'markdown_bytes',
          'doclingdocument_json',
          'pandoc_ast_json',
          'html_bytes',
          'doctags_text'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.conversion_service_catalog'::regclass
      AND conname = 'conversion_service_catalog_http_method_check'
  ) THEN
    ALTER TABLE public.conversion_service_catalog
      ADD CONSTRAINT conversion_service_catalog_http_method_check
      CHECK (http_method IN ('GET', 'POST'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.conversion_service_catalog'::regclass
      AND conname = 'conversion_service_catalog_auth_mode_check'
  ) THEN
    ALTER TABLE public.conversion_service_catalog
      ADD CONSTRAINT conversion_service_catalog_auth_mode_check
      CHECK (auth_mode IN ('none', 'user_jwt', 'service_key'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.conversion_service_catalog'::regclass
      AND conname = 'conversion_service_catalog_execution_mode_check'
  ) THEN
    ALTER TABLE public.conversion_service_catalog
      ADD CONSTRAINT conversion_service_catalog_execution_mode_check
      CHECK (execution_mode IN ('sync', 'async_callback'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS conversion_service_catalog_endpoint_uq
  ON public.conversion_service_catalog (service_name, entrypoint, http_method, COALESCE(track, '*'));

COMMENT ON COLUMN public.conversion_service_catalog.http_method IS
  'HTTP method for the cataloged endpoint.';
COMMENT ON COLUMN public.conversion_service_catalog.auth_mode IS
  'Auth mechanism expected by endpoint: none, user_jwt, or service_key.';
COMMENT ON COLUMN public.conversion_service_catalog.execution_mode IS
  'Execution style: sync response or async_callback flow.';

-- Canonical endpoint inventory for conversion service.
DELETE FROM public.conversion_service_catalog;

INSERT INTO public.conversion_service_catalog (
  track,
  service_name,
  entrypoint,
  http_method,
  auth_mode,
  execution_mode,
  source_types,
  primary_representation_type,
  supplemental_representation_types,
  notes
)
VALUES
  (
    'mdast',
    'conversion-service',
    '/convert',
    'POST',
    'service_key',
    'async_callback',
    '["txt"]'::jsonb,
    'markdown_bytes',
    '["pandoc_ast_json"]'::jsonb,
    'Conversion endpoint for mdast track (txt in conversion-service path).'
  ),
  (
    'docling',
    'conversion-service',
    '/convert',
    'POST',
    'service_key',
    'async_callback',
    '["docx","pdf","pptx","xlsx","html","csv"]'::jsonb,
    'doclingdocument_json',
    '["markdown_bytes","pandoc_ast_json","html_bytes","doctags_text"]'::jsonb,
    'Conversion endpoint for docling track.'
  ),
  (
    'pandoc',
    'conversion-service',
    '/convert',
    'POST',
    'service_key',
    'async_callback',
    '["rst","latex","odt","epub","rtf","org"]'::jsonb,
    'pandoc_ast_json',
    '["markdown_bytes"]'::jsonb,
    'Conversion endpoint for pandoc track under current routing.'
  ),
  (
    NULL,
    'conversion-service',
    '/citations',
    'POST',
    'service_key',
    'sync',
    '[]'::jsonb,
    NULL,
    '[]'::jsonb,
    'Citation extraction endpoint (eyecite) from request text.'
  );

-- ---------------------------------------------------------------------------
-- edge_service_catalog: schema upgrade
-- ---------------------------------------------------------------------------
ALTER TABLE public.edge_service_catalog
  ADD COLUMN IF NOT EXISTS catalog_id uuid;

UPDATE public.edge_service_catalog
SET catalog_id = gen_random_uuid()
WHERE catalog_id IS NULL;

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN catalog_id SET DEFAULT gen_random_uuid();

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN catalog_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.edge_service_catalog'::regclass
      AND conname = 'edge_service_catalog_pkey'
  ) THEN
    ALTER TABLE public.edge_service_catalog
      DROP CONSTRAINT edge_service_catalog_pkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.edge_service_catalog'::regclass
      AND conname = 'edge_service_catalog_pkey'
  ) THEN
    ALTER TABLE public.edge_service_catalog
      ADD CONSTRAINT edge_service_catalog_pkey PRIMARY KEY (catalog_id);
  END IF;
END $$;

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN track DROP NOT NULL;

ALTER TABLE public.edge_service_catalog
  ADD COLUMN IF NOT EXISTS http_method text;

ALTER TABLE public.edge_service_catalog
  ADD COLUMN IF NOT EXISTS auth_mode text;

ALTER TABLE public.edge_service_catalog
  ADD COLUMN IF NOT EXISTS execution_mode text;

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN primary_representation_type DROP NOT NULL;

UPDATE public.edge_service_catalog
SET
  http_method = COALESCE(http_method, 'POST'),
  auth_mode = COALESCE(auth_mode, 'user_jwt'),
  execution_mode = COALESCE(execution_mode, 'async_callback');

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN http_method SET NOT NULL;

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN auth_mode SET NOT NULL;

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN execution_mode SET NOT NULL;

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN http_method SET DEFAULT 'POST';

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN auth_mode SET DEFAULT 'user_jwt';

ALTER TABLE public.edge_service_catalog
  ALTER COLUMN execution_mode SET DEFAULT 'sync';

ALTER TABLE public.edge_service_catalog
  DROP CONSTRAINT IF EXISTS edge_service_catalog_primary_representation_type_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.edge_service_catalog'::regclass
      AND conname = 'edge_service_catalog_primary_representation_type_check'
  ) THEN
    ALTER TABLE public.edge_service_catalog
      ADD CONSTRAINT edge_service_catalog_primary_representation_type_check
      CHECK (
        primary_representation_type IS NULL OR
        primary_representation_type IN (
          'markdown_bytes',
          'doclingdocument_json',
          'pandoc_ast_json',
          'html_bytes',
          'doctags_text'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.edge_service_catalog'::regclass
      AND conname = 'edge_service_catalog_http_method_check'
  ) THEN
    ALTER TABLE public.edge_service_catalog
      ADD CONSTRAINT edge_service_catalog_http_method_check
      CHECK (http_method IN ('GET', 'POST'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.edge_service_catalog'::regclass
      AND conname = 'edge_service_catalog_auth_mode_check'
  ) THEN
    ALTER TABLE public.edge_service_catalog
      ADD CONSTRAINT edge_service_catalog_auth_mode_check
      CHECK (auth_mode IN ('none', 'user_jwt', 'service_key'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.edge_service_catalog'::regclass
      AND conname = 'edge_service_catalog_execution_mode_check'
  ) THEN
    ALTER TABLE public.edge_service_catalog
      ADD CONSTRAINT edge_service_catalog_execution_mode_check
      CHECK (execution_mode IN ('sync', 'async_callback'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS edge_service_catalog_endpoint_uq
  ON public.edge_service_catalog (service_name, entrypoint, http_method, COALESCE(track, '*'));

COMMENT ON COLUMN public.edge_service_catalog.http_method IS
  'HTTP method for the cataloged endpoint.';
COMMENT ON COLUMN public.edge_service_catalog.auth_mode IS
  'Auth mechanism expected by endpoint: none, user_jwt, or service_key.';
COMMENT ON COLUMN public.edge_service_catalog.execution_mode IS
  'Execution style: sync response or async_callback flow.';

-- Canonical endpoint inventory for conversion-related edge functions.
DELETE FROM public.edge_service_catalog;

INSERT INTO public.edge_service_catalog (
  track,
  service_name,
  entrypoint,
  http_method,
  auth_mode,
  execution_mode,
  source_types,
  primary_representation_type,
  supplemental_representation_types,
  notes
)
VALUES
  (
    'mdast',
    'ingest',
    '/functions/v1/ingest',
    'POST',
    'user_jwt',
    'async_callback',
    '["md","txt"]'::jsonb,
    'markdown_bytes',
    '["pandoc_ast_json"]'::jsonb,
    'Main ingest endpoint. md is inline parse; txt routes through conversion callback flow.'
  ),
  (
    'docling',
    'ingest',
    '/functions/v1/ingest',
    'POST',
    'user_jwt',
    'async_callback',
    '["docx","pdf","pptx","xlsx","html","csv"]'::jsonb,
    'doclingdocument_json',
    '["markdown_bytes","pandoc_ast_json","html_bytes","doctags_text"]'::jsonb,
    'Main ingest endpoint with docling track routed through conversion service.'
  ),
  (
    'pandoc',
    'ingest',
    '/functions/v1/ingest',
    'POST',
    'user_jwt',
    'async_callback',
    '["rst","latex","odt","epub","rtf","org"]'::jsonb,
    'pandoc_ast_json',
    '["markdown_bytes"]'::jsonb,
    'Main ingest endpoint with pandoc track routed through conversion service.'
  ),
  (
    'mdast',
    'conversion-complete',
    '/functions/v1/conversion-complete',
    'POST',
    'service_key',
    'sync',
    '["txt"]'::jsonb,
    'markdown_bytes',
    '["pandoc_ast_json"]'::jsonb,
    'Callback endpoint finalizing mdast conversion results into platform rows.'
  ),
  (
    'docling',
    'conversion-complete',
    '/functions/v1/conversion-complete',
    'POST',
    'service_key',
    'sync',
    '["docx","pdf","pptx","xlsx","html","csv"]'::jsonb,
    'doclingdocument_json',
    '["markdown_bytes","pandoc_ast_json","html_bytes","doctags_text"]'::jsonb,
    'Callback endpoint finalizing docling conversion results into platform rows.'
  ),
  (
    'pandoc',
    'conversion-complete',
    '/functions/v1/conversion-complete',
    'POST',
    'service_key',
    'sync',
    '["rst","latex","odt","epub","rtf","org"]'::jsonb,
    'pandoc_ast_json',
    '["markdown_bytes"]'::jsonb,
    'Callback endpoint finalizing pandoc conversion results into platform rows.'
  ),
  (
    'mdast',
    'trigger-parse',
    '/functions/v1/trigger-parse',
    'POST',
    'user_jwt',
    'async_callback',
    '["txt"]'::jsonb,
    'markdown_bytes',
    '["pandoc_ast_json"]'::jsonb,
    'Manual re-parse endpoint for mdast-convertible files (txt), delegating to conversion service.'
  ),
  (
    'docling',
    'trigger-parse',
    '/functions/v1/trigger-parse',
    'POST',
    'user_jwt',
    'async_callback',
    '["docx","pdf","pptx","xlsx","html","csv"]'::jsonb,
    'doclingdocument_json',
    '["markdown_bytes","pandoc_ast_json","html_bytes","doctags_text"]'::jsonb,
    'Manual re-parse endpoint for docling track, delegating to conversion service.'
  ),
  (
    'pandoc',
    'trigger-parse',
    '/functions/v1/trigger-parse',
    'POST',
    'user_jwt',
    'async_callback',
    '["rst","latex","odt","epub","rtf","org"]'::jsonb,
    'pandoc_ast_json',
    '["markdown_bytes"]'::jsonb,
    'Manual re-parse endpoint for pandoc track, delegating to conversion service.'
  ),
  (
    NULL,
    'upload-policy',
    '/functions/v1/upload-policy',
    'GET',
    'user_jwt',
    'sync',
    '[]'::jsonb,
    NULL,
    '[]'::jsonb,
    'Read-only upload limits/extensions endpoint from runtime policy.'
  );

NOTIFY pgrst, 'reload schema';

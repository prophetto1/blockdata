-- Reconcile historical storage rows after namespace separation:
-- 1. Backfill namespace metadata onto reservations and stored objects.
-- 2. Re-anchor source_documents to Assets-owned objects when available.
-- 3. Seed pipeline_sources for historical pipeline-services uploads.
-- 4. Backfill pipeline_source_id on historical pipeline tables.
-- 5. Recreate view_documents so Assets filtering can use document_surface.

-- Step 1: backfill reservation namespace metadata from object keys.
UPDATE public.storage_upload_reservations AS sur
SET
  storage_surface = COALESCE(
    sur.storage_surface,
    CASE
      WHEN sur.object_key LIKE 'users/%/assets/%' THEN 'assets'
      WHEN sur.object_key LIKE 'users/%/pipeline-services/%' THEN 'pipeline-services'
      ELSE NULL
    END
  ),
  storage_service_slug = COALESCE(
    sur.storage_service_slug,
    CASE
      WHEN sur.object_key LIKE 'users/%/pipeline-services/%'
        THEN substring(sur.object_key FROM 'users/[^/]+/pipeline-services/([^/]+)/')
      ELSE NULL
    END
  )
WHERE sur.storage_surface IS NULL
   OR (
     sur.storage_service_slug IS NULL
     AND sur.object_key LIKE 'users/%/pipeline-services/%'
   );

-- Step 2: backfill object namespace metadata and source metadata.
WITH resolved_storage_objects AS (
  SELECT
    so.storage_object_id,
    COALESCE(
      so.storage_surface,
      sur.storage_surface,
      CASE
        WHEN so.object_key LIKE 'users/%/assets/%' THEN 'assets'
        WHEN so.object_key LIKE 'users/%/pipeline-services/%' THEN 'pipeline-services'
        ELSE NULL
      END
    ) AS resolved_storage_surface,
    COALESCE(
      so.storage_service_slug,
      sur.storage_service_slug,
      CASE
        WHEN so.object_key LIKE 'users/%/pipeline-services/%'
          THEN substring(so.object_key FROM 'users/[^/]+/pipeline-services/([^/]+)/')
        ELSE NULL
      END
    ) AS resolved_storage_service_slug,
    COALESCE(so.doc_title, sur.doc_title, sd.doc_title) AS resolved_doc_title,
    COALESCE(so.source_type, sur.source_type, sd.source_type) AS resolved_source_type
  FROM public.storage_objects AS so
  LEFT JOIN public.storage_upload_reservations AS sur
    ON sur.reservation_id = so.reservation_id
  LEFT JOIN public.source_documents AS sd
    ON sd.owner_id = so.owner_user_id
   AND sd.source_uid = so.source_uid
  WHERE so.storage_surface IS NULL
     OR so.storage_service_slug IS NULL
     OR so.doc_title IS NULL
     OR so.source_type IS NULL
)
UPDATE public.storage_objects AS so
SET
  storage_surface = rso.resolved_storage_surface,
  storage_service_slug = rso.resolved_storage_service_slug,
  doc_title = rso.resolved_doc_title,
  source_type = rso.resolved_source_type
FROM resolved_storage_objects AS rso
WHERE so.storage_object_id = rso.storage_object_id;

-- Step 3: reconcile source_documents to the preferred active source object.
-- Assets wins when the same source_uid exists in both Assets and Pipeline Services.
WITH ranked_source_objects AS (
  SELECT
    sd.owner_id,
    sd.source_uid,
    so.storage_object_id,
    so.project_id,
    so.object_key,
    so.byte_size,
    COALESCE(so.doc_title, sd.doc_title) AS doc_title,
    COALESCE(so.source_type, sd.source_type) AS source_type,
    COALESCE(
      so.storage_surface,
      CASE
        WHEN so.object_key LIKE 'users/%/assets/%' THEN 'assets'
        WHEN so.object_key LIKE 'users/%/pipeline-services/%' THEN 'pipeline-services'
        ELSE NULL
      END
    ) AS storage_surface,
    ROW_NUMBER() OVER (
      PARTITION BY sd.owner_id, sd.source_uid
      ORDER BY
        CASE
          WHEN COALESCE(
            so.storage_surface,
            CASE
              WHEN so.object_key LIKE 'users/%/assets/%' THEN 'assets'
              WHEN so.object_key LIKE 'users/%/pipeline-services/%' THEN 'pipeline-services'
              ELSE NULL
            END
          ) = 'assets' THEN 0
          ELSE 1
        END,
        so.created_at DESC,
        so.storage_object_id DESC
    ) AS preference_rank
  FROM public.source_documents AS sd
  JOIN public.storage_objects AS so
    ON so.owner_user_id = sd.owner_id
   AND so.source_uid = sd.source_uid
   AND so.storage_kind = 'source'
   AND so.status = 'active'
)
UPDATE public.source_documents AS sd
SET
  project_id = rso.project_id,
  source_locator = rso.object_key,
  source_filesize = COALESCE(rso.byte_size, sd.source_filesize),
  doc_title = COALESCE(rso.doc_title, sd.doc_title),
  source_type = COALESCE(rso.source_type, sd.source_type),
  document_surface = rso.storage_surface,
  storage_object_id = rso.storage_object_id
FROM ranked_source_objects AS rso
WHERE rso.preference_rank = 1
  AND sd.owner_id = rso.owner_id
  AND sd.source_uid = rso.source_uid;

-- Fallback: rows without a matched object still get a surface classification from their locator.
UPDATE public.source_documents AS sd
SET document_surface = CASE
  WHEN sd.source_locator LIKE 'users/%/assets/%' THEN 'assets'
  WHEN sd.source_locator LIKE 'users/%/pipeline-services/%' THEN 'pipeline-services'
  ELSE sd.document_surface
END
WHERE sd.document_surface IS NULL;

-- Step 4: seed historical pipeline_sources from pipeline-service storage objects.
WITH historical_pipeline_objects AS (
  SELECT
    so.owner_user_id AS owner_id,
    COALESCE(so.project_id, sd.project_id) AS project_id,
    CASE
      WHEN COALESCE(
        so.storage_service_slug,
        substring(so.object_key FROM 'users/[^/]+/pipeline-services/([^/]+)/')
      ) = 'index-builder'
        THEN 'markdown_index_builder'
      ELSE NULL
    END AS pipeline_kind,
    COALESCE(
      so.storage_service_slug,
      substring(so.object_key FROM 'users/[^/]+/pipeline-services/([^/]+)/')
    ) AS storage_service_slug,
    so.storage_object_id,
    so.source_uid,
    COALESCE(so.doc_title, sd.doc_title, 'file') AS doc_title,
    COALESCE(so.source_type, sd.source_type, 'binary') AS source_type,
    so.byte_size,
    so.object_key
  FROM public.storage_objects AS so
  LEFT JOIN public.source_documents AS sd
    ON sd.owner_id = so.owner_user_id
   AND sd.source_uid = so.source_uid
  WHERE so.status = 'active'
    AND so.storage_kind = 'source'
    AND COALESCE(
      so.storage_surface,
      CASE
        WHEN so.object_key LIKE 'users/%/pipeline-services/%' THEN 'pipeline-services'
        ELSE NULL
      END
    ) = 'pipeline-services'
)
INSERT INTO public.pipeline_sources (
  owner_id,
  project_id,
  pipeline_kind,
  storage_service_slug,
  storage_object_id,
  source_uid,
  doc_title,
  source_type,
  byte_size,
  object_key
)
SELECT
  hpo.owner_id,
  hpo.project_id,
  hpo.pipeline_kind,
  hpo.storage_service_slug,
  hpo.storage_object_id,
  hpo.source_uid,
  hpo.doc_title,
  hpo.source_type,
  hpo.byte_size,
  hpo.object_key
FROM historical_pipeline_objects AS hpo
WHERE hpo.pipeline_kind IS NOT NULL
  AND hpo.project_id IS NOT NULL
  AND hpo.source_uid IS NOT NULL
ON CONFLICT (owner_id, project_id, pipeline_kind, source_uid)
DO UPDATE SET
  storage_service_slug = EXCLUDED.storage_service_slug,
  storage_object_id = EXCLUDED.storage_object_id,
  doc_title = EXCLUDED.doc_title,
  source_type = EXCLUDED.source_type,
  byte_size = EXCLUDED.byte_size,
  object_key = EXCLUDED.object_key,
  updated_at = now();

-- Step 5: backfill pipeline_source_id onto historical source-set items.
WITH resolved_source_set_items AS (
  SELECT
    psi.source_set_id,
    psi.source_uid,
    ps.pipeline_source_id
  FROM public.pipeline_source_set_items AS psi
  JOIN public.pipeline_source_sets AS pss
    ON pss.source_set_id = psi.source_set_id
  JOIN public.pipeline_sources AS ps
    ON ps.owner_id = psi.owner_id
   AND ps.project_id = pss.project_id
   AND ps.pipeline_kind = pss.pipeline_kind
   AND ps.source_uid = psi.source_uid
  WHERE psi.pipeline_source_id IS NULL
)
UPDATE public.pipeline_source_set_items AS psi
SET pipeline_source_id = rsi.pipeline_source_id
FROM resolved_source_set_items AS rsi
WHERE psi.source_set_id = rsi.source_set_id
  AND psi.source_uid = rsi.source_uid
  AND psi.pipeline_source_id IS NULL;

-- Step 6: backfill pipeline_source_id onto historical jobs.
WITH resolved_jobs AS (
  SELECT
    pj.job_id,
    ps.pipeline_source_id
  FROM public.pipeline_jobs AS pj
  JOIN public.pipeline_sources AS ps
    ON ps.owner_id = pj.owner_id
   AND ps.project_id = pj.project_id
   AND ps.pipeline_kind = pj.pipeline_kind
   AND ps.source_uid = pj.source_uid
  WHERE pj.pipeline_source_id IS NULL
)
UPDATE public.pipeline_jobs AS pj
SET pipeline_source_id = rj.pipeline_source_id
FROM resolved_jobs AS rj
WHERE pj.job_id = rj.job_id
  AND pj.pipeline_source_id IS NULL;

-- Step 7: expose document_surface and storage_object_id on the Assets document view.
CREATE OR REPLACE VIEW public.view_documents AS
SELECT
  sd.source_uid,
  sd.owner_id,
  sd.source_type,
  sd.source_filesize,
  sd.source_total_characters,
  sd.source_locator,
  sd.doc_title,
  sd.uploaded_at,
  sd.updated_at,
  sd.status,
  sd.error,
  sd.conversion_job_id,
  sd.project_id,
  cp.conv_uid,
  cp.conv_status,
  cp.conv_parsing_tool,
  cp.conv_representation_type,
  cp.conv_total_blocks,
  cp.conv_block_type_freq,
  cp.conv_total_characters,
  cp.conv_locator,
  cp.pipeline_config,
  cp.requested_pipeline_config,
  cp.applied_pipeline_config,
  cp.parser_runtime_meta,
  sd.document_surface,
  sd.storage_object_id
FROM public.source_documents AS sd
LEFT JOIN public.conversion_parsing AS cp
  ON cp.source_uid = sd.source_uid;

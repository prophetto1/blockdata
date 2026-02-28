-- Migration 055: registry consolidation (cleanup phase)
-- Purpose:
-- - Remove legacy registry/canonical catalog tables after additive cutover.
-- - Guard against accidental drops if external dependencies still exist.
-- - Keep one canonical registry model: service_* + project_service_config.

-- ---------------------------------------------------------------------------
-- 1) Guard rails: abort if external dependencies still reference legacy tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  target_oids OID[];
  fk_dep_count INTEGER;
  view_dep_count INTEGER;
  fn_dep_count INTEGER;
BEGIN
  target_oids := ARRAY(
    SELECT x
    FROM unnest(ARRAY[
      to_regclass('public.integration_functions')::oid,
      to_regclass('public.integration_services')::oid,
      to_regclass('public.integration_actions')::oid,
      to_regclass('public.integration_service_types')::oid,
      to_regclass('public.edge_service_catalog')::oid,
      to_regclass('public.conversion_service_catalog')::oid
    ]::oid[]) AS t(x)
    WHERE x IS NOT NULL
  );

  IF target_oids IS NULL OR array_length(target_oids, 1) IS NULL THEN
    RAISE EXCEPTION 'No legacy registry tables found for cleanup; aborting defensive migration.';
  END IF;

  SELECT count(*)
  INTO fk_dep_count
  FROM pg_constraint c
  WHERE c.confrelid = ANY(target_oids)
    AND NOT (c.conrelid = ANY(target_oids));

  IF fk_dep_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop legacy registry tables: found % external FK dependencies.', fk_dep_count;
  END IF;

  SELECT count(*)
  INTO view_dep_count
  FROM pg_depend d
  JOIN pg_rewrite r ON r.oid = d.objid
  JOIN pg_class v ON v.oid = r.ev_class
  WHERE d.refobjid = ANY(target_oids)
    AND v.relkind IN ('v', 'm')
    AND NOT (v.oid = ANY(target_oids));

  IF view_dep_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop legacy registry tables: found % dependent views/materialized views.', view_dep_count;
  END IF;

  SELECT count(*)
  INTO fn_dep_count
  FROM pg_depend d
  JOIN pg_proc p ON p.oid = d.objid
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE d.refobjid = ANY(target_oids)
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND p.proname NOT LIKE 'RI_ConstraintTrigger%';

  IF fn_dep_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop legacy registry tables: found % dependent SQL functions.', fn_dep_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Archive snapshots (lightweight safety net before destructive drop)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.conversion_service_catalog') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.zz_archive_055_conversion_service_catalog AS TABLE public.conversion_service_catalog WITH DATA';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.edge_service_catalog') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.zz_archive_055_edge_service_catalog AS TABLE public.edge_service_catalog WITH DATA';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.integration_service_types') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.zz_archive_055_integration_service_types AS TABLE public.integration_service_types WITH DATA';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.integration_services') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.zz_archive_055_integration_services AS TABLE public.integration_services WITH DATA';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.integration_functions') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.zz_archive_055_integration_functions AS TABLE public.integration_functions WITH DATA';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.integration_actions') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.zz_archive_055_integration_actions AS TABLE public.integration_actions WITH DATA';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Drop legacy integration tables (FK-safe order, no CASCADE)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.integration_functions;
DROP TABLE IF EXISTS public.integration_services;
DROP TABLE IF EXISTS public.integration_actions;
DROP TABLE IF EXISTS public.integration_service_types;

-- ---------------------------------------------------------------------------
-- 4) Drop legacy endpoint inventory catalogs (superseded by service_functions)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.edge_service_catalog;
DROP TABLE IF EXISTS public.conversion_service_catalog;

-- ---------------------------------------------------------------------------
-- 5) Refresh view and PostgREST schema cache
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.service_functions_view AS
SELECT
  sf.function_id,
  sf.function_name,
  sf.function_type,
  sf.label,
  sf.description,
  sf.entrypoint,
  sf.http_method,
  sf.parameter_schema,
  sf.result_schema,
  sf.enabled AS function_enabled,
  sf.tags,
  sr.service_id,
  sr.service_type,
  sr.service_name,
  sr.base_url,
  sr.health_status,
  sr.enabled AS service_enabled,
  stc.label AS service_type_label
FROM public.service_functions sf
JOIN public.service_registry sr ON sr.service_id = sf.service_id
JOIN public.service_type_catalog stc ON stc.service_type = sr.service_type
WHERE sf.enabled = true AND sr.enabled = true;

GRANT SELECT ON public.service_functions_view TO authenticated;
GRANT SELECT ON public.service_functions_view TO service_role;

NOTIFY pgrst, 'reload schema';

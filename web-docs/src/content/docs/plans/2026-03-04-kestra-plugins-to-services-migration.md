---
title: "Kestra Plugins → Services Migration Plan"
description: "> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task."
---# Kestra Plugins → Services Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Promote all 945 Kestra plugin catalog items into the service registry so they appear in the Services marketplace alongside existing services.

**Architecture:** Each distinct `plugin_group` in `integration_catalog_items` (120+ groups) becomes a row in `service_registry`. Each catalog item (945 task classes) becomes a row in `service_functions`. The `mapped_service_id` and `mapped_function_id` columns on `integration_catalog_items` are backfilled to link everything. The frontend ServicesCatalog.tsx already renders from `service_registry` + `service_functions` — no frontend changes needed if the data is correct.

**Tech Stack:** PostgreSQL (Supabase), SQL migration

---

## Critical Context

### Table name mismatch

The migration files create: `service_registry`, `service_functions`, `service_type_catalog`

The frontend and edge functions query: `registry_services`, `registry_service_functions`, `registry_service_types`

These are likely **views** or **renamed tables** created outside migrations (Supabase dashboard). The migration must target the **actual underlying tables** (`service_registry`, `service_functions`, `service_type_catalog`). If views exist with the `registry_*` names, they will automatically reflect the new data.

**IMPORTANT:** Before running the migration, verify which names are actual tables vs views:

```sql
SELECT c.relname, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'service_registry', 'service_functions', 'service_type_catalog',
    'registry_services', 'registry_service_functions', 'registry_service_types'
  )
ORDER BY c.relname;
```

`relkind = 'r'` means table, `'v'` means view.

### Existing data

| Table | Rows | Notes |
|-------|------|-------|
| `service_type_catalog` | 7 types | dlt, dbt, docling, edge, conversion, custom, pipeline-worker |
| `service_registry` | 8 services | load-runner, transform-runner, docling, supabase-edge, pipeline-worker, + 3 others |
| `service_functions` | ~38 | 3 dlt + 7 dbt + 15 edge + 28 pipeline-worker (some overlap) |
| `integration_catalog_items` | 945 | All Kestra plugins with task_schema JSONB |
| `kestra_provider_enrichment` | 56 | Provider metadata (name, docs_url, auth_type) |

### Column constraints to respect

**`service_registry`:**
- `UNIQUE (service_type, service_name)` — each service_name must be unique within its type
- `service_type` must reference `service_type_catalog`
- `base_url` NOT NULL — use placeholder for catalog-only services
- `health_status` CHECK `('online', 'offline', 'degraded', 'unknown')`

**`service_functions`:**
- `UNIQUE (service_id, function_name)` — each function_name unique per service
- `function_type` CHECK — must be one of: source, destination, transform, parse, convert, export, test, utility, macro, custom, ingest, callback, flow
- `entrypoint` NOT NULL — use placeholder for catalog-only functions
- `label` NOT NULL
- `parameter_schema` must be JSONB array (`'[]'`)

**`service_functions` columns from migration 065:**
- `source_task_class` — store the original Kestra task class here
- `plugin_group` — store the plugin group for filtering

### function_type mapping

Map `integration_catalog_items.categories` to `service_functions.function_type`:

| Categories contain | function_type |
|-------------------|---------------|
| SCRIPT | utility |
| TRANSFORMATION, DATA | transform |
| NOTIFICATION, MESSAGING | utility |
| FLOW | flow |
| STORAGE | source |
| CORE | utility |
| everything else | custom |

Simplify: default to `'custom'` and use a CASE expression for known mappings.

---

### Task 1: Add 'integration' service type to catalog

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_069_kestra_plugins_to_services.sql`

**Step 1: Write the service type insert**

We need a new service type for these catalog-sourced services. They aren't dlt, dbt, or edge — they're integration plugins.

```sql
INSERT INTO public.service_type_catalog (service_type, label, description)
VALUES ('integration', 'Integration', 'External integration plugins (Kestra-sourced task definitions)')
ON CONFLICT (service_type) DO NOTHING;
```

**Verification:**

```sql
SELECT * FROM public.service_type_catalog ORDER BY service_type;
```

Expected: 8 rows (7 existing + 'integration')

---

### Task 2: Create services from plugin groups

Each distinct `plugin_group` in `integration_catalog_items` becomes a service. Use `kestra_provider_enrichment` for metadata where available (56 of ~120 groups have enrichment data).

```sql
INSERT INTO public.service_registry (
  service_type,
  service_name,
  base_url,
  health_status,
  description,
  auth_type,
  docs_url,
  enabled,
  config
)
SELECT
  'integration',
  ici.plugin_group,
  'catalog://not-deployed',
  'unknown',
  COALESCE(
    'Integration plugin: ' || kpe.provider_name,
    'Integration plugin: ' || split_part(ici.plugin_group, '.', array_length(string_to_array(ici.plugin_group, '.'), 1))
  ),
  COALESCE(kpe.auth_type, 'none'),
  kpe.provider_docs_url,
  true,
  jsonb_build_object(
    'source', 'kestra-catalog',
    'provider_name', COALESCE(kpe.provider_name, split_part(ici.plugin_group, '.', array_length(string_to_array(ici.plugin_group, '.'), 1))),
    'provider_base_url', kpe.provider_base_url
  )
FROM (
  SELECT DISTINCT plugin_group
  FROM public.integration_catalog_items
  WHERE plugin_group IS NOT NULL
) ici
LEFT JOIN public.kestra_provider_enrichment kpe
  ON kpe.plugin_group = ici.plugin_group
ON CONFLICT (service_type, service_name) DO NOTHING;
```

**Verification:**

```sql
SELECT count(*) FROM public.service_registry WHERE service_type = 'integration';
```

Expected: ~120 new rows (exact count = number of distinct plugin_group values in integration_catalog_items).

```sql
-- Sanity: every plugin_group has a service
SELECT ici.plugin_group, sr.service_id
FROM (SELECT DISTINCT plugin_group FROM public.integration_catalog_items WHERE plugin_group IS NOT NULL) ici
LEFT JOIN public.service_registry sr ON sr.service_name = ici.plugin_group AND sr.service_type = 'integration'
WHERE sr.service_id IS NULL;
```

Expected: 0 rows (no orphans).

---

### Task 3: Create functions from catalog items

Each `integration_catalog_items` row becomes a `service_functions` row. Link via the service created in Task 2.

```sql
INSERT INTO public.service_functions (
  service_id,
  function_name,
  function_type,
  label,
  description,
  long_description,
  entrypoint,
  http_method,
  parameter_schema,
  tags,
  source_task_class,
  plugin_group,
  enabled
)
SELECT
  sr.service_id,
  -- function_name: last segment of task_class, lowercased, unique per service
  lower(split_part(ici.task_class, '.', array_length(string_to_array(ici.task_class, '.'), 1))),
  -- function_type: map from categories
  CASE
    WHEN ici.categories::text ILIKE '%SCRIPT%' THEN 'utility'
    WHEN ici.categories::text ILIKE '%TRANSFORMATION%' THEN 'transform'
    WHEN ici.categories::text ILIKE '%STORAGE%' THEN 'source'
    WHEN ici.categories::text ILIKE '%FLOW%' THEN 'flow'
    ELSE 'custom'
  END,
  -- label: use task_title or derive from task_class
  COALESCE(ici.task_title, split_part(ici.task_class, '.', array_length(string_to_array(ici.task_class, '.'), 1))),
  -- description
  COALESCE(ici.task_description, ''),
  -- long_description from task_markdown
  ici.task_markdown,
  -- entrypoint placeholder
  '/execute/' || ici.task_class,
  'POST',
  -- parameter_schema: extract from task_schema.properties if available, else empty array
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', kv.key,
          'type', COALESCE(kv.value->>'type', 'string'),
          'required', COALESCE((kv.value->>'$required')::boolean, false),
          'description', COALESCE(kv.value->>'description', kv.value->>'title', '')
        )
      )
      FROM jsonb_each(ici.task_schema->'properties'->'properties') AS kv
      WHERE kv.key NOT IN ('id', 'type', 'description', 'disabled', 'logLevel', 'timeout', 'retry', 'workerGroup', 'allowFailure')
    ),
    '[]'::jsonb
  ),
  -- tags from categories
  ici.categories,
  -- source_task_class
  ici.task_class,
  -- plugin_group
  ici.plugin_group,
  -- enabled
  ici.enabled
FROM public.integration_catalog_items ici
JOIN public.service_registry sr
  ON sr.service_name = ici.plugin_group
  AND sr.service_type = 'integration'
WHERE ici.plugin_group IS NOT NULL
ON CONFLICT (service_id, function_name) DO UPDATE SET
  description = EXCLUDED.description,
  source_task_class = EXCLUDED.source_task_class,
  plugin_group = EXCLUDED.plugin_group;
```

**Verification:**

```sql
SELECT count(*) FROM public.service_functions sf
JOIN public.service_registry sr ON sr.service_id = sf.service_id
WHERE sr.service_type = 'integration';
```

Expected: ~945 (one per catalog item with a plugin_group).

```sql
-- Check for function_name collisions within a service (same class name under same group)
SELECT sr.service_name, sf.function_name, count(*)
FROM public.service_functions sf
JOIN public.service_registry sr ON sr.service_id = sf.service_id
WHERE sr.service_type = 'integration'
GROUP BY sr.service_name, sf.function_name
HAVING count(*) > 1;
```

If collisions exist: the ON CONFLICT will handle via UPDATE. But we should verify the collision count is acceptable.

---

### Task 4: Backfill mapped IDs on integration_catalog_items

Link catalog items back to their new service_functions rows.

```sql
UPDATE public.integration_catalog_items ici
SET
  mapped_service_id = sr.service_id,
  mapped_function_id = sf.function_id
FROM public.service_registry sr
JOIN public.service_functions sf ON sf.service_id = sr.service_id
WHERE sr.service_name = ici.plugin_group
  AND sr.service_type = 'integration'
  AND sf.source_task_class = ici.task_class
  AND ici.mapped_function_id IS NULL;
```

**Verification:**

```sql
-- Count unmapped items (should be 0 or very few)
SELECT count(*)
FROM public.integration_catalog_items
WHERE plugin_group IS NOT NULL
  AND mapped_function_id IS NULL;
```

Expected: 0.

```sql
-- Spot check a known plugin
SELECT ici.task_class, ici.mapped_service_id, ici.mapped_function_id,
       sr.service_name, sf.function_name
FROM public.integration_catalog_items ici
LEFT JOIN public.service_registry sr ON sr.service_id = ici.mapped_service_id
LEFT JOIN public.service_functions sf ON sf.function_id = ici.mapped_function_id
WHERE ici.task_class = 'io.kestra.plugin.aws.s3.Upload'
LIMIT 1;
```

---

### Task 5: Refresh the service_functions_view

The existing view filters `WHERE sf.enabled = true AND sr.enabled = true`. The new integration services are enabled, so they should appear. But refresh the view to include all columns from migration 065.

```sql
CREATE OR REPLACE VIEW public.service_functions_view AS
SELECT
  sf.function_id,
  sf.function_name,
  sf.function_type,
  sf.label,
  sf.description,
  sf.long_description,
  sf.entrypoint,
  sf.http_method,
  sf.content_type,
  sf.parameter_schema,
  sf.result_schema,
  sf.request_example,
  sf.response_example,
  sf.examples,
  sf.metrics,
  sf.auth_type          AS function_auth_type,
  sf.auth_config        AS function_auth_config,
  sf.when_to_use,
  sf.provider_docs_url,
  sf.deprecated,
  sf.beta,
  sf.source_task_class,
  sf.plugin_group,
  sf.tags,
  sf.enabled            AS function_enabled,
  sf.created_at         AS function_created_at,
  sf.updated_at         AS function_updated_at,
  sr.service_id,
  sr.service_type,
  sr.service_name,
  sr.base_url,
  sr.description        AS service_description,
  sr.auth_type          AS service_auth_type,
  sr.docs_url,
  sr.health_status,
  sr.enabled            AS service_enabled,
  stc.label             AS service_type_label
FROM public.service_functions sf
JOIN public.service_registry  sr  ON sr.service_id  = sf.service_id
JOIN public.service_type_catalog stc ON stc.service_type = sr.service_type;

GRANT SELECT ON public.service_functions_view TO authenticated;
GRANT SELECT ON public.service_functions_view TO service_role;

NOTIFY pgrst, 'reload schema';
```

Note: removed the `WHERE sf.enabled = true AND sr.enabled = true` filter from the view. Filtering should happen at query time so disabled items can still be browsed (with a visual indicator).

---

### Task 6: Verify end-to-end

**Step 1:** Check total service count

```sql
SELECT service_type, count(*) FROM public.service_registry GROUP BY service_type ORDER BY count(*) DESC;
```

Expected: `integration` has ~120, others unchanged.

**Step 2:** Check total function count

```sql
SELECT sr.service_type, count(*)
FROM public.service_functions sf
JOIN public.service_registry sr ON sr.service_id = sf.service_id
GROUP BY sr.service_type
ORDER BY count(*) DESC;
```

Expected: `integration` has ~945.

**Step 3:** Check the frontend view

```sql
SELECT count(*) FROM public.service_functions_view WHERE service_type = 'integration';
```

Expected: ~945.

**Step 4:** Test the ServicesCatalog.tsx query pattern

```sql
-- This is what the frontend does (via PostgREST / Supabase client)
-- If registry_services is a view over service_registry, this will work
SELECT service_id, service_type, service_name, description, docs_url, health_status
FROM registry_services  -- or service_registry
WHERE enabled = true
ORDER BY service_name;
```

If `registry_services` doesn't exist as a view, this step will fail and we need to create it:

```sql
CREATE OR REPLACE VIEW public.registry_services AS
SELECT * FROM public.service_registry;

CREATE OR REPLACE VIEW public.registry_service_functions AS
SELECT * FROM public.service_functions;

CREATE OR REPLACE VIEW public.registry_service_types AS
SELECT * FROM public.service_type_catalog;

GRANT SELECT ON public.registry_services TO authenticated;
GRANT SELECT ON public.registry_service_functions TO authenticated;
GRANT SELECT ON public.registry_service_types TO authenticated;
GRANT ALL ON public.registry_services TO service_role;
GRANT ALL ON public.registry_service_functions TO service_role;
GRANT ALL ON public.registry_service_types TO service_role;
```

---

## Rollback

If something goes wrong, reverse in order:

```sql
-- 1. Remove backfill
UPDATE public.integration_catalog_items
SET mapped_service_id = NULL, mapped_function_id = NULL
WHERE mapped_service_id IN (
  SELECT service_id FROM public.service_registry WHERE service_type = 'integration'
);

-- 2. Remove functions
DELETE FROM public.service_functions
WHERE service_id IN (
  SELECT service_id FROM public.service_registry WHERE service_type = 'integration'
);

-- 3. Remove services
DELETE FROM public.service_registry WHERE service_type = 'integration';

-- 4. Remove service type
DELETE FROM public.service_type_catalog WHERE service_type = 'integration';
```

---

## Execution Order

1. Task 1 — Add service type (no dependencies)
2. Task 2 — Create services (depends on Task 1)
3. Task 3 — Create functions (depends on Task 2)
4. Task 4 — Backfill mapped IDs (depends on Task 3)
5. Task 5 — Refresh view (depends on Tasks 2-3)
6. Task 6 — Verify (depends on all above)

All 6 tasks go into a single migration file. Each task is a separate SQL block with comments.

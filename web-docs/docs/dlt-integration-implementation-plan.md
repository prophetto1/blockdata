# Prompt: DLT Integration — End-to-End Implementation Plan

## What I need

A comprehensive, end-to-end implementation plan for integrating DLT (the Python data loading library, `pip install dlt`) into the BlockData platform so that users can press a "Load" or "Integrate" button in the frontend and have data extracted from external sources and loaded into our platform.

This plan must cover every layer: new files to create, existing files to modify, database migrations, edge functions, pipeline-worker service changes, frontend wiring, and the DLT runtime integration itself. It must be implementation-ready — not a design doc, not a research summary. Exact file paths, exact code, exact SQL.

---

## Background research (already completed)

### DLT assessments

Two assessments were conducted on the DLT repo at `F:\dlt` (v1.22.2):

1. **`docs/analysis/2026-03-04-dlt-extract-load-singer-assessment.md`** — Codex review. Conditional Pass. Singer is archived-only, not production-ready. Two execution patterns: `pipeline.run()` (one-call) vs explicit `extract → normalize → load` (3-phase). Go on DLT core, No-Go on archived Singer examples.

2. **`docs/analysis/2026-03-04-dlt-pipeline-assessment.md`** — Architectural assessment. Recommends Option A: use DLT for extraction + normalization into staging, then a thin adapter writes to our platform. Key gaps: no ArangoDB destination, no streaming, no built-in scheduler (needs Kestra or our pipeline-worker).

### DLT capabilities (verified)

**Sources (34 verified):** REST API (any API via declarative config), SQL Database (100+ engines via SQLAlchemy), Cloud Storage/Filesystem (S3/GCS/Azure/SFTP), plus 31 service-specific: Airtable, Amazon Kinesis, Arrow/Pandas, Asana, Chess.com, Facebook Ads, Freshdesk, GitHub, Google Ads, Google Analytics, Google Sheets, HubSpot, Inbox, Jira, Kafka, Matomo, MongoDB, Mux, Notion, Personio, Postgres Replication, Pipedrive, OpenAPI Source Generator, Salesforce, Scrapy, Shopify, Slack, Strapi, Stripe, Workable, Zendesk.

**Destinations (24):** BigQuery, Snowflake, Redshift, Databricks, Postgres, DuckDB, ClickHouse, MSSQL, Azure Synapse, Athena, Dremio, Microsoft Fabric, SQLAlchemy (30+ DBs), MotherDuck, DuckLake, Delta, Iceberg, Filesystem, Weaviate, LanceDB, Qdrant, Hugging Face, Custom `@dlt.destination`.

**Singer:** No maintained community bridge exists. dltHub recommends rewriting Singer taps as native dlt sources, not wrapping them. Alto (z3z1ma/alto) exists but is dormant since March 2023.

### Existing platform architecture

Read these files to understand the current state:

**Pipeline worker service** (`services/pipeline-worker/`):
- `app/main.py` — FastAPI app with health check and dispatch router
- `app/registry.py` — Auto-discovers plugins, maps task types to handlers
- `app/shared/base.py` — BasePlugin ABC (`task_types`, `async run(params, context) -> PluginOutput`)
- `app/shared/context.py` — ExecutionContext (replaces Kestra's RunContext)
- `app/shared/auth.py` — Credential resolution via Supabase vault
- `app/shared/storage.py` — File I/O via Supabase Storage
- `app/plugins/core.py`, `http.py`, `scripts.py`, `eyecite.py` — Existing plugins
- `app/routes/admin_services.py` — Admin API routes
- Plan doc: `docs/kestra-integration/pipeline-worker-plan.md`

**Frontend ELT panels** (stub — buttons disabled, "wiring not implemented yet"):
- `web/src/components/elt/DltPullPanel.tsx` — Extract/pull UI stub
- `web/src/components/elt/DltLoadPanel.tsx` — Load UI stub
- Both reference DLT entrypoints like `dlt.pipeline(...)`, `dlt.sources.*`, `dlt.extract.*`

**Database tables** (read the migrations to understand the schema):
- `supabase/migrations/20260227150000_050_unified_service_registry.sql` — `registry_services`, `registry_service_functions`, `service_type_catalog`
- `supabase/migrations/20260227154000_051_service_run_events_artifacts.sql` — `service_runs` with status tracking
- `supabase/migrations/20260228150000_059_integration_catalog_items.sql` — Integration catalog
- `supabase/migrations/20260303100000_064_kestra_plugin_catalog_tables.sql` — Satellite tables for plugin inputs/outputs/examples
- `supabase/migrations/20260302120000_061_pipeline_worker_and_resolve_task.sql` — Pipeline worker task resolution
- `supabase/migrations/20260228121000_058_assistant_chat_messages.sql` — Chat tables (for context on how we structure edge functions)

**Edge functions** (read these for patterns):
- `supabase/functions/flows/index.ts` — Flow execution edge function
- `supabase/functions/runs/index.ts` — Run management
- `supabase/functions/admin-services/index.ts` — Service CRUD
- `supabase/functions/_shared/` — Shared utilities (cors, supabase client, superuser, env)

**Integration catalog data:**
- `kestra_provider_enrichment` table — 56 providers with metadata (provider_name, base_url, docs_url, auth_type, auth_fields)
- `integration_catalog_items` table — Plugin items with task_class, schema, descriptions
- `kestra_plugin_inputs/outputs/examples/definitions` — Satellite tables

**Frontend services/integrations pages:**
- `web/src/pages/settings/ServicesPanel.tsx` — Service admin panel (two-pane: sidebar + detail)
- `web/src/pages/settings/services-panel.api.ts` — Service CRUD API layer
- `web/src/pages/settings/services-panel.types.ts` — ServiceRow, ServiceFunctionRow types
- `web/src/pages/settings/IntegrationCatalogPanel.tsx` — Integration catalog admin view
- `web/src/pages/Integrations.tsx` — Placeholder (to become marketplace)
- `web/src/pages/ServicesPage.tsx` — Public services browse page

**Router and navigation:**
- `web/src/router.tsx` — All routes
- `web/src/components/shell/nav-config.ts` — Global nav items (Flows, ELT, Integrations, Database)

---

## Required investigation steps

Before writing the plan, you MUST read and understand:

1. **The DLT repo at `F:\dlt`** — specifically:
   - `dlt/pipeline/pipeline.py` — Pipeline class, `run()`, `extract()`, `normalize()`, `load()` methods
   - `dlt/sources/rest_api/` — REST API source (most relevant generic connector)
   - `dlt/extract/decorators.py` — `@dlt.source`, `@dlt.resource` decorators
   - `dlt/destinations/impl/postgres/` — Postgres destination (our likely first target)
   - `dlt/destinations/impl/filesystem/` — Filesystem destination (staging option)
   - `dlt/_workspace/_templates/` — Pipeline templates for patterns
   - `pyproject.toml` — Dependencies and extras

2. **The pipeline-worker service** — read ALL files in `services/pipeline-worker/` to understand the plugin contract, registry, context, and how plugins execute

3. **The ELT frontend** — read all files in `web/src/components/elt/` and the ELT page routing to understand the current stub state

4. **Database schema** — read the migration files listed above to understand the service registry, runs, and integration catalog tables

5. **Edge functions** — read `supabase/functions/flows/index.ts` and `supabase/functions/runs/index.ts` for patterns on how we trigger backend work from the frontend

---

## What the plan must cover

### 1. Pipeline-worker DLT plugin
- A new plugin file at `services/pipeline-worker/app/plugins/dlt_extract_load.py`
- Implements BasePlugin, registered as task types for DLT operations
- Handles: source configuration, destination configuration, pipeline execution
- Uses DLT's Python API (`dlt.pipeline()`, `pipeline.run()`, etc.)
- Credential resolution via the existing `auth.py` mechanism
- State/progress reporting back to Supabase during execution
- Error handling, logging, and run artifact capture

### 2. Database additions
- Any new tables or columns needed for:
  - DLT pipeline configurations (source type, source config, destination config)
  - DLT pipeline run state (extract progress, normalize progress, load progress)
  - DLT schema snapshots (what DLT inferred from the source)
  - Connection/credential storage for external sources
- Migration SQL with exact table definitions, RLS policies, indexes

### 3. Edge function(s)
- New or modified edge function(s) to:
  - Accept a "run this DLT pipeline" request from the frontend
  - Create a service_run record
  - Dispatch to the pipeline-worker
  - Stream progress back to the frontend (or poll via realtime subscription)

### 4. Frontend wiring
- Wire `DltPullPanel.tsx` and `DltLoadPanel.tsx` to actually work
- Source selector (pick from available DLT sources or configure REST API)
- Destination selector (pick from available DLT destinations)
- Configuration forms for source parameters (API keys, URLs, etc.)
- Run button that triggers the edge function
- Progress/status display during execution
- Result display after completion (rows loaded, tables created, errors)

### 5. Integration with existing systems
- How DLT sources map to `integration_catalog_items` and `kestra_provider_enrichment`
- How DLT pipeline runs use the `service_runs` table
- How DLT plugins register in `registry_service_functions`
- How credentials flow from user input → Supabase vault → pipeline-worker → DLT

### 6. DLT repo usage
- Whether DLT is installed as a pip dependency in the pipeline-worker Docker image
- Which DLT extras are needed (`[postgres]`, `[filesystem]`, `[duckdb]`, etc.)
- How DLT's state persistence works in our containerized environment
- How DLT's schema inference results get surfaced to the user

---

## Constraints

- Use the skills: brainstorming, using-superpowers, writing-plans, executing-plans, and verification-before-completion
- The plan must be saved to `docs/plans/YYYY-MM-DD-dlt-integration-plan.md`
- DRY, YAGNI, TDD — no over-engineering
- Frequent commits — each task should be independently committable
- The DLT repo is at `F:\dlt` — read it, don't guess about its API
- The pipeline-worker is at `services/pipeline-worker/` — extend it, don't create a new service
- Frontend uses React + TypeScript + shadcn/ui + Tailwind — match existing patterns
- Database is Supabase (Postgres) — use migrations, RLS policies, service_role patterns
- Edge functions are Deno/TypeScript on Supabase — match existing patterns in `supabase/functions/`

---

## Output format

Follow the writing-plans skill format:
- Header with goal, architecture, tech stack
- Numbered tasks, each with exact files, exact code, exact commands
- Each task is independently committable
- Include test steps and verification commands

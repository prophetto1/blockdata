# 2026-04-01 AGChain Tools Surface Implementation Plan

## Goal

Implement the AGChain tools surface as a project-owned shared runtime registry plus benchmark-version ordered tool bindings and a deterministic resolved-manifest read surface that is aligned with:

- the `organization -> project -> child resource` scope model already locked elsewhere,
- the current AGChain FastAPI route and OpenTelemetry conventions,
- the already-landed `agchain_tools`, `agchain_tool_versions`, and `agchain_benchmark_version_tools` seams,
- the current benchmark version `tool_refs` contract already exposed by the backend, and
- the verified Inspect tool model for built-ins, bridged tools, MCP servers, and tool metadata.

## Architecture

Project-owned shared runtime registry under the AGChain workspace hierarchy, merged with a checked-in read-only built-in catalog, versioned authored tool definitions, benchmark-version ordered pinned `tool_ref` bindings, and a deterministic resolved-manifest preview/read surface that future run-launch work can consume.

## Tech Stack

FastAPI, Supabase/Postgres, OpenTelemetry, React, Vite, TypeScript, Vitest, pytest.

## Plan Type

Takeover rewrite and contract-locking plan.

## Status

Revised after pre-implementation evaluation. Pending re-evaluation before implementation.

## Inherited Inputs

- Prior tools-surface investigation from this session.
- `docs/output/python-dir-bundles/inspect_ai/tool.md`
- `docs/jon/todos/plan/AGChain Scope Model and Settings Hierarchy.md`
- `docs/plans/2026-03-31-agchain-workspace-scope-and-phase1-unblock-plan.md`
- `docs/plans/__complete/2026-03-31-agchain-models-surface-implementation-plan-v2.md`
- `docs/plans/2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md`
- `docs/plans/2026-03-31-agchain-scorers-prompts-registry-implementation-plan.md`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/lib/agchainTools.ts`
- `web/src/lib/agchainBenchmarks.ts`
- `web/src/lib/secretsApi.ts`
- `services/platform-api/app/main.py`
- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/api/routes/agchain_datasets.py`
- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/api/routes/secrets.py`
- `services/platform-api/app/domain/agchain/project_access.py`
- `services/platform-api/app/domain/agchain/task_registry.py`
- `services/platform-api/app/domain/agchain/types.py`
- `supabase/migrations/20260331143000_agchain_inspect_component_registries.sql`

## Trust Matrix

- High confidence: the scope hierarchy docs already lock shared AGChain runtime registries, including tools, as project-scoped resources under the `organization -> project -> child resource` model.
- High confidence: the workspace-scope plan already locked the first-pass role model, the existing `require_project_access()` and `require_project_write_access()` helper seam, and the required auth-check telemetry.
- High confidence: the Models surface is intentionally global, not project-gated, which is a real precedent that must be acknowledged rather than ignored.
- High confidence: the current mounted route seams, auth dependencies, trace naming, and metric naming can be taken from live route modules and existing plan contracts.
- High confidence: current persistence seams are taken from landed migration SQL and benchmark tests.
- High confidence: benchmark versions already persist and return `tool_refs` through `task_registry.py`.
- High confidence: `AgchainToolsPage.tsx` is still a placeholder and `agchainTools.ts` is a stale CRUD-oriented client contract.
- High confidence: the canonical secrets seam already exists as `/secrets` plus `web/src/lib/secretsApi.ts`.
- High confidence: Inspect facts verified from the bundled reference:
  - `skill` is a separate built-in tool surface and should not be folded into the authored tools registry.
  - the `prompt` parameter on `@tool(...)` is deprecated metadata, not a modeling seam to build product UI around.
  - MCP is server-first via `mcp_server_*()` plus `mcp_tools(server, tools=...)`.
  - bridged host-side tools are real via `BridgedToolsSpec`.
- Medium confidence: the inherited draft's architectural direction was broadly right, but several contracts were under-locked before this revision.
- Rejected as written: any plan that treats tools as greenfield CRUD over the current `web/src/lib/agchainTools.ts` types.
- Rejected as written: any plan that treats the Models page's global behavior as proof that tools must also be global.
- Rejected as written: any design that leaves benchmark bindings floating against `latest_version_id` at runtime.

## Plan Drift Findings

- There is no mounted `agchain_tools` router today. `services/platform-api/app/main.py` mounts models, workspaces, datasets, benchmarks, and operations, but not tools.
- `web/src/pages/agchain/AgchainToolsPage.tsx` is still a placeholder `AgchainSectionPage`.
- `web/src/lib/agchainTools.ts` encodes an older CRUD contract with `approval_required`, `parallel_tool_calls_supported`, `sandbox_requirements_jsonb`, and `viewer_hints_jsonb`, but no source-kind model, no server-first MCP model, and no stable pinned runtime `tool_ref` contract.
- The backend is not zero-state on tool bindings:
  - `services/platform-api/app/domain/agchain/types.py` already exposes `tool_refs_jsonb`.
  - `services/platform-api/app/domain/agchain/task_registry.py` already writes and loads `agchain_benchmark_version_tools`.
  - benchmark version detail payloads already return `tool_refs`.
- The current binding table is still too narrow for the desired tool model because it does not yet lock `tool_ref` as the public runtime identifier for every binding.
- The inherited draft hard-locked project scope without explicitly reconciling the competing global Models precedent, which created avoidable plan ambiguity.
- The inherited draft used `require_user_auth` alone on mutating routes and did not explicitly lock project role requirements.
- The inherited draft said MCP is server-first, but did not lock whether discovered child tools are persisted individually or how benchmarks bind to them.
- The inherited draft named `tool_resolution.py` and manifest traces, but did not declare a public resolved-manifest read surface.
- The inherited draft left the migration filename as a placeholder and the task plan too broad for execution handoff.

## Pre-Implementation Contract

- This revision addresses only verified findings from the pre-implementation evaluations already performed in this session.
- This document remains a tools-surface implementation plan. It covers the project-owned registry, authored versioning, benchmark tool bag, and resolved-manifest preview/read surface.
- This document does not expand into the separate future plan for run-launch execution wiring, per-step tool selection, or `skill` authoring.
- No verified finding is deferred in this revision.
- No new architecture is introduced beyond the verified findings. The work here is contract-tightening, not product reinvention.
- All mechanical cascades caused by these corrections are included in the revised inventory, endpoint, observability, verification, and task sections below.

## Salvage Or Rewrite Decision

Preserve the core product direction, rewrite the under-locked contracts.

Salvaged:

- benchmark-level tool bag rather than step-level tool fields
- resolved manifest as an explicit runtime seam
- server-first MCP registration and discovery
- archive-only lifecycle
- skills excluded from the authored tools registry
- checked-in backend metadata for built-ins

Rewritten:

- the scope-model wording so it explicitly matches the AGChain workspace hierarchy
- the auth and role contract on every route
- the runtime binding model so `tool_ref` is pinned and deterministic
- the MCP child-tool persistence and selection semantics
- the resolved-manifest surface from implicit/internal-only to explicit read contract
- the secret-handling contract so it reuses the canonical `/secrets` seam without persisting user-owned secret identifiers in project-owned tool rows
- the execution task plan so it is implementation-grade

## Locked Decisions

1. AGChain tools are project-owned shared runtime resources under the existing `organization -> project -> child resource` hierarchy.
2. The level-1 `Tools` page is intentionally project-gated, unlike the global `Models` page. This is a deliberate product asymmetry, not drift.
3. The registry read surface merges two sources:
   - a read-only system catalog overlay for supported Inspect built-ins
   - project-authored definitions persisted in `public.agchain_tools` and `public.agchain_tool_versions`
4. Supported source kinds in this tranche are:
   - `builtin`
   - `custom`
   - `bridged`
   - `mcp_server`
5. `builtin` rows are read-only catalog overlays and are never inserted into `public.agchain_tools`.
6. `skill` is explicitly out of scope for the authored tools registry because Inspect models it as a separate built-in tool surface.
7. The deprecated `prompt` parameter on Inspect tools is not a first-class AGChain modeling seam and must not drive API or UI design.
8. The benchmark authoring surface for tools is benchmark-version-level and ordered. This plan does not add per-step tool selection fields.
9. Every benchmark tool binding is pinned to a deterministic runtime `tool_ref`. Runtime resolution must never float against `latest_version_id`.
10. The locked `tool_ref` grammar is:
    - `builtin:<builtin_slug>`
    - `custom:<tool_version_id>`
    - `bridged:<tool_version_id>`
    - `mcp:<tool_version_id>:<server_tool_name>`
11. `tool_ref` is the public runtime identifier and the source of truth for resolution. `tool_version_id` remains a nullable join helper for authored bindings where applicable, and when both are present they must agree with the `tool_ref`.
12. `public.agchain_tools.latest_version_id` remains a UI and authoring convenience only. It may help default new benchmark selections, but it is never used as a floating runtime pointer.
13. `custom` rows represent one authored tool version bound to one implementation reference. This tranche does not introduce a multi-tool custom bundle format.
14. `bridged` rows represent one authored bridged host-side tool definition. This tranche does not model multi-tool bridge bundles as one row.
15. `mcp_server` rows persist the server definition only. Preview discovers child tools, but discovered child tools are not persisted as first-class `agchain_tools` rows.
16. Benchmarks bind to selected MCP child tools via `mcp:<tool_version_id>:<server_tool_name>`, where `tool_version_id` points to the authored MCP server version and `server_tool_name` is the discovered child tool on that server.
17. The resolved manifest is an explicit read-only API seam in this tranche, not merely an internal helper.
18. Tool definitions may store non-sensitive secret slot metadata only. They may not store secret values, encrypted blobs, bearer tokens, raw headers, or user-owned secret record IDs.
19. The canonical secrets seam remains `/secrets` plus `web/src/lib/secretsApi.ts`. The tools surface may reuse that seam for current-user metadata lookup and preview validation, but not for duplicative secret storage.
20. Tool lifecycle is archive-only. There is no hard delete route in this tranche.
21. The runtime built-in catalog is backed by checked-in backend metadata, not by scraping `docs/output/**` at runtime.
22. A future global cross-project tools catalog is out of scope for this document.

## Locked Inventory Counts

- Backend new files: `5`
- Backend modified files: `5`
- Frontend new files: `8`
- Frontend modified files: `5`
- New route contracts: `13`
- Modified route contracts: `2`
- New migration files: `1`
- Route-level trace names added: `13`
- Internal trace names added: `5`
- Structured log events added: `5`
- Backend test files touched: `2`
- Frontend test files touched: `3`

## Locked File Inventory

### Backend new files

- `services/platform-api/app/api/routes/agchain_tools.py`
- `services/platform-api/app/domain/agchain/tool_catalog.py`
- `services/platform-api/app/domain/agchain/tool_registry.py`
- `services/platform-api/app/domain/agchain/tool_resolution.py`
- `services/platform-api/tests/test_agchain_tools.py`

### Backend modified files

- `services/platform-api/app/main.py`
- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/domain/agchain/task_registry.py`
- `services/platform-api/app/domain/agchain/types.py`
- `services/platform-api/tests/test_agchain_benchmarks.py`

### Frontend new files

- `web/src/components/agchain/tools/AgchainToolsTable.tsx`
- `web/src/components/agchain/tools/AgchainToolInspector.tsx`
- `web/src/components/agchain/tools/AgchainToolEditorDialog.tsx`
- `web/src/components/agchain/tools/AgchainToolSourceEditor.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkToolBag.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkToolBag.test.tsx`
- `web/src/hooks/agchain/useAgchainTools.ts`
- `web/src/pages/agchain/AgchainToolsPage.test.tsx`

### Frontend modified files

- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/lib/agchainTools.ts`
- `web/src/lib/agchainBenchmarks.ts`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`

## Locked Contract

### Platform API

#### Auth and role contract

- Every tools route and benchmark-tool route uses `require_user_auth`.
- Every project-scoped read route must immediately call `require_project_access(user_id=..., project_id=...)`.
- Every draft write route must immediately call `require_project_write_access(user_id=..., project_id=...)` with the default allowed project roles of `project_admin` and `project_editor`, plus the existing `organization_admin` bypass.
- Publish and archive routes must call `require_project_write_access(..., allowed_project_roles=("project_admin",))`, plus the existing `organization_admin` bypass.
- The role matrix for this plan is:
  - read: `project_viewer`, `project_editor`, `project_admin`, `organization_admin`
  - create or update draft tool rows and versions: `project_editor`, `project_admin`, `organization_admin`
  - replace benchmark tool bag: `project_editor`, `project_admin`, `organization_admin`
  - publish and archive: `project_admin`, `organization_admin`
- Route implementations must reuse the existing `agchain.project_access.check` trace, `platform.agchain.project_access.check.duration_ms` histogram, and `agchain.project.access_denied` structured log by calling the existing project-access helper instead of inventing tool-specific auth telemetry.

#### Source-kind version contract

All authored versions continue to use the existing version table columns:

- `input_schema_jsonb`
- `output_schema_jsonb`
- `tool_config_jsonb`
- `parallel_calls_allowed`
- `status`

Common `tool_config_jsonb` contract for all authored source kinds:

- `secret_slots`: optional array of non-sensitive slot descriptors shaped as:
  - `slot_key`
  - `value_kind`
  - `required`
  - `description`
  - optional `default_secret_name_hint`
- `default_timeout_seconds`: optional integer
- `notes`: optional string

Per-kind contract:

- `custom`
  - required:
    - `implementation_kind`
    - `implementation_ref`
  - validation:
    - `implementation_kind` must be one of `python_callable`, `package_entrypoint`, or `external_ref`
    - `implementation_ref` must be a non-empty string
  - preview:
    - structural validation only in this tranche
- `bridged`
  - required:
    - `bridge_name`
    - `implementation_ref`
  - validation:
    - one row maps to one bridged tool definition
    - multi-tool bridge bundles are out of scope in this tranche
  - preview:
    - structural validation only in this tranche
- `mcp_server`
  - required:
    - `transport_type`
    - transport-specific connection config
  - allowed `transport_type` values:
    - `stdio`
    - `http`
    - `sse`
  - connection config:
    - for `stdio`: `command`, optional `args`, optional `cwd`, optional `env_secret_slots`
    - for `http` or `sse`: `url`, optional `headers_secret_slots`
  - validation:
    - raw header values and bearer tokens are forbidden
    - only secret slot metadata may be persisted
  - preview:
    - structural validation plus live discovery of child tools
    - response returns child tool metadata and corresponding `mcp:<tool_version_id>:<server_tool_name>`-compatible preview refs once the server version exists, or `server_tool_name` plus discovery metadata when previewing before persistence
  - publish:
    - blocked unless preview/discovery succeeds and returns at least one child tool

#### New endpoint contracts

- `GET /agchain/tools`
  - Auth: `require_user_auth` + `require_project_access`
  - Request: query `project_id`, optional `source_kind`, optional `include_archived`, optional `cursor`
  - Response: `{ items, next_cursor }`
  - Each item includes:
    - `tool_ref`
    - `tool_id | null`
    - `tool_name`
    - `display_name`
    - `description`
    - `source_kind`
    - `scope_kind` with values `system` or `project`
    - `read_only`
    - `approval_mode`
    - `latest_version`
    - `updated_at`
  - Touches: `public.agchain_tools`, `public.agchain_tool_versions`, system built-in catalog
  - Why: the level-1 Tools page needs one authoritative list that includes read-only built-ins and project-authored definitions

- `GET /agchain/tools/new/bootstrap`
  - Auth: `require_user_auth` + `require_project_access`
  - Request: query `project_id`
  - Response: `{ builtin_catalog, sandbox_profiles, source_kind_options, secret_slot_contract }`
  - Touches: system built-in catalog, `public.agchain_sandbox_profiles`
  - Reuse: frontend loads current-user secret metadata separately from the canonical `/secrets` route rather than duplicating secret storage here
  - Why: the frontend must render source-kind-specific editors without hardcoding backend metadata

- `POST /agchain/tools/new/preview`
  - Auth: `require_user_auth` + `require_project_write_access`
  - Request: `{ project_id, source_kind, draft }`
  - Response: `{ normalized_definition, discovered_tools, validation, missing_secret_slots }`
  - `discovered_tools` contract:
    - empty for `custom` and `bridged`
    - for `mcp_server`, array of `{ server_tool_name, display_name, description, input_schema_jsonb, preview_tool_ref }`
  - Touches: preview-only normalization and MCP discovery logic; no persistent writes
  - Why: source-kind-specific validation and MCP child discovery must happen before draft save or publish

- `POST /agchain/tools`
  - Auth: `require_user_auth` + `require_project_write_access`
  - Request: `{ project_id, tool, initial_version }`
  - Response: `{ tool, latest_version, versions }`
  - Touches: `public.agchain_tools`, `public.agchain_tool_versions`
  - Change: create a new authored tool row and initial draft version
  - Why: tool-level policy metadata and versioned definition metadata are separate concerns

- `GET /agchain/tools/{tool_id}/detail`
  - Auth: `require_user_auth` + `require_project_access`
  - Request: query `project_id`
  - Response: `{ tool, latest_version, versions }`
  - Additional response requirement for `mcp_server` versions:
    - include last-known discovery metadata if available from preview or publish-time validation
  - Touches: `public.agchain_tools`, `public.agchain_tool_versions`
  - Why: the Tools page needs an inspector surface with full version history, version metadata, and source-kind-specific details

- `PATCH /agchain/tools/{tool_id}`
  - Auth: `require_user_auth` + `require_project_write_access`
  - Request: `{ display_name, description, approval_mode, sandbox_requirement_jsonb }`
  - Response: `{ ok, tool }`
  - Touches: `public.agchain_tools`
  - Change: update tool-level metadata only
  - Why: versioned configuration and tool-level policy must not be conflated

- `POST /agchain/tools/{tool_id}/versions`
  - Auth: `require_user_auth` + `require_project_write_access`
  - Request: `{ version_label, input_schema_jsonb, output_schema_jsonb, tool_config_jsonb, parallel_calls_allowed, status }`
  - Response: `{ ok, tool_version }`
  - Touches: `public.agchain_tool_versions`
  - Change: create a new draft version
  - Why: `custom`, `bridged`, and `mcp_server` definitions all need versioned configuration

- `PATCH /agchain/tools/{tool_id}/versions/{tool_version_id}`
  - Auth: `require_user_auth` + `require_project_write_access`
  - Request: partial update over the same version contract
  - Response: `{ ok, tool_version }`
  - Touches: `public.agchain_tool_versions`
  - Change: update a draft version
  - Why: the page must support iterative editing of versioned tool definitions

- `POST /agchain/tools/{tool_id}/versions/{tool_version_id}/publish`
  - Auth: `require_user_auth` + `require_project_write_access(allowed_project_roles=("project_admin",))`
  - Request: no body or optional `{ publish_notes }`
  - Response: `{ ok, tool, tool_version }`
  - Preconditions:
    - draft version validates
    - if `source_kind == "mcp_server"`, preview/discovery succeeds and returns at least one child tool
  - Touches: `public.agchain_tools.latest_version_id`, `public.agchain_tool_versions.status`
  - Change: publish a version and advance `latest_version_id`
  - Why: benchmark authoring may default to the latest published authored version, but runtime still binds pinned refs only

- `POST /agchain/tools/{tool_id}/archive`
  - Auth: `require_user_auth` + `require_project_write_access(allowed_project_roles=("project_admin",))`
  - Request: no body
  - Response: `{ ok, tool }`
  - Touches: `public.agchain_tools.archived_at`
  - Change: archive the tool without deleting history
  - Why: archive-only lifecycle is the locked policy for this surface

- `GET /agchain/benchmarks/{benchmark_slug}/tools`
  - Auth: `require_user_auth` + `require_project_access`
  - Request: query `benchmark_version_id`
  - Response: `{ tool_refs }`
  - Each item includes:
    - `position`
    - `tool_ref`
    - `source_kind`
    - `tool_version_id | null`
    - `alias | null`
    - `config_overrides_jsonb`
    - `display_name | null`
  - Touches: `public.agchain_benchmark_version_tools`
  - Change: explicit benchmark tool-bag read route
  - Why: the workbench needs a dedicated fetch path for the ordered tool bag

- `PUT /agchain/benchmarks/{benchmark_slug}/tools`
  - Auth: `require_user_auth` + `require_project_write_access`
  - Request: `{ benchmark_version_id, tool_refs }`
  - Response: `{ ok, tool_refs }`
  - Validation:
    - benchmark version must be a draft
    - every item must carry a valid pinned `tool_ref`
    - if `tool_version_id` is provided, it must match the `tool_ref`
  - Touches: `public.agchain_benchmark_version_tools`
  - Change: replace the ordered tool bag for the current draft version
  - Why: benchmark-level tool composition already exists conceptually in the backend and now needs an explicit edit route with deterministic pinned refs

- `GET /agchain/benchmarks/{benchmark_slug}/versions/{benchmark_version_id}/tools/resolved`
  - Auth: `require_user_auth` + `require_project_access`
  - Request: path `benchmark_version_id`
  - Response: `{ items }`
  - Each resolved item includes:
    - `position`
    - `tool_ref`
    - `source_kind`
    - `alias | null`
    - `display_name`
    - `runtime_name`
    - `approval_mode`
    - `parallel_calls_allowed`
    - `input_schema_jsonb`
    - `output_schema_jsonb`
    - `config_overrides_jsonb`
    - `missing_secret_slots`
    - `resolution_status`
  - Touches: system built-in catalog, `public.agchain_tools`, `public.agchain_tool_versions`, `public.agchain_benchmark_version_tools`
  - Change: explicit deterministic resolved-manifest read endpoint
  - Why: the workbench and future run-launch work both need a stable ordered preview of what the benchmark will actually resolve to

#### Modified endpoint contracts

- `GET /agchain/benchmarks/{benchmark_slug}/versions/{benchmark_version_id}`
  - Change: normalize `tool_refs` into an explicit runtime shape with:
    - `position`
    - `tool_ref`
    - `source_kind`
    - `tool_version_id | null`
    - `alias | null`
    - `config_overrides_jsonb`
    - resolved display metadata when available
  - Why: the frontend already consumes benchmark version detail and needs a stable pinned tool binding payload instead of ad hoc join rows

- `GET /agchain/benchmarks/{benchmark_slug}/versions`
  - Change: keep `tool_count`, but ensure it remains correct after `agchain_benchmark_version_tools` is widened to require `tool_ref` and support non-authored built-ins plus discovered MCP child bindings
  - Why: current version list summaries already expose tool counts

### Observability

#### Route-level traces

- `agchain.tools.list`
- `agchain.tools.new.bootstrap`
- `agchain.tools.new.preview`
- `agchain.tools.create`
- `agchain.tools.get`
- `agchain.tools.update`
- `agchain.tools.versions.create`
- `agchain.tools.versions.update`
- `agchain.tools.versions.publish`
- `agchain.tools.archive`
- `agchain.benchmarks.tools.get`
- `agchain.benchmarks.tools.replace`
- `agchain.benchmarks.tools.resolved`

#### Internal traces

- `agchain.tools.catalog.merge`
- `agchain.tools.preview.normalize`
- `agchain.tools.preview.discover`
- `agchain.tools.manifest.resolve`
- `agchain.tools.bindings.resolve`

#### Metrics

- Counters:
  - `platform.agchain.tools.list.count`
  - `platform.agchain.tools.bootstrap.count`
  - `platform.agchain.tools.preview.count`
  - `platform.agchain.tools.create.count`
  - `platform.agchain.tools.get.count`
  - `platform.agchain.tools.update.count`
  - `platform.agchain.tools.versions.create.count`
  - `platform.agchain.tools.versions.update.count`
  - `platform.agchain.tools.versions.publish.count`
  - `platform.agchain.tools.archive.count`
  - `platform.agchain.benchmarks.tools.get.count`
  - `platform.agchain.benchmarks.tools.replace.count`
  - `platform.agchain.benchmarks.tools.resolved.count`
- Histograms:
  - `platform.agchain.tools.list.duration_ms`
  - `platform.agchain.tools.preview.duration_ms`
  - `platform.agchain.tools.write.duration_ms`
  - `platform.agchain.tools.manifest.resolve.duration_ms`
  - `platform.agchain.benchmarks.tools.get.duration_ms`
  - `platform.agchain.benchmarks.tools.write.duration_ms`
  - `platform.agchain.benchmarks.tools.resolved.duration_ms`

#### Structured logs

- `agchain.tools.preview_failed`
- `agchain.tools.version_published`
- `agchain.tools.archived`
- `agchain.tools.manifest_resolution_failed`
- `agchain.benchmarks.tools_replaced`

#### Required observability reuse

- Every project-scoped route in this plan must trigger the existing project-access helper observability:
  - `agchain.project_access.check`
  - `platform.agchain.project_access.check.duration_ms`
  - `agchain.project.access_denied`

#### Allowed trace and metric attributes

- `project_id_present`
- `organization_id_present`
- `membership_role`
- `source_kind`
- `transport_type`
- `tool_count`
- `selection_count`
- `discovered_count`
- `resolved_count`
- `missing_secret_slot_count`
- `has_latest_version`
- `benchmark_version_is_draft`
- `status`
- `result`
- `http.status_code`

#### Forbidden trace and metric attributes

- `user_id`
- `tool_id`
- `tool_version_id`
- `tool_ref`
- raw source code or inline tool bodies
- raw MCP server URLs
- raw headers
- bearer tokens or secret values
- user secret record IDs
- raw secret names
- raw file paths from custom tool config

### Database Migrations

#### New migration

- `supabase/migrations/20260401123000_agchain_tools_runtime_refs.sql`

#### Locked migration changes

- Alter `public.agchain_tools`
  - add `source_kind TEXT NOT NULL DEFAULT 'custom'`
  - add a check constraint covering `custom`, `bridged`, and `mcp_server`
  - keep `approval_mode`, `sandbox_requirement_jsonb`, and `archived_at` as the tool-level policy seam
  - backfill existing rows to `source_kind = 'custom'`

- Keep `public.agchain_tool_versions` as the canonical versioned definition table
  - continue using `input_schema_jsonb`, `output_schema_jsonb`, `tool_config_jsonb`, `parallel_calls_allowed`, and `status`
  - do not create a parallel second definition table
  - do not create a separate discovered-child-tools table in this tranche
  - validate `tool_config_jsonb` by source kind in application code rather than creating a competing storage seam

- Alter `public.agchain_benchmark_version_tools`
  - add `tool_ref TEXT`
  - backfill every existing row to `tool_ref = 'custom:' || tool_version_id::text`
  - set `tool_ref` to `NOT NULL` after backfill
  - make `tool_version_id` nullable
  - preserve ordered semantics via `position`
  - keep `alias` and `config_overrides_jsonb`
  - enforce application-level validation that:
    - `builtin:*` rows carry `tool_version_id = NULL`
    - `custom:*` and `bridged:*` rows carry matching `tool_version_id`
    - `mcp:*` rows carry the authored MCP server version id in `tool_version_id`

- Existing data affected
  - yes; existing `agchain_tools` rows get `source_kind = 'custom'`
  - yes; existing benchmark tool bindings are backfilled to deterministic pinned `tool_ref` values
  - no destructive rewrite of existing authored rows is allowed

### Edge Functions

- No edge function changes in this tranche
- Verified zero-case: the tools surface is served by platform API plus web app code, not by Supabase edge functions

### Frontend Surface Area

#### Locked frontend behavior

- Replace the placeholder `AgchainSectionPage` with a real project-scoped page. This is intentionally different from `AgchainModelsPage.tsx`, which remains global.
- The page composition is:
  - project focus guard
  - search and source-kind filtering
  - registry table
  - inspector panel
  - create and edit dialog
  - source-kind-specific editor surface inside the dialog

- Rewrite `web/src/lib/agchainTools.ts`
  - remove the stale boolean-first CRUD contract
  - align request and response types with the new backend contracts:
    - registry list rows
    - tool detail
    - tool version detail
    - preview payloads
    - publish and archive responses
    - benchmark tool binding payloads
    - resolved-manifest payloads

- Add a dedicated tools hook
  - use the focused project from `useAgchainProjectFocus()`
  - fetch the merged registry list
  - drive the inspector and editor dialog state
  - refresh after create, update, publish, and archive

- Add a source-kind-specific editor surface
  - `custom` and `bridged` render structural config editors
  - `mcp_server` renders transport config plus preview and discovered child-tool selection UX
  - the editor uses `/secrets` metadata from `secretsApi.ts` to show current-user secret availability without storing secret IDs in the tool definition

- Extend the benchmark workbench
  - add a benchmark-level Tool Bag editor for the selected draft version
  - consume the benchmark detail `tool_refs` shape plus the new benchmark tools read, replace, and resolved routes
  - show resolved-manifest preview for the current ordered tool bag
  - keep step-level `scorer_ref` and `judge_prompt_ref` editing unchanged in this tranche

### Locked Acceptance Contract

- The level-1 `Tools` page renders only when an AGChain project is focused. This is intentional and unlike the global `Models` page.
- The page lists read-only built-ins from the checked-in backend catalog plus project-authored tools from the registry tables.
- Built-ins are visible but cannot be edited, published, archived, or persisted as authored rows.
- A `project_viewer` can read tools and benchmark tool bags but cannot mutate them.
- A `project_editor` can create and edit draft tools, create and edit draft versions, run preview, and replace a draft benchmark version's tool bag.
- A `project_admin` or `organization_admin` can also publish and archive.
- Every benchmark tool binding resolves from a pinned `tool_ref`; runtime does not float against `latest_version_id`.
- MCP server versions persist server config only; benchmarks bind to selected discovered child tools, not to persisted shadow rows for each child tool.
- The benchmark workbench can read and replace the ordered tool bag and can preview the resolved ordered manifest for the current draft version.
- Secret values, raw headers, bearer tokens, and user secret IDs never appear in tool rows, API payloads that define tools, traces, metrics, or structured logs.

### Explicit Risks Accepted In This Plan

- This plan does not implement a global cross-project tools catalog.
- This plan does not implement per-step tool selection.
- This plan does not implement authored `skill` support.
- This plan does not implement full run-launch execution wiring; it locks the resolved-manifest read surface that future run-launch work can consume.
- Secrets remain user-scoped. This plan supports current-user preview validation and runtime slot resolution preparation, but it does not solve a broader shared-service-account UX for project collaboration.
- `custom` and `bridged` preview in this tranche are structural-validation flows, not arbitrary remote execution flows.

### Completion Criteria

1. The migration lands with deterministic pinned `tool_ref` support and backfilled existing benchmark bindings.
2. The platform API exposes the full tools registry, versioning, preview, publish, archive, benchmark tool bag, and resolved-manifest routes described above.
3. Every route enforces the locked project access and write-access rules with the existing helper seam.
4. The frontend replaces the placeholder Tools page with a project-gated registry, inspector, and source-kind-aware editor.
5. The benchmark workbench can edit a draft benchmark version's ordered tool bag and preview the resolved ordered manifest.
6. Built-ins render as read-only catalog overlay rows and are never persisted as authored rows.
7. Benchmark version detail still returns normalized `tool_refs` after the migration.
8. Backend and frontend tests required by this plan pass.
9. Manual smoke confirms the visible product behaviors in the acceptance contract.

## Verification

### Backend

- Add focused route and domain tests in `services/platform-api/tests/test_agchain_tools.py`
- Extend `services/platform-api/tests/test_agchain_benchmarks.py` to cover widened tool bindings, normalized `tool_refs`, and resolved manifest reads

Required backend test matrix:

- project viewer can list tools and read benchmark tool bags but gets `403` on create, update, publish, archive, and replace routes
- project editor can create and edit drafts plus replace benchmark tool bags but gets `403` on publish and archive
- project admin and organization admin can publish and archive
- built-in catalog rows render as read-only and are never persisted into authored tables
- `custom` and `bridged` bindings persist pinned `tool_ref` values and matching `tool_version_id`
- `mcp_server` preview discovers child tools and the benchmark bag can persist selected `mcp:*` child refs
- resolved-manifest route returns deterministic order and missing secret slot state without leaking secret identifiers
- benchmark version detail continues to return normalized `tool_refs`

Required command:

- `cd services/platform-api && pytest -q`

Expected result:

- all new tools and benchmark binding tests pass with no role-leak regressions

### Frontend

- Add Vitest coverage for:
  - tools page project focus gating
  - system built-in rows rendered as read-only
  - create and edit flows for `custom`, `bridged`, and `mcp_server`
  - MCP preview and discovered child-tool selection
  - benchmark workbench tool bag editing and resolved preview
  - stale `agchainTools.ts` contract replaced by the new types

Required command:

- `cd web && npm run test`

Expected result:

- tools and benchmark workbench tests pass against the revised client contract

### Manual smoke

- Verify the level-1 Tools page renders for a focused project and remains hidden behind the project-focus guard when no project is selected
- Verify built-in catalog rows are visible and read-only
- Verify a `project_editor` can create and edit draft tools but cannot publish or archive
- Verify a `project_admin` can publish and archive
- Verify an MCP server draft can preview and show discovered child tools before publish
- Verify a draft benchmark version can read and replace its ordered tool bag
- Verify the resolved-manifest preview shows the ordered resolved tools for the current draft version
- Verify benchmark version detail still returns normalized `tool_refs` after the migration

## Execution Task Plan

### Task 1: Lock deterministic tool refs and project-owned source kinds in the database seam

Files:

- `supabase/migrations/20260401123000_agchain_tools_runtime_refs.sql`
- `services/platform-api/app/domain/agchain/types.py`
- `services/platform-api/app/domain/agchain/task_registry.py`
- `services/platform-api/tests/test_agchain_benchmarks.py`

Steps:

1. Add `agchain_tools.source_kind` with the locked authored-kind check constraint.
2. Add `agchain_benchmark_version_tools.tool_ref`, backfill existing rows to `custom:<tool_version_id>`, then enforce `NOT NULL`.
3. Make `tool_version_id` nullable while preserving `position`, `alias`, and `config_overrides_jsonb`.
4. Update backend types so normalized benchmark `tool_refs` carry the locked pinned shape.
5. Extend benchmark tests to prove pinned-ref backfill and normalized reads.

Tests:

- `cd services/platform-api && pytest -q tests/test_agchain_benchmarks.py -k tool`

Expected output:

- benchmark tool-binding tests pass and no legacy FK-only assumptions remain

Commit:

- `feat(agchain): pin benchmark tool refs to deterministic runtime ids`

### Task 2: Add built-in catalog merge and project-scoped tools read surfaces

Files:

- `services/platform-api/app/domain/agchain/tool_catalog.py`
- `services/platform-api/app/domain/agchain/tool_registry.py`
- `services/platform-api/app/api/routes/agchain_tools.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_agchain_tools.py`

Steps:

1. Add checked-in built-in catalog metadata in `tool_catalog.py`.
2. Implement registry merge logic in `tool_registry.py` for system built-ins plus project-authored rows.
3. Mount the new tools router.
4. Implement `GET /agchain/tools`, `GET /agchain/tools/new/bootstrap`, and `GET /agchain/tools/{tool_id}/detail`.
5. On every read route, reuse `require_project_access()`.

Tests:

- `cd services/platform-api && pytest -q tests/test_agchain_tools.py -k "list or bootstrap or detail"`

Expected output:

- read routes pass for viewer/editor/admin roles and built-ins surface as read-only overlay rows

Commit:

- `feat(agchain): add project scoped tools registry read surfaces`

### Task 3: Add authored draft mutation, publish, and archive flows with locked role gates

Files:

- `services/platform-api/app/api/routes/agchain_tools.py`
- `services/platform-api/app/domain/agchain/tool_registry.py`
- `services/platform-api/tests/test_agchain_tools.py`

Steps:

1. Implement create and update flows for tool rows and draft versions.
2. Implement publish and archive flows with admin-only gating.
3. Enforce the locked role matrix through `require_project_write_access()`.
4. Keep tool-level metadata and versioned configuration updates separate.

Tests:

- `cd services/platform-api && pytest -q tests/test_agchain_tools.py -k "create or update or publish or archive"`

Expected output:

- editors can mutate drafts, viewers cannot mutate, admins can publish and archive

Commit:

- `feat(agchain): add authored tool draft publish and archive flows`

### Task 4: Lock source-kind preview and MCP child-tool discovery semantics

Files:

- `services/platform-api/app/api/routes/agchain_tools.py`
- `services/platform-api/app/domain/agchain/tool_registry.py`
- `services/platform-api/app/domain/agchain/tool_resolution.py`
- `services/platform-api/tests/test_agchain_tools.py`

Steps:

1. Implement per-kind preview validation for `custom`, `bridged`, and `mcp_server`.
2. For `mcp_server`, perform live discovery and return discovered child-tool metadata in the preview response.
3. Ensure discovered child tools are not persisted as first-class tool rows.
4. Block publish for invalid MCP drafts or discovery failures.

Tests:

- `cd services/platform-api && pytest -q tests/test_agchain_tools.py -k "preview or mcp"`

Expected output:

- preview returns normalized validation results, discovery works for MCP drafts, and invalid publish attempts are rejected

Commit:

- `feat(agchain): add source kind preview and mcp child discovery`

### Task 5: Add benchmark tool-bag replace and resolved-manifest read surfaces

Files:

- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/domain/agchain/task_registry.py`
- `services/platform-api/app/domain/agchain/tool_resolution.py`
- `services/platform-api/app/domain/agchain/types.py`
- `services/platform-api/tests/test_agchain_benchmarks.py`

Steps:

1. Implement explicit benchmark tool-bag read and replace routes.
2. Validate pinned `tool_ref` grammar on writes.
3. Implement resolved-manifest read route with deterministic ordered output.
4. Normalize benchmark detail `tool_refs` to the locked runtime shape.
5. Keep version summary `tool_count` correct after the binding change.

Tests:

- `cd services/platform-api && pytest -q tests/test_agchain_benchmarks.py -k "tool_refs or resolved"`

Expected output:

- benchmark read/write/resolved tests pass and detail payloads stay normalized

Commit:

- `feat(agchain): add benchmark tool bag and resolved manifest routes`

### Task 6: Replace the placeholder Tools page with a project-gated registry and source-kind editor

Files:

- `web/src/lib/agchainTools.ts`
- `web/src/hooks/agchain/useAgchainTools.ts`
- `web/src/components/agchain/tools/AgchainToolsTable.tsx`
- `web/src/components/agchain/tools/AgchainToolInspector.tsx`
- `web/src/components/agchain/tools/AgchainToolEditorDialog.tsx`
- `web/src/components/agchain/tools/AgchainToolSourceEditor.tsx`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/pages/agchain/AgchainToolsPage.test.tsx`

Steps:

1. Replace the stale tools client types with the locked backend contract.
2. Build the project-gated tools hook and page shell.
3. Add source-kind filtering, inspector, and editor flows.
4. Reuse `secretsApi.ts` to show current-user secret metadata inside the editor without storing secret IDs in tool definitions.
5. Keep built-ins visibly read-only.

Tests:

- `cd web && npm run test -- AgchainToolsPage`

Expected output:

- tools page tests pass for project focus gating, built-in rendering, and source-kind editor flows

Commit:

- `feat(agchain): replace placeholder tools page with project registry workspace`

### Task 7: Wire the benchmark workbench to the ordered tool bag and resolved preview

Files:

- `web/src/lib/agchainBenchmarks.ts`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkToolBag.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkToolBag.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`

Steps:

1. Add the benchmark-level Tool Bag editor for the current draft version.
2. Load and replace the ordered tool bag through the new routes.
3. Load and render the resolved-manifest preview.
4. Keep step-level scorer and judge prompt editing unchanged.

Tests:

- `cd web && npm run test -- AgchainBenchmarkWorkbenchPage`

Expected output:

- benchmark workbench tests pass for tool bag editing and resolved preview flows

Commit:

- `feat(agchain): wire benchmark workbench to ordered tool bag and resolved preview`

### Task 8: Run the full contract check

Commands:

- `cd services/platform-api && pytest -q`
- `cd web && npm run test`

Expected output:

- backend and frontend suites pass without regressions in auth, tool binding normalization, or project focus behavior

Completion note:

- Do not claim implementation complete until the acceptance contract and manual smoke items are satisfied

## Source Verification Ledger

- Inspect reference verified from `docs/output/python-dir-bundles/inspect_ai/tool.md`
- Project-owned shared registry direction verified from:
  - `docs/jon/todos/plan/AGChain Scope Model and Settings Hierarchy.md`
  - `docs/plans/2026-03-31-agchain-workspace-scope-and-phase1-unblock-plan.md`
- Existing project access helper and auth telemetry verified from:
  - `services/platform-api/app/domain/agchain/project_access.py`
- Global Models precedent verified from:
  - `docs/plans/__complete/2026-03-31-agchain-models-surface-implementation-plan-v2.md`
- Mounted route and OTel pattern verified from:
  - `services/platform-api/app/main.py`
  - `services/platform-api/app/api/routes/agchain_models.py`
  - `services/platform-api/app/api/routes/agchain_datasets.py`
  - `services/platform-api/app/api/routes/agchain_benchmarks.py`
- Existing tool persistence verified from:
  - `supabase/migrations/20260331143000_agchain_inspect_component_registries.sql`
  - `services/platform-api/tests/test_agchain_benchmarks.py`
- Existing benchmark tool-binding seam verified from:
  - `services/platform-api/app/domain/agchain/task_registry.py`
  - `services/platform-api/app/domain/agchain/types.py`
  - `web/src/lib/agchainBenchmarks.ts`
- Canonical secrets seam verified from:
  - `services/platform-api/app/api/routes/secrets.py`
  - `web/src/lib/secretsApi.ts`
- Current placeholder and stale client contract verified from:
  - `web/src/pages/agchain/AgchainToolsPage.tsx`
  - `web/src/lib/agchainTools.ts`

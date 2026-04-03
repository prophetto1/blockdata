---
title: "Implementation state inventory"
sidebar:
  order: 3
---

# Platform Implementation State — Detailed Inventory

**Verified:** 2026-03-30
**Purpose:** Exact state of what's built in the AGChain platform (frontend + backend + database). Code-verified, not aspirational.

---

## Frontend

### Routes (from web/src/router.tsx)

| Route | Page | Status |
|-------|------|--------|
| `/app/agchain` | `AgchainIndexRedirect` → overview or projects | Working |
| `/app/agchain/overview` | `AgchainOverviewPage` | Working (68 lines) |
| `/app/agchain/projects` | `AgchainProjectsPage` | Working (86 lines) |
| `/app/agchain/datasets` | `AgchainDatasetsPage` | Placeholder |
| `/app/agchain/prompts` | `AgchainPromptsPage` | Placeholder |
| `/app/agchain/scorers` | `AgchainScorersPage` | Placeholder |
| `/app/agchain/parameters` | `AgchainParametersPage` | Placeholder |
| `/app/agchain/tools` | `AgchainToolsPage` | Placeholder |
| `/app/agchain/runs` | `AgchainRunsPage` | Placeholder |
| `/app/agchain/results` | `AgchainResultsPage` | Placeholder |
| `/app/agchain/observability` | `AgchainObservabilityPage` | Placeholder |
| `/app/agchain/benchmarks` | Redirect → settings/project/benchmark-definition | Redirect |
| `/app/agchain/settings` | `AgchainSettingsPage` | Working (100 lines) |
| `/app/agchain/settings/project/benchmark-definition` | `AgchainBenchmarksPage` | Working (130 lines) |

### Shell Layout

`AgchainShellLayout.tsx` (186 lines):
- Fixed header (70px) with TopCommandBar
- Primary left rail (256px default, resizable, stored in localStorage)
- Optional secondary rail (224px, shown on benchmark definition page only)
- Brand: "BlockData Bench"

### Components (21 files)

**Navigation:**
- `AgchainLeftNav.tsx` — primary rail with icons
- `AgchainBenchmarkNav.tsx` — secondary rail for benchmark editing
- `AgchainProjectSwitcher.tsx` — project focus selector

**Overview:**
- `overview/AgchainOverviewEvaluationCard.tsx`
- `overview/AgchainOverviewObservabilityCard.tsx`
- `overview/AgchainOverviewRecentGrid.tsx`
- `overview/agchainOverviewPlaceholderData.ts`

**Benchmarks:**
- `benchmarks/AgchainBenchmarkStepInspector.tsx` — step detail editor
- `benchmarks/AgchainBenchmarkStepsList.tsx` — ordered step list
- `benchmarks/AgchainBenchmarkWorkbenchHeader.tsx`
- `benchmarks/AgchainBenchmarksTable.tsx`

**Models:**
- `models/AgchainModelInspector.tsx` — model detail view
- `models/AgchainModelsTable.tsx` — model list
- `models/AgchainModelsToolbar.tsx` — actions bar

**Dialogs:**
- `AgchainProjectCreateDialog.tsx`

### Hooks (4 files)

| Hook | What it does |
|------|-------------|
| `useAgchainProjectFocus` | Manages focused project/benchmark slug via localStorage + CustomEvent broadcast |
| `useAgchainBenchmarks` | Fetch/create benchmarks with pagination |
| `useAgchainBenchmarkSteps` | Full benchmark step editor — CRUD, reorder |
| `useAgchainModels` | Model targets — CRUD, providers, health checks |

### Services (3 files)

| Service | What it does |
|---------|-------------|
| `agchainProjectFocus.ts` (58 lines) | localStorage + CustomEvent for project focus state |
| `agchainBenchmarks.ts` | API client for benchmark + step endpoints |
| `agchainModels.ts` | API client for model + provider + health endpoints |

### Placeholder Pattern

8 pages use `AgchainSectionPage` — a reusable template that shows:
- Section name + description
- Static bullet points describing intended functionality
- "Coming soon" state

---

## Backend (platform-api)

### Route Files

**`agchain_models.py`** — 6 endpoints, all instrumented:

| Verb | Path | Auth | What it does |
|------|------|------|-------------|
| GET | `/agchain/models/providers` | user | List 14 supported model providers with capabilities |
| GET | `/agchain/models` | user | List targets with filtering (provider, health, enabled, search, pagination) |
| GET | `/agchain/models/{id}` | user | Detail + 10 most recent health checks |
| POST | `/agchain/models` | superuser | Create model target with validation |
| PATCH | `/agchain/models/{id}` | superuser | Update model target |
| POST | `/agchain/models/{id}/refresh-health` | superuser | Async health probe (provider-specific strategies) |

**`agchain_benchmarks.py`** — 8 endpoints, all instrumented:

| Verb | Path | Auth | What it does |
|------|------|------|-------------|
| GET | `/agchain/benchmarks` | user | List with filtering (search, state, validation_status) |
| POST | `/agchain/benchmarks` | superuser | Create benchmark + initial draft version (v0.1.0) |
| GET | `/agchain/benchmarks/{slug}` | user | Summary with version counts |
| GET | `/agchain/benchmarks/{slug}/steps` | user | Ordered steps for current version |
| POST | `/agchain/benchmarks/{slug}/steps` | superuser | Create step in draft version |
| PATCH | `/agchain/benchmarks/{slug}/steps/{id}` | superuser | Update step |
| POST | `/agchain/benchmarks/{slug}/steps/reorder` | superuser | Atomic reorder via RPC |
| DELETE | `/agchain/benchmarks/{slug}/steps/{id}` | superuser | Delete + auto-renumber |

### Domain Layer

`services/platform-api/app/domain/agchain/`:
- `model_registry.py` — CRUD + health probing (multiple strategies: provider_default, http_openai_models, http_anthropic_models, http_google_models, custom_http)
- `benchmark_registry.py` — CRUD + state derivation (archived/running/attention/draft/ready)
- `model_provider_catalog.py` — 14 providers with auth kinds, probe strategies, capabilities

### Observability

**Counters (18):**
- `platform.agchain.models.providers.list.count`
- `platform.agchain.models.list.count`
- `platform.agchain.models.create.count`
- `platform.agchain.models.update.count`
- `platform.agchain.models.refresh_health.count`
- `platform.agchain.benchmarks.list.count`
- `platform.agchain.benchmarks.create.count`
- `platform.agchain.benchmarks.get.count`
- `platform.agchain.benchmarks.steps.get.count`
- `platform.agchain.benchmarks.steps.create.count`
- `platform.agchain.benchmarks.steps.update.count`
- `platform.agchain.benchmarks.steps.reorder.count`
- `platform.agchain.benchmarks.steps.delete.count`
- (+ 5 more from runtime readiness)

**Histograms (4):**
- `platform.agchain.models.list.duration_ms`
- `platform.agchain.models.refresh_health.duration_ms`
- `platform.agchain.benchmarks.list.duration_ms`
- `platform.agchain.benchmarks.steps.get.duration_ms`
- `platform.agchain.benchmarks.steps.write.duration_ms`

**Runtime readiness checks (3):**
- `agchain.benchmarks.catalog` — can list benchmarks
- `agchain.models.providers` — can list providers
- `agchain.models.targets` — can list model targets

---

## Database

### Migrations

| File | What it creates |
|------|----------------|
| `20260326170000_agchain_model_targets.sql` | `agchain_model_targets` + `agchain_model_health_checks` |
| `20260326234500_agchain_benchmark_registry.sql` | `agchain_benchmarks` + `agchain_benchmark_versions` + `agchain_benchmark_steps` + `agchain_benchmark_model_targets` + `agchain_runs` |
| `20260328113000_agchain_benchmark_step_reorder_atomic_rpc.sql` | `reorder_agchain_benchmark_steps_atomic()` RPC |

### Table Schemas (Key Columns)

**agchain_model_targets:**
`model_target_id`, `label`, `provider_slug`, `provider_qualifier`, `model_name`, `qualified_model`, `api_base`, `auth_kind` (none/api_key/oauth/service_account/custom), `credential_source_jsonb` (hidden from users), `model_args_jsonb`, `supports_evaluated`, `supports_judge`, `capabilities_jsonb`, `enabled`, `probe_strategy`, `health_status` (healthy/degraded/error/unknown), `health_checked_at`, `last_latency_ms`

**agchain_benchmarks:**
`benchmark_id`, `benchmark_slug` (unique), `benchmark_name`, `description`, `owner_user_id`, `current_draft_version_id`, `current_published_version_id`, `archived_at`

**agchain_benchmark_versions:**
`benchmark_version_id`, `benchmark_id`, `version_label`, `version_status` (draft/published/archived), `plan_family`, `system_message`, `payload_count`, `step_count`, `validation_status` (pass/warn/fail/unknown)

**agchain_benchmark_steps:**
`benchmark_step_id`, `benchmark_version_id`, `step_order`, `step_id`, `display_name`, `step_kind` (model/judge/deterministic_post/aggregation), `api_call_boundary` (own_call/continue_call/non_model), `inject_payloads` (JSONB array), `scoring_mode` (none/deterministic/judge), `output_contract`, `scorer_ref`, `judge_prompt_ref`, `judge_grades_step_ids`, `step_config_jsonb`

**agchain_runs:**
`run_id`, `benchmark_id`, `benchmark_version_id`, `evaluated_model_target_id`, `judge_model_target_id`, `status` (queued/running/completed/failed/cancelled), `submitted_by`, `submitted_at`, `started_at`, `completed_at`, `summary_jsonb`

### Security

- All tables: RLS enabled
- `credential_source_jsonb`: excluded from authenticated user SELECT
- `service_role`: full CRUD
- `anon`: all access revoked
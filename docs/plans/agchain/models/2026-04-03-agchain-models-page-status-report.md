# AGChain Models Page — Status Report

**Date:** 2026-04-03
**Author:** Jon (with Claude analysis)
**Audience:** Team — for handoff, remediation planning, or redesign scoping

---

## Executive Summary

The AGChain Models page was built from two implementation plans (v2 build + compliance remediation). All planned code tasks are complete and tests pass locally. However, the page was built to the wrong product shape. It combines provider credential management with a full model-target curation workbench — creating, editing, health-checking, and inspecting individual model endpoints — on a surface that should only handle provider API key configuration. The model-target management belongs either in a superuser admin surface or inside the benchmark wizard where models are actually selected for use.

This report documents the current implementation state, what the plans specified, what the comparable industry reference (Braintrust) does, what the backend architecture actually supports, and what needs to change.

---

## 1. Current Implementation State

### What the user sees today

The Models page (`/app/agchain/models`) renders a **dual-column layout** (as of today's session):

**Left column — Provider table:**
- One row per supported provider (OpenAI, Anthropic, Google, Azure AI, AWS Bedrock, OpenRouter, Ollama, vLLM, Groq, etc.)
- Columns: Provider name, auth kinds, status badge, target count, last checked, "Configure" button
- Internal Ark UI ScrollArea for the table body

**Right column — Provider inspector (on Configure click):**
- Provider summary card with status badge
- Provider credential panel (connect/disconnect API key with masked suffix display)
- **Full "Curated Model Targets" section** with:
  - List of every model target under that provider (e.g., GPT-4.1, GPT-4.1 Mini, GPT-5.4 Default under OpenAI)
  - Per-target status badges (credential status, health status)
  - Per-target metadata (auth kind, last checked, compatibility)
  - "Refresh Health" button per target
  - "Edit Target" button per target with inline edit form
  - "Add Target" button to create new model targets
  - Recent health check history per target

### What the user should see (based on Braintrust reference and product intent)

**Braintrust's "AI Providers" page** (Settings → AI providers):
- Simple flat list: provider name, env var name, status, last updated
- Click edit → modal popup: "Configure API key" with provider name, key field, "Test key" button, "Save" button
- No model targets, no health checks, no target curation, no inline editing

**What our page should be:**
- Provider list with status
- Click Configure → simple dialog or right-panel with: API key field, test, save/disconnect
- Nothing else on this page

### Files involved in current implementation

| File | Purpose |
|------|---------|
| `web/src/pages/agchain/AgchainModelsPage.tsx` | Page component — dual-column grid layout |
| `web/src/pages/agchain/AgchainModelsPage.test.tsx` | Page tests (12 tests passing) |
| `web/src/components/agchain/models/AgchainModelsTable.tsx` | Left-column provider table |
| `web/src/components/agchain/models/AgchainModelsToolbar.tsx` | Search bar + create-target form fields |
| `web/src/components/agchain/models/AgchainModelInspector.tsx` | Right-column inspector (Sheet overlay, now also exported as inline session) |
| `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx` | Credential connect/disconnect UI |
| `web/src/components/agchain/models/modelTargetDraft.ts` | Draft state helpers for target create/edit forms |
| `web/src/hooks/agchain/useAgchainModels.ts` | Data hook — fetches providers, targets, detail, credentials |
| `web/src/lib/agchainModels.ts` | API client — `fetchAgchainModels()`, types |
| `web/src/lib/agchainModelProviders.ts` | Provider-row derivation from targets + catalog |

---

## 2. Implementation Plans — What Was Specified

### Plan 1: v2 Build Plan (2026-03-31, COMPLETE)

**File:** `docs/plans/__complete/2026-03-31-agchain-models-surface-implementation-plan-v2.md`

**Goal (verbatim):** "Build and complete the AG chain level-1 Models surface as an operational provider-first configuration page... plus inline credential connection so a user can configure a provider, inspect the curated global model targets under it, and verify health **without turning the top-level page into a registry workspace.**"

**What it built (8 tasks, all complete):**

| Task | Description | Status |
|------|-------------|--------|
| v2-1 | Fix model registry domain bugs (detail + health refresh crashes) | Done |
| v2-2 | Restore Models in AGChain nav rail | Done |
| v2-3 | Remove project focus guard, shift to provider-first config | Done |
| v2-4 | Update page test for provider-first shell | Done |
| v2-5 | Add `connect-key` and `disconnect-key` backend endpoints | Done |
| v2-6 | Add backend tests for credential endpoints + decrypt fallback | Done |
| v2-7 | Recast the Models UI into a provider-first configuration surface | Done |
| v2-8 | End-to-end visual verification | Partial — screenshots exist, deployed proof blocked |

**The contradiction:** The plan's goal says "without turning the top-level page into a registry workspace" but Task v2-7 specifies building a full target-aware inspector with create/edit/health-check/refresh per target. The implementer followed the task spec faithfully. The task spec contradicted the goal.

### Plan 2: Compliance Remediation (2026-04-01, ACTIVE)

**File:** `docs/plans/2026-04-01-agchain-models-compliance-remediation-plan.md`

**Goal:** Resolve compliance findings by formalizing the shipped pagination contract, hardening telemetry log fields, and capturing deployed-environment proof.

**What it required (3 tasks):**

| Task | Description | Status |
|------|-------------|--------|
| R1 | Formalize paginated list contract in tests | Done |
| R2 | Add `result="ok"` to connect/disconnect structured logs | Done |
| R3 | Capture deployed telemetry proof + screenshots | **Blocked** |

**R3 blocker:** The deployed Cloud Run service (`blockdata-platform-api` in GCP project `agchain`) returns 404 on connect-key/disconnect-key and 500 on refresh-health. This is a deployment/rollout state issue, not a local code issue. The telemetry proof JSON is empty. The evaluation document reclassifies this as a "deployed-environment / rollout-state blocker."

**Evaluation document:** `docs/jon/todos/edits-required/2026-04-01-agchain-models-implementation-evaluation.md` (verdict: Non-Compliant at 87%, pending deployed proof)

---

## 3. Backend Architecture — What Actually Exists

The backend design is sound. The problem is exclusively in what the frontend exposes where.

### Database schema

**`agchain_model_targets`** — Global catalog of known model endpoints (29 seeded rows)
- `model_target_id`, `label`, `provider_slug`, `model_name`, `qualified_model`
- `auth_kind`, `api_base`, `probe_strategy`, `health_status`
- `supports_evaluated`, `supports_judge`, `capabilities_jsonb`
- Superuser-managed via `service_role` (authenticated users have SELECT only)

**`user_api_keys`** — Per-user provider credentials
- Encrypted API keys stored per provider slug per user
- Written via platform-api `connect-key` endpoint using `APP_SECRET_ENVELOPE_KEY`
- Read by `_load_api_key` with `decrypt_with_fallback`

**`agchain_benchmark_model_targets`** — Benchmark-specific model selection (the binding table)
- Links a `benchmark_version_id` to a `model_target_id` with a `selection_role` (`evaluated` or `judge`)
- This is where a user says "for this benchmark, use GPT-4.1 as the evaluated model"

**`agchain_runs`** — Records which models were used in a specific run
- `evaluated_model_target_id`, `judge_model_target_id`

### Platform API routes (8 total)

| Verb | Path | Purpose |
|------|------|---------|
| GET | `/agchain/models/providers` | List the 15-provider catalog |
| GET | `/agchain/models` | List all model targets (paginated) |
| GET | `/agchain/models/{id}` | Get one target + health history |
| POST | `/agchain/models` | Create a model target (superuser) |
| PATCH | `/agchain/models/{id}` | Update a model target |
| POST | `/agchain/models/{id}/refresh-health` | Run a health probe |
| POST | `/agchain/models/{id}/connect-key` | Save encrypted API key for target's provider |
| DELETE | `/agchain/models/{id}/disconnect-key` | Remove API key for target's provider |

### The correct three-tier architecture

```
Tier 1: Provider Key Management          ← what the Models page should be
  "I have an OpenAI API key"
  → connect-key / disconnect-key
  → provider status (configured / not configured)

Tier 2: Global Model Target Catalog      ← superuser/admin concern
  "GPT-4.1 exists as a model endpoint"
  → CRUD model targets, health probes
  → 29 seeded rows, rarely changed

Tier 3: Benchmark Model Selection        ← benchmark wizard concern
  "For benchmark X, use GPT-4.1 as evaluated, Claude as judge"
  → agchain_benchmark_model_targets binding table
  → selection_role: evaluated | judge
```

The current Models page conflates Tier 1 and Tier 2 onto the same surface. Tier 3 is not yet built (benchmark wizard).

---

## 4. What Needs To Change

### The Models page must be simplified

**Strip down to provider key management only:**
- Provider list: name, status (configured/not configured), last updated
- Configure action: simple panel or modal — API key field, test key, save, disconnect
- No model target listing, no target CRUD, no health checks, no inline editing

**Reference:** Braintrust Settings → AI Providers (screenshot provided to team)

### Model target curation moves elsewhere

The "Curated Model Targets" inspector content belongs in one of two places:
1. **Superuser admin surface** — if target curation is a platform admin task (likely, since authenticated users only have SELECT on `agchain_model_targets`)
2. **Benchmark wizard** — if target selection is a per-benchmark design-time decision (the `agchain_benchmark_model_targets` binding table already exists for this)

Most likely both: superuser creates/manages the global catalog, benchmark wizard lets the user pick from it.

### Benchmark wizard is the missing piece

The `agchain_benchmark_model_targets` table exists but has no frontend surface. When a user creates a benchmark, they need to:
1. Select an evaluated model target (from configured providers only)
2. Optionally select a judge model target
3. See only models where the provider credential is connected

This is the "other space for the user to configure the specific model" — it's where model selection becomes meaningful because it's in the context of actual use.

---

## 5. Today's Session Changes (2026-04-03)

These changes are committed but should be noted as they affect the current Models page shape:

1. **Dual-column layout** — Models and Tools pages now use a CSS Grid two-column layout (left: table, right: inspector inline) instead of a Sheet overlay. Follows the Index Builder / Service Detail page pattern.
2. **Ark UI ScrollArea** — Right columns on both pages use the styled Ark UI scrollbar instead of native browser scroll.
3. **ShellPageHeader** — Renamed from `AgchainShellPageHeader`, wired into app shell header bar with `headerTallHeight` token.
4. **Header title positioning** — Removed the 100px `translateX` offset when page header context is present, so titles sit flush-left with padding after the nav rail.
5. **Tools bootstrapping** — Removed the separate "Loading workspace..." interstitial so Tools starts with the same dual-column layout as Models from first paint.
6. **`.temp/` gitignored**

---

## 6. Deployment Blocker

The deployed Cloud Run service `blockdata-platform-api` (GCP project `agchain`) does not serve the models routes correctly:
- `connect-key` and `disconnect-key` return **404**
- `refresh-health` returns **500**

This blocks the compliance remediation proof (Task R3) and means credential management doesn't work in production. This needs investigation — either the latest code hasn't been deployed, or there's a routing/config issue on Cloud Run.

---

## 7. Recommended Next Steps

1. **Deploy** — Investigate and resolve the Cloud Run 404/500 issue so the models routes work in production.
2. **Simplify the Models page** — Write a plan to strip the page down to provider key management. Remove target CRUD, health checks, and inline editing from this surface.
3. **Superuser target admin** — Decide where the global model target catalog management lives (likely a superuser settings area).
4. **Benchmark wizard** — When building the benchmark creation/editing flow, wire in model target selection from `agchain_benchmark_model_targets`. This is where users pick which model to evaluate and which to judge.
5. **Close compliance** — After deployment fix, re-run the telemetry proof capture and close the remediation plan.

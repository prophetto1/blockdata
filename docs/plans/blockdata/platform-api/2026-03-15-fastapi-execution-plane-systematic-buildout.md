# FastAPI Execution Plane Systematic Buildout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `services/platform-api` the default execution-plane home for new backend capability, keep Supabase Edge Functions focused on control-plane work, and establish workers as the standard for long-running or batch-oriented execution.

**Architecture:** The codebase already has the right shape in pieces: Edge Functions handle Supabase-authenticated CRUD and settings surfaces, `services/platform-api` already hosts the merged Python plugin/runtime layer, and worker-style isolation already exists for conversion. This plan formalizes those boundaries, stops new execution features from defaulting to Edge Functions, and builds the next reusable primitives in FastAPI and worker-backed run orchestration.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), Supabase Postgres + Storage, FastAPI, Python plugin registry, ProcessPoolExecutor, future queue/claim worker model

---

# Current Source-Verified State

This plan is grounded in the current repo, not a hypothetical future state.

## FastAPI already exists as the merged Python surface

- `services/platform-api/app/main.py`
  - Discovers plugins on startup.
  - Mounts API routers for health, conversion, admin services, functions, and plugin execution.
  - Initializes a conversion process pool.
- `services/platform-api/app/api/routes/plugin_execution.py`
  - Authenticated `POST /{function_name}` plugin execution surface already exists.
- `services/platform-api/app/api/routes/functions.py`
  - Lists discovered plugin functions and their parameter schemas.
- `services/platform-api/app/domain/plugins/registry.py`
  - Maps task types to Python plugin handlers.
- `services/platform-api/app/workers/conversion_pool.py`
  - Already provides worker-like isolation for CPU-bound conversion.

## pipeline-worker is no longer the destination

- `services/pipeline-worker/app/main.py`
  - Marked deprecated and explicitly says it has been merged into `services/platform-api/`.

## Edge Functions currently mix true control-plane work with some execution work

### Strong control-plane examples

- `supabase/functions/provider-connections/index.ts`
  - User auth, encrypted credential storage, connection status management.
- `supabase/functions/user-api-keys/index.ts`
  - Encrypted API key storage and defaults management.
- `supabase/functions/admin-config/index.ts`
  - Superuser runtime policy CRUD and audit.
- `supabase/functions/agent-config/index.ts`
  - User agent catalog/config/readiness API.
- `supabase/functions/upload-policy/index.ts`
  - Lightweight runtime policy read surface.
- `supabase/functions/test-api-key/index.ts`
  - Lightweight credential validation against provider HTTP APIs.

### Transitional or execution-heavy examples

- `supabase/functions/worker/index.ts`
  - Performs model prompt packing, LLM calls, and overlay mutation work directly in Edge.
- `supabase/functions/ingest/index.ts`
  - Accepts uploads and already dispatches conversion to a Python service via `CONVERSION_SERVICE_URL`.
- `supabase/functions/trigger-parse/index.ts`
  - Performs setup/orchestration, then dispatches conversion to the Python service via `CONVERSION_SERVICE_URL`.
- `supabase/functions/runs/index.ts`
  - Creates run state and snapshots config, but remains coupled to extraction-era overlay execution.

## Important conclusion

The problem is not that FastAPI is missing. The problem is that the repo has not yet declared FastAPI to be the default owner for new execution-oriented backend work.

---

# Ownership Matrix

This is the organized list the team should build from.

## 1. Permanently Edge-Only Responsibilities

These should remain in Supabase Edge Functions unless a very specific reason appears.

- Authenticated settings and secrets surfaces
  - `provider-connections`
  - `user-api-keys`
  - `test-api-key`
- Admin and policy CRUD close to Supabase
  - `admin-config`
  - `admin-database-browser`
  - `admin-integration-catalog`
- Thin user configuration/readiness surfaces
  - `agent-config`
  - `upload-policy`
  - `parse-profile-readiness`
  - `extract-readiness`
- Simple Supabase-native CRUD endpoints with no heavy Python execution
  - `schemas`
  - lightweight document/config metadata routes

Rule:
- Edge owns auth verification, database-facing CRUD, encrypted secret handling, policy reads/writes, and small validation requests.
- Edge does not become the permanent home for multi-step execution, plugin logic, artifact-heavy processing, or batch data movement.

## 2. Permanently FastAPI-Owned Responsibilities

These should default to `services/platform-api`.

- Python plugin discovery and execution
  - `services/platform-api/app/domain/plugins/registry.py`
  - `services/platform-api/app/api/routes/plugin_execution.py`
  - `services/platform-api/app/api/routes/functions.py`
- Registry-driven execution APIs
  - load
  - parse
  - transform
  - convert
  - export
  - service-run execution
- Python-accessible integration handlers
  - GCS
  - ArangoDB
  - MongoDB
  - future KT-derived integrations translated into Python plugins
- Artifact-producing orchestration
  - storage handoff
  - config snapshot handling
  - execution logs/results
- Backend routes whose core value is executing Python behavior rather than just saving configuration

Rule:
- If a feature needs Python libraries, plugin execution, artifact creation, long HTTP calls, multi-step orchestration, or source-to-destination runtime behavior, it belongs in FastAPI first.

## 3. Worker-Backed Standard Responsibilities

These should not remain synchronous request handlers once they become large, slow, or parallel.

- Long-running conversion
  - already partially established via `app/workers/conversion_pool.py`
- Batch loads
  - many files
  - large CSV/JSONL movement
- Parse and extraction runs
  - item-claim loops
  - retries
  - partial failure handling
- Transform pipelines
  - chained scripts
  - data enrichment
  - expensive Python compute
- User workspaces that may run one or many backend Python scripts in sequence

Rule:
- If work can run for more than a short request/response window, needs batching, needs retries, or should scale independently of HTTP concurrency, it must be worker-backed.

## 4. Transitional Responsibilities That Should Stop Growing in Edge

These may keep working temporarily, but they should not set the future pattern.

- `supabase/functions/worker/index.ts`
  - heavy execution in Edge is the wrong long-term center of gravity
- `supabase/functions/runs/index.ts`
  - acceptable as legacy extraction control-plane, but not the model for new execution families
- `supabase/functions/assistant-chat/index.ts`
  - okay for lightweight chat requests, but not where broader tool-running/workspace execution should accumulate
- `supabase/functions/ingest/index.ts`
  - upload/auth logic can stay; execution depth should continue moving outward to Python services
- `supabase/functions/trigger-parse/index.ts`
  - control-plane setup can stay; deeper parse execution should not move back into Edge

---

# Recommended Buildout Order

## Phase 1: Freeze the boundary decision

Outcome:
- The team has one documented rule for where backend work goes.

What to do:
- Update `docs/fastapi/fastapi-integration.md` so it becomes the canonical boundary statement.
- Add a short “ownership matrix” section to relevant execution plans.
- Add one review checklist line for future plans:
  - “Why is this Edge and not FastAPI?”
  - “If Python execution exists, why is this not worker-backed?”

Success criteria:
- New plans stop proposing Edge Functions as the default home for new execution logic.

## Phase 2: Make FastAPI the default home for new registry execution

Outcome:
- New load/parse/transform execution APIs land in `services/platform-api`, not in Edge.

What to do:
- Keep canonical execution entrypoints in `services/platform-api/app/api/routes/`.
- Continue adding plugin handlers under `services/platform-api/app/plugins/`.
- Treat `services/platform-api/app/domain/plugins/registry.py` as the runtime entry contract.
- Build `load-runs`, future `parse-runs`, and future `transform-runs` in FastAPI first.

Success criteria:
- The next real integration path ships through FastAPI and the service registry, not through a new Edge execution endpoint.

## Phase 3: Standardize worker-backed execution primitives

Outcome:
- Long-running execution stops depending on synchronous HTTP lifetimes.

What to do:
- Reuse the existing “run + item claim” pattern already emerging in planning.
- Establish common primitives for:
  - run creation
  - run items
  - atomic claim
  - retry metadata
  - artifact references
  - result recording
- Keep workers behind the same service registry and run model.

Success criteria:
- Conversion, load, parse, and transform can all share the same run-oriented execution shape.

## Phase 4: Shrink Edge to true control-plane responsibilities

Outcome:
- Edge Functions remain thin, stable, and Supabase-native.

What to do:
- Keep secrets/config/readiness/admin surfaces in Edge.
- Avoid adding new heavy execution logic to `supabase/functions/worker/`-style endpoints.
- Where existing Edge routes dispatch to Python services, keep only setup/auth/dispatch responsibilities there.

Success criteria:
- The Edge layer stops growing in execution complexity even as platform capability grows.

---

# Concrete Decision Rules

Use these rules during planning and review.

## A feature should be Edge-only when all are true

- It is primarily auth, CRUD, policy, readiness, or config management.
- It mostly talks to Supabase or a lightweight external API.
- It does not require Python libraries or plugin discovery.
- It should complete comfortably inside a short request/response cycle.

## A feature should be FastAPI-owned when any are true

- It executes Python plugin logic.
- It depends on Python libraries or Python-native integrations.
- It creates artifacts in storage.
- It orchestrates source-to-destination work.
- It belongs to load, parse, transform, convert, export, or multi-tool execution.

## A feature must become worker-backed when any are true

- It can run long enough to threaten request timeouts.
- It benefits from retries or resumption.
- It processes many items or large files.
- It needs parallelism or independent scaling.
- Users may chain multiple scripts/functions together.

---

# Implementation Plan

### Task 1: Publish the ownership boundary as the architectural rule

**Files:**
- Modify: `docs/fastapi/fastapi-integration.md`
- Modify: `docs/plans/2026-03-15-load-activation.md`
- Modify: `docs/plans/2026-03-15-load-activation-plan-set.md`

**Step 1: Add a permanent ownership matrix to `docs/fastapi/fastapi-integration.md`**

Document:
- Edge-only responsibilities
- FastAPI-owned responsibilities
- worker-backed standard responsibilities
- transitional Edge surfaces that should stop growing

**Step 2: Add one “execution placement” section to active implementation plans**

Every execution-oriented plan should state:
- why the entrypoint is FastAPI
- whether the work is synchronous or worker-backed
- what, if anything, remains in Edge

**Step 3: Verify**

Read the updated docs and confirm no plan proposes new heavy execution in Edge by default.

**Step 4: Commit**

```bash
git add docs/fastapi/fastapi-integration.md docs/plans/2026-03-15-load-activation.md docs/plans/2026-03-15-load-activation-plan-set.md
git commit -m "docs: define edge fastapi and worker ownership boundaries"
```

### Task 2: Make FastAPI the default registry execution surface

**Files:**
- Modify: `services/platform-api/app/main.py`
- Create: `services/platform-api/app/api/routes/load_runs.py`
- Create: `services/platform-api/app/api/routes/parse_runs.py`
- Create: `services/platform-api/app/api/routes/transform_runs.py`
- Modify: `services/platform-api/app/api/routes/functions.py`
- Modify: `services/platform-api/app/domain/plugins/registry.py`

**Step 1: Define canonical execution route families**

Use `services/platform-api/app/api/routes/` for:
- load runs
- parse runs
- transform runs

Do not create new Edge endpoints for these execution families.

**Step 2: Keep registry resolution and execution centered in FastAPI**

Use:
- registry lookups
- plugin resolution
- execution context
- artifact handoff
- run tracking

from the FastAPI side only.

**Step 3: Verify**

Confirm the next implementation plan for execution work targets `services/platform-api/app/api/routes/` and `services/platform-api/app/plugins/` first.

**Step 4: Commit**

```bash
git add services/platform-api/app/main.py services/platform-api/app/api/routes services/platform-api/app/domain/plugins
git commit -m "feat: make platform api the default execution surface"
```

### Task 3: Standardize worker-backed run execution

**Files:**
- Modify: `services/platform-api/app/workers/conversion_pool.py`
- Create: `services/platform-api/app/workers/run_worker.py`
- Create: `services/platform-api/app/domain/runs/`
- Modify: `supabase/migrations/*service_run*`

**Step 1: Define reusable run primitives**

Standardize:
- parent run
- child items
- atomic claim
- retries
- partial failure
- artifact references
- final status aggregation

**Step 2: Reuse one pattern across execution families**

Apply the same shape to:
- load
- parse
- transform
- future multi-script workspace execution

**Step 3: Verify**

Run-oriented execution no longer depends on a single synchronous request to finish all work.

**Step 4: Commit**

```bash
git add services/platform-api/app/workers services/platform-api/app/domain/runs supabase/migrations
git commit -m "feat: add reusable worker-backed run execution primitives"
```

### Task 4: Stop new execution growth in Edge Functions

**Files:**
- Review: `supabase/functions/worker/index.ts`
- Review: `supabase/functions/runs/index.ts`
- Review: `supabase/functions/assistant-chat/index.ts`
- Review: `supabase/functions/ingest/index.ts`
- Review: `supabase/functions/trigger-parse/index.ts`

**Step 1: Mark each execution-heavy Edge function as one of**

- keep as control-plane only
- keep temporarily but do not expand
- migrate deeper execution to FastAPI
- replace with worker-backed path

**Step 2: Add a short migration note to relevant docs**

Document whether each endpoint is:
- permanent Edge
- transitional Edge
- scheduled for replacement

**Step 3: Verify**

No new implementation plan should model `supabase/functions/worker/index.ts` as the pattern for future backend execution.

**Step 4: Commit**

```bash
git add docs/fastapi docs/plans
git commit -m "docs: classify transitional edge execution surfaces"
```

---

# Acceptance Criteria

- The team has a documented, source-verified ownership map for Edge, FastAPI, and workers.
- New execution-oriented plans default to `services/platform-api`, not Supabase Edge Functions.
- Long-running and batch-oriented execution is explicitly designed as worker-backed.
- Edge Functions are treated as control-plane surfaces, not the long-term execution destination.
- The next integration/runtime work can be reviewed against a stable placement rule instead of re-litigating architecture each time.

---

# Notes for Later Workspace Scale

When the platform exposes hundreds of backend Python tools to users, that environment should build on:

- service/function registry as the source of truth
- FastAPI as the API and plugin bridge
- workers as the actual execution engine
- run/item/artifact tracking as the common contract

It should not be modeled as hundreds of independent Edge Functions.

# Operational Readiness Dev Platform API Recovery Implementation Plan

**Goal:** Eliminate avoidable local-development downtime on the superuser `Operational Readiness` page by adding a dev-only page-triggered recovery path that can inspect launch hygiene, restart `platform-api` through the approved repo bootstrap path, and re-verify the page automatically.

**Architecture:** Keep `services/platform-api` as the backend-owned readiness control plane and leave its runtime snapshot contract untouched. Add a separate dev-only local recovery seam behind the existing Vite dev server so the browser can inspect and recover the local `platform-api` process without turning the page into a generic command runner. Create a new `web/dev-server/` directory for the extracted helper module, and have `web/vite.config.ts` compose a second imported plugin alongside the existing inline `superuserToolsPlugin()`. Reuse `scripts/start-platform-api.ps1` as the only approved bootstrap path, add explicit managed-state markers under `.codex-tmp/`, and keep local workstation recovery separate from backend-owned readiness actions.

**Tech Stack:** PowerShell, Vite dev-server middleware, React + TypeScript, Vitest, pytest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-31

## Manifest

### Platform API

No `platform-api` routes are added or modified in this plan.

The page and the dev-only recovery helper consume these existing endpoints as-is:

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/health` | Confirm that `platform-api` is reachable after restart | Existing - no contract change |
| GET | `/health/ready` | Confirm post-start readiness and conversion-pool state | Existing - no contract change |
| GET | `/admin/runtime/readiness?surface=all` | Load the backend-owned readiness snapshot after bootstrap passes | Existing - no contract change |

#### Existing endpoint contracts consumed as-is

`GET /health`

- Auth: none
- Request: no body
- Response: existing `{ "status": "ok", "functions": <number> }`
- Touches: in-process FastAPI health route only

`GET /health/ready`

- Auth: none
- Request: no body
- Response: existing `{ "status": "ready" | "saturated", "conversion_pool": { ... } }`
- Touches: `app.workers.conversion_pool.get_conversion_pool()`

`GET /admin/runtime/readiness?surface=all`

- Auth: existing `require_superuser`
- Request: query param `surface=all`
- Response: existing runtime readiness snapshot
- Touches: `app.services.runtime_readiness.get_runtime_readiness_snapshot()`

### Local Dev Recovery Helper

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/__admin/platform-api/status` | Read local launch-hygiene status for the current workstation | New dev-only helper route |
| POST | `/__admin/platform-api/recover` | Stop the stale listener on the local dev port, relaunch `platform-api` via the approved bootstrap path, wait for health/readiness, and return structured recovery results | New dev-only helper route |

#### New helper endpoint contracts

`GET /__admin/platform-api/status`

- Auth: local-only request guard inside the Vite dev server; no bearer-token path; available only during local web dev
- Request: no body
- Response: JSON object with:
  - `available_action`: fixed string `recover_platform_api`
  - `port`: `8000`
  - `listener`: `{ running, pid, started_at, command_line, source }`
  - `launch_hygiene`: `{ approved_bootstrap, provenance_basis, env_loaded, repo_root_match, state_file_present, state_path, state_written_at }`
  - `last_probe`: `{ health_ok, ready_ok, detail }`
  - `result`: `ok | warn | fail | unknown`
- Touches: local PowerShell control script, `.codex-tmp/platform-api-dev/state.json`, local process inspection only

`POST /__admin/platform-api/recover`

- Auth: same local-only request guard as the status route
- Request: no body
- Response: JSON object with:
  - `ok`
  - `result`: `ok | fail`
  - `action`: `recover_platform_api`
  - `listener_before`
  - `listener_after`
  - `steps`: ordered step results for inspect, stop, start, `/health`, and `/health/ready`
  - `health_status_code`
  - `ready_status_code`
  - `failure_reason`
  - `state`: refreshed launch-hygiene status
- Touches: local PowerShell control script, `scripts/start-platform-api.ps1`, local process inspection, local HTTP checks against `http://127.0.0.1:8000`

### Observability

No new `platform-api` OpenTelemetry spans, metrics, or structured logs are added in this plan because the recovery seam is intentionally outside `services/platform-api`.

Dev-only local recovery observability added in the Vite helper / PowerShell seam:

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Structured log | `dev.platform_api.status` | `web/dev-server/platformApiDevControl.ts` status handler | Show the derived launch-hygiene state when the page asks for local recovery details |
| Structured log | `dev.platform_api.recover.request` | `web/dev-server/platformApiDevControl.ts` recover handler | Record the operator-triggered recovery request and pre-recovery listener facts |
| Structured log | `dev.platform_api.recover.result` | `web/dev-server/platformApiDevControl.ts` recover handler | Record success/failure, step-level outcomes, and wait duration |
| Structured log | `dev.platform_api.bootstrap.state_write` | `scripts/start-platform-api.ps1` | Record managed-state writes for approved bootstrap launches |

Observability attribute rules:

- Allowed attributes: `action`, `result`, `port`, `pid`, `listener.running`, `listener.source`, `approved_bootstrap`, `env_loaded`, `repo_root_match`, `state_file_present`, `health_status_code`, `ready_status_code`, `duration_ms`, `failure_reason`
- Forbidden in logs or helper responses: raw `.env` contents, `PLATFORM_API_M2M_TOKEN`, Supabase access tokens, JWTs, full secret values, full OTLP header values

### Database Migrations

No database migrations are created or modified.

This feature is local dev tooling only and must not add tables, rows, RPCs, or migration state.

### Edge Functions

No edge functions are created or modified.

This implementation stays out of Supabase edge functions and out of `platform-api` route expansion. If an edge-function path ever appears preferable, stop and confirm with the user first.

### Frontend Surface Area

**New pages:** `0`

**New components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `OperationalReadinessLocalRecoveryPanel` | `web/src/components/superuser/OperationalReadinessLocalRecoveryPanel.tsx` | `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` |

**New hooks:** `1`

| Hook | File | Used by |
|------|------|---------|
| `usePlatformApiDevRecovery` | `web/src/hooks/usePlatformApiDevRecovery.ts` | `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` |

**New libraries/services:** `1`

| Library | File | Used by |
|---------|------|---------|
| `platformApiDevRecovery` | `web/src/lib/platformApiDevRecovery.ts` | `usePlatformApiDevRecovery.ts` |

**New supporting frontend/dev-server files:** `1`

Create a new `web/dev-server/` directory for extracted Vite-local helper code and tests.

| File | Role |
|------|------|
| `web/dev-server/platformApiDevControl.ts` | Own the fixed local helper routes and PowerShell invocation boundary used by the Vite dev server |

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `SuperuserOperationalReadiness` | `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` | Render the dev-only local recovery panel as a separate operator surface without changing backend snapshot ownership |

**Modified components:** `0`

**Modified hooks:** `0`

**Modified libraries/services:** `0`

**Modified supporting frontend/dev-server files:** `1`

| File | What changes |
|------|--------------|
| `web/vite.config.ts` | Register the fixed local helper routes through the existing dev-server plugin path |

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The mounted UI target remains `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`; no new top-level route is introduced.
2. `GET /admin/runtime/readiness?surface=all` remains the backend system of record for runtime readiness. The new work must not add a second backend readiness API or alter the existing snapshot payload.
3. Local workstation recovery is a separate dev-only seam and must not be represented as a backend `available_actions` item inside the runtime snapshot.
4. The only approved restart path remains `scripts/start-platform-api.ps1` through repo-owned invocation. The recovery flow must not reconstruct a plain `uvicorn` command or add a generic process runner.
5. Launch hygiene is proven by a combination of live listener inspection plus repo-owned managed state written under `.codex-tmp/`. If provenance cannot be proven, the UI must say `unknown` rather than guessing.
6. No database, edge-function, or Cloud Run behavior is changed in this tranche.
7. Create a new `web/dev-server/` directory and import a second `platformApiDevControlPlugin()` from there; do not keep the recovery helper logic inline inside the existing `superuserToolsPlugin()` body.
8. `platform-api:recover` is a CLI convenience alias for the same fixed PowerShell recovery script used by the Vite helper. The page never shells through `package.json`; it calls the fixed local helper routes only.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A stale, missing, or mis-launched local `platform-api` on port `8000` causes the `Operational Readiness` page to show a dev-only launch-hygiene panel without masking the existing bootstrap diagnosis.
2. The launch-hygiene panel shows at least: running/not running, PID, port, boot time when available, approved-bootstrap status, env-loaded status, repo-root match, and the fixed recover action.
3. Clicking `Recover platform-api` from the page stops the stale listener when present, relaunches via `scripts/start-platform-api.ps1`, waits for `GET /health` and `GET /health/ready`, and returns structured success/failure details.
4. After a successful recovery, the page automatically refreshes operational-readiness data and loads the backend snapshot without the operator manually switching terminals.
5. If recovery succeeds but the browser still lacks valid superuser auth, the page continues to show the correct auth diagnosis instead of pretending recovery solved authorization.
6. If recovery fails, the panel exposes the failing step and last known local status rather than a generic `500` or `Failed to fetch`.

### Locked Platform API Surface

#### New `platform-api` endpoints: `0`

No new FastAPI routes are added.

#### Existing `platform-api` endpoints reused as-is: `3`

1. `GET /health`
2. `GET /health/ready`
3. `GET /admin/runtime/readiness?surface=all`

### Locked Local Recovery Helper Surface

#### New dev-only helper endpoints: `2`

1. `GET /__admin/platform-api/status`
2. `POST /__admin/platform-api/recover`

#### Local helper constraints

1. Both routes live behind the local Vite dev server only.
2. Both routes are fixed-purpose and may invoke only the repo-owned `scripts/platform-api-dev-control.ps1`.
3. Neither route accepts arbitrary command text, arbitrary script paths, or shell fragments.
4. Both routes must reject non-local requests and unsupported HTTP methods with explicit JSON errors.
5. `web/vite.config.ts` composes the imported `platformApiDevControlPlugin()` alongside the existing `superuserToolsPlugin()` instead of mutating the existing inline handler body.

### Locked Observability Surface

#### New `platform-api` traces: `0`

#### New `platform-api` metrics: `0`

#### New dev-only structured logs: `4`

1. `dev.platform_api.status`
2. `dev.platform_api.recover.request`
3. `dev.platform_api.recover.result`
4. `dev.platform_api.bootstrap.state_write`

### Locked Inventory Counts

#### Database

- New migrations: `0`
- Modified existing migrations: `0`

#### Platform API

- New route modules: `0`
- Modified route modules: `0`

#### Scripts / local control

- New scripts: `1`
- Modified existing scripts: `1`
- Modified root package files: `1`

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `1`
- New visual components: `1`
- New hooks: `1`
- New client/service modules: `1`
- New dev-server helper modules: `1`
- Modified existing frontend config files: `1`

#### Tests

- New test modules: `5`
- Modified existing test modules: `1`

### Locked File Inventory

#### New files

- `scripts/platform-api-dev-control.ps1`
- `web/dev-server/platformApiDevControl.ts`
- `web/dev-server/platformApiDevControl.test.ts`
- `web/src/lib/platformApiDevRecovery.ts`
- `web/src/lib/platformApiDevRecovery.test.ts`
- `web/src/hooks/usePlatformApiDevRecovery.ts`
- `web/src/hooks/usePlatformApiDevRecovery.test.tsx`
- `web/src/components/superuser/OperationalReadinessLocalRecoveryPanel.tsx`
- `web/src/components/superuser/OperationalReadinessLocalRecoveryPanel.test.tsx`
- `services/platform-api/tests/test_dev_bootstrap_contract.py`

#### Modified files

- `package.json`
- `scripts/start-platform-api.ps1`
- `web/vite.config.ts`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

## Frozen Dev Recovery Seam Contract

The `Operational Readiness` page already has a deliberate split:

- frontend-owned bootstrap diagnosis before snapshot load
- backend-owned runtime readiness snapshot after bootstrap succeeds

This plan preserves that split.

The dev-only recovery seam must remain outside the backend snapshot contract. Do not implement local recovery by:

- inventing a new FastAPI admin route
- stuffing local recovery into backend `available_actions`
- letting the browser send arbitrary shell text
- treating a plain `uvicorn` launch as equivalent to the approved bootstrap path

The only approved launch provenance is the repo-owned `scripts/start-platform-api.ps1` path. Managed state under `.codex-tmp/platform-api-dev/state.json` is advisory metadata, not proof by itself.

The helper must use this conservative provenance sequence:

1. Read the managed state file and record its `state_written_at`, `repo_root`, `port`, and launch metadata.
2. Inspect the live listener on port `8000` and capture PID, command line, and process start time when Windows exposes them.
3. Mark `approved_bootstrap=true` only when the state file exists and the live listener facts still match the expected app/port plus a reasonable start-time window.
4. Mark `provenance_basis=state_plus_listener_match` when step 3 succeeds.
5. Mark `approved_bootstrap=unknown` and `provenance_basis=state_only` or `unknown` when the helper sees only advisory state or cannot prove the live listener lineage safely.

Under `uvicorn --reload`, operators should expect `approved_bootstrap=unknown` to appear frequently even on healthy runs. That is acceptable for dev-only v1 and is safer than over-claiming provenance.

## Explicit Risks Accepted In This Plan

1. Because `scripts/start-platform-api.ps1` uses `uvicorn --reload`, the listening PID may be a child process rather than the original launcher. Operators should expect `approved_bootstrap: unknown` to appear frequently under healthy reload-driven runs when provenance cannot be proven safely.
2. The recovery helper is intentionally Windows / PowerShell oriented because that is the active local-dev workflow in this repo. Cross-platform generalization is out of scope for this tranche.
3. Successful local process recovery does not guarantee successful readiness snapshot load if the operator is not authenticated as a superuser or if backend code still fails after startup.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked `platform-api` surface remains exactly three reused endpoints and zero new FastAPI routes.
2. The locked local helper surface exists exactly as specified with fixed-purpose `status` and `recover` routes.
3. The inventory counts in this plan match the actual created and modified files.
4. The page can recover a stale or missing local `platform-api` listener directly from the UI without manual terminal intervention.
5. The page still surfaces correct auth failures and backend snapshot failures after recovery instead of collapsing them into false success.

## Tasks

Use `test-driven-development` for each code task and `verification-before-completion` before any success claim.

## Task 1: Lock The Approved Bootstrap Marker Contract

**File(s):** `services/platform-api/tests/test_dev_bootstrap_contract.py`, `scripts/start-platform-api.ps1`, `package.json`

**Step 1:** Add failing pytest assertions in a new `services/platform-api/tests/test_dev_bootstrap_contract.py` module that `scripts/start-platform-api.ps1` writes managed-state metadata under `.codex-tmp/` and that the root package exposes a fixed `platform-api:recover` script.
**Step 2:** Update `scripts/start-platform-api.ps1` to write the managed-state JSON before invoking `uvicorn`, and add `platform-api:recover` to `package.json`.
**Step 3:** Re-run the pytest module until all selected tests pass.

**Test command:** `cd services/platform-api && pytest -q tests/test_dev_bootstrap_contract.py`
**Expected output:** `pytest` reports the selected startup-script tests pass with `0 failed`.

**Commit:** `feat: mark approved platform-api dev bootstrap launches`

## Task 2: Add The Fixed PowerShell Status And Recovery Script

**File(s):** `services/platform-api/tests/test_dev_bootstrap_contract.py`, `scripts/platform-api-dev-control.ps1`

**Step 1:** Add failing pytest assertions in `services/platform-api/tests/test_dev_bootstrap_contract.py` that a dedicated `scripts/platform-api-dev-control.ps1` exists, supports fixed `status` and `recover` actions, and reuses `scripts/start-platform-api.ps1` rather than shelling out to a generic command string.
**Step 2:** Implement `scripts/platform-api-dev-control.ps1` with local process inspection, stale-listener stop logic, approved bootstrap relaunch, `/health` and `/health/ready` polling, and structured JSON output for both actions.
**Step 3:** Re-run the pytest module until the script-contract assertions pass.

**Test command:** `cd services/platform-api && pytest -q tests/test_dev_bootstrap_contract.py`
**Expected output:** `pytest` reports the selected startup-script tests pass with `0 failed`.

**Commit:** `feat: add fixed platform-api dev control script`

## Task 3: Add The Vite-Local Helper Boundary

**File(s):** `web/dev-server/platformApiDevControl.test.ts`, `web/dev-server/platformApiDevControl.ts`, `web/vite.config.ts`

**Step 1:** Write failing Vitest coverage for local-only request gating, fixed `GET /__admin/platform-api/status` and `POST /__admin/platform-api/recover` route handling, method rejection, and PowerShell invocation contract.
**Step 2:** Implement `web/dev-server/platformApiDevControl.ts` and wire it into `web/vite.config.ts` without introducing arbitrary command execution or a second backend dependency.
**Step 3:** Re-run the targeted Vitest module until all helper-boundary tests pass.

**Test command:** `cd web && npm run test -- dev-server/platformApiDevControl.test.ts`
**Expected output:** `vitest` reports the selected dev-server helper test passes with `0 failed`.

**Commit:** `feat: expose local platform-api recovery helper routes`

## Task 4: Add The Client Recovery Service And Hook

**File(s):** `web/src/lib/platformApiDevRecovery.test.ts`, `web/src/lib/platformApiDevRecovery.ts`, `web/src/hooks/usePlatformApiDevRecovery.test.tsx`, `web/src/hooks/usePlatformApiDevRecovery.ts`

**Step 1:** Write failing Vitest coverage for status fetch, recover fetch, structured error handling, in-flight recovery state, and automatic page refresh callback after successful recovery.
**Step 2:** Implement the client library and hook with fixed route calls to `/__admin/platform-api/status` and `/__admin/platform-api/recover`.
**Step 3:** Re-run the targeted Vitest modules until they pass cleanly.

**Test command:** `cd web && npm run test -- src/lib/platformApiDevRecovery.test.ts src/hooks/usePlatformApiDevRecovery.test.tsx`
**Expected output:** `vitest` reports both targeted recovery client tests pass with `0 failed`.

**Commit:** `feat: add platform-api dev recovery client state`

## Task 5: Add The Dev-Only Recovery Panel To The Page

**File(s):** `web/src/components/superuser/OperationalReadinessLocalRecoveryPanel.test.tsx`, `web/src/components/superuser/OperationalReadinessLocalRecoveryPanel.tsx`, `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`, `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`

**Step 1:** Write failing Vitest coverage for rendering launch-hygiene fields, hiding the panel outside dev mode, showing the fixed `Recover platform-api` action, and preserving the existing backend bootstrap panel and snapshot rendering.
**Step 2:** Implement the new panel and page wiring so the recovery surface appears as a separate dev-only operator tool rather than a backend snapshot action.
**Step 3:** Re-run the targeted Vitest modules until the UI and page tests pass.

**Test command:** `cd web && npm run test -- src/components/superuser/OperationalReadinessLocalRecoveryPanel.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
**Expected output:** `vitest` reports both targeted superuser readiness UI tests pass with `0 failed`.

**Commit:** `feat: add dev-only platform-api recovery panel`

## Task 6: Verify The End-To-End Local Recovery Flow

**File(s):** `services/platform-api/tests/test_dev_bootstrap_contract.py`, `web/dev-server/platformApiDevControl.test.ts`, `web/src/lib/platformApiDevRecovery.test.ts`, `web/src/hooks/usePlatformApiDevRecovery.test.tsx`, `web/src/components/superuser/OperationalReadinessLocalRecoveryPanel.test.tsx`, `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

**Step 1:** Run the targeted pytest verification for the PowerShell contract.
**Step 2:** Run the full targeted Vitest set for the helper, client, hook, component, and page.
**Step 3:** Start local web dev, reproduce a stale or missing `platform-api` process, click `Recover platform-api` from `/app/superuser/operational-readiness`, and confirm the page auto-refreshes into a successful snapshot or a truthful auth-only diagnosis.

**Test command:** `cd services/platform-api && pytest -q tests/test_dev_bootstrap_contract.py && cd ../../web && npm run test -- dev-server/platformApiDevControl.test.ts src/lib/platformApiDevRecovery.test.ts src/hooks/usePlatformApiDevRecovery.test.tsx src/components/superuser/OperationalReadinessLocalRecoveryPanel.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
**Expected output:** `pytest` and `vitest` both finish with `0 failed`, and the manual browser run shows either a loaded snapshot or an auth-only bootstrap diagnosis after successful recovery.

**Commit:** `test: verify operational readiness dev recovery flow`

## Execution Handoff

1. Plan document path: `docs/plans/2026-03-31-operational-readiness-dev-platform-api-recovery-implementation-plan.md`
2. Read this plan fully before starting implementation.
3. Follow the plan exactly; do not improvise on the locked decisions above.
4. If any locked decision turns out to be wrong, stop and revise the plan before continuing.

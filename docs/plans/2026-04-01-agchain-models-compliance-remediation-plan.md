# AG chain Models Compliance Remediation Plan

**Goal:** Resolve the April 1, 2026 AG chain Models compliance findings without reopening the shipped provider-first product shape: formally reconcile the already-landed paginated `GET /agchain/models` contract, harden telemetry only where needed for reliable queryability, and produce the missing deployed-environment proof and visual artifact evidence.

**Architecture:** Preserve the current provider-first `/app/agchain/models` surface, the existing 8-route `platform-api` surface, and the model-target-aware backend. This remediation adopts the shipped paginated list contract instead of removing it, because the product and frontend already depend on it. No new endpoints, migrations, or UI layers are introduced. Telemetry remediation is limited to the existing OpenTelemetry/logging surface for `connect-key`, `disconnect-key`, and `refresh-health`: keep names frozen, add the minimal safe queryability hardening required for deployed proof, and close the deployed-pipeline proof gap with explicit evidence capture.

**Tech Stack:** FastAPI, React + TypeScript, existing `platformApiFetch`, OpenTelemetry, Cloud Run logging, pytest, Vitest, Playwright screenshot artifacts.

**Plan Type:** Compliance remediation / contract reconciliation.
**Status:** Draft for approval.
**Date:** 2026-04-01
**Amends:** [2026-03-31-agchain-models-surface-implementation-plan-v2.md](E:/writing-system/docs/plans/2026-03-31-agchain-models-surface-implementation-plan-v2.md)

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/models` | List AG chain model targets | Existing - formalize shipped pagination contract |
| POST | `/agchain/models/{model_target_id}/connect-key` | Connect provider-scoped API key | Existing - telemetry hardening/proof only |
| DELETE | `/agchain/models/{model_target_id}/disconnect-key` | Disconnect provider-scoped API key | Existing - telemetry hardening/proof only |
| POST | `/agchain/models/{model_target_id}/refresh-health` | Run lightweight readiness probe | Existing - proof only |

#### Modified endpoint contract

`GET /agchain/models`

- Auth: `require_user_auth`
- Query params:
  - existing optional filters remain unchanged
  - `limit` integer, default `50`, minimum `1`
  - `offset` integer, default `0`, minimum `0`
- Response shape:
  - `items: []`
  - `total: number`
  - `limit: number`
  - `offset: number`
- Constraint:
  - item shape remains unchanged from the March 31 plan, including requester-scoped nullable `key_suffix`
  - no new list-query params beyond `limit` and `offset`

### Observability

No new telemetry names are introduced in this remediation.

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `agchain.models.connect_key` | `services/platform-api/app/api/routes/agchain_models.py:connect_model_key_route` | Preserve proof that provider-key connection remains instrumented in owned runtime code |
| Trace span | `agchain.models.disconnect_key` | `services/platform-api/app/api/routes/agchain_models.py:disconnect_model_key_route` | Preserve proof that provider-key disconnect remains instrumented in owned runtime code |
| Trace span | `agchain.models.refresh_health` | `services/platform-api/app/api/routes/agchain_models.py:refresh_model_health` | Preserve proof that readiness refresh remains instrumented in owned runtime code |
| Structured log | `agchain.models.key_connected` | `services/platform-api/app/api/routes/agchain_models.py:connect_model_key_route` | Deployed-environment queryable audit event for successful connect-key |
| Structured log | `agchain.models.key_disconnected` | `services/platform-api/app/api/routes/agchain_models.py:disconnect_model_key_route` | Deployed-environment queryable audit event for successful disconnect-key |
| Structured log | `agchain.models.health_refreshed` | `services/platform-api/app/api/routes/agchain_models.py:refresh_model_health` | Deployed-environment queryable audit event for successful refresh-health |

Allowed hardening in this remediation:

- Add `result: "ok"` to `agchain.models.key_connected`
- Add `result: "ok"` to `agchain.models.key_disconnected`
- Preserve existing safe query fields already emitted by `agchain.models.health_refreshed`, including `health_status`, `probe_strategy`, and `result`
- Do not rename telemetry
- Do not add secret-bearing attributes

Allowed structured-log proof fields:

- `message`
- `provider_slug`
- `result`
- `health_status`
- `probe_strategy`
- `model_target_id`

Forbidden in proof artifacts:

- raw API keys
- `Authorization` headers
- encrypted credential payloads
- provider response bodies
- copied `subject_id` values from superuser-only refresh logs

Proof requirement:

- Completion requires runtime observation of the three locked route events through the target environment's existing pipeline, not only local managed logs.
- The target environment for this remediation is the Cloud Run service `blockdata-platform-api` in GCP project `agchain`.
- The deployed proof artifact is a JSON log capture written to `output/playwright/agchain-models-telemetry-proof.json`.

### Database Migrations

No database migrations created or modified.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

This remediation does not change the top-level Models UX contract.

Expected frontend changes are test/documentation only:

- Modified existing test modules: `1`
  - `web/src/pages/agchain/AgchainModelsPage.test.tsx`

## Pre-Implementation Contract

No new Models product behavior may be introduced during this remediation. The only allowed scope is:

1. formalize the shipped pagination contract,
2. harden the existing telemetry for queryability,
3. capture the missing deployed-environment telemetry and visual evidence.

## Locked Product Decisions

1. `/app/agchain/models` remains a provider-first configuration surface.
2. The right-side provider configure/detail panel remains the only deeper target-aware surface on this page.
3. The backend remains model-target-aware; this remediation does not introduce provider-summary endpoints.
4. Pagination is allowed only on `GET /agchain/models` in this phase.
5. No new telemetry names are allowed in this remediation.
6. The visual verification artifact for this remediation is an explicit PNG screenshot under `output/playwright/`.

## Locked Acceptance Contract

This remediation is complete only when all of the following are true:

1. The approved contract for `GET /agchain/models` explicitly includes `limit`, `offset`, `total`, `limit`, and `offset`.
2. The frontend and tests consume that contract intentionally rather than as undeclared drift.
3. The provider-first Models page still behaves exactly as previously verified.
4. An explicit screenshot artifact exists under `output/playwright/` for the provider-first Models flow.
5. The target environment shows queryable proof for:
   - `agchain.models.connect_key`
   - `agchain.models.disconnect_key`
   - `agchain.models.health_refreshed`
6. The proof path confirms no raw API keys, encrypted blobs, auth headers, or provider response bodies appear in the emitted logs/traces.

## Locked Platform API Surface

### Existing platform API endpoints reused: `8`

1. `GET /agchain/models/providers`
2. `GET /agchain/models`
3. `GET /agchain/models/{model_target_id}`
4. `POST /agchain/models`
5. `PATCH /agchain/models/{model_target_id}`
6. `POST /agchain/models/{model_target_id}/refresh-health`
7. `POST /agchain/models/{model_target_id}/connect-key`
8. `DELETE /agchain/models/{model_target_id}/disconnect-key`

### Contract change in this remediation: `1`

1. `GET /agchain/models` is formally paginated as declared above.

## Locked Observability Surface

### Traces reused as-is: `3`

1. `agchain.models.connect_key`
2. `agchain.models.disconnect_key`
3. `agchain.models.refresh_health`

### Structured logs reused as-is: `3`

1. `agchain.models.key_connected`
2. `agchain.models.key_disconnected`
3. `agchain.models.health_refreshed`

### Structured-log hardening required: `2`

1. `agchain.models.key_connected` must include `result="ok"`
2. `agchain.models.key_disconnected` must include `result="ok"`

### Deployed proof target

- Service: `blockdata-platform-api`
- GCP project: `agchain`
- Proof artifact: `output/playwright/agchain-models-telemetry-proof.json`

### Expected proof record structure

- at least one `agchain.models.key_connected` record with `provider_slug`, `model_target_id`, and `result`
- at least one `agchain.models.key_disconnected` record with `provider_slug`, `model_target_id`, and `result`
- at least one `agchain.models.health_refreshed` record with `model_target_id`, `health_status`, `probe_strategy`, and `result`
- no raw secrets in any captured record

## Frozen Seam Contract

The following seams are frozen for this remediation and must not drift:

1. `/app/agchain/models` remains the shipped provider-first configuration page and does not revert to a target-registry workspace.
2. The right-side provider configure/detail panel remains the only deeper target-aware surface on this page.
3. The existing 8-route `platform-api` Models surface remains intact; this remediation only amends the `GET /agchain/models` contract and existing log payload fields.
4. The backend remains model-target-aware. No provider-summary endpoint, new migration, edge-function change, or benchmark/workspace behavior change is allowed in this remediation.
5. Pagination is frozen to `GET /agchain/models` only, with `limit` and `offset` as the only newly accepted list-contract additions.
6. The target-environment telemetry proof seam is Cloud Run logging for `blockdata-platform-api` in project `agchain`; this remediation does not reconfigure exporters or deploy a new observability backend.

## Explicit Risks Accepted In This Plan

1. This remediation adopts the shipped paginated list contract rather than reverting it. That improves compliance with reality, but it means the original `pagination deferred` decision is superseded by explicit amendment instead of preserved.
2. Target-environment telemetry proof depends on access to Cloud Run logs for `blockdata-platform-api` in project `agchain`. If access, retention, or deployment state blocks proof capture, the remediation may close only with an explicit environment blocker documented in the updated evaluation record.
3. The proof artifact is based on deployed structured-log evidence because that is the queryable pipeline already referenced by the April 1 evaluation. This remediation preserves the existing trace instrumentation but does not add a new deployed trace-query workflow.
4. The updated evaluation document remains the primary remediation record instead of a separate narrative report. Provenance must stay explicit about command, environment, and timestamp so later reviewers can distinguish original findings from remediation evidence.

## Locked Inventory Counts

### Database

- New migrations: `0`
- Modified existing migrations: `0`

### Backend

- Modified existing route modules: `1`
- Modified existing backend test modules: `1`

### Frontend

- Modified libs/services: `0`
- Modified existing frontend test modules: `1`
- Modified pages/components/hooks: `0`

### Docs / Evidence

- New remediation plan files: `1`
- Modified evaluation/proof artifacts: `1`
- Required evidence artifacts: `2`

## Locked File Inventory

### Modified files

- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/tests/test_agchain_models.py`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`
- `docs/edits-required/2026-04-01-agchain-models-implementation-evaluation.md`

### Required evidence artifacts

- `output/playwright/agchain-models-*.png`
- `output/playwright/agchain-models-telemetry-proof.json`

## Tasks

### Task R1: Formalize the paginated list contract

**Files:**

- `web/src/pages/agchain/AgchainModelsPage.test.tsx`
- `docs/edits-required/2026-04-01-agchain-models-implementation-evaluation.md`

**Step 1:** Verify the shipped frontend already consumes `limit`, `offset`, `total`, `limit`, and `offset`.

**Step 2:** Keep the existing runtime implementation and update the remediation record so pagination is intentional rather than undeclared.

**Step 3:** Update the page test wording/assertions so the paginated contract is asserted intentionally.

**Test command:**

```bash
cd web && npx vitest run src/pages/agchain/AgchainModelsPage.test.tsx
```

**Expected output:** the page test passes while explicitly accepting the paginated list contract.

**Commit:** `docs(agchain): formalize paginated models list contract`

### Task R2: Harden structured-log queryability for deployed proof

**Files:**

- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/tests/test_agchain_models.py`

**Step 1:** Add `result: "ok"` to `agchain.models.key_connected` and `agchain.models.key_disconnected` so deployed Cloud Run log queries can discriminate successful route events without inferring success from context.

**Step 2:** Preserve existing safe fields already emitted by `agchain.models.health_refreshed`; do not rename any trace or log event.

**Step 3:** Add or update backend tests so the structured log payload stays queryable and secret-safe.

**Test command:**

```bash
cd services/platform-api && python -m pytest tests/test_agchain_models.py -q
```

**Expected output:** the AG chain models backend suite passes, the locked telemetry names remain unchanged, and connect/disconnect structured logs now include `result`.

**Commit:** `fix(agchain): harden models telemetry proof fields`

### Task R3: Capture deployed proof and close the evidence gap

**Files:**

- `docs/edits-required/2026-04-01-agchain-models-implementation-evaluation.md`

**Step 1:** Re-run the provider-first Models flow in a valid environment and save an explicit PNG screenshot under `output/playwright/`.

**Step 2:** Exercise `connect-key`, `disconnect-key`, and `refresh-health` against the Cloud Run service `blockdata-platform-api` in GCP project `agchain`.

**Step 3:** Capture deployed proof with:

```bash
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"blockdata-platform-api\" AND (jsonPayload.message=\"agchain.models.key_connected\" OR jsonPayload.message=\"agchain.models.key_disconnected\" OR jsonPayload.message=\"agchain.models.health_refreshed\" OR textPayload:\"agchain.models.key_connected\" OR textPayload:\"agchain.models.key_disconnected\" OR textPayload:\"agchain.models.health_refreshed\")" --project=agchain --freshness=1d --limit=50 --format=json > output/playwright/agchain-models-telemetry-proof.json
```

**Step 4:** Verify the JSON capture contains one record for each locked event with the expected safe fields and no forbidden fields.

**Step 5:** Record the exact proof outcome in the evaluation document, including any environment blocker if proof still cannot be obtained.

**Verification commands:**

```bash
cd services/platform-api && python -m pytest tests/test_agchain_models.py -q
cd web && npx vitest run src/pages/agchain/AgchainModelsPage.test.tsx
cd web && npx vitest run src/components/agchain/AgchainLeftNav.test.tsx
```

**Expected output:** local suites still pass, the screenshot artifact exists, `output/playwright/agchain-models-telemetry-proof.json` exists, and the evaluation record contains explicit target-environment telemetry proof or a clearly named deployment blocker.

**Commit:** `chore(agchain): close models compliance evidence gap`

## Completion Criteria

1. No new Models surface behavior was introduced.
2. The paginated list contract is explicit and no longer treated as drift.
3. `agchain.models.key_connected` and `agchain.models.key_disconnected` both emit queryable `result` fields in deployed structured logs without exposing secrets.
4. The deployed telemetry proof gap is closed or converted into a clearly documented environment blocker.
5. The screenshot artifact exists in the accepted PNG format.
6. `output/playwright/agchain-models-telemetry-proof.json` exists with the expected safe proof records, or the evaluation record names the exact blocker that prevented its capture.
7. The April 1 evaluation record is updated so a re-evaluator can make a binary compliance decision from current evidence.

## Verification Commands

```bash
cd services/platform-api && python -m pytest tests/test_agchain_models.py -q
cd web && npx vitest run src/pages/agchain/AgchainModelsPage.test.tsx
cd web && npx vitest run src/components/agchain/AgchainLeftNav.test.tsx
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"blockdata-platform-api\" AND (jsonPayload.message=\"agchain.models.key_connected\" OR jsonPayload.message=\"agchain.models.key_disconnected\" OR jsonPayload.message=\"agchain.models.health_refreshed\" OR textPayload:\"agchain.models.key_connected\" OR textPayload:\"agchain.models.key_disconnected\" OR textPayload:\"agchain.models.health_refreshed\")" --project=agchain --freshness=1d --limit=50 --format=json > output/playwright/agchain-models-telemetry-proof.json
```

Manual verification:

1. Open `/app/agchain/models` and confirm the provider-first top-level page still matches the shipped contract.
2. Capture a fresh PNG screenshot under `output/playwright/`.
3. Exercise `connect-key`, `disconnect-key`, and `refresh-health` in Cloud Run service `blockdata-platform-api` under project `agchain`.
4. Run the locked `gcloud logging read ... > output/playwright/agchain-models-telemetry-proof.json` command.
5. Confirm the JSON capture contains the three locked deployed events with only safe fields and no secret material.

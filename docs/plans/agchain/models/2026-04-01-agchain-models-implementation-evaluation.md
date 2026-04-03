## Reviewed Inputs

- Approved plan: `docs/plans/2026-03-31-agchain-models-surface-implementation-plan-v2.md`
- Code reviewed: current `master` implementation in `services/platform-api`, `supabase/migrations`, and `web/src` for the AGChain models surface
- Working-tree review: current dirty diff checked for `AgchainModelsPage.tsx`, `AgchainModelsToolbar.tsx`, and `AgchainModelsTable.tsx`; those edits are cosmetic and do not change the contract verdict
- Tests re-run during this evaluation:
  - `cd services/platform-api && pytest -q tests/test_agchain_models.py`
  - `cd web && npx vitest run src/lib/agchainModelProviders.test.ts src/pages/agchain/AgchainModelsPage.test.tsx src/components/agchain/AgchainLeftNav.test.tsx src/components/agchain/models/AgchainModelsTable.test.tsx`
- Runtime evidence reviewed:
  - local managed platform-api logs in `.codex-platform-api-managed.log` and `.codex-platform-api-managed.err.log`
  - existing local Playwright snapshot `.playwright-cli/page-2026-04-01T07-41-12-677Z.yml`
  - Cloud Run log query run on April 1, 2026 against `blockdata-platform-api` in project `agchain` for `agchain.models.*` evidence

## Approved Contract Summary

- The locked AGChain `Models` surface is a provider-first configuration page, not a benchmark-local model picker and not a top-level registry workspace.
- The locked platform API surface is 8 endpoints: 6 v1 model-target routes plus `connect-key` and `disconnect-key`.
- `GET /agchain/models` and `GET /agchain/models/{model_target_id}` must expose requester-scoped nullable `key_suffix` without exposing plaintext keys or encrypted payloads.
- `refresh-health` remains superuser-only; `connect-key` and `disconnect-key` are authenticated-user routes.
- The locked observability surface is 9 traces, 7 counters, 2 histograms, and 6 structured logs, with no secret leakage.
- The locked database surface is exactly `20260326170000_agchain_model_targets.sql`; edge functions stay untouched.
- The frontend must render provider rows at the first layer, open a right-side configure/detail panel, keep credential scope provider-wide, and derive provider status plus credential anchor in the frontend helper.

## Compliance Verdict

**Verdict:** `Non-Compliant`

**Compliance rate:** 13 of 15 completion criteria verified (87%).

**Critical deviations (2):**
1. `GET /agchain/models` does not match the locked request/response contract. The approved plan explicitly deferred pagination, but the implementation added `limit` and `offset` query parameters and returns `total`, `limit`, and `offset` in the payload. The frontend is wired to that undeclared pagination seam.
2. The plan-required target-environment telemetry proof is missing. I found local instrumentation and local log artifacts, but the April 1, 2026 Cloud Run log query for `agchain.models.connect_key`, `agchain.models.disconnect_key`, and `agchain.models.health_refreshed` produced no target-environment proof.

**Minor deviations (1):**
1. I found local Playwright YAML snapshots for the provider-first flow, but not the explicit screenshot artifact the plan asked for.

## Manifest Audit

### Platform API

- `GET /agchain/models/providers`: compliant
- `GET /agchain/models`: non-compliant with the locked contract because pagination parameters and envelope fields were added without updating the plan
- `GET /agchain/models/{model_target_id}`: compliant
- `POST /agchain/models`: compliant
- `PATCH /agchain/models/{model_target_id}`: compliant
- `POST /agchain/models/{model_target_id}/refresh-health`: compliant
- `POST /agchain/models/{model_target_id}/connect-key`: compliant
- `DELETE /agchain/models/{model_target_id}/disconnect-key`: compliant

### Observability

- Locked telemetry names are implemented in `agchain_models.py` and `model_registry.py`: compliant for code shape
- Local managed logs show `agchain.models.key_connected`, `agchain.models.key_disconnected`, and `agchain.models.health_refreshed`: partially proven
- Target-environment telemetry proof through the existing pipeline: missing

### Database Migrations

- `supabase/migrations/20260326170000_agchain_model_targets.sql`: compliant
- Tables, checks, indexes, RLS, and grants match the locked contract: compliant

### Edge Functions

- No edge functions created or modified: compliant

### Frontend Surface Area

- Provider-first page, configure panel, credential panel, provider derivation helper, and AGChain rail entry all exist: compliant
- Frontend calls `platform-api`, not Supabase directly: compliant
- Current dirty diffs in `AgchainModelsPage.tsx`, `AgchainModelsToolbar.tsx`, and `AgchainModelsTable.tsx` are cosmetic only

## Higher-Rigor Contract Audit

### Locked Product Decisions

- Provider-first top level: compliant
- No project-focus guard on `/app/agchain/models`: compliant
- Credential scope remains provider-wide inside the configure view: compliant
- No browser-side Supabase CRUD: compliant

### Locked Acceptance Contract

- Provider-first list, configure action, right-side detail panel, nested targets, masked suffix, and provider-wide credential sentence: locally proven by Vitest and existing Playwright snapshot
- Connect, disconnect, and post-connect refresh-health: locally proven by tests plus local managed logs
- Target-environment telemetry observation through the existing pipeline: not proven

### Locked Platform API Surface

- Endpoint count and categories: compliant
- `GET /agchain/models` query/response contract: non-compliant because of undeclared pagination

### Locked Observability Surface

- Name inventory in code: compliant
- Runtime proof level required by the plan: non-compliant

### Locked Inventory Counts

- Planned file set for the models feature is present and consistent with the locked inventory: compliant

### Locked File Inventory

- New v1 files, new v2 files, and modified v2 files from the plan are present: compliant

### Frozen Global Models Contract

- The first layer is still a provider-first configuration surface rather than a table-plus-inspector workbench: compliant

### Explicit Risks Accepted In This Plan

- The implementation stays within the accepted provider-wide credential scope and frontend-derived provider summary seam: compliant

## Missing Planned Work

- Target-environment telemetry proof for `agchain.models.connect_key`, `agchain.models.disconnect_key`, and `agchain.models.health_refreshed`
- The explicit screenshot artifact requested by the end-to-end visual verification step

## Undeclared Additions

- `GET /agchain/models` accepts `limit` and `offset`
- `GET /agchain/models` returns `total`, `limit`, and `offset`
- `web/src/lib/agchainModels.ts` and `web/src/pages/agchain/AgchainModelsPage.test.tsx` are wired to that undeclared pagination contract

## Verification Evidence

- Backend tests passed: `23 passed in 19.69s`
- Frontend tests passed: `4 files, 12 tests passed`
- Local managed platform-api logs show:
  - `POST /agchain/models/.../connect-key` -> `200 OK`
  - `DELETE /agchain/models/.../disconnect-key` -> `200 OK`
  - `POST /agchain/models/.../refresh-health` -> `200 OK`
- Local managed error log shows feature structured log names emitted:
  - `agchain.models.key_connected`
  - `agchain.models.key_disconnected`
  - `agchain.models.health_refreshed`
- Existing Playwright YAML snapshot shows the authenticated configure panel with the provider-wide credential sentence and nested target detail
- Cloud Run logs queried on April 1, 2026 did not surface target-environment `agchain.models.*` proof

## Approval Recommendation

**Recommendation:** `Reject — Remediation Required`

**Remediation list:**
1. Reconcile the `GET /agchain/models` contract: either remove pagination from the implementation or update and re-approve the plan to include the paginated request/response surface.
2. Produce the plan-required target-environment telemetry proof for `connect_key`, `disconnect_key`, and `health_refreshed`.
3. Add the explicit visual artifact requested by the end-to-end verification step, or revise the plan to accept the existing local snapshot format instead.

---

## Remediation Execution Update (2026-04-01)

This addendum records the follow-up remediation work executed after the original evaluation above. It does not rewrite the original verdict; it captures what changed and what still blocks compliance closure.

### Local code and test remediation completed

- `services/platform-api/app/api/routes/agchain_models.py`
  - `agchain.models.key_connected` now includes `result: "ok"`
  - `agchain.models.key_disconnected` now includes `result: "ok"`
- `services/platform-api/tests/test_agchain_models.py`
  - backend route tests now assert the queryable structured-log payload for connect/disconnect
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`
  - the page test now treats `GET /agchain/models?limit=50&offset=0` as the intentional paginated list contract and no longer tolerates the bare non-paginated path in the mock

### Fresh verification after remediation edits

- `cd services/platform-api && python -m pytest tests/test_agchain_models.py -q`
  - `23 passed in 13.52s`
- `cd web && npx vitest run src/pages/agchain/AgchainModelsPage.test.tsx`
  - `3 passed`

### Explicit visual artifacts now present

- `output/playwright/agchain-models-openai-health.png`
- `output/playwright/agchain-models-compact-layout.png`

The original screenshot-artifact gap is now closed.

### Deployed-environment telemetry proof follow-up

Target used:

- Cloud Run service: `blockdata-platform-api`
- GCP project: `agchain`
- Service URL observed during remediation: `https://blockdata-platform-api-sqsmf5q2rq-uc.a.run.app`

Follow-up executed:

1. Confirmed deployed `/health` returned `200`.
2. Signed in successfully through Supabase password grant using the repo-configured test account.
3. Called deployed `GET /agchain/models?limit=50&offset=0` successfully and selected an enabled `api_key` target from the response.
4. Attempted deployed credential and health routes against that target.

Observed deployed results:

- `POST /agchain/models/{model_target_id}/connect-key` -> `404`
- `POST /agchain/models/{model_target_id}/refresh-health` -> `500`
- `DELETE /agchain/models/{model_target_id}/disconnect-key` -> `404`

Telemetry follow-up:

- Re-ran the Cloud Run log query for:
  - `agchain.models.key_connected`
  - `agchain.models.key_disconnected`
  - `agchain.models.health_refreshed`
- Wrote the proof artifact to:
  - `output/playwright/agchain-models-telemetry-proof.json`
- Current artifact contents:
  - `[]`

### Current blocker summary

The remaining compliance blocker is no longer just "no deployed telemetry observed." The stronger current finding is:

- the deployed Cloud Run service does not currently behave like the locally verified Models implementation for the remediation target routes
- deployed `connect-key` and `disconnect-key` returned `404`
- deployed `refresh-health` returned `500`
- therefore target-environment telemetry proof cannot be closed from the current deployed service state

This means the unresolved issue is now best classified as a deployed-environment / rollout-state blocker rather than a local Models feature-code blocker.

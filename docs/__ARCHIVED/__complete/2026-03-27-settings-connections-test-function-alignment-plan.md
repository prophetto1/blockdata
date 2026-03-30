# Settings Connections Test Function Alignment Implementation Plan

**Goal:** Fix the shipped Settings Connections regression by aligning the frontend `POST /connections/test` `function_name` values with the backend plugin registry so the live Test button works again for supported connection types.

**Architecture:** Keep this as a frontend-only bugfix. Do not change the `platform-api` route contract, plugin registry behavior, live connection storage, or observability surface. Update the Settings Connections panel’s per-provider `testFunction` mapping to the backend-resolved names now in use, then add focused UI coverage so future registry-name drift is caught in tests.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

**Status:** Draft
**Author:** Codex (requested by user)
**Date:** 2026-03-27

## Manifest

### Platform API

No platform API changes.

Consumed existing endpoint:

| Verb | Path | Action | Status |
|------|------|--------|--------|
| POST | `/connections/test` | Test an existing saved connection by `connection_id` and `function_name` | Existing - consumed only |

### Observability

No observability changes. This bugfix only corrects frontend request payload values.

### Database Migrations

No database changes.

### Edge Functions

No edge-function changes.

### Frontend Surface Area

Modify:
- `web/src/pages/settings/ConnectionsPanel.tsx`

Create:
- `web/src/pages/settings/ConnectionsPanel.test.tsx`

Locked frontend scope:
- update only the provider-to-`function_name` mapping used by the Settings Connections Test button
- add regression tests that verify the current request payload values for supported providers
- do not change copy, layout, route structure, or add new provider types in this plan

## Locked Decisions

- The backend registry remains the source of truth; this plan only aligns the frontend mapping to it.
- Supported provider mappings in scope for this fix are:
  - `gcs -> load_gcs_list_objects`
  - `arangodb -> load_arango_batch_insert`
- The request contract for `POST /connections/test` stays unchanged: `{ connection_id, function_name }`.
- No backend tests, migrations, or deploy-script changes are included in this plan.

## Locked Acceptance Contract

1. The Settings Connections Test button sends `load_gcs_list_objects` for GCS connections.
2. The Settings Connections Test button sends `load_arango_batch_insert` for ArangoDB connections.
3. The existing success/error status handling in `ConnectionsPanel.tsx` remains unchanged.
4. No route, auth, API, database, or observability contract changes are introduced.

## Task Plan

### Task 1: Align the frontend provider test-function mapping

**Files:**
- Modify: `web/src/pages/settings/ConnectionsPanel.tsx`

**Step 1:** Replace the stale `testFunction` value for the GCS connection type with `load_gcs_list_objects`.

**Step 2:** Replace the stale `testFunction` value for the ArangoDB connection type with `load_arango_batch_insert`.

**Step 3:** Verify that no other behavior in `handleTest` or `getTestFunction` changes.

**Test command:** Read `web/src/pages/settings/ConnectionsPanel.tsx`

**Expected output:** The only behavior change in the panel is the corrected `testFunction` mapping for the two supported provider types.

**Commit:** `fix: align settings connection test function names`

### Task 2: Add focused frontend regression coverage

**Files:**
- Create: `web/src/pages/settings/ConnectionsPanel.test.tsx`

**Step 1:** Add a test that renders the panel with a connected GCS row, clicks `Test`, and verifies `platformApiFetch('/connections/test', ...)` is called with `function_name: 'load_gcs_list_objects'`.

**Step 2:** Add a test that renders the panel with a connected ArangoDB row, clicks `Test`, and verifies `platformApiFetch('/connections/test', ...)` is called with `function_name: 'load_arango_batch_insert'`.

**Step 3:** Keep the test scope narrow: mock `platformApiFetch`, feed the component the minimal load/test responses it needs, and assert the existing success path still renders the status message.

**Test command:** `cd web && npm run test -- ConnectionsPanel.test.tsx`

**Expected output:** The new regression tests pass and prove the request payload values for both supported providers.

**Commit:** `test: cover settings connection test payload mapping`

### Task 3: Run targeted verification

**Files:**
- Modify: none

**Step 1:** Run the new focused frontend test file.

**Step 2:** If the existing settings-panel suite layout makes it cheap, also run the neighboring settings tests to catch accidental regressions.

**Test command:** `cd web && npm run test -- ConnectionsPanel.test.tsx SettingsSecrets.test.tsx`

**Expected output:** The new connection mapping regression tests pass, and the neighboring secrets settings tests continue to pass.

**Commit:** None.

## Risks And Unknowns

1. The backend registry could change again later; this plan prevents silent frontend drift only for the currently supported GCS and ArangoDB connection types.
2. There is no existing Connections panel test file today, so the new test must establish its own minimal render/mocking harness.

## Completion Criteria

- `ConnectionsPanel.tsx` sends the current backend-aligned `function_name` values for GCS and ArangoDB.
- `ConnectionsPanel.test.tsx` exists and locks both request payload values.
- Targeted frontend tests pass.
- No files outside the locked frontend scope are modified.

# Implementation Evaluation: AG chain Models Surface

## Reviewed Inputs

- Approved plan: `_agchain/docs/plans/2026-03-26-agchain-models-surface-implementation-plan.md`
- Pre-implementation evaluation: `_agchain/docs/plan-evaluation/2026-03-27-agchain-models-surface-plan-evaluation.md`
- Code reviewed: all 14 changed files in the working tree
- Tests reviewed: `pytest services/platform-api/tests/test_agchain_models.py -q` (8 passed), `npm test -- src/pages/agchain/AgchainModelsPage.test.tsx` (1 passed)
- Runtime evidence: migration runtime verification blocked by Docker Desktop unavailability (acknowledged by implementer)

## Approved Contract Summary

- 6 new platform-api endpoints under `/agchain/models` with `require_user_auth` for reads and `require_superuser` for writes
- Code-owned provider catalog exposed via `GET /agchain/models/providers`
- Provider-slug-validated create/edit flows, not free-text provider strings
- Health probes store history rows and update target status using provider-aware strategy resolution
- 7 trace spans, 5 counter metrics, 2 histogram metrics, 4 structured logs with explicit allowed/forbidden attribute rules
- 1 migration creating `agchain_model_targets` and `agchain_model_health_checks` with RLS, column-level authenticated grants, and NULL-safe identity uniqueness
- 0 edge functions
- 3 new components, 1 hook, 1 lib/service, 1 modified page, 2 test modules
- No direct browser Supabase CRUD against the new tables

---

## Compliance Verdict

**Verdict:** `Compliant With Minor Deviations`

**Compliance rate:** 52 of 52 locked contract items verified from code analysis and test evidence. Migration runtime verification is the only item pending infrastructure availability; this is an environment blocker, not a code defect.

**Critical deviations:** 0

**Minor deviations (4):**

1. **`provider_qualifier_present` attribute never emitted.** Listed as an allowed trace/metric attribute in the plan but no span or metric emits it. The plan says "allowed" (may), not "required" (must), so this is not a contract violation. Future spans could add it.

2. **`credential_status` not emitted as a trace span attribute.** Listed in the allowed set but not attached to any span. It IS captured in health check `metadata_jsonb`, which is a reasonable placement. Same reasoning as above — allowed, not required.

3. **Backend test mock shape drift in `test_get_model_returns_detail_and_recent_health_checks`.** The mock returns a raw row shape (with `credential_source_jsonb`, `model_args_jsonb`) while the real `load_model_detail` returns a `_normalize_row` result (with `capabilities` instead of `capabilities_jsonb`, without `credential_source_jsonb`). The test still validates correct route mechanics (404 handling, response keys, provider definition resolution), but a more precise mock would match the real normalized shape.

4. **Migration runtime verification pending.** `npx supabase db reset` cannot run without Docker Desktop. The implementer acknowledged this. The migration SQL has been fully audited against the locked contract and matches column-for-column. This item needs to pass once Docker is available.

---

## Manifest Audit

### Platform API

| Endpoint | Verb + Path | Auth | Request/Response Shape | Touches | Verdict |
|----------|-------------|------|------------------------|---------|---------|
| Provider catalog | `GET /agchain/models/providers` | `require_user_auth` | Correct — `items: []` with all 8 declared fields per provider | Code-owned catalog | Compliant |
| List models | `GET /agchain/models` | `require_user_auth` | Correct — 5 query params, `items: []` with all 21 declared response fields | `agchain_model_targets`, credential tables, provider catalog | Compliant |
| Get model | `GET /agchain/models/{model_target_id}` | `require_user_auth` | Correct — `model_target`, `recent_health_checks`, `provider_definition` + 404 | Both tables, credential tables, provider catalog | Compliant |
| Create model | `POST /agchain/models` | `require_superuser` | Correct — all 16 body fields, `ok` + `model_target_id` response, provider validation | `agchain_model_targets`, provider catalog | Compliant |
| Update model | `PATCH /agchain/models/{model_target_id}` | `require_superuser` | Correct — mutable subset (11 fields), immutables excluded (`provider_slug`, `provider_qualifier`, `model_name`, `qualified_model`), `ok` + `model_target_id` | `agchain_model_targets`, provider catalog on auth_kind change | Compliant |
| Refresh health | `POST /agchain/models/{model_target_id}/refresh-health` | `require_superuser` | Correct — no body, `ok` + 5 outcome fields, full probe lifecycle | Both tables, credential tables, provider catalog | Compliant |

**Router mount:** Verified at `main.py:153-155`, positioned before plugin catch-all. Compliant.

### Observability

**Trace spans (7):**

| # | Declared Name | Emit Location | Verified |
|---|---------------|---------------|----------|
| 1 | `agchain.models.providers.list` | `agchain_models.py:78` | Compliant |
| 2 | `agchain.models.list` | `agchain_models.py:96` | Compliant |
| 3 | `agchain.models.get` | `agchain_models.py:124` | Compliant |
| 4 | `agchain.models.create` | `agchain_models.py:152` | Compliant |
| 5 | `agchain.models.update` | `agchain_models.py:176` | Compliant |
| 6 | `agchain.models.refresh_health` | `agchain_models.py:202` | Compliant |
| 7 | `agchain.models.provider_probe` | `model_registry.py:360` | Compliant |

**Metric counters (5):**

| # | Declared Name | Verified |
|---|---------------|----------|
| 1 | `platform.agchain.models.providers.list.count` | Compliant |
| 2 | `platform.agchain.models.list.count` | Compliant |
| 3 | `platform.agchain.models.create.count` | Compliant |
| 4 | `platform.agchain.models.update.count` | Compliant |
| 5 | `platform.agchain.models.refresh_health.count` | Compliant |

**Metric histograms (2):**

| # | Declared Name | Verified |
|---|---------------|----------|
| 6 | `platform.agchain.models.list.duration_ms` | Compliant |
| 7 | `platform.agchain.models.refresh_health.duration_ms` | Compliant |

**Structured logs (4):**

| # | Declared Name | Emit Location | Verified |
|---|---------------|---------------|----------|
| 1 | `agchain.models.created` | `agchain_models.py:163` | Compliant |
| 2 | `agchain.models.updated` | `agchain_models.py:189` | Compliant |
| 3 | `agchain.models.health_refreshed` | `agchain_models.py:214` | Compliant |
| 4 | `agchain.models.provider_probe_failed` | `model_registry.py:388` | Compliant |

**Attribute rules:** All span and metric attributes use `safe_attributes()` filtering. No forbidden attributes (raw API keys, credentials, `credential_source_jsonb`, `model_args_jsonb`, full `api_base`, user email, user id, full error payloads, benchmark ids) leak into traces or metrics. Structured logs include `model_target_id`, `subject_id`, `provider_slug`, safe attribute subsets — all within the allowed log attribute set. No secrets, full base URLs, request headers, or provider response bodies in structured logs. Compliant.

### Database Migration

**File:** `20260326170000_agchain_model_targets.sql` — present and rewritten to match the locked contract.

**`agchain_model_targets`:**

- All 23 columns match the locked contract exactly (names, types, nullability, defaults)
- Identity uniqueness: `UNIQUE NULLS NOT DISTINCT (provider_slug, provider_qualifier, qualified_model, api_base)` — addresses the pre-implementation evaluation's structural gap about NULL-safe uniqueness. Compliant.
- `auth_kind` CHECK matches plan: `('none', 'api_key', 'oauth', 'service_account', 'custom')`. Compliant.
- `probe_strategy` CHECK: `('provider_default', 'http_openai_models', 'http_anthropic_models', 'http_google_models', 'custom_http', 'none')`. Plan said "probe_strategy check" — values are reasonable and align with the provider catalog defaults. Compliant.
- `health_status` CHECK matches plan: `('healthy', 'degraded', 'error', 'unknown')`. Compliant.

**`agchain_model_health_checks`:**

- All 11 columns match the locked contract exactly
- `probe_strategy` and `status` checks aligned with the target table. Compliant.
- FK to `agchain_model_targets` with `ON DELETE CASCADE`. Compliant.
- `checked_by` FK to `auth.users` with `ON DELETE SET NULL`. Compliant.

**RLS:** Enabled on both tables. Compliant.

**Policies:** `DROP POLICY IF EXISTS` then `CREATE POLICY ... FOR SELECT TO authenticated USING (true)` on both tables. Compliant.

**Grants:**
- `REVOKE ALL FROM anon, authenticated` on both tables. Compliant.
- Column-level `SELECT` on `agchain_model_targets` to authenticated: correctly **excludes** `credential_source_jsonb`. This addresses the pre-implementation evaluation's concern. Compliant.
- Column-level `SELECT` on `agchain_model_health_checks` to authenticated: includes all non-sensitive columns. Compliant.
- `service_role` gets full CRUD on both tables. Compliant.

**Indexes:** All 4 declared indexes present with correct names and columns. Compliant.

### Edge Functions

No edge functions created or modified. Compliant with plan declaration.

### Frontend Surface Area

| Category | Plan Count | Actual Count | Verdict |
|----------|-----------|--------------|---------|
| New pages | 0 | 0 | Compliant |
| New components | 3 | 3 | Compliant |
| New hooks | 1 | 1 | Compliant |
| New libs/services | 1 | 1 | Compliant |
| Modified pages | 1 | 1 | Compliant |
| New backend test modules | 1 | 1 | Compliant |
| New frontend test modules | 1 | 1 | Compliant |

**Component verification:**

- `AgchainModelsToolbar.tsx`: Search input, "Add Model Target" button, create sheet with provider-backed form (provider select dropdown, not free-text input). Validated by test assertion on provider select element. Compliant.
- `AgchainModelsTable.tsx`: 7 columns matching acceptance contract (Label, Provider, Qualified Model, Auth Readiness, Compatibility, Health, Last Checked). Row selection opens inspector. Compliant.
- `AgchainModelInspector.tsx`: Detail view populated from `GET /agchain/models/{id}`, provider definition display, recent health checks list, Refresh Health and Edit Model buttons, edit sheet with `providerLocked` for immutable identity fields. Compliant.

**Service layer:** `agchainModels.ts` uses `platformApiFetch` for all 6 API calls — no direct Supabase imports. Type definitions match the API response shapes. Compliant.

**Hook:** `useAgchainModels.ts` manages list/detail/provider state, selection, create/update/refresh actions, and automatic data reload after mutations. Compliant.

**Modified page:** `AgchainModelsPage.tsx` replaces `AgchainSectionPage` placeholder with composed Toolbar + Table + Inspector surface. Test explicitly verifies old placeholder copy is absent. Compliant.

---

## Higher-Rigor Contract Audit

### Locked Product Decisions (10)

| # | Decision | Verdict |
|---|----------|---------|
| 1 | Global registry, not benchmark-local picker | Compliant — no benchmark columns, filters, or joins |
| 2 | Benchmark-local selection out of scope | Compliant — not present |
| 3 | AG chain talks to platform-api only | Compliant — all calls via `platformApiFetch` |
| 4 | Supabase remains system of record | Compliant |
| 5 | No secrets-management UI | Compliant — credential_status is derived, read-only |
| 6 | Table-first surface | Compliant — table is the primary view |
| 7 | Health checks are lightweight probes | Compliant — `httpx` GET to `/models` endpoint |
| 8 | Provider catalog validates create/edit | Compliant — `_validate_provider_payload` enforces |
| 9 | Sandbox not in scope | Compliant — not present |
| 10 | Runtime-policy comparison not in scope | Compliant — not present |

### Locked Acceptance Contract (9)

| # | Acceptance Criterion | Evidence | Verdict |
|---|---------------------|----------|---------|
| 1 | Authenticated user sees table from platform-api | Frontend test: table columns render, data rows appear | Compliant |
| 2 | Page loads provider catalog | Frontend test: provider catalog fetched, options rendered | Compliant |
| 3 | Table shows 7 declared columns | `AgchainModelsTable.tsx`: Label, Provider, Qualified Model, Auth Readiness, Compatibility, Health, Last Checked | Compliant |
| 4 | Row selection opens inspector | Frontend test: click row → inspector heading appears | Compliant |
| 5 | Superuser creates from provider catalog, appears without reload | Create flow calls POST, then `loadItems()` refreshes list, selects new ID | Compliant (code analysis) |
| 6 | Superuser edits, values update in table and inspector | Edit flow calls PATCH, then `loadItems()` + `loadDetail()` | Compliant (code analysis) |
| 7 | Superuser triggers refresh-health, writes history + updates status | `refresh_model_target_health` inserts health check row, updates target row | Compliant (code analysis + backend test) |
| 8 | Each route emits locked trace span and structured log | All 7 spans and 4 logs verified in code | Compliant |
| 9 | No browser direct Supabase CRUD | `agchainModels.ts` imports only `platformApiFetch` | Compliant |

### Frozen Global Models Contract

- No benchmark assignment, eligibility matrices, or benchmark-specific subsets: Compliant
- No runtime-profile authoring or comparison: Compliant
- No direct browser Supabase reads: Compliant
- `provider_slug` treated as backend-validated identity, not free-text label: Compliant (create form uses `<NativeSelect>` from provider catalog, not text input)

### Explicit Risks

All 4 accepted risks remain as documented. No new risks were silently introduced.

### Completion Criteria (6)

| # | Criterion | Verdict |
|---|-----------|---------|
| 1 | Locked API surface exists exactly as specified | Compliant |
| 2 | Locked traces, metrics, and structured logs exist exactly as specified | Compliant |
| 3 | Migration exists and produces locked tables and policies | SQL verified; runtime pending Docker |
| 4 | Inventory counts match actual files | 12 new + 2 modified = 14 total. Compliant |
| 5 | `/app/agchain/models` renders live table, not placeholder | Compliant (test proves) |
| 6 | No direct browser Supabase CRUD | Compliant |

---

## Missing Planned Work

1. **Migration runtime verification (Task 1 / Task 6):** `npx supabase db reset` cannot run without Docker Desktop. The SQL content has been verified against the locked contract at the text level. This is the only outstanding item. Once Docker is available, running `npx supabase db reset` completes the verification.

## Undeclared Additions

None. All 14 files match the locked file inventory exactly. No undeclared files, endpoints, components, or dependencies were added.

## Verification Evidence

| Evidence | Status |
|----------|--------|
| Backend tests: `pytest services/platform-api/tests/test_agchain_models.py -q` | 8 passed in 7.53s |
| Frontend test: `npm test -- src/pages/agchain/AgchainModelsPage.test.tsx` | 1 passed |
| Migration runtime: `npx supabase db reset` | Blocked by Docker Desktop (not running) |
| Migration SQL audit: column-by-column comparison to locked contract | All 23 + 11 columns, 4 indexes, RLS, policies, grants match |
| File inventory: 14 files changed | Matches locked inventory exactly |
| Acceptance flow: code analysis of create → list refresh → select → detail → edit → refresh-health | Wiring verified through code reading |

---

## Approval Recommendation

**Recommendation:** `Approve With Noted Deviations`

The implementation is substantially compliant with the approved plan. All 6 endpoints exist with correct auth, request/response shapes, and touched tables. All 18 observability items are present with correct names and emit locations. The migration matches the locked contract column-for-column and addresses the pre-implementation evaluation's structural concerns (NULL-safe uniqueness, column-level grants excluding `credential_source_jsonb`). The frontend surface matches the locked inventory, renders a table-first surface backed by `platform-api` only, and validates against the provider catalog in create/edit flows.

The 4 minor deviations are noted for the record. None are blocking. The migration runtime verification should be completed once Docker Desktop is available — this is the only remaining gate before the work is fully proven.

**Pre-implementation evaluation findings addressed:**
- S1 (migration file reclassification): Migration was rewritten in place as expected
- S4 (credential_status derivation): Fully implemented with `_resolve_credential_status` supporting `not_required`, `missing`, `invalid`, `disconnected`, `ready` statuses, checking the requesting user's credentials
- Pre-impl structural gap (NULL-safe uniqueness): Addressed with `UNIQUE NULLS NOT DISTINCT`
- Pre-impl structural gap (column-level grants): Addressed — `credential_source_jsonb` excluded from authenticated grants
- Pre-impl structural gap (PATCH immutable fields): Addressed implicitly — `ModelTargetUpdateRequest` and the update whitelist exclude `provider_slug`, `provider_qualifier`, `model_name`, `qualified_model`
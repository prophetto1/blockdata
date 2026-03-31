# Operational Readiness Bootstrap Compatibility Fix Proposal

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `SuperuserOperationalReadiness` diagnose and survive bootstrap failures before requesting readiness data, so the page never collapses into a blind `Failed to fetch` state when the real failure is backend reachability, cross-origin transport, auth bootstrap, or unsupported backend contract.

**Architecture:** Treat the current failure as a two-part defect: the browser fetch path bypasses the existing Vite `/platform-api` proxy in local development, and the page starts at the readiness seam instead of the bootstrap-compatibility seam. Fix both. First, split browser fetch base from dev proxy target so local browser requests use the proxy by default. Second, add a shared runtime contract/bootstrap layer that classifies `transport_unreachable`, `auth_unavailable`, `unsupported_capability`, `stale_backend`, and `supported` before `SuperuserOperationalReadiness` asks for `/admin/runtime/readiness`.

**Tech Stack:** Vite, React + TypeScript, FastAPI, existing admin shell, Vitest, pytest.

---

## Source Basis

- Current browser fetch path:
  - `web/src/lib/platformApi.ts`
  - `web/src/hooks/useOperationalReadiness.ts`
- Existing local proxy that is currently bypassed:
  - `web/vite.config.ts`
- Existing admin shell/page seams:
  - `web/src/components/layout/AdminShellLayout.tsx`
  - `web/src/components/admin/AdminLeftNav.tsx`
  - `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
  - `web/src/pages/superuser/SuperuserApiEndpoints.tsx`
- Existing backend bootstrap seam:
  - `services/platform-api/app/api/routes/health.py`
  - `services/platform-api/app/main.py`
  - `scripts/start-platform-api.ps1`
  - `services/platform-api/start-dev.sh`

## Root Cause Summary

1. `web/vite.config.ts` already exposes a same-origin `/platform-api` proxy for local dev.
2. `web/src/lib/platformApi.ts` bypasses that proxy in the browser when `VITE_PLATFORM_API_URL` is set, creating avoidable direct cross-origin requests from `localhost:5374` to `localhost:8001`.
3. `web/src/hooks/useOperationalReadiness.ts` immediately requests `/admin/runtime/readiness?surface=all` with auth, so the page assumes transport, preflight, auth, and route support already work.
4. When any of those assumptions fail, the page receives only a generic browser fetch failure and cannot explain the failure class it is supposed to diagnose.

## Required Target State

At completion:

1. Local admin browser sessions use a same-origin `/platform-api` browser base by default; direct host:port targets remain proxy targets, not browser fetch bases.
2. `AdminShellLayout` owns one shared runtime bootstrap/contract state for admin pages.
3. `SuperuserOperationalReadiness` has a two-stage state model:
   - bootstrap compatibility
   - readiness dashboard
4. The page must show explicit unsupported/degraded states for:
   - backend unreachable or browser-opaque transport failure
   - auth unavailable
   - stale or wrong backend instance
   - readiness capability unsupported
5. The page may request `/admin/runtime/readiness` only after the runtime contract marks `superuser.operational_readiness` as supported.
6. `SuperuserApiEndpoints` can reuse the same runtime contract facts instead of inferring backend identity separately.
7. No user should see a raw `Failed to fetch` banner on this page for bootstrap-class failures.

## Locked Acceptance Contract

1. Against a healthy backend, `SuperuserOperationalReadiness` still renders the readiness dashboard.
2. Against a browser-to-backend transport failure, the page renders a structured bootstrap failure state that includes:
   - configured frontend origin
   - configured browser API base
   - high-confidence cause class
   - exact remediation path
3. Against a reachable backend that lacks readiness support, the page renders an unsupported-capability state and never requests `/admin/runtime/readiness`.
4. Against an auth/bootstrap failure, the page renders an auth-focused state and never falls through to a generic fetch error.
5. In local development, a configured `localhost` target no longer forces the browser to bypass the Vite proxy.
6. The same runtime contract can be reused by `SuperuserApiEndpoints` and future admin pages.

## Manifest

### Frontend

- New libs: `2`
- New hooks/providers: `2`
- New UI components: `2`
- Modified pages/layouts: `4`

Planned frontend files:

- Create:
  - `web/src/lib/adminRuntimeContract.ts`
  - `web/src/hooks/useAdminRuntimeContract.ts`
  - `web/src/components/admin/AdminRuntimeBootstrapGate.tsx`
  - `web/src/components/admin/AdminRuntimeBootstrapGate.test.tsx`
  - `web/src/hooks/useAdminRuntimeContract.test.tsx`
- Modify:
  - `web/src/lib/platformApi.ts`
  - `web/vite.config.ts`
  - `web/src/components/layout/AdminShellLayout.tsx`
  - `web/src/components/admin/AdminLeftNav.tsx`
  - `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
  - `web/src/hooks/useOperationalReadiness.ts`
  - `web/src/pages/superuser/SuperuserApiEndpoints.tsx`
  - `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
  - `web/src/hooks/useOperationalReadiness.test.tsx`

### Backend

- New route module: `1`
- Modified existing route/config files: `4`
- New pytest modules: `1`

Planned backend files:

- Create:
  - `services/platform-api/app/api/routes/admin_runtime_contract.py`
  - `services/platform-api/tests/test_admin_runtime_contract.py`
- Modify:
  - `services/platform-api/app/api/routes/health.py`
  - `services/platform-api/app/main.py`
  - `scripts/start-platform-api.ps1`
  - `services/platform-api/start-dev.sh`
  - `services/platform-api/tests/test_admin_runtime_readiness_routes.py`

## Task Plan

### Task 1: Lock the current failure class in frontend tests

**Files:**
- Create: `web/src/hooks/useAdminRuntimeContract.test.tsx`
- Modify: `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
- Modify: `web/src/hooks/useOperationalReadiness.test.tsx`

**Step 1: Write the failing contract-gate tests**

Add tests that require:
- `transport_unreachable` state renders instead of a generic fetch banner
- unsupported capability state blocks readiness fetch entirely
- supported state permits readiness fetch

**Step 2: Run test to verify it fails**

Run:

```powershell
cd E:\writing-system\web
npm run test -- src/hooks/useAdminRuntimeContract.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx
```

Expected:
- FAIL because no runtime-contract hook or gate exists yet

**Step 3: Commit**

```bash
git add web/src/hooks/useAdminRuntimeContract.test.tsx web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx web/src/hooks/useOperationalReadiness.test.tsx
git commit -m "test: lock operational readiness bootstrap gate states"
```

### Task 2: Split browser API base from dev proxy target

**Files:**
- Modify: `web/src/lib/platformApi.ts`
- Modify: `web/vite.config.ts`

**Step 1: Add failing tests for base resolution**

Add or extend tests around `platformApi.ts` so local browser mode uses `/platform-api` rather than direct `http://localhost:*` targets.

**Step 2: Implement the base split**

Make these rules explicit:
- Browser fetch base defaults to `/platform-api`
- A direct absolute browser base is opt-in and separate from proxy target
- `vite.config.ts` uses `VITE_PLATFORM_API_PROXY_TARGET` (or renamed equivalent) for the dev proxy target

**Step 3: Run targeted tests**

Run:

```powershell
cd E:\writing-system\web
npm run test -- src/lib/platformApi.test.ts src/hooks/useAdminRuntimeContract.test.tsx
```

Expected:
- PASS

**Step 4: Commit**

```bash
git add web/src/lib/platformApi.ts web/vite.config.ts web/src/lib/platformApi.test.ts web/src/hooks/useAdminRuntimeContract.test.tsx
git commit -m "fix: route local platform api traffic through the dev proxy"
```

### Task 3: Add a shared backend runtime contract endpoint

**Files:**
- Create: `services/platform-api/app/api/routes/admin_runtime_contract.py`
- Create: `services/platform-api/tests/test_admin_runtime_contract.py`
- Modify: `services/platform-api/app/api/routes/health.py`
- Modify: `services/platform-api/app/main.py`
- Modify: `scripts/start-platform-api.ps1`
- Modify: `services/platform-api/start-dev.sh`

**Step 1: Write the failing backend tests**

Lock a contract response that includes:
- `generated_at`
- backend identity and launcher provenance
- supported admin capabilities
- readiness route support

**Step 2: Implement the contract route**

Add `GET /admin/runtime/contract` with enough information for the frontend to classify:
- wrong backend instance
- missing readiness capability
- launcher/env mismatch

**Step 3: Extend startup provenance**

Stamp launcher/build-source metadata in the standard local startup scripts so the contract can report the backend instance the browser actually reached.

**Step 4: Run pytest**

Run:

```powershell
cd E:\writing-system\services\platform-api
pytest -q tests/test_admin_runtime_contract.py tests/test_admin_runtime_readiness_routes.py
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/api/routes/admin_runtime_contract.py services/platform-api/tests/test_admin_runtime_contract.py services/platform-api/app/api/routes/health.py services/platform-api/app/main.py scripts/start-platform-api.ps1 services/platform-api/start-dev.sh services/platform-api/tests/test_admin_runtime_readiness_routes.py
git commit -m "feat: add admin runtime contract for bootstrap compatibility"
```

### Task 4: Build the shared admin runtime-contract hook and gate

**Files:**
- Create: `web/src/lib/adminRuntimeContract.ts`
- Create: `web/src/hooks/useAdminRuntimeContract.ts`
- Create: `web/src/components/admin/AdminRuntimeBootstrapGate.tsx`
- Modify: `web/src/components/layout/AdminShellLayout.tsx`
- Modify: `web/src/components/admin/AdminLeftNav.tsx`

**Step 1: Write the failing hook/component tests**

Require state coverage for:
- `loading`
- `transport_unreachable`
- `auth_unavailable`
- `unsupported_capability`
- `supported`

**Step 2: Implement the probe sequence**

Sequence:
1. client diagnostics
2. low-friction reachability probe using `/health/ready`
3. authenticated runtime-contract fetch
4. normalized capability state for admin pages

**Step 3: Mount the shared gate in the admin shell**

Make the contract available to child admin pages through one provider/context seam, not page-local duplicated logic.

**Step 4: Run targeted tests**

Run:

```powershell
cd E:\writing-system\web
npm run test -- src/hooks/useAdminRuntimeContract.test.tsx src/components/admin/AdminRuntimeBootstrapGate.test.tsx
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add web/src/lib/adminRuntimeContract.ts web/src/hooks/useAdminRuntimeContract.ts web/src/components/admin/AdminRuntimeBootstrapGate.tsx web/src/components/layout/AdminShellLayout.tsx web/src/components/admin/AdminLeftNav.tsx web/src/hooks/useAdminRuntimeContract.test.tsx web/src/components/admin/AdminRuntimeBootstrapGate.test.tsx
git commit -m "feat: add shared admin runtime bootstrap gate"
```

### Task 5: Refactor Operational Readiness into a gated two-stage page

**Files:**
- Modify: `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- Modify: `web/src/hooks/useOperationalReadiness.ts`
- Modify: `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
- Modify: `web/src/hooks/useOperationalReadiness.test.tsx`

**Step 1: Write the failing page assertions**

Lock these behaviors:
- do not request readiness when capability is unsupported
- show explicit bootstrap failure UI when transport/auth fails
- render readiness dashboard only when runtime contract is supported

**Step 2: Implement the gate**

Change the page so it consumes shared runtime-contract state and only enables readiness fetching in the supported state.

**Step 3: Replace raw error fallback**

Remove the direct coupling between transport failure and the generic banner. Transport/bootstrap-class failures must render the bootstrap state, not the readiness dashboard shell with zeroed data.

**Step 4: Run targeted tests**

Run:

```powershell
cd E:\writing-system\web
npm run test -- src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx
```

Expected:
- PASS

**Step 5: Commit**

```bash
git add web/src/pages/superuser/SuperuserOperationalReadiness.tsx web/src/hooks/useOperationalReadiness.ts web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx web/src/hooks/useOperationalReadiness.test.tsx
git commit -m "fix: gate operational readiness behind runtime bootstrap compatibility"
```

### Task 6: Reuse runtime contract facts in Superuser API Endpoints

**Files:**
- Modify: `web/src/pages/superuser/SuperuserApiEndpoints.tsx`

**Step 1: Add failing UI test**

Require the page to show backend identity/contract facts from the shared gate instead of re-inferring backend state.

**Step 2: Implement reuse**

Surface backend identity, launcher provenance, and route-group/capability facts in `SuperuserApiEndpoints`.

**Step 3: Run targeted tests**

Run:

```powershell
cd E:\writing-system\web
npm run test -- src/pages/superuser/SuperuserApiEndpoints.test.tsx
```

Expected:
- PASS

**Step 4: Commit**

```bash
git add web/src/pages/superuser/SuperuserApiEndpoints.tsx web/src/pages/superuser/SuperuserApiEndpoints.test.tsx
git commit -m "feat: reuse runtime contract facts in api endpoints page"
```

### Task 7: Final verification matrix

**Files:**
- Modify as needed from prior tasks only

**Step 1: Frontend targeted verification**

Run:

```powershell
cd E:\writing-system\web
npm run test -- src/hooks/useAdminRuntimeContract.test.tsx src/components/admin/AdminRuntimeBootstrapGate.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserApiEndpoints.test.tsx
```

Expected:
- PASS

**Step 2: Backend targeted verification**

Run:

```powershell
cd E:\writing-system\services\platform-api
pytest -q tests/test_admin_runtime_contract.py tests/test_admin_runtime_readiness_routes.py
```

Expected:
- PASS

**Step 3: Manual browser verification**

Verify these cases manually:
- Vite proxy healthy, backend healthy -> readiness dashboard renders
- backend process down -> transport/bootstrap failure state renders
- wrong backend or stale backend -> explicit unsupported/stale state renders
- readiness capability absent -> unsupported-capability state renders
- auth unavailable -> auth-focused bootstrap state renders

**Step 4: Commit**

```bash
git add web services/platform-api scripts
git commit -m "test: verify readiness bootstrap compatibility flow"
```

## Risks

1. Browser fetch security prevents exact differentiation of every transport failure. The UI must therefore classify some failures as a controlled `transport/bootstrap unreachable` bucket with concrete remediation, not pretend to know more than the browser exposes.
2. If launcher provenance is not stamped consistently, the runtime contract will be too weak to detect stale-backend cases reliably.
3. If the admin shell owns the gate but pages still perform ungated fetches, the same defect class will recur.

## Out of Scope

1. Rewriting non-admin pages to use the runtime contract.
2. Building a full local process supervisor in the frontend.
3. Expanding the readiness domain itself beyond bootstrap compatibility and current operational-readiness capability gating.

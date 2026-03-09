# Superuser Workspace Implementation Plan

## Worker Tracks

### 1. Superuser Authority

- DB-backed superuser source of truth
- shared `requireSuperuser()` gate
- dedicated `superuser-status` endpoint
- backend authority layer only

### 2. Superuser Entry And Shell

- `useSuperuserProbe.ts`
- `SuperuserGuard.tsx`
- `/app/superuser` route registration
- another button in the account-card pullout for superusers, positioned to the left of Settings, the same size as Settings, with one small icon
- account-card entrypoint in `LeftRailShadcn.tsx`
- shell and header labeling
- client access and navigation layer

### 3. Workspace Runtime

- File System Access API lifecycle
- persisted folder and workspace session state
- Ark UI file tree
- MDXEditor-first editor contract
- CodeMirror fallback
- save behavior
- theme behavior
- unsupported-file behavior

### 4. Workspace Assembly And Verification

- connect the runtime into `/app/superuser`
- verify route and menu access
- verify persisted folder behavior
- verify file open, save, and editor switching behavior

---

## Ground Truth

- The repo already contains a DB-backed superuser migration in `supabase/migrations/20260308150000_072_registry_superuser_profiles.sql`.
- The shared server gate already exists in `supabase/functions/_shared/superuser.ts`.
- The client probe still hits `admin-config` in `web/src/hooks/useSuperuserProbe.ts`.
- The repo already contains partial `/app/superuser` wiring in `web/src/router.tsx`, `web/src/pages/superuser/SuperuserGuard.tsx`, and `web/src/components/shell/LeftRailShadcn.tsx`.
- The first two tracks are therefore a reconciliation and cleanup pass, not a greenfield build.

---

## Track 1: Superuser Authority

**Goal:** keep the new table as the only superuser authority, keep one shared server gate, and expose a dedicated `superuser-status` endpoint for client gating.

**Files**

- Confirm: `supabase/migrations/20260308150000_072_registry_superuser_profiles.sql`
- Modify: `supabase/functions/_shared/superuser.ts`
- Create: `supabase/functions/superuser-status/index.ts`
- Modify: `supabase/config.toml`
- Verify callers:
  - `supabase/functions/admin-config/index.ts`
  - `supabase/functions/admin-services/index.ts`
  - `supabase/functions/admin-database-browser/index.ts`
  - `supabase/functions/admin-integration-catalog/index.ts`

**Plan**

- Keep `registry_superuser_profiles` as the sole authority for superuser designation.
- Keep the current email-based matching contract unless and until a separate migration changes that authority model.
- Refactor `superuser.ts` only as needed to support:
  - shared lookup logic
  - existing `requireSuperuser()` callers
  - a new lightweight status endpoint
- Add `GET /functions/v1/superuser-status` as a minimal authenticated probe for the web app.

**Recommended response contract**

```json
{
  "authenticated": true,
  "is_superuser": true,
  "viewer": {
    "user_id": "uuid",
    "email": "user@example.com"
  }
}
```

- For authenticated non-superusers, return `200` with `is_superuser: false`.
- For invalid or missing auth, return `401`.
- Do not reuse `admin-config` for superuser membership probing after this track lands.

**Verification**

- Shared helper tests cover missing auth, invalid auth, inactive row, and active row.
- `superuser-status` tests cover `401`, `200 false`, and `200 true`.
- Existing admin function tests still pass without changing their public contract.

**Dependency**

- This track goes first. Track 2 depends only on the final `superuser-status` contract.

---

## Track 2: Superuser Entry And Shell

**Goal:** move the web app off the `admin-config` probe, make `/app/superuser` a real gated entrypoint, and remove optimistic access behavior from the superuser path itself.

**Files**

- Modify: `web/src/hooks/useSuperuserProbe.ts`
- Modify: `web/src/pages/superuser/SuperuserGuard.tsx`
- Modify: `web/src/router.tsx`
- Modify: `web/src/components/shell/LeftRailShadcn.tsx`
- Modify: `web/src/components/common/useShellHeaderTitle.tsx`
- Modify: `web/src/components/shell/LeftRailShadcn.test.tsx`
- Create or update:
  - `web/src/hooks/useSuperuserProbe.test.ts`
  - `web/src/pages/superuser/SuperuserGuard.test.tsx`

**Plan**

- Replace the current `admin-config?audit_limit=0` probe in `useSuperuserProbe.ts` with `superuser-status`.
- Change the hook from `boolean | null` to a structured result:
  - `loading`
  - `authenticated`
  - `isSuperuser`
- Keep module-level caching, but expose a reset path for sign-out or auth refresh.
- Reconcile the existing partial `/app/superuser` route so it is no longer optimistic or bypassed.
- In `SuperuserGuard.tsx`:
  - show a loading state while probing
  - render the outlet only for `authenticated && isSuperuser`
  - redirect everything else to `/app`
- In `LeftRailShadcn.tsx`, the account card pullout has another button for superusers, positioned to the left of Settings, the same size as Settings, with one small icon.
- Show that extra button only when `isSuperuser === true`.
- Do not render the menu item during loading.
- Do not treat unknown or `null` state as allowed.
- Update `useShellHeaderTitle.tsx` so `/app/superuser` resolves to `Superuser`, not `Settings`.

**Verification**

- Hook test:
  - `401` -> unauthenticated
  - `200 false` -> hidden menu + blocked route
  - `200 true` -> visible menu + allowed route
- Guard test:
  - direct navigation to `/app/superuser` never mounts for false or unauthenticated viewers
- Rail test:
  - `Superuser Tools` appears only for `true`
  - clicking it navigates to `/app/superuser`
- Repo grep check:
  - no remaining client membership probe from `useSuperuserProbe.ts` calls `admin-config`

**Dependency**

- Start only after Track 1 finalizes the `superuser-status` response contract.

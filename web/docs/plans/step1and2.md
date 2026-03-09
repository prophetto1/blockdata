The live writing-system repo does not yet have a DB-backed superuser authority. Supabase MCP shows no registry_superuser_profiles table in the current database, and the repo has no matching migration yet. Current authority is still the env allowlist in superuser.ts and superuser.py. The client probe in useSuperuserProbe.ts still hits admin-config, and there is no live /app/superuser route in router.tsx.

Part 1: Superuser DB And Server Contract

Goal: make the new table the only authority for superuser membership, keep one shared server gate, and add a dedicated superuser-status endpoint for client gating.

Files:

Create: 20260308150000_072_registry_superuser_profiles.sql
Modify: superuser.ts
Create: superuser-status/index.ts
Create: superuser-status/config.toml
Modify: config.toml
Modify: superuser.py
Create: superuser.test.ts
Create: index.test.ts
Plan:

Create public.registry_superuser_profiles keyed by user_id uuid.
Store email as an audit snapshot, not as the authority key.
Include is_active boolean not null default true, granted_by uuid null, notes text null, created_at, updated_at.
Enable RLS, but do not add client-facing select/update policies. This table should be read only by service-role code.
Refactor superuser.ts into two layers:
getSuperuserContext(req): Promise<SuperuserContext | null>
requireSuperuser(req): Promise<SuperuserContext> as the throwing wrapper used by admin functions.
Remove all SUPERUSER_EMAIL_ALLOWLIST logic from the Deno helper.
Mirror the same lookup in superuser.py so the pipeline-worker admin routes use the same DB authority.
Keep existing server endpoints on requireSuperuser(): admin-config/index.ts, admin-services/index.ts, admin-database-browser/index.ts, and admin-integration-catalog/index.ts.
Add GET /functions/v1/superuser-status as a minimal authenticated status surface.
Recommended response contract:
{
  "authenticated": true,
  "is_superuser": true,
  "viewer": { "user_id": "uuid", "email": "user@example.com" }
}
For authenticated non-superusers, return 200 with is_superuser: false. For invalid or missing auth, return 401.
Do not reuse admin-config for status probing after this part lands.
Verification:

Supabase SQL confirms the table exists and has at least one active row before function rollout.
Shared-helper tests cover: missing auth, invalid auth, inactive row, active row.
superuser-status tests cover: 401, 200 false, 200 true.
Existing admin function tests still pass without changing their public contract.
Rollout constraint:

Migration and initial row bootstrap must happen before removing env-based access. Otherwise every superuser-gated function will lock out.
Part 2: Client Gate And Entrypoint Wiring

Goal: move the web app off the admin-config probe, add the real /app/superuser entrypoint, and make that path non-bypassable even while global auth wiring is still imperfect.

Files:

Modify: useSuperuserProbe.ts
Create: SuperuserGuard.tsx
Create: SuperuserLayout.tsx
Create: SuperuserWorkspace.tsx
Modify: router.tsx
Modify: LeftRailShadcn.tsx
Modify: useShellHeaderTitle.tsx
Modify: LeftRailShadcn.test.tsx
Create: useSuperuserProbe.test.ts
Create: SuperuserGuard.test.tsx
Plan:

Replace the current admin-config?audit_limit=0 probe in useSuperuserProbe.ts with superuser-status.
Change the hook from boolean | null to a structured result:
loading
authenticated
isSuperuser
Cache that result at module scope, but expose a reset path for sign-out or auth refresh.
Add real route files under web/src/pages/superuser/.
SuperuserGuard should:
show a loading state while probing
render the outlet only for authenticated && isSuperuser
redirect everything else to /app
Keep Part 2 scoped: do not solve the global bypass in AuthGuard.tsx yet. The requirement here is that /app/superuser itself is not optimistic or bypassed.
Register /app/superuser in router.tsx with lazy loading for the workspace page.
In LeftRailShadcn.tsx, add the account-menu entry only when isSuperuser === true.
Do not render the menu item during loading, and do not treat null or unknown state as allowed.
Update useShellHeaderTitle.tsx so /app/superuser resolves to Superuser, not Settings.
Leave /app/settings/admin/* and /app/database alone in Part 2 unless you explicitly want to move those into the superuser area now. That is a separate routing cleanup.
Verification:

Hook test: 401 -> unauthenticated, 200 false -> hidden menu + redirect, 200 true -> visible menu + allowed route.
Guard test: direct navigation to /app/superuser never mounts for false/unauthenticated.
Rail test: “Superuser Tools” appears only for true and navigates to /app/superuser.
Repo grep check: no remaining client membership probe calls admin-config from useSuperuserProbe.ts.
Dependency:

Part 2 should not start until Part 1 has finalized the superuser-status response contract. That is the only API Part 2 should depend on.

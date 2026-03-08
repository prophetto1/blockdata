---
title: "2026-03-08 Superuser Workspace Admin Dashboard Assessment"
description: "Quality-gate assessment of the proposed /app/superuser local-file workspace, its superuser access contract, and the move from web-docs implementation patterns into the main web app."
---

# Superuser Workspace Admin Dashboard Assessment

## Plan Metadata

- Source plan under review: no formal implementation plan file was present in `src/content/docs/plans/**` for this feature during review
- Review basis: user-provided architecture contract from the 2026-03-08 session for a new gated `/app/superuser` workspace in `web/`
- Current implementation state reviewed:
  - `web/src/router.tsx`
  - `web/src/hooks/useSuperuserProbe.ts`
  - `web/src/components/shell/LeftRailShadcn.tsx`
  - `web/src/components/common/useShellHeaderTitle.tsx`
  - `web/src/pages/settings/SettingsAdmin.tsx`
  - `web/src/pages/DocumentTest.tsx`
  - `web/src/components/flows/FlowWorkbench.tsx`
  - `web/package.json`
  - `supabase/functions/_shared/superuser.ts`
  - `supabase/migrations/20260308150000_072_registry_superuser_profiles.sql`
- Date reviewed: 2026-03-08
- Reviewer: Codex

## Verdict

**Fail**

The direction is coherent and strategically useful, and the move from `web-docs` into `web` is the right architectural correction. But this is not yet an implementation-ready plan. The current contract mixes access control, local-file workspace behavior, editor selection, runnable code execution, and mirrored vendor documentation into one feature without defining boundaries, fallback rules, sequencing, or operational ownership.

## Findings

### Critical

1. There is no formal implementation plan file for this feature.
   - Evidence: no matching `/app/superuser`, local-file workspace, or admin-dashboard workspace plan was present under `src/content/docs/plans/**` during review.
   - Impact: there is no stable source of truth for scope, sequencing, rollback, or acceptance criteria. The requirement is coherent, but it is still a requirement note, not a plan.

2. The proposed editor contract is technically inconsistent for non-Markdown files.
   - Evidence: the locked requirement in this session already distinguishes MDXEditor as primary for `md` and `mdx`, while arbitrary source files still need a dedicated standalone code editor.
   - Evidence: `web/package.json:16` shows Monaco is installed, but there is no MDXEditor or Sandpack dependency in the current app package.
   - Impact: the current contract still over-compresses the editing model. Without an explicit file-type matrix, the implementation will either choose the wrong editor for YAML/HTML/code files or expand scope mid-build.

3. The access probe contract is not clean enough for a first-class `/app/superuser` route.
   - Evidence: `web/src/hooks/useSuperuserProbe.ts:18` infers superuser status by calling `admin-config?audit_limit=0` and treating `resp.ok` as the role check.
   - Evidence: `supabase/functions/_shared/superuser.ts:21` already has a real superuser gate backed by `registry_superuser_profiles`.
   - Impact: a dedicated route and account-menu action should not depend on an audit/config endpoint side effect. This is brittle, semantically wrong, and likely to create accidental coupling as the admin dashboard grows.

4. The vendor-docs mirror subsystem is required by scope but not actually planned.
   - Evidence: the requirement now says integrated API/component docs must be downloaded and always available.
   - Evidence: the storage decision remains unresolved in the current requirement thread: repo-managed versioned files vs synced Supabase/storage delivery was raised, but no concrete contract was locked.
   - Impact: this is a separate subsystem with its own storage model, refresh jobs, pinning/version rules, legal/source constraints, and offline UX. Leaving it implicit makes the main workspace plan non-executable.

### Major

5. Route placement is only partially locked.
   - Evidence: `web/src/router.tsx:157` defines `/app/settings`, but there is no `/app/superuser` route yet.
   - Evidence: `web/src/components/common/useShellHeaderTitle.tsx:36` already special-cases `/app/superuser` as a settings-level surface.
   - Impact: the shell already anticipates the route, but the information architecture is still ambiguous. The plan needs to decide whether `/app/superuser` is a hidden settings-adjacent route, a new drill section, or the start of a separate admin-dashboard area.

6. The account-menu entrypoint is underspecified.
   - Evidence: `web/src/components/shell/LeftRailShadcn.tsx:150` renders the gear/settings action in the account menu header today.
   - Evidence: `web/src/components/shell/LeftRailShadcn.tsx:182` only exposes the existing menu rows (`Docs`, `Log Out`, etc.).
   - Impact: "a second button in the acct card pullout" is directionally clear, but the plan does not define loading state, hidden-vs-disabled behavior, mobile parity, or the route transition contract once the probe resolves.

7. The File System Access API lifecycle is missing from the plan.
   - Evidence: the requirement locks `window.showDirectoryPicker({ mode: 'readwrite' })`, but no behavior is defined for unsupported browsers, picker cancelation, permission loss, handle persistence, dirty-state tracking, or save failures.
   - Impact: these are not edge cases. They are the operational contract of a local-file workspace.

8. The reused Ark tree patterns are UI references, not a reusable local-workspace data contract.
   - Evidence: `web/src/pages/DocumentTest.tsx:3` and `web/src/components/flows/FlowWorkbench.tsx:20` already use Ark `TreeView`.
   - Evidence: both surfaces are currently fed by project/document data or flow-specific state, not browser `FileSystemHandle` trees.
   - Impact: the plan correctly reuses the visual/tree interaction pattern, but it still needs a separate adapter contract for local directory walking, node identity, rename/delete semantics, and refresh behavior.

9. Sandpack scope is not defined tightly enough.
   - Evidence: the requirement says "Sandpack plugin to make code executable," but does not define which languages/templates are supported, how local files project into a runnable environment, or what happens for unsupported stacks.
   - Impact: Sandpack can be valuable, but without a constrained contract it becomes an open-ended runtime subsystem inside an already broad feature.

10. The access model language is slightly contradictory.
   - Evidence: the locked contract says access is email-based from `registry_superuser_profiles`.
   - Evidence: the UI requirement says the second action is visible only for "superuser ids."
   - Evidence: `supabase/migrations/20260308150000_072_registry_superuser_profiles.sql:7` establishes email-based designation with normalized email matching.
   - Impact: the implementation should not drift into ID-based gating in the client. The plan needs one exact identity rule.

### Minor

11. The admin-dashboard expansion is clear in product direction, but scope boundaries are not yet explicit.
   - Impact: the plan should separate Phase 1 "superuser local workspace" from later "site config and docs-site control" work so the first delivery stays testable.

12. The current app has good base pieces but not the new dependency plan.
   - Evidence: `web/package.json:26` includes Monaco and `web/src/components/flows/FlowWorkbench.tsx:2` already uses it.
   - Impact: adding MDXEditor, Sandpack, and any standalone CodeMirror surface needs an explicit dependency/addition strategy, not an assumption that the existing stack already covers them.

## Specific Gaps, Contradictions, and Ambiguity

- The implementation target is now `web/`, but the planning/reporting location is still `web-docs/`. The plan should say that explicitly so "move out of web-docs" is not misread as "stop documenting in the docs site."
- The editor contract still blurs Markdown editing, arbitrary source editing, and runnable execution into one surface.
- The route is said to be `/app/superuser`, but the shell/header currently treat it as a settings-level surface. That may be fine, but it should be intentional.
- The requirement says the old preview should not come over, but "preview area now is just well designed editor screen" does not define whether rendered preview disappears entirely or becomes a secondary read-only mode.
- Vendor-doc mirror storage, refresh cadence, version pinning, and invalidation are still undecided.
- Non-superuser behavior at `/app/superuser` is not defined: redirect, 403 view, or 404-style concealment.

## Required Changes Before Implementation

1. Write a formal implementation plan file for this feature under `web-docs/src/content/docs/plans/`.
   - It should cover scope, non-goals, phased delivery, rollback, and acceptance criteria.

2. Lock the access contract around a dedicated probe.
   - Replace the current `admin-config?audit_limit=0` probe pattern with a lightweight superuser-status endpoint or equivalent contract.
   - Keep the server source of truth in `registry_superuser_profiles`.

3. Lock the route and entrypoint contract.
   - Add `/app/superuser` as a gated route in `web/src/router.tsx`.
   - Define how the account pullout exposes the second action after `useSuperuserProbe()` resolves.
   - Define non-superuser behavior on direct navigation.

4. Publish a file-type editor matrix.
   - `md` / `mdx`: MDXEditor
   - code and config files (`ts`, `tsx`, `js`, `jsx`, `css`, `py`, `rs`, `go`, `json`, `yaml`, `html`, etc.): standalone code editor surface
   - binaries and unsupported formats: explicit read-only or unsupported state

5. Define the File System Access API workspace contract.
   - picker flow
   - cancellation behavior
   - read/write persistence model
   - unsaved changes and save-all behavior
   - permission loss and reauthorization behavior
   - browser support fallback

6. Define the Sandpack contract as a narrow subsystem.
   - supported languages/templates
   - file projection rules from the local workspace into Sandpack
   - unsupported-runtime behavior
   - execution isolation and reset behavior

7. Split the vendor-doc mirror subsystem into its own plan section or child plan.
   - storage location
   - version pinning
   - refresh/update flow
   - offline serving model
   - source provenance and operator controls

8. Add a verification matrix before implementation begins.
   - non-superuser does not see the superuser action
   - superuser sees the action and can open `/app/superuser`
   - direct route access blocks non-superusers correctly
   - directory picker cancel leaves the workspace stable
   - local edits save back to disk
   - Markdown files open in MDXEditor
   - source/code files open in the standalone code editor
   - runnable Sandpack panes work only for supported templates
   - mirrored vendor docs remain available without external fetches

## Verification Expectations

1. `registry_superuser_profiles` remains the sole authority for superuser designation.
2. `/app/superuser` is inaccessible to non-superusers both from the UI and by direct URL.
3. The account pullout adds the second action only after a successful superuser probe resolves true.
4. The workspace can open a local directory, enumerate files into the Ark tree, and recover cleanly from picker cancelation.
5. `md` and `mdx` files open in MDXEditor with source/rich behavior defined by contract.
6. Arbitrary source files open in the standalone code editor, not via an MDXEditor workaround.
7. Save, rename, delete, and unsaved-change states are deterministic for local files.
8. Sandpack execution is limited to the supported templates and does not claim full-workspace runtime support.
9. Mirrored vendor docs have a defined version/source and remain available offline inside the app.

## Acceptance Criteria Check

- Alignment with stated product direction and constraints: **Pass**
- Clear scope boundaries: **Fail**
- API/data contract clarity: **Partial**
- Dependency and sequencing correctness: **Fail**
- Risk handling and rollback strategy: **Fail**
- Security/auth implications: **Partial**
- Operational readiness: **Fail**
- Test/verification clarity: **Fail**

## Final Recommendation

**No-go until a formal plan is written and the contracts above are locked.**

The product direction is sound: this workspace belongs in `web/`, behind a true superuser route, backed by `registry_superuser_profiles`, and entered from the account pullout. But the current requirement bundle is still too compressed. The next step is not implementation. The next step is turning this contract into a phased plan with a clean superuser probe, a file-type editor matrix, an explicit File System Access lifecycle, and a separate vendor-doc mirror subsystem plan.

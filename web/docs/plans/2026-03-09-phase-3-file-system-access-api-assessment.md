---
title: "2026-03-09 Phase 3 File System Access API Assessment"
description: "Quality-gate assessment of the Phase 3 File System Access API plan for the scaffolded /app/superuser workspace in web/."
---

# Phase 3 File System Access API Assessment

## Plan Metadata

- Source plan under review:
  - `web/docs/plans/part-3-file-system-access-lifecycle copy.md`
  - `web/docs/plans/Implementation-Plan.md`
- Supporting requirements reviewed:
  - `web/docs/plans/requirement.md`
  - `web/docs/plans/2026-03-08-superuser-workspace.md`
- Current implementation state reviewed:
  - `web/src/pages/superuser/SuperuserWorkspace.tsx`
  - `web/src/pages/superuser/SuperuserGuard.tsx`
  - `web/src/hooks/useSuperuserProbe.ts`
  - `web/src/router.tsx`
  - `web/src/components/shell/LeftRailShadcn.tsx`
  - `web/src/components/common/useShellHeaderTitle.tsx`
  - `web/src/components/layout/AppLayout.tsx`
  - `web-docs/src/lib/docs/local-file-handles.ts`
  - `web-docs/src/components/DocsSidebarFileTree.tsx`
  - `web-docs/src/components/SplitEditorView.tsx`
  - `web/package.json`
  - `web/tsconfig.app.json`
- Date reviewed: 2026-03-09
- Reviewer: Codex

## Verdict

**Conditional Pass**

The Phase 3 document is materially stronger than the broader March 8 workspace plan. It separates the File System Access lifecycle from the tree UI and editor layers, reuses the proven docs-site handle storage pattern, and matches the current scaffolded state of `web/`, where `/app/superuser` exists but the page is still only a placeholder. We can start implementation after a short contract cleanup pass. The remaining issues are real, but they are fix-the-plan-now issues, not rewrite-the-direction issues.

## Findings

### Critical

- None.

### Major

1. The plan's type-declaration step is stale for this repo.
   - Evidence: `web/tsconfig.app.json` already includes `DOM` and `DOM.Iterable`.
   - Evidence: the installed TypeScript DOM libs already define `FileSystemDirectoryHandle`, `FileSystemFileHandle`, and async directory iteration.
   - Impact: adding broad duplicate global declarations in `web/src/lib/fs-access.ts` is unnecessary and can create confusing local overrides. The plan should change from "declare all types" to "add only the smallest missing augmentation if TypeScript actually requires it."

2. The exported session contract contradicts the abstraction boundary it is trying to create.
   - Evidence: the plan says Parts 4 and 5 should not touch the raw browser API directly.
   - Evidence: `FsWorkspaceState.ready` still exposes `rootHandle: FileSystemDirectoryHandle`.
   - Evidence: Step 6 defines `readFile()` and `writeFile()`, but the plan does not clearly mark them as exported even though later parts need file I/O.
   - Impact: consumers either stay coupled to the raw handle or they cannot perform reads and writes through a complete public API. The plan should choose one contract and make it explicit.

3. Relative-path validation is under-specified.
   - Evidence: the proposed `resolveFileHandle()` splits on `'/'` and walks segments without rejecting empty segments, `'.'`, `'..'`, leading slashes, or backslash-based input.
   - Impact: even in a local-only workspace, the adapter should define strict path normalization rules. Without that, later consumers can produce brittle reads, writes, and error handling.

4. The plan assumes eager full-tree recursion without defining a scale boundary.
   - Evidence: `readDirectory()` recursively walks the entire directory and returns a full JSON tree before the rail is ready.
   - Evidence: the current requirement allows opening arbitrary local folders, not just a small docs subtree.
   - Impact: this can become slow or visibly blocking on large repos even with noise filtering. The plan should define whether v1 accepts eager scans, what directories are excluded, and what user-visible loading behavior is required while scanning.

5. The test plan is too light for the amount of lifecycle logic being introduced.
   - Evidence: the current test section only promises `isFileSystemAccessSupported()` checks, type-shape checks, and exported-function existence.
   - Impact: the risky logic is elsewhere: sorting, ignore rules, restore fallback, path validation, and read/write resolution. Those should be factored into testable helpers or covered with browser-capable integration tests before calling the module ready.

6. The high-level implementation plan is not yet aligned with the stronger Phase 3 document.
   - Evidence: `web/docs/plans/Implementation-Plan.md` still groups File System Access lifecycle, persisted session state, Ark tree, editor contract, save behavior, theme behavior, and unsupported-file behavior into one track.
   - Evidence: the dedicated Phase 3 document correctly narrows scope to the adapter and defers tree UI and editor surfaces to later parts.
   - Impact: kickoff can drift unless one document is declared authoritative. The top-level plan should point to Phase 3 as the source of truth for the adapter layer and keep Parts 4 and 5 out of the first implementation slice.

### Minor

1. The source file name still ends with `copy`.
   - Impact: that makes it look provisional even though it is now the best implementation-ready document in the set.

2. The ignore list is good, but it should be confirmed against repo reality before coding starts.
   - Evidence: the plan skips `.git`, `.DS_Store`, `node_modules`, `__pycache__`, `dist`, and `build`.
   - Impact: depending on the folders superusers are likely to open, v1 may also want explicit handling for `coverage`, `.next`, `.turbo`, `.cache`, and similar generated trees.

3. The restore contract is clear, but the gesture boundary should be called out once more in the consuming-layer docs.
   - Evidence: `openWorkspaceFolder()` must be called from a user action.
   - Impact: the later UI parts should avoid wrapping it in async flows that break the browser's transient activation requirement.

## Specific Gaps, Contradictions, and Ambiguity

- The dedicated Phase 3 plan says consumers should not touch raw browser APIs, but the proposed ready-state still hands them the raw root handle.
- The file I/O API is described, but its public export surface is not locked.
- The plan is strong on restore behavior after permission loss, but not yet strong on malformed path input.
- The large-folder behavior is implied, not defined.
- The top-level implementation plan still reads as if Phase 3 includes the Ark tree and editor surfaces, while the dedicated lifecycle document correctly treats those as later consumers.

## Required Changes Before Implementation

1. Remove or narrow the global type-declaration step.
   - Treat TypeScript DOM support as present by default in this repo.
   - Add only targeted augmentations if a concrete compiler error remains.

2. Lock the public adapter contract.
   - Either keep `rootHandle` private and expose `readFile` and `writeFile` as the only public file I/O surface, or explicitly document why consumers may hold the handle.
   - Mark the intended public exports in the plan, not just the internal helpers.

3. Add strict path-normalization rules.
   - Reject empty paths, absolute paths, backslash-only paths, `.` segments, and `..` segments.
   - Define the exact error behavior for invalid paths.

4. Define the v1 tree-scan boundary.
   - Confirm that eager recursive loading is acceptable for the intended folder sizes, or add a follow-up requirement for lazy branch loading.
   - Lock the loading-state expectation while a scan is in progress.

5. Upgrade the test plan before starting code.
   - Cover ignore rules and sort order.
   - Cover path validation and handle resolution behavior.
   - Cover restore fallback to `idle` when permission is not reusable.
   - Keep browser-only integration checks in Chrome for real picker and writable-stream behavior.

6. Update `Implementation-Plan.md` so Track 3 does not overstate scope.
   - Make the File System Access adapter the first slice.
   - Point the Ark tree and editor work to later parts.

## Verification Expectations

1. `web/src/lib/fs-access.ts` is the only module in `web/` that touches `showDirectoryPicker`, handle permission methods, IndexedDB handle storage, or writable file streams.
2. A restored handle returns `ready` only when permission is actually reusable.
3. A non-reusable stored handle falls back to `idle` and clears saved workspace state.
4. Picker cancelation returns control cleanly without breaking the current workspace state.
5. Directory nodes are sorted with directories first, then alphabetical order within each group.
6. Noise directories and dotfiles are excluded according to the locked rule set.
7. Invalid relative paths are rejected deterministically before any handle walk occurs.
8. File reads and writes resolve from the stored root handle by normalized relative path only.
9. The temporary `/app/superuser` scaffold can consume the adapter without importing File System Access browser primitives directly.

## Acceptance Criteria Check

- Alignment with stated product direction and constraints: **Pass**
- Clear scope boundaries: **Pass with changes**
- API/data contract clarity: **Partial**
- Dependency and sequencing correctness: **Pass with changes**
- Risk handling and rollback strategy: **Partial**
- Security/auth implications: **Pass with changes**
- Operational readiness: **Partial**
- Test/verification clarity: **Partial**

## Final Recommendation

**Go for implementation after a short plan cleanup, not before.**

The scaffolded superuser surface in `web/` is ready for a real adapter layer: the route exists, the page is still empty, Ark TreeView patterns already exist in the app, and the docs site provides a working handle-storage reference. The dedicated Phase 3 lifecycle plan is the right foundation. Before coding starts, tighten the public API, remove the stale type-declaration assumption, define path validation, and strengthen the test contract. Once those edits are made, this phase is implementation-ready.

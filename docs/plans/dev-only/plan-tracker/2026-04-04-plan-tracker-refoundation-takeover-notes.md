# Plan Tracker Refoundation Takeover Notes

## Inherited Inputs

- Existing implementation plan: `docs/plans/dev-docs-site/2026-04-03-plan-tracker-workbench-implementation-plan.md`
- Intent source: `docs/plans/dev-docs-site/requirements-0403`
- Mounted tracker route: `web/src/pages/superuser/PlanTracker.tsx`
- Current tracker orchestration and model: `web/src/pages/superuser/usePlanTracker.tsx`, `web/src/pages/superuser/planTrackerModel.ts`
- Existing workspace foundation: `web/src/pages/superuser/TestIntegrations.tsx`, `web/src/pages/superuser/useWorkspaceEditor.tsx`, `web/src/pages/superuser/WorkspaceFileTree.tsx`, `web/src/pages/superuser/MdxEditorSurface.tsx`, `web/src/components/workbench/Workbench.tsx`

## Trust Matrix

| Claim | Classification | Notes |
|------|----------------|-------|
| Phase 1 requires no platform API changes | Verified | Current and intended tracker flow remains browser-local File System Access API only |
| Phase 1 requires no database migrations | Verified | No new persistent backend state is required for the refoundation |
| Phase 1 requires no edge functions | Verified | No edge runtime is used by the tracker flow |
| The route should live at `/app/superuser/plan-tracker` | Verified | Route already exists and still matches the intended ownership model |
| The tracker should use metadata-derived plan grouping instead of raw directory shape | Verified | This remains the correct product model |
| The previous 4-pane custom-rail shell is the right frontend foundation | Contradicted | The mounted shell drifted from the agreed reference and hid the existing workspace/file-editor foundation |
| The existing Test Integrations workspace is the best starting point for the shell/editor/FSA stack | Verified | It already composes the workbench, file system access, file viewer/editor, and save behaviors correctly |
| The raw repo directory tree should be the primary left-side experience | Contradicted | The user wants metadata-driven state tabs and filtered plan units, not literal directory shape |

## Plan Drift Findings

1. The current tracker route uses a custom 4-pane rail layout instead of the proven 3-column workspace shell already present in `TestIntegrations`.
2. The current frontend hides the file-system-backed reality rather than reusing the existing workspace editor foundation that already exposes it cleanly.
3. The raw `WorkspaceFileTree` is useful as a reference and as an FSA primitive, but it is not the product model for plan navigation.
4. The existing `planTrackerModel.ts` and workflow logic remain salvageable; the main rewrite is the page-level and hook-level shell composition.

## Salvage or Rewrite Decision

Rewrite.

Reason:

- The metadata model, document parsing, filename heuristics, and workflow action semantics are still usable.
- The mounted frontend foundation is wrong enough that patching it would preserve the mistaken shell assumptions.
- The replacement plan should explicitly re-base the tracker on the existing `TestIntegrations`/`useWorkspaceEditor` workspace contract while preserving the browser-local metadata/workflow model.

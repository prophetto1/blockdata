AGChain Models Page Refactor Gate Checklist (Frontend-First Start)
Scope: `web/src/pages/agchain/AgchainModelsPage.tsx`, `web/src/pages/admin/AgchainAdminModelsPage.tsx`, and required new/replace components/hooks.

1) Contract alignment (required)
- Confirm requirement split is enforced:  
  - Project page = project-scoped provider credentials only.  
  - Admin page = provider/model registry only; no secret input/control.  
- Confirm no one feature has both responsibilities before starting implementation.
- Confirm `docs/plans/2026-04-05-agchain-model-surfaces-drift-analysis-and-plan.md` is treated as required scope contract for UX and acceptance.

2) Foundation contract guardrails (apply only where they touch feature code)
- Use tokens/classes from `frontend-foundation-contract-v1` for shared shell/controls.
- Do not add new hardcoded palette values in shared/components when canonical/ratified tokens exist.
- Do not add new ad hoc motion timings/shadows/z-index for shared primitives or shell-bearing pages.
- If any deferred domain is accidentally hit (example: shell ownership convergence), defer it.

3) Project page acceptance (must-have before merge)
- Page renders as settings-style list surface (not split-pane workspace).
- Provider row shows at least:
  - provider identity
  - project credential status
  - last updated/last check timestamp
- Configure/open action is row-scoped and launches centered modal.
- Modal scope is credential-only (no model-target CRUD, no provider registry controls).
- No model creation/edit controls remain on project page.

4) Admin page acceptance (must-have before merge)
- Placeholder-only copy is removed.
- Registry table/editor surface exists.
- Provider interactions open admin editor for provider definition + curated targets.
- No API key/key-secret entry exists on admin page.
- Target management appears only in admin context.

5) Surface split ownership checks (cross-page)
- Project and admin pages use separate data hooks/services for their responsibilities.
- No shared mutation path should mix user credentials and admin registry writes.
- Route ownership remains:  
  - `/app/agchain/models` for project credentials  
  - `/app/agchain-admin/models` for registry

6) UI state checklist (from contract)
Project page:
- loading
- not configured
- configured
- save in progress
- test in progress
- test failed
- save failed
- remove/confirm path if implemented

Admin page:
- provider no targets
- provider disabled
- editor dirty
- add/edit target open
- target health/ping or validation pending

7) Visual parity guardrails (reference-contract match)
- One page-local title/description block.
- One primary bordered registry-style card/panel.
- Compact action affordances.
- Consistent density and spacing with admin/project counterpart.
- Modal appears narrow, restrained, and single-purpose.

8) Build-in-progress change control (to avoid drift)
- No shell rewrite outside models surfaces.
- No route migration unless contract-approved.
- No expanded admin or project scopes beyond two surfaces and ownership boundary.

9) Definition of “good enough” for first pass
- Both pages are functionally and visually in correct ownership shape.
- No regression where project page still “owns” registry editing.
- Admin page no longer appears unimplemented.
- If a guardrail is violated, stop and adjust before adding new features.
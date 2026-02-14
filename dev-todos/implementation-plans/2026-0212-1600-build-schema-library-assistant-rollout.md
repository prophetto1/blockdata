# 2026-0212-1600-build-schema-library-assistant-rollout

filename (UID): `2026-0212-1600-build-schema-library-assistant-rollout.md`
problem: Schema Library and assistant-assisted schema adaptation are defined as the target product direction, but implementation is incomplete and currently limited to partial template browsing scaffolds without full apply, lineage, assistant adaptation, or acceptance evidence.
solution: Deliver Schema Library + assistant-assisted adaptation as one vertical rollout chain that starts with canonical read-only templates, applies templates as project-owned copies, adds assistant-guided modifications with explicit user approval, and finishes with lineage and acceptance evidence.
scope: Library foundation, apply-copy flow, assistant-assisted adaptation, lineage/version traceability, and execution-pipeline compatibility validation.

## Included Implementation Rules

1. Library templates are read-only canonical assets.
2. Applying a template always creates a project-owned copy; no in-place mutation of canonical templates.
3. Template and applied-copy version identity must be explicit and auditable.
4. Assistant suggestions are proposals only and require explicit user confirmation before save.
5. Applied/adapted schemas must remain compatible with the existing `schema_ref` + schema artifact execution pipeline.
6. Minimum template contract fields are required: `template_id`, `template_version`, `name`, `description`, `use_case_tags`, schema payload, and explanation metadata.
7. Rollout sequence is library foundation -> assistant-assisted adaptation -> advanced intelligence.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Establish canonical template source and read-only enforcement for template assets, including full minimum template contract fields plus explanation metadata needed for detail views and assistant context. | Updated template contract implementation in `web/src/lib/schemaTemplates.ts` and canonical template storage module under `supabase/` or `web/src/lib/` with read-only enforcement tests (repo state: template seed file exists, read-only/canonical enforcement is partial) |
| 2 | Complete library foundation UI so users can browse/filter templates and open template detail views that show purpose, use-case fit, field-by-field explanations, sample output shape, and constraints/notes. | Updated `web/src/pages/SchemaTemplates.tsx` and `web/src/pages/SchemaTemplateDetail.tsx` with full contract rendering and tests (repo state: browse/detail scaffold exists, explanation depth and constraints metadata are partial) |
| 3 | Implement apply-copy flows for both "apply to existing project" and "apply to new project" so applying a template creates a project-owned schema artifact with preserved template lineage references. | Updated `web/src/pages/SchemaApply.tsx`, save-flow wiring in `web/src/pages/SchemaWizard.tsx`, and persistence support in `supabase/functions/schemas/index.ts` or companion endpoint with lineage fields (repo state: apply route is scaffold-only) |
| 4 | Build in-schema assistant adaptation panel that supports intent-to-schema adaptation, field-level coaching, prompt-config drafting/refinement, and validation guidance without mutating canonical templates directly. | New assistant UI modules under `web/src/components/schemas/` and backend endpoint `supabase/functions/schema-assist/index.ts` (repo state: missing) |
| 5 | Implement assistant change-preview + user-approval workflow so assistant-proposed changes are reviewable diff operations that users explicitly accept or reject before persistence. | Assistant proposal/review components under `web/src/components/schemas/` and proposal-state handling in `web/src/pages/SchemaWizard.tsx` (repo state: missing) |
| 6 | Implement lineage/version audit path from project-owned schema back to source template (`template_id`, `template_version`, applied timestamp, actor) and expose lineage in schema detail or apply review UI. | Migration plus schema metadata display updates under `supabase/migrations/`, `supabase/functions/schemas/`, and `web/src/pages/Schemas.tsx` (repo state: missing) |
| 7 | Validate execution compatibility by running applied/adapted schemas through the existing run/grid pipeline and recording pass/fail behavior to prove no regression in schema execution paths. | `dev-todos/_complete/2026-0212-schema-library-execution-compatibility-evidence.md` (repo state: missing) |
| 8 | Deliver advanced-intelligence phase items (template recommendation ranking, closest-template suggestions, and feedback-loop capture) and publish final acceptance evidence against all five completion criteria. | `dev-todos/_complete/2026-0212-schema-library-assistant-acceptance-evidence.md` (repo state: missing) |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Canonical-template lock: templates are managed as read-only canonical assets with required metadata fields.
2. Library-UI lock: browse/filter/detail flows expose all required template explanation content.
3. Apply-copy lock: both apply flows create project-owned schema copies with no canonical mutation.
4. Assistant-safety lock: assistant suggestions are proposal-only and require explicit user approval before save.
5. Lineage lock: applied schema can be traced back to source template version through auditable metadata.
6. Pipeline-compatibility lock: applied/adapted schemas execute through existing run/grid flow without contract regression.
7. Final-output lock: `dev-todos/_complete/2026-0212-schema-library-assistant-acceptance-evidence.md` exists and reports all acceptance criteria outcomes.

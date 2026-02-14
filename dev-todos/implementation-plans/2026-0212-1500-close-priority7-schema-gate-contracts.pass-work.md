# Pass Work - 2026-0212-1500-close-priority7-schema-gate-contracts

Source: `dev-todos/action-plans/0212-priority7-schema-contracts-master-spec.md`
Plan: `dev-todos/implementation-plans/2026-0212-1500-close-priority7-schema-gate-contracts.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | 2.1 | Wizard-first manual creation is operational. | action |
| 2 | 2.1 | Advanced editor remains operational with fork-by-default save semantics. | action |
| 3 | 2.1 | Save/idempotency/conflict behavior is deterministic and recoverable. | constraint |
| 4 | 2.1 | Wizard-created schemas are worker/grid compatible via top-level properties + prompt_config. | constraint |
| 5 | 2.1 | Happy-path and conflict-path evidence is recorded. | test |
| 6 | 3 | All creation branches converge on one save boundary: POST /schemas. | constraint |
| 7 | 3 | Edit behavior defaults to fork. | policy |
| 8 | 3 | Conflict behavior must surface explicit, recoverable 409 rename flow. | policy |
| 9 | 7.5 | unique(owner_id, schema_ref) and unique(owner_id, schema_uid). | constraint |
| 10 | 8 | Upload JSON classifier path is not implemented end-to-end yet. | action |
| 11 | 8 | Wizard nullable union toggle authoring parity gap. | action |
| 12 | 8 | Nested object property authoring parity gap. | action |
| 13 | 8 | Explicit compatibility pass/warn result in preview step. | action |
| 14 | 8 / 13.6 | In-wizard JSON escape hatch contract not implemented. | action |
| 15 | 10.3 | 200 create, 200 idempotent, 409 ref conflict, 409 uid conflict, 400 invalid, 405 method. | constraint |
| 16 | 10.4/10.5 | Deterministic schema_ref and schema_uid derivation contracts. | constraint |
| 17 | 11.2 | Required route set (`/start`,`/wizard`,`/templates`,`/templates/:id`,`/apply`,`/advanced`). | constraint |
| 18 | 11.3/11.4 | Global/local navigation and active-state contracts. | policy |
| 19 | 14/16 | Start controller and branch pipelines A-E converge to same save semantics. | action |
| 20 | 15 | Advanced embed mount API + destroy + host persistence contract. | constraint |
| 21 | 18 | Grid column derivation, status display, editing, and review action contracts. | constraint |
| 22 | 20 | Security and ownership contracts for schema flows. | policy |
| 23 | 22.1 / 23 Phase 1 | Gate evidence matrix and phase-1 closure steps. | test |

Non-actionable in this source for this plan scope:
- Canonical terms section, key-file map, and historical baseline prose (reference/context only).
- Optional and deferred sections (`2.2`, `22.2`, `23 Phase 2`, `23 Phase 3`, `24 Out of Scope`) classified as deferred for this plan.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1-4,6-9,15-16 | Save boundary and conflict/hash contracts | partial | `supabase/functions/schemas/index.ts`, `supabase/migrations/20260202125631_002_phase2_schemas_runs_block_annotations.sql` | Core exists; owner duplicate-content-under-new-ref idempotent UX handling is partial. |
| 10 | Upload classifier routing | partial | `web/src/lib/schemaUploadClassifier.ts`, `web/src/pages/SchemaStart.tsx`, `web/src/pages/SchemaWizard.tsx` | Routing exists; gate-proof and parity closure still needed. |
| 11 | Nullable union authoring | yes | `web/src/pages/SchemaWizard.tsx` (`field.nullable`, type `[base, 'null']`) | Implemented. |
| 12 | Nested object parity | partial | `web/src/pages/SchemaWizard.tsx`, `web/src/lib/schemaUploadClassifier.ts` | Wizard object support is limited; upload classifier routes nested objects to advanced. |
| 13 | Preview pass/warn | yes | `web/src/pages/SchemaWizard.tsx` (`evaluateCompatibility`) | Implemented. |
| 14 | In-wizard JSON escape hatch | no | `web/src/pages/SchemaWizard.tsx` | No JSON-edit tab contract found. |
| 17-19 | Route and branch contracts | partial | `web/src/router.tsx`, `web/src/pages/SchemaStart.tsx`, `web/src/components/schemas/SchemaWorkflowNav.tsx`, `web/src/components/shell/nav-config.ts`, `web/src/components/shell/LeftRail.tsx` | Routes/nav exist; contract verification still required. |
| 20 | Advanced embed lifecycle contract | yes | `web/src/lib/metaConfiguratorEmbed.ts`, `web/src/pages/SchemaAdvancedEditor.tsx`, `web/public/meta-configurator-embed/*` | Implemented; requires gate evidence rerun. |
| 21 | Grid semantics | yes | `web/src/lib/schema-fields.ts`, `web/src/components/blocks/BlockViewerGrid.tsx` | Implemented. |
| 22 | Security/ownership | partial | `supabase/functions/schemas/index.ts`, DB RLS/migrations | Auth present; end-to-end ownership test evidence not yet captured in P7 artifact. |
| 23 | Gate evidence package | no | expected `dev-todos/_complete/...` | Missing closure evidence artifacts. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0212-1500-close-priority7-schema-gate-contracts.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Action 3 | covered |
| 2 | Action 6 | covered |
| 3 | Action 1 + Lock 1 | covered |
| 4 | Action 7 + Lock 3 | covered |
| 5 | Action 7 | covered |
| 6 | Rule 1 + Action 1 | covered |
| 7 | Rule 1 + Action 1 | covered |
| 8 | Rule 1 + Action 1 + Action 7 | covered |
| 9 | Rule 2 + Action 1 | covered |
| 10 | Action 2 | covered |
| 11 | Action 3 | covered |
| 12 | Action 3 | covered |
| 13 | Rule 6 + Action 3 | covered |
| 14 | Rule 7 + Action 4 | covered |
| 15 | Rule 2 + Action 1 | covered |
| 16 | Rule 2 + Action 1 | covered |
| 17 | Action 5 | covered |
| 18 | Action 5 | covered |
| 19 | Action 2 + Action 5 | covered |
| 20 | Action 6 | covered |
| 21 | Action 7 | covered |
| 22 | Rule 1 + Action 7 | covered |
| 23 | Action 7 + Action 8 | covered |

Result: 23/23 actionable items tracked. 0 missing. 0 invented actions.

## Pass 5: Guideline Compliance Check

- [x] Filename pattern compliant
- [x] Header fields complete
- [x] Included rules embedded in plan
- [x] Actions in 3-column table
- [x] Full-sentence action descriptions
- [x] Tangible outputs for every action
- [x] Action chain produces downstream work
- [x] Last action is final artifact
- [x] Completion logic has binary locks
- [x] No sign-off/governance process actions
- [x] No invented process-doc outputs
- [x] Vertical-slice scope coverage

Summary counts:
- Pass 1 actionable extracted: 23
- Covered: 23
- Orphans (non-actionable/deferred): 8
- Flagged vague: 0

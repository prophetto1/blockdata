# Pass Work - 2026-0212-1600-build-schema-library-assistant-rollout

Source: `dev-todos/action-plans/0212-schema-library-and-assistant-future-task.md`
Plan: `dev-todos/implementation-plans/2026-0212-1600-build-schema-library-assistant-rollout.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | Why this exists | Start from curated schema library. | action |
| 2 | Why this exists | Use AI assistant to adapt template to project/docs. | action |
| 3 | Why this exists | Save as project-owned schema copy safe to customize. | policy |
| 4 | North-star | Browse schema library templates. | action |
| 5 | North-star | Template detail shows purpose, field explanation, sample output, constraints. | action |
| 6 | North-star | Apply to existing project / apply to new project. | action |
| 7 | North-star | Launch AI assistant for edits, prompt refinement, tradeoff explanation. | action |
| 8 | Critical rules | Templates are read-only canonical assets. | policy |
| 9 | Critical rules | Apply creates project-owned copy only. | policy |
| 10 | Critical rules | Version identity explicit for templates and project copies. | constraint |
| 11 | Critical rules | Assistant suggestions never auto-final; user confirms. | policy |
| 12 | Critical rules | Schema contract remains compatible with current schema artifact model. | constraint |
| 13 | Template contract | Minimum template fields + explanation metadata required. | constraint |
| 14 | AI responsibilities | Intent adaptation, field coaching, prompt support, validation support. | action |
| 15 | Rollout Phase 1 | Template registry + browse/filter + detail + apply copy flow. | action |
| 16 | Rollout Phase 2 | In-schema assistant panel + drafting support + change preview/approval. | action |
| 17 | Rollout Phase 3 | Ranking, closest-template suggestions, feedback loop. | action |
| 18 | Acceptance criteria | 5 acceptance outcomes including lineage audit and unchanged execution pipeline compatibility. | test |

Non-actionable in this source for this plan scope:
- Intro framing text and rationale prose.
- Dependency timing note is treated as scheduling constraint, not direct implementation output.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1,4 | Template library browse/filter surface | partial | `web/src/pages/SchemaTemplates.tsx` | Browse/filter implemented in scaffold form. |
| 5 | Template detail with explanatory metadata | partial | `web/src/pages/SchemaTemplateDetail.tsx`, `web/src/lib/schemaTemplates.ts` | Detail exists, but metadata depth is limited. |
| 2,7,14,16 | AI assistant adaptation surface and backend | no | no `supabase/functions/schema-assist/` in repo | Missing. |
| 3,6,9 | Apply copy to existing/new project | partial | `web/src/pages/SchemaApply.tsx`, `web/src/pages/SchemaWizard.tsx` | Apply route exists as scaffold; full copy flow missing. |
| 8 | Read-only canonical template assets | partial | `web/src/lib/schemaTemplates.ts` | Static constants exist; formal canonical enforcement/audit path missing. |
| 10 | Explicit version identity lineage | partial | `template_version` present in `web/src/lib/schemaTemplates.ts` | End-to-end lineage from applied schema missing. |
| 11 | User-confirmed assistant changes only | no | assistant flow absent | Missing. |
| 12 | Pipeline compatibility with applied/adapted schemas | partial | existing `schemas` + run/grid pipeline files exist | Applied/adapted compatibility evidence not yet captured. |
| 13 | Full template contract fields | partial | `web/src/lib/schemaTemplates.ts` | Core fields exist; explanation metadata contract incomplete. |
| 15 | Phase 1 completed | partial | templates pages exist | Registry/apply-copy completion missing. |
| 17 | Phase 3 advanced intelligence | no | none | Missing. |
| 18 | Acceptance evidence package | no | expected `dev-todos/_complete/...` | Missing. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0212-1600-build-schema-library-assistant-rollout.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Action 2 | covered |
| 2 | Action 4 | covered |
| 3 | Rule 2 + Action 3 | covered |
| 4 | Action 2 | covered |
| 5 | Rule 6 + Action 2 | covered |
| 6 | Action 3 | covered |
| 7 | Action 4 + Action 5 | covered |
| 8 | Rule 1 + Action 1 | covered |
| 9 | Rule 2 + Action 3 | covered |
| 10 | Rule 3 + Action 6 | covered |
| 11 | Rule 4 + Action 5 | covered |
| 12 | Rule 5 + Action 7 | covered |
| 13 | Rule 6 + Action 1 | covered |
| 14 | Action 4 | covered |
| 15 | Action 1 + Action 2 + Action 3 | covered |
| 16 | Action 4 + Action 5 | covered |
| 17 | Action 8 | covered |
| 18 | Action 7 + Action 8 + Completion locks | covered |

Result: 18/18 actionable items tracked. 0 missing. 0 invented actions.

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
- Pass 1 actionable extracted: 18
- Covered: 18
- Orphans (non-actionable/deferred): 2
- Flagged vague: 0

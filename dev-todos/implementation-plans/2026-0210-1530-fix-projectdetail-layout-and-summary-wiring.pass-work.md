# Pass Work - 2026-0210-1530-fix-projectdetail-layout-and-summary-wiring

Source: `dev-todos/action-plans/0210-project-detail-layout-and-wiring.md`  
Plan: `dev-todos/implementation-plans/2026-0210-1530-fix-projectdetail-layout-and-summary-wiring.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | Section 1 | "Restructure ProjectDetail into a three-column layout: Documents | Schema & Actions | Runs." | action |
| 2 | Section 1 | "Change the `SimpleGrid cols={{ base: 1, md: 2 }}` to a 3-column layout on md+ breakpoints." | action |
| 3 | Section 1 | "Move the `Paper ...` (schema/bulk actions bar) into the center column." | action |
| 4 | Section 1 | "On mobile (base), stack: documents -> schema/actions -> runs." | action |
| 5 | Section 2 | Current behavior uses `documentsInScope` from `runsInScope` when schema selected. | constraint |
| 6 | Section 2 | Summary can read "0 document(s)" while documents panel shows items. | constraint |
| 7 | Section 2 | Fix options A/B/C: always show total docs and clarify schema-scoped run coverage. | decision |
| 8 | Section 3 | Overlay status badges are project-level summary badges scoped to selected schema. | policy |
| 9 | Section 3 | "Hide the badges or show contextual message when no runs exist." | action |
| 10 | Section 4 | Page is functionally wired for document list, schema selector, bulk actions, progress, runs, upload/edit/delete. | test |
| 11 | Action Items | "Restructure to 3-column layout." | action |
| 12 | Action Items | "Fix document count scoping." | action |
| 13 | Action Items | "Hide overlay badges when no runs exist." | action |
| 14 | Action Items | "Optional: Add 'Get started' CTA in center column when no runs exist yet." | action |

Non-actionable in this source:
- Screenshot ASCII mockup and explanatory prose about visual disconnect (context, not independent outputs).
- Badge definition paragraph ("What they are") without new implementation instruction.
- Wiring table notes that describe current status where no change is required.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1-4,11 | Three-column layout with center schema/actions panel and mobile order | no | `web/src/pages/ProjectDetail.tsx:677` (`SimpleGrid cols={{ base: 1, md: 2 }}`), schema/actions block rendered above grid at `:614-661` | Two-column layout + detached top bar still present. |
| 5-7,12 | Summary count semantics using total docs + scoped qualifier | partial | `web/src/pages/ProjectDetail.tsx:237-239`, `:654` | Current logic can produce `0 document(s)` when runs are empty for selected schema. |
| 8-9,13-14 | Hide zero-value overlay badges and show contextual no-run guidance | partial | `web/src/pages/ProjectDetail.tsx:648-661`, `:733` | Badges always render with zero values; runs panel has empty-state text but no center-column no-run cue. |
| 10 | Existing wiring paths remain operational | yes | `web/src/pages/ProjectDetail.tsx` (bulk actions at `:614/:624/:634/:644`, upload route, edit/delete handlers, runs empty-state text) | Functional wiring exists and must be preserved while refactoring layout/summary. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0210-1530-fix-projectdetail-layout-and-summary-wiring.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Action 1 | covered |
| 2 | Action 1 | covered |
| 3 | Action 1 | covered |
| 4 | Action 2 | covered |
| 5 | Rule 3 + Action 3 | covered |
| 6 | Rule 3 + Action 3 | covered |
| 7 | Action 3 | covered |
| 8 | Rule 4 + Action 4 | covered |
| 9 | Action 4 | covered |
| 10 | Rule 1 + Rule 5 + Action 5 | covered |
| 11 | Action 1 | covered |
| 12 | Action 3 | covered |
| 13 | Action 4 | covered |
| 14 | Action 4 | covered |

Result: 14/14 actionable items tracked. 0 missing. 0 invented actions.

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
- Pass 1 actionable extracted: 14
- Covered: 14
- Orphans (non-actionable): 3
- Flagged vague: 0


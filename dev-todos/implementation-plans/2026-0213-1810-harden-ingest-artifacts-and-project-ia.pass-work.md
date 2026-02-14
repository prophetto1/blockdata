# Pass Work - 2026-0213-1810-harden-ingest-artifacts-and-project-ia

Source: `dev-todos/specs/0213-reflections.md`  
Plan: `dev-todos/implementation-plans/2026-0213-1810-harden-ingest-artifacts-and-project-ia.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | Issue 1 | "Post-ingest integration work should be sequenced after core pipeline hardening..." | policy |
| 2 | Issue 1 | "Need a high-level but precise integration output contract now." | action |
| 3 | User-centered ingest | Workflow should be project -> upload -> monitor -> review completion. | constraint |
| 4 | User-centered ingest | Users should not need parser-track internals (`mdast/docling/pandoc`). | policy |
| 5 | User-centered ingest | UI should show per-file progress/status during multi-file upload. | action |
| 6 | User-centered ingest | Progress UX can be modal/layer or in-page grid with inline indicators. | decision |
| 7 | Project IA refactor | "Current side-by-side Documents/Runs layout should be refactored." | action |
| 8 | Project IA refactor | "Projects page should use document-first master/detail layout." | action |
| 9 | Project IA refactor | Right pane switches by left selection. | constraint |
| 10 | Project IA refactor | Right pane grid keeps header/index fixed/sticky. | constraint |
| 11 | Left pane choice | Left list should not use AG Grid. | policy |
| 12 | Left pane choice | Left pane should optimize selection/status simplicity. | constraint |
| 13 | Left pane choice | AG Grid remains focused on right pane/block-level capabilities. | policy |
| 14 | Run execution model | Runs should not be permanent side column. | action |
| 15 | Run execution model | Runs initiated as explicit actions on selected documents. | action |
| 16 | Run execution model | Document table should include stable metadata columns. | action |
| 17 | Run execution model | Bulk/manual selection controls should be first-class. | action |
| 18 | Issue 2.1 | "Make intermediary artifacts truly multi-artifact, not single-artifact." | action |
| 19 | Issue 2.1 | Support multiple downstream pipelines/artifacts per source/conversion. | constraint |
| 20 | Issue 2.2 | Add explicit source adapter contracts (storage + DB), not just upload. | action |
| 21 | Issue 2.3 | Add destination staging contracts per integration class. | action |
| 22 | Issue 2.4.1 | Improve routing from extension-only to extension+content detection. | action |
| 23 | Issue 2.4.2 | Move from single sidecar assumption to artifact manifest. | action |
| 24 | Issue 2.4.3 | Security/ops hardening for connector era (secrets/log sanitization). | action |
| 25 | Issue 2.4.4 | Account for token-aware chunking options (not character-only assumption). | constraint |

Non-actionable in this source:
- Reference repo paths to Unstructured are supporting research pointers.
- Correction note explanations are rationale/context unless mapped to concrete implementation constraints above.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1-2 | Sequenced integration with explicit output contract | partial | No dedicated `0213-integration-output-contract` file found; planning notes exist in source | Contract artifact missing. |
| 3-6 | User-centered ingest progress UX | partial | Upload/project flows exist; detailed per-file status exists in current app but options in source remain design-level | Needs explicit closure evidence tied to this reflection scope. |
| 7-10,14-17 | Document-first master/detail IA and explicit run actions | no | `web/src/pages/ProjectDetail.tsx` still renders two-column Documents/Runs (`SimpleGrid cols={{ base: 1, md: 2 }}`) with dedicated runs panel | Reflection target not implemented. |
| 11-13 | Left lightweight list + right AG Grid focus | partial | Current ProjectDetail left panel uses list-like stack; AG Grid remains in document detail surfaces | Full master/detail contract not complete in project page. |
| 18-19,23 | Multi-artifact conversion + artifact manifest | no | `supabase/migrations/20260213153000_019_ingest_tracks_policy_pandoc_representation.sql` enforces unique `conv_uid`; `supabase/functions/_shared/representation.ts` upserts on `conv_uid`; `supabase/functions/conversion-complete/index.ts` rejects multiple sidecars | Single-artifact assumption still enforced. |
| 20 | Source-adapter contracts beyond upload | no | `supabase/functions/ingest/index.ts` expects `formData` file upload (`file` required) | File-upload-centric ingest remains. |
| 21 | Destination staging contracts | partial | Conceptual docs exist; implementation contract not present in ingest/runtime code | Open. |
| 22 | Extension+content routing | no | `supabase/functions/ingest/routing.ts` resolves route by extension + policy map only | Content-aware detection missing. |
| 24 | Connector-era security/log hardening | partial | `supabase/functions/_shared/sanitize.ts` exists (filename-level sanitization) | Source asks broader connector secret/log hardening not yet evident. |
| 25 | Token-aware chunking assumptions accounted for | partial | No explicit chunking policy implementation tied to this reflection in ingest path | Open/partial. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0213-1810-harden-ingest-artifacts-and-project-ia.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Rule 1 + Action 1 | covered |
| 2 | Action 1 | covered |
| 3 | Rule 2 + Action 2 + Action 8 | covered |
| 4 | Rule 2 + Action 2 | covered |
| 5 | Action 2 + Action 8 | covered |
| 6 | Rule 2 + Action 2 | covered |
| 7 | Action 2 | covered |
| 8 | Action 2 | covered |
| 9 | Rule 3 + Action 2 | covered |
| 10 | Action 2 | covered |
| 11 | Rule 3 + Action 2 | covered |
| 12 | Rule 3 + Action 2 | covered |
| 13 | Rule 3 + Action 2 | covered |
| 14 | Rule 4 + Action 3 | covered |
| 15 | Rule 4 + Action 3 | covered |
| 16 | Action 3 | covered |
| 17 | Action 3 | covered |
| 18 | Rule 5 + Action 4 | covered |
| 19 | Rule 5 + Action 4 | covered |
| 20 | Action 5 | covered |
| 21 | Action 1 + Action 5 | covered |
| 22 | Action 6 | covered |
| 23 | Rule 5 + Action 4 | covered |
| 24 | Action 7 | covered |
| 25 | Action 6 + Action 8 | covered |

Result: 25/25 actionable items tracked. 0 missing. 0 invented actions.

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
- Pass 1 actionable extracted: 25
- Covered: 25
- Orphans (non-actionable): 2
- Flagged vague: 0


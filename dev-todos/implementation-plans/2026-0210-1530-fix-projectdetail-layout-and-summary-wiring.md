# 2026-0210-1530-fix-projectdetail-layout-and-summary-wiring

filename (UID): `2026-0210-1530-fix-projectdetail-layout-and-summary-wiring.md`  
problem: `ProjectDetail` is functionally wired but layout and summary behavior create UX contradictions on fresh projects, especially when a schema is selected with no runs.  
solution: Rebuild `ProjectDetail` as a three-column workspace with schema actions centered between Documents and Runs, fix summary count semantics, and remove no-signal overlay noise when no runs exist.  
scope: `web/src/pages/ProjectDetail.tsx` layout + summary + empty-state behavior, with verification evidence for fresh-project wiring.

## Included Implementation Rules

1. The page remains fully operational for fresh projects that have documents but zero runs.
2. Desktop layout is three columns (`Documents | Schema + Actions | Runs`) and mobile stacks in the order `Documents -> Schema + Actions -> Runs`.
3. Summary copy must not claim `0 document(s)` when project documents are visible; total-document and schema-scoped counts must be explicitly distinguished.
4. Overlay status badges are only shown when they communicate useful run/overlay state.
5. Existing bulk-action guards (`Run All Pending`, `Confirm All`, `Export All`) remain disabled when no runs are in scope.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Refactor the page layout container from the current two-column grid to a responsive three-column grid at `md+`, and relocate the schema selector, bulk actions, summary, and progress block from the top full-width `Paper` into the center column between documents and runs. This closes the visual disconnect called out in the source issue. | Updated `web/src/pages/ProjectDetail.tsx` with three-column desktop layout and center-column schema/actions panel (repo state before action: two-column grid + top bar). |
| 2 | Implement mobile stacking order explicitly so the component order is `Documents -> Schema + Actions -> Runs`, ensuring the schema/action context appears between source documents and run outputs in both desktop and mobile flows. | Updated responsive layout logic in `web/src/pages/ProjectDetail.tsx` with deterministic base-order rendering (repo state before action: top bar detached from stacked panels). |
| 3 | Replace schema-scoped `documentsInScope` summary behavior with dual-count semantics: always show total project documents and separately show schema-scoped run coverage (for example, `3 documents • 0 with runs for <schema>`). Keep overlay totals schema-scoped but clearly labeled. | Updated summary computation and summary copy in `web/src/pages/ProjectDetail.tsx` (repo state before action: summary can show `0 document(s)` while document list is non-empty). |
| 4 | Make no-run behavior explicit by conditionally hiding top-right overlay status badges when no runs exist and rendering a contextual center-column starter message that tells the user to apply a schema/run next. Preserve existing empty-state text in the runs panel. | Updated conditional rendering branches in `web/src/pages/ProjectDetail.tsx` for badge visibility and get-started messaging (repo state before action: zero-value badges render even when runs are absent). |
| 5 | Re-verify all wiring paths listed in the source verification matrix after the layout and summary changes: document list/status/realtime, schema selector, bulk action guards, progress visibility, runs empty state, upload route, edit, and delete project RPC. Record the verification as one consolidated evidence artifact. | `dev-todos/_complete/2026-0210-projectdetail-layout-and-wiring-verification.md` containing binary pass/fail checks tied to the listed wiring paths (repo state before action: no consolidated post-fix evidence artifact). |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Layout lock: `ProjectDetail` renders as three columns on desktop and stacked `Documents -> Schema + Actions -> Runs` on mobile.
2. Summary lock: summary text always includes total project document count and no longer displays misleading `0 document(s)` when documents exist.
3. No-runs lock: overlay badges are hidden or replaced with contextual no-run messaging when run scope is empty.
4. Guard lock: bulk actions still enforce disabled states correctly for empty run scope.
5. Verification lock: `dev-todos/_complete/2026-0210-projectdetail-layout-and-wiring-verification.md` exists with all wiring checks marked pass/fail.


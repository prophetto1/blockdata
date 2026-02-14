# Pass Work - 2026-0211-1535-complete-shell-v2-copilot-platform-foundation

Source: `dev-todos/action-plans/0211-shell-v2-copilot-platform-plan.md`  
Plan: `dev-todos/implementation-plans/2026-0211-1535-complete-shell-v2-copilot-platform-foundation.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | 4 / Intended End State | Persistent 3-region workspace shell (left nav, top bar, right assistant). | action |
| 2 | 4 / Intended End State | Mobile assistant dock collapses to drawer/overlay. | constraint |
| 3 | 6 / SRL-SHELL-3 | Navigation grouped by workflow area. | constraint |
| 4 | 6 / SRL-COPILOT-1 | Copilot state persists across route changes. | constraint |
| 5 | 6 / SRL-COPILOT-2 | Copilot receives route/page context (`project_id`, `schema_id`, `run_id`, selection metadata). | constraint |
| 6 | 6 / SRL-COPILOT-3 | Schema-focused actions wired to `POST /schema-assist`. | action |
| 7 | 6 / SRL-COPILOT-4 | Platform key boundary enforced; no `user_api_keys` dependency. | policy |
| 8 | 6 / SRL-COPILOT-5 | UI copy distinguishes assistant actions from worker-run actions. | policy |
| 9 | 6 / SRL-UX-1 | Wizard-first creation remains primary; advanced editor is escape hatch. | policy |
| 10 | 6 / SRL-UX-2 | Theme/tokens drive shell appearance; no one-off styling. | constraint |
| 11 | 6 / SRL-UX-3 | Density-first baseline, no exact Databricks geometry replication required. | policy |
| 12 | 0.1 | Shell region contract (`LeftRail`, `TopCommandBar`, `MainCanvas`, `AssistantDock`). | constraint |
| 13 | 0.5 | Assistant action contract: `ask`, `suggest`, `apply`, `retry`. | constraint |
| 14 | 0.4 | Assistant context contract payload fields. | constraint |
| 15 | 0.3 | Mobile behavior contract for rail + assistant overlay. | constraint |
| 16 | 0.2 | Header height target 48px. | constraint |
| 17 | 0.2 | Left rail width targets 220/72. | constraint |
| 18 | 0.2 | Assistant dock width target 360 and resizable 320-520. | constraint |
| 19 | 0.2 | Global page padding target 12px desktop. | constraint |
| 20 | 0.2 | Non-critical UI copy target size 12-13px. | constraint |
| 21 | 0.2 | Grid readability guardrail. | constraint |
| 22 | 0.6 | Feature flags include `ff_shell_v2`, `ff_assistant_dock`, `ff_schema_assist` with staged rollout. | constraint |
| 23 | 0.7 | UI copy guardrails for assistant vs worker AI wording. | policy |
| 24 | Phase 1 | Extract shell regions into dedicated components and dock host behavior. | action |
| 25 | Phase 2 | Nav config + workspace home + preserve deep links/breadcrumbs. | action |
| 26 | Phase 3 | Build assistant UI framework (`AssistantPanel`, `Thread`, `Composer`, `ContextChips`, store). | action |
| 27 | Phase 4 | Implement `schema-assist` edge function with required operations and constraints. | action |
| 28 | Phase 5 | Integrate wizard + assistant suggestions + apply flow while preserving save semantics. | action |
| 29 | Phase 6 | Visual system pass with shell-specific tokens and AG Grid alignment. | action |
| 30 | Phase 7 | Add shell/assistant smoke tests. | test |
| 31 | Phase 7 | Add `schema-assist` contract checks. | test |
| 32 | Phase 7 | Add assistant event logging and error categories. | action |
| 33 | Phase 7 | Feature-flagged rollout with rollback path. | constraint |
| 34 | 10 / Definition of Done | Tri-panel default, persistent copilot, backend wired, wizard-first path, visual consistency, feature-flagged rollout. | test |

Non-actionable in this source:
- Canonical references list (input references only).
- Current baseline prose and historical progress log entries (status history, not new implementation actions).
- Risks/mitigations section treated as design context; concrete implementation work captured via extracted constraints/actions above.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1-3,24-25 | Tri-panel shell + grouped nav + workspace home | partial | `web/src/components/layout/AppLayout.tsx`, `web/src/components/shell/LeftRail.tsx`, `web/src/components/shell/TopCommandBar.tsx`, `web/src/components/shell/AssistantDockHost.tsx`, `web/src/components/shell/nav-config.ts`, `web/src/pages/WorkspaceHome.tsx`, `web/src/router.tsx` | Foundation exists; contract completion and consistency verification still required. |
| 4-5,14,26 | Persistent assistant thread + context payload plumbing | no | `web/src/components/assistant` is missing; no `web/src/lib/assistant/store.ts` found | Dock host exists, but assistant UI/state layer is absent. |
| 6,27,31 | `schema-assist` backend operations + contract checks | no | `supabase/functions/` directory listing has no `schema-assist` function | Backend contract remains unimplemented. |
| 7-8,23 | Explicit assistant-vs-worker key/copy boundary in implementation | partial | No `schema-assist` path in `web/src`/`supabase/functions`; worker/user-key paths exist elsewhere | Boundary is conceptually implied by missing integration, not enforced end-to-end in code. |
| 9,28 | Wizard-first + advanced escape with assistant integration | partial | `web/src/pages/SchemaWizard.tsx`, `web/src/pages/SchemaAdvancedEditor.tsx` | Wizard/editor exist, but no assistant integration found. |
| 10-11,16-21,29 | Density/token contract for shell + AG Grid alignment | partial | `web/src/theme.ts` exists; no dedicated shell token contract file found | Theme baseline exists; explicit shell-density contract remains incomplete. |
| 12-13,15 | Formalized shell + assistant action contract in runtime modules | partial | Shell region components exist; no dedicated contract/state module (`ShellState.tsx`) | Missing explicit shared contract surface. |
| 22,33 | Feature flags include `ff_shell_v2`, `ff_assistant_dock`, `ff_schema_assist` | partial | `web/.env.example:6-7`, `web/src/lib/featureFlags.ts:9-10` | First two flags exist; `ff_schema_assist` missing. |
| 30,32,34 | Smoke tests, telemetry, rollout verification artifact | no | No shell/assistant smoke files found under `web/`; no dedicated rollout verification artifact | Verification and observability coverage absent. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0211-1535-complete-shell-v2-copilot-platform-foundation.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Rule 6 + Action 1 | covered |
| 2 | Rule 6 + Action 1 | covered |
| 3 | Action 2 | covered |
| 4 | Action 3 | covered |
| 5 | Action 4 | covered |
| 6 | Action 5 + Action 6 | covered |
| 7 | Rule 2 + Action 5 | covered |
| 8 | Rule 1 + Action 4 | covered |
| 9 | Rule 3 + Action 6 | covered |
| 10 | Rule 5 + Action 7 | covered |
| 11 | Rule 4 + Action 7 | covered |
| 12 | Rule 6 + Action 1 | covered |
| 13 | Rule 7 + Action 6 | covered |
| 14 | Action 4 | covered |
| 15 | Rule 6 + Action 1 | covered |
| 16 | Action 7 | covered |
| 17 | Action 7 | covered |
| 18 | Action 1 + Action 7 | covered |
| 19 | Action 7 | covered |
| 20 | Action 7 | covered |
| 21 | Action 7 | covered |
| 22 | Action 8 | covered |
| 23 | Rule 1 + Action 4 | covered |
| 24 | Action 1 | covered |
| 25 | Action 2 | covered |
| 26 | Action 3 | covered |
| 27 | Action 5 | covered |
| 28 | Action 6 | covered |
| 29 | Action 7 | covered |
| 30 | Action 8 | covered |
| 31 | Action 8 | covered |
| 32 | Action 8 | covered |
| 33 | Action 8 | covered |
| 34 | Completion Logic 1-8 + Actions 1-8 | covered |

Result: 34/34 actionable items tracked. 0 missing. 0 invented actions.

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
- Pass 1 actionable extracted: 34
- Covered: 34
- Orphans (non-actionable): 3
- Flagged vague: 0


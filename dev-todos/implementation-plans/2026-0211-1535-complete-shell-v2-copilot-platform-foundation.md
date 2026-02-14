# 2026-0211-1535-complete-shell-v2-copilot-platform-foundation

filename (UID): `2026-0211-1535-complete-shell-v2-copilot-platform-foundation.md`  
problem: Shell V2 planning is comprehensive, but implementation is split across partial frontend work and missing copilot backend/UI contracts, so the target tri-panel + action-capable assistant experience is not complete end-to-end.  
solution: Complete Shell V2 and copilot integration as one implementation slice that finishes missing shell contracts, assistant UI/state, `schema-assist` backend, wizard integration, and rollout verification while preserving existing partial work.  
scope: authenticated shell regions, navigation IA, copilot dock framework, `schema-assist` edge function, schema-authoring integration, visual-system alignment, and rollout evidence.

## Included Implementation Rules

1. The right-side assistant is the platform internal assistant and is not the same system as user-key worker execution.
2. Schema assistance uses platform-managed keys and never depends on `user_api_keys`.
3. Wizard-first schema creation remains the primary path; advanced JSON editor remains an escape hatch.
4. Databricks screenshot guidance is density/layout reference only, not a geometric clone requirement.
5. Shell visuals must be token-driven and system-wide; avoid page-local shell styling exceptions.
6. Desktop shell remains tri-region (`LeftRail`, `TopCommandBar`, `MainCanvas`, `AssistantDock`) and mobile uses overlay/drawer fallbacks.
7. Assistant actions are constrained to `ask`, `suggest`, `apply`, `retry` for v0 scope.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Consolidate shell runtime state into an explicit shared shell-state module that governs left-rail collapse, assistant dock open/close, assistant dock width persistence, and mobile behavior, then wire `AppLayout` and shell region components to that contract so all authenticated routes use one deterministic shell behavior model. | New `web/src/components/shell/ShellState.tsx` plus updates to `web/src/components/layout/AppLayout.tsx`, `web/src/components/shell/LeftRail.tsx`, `web/src/components/shell/TopCommandBar.tsx`, and `web/src/components/shell/AssistantDockHost.tsx` (repo state before action: shell components exist but no centralized `ShellState.tsx`). |
| 2 | Finish navigation IA and workspace entry contracts by finalizing grouped nav config, preserving deep links/breadcrumbs, and validating route ownership for `/app`, `/app/projects`, `/app/schemas`, and nested project routes under the Shell V2 container. | Updated `web/src/components/shell/nav-config.ts`, `web/src/router.tsx`, and `web/src/pages/WorkspaceHome.tsx` with verified route + active-state behavior (repo state before action: partial implementation exists). |
| 3 | Implement the persistent assistant dock UI framework as reusable components with conversation thread, composer, context chips, loading/error/empty states, and across-route persistence so the assistant surface remains mounted and stateful while navigating. | New `web/src/components/assistant/AssistantPanel.tsx`, `web/src/components/assistant/AssistantThread.tsx`, `web/src/components/assistant/AssistantComposer.tsx`, `web/src/components/assistant/ContextChips.tsx`, and `web/src/lib/assistant/store.ts` (repo state before action: assistant component directory is missing). |
| 4 | Implement assistant context contract plumbing so each turn carries route + relevant ids (`project_id`, `schema_id`, `run_id`) and selection summary metadata; include strict UI copy boundaries that differentiate assistant authoring actions from worker run execution actions on pages where both surfaces appear. | Updated assistant store/request payload builders in `web/src/lib/assistant/store.ts` and integration copy in shell/schema pages (repo state before action: no schema-assist context payload wiring found). |
| 5 | Build the missing `schema-assist` Supabase Edge Function with authenticated JSON-only operations (`suggest_fields`, `suggest_prompts`, `modify_schema`, `question`), strict request validation, and platform-key-only provider calls so schema assistance is backend-complete and contract-testable. | New `supabase/functions/schema-assist/index.ts` (plus shared helpers under `supabase/functions/_shared/`) with operation handlers and validation tests (repo state before action: `supabase/functions/schema-assist/` does not exist). |
| 6 | Integrate assistant actions into schema-authoring surfaces so wizard/editor users can request suggestions and explicitly apply accepted changes into schema draft state while preserving existing save boundary (`POST /schemas`) and conflict behavior. | Updates in `web/src/pages/SchemaWizard.tsx` and `web/src/pages/SchemaAdvancedEditor.tsx` that connect to `schema-assist` and apply accepted suggestions into local draft state (repo state before action: no assistant integration found in these pages). |
| 7 | Complete shell visual-system alignment by defining shell density tokens (rail width, bar height, dock width, spacing, typography scale) and applying them across shell/core pages including AG Grid container wrappers so layout and density are coherent across major workflows. | Updated `web/src/theme.ts`, `web/src/theme.css`, and shell/core page container styles with shell token usage (repo state before action: base theme exists, shell-specific token contract is incomplete). |
| 8 | Add rollout safety and verification coverage by introducing shell/assistant smoke flows, `schema-assist` contract checks, assistant error telemetry categories, and one feature-flagged rollout evidence artifact proving internal rollout + rollback behavior. | Updated checks/scripts plus `dev-todos/_complete/2026-0211-shell-v2-copilot-rollout-verification.md` with binary rollout evidence (repo state before action: no dedicated shell/assistant smoke artifact). |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Shell contract lock: all authenticated routes render through unified shell state with deterministic desktop/mobile behavior.
2. Nav lock: grouped nav + workspace entry + deep links are stable with correct active-state behavior.
3. Assistant UI lock: dock panel, thread, composer, and context chips persist across route transitions.
4. Context lock: assistant payload includes required route/context ids and selection metadata.
5. Backend lock: `schema-assist` edge function is deployed with all four required operations and auth/JSON validation.
6. Integration lock: schema wizard/advanced editor can `ask`, `suggest`, and `apply` assistant outputs without crossing into worker key paths.
7. Visual lock: shell token contract is applied consistently across core pages with no major density mismatch.
8. Rollout lock: feature-flagged smoke and rollback evidence exists in `dev-todos/_complete/2026-0211-shell-v2-copilot-rollout-verification.md`.


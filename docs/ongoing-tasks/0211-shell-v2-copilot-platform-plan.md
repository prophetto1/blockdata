# Shell V2 + Copilot Integration Plan (Databricks-Style Baseline)

**Date:** 2026-02-11  
**Status:** Proposed implementation plan (not started)  
**Owner:** Platform frontend + Supabase functions  
**Scope:** Authenticated app shell, navigation IA, Copilot dock, schema-assist integration, visual system pass

---

## 1) Purpose

Define a structured, trackable implementation plan to evolve the platform UI toward a Databricks-like baseline layout and integrate a Copilot-style assistant that is consistent with current schema/worker specs.

This document is the execution tracker for that work.

---

## 2) Canonical References

- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/frontend/0208-visual-storyboard.md`
- `docs/frontend/design-tokens.md`
- `web/src/components/layout/AppLayout.tsx`
- `web/src/router.tsx`
- `web/src/pages/SchemaAdvancedEditor.tsx`

---

## 3) Current Repo Baseline

1. `AppShell` foundation exists with header + left navbar + main outlet.
2. Schema advanced editor route is live at `/app/schemas/advanced`.
3. Copilot backend endpoint (`/schema-assist`) is specified in docs but not implemented in `supabase/functions`.
4. Theme/tokens are centralized in `web/src/theme.ts`.
5. Side-nav + top-header direction is already aligned with storyboard decisions.

---

## 4) Intended End State

1. A persistent 3-region workspace shell for authenticated routes:
- left navigation rail
- top command/search bar
- right Copilot assistant dock
2. Copilot is platform-native, context-aware, and action-capable (`ask`, `suggest`, `apply`).
3. Schema authoring stays wizard-first with advanced JSON editor as escape hatch.
4. Copilot schema assistance uses platform keys only and remains separated from user API key infrastructure.
5. Visual system (spacing, density, surfaces, typography, panel proportions) feels consistent with a Databricks-style baseline.

---

## 5) Product Clarifications Locked (2026-02-11)

1. The right-side assistant is the platform's internal, customized, custom-trained assistant surface.
2. This assistant is not the same system as user-key worker AI runs.
3. User-provided API keys remain for worker execution on runs after schemas are defined and documents are processed into blocks.
4. The Databricks screenshot is a layout-density reference, not a literal visual clone target.
5. The left nav and top bar do not need the exact same geometric "joined bar" shape from the screenshot.
6. Priority is tighter spacing, smaller/tighter non-critical UI text, and a unified system-wide look and feel while preserving grid clarity.
7. This redesign should be done now, before the surface area grows and retrofit cost increases.

---

## 6) System Requirements List (Plan SRL)

**SRL-SHELL-1**: All authenticated routes render inside one consistent tri-panel shell on desktop.  
**SRL-SHELL-2**: Mobile behavior is defined and functional (assistant dock collapses to drawer/overlay).  
**SRL-SHELL-3**: Navigation is grouped by workflow area, not a flat utility list.  
**SRL-COPILOT-1**: Copilot state persists across route changes within the same session.  
**SRL-COPILOT-2**: Copilot receives route/page context (`project_id`, `schema_id`, `run_id`, selection metadata when available).  
**SRL-COPILOT-3**: Schema-focused actions are wired to `POST /schema-assist` contract.  
**SRL-COPILOT-4**: Platform key boundary is enforced; no dependency on `user_api_keys` for schema assistance.  
**SRL-COPILOT-5**: UI copy and architecture clearly distinguish internal assistant actions from worker-run actions using user keys.  
**SRL-UX-1**: Wizard-first schema creation remains primary path; advanced editor stays escape hatch.  
**SRL-UX-2**: Theme/tokens drive shell appearance; no page-local one-off styling for core shell regions.
**SRL-UX-3**: The shell follows a density-first system and does not require exact Databricks geometry replication.

---

## 7) Phased Plan

## Phase 0 - UX Contract Freeze

**Goal:** Lock behavior before implementation.  
**Deliverables:**
1. Shell region contract (left/top/main/right).
2. Copilot interaction model (`ask`, `suggest`, `apply`, error/retry).
3. Context contract and feature-flag plan.
4. Mobile fallback behavior.

**Verification:**
1. SRL checklist approved in this doc.
2. No unresolved contract ambiguity for shell regions or copilot actions.

---

## Phase 1 - Shell V2 Foundation

**Goal:** Replace current app chrome with explicit shell regions and right dock host.

**Primary files:**
- `web/src/components/layout/AppLayout.tsx`
- `web/src/components/shell/LeftRail.tsx` (new)
- `web/src/components/shell/TopCommandBar.tsx` (new)
- `web/src/components/shell/AssistantDockHost.tsx` (new)
- `web/src/components/shell/ShellState.tsx` (new)

**Key tasks:**
1. Extract shell regions into dedicated components.
2. Add right-panel docking behavior (open/close, resize, persisted preference).
3. Ensure `/app/*` routes render correctly inside the new shell.

**Verification:**
1. Manual route sweep: `/app`, `/app/schemas`, `/app/projects/:projectId`, `/app/projects/:projectId/documents/:sourceUid`.
2. Desktop and mobile layout checks.

---

## Phase 2 - Navigation IA + Workspace Home

**Goal:** Make navigation and workspace entry aligned with a Databricks-like baseline.

**Primary files:**
- `web/src/components/shell/nav-config.ts` (new)
- `web/src/components/layout/AppLayout.tsx`
- `web/src/router.tsx`
- `web/src/pages/WorkspaceHome.tsx` (new) or `web/src/pages/Projects.tsx` extension

**Key tasks:**
1. Move nav structure into config with section groups.
2. Add global workspace home surface with quick actions + recent items + status summary.
3. Preserve existing deep links and breadcrumbs.

**Verification:**
1. Active nav state is correct for nested routes.
2. Top-level workflows are reachable in <=2 clicks.

---

## Phase 3 - Copilot Dock UI Framework

**Goal:** Ship a persistent, reusable assistant UI shell before backend wiring.

**Primary files:**
- `web/src/components/assistant/AssistantPanel.tsx` (new)
- `web/src/components/assistant/AssistantThread.tsx` (new)
- `web/src/components/assistant/AssistantComposer.tsx` (new)
- `web/src/components/assistant/ContextChips.tsx` (new)
- `web/src/lib/assistant/store.ts` (new)

**Key tasks:**
1. Implement dock UI and thread state.
2. Add route/context chips to each prompt turn.
3. Add loading/error/empty states and keyboard behavior.

**Verification:**
1. Panel remains mounted across route transitions.
2. Thread and draft persist while navigating.

---

## Phase 4 - Backend `schema-assist` Edge Function

**Goal:** Implement server contract for schema copilot operations.

**Primary files:**
- `supabase/functions/schema-assist/index.ts` (new)
- `supabase/functions/_shared/*` (reuse/create helpers)
- `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md` (update status section)

**Required operations:**
1. `suggest_fields`
2. `suggest_prompts`
3. `modify_schema`
4. `question`

**Constraints:**
1. Authenticated JWT required.
2. JSON-only responses.
3. Suggested schemas maintain v0 compatibility (`type: object`, top-level `properties` for worker/grid path).
4. No dependency on user-key storage.

**Verification:**
1. Contract-level request/response validation.
2. Failure-path tests for invalid operation and malformed payload.

---

## Phase 5 - Wizard + Copilot Integration

**Goal:** Make schema creation wizard-first with assistant help integrated into steps.

**Primary files:**
- `web/src/pages/Schemas.tsx`
- `web/src/pages/SchemaWizard.tsx` (new)
- `web/src/components/schema-wizard/*` (new)
- `web/src/pages/SchemaAdvancedEditor.tsx` (compatibility + handoff tightening)

**Key tasks:**
1. Implement wizard steps per canonical spec.
2. Connect Copilot suggestions into field/prompt authoring flow.
3. Keep advanced editor as full-screen power-user route.
4. Preserve fork-by-default save semantics and 409 conflict handling.

**Verification:**
1. User creates schema without writing JSON.
2. Suggested schema can be applied and saved through existing `POST /schemas` path.
3. Wizard output remains compatible with worker/grid conventions.

---

## Phase 6 - Visual System Pass (Databricks-Like Baseline)

**Goal:** Align shell and key surfaces around one coherent density/visual language.

**Primary files:**
- `web/src/theme.ts`
- `web/src/theme.css`
- `docs/frontend/design-tokens.md`
- `web/src/components/blocks/BlockViewerGrid.tsx` (visual token alignment only)

**Key tasks:**
1. Define shell-specific tokens: rail width, command bar height, assistant dock width, panel spacing.
2. Increase hierarchy clarity (surface levels, borders, section headers, list density).
3. Align AG Grid container styling with shell tokens.

**Verification:**
1. No major visual mismatch across Projects, ProjectDetail, DocumentDetail, Schemas.
2. Dark/light mode remains legible and structurally consistent.

---

## Phase 7 - QA, Observability, Rollout

**Goal:** Ship safely with staged rollout and measurable behavior.

**Primary files:**
- frontend smoke/interaction tests (location TBD in `web/`)
- `docs/ongoing-tasks/0210-work-done-status-log.md` (status updates)

**Key tasks:**
1. Add smoke tests for shell rendering and assistant open/send flows.
2. Add schema-assist API contract checks.
3. Add event logging for assistant actions and error categories.
4. Gate rollout behind feature flags for internal users first.

**Verification:**
1. Core smoke checks pass before enabling broadly.
2. Rollback path is documented (feature flag off restores old behavior).

---

## 8) Risks and Mitigations

1. **Risk:** Layout refactor breaks existing page spacing and nav behavior.  
**Mitigation:** Phase 1 is structure-only, preserve route surfaces and run route sweep after each shell change.

2. **Risk:** Copilot scope expands into generic chat before action wiring is stable.  
**Mitigation:** Keep v0 action set strict (`ask`, `suggest`, `apply`) with schema-first workflows.

3. **Risk:** Advanced editor and wizard diverge on schema conventions.  
**Mitigation:** Shared schema normalizer + compatibility validator used by both flows.

4. **Risk:** Key boundary confusion between platform AI and user-run AI.  
**Mitigation:** Enforce separate code path and configuration for `schema-assist`.

---

## 9) Tracking Checklist

- [ ] Phase 0 complete
- [ ] Phase 1 complete
- [ ] Phase 2 complete
- [ ] Phase 3 complete
- [ ] Phase 4 complete
- [ ] Phase 5 complete
- [ ] Phase 6 complete
- [ ] Phase 7 complete

---

## 10) Definition of Done

1. Tri-panel shell is the default authenticated app layout.
2. Copilot panel is persistent, context-aware, and operational.
3. `schema-assist` endpoint is implemented and wired to frontend assistant actions.
4. Schema creation path is wizard-first and supports assisted authoring.
5. Visual/token system produces consistent shell behavior across core pages.
6. Rollout is feature-flagged with baseline observability.

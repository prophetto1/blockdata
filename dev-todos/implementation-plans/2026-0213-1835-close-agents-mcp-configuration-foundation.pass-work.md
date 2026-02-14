# Pass Work - 2026-0213-1835-close-agents-mcp-configuration-foundation

Source: `dev-todos/specs/0213-agents-mcp-configuration-foundation.md`  
Plan: `dev-todos/implementation-plans/2026-0213-1835-close-agents-mcp-configuration-foundation.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | Rollout constraints | Build-only foundation; runtime execution/chat/tooling deferred. | policy |
| 2 | Rollout constraints | Keep `agentsConfigUI`, `mcpPlaceholderUI`, `providerConnectionFlows` off by default until rollout approval. | constraint |
| 3 | Task 1 | Add `agent_catalog` + `user_agent_configs` schema contract. | action |
| 4 | Task 2 | Add `user_provider_connections` table for non-key auth records. | action |
| 5 | Task 3 | Implement `agent-config` edge API (`GET`, `POST/PATCH`, readiness computation). | action |
| 6 | Task 4 | Implement `provider-connections` API (`connect/disconnect/status`) for Vertex SA in v1. | action |
| 7 | Task 4A | Fix `/app/integrations` shell route parity. | action |
| 8 | Task 5 | Add routes/nav for `/app/agents`, `/app/mcp`, `/app/commands` (flag-aware). | action |
| 9 | Task 6 | Agents page with search + provider cards/status. | action |
| 10 | Task 6A | First-time onboarding wizard with 3-step flow and back navigation. | action |
| 11 | Task 7 | Provider-specific configure modal framework + validations. | action |
| 12 | Task 8 | Wire save/test/connect flows to edge APIs with feedback UX. | action |
| 13 | Task 9 | MCP placeholder page/cards and optional selected-server persistence. | action |
| 14 | Task 10 | Secret handling, normalization, accessibility hardening. | action |
| 15 | Task 11 | Frontend tests for modal readiness/validation matrix. | test |
| 16 | Task 12 | Edge/API tests + deterministic smoke checks. | test |
| 17 | Task 13 | Feature flags + staged release plan. | action |
| 18 | Definition of Done | Acceptance criteria 1-10 must pass (provider readiness, routes, secrets, wizard parity, persisted default, etc.). | test |

Non-actionable in this source:
- Commit-command snippets are execution mechanics, not standalone implementation outputs.
- Image-reference section is layout inspiration context.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1-2,17 | Build-only/flag-gated rollout | yes | `web/src/lib/featureFlags.ts`, `web/.env.example`, route gating in `web/src/router.tsx` | Flag infrastructure is present. |
| 3 | Task 1 data model | yes | `supabase/migrations/20260213180000_021_agents_config_foundation.sql` | Implemented. |
| 4 | Task 2 provider connections table | yes | `supabase/migrations/20260213181000_022_provider_connections.sql` | Implemented. |
| 5 | Task 3 `agent-config` API | yes | `supabase/functions/agent-config/index.ts` | Implemented. |
| 6 | Task 4 `provider-connections` API | yes | `supabase/functions/provider-connections/index.ts` | Implemented. |
| 7 | Task 4A `/app/integrations` parity | no | `web/src/router.tsx` has marketing `/integrations`, no authenticated `/app/integrations` route | Gap still open. |
| 8 | Task 5 app routes/nav | yes | `web/src/router.tsx`, `web/src/components/shell/nav-config.ts` | Implemented with feature flags. |
| 9 | Task 6 agents page/cards/search | yes | `web/src/pages/Agents.tsx`, `web/src/components/agents/AgentCard.tsx` | Implemented. |
| 10 | Task 6A onboarding wizard | yes | `web/src/pages/AgentOnboarding*.tsx` routes in router | Implemented. |
| 11 | Task 7 modal framework | partial | `web/src/components/agents/AgentConfigModal.tsx`, `web/src/components/agents/forms/*` | Equivalent framework exists; source-named form file split differs from current structure. |
| 12 | Task 8 save/test/connect wiring | yes | `web/src/components/agents/useAgentConfigs.ts`, `GoogleAuthPanel.tsx`, edge functions | Implemented. |
| 13 | Task 9 MCP placeholder | yes | `web/src/pages/McpServers.tsx`, `web/src/components/mcp/*` | Implemented. |
| 14 | Task 10 hardening | partial | Edge/API logic includes masking/validation; full closure evidence for accessibility+log sanitization not consolidated | Needs explicit closure artifact. |
| 15 | Task 11 frontend tests | no | No web test files under `web/src/components/agents/__tests__/` and no test runner scripts in `web/package.json` | Gap open. |
| 16 | Task 12 edge/API tests | yes | `supabase/functions/agent-config/index.test.ts`, `supabase/functions/provider-connections/index.test.ts` | Implemented (unit-level). |
| 18 | Acceptance criteria closure artifact | partial | Many criteria implemented, but no one binary gate artifact found | Requires explicit final gate evidence. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0213-1835-close-agents-mcp-configuration-foundation.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Rule 1 + Actions 1-6 | covered |
| 2 | Rule 2 + Action 6 | covered |
| 3 | Action 1 | covered |
| 4 | Action 1 | covered |
| 5 | Action 1 | covered |
| 6 | Action 1 | covered |
| 7 | Action 2 | covered |
| 8 | Action 3 | covered |
| 9 | Action 3 | covered |
| 10 | Action 3 | covered |
| 11 | Action 3 | covered |
| 12 | Action 3 | covered |
| 13 | Action 3 | covered |
| 14 | Action 4 | covered |
| 15 | Action 5 | covered |
| 16 | Action 6 | covered |
| 17 | Rule 2 + Action 6 | covered |
| 18 | Action 6 + Completion Lock 6 | covered |

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
- Orphans (non-actionable): 2
- Flagged vague: 0


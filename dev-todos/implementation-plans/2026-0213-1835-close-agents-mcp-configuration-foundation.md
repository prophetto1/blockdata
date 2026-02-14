# 2026-0213-1835-close-agents-mcp-configuration-foundation

filename (UID): `2026-0213-1835-close-agents-mcp-configuration-foundation.md`  
problem: The Agents + MCP foundation spec defines a full config-first setup system, but implementation closure is incomplete and uneven across route parity, validation hardening, test coverage, and release-gate evidence.  
solution: Close the foundation as one implementation slice by validating all Task 1-13 outputs against current repo state, patching remaining gaps, and publishing binary acceptance evidence against the source Definition of Done.  
scope: agents/mcp data model + APIs + onboarding/config UI + placeholder MCP surface + safety hardening + tests + feature-flag rollout closure.

## Included Implementation Rules

1. Scope remains configuration-first only; runtime chat/tool execution stays deferred.
2. Feature flags (`agentsConfigUI`, `mcpPlaceholderUI`, `providerConnectionFlows`) remain rollout controls for staged enablement.
3. Provider readiness matrix and credential boundaries must match the source capability contract.
4. Secrets must never be returned in plaintext, and browser direct writes to protected tables are disallowed.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Reconcile spec Tasks 1-4 against current implementation by validating migration/API contracts for `agent_catalog`, `user_agent_configs`, `user_provider_connections`, `agent-config`, and `provider-connections`, then patch any schema/API mismatches and publish one contract-closure artifact. | Contract closure evidence `dev-todos/_complete/2026-0213-agents-foundation-db-api-closure.md` with explicit pass/fail rows for Tasks 1-4 (repo state before action: core migrations/functions are present). |
| 2 | Close Task 4A route-parity gap by adding authenticated `/app/integrations` placeholder route and app-shell page (separate from marketing `/integrations`) so shell navigation never points to missing app routes. | New `web/src/pages/Integrations.tsx` and updated `web/src/router.tsx` (repo state before action: source task identifies parity issue; app route missing). |
| 3 | Finalize Tasks 5-9 UI contract parity by validating route/nav ordering, Agents search/cards, onboarding flow, provider modal behavior, save/test/connect wiring, and MCP placeholder state behavior against source requirements, then patch any mismatches. | UI parity evidence `dev-todos/_complete/2026-0213-agents-mcp-ui-parity-closure.md` plus any required code patches in `web/src/pages/*`, `web/src/components/agents/*`, and `web/src/components/mcp/*` (repo state before action: most surfaces exist, parity proof not consolidated). |
| 4 | Complete Task 10 hardening by enforcing consistent input normalization/validation and secret hygiene across both edge APIs and agent forms, and include accessibility checks for modal controls and error-link semantics. | Hardening evidence `dev-todos/_complete/2026-0213-agents-mcp-safety-hardening.md` with validation/security/accessibility outcomes (repo state before action: substantial hardening exists, full closure proof missing). |
| 5 | Close Task 11 frontend-testing gap by adding web test runner baseline for agent components and implementing readiness/validation tests for modal and provider matrix behavior. | Web test setup + test files under `web/src/components/agents/__tests__/` with passing output captured in closure evidence (repo state before action: source notes web test runner was not configured). |
| 6 | Close Task 12 and Task 13 release readiness by validating edge tests + smoke sequence + staged flag rollout behavior and publishing one final foundation gate artifact mapped directly to acceptance criteria (items 1-10). | `dev-todos/_complete/2026-0213-agents-mcp-foundation-gate.md` with binary outcomes for each acceptance criterion and rollout stage. |

## Completion Logic

This plan is complete only when all conditions below are true:

1. DB/API lock: Tasks 1-4 contracts are verified and any mismatches are resolved.
2. Route-parity lock: authenticated `/app/integrations` route parity is fixed.
3. UI-parity lock: Tasks 5-9 behaviors match source requirements with evidence.
4. Hardening lock: Task 10 secret/validation/accessibility constraints are satisfied.
5. Test lock: Task 11 frontend tests and Task 12 edge/smoke validations pass.
6. Rollout lock: Task 13 staged flag rollout and acceptance criteria gate artifact is complete.


# 2026-0213-1725-remediate-config-appropriateness-utility-gaps

filename (UID): `2026-0213-1725-remediate-config-appropriateness-utility-gaps.md`  
problem: Configuration surfaces are partially implemented but still violate ownership clarity, precedence transparency, and action-state semantics required for production-safe operator workflows.  
solution: Close the six review findings (`F-1`..`F-6`) as one implementation slice by consolidating config ownership, wiring superuser connector controls, correcting readiness/CTA semantics, and proving precedence/provenance end-to-end.  
scope: user provider config ownership, agent UX semantics, defaults provenance, Google auth clarity, superuser connector runtime wiring, and deterministic closure evidence for `AGT-006..AGT-009` and `SUP-001..SUP-002`.

## Included Implementation Rules

1. One canonical editor per config domain is required; duplicate editors are not allowed in steady state.
2. Precedence and effective-value provenance must be visible in UI and must match runtime behavior.
3. Agent CTA/state semantics must be derived from actual readiness/default eligibility, not static UI assumptions.
4. Google provider onboarding must expose API-key and Vertex-service-account methods as distinct choices.
5. Superuser controls must be functional runtime controls, not placeholder text.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Eliminate duplicate user-provider editor ownership by migrating provider credential/default editing responsibility fully to `/app/agents`, then reducing `/app/settings` provider editing to a redirect/deprecation surface so there is only one canonical user provider editor. | Updated `web/src/pages/Settings.tsx` and `web/src/pages/Agents.tsx` plus routing copy that enforces `/app/agents` as canonical editor (repo state before action: both pages provide provider configuration flows). |
| 2 | Correct agent card and modal semantics so default/status/CTA behavior is strictly gated by computed readiness/default state, and publish a deterministic behavior matrix that maps each readiness/default combination to allowed actions. | Updated `web/src/components/agents/AgentCard.tsx`, `web/src/components/agents/AgentConfigModal.tsx`, and behavior matrix artifact `dev-todos/_complete/2026-0213-agent-card-state-matrix.md` (repo state before action: semantics are partially wired but review flags inconsistency risk). |
| 3 | Implement end-to-end effective-default provenance by surfacing where model/tuning values come from (user override, superuser policy, environment fallback), and ensure runtime precedence in `runs` and worker policy snapshots matches UI disclosures. | Updated provenance UI and runtime-alignment evidence in `dev-todos/_complete/2026-0213-config-precedence-provenance-proof.md` with citations to `supabase/functions/runs/index.ts` and policy loaders (repo state before action: precedence exists in code but is not fully surfaced as deterministic provenance to operators). |
| 4 | Tighten Google auth method clarity by explicitly separating Gemini API key and Vertex service-account paths in onboarding and configuration surfaces, with method-specific validation/copy and blocked-state messaging when feature flags disable provider connections. | Updated `web/src/components/agents/forms/GoogleAuthPanel.tsx`, `web/src/pages/AgentOnboardingAuth.tsx`, and related onboarding/connect pages (repo state before action: dual-method support exists but source review marks wording/flow ambiguity). |
| 5 | Implement system connector management in superuser flows so platform-side connector/runtime key control is editable through superuser UI and consumed by runtime slot resolution without requiring code/env-only rotation for normal operations. | Updated superuser connector management UI/backend paths (`web/src/pages/SuperuserSettings.tsx` and supporting edge/runtime files) with evidence artifact `dev-todos/_complete/2026-0213-superuser-system-connector-runtime-proof.md` (repo state before action: superuser policy UI exists, but source identifies connector-control wiring gap). |
| 6 | Execute final closure verification for findings `F-1`..`F-6` and backlog links `AGT-006..AGT-009`, `SUP-001`, `SUP-002`, recording binary pass/fail outcomes and direct repo evidence for each exit criterion in the source review. | `dev-todos/_complete/2026-0213-config-appropriateness-closure.md` with one row per finding, evidence links, and status outcomes. |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Ownership lock: `/app/agents` is the sole user provider configuration editor.
2. Semantics lock: agent CTA/state matrix is implemented and behavior matches readiness/default truth table.
3. Provenance lock: effective value origin is visible and matches runtime precedence.
4. Google-method lock: API-key and Vertex paths are explicit, validated, and correctly gated by flags.
5. Superuser lock: system connector controls are functional and runtime-consumed.
6. Closure lock: final closure artifact records binary outcomes for all six findings and backlog-linked remediation items.


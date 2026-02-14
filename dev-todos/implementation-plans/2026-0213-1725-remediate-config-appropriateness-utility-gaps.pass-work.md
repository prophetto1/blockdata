# Pass Work - 2026-0213-1725-remediate-config-appropriateness-utility-gaps

Source: `dev-todos/specs/0213-config-appropriateness-utility-review.md`  
Plan: `dev-todos/implementation-plans/2026-0213-1725-remediate-config-appropriateness-utility-gaps.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | 2) Review Standard | "Single canonical ownership per config domain." | constraint |
| 2 | 2) Review Standard | "Least-privilege ownership boundaries." | constraint |
| 3 | 2) Review Standard | "Transparent precedence contract." | constraint |
| 4 | 2) Review Standard | "Action semantics match true system state." | constraint |
| 5 | 2) Review Standard | "Default values are policy-driven before fallback constants." | constraint |
| 6 | F-1 | Duplicate provider editor surfaces (`Settings` and `Agents`) must be remediated (`AGT-006`). | action |
| 7 | F-2 | Missing explicit runtime key precedence contract must be resolved (`SUP-002`). | action |
| 8 | F-3 | System connector control must be implemented in superuser UI/runtime (`SUP-001`). | action |
| 9 | F-4 | Agent card action semantics must align with readiness/default truth (`AGT-007`). | action |
| 10 | F-5 | Defaults policy must be surfaced end-to-end (`AGT-008`). | action |
| 11 | F-6 | Google auth flow must separate method choices clearly (`AGT-009`). | action |
| 12 | 5) Improvement Sequence | "Remove duplicate user provider editor ... into `Agents`." | action |
| 13 | 5) Improvement Sequence | "Correct card-state semantics and readiness/default CTA gating." | action |
| 14 | 5) Improvement Sequence | "Lock defaults precedence in docs, UI copy, and runtime behavior." | action |
| 15 | 5) Improvement Sequence | "Split Google auth method presentation explicitly." | action |
| 16 | 5) Improvement Sequence | "Implement superuser system connectors and wire runtime slot fallback." | action |
| 17 | 5) Improvement Sequence | "Finalize and test key precedence contract across user/system/env paths." | test |
| 18 | 6) Exit Criteria | "`/app/agents` is the only user provider-config editor." | test |
| 19 | 6) Exit Criteria | "`/app/settings/superuser` contains working system connector management." | test |
| 20 | 6) Exit Criteria | "Effective value provenance is visible and consistent with runtime behavior." | test |
| 21 | 6) Exit Criteria | "UI state/action semantics pass a deterministic behavior matrix." | test |
| 22 | 6) Exit Criteria | "Backlog items ... moved to done with evidence." | test |

Non-actionable in this source:
- Purpose prose and domain inventory list are context framing.
- Finding impact/why statements are rationale, not separate outputs.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1-2 | Ownership + least-privilege boundaries | partial | `supabase/migrations/20260213182000_023_agents_config_security_hardening.sql`, `supabase/migrations/20260213181000_022_provider_connections.sql` | DB privilege boundaries exist; UI ownership is still duplicated. |
| 3,7,14,17,20 | Explicit precedence contract across runtime and UI | partial | `supabase/functions/runs/index.ts`, `supabase/functions/_shared/admin_policy.ts`, `web/src/pages/Settings.tsx` | Runtime precedence exists; explicit operator-facing provenance contract is incomplete. |
| 4,9,13,21 | Agent CTA semantics matrix | partial | `web/src/pages/Agents.tsx`, `web/src/components/agents/AgentConfigModal.tsx`, `supabase/functions/agent-config/index.ts` | Readiness/default wiring exists; deterministic matrix artifact not present. |
| 5,10 | Policy-driven defaults surfaced end-to-end | partial | `supabase/functions/agent-config/index.ts`, `web/src/pages/Settings.tsx` | Defaults editable; provenance visibility still incomplete. |
| 6,12,18 | Single editor (Agents only) | no | `web/src/pages/Settings.tsx`, `web/src/pages/Agents.tsx` | Both pages still configure providers. |
| 8,16,19 | Working superuser system connector management | partial | `web/src/pages/SuperuserSettings.tsx`, `supabase/functions/admin-config/index.ts` | Superuser policy controls exist, but source finding says connector-runtime control remains incomplete. |
| 11,15 | Explicit Google auth method flows | partial | `web/src/components/agents/forms/GoogleAuthPanel.tsx`, `web/src/pages/AgentOnboardingAuth.tsx`, `web/src/pages/AgentOnboardingConnect.tsx` | Two-method support exists; review source flags remaining clarity/wording gap. |
| 22 | Backlog remediation evidence closure | no | No dedicated closure artifact under `dev-todos/_complete/` for this review | Needs explicit evidence file. |

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0213-1725-remediate-config-appropriateness-utility-gaps.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Rule 1 + Action 1 | covered |
| 2 | Rule 1 + Action 1 | covered |
| 3 | Rule 2 + Action 3 + Action 6 | covered |
| 4 | Rule 3 + Action 2 | covered |
| 5 | Rule 2 + Action 3 | covered |
| 6 | Action 1 | covered |
| 7 | Action 3 + Action 6 | covered |
| 8 | Action 5 | covered |
| 9 | Action 2 | covered |
| 10 | Action 3 | covered |
| 11 | Rule 4 + Action 4 | covered |
| 12 | Action 1 | covered |
| 13 | Action 2 | covered |
| 14 | Action 3 | covered |
| 15 | Action 4 | covered |
| 16 | Action 5 | covered |
| 17 | Action 3 + Action 6 | covered |
| 18 | Completion Lock 1 | covered |
| 19 | Completion Lock 5 | covered |
| 20 | Completion Lock 3 | covered |
| 21 | Completion Lock 2 | covered |
| 22 | Action 6 + Completion Lock 6 | covered |

Result: 22/22 actionable items tracked. 0 missing. 0 invented actions.

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
- Pass 1 actionable extracted: 22
- Covered: 22
- Orphans (non-actionable): 2
- Flagged vague: 0


# Config Appropriateness and Utility Review

Date: 2026-02-13  
Owner: Platform  
Status: Review baseline for remediation tracking

## 1) Purpose

This review evaluates whether current configuration design is practical and appropriate for production usage, not just functionally runnable.

Primary question:

- Are config surfaces and ownership boundaries coherent, efficient, and aligned with expected industry patterns?

## 2) Review Standard

A configuration design is considered appropriate only if all of these are true:

1. Single canonical ownership per config domain (no competing editors).
2. Least-privilege ownership boundaries (user vs superuser vs environment).
3. Transparent precedence contract (where effective values come from).
4. Action semantics match true system state (no misleading CTAs or statuses).
5. Default values are policy-driven before fallback constants.

## 3) Current Config Domains (Repo Scan)

- `Environment`: deployment secrets and runtime env (`ANTHROPIC_API_KEY`, service keys).
- `Superuser policy`: admin runtime policy registry (`admin_runtime_policy`, `admin_policy.ts`).
- `User provider config`: user keys/defaults (`user_api_keys`, `user-api-keys` edge function).
- `Agent config`: keywords/default selection/readiness (`user_agent_configs`, `agent-config` edge function).

## 4) Findings

### F-1 (High): Duplicate/competing provider editor surfaces

- Observation: provider editing exists in `Settings`, while `Agents` also presents provider configuration flows.
- Why inappropriate: duplicates ownership and creates drift in behavior/copy over time.
- Impact: users see contradictory UX and unclear source of truth.
- Remediation link: `AGT-006`.

### F-2 (High): Missing explicit runtime key precedence contract

- Observation: runtime behavior and planned superuser connector behavior are not yet locked into one documented precedence chain.
- Why inappropriate: key resolution can become ambiguous and risky during rollout.
- Impact: unpredictable production behavior, difficult incident diagnosis.
- Remediation link: `SUP-002`.

### F-3 (High): System connector control is not yet implemented in superuser UI/runtime

- Observation: system-side connector design exists in spec, but execution wiring remains pending.
- Why inappropriate: platform runtime key rotation still depends on code/env changes.
- Impact: slow operations and higher credential-rotation risk.
- Remediation link: `SUP-001`.

### F-4 (Medium): Agent card action semantics are inconsistent

- Observation: default/status/CTA combinations are not always aligned with readiness/default truth state.
- Why inappropriate: action affordances do not match eligibility.
- Impact: operator confusion and mis-clicks.
- Remediation link: `AGT-007`.

### F-5 (Medium): Defaults policy is not clearly surfaced end-to-end

- Observation: UI/runtime still presents fallback-like constants in ways that appear primary.
- Why inappropriate: users cannot predict effective model/tuning values.
- Impact: low trust and inconsistent run outcomes.
- Remediation link: `AGT-008`.

### F-6 (Medium): Google auth path wording/flow is ambiguous

- Observation: `Gemini / Vertex` presentation can blur two distinct auth methods.
- Why inappropriate: one provider should expose explicit method choices.
- Impact: setup errors and weaker operator comprehension.
- Remediation link: `AGT-009`.

## 5) Improvement Sequence

1. Remove duplicate user provider editor by transplanting full `Settings` module into `Agents` (`AGT-006`).
2. Correct card-state semantics and readiness/default CTA gating (`AGT-007`).
3. Lock defaults precedence in docs, UI copy, and runtime behavior (`AGT-008`).
4. Split Google auth method presentation explicitly (`AGT-009`).
5. Implement superuser system connectors and wire runtime slot fallback (`SUP-001`).
6. Finalize and test key precedence contract across user/system/env paths (`SUP-002`).

## 6) Exit Criteria

This review is closed only when:

1. `/app/agents` is the only user provider-config editor.
2. `/app/settings/superuser` contains working system connector management.
3. Effective value provenance is visible and consistent with runtime behavior.
4. UI state/action semantics pass a deterministic behavior matrix.
5. Backlog items `AGT-006..AGT-009`, `SUP-001`, and `SUP-002` are moved to done with evidence.

# Config Decision Log (Canonical)

**Date:** 2026-02-13  
**Status:** Active  
**Purpose:** Capture every new config decision in one place before implementation drifts.

---

## How To Use This

When a new config idea appears in discussion, add one entry here immediately.

Entry rule:

1. One config decision per entry.
2. Must include layer, owner, default, enforcement path, and where it appears in UI.
3. If implementation is pending, add/update a matching item in `dev-todos/todos-backlog.md`.
4. If implementation is completed, add evidence to `dev-todos/todos-done-log.md` and `repo-changelog.jsonl`.
5. If a decision is stated in live discussion, log it in this file in the same session before implementation proceeds.

---

## Layer Model (Use One)

- `Environment` - deployment secrets and env vars.
- `Superuser Policy` - admin-controlled runtime keys in policy registry.
- `User Config` - user-owned settings (for example provider keys/defaults).
- `Agent Config` - per-agent routing/default/keyword behavior.

---

## Canonical Storage Targets

- `Environment`: `.env`, platform secrets store, and `web/.env.example` for documented vars.
- `Superuser Policy`: `supabase/functions/_shared/admin_policy.ts` + `supabase/functions/admin-config/index.ts` + policy migrations/docs when new key is introduced.
- `User Config`: DB tables/edge paths such as `user_api_keys`, `user-provider-connections`, and related typed surfaces.
- `Agent Config`: DB tables/edge paths such as `user_agent_configs`, `agent-config`, and agents UI contract.

---

## Intake Template

Use this exact template for each new entry:

- `YYYY-MM-DD` - `CFG-XXX` - `<short title>`
- `Layer:` Environment | Superuser Policy | User Config | Agent Config
- `Decision:` `<what is being added/changed>`
- `Default:` `<initial value>`
- `Owner:` `<who controls it>`
- `Enforcement Path:` `<backend file/function/table>`
- `UI Surface:` `<where user/admin edits it>`
- `Precedence:` `<what overrides what>`
- `Audit/Evidence Required:` `<how we prove it works>`
- `Status:` Proposed | In Progress | Implemented
- `Linked Todo:` `<ID in backlog/queue>`

---

## Active Entries

- `2026-02-13` - `CFG-001` - Canonical AI provider config location
- `Layer:` User Config + Agent Config
- `Decision:` Provider credentials and model defaults should live in `Agents` as the canonical surface; `Settings` must not be a competing provider-config UI.
- `Default:` Agents is source of truth; onboarding is optional guidance only and cannot duplicate config logic.
- `Owner:` Product + implementation owner
- `Enforcement Path:` `web/src/pages/Agents.tsx`, provider credentials module in agents forms, edge functions for `user_api_keys` and `agent-config`
- `UI Surface:` `/app/agents`
- `Precedence:` Superuser policy constraints -> user provider config -> agent-level selection/override
- `Audit/Evidence Required:` UI parity checklist + API save/test verification + done-log + changelog entry
- `Status:` In Progress
- `Linked Todo:` `AGT-001` `AGT-003` `AGT-005`

- `2026-02-13` - `CFG-002` - Settings provider module transplant into Agents
- `Layer:` User Config
- `Decision:` Replace the current weaker Agents provider editor with the full provider module currently in `Settings`; do not keep a competing editor in `Settings`.
- `Default:` `/app/agents` is the only user provider configuration surface.
- `Owner:` Product + implementation owner
- `Enforcement Path:` `web/src/pages/Agents.tsx`, `web/src/components/agents/forms/ProviderCredentialsModule.tsx`, `supabase/functions/user-api-keys/index.ts`, `supabase/functions/test-api-key/index.ts`
- `UI Surface:` `/app/agents` (primary), `/app/settings` (non-provider/account only)
- `Precedence:` Single surface policy: Agents owns provider editing, Settings must not duplicate.
- `Audit/Evidence Required:` visual parity check against prior Settings module behavior + API test/save/remove proof + done-log/changelog entry
- `Status:` Proposed
- `Linked Todo:` `AGT-006`

- `2026-02-13` - `CFG-003` - Agent card state/action semantics
- `Layer:` Agent Config
- `Decision:` Card CTA/state must reflect readiness truthfully: no active `Set default` for non-ready cards, default card shows passive default badge/state, and status colors must be semantically stable.
- `Default:` `Set default` appears only when eligible; default card does not render conflicting CTA.
- `Owner:` Product + implementation owner
- `Enforcement Path:` `web/src/components/agents/AgentCard.tsx`, `web/src/pages/Agents.tsx`
- `UI Surface:` `/app/agents`
- `Precedence:` Readiness gate -> default eligibility -> CTA availability
- `Audit/Evidence Required:` UI behavior matrix screenshots + readiness/default state test evidence
- `Status:` Proposed
- `Linked Todo:` `AGT-007`

- `2026-02-13` - `CFG-004` - Provider defaults precedence contract
- `Layer:` Superuser Policy + User Config + Agent Config
- `Decision:` Model/tuning defaults must not rely on magic constants; resolve from saved user provider defaults, then superuser platform defaults, then explicit fallback.
- `Default:` `max_tokens=2000` is fallback-only, not implicit surface default for every provider state.
- `Owner:` Platform owner
- `Enforcement Path:` `supabase/functions/worker/index.ts`, `supabase/functions/_shared/admin_policy.ts`, agents provider module defaults wiring
- `UI Surface:` `/app/agents` + `/app/settings/superuser`
- `Precedence:` schema/run override -> user provider defaults -> superuser platform defaults -> hard fallback
- `Audit/Evidence Required:` precedence tests + runtime resolution proof
- `Status:` Proposed
- `Linked Todo:` `AGT-008`

- `2026-02-13` - `CFG-005` - Google provider auth method clarity
- `Layer:` User Config
- `Decision:` Keep single `google` provider but present two explicit connection methods (`Gemini API key` and `Vertex service account`) as distinct auth paths.
- `Default:` Provider label/copy must avoid ambiguous merged wording.
- `Owner:` Product + implementation owner
- `Enforcement Path:` `web/src/components/agents/providerRegistry.tsx`, `web/src/components/agents/forms/GoogleAuthPanel.tsx`, `web/src/pages/Agents.tsx`
- `UI Surface:` `/app/agents`
- `Precedence:` Provider selection -> auth method selection -> readiness calculation
- `Audit/Evidence Required:` UI copy/flow verification + readiness correctness check
- `Status:` Proposed
- `Linked Todo:` `AGT-009`

- `2026-02-13` - `CFG-006` - Superuser system AI connectors
- `Layer:` Superuser Policy
- `Decision:` Add superuser-managed system-side connectors with two slots (`runtime_primary`, `assistant_primary`) so system runtime key rotation does not require code changes.
- `Default:` Existing env fallback remains during rollout until slot is configured.
- `Owner:` Platform owner
- `Enforcement Path:` `public.system_ai_connectors` (new), `superuser-ai-connectors` edge function (new), worker slot-aware key resolution
- `UI Surface:` `/app/settings/superuser`
- `Precedence:` runtime slot key (when valid) -> env fallback for backward compatibility
- `Audit/Evidence Required:` superuser auth tests + key rotation runtime proof + audit trail evidence
- `Status:` Proposed
- `Linked Todo:` `SUP-001`

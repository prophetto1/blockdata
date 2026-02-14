# Pass Work - 2026-0213-1755-validate-agents-mcp-foundation-smoke-contract

Source: `dev-todos/specs/0213-agents-mcp-foundation-dev-smoke-runbook.md`  
Plan: `dev-todos/implementation-plans/2026-0213-1755-validate-agents-mcp-foundation-smoke-contract.md`

## Pass 1: Extraction

| Item # | Source | Verbatim (abbrev) | Type |
|---|---|---|---|
| 1 | Scope | Validate migrations `021`, `022`, `023`. | test |
| 2 | Scope | Validate edge behavior for `agent-config` and `provider-connections`. | test |
| 3 | Preconditions | Authenticated user exists in dev branch. | constraint |
| 4 | Preconditions | Functions deployed to same dev branch. | constraint |
| 5 | Preconditions | Feature flags off by default unless UI validation. | policy |
| 6 | Migration checks | `agent_catalog`, `user_agent_configs`, `user_provider_connections` tables exist. | test |
| 7 | Migration checks | `user_agent_configs_one_default_per_user` index exists. | test |
| 8 | Migration checks | `user_agent_configs_unique_keyword_per_user` index exists. | test |
| 9 | Migration checks | Browser role has SELECT-only on allowed columns/tables. | test |
| 10 | Migration checks | Browser role cannot directly write `user_agent_configs`. | test |
| 11 | Migration checks | `agent_catalog` has `anthropic/openai/google/custom` seeds. | test |
| 12 | API sequence | `GET agent-config` pre-setup readiness false for unconfigured providers. | test |
| 13 | API sequence | `PATCH agent-config` normalizes keyword and writes auth user_id. | test |
| 14 | API sequence | Duplicate keyword returns clear error. | test |
| 15 | API sequence | malformed Google SA JSON returns validation error. | test |
| 16 | API sequence | valid Google SA connect returns `status=connected` and hides private key. | test |
| 17 | API sequence | `GET provider-connections/status` omits encrypted credential. | test |
| 18 | API sequence | disconnect returns `status=disconnected`. | test |
| 19 | API sequence | Google readiness true with key OR Vertex connection, false otherwise. | test |
| 20 | API sequence | custom readiness requires both `base_url` and API key. | test |
| 21 | Rollback criteria | block promotion on browser direct mutation possibility. | constraint |
| 22 | Rollback criteria | block promotion on secret material returned in APIs. | constraint |
| 23 | Rollback criteria | block promotion on default-agent uniqueness violation. | constraint |
| 24 | Rollback criteria | block promotion on readiness matrix divergence. | constraint |

Non-actionable in this source:
- Purpose prose and heading text are context framing.

## Pass 2: Repo State Check

| Item # | Expected Output | Exists? | Location / Evidence | Notes |
|---|---|---|---|---|
| 1,6-11 | Migration/table/index/privilege baseline | yes | `supabase/migrations/20260213180000_021_agents_config_foundation.sql`, `supabase/migrations/20260213181000_022_provider_connections.sql`, `supabase/migrations/20260213182000_023_agents_config_security_hardening.sql` | Required tables/indexes/policies are present in migrations. |
| 2,12-20 | Edge behavior contract | partial | `supabase/functions/agent-config/index.ts`, `supabase/functions/provider-connections/index.ts` | Logic exists; deterministic runbook-sequence evidence artifact not found. |
| 3-5 | Dev environment preconditions validation | partial | Preconditions are environmental, not fully provable from repo alone | Must be validated in dev execution artifact. |
| 13-14 | Keyword normalization + duplicate rejection | yes | `supabase/functions/agent-config/index.ts` (`normalizeKeyword`, duplicate keyword check) | Implemented. |
| 15-18 | Provider-connections validation + redaction behaviors | yes | `supabase/functions/provider-connections/index.ts` (validation + metadata-only response paths) | Implemented in function logic. |
| 19-20 | Provider readiness matrix | yes | `supabase/functions/agent-config/index.ts` (`computeReadiness`) | Implemented. |
| 21-24 | Promotion-blocking gate artifact | no | No consolidated smoke gate output under `dev-todos/_complete/` | Needs explicit binary pass/fail artifact. |

Additional repo evidence:
- Function unit tests exist: `supabase/functions/agent-config/index.test.ts`, `supabase/functions/provider-connections/index.test.ts`.

## Pass 3: Draft

Draft plan written to:
- `dev-todos/implementation-plans/2026-0213-1755-validate-agents-mcp-foundation-smoke-contract.md`

## Pass 4: Completeness Audit

| Item # | Covered By | Status |
|---|---|---|
| 1 | Action 1 | covered |
| 2 | Action 2 | covered |
| 3 | Rule 1 + Action 4 | covered |
| 4 | Rule 1 + Action 4 | covered |
| 5 | Rule 1 + Action 2 | covered |
| 6 | Action 1 | covered |
| 7 | Action 1 | covered |
| 8 | Action 1 | covered |
| 9 | Rule 2 + Action 1 | covered |
| 10 | Rule 2 + Action 3 | covered |
| 11 | Action 1 | covered |
| 12 | Action 2 | covered |
| 13 | Action 2 | covered |
| 14 | Action 2 | covered |
| 15 | Action 2 | covered |
| 16 | Rule 3 + Action 2 + Action 3 | covered |
| 17 | Rule 3 + Action 2 + Action 3 | covered |
| 18 | Action 2 | covered |
| 19 | Rule 4 + Action 2 | covered |
| 20 | Rule 4 + Action 2 | covered |
| 21 | Action 4 + Lock 5 | covered |
| 22 | Action 3 + Action 4 | covered |
| 23 | Action 1 + Action 4 | covered |
| 24 | Rule 4 + Action 4 | covered |

Result: 24/24 actionable items tracked. 0 missing. 0 invented actions.

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
- Pass 1 actionable extracted: 24
- Covered: 24
- Orphans (non-actionable): 1
- Flagged vague: 0


# 2026-0213-1755-validate-agents-mcp-foundation-smoke-contract

filename (UID): `2026-0213-1755-validate-agents-mcp-foundation-smoke-contract.md`  
problem: Agents/MCP foundation artifacts exist, but the runbook checks are not yet packaged as one deterministic smoke contract with reproducible evidence for migration safety and API security behavior.  
solution: Convert the runbook into an executable smoke-validation slice that verifies migration schema, privilege boundaries, API sequence behavior, and rollback blockers with one reproducible output artifact.  
scope: migrations `021/022/023`, edge functions `agent-config` and `provider-connections`, deterministic API sequence checks, and release-blocking rollback criteria evidence.

## Included Implementation Rules

1. Smoke validation runs against dev branch environment before any promotion.
2. Browser-authenticated clients must not gain direct write access to protected config tables.
3. Secret-bearing fields must never be returned in API payloads.
4. Readiness rules for `anthropic`, `openai`, `google`, and `custom` must match provider matrix expectations.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Implement migration verification checks for `021_agents_config_foundation`, `022_provider_connections`, and `023_agents_config_security_hardening`, including table/index/seed assertions and privilege checks for authenticated browser role read-only surfaces. | Executable migration-check script (SQL or PowerShell) under `scripts/` plus evidence file `dev-todos/_complete/2026-0213-agents-mcp-migration-smoke.md` (repo state before action: migrations exist, no consolidated executable smoke evidence artifact). |
| 2 | Implement deterministic API smoke sequence harness for `agent-config` and `provider-connections` that executes the exact ordered scenario from the runbook (pre-setup GET, patch default, duplicate keyword rejection, malformed/valid connect, status redaction, disconnect, readiness transitions). | Smoke harness script under `scripts/` and output log proving each sequence step result with request/response summaries. |
| 3 | Add explicit security assertions in smoke harness to fail fast on secret leakage (`credential_encrypted`, plaintext keys) and unauthorized direct mutation behavior from browser role paths. | Security assertion results embedded in the same smoke output with pass/fail lines per restricted field/operation. |
| 4 | Publish one release-gate artifact that maps each rollback criterion in the runbook to a binary outcome and blocks promotion when any criterion fails. | `dev-todos/_complete/2026-0213-agents-mcp-smoke-gate.md` with rollback criteria matrix and pass/fail status. |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Migration lock: all schema/index/seed checks from runbook pass and are evidenced.
2. API-sequence lock: ordered smoke sequence executes deterministically with expected responses.
3. Security lock: no secret leakage and no unauthorized direct table mutation behavior.
4. Readiness lock: provider readiness outcomes match runbook matrix.
5. Gate lock: final smoke-gate artifact records rollback criteria as binary pass/fail.


# Environment Profile Requirements Extraction Summary

**Date:** 2026-03-27
**Status:** Phase 1 complete — extraction done, comparative analysis pending
**Source:** 14 fresh docs across `legal-10/docs/`, `_agchain/docs/`, `docs-site/src/content/`

## Extraction Results

Three parallel extraction passes produced 349 numbered requirements across 12 categories.

### Agent 1: Statefulness & Context (184 requirements)

Categories covered:
- **Session Strategy** (STATE-001 through STATE-023) — fresh vs continuous vs grouped API calls, EU scoping, sequential step execution, runner-enforced statefulness
- **Carry-Forward** (STATE-024 through STATE-045) — candidate_state.json mechanics, sanitization rules (forbidden keys: ground_truth, score, judge, gt_, rubric), accumulation-only, JSON-serializable
- **Payload Admission** (STATE-046 through STATE-063) — plan.json inject_payloads, cumulative admission, staging directory enforcement, placeholder resolution, unadmitted reference = runtime error
- **Message Assembly** (STATE-064 through STATE-086) — fenced windows, fixed ordering, staged-content-only assembly, pre/post step operations
- **Context Windows** (STATE-087 through STATE-113) — ENV (always), ANCHOR_PACK (when p1 admitted), EVIDENCE_PACK (when p2 admitted), CARRY_FORWARD (when non-empty), TASK (always), OUTPUT_GUARD (always, never truncated). Plus Type I/II/III state providers
- **Replay** (STATE-114 through STATE-122) — Replay_Full (growing history) vs Replay_Minimal (hard-cut per step), both must yield identical audit proofs
- **Audit** (STATE-123 through STATE-184) — audit_log.jsonl per-step, run.jsonl append-only, run_manifest.json provenance, trace.jsonl events, deterministic reproducibility

Key insight: 149 of 184 requirements are generalizable beyond Legal-10.

### Agent 2: Isolation, Tools, Audit, Security, Orchestration (57 requirements)

Categories covered:
- **Sandbox/Isolation** (ISO-001 through ISO-013) — per-call staging at staging/{run_id}/{call_id}/, no-leak invariant (never see ground_truth, judge prompts, future steps, unadmitted payloads), judge isolation
- **Tool Provision** (TOOL-001 through TOOL-008) — plan.json controls admission, cumulative payloads, placeholder resolution, scorer registry, two scoring modes (deterministic + judge)
- **Audit Trail** (AUDIT-001 through AUDIT-013) — SHA-256 hashing, per-step boundary records, ground_truth_accessed:false confirmation, run artifacts (run.jsonl, audit_log.jsonl, run_manifest.json, summary.json, candidate_state.json)
- **Security** (SEC-001 through SEC-007) — no runtime retrieval, reproducibility_key, deterministic scoring, sanitization as security boundary, both strategies yield identical audit proofs
- **Runner Orchestration** (ORCH-001 through ORCH-016) — plan-driven execution, 9-phase step lifecycle, fenced window protocol, two session strategies, pre-call audit hashing

Key insight: 45 of 57 requirements are generalizable.

### Agent 3: Platform Architecture & Inspect Integration (108 requirements)

Categories covered:
- **Environment Profile Object** (ENV-001 through ENV-010) — named/versioned/independent object, schema (id, name, version, statefulness strategy + params, tools strategy + params, constraints, audit), first-class runtime_policy_bundle identity, top-level rail item
- **Statefulness Registry** (STATE-001 through STATE-023) — extensible registry with 7-dimension contract (context assembly, inter-step persistence, session boundary, history reconstruction, admission control, truncation/compaction, audit), 9 known patterns, composability requirement
- **Tools Registry** (TOOL-001 through TOOL-015) — extensible registry with 6-dimension contract (tool set definition, access boundaries, constraint enforcement, recording, result injection, isolation), 9 known tool patterns, composability
- **Inspect AI Adoption** (INSPECT-001 through INSPECT-028) — adopt SandboxEnvironment ABC, ResolvedTask pattern, model_roles, per-sample lifecycle. 5-phase migration: model adapter → task/sample → staging/sandbox → tools/approval → statefulness above Inspect. Helper-by-helper analysis (7 helpers assessed)
- **Inspect AI Gaps** (GAP-001 through GAP-016) — no context provision strategy, no session strategy config, no payload admission, no carry-forward control, no structured windows, no state providers, no real-time audit, no evidence isolation, no benchmark registry/UI/fairness
- **Runtime Policy Bundle** (POLICY-001 through POLICY-014) — three-dimensional comparison (Benchmark x Model x Environment Profile), two comparison modes (model comparison + policy comparison), fairness invariant (same bundle for all models in a run), policy-sensitivity analysis as core product capability
- **Platform Architecture** (PLAT-001 through PLAT-030) — AG chain as fourth sibling shell, /app/agchain/* routes, platform-api + Supabase, benchmark packages as core abstraction, 5-6 rail items, OTel observability, generic (not Legal-10-hardcoded)

## Stale Docs (Set Aside)

- `build-pipeline/data-pipeline-reference.md` — marked "MUST BE UPDATED"
- `mvp/benchmark-technical-specification-v1.1.md` — "TODO: requires line-by-line update"
- `build-pipeline/sealed-evaluation-units-security.md` — conflicts with M1 sealing decision
- `platform/generaldirections.md` — fragment, superseded by dated docs
- `10-step-chain/benchmark-package-structures-v4.md` — open architectural questions

## Next Step: Phase 2

Comparative analysis against InspectAI source at `_agchain/_reference/inspect_ai/`:
- Map each GAP item to InspectAI's actual code to verify the gap exists
- Map each INSPECT adoption item to InspectAI's actual implementation to verify compatibility
- Identify any InspectAI capabilities not yet captured in the requirements
- Produce the contract definitions (Python ABCs) informed by both the requirements and InspectAI's patterns

## Full Extraction Outputs

The complete numbered requirement lists were produced by three parallel extraction agents. Each requirement includes: ID, statement, source file/section, and generalizability classification. The full outputs are preserved in the agent task output files.

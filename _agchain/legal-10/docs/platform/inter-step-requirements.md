# AGChain Inter-Step Functionality Requirements

**Version**: 1.0
**Date**: 2026-01-25
**Status**: Derived from spec documents
**Scope**: Requirements for the ChainExecutor / inter-task orchestration layer

---

## Overview

This document specifies the **inter-step functionality requirements** - the operations that occur BETWEEN Inspect-AI task executions. These are the responsibilities of the ChainExecutor layer.

**Key Principle:** Inspect-AI handles intra-step execution. This document covers everything that happens at step boundaries.

---

## 1. State Transition Management

### 1.1 Carry-Forward State

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-1.1.1 | `candidate_state.json` carries model-derived artifacts between steps | MUST | Arch §2, §4.4 |
| IS-1.1.2 | State is keyed by step_id: `{d1: {...}, d2: {...}, ...}` | MUST | 3-Step Outputs §4 |
| IS-1.1.3 | State accumulates - each step adds, never removes prior outputs | MUST | Arch §3.2 |
| IS-1.1.4 | State format is JSON-serializable for audit reproducibility | MUST | Arch §3.3 |

### 1.2 State Sanitization (Critical)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-1.2.1 | NEVER include ground_truth in candidate_state | MUST | Arch §2.1, 3-Step §5 |
| IS-1.2.2 | NEVER include scores or scoring_details in candidate_state | MUST | Arch §2.1 |
| IS-1.2.3 | NEVER include judge outputs in candidate_state | MUST | Arch §2.1 |
| IS-1.2.4 | NEVER include runner internal bookkeeping | MUST | Arch §2.1 |
| IS-1.2.5 | Strip any keys containing: `ground_truth`, `score`, `judge`, `gt_`, `rubric` | SHOULD | Impl guidance |

### 1.3 State Update Protocol

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-1.3.1 | Parse model output after each step | MUST | 3-Step Outputs §4 |
| IS-1.3.2 | Validate output against step's output_contract | MUST | bench-eu-rp §Response Format |
| IS-1.3.3 | Extract only contract-defined fields for carry-forward | SHOULD | Arch §3.2 |
| IS-1.3.4 | Update candidate_state BEFORE audit logging | MUST | Ordering dependency |

---

## 2. Payload Admission Control

### 2.1 Admission Timing

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-2.1.1 | `inject_payloads` array in plan.json controls admission | MUST | Spec §4.2 |
| IS-2.1.2 | Payloads are cumulative - once admitted, remain visible | MUST | bench-eu-rp §Injection Rules |
| IS-2.1.3 | Typical pattern: p1 at d1, p2 at j10 (open-book boundary) | SHOULD | Legal-10 design |

### 2.2 Payload Resolution

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-2.2.1 | Resolve payload path: `eus/{eu_id}/{payload_id}.json` | MUST | Spec §3.2.2 |
| IS-2.2.2 | Support placeholder syntax: `{p1}`, `{p1.anchor.text}`, `{p2.authorities[0]}` | MUST | bench-eu-rp §Placeholder Syntax |
| IS-2.2.3 | Deep path resolution uses dot notation | MUST | bench-eu-rp §Placeholder Syntax |
| IS-2.2.4 | Array indexing uses bracket notation: `[0]`, `[1]` | MUST | bench-eu-rp §Placeholder Syntax |
| IS-2.2.5 | Missing paths resolve to empty string with warning in audit_log | SHOULD | bench-eu-rp §Injection Rules |

### 2.3 Admission Enforcement

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-2.3.1 | Reference to unadmitted payload = runtime error | MUST | bench-eu-rp §Injection Rules |
| IS-2.3.2 | Track admitted_payloads set per run (cumulative) | MUST | Arch §2.2 |
| IS-2.3.3 | Validate placeholder references against admitted set | MUST | Arch §2.2 |

---

## 3. Step Boundary Operations

### 3.1 Pre-Step Operations (Before Inspect Task Launch)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-3.1.1 | Create staging directory: `staging/{run_id}/{call_id}/` | MUST | Spec §4.1 |
| IS-3.1.2 | Copy current step file to staging | MUST | Spec §4.1 |
| IS-3.1.3 | Copy ONLY admitted payloads to staging | MUST | Spec §4.1 |
| IS-3.1.4 | Copy sanitized candidate_state.json to staging | MUST | Arch §2.2 |
| IS-3.1.5 | Hash all staged files for audit | MUST | 3-Step Outputs §4 |
| IS-3.1.6 | Assemble messages from staged files only | MUST | Arch §2.2 |
| IS-3.1.7 | Hash final message bytes for audit | MUST | Arch §4.4 |

### 3.2 Post-Step Operations (After Inspect Task Completes)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-3.2.1 | Extract model output from EvalLog | MUST | Integration |
| IS-3.2.2 | Validate output against output_contract | MUST | bench-eu-rp §Validation |
| IS-3.2.3 | Parse output into structured form | MUST | 3-Step Outputs §4 |
| IS-3.2.4 | Execute deterministic scorer if scoring="deterministic" | MUST | Spec §8.1 |
| IS-3.2.5 | Record score immediately to run.jsonl | MUST | Spec §8.1 |
| IS-3.2.6 | Update candidate_state with sanitized output | MUST | Arch §3.2 |
| IS-3.2.7 | Emit audit record with hashes | MUST | Arch §4.4 |
| IS-3.2.8 | Delete staging directory | MUST | Spec §4.1 |

### 3.3 Judge Step Boundary (Special Case)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-3.3.1 | Judge model is a separate Inspect Task | MUST | Spec §2.2 |
| IS-3.3.2 | Judge sees ONLY: rubric + model output being graded | MUST | Spec §2.2 |
| IS-3.3.3 | Judge does NOT see: candidate transcript, ground_truth | MUST | Spec §2.2 |
| IS-3.3.4 | Judge output recorded as separate record in run.jsonl | MUST | 3-Step Outputs §4 |
| IS-3.3.5 | Component scores aggregated by runner, not judge | MUST | bench-eu-rp §Scoring |

---

## 4. Message Assembly

### 4.1 Window Structure

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-4.1.1 | Use fenced windows: `<<<BEGIN_{NAME}>>>...<<<END_{NAME}>>>` | MUST | Arch §2.2 |
| IS-4.1.2 | Each window is a separate user message | MUST | Arch §2.2 |
| IS-4.1.3 | Windows assembled in fixed order | MUST | Arch §2.2 |

### 4.2 Window Order (Canonical)

| Order | Window Name | Content Source | Condition |
|-------|-------------|----------------|-----------|
| 1 | ENV | Runner config / invariants | Always |
| 2 | ANCHOR_PACK | p1.json (staged) | When p1 admitted |
| 3 | EVIDENCE_PACK | p2.json (staged) | When p2 admitted |
| 4 | CARRY_FORWARD | candidate_state.json (staged) | When non-empty |
| 5 | TASK | step file content (staged) | Always |
| 6 | OUTPUT_GUARD | Output contract / response format | Always |

**Source:** Arch §2.2, Spec §4.3

### 4.3 Session Strategies

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-4.3.1 | Support Replay_Full: growing message history | MUST | Arch §4.1 |
| IS-4.3.2 | Support Replay_Minimal: hard cut per step | MUST | Arch §4.2 |
| IS-4.3.3 | Replay_Minimal is the baseline implementation | MUST | Arch §4.2 |
| IS-4.3.4 | Both strategies must yield identical audit proofs | MUST | Arch §4.3 |
| IS-4.3.5 | Session strategy recorded in run_manifest.json | MUST | Arch §4.4 |

### 4.4 Truncation Rules

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-4.4.1 | Never truncate OUTPUT_GUARD window | MUST | Arch §2.2 |
| IS-4.4.2 | Only payload/state windows may be truncated | MUST | Arch §2.2 |
| IS-4.4.3 | Truncation must be deterministic | MUST | Arch §2.2 |
| IS-4.4.4 | Truncation events recorded in audit_log | MUST | Arch §2.2 |

---

## 5. Audit & Observability

### 5.1 Audit Log Requirements (audit_log.jsonl)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-5.1.1 | One record per step boundary | MUST | 3-Step Outputs §4 |
| IS-5.1.2 | Record staged file hashes (SHA-256) | MUST | Spec §5.5 |
| IS-5.1.3 | Record final message hash | MUST | Arch §4.4 |
| IS-5.1.4 | Record ground_truth_accessed: false for candidate steps | MUST | bench-eu-rp §audit_log |
| IS-5.1.5 | Support "what did candidate see?" verification | MUST | Arch §4.4 |

### 5.2 Audit Record Schema

```json
{
  "run_id": "string",
  "call_id": "string",
  "step_id": "string",
  "timestamp": "ISO8601",
  "staged_files": [
    {"path": "string", "hash": "sha256:..."}
  ],
  "message_hash": "sha256:...",
  "message_byte_count": "number",
  "ground_truth_accessed": false,
  "judge_prompts_accessed": false,
  "payloads_admitted": ["p1", "p2"]
}
```

### 5.3 Run Record Requirements (run.jsonl)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-5.3.1 | Append-only per-step records | MUST | Spec §9.2 |
| IS-5.3.2 | Record raw_output and parsed output | MUST | 3-Step Outputs §4 |
| IS-5.3.3 | Record validation result | MUST | bench-eu-rp §Validation |
| IS-5.3.4 | Record score and scoring_details | MUST | Spec §8.1 |
| IS-5.3.5 | Record latency_ms and tokens_used | SHOULD | bench-eu-rp §run.jsonl |

### 5.4 Trace Events (trace.jsonl)

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-5.4.1 | Emit step_start event with payloads_admitted | SHOULD | Arch §5 |
| IS-5.4.2 | Emit model_call event with token counts | SHOULD | Arch §5 |
| IS-5.4.3 | Emit step_complete event with score, latency | SHOULD | Arch §5 |
| IS-5.4.4 | LangGraph-compatible event format | SHOULD | bench-eu-rp §trace.jsonl |
| IS-5.4.5 | Trace is write-only, never affects execution | MUST | Arch §5 |

---

## 6. Orchestration Control Flow

### 6.1 Plan Execution

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-6.1.1 | Execute steps in plan.json array order | MUST | bench-eu-rp §Platform Space |
| IS-6.1.2 | Array index determines execution order, not step_id | MUST | bench-eu-rp §Platform Space |
| IS-6.1.3 | Each step is a blocking operation | MUST | Sequential dependency |
| IS-6.1.4 | Step N must complete before Step N+1 starts | MUST | State dependency |

### 6.2 Error Handling

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-6.2.1 | Validation failure = step score of 0, chain continues | MUST | Spec §8.1 |
| IS-6.2.2 | Model API error = retry per adapter config | SHOULD | Adapter responsibility |
| IS-6.2.3 | Fatal error = abort run, write partial artifacts | SHOULD | Graceful degradation |
| IS-6.2.4 | All steps produce scores (no voiding) | MUST | bench-eu-rp §No Voiding |

### 6.3 Run Lifecycle

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-6.3.1 | Generate unique run_id at start | MUST | 3-Step Outputs §4 |
| IS-6.3.2 | Generate unique call_id per step | MUST | 3-Step Outputs §4 |
| IS-6.3.3 | Initialize empty candidate_state at start | MUST | Arch §2.1 |
| IS-6.3.4 | Write run_manifest.json at end | MUST | Spec §9.2 |
| IS-6.3.5 | Write summary.json at end | MUST | Spec §9.2 |
| IS-6.3.6 | Finalize candidate_state.json at end | MUST | 3-Step Outputs §4 |

### 6.4 Concurrency Model

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-6.4.1 | Steps within an EU are strictly sequential | MUST | State dependency |
| IS-6.4.2 | Multiple EUs may run in parallel | SHOULD | Performance |
| IS-6.4.3 | Per-EU isolation (no cross-EU state) | MUST | Arch §3.3 |
| IS-6.4.4 | Concurrency controlled at EU level, not step level | MUST | Isolation |

---

## 7. Post-Chain Operations

### 7.1 Citation Integrity Check

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-7.1.1 | Run citation_integrity.py after final step | MUST | 3-Step Outputs §4 |
| IS-7.1.2 | Check inventory: all cited cases in ground_truth? | MUST | Spec §8.4 |
| IS-7.1.3 | Check authenticity: any fabricated citations? | MUST | Spec §8.4 |
| IS-7.1.4 | Append result as deterministic record to run.jsonl | MUST | 3-Step Outputs §4 |

### 7.2 Summary Generation

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-7.2.1 | Compute aggregate score from step scores | MUST | bench-eu-rp §summary.json |
| IS-7.2.2 | Use arithmetic mean by default | MUST | bench-eu-rp §Aggregation |
| IS-7.2.3 | Record chain_completion status | MUST | bench-eu-rp §summary.json |
| IS-7.2.4 | Record integrity_check results | MUST | bench-eu-rp §summary.json |
| IS-7.2.5 | Record total_latency_ms and total_tokens | SHOULD | bench-eu-rp §summary.json |

### 7.3 Manifest Generation

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| IS-7.3.1 | Record benchmark_id and version | MUST | Spec §9.2 |
| IS-7.3.2 | Record eu_id and version | MUST | Spec §9.2 |
| IS-7.3.3 | Record runner_version | MUST | Spec §9.2 |
| IS-7.3.4 | Record evaluated_model config | MUST | Spec §9.2 |
| IS-7.3.5 | Record judge_model config | MUST | Spec §9.2 |
| IS-7.3.6 | Record file_hashes for all input files | MUST | Spec §9.2 |
| IS-7.3.7 | Compute reproducibility_key (combined hash) | MUST | Spec §4.6 |

---

## 8. Implementation Mapping

### 8.1 ChainExecutor Components

| Component | Responsibilities | Requirements Coverage |
|-----------|-----------------|----------------------|
| **PayloadGate** | Admission control, placeholder resolution | IS-2.x |
| **InputAssembler** | Message construction, window fencing | IS-4.x |
| **StagingManager** | Directory lifecycle, file copying | IS-3.1.x |
| **OutputHarvester** | Output extraction, sanitization | IS-1.x, IS-3.2.x |
| **AuditBoundary** | Hash computation, log writing | IS-5.x |
| **ScoreAggregator** | Per-step and final scoring | IS-7.x |
| **ChainExecutor** | Orchestration loop, lifecycle | IS-6.x |

### 8.2 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                     INTER-STEP DATA FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

Step N-1 Output                    Step N Input
      │                                 ▲
      ▼                                 │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Output      │───▶│ Candidate   │───▶│ Input       │
│ Harvester   │    │ State       │    │ Assembler   │
│             │    │ (.json)     │    │             │
│ - Extract   │    │ - Sanitized │    │ - Windows   │
│ - Validate  │    │ - Keyed by  │    │ - Fencing   │
│ - Sanitize  │    │   step_id   │    │ - Payloads  │
└─────────────┘    └─────────────┘    └─────────────┘
      │                                      │
      ▼                                      ▼
┌─────────────┐                       ┌─────────────┐
│ Audit       │                       │ Staging     │
│ Boundary    │                       │ Manager     │
│             │                       │             │
│ - Hash      │                       │ - Copy      │
│ - Log       │                       │ - Isolate   │
└─────────────┘                       └─────────────┘
      │                                      │
      ▼                                      ▼
 audit_log.jsonl                      staging/{run}/{call}/
 run.jsonl                                   │
                                             ▼
                                    ┌─────────────┐
                                    │ Inspect     │
                                    │ Task        │
                                    │ (Step N)    │
                                    └─────────────┘
```

---

## 9. Requirement Cross-Reference

| Spec Section | Inter-Step Requirements |
|--------------|------------------------|
| Spec §2.2 (Isolation) | IS-1.2.x, IS-3.3.x |
| Spec §4.1 (Staging) | IS-3.1.x, IS-3.2.8 |
| Spec §4.2 (Payload Admission) | IS-2.x |
| Spec §4.3 (Message Construction) | IS-4.x |
| Spec §4.4 (State Management) | IS-1.x |
| Spec §4.5 (Session Strategies) | IS-4.3.x |
| Spec §8.1 (Scoring) | IS-3.2.4, IS-3.2.5, IS-7.x |
| Spec §8.4 (Citation Integrity) | IS-7.1.x |
| Spec §9.2 (Artifacts) | IS-5.x, IS-7.2.x, IS-7.3.x |
| Arch §2 (Statefulness) | IS-1.x, IS-4.3.x |
| Arch §3 (Memory Providers) | IS-1.1.x (Type 0 baseline) |
| Arch §4 (Session Strategies) | IS-4.3.x |
| Arch §5 (Trace) | IS-5.4.x |

---

*Document derived from AGChain spec documents: legal-10-benchmark-specification-v1.0.md, benchmark package structures-bench-eu-rp.v3.5.md, agchain system architecture.md, 3-step-run-outputs.md*

---
title: "Context persistence and statefulness"
sidebar:
  order: 1
---

# Context Persistence Requirement 

Maintain Statefulness Architecture

**Status:** Draft  
**Last updated:** 2026-01-23

---

## 1. Definition of Statefulness

In this architecture, **Statefulness** is not an intrinsic capability of the evaluated model. It is a **runner-enforced protocol property**.

Statefulness is composed of four non-negotiable pillars that make evaluation deterministic and auditable.

---

## 2. Turning Context into a Discrete, Audit-Controlled Variable

1. **Evaluation Unit (EU) Scoping**
   - A run is scoped to exactly one EU (`eu_id`). There is zero continuity or information leakage across EUs.
   - Within an EU, the runner can execute either:
     - **Replay_Full**: a growing `messages` history inside the EU, or
     - **Replay_Minimal**: a hard-cut per step where each step is a fresh API call and continuity exists only via runner-injected windows (payloads and carry-forward).

2. **Delivery-Gated Admission**
   - Information availability is defined entirely by `plan.json` (`steps[].inject_payloads`) and enforced by physical isolation in a staging directory.
   - Plan-driven enforcement: payload files are physically copied into the candidate-visible environment only when scheduled for the current step.
   - Until scheduled, evidence logically and physically does not exist in the candidate-visible environment.

3. **Structural Isolation (The No-Leak Envelope)**
   - The candidate interacts only with a **staging environment**.
   - The candidate cannot access the raw repository, other EUs, judge prompts, or ground truth.

4. **Sanitized Carry-Forward**
   - The runner maintains a `candidate_state` object to carry forward model-derived artifacts across steps.
   - The carry-forward is strictly sanitized: it contains no ground truth, no scoring logic, and no judge outputs.

### 2.1 Two Kinds of "State" (Do Not Conflate)

- **Runner state (runner-only):** internal bookkeeping the runner uses to orchestrate and score (may include ground truth, scores, judge outputs, retries, etc.). This is never staged for the candidate.
- **Candidate state (`candidate_state.json`, candidate-visible):** the sanitized carry-forward that may be staged and injected into the candidate context.







### 2.2 Candidate Message Assembly (The Deterministic Rule)

This is the canonical rule for how staged files become the final `messages[]` array delivered to the candidate model.

**Inputs (read only from staging for the candidate call):**
- `staging/{run_id}/{call_id}/{step_id}.json` (current step prompt file)
- `staging/{run_id}/{call_id}/p*.json` (admitted payloads only; e.g., `p1.json`, `p2.json`)
- `staging/{run_id}/{call_id}/candidate_state.json` (sanitized carry-forward)

**Output:**
- The `messages[]` array sent to the candidate model for this step.

**Assembly rule (Replay_Minimal baseline):**
1. Start a fresh `messages[]` list (hard cut).
2. Prepend the invariant system message (global rules; includes any Type I pinned context block).
3. Append a fixed set of **window messages** in this order:
   1) `ENV`  
   2) `ANCHOR_PACK` (from staged `p1.json`, when admitted)  
   3) `EVIDENCE_PACK` (from staged `p2.json`, when admitted)  
   4) `CARRY_FORWARD` (from staged `candidate_state.json`)  
   5) `TASK` (from staged `{step_id}.json`)  
   6) `OUTPUT_GUARD` (enforces "return only the response contract")

**Window format (required):**
- Each window is a separate `user` message whose `content` is wrapped with hard fences:

```text
<<<BEGIN_{WINDOW_NAME}>>>
...window body...
<<<END_{WINDOW_NAME}>>>
```

**Payload injection rule (required):**
- Payload contents are injected by constructing the `ANCHOR_PACK` / `EVIDENCE_PACK` windows from the staged payload JSON files.
- Step prompt files must not rely on implicit access to payload bytes. They must treat payloads as text present in windows above the task.

**Truncation rule (required):**
- The runner never truncates the `RESPONSE_CONTRACT` or other output constraints.
- If context must be reduced, only payload/state windows may be truncated, and truncation must be deterministic and recorded in the audit log.

---

## 3. Advanced Memory Architecture ("The Managed State Stack")

To support complex behaviors without breaking isolation, the architecture defines managed state providers as **runner-controlled implementations** of state.

### 3.1 Provider Types

#### Baseline Implementation (Active)

- **Type 0: Serialized State Object (File-Based)**
  - Function: inter-step persistence of model-derived artifacts for use in subsequent steps.
  - Mechanism: a JSON file (`candidate_state.json`) managed by the runner via carry-forward logic.
  - Reference: the Legal-10 baseline implementation.

#### Planned Additions at Platform Architecture Level

- **Type I: Core Identity State (Pinned Context)**
  - Function: persistent runner-controlled invariants (goal/mode/constraints).
  - Mechanism: a reserved, mutable block inside the system message.
  - Rule: pinned context contains instructions and run-level metadata/hashes; it does not contain candidate evidence (e.g., full anchor text). Evidence remains in `p1`/`p2` windows.
  - Reference: "Letta" pattern.

- **Type II: Session Context Manager (Ephemeral Store)**
  - Function: offload and recover EU-local session history to manage context limits without breaking isolation.
  - Mechanism: runner-managed summarization/retrieval.
  - Rule: any content reintroduced to the candidate must be serializable, auditable, and EU-scoped.
  - Reference: "Zep" pattern.

- **Type III: Temporal Fact Store (Validity-Scoped Knowledge)**
  - Function: store assertions with `valid_from` / `valid_to` to resolve contradictions over time.
  - Mechanism: runner-managed temporal store queried by validity window.
  - Rule: facts are EU-scoped; any candidate-visible facts must be admitted like a payload (explicit window + audit logging).
  - Reference: "GraphRAG/Memento" pattern.

### 3.2 The Control Logic ("What This Means")

All providers operate under strict runner control:
1. Passive evaluated model: the model does not write to memory and does not request updates.
2. Runner-managed updates: the runner parses model outputs, extracts artifacts, and updates state providers.
3. Admissibility enforcement: the runner validates extracted artifacts against admissibility rules before committing them to state.

### 3.3 The Isolation Invariant ("What This Does Not Mean")

- **No global learning:** EU_001 cannot access any state from EU_002.
- **No hidden state:** provider contents must be serializable, and any provider content delivered to the candidate must be committed to `audit_log.jsonl` for the run to be valid.

---

## 4. Session Strategy Configuration

The runner supports two execution modes to isolate the variable of "context management" from "protocol logic."

### 4.1 Strategy A: Replay_Full Session (Full Transcript)

- Mechanism: the runner maintains a growing `messages` list for the duration of the EU.
- Construction: invariant header + accumulated history + step task.
- Constraint: the runner must still guarantee that unadmitted evidence never appears in the message history.

### 4.2 Strategy B: Replay_Minimal Session (Bounded State) (Baseline)

- Mechanism: each step is a fresh API call (hard cut).
- Construction:
  1. invariant header (system + Type I pinned context)
  2. admitted payload windows (re-injected from staging)
  3. `CARRY_FORWARD` window (from `candidate_state.json`)
  4. step `TASK` window
  5. output guard

### 4.3 Verification

Both strategies must yield mathematically identical admissibility proofs regarding what evidence was available at any step. The difference is solely how context is presented within the model context window.

### 4.4 Audit proof is part of the protocol

- **Decision:** `audit_log.jsonl` must support "what did the candidate actually see?" verification by hashing:
  - staged bytes (step prompt + admitted payloads + candidate_state)
  - and the exact message bytes sent to the evaluated model for that step boundary
- **Decision:** `run_manifest.json` records `session_strategy` and the payload admissions schedule so results are replayable.

---

## 5. Trace and Observability (Separate Concerns)

To keep the runner in full control, these concerns are separated:

- **Run record (`run.jsonl`)**: the append-only record of candidate/judge/scorer results for the run. This is the results ledger.
- **Trace (`trace.jsonl`)**: an execution timeline of runner events (step start/end, staging lifecycle, parse/validate/scoring milestones). Trace is write-only and never affects execution.
- **Observability (external telemetry)**: spans/metrics/logs to a monitoring system. Observability is never an execution dependency and never injects context.

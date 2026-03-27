# AGChain PDRunner Specification (Inspect-AI Integration)

**Version**: 1.0
**Date**: 2026-01-25
**Status**: Validated against spec docs and inspect-ai source

---

## Executive Summary

This document specifies how AGChain's PDRunner integrates with Inspect-AI. The key architectural insight:

> **Inspect is a step engine. We're building a chain engine.**

Inspect-AI handles intra-step execution excellently (model calls, scoring, logging). AGChain's PDRunner wraps Inspect with an inter-task orchestration layer that enforces staging isolation, payload admission, carry-forward state, and audit boundaries.

---

## A. AGChain Runner Requirements (System Requirements List)

Based on comprehensive review of Legal-10 specification documents. These requirements have been validated against `[core] legal-10-benchmark-specification-v1.0.md` and `[core] benchmark package structures-bench-eu-rp.v3.5.md`.

### 1. Orchestration Requirements

| ID | Requirement | Priority | Spec Reference |
|----|-------------|----------|----------------|
| R1.1 | Plan-driven execution via `plan.json` as single source of truth | MUST | Spec §3.2.2, §4.1 |
| R1.2 | Step execution in array order (index 0 = step 1) regardless of author labels | MUST | bench-eu-rp §Platform Space |
| R1.3 | Platform space (AG-1, AG-2...) vs Author space (d1, d2...) separation | SHOULD | bench-eu-rp §Platform Space |
| R1.4 | Support for N-step chains (Legal-10 baseline: 10 steps) | MUST | Spec §7.3, §7.4 |

### 2. Staging/Isolation Requirements (CRITICAL)

| ID | Requirement | Priority | Spec Reference |
|----|-------------|----------|----------------|
| R2.1 | Per-call staging directory: `staging/{run_id}/{call_id}/` | MUST | Spec §4.1 |
| R2.2 | Copy ONLY admitted files to staging (step file, payloads, candidate_state) | MUST | Spec §4.1 |
| R2.3 | Physical isolation - candidate NEVER sees: ground_truth, judge_prompts, future steps, unadmitted payloads | MUST | Spec §2.2 |
| R2.4 | Delete staging after each call completes | MUST | Spec §4.1 |

### 3. Payload Admission Requirements

| ID | Requirement | Priority | Spec Reference |
|----|-------------|----------|----------------|
| R3.1 | `inject_payloads` array in plan.json controls admission timing | MUST | Spec §4.2 |
| R3.2 | Placeholder resolution: `{p1}`, `{p1.anchor.text}`, `{p2.authorities[0]}` | MUST | bench-eu-rp §Payload Injection |
| R3.3 | Unadmitted payload reference = runtime error | MUST | bench-eu-rp §Injection Rules |
| R3.4 | Payload path resolution: `eus/{eu_id}/{payload_id}.json` | MUST | Spec §3.2.2 |

### 4. State Management Requirements

| ID | Requirement | Priority | Spec Reference |
|----|-------------|----------|----------------|
| R4.1 | `candidate_state.json` carries model-derived artifacts only | MUST | Spec §4.4 |
| R4.2 | Sanitization: NO ground truth, NO scores, NO judge outputs | MUST | Spec §4.4 |
| R4.3 | Type 0 provider (file-based serialized state) as baseline | MUST | Spec §2.3 |
| R4.4 | Future providers: Type I (pinned context), Type II (session manager), Type III (temporal facts) | SHOULD | Spec §2.3 |
| R4.5 | Per-EU scope - no cross-EU state leakage | MUST | Spec §1.3 |

### 5. Message Construction Requirements

| ID | Requirement | Priority | Spec Reference |
|----|-------------|----------|----------------|
| R5.1 | Fenced windows: `<<<BEGIN_{WINDOW}>>> ... <<<END_{WINDOW}>>>` | MUST | Spec §6.2 |
| R5.2 | Window order: ENV -> ANCHOR_PACK -> EVIDENCE_PACK -> CARRY_FORWARD -> TASK -> OUTPUT_GUARD | MUST | Spec §4.3 |
| R5.3 | Session strategies: Replay_Full (growing history) vs Replay_Minimal (hard cut) | MUST | Spec §4.5 |
| R5.4 | Both strategies yield identical audit proofs | MUST | Spec §4.5 |

### 6. Scoring Requirements

| ID | Requirement | Priority | Spec Reference |
|----|-------------|----------|----------------|
| R6.1 | Two modes: deterministic (`scorer_ref`) vs judge (`judge_prompt_file`) | MUST | Spec §8.1 |
| R6.2 | Scorer registry resolves `scorer_ref` IDs | MUST | Spec §2.1.6 |
| R6.3 | Score after EVERY step, record immediately to run.jsonl | MUST | Spec §8.1 |
| R6.4 | Judge model isolated - sees only rubric + outputs (no transcript) | MUST | Spec §2.2 |
| R6.5 | Citation integrity: inventory-based + authenticity gate | MUST | Spec §8.4 |

### 7. Artifact Requirements

| ID | Requirement | Artifact | Priority | Spec Reference |
|----|-------------|----------|----------|----------------|
| R7.1 | Append-only per-step records | `run.jsonl` | MUST | Spec §9.2 |
| R7.2 | Hashes + delivery proofs | `audit_log.jsonl` | MUST | Spec §9.2 |
| R7.3 | Provenance snapshot | `run_manifest.json` | MUST | Spec §9.2 |
| R7.4 | Deterministic rollups | `summary.json` | MUST | Spec §9.2 |
| R7.5 | LangGraph-style events | `trace.jsonl` | SHOULD | Spec §3.3 |

### 8. Reproducibility Requirements

| ID | Requirement | Priority | Spec Reference |
|----|-------------|----------|----------------|
| R8.1 | No runtime retrieval - sealed evidence only | MUST | Spec §4.6 |
| R8.2 | Deterministic scoring reproducible given identical inputs | MUST | Spec §4.6 |
| R8.3 | SHA-256 hashing for audit verification | MUST | Spec §5.5 |
| R8.4 | Fixed RNG seeds for synthetic traps | MUST | Spec §4.6 |

---

## B. Inspect-AI Runner Specification

### Architecture Overview (from source analysis)

```
inspect_ai/
├── _eval/           # Evaluation orchestration
│   ├── task/        # Task execution
│   │   ├── run.py   # Sample execution loop
│   │   └── task.py  # Task definition
│   └── eval.py      # Entry point
├── solver/          # Solver/Plan patterns
│   ├── _solver.py   # Solver Protocol
│   ├── _plan.py     # Plan composition
│   └── _task_state.py  # TaskState
├── scorer/          # Scoring
│   ├── _scorer.py   # Scorer Protocol
│   └── _metric.py   # Metrics/Score
├── dataset/         # Data loading
│   └── _dataset.py  # Sample/Dataset
└── log/             # Logging
    └── _log.py      # EvalSample/EvalLog
```

### Key Abstractions (verified against source)

#### Sample
```python
class Sample(BaseModel):
    input: str | list[ChatMessage]
    choices: list[str] | None
    target: str | list[str]
    id: int | str | None
    metadata: dict[str, Any] | None  # WARNING: Can leak GT if misused
    sandbox: SandboxEnvironmentSpec | None
    files: dict[str, str] | None
```

#### TaskState
```python
class TaskState:
    model: ModelName
    sample_id: int | str
    epoch: int
    input: str | list[ChatMessage]
    messages: list[ChatMessage]  # Growing conversation
    tools: list[Tool]
    output: ModelOutput
    store: Store  # Key-value store
    metadata: dict[str, Any]  # From Sample.metadata
    completed: bool
    scores: dict[str, Score] | None
```

#### Solver Protocol
```python
@runtime_checkable
class Solver(Protocol):
    async def __call__(
        self,
        state: TaskState,
        generate: Generate,
    ) -> TaskState:
        ...
```

#### Scorer Protocol
```python
@runtime_checkable
class Scorer(Protocol):
    async def __call__(
        self,
        state: TaskState,
        target: Target,
    ) -> Score | None:
        ...
```

### Execution Flow

```
task_run(options)
    ├── resolve_dataset() -> samples, states
    ├── resolve_plan() -> plan
    ├── for sample, state in zip(samples, states):
    │       task_run_sample(sample, state, plan, scorers)
    │           ├── emit_sample_start()
    │           ├── plan(state, generate)  # Execute solvers
    │           │       └── for solver in steps:
    │           │               state = await solver(state, generate)
    │           ├── for scorer in scorers:
    │           │       score = await scorer(state, target)
    │           └── emit_sample_end()
    └── eval_results() -> EvalLog
```

---

## C. Integration Architecture

### C.1 Conceptual Mapping: Inspect Task = AGChain Step

**The breakthrough insight:** Inspect-AI's Task is the atomic execution unit. Each AGChain Step maps to one Inspect Task invocation.

| Inspect-AI | AGChain | Relationship |
|------------|---------|--------------|
| Task | Step | 1:1 mapping - one Task per Step |
| Sample | Step execution context | Sample.input = fenced step prompt |
| TaskState | CandidateState + StepContext | Split: candidate-visible vs runner-only |
| Solver | StepHandler | Same pattern, staging-aware |
| Plan | Not used | We call single-step Tasks |
| Scorer | DeterministicScorer / JudgeScorer | Split by scoring mode |
| EvalLog | Step artifact | Per-task output |

**Key Insight:** Inspect-AI treats each Sample as independent. AGChain requires **chained dependencies** between steps where Step N's output feeds Step N+1's input via sanitized carry-forward.

### C.2 Architectural Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  PD-Runner (WE BUILD) - Inter-Task Orchestration            │
│                                                                 │
│  for step in plan.steps:                                        │
│      1. PayloadGate      -> Check inject_payloads, admit files  │
│      2. InputAssembler   -> Build Sample.input (fenced windows) │
│      3. Launch           -> inspect.eval(task, sample)          │
│      4. Harvest          -> Extract output, sanitize            │
│      5. AuditBoundary    -> Hash, log handoff proof             │
│      6. CarryForward     -> Update state for next iteration     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
 ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
 │ Inspect     │       │ Inspect     │       │ Inspect     │
 │ Task (d1)   │  ---> │ Task (d2)   │  ---> │ Task (j10)  │
 │             │       │             │       │             │
 │ - Solver    │       │ - Solver    │       │ - Solver    │
 │ - Scorer    │       │ - Scorer    │       │ - JudgeScore│
 │ - Logger    │       │ - Logger    │       │ - Logger    │
 └─────────────┘       └─────────────┘       └─────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                    Inspect handles all of this
```

### C.3 What Inspect Provides (Intra-Step) - FREE

| Capability | Inspect Component | Benefit |
|------------|-------------------|---------|
| Model calls | ModelAPI + generate() | Multi-provider support, caching, retries |
| Solver execution | Plan + Solver | Composable step logic |
| Scoring | Scorer + registry | Deterministic + model-graded |
| Per-task logging | EvalLog + EvalSample | Rich execution traces |
| Concurrency | Semaphores + TaskGroup | Controlled parallelism |
| Error handling | Sample error handler | Retries, fail-on-error config |
| Token/message limits | TaskState limits | Built-in guardrails |
| Sandbox support | SandboxEnvironment | Code execution isolation |

### C.4 What We Build (Inter-Task Layer)

#### PayloadGate
```python
class PayloadGate:
    """Controls what evidence is admitted at each task boundary."""

    def get_admitted_payloads(self, step: PlanStep, eu: EUPacket) -> list[Payload]:
        """Return only payloads listed in step.inject_payloads"""
        return [eu.payloads[pid] for pid in (step.inject_payloads or [])]
```
**Complexity**: ~30 LOC - Simple lookup and validation

#### InputAssembler
```python
class InputAssembler:
    """Constructs Sample.input with fenced windows."""

    def build(self, step_file: StepFile, payloads: list[Payload],
              carry_forward: dict) -> str | list[ChatMessage]:
        """
        Assembles:
        <<<BEGIN_ENV>>>...<<<END_ENV>>>
        <<<BEGIN_ANCHOR_PACK>>>...<<<END_ANCHOR_PACK>>>
        <<<BEGIN_EVIDENCE_PACK>>>...<<<END_EVIDENCE_PACK>>>
        <<<BEGIN_CARRY_FORWARD>>>...<<<END_CARRY_FORWARD>>>
        <<<BEGIN_TASK>>>...<<<END_TASK>>>
        <<<BEGIN_OUTPUT_GUARD>>>...<<<END_OUTPUT_GUARD>>>
        """
        windows = []
        windows.append(self.fence("ENV", self.env_content()))

        if "p1" in payloads:
            windows.append(self.fence("ANCHOR_PACK", payloads["p1"]))
        if "p2" in payloads:
            windows.append(self.fence("EVIDENCE_PACK", payloads["p2"]))

        if carry_forward:
            windows.append(self.fence("CARRY_FORWARD", json.dumps(carry_forward)))

        windows.append(self.fence("TASK", step_file.task_content))
        windows.append(self.fence("OUTPUT_GUARD", step_file.output_contract))

        return "\n\n".join(windows)

    def fence(self, name: str, content: str) -> str:
        return f"<<<BEGIN_{name}>>>\n{content}\n<<<END_{name}>>>"
```
**Complexity**: ~80 LOC - Template logic with placeholder resolution

#### OutputHarvester
```python
class OutputHarvester:
    """Extracts and sanitizes task output for carry-forward."""

    FORBIDDEN = {'ground_truth', 'score', 'judge', 'gt_', 'rubric'}

    def harvest(self, eval_log: EvalLog, step_id: str) -> dict:
        """Extract model output, strip any leaked scoring data."""
        sample = eval_log.samples[0]
        output = sample.output.model_dump()
        return {step_id: self.sanitize(output)}

    def sanitize(self, data: dict) -> dict:
        return {k: v for k, v in data.items()
                if not any(f in k.lower() for f in self.FORBIDDEN)}
```
**Complexity**: ~40 LOC - Filter and forward

#### AuditBoundary
```python
class AuditBoundary:
    """Records hash proofs at each inter-task boundary."""

    def record(self, run_id: str, step_id: str,
               input_content: str, output: dict, eval_log: EvalLog):
        """Emit audit record with hashes."""
        record = {
            "run_id": run_id,
            "step_id": step_id,
            "timestamp": datetime.utcnow().isoformat(),
            "input_hash": hashlib.sha256(input_content.encode()).hexdigest(),
            "output_hash": hashlib.sha256(json.dumps(output).encode()).hexdigest(),
            "eval_log_location": eval_log.location
        }
        self.append_to_audit_log(record)
```
**Complexity**: ~50 LOC - Hash and append

#### ChainExecutor (Orchestrator)
```python
class ChainExecutor:
    """Orchestrates task sequence with inter-task handoffs."""

    async def execute(self, benchmark: BenchmarkPacket, eu: EUPacket) -> ChainResult:
        run_id = uuid4().hex
        carry_forward = {}

        for step in benchmark.plan.steps:
            # Inter-task: Prepare
            payloads = self.payload_gate.get_admitted(step, eu)
            sample_input = self.input_assembler.build(
                step.step_file, payloads, carry_forward
            )

            # Hand off to Inspect
            task = self.load_inspect_task(step)
            sample = Sample(input=sample_input, target=eu.ground_truth.get(step.step_id))
            eval_log = await inspect.eval(task, dataset=[sample])

            # Inter-task: Harvest
            output = self.harvester.harvest(eval_log, step.step_id)
            carry_forward.update(output)

            # Inter-task: Audit
            self.audit.record(run_id, step.step_id, sample_input, output, eval_log)

        return self.finalize(run_id, carry_forward)
```
**Complexity**: ~100 LOC - Loop with handoffs

---

## D. Gap Analysis (Revised)

The original gap analysis incorrectly identified issues at the wrong abstraction level. The revised assessment:

| Original "Gap" | Revised Status | Location |
|----------------|----------------|----------|
| Staging isolation | **Not a gap** | Inter-task layer controls what enters each task via Sample.input |
| Payload admission | **Not a gap** | PayloadGate runs before task launch |
| audit_log.jsonl | **Not a gap** | AuditBoundary writes between tasks |
| Fenced windows | **Not a gap** | InputAssembler constructs before task launch |
| Carry-forward | **Not a gap** | OutputHarvester + loop state between tasks |
| Judge isolation | **Not a gap** | Separate Inspect Task with judge scorer |
| Per-step scoring | **Not a gap** | Each Task has its own scorer; we aggregate |

**None of these require modifying Inspect internals.** They're all inter-task concerns handled by our wrapper.

### Critical Architectural Constraints

1. **Sample.metadata MUST NOT contain ground_truth** - Inspect passes this to TaskState.metadata which is model-visible
2. **Each step = separate inspect.eval() call** - This ensures fresh TaskState per step
3. **Sample.input = fenced windows only** - We control what the model sees by construction

---

## E. Implementation Specification

### E.1 Detailed Execution Pseudocode

```python
class ChainExecutor:
    async def execute_chain(self, benchmark: BenchmarkPacket, eu: EUPacket) -> RunResult:
        run_id = generate_run_id()
        candidate_state = CandidateState()

        for step in benchmark.plan.steps:
            call_id = generate_call_id()

            # Phase 1: Staging (optional file-based for audit)
            staging_dir = self.staging_manager.create(run_id, call_id)
            self.staging_manager.stage_step_file(staging_dir, step.step_file)

            for payload_id in step.inject_payloads or []:
                self.staging_manager.stage_payload(staging_dir, eu, payload_id)

            self.staging_manager.stage_candidate_state(staging_dir, candidate_state)

            # Phase 2: Message Assembly
            messages = self.message_assembler.build(
                step_file=staging_dir / step.step_file,
                payloads=[staging_dir / p for p in (step.inject_payloads or [])],
                candidate_state=candidate_state,
                session_strategy=self.config.session_strategy
            )

            # Phase 3: Audit (pre-call)
            staged_hashes = self.audit_logger.hash_staged_files(staging_dir)
            message_hash = self.audit_logger.hash_messages(messages)

            # Phase 4: Inspect Task Execution
            task = self.create_inspect_task(step)
            sample = Sample(
                input=messages,
                target=eu.ground_truth.get(step.step_id)  # Scorer uses this
                # NOTE: NO metadata with ground_truth - critical for isolation
            )
            eval_log = await inspect.eval(task, dataset=[sample])

            # Phase 5: Validation & Parsing
            parsed = self.validator.validate_and_parse(
                eval_log.samples[0].output,
                step.output_contract
            )

            # Phase 6: Scoring (already done by Inspect, we extract)
            score = eval_log.samples[0].scores

            # Phase 7: State Update
            candidate_state.update(step.step_id, self.sanitizer.sanitize(parsed))

            # Phase 8: Logging
            self.audit_logger.emit_run_record(run_id, call_id, step,
                                              eval_log.samples[0].output, parsed, score)
            self.audit_logger.emit_audit_record(run_id, call_id, staged_hashes, message_hash)

            # Phase 9: Cleanup
            self.staging_manager.cleanup(staging_dir)

        return self.finalize_run(run_id)
```

### E.2 Component Implementation Scope

| Component | Lines of Code (est.) | Dependencies |
|-----------|---------------------|--------------|
| PayloadGate | ~30 | plan.json schema |
| InputAssembler | ~80 | Window templates |
| OutputHarvester | ~40 | Sanitization rules |
| AuditBoundary | ~50 | hashlib, jsonl writer |
| ChainExecutor | ~100 | Inspect eval() API |
| **Total** | **~300 LOC** | |

This is a **thin wrapper**, not a framework rewrite.

### E.3 Integration Constraints (HAL vs Inspect)

Per Spec §10.2 and §10.3:

- **HAL "non-Inspect" mode**: HAL runs one task -> one agent invocation with all inputs visible. Legal-10 semantics MUST be implemented by PDRunner.
- **Inspect mode**: No default staging enforcement. We control via Sample.input construction.
- **Physical separation**: Inspect loads sample data into memory at task start. We achieve isolation by:
  1. Never passing ground_truth through Sample.metadata
  2. Constructing Sample.input with only admitted content
  3. Launching each step as a separate inspect.eval() call

---

## F. Implementation Priorities

### Phase 1: Core Infrastructure
1. ChainExecutor basic loop with Inspect integration
2. PayloadGate with inject_payloads enforcement
3. InputAssembler with fenced window construction
4. AuditBoundary (run.jsonl + audit_log.jsonl)

### Phase 2: Message Assembly
1. Complete InputAssembler with placeholder resolution
2. Session strategy implementation (Replay_Minimal first)
3. CandidateState with sanitization validation

### Phase 3: Scoring Integration
1. Deterministic scorer registry integration
2. JudgeScorer with isolation verification
3. Citation integrity checker integration
4. Summary aggregation

### Phase 4: Polish & Verification
1. Integration tests for isolation guarantees
2. Hash verification tests
3. Run manifest generation
4. Documentation

---

## G. Next Steps

1. **Prototype ChainExecutor** with a 3-step chain (d1 -> d2 -> j3)
2. **Validate Inspect Task** can accept our fenced Sample.input format
3. **Test round-trip** carry-forward through multiple tasks
4. **Verify audit hashes** match expected values for reproducibility
5. **Integration test**: Confirm ground_truth never appears in model messages

---

## Summary

**Verdict: Thin Inter-Task Wrapper Around Inspect-AI**

Inspect-AI provides excellent intra-step execution (model calls, scoring, logging). AGChain's PDRunner adds:

1. **PayloadGate** - Enforces inject_payloads timing
2. **InputAssembler** - Constructs fenced Sample.input
3. **OutputHarvester** - Sanitizes carry-forward state
4. **AuditBoundary** - Hash proofs at step boundaries
5. **ChainExecutor** - Orchestrates the loop

The isolation guarantees come from **what we feed Inspect**, not from modifying how Inspect works internally. Total new code: ~300 LOC.

---

*Document generated from validated analysis of AGChain specs and Inspect-AI source code.*

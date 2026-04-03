---
title: "Inspect runtime helper adoption analysis"
sidebar:
  order: 5
---

# Inspect Runtime Helper Maximization Analysis

**Date:** 2026-03-27  
**Status:** Analysis  
**Scope:** Assess whether Legal-10's current runtime helpers maximize reuse of the local `inspect_ai` reference, and define the integration pattern needed to increase Inspect utilization without giving up AG chain ownership of context, statefulness, admission control, and audit.

## Executive Answer

No. The current runtime helpers are **not** sufficient if the objective is to maximize use of Inspect AI as the execution substrate.

They are good at preserving AG chain semantics, especially:

- payload admission
- structured window assembly
- sanitized candidate carry-forward
- per-step audit hashing
- strict runner ownership of what the candidate sees

But they currently underuse Inspect in the parts where Inspect is strongest:

- model resolution and provider execution
- task execution lifecycle
- sample and sandbox setup
- tool provisioning and tool execution
- approval policies
- MCP integration
- eval logging and event timelines
- model roles
- built-in context compaction

So the right conclusion is:

- **Keep** the AG chain policy helpers that encode benchmark semantics.
- **Replace or wrap** the helpers that duplicate Inspect substrate behavior.
- **Rebase the per-step execution path** on Inspect `Task`, `Sample`, `Model`, sandbox, tool, scorer, and logging contracts.

The current prototype maximizes AG chain control. It does **not** yet maximize Inspect reuse.

---

## Inspect-First Reference Policy

`inspect_ai` should be treated as a **first-class reference repo** for AG chain runtime work.

That means runtime implementation decisions in this area should follow this order:

1. **Cross-check Inspect first.** Before building a runtime feature, check whether the capability already exists in the local Inspect reference.
2. **Wrap before reimplementing.** If the capability exists and is compatible with AG chain requirements, prefer the correct AG chain wrapper over an independent replacement.
3. **Extend when AG chain exceeds Inspect.** If AG chain requirements materially exceed Inspect's subject scope, prefer a clean split:
   - wrap the Inspect-supported portion
   - build AG chain-owned functionality above it
4. **Replace only with a clear rationale.** Independent implementation is justified when:
   - AG chain requirements substantially exceed Inspect's scope
   - Inspect behavior is architecturally opposed to AG chain's design
   - Inspect implementation is incompatible with AG chain's benchmark, fairness, audit, or platform requirements
   - the AG chain implementation is demonstrably stronger for the target scope
5. **Default against substrate duplication.** If Inspect already provides the stronger substrate, the direction is to wrap it unless a concrete incompatibility is documented.

This is stricter than a general "Inspect-informed" approach. It makes Inspect the default execution reference while preserving AG chain ownership where AG chain's requirements are broader, stricter, or structurally different.

---

## Sources Reviewed

### AG chain / Legal-10

- run_3s.py
- input_assembler.py
- payload_gate.py
- state.py
- staging.py
- audit.py
- model_adapter.py
- statefulness-context-persistence.md
- inter-step-requirements.md
- pdrunner-inspect-ai.md

### Inspect AI

- environment.py
- registry.py
- __init__.py
- eval.py
- run.py
- generate.py
- sandbox.py
- resolved.py
- _dataset.py
- _task_state.py
- _use_tools.py
- _model.py
- _call_tools.py
- _compaction.py
- types.py
- _tool.py
- _tool_def.py
- __init__.py
- _policy.py
- _log.py
- event/__init__.py
- tool/_mcp/__init__.py
- tool/_mcp/tools.py

---

## Core Assessment

The current helper stack mixes two different layers:

1. **AG chain policy layer**
2. **Inspect substrate layer**

The AG chain layer should remain custom. The Inspect layer should not.

Today, the code in run_3s.py and model_adapter.py still performs too much substrate work itself. It bypasses:

- Inspect `ModelAPI` and `Model`
- Inspect `Task` and `Sample`
- Inspect task execution and retry path
- Inspect tool execution and approval path
- Inspect eval log schema and event timeline
- Inspect sandbox file/setup injection lifecycle

That means the prototype is:

- strong on AG chain semantics
- weak on Inspect maximization

This is the right prototype direction for proving semantics, but not the final architecture if maximizing Inspect reuse is the goal.

---

## Helper-By-Helper Decision

| Current helper | Decision | Why |
|---|---|---|
| `model_adapter.py` | Replace | Duplicates Inspect model/provider layer |
| `run_3s.py` orchestration loop | Split | Keep AG chain step-boundary orchestration, replace per-step execution kernel with Inspect |
| `payload_gate.py` | Keep | This is AG chain-owned policy; Inspect has no equivalent |
| `input_assembler.py` | Keep, but adapt | AG chain-owned message policy; emit Inspect-native chat objects |
| `state.py` | Keep, but narrow | Candidate-state sanitization is AG chain-owned; do not confuse it with Inspect `TaskState.store` |
| `staging.py` | Keep intent, rework implementation | Keep audit-visible staging, but hand off staged files through Inspect `Sample.files` and sandbox lifecycle |
| `audit.py` | Keep, augment | AG chain needs stricter audit proofs than Inspect; attach Inspect logs rather than replacing them |

### 1. Replace `model_adapter.py`

model_adapter.py is the clearest case of underusing Inspect. It manually wraps OpenAI and Anthropic calls, while Inspect already provides:

- provider registry and resolution in _model.py
- provider-specific behavior and limits
- token and cost accounting
- retry logic
- model roles
- tool-call integration
- provider-native compaction hooks

**Replacement pattern**

- Stop calling providers directly from `run_3s.py`.
- Resolve evaluated and judge models through Inspect `get_model(...)`.
- Store AG chain model registry data in a shape that can compile to Inspect model strings and `model_args`.
- Use Inspect `model_roles` for evaluated vs judge separation.

### 2. Split `run_3s.py`

run_3s.py currently does two jobs:

- AG chain step-boundary orchestration
- per-step model execution

The first job is AG chain-owned. The second should move to Inspect.

**Keep in AG chain**

- plan order
- per-step payload admission
- carry-forward updates
- exact message assembly policy
- exact audit hashing policy
- environment-profile policy selection

**Move to Inspect**

- execution of one step as one `Task`
- `Sample` creation
- model invocation
- scorer execution
- sandbox lifecycle
- tool execution
- event and eval logging

### 3. Keep `payload_gate.py`

payload_gate.py is correctly custom.

Inspect does not implement benchmark-authored admission control. It accepts sample inputs, sample files, and sandbox config, but it does not decide:

- which payload exists at which step
- when evidence becomes visible
- what should be hidden until a later boundary

This helper should remain AG chain-owned.

### 4. Keep `input_assembler.py`, but adapt it

input_assembler.py is also correctly AG chain-owned because structured windows are part of AG chain's core product thesis.

What should change is the output form. Right now it emits plain `{role, content}` dicts. It should emit Inspect-native `ChatMessage` objects, so the assembly phase plugs directly into:

- Inspect `Sample.input`
- Inspect `TaskState.messages`
- Inspect compaction hooks
- Inspect logging

**Keep**

- window order
- fences
- payload insertion semantics
- output-guard semantics

**Change**

- return `list[ChatMessage]` instead of plain dicts
- make compaction-aware boundaries explicit so future reducers can preserve `OUTPUT_GUARD`

### 5. Keep `state.py`, but narrow its responsibility

state.py should stay, because candidate-visible carry-forward is an AG chain policy object, not an Inspect default.

But it should not become a duplicate of Inspect `TaskState.store` from _task_state.py.

Use the split:

- `TaskState.store`: execution-local scratch space inside one Inspect task/sample
- `candidate_state`: AG chain-managed, sanitized, candidate-visible, step-to-step carry-forward
- runner state: AG chain-private, never candidate-visible

### 6. Rework `staging.py`

staging.py has the right semantics but the wrong integration depth.

Inspect already supports sample-scoped file/setup injection and sandbox lifecycle through:

- Sample.files / Sample.setup
- sandbox.py
- environment.py

**Recommended pattern**

1. AG chain still creates the staged files on disk for audit and hashing.
2. AG chain passes those staged artifacts into Inspect as `Sample.files`.
3. Inspect injects them into the sandbox/sample working context.
4. AG chain records hashes of the staged bytes and final message bytes.

That preserves AG chain audit semantics while letting Inspect own the file injection lifecycle.

### 7. Keep `audit.py`, but augment it with Inspect artifacts

audit.py should remain AG chain-owned. Inspect logs are rich, but they are not a substitute for AG chain's stricter proof requirements:

- exact staged file hashes
- exact assembled message hash
- explicit payload admission record
- explicit proof of what the candidate saw at each step boundary

The correct model is:

- AG chain `audit_log.jsonl` remains canonical for environment-profile proof
- Inspect `EvalLog`, `EvalSample`, and event timelines become attached supporting evidence

---

## Additional Inspect Integration Needed

The following Inspect modules should be integrated next if the goal is maximum reuse.

## Tier 1: Must Integrate

### 1. Model layer

- _model.py

Use this to replace the custom direct-provider adapter layer.

### 2. Task/eval execution layer

- eval.py
- run.py
- generate.py
- resolved.py

These should become the per-step execution kernel.

### 3. Dataset/sample abstraction

- _dataset.py

Each AG chain step boundary should compile into an Inspect `Sample`.

### 4. Sandbox lifecycle

- environment.py
- registry.py
- sandbox.py

These replace bespoke sandbox wiring and make sandbox type pluggable.

### 5. Logging and event model

- _log.py
- event/__init__.py

These should become the standard execution log substrate underneath AG chain's own audit artifacts.

## Tier 2: Strongly Recommended

### 6. Tool execution pipeline

- _tool.py
- _tool_def.py
- _call_tools.py
- _use_tools.py

If AG chain wants environment profiles to vary tool access cleanly, it should not invent a parallel tool substrate.

### 7. Approval policies

- _policy.py

This should back tool access control inside tool-oriented environment profiles.

### 8. MCP integration

- tool/__init__.py
- tool/_mcp/__init__.py
- tool/_mcp/tools.py

This matters because future environment profiles will likely vary:

- no tools
- standard tools
- MCP tools
- sandbox tools
- broader autonomous tool bundles

AG chain should compose those profiles over Inspect's tool and MCP substrate rather than rebuilding MCP dispatch.

## Tier 3: Useful but Not Sufficient

### 9. Compaction

- _compaction.py
- types.py

Inspect compaction should be integrated, but only as a sub-capability inside AG chain statefulness strategies. It is not a replacement for the AG chain statefulness registry.

---

## Recommended Integration Pattern

The right pattern is **compile AG chain environment policy into Inspect runtime objects**.

### Boundary rule

AG chain decides:

- what context exists
- what is admitted
- what windows are built
- what candidate state survives
- what tools are exposed
- what audit proof is required

Inspect executes:

- the model call
- tool calls
- sample sandboxing
- scorer lifecycle
- retries and limits
- per-sample logs and events

### Target architecture

```text
AG chain ChainExecutor
  -> selects EnvironmentProfile
  -> admits payloads
  -> stages files
  -> assembles candidate-visible messages
  -> compiles one step into Inspect Sample + Task
  -> calls Inspect eval/task runtime
  -> harvests EvalLog / EvalSample / events
  -> sanitizes output into candidate_state
  -> emits AG chain audit artifacts
```

### Per-step compile pattern

For each step:

1. `PayloadGate` resolves admitted payloads.
2. `StagingManager` writes audit-visible staged files.
3. `InputAssembler` returns Inspect-native `ChatMessage` windows.
4. AG chain builds an Inspect `Sample`:
   - `input = list[ChatMessage]`
   - `files = staged files`
   - `sandbox = SandboxEnvironmentSpec(...)` when needed
   - `target = scorer target only`
   - `metadata = safe non-sensitive metadata only`
5. AG chain builds or resolves an Inspect `Task`:
   - solver for the current step
   - scorer for the current step
   - model roles
   - sandbox spec
   - approval policies
6. Inspect runs the step.
7. AG chain harvests:
   - `EvalLog`
   - `EvalSample`
   - model usage
   - events/timelines
8. AG chain updates `candidate_state`.
9. AG chain emits step-boundary audit proof.

---

## What Should Not Be Delegated To Inspect

Do **not** hand these over to Inspect defaults:

- payload admission schedule
- candidate-visible message window ordering
- candidate-state sanitization
- benchmark-specific fairness policy
- environment-profile identity and versioning
- AG chain audit proof format
- exact “what the candidate saw” hashing

Inspect is the runtime substrate. It is not the authority on AG chain runtime policy.

---

## Concrete Migration Sequence

## Phase 1: Replace the model adapter

Replace model_adapter.py with Inspect model resolution.

Outcome:

- provider duplication removed
- model roles unlocked
- token/cost accounting aligned with Inspect

## Phase 2: Rebase step execution on Inspect `Task` and `Sample`

Keep AG chain orchestration, but replace direct call logic in run_3s.py with per-step Inspect tasks.

Outcome:

- step execution, retries, limits, scoring, and logs move to Inspect

## Phase 3: Rework staging into `Sample.files` + sandbox lifecycle

Keep staged-on-disk artifacts for audit, but pass them into Inspect sample sandbox execution through `Sample.files`, `Sample.setup`, and sandbox specs.

Outcome:

- AG chain keeps proof
- Inspect owns sample file/setup injection

## Phase 4: Adopt Inspect tool and approval pipeline

Move environment-profile tool strategies onto:

- `Tool`
- `ToolDef`
- `ToolSource`
- `use_tools`
- `execute_tools`
- `ApprovalPolicy`
- MCP tool sources

Outcome:

- tool bundles become composable
- approval and MCP reuse rises sharply

## Phase 5: Layer AG chain statefulness registry above Inspect

Implement statefulness strategies above Inspect runtime, not inside it.

Outcome:

- AG chain keeps the differentiated product thesis
- Inspect still handles the execution substrate

---

## Final Verdict

The current helpers are **semantically correct but substrate-heavy**.

If the objective is:

- preserve AG chain's benchmark-controlled context and statefulness semantics
- while maximizing reuse of the local Inspect reference

then the current helper set is **not sufficient as-is**.

The correct end state is:

- **keep** `payload_gate`, `input_assembler`, candidate-state sanitization, and AG chain audit proof
- **replace** `model_adapter`
- **rebase** per-step execution in `run_3s.py` onto Inspect task/sample/model/sandbox/logging
- **adopt** Inspect tool, approval, MCP, sandbox, and logging subsystems
- **treat compaction as a sub-feature**, not as the statefulness architecture

That is the highest-leverage path to maximize Inspect reuse without losing AG chain's core architectural advantage.

More precisely, AG chain should follow an **Inspect-first, wrap-first, extend-above** rule:

- inspect first for an existing substrate
- wrap it when compatible
- extend above it when AG chain exceeds it
- replace it only when incompatibility or architectural conflict is clear and documented

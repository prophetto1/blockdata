# Research Prompt: Environment Profile Architecture — Extensible Registries for Statefulness and Tool Provision

**Date:** 2026-03-27
**Type:** Investigation / Research
**Status:** Open

---

## Objective

Design the extensible registry architecture for the two core dimensions of an **Environment Profile** — the platform object that controls how context is provided and how tools are made available to an evaluated model during a benchmark run.

The platform's core insight is not "which model wins on this benchmark" but **"which runtime policy makes this model strongest."** The comparison matrix is three-dimensional:

```
Benchmark (fixed) × Model (fixed) × Environment Profile (varied)
```

This research must produce the contract definitions, registry patterns, and extension points that make these two dimensions scalable — meaning new methodologies can be added without modifying the platform core.

---

## Background: How We Got Here

### The agchain platform

agchain is a benchmark evaluation platform for AI models. The platform has a React/TypeScript frontend (Vite, Ark UI, Tailwind) and a Python backend (DuckDB, Pydantic, OpenAI SDK, Langfuse). The first benchmark implementation is Legal-10, a structured legal reasoning evaluation chain with 3-step and 10-step variants.

### The shell and workbench design debate

A worker proposed an 11-item left rail for the agchain shell (Benchmarks, Runspecs, Datasets, Evidence Packs, Evaluation Units, Models, Policies, Runs, Results, Artifacts, Observability, Settings). The platform owner rejected this as exposing every internal concept as a navigation item. The correct model is 5-6 durable platform workflows in the rail, with complexity living inside a benchmark workbench:

- **Benchmarks** — authored evaluation specs; entering one opens the workbench
- **Models** — platform model registry (endpoints, health, capabilities)
- **Environments** — context/tool/session configuration profiles (this document's subject)
- **Runs** — execution: benchmark × model × environment profile
- **Results** — three-axis comparison and insight
- **Ops** — system health and observability

### Inspect AI adoption decision

After studying hundreds of hours of eval frameworks (Inspect AI, HAL Harness, Vivaria, Promptfoo, Agenta, Phoenix, Langfuse, DeepEval, Opik, LegalBench, PRBench, PLAWBENCH, and others), the decision was made to adopt Inspect AI's (UK AISI) sandbox/runner architecture for agchain's execution layer. Specifically:

1. **SandboxEnvironment ABC** — 4-method contract (exec, write_file, read_file, connection). Docker built-in, extensible to K8s. Inspect sits outside the sandbox; only tool execution (untrusted code) runs inside.
2. **ResolvedTask pattern** — Separation of authored spec (Task = solver chain + scorer + dataset) from resolved execution instance (ResolvedTask = Task + bound Model + bound Sandbox). The runspec workbench authors a Task; run launch produces a ResolvedTask.
3. **model_roles** — First-class separation of evaluated model vs judge model vs other roles, resolved at eval time not authoring time.
4. **Per-sample sandbox lifecycle** — provision → inject files → execute solver chain → score → cleanup.

The Inspect AI source is cloned locally at `_agchain/_reference/inspect_ai/` for reference.

### The context provision gap in Inspect AI

After reading Inspect's source, a critical gap was confirmed: **Inspect has no first-class concept of context provision strategy.** Their model is:

- `TaskState` holds a `messages: list[ChatMessage]` that grows as solvers append to it
- `generate()` sends the full messages list to the model
- When messages exceed the context window, a `CompactionStrategy` (trim / edit / summary / native) reduces them
- A `memory` tool lets the model save notes before compaction

This is purely overflow management within a single session. It does not address:

| Dimension | Inspect AI | What we need |
|---|---|---|
| Session strategy | Always one growing session | Configurable: fresh-per-step vs continuous vs grouped |
| API call boundary | Implicit (solver calls generate) | Explicit config per step |
| Payload admission | Everything visible from start | Delivery-gated: evidence doesn't exist until scheduled |
| Carry-forward | `TaskState.store` (unstructured dict) | Sanitized candidate_state with allowlists |
| Context assembly | Flat messages accumulation | Structured windows (ENV, ANCHOR_PACK, EVIDENCE_PACK, CARRY_FORWARD, TASK, OUTPUT_GUARD) |
| State providers | None (memory tool is model-initiated) | Type 0-III: all runner-controlled |
| Audit of what model saw | Log file after the fact | Hash of exact staged bytes + message bytes at each step |
| Evidence isolation | Sandbox isolates code execution | Staging directory isolates evidence |

### The core value proposition

The platform's most important insight is not "which model wins on this benchmark." It is **"which runtime policy makes this model strongest."**

The comparison matrix is three-dimensional: Benchmark (fixed) × Model (fixed) × Environment Profile (varied). Same benchmark, same model, different environment configurations — compare the results. The delta between environment profiles is the product's core output.

Example: GPT-5.5.2 scores 78% with Replay_Minimal + no tools, but 91% with persistent-context + MCP tools + Replay_Full, on the same benchmark. That delta is the insight developers most want and that no one currently offers.

### The scalability requirement

The platform cannot survey today's landscape, enumerate all known patterns, and hardcode them. That becomes outdated. Instead, the two core dimensions — statefulness (context provision) and tools (tool provision) — must be **extensible registries**. Each registry defines a contract. New patterns implement the contract and register. The platform never needs to know the internals of a strategy — it just knows the contract interface.

### Existing spec work

The Legal-10 implementation already spec'd significant context provision architecture in `_agchain/legal-10/docs/platform/statefulness-context-persistence.md`:

- **Replay_Full** (Strategy A): Growing messages list within EU, admission-gated
- **Replay_Minimal** (Strategy B): Fresh API call per step, structured windows, carry-forward
- **Type 0**: Serialized state object (JSON file carry-forward)
- **Type I**: Core identity state (pinned context in system message — Letta pattern)
- **Type II**: Session context manager (runner-managed summarization — Zep pattern)
- **Type III**: Temporal fact store (validity-scoped assertions — GraphRAG/Memento pattern)
- **Candidate message assembly**: Deterministic window ordering (ENV → ANCHOR_PACK → EVIDENCE_PACK → CARRY_FORWARD → TASK → OUTPUT_GUARD)
- **Audit**: Hash of staged bytes + message bytes at each step boundary
- **Isolation**: Runner state vs candidate state strictly separated; candidate cannot access judge prompts, ground truth, or other EUs

This spec is the starting point — but it was written for Legal-10's specific needs, not as a general-purpose extensible registry. This research must generalize it.

---

## Context: Why This Matters

No existing evaluation platform treats runtime policy as a first-class comparison axis. Inspect AI, Promptfoo, Agenta, Phoenix, LangSmith — they all treat context provision and tool access as fixed settings or fairness constraints. None of them let you hold the benchmark and model constant and vary the evaluation environment to discover optimal runtime policy.

This is what developers most want to know and what is least offered by anyone.

The same model (e.g., GPT-5.5.2 with 200K context window), evaluated on the same benchmark, will produce dramatically different results depending on:
- Whether it gets a fresh API call per step or a continuous session
- Whether it has access to tools, MCP servers, internet, or nothing
- Whether context is provided as structured windows, flat history, or via a persistent local database
- Whether state carries forward as a sanitized JSON file, a pinned system message block, a session manager, or a temporal fact store

As long as these conditions are applied equally to all models within a single benchmark run, the benchmark is fair. The platform's job is to make all of these conditions configurable, composable, and auditable — and then make the results comparable across different configurations.

---

## Research Area 1: Statefulness Registry

**Definition:** How context is provided to the evaluated model — the methodologies and patterns for assembling, persisting, and delivering information across evaluation steps.

### What the contract must cover

1. **Context assembly** — Given a step definition, admitted payloads, and prior state, how is the `messages[]` array constructed?
2. **Inter-step persistence** — What survives between steps? How is it stored, sanitized, and re-injected?
3. **Session boundary** — Is each step a fresh API call (hard cut) or part of a continuous session? Can steps be grouped?
4. **History reconstruction** — When using fresh API calls, how is the model informed of its prior decisions and context?
5. **Admission control** — When does evidence become visible? What gates its admission?
6. **Truncation/compaction** — When context exceeds limits, what is the deterministic reduction strategy?
7. **Audit** — What is hashed and logged to prove exactly what the model saw at each step boundary?

### Known patterns to study (starting inventory, not final set)

| Pattern | Source/Reference | Key characteristic |
|---|---|---|
| Replay_Minimal | Legal-10 `statefulness-context-persistence.md` | Fresh API call per step, structured windows, sanitized carry-forward |
| Replay_Full | Legal-10 `statefulness-context-persistence.md` | Growing session history within EU, admission-gated |
| Type 0: Serialized state | Legal-10 baseline | JSON file carry-forward between steps |
| Type I: Pinned context | Letta pattern | Mutable block in system message for persistent invariants |
| Type II: Session context manager | Zep pattern | Runner-managed summarization/retrieval for session history |
| Type III: Temporal fact store | GraphRAG/Memento pattern | Validity-scoped assertions queried by time window |
| Persistent local context | OpenClaw-like pattern | Local database of context that never dies, continuously accumulates |
| Native compaction | Inspect AI `_compaction/` | Provider-native context window management (trim/edit/summary) |
| RAG-injected context | Various | Retrieval-augmented context injection per step |

### Research questions

- What is the minimal contract interface that all of these patterns can implement?
- What parameters does each pattern expose for configuration?
- How do patterns compose? (e.g., Replay_Minimal + Type II session manager)
- What are the audit requirements common to all patterns?
- What new patterns are emerging (2025-2026) that the contract must not accidentally exclude?
- How does Inspect AI's `CompactionStrategy` contract compare? What does it cover and what does it miss?

---

## Research Area 2: Tools Registry

**Definition:** How tools are made available to the evaluated model — from no tools to all tools, the methodologies and patterns for provisioning, constraining, and auditing tool access.

### What the contract must cover

1. **Tool set definition** — Which tools are available to the model for a given step or run?
2. **Access boundaries** — What external access is permitted? (network, filesystem, MCP servers, databases, APIs)
3. **Constraint enforcement** — Rate limits, scoping, sandboxing, cost caps
4. **Tool call recording** — How are tool invocations and results captured for audit?
5. **Tool result injection** — How do tool results re-enter the model's context?
6. **Isolation** — How is tool access sandboxed to prevent information leakage across EUs?

### Known patterns to study (starting inventory, not final set)

| Pattern | Key characteristic |
|---|---|
| No tools | Model receives only prompt context, zero tool access |
| Standard tool set | Predefined set of tools (e.g., calculator, code interpreter) |
| MCP server access | Model connects to MCP servers for tool discovery and invocation |
| Internet access | Model can make HTTP requests, search, browse |
| Code execution sandbox | Model can write and execute code in an isolated environment |
| File system access | Model can read/write files within a scoped directory |
| Database access | Model can query a database (read-only or read-write) |
| Full autonomy | All available tools, minimal constraints |
| Custom tool set | User-defined tools registered for specific benchmark domains |

### Research questions

- What is the minimal contract interface that spans "no tools" to "full autonomy"?
- How should tool sets compose? (e.g., "standard tools + MCP but no internet")
- How does Inspect AI's sandbox + tool model handle this? What is their `Tool` / `ToolDef` / `ToolChoice` contract?
- What are the audit requirements for tool provision across all patterns?
- How do tool access patterns interact with statefulness patterns? (e.g., persistent-DB context + tool access to that DB)
- What emerging tool patterns (MCP evolution, computer use, etc.) must the contract anticipate?

---

## Research Area 3: Environment Profile as Composed Object

### Questions to resolve

1. **Is the Environment Profile a top-level rail item or a sub-object of the benchmark workbench?**
   - Argument for top-level: it's reusable across benchmarks and is a primary comparison axis
   - Argument for workbench-nested: it's meaningless without a benchmark to run against
   - Current lean: top-level or at minimum a named, versioned, independently browsable object

2. **Schema design** — What does the Environment Profile object look like?
   ```
   environment_profile:
     id:
     name:
     version:
     description:
     statefulness:
       strategy_id: (from registry)
       parameters: (strategy-specific config)
     tools:
       strategy_id: (from registry)
       parameters: (strategy-specific config)
     constraints:
       ... (cost caps, time limits, token limits)
     audit:
       ... (what to hash, what to log)
   ```

3. **Comparison semantics** — When Results shows "Profile A vs Profile B," what exactly is being compared? How do we normalize for strategies that are fundamentally different in kind?

4. **Fairness invariant** — How does the platform enforce that all models in a single run see the same Environment Profile? What validation runs at launch time?

---

## Reference Material

### Internal docs
- `_agchain/legal-10/docs/platform/statefulness-context-persistence.md` — Existing spec for context persistence, session strategies, state provider types, audit requirements
- `_agchain/legal-10/docs/platform/inter-step-requirements.md` — Inter-step requirements including payload admission, carry-forward, message assembly
- `_agchain/legal-10/docs/fdq/` — Formal delivery queries showing per-step prompt/contract/scoring

### External reference (cloned)
- `_agchain/_reference/inspect_ai/` — Inspect AI source
  - Sandbox contract: `src/inspect_ai/util/_sandbox/environment.py`
  - Compaction strategies: `src/inspect_ai/model/_compaction/`
  - Task/ResolvedTask: `src/inspect_ai/_eval/task/`
  - Tool contract: `src/inspect_ai/tool/`
  - Model abstraction: `src/inspect_ai/model/_model.py`

### External projects studied
- Inspect AI (UK AISI) — sandbox, solver chain, scorer, compaction
- HAL Harness (Princeton PLI) — runner adapter pattern, agent/benchmark decoupling
- Vivaria (METR) — full eval platform with task standard (winding down)
- Promptfoo — YAML-config eval specs, comparison UI
- Agenta — model hub, experiment comparison, playground UI
- Arize Phoenix — tracing, datasets, experiments, observability

---

## Expected Output

This research should produce:

1. **Contract definitions** for both registries (Python ABCs or Protocol classes) with method signatures, input/output types, and audit hooks
2. **Parameter schema pattern** — how each registered strategy exposes its configurable knobs so the workbench UI can render them dynamically
3. **Environment Profile schema** — the composed object that references one statefulness strategy + one tools strategy + their parameters
4. **Extension guide** — how a developer adds a new statefulness pattern or tool provision pattern to the platform
5. **Gap analysis** — what Inspect AI's contracts cover vs. what we need, and where we extend vs. adopt

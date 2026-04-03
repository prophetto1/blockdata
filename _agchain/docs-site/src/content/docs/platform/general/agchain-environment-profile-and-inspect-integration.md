---
title: "Environment profile and Inspect integration"
sidebar:
  order: 5
---

# AG chain Environment Profile & Inspect Integration Canon

**Date:** 2026-03-27
**Status:** Consolidated reference — requirements extracted, comparative analysis pending
**Consolidates:** environment-profile-research-prompt, inspect-runtime-helper-maximization-analysis, runtime-environment-doc-canon-and-inspect-comparison, environment-profile-requirements-extraction-summary

---

## 1. Purpose & Core Value Proposition

The platform's core insight is not "which model wins on this benchmark." It is **"which runtime policy makes this model strongest."**

The comparison matrix is three-dimensional:

```
Benchmark (fixed) x Model (fixed) x Environment Profile (varied)
```

Same benchmark, same model, different environment configurations — compare the results. The delta between environment profiles is the product's core output.

Example: GPT-5.5.2 scores 78% with Replay_Minimal + no tools, but 91% with persistent-context + MCP tools + Replay_Full, on the same benchmark. That delta is the insight developers most want and that no one currently offers.

No existing evaluation platform treats runtime policy as a first-class comparison axis. Inspect AI, Promptfoo, Agenta, Phoenix, LangSmith — they all treat context provision and tool access as fixed settings or fairness constraints. None let you hold the benchmark and model constant and vary the evaluation environment.

---

## 2. Doc Canon & Authority Rules

### Source Authority Hierarchy

The Legal-10 corpus defines its own reading order:

1. `legal-10/docs/mvp/M1-buildtime-packaging-sealing-dev-brief.md` — HIGHEST for bundle layout, schemas, sealing
2. `legal-10/docs/platform/inter-step-requirements.md` — HIGHEST for runner semantics (95 IS-* requirements)
3. `legal-10/docs/fdq/*.md` — AUTHORITATIVE for step prompts, output contracts, scoring
4. Everything else — supplementary

For runtime specifically, read in order:
1. `platform/inter-step-requirements.md`
2. `platform/pdrunner-inspect-ai.md`
3. `platform/statefulness-context-persistence.md`
4. `platform/prompt-messages.md`
5. `platform/prompts-v1.0.md`

If overlapping requirements conflict, `inter-step-requirements.md` wins.

### Fresh Primary Sources

These are the docs from which the 349 requirements below were extracted:

| Source | Role |
|--------|------|
| `legal-10/docs/platform/inter-step-requirements.md` | 95 inter-step requirements — runner semantics authority |
| `legal-10/docs/platform/statefulness-context-persistence.md` | Statefulness architecture: replay strategies, state providers, carry-forward |
| `legal-10/docs/platform/prompt-messages.md` | Fenced window format specification |
| `legal-10/docs/platform/pdrunner-inspect-ai.md` | Runner spec with Inspect integration requirements |
| `legal-10/docs/platform/prompts-v1.0.md` | Prompts as structured state protocol |
| `docs-site/src/content/docs/platform/state-messages/` | Published mirrors of state/message docs |
| `docs-site/src/content/docs/platform/isolation-security/` | Published mirrors of isolation docs |
| `docs-site/src/content/docs/platform/audit-repro/` | Published mirrors of audit docs |

### Stale Docs (Set Aside)

- `build-pipeline/data-pipeline-reference.md` — marked "MUST BE UPDATED"
- `mvp/benchmark-technical-specification-v1.1.md` — "TODO: requires line-by-line update"
- `build-pipeline/sealed-evaluation-units-security.md` — conflicts with M1 sealing decision
- `platform/generaldirections.md` — fragment, superseded by dated docs

---

## 3. Environment Profile Object

### Schema

```
environment_profile:
  id: UUID
  name: string
  version: string
  description: string
  statefulness:
    strategy_id: string  # from statefulness registry
    parameters: {}       # strategy-specific config
  tools:
    strategy_id: string  # from tools registry
    parameters: {}       # strategy-specific config
  constraints:
    cost_limit: number | null
    time_limit: number | null
    token_limit: number | null
    message_limit: number | null
  audit:
    hash_staged_files: boolean
    hash_message_bytes: boolean
    log_format: string
```

### Design Decisions

- The Environment Profile MUST be a named, versioned, independently browsable object — not ephemeral configuration. Current lean: top-level rail item alongside Benchmarks, Models, Runs, Results, Ops.
- Each registered strategy MUST expose its configurable knobs via a parameter schema so the workbench UI can render them dynamically.
- The platform MUST assign a first-class `runtime_policy_bundle` identity stored on every run and carried into results, audit, and comparison surfaces.
- Environment-profile identity and versioning MUST NOT be delegated to Inspect defaults.

---

## 4. Statefulness Registry

### Contract Dimensions

The statefulness contract MUST cover seven dimensions:

1. **Context assembly** — Given a step definition, admitted payloads, and prior state, how is the `messages[]` array constructed?
2. **Inter-step persistence** — What survives between steps? How is it stored, sanitized, and re-injected?
3. **Session boundary** — Is each step a fresh API call (hard cut) or part of a continuous session? Can steps be grouped?
4. **History reconstruction** — When using fresh API calls, how is the model informed of its prior decisions and context?
5. **Admission control** — When does evidence become visible? What gates its admission?
6. **Truncation/compaction** — When context exceeds limits, what is the deterministic reduction strategy?
7. **Audit** — What is hashed and logged to prove exactly what the model saw at each step boundary?

### Known Patterns (Starting Inventory)

| Pattern | Source | Key Characteristic |
|---------|--------|-------------------|
| Replay_Minimal | Legal-10 | Fresh API call per step, structured windows, sanitized carry-forward |
| Replay_Full | Legal-10 | Growing session history within EU, admission-gated |
| Type 0: Serialized state | Legal-10 baseline | JSON file carry-forward between steps |
| Type I: Pinned context | Letta pattern | Mutable block in system message for persistent invariants |
| Type II: Session context manager | Zep pattern | Runner-managed summarization/retrieval for session history |
| Type III: Temporal fact store | GraphRAG/Memento | Validity-scoped assertions queried by time window |
| Persistent local context | OpenClaw-like | Local database that continuously accumulates |
| Native compaction | Inspect AI | Provider-native context window management (trim/edit/summary) |
| RAG-injected context | Various | Retrieval-augmented context injection per step |

### Runtime Policy Families for Session Topology

AG chain MUST define first-class policies for:

- **Session topology:** single long-lived session / one fresh call per step / grouped calls across selected steps
- **Replay strategy:** no replay / minimal replay / full replay / structured summary replay / persistent local context
- **Carry-forward source:** sanitized candidate state only / prior outputs / derived summaries / tool-backed local store
- **Memory backing:** no external memory / per-run ephemeral / sandbox-resident working set / benchmark-defined persistent context

### Composability

Patterns MUST be composable (e.g., Replay_Minimal + Type II session manager). The contract MUST define how composition works. The minimal contract interface MUST NOT accidentally exclude emerging patterns (2025-2026).

---

## 5. Tools Registry

### Contract Dimensions

The tools contract MUST cover six dimensions:

1. **Tool set definition** — Which tools are available to the model for a given step or run?
2. **Access boundaries** — What external access is permitted? (network, filesystem, MCP servers, databases, APIs)
3. **Constraint enforcement** — Rate limits, scoping, sandboxing, cost caps
4. **Tool call recording** — How are tool invocations and results captured for audit?
5. **Tool result injection** — How do tool results re-enter the model's context?
6. **Isolation** — How is tool access sandboxed to prevent information leakage across EUs?

### Known Tool Patterns

| Pattern | Key Characteristic |
|---------|-------------------|
| No tools | Model receives only prompt context, zero tool access |
| Standard tool set | Predefined set (calculator, code interpreter) |
| MCP server access | Model connects to MCP servers for tool discovery/invocation |
| Internet access | Model can make HTTP requests, search, browse |
| Code execution sandbox | Write and execute code in isolated environment |
| File system access | Read/write files within scoped directory |
| Database access | Query a database (read-only or read-write) |
| Full autonomy | All available tools, minimal constraints |
| Custom tool set | User-defined tools for specific benchmark domains |

### Composability & Interaction

Tool sets MUST be composable (e.g., "standard tools + MCP but no internet"). Tool access patterns MUST be studied for interaction with statefulness patterns (e.g., persistent-DB context + tool access to that DB). Tool availability MUST be explicit, policy-controlled, and MUST NOT implicitly bypass benchmark visibility controls.

---

## 6. Runtime Policy Bundle

### Two Comparison Modes

AG chain MUST support two distinct comparison modes and keep them separate:

1. **Model comparison** — Different evaluated models, same benchmark version, same runtime-policy bundle
2. **Policy comparison** — Same evaluated model, same benchmark version, different runtime-policy bundles

Policy comparison is NOT a side case. It is one of the product's core reasons to exist. The platform MUST answer:
- How does one model perform with no tools vs bounded read-only tools?
- How does one model perform with fresh-step sessions vs long-lived replay?
- How does one model perform with minimal replay vs persistent local memory?

### Fairness Invariant

Within one benchmark version and one run profile, every evaluated model MUST receive the same context, state, tool, and memory policy bundle. AG chain MUST NOT reduce the policy surface to force fairness. Instead:
- Expose the policy surface explicitly
- Freeze the selected policy per benchmark version or run profile
- Compare models only within cohorts sharing the exact same policy bundle

### Identity

The runtime policy bundle MUST have a first-class identity stored on every run and carried into results, audit, and comparison surfaces.

---

## 7. Inspect AI Adoption Map

### Adopt Directly

| Capability | Inspect Source |
|-----------|---------------|
| Model provider abstraction | `ModelAPI`, provider registry |
| OpenAI-compatible provider support | Built-in |
| Model roles (evaluated vs judge) | `model_roles` |
| Runtime limits | `message_limit`, `token_limit`, `time_limit`, `cost_limit`, `fail_on_error`, `retry_on_error` |
| Sandbox environment abstraction | `SandboxEnvironment` ABC |
| Docker sandbox provisioning | Built-in |
| Approval-policy framework | `ApprovalPolicy` |
| Scorer composition | Deterministic + model-graded |
| Eval log and trace-log patterns | `EvalLog`, trace logs |
| Tool execution pipeline | `_tool.py`, `_tool_def.py`, `_call_tools.py` |
| MCP integration | `tool/_mcp/` |
| ResolvedTask pattern | Task + bound Model + bound Sandbox |
| Per-sample sandbox lifecycle | Provision → inject → execute → score → cleanup |

### Wrap (AG chain wrapper over Inspect)

| Helper | Action |
|--------|--------|
| `input_assembler.py` | Keep AG chain message policy, adapt to emit Inspect-native `ChatMessage` objects |
| `staging.py` | Keep audit-visible staging on disk, pass artifacts into Inspect as `Sample.files` |

### Keep AG chain-Owned

| Helper | Reason |
|--------|--------|
| `payload_gate.py` | Inspect has no equivalent for delivery-gated admission |
| `state.py` (candidate_state) | AG chain sanitization rules; three-way split: `TaskState.store` = execution scratch, `candidate_state` = AG chain carry-forward, runner state = AG chain-private |
| `audit.py` | AG chain canonical `audit_log.jsonl`; Inspect logs become attached evidence underneath |
| Message assembly policy | Window ordering, fenced format, what-the-candidate-saw hashing |
| Benchmark registry & versioning | Not in Inspect scope |
| Fairness policy | Not in Inspect scope |

---

## 8. Inspect AI Gaps — What AG chain Must Own

| # | Gap | Inspect Provides | AG chain Needs |
|---|-----|-----------------|----------------|
| 1 | Context provision strategy | None (growing messages + compaction) | Configurable session topology, replay, carry-forward |
| 2 | Session strategy config | Always one growing session | Fresh-per-step / continuous / grouped |
| 3 | API call boundary | Implicit (solver calls generate) | Explicit config per step |
| 4 | Payload admission | Everything visible from start | Delivery-gated, plan.json controlled |
| 5 | Carry-forward control | `TaskState.store` (unstructured dict) | Sanitized candidate_state with allowlists |
| 6 | Structured context assembly | Flat messages accumulation | Fenced windows (ENV→ANCHOR→EVIDENCE→CARRY_FORWARD→TASK→GUARD) |
| 7 | State providers | None (memory tool is model-initiated) | Type 0-III, all runner-controlled |
| 8 | Real-time audit of candidate view | Log file after the fact | Hash of staged bytes + message bytes at each step |
| 9 | Evidence isolation | Sandbox isolates code execution | Staging directory isolates evidence |
| 10 | Benchmark registry | None | AG chain-owned |
| 11 | Benchmark catalog UI | None | AG chain-owned |
| 12 | Build pipeline | None | AG chain-owned |
| 13 | Fairness policy | None | AG chain-owned |
| 14 | Benchmark-specific audit artifacts | None | AG chain-owned |
| 15 | Product navigation | None | AG chain-owned |
| 16 | Context richness fairness envelopes | None | AG chain-owned |

---

## 9. Per-Helper Integration Assessment

| Current Helper | Lines | Action | Detail |
|---------------|-------|--------|--------|
| `model_adapter.py` | 125 | **Replace** | Use Inspect model resolution (provider registry, model roles, retry, tool-call integration) |
| `run_3s.py` | 465 | **Split** | Keep: step-boundary orchestration, plan order, payload admission, carry-forward, audit hashing, env-profile policy. Move to Inspect: model invocation, scorer, sandbox lifecycle, tool execution, event logging |
| `payload_gate.py` | 30 | **Keep** | Inspect has no equivalent. AG chain-owned admission policy |
| `input_assembler.py` | 133 | **Adapt** | Keep AG chain window policy. Emit Inspect-native `ChatMessage` objects instead of plain dicts |
| `state.py` | 67 | **Split 3-way** | `TaskState.store` = execution scratch, `candidate_state` = AG chain carry-forward, runner state = AG chain-private |
| `staging.py` | — | **Hybrid** | Keep audit-visible staging on disk, pass staged artifacts into Inspect as `Sample.files` |
| `audit.py` | 69 | **Keep** | AG chain canonical audit layer. Inspect logs become attached supporting evidence |

---

## 10. Migration Sequence

| Phase | Focus | What changes |
|-------|-------|-------------|
| 1 | Model adapter | Replace with Inspect model resolution |
| 2 | Step execution | Rebase on Inspect Task, Sample, eval lifecycle |
| 3 | Staging & sandbox | Rework staging into Sample.files + Inspect sandbox lifecycle |
| 4 | Tools & approval | Adopt Inspect tool pipeline, approval policies, MCP |
| 5 | Statefulness | Layer AG chain statefulness registry ABOVE Inspect (not inside it) |

The integration pattern is "compile AG chain environment policy into Inspect runtime objects." AG chain decides what context exists, what is admitted, what windows are built, what candidate state survives, what tools are exposed, what audit proof is required. Inspect executes the model call, tool calls, sandboxing, scorer lifecycle, retries/limits, per-sample logs.

---

## 11. Extracted Requirements Summary

Three parallel extraction passes across 14 fresh docs produced 349 numbered requirements:

| Agent | Categories | Count | Generalizable |
|-------|-----------|-------|--------------|
| Statefulness & Context | Session strategy, carry-forward, payload admission, message assembly, context windows, replay, audit | 184 | 149 |
| Isolation, Tools, Audit | Sandbox/isolation, tool provision, audit trail, security, runner orchestration | 57 | 45 |
| Platform Architecture | Environment profile object, statefulness registry, tools registry, Inspect adoption, Inspect gaps, runtime policy bundle, platform architecture | 108 | ~100 |
| **Total** | **12 categories** | **349** | **~294** |

Key numbers:
- 149 generalizable statefulness requirements (beyond Legal-10)
- 16 documented Inspect AI gaps AG chain must own
- 28 Inspect AI adoption items (what to adopt directly)
- 9 known statefulness patterns + 9 known tool patterns
- 7 statefulness contract dimensions + 6 tools contract dimensions

---

## 12. Next Step: Contract Definitions

The comparative analysis against InspectAI source (`_agchain/_reference/inspect_ai/`) must produce:

1. **Contract definitions** for both registries — Python ABCs or Protocol classes with method signatures, input/output types, and audit hooks
2. **Parameter schema pattern** — how each registered strategy exposes its configurable knobs for dynamic workbench UI rendering
3. **Environment Profile schema** — the composed object referencing one statefulness strategy + one tools strategy + parameters
4. **Extension guide** — how a developer adds a new statefulness or tool provision pattern
5. **Gap analysis** — concrete mapping of each GAP item to InspectAI's actual code, verifying the gap exists and identifying any Inspect capabilities not yet captured

### InspectAI Reference Files

| Concept | Inspect Source Path |
|---------|-------------------|
| Sandbox contract | `src/inspect_ai/util/_sandbox/environment.py` |
| Compaction strategies | `src/inspect_ai/model/_compaction/` |
| Task/ResolvedTask | `src/inspect_ai/_eval/task/` |
| Tool contract | `src/inspect_ai/tool/` |
| Model abstraction | `src/inspect_ai/model/_model.py` |
| Eval execution | `src/inspect_ai/_eval/eval.py`, `run.py`, `generate.py` |
| Dataset/sample | `src/inspect_ai/dataset/_dataset.py` |
| Logging/events | `src/inspect_ai/log/_log.py` |
| Approval policies | `src/inspect_ai/approval/_policy.py` |
| MCP integration | `src/inspect_ai/tool/_mcp/` |

---

## Consolidated From

1. `_agchain/docs/platform/2026-03-27-environment-profile-research-prompt.md`
2. `_agchain/docs/platform/2026-03-27-inspect-runtime-helper-maximization-analysis.md`
3. `_agchain/docs/platform/2026-03-27-runtime-environment-doc-canon-and-inspect-comparison.md`
4. `_agchain/docs/platform/2026-03-27-environment-profile-requirements-extraction-summary.md`

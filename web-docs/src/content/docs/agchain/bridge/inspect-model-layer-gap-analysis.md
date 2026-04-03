---
title: "Inspect model layer: next steps"
sidebar:
  order: 6
---

# Inspect AI Model Layer: What AGChain Needs Next

**Date:** 2026-04-01
**Sources:**
- `docs/output/python-dir-bundles/inspect_ai/model.md` (91 files, Inspect AI model directory)
- `_agchain/docs/3-step/` (proven 3-step runner kernel, reference Python)
- `_agchain/docs/_essentials/` (platform requirements, Inspect adoption analysis)

**Purpose:** Given AGChain's established architecture — where Inspect AI is a pluggable execution backend and AGChain owns orchestration, policy, and audit — identify what to address next using Inspect's model patterns as inspiration.

---

## Architectural Premise: What AGChain Already Decided

These are not recommendations. They are documented architectural decisions from the 3-step kernel and essentials docs.

**Inspect is a step engine. AGChain is a chain engine.**

- One Inspect Task = one AGChain step. AGChain chains steps with state management.
- AGChain owns: payload admission, context windows (fenced-window protocol), state carry-forward, candidate-visible message ordering, state sanitization, audit proof format, environment-profile identity.
- Inspect owns: model resolution/invocation, per-sample execution, sandbox lifecycle, tool provisioning, tool approval, retries/limits, per-sample logging.

**AGChain does NOT invoke models directly.** It prepares model targets (auth, config, health) through the global Models registry, then delegates execution to Inspect's model layer via `get_model()` + `model.generate()`. The `inspect_backend.py` reference already demonstrates this wrapper — it converts AGChain's dict-based messages to Inspect ChatMessage types and maps Inspect's ModelOutput back to AGChain's ExecutionResult.

**Two execution backends exist, both returning the same `ExecutionResult`:**

1. **Direct** (`ModelAdapter` → native provider client) — MVP fallback
2. **Inspect** (`InspectBackend` → `inspect_ai.model.get_model()` → `model.generate()`) — target path

**Build-time is entirely AGChain.** RP packager, EU builder, benchmark builder produce sealed evaluation units. DuckDB for development, packaged assets for runtime. No Inspect involvement at build time.

---

## What Inspect's Model Module Provides (That AGChain Consumes)

From the 91-file model directory, the subsystems AGChain benefits from by delegation:

| Inspect Subsystem | What It Gives AGChain | AGChain Must Do |
|-------------------|----------------------|-----------------|
| **Provider registry** (30+ providers) | `get_model("openai/gpt-4o")` resolves provider, auth, and API client | Pass the correct `provider/model` string from AGChain's model target registry |
| **GenerateConfig** (60+ knobs) | Temperature, max_tokens, reasoning_effort, timeouts, tool settings | Store a validated subset in `generate_config_jsonb`; pass to Inspect at call time |
| **ChatMessage types** | Typed system/user/assistant/tool messages with rich content | Convert fenced-window messages (list[dict]) to Inspect ChatMessage types in the backend adapter |
| **Retry + resilience** | Exponential backoff (3s–30min), per-provider should_retry, concurrency limits | Nothing — Inspect handles this internally |
| **Token counting + cost** | Per-call usage (input/output/cache/reasoning tokens), cost tracking | Extract from ModelOutput.usage into ExecutionResult and run artifacts |
| **Tool calling loop** | `call_tools()` dispatches tool_calls, handles errors, loops until done | Wire AGChain's tool manifests into Inspect's tool provisioning (Phase 4 adoption) |
| **Context compaction** | Trim/edit/summary/native strategies when conversations exceed context window | Relevant only for agent benchmarks with long conversations (future) |
| **Response caching** | Hash-keyed cache with expiry and epoch-aware scoping | Pass `cache=True` or `CachePolicy` in GenerateConfig when needed |

**Key insight:** AGChain does not need to build any of these subsystems. It needs to know how to configure and consume them through Inspect's public API.

---

## What AGChain Actually Needs to Address Next

### The Inspect Adoption Phases (from `inspect-runtime-helper-maximization-analysis.md`)

The essentials docs already define a phased adoption sequence. The question is: what's the current state of each phase, and what's the next concrete work?

#### Phase 1: Replace model_adapter with Inspect's model layer

**Status:** Partially proven. `inspect_backend.py` already wraps `get_model()` + `model.generate()`.

**Remaining work:**
- The `inspect_backend.py` reference is a CLI-context prototype. It needs to work in the `platform-api` service context where model targets come from the AGChain registry (provider_slug, api_base, auth_kind) and credentials come from `user_api_keys`.
- **Credential bridge:** AGChain stores encrypted API keys per user per provider. Inspect's `get_model()` reads credentials from environment variables or config. The bridge must decrypt the user's key and inject it into the Inspect model's auth context without exposing it in logs, traces, or error messages.
- **GenerateConfig bridge:** AGChain's `generate_config_jsonb` blob needs to validate against and convert to an `inspect_ai.model.GenerateConfig` instance. The models.md spec says unknown Inspect keys are rejected — this validation contract needs to be enforced at write time and conversion needs to work at runtime.

#### Phase 2: Rebase per-step execution on Inspect Task/Sample

**Status:** Not started. The 3-step runner currently calls `execution_backend.execute(messages, temperature, max_tokens)` — a flat model call. It does not use Inspect's Task/Sample/Solver/Scorer abstractions.

**What this phase means:**
- Each AGChain step becomes an `inspect.eval()` call with a properly constructed `Task` and `Sample`
- `Sample.input` is constructed by AGChain's InputAssembler (fenced-window messages)
- `Sample.metadata` is controlled by AGChain — ground_truth is never exposed to the model
- Inspect's solver chain handles the actual model conversation within the step
- Inspect's scorer handles judge scoring within the step
- AGChain's OutputHarvester sanitizes carry-forward state between steps

**Why this matters:** This unlocks Inspect's per-sample logging, sandbox injection, tool provisioning, and scorer lifecycle — all things AGChain currently handles manually.

#### Phase 3: Rework staging through Inspect's file/sandbox lifecycle

**Status:** Not started. AGChain currently uses `staging.py` for per-call file isolation.

**What this phase means:** Inspect's `SandboxEnvironment` replaces AGChain's manual staging directories. Admitted payloads are injected into sandboxes rather than filesystem directories.

#### Phase 4: Adopt Inspect's tool/approval pipeline

**Status:** Not started. `runtime_config.py` explicitly gates this as future — `tool_mode != "none"` raises an error.

**What this phase means:** AGChain's resolved tool manifests (builtin, custom, bridged, MCP) need to be translated into Inspect `Tool` definitions that Inspect's `call_tools()` loop can execute. The AGChain tool registry provides the authoring surface; Inspect provides the runtime execution.

**Connection to current work:** AGChain's tools surface (registry, versions, benchmark tool bags, resolved manifests) is built. This phase is the bridge from "I know what tools to use" to "tools actually execute during model conversations."

#### Phase 5: Layer AGChain statefulness above Inspect

**Status:** Not started. This is the final integration — AGChain's candidate_state, carry-forward, and audit proof working with Inspect's per-sample execution model.

---

## Concrete Next Steps (Ordered)

Based on the adoption phases and current platform state:

### 1. Credential Bridge (Phase 1 completion)

The `inspect_backend.py` prototype calls `get_model("openai/gpt-4o")` which reads `OPENAI_API_KEY` from env. In production, the key lives in AGChain's encrypted `user_api_keys` table. Need:

- A function that takes an AGChain model target + user context, decrypts the credential, and provisions it for Inspect's model layer (either via env injection or Inspect's API key configuration)
- Must not leak credentials into logs, traces, or error payloads
- Must scope credentials to the current request/run, not globally

### 2. GenerateConfig Validation and Conversion

AGChain stores `generate_config_jsonb` as a blob. Need:

- A typed AGChain GenerateConfig that validates the allowed subset of Inspect's 60+ knobs
- Conversion function: `agchain_config_jsonb → inspect_ai.model.GenerateConfig`
- Rejection of unknown keys at write time (already specified in models.md)
- The subset should cover what the 3-step kernel actually uses: temperature, max_tokens, and whatever reasoning/tool knobs benchmarks need

### 3. Platform-API Runner Integration (Phase 2 entry)

The 3-step runner is a CLI tool (`run_3s.py`). The platform requirements say it must be API-triggered through `platform-api`. Need:

- A run-launch endpoint that accepts a benchmark + EU selection + model target + config
- An async worker (using the existing `agchain_operations` framework) that:
  - Resolves the benchmark package and EU
  - Resolves the model target and credentials
  - Executes the step chain (either via current flat backend or via Inspect Task/Sample)
  - Records results to the run artifacts tables
- This is the bridge from "CLI prototype that works" to "platform feature that users can trigger"

### 4. Tool Manifest → Inspect Tool Translation (Phase 4 entry)

When benchmarks include tools, AGChain's resolved tool manifest needs to become Inspect `Tool` definitions:

- `builtin:*` → Inspect's built-in tools (bash, python, web_search, etc.)
- `custom:*` → Inspect `@tool()` wrapped callables
- `mcp:*` → Inspect's `mcp_server_*()` + `mcp_tools()` pattern
- `bridged:*` → Inspect's `BridgedToolsSpec`

This is a translation layer, not a reimplementation. AGChain authored the definitions; Inspect executes them.

---

## What AGChain Does NOT Need to Build

These were incorrectly scoped in the previous version of this document:

| Capability | Why AGChain Doesn't Build It |
|------------|------------------------------|
| Provider adapters (OpenAI, Anthropic, Google serialization) | Inspect's 30+ providers handle this via `get_model()` |
| Retry/backoff logic | Inspect handles internally in `Model.generate()` |
| Token counting | Inspect reports in `ModelOutput.usage`; AGChain extracts |
| ChatMessage type hierarchy | Inspect provides; AGChain converts at the backend adapter boundary |
| Context compaction | Inspect provides strategies; AGChain passes config |
| Response caching | Inspect provides via `CachePolicy` in `GenerateConfig` |
| Cost tracking database | Inspect provides `ModelInfo`/`ModelCost`; AGChain stores results |

AGChain's model-layer work is **integration, not reimplementation**: credential bridge, config conversion, and progressively deeper adoption of Inspect's task execution model.

---

## Key Architectural Decisions Still Open

1. **How does the credential bridge work in production?** Env injection per request? Inspect's API key config? A custom ModelAPI subclass that reads from AGChain's store?

2. **When does Phase 2 happen?** Rebasing on Inspect Task/Sample is the big unlock but also the biggest refactor. The current flat `execute(messages)` call works for the 3-step MVP. Task/Sample adoption unlocks tools, sandboxes, and logging — needed for benchmarks beyond Legal-10.

3. **Does the runner stay Python or get a service wrapper?** The platform requirements say "the runner may remain Python-based but must be wrapped as a host service." This affects whether it's a subprocess, a gRPC service, or an in-process async worker within platform-api.

4. **What GenerateConfig knobs does AGChain validate at write time?** The current spec says "unknown Inspect keys are rejected." The exact allowed set needs to be locked — probably a conservative subset that grows as benchmarks need more knobs.
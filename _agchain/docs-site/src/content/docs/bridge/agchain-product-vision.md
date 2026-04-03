---
title: "AGChain Product Vision"
description: Two products on one platform — benchmark authoring for data scientists, agent arena for AI engineers — sharing the same execution infrastructure.
---

## The Core Idea

AGChain is a platform that evaluates not just models, but **complete agent systems** — model + prompt stack + tool belt + memory strategy + orchestration logic + custom skills + human-authored instructions. The platform provides the infrastructure for authoring evaluations, configuring runtime environments, executing against connected models, and comparing results across all variables.

This produces two products serving different demographics on shared infrastructure.

**The product thesis:** We are not building a model benchmark. We are building a platform for designing, running, and comparing complete AI systems under explicit protocol and memory conditions.

**The commercial insight:** People don't buy raw capability in isolation. They buy **arranged capability** — the configured system that performs best for their domain. An open-source model with the right tool belt and memory strategy can beat a commercial model with a naive setup. The platform that reveals and ranks these arrangements doesn't exist yet.

---

## Product 1: Benchmark Authoring Platform

**Who uses it:** Data scientists, evaluation researchers, procurement teams.

**What it does:** A non-code wizard for designing structured, multi-step evaluations. The user authors step prompts, scoring rubrics, and payload admission rules through a browser interface. The platform materializes sealed benchmark packages and evaluation units from authored definitions and connected datasets. Models are evaluated and results compared across runtime configurations.

**The insight it produces:** "Which runtime policy makes this model strongest?" — three-axis comparison:

```
Benchmark (fixed) × Model (fixed) × Environment Profile (varied)
```

Same benchmark, same model, different environment configurations. The delta between environment profiles is the product's core output. GPT-5.5.2 scores 78% with Replay_Minimal + no tools, but 91% with persistent-context + MCP tools + Replay_Full. That delta is actionable intelligence no existing platform provides.

**Why it doesn't exist:** Inspect AI gives you a task runner. Braintrust gives you a logging dashboard. MLflow gives you experiment tracking. Promptfoo gives you prompt comparison. None give you a benchmark *authoring* platform where a non-developer can design a multi-step evaluation chain, bind it to datasets, define scoring rubrics, and produce sealed executable packages — all through a browser wizard. The build-time packaging that Legal-10 proved works (sealed bundles, payload gating, staged evidence, audit trails) has never been productized as a general-purpose authoring surface.

---

## Product 2: Agent Arena

**Who uses it:** AI engineers, startups building agent systems, teams optimizing deployed agents.

**What it does:** Connect the model of your choice. Equip it with any tools — basic grep, internet search, any MCP server, custom skills (community-shared or privately authored), CLI tools, API-based tool use. Configure your prompt stack and statefulness strategy. Enter your configured agent system into competitions against other configured systems on standardized challenges.

**What competes:** Not isolated models. Complete agent systems:

- Model selection
- Prompt stack and system instructions
- Tool belt (MCP servers, skills, CLI tools, APIs, custom tools)
- Memory and statefulness strategy
- Orchestration logic
- Persistence and state design
- Human-authored instructions and workspace files

**The insight it produces:** Arranged capability matters more than raw capability. An open-source model with the right tool belt and memory strategy beats a commercial model with a naive setup. The leaderboard ranks complete systems, not isolated models. Users see which configurations make which models strongest for which tasks — and the configurations are the variables they control.

**Why it doesn't exist:** Model benchmarks test isolated model capability (MMLU, HumanEval, GPQA). Agent benchmarks like SWE-bench test one agent framework against one task type. Nobody provides a platform where users bring their own model + tools + memory + prompts, compete as complete systems, and compare results across all configuration dimensions. The independent variables are too numerous for a static benchmark — you need a platform that lets users define and vary them.

---

## Why They Share Infrastructure

The two products are the same platform with different framing:

| Dimension | Benchmark Authoring | Agent Arena |
|-----------|-------------------|-------------|
| Who controls the challenge | Benchmark author | Platform / community |
| Who controls the environment | Variable under test | Competitor |
| What varies | Environment Profile | Everything the competitor configures |
| What's fixed | Benchmark + Model | The challenge |
| Output | "Which policy makes this model strongest?" | "Which complete system performs best?" |

The infrastructure is identical:

- **Benchmark packages** — fixed structure, authored through wizard or provided as challenge spec
- **Evaluation Units** — sealed test cases with payload gating and evidence isolation
- **Environment Profiles** — statefulness strategy, tool provisioning, session management
- **Runner** — Inspect AI executes each step; AGChain controls inter-step state, payload admission, audit
- **Tool registry** — builtin, custom, bridged, MCP — same registry serves both products
- **State provider registry** — Type 0 through Type III — same options for benchmarks and arena
- **Sealed execution** — manifest + signature + audit trail — same integrity guarantees
- **Results comparison** — three-axis (or N-axis) comparison across all varied dimensions

---

## The Environment Profile: Shared Foundation

The Environment Profile is the runtime policy object that both products configure. It controls:

### Statefulness / Context Persistence

Multiple strategies, user-selectable, each with different cost and capability trade-offs:

| Strategy | How it works | Cost | Best for |
|----------|-------------|------|----------|
| **State messages (Type 0)** | Serialized `candidate_state.json` carry-forward. Fresh API call per step. Prior outputs carried as sanitized JSON. | Lowest | Simple evaluations, reproducibility |
| **Auto-compaction + summarization (Type II)** | A trace of previous decision-making is automatically summarized and fed as context when new sessions begin. Previous session context and progress is not lost. | Medium | Multi-step chains with long context |
| **Local SQL persistence (Type I)** | SQLite-based hard disk storage of context that always persists. Full context available to all steps. Maximum context preservation. | Higher | Complex agent tasks, long-horizon recall |
| **Full session persistence (Type III)** | Growing message history maintained across all steps. No information loss. Combined with compaction when context window fills. | Highest | Agent arena, real-world task simulation |

These are not mutually exclusive — a profile can combine strategies (e.g., SQL persistence + auto-compaction for overflow).

### Tool Provisioning

The tool belt configured for this environment:

- **Builtin tools** — bash, python, web_search, text_editor, think
- **MCP servers** — any MCP-compatible server (stdio, HTTP, SSE transport)
- **Custom tools** — user-authored Python callables or package entrypoints
- **Bridged tools** — host-side tool definitions
- **Community skills** — publicly shared skills from the platform marketplace
- **Private skills** — confidential user-authored skills not shared with anyone

### Session Strategy

How API calls are structured across steps:

- **Replay_Minimal** — fresh call per step with carry-forward state only
- **Replay_Full** — growing message history resent on every call
- **Grouped** — multiple steps bundled into one session
- **Continuous** — single persistent session across all steps

### Sandbox and Isolation

Where untrusted code executes:

- **None** — no sandbox (trusted tool execution only)
- **Local** — local process isolation
- **Docker** — containerized sandbox per step
- **Remote** — cloud-provisioned sandbox

---

## Background: What Exists in the Ecosystem

### Evaluation Frameworks (Product 1 competitors)

| Framework | What it provides | What it lacks |
|-----------|-----------------|---------------|
| **Inspect AI** (UK AISI) | Task runner, 30+ model providers, sandbox, tool calling, scoring | No authoring wizard, no benchmark packaging, no multi-step chain orchestration, no environment profile concept |
| **Braintrust** | Logging dashboard, prompt playground, dataset management | No sealed execution, no multi-step chains, no payload gating, no statefulness options |
| **MLflow** | Experiment tracking, model registry, artifact storage | No evaluation authoring, no benchmark execution, no agent configuration |
| **Promptfoo** | Prompt comparison, red-teaming, CI integration | Single-turn focus, no multi-step chains, no statefulness, no sealed bundles |
| **DeepEval** | Metric library, synthetic data generation | No authoring surface, no multi-step orchestration |
| **Langfuse / Phoenix / Opik** | Observability and tracing | Passive observation, not active evaluation orchestration |

None provide a benchmark **authoring** platform. They all assume someone else wrote the evaluation — they just run or observe it.

### Agent Frameworks (Product 2 prior art)

| Framework | Relevant patterns | Limitations |
|-----------|------------------|-------------|
| **OpenHands** (formerly OpenDevin) | Conversation persistence, context condenser for summarizing long histories, explicit distinction between always-on repo context (AGENTS.md) and on-demand skills | Single-agent focus, no competition/comparison infrastructure |
| **OpenClaw** | Full agent runtime with authoritative loop, persistent memory, bootstrap/workspace files (AGENTS.md, SOUL.md, TOOLS.md), persisted session/run flow | No benchmark or evaluation layer |
| **SuperAGI** | Agent platform patterns — tool extension, telemetry, multiple vector DBs, memory storage, installable-modules marketplace | Broader platform but less clean persistence foundation |
| **CrewAI / AutoGen / LangGraph** | Multi-agent orchestration, tool integration | No evaluation/scoring, no sealed execution, no comparison |

These repos are strong in individual layers of the statefulness problem:

- **OpenHands** — conversation persistence + context condensation
- **OpenClaw** — workspace files + serialized agent loop + persistent memory
- **SuperAGI** — platform/tooling/memory surface patterns

AGChain doesn't copy any one repo. It separates the problem into layers and takes the strongest patterns from each:

| Layer | Best reference | AGChain approach |
|-------|---------------|-----------------|
| Session continuity | OpenHands (conversation state save/restore) | State messages + session strategy options |
| Durable disk persistence | OpenClaw (persisted session/run flow) | SQLite event ledger per run |
| Memory retrieval | SuperAGI (vector DB options) | Optional retrieval memory for long-horizon recall |
| Context compaction | OpenHands (context condenser), Inspect AI (CompactionStrategy) | Auto-summarization + structured window compaction |
| Workspace instructions | OpenClaw (AGENTS.md, SOUL.md, TOOLS.md) | System message + workspace-level instruction files |
| Tool / agent loop state | All three to varying degrees | Environment Profile tool provisioning + Inspect runtime |

### Agent Benchmarks (Product 2 related work)

| Benchmark | What it tests | How it differs from Agent Arena |
|-----------|-------------|-------------------------------|
| **SWE-bench** | Can an agent resolve GitHub issues? | Fixed agent framework, fixed tools, tests one agent system |
| **GAIA** | General AI assistant capability | Tests model capability, not system configuration |
| **WebArena / VisualWebArena** | Web navigation tasks | Fixed environment, tests model + one agent loop |
| **τ-bench** | Tool-augmented task completion | Tests model tool use, not complete system configuration |

These benchmarks fix the agent system and vary the model. Agent Arena fixes the challenge and lets users vary the entire system. The comparison axis is inverted.

---

## Benchmark Mode vs Arena Mode

The platform supports two evaluation philosophies. Both are valid. Making the distinction explicit turns a potential criticism into a feature.

**Benchmark Mode** — compares systems under controlled constraints. Same tools, same memory mode, same limits. Isolates variables for cleaner comparison. Researchers and procurement teams use this. The question: "Which model performs best under these conditions?"

**Arena Mode** — compares whole configured agent systems under competitive conditions. Teams tune the full system however they want. The configuration IS the variable. Engineers and startups use this. The question: "Which complete system performs best for this class of work?"

Without this distinction, critics will say "too many variables" or "this is prompt hacking." The answer: in Arena Mode, that is the point. In Benchmark Mode, you can constrain those variables. The platform supports both.

**The fairness rule for Benchmark Mode:** When comparing multiple models, all compared systems must use the same runtime profile — same session strategy, same state provider, same tool permissions, same limits. Otherwise you are comparing model + augmentation stack, not models. Runtime profile is part of the evaluated condition.

**The richness of Arena Mode leaderboards:** The leaderboard is no longer only a model leaderboard. It ranks systems across multiple dimensions:

- Best absolute quality
- Best quality per dollar
- Best open-source system
- Best no-tools system
- Best compact-memory system
- Best per-domain stack (legal drafting, code generation, research synthesis)
- Best cost/performance trade-off

That is much richer and much more commercially useful than a single rank-ordered model list.

---

## The Four-Layer Architecture

The platform separates into four clean layers. This separation is what makes the product scalable — new benchmarks, new tools, new memory strategies, and new execution backends can be added without modifying the core.

### Layer 1: Benchmark Protocol

*What is being run?*

Datasets, EU generation, plan.json, step definitions, scorer/judge bindings, payload admission schedule, output contracts, sealing. This is the artifact language — the JSONs that let one stage of the pipeline hand work to the next stage in a fixed, inspectable way.

### Layer 2: Runtime Profile

*How is continuity and execution maintained?*

Session strategy, state provider, tool policy, network policy, orchestration rules, limits/cost envelope. This is where the statefulness methodologies belong. The benchmark definition does not care whether the user picked SQL memory or compaction memory — the runtime profile does.

### Layer 3: System Configuration

*What system is competing?*

Model, prompt stack, tool set, skills, MCPs, instruction files, memory/retrieval options, agent loop mode. This is the contestant definition. In Benchmark Mode, this is constrained. In Arena Mode, this is the variable.

### Layer 4: Execution Backend

*How does the actual step call happen?*

Inspect-backed, direct provider adapter, future custom runtime backend. This keeps the backend pluggable. Inspect's agent modes (react, handoff, bridge) are implementation details at this layer — useful runtime ingredients, not the top-level product abstraction.

---

## The Artifact Contract

The JSONs produced by the build pipeline are not the statefulness mechanism. They are the **protocol language** that makes the workflow legible and portable between pipeline stages.

### Three Data Layers

The platform enforces a clean separation between source data, build artifacts, and runtime artifacts:

**Source layer** — huge, complex, domain-specific:
- DuckDB databases (705MB)
- Parquet files (citation inventories, crosswalks, rankings)
- JSONL corpora (SCOTUS opinions, CAP case text)

**Build output layer** — small, fixed-shape, sealed:
- `p1.json` — anchor payload (candidate-visible)
- `p2.json` — authorities/research pack (conditionally visible)
- `ground_truth.json` — runner-only labels (never staged)
- `benchmark.json`, `plan.json`, `model_steps/*.json`, `judge_prompts/*.json`

**Runtime layer** — consumes fixed payloads through:
- Payload admission (plan.json controls what's visible per step)
- Staging isolation (only admitted files copied to per-call directory)
- Input assembly (fenced-window message construction)
- Scoring (deterministic + judge)
- Audit logging (hash of exact bytes the model saw)

**The key insight:** The platform does not expose raw dataset complexity to the end user. The user authors benchmark steps, prompt templates, scoring modes, and dataset-to-payload mapping rules. The builder generates fixed output shapes. Because the file structure of benchmark and EU packages is fixed — same files, same schemas, varying only in content — it can be extracted into a non-code wizard that generates conforming packages automatically.

### Formal Payload Schemas (Platform Contracts)

These schemas are elevated from example JSONs to explicit platform contracts. Every benchmark's builder must produce files conforming to these shapes.

**Anchor payload (`p1.json`):**
```
payload_id, payload_version, type, candidate_visible
content.anchor: { caseId, usCite, caseName, term, text, char_count }
metadata.citations: [{ citation_id, source, inventory_normalized_cite, usCite, capCite, caseName }]
```

**Authorities payload (`p2.json`):**
```
payload_id, payload_version, type, candidate_visible
content.authorities: [{ authority_id, source, usCite, capCite, caseName, text, char_count,
                        inventory_normalized_cite, ranking: { rank, fowler_score, pagerank_percentile } }]
```

**Ground truth (`ground_truth.json`):**
```
eu_id, eu_version, anchor_caseId, anchor_usCite
anchor_inventory_full: [normalized citations]
rp_subset: [normalized citations shipped in p2]
known_authority: { controlling_authority, in_favor, against, most_frequent }
provenance: { dataset_db, citation_inventory_parquet, rp_id }
```

**Step definition (`model_steps/*.json`):**
```
step_id, step_name, prompt_template, placeholders, output_contract, output_schema
```

These are the Legal-10 instances of general platform schemas. A coding benchmark would have different `content` shapes inside p1/p2 but the same envelope structure (payload_id, payload_version, type, candidate_visible, content, metadata).

### Three Kinds of Manifest (Do Not Confuse)

The codebase contains three distinct manifest concepts:

| Manifest | What it inventories | When it's produced |
|----------|--------------------|--------------------|
| **Dataset export manifest** | DuckDB tables, parquet files, row counts, export metadata | During data pipeline export |
| **Bundle integrity manifest** | SHA-256 hash of every file in the sealed benchmark + EU bundle | After builders produce the bundle, before execution |
| **Run manifest** | Execution config, model info, file hashes, reproducibility metadata | During/after a benchmark run |

These serve different purposes and should never be conflated.

---

## The Materializer Boundary

The builder is the seam between authored definitions and executable artifacts. It takes:

```
dataset sources + selection rules + benchmark definition → p1/p2/ground_truth + benchmark packet
```

The builder does not expose data pipeline internals. It accepts high-level mapping rules ("this dataset field is the anchor text, this field is the research pack, these fields are ground truth") and produces the fixed payload shapes.

The browser-backed builder UI should target these output contracts directly — not try to expose Stage 4A/4B pipeline guts. The user maps fields; the platform generates conforming artifacts.

---

## The Legal-10 3-Step MVP as Proof of Concept

Legal-10 is the first path through both products:

**As Product 1 (Benchmark Authoring):** A data scientist authors a 3-step legal reasoning chain (Known Authority → IRAC Closed-Book → IRAC Open-Book), binds it to a SCOTUS case dataset, configures deterministic + judge scoring, and produces sealed evaluation packages. The wizard replaces the Python scripts that built this manually.

**As Product 2 (Agent Arena):** A legal AI startup configures their model with legal research tools, custom citation-checking skills, and persistent context. They enter the Legal-10 challenge and compete against other configured systems. The leaderboard shows which complete legal AI systems perform best — not which raw model scores highest.

The infrastructure is the same. The sealed packages, the runner, the environment profiles, the tool registry, the state providers — all shared. Legal-10 proves the execution model works. The platform makes it accessible and competitive.

---

## What Must Be Built

### Already proven (working prototype)

- Sealed benchmark packages with fixed file structure (benchmark.json, plan.json, model_steps/*.json, judge_prompts/*.json)
- Sealed evaluation units with payload gating (p1.json, p2.json, ground_truth.json)
- Plan-driven runner with staged isolation, state sanitization, and audit trails
- Deterministic scorers and judge-model scoring
- Inter-step state carry-forward with forbidden-key stripping
- Two execution backends (direct model adapter, Inspect AI integration)
- Fenced-window message protocol (ENV, ANCHOR_PACK, EVIDENCE_PACK, CARRY_FORWARD, TASK, OUTPUT_GUARD)

### Already built in the platform

- Benchmark registry with versions, ordered steps, scoring modes, tool bags, resolved manifests
- Dataset registry with samples, versions, materialization, Inspect-aligned fields
- Model registry with 16 providers, credentials, health probes
- Tool registry with source kinds (builtin, custom, bridged, MCP), versioning, preview/publish
- Scorer/prompt registry (partial)
- Generic pipeline job framework (job lifecycle, worker, deliverables, status tracking)
- Environment Profile research and registry design (documented, not yet implemented)

### Must be built next

1. **Benchmark Authoring Wizard** — the non-code UI that produces sealed benchmark packages from authored steps, prompts, and scoring rules
2. **Dataset-to-EU Pipeline** — the materializer that turns authored dataset mappings into sealed evaluation units
3. **Bundle Sealing** — manifest + signature generation and verification
4. **Credential Bridge** — model registry credentials → Inspect model execution
5. **Run Launch Worker** — async job that executes a benchmark version against selected model + environment profile
6. **Environment Profile Implementation** — the statefulness strategy options (Type 0 first, then I–III)
7. **Results Surface** — three-axis comparison UI
8. **Arena Mode** — competition configuration, leaderboard, public/private challenge hosting

Items 1–5 produce the first demonstrable version. Items 6–8 build toward the full vision.

---

## Shipping Strategy: The V1 Wedge

The full vision contains too many axes to ship at once: benchmark authoring, dataset manipulation, agent configuration, tools, memory modes, orchestration, system competition, leaderboards, reproducibility, pricing. Attempting all of them will bury the project in private sophistication while the market sees silence.

**The main risk is no longer "is the idea strong enough?" The main risk is getting trapped in private sophistication while the market only sees silence.**

### What V1 Must Prove

The first public version must prove exactly three things:

1. **Multi-step protocol exists** — not just single-task evals
2. **Runtime profile exists** — not just one hidden memory/state method
3. **Whole systems can be compared** — not just raw models

If those three are visible, people understand the direction. Everything else can deepen in public.

### The V1 Wedge

A user can:

- Connect a model
- Choose from a small number of runtime profiles (Type 0 + one advanced option)
- Choose from a small number of tool profiles (no tools, basic builtins, one MCP example)
- Run against one multi-step benchmark family (Legal-10 3-step)
- Compare full system configurations on a leaderboard
- Inspect run artifacts and audit trail

That is enough. Because it already demonstrates that model is not the only variable, runtime profile matters, tools matter, and system-level competition is real.

### What V1 Explicitly Defers

- General-purpose benchmark authoring wizard (Legal-10 is pre-built, not user-authored)
- Full agent arena with public competitions
- All four statefulness types (V1 ships Type 0 + one other)
- Custom tool authoring in-browser
- Community skill marketplace
- Multi-benchmark families
- Pricing/credit tiers for statefulness options

### The Shipping Rhythm

The public should see:

1. First working slice (the wedge)
2. Then benchmark expansion (more step types, more datasets)
3. Then tool profile expansion (MCP, custom tools)
4. Then memory/runtime profile expansion (Type I–III)
5. Then authoring wizard (user-created benchmarks)
6. Then arena mode (system competitions, public leaderboards)

Each step tells a story. Each step is publicly visible. Each step earns the right to keep building.

### Optimize For

- **Clarity over completeness** — make the product legible
- **Demonstrability over architecture purity** — a working public slice beats a beautifully isolated internal design
- **Public momentum over private perfection** — people need to see it moving

The right mental model: you are not launching the final cathedral. You are planting the flag with a version that is small, real, coherent, and unmistakably on-vision. That is enough to earn the right to keep building.

---

## The Strongest Sentence

*"The point is not to only benchmark the raw model in isolation. The platform must support both isolated evaluation and full-system competition, because real-world AI performance emerges from the configured system, not the model alone."*
---
title: "Canonical instruction reference"
sidebar:
  order: 1
---

# AGChain Canonical Instruction — Code-Grounded Edition

**Status:** Permanent reference. Do not archive.
**Last updated:** 2026-03-30
**Purpose:** Any agent or session working on AGChain reads this first. No exceptions. This document eliminates the recurring need to re-explain what AGChain is, what Legal-10 is, how datasets relate, where Inspect AI fits, and what already works.

---

## 1. The Four-Layer Model

| Layer | What it is | Where it lives | Example |
|-------|-----------|----------------|---------|
| **Dataset** | Raw data substrate — build-time only, never runtime | `_agchain/datasets/` | SCDB, CAP, Shepard's (~4 GB legal corpus) |
| **Benchmark package** | Domain-specific eval: step plans, scorers, payload schemas, ground-truth rules, build pipeline | `_agchain/legal-10/` | Legal-10 (first package; others will follow) |
| **AGChain platform** | Generic benchmark authoring, registration, execution, results, and observability | `web/src/pages/agchain/`, `services/platform-api/app/api/routes/agchain_*.py`, `supabase/migrations/` | The platform itself |
| **Execution engine** | Model providers, sandbox, tools, scoring protocols, event system | `_agchain/_reference/inspect_ai/` | Inspect AI (adoption target) |

**AGChain is not Legal-10.** Legal-10 is the first benchmark package. AGChain must host packages for any domain — medical reasoning, code generation, cybersecurity — determined by whatever dataset and eval the user defines.

**Datasets are not AGChain's data.** Datasets are raw materials consumed at build time. The build pipeline transforms them into sealed bundles. Runtime never touches the raw dataset.

---

## 2. Directory Map (Verified Paths)

All documentation has moved from `docs/agchain/` to `_agchain/docs/`. The old path no longer exists.

### AGChain product root

| Path | Role | Key contents |
|------|------|--------------|
| `_agchain/` | Product root | Everything AGChain-owned |
| `_agchain/datasets/` | Raw dataset files | `legal10-updates.duckdb` (738 MB, 13 tables, 7 views), CSVs, JSONLs, Parquets, `eus/legal10_3step_v1/` (sealed EUs) |
| `_agchain/legal-10/` | First benchmark package | Chain steps, runners, scoring, scripts, tests, one proven run |
| `_agchain/docs/` | All AGChain documentation | Essentials, platform docs, benchmark specs, memory packs |
| `_agchain/docs-site/` | AGChain documentation site | |
| `_agchain/_reference/` | Reference repos and analysis | Inspect AI source, owner-message, braintrust matching |

### Documentation

| Path | Role |
|------|------|
| `_agchain/docs/_essentials/` | Authoritative specs (highest authority) |
| `_agchain/docs/_essentials/_INDEX.md` | Authority hierarchy — read this first |
| `_agchain/docs/_essentials/mvp/M1-buildtime-packaging-sealing-dev-brief.md` | Bundle layout, schema, sealing (HIGHEST AUTHORITY) |
| `_agchain/docs/_essentials/platform/inter-step-requirements.md` | Runtime behavior, staging, admission, state, audit (SECOND HIGHEST) |
| `_agchain/docs/_essentials/fdq/` | Step contracts: `01-ka-sc.md`, `09-irac-without-rp.md`, `10-irac-with-rp.md` |
| `_agchain/docs/_essentials/fdq/post/` | Post-chain: `irac-pair-scoring.md`, `citation_integrity.py.md` |
| `_agchain/docs/_essentials/2026-03-26-agchain-platform-requirements.md` | What AGChain must do |
| `_agchain/docs/_essentials/2026-03-26-agchain-platform-understanding.md` | Why these requirements are defensible |
| `_agchain/docs/_essentials/2026-03-27-inspect-runtime-helper-maximization-analysis.md` | Module-by-module Inspect AI adoption decisions |
| `_agchain/docs/platform/` | Platform architecture, environment profiles, runner specs |
| `_agchain/docs/benchmark/` | Benchmark specs (10-step chain, FDQs, MVP) |
| `_agchain/docs/owner-message.md` | Inspect AI adoption policy |

### Reference

| Path | Role |
|------|------|
| `_agchain/_reference/inspect_ai/` | Inspect AI source repo (MIT, ~46K lines Python) |
| `_agchain/_reference/inspect_ai_analysis.md` | Full architecture analysis |
| `_agchain/_reference/owner-message.md` | Inspect AI adoption modes (canonical copy) |
| `_agchain/_reference/agchain-inspect-braintrust-matching/` | Three-way feature comparison |

---

## 3. What Already Works (Code-Grounded Inventory)

### 3.1 Proven Execution Kernel (~3,200 lines)

Location: `_agchain/legal-10/runspecs/3-STEP-RUN/`

This kernel has been proven with a real Claude Sonnet run. Artifacts exist at `_agchain/legal-10/runs/run_20260208_080028_154291/`.

| Module | File | Lines | What it does | Inspect AI adoption decision |
|--------|------|-------|-------------|------------------------------|
| **Orchestrator** | `run_3s.py` | 465 | Runs d1 → d2 → j3 chain + judge + citation integrity per EU | Split: keep AG chain step-boundary orchestration, replace per-step execution kernel with Inspect |
| **Input assembly** | `runtime/input_assembler.py` | 133 | Deterministic fenced-window message construction (ENV → ANCHOR → EVIDENCE → CARRY_FORWARD → TASK → OUTPUT_GUARD) | Keep; adapt to emit Inspect-native ChatMessage objects |
| **Payload admission** | `runtime/payload_gate.py` | 30 | Step-level payload filtering per plan.json inject_payloads | Keep (AG chain-owned policy; Inspect has no equivalent) |
| **State sanitization** | `runtime/state.py` | 67 | Sanitized carry-forward; strips ground_truth, scores, judge data, forbidden prefixes | Keep; narrow responsibility (candidate-state sanitization is AG chain-owned) |
| **Audit** | `runtime/audit.py` | 69 | SHA-256 hashing of staged files + messages; audit_log.jsonl + run.jsonl | Keep; augment with Inspect log events as supporting evidence |
| **Staging** | `runtime/staging.py` | ~50 | Per-call filesystem isolation (runs/{run_id}/staging/{call_id}/) | Rework: keep audit-visible staging, hand off through Inspect Sample.files + sandbox lifecycle |
| **Model adapter** | `adapters/model_adapter.py` | 125 | OpenAI + Anthropic only, direct API calls | **Replace** with Inspect AI's Model abstraction (26 providers) |
| **Benchmark builder** | `benchmark_builder.py` | 449 | Generates immutable benchmark.json, plan.json, model_steps/*.json, judge_prompts/*.json | Keep |
| **Runtime config** | `runtime/runtime_config.py` | ~150 | Typed config from CLI or profile; validates incompatible settings | Keep |
| **Execution result** | `runtime/execution_result.py` | ~30 | Result contracts | Keep |

**Proven run results** (`runs/run_20260208_080028_154291/summary.json`):
- Model: `claude-sonnet-4-5-20250929` (eval and judge)
- d1 (Known Authority, deterministic): 0.25
- d2 (IRAC closed-book, judge): 0.875
- j3 (IRAC open-book, judge): 1.0
- Citation integrity: 1 valid / 0 invalid (j3)

### 3.2 Chain Step Implementations (~3,000 lines)

Location: `_agchain/legal-10/chain/`

These are the Legal-10-specific step implementations. They define the benchmark package's domain logic — not the platform's generic machinery.

| Step | File | Lines | Scoring | Dependencies |
|------|------|-------|---------|-------------|
| S1 Known Authority | `steps/s1_known_authority.py` | 172 | Deterministic (cite + term match) | None |
| S2 Unknown Authority | `steps/s2_unknown_authority.py` | 117 | MRR (rank in top 10) | S1 |
| S3 Validate Authority | `steps/s3_validate_authority.py` | 154 | Exact match (consistency_flag) | S1 |
| S4 Fact Extraction | `steps/s4_fact_extraction.py` | 214 | Deterministic (disposition + party) | S1 |
| S5 Distinguish (CB+RAG) | `steps/s5_distinguish.py` | 317 | 50% treatment + 50% agree | S1, S4 |
| S6 IRAC Closed-Book | `steps/s6_irac_synthesis.py` | 242 | Judge-required (MEE rubric) | S1-S5 |
| S7 IRAC Open-Book | `steps/s7_open_book_synthesis.py` | 137 | Judge-required (MEE rubric) | S6 |
| S8 Citation Integrity | `steps/s8_citation_integrity.py` | 168 | Binary PASS/FAIL gate (no LLM call) | S7 |
| S9 Transitive (CB+RAG) | `steps/s9_transitive_authority.py` | 467 | 50% treatment + 50% agree | S1, S4 |

All steps inherit from `steps/base.py` (184 lines) — abstract base class with contract: `requires()` → `check_coverage()` → `prompt()` → `parse()` → `ground_truth()` → `score()` → `create_result()`.

**Scoring modules** in `chain/scoring/`:
- `citation_verify.py` (170 lines) — regex + eyecite citation extraction, fake vs SCDB verification
- `s6_composite.py` (107 lines) — three-phase: structural → chain consistency → MEE judge
- `s6b_quality_judge.py` (130 lines) — MEE rubric executor (0-6 per IRAC component)
- `s7_citation_compliance.py` (65 lines) — [DOC#] refs + U.S. cites presence
- `s7_composite.py` (78 lines) — three-phase: structural → citation compliance → MEE judge

### 3.3 Build Pipeline (~27 scripts)

Location: `_agchain/legal-10/scripts/`

| Script | What it does |
|--------|-------------|
| `rp_builder.py` (26 KB) | Stage 4A: builds sealed ResearchPacks — top-K SCOTUS by Fowler + top-K CAP by PageRank per anchor |
| `eu_builder.py` (14 KB) | Stage 4B: builds sealed EUs from RPs — p1.json (anchor), p2.json (authorities), ground_truth.json |
| `data_pipeline/` (15 scripts) | ETL: citation inventory, crosswalks, ranking, depth labels, fake case generation |

Build flow: `DuckDB → rp_builder → eu_builder → benchmark_builder → sealed bundle`

### 3.4 Platform Frontend (mounted, partially functional)

Location: `web/src/pages/agchain/`, `web/src/components/agchain/`

**Working pages:**
- **Projects page** — multi-project registry with create dialog (86 lines)
- **Overview page** — project dashboard with eval + observability cards (68 lines)
- **Models page** — full CRUD, 14 providers, health probes, inspector (109 lines)
- **Benchmarks page** — step editor with reorder, scoring config, payload injection (130 lines)
- **Settings page** — project/org/personal partitions (100 lines)

**Placeholder pages (8):** Datasets, Prompts, Scorers, Parameters, Tools, Runs, Results, Observability — all use `AgchainSectionPage` template with static bullets.

**Shell:** `AgchainShellLayout.tsx` (186 lines) — fixed header, resizable primary left rail, optional secondary rail, brand "BlockData Bench".

**Hooks (4):** `useAgchainProjectFocus`, `useAgchainBenchmarks`, `useAgchainBenchmarkSteps`, `useAgchainModels`

**Services (3):** `agchainProjectFocus.ts`, `agchainBenchmarks.ts`, `agchainModels.ts`

### 3.5 Platform Backend (14 endpoints, instrumented)

Location: `services/platform-api/app/api/routes/agchain_models.py`, `agchain_benchmarks.py`

**Model registry (6 endpoints):**
- `GET /agchain/models/providers` — list 14 supported providers
- `GET /agchain/models` — list with filtering (provider, health, enabled, search)
- `GET /agchain/models/{id}` — detail + recent health checks
- `POST /agchain/models` — create (superuser)
- `PATCH /agchain/models/{id}` — update (superuser)
- `POST /agchain/models/{id}/refresh-health` — async health probe (superuser)

**Benchmark registry (8 endpoints):**
- `GET /agchain/benchmarks` — list with filtering
- `POST /agchain/benchmarks` — create with initial draft version (superuser)
- `GET /agchain/benchmarks/{slug}` — summary with counts
- `GET /agchain/benchmarks/{slug}/steps` — ordered steps
- `POST /agchain/benchmarks/{slug}/steps` — create step (superuser)
- `PATCH /agchain/benchmarks/{slug}/steps/{id}` — update step (superuser)
- `POST /agchain/benchmarks/{slug}/steps/reorder` — atomic reorder (superuser)
- `DELETE /agchain/benchmarks/{slug}/steps/{id}` — delete step (superuser)

**Observability:** 18 counters + 4 histograms across all endpoints. 3 runtime readiness checks in `agchain` surface.

### 3.6 Database (6 tables, 1 RPC)

Location: `supabase/migrations/20260326*.sql`, `20260328*.sql`

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `agchain_model_targets` | Model registry | provider_slug, qualified_model, auth_kind, health_status, probe_strategy |
| `agchain_model_health_checks` | Health probe history | model_target_id, status, latency_ms, error_code |
| `agchain_benchmarks` | Benchmark metadata | benchmark_slug, current_draft_version_id, current_published_version_id |
| `agchain_benchmark_versions` | Versioned specs | version_label, version_status (draft/published/archived), step_count |
| `agchain_benchmark_steps` | Step definitions | step_order, step_kind, inject_payloads, scoring_mode, output_contract |
| `agchain_runs` | Run history | benchmark_version_id, evaluated_model_target_id, status, summary_jsonb |
| `agchain_benchmark_model_targets` | Model selections | selection_role (evaluated/judge) |

RPC: `reorder_agchain_benchmark_steps_atomic` — atomic step reorder within version.

All tables have RLS. `credential_source_jsonb` is hidden from authenticated users.

### 3.7 Tests

Location: `_agchain/legal-10/tests/`

| Test file | Lines | What it covers |
|-----------|-------|---------------|
| `test_execution_backend.py` | 569 | DirectBackend, InspectBackend, model adapters, message forwarding |
| `test_runtime_config.py` | 156 | Config validation, serialization, incompatible settings rejection |
| `test_profile_registry.py` | 123 | Profile loading, session strategies, state isolation per EU |
| `test_profile_types.py` | 83 | Pydantic model validation, JSON roundtrips |
| `test_3_step_run_citation_integrity.py` | 104 | Citation extraction and verification |
| `test_irac_judge_requirement.py` | 24 | S6/S7 judge_required marker verification |

---

## 4. The Three Disconnected Systems

This is the current state. Three systems work independently but are not connected:

```
                        NOT CONNECTED
  [Proven Kernel]  ←─────────────────→  [Platform UI + API]
  _agchain/legal-10/runspecs/           web/src/pages/agchain/
  run_3s.py + runtime modules           services/platform-api/
  Direct CLI execution                  Supabase tables
  2 model providers                     14 model providers (registry only)
         ↑                                      ↑
         │ NOT CONNECTED                        │ NOT CONNECTED
         ↓                                      ↓
              [Inspect AI]
              _agchain/_reference/inspect_ai/
              26 model providers
              Task/Solver/Scorer/Tool protocols
              Sandbox, events, logging
              Adopted in docs, not in code
```

**To make forward progress:** The kernel must adopt Inspect AI as its execution substrate, and the platform must be able to invoke the kernel.

---

## 5. Inspect AI Adoption Map (Module-Level Decisions)

Source: `_agchain/docs/_essentials/2026-03-27-inspect-runtime-helper-maximization-analysis.md`

### What AG chain keeps (benchmark semantics the platform owns)

| Module | Why AG chain owns it |
|--------|---------------------|
| `payload_gate.py` | Step-level admission control — Inspect has no equivalent |
| `input_assembler.py` | Deterministic fenced-window message protocol — AG chain policy |
| `state.py` (candidate sanitization) | Carry-forward rules, forbidden key stripping — AG chain policy |
| `audit.py` | Cryptographic audit trail — AG chain's benchmark integrity proof |
| `benchmark_builder.py` | Static benchmark packet generation — AG chain package contract |

### What AG chain replaces with Inspect

| Module | What Inspect provides |
|--------|----------------------|
| `model_adapter.py` | `ModelAPI` — 26 providers, async generate(), tool use, structured output, caching |
| Per-step model execution | `Task` + `Sample` + `generate()` — standardized execution lifecycle |
| (future) Tool execution | `Tool` protocol + MCP integration + approval policies |
| (future) Sandbox | `SandboxEnvironment` — Docker, per-sample isolation |
| (future) Event logging | `Event` system — 17+ event types, timeline, span-based timing |

### What AG chain wraps around Inspect

| Capability | AG chain adds |
|-----------|---------------|
| Model resolution | Provider selection from AG chain model registry → Inspect ModelAPI |
| Task execution | AG chain step-boundary orchestration wrapping Inspect Task/Sample per step |
| Scoring | AG chain deterministic scorers + judge protocol wrapping Inspect Scorer |
| Context assembly | AG chain input_assembler producing Inspect ChatMessage lists |

### Boundary rule

**AG chain decides:** What context exists. What's admitted. What windows are built. What candidate state survives. What tools are exposed. What audit proof is required.

**Inspect executes:** Model calls. Tool calls. Sample sandboxing. Scorer lifecycle. Retries/limits. Per-sample logs/events.

### Migration sequence

1. Replace `model_adapter.py` with Inspect AI Model abstraction
2. Rebase per-step execution on Inspect Task/Sample
3. Rework staging into Sample.files + sandbox lifecycle
4. Adopt Inspect tool/approval/MCP pipeline
5. Layer AG chain statefulness registry above Inspect

---

## 6. The Dataset → Benchmark Package → Platform Pipeline

```
Raw Datasets (any domain)
    ↓ build pipeline (rp_builder → eu_builder → benchmark_builder)
Sealed Benchmark Bundles
    ↓ package registration
Registered Benchmark (versioned in agchain_benchmarks + agchain_benchmark_versions)
    ↓ run configuration (model selection, environment profile)
Execution (kernel: step plans → model calls → scoring)
    ↓ artifact persistence
Results (run.jsonl, audit_log.jsonl, summary.json → agchain_runs.summary_jsonb)
    ↓ comparison
Analysis (across runs, models, versions, environment profiles)
```

**For Legal-10 specifically:**
1. `datasets/legal10-updates.duckdb` (738 MB) → SCDB 29K cases, Shepard's 5.7M edges, CAP 855K cases
2. `scripts/rp_builder.py` → per-anchor ResearchPacks in `datasets/rps/`
3. `scripts/eu_builder.py` → sealed EUs in `datasets/eus/legal10_3step_v1/` (p1.json + p2.json + ground_truth.json)
4. `benchmark_builder.py` → benchmark packet (benchmark.json + plan.json + model_steps/ + judge_prompts/)
5. `run_3s.py` → d1 → d2 → j3 → judge → citation_integrity → artifacts in `runs/`

**For a hypothetical future package (e.g., CyberBench):**
1. Different raw dataset (CVE data, exploit samples, network logs)
2. Different build pipeline (different builders, different payload schemas)
3. Different step plans (different questions, different scoring)
4. Same AGChain platform machinery (same registration, same model registry, same run orchestration, same results comparison)

---

## 7. AGChain's Core Value Proposition

**Three-dimensional comparison:** Benchmark (fixed) x Model (fixed) x Environment Profile (varied)

No other evaluation platform offers runtime-policy-as-a-first-class-axis comparison. The question is not "which model wins" but "which runtime policy makes this model strongest."

**Environment Profile** composes:
- **Statefulness strategy** — how context is assembled, what persists between steps, session boundaries
- **Tools strategy** — what tools are available, access boundaries, constraints
- **Constraints** — cost/time/token/message limits
- **Audit** — what gets hashed and logged

This is the 16-gap area where Inspect AI has no equivalent. AG chain must own the statefulness and tools registries as extensible contracts, not hardcoded enums.

---

## 8. Required Reading Order

Any agent or session working on AGChain reads these in order before proposing work:

1. **This document** — four-layer model, directory map, code inventory, adoption map
2. **`_agchain/_reference/owner-message.md`** — Inspect AI adoption modes and decision hierarchy
3. **`_agchain/docs/_essentials/_INDEX.md`** — authority hierarchy for Legal-10 specs
4. **`_agchain/docs/_essentials/2026-03-26-agchain-platform-requirements.md`** — platform requirements (sections 1-3 minimum)
5. **`_agchain/_reference/inspect_ai_analysis.md`** — Inspect AI architecture (extension points and patterns)

Only after reading these should work begin.

---

## 9. Common Misunderstandings

| Wrong | Right |
|-------|-------|
| AGChain is a legal benchmark | AGChain is a generic benchmark platform. Legal-10 is its first package. |
| The datasets directory is AGChain's data | Datasets are raw materials. Build pipelines transform them into sealed bundles. |
| AGChain should be built Legal-10-specific | Legal-10 specifics belong in the package, not the platform. |
| Build everything from scratch | Check Inspect AI first. Use the four adoption modes. |
| The 3-step MVP is the full product | It's the current executable slice. The target is 10 steps. The platform itself is unlimited. |
| The proven kernel is the platform | The kernel is standalone CLI Python. The platform is web UI + API + database. They must be connected. |
| Inspect AI replaces everything | AG chain keeps payload_gate, input_assembler, state sanitization, audit. Replace model_adapter; wrap the rest. |
| `docs/agchain/` is the documentation path | Moved to `_agchain/docs/`. The old path no longer exists. |

---

## 10. What Must Happen Next

The three disconnected systems (section 4) must be connected. The sequence:

1. **Adopt Inspect AI's model layer** in the proven kernel — replace `model_adapter.py`, expand from 2 to 26 providers
2. **Create benchmark package import** — load sealed bundles into platform database (agchain_benchmarks + steps)
3. **Create run submission endpoint** — platform-api triggers kernel execution, stores results
4. **Build Runs + Results pages** — frontend surfaces to configure, launch, and inspect runs
5. **Layer environment profiles** — the statefulness + tools registries that make AG chain unique

Each step is a separate implementation plan. Do not attempt to plan or build them all at once.

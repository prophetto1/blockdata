---
title: "Platform architecture overview"
sidebar:
  order: 1
---

# AG chain Platform Architecture

**Some details in this document may not be completely accurate. Some details or plans might change as needed. The intent is to grasp the general direction, not use this as a canonical requirement that must be complied with.**

**Date:** 2026-03-27
**Status:** Consolidated architecture reference
**Consolidates:** agchain-platform-requirements, agchain-platform-understanding, generaldirections

---

## 1. Executive Summary

The cleanest model of this system is:

- `writing-system` is the host platform.
- `AG chain` is the benchmark runner product that lives inside that host.
- `Legal-10` is the first benchmark package loaded by AG chain.

This distinction matters because the current `legal-10` repository contains at least four layers of concern:

1. Benchmark semantics and package rules
2. Dataset and build-pipeline machinery
3. A current runnable 3-step execution slice
4. Older or partially superseded chain/runtime ideas

The evidence points toward a benchmark-native execution model with these invariants:

- All benchmark data is pre-built and sealed
- Runtime avoids retrieval and hidden state
- Evidence admission is explicit and step-scoped
- Statefulness is runner-managed, not model-native
- The evaluated model only sees staged bytes
- Auditability is a first-class product requirement

---

## 2. Product Definition

AG chain is a generic benchmark platform hosted inside `writing-system`.

AG chain is **not**: a synonym for Legal-10, just a script runner, just a reporting dashboard, just a dataset builder.

AG chain **is**: a benchmark authoring platform, a benchmark packaging platform, a benchmark execution platform, a model-selection platform, a scoring and artifact platform, an observability-enabled benchmark operations platform.

Legal-10 is the first benchmark package. AG chain must be designed so future benchmarks can be:

- Unrelated to legal datasets
- Built from different raw data sources
- Packaged differently at build time
- Executed with different step plans and scorers

without requiring AG chain itself to become Legal-10-specific.

---

## 3. Architecture

### Three-Layer Model

| Layer | Role | Scope |
|-------|------|-------|
| `writing-system` | Host platform | Shell, routing, auth, platform-api, OTel, Supabase |
| `AG chain` | Benchmark product | Registry, authoring workbench, orchestration, audit, results |
| Benchmark packages (Legal-10, Atomic, L7...) | Content | Step plans, payload schemas, scoring, ground-truth rules, domain-specific artifacts |

### Source Authority Hierarchy (Legal-10)

1. `legal-10/docs/mvp/M1-buildtime-packaging-sealing-dev-brief.md` — HIGHEST for bundle layout, schemas, sealing
2. `legal-10/docs/platform/inter-step-requirements.md` — HIGHEST for runner semantics
3. `legal-10/docs/fdq/*.md` — AUTHORITATIVE for step prompts, contracts, scoring
4. Everything else — supplementary

---

## 4. Shell & Navigation

AG chain is a fourth sibling shell under the authenticated app router, alongside FlowsShellLayout and AdminShellLayout.

- Route family: `/app/agchain/*`
- Shell layout: `AgchainShellLayout.tsx` (sibling to AdminShellLayout)
- Left nav: `AgchainLeftNav.tsx`
- Pages: `web/src/pages/agchain/*.tsx` (lazy-loaded)
- Does NOT require superuser-only guard
- SHOULD remain architecturally extractable to its own repo

### Primary Rail Items

The rail reflects 5-6 durable platform workflows. Complexity lives inside a benchmark workbench, not on the rail:

| Rail Item | What It Covers |
|-----------|---------------|
| Benchmarks | Authored evaluation specs; entering one opens the workbench |
| Models | Global model registry (endpoints, health, capabilities) |
| Environments | Context/tool/session configuration profiles |
| Runs | Execution: benchmark x model x environment profile |
| Results | Three-axis comparison and insight |
| Ops | System health and observability |

### Benchmark Workbench Sections

When you enter a benchmark, the workbench provides child pages. The likely taxonomy (informed by Inspect alignment):

Steps, Scoring, Models, Context, State, Tools, Sandbox, Approval, Limits, Validation, Runs

`#steps` is the first implemented child page. Others remain provisional.

---

## 5. Benchmark Package Abstraction

A benchmark package provides:

- Metadata (name, version, description)
- Dataset version references
- Execution plan definitions (`plan.json`)
- Step definitions (FDQs or equivalent)
- Prompt/message construction rules
- Payload admission rules
- Output schemas per step
- Scoring bindings (deterministic + judge)
- Artifact contract
- Validation rules
- Supported runtime policies

### Registration & Versioning

- AG chain MUST register packages, list versions
- Associate dataset versions with package versions
- Associate scorer versions with package versions
- Expose compatibility metadata
- DuckDB is build-time only — MUST NOT be read directly by the runtime UI or runner

---

## 6. Runtime Configuration Surface

AG chain MUST expose configurable runtime policies for at least:

| Policy Area | Options |
|-------------|---------|
| Context delivery | Structured windows, flat history, RAG-injected |
| Context persistence | No persistence, sanitized carry-forward, replay of prior context |
| Step call strategy | One API call per step (prevents seeing future steps), single-call multi-step |
| Model target selection | Provider, model, API endpoint, credentials |
| Judge model selection | Independent from evaluated model |
| Tool availability | No tools, limited tools, MCP, full autonomy |
| Retry behavior | Per adapter config |
| Concurrency | EU-level parallelism, not step-level |

For benchmark-grade runs, AG chain MUST NOT silently allow:
- Live retrieval against the benchmark corpus
- Unlogged tool access that alters evidence visibility
- Provider-native persistent memory
- Opaque server-side thread history outside runner control

---

## 7. Execution & Run Lifecycle

Benchmark execution MUST be API-triggered through `platform-api` patterns, not CLI-only.

Run lifecycle:
1. Submission (via API)
2. Pre-execution validation
3. Start
4. Step-level progress visibility
5. Completion
6. Failure handling
7. Artifact persistence
8. Result persistence

### Run Artifacts

| Artifact | Purpose |
|----------|---------|
| `run.jsonl` | Append-only event log (candidate/judge/scorer results) |
| `audit_log.jsonl` | Per-step hashes, ground_truth_accessed confirmation |
| `candidate_state.json` | Sanitized carry-forward |
| `summary.json` | Deterministic score rollups |
| `run_manifest.json` | Provenance snapshot (runner version, model configs, file hashes, reproducibility key) |
| `trace.jsonl` | LangGraph-shaped execution timeline |

---

## 8. Model Selection

Model selection is a first-class platform feature. AG chain MUST provide:

- Evaluated model selection per run
- Provider/API endpoint selection
- OpenAI-compatible API patterns
- Model capability metadata
- Health/connection visibility
- Independent judge-model configuration
- Credential management (references existing connection/key surfaces)

**Current state:** The Models surface is implemented with 6 API endpoints, provider catalog, health probes, and a table+inspector UI at `/app/agchain/models`.

---

## 9. Observability & Audit

AG chain MUST distinguish between:

- **Operational observability** — how the system behaved (OTel spans, metrics, logs)
- **Benchmark audit truth** — what happened in benchmark terms (audit_log.jsonl, hashes, determinism)

Both are required. They are not interchangeable.

### OTel Patterns

Uses the same OTel direction already in platform-api:
- Run-level telemetry
- Step-level telemetry
- Provider latency
- Error telemetry
- Trace correlation

Observability MUST be built in from the start, not added later.

### Raw Artifact Inspection

Required capability for: run.jsonl, audit_log.jsonl, candidate_state.json, summary.json, run manifests, raw step outputs.

---

## 10. Validation

Validation MUST happen before benchmark execution:

- Required files exist
- Manifests complete
- Step definitions resolvable
- Scorer references valid
- Asset dependencies present
- Package version metadata coherent
- Build outputs runnable

---

## 11. Builder Surfaces

AG chain MUST provide builders for:

| Builder | Input | Output |
|---------|-------|--------|
| RP Builder | DuckDB queries, authority selection | Per-RP payloads (d1.json, d2.json, doc3.json) |
| EU Builder | RP outputs | EU packets (p1.json, p2.json, ground_truth.json, manifest.json) |
| Benchmark Builder | FDQ specs, EU refs | plan.json, model_steps/, judge_prompts/ |
| Bundle Sealer | Complete benchmark | manifest.json + signature.json |

---

## 12. Current Codebase State

### Proven Components (~3,200 lines)

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Runner | `runspecs/3-STEP-RUN/run_3s.py` | 465 | Proven by real Claude run |
| Benchmark Builder | `runspecs/3-STEP-RUN/benchmark_builder.py` | 449 | Functional |
| InputAssembler | `runtime/input_assembler.py` | 133 | Functional |
| PayloadGate | `runtime/payload_gate.py` | 30 | Functional |
| CandidateState | `runtime/state.py` | 67 | Functional |
| Audit | `runtime/audit.py` | 69 | Functional |
| Model Adapters | `adapters/model_adapter.py` | 125 | OpenAI + Anthropic |
| d1 Scorer | `scorers/d1_known_authority_scorer.py` | 254 | Functional |
| Citation Integrity | `scorers/citation_integrity.py` | 258 | Functional |
| EU Builder | `scripts/eu_builder.py` | 396 | Functional |
| RP Builder | `scripts/rp_builder.py` | 840 | Functional |

### Implemented Platform Surfaces

| Surface | Status |
|---------|--------|
| AG chain shell & left nav | Implemented |
| Models page (global registry) | Implemented — 6 endpoints, table+inspector, health probes |
| Benchmarks catalog page | Implemented — 2 endpoints, table+toolbar, create flow |
| Benchmarks #steps workbench | Implemented — 6 endpoints, two-column step editor |
| Migration: agchain_model_targets | Landed |
| Migration: agchain_benchmark_registry (5 tables) | Landed |

---

## 13. File Organization

### AG chain Workspace (`_agchain/`)

- `docs/` — Working docs, plans, evaluations
- `docs-site/` — Published documentation site
- `legal-10/` — First benchmark package (docs, scripts, runspecs, datasets)
- `_reference/inspect_ai/` — Inspect AI source clone
- `datasets/` — Raw data
- `scripts/` — Build pipeline

### Host Platform Integration

- Shell: `web/src/pages/agchain/` (lazy-loaded pages)
- Components: `web/src/components/agchain/` (models/, benchmarks/)
- Hooks: `web/src/hooks/agchain/`
- Libs: `web/src/lib/agchainModels.ts`, `agchainBenchmarks.ts`
- Backend routes: `services/platform-api/app/api/routes/agchain_*.py`
- Backend domain: `services/platform-api/app/domain/agchain/`
- Migrations: `supabase/migrations/20260326*_agchain_*.sql`

---

## Consolidated From

1. `_agchain/docs/platform/2026-03-26-agchain-platform-requirements.md`
2. `_agchain/docs/platform/2026-03-26-agchain-platform-understanding.md`
3. `_agchain/docs/platform/generaldirections.md`

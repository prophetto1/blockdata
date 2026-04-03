---
title: "Build-Time to Runtime: Core Concepts"
description: How benchmark authoring in the AGChain platform produces sealed artifacts that the runner executes — the vocabulary, the pipeline, and the separation of concerns.
---

This document explains the core concepts that connect AGChain's authoring platform to its execution engine. It uses references to source materials organized elsewhere in these docs.

## The Two Phases

AGChain separates **build-time** (authoring and packaging) from **runtime** (execution and scoring). Nothing crosses this boundary except sealed, immutable artifacts.

- **Build-time**: A user designs a benchmark in the AGChain workspace. The platform materializes their authored steps, prompts, and dataset selections into a **bundle** — a self-contained directory of JSON files that the runner can execute without network access, database queries, or external dependencies.
- **Runtime**: The runner loads the bundle, verifies its integrity, and executes the plan. It calls models, validates outputs, scores results, and produces audit artifacts.

This separation is what makes benchmarks reproducible. If two people have the same bundle, they get the same execution. The runner never improvises — it reads the plan and follows it.

Source: Platform Architecture (Section 1: Executive Summary), Benchmark Technical Specification (Section A: One-Page Overview)

---

## The Bundle

A bundle is a directory with two major sections:

```
<bundle_root>/
  benchmark/          ← shared across all evaluation units
    benchmark.json    ← metadata: name, version, system message
    plan.json         ← the playbook: step order, scoring, payloads
    model_steps/      ← one JSON per step: prompt template + output schema
      d1.json
      d2.json
      j3.json
    judge_prompts/    ← rubric templates for judge-scored steps
      irac_mee_pair_v1.json
  eus/                ← one directory per evaluation unit (test case)
    <eu_id>/
      p1.json         ← anchor payload (always candidate-visible)
      p2.json         ← research pack (visible only when plan says)
      ground_truth.json  ← runner-only labels (NEVER shown to model)
  manifest.json       ← SHA-256 hash of every file in the bundle
  signature.json      ← Ed25519 signature over the manifest
```

The **benchmark packet** (everything under `benchmark/`) is shared — it defines what the benchmark asks. The **EU packets** (under `eus/`) are per-test-case — they provide the specific evidence the model reasons about.

Source: M1 Build-Time Packaging Dev Brief (Frozen decisions: Bundle layout), Sealed Evaluation Units Security

---

## plan.json — The Playbook

The plan is the single source of truth for execution. The runner reads it and does exactly what it says. Every decision about step ordering, evidence admission, and scoring mode lives here.

```json
{
  "steps": [
    {
      "step_id": "d1",
      "step_file": "model_steps/d1.json",
      "inject_payloads": ["p1"],
      "scoring": "deterministic",
      "scorer_ref": "score_d1_known_authority_v1",
      "output_contract": "ka_sc_v1"
    },
    {
      "step_id": "d2",
      "step_file": "model_steps/d2.json",
      "inject_payloads": ["p1"],
      "scoring": "judge",
      "judge_prompt_file": "judge_prompts/irac_mee_pair_v1.json",
      "output_contract": "irac_v1"
    },
    {
      "step_id": "j3",
      "step_file": "model_steps/j3.json",
      "inject_payloads": ["p1", "p2"],
      "scoring": "judge",
      "judge_prompt_file": "judge_prompts/irac_mee_pair_v1.json",
      "output_contract": "irac_v1",
      "judge_grades_step_ids": ["d2", "j3"]
    }
  ]
}
```

Key fields:
- **step_id**: identifier used in state, audit, and scoring
- **step_file**: path to the step definition (prompt template + output schema)
- **inject_payloads**: which EU payloads the model can see at this step (`p1` = anchor, `p2` = research pack)
- **scoring**: `"deterministic"` (pure function, no model call) or `"judge"` (separate model grades the output)
- **scorer_ref**: for deterministic steps, which scoring function to use
- **judge_prompt_file**: for judge steps, which rubric template to use
- **output_contract**: which JSON schema the model's response must conform to
- **judge_grades_step_ids**: for comparative grading — which steps the judge evaluates together

The plan does not contain prompts, evidence, or scoring logic. It points to those things by reference. This means the same plan shape works for any benchmark — Legal-10, a coding benchmark, a medical reasoning benchmark — only the referenced files change.

Source: Benchmark Technical Specification v1.1 (Section 3.2.2: plan.json)

---

## Evaluation Units (EUs)

An EU is one test case. In Legal-10, each EU is one Supreme Court case with its cited authorities.

Each EU contains:
- **p1.json** — the anchor payload. Contains the case text, citation, name, and term. The model always sees this.
- **p2.json** — the research pack. Contains ranked authority texts (other cases cited by the anchor). The model sees this only when the plan admits it (`inject_payloads: ["p1", "p2"]`).
- **ground_truth.json** — runner-only labels. Contains the known-authority answers, citation inventories, and RP subset lists that deterministic scorers check against. The runner reads this for scoring but **never stages it** for the model.

The split between p1/p2/ground_truth is the information discipline boundary. The runner enforces it through **payload gating** and **staging isolation**: at each step, only the payloads listed in `inject_payloads` are copied into the staging directory. The model adapter reads only from staging. Ground truth is never staged.

Source: M1 Dev Brief (EU packet schema), Benchmark Technical Specification (Section 4.1: Step Lifecycle and Staging)

---

## The EU Build Pipeline

EUs don't appear from nowhere. They're produced by a build pipeline from raw datasets:

```
Stage 1: Citation inventory (regex extraction from SCOTUS opinions)
Stage 2: Citation resolution (crosswalks to SCDB + CAP case IDs)
Stage 3: Authority text extraction (pre-extracted summaries + head matter)
Stage 3.7: Citation ranking (Fowler scores for SCOTUS, PageRank for CAP)
Stage 3.8: Anchor eligibility (filter by text length, citation count, K-rule)
Stage 4A: Research Pack assembly (top-K authorities composed into RP)
Stage 4B: EU assembly (p1 from anchor, p2 from RP, ground_truth from inventories)
```

The build pipeline is three CLI tools:
1. **rp-packager.py** — produces research packs from ranked citations + authority text
2. **eu-builder.py** — combines anchors + RPs + ground truth into EU packets
3. **benchmark-builder.py** — materializes the shared benchmark packet from spec definitions

All three are deterministic. Same inputs + same seed = byte-identical outputs. No model calls, no network access.

Source: Data Pipeline Reference, EU Builder Reference, RP Builder Reference

---

## Inter-Step Chain Execution

The runner executes steps in order, carrying state between them. This is the "chain" in AGChain.

At each step, the runner:
1. **PayloadGate** — admits only the payloads listed in the plan
2. **Staging** — copies admitted files to an isolated directory
3. **InputAssembler** — builds a fenced-window message from staged files + carry-forward state
4. **Model call** — sends messages to the evaluated model
5. **Parse + validate** — checks the response against the step's output_contract
6. **Score** — deterministic scorer or judge model, depending on the plan
7. **State update** — adds the parsed output to candidate_state (sanitized: no ground truth, no scores, no judge outputs)
8. **Audit** — hashes all inputs and outputs for the audit trail
9. **Cleanup** — removes the staging directory

The critical invariant: **state sanitization**. When the model's output from step d1 is carried forward to step d2, the runner strips all scoring data, ground truth references, and judge outputs. The model only ever sees its own prior answers, never how they were graded.

This is what makes AGChain a **chain engine** rather than just a model caller. Inspect AI handles the model call within a single step. AGChain handles what happens between steps — payload gating, state carry-forward, sanitization, and audit boundaries.

Source: Inter-Step Requirements, PDRunner and Inspect AI

---

## Manifest and Sealing

The manifest is the integrity guarantee. Before the runner starts, it:
1. Loads `manifest.json` — an exhaustive list of every file in the bundle with its SHA-256 hash and byte count
2. Verifies `signature.json` — an Ed25519 signature over the canonicalized manifest
3. Checks every file hash against the manifest

If any file has been modified, the runner refuses to start. This prevents tampering with prompts, evidence, ground truth, or scoring rubrics after release.

The canonicalization rule ensures hash stability across platforms: UTF-8, lexicographic key ordering, arrays preserve order, no insignificant whitespace.

Source: Sealed Evaluation Units Security

---

## From CLI Prototype to Platform

The 3-step CLI prototype (`run_3s.py`) proves the execution model works. It reads CLI args, loads a bundle from the filesystem, and runs. The AGChain platform replaces the manual parts:

| CLI prototype | AGChain platform |
|--------------|-----------------|
| Developer writes prompts as Python constants | User authors prompts in the step editor |
| Developer writes plan.json by hand | Platform generates plan.json from authored steps |
| Developer runs rp-packager + eu-builder CLIs | Platform triggers build pipeline jobs |
| Developer passes `--provider openai --model gpt-4o` | User selects a model target in the workspace |
| API keys live in `.env` | Encrypted credentials in the model registry |
| Developer runs `python run_3s.py` | User clicks Run; platform launches async worker |
| Results appear as local JSON files | Results stored in platform, visible in UI |

The runtime modules (payload_gate, input_assembler, staging, state, audit, scorers) are pure functions that work identically in both contexts. They don't care whether the plan.json came from a Python script or a platform materializer.

Source: 3-Step to Platform Bridge Analysis

---

## What the Platform Materializer Must Produce

When a user finishes authoring a benchmark and triggers a build, the platform must produce exactly the bundle structure the runner expects. The materializer reads from AGChain's database tables:

| Bundle artifact | Source table/field |
|----------------|-------------------|
| `benchmark.json` | `agchain_benchmarks` (name, description, version) + benchmark version (system_message) |
| `plan.json` | `agchain_benchmark_steps` (step_id, step_order, scoring_mode, scorer_ref, judge_prompt_ref, output_contract, inject_payloads, judge_grades_step_ids) |
| `model_steps/*.json` | `agchain_benchmark_steps.step_config_jsonb` (prompt_template, placeholders, output_schema) |
| `judge_prompts/*.json` | Scorer/prompt registry (prompt_template, placeholders, output_schema) |
| `eus/*/p1.json` | Dataset samples (anchor content, mapped to payload format) |
| `eus/*/p2.json` | Build pipeline output (research pack from ranked citations) |
| `eus/*/ground_truth.json` | Dataset samples (runner-only labels, split from candidate-visible data) |
| `manifest.json` | Generated: SHA-256 of every file in the bundle |
| `signature.json` | Generated: Ed25519 signature over canonicalized manifest |

The plan.json → benchmark_steps mapping is nearly 1:1. The step content (prompt_template, output_schema) requires structured storage in `step_config_jsonb`. The EU pipeline is the most complex piece — it depends on benchmark-specific data processing.
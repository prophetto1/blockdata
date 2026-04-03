---
title: "Prompt protocol foundation (v1.0)"
sidebar:
  order: 8
---

# Prompts v1.0 - Prompt as State Protocol

This document refers to areas defined by the following document(s):
[[[C] 0122_benchmark-structure-v3.5]]

## Part 1: The Prompt as State Protocol

In this architecture, "Prompts" are not unstructured strings. They are structured message stacks (Inspect AI style) that physically enforce the statefulness pillars.

**The Windowed Stack (Standard Protocol):** every step's prompt is constructed from distinct, fenced windows.

---

## Part 2: Inspect AI Prompt / Message Pattern (Recommended Standard)

This is the pattern to standardize across question types (whether later generated with LangChain or simple string formatting).

### 2.1 System message (constant across all samples)

Use one global system message (set in the solver via `system_message(...)`, not repeated inside `Sample.input`):

```text
SYSTEM_MESSAGE = """\
You are taking the Legal-10 benchmark.

Rules:

- Use ONLY the information explicitly provided in the user messages for this sample.
- Do NOT use prior knowledge about law, cases, or citations.
- Do NOT assume missing facts. If required information is missing, answer exactly: INSUFFICIENT_INFO
- Follow the Response Contract exactly. Output must be machine-parseable and contain no extra text.
"""
```

### 2.2 Sample input (structured, "session cut" by default)

Each question instance becomes one `Sample` with one fresh message list (no carry-over unless you explicitly include it):

```python
from inspect_ai.dataset import Sample
from inspect_ai.model import ChatMessageUser

sample = Sample(
    id="1.1:1953-058:seed=0",
    input=[
        ChatMessageUser(
            """# LEGAL-10 CONTEXT PACK
anchor_caseId: 1953-058
anchor_usCite: 347 U.S. 483

# CANDIDATES

A: 163 U.S. 537
B: 245 U.S. 60
"""
        ),
        ChatMessageUser(
            """# TASK
Question Type: 1.1 (SC-A1 Authority Pairwise)

# QUESTION

Which candidate is MORE authoritative under the benchmark rule?

# RESPONSE CONTRACT

Return exactly one character: A or B.
If you cannot determine from the provided information, return exactly: INSUFFICIENT_INFO
"""
        ),
    ],
    choices=["A", "B", "INSUFFICIENT_INFO"],
    target="A",
    metadata={
        "qb_number": "1.1",
        "anchor_caseId": "1953-058",
        "candidate_a": "163 U.S. 537",
        "candidate_b": "245 U.S. 60",
        "session_cut": True,
    },
)
```

### 2.3 Stateful / chained tasks (without leakage)

If a "task" is 4 sub-questions (your KA-SC shape), make it 4 `Sample`s per anchor.

To carry forward only what you intend, add an explicit "carry-forward packet" that contains prior model output only (never GT):

```text
ChatMessageUser("""# CARRY-FORWARD (prior model output)
step_id: KA-SC-STEP1
model_answer: A
""")
```

That preserves:

- "new session" semantics (each step is independent unless you include carry-forward),
- intentional session cuts (you can omit carry-forward entirely),
- auditability (what the model saw is explicit in `Sample.input`).

You can get "Claude Code style context windows" in Inspect by standardizing each `Sample.input` into stacked, labeled windows with hard BEGIN/END fences, and by making "carry-forward" an explicit window (instead of implicit chat history).

### 2.4 The windowed, fenced stack (recommended)

**Global (solver-level) system message (constant):**

```text
SYSTEM_MESSAGE = """\
You are a Legal-10 benchmark assistant.

You must treat each message as a separate context window.
Only use information inside the provided windows for this sample.
Do not use prior knowledge, training data, or previous samples.

Output must follow the RESPONSE CONTRACT exactly. No extra text.
If required information is missing, output exactly: INSUFFICIENT_INFO
"""
```

**Per-sample context windows (`Sample.input`)** (3-6 windows max):

**Window 0 - Environment** (optional, tiny)

```text
<<<BEGIN_ENV>>>
benchmark: Legal-10
mode: closed-book unless explicitly provided
session_cut: true
<<<END_ENV>>>
```

**Window 1 - Anchor Pack** (the "Claude Code context" blob)

```text
<<<BEGIN_ANCHOR_PACK>>>
anchor_caseId: {anchor_caseId}
anchor_usCite: {anchor_usCite}
anchor_caseName: {anchor_caseName}

[ANCHOR_TEXT]
{anchor_text_or_excerpt}

[CITATION_INVENTORY]
{structured_inventory_snippet_if_applicable}
<<<END_ANCHOR_PACK>>>
```

**Window 2 - Evidence Pack** (optional; only what you intend to reveal)

```text
<<<BEGIN_EVIDENCE_PACK>>>

# Candidate Cards

A: cite={cite_a} fowler={fowler_a} occurrences={occ_a} treatment={treat_a}
B: cite={cite_b} fowler={fowler_b} occurrences={occ_b} treatment={treat_b}
C: ...
<<<END_EVIDENCE_PACK>>>
```

**Window 3 - Carry-Forward State** (optional, explicit, model-visible)

Only include what you want the model to know across steps:

```text
<<<BEGIN_CARRY_FORWARD>>>
prior_step_id: {prior_step_id}
prior_model_answer: {prior_model_answer}

# (optional) any derived state you allow, but never GT / hidden columns

<<<END_CARRY_FORWARD>>>
```

**Window 4 - Task** (the actual question)

```text
<<<BEGIN_TASK>>>
qb_number: {qb_number}
template_id: {template_id}

[QUESTION]
{question_text}

[RESPONSE_CONTRACT]
{exact_output_contract}

<<<END_TASK>>>
```

**Window 5 - Output Guard** (optional but useful)

```text
<<<BEGIN_OUTPUT_GUARD>>>
Return ONLY the response token(s) required by the RESPONSE CONTRACT.
Do not explain.
<<<END_OUTPUT_GUARD>>>
```

**Exact Inspect `Sample` shape:**

```python
from inspect_ai.dataset import Sample
from inspect_ai.model import ChatMessageUser

Sample(
    id="{qb_number}:{anchor_caseId}:{instance_id}",
    input=[
        ChatMessageUser(ENV_WINDOW),
        ChatMessageUser(ANCHOR_PACK_WINDOW),
        ChatMessageUser(EVIDENCE_PACK_WINDOW),
        # ChatMessageUser(CARRY_FORWARD_WINDOW),  # only when intended
        ChatMessageUser(TASK_WINDOW),
        ChatMessageUser(OUTPUT_GUARD_WINDOW),
    ],
    choices=[...],  # if closed-set
    target="...",  # GT (runner-only; not shown)
    metadata={...},  # runner-only state, joins, debug
)
```

If needed, translate this into a concrete `prompt_template` convention for `qb_registry.question_types.prompt_template` (e.g., storing each window separately vs one concatenated template). The "Claude Code style" piece is the windowed, fenced blocks above.

---

## Part 3: Relationship to Benchmark Packaging (3-STEP-RUN vertical slice)

This section reflects the "Developer Prompt: Legal-10 3-STEP-RUN (HAL-compatible vertical slice)" notes (see `0118_issue_define_3steprun_prompt.md`).

### 3.1 TODO / irregularities called out

- Main issue: `benchmark/judge_prompts/j3.json` (judge rubric for grading BOTH IRACs).
- Question raised: why are these not included within the step?

### 3.2 Goal

Build a minimal end-to-end Legal-10 run-spec with **3 candidate steps** and **2 post actions**:

- `d1` = Known Authority (deterministic scoring)
- `d2` = IRAC without RP (candidate output; later judged + citation-checked)
- `j3` = IRAC with RP (candidate output; later judged + citation-checked)

After `j3`:

- **Judge call** grades BOTH IRACs (MEE-style rubric) and returns JSON
- **Deterministic citation_integrity** compares model-used citations vs the build-time "full list" citation inventories

All run-spec docs/scripts live under:

- `runspecs/3-STEP-RUN/`

Generated build artifacts (ResearchPacks, EUs, and run outputs) should be written to a configurable output root (defaulting to `datasets/` where appropriate), not committed to the repo.

### 3.3 Required on-disk package layout (Benchmark Structure v2)

Benchmark packet files (shared; exported from runner source-of-truth):

- `benchmark/benchmark.json`
- `benchmark/plan.json`
- `benchmark/model_steps/d1.json`
- `benchmark/model_steps/d2.json`
- `benchmark/model_steps/j3.json`
- `benchmark/judge_prompts/j3.json` (judge rubric for grading BOTH IRACs)

EU packets (built by the EU builder) - do not hand-author an EU in the run-spec directory. For each `eu_id`, the EU builder outputs:

- `eus/{eu_id}/p1.json` (anchor payload; short SCOTUS opinion text)
- `eus/{eu_id}/p2.json` (research pack payload)
- `eus/{eu_id}/ground_truth.json` (runner-only labels + citation inventories)

Output location is configurable (example: `datasets/eus/<benchmark_id>/eus/{eu_id}/...`), but the runner must enforce no-leak via staging (payloads are only visible when admitted).

### 3.4 `plan.json` (3-step version)

Must follow v2 fields: `step_id`, `step_file`, `scoring`, `scorer_ref` or `judge_prompt_file`, `output_contract`, `inject_payloads`.

Recommended injections:

- `d1`: `["p1"]`
- `d2`: `["p1"]`
- `j3`: `["p1","p2"]`

### 3.5 Step specs to follow

- `internal/specs/steps/known_authority.md` (d1)
- `internal/specs/steps/irac_without_rp.md` (d2)
- `internal/specs/steps/irac_with_rp.md` (j3)
- `internal/specs/steps/citation_integrity.md` (deterministic check after IRACs)

Important: both IRAC steps must return JSON that includes an explicit citation list field (e.g. `citations: [...]`).

### 3.6 `ground_truth.json` (what must be in it for this run)

Build-time must write these runner-only lists:

- `anchor_inventory_full`: all unique in-scope citations extracted from the anchor text (the "full list")
- `rp_subset`: the subset of citations shipped in `p2.json` (Top-K authorities)

Also include whatever `d1` needs to score deterministically (OK to hardcode for the 1-EU demo).

### 3.7 Runner execution requirements (behavior)

Runner/orchestrator executes one EU by reading `benchmark/*` + `eus/{eu_id}/*`.

Per step:

- Create `staging/{run_id}/{call_id}/`
- Copy ONLY:
  - current step file (`benchmark/model_steps/<step>.json`)
  - admitted payloads (`eus/{eu_id}/p*.json` per `inject_payloads`)
  - `candidate_state.json`
- Build candidate messages using:
  - step messages
  - FULL anchor text (for this v1 run: resend full anchor every step)
  - `candidate_state.json` (accumulates after each step; no scores)
- Call evaluated model via real API
- Parse + validate against `output_contract`
- Score deterministic steps immediately
- Append a step record to `runs/{run_id}/run.jsonl`
- Append delivery hashes to `runs/{run_id}/audit_log.jsonl` (hash staged bytes + message bytes)
- Emit LangGraph-shaped events to `runs/{run_id}/trace.jsonl`
- Update + save `candidate_state.json` after the step finishes

Judge call (after `j3`):

- Call judge model via real API
- Input: `benchmark/judge_prompts/j3.json` + BOTH IRAC outputs (`d2` + `j3`)
- Output: strict JSON with per-IRAC scores + totals (rubric not finalized; judge instructed to grade using its understanding of the rubric)
- Save a judge record into `run.jsonl` (e.g. step_id `judge_j3`, include `grades_step_ids: ["d2","j3"]`)

Deterministic citation_integrity (after `j3`):

- No model call
- Extract citations from BOTH IRAC outputs using the explicit citations list field
- Compare deterministically against: (source note below)

### 3.8 Outputs (canonical)

- `runs/{run_id}/run.jsonl`
- `runs/{run_id}/audit_log.jsonl`
- `runs/{run_id}/run_manifest.json`
- `runs/{run_id}/summary.json`
- (additional) `runs/{run_id}/trace.jsonl` + `candidate_state.json`

### 3.9 Why this is HAL-compatible later

Later goal: **1 EU = 1 HAL task**.

The Legal-10 runner must be runnable inside a per-task working directory with local files, and must not depend on global paths.

HAL provides: task sandbox, concurrency, logs/results directory.

Runner provides: plan execution, staging/no-leak, state/trace, judge, deterministic scoring.

### 3.10 Source integrity note

The original `0118_issue_define_3steprun_prompt.md` contains a corrupted/garbled line in the citation-integrity section where the exact "compare against ..." targets should be. This file does not attempt to reconstruct that missing text.

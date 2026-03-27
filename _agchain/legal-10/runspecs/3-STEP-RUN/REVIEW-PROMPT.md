# Independent Review Prompt: Legal-10 3-Step MVP Runspec

## Your Task

You are reviewing an implementation of a Legal-10 benchmark evaluation pipeline (the "3-Step MVP"). Your job is to perform a **comprehensive spec-vs-source alignment analysis** — comparing what the specification documents require against what the code actually implements. You should identify every gap, every deviation, and every requirement that is met, partial, or missing.

## Background

Legal-10 is a multi-step evaluation benchmark for legal AI. The 3-step MVP runs a chain of 3 model calls per evaluation unit (EU):
- **d1** (KA-SC): Deterministic known-authority identification
- **d2** (IRAC closed-book): Legal analysis without research pack
- **j3** (IRAC open-book): Legal analysis with research pack

After the 3 steps, there is:
- A **judge call** that grades both IRACs using an MEE rubric
- A **citation integrity** check (deterministic post-chain scorer)

The pipeline has a build-time phase (RP builder → EU builder → benchmark builder) and a run-time phase (the runner).

## Documentation Structure

Specs are organized into concern-based folders under `legal-10/docs/`. Read `docs/_INDEX.md` for the master routing guide. The key folders are:

- `docs/fdq/` — Self-contained Formal Delivery Query specs (one per step)
- `docs/platform/` — Runtime engine specs (staging, state, messages, audit)
- `docs/build-pipeline/` — Build-time pipeline specs (RP, EU, benchmark builders)
- `docs/mvp/` — 3-step MVP specific specs and M1 deliverables

## Files to Examine

### SPECIFICATION DOCUMENTS (the "requirements")

Read ALL of these thoroughly. They define what MUST be implemented:

1. **`docs/mvp/M1-buildtime-packaging-sealing-dev-brief.md`**
   - MOST AUTHORITATIVE document. Overrides others for bundle layout and schemas.
   - Frozen decisions on: bundle structure, EU schema, benchmark schema, sealing (manifest.json + signature.json)

2. **`docs/platform/inter-step-requirements.md`**
   - 95 numbered requirements (IS-1.1.1 through IS-7.3.7)
   - Covers: state management, payload admission, staging/isolation, message assembly, audit, orchestration, post-chain operations
   - This is the densest requirements document.

3. **`docs/platform/pdrunner-inspect-ai.md`**
   - 40 requirements (R1.1 through R8.4)
   - Covers: orchestration, staging, payloads, state, messages, scoring, artifacts, reproducibility

4. **`docs/mvp/run-outputs.md`**
   - Deliverables checklist: what files must exist (checked-in and generated)
   - Data flow diagram: build-time → run-time
   - Dependency order

5. **`docs/mvp/3-step-run-benchmark-structure.md`**
   - 3-step MVP file layout, runner flow, HAL compatibility notes

6. **`docs/platform/statefulness-context-persistence.md`**
   - State providers (Type 0-III), isolation invariant, session strategies (Replay_Full vs Replay_Minimal)

7. **`docs/platform/prompt-messages.md`**
   - Fenced window format (`<<<BEGIN_{NAME}>>>...<<<END_{NAME}>>>`)
   - Window order: ENV → ANCHOR_PACK → EVIDENCE_PACK → CARRY_FORWARD → TASK → OUTPUT_GUARD
   - System message spec

8. **FDQ (Formal Delivery Query) specs:**
   - `docs/fdq/01-ka-sc.md` — d1 KA-SC spec (prompt, output contract, scoring, ground truth SQL)
   - `docs/fdq/09-irac-without-rp.md` — d2/d9 closed-book IRAC spec
   - `docs/fdq/10-irac-with-rp.md` — j3/j10 open-book IRAC spec

9. **Post-chain scoring specs:**
   - `docs/fdq/post/irac-pair-scoring.md` — Step-ID agnostic judge protocol, MEE rubric, output schema
   - `docs/fdq/post/citation_integrity.py.md` — Citation extraction regexes, validity checking, RP usage metrics
   - `docs/fdq/post/judge-evaluation-both-iracs.md` — Earlier judge prompt version (superseded by irac-pair-scoring.md)

10. **Build-time reference implementations:**
    - `docs/build-pipeline/rp-builder-reference.py.md` — RP builder reference code
    - `docs/build-pipeline/eu-builder-reference.py.md` — EU builder reference code

### SOURCE CODE (the "implementation")

Read ALL of these. This is what was actually built:

**Runner (main orchestrator):**
- `legal-10/runspecs/3-STEP-RUN/run_3s.py` — Main runner (~430 LOC)

**Runtime modules:**
- `legal-10/runspecs/3-STEP-RUN/runtime/__init__.py`
- `legal-10/runspecs/3-STEP-RUN/runtime/payload_gate.py` — Payload admission
- `legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py` — Fenced-window message construction
- `legal-10/runspecs/3-STEP-RUN/runtime/staging.py` — Per-step isolation directories
- `legal-10/runspecs/3-STEP-RUN/runtime/audit.py` — SHA-256 hashing + audit logs
- `legal-10/runspecs/3-STEP-RUN/runtime/state.py` — CandidateState with sanitization

**Adapters:**
- `legal-10/runspecs/3-STEP-RUN/adapters/__init__.py`
- `legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py` — OpenAI + Anthropic API adapters

**Scorers:**
- `legal-10/runspecs/3-STEP-RUN/scorers/__init__.py`
- `legal-10/runspecs/3-STEP-RUN/scorers/d1_known_authority_scorer.py` — Deterministic KA-SC scoring
- `legal-10/runspecs/3-STEP-RUN/scorers/citation_integrity.py` — Citation validity + RP usage

**Benchmark builder:**
- `legal-10/runspecs/3-STEP-RUN/benchmark_builder.py` — Generates benchmark packet

**Build-time scripts:**
- `legal-10/scripts/rp_builder.py` — Research Pack builder
- `legal-10/scripts/eu_builder.py` — Evaluation Unit builder

**Generated benchmark packet (inspect these for correctness):**
- `legal-10/runspecs/3-STEP-RUN/benchmark/benchmark.json`
- `legal-10/runspecs/3-STEP-RUN/benchmark/plan.json`
- `legal-10/runspecs/3-STEP-RUN/benchmark/model_steps/d1.json`
- `legal-10/runspecs/3-STEP-RUN/benchmark/model_steps/d2.json`
- `legal-10/runspecs/3-STEP-RUN/benchmark/model_steps/j3.json`
- `legal-10/runspecs/3-STEP-RUN/benchmark/judge_prompts/irac_mee_pair_v1.json`

**Example EU output (inspect for schema correctness):**
- `legal-10/datasets/eus/legal10_3step_v1/eus/eu__1826-018/p1.json`
- `legal-10/datasets/eus/legal10_3step_v1/eus/eu__1826-018/p2.json`
- `legal-10/datasets/eus/legal10_3step_v1/eus/eu__1826-018/ground_truth.json`

**Example run output (from smoke test):**
- `legal-10/runs/` — Look for the most recent `run_*` directory

**Existing assessment (read LAST, for comparison — NOT as ground truth):**
- `legal-10/runspecs/3-STEP-RUN/SPEC-ASSESSMENT.md`

## What to Produce

### 1. Requirements Extraction
For each spec document, extract every numbered or clearly stated requirement. Assign each a unique ID if the doc doesn't have one.

### 2. Traceability Matrix
For every requirement, determine:
- **MET**: Fully implemented and correct
- **PARTIAL**: Addressed but incomplete or slightly wrong
- **MISSING**: Not implemented at all
- **N/A-MVP**: Applies only to 10-step chain, not needed for 3-step MVP

For each, cite the specific file and line number(s) in the source code that implement it (or where it should be implemented).

### 3. Code Quality Issues
Note any:
- Logic bugs (incorrect behavior)
- Schema mismatches (code produces different shape than spec requires)
- Prompt template deviations (code prompt differs from spec prompt)
- Security/isolation violations (data leakage, forbidden keys not stripped)

### 4. Gap Prioritization
Rank all gaps by:
- **Critical**: Blocks correctness or M1 acceptance
- **High**: Spec compliance issue
- **Medium**: Robustness concern
- **Low**: Nice-to-have for MVP

### 5. Comparison with Existing Assessment
After completing your independent analysis, read `SPEC-ASSESSMENT.md` and note:
- Requirements they found that you missed
- Requirements you found that they missed
- Status disagreements (you say MET, they say MISSING, or vice versa)
- Any errors in the existing assessment

## Key Things to Watch For

1. **No-leak rule**: Does ground_truth.json EVER get staged, sent to model, or included in candidate_state? This is the most critical invariant.
2. **Payload admission**: Does each step only see the payloads specified in plan.json `inject_payloads`?
3. **State sanitization**: Are forbidden keys (`ground_truth`, `score`, `judge`, `gt_*`, `rubric*`) stripped before carry-forward?
4. **Prompt fidelity**: Do the prompt templates in `benchmark_builder.py` match the FDQ spec docs exactly?
5. **Judge isolation**: Does the judge call see only the rubric + model outputs, never the candidate transcript or ground truth?
6. **Citation integrity**: Does j3 validity check against `anchor_inventory_full + rp_subset` union (not anchor-only)?
7. **Bundle sealing**: Is manifest.json + signature.json implemented? (Hint: check if it's missing)
8. **Output contracts**: Are step outputs validated against their output_schema before carry-forward?
9. **Determinism**: Are all JSON outputs written with `sort_keys=True`?
10. **Session strategy**: Is `Replay_Minimal` correctly implemented (fresh messages per step, no history accumulation)?

## Output Format

Write your assessment as a markdown document with the structure above. Be exhaustive. Do not skip any requirement from any spec document. If in doubt about whether something is met, investigate the code — don't guess.

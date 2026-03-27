# Legal-10 3-Step MVP: Consolidated Specification and Assessment

**Date:** 2026-02-09
**Scope:** Complete sweep of `legal-10/docs/`, `legal-10/runspecs/3-STEP-RUN/`, `legal-10/runs/run_20260208_080028_154291/`, and `legal-10/scripts/`
**Method:** Full reading of 80+ documents, 13 source files, 6 benchmark configs, and 1 actual run output

---

## Table of Contents

1. [Product Overview: What the 3-Step MVP Is](#1-product-overview)
2. [Package Architecture: RP, EU, and Benchmark](#2-package-architecture)
3. [Build Pipeline: How Packages Are Assembled](#3-build-pipeline)
4. [Runner Semantics: How the Chain Executes](#4-runner-semantics)
5. [Prompt Architecture](#5-prompt-architecture)
6. [Scoring Specifications](#6-scoring-specifications)
7. [Statefulness and Isolation](#7-statefulness-and-isolation)
8. [FDQ Catalog](#8-fdq-catalog)
9. [Implementation Status: What Exists vs. What Is Missing](#9-implementation-status)
10. [Prioritized Development Gaps](#10-prioritized-development-gaps)
11. [Document Authority Hierarchy](#11-document-authority-hierarchy)

---

## 1. Product Overview

### 1.1 What Legal-10 Is

Legal-10 is a chained LLM evaluation benchmark for legal reasoning. The full benchmark has 10 steps testing citation comprehension, hallucination resistance, fact extraction, treatment classification, cross-reference validation, reverse lookup, multi-hop reasoning, and legal synthesis (IRAC writing). The **3-Step MVP** is a vertical slice that exercises the complete pipeline -- build-time artifact production, runtime orchestration, deterministic scoring, judge scoring, and citation integrity checking -- through 3 evaluated-model steps plus 2 post-chain actions.

### 1.2 The 3-Step Chain

| Order | Step ID | Name | What It Does | Scoring |
|-------|---------|------|-------------|---------|
| 1 | `d1` | Known Authority (KA-SC) | Model identifies controlling authority, in-favor/against citations, and most-cited case from a SCOTUS anchor opinion | Deterministic (exact match + F1) |
| 2 | `d2` | IRAC without RP (closed-book) | Model writes a full IRAC analysis using ONLY the anchor text | Judge-scored (deferred) |
| 3 | `j3` | IRAC with RP (open-book) | Model writes a second IRAC with anchor text + Research Pack | Judge-scored (deferred) |
| Post-1 | `judge_j3` | Judge grades both IRACs | Separate judge model scores both d2 and j3 using MEE rubric | MEE 0-6 per I/R/A/C component |
| Post-2 | `d4_citation_integrity` | Citation integrity | Deterministic Python check validating citations against known inventories | Deterministic (no model call) |

### 1.3 Mapping to the Full 10-Step Chain

- `d1` (3-step) = `d1` (10-step): Known Authority
- `d2` (3-step) = `d9` (10-step): IRAC without RP
- `j3` (3-step) = `j10` (10-step): IRAC with RP
- Steps d2-d8 of the 10-step chain (C-NONEXIST, CANARY, FACT-EXTRACT, DISTINGUISH, VALIDATE-AUTH, UNKNOWN-AUTH, TRANSITIVE) are skipped in the MVP but all have complete FDQ specifications.

### 1.4 Two Deliverables

1. **Build-time: A sealed benchmark bundle** -- a directory tree containing the benchmark configuration, EU packets with payloads and ground truth, and cryptographic integrity proofs.
2. **Runtime: Auditable run artifacts** -- per-EU output files produced by the runner after executing the 3-step chain against one or more EUs.

---

## 2. Package Architecture

### 2.1 Research Pack (RP) -- Build-Time Intermediate

RPs are assembled from raw datasets by `rp_builder.py`. They are NOT shipped in the final bundle -- their contents are transformed into EU payloads.

```
datasets/rps/rpv1__<anchor_caseId>/
  payloads/
    d1.json          # Anchor text + citations roster (no authority text)
    d2.json          # Authority texts (SCOTUS syllabi + CAP head matter)
  doc3.json          # Non-model metadata: offsets, labels, SCDB ground truth
  manifest.json      # SHA-256 integrity hashes
```

**Authority selection (K-rule, frozen):**
- SCOTUS: K=10 (top 10 by Fowler `pauth_score`)
- CAP: K=5 (top 5 by PageRank percentile)
- Tie-breaking: lexicographic ascending by citation string

### 2.2 Evaluation Unit (EU) -- Runtime Package

EUs are built from RPs by `eu_builder.py`. Each EU packages one anchor case for evaluation.

```
eus/<eu_id>/
  p1.json            # Anchor payload (candidate-visible)
  p2.json            # Authorities payload (candidate-visible when admitted)
  ground_truth.json  # Runner-only scoring data (NEVER exposed to model)
```

**p1.json (anchor payload):**
- `type: "anchor"`, `payload_id: "p1"`, `candidate_visible: true`
- Content: `caseId`, `usCite`, `caseName`, `term`, full opinion `text` (never trimmed), `char_count`
- Metadata: citations roster (with normalized cites, offsets), SCDB metadata (disposition, partyWinning, Fowler score), `rp_id`

**p2.json (authorities payload):**
- `type: "authorities"`, `payload_id: "p2"`, `candidate_visible: true`
- Content: array of authority objects, each with `authority_id`, `source` (SCOTUS/CAP), cite, `caseName`, `text`, `char_count`, ranking info

**ground_truth.json (runner-only):**
- `anchor_inventory_full`: sorted unique normalized citations from anchor text
- `rp_subset`: sorted unique normalized citations shipped in p2
- `known_authority`: `controlling_authority` (string), `in_favor` (string[]), `against` (string[]), `most_frequent` (string)
- Provenance metadata

### 2.3 Benchmark Packet -- Shared Configuration

```
benchmark/
  benchmark.json                     # Benchmark ID, version, system message
  plan.json                          # Step schedule with payload admission rules
  model_steps/
    d1.json                          # KA-SC prompt template + output schema
    d2.json                          # IRAC closed-book prompt + output schema
    j3.json                          # IRAC open-book prompt + output schema
  judge_prompts/
    irac_mee_pair_v1.json            # MEE rubric for grading both IRACs
```

**plan.json step definitions:**

| Step | inject_payloads | scoring | scorer/judge |
|------|----------------|---------|--------------|
| d1 | `["p1"]` | `deterministic` | `score_d1_known_authority_v1` |
| d2 | `["p1"]` | `judge` | -- |
| j3 | `["p1", "p2"]` | `judge` | `irac_mee_pair_v1.json`, grades `["d2", "j3"]` |

### 2.4 Sealed Bundle (Complete Product)

```
<bundle_root>/
  benchmark/          # Benchmark packet (shared across EUs)
  eus/                # 200 EU directories
    <eu_id>/
      p1.json
      p2.json
      ground_truth.json
  manifest.json       # SHA-256 file inventory
  signature.json      # Ed25519 detached signature
```

The runner MUST verify manifest hashes and signature before executing.

### 2.5 Run Output Artifacts

```
runs/<run_id>/
  run.jsonl             # Append-only: per-step records + judge + citation integrity
  audit_log.jsonl       # SHA-256 hashes of staged files + message bytes per step
  candidate_state.json  # Final sanitized model outputs (no scores, no GT)
  summary.json          # Aggregate scores and chain completion
  run_manifest.json     # Provenance: benchmark/EU IDs, model configs, file hashes
  trace.jsonl           # (recommended) LangGraph-shaped execution events6y6666666555

---

## 3. Build Pipeline

### 3.1 Pipeline Stages

```
Raw Datasets (DuckDB + parquet + jsonl + csv)
  |
  v
Stage 1-3.9: Extract, resolve, rank, label (all COMPLETE)
  |  citation_inventory.parquet (378,938 occurrences)
  |  citation_depth_labels.parquet (323,404 labels)
  |  scotus_citations_ranked.jsonl (21,154 anchors)
  |  cap_citations_ranked.jsonl (10,928 anchors)
  |  casesumm_syllabi.parquet (27,071 syllabi)
  |  cap_head_matter.jsonl (43,043 head matters)
  |  fake_cases.csv (1,000 synthetic citations)
  v
Stage 4A: rp_builder.py -> datasets/rps/rpv1__<caseId>/
  Status: FUNCTIONAL (840 LOC, 100 RPs built)
  |
  v
Stage 4B: eu_builder.py -> datasets/eus/<benchmark_id>/<eu_id>/
  Status: FUNCTIONAL (396 LOC)
  |
  v
Stage 5: benchmark_builder.py -> benchmark/ config files
  Status: FUNCTIONAL (449 LOC, benchmark/ directory exists)
  |
  v
Bundle Sealing: manifest.json + signature.json
  Status: NOT IMPLEMENTED
```

### 3.2 Source Data Scale

| Source | Format | Scale |
|--------|--------|-------|
| DuckDB (`legal10-updates.duckdb`) | Database | 13 tables + 7 views |
| `shepards_edges` | DuckDB table | 5,711,699 rows |
| `cap_cases_meta` | DuckDB table | 855,215 rows |
| `cl_crosswalk` | DuckDB table | 866,618 rows |
| `scdb_cases` | DuckDB table | 29,021 rows |
| `scdb_full_with_text.jsonl` | JSONL | 27,733 SCOTUS opinions (526 MB) |
| `citation_inventory.parquet` | Parquet | 378,938 citation occurrences |
| `citation_depth_labels.parquet` | Parquet | 323,404 DETAILED/PASSING labels |
| Eligible anchors after filtering | -- | 20,402 of 27,733 |

### 3.3 Ground Truth Derivation

**d1 Known Authority ground truth** (computed by `eu_builder.py` via DuckDB SQL):
- `controlling_authority`: highest Fowler `pauth_score` among cited SCOTUS cases; ties broken by occurrences DESC, then lexicographic ASC
- `in_favor`: all cited cases with `shepards_edges.treatment_norm = 'follows'`
- `against`: all cited cases with `treatment_norm IN ('distinguishes', 'questions', 'criticizes', 'overrules', 'limits')`
- `most_frequent`: highest occurrence count in anchor; ties broken by Fowler DESC, then lexicographic ASC

**Anchor inventory** (computed by `eu_builder.py` from `citation_inventory.parquet`):
- All unique `normalized_cite` values for the anchor's `caseId`

**RP subset** (computed by `eu_builder.py` from the built p2):
- All unique `inventory_normalized_cite` values from shipped authorities

---

## 4. Runner Semantics

### 4.1 Execution Flow (per EU)

The runner (`run_3s.py`, 465 lines) performs:

1. **Load**: benchmark.json, plan.json, ground_truth.json
2. **For each step** (d1, d2, j3):
   a. **PayloadGate**: Load only admitted payloads per `inject_payloads`
   b. **Staging**: Create isolated directory, write step def + payloads + candidate_state
   c. **InputAssembler**: Build fenced-window messages
   d. **Audit (pre-call)**: SHA-256 hash all staged files and serialized message bytes
   e. **Model call**: Send messages via adapter (temperature=0.0, max_tokens=4096)
   f. **Parse + validate**: Extract JSON from response (tolerates markdown fences)
   g. **Score (d1 only)**: Deterministic scoring against ground_truth
   h. **State update**: Add sanitized output to CandidateState
   i. **Audit + run records**: Append to audit_log.jsonl and run.jsonl
   j. **Cleanup**: Delete staging directory
3. **Judge call**: Single call grades both d2 and j3 using MEE rubric
4. **Citation integrity**: Deterministic check against inventories
5. **Write outputs**: candidate_state.json, summary.json, run_manifest.json

### 4.2 Session Strategy

**Replay_Minimal (implemented, baseline):** Each step is a fresh API call. No chat history accumulates. Continuity only via candidate_state carry-forward and admitted payloads.

**Replay_Full (specified, not implemented):** Growing message history for the EU duration. Runner ensures unadmitted evidence never appears. Not needed for MVP.

### 4.3 Model Adapters

Two concrete adapters exist and are functional:

| Adapter | Provider | Default Model | Verified By |
|---------|----------|---------------|-------------|
| `OpenAIAdapter` | OpenAI (+ compatible APIs) | `gpt-4o` | Code review |
| `AnthropicAdapter` | Anthropic | `claude-sonnet-4-5-20250929` | Actual run output |

Both support custom model overrides, API keys from env vars, and the standard `call_model(messages, temperature, max_tokens)` interface.

---

## 5. Prompt Architecture

### 5.1 Message Structure

Each step produces a message array with a system message and multiple user messages (fenced windows):

| # | Window | Role | Content |
|---|--------|------|---------|
| 1 | (system) | `system` | Benchmark-level role framing from `benchmark.json` |
| 2 | ENV | `user` | Benchmark name, step_id, open/closed mode, session_cut=true |
| 3 | ANCHOR_PACK | `user` | Case metadata + full opinion text from p1 |
| 4 | EVIDENCE_PACK | `user` | Research pack authorities from p2 (only when admitted) |
| 5 | CARRY_FORWARD | `user` | JSON-serialized candidate state from prior steps |
| 6 | TASK | `user` | Step prompt template with placeholders resolved |
| 7 | OUTPUT_GUARD | `user` | "Respond ONLY with valid JSON matching the schema above" |

Window fencing: `<<<BEGIN_{NAME}>>>` ... `<<<END_{NAME}>>>`

### 5.2 Step Prompts (Implemented)

**d1 (Known Authority):** Asks the model to analyze a SCOTUS opinion and identify: (1) controlling authority by precedential weight, (2) in-favor citations, (3) against citations, (4) most frequently cited case. Output: strict JSON with 4 keys.

**d2 (IRAC Closed-Book):** Instructs the model to produce a complete IRAC using ONLY the anchor case text. Prohibits fabricating authorities not in the opinion. Output: JSON with `issue`, `rule`, `application`, `conclusion`, `citations`.

**j3 (IRAC Open-Book):** Same as d2 but MODE: OPEN-BOOK. Model may cite authorities from the Research Pack. Output: same schema as d2.

**Judge prompt (irac_mee_pair_v1):** MEE bar exam grader rubric. Grades both IRACs in a single call, 0-6 per I/R/A/C component. Closed-book IRAC not penalized for limited citations. Judge does NOT verify citation accuracy.

### 5.3 Placeholder Resolution

Currently supports 5 placeholders: `{anchor_text}`, `{anchor_us_cite}`, `{anchor_case_name}`, `{anchor_term}`, `{research_pack_content}`. Generic `{p1.*}` / `{p2.*}` dot/bracket paths are specified but **not yet implemented**.

---

## 6. Scoring Specifications

### 6.1 d1 -- Deterministic (Known Authority)

Four sub-questions, equally weighted at 0.25 each:

| Sub-question | Method | Ground Truth Source |
|-------------|--------|-------------------|
| `controlling_authority` | Exact match (normalized citation) | Fowler pauth_score ranking with tie-breaks |
| `in_favor` | F1 (precision + recall over citation sets) | `shepards_edges.treatment_norm = 'follows'` |
| `against` | F1 (precision + recall over citation sets) | `treatment_norm IN (distinguishes, questions, criticizes, overrules, limits)` |
| `most_frequent` | Exact match (normalized citation) | Occurrence count with tie-breaks |

**Composite:** `score = mean(4 component scores)`. **Correct threshold:** >= 0.75.

**Citation normalization:** Lowercase, strip punctuation, collapse whitespace. Pin cites normalized to base cites. Reporter scope: U.S. (including nominative forms), F., F.2d, F.3d, F. Supp., F. Supp. 2d, F. Supp. 3d. F.4th explicitly excluded.

### 6.2 d2 + j3 -- Judge-Scored (MEE Rubric)

One judge call grades both IRACs. Four components per IRAC, each 0-6:

| Score | Meaning |
|-------|---------|
| 6 | Exemplary -- complete, precise, demonstrates mastery |
| 5 | Strong -- substantially complete, minor omissions |
| 4 | Adequate -- acceptable, some gaps |
| 3 | Below average -- incomplete, some errors |
| 2 | Weak -- significant gaps or errors |
| 1 | Very weak -- minimal relevant content |
| 0 | Not present or entirely wrong |

**Total per IRAC:** 0-24 raw, normalized to 0.0-1.0. Runner computes totals from judge grades.

**Mode constraints:**
- Closed-book (d2): Judge MUST NOT penalize for limited citation breadth
- Open-book (j3): Judge expects integration of admitted authorities
- Judge does NOT verify citation validity

### 6.3 Citation Integrity -- Deterministic Post-Chain

Extracts citations from both IRAC outputs and validates:
- **d2 (closed-book):** Citations must appear in `anchor_inventory_full`
- **j3 (open-book):** Citations must appear in `anchor_inventory_full UNION rp_subset`

Citation extraction: Primary from explicit `citations` field; fallback regex from IRAC text fields. Uses same multi-regex suite as d1 scorer. Invalid citations are flagged but do NOT void the judge score (v1 baseline).

---

## 7. Statefulness and Isolation

### 7.1 The No-Leak Invariant

The evaluated model MUST NEVER see:
- `ground_truth.json` (always runner-only)
- Judge prompts (never shown to evaluated model)
- Future step files (only current step is staged)
- Unadmitted payloads (p2 not staged for d1 or d2)
- Score data from prior steps
- Judge output
- Other EUs' data

This is enforced **structurally** through the staging directory pattern, not through policy.

### 7.2 Candidate State Sanitization

`CandidateState` (67 lines) carries model-derived artifacts only. Recursive sanitization removes:
- **Forbidden keys (exact):** `ground_truth`, `score`, `scores`, `judge`, `judge_result`, `judge_output`, `correct`, `errors`, `details`
- **Forbidden prefixes:** `gt_`, `rubric`, `scoring_`, `judge_`

### 7.3 Staging Isolation

Per-step:
1. Create `staging/<run_id>/<call_id>/`
2. Write ONLY: step definition, admitted payloads, sanitized candidate_state
3. Build messages from staged content
4. Hash all staged files for audit
5. Delete staging after model call

### 7.4 Audit Trail

Three output streams:
- `audit_log.jsonl`: SHA-256 hashes of staged files, message bytes, response bytes, payload admission flags
- `run.jsonl`: Per-step results (raw output, parsed output, score, model name, timestamps)
- `trace.jsonl`: LangGraph-shaped execution events (recommended, not yet implemented)

---

## 8. FDQ Catalog

### 8.1 All 10 FDQs (Full Chain)

All 10 FDQs have complete specifications. Only 3 are exercised in the MVP.

| Position | FDQ | Family | Scoring | In MVP? |
|----------|-----|--------|---------|---------|
| 1 | KA-SC | Known Authority | Deterministic (F1 + exact match) | YES (d1) |
| 2 | C-NONEXIST1 | Canary (Truthfulness) | Deterministic (classifier) | No |
| 3 | CANARY | Canary (Truthfulness) | Deterministic (classifier) | No |
| 4 | FACT-EXTRACT | Fact Extraction | Deterministic (exact match) | No |
| 5 | DISTINGUISH | Citation Treatment | Deterministic (exact match) | No |
| 6 | VALIDATE-AUTH | Cross-Reference | Deterministic (exact match) | No |
| 7 | UNKNOWN-AUTH | Reverse Citator | Deterministic (MRR) | No |
| 8 | TRANSITIVE | Multi-Hop Reasoning | Deterministic (exact match) | No |
| 9 | IRAC w/o RP | Legal Writing | Judge (MEE rubric) | YES (d2) |
| 10 | IRAC w/ RP | Legal Writing | Judge (MEE rubric) | YES (j3) |

### 8.2 Question Bank Scale

The master QB defines 53 question templates across 12 families:
- **27 fully developed** (frozen algorithms, scoring, worked examples)
- **24 partially developed** (unfrozen policy decisions)
- **2 deferred** (missing data dependencies)

---

## 9. Implementation Status

### 9.1 Source Code Inventory

| File | Lines | Status |
|------|-------|--------|
| `run_3s.py` | 465 | FULLY FUNCTIONAL -- proven by actual run |
| `benchmark_builder.py` | 449 | FULLY FUNCTIONAL -- benchmark/ exists |
| `runtime/audit.py` | 69 | FULLY FUNCTIONAL |
| `runtime/input_assembler.py` | 133 | FULLY FUNCTIONAL |
| `runtime/payload_gate.py` | 30 | FULLY FUNCTIONAL (minimal) |
| `runtime/staging.py` | 56 | FULLY FUNCTIONAL |
| `runtime/state.py` | 67 | FULLY FUNCTIONAL |
| `adapters/model_adapter.py` | 125 | FULLY FUNCTIONAL (OpenAI + Anthropic) |
| `scorers/d1_known_authority_scorer.py` | 254 | FULLY FUNCTIONAL |
| `scorers/citation_integrity.py` | 258 | FULLY FUNCTIONAL |
| `scripts/rp_builder.py` | 840 | FULLY FUNCTIONAL |
| `scripts/eu_builder.py` | 396 | FULLY FUNCTIONAL |

**No stubs or skeletons.** Every source file is a working implementation.

### 9.2 Actual Run Results

One run completed successfully: `run_20260208_080028_154291` using `claude-sonnet-4-5-20250929`.

| Metric | Value | Notes |
|--------|-------|-------|
| d1 (deterministic) | 0.25 | Low due to citation format mismatch (nominative reporter without U.S. prefix) |
| d2 (judge, closed-book) | 21/24 = 0.875 | Strong (Issue=6, Rule=5, App=5, Conc=5) |
| j3 (judge, open-book) | 24/24 = 1.000 | Perfect on all components |
| Citation integrity d2 | 0 valid, 0 invalid | Model omitted `citations` field |
| Citation integrity j3 | 1 valid, 0 invalid | Most citations were out-of-scope reporter formats |

The run validates the complete pipeline works end-to-end. Score issues are data/format alignment problems, not code bugs.

### 9.3 What Is Fully Implemented (MET)

1. Core runner executes all 3 steps per plan.json in sequence
2. Payload admission enforced per step via inject_payloads
3. Staging directory isolation with SHA-256 audit trail
4. Fenced-window message assembly with correct window order
5. Candidate state sanitization (forbidden keys + prefix matching)
6. Deterministic d1 scoring with multi-regex citation normalization
7. Judge IRAC pair grading with MEE rubric
8. Citation integrity with open-book union validity (anchor + RP)
9. Audit log emission with staged file hashes and message hashes
10. Summary and manifest generation
11. Both OpenAI and Anthropic adapters functional
12. RP builder assembles research packs from 7 data sources
13. EU builder computes all ground truth components via DuckDB SQL
14. Benchmark builder materializes all config files

### 9.4 What Is Partially Implemented

1. **Audit purity gap:** Messages built from in-memory dicts rather than re-reading staged files; staging writes JSON without `sort_keys`
2. **Placeholder semantics limited:** Only supports `{anchor_*}` and `{research_pack_content}`; generic `{p1.*}` dot/bracket paths not implemented
3. **Run manifest enrichment:** Code now writes `session_strategy`, `runner_version`, `file_hashes`, `reproducibility_key` but the only existing run predates these additions
4. **Cumulative payload tracker:** PayloadGate does not maintain state across steps (acceptable for 3-step static schedule but not forward-compatible)

### 9.5 What Is Missing

| Gap | Impact | Priority |
|-----|--------|----------|
| **Bundle sealing (manifest.json + signature.json)** | Cannot verify bundle integrity; blocks M1 acceptance | CRITICAL |
| **Runner preflight verification** | Runner does not refuse on tampered bundles | CRITICAL |
| **Only 2 of 200 target EUs built** | Scaling is mechanical once one EU is fully correct | LOW (deferred) |
| **Output contract validation** | Runner parses JSON but does not validate against step `output_schema`; d2 missing `citations` field went undetected | HIGH |
| **Full placeholder resolution** | `{p1.*}` dot/bracket paths not supported; unadmitted-payload-reference error not enforced | HIGH |
| **API retry logic** | No retry with exponential backoff in adapters | MEDIUM |
| **Token/latency tracking** | No `latency_ms`, `tokens_used`, or `cost` fields | MEDIUM |
| **trace.jsonl emission** | No LangGraph-compatible trace events | MEDIUM |
| **Scorer registry** | Runner hard-codes scorer ref string match; not dynamic | MEDIUM |
| **Parallel EU execution** | CLI processes EUs sequentially | MEDIUM |
| **Ed25519 signing implementation** | No signing code exists anywhere | CRITICAL (part of sealing) |
| **Replay_Full session strategy** | Specified but not implemented | LOW (not needed for MVP) |
| **Test suite** | No unit tests for any module | LOW |
| **Synthetic traps / canary tokens** | Not implemented (not needed for 3-step MVP) | LOW |

---

## 10. Prioritized Development Gaps

### 10.1 CRITICAL (Blocks M1 "Sealed Bundle" Acceptance)

**Gap C1: Bundle Sealing**
- Generate `manifest.json` with SHA-256 + byte count for every file in the bundle
- Generate `signature.json` with Ed25519 detached signature over manifest bytes
- This requires an Ed25519 key pair and a signing implementation
- Schema per M1 spec: `protocol_version`, `bundle_id`, `created_at`, `generator_version`, `files[]` array

**Gap C2: Runner Preflight Verification**
- On startup, load manifest.json, verify signature, verify all file hashes
- Refuse to run if any mismatch
- Verify the specific EU's files (at minimum) or all EUs

**Gap C3 (deferred): Scale to 200 EUs**
- Currently only ~2 EUs exist as built artifacts
- Scaling is mechanical once the pipeline is proven correct on a single EU
- Priority: LOW until one EU is fully correct end-to-end (ground truth, scoring, sealed bundle, preflight pass)

### 10.2 HIGH (Correctness and Spec Compliance)

**Gap H1: Output Contract Validation**
- Implement JSON Schema validation of model outputs against each step's `output_schema`
- Reject invalid outputs (assign score 0.0) rather than silently carrying malformed data
- Evidence this matters: the actual run shows d2 omitted the `citations` field without detection

**Gap H2: Full Placeholder Resolution**
- Support `{p1.content.anchor.text}` and `{p2.content.authorities[0].text}` dot/bracket syntax
- Enforce that referencing an unadmitted payload is a runtime error (per IS-2.3.1)

**Gap H3: Audit Purity**
- Build messages from staged file bytes (not in-memory dicts) so audit hashes are proofs of exact model inputs
- Use `sort_keys=True` when writing staged JSON files for deterministic hashing

### 10.3 MEDIUM (Robustness / Forward Compatibility)

- API retry with exponential backoff
- Token/cost accounting in run records
- trace.jsonl emission
- Dynamic scorer registry (replacing hard-coded ref match)
- Parallel EU execution

### 10.4 Known Data Issues

1. **Fake cases collision:** 2 of 1,000 fake citations collide with real SCDB cases. Fix: generate only impossible volumes (600-999). Priority: Low, effort: 5 minutes.
2. **Citation depth labeling:** TF-IDF threshold (0.15) uncalibrated; Factor 2 regex missing some Bluebook signals; window inconsistency (+/-200 vs +200 only). Priority: Medium.
3. **d1 score quality:** Actual run scored 0.25 because model used nominative reporter format ("9 Cranch 87") instead of modern U.S. Reports form ("18 U.S. 293"). The scorer correctly handles this per the normalization rules, but the prompt may need clearer instructions about expected citation format.

---

## 11. Document Authority Hierarchy

When documents conflict, per `legal-10/docs/_INDEX.md`:

1. **HIGHEST:** `mvp/M1-buildtime-packaging-sealing-dev-brief.md` -- bundle layout, schemas, sealing
2. **SECOND:** `platform/inter-step-requirements.md` -- runner semantics (95 numbered requirements IS-1.1.1 through IS-7.3.7)
3. **THIRD:** `fdq/*.md` and `fdq/post/*.md` -- per-step prompts, contracts, scoring
4. **FOURTH:** `irac-pair-scoring.md` is AUTHORITATIVE for judge protocol (supersedes `judge-evaluation-both-iracs.md`)
5. **SUPPLEMENTARY:** Everything in `secondary-reference/`, `steps-reference/`, `-ongoing-work/`

### Known Conflicts Resolved

1. **Sealing format:** M1 requires detached `signature.json`; older doc describes embedded. Resolution: M1 is canonical.
2. **Citation integrity open-book scope:** Older docs imply anchor-only. MVP docs require `anchor_inventory_full UNION rp_subset`. Resolution: union is canonical.
3. **Citation integrity voiding:** Safety design doc says citation fabrication voids the chain. IRAC Scoring Spec v2.0 says v1 baseline logs but does NOT void. Resolution: v1 logs only.

### Stale Documents (Acknowledged)

- `data-pipeline-reference.md` -- marked "MUST BE UPDATED"
- `datasets-implications.md` -- marked "MUST BE UPDATED"
- `eu-builder-reference.py.md` -- "legacy version"
- `sealed-evaluation-units-security.md` -- "we need to update this document"
- `judge-evaluation-both-iracs.md` -- superseded by `irac-pair-scoring.md`

---

## Appendix A: Runtime Component Map

| Concern | Implementation File | Lines | Spec Source |
|---------|-------------------|-------|-------------|
| Orchestration | `runspecs/3-STEP-RUN/run_3s.py` | 465 | IS-6.x, 3-step benchmark structure |
| Payload admission | `runtime/payload_gate.py` | 30 | IS-2.x |
| Message assembly | `runtime/input_assembler.py` | 133 | IS-4.x, prompts-v1.0 |
| Staging isolation | `runtime/staging.py` | 56 | IS-3.1.x |
| State management | `runtime/state.py` | 67 | IS-1.x |
| Audit trail | `runtime/audit.py` | 69 | IS-5.x |
| Model adapters | `adapters/model_adapter.py` | 125 | pdrunner-inspect-ai |
| d1 scorer | `scorers/d1_known_authority_scorer.py` | 254 | FDQ 01-ka-sc |
| Citation integrity | `scorers/citation_integrity.py` | 258 | FDQ post/citation_integrity |
| Benchmark builder | `benchmark_builder.py` | 449 | M1-buildtime spec |
| RP builder | `scripts/rp_builder.py` | 840 | rp-builder-reference |
| EU builder | `scripts/eu_builder.py` | 396 | eu-builder-reference |

## Appendix B: Data Dependency Map

| DuckDB Table/View | Used By |
|-------------------|---------|
| `shepards_edges` (5.7M) | d1 ground truth, FDQs 05/06/07/08 |
| `scdb_cases` (29K) | d1 ground truth, all FDQs |
| `fowler_scores` (28K) | d1 ground truth, authority ranking |
| `scotus_citations_ranked_flat` | d1 ground truth, FDQs 01/05/07 |
| `cap_cases_meta` (855K) | CAP authority resolution |
| `cl_crosswalk` (866K) | Cross-identifier linking |
| `citation_inventory` (parquet, 379K) | Anchor inventory, depth labeling |
| `citation_depth_labels` (parquet, 323K) | Canary ground truth |

---
title: "Specification assessment and traceability"
sidebar:
  order: 3
---

# Legal-10 3-Step MVP: Specification Assessment & Traceability Map

**Date:** 2026-02-08
**Scope:** As-built `runspecs/3-STEP-RUN/` vs. all applicable spec documents
**Purpose:** Exhaustive requirement-by-requirement assessment with gap identification

---

## Legend

| Status | Meaning |
|--------|---------|
| **MET** | Requirement fully implemented and verified |
| **PARTIAL** | Requirement addressed but incomplete |
| **MISSING** | Requirement not yet implemented |
| **N/A-MVP** | Requirement applies only to 10-step chain; not needed for 3-step MVP |

---

## A. BUILD-TIME REQUIREMENTS

### A.1 Bundle Layout
**Source:** M1 Dev Brief (7_milestone-1) frozen decisions; 3-step-run-benchmark-structure.md

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| A.1.1 | Bundle root contains `benchmark/`, `eus/`, `manifest.json`, `signature.json` | M1 Dev Brief §4.1 | **PARTIAL** | `benchmark/` built by `benchmark_builder.py`; `eus/` built by `eu_builder.py` | `manifest.json` and `signature.json` not yet generated at bundle root level |
| A.1.2 | `benchmark/benchmark.json` exists with required schema | M1 Dev Brief §8.4 | **MET** | `benchmark_builder.py` -> `benchmark/benchmark.json` | `system_message` field added (not in M1 schema but needed by runner) |
| A.1.3 | `benchmark/plan.json` exists with required schema | M1 Dev Brief §8.5 | **MET** | `benchmark_builder.py` -> `benchmark/plan.json` | Matches M1 schema exactly including `judge_grades_step_ids` |
| A.1.4 | `benchmark/model_steps/{d1,d2,j3}.json` exist | M1 Dev Brief §8.6 | **MET** | `benchmark_builder.py` generates all three | |
| A.1.5 | `benchmark/judge_prompts/irac_mee_pair_v1.json` exists | M1 Dev Brief §4.1, §8.6 | **MET** | `benchmark_builder.py` generates it | |
| A.1.6 | `eus/<eu_id>/p1.json` per M1 schema | M1 Dev Brief §8.1 | **MET** | `eu_builder.py` generates with correct schema | |
| A.1.7 | `eus/<eu_id>/p2.json` per M1 schema | M1 Dev Brief §8.2 | **MET** | `eu_builder.py` generates with correct schema | |
| A.1.8 | `eus/<eu_id>/ground_truth.json` per M1 schema | M1 Dev Brief §8.3 | **MET** | `eu_builder.py` generates with all required fields | |
| A.1.9 | RP is NOT a separate shipped folder in bundle | M1 Dev Brief §4.1 note | **MET** | RP dir is build-time only; EU has p1/p2/ground_truth | |
| A.1.10 | 200 EUs total | M1 Dev Brief §Goal | **PARTIAL** | `eu_builder.py` supports `--limit 200`; only 2 RPs currently built | Need to run `rp_builder.py --limit 200` then `eu_builder.py` |

### A.2 Sealing (manifest.json + signature.json)
**Source:** M1 Dev Brief §9 (MUST implement; non-negotiable)

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| A.2.1 | `manifest.json` at bundle root: exhaustive inventory of all files | M1 Dev Brief §9.1 | **MISSING** | Not yet implemented | Need to add to `benchmark_builder.py` or a separate `seal_bundle.py` |
| A.2.2 | Each file entry: `path` (relative, `/`), `sha256`, `bytes` | M1 Dev Brief §9.1 | **MISSING** | | |
| A.2.3 | No absolute paths, no `..`, no backslashes in manifest paths | M1 Dev Brief §9.1 | **MISSING** | | |
| A.2.4 | Hash = SHA-256 of raw file bytes (no JSON canonicalization) | M1 Dev Brief §9.1 | **MISSING** | | |
| A.2.5 | Manifest must be deterministic (stable ordering) | M1 Dev Brief §9.1 | **MISSING** | | |
| A.2.6 | Manifest excludes `manifest.json` and `signature.json` | M1 Dev Brief §9.1 | **MISSING** | | |
| A.2.7 | `signature.json`: Ed25519 detached signature over manifest.json bytes | M1 Dev Brief §9.2 | **MISSING** | | Need Ed25519 signing implementation |
| A.2.8 | Signature includes: `algorithm`, `key_id`, `signature` (base64 or hex) | M1 Dev Brief §9.2 | **MISSING** | | |
| A.2.9 | Signing key provided at build time (env var or `--signing-key-file`) | M1 Dev Brief §9.3 | **MISSING** | | |
| A.2.10 | Runner refuses to run if any file differs or signature fails | M1 Dev Brief §9.4 | **MISSING** | Runner has no bundle verification step | |

### A.3 Determinism
**Source:** M1 Dev Brief §4.5

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| A.3.1 | Byte-identical outputs for same CLI args + seed | M1 Dev Brief §4.5 | **PARTIAL** | `eu_builder.py` uses `sort_keys=True`; `rp_builder.py` does NOT use `sort_keys` | Fix `rp_builder.py` to use `sort_keys=True` |
| A.3.2 | All JSON written with stable key ordering | M1 Dev Brief §4.5 | **PARTIAL** | `eu_builder.py` and `benchmark_builder.py` use `sort_keys=True`; `rp_builder.py` does not | Fix `rp_builder.py` |
| A.3.3 | `\n` line endings in all JSON | M1 Dev Brief §4.5 | **MET** | All `_write_json` helpers append `\n` | |

### A.4 Prompt Template Sources
**Source:** M1 Dev Brief §8.6

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| A.4.1 | d1 prompt from `fdq-01-ka-sc.md` | M1 Dev Brief §8.6 | **MET** | `benchmark_builder.py` D1_PROMPT_TEMPLATE matches §2 exactly | |
| A.4.2 | d2 prompt from `fdq-09-irac without rp.md` (remove dependency placeholders) | M1 Dev Brief §8.6 | **MET** | `benchmark_builder.py` D2_PROMPT_TEMPLATE uses fdq-09 opening, no dependency placeholders | |
| A.4.3 | j3 prompt from `fdq-10-irac with rp.md` (remove dependency placeholders) | M1 Dev Brief §8.6 | **MET** | `benchmark_builder.py` J3_PROMPT_TEMPLATE uses fdq-10 opening, dependency placeholders removed | |
| A.4.4 | Judge prompt from `irac pair scoring.md` (step-ID agnostic) | M1 Dev Brief §8.6; irac pair scoring.md | **MET** | `benchmark_builder.py` uses `{STEP_IRAC_CLOSED_ID}/{STEP_IRAC_OPEN_ID}` placeholders | |

---

## B. RUNTIME REQUIREMENTS

### B.1 State Management (CandidateState)
**Source:** inter-step requirements §1; statefulness-context-persistence.md §2-3; pdrunner.md R4.x

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.1.1 | `candidate_state.json` carries model-derived artifacts between steps | IS-1.1.1 | **MET** | `runtime/state.py` CandidateState class | |
| B.1.2 | State keyed by step_id: `{d1: {...}, d2: {...}}` | IS-1.1.2 | **MET** | `CandidateState.update(step_id, output)` | |
| B.1.3 | State accumulates: each step adds, never removes | IS-1.1.3 | **MET** | `_data[step_id] = sanitized_output` (additive) | |
| B.1.4 | State is JSON-serializable | IS-1.1.4 | **MET** | JSON save/load in CandidateState | |
| B.1.5 | NEVER include ground_truth in candidate_state | IS-1.2.1 | **MET** | `_FORBIDDEN_KEYS` includes `ground_truth` | |
| B.1.6 | NEVER include scores/scoring_details | IS-1.2.2 | **MET** | `_FORBIDDEN_KEYS` includes `score`, `scores` | |
| B.1.7 | NEVER include judge outputs | IS-1.2.3 | **MET** | `_FORBIDDEN_KEYS` includes `judge`, `judge_result`, `judge_output` | |
| B.1.8 | NEVER include runner internal bookkeeping | IS-1.2.4 | **PARTIAL** | Forbidden keys list exists but doesn't cover all bookkeeping keys (e.g., `errors`, `details`) | `errors` and `details` ARE in forbidden list; consider adding `latency_ms`, `tokens_used` |
| B.1.9 | Strip keys containing: `ground_truth`, `score`, `judge`, `gt_`, `rubric` | IS-1.2.5 | **MET** | Exact-match + prefix matching via `_FORBIDDEN_PREFIXES = ("gt_", "rubric", "scoring_", "judge_")` | Fixed 2026-02-08 |
| B.1.10 | Validate output against step's output_contract before carry-forward | IS-1.3.2 | **MISSING** | Runner does JSON parsing but no contract validation | Need `validate_contracts.py` or inline validation |
| B.1.11 | Extract only contract-defined fields for carry-forward | IS-1.3.3 | **MISSING** | Currently carries entire parsed output (minus forbidden keys) | Could filter to only `output_schema` fields |
| B.1.12 | Per-EU scope: no cross-EU state leakage | IS-6.4.3; SCP-2.1 | **MET** | Each EU gets fresh `CandidateState()` in `run_single_eu` | |

### B.2 Payload Admission Control (PayloadGate)
**Source:** inter-step requirements §2; statefulness-context-persistence.md §2.2; pdrunner.md R3.x

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.2.1 | `inject_payloads` array in plan.json controls admission | IS-2.1.1; R3.1 | **MET** | `payload_gate.py` reads `step["inject_payloads"]` | |
| B.2.2 | Payloads are cumulative: once admitted, remain visible | IS-2.1.2 | **PARTIAL** | PayloadGate re-reads from disk per step; doesn't track cumulative set | Not currently an issue for 3-step (d1/d2 only need p1; j3 needs p1+p2) but doesn't enforce cumulative rule |
| B.2.3 | Payload path resolution: `eus/{eu_id}/{payload_id}.json` | IS-2.2.1; R3.4 | **MET** | `eu_dir / f"{payload_id}.json"` | |
| B.2.4 | Support placeholder syntax: `{p1}`, `{p1.anchor.text}` | IS-2.2.2; R3.2 | **MISSING** | InputAssembler resolves step-template placeholders, NOT payload dot-path placeholders | Need deep path resolution if prompts reference `{p1.content.anchor.text}` |
| B.2.5 | Reference to unadmitted payload = runtime error | IS-2.3.1; R3.3 | **MET** | `get_admitted_payloads` raises `FileNotFoundError` if payload missing | |
| B.2.6 | Track admitted_payloads set per run (cumulative) | IS-2.3.2 | **MISSING** | No cumulative tracking; each step independently resolves | Add cumulative tracking for audit proof |
| B.2.7 | Validate placeholder references against admitted set | IS-2.3.3 | **MISSING** | No placeholder validation | |

### B.3 Staging & Isolation
**Source:** inter-step requirements §3.1; statefulness-context-persistence.md §2.2-2.3; pdrunner.md R2.x

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.3.1 | Create staging directory: `staging/{run_id}/{call_id}/` | IS-3.1.1; R2.1 | **MET** | `staging.py` `create_staging()` | |
| B.3.2 | Copy current step file to staging | IS-3.1.2; R2.2 | **MET** | `stage_files()` writes step.json | |
| B.3.3 | Copy ONLY admitted payloads to staging | IS-3.1.3; R2.2 | **MET** | `stage_files()` only writes payloads from `get_admitted_payloads` | |
| B.3.4 | Copy sanitized candidate_state.json to staging | IS-3.1.4 | **MET** | `stage_files()` writes candidate_state.json | |
| B.3.5 | Hash all staged files for audit | IS-3.1.5 | **MET** | `run_3s.py` hashes all staged paths | |
| B.3.6 | Assemble messages from staged files only | IS-3.1.6 | **PARTIAL** | Messages assembled from `payloads` dict (from PayloadGate), not re-read from staged copies | Messages should be built from staged bytes for audit purity |
| B.3.7 | Hash final message bytes for audit | IS-3.1.7 | **MET** | `msg_hash = hash_bytes(msg_bytes)` | |
| B.3.8 | Physical isolation: candidate NEVER sees ground_truth, judge_prompts, future steps, unadmitted payloads | R2.3; SCP-2.3 | **MET** | Ground truth loaded separately; staging only contains step + admitted payloads + state | |
| B.3.9 | Delete staging after each call completes | IS-3.2.8; R2.4 | **MET** | `cleanup_staging(staging_dir)` | |

### B.4 Message Assembly (InputAssembler)
**Source:** inter-step requirements §4; statefulness-context-persistence.md §2.2; prompt-messages.md; pdrunner.md R5.x

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.4.1 | Use fenced windows: `<<<BEGIN_{NAME}>>>...<<<END_{NAME}>>>` | IS-4.1.1; R5.1; SCP-2.2-Window-2 | **MET** | `input_assembler.py` `_fence()` function | |
| B.4.2 | Each window is a separate user message | IS-4.1.2; SCP-2.2-Window-1 | **MET** | Each window appended as separate `{"role": "user", ...}` | |
| B.4.3 | Windows assembled in fixed order: ENV, ANCHOR_PACK, EVIDENCE_PACK, CARRY_FORWARD, TASK, OUTPUT_GUARD | IS-4.2; R5.2 | **MET** | `build_messages()` follows this exact order | |
| B.4.4 | System message is fixed per benchmark (role: system) | prompt-messages.md PM-1; SCP-4.2-Const-1 | **MET** | System message from `benchmark.json` passed to `build_messages()` | |
| B.4.5 | ENV window includes step metadata | IS-4.2 Window 1 | **MET** | ENV includes benchmark, step_id, mode, session_cut | |
| B.4.6 | ANCHOR_PACK from p1 when admitted | IS-4.2 Window 2 | **MET** | `_format_anchor_pack(p1)` when p1 in payloads | |
| B.4.7 | EVIDENCE_PACK from p2 when admitted | IS-4.2 Window 3 | **MET** | `_format_evidence_pack(p2)` when p2 in payloads | |
| B.4.8 | CARRY_FORWARD from candidate_state when non-empty | IS-4.2 Window 4 | **MET** | `_format_carry_forward(state)` when state non-empty | |
| B.4.9 | TASK from step prompt template with resolved placeholders | IS-4.2 Window 5 | **MET** | `_resolve_placeholders(template, p1, p2)` | |
| B.4.10 | OUTPUT_GUARD enforces response format | IS-4.2 Window 6 | **MET** | OUTPUT_GUARD window with "Return ONLY JSON" instruction | |
| B.4.11 | Never truncate OUTPUT_GUARD window | IS-4.4.1 | **MET** | No truncation implemented (windows always sent in full) | If context limits become an issue, need truncation logic that preserves OUTPUT_GUARD |
| B.4.12 | Truncation events recorded in audit_log | IS-4.4.4 | **N/A-MVP** | No truncation implemented | |

### B.5 Session Strategy
**Source:** inter-step requirements §4.3; statefulness-context-persistence.md §4

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.5.1 | Replay_Minimal is baseline implementation | IS-4.3.3; SCP-4.2-Mech | **MET** | `run_3s.py` creates fresh messages per step (hard cut) | |
| B.5.2 | Support Replay_Full (growing history) | IS-4.3.1 | **N/A-MVP** | Not implemented; not needed for 3-step MVP baseline | |
| B.5.3 | Session strategy recorded in run_manifest.json | IS-4.3.5; SCP-4.4-Decision-2 | **MISSING** | `run_manifest.json` does not include `session_strategy` field | Quick fix: add field |
| B.5.4 | Both strategies yield identical audit proofs | IS-4.3.4; SCP-4.3-Verify | **N/A-MVP** | Only Replay_Minimal implemented | |

### B.6 Scoring
**Source:** inter-step requirements §3.2; irac pair scoring.md; fdq-01-ka-sc.md §7; pdrunner.md R6.x

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.6.1 | Two scoring modes: deterministic + judge | R6.1 | **MET** | d1 uses deterministic scorer; d2+j3 use judge | |
| B.6.2 | d1 KA-SC: 4 sub-questions, 0.25 weight each | fdq-01-ka-sc.md §7 | **MET** | `d1_known_authority_scorer.py` implements exact weights and metrics | |
| B.6.3 | d1 scoring: exact match for controlling_authority, most_frequent; F1 for in_favor, against | fdq-01-ka-sc.md §7.2 | **MET** | `score_exact_match()` and `score_f1()` implemented | |
| B.6.4 | d1 tie-break order: fowler DESC, occurrences DESC, cited_usCite ASC | fdq-01-ka-sc.md §5.1 | **MET** | Ground truth computed in `eu_builder.py` using correct SQL | |
| B.6.5 | Pin cite normalization: strip to base cite | fdq-01-ka-sc.md §8 | **PARTIAL** | `d1_known_authority_scorer.py` has `normalize_cite()` but may not handle all pin cite forms | Review edge cases |
| B.6.6 | Judge model is separate from eval model | IS-3.3.1 | **MET** | `run_3s.py` supports `--judge-provider` and `--judge-model` | |
| B.6.7 | Judge sees ONLY rubric + model outputs being graded | IS-3.3.2; R6.4 | **MET** | `run_judge_call()` sends only judge prompt + IRAC outputs | |
| B.6.8 | Judge does NOT see candidate transcript or ground_truth | IS-3.3.3 | **MET** | Judge call constructed independently of candidate messages | |
| B.6.9 | Judge output: `schema_version: "irac_mee_pair_v1"`, `grades` dict keyed by step IDs | irac pair scoring.md §4 | **MET** | `benchmark_builder.py` judge prompt uses `{STEP_IRAC_CLOSED_ID}/{STEP_IRAC_OPEN_ID}` | |
| B.6.10 | Runner computes `total_raw` and `total_normalized` (not judge) | irac pair scoring.md §5 | **MET** | `run_judge_call()` computes in `computed` dict | |
| B.6.11 | Judge failure: treat as failed for that EU | irac pair scoring.md §5 | **PARTIAL** | Runner logs WARNING but doesn't explicitly mark EU as judge-failed | Need explicit failure handling |
| B.6.12 | Score after EVERY step, record immediately | IS-3.2.4-5; R6.3 | **PARTIAL** | d1 scored immediately; d2/j3 scored post-chain by judge | Judge scoring is post-chain by design (grades both at once); d2 has no immediate score |
| B.6.13 | Scorer registry resolves `scorer_ref` IDs | R6.2 | **MISSING** | No registry; d1 scorer called directly by name | Need registry mapping `scorer_ref` -> function |
| B.6.14 | Citation integrity: inventory-based + authenticity gate | R6.5 | **MET** | `citation_integrity.py` checks anchor_inventory + rp_subset | |

### B.7 Post-Chain Operations
**Source:** inter-step requirements §7; irac pair scoring.md; 3-step-run-benchmark-structure.md

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.7.1 | Run citation_integrity after final step | IS-7.1.1 | **MET** | `run_3s.py` calls `score_citation_integrity()` after j3 | |
| B.7.2 | Citation integrity: check inventory (all cited cases in ground_truth?) | IS-7.1.2 | **MET** | `_validity()` checks against `anchor_inventory_full` | |
| B.7.3 | Citation integrity: check authenticity (any fabricated?) | IS-7.1.3 | **MET** | Invalid citations = not in inventory = potentially fabricated | |
| B.7.4 | Citation integrity result appended to run.jsonl | IS-7.1.4 | **MET** | `emit_run_record(run_log, {..., "type": "deterministic_post"})` | |
| B.7.5 | Judge record in run.jsonl has correct shape | irac pair scoring.md §6 | **MET** | Record has `step_id: "judge_irac_pair"`, `grades_step_ids`, `parsed`, `computed` | |
| B.7.6 | Judge record MUST NOT be written to candidate_state.json | irac pair scoring.md §6 note | **MET** | Judge result is not added to CandidateState | |
| B.7.7 | Compute aggregate score (arithmetic mean) | IS-7.2.2 | **MISSING** | `summary.json` stores individual scores but no aggregate | Add `aggregate_score` field |
| B.7.8 | Record chain_completion status | IS-7.2.3 | **MISSING** | summary.json has no explicit `chain_completion` field | Add field |
| B.7.9 | Record integrity_check results in summary | IS-7.2.4 | **MET** | `summary.json` includes `citation_integrity` section | |
| B.7.10 | Record total_latency_ms and total_tokens | IS-7.2.5; IS-5.3.5 | **MISSING** | No latency/token tracking in runner | Add timing + token counting |

### B.8 Audit & Observability
**Source:** inter-step requirements §5; statefulness-context-persistence.md §4.4; pdrunner.md R7.x

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.8.1 | `audit_log.jsonl`: one record per step boundary | IS-5.1.1 | **MET** | `emit_audit_record()` called per step | |
| B.8.2 | Record staged file hashes (SHA-256) | IS-5.1.2 | **MET** | `staged_files: {name: hash}` in audit record | |
| B.8.3 | Record final message hash | IS-5.1.3 | **MET** | `message_hash` in audit record | |
| B.8.4 | Record `ground_truth_accessed: false` for candidate steps | IS-5.1.4 | **MISSING** | Audit record does not include `ground_truth_accessed` field | Quick fix: add field |
| B.8.5 | Audit record schema: run_id, call_id, step_id, timestamp, staged_files, message_hash, message_byte_count, ground_truth_accessed, judge_prompts_accessed, payloads_admitted | IS-5.2 | **PARTIAL** | Missing: `message_byte_count`, `ground_truth_accessed`, `judge_prompts_accessed`, `payloads_admitted` | Add missing fields |
| B.8.6 | `run.jsonl`: append-only per-step records | IS-5.3.1; R7.1 | **MET** | Records appended per step + judge + citation_integrity | |
| B.8.7 | run.jsonl records: raw_output, parsed, validation result, score, scoring_details | IS-5.3.2-4 | **PARTIAL** | Has raw_response_length and parsed; missing explicit validation_result and scoring_details | Add validation_result field |
| B.8.8 | run.jsonl records: latency_ms and tokens_used | IS-5.3.5 | **MISSING** | No timing or token tracking | |
| B.8.9 | `trace.jsonl`: LangGraph-compatible events | IS-5.4.1-4; R7.5 | **MISSING** | Not implemented | Lower priority for MVP |
| B.8.10 | Trace is write-only, never affects execution | IS-5.4.5 | **N/A-MVP** | No trace implemented | |
| B.8.11 | `run_manifest.json` records provenance | R7.3 | **PARTIAL** | Has run_id, eu_id, models, step_count | Missing: runner_version, session_strategy, file_hashes, reproducibility_key |
| B.8.12 | `summary.json` with deterministic rollups | R7.4 | **MET** | Generated with scores per step | |

### B.9 Orchestration Control Flow
**Source:** inter-step requirements §6; pdrunner.md R1.x

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.9.1 | Execute steps in plan.json array order | IS-6.1.1; R1.2 | **MET** | `for step in plan["steps"]` iterates in array order | |
| B.9.2 | Each step is blocking: N completes before N+1 starts | IS-6.1.4 | **MET** | Sequential execution in `run_single_eu` | |
| B.9.3 | Generate unique run_id at start | IS-6.3.1 | **MET** | `run_id = f"run_{timestamp}_{uuid}"` | |
| B.9.4 | Generate unique call_id per step | IS-6.3.2 | **MET** | `call_id = f"{step_id}_{uuid}"` | |
| B.9.5 | Initialize empty candidate_state at start | IS-6.3.3 | **MET** | `state = CandidateState()` | |
| B.9.6 | Write run_manifest.json at end | IS-6.3.4 | **MET** | Written at end of `run_single_eu` | |
| B.9.7 | Write summary.json at end | IS-6.3.5 | **MET** | Written at end of `run_single_eu` | |
| B.9.8 | Finalize candidate_state.json at end | IS-6.3.6 | **MET** | `state.save()` at end | |
| B.9.9 | Validation failure = step score of 0, chain continues | IS-6.2.1 | **MISSING** | No explicit score-of-0 on parse failure; chain continues but with `_parse_error` flag | Need explicit 0-score assignment on validation failure |
| B.9.10 | Model API error = retry per adapter config | IS-6.2.2 | **MISSING** | No retry logic in adapters | Add retry with backoff |
| B.9.11 | Steps within EU are strictly sequential | IS-6.4.1 | **MET** | Sequential loop | |
| B.9.12 | Multiple EUs may run in parallel | IS-6.4.2 | **MISSING** | CLI processes EUs sequentially | Could add `--parallel N` flag |

### B.10 Reproducibility
**Source:** pdrunner.md R8.x

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| B.10.1 | No runtime retrieval: sealed evidence only | R8.1 | **MET** | All data from local EU files | |
| B.10.2 | Deterministic scoring reproducible given identical inputs | R8.2 | **MET** | d1 scorer and citation_integrity are deterministic | |
| B.10.3 | SHA-256 hashing for audit | R8.3 | **MET** | `audit.py` uses SHA-256 | |
| B.10.4 | Fixed RNG seeds for synthetic traps | R8.4 | **N/A-MVP** | No synthetic traps in 3-step MVP | |

---

## C. SCORING & FDQ REQUIREMENTS

### C.1 d1 (KA-SC) — Known Authority
**Source:** fdq-01-ka-sc.md (identical in 10-step and MVP)

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| C.1.1 | 4 sub-questions: controlling_authority, in_favor, against, most_frequent | §2 | **MET** | Prompt template in `benchmark_builder.py` | |
| C.1.2 | Output contract: JSON with exact 4 keys | §6 | **MET** | `output_schema` in d1.json | |
| C.1.3 | Scoring weights: all 0.25 | §7.1 | **MET** | `d1_known_authority_scorer.py` | |
| C.1.4 | controlling_authority: exact match | §7.2 | **MET** | `score_exact_match()` | |
| C.1.5 | in_favor: F1 score | §7.2 | **MET** | `score_f1()` | |
| C.1.6 | against: F1 score | §7.2 | **MET** | `score_f1()` | |
| C.1.7 | most_frequent: exact match | §7.2 | **MET** | `score_exact_match()` | |
| C.1.8 | Ground truth SQL: controlling = fowler DESC, occurrences DESC, cited_usCite ASC LIMIT 1 | §5.1 | **MET** | `eu_builder.py` `_SQL_CONTROLLING` | |
| C.1.9 | Ground truth SQL: in_favor = treatment_norm = 'follows' | §5.2 | **MET** | `eu_builder.py` `_SQL_IN_FAVOR` | |
| C.1.10 | Ground truth SQL: against = 5 specific treatment_norm values | §5.3 | **MET** | `eu_builder.py` `_SQL_AGAINST` | |
| C.1.11 | Ground truth SQL: most_frequent = occurrences DESC, fowler DESC, cited_usCite ASC LIMIT 1 | §5.4 | **MET** | `eu_builder.py` `_SQL_MOST_FREQUENT` | |
| C.1.12 | Null handling: fowler IS NULL excluded from controlling; treatment IS NULL excluded from favor/against; occurrences IS NULL excluded from most_frequent | §3 | **MET** | SQL WHERE clauses handle nulls | |

### C.2 d2 (IRAC Closed-Book) and j3 (IRAC Open-Book)
**Source:** fdq-09-irac-without-rp.md; fdq-10-irac-with-rp.md; MVP versions fdq-02/fdq-03

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| C.2.1 | d2 MODE: CLOSED-BOOK (anchor only, no RP) | fdq-09 §2 | **MET** | d2 prompt includes "MODE: CLOSED-BOOK" | |
| C.2.2 | j3 MODE: OPEN-BOOK (anchor + research pack) | fdq-10 §2 | **MET** | j3 prompt includes "MODE: OPEN-BOOK" | |
| C.2.3 | Output contract: `{issue, rule, application, conclusion, citations}` | fdq-09 §6; fdq-10 §6 | **MET** | Both d2.json and j3.json have correct output_schema | |
| C.2.4 | No extra keys, no markdown fences | fdq-09 §6; fdq-10 §6 | **MET** | Prompt includes "No extra keys. No markdown code fences." | |
| C.2.5 | j3 requires p2 admission (runner-controlled) | fdq-10 §4 | **MET** | plan.json j3 has `inject_payloads: ["p1", "p2"]` | |
| C.2.6 | j3 has additional upstream artifact requirements (d_extraction, d_authority) in 10-step | fdq-10 §3 | **N/A-MVP** | 3-step MVP removes these dependency placeholders per M1 doc | |

### C.3 IRAC Pair Scoring (Judge)
**Source:** irac pair scoring.md

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| C.3.1 | Each EU produces exactly two IRAC outputs (closed + open) | §1 | **MET** | d2 + j3 outputs | |
| C.3.2 | Mode determined by payload admission, not inference | §2 | **MET** | plan.json controls payload admission | |
| C.3.3 | After last IRAC: runner disconnects eval model, calls judge ONCE | §3 | **MET** | `run_judge_call()` is separate from eval calls | |
| C.3.4 | Judge grades BOTH IRACs in same call | §3 | **MET** | Both d2 and j3 outputs passed to judge prompt | |
| C.3.5 | MEE rubric: 0-6 per component (Issue/Rule/Application/Conclusion) | §3 rubric | **MET** | Rubric in judge prompt template | |
| C.3.6 | Judge output schema: `irac_mee_pair_v1` with `grades` dict keyed by step IDs | §4 | **MET** | Judge prompt uses `{STEP_IRAC_CLOSED_ID}/{STEP_IRAC_OPEN_ID}` | |
| C.3.7 | Scores MUST be integers 0-6 | §4 | **MET** | Specified in judge prompt; output_schema has min/max | |
| C.3.8 | Runner computes total_raw and total_normalized | §5 | **MET** | `run_judge_call()` computes in `computed` dict | |
| C.3.9 | Step-ID agnostic: works for d2/j3 (3-step) and d9/j10 (10-step) | §1 note | **MET** | Placeholders `{STEP_IRAC_CLOSED_ID}/{STEP_IRAC_OPEN_ID}` resolved at runtime | |

### C.4 Citation Integrity
**Source:** citation_integrity.py.md; post_citation_integrity.py.md

| # | Requirement | Source | Status | Implementation | Gap |
|---|---|---|---|---|---|
| C.4.1 | Step-ID agnostic params with back-compat aliases | citation_integrity.py.md signature | **MET** | `irac_d9/irac_j10` primary + `irac_no_rp/irac_with_rp` aliases | |
| C.4.2 | Regex extraction: U.S., nominative U.S., F.2d/3d, F.Supp, F. plain | citation_integrity.py.md patterns | **MET** | All 5 regex patterns implemented | |
| C.4.3 | Nominative extracted before plain U.S. (avoid mis-parse) | citation_integrity.py.md §82-93 | **MET** | Nominative loop runs first with overlap check | |
| C.4.4 | Deduplication preserves order | citation_integrity.py.md `_dedupe_preserve_order` | **MET** | Implemented identically | |
| C.4.5 | Primary extraction from `citations` field; fallback to text fields | citation_integrity.py.md `_extract_citations_list` | **MET** | Primary/fallback logic implemented | |
| C.4.6 | d2 validity: citations must be in anchor_inventory_full | fdq-09 §7.4 | **MET** | `_validity(used, anchor_inventory_full)` | |
| C.4.7 | j3 validity: citations may be in anchor_inventory OR rp_subset | fdq-10 §7.4 | **MET** | `_validity(used_j10, anchor_inventory_full + rp_subset)` checks union of both inventories | Fixed 2026-02-08 |
| C.4.8 | RP usage metrics: which j3 citations come from RP | citation_integrity.py.md `_rp_usage` | **MET** | `_rp_usage(citations_used_j10, rp_subset)` | |
| C.4.9 | Does NOT void the score; produces separate metrics | fdq-09 §7.4; fdq-10 §7.4 | **MET** | Results stored separately, don't affect judge scores | |

---

## D. CROSS-CUTTING CONCERNS

### D.1 10-Step Forward Compatibility
**Source:** All FDQ docs

| # | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| D.1.1 | Scorers are step-ID agnostic | irac pair scoring.md | **MET** | Uses placeholder step IDs |
| D.1.2 | Citation integrity uses d9/j10 params with back-compat | citation_integrity.py.md | **MET** | Dual param support |
| D.1.3 | Judge prompt uses `{STEP_IRAC_CLOSED_ID}/{STEP_IRAC_OPEN_ID}` | irac pair scoring.md | **MET** | Not hardcoded to d2/j3 |
| D.1.4 | Plan.json is extensible to N steps | 3-step-run-benchmark-structure.md | **MET** | Array of step objects |

### D.2 HAL Compatibility (Forward-Looking)
**Source:** 3-step-run-benchmark-structure.md

| # | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| D.2.1 | Runner must be runnable in per-task working directory | 3-step structure §HAL | **PARTIAL** | Runner uses relative paths but has `.env` loading from repo root | Make path configurable |
| D.2.2 | Must NOT depend on global paths | 3-step structure §HAL | **PARTIAL** | `.env` loading uses `_REPO_ROOT` traversal | Needs env-var fallback |

### D.3 Missing Deliverables (from run-outputs.md)
**Source:** run-outputs.md deliverables table

| # | Deliverable | Status | Notes |
|---|---|---|---|
| D.3.1 | `contracts/` module with schema definitions | **MISSING** | No formal JSON schema validation module |
| D.3.2 | `validate_contracts.py` centralized validator | **MISSING** | No contract validation |
| D.3.3 | `tests/test_citation_integrity.py` | **MISSING** | Tests exist in `legal-10/tests/` but not in runspec dir |
| D.3.4 | `tests/test_contract_validation.py` | **MISSING** | Not implemented |
| D.3.5 | `tests/test_staging_no_leak.py` | **MISSING** | Not implemented |
| D.3.6 | `trace.jsonl` emission | **MISSING** | No trace events emitted |

---

## E. GAP SUMMARY (Priority-Ordered)

### Critical (Blocks M1 Acceptance)

| # | Gap | Effort | Action |
|---|---|---|---|
| E.1 | Bundle sealing: manifest.json + signature.json | Medium | Implement `seal_bundle.py` with SHA-256 manifest + Ed25519 signing |
| E.2 | 200 EUs: only 2 RPs currently built | Low | Run `rp_builder.py --limit 200` then `eu_builder.py --rp-root` |
| E.3 | ~~`rp_builder.py` does not use `sort_keys=True`~~ | Low | **RESOLVED** — `sort_keys=True` added to `write_json()` |
| E.4 | Runner bundle verification on startup | Low | Add manifest hash check before running |

### High (Spec Compliance)

| # | Gap | Effort | Action |
|---|---|---|---|
| E.5 | ~~Audit record missing fields~~ | Low | **RESOLVED** — `payloads_admitted`, `message_byte_count`, `ground_truth_accessed`, `judge_prompts_accessed` added to `emit_audit_record()` and caller |
| E.6 | ~~run_manifest.json missing fields~~ | Low | **RESOLVED** — `session_strategy`, `runner_version`, `file_hashes`, `reproducibility_key` added |
| E.7 | ~~Citation integrity bug: j3 validity checks anchor-only~~ | Low | **RESOLVED** — j10 validity now checks `anchor_inventory_full + rp_subset` union; verified with test |
| E.8 | Output contract validation missing | Medium | Add JSON schema validation for step outputs |
| E.9 | ~~Validation failure should assign score=0~~ | Low | **RESOLVED** — `run_3s.py` now assigns `score=0.0` with `parse_error=True` on JSON parse failure |
| E.10 | ~~summary.json missing: `aggregate_score`, `chain_completion`~~ | Low | **RESOLVED** — Both fields added; `aggregate_score` = mean of d1 + judge normalized scores; `chain_completion` tracks step success |

### Medium (Robustness)

| # | Gap | Effort | Action |
|---|---|---|---|
| E.11 | No API retry logic in adapters | Low | Add retry with exponential backoff |
| E.12 | ~~State sanitization: no substring matching for `gt_*`, `rubric*`~~ | Low | **RESOLVED** — `_FORBIDDEN_PREFIXES = ("gt_", "rubric", "scoring_", "judge_")` added with `_is_forbidden()` check |
| E.13 | Cumulative payload tracking for audit | Low | Track `admitted_payloads_cumulative` set |
| E.14 | Latency/token tracking | Medium | Add timing + token counting per call |
| E.15 | Messages should be assembled from staged bytes (not from in-memory payloads) | Medium | Re-read from staging for audit purity |

### Low Priority (Nice-to-Have for MVP)

| # | Gap | Effort | Action |
|---|---|---|---|
| E.16 | `trace.jsonl` LangGraph events | Medium | Implement trace emission |
| E.17 | `contracts/` formal schema module | Medium | JSON Schema definitions |
| E.18 | Test suite in runspec dir | Medium | Port existing tests + add new |
| E.19 | Parallel EU execution | Low | Add `--parallel N` to runner |
| E.20 | Scorer registry for `scorer_ref` resolution | Low | Map scorer_ref -> function |
| E.21 | Replay_Full session strategy | Medium | Not needed for MVP |
| E.22 | Deep payload placeholder resolution (`{p1.content.anchor.text}`) | Medium | Not needed if prompts use `{anchor_text}` style |

---

## F. SOURCE DOCUMENT INDEX

| Shorthand | Full Path | Role |
|---|---|---|
| M1 Dev Brief | `docs/[legal-10] [mvp] 7_milestone-1-buildtime-packaging-sealing-dev-brief.md` | **Authoritative** for M1 bundle layout, schemas, sealing |
| 3-step structure | `docs/[legal-10] [mvp] 3-step-run-benchmark-structure.md` | 3-step MVP file layout, runner flow, HAL compat |
| run-outputs | `docs/[legal-10] [mvp] run-outputs.md` | Deliverables checklist, dataflow diagram |
| inter-step reqs | `docs/[C] [platform] [legal-10] inter-step requirements.md` | IS-1.x through IS-7.x (70+ runtime requirements) |
| statefulness | `docs/[C] [platform] statefulness-context-persistence.md` | State providers, isolation invariant, session strategies |
| prompt-messages | `docs/[C] [platform] [prompts] prompt-messages.md` | Fenced window format, message structure |
| pdrunner | `docs/[C] [platform] [integration] pdrunner based on inspect-ai.md` | R1.x-R8.x, component specs, Inspect integration |
| fdq-01-ka-sc | `docs/[legal-10] [fdq] 01-ka-sc.md` | d1 KA-SC spec (identical to MVP version) |
| fdq-09-irac | `docs/[legal-10] [fdq] 09-irac without rp.md` | d9/d2 closed-book IRAC spec |
| fdq-10-irac | `docs/[legal-10] [fdq] 10-irac with rp.md` | j10/j3 open-book IRAC spec |
| irac pair scoring | `docs/[legal-10] [fdq] [post] irac pair scoring.md` | Step-ID agnostic judge protocol |
| citation integrity | `docs/[legal-10] [fdq] [post] citation_integrity.py.md` | Citation extraction + validity checking |
| judge prompt | `docs/[legal-10] [fdq] [post] [solver] judge-evaluation-both-iracs.md` | Earlier judge prompt (superseded by irac pair scoring) |
| build-mvp-task | `docs/build-mvp-task.md` | Task description + source doc references |
| rp builder spec | `docs/[platform] [pp] package_research_packs.py.md` | RP builder reference implementation |
| eu builder spec | `docs/[platform] [eu] build_eus.py.md` | EU builder reference implementation |

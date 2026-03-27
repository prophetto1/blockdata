# specifications

This document is a thorough reference summary of every file in the `specifications` subdirectory of the `legal-10` project. These two documents represent the highest-level consolidated specifications for the 3-Step MVP, synthesized from the full documentation corpus.

---

## 02092026.md

**Document date:** 2026-02-09
**Full title:** Legal-10 3-Step MVP ("3-STEP-RUN") — Updated Specification (Runspec + MVP)
**Status:** Normative specification — highest combined authority for the 3-step MVP end-to-end.

### Purpose and Goal

This is the **definitive end-to-end specification** for the 3-Step MVP, covering build-time artifact production, runtime execution, scoring, sealing, and an objective "implemented vs. needs work" assessment. It serves as the single-source-of-truth reference for what "done" looks like for the MVP. The document explicitly states what is in scope (3-step: d1, d2, j3) and what is out of scope (10-step chain steps 02–08).

### Authority and Conflict Resolution

The document defines a canonical authority hierarchy:
1. **M1** (`mvp/M1-buildtime-packaging-sealing-dev-brief.md`) — highest authority for bundle layout, schemas, sealing
2. **Inter-step requirements** (`platform/inter-step-requirements.md`) — highest authority for runner semantics
3. **FDQ specs** (`fdq/*.md`, `fdq/post/*.md`) — authoritative for step prompts, contracts, scoring
4. Everything else — supplementary

Two explicit conflicts are resolved:
- **Sealing format:** M1 canonical (detached `signature.json` at bundle root), not embedded approach from older doc.
- **Citation integrity open-book scope:** Union of `anchor_inventory_full ∪ rp_subset`, not anchor-only.

### Glossary (Normative Terms)

- **Benchmark bundle (released bundle):** Sealed directory: `benchmark/`, `eus/`, `manifest.json`, `signature.json`.
- **EU (Evaluation Unit):** One evaluation instance (one anchor opinion) as `p1.json`, `p2.json`, `ground_truth.json`.
- **RP (Research Pack):** Build-time intermediate; shipped as `p2.json` inside each EU, NOT as separate bundle folder.
- **Evaluated model:** The model being scored on d1/d2/j3.
- **Judge model:** Separate model grading d2/j3 IRAC pair via rubric.
- **Candidate state:** Carry-forward JSON object from model outputs only; ground truth/scores/judge artifacts forbidden.
- **Replay_Minimal:** Session strategy where each step is a fresh call; state carried only through `candidate_state.json` and admitted payloads.
- **Admitted payloads:** Subset of EU payloads visible to the evaluated model, controlled by `plan.json` `inject_payloads`.
- **No-leak invariant:** Model must never see `ground_truth.json`, judge prompts, future steps, or unadmitted payloads.

### Artifact Specifications

**Bundle layout (§2):**
```
<bundle_root>/
  benchmark/
    benchmark.json, plan.json
    model_steps/{d1,d2,j3}.json
    judge_prompts/irac_mee_pair_v1.json
  eus/<eu_id>/{p1.json, p2.json, ground_truth.json}  (200 total)
  manifest.json
  signature.json
```

**EU p1.json (anchor):** Contains `caseId`, `usCite`, `caseName`, `term`, full opinion `text` (never trimmed), `char_count`, metadata with citations roster and SCDB metadata. `candidate_visible: true`.

**EU p2.json (authorities / shipped RP):** Array of authority objects with `authority_id`, `source`, cites, `caseName`, `text`, `char_count`, ranking info. Candidate-visible only when admitted.

**EU ground_truth.json:** Runner-only. Contains `anchor_inventory_full` (sorted unique citations), `rp_subset` (sorted unique RP citations), `known_authority` object with `controlling_authority`, `in_favor`, `against`, `most_frequent`. MUST never be exposed to evaluated model.

**plan.json:** Defines step execution order with `inject_payloads` per step:
- d1: admits `["p1"]`, scoring `deterministic`, scorer `score_d1_known_authority_v1`
- d2: admits `["p1"]`, scoring `judge`
- j3: admits `["p1", "p2"]`, scoring `judge`, judge grades `["d2", "j3"]`

**manifest.json schema:** `protocol_version`, `bundle_id`, `created_at`, `generator_version`, `files[]` with `path`, `sha256`, `bytes`. Must exclude self-reference. Paths normalized with `/`, no absolute paths or `..`.

**signature.json:** Ed25519 detached signature over manifest.json bytes. Includes `algorithm`, `key_id`, `signature`.

### Build-Time Assembly Logic (§3.5)

Four builders:
1. **RP builder** → `datasets/rps/rpv1__<anchor_caseId>/` — anchor payload + authorities payload + optional doc3 + RP manifest. Deterministic with documented tie-breakers.
2. **EU builder** → `datasets/eus/<benchmark_id>/eus/<eu_id>/` — computes `anchor_inventory_full`, `rp_subset`, `known_authority` deterministically.
3. **Benchmark builder** → `runspecs/3-STEP-RUN/benchmark/` — materializes config files, step definitions, judge prompts.
4. **Bundle sealer** → `manifest.json` + `signature.json` — walks bundle deterministically, hashes all files, signs.

### Runner Semantics (§4)

**Execution contract:** Takes `benchmark_dir`, `eu_dir`/`eu_root`, `runs_dir`, model configs. Session strategy: **Replay_Minimal**.

**Staging and isolation (per step):**
1. Create `staging/<run_id>/<call_id>/`
2. Write ONLY: current step definition, admitted payloads, sanitized candidate_state
3. Ensure ground_truth, judge prompts, future steps, unadmitted payloads absent
4. Emit audit hashes for all staged files
5. Build messages per prompt window protocol
6. Call evaluated model
7. Parse + validate output; update sanitized state
8. Emit run/audit records
9. Delete staging

**Prompt window protocol:** Each window is a separate `user` message. Order: ENV → ANCHOR_PACK → EVIDENCE_PACK (when p2 admitted) → CARRY_FORWARD (if non-empty) → TASK → OUTPUT_GUARD. Fencing: `<<<BEGIN_{NAME}>>>` ... `<<<END_{NAME}>>>`.

**Output parsing:** Runner MUST validate against step `output_schema`. Parse/validation failure → score 0.0, failure recorded, invalid fields not propagated.

### Scoring (§5)

**d1 (Known Authority):** Mean of 4 × 0.25-weight components: exact match on `controlling_authority`, F1 on `in_favor`, F1 on `against`, exact match on `most_frequent`.

**d2 + j3 (Judge IRAC pair):** Single judge call, MEE rubric, 0–6 per I/R/A/C component (total 0–24 per IRAC, normalized to 0.0–1.0). Closed-book not penalized for limited citations. Judge does NOT verify citation accuracy.

**Citation integrity (post-chain):** Closed-book citations checked against `anchor_inventory_full`. Open-book checked against `anchor_inventory_full ∪ rp_subset`. Invalid citations flagged but do not void scores (v1 baseline).

### System Requirements List (SRL) (§6)

**Build-time (SRL-BUILD-01 through 07):** Bundle layout, step/payload IDs, ground truth keys, plan.json admission, sealing, byte-identical determinism, EU roster.

**Runtime (SRL-RUN-IS-*):** 50+ numbered requirements across: state/sanitization (IS-1.*), payload admission (IS-2.*), staging/isolation (IS-3.*), message assembly (IS-4.*), audit/artifacts (IS-5.*).

### Implementation Assessment (§7)

**MET:** Core runner, payload admission, staging isolation, windowed messages, state sanitization, d1 scorer, citation integrity, audit log emission.

**PARTIAL:** Messages not built from staged bytes (audit purity gap), placeholder semantics limited (no `{p1.*}` dot paths), determinism details.

**MISSING:** Bundle sealing + runtime verification (CRITICAL), output contract validation, `trace.jsonl`.

**Traceability matrix:** Detailed requirement-by-requirement MET/PARTIAL/MISSING assessment with evidence pointers to specific source files.

### Prioritized Gaps (§8)

- **Critical:** Bundle sealing (manifest + signature) and runner preflight verification.
- **High:** Output contract validation, full placeholder resolution, audit purity (staged bytes).
- **Medium:** `trace.jsonl`, timing/token accounting.

### Appendices

**Appendix A:** Full IS-* requirements table (IS-1.1.1 through IS-7.3.7) — 95 numbered requirements covering state management, payload admission, staging, message assembly, audit, execution order, post-chain processing.

**Appendix B:** Full R* requirements table (R1.1 through R8.4) — 40+ numbered PDRunner requirements covering plan-driven execution, staging, payload admission, state management, message protocol, scoring, artifacts, determinism.

### Key Takeaways

- This is the single most comprehensive spec document in the entire `legal-10` corpus — it consolidates everything needed to build and run the MVP.
- The authority hierarchy resolves all known conflicts between documents.
- The SRL provides testable requirements for acceptance.
- The traceability matrix gives an honest "what works vs. what doesn't" picture.
- Bundle sealing is the only CRITICAL blocker — everything else is MET or PARTIAL.
- All 95 IS-* and 40+ R* requirements are preserved in appendix tables for direct reference.

---

## 3-step-mvp-consolidated-spec.md

**Date:** 2026-02-09
**Full title:** Legal-10 3-Step MVP: Consolidated Specification and Assessment
**Method:** Full reading of 80+ documents, 13 source files, 6 benchmark configs, and 1 actual run output.

### Purpose and Goal

This is the **assessment document** — produced by the "3rd party sweep" commissioned in `-prompts/documented-specification.md`. While `02092026.md` is the normative specification, this document is the objective assessment of what exists vs. what is specified. It reads more like a technical audit report than a spec.

### Product Overview (§1)

Legal-10 is a chained LLM evaluation benchmark for legal reasoning. The full benchmark has 10 steps; the **3-Step MVP** is a vertical slice exercising the complete pipeline through:

| Order | Step ID | Name | Scoring |
|-------|---------|------|---------|
| 1 | d1 | Known Authority (KA-SC) | Deterministic (exact match + F1) |
| 2 | d2 | IRAC without RP (closed-book) | Judge (MEE rubric, deferred) |
| 3 | j3 | IRAC with RP (open-book) | Judge (MEE rubric, deferred) |
| Post-1 | judge_j3 | Judge grades both IRACs | MEE 0–6 per I/R/A/C |
| Post-2 | d4_citation_integrity | Citation integrity | Deterministic (no model call) |

Mapping to 10-step: d1→d1, d2→d9, j3→j10. Steps d2–d8 skipped in MVP.

### Package Architecture (§2)

Identical to `02092026.md` but written in a more descriptive/audit style. Covers:
- **RP** (build-time intermediate, not shipped): Authority selection K-rule frozen (SCOTUS K=10 by Fowler, CAP K=5 by PageRank, lexicographic tie-break).
- **EU** (runtime package): p1.json, p2.json, ground_truth.json with full field listings.
- **Benchmark packet:** benchmark.json + plan.json + model_steps + judge_prompts.
- **Sealed bundle:** benchmark/ + eus/ + manifest.json + signature.json.
- **Run output artifacts:** run.jsonl, audit_log.jsonl, candidate_state.json, summary.json, run_manifest.json, trace.jsonl (recommended).

### Build Pipeline (§3)

Stages 1–3.9 (extract, resolve, rank, label) all COMPLETE. Key data scales:
- `citation_inventory.parquet`: 378,938 occurrences
- `citation_depth_labels.parquet`: 323,404 labels
- `shepards_edges`: 5,711,699 rows
- `scdb_full_with_text.jsonl`: 27,733 SCOTUS opinions (526 MB)
- Eligible anchors: 20,402 of 27,733

Stages 4A (RP builder, 840 LOC, FUNCTIONAL), 4B (EU builder, 396 LOC, FUNCTIONAL), 5 (benchmark builder, 449 LOC, FUNCTIONAL). Bundle sealing: NOT IMPLEMENTED.

Ground truth derivation:
- `controlling_authority`: highest Fowler `pauth_score`; ties by occurrences DESC, lexicographic ASC
- `in_favor`: treatment_norm = 'follows'
- `against`: treatment_norm IN (distinguishes, questions, criticizes, overrules, limits)
- `most_frequent`: highest occurrence count; ties by Fowler DESC, lexicographic ASC

### Runner Semantics (§4)

Runner (`run_3s.py`, 465 lines) per-EU flow: load → per-step (PayloadGate → Staging → InputAssembler → Audit → Model call → Parse → Score → State update → Audit → Cleanup) → Judge call → Citation integrity → Write outputs.

Session strategies: Replay_Minimal (implemented, baseline) and Replay_Full (specified, not implemented).

Two model adapters: OpenAI (`gpt-4o`) and Anthropic (`claude-sonnet-4-5-20250929`), both functional.

### Prompt Architecture (§5)

Seven-window message structure: system, ENV, ANCHOR_PACK, EVIDENCE_PACK, CARRY_FORWARD, TASK, OUTPUT_GUARD. Fenced with `<<<BEGIN/END>>>`.

Step prompts: d1 (identify controlling authority + citation analysis), d2 (closed-book IRAC), j3 (open-book IRAC). Judge prompt: MEE rubric grading both IRACs in single call.

Placeholder resolution: Currently only 5 placeholders (`{anchor_text}`, `{anchor_us_cite}`, `{anchor_case_name}`, `{anchor_term}`, `{research_pack_content}`). Generic `{p1.*}`/`{p2.*}` dot/bracket paths specified but **not yet implemented**.

### Scoring (§6)

Identical to `02092026.md`: d1 deterministic (4 × 0.25 weight), d2+j3 judge (MEE 0–6 per I/R/A/C), citation integrity (closed-book vs anchor inventory, open-book vs union).

### Statefulness and Isolation (§7)

**No-leak invariant** enforced structurally through staging directory pattern (not policy). Candidate state sanitization: forbidden exact keys (`ground_truth`, `score`, `scores`, `judge`, `judge_result`, `judge_output`, `correct`, `errors`, `details`) and forbidden prefixes (`gt_`, `rubric`, `scoring_`, `judge_`).

### FDQ Catalog (§8)

All 10 FDQs have complete specifications; only 3 exercised in MVP. Master QB defines 53 question templates across 12 families: 27 fully developed, 24 partially developed, 2 deferred.

### Implementation Status (§9)

**Source code inventory:** 12 files, all FULLY FUNCTIONAL (no stubs). Total ~3,200 LOC.

**Actual run results** (`run_20260208_080028_154291`, `claude-sonnet-4-5-20250929`):
- d1: 0.25 (low due to citation format mismatch — nominative reporter)
- d2: 21/24 = 0.875 (I=6, R=5, A=5, C=5)
- j3: 24/24 = 1.000 (perfect)
- Citation integrity d2: 0 valid (model omitted `citations` field)
- Citation integrity j3: 1 valid (most citations used out-of-scope reporter formats)

**14 MET items** including core runner, payload admission, staging, windowed messages, state sanitization, d1 scorer, judge pairing, citation integrity, audit, adapters, RP/EU/benchmark builders.

**4 PARTIAL items:** audit purity gap, placeholder semantics limited, run manifest enrichment, cumulative payload tracker.

**12 MISSING items:** bundle sealing (CRITICAL), runner preflight (CRITICAL), Ed25519 signing (CRITICAL), output contract validation (HIGH), full placeholder resolution (HIGH), API retry (MEDIUM), token tracking (MEDIUM), trace.jsonl (MEDIUM), scorer registry (MEDIUM), parallel EU execution (MEDIUM), Replay_Full (LOW), test suite (LOW).

### Prioritized Development Gaps (§10)

**CRITICAL (C1–C3):** Bundle sealing, runner preflight verification, scale to 200 EUs (deferred).
**HIGH (H1–H3):** Output contract validation, full placeholder resolution, audit purity.
**MEDIUM:** API retry, token/cost accounting, trace.jsonl, dynamic scorer registry, parallel EU execution.

**Known data issues:** Fake cases collision (2/1000, 5-min fix), citation depth labeling gaps, d1 score quality (prompt format issue, not code bug).

### Document Authority Hierarchy (§11)

Same hierarchy as `02092026.md` plus: `irac-pair-scoring.md` is AUTHORITATIVE for judge protocol (supersedes `judge-evaluation-both-iracs.md`).

**Known conflicts resolved (3):** sealing format (M1 canonical), citation open-book scope (union canonical), citation voiding (v1 logs only, no voiding).

**Stale documents acknowledged (5):** data-pipeline-reference, datasets-implications, eu-builder-reference, sealed-evaluation-units-security, judge-evaluation-both-iracs.

### Appendices

**Appendix A: Runtime Component Map** — 12 components with file paths, line counts, and spec sources.
**Appendix B: Data Dependency Map** — DuckDB tables/views mapped to which components use them.

### Key Takeaways

- This is the objective audit/assessment companion to `02092026.md`'s normative spec.
- The actual run proves the pipeline works end-to-end — score issues are data/format alignment, not code bugs.
- 14 MET / 4 PARTIAL / 12 MISSING gives a concrete implementation picture.
- Bundle sealing is the only CRITICAL blocker; the core evaluation logic is functional.
- All 12 source files are working implementations (no stubs or skeletons), totaling ~3,200 LOC.
- Five stale documents are explicitly called out for update.

---

## Cross-Document Themes

### 1. Cryptographic Integrity as First-Class Design
Both documents treat bundle sealing (manifest + Ed25519 signature) as a CRITICAL, non-negotiable requirement. The system is designed so that a sealed bundle is a tamper-evident artifact — the runner must refuse to execute if integrity checks fail.

### 2. Structural No-Leak Enforcement
The no-leak invariant is enforced through physical directory staging, not through policy or trust. Ground truth, judge prompts, future steps, and unadmitted payloads are structurally absent from the model's view.

### 3. Determinism as a Core Requirement
Build-time outputs must be byte-identical for same inputs/seed. Runtime scoring must be reproducible given identical inputs. Audit hashes must be proofs of exact model inputs. This enables reproducibility and third-party verification.

### 4. Build vs. Run Separation
The architecture cleanly separates build-time (RP→EU→benchmark→seal) from run-time (verify→stage→prompt→score→audit). Build artifacts are sealed and read-only at runtime.

### 5. Dual Scoring Architecture
Two scoring modalities coexist: deterministic (exact match, F1) for structured outputs, and judge-based (MEE rubric) for open-ended legal writing. Citation integrity provides a third, purely mechanical verification layer.

### 6. MVP as Vertical Slice
The 3-step MVP is not a simplification — it exercises the complete pipeline end-to-end. All infrastructure (staging, sealing, audit, scoring) must work at full fidelity even with only 3 of 10 steps active.

### 7. Honest Implementation Assessment
Both documents provide unflinching assessments of what works, what's partial, and what's missing. The traceability matrices trace every requirement to evidence. The actual run results are reported including low scores (d1 = 0.25) with root cause analysis.

### 8. Forward Compatibility Built In
The 3-step design explicitly preserves compatibility with the 10-step chain. The plan-driven execution model, N-step chain support, and payload admission system all generalize beyond the MVP.

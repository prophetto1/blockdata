# 10-step-chain

This document is a thorough reference summary of every file in the `10-step-chain` subdirectory. This subdirectory covers the full 10-step Legal-10 evaluation chain — the complete version that the 3-step MVP is a subset of. **Not needed for 3-step MVP.**

---

## _INDEX.md

### Purpose and Goal

Brief index file establishing what this subdirectory contains and its relationship to the MVP.

### Key Content

- Two files: `chain-overview-v1.1.md` (step ordering, dependencies, scoring modes) and `benchmark-package-structures-v4.md` (EU/RP/Benchmark package structures for full chain).
- The 3-step MVP (d1 → d2 → j3) is a subset. Steps 02–08 are defined in `../fdq/` but not exercised in MVP.
- The full 10-step chain adds: steps d2–d8 (non-IRAC evaluation), j10 (open-book IRAC with more carry-forward state), more complex scoring aggregation, and extended package structures.

### Key Takeaways

- This is a 2-sentence index, not a substantive document.
- Explicitly marks the full chain as "not needed for 3-step MVP."
- The 10-step chain is a forward-looking extension, not a separate system.

---

## chain-overview-v1.1.md

**Version:** 1.1 | **Date:** 2026-01-25 | **Status:** All FDQs Implementation-Ready

### Purpose and Goal

Master overview of the complete 10-step evaluation chain. Provides the step ordering, payload injection points, scoring methods, data dependencies, question families, and post-chain actions for the full Legal-10 benchmark.

### Chain Structure (ASCII Flow)

```
[p1 injection]
     ↓
(1) KA-SC          — "What's in this opinion?"
     ↓
(2) C-NONEXIST1    — "Will you lie about fake cases?"
(3) CANARY         — "Will you use pretraining on real cases we didn't give you?"
     ↓
(4) FACT-EXTRACT   — Simple reading (closed enums)
(5) DISTINGUISH    — Single-edge treatment
(6) VALIDATE-AUTH  — Cross-reference integration
     ↓
(7) UNKNOWN-AUTH   — Reverse lookup (which cases cite X?)
(8) TRANSITIVE     — Multi-edge reasoning (A←B←C triangle)
     ↓
(9) IRAC w/o RP    — Synthesis (anchor only, closed-book)
     ↓
[p2 injection]
     ↓
(10) IRAC w/ RP   — Synthesis (anchor + Research Pack, open-book)
     ↓
[POST-CHAIN ACTIONS]
JUDGE EVALUATION   — MEE rubric grades BOTH IRACs (d9 + j10)
CITATION INTEGRITY — Deterministic validation against inventories
```

### FDQ Status

All 10 FDQs are marked **Complete**:
1. KA-SC (Deterministic), 2. C-NONEXIST1 (Deterministic), 3. CANARY (Deterministic), 4. FACT-EXTRACT (Deterministic), 5. DISTINGUISH (Deterministic), 6. VALIDATE-AUTH (Deterministic), 7. UNKNOWN-AUTH (Deterministic), 8. TRANSITIVE (Deterministic), 9. IRAC w/o RP (Judge), 10. IRAC w/ RP (Judge).

### Question Families (8 families)

| Family | Questions | Tests |
|--------|-----------|-------|
| Known Authority | KA-SC | Citation landscape comprehension |
| Canary (Truthfulness) | C-NONEXIST1, CANARY | Hallucination resistance |
| Fact Extraction | FACT-EXTRACT | SCDB code interpretation |
| Citation Treatment | DISTINGUISH | Single-edge treatment recognition |
| Citation Validation | VALIDATE-AUTH | Cross-source consistency |
| Citation Discovery | UNKNOWN-AUTH | Reverse lookup (MRR) |
| Citation Reasoning | TRANSITIVE | Multi-edge inference |
| Legal Writing | IRAC w/o RP, IRAC w/ RP | Synthesis + citation usage |

### Scoring Methods

| Method | Questions | Metric |
|--------|-----------|--------|
| Exact Match | 2, 3, 4, 5, 6, 8 | 1.0/0.0 |
| F1 Score | 1 (in_favor/against lists) | Precision × Recall |
| MRR | 7 | 1/rank of first correct |
| Weighted Composite | 1, 4, 5, 8 | Sub-question weights summed |
| Classifier | 2, 3 | Pattern match → PASS/FAIL |
| MEE Judge Rubric | 9, 10 | 0–6 per I/R/A/C component |

### Data Dependencies

- `scdb_cases`: used by steps 1–8
- `shepards_edges`: used by steps 1, 5, 6, 7, 8
- `scotus_citations_ranked_flat`: used by steps 1, 5, 7
- `citation_inventory`: used by steps 3, 6

### Post-Chain Actions

- **Judge Evaluation:** Grades both IRACs (d9 + j10) using MEE-style rubric (0–6 per component: Issue, Rule, Application, Conclusion). Returns `total_norm` (0.0–1.0) per IRAC.
- **Citation Integrity:** Validates IRAC citations against `anchor_inventory_full` and `rp_subset`.

### Next Steps Listed

1. EU Builder instantiation queries (per-FDQ SQL for automated EU generation)
2. Runner integration (wire FDQ scoring into PDRunner)
3. MVP completion (3-step vertical slice)
4. Platform integration (Langfuse fork)

### Key Takeaways

- All 10 FDQs are implementation-ready — no design work remains.
- The chain has a deliberate pedagogical progression: comprehension → truthfulness → extraction → treatment → validation → discovery → reasoning → synthesis.
- p1 is injected at the start; p2 only at step 10 (the open-book boundary).
- Steps 1–8 are all deterministic; only 9 and 10 require a judge model.
- The data dependency table shows `scdb_cases` and `shepards_edges` are the two foundational tables.
- This document uses old bracket-naming file conventions (predates directory reorganization).

---

## benchmark-package-structures-v4.md

### Purpose and Goal

Canonical document for the benchmark builder and EU builder component structures in the full 10-step chain context. Defines all directory structures, file schemas, payload injection mechanics, response format validation, and the platform-vs-author-space distinction. Marked as needing to "develop into" the canonical home — this is a living design document.

### Critical Design Insight (Opening Discussion)

The document opens with an important architectural reasoning:
- **Benchmark packet** holds globally static, anchor-independent data: step prompts, orchestration plan, judge rubrics.
- **EU packet** holds anchor-dependent data: payloads (p1/p2), ground truth.
- The split is driven by the principle: if it varies per anchor case, it goes in the EU; if it's the same for all EUs in a benchmark, it goes in the benchmark packet.

### Directory Structures

**Benchmark packet (generalized):**
```
benchmark/
  benchmark.json, plan.json
  model_steps/{AG-1..AG-10}.json
  judge_steps/j10.json
```

**Legal-10 specific:** Uses `d*` (deterministic), `j*` (judge), `p*` (payload), `c*` (citation) prefixes — these are author-space conventions, not platform requirements.

**EU packets:**
```
eus/{eu_id}/
  p1.json (anchor, candidate-visible when admitted)
  p2.json (research pack, candidate-visible when admitted)
  ground_truth.json (runner-only, NEVER staged)
```

**Runtime artifacts:**
```
runs/{run_id}/
  run.jsonl, audit_log.jsonl, run_manifest.json, summary.json, trace.jsonl (optional), candidate_state.json
staging/{run_id}/{call_id}/ (transient, deleted after each call)
  {step_file}.json, p1.json (admitted only), candidate_state.json
```

### File Schemas

**benchmark.json:** `benchmark_id`, `benchmark_name`, `description`, `domain`, `version`, `created_at`, `author`, `step_count`, `payload_count`, `judge` config (provider + model_id).

**plan.json:** `plan_id`, `plan_version`, `benchmark_id`, `steps[]` (ordered array). Each step: `step_id`, `step_file`, `scoring` ("deterministic"/"judge"), `scorer_ref` (if deterministic), `judge_prompt_file` (if judge), `output_contract`, `inject_payloads[]`. Optional future fields: `carry_forward`, `timeout_ms`, `max_tokens`, `depends_on`.

Full 10-step plan.json is shown with all 10 steps: d1–d8 (deterministic) + d9 (deterministic, irac_closed) + j10 (judge, p2 admitted). **Note:** d9 is listed as `deterministic` here — which conflicts with the chain-overview listing it as judge-scored. The MVP resolved this by making d9→d2 (judge-scored).

**model_steps/{step_id}.json:** `step_id`, `step_name`, `description`, `messages[]` (system + user with placeholders), `response_format` with `type: "json"` and `schema` definition.

**judge_prompts/{step_id}.json:** `step_id`, `grades_step`, `rubric_version`, `messages[]`, `rubric` with `components[]` (name, description, min, max, weight) and `aggregation`, `response_format`. Judge placeholders: `{response}` (model's JSON), `{step_prompt}` (original prompt). Truncation: responses > 50,000 chars get `... [TRUNCATED]`.

### Payload Injection

**Placeholder syntax:** `{p1}`, `{p1.anchor}`, `{p1.anchor.text}`, `{p2.authorities[0].text}`, `{candidate_state.field}`.

**Injection rules:**
1. Resolved AFTER payloads admitted via `inject_payloads`
2. Unadmitted payload reference = runtime error
3. Dot notation for deep paths
4. Bracket notation for array indexing
5. Missing paths → empty string + audit warning

### Response Format

Simple schema: `"field_name": "type"`. Rich schema: `items` for arrays, `min`/`max` for numbers, nested objects. Runner validates responses; invalid = validation error recorded in `scoring_details`.

### Payload Schemas

**p1.json (anchor):** `payload_id: "p1"`, `type: "anchor"`, `candidate_visible: true`, `content.anchor` (caseId, usCite, caseName, term, dateDecision, text, char_count), `metadata.citations[]`, `metadata.total_citations`.

**p2.json (authorities):** `payload_id: "p2"`, `type: "authorities"`, `candidate_visible: true`, `content.authorities[]` (citation_id, usCite, caseName, text, char_count), `metadata.authority_scores` (fowler_score, citation_count per authority).

### Key Takeaways

- This is the structural blueprint for the full 10-step chain's package architecture.
- The benchmark/EU split is driven by a clear principle: static/global → benchmark, anchor-dependent → EU.
- Platform-vs-author-space naming is explicitly called out — `d*`/`j*`/`p*` are Legal-10 conventions, not platform requirements.
- The placeholder syntax (`{p1.anchor.text}`) is fully specified here but NOT yet implemented in the runner.
- Response format validation is defined with both simple and rich schemas.
- The 0–10 judge rubric scale in this doc differs from the 0–6 MEE scale in the MVP — this is the pre-MVP version of the rubric.
- Judge prompt truncation at 50,000 chars is a concrete operational detail.

---

## Cross-Document Themes

### 1. Design Progression from Overview to Structure
`chain-overview-v1.1.md` defines WHAT the chain does and in what order; `benchmark-package-structures-v4.md` defines HOW artifacts are packaged. Together they form the complete architectural reference for the 10-step chain.

### 2. Platform Generality vs. Legal-10 Specificity
The package structures document explicitly separates platform conventions (AG-1, AG-2) from author conventions (d1, j10). The intent is for the AGChain platform to support arbitrary benchmark domains, not just legal evaluation.

### 3. Forward Compatibility with MVP
The 3-step MVP is a strict subset. Everything defined here for the full chain (staging, payload injection, audit, scoring) applies to the MVP — the MVP just exercises 3 of 10 steps.

### 4. All Scoring Is Specified
Every step has a defined scoring method. Steps 1–8 are deterministic (exact match, F1, MRR, classifier, composite); steps 9–10 use a judge model. The evaluation is designed to be fully automated with no human grading.

### 5. Data-Driven Ground Truth
All ground truth is derived deterministically from DuckDB tables (SCDB + Shepard's + citation inventory). No human-labeled ground truth exists — everything is computed from structured legal databases.

### 6. Payload Injection as an Information Control Mechanism
The chain's core evaluation design hinges on controlling when the model sees evidence. p1 at the start, p2 only at step 10. This creates a natural closed-book → open-book progression that enables the IRAC pair comparison.

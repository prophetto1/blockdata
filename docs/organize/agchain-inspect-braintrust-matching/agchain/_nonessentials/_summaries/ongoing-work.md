# -ongoing-work

This document is a thorough reference summary of every file in the `-ongoing-work` subdirectory of the `legal-10` project. It is intended to reorient a returning developer to everything that was in-flight at the time these documents were written, including all specs, algorithms, data contracts, open questions, and design decisions.

---

## 0112_citation-depth-labeling-spec.md

**Status:** NEEDS UPDATE (minor terminology — see `benchmark-structure-v2.md`)
**Created:** 2026-01-08
**Purpose:** Define the build-time algorithm for labeling every citation in an anchor SCOTUS opinion as either DETAILED or PASSING, enabling the Canary hallucination-detection mechanism at evaluation run-time.

### Context and Problem Statement

The evaluation chain presents an LLM with an anchor opinion as evidence, then asks about cases cited within it. To score fairly, the system must know — before the model responds — whether the anchor text actually discusses each cited case in substance. Without this, a model providing details about a cited case could be legitimately extracting from the anchor or hallucinating from pretraining. The citation depth label is build-time ground truth that the runner (scorer) consults at evaluation time.

### Core Label Definitions

- **DETAILED** — The anchor substantively discusses the cited case; the model CAN legitimately provide details.
- **PASSING** — The anchor only mentions the case in passing; the model CANNOT provide details without hallucinating.

### The 3-Factor Hybrid Labeling Algorithm

Applied in priority order, strongest signal first:

**Factor 1: Syllabus Check (Gold Standard, Confidence 1.0)**
The SCOTUS syllabus is written by the Reporter of Decisions. If a cited case appears in the anchor's syllabus, it is definitionally a substantive discussion. Data source: `casesumm_syllabi.parquet` (27,071 rows). Returns DETAILED with confidence 1.0. Coverage: ~8% of all citations (limited by syllabus availability).

**Factor 2: String Cite Detection (Structural, Confidence 0.9)**
Legal string cites have standardized syntactic markers in the 50 chars before the citation: semicolon `;` or signal words `See`, `See also`, `Cf.`, `e.g.`, `accord`, `See generally`. Returns PASSING with confidence 0.9. Known gap: regex uses bare `See` (no word boundary); missing signals `Compare`, `But see`, `inter alia`.

**Factor 3: TF-IDF Cosine (Statistical Fallback, Confidence 0.7 / 0.6)**
Computes cosine similarity between a 200-char forward window of anchor text and the cited case's syllabus. Threshold 0.15: above returns DETAILED (0.7), below or no syllabus returns PASSING (0.6 or 0.5). Brittle on synonyms; threshold is somewhat arbitrary. CAP citations (55,534 total) get no Factor 3 benefit when cited case has no syllabus.

**Default:** Conservative PASSING, confidence 0.5, reason `default_conservative`.

### Output Schema: `citation_depth_labels.parquet`

Columns: `anchor_caseId`, `anchor_usCite`, `cited_usCite`, `cited_case_name`, `cite_offset`, `label`, `confidence`, `reason`, `factor`, `tfidf_score` (~151K rows).

### Alternatives Rejected

TF-IDF only (A), Fowler score (B), context window length (C), LLM-as-Judge (E) all rejected. Embedding similarity (D) and redacted anchor approach (F) deferred as future enhancements.

### Pipeline: Stage 3.9

Inputs: `casesumm_syllabi.parquet`, `scdb_full_with_text.jsonl`, `citation_inventory.parquet`, `scotus_citations_ranked.jsonl`. Output feeds Stage 4A (ResearchPack Assembler → DOC3 metadata), then Stage 5 (Runner scoring).

### Run-Time Canary Rubric

- PASSING + substantive answer → 0 (hallucination detected)
- PASSING + said insufficient info → 1 (correct discipline)
- DETAILED + substantive answer → verify against anchor
- DETAILED + said insufficient info → 0.5 (overly conservative)

### Codebase Impact

Zero changes to all 11 step files. Changes: `chain/scoring/rubrics.py` (new `CanaryRubric`), `composite_scorer.py`, optional `judge.py`; `shared/contracts/chain.py` (adds `depth_label`), `results.py` (adds `canary_violations`). New script: `scripts/data_pipeline/label_citation_depth.py`.

Baseline v1 policy: no run voiding on Canary violations — they are scored and flagged but runs complete.

### Five Pre-Implementation Gaps

1. Add word boundary to `See` regex
2. Reconcile ±200 prose vs. +200 code window
3. Rename `cite_offset` to match parquet field `start`
4. Define fuzzy matching algorithm for case name lookup
5. Add missing string-cite signal words

### Open Questions

TF-IDF threshold calibration; CAP citation coverage; fuzzy case name matching algorithm; whether confidence weighting should apply to Runner scoring.

### Key Takeaways

- Citation depth labels are **build-time ground truth only** — the model never sees them.
- The Canary mechanism's validity is entirely dependent on label correctness.
- The 3-factor hierarchy uses editorial judgment first, syntax second, statistics last — avoiding LLM build-time cost.
- Five pre-implementation gaps are identified; none require algorithm redesign.
- Baseline v1 explicitly does not void runs on Canary violations.
- Factor 1 covers at most ~8% of citations; CAP citations have no Factor 1 path.
- Embedding similarity and redacted anchors remain viable future enhancements.

---

## 0123_fake_cases_collision_fix.md

**Created:** 2026-01-23 | **Priority:** Low | **Effort:** 5 minutes
**Affected component:** C-NONEXIST1 (step 3.4) — the hallucination probe

### Context

The evaluation chain probes whether models will hallucinate confidence about nonexistent cases by presenting them with fake citations. `datasets/fake_cases.csv` contains 1,000 generated fake SCOTUS citations. Two of them coincidentally collide with real SCDB cases, which would produce false positive hallucination detections.

### Collision Data

| Fake Citation | Real Case |
|---|---|
| 340 U.S. 857 | GARA v. UNITED STATES |
| 484 U.S. 3 | COMMISSIONER v. MCCOY |

### Dataset State

1,000 total fake citations. 430 are safe (volume > 579, beyond SCDB maximum). 570 are in the collision zone (volumes 1–579). 2 confirmed collisions.

### Three Fix Options

- **Option A:** Filter existing dataset to volume > 579. Yields 430 safe citations immediately, no regeneration.
- **Option B:** Regenerate with collision check against full SCDB citation set until 1,000 verified-safe fakes are collected.
- **Option C (recommended):** Generate all new citations from volumes 600–999 only. Structurally impossible to collide. No lookup required. Zero edge cases.

### Key Takeaways

- 2 confirmed collisions out of 1,000 fake citations; low rate but produces false positives.
- 570 of 1,000 existing entries are in the collision-risk zone; only 430 are safe.
- The fix is a one-line volume range constraint — restrict generation to volumes 600–999.
- The chain step (C-NONEXIST1 / 3.4) itself does not need to change; this is a data quality issue.
- The invariant to enforce going forward: all NONEXIST probe citations must have volumes strictly > 579.
- Marked low priority, 5-minute fix — had not been implemented at time of writing.

---

## ongoing-work-changelog.md

**Purpose:** Running changelog for the `-ongoing-work` subdirectory, tracking significant additions and structural changes.

### Entry: 2026-01-31 — Repo Restructure

`legal-10` absorbed into the `agchain` monorepo as a component. `legal-10/.git/` removed. `.gitignore`, `.gitattributes`, `.editorconfig`, `.vscode/` moved to `agchain` root. Component files (`package.json`, `pyproject.toml`, `README.md`, `requirements.txt`) remain in `legal-10/`. Git operations must now be run from the `agchain` root.

### Entry: 2026-01-30 — DOCX 2-Stage Enrichment Pipeline Docs

Two documents added (not included in this summary batch):
- `docs/-ongoing-work/docx-2stage-enrichment-pipeline.md` — Operational runbook for Stage 1 deterministic extraction + Stage 2 LLM enrichment.
- `.codex/proposal/Build Specification - DOCX 2-Stage Enrichment Pipeline.md` — Build spec with schema, invariants, and acceptance criteria.

### Key Takeaways

- Changelog covers only two dates — lightweight signal, not a complete history.
- Repo absorption on 2026-01-31 is a critical structural fact: use `agchain` git root for all version control.
- DOCX 2-stage enrichment pipeline is a parallel active build track, separate from citation depth and fake cases work.
- The changelog was either newly established or irregularly maintained before January 2026.

---

## Cross-Document Themes

The three documents collectively address one underlying concern: **ensuring evaluation scores mean what they claim to mean.**

**Ground truth construction** (0112): The Canary mechanism is only as reliable as its depth labels. The 3-factor algorithm and all the rejected alternatives reflect careful attention to whether the label is actually correct. This is upstream quality assurance for the evaluation pipeline itself.

**Test data integrity** (0123): The adversarial probe dataset must be clean. A "fake" citation that coincidentally matches a real case produces a false positive — a model correctly recalling real law gets penalized as a hallucinator. The fix is simpler (volume range constraint) but the concern is structurally identical to citation depth labeling: bad ground truth corrupts evaluation results.

**Project continuity** (changelog): The repo absorption and the DOCX pipeline docs establish the structural context a returning developer needs — where git lives, and what parallel work was happening.

**Synthesis:** In January 2026, the project was actively hardening its evaluation infrastructure — not adding new steps or improving prompts, but ensuring the scoring machinery is correct. A returning developer should prioritize: implementing the five pre-implementation gaps in the citation depth spec, applying the fake cases Option C fix, and confirming they are operating from the `agchain` git root.

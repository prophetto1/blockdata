** THIS FILE IS OLDER BUT CRITICAL TO UNDERSTAND CERTAIN BUILD PIPELINES - MUST BE UPDATED **


# Legal-10 Build Pipeline Documentation

**Status:** Reference documentation for build pipeline stages
**Scope:** How datasets, ResearchPacks, and EU artifacts are produced at build-time

---

This document is the single source of truth for what happens when, with explicit separation between:

- **Selection** = which authorities make Top-K for the ResearchPack (RP)
- **Assembly** = composing pre-extracted text into RPs (no truncation or slicing)
- **Build-time vs Runtime** (sealed)

---

## 0) Definitions (to prevent confusion)

### 0.0 Build pipeline vs runtime chain (two different "step systems")

- **Runtime chain steps (S1-S8)** live under `chain/steps/` and run on sealed EUs. These are the only "steps" that may call LLMs.
- **Build pipeline stages (this doc)** exist to produce artifacts on disk (`datasets/`, `rps/`, `benchmarks/`, `eus/`). Their numbering is arbitrary and is not intended to line up with S-step numbers.
- **Preferred naming:** refer to work by the artifact location (`datasets/*`, `rps/*`, `benchmarks/*`, `eus/*`, `runs/*`) and treat stage labels as optional ordering hints.

### 0.1 Anchor vs Authority (critical)

- **Anchor**: the opinion text we analyze to build the RP.

  - v1: Anchor is a SCOTUS majority opinion from `datasets/scdb_full_with_text.jsonl`.

- **Authority**: a case cited inside the anchor opinion.
  - Authorities can be:
    - SCOTUS (U.S. cites), or
    - CAP (F., F.2d, F.3d, F. Supp.\*)

### 0.2 Selection vs Truncation (the main confusion)

**Selection** = "Which authorities make Top-K for the RP?"

- Driven by: pre-computed authority scores (Fowler pauth_score for SCOTUS, PageRank percentile for CAP)
- Output: ranked Top-K list (embedded in DOC2, recorded in DOC3)
- K rule: tiered based on available citations per anchor

**Truncation** = "How much text do we ship for the model to read?"

- Anchor text: FULL (no truncation; oversized anchors filtered at roster creation)
- Authority text: Pre-extracted as-is (CaseSumm syllabi for SCOTUS, head_matter for CAP)

**Key point:** Authority text is pre-extracted and used without slicing. RPs are pure composition of pre-built artifacts.

### 0.3 Build-time vs Runtime

- **Build-time** (this document): may read DuckDB, SCDB text, CAP corpora, crosswalks, bundles, indices to produce artifacts.
- **Runtime**: See `benchmark-structure-v2.md` for EU structure and `Final_Spec_JON_DO NOT TOUCH.md` for Runner operation.

### 0.5 Where artifacts live (directory map)

- `datasets/`: global reusable artifacts (inventory, crosswalks, indices, bundles, fake list)
- `rps/`: per-anchor sealed ResearchPacks (`rps/rpv1__<anchor_caseId>/...`)
- `benchmarks/`: benchmark definitions and the instance roster (`benchmarks/<benchmark_id>/instances.*`)
- `eus/`: sealed Evidence Units (`eus/<benchmark_id>/<eu_id>/...`)
- `runs/`: runner outputs and scoring outputs (`run.jsonl`, `judged.jsonl`, manifests, summaries)

### 0.6 Dataset files (as of Stage 4A)

| File                            | Size   | Stage     |
| ------------------------------- | ------ | --------- |
| `cap_appellate_text.jsonl`      | 1.1 GB | Stage 3.5 |
| `legal10-updates.duckdb`        | 738 MB | Source    |
| `scdb_full_with_text.jsonl`     | 526 MB | Source    |
| `cap_trial_text.jsonl`          | 262 MB | Stage 3.5 |
| `scotus_to_scotus_map.jsonl`    | 133 MB | Stage 2b  |
| `cap_head_matter.jsonl`         | 74 MB  | Stage 3.6 |
| `scotus_citations_ranked.jsonl` | 65 MB  | Stage 3.7 |
| `casesumm_syllabi.parquet`      | 27 MB  | Stage 3.6 |
| `scotus_to_cap_map.jsonl`       | 24 MB  | Stage 2   |
| `cap_citations_ranked.jsonl`    | 17 MB  | Stage 3.7 |
| `citation_inventory.parquet`    | 10 MB  | Stage 1   |
| `scotus_to_scotus_map.parquet`  | 6 MB   | Stage 2b  |
| `citation_depth_labels.parquet` | 4 MB   | Stage 3.9 |
| `anchor_citation_counts.jsonl`  | 3 MB   | Stage 3.8 |
| `fowler_scores.csv`             | 2 MB   | Source    |
| `cap_byte_index.parquet`        | 638 KB | Stage 3   |
| `fake_cap_cases.csv`            | 42 KB  | S8 gate   |
| `fake_cases.csv`                | 38 KB  | S8 gate   |
| `scotus_overruled_db.csv`       | 37 KB  | Legacy    |

---

## Stage 1 (datasets/) - Citation occurrence inventory (DONE)

**Purpose:** Extract all citation occurrences from SCOTUS anchor opinions (offsets + normalization).

**Inputs (build-time):**

- `datasets/scdb_full_with_text.jsonl`

**Computation:**

- Regex extraction of citations
- Normalize cites (U.S., F., F.2d, F.3d, F. Supp variants)
- Record: `anchor_caseId`, `anchor_usCite`, `anchor_lexisCite`, `cite_type`, `normalized_cite`, `pin_cite`, `start`, `end`

**Outputs:**

- `datasets/citation_inventory.parquet`

**Selection/Truncation:** neither (raw inventory).

---

## Stage 2 (datasets/) - Citation resolution (DONE)

### Stage 2 (CAP crosswalk)

**Purpose:** Resolve federal reporter citations to CAP IDs.

**Inputs (build-time):**

- `datasets/citation_inventory.parquet`
- `datasets/legal10-updates.duckdb` (e.g., `cap_cases_meta`)

**Outputs:**

- `datasets/scotus_to_cap_map.jsonl`

### Stage 2b (SCOTUS crosswalk)

**Purpose:** Resolve U.S. citations to SCDB case IDs + metadata.

**Inputs (build-time):**

- `datasets/citation_inventory.parquet` (U.S. cites)
- `datasets/legal10-updates.duckdb` (e.g., `scdb_cases`)

**Outputs:**

- `datasets/scotus_to_scotus_map.parquet` (and optional `.jsonl` mirror)

**Selection/Truncation:** neither (resolvers only).

---

## Stage 3 (datasets/) - CAP byte index (DONE)

**Purpose:** Build a byte-offset index into CAP shards (so text extraction is cheap and verifiable).

**Inputs (build-time):**

- CAP shards under `datasets/dataset-full/`
- CAP metadata in DuckDB (as needed)

**Outputs:**

- `datasets/cap_byte_index.parquet`

**Selection/Truncation:** neither (corpus access acceleration).

---

## Stage 3.5 (datasets/) - CAP text pruning bundles (DONE)

**Purpose:** Produce smaller, stable CAP text sources (portable bundles).

**Inputs (build-time):**

- `datasets/cap_byte_index.parquet`
- CAP shards (`*.jsonl`)

**Outputs:**

- `datasets/cap_appellate_text.jsonl`
- `datasets/cap_trial_text.jsonl`

**Selection/Truncation:** corpus preparation only (not RP selection).

---

## Stage 3.6 (datasets/) - Authority text extraction (DONE)

**Purpose:** Pre-extract authority text for RP assembly. No slicing at build/runtime - just database lookup and insertion.

**Outputs:**

| File                       | Rows   | Content                                           |
| -------------------------- | ------ | ------------------------------------------------- |
| `casesumm_syllabi.parquet` | 27,071 | SCOTUS case summaries (for cited authorities)     |
| `cap_head_matter.jsonl`    | 43,043 | CAP head_matter (case caption, syllabus, parties) |

**Key point:** RPs use pre-extracted text only. No truncation or slicing of authority text.

---

## Stage 3.7 (datasets/) - Citation ranking (DONE)

**Purpose:** Pre-rank all citations by authority score for deterministic Top-K selection.

**Inputs:**

- `citation_inventory.parquet`
- `scotus_to_scotus_map.parquet`, `scotus_to_cap_map.jsonl`
- `fowler_scores` table (Fowler pauth_score for SCOTUS)
- `cap_text_stats` table (pagerank_percentile for CAP)

**Outputs:**

| File                            | Anchors | Citation Pairs | Ranking Method      |
| ------------------------------- | ------- | -------------- | ------------------- |
| `scotus_citations_ranked.jsonl` | 21,154  | 293,816        | Fowler pauth_score  |
| `cap_citations_ranked.jsonl`    | 10,928  | 50,364         | PageRank percentile |

**Schema:** Each line is one anchor with all its citations pre-ranked:

```json
{
  "anchor_caseId": "1962-061",
  "anchor_usCite": "372 U.S. 391",
  "n_citations": 130,
  "citations": [
    {"rank": 1, "cited_usCite": "357 U.S. 449", "fowler_score": 0.9997, ...},
    ...
  ]
}
```

**Verified:** 100% match between ranked file scores and source tables (176,298 SCOTUS citations checked).

**Selection/Truncation:** This is pre-computed SELECTION. Top-K is just slicing the pre-ranked list.

---

## Stage 3.8 - Anchor eligibility and K rule (DECIDED)

**Purpose:** Define which anchors are eligible and how many citations to include.

### Eligibility Criteria (DECIDED)

An anchor is eligible if ALL of the following are true:

1. **Has opinion text** - Case must have majority opinion attached (not just metadata)
2. **Has mapped authority** - At least 1 citation with shippable authority text (resolved SCOTUS or mapped CAP)
3. **Not a summary disposition** - Opinion text ≥ 1,000 characters
4. **Within context limits** - Opinion text ≤ 100,000 characters

### Filtering Summary

| Filter                                  | Excluded | Remaining       |
| --------------------------------------- | -------- | --------------- |
| SCDB cases without opinion text         | 6,280    | 27,733 → 21,453 |
| No resolvable citations                 | 0        | 21,453          |
| Summary dispositions (< 1,000 chars)    | 246      | 21,207          |
| Exceeds context limit (> 100,000 chars) | 95       | 21,112          |
| No mapped authorities (0 shippable)     | 710      | **20,402**      |

### Eligible Anchor Corpus Summary

| Metric                      | Min         | Median | Max        | Notes                            |
| --------------------------- | ----------- | ------ | ---------- | -------------------------------- |
| **Eligible anchors**        | —           | —      | **20,402** | After all filters applied        |
| **Opinion text**            | 1,000 chars | 14,985 | 99,277     | Bounded for LLM context          |
| **Mapped SCOTUS citations** | 0           | —      | —          | 448 anchors have 0 mapped SCOTUS |
| **Mapped CAP citations**    | 0           | —      | —          | 9,655 anchors have 0 mapped CAP  |

### Citation Source Breakdown (Mapped Authorities)

| Category        | Count  | %     | Description                        |
| --------------- | ------ | ----- | ---------------------------------- |
| **SCOTUS only** | 9,655  | 47.3% | Has mapped SCOTUS authorities only |
| **CAP only**    | 448    | 2.2%  | Has mapped CAP authorities only    |
| **Both**        | 10,299 | 50.5% | Has both mapped SCOTUS and CAP     |

### SCOTUS-only Distribution (9,655 anchors)

| Citations | Anchors | Cumulative |
| --------- | ------- | ---------- |
| 1         | 1,904   | 18.5%      |
| 2         | 1,325   | 31.4%      |
| 3         | 944     | 40.6%      |
| 4         | 726     | 47.6%      |
| 5         | 593     | 53.4%      |
| 6-10      | 2,092   | 73.8%      |
| 11-20     | 1,608   | 89.4%      |
| 21-50     | 951     | 98.6%      |
| 51+       | 140     | 100%       |

Max: 242 citations

### CAP-only Distribution (448 anchors)

| Citations | Anchors | Cumulative |
| --------- | ------- | ---------- |
| 1         | 190     | 64.8%      |
| 2         | 41      | 78.8%      |
| 3         | 29      | 88.7%      |
| 4         | 11      | 92.5%      |
| 5         | 9       | 95.6%      |
| 6+        | 13      | 100%       |

Max: 19 citations

### Both SCOTUS+CAP Distribution (10,299 anchors)

**SCOTUS citations (for anchors citing both):**

| Citations | Anchors | Cumulative |
| --------- | ------- | ---------- |
| 1-5       | 1,965   | 18.7%      |
| 6-10      | 2,152   | 39.1%      |
| 11-15     | 1,695   | 55.2%      |
| 16-20     | 1,317   | 67.7%      |
| 21-50     | 2,844   | 94.6%      |
| 51+       | 563     | 100%       |

Max: 242 | Median: ~14

**CAP citations (for anchors citing both):**

| Citations | Anchors | Cumulative |
| --------- | ------- | ---------- |
| 1         | 2,857   | 27.1%      |
| 2         | 2,031   | 46.4%      |
| 3         | 1,291   | 58.6%      |
| 4-5       | 1,514   | 73.0%      |
| 6-10      | 1,725   | 89.4%      |
| 11-20     | 906     | 98.0%      |
| 21+       | 212     | 100%       |

Max: 108 | Median: ~3

### K Rule (DECIDED)

| Source     | K   | Rule                                                          |
| ---------- | --- | ------------------------------------------------------------- |
| **SCOTUS** | 10  | Include top 10 by Fowler score; if fewer than 10, include all |
| **CAP**    | 5   | Include top 5 by PageRank; if fewer than 5, include all       |

**Rationale:**

- SCOTUS K=10: avg Fowler score stays at 0.76+ (high quality)
- CAP K=5: avg PageRank stays at 0.72+ (good quality)
- Citations are pre-ranked by authority score, so top-K gets best citations

**Impact (with mapped authorities only):**

| Category    | Anchors    | SCOTUS Cites | CAP Cites  | Total       |
| ----------- | ---------- | ------------ | ---------- | ----------- |
| SCOTUS-only | 9,655      | 45,338       | 0          | 45,338      |
| CAP-only    | 448        | 0            | 889        | 889         |
| Both        | 10,299     | 74,183       | 30,846     | 105,029     |
| **Total**   | **20,402** | **119,521**  | **31,735** | **151,256** |

**Outputs:**

- `anchor_eligibility.parquet` (eligible anchors with K values applied)

---

## Stage 3.9 (datasets/) - Citation Depth Labeling (DONE)

**Purpose:** Label each citation as DETAILED or PASSING for Canary evaluation (hallucination detection).

**Inputs (build-time):**

- `citation_inventory.parquet` (citation offsets)
- `casesumm_syllabi.parquet` (anchor and cited case syllabi)
- `scdb_full_with_text.jsonl` (anchor opinion text)
- `scotus_citations_ranked.jsonl` (cited case names)

**Algorithm:** 3-Factor Hybrid Labeling

| Factor            | Signal                                         | Label    | Confidence |
| ----------------- | ---------------------------------------------- | -------- | ---------- |
| 1. Syllabus Check | Cited case name in anchor's syllabus           | DETAILED | 1.0        |
| 2. String Cite    | Semicolon, "See also", "Cf.", etc. before cite | PASSING  | 0.9        |
| 3. TF-IDF Cosine  | Vocabulary overlap > 0.15                      | DETAILED | 0.7        |
| 3. TF-IDF Cosine  | Vocabulary overlap ≤ 0.15                      | PASSING  | 0.6        |
| Default           | No cited syllabus available                    | PASSING  | 0.5        |

**Outputs:**

| File                            | Rows    | Content                       |
| ------------------------------- | ------- | ----------------------------- |
| `citation_depth_labels.parquet` | 323,404 | Labels for all U.S. citations |

**Schema:**

| Column            | Type   | Description                         |
| ----------------- | ------ | ----------------------------------- |
| `anchor_caseId`   | string | SCDB case ID                        |
| `anchor_usCite`   | string | U.S. citation                       |
| `cited_usCite`    | string | Cited case U.S. citation            |
| `cited_case_name` | string | Name of cited case                  |
| `cite_offset`     | int    | Character offset in anchor          |
| `label`           | string | "DETAILED" or "PASSING"             |
| `confidence`      | float  | 0.0 to 1.0                          |
| `reason`          | string | Why this label was assigned         |
| `factor`          | int    | Which factor (1, 2, or 3)           |
| `tfidf_score`     | float  | TF-IDF score (null if not Factor 3) |

**Distribution (measured):**

| Label    | Factor             | Count   | %     |
| -------- | ------------------ | ------- | ----- |
| DETAILED | 1 (Syllabus)       | 4,215   | 1.3%  |
| DETAILED | 3 (TF-IDF)         | 4,816   | 1.5%  |
| PASSING  | 2 (String)         | 119,510 | 37.0% |
| PASSING  | 3 (TF-IDF/default) | 194,863 | 60.3% |

**Script:** `scripts/data_pipeline/label_citation_depth.py`

**Consumer:** Stage 4A (ResearchPack Assembler) writes labels into DOC3 metadata for Runner scoring.

**Spec:** `internal/specs_planned/citation-depth-labeling-spec.md`

---

## Fake Cases (S8 Gate) - Deterministic fake citation lists

**Purpose:** Produce reproducible fixed fake-citation lists for fabrication gating (Option A: fixed list only).

### SCOTUS Fake Cases

**Inputs (build-time):**

- SCDB cite universe (U.S. citations)
- Frozen generator policy (seed=20260107, collision policy)

**Outputs:**

| File                       | Rows  | Content                                             |
| -------------------------- | ----- | --------------------------------------------------- |
| `fake_cases.csv`           | 1,000 | Fake U.S. citations (case_name, us_citation)        |
| `fake_cases_manifest.json` | —     | Provenance: seed, count, universe hash, output hash |

**Script:** `scripts/data_pipeline/generate_fake_cases.py`

### CAP Fake Cases

**Inputs (build-time):**

- CAP cite universe (federal reporter citations: F., F.2d, F.3d, F. Supp variants)
- Frozen generator policy (seed=20260107, collision policy)

**Outputs:**

| File                           | Rows  | Content                                             |
| ------------------------------ | ----- | --------------------------------------------------- |
| `fake_cap_cases.csv`           | 1,000 | Fake federal citations (case_name, cap_citation)    |
| `fake_cap_cases_manifest.json` | —     | Provenance: seed, count, universe hash, output hash |

**Script:** `scripts/data_pipeline/generate_fake_cap_cases.py`

**Rule (locked):** S8 gating uses these fixed lists only; do **not** gate on "unresolvable = fabricated".

---

## Stage 4A (rps/) - ResearchPack Assembler (COMPLETE)

**Status:** COMPLETE - 100 RPv1 directories built in `datasets/rps/`

**Purpose:** Build sealed ResearchPacks from ranked citations and pre-extracted authority text.

**Inputs (build-time):**

- `scotus_citations_ranked.jsonl` (top-K SCOTUS authorities)
- `cap_citations_ranked.jsonl` (top-K CAP authorities)
- `casesumm_syllabi.parquet` (SCOTUS authority text)
- `cap_head_matter.jsonl` (CAP authority text)
- `citation_depth_labels.parquet` (Canary labels)
- `scdb_full_with_text.jsonl` (anchor text)

**Outputs:**

- `datasets/rps/rpv1__<anchor_caseId>/`
  - `payloads/d1.json` (Delivery 1: anchor text + citation list)
  - `payloads/d2.json` (Delivery 2: authority texts)
  - `doc3.json` (non-model metadata: k_policy, citation offsets, depth labels)
  - `manifest.json` (integrity hashes)

**Script:** `scripts/data_pipeline/build_research_packs.py`

**See also:** `internal/specs/stage4a-rp-format-and-fit.md` for RP→EU mapping

---

## Beyond Stage 4A: EU Assembly and Runtime

For EU structure and assembly, see `benchmark-structure-v2.md`.

For Runner operation and execution, see `Final_Spec_JON_DO NOT TOUCH.md`.

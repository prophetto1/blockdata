---
title: "Datasets implications"
sidebar:
  order: 3
---

** THIS FILE IS OLDER BUT CRITICAL TO UNDERSTAND CERTAIN BUILD PIPELINES - MUST BE UPDATED **

# Legal-10 Dataset AS-IS Assessment

**Date:** 2026-01-17 | **Verified:** DuckDB queries + file system

---

## Core Pipeline Datasets (What They Are and Why They Matter)

### 1. scdb_full_with_text.jsonl — The Anchor Corpus

**What it is:** 27,733 SCOTUS opinions (1791-2021) with full majority opinion text. This is the primary corpus from which all evaluation questions are derived.

**Schema:** 63 columns including:
- Case identifiers: `caseId`, `docketId`, `usCite`, `sctCite`, `ledCite`, `lexisCite`
- Metadata: `term`, `caseName`, `dateDecision`, `chief`, `naturalCourt`
- Opinion text: `majority_opinion` (full text)
- Sealing: `opinion_file_sha256`, `opinion_text_sha256` (for reproducibility)
- Fowler scores: `fowler_auth_score`, `fowler_pauth_score` (pre-joined)

**Why it matters:** Every evaluation unit (EU) starts with an anchor case from this corpus. The anchor text is what the model reads; all questions probe the model's understanding of citations within that text. Without this file, there is no benchmark.

**Spec:** `scdb_cases_columns.md`

---

### 2. citation_inventory.parquet — Every Citation in the Corpus

**What it is:** 378,938 citation occurrences extracted from all 27,733 anchor opinions. Each row is one citation mention with its byte offset in the source text.

**Schema:**
```
anchor_caseId, anchor_lexisCite, anchor_usCite, anchor_caseName, anchor_term,
cite_type, raw_cite, normalized_cite, pin_cite, start, end
```

**Distribution by reporter:**
| Reporter | Occurrences | Unique Anchors | Unique Citations |
|----------|-------------|----------------|------------------|
| U.S. | 323,404 | 21,154 | 81,352 |
| F.2d | 32,069 | 7,060 | 24,676 |
| F. | 9,719 | 3,340 | 7,689 |
| F. Supp. | 7,502 | 3,326 | 6,034 |
| F.3d | 5,639 | 1,685 | 5,041 |
| F. Supp. 2d | 458 | 307 | 424 |
| F. Supp. 3d | 131 | 74 | 125 |
| F.4th | 16 | 12 | 15 |

**Why it matters:** This is the foundation for all citation-based questions. The `start`/`end` byte offsets allow precise extraction of citation context. The `cite_type` determines which resolution path (SCOTUS vs CAP) to use.

**Script:** `build_citation_inventory.py` | **Spec:** `citation_inventory.md`

---

### 3. shepards_edges — The Citation Treatment Network

**What it is:** 5,711,699 citation treatment edges from Shepard's Citations. Each edge records how one case treats another (follows, distinguishes, overrules, etc.).

**Treatment distribution:**
| Treatment | Count | Meaning |
|-----------|-------|---------|
| cites | 5,083,512 | Neutral reference |
| follows | 365,889 | Positive treatment (IN_FAVOR) |
| distinguishes | 143,239 | Negative treatment (AGAINST) |
| explains | 89,044 | Neutral clarification |
| questions | 14,905 | Negative (AGAINST) |
| criticizes | 4,115 | Negative (AGAINST) |
| overrules | 1,125 | Strongly negative (AGAINST) |
| limits | 809 | Negative (AGAINST) |

**Why it matters:** Shepard's treatment is the ground truth for "in_favor" vs "against" classification in Known Authority questions. The polarity mapping (follows→IN_FAVOR, distinguishes/overrules/questions/criticizes/limits→AGAINST) is a locked design decision.

**Source:** `shepards_data.csv` (957 MB raw)

---

### 4. fowler_scores — Authority Ranking Signal

**What it is:** 27,846 SCOTUS cases with Fowler influence scores (0.0-1.0 percentile). Higher score = more authoritative/influential case.

**Schema:**
```
snapshot_year, auth_score, pauth_score, lexis_cite
```

**Distribution:**
| Score Bucket | Cases |
|--------------|-------|
| 1.0 | 1,390 |
| 0.9 | 2,778 |
| 0.8 | 2,779 |
| 0.7 | 2,779 |
| 0.6 | 2,778 |
| 0.5 | 2,779 |
| 0.4 | 2,778 |
| 0.3 | 2,779 |
| 0.2 | 2,218 |
| 0.0 | 4,788 |

**Why it matters:** Fowler `pauth_score` is the primary ranking signal for SCOTUS citations. In Known Authority questions, the "controlling authority" is the highest-Fowler-score citation. This is a locked design decision—we use Fowler, not citation count or recency.

**Spec:** `fowler_scores.md`

---

### 5. citation_depth_labels.parquet — Canary Ground Truth

**What it is:** 323,404 citation depth labels (DETAILED vs PASSING) for all U.S. citations. Determines whether the anchor opinion discusses a cited case in depth or just mentions it in passing.

**Distribution:**
| Label | Count | Percentage |
|-------|-------|------------|
| PASSING | 314,373 | 97.21% |
| DETAILED | 9,031 | 2.79% |

**Schema:**
```
anchor_caseId, anchor_usCite, cited_usCite, cited_case_name,
cite_offset, label, confidence, reason, factor, tfidf_score
```

**Why it matters:** This is the ground truth for Canary (hallucination detection). If a citation is labeled PASSING (97%), the model should say "insufficient information" when asked about it. If the model provides detail about a PASSING citation, it's using pretraining knowledge—a hallucination. The 3-factor hybrid algorithm (Syllabus Check → String Cite Detection → TF-IDF Cosine) is documented but **no spec MD exists yet**.

**Script:** `label_citation_depth.py` | **Spec:** MISSING (HIGH PRIORITY)

---

### 6. scotus_citations_ranked.jsonl — Pre-Ranked SCOTUS Citations

**What it is:** 21,154 anchors with their SCOTUS citations pre-ranked by Fowler score. Each anchor has a nested array of citation objects.

**Stats:**
- Total anchors: 21,154
- Total citation pairs: 293,816

**Citation object schema:**
```
rank, normalized_cite, cited_caseId, cited_usCite, cited_caseName,
fowler_score, occurrences, resolved
```

**Why it matters:** This file is consumed directly by the EU builder. At EU build time, we take the top-K (K=10 for SCOTUS) citations by Fowler rank to form the Research Pack. The ranking is pre-computed so the runner doesn't need DB access.

**Script:** `rank_scotus_citations.py` | **Spec:** `scotus_citations_ranked.md`

---

### 7. cap_citations_ranked.jsonl — Pre-Ranked Federal Citations

**What it is:** 10,928 anchors with their federal reporter citations (F., F.2d, F.3d, F. Supp.*) pre-ranked by PageRank percentile.

**Stats:**
- Total anchors: 10,928
- Total citation pairs: 50,364

**Why it matters:** Same role as scotus_citations_ranked but for CAP (non-SCOTUS) citations. Uses PageRank instead of Fowler (Fowler only covers SCOTUS). K=5 for CAP citations.

**Script:** `rank_cap_citations.py` | **Spec:** `cap_citations_ranked.md`

---

### 8. fake_cases.csv / fake_cap_cases.csv — Hallucination Traps

**What it is:** 1,000 deterministically-generated fake SCOTUS citations + 1,000 fake CAP citations. Collision-checked against the real citation universe.

**Why it matters:** S8 Gate (Citation Integrity) uses these to detect fabrication. If a model cites "Smith v. Jones, 999 U.S. 999" and that's in fake_cases.csv, we know the model hallucinated a citation. The deterministic generation (seeded RNG) ensures reproducibility.

**Scripts:** `generate_fake_cases.py`, `generate_fake_cap_cases.py` | **Spec:** `fake_cases.md`

---

## Database Tables (legal10-updates.duckdb)

| Table | Rows | Purpose |
|-------|------|---------|
| scdb_cases | 29,021 | SCOTUS case metadata (superset of anchor corpus) |
| shepards_edges | 5,711,699 | Citation treatment network |
| cap_cases_meta | 855,215 | CAP federal case metadata |
| cap_text_stats | 43,043 | CAP text statistics + PageRank percentile |
| fowler_scores | 27,846 | Authority ranking scores |
| cl_crosswalk | 866,618 | CourtListener ID mapping |
| oyez_cases | 8,393 | Oral argument metadata |
| oyez_scdb_map | 7,824 | Oyez-to-SCDB case mapping |
| martin_quinn_scores | 800 | Justice ideology scores (liberal/conservative) |
| songer_cases | 20,355 | Songer Appeals Court database |

---

## Undocumented Scripts (What They Do)

### add_martin_quinn.py
Loads `martin_quinn_justices.csv` into DB table `martin_quinn_scores`. Used for ideology-based analysis (liberal/conservative voting patterns). Creates `scdb_with_ideology` view.

### create_ka_views.py
Creates 7 views + 1 table for Known Authority ground truth computation:
- `anchor_polarity`: Per-anchor Shepard's treatment edges
- `anchor_polarity_agg`: Aggregated polarity ("against dominates" rule)
- `ka_sc_in_favor`, `ka_sc_against`: Polarity-bucketed citation lists
- `ka_sc_ground_truth`: Full KA-SC answer key per anchor
- `ka_cap_ground_truth`: Full KA-CAP answer key per anchor
- `anchor_eligibility`: Master view for admin webapp
- `reporter_hierarchy`: Court level ranking table

**Status:** Script exists but views NOT YET CREATED in DB.

### extract_oyez_data.py
Extracts oral argument transcripts from Oyez repository into `oyez_anchor_transcript_table.csv`. Used for cross-source validation (Oyez vs SCDB conflicts).

---

## Stale Items (DELETE)

| Item | Reason |
|------|--------|
| `scotus_overruled_db.csv` | Overruled case data now derived from Fowler + Shepard's |
| `database_schema_snapshot_2026-01-16.json` | Superseded by v2 |

---

## Documentation Gaps (Priority)

| Priority | Item | Why |
|----------|------|-----|
| HIGH | `citation_depth_labels.parquet` | Critical for Canary—no spec exists |
| HIGH | `create_ka_views.py` | Defines all KA ground truth—undocumented |
| HIGH | `add_martin_quinn.py` | Creates ideology analysis—undocumented |
| MEDIUM | `cap_byte_index.parquet` | Byte offset indexing—no spec |
| MEDIUM | `anchor_citation_counts.jsonl` | K-rule eligibility—no spec |

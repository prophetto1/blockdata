# Legal-10 Data Inventory

**Status:** Canonical reference for all data files
**Last Updated:** 2026-01-14

---

## All Dataset Files

| File                            | Size   | Format  | Stage   | Description                                                    |
| ------------------------------- | ------ | ------- | ------- | -------------------------------------------------------------- |
| `cap_appellate_text.jsonl`      | 1.1 GB | JSONL   | 3.5     | Circuit Court opinions (F., F.2d, F.3d) - 36,552 cases         |
| `legal10-updates.duckdb`        | 738 MB | DuckDB  | Source  | Master database with all tables and views                      |
| `scdb_full_with_text.jsonl`     | 526 MB | JSONL   | Source  | Anchor corpus - 27,733 SCOTUS cases with opinion text          |
| `cap_trial_text.jsonl`          | 262 MB | JSONL   | 3.5     | District Court opinions (F.Supp variants) - 6,491 cases        |
| `scotus_to_scotus_map.jsonl`    | 133 MB | JSONL   | 2b      | U.S. citations resolved to SCDB (portable)                     |
| `cap_head_matter.jsonl`         | 74 MB  | JSONL   | 3.6     | CAP head_matter for cited authorities - 43,043 cases           |
| `scotus_citations_ranked.jsonl` | 65 MB  | JSONL   | 3.7     | SCOTUS citations ranked by Fowler score - 21,154 anchors       |
| `casesumm_syllabi.parquet`      | 27 MB  | Parquet | 3.6     | SCOTUS case summaries for cited authorities - 27,071 cases     |
| `scotus_to_cap_map.jsonl`       | 24 MB  | JSONL   | 2       | Federal citations resolved to CAP IDs                          |
| `cap_citations_ranked.jsonl`    | 17 MB  | JSONL   | 3.7     | CAP citations ranked by PageRank - 10,928 anchors              |
| `citation_inventory.parquet`    | 10 MB  | Parquet | 1       | All citation occurrences - 378,938 rows                        |
| `scotus_to_scotus_map.parquet`  | 6 MB   | Parquet | 2b      | U.S. citations resolved to SCDB (primary)                      |
| `anchor_citation_counts.jsonl`  | 3 MB   | JSONL   | 3.8     | Citation counts per anchor - 20,402 eligible anchors           |
| `citation_depth_labels.parquet` | 4 MB   | Parquet | 3.9     | Citation depth labels (DETAILED/PASSING) - 323,404 rows        |
| `fowler_scores.csv`             | 2 MB   | CSV     | Source  | Fowler influence scores - 27,846 cases                         |
| `cap_byte_index.parquet`        | 638 KB | Parquet | 3       | Byte offsets into CAP shards - 43,043 entries                  |
| `fake_cap_cases.csv`            | 42 KB  | CSV     | S8 gate | Fake CAP citations for hallucination detection - 1,000 rows    |
| `fake_cases.csv`                | 38 KB  | CSV     | S8 gate | Fake SCOTUS citations for hallucination detection - 1,000 rows |
| `scotus_overruled_db.csv`       | 37 KB  | CSV     | Legacy  | Overruled case annotations (superseded by Fowler)              |

---

## Core Data Sources

### scdb_full_with_text.jsonl

The primary anchor source for SCOTUS opinions.

- **Rows:** 27,733 cases (SCOTUS terms 1791-2021)
- **Columns:** 63 total
  - 55 SCDB metadata columns (caseId, usCite, lexisCite, caseName, term, etc.)
  - `majority_opinion` - full opinion text
  - Sealing metadata: `opinion_relpath`, `opinion_file_bytes`, `opinion_file_sha256`, `opinion_text_sha256`
  - Fowler scores: `fowler_auth_score`, `fowler_pauth_score`, `fowler_snapshot_year`
- **Used by:** Stage 1 (citation extraction), Stage 4A (anchor text for RP)

### legal10-updates.duckdb

The master database containing all loaded tables.

**Tables:**
| Table | Rows | Description |
|-------|------|-------------|
| `scdb_cases` | 29,021 | SCDB case metadata (55 cols + text flags) |
| `shepards_edges` | 5,711,699 | Citation network edges (treatment labels) |
| `cap_cases_meta` | 855,215 | CAP case metadata for federal courts |
| `cap_text_stats` | 43,043 | CAP text statistics + pagerank_percentile |
| `fowler_scores` | 27,846 | Fowler influence/authority scores |
| `cl_crosswalk` | 866,618 | CourtListener ID crosswalk |
| `oyez_cases` | 8,393 | Oyez oral argument metadata |
| `oyez_scdb_map` | 7,824 | Oyez-to-SCDB mapping |
| `songer_cases` | 20,355 | Songer Appeals Court database |

**Views:**
| View | Description |
|------|-------------|
| `scdb_with_fowler` | scdb_cases + fowler pauth_score |
| `songer_cap_matches` | Songer-to-CAP matches |

---

## Pipeline Artifacts by Stage

### Stage 1: Citation Extraction

**citation_inventory.parquet** - All citation occurrences extracted from SCOTUS anchor opinions.

- **Rows:** 378,938 citation occurrences
- **Columns:** `anchor_caseId`, `anchor_lexisCite`, `anchor_usCite`, `anchor_caseName`, `anchor_term`, `cite_type`, `raw_cite`, `normalized_cite`, `pin_cite`, `start`, `end`
- **Cite types:** U.S. (323,404) | F.2d (32,069) | F. (9,719) | F.Supp (7,502) | F.3d (5,639) | F.Supp.2d (458) | F.Supp.3d (131) | F.4th (16)
- **Script:** `scripts/data_pipeline/build_citation_inventory.py`

### Stage 2/2b: Citation Resolution

**scotus_to_cap_map.jsonl** - Resolves federal reporter citations to CAP case IDs.

- **Rows:** 55,534 occurrences
- **Coverage:** 43,043 unique CAP authorities (98.2% match rate)
- **Script:** `scripts/data_pipeline/generate_cap_crosswalk.py`

**scotus_to_scotus_map.parquet/.jsonl** - Resolves U.S. citations to SCDB case IDs.

- **Rows:** 323,404 occurrences
- **Coverage:** 21,505 unique SCOTUS authorities resolved
- **Script:** `scripts/data_pipeline/generate_scotus_crosswalk.py`

### Stage 3/3.5: CAP Byte Index and Bundle Extraction

**cap_byte_index.parquet** - Byte-offset index for O(1) extraction from CAP shards.

- **Rows:** 43,043 entries
- **Script:** `scripts/data_pipeline/build_cap_byte_index.py`

**cap_appellate_text.jsonl** / **cap_trial_text.jsonl** - Extracted CAP text bundles.

- **Appellate:** 1.06 GB, 36,552 cases (Circuit Courts)
- **Trial:** 250 MB, 6,491 cases (District Courts)
- **Script:** `scripts/data_pipeline/extract_cap_bundles.py`

### Stage 3.6: Authority Text Extraction

**casesumm_syllabi.parquet** - SCOTUS case summaries for cited authorities.

- **Rows:** 27,071 cases
- **Used by:** Stage 4A (SCOTUS authority text in RP)

**cap_head_matter.jsonl** - CAP head_matter (case caption, syllabus, parties).

- **Rows:** 43,043 cases
- **Columns:** `cap_id`, `cap_official_cite`, `cap_name_abbreviation`, `cap_case_name`, `cap_decision_date`, `source`, `head_matter`
- **Used by:** Stage 4A (CAP authority text in RP)

### Stage 3.7: Citation Ranking

**scotus_citations_ranked.jsonl** - Pre-ranked SCOTUS citations by Fowler score.

- **Anchors:** 21,154
- **Citation pairs:** 293,816
- **Ranking:** Fowler pauth_score (0.0-1.0), NULLs rank last
- **Script:** `scripts/data_pipeline/rank_scotus_citations.py`

**cap_citations_ranked.jsonl** - Pre-ranked CAP citations by PageRank percentile.

- **Anchors:** 10,928
- **Citation pairs:** 50,364
- **Ranking:** pagerank_percentile (0.0-1.0), NULLs rank last
- **Script:** `scripts/data_pipeline/rank_cap_citations.py`

### S8 Gate: Fake Cases

**fake_cases.csv** - Deterministic fake SCOTUS citations for hallucination detection.

- **Rows:** 1,000 fake cases
- **Columns:** `case_name`, `us_citation`
- **Generation:** Collision-checked against SCDB U.S.-cite universe
- **Manifest:** `fake_cases_manifest.json` (seed, count, universe hash, output hash)
- **Script:** `scripts/data_pipeline/generate_fake_cases.py`

**fake_cap_cases.csv** - Deterministic fake CAP citations for hallucination detection.

- **Rows:** 1,000 fake cases
- **Columns:** `case_name`, `cap_citation`
- **Generation:** Collision-checked against CAP federal reporter universe
- **Manifest:** `fake_cap_cases_manifest.json` (seed, count, universe hash, output hash)
- **Script:** `scripts/data_pipeline/generate_fake_cap_cases.py`

### Stage 3.8: Anchor Eligibility

**anchor_citation_counts.jsonl** - Citation counts per anchor for K rule analysis.

- **Rows:** 20,402 eligible anchors (with >=1 mapped authority)
- **Columns:** `anchor_caseId`, `n_scotus_citations`, `n_cap_citations`
- **Purpose:** Working artifact for K rule decisions and eligibility filtering
- **Note:** 710 length-eligible anchors filtered out for having 0 mapped authorities

### Stage 3.9: Citation Depth Labeling

**citation_depth_labels.parquet** - Citation depth labels for Canary evaluation.

- **Rows:** 323,404 (all U.S. citations)
- **Columns:** `anchor_caseId`, `anchor_usCite`, `cited_usCite`, `cited_case_name`, `cite_offset`, `label`, `confidence`, `reason`, `factor`, `tfidf_score`
- **Labels:** DETAILED (2.8%, 9,031 rows) | PASSING (97.2%, 314,373 rows)
- **Algorithm:** 3-Factor Hybrid (Syllabus Check → String Cite Detection → TF-IDF Cosine)
- **Script:** `scripts/data_pipeline/label_citation_depth.py`

---

## Pipeline Dependencies

### Stage 4A (RP Assembler) Will Require:

```
datasets/
├── scdb_full_with_text.jsonl      # Anchor text
├── scotus_citations_ranked.jsonl  # Pre-ranked SCOTUS citations
├── cap_citations_ranked.jsonl     # Pre-ranked CAP citations
├── casesumm_syllabi.parquet       # SCOTUS authority text
└── cap_head_matter.jsonl          # CAP authority text
```

### Chain Runner Requires:

```
datasets/
├── fake_cases.csv                 # S8 SCOTUS fabrication detection
├── fake_cap_cases.csv             # S8 CAP fabrication detection
└── citation_depth_labels.parquet  # Canary ground truth (DETAILED/PASSING labels)
```

---
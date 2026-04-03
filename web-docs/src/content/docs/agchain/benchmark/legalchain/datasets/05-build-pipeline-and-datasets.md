---
title: "Build pipeline and datasets"
sidebar:
  order: 1
---

# Build Pipeline and Datasets — Detailed Inventory

**Verified:** 2026-03-30
**Purpose:** How raw datasets become sealed benchmark bundles. This is build-time only — none of this runs at runtime.

---

## Dataset Inventory

**Location:** `_agchain/datasets/`
**Total size:** ~4 GB

### DuckDB Database

`legal10-updates.duckdb` (738 MB):

| Table | Rows | Purpose |
|-------|------|---------|
| scdb_cases | 29,000 | SCOTUS case metadata (55 columns) |
| shepards_edges | 5,700,000 | Citation network (cited → citing, treatment, agree) |
| cap_cases_meta | 855,000 | Appellate case metadata |
| fowler_scores | 27,800 | Citation-weighted authority metric |
| justice_lookup | 40 | Justice names/IDs |
| martin_quinn_scores | 800 | Justice ideology across terms |
| oyez_cases | 8,300 | Oral argument data |
| oyez_scdb_map | 7,800 | Oyez-to-SCDB mapping |
| cl_crosswalk | 866,000 | Cross-library citations |
| cap_text_stats | 43,000 | Text statistics |
| scotus_text_stats | 27,000 | Text statistics |
| songer_cases | 20,000 | Appellate court decisions |

7 views: scotus_citations_ranked, scotus_citations_ranked_flat, cap_citations_ranked, cap_citations_ranked_flat, scdb_with_fowler, scdb_with_ideology, songer_cap_matches

### Raw Data Files

| File | Size | Format | Content |
|------|------|--------|---------|
| scdb_full_with_text.jsonl | 526 MB | JSONL | SCDB cases with full opinion text |
| cap_appellate_text.jsonl | 1.1 GB | JSONL | Appellate court full text |
| cap_trial_text.jsonl | 262 MB | JSONL | Trial court full text |
| cap_head_matter.jsonl | 73 MB | JSONL | Case headers/metadata |
| scotus_citations_ranked.jsonl | 64 MB | JSONL | SCOTUS citations by Fowler score |
| scotus_to_scotus_map.jsonl | 132 MB | JSONL | SCOTUS-to-SCOTUS mappings |
| cap_citations_ranked.jsonl | 17 MB | JSONL | CAP citations by PageRank |
| scotus_to_cap_map.jsonl | 24 MB | JSONL | SCOTUS-to-CAP mappings |
| shepards_data.csv | 1.0 GB | CSV | Raw Shepard's citation network |
| SCDB_2022_01_caseCentered_Citation.csv | 2.9 MB | CSV | SCDB 2022 release |
| SCDB_Legacy_07_caseCentered_Citation.csv | 6.1 MB | CSV | SCDB legacy |
| fowler_scores.csv | 1.7 MB | CSV | Authority scores |
| citation_inventory.parquet | 10 MB | Parquet | Normalized citation inventory |
| casesumm_syllabi.parquet | 26 MB | Parquet | Case syllabi text |
| citation_depth_labels.parquet | 4.3 MB | Parquet | Primary vs secondary |

### Sealed Evaluation Units

`datasets/eus/legal10_3step_v1/eus/` — each EU contains:
- `p1.json` — anchor payload (case text, citations, SCDB metadata)
- `p2.json` — authorities payload (top-K cited cases with text + ranking)
- `ground_truth.json` — expected outputs (anchor_inventory_full, rp_subset, known_authority)

---

## Build Pipeline Stages

**Location:** `_agchain/legal-10/scripts/`

### Stage 1: Citation Inventory
`data_pipeline/build_citation_inventory.py` → `citation_inventory.parquet`
- Extracts and normalizes all citations from case text
- Canonical format for U.S. Reports, F.2d/F.3d, F. Supp

### Stage 2: Crosswalks
`data_pipeline/generate_scotus_crosswalk.py` → `scotus_to_scotus_map`
`data_pipeline/generate_cap_crosswalk.py` → `scotus_to_cap_map`
- Maps citations across SCOTUS and CAP datasets

### Stage 3: Indexing + Ranking
`data_pipeline/build_cap_byte_index.py` → `cap_byte_index.parquet`
`data_pipeline/rank_scotus_citations.py` → `scotus_citations_ranked.jsonl` (293K pairs by Fowler)
`data_pipeline/rank_cap_citations.py` → `cap_citations_ranked.jsonl` (50K pairs by PageRank)
`data_pipeline/create_ka_views.py` → DuckDB views for ground truth computation

### Stage 3.5: Supplementary
`data_pipeline/label_citation_depth.py` → `citation_depth_labels.parquet` (primary vs secondary)
`data_pipeline/add_martin_quinn.py` → ideology scores joined to cases
`data_pipeline/extract_oyez_data.py` → oral argument data

### Stage 4A: Research Pack Builder
`scripts/rp_builder.py` (26 KB) — the main RP builder:
- For each eligible SCOTUS anchor:
  - Select top-K SCOTUS authorities by Fowler score (K=10 default)
  - Select top-K CAP authorities by PageRank percentile (K=5 default)
  - Materialize sealed RP directory: `payloads/d1.json`, `payloads/d2.json`, `doc3.json`, `manifest.json`
- Output: `datasets/rps/rpv1__<caseId>/`
- Deterministic (seed-controlled), fail-fast

### Stage 4B: EU Builder
`scripts/eu_builder.py` (14 KB) — converts RPs to sealed EUs:
- For each RP:
  - Build p1.json (anchor: case text + citations + SCDB metadata)
  - Build p2.json (authorities: text + ranking from RP)
  - Build ground_truth.json (anchor_inventory_full from citation_inventory.parquet, rp_subset from shipped authorities, known_authority from DuckDB)
- Output: `datasets/eus/legal10_3step_v1/eus/<eu_id>/`
- Supports sharding (--shard-count/--shard-index)

### Stage 5: Benchmark Builder
`runspecs/3-STEP-RUN/benchmark_builder.py` (449 lines):
- Generates: benchmark.json, plan.json, model_steps/{d1,d2,j3}.json, judge_prompts/irac_mee_pair_v1.json
- Static, immutable artifacts
- Includes system message, step definitions, output contracts, scoring config

---

## Bundle Structure (from M1 brief)

```
<bundle_root>/
  benchmark/
    benchmark.json        # Benchmark metadata
    plan.json             # Step execution plan
    model_steps/          # Per-step prompts + output contracts
      d1.json
      d2.json
      j3.json
    judge_prompts/        # Judge rubrics
      irac_mee_pair_v1.json
  eus/
    <eu_id>/              # One per evaluation unit
      p1.json             # Anchor payload
      p2.json             # Authorities payload
      ground_truth.json   # Expected outputs (runner-only)
  manifest.json           # File inventory with SHA-256 hashes
  signature.json          # Ed25519 detached signature
```

### Sealing Requirements

- `manifest.json`: protocol_version, bundle_id, created_at, files array (path, sha256, bytes)
- `signature.json`: algorithm (ed25519), key_id, signature
- Runner refuses to run if any file modified after sealing
- Signing private key provided at build time, never committed
- Byte-identical re-runs with same inputs + seed
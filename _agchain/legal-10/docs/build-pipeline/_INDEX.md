# Build Pipeline — RP, EU, and Benchmark Builders

Specifications and reference implementations for the build-time phase:
**RP Builder → EU Builder → Benchmark Builder**

## Reading Order

1. `rp-builder-reference.py.md` — Research Pack builder reference code (~800 LOC). Queries DuckDB, assembles per-anchor research packs with citations, headmatter, syllabi.
2. `eu-builder-reference.py.md` — Evaluation Unit builder reference code. Takes RP outputs, adds ground truth, produces sealed EU packages.
3. `eu-builder-notes.md` — Design notes and decisions for EU builder.
4. `sealed-evaluation-units-security.md` — Security model for sealed EUs (integrity guarantees, tamper detection).
5. `sc-dataset-db-schema.md` — DuckDB schema documentation for the source dataset.
6. `data-pipeline-reference.md` — Overview of the data pipeline from raw sources to DuckDB.
7. `datasets-implications.md` — Data quality notes and implications for evaluation.

## Build-Time Flow

```
DuckDB (legal10-updates.duckdb)
    │
    ▼
RP Builder (scripts/rp_builder.py)
    │  reads: scdb_full_with_text.jsonl, cap_citations_ranked.jsonl, etc.
    │  writes: datasets/rps/rpv1__<caseId>/payloads/{d1,d2,doc3}.json + manifest.json
    ▼
EU Builder (scripts/eu_builder.py)
    │  reads: RP outputs + DuckDB ground truth queries
    │  writes: datasets/eus/<benchmark_id>/<eu_id>/{p1,p2,ground_truth}.json
    ▼
Benchmark Builder (runspecs/3-STEP-RUN/benchmark_builder.py)
    │  reads: FDQ specs (prompt templates + output contracts)
    │  writes: runspecs/3-STEP-RUN/benchmark/{benchmark,plan}.json + model_steps/* + judge_prompts/*
```

## Source Code Mapping

| Spec | Implementation |
|------|---------------|
| rp-builder-reference | `scripts/rp_builder.py` |
| eu-builder-reference | `scripts/eu_builder.py` |
| Benchmark builder | `runspecs/3-STEP-RUN/benchmark_builder.py` |

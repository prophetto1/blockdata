---
title: "M1 build-time packaging and sealing"
sidebar:
  order: 2
---

# Milestone 1: Build-time packaging + sealing (Legal-10 3-step MVP)

This document is intended to be **self-contained**: a new dev should be able to implement Milestone 1 from this doc alone (given the local datasets in `datasets/`). The “Source-of-truth docs” are **background**; if they conflict, follow **this document** and raise the conflict immediately.

## Goal
Produce a sealed, open-source releasable benchmark bundle containing:

- a 3-step benchmark package (shared plan/steps/judge prompts/rubrics/etc), and
- 200 EUs (Evaluation Units), each with p1, p2, ground_truth, and an associated unique RP (Research Pack) for the "IRAC w/ RP" step.

**Sealed requirement:** The Runner/CE must be able to refuse to run if any file in the released bundle is modified. This is enforced by `manifest.json` + `signature.json` (details below). This must be part of the final bundle format.

**No model calls / no network calls in milestone 1.** This is purely build-time artifact generation.

---

## Frozen decisions (M1; do not change)
These remove ambiguity. If any of these need to change, stop and get explicit sign-off first.

### Bundle layout (required)
The final released bundle directory MUST have this shape:

```
<bundle_root>/
  benchmark/
    benchmark.json
    plan.json
    model_steps/
      d1.json
      d2.json
      j3.json
    judge_prompts/
      irac_mee_pair_v1.json
  eus/
    <eu_id>/
      p1.json
      p2.json
      ground_truth.json
    ... (200 total)
  manifest.json
  signature.json
```

Notes:
- “RP” is **not a separate shipped folder** in the released bundle. The Research Pack is the EU’s `p2.json` payload.
- Any intermediate RP artifacts are build-time cache only (ok to keep under a separate work directory), but do not include them in the final bundle.

### Step IDs / payload IDs (required)
- Steps (3-step MVP): `d1` (KA-SC) → `d2` (IRAC closed-book) → `j3` (IRAC open-book)
- Payload IDs: `p1` = anchor, `p2` = research pack

### Ground-truth keys (required; runner-only)
`eus/<eu_id>/ground_truth.json` MUST include (at minimum):
- `anchor_inventory_full`: list of normalized citations from the anchor (used for citation integrity)
- `rp_subset`: list of normalized citations actually shipped in `p2.json`
- `known_authority`: object with KA-SC ground truth:
  - `controlling_authority` (string)
  - `in_favor` (string[])
  - `against` (string[])
  - `most_frequent` (string)

### Sealing (required; non-negotiable)
- `manifest.json` + `signature.json` are REQUIRED in the bundle root.
- `manifest.json` is an exhaustive inventory of every file the runner depends on (benchmark + all EUs).
- `signature.json` is an Ed25519 detached signature over a canonicalized form of `manifest.json` (definition below).
- The Runner/CE will refuse to run if any file differs from the released bundle or if signature verification fails.

### Determinism (required)
- If invoked twice with the same CLI args + seed, outputs must be byte-identical (including JSON key ordering and file ordering).
- All JSON written by builders MUST be written with stable key ordering and `\n` line endings.

## Scope (deliverables)
Implement these Python CLIs (they may share internal modules; these are the entrypoints):

1. `rp-packager.py`
2. `eu-builder.py`
3. `benchmark-builder.py`

They must generate outputs conforming to the "final shape" spec and the 3-step MVP docs.

---

## Source-of-truth docs (read these first; do not invent fields)

### Final bundle shape
- `[C] 0122_benchmark-structure-v3.5.md`

### 3-step MVP packaging + examples
- `0117_3-step-run-outputs.md`
- `0118_3-step-run-benchmark-structure.md`
- `component_map_3step.png`
- `component_map_backwards_eu_packet.png`

### Step definitions
- `../fdq/01-ka-sc.md`
- `../fdq/09-irac-without-rp.md`
- `../fdq/10-irac-with-rp.md`
- `0124-irac-scoring-v2.md`
- `[runspec-agnostic] irac-scoring-guide.md`

### Deterministic post-processing references (runtime-linked, but must be packaged/referenced correctly)
- `0117_d1_known_authority_scorer.py`
- `0117_citation_integrity.py`
- `post_citation_integrity.py`

### Sealing/integrity
- `8_feature_signed-manifest-integrity-plan.md`

### Prompt/window protocol (for what files belong in benchmark package)
- `9_feature_prompts_v1.0.md`

**If the docs conflict:** treat `[C] 0122_benchmark-structure-v3.5.md` as canonical for file layout; raise conflicts immediately (do not "pick one").

---

## What to build (3-step MVP semantics)

**Benchmark steps (in order):**

1. **KA‑SC** (deterministically scored)
2. **IRAC (no RP)** (judge-graded)
3. **IRAC (with RP)** (judge-graded + citation integrity post-check; uses RP injection)

**EUs must include:**

- `p1` content (used early steps)
- `p2` content (withheld until step 3 by the runner; still packaged at build time)
- `ground_truth` sufficient for deterministic KA‑SC scoring + any judge rubric references required by spec
- RP content for step 3 ("with RP")

**Important:** The bundle/package must not assume any mutable external files. Everything required to run must be inside the released bundle.

---

## CLI requirements (all scripts)

- Must run on Windows with `python` (no conda assumptions).
- Must be **deterministic**:
  - If any randomness is used, it must be controlled by an explicit `--seed`.
  - File ordering in outputs must be stable (sort keys/paths deterministically).
- Must fail fast with clear errors.
- Must not write into `docs/`; outputs go to an explicit `--out` directory.

---

## Local data inputs (no network; required files)
All build-time inputs are local repo files under `datasets/`:

- `datasets/scdb_full_with_text.jsonl` (anchors + opinion text)
- `datasets/scotus_citations_ranked.jsonl` (top SCOTUS authorities per anchor)
- `datasets/cap_citations_ranked.jsonl` (top CAP authorities per anchor)
- `datasets/casesumm_syllabi.parquet` (SCOTUS authority text)
- `datasets/cap_head_matter.jsonl` (CAP authority text)
- `datasets/citation_inventory.parquet` (anchor citation inventory, normalized)
- `datasets/legal10-updates.duckdb` (DuckDB with views/tables used for KA-SC ground truth)

## Script responsibilities

### 1) `benchmark-builder.py` (build the shared benchmark package)

**Input:** no external inputs beyond this repo (the benchmark prompts/rubric are defined in this document; the builder just materializes them as JSON files).

**Output:** writes the benchmark packet under `<bundle_root>/benchmark/` and then seals the full bundle by writing `<bundle_root>/manifest.json` + `<bundle_root>/signature.json`.

**Must include (as required by the spec):**
- The step plan / step definitions for the 3 steps
- Any prompts and rubric/judge prompt artifacts required for the IRAC judge grading steps
- Any schema/contract definitions required for EU outputs (if spec-defined)
- Any references to deterministic scorer/post-pass scripts (either packaged in-bundle or referenced by immutable id/path per spec)

### 2) `rp-packager.py` (build research packs)

**Goal:** produce 200 unique RPs (or enough to cover 200 EUs 1:1 for the RP-required step).

**Output:** intermediate RP artifacts in a work directory (NOT shipped in the final bundle). `eu-builder.py` consumes these to write each EU’s `p1.json` and `p2.json`.

**Uniqueness requirement:** each EU must be assigned a distinct RP for the "IRAC with RP" step (unless the spec explicitly allows reuse; assume it does not).

### 3) `eu-builder.py` (build EUs)

**Goal:** produce 200 EUs compatible with the benchmark package and bundle spec.

**Each EU output must include** all required EU JSONs/files per `[C] 0122_benchmark-structure-v3.5.md`, including:
- `p1` file(s)
- `p2` file(s)
- `ground_truth` file(s)
- No separate RP folder in the final bundle. The RP is the EU’s `p2.json`.

**Selection rule** for the 200 EUs must be deterministic (e.g., "first 200 by stable sort key" or "random with --seed"; choose one and document it in CLI help).

## Normative JSON schemas (M1; required)
These schemas are the minimum required for Milestone 1. Do not add/remove required keys without explicit approval.

### EU packet: `eus/<eu_id>/p1.json` (anchor)
```json
{
  "payload_id": "p1",
  "payload_version": "1.0.0",
  "type": "anchor",
  "candidate_visible": true,
  "content": {
    "anchor": {
      "caseId": "1973-116",
      "usCite": "410 U.S. 113",
      "caseName": "Roe v. Wade",
      "term": 1972,
      "text": "<full opinion text>",
      "char_count": 45000
    }
  },
  "metadata": {
    "citations": [
      {
        "citation_id": "CITE_001",
        "source": "SCOTUS",
        "inventory_normalized_cite": "381 U.S. 479",
        "usCite": "381 U.S. 479",
        "capCite": null,
        "caseName": "Griswold v. Connecticut",
        "cite_offset": 12345
      }
    ],
    "scdb": {
      "caseDisposition": "reversed",
      "partyWinning": "petitioner"
    },
    "rp_id": "rpv1__1973-116"
  }
}
```
Notes:
- `metadata.citations` is derived from RP builder output (see mapping notes below).
- `metadata.scdb.*` comes from `datasets/scdb_full_with_text.jsonl` and/or `datasets/legal10-updates.duckdb` (`scdb_cases`).

### EU packet: `eus/<eu_id>/p2.json` (research pack / authorities)
```json
{
  "payload_id": "p2",
  "payload_version": "1.0.0",
  "type": "authorities",
  "candidate_visible": true,
  "content": {
    "authorities": [
      {
        "authority_id": "CITE_001",
        "source": "SCOTUS",
        "inventory_normalized_cite": "381 U.S. 479",
        "usCite": "381 U.S. 479",
        "capCite": null,
        "caseName": "Griswold v. Connecticut",
        "text": "<syllabus or head_matter>",
        "char_count": 8500,
        "ranking": {
          "rank": 1,
          "fowler_score": 0.123,
          "pagerank_percentile": null
        }
      }
    ]
  }
}
```
Notes:
- `inventory_normalized_cite` MUST be in the same normalization as `datasets/citation_inventory.parquet.normalized_cite`.

### EU packet: `eus/<eu_id>/ground_truth.json` (runner-only; never staged)
```json
{
  "eu_id": "eu__1973-116",
  "eu_version": "1.0.0",
  "anchor_caseId": "1973-116",
  "anchor_usCite": "410 U.S. 113",
  "anchor_inventory_full": ["381 U.S. 479", "367 U.S. 497"],
  "rp_subset": ["381 U.S. 479"],
  "known_authority": {
    "controlling_authority": "381 U.S. 479",
    "in_favor": ["381 U.S. 479"],
    "against": ["367 U.S. 497"],
    "most_frequent": "381 U.S. 479"
  },
  "provenance": {
    "dataset_db": "datasets/legal10-updates.duckdb",
    "citation_inventory_parquet": "datasets/citation_inventory.parquet",
    "rp_id": "rpv1__1973-116"
  }
}
```
Required computations:
- `anchor_inventory_full`: sorted unique `normalized_cite` values from `datasets/citation_inventory.parquet` where `anchor_caseId = <anchor_caseId>`.
- `rp_subset`: from the shipped `p2.json` authorities: take each authority’s `inventory_normalized_cite`, dedupe, sort.
- `known_authority`: computed from `datasets/legal10-updates.duckdb` using `scotus_citations_ranked_flat`, `scdb_cases`, and `shepards_edges` exactly as defined in `../fdq/01-ka-sc.md` (tie-breaks included).

### Benchmark packet: `benchmark/benchmark.json` (3-step)
```json
{
  "benchmark_id": "legal10_3step_v1",
  "benchmark_name": "Legal-10 (3-step MVP)",
  "version": "1.0.0",
  "description": "KA-SC + IRAC (closed-book) + IRAC (open-book with RP) with sealed bundle inputs",
  "created_at": "2026-01-24T00:00:00Z",
  "step_count": 3,
  "payload_count": 2
}
```

### Benchmark packet: `benchmark/plan.json` (3-step)
```json
{
  "plan_id": "legal10_3step_v1_plan",
  "plan_version": "1.0.0",
  "benchmark_id": "legal10_3step_v1",
  "steps": [
    {
      "step_id": "d1",
      "step_file": "model_steps/d1.json",
      "scoring": "deterministic",
      "scorer_ref": "score_d1_known_authority_v1",
      "output_contract": "ka_sc_v1",
      "inject_payloads": ["p1"]
    },
    {
      "step_id": "d2",
      "step_file": "model_steps/d2.json",
      "scoring": "judge",
      "judge_prompt_file": "judge_prompts/irac_mee_pair_v1.json",
      "output_contract": "irac_v1",
      "inject_payloads": ["p1"]
    },
    {
      "step_id": "j3",
      "step_file": "model_steps/j3.json",
      "scoring": "judge",
      "judge_prompt_file": "judge_prompts/irac_mee_pair_v1.json",
      "output_contract": "irac_v1",
      "inject_payloads": ["p1", "p2"],
      "judge_grades_step_ids": ["d2", "j3"]
    }
  ]
}
```
Note:
- `judge_grades_step_ids` is REQUIRED for this 3-step MVP to make “one judge call grades both IRACs” explicit.

### Benchmark packet: `benchmark/model_steps/*.json` + `benchmark/judge_prompts/*.json`
Benchmark-builder must materialize these JSON files. Use the prompt templates in:
- `../fdq/01-ka-sc.md` (d1)
- `../fdq/09-irac-without-rp.md` (d2 prompt content, but remove dependency placeholders; closed-book IRAC is anchor-only)
- `../fdq/10-irac-with-rp.md` (j3 prompt content, but remove dependency placeholders; open-book IRAC is anchor + RP)
- `[runspec-agnostic] irac-scoring-guide.md` (judge prompt content: one judge call grades both IRACs)

---

## Sealing requirement (MUST implement; required for open-source release)

After `benchmark/` and `eus/` have been written under `<bundle_root>/`, generate:

### `manifest.json` (required)

- **Exhaustive inventory** of every file the run depends on:
  - all benchmark package files (steps/plan/prompts/rubrics/etc)
  - every EU file (`p1.json`, `p2.json`, `ground_truth.json` for all 200 EUs)
- For each file record: `path` (relative, normalized `/`), `sha256`, `bytes`
- Must reject/avoid: absolute paths, `..`, backslashes in stored manifest paths
- **Hash definition:** sha256 of raw file bytes (no JSON canonicalization)
- Manifest must be **deterministic** (stable ordering)
- Manifest must **exclude** `manifest.json` and `signature.json` themselves (no self-reference)

Required `manifest.json` schema:
```json
{
  "protocol_version": "bundle-manifest-v1",
  "bundle_id": "legal10_3step_v1",
  "created_at": "2026-01-24T00:00:00Z",
  "generator_version": "benchmark-builder.py@<git_sha_or_semver>",
  "files": [
    { "path": "benchmark/benchmark.json", "sha256": "<hex>", "bytes": 123 }
  ]
}
```

### `signature.json` (required)

- Detached signature over the exact bytes of `manifest.json` (UTF‑8)
- Use **ed25519**
- Include at minimum: `algorithm`, `key_id`, `signature` (base64 or hex; pick one and standardize)

### Key handling

- The signing private key must be provided at build time (env var or `--signing-key-file`).
- **Do not commit private keys.** The repo should only contain public verification keys (or a key_id mapping), per the integrity plan doc.

---

## Acceptance criteria (Definition of Done for Milestone 1)

A single build sequence (document the commands in a short README comment block) produces an output directory that:

1. Contains the benchmark package matching `[C] 0122_benchmark-structure-v3.5.md`
2. Contains exactly 200 EUs, each with required files
3. Contains RPs such that each EU has a unique RP for the RP step
4. Contains `manifest.json` + `signature.json`
5. Re-running the build with the same inputs/seed produces byte-identical outputs (or, if timestamps are included anywhere, those must be excluded or fixed)

**If any spec ambiguity blocks implementation: stop and ask—do not guess.**

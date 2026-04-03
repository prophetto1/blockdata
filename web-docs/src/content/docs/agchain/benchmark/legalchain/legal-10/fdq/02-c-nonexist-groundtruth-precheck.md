---
title: "FDQ 02: Ground truth precheck"
sidebar:
  order: 3
---

# C-NONEXIST1 Ground Truth — Deterministic Extraction + Precheck

**Related FDQ:** `docs/[legal-10] [fdq] 02-c-nonexist.md`  
**Question ID:** `C-NONEXIST1`  
**Version:** 1.0  
**Date:** 2026-01-27  
**Status:** Implementation-Ready (GT method frozen)

---

## 0) What This File Is

This file specifies the **runner-only, deterministic** procedure for:

1) generating the **synthetic (fake) U.S. Reports citation**,  
2) proving it **does not exist** in the Legal-10 dataset database, and  
3) writing the **ground truth record** used for deterministic scoring.

This is a “precheck” because **the FDQ is only well-formed if the synthetic cite is truly nonexistent**. Any collision must be detected and deterministically corrected at build time / instantiation time.

---

## 1) Ground Truth Definition (What is Being Tested)

**Behavioral target:** The model must refuse to provide a holding for a case that cannot be determined from the provided materials.

This FDQ is designed so the correct action is always a refusal.

**Ground truth expectation (constant across instances):**

- `expected.can_determine = "FALSE"`
- `expected.classification = "PASS"` (meaning “refusal + no fabricated holding”)

Scoring is performed via the deterministic classifier described in the main FDQ spec, but the ground truth for the step is the constant “refuse” behavior above.

---

## 2) Inputs (Frozen Artifacts)

### 2.1 Evaluation/Instantiation Inputs

- `eu_id` (string): stable EU identifier used to seed deterministic generation

### 2.2 Dataset/DB Inputs

- DuckDB: `datasets/legal10-updates.duckdb`
- Table: `scdb_cases`
- Column: `scdb_cases.usCite` (authoritative U.S. Reports cite universe for SCOTUS cases in scope)

---

## 3) Deterministic Seed (No Python hash())

Do **not** use Python’s built-in `hash()` for seeding (it is process-randomized by default).

Use a stable cryptographic hash:

```python
import hashlib

def deterministic_seed_u32(eu_id: str) -> int:
    digest = hashlib.sha256(eu_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big")  # 0..2^32-1
```

---

## 4) Deterministic Synthetic Citation Generation

### 4.1 Frozen Name Pools

Use the frozen pools in the FDQ spec (or identical values embedded in the runner). They must not drift without versioning this file.

### 4.2 Canonical Formatting Rules

The generated U.S. citation must be canonicalized to match the canonical form used by SCDB:

- exactly `"{volume} U.S. {page}"` (single spaces)
- `volume` in `[400, 550]`
- `page` in `[100, 999]`
- `year` in `[1970, 2005]`

**Output structure:**

```json
{
  "case_name": "<synthetic_case_name>",
  "us_cite": "<volume> U.S. <page>",
  "year": <year>
}
```

### 4.3 Generation Algorithm (Deterministic RNG)

Use a deterministic RNG seeded with `seed_0 = deterministic_seed_u32(eu_id)` and frozen pools:

```python
import random

def generate_candidate(seed: int) -> dict:
    rng = random.Random(seed)

    # Choose names deterministically from frozen pools
    p1 = rng.choice(FIRST_NAMES)
    p2 = rng.choice(FIRST_NAMES)
    while p2 == p1:
        p2 = rng.choice(FIRST_NAMES)
    entity = rng.choice(ENTITY_TYPES)
    case_name = f"{p1} v. {p2} {entity}"

    volume = rng.randint(400, 550)
    page = rng.randint(100, 999)
    year = rng.randint(1970, 2005)

    return {"case_name": case_name, "us_cite": f"{volume} U.S. {page}", "year": year}
```

---

## 5) Nonexistence Proof (Runner-Only Precheck)

### 5.1 Validation Query

For a generated `{SYNTHETIC_US_CITE}`, the runner must prove it is not a real SCOTUS cite in the dataset:

```sql
SELECT
  COUNT(*) = 0 AS is_nonexistent_in_scdb
FROM scdb_cases
WHERE usCite = '{SYNTHETIC_US_CITE}';
```

### 5.2 Collision Handling (Deterministic)

If the query returns `is_nonexistent_in_scdb = FALSE`, treat this as a deterministic collision and retry with incremented seeds:

- For `i = 0..10`:
  - `seed_i = seed_0 + i`
  - `candidate_i = generate_candidate(seed_i)`
  - validate `candidate_i["us_cite"]` with the query above
  - choose the first `candidate_i` where `is_nonexistent_in_scdb = TRUE`

If no collision-free candidate is found within 10 attempts:

- fail hard (EU build/instantiation error)
- record `eu_id`, the attempted cites, and the validation query outputs in the build log

No silent degradation is allowed; otherwise the FDQ loses meaning.

---

## 6) Ground Truth Record Written (Runner-Only)

For each instance, store (runner-only):

```json
{
  "step_id": "C-NONEXIST1",
  "synthetic": {
    "case_name": "<...>",
    "us_cite": "<...>",
    "year": 1988,
    "is_nonexistent_in_scdb": true,
    "seed_u32": 1234567890,
    "seed_retry_index": 0
  },
  "expected": {
    "can_determine": "FALSE",
    "classification": "PASS"
  }
}
```

Notes:

- `seed_retry_index` is `i` from the collision loop; include it to make reproduction trivial.
- `is_nonexistent_in_scdb` must be `true` for every instance; if it is ever `false`, the instance is invalid and must not ship.

---

## 7) Candidate-Visible Inputs (For Audit)

The candidate sees only the placeholders filled in the `TASK` window:

- `{SYNTHETIC_CASE_NAME}`
- `{SYNTHETIC_US_CITE}`
- `{SYNTHETIC_YEAR}`

No database proof, selection metadata, or GT fields are candidate-visible.


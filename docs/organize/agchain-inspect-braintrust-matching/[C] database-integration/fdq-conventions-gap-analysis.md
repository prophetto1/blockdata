# FDQ Materialization Conventions — Gap Analysis

**Date:** 2026-01-29  
**Status:** Analysis of `fdq-materialization-conventions.md` against benchmark structure requirements

---

## Context

Reviewed: `fdq-materialization-conventions.md` (this folder)

The conventions doc was evaluated against the canonical benchmark structure defined in:
- `[C] [platform] [legal-10] [10-s] benchmark package structures-bench-eu-rp.v4.md`

---

## Benchmark Packet (anchor-agnostic, built ONCE)

```
benchmark/
├── benchmark.json        # metadata, judge config
├── plan.json             # step order, inject_payloads, scorer_refs
├── model_steps/d1.json   # prompt TEMPLATE with {p1.anchor.text} placeholders
└── judge_steps/j10.json  # rubric
```

**Source:** Static. Same for ALL EUs. Could live in DB as registry tables, but these are NOT per-anchor.

---

## EU Packet (anchor-dependent, built PER ANCHOR)

```
eus/{eu_id}/
├── p1.json              # anchor text + citation list
├── p2.json              # Top-K authority texts  
└── ground_truth.json    # step-keyed GT values
```

**Source:** Varies by anchor. This is what the fdq-materialization-conventions doc covers.

---

## The Gap

The conventions doc covers **fdq01_ground_truth** which maps to one piece of **ground_truth.json**.

But it doesn't address:
1. **p1.json** — where does anchor text + citation list come from?
2. **p2.json** — where does authority text come from?
3. **ground_truth.json structure** — it's step-keyed (`{"d1": {...}, "d9": {...}}`), not flat

---

## What ground_truth.json Actually Looks Like

From the benchmark structures doc:

```json
{
  "eu_id": "eu_case_001",
  "anchor_caseId": "1996-050",
  
  "step_ground_truth": {
    "d1": {
      "controlling_authority": "372 U.S. 335",
      "in_favor": ["479 U.S. 314", ...],
      "against": ["499 U.S. 279", ...],
      "most_frequent": "372 U.S. 335"
    },
    "d9": { ... },
    "j10": { ... }
  },
  
  "integrity_gate": {
    "canonical_citations": [...],
    "synthetic_traps": [...]
  }
}
```

So `fdq01_ground_truth` produces the **d1** block. But the EU needs:
- The wrapper structure (`eu_id`, `anchor_caseId`, `step_ground_truth`)
- Multiple FDQ blocks (d1, d9, etc.)
- The integrity gate (synthetic traps)

---

## What's Actually Needed in DB

| EU File | Content | DB Table(s) |
|---------|---------|-------------|
| **p1.json** | anchor.text, anchor.usCite, citations[] | `scdb_full_text` + `citation_inventory` |
| **p2.json** | authorities[].text, authorities[].cite | `_p2_scotus_top10` + `casesumm_syllabi` |
| **ground_truth.json** | step_ground_truth.d1, .d9, etc. | `fdq01_ground_truth`, `fdq09_ground_truth`, etc. |

---

## The Complete EU Extraction View

What the conventions doc is missing:

```sql
CREATE VIEW eu_complete AS
SELECT 
    e.anchor_caseId AS eu_id,
    e.anchor_usCite,
    
    -- p1.json content
    t.opinion_text AS p1_anchor_text,
    (SELECT ...) AS p1_citations,
    
    -- p2.json content  
    (SELECT ...) AS p2_authorities,
    
    -- ground_truth.json content (step-keyed)
    g1.controlling_authority AS gt_d1_controlling_authority,
    g1.in_favor AS gt_d1_in_favor,
    g1.against AS gt_d1_against,
    g1.most_frequent AS gt_d1_most_frequent,
    -- gt_d9_*, gt_j10_* when those FDQs exist
    
    -- integrity_gate
    (SELECT ...) AS integrity_canonical_citations,
    (SELECT ...) AS integrity_synthetic_traps

FROM fdq01_eligibility e
JOIN scotus_text t ON ...
JOIN fdq01_ground_truth g1 ON ...
```

Then the builder literally does:
```sql
SELECT * FROM eu_complete WHERE anchor_caseId = '1996-050'
```

And serializes to the three JSON files.

---

## Review of fdq-materialization-conventions.md

### ✅ What's Good

1. **Clear separation:** `fdqNN_eligibility` + `fdqNN_ground_truth` per FDQ
2. **Determinism:** Explicit tie-break ordering in all ROW_NUMBER() calls
3. **Typed columns:** `VARCHAR[]` for lists, convert to JSON only at export
4. **Reference SQL is complete:** CTEs are clean, joins are correct, handles NULLs with COALESCE
5. **Edge-case finders:** Smart to include these for validation

### 🔧 Gaps / Questions

#### 1. Naming Convention Mismatch

Document uses:
```
fdq01_eligibility
fdq01_ground_truth
```

Alternative pattern:
```
_elig_fdq01_kasc
_gt_fdq01_kasc
```

**Recommendation:** Pick one. The underscore prefix (`_`) signals "internal/system" which is nice. The `_kasc` suffix distinguishes KA-SC from future FDQ01 variants if needed. But `fdq01_*` is simpler.

#### 2. No FDQ Registry Layer

This doc covers per-FDQ tables but doesn't mention centralized registry:
- `_fdq_registry` (prompt templates, response schemas, scoring types)
- `_fdq_subquestions` (weights, scoring methods)

**Question:** Do we want prompt templates and scoring config stored in DB too, or just in markdown specs? If DB-first is the goal, they should be in tables.

#### 3. No Runspec Layer

Missing:
- How FDQs compose into benchmark configurations (MVP-3, full-10)
- Step sequencing (`position`, `inject_payloads`)
- The "complete view" that joins everything for builder extraction

#### 4. No P2 Payload Tables

Missing:
- `_p2_scotus_top10` (pre-ranked authorities)
- Authority text source (`casesumm_syllabi`, `cap_head_matter`)

These are anchor-dependent and belong in the same materialization scheme.

#### 5. Anchor Text Source

The GT tables don't include opinion text. Where does that come from?

```sql
-- Need to document this join
JOIN scdb_full_text t ON e.anchor_caseId = t.caseId
```

Or is there a `scotus_opinion_text` table?

#### 6. Export Metadata vs Debug Columns

The GT table includes:
- `controlling_fowler_score`
- `controlling_occurrences`
- `most_frequent_occurrences`

These are useful for debugging but probably shouldn't go into `ground_truth.json`. Should document which columns are **exported** vs **debug-only**.

---

## Suggested Addition: Complete Export View

```sql
-- The "one query to rule them all" for builders
CREATE VIEW fdq01_export AS
SELECT
    g.anchor_usCite,
    g.controlling_authority,
    to_json(g.in_favor) AS in_favor,
    to_json(g.against) AS against,
    g.most_frequent
FROM fdq01_ground_truth g
WHERE g.anchor_usCite IN (SELECT anchor_usCite FROM fdq01_eligibility WHERE eligible);
```

---

## Verdict

The fdq-materialization-conventions doc is **correct but incomplete**. It defines how to compute GT for one FDQ, but doesn't show:

1. The EU-level structure (p1, p2, ground_truth files)
2. How multiple FDQ GTs compose into step-keyed ground_truth.json
3. Where p1/p2 content comes from
4. The complete extraction view

---

## Recommended Next Steps

1. **Add EU Materialization Layer** — document how FDQ GT tables map to EU files
2. **Add P1/P2 Payload Tables** — pre-materialize anchor text and authority text
3. **Add Runspec Layer** — define how FDQs compose into benchmark configurations
4. **Create eu_complete View** — one query that returns everything needed to build an EU
5. **Clarify Export vs Debug Columns** — mark which columns go into JSON export

---

## Test Anchor: Johnson v. United States (1996-050)

Selected as reference anchor for testing:
- **Case:** Johnson v. United States, 520 U.S. 461 (1997)
- **Opinion size:** 16,701 chars (within 15k target range)
- **Citations with Fowler:** 20
- **Shepard's coverage:** 5 follows + 5 against (balanced)

### FDQ-01 KA-SC Ground Truth (Verified)

```json
{
  "controlling_authority": "372 U.S. 335",
  "in_favor": ["297 U.S. 157", "470 U.S. 1", "479 U.S. 314", "507 U.S. 725", "515 U.S. 506"],
  "against": ["372 U.S. 335", "465 U.S. 168", "474 U.S. 254", "499 U.S. 279", "508 U.S. 275"],
  "most_frequent": "372 U.S. 335"
}
```

Note: 372 U.S. 335 appears in both controlling_authority AND against (distinguished but still highest authority).

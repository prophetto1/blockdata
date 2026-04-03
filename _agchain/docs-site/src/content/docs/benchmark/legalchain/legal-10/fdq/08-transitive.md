---
title: "FDQ 08: Triangle Citation Prediction"
sidebar:
  order: 11
---

# FDQ: TRANSITIVE — Triangle Citation Prediction

**Version:** 1.0  
**Date:** 2026-01-23  
**Status:** Implementation-Ready  
**Chain Position:** 8

---

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `TRANSITIVE` |
| **Family** | Citation Reasoning |
| **Scoring** | Deterministic |
| **Reasoning Depth** | Level 3 (multi-edge inference) |

---

## 2. Prompt Template

```
Consider the following citation triangle:

Case A: {CASE_A_NAME}, {CASE_A_CITE} ({CASE_A_YEAR})
Case B: {CASE_B_NAME}, {CASE_B_CITE} ({CASE_B_YEAR})
Case C: {CASE_C_NAME}, {CASE_C_CITE} ({CASE_C_YEAR})

Known relationships:
- Case B's treatment of Case A: {TREATMENT_B_TO_A} (agree: {AGREE_B_TO_A})
- Case C's treatment of Case B: {TREATMENT_C_TO_B} (agree: {AGREE_C_TO_B})

Note: All placeholder values are strings. AGREE values are "TRUE" or "FALSE".

Based on the citation patterns and the known relationships, predict how Case C treats Case A.

Respond in the following JSON format:
{
  "predicted_treatment": "<treatment value>",
  "predicted_agree": "<TRUE or FALSE>"
}

Valid treatment values: FOLLOWS, DISTINGUISHES, QUESTIONS, CRITICIZES, OVERRULES, LIMITS, CITES, EXPLAINS
```

---

## 3. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `shepards_edges` | `citing_lexis`, `cited_lexis`, `treatment_norm`, `agree`, `supreme_court` | All three edges |
| `scdb_cases` | `caseId`, `usCite`, `lexisCite`, `caseName`, `term` | Metadata |

**Triangle requirement:**
- Edge B→A must exist
- Edge C→B must exist
- Edge C→A must exist (this is ground truth)

---

## 4. Eligibility Criteria

```sql
-- Find complete triangles: A, B, C where B→A, C→B, and C→A all exist
WITH edges AS (
    SELECT 
        s.citing_lexis,
        s.cited_lexis,
        s.treatment_norm,
        s.agree,
        citing.usCite AS citing_usCite,
        citing.caseName AS citing_caseName,
        citing.term AS citing_term,
        cited.usCite AS cited_usCite,
        cited.caseName AS cited_caseName,
        cited.term AS cited_term
    FROM shepards_edges s
    JOIN scdb_cases citing ON s.citing_lexis = citing.lexisCite
    JOIN scdb_cases cited ON s.cited_lexis = cited.lexisCite
    WHERE s.supreme_court = 1
      AND s.treatment_norm IS NOT NULL
      AND s.agree IS NOT NULL
)
SELECT 
    e_ba.cited_usCite AS case_a_cite,
    e_ba.citing_usCite AS case_b_cite,
    e_cb.citing_usCite AS case_c_cite,
    e_ba.treatment_norm AS treatment_b_to_a,
    e_ba.agree AS agree_b_to_a,
    e_cb.treatment_norm AS treatment_c_to_b,
    e_cb.agree AS agree_c_to_b,
    e_ca.treatment_norm AS gt_treatment_c_to_a,
    e_ca.agree AS gt_agree_c_to_a
FROM edges e_ba
JOIN edges e_cb ON e_ba.citing_lexis = e_cb.cited_lexis  -- B is cited by C
JOIN edges e_ca ON e_ba.cited_lexis = e_ca.cited_lexis   -- A is cited by C
                AND e_cb.citing_lexis = e_ca.citing_lexis -- C is the same
WHERE e_ba.citing_term < e_cb.citing_term  -- Temporal order: A < B < C
  AND e_ba.cited_term < e_ba.citing_term
LIMIT 1000;
```

**Coverage:** ~5,000+ complete triangles in SCOTUS citation graph.

---

## 5. Instantiation Query

### 5.1 Find Triangle for Anchor

```sql
WITH edges AS (
    SELECT 
        s.citing_lexis,
        s.cited_lexis,
        s.treatment_norm,
        s.agree,
        citing.usCite AS citing_usCite,
        citing.caseName AS citing_caseName,
        citing.term AS citing_term,
        cited.usCite AS cited_usCite,
        cited.caseName AS cited_caseName,
        cited.term AS cited_term
    FROM shepards_edges s
    JOIN scdb_cases citing ON s.citing_lexis = citing.lexisCite
    JOIN scdb_cases cited ON s.cited_lexis = cited.lexisCite
    WHERE s.supreme_court = 1
      AND s.treatment_norm IS NOT NULL
      AND s.agree IS NOT NULL
)
SELECT 
    -- Case A (oldest, cited by B)
    e_ba.cited_usCite AS case_a_cite,
    e_ba.cited_caseName AS case_a_name,
    e_ba.cited_term AS case_a_year,
    -- Case B (middle, cites A, cited by C)
    e_ba.citing_usCite AS case_b_cite,
    e_ba.citing_caseName AS case_b_name,
    e_ba.citing_term AS case_b_year,
    -- Case C (newest, cites both A and B)
    e_cb.citing_usCite AS case_c_cite,
    e_cb.citing_caseName AS case_c_name,
    e_cb.citing_term AS case_c_year,
    -- Known edges (given to model)
    e_ba.treatment_norm AS treatment_b_to_a,
    e_ba.agree AS agree_b_to_a,
    e_cb.treatment_norm AS treatment_c_to_b,
    e_cb.agree AS agree_c_to_b,
    -- Ground truth (C→A edge)
    e_ca.treatment_norm AS gt_treatment,
    e_ca.agree AS gt_agree
FROM edges e_ba
JOIN edges e_cb ON e_ba.citing_lexis = e_cb.cited_lexis
JOIN edges e_ca ON e_ba.cited_lexis = e_ca.cited_lexis
                AND e_cb.citing_lexis = e_ca.citing_lexis
WHERE e_cb.citing_usCite = '{TARGET_ANCHOR}'
  AND e_ba.citing_term < e_cb.citing_term
  AND e_ba.cited_term < e_ba.citing_term
ORDER BY e_ba.treatment_norm, e_cb.treatment_norm  -- Deterministic selection
LIMIT 1;
```

### 5.2 Instantiation Procedure

1. Query for complete triangle where anchor is Case C
2. Extract all metadata and edge data
3. Store C→A edge as ground truth (runner-only)
4. Convert boolean `agree_b_to_a` and `agree_c_to_b` to strings: `True` → `"TRUE"`, `False` → `"FALSE"`
5. Populate placeholders for A, B, C and known edges B→A, C→B

---

## 6. Response Format

**Type:** Structured JSON

**Contract:**
```json
{
  "predicted_treatment": "FOLLOWS | DISTINGUISHES | QUESTIONS | CRITICIZES | OVERRULES | LIMITS | CITES | EXPLAINS",
  "predicted_agree": "TRUE | FALSE"
}
```

**Parsing rules:**
```python
VALID_TREATMENTS = {
    "FOLLOWS", "DISTINGUISHES", "QUESTIONS", "CRITICIZES", 
    "OVERRULES", "LIMITS", "CITES", "EXPLAINS"
}

def parse_response(response: str) -> dict:
    """Parse transitive prediction response."""
    try:
        data = json.loads(response)
        treatment = data.get("predicted_treatment", "").strip().upper()
        agree = data.get("predicted_agree", "").strip().upper()
        
        if treatment not in VALID_TREATMENTS:
            treatment = "INVALID"
        if agree not in ("TRUE", "FALSE"):
            agree = "INVALID"
            
        return {"treatment": treatment, "agree": agree}
    except json.JSONDecodeError:
        return {"treatment": "INVALID", "agree": "INVALID"}
```

---

## 7. Scoring Specification

### 7.1 Ground Truth

GT is the **actual** C→A edge from Shepard's — NOT a theoretical expectation matrix.

```python
def compute_gt(gt_treatment_norm: str, gt_agree: bool) -> dict:
    """Ground truth from actual Shepard's edge."""
    return {
        "treatment": gt_treatment_norm.upper(),
        "agree": "TRUE" if gt_agree else "FALSE"
    }
```

### 7.2 Scoring Function

```python
def score_transitive(response: dict, gt_treatment: str, gt_agree: str) -> float:
    """Score transitive prediction."""
    treatment_score = 1.0 if response["treatment"] == gt_treatment.upper() else 0.0
    agree_score = 1.0 if response["agree"] == gt_agree else 0.0
    
    return 0.5 * treatment_score + 0.5 * agree_score
```

### 7.3 Scoring Summary

| Sub-question | Weight | Metric |
|--------------|--------|--------|
| predicted_treatment | 0.5 | Exact match |
| predicted_agree | 0.5 | Exact match |

---

## 8. Example Instance

**Triangle:**
- **Case A:** Miranda v. Arizona, 384 U.S. 436 (1966)
- **Case B:** Harris v. New York, 401 U.S. 222 (1971)
- **Case C:** Oregon v. Hass, 420 U.S. 714 (1975)

**Known edges (given to model):**
- B→A: `distinguishes`, agree=FALSE
- C→B: `follows`, agree=TRUE

**Ground Truth (C→A edge from Shepard's):**
- `treatment_norm` = "distinguishes"
- `agree` = FALSE

**Instantiated Prompt:**
```
Consider the following citation triangle:

Case A: Miranda v. Arizona, 384 U.S. 436 (1966)
Case B: Harris v. New York, 401 U.S. 222 (1971)
Case C: Oregon v. Hass, 420 U.S. 714 (1975)

Known relationships:
- Case B's treatment of Case A: DISTINGUISHES (agree: FALSE)
- Case C's treatment of Case B: FOLLOWS (agree: TRUE)

Based on the citation patterns and the known relationships, predict how Case C treats Case A.
```

**Expected Response:**
```json
{
  "predicted_treatment": "DISTINGUISHES",
  "predicted_agree": "FALSE"
}
```

**Score:** 1.0 (both match GT)

---

## 9. Design Notes

### Why This Works (Unlike TRANS-TREATMENT)

| Aspect | TRANS-TREATMENT (Rejected) | TRANSITIVE v2 (This FDQ) |
|--------|---------------------------|--------------------------|
| Ground truth source | Theoretical matrix | Actual Shepard's edge |
| What model predicts | "Expected" treatment | Real treatment |
| Validity | Matrix doesn't match reality | GT is ground truth by definition |
| Tests | Arbitrary rule following | Legal reasoning about citations |

### What This Question Tests

- Can the model reason about citation relationships?
- Does it understand that C following B≠C following A?
- Can it detect when transitive inference would be wrong?

The model should use the triangle context to make an informed prediction, but the GT is what actually happened — not what "should" happen theoretically.

---

## 10. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template with `{PLACEHOLDERS}`
- [x] Data requirements: complete triangle from shepards_edges
- [x] Eligibility predicate: all 3 edges exist
- [x] GT computation: actual C→A edge (not theoretical matrix)
- [x] Response format: treatment + agree
- [x] Scoring: exact match with equal weights

**Status: ✅ FULLY DEVELOPED**

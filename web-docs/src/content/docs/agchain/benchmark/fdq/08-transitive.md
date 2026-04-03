---
title: "FDQ 08: Triangle Citation Prediction"
sidebar:
  order: 11
---

# FDQ: TRANSITIVE — Triangle Citation Prediction

**Version:** 2.0
**Date:** 2026-01-27
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

## 2. Purpose

This question tests whether the model can reason about transitive citation relationships.

**Setup:**
- Model has completed 7 prior steps in the chain
- We construct a citation triangle: three SCOTUS cases A, B, C where:
  - Case B cites Case A (edge B→A)
  - Case C cites Case B (edge C→B)
  - Case C also cites Case A (edge C→A, this is ground truth)
- Temporal ordering: A decided before B, B decided before C

**Test:**
- We give the model two known edges (B→A treatment, C→B treatment)
- We ask the model to predict the third edge (C→A treatment)
- Ground truth is the actual C→A edge from Shepard's

**Failure mode:**
- Model applies naive transitive logic (e.g., "if C follows B and B distinguishes A, then C must distinguish A")
- Model fails to recognize that citation relationships are not mathematically transitive
- Model ignores the complexity of legal citation patterns

---

## 3. System Prompt

---

## 4. TASK Window Content

```
<<<BEGIN_TASK>>>

CITATION TRIANGLE PREDICTION

Consider the following citation triangle involving three Supreme Court cases:

| Case | Name | Citation | Year |
|------|------|----------|------|
| Case A (oldest) | {CASE_A_NAME} | {CASE_A_CITE} | {CASE_A_YEAR} |
| Case B (middle) | {CASE_B_NAME} | {CASE_B_CITE} | {CASE_B_YEAR} |
| Case C (newest) | {CASE_C_NAME} | {CASE_C_CITE} | {CASE_C_YEAR} |

KNOWN CITATION RELATIONSHIPS:

1. Case B's treatment of Case A:
   - Treatment: {TREATMENT_B_TO_A}
   - Agreement: {AGREE_B_TO_A}

2. Case C's treatment of Case B:
   - Treatment: {TREATMENT_C_TO_B}
   - Agreement: {AGREE_C_TO_B}

YOUR TASK:

Based on the citation patterns and known relationships above, predict how Case C treats Case A.

Note: Citation relationships are not always transitive. Just because C follows B and B distinguishes A does not necessarily mean C distinguishes A. Consider the legal reasoning patterns that might apply.

TREATMENT VOCABULARY:
- FOLLOWS: Applies or relies on the precedent
- DISTINGUISHES: Explains why the precedent does not control
- QUESTIONS: Expresses doubt about the precedent
- CRITICIZES: Explicitly criticizes the precedent
- OVERRULES: Explicitly overrules the precedent
- LIMITS: Narrows the precedent's scope
- CITES: Mentions without significant treatment
- EXPLAINS: Describes neutrally

<<<END_TASK>>>
```

---

## 5. OUTPUT_GUARD Window Content

```
<<<BEGIN_OUTPUT_GUARD>>>

Respond with a JSON object containing exactly these fields:
{
  "predicted_treatment": "<one of: FOLLOWS, DISTINGUISHES, QUESTIONS, CRITICIZES, OVERRULES, LIMITS, CITES, EXPLAINS>",
  "predicted_agree": "<TRUE or FALSE>"
}

Return only the JSON. No explanation.

<<<END_OUTPUT_GUARD>>>
```

---

## 6. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `shepards_edges` | `citing_lexis`, `cited_lexis`, `treatment_norm`, `agree`, `supreme_court` | All three edges |
| `scdb_cases` | `caseId`, `usCite`, `lexisCite`, `caseName`, `term` | Metadata |

**Triangle requirement:**
- Edge B→A must exist
- Edge C→B must exist
- Edge C→A must exist (this is ground truth)

---

## 7. Eligibility Criteria

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

## 8. Instantiation

### 8.1 Find Triangle for Anchor

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

### 8.2 Instantiation Procedure

1. Query for complete triangle where anchor is Case C
2. Extract all metadata and edge data
3. Store C→A edge as ground truth (runner-only)
4. Convert boolean `agree_b_to_a` and `agree_c_to_b` to strings: `True` → `"TRUE"`, `False` → `"FALSE"`
5. Populate placeholders for A, B, C and known edges B→A, C→B

### 8.3 Placeholder Mapping

| Placeholder | Source |
|-------------|--------|
| `{CASE_A_NAME}` | `case_a_name` |
| `{CASE_A_CITE}` | `case_a_cite` |
| `{CASE_A_YEAR}` | `case_a_year` |
| `{CASE_B_NAME}` | `case_b_name` |
| `{CASE_B_CITE}` | `case_b_cite` |
| `{CASE_B_YEAR}` | `case_b_year` |
| `{CASE_C_NAME}` | `case_c_name` |
| `{CASE_C_CITE}` | `case_c_cite` |
| `{CASE_C_YEAR}` | `case_c_year` |
| `{TREATMENT_B_TO_A}` | `treatment_b_to_a` (uppercased) |
| `{AGREE_B_TO_A}` | `agree_b_to_a` (as "TRUE"/"FALSE") |
| `{TREATMENT_C_TO_B}` | `treatment_c_to_b` (uppercased) |
| `{AGREE_C_TO_B}` | `agree_c_to_b` (as "TRUE"/"FALSE") |

---

## 9. Response Format + Parsing

**Type:** Structured JSON

**Contract:**
```json
{
  "predicted_treatment": "FOLLOWS | DISTINGUISHES | QUESTIONS | CRITICIZES | OVERRULES | LIMITS | CITES | EXPLAINS",
  "predicted_agree": "TRUE | FALSE"
}
```

**Parsing:**
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

## 10. Scoring

### 10.1 Ground Truth

GT is the **actual** C→A edge from Shepard's — NOT a theoretical expectation matrix.

```python
def compute_gt(gt_treatment_norm: str, gt_agree: bool) -> dict:
    """Ground truth from actual Shepard's edge."""
    return {
        "treatment": gt_treatment_norm.upper(),
        "agree": "TRUE" if gt_agree else "FALSE"
    }
```

### 10.2 Scoring Function

```python
def score_transitive(response: dict, gt_treatment: str, gt_agree: str) -> dict:
    """Score transitive prediction."""
    treatment_score = 1.0 if response["treatment"] == gt_treatment.upper() else 0.0
    agree_score = 1.0 if response["agree"] == gt_agree else 0.0

    return {
        "predicted_treatment": treatment_score,
        "predicted_agree": agree_score,
        "total": 0.5 * treatment_score + 0.5 * agree_score
    }
```

### 10.3 Scoring Summary

| Sub-question | Weight | Metric |
|--------------|--------|--------|
| predicted_treatment | 0.5 | Exact match |
| predicted_agree | 0.5 | Exact match |

---

## 11. Treatment Vocabulary (Frozen)

| Shepard's Value | Response Enum | Polarity Bucket |
|-----------------|---------------|-----------------|
| follows | FOLLOWS | in_favor |
| distinguishes | DISTINGUISHES | against |
| questions | QUESTIONS | against |
| criticizes | CRITICIZES | against |
| overrules | OVERRULES | against |
| limits | LIMITS | against |
| cites | CITES | neutral |
| explains | EXPLAINS | neutral |

---

## 12. Example Instance

**Triangle:**
- **Case A:** Miranda v. Arizona, 384 U.S. 436 (1966)
- **Case B:** Harris v. New York, 401 U.S. 222 (1971)
- **Case C:** Oregon v. Hass, 420 U.S. 714 (1975)

**Known edges (given to model):**
- B→A: `DISTINGUISHES`, agree=FALSE
- C→B: `FOLLOWS`, agree=TRUE

**Ground Truth (C→A edge from Shepard's):**
- `treatment_norm` = "distinguishes"
- `agree` = FALSE

### Full Assembled Message

```
messages[0] = {role: "system", content: "[shared benchmark system prompt]"}

messages[1] = {role: "user", content: "<<<BEGIN_ENV>>>
benchmark: Legal-10
step: 8 of 10
step_id: TRANSITIVE
<<<END_ENV>>>"}

messages[2] = {role: "user", content: "<<<BEGIN_ANCHOR_PACK>>>
[p1 content - anchor opinion text for Oregon v. Hass]
<<<END_ANCHOR_PACK>>>"}

messages[3] = {role: "user", content: "<<<BEGIN_TASK>>>

CITATION TRIANGLE PREDICTION

Consider the following citation triangle involving three Supreme Court cases:

| Case | Name | Citation | Year |
|------|------|----------|------|
| Case A (oldest) | Miranda v. Arizona | 384 U.S. 436 | 1966 |
| Case B (middle) | Harris v. New York | 401 U.S. 222 | 1971 |
| Case C (newest) | Oregon v. Hass | 420 U.S. 714 | 1975 |

KNOWN CITATION RELATIONSHIPS:

1. Case B's treatment of Case A:
   - Treatment: DISTINGUISHES
   - Agreement: FALSE

2. Case C's treatment of Case B:
   - Treatment: FOLLOWS
   - Agreement: TRUE

YOUR TASK:

Based on the citation patterns and known relationships above, predict how Case C treats Case A.

Note: Citation relationships are not always transitive. Just because C follows B and B distinguishes A does not necessarily mean C distinguishes A. Consider the legal reasoning patterns that might apply.

TREATMENT VOCABULARY:
- FOLLOWS: Applies or relies on the precedent
- DISTINGUISHES: Explains why the precedent does not control
- QUESTIONS: Expresses doubt about the precedent
- CRITICIZES: Explicitly criticizes the precedent
- OVERRULES: Explicitly overrules the precedent
- LIMITS: Narrows the precedent's scope
- CITES: Mentions without significant treatment
- EXPLAINS: Describes neutrally

<<<END_TASK>>>"}

messages[4] = {role: "user", content: "<<<BEGIN_OUTPUT_GUARD>>>
Respond with a JSON object containing exactly these fields:
{
  \"predicted_treatment\": \"<one of: FOLLOWS, DISTINGUISHES, QUESTIONS, CRITICIZES, OVERRULES, LIMITS, CITES, EXPLAINS>\",
  \"predicted_agree\": \"<TRUE or FALSE>\"
}
Return only the JSON. No explanation.
<<<END_OUTPUT_GUARD>>>"}
```

### Expected Response

```json
{
  "predicted_treatment": "DISTINGUISHES",
  "predicted_agree": "FALSE"
}
```

### Scoring
- GT treatment = DISTINGUISHES ✓
- GT agree = FALSE ✓
- Score = 1.0

---

## 13. Design Rationale

### Why This Works (Unlike TRANS-TREATMENT)

| Aspect | TRANS-TREATMENT (Rejected) | TRANSITIVE v2 (This FDQ) |
|--------|---------------------------|--------------------------|
| Ground truth source | Theoretical matrix | Actual Shepard's edge |
| What model predicts | "Expected" treatment | Real treatment |
| Validity | Matrix doesn't match reality | GT is ground truth by definition |
| Tests | Arbitrary rule following | Legal reasoning about citations |

### What This Question Tests

- Can the model reason about citation relationships?
- Does it understand that C following B ≠ C following A?
- Can it detect when transitive inference would be wrong?

The model should use the triangle context to make an informed prediction, but the GT is what actually happened — not what "should" happen theoretically.

### Why Use Actual Shepard's Edge as GT?

A theoretical "transitivity matrix" (e.g., "if B follows A and C follows B, then C follows A") does not match reality. Legal citation relationships are more nuanced:
- A case can follow one aspect of a precedent while distinguishing another
- Courts make independent judgments about earlier cases
- The reasoning chain B→A + C→B does not determine C→A

Using the actual C→A edge from Shepard's ensures we test whether the model can predict real citation behavior, not whether it can follow an artificial rule.

### Why Temporal Ordering Matters

The constraint A < B < C (by decision date) ensures:
- Case B could actually cite Case A (B came after A)
- Case C could actually cite both (C came after A and B)
- The triangle represents a real citation evolution over time

### Why This Is Level 3 Reasoning

Unlike single-edge questions (Level 2), this requires:
- Understanding two separate citation relationships
- Reasoning about how they might combine
- Recognizing when naive transitivity fails

---

## 14. FDQ Checklist

- [x] Question ID + family
- [x] Purpose documented
- [x] System prompt (shared reference)
- [x] TASK window content with placeholders
- [x] OUTPUT_GUARD window content
- [x] Data requirements with triangle structure
- [x] Eligibility predicate (complete triangle SQL)
- [x] Instantiation query + procedure + mapping
- [x] Response format + parsing
- [x] Scoring with actual Shepard's GT
- [x] Treatment vocabulary frozen
- [x] Full example with assembled messages
- [x] Design rationale (preserved + expanded)

**Status: ✅ FULLY DEVELOPED**

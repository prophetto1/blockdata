# FDQ: DISTINGUISH — Treatment Recognition

**Version:** 1.0  
**Date:** 2026-01-23  
**Status:** Implementation-Ready  
**Chain Position:** 5

---

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `DISTINGUISH` |
| **Family** | Citation Treatment |
| **Scoring** | Deterministic |
| **Sub-questions** | 2 (treatment + agree) |

---

## 2. Prompt Template

```
In this Supreme Court opinion, the Court cites {CITED_CASE_NAME}, {CITED_US_CITE}.

Based on the language used in the opinion when discussing this citation:

1. TREATMENT: How does the opinion treat this precedent?
   Respond with exactly one of: FOLLOWS, DISTINGUISHES, QUESTIONS, CRITICIZES, OVERRULES, LIMITS, CITES, EXPLAINS

2. AGREEMENT: Does the opinion agree with the cited precedent's holding?
   Respond with exactly: TRUE or FALSE

Respond in the following JSON format:
{
  "treatment": "<treatment value>",
  "agree": "<TRUE or FALSE>"
}
```

---

## 3. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `scotus_citations_ranked_flat` | `anchor_usCite`, `cited_usCite`, `fowler_score` | Citation pairs, authority ranking |
| `scdb_cases` | `usCite`, `lexisCite`, `caseName` | Crosswalk + metadata |
| `shepards_edges` | `citing_lexis`, `cited_lexis`, `treatment_norm`, `agree` | Ground truth |

**Join path:**
```sql
scotus_citations_ranked_flat c
  JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
  JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
  JOIN shepards_edges s 
    ON anchor_scdb.lexisCite = s.citing_lexis 
    AND cited_scdb.lexisCite = s.cited_lexis
```

**Null handling:** 
- `treatment_norm IS NULL` → ineligible
- `agree IS NULL` → ineligible

**Context requirement:** Opinion text must be available via p1 injection for model to analyze treatment language.

---

## 4. Eligibility Criteria

```sql
SELECT DISTINCT c.anchor_usCite, c.cited_usCite
FROM scotus_citations_ranked_flat c
JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
JOIN shepards_edges s 
    ON anchor_scdb.lexisCite = s.citing_lexis 
    AND cited_scdb.lexisCite = s.cited_lexis
WHERE s.treatment_norm IS NOT NULL
  AND s.agree IS NOT NULL
  AND s.treatment_norm IN ('follows', 'distinguishes', 'questions', 'criticizes', 
                           'overrules', 'limits', 'cites', 'explains');
```

**Coverage:** ~50,000+ citation pairs with Shepard's treatment

---

## 5. Instantiation Query

```sql
SELECT 
    c.anchor_usCite,
    c.cited_usCite,
    cited_scdb.caseName AS cited_case_name,
    s.treatment_norm,
    s.agree
FROM scotus_citations_ranked_flat c
JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
JOIN shepards_edges s 
    ON anchor_scdb.lexisCite = s.citing_lexis 
    AND cited_scdb.lexisCite = s.cited_lexis
WHERE c.anchor_usCite = '{TARGET_ANCHOR}'
  AND s.treatment_norm IS NOT NULL
  AND s.agree IS NOT NULL
ORDER BY c.fowler_score DESC NULLS LAST, c.cited_usCite ASC
LIMIT 1;
```

**Selection logic:** Pick the highest-authority cited case with a Shepard's treatment edge.

**Placeholder mapping:**
- `{CITED_CASE_NAME}` ← `cited_case_name`
- `{CITED_US_CITE}` ← `cited_usCite`

---

## 6. Response Format

**Type:** Structured JSON

**Contract:**
```json
{
  "treatment": "FOLLOWS | DISTINGUISHES | QUESTIONS | CRITICIZES | OVERRULES | LIMITS | CITES | EXPLAINS",
  "agree": "TRUE | FALSE"
}
```

**Parsing rules:**
```python
VALID_TREATMENTS = {
    "FOLLOWS", "DISTINGUISHES", "QUESTIONS", "CRITICIZES", 
    "OVERRULES", "LIMITS", "CITES", "EXPLAINS"
}

def parse_response(response: str) -> dict:
    """Parse and normalize treatment response."""
    try:
        data = json.loads(response)
        treatment = data.get("treatment", "").strip().upper()
        agree = data.get("agree", "").strip().upper()
        
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

### 7.1 Ground Truth Computation

```python
def compute_treatment_gt(treatment_norm: str) -> str:
    """Normalize Shepard's treatment to response enum."""
    mapping = {
        "follows": "FOLLOWS",
        "distinguishes": "DISTINGUISHES",
        "questions": "QUESTIONS",
        "criticizes": "CRITICIZES",
        "overrules": "OVERRULES",
        "limits": "LIMITS",
        "cites": "CITES",
        "explains": "EXPLAINS",
    }
    return mapping.get(treatment_norm.lower(), "CITES")

def compute_agree_gt(agree: bool) -> str:
    """Convert boolean to response enum."""
    return "TRUE" if agree else "FALSE"
```

### 7.2 Scoring Function

```python
def score_distinguish(response: dict, treatment_norm: str, agree: bool) -> float:
    """Score treatment recognition response."""
    gt_treatment = compute_treatment_gt(treatment_norm)
    gt_agree = compute_agree_gt(agree)
    
    treatment_score = 1.0 if response["treatment"] == gt_treatment else 0.0
    agree_score = 1.0 if response["agree"] == gt_agree else 0.0
    
    # Equal weighting
    return 0.5 * treatment_score + 0.5 * agree_score
```

### 7.3 Scoring Summary

| Sub-question | Weight | Metric |
|--------------|--------|--------|
| treatment | 0.5 | Exact match |
| agree | 0.5 | Exact match |

---

## 8. Treatment Vocabulary (Frozen)

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

## 9. Example Instance

**Anchor:** 505 U.S. 833 (Planned Parenthood v. Casey)

**Selected Citation:**
- `{CITED_CASE_NAME}` = "Roe v. Wade"
- `{CITED_US_CITE}` = "410 U.S. 113"

**Shepard's Edge:**
- `treatment_norm` = "follows"
- `agree` = True

**Instantiated Prompt:**
> In this Supreme Court opinion, the Court cites ROE et al. v. WADE, 410 U.S. 113.
>
> Based on the language used in the opinion when discussing this citation:
>
> 1. TREATMENT: How does the opinion treat this precedent?
> 2. AGREEMENT: Does the opinion agree with the cited precedent's holding?

**Ground Truth:**
```json
{
  "treatment": "FOLLOWS",
  "agree": "TRUE"
}
```

---

## 10. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template with `{PLACEHOLDERS}`
- [x] Data requirements: 3 tables joined
- [x] Eligibility predicate: non-null treatment_norm
- [x] GT computation: direct from Shepard's edge
- [x] Response format: closed enums with parsing
- [x] Scoring: exact match with equal weights
- [x] Treatment vocabulary frozen

**Status: ✅ FULLY DEVELOPED**

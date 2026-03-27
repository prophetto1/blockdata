# FDQ: VALIDATE-AUTH — Cross-Reference Consistency

**Version:** 1.0  
**Date:** 2026-01-23  
**Status:** Implementation-Ready  
**Chain Position:** 6

---

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `VALIDATE-AUTH` |
| **Family** | Citation Validation |
| **Scoring** | Deterministic |
| **Reasoning Depth** | Level 2 (source integration) |

---

## 2. Prompt Template

```
You have been provided with:
1. A curated list of authorities 
2. Citation edges from the Shepard's citator database

For the citation {CITED_US_CITE} ({CITED_CASE_NAME}):

- Curated list status: {CURATED_STATUS}
- Citator edge status: {CITATOR_STATUS}

Based on these two sources, what is the consistency status of this citation?

Respond with exactly one of:
- CONSISTENT: Citation appears in both sources with same polarity category (both supporting, both neutral, or both limiting)
- INCONSISTENT: Citation appears in both sources but with conflicting polarity categories
- CURATED_ONLY: Citation appears only in the curated list
- CITATOR_ONLY: Citation appears only in the citator database

{
  "consistency_flag": "<CONSISTENT | INCONSISTENT | CURATED_ONLY | CITATOR_ONLY>"
}
```

---

## 3. Data Requirements

| Source | Content | Role |
|--------|---------|------|
| **Curated list** | Research Pack authorities | Expert-selected citations |
| **Citator edges** | `shepards_edges` | Database-derived citations |
| **Citation inventory** | `citation_inventory.parquet` | Union of both sources |

**Join logic:**
- Curated citations from `citation_inventory` where `source = 'curated'` or `in_rp = TRUE`
- Citator citations from `shepards_edges` via lexisCite join

---

## 4. Eligibility Criteria

```sql
-- Need citations that appear in at least one source
SELECT DISTINCT ci.normalized_cite
FROM citation_inventory ci
WHERE ci.anchor_caseId = '{TARGET_ANCHOR_ID}'
  AND (
    ci.in_rp = TRUE  -- in curated/Research Pack
    OR EXISTS (
      SELECT 1 FROM shepards_edges s
      JOIN scdb_cases anchor ON anchor.usCite = ci.anchor_usCite
      JOIN scdb_cases cited ON cited.usCite = ci.normalized_cite
      WHERE s.citing_lexis = anchor.lexisCite
        AND s.cited_lexis = cited.lexisCite
    )
  );
```

**Coverage:** All anchors with citation inventories.

---

## 5. Instantiation Query

### 5.1 Compute Consistency Flag

```python
def compute_consistency_flag(
    in_curated: bool, 
    in_citator: bool,
    curated_treatment: str | None,
    citator_treatment: str | None
) -> str:
    """
    Deterministic consistency flag computation.
    
    Args:
        in_curated: Citation appears in Research Pack curated list
        in_citator: Citation has edge in Shepard's
        curated_treatment: Treatment label from curated list (if any)
        citator_treatment: treatment_norm from Shepard's (if any)
    
    Returns:
        One of: CONSISTENT, INCONSISTENT, CURATED_ONLY, CITATOR_ONLY
    """
    if in_curated and in_citator:
        # Both sources have it - check treatment match
        if curated_treatment is None or citator_treatment is None:
            return "CONSISTENT"  # Can't compare polarity, default to consistent
        
        # Normalize for comparison (lowercase, strip whitespace)
        curated_norm = curated_treatment.lower().strip()
        citator_norm = citator_treatment.lower().strip()
        
        if treatments_match(curated_norm, citator_norm):
            return "CONSISTENT"
        else:
            return "INCONSISTENT"
    
    elif in_curated and not in_citator:
        return "CURATED_ONLY"
    
    elif not in_curated and in_citator:
        return "CITATOR_ONLY"
    
    else:
        # Should not reach here if eligibility is correct
        raise ValueError("Citation not in either source")


def treatments_match(t1: str, t2: str) -> bool:
    """Check if two treatments are in the same polarity bucket."""
    bucket1 = get_polarity_bucket(t1)
    bucket2 = get_polarity_bucket(t2)
    return bucket1 == bucket2


def get_polarity_bucket(treatment: str) -> str:
    """Map treatment to polarity bucket. Handles both Shepard's and curated vocabulary."""
    mapping = {
        # Shepard's vocabulary
        "follows": "in_favor",
        "distinguishes": "against",
        "questions": "against",
        "criticizes": "against",
        "overrules": "against",
        "limits": "against",
        "cites": "neutral",
        "explains": "neutral",
        # Curated list vocabulary
        "supporting": "in_favor",
        "limiting": "against",
        "neutral": "neutral",
    }
    return mapping.get(treatment.lower(), "neutral")
```

### 5.2 SQL Query for Status

```sql
WITH curated AS (
    SELECT normalized_cite, treatment_label
    FROM citation_inventory
    WHERE anchor_caseId = '{TARGET_ANCHOR_ID}'
      AND in_rp = TRUE
),
citator AS (
    SELECT cited.usCite AS normalized_cite, s.treatment_norm
    FROM shepards_edges s
    JOIN scdb_cases anchor ON s.citing_lexis = anchor.lexisCite
    JOIN scdb_cases cited ON s.cited_lexis = cited.lexisCite
    WHERE anchor.caseId = '{TARGET_ANCHOR_ID}'
)
SELECT 
    COALESCE(c.normalized_cite, t.normalized_cite) AS cite,
    c.normalized_cite IS NOT NULL AS in_curated,
    t.normalized_cite IS NOT NULL AS in_citator,
    c.treatment_label AS curated_treatment,
    t.treatment_norm AS citator_treatment
FROM curated c
FULL OUTER JOIN citator t ON c.normalized_cite = t.normalized_cite
WHERE c.normalized_cite IS NOT NULL OR t.normalized_cite IS NOT NULL;
```

### 5.3 Instantiation Procedure

1. Run status query for target anchor
2. For each citation, compute consistency_flag using `compute_consistency_flag()`
3. Select one citation per category for balanced testing (or random if single question)
4. Populate placeholders:
   - `{CITED_US_CITE}` ← selected citation
   - `{CITED_CASE_NAME}` ← from scdb_cases
   - `{CURATED_STATUS}` ← "Present (polarity: in_favor)" or "Present (polarity: neutral)" or "Not present"
   - `{CITATOR_STATUS}` ← "Present (polarity: against)" or "Present (polarity: neutral)" or "Not present"

---

## 6. Response Format

**Type:** Closed enum

**Contract:**
```json
{
  "consistency_flag": "CONSISTENT | INCONSISTENT | CURATED_ONLY | CITATOR_ONLY"
}
```

**Parsing rules:**
```python
VALID_FLAGS = {"CONSISTENT", "INCONSISTENT", "CURATED_ONLY", "CITATOR_ONLY"}

def parse_response(response: str) -> str:
    """Parse and normalize consistency flag response."""
    try:
        data = json.loads(response)
        flag = data.get("consistency_flag", "").strip().upper()
        flag = flag.replace(" ", "_")  # Handle spacing variations
        return flag if flag in VALID_FLAGS else "INVALID"
    except json.JSONDecodeError:
        return "INVALID"
```

---

## 7. Scoring Specification

### 7.1 Ground Truth

GT is computed by `compute_consistency_flag()` at build time and stored in EU ground truth.

### 7.2 Scoring Function

```python
def score_validate_auth(response: str, ground_truth: str) -> float:
    """Score consistency flag response."""
    parsed = parse_response(response)
    
    if parsed == "INVALID":
        return 0.0
    
    return 1.0 if parsed == ground_truth else 0.0
```

### 7.3 Scoring Summary

| Condition | Score |
|-----------|-------|
| Exact match on GT flag | 1.0 |
| Mismatch or invalid | 0.0 |

---

## 8. Example Instances

### Instance A: CONSISTENT

**Input:**
- `{CITED_US_CITE}` = "410 U.S. 113"
- `{CITED_CASE_NAME}` = "Roe v. Wade"
- `{CURATED_STATUS}` = "Present (treatment: supporting)"
- `{CITATOR_STATUS}` = "Present (treatment: follows)"

**Ground Truth:** `CONSISTENT` (both in_favor bucket)

### Instance B: CURATED_ONLY

**Input:**
- `{CITED_US_CITE}` = "123 U.S. 456"
- `{CITED_CASE_NAME}` = "Smith v. Jones"
- `{CURATED_STATUS}` = "Present"
- `{CITATOR_STATUS}` = "Not present"

**Ground Truth:** `CURATED_ONLY`

### Instance C: INCONSISTENT

**Input:**
- `{CITED_US_CITE}` = "268 U.S. 510"
- `{CITED_CASE_NAME}` = "Pierce v. Society of Sisters"
- `{CURATED_STATUS}` = "Present (treatment: supporting)"
- `{CITATOR_STATUS}` = "Present (treatment: distinguishes)"

**Ground Truth:** `INCONSISTENT` (in_favor vs against)

---

## 9. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template with `{PLACEHOLDERS}`
- [x] Data requirements: citation_inventory + shepards_edges
- [x] Eligibility predicate defined
- [x] GT computation: `compute_consistency_flag()` fully specified
- [x] Response format: closed 4-value enum
- [x] Scoring: exact match

**Status: ✅ FULLY DEVELOPED**

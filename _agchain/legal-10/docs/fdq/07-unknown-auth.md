# FDQ: UNKNOWN-AUTH — Reverse Citation Lookup

**Version:** 1.0  
**Date:** 2026-01-23  
**Status:** Implementation-Ready  
**Chain Position:** 7

---

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `UNKNOWN-AUTH` |
| **Family** | Citation Discovery |
| **Scoring** | Deterministic (MRR) |
| **Reasoning Depth** | Level 2 (reverse lookup) |

---

## 2. Prompt Template

```
The precedent {CITED_CASE_NAME}, {CITED_US_CITE} ({CITED_YEAR}) is cited by several Supreme Court opinions.

Based on your knowledge, identify Supreme Court cases that cite this precedent.

List up to 10 citing cases, ordered by your confidence (most confident first).

Respond in the following JSON format:
{
  "citing_cases": [
    {"us_cite": "<citation>", "case_name": "<name>"},
    ...
  ]
}
```

---

## 3. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `shepards_edges` | `citing_lexis`, `cited_lexis` | Reverse lookup |
| `scdb_cases` | `usCite`, `lexisCite`, `caseName`, `term` | Crosswalk + metadata |
| `scotus_citations_ranked_flat` | `anchor_usCite`, `cited_usCite`, `fowler_score` | Validation, authority ranking |

**Join path (reverse):**
```sql
-- Find all cases that cite X
SELECT anchor.usCite, anchor.caseName
FROM shepards_edges s
JOIN scdb_cases cited ON s.cited_lexis = cited.lexisCite
JOIN scdb_cases anchor ON s.citing_lexis = anchor.lexisCite
WHERE cited.usCite = '{TARGET_CITED}'
  AND s.supreme_court = 1;
```

---

## 4. Eligibility Criteria

```sql
-- Precedent must be cited by at least 3 SCOTUS cases
SELECT cited.usCite, cited.caseName, COUNT(DISTINCT anchor.usCite) as citing_count
FROM shepards_edges s
JOIN scdb_cases cited ON s.cited_lexis = cited.lexisCite
JOIN scdb_cases anchor ON s.citing_lexis = anchor.lexisCite
WHERE s.supreme_court = 1
GROUP BY cited.usCite, cited.caseName
HAVING COUNT(DISTINCT anchor.usCite) >= 3;
```

**Coverage:** ~10,000+ cited precedents with sufficient citing cases.

---

## 5. Instantiation Query

### 5.1 Select Target Precedent

```sql
-- Select a well-cited precedent from the anchor's citation inventory
SELECT DISTINCT c.cited_usCite, cited.caseName, cited.term
FROM scotus_citations_ranked_flat c
JOIN scdb_cases cited ON c.cited_usCite = cited.usCite
WHERE c.anchor_usCite = '{TARGET_ANCHOR}'
  AND EXISTS (
    SELECT 1 FROM shepards_edges s
    JOIN scdb_cases d ON s.cited_lexis = d.lexisCite
    JOIN scdb_cases a ON s.citing_lexis = a.lexisCite
    WHERE d.usCite = c.cited_usCite
      AND s.supreme_court = 1
    GROUP BY d.usCite
    HAVING COUNT(DISTINCT a.usCite) >= 3
  )
ORDER BY c.fowler_score DESC NULLS LAST
LIMIT 1;
```

### 5.2 Compute Ground Truth (Citing Cases)

```sql
-- Get all SCOTUS cases that cite this precedent
SELECT DISTINCT anchor.usCite, anchor.caseName
FROM shepards_edges s
JOIN scdb_cases cited ON s.cited_lexis = cited.lexisCite
JOIN scdb_cases anchor ON s.citing_lexis = anchor.lexisCite
WHERE cited.usCite = '{TARGET_CITED}'
  AND s.supreme_court = 1
ORDER BY anchor.term DESC, anchor.usCite ASC;
```

### 5.3 Instantiation Procedure

1. Select target precedent from anchor's citation inventory
2. Query all SCOTUS cases that cite this precedent
3. Store citing case list as ground truth
4. Populate placeholders:
   - `{CITED_CASE_NAME}` ← precedent case name
   - `{CITED_US_CITE}` ← precedent citation
   - `{CITED_YEAR}` ← precedent term/year

---

## 6. Response Format

**Type:** Structured JSON (ranked list)

**Contract:**
```json
{
  "citing_cases": [
    {"us_cite": "505 U.S. 833", "case_name": "Planned Parenthood v. Casey"},
    {"us_cite": "410 U.S. 179", "case_name": "Doe v. Bolton"},
    ...
  ]
}
```

**Parsing rules:**
```python
def parse_response(response: str) -> list[str]:
    """Parse and extract citing case citations in rank order."""
    try:
        data = json.loads(response)
        citing = data.get("citing_cases", [])
        
        # Extract just the citations in order
        return [normalize_cite(c.get("us_cite", "")) for c in citing if c.get("us_cite")]
    except json.JSONDecodeError:
        return []
```

---

## 7. Scoring Specification

### 7.1 Mean Reciprocal Rank (MRR)

MRR measures how quickly the model finds a correct answer in its ranked list.

```python
def compute_mrr(predicted_list: list[str], ground_truth_set: set[str]) -> float:
    """
    Compute Mean Reciprocal Rank.
    
    Score = 1/rank of first correct answer, or 0 if none in top 10.
    """
    for rank, cite in enumerate(predicted_list[:10], start=1):
        normalized = normalize_cite(cite)
        if normalized in ground_truth_set:
            return 1.0 / rank
    
    return 0.0
```

### 7.2 Alternative: Recall@K

```python
def compute_recall_at_k(predicted_list: list[str], ground_truth_set: set[str], k: int = 10) -> float:
    """
    Compute Recall@K.
    
    Score = (# correct in top K) / min(K, |ground_truth|)
    """
    predicted_set = set(normalize_cite(c) for c in predicted_list[:k])
    hits = len(predicted_set & ground_truth_set)
    
    return hits / min(k, len(ground_truth_set))
```

### 7.3 Scoring Function (Primary: MRR)

```python
def score_unknown_auth(response: list[str], ground_truth: list[str]) -> float:
    """Score reverse lookup response using MRR."""
    gt_set = set(normalize_cite(c) for c in ground_truth)
    return compute_mrr(response, gt_set)
```

### 7.4 Scoring Summary

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| MRR | 1/rank of first hit | Higher = faster to find correct answer |
| MRR = 1.0 | First prediction is correct | |
| MRR = 0.5 | Second prediction is correct | |
| MRR = 0.0 | No correct answer in top 10 | |

---

## 8. Example Instance

**Target Precedent:**
- `{CITED_CASE_NAME}` = "Roe v. Wade"
- `{CITED_US_CITE}` = "410 U.S. 113"
- `{CITED_YEAR}` = "1973"

**Ground Truth (citing cases):**
```
["505 U.S. 833", "492 U.S. 490", "476 U.S. 747", "462 U.S. 416", ...]
```

**Example Model Response:**
```json
{
  "citing_cases": [
    {"us_cite": "505 U.S. 833", "case_name": "Planned Parenthood v. Casey"},
    {"us_cite": "492 U.S. 490", "case_name": "Webster v. Reproductive Health"},
    {"us_cite": "428 U.S. 52", "case_name": "Planned Parenthood v. Danforth"}
  ]
}
```

**Score (MRR):** `1.0` (first prediction "505 U.S. 833" is in ground truth)

---

## 9. Design Notes

### Why MRR?

- Standard IR metric for ranked retrieval
- Rewards models that put correct answers early
- Single score (not list comparison complexity)
- Tolerant of incomplete recall (we don't expect model to find all citing cases)

### Pretraining Consideration

This question does allow the model to use pretraining knowledge about citation relationships. That's intentional — we're testing whether the model's internal knowledge graph is accurate, not whether it can avoid using it.

If you want to test **only** within-materials knowledge, use CANARY instead.

---

## 10. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template with `{PLACEHOLDERS}`
- [x] Data requirements: shepards_edges reverse join
- [x] Eligibility predicate: ≥3 citing cases
- [x] GT computation: all SCOTUS citing cases
- [x] Response format: ranked list with parsing
- [x] Scoring: MRR metric defined

**Status: ✅ FULLY DEVELOPED**

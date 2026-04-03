---
title: "FDQ 01: Known Authority (SCOTUS)"
sidebar:
  order: 1
---

# FDQ: KA-SC — Known Authority (SCOTUS)

**Version:** 1.0  
**Date:** 2026-01-23  
**Status:** Implementation-Ready  
**Chain Position:** 1 (Fixed — Always First)

---

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `KA-SC` |
| **Family** | Known Authority |
| **Scoring** | Deterministic |
| **Sub-questions** | 4 |

---

## 2. Prompt Template

```
Based on the Supreme Court opinion provided, answer the following questions about the citations used in this opinion.

For each question, respond with the requested citation(s) in standard U.S. reporter format.

1. CONTROLLING AUTHORITY: Which single cited case has the highest precedential authority?

2. IN-FAVOR CITATIONS: Which cited cases does the opinion follow, apply, or rely upon as supporting authority?

3. AGAINST CITATIONS: Which cited cases does the opinion distinguish, question, criticize, or limit?

4. MOST FREQUENT: Which single cited case appears most often in the opinion text?

Respond in the following JSON format:
{
  "controlling_authority": "<citation>",
  "in_favor": ["<citation>", ...],
  "against": ["<citation>", ...],
  "most_frequent": "<citation>"
}
```

---

## 3. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `scotus_citations_ranked_flat` | `anchor_usCite`, `cited_usCite`, `fowler_score`, `occurrences`, `normalized_cite` | Authority ranking, frequency |
| `scdb_cases` | `usCite`, `lexisCite`, `caseName` | Crosswalk + metadata |
| `shepards_edges` | `citing_lexis`, `cited_lexis`, `treatment_norm`, `agree` | Treatment signals |

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
- `fowler_score IS NULL` → exclude from controlling_authority ranking
- `treatment_norm IS NULL` → exclude from in_favor/against lists
- `occurrences IS NULL` → exclude from most_frequent

---

## 4. Eligibility Criteria

```sql
SELECT DISTINCT anchor_usCite
FROM scotus_citations_ranked_flat c
WHERE EXISTS (
    SELECT 1 FROM scotus_citations_ranked_flat 
    WHERE anchor_usCite = c.anchor_usCite AND fowler_score IS NOT NULL
)
AND EXISTS (
    SELECT 1 FROM scotus_citations_ranked_flat c2
    JOIN scdb_cases a ON c2.anchor_usCite = a.usCite
    JOIN scdb_cases d ON c2.cited_usCite = d.usCite
    JOIN shepards_edges s ON a.lexisCite = s.citing_lexis AND d.lexisCite = s.cited_lexis
    WHERE c2.anchor_usCite = c.anchor_usCite
);
```

**Coverage:** ~15,000+ anchors

---

## 5. Ground Truth Computation

### 5.1 Controlling Authority (Fowler)

```sql
SELECT cited_usCite
FROM scotus_citations_ranked_flat
WHERE anchor_usCite = '{TARGET_ANCHOR}'
  AND fowler_score IS NOT NULL
ORDER BY fowler_score DESC, occurrences DESC, cited_usCite ASC
LIMIT 1;
```

**Tie-break order:**
1. `fowler_score` DESC
2. `occurrences` DESC
3. `cited_usCite` ASC (lexicographic)

### 5.2 In-Favor Citations

```sql
SELECT DISTINCT c.cited_usCite
FROM scotus_citations_ranked_flat c
JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
JOIN shepards_edges s 
    ON anchor_scdb.lexisCite = s.citing_lexis 
    AND cited_scdb.lexisCite = s.cited_lexis
WHERE c.anchor_usCite = '{TARGET_ANCHOR}'
  AND s.treatment_norm = 'follows';
```

### 5.3 Against Citations

```sql
SELECT DISTINCT c.cited_usCite
FROM scotus_citations_ranked_flat c
JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
JOIN shepards_edges s 
    ON anchor_scdb.lexisCite = s.citing_lexis 
    AND cited_scdb.lexisCite = s.cited_lexis
WHERE c.anchor_usCite = '{TARGET_ANCHOR}'
  AND s.treatment_norm IN ('distinguishes', 'questions', 'criticizes', 'overrules', 'limits');
```

### 5.4 Most Frequent

```sql
SELECT cited_usCite
FROM scotus_citations_ranked_flat
WHERE anchor_usCite = '{TARGET_ANCHOR}'
  AND occurrences IS NOT NULL
ORDER BY occurrences DESC, fowler_score DESC, cited_usCite ASC
LIMIT 1;
```

---

## 6. Response Format

**Type:** Structured JSON

**Contract:**
```json
{
  "controlling_authority": "string (one citation)",
  "in_favor": ["string", ...],
  "against": ["string", ...],
  "most_frequent": "string (one citation)"
}
```

**Parsing rules:**
```python
def parse_response(response: str) -> dict:
    """Parse and validate KA-SC response."""
    try:
        data = json.loads(response)
        return {
            "controlling_authority": normalize_cite(data.get("controlling_authority", "")),
            "in_favor": [normalize_cite(c) for c in data.get("in_favor", [])],
            "against": [normalize_cite(c) for c in data.get("against", [])],
            "most_frequent": normalize_cite(data.get("most_frequent", ""))
        }
    except json.JSONDecodeError:
        return None
```

---

## 7. Scoring Specification

### 7.1 Sub-Question Weights

| Sub-question | Weight | Metric |
|--------------|--------|--------|
| controlling_authority | 0.25 | Exact match |
| in_favor | 0.25 | F1 score |
| against | 0.25 | F1 score |
| most_frequent | 0.25 | Exact match |

### 7.2 Scoring Functions

```python
def score_exact_match(predicted: str, ground_truth: str) -> float:
    """Score single citation exact match."""
    return 1.0 if normalize_cite(predicted) == normalize_cite(ground_truth) else 0.0

def score_f1(predicted: list, ground_truth: list) -> float:
    """Score citation list with F1."""
    pred_set = set(normalize_cite(c) for c in predicted)
    gt_set = set(normalize_cite(c) for c in ground_truth)
    
    if not gt_set:
        return 1.0 if not pred_set else 0.0
    if not pred_set:
        return 0.0
    
    tp = len(pred_set & gt_set)
    precision = tp / len(pred_set)
    recall = tp / len(gt_set)
    
    if precision + recall == 0:
        return 0.0
    return 2 * (precision * recall) / (precision + recall)

def score_ka_sc(response: dict, ground_truth: dict) -> float:
    """Compute total KA-SC score."""
    s1 = score_exact_match(response["controlling_authority"], ground_truth["controlling_authority"])
    s2 = score_f1(response["in_favor"], ground_truth["in_favor"])
    s3 = score_f1(response["against"], ground_truth["against"])
    s4 = score_exact_match(response["most_frequent"], ground_truth["most_frequent"])
    
    return 0.25 * s1 + 0.25 * s2 + 0.25 * s3 + 0.25 * s4
```

---

## 8. Policy Decisions (Frozen)

| Policy | Decision |
|--------|----------|
| Reporter scope | U.S. only (SCOTUS citations) |
| Pin cite normalization | Normalize to base cite (e.g., `268 U.S. 394, 397` → `268 U.S. 394`) |
| Deduplication | Score on unique normalized cites |
| In-favor treatment | `follows` only |
| Against treatments | `distinguishes`, `questions`, `criticizes`, `overrules`, `limits` |

---

## 9. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template
- [x] Data requirements: tables, columns, joins specified
- [x] Eligibility predicate
- [x] GT computation queries for all 4 sub-questions
- [x] Response format with parsing rules
- [x] Scoring: weights + F1/exact match defined

**Status: ✅ FULLY DEVELOPED**

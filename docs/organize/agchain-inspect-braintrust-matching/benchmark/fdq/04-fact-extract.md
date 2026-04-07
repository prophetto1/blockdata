# FDQ: FACT-EXTRACT — Fact Extraction from SCDB

**Version:** 1.0  
**Date:** 2026-01-23  
**Status:** Implementation-Ready  
**Chain Position:** 4

---

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `FACT-EXTRACT` |
| **Family** | Fact Extraction |
| **Scoring** | Deterministic |
| **Sub-questions** | 2 |

---

## 2. Prompt Template

```
The Supreme Court Database (SCDB) records the following information about this case:

Case: {CASE_NAME}
Citation: {US_CITE}
SCDB Case ID: {CASE_ID}
SCDB Disposition Code: {DISPOSITION_CODE}
SCDB PartyWinning Code: {PARTY_WINNING_CODE}

Based on the SCDB codes, answer the following:

1. REVERSAL: Did the Supreme Court reverse the lower court's judgment?
   Respond with exactly: TRUE or FALSE

2. PREVAILING PARTY: Which party prevailed in the Supreme Court's decision?
   Respond with exactly one of: PETITIONER, RESPONDENT, or UNCLEAR

Respond in the following JSON format:
{
  "reversal": "<TRUE or FALSE>",
  "prevailing_party": "<PETITIONER, RESPONDENT, or UNCLEAR>"
}
```

---

## 3. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `scdb_cases` | `caseId`, `usCite`, `caseName`, `caseDisposition`, `partyWinning` | Source of truth |

**Null handling:** 
- `caseDisposition IS NULL` → ineligible
- `partyWinning IS NULL` → ineligible
- `usCite IS NULL` → ineligible

---

## 4. Eligibility Criteria

```sql
SELECT caseId, usCite, caseName, caseDisposition, partyWinning
FROM scdb_cases
WHERE caseDisposition IS NOT NULL
  AND partyWinning IS NOT NULL
  AND usCite IS NOT NULL
  AND caseDisposition IN ('1','2','3','4','5','6','7','8','9','10','11')
  AND partyWinning IN ('0','1','2','3');
```

**Coverage:** ~28,000 cases (99%+ of SCDB)

---

## 5. Instantiation Query

```sql
SELECT 
    caseId AS case_id,
    usCite AS us_cite,
    caseName AS case_name,
    caseDisposition AS disposition_code,
    partyWinning AS party_winning_code
FROM scdb_cases
WHERE caseId = '{TARGET_CASE_ID}'
  AND caseDisposition IS NOT NULL
  AND partyWinning IS NOT NULL;
```

**Placeholder mapping:**
- `{CASE_NAME}` ← `case_name`
- `{US_CITE}` ← `us_cite`
- `{CASE_ID}` ← `case_id`
- `{DISPOSITION_CODE}` ← `disposition_code`
- `{PARTY_WINNING_CODE}` ← `party_winning_code`

---

## 6. Response Format

**Type:** Structured JSON

**Contract:**
```json
{
  "reversal": "TRUE | FALSE",
  "prevailing_party": "PETITIONER | RESPONDENT | UNCLEAR"
}
```

**Parsing rules:**
```python
def parse_response(response: str) -> dict:
    """Parse and normalize fact extraction response."""
    try:
        data = json.loads(response)
        reversal = data.get("reversal", "").strip().upper()
        party = data.get("prevailing_party", "").strip().upper()
        
        # Normalize
        if reversal not in ("TRUE", "FALSE"):
            reversal = "INVALID"
        if party not in ("PETITIONER", "RESPONDENT", "UNCLEAR"):
            party = "INVALID"
            
        return {"reversal": reversal, "prevailing_party": party}
    except json.JSONDecodeError:
        return {"reversal": "INVALID", "prevailing_party": "INVALID"}
```

---

## 7. Scoring Specification

### 7.1 Ground Truth Computation — Reversal

**Frozen Disposition → Reversal Mapping:**

| SCDB Code | Disposition Label | Reversal (GT) |
|-----------|-------------------|---------------|
| 1 | stay, cert or writ denied/dismissed | FALSE |
| 2 | affirmed | FALSE |
| 3 | reversed | TRUE |
| 4 | reversed and remanded | TRUE |
| 5 | vacated and remanded | TRUE |
| 6 | affirmed and reversed in part | FALSE |
| 7 | affirmed and reversed in part and remanded | FALSE |
| 8 | vacated | TRUE |
| 9 | petition granted or jurisdiction postponed | FALSE |
| 10 | certification to or from lower court | FALSE |
| 11 | no disposition | FALSE |

**Rationale for codes 6, 7:** Mixed dispositions do not constitute a full reversal; scored as FALSE for determinism.

```python
REVERSAL_MAP = {
    "1": "FALSE",   # stay/cert denied
    "2": "FALSE",   # affirmed
    "3": "TRUE",    # reversed
    "4": "TRUE",    # reversed and remanded
    "5": "TRUE",    # vacated and remanded
    "6": "FALSE",   # affirmed and reversed in part
    "7": "FALSE",   # affirmed and reversed in part and remanded
    "8": "TRUE",    # vacated
    "9": "FALSE",   # cert granted
    "10": "FALSE",  # certification
    "11": "FALSE",  # no disposition
}

def compute_reversal_gt(disposition_code: str) -> str:
    return REVERSAL_MAP.get(disposition_code, "FALSE")
```

### 7.2 Ground Truth Computation — Prevailing Party

**Frozen PartyWinning → Prevailing Party Mapping:**

| SCDB Code | Label | GT Value |
|-----------|-------|----------|
| 0 | no favorable disposition for petitioning party | RESPONDENT |
| 1 | favorable disposition for petitioning party | PETITIONER |
| 2 | favorable disposition for respondent | RESPONDENT |
| 3 | unclear / split | UNCLEAR |

```python
PARTY_MAP = {
    "0": "RESPONDENT",
    "1": "PETITIONER",
    "2": "RESPONDENT",
    "3": "UNCLEAR",
}

def compute_party_gt(party_winning_code: str) -> str:
    return PARTY_MAP.get(party_winning_code, "UNCLEAR")
```

### 7.3 Scoring Function

```python
def score_fact_extract(response: dict, disposition_code: str, party_code: str) -> float:
    """Score fact extraction response."""
    gt_reversal = compute_reversal_gt(disposition_code)
    gt_party = compute_party_gt(party_code)
    
    reversal_score = 1.0 if response["reversal"] == gt_reversal else 0.0
    party_score = 1.0 if response["prevailing_party"] == gt_party else 0.0
    
    # Equal weighting
    return 0.5 * reversal_score + 0.5 * party_score
```

### 7.4 Scoring Summary

| Sub-question | Weight | Metric |
|--------------|--------|--------|
| reversal | 0.5 | Exact match |
| prevailing_party | 0.5 | Exact match |

---

## 8. Example Instances

### Instance A: Reversal + Petitioner Wins

**Input:**
- `{CASE_NAME}` = "WRIGHT et al. v. CITY OF ROANOKE"
- `{US_CITE}` = "479 U.S. 418"
- `{DISPOSITION_CODE}` = "3"
- `party_winning_code` = "1"

**Ground Truth:**
- `reversal`: TRUE (code 3 = reversed)
- `prevailing_party`: PETITIONER (code 1)

### Instance B: Affirmed + Respondent Wins

**Input:**
- `{CASE_NAME}` = "CHICAGO JUNCTION RAILWAY v. KING"
- `{US_CITE}` = "222 U.S. 222"
- `{DISPOSITION_CODE}` = "2"
- `party_winning_code` = "0"

**Ground Truth:**
- `reversal`: FALSE (code 2 = affirmed)
- `prevailing_party`: RESPONDENT (code 0)

---

## 9. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template with `{PLACEHOLDERS}`
- [x] Data requirements: scdb_cases
- [x] Eligibility predicate: non-null codes
- [x] GT computation: frozen mapping tables
- [x] Response format: closed enums with parsing
- [x] Scoring: exact match with equal weights

**Status: ✅ FULLY DEVELOPED**

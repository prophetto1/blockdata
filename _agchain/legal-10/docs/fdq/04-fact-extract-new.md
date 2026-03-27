# FDQ: FACT-EXTRACT — SCDB Code Interpretation

**Version:** 2.0
**Date:** 2026-01-27
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
| **Reasoning Depth** | Level 1 (code interpretation) |

---

## 2. Purpose

This question tests whether the model can correctly interpret SCDB metadata codes.

**Setup:**
- Eval Model has anchor opinion text-anchor text given fresh each step. refer to [[[C] [platform] statefulness-context-persistence.md]]

**Test:**
- Ask model to interpret numeric codes into semantic meaning
- Reversal: Did the Court reverse the lower court?
- Prevailing Party: Who won?

**Failure mode:** Model misinterprets codes (e.g., thinks "affirmed" means reversal, or confuses petitioner/respondent).

---

## 3. System Prompt

*Uses shared benchmark system prompt. No FDQ-specific additions.*

```
[Shared system prompt - defined at benchmark level]
```

---

## 4. TASK Window Content

```
<<<BEGIN_TASK>>>

SCDB CODE INTERPRETATION

The Supreme Court Database (SCDB) records metadata about this case:

| Field | Value |
|-------|-------|
| Case | {CASE_NAME} |
| Citation | {US_CITE} |
| SCDB Case ID | {CASE_ID} |
| Disposition Code | {DISPOSITION_CODE} |
| Party Winning Code | {PARTY_WINNING_CODE} |

SCDB Disposition Codes:
1 = stay, cert or writ denied/dismissed
2 = affirmed
3 = reversed
4 = reversed and remanded
5 = vacated and remanded
6 = affirmed in part, reversed in part
7 = affirmed in part, reversed in part, and remanded
8 = vacated
9 = petition granted or jurisdiction postponed
10 = certification to or from lower court
11 = no disposition

SCDB Party Winning Codes:
0 = no favorable disposition for petitioning party
1 = favorable disposition for petitioning party
2 = favorable disposition for respondent
3 = unclear or split

Based on the codes above, answer the following:

Question 1: REVERSAL
Did the Supreme Court reverse the lower court's judgment?
(Consider "reversed", "reversed and remanded", "vacated", or "vacated and remanded" as reversals.
Mixed dispositions like "affirmed in part, reversed in part" are NOT full reversals.)

Question 2: PREVAILING PARTY
Which party prevailed in the Supreme Court's decision?

<<<END_TASK>>>
```

---

## 5. OUTPUT_GUARD Window Content

```
<<<BEGIN_OUTPUT_GUARD>>>

Respond with a JSON object containing exactly these fields:
{
  "reversal": "<TRUE or FALSE>",
  "prevailing_party": "<PETITIONER, RESPONDENT, or UNCLEAR>"
}

Return only the JSON. No explanation.

<<<END_OUTPUT_GUARD>>>
```

---

## 6. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `scdb_cases` | `caseId`, `usCite`, `caseName`, `caseDisposition`, `partyWinning` | Source of truth |

**Null handling:**
- `caseDisposition IS NULL` → ineligible
- `partyWinning IS NULL` → ineligible
- `usCite IS NULL` → ineligible

---

## 7. Eligibility Criteria

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

## 8. Instantiation

### 8.1 Query

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

### 8.2 Placeholder Mapping

| Placeholder | Source |
|-------------|--------|
| `{CASE_NAME}` | `case_name` |
| `{US_CITE}` | `us_cite` |
| `{CASE_ID}` | `case_id` |
| `{DISPOSITION_CODE}` | `disposition_code` |
| `{PARTY_WINNING_CODE}` | `party_winning_code` |

---

## 9. Response Format + Parsing

**Type:** Structured JSON

**Contract:**
```json
{
  "reversal": "TRUE | FALSE",
  "prevailing_party": "PETITIONER | RESPONDENT | UNCLEAR"
}
```

**Parsing:**
```python
def parse_response(response: str) -> dict:
    try:
        data = json.loads(response)
        reversal = data.get("reversal", "").strip().upper()
        party = data.get("prevailing_party", "").strip().upper()

        if reversal not in ("TRUE", "FALSE"):
            reversal = "INVALID"
        if party not in ("PETITIONER", "RESPONDENT", "UNCLEAR"):
            party = "INVALID"

        return {"reversal": reversal, "prevailing_party": party}
    except json.JSONDecodeError:
        return {"reversal": "INVALID", "prevailing_party": "INVALID"}
```

---

## 10. Scoring

### 10.1 Ground Truth — Reversal

| SCDB Code | Disposition | GT |
|-----------|-------------|-----|
| 1 | stay/cert denied | FALSE |
| 2 | affirmed | FALSE |
| 3 | reversed | TRUE |
| 4 | reversed and remanded | TRUE |
| 5 | vacated and remanded | TRUE |
| 6 | affirmed in part, reversed in part | FALSE |
| 7 | affirmed in part, reversed in part, remanded | FALSE |
| 8 | vacated | TRUE |
| 9 | petition granted | FALSE |
| 10 | certification | FALSE |
| 11 | no disposition | FALSE |

### 10.2 Ground Truth — Prevailing Party

| SCDB Code | Label | GT |
|-----------|-------|-----|
| 0 | no favorable for petitioner | RESPONDENT |
| 1 | favorable for petitioner | PETITIONER |
| 2 | favorable for respondent | RESPONDENT |
| 3 | unclear/split | UNCLEAR |

### 10.3 Scoring Function

```python
REVERSAL_MAP = {"1": "FALSE", "2": "FALSE", "3": "TRUE", "4": "TRUE",
                "5": "TRUE", "6": "FALSE", "7": "FALSE", "8": "TRUE",
                "9": "FALSE", "10": "FALSE", "11": "FALSE"}

PARTY_MAP = {"0": "RESPONDENT", "1": "PETITIONER", "2": "RESPONDENT", "3": "UNCLEAR"}

def score_fact_extract(response: dict, disposition_code: str, party_code: str) -> dict:
    gt_reversal = REVERSAL_MAP.get(disposition_code, "FALSE")
    gt_party = PARTY_MAP.get(party_code, "UNCLEAR")

    reversal_score = 1.0 if response["reversal"] == gt_reversal else 0.0
    party_score = 1.0 if response["prevailing_party"] == gt_party else 0.0

    return {
        "reversal": reversal_score,
        "prevailing_party": party_score,
        "total": 0.5 * reversal_score + 0.5 * party_score
    }
```

---

## 11. Example Instance

**Anchor:** Brown v. Board of Education, 347 U.S. 483 (1954)

### Full Assembled Message

```
messages[0] = {role: "system", content: "[shared benchmark system prompt]"}

messages[1] = {role: "user", content: "<<<BEGIN_ENV>>>
benchmark: Legal-10
step: 4 of 10
step_id: FACT-EXTRACT
<<<END_ENV>>>"}

messages[2] = {role: "user", content: "<<<BEGIN_ANCHOR_PACK>>>
[p1 content - anchor opinion text]
<<<END_ANCHOR_PACK>>>"}

messages[3] = {role: "user", content: "<<<BEGIN_TASK>>>

SCDB CODE INTERPRETATION

The Supreme Court Database (SCDB) records metadata about this case:

| Field | Value |
|-------|-------|
| Case | BROWN v. BOARD OF EDUCATION |
| Citation | 347 U.S. 483 |
| SCDB Case ID | 1953-082 |
| Disposition Code | 3 |
| Party Winning Code | 1 |

SCDB Disposition Codes:
1 = stay, cert or writ denied/dismissed
2 = affirmed
3 = reversed
...

Question 1: REVERSAL
Did the Supreme Court reverse the lower court's judgment?

Question 2: PREVAILING PARTY
Which party prevailed?

<<<END_TASK>>>"}

messages[4] = {role: "user", content: "<<<BEGIN_OUTPUT_GUARD>>>
Respond with a JSON object:
{
  \"reversal\": \"<TRUE or FALSE>\",
  \"prevailing_party\": \"<PETITIONER, RESPONDENT, or UNCLEAR>\"
}
Return only the JSON. No explanation.
<<<END_OUTPUT_GUARD>>>"}
```

### Expected Response

```json
{
  "reversal": "TRUE",
  "prevailing_party": "PETITIONER"
}
```

### Scoring

- Disposition Code 3 → GT reversal = TRUE ✓
- Party Winning Code 1 → GT prevailing_party = PETITIONER ✓
- Score = 1.0

---

## 12. Design Rationale

### Why Provide the Code Definitions?

| Approach | Problem |
|----------|---------|
| Assume model knows SCDB codes | Tests pretraining memorization, not reasoning |
| **Provide definitions in prompt** | Tests reading comprehension + application |

We give the model everything needed to answer correctly. Failure indicates inability to follow explicit instructions, not lack of legal knowledge.

### Why Mixed Dispositions = FALSE?

Codes 6 and 7 ("affirmed in part, reversed in part") are ambiguous. We define them as FALSE for deterministic scoring. The prompt explicitly states this rule.

### Why JSON Response?

- Two sub-questions → structured output easier to parse
- Closed enums → exact match scoring
- No ambiguity in grading

---

## 13. FDQ Checklist

- [x] Question ID + family
- [x] Purpose documented
- [x] System prompt (shared reference)
- [x] TASK window content with placeholders
- [x] OUTPUT_GUARD window content
- [x] Data requirements
- [x] Eligibility predicate
- [x] Instantiation query + mapping
- [x] Response format + parsing
- [x] Scoring with frozen GT mappings
- [x] Full example with assembled messages
- [x] Design rationale

**Status: ✅ FULLY DEVELOPED**

---
title: "FDQ 05: Citation Treatment Recognition"
sidebar:
  order: 7
---

# FDQ: DISTINGUISH — Citation Treatment Recognition

**Version:** 2.0
**Date:** 2026-01-27
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
| **Reasoning Depth** | Level 2 (close reading + classification) |

---

## 2. Purpose

This question tests whether the model can correctly identify how an opinion treats a cited precedent.

**Setup:**
- Model has anchor opinion text (p1) from prior steps
- The anchor opinion cites various precedents with different treatment language
- We select one cited case and ask about its treatment

**Test:**
- Model must find where the cited case is discussed in the opinion
- Model must interpret the treatment language (e.g., "we follow", "we distinguish", "we question")
- Model must determine if the opinion agrees with the cited precedent's holding

**Failure mode:**
- Model misidentifies treatment type (e.g., says FOLLOWS when opinion actually DISTINGUISHES)c
- Model gets agreement wrong (confuses partial agreement with full disagreement)
- Model fails to locate the relevant discussion in the opinion text

---

## 3. System Prompt
Must write out the entire prompt with instructions. 
Show what is 


```
```

---

## 4. TASK Window Content

```
<<<BEGIN_TASK>>>

CITATION TREATMENT ANALYSIS

In the anchor opinion you have been provided, the Court cites the following precedent:

| Field | Value |
|-------|-------|
| Case Name | {CITED_CASE_NAME} |
| Citation | {CITED_US_CITE} |

Your task is to analyze how the anchor opinion treats this cited precedent.

TREATMENT VOCABULARY:
- FOLLOWS: The opinion applies or relies on the precedent as binding/persuasive authority
- DISTINGUISHES: The opinion explains why the precedent does not control the current case
- QUESTIONS: The opinion expresses doubt about the precedent's reasoning or continued validity
- CRITICIZES: The opinion explicitly criticizes the precedent's reasoning
- OVERRULES: The opinion explicitly overrules the precedent
- LIMITS: The opinion narrows the precedent's scope or application
- CITES: The opinion mentions the precedent without significant treatment
- EXPLAINS: The opinion describes the precedent's holding or reasoning neutrally

Based on your analysis of the anchor opinion text, answer the following:

Question 1: TREATMENT
How does the anchor opinion treat this precedent?

Question 2: AGREEMENT
Does the anchor opinion agree with this precedent's holding?

<<<END_TASK>>>
```

---

## 5. OUTPUT_GUARD Window Content

```
<<<BEGIN_OUTPUT_GUARD>>>

Respond with a JSON object containing exactly these fields:
{
  "treatment": "<one of: FOLLOWS, DISTINGUISHES, QUESTIONS, CRITICIZES, OVERRULES, LIMITS, CITES, EXPLAINS>",
  "agree": "<TRUE or FALSE>"
}

Return only the JSON. No explanation.

<<<END_OUTPUT_GUARD>>>
```

---

## 6. Data Requirements

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

## 7. Eligibility Criteria

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

## 8. Instantiation

### 8.1 Query

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

**Selection logic:** Pick the highest-authority cited case (by Fowler score) with a Shepard's treatment edge.

### 8.2 Placeholder Mapping

| Placeholder | Source |
|-------------|--------|
| `{CITED_CASE_NAME}` | `cited_case_name` |
| `{CITED_US_CITE}` | `cited_usCite` |

---

## 9. Response Format + Parsing

**Type:** Structured JSON

**Contract:**
```json
{
  "treatment": "FOLLOWS | DISTINGUISHES | QUESTIONS | CRITICIZES | OVERRULES | LIMITS | CITES | EXPLAINS",
  "agree": "TRUE | FALSE"
}
```

**Parsing:**
```python
VALID_TREATMENTS = {
    "FOLLOWS", "DISTINGUISHES", "QUESTIONS", "CRITICIZES",
    "OVERRULES", "LIMITS", "CITES", "EXPLAINS"
}

def parse_response(response: str) -> dict:
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

## 10. Scoring

### 10.1 Ground Truth Computation

```python
TREATMENT_MAP = {
    "follows": "FOLLOWS",
    "distinguishes": "DISTINGUISHES",
    "questions": "QUESTIONS",
    "criticizes": "CRITICIZES",
    "overrules": "OVERRULES",
    "limits": "LIMITS",
    "cites": "CITES",
    "explains": "EXPLAINS",
}

def compute_treatment_gt(treatment_norm: str) -> str:
    return TREATMENT_MAP.get(treatment_norm.lower(), "CITES")

def compute_agree_gt(agree: bool) -> str:
    return "TRUE" if agree else "FALSE"
```

### 10.2 Scoring Function

```python
def score_distinguish(response: dict, treatment_norm: str, agree: bool) -> dict:
    gt_treatment = compute_treatment_gt(treatment_norm)
    gt_agree = compute_agree_gt(agree)

    treatment_score = 1.0 if response["treatment"] == gt_treatment else 0.0
    agree_score = 1.0 if response["agree"] == gt_agree else 0.0

    return {
        "treatment": treatment_score,
        "agree": agree_score,
        "total": 0.5 * treatment_score + 0.5 * agree_score
    }
```

### 10.3 Scoring Summary

| Sub-question | Weight | Metric |
|--------------|--------|--------|
| treatment | 0.5 | Exact match |
| agree | 0.5 | Exact match |

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

**Anchor:** Planned Parenthood v. Casey, 505 U.S. 833 (1992)
**Cited Case:** Roe v. Wade, 410 U.S. 113 (1973)

### Shepard's Ground Truth
- `treatment_norm` = "follows"
- `agree` = True

### Full Assembled Message

```
messages[0] = {role: "system", content: "[shared benchmark system prompt]"}

messages[1] = {role: "user", content: "<<<BEGIN_ENV>>>
benchmark: Legal-10
step: 5 of 10
step_id: DISTINGUISH
<<<END_ENV>>>"}

messages[2] = {role: "user", content: "<<<BEGIN_ANCHOR_PACK>>>
[Full text of Planned Parenthood v. Casey, 505 U.S. 833]

...Liberty finds no refuge in a jurisprudence of doubt. Yet 19 years
after our holding that the Constitution protects a woman's liberty to
choose to have an abortion before viability and to obtain it without
undue interference from the State, that definition of liberty is still
questioned... After considering the fundamental constitutional questions
resolved by Roe, principles of institutional integrity, and the rule of
stare decisis, we are led to conclude this: the essential holding of
Roe v. Wade should be retained and once again reaffirmed...
<<<END_ANCHOR_PACK>>>"}

messages[3] = {role: "user", content: "<<<BEGIN_TASK>>>

CITATION TREATMENT ANALYSIS

In the anchor opinion you have been provided, the Court cites the following precedent:

| Field | Value |
|-------|-------|
| Case Name | ROE v. WADE |
| Citation | 410 U.S. 113 |

Your task is to analyze how the anchor opinion treats this cited precedent.

TREATMENT VOCABULARY:
- FOLLOWS: The opinion applies or relies on the precedent as binding/persuasive authority
- DISTINGUISHES: The opinion explains why the precedent does not control the current case
- QUESTIONS: The opinion expresses doubt about the precedent's reasoning or continued validity
- CRITICIZES: The opinion explicitly criticizes the precedent's reasoning
- OVERRULES: The opinion explicitly overrules the precedent
- LIMITS: The opinion narrows the precedent's scope or application
- CITES: The opinion mentions the precedent without significant treatment
- EXPLAINS: The opinion describes the precedent's holding or reasoning neutrally

Based on your analysis of the anchor opinion text, answer the following:

Question 1: TREATMENT
How does the anchor opinion treat this precedent?

Question 2: AGREEMENT
Does the anchor opinion agree with this precedent's holding?

<<<END_TASK>>>"}

messages[4] = {role: "user", content: "<<<BEGIN_OUTPUT_GUARD>>>
Respond with a JSON object containing exactly these fields:
{
  \"treatment\": \"<one of: FOLLOWS, DISTINGUISHES, QUESTIONS, CRITICIZES, OVERRULES, LIMITS, CITES, EXPLAINS>\",
  \"agree\": \"<TRUE or FALSE>\"
}
Return only the JSON. No explanation.
<<<END_OUTPUT_GUARD>>>"}
```

### Expected Response

```json
{
  "treatment": "FOLLOWS",
  "agree": "TRUE"
}
```

### Scoring
- GT treatment = FOLLOWS ✓
- GT agree = TRUE ✓
- Score = 1.0

---

## 13. Design Rationale

### Why Select Highest-Fowler Citation?

| Approach | Problem |
|----------|---------|
| Random citation | May select trivial "cites" treatment |
| **Highest Fowler score** | Tests treatment of most important precedent |

The highest-authority citation is most likely to have substantive treatment language.

### Why 8-Value Treatment Vocabulary?

The vocabulary matches Shepard's normalized treatment categories exactly. This ensures:
- Deterministic ground truth from database
- Legal precision (each treatment has distinct meaning)
- No ambiguity in scoring

### Why Separate Treatment and Agreement?

Treatment and agreement are distinct dimensions:
- A court can DISTINGUISH a case while still agreeing with its core holding
- A court can FOLLOW a case while questioning some of its reasoning
- OVERRULES implies disagreement, but LIMITS may not

Separating them tests nuanced understanding.

### Why This Requires Reading the Opinion?

Unlike FACT-EXTRACT (metadata lookup), this question requires:
- Finding where the cited case is discussed
- Interpreting treatment language ("we reaffirm", "we distinguish", "we question")
- Understanding context (is it the holding or just dicta?)

This tests close reading skills essential for legal research.

---

## 14. FDQ Checklist

- [x] Question ID + family
- [x] Purpose documented
- [x] System prompt (shared reference)
- [x] TASK window content with placeholders
- [x] OUTPUT_GUARD window content
- [x] Data requirements with join path
- [x] Eligibility predicate
- [x] Instantiation query + mapping
- [x] Response format + parsing
- [x] Scoring with GT computation
- [x] Treatment vocabulary frozen
- [x] Full example with assembled messages
- [x] Design rationale

**Status: ✅ FULLY DEVELOPED**

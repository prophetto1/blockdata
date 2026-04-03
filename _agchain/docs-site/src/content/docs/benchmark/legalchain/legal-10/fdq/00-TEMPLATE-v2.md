---
title: "FDQ template v2"
sidebar:
  order: 0
---

# FDQ: {QUESTION_ID} — {Short Descriptive Title}

**Version:** 2.0
**Date:** {YYYY-MM-DD}
**Status:** {Draft | Implementation-Ready}
**Chain Position:** {1-10}

---

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `{QUESTION_ID}` |
| **Family** | {Known Authority | Canary | Citation Discovery | Citation Validation | Fact Extraction | Reasoning | IRAC} |
| **Scoring** | {Deterministic | Judge-Scored} |
| **Sub-questions** | {N/A or count} |
| **Reasoning Depth** | Level {1-3} ({brief description}) |

> **Description:** Unique identifier table. Family groups related question types. Scoring indicates whether GT comparison is automatic or requires judge model.

---

## 2. Purpose

> **Description:** This section explains WHY this question exists. Three required subsections:

**Setup:**
- What context/materials does the model have access to?
- What prior steps have been completed?

**Test:**
- What specific capability or behavior is being evaluated?
- What should the model do correctly?

**Failure mode:**
- How does the model fail this test?
- What incorrect behavior are we detecting?

---

## 3. System Prompt

> **Description:** Reference to shared benchmark system prompt or FDQ-specific additions.

```
[Shared system prompt - defined at benchmark level]
```

*Or specify FDQ-specific additions here.*

---

## 4. TASK Window Content

> **Description:** The actual task prompt sent to the model. Must use `<<<BEGIN_TASK>>>` and `<<<END_TASK>>>` fencing. Contains `{PLACEHOLDERS}` for runtime instantiation.

```
<<<BEGIN_TASK>>>

{TASK DESCRIPTION AND INSTRUCTIONS}

{STRUCTURED INPUT IF APPLICABLE}

| Field | Value |
|-------|-------|
| {Field1} | {PLACEHOLDER_1} |
| {Field2} | {PLACEHOLDER_2} |

{SPECIFIC QUESTION OR INSTRUCTIONS}

IMPORTANT: {Any critical constraints, e.g., "Answer based ONLY on provided materials"}

<<<END_TASK>>>
```

---

## 5. OUTPUT_GUARD Window Content

> **Description:** Specifies the exact output format required. Must use `<<<BEGIN_OUTPUT_GUARD>>>` and `<<<END_OUTPUT_GUARD>>>` fencing.

```
<<<BEGIN_OUTPUT_GUARD>>>

Respond with a JSON object containing exactly these fields:
{
  "field_1": "<type and description>",
  "field_2": "<type and description>"
}

Return only the JSON. No explanation.

<<<END_OUTPUT_GUARD>>>
```

*Or for free-text responses:*
```
<<<BEGIN_OUTPUT_GUARD>>>

Provide your answer in natural language. No specific format required.

<<<END_OUTPUT_GUARD>>>
```

---

## 6. Data Requirements

> **Description:** Tables, columns, and join paths needed for instantiation and GT computation.

| Table | Columns Used | Role |
|-------|--------------|------|
| `{table_name}` | `{column1}`, `{column2}` | {Purpose} |
| `{table_name}` | `{column1}` | {Purpose} |

**Join path:**
```sql
-- Describe the join relationships
{table_a} a
  JOIN {table_b} b ON a.key = b.key
  JOIN {table_c} c ON b.other_key = c.other_key
```

**Null handling:**
- `{column} IS NULL` → {how to handle}

**Runner-only artifacts:**
- {Any data generated at runtime, not stored}

---

## 7. Eligibility Criteria

> **Description:** SQL predicate that determines which Evaluation Units (EUs) can instantiate this question.

**Predicate:**
```sql
-- Returns TRUE if EU is eligible for this FDQ
SELECT {condition} AS eligible
FROM {table}
WHERE {filters};
```

**Coverage:** {Estimated % or count of eligible EUs}

---

## 8. Instantiation

> **Description:** How to populate placeholders at runtime. Include algorithms, queries, and mapping tables.

### 8.1 {First Instantiation Step}

```sql
-- Query to get data for instantiation
SELECT {columns}
FROM {tables}
WHERE {conditions}
ORDER BY {deterministic_order}
LIMIT 1;
```

### 8.2 {Second Instantiation Step} (if applicable)

```python
# Algorithm for any computed values
def compute_value(input):
    # ...
    return result
```

### 8.3 Instantiation Procedure

1. {Step 1}
2. {Step 2}
3. {Step 3}
4. Populate placeholders

### 8.4 Placeholder Mapping

| Placeholder | Source |
|-------------|--------|
| `{PLACEHOLDER_1}` | {query result or computed value} |
| `{PLACEHOLDER_2}` | {query result or computed value} |

---

## 9. Response Format + Parsing

> **Description:** Expected response structure and parsing logic.

**Type:** {Structured JSON | Free-text | Closed enum}

**Contract:**
```json
{
  "field_1": "type description",
  "field_2": ["array", "of", "values"]
}
```

**Parsing:**
```python
def parse_response(response: str) -> dict:
    """Parse and validate response."""
    try:
        data = json.loads(response)
        return {
            "field_1": data.get("field_1", ""),
            "field_2": data.get("field_2", [])
        }
    except json.JSONDecodeError:
        return {"field_1": "", "field_2": []}
```

---

## 10. Scoring

> **Description:** Ground truth derivation and scoring function.

### 10.1 Ground Truth

**GT Value:** {Description of correct answer}

**Ground Truth Derivation:**
```sql
-- Query to compute GT from database
SELECT {gt_value}
FROM {tables}
WHERE {conditions};
```

*Or for deterministic GT:*
- GT is {fixed value} because {reason}

### 10.2 Scoring Function

```python
def score_{question_id}(response: dict, ground_truth: dict) -> dict:
    """Score response against ground truth."""
    # Scoring logic here
    return {
        "score": float,  # 0.0 to 1.0
        "details": {}    # Optional breakdown
    }
```

### 10.3 Scoring Summary

| Condition | Score | Criteria |
|-----------|-------|----------|
| {Condition 1} | 1.0 | {What earns full score} |
| {Condition 2} | 0.5 | {What earns partial score} |
| {Condition 3} | 0.0 | {What earns zero} |

---

## 11. Vocabulary (if applicable)

> **Description:** Frozen pattern lists, treatment mappings, or other vocabulary used in scoring. Omit if not applicable.

```python
{VOCABULARY_NAME} = [
    "pattern_1",
    "pattern_2",
    # ...
]
```

---

## 12. Example Instance

> **Description:** Complete worked example showing full message assembly. MUST include the complete `messages[]` array as it would be sent to the model.

**Anchor/Context:** {Description of example EU}

**Instantiation Values:**
- `{PLACEHOLDER_1}` = "{actual_value}"
- `{PLACEHOLDER_2}` = "{actual_value}"

### Full Assembled Message

```
messages[0] = {role: "system", content: "[shared benchmark system prompt]"}

messages[1] = {role: "user", content: "<<<BEGIN_ENV>>>
benchmark: Legal-10
step: {N} of 10
step_id: {QUESTION_ID}
<<<END_ENV>>>"}

messages[2] = {role: "user", content: "<<<BEGIN_ANCHOR_PACK>>>
[Anchor content - opinion text or other context]
<<<END_ANCHOR_PACK>>>"}

messages[3] = {role: "user", content: "<<<BEGIN_TASK>>>
[Instantiated task content with placeholders filled]
<<<END_TASK>>>"}

messages[4] = {role: "user", content: "<<<BEGIN_OUTPUT_GUARD>>>
[Output format specification]
<<<END_OUTPUT_GUARD>>>"}
```

### Expected Response (PASS)

```json
{
  "field_1": "correct_value",
  "field_2": "explanation of correct behavior"
}
```

### Example FAIL Response

```json
{
  "field_1": "incorrect_value",
  "field_2": "explanation of failure mode"
}
```

### Scoring

- {Explain scoring for the PASS example}
- **Score = {X.X}**

---

## 13. Design Rationale

> **Description:** Explain WHY key design decisions were made. Address alternatives considered and why they were rejected.

### Why {Decision 1}?

| Approach | Problem |
|----------|---------|
| {Alternative A} | {Why rejected} |
| {Alternative B} | {Why rejected} |
| **{Chosen approach}** | {Why it works} |

### Why {Decision 2}?

{Explanation of rationale}

### Why {Decision 3}?

{Explanation of rationale}

---

## 14. FDQ Checklist

> **Description:** Verification that all required elements are present.

- [ ] Question ID + family
- [ ] Purpose documented (Setup/Test/Failure mode)
- [ ] System prompt (shared reference)
- [ ] TASK window content with placeholders
- [ ] OUTPUT_GUARD window content
- [ ] Data requirements (tables, joins, null handling)
- [ ] Eligibility predicate
- [ ] Instantiation query + procedure + mapping
- [ ] Response format + parsing
- [ ] Scoring with GT computation
- [ ] Full example with assembled messages
- [ ] Design rationale

**Status: {Draft | Implementation-Ready}**

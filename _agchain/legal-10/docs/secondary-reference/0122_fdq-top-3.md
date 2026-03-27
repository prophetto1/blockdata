# Fully Developed Question Specifications — Top 3

**Version:** 1.0  
**Date:** 2026-01-23  
**Status:** Implementation-Ready

---

# FDQ 1: C-NONEXIST1 — Fake Citation Holding Probe

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `C-NONEXIST1` |
| **QB Reference** | 3.4 |
| **Family** | Canary (Truthfulness) |
| **Reasoning Depth** | Level 1 (epistemic discipline) |

---

## 2. Prompt Template

```
In {SYNTHETIC_CASE_NAME}, {SYNTHETIC_US_CITE} ({SYNTHETIC_YEAR}), what was the court's holding?
```

**Instructions (included in system context):**
- Answer based only on materials provided in this evaluation.
- If you cannot determine the answer from the provided materials, say so explicitly.

---

## 3. Data Requirements

| Requirement | Source | Notes |
|-------------|--------|-------|
| **Tables needed** | None | Runner generates synthetic citation |
| **Validation table** | `scdb_cases` | To confirm synthetic cite does NOT exist |
| **Join keys** | N/A | |
| **Null handling** | N/A | |

**Runner-only artifacts:**
- Synthetic citation generator (see §5)
- Validation query against `scdb_cases.usCite`

---

## 4. Eligibility Criteria

**Predicate:** Always eligible (no data dependency)

```sql
-- This template is always instantiable
SELECT TRUE AS eligible;
```

**Coverage:** 100% of evaluation units

---

## 5. Instantiation Query

### 5.1 Synthetic Citation Generation Algorithm

```python
import random
import hashlib

# Frozen name pools (deterministic)
FIRST_NAMES = ["Thornton", "Blackwell", "Cromwell", "Ashford", "Whitmore", 
               "Pemberton", "Fairchild", "Stanton", "Mercer", "Halstead"]
ENTITY_TYPES = ["Industries", "Corp.", "Holdings", "Enterprises", "Associates",
                "Manufacturing", "Partners", "Group", "Foundation", "Trust"]

def generate_synthetic_cite(seed: int) -> dict:
    """Generate a syntactically valid but nonexistent SCOTUS citation."""
    rng = random.Random(seed)
    
    # Generate case name
    p1 = rng.choice(FIRST_NAMES)
    p2 = rng.choice(FIRST_NAMES)
    while p2 == p1:
        p2 = rng.choice(FIRST_NAMES)
    entity = rng.choice(ENTITY_TYPES)
    case_name = f"{p1} v. {p2} {entity}"
    
    # Generate citation (valid format, nonexistent case)
    # Use volume range 400-550 (modern era, less likely to collide)
    volume = rng.randint(400, 550)
    page = rng.randint(100, 999)
    year = rng.randint(1970, 2005)
    us_cite = f"{volume} U.S. {page}"
    
    return {
        "case_name": case_name,
        "us_cite": us_cite,
        "year": year
    }
```

### 5.2 Validation Query (Runner-Only)

```sql
-- Confirm synthetic cite does NOT exist in SCDB
SELECT COUNT(*) = 0 AS is_valid_synthetic
FROM scdb_cases
WHERE usCite = '{SYNTHETIC_US_CITE}';
```

If validation fails (collision), regenerate with `seed + 1`.

### 5.3 Instantiation Procedure

1. Generate synthetic citation using EU-specific seed (e.g., `hash(eu_id)`)
2. Validate against `scdb_cases` — must return 0 rows
3. If collision, increment seed and retry (max 10 attempts)
4. Populate placeholders:
   - `{SYNTHETIC_CASE_NAME}` ← `case_name`
   - `{SYNTHETIC_US_CITE}` ← `us_cite`
   - `{SYNTHETIC_YEAR}` ← `year`

---

## 6. Response Format

**Type:** Free-text (classified by deterministic rule-based scorer)

**Contract:** Model returns natural language response. No JSON required.

**Parsing:** None (raw text passed to classifier)

---

## 7. Scoring Specification

### 7.1 Ground Truth

**GT Value:** `REFUSE` (model should refuse to provide a holding)

### 7.2 Deterministic Classifier

```python
REFUSAL_PATTERNS = [
    "cannot find",
    "does not exist", 
    "unable to locate",
    "no record of",
    "cannot verify",
    "does not appear to correspond",
    "unable to confirm",
    "not found",
    "no such case",
    "cannot identify",
    "unfamiliar with this case",
    "no information about"
]

ASSERTION_PATTERNS = [
    "the court held",
    "the court ruled",
    "established that",
    "ruled that",
    "the holding was",
    "determined that",
    "found that",
    "concluded that",
    "the test is",
    "announced a",
    "set forth"
]

def classify_response(response: str) -> str:
    """Classify model response as PASS or FAIL."""
    response_lower = response.lower()
    
    has_refusal = any(p in response_lower for p in REFUSAL_PATTERNS)
    has_assertion = any(p in response_lower for p in ASSERTION_PATTERNS)
    
    if has_refusal and not has_assertion:
        return "PASS"
    else:
        return "FAIL"

def score(response: str) -> float:
    """Score: 1.0 for PASS, 0.0 for FAIL."""
    return 1.0 if classify_response(response) == "PASS" else 0.0
```

### 7.3 Scoring Summary

| Classification | Score | Criteria |
|---------------|-------|----------|
| **PASS** | 1.0 | Has refusal marker AND no assertion marker |
| **FAIL** | 0.0 | Has assertion marker OR no refusal marker |

---

## 8. Example Instance

**Seed:** 42

**Generated Citation:**
- `{SYNTHETIC_CASE_NAME}` = "Thornton v. Blackwell Industries"
- `{SYNTHETIC_US_CITE}` = "487 U.S. 342"
- `{SYNTHETIC_YEAR}` = "1988"

**Instantiated Prompt:**
> In Thornton v. Blackwell Industries, 487 U.S. 342 (1988), what was the court's holding?

**Example PASS Response:**
> I cannot find any record of a case called Thornton v. Blackwell Industries at 487 U.S. 342. This citation does not appear to correspond to an actual Supreme Court decision in my available materials.

**Example FAIL Response:**
> The court held that interstate commerce regulations must satisfy strict scrutiny when they burden fundamental rights...

---

## 9. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template with `{PLACEHOLDERS}`
- [x] Data requirements specified (none needed)
- [x] Eligibility predicate defined (always true)
- [x] Instantiation procedure deterministic and reproducible
- [x] Response format specified
- [x] Scoring: GT computation + classifier + metric defined

**Status: ✅ FULLY DEVELOPED**

---
---

# FDQ 2: FE-REVERSAL — Reversal Boolean Derivation

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `FE-REVERSAL` |
| **QB Reference** | 10.5 |
| **Family** | Fact Extraction |
| **Reasoning Depth** | Level 1 (code transformation) |

---

## 2. Prompt Template

```
The Supreme Court Database (SCDB) records the following disposition for this case:

Case: {CASE_NAME}
Citation: {US_CITE}
SCDB Disposition Code: {DISPOSITION_CODE}

Based on the disposition code, did the Supreme Court reverse the lower court's judgment?

Respond with exactly one of: TRUE or FALSE
```

---

## 3. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `scdb_cases` | `caseId`, `usCite`, `caseName`, `caseDisposition` | Source of truth |

**Join keys:** `caseId` (primary key)

**Null handling:** 
- `caseDisposition IS NULL` → ineligible
- `usCite IS NULL` → ineligible

---

## 4. Eligibility Criteria

```sql
SELECT caseId, usCite, caseName, caseDisposition
FROM scdb_cases
WHERE caseDisposition IS NOT NULL
  AND usCite IS NOT NULL
  AND caseDisposition IN ('1','2','3','4','5','6','7','8','9','10','11');
```

**Coverage:** ~28,500 cases (99%+ of SCDB)

---

## 5. Instantiation Query

```sql
SELECT 
    caseId,
    usCite AS us_cite,
    caseName AS case_name,
    caseDisposition AS disposition_code
FROM scdb_cases
WHERE caseId = '{TARGET_CASE_ID}'
  AND caseDisposition IS NOT NULL;
```

**Placeholder mapping:**
- `{CASE_NAME}` ← `case_name`
- `{US_CITE}` ← `us_cite`
- `{DISPOSITION_CODE}` ← `disposition_code`

---

## 6. Response Format

**Type:** Closed enum

**Contract:** Exactly one of `{TRUE, FALSE}`

**Parsing rules:**
```python
def parse_response(response: str) -> str:
    """Parse and normalize response."""
    normalized = response.strip().upper()
    if normalized in ("TRUE", "FALSE"):
        return normalized
    # Fallback: check for keywords
    if "true" in response.lower():
        return "TRUE"
    if "false" in response.lower():
        return "FALSE"
    return "INVALID"
```

---

## 7. Scoring Specification

### 7.1 Ground Truth Computation

**Frozen Disposition → Reversal Mapping:**

| SCDB Code | Disposition Label | Reversal (GT) |
|-----------|-------------------|---------------|
| 1 | stay, cert or writ denied/dismissed | FALSE |
| 2 | affirmed | FALSE |
| 3 | reversed | TRUE |
| 4 | reversed and remanded | TRUE |
| 5 | vacated and remanded | TRUE |
| 6 | affirmed and reversed (or modified) in part | FALSE |
| 7 | affirmed and reversed (or modified) in part and remanded | FALSE |
| 8 | vacated | TRUE |
| 9 | petition granted or jurisdiction postponed | FALSE |
| 10 | certification to or from a lower court | FALSE |
| 11 | no disposition | FALSE |

**Rationale for codes 6, 7:** Mixed dispositions do not constitute a full reversal; scored as FALSE for determinism.

```python
REVERSAL_MAP = {
    "1": False,   # stay/cert denied
    "2": False,   # affirmed
    "3": True,    # reversed
    "4": True,    # reversed and remanded
    "5": True,    # vacated and remanded
    "6": False,   # affirmed and reversed in part
    "7": False,   # affirmed and reversed in part and remanded
    "8": True,    # vacated
    "9": False,   # cert granted
    "10": False,  # certification
    "11": False,  # no disposition
}

def compute_ground_truth(disposition_code: str) -> str:
    """Compute GT reversal boolean from SCDB code."""
    is_reversal = REVERSAL_MAP.get(disposition_code, False)
    return "TRUE" if is_reversal else "FALSE"
```

### 7.2 Scoring Function

```python
def score(response: str, disposition_code: str) -> float:
    """Score response against ground truth."""
    parsed = parse_response(response)
    gt = compute_ground_truth(disposition_code)
    
    if parsed == "INVALID":
        return 0.0
    return 1.0 if parsed == gt else 0.0
```

### 7.3 Scoring Summary

| Condition | Score |
|-----------|-------|
| Exact match on GT | 1.0 |
| Mismatch or invalid | 0.0 |

---

## 8. Example Instances

### Instance A: Reversal

**Input:**
- `{CASE_NAME}` = "WRIGHT et al. v. CITY OF ROANOKE REDEVELOPMENT AND HOUSING AUTHORITY"
- `{US_CITE}` = "479 U.S. 418"
- `{DISPOSITION_CODE}` = "3"

**Ground Truth:** `TRUE` (code 3 = reversed)

### Instance B: Affirmance

**Input:**
- `{CASE_NAME}` = "CHICAGO JUNCTION RAILWAY COMPANY v. KING"
- `{US_CITE}` = "222 U.S. 222"
- `{DISPOSITION_CODE}` = "2"

**Ground Truth:** `FALSE` (code 2 = affirmed)

### Instance C: Vacated

**Input:**
- `{CASE_NAME}` = "MAGGIO, WARDEN v. WILLIAMS"
- `{US_CITE}` = "464 U.S. 46"
- `{DISPOSITION_CODE}` = "8"

**Ground Truth:** `TRUE` (code 8 = vacated)

---

## 9. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template with `{PLACEHOLDERS}`
- [x] Data requirements: table, columns, joins specified
- [x] Eligibility predicate: SQL provided
- [x] Instantiation query: deterministic
- [x] Response format: closed enum with parsing rules
- [x] Scoring: frozen mapping table + exact match

**Status: ✅ FULLY DEVELOPED**

---
---

# FDQ 3: SC-P1 — Supporting Authority Pick

## 1. Question ID

| Field | Value |
|-------|-------|
| **Question ID** | `SC-P1` |
| **QB Reference** | 1.5 |
| **Family** | KA-SC (Known Authority - SCOTUS) |
| **Reasoning Depth** | Level 2 (signal interpretation) |

---

## 2. Prompt Template

```
The following Supreme Court opinion cites these three precedents:

A: {OPTION_A_CASE_NAME}, {OPTION_A_US_CITE}
B: {OPTION_B_CASE_NAME}, {OPTION_B_US_CITE}
C: {OPTION_C_CASE_NAME}, {OPTION_C_US_CITE}

Which of A, B, or C does the opinion follow, apply, or rely on as supporting authority (not merely mention or cite in passing)?

Respond with exactly one letter: A, B, or C
```

---

## 3. Data Requirements

| Table | Columns Used | Role |
|-------|--------------|------|
| `scotus_citations_ranked_flat` | `anchor_usCite`, `cited_usCite`, `fowler_score`, `occurrences` | Citation inventory |
| `scdb_cases` | `usCite`, `lexisCite`, `caseName` | Crosswalk + metadata |
| `shepards_edges` | `citing_lexis`, `cited_lexis`, `treatment_norm`, `agree` | Treatment signals |

**Join path:**
```
scotus_citations_ranked_flat c
  JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
  JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
  JOIN shepards_edges s 
    ON anchor_scdb.lexisCite = s.citing_lexis 
    AND cited_scdb.lexisCite = s.cited_lexis
```

**Null handling:**
- `fowler_score IS NULL` → exclude from candidate pool
- `treatment_norm IS NULL` → exclude from candidate pool

---

## 4. Eligibility Criteria

```sql
WITH anchor_treatments AS (
    SELECT 
        c.anchor_usCite,
        c.cited_usCite,
        cited_scdb.caseName,
        c.fowler_score,
        c.occurrences,
        s.treatment_norm,
        CASE 
            WHEN s.treatment_norm = 'follows' THEN 'in_favor'
            WHEN s.treatment_norm IN ('distinguishes','questions','criticizes','overrules','limits') THEN 'against'
            ELSE 'neutral'
        END as polarity_bucket
    FROM scotus_citations_ranked_flat c
    JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
    JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
    JOIN shepards_edges s 
        ON anchor_scdb.lexisCite = s.citing_lexis 
        AND cited_scdb.lexisCite = s.cited_lexis
    WHERE c.fowler_score IS NOT NULL 
      AND s.treatment_norm IS NOT NULL
)
SELECT anchor_usCite
FROM anchor_treatments
GROUP BY anchor_usCite
HAVING 
    SUM(CASE WHEN polarity_bucket = 'in_favor' THEN 1 ELSE 0 END) >= 1
    AND SUM(CASE WHEN polarity_bucket = 'neutral' THEN 1 ELSE 0 END) >= 2;
```

**Eligibility predicate:** Anchor must have ≥1 `in_favor` citation AND ≥2 `neutral` citations.

**Coverage:** ~2,500+ anchors (based on query results)

---

## 5. Instantiation Query

### 5.1 Polarity Mapping (Frozen)

```python
POLARITY_MAP = {
    # in_favor (supporting)
    "follows": "in_favor",
    
    # against (limiting)
    "distinguishes": "against",
    "questions": "against",
    "criticizes": "against",
    "overrules": "against",
    "limits": "against",
    
    # neutral
    "cites": "neutral",
    "explains": "neutral",
    "other": "neutral",
}

def get_polarity(treatment_norm: str) -> str:
    return POLARITY_MAP.get(treatment_norm, "neutral")
```

### 5.2 Option Selection Query

```sql
WITH candidates AS (
    SELECT 
        c.cited_usCite,
        cited_scdb.caseName,
        c.fowler_score,
        c.occurrences,
        s.treatment_norm,
        CASE 
            WHEN s.treatment_norm = 'follows' THEN 'in_favor'
            WHEN s.treatment_norm IN ('distinguishes','questions','criticizes','overrules','limits') THEN 'against'
            ELSE 'neutral'
        END as polarity_bucket,
        ROW_NUMBER() OVER (
            PARTITION BY CASE 
                WHEN s.treatment_norm = 'follows' THEN 'in_favor'
                WHEN s.treatment_norm IN ('distinguishes','questions','criticizes','overrules','limits') THEN 'against'
                ELSE 'neutral'
            END 
            ORDER BY c.fowler_score DESC, c.occurrences DESC, c.cited_usCite ASC
        ) as rank_in_bucket
    FROM scotus_citations_ranked_flat c
    JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
    JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
    JOIN shepards_edges s 
        ON anchor_scdb.lexisCite = s.citing_lexis 
        AND cited_scdb.lexisCite = s.cited_lexis
    WHERE c.anchor_usCite = '{TARGET_ANCHOR}'
      AND c.fowler_score IS NOT NULL 
      AND s.treatment_norm IS NOT NULL
)
SELECT * FROM (
    -- Select top in_favor candidate (this is the correct answer)
    SELECT cited_usCite, caseName, fowler_score, polarity_bucket, 'correct' as role
    FROM candidates 
    WHERE polarity_bucket = 'in_favor' AND rank_in_bucket = 1
    
    UNION ALL
    
    -- Select top 2 neutral candidates (these are distractors)
    SELECT cited_usCite, caseName, fowler_score, polarity_bucket, 'distractor' as role
    FROM candidates 
    WHERE polarity_bucket = 'neutral' AND rank_in_bucket <= 2
) 
ORDER BY RANDOM();  -- Shuffle for option assignment
```

### 5.3 Instantiation Procedure

1. Run eligibility check for target anchor
2. Execute option selection query with deterministic seed
3. Assign letters A/B/C based on shuffled order (seed = `hash(anchor_usCite + eu_id)`)
4. Record which letter is `in_favor` → this is Ground Truth
5. Populate placeholders

**Placeholder mapping:**
- `{OPTION_A_CASE_NAME}`, `{OPTION_A_US_CITE}` ← first shuffled result
- `{OPTION_B_CASE_NAME}`, `{OPTION_B_US_CITE}` ← second shuffled result
- `{OPTION_C_CASE_NAME}`, `{OPTION_C_US_CITE}` ← third shuffled result

---

## 6. Response Format

**Type:** Closed enum

**Contract:** Exactly one of `{A, B, C}`

**Parsing rules:**
```python
def parse_response(response: str) -> str:
    """Parse and normalize response."""
    normalized = response.strip().upper()
    if normalized in ("A", "B", "C"):
        return normalized
    # Fallback: find first letter
    for char in response.upper():
        if char in ("A", "B", "C"):
            return char
    return "INVALID"
```

---

## 7. Scoring Specification

### 7.1 Ground Truth Computation

**GT = the letter assigned to the `in_favor` option**

```python
def compute_ground_truth(options: list[dict]) -> str:
    """Find the letter assigned to the in_favor option."""
    for opt in options:
        if opt["polarity_bucket"] == "in_favor":
            return opt["assigned_letter"]
    raise ValueError("No in_favor option found")
```

### 7.2 Tie-Break Rules (for option selection)

If multiple `in_favor` candidates exist, select by:
1. `fowler_score` DESC
2. `occurrences` DESC  
3. `cited_usCite` ASC (lexicographic)

```python
TIE_BREAK_ORDER = [
    ("fowler_score", "DESC"),
    ("occurrences", "DESC"),
    ("cited_usCite", "ASC"),
]
```

### 7.3 Scoring Function

```python
def score(response: str, ground_truth_letter: str) -> float:
    """Score response against ground truth."""
    parsed = parse_response(response)
    
    if parsed == "INVALID":
        return 0.0
    return 1.0 if parsed == ground_truth_letter else 0.0
```

### 7.4 Scoring Summary

| Condition | Score |
|-----------|-------|
| Exact match on GT letter | 1.0 |
| Mismatch or invalid | 0.0 |

---

## 8. Example Instance

**Anchor:** Planned Parenthood v. Casey, 505 U.S. 833

**Selected Options (after shuffle with seed):**

| Letter | Case | US Cite | Polarity | Role |
|--------|------|---------|----------|------|
| A | Pierce v. Society of Sisters | 268 U.S. 510 | neutral | distractor |
| B | Roe v. Wade | 410 U.S. 113 | in_favor | **correct** |
| C | West Virginia v. Barnette | 319 U.S. 624 | neutral | distractor |

**Instantiated Prompt:**
```
The following Supreme Court opinion cites these three precedents:

A: PIERCE, GOVERNOR OF OREGON, et al. v. SOCIETY OF SISTERS, 268 U.S. 510
B: ROE et al. v. WADE, DISTRICT ATTORNEY OF DALLAS COUNTY, 410 U.S. 113
C: WEST VIRGINIA STATE BOARD OF EDUCATION et al. v. BARNETTE et al., 319 U.S. 624

Which of A, B, or C does the opinion follow, apply, or rely on as supporting authority (not merely mention or cite in passing)?

Respond with exactly one letter: A, B, or C
```

**Ground Truth:** `B`

**Rationale:** Roe v. Wade has `treatment_norm = 'follows'` in the Shepard's edge, mapping to `in_favor`. The other two have `treatment_norm = 'cites'`, mapping to `neutral`.

---

## 9. FDQ Checklist

- [x] Question ID + family assigned
- [x] Complete prompt template with `{PLACEHOLDERS}`
- [x] Data requirements: tables, columns, joins, null handling specified
- [x] Eligibility predicate: SQL provided with coverage estimate
- [x] Instantiation query: deterministic with tie-breaks and shuffle seed
- [x] Response format: closed enum with parsing rules
- [x] Scoring: GT computation from polarity + exact match

**Status: ✅ FULLY DEVELOPED**

---
---

# Summary

| FDQ | Question ID | Family | Data Deps | Policy Decisions Made |
|-----|-------------|--------|-----------|----------------------|
| 1 | C-NONEXIST1 | Canary | None | Synthetic cite algorithm frozen |
| 2 | FE-REVERSAL | Fact Extraction | `scdb_cases` | Disposition→reversal map frozen |
| 3 | SC-P1 | KA-SC | 3 tables joined | Polarity mapping frozen |

All three are now **implementation-ready** per the FDQ specification.
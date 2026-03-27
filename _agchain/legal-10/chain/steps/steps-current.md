# Chain Steps Analysis - Detailed Mechanics

Based on analysis of all 13 files in `chain/steps/`, here's a comprehensive breakdown:

---

## Architecture Overview

The step library implements a **stateful evaluation pipeline** where each step:
1. Declares dependencies via `requires()`
2. Checks data availability via `check_coverage()`
3. Builds prompts via `prompt(ctx)`
4. Parses LLM responses via `parse()`
5. Provides ground truth via `ground_truth(ctx)`
6. Computes scores via `score(parsed, gt)`

---

## base.py - Abstract Step Interface

**Role:** Defines the contract all steps must implement.

| Method | Purpose |
|--------|---------|
| `step_id` | Unique ID with optional variant (e.g., `s5:cb`, `s5:rag`) |
| `step_name` | Logical name without variant |
| `requires()` | Returns set of step_ids that must complete first |
| `check_coverage(ctx)` | Tier-based data availability check |
| `prompt(ctx)` | Returns `(text, obj, meta)` tuple for LLM |
| `parse(raw)` | Parses LLM response into structured dict |
| `ground_truth(ctx)` | Extracts expected answers from instance |
| `score(parsed, gt)` | Returns `(float, bool)` score and correctness |

**Key Design:** Executor owns status decisions; steps only emit payloads.

---

## s1_known_authority.py:33 - Metadata Extraction

**Purpose:** Extract anchor case citation, name, and term from opinion text.

**Mechanics:**
- Input: Full opinion text (truncated to 50k chars)
- Output: `{us_cite, case_name, term}`
- Scoring: Uses `canonicalize_cite()` for tolerant matching
  - Both cite AND term match → 1.0
  - One match → 0.5
  - Case name NOT scored (too fuzzy)
- Dependencies: None (first step)
- Coverage: Requires cited_case text (Tier A)

---

## s2_unknown_authority.py:31 - Reverse Citator

**Purpose:** Predict which cases CITE this precedent (tests recall/hallucination).

**Mechanics:**
- Input: Case metadata + optional S4 holding
- Output: `{citing_cases: [{us_cite, case_name}, ...]}`
- Scoring: **MRR (Mean Reciprocal Rank)**
  - Finds ground-truth citing case in model's ranked list
  - Score = 1/rank (e.g., rank 3 → 0.333)
  - correct = True if rank ≤ 10
- Dependencies: S1

---

## s3_validate_authority.py:65 - Dual-Channel Status

**Purpose:** Report authority status from TWO independent sources without doctrinal judgment.

**Two Channels:**
1. **Curated (Dahl):** Hand-curated overruled cases
2. **Citator (Shepard's):** Edge-level treatment signal

**Output:**
```json
{
  "curated_annotation": {present, overruling_case, year_overruled, overruled_in_full},
  "citator_treatment": {edge_label, agree},
  "consistency_flag": "CONSISTENT|INCONSISTENT|CURATED_ONLY|CITATOR_ONLY",
  "caveat": "Dataset annotation; not a good-law determination."
}
```

**Scoring:** Exact match on `consistency_flag`

---

## s4_fact_extraction.py:63 - Disposition & Party

**Purpose:** Extract procedural outcome from opinion.

**Output (v2.0.0 schema):**
- `disposition`: 9-value closed enum (affirmed, reversed, vacated, etc.)
- `party_winning`: petitioner | respondent | unclear
- `holding_summary`: Brief holding
- `evidence_quotes`: Supporting quotes

**Scoring:** Both disposition AND party must match for 1.0

---

## s5_distinguish.py:78-148 - Treatment Classification

**Purpose:** Classify whether citing case AGREES with or DISTINGUISHES precedent.

**Two Variants:**

| Variant | Input | Tests |
|---------|-------|-------|
| `S5:CB` | Metadata + Shepard's hint (no opinion text) | Structural reasoning from signals |
| `S5:RAG` | Full citing opinion (30k chars) | Extraction from language |

**Output:**
```json
{
  "predicted_treatment": "follows|distinguishes|overrules|...",
  "predicted_agree": true|false,
  "reasoning": "...",
  "evidence_quotes": [...]
}
```

**Scoring:** 50% treatment match + 50% agree match = 1.0

---

## s6_irac_synthesis.py:60 - Closed-Book IRAC

**Purpose:** Synthesize prior step outputs into IRAC analysis WITHOUT external evidence.

**Input Aggregation:** Combines S1-S5 results
**Output:** `{issue, rule, application, conclusion}`

**Important:**
- Canonical spec: `j6` (judge-scored)
- Ground truth declares `judge_required: True`
- In-file scoring is **structural only** (presence check)
- Final quality via MEE-style judge rubric

---

## s7_open_book_synthesis.py:48 - Open-Book IRAC

**Purpose:** Write IRAC from Research Pack (external evidence admitted).

**Key Rules (enforced in prompt):**
1. Every claim must cite document ID (`[DOC1]`, `[DOC2]`)
2. Case authorities need literal U.S. Reports citations
3. Conflicts between documents must be surfaced
4. No unqualified doctrinal claims

**Dependencies:** Requires S6 (uses closed-book draft as reference)

---

## s8_citation_integrity.py:19 - DETERMINISTIC Gate

**Purpose:** Verify all citations in S7 output - **NO LLM CALL**.

**Verification Algorithm:**
1. Extract U.S. Reports citations from S7 IRAC components
2. Canonicalize each citation
3. Check against `fake_us_cites` (synthetic hallucination traps) → FAIL if found
4. Check against `scdb_us_cites` (valid SCOTUS citations) → must exist

**Output:**
```json
{
  "citations_found": [{cite, canonical, exists, is_fake, in_scdb}, ...],
  "all_valid": boolean
}
```

**Scoring:** Binary PASS (1.0) / FAIL (0.0)

**Key Insight:** This is the **citation integrity gate** - catches hallucinated citations.

---

## s9_transitive_authority.py:107-168 - 3-Case Reasoning

**Purpose:** Test transitive precedent chain reasoning.

**The Triangle:**
- Case A (Anchor): Oldest authority
- Case B (Middle): Cites A with known treatment
- Case C (Newest): Cites B → **PREDICT** C's treatment of A

**Transitive Logic:**
| B→A | C→B | Predicted C→A |
|-----|-----|---------------|
| follows | follows | likely follows |
| distinguishes | follows | unclear |
| overrules | (any) | strong overrule signal |

**Two Variants:**
- `S9:CB`: Metadata only (pure logical inference)
- `S9:RAG`: Full opinion excerpts (30k budget: 40% newest, 30% anchor, 30% middle)

---

## s10_oyez_oral_argument.py:41 - Transcript Prediction

**Purpose:** Predict case winner from oral argument tone/questions.

**Input:** Oyez transcript (40k char limit)
**Output:** `{predicted_winner, confidence, reasoning}`
**Scoring:** Binary exact match (unclear = 0.0)
**Dependencies:** None (standalone)

---

## stub_step.py:12 - Testing Utility

**Purpose:** Configurable mock step for testing executor logic.

**Configurable:** name, variant, requires, always_correct, score_value, require_citing_text, parsed_response, ground_truth_data

---

## Dependency Graph

```
S1 ─────┬───────┬───────┬────────────┐
        │       │       │            │
       S2      S3      S4            │
        │       │       │            │
        │       │       └──> S5:cb/rag
        │       │              │
        └───────┴──────────────┘
                    │
                   S6 (Closed-Book IRAC)
                    │
                   S7 (Open-Book IRAC + RP)
                    │
                   S8 (Citation Integrity Gate)

STANDALONE:
- S9:cb/S9:rag (Transitive) - needs triangle data
- S10 (Oyez) - needs transcript
```

---

## Scoring Types by Step

| Step | Scoring Method | Metric |
|------|---------------|--------|
| S1 | Deterministic | Citation + Term exact match |
| S2 | Ranking | MRR (1/rank), correct if rank ≤10 |
| S3 | Deterministic | Consistency flag exact match |
| S4 | Deterministic | Disposition + Party exact match |
| S5 | Deterministic | Treatment(50%) + Agree(50%) |
| S6 | Structural → Judge | Component presence (IRAC quality via MEE judge) |
| S7 | Structural → Judge | Component presence (IRAC quality via MEE judge) |
| S8 | Deterministic | Binary PASS/FAIL (all_valid) |
| S9 | Deterministic | Treatment(50%) + Agree(50%) |
| S10 | Deterministic | Winner exact match |

---

## Key Architectural Patterns

1. **Dependency Graph:** Steps declare requirements, executor enforces order
2. **Coverage Tiers:** A (cited text), B (citing text), C (triangle), D (oyez)
3. **Two Modes:** CB (closed-book/backbone) vs RAG (with evidence)
4. **Three Scoring Types:** Deterministic (exact match), MRR (ranking), Judge (MEE rubric)
5. **Hallucination Detection:** Canary steps + citation integrity gate
6. **Stateful Context:** ChainContext carries prior step results forward
7. **Prompt Resolution:** Steps use `resolve_prompt()` from `core.prompts.resolver` for template injection

# Citation Depth Labeling Specification

<!-- TODO223: Minor terminology updates needed for benchmark-structure-v2.md -->
<!-- TODO223: Changes required:
     1. Replace "Harness" with "Runner" terminology
     2. Reference ground truth storage location: private/ground_truth.json
     3. Algorithm itself is still valid - no changes to labeling logic
-->

**Status:** NEEDS UPDATE (minor terminology - see benchmark-structure-v2.md)
**Created:** 2026-01-08
**Purpose:** Define the build-time algorithm for labeling citations as DETAILED vs PASSING for Canary evaluation

---

## Executive Summary

This spec defines how to label each citation in an anchor opinion as either:

- **DETAILED** - Anchor substantively discusses this citation (model CAN provide details)
- **PASSING** - Anchor only mentions this citation in passing (model CANNOT provide details without hallucinating)

These labels enable the Canary mechanism at run-time: if a model provides details about a PASSING citation, it has hallucinated (used pretraining knowledge instead of staying within evidence bounds).

---

## The Problem

When evaluating an LLM's legal reasoning:

1. We give it an anchor opinion (the evidence)
2. We ask about cases cited in that anchor
3. We need to know: **should the model be able to answer?**

Without labels, we can't distinguish:

- Model legitimately extracted info from anchor
- Model hallucinated from pretraining

**The label tells the CE what to expect.**

---

## The Solution: 3-Factor Hybrid Labeling

### Design Principle

Use the strongest available signal first, fall back to weaker signals only when necessary.

```
┌─────────────────────────────────────────────────────────┐
│  Factor 1: SYLLABUS CHECK (Gold Standard)               │
│  Signal: Editorial judgment from Reporter of Decisions  │
│  Confidence: 100%                                       │
├─────────────────────────────────────────────────────────┤
│  Factor 2: STRING CITE DETECTION (Structural)           │
│  Signal: Legal citation conventions (syntax patterns)   │
│  Confidence: ~90%                                       │
├─────────────────────────────────────────────────────────┤
│  Factor 3: TF-IDF COSINE (Statistical)                  │
│  Signal: Vocabulary overlap with cited case syllabus    │
│  Confidence: ~70%                                       │
└─────────────────────────────────────────────────────────┘
```

### Factor 1: Syllabus Check (Gold Standard)

**What it is:**
The syllabus of a SCOTUS opinion is written by the Reporter of Decisions to summarize the most important points of the case. If a cited case appears in the anchor's syllabus, the Reporter deemed it important enough to mention in the official summary.

**Data source:** `casesumm_syllabi.parquet` (27,071 SCOTUS syllabi)

**Logic:**

```python
if cited_case_name in anchor_syllabus:
    return "DETAILED", confidence=1.0, reason="in_anchor_syllabus"
```

**Why it's the gold standard:**

- Editorial judgment, not statistical inference
- The Reporter is a legal expert who read the full opinion
- Impossible for a passing mention to make the syllabus
- Data already exists - no computation needed

### Factor 2: String Cite Detection (Structural)

**What it is:**
Legal citations follow standardized patterns. "String cites" (lists of cases for general support) have distinct syntactic markers that indicate passing mention.

**Data source:** Anchor text from `scdb_full_with_text.jsonl` + offsets from `citation_inventory.parquet`

**PASSING indicators (in 50 chars before citation):**

- Semicolon `;` (indicates a list)
- Signal words: `See`, `See also`, `Cf.`, `e.g.`, `accord`, `See generally`

**Logic:**

```python
window_before = anchor_text[cite_offset-50:cite_offset]
if ";" in window_before or re.search(r"See( also)?|Cf\.|e\.g\.|accord", window_before):
    return "PASSING", confidence=0.9, reason="string_cite_pattern"
```

**Why it works:**

- Legal writing conventions are standardized
- String cites almost never contain substantive discussion
- Simple regex, computationally cheap

### Factor 3: TF-IDF Cosine (Statistical Fallback)

**What it is:**
For citations not caught by Factors 1-2, compare vocabulary overlap between the anchor's discussion and the cited case's syllabus.

**Data sources:**

- Anchor text window (±200 chars around citation)
- Cited case syllabus from `casesumm_syllabi.parquet`

**Logic:**

```python
anchor_window = anchor_text[cite_offset:cite_offset+200]
tfidf_score = cosine_similarity(tfidf(anchor_window), tfidf(cited_syllabus))

if tfidf_score > 0.15:
    return "DETAILED", confidence=0.7, reason="tfidf_match"
else:
    return "PASSING", confidence=0.6, reason="tfidf_low"
```

**Why it's the fallback:**

- TF-IDF is brittle (fails on synonyms like "abrogated" vs "overruled")
- Can be tricked by random word overlap
- Threshold (0.15) is somewhat arbitrary
- But still useful for ambiguous cases

---

## Alternative Methods Considered and Rejected

### Alternative A: TF-IDF Only

**Approach:** Use TF-IDF cosine similarity as the sole signal.

**Why rejected:**

- Brittle on synonyms and paraphrasing
- No semantic understanding
- Arbitrary threshold with no principled basis
- Ignores structural signals (string cites)
- Ignores authoritative signals (syllabus)

**Verdict:** Too weak on its own. Demoted to Factor 3.

### Alternative B: Fowler Score Threshold

**Approach:** Use Fowler's authority score (pauth_score) to determine importance.

**Why rejected:**

- Fowler score measures **network importance** (how often a case is cited across the corpus)
- Does NOT measure **how this anchor discusses the case**
- A landmark case (high Fowler) can still be a passing mention in a specific opinion
- Wrong signal for this task

**Verdict:** Fowler is for ranking authorities, not labeling citation depth.

### Alternative C: Context Window Length Only

**Approach:** If >N characters surround the citation, label as DETAILED.

**Why rejected:**

- Footnotes can be long but still passing mentions
- Doesn't account for content (long != substantive)
- Too many false positives

**Verdict:** Useful as a secondary signal within TF-IDF, not standalone.

### Alternative D: Embedding-Based Semantic Similarity

**Approach:** Use sentence embeddings (e.g., sentence-transformers) to compare anchor window to cited syllabus.

**Why considered:**

- Handles synonyms and paraphrasing better than TF-IDF
- Captures semantic meaning

**Why deferred (not rejected):**

- Requires model inference at build time
- Adds compute cost
- The 3-factor hybrid may be sufficient
- Can revisit if TF-IDF fallback proves inadequate

**Verdict:** Keep as future enhancement if needed.

### Alternative E: LLM-as-Judge for Labeling

**Approach:** Use an LLM to read anchor + citation context and classify as DETAILED/PASSING.

**Why rejected:**

- Build-time LLM calls are expensive (151K+ citations)
- Introduces non-determinism
- Circular dependency (using LLM to evaluate LLM)
- The hybrid approach should handle most cases

**Verdict:** Over-engineered for this task.

### Alternative F: Redacted Anchor Approach

**Approach:** Create two versions of anchor text:

- Version A: Citation strings only (context redacted)
- Version B: Full anchor text

Deliver Version A first, test if model hallucinates, then deliver Version B.

**Why deferred:**

- Requires generating redacted anchor versions (new pipeline stage)
- More complex delivery sequence
- The labeling approach achieves similar goal with less complexity

**Verdict:** The label-based approach is simpler. Redaction may be useful for future "information discipline" tests but is not required for Canary.

---

## Algorithm Specification

```python
def label_citation(
    anchor_usCite: str,
    cited_case_name: str,
    anchor_text: str,
    cite_offset: int,
    cited_syllabus: str,
    syllabi_lookup: dict  # anchor_usCite -> syllabus
) -> dict:
    """
    Label a citation as DETAILED or PASSING.

    Returns:
        {
            "label": "DETAILED" | "PASSING",
            "confidence": float (0-1),
            "reason": str,
            "factor": int (1, 2, or 3)
        }
    """

    # FACTOR 1: Syllabus Check (Gold Standard)
    anchor_syllabus = syllabi_lookup.get(anchor_usCite, "")
    if anchor_syllabus and cited_case_name in anchor_syllabus:
        return {
            "label": "DETAILED",
            "confidence": 1.0,
            "reason": "in_anchor_syllabus",
            "factor": 1
        }

    # FACTOR 2: String Cite Detection (Structural)
    window_start = max(0, cite_offset - 50)
    window_before = anchor_text[window_start:cite_offset]

    string_cite_pattern = r"(;|See( also)?|Cf\.|e\.g\.|accord|See generally)"
    if re.search(string_cite_pattern, window_before):
        return {
            "label": "PASSING",
            "confidence": 0.9,
            "reason": "string_cite_pattern",
            "factor": 2
        }

    # FACTOR 3: TF-IDF Cosine (Statistical Fallback)
    window_after = anchor_text[cite_offset:cite_offset + 200]

    if cited_syllabus:
        tfidf_score = compute_tfidf_cosine(window_after, cited_syllabus)

        if tfidf_score > 0.15:
            return {
                "label": "DETAILED",
                "confidence": 0.7,
                "reason": "tfidf_match",
                "factor": 3,
                "tfidf_score": tfidf_score
            }

    # DEFAULT: Conservative PASSING
    return {
        "label": "PASSING",
        "confidence": 0.5,
        "reason": "default_conservative",
        "factor": 3
    }
```

---

## Output Schema

### File: `citation_depth_labels.parquet`

| Column            | Type   | Description                                    |
| ----------------- | ------ | ---------------------------------------------- |
| `anchor_caseId`   | string | SCDB case ID of anchor                         |
| `anchor_usCite`   | string | U.S. citation of anchor                        |
| `cited_usCite`    | string | U.S. citation of cited case                    |
| `cited_case_name` | string | Name of cited case                             |
| `cite_offset`     | int    | Character offset in anchor text                |
| `label`           | string | "DETAILED" or "PASSING"                        |
| `confidence`      | float  | 0.0 to 1.0                                     |
| `reason`          | string | Why this label was assigned                    |
| `factor`          | int    | Which factor determined the label (1, 2, or 3) |
| `tfidf_score`     | float  | TF-IDF score (null if not Factor 3)            |

---

## Pipeline Integration

**Stage:** 3.9 (after 3.8 eligibility, before 4A ResearchPack assembly)

**Inputs:**

- `casesumm_syllabi.parquet` (anchor syllabi)
- `scdb_full_with_text.jsonl` (anchor opinion text)
- `citation_inventory.parquet` (citation offsets)
- `scotus_citations_ranked.jsonl` (citation pairs with case names)

**Outputs:**

- `citation_depth_labels.parquet` (~151K rows for eligible citations)

**Consumer:**

- Stage 4A (ResearchPack Assembler) writes labels into DOC3 metadata
- Stage 5 (Runner/Harness) uses labels to score Canary responses

---

## Run-Time Usage (Harness Scoring)

When model responds to "What does [Citation X] hold?":

```python
label = doc3.citation_labels[citation_id]

if label == "PASSING" and model_gave_substantive_answer:
    score = 0  # FAIL: Information discipline violation (Canary died)

elif label == "PASSING" and model_said_insufficient_info:
    score = 1  # PASS: Model correctly identified evidence boundary

elif label == "DETAILED" and model_gave_substantive_answer:
    # Need to verify answer against anchor text
    score = verify_against_anchor(model_answer, anchor_text)

elif label == "DETAILED" and model_said_insufficient_info:
    score = 0.5  # PARTIAL: Model was overly conservative
```

---

## Expected Distribution

Based on legal citation patterns, estimated distribution:

| Label    | Factor                 | Estimated % | Description                           |
| -------- | ---------------------- | ----------- | ------------------------------------- |
| DETAILED | 1 (Syllabus)           | ~10-15%     | Important enough for official summary |
| PASSING  | 2 (String cite)        | ~40-50%     | Obvious list-style citations          |
| DETAILED | 3 (TF-IDF high)        | ~15-20%     | Substantive discussion detected       |
| PASSING  | 3 (TF-IDF low/default) | ~20-30%     | Ambiguous, conservative default       |

**Note:** Actual distribution to be measured after implementation.

---

## Open Questions

1. **Threshold tuning:** Is 0.15 the right TF-IDF threshold? May need calibration on sample data.

2. **CAP citations:** Factor 1 (syllabus check) only works for SCOTUS anchors citing SCOTUS cases. CAP citations rely on Factors 2-3 only.

3. **Case name matching:** Need fuzzy matching for syllabus check (e.g., "Brown v. Board" vs "Brown v. Board of Education").

4. **Confidence weighting:** Should Harness scoring weight by confidence? Or treat all labels as binary?

---

## Implementation Plan

1. Write `scripts/data_pipeline/label_citation_depth.py`
2. Run on all 151,256 eligible citations
3. Output `citation_depth_labels.parquet`
4. Update pipeline map with Stage 3.9
5. Verify distribution matches expectations
6. Integrate into Stage 4A ResearchPack assembly

---

## Impact on chain/ Directory

### Key Insight

**The labels don't change WHAT steps do - they change HOW we SCORE responses.**

The model never sees the labels. Labels are ground truth for the scorer to detect hallucination.

### Impact Summary

| Directory              | Files Changed | Files Unchanged |
| ---------------------- | ------------- | --------------- |
| chain/steps/           | **0**         | 11              |
| chain/scoring/         | **3**         | 3               |
| shared/contracts/      | **2**         | —               |
| scripts/data_pipeline/ | **1 new**     | —               |

### chain/steps/ - UNCHANGED (All 11 files)

| File                     | Why Unchanged                                |
| ------------------------ | -------------------------------------------- |
| s1_known_authority.py    | Extracts anchor metadata - no citation depth |
| s2_citation_context.py   | SOURCE of cite offsets, not consumer         |
| s3_validate_authority.py | Validates authority existence, not depth     |
| s4_core_extraction.py    | Closed universe - no authority claims        |
| s5_consistency.py        | Step logic unchanged; **scoring changes**    |
| s6_composite_score.py    | Aggregation logic; may weight Canary         |
| s7_synthesis.py          | Step logic unchanged; **scoring changes**    |
| s8_citation_integrity.py | Different mechanism (fake vs real)           |
| s9_authority_chains.py   | Chain traversal - no depth scoring           |
| s10_oral_argument.py     | OYEZ transcripts - no citation depth         |

### chain/scoring/ - MODIFIED (3 files)

| File                    | Change                                             |
| ----------------------- | -------------------------------------------------- |
| **rubrics.py**          | Add `CanaryRubric` with 4-branch scoring logic     |
| **composite_scorer.py** | Integrate Canary results into S6 aggregation       |
| **judge.py**            | (Optional) Judge prompt for ambiguous Canary cases |

**New Canary Rubric Logic:**

```python
class CanaryRubric:
    def score(self, response, citation_label, citation_id):
        if label == "PASSING" and model_gave_details:
            return 0.0, "canary_violation"  # Hallucinated
        elif label == "PASSING" and model_said_insufficient:
            return 1.0, "canary_pass"  # Correct restraint
        elif label == "DETAILED" and model_gave_details:
            return verify_against_anchor(response)  # Check accuracy
        elif label == "DETAILED" and model_said_insufficient:
            return 0.5, "overly_conservative"  # Missed opportunity
```

### shared/contracts/ - MODIFIED (2 files)

| File           | Change                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| **chain.py**   | DOC3 citation schema adds `depth_label: Literal["DETAILED", "PASSING"]` |
| **results.py** | StepResult adds `canary_violations: list[str]`                          |

### Data Flow

```
BUILD TIME                           RUNTIME
───────────                          ───────
citation_inventory.parquet           research_pack.json
         │                                  │
         ▼                                  ▼
label_citation_depth.py              ctx.data["research_pack"]
         │                                  │
         ▼                                  │
citation_depth_labels.parquet              │
         │                                  │
         ▼                                  ▼
Stage 4A → DOC3.citations[].depth_label
                                           │
                                           ▼
                                    rubrics.py reads labels
                                    scores model response
```

### S6 Canary Integration Options

How should S6 (composite_score) handle Canary violations?

| Option                        | Behavior                                   | Rationale                                 |
| ----------------------------- | ------------------------------------------ | ----------------------------------------- |
| **A: Binary Gate (deferred)** | Any Canary violation → disqualify/void run | Hardline safety mode (not baseline)       |
| **B: Weighted Penalty**       | Canary violations reduce composite score   | Gradual penalty, allows comparison        |
| **C: Separate Track**         | Report Canary separately from S6           | Information discipline as distinct metric |

**Baseline v1 policy:** **no voiding**. Canary results must be recorded as scores/flags/violations (Option B and/or C), while allowing the run to complete.

### Implementation Phases

| Phase | Task                | Files                               |
| ----- | ------------------- | ----------------------------------- |
| 1     | Build pipeline      | `label_citation_depth.py` → parquet |
| 2     | Contract updates    | `chain.py`, `results.py`            |
| 3     | EU assembly         | Stage 4A writes labels into DOC3    |
| 4     | Scoring integration | `rubrics.py`, `composite_scorer.py` |
| 5     | Verification        | Run chain, verify Canary scoring    |

---

## Spec Review Notes

### Verified Data Sources

| Input File                   | Status       | Schema Notes                                        |
| ---------------------------- | ------------ | --------------------------------------------------- |
| `citation_inventory.parquet` | 378,938 rows | Has `start`/`end` offsets (spec uses `cite_offset`) |
| `casesumm_syllabi.parquet`   | 27,071 rows  | Has `usCite`, `syllabus` columns                    |
| `scdb_full_with_text.jsonl`  | Available    | Anchor opinion text                                 |

### Gaps to Address Before Implementation

| #   | Gap                         | Fix                                                |
| --- | --------------------------- | -------------------------------------------------- |
| 1   | Regex word boundary         | Change `See` to `\bSee\b` to avoid false matches   |
| 2   | Window inconsistency        | Prose says ±200, code says +200 only               |
| 3   | Field name mismatch         | Spec says `cite_offset`, data has `start`          |
| 4   | Fuzzy matching undefined    | Specify algorithm (e.g., Levenshtein ratio > 0.85) |
| 5   | Missing string cite signals | Add `Compare`, `But see`, `inter alia`             |

### Coverage Concern

With 323,404 U.S. citations and only 27,071 syllabi:

- Factor 1 can only fire for ~8% of SCOTUS-to-SCOTUS citations
- Factor 3 only works when cited case has a syllabus
- CAP citations (55,534 total) rely entirely on Factors 2-3

**Recommendation:** Add coverage analysis step after implementation to verify expected distribution.

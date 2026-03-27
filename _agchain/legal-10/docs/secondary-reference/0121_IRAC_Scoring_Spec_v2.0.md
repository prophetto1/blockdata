# IRAC Scoring Specification v2.0

**Version:** 2.0
**Date:** 2026-01-21
**Status:** Consolidated specification (supersedes v1.1.8 + v1.1.9)
**Scope:** IRAC synthesis scoring for d9 (closed-book) and j10 (open-book) steps

---

## Changelog from v1.1.8/v1.1.9

| Change | Rationale |
|--------|-----------|
| S6 → d9/j10 naming | Align with d*/j* step naming convention |
| S7 voiding → citation_integrity post-action | No run-voiding semantics in v1 baseline |
| Removed S5:cb Mode dependency | d9/j10 mode determined by payload admission, not S5 step |
| Consolidated v1.1.8 + v1.1.9 | Single authoritative document |
| Integrated Addendum C fixes | L1-L8 fixes merged inline |
| Removed duplicate Two-Pass section | Content unified in §13 |

---

## 0. Normative Language

### 0.1 Normative Keywords

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative per RFC 2119.

### 0.2 Canonical Runtime Objects (binding)

```
ChainContext:
  - ctx.instance: ChainInstance
  - ctx.get(step_id: str) -> StepResult | None

ChainInstance:
  - anchor_case: CourtCase
  - citing_case: CourtCase | None
  - edge: CitationEdge

CourtCase:
  - us_cite: str           # e.g., "347 U.S. 483"
  - case_name: str         # e.g., "Brown v. Board of Education"
  - term: int              # e.g., 1953

StepResult:
  - status: str            # "OK" | "SKIPPED_COVERAGE" | "SKIPPED_DEPENDENCY" | "ERROR"
  - parsed: dict           # Step-specific model payload
  - ground_truth: dict     # Step-specific scoring context
  - score: float           # 0.0-1.0
  - correct: bool          # Step correctness
  - raw_response: str      # Full raw model output
  - error_message: str | None
```

### 0.3 Status Semantics (binding)

- **OK**: Step executed, produced parsed payload. `correct` may be True or False.
- **SKIPPED_COVERAGE**: Step not attempted due to coverage policy.
- **SKIPPED_DEPENDENCY**: Step not attempted due to unsatisfied dependency.
- **ERROR**: Infrastructure failure (exception, timeout). `error_message` populated.

**Parse failure handling:** IRAC steps can return `status = "OK"` with `parse_success = False`. This is a model output quality issue, not infrastructure failure.

### 0.4 Dependency Resolution (binding)

A dependency is **satisfied** iff:
- `ctx.get(required_step_id)` exists AND
- `ctx.get(required_step_id).status == "OK"`

### 0.5 Exception Types (binding)

```python
class ScoringError(Exception):
    """Raised when scoring cannot be computed due to infrastructure failure."""
    pass
```

---

## 1. Architecture Overview

### 1.1 Two-IRAC Design

The benchmark produces two IRAC outputs per evaluation unit:

| Step | Name | Evidence | Purpose |
|------|------|----------|---------|
| **d9** | Closed-book IRAC | Anchor only (p1) | Baseline legal reasoning |
| **j10** | Open-book IRAC | Anchor + Research Pack (p1 + p2) | Enhanced reasoning with evidence |

### 1.2 Execution Order

```
d1 (KA) → ... → d9 (IRAC closed) → j10 (IRAC open) → [judge post-action] → [citation_integrity post-action]
```

### 1.3 Scoring Architecture

**Workflow:**
1. Eval model completes d9 (closed-book) then j10 (open-book)
2. Runner disconnects eval model
3. Runner connects judge model
4. Runner sends MEE rubric and both IRAC outputs to judge
5. Judge grades both IRACs simultaneously in single call
6. Runner performs deterministic citation integrity check (parallel with judge grading)

**Scoring:**
- **Judge call**: Single call grades both IRACs using MEE rubric; judge score IS the total score
- **Chain-consistency checks**: CC1-CC4 computed and logged for analysis (not weighted into total)
- **Citation integrity**: Deterministic validation against anchor inventory

---

## 2. Scoring Overview

### 2.1 Total Score (binding)

**Total Score = Judge Score (p_mee)**

The IRAC total score is the normalized judge score from the MEE hybrid rubric. The judge is REQUIRED for IRAC scoring.

### 2.2 Supplemental Metrics (tracked, not weighted)

| Metric | Type | Description |
|--------|------|-------------|
| Phase 1 (Structural) | Deterministic | Structural presence of IRAC sections |
| Phase 2 (CC1-CC4) | Deterministic | Chain-consistency checks |

These metrics are computed and logged for analysis but do NOT contribute to the total score.

**Total Score:** 0.0 to 1.0 (normalized)

---

## 3. IRAC Mode Selection

### 3.1 Mode Definitions

| Mode | Step | Payload | Description |
|------|------|---------|-------------|
| **Closed-book** | d9 | p1 only | No research pack; model uses only anchor text |
| **Open-book** | j10 | p1 + p2 | Research pack admitted; model has authority materials |

Mode is determined by **payload admission** (defined in plan.json), not by a separate inference step.

### 3.2 Mode-Specific Constraints

**d9 (Closed-book):**
- Model MUST NOT cite authorities beyond anchor text
- Model MUST NOT fabricate case treatment relationships
- "Insufficient information" is valid response for unverifiable claims

**j10 (Open-book):**
- Model MAY cite authorities from research pack
- Model MUST use provided evidence accurately
- Citations must match anchor inventory or RP subset

---

## 4. Prompt Templates

### 4.1 d9 Closed-Book IRAC Prompt (binding)

```
You are a legal research assistant. Synthesize the following information into a complete IRAC legal analysis.

CASE INFORMATION:
- Citation: {anchor_us_cite}
- Name: {anchor_case_name}
- Term: {anchor_term}

ANCHOR TEXT:
{anchor_text}

EXTRACTED FACTS (from prior steps):
- Disposition: {disposition}
- Party Winning: {party_winning}
- Holding: {holding_summary}

AUTHORITY STATUS:
{authority_status}

MODE: CLOSED-BOOK
You have ONLY the anchor text above. Do not cite external authorities.
Do not fabricate case treatment or relationships not evident in the text.

Write a complete IRAC analysis:
1. ISSUE: State the central legal question the Court addressed.
2. RULE: Identify the legal rule or principle the Court applied.
3. APPLICATION: Explain how the Court applied the rule to the facts.
4. CONCLUSION: State the Court's holding and its significance.

Return a JSON object:
- "issue": The legal issue (1-2 sentences)
- "rule": The applicable rule (1-2 sentences)
- "application": How the rule was applied (2-3 sentences)
- "conclusion": The holding and significance (1-2 sentences)
- "citations": List of citations used (may be empty for closed-book)

No extra keys. No markdown code fences.
```

### 4.2 j10 Open-Book IRAC Prompt (binding)

```
You are a legal research assistant. Synthesize the following information into a complete IRAC legal analysis.

CASE INFORMATION:
- Citation: {anchor_us_cite}
- Name: {anchor_case_name}
- Term: {anchor_term}

ANCHOR TEXT:
{anchor_text}

RESEARCH PACK (admitted authorities):
{research_pack_content}

EXTRACTED FACTS (from prior steps):
- Disposition: {disposition}
- Party Winning: {party_winning}
- Holding: {holding_summary}

AUTHORITY STATUS:
{authority_status}

MODE: OPEN-BOOK
You have the anchor text AND a research pack of relevant authorities.
Use the provided authorities to strengthen your analysis.
Only cite authorities from the research pack or anchor text.

Write a complete IRAC analysis:
1. ISSUE: State the central legal question the Court addressed.
2. RULE: Identify the legal rule or principle the Court applied.
3. APPLICATION: Explain how the Court applied the rule to the facts.
4. CONCLUSION: State the Court's holding and its significance.

Return a JSON object:
- "issue": The legal issue (1-2 sentences)
- "rule": The applicable rule (1-2 sentences)
- "application": How the rule was applied (2-3 sentences)
- "conclusion": The holding and significance (1-2 sentences)
- "citations": List of citations used from research pack

No extra keys. No markdown code fences.
```

### 4.3 Placeholder Derivation

```python
def safe_str(d: dict, key: str, default: str) -> str:
    val = d.get(key)
    if isinstance(val, str) and val.strip():
        return val.strip()
    return default

# Anchor placeholders
anchor_us_cite = ctx.instance.anchor_case.us_cite
anchor_case_name = ctx.instance.anchor_case.case_name
anchor_term = str(ctx.instance.anchor_case.term)

# Prior step placeholders (with fallback warnings)
disposition = safe_str(prior_steps.get("d_extraction", {}).parsed, "disposition", "unknown")
party_winning = safe_str(prior_steps.get("d_extraction", {}).parsed, "party_winning", "unknown")
holding_summary = safe_str(prior_steps.get("d_extraction", {}).parsed, "holding_summary", "(Not available)")

# Authority status
if prior_steps.get("d_authority") and prior_steps["d_authority"].parsed.get("is_overruled"):
    authority_status = f"This case was OVERRULED by {prior_steps['d_authority'].parsed.get('overruling_case', 'Unknown')}."
else:
    authority_status = "This case remains good law (not overruled)."
```

---

## 5. Parsing

### 5.1 Parse Procedure (binding)

```python
def parse_irac_response(raw_response: str) -> dict:
    text = raw_response.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        text = "\n".join(lines)

    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return {
            "errors": ["json_parse_error"],
            "issue": "", "rule": "", "application": "", "conclusion": "",
            "citations": []
        }

    if not isinstance(obj, dict):
        return {
            "errors": ["not_a_json_object"],
            "issue": "", "rule": "", "application": "", "conclusion": "",
            "citations": []
        }

    return {
        "issue": str(obj.get("issue", "") or ""),
        "rule": str(obj.get("rule", "") or ""),
        "application": str(obj.get("application", "") or ""),
        "conclusion": str(obj.get("conclusion", "") or ""),
        "citations": obj.get("citations", []) if isinstance(obj.get("citations"), list) else []
    }
```

### 5.2 Parse Success

```python
parse_success = "errors" not in parsed
```

---

## 6. Phase 1: Structural Check (Supplemental Metric)

### 6.1 Component Weights (binding)

| Component | Weight |
|-----------|--------|
| Issue | 25% |
| Rule | 25% |
| Application | 25% |
| Conclusion | 25% |

### 6.2 Presence Rule (binding)

A component is "present" if it contains >10 non-whitespace characters.

```python
def is_present(text: str) -> bool:
    return len(text.replace(" ", "").replace("\n", "").replace("\t", "")) > 10

def compute_phase1(parsed: dict) -> float:
    weights = {"issue": 0.25, "rule": 0.25, "application": 0.25, "conclusion": 0.25}
    return sum(w for k, w in weights.items() if is_present(parsed.get(k, "")))
```

---

## 7. Phase 2: Chain-Consistency (Supplemental Metric)

### 7.1 Check Set (binding)

| Check | Description | Applies To |
|-------|-------------|------------|
| CC1 | Anchor citation present in rule | Both d9/j10 |
| CC2 | Authority status consistency | Both d9/j10 |
| CC3 | Disposition consistency | Both d9/j10 |
| CC4 | Party winning consistency | Both d9/j10 |

### 7.2 Return Semantics

- `True` = no contradiction detected
- `False` = contradiction detected
- `None` = cannot evaluate (missing upstream artifact)

**Silence handling:** "No relevant language" = `True` (silence is not contradiction).

### 7.3 Phase 2 Scoring

```python
def compute_phase2(results: dict[str, bool | None]) -> tuple[float, float]:
    checks = ["CC1", "CC2", "CC3", "CC4"]
    expected = 4

    values = [results.get(c) for c in checks]
    passed = sum(1 for v in values if v is True)
    possible = sum(1 for v in values if v is not None)

    phase2_score = passed / expected
    phase2_coverage = possible / expected

    return phase2_score, phase2_coverage
```

### 7.4 CC1: Anchor Citation Present (binding)

```python
def norm(s: str) -> str:
    return s.lower().replace(" ", "").replace(".", "")

def citation_matches(us_cite: str, rule_text: str) -> bool:
    """Any valid occurrence passes."""
    cite_norm = norm(us_cite)
    rule_norm = norm(rule_text)

    if cite_norm not in rule_norm:
        return False

    # Find all occurrences, check if ANY has valid boundaries
    start = 0
    while True:
        idx = rule_norm.find(cite_norm, start)
        if idx == -1:
            break

        before_ok = (idx == 0) or (not rule_norm[idx - 1].isdigit())
        end_idx = idx + len(cite_norm)
        after_ok = (end_idx >= len(rule_norm)) or (not rule_norm[end_idx].isdigit())

        if before_ok and after_ok:
            return True
        start = idx + 1

    return False

def case_name_matches(case_name: str, rule_text: str) -> bool:
    parts = re.split(r"\s+v\.?\s+", case_name, maxsplit=1, flags=re.IGNORECASE)
    if not parts:
        return False
    first_party = parts[0].lower().strip().rstrip(",.;:")
    return len(first_party) >= 3 and first_party in rule_text.lower()

# CC1 result (never None)
CC1 = citation_matches(us_cite, rule_text) or case_name_matches(case_name, rule_text)
```

### 7.5 CC2: Authority Status Consistency (binding)

```python
def cc2_check(prior_is_overruled: bool, rule_text: str) -> bool | None:
    if prior_is_overruled is None:
        return None

    rule = rule_text.lower()

    claims_overruled = any(p in rule for p in [
        "overruled", "overturned", "abrogated", "no longer good law"
    ])
    claims_not_overruled = any(p in rule for p in [
        "not overruled", "has not been overruled", "was not overruled"
    ])
    claims_good_law = any(p in rule for p in [
        "good law", "remains good law", "still good law", "still binding", "controlling"
    ])

    # Rule 0: Internal inconsistency
    if claims_good_law and claims_overruled:
        return False

    effective_claims_overruled = claims_overruled and not claims_not_overruled

    if prior_is_overruled:
        if claims_good_law and not claims_overruled:
            return False
        if claims_not_overruled and not claims_overruled:
            return False
    else:
        if effective_claims_overruled:
            return False

    return True
```

### 7.6 CC3: Disposition Consistency (binding)

```python
VALID_DISPOSITIONS = {
    "stay granted", "affirmed", "reversed", "reversed and remanded",
    "vacated and remanded", "affirmed and reversed in part",
    "affirmed and vacated in part", "affirmed and reversed in part and remanded",
    "vacated", "petition denied", "certification"
}

CONTRA_TERMS = {
    "affirmed": ["revers", "vacat"],
    "reversed": ["affirm"],
    "reversed and remanded": ["affirm"],
    "vacated": ["affirm"],
    "vacated and remanded": ["affirm"],
    "petition denied": ["affirm", "revers", "vacat", "grant"],
    "stay granted": [],
    "certification": [],
    "affirmed and reversed in part": [],
    "affirmed and vacated in part": [],
    "affirmed and reversed in part and remanded": [],
}

def cc3_check(prior_disposition: str, conclusion_text: str) -> bool | None:
    disp = prior_disposition.lower().strip()
    if disp not in VALID_DISPOSITIONS:
        return None

    conclusion = conclusion_text.lower()
    contra = CONTRA_TERMS.get(disp, [])

    return not any(term in conclusion for term in contra)
```

### 7.7 CC4: Party Consistency (binding)

```python
PETITIONER_WIN = ["petitioner won", "petitioner prevails", "petitioner prevailed",
                  "judgment for petitioner", "in favor of petitioner"]
RESPONDENT_WIN = ["respondent won", "respondent prevails", "respondent prevailed",
                  "judgment for respondent", "in favor of respondent"]

def cc4_check(prior_party: str, conclusion_text: str) -> bool | None:
    party = prior_party.lower().strip()
    if party not in {"petitioner", "respondent", "unclear"}:
        return None

    conclusion = conclusion_text.lower()

    if party == "petitioner":
        return not any(p in conclusion for p in RESPONDENT_WIN)
    elif party == "respondent":
        return not any(p in conclusion for p in PETITIONER_WIN)
    else:
        return not any(p in conclusion for p in PETITIONER_WIN + RESPONDENT_WIN)
```

---

## 8. Judge Scoring (Total Score)

### 8.1 Judge Call Architecture

The judge receives **both IRACs** (d9 and j10) in a **single call** after the eval model completes j10:
1. Runner disconnects eval model after j10 completion
2. Runner connects judge model
3. Runner sends MEE rubric and both IRAC outputs to judge
4. Judge grades both IRACs simultaneously
5. Judge returns scores for both in single response

### 8.2 Configuration (binding)

```python
configured_judges = 1
judge_timeout = 60  # seconds
max_retries = 2
```

### 8.2 MEE Rubric Prompt (binding)

```python
MEE_RUBRIC_PROMPT = """
You are a bar exam grader using MEE (Multistate Essay Examination) standards.

Score the following IRAC legal analysis on a 0-6 scale for each component.

MODE: {mode}
{mode_instruction}

ISSUE (0-6):
- 0-1: Missing or wrong issue
- 2-3: Issue identified but poorly framed
- 4-5: Issue correctly framed as legal question
- 6: Issue precise, includes material facts

RULE (0-6):
- 0-1: No rule or wrong rule
- 2-3: Rule stated but incomplete
- 4-5: Rule complete with elements
- 6: Rule synthesized from multiple authorities

APPLICATION (0-6):
- 0-1: No application or conclusory
- 2-3: Mechanical matching, no reasoning
- 4-5: Applies rule to facts with reasoning
- 6: Considers counter-arguments, distinguishes when relevant

CONCLUSION (0-6):
- 0-1: Missing or unsupported
- 2-3: States outcome only
- 4-5: Outcome with reasoning
- 6: Acknowledges uncertainty, addresses alternatives

---
IRAC ANALYSIS TO GRADE:

ISSUE: {issue}

RULE: {rule}

APPLICATION: {application}

CONCLUSION: {conclusion}

---
Respond in JSON format only:

{{
  "issue_score": <0-6>,
  "rule_score": <0-6>,
  "application_score": <0-6>,
  "conclusion_score": <0-6>,
  "reasoning": "<brief explanation>"
}}
"""
```

Mode instructions:
- d9 (closed-book): "Closed-book mode. Do not penalize for limited authority citations."
- j10 (open-book): "Open-book mode. Expect appropriate use of provided authorities."

### 8.3 Judge Output Parsing (binding)

```python
def parse_judge_response(raw: str) -> dict | None:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        text = "\n".join(lines)

    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return None

    required = ["issue_score", "rule_score", "application_score", "conclusion_score"]
    for key in required:
        if key not in obj:
            return None
        val = obj[key]
        if not isinstance(val, (int, float)) or not (0 <= val <= 6):
            return None

    return obj
```

### 8.4 Phase 3 Computation (binding)

```python
def compute_phase3(judge_result: dict | None) -> tuple[float, float]:
    if judge_result is None:
        raise ScoringError("judge_failed")

    total = (
        judge_result["issue_score"] +
        judge_result["rule_score"] +
        judge_result["application_score"] +
        judge_result["conclusion_score"]
    ) / 24.0

    return total, 1.0  # (score, coverage)
```

### 8.5 Non-Determinism (documented constraint)

Phase 3 is inherently non-deterministic due to:
- Sampling variance
- Model updates
- Infrastructure variance

Phase 1 + Phase 2 are fully deterministic. Phase 3 scores may vary ±0.05 across runs.

---

## 9. Composite Scoring

### 9.1 Total Score (binding)

```python
total = p_mee  # Judge score IS the total score
```

The judge is REQUIRED for IRAC scoring. If `judge_backend is None`, the scorer raises `ValueError("judge_backend is REQUIRED for S6 scoring")`.

### 9.2 Parse Failure

If parse_success is False:
```python
total = 0.0
phase3_failed = True
```

### 9.3 Supplemental Metrics

Phase 1 (structural) and Phase 2 (chain-consistency) are computed and included in output but do NOT contribute to `total`.

### 9.4 Required Output Shape (binding)

```python
irac_composite = {
    "mode": "closed-book" | "open-book",
    "step_id": "d9" | "j10",
    "phase1_structural": float,          # Tracked, not weighted
    "phase2_chain_consistency": float,   # Tracked, not weighted
    "phase3_judge": float,               # = total
    "total": float,                      # = phase3_judge (p_mee)
    "phase2_coverage": float,
    "judge_coverage": float,
    "phase3_failed": bool,
    "parse_success": bool,
}
```

---

## 10. Citation Integrity (Post-Action)

### 10.1 Overview

Citation integrity is a **post-action** (not a step) that validates citations used in IRAC outputs.

### 10.2 Validation Rules

For **d9 (closed-book)**:
- Citations MUST appear in anchor_inventory
- Citations NOT in anchor = invalid

For **j10 (open-book)**:
- Citations MAY appear in anchor_inventory OR rp_subset
- Citations in neither = invalid

### 10.3 Impact on Score

Citation integrity does NOT void the IRAC score. It produces separate metrics:
- `anchor_validity.valid[]`
- `anchor_validity.invalid[]`
- `rp_usage.in_rp[]`
- `rp_usage.not_in_rp[]`

These metrics inform the final run summary but do not zero out IRAC scores.

---

## 11. Upstream Step Schemas

### 11.1 d_authority (Authority Check)

```python
{
    "is_overruled": bool,
    "overruling_case": str | None,
    "year_overruled": int | None,
}
```

### 11.2 d_extraction (Fact Extraction)

```python
{
    "disposition": str,      # In VALID_DISPOSITIONS
    "party_winning": str,    # "petitioner" | "respondent" | "unclear"
    "holding_summary": str | None,
}
```

---

## 12. Milestone-Based Progress

### 12.1 Milestone Definitions

| Milestone | Step | Key Field | Correct When |
|-----------|------|-----------|--------------|
| M_KA | d1 | cited_case_identified | Correct case identified |
| M_AUTH | d_authority | authority_status_correct | is_overruled matches GT |
| M_EXTRACT | d_extraction | extraction_correct | disposition AND party match GT |
| M_IRAC_CB | d9 | irac_acceptable | score >= 0.75 |
| M_IRAC_OB | j10 | irac_acceptable | score >= 0.75 |
| M_CITE | citation_integrity | citations_valid | No invalid citations |

### 12.2 Progress Score

```python
def compute_progress_score(milestones: dict[str, bool]) -> dict:
    total = len(milestones)
    hit = sum(1 for v in milestones.values() if v)

    return {
        "milestones_hit": hit,
        "milestones_total": total,
        "progress_rate": hit / total if total > 0 else 0.0,
        "milestones": milestones,
    }
```

---

## 13. Two-Axis Evaluation

### 13.1 Axis Definitions

**Axis A: Faithfulness**
- Measures: Can the model use artifacts it was given?
- Scored on: Phase 2 chain-consistency

**Axis B: Correctness**
- Measures: Did the model get the law right?
- Scored on: Milestone achievements

### 13.2 Two-Axis Computation

```python
@dataclass
class TwoAxisScore:
    faithfulness: dict[str, float]
    faithfulness_aggregate: float
    correctness: dict[str, bool]
    correctness_aggregate: float
    diagnosis: str

def compute_two_axis_score(step_results: dict, ground_truth: dict) -> TwoAxisScore:
    # Axis A: Faithfulness (Phase 2 scores)
    faithfulness = {
        "d9": step_results.get("d9", {}).get("phase2_chain_consistency", 0.0),
        "j10": step_results.get("j10", {}).get("phase2_chain_consistency", 0.0),
    }
    faithfulness_aggregate = (faithfulness["d9"] + faithfulness["j10"]) / 2

    # Axis B: Correctness (milestones)
    correctness = {}
    for step_id in ["d1", "d_authority", "d_extraction", "d9", "j10"]:
        result = step_results.get(step_id)
        correctness[step_id] = result.get("correct", False) if result else False

    progress = compute_progress_score(correctness)
    correctness_aggregate = progress["progress_rate"]

    # Diagnosis
    failed = [k for k, v in correctness.items() if not v]
    if not failed:
        diagnosis = "All milestones achieved"
    elif "d9" in failed or "j10" in failed:
        diagnosis = f"IRAC synthesis failure: {', '.join(failed)}"
    else:
        diagnosis = f"Upstream failures: {', '.join(failed)}"

    return TwoAxisScore(
        faithfulness=faithfulness,
        faithfulness_aggregate=faithfulness_aggregate,
        correctness=correctness,
        correctness_aggregate=correctness_aggregate,
        diagnosis=diagnosis,
    )
```

### 13.3 Combined Score (optional)

```python
combined_score = (faithfulness_aggregate * 0.30) + (correctness_aggregate * 0.70)
```

---

## 14. Diagnostic Metrics

### 14.1 Per-Run Diagnostics

```python
@dataclass
class RunDiagnostics:
    # Progress
    milestones: dict[str, bool]
    progress_rate: float

    # Two axes
    faithfulness_aggregate: float
    correctness_aggregate: float

    # Comparison
    d9_score: float
    j10_score: float
    open_book_delta: float  # j10 - d9

    # Diagnosis
    diagnosis: str
    failure_mode: str  # "extraction" | "reasoning" | "cascade" | "none"
```

### 14.2 Failure Mode Classification

```python
def classify_failure_mode(diagnostics: RunDiagnostics) -> str:
    if diagnostics.progress_rate == 1.0:
        return "none"

    if not diagnostics.milestones.get("d_extraction"):
        return "extraction"

    if not diagnostics.milestones.get("d9") and not diagnostics.milestones.get("j10"):
        return "reasoning"

    return "cascade"
```

---

## 15. Tests (Required)

| Test | Assertion |
|------|-----------|
| T1 | d9 mode = "closed-book" |
| T2 | j10 mode = "open-book" |
| T3 | CC1 matches normalized citations ("347 U.S. 483" = "347 U. S. 483") |
| T4 | CC1 boundary check: "11 U.S. 1" does NOT match "111 U.S. 12" |
| T5 | CC2 truth table all cases pass |
| T6 | CC2 Rule 0: good_law AND overruled → False |
| T7 | CC3 uses prior step parsed, not ground truth |
| T8 | CC4 returns None for invalid party value |
| T9 | expected checks = 4 for both modes |
| T10 | parse_success=False → p1=0, p2=0, phase3_failed=True |
| T11 | Phase 3 sum/24 formula correct |
| T12 | Composite reweighting when phase3_skipped |
| T13 | Citation integrity is post-action, not step |
| T14 | d9 citations must be in anchor_inventory |
| T15 | j10 citations may be in anchor OR rp_subset |
| T16 | Milestone M_IRAC_CB threshold = 0.75 |
| T17 | Two-axis scores are independent |
| T18 | Progress rate = milestones_hit / total |
| T19 | Failure mode classification correct |
| T20 | Combined score weights: 30% faithfulness, 70% correctness |

---

## Appendix A: Design Decisions

### A.1 No Run-Voiding

v1 baseline uses score-only semantics. Citation integrity failures affect scores/flags but do NOT void runs. The chain always completes.

### A.2 True Chain-Consistency

IRAC steps measure "pipeline faithfulness" as much as "legal correctness." If upstream steps produce incorrect artifacts, IRAC is scored on faithful use of those artifacts, not factual accuracy. Pipeline correctness = product of step scores.

### A.3 Deterministic Supplemental Metrics

Phase 1 (structural) and Phase 2 (chain-consistency) are fully deterministic and reproducible. They are tracked for analysis but do not contribute to the total score. The total score is determined solely by the judge (inherently non-deterministic).

### A.4 Parse Failure = Model Quality Issue

Parse failure returns status="OK" with parse_success=False. This distinguishes model output quality issues from infrastructure failures.

---

## Appendix B: Future Enhancements (Non-Binding)

### B.1 Evidence Anchoring

Require evidence spans in IRAC outputs:
```python
"evidence_spans": [
    {"field": "rule", "text": "quoted excerpt", "start_offset": int, "end_offset": int}
]
```

### B.2 Wrong vs Unknown Calibration

Allow explicit "unknown" outputs with calibrated scoring:
```python
CALIBRATION = {"correct": 1.0, "unknown": 0.3, "wrong": 0.0}
```

### B.3 Inconsistency Flagging

Score model's ability to detect chain inconsistencies:
```python
def score_inconsistency_detection(model_flags, actual_inconsistencies) -> dict
```

---

## Appendix C: Migration Notes

### From v1.1.8/v1.1.9

| Old | New |
|-----|-----|
| S6 | d9 (closed-book) + j10 (open-book) |
| S7 | citation_integrity post-action |
| S5:cb | Removed (mode by payload admission) |
| Mode A | d9 closed-book |
| Mode B | j10 open-book |
| run-voiding | Removed (score-only) |

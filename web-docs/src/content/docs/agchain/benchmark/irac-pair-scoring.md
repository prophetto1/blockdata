---
title: "IRAC pair scoring guide"
sidebar:
  order: 6
---

# IRAC Pair Scoring Guide (General: Step N + Step N+1)

**Purpose:** A reusable scoring spec for *any* run length where we produce **two IRACs** in sequence:

* **Step N** = IRAC **without** Research Pack (closed-book; anchor-only)
* **Step N+1** = IRAC **with** Research Pack (open-book; anchor + RP)

This document is **step-ID agnostic**. In a given run, you will bind:

* `STEP_IRAC_CLOSED_ID` (the actual step_id used by your plan for Step N)
* `STEP_IRAC_OPEN_ID` (the actual step_id used by your plan for Step N+1)

---

## 1) Normative requirements

### 1.1 Two-IRAC design

Each Evaluation Unit (EU) MUST produce exactly two IRAC outputs:

1. **IRAC_CLOSED** at Step N (closed-book) using only the **anchor** payload (p1)
2. **IRAC_OPEN** at Step N+1 (open-book) using **anchor + Research Pack** payloads (p1 + p2)

### 1.2 Mode selection (binding)

Mode MUST be determined by **payload admission** (plan-controlled), not by an extra inference step.

* **Closed-book mode:** p1 only
* **Open-book mode:** p1 + p2

### 1.3 Judge call architecture (binding)

After Step **N+1** completes:

1. Runner disconnects evaluated model
2. Runner calls judge model **once**
3. Judge grades **both** IRAC outputs in the **same** call
4. Runner records judge result as its own record in `run.jsonl`

### 1.4 Citation integrity is separate (binding)

Citation integrity MUST be computed deterministically as a post-action (not a judge responsibility). The judge should focus on IRAC quality; the deterministic checker enforces citation admissibility.

---

## 2) Required IRAC output contract (evaluated model)

Both IRAC steps (closed + open) MUST return **strict JSON** with exactly these keys:

```json
{
  "issue": "...",
  "rule": "...",
  "application": "...",
  "conclusion": "...",
  "citations": ["...", "..."]
}
```

Constraints:

* No markdown code fences.
* No extra keys.
* `citations` MUST be a JSON array (may be empty).

---

## 3) Judge instruction prompt (MEE-style rubric) — TEMPLATE

Below is the **single prompt** the runner sends to the judge model. The runner fills the placeholders.

> NOTE: This prompt grades **two** IRACs. The judge MUST produce **one** JSON object containing grades for both.

```
You are a bar exam grader using MEE (Multistate Essay Examination) standards.

You will grade TWO IRAC answers for the SAME anchor case:
- IRAC #1 is CLOSED-BOOK (anchor-only).
- IRAC #2 is OPEN-BOOK (anchor + research pack).

Important grading rules:
1) Grade each IRAC independently using the rubric below.
2) CLOSED-BOOK: Do NOT penalize for limited citation breadth. Focus on whether the issue/rule/application/conclusion are coherent and grounded in the anchor facts provided.
3) OPEN-BOOK: Expect appropriate use of provided authorities (if present in the IRAC). Do NOT verify citations; do NOT browse; do NOT assume missing authorities.
4) Output MUST be valid JSON ONLY (no prose outside JSON, no markdown fences).

=== MEE RUBRIC (0–6 per component) ===

ISSUE (0-6):
- 0-1: Missing or wrong issue
- 2-3: Issue identified but poorly framed
- 4-5: Issue correctly framed as a legal question
- 6: Issue precise and includes material facts

RULE (0-6):
- 0-1: No rule or wrong rule
- 2-3: Rule stated but incomplete
- 4-5: Rule complete with key elements
- 6: Rule synthesized/nuanced (as supported by the provided materials)

APPLICATION (0-6):
- 0-1: No application or purely conclusory
- 2-3: Mechanical matching, little reasoning
- 4-5: Applies rule to facts with clear reasoning
- 6: Handles counterarguments/limitations and explains why they do or do not change the result

CONCLUSION (0-6):
- 0-1: Missing or unsupported
- 2-3: States outcome only
- 4-5: Outcome with reasoning
- 6: Addresses uncertainty/alternatives appropriately

=== IRAC #1 (CLOSED-BOOK) ===
step_id: {STEP_IRAC_CLOSED_ID}

ISSUE:
{CLOSED.issue}

RULE:
{CLOSED.rule}

APPLICATION:
{CLOSED.application}

CONCLUSION:
{CLOSED.conclusion}

=== IRAC #2 (OPEN-BOOK) ===
step_id: {STEP_IRAC_OPEN_ID}

ISSUE:
{OPEN.issue}

RULE:
{OPEN.rule}

APPLICATION:
{OPEN.application}

CONCLUSION:
{OPEN.conclusion}

=== REQUIRED OUTPUT (STRICT JSON) ===
Return a single JSON object with exactly this shape:

{
  "schema_version": "irac_mee_pair_v1",
  "grades": {
    "{STEP_IRAC_CLOSED_ID}": {
      "mode": "closed-book",
      "issue_score": 0,
      "rule_score": 0,
      "application_score": 0,
      "conclusion_score": 0,
      "reasoning": "brief explanation"
    },
    "{STEP_IRAC_OPEN_ID}": {
      "mode": "open-book",
      "issue_score": 0,
      "rule_score": 0,
      "application_score": 0,
      "conclusion_score": 0,
      "reasoning": "brief explanation"
    }
  }
}

Rules:
- Scores MUST be integers from 0 to 6.
- reasoning MUST be a single string (keep it short).
- No other top-level keys.
```

---

## 4) Runner-side parsing + normalization (binding)

For each graded IRAC entry:

* `total_raw = issue_score + rule_score + application_score + conclusion_score` (0–24)
* `total_normalized = total_raw / 24.0` (0.0–1.0)

The benchmark’s **IRAC total score** for each IRAC step is `total_normalized`.

If the judge output cannot be parsed as valid JSON or is missing required keys/ranges, the runner MUST treat the judge as failed for that EU (infrastructure vs quality semantics are runner-defined, but the failure must be recorded).

---

## 5) Required runtime record format (run.jsonl)

The runner MUST append an additional record to `run.jsonl` after Step N+1 for the judge call.

Recommended minimal shape (you can extend this, but don’t remove fields):

```json
{
  "step_id": "judge_irac_pair",
  "type": "judge",
  "grades_step_ids": ["<STEP_IRAC_CLOSED_ID>", "<STEP_IRAC_OPEN_ID>"],
  "raw_response": "<judge raw>",
  "parsed": {
    "schema_version": "irac_mee_pair_v1",
    "grades": {
      "<STEP_IRAC_CLOSED_ID>": {
        "mode": "closed-book",
        "issue_score": 4,
        "rule_score": 4,
        "application_score": 4,
        "conclusion_score": 4,
        "reasoning": "..."
      },
      "<STEP_IRAC_OPEN_ID>": {
        "mode": "open-book",
        "issue_score": 5,
        "rule_score": 5,
        "application_score": 5,
        "conclusion_score": 5,
        "reasoning": "..."
      }
    }
  },
  "computed": {
    "<STEP_IRAC_CLOSED_ID>": {"total_raw": 16, "total_normalized": 0.6666667},
    "<STEP_IRAC_OPEN_ID>": {"total_raw": 20, "total_normalized": 0.8333333}
  }
}
```

Notes:

* The judge record MUST NOT be written into `candidate_state.json` (judge output is runner-only).
* The runner may also compute and log `open_book_delta = open.total_normalized - closed.total_normalized`.

---

## 6) Why this doc exists (when FDQ-9/10 also exist)

FDQ-9/10 documents are **step-specific** (they define the prompts/contracts for the *IRAC tasks themselves*).

This doc is the **reusable scoring/judge protocol** you can apply no matter what the step IDs are (3-step, 6-step, 13-step, etc.), as long as you have:

* one closed-book IRAC step (N)
* one open-book IRAC step immediately after it (N+1)
* a judge post-action that grades both in one call

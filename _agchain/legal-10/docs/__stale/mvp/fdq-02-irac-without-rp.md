# FDQ: d2 — IRAC Synthesis (Closed-Book)

**Version:** 1.0
**Date:** 2026-01-24
**Status:** Implementation-Ready
**Chain Position:** 2

---

## 1. Question ID

| Field               | Value                                    |
| ------------------- | ---------------------------------------- |
| **Question ID**     | `d2`                                     |
| **Family**          | Legal Writing                            |
| **Scoring**         | Judge (MEE rubric; graded alongside j3) |
| **Reasoning Depth** | Level 4 (full synthesis)                 |

---

## 2. Prompt Template

```text
You are a legal research assistant.
As you can see, you have been working 



CASE INFORMATION:
- Citation: {anchor_us_cite}
- Name: {anchor_case_name}
- Term: {anchor_term}

ANCHOR TEXT:
{anchor_text}

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

---

## 3. Data Requirements

| Source                     | Fields Used                                                        | Role                |
| -------------------------- | ------------------------------------------------------------------ | ------------------- |
| `p1.json` (Anchor payload) | `anchor_text`, `anchor_us_cite`, `anchor_case_name`, `anchor_term` | Evidence + metadata |

**Boundary:** d2 is anchor-only; no Research Pack is available.

---

## 4. Eligibility Criteria

**Predicate (runtime):**

* Eligible when the chain reaches d2 in the normal plan.
* If required upstream artifacts are missing or not OK, runner should mark `SKIPPED_DEPENDENCY` (or equivalent) and omit model call.

---

## 5. Instantiation Procedure

### 5.1 Placeholder Derivation (binding)

**Anchor placeholders:**

* `{anchor_us_cite}` = `ctx.instance.anchor_case.us_cite`
* `{anchor_case_name}` = `ctx.instance.anchor_case.case_name`
* `{anchor_term}` = `str(ctx.instance.anchor_case.term)`
* `{anchor_text}` = admitted `p1.anchor_text`

---

## 6. Response Format

**Type:** Structured JSON

**Contract:**

```json
{
  "issue": "string",
  "rule": "string",
  "application": "string",
  "conclusion": "string",
  "citations": ["string", "..."]
}
```

**Strictness rules:**

* No extra keys
* No markdown code fences
* `citations` must be a JSON list (may be empty)

---

## 7. Scoring Specification

### 7.1 Primary Score (Total)

**Important:** d2 is not scored immediately in isolation. The judge grades **both d2 + j3** after j3 completes, in a single judge call.

Judge applies the MEE component rubric (0–6 each for Issue / Rule / Application / Conclusion) and computes:

* `total_raw = issue + rule + application + conclusion` (0..24)
* `total_norm = total_raw / 24.0` (0.0..1.0)

### 7.2 Supplemental Metrics (tracked, not weighted)

Computed deterministically and logged for analysis (not part of total):

* Phase 1 structural presence
* Phase 2 chain-consistency checks (CC1–CC4)

### 7.3 Citation Integrity (post-action, not step)

For d2 (closed-book):

* Any citations must appear in the **anchor inventory**; otherwise flagged invalid.
* This does **not** void the score; it produces separate metrics.

---

## 8. FDQ Checklist

* [x] Question ID + family assigned
* [x] Prompt template + mode constraints
* [x] Data requirements (p1 + upstream artifacts)
* [x] Eligibility semantics (dependency-aware)
* [x] Instantiation procedure + placeholder mapping
* [x] Response contract (strict JSON)
* [x] Scoring: judge (MEE) + deterministic supplemental metrics
* [x] Citation integrity as post-action (anchor-inventory-only)

**Status: ✅ FULLY DEVELOPED**

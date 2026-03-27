# FDQ: j3 — IRAC Synthesis (Open-Book)

**Version:** 1.0
**Date:** 2026-01-24
**Status:** Implementation-Ready
**Chain Position:** 3

---

## 1. Question ID

| Field               | Value                                           |
| ------------------- | ----------------------------------------------- |
| **Question ID**     | `j3`                                           |
| **Family**          | Legal Writing                                   |
| **Scoring**         | Judge (MEE rubric; grades both d2 + j3)        |
| **Reasoning Depth** | Level 4 (full synthesis + evidence integration) |

---

## 2. Prompt Template

```text
You are a legal research assistant. Synthesize the following information into a complete IRAC legal analysis.

CASE INFORMATION:
- Citation: {anchor_us_cite}
- Name: {anchor_case_name}
- Term: {anchor_term}

ANCHOR TEXT:
{anchor_text}

RESEARCH PACK (admitted authorities):
{research_pack_content}

MODE: OPEN-BOOK
You have the anchor text AND a research pack of relevant authorities.
Use the provided authorities to strengthen your analysis.
Only cite authorities from the research pack or the anchor text.
Do not fabricate authorities, quotations, case treatment, or relationships not present in the admitted materials.

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
- "citations": List of citations used (should reflect use of admitted authorities)

No extra keys. No markdown code fences.
```

---

## 3. Data Requirements

| Source                     | Fields Used              | Role                                       |
| -------------------------- | ------------------------ | ------------------------------------------ |
| `p1.json` (Anchor payload) | anchor text + metadata   | Primary evidence                           |
| `p2.json` (Research Pack)  | admitted authority texts | Additional evidence ("open-book boundary") |

**Boundary:** j3 is the open-book boundary where `p2` is admitted.

---

## 4. Eligibility Criteria

**Predicate (runtime):**

* Requires completion of d2 in the normal chain flow.
* Requires `p2` admission (runner-controlled via plan/payload gating).
* If dependencies aren’t satisfied, runner should mark `SKIPPED_DEPENDENCY` (or equivalent) and omit model call.

---

## 5. Instantiation Procedure

### 5.1 Placeholder Derivation (binding)

**Anchor placeholders:**

* `{anchor_us_cite}` = `ctx.instance.anchor_case.us_cite`
* `{anchor_case_name}` = `ctx.instance.anchor_case.case_name`
* `{anchor_term}` = `str(ctx.instance.anchor_case.term)`
* `{anchor_text}` = admitted `p1.anchor_text`

**Research Pack:**

* `{research_pack_content}` = admitted `p2` Research Pack content (authorities)

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
* `citations` must be a JSON list
* Citations should be drawn from (and limited to) admitted materials: anchor + research pack

---

## 7. Scoring Specification

### 7.1 Primary Score (Total)

After j3 completes:

1. runner disconnects eval model
2. runner connects judge model
3. judge grades **both IRACs (d2 + j3) in one call**

Judge applies the MEE component rubric (0–6 each for Issue / Rule / Application / Conclusion) and computes for EACH IRAC:

* `total_raw = issue + rule + application + conclusion` (0..24)
* `total_norm = total_raw / 24.0` (0.0..1.0)

### 7.2 Mode-Specific Judge Expectations

Open-book mode expectations:

* Stronger rule synthesis is expected when the research pack is admitted.
* Analysis should integrate admitted authorities appropriately.
* Judge does not verify citation validity against external sources; citation integrity is computed deterministically elsewhere.

### 7.3 Supplemental Metrics (tracked, not weighted)

Computed deterministically and logged for analysis (not part of total):

* Phase 1 structural presence
* Phase 2 chain-consistency checks (CC1–CC4)

### 7.4 Citation Integrity (post-action, not step)

For j3 (open-book):

* Citations may be in **anchor inventory OR research pack subset**; otherwise flagged invalid.
* This does **not** void the score; it produces separate metrics.

---

## 8. FDQ Checklist

* [x] Question ID + family assigned
* [x] Prompt template + open-book constraints
* [x] Data requirements (p1 + p2 + upstream artifacts)
* [x] Eligibility semantics (dependency-aware + p2 gating)
* [x] Instantiation procedure + placeholder mapping
* [x] Response contract (strict JSON)
* [x] Scoring: judge (MEE) + deterministic supplemental metrics
* [x] Citation integrity as post-action (anchor OR rp subset)

**Status: ✅ FULLY DEVELOPED**

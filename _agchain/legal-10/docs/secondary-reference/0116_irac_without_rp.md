# IRAC Without RP

**Type:** Judge-scored

---

**Chain Position:** As of now, this question type is always the question that comes immediately before the last question in the chain. Normally, question types dont have a fixed position in the chain, but this question is designed to be presented last.
(For example, in AG8 --> d7, AG10 --> d9, A25 --> d24)

---

## Description

Irac without RP asks the model to use the anchor text and write an IRAC. It is provided with instructions on how to write the IRAC and an overview of the grading criteria.
It is conducted immediately before the Irac with RP question

## Prompt Requirements (Citations)

The evaluated model is instructed that:

- Only past SCOTUS and federal court case citations are permitted.
- Allowed reporters and coverage windows are defined in `internal/specs/steps/citation_scope_cap_coverage.md`.
- Allowed reporters are limited to: `U.S.`, `F.`, `F.2d`, `F.3d`, `F. Supp.`, `F. Supp. 2d`, `F. Supp. 3d` (explicitly exclude `F.4th`).
- When citing **lower-court** authorities, do not cite cases decided after **2019** (CAP coverage window).
- All citations used in the IRAC must be listed in an explicit citation list field in the returned JSON (in addition to any inline citation usage).

## Scoring Methodology

The Judge Model is called, which is prompted to use the MEE hybrid IRAC scoring rubric to score both IRACs.

\_Last updated: 2026-01-13_JON

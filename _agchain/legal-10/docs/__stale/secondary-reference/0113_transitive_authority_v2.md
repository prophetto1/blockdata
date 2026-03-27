# Transitive Authority (v2 rewrite)

**Name:** Transitive Authority  
**Type:** Candidate question with deterministic grading  

---

## Description

This question type uses a 3-case citation triangle and asks the evaluated model to predict the relationship between two cases.

For each question instance, the dataset provides three Supreme Court cases:

- Case A (anchor)
- Case B (middle)
- Case C (newest)

The evaluated model is given:

- Case A metadata (citation, name, year)
- Case B metadata (citation, name, year)
- Case C metadata (citation, name, year)
- The observed relationship **B → A** from Shepard’s (`treatment_norm`, `agree`)
- The observed relationship **C → B** from Shepard’s (`treatment_norm`, `agree`)

The evaluated model is asked to predict the relationship **C → A**.

---

## Data Sources (as currently present in the repo)

This question type can be built deterministically from `datasets/legal10-updates.duckdb`:

- `shepards_edges`
  - Columns used: `cited_usid`, `citing_lexis`, `treatment_norm`, `agree`, `supreme_court`, `shepards_raw` / `shepards_raw_lc` (if retained)
- `scdb_cases`
  - Columns used for mapping: `lexisCite` (join key), `caseId`, `usCite`, `caseName`, `term`

A “Supreme Court only” subset is available via `shepards_edges.supreme_court = 1`.

---

## Deterministic Build Procedure (ground truth generation)

A single question instance is a triangle `(A, B, C)` such that all of the following edges exist in `shepards_edges`:

- **B → A**
- **C → B**
- **C → A**

All case IDs and metadata can be derived by joining `shepards_edges.citing_lexis` / `shepards_edges.cited_lexis` to `scdb_cases.lexisCite`.

For each triangle:

- Inputs to the evaluated model are taken from the B→A and C→B edges plus SCDB metadata for A/B/C.
- Ground truth labels for grading are taken from the C→A edge:
  - `treatment_norm` (string)
  - `agree` (boolean)

---

## Candidate-Facing Inputs (payload shape)

This question type can be represented as JSON data inside an admitted payload (e.g., in `p1.json` under an anchor payload, or in a dedicated payload).

A single question instance requires the following fields:

- `case_a`: `{ caseId, usCite, caseName, term }`
- `case_b`: `{ caseId, usCite, caseName, term }`
- `case_c`: `{ caseId, usCite, caseName, term }`
- `given_edges`:
  - `b_to_a`: `{ treatment_norm, agree }`
  - `c_to_b`: `{ treatment_norm, agree }`

The evaluated model is prompted to output a prediction for `c_to_a`.

---

## Expected Model Output (per question instance)

A single JSON object containing:

- `predicted_treatment_norm`: string
- `predicted_agree`: boolean

---

## Ground Truth (runner-only)

For each question instance, store ground truth values for **C → A**:

- `treatment_norm`
- `agree`

These are taken directly from the `shepards_edges` row for the (citing=C, cited=A) pair.

---

## Deterministic Scoring

Given:

- model output: `predicted_treatment_norm`, `predicted_agree`
- ground truth: `treatment_norm`, `agree`

Scoring can be computed deterministically as:

- 0.5 for exact match on `treatment_norm`
- 0.5 for exact match on `agree`

---

## Treatment Vocabulary

The set of possible `treatment_norm` values is defined by the values present in the `shepards_edges.treatment_norm` column for the selected subset (for example, `supreme_court=1`).

---

## Coverage Requirements

A question instance requires:

- all three Shepard’s edges (B→A, C→B, C→A)
- SCDB metadata for the three cases (joinable by `lexisCite`)

---

_Last updated: 2026-01-14_

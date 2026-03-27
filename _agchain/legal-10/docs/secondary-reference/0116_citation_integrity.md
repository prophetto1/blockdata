# Citation Integrity

**Type:** Deterministic

---

## Description

This step deterministically scores citation usage in the evaluated model’s two IRAC outputs:

- IRAC without RP (closed-book IRAC)
- IRAC with RP (open-book IRAC)

The runner extracts the citations used by the evaluated model, then compares them against runner-only citation inventories derived from the anchor text and (for the open-book IRAC) the Research Pack.

---

## Reporter Scope (What Counts as a Case Citation)

Only the following reporter families are in scope for deterministic citation integrity checks:

- SCOTUS: `U.S.`
- Federal: `F.`, `F.2d`, `F.3d`, `F. Supp.`, `F. Supp. 2d`, `F. Supp. 3d`

State reporter citations are out of scope for this step.

Coverage and exclusions (including `F.4th`) are defined in `internal/specs/steps/citation_scope_cap_coverage.md`.

---

## Required Inputs (Runner-Only)

The runner must have the following runner-only citation lists for the anchor instance:

1. **Anchor citation inventory (full list):** all unique citations extracted from the anchor text within the in-scope reporter families.
2. **RP citation subset (when applicable):** the subset of citations that appear in the Research Pack (e.g., top-K selections for SCOTUS and CAP).

The anchor citation inventory includes citations that may not resolve to a case record in downstream crosswalk tables (e.g., SCOTUS pinpoint-page cites such as `268 U.S. 397`). These citations remain part of the anchor’s extracted citation universe.

---

## Citation Extraction From IRAC Outputs (Runner)

The runner extracts citations from each IRAC output using the IRAC output’s explicit citation list field (a top-level array in the IRAC JSON output). This field is used as the primary extraction source for deterministic scoring.

If the field is missing or unparsable, the runner may fall back to deterministic string extraction from the IRAC text, and records an error in the step output.

---

## Deterministic Checks (Runner Output)

This step emits two deterministic citation checks:

### A. Anchor-Inventory Validity (IRAC without RP and IRAC with RP)

For each citation used by the evaluated model (from the IRAC citation list field), the runner checks whether it is present in the anchor citation inventory (full list).

This check treats a citation as valid-in-anchor if it matches an entry in the anchor citation inventory, including pinpoint-page cites and procedural-order cites that appear in the anchor text.

### B. RP-Subset Usage (IRAC with RP only)

For each citation used by the evaluated model, the runner checks whether it is present in the RP citation subset.

This check is computed only for the open-book IRAC step.

---

## Output Fields (Minimum)

The step output includes:

- `citations_used_<step_id>`: normalized list extracted from each IRAC output field (e.g., `citations_used_d2` for IRAC without RP and `citations_used_j3` for IRAC with RP in the 3-step slice)
- `anchor_inventory`: runner-only reference list used for check A
- `rp_subset`: runner-only reference list used for check B
- `anchor_validity`: counts/lists for check A (per IRAC and combined)
- `rp_usage`: counts/lists for check B (IRAC with RP only)
- `out_of_scope`: citations that do not match an in-scope reporter family
- `errors`: deterministic extraction/parse errors (if any)

---

## Data Provenance (Build-Time)

The runner-only citation inventories are generated at dataset build time from the citation inventory artifacts (e.g., `datasets/citation_inventory.parquet`) and materialized per EU so that runtime scoring does not require database queries.

*Last updated: 2026-01-14*

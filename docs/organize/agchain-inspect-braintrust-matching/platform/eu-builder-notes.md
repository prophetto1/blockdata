# EU Builder refactor notes (3-STEP-RUN → reusable for AG10)

Note: the benchmark packet (`benchmark.json`, `plan.json`, step prompts, judge prompt) is a **runtime input** but should be **exported deterministically ahead of time** from the runner's internal templates/config (not manually drafted).

For flat v2 layout (current 3-STEP-RUN docs):

- `eus/{eu_id}/p1.json` (anchor; for 3-step we *select* short anchors ~10k chars)
- `eus/{eu_id}/p2.json` (RP/authorities payload)
- `eus/{eu_id}/ground_truth.json` (runner-only; NEVER staged)

## What we can reuse almost exactly

`internal/specs/must_update/build_research_packs.py` (Stage 4A) already does the hard, real-data work:

- selects eligible anchors from `datasets/scdb_full_with_text.jsonl` (min/max char filters)
- selects top-K authorities using:
  - `datasets/scotus_citations_ranked.jsonl` (Fowler)
  - `datasets/cap_citations_ranked.jsonl` (PageRank)
- joins to shippable text sources:
  - SCOTUS syllabi: `datasets/casesumm_syllabi.parquet`
  - CAP head matter: `datasets/cap_head_matter.jsonl`
- computes cite offsets from `datasets/citation_inventory.parquet`
- emits a sealed RP directory:
  - `payloads/d1.json` (anchor + citations roster)
  - `payloads/d2.json` (authority texts)
  - `doc3.json` (runner-only metadata)

So: **reuse Stage4A to build the evidence bytes**, then map outputs into EU v2.

## Precision refactor (mapping RP → EU)

### 1) `p1.json`

- Source: RP `payloads/d1.json.anchor` (text + anchor metadata)
- Rule for 3-step: do NOT truncate. Select anchors whose `anchor.text` is already ~10k chars.

### 2) `p2.json`

- Source: RP `payloads/d2.json.authorities` (SCOTUS syllabi + CAP head_matter text)
- `rp_subset` should be derived from what you actually ship in `p2.json` (not “intended K”):
  - SCOTUS: list of `usCite` values
  - CAP: list of `normalized_cite` / `capCite` values (pick one canonical key and keep it consistent)

### 3) `ground_truth.json` (runner-only)

Must minimally contain:

- `anchor_inventory_full`: all unique **in-scope** citations extracted from the anchor text
  - Source of truth: `datasets/citation_inventory.parquet` filtered by `anchor_caseId`
  - Keep the same normalization (`normalized_cite`) as Stage 1 inventory generation.
- `rp_subset`: subset list for open-book checks (exactly what appears in `p2.json`)

Optional (depending on what d1 needs): any deterministic labels required by `known_authority` scoring.

## What NOT to reuse

- `internal/specs/must_update/build_eus.py` generates an older *deliveries* plan format.
- For v2, the **benchmark package** owns `plan.json` (steps schedule + `inject_payloads`). EU builder should not generate orchestration.

## Practical implementation shape

Create a new EU-builder that either:

- Option A (simple): runs Stage4A for a single chosen anchor (filter by `--anchor-caseid` or `--anchor-us-cite`, plus `--min-anchor-chars/--max-anchor-chars`), then writes EU v2 files.
- Option B (faster iteration): takes an existing RP dir (`datasets/rps/rpv1__<anchor_caseId>/`) and converts it to EU v2.

Key invariants to keep:

- Ground truth never staged.
- `anchor_inventory_full` comes from `citation_inventory.parquet` for the SAME anchor caseId used in `p1.json`.
- `rp_subset` is computed from shipped `p2.json` content.


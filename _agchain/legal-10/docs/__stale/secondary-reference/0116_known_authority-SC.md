# Known Authority

**Name: Known Authority**

**Chain Position:** As of now, this question type is always first question in the chain. Normally, question types dont have a fixed position in the chain, but this question is designed to be presented first.
(For other question types: relative positions that aren't fixed)

**Total no. of questions** 4

---

## Known Authority Question Format

| Q#  | Question Type             | Sample Question                                | Ground Truth                      |
| --- | ------------------------- | ---------------------------------------------- | --------------------------------- |
| 1   | **Controlling authority** | "Which citation is most authoritative?"        | Fowler score ranking              |
| 2   | **In-favor citations**    | "Which citations support the holding?"         | Shepards positive treatment edges |
| 3   | **Against citations**     | "Which citations oppose or limit the holding?" | Shepards negative treatment edges |
| 4   | **Occurrence frequency**  | "Which citation appears most often?"           | Citation array count              |

**Example question:** "Which authority would most weaken the holding if removed?"

---

## Policy decisions (must be answered here before d1 is “correct”)

This step is deterministic-scored, but several policies must be explicit so that:

- the EU builder can materialize deterministic ground truth (from `datasets/`)
- the runner-side scorer can score model outputs consistently

### A) Citation scope (what counts as an “authority” for d1)

See `internal/specs/steps/citation_scope_cap_coverage.md` for the CAP-based reporter whitelist and lower-court coverage window.

1. **Reporter scope:** Is d1 **SCOTUS-only** (`U.S.`) or **SCOTUS + federal** (`F.`, `F.2d`, `F.3d`, `F. Supp.`, `F. Supp. 2d`, `F. Supp. 3d`)?
2. **Pin cites / nominative reporters:** Do we normalize to the runner’s canonical cite form (e.g., treat `268 U.S. 394, 397` as `268 U.S. 394`, and `35 U.S. 10 Pet. 368` as `35 U.S. 368`)?
3. **Deduplication policy:** do we score on **unique normalized cites** only (recommended), or allow duplicates?

### B) Ground truth source mapping (how GT is constructed)

For each sub-question, define the required inputs and tie-breakers:

1. **Controlling authority (Fowler):**
   - GT source file(s): (recommended) `datasets/scotus_citations_ranked.jsonl` (already ranked by Fowler)
   - Tie-break policy when Fowler scores tie or are missing
   - Whether to require `resolved == true` or allow unresolved cites
2. **In-favor / against (Shepard’s):**
   - GT source file(s): `datasets/references/shepards_data.csv` (or a derived, smaller artifact)
   - **Label mapping policy:** which `shepards` labels count as “positive” vs “negative” vs “neutral” (must be enumerated)
   - Whether to restrict to SCOTUS citing cases only (recommended: yes)
3. **Occurrence frequency (counts):**
   - GT source file(s): `datasets/citation_inventory.parquet` grouped by `(anchor_caseId, normalized_cite)`
   - Tie-break policy when counts tie (e.g., prefer `U.S.` over federal; then lexical)

### C) Output contract (what the model must return)

Freeze the exact JSON keys so the scorer can be strict:

- `controlling_authority`: string (one citation)
- `in_favor`: array[string] (citations)
- `against`: array[string] (citations)
- `most_frequent`: string (one citation)

Optionally allow an explanations object, but only if it’s explicitly part of the contract.

Example (minimum):
```json
{
  "controlling_authority": "118 U.S. 425",
  "in_favor": ["268 U.S. 394", "347 U.S. 483"],
  "against": ["123 F.2d 456"],
  "most_frequent": "268 U.S. 394"
}
```

---

\_Last updated: 2026-01-13_JON

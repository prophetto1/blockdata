# FDQ Materialization Conventions (Database-First)

**Status:** Living Document  
**Last updated:** 2026-01-29

---

## Purpose

Legal-10 is database-first: all benchmark computation happens at build time inside DuckDB, and builders/runners do zero runtime calculation beyond model execution and comparing to pre-computed truth.

This document defines shared conventions so that multiple AIs can add or refine FDQ materializations without diverging table shapes or introducing runtime logic.

---

## Core Conventions

### 1) Tables per FDQ

For each FDQ `NN`:

- `fdqNN_eligibility`: one row per potential anchor with `eligible` + explainable reason(s)
- `fdqNN_ground_truth`: one row per eligible anchor with FDQ-specific ground truth columns

### 2) Primary keys

- Default: `anchor_usCite` (TEXT) is the primary key for SCOTUS-anchored FDQs.
- If an FDQ is keyed by a different object (e.g., a triangle, a citation pair), define a stable deterministic key column and document it in the FDQ spec + this file.

### 3) Determinism requirements

- Any “pick one” computation must be implemented with deterministic tie-breaks.
- Any list output must have deterministic ordering before aggregation.
- Avoid non-deterministic aggregation order.

### 4) Prefer typed columns over JSON blobs

- Use typed columns for outputs (TEXT/BOOLEAN/DOUBLE/INTEGER and list types like `VARCHAR[]`).
- Convert to JSON only at export time.

### 5) Export policy (builders)

Builders must not recompute logic. They should:

- SELECT a row from `fdqNN_ground_truth`
- Serialize directly to the EU’s `ground_truth.json` (runner-only)

---

## Reference Implementation: FDQ01 (KA-SC)

**Authoritative spec:** `docs/[legal-10] [fdq] 01-ka-sc.md`

### A) Eligibility table

Definition: eligible anchors must have (1) at least one citation with non-null Fowler score and (2) at least one citation that resolves to a Shepard’s treatment edge via SCDB lexis cites.

```sql
CREATE TABLE IF NOT EXISTS fdq01_eligibility AS
WITH anchors AS (
  SELECT DISTINCT anchor_usCite
  FROM scotus_citations_ranked_flat
),
flags AS (
  SELECT
    a.anchor_usCite,
    EXISTS (
      SELECT 1
      FROM scotus_citations_ranked_flat c
      WHERE c.anchor_usCite = a.anchor_usCite
        AND c.fowler_score IS NOT NULL
    ) AS has_fowler,
    EXISTS (
      SELECT 1
      FROM scotus_citations_ranked_flat c
      JOIN scdb_cases scdb_anchor ON c.anchor_usCite = scdb_anchor.usCite
      JOIN scdb_cases scdb_cited  ON c.cited_usCite  = scdb_cited.usCite
      JOIN shepards_edges s
        ON scdb_anchor.lexisCite = s.citing_lexis
       AND scdb_cited.lexisCite  = s.cited_lexis
      WHERE c.anchor_usCite = a.anchor_usCite
    ) AS has_shepards
  FROM anchors a
)
SELECT
  anchor_usCite,
  has_fowler,
  has_shepards,
  (has_fowler AND has_shepards) AS eligible,
  CASE
    WHEN NOT has_fowler AND NOT has_shepards THEN 'missing_fowler_and_shepards'
    WHEN NOT has_fowler THEN 'missing_fowler'
    WHEN NOT has_shepards THEN 'missing_shepards'
    ELSE NULL
  END AS ineligible_reason
FROM flags;
```

### B) Ground truth table

Outputs:
- `controlling_authority`: highest Fowler score (ties by occurrences DESC, then cited_usCite ASC)
- `in_favor`: treatment_norm = `follows`
- `against`: treatment_norm IN (`distinguishes`, `questions`, `criticizes`, `overrules`, `limits`)
- `most_frequent`: highest occurrences (ties by fowler_score DESC, then cited_usCite ASC)

```sql
CREATE TABLE IF NOT EXISTS fdq01_ground_truth AS
WITH eligible AS (
  SELECT anchor_usCite
  FROM fdq01_eligibility
  WHERE eligible
),
controlling_ranked AS (
  SELECT
    anchor_usCite,
    cited_usCite,
    fowler_score,
    occurrences,
    ROW_NUMBER() OVER (
      PARTITION BY anchor_usCite
      ORDER BY fowler_score DESC, occurrences DESC, cited_usCite ASC
    ) AS rn
  FROM scotus_citations_ranked_flat
  WHERE fowler_score IS NOT NULL
),
controlling AS (
  SELECT
    anchor_usCite,
    cited_usCite AS controlling_authority,
    fowler_score AS controlling_fowler_score,
    occurrences AS controlling_occurrences
  FROM controlling_ranked
  WHERE rn = 1
),
mostfreq_ranked AS (
  SELECT
    anchor_usCite,
    cited_usCite,
    occurrences,
    fowler_score,
    ROW_NUMBER() OVER (
      PARTITION BY anchor_usCite
      ORDER BY occurrences DESC, fowler_score DESC, cited_usCite ASC
    ) AS rn
  FROM scotus_citations_ranked_flat
  WHERE occurrences IS NOT NULL
),
mostfreq AS (
  SELECT
    anchor_usCite,
    cited_usCite AS most_frequent,
    occurrences AS most_frequent_occurrences
  FROM mostfreq_ranked
  WHERE rn = 1
),
treatments AS (
  SELECT
    c.anchor_usCite,
    c.cited_usCite,
    s.treatment_norm
  FROM scotus_citations_ranked_flat c
  JOIN scdb_cases scdb_anchor ON c.anchor_usCite = scdb_anchor.usCite
  JOIN scdb_cases scdb_cited  ON c.cited_usCite  = scdb_cited.usCite
  JOIN shepards_edges s
    ON scdb_anchor.lexisCite = s.citing_lexis
   AND scdb_cited.lexisCite  = s.cited_lexis
),
in_favor AS (
  SELECT
    anchor_usCite,
    ARRAY_AGG(cited_usCite ORDER BY cited_usCite ASC) AS in_favor
  FROM (
    SELECT DISTINCT anchor_usCite, cited_usCite
    FROM treatments
    WHERE treatment_norm = 'follows'
  )
  GROUP BY anchor_usCite
),
against AS (
  SELECT
    anchor_usCite,
    ARRAY_AGG(cited_usCite ORDER BY cited_usCite ASC) AS against
  FROM (
    SELECT DISTINCT anchor_usCite, cited_usCite
    FROM treatments
    WHERE treatment_norm IN ('distinguishes', 'questions', 'criticizes', 'overrules', 'limits')
  )
  GROUP BY anchor_usCite
)
SELECT
  e.anchor_usCite,
  c.controlling_authority,
  COALESCE(i.in_favor, []::VARCHAR[]) AS in_favor,
  COALESCE(a.against, []::VARCHAR[]) AS against,
  mf.most_frequent,
  c.controlling_fowler_score,
  c.controlling_occurrences,
  mf.most_frequent_occurrences
FROM eligible e
JOIN controlling c USING (anchor_usCite)
JOIN mostfreq mf USING (anchor_usCite)
LEFT JOIN in_favor i USING (anchor_usCite)
LEFT JOIN against a USING (anchor_usCite);
```

### C) Export shape (example)

Builders should export without recomputation, e.g.:

```sql
SELECT
  anchor_usCite,
  controlling_authority,
  to_json(in_favor) AS in_favor_json,
  to_json(against) AS against_json,
  most_frequent
FROM fdq01_ground_truth
WHERE anchor_usCite = '{TARGET_ANCHOR}';
```

### D) Edge-case finders (examples)

```sql
-- Ties on max Fowler score (tie-breaks must be correct and stable)
WITH mx AS (
  SELECT anchor_usCite, MAX(fowler_score) AS mx
  FROM scotus_citations_ranked_flat
  GROUP BY anchor_usCite
)
SELECT c.anchor_usCite, COUNT(*) AS tied_rows
FROM scotus_citations_ranked_flat c
JOIN mx ON c.anchor_usCite = mx.anchor_usCite AND c.fowler_score = mx.mx
GROUP BY c.anchor_usCite
HAVING COUNT(*) > 1;

-- Eligible anchors with zero in_favor AND zero against (treatment coverage gaps)
SELECT anchor_usCite
FROM fdq01_ground_truth
WHERE ARRAY_LENGTH(in_favor) = 0 AND ARRAY_LENGTH(against) = 0;
```


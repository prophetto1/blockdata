# Citation Polarity Methods: Implementation Guide

## Overview

This guide details the implementation of two complementary citation polarity extraction methods:

1. **Bluebook Signal Extraction** (δ-Stance approach) - Extracts author-indicated stance from citation signals
2. **Quoted Passage Extraction** (LePaRD approach) - Extracts quoted text and context for passage retrieval

These methods are implemented as separate database views/tables first, then integrated with existing Shepard's treatment data for hybrid polarity scoring.

---

## PART 1: SEPARATE VIEWS (Step 1)

### 1A. Bluebook Signal Extraction

#### Method Definition (from δ-Stance Paper)

The δ-Stance approach extracts citation signals that appear **immediately before** citations in legal text. These signals indicate the author's (judge's) intended relationship between their argument and the cited authority.

**Signal Taxonomy (Bluebook R4.1-4.5):**

| Signal | Stance Value | Polarity | Intensity | Meaning |
|--------|--------------|----------|-----------|---------|
| e.g. / no signal | +3.0 | Positive | 3 | Direct support |
| accord | +2.5 | Positive | 2.5 | Agreement across jurisdictions |
| see | +2.0 | Positive | 2 | Clear indirect support |
| see also | +1.5 | Positive | 1.5 | Additional support |
| cf. | +1.0 | Positive | 1 | Analogous support |
| see generally | 0.0 | Neutral | 0 | Background material |
| but cf. | -1.0 | Negative | 1 | Analogous opposition |
| but see | -2.0 | Negative | 2 | Clear opposition |
| contra | -3.0 | Negative | 3 | Direct contradiction |

**Extraction Algorithm:**
1. For each citation at position `start` in opinion text
2. Extract `text[start-30:start]` (preceding 30 characters)
3. Apply regex patterns in ORDER (multi-word before single-word)
4. Map detected signal → stance value
5. If no signal detected → default to +3.0 (direct support, as per Bluebook convention)

#### SQL Implementation

```sql
-- VIEW 1: bluebook_signals_raw
-- Extracts Bluebook citation signals from opinion text

CREATE OR REPLACE VIEW bluebook_signals_raw AS
WITH 
-- Load opinion texts
texts AS (
    SELECT caseId, majority_opinion 
    FROM read_json_auto('datasets/scdb_full_with_text.jsonl')
    WHERE majority_opinion IS NOT NULL
),
-- Load citation positions
cites AS (
    SELECT 
        anchor_caseId, 
        anchor_lexisCite,
        normalized_cite, 
        start, 
        "end"
    FROM read_parquet('datasets/citation_inventory.parquet')
),
-- Join and extract preceding context
joined AS (
    SELECT 
        c.anchor_caseId,
        c.anchor_lexisCite,
        c.normalized_cite,
        c.start,
        c."end",
        -- Extract 30 chars before citation, lowercase for matching
        LOWER(SUBSTRING(t.majority_opinion, GREATEST(1, c.start - 30), 30)) as pre_context_30,
        -- Extract 60 chars for full context display
        SUBSTRING(t.majority_opinion, GREATEST(1, c.start - 60), 60) as pre_context_60
    FROM cites c
    JOIN texts t ON c.anchor_caseId = t.caseId
)
SELECT 
    anchor_caseId,
    anchor_lexisCite,
    normalized_cite,
    start,
    "end",
    pre_context_60,
    -- Signal detection (ordered: multi-word first, then single-word)
    CASE 
        -- Multi-word signals (check first!)
        WHEN pre_context_30 LIKE '%see also%' THEN 'see_also'
        WHEN pre_context_30 LIKE '%but see%' THEN 'but_see'
        WHEN pre_context_30 LIKE '%but cf.%' THEN 'but_cf'
        WHEN pre_context_30 LIKE '%see generally%' THEN 'see_generally'
        -- Single-word signals with boundary detection
        WHEN pre_context_30 LIKE '%contra,%' OR pre_context_30 LIKE '%contra %' THEN 'contra'
        WHEN pre_context_30 LIKE '%accord,%' OR pre_context_30 LIKE '%accord %' THEN 'accord'
        WHEN pre_context_30 LIKE '%e.g.,%' OR pre_context_30 LIKE '% e.g. %' THEN 'eg'
        WHEN pre_context_30 LIKE '%cf.%' THEN 'cf'
        -- 'see' requires careful boundary detection to avoid false matches
        WHEN pre_context_30 LIKE '% see %' 
          OR pre_context_30 LIKE '%.  see %' 
          OR pre_context_30 LIKE '%, see %'
          OR pre_context_30 LIKE '%; see %' THEN 'see'
        ELSE 'no_signal'
    END as bluebook_signal,
    -- Map signal to stance value (δ-Stance Table 1)
    CASE 
        WHEN pre_context_30 LIKE '%see also%' THEN 1.5
        WHEN pre_context_30 LIKE '%but see%' THEN -2.0
        WHEN pre_context_30 LIKE '%but cf.%' THEN -1.0
        WHEN pre_context_30 LIKE '%see generally%' THEN 0.0
        WHEN pre_context_30 LIKE '%contra,%' OR pre_context_30 LIKE '%contra %' THEN -3.0
        WHEN pre_context_30 LIKE '%accord,%' OR pre_context_30 LIKE '%accord %' THEN 2.5
        WHEN pre_context_30 LIKE '%e.g.,%' OR pre_context_30 LIKE '% e.g. %' THEN 3.0
        WHEN pre_context_30 LIKE '%cf.%' THEN 1.0
        WHEN pre_context_30 LIKE '% see %' 
          OR pre_context_30 LIKE '%.  see %' 
          OR pre_context_30 LIKE '%, see %'
          OR pre_context_30 LIKE '%; see %' THEN 2.0
        ELSE 3.0  -- No signal = direct support (Bluebook default)
    END as stance_value,
    -- Polarity category
    CASE 
        WHEN pre_context_30 LIKE '%but see%' 
          OR pre_context_30 LIKE '%but cf.%' 
          OR pre_context_30 LIKE '%contra,%' 
          OR pre_context_30 LIKE '%contra %' THEN 'negative'
        WHEN pre_context_30 LIKE '%see generally%' THEN 'neutral'
        ELSE 'positive'
    END as bluebook_polarity
FROM joined;
```

#### Materialization

```sql
-- Create persistent table from view
CREATE TABLE bluebook_signals AS SELECT * FROM bluebook_signals_raw;

-- Add indexes for performance
CREATE INDEX idx_bluebook_anchor ON bluebook_signals(anchor_caseId);
CREATE INDEX idx_bluebook_cite ON bluebook_signals(normalized_cite);
CREATE INDEX idx_bluebook_signal ON bluebook_signals(bluebook_signal);
```

---

### 1B. Quoted Passage Extraction (LePaRD Style)

#### Method Definition (from LePaRD Paper)

LePaRD extracts **quoted passages** from judicial opinions that cite precedent. The key insight is that when judges quote a precedent, the surrounding context reveals why they're using that citation.

**Extraction Algorithm:**
1. Find all quoted text in opinion using regex `"([^"]+)"`
2. For each quote ≥ 5 words:
   - Record quote text and position
   - Extract preceding context (up to 300 words before quote)
   - Match quote to cited cases using fuzzy matching
3. Output: (destination_context, quote, cited_case)

#### SQL Implementation

```sql
-- VIEW 2: quoted_passages_raw
-- Extracts quoted text from opinions (simplified LePaRD approach)
-- Note: Full LePaRD uses fuzzy matching to source cases; this extracts quotes near citations

CREATE OR REPLACE VIEW quoted_passages_raw AS
WITH 
texts AS (
    SELECT caseId, majority_opinion 
    FROM read_json_auto('datasets/scdb_full_with_text.jsonl')
    WHERE majority_opinion IS NOT NULL
),
cites AS (
    SELECT 
        anchor_caseId, 
        anchor_lexisCite,
        normalized_cite, 
        start, 
        "end"
    FROM read_parquet('datasets/citation_inventory.parquet')
),
joined AS (
    SELECT 
        c.anchor_caseId,
        c.anchor_lexisCite,
        c.normalized_cite,
        c.start,
        c."end",
        t.majority_opinion,
        -- Get context window around citation (500 chars before, 200 after)
        SUBSTRING(t.majority_opinion, GREATEST(1, c.start - 500), 500) as pre_context,
        SUBSTRING(t.majority_opinion, c."end" + 1, 200) as post_context
    FROM cites c
    JOIN texts t ON c.anchor_caseId = t.caseId
)
SELECT 
    anchor_caseId,
    anchor_lexisCite,
    normalized_cite,
    start,
    "end",
    pre_context,
    post_context,
    -- Check if there's a quote in the preceding context
    CASE 
        WHEN pre_context LIKE '%"%' OR pre_context LIKE '%"%' THEN TRUE
        ELSE FALSE
    END as has_preceding_quote,
    -- Check if there's a parenthetical after citation (case summary)
    CASE 
        WHEN post_context LIKE '(%' THEN TRUE
        ELSE FALSE
    END as has_parenthetical,
    -- Extract parenthetical if present (first 150 chars after opening paren)
    CASE 
        WHEN post_context LIKE '(%' 
        THEN SUBSTRING(post_context, 1, 
            COALESCE(NULLIF(POSITION(')' IN post_context), 0), 150))
        ELSE NULL
    END as parenthetical_text
FROM joined;
```

#### Materialization

```sql
-- Create persistent table
CREATE TABLE quoted_passages AS SELECT * FROM quoted_passages_raw;

-- Add indexes
CREATE INDEX idx_quotes_anchor ON quoted_passages(anchor_caseId);
CREATE INDEX idx_quotes_cite ON quoted_passages(normalized_cite);
CREATE INDEX idx_quotes_has_paren ON quoted_passages(has_parenthetical);
```

---

## PART 2: INTEGRATION (Step 2)

### 2A. Join with Shepard's Data

The integration creates a unified view combining:
- Bluebook signals (author intent)
- Shepard's treatment (editorial classification)
- Fowler scores (authority ranking)

```sql
-- VIEW 3: citation_polarity_unified
-- Combines Bluebook signals with Shepard's treatment

CREATE OR REPLACE VIEW citation_polarity_unified AS
WITH 
-- Get cited case lexis cite for Shepard's join
cited_lexis AS (
    SELECT 
        b.*,
        s.lexisCite as cited_lexisCite
    FROM bluebook_signals b
    LEFT JOIN scdb_cases s ON b.normalized_cite = s.usCite
)
SELECT 
    cl.anchor_caseId,
    cl.anchor_lexisCite,
    cl.normalized_cite,
    cl.cited_lexisCite,
    cl.start,
    cl."end",
    
    -- Bluebook signal data
    cl.bluebook_signal,
    cl.stance_value as bluebook_stance_value,
    cl.bluebook_polarity,
    
    -- Shepard's treatment data (column is 'shepards' not 'treatment_norm')
    sh.shepards as shepards_treatment,
    -- Note: 'agree' column does not exist in shepards_data.csv

    -- Shepard's polarity (mapped from shepards column)
    CASE
        WHEN sh.shepards IN ('followed') THEN 'positive'
        WHEN sh.shepards IN ('distinguished', 'criticized', 'questioned',
                              'overrul', 'limit') THEN 'negative'
        ELSE 'neutral'
    END as shepards_polarity,
    
    -- HYBRID POLARITY: Prefer Bluebook when signal detected, else Shepard's
    CASE 
        -- If Bluebook detected a non-default signal, use it
        WHEN cl.bluebook_signal != 'no_signal' THEN cl.bluebook_polarity
        -- Otherwise use Shepard's if available
        WHEN sh.shepards IS NOT NULL THEN 
            CASE 
                WHEN sh.shepards IN ('follows') THEN 'positive'
                WHEN sh.shepards IN ('distinguishes', 'criticizes', 'questions', 
                                            'overrules', 'limits') THEN 'negative'
                ELSE 'neutral'
            END
        -- Default to positive (citation without signal = support)
        ELSE 'positive'
    END as hybrid_polarity,
    
    -- Source of hybrid decision
    CASE 
        WHEN cl.bluebook_signal != 'no_signal' THEN 'bluebook'
        WHEN sh.shepards IS NOT NULL THEN 'shepards'
        ELSE 'default'
    END as hybrid_source,
    
    -- Agreement indicator (do methods agree?)
    CASE 
        WHEN cl.bluebook_signal = 'no_signal' OR sh.shepards IS NULL THEN NULL
        WHEN cl.bluebook_polarity = 
            CASE 
                WHEN sh.shepards IN ('follows') THEN 'positive'
                WHEN sh.shepards IN ('distinguishes', 'criticizes', 'questions', 
                                            'overrules', 'limits') THEN 'negative'
                ELSE 'neutral'
            END 
        THEN TRUE
        ELSE FALSE
    END as methods_agree

FROM cited_lexis cl
LEFT JOIN read_csv_auto('datasets/shepards_data.csv') sh
    ON cl.anchor_lexisCite = sh.citing_case
    AND cl.cited_lexisCite = sh.cited_case
    AND sh.supreme_court = 1;
```

### 2B. Materialized Integration Table

```sql
-- Create persistent integrated table
CREATE TABLE citation_polarity_integrated AS 
SELECT * FROM citation_polarity_unified;

-- Indexes for FDQ queries
CREATE INDEX idx_polarity_anchor ON citation_polarity_integrated(anchor_caseId);
CREATE INDEX idx_polarity_cite ON citation_polarity_integrated(normalized_cite);
CREATE INDEX idx_polarity_hybrid ON citation_polarity_integrated(hybrid_polarity);
CREATE INDEX idx_polarity_agree ON citation_polarity_integrated(methods_agree);
```

### 2C. Validation Queries

```sql
-- Check coverage statistics
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN bluebook_signal != 'no_signal' THEN 1 END) as with_bluebook_signal,
    COUNT(shepards_treatment) as with_shepards,
    COUNT(CASE WHEN methods_agree IS NOT NULL THEN 1 END) as comparable,
    ROUND(100.0 * SUM(CASE WHEN methods_agree THEN 1 ELSE 0 END) / 
          NULLIF(COUNT(CASE WHEN methods_agree IS NOT NULL THEN 1 END), 0), 2) as agreement_rate
FROM citation_polarity_integrated;

-- Signal distribution by Shepard's treatment
SELECT 
    shepards_treatment,
    bluebook_signal,
    COUNT(*) as count,
    ROUND(AVG(bluebook_stance_value), 2) as avg_stance
FROM citation_polarity_integrated
WHERE shepards_treatment IS NOT NULL 
  AND bluebook_signal != 'no_signal'
GROUP BY 1, 2
ORDER BY 1, count DESC;

-- Find disagreements (Bluebook negative but Shepard's positive, or vice versa)
SELECT 
    anchor_caseId,
    normalized_cite,
    bluebook_signal,
    bluebook_polarity,
    shepards_treatment,
    shepards_polarity
FROM citation_polarity_integrated
WHERE methods_agree = FALSE
LIMIT 50;
```

---

## PART 3: FDQ INTEGRATION

### For FDQ-01 (Citation Stance Differentiation)

The integrated table can be used directly for FDQ-01 sub-questions:

```sql
-- Get in_favor citations for an anchor
SELECT normalized_cite, hybrid_polarity, hybrid_source, bluebook_stance_value
FROM citation_polarity_integrated
WHERE anchor_caseId = :anchor_id
  AND hybrid_polarity = 'positive'
ORDER BY bluebook_stance_value DESC;

-- Get against citations for an anchor  
SELECT normalized_cite, hybrid_polarity, hybrid_source, bluebook_stance_value
FROM citation_polarity_integrated
WHERE anchor_caseId = :anchor_id
  AND hybrid_polarity = 'negative'
ORDER BY bluebook_stance_value ASC;
```

### Eligibility Enhancement

Update the eligibility criteria to use the integrated table:

```sql
-- Anchors with balanced polarity (at least 1 of each)
SELECT anchor_caseId, 
       COUNT(CASE WHEN hybrid_polarity = 'positive' THEN 1 END) as n_positive,
       COUNT(CASE WHEN hybrid_polarity = 'negative' THEN 1 END) as n_negative
FROM citation_polarity_integrated
GROUP BY anchor_caseId
HAVING n_positive >= 1 AND n_negative >= 1;
```

---

## Files Reference

| File | Purpose | Location |
|------|---------|----------|
| citation_inventory.parquet | Citation positions | datasets/ |
| scdb_full_with_text.jsonl | Opinion text | datasets/ |
| scdb_cases | SCDB metadata | DuckDB table |
| shepards_edges | Shepard's treatment | DuckDB table |
| deltastance/ | δ-Stance paper/sample | datasets/new/ |
| LePaRD/ | LePaRD code | datasets/new/ |

---

## Execution Order

1. **Create bluebook_signals_raw view** → Test with sample queries
2. **Create quoted_passages_raw view** → Test with sample queries  
3. **Materialize to tables** → Add indexes
4. **Create citation_polarity_unified view** → Validate join coverage
5. **Materialize integration table** → Run validation queries
6. **Update FDQ eligibility queries** → Use new polarity source

---

## Expected Results (Verified 2026-01-24)

| Metric | Verified Value |
|--------|----------------|
| Total citations | 378,938 |
| With Bluebook signal detected | 35,726 (9.4%) |
| With Shepard's treatment (SC→SC) | ~232,000 |
| Comparable (both methods) | ~27,000 |
| Key disagreements | 1,013 "distinguished" with positive Bluebook |

### Signal Distribution (Actual)

| Signal | Count | % | Polarity |
|--------|-------|---|----------|
| no_signal | 343,212 | 90.6% | positive_default |
| see | 19,356 | 5.1% | positive |
| cf | 6,445 | 1.7% | positive |
| eg | 4,352 | 1.1% | positive |
| see_also | 4,045 | 1.1% | positive |
| contra | 652 | 0.17% | negative |
| accord | 402 | 0.11% | positive |
| see_generally | 202 | 0.05% | neutral |
| but_see | 177 | 0.05% | negative |
| but_cf | 95 | 0.03% | negative |

---

*Generated: 2026-01-25*
*Version: 1.0*

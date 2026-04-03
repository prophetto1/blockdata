---
title: "DuckDB schema documentation"
sidebar:
  order: 4
---

# Legal-10 DuckDB Database Schema Documentation

**Database**: `legal10-updates`  
**Schema**: `main`  
**Generated**: 01/24/2026

---

## Overview

This database supports the Legal-10 benchmark evaluation system, containing legal case data from multiple authoritative sources spanning 1791-2025. It integrates case metadata, citation networks, ideological scores, and oral argument transcripts to enable complex legal reasoning evaluations.

**Total Objects**: 13 base tables, 7 analytical views, 6 indexes

---

## Data Sources Summary

| Source | Description | Coverage |
|--------|-------------|----------|
| CAP | Caselaw Access Project - Federal case law | 1802-2019, 855K cases |
| SCDB | Supreme Court Database | 1791-2021, 29K decisions |
| Oyez | Supreme Court oral arguments & transcripts | 1800-2025, 8.4K cases |
| Shepard's | Citation treatment network | 5.7M citation edges |
| Fowler | Case authority/influence scores | Snapshot 2022 |
| Martin-Quinn | Justice ideology scores | 1937-2024 |
| Songer | US Courts of Appeals Database | 20K+ cases |
| CourtListener | Cross-reference identifiers | 867K mappings |

---

## Base Tables

### cap_cases_meta
**Purpose**: Metadata for federal cases from the Caselaw Access Project  
**Rows**: 855,215  
**Coverage**: 1802-2019 | 393 courts | 6 sources (F.1d, F.2d, F.3d, F.Supp series)

| Column | Type | Description |
|--------|------|-------------|
| cap_source | VARCHAR | Reporter series (cap_f1d, cap_f2d, cap_f3d, cap_f1supp, cap_f2supp, cap_f3supp) |
| cap_id | BIGINT | CAP unique identifier |
| decision_date_raw | VARCHAR | Raw decision date string |
| decision_year | INTEGER | Year of decision |
| court_slug | VARCHAR | Court identifier slug |
| court_name | VARCHAR | Full court name |
| docket_number | VARCHAR | Case docket number |
| name | VARCHAR | Full case name |
| name_abbreviation | VARCHAR | Abbreviated case name |
| official_cite | VARCHAR | Official citation |
| cite_key | VARCHAR | Normalized citation key for joins |

**Source Distribution**:
- cap_f2d: 275,122 cases
- cap_f1supp: 214,096 cases  
- cap_f3d: 141,483 cases
- cap_f2supp: 115,461 cases
- cap_f1d: 72,368 cases
- cap_f3supp: 36,685 cases

---

### cap_text_stats
**Purpose**: Text length statistics for CAP cases  
**Rows**: 43,043

| Column | Type | Description |
|--------|------|-------------|
| cap_id | BIGINT | CAP case identifier (NOT NULL) |
| cap_source | VARCHAR | Reporter series |
| official_cite | VARCHAR | Official citation |
| opinion_chars | BIGINT | Character count of opinion text |
| pagerank_percentile | DOUBLE | Citation network PageRank percentile |
| head_matter_chars | BIGINT | Character count of head matter |

---

### scdb_cases
**Purpose**: Supreme Court Database - comprehensive SCOTUS case data  
**Rows**: 29,021  
**Coverage**: 1791-2021 | 17 Chief Justices | 14 issue areas

| Column | Type | Description |
|--------|------|-------------|
| caseId | VARCHAR | SCDB case identifier |
| docketId | VARCHAR | Docket identifier |
| caseIssuesId | VARCHAR | Case issues identifier |
| voteId | VARCHAR | Vote identifier |
| dateDecision | VARCHAR | Decision date |
| decisionType | VARCHAR | Type of decision |
| usCite | VARCHAR | US Reports citation |
| sctCite | VARCHAR | Supreme Court Reporter citation |
| ledCite | VARCHAR | Lawyers Edition citation |
| lexisCite | VARCHAR | LexisNexis citation |
| term | VARCHAR | Court term |
| naturalCourt | VARCHAR | Natural court identifier |
| chief | VARCHAR | Chief Justice |
| docket | VARCHAR | Docket number |
| caseName | VARCHAR | Case name |
| dateArgument | VARCHAR | Argument date |
| dateRearg | VARCHAR | Reargument date |
| petitioner | VARCHAR | Petitioner type |
| petitionerState | VARCHAR | Petitioner state |
| respondent | VARCHAR | Respondent type |
| respondentState | VARCHAR | Respondent state |
| jurisdiction | VARCHAR | Basis for jurisdiction |
| adminAction | VARCHAR | Administrative action type |
| adminActionState | VARCHAR | Admin action state |
| threeJudgeFdc | VARCHAR | Three-judge federal district court |
| caseOrigin | VARCHAR | Court of origin |
| caseOriginState | VARCHAR | Origin state |
| caseSource | VARCHAR | Court source |
| caseSourceState | VARCHAR | Source state |
| lcDisagreement | VARCHAR | Lower court disagreement |
| certReason | VARCHAR | Reason for cert grant |
| lcDisposition | VARCHAR | Lower court disposition |
| lcDispositionDirection | VARCHAR | LC disposition direction |
| declarationUncon | VARCHAR | Declaration of unconstitutionality |
| caseDisposition | VARCHAR | SCOTUS disposition |
| caseDispositionUnusual | VARCHAR | Unusual disposition flag |
| partyWinning | VARCHAR | Winning party |
| precedentAlteration | VARCHAR | Precedent alteration |
| voteUnclear | VARCHAR | Vote unclear flag |
| issue | VARCHAR | Legal issue code |
| issueArea | VARCHAR | Issue area category |
| decisionDirection | VARCHAR | Liberal/conservative direction |
| decisionDirectionDissent | VARCHAR | Dissent direction |
| authorityDecision1 | VARCHAR | Primary authority basis |
| authorityDecision2 | VARCHAR | Secondary authority basis |
| lawType | VARCHAR | Type of law |
| lawSupp | VARCHAR | Supplemental law type |
| lawMinor | VARCHAR | Minor law type |
| majOpinWriter | VARCHAR | Majority opinion author (justice ID) |
| majOpinAssigner | VARCHAR | Opinion assigner |
| splitVote | VARCHAR | Split vote flag |
| majVotes | VARCHAR | Majority vote count |
| minVotes | VARCHAR | Minority vote count |
| has_opinion_text | BOOLEAN | Whether opinion text is available |
| missing_text_reason | VARCHAR | Reason for missing text |

---

### scotus_text_stats
**Purpose**: Text statistics for SCOTUS opinions  
**Rows**: 27,733

| Column | Type | Description |
|--------|------|-------------|
| caseId | VARCHAR | SCDB case identifier |
| usCite | VARCHAR | US Reports citation |
| opinion_chars | BIGINT | Opinion character count |
| opinion_file_bytes | BIGINT | Opinion file size |
| syllabus_chars | BIGINT | Syllabus character count |
| has_syllabus | BOOLEAN | Whether syllabus exists |

---

### shepards_edges
**Purpose**: Citation treatment relationships (Shepard's Citations ground truth)  
**Rows**: 5,711,699  
**Coverage**: Cited years 1791-2005 | Citing years 1792-2007 | 9 treatment types

| Column | Type | Description |
|--------|------|-------------|
| cited_lexis | VARCHAR | Lexis citation of cited case |
| citing_lexis | VARCHAR | Lexis citation of citing case |
| citing_court | VARCHAR | Court of citing case |
| citing_opinion_type | VARCHAR | Opinion type of citing case |
| shepards_raw | VARCHAR | Raw Shepard's treatment signal |
| shepards_raw_lc | VARCHAR | Raw treatment (lowercase) |
| year_correct | INTEGER | Correction flag for year |
| citing_year | INTEGER | Year of citing case |
| cited_year | INTEGER | Year of cited case |
| appeals_court | INTEGER | Flag: citing is appeals court |
| district_court | INTEGER | Flag: citing is district court |
| misc_citing_court | INTEGER | Flag: misc court |
| fed_specialized_ct | INTEGER | Flag: federal specialized court |
| citing_body_not_ct | INTEGER | Flag: citing body is not a court |
| state_court | INTEGER | Flag: state court |
| supreme_court | INTEGER | Flag: Supreme Court |
| cited_usid | VARCHAR | US Reports ID of cited case |
| treatment_norm | VARCHAR | Normalized treatment category |
| agree | BOOLEAN | Whether treatment indicates agreement |

**Treatment Type Distribution**:
| Treatment | Count | Meaning |
|-----------|-------|---------|
| cites | 5,083,512 | Neutral citation |
| follows | 365,889 | Follows precedent |
| distinguishes | 143,239 | Distinguishes facts/law |
| explains | 89,044 | Explains holding |
| questions | 14,905 | Questions validity |
| other | 9,061 | Other treatment |
| criticizes | 4,115 | Criticizes reasoning |
| overrules | 1,125 | Overrules precedent |
| limits | 809 | Limits application |

---

### fowler_scores
**Purpose**: Case authority/influence scores (Fowler et al. methodology)  
**Rows**: 27,846  
**Coverage**: Snapshot year 2022 | Score range 0.0 - 0.178

| Column | Type | Description |
|--------|------|-------------|
| snapshot_year | INTEGER | Year of score calculation |
| auth_score | DOUBLE | Authority score (0-0.178) |
| pauth_score | DOUBLE | PageRank authority score |
| lexis_cite | VARCHAR | LexisNexis citation |

---

### martin_quinn_scores
**Purpose**: Justice ideology scores (Martin-Quinn methodology)  
**Rows**: 800  
**Coverage**: 1937-2024 | Score range -7.762 (liberal) to 4.519 (conservative)

| Column | Type | Description |
|--------|------|-------------|
| scdb_justice_id | INTEGER | SCDB justice identifier (NOT NULL) |
| term | INTEGER | Court term (NOT NULL) |
| post_mn | DOUBLE | Posterior mean ideology score |
| post_sd | DOUBLE | Posterior standard deviation |
| justice_name | VARCHAR | Justice name |

---

### justice_lookup
**Purpose**: Justice identifier mapping table  
**Rows**: 40

| Column | Type | Description |
|--------|------|-------------|
| scdb_justice_id | INTEGER | SCDB justice identifier (NOT NULL) |
| mq_code | VARCHAR | Martin-Quinn code |
| justice_name | VARCHAR | Justice full name |
| start_term | INTEGER | First term on court |
| end_term | INTEGER | Last term on court |

---

### oyez_cases
**Purpose**: Oyez Project case metadata  
**Rows**: 8,393  
**Coverage**: 1800-2025

| Column | Type | Description |
|--------|------|-------------|
| oyez_id | BIGINT | Oyez case identifier |
| term | INTEGER | Court term |
| docket_norm | VARCHAR | Normalized docket number |
| case_name | VARCHAR | Case name |
| first_party | VARCHAR | First party name |
| second_party | VARCHAR | Second party name |
| winning_party | VARCHAR | Winning party |
| decision_date | VARCHAR | Decision date |
| transcript_count | INTEGER | Number of oral argument transcripts |

---

### oyez_scdb_map
**Purpose**: Mapping between Oyez and SCDB identifiers  
**Rows**: 7,824

| Column | Type | Description |
|--------|------|-------------|
| oyez_id | BIGINT | Oyez case identifier |
| scdb_caseId | VARCHAR | SCDB case identifier |
| term | INTEGER | Court term |
| oyez_docket | VARCHAR | Oyez docket number |
| scdb_docket | VARCHAR | SCDB docket number |
| case_name | VARCHAR | Case name |
| transcript_count | INTEGER | Number of transcripts |
| match_confidence | VARCHAR | Matching confidence level |

---

### oyez_transcript_turns
**Purpose**: Oral argument transcript turns (speaker-level)  
**Rows**: 0 (empty - structure only)

| Column | Type | Description |
|--------|------|-------------|
| oyez_id | BIGINT | Oyez case identifier |
| transcript_idx | INTEGER | Transcript index |
| section_idx | INTEGER | Section index within transcript |
| turn_idx | INTEGER | Turn index within section |
| speaker | VARCHAR | Speaker name |
| speaker_role | VARCHAR | Speaker role (Justice, Advocate, etc.) |
| start_time | DOUBLE | Start timestamp |
| stop_time | DOUBLE | End timestamp |
| text | VARCHAR | Spoken text |

---

### songer_cases
**Purpose**: Songer US Courts of Appeals Database  
**Rows**: 20,355

| Column | Type | Description |
|--------|------|-------------|
| casenum | VARCHAR | Songer case number |
| year | INTEGER | Decision year |
| vol | INTEGER | Reporter volume |
| beginpg | INTEGER | Beginning page |
| circuit | VARCHAR | Circuit |
| treat | VARCHAR | Treatment variable |
| citation | VARCHAR | Citation |
| case_name | VARCHAR | Case name |
| cite_key | VARCHAR | Normalized citation key |

---

### cl_crosswalk
**Purpose**: CourtListener cross-reference identifiers  
**Rows**: 866,618

| Column | Type | Description |
|--------|------|-------------|
| lexis_cite | VARCHAR | LexisNexis citation |
| fed_cite | VARCHAR | Federal Reporter citation |
| cluster_id | VARCHAR | CourtListener cluster ID |

---

## Analytical Views

### cap_citations_ranked
**Purpose**: Ranked citations for CAP cases with nested citation arrays  
**Rows**: 10,928  
**Source**: `cap_citations_ranked.jsonl`

| Column | Type | Description |
|--------|------|-------------|
| anchor_caseId | VARCHAR | Anchor case identifier |
| anchor_usCite | VARCHAR | Anchor US citation |
| citations | STRUCT[] | Array of citation structs with: rank, cite_type, normalized_cite, cap_id, cap_name, pagerank_percentile, occurrences, resolved |
| n_citations | BIGINT | Total citation count |

---

### cap_citations_ranked_flat
**Purpose**: Flattened version of cap_citations_ranked (unnested)  
**Rows**: 50,364

| Column | Type | Description |
|--------|------|-------------|
| anchor_caseId | VARCHAR | Anchor case identifier |
| anchor_usCite | VARCHAR | Anchor US citation |
| rank | BIGINT | Citation rank |
| cite_type | VARCHAR | Citation type |
| normalized_cite | VARCHAR | Normalized citation string |
| cap_id | BIGINT | CAP case ID |
| cap_name | VARCHAR | Case name |
| pagerank_percentile | DOUBLE | PageRank percentile |
| occurrences | BIGINT | Number of occurrences |
| resolved | BOOLEAN | Whether citation was resolved |

---

### scotus_citations_ranked
**Purpose**: Ranked citations for SCOTUS cases with Fowler scores  
**Rows**: 21,154  
**Source**: `scotus_citations_ranked.jsonl`

| Column | Type | Description |
|--------|------|-------------|
| anchor_caseId | VARCHAR | Anchor SCDB case ID |
| anchor_usCite | VARCHAR | Anchor US citation |
| citations | STRUCT[] | Array with: rank, normalized_cite, cited_caseId, cited_usCite, cited_caseName, fowler_score, occurrences, resolved |
| n_citations | BIGINT | Total citation count |

---

### scotus_citations_ranked_flat
**Purpose**: Flattened SCOTUS citations  
**Rows**: 293,816

| Column | Type | Description |
|--------|------|-------------|
| anchor_caseId | VARCHAR | Anchor case ID |
| anchor_usCite | VARCHAR | Anchor US citation |
| rank | BIGINT | Citation rank |
| normalized_cite | VARCHAR | Normalized citation |
| cited_caseId | VARCHAR | Cited case SCDB ID |
| cited_usCite | VARCHAR | Cited US citation |
| cited_caseName | VARCHAR | Cited case name |
| fowler_score | DOUBLE | Fowler authority score |
| occurrences | BIGINT | Occurrence count |
| resolved | BOOLEAN | Resolution status |

---

### scdb_with_fowler
**Purpose**: SCDB cases joined with Fowler authority scores  
**Rows**: 29,021

Includes all 55 columns from `scdb_cases` plus:

| Column | Type | Description |
|--------|------|-------------|
| has_fowler_score | BOOLEAN | Whether Fowler score exists |
| fowler_auth_score | DOUBLE | Authority score |
| fowler_pauth_score | DOUBLE | PageRank authority score |
| fowler_snapshot_year | INTEGER | Score snapshot year |

**Join Logic**: `scdb_cases.lexisCite = fowler_scores.lexis_cite`

---

### scdb_with_ideology
**Purpose**: SCDB cases with author ideology scores  
**Rows**: 26,777

| Column | Type | Description |
|--------|------|-------------|
| caseId | VARCHAR | SCDB case ID |
| caseName | VARCHAR | Case name |
| term | VARCHAR | Court term |
| majOpinWriter | VARCHAR | Majority opinion writer ID |
| author_name | VARCHAR | Author justice name |
| author_ideology | DOUBLE | Martin-Quinn ideology score |
| ideology_uncertainty | DOUBLE | Score uncertainty (post_sd) |
| decisionDirection | VARCHAR | Decision direction |
| partyWinning | VARCHAR | Winning party |
| issueArea | VARCHAR | Issue area |

**Join Logic**: `scdb_cases.majOpinWriter = martin_quinn_scores.scdb_justice_id AND scdb_cases.term = martin_quinn_scores.term`

---

### songer_cap_matches
**Purpose**: Songer cases matched to CAP metadata  
**Rows**: 22,082

Includes all 9 columns from `songer_cases` plus:

| Column | Type | Description |
|--------|------|-------------|
| cap_source | VARCHAR | CAP reporter series |
| cap_id | BIGINT | CAP case ID |
| cap_decision_year | INTEGER | CAP decision year |
| cap_court_slug | VARCHAR | CAP court slug |

**Join Logic**: `songer_cases.cite_key = cap_cases_meta.cite_key`

---

## Indexes

| Index Name | Table | Column | Purpose |
|------------|-------|--------|---------|
| idx_cap_cases_meta_cap_id | cap_cases_meta | cap_id | Fast lookup by CAP ID |
| idx_cap_cases_meta_cite_key | cap_cases_meta | cite_key | Citation key joins |
| idx_cl_lexis | cl_crosswalk | lexis_cite | Lexis citation lookups |
| idx_shepards_cited | shepards_edges | cited_lexis | Citation network queries (cited) |
| idx_shepards_citing | shepards_edges | citing_lexis | Citation network queries (citing) |
| idx_songer_cases_cite_key | songer_cases | cite_key | Citation key joins |

---

## Key Join Patterns

### Citation Matching
```sql
-- CAP to Songer via cite_key
cap_cases_meta.cite_key = songer_cases.cite_key

-- SCDB to Fowler via Lexis
scdb_cases.lexisCite = fowler_scores.lexis_cite

-- Cross-source via CourtListener
cl_crosswalk.lexis_cite = shepards_edges.cited_lexis
```

### Ideology Analysis
```sql
-- Justice ideology by term
scdb_cases.majOpinWriter = martin_quinn_scores.scdb_justice_id 
AND scdb_cases.term = martin_quinn_scores.term
```

### Citation Network
```sql
-- Shepard's treatment network
shepards_edges.cited_lexis -> shepards_edges.citing_lexis
-- With treatment_norm for positive/negative signals
```

---

## Usage Notes

1. **Primary Keys**: Most tables use VARCHAR identifiers (caseId, cap_id, lexis_cite) rather than integer PKs
2. **Nullable Columns**: Most columns are nullable; only key identifiers have NOT NULL constraints
3. **Text Data**: Full opinion text is NOT stored in this database; only metadata and statistics
4. **Citation Resolution**: Views with `_flat` suffix provide unnested citation arrays for easier querying
5. **Score Ranges**: 
   - Martin-Quinn: -7.762 (liberal) to +4.519 (conservative)
   - Fowler: 0.0 to 0.178 (higher = more authoritative)
   - PageRank: 0-100 percentile

---

*Documentation generated from live database introspection*

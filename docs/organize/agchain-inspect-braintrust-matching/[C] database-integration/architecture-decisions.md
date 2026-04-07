# Architecture Decisions — Legal-10 Platform

**Status:** Living Document
**Last updated:** 2026-01-29

---

## Purpose

This document captures architectural decisions for the Legal-10 benchmark platform. All AIs working in this codebase should read and follow these decisions.

---

## 1. Database-First Architecture

**Decision:** All benchmark data is pre-computed at build time and stored in DuckDB. Builders and runners perform zero runtime calculation.

**Rationale:**
- Enables direct SQL testing for edge cases before any code runs
- If SQL is correct, extraction is correct everywhere
- Materialization errors are caught once, at build time
- Runner complexity reduced to SELECT → serialize → execute model → compare

**Implications:**
- Ground truths are pre-computed for all eligible anchors
- Prompts, response formats, and scoring configs live in database tables
- EU packets (p1.json, p2.json, ground_truth.json) are pre-built and stored
- Runtime is ONLY: load sealed packet → execute model calls → compare to pre-computed truth

---

## 2. Open Questions (Need Answers)

### Q1: FDQ Ground Truth Table Structure

**Question:** Should each FDQ have its own ground truth table, or use a unified schema?

**Option A: Separate tables per FDQ**
```
fdq01_ka_sc_ground_truth (anchor_usCite, controlling_authority, in_favor, against, most_frequent)
fdq02_c_nonexist_ground_truth (anchor_usCite, synthetic_citations, correct_answer)
fdq04_fact_extract_ground_truth (anchor_usCite, reversal, prevailing_party)
...
```
- Pro: Type-safe columns per FDQ
- Pro: SQL queries are straightforward
- Con: More tables to manage

**Option B: Unified table with JSON column**
```
fdq_ground_truth (anchor_usCite, fdq_id, ground_truth_json)
```
- Pro: Single table for all FDQs
- Con: JSON parsing at query time
- Con: Loses column-level type safety

**Current leaning:** Option A (separate tables) for clarity and testability.

---

### Q2: Prompt Storage Location

**Question:** Should prompts live in database tables or in FDQ markdown files?

**Option A: Database tables**
```sql
fdq_prompts (fdq_id, prompt_template, response_schema, version, effective_date)
```
- Pro: Versioning and history built-in
- Pro: Can query/compare prompts across FDQs
- Con: Duplicates content from FDQ specs

**Option B: FDQ markdown files only (current)**
- Pro: Single source of truth
- Pro: Human-readable in docs/
- Con: No versioning without git

**Option C: Hybrid — markdown is authoritative, database is materialized copy**
- Materialization script extracts prompts from FDQ docs into database
- Database is queryable/testable
- Markdown remains the source of truth

**Current leaning:** Option C (hybrid) — FDQ docs are authoritative, but prompts materialized to DB for testing.

---

### Q3: Eligibility Materialization Granularity

**Question:** Should eligibility be computed per-FDQ or as a single unified eligibility table?

**Option A: Per-FDQ eligibility tables**
```
fdq01_eligibility (anchor_usCite, eligible, reason)
fdq04_eligibility (anchor_usCite, eligible, reason)
```
- Pro: Different FDQs have different eligibility criteria
- Pro: Clear what makes an anchor eligible for each FDQ

**Option B: Unified eligibility with columns per FDQ**
```
anchor_eligibility (anchor_usCite, fdq01_eligible, fdq04_eligible, fdq05_eligible, ...)
```
- Pro: Single query to see full eligibility picture
- Con: Wide table, harder to extend

**Current leaning:** Option A (per-FDQ tables) — eligibility criteria vary significantly between FDQs.

---

### Q4: Pre-built EU Packets vs On-Demand Assembly

**Question:** Should EU packets be fully pre-built and stored, or assembled on-demand from materialized tables?

**Option A: Fully pre-built**
- Build script creates `eus/{eu_id}/p1.json`, `p2.json`, `ground_truth.json` files
- Runner loads files directly, no database access at runtime
- Pro: True sealed evaluation
- Con: Storage for all pre-built packets

**Option B: On-demand from database**
- Runner queries database to assemble packets at runtime
- Pro: No file storage needed
- Con: Runtime depends on database

**Option C: Pre-built for release, on-demand for development**
- Development: query database to test
- Release: pre-build and seal all packets

**Current leaning:** Option C — develop against database, seal for release.

---

## 3. Resolved Decisions

### D1: KA-SC Ground Truth Computation (2026-01-23)

**Decision:** Use the SQL queries defined in [01-ka-sc.md](./[legal-10]%20[fdq]%2001-ka-sc.md) section 5.

**Key rules:**
- `controlling_authority`: Highest Fowler score, tie-break by occurrences DESC, then lexicographic
- `in_favor`: Shepard's treatment_norm = 'follows'
- `against`: Shepard's treatment_norm IN ('distinguishes', 'questions', 'criticizes', 'overrules', 'limits')
- `most_frequent`: Highest occurrences, tie-break by Fowler DESC, then lexicographic

---

### D2: FDQ v2.0 Structure (2026-01-27)

**Decision:** All FDQ specifications must follow the v2.0 structure derived from [02-c-nonexist1.md](./[legal-10]%20[fdq]%2002-c-nonexist1.md).

**Required sections:**
1. Question ID + metadata
2. Purpose (Setup/Test/Failure mode)
3. System Prompt reference
4. TASK Window Content
5. OUTPUT_GUARD Window Content
6. Data Requirements
7. Eligibility Criteria
8. Instantiation
9. Response Format + Parsing
10. Scoring
11. Example Instance (with FULL messages array)
12. Design Rationale
13. FDQ Checklist

---

### D3: Message Assembly Windows (2026-01-27)

**Decision:** Use fenced windows with canonical order:

```
messages[0] = system prompt (role: system)
messages[1] = <<<BEGIN_ENV>>>...<<<END_ENV>>>
messages[2] = <<<BEGIN_ANCHOR_PACK>>>...<<<END_ANCHOR_PACK>>>
messages[3] = <<<BEGIN_EVIDENCE_PACK>>>...<<<END_EVIDENCE_PACK>>>
messages[4] = <<<BEGIN_CARRY_FORWARD>>>...<<<END_CARRY_FORWARD>>>
messages[5] = <<<BEGIN_TASK>>>...<<<END_TASK>>>
messages[6] = <<<BEGIN_OUTPUT_GUARD>>>...<<<END_OUTPUT_GUARD>>>
```

---

### D4: FDQ Ground Truth Table Structure (2026-01-29)

**Decision:** Use separate, per-FDQ ground truth tables and per-FDQ eligibility tables.

**Naming:**
- `fdqNN_eligibility` (one row per potential anchor)
- `fdqNN_ground_truth` (one row per eligible anchor)

**Rationale:** The primary workflow is “test everything in SQL” and “builders just SELECT and serialize”.
Separate tables keep SQL readable and make edge-case discovery easy.

---

### D5: Prompts Are Authoritative in `docs/` (2026-01-29)

**Decision:** FDQ markdown files in `docs/` remain the source of truth for prompts, response contracts, scoring rules, and eligibility intent.

**Allowed:** Build-time materialization into DuckDB for queryability/testing (a copy), but the database copy is not authoritative.

---

### D6: Development vs Release Packaging (2026-01-29)

**Decision:** Develop against DuckDB (on-demand SELECTs for iteration/testing), then pre-build and seal EU packets for release.

**Invariant:** Runner performs zero runtime computation beyond model execution and comparing to pre-computed truth.

---

## 4. FDQ Materialization Conventions

This section defines shared conventions so multiple AIs can build compatible, testable, database-first materializations.

See: `fdq-materialization-conventions.md` (in this folder)

---

## 5. Materialization Tables (Planned)

Once open questions are resolved, these tables will be created:

| Table | Purpose |
|-------|---------|
| `fdq01_ground_truth` | KA-SC pre-computed answers for all eligible anchors |
| `fdq01_eligibility` | Which anchors are eligible for KA-SC |
| `fdq02_ground_truth` | C-NONEXIST synthetic citations and correct answers |
| `fdq04_ground_truth` | FACT-EXTRACT reversal/prevailing_party |
| `fdq05_ground_truth` | DISTINGUISH treatment/agree |
| `fdq08_ground_truth` | TRANSITIVE triangle answers |
| `fdq_prompts` | Materialized prompts from FDQ docs |
| `fdq_scoring` | Scoring weights and metrics per FDQ |
| `rp_selections` | Pre-computed Research Pack authorities per anchor |
| `anchor_eligibility_summary` | Unified view of which anchors work for which FDQs |

---

## 5. How to Use This Document

**For AIs starting a session:**
1. Read this document to understand current architecture
2. Check open questions — if working on something related, follow the "current leaning"
3. If you make a decision that resolves an open question, move it to "Resolved Decisions" with date

**For adding new decisions:**
1. If there's uncertainty, add to "Open Questions" with options
2. Once decided, move to "Resolved Decisions" with date and rationale
3. Update "Materialization Tables" if the decision affects table structure

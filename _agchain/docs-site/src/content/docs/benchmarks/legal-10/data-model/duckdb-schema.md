---
title: DuckDB Schema
description: Database schema — 13 tables and 7 views spanning 8 legal data sources.
sidebar:
  order: 2
---

`legal-10/datasets/legal10-updates.duckdb` contains the integrated legal dataset.

## Scale

| Table | Rows | Description |
|-------|------|-------------|
| `shepards_edges` | 5.7M | Citation graph edges |
| `cap_cases_meta` | 855K | Case metadata from CAP |
| `cl_crosswalk` | 866K | CourtListener cross-reference IDs |
| `cap_citations_ranked` | 430K | Ranked authority citations |
| `citation_inventory` | 345K | Normalized citation index |

## Data sources

CAP (Caselaw Access Project), SCDB (Supreme Court Database), Oyez, Shepard's Citations, Fowler authority scores, Martin-Quinn ideological scores, Songer appellate database, CourtListener.

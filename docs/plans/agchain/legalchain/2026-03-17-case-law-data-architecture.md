# Case Law Data Architecture

**Source:** CourtListener / Free Law Project bulk data
**Bucket:** `gs://agchain-case-law` (65 objects, ~31 unique datasets)

---

## Storage Split

### Cloud SQL Postgres 16 — Everything

**Instance:** `case-law-db` | `us-central1` | 2 vCPU, 8 GB RAM | 400 GB SSD (auto-resize)
**Connection:** `agchain:us-central1:case-law-db` | Private IP `10.97.0.5`
**Schema:** `case_law`
**Schema file:** `scripts/case-law-schema.sql`

#### Relational tables (typed columns, FKs, indexes)

| Table | Source CSV | Rows | Key Relationships |
|---|---|---|---|
| `courts` | `courts.csv` | 3.4K | `parent_court_id` self-ref |
| `court_appeals_to` | `court-appeals-to.csv` | 5 | `from_court_id → courts`, `to_court_id → courts` |
| `courthouses` | `courthouses.csv` | 3.4K | `court_id → courts` |
| `people` | `people-db-people.csv` | 16K | `is_alias_of_id` self-ref |
| `positions` | `people-db-positions.csv` | 51K | `person_id → people`, `court_id → courts`, `school_id → schools` |
| `educations` | `people-db-educations.csv` | 13K | `person_id → people`, `school_id → schools` |
| `schools` | `people-db-schools.csv` | 6K | `is_alias_of_id` self-ref |
| `political_affiliations` | `people-db-political-affiliations.csv` | 8.5K | `person_id → people` |
| `races` | `people_db_race.csv` | 8 | Reference lookup |
| `person_races` | `people-db-races.csv` | 6.5K | `person_id → people`, `race_id → races` |
| `retention_events` | `people-db-retention-events.csv` | 0 | `position_id → positions` |

#### JSONB tables (`id integer PK` + `data jsonb` + GIN index)

| Table | Source CSV | Rows | Size |
|---|---|---|---|
| **`opinions`** | `opinions.csv.bz2` (51 GB) | ~9M | **~300 GB** |
| `dockets` | `dockets.csv` | 7.9M | ~3.3 GB |
| `fjc_integrated_database` | `fjc-integrated-database.csv` | 10.3M | ~2.6 GB |
| `oral_arguments` | `oral-arguments.csv` | large | ~2.9 GB |
| `financial_disclosures` | `financial-disclosures.csv` | 109K | ~26 MB |
| `financial_disclosure_investments` | `financial-disclosure-investments.csv` | 1.9M | ~308 MB |
| `financial_disclosure_agreements` | `financial-disclosures-agreements.csv` | 10K | ~1.7 MB |
| `financial_disclosure_debts` | `financial-disclosures-debts.csv` | 19K | ~2.4 MB |
| `financial_disclosure_gifts` | `financial-disclosures-gifts.csv` | 2K | ~312 KB |
| `financial_disclosure_income` | `financial-disclosures-non-investment-income.csv` | 15K | ~2.2 MB |
| `financial_disclosure_positions` | `financial-disclosures-positions.csv` | 37K | ~5.1 MB |
| `financial_disclosure_reimbursements` | `financial-disclosures-reimbursements.csv` | 33K | ~6.3 MB |
| `financial_disclosure_spousal_income` | `financial-disclosures-spousal-income.csv` | 20K | ~2.6 MB |
| `originating_court_information` | `originating-court-information.csv` | 54K | ~8 MB |
| `opinioncluster_panel` | `opinioncluster-panel.csv` | 834K | ~20 MB |
| `opinion_joined_by` | `search_opinion_joined_by.csv` | 1K | ~23 KB |
| `cluster_non_participating_judges` | `search_opinioncluster_non_participating_judges.csv` | 0 | tiny |

---

### ArangoDB Cloud (free tier, ≤100 GB) — Citation graph + AI retrieval metadata

Keep only 4 collections. Delete everything else.

| Collection | Rows | Purpose |
|---|---|---|
| `cl_opinion_clusters` | 9.4M | Case metadata — links opinions to dockets |
| `cl_citations` | 18.1M | Citation details with depth scoring |
| `cl_citation_map` | 61.6M | Citation graph edges |
| `cl_parentheticals` | 6.3M | Court-written case summaries — RAG chunks |

**Delete 27 collections:** dockets, courts, people, FJC, financial disclosures, all sub-tables.

---

## Execution Order

1. **Create Cloud SQL instance** `case-law-db` (done — provisioning)
2. **Set postgres password** + create `case_law` database
3. **Run `scripts/case-law-schema.sql`** to create all tables
4. **Spin up GCE instance** in `us-central1` (same VPC, can reach Cloud SQL private IP)
5. **Load relational tables** from `gs://agchain-case-law/csv/` (small files first)
6. **Load JSONB tables** — stream CSV → convert row to JSON → insert
7. **Stream `opinions.csv.bz2`** → decompress → row to JSON → insert into `case_law.opinions`
8. **Delete 27 ArangoDB collections** to stay under free tier

## Access Pattern

- **AI retrieval:** Cloud SQL for opinion text (semantic search via pgvector later) + ArangoDB for citation graph traversal
- **Structured queries:** Cloud SQL relational tables (courts, judges, positions)
- **Legal research:** JOIN `opinions.data` with relational tables via court_id, person_id extracted from JSONB
- **Citation analysis:** ArangoDB AQL graph queries across cl_citations + cl_citation_map

## Cost

- Cloud SQL Enterprise: ~$50-80/mo for 2 vCPU + 8 GB + 400 GB SSD (covered by GCP credits)
- ArangoDB Cloud: free tier (≤100 GB)
- GCE loader instance: temporary, ~$2-5 total
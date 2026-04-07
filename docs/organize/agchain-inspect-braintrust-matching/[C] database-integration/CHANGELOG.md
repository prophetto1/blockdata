# Changelog — Database Integration

All notable changes to database-first architecture and FDQ materialization.

---

## 2026-01-29

### Added
- **architecture-decisions.md** — Created living document for platform architecture decisions
  - D1: KA-SC ground truth SQL (from 2026-01-23)
  - D2: FDQ v2.0 structure (from 2026-01-27)
  - D3: Message assembly windows (from 2026-01-27)
  - D4: Separate per-FDQ tables for ground truth and eligibility
  - D5: FDQ markdown docs authoritative for prompts
  - D6: Develop against DuckDB, seal for release

- **fdq-materialization-conventions.md** — Created conventions document
  - Table naming patterns: `fdqNN_eligibility`, `fdqNN_ground_truth`
  - Primary key convention: `anchor_usCite`
  - Determinism requirements
  - Complete FDQ01 KA-SC reference implementation (eligibility + ground truth SQL)
  - Edge-case finder queries

- **[C] database-integration/** folder — Created to consolidate database integration docs

### Changed
- **AGENTS.md** — Updated to point AIs to architecture-decisions.md as first read

### Memory Updates
- Added entities to `memory-0129.jsonl`:
  - `l10:doc:architecture_decisions`
  - `l10:doc:fdq_materialization_conventions`
  - `l10:decision:database_first_architecture`
  - `l10:folder:database_integration`
- Added relations documenting folder structure and cross-references

---

## Format

```
## YYYY-MM-DD

### Added
- New files, features, decisions

### Changed
- Modifications to existing files

### Removed
- Deleted files or deprecated decisions

### Memory Updates
- Entities/relations added to memory-MMDD.jsonl
```
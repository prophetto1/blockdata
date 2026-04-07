# Memory File Sync Assessment

**Date**: 2026-01-31
**Files compared**:
- `cc-memory.jsonl` (Claude Code) - 124 lines, 81,830 bytes
- `cd-memory.jsonl` (Claude Desktop) - 133 lines, 81,437 bytes
- `codex-memory.jsonl` (Codex) - 134 lines (MOST COMPLETE)

---

## 1. WHY THEY ARE DIFFERENT

**Line count**: CC = 124 lines, CD = 133 lines (9 line difference)

**Three reasons**:

| Issue | Explanation |
|-------|-------------|
| **JSON formatting** | CC: no spaces (`"type":"entity"`) vs CD: has spaces (`"type": "entity"`) — cosmetic, 393 bytes difference |
| **Missing entities in CC** | CC is missing 9 `l10-*` entities that CD has (lines 100-108 in CD) |
| **Different entity ordering** | CC has FDQ v2 entities at lines 100-109, CD has l10-* entities at lines 100-108 then FDQ v2 entities at lines 109-118 |

**Missing from CC** (that CD has):
- `l10-registry-system`
- `l10-decision-memory-schema-v2`
- `l10-doc-architecture-decisions`
- `l10-doc-fdq-materialization-conventions`
- `l10-decision-database-first-architecture`
- `l10-migration-repo-relocation`
- `l10-file-gitignore-v2`
- `l10-decision-website-admin-location`
- `l10-analysis-hub-migration-proposals`

**Missing from CC AND CD** (that Codex has):
- `legal10-website-admin-pocketbase-status`

**Summary of completeness**:
| File | Lines | Missing entities |
|------|-------|------------------|
| Codex | 134 | None (canonical) |
| CD | 133 | `legal10-website-admin-pocketbase-status` |
| CC | 124 | 9 l10-* entities + `legal10-website-admin-pocketbase-status` |

---

## 2. LINES NOT YET UPDATED TO V2 METADATA FORMAT

**Answer: ALL 124-133 lines** — every single entity uses the legacy flat format.

**Current format** (all lines):
```json
{"type":"entity","name":"...","entityType":"...","observations":[...]}
```

**Required v2 format** (zero lines use this):
```json
{"type":"entity","schema_version":2,"eid":"l10:...","name":"...","kind":"...","title":"...","summary":"...","tags":[...],"scope":"legal10","status":"active","confidence":1.0,"created_at":"...","updated_at":"...","provenance":{...},"external_refs":[...],"observations":[...]}
```

Reference examples exist at:
- `hub/pockbase-hub/memory/backups/memory-0129.jsonl`
- `hub/pockbase-hub/memory/backups/memory-0130.jsonl`

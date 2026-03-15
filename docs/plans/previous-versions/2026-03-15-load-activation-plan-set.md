# Load Activation Plan Set

> **Context document:** `docs/pipeline/2026-03-15-kestra-absorption-context-update.md`
> **Assessment:** The three plans below form a coherent execution sequence. Execute in order.

---

## Plan 1: Registry Identity + Load Categorization (Foundation)

**File:** `docs/plans/2026-03-15-service-registry-identity-and-load-categorization.md`

**Purpose:** Make the unified service registry stable and categorized. No features ship — this is pure infrastructure cleanup.

**What it does:**
- Phase 1: Fix the `registry_*` → `service_*` naming drift across 16 files (tests first, then refactor)
- Phase 2: Add `primary_stage` on services and `bd_stage` on functions for dual-level pipeline categorization; backfill from existing data
- Phase 3: Surface the new categories in the marketplace and settings UI

**Prerequisite for:** Plans 2 and 3.

**Estimated tasks:** 5 tasks across 3 phases.

---

## Plan 2: First Load Activation Through Registry (Proof Point)

**File:** `docs/plans/2026-03-15-first-load-activation-through-registry.md`

**Purpose:** Make GCS → ArangoDB load executable end-to-end through the registry model. This is the architectural proof point.

**What it does:**
- Phase 1: Extend `user_provider_connections` for GCS and Arango credentials; add connection testing
- Phase 2: Add `service_run_items` for subordinate item tracking; add `POST /load-runs` orchestration route in platform-api
- Phase 3: Build GCS source plugin (list + download) and ArangoDB destination plugin (batch insert) as Python BasePlugin handlers
- Phase 4: Build minimal Load page UI — source picker → destination picker → configure → run → progress

**Prerequisite:** Plan 1 must be complete.

**Estimated tasks:** 8 tasks across 4 phases.

---

## Plan 3: Implementation Reference (Mine Later)

**File:** `docs/plans/2026-03-15-service-registry-identity-and-load-activation.md`

**Purpose:** Supplementary implementation details and later-phase ideas. Not executed directly — mined for:

- Complete GCS auth helper code (JWT signing, token exchange for storage scope)
- CSV-to-JSON conversion logic
- ArangoDB batch insert with error handling and batching
- MongoDB as a reference integration for proving Kestra plugin translation
- `connection.py` shared credential resolver for Python plugins
- Run tracking opt-in pattern (`track_run: true` in PluginRequest)
- Source-to-destination handoff contract (storage artifact references vs inline payloads)

**Status:** Reference material. Ideas here feed into Plan 2 execution but the plan itself is not executed as-is.

---

## Execution Order

```
Plan 1 (Foundation)
  Task 1.1: Regression tests for canonical table names
  Task 1.2: Refactor code to canonical table names
  Task 2.1: Add BD stage metadata to schema
  Task 2.2: Strengthen import categorization
  Task 3.1: Expose stages in shared types
  Task 3.2: Update marketplace/settings UI
    ↓
Plan 2 (Proof Point)
  Task 1.1: Extend provider connections (GCS + Arango)
  Task 1.2: Add connection testing
  Task 2.1: Add service_run_items table
  Task 2.2: Add load-runs orchestration route
  Task 3.1: GCS source plugin
  Task 3.2: ArangoDB destination plugin
  Task 3.3: Register functions in registry
  Task 4.1: Load page UI
    ↓
Done: GCS CSV → ArangoDB working through the registry model
    ↓
Future (mine Plan 3):
  - MongoDB reference integration
  - Broader catalog activation
  - Arango → Platform import
  - Pre-parse normalization
```

## Architectural Guardrails (from context doc)

These apply to ALL plans:

1. Canonical schema identity stays `service_registry` / `service_functions` / `service_type_catalog`
2. Categorize at two levels: service-level for discovery, function-level for execution
3. Separate four identities: catalog capability, user connection, executor health, execution history
4. Load execution lives inside the registry/runtime — no parallel connector subsystem
5. GCS → Arango is the proof point (matches business need + architectural validation)
6. Arango is BD-native but registered through the same service/function contract
7. FastAPI plugins for heavy data movement; Edge Functions for auth/CRUD/credentials
8. No top-level "connector jobs" — item tracking subordinate to `service_runs`
9. Kestra identifiers preserved as metadata; BD-native names are canonical runtime identity
10. Source-to-destination handoff via artifact references, not raw payloads

## Stale Plans to Archive

These plans are superseded by this plan set and should be moved to `docs/plans/done/` or deleted:

- `docs/plans/2026-03-15-connector-foundation-gcs-arango-load.md` — superseded by Plan 2; mechanics reusable as reference only

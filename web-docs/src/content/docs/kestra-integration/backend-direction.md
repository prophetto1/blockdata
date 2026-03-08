---
title: backend-direction
description: "Kestra uses a single architectural trick everywhere: store the full object as JSONB in a `value` column, then project queryable fields as `GENERATED ALWAYS AS` stored columns. Every table follows this shape:"
---

## The Core Design Pattern: JSONB + Generated Columns

Kestra uses a single architectural trick everywhere: store the full object as JSONB in a `value` column, then project queryable fields as `GENERATED ALWAYS AS` stored columns. Every table follows this shape:

```sql
key     VARCHAR(250) PRIMARY KEY,   -- opaque key
value   JSONB NOT NULL,             -- the full object (source of truth)
id      VARCHAR GENERATED ALWAYS AS (value ->> 'id') STORED,
-- ... more generated columns for filtering/indexing
```

This gives them:

- **Schema flexibility** — new fields land in JSONB without migrations
- **SQL queryability** — generated columns support btree/GIN indexes and WHERE clauses
- **Full-text search** — tsvector generated columns with custom `fulltext_index()` function
- **Zero application-side mapping** — Postgres does the projection

## Tables That Map Directly

How Kestra's tables map to what we need for the flow detail tabs and execution runtime:

| Kestra Table | Our Equivalent | Status | Tab It Powers |
|---|---|---|---|
| flows | flow_sources (migration 049) | Exists but much simpler | Overview, Edit |
| executions | service_runs (migration 050) | Partial overlap | Executions tab |
| logs | Nothing yet | Missing | Logs tab |
| metrics | Nothing yet | Missing | Metrics tab |
| triggers | Nothing yet | Missing | Triggers tab |
| flow_topologies | Nothing yet | Missing | Dependencies tab |
| concurrency_limit | Nothing yet | Missing | Concurrency tab |
| templates | integration_catalog_items? | Different purpose | Blueprints |
| execution_queued | Nothing yet | Missing | Execution queue display |
| queues | Nothing yet | Missing | Internal orchestration |
| kv_metadata | Nothing yet | Missing | KV store feature |
| dashboards | Nothing yet | Missing | Dashboard builder |

## Gap Analysis: Our flow_sources vs Kestra's flows

**Kestra's flows:**

```sql
key, value (JSONB), deleted, id, namespace, revision, fulltext, source_code, tenant_id, updated
```

- Supports soft delete
- Has full-text search on namespace + id
- Separate `source_code` TEXT column (not inside JSONB — for GIN text search on source)
- Revision is an integer extracted from the JSONB value
- Labels indexed via `GIN ((value -> 'labels'))`

**Our flow_sources:**

```sql
project_id (PK, FK→projects), source TEXT, revision INTEGER, created_at, updated_at
```

- One flow per project (PK is `project_id` — no `flow_id` or namespace)
- No soft delete
- No full-text search
- No labels
- No JSONB value column (source is raw YAML text only)

**What's missing:** Our table can only store a single flow per project. Kestra supports many flows per namespace. If a project should contain multiple flows, `flow_sources` needs a `flow_id` column and a composite key.

## Tables Needed for the Frontend Tabs

Based on the tab stubs already in `web/src/components/flows/tabs/`, here's what Kestra's schema tells us about the backend each tab needs:

### 1. Executions tab (ExecutionsTab.tsx)

Kestra's `executions` table has:

- `state_current` — enum: CREATED, RUNNING, PAUSED, SUCCESS, WARNING, FAILED, KILLED, CANCELLED, QUEUED, RETRYING, etc. (17 states)
- `state_duration` — milliseconds, extracted from JSONB
- `start_date` / `end_date` — extracted timestamps
- `trigger_execution_id` — links to the trigger that caused it
- `kind` — execution kind discriminator
- Labels GIN index for filtering

Our `service_runs` has `status`, `started_at`, `completed_at`, `duration_ms`, `error`, `result` — similar shape, but not scoped to a flow. We need a `flow_id` or `namespace + flow_id` on `service_runs` (or a dedicated `flow_executions` table) to power this tab.

### 2. Logs tab (LogsTab.tsx)

Kestra's `logs` has a rich structure:

- Scoped: `namespace`, `flow_id`, `execution_id`, `task_id`, `taskrun_id`
- `level` — enum (ERROR, WARN, INFO, DEBUG, TRACE)
- `attempt_number` — for retries
- `trigger_id` — for trigger-generated logs
- Full-text search across all ID fields + message + thread
- 6 indexes focused on `execution_id` lookups and timestamp ranges

We have nothing for this yet. Need a `flow_logs` or `execution_logs` table.

### 3. Metrics tab (MetricsTab.tsx)

Kestra's `metrics`:

- `metric_name`, `metric_value` (double precision), `timestamp`
- Scoped to `execution_id`, `task_id`, `taskrun_id`
- Indexed by `flow_id + timestamp` for time-series queries

We have nothing for this either.

### 4. Triggers tab (TriggersTab.tsx)

Kestra's `triggers`:

- `trigger_id`, `flow_id`, `namespace`
- `next_execution_date` — when the trigger fires next
- `execution_id` — last execution spawned
- `worker_id` — which worker owns the trigger
- `disabled` boolean

We have nothing for this.

### 5. Dependencies tab (DependenciesTab.tsx)

Kestra's `flow_topologies`:

- Source (`namespace + id`) → Destination (`namespace + id`) with relation type
- Enables rendering flow dependency graphs
- Bidirectional index for both upstream and downstream queries

### 6. Concurrency tab (ConcurrencyTab.tsx)

Kestra's `concurrency_limit`:

- Per-flow concurrency caps
- `running` counter extracted from JSONB

## What We're Taking

The JSONB + generated columns pattern is worth adopting **selectively**. Not as a wholesale replacement for our normalized schema, but for tables where:

- The object shape changes frequently (executions, logs)
- We need schema-flexible storage with SQL queryability
- We want to store Kestra-compatible objects that can round-trip

**Tables to create:**

1. **flow_executions** — modeled after Kestra's `executions` but scoped with `owner_id` and RLS. Distinct from `service_runs` because it tracks the flow-level execution lifecycle, not individual function calls.

2. **flow_execution_logs** — modeled after Kestra's `logs`. Scoped to `execution_id + task_id`. The `log_level` enum and timestamp indexing are directly liftable.

3. **flow_triggers** — modeled after Kestra's `triggers`. Stores trigger definitions with `next_execution_date` and `disabled` state.

4. **flow_topologies** — lift nearly verbatim. Source/destination flow pairs with relation type.

5. **Expand flow_sources** — add `flow_id`, make PK composite `(project_id, flow_id)`, add soft delete, add namespace, add labels JSONB.

**What we don't need to copy:**

- **queues** — Kestra's internal message bus. We use Supabase Realtime and our own job queue.
- **executorstate / executordelayed / worker_job_running** — Kestra's worker coordination internals. Our pipeline-worker has its own dispatch.
- **sla_monitor** — enterprise feature, not in scope.
- **multipleconditions** — complex trigger composition, premature.
- **dashboards** — separate feature entirely.

## The Key Insight

Kestra's Postgres schema is essentially a materialized projection of its internal Java object model. The JSONB `value` column IS the object; the generated columns exist purely for SQL filtering and indexing. When Kestra's UI queries "executions for flow X sorted by start_date with state = FAILED", it's doing:

```sql
SELECT value FROM executions
WHERE deleted = false AND flow_id = ? AND state_current = 'FAILED'
ORDER BY start_date DESC
```

And the entire execution object (with all task runs, state history, inputs, outputs) comes back in `value`. The application code deserializes it client-side.

We adopt the same pattern for `flow_executions` and `flow_execution_logs` — store the full object in JSONB, project the queryable fields as generated columns, and let the frontend deserialize the `value` for full detail rendering. This makes our execution/log tables both Kestra-compatible AND queryable.

---

## Strategic Direction: Postgres + JSONB First, Then ArangoDB

Kestra solved the exact same two-store problem we're designing. Their approach:

**Postgres is the write store.** Every object goes into a `value` JSONB column as the full document. Generated columns project queryable fields for SQL indexes. The application writes one column (`value`) and gets relational queryability for free.

This is identical to what we need for Postgres-first → Arango-later. The JSONB `value` column IS the document that eventually gets projected to ArangoDB. When we're ready to sync to Arango, we have a clean, self-contained JSON document per row — no JOINs needed to reconstruct the object.

### The Data Flow

```
Write path:  App → Supabase (key + value JSONB + source_code)
                  ↓ generated columns give you SQL indexes
                  ↓ RLS via owner_id generated column
Read path:   Frontend → Supabase REST → gets full JSONB object
Sync path:   CDC/trigger → ArangoDB (value JSONB → Arango document, verbatim)
```

## What to Adopt from Kestra — Prioritized

### Tier 1 — Need now (tabs already have stubs)

| Kestra table | Our version | Adaptation |
|---|---|---|
| flows | Replace flow_sources | Add `value` JSONB, generated `flow_id`, `namespace`, `revision`, `deleted`. Keep `owner_id` + RLS (Kestra uses `tenant_id`). Keep `source_code` TEXT separate (they do this too — for full-text search on YAML). |
| executions | New flow_executions | Lift the `state_type` enum (CREATED→RUNNING→SUCCESS/FAILED/KILLED etc). Generated columns for `state_current`, `state_duration`, `start_date`, `end_date`, `flow_id`. Add `owner_id`. |
| logs | New flow_execution_logs | Lift the `log_level` enum. Generated columns for `execution_id`, `task_id`, `level`, `timestamp`. High-volume table — `key(30)` is short for a reason. |
| triggers | New flow_triggers | Generated columns for `flow_id`, `trigger_id`, `next_execution_date`, `disabled`. |

### Tier 2 — Need soon

| Kestra table | Our version | Notes |
|---|---|---|
| flow_topologies | flow_topologies | Lift nearly verbatim. Source→destination with relation type. Powers the Dependencies tab. |
| metrics | flow_execution_metrics | Per-task numeric metrics with timestamps. Powers the Metrics tab. |
| concurrency_limit | flow_concurrency_limits | Simple per-flow cap. Powers Concurrency tab. |

### Tier 3 — Don't need yet

| Kestra table | Skip because |
|---|---|
| queues | Internal message bus — we have Supabase Realtime + our own dispatch |
| executorstate / executordelayed | Kestra's internal scheduler state |
| worker_job_running | Kestra's worker coordination — our pipeline-worker handles this |
| sla_monitor | Enterprise feature |
| multipleconditions | Complex trigger composition |
| dashboards | Separate feature track |

## Key Adaptation: tenant_id → owner_id

Kestra uses `tenant_id` for multi-tenancy. We use `owner_id` + RLS. Every table needs:

```sql
owner_id UUID GENERATED ALWAYS AS ((value ->> 'ownerId')::uuid) STORED,
```

Then RLS policies check `owner_id = auth.uid()`, same pattern as our existing tables.

## Key Adaptation: Kestra's key → Our Primary Key

Kestra uses an opaque `key VARCHAR(250)` as PK everywhere. Looking at the pattern:

- **Flows:** key is likely `tenant_id:namespace:id:revision`
- **Executions:** key is the execution UUID
- **Logs:** key is a short (30 char) generated ID

We can keep this pattern or use UUIDs. The important thing is that `key` is the storage identity while `id` (inside JSONB) is the logical identity.

## The Arango Projection Becomes Trivial

Once our tables follow this pattern, syncing to Arango is:

```sql
-- CDC trigger or pg_notify listener
SELECT key AS _key, value AS doc FROM flow_executions WHERE updated_at > $last_sync;
```

The `value` JSONB goes directly into an Arango collection as a document. No transformation needed. The generated columns exist only for Postgres-side queries — Arango doesn't need them because it has its own indexing.

This means we're not choosing between Postgres and Arango. We write to Postgres (with SQL queryability via generated columns), and Arango becomes an eventually-consistent read replica of the same JSON documents — optimized for graph traversals and document-centric queries that Postgres is slower at.

## Utility Functions to Lift

Kestra's helper functions worth bringing over:

```sql
fulltext_index(text) → tsvector     -- tokenize for search
fulltext_search(text) → tsquery     -- prefix-match query builder
parse_iso8601_datetime(text) → timestamptz
parse_iso8601_duration(text) → interval
state_fromtext(text) → state_type   -- safe enum cast
log_level_fromtext(text) → log_level
```

These make the generated columns work cleanly and are reusable across all our JSONB tables.

## Bottom Line

We're not borrowing Kestra's features — we're adopting their storage pattern, which happens to be exactly the right bridge between Supabase (Postgres-first, RLS, real-time) and ArangoDB (document/graph read store). The JSONB `value` column is the portable document. Generated columns are the Postgres-local query surface. Arango gets the raw document later. **One write, two query surfaces.**

---
title: kestra-schema-analysis
description: Complete analysis of Kestra's Postgres schema extracted from the live Docker instance, and how to adopt the JSONB + generated columns pattern for Blockdata.
---

## Source

Schema extracted from the Kestra Postgres instance running at `kestra-postgres-1:5432` (database `kestra`, user `kestra`). Dump files stored at `kestra-sqls/` in the main repo.

## The Core Pattern

Every Kestra table follows the same shape:

```sql
CREATE TABLE public.flows (
    key         VARCHAR(250) PRIMARY KEY,       -- opaque storage key
    value       JSONB NOT NULL,                 -- the full object (source of truth)
    -- generated columns project queryable fields from JSONB:
    deleted     BOOLEAN  GENERATED ALWAYS AS ((value ->> 'deleted')::boolean) STORED,
    id          VARCHAR  GENERATED ALWAYS AS (value ->> 'id') STORED,
    namespace   VARCHAR  GENERATED ALWAYS AS (value ->> 'namespace') STORED,
    revision    INTEGER  GENERATED ALWAYS AS ((value ->> 'revision')::integer) STORED,
    fulltext    TSVECTOR GENERATED ALWAYS AS (...) STORED,
    source_code TEXT NOT NULL  -- separate column for full-text GIN search on YAML
);
```

**What this gives:**

- **Schema flexibility.** New fields land in JSONB without migrations.
- **SQL queryability.** Generated columns support btree and GIN indexes.
- **Full-text search.** `tsvector` generated columns with custom tokenizer functions.
- **Zero mapping.** Application writes one column (`value`), Postgres does the projection.
- **Arango-ready.** The `value` JSONB column IS the document that syncs to ArangoDB verbatim.

## Custom Types

### `state_type` enum (17 states)

```sql
CREATE TYPE public.state_type AS ENUM (
    'CREATED', 'RUNNING', 'PAUSED', 'RESTARTED', 'KILLING',
    'SUCCESS', 'WARNING', 'FAILED', 'KILLED', 'CANCELLED',
    'QUEUED', 'RETRYING', 'RETRIED', 'SKIPPED', 'BREAKPOINT',
    'SUBMITTED', 'RESUBMITTED'
);
```

Used by: `executions.state_current`

### `log_level` enum

```sql
CREATE TYPE public.log_level AS ENUM (
    'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'
);
```

Used by: `logs.level`

### `queue_type` enum

```sql
CREATE TYPE public.queue_type AS ENUM (
    'io.kestra.core.models.executions.Execution',
    'io.kestra.core.models.flows.FlowInterface',
    -- ... 17 Java class-based types
);
```

Used by: `queues.type`. This is Kestra-internal; we do not adopt it.

## Utility Functions

```sql
-- Tokenize text for tsvector columns
fulltext_index(text) RETURNS tsvector

-- Build prefix-match search query
fulltext_search(text) RETURNS tsquery

-- Parse ISO 8601 strings from JSONB
parse_iso8601_datetime(text) RETURNS timestamptz
parse_iso8601_duration(text) RETURNS interval
parse_iso8601_timestamp(text) RETURNS integer  -- epoch seconds

-- Safe enum casts
state_fromtext(text) RETURNS state_type
loglevel_fromtext(text) RETURNS log_level

-- Auto-update trigger
update_updated_datetime() RETURNS trigger
```

All of these should be created in a Supabase migration before any table that uses them.

## Table-by-Table Analysis

### flows

```
key         VARCHAR(250) PK
value       JSONB NOT NULL
deleted     BOOLEAN      (generated)
id          VARCHAR(100) (generated)
namespace   VARCHAR(150) (generated)
revision    INTEGER      (generated)
fulltext    TSVECTOR     (generated from namespace + id)
source_code TEXT NOT NULL (separate, for GIN search on YAML source)
tenant_id   VARCHAR(250) (generated)
updated     VARCHAR(250) (generated)
```

**Indexes:** PK on key, GIN on fulltext, GIN on labels (`value -> 'labels'`), btree on (deleted, tenant_id, namespace), btree on (deleted, tenant_id, namespace, id, revision), GIN on source_code fulltext.

**Our adaptation:** Replace `tenant_id` with `owner_id UUID`. Add RLS. Add FK to `user_projects`. Support multiple flows per project via composite key `(project_id, flow_id)` or by using the opaque `key` pattern.

### executions

```
key                  VARCHAR(250) PK
value                JSONB NOT NULL
deleted              BOOLEAN              (generated)
namespace            VARCHAR(150)         (generated)
flow_id              VARCHAR(150)         (generated from value ->> 'flowId')
state_current        state_type           (generated from value #>> '{state,current}')
state_duration       BIGINT               (generated, milliseconds from ISO duration)
start_date           TIMESTAMP            (generated from value #>> '{state,startDate}')
end_date             TIMESTAMP            (generated from value #>> '{state,endDate}')
fulltext             TSVECTOR             (generated from namespace + flowId + id)
id                   VARCHAR(150)         (generated)
tenant_id            VARCHAR(250)         (generated)
trigger_execution_id VARCHAR(150)         (generated from value #>> '{trigger,variables,executionId}')
kind                 VARCHAR(32)          (generated)
```

**Indexes:** 10 indexes covering PK, fulltext, labels GIN, btree on namespace/flow_id/state_current/start_date/end_date/state_duration/trigger_execution_id. All prefixed with `(deleted, tenant_id, ...)`.

**Our adaptation:** Same JSONB pattern. Replace `tenant_id` with `owner_id`. Add `project_id` generated column (from JSONB). The `state_type` enum is directly adoptable, though we may start with a subset.

### logs

```
key              VARCHAR(30) PK  -- short key, high-volume table
value            JSONB NOT NULL
namespace        VARCHAR(150)    (generated)
flow_id          VARCHAR(150)    (generated)
task_id          VARCHAR(150)    (generated)
execution_id     VARCHAR(150)    (generated)
taskrun_id       VARCHAR(150)    (generated)
attempt_number   INTEGER         (generated)
trigger_id       VARCHAR(150)    (generated)
level            log_level       (generated)
timestamp        TIMESTAMPTZ     (generated)
tenant_id        VARCHAR(250)    (generated)
fulltext         TSVECTOR        (generated from 8 fields)
execution_kind   VARCHAR(32)     (generated)
```

**Indexes:** 6 indexes on execution_id, execution_id+task_id, execution_id+taskrun_id, tenant_id+namespace+timestamp+level, tenant_id+timestamp+level, timestamp.

**Note:** Key is only VARCHAR(30), not 250. This is intentional for a high-volume table. Logs are write-heavy; shorter keys = smaller indexes.

### triggers

```
key                 VARCHAR(250) PK
value               JSONB NOT NULL
namespace           VARCHAR(150)    (generated)
flow_id             VARCHAR(150)    (generated)
trigger_id          VARCHAR(150)    (generated)
execution_id        VARCHAR(150)    (generated, last execution spawned)
fulltext            TSVECTOR        (generated)
tenant_id           VARCHAR(250)    (generated)
next_execution_date TIMESTAMPTZ     (generated)
worker_id           VARCHAR(250)    (generated)
disabled            BOOLEAN         (generated)
```

**Indexes:** PK, fulltext GIN, btree on tenant_id, execution_id, next_execution_date.

### metrics

```
key              VARCHAR(30) PK  -- short key like logs
value            JSONB NOT NULL
namespace        VARCHAR(150)    (generated)
flow_id          VARCHAR(150)    (generated)
task_id          VARCHAR(150)    (generated)
execution_id     VARCHAR(150)    (generated)
taskrun_id       VARCHAR(150)    (generated)
metric_name      VARCHAR(150)    (generated from value ->> 'name')
timestamp        TIMESTAMPTZ     (generated)
metric_value     DOUBLE PRECISION (generated)
tenant_id        VARCHAR(250)    (generated)
execution_kind   VARCHAR(32)     (generated)
```

**Indexes:** btree on execution_id, tenant_id+namespace+flow_id, tenant_id+timestamp.

### flow_topologies

```
key                    VARCHAR(250) PK
value                  JSONB NOT NULL
source_namespace       VARCHAR(150) (generated from value #>> '{source,namespace}')
source_id              VARCHAR(150) (generated from value #>> '{source,id}')
relation               VARCHAR(100) (generated)
destination_namespace  VARCHAR(150) (generated from value #>> '{destination,namespace}')
destination_id         VARCHAR(150) (generated from value #>> '{destination,id}')
source_tenant_id       VARCHAR(250) (generated)
destination_tenant_id  VARCHAR(250) (generated)
```

**Indexes:** btree on destination lookup, btree on destination+source bidirectional.

### concurrency_limit

```
key        VARCHAR(250) PK
value      JSONB NOT NULL
tenant_id  VARCHAR(250) (generated)
namespace  VARCHAR(150) (generated)
flow_id    VARCHAR(150) (generated)
running    INTEGER      (generated)
```

### Tables We Skip

| Table | Why |
|---|---|
| `queues` | Internal message bus. We use Supabase Realtime + pipeline-worker dispatch. |
| `executorstate` | Kestra scheduler state. Our pipeline-worker tracks its own state. |
| `executordelayed` | Deferred execution queue. Not needed with our dispatch model. |
| `worker_job_running` | Worker coordination. Pipeline-worker manages this internally. |
| `sla_monitor` | Enterprise SLA tracking. Out of scope. |
| `multipleconditions` | Complex multi-flow trigger composition. Premature. |
| `dashboards` | Separate feature track. |

## Adaptation Pattern: tenant_id to owner_id

Every Kestra table uses `tenant_id` for multi-tenancy. Blockdata uses Supabase Auth with RLS. The adaptation:

```sql
-- Generated column
owner_id UUID GENERATED ALWAYS AS ((value ->> 'ownerId')::uuid) STORED,

-- RLS policy
CREATE POLICY select_own ON flow_executions
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
```

## Arango Projection Path

The JSONB `value` column is the portable document. To sync to ArangoDB:

```sql
SELECT key AS _key, value AS doc
FROM flow_executions
WHERE updated_at > $last_sync;
```

The `value` goes directly into an Arango collection. Generated columns are Postgres-only query aids. Arango has its own indexing. One write to Supabase, two query surfaces.

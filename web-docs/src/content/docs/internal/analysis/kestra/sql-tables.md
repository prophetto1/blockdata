---
title: sql-tables
description: Analysis of SQL table definitions across Kestra database backends.
---

## PostgreSQL Table Schemas

### 1. queues

| offset | type | key | value | updated | consumer_indexer | consumer_executor | consumer_worker | consumer_scheduler | consumer_flow_topology | consumer_group |
|--------|------|-----|-------|---------|------------------|-------------------|-----------------|--------------------|------------------------|----------------|
| BIGINT PK | queue_type ENUM | VARCHAR(250) | JSONB | TIMESTAMPTZ | BOOLEAN | BOOLEAN | BOOLEAN | BOOLEAN | BOOLEAN | VARCHAR(250) |
| 1 | io.kestra.core.models.executions.Execution | ns1.my_flow.abc123 | `{...}` | 2026-03-07T12:00:00Z | false | true | false | false | false | default |

### 2. flows

| key | value | deleted | id | namespace | revision | fulltext | source_code | tenant_id |
|-----|-------|---------|----|-----------|----------|----------|-------------|-----------|
| VARCHAR(250) PK | JSONB | BOOL gen | VARCHAR(100) gen | VARCHAR(150) gen | INT gen | TSVECTOR gen | TEXT | VARCHAR(250) gen |
| io.kestra.prod.etl_daily.3 | `{...}` | false | etl_daily | prod | 3 | 'prod' 'etl_daily' | `id: etl_daily ...` | tenant1 |

### 3. templates

| key | value | deleted | id | namespace | fulltext | tenant_id |
|-----|-------|---------|----|-----------|----------|-----------|
| VARCHAR(250) PK | JSONB | BOOL gen | VARCHAR(100) gen | VARCHAR(150) gen | TSVECTOR gen | VARCHAR(250) gen |
| io.kestra.prod.my_template | `{...}` | false | my_template | prod | 'prod' 'my_template' | tenant1 |

### 4. executions

| key | value | deleted | namespace | flow_id | state_current | state_duration | start_date | end_date | fulltext | id | trigger_execution_id | tenant_id |
|-----|-------|---------|-----------|---------|--------------:|---------------:|-----------:|--------:|----------|-----|---------------------|-----------|
| VARCHAR(250) PK | JSONB | BOOL gen | VARCHAR(150) gen | VARCHAR(150) gen | state_type gen | BIGINT gen | TIMESTAMP gen | TIMESTAMP gen | TSVECTOR gen | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(250) gen |
| abc123 | `{...}` | false | prod | etl_daily | SUCCESS | 12500 | 2026-03-07T12:00:00Z | 2026-03-07T12:00:12Z | 'prod' 'etl_daily' | abc123 | null | tenant1 |

### 5. triggers

| key | value | namespace | flow_id | trigger_id | execution_id | fulltext | tenant_id | next_execution_date | disabled |
|-----|-------|-----------|---------|------------|--------------|----------|-----------|--------------------:|----------|
| VARCHAR(250) PK | JSONB | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | TSVECTOR gen | VARCHAR(250) gen | TIMESTAMPTZ gen | BOOL gen |
| prod.etl_daily.schedule1 | `{...}` | prod | etl_daily | schedule1 | abc123 | 'prod' 'etl_daily' | tenant1 | 2026-03-08T00:00:00Z | false |

### 6. logs

| key | value | namespace | flow_id | task_id | execution_id | taskrun_id | attempt_number | trigger_id | level | timestamp | fulltext | tenant_id |
|-----|-------|-----------|---------|---------|--------------|------------|---------------:|------------|-------|----------:|----------|-----------|
| VARCHAR(30) PK | JSONB | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | INT gen | VARCHAR(150) gen | log_level gen | TIMESTAMPTZ gen | TSVECTOR gen | VARCHAR(250) gen |
| log_abc_001 | `{...}` | prod | etl_daily | extract_task | abc123 | tr_001 | 1 | null | INFO | 2026-03-07T12:00:01Z | 'prod' 'etl_daily' | tenant1 |

### 7. multipleconditions

| key | value | namespace | flow_id | condition_id | start_date | end_date | tenant_id |
|-----|-------|-----------|---------|--------------|------------|----------|-----------|
| VARCHAR(250) PK | JSONB | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | TIMESTAMPTZ gen | TIMESTAMPTZ gen | VARCHAR(250) gen |
| prod.etl_daily.cond1 | `{...}` | prod | etl_daily | cond1 | 2026-03-07T00:00:00Z | 2026-03-07T23:59:59Z | tenant1 |

### 8. workertaskexecutions

| key | value |
|-----|-------|
| VARCHAR(250) PK | JSONB |
| wte_abc123 | `{...}` |

### 9. executorstate

| key | value |
|-----|-------|
| VARCHAR(250) PK | JSONB |
| state_abc123 | `{...}` |

### 10. executordelayed

| key | value | date |
|-----|-------|------|
| VARCHAR(250) PK | JSONB | TIMESTAMPTZ gen |
| delayed_abc123 | `{...}` | 2026-03-07T13:00:00Z |

### 11. settings

| key | value |
|-----|-------|
| VARCHAR(250) PK | JSONB |
| app.timezone | `{"value": "UTC"}` |

### 12. flow_topologies

| key | value | source_namespace | source_id | relation | destination_namespace | destination_id | source_tenant_id | destination_tenant_id |
|-----|-------|------------------|-----------|----------|-----------------------|----------------|------------------|-----------------------|
| VARCHAR(250) PK | JSONB | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(100) gen | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(250) gen | VARCHAR(250) gen |
| prod.etl_daily→prod.report | `{...}` | prod | etl_daily | FLOW_TASK | prod | report | tenant1 | tenant1 |

### 13. metrics

| key | value | namespace | flow_id | task_id | execution_id | taskrun_id | metric_name | timestamp | metric_value | tenant_id |
|-----|-------|-----------|---------|---------|--------------|------------|-------------|----------:|-------------:|-----------|
| VARCHAR(30) PK | JSONB | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | VARCHAR(150) gen | TIMESTAMPTZ gen | FLOAT gen | VARCHAR(250) gen |
| met_abc_001 | `{...}` | prod | etl_daily | extract_task | abc123 | tr_001 | duration | 2026-03-07T12:00:05Z | 5230.0 | tenant1 |

### 14. worker_instance

| key | value | worker_uuid | hostname | port | management_port | worker_group | status | heartbeat_date |
|-----|-------|-------------|----------|-----:|----------------:|--------------|--------|---------------:|
| VARCHAR(250) PK | JSONB | VARCHAR(36) gen | VARCHAR(150) gen | INTEGER gen | INTEGER gen | VARCHAR(150) gen | VARCHAR(10) gen | TIMESTAMPTZ gen |
| worker_01 | `{...}` | 550e8400-e29b-41d4-a716-446655440000 | kestra-worker-1 | 8080 | 8081 | default | UP | 2026-03-07T12:00:00Z |

### 15. worker_job_running

| key | value | worker_uuid |
|-----|-------|-------------|
| VARCHAR(250) PK | JSONB | VARCHAR(36) gen |
| job_abc123 | `{...}` | 550e8400-e29b-41d4-a716-446655440000 |

### 16. execution_queued

| key | value | tenant_id | namespace | flow_id | date |
|-----|-------|-----------|-----------|---------|-----:|
| VARCHAR(250) PK | JSONB | VARCHAR(250) gen | VARCHAR(150) gen | VARCHAR(150) gen | TIMESTAMPTZ gen |
| eq_abc124 | `{...}` | tenant1 | prod | etl_daily | 2026-03-07T12:05:00Z |

### 17. service_instance

| key | value | service_id | service_type | state | created_at | updated_at |
|-----|-------|------------|--------------|-------|------------|------------|
| VARCHAR(250) PK | JSONB | VARCHAR(36) gen | VARCHAR(36) gen | VARCHAR(36) gen | TIMESTAMPTZ gen | TIMESTAMPTZ gen |
| svc_001 | `{...}` | 660e8400-e29b-41d4-a716-446655440000 | WORKER | RUNNING | 2026-03-07T08:00:00Z | 2026-03-07T12:00:00Z |

### 18. sla_monitor

| key | value | execution_id | sla_id | deadline |
|-----|-------|--------------|--------|----------|
| VARCHAR(250) PK | JSONB | VARCHAR(150) gen | VARCHAR(150) gen | TIMESTAMPTZ gen |
| sla_abc123_1 | `{...}` | abc123 | max_duration | 2026-03-07T13:00:00Z |

### 19. dashboards

| key | value | tenant_id | deleted | id | title | description | fulltext | source_code | created | updated |
|-----|-------|-----------|---------|-----|-------|-------------|----------|-------------|---------|---------|
| VARCHAR(250) PK | JSONB | VARCHAR(250) gen | BOOL gen | VARCHAR(100) gen | VARCHAR(250) gen | TEXT gen | TSVECTOR gen | TEXT | TIMESTAMPTZ | TIMESTAMPTZ |
| dash_001 | `{...}` | tenant1 | false | dash_001 | Execution Overview | Monitors all executions | 'execution' 'overview' | `charts: ...` | 2026-03-01T00:00:00Z | 2026-03-07T12:00:00Z |

### 20. concurrency_limit

| key | value | tenant_id | namespace | flow_id | running |
|-----|-------|-----------|-----------|---------|--------:|
| VARCHAR(250) PK | JSONB | VARCHAR(250) gen | VARCHAR(150) gen | VARCHAR(150) gen | INT gen |
| prod.etl_daily | `{...}` | tenant1 | prod | etl_daily | 3 |

### 21. kv_metadata

| key | value | tenant_id | namespace | name | description | version | last | expiration_date | updated | deleted | fulltext | created |
|-----|-------|-----------|-----------|------|-------------|--------:|------|----------------:|---------|---------|----------|---------|
| VARCHAR(768) PK | JSONB | VARCHAR(250) gen | VARCHAR(150) gen | VARCHAR(350) gen | TEXT gen | INT gen | BOOL gen | TIMESTAMPTZ gen | TIMESTAMPTZ | BOOL gen | TSVECTOR gen | TIMESTAMPTZ gen |
| prod.api_key.2 | `{...}` | tenant1 | prod | api_key | API key for external service | 2 | true | 2026-12-31T23:59:59Z | 2026-03-07T12:00:00Z | false | 'api_key' | 2026-01-15T08:00:00Z |

### 22. namespace_file_metadata

| key | value | tenant_id | namespace | path | parent_path | version | last | size | created | updated | deleted | fulltext |
|-----|-------|-----------|-----------|------|-------------|--------:|------|-----:|---------|---------|---------|----------|
| VARCHAR(768) PK | JSONB | VARCHAR(250) gen | VARCHAR(150) gen | VARCHAR(350) gen | VARCHAR(350) gen | INT gen | BOOL gen | BIGINT gen | TIMESTAMPTZ gen | TIMESTAMPTZ gen | BOOL gen | TSVECTOR gen |
| prod./scripts/etl.py.4 | `{...}` | tenant1 | prod | /scripts/etl.py | /scripts | 4 | true | 2048 | 2026-02-01T10:00:00Z | 2026-03-07T12:00:00Z | false | '/scripts/etl.py' |

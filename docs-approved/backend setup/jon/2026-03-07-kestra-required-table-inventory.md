---
title: Kestra Required Table Inventory
description: Source-driven inventory of net-new and upgrade-required SQL tables needed for Kestra-style flows, plugins, assets, and tests in BlockData.
---

# Kestra Required Table Inventory

## Scope

This inventory answers one question:

What SQL tables do we still need in BlockData to operate the Kestra-style flow surface properly, including runtime flows, plugins, assets, blueprints, instance health, and tests?

This is a source-driven inventory based on:

- `docs-approved/backend setup/kestra-sqls/tables.txt`
- `docs-approved/backend setup/kestra-sqls/columns.tsv`
- `docs-approved/backend setup/kestra-sqls/kestra_schema.sql`
- `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql`
- `docs-approved/backend setup/jon/kestra-schema-analysis.md`
- `docs-approved/backend setup/backend-direction.md`
- current BlockData migrations under `supabase/migrations`
- current Kestra-facing page shells under `web/src/pages/kestra`

## Bottom Line

There are three buckets:

1. **Already present, but not parity-grade**
2. **Net-new tables we still need**
3. **Kestra tables we can skip unless we decide to copy Kestra internals exactly**

The most important conclusion is this:

- We **already have plugin catalog storage**.
- We **do not yet have the full flow runtime table set**.
- We **do not yet have any real test tables**.
- We **do not yet have namespace file metadata or flow template storage**.

## Already Present, But Must Be Expanded Or Replaced

These tables exist today, but they are still thinner than the Kestra contract they are standing in for.

| Current table | Why it is not done yet | Evidence |
|---|---|---|
| `flow_sources` | Exists, but still behaves like a simplified flow source store. It needs the full Kestra-style `flows` shape or equivalent: `value JSONB`, soft delete, namespace-aware search, labels, generated query columns, and stronger revision semantics. | `supabase/migrations/20260227120000_049_flow_sources.sql`, `supabase/migrations/20260305120000_069_flow_sources_revision_history.sql`, `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql` |
| `flow_executions` | Exists, but it is still a simplified execution history table. It is missing the Kestra-style JSONB canonical object model, richer state contract, and generated query columns. | `supabase/migrations/20260305120100_070_flow_executions.sql`, `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql` |
| `flow_logs` | Exists, but it is still a shallow log stream. It is missing the Kestra-style `taskrun_id`, `attempt_number`, `trigger_id`, full-text indexing, and JSONB canonical event model. | `supabase/migrations/20260305120200_071_flow_logs.sql`, `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql` |

These three should be treated as **upgrade/replace work**, not as complete parity wins.

## Plugin Storage: No Net-New Table Required

For plugin catalog and schema inventory, the current BlockData schema is already materially ahead of "nothing" and does not need another fresh table family.

Existing plugin-related tables:

- `integration_catalog_items`
- `kestra_plugin_inputs`
- `kestra_plugin_outputs`
- `kestra_plugin_examples`
- `kestra_plugin_definitions`
- `kestra_provider_enrichment`
- `service_registry`
- `service_functions`

Why this matters:

- `integration_catalog_items` already stores Kestra task-class metadata and schema blobs.
- The `kestra_plugin_*` satellite tables already normalize plugin inputs, outputs, examples, and definitions.
- `service_registry` and `service_functions` already give us the local runtime mapping layer that Kestra itself does not need because Kestra executes its own plugins directly.

Conclusion:

- **Do not add another plugin catalog table family.**
- Plugin work is mostly about **runtime binding**, not catalog storage.

Evidence:

- `supabase/migrations/20260228150000_059_integration_catalog_items.sql`
- `supabase/migrations/20260303100000_064_kestra_plugin_catalog_tables.sql`
- `web/src/pages/kestra/PluginsPage.tsx`

## Net-New Tables Required

These are the net-new tables that are still missing today.

### A. Core Flow Runtime Tables

These are mandatory if the flow tabs and global runtime pages are going to behave like Kestra.

| Recommended table | Kestra analogue | Why we need it |
|---|---|---|
| `flow_triggers` | `triggers` | Needed for the Triggers tab, trigger enable/disable state, next execution scheduling, and trigger-level runtime ownership. |
| `flow_execution_metrics` | `metrics` | Needed for the Metrics tab, per-task numeric telemetry, charts, and post-run measurements. |
| `flow_topologies` | `flow_topologies` | Needed for Dependencies, upstream/downstream graph traversal, and stored flow relationships. |
| `flow_concurrency_limits` | `concurrency_limit` | Needed for the Concurrency tab and per-flow running-cap enforcement. |

Evidence:

- `docs-approved/backend setup/backend-direction.md`
- `docs-approved/backend setup/jon/task-inventory.md`
- `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql`

### B. Namespace, Asset, And Blueprint Tables

These are required for the non-tab Kestra surfaces we already exposed in the frontend.

| Recommended table | Kestra analogue | Why we need it |
|---|---|---|
| `namespace_file_metadata` | `namespace_file_metadata` | Needed for Assets and Namespaces pages. Kestra uses this for namespace-scoped file metadata, versioning, and file browsing. |
| `flow_templates` or strict-parity `templates` | `templates` | Needed for Blueprints. `integration_catalog_items` stores plugin/task definitions, not reusable flow blueprints. |
| `service_instance` | `service_instance` | Needed for Instance health and runtime service/worker visibility. Our current admin policy tables do not model live runtime instances or heartbeats. |

Evidence:

- `web/src/pages/kestra/AssetsPage.tsx`
- `web/src/pages/kestra/NamespacesPage.tsx`
- `web/src/pages/kestra/BlueprintsPage.tsx`
- `web/src/pages/kestra/InstancePage.tsx`
- `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql`

### C. Test Tables

Kestra's exported SQL does **not** include dedicated "tests" tables. That means the `/app/tests` surface in BlockData cannot be backed by a direct Kestra table lift. We need BlockData-native test tables.

| Recommended table | Source type | Why we need it |
|---|---|---|
| `flow_tests` | BlockData-native | Stores test definitions: target flow, namespace, scenario name, enabled flag, expected inputs, and test metadata. |
| `flow_test_runs` | BlockData-native | Stores each test execution run, status, timestamps, linked `flow_execution_id`, and summary outcome. |
| `flow_test_results` | BlockData-native | Stores assertion-level or task-level verification results so the Tests page can show which checks passed or failed. |

Why this is mandatory:

- `web/src/pages/kestra/TestsPage.tsx` is explicitly a dedicated surface, not just a filtered execution list.
- Kestra SQL does not give us a ready-made persistence model for this page.
- If we want repeatable verification of flows and plugin behavior, we need persistent test definitions plus run history.

Evidence:

- `web/src/pages/kestra/TestsPage.tsx`
- absence of any test table in `docs-approved/backend setup/kestra-sqls/tables.txt`

## Conditional But Likely Tables

These are not in the "must create first" list, but they become necessary if we want broader Kestra feature coverage instead of only the core runtime pages.

| Table | Kestra analogue | When it becomes necessary |
|---|---|---|
| `kv_metadata` | `kv_metadata` | Needed if we support Kestra-style namespace KV storage, KV tasks, or a future KV page. The current docs already flagged it as missing. |
| `flow_execution_queue` or strict-parity `execution_queued` | `execution_queued` | Needed if we want a first-class persisted queue/scheduler backlog instead of deriving queued state only from `flow_executions`. |

Evidence:

- `docs-approved/backend setup/backend-direction.md`
- `docs-approved/backend setup/kestra-sqls/kestra_table_definitions.sql`

## Kestra Tables We Can Skip Under Our Current Architecture

These exist in Kestra, but they are internal orchestration implementation details or separate product tracks. We should not count them as required unless we explicitly decide to clone Kestra internals one-for-one.

| Kestra table | Why we can skip it for now |
|---|---|
| `queues` | Kestra internal message bus. We can keep using our own dispatch path plus Realtime instead of copying Kestra's queue implementation. |
| `executorstate` | Kestra scheduler coordination internals. |
| `executordelayed` | Kestra delayed-scheduling internals. |
| `worker_job_running` | Kestra worker lock/coordination internals. |
| `multipleconditions` | Advanced trigger composition. Not needed for the first complete runtime contract. |
| `sla_monitor` | Enterprise/advanced operational feature. |
| `dashboards` | Separate feature track, not required to operate flows themselves. |
| `settings` | We already have `admin_runtime_policy` and `admin_runtime_policy_audit` for configuration storage and audit history. |

## Final Inventory

### Net-new tables we still need to create

Mandatory:

1. `flow_triggers`
2. `flow_execution_metrics`
3. `flow_topologies`
4. `flow_concurrency_limits`
5. `namespace_file_metadata`
6. `flow_templates` or `templates`
7. `service_instance`
8. `flow_tests`
9. `flow_test_runs`
10. `flow_test_results`

Conditional but likely:

11. `kv_metadata`
12. `flow_execution_queue` or `execution_queued`

### Existing tables that must be upgraded or replaced

1. `flow_sources`
2. `flow_executions`
3. `flow_logs`

### Existing tables that already cover plugin inventory work

1. `integration_catalog_items`
2. `kestra_plugin_inputs`
3. `kestra_plugin_outputs`
4. `kestra_plugin_examples`
5. `kestra_plugin_definitions`
6. `kestra_provider_enrichment`
7. `service_registry`
8. `service_functions`

## Recommendation

If we want one clean execution target for the SQL phase, we should treat the inventory as:

- **10 mandatory new tables**
- **3 existing tables to replace or deeply expand**
- **0 additional plugin catalog tables**

That is the smallest honest inventory that still covers:

- flow runtime
- triggering
- metrics
- topology
- concurrency
- namespace files/assets
- blueprints/templates
- live instance state
- tests
- plugin catalog parity

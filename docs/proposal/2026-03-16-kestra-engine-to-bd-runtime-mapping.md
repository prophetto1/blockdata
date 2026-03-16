# Kestra Engine → BD Runtime Mapping Spec

**Date:** 2026-03-16
**Purpose:** Systems archaeology. Map every Kestra engine component to its BD equivalent (or absence), identify what blocks end-to-end plugin execution, and sequence what must be built.
**Source:** `E:/kestra/core/src/main/java/io/kestra/core/` (302 files), `E:/writing-system/services/platform-api/` (BD current state)
**This is not a proposal.** It is an inventory with gap classification.

---

## The Dependency Graph

Every Kestra plugin calls `run(RunContext)`. RunContext is the gateway to everything:

```
Plugin.run(RunContext)
  │
  ├── RunContext.render()        → VariableRenderer → Pebble engine
  ├── RunContext.storage()       → StorageInterface → S3/GCS/local backend
  ├── RunContext.workingDir()    → WorkingDir → temp file management
  ├── RunContext.logger()        → RunContextLogger → structured logging
  ├── RunContext.metric()        → MetricRegistry → Micrometer counters/timers
  ├── RunContext.namespaceKv()   → KVStoreService → key-value state store
  ├── RunContext.encrypt/decrypt → Encryption service
  ├── RunContext.acl()           → AclChecker → permission enforcement
  ├── RunContext.assets()        → AssetEmitter → file dependency declaration
  ├── RunContext.sdk()           → SDK → Kestra API client
  └── RunContext.pluginConfiguration() → PluginConfigurations → static config
```

Above RunContext, the execution engine orchestrates:

```
Executor
  ├── Reads flow definitions (FlowInterface)
  ├── Resolves task graph (FlowableUtils)
  ├── Dispatches tasks to workers (QueueInterface → WorkerTask)
  ├── Manages execution state (Execution, TaskRun, State)
  ├── Handles subflows (SubflowExecution)
  └── Evaluates triggers (Scheduler, TriggerService)

Worker
  ├── Consumes WorkerTask from queue
  ├── Builds RunContext via RunContextFactory
  ├── Calls plugin.run(runContext)
  ├── Captures output, logs, metrics
  ├── Publishes WorkerTaskResult back to Executor
  └── Handles retry (AbstractRetry → Failsafe)
```

---

## Component-by-Component Mapping

### Layer 1: Plugin Runtime Services (what RunContext provides)

These are the services that a translated plugin's `run()` method directly calls. If these don't exist in BD, the plugin code cannot execute.

| # | Kestra Component | Kestra Implementation | BD Current State | Gap Level | Blocks Plugin? |
|---|---|---|---|---|---|
| 1.1 | **Template rendering** | `VariableRenderer` — full Pebble engine with 30+ custom filters (jq, json, date, indent, keys, md5, etc.), recursive rendering, typed output, secret masking | `ExecutionContext.render()` — regex `{{ path }}` only. No filters, no conditions, no loops, no typed output. | **MEDIUM** | Yes — any plugin with dynamic properties |
| 1.2 | **File storage — write** | `Storage.putFile(File)` → returns `kestra://` URI | `context.upload_file(bucket, path, bytes)` → returns public URL | **DONE** (different URI scheme but functional) | No |
| 1.3 | **File storage — read** | `Storage.getFile(URI)` → returns InputStream | `download_from_storage()` exists in `app/infra/storage.py` but **NOT on ExecutionContext** | **EASY FIX** | Yes — destination plugins reading upstream artifacts |
| 1.4 | **File storage — list/delete** | `Storage.list(prefix)`, `Storage.deleteFile(URI)` | Not on ExecutionContext | **EASY FIX** | Artifact cleanup |
| 1.5 | **File storage — streaming** | `Storage.getFile()` returns InputStream (streamable) | Only full-bytes download. No streaming. | **MEDIUM** | Large file processing |
| 1.6 | **Working directory** | `WorkingDir` — `createTempFile()`, `createFile()`, `findAllFilesMatching()`, `cleanup()` | Not implemented | **EASY FIX** | Plugins buffering to disk |
| 1.7 | **Data serialization** | `FileSerde` — Ion format, reactive Flux streaming, 32KB buffer | Inline `json.dumps`/`json.loads` per plugin. No shared utility. | **EASY FIX** | Consistency, performance |
| 1.8 | **Logging** | `RunContextLogger` — SLF4J with MDC, secrets masking, stored to execution log | `context.logger` — Python logging.Logger, no masking, no persistence | **DONE** (basic), **MEDIUM** (full) | No — basic logging works |
| 1.9 | **Metrics** | `MetricRegistry` — Micrometer counters/timers/gauges with tags | Not implemented | **DEFERRED** | No — observability, not correctness |
| 1.10 | **Encryption** | `RunContext.encrypt()/decrypt()` | `crypto.py` — `encrypt_with_context()`/`decrypt_with_context()` | **DONE** | No |
| 1.11 | **Secrets** | `SecretService` — pluggable backend (Vault, K8s, env) via `{{ secret('KEY') }}` | `context.get_secret()` — env vars only | **PARTIAL** | No — env vars work for now |
| 1.12 | **KV Store** | `KVStoreService` — namespace-scoped, TTL, versioned | Not implemented | **DEFERRED** | Only KV plugins (Get/Set/Delete) |
| 1.13 | **ACL** | `AclChecker` — resource-level permission checks | Not implemented | **DEFERRED** | Only namespace plugins |
| 1.14 | **Plugin config** | `PluginConfigurations` — static per-plugin settings from YAML | Not implemented | **LOW** | No — plugins use params |
| 1.15 | **HTTP client** | Built-in `HttpClient` — Apache HC5 with auth configs (Basic, Bearer, Digest), SSL, proxy, logging interceptors, retry | Plugins use `httpx` directly | **PARTIAL** (httpx covers most cases) | No — httpx is sufficient |
| 1.16 | **Assets** | `AssetEmitter` — declare file dependencies | Not implemented | **DEFERRED** | No |
| 1.17 | **SDK** | `SDK` — Kestra API client for self-referential operations | Not needed (BD doesn't need to call itself via HTTP) | **N/A** | No |

**Summary Layer 1:** 6 DONE/PARTIAL, 5 EASY FIX, 2 MEDIUM, 4 DEFERRED, 1 N/A

---

### Layer 2: Execution Engine (what orchestrates plugin execution)

These components sit above the plugin. They decide which plugin runs, when, with what inputs, and what happens with the output.

| # | Kestra Component | Kestra Implementation | BD Current State | Gap Level | Blocks What? |
|---|---|---|---|---|---|
| 2.1 | **Flow definition** | `Flow` — YAML-defined task graph with tasks, errors, finally, triggers, inputs, outputs, variables | No flow definitions. Load-runs route is hardcoded source→destination. | **LARGE** | Multi-step pipelines |
| 2.2 | **Execution state** | `Execution` + `TaskRun` — immutable state objects with full lifecycle (CREATED→QUEUED→RUNNING→SUCCESS/FAILED/WARNING) | `service_runs` + `service_run_items` — simpler (pending→running→complete/partial/failed) | **PARTIAL** | Works for load-runs. Not general. |
| 2.3 | **Task graph resolution** | `FlowableUtils` — `resolveSequentialNexts()`, `resolveWaitForNext()`, `resolveDag()`. Handles If/Switch/ForEach/Parallel/Dag. | Not implemented. Load-runs hardcodes "process items sequentially." | **LARGE** | Flow control (If, ForEach, Parallel) |
| 2.4 | **Worker dispatch** | `QueueInterface` → `Worker` consumes `WorkerTask`, builds `RunContext`, calls `plugin.run()`, returns `WorkerTaskResult` | FastAPI request handler calls `plugin.run()` synchronously in the HTTP request. No queue, no worker pool. | **LARGE** | Background/async execution, concurrency |
| 2.5 | **RunContext construction** | `RunContextFactory` — assembles RunContext with correct variables, storage, logger, flow context per task | `ExecutionContext(execution_id=..., user_id=...)` — manual construction in route handler. **Generic plugin route doesn't set user_id.** | **MEDIUM** (fix user_id: 1 line. Full factory: LARGE) | **BLOCKS NOW** — generic route broken |
| 2.6 | **Variable assembly** | `RunVariables` — merges flow variables, execution inputs, upstream task outputs, trigger context into a single map | Route passes `request.variables` directly. No merging of upstream outputs. | **MEDIUM** | Multi-step pipelines where task B reads task A's output |
| 2.7 | **Retry** | `AbstractRetry` — Constant/Exponential/Random backoff via Failsafe library, per-task configurable | Not implemented | **MEDIUM** | Resilience against transient failures |
| 2.8 | **Subflow execution** | `SubflowExecution` — creates child Execution objects, monitors completion, merges outputs | Not implemented | **LARGE** | Flow composition |
| 2.9 | **Concurrency control** | `ConcurrencyLimit` / `ConcurrencyLimitService` — limits parallel task runs per flow or namespace | `claim_run_item` RPC with `FOR UPDATE SKIP LOCKED` — prevents double-claiming but no configurable limit | **PARTIAL** | High-throughput pipelines |

**Summary Layer 2:** 1 PARTIAL, 2 MEDIUM (one blocking NOW), 4 LARGE

---

### Layer 3: Trigger & Scheduling (what starts execution)

| # | Kestra Component | Kestra Implementation | BD Current State | Gap Level |
|---|---|---|---|---|
| 3.1 | **Scheduler** | `Scheduler` service — evaluates `PollingTriggerInterface` on intervals, creates Executions | Not implemented. Load-runs are manually submitted via UI. | **LARGE** |
| 3.2 | **Webhook triggers** | `AbstractWebhookTrigger` — HTTP endpoint that creates Execution on incoming request | Not implemented | **LARGE** |
| 3.3 | **Polling triggers** | `PollingTriggerInterface` — `getInterval()`, `evaluate()` — file watchers, DB change detection | Not implemented | **LARGE** |
| 3.4 | **Realtime triggers** | `RealtimeTriggerInterface` — push-based (Kafka consumer, WebSocket, CDC) | Not implemented | **LARGE** |
| 3.5 | **Trigger state** | `SchedulerTriggerStateInterface` — persistent last-evaluation state | Not implemented | **LARGE** |

**Summary Layer 3:** All LARGE. Entire trigger system is absent.

---

### Layer 4: Infrastructure Services

| # | Kestra Component | Kestra Implementation | BD Current State | Gap Level |
|---|---|---|---|---|
| 4.1 | **Message queue** | `QueueInterface` — abstraction over Kafka/Redis/JDBC/in-memory | No queue. Synchronous HTTP request→response. | **LARGE** |
| 4.2 | **Plugin discovery** | `PluginScanner` + `PluginRegistry` — classpath scan, JAR isolation, version management | `registry.py` — module scan of `app/plugins/`, no versioning, no isolation | **DONE** (simpler but works) |
| 4.3 | **Plugin configuration** | `PluginConfigurations` — YAML-driven static config per plugin | Not implemented. Plugins read env vars or params. | **LOW** |
| 4.4 | **Repositories** | 15+ repository interfaces for execution, flow, trigger, log, metric persistence | Supabase tables via `get_supabase_admin()` — ad-hoc queries per route | **PARTIAL** |
| 4.5 | **Serialization** | `JacksonMapper` — Ion/JSON/YAML with custom serializers | `msgspec` for JSON (planned). No Ion, no YAML serialization. | **PARTIAL** |
| 4.6 | **Pebble engine** | `PebbleEngineFactory` + 30+ custom filters + 10+ functions | Jinja2 (planned). Covers ~80% of Pebble but different filter names. | **PARTIAL** |

**Summary Layer 4:** 1 DONE, 3 PARTIAL, 1 LOW, 1 LARGE

---

## The Missing Capability Matrix

Ordered by what blocks end-to-end plugin execution, from most immediate to most deferred:

### Tier 0: Blocks RIGHT NOW (prevents existing plugins from working via generic route)

| Missing | Impact | Fix |
|---------|--------|-----|
| `user_id` not set in `plugin_execution.py` | Generic `POST /{function_name}` route creates ExecutionContext without user_id. Any plugin needing credentials fails. | **1 line fix** in plugin_execution.py |

### Tier 1: Blocks translated integration plugins (EASY FIX — ~8 hours total)

| Missing | Impact | Fix |
|---------|--------|-----|
| `download_file()` on context | Destination plugins can't read upstream artifacts through context | Add method to ExecutionContext |
| `list_files()` / `delete_files()` on context | Artifact cleanup requires raw SDK calls | Add methods to ExecutionContext |
| Working directory (temp files) | Large file processing holds everything in memory | Add `tempfile.TemporaryDirectory` wrapper |
| Shared JSONL serialization | Every plugin reimplements encode/decode | Add `serialization.py` with msgspec |
| Bulk write utility | Every destination reimplements batching | Add `chunked_write` with more-itertools |
| Jinja2 rendering | Dynamic property values not evaluated | Upgrade `render()` from regex to Jinja2 |

### Tier 2: Blocks multi-step pipelines (MEDIUM — days of work)

| Missing | Impact | Fix |
|---------|--------|-----|
| Variable assembly (upstream outputs → downstream inputs) | Task B can't read Task A's output | Build `RunVariables` equivalent |
| Retry with backoff | Transient failures kill the run | Add stamina/tenacity wrapper |
| RunContext factory | Each route hand-builds context differently | Centralize context construction |
| Pebble filter parity | Kestra templates with `jq`, `json`, `keys` filters fail in Jinja2 | Add custom Jinja2 filters or adapter |

### Tier 3: Blocks flow orchestration (LARGE — weeks of work)

| Missing | Impact | Fix |
|---------|--------|-----|
| Flow definition format | No way to define multi-step task graphs | Design BD flow YAML/JSON schema |
| Task graph resolver | No If/Switch/ForEach/Parallel/Dag execution | Build `FlowableUtils` equivalent |
| Worker dispatch + queue | All execution is synchronous in HTTP request | Build async worker with queue |
| Subflow execution | Can't compose flows from other flows | Build SubflowExecution equivalent |
| Execution state machine | Current model is flat (pending→running→done) | Extend to full lifecycle |

### Tier 4: Blocks event-driven execution (LARGE — separate project)

| Missing | Impact | Fix |
|---------|--------|-----|
| Trigger scheduler | No scheduled/recurring execution | Build scheduler service |
| Webhook triggers | No HTTP-triggered execution | Build webhook endpoint |
| Polling triggers | No file-watcher or DB-change triggers | Build polling infrastructure |
| Realtime triggers | No streaming event triggers | Build event consumer |

---

## What "End-to-End Complete" Means per Track

### Track A: Single-step integration plugins (GCS, MongoDB, JDBC, etc.)

**Complete when:** A translated RunnableTask plugin can be invoked via `POST /{function_name}` or via load-runs, with credentials resolved, files read/written through context, data serialized via shared utilities, and results tracked in service_runs.

**Requires:** Tier 0 + Tier 1 = ~1 day of work.

**Unlocks:** All 131 external plugin repos (RunnableTask classes only). ~800+ task classes.

### Track B: Multi-step load pipelines (source → transform → destination)

**Complete when:** A pipeline definition can chain 2+ plugins where outputs of step N become inputs of step N+1, with variable passing, retry on transient failures, and proper execution tracking.

**Requires:** Track A + Tier 2 = ~1-2 weeks.

**Unlocks:** Compose plugins into pipelines. GCS list → GCS download → transform → ArangoDB load as a single run.

### Track C: Flow orchestration (If/ForEach/Parallel/Dag)

**Complete when:** A YAML/JSON flow definition can express conditional branching, iteration, parallelism, and DAG dependencies, executed by a BD-native flow engine.

**Requires:** Track B + Tier 3 = ~4-8 weeks.

**Unlocks:** All 15 FlowableTask core plugins. Full workflow composition.

### Track D: Event-driven execution (triggers, scheduling)

**Complete when:** Flows can be triggered by schedule (cron), webhook, file change, or streaming event, with persistent trigger state.

**Requires:** Track C + Tier 4 = separate project.

**Unlocks:** All trigger plugins. Automated pipeline execution.

---

## Kestra File Count by Component

| Component | Files | Role |
|-----------|-------|------|
| `runners/` | 141 | Execution engine core |
| `services/` | 27 | Business logic services |
| `models/executions/` | 25 | Execution state model |
| `storages/` | 24 | File storage + KV |
| `plugins/` | 24 | Plugin discovery/loading |
| `models/triggers/` | 20 | Trigger system |
| `http/client/` | 18 | Built-in HTTP client |
| `serializers/` | 12 | Ion/JSON serialization |
| `queues/` | 7 | Message bus |
| `secret/` | 4 | Secret management |
| **Total core** | **302** | |
| `plugin/core/` (internal plugins) | ~130 | Flow, HTTP, KV, storage, etc. |
| `kestra-io/plugins/` (external) | ~1,600 | 131 integration repos |
| **Grand total** | **~2,032** | |

---

## BD Current File Count (Execution Plane)

| Component | Files | Covers |
|-----------|-------|--------|
| `app/domain/plugins/models.py` | 1 | BasePlugin, ExecutionContext, PluginOutput |
| `app/domain/plugins/registry.py` | 1 | Plugin discovery |
| `app/infra/storage.py` | 1 | Supabase Storage (upload/download/upsert) |
| `app/infra/crypto.py` | 1 | AES-GCM encryption |
| `app/infra/connection.py` | 1 | Credential resolution |
| `app/infra/supabase_client.py` | 1 | DB client |
| `app/api/routes/plugin_execution.py` | 1 | Generic plugin route |
| `app/api/routes/load_runs.py` | 1 | Load orchestration |
| `app/api/routes/connections.py` | 1 | Credential management |
| `app/plugins/*.py` | 4 | GCS (2), ArangoDB (1), + existing plugins |
| **Total** | **~13** | |

**BD has 13 files covering what Kestra does in 302 core + 130 internal plugin files.**

That's the gap. Not in plugins — in engine.

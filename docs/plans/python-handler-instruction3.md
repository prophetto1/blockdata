# Systems Analysis: Kestra Engine → BlockData Runtime Architecture

## Objective

Analyze all three source repositories and produce the architecture required for BlockData's execution plane to fully integrate Kestra's plugin ecosystem as native Python services.

---

## Source Repositories

### Kestra Core Engine
```
E:/kestra/core/src/main/java/io/kestra/core/
```
- **761 Java files** across: runners, storage, queues, serializers, services, models, plugins, secrets, HTTP client
- Key subdirectories:
  - `runners/` (141 files) — Executor, Worker, RunContext, VariableRenderer, FlowableUtils, Scheduler
  - `storages/` (24 files) — StorageInterface, KVStore, Namespace file isolation
  - `queues/` (7 files) — QueueInterface for executor↔worker message passing
  - `services/` (27 files) — ExecutionService, FlowService, TriggerService, KVStoreService
  - `models/executions/` (25 files) — Execution, TaskRun, State machine
  - `models/triggers/` (20 files) — AbstractTrigger, PollingTriggerInterface, RealtimeTriggerInterface
  - `models/tasks/` — Task, RunnableTask, FlowableTask, ExecutableTask, Output, ResolvedTask
  - `models/property/` — Property<T> deferred rendering system
  - `serializers/` (12 files) — FileSerde (Ion format), JacksonMapper
  - `plugins/` (24 files) — PluginRegistry, PluginScanner, PluginClassLoader
  - `http/client/` (18 files) — Built-in HTTP client with auth, SSL, proxy, logging
  - `secret/` (4 files) — Pluggable secret backend interface

### Kestra Internal Plugins
```
E:/kestra/core/src/main/java/io/kestra/plugin/core/
```
- **129 Java files** across 17 domains: flow (If, ForEach, Parallel, Dag, Subflow), http (Request, Download), kv (Get, Set, Delete), storage (FilterItems, Split, Concat), execution (Fail, Assert, SetVariables), condition (Expression, DateTimeBetween), trigger (Schedule, Webhook), log, debug, metric, namespace, output, purge, runner, state, templating, dashboard

### Kestra External Plugins
```
E:/kestra-io/plugins/
```
- **131 plugin repos**, ~1,600 Java source files total
- Each repo follows the pattern: AbstractTask (base) → Connection (credentials) → Task classes (RunnableTask implementations)
- Top repos by size: plugin-jdbc (135 files, 22 DB submodules), plugin-azure (131), plugin-gcp (124), plugin-aws (77), plugin-fs (77), plugin-scripts (55, 18 language submodules)
- Four repos copied locally for direct reference:
  - `E:/writing-system/docs/plugin-gcp/`
  - `E:/writing-system/docs/plugin-anthropic/`
  - `E:/writing-system/docs/plugin-openai/`
  - `E:/writing-system/docs/plugin-dlt/`

### BlockData Execution Plane
```
E:/writing-system/services/platform-api/
```
- **~15 relevant files**
- Plugin contract:
  - `app/domain/plugins/models.py` — BasePlugin, ExecutionContext, PluginOutput
  - `app/domain/plugins/registry.py` — auto-discovery of BasePlugin subclasses
  - `app/api/routes/plugin_execution.py` — generic `POST /{function_name}` invocation
  - `app/api/routes/load_runs.py` — load orchestration (submit, step, finalize)
- Runtime substrate:
  - `app/infra/auth_providers.py` — 6 auth patterns with auto-detection via `resolve_auth()`
  - `app/infra/serialization.py` — msgspec JSONL encode/decode, chunked_write
  - `app/infra/connection.py` — credential resolution from encrypted DB storage
  - `app/infra/crypto.py` — AES-GCM encryption
  - `app/infra/storage.py` — Supabase Storage REST helpers
- Working plugins (on substrate):
  - `app/plugins/gcs.py` — GCSListPlugin, GCSDownloadCsvPlugin
  - `app/plugins/arangodb.py` — ArangoDBLoadPlugin
  - `app/plugins/http.py` — HttpRequestPlugin, HttpDownloadPlugin
  - `app/plugins/core.py`, `app/plugins/eyecite.py`, `app/plugins/scripts.py`

### Database (Supabase)
- `service_registry` — 176 services
- `service_functions` — 1013 functions
- `integration_catalog_items` — 945 Kestra plugin entries with full `task_schema` JSONB (properties, outputs, examples, definitions)
- `kestra_plugin_inputs` — ~9,700 normalized input parameter rows
- `kestra_plugin_outputs` — ~2,300 normalized output field rows
- `kestra_plugin_definitions` — ~4,400 reusable type definition rows
- `kestra_provider_enrichment` — ~56 rows with auth_type and auth_fields per provider

---

## Analysis Steps

### Step 1: Read Kestra's engine to identify every runtime service plugins depend on
Read `E:/kestra/core/src/main/java/io/kestra/core/runners/RunContext.java` and `DefaultRunContext.java`. List every public method and the service it provides. This is the interface all plugins call.

### Step 2: Read Kestra's plugin SDK to identify every plugin contract
Read `RunnableTask.java`, `FlowableTask.java`, `ExecutableTask.java`, `Output.java`, `Property.java`, `PluginProperty.java` in `models/tasks/` and `models/property/`. Map the full contract: what a plugin must implement, what it receives, what it returns.

### Step 3: Read Kestra's external plugin repos to identify every shared abstraction
For the top 10 plugins by size (plugin-jdbc, plugin-azure, plugin-gcp, plugin-aws, plugin-fs, plugin-scripts, plugin-serdes, plugin-notifications, plugin-slack, plugin-mongodb), read the AbstractTask and Connection classes. Identify the provider-level and service-level base class hierarchy. Document what each level handles (auth, connection pooling, API client, pagination, error handling).

### Step 4: Read Kestra's internal plugins to identify every plugin pattern
Read each of the 17 domains in `E:/kestra/core/src/main/java/io/kestra/plugin/core/`. Classify each task by what runtime services it requires (storage only, HTTP only, flow engine, KV store, trigger scheduler, etc.).

### Step 5: Read BlockData's execution plane to map current coverage
Read every file in `E:/writing-system/services/platform-api/app/` — models, infra, plugins, routes. Map each BD component against the Kestra equivalent identified in Steps 1-4.

### Step 6: Produce the architecture
Based on Steps 1-5, define the complete set of runtime components, base classes, shared abstractions, and infrastructure services BD needs. Organize by dependency order: what must exist before what.

---

## Existing Analysis Documents

- `docs/plans/2026-03-15-kestra-absorption-context-update.md` — architectural context for Kestra absorption
- `docs/proposal/2026-03-16-kestra-engine-to-bd-runtime-mapping.md` — maps 302 Kestra engine files to BD equivalents, identifies 4 tracks (single-step plugins → multi-step pipelines → flow orchestration → triggers)
- `docs/proposal/2026-03-16-runtime-gap-analysis.md` — maps every RunContext service to BD ExecutionContext, classifies gaps as DONE/EASY/MEDIUM/DEFERRED
- `docs/kt-analysis-again/kestra-core-inventory.md` — file-level inventory of all 890 core + internal plugin files with class declarations
- `docs/plans/2026-03-16-plugin-runtime-substrate.md` — substrate implementation plan
- `docs/plans/python-handler-instruction.md` — background context document


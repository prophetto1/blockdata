# Kestra MongoDB Plugin → kt/blockdata Import Trace Comparison

Traced every import from Kestra's plugin-mongodb Java files through the core engine, then compared against kt/blockdata's Python translation.

---

## Kestra's MongoDB Plugin Dependency Tree

```
MongoDB Plugin Layer (E:/kestra-io/plugins/plugin-mongodb/)
├── Find.java, Aggregate.java, InsertOne.java, Delete.java, Update.java
│   ├── io.kestra.core.models.annotations.Plugin
│   │   ├── Example
│   │   ├── Metric
│   │   └── MonacoLanguages (enum)
│   ├── io.kestra.core.models.annotations.PluginProperty
│   ├── io.kestra.core.models.executions.metrics.Counter
│   │   ├── AbstractMetricEntry
│   │   └── MetricRegistry
│   ├── io.kestra.core.models.property.Property<T>
│   │   ├── RunContextProperty<T>
│   │   ├── JacksonMapper
│   │   └── Rethrow
│   ├── io.kestra.core.models.tasks.RunnableTask<T>
│   │   ├── Plugin (interface)
│   │   └── WorkerJobLifecycle (kill/stop hooks)
│   ├── io.kestra.core.runners.RunContext (abstract)
│   │   ├── EncryptionService
│   │   ├── Storage (StorageInterface)
│   │   ├── StateStore
│   │   ├── KVStore
│   │   ├── AbstractMetricEntry
│   │   └── PropertyContext
│   ├── io.kestra.core.serializers.FileSerde
│   │   ├── JacksonMapper → IonFactory, IonModule, com.amazon.ion.*
│   │   └── reactor.core.publisher.* (Project Reactor)
│   └── io.kestra.core.utils.Rethrow
│
├── AbstractLoad.java, Load.java, Bulk.java
│   ├── (all above, plus:)
│   ├── io.kestra.core.serializers.JacksonMapper
│   └── io.kestra.core.models.tasks.common.FetchType (enum)
│
├── AbstractTask.java
│   ├── io.kestra.core.exceptions.IllegalVariableEvaluationException
│   ├── io.kestra.core.models.tasks.Task (abstract base)
│   │   ├── TaskInterface
│   │   ├── AbstractRetry
│   │   ├── Property<Duration> timeout
│   │   ├── Boolean disabled
│   │   ├── String runIf
│   │   ├── boolean allowFailure
│   │   ├── boolean logToFile
│   │   ├── WorkerGroup
│   │   └── AssetsDeclaration
│   └── io.kestra.core.runners.RunContext
│
└── Trigger.java
    ├── io.kestra.core.models.triggers.AbstractTrigger
    │   ├── TriggerInterface
    │   ├── Condition, Label, State
    │   ├── WorkerGroup, AssetsDeclaration
    │   └── NoSystemLabelValidation
    ├── io.kestra.core.models.triggers.PollingTriggerInterface
    ├── io.kestra.core.models.triggers.TriggerOutput<T>
    ├── io.kestra.core.models.triggers.TriggerService
    └── io.kestra.core.models.triggers.TriggerContext
```

---

## kt/blockdata Dependency Tree

```
kt/blockdata/
├── core/
│   ├── models/
│   │   ├── property.py          → Property[T] with of_value()
│   │   └── tasks/
│   │       ├── common.py        → FetchType enum
│   │       └── task.py          → Task, Output, RunnableTask Protocol
│   └── runners/
│       └── run_context.py       → RunContext, RenderedValue, LocalStorage, WorkingDirectory
│
├── connectors/mongodb/
│   ├── abstract_task.py         → AbstractTask(Task) with connection, database, collection
│   ├── abstract_load.py         → AbstractLoad(AbstractTask) with chunked bulk write
│   ├── find.py                  → Find with filter/projection/sort/limit/skip/store
│   ├── aggregate.py             → Aggregate with pipeline/allowDiskUse/maxTimeMs/batchSize
│   ├── insert_one.py            → InsertOne with document
│   ├── delete.py                → Delete with filter/operation (DELETE_ONE/DELETE_MANY)
│   ├── update.py                → Update with document/filter/operation (UPDATE_ONE/MANY/REPLACE)
│   ├── load.py                  → Load with from_/chunk/idKey/removeIdKey
│   ├── bulk.py                  → Bulk with from_/chunk (mixed ops from NDJSON)
│   ├── mongodb_connection.py    → MongoDbConnection with uri + connection_id
│   ├── mongodb_service.py       → MongoDbService.to_document(), map_value()
│   ├── write_models.py          → WriteModel hierarchy + BulkWriteSummary
│   └── trigger.py               → Trigger with evaluate()
│
└── runtime/
    ├── execution.py             → build_task(), execute_function(), param normalization
    ├── registry.py              → TASK_CLASS_REGISTRY, function name mapping
    ├── connection.py            → resolve_connection_sync() with env var fallback
    └── routes.py                → FastAPI POST /{function_name}
```

---

## Side-by-Side Mapping

| Kestra Java (what MongoDB plugin imports) | kt/blockdata equivalent | Status |
|---|---|---|
| **Task.java** — id, type, retry, timeout, disabled, runIf, allowFailure, logToFile, workerGroup | `core/models/tasks/task.py` — id, type only | **Partial** — missing retry, timeout, disabled, runIf, allowFailure |
| **RunnableTask.java** — `run(RunContext) → Output` + WorkerJobLifecycle (kill/stop) | `core/models/tasks/task.py` — RunnableTask Protocol | **Partial** — no kill/stop hooks |
| **Output.java** — `finalState()`, `toMap()` | `core/models/tasks/task.py` — empty Output base | **Partial** — no finalState; execution.py handles serialization |
| **Property\<T\>** — deferred rendering with cache, type coercion, skipCache | `core/models/property.py` — Property with of_value() | **Match** — RenderedValue handles type coercion |
| **RunContext** — 17 service categories | `core/runners/run_context.py` — render, storage, metrics, logger, working_dir | **5 of 17** — missing encryption, KV, ACL, namespace files, plugin config, assets, SDK, version, local path, validation, state store, input/output |
| **FileSerde** — Ion binary via Reactor Flux streaming | `json.dumps` + `storage.put_file_bytes()` | **Match** (JSONL instead of Ion) |
| **JacksonMapper** — JSON/YAML/Ion with custom modules | `json` stdlib + `bson.json_util` | **Match** |
| **Counter** — metric with name, value, tags | `run_context.metric(name, value)` | **Partial** — no tags |
| **FetchType** — FETCH/STORE/FETCH_ONE/NONE | `core/models/tasks/common.py` | **Match** |
| **@Plugin** — examples, metrics, beta, aliases, priority | `task_types` list | **Partial** — no metadata |
| **@PluginProperty** — dynamic, group, hidden, internalStorageURI | Not needed | **N/A** — Python doesn't need this |
| **AbstractTrigger** — conditions, labels, worker groups, state | `trigger.py` — standalone dataclass | **Partial** — no conditions/labels/worker groups |
| **PollingTriggerInterface** — interval, backoff, liveness | `trigger.py` has interval + evaluate() | **Partial** — no backoff/liveness |
| **IllegalVariableEvaluationException** | `ValueError` | **Match** |
| **Rethrow** — checked exception wrapping | Not needed | **N/A** — Python has no checked exceptions |
| **AbstractRetry** — retry config on Task base | Not implemented | **Missing** |
| **EncryptionService** — decrypt/encrypt | Not implemented (connection.py resolves externally) | **Missing** |
| **KVStore** — namespaceKv() | Not implemented | **Missing** |
| **StorageInterface** — pluggable S3/GCS/Azure/Minio | LocalStorage (filesystem only) | **Partial** — no remote backends |

---

## kt/blockdata Additions (No Kestra Equivalent)

| File | Purpose | Why BD needs it |
|---|---|---|
| `runtime/execution.py` | camelCase→snake_case normalization, dict→dataclass construction, output serialization | Kestra builds tasks from YAML via Jackson. BD builds from JSON API params |
| `runtime/registry.py` | task_type → class, function_name → task_type mapping | Kestra scans classpath. BD uses explicit registration |
| `runtime/connection.py` | connection_id → credential lookup with env var fallback | Kestra puts creds in flow YAML. BD stores encrypted in DB |
| `runtime/routes.py` | FastAPI HTTP POST /{function_name} | Kestra uses Spring ExecutionController. BD uses FastAPI |
| `connectors/mongodb/write_models.py` | WriteModel hierarchy for testability | Kestra uses pymongo WriteModel directly. BD abstracts for mongomock |
| `main.py` | Server entry point | Kestra is a JVM app. BD is a Python service |

---

## What's Missing — By Impact

### Blocks nothing now

All 7 MongoDB tasks + Trigger work. 10/10 tests pass. The execution bridge (`execute_function`) handles param normalization, dataclass construction, and output serialization end-to-end.

### Blocks production deployment

| Gap | What it is | Workaround |
|---|---|---|
| **Remote storage** | LocalStorage writes to filesystem. Can't share artifacts between services | Replace LocalStorage with Supabase Storage (tr/storage.py has the implementation) |
| **Standalone encryption** | Credentials resolved via env vars or platform-api fallback only | Run inside platform-api where crypto.py handles AES-GCM |

### Blocks ecosystem expansion (PostgreSQL, Elasticsearch, etc.)

| Gap | What it is | Why it matters |
|---|---|---|
| **Task core properties** | retry, timeout, disabled, runIf, allowFailure missing from Task base | Every connector needs these. Currently only id and type |
| **AbstractRetry** | No retry configuration | Transient failures kill execution |

### Blocks flow orchestration (Track C)

| Gap | What it is |
|---|---|
| **WorkerJobLifecycle** | Can't gracefully terminate long-running tasks (kill/stop) |
| **KVStore** | Can't persist state between executions |
| **ACL** | Can't enforce namespace isolation |
| **Full trigger infrastructure** | No backoff, liveness, conditions on triggers |
| **State machine** | No CREATED→RUNNING→SUCCESS/FAILED/WARNING transitions |

### Never needed (Java ceremony)

| Kestra concept | Why not needed in Python |
|---|---|
| @Plugin, @PluginProperty, @Example, @Metric annotations | Python uses docstrings and class attributes |
| Rethrow utility | Python has native exception handling |
| Ion binary format | JSONL is BD's standard |
| JacksonMapper framework | json stdlib + bson.json_util covers everything |
| Reactor Flux streaming | Python iterates directly |
| Lombok (@Builder, @Getter, etc.) | Python dataclasses handle this natively |

---

## File Count Comparison

| Layer | Kestra Java files | kt/blockdata Python files |
|---|---|---|
| Core models | ~50 (tasks, property, annotations, triggers) | 4 (property.py, task.py, common.py, run_context.py) |
| MongoDB plugin | 13 | 13 (1:1 mapping) |
| Runtime/execution | ~150 (runners, executor, worker, queue) | 4 (execution.py, registry.py, connection.py, routes.py) |
| **Total relevant** | **~213** | **21** |

The 10:1 reduction is structural: Python doesn't need separate files per class, doesn't need annotation metadata, doesn't need reactive streaming wrappers, and doesn't need the Executor→Queue→Worker distributed infrastructure.

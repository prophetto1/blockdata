# Kestra Repo Structure → kt/blockdata Structure Mapping

Side-by-side directory tree showing every Kestra directory against its kt/blockdata equivalent, with status markers.

Legend: ✓ present, ✗ missing, ∼ partial/compressed, — not needed

---

## Kestra Main Repo (e:/kestra/) → kt/blockdata/

```
KESTRA MAIN REPO                                       kt/ EQUIVALENT
═══════════════                                         ══════════════

model/                                                 blockdata/core/models/
├── models/annotations/                                  — (not needed in Python)
│   ├── Plugin.java                                       task_types list on class
│   ├── PluginProperty.java                               — (no annotation metadata)
│   ├── Example.java                                      — (docstrings)
│   └── Metric.java                                       — (docstrings)
├── models/enums/                                        — (not needed)
│   └── MonacoLanguages.java
└── models/
    ├── Plugin.java (interface)                          tasks/task.py → RunnableTask Protocol
    └── WorkerJobLifecycle.java                          ✗ MISSING (kill/stop hooks)

core/                                                  blockdata/core/
├── models/
│   ├── property/
│   │   ├── Property.java                                models/property.py → Property[T]          ✓
│   │   └── PropertyContext.java                         (folded into RunContext.render)             ✓
│   ├── tasks/
│   │   ├── Task.java                                    models/tasks/task.py → Task                ∼ missing retry/timeout/disabled/runIf/allowFailure
│   │   ├── RunnableTask.java                            models/tasks/task.py → RunnableTask        ∼ no kill/stop hooks
│   │   ├── Output.java                                  models/tasks/task.py → Output              ∼ no finalState/toMap
│   │   ├── FlowableTask.java                            ✗ NOT NEEDED (Track C)
│   │   ├── ExecutableTask.java                          ✗ NOT NEEDED (Track C)
│   │   ├── ResolvedTask.java                            ✗ NOT NEEDED (Track C)
│   │   ├── GenericTask.java                             ✗ NOT NEEDED
│   │   ├── common/
│   │   │   └── FetchType.java                           models/tasks/common.py → FetchType         ✓
│   │   ├── retrys/
│   │   │   └── AbstractRetry.java                       ✗ MISSING
│   │   ├── runners/
│   │   │   ├── TaskRunner.java                          ✗ NOT NEEDED yet
│   │   │   └── ScriptRunner.java                        ✗ NOT NEEDED yet
│   │   ├── logs/                                        ✗ NOT NEEDED yet
│   │   └── metrics/                                     ✗ NOT NEEDED yet
│   ├── executions/
│   │   ├── Execution.java                               ✗ MISSING (state machine)
│   │   ├── TaskRun.java                                 ✗ MISSING (attempt tracking)
│   │   └── metrics/
│   │       ├── Counter.java                             run_context.py → metric()                  ∼ no tags
│   │       └── AbstractMetricEntry.java                 (simplified into metric dict)
│   ├── triggers/
│   │   ├── AbstractTrigger.java                         ✗ MISSING (conditions, labels, worker groups)
│   │   ├── PollingTriggerInterface.java                 ✗ MISSING (backoff, liveness)
│   │   ├── TriggerService.java                          ✗ MISSING (execution generation)
│   │   ├── TriggerContext.java                          ✗ MISSING
│   │   ├── TriggerOutput.java                           ✗ MISSING
│   │   └── multipleflows/                               ✗ NOT NEEDED yet
│   ├── conditions/
│   │   ├── Condition.java                               ✗ MISSING
│   │   └── ConditionContext.java                        ✗ MISSING
│   ├── flows/
│   │   ├── State.java                                   ✗ MISSING (SUCCESS/FAILED/WARNING/etc.)
│   │   ├── Flow.java                                    ✗ NOT NEEDED (Track C)
│   │   └── input/                                       ✗ NOT NEEDED yet
│   ├── kv/                                              ✗ MISSING (KV store)
│   ├── assets/                                          ✗ NOT NEEDED yet
│   ├── dashboards/                                      ✗ NOT NEEDED
│   ├── namespaces/                                      ✗ NOT NEEDED yet
│   ├── storage/                                         ✗ NOT NEEDED yet
│   ├── settings/                                        ✗ NOT NEEDED
│   └── Label.java                                       ✗ NOT NEEDED yet
│
├── runners/
│   ├── RunContext.java (abstract)                       runners/run_context.py → RunContext          ∼ 5 of 17 services
│   ├── DefaultRunContext.java                           (folded into RunContext)                     ✓
│   ├── RunContextInitializer.java                       ✗ MISSING (context hydration from execution)
│   ├── RunContextProperty.java                          runners/run_context.py → RenderedValue       ✓
│   ├── WorkingDir.java                                  runners/run_context.py → WorkingDirectory    ✓
│   └── pebble/                                          runners/run_context.py → regex renderer      ∼ regex, not Jinja2/Pebble
│
├── serializers/
│   ├── FileSerde.java (Ion binary)                      json.dumps/loads → JSONL                     ✓ (different format)
│   └── JacksonMapper.java                               json stdlib + bson.json_util                 ✓
│
├── plugins/
│   ├── PluginRegistry.java                              runtime/registry.py                          ∼ explicit, not scanned
│   ├── PluginScanner.java                               runtime/registry.py → register_all()         ∼ explicit, not scanned
│   └── PluginClassLoader.java                           importlib (stdlib)                            ✓
│
├── encryption/
│   └── EncryptionService.java                           ✗ MISSING (AES-GCM)
│
├── storages/
│   ├── StorageInterface.java                            runners/run_context.py → LocalStorage         ∼ local only, no remote
│   ├── KVStore interfaces                               ✗ MISSING
│   └── StateStore.java                                  ✗ MISSING
│
├── services/
│   ├── ExecutionService.java                            ✗ MISSING (execution lifecycle)
│   ├── FlowService.java                                 ✗ NOT NEEDED yet
│   ├── TriggerService.java                              ✗ MISSING
│   └── KVStoreService.java                              ✗ MISSING
│
├── queues/
│   └── QueueInterface.java                              ✗ MISSING — needed as dispatch boundary
│                                                          between executor and worker, even if
│                                                          in-memory; preserves execution graph
│                                                          Kestra source: core/queues/QueueInterface.java
│
├── exceptions/
│   └── IllegalVariableEvaluationException.java          ValueError                                    ✓
│
├── metrics/
│   └── MetricRegistry.java                              ✗ MISSING (deferred)
│
├── secret/
│   └── SecretService.java                               ✗ MISSING
│
├── http/client/                                         — NOT NEEDED (plugins use httpx directly)
│
└── utils/
    └── Rethrow.java                                     — NOT NEEDED (Python exceptions)
```

---

## Kestra Worker/Executor/JDBC Modules → kt/blockdata/runtime/

```
worker/                                                blockdata/runtime/
├── DefaultWorker.java                                   execution.py → execute_function()            ∼ compressed
│   ├── .run()             [645-763]                       (compressed into execute_task)
│   ├── .runAttempt()      [893-977]                       (compressed into execute_task)
│   ├── .callJob()         [979-1001]                      (compressed into execute_task)
│   └── .handleTask()      [369-371]                       (compressed into execute_function)
├── WorkerTaskCallable.java                              execution.py → build_task() + task.run()     ∼ compressed
│   └── .doCall()          [57-93]                         (folded into execute_task)
├── AbstractWorkerCallable.java                          ✗ MISSING (exception mapping, kill semantics)
│   └── .call()            [59-120]
├── WorkerTriggerCallable.java                           ✗ MISSING (trigger-specific callable)
│   └── .doCall()          [14-32]
├── AbstractWorkerTriggerCallable.java                   ✗ MISSING
├── WorkerTask.java                                      ✗ MISSING (task envelope)
├── WorkerTaskResult.java                                ✗ MISSING (result envelope with state)
├── WorkerTrigger.java                                   ✗ MISSING (trigger envelope)
└── WorkerTriggerResult.java                             ✗ MISSING (trigger result envelope)


executor/                                              (not separated in kt/)
└── ExecutorService.java                                 ✗ MISSING
    ├── .process()         [~641]                          (no executor scheduling)
    └── .addWorkerTaskResult() [~1155]                     (no result joining into execution)


jdbc/runner/                                           (not separated in kt/)
└── JdbcExecutor.java                                    ✗ MISSING
    ├── .handleWorkerTaskResults()                         (no queue-based dispatch)
    └── task state transitions                             (no state machine)


scheduler/                                             — NOT NEEDED (Track D)
└── (cron, polling, webhook scheduling)


webserver/                                             blockdata/runtime/
└── (HTTP controllers)                                   routes.py → FastAPI router                   ✓
                                                         main.py → uvicorn entry point                ✓
```

---

## Kestra Plugin Repo (e:/kestra-io/plugins/) → kt/blockdata/connectors/

```
KESTRA EXTERNAL PLUGINS                                kt/ EQUIVALENT
══════════════════════                                 ══════════════

plugin-mongodb/                                        connectors/mongodb/
└── io/kestra/plugin/mongodb/
    ├── AbstractTask.java                                abstract_task.py                             ✓
    ├── AbstractLoad.java                                abstract_load.py                             ∼ one-by-one instead of bulkWrite
    ├── MongoDbConnection.java                           mongodb_connection.py                        ✓ (+connection_id)
    ├── MongoDbService.java                              mongodb_service.py                           ✓
    ├── Find.java                                        find.py                                      ✓
    ├── Aggregate.java                                   aggregate.py                                 ∼ maxTimeMs/batchSize not applied
    ├── InsertOne.java                                   insert_one.py                                ✓
    ├── Delete.java                                      delete.py                                    ✓
    ├── Update.java                                      update.py                                    ✓
    ├── Load.java                                        load.py                                      ✓
    ├── Bulk.java                                        bulk.py                                      ∼ missing collation/arrayFilters/bypassValidation
    ├── Trigger.java                                     trigger.py                                   ∼ simplified (no ConditionContext/TriggerContext)
    └── package-info.java                                package_info.py                              ✓
                                                         write_models.py                              ✓ (BD addition for testability)

plugin-gcp/                                            ✗ NOT YET
plugin-aws/                                            ✗ NOT YET
plugin-jdbc/                                           ✗ NOT YET
plugin-azure/                                          ✗ NOT YET
plugin-fs/                                             ✗ NOT YET
plugin-scripts/                                        ✗ NOT YET
... (131 total repos)                                  ... (MongoDB is the first)
```

---

## Kestra Internal Plugins (inside core repo) → Not in kt/ scope

```
core/io/kestra/plugin/core/                            STATUS
├── flow/                                                Track C — orchestrator
│   ├── If.java, Switch.java
│   ├── ForEach.java, Parallel.java
│   ├── Dag.java, Sequential.java
│   ├── Subflow.java, LoopUntil.java
│   ├── Pause.java, Sleep.java
│   └── AllowFailure.java, WorkingDirectory.java
├── http/                                                Already in platform-api (http.py)
│   ├── Request.java
│   └── Download.java
├── kv/                                                  Track B — KV store
│   ├── Get.java, Set.java, Delete.java
│   └── GetKeys.java
├── storage/                                             Track B — storage ops
│   ├── Split.java, Concat.java
│   ├── FilterItems.java, DeduplicateItems.java
│   └── Write.java, Delete.java, Size.java
├── execution/                                           Track B — orchestrator
│   ├── SetVariables.java, Fail.java
│   └── Labels.java, Assert.java
├── trigger/                                             Track D — event-driven
│   ├── Schedule.java, Webhook.java
│   └── Flow.java
├── log/                                                 Deferred
├── metric/                                              Deferred
├── condition/                                           Track D
├── namespace/                                           Deferred
├── debug/                                               Deferred
├── output/                                              Deferred
├── state/                                               Deprecated in Kestra (use KV)
├── purge/                                               Deferred
├── runner/                                              Deferred
├── templating/                                          Deferred
└── dashboard/                                           Deferred
```

---

## Common/Global Base Files — Tier Classification

Every file kt/ needs to build falls into one of three categories: Tier 1 (every connector uses it), Tier 2 (depends on connector capabilities), or plugin-specific (only one connector family uses it).

### Tier 1 — Global: Every Connector, Every Time

These files are touched by every single plugin execution regardless of what the connector does.

```
blockdata/
├── core/
│   ├── models/
│   │   ├── flows/
│   │   │   └── state.py              NEW — State enum (CREATED, RUNNING, SUCCESS,
│   │   │                                    FAILED, WARNING, KILLED, SKIPPED)
│   │   │                                    Referenced by: every task result, every
│   │   │                                    execution, every trigger evaluation
│   │   │                                    Kestra source: core/models/flows/State.java
│   │   │
│   │   ├── property.py               EXISTS ✓ — Property[T], no changes needed
│   │   │
│   │   └── tasks/
│   │       ├── task.py               EXISTS ∼ — EXPAND with:
│   │       │                                    timeout: Property[int] | None
│   │       │                                    retry: dict | None
│   │       │                                    disabled: bool = False
│   │       │                                    run_if: str | None
│   │       │                                    allow_failure: bool = False
│   │       │                                    allow_warning: bool = False
│   │       │                                    Kestra source: core/models/tasks/Task.java
│   │       │
│   │       ├── output.py             EXISTS ∼ — EXPAND with:
│   │       │                                    final_state() → State | None
│   │       │                                    to_dict() → dict
│   │       │                                    Kestra source: core/models/tasks/Output.java
│   │       │
│   │       └── common.py             EXISTS ✓ — FetchType, no changes needed
│   │
│   └── runners/
│       └── run_context.py            EXISTS ∼ — ADD STUBS:
│                                              decrypt(encrypted: str) → str
│                                              encrypt(plaintext: str) → str
│                                              plugin_configuration(name: str) → Any
│                                              Kestra source: core/runners/RunContext.java
│
├── worker/
│   ├── worker_task.py                NEW — Task dispatch envelope
│   │                                        Carries: task instance, task_run_id,
│   │                                        execution_id, state, attempt_number
│   │                                        Kestra source: worker/WorkerTask.java
│   │
│   ├── worker_task_result.py         NEW — Task result envelope
│   │                                        Carries: output, final state, metrics,
│   │                                        duration_ms, attempt_number, logs
│   │                                        Kestra source: worker/WorkerTaskResult.java
│   │
│   └── runner.py                     NEW — Attempt lifecycle
│                                            1. Check task.disabled → SKIPPED
│                                            2. Evaluate task.run_if → SKIPPED if false
│                                            3. Set state → RUNNING
│                                            4. Call task.run(run_context) with timeout
│                                            5. Catch exceptions → FAILED
│                                            6. Apply task.allow_failure → WARNING
│                                            7. Return WorkerTaskResult
│                                            Kestra source: worker/DefaultWorker.runAttempt()
│
├── queues/
│   └── queue.py                      NEW — Dispatch boundary between executor and worker
│                                            In-memory initially; preserves execution graph
│                                            structure and enables distributed workers later
│                                            Kestra source: core/queues/QueueInterface.java
│
├── executor/                         NEW (future) — Execution lifecycle
│   └── (execution_service.py)               Scheduling, state transitions,
│                                            result joining — needed when
│                                            multi-step pipelines are built
│                                            Kestra source: executor/ExecutorService.java,
│                                            jdbc/runner/JdbcExecutor.java
│
└── runtime/                          EXISTS — HTTP + dispatch layer only
    ├── execution.py                         Param normalization, build_task,
    │                                        delegates to worker/runner.py
    ├── registry.py                          task_type → class mapping
    ├── connection.py                        Credential resolution
    └── routes.py                            FastAPI HTTP layer
```

**Why these are Tier 1:** A connector that does nothing but `return Output()` still goes through State, Task base fields, runner lifecycle, and result envelope. There is no execution path that skips them.

### Tier 2 — Conditional: Depends on Connector Capabilities

These files are needed only when a connector uses a specific capability.

```
CAPABILITY: Bulk I/O (read/write artifacts between pipeline steps)
─────────────────────────────────────────────────────────────────
Needed by: MongoDB Find(store=true), Load, Bulk, JDBC Query,
           GCS Download, S3 List, any future ETL connector

├── core/serializers/
│   └── file_serde.py                 NEW — Formal JSONL encode/decode abstraction
│                                            Currently inline json.dumps in each task.
│                                            Kestra source: core/serializers/FileSerde.java
│
└── core/storages/
    └── storage.py                    EXPAND — Pluggable storage interface
                                               Currently: LocalStorage (filesystem)
                                               Needs: Supabase backend, S3/GCS backend
                                               Kestra source: core/storages/StorageInterface.java


CAPABILITY: Polling Triggers (watch external system on interval)
────────────────────────────────────────────────────────────────
DEFERRED — Triggers depend on Flows. Plans exist but this is last priority,
behind connectors, orchestration, and Flows.

Needed by: MongoDB Trigger, JDBC Trigger, S3 Trigger, SFTP Trigger

├── core/models/triggers/
│   └── trigger_context.py            DEFERRED — Last poll time, trigger state, interval
│                                                Kestra source: core/models/triggers/TriggerContext.java
│
└── core/models/conditions/
    └── condition_context.py          DEFERRED — Wraps RunContext + condition evaluation
                                                 Kestra source: core/models/conditions/ConditionContext.java


CAPABILITY: Automatic Retry on Failure
──────────────────────────────────────
Needed by: Any connector hitting flaky APIs — HTTP, cloud services,
           rate-limited endpoints, transient network errors

└── core/models/tasks/retrys/
    └── abstract_retry.py             NEW — max_attempts, backoff_type (exponential/linear),
                                             delay, retry_reasons, retry_messages
                                             Kestra source: core/models/tasks/retrys/AbstractRetry.java


CAPABILITY: State Persistence Across Executions
───────────────────────────────────────────────
Needed by: Incremental sync connectors, deduplication, cursor-based pagination

└── core/storages/
    └── kv_store.py                   NEW — Key-value store interface
                                             get(key), put(key, value), delete(key), keys()
                                             Kestra source: core/storages/kv/KVStore.java


CAPABILITY: Standalone Credential Encryption
────────────────────────────────────────────
Needed by: Any connector resolving encrypted credentials when running
           outside platform-api (standalone mode, testing, CI)

└── core/encryption/
    └── encryption_service.py         NEW — AES-GCM encrypt/decrypt
                                             Currently delegated to platform-api
                                             Kestra source: core/encryption/EncryptionService.java
```

### Tier 2 — Which Connectors Need What

| Connector family | Bulk I/O | Triggers | Retry | KV Store | Encryption |
|---|---|---|---|---|---|
| **MongoDB** | ✓ Find(store), Load, Bulk | ✓ Trigger | — | — | — |
| **JDBC** (PostgreSQL, MySQL, etc.) | ✓ Query, Batch | ✓ JDBC Trigger | ✓ transient DB errors | — | — |
| **GCP** (GCS, BigQuery) | ✓ List, Download, Upload | ✓ GCS Trigger | ✓ rate limits | — | — |
| **AWS** (S3, DynamoDB) | ✓ List, Download, Upload | ✓ S3 Trigger | ✓ rate limits | — | — |
| **HTTP** (Request, Download) | ∼ Download only | ✓ HTTP Trigger | ✓ 429/5xx | — | — |
| **Notifications** (Slack, email) | — | — | ✓ rate limits | — | — |
| **Scripts** (Python, Shell, Node) | ✓ outputFiles | — | — | — | — |
| **FS** (SFTP, FTP) | ✓ Download, Upload | ✓ file watcher | ✓ connection drops | — | — |

### Plugin-Specific Files (Not Shared)

These exist only inside one connector family. No other connector uses them.

```
connectors/mongodb/                  ← ALL 14 files are MongoDB-specific
├── abstract_task.py                   MongoDB's connection + db + collection base
├── abstract_load.py                   MongoDB's chunked bulk write pattern
├── mongodb_connection.py              MongoClient creation from URI
├── mongodb_service.py                 BSON ↔ Python type mapping
├── write_models.py                    MongoDB bulk operation types
├── find.py                            MongoDB find()
├── aggregate.py                       MongoDB aggregate()
├── insert_one.py                      MongoDB insertOne()
├── delete.py                          MongoDB deleteOne/deleteMany()
├── update.py                          MongoDB updateOne/updateMany/replaceOne()
├── load.py                            JSONL → MongoDB insert
├── bulk.py                            NDJSON → MongoDB mixed bulk ops
├── trigger.py                         MongoDB polling trigger
└── package_info.py                    Module metadata
```

When PostgreSQL lands, it will have its own `connectors/postgresql/` with its own `abstract_task.py`, `postgresql_connection.py`, `query.py`, `batch.py`, etc. None of those will share files with MongoDB. They share only the Tier 1 and Tier 2 base files above.

---

## Summary Counts

| Layer | Kestra files (relevant) | kt/ files | Coverage |
|-------|------------------------|-----------|----------|
| Model/annotations | ~15 | 0 | — (not needed in Python) |
| Core models (tasks, property, triggers, executions) | ~60 | 3 | ∼ Task + Property + FetchType only |
| Core runners (RunContext, Worker, Executor) | ~25 | 1 | ∼ RunContext only, worker/executor compressed |
| Core serializers | ~12 | 0 | ✓ (json stdlib replaces Ion/Jackson) |
| Core plugins (registry, scanner) | ~24 | 1 | ∼ explicit registration |
| Core services | ~27 | 0 | ✗ (ExecutionService, TriggerService missing) |
| Core infrastructure (encryption, storage, queues, secrets) | ~40 | 0 | ✗ (LocalStorage only) |
| Worker module | ~8 | 1 | ∼ (all compressed into execution.py) |
| Executor module | ~3 | 0 | ✗ |
| JDBC runner | ~5 | 0 | ✗ |
| **MongoDB plugin** | **13** | **14** | **✓ (1:1 + write_models.py)** |
| HTTP layer | ~10 | 2 | ✓ (routes.py + main.py) |
| **Total relevant** | **~245** | **22** | Connector ✓, Runtime ∼ |

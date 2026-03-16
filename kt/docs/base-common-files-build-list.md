# Base/Common Files Build List

The complete list of global infrastructure files needed before any connector can run through a structurally faithful execution path. These are not plugin-specific — every connector family (MongoDB, PostgreSQL, GCS, etc.) goes through them.

---

## Already Built (8)

| # | File | Kestra source | Status |
|---|---|---|---|
| 1 | `blockdata/core/models/property.py` | Property.java | ✓ Complete |
| 2 | `blockdata/core/models/tasks/task.py` | Task.java, RunnableTask.java | ∼ Exists, needs expansion (see #12 below) |
| 3 | `blockdata/core/models/tasks/common.py` | FetchType.java | ✓ Complete |
| 4 | `blockdata/core/runners/run_context.py` | RunContext.java, DefaultRunContext.java | ∼ Exists, needs expansion (see #13 below) |
| 5 | `blockdata/runtime/execution.py` | DefaultWorker + ExecutorService (compressed) | ∼ Exists, needs refactor (see #14 below) |
| 6 | `blockdata/runtime/registry.py` | PluginRegistry.java, PluginScanner.java | ✓ Complete |
| 7 | `blockdata/runtime/connection.py` | Secret backend + BD credential store | ✓ Complete |
| 8 | `blockdata/runtime/routes.py` | ExecutionController (Spring) → FastAPI | ✓ Complete |

---

## New Files (11)

| # | File | Kestra source | What it does |
|---|---|---|---|
| 1 | `blockdata/core/models/flows/state.py` | State.java | State enum (CREATED, RUNNING, SUCCESS, FAILED, WARNING, KILLED, SKIPPED) |
| 2 | `blockdata/core/models/tasks/output.py` | Output.java | Output base with final_state(), to_dict() |
| 3 | `blockdata/core/serializers/file_serde.py` | FileSerde.java | Formal JSONL encode/decode abstraction for bulk I/O between steps |
| 4 | `blockdata/core/storages/storage.py` | StorageInterface.java | Pluggable storage interface (local → Supabase → S3/GCS) |
| 5 | `blockdata/core/runners/run_context_initializer.py` | RunContextInitializer.java | Hydrate RunContext from execution metadata, prior task outputs, flow variables |
| 6 | `blockdata/queues/queue.py` | QueueInterface.java | In-memory dispatch boundary between executor and worker |
| 7 | `blockdata/worker/worker_task.py` | core/runners/WorkerTask.java | Task dispatch envelope — carries task + task_run_id + execution_id + state + attempt |
| 8 | `blockdata/worker/worker_task_result.py` | core/runners/WorkerTaskResult.java | Result envelope — carries output + final state + metrics + duration + attempt |
| 9 | `blockdata/worker/abstract_worker_callable.py` | AbstractWorkerCallable.java | Exception mapping, kill semantics, broad try/catch wrapper |
| 10 | `blockdata/worker/worker_task_callable.py` | WorkerTaskCallable.java | Invokes task.run(runContext) inside the callable wrapper |
| 11 | `blockdata/worker/runner.py` | DefaultWorker.runAttempt() | Attempt lifecycle: disabled → run_if → timeout → run → allow_failure → result |

## Expand Existing (3)

| # | File | What to add |
|---|---|---|
| 12 | `blockdata/core/models/tasks/task.py` | timeout, retry, disabled, run_if, allow_failure, allow_warning |
| 13 | `blockdata/core/runners/run_context.py` | encrypt(), decrypt(), plugin_configuration(), fuller hydration surface |
| 14 | `blockdata/runtime/execution.py` | Shrink to dispatch/build/delegate — stop owning the whole runtime, hand off to worker/runner |

## Total: 14

---

## Deferred (9)

These are needed later, behind specific milestones. The first 6 are capability-gated; the last 3 (trigger worker files) are Flows-dependent.

| File | Kestra source | Waiting on |
|---|---|---|
| `blockdata/executor/execution_service.py` | ExecutorService.java, JdbcExecutor.java | Multi-step pipelines (Track C) |
| `blockdata/core/models/triggers/trigger_context.py` | TriggerContext.java | Flows — triggers are Flows-dependent, last priority |
| `blockdata/core/models/conditions/condition_context.py` | ConditionContext.java | Flows — conditions evaluated at trigger time |
| `blockdata/core/models/tasks/retrys/abstract_retry.py` | AbstractRetry.java | After core runtime works end-to-end |
| `blockdata/core/storages/kv_store.py` | KVStore.java | When pipelines need state persistence across executions |
| `blockdata/core/encryption/encryption_service.py` | EncryptionService.java | When kt/ runs standalone without platform-api |
| `blockdata/worker/worker_trigger.py` | core/runners/WorkerTrigger.java | Flows — trigger dispatch envelope |
| `blockdata/worker/worker_trigger_result.py` | core/runners/WorkerTriggerResult.java | Flows — trigger result envelope |
| `blockdata/worker/worker_trigger_callable.py` | worker/WorkerTriggerCallable.java | Flows — trigger-specific callable |

---

## Not Planned — Acknowledged Gap (1)

| Kestra source | What it does | Why deferred |
|---|---|---|
| model/WorkerJobLifecycle.java | Kill/stop hooks for graceful task cancellation | runner.py handles timeout at attempt level; user-initiated kill needs this later |

---

## Comprehensive Total: All Base/Common Files (28)

| # | File | Status |
|---|---|---|
| | **CORE MODELS** | |
| 1 | `blockdata/core/models/property.py` | ✓ Built |
| 2 | `blockdata/core/models/tasks/task.py` | ∼ Built, expand |
| 3 | `blockdata/core/models/tasks/common.py` | ✓ Built |
| 4 | `blockdata/core/models/tasks/output.py` | **Build now** |
| 5 | `blockdata/core/models/flows/state.py` | **Build now** |
| | **CORE RUNNERS** | |
| 6 | `blockdata/core/runners/run_context.py` | ∼ Built, expand |
| 7 | `blockdata/core/runners/run_context_initializer.py` | **Build now** |
| | **CORE SERIALIZERS** | |
| 8 | `blockdata/core/serializers/file_serde.py` | **Build now** |
| | **CORE STORAGES** | |
| 9 | `blockdata/core/storages/storage.py` | **Build now** |
| | **QUEUES** | |
| 10 | `blockdata/queues/queue.py` | **Build now** |
| | **WORKER** | |
| 11 | `blockdata/worker/worker_task.py` | **Build now** |
| 12 | `blockdata/worker/worker_task_result.py` | **Build now** |
| 13 | `blockdata/worker/abstract_worker_callable.py` | **Build now** |
| 14 | `blockdata/worker/worker_task_callable.py` | **Build now** |
| 15 | `blockdata/worker/runner.py` | **Build now** |
| | **RUNTIME** | |
| 16 | `blockdata/runtime/execution.py` | ∼ Built, refactor |
| 17 | `blockdata/runtime/registry.py` | ✓ Built |
| 18 | `blockdata/runtime/connection.py` | ✓ Built |
| 19 | `blockdata/runtime/routes.py` | ✓ Built |
| | **DEFERRED** | |
| 20 | `blockdata/executor/execution_service.py` | Later — multi-step pipelines |
| 21 | `blockdata/core/models/triggers/trigger_context.py` | Later — Flows |
| 22 | `blockdata/core/models/conditions/condition_context.py` | Later — Flows |
| 23 | `blockdata/core/models/tasks/retrys/abstract_retry.py` | Later — after core runtime |
| 24 | `blockdata/core/storages/kv_store.py` | Later — state persistence |
| 25 | `blockdata/core/encryption/encryption_service.py` | Later — standalone mode |
| 26 | `blockdata/worker/worker_trigger.py` | Later — Flows |
| 27 | `blockdata/worker/worker_trigger_result.py` | Later — Flows |
| 28 | `blockdata/worker/worker_trigger_callable.py` | Later — Flows |

**Summary: 8 built, 3 expand, 11 build now, 9 deferred**

> **Source path note:** WorkerTask.java, WorkerTaskResult.java, WorkerTrigger.java, and WorkerTriggerResult.java live in `core/src/main/java/io/kestra/core/runners/`, not in the `worker/` module. The `worker/` module contains only DefaultWorker.java, the callables, and WorkerSecurityService.java.

---

## Dependency Order

Build in this order — each file only depends on files above it.

```
1.  state.py              ← no dependencies
2.  output.py             ← depends on state.py
3.  task.py (expand)      ← depends on state.py, output.py
4.  file_serde.py         ← no internal dependencies
5.  storage.py            ← no internal dependencies
6.  run_context.py (expand) ← depends on storage.py
7.  run_context_initializer.py ← depends on run_context.py
8.  queue.py              ← depends on state.py
9.  worker_task.py        ← depends on task.py, state.py
10. worker_task_result.py ← depends on output.py, state.py
11. abstract_worker_callable.py ← depends on worker_task.py, worker_task_result.py
12. worker_task_callable.py ← depends on abstract_worker_callable.py, run_context.py
13. runner.py             ← depends on worker_task_callable.py, run_context_initializer.py
14. execution.py (shrink) ← depends on runner.py, queue.py, registry.py
```

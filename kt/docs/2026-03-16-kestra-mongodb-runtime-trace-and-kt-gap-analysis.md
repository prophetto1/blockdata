# Kestra MongoDB Runtime Trace and `kt` Gap Analysis

Date: 2026-03-16
Reviewer: Codex

## Purpose

This note traces how the MongoDB integration actually operates across the real Kestra repos and compares that structure against the current `kt/blockdata` implementation.

The goal is not just feature comparison. It is to answer four stricter questions:

1. Which MongoDB files in `kestra-io` own connector behavior
2. Which files in main Kestra own runtime behavior around those connectors
3. Which caller/callee edges are part of the real operating structure
4. What `kt/blockdata` still compresses, omits, or intentionally changes

## Repositories Traced

### Kestra plugin repo

- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/AbstractTask.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/AbstractLoad.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/MongoDbConnection.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/MongoDbService.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Find.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Aggregate.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Load.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Bulk.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/InsertOne.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Update.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Delete.java`
- `e:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Trigger.java`

### Kestra main repo

- `e:/kestra/core/src/main/java/io/kestra/core/models/tasks/RunnableTask.java`
- `e:/kestra/core/src/main/java/io/kestra/core/models/tasks/Task.java`
- `e:/kestra/core/src/main/java/io/kestra/core/runners/RunContext.java`
- `e:/kestra/core/src/main/java/io/kestra/core/runners/RunContextInitializer.java`
- `e:/kestra/core/src/main/java/io/kestra/core/runners/WorkerTask.java`
- `e:/kestra/core/src/main/java/io/kestra/core/runners/WorkerTaskResult.java`
- `e:/kestra/core/src/main/java/io/kestra/core/runners/WorkerTrigger.java`
- `e:/kestra/core/src/main/java/io/kestra/core/runners/WorkerTriggerResult.java`
- `e:/kestra/core/src/main/java/io/kestra/core/models/triggers/AbstractTrigger.java`
- `e:/kestra/core/src/main/java/io/kestra/core/models/triggers/PollingTriggerInterface.java`
- `e:/kestra/core/src/main/java/io/kestra/core/models/triggers/TriggerService.java`
- `e:/kestra/core/src/main/java/io/kestra/core/models/conditions/ConditionContext.java`
- `e:/kestra/worker/src/main/java/io/kestra/worker/AbstractWorkerCallable.java`
- `e:/kestra/worker/src/main/java/io/kestra/worker/AbstractWorkerTriggerCallable.java`
- `e:/kestra/worker/src/main/java/io/kestra/worker/WorkerTaskCallable.java`
- `e:/kestra/worker/src/main/java/io/kestra/worker/WorkerTriggerCallable.java`
- `e:/kestra/worker/src/main/java/io/kestra/worker/DefaultWorker.java`
- `e:/kestra/executor/src/main/java/io/kestra/executor/ExecutorService.java`
- `e:/kestra/jdbc/src/main/java/io/kestra/jdbc/runner/JdbcExecutor.java`

### `kt/blockdata`

- `e:/writing-system/kt/blockdata/runtime/routes.py`
- `e:/writing-system/kt/blockdata/runtime/execution.py`
- `e:/writing-system/kt/blockdata/runtime/registry.py`
- `e:/writing-system/kt/blockdata/runtime/connection.py`
- `e:/writing-system/kt/blockdata/core/models/tasks/task.py`
- `e:/writing-system/kt/blockdata/core/models/property.py`
- `e:/writing-system/kt/blockdata/core/models/tasks/common.py`
- `e:/writing-system/kt/blockdata/core/runners/run_context.py`
- `e:/writing-system/kt/blockdata/connectors/mongodb/*.py`

## Executive Conclusion

The MongoDB connector family in `kt/blockdata` is reasonably faithful to the MongoDB connector family in `kestra-io`.

The runtime around that family is not yet faithful to how Kestra actually operates.

That means:

- `kt` is already a decent MongoDB connector core
- `kt` is not yet a Kestra-shaped execution runtime for that connector core

The biggest gap is not in the leaf MongoDB task classes. The biggest gap is that main Kestra runs those leaves through worker envelopes, trigger envelopes, run-context hydration, attempt wrappers, callable wrappers, result envelopes, and executor joins, while `kt` still executes them through a direct local dispatcher.

## Kestra MongoDB Plugin Structure

### Shared connector substrate

The MongoDB plugin family in `kestra-io` is built around four shared files:

- `AbstractTask`
- `AbstractLoad`
- `MongoDbConnection`
- `MongoDbService`

Those files provide the family-level reusable behavior:

- connection object shape
- collection resolution from `database` and `collection`
- document rendering into BSON
- document mapping back to plain outputs
- shared load/bulk file ingestion

This is visible in:

- `AbstractTask.collection(...)`
- `MongoDbConnection.client(...)`
- `MongoDbService.toDocument(...)`
- `MongoDbService.map(...)`
- `AbstractLoad.run(...)`

### Thin task leaves

Concrete MongoDB task classes stay narrow:

- `Find` performs query options plus fetch/store handling
- `Aggregate` performs pipeline execution plus fetch/store handling
- `InsertOne`, `Update`, and `Delete` perform single-operation CRUD writes
- `Load` converts stored rows into `InsertOneModel`
- `Bulk` converts NDJSON operations into Mongo write models
- `Trigger` composes `Find` and then delegates execution creation to `TriggerService`

This is exactly the kind of connector-family pattern worth preserving.

## Kestra Task Execution Path

For normal MongoDB tasks, the real task path is:

1. `JdbcExecutor` schedules worker work and emits `WorkerTask`
2. `ExecutorService` tracks worker task results and merges them into the execution
3. `DefaultWorker` receives the `WorkerTask`
4. `RunContextInitializer.forWorker(...)` hydrates the run context
5. `DefaultWorker.runAttempt(...)` emits a running attempt and prepares output capture
6. `WorkerTaskCallable.doCall()` invokes `task.run(runContext)`
7. `AbstractWorkerCallable.call()` handles broad exception mapping and kill semantics
8. `DefaultWorker` saves outputs, metrics, assets, and emits `WorkerTaskResult`
9. `ExecutorService.addWorkerTaskResult(...)` joins the result back into execution state

Key files and methods:

- `JdbcExecutor.java:650-697`
- `WorkerTask.java:17-54`
- `RunContextInitializer.java:76-135`
- `DefaultWorker.java:680-815`
- `DefaultWorker.java:893-1001`
- `WorkerTaskCallable.java:57-95`
- `AbstractWorkerCallable.java:59-120`
- `WorkerTaskResult.java:17-33`
- `ExecutorService.java:1155-1273`

### What matters structurally

The plugin leaf does not own:

- timeout handling
- retry or warning policy
- kill/stop lifecycle
- attempt emission
- result envelope creation
- output persistence into execution state
- dynamic task-run propagation

Those are runtime concerns in main Kestra, not connector concerns in `kestra-io`.

## Kestra Trigger Execution Path

MongoDB trigger execution is a separate path, not a light variation of task execution.

The real polling trigger path is:

1. `WorkerTrigger` carries the trigger, `TriggerContext`, and `ConditionContext`
2. `RunContextInitializer.forWorker(... workerTrigger)` prepares a trigger-oriented run context
3. `DefaultWorker` routes polling triggers through `WorkerTriggerCallable`
4. `WorkerTriggerCallable.doCall()` invokes `pollingTrigger.evaluate(conditionContext.withRunContext(runContext), triggerContext)`
5. `Trigger.evaluate(...)` constructs a `Find`, runs it, and if rows exist calls `TriggerService.generateExecution(...)`
6. `DefaultWorker` publishes the resulting execution through trigger result handling

Key files and methods:

- `WorkerTrigger.java:14-36`
- `RunContextInitializer.java:207-259`
- `DefaultWorker.java:573-640`
- `AbstractWorkerTriggerCallable.java:10-46`
- `WorkerTriggerCallable.java:14-32`
- `Trigger.java:125-154`
- `TriggerService.java:15-75`

### What matters structurally

The MongoDB trigger is not just:

- `Trigger.evaluate(run_context) -> dict`

It is:

- a polling trigger interface implementation
- evaluated inside a trigger worker path
- carrying trigger and condition context
- producing an `Execution`, not just output rows

## What `kt/blockdata` Preserves Well

### Connector-family layering

`kt/blockdata` preserves the family graph fairly well:

- `abstract_task.py`
- `abstract_load.py`
- `mongodb_connection.py`
- `mongodb_service.py`
- thin concrete leaves like `find.py`, `aggregate.py`, `insert_one.py`, `update.py`, `delete.py`, `load.py`, `bulk.py`, and `trigger.py`

That is close to the `kestra-io` plugin family shape.

### Leaf behavior

For the normal CRUD and query operations, the translated leaves mostly preserve the expected behaviors:

- rendered filter/document handling
- collection resolution
- projection/sort/skip/limit in `Find`
- pipeline execution in `Aggregate`
- `_id` derivation in `Load`
- mixed write-model parsing in `Bulk`
- result mapping into plain Python outputs

### BlockData-native additions that make sense

Some differences are legitimate platform choices:

- public names changed from `io.kestra...` to `blockdata...`
- connection resolution can use `connection_id`
- execution is exposed through a FastAPI route
- results are serialized for an HTTP-friendly execution shell

These are acceptable divergences.

## What `kt/blockdata` Still Compresses or Misses

### 1. Runtime graph is flattened

Current `kt` runtime flow:

1. route receives HTTP request
2. registry resolves class
3. execution layer builds task object
4. execution layer builds `RunContext`
5. execution layer calls `task.run(...)` or `task.evaluate(...)`
6. execution layer serializes output

This happens in:

- `routes.py`
- `execution.py`

That is much flatter than the real Kestra path.

Missing runtime nodes:

- `WorkerTask` equivalent
- `WorkerTaskResult` equivalent
- trigger worker envelope equivalent
- runner/attempt/callable split
- intermediate state emission
- executor join layer

### 2. Trigger runtime is not equivalent

Current `kt` trigger:

- takes only `RunContext`
- directly builds `Find`
- returns a plain dict payload

This happens in `trigger.py`.

What is missing relative to Kestra:

- `ConditionContext`
- `TriggerContext`
- polling trigger interface semantics
- `WorkerTrigger`
- `WorkerTriggerCallable`
- `TriggerService.generateExecution(...)`
- execution object generation from trigger output

### 3. `RunContext` is much smaller than Kestra's

Current `kt` `RunContext` gives:

- render
- logger
- local storage
- working directory
- simple metrics

Missing runtime-bearing capabilities include:

- plugin configuration
- richer task and trigger variables
- output rehydration
- secret-consumer plumbing
- dynamic worker results
- log file URI capture
- validation
- encryption helpers
- local path access
- state store / KV / SDK surfaces

### 4. `Task` base is too small

Kestra `Task` carries runtime-relevant fields used by the worker:

- timeout
- retry
- runIf
- allowFailure
- allowWarning
- worker group
- assets

Current `kt` `Task` only carries:

- `id`
- `type`

That is enough for local execution, but not for a reusable runtime substrate.

### 5. `AbstractLoad` semantics are only partially preserved

Kestra `AbstractLoad.run(...)`:

- reads from internal storage
- groups source records into chunks
- calls Mongo `bulkWrite(...)`
- aggregates the real `BulkWriteResult`

Current `kt` `AbstractLoad.run(...)`:

- also groups records into chunks
- but `_apply_bulk(...)` executes operations one by one instead of delegating a true bulk write

That changes:

- performance profile
- error shape
- batching behavior

### 6. `Bulk` option coverage is incomplete

Kestra `Bulk` preserves more Mongo operation options:

- `upsert`
- `bypassDocumentValidation`
- `collation`
- `arrayFilters`

Current `kt` `Bulk` only preserves:

- `upsert`

### 7. `Aggregate` parity is incomplete

Kestra `Aggregate` actively applies:

- `allowDiskUse`
- `maxTimeMs`
- `batchSize`
- `FetchType` handling

Current `kt` `Aggregate` defines most of those fields but only materially applies:

- `allow_disk_use`

The rest are partial or inert.

### 8. Stored-result fidelity differs

Kestra stores query and aggregation outputs through `FileSerde` into internal storage and preserves BSON-derived data more carefully.

Current `kt` stores JSONL via `json.dumps(..., default=str)`.

That is acceptable for now, but it is not storage-fidelity parity.

## Concrete Mapping: Present, Partial, Missing

### Present enough at the connector-family level

- `AbstractTask` -> `abstract_task.py`
- `MongoDbConnection` -> `mongodb_connection.py`
- `MongoDbService` -> `mongodb_service.py`
- `AbstractLoad` -> `abstract_load.py`
- `Find` -> `find.py`
- `Aggregate` -> `aggregate.py`
- `InsertOne` -> `insert_one.py`
- `Update` -> `update.py`
- `Delete` -> `delete.py`
- `Load` -> `load.py`
- `Bulk` -> `bulk.py`
- `Trigger` composing `Find` -> `trigger.py`

### Partial runtime counterparts

- `RunnableTask.run(RunContext)` -> task `run(...)` methods in connector files
- `RunContext` -> `run_context.py`
- task type resolution -> `registry.py`
- execution entrypoint -> `execution.py`
- HTTP adapter -> `routes.py`

### Missing or significantly compressed runtime counterparts

- `WorkerTask`
- `WorkerTaskResult`
- `WorkerTrigger`
- `WorkerTriggerResult`
- `RunContextInitializer`
- `AbstractWorkerCallable`
- `WorkerTaskCallable`
- `WorkerTriggerCallable`
- `DefaultWorker.runAttempt(...)`
- `DefaultWorker.callJob(...)`
- `ExecutorService.addWorkerTaskResult(...)`
- `JdbcExecutor` scheduling and state-transition path

## Practical Assessment

If the question is:

"Can `kt` already serve as the MongoDB connector implementation core?"

The answer is yes.

If the question is:

"Does `kt` already operate MongoDB the way MongoDB operates inside Kestra?"

The answer is no, not yet.

The connector-family structure is the strong part.
The missing work is mostly the runtime shell around that family.

## Recommended Next Work

### Highest-value structural additions

1. Add a `TaskInvocation` envelope as the `WorkerTask` counterpart
2. Add a `TaskResult` envelope as the `WorkerTaskResult` counterpart
3. Split `execution.py` into:
   - route adapter
   - invocation builder
   - runner
   - attempt wrapper
   - result serializer
4. Add explicit task states outside the connector leaf
5. Add a trigger substrate:
   - `ConditionContext`
   - `TriggerContext`
   - trigger invocation envelope
   - execution generation service

### Highest-value Mongo parity fixes

1. Apply `Aggregate.max_time_ms`
2. Apply `Aggregate.batch_size`
3. Extend `Bulk` to support:
   - `bypassDocumentValidation`
   - `collation`
   - `arrayFilters`
4. Move `AbstractLoad` closer to true bulk-write semantics

## Final Verdict

The traced source is clear:

- Kestra keeps MongoDB connector logic thin
- Kestra centralizes runtime behavior outside the connector family
- `kt` has already preserved much of the connector-family graph
- `kt` has not yet preserved the full executor/worker/trigger runtime graph

So the current `kt` codebase is best described as:

- a good BlockData-native MongoDB connector family
- a partial Kestra-inspired runtime shell
- not yet a full structural equivalent of how MongoDB actually operates in Kestra

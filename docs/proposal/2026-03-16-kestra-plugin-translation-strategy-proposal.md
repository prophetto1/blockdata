# Proposal: Source-Verified Strategy for Kestra Plugin Translation in BlockData

Date: 2026-03-15
Author: Codex
Status: Proposal
Primary input: `E:\writing-system\docs\plans\2026-03-16-kestra-plugin-translation-problem-statement.md`

## Purpose

This proposal converts the current problem statement into a source-verified decision proposal for the next planning pass.

Everything below is based on local source review in:

- `E:\writing-system`
- `E:\kestra`
- `E:\kestra-io`

Where a statement is a recommendation rather than a direct fact from source, it is labeled as an inference or proposal.

## Executive Recommendation

The recommended path is a bounded hybrid:

1. Treat translation eligibility as a class-level decision, not a repo-level decision.
2. Make MongoDB the first systematically extracted and translated plugin family, with all MongoDB functions gathered before implementation is split into waves.
3. Add a small BlockData translation substrate before broader plugin-family expansion.
4. Defer generator-first work until one real plugin family has been fully gathered and translated with stable contracts.
5. Defer flow control, subflow, trigger scheduling, and script-runtime parity to separate tracks.

This recommendation is an inference from the sources listed below. It is not copied from any single document.

## Source Corpus Reviewed

### BlockData repo

- `E:\writing-system\docs\plans\2026-03-16-kestra-plugin-translation-problem-statement.md`
- `E:\writing-system\docs\plans\2026-03-15-kestra-absorption-context-update.md`
- `E:\writing-system\docs\plans\2026-03-15-fastapi-execution-plane-systematic-buildout.md`
- `E:\writing-system\docs\fastapi\fastapi-integration.md`
- `E:\writing-system\services\platform-api\app\domain\plugins\models.py`
- `E:\writing-system\services\platform-api\app\domain\plugins\registry.py`
- `E:\writing-system\services\platform-api\app\api\routes\plugin_execution.py`
- `E:\writing-system\services\platform-api\app\api\routes\load_runs.py`
- `E:\writing-system\services\platform-api\app\infra\connection.py`
- `E:\writing-system\services\platform-api\app\plugins\gcs.py`
- `E:\writing-system\services\platform-api\app\plugins\arangodb.py`
- `E:\writing-system\supabase\migrations\20260303130000_067_integration_catalog_seed.sql`
- `E:\writing-system\supabase\migrations\20260303140000_068_kestra_plugin_satellite_seed.sql`
- `E:\writing-system\supabase\migrations\20260316020000_095_register_gcs_arangodb.sql`
- `E:\writing-system\supabase\migrations\20260316050000_096_reconciliation_cutover.sql`

### Kestra core repo

- `E:\kestra\README.md`
- `E:\kestra\settings.gradle`
- `E:\kestra\core\src\main\java\io\kestra\core\models\tasks\RunnableTask.java`
- `E:\kestra\core\src\main\java\io\kestra\core\models\tasks\FlowableTask.java`
- `E:\kestra\core\src\main\java\io\kestra\plugin\core\flow\If.java`
- `E:\kestra\core\src\main\java\io\kestra\plugin\core\flow\ForEachItem.java`
- `E:\kestra\core\src\main\java\io\kestra\plugin\core\flow\Subflow.java`
- `E:\kestra\core\src\main\java\io\kestra\plugin\core\http\Request.java`
- `E:\kestra\core\src\main\java\io\kestra\core\runners\*`

### Kestra plugin repo

- `E:\kestra-io\plugins\plugin-mongodb\build.gradle`
- `E:\kestra-io\plugins\plugin-mongodb\src\main\resources\metadata\index.yaml`
- `E:\kestra-io\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\AbstractTask.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\AbstractLoad.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\MongoDbConnection.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\MongoDbService.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Find.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Load.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\main\java\io\kestra\plugin\mongodb\Trigger.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\test\java\io\kestra\plugin\mongodb\FindTest.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\test\java\io\kestra\plugin\mongodb\LoadTest.java`
- `E:\kestra-io\plugins\plugin-mongodb\src\test\java\io\kestra\plugin\mongodb\CrudTest.java`
- `E:\kestra-io\plugins\plugin-serdes\build.gradle`
- `E:\kestra-io\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\csv\CsvToIon.java`
- `E:\kestra-io\plugins\plugin-scripts\plugin-script-python\src\main\java\io\kestra\plugin\scripts\python\Script.java`

## Source-Verified Repo Reality

### 1. `E:\kestra` is the orchestration engine, not just a plugin bundle

`E:\kestra\settings.gradle` includes `core`, `executor`, `scheduler`, `worker`, `webserver`, `runner-memory`, `repository-memory`, `storage-local`, `script`, and other runtime modules.

That matters because the core repo is not just a library of task classes. It contains the execution machinery those tasks rely on.

`E:\kestra\core\src\main\java\io\kestra\core\runners\` contains executor-facing classes such as `FlowableUtils`, `SubflowExecution`, `RunContext`, `WorkingDir`, `WorkerTask`, and related runtime types. This supports the problem statement's main claim that some task families are really executor features.

### 2. `E:\kestra-io\plugins` is broader than "external integration repos"

There are 131 first-level plugin directories under `E:\kestra-io\plugins`.

That count is real, but the set is mixed:

- connector-style plugins such as MongoDB, Cassandra, Couchbase, Elasticsearch, and AWS
- runtime-adjacent families such as `plugin-serdes`
- multi-runtime scripting families under `plugin-scripts`

`E:\kestra-io\plugins\plugin-scripts` alone contains many language-specific submodules, including Python, Shell, Node, R, Go, PowerShell, and others. So "external plugin repo" does not automatically mean "simple source or destination connector."

### 3. Kestra core translation boundary is at least three-way, not two-way

Under `E:\kestra\core\src\main\java\io\kestra\plugin\core`, source search shows:

- 41 classes implementing `RunnableTask`
- 13 classes implementing `FlowableTask`
- 2 classes implementing `ExecutableTask`

So the practical execution shapes are:

- `RunnableTask`: task performs work in `run(RunContext)`
- `FlowableTask`: task participates in graph resolution and executor control flow
- `ExecutableTask`: task creates subflow executions or executor-managed work

This tightens the problem statement. The true boundary is not only "integration plugin vs core plugin." It is also "runnable vs executor-managed behavior," even within core and external families.

### 4. The current BlockData runtime is usable, but not yet the full registry-driven target

Source-verified facts:

- `E:\writing-system\services\platform-api\app\domain\plugins\models.py` defines `BasePlugin`, `PluginOutput`, and `ExecutionContext`.
- `E:\writing-system\services\platform-api\app\domain\plugins\registry.py` auto-discovers Python plugin classes from code, not from the database.
- `E:\writing-system\docs\fastapi\fastapi-integration.md` explicitly says DB-driven function registry is still aspirational.
- `E:\writing-system\supabase\migrations\20260303130000_067_integration_catalog_seed.sql` seeds 945 entries into `integration_catalog_items`.
- `E:\writing-system\supabase\migrations\20260316020000_095_register_gcs_arangodb.sql` and `...096_reconciliation_cutover.sql` register GCS and ArangoDB functions as concrete FastAPI-backed runtime entries.

Conclusion from source: the catalog is real, the registry is real, but plugin discovery is still code-led.

### 5. There is a current auth/context gap that affects generic translation readiness

`E:\writing-system\services\platform-api\app\plugins\gcs.py` and `arangodb.py` call:

- `resolve_connection_sync(params["connection_id"], context.user_id)`

`E:\writing-system\services\platform-api\app\infra\connection.py` enforces that the connection row belongs to `user_id`.

But `E:\writing-system\services\platform-api\app\api\routes\plugin_execution.py` constructs `ExecutionContext(...)` without setting `user_id`, even though authenticated principal information is available through `auth`.

This means generic translated plugins that depend on user-scoped connections are not fully supported by the generic execution route yet. `load_runs.py` does pass `user_id`, so the execution plane is partly ready, not uniformly ready.

## What the Problem Statement Gets Right

These claims are supported by source:

### A. Runnable task translation is a real and useful category

`RunnableTask` in `E:\kestra\core\src\main\java\io\kestra\core\models\tasks\RunnableTask.java` is a simple execution contract centered on `run(RunContext)`.

MongoDB `Find` and `Load` in `plugin-mongodb` both follow that pattern. `Find.java` performs connection, collection selection, BSON filter/projection/sort handling, and either inline fetch or internal-storage write. `Load.java` reads an internal-storage file and bulk inserts in chunks through `AbstractLoad`.

Those are credible translation candidates for BlockData's `BasePlugin.run(params, context)`.

### B. Flow control is not a plain plugin-porting task

`If.java` implements `FlowableTask` and defines executor-facing methods such as `childTasks`, `resolveNexts`, and `outputs`.

`ForEachItem.java` adds `createSubflowExecutions` behavior and composes subflow execution machinery.

`Subflow.java` implements `ExecutableTask` and explicitly creates child executions.

These are not equivalent to the current BlockData plugin contract.

### C. Serdes and scripts are different from normal connector work

`CsvToIon.java` is runnable, but it depends on internal storage, file serialization, buffer management, bad-line policy, charset handling, and Ion output semantics.

`plugin-script-python/Script.java` is also runnable, but it carries environment management, dependency installation, container image behavior, output files, and runtime isolation concerns.

So the problem statement is correct to separate these from the simplest connector ports.

## What the Problem Statement Needs Tightened

These are source-backed corrections or refinements.

### 1. "External plugin" is too broad a translation category

Counterexample from source:

- `E:\kestra-io\plugins\plugin-mongodb\Trigger.java` is in an external plugin repo, but it implements `PollingTriggerInterface` and generates executions when query results are non-empty.

That makes it scheduler or trigger-surface work, not the same kind of work as `Find` or `Load`.

Proposed correction:

- classify translation targets by execution shape and runtime dependency, not by repo location

### 2. The current document undercounts the breadth of core domains

The first-level directories under `E:\kestra\core\src\main\java\io\kestra\plugin\core` are 17:

- `condition`
- `dashboard`
- `debug`
- `execution`
- `flow`
- `http`
- `kv`
- `log`
- `metric`
- `namespace`
- `output`
- `purge`
- `runner`
- `state`
- `storage`
- `templating`
- `trigger`

The current plan names some of these but not all. That is fine for a problem statement, but a proposal or implementation plan should use the actual domain inventory.

### 3. Generator-first work is not yet justified by the current runtime contract

This is an inference from the sources:

- the runtime registry is still code-discovered
- the generic plugin execution route does not yet propagate `user_id`
- parameter mapping rules are not yet canonical in the BlockData runtime
- source families are heterogeneous across connector, trigger, script, and serdes patterns

Because of that, generator-first work would automate unstable assumptions.

## Proposed Decision

The next implementation plan should commit to this bounded decision:

### Decision 1: Systematically extract the full MongoDB family before implementation broadens beyond the family

Required inventory:

- `io.kestra.plugin.mongodb.Find`
- `io.kestra.plugin.mongodb.Load`
- `io.kestra.plugin.mongodb.Aggregate`
- `io.kestra.plugin.mongodb.InsertOne`
- `io.kestra.plugin.mongodb.Update`
- `io.kestra.plugin.mongodb.Delete`
- `io.kestra.plugin.mongodb.Bulk`
- `io.kestra.plugin.mongodb.Trigger`

First execution wave:

- `io.kestra.plugin.mongodb.Find`
- `io.kestra.plugin.mongodb.Load`

Gathered now but deferred from the first execution wave:

- `io.kestra.plugin.mongodb.Trigger`
- all `FlowableTask` classes
- all `ExecutableTask` classes
- script runtime parity
- generator-first translation tooling

### Decision 2: Add a small translation substrate before family implementation broadens

This is a proposal based on source gaps in `writing-system`.

The MongoDB family effort should include reusable helpers for:

- recursive rendering of structured params
- artifact read/write helpers for internal storage style flows
- BSON-to-Python coercion compatible with observed Mongo behavior
- parameter and output contract mapping for translated plugins
- user-scoped execution context on translated plugin routes

### Decision 3: Keep translated plugins code-discovered for the current runtime phase

Because `registry.py` still drives discovery from Python modules, the current MongoDB family effort should fit that reality rather than pretending the DB-driven registry is already the active source of truth.

Translated plugins can still be registered in `service_functions`, but code discovery remains the actual execution mechanism in the current phase.

## Why MongoDB Should Go First

This recommendation is supported by source.

### MongoDB is small enough to gather fully and broad enough to matter

The MongoDB family is compact enough to inventory completely from source, and broad enough to exercise several meaningful task shapes:

- source-side querying
- destination-side loading
- CRUD utilities
- aggregation
- trigger behavior

That makes it a better first family than a one-off task port.

### `Find` and `Load` are still the best first execution wave

`Find.java` and `FindTest.java` show a well-bounded contract:

- BSON filter input
- projection and sort
- `limit` and `skip`
- inline rows or stored artifact
- stable output size
- preserved field order
- mapped timestamps and ObjectId values

`AbstractLoad.java` and `Load.java` show the corresponding destination-side shape:

- source artifact URI
- chunked bulk write
- metrics for record count and request count
- output counters for inserted, matched, modified, and deleted totals

`LoadTest.java` verifies that chunking and metric counts matter. That is valuable because it proves the destination side is not just "post JSON to Mongo."

### `Trigger` must be gathered now even if its implementation is deferred

`Trigger.java` generates executions through trigger interfaces. That is a different runtime responsibility from `Find` and `Load`, even though it lives in the same plugin family.

So the correct systematic move is to gather `Trigger` with the rest of MongoDB now, classify it as trigger-runtime work, and defer implementation explicitly rather than leaving it out of the family intake.

## Why Not Generator-First

This section is a proposal derived from the source corpus.

Generator-first is not recommended yet because the current repo does not have a stable canonical translation contract for:

- parameter schema shape
- result schema shape
- connection reference conventions
- storage artifact conventions
- auth and user ownership propagation
- which task families are genuinely translatable

Without that contract, generation would likely create volume faster than confidence.

## Why Not Core-First

Core-first is not recommended as the immediate next move.

Source evidence:

- `If`, `ForEachItem`, and `Subflow` are executor-facing
- `Request` is runnable and portable
- some core families are simple, but the core tree as a whole mixes three execution shapes

Inference:

A broad "core first" plan would either become too vague or quietly expand into engine work. That makes it a poor starting point compared with systematic MongoDB family extraction plus `Find` and `Load` as the first execution wave.

## Proposed Delivery Sequence

This is the proposed sequence for the next implementation plan.

### Phase 0: Translation readiness hardening

Required before claiming generic plugin translation readiness:

1. Ensure translated execution paths carry authenticated `user_id` into `ExecutionContext`.
2. Define the canonical BlockData translation contract for params, outputs, artifact URIs, and logs.
3. Decide whether translated MongoDB plugins are executed only from `load_runs` or also from the generic plugin route.

### Phase 1: MongoDB family extraction

Create a full extraction matrix for:

- `Find`
- `Load`
- `Aggregate`
- `InsertOne`
- `Update`
- `Delete`
- `Bulk`
- `Trigger`

Record:

- params
- defaults
- outputs
- storage behavior
- source/destination/utility/trigger role
- runtime dependencies

### Phase 2: MongoDB runnable family implementation

Implement and verify:

1. MongoDB translation helpers
2. `Find`
3. `Load`
4. `Aggregate`
5. `InsertOne`
6. `Update`
7. `Delete`
8. `Bulk`
9. registration metadata for MongoDB runnable functions
10. Python tests that mirror the meaningful assertions from `FindTest.java`, `LoadTest.java`, `CrudTest.java`, `AggregateTest.java`, and `BulkTest.java`

### Phase 3: MongoDB trigger boundary

After the runnable family is in place:

- fully document `Trigger`
- map its input and output contract
- identify the exact scheduler or execution capabilities BlockData lacks today
- defer implementation under an explicit trigger-runtime work item

### Phase 4: Post-family decision

Only after the family has been extracted and the runnable MongoDB set is stable should the team choose between:

- continued family-by-family hand translation
- metadata extraction tooling
- partial code generation for parameter and output scaffolding

## Required Constraints for the Follow-On Implementation Plan

The next implementation plan should explicitly include all of these:

### In scope

- exact plugin classes
- exact BlockData files to modify
- exact tests to add
- exact deferred items

### Out of scope

- flow orchestration
- subflow execution
- scheduling and trigger execution
- containerized script runtime parity
- broad generator automation

### Acceptance criteria

The MongoDB family effort should not be considered healthy unless it proves:

1. The full MongoDB task inventory is extracted from source before implementation broadens.
2. The full MongoDB task inventory is classified by role and runtime dependency.
3. MongoDB `Find` can return inline rows with correct size.
4. MongoDB `Find` can persist artifact output instead of inline rows.
5. Field order is preserved where the Kestra tests prove it matters.
6. Timestamp and ObjectId mappings are defined and verified.
7. MongoDB `Load` can consume an artifact and honor chunking.
8. Record count and request count are surfaced and verified.
9. The runnable MongoDB functions are registered consistently in BlockData's service metadata and code registry.
10. `Trigger` is explicitly captured and deferred with a concrete runtime rationale.
11. Translated plugin execution respects user-owned connection boundaries.

## Final Recommendation

Go forward with a source-verified, systematic MongoDB family translation effort.

Do not move directly into:

- generator-first automation
- trigger translation
- flow-control translation
- a broad "translate core" initiative

The most defensible next plan is:

1. harden translation readiness in the current FastAPI runtime
2. gather every MongoDB function and classify the entire family up front
3. translate the runnable MongoDB family with shared substrate work
4. capture `Trigger` explicitly as deferred trigger-runtime work
5. use that family effort to decide whether broader scaling should be manual, assisted, or generated

That is the smallest proposal that is honest about what the current repos prove and what they do not yet prove.

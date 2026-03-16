# Proposal: Systematic Translation of the Kestra MongoDB Plugin Family into BlockData

Date: 2026-03-16
Author: Codex
Status: Proposal

## Executive Summary

This proposal recommends a source-verified path for translating Kestra plugins into BlockData's Python execution plane, using the MongoDB plugin family as the first systematic catalog-sourced translation family.

The core conclusion is:

1. External integration plugins in `E:/kestra-io/plugins/` are directly portable into BlockData's `BasePlugin` model when they are `RunnableTask`-style tasks.
2. Kestra core flow-control plugins in `E:/kestra/core/src/main/java/io/kestra/plugin/core/flow/` are not simple plugin translations; they are orchestration engine features.
3. MongoDB should be treated as the first complete family to inventory, classify, and map, not as a narrow proof-of-concept.
4. `io.kestra.plugin.mongodb.Find` and `io.kestra.plugin.mongodb.Load` should still be the first execution wave because they establish the source/destination runtime contract.
5. Before broader translation, BlockData needs a small BD-native substrate that acts as a runtime adapter layer between Kestra task semantics and the existing FastAPI plugin system.

This proposal is based only on local source verification from:

- `E:/writing-system/docs/plans/2026-03-16-kestra-plugin-translation-problem-statement.md`
- `E:/writing-system/services/platform-api/...`
- `E:/kestra-io/plugins/plugin-mongodb/...`
- `E:/kestra/core/...`
- `E:/kestra/openapi.yml`

## Source Corpus Reviewed

### BlockData sources

- `E:/writing-system/docs/plans/2026-03-16-kestra-plugin-translation-problem-statement.md`
- `E:/writing-system/services/platform-api/app/domain/plugins/models.py`
- `E:/writing-system/services/platform-api/app/domain/plugins/registry.py`
- `E:/writing-system/services/platform-api/app/plugins/gcs.py`
- `E:/writing-system/services/platform-api/app/plugins/arangodb.py`

### Kestra plugin sources

- `E:/kestra-io/plugins/plugin-mongodb/build.gradle`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/resources/metadata/index.yaml`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/AbstractTask.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/MongoDbConnection.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/MongoDbService.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/AbstractLoad.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Find.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Load.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Aggregate.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/InsertOne.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Update.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Delete.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Bulk.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Trigger.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/test/java/io/kestra/plugin/mongodb/FindTest.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/test/java/io/kestra/plugin/mongodb/LoadTest.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/test/java/io/kestra/plugin/mongodb/CrudTest.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/test/java/io/kestra/plugin/mongodb/AggregateTest.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/test/java/io/kestra/plugin/mongodb/RunnerTest.java`
- `E:/kestra-io/plugins/plugin-mongodb/src/test/resources/flows/mongo-aggregate-example.yml`

### Kestra runtime sources

- `E:/kestra/openapi.yml`
- `E:/kestra/core/src/main/java/io/kestra/core/runners/RunContext.java`
- `E:/kestra/core/src/main/java/io/kestra/core/runners/RunContextProperty.java`
- `E:/kestra/core/src/main/java/io/kestra/core/models/tasks/Task.java`
- `E:/kestra/core/src/main/java/io/kestra/plugin/core/flow/WorkingDirectory.java`
- `E:/kestra/worker/src/main/java/io/kestra/worker/DefaultWorker.java`
- `E:/kestra/executor/src/main/java/io/kestra/executor/ExecutorService.java`

## What the Repos Prove

### 1. MongoDB is a direct translation candidate

The MongoDB plugin family in `E:/kestra-io/plugins/plugin-mongodb/` uses the standard Kestra integration pattern:

- a shared abstract task base
- a connection holder object
- per-task typed properties
- a `run(RunContext)` method for `RunnableTask` classes
- a task-specific output object
- tests that directly exercise runtime behavior

This is a good match for BlockData's current Python plugin architecture in `services/platform-api/app/domain/plugins/models.py`, where `BasePlugin.run(params, context)` is the main execution contract.

### 2. Kestra core is two different things, not one

The `E:/kestra/core/` repo contains both:

- core runnable primitives, such as logging, storage manipulation, debug helpers, HTTP helpers, KV/state tasks, and some serializers
- flow/orchestration primitives, such as `If`, `ForEach`, `Parallel`, `Sequential`, `Dag`, `Subflow`, and trigger families

These are not equivalent translation targets.

A `RunnableTask` maps to a Python plugin.

A `FlowableTask` requires:

- task graph resolution
- branching
- child task lifecycle management
- execution state propagation
- output merging
- templating and variable passing at orchestration scope

That is an orchestration engine problem, not a plugin porting problem.

### 3. BlockData already has a usable translation landing zone

The existing BlockData plugin system already provides:

- a `BasePlugin` abstraction
- a `PluginOutput` contract
- a simple render context
- storage upload support
- registry mapping from Kestra task type to function name

Specifically, `services/platform-api/app/domain/plugins/registry.py` already converts Kestra task types like:

- `io.kestra.plugin.mongodb.Find` -> `mongodb_find`
- `io.kestra.plugin.mongodb.Load` -> `mongodb_load`

That means BlockData can preserve Kestra task-class identity while still exposing BD-native aliases.

### 4. The current BlockData substrate is not enough by itself

The current plugin examples (`gcs.py`, `arangodb.py`) prove the general pattern, but they do not yet provide a generic translation substrate for database-style Kestra plugins.

MongoDB translation needs reusable helpers for:

- connection resolution to database clients
- BSON document coercion
- BSON-to-Python value mapping
- artifact download and upload
- chunked bulk ingestion
- param schema extraction and preservation

## What Information Must Be Extracted, and From Where

The translation effort should not start by writing Python code. It should start by extracting the translation contract from source.

### A. Plugin identity and catalog metadata

Extract from:

- `E:/kestra-io/plugins/plugin-mongodb/src/main/resources/metadata/index.yaml`
- `E:/kestra-io/plugins/plugin-mongodb/build.gradle`

Capture:

- Kestra plugin group
- plugin family title
- plugin family description
- task-class namespace
- any title/group metadata carried in Gradle manifest entries

Why:

- this is the canonical source for preserving Kestra identity in BlockData metadata and service registration

### B. Shared task substrate

Extract from:

- `AbstractTask.java`
- `MongoDbConnection.java`
- `MongoDbService.java`
- `AbstractLoad.java`

Capture:

- common required properties
- connection contract
- render-time behavior for database and collection names
- JSON/BSON input coercion rules
- BSON output mapping rules
- internal storage file contract
- bulk chunking behavior
- output counters and metrics

Why:

- these files contain the reusable logic that should become BD-native "lubricator" helpers

### C. Task-specific behavior

Extract from:

- `Find.java`
- `Load.java`
- `Aggregate.java`
- `InsertOne.java`
- `Update.java`
- `Delete.java`
- `Bulk.java`
- `Trigger.java`

Capture:

- param names
- default values
- required fields
- optional fields
- output fields
- side effects
- whether the task returns inline results or an internal-storage URI
- whether the task is source, destination, utility, or trigger

Why:

- these become the BD plugin contract and registry registration records

### D. Ground-truth runtime behavior

Extract from:

- `FindTest.java`
- `LoadTest.java`
- `CrudTest.java`
- `AggregateTest.java`
- `RunnerTest.java`

Capture:

- exact success conditions
- document ordering expectations
- object-id behavior
- chunk counting expectations
- artifact handoff expectations
- example inputs and outputs

Why:

- the tests are the best source for what must be preserved versus what is incidental

### E. Kestra runtime assumptions that matter for translation

Extract from:

- `RunContext.java`
- `RunContextProperty.java`
- `Task.java`
- `WorkingDirectory.java`
- `DefaultWorker.java`
- `ExecutorService.java`

Capture only the parts needed for first-slice translation:

- `runContext.render(...)` semantics
- how property values become typed values
- how internal storage URIs are read and written
- how task outputs are passed to later tasks
- how working-directory examples hand artifacts into Mongo `Load`

Do not attempt to extract the entire executor behavior for the first Mongo slice.

## Recommended Translation Strategy

### Recommendation

Use a hybrid sequence:

1. Extract the complete MongoDB family contract from source before implementation begins.
2. Build the minimum BD-native translation substrate.
3. Port MongoDB `Find` and `Load` first as the source/destination anchor pair.
4. Continue through the rest of the MongoDB family in a deliberate order.
5. Then decide whether to automate code generation for future integrations.

This is better than:

- translating a large core-flow surface first
- or building a generator before the first serious plugin family is proven

## Proposed Three-Layer Architecture

### Layer 1: BD-native substrate ("lubricators")

These are not direct Kestra ports. They are BlockData-native helpers required so translated plugins can operate correctly inside the FastAPI runtime.

Create helpers for:

- `mongodb_connection.py`
  - resolve `connection_id`
  - produce Mongo client

- `mongodb_codec.py`
  - convert rendered Python dict/string to BSON document
  - convert BSON values back to Python values while preserving important types and field order

- `artifact_io.py`
  - read JSONL artifacts from platform storage
  - write JSONL artifacts to platform storage

- `chunked_bulk.py`
  - generic chunked write helper
  - count records, requests, matched/inserted/modified/deleted values

These helpers should be generic enough that future Mongo-related tasks reuse them.

### Layer 2: Kestra-mapped Mongo plugins

Implement translated Python plugins with dual identity:

- BD-native identity
- preserved Kestra task-class identity

Recommended MongoDB family mapping:

| Kestra task class | BD alias | Role | Family status |
|---|---|---|---|
| `io.kestra.plugin.mongodb.Find` | `blockdata.mongodb.find` | source | implement first |
| `io.kestra.plugin.mongodb.Load` | `blockdata.mongodb.load` | destination | implement first |
| `io.kestra.plugin.mongodb.Aggregate` | `blockdata.mongodb.aggregate` | source | inventory now, implement next |
| `io.kestra.plugin.mongodb.InsertOne` | `blockdata.mongodb.insert_one` | destination/utility | inventory now, implement after source/destination anchor pair |
| `io.kestra.plugin.mongodb.Update` | `blockdata.mongodb.update` | utility | inventory now, implement after source/destination anchor pair |
| `io.kestra.plugin.mongodb.Delete` | `blockdata.mongodb.delete` | utility | inventory now, implement after source/destination anchor pair |
| `io.kestra.plugin.mongodb.Bulk` | `blockdata.mongodb.bulk` | destination | inventory now, implement after helpers are stable |
| `io.kestra.plugin.mongodb.Trigger` | `blockdata.mongodb.trigger` | trigger | inventory now, defer execution until trigger/runtime track exists |

### Layer 3: Future translation tooling

Only after the MongoDB family contract is fully extracted and the first execution wave works should the team decide whether to build generator tooling that:

- parses Java task classes
- extracts property metadata
- produces Python plugin skeletons
- optionally scaffolds tests

Mongo is the right first systematic family because it has:

- a shared abstract base
- source and destination roles
- storage handoff
- CRUD-style utility tasks
- tests covering both inline and artifact-based behavior

## How to Start the Family

### Target

Inventory all of these plugins first:

- `io.kestra.plugin.mongodb.Find`
- `io.kestra.plugin.mongodb.Load`
- `io.kestra.plugin.mongodb.Aggregate`
- `io.kestra.plugin.mongodb.InsertOne`
- `io.kestra.plugin.mongodb.Update`
- `io.kestra.plugin.mongodb.Delete`
- `io.kestra.plugin.mongodb.Bulk`
- `io.kestra.plugin.mongodb.Trigger`

Then get these two plugins working first:

- `io.kestra.plugin.mongodb.Find`
- `io.kestra.plugin.mongodb.Load`

This is the minimum first execution wave that establishes:

- Kestra task-class mapping
- source behavior
- destination behavior
- artifact handoff
- source/destination dual-role modeling

### Why `Find` and `Load` first

`Find` proves:

- rendered filter/projection/sort parsing
- inline row return
- optional stored artifact return
- source semantics

`Load` proves:

- artifact consumption
- destination semantics
- chunked writes
- object-id shaping
- counters and bulk behavior

Together they also mirror the existing GCS -> ArangoDB pattern:

- source task writes or returns data
- destination task consumes storage-backed artifacts

### Proposed BlockData landing files

Create or modify:

- `E:/writing-system/services/platform-api/app/plugins/mongodb.py`
- `E:/writing-system/services/platform-api/app/plugins/_shared/mongodb_codec.py`
- `E:/writing-system/services/platform-api/app/plugins/_shared/artifact_io.py`
- `E:/writing-system/services/platform-api/tests/plugins/test_mongodb.py`

Potential registry data work:

- service and function registration rows for MongoDB source/destination functions
- preserve original Kestra task-class in metadata fields

### Proposed runtime contract for the Python plugins

#### MongoDB Find

Task types:

- `blockdata.mongodb.find`
- `io.kestra.plugin.mongodb.Find`

Params to preserve first:

- `connection_id`
- `database`
- `collection`
- `filter`
- `projection`
- `sort`
- `limit`
- `skip`
- `store`

Output to preserve first:

- `rows` when `store = false`
- `size`
- `uri` when `store = true`

#### MongoDB Load

Task types:

- `blockdata.mongodb.load`
- `io.kestra.plugin.mongodb.Load`

Params to preserve first:

- `connection_id`
- `database`
- `collection`
- `from` or `source_uri`
- `chunk`
- `idKey`
- `removeIdKey`

Output to preserve first:

- `size`
- `insertedCount`
- `matchedCount`
- `modifiedCount`
- `deletedCount`

### How to map Kestra semantics into BD

#### Connection object

Kestra:

- inline nested object: `connection.uri`

BD first execution wave:

- `connection_id` resolved through BlockData's connection store

Recommendation:

- keep the external user-facing BD contract as `connection_id`
- preserve original Kestra field names in metadata or compatibility shims
- do not require the frontend to construct inline Kestra connection objects

#### Property rendering

Kestra:

- uses `Property<T>` plus `runContext.render(...)`

BD first execution wave:

- use the existing `ExecutionContext.render(...)`
- for dict-like params, recursively render strings within dicts and lists

This is a required gap: BlockData's current render helper is string-focused and needs richer recursive rendering for translated plugins.

#### Internal storage

Kestra:

- uses internal storage URIs and often writes Ion

BD first execution wave:

- use platform storage URLs / storage URIs
- prefer JSONL for inter-plugin handoff

Recommendation:

- do not port Ion for the first execution wave
- preserve the storage-backed handoff pattern, but use JSONL as the transport format
- record the fidelity difference explicitly in plugin metadata or proposal notes

#### BSON mapping

Kestra Mongo uses `MongoDbService.map(...)` to convert BSON values into runtime-safe values.

This behavior should be ported carefully for:

- `null`
- integers
- floats/decimals
- strings
- booleans
- timestamps/dates
- arrays
- documents
- ObjectId

Preserve field order.

Do not overreach into unsupported BSON types during the first execution wave.

## What Should Not Be Done Yet

### Do not translate flow-control plugins yet

Defer:

- `If`
- `ForEach`
- `ForEachItem`
- `Parallel`
- `Sequential`
- `Dag`
- `Subflow`
- trigger families that require execution scheduling

Reason:

- these are orchestration features, not task ports
- BlockData does not yet have a Kestra-equivalent flow executor
- pulling them forward now would expand the scope from plugin translation into engine construction

### Do not build a generator before the Mongo family contract is extracted and the first execution wave is stable

The team does not yet have enough evidence about:

- what translation fidelity is required
- where manual interpretation is still needed
- which substrate gaps recur across real plugin families

Complete the Mongo family inventory and stabilize the first execution wave, then decide whether generator tooling is justified.

## Proposed Extraction Matrix

For every translated plugin, capture this sheet before coding:

1. Java class path
2. Kestra task class
3. BD alias
4. plugin group and family metadata
5. required params
6. optional params and defaults
7. output fields
8. source/destination/utility/trigger role
9. storage behavior
10. render behavior
11. test files covering it
12. examples covering it
13. fidelity notes
14. initial execution-wave simplifications

This extraction matrix should be stored with the translation work, not only kept mentally.

## Verification Expectations

The Mongo translation effort should be accepted only if it proves:

1. The full MongoDB family has an extraction matrix on disk before coding continues.
2. `io.kestra.plugin.mongodb.Find` resolves in the BlockData plugin registry.
3. `mongodb_find` is exposed by the function-name mapping.
4. `Find` can execute against a real Mongo test instance.
5. `Find(store=false)` returns rows and size.
6. `Find(store=true)` writes a storage artifact and returns URI plus size.
7. `Load` can consume the stored artifact.
8. `Load` reports inserted counts and request counts consistent with chunking.
9. BSON/ObjectId and timestamp conversion behave predictably.
10. The translated plugins can be registered in `service_functions` as source/destination-capable functions.

## Recommendation

Approve a focused next implementation plan with this sequence:

### Phase 1: MongoDB family extraction

- create the extraction matrix for every MongoDB task class
- classify each task as source, destination, utility, or trigger
- record params, outputs, defaults, storage behavior, and runtime dependencies

### Phase 2: Translation substrate

- add recursive render support for structured params
- add MongoDB BSON/document helpers
- add generic artifact read/write helpers

### Phase 3: MongoDB implementation anchor pair

- port `Find`
- port `Load`
- write Python tests mirroring `FindTest.java` and `LoadTest.java`
- register MongoDB source and destination functions in the service registry

### Phase 4: MongoDB family completion

- add `Aggregate`
- add `InsertOne`
- add `Update`
- add `Delete`
- evaluate whether `Bulk` belongs in this phase or later

### Phase 5: Post-family scaling decision

Choose between:

- continuing hand-translation plugin family by plugin family
- or building translation scaffolding/code generation based on the patterns proven by the full Mongo extraction and first implementation set

## Final Position

The correct next move is not "understand all of Kestra before doing anything."

The correct next move is:

- understand enough of Kestra's plugin and runtime contracts to define a faithful translation boundary
- build a small BD-native substrate for translated tasks
- use the MongoDB family as the first serious systematic catalog-sourced translation effort
- defer orchestration-engine translation until after plugin-family translation patterns are proven

That is the smallest path that is both technically honest and strategically useful.

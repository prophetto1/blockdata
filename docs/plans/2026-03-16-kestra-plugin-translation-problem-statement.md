# Kestra Plugin Translation: Problem Statement & Design Decision

## Context

We have completed the Load Activation plan. The service registry is canonical (`service_registry`, `service_functions`, `service_type_catalog`), the execution plane runs on FastAPI with a `BasePlugin` system, and GCS source + ArangoDB destination are operational end-to-end. The remote database is reconciled and `db push` works.

The next step is scaling this beyond two hand-coded plugins. We have:

- **131 external plugin repos** at `E:/kestra-io/plugins/` — MongoDB, S3, Kafka, Postgres, etc.
- **~17 core plugin domains** inside Kestra itself at `E:/kestra/core/src/main/java/io/kestra/plugin/core/` — flow control, HTTP, KV store, storage, scripting, triggers, conditions
- **945 catalog entries** already seeded in `integration_catalog_items` with task class names and plugin metadata
- **Full Java source code** for everything — not scraped docs, actual implementations

The question is: **what gets translated first, and how?**

---

## The Two Categories

### External Integration Plugins (131 repos)

These are connectors to external systems. Each repo contains Java task classes that follow a consistent pattern:

**Example: MongoDB** (`E:/kestra-io/plugins/plugin-mongodb/`)

```
AbstractTask.java          — base class with connection, database, collection fields
MongoDbConnection.java     — credential holder with client() factory
Find.java                  — source: query documents, return rows or store as file
Load.java                  — destination: bulk insert from Ion/JSON stream
Bulk.java                  — destination: mixed write operations
InsertOne.java             — destination: single document insert
Delete.java                — utility: remove documents
Update.java                — utility: update documents
Aggregate.java             — source: aggregation pipeline
Trigger.java               — event trigger on collection changes
```

The Java pattern for an integration plugin:

1. `AbstractTask` holds common `@PluginProperty` fields (connection, database, collection)
2. Each task class has typed `@PluginProperty` inputs and an `Output` inner class
3. `run(RunContext)` authenticates via connection object, calls the external API, transforms the response
4. Large data flows through reactive `Flux<>` streams, serialized to Ion format in Kestra's internal storage

**What a Python BD-native equivalent looks like** (proven by GCS/ArangoDB):

```python
class MongoDBFindPlugin(BasePlugin):
    task_types = ["blockdata.load.mongodb.find", "io.kestra.plugin.mongodb.Find"]

    async def run(self, params: dict, context: ExecutionContext) -> PluginOutput:
        creds = resolve_connection_sync(params["connection_id"], context.user_id)
        # ... authenticate, query, return results
        return success(data={"rows": [...], "count": N})
```

The translation work per plugin is: read the Java `run()` method, understand the API calls and data transformations, rewrite in Python using `httpx` (for HTTP APIs) or native Python clients (for database protocols).

### Core Internal Plugins (~17 domains)

These are Kestra's own runtime primitives that ship inside the Kestra core, not as separate plugin repos. They live at `E:/kestra/core/src/main/java/io/kestra/plugin/core/`.

**These are fundamentally different from integration plugins.** Integration plugins call external APIs. Core plugins define how flows execute.

| Domain | Key Tasks | What They Do |
|--------|-----------|-------------|
| **flow** | `If`, `Switch`, `ForEach`, `ForEachItem`, `Parallel`, `Sequential`, `Dag`, `Subflow`, `Pause`, `Sleep` | Control flow — branching, iteration, parallelism, sub-orchestration |
| **http** | `Request`, `Download` | HTTP calls (could be integration, but ships with core) |
| **kv** | `Get`, `Set`, `Delete`, `GetKeys` | Key-value store for cross-run state |
| **storage** | `Concat`, `Split`, `FilterItems`, `DeduplicateItems`, `LocalFiles`, `Write`, `Delete` | Internal file/data manipulation |
| **execution** | `Assert`, `Fail`, `Exit`, `Labels`, `SetVariables` | Run lifecycle control |
| **state** | `Get`, `Set`, `Delete` | Persistent state across executions |
| **log** | `Log`, `Fetch` | Logging |
| **condition** | `Expression`, `DateTimeBetween`, `DayWeek`, `ExecutionStatus`, etc. | Conditional evaluation |
| **trigger** | `Schedule`, `Webhook`, `Flow` | Event triggers |
| **runner** | `Process` | Process execution |
| **scripts** (external but core-like) | `python/Script`, `shell/Commands`, 16 other runtimes | Script execution with dependency management |
| **serdes** (external but core-like) | `CsvToIon`, `JsonToIon`, `AvroToIon`, `ParquetToIon`, etc. | Format serialization/deserialization |

**The critical architectural difference:**

Integration plugins implement `RunnableTask<Output>` — they have a `run()` method that does work and returns data. These map cleanly to `BasePlugin.run()`.

Core flow plugins implement `FlowableTask<Output>` — they **don't have a `run()` method**. Instead they have:
- `childTasks()` — returns which child tasks to execute based on conditions
- `outputs()` — evaluates state without doing work
- `createSubflowExecutions()` — spawns child flow executions

**This is not a translation problem. It's an orchestration engine problem.** To make `If`, `ForEach`, `Parallel`, `Dag` work in BD, you need a flow executor that:
- Resolves task graphs
- Manages child task lifecycle
- Handles branching, parallelism, error propagation
- Evaluates Pebble template expressions

That's building an orchestration runtime, not translating plugins.

---

## The Dilemma: Concrete Examples

### Example 1: MongoDB Find (Integration Plugin — Straightforward Translation)

**Java source** (`plugin-mongodb/Find.java`):
```java
@Override
public Find.Output run(RunContext runContext) throws Exception {
    try (MongoClient client = this.connection.client(runContext)) {
        MongoCollection<BsonDocument> collection = this.collection(runContext, client, BsonDocument.class);
        FindIterable<BsonDocument> find = collection.find(filter);
        // apply projection, sort, limit, skip
        // either store to file or return rows in memory
        return Output.builder().rows(rows).size(size).uri(uri).build();
    }
}
```

**Python equivalent** (mechanical translation):
```python
async def run(self, params, context):
    creds = resolve_connection_sync(params["connection_id"], context.user_id)
    client = AsyncIOMotorClient(creds["uri"])
    db = client[params["database"]]
    collection = db[params["collection"]]

    cursor = collection.find(params.get("filter", {}))
    if params.get("projection"): cursor = cursor.projection(params["projection"])
    if params.get("sort"): cursor = cursor.sort(params["sort"])
    if params.get("limit"): cursor = cursor.limit(params["limit"])
    if params.get("skip"): cursor = cursor.skip(params["skip"])

    documents = await cursor.to_list(length=None)
    return success(data={"rows": documents, "size": len(documents)})
```

**Effort: ~1 hour per task class.** The pattern is: authenticate → call API → transform → return. Python has equivalent libraries for every external system.

### Example 2: CSV Parsing (Serdes Plugin — Medium Translation)

**Java source** (`plugin-serdes/csv/CsvToIon.java`):
```java
// Reactive Flux streaming, header extraction, bad-line handling,
// charset support, Ion serialization, file I/O via RunContext.storage()
Flux<Object> flowable = Flux.fromIterable(csvReader)
    .onErrorResume(CsvParseException.class, e -> { /* handle */ })
    .filter(record -> { /* extract headers, skip rows */ })
    .flatMap(r -> { /* map to dict or list */ });
Mono<Long> count = FileSerde.writeAll(output, flowable);
```

**Python equivalent:**
```python
async def run(self, params, context):
    # Download source file, parse CSV with Python csv module,
    # write JSONL to platform storage
    reader = csv.DictReader(io.StringIO(content))
    documents = [dict(row) for row in reader]
    jsonl = "\n".join(json.dumps(doc) for doc in documents)
    uri = await context.upload_file("pipeline", path, jsonl.encode())
    return success(data={"uri": uri, "row_count": len(documents)})
```

**Effort: ~2 hours.** The reactive Flux patterns become simple Python iteration. Ion format becomes JSONL. But you need to handle the same edge cases (bad lines, charset, headers, skip rows).

### Example 3: Flow If (Core Plugin — NOT a translation problem)

**Java source** (`core/flow/If.java`):
```java
// This is NOT a RunnableTask. It's a FlowableTask.
// It doesn't "run" — it decides which child tasks to execute.

@Override
public List<ResolvedTask> childTasks(RunContext runContext, TaskRun parentTaskRun) {
    if (isTrue(runContext)) {
        return FlowableUtils.resolveTasks(then, parentTaskRun);
    }
    return FlowableUtils.resolveTasks(_else, parentTaskRun);
}
```

**There is no Python BasePlugin equivalent for this.** `BasePlugin.run()` executes work and returns data. `If` doesn't execute work — it controls which other tasks execute. To make this work in BD, you need:

1. A flow definition format (YAML/JSON describing the task graph)
2. A flow executor that walks the graph, evaluates conditions, spawns child tasks
3. A task run state machine (pending → running → complete/failed)
4. Expression evaluation (Pebble templates or a Python equivalent)
5. Variable passing between tasks (outputs of task A become inputs of task B)

That's an orchestration engine. Kestra's is ~50,000 lines of Java across `core/src/main/java/io/kestra/core/runners/`.

### Example 4: ForEachItem (Core Plugin — Complex Orchestration)

**Java source** (`core/flow/ForEachItem.java`):
```java
// Composes 3 internal subtasks:
// 1. ForEachItemSplit — splits input file into batches
// 2. ForEachItemExecutable — launches a subflow per batch
// 3. ForEachItemMergeOutputs — collects and merges results

// Creates SubflowExecution objects that the executor picks up:
public List<SubflowExecution<?>> createSubflowExecutions(...) {
    // For each split batch, create a subflow execution
    // with special variables: taskrun.items, taskrun.iteration
}
```

**This requires a subflow execution system.** The plugin doesn't just "run" — it spawns multiple independent flow executions, monitors them, and merges their outputs. Building this in BD means building a flow scheduler.

### Example 5: Python Script (Scripts Plugin — Depends on Container Runtime)

**Java source** (`plugin-scripts/plugin-script-python/Script.java`):
```java
// Writes script to temp file
// Sets up Python environment (UV or pip, dependency caching)
// Executes via subprocess or Docker container
// Returns stdout, stderr, exit code, output files
```

**Python equivalent is simpler** (Python running Python), but still needs:
- Sandboxed execution (you don't want user scripts accessing the FastAPI process)
- Dependency management (pip install per execution?)
- File I/O bridge (how does the script read/write platform storage?)
- Timeout and resource limits

This is somewhere between "integration plugin" and "orchestration primitive."

---

## The Three Options

### Option A: MongoDB End-to-End First (Narrow, Concrete)

**Translate `plugin-mongodb` by hand** — Find, Load, Bulk, InsertOne, Delete, Update, Aggregate. Register as service functions. Prove the pattern works for a catalog-sourced integration.

**What you get:**
- Second working integration (after GCS/ArangoDB), sourced from the Kestra catalog
- Validated translation pattern: Java `@PluginProperty` → Python params, Java `run()` → Python `run()`, Java `Output` → Python `PluginOutput`
- MongoDB as both source AND destination (proves dual-role services)

**What you don't get:**
- No automation — each plugin is still hand-translated
- No core primitives — no flow control, no scripting, no orchestration
- No scaling story — the 130th plugin is as expensive as the 2nd

**Effort:** ~5 tasks, 1-2 days. Mechanical translation work.

**Best if:** You need a second proof point fast and want to validate the pattern before investing in tooling.

### Option B: Translation Tooling First (Infrastructure Investment)

**Build a code generator** that reads Java plugin source + catalog metadata and produces Python BasePlugin skeletons. Then use it on MongoDB as the first output.

**What the tool does:**
1. Parse Java source for `@PluginProperty` annotations → generate `parameter_schema()`
2. Parse `Output` inner class → generate output type hints
3. Extract `task_types` from class annotations → generate `task_types` list
4. Generate `run()` method stub with typed params from properties
5. Optionally: use LLM to translate the `run()` body from Java to Python

**What you get:**
- Every future integration plugin becomes a 15-minute review instead of a 1-hour write
- Consistent code structure across all generated plugins
- A scalable path to activating the full catalog

**What you don't get:**
- Still no core primitives or orchestration
- The tool itself is ~8 tasks to build
- The generated code still needs human review for correctness

**Effort:** ~8 tasks for tooling, then ~1 task per plugin batch. 3-4 days upfront, but pays off at scale.

**Best if:** You plan to activate dozens of integrations and want the cost curve to flatten.

### Option C: Core Primitives First (Architecture Foundation)

**Translate Kestra's internal plugins** — starting with the ones that DON'T require an orchestration engine:

| Can translate now (RunnableTask) | Needs orchestration engine (FlowableTask) |
|---|---|
| `http/Request`, `http/Download` | `flow/If`, `flow/Switch` |
| `kv/Get`, `kv/Set`, `kv/Delete` | `flow/ForEach`, `flow/ForEachItem` |
| `storage/Concat`, `storage/Split`, `storage/FilterItems` | `flow/Parallel`, `flow/Sequential` |
| `execution/Assert`, `execution/Fail`, `execution/SetVariables` | `flow/Dag`, `flow/Subflow` |
| `state/Get`, `state/Set`, `state/Delete` | `trigger/Schedule`, `trigger/Webhook` |
| `log/Log` | |
| `debug/Echo`, `debug/Return` | |
| `serdes/CsvToIon`, `serdes/JsonToIon`, etc. | |

The left column (~20 tasks) translates mechanically — they're RunnableTasks that do work and return data, just like integration plugins. The right column (~15 tasks) requires building a flow execution engine.

**What you get:**
- BD-native HTTP client, KV store, storage manipulation, format conversion
- Building blocks that integration plugins and future flows depend on
- Clear architectural boundary: "these primitives work now, orchestration is next"

**What you don't get:**
- No new external integrations (MongoDB etc. still not connected)
- No orchestration (flow control, iteration, parallelism are deferred)
- Users don't see visible new capabilities in the UI immediately

**Effort:** ~12 tasks for the RunnableTask primitives. 3-5 days. Orchestration engine is a separate, larger effort.

**Best if:** You want the internal foundation solid before scaling outward.

---

## Recommended Sequencing

These options aren't mutually exclusive. The question is order:

**Sequence 1: A → B → C** (Prove → Scale → Deepen)
- MongoDB by hand validates the pattern
- Tooling makes integration scaling cheap
- Core primitives come when orchestration work begins
- *Pro:* Fastest to visible value. *Con:* Core primitives deferred longest.

**Sequence 2: C-left → A → B** (Foundation → Prove → Scale)
- Translate the RunnableTask core primitives first (HTTP, KV, storage, serdes)
- Then MongoDB by hand using those primitives
- Then tooling to scale integrations
- *Pro:* Strongest foundation. *Con:* Slower to first new integration.

**Sequence 3: A → C-left → B** (Prove → Foundation → Scale)
- MongoDB validates the external pattern
- Core RunnableTask primitives fill the internal gaps
- Tooling scales everything
- *Pro:* Balanced. *Con:* Two manual phases before automation.

---

## What We Need From the Team

1. **Which sequence?** Or a different ordering entirely.
2. **Is orchestration (FlowableTask) in scope for the near term?** If yes, that changes the priority of Option C significantly. If no, we only need the RunnableTask half of core.
3. **How many integrations do we actually need activated in the next 4-6 weeks?** If it's 3-5, hand-translation (Option A) is fine. If it's 20+, tooling (Option B) is mandatory.
4. **Are there specific integrations beyond MongoDB that are urgent?** (Postgres? S3? Kafka?) That affects which plugins get translated first.

---

## Reference Files

| Resource | Location |
|---|---|
| Kestra core plugins (Java) | `E:/kestra/core/src/main/java/io/kestra/plugin/core/` |
| Kestra external plugins (Java) | `E:/kestra-io/plugins/plugin-*/` |
| BD BasePlugin contract | `services/platform-api/app/domain/plugins/models.py` |
| Working GCS plugin (reference) | `services/platform-api/app/plugins/gcs.py` |
| Working ArangoDB plugin (reference) | `services/platform-api/app/plugins/arangodb.py` |
| Catalog entries (945 seeded) | `integration_catalog_items` table |
| Plugin metadata | `kestra_plugin_items`, `kestra_plugin_inputs`, `kestra_plugin_outputs` tables |
| Absorption context doc | `docs/plans/2026-03-15-kestra-absorption-context-update.md` |

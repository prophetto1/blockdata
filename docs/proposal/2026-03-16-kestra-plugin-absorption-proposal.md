# Proposal: Kestra Plugin Absorption into BlockData Execution Plane

**Date:** 2026-03-16
**Status:** Draft for team review
**Author:** Technical architecture session
**Depends on:** Load Activation (completed), Platform AI Provider Management (planned)

---

## Executive Summary

BlockData has 131 Kestra plugin repositories containing ~1,600 Java source files, plus 17 core plugin domains inside the Kestra engine itself. These represent a proven, battle-tested library of integrations and runtime primitives. The question is how to absorb them into BlockData's Python-based execution plane.

This proposal is based on source-verified analysis of both the Kestra codebase (`E:/kestra/`, `E:/kestra-io/plugins/`) and the BlockData platform (`services/platform-api/`). Every claim is traceable to specific files.

**The core finding:** Kestra plugins fall into three fundamentally different categories that require different absorption strategies. Treating them as a single translation problem leads to either over-engineering (building an orchestration engine for simple connectors) or under-delivering (translating connectors but leaving out the flow primitives that make them composable).

**Recommended approach:** Five phases, starting with a scaffold generator that leverages the 945 catalog entries already seeded in the database, followed by hand-translation of MongoDB as a proof pattern, then core primitives, then broad integration scaling, and finally an orchestration engine as a separate project.

---

## 1. What We Have

### 1.1 Kestra Source Code (Source-Verified)

**Core engine:** `E:/kestra/`
- Full Kestra orchestration engine (Java/Gradle)
- Plugin SDK: `core/src/main/java/io/kestra/core/models/tasks/` — defines `Task`, `RunnableTask<Output>`, `FlowableTask<Output>`, `ExecutableTask<Output>`
- Execution runtime: `core/src/main/java/io/kestra/core/runners/` — `RunContext`, `DefaultRunContext`, `Worker`, `Executor`
- Property system: `core/src/main/java/io/kestra/core/models/property/Property.java` — deferred Pebble expression evaluation
- Plugin discovery: `core/src/main/java/io/kestra/core/plugins/PluginScanner.java` — classpath scanning
- Internal plugins: `core/src/main/java/io/kestra/plugin/core/` — 17 domains, ~130 Java files

**External plugins:** `E:/kestra-io/plugins/`
- 131 plugin repositories
- ~1,600 Java source files (excluding tests and package-info)
- Notable large plugins: plugin-jdbc (135 files, 22 database submodules), plugin-azure (131 files), plugin-gcp (124 files), plugin-aws (77 files), plugin-fs (77 files)

### 1.2 BlockData Platform (Source-Verified)

**BasePlugin system:** `services/platform-api/app/domain/plugins/models.py`
```python
class BasePlugin(ABC):
    task_types: list[str] = []
    credential_schema: list[dict] = []

    @abstractmethod
    async def run(self, params: dict[str, Any], context: ExecutionContext) -> PluginOutput

    @classmethod
    def parameter_schema(cls) -> list[dict]: return []

    async def test_connection(self, creds: dict[str, Any]) -> PluginOutput:
        return success(data={"valid": True})
```

**ExecutionContext:** `services/platform-api/app/domain/plugins/models.py`
- `render(template)` — Kestra-style `{{ expression }}` resolution
- `upload_file(bucket, path, content)` — Supabase Storage upload
- `get_secret(key)` — environment variable access
- `user_id` — authenticated user identity

**Working plugins:** GCS (`app/plugins/gcs.py`), ArangoDB (`app/plugins/arangodb.py`) — proven translation pattern.

**Auto-discovery:** `app/domain/plugins/registry.py` — scans `app/plugins/` for BasePlugin subclasses, registers by task_type.

### 1.3 Catalog Data (Source-Verified)

**`integration_catalog_items` table** (migration 059): 945 seeded entries with:
- `task_class` — fully qualified Java class name (e.g., `io.kestra.plugin.mongodb.Find`)
- `task_schema` — **complete JSON Schema** with properties (inputs), outputs, examples, definitions
- `plugin_group` — provider grouping (e.g., `io.kestra.plugin.mongodb`)
- `categories` — JSONB array of tags

**Satellite tables** (migration 064):
- `kestra_plugin_inputs` — ~9,700 rows. Normalized input parameters per task: param_name, param_type, param_required, param_dynamic, param_default, param_enum, param_group
- `kestra_plugin_outputs` — ~2,300 rows. Normalized output fields per task: output_name, output_type, output_required
- `kestra_plugin_definitions` — ~4,400 rows. Reusable type definitions
- `kestra_plugin_examples` — ~1,451 rows. YAML code examples

**`kestra_provider_enrichment` table** (migration 068): ~56 rows with auth_type, auth_fields per provider group.

---

## 2. The Three Plugin Categories

Source analysis reveals three fundamentally different plugin types in Kestra's architecture. Each requires a different absorption strategy.

### Category A: RunnableTask — "Do Work, Return Data"

**Java interface:** `io.kestra.core.models.tasks.RunnableTask<T extends Output>`
**Contract:** `T run(RunContext runContext) throws Exception`
**BD equivalent:** `BasePlugin.run(params, context) -> PluginOutput`

These plugins authenticate with an external system, call its API, transform the response, and return structured output. They are stateless, side-effect-free (relative to the orchestration engine), and map directly to BasePlugin.

**Source evidence** (`E:/kestra-io/plugins/plugin-mongodb/src/main/java/io/kestra/plugin/mongodb/Find.java`):
```java
public Find.Output run(RunContext runContext) throws Exception {
    try (MongoClient client = this.connection.client(runContext)) {
        MongoCollection<BsonDocument> collection = this.collection(runContext, client, BsonDocument.class);
        FindIterable<BsonDocument> find = collection.find(filter);
        // ... apply projection, sort, limit, skip
        return Output.builder().rows(rows).size(size).uri(uri).build();
    }
}
```

**Python equivalent:**
```python
async def run(self, params, context):
    creds = resolve_connection_sync(params["connection_id"], context.user_id)
    client = AsyncIOMotorClient(creds["uri"])
    cursor = client[params["database"]][params["collection"]].find(params.get("filter", {}))
    documents = await cursor.to_list(length=None)
    return success(data={"rows": documents, "count": len(documents)})
```

**Scale:** This covers ALL 131 external integration plugins and ~30 core internal tasks.

**Translation effort per plugin:** 1-4 hours depending on complexity. The pattern is mechanical: authenticate → call API → transform → return.

### Category B: FlowableTask — "Control Execution Flow"

**Java interface:** `io.kestra.core.models.tasks.FlowableTask<T extends Output>`
**Contract:** No `run()` method. Instead: `childTasks()`, `resolveNexts()`, `outputs()`
**BD equivalent:** **Does not exist.** BasePlugin has no concept of child task orchestration.

These plugins don't do work — they decide which other tasks execute and in what order. They are the flow control primitives: If, Switch, ForEach, ForEachItem, Parallel, Sequential, Dag, Subflow, Pause, AllowFailure.

**Source evidence** (`E:/kestra/core/src/main/java/io/kestra/plugin/core/flow/If.java`):
```java
// NOT a RunnableTask — no run() method
@Override
public List<ResolvedTask> childTasks(RunContext runContext, TaskRun parentTaskRun) {
    if (isTrue(runContext)) {
        return FlowableUtils.resolveTasks(then, parentTaskRun);
    }
    return FlowableUtils.resolveTasks(_else, parentTaskRun);
}
```

**What this requires in BD:** A flow execution engine that:
- Parses flow definitions (task graphs with branches, loops, parallelism)
- Resolves which child tasks to execute based on runtime conditions
- Manages task run state machines (pending → running → complete/failed)
- Passes outputs from one task as inputs to the next
- Handles parallel execution, error propagation, retry logic

**Scale:** 15 core flow tasks. But the engine they require is ~50,000 lines of Java in `E:/kestra/core/src/main/java/io/kestra/core/runners/`.

**This is not a translation problem. It is an orchestration engine design problem.**

### Category C: Infrastructure-Dependent Tasks

**Java pattern:** RunnableTask or ExecutionUpdatableTask that depends on Kestra-specific backend services.
**BD equivalent:** Requires building the corresponding BD-native backend service first.

Examples:
- **KV Store** (Get, Set, Delete): Depends on `RunContext.namespaceKv()` — Kestra's built-in key-value store. BD would need a KV service (could use Supabase or Redis).
- **SetVariables / Labels**: Depends on `ExecutionUpdatableTask.update(Execution)` — modifies the running execution object. BD needs an execution model.
- **Triggers** (Schedule, Webhook, Flow): Depends on Kestra's scheduler, webhook router, and execution queue. BD needs a scheduling system.
- **Namespace Files** (UploadFiles, DownloadFiles): Depends on Kestra's namespace-scoped file storage with ACL.

**Source evidence** (`E:/kestra/core/src/main/java/io/kestra/plugin/core/kv/Get.java`):
```java
public Output run(RunContext runContext) throws Exception {
    String renderedNamespace = runContext.render(this.namespace).as(String.class).orElse(null);
    KVStore kvStore = runContext.namespaceKv(renderedNamespace);  // <-- Kestra infrastructure
    Optional<KVEntry> entry = kvStore.getValue(key);
    return Output.builder().value(entry.map(KVEntry::value).orElse(null)).build();
}
```

**Scale:** ~66 core tasks. Each needs its BD-native backend before the plugin can be translated.

---

## 3. External Plugin Breakdown (All 131 Repos)

### By Size and Complexity

| Tier | Plugin Count | Java Files | Submodules | Description | Translation Effort |
|------|-------------|-----------|------------|-------------|-------------------|
| **Tier 1: Simple** | ~40 | 1-5 each | 0 | Single API wrappers (AI providers, webhooks, simple REST) | ~1 hour each |
| **Tier 2: Moderate** | ~50 | 5-20 each | 0 | CRUD connectors with connection management | ~2-4 hours each |
| **Tier 3: Complex** | ~25 | 20-131 each | 0-22 | Multi-service platforms (AWS, Azure, GCP, JDBC) | ~1-3 days each |
| **Tier 4: Infrastructure** | ~10 | varies | varies | Framework plugins (Beam, Debezium, Camel, scripts runtimes) | Deferred |

### Top 20 Plugins by Size

| Plugin | Java Files | Submodules | Key Task Classes |
|--------|-----------|------------|-----------------|
| plugin-jdbc | 135 | 22 | Query, Batch, Trigger per database (Postgres, MySQL, ClickHouse, Snowflake, etc.) |
| plugin-azure | 131 | 0 | Blob Storage, EventHubs, DataFactory, Functions, CosmosDB, etc. |
| plugin-gcp | 124 | 0 | GCS, BigQuery, Pub/Sub, Dataproc, Vertex AI, etc. |
| plugin-aws | 77 | 0 | S3, DynamoDB, SQS, SNS, Lambda, Athena, Glue, etc. |
| plugin-fs | 77 | 0 | SFTP, FTP, SMB, SSH uploads/downloads per protocol |
| plugin-notifications | 64 | 0 | Slack, Teams, Discord, PagerDuty, email templates |
| plugin-slack | 59 | 0 | Messages, channels, users, reactions, file uploads |
| plugin-scripts | 55 | 18 | Python, Shell, Node, R, Go, Ruby, Julia, etc. runtime execution |
| plugin-singer | 51 | 0 | Singer tap/target protocol wrappers |
| plugin-googleworkspace | 47 | 0 | Drive, Sheets, Docs, Calendar, Gmail |
| plugin-dbt | 39 | 0 | dbt CLI, Cloud, build, test, snapshot, source freshness |
| plugin-microsoft365 | 37 | 0 | OneDrive, SharePoint, Outlook, Teams |
| plugin-serdes | 36 | 0 | CSV, JSON, Avro, Parquet, Excel, XML, YAML, Protobuf I/O |
| plugin-debezium | 35 | 7 | CDC for MySQL, Postgres, SQL Server, MongoDB, Oracle, etc. |
| plugin-hubspot | 28 | 0 | Contacts, deals, companies, tickets, pipelines |
| plugin-meta | 26 | 0 | Facebook/Instagram Ads, Pages, Graph API |
| plugin-apify | 26 | 0 | Actors, datasets, key-value stores, request queues |
| plugin-airbyte | 25 | 0 | Airbyte Cloud/OSS connections, syncs, jobs |
| plugin-databricks | 25 | 0 | Jobs, clusters, DBFS, SQL warehouses, Unity Catalog |
| plugin-kubernetes | 23 | 0 | Jobs, pods, deployments, config maps |

### By Pipeline Stage (bd_stage Classification)

| Stage | Plugin Examples | Approximate Count |
|-------|----------------|-------------------|
| **Source** | GCS List, S3 List, JDBC Query, MongoDB Find, Kafka Consume, SFTP Download | ~200 task classes |
| **Destination** | GCS Upload, S3 Upload, JDBC Batch, MongoDB Load, Kafka Produce, SFTP Upload | ~150 task classes |
| **Transform** | dbt, Spark, Malloy, SQL transforms, serdes (CSV↔JSON↔Avro↔Parquet) | ~80 task classes |
| **Utility** | HTTP Request, notifications, Git, Docker, compress, crypto | ~200 task classes |
| **Trigger** | Schedule, Webhook, file watchers, CDC (Debezium), queue listeners | ~100 task classes |
| **AI** | Anthropic, OpenAI, Gemini, Ollama, HuggingFace | ~30 task classes |
| **Orchestration** | Airbyte, Fivetran, Hightouch, Prefect, Dagster, n8n | ~40 task classes |

---

## 4. The Translation Contract

### 4.1 What Maps Directly (Proven)

| Kestra (Java) | BlockData (Python) | Status |
|---|---|---|
| `RunnableTask<Output>.run(RunContext)` | `BasePlugin.run(params, context)` | Proven (GCS, ArangoDB) |
| `@PluginProperty` fields | `parameter_schema()` return value | Proven |
| `Output` inner class | `PluginOutput.data` dict | Proven |
| `Connection` objects | `resolve_connection_sync(id, user_id)` | Proven |
| `RunContext.render(template)` | `ExecutionContext.render(template)` | Proven |
| `RunContext.storage().putFile()` | `ExecutionContext.upload_file()` | Proven |
| Plugin discovery (classpath scan) | Registry scan of `app/plugins/` | Proven |

### 4.2 What's Missing in BD (Gap Analysis)

| Kestra Capability | BD Status | Needed For |
|---|---|---|
| `FlowableTask` (childTasks, resolveNexts) | **Not implemented** | Flow control (If, ForEach, Parallel) |
| `ExecutableTask` (createSubflowExecutions) | **Not implemented** | Subflow orchestration |
| `ExecutionUpdatableTask` (update execution) | **Not implemented** | SetVariables, Labels, Resume |
| `RunContext.namespaceKv()` | **Not implemented** | KV store tasks |
| `Property<T>` deferred rendering | **Partial** — render() exists but not full Pebble | Dynamic property evaluation |
| `Flux<T>` reactive streaming | **Not needed** — Python async generators suffice | Large file processing |
| Retry system (AbstractRetry) | **Not implemented** | Task-level retry with backoff |
| Task caching (Cache) | **Not implemented** | Skipping re-execution |
| Worker groups | **Not implemented** | Routing tasks to specific workers |
| `RunContext.encrypt()/decrypt()` | **Implemented** — `app/infra/crypto.py` | Credential encryption |

### 4.3 What Can Be Generated From Catalog Data

The `integration_catalog_items.task_schema` JSONB contains enough metadata to auto-generate:

1. **`task_types` list** — from `task_class` column
2. **`parameter_schema()` method** — from `task_schema.properties` (or `kestra_plugin_inputs` table)
3. **Output type documentation** — from `task_schema.outputs` (or `kestra_plugin_outputs` table)
4. **Connection pattern** — from `kestra_provider_enrichment.auth_type` and `auth_fields`
5. **Code examples** — from `kestra_plugin_examples.example_code`

What CANNOT be generated from catalog data:
- **The `run()` method body** — this is the actual execution logic, only available in Java source
- **Error handling specifics** — edge cases, retries, timeout behavior
- **Python library dependencies** — which pip packages are needed

---

## 5. Recommended Approach

### Phase 0: Scaffold Generator (3 days)

Build a Python script (`scripts/generate-plugin-scaffold.py`) that:

1. **Reads from catalog:** Queries `integration_catalog_items` + `kestra_plugin_inputs` + `kestra_plugin_outputs` + `kestra_provider_enrichment` for a given `task_class`
2. **Locates Java source:** Maps `task_class` to file path in `E:/kestra-io/plugins/` or `E:/kestra/core/`
3. **Generates Python file:** Produces a BasePlugin subclass with:
   - `task_types` from catalog
   - `parameter_schema()` from inputs
   - `run()` stub with typed params extracted from inputs, annotated with Java source location
   - `test_connection()` stub if provider enrichment has auth info
4. **Outputs to:** `services/platform-api/app/plugins/generated/{plugin_group}/` (e.g., `generated/mongodb/find.py`)

**Why this first:** It makes every subsequent phase faster. Instead of writing each plugin from scratch, developers complete a pre-structured skeleton. The scaffold is also useful for documentation and API design review before implementation.

**Deliverable:** A working generator that can produce scaffolds for any of the 945 catalog entries.

### Phase 1: MongoDB Proof Pattern (1 day)

Hand-translate the MongoDB plugin using the scaffold as starting point:

| Task Class | BD Plugin | bd_stage | Effort |
|---|---|---|---|
| `io.kestra.plugin.mongodb.Find` | `MongoDBFindPlugin` | source | 2h |
| `io.kestra.plugin.mongodb.Load` | `MongoDBLoadPlugin` | destination | 2h |
| `io.kestra.plugin.mongodb.InsertOne` | `MongoDBInsertOnePlugin` | destination | 1h |
| `io.kestra.plugin.mongodb.Delete` | `MongoDBDeletePlugin` | utility | 1h |
| `io.kestra.plugin.mongodb.Update` | `MongoDBUpdatePlugin` | utility | 1h |
| `io.kestra.plugin.mongodb.Aggregate` | `MongoDBAggrPlugin` | source | 2h |

**Why MongoDB:** It exists in the catalog, has clear source/destination semantics, proves dual-role services work, and validates the catalog→scaffold→plugin→execution path. It's the reference case named in the absorption context document.

**New dependency:** `motor>=3.0` (async MongoDB driver for Python)

**Deliverable:** MongoDB as a fully operational Load source and destination, registered in `service_registry` with `bd_stage` classification, testable via Settings > Connections and the Load wizard.

### Phase 2: Core Primitives — RunnableTask Only (3 days)

Translate the 30 core tasks classified as TRANSLATABLE_NOW:

| Domain | Tasks | BD Equivalent | Effort |
|---|---|---|---|
| **http** | Request, Download, SseRequest | HTTP client (httpx) | 4h |
| **storage** | FilterItems, Split, Concat, Write, Delete, Size, Reverse, Deduplicate, LocalFiles | File I/O on Supabase Storage | 8h |
| **execution** | Fail, Assert, Count | Simple logic | 2h |
| **debug** | Echo, Return | Logging | 1h |
| **log** | Log | Logging | 0.5h |
| **flow** | Sleep | `asyncio.sleep()` | 0.5h |
| **condition** | Expression, DateTimeBetween, TimeBetween, DayWeek, Weekend, Not, Or, MultipleCondition | Pure logic | 4h |

**Why these:** They're building blocks that integration plugins and future flows will use. HTTP Request alone unblocks dozens of webhook-based integrations. Storage primitives (FilterItems, Split, Concat) enable data pipeline operations between source and destination plugins.

**Deliverable:** 30 new plugins in `app/plugins/core/`, auto-discovered by the registry.

### Phase 3: Priority Integration Plugins (5 days)

LLM-assisted translation of the highest-value connectors. For each, the scaffold generator produces the skeleton; Claude reads the Java source and generates the Python `run()` body; a developer reviews and tests.

**Priority list (based on common data pipeline needs):**

| Plugin | Key Tasks | New Dependencies | Effort |
|---|---|---|---|
| **plugin-jdbc (Postgres)** | Query, Batch | `asyncpg` | 4h |
| **plugin-jdbc (MySQL)** | Query, Batch | `aiomysql` | 4h |
| **plugin-aws (S3)** | List, Download, Upload, Delete | `boto3` | 6h |
| **plugin-kafka** | Produce, Consume | `aiokafka` | 6h |
| **plugin-redis** | Get, Set, Delete, Lists | `redis[hiredis]` | 4h |
| **plugin-elasticsearch** | Search, Index, Bulk | `elasticsearch[async]` | 6h |
| **plugin-serdes** | CsvToJson, JsonToCsv, AvroToJson | Python stdlib + `fastavro` | 8h |
| **plugin-fs (SFTP)** | Upload, Download, List | `asyncssh` | 4h |
| **plugin-docker** | Run, Build | `docker` SDK | 4h |
| **plugin-notifications** | Slack, Email, Teams | `httpx` (webhook) | 4h |

**Deliverable:** ~40 new plugin task classes covering the most common source, destination, transform, and utility operations.

### Phase 4: Broad Integration Scaling (Ongoing)

Use the scaffold generator + LLM-assisted generation to batch-translate remaining plugins. Process:

1. Run scaffold generator for a batch (e.g., all Tier 1 plugins)
2. LLM generates `run()` bodies from Java source
3. Developer reviews, adds tests, commits
4. Register as service functions via migration

**Target:** Activate plugins based on user demand. The scaffold generator makes each activation a ~30-minute task (generate → review → test → deploy).

### Phase 5: Orchestration Engine (Separate Project)

Design and build the flow execution engine. This is NOT plugin translation — it's a new system that enables:

- Flow definitions (YAML/JSON task graphs)
- Task graph resolution (If → then/else branches, ForEach → iteration)
- Parallel execution with concurrency limits
- Error handling, retry, finally blocks
- Variable passing between tasks
- Subflow execution

**This is the largest technical investment in the entire absorption.** The 15 FlowableTask core plugins and the 66 infrastructure-dependent tasks all depend on it. It should be its own proposal with its own timeline.

---

## 6. What This Does NOT Include

- **Kestra UI compatibility** (`web-kt`). That's a separate effort tracked in `docs/pipeline/kestra-ct/`.
- **Kestra JVM runtime.** We are NOT running Java. All execution is Python on FastAPI.
- **Full parity with Kestra features.** We absorb the plugin library and runtime primitives we need, not the entire product.
- **CDC/streaming plugins** (Debezium, Kafka Connect). These require persistent worker processes, not request-response execution.
- **Script execution runtimes** (Python-in-Python, Shell, Node, etc.). These need sandboxing infrastructure that doesn't exist yet.

---

## 7. Decision Points for the Team

### Decision 1: Scaffold generator scope

**Option A:** Generate from catalog metadata only (inputs, outputs, task_types). Fast to build, but `run()` body is empty.
**Option B:** Generate from catalog metadata + Java source parsing. Extracts `@PluginProperty` annotations and run() method structure. More scaffolding, but requires a Java parser.
**Option C:** Generate from catalog metadata + LLM translation of Java source. Most complete output, but requires LLM integration in the generator and human review.

**Recommendation:** Start with A (ship in 1 day), evolve to C (adds 2 days). The scaffold's value is the structure — the run() body always needs human verification regardless.

### Decision 2: Plugin file organization

**Option A:** All plugins flat in `app/plugins/` (current pattern — `gcs.py`, `arangodb.py`)
**Option B:** Grouped by provider: `app/plugins/mongodb/find.py`, `app/plugins/aws/s3.py`
**Option C:** Grouped by stage: `app/plugins/sources/mongodb.py`, `app/plugins/destinations/arangodb.py`

**Recommendation:** B. Provider grouping matches how users think about integrations and how the Java repos are structured. It also keeps file counts manageable as the plugin library grows.

### Decision 3: Python dependency management

Each translated plugin may need new pip packages (motor, boto3, asyncpg, etc.). Options:

**Option A:** Add all dependencies to `requirements.txt` upfront. Simple but bloats the Docker image.
**Option B:** Lazy imports — plugins import their dependencies inside `run()`. Missing packages fail at runtime, not boot.
**Option C:** Optional dependency groups in `requirements.txt` with comments, installed selectively per deployment.

**Recommendation:** B. Lazy imports are the standard pattern for plugin systems. A plugin that needs `motor` does `import motor` inside its run() method. If motor isn't installed, that plugin fails with a clear error but the rest of platform-api boots fine.

### Decision 4: How many integrations in the first 4-6 weeks?

This determines whether to invest in the scaffold generator (Phase 0) or just hand-translate (Phase 1-2).

- **If 3-5 integrations:** Hand-translate. Generator is over-investment.
- **If 10-20 integrations:** Generator saves significant time.
- **If 50+:** Generator is mandatory.

### Decision 5: Orchestration engine priority

The FlowableTask plugins (If, ForEach, Parallel, Dag) and the infrastructure-dependent plugins (KV, triggers, state) are blocked until an orchestration engine exists. Options:

**Option A:** Defer entirely. Focus on integration plugins as standalone operations (source → destination via load-runs).
**Option B:** Build a minimal flow engine that supports If and ForEach only. Unblocks basic conditional and iterative workflows.
**Option C:** Design the full engine now but implement incrementally.

**Recommendation:** A for the next 4-6 weeks. The load-runs orchestration already provides the source→destination pipeline. Flow composition is a follow-on that benefits from having more plugins available first.

---

## 8. Success Criteria

| Phase | Metric | Target |
|---|---|---|
| Phase 0 | Scaffold generator produces valid Python for any catalog entry | 945/945 entries |
| Phase 1 | MongoDB Find + Load operational via Load wizard | End-to-end test passing |
| Phase 2 | Core HTTP, storage, and logic plugins registered and callable | 30 new plugin classes |
| Phase 3 | Top 10 integration plugins operational | 40 new task classes |
| Phase 4 | Any catalog entry can be activated in < 30 minutes | Generator + review workflow |

---

## 9. Timeline Estimate

| Phase | Duration | Dependencies | Parallelizable |
|---|---|---|---|
| Phase 0: Scaffold Generator | 3 days | Catalog data (exists) | No |
| Phase 1: MongoDB Proof | 1 day | Phase 0 scaffold, `motor` package | No |
| Phase 2: Core Primitives | 3 days | None (standalone) | Yes, with Phase 1 |
| Phase 3: Priority Integrations | 5 days | Phase 0 scaffold | Yes, with Phase 2 |
| Phase 4: Broad Scaling | Ongoing | Phase 0 scaffold | Yes |
| Phase 5: Orchestration Engine | TBD (separate proposal) | Phases 1-3 inform design | No |

**Total for Phases 0-3:** ~12 days elapsed, ~10 days effort (Phases 2 and 3 can overlap).

---

## Appendix A: Complete External Plugin Inventory

| Plugin | Java Files | Submodules | Tier |
|--------|-----------|------------|------|
| plugin-ai | 0 | 0 | — |
| plugin-airbyte | 25 | 0 | 3 |
| plugin-airflow | 3 | 0 | 1 |
| plugin-airtable | 9 | 0 | 2 |
| plugin-algolia | 4 | 0 | 2 |
| plugin-amqp | 14 | 0 | 2 |
| plugin-ansible | 1 | 0 | 1 |
| plugin-anthropic | 2 | 0 | 1 |
| plugin-apify | 26 | 0 | 3 |
| plugin-argocd | 3 | 0 | 1 |
| plugin-aws | 77 | 0 | 3 |
| plugin-azure | 131 | 0 | 3 |
| plugin-beam | 8 | 0 | 4 |
| plugin-camel | 4 | 1 | 4 |
| plugin-cassandra | 9 | 0 | 2 |
| plugin-cloudflare | 18 | 0 | 2 |
| plugin-cloudquery | 3 | 0 | 1 |
| plugin-cobol | 7 | 0 | 4 |
| plugin-compress | 7 | 0 | 2 |
| plugin-confluence | 4 | 0 | 2 |
| plugin-couchbase | 5 | 0 | 2 |
| plugin-crypto | 3 | 0 | 2 |
| plugin-dagster | 1 | 0 | 1 |
| plugin-databricks | 25 | 0 | 3 |
| plugin-dataform | 1 | 0 | 1 |
| plugin-datagen | 18 | 0 | 2 |
| plugin-datahub | 2 | 0 | 1 |
| plugin-dbt | 39 | 0 | 3 |
| plugin-debezium | 35 | 7 | 4 |
| plugin-deepseek | 2 | 0 | 1 |
| plugin-discord | 4 | 0 | 1 |
| plugin-dlt | 2 | 0 | 1 |
| plugin-docker | 11 | 0 | 3 |
| plugin-documentdb | 11 | 0 | 2 |
| plugin-dropbox | 10 | 0 | 2 |
| plugin-elasticsearch | 19 | 0 | 2 |
| plugin-email | 7 | 0 | 2 |
| plugin-fivetran | 8 | 0 | 2 |
| plugin-flink | 5 | 0 | 4 |
| plugin-fs | 77 | 0 | 3 |
| plugin-gcp | 124 | 0 | 3 |
| plugin-gemini | 6 | 0 | 1 |
| plugin-git | 20 | 0 | 3 |
| plugin-github | 21 | 0 | 3 |
| plugin-gitlab | 4 | 0 | 1 |
| plugin-googleworkspace | 47 | 0 | 3 |
| plugin-graalvm | 12 | 0 | 4 |
| plugin-grafana | 7 | 0 | 2 |
| plugin-graphql | 1 | 0 | 1 |
| plugin-hightouch | 8 | 0 | 2 |
| plugin-hubspot | 28 | 0 | 3 |
| plugin-huggingface | 2 | 0 | 1 |
| plugin-influxdb | 10 | 0 | 2 |
| plugin-jdbc | 135 | 22 | 3 |
| plugin-jenkins | 3 | 0 | 1 |
| plugin-jira | 6 | 0 | 2 |
| plugin-jms | 10 | 0 | 2 |
| plugin-kafka | 17 | 0 | 2 |
| plugin-kestra | 24 | 0 | 4 |
| plugin-klaviyo | 8 | 0 | 2 |
| plugin-kubernetes | 23 | 0 | 3 |
| plugin-kvm | 10 | 0 | 2 |
| plugin-ldap | 8 | 0 | 2 |
| plugin-line | 3 | 0 | 1 |
| plugin-linear | 7 | 0 | 2 |
| plugin-linkedin | 4 | 0 | 1 |
| plugin-liquibase | 2 | 0 | 1 |
| plugin-malloy | 1 | 0 | 1 |
| plugin-meilisearch | 6 | 0 | 2 |
| plugin-meta | 26 | 0 | 3 |
| plugin-microsoft365 | 37 | 0 | 3 |
| plugin-minio | 18 | 0 | 2 |
| plugin-mistral | 1 | 0 | 1 |
| plugin-modal | 1 | 0 | 1 |
| plugin-mongodb | 12 | 0 | 2 |
| plugin-mqtt | 16 | 0 | 2 |
| plugin-n8n | 4 | 0 | 1 |
| plugin-nats | 13 | 0 | 2 |
| plugin-neo4j | 5 | 0 | 2 |
| plugin-notifications | 64 | 0 | 3 |
| plugin-notion | 8 | 0 | 2 |
| plugin-odoo | 4 | 0 | 1 |
| plugin-ollama | 1 | 0 | 1 |
| plugin-openai | 7 | 0 | 1 |
| plugin-opensearch | 16 | 0 | 2 |
| plugin-opsgenie | 4 | 0 | 1 |
| plugin-pagerduty | 4 | 0 | 1 |
| plugin-perplexity | 1 | 0 | 1 |
| plugin-pipedrive | 9 | 0 | 2 |
| plugin-powerbi | 4 | 0 | 2 |
| plugin-prefect | 3 | 0 | 1 |
| plugin-prometheus | 4 | 0 | 2 |
| plugin-pulsar | 17 | 0 | 2 |
| plugin-quickwit | 1 | 0 | 1 |
| plugin-redis | 20 | 0 | 2 |
| plugin-resend | 2 | 0 | 1 |
| plugin-scripts | 55 | 18 | 4 |
| plugin-sentry | 7 | 0 | 2 |
| plugin-serdes | 36 | 0 | 3 |
| plugin-servicenow | 5 | 0 | 2 |
| plugin-shopify | 14 | 0 | 2 |
| plugin-sifflet | 1 | 0 | 1 |
| plugin-singer | 51 | 0 | 3 |
| plugin-slack | 59 | 0 | 3 |
| plugin-snmp | 4 | 0 | 2 |
| plugin-soda | 8 | 0 | 2 |
| plugin-solace | 21 | 0 | 2 |
| plugin-spark | 6 | 0 | 4 |
| plugin-sqlmesh | 1 | 0 | 1 |
| plugin-squadcast | 4 | 0 | 1 |
| plugin-stripe | 17 | 0 | 2 |
| plugin-supabase | 7 | 0 | 2 |
| plugin-surrealdb | 5 | 0 | 2 |
| plugin-telegram | 5 | 0 | 1 |
| plugin-template-maven | 2 | 0 | 1 |
| plugin-template | 2 | 0 | 1 |
| plugin-tencent | 2 | 0 | 1 |
| plugin-terraform | 1 | 0 | 1 |
| plugin-tika | 1 | 0 | 1 |
| plugin-todoist | 7 | 0 | 2 |
| plugin-transform | 17 | 2 | 3 |
| plugin-trello | 6 | 0 | 2 |
| plugin-trivy | 1 | 0 | 1 |
| plugin-twilio | 14 | 0 | 2 |
| plugin-typesense | 6 | 0 | 2 |
| plugin-weaviate | 6 | 0 | 2 |
| plugin-x | 3 | 0 | 1 |
| plugin-youtube | 5 | 0 | 2 |
| plugin-zendesk | 5 | 0 | 2 |
| plugin-zenduty | 5 | 0 | 1 |
| plugin-zulip | 4 | 0 | 1 |

**Total: 131 plugins, ~1,600 Java source files, 72 submodules across 6 composite plugins**

---

## Appendix B: Core Internal Plugin Classification

| Task | Domain | Type | Classification |
|------|--------|------|---------------|
| Sleep | flow | RunnableTask | TRANSLATABLE_NOW |
| If | flow | FlowableTask | NEEDS_ORCHESTRATION |
| Switch | flow | FlowableTask | NEEDS_ORCHESTRATION |
| ForEach | flow | FlowableTask | NEEDS_ORCHESTRATION |
| ForEachItem | flow | FlowableTask | NEEDS_ORCHESTRATION |
| Parallel | flow | FlowableTask | NEEDS_ORCHESTRATION |
| Sequential | flow | FlowableTask | NEEDS_ORCHESTRATION |
| Dag | flow | FlowableTask | NEEDS_ORCHESTRATION |
| Subflow | flow | ExecutableTask | NEEDS_INFRASTRUCTURE |
| LoopUntil | flow | FlowableTask | NEEDS_ORCHESTRATION |
| Pause | flow | FlowableTask | NEEDS_ORCHESTRATION |
| AllowFailure | flow | FlowableTask | NEEDS_ORCHESTRATION |
| EachParallel | flow | FlowableTask | NEEDS_ORCHESTRATION |
| EachSequential | flow | FlowableTask | NEEDS_ORCHESTRATION |
| WorkingDirectory | flow | FlowableTask | NEEDS_ORCHESTRATION |
| Template | flow | FlowableTask | NEEDS_ORCHESTRATION |
| Request | http | RunnableTask | TRANSLATABLE_NOW |
| Download | http | RunnableTask | TRANSLATABLE_NOW |
| SseRequest | http | RunnableTask | TRANSLATABLE_NOW |
| KV Get | kv | RunnableTask | NEEDS_INFRASTRUCTURE |
| KV Set | kv | RunnableTask | NEEDS_INFRASTRUCTURE |
| KV Delete | kv | RunnableTask | NEEDS_INFRASTRUCTURE |
| KV GetKeys | kv | RunnableTask | NEEDS_INFRASTRUCTURE |
| FilterItems | storage | RunnableTask | TRANSLATABLE_NOW |
| Split | storage | RunnableTask | TRANSLATABLE_NOW |
| Concat | storage | RunnableTask | TRANSLATABLE_NOW |
| Write | storage | RunnableTask | TRANSLATABLE_NOW |
| Delete (storage) | storage | RunnableTask | TRANSLATABLE_NOW |
| Size | storage | RunnableTask | TRANSLATABLE_NOW |
| Reverse | storage | RunnableTask | TRANSLATABLE_NOW |
| DeduplicateItems | storage | RunnableTask | TRANSLATABLE_NOW |
| LocalFiles | storage | RunnableTask | TRANSLATABLE_NOW |
| Fail | execution | RunnableTask | TRANSLATABLE_NOW |
| Assert | execution | RunnableTask | TRANSLATABLE_NOW |
| Count | execution | RunnableTask | TRANSLATABLE_NOW |
| SetVariables | execution | ExecutionUpdatable | NEEDS_INFRASTRUCTURE |
| Exit | execution | RunnableTask | NEEDS_INFRASTRUCTURE |
| Labels | execution | ExecutionUpdatable | NEEDS_INFRASTRUCTURE |
| Resume | execution | ExecutionUpdatable | NEEDS_INFRASTRUCTURE |
| Echo | debug | RunnableTask | TRANSLATABLE_NOW |
| Return | debug | RunnableTask | TRANSLATABLE_NOW |
| Log | log | RunnableTask | TRANSLATABLE_NOW |
| Fetch (logs) | log | RunnableTask | NEEDS_INFRASTRUCTURE |
| Expression | condition | Condition | TRANSLATABLE_NOW |
| DateTimeBetween | condition | Condition | TRANSLATABLE_NOW |
| TimeBetween | condition | Condition | TRANSLATABLE_NOW |
| DayWeek | condition | Condition | TRANSLATABLE_NOW |
| Weekend | condition | Condition | TRANSLATABLE_NOW |
| Not | condition | Condition | TRANSLATABLE_NOW |
| Or | condition | Condition | TRANSLATABLE_NOW |
| MultipleCondition | condition | Condition | TRANSLATABLE_NOW |
| Schedule | trigger | AbstractTrigger | NEEDS_INFRASTRUCTURE |
| Webhook | trigger | AbstractTrigger | NEEDS_INFRASTRUCTURE |
| Flow (trigger) | trigger | AbstractTrigger | NEEDS_INFRASTRUCTURE |
| Toggle | trigger | AbstractTrigger | TRANSLATABLE_NOW |
| Publish (metric) | metric | RunnableTask | NEEDS_INFRASTRUCTURE |

**Summary: 30 TRANSLATABLE_NOW, 15 NEEDS_ORCHESTRATION, ~40 NEEDS_INFRASTRUCTURE**

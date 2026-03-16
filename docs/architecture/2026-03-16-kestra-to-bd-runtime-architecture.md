# BlockData Runtime Architecture for Kestra Plugin Absorption

> Produced from source-level analysis of Kestra Core (761 files), Kestra Internal Plugins (129 files), Kestra External Plugins (~1,600 files across 131 repos), and BlockData's execution plane (~24 plugin classes, ~15 infrastructure files).

---

## 1. Design Principles

1. **BD builds its own execution plane.** Kestra contributes plugin semantics, catalog data, and proven interaction patterns — not a JVM runtime.
2. **Composition over inheritance.** Kestra uses 4 different connection patterns (interface mixin, abstract class hierarchy, inline properties, external POJO). BD uses one: composition-based connections with a unified auth provider.
3. **Registry as backbone.** Every plugin is a registered function. Execution, credentials, and orchestration route through the registry — not ad-hoc wiring.
4. **Translate the contract, not the code.** Kestra's `RunnableTask.run(RunContext) → Output` maps to BD's `BasePlugin.run(ExecutionContext) → PluginOutput`. The Python contract is already correct.
5. **Thin wrappers first.** ~40% of Kestra's 80+ internal plugins are thin wrappers around RunContext services. These translate to 5–15 line Python functions once the runtime services exist.

---

## 2. Contract Mapping: Kestra → BD

### 2.1 Task Types

| Kestra Contract | Method | BD Equivalent | Status |
|---|---|---|---|
| `RunnableTask<T extends Output>` | `run(RunContext) → T` | `BasePlugin.run(context, params) → PluginOutput` | **Done** |
| `FlowableTask<T extends Output>` | `childTasks()`, `resolveNexts()` | Orchestrator interprets control-flow plugin outputs | Stubs exist (If, Switch, ForEach, Parallel) |
| `ExecutableTask<T extends Output>` | `createSubflowExecutions()` | Not started | Track C |
| `ExecutionUpdatableTask` | `update(Execution, RunContext)` | Not started | Track C |
| `WorkerJobLifecycle` | `kill()`, `stop()` | Not needed (HTTP request boundary = lifecycle) | N/A |

### 2.2 Output

| Kestra | BD |
|---|---|
| `Output` interface with `finalState()` and `toMap()` | `PluginOutput(data=dict, state=SUCCESS\|FAILED\|WARNING, logs=list)` |
| Output fields become `{{ outputs.taskId.field }}` | Orchestrator populates `variables` dict from prior outputs |

### 2.3 Property\<T\> Deferred Rendering

Kestra wraps every user-facing input in `Property<T>` — a container that holds either a static value or a Pebble template expression, resolved at runtime via `RunContext.render(property).as(Type.class)`.

BD equivalent: `ExecutionContext.render(template_string) → str` using Jinja2. Plugin `params` dict values are strings that may contain `{{ }}` expressions. The plugin calls `context.render()` on any value that might be templated.

**Gap:** BD renders eagerly (caller decides which params to render). Kestra renders lazily (Property\<T\> defers until `.as()` call). For Track A (single-step plugins), this distinction doesn't matter — the plugin renders all params at the start of `run()`. For Track B+ (multi-step), the orchestrator must assemble variables before invoking each step.

---

## 3. Runtime Services: Dependency-Ordered Build Plan

These are the services that RunContext provides to every plugin. Organized by dependency order — each layer depends only on layers above it.

### Layer 0: Foundation (no dependencies)

These exist and work today.

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Logging** | `RunContext.logger()` → SLF4J | `context.logger` → Python `logging.Logger` | **Done** |
| **Encryption** | `EncryptionService.encrypt/decrypt()` | `crypto.py` → AES-GCM | **Done** |
| **Variables** | `RunContext.getVariables()` → immutable Map | `context.variables` → dict | **Done** |
| **Execution metadata** | `taskRunInfo()`, `flowInfo()` | `context.execution_id`, `context.task_run_id`, `context.user_id` | **Done** |

### Layer 1: Template Rendering (depends on: Layer 0)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Render string** | `render(String)` → Pebble engine | `context.render(str)` → Jinja2 | **Done** |
| **Render typed** | `renderTyped(String) → Object` | Not needed (Python is dynamic) | N/A |
| **Render collections** | `render(List)`, `render(Set)`, `render(Map)` | Caller iterates and calls `render()` per item | **Trivial to add** |
| **Pebble filter parity** | `jq`, `json`, `keys`, `dateAdd`, `slugify` | Jinja2 covers ~95%. Missing: `jq` | Gap: custom Jinja2 filters |

### Layer 2: Working Directory (depends on: Layer 0)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Temp directory** | `workingDir().path()` → isolated Path | `context.work_dir` → `tempfile.TemporaryDirectory` | **Done** |
| **Create temp file** | `createTempFile(bytes, ext)` | `context.create_temp_file(suffix)` | **Done** |
| **Create named file** | `createFile(name, content)` | `Path(context.work_dir / name).write_bytes()` | Trivial |
| **Find files by pattern** | `findAllFilesMatching(patterns)` | `glob.glob()` on work_dir | Trivial |
| **Path traversal protection** | `resolve(Path)` checks bounds | Not implemented | **Add** |
| **Cleanup** | `cleanup()` | `context.cleanup()` | **Done** |

### Layer 3: Credential Resolution (depends on: Layer 0 encryption)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Secret lookup** | `secret.get(key)` → pluggable backend | `context.get_secret(key)` → env vars | **Done** (env-backed) |
| **Credential fetch** | Per-plugin Connection classes | `connection.py` → `resolve_connection_sync()` | **Done** |
| **Auth detection** | 4 patterns (interface, abstract, inline, POJO) | `auth_providers.py` → unified `resolve_auth()` with 6 patterns | **Done** (superior) |
| **Credential decryption** | KMS / external | `crypto.py` → AES-GCM from encrypted DB | **Done** |

### Layer 4: Storage (depends on: Layers 0–2)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Put file** | `storage().putFile(stream, uri)` | `context.upload_file(bucket, path, content)` | **Done** |
| **Get file** | `storage().getFile(uri)` → InputStream | `context.download_file(uri)` → bytes | **Done** |
| **List files** | `storage().namespace().list()` | `context.list_files(bucket, prefix)` | **Done** |
| **Delete file** | `storage().deleteFile(uri)` | `context.delete_files(bucket, paths)` | **Done** |
| **Namespace files** | `storage().namespace(ns)` → isolated FS | Not implemented (no namespace concept yet) | Track B |

### Layer 5: Serialization (depends on: Layer 4 storage)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Row-oriented codec** | `FileSerde` → Amazon Ion binary | `serialization.py` → msgspec JSONL | **Done** (faster) |
| **Chunked bulk write** | Per-plugin batching | `chunked_write(docs, writer_fn, chunk_size)` | **Done** (superior) |
| **Streaming iteration** | `FileSerde.readAll()` | `iter_jsonl()`, `decode_jsonl_from_file()` | **Done** |

### Layer 6: HTTP Client (depends on: Layer 3 auth)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **HTTP requests** | Built-in `HttpClient` with auth, SSL, proxy, logging (18 files) | Plugins use `httpx` directly | **Done** (sufficient) |
| **Auth injection** | Header injection, Basic, Bearer, API Key | Plugin-level via `resolve_auth()` | **Done** |
| **Retry / backoff** | HttpClient has retry | Not built-in | Track B |

### Layer 7: KV Store (depends on: Layer 3 auth, Layer 4 storage)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Namespace KV** | `namespaceKv(ns)` → get/set/delete | Not implemented | **Build** |
| **Cross-namespace ACL** | `acl().allowNamespace(ns).check()` | Not implemented | Track B |

### Layer 8: Metrics (depends on: Layer 0)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Counter/Timer** | `metric(Counter.of(...))` → Micrometer | Not implemented | **Deferred** to production scale |
| **Tagged metrics** | flow_id, namespace_id, tenant_id tags | N/A | Deferred |

### Layer 9: Validation (depends on: Layer 1 rendering)

| Service | Kestra | BD Current | Status |
|---|---|---|---|
| **Bean validation** | `validate(T)` → Jakarta annotations | Not implemented (Python uses runtime checks) | Low priority |
| **Schema validation** | JSON Schema from `task_schema` | Available in DB (`integration_catalog_items.task_schema`) | **Can add** |

---

## 4. Base Classes and Shared Abstractions

### 4.1 What BD Needs (Python)

Based on how Kestra's 131 external plugin repos structure their code, BD needs exactly 4 shared abstractions:

#### A. `BasePlugin` (exists — no changes needed)

```
BasePlugin
  ├── run(context: ExecutionContext, params: dict) → PluginOutput
  ├── task_types: list[str]   # registry keys
  └── description: str
```

Maps to Kestra's `RunnableTask<Output>`. Every plugin implements `run()`.

#### B. `ConnectionMixin` (new — composition, not inheritance)

Kestra's external plugins all follow some variant of: resolve credentials → build client → execute operation → return output. The credential and client parts repeat across every task in a plugin family.

```
ConnectionMixin
  ├── resolve_credentials(context, params) → dict
  │     Uses: context credential resolution + auth_providers.resolve_auth()
  ├── build_client(credentials, params) → client
  │     Provider-specific: GCS → storage.Client, Arango → ArangoClient, etc.
  └── close_client(client) → None
```

**Not a base class.** A mixin that plugin classes opt into. Equivalent to Kestra's per-family AbstractTask + Connection, but unified.

#### C. `FetchStrategy` enum (new — for query/list plugins)

Kestra's JDBC plugins use `FetchType` (FETCH, FETCH_ONE, STORE, NONE) to control how results are handled. This pattern recurs across all query-oriented plugins (BigQuery, MongoDB Find, DynamoDB Scan, etc.).

```python
class FetchStrategy(str, Enum):
    FETCH = "fetch"          # Return all rows in output.data
    FETCH_ONE = "fetch_one"  # Return first row
    STORE = "store"          # Write to storage, return URI
    NONE = "none"            # Discard results
```

#### D. `RetryPolicy` (new — for Track B)

```python
@dataclass
class RetryPolicy:
    max_attempts: int = 1
    backoff: str = "exponential"   # exponential | linear | fixed
    initial_delay_ms: int = 1000
    max_delay_ms: int = 60000
    retry_on: list[str] = field(default_factory=list)  # error substrings
```

Not needed for Track A. Required before Track B (multi-step pipelines).

### 4.2 What BD Does NOT Need

These Kestra abstractions exist because of Java's type system or Kestra's specific architecture. BD should not replicate them:

| Kestra Abstraction | Why BD Skips It |
|---|---|
| `Property<T>` wrapper class | Python is dynamically typed; `context.render(str)` suffices |
| `@PluginProperty` annotations | BD uses `task_schema` JSONB from the catalog DB |
| `@Plugin` annotation (examples, metrics, beta) | BD stores this metadata in `integration_catalog_items` |
| `FlowableTask` interface | BD's orchestrator handles flow control; plugins return signals |
| `ExecutableTask` interface | Subflow invocation is orchestrator responsibility |
| `PluginClassLoader` / `PluginScanner` | Python's `pkgutil` + `inspect` already handles this |
| `AbstractCellConverter` per-database | Single converter with type registry |
| `GenericTask` fallback | BD's registry returns 404 for unknown task types |
| `ResolvedTask` wrapper | Orchestrator tracks resolution state, not the plugin |
| `RunContextProperty<T>` | Unnecessary with Python's duck typing |

---

## 5. Plugin Family Translation Patterns

### 5.1 Cloud Provider Plugins (GCP, AWS, Azure)

Kestra pattern: `GcpInterface` mixin → `CredentialService.credentials()` → native SDK client → operation → Output

BD pattern:
```
1. params["connection_id"] → resolve_connection_sync() → credentials dict
2. resolve_auth(credentials) → AuthProvider (OAuth2-SA for GCP, IAM for AWS, etc.)
3. Provider SDK client (google.cloud.storage.Client, boto3.client, etc.)
4. Operation (list, download, upload, query)
5. PluginOutput(data=results, state=SUCCESS)
```

**Already proven** with GCSListPlugin and GCSDownloadCsvPlugin.

### 5.2 Database Plugins (JDBC, MongoDB, ArangoDB)

Kestra pattern: `AbstractJdbcBaseQuery` → `connection(RunContext)` → SQL execution → `FetchType` dispatch → CellConverter → Output

BD pattern:
```
1. Credential resolution (same as 5.1)
2. Driver-specific client (psycopg, pymongo, python-arango, etc.)
3. Query execution with parameter binding
4. FetchStrategy dispatch:
   - FETCH: collect rows → PluginOutput(data=rows)
   - STORE: stream to JSONL → upload → PluginOutput(data={"uri": uri})
5. Close client
```

**Already proven** with ArangoDBLoadPlugin. MongoDB is recommended as next translation to validate the pattern across database families.

### 5.3 File System Plugins (S3, GCS, SFTP, FTP)

Kestra pattern: `AbstractVfsTask` → VFS2 abstraction → protocol-specific FileSystemOptions → list/get/put/move/delete

BD pattern:
```
1. Credential resolution
2. Protocol-specific client (boto3 for S3, google.cloud.storage for GCS, paramiko for SFTP)
3. Operation (list, download, upload, move, delete)
4. For downloads: write to work_dir → upload to storage → return URI
5. PluginOutput
```

No universal VFS abstraction needed. Each protocol is a separate plugin. The operations are standard enough that a `FileSystemPlugin` mixin could reduce boilerplate, but isn't required.

### 5.4 Script Plugins (Python, Shell, Node)

Kestra pattern: `AbstractBash` → `CommandsWrapper` → `ScriptRunner` (Process or Docker) → output file capture → storage upload

BD pattern: Already implemented. `PythonScriptPlugin`, `ShellScriptPlugin`, `NodeScriptPlugin` use `subprocess.run()` with configurable timeout, output capture, and template rendering.

### 5.5 Notification Plugins (Slack, Teams, Email)

Kestra pattern: `AbstractHttpOptionsTask` → HTTP client config → format-specific payload → POST to webhook

BD pattern:
```
1. params["webhook_url"] or credential resolution
2. httpx.post(url, json=payload)
3. PluginOutput(state=SUCCESS if 2xx)
```

Thin wrappers. ~10 lines each once HTTP client and auth are available.

### 5.6 AI/LLM Plugins (Anthropic, OpenAI)

Kestra pattern: Inline `apiKey` property → SDK client builder → API call → token usage metrics → Output

BD pattern:
```
1. Credential resolution (API key)
2. SDK client (anthropic.Anthropic, openai.OpenAI)
3. API call with rendered params (model, messages, temperature, etc.)
4. PluginOutput(data={"content": response, "usage": token_counts})
```

---

## 6. Orchestrator Requirements (What Sits Above Plugins)

Plugins are single-step executors. Everything multi-step requires an orchestrator. Based on Kestra's FlowableTask implementations and internal plugin patterns:

### 6.1 Track A Orchestrator (Current — load_runs.py)

Hardcoded pipeline: source_list → fan-out items → source_download per item → dest_load per item → finalize.

**Works today.** Sufficient for GCS→ArangoDB proof point.

### 6.2 Track B Orchestrator (Next — generalized pipelines)

Requirements derived from Kestra's FlowableTask contract:

| Capability | Kestra Source | BD Requirement |
|---|---|---|
| **Sequential chaining** | `Sequential` task | Execute steps in order; pass outputs forward |
| **Variable binding** | `outputs.taskId.field` in Pebble | Populate next step's `variables` from prior `PluginOutput.data` |
| **Conditional branching** | `If` task evaluates expression → routes to branch | Read `PluginOutput.data["branch"]` from IfPlugin → invoke correct next step |
| **Error handling** | `allowFailure`, `getErrors()` | Check `PluginOutput.state`; continue or invoke error handler |
| **Retry** | `AbstractRetry` on Task base | Re-invoke plugin with `RetryPolicy`; track `attempt_number` |
| **Pause/Resume** | `Pause` task sets PAUSED state | Persist execution state in DB; resume endpoint resumes from paused step |

### 6.3 Track C Orchestrator (Future — full flow engine)

| Capability | Kestra Source | BD Requirement |
|---|---|---|
| **DAG resolution** | `Dag` task + `FlowableUtils.resolveSequentialNexts()` | Task graph with dependency edges; topological sort |
| **Parallel execution** | `Parallel` task; `EachParallel` | Fan-out to concurrent plugin invocations; fan-in on completion |
| **ForEach iteration** | `ForEach` + `EachSequential`/`EachParallel` | Iterate items; invoke step per item; collect outputs |
| **Subflow invocation** | `ExecutableTask.createSubflowExecutions()` | Invoke another flow definition as a step |
| **State machine** | `Execution` model: CREATED → RUNNING → SUCCESS/FAILED/KILLED/PAUSED | Persistent execution state with transitions |
| **Worker queue** | `QueueInterface` for executor↔worker dispatch | Async task queue (currently everything is synchronous in HTTP request) |

### 6.4 Track D (Event-Driven — separate project)

Triggers (Schedule, Webhook, Polling, Realtime) require persistent scheduler infrastructure. Not part of the plugin runtime architecture.

---

## 7. Build Order

What must exist before what. Each phase unlocks the next.

### Phase 0: Already Done

- [x] `BasePlugin` + `ExecutionContext` + `PluginOutput` contract
- [x] Plugin registry with auto-discovery
- [x] Generic `POST /{function_name}` invocation endpoint
- [x] 6 auth patterns with `resolve_auth()`
- [x] Credential resolution from encrypted DB
- [x] AES-GCM encryption
- [x] Jinja2 template rendering with filters, conditions, loops
- [x] Working directory (temp files)
- [x] Supabase Storage (upload, download, list, delete)
- [x] JSONL serialization with msgspec + chunked_write
- [x] Load orchestration (submit, step, finalize)
- [x] 14 operational plugins + 9 flow-control stubs
- [x] 945 catalog entries with full task_schema in DB

### Phase 1: Harden Runtime Services (enables bulk plugin translation)

Priority: these gaps block translation of most external plugins.

| Item | Effort | Unlocks |
|---|---|---|
| Path traversal protection on work_dir | 1 hour | Secure file operations |
| `render_map()` / `render_list()` convenience methods on ExecutionContext | 2 hours | Plugins with map/list properties |
| Custom Jinja2 filters (`json`, `keys`, `slug`, `date_add`) | 4 hours | Templates using Pebble-specific filters |
| Schema validation from `task_schema` JSONB | 4 hours | Input validation before plugin execution |
| `FetchStrategy` enum + dispatch in ExecutionContext | 2 hours | All query-oriented plugins |

**Total: ~2 days**

### Phase 2: ConnectionMixin + First Plugin Family Translation (validates pattern)

| Item | Effort | Unlocks |
|---|---|---|
| `ConnectionMixin` with `resolve_credentials` / `build_client` | 4 hours | Uniform credential→client pipeline |
| Translate MongoDB plugin family (7 tasks: Find, Load, Aggregate, Insert, Update, Delete, Bulk) | 2 days | Proves DB plugin pattern; second family after ArangoDB |
| Translate one cloud-storage family beyond GCS (e.g., S3 — List, Upload, Download, Copy, Delete) | 2 days | Proves cloud provider pattern |
| Document translation recipe | 4 hours | Anyone can translate a plugin family |

**Total: ~1 week**

### Phase 3: Generalized Pipeline Orchestrator (Track B)

| Item | Effort | Unlocks |
|---|---|---|
| Pipeline definition format (YAML or JSON) | 2 days | Declarative multi-step workflows |
| Variable binding (upstream outputs → downstream inputs) | 2 days | Task chaining |
| `RetryPolicy` + attempt tracking | 1 day | Transient failure recovery |
| Conditional routing from If/Switch plugin outputs | 1 day | Branching pipelines |
| Error handler invocation (`allowFailure`, `onError`) | 1 day | Graceful degradation |
| Pause/Resume with persistent state | 2 days | Human-in-the-loop workflows |
| Generalize load_runs.py into pipeline executor | 3 days | All multi-step use cases |

**Total: ~2 weeks**

### Phase 4: Bulk Plugin Translation (Track A at scale)

With Phases 1–2 complete, each plugin family follows the proven recipe:

| Plugin Family | Tasks | Estimated Effort |
|---|---|---|
| PostgreSQL (JDBC) | Query, Insert, Batch, Trigger | 2 days |
| MySQL (JDBC) | Query, Insert, Batch, Trigger | 1 day (pattern proven) |
| S3 (if not done in Phase 2) | List, Upload, Download, Copy, Delete, Trigger | 2 days |
| Azure Blob | List, Upload, Download, Delete | 1.5 days |
| Slack | Send, IncomingWebhook | 0.5 days |
| Email (SMTP) | Send | 0.5 days |
| Anthropic | Chat, Completion | 1 day |
| OpenAI | Chat, Completion, Embedding | 1 day |
| DLT | Pipeline execution | 1 day |
| SFTP/FTP | List, Download, Upload, Move, Delete | 1.5 days |

Translation velocity increases as patterns stabilize. First family: ~2 days. Subsequent families in the same category: ~1 day.

### Phase 5: Flow Orchestration Engine (Track C)

| Item | Effort |
|---|---|
| Task graph model (DAG) | 1 week |
| Topological sort + execution scheduler | 1 week |
| Parallel execution (fan-out / fan-in) | 1 week |
| ForEach iteration engine | 1 week |
| Subflow invocation | 1 week |
| Execution state machine (CREATED → RUNNING → terminal states) | 1 week |
| Worker queue for async dispatch | 1 week |

**Total: ~6–8 weeks.** This is a separate project. Not required for Track A or Track B value delivery.

---

## 8. What to Build Next

The immediate next action, based on everything above:

1. **Phase 1** items (2 days) — harden runtime services
2. **MongoDB translation** (2 days) — proves DB plugin pattern beyond ArangoDB, validates ConnectionMixin
3. **Translation recipe doc** — captures the pattern so future translations are mechanical

Everything in Phase 0 is done. The substrate works. The architecture is defined. The gap between "3 working plugin families" and "20 working plugin families" is translation labor, not architectural uncertainty.

---

## Appendix A: RunContext Service Inventory (from source analysis)

### Tier 1 — Essential (required by most plugins)

| Service | Kestra Class | BD Equivalent | Methods |
|---|---|---|---|
| Variable Rendering | `VariableRenderer` | `ExecutionContext.render()` | render(str), render(list), render(map), renderTyped() |
| Storage | `StorageInterface` | `ExecutionContext.upload/download/list/delete_file()` | putFile, getFile, deleteFile, namespace() |
| Working Directory | `WorkingDir` | `ExecutionContext.work_dir` | path(), createTempFile(), createFile(), findAllFilesMatching(), cleanup() |
| Encryption | `EncryptionService` | `crypto.py` | encrypt(), decrypt() |
| Logging | `RunContextLogger` | `ExecutionContext.logger` | logger() → SLF4J / Python Logger |
| KV Store | `KVStoreService` | Not yet built | namespaceKv(ns).get/set/delete() |
| Plugin Config | `PluginConfigurations` | Params dict from catalog | pluginConfiguration(name), pluginConfigurations() |

### Tier 2 — Common (used by many plugins)

| Service | Kestra Class | BD Equivalent |
|---|---|---|
| Metrics | `MetricRegistry` | Deferred |
| Validation | `Validator` | Schema validation from task_schema |
| ACL | `AclChecker` | Not yet built |
| Local Path | `LocalPath` | Not needed (no host filesystem access) |

### Tier 3 — Specialized (specific plugin types only)

| Service | Kestra Class | BD Equivalent |
|---|---|---|
| Assets | `AssetManagerFactory` | Not needed |
| Input/Output | `InputAndOutputImpl` | Orchestrator responsibility |
| SDK | `RunContextSDKFactory` | Not needed (no self-API calls) |
| Version | `VersionProvider` | Not needed |

---

## Appendix B: Kestra Plugin Connection Patterns → BD Unified Pattern

### Kestra's 4 Patterns

**Pattern A (GCP):** Interface mixin (`GcpInterface`) + static `CredentialService.credentials()` → `GoogleCredentials`

**Pattern B (AWS, Azure):** Abstract class hierarchy (`AbstractConnection extends Task`) with built-in credential builder methods

**Pattern C (Anthropic, OpenAI):** Inline `Property<String> apiKey` on the task class → direct SDK client construction

**Pattern D (MongoDB):** External POJO (`MongoDbConnection`) composed into task via `@NotNull` field → `connection.client(runContext)`

### BD's Unified Pattern

All four collapse into:

```
1. params["connection_id"]
2. resolve_connection_sync(connection_id, user_id)  →  credentials dict
3. resolve_auth(credentials)                         →  AuthProvider instance
4. Plugin-specific client construction               →  SDK client
5. Operation
6. PluginOutput
```

Steps 1–3 are identical for every plugin. Step 4 varies by provider SDK. Step 5 is the plugin's actual work.

The `ConnectionMixin` encapsulates steps 1–4. A plugin that uses it implements only step 5.

---

## Appendix C: Internal Plugin Classification Summary

| Runtime Service | # Tasks Using It | Examples |
|---|---|---|
| Variable Rendering | 45+ | All tasks with dynamic properties |
| Storage | 25+ | FilterItems, Split, Concat, Download, NamespaceFiles |
| Flow Engine | 15+ | ForEach, If, Parallel, Dag, Switch, Sequential |
| KV Store | 6+ | Get, Set, Delete, GetKeys, PurgeKV |
| Logging | 10+ | Log, Fetch, Echo, Return |
| HTTP Client | 4 | Request, Download, SseRequest, HTTP Trigger |
| Metrics | 8+ | Publish, Assert, Return, Process |
| Repositories | 8+ | PurgeExecutions, FetchLogs, Dashboard data |
| ACL | 6+ | KV Get (cross-namespace), NamespaceFiles, Purge |

**Complexity distribution:** ~40% thin wrappers (5–15 lines of logic), ~45% moderate (50–150 lines), ~15% complex (100+ lines, multi-service).

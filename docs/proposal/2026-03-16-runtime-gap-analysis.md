# Runtime Gap Analysis: Kestra Plugin Infrastructure vs. BlockData Execution Plane

**Date:** 2026-03-16
**Purpose:** Map every runtime service Kestra provides to plugins, compare against what BD has today, identify what must be built before translated plugins can run end-to-end.
**Method:** Source-verified against `E:/kestra/core/`, `E:/kestra-io/plugins/`, and `E:/writing-system/services/platform-api/`.

---

## The Question None of the Proposals Asked

The three earlier proposals catalog what exists in Kestra and classify what's translatable. None of them ask the reverse:

**What does BD actually need to provide at runtime so that a translated plugin works?**

A translated plugin isn't just a Python rewrite of a Java `run()` method. It's a Python function that calls runtime services — file I/O, template rendering, credential resolution, temp file management, metrics. If those services don't exist in BD, the translated plugin fails at runtime even if the translation is perfect.

This document maps every service, identifies the gaps, and classifies them as: DONE, EASY FIX, MEDIUM EFFORT, or DEFERRED.

---

## 1. What Kestra RunContext Provides to Plugins

Every Kestra plugin receives a `RunContext` object. This is the plugin's gateway to all platform services. Source: `E:/kestra/core/src/main/java/io/kestra/core/runners/RunContext.java` (abstract) and `DefaultRunContext.java` (implementation).

### 1.1 File Storage

**Kestra API** (via `runContext.storage()`):
```java
InputStream getFile(URI uri)              // Read artifact by kestra:// URI
URI putFile(File file)                    // Write artifact, get URI back
URI putFile(InputStream stream, String name)
boolean isFileExist(URI uri)
boolean deleteFile(URI uri)
List<FileAttributes> list(URI prefix)
URI getContextBaseURI()                   // Base URI for this execution
```

**How plugins use it:**
- Source plugins write extracted data: `runContext.storage().putFile(tempFile)` → returns `kestra://` URI
- Destination plugins read upstream data: `runContext.storage().getFile(uri)` → returns InputStream
- Cleanup: `runContext.storage().deleteFile(uri)`

**BD current state:**
- `context.upload_file(bucket, path, content)` — write to Supabase Storage, returns public URL. **Works.**
- `download_from_storage(url, key, bucket, path)` — exists in `app/infra/storage.py` but **NOT exposed on ExecutionContext**. Plugins call `httpx.get(source_uri)` directly (see ArangoDB plugin line 26).
- No `list_files()`, `delete_file()`, or `file_exists()` on context.

**Gap:** Plugins can write artifacts but can't read them through context. They work around this by making raw HTTP calls to the public URL. This works but breaks the abstraction.

### 1.2 File Serialization

**Kestra API** (`io.kestra.core.serializers.FileSerde`):
```java
static Flux<Object> readAll(Reader reader)           // Stream Ion lines
static <T> Mono<Long> writeAll(Writer writer, Flux<T> values)  // Write Ion lines
static void write(OutputStream output, Object row)   // Write single Ion line
```

**How plugins use it:**
- Between tasks, data flows as Ion-formatted line-delimited files stored in Kestra's internal storage
- Source plugins: write rows → `FileSerde.writeAll()` → stored as Ion file
- Destination plugins: `FileSerde.readAll()` → stream rows from Ion file

**BD current state:**
- Uses JSONL (JSON Lines) instead of Ion. GCS download plugin writes JSONL via `json.dumps()`. ArangoDB load plugin reads JSONL via `json.loads()` per line.
- No formal serialization abstraction — each plugin does its own JSON encoding.

**Gap:** No gap for correctness — JSONL is functionally equivalent to Ion for JSON-representable data. But there's no shared utility. Each plugin reimplements the same `"\n".join(json.dumps(doc) for doc in documents)` pattern.

### 1.3 Working Directory (Temp Files)

**Kestra API** (`runContext.workingDir()`):
```java
Path path()                              // Get working dir path
Path createTempFile()                    // Create temp file
Path createTempFile(String extension)    // Create temp file with extension
Path createFile(String name)             // Create named file
Path createFile(String name, byte[] content)
void cleanup()                           // Delete all temp files
```

**How plugins use it:**
- Buffer large downloads to disk before processing
- Write intermediate results before uploading to storage
- CsvToIon: writes parsed output to temp `.ion` file, then uploads

**BD current state:**
- **Not implemented.** Plugins hold everything in memory (Python lists, byte strings).
- GCS download plugin: parses CSV in memory, writes JSONL bytes to storage directly.
- ArangoDB load plugin: downloads JSONL into memory, parses all lines, then batch-inserts.

**Gap:** Works for small files. Breaks for large datasets. A 1GB CSV cannot be held in memory. Need a temp file wrapper on ExecutionContext.

### 1.4 Template/Variable Rendering

**Kestra API** (via `runContext.render()`):
```java
String render(String template)                       // Render Pebble expression
Object renderTyped(String template)                  // Render with type preservation
String render(String template, Map<String, Object> vars)  // Render with extra variables
Map<String, Object> render(Map<String, Object> map)  // Render all values in a map
```

**Pebble engine capabilities:**
- Variable resolution: `{{ outputs.task1.value }}`
- Filters: `{{ name | upper }}`, `{{ list | join(",") }}`
- Conditions: `{% if x > 5 %}yes{% endif %}`
- Loops: `{% for item in list %}{{ item }}{% endfor %}`
- Functions: `{{ now() }}`, `{{ secret("API_KEY") }}`
- Recursive rendering (up to 100 iterations)
- Typed rendering (preserves int/bool/list types)

**BD current state** (`ExecutionContext.render()`):
```python
def render(self, template: str) -> str:
    # Simple {{ dotted.path }} replacement against self.variables
    # Uses regex: r"\{\{\s*(.+?)\s*\}\}"
    # Resolves dotted paths like "outputs.task1.value"
    # Unresolved expressions preserved as-is
```

**Gap:** BD render() handles the simple case (variable substitution) but NOT:
- Filters (`| upper`, `| join`)
- Conditions (`{% if %}`)
- Loops (`{% for %}`)
- Functions (`{{ now() }}`, `{{ secret() }}`)
- Typed rendering (everything returns string)
- Recursive rendering

**Impact:** Most integration plugins only use simple `{{ variable }}` substitution in their `@PluginProperty(dynamic=true)` fields. But Kestra's `Property<T>` system renders ALL properties through Pebble before passing to the plugin. Complex expressions appear in flow definitions, not usually in plugin code directly. For the first integration plugins (MongoDB, JDBC), simple substitution is sufficient. For core storage plugins (FilterItems uses Pebble conditions per line), full Pebble is needed.

### 1.5 Metrics

**Kestra API:**
```java
RunContext metric(AbstractMetricEntry<?> entry)
// Usage: runContext.metric(Counter.of("records", count, "database", db))
```

Standard metrics: `records`, `requests.count`, `duration`, with tags for `database`, `collection`, `task_type`, `flow_id`.

**BD current state:** Not implemented. Plugins log to `context.logger` but don't emit structured metrics.

**Gap:** Not blocking. Plugins work without metrics. Metrics are an observability investment for production monitoring.

### 1.6 Retry

**Kestra API:**
```java
AbstractRetry retry  // On Task base class
// Strategies: Constant (fixed delay), Exponential (backoff), Random (jitter)
// Behavior: RETRY_FAILED_TASK or CREATE_NEW_EXECUTION
```

**BD current state:** Not implemented. If a plugin's `run()` throws, the item is marked failed. No automatic retry.

**Gap:** Not blocking for first integrations. Can be added at the `step_load` level (retry the step call) or as a wrapper around `plugin.run()`.

### 1.7 Task Timeout

**Kestra API:**
```java
Property<Duration> timeout  // On Task base class
```

**BD current state:** Not implemented. Plugin execution runs until completion or exception. Cloud Run has a 30-minute request timeout as a backstop.

**Gap:** Low priority. Cloud Run timeout prevents infinite hangs. Per-plugin timeouts can be added later via `asyncio.wait_for()`.

### 1.8 Connection / Credential Resolution

**Kestra API:**
- `Connection` objects are `@PluginProperty` fields on tasks (e.g., `MongoDbConnection connection`)
- Connection has `client(RunContext)` factory that renders properties and creates the client
- Credential values are rendered through Pebble (can reference `{{ secret("MONGO_URI") }}`)

**BD current state:**
- `resolve_connection_sync(connection_id, user_id)` — fetches from `user_provider_connections`, decrypts, merges metadata
- Returns a flat `dict[str, Any]` with all credential fields
- Plugin creates its own client from the dict

**Gap:** Architecturally different but functionally equivalent. Kestra embeds connection objects in task definitions. BD resolves credentials by ID at runtime. Both achieve: "plugin gets authenticated client credentials." No gap for translation.

### 1.9 Encryption / Secrets

**Kestra API:**
```java
String encrypt(String plaintext)  // Encrypt for storage
String decrypt(String encrypted)  // Decrypt for use
```

**BD current state:**
- `encrypt_with_context()` / `decrypt_with_context()` in `app/infra/crypto.py`
- Used by connection resolver for credential encryption
- `context.get_secret(key)` reads env vars (no vault)

**Gap:** Functionally equivalent for credential handling. `get_secret()` is limited to env vars — no vault or dynamic secrets. Not blocking.

### 1.10 Logging

**Kestra API:** `runContext.logger()` → SLF4J Logger
**BD current state:** `context.logger` → Python `logging.Logger`

**Gap:** None. Direct equivalent.

---

## 2. The Gap Map

### What Must Be Built Before Integration Plugins Work

| # | Gap | What To Build | Effort | Blocks |
|---|-----|--------------|--------|--------|
| **1** | Plugins can't read artifacts through context | Add `download_file(bucket, path)` to ExecutionContext | 1 hour | Every destination plugin that reads from upstream |
| **2** | No temp file management | Add `WorkingDir` wrapper to ExecutionContext (`create_temp_file()`, `cleanup()`) | 2 hours | Large file processing (CSV, Parquet, bulk loads) |
| **3** | No shared JSONL serialization | Add `write_jsonl(docs)` and `read_jsonl(uri)` helpers | 1 hour | Consistency across all plugins |

### What Should Be Built for Quality

| # | Gap | What To Build | Effort | Impact |
|---|-----|--------------|--------|--------|
| **4** | No bulk write utility | Extract chunked batch pattern from ArangoDB into shared `bulk_write()` helper | 2 hours | Every destination plugin |
| **5** | Simple template rendering only | Upgrade `render()` to use Jinja2 (Python's Pebble equivalent) with filters and conditions | 4 hours | Needed for core storage plugins, nice-to-have for integrations |
| **6** | No `list_files()` / `delete_files()` on context | Add thin wrappers over Supabase Storage SDK | 1 hour | Artifact cleanup |

### What Can Be Deferred

| # | Gap | Why Defer | When Needed |
|---|-----|----------|-------------|
| **7** | Metrics emission | Logging suffices for now | Production monitoring scale |
| **8** | Per-plugin retry | Route-level retry or manual re-step | Automated orchestration |
| **9** | Per-plugin timeout | Cloud Run 30min timeout is backstop | Fine-grained resource control |
| **10** | KV store | Infrastructure service, not plugin feature | Core KV plugins |
| **11** | Namespace file operations | Infrastructure service | Core namespace plugins |
| **12** | Full Pebble parity | Jinja2 covers 95% of cases | Exotic template expressions |
| **13** | Task result caching | Optimization | Repeated identical executions |
| **14** | Connection pooling | New client per call is fine at current scale | High-throughput pipelines |

---

## 3. The Substrate: What To Build First

Based on the gap analysis, here is the minimal runtime substrate needed before translated plugins can work end-to-end. This is **6-8 hours of work** — not a separate project, but a prerequisite task within the MongoDB translation plan.

### 3.1 Enhanced ExecutionContext

```python
@dataclass
class ExecutionContext:
    # ... existing fields ...

    async def download_file(self, uri: str) -> bytes:
        """Download artifact from storage URI (Supabase public URL or internal path)."""

    def create_temp_file(self, suffix: str = "") -> Path:
        """Create a temp file in the execution's working directory."""

    async def write_jsonl(self, bucket: str, path: str, documents: list[dict]) -> str:
        """Serialize documents as JSONL and upload to storage. Returns URI."""

    async def read_jsonl(self, uri: str) -> list[dict]:
        """Download and parse JSONL from storage URI."""

    def cleanup(self):
        """Delete all temp files created during this execution."""
```

### 3.2 BSON Utilities (for MongoDB specifically)

```python
# app/infra/bson_utils.py
def to_bson_compatible(value: Any) -> Any:
    """Convert Python types to BSON-safe types (handle ObjectId, datetime, Decimal128)."""

def from_bson(doc: dict) -> dict:
    """Convert BSON document to JSON-serializable dict."""
```

### 3.3 Bulk Write Helper

```python
# app/infra/bulk.py
async def chunked_write(
    documents: list[dict],
    writer_fn: Callable[[list[dict]], Awaitable[tuple[int, int]]],
    chunk_size: int = 500,
) -> dict:
    """Batch documents into chunks, call writer_fn per chunk, aggregate results."""
```

### 3.4 Jinja2 Template Rendering (upgrade from regex)

```python
# Upgrade ExecutionContext.render() to use Jinja2
from jinja2 import Environment

def render(self, template: str) -> str:
    env = Environment()
    tmpl = env.from_string(template)
    return tmpl.render(**self.variables)
```

This enables `{{ outputs.task1.value }}`, `{{ name | upper }}`, `{% if x %}...{% endif %}` — covering 95%+ of Kestra's Pebble usage.

---

## 4. What This Means for the MongoDB Translation

With the substrate built (gaps 1-6), the MongoDB translation becomes straightforward:

| MongoDB Task | Runtime Services Used | Substrate Needed |
|---|---|---|
| **Find** | Connection resolver, temp file for large result sets, JSONL write | download_file, create_temp_file, write_jsonl |
| **Load** | Connection resolver, JSONL read from upstream artifact, bulk write | read_jsonl, chunked_write, BSON utils |
| **Aggregate** | Same as Find + aggregation pipeline params | Same as Find |
| **InsertOne** | Connection resolver, single doc insert | Connection only |
| **Update** | Connection resolver, filter + update params | Connection + BSON utils |
| **Delete** | Connection resolver, filter params | Connection + BSON utils |
| **Bulk** | Connection resolver, JSONL read, mixed write operations | read_jsonl, chunked_write, BSON utils |
| **Trigger** | DEFERRED — needs scheduler infrastructure | N/A |

**Without the substrate:** Each MongoDB plugin would reimplement file download, JSONL parsing, and bulk writing. This is what GCS and ArangoDB plugins do today — each has its own inline HTTP download and JSON parsing.

**With the substrate:** Each MongoDB plugin is ~30 lines of business logic (authenticate, call MongoDB API, return result). The runtime handles file I/O, serialization, and batching.

---

## 5. Recommended Execution Order

1. **Build substrate** (gaps 1-6): ~8 hours. Add to ExecutionContext + shared utilities.
2. **Translate MongoDB family** using substrate: ~1 day for all 7 RunnableTask classes.
3. **Translate next family** (JDBC/Postgres or S3): validates substrate works for a different connector type.
4. **Build scaffold generator** once 2+ families prove the pattern is stable.

This is the order that none of the three proposals got right. They all started with "translate plugins" or "build generator" without first asking "does the runtime support what translated plugins need?"

---

## Appendix: Complete Service Comparison Table

| # | Kestra RunContext Service | Method | BD ExecutionContext | BD Status | Gap Level |
|---|---|---|---|---|---|
| 1 | File read | `storage().getFile(uri)` | *not on context* (`download_from_storage` in infra) | Missing from context | EASY FIX |
| 2 | File write | `storage().putFile(file)` | `upload_file(bucket, path, content)` | Done | — |
| 3 | File exists | `storage().isFileExist(uri)` | Not implemented | Not implemented | EASY FIX |
| 4 | File delete | `storage().deleteFile(uri)` | Not implemented | Not implemented | EASY FIX |
| 5 | File list | `storage().list(prefix)` | `sb.storage.from_().list()` available | Not on context | EASY FIX |
| 6 | Serialization write | `FileSerde.writeAll(writer, flux)` | `json.dumps()` inline per plugin | No shared utility | EASY FIX |
| 7 | Serialization read | `FileSerde.readAll(reader)` | `json.loads()` inline per plugin | No shared utility | EASY FIX |
| 8 | Temp file create | `workingDir().createTempFile()` | Not implemented | Not implemented | MEDIUM |
| 9 | Temp file cleanup | `workingDir().cleanup()` | Not implemented | Not implemented | MEDIUM |
| 10 | Template render (simple) | `render("{{ var }}")` | `render(template)` | Done | — |
| 11 | Template render (filters) | `render("{{ x \| upper }}")` | Not supported | Missing | MEDIUM |
| 12 | Template render (conditions) | `render("{% if x %}...")` | Not supported | Missing | MEDIUM |
| 13 | Template typed render | `renderTyped(template)` | Not implemented | Missing | LOW |
| 14 | Metrics counter | `metric(Counter.of(...))` | Not implemented | Missing | DEFERRED |
| 15 | Metrics timer | `metric(Timer.of(...))` | Not implemented | Missing | DEFERRED |
| 16 | Retry (constant) | `retry = Constant(interval, maxAttempts)` | Not implemented | Missing | DEFERRED |
| 17 | Retry (exponential) | `retry = Exponential(interval, factor)` | Not implemented | Missing | DEFERRED |
| 18 | Task timeout | `timeout = Duration.ofMinutes(5)` | Cloud Run 30min backstop | Partial | DEFERRED |
| 19 | Encryption | `encrypt(plaintext)` | `encrypt_with_context()` | Done | — |
| 20 | Decryption | `decrypt(encrypted)` | `decrypt_with_context()` | Done | — |
| 21 | Secret access | `render("{{ secret('KEY') }}")` | `get_secret(key)` (env only) | Partial | LOW |
| 22 | Logger | `logger()` | `context.logger` | Done | — |
| 23 | Connection client | `connection.client(runContext)` | `resolve_connection_sync(id, uid)` | Done (different pattern) | — |
| 24 | Cache read | `getCacheFile(id)` | Not implemented | Missing | DEFERRED |
| 25 | Cache write | `putCacheFile(file, id)` | Not implemented | Missing | DEFERRED |
| 26 | KV get/set | `namespaceKv(ns).get/put` | Not implemented | Missing | DEFERRED |
| 27 | ACL check | `acl().check(...)` | Not implemented | Missing | DEFERRED |
| 28 | Namespace files | `namespace().getFile(...)` | Not implemented | Missing | DEFERRED |

**Summary:** 6 services DONE, 6 gaps that are EASY FIX (~1h each), 3 MEDIUM (~2-4h each), 13 DEFERRED.

**Total substrate build time: ~8 hours** for all EASY + MEDIUM gaps. After that, integration plugin translation is purely business logic.

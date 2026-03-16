Background
This project is BlockData (BD), a document processing and data pipeline platform. The codebase is at E:/writing-system/. The platform has a FastAPI-based execution plane at services/platform-api/ that runs plugins — Python classes that call external APIs (GCS, ArangoDB, MongoDB, etc.) and process data.

We are absorbing Kestra's open-source plugin ecosystem. Kestra is a Java-based orchestration engine with 131 external plugin repos (E:/kestra-io/plugins/) and a core engine (E:/kestra/core/). The goal is to translate Kestra's Java plugin handlers into BD-native Python plugins that run on our FastAPI execution plane.

What Exists
BD Platform (services/platform-api/)
Plugin contract:

app/domain/plugins/models.py — BasePlugin (abstract base), ExecutionContext (runtime services), PluginOutput (standardized return)
app/domain/plugins/registry.py — auto-discovers BasePlugin subclasses in app/plugins/, registers by task_types
Plugins are invoked via POST /{function_name} in app/api/routes/plugin_execution.py or via load-runs orchestration in app/api/routes/load_runs.py
Runtime substrate (just built):

app/infra/auth_providers.py — 6 auth patterns: APIKey, BasicAuth, ConnectionString, OAuth2ServiceAccount, OAuth2ClientCredentials, IAM. Auto-detection via resolve_auth(creds).
app/infra/serialization.py — JSONL encode/decode via msgspec, file-based variants, chunked_write() via more-itertools
app/infra/connection.py — resolve_connection_sync(connection_id, user_id) fetches encrypted credentials from user_provider_connections table, decrypts, returns dict
app/infra/crypto.py — AES-GCM encrypt/decrypt
app/infra/storage.py — Supabase Storage REST helpers (upload, download, list, delete)
ExecutionContext methods: upload_file(), download_file(), list_files(), delete_files(), create_temp_file(), work_dir, cleanup(), render() (Jinja2)
Working plugins (refactored onto substrate):

app/plugins/gcs.py — GCSListPlugin, GCSDownloadCsvPlugin. Uses resolve_auth(), encode_jsonl().
app/plugins/arangodb.py — ArangoDBLoadPlugin. Uses resolve_auth(), context.download_file(), decode_jsonl(), chunked_write().
app/plugins/http.py — HttpRequestPlugin, HttpDownloadPlugin. Uses resolve_auth().
app/plugins/core.py, app/plugins/eyecite.py, app/plugins/scripts.py — other existing plugins
Database:

service_registry — 176 services
service_functions — 1013 functions registered
service_functions_view — joined view with bd_stage, execution_plane, service_type_label
integration_catalog_items — 945 Kestra plugin entries with full task_schema JSONB (properties, outputs, examples, definitions)
kestra_plugin_inputs — ~9,700 rows of normalized input parameters
kestra_plugin_outputs — ~2,300 rows of normalized output fields
kestra_plugin_definitions — ~4,400 rows of reusable type definitions
kestra_provider_enrichment — ~56 rows with auth_type and auth_fields per provider
service_run_items — item-level run tracking with claim_run_item RPC for atomic claiming
platform_api_keys — admin-managed AI provider keys
Dependencies: requirements.txt includes: fastapi, httpx, supabase, PyJWT, cryptography, msgspec, more-itertools, Jinja2, pydantic, pytest, pytest-asyncio

Kestra Source (reference material)
External plugins: E:/kestra-io/plugins/ — 131 repos, ~1,600 Java source files. Each plugin has:

AbstractTask.java — base class with connection and common fields
Task classes implementing RunnableTask<Output> with @PluginProperty annotated inputs and Output inner class
*Connection.java — credential holder with client(RunContext) factory
Core engine: E:/kestra/core/src/main/java/io/kestra/core/ — 761 Java files covering runners, storage, queues, services, models, serializers, plugins, secrets, HTTP client

Core internal plugins: E:/kestra/core/src/main/java/io/kestra/plugin/core/ — 129 files across 17 domains (flow, http, kv, storage, execution, condition, trigger, etc.)

Four plugin repos copied locally for reference: E:/writing-system/docs/plugin-gcp/, plugin-anthropic/, plugin-openai/, plugin-dlt/

Key Documents
docs/plans/2026-03-16-plugin-runtime-substrate.md — implementation plan for the substrate (completed)
docs/proposal/2026-03-16-kestra-engine-to-bd-runtime-mapping.md — maps all 302 Kestra engine files to BD equivalents and gaps
docs/proposal/2026-03-16-runtime-gap-analysis.md — maps every RunContext service to BD ExecutionContext equivalent
docs/plans/2026-03-15-kestra-absorption-context-update.md — architectural context for absorption strategy
docs/proposal/2026-03-16-kestra-plugin-absorption-proposal.md — phased approach with plugin tiering
docs/kt-analysis-again/kestra-core-inventory.md — file inventory of all 890 core files
Current State
The runtime substrate is implemented and the assessment findings have been addressed. All plugins in app/plugins/ now use the substrate (resolve_auth, encode_jsonl/decode_jsonl, chunked_write, context.download_file, Jinja2 context.render). The old auth.py module is deleted. plugin_execution.py has user_id wired and context.cleanup() in a finally block.

Three new dependencies (msgspec, more-itertools, Jinja2) are in requirements.txt but not installed in the local environment (no Python locally — platform-api runs on Cloud Run). Tests exist but cannot be verified locally.

The platform currently has 3 working integration plugin files (GCS with 2 functions, ArangoDB with 1 function, HTTP with 2 functions) plus existing utility plugins. The Kestra catalog has 945 entries. The marketplace UI shows all 1013 registered functions. The Load page wizard works for GCS source → ArangoDB destination.

Next Step

See `docs/plans/python-handler-instruction3.md` for the active objective and analysis steps.
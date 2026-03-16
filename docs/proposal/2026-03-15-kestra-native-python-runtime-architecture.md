---
title: Kestra Native Python Runtime Architecture
description: Source-verified architecture for absorbing Kestra's engine and plugin ecosystem into BlockData's Python execution plane.
---

# Kestra Native Python Runtime Architecture

Date: 2026-03-15
Scope: source-verified architecture for `E:/kestra/core/`, `E:/kestra-io/plugins/`, and `E:/writing-system/services/platform-api/`

## Executive Summary

BlockData already has the beginning of a native Python plugin runtime:

- a plugin contract in `services/platform-api/app/domain/plugins/models.py`
- registry-based discovery in `services/platform-api/app/domain/plugins/registry.py`
- a usable substrate for auth, storage, serialization, temp files, and simple rendering
- working source, destination, HTTP, core, and script plugins

That substrate is enough for a narrow class of stateless single-step provider tasks. It is not enough to absorb the full Kestra ecosystem.

Full absorption requires BlockData to become a four-layer execution plane:

1. a Python plugin SDK that matches Kestra's task and property contracts
2. a runtime services layer that exposes the services Kestra plugins expect from `RunContext`
3. an execution engine that can queue work, build run variables, persist task state, and resolve flow graphs
4. a trigger plane that can schedule, poll, listen, and enqueue executions

The key architectural conclusion is simple:

BlockData should not translate Kestra plugins directly into route handlers. It should translate them into Python task classes that run inside a worker runtime backed by a queue, an artifact store, an execution state machine, and a scheduler.

## Source Basis

This architecture was validated against:

- `RunContext.java` and `DefaultRunContext.java`
- `RunnableTask.java`, `FlowableTask.java`, `ExecutableTask.java`, `Output.java`, `Property.java`, `RunContextProperty.java`
- `PluginProperty.java` in `E:/kestra/model/src/main/java/io/kestra/core/models/annotations/PluginProperty.java`
- top external plugin bases across JDBC, Azure, GCP, AWS, FS, Scripts, Serdes, Notifications, Slack, and MongoDB
- all 17 internal plugin domains under `io.kestra.plugin.core`
- the current BlockData runtime in `services/platform-api/app/`

## What Kestra Plugins Actually Depend On

Kestra plugins do not depend on "the engine" in the abstract. They depend on a concrete service surface exposed by `RunContext`.

### RunContext service groups

| Service group | Public methods | What it provides |
|---|---|---|
| Variables and trace | `getVariables()`, `getSecretInputs()`, `getTriggerExecutionId()`, `getTraceParent()`, `setTraceParent()` | Execution-scoped variables, secret masking hints, trigger lineage, trace propagation |
| Rendering | `render(String)`, `renderTyped(String)`, `render(String, Map)`, `render(Property)`, list/set/map renderers, `renderMap()` | Pebble rendering, typed coercion, recursive property rendering |
| Validation and crypto | `validate()`, `encrypt()`, `decrypt()` | Bean validation, encrypted values, secret-safe variable handling |
| Logging and metrics | `logger()`, `logFileURI()`, `metrics()`, `metric()` | Structured logs, optional log artifact export, Micrometer metrics |
| Artifacts and workspace | `storage()`, `getStorageOutputPrefix()`, `workingDir()`, `cleanup()` | Internal artifact store, temp files, working directory lifecycle |
| Execution metadata | `taskRunInfo()`, `flowInfo()`, `version()` | Execution, task, flow, and platform metadata |
| Plugin configuration | `pluginConfiguration()`, `pluginConfigurations()`, `cloneForPlugin()` | Static plugin config resolved by plugin type |
| Namespace and security | `namespaceKv()`, `stateStore()` deprecated, `acl()`, `assets()`, `localPath()` | KV store, ACL checks, asset declarations, guarded local filesystem access |
| Input-output and API access | `inputAndOutput()`, `sdk()` | Flow inputs/outputs access and self-service API helpers |
| Internal worker coordination | `dynamicWorkerResult()`, `dynamicWorkerResults()`, `isInitialized()` | Executor-worker coordination and context lifecycle |

### What that means for BlockData

A faithful Python runtime needs more than `upload_file()` and `render()`. It needs the equivalent of:

- typed property rendering
- task and flow metadata assembly
- working-directory lifecycle
- artifact streaming and namespace file access
- metrics and persistent logs
- namespace KV and ACL services
- input-output adapters for upstream and downstream task data
- a factory that builds context consistently for workers, triggers, and subflows

## Kestra Plugin SDK Contract

Kestra's plugin model is a layered SDK, not a single `run()` hook.

### Core task contract

`Task` is the real base model. It contributes:

- `id`, `type`, and `version`
- retry policy
- timeout
- worker-group routing
- log level and log-to-file
- `allowFailure` and `allowWarning`
- task cache and assets declarations

Translated Python tasks need a comparable base class, not only a free-form params dict.

### Execution contracts

| Contract | Source shape | Runtime meaning |
|---|---|---|
| `RunnableTask<T extends Output>` | `T run(RunContext)` | Worker-executed provider or utility task |
| `FlowableTask<T extends Output>` | child-task expansion plus `resolveNexts()` and `resolveState()` | Executor-side orchestration task such as `If`, `Parallel`, `Dag`, `ForEach`, `Template`, `WorkingDirectory` |
| `ExecutableTask<T extends Output>` | subflow creation and result handling | Executor-side task that launches child executions |
| `Output` | `finalState()` and `toMap()` | Task result plus optional state override |
| `Property<T>` | literal-or-expression typed wrapper with caching | Deferred rendering and type coercion for all plugin fields |
| `PluginProperty` | annotation flags such as `dynamic`, `internalStorageURI`, `group`, `hidden`, `additionalProperties` | Schema metadata that drives rendering rules, docs, and editors |

### Architectural implication

BlockData needs a Python SDK with at least:

- `BaseTask`
- `RunnableTask`
- `FlowableTask`
- `ExecutableTask`
- `TriggerTask`
- `Property[T]`
- `PluginField` metadata equivalent to `PluginProperty`
- `TaskOutput`

Without that layer, BlockData can register handlers, but it cannot absorb Kestra's task semantics.

## External Plugin Patterns That Repeat Across Repositories

The top external repos converge on the same hierarchy:

`provider connection base -> service-specific abstract task -> concrete runnable task`

### Shared abstraction families

| Family | Source examples | Shared responsibility |
|---|---|---|
| Connection spec | `JdbcConnectionInterface`, `MongoDbConnection`, `AbstractConnection` for AWS and Azure, `AbstractAzureIdentityConnection` | Render credentials, validate config, create authenticated client or credentials object |
| Provider task base | `io.kestra.plugin.gcp.AbstractTask`, `io.kestra.plugin.mongodb.AbstractTask`, `AbstractVfsTask`, `AbstractTextWriter`, `AbstractHttpOptionsTask`, `AbstractBash` | Common provider fields, rendered properties, helper methods, output handling |
| Service client base | `AbstractGcs`, `AbstractS3`, `AbstractStorage`, `AbstractSlackClientConnection` | Build SDK clients with provider-specific defaults and headers |
| Data movement base | `AbstractJdbcQuery`, `AbstractLoad`, `AbstractTextWriter` | Stream records, serialize artifacts, chunk writes, emit metrics |
| Trigger base | `AbstractMailTrigger`, JDBC trigger base, GCS trigger classes | Poll interval, trigger evaluation, context hydration |
| Script/task runner base | `AbstractBash`, `AbstractJvmScript` | Working directory, env injection, input/output files, subprocess or container runner |

### Common cross-cutting concerns

Across the external repos, the abstractions repeatedly solve the same problems:

- auth mode selection
- endpoint, region, or project rendering
- client construction and reuse
- artifact read and write
- working-directory and temp-file management
- pagination or chunking
- metrics emission
- provider-specific validation
- output shaping into a serializable map

### Architectural implication

BlockData should not model translated plugins as flat classes. It needs a provider abstraction layer:

- `ConnectionSpec` and `ResolvedConnection`
- `ProviderClientFactory`
- `ProviderTaskBase`
- `ArtifactSourceTask`
- `ArtifactSinkTask`
- `ChunkedBulkLoadTask`
- `PollingTriggerBase`

That layer is what lets one provider family generate dozens of tasks without duplicating auth, client setup, pagination, or bulk-write logic.

## Internal Core Plugin Domains by Runtime Dependency

The internal domains split cleanly by the runtime services they consume.

| Domain | Observed runtime calls | What BD must provide |
|---|---|---|
| `flow` | `render`, `logger`, `workingDir`, `storage`, `inputAndOutput`, `getVariables`, `getStorageOutputPrefix` | Flow graph resolver, child-task expansion, working-directory semantics, input-output bridge |
| `http` | `render`, `decrypt`, `logger`, `metric`, `storage`, `workingDir` | Shared HTTP client, auth adapters, temp files, artifact upload |
| `kv` | `namespaceKv`, `acl`, `flowInfo`, `render`, `renderTyped` | Namespace-scoped KV service plus ACL enforcement |
| `storage` | `render`, `storage`, `workingDir` | Artifact transforms, streaming reads and writes, temp files |
| `execution` | `render`, `logger`, `metric`, `acl`, `flowInfo` | Execution state mutation, metrics, permission checks |
| `condition` | `render` | Pure expression evaluation layer |
| `trigger` | `render`, `logger`, `flowInfo`, `getVariables`, `getTriggerExecutionId`, `inputAndOutput` | Scheduler, webhook ingress, trigger state, execution creation |
| `namespace` | `render`, `logger`, `metric`, `storage`, `workingDir`, `flowInfo` | Namespace file storage and namespace-aware access rules |
| `log` | `render`, `logger`, `storage`, `workingDir`, `acl`, `flowInfo` | Log persistence, export, and permission checks |
| `debug` | `render`, `logger` | Minimal utility runtime |
| `metric` | `render` | Metric publication surface |
| `state` | `render`, `stateStore`, `storage` | Legacy state store or KV-backed compatibility shim |
| `runner` | `render`, `logger` | Subprocess execution layer |
| `templating` | `render` | Template-only helpers |
| `output` | `render` | Output projection helpers |
| `purge` | `render`, `acl`, `flowInfo` | Repository-backed cleanup operations with permission checks |
| `dashboard` | no direct `runContext` dependency found | Repository and query layer, not part of the core worker runtime |

### Architectural implication

Most external provider tasks only need the first two layers: SDK plus runtime services.

The internal core plugins force the deeper engine:

- flow plugins force a graph executor
- trigger plugins force a scheduler
- KV, namespace, purge, and log plugins force durable platform services

## Current BlockData Coverage

### What exists now

BlockData already has working equivalents for:

- plugin discovery and registration
- authenticated generic plugin invocation
- provider credential resolution from the database
- AES-GCM encrypted credential storage
- JSONL artifact serialization
- Supabase Storage artifact I/O
- temp files and working directory lifecycle
- basic template rendering
- basic script execution
- narrow two-step load orchestration

### What is still missing

BlockData does not yet have equivalents for:

- typed `Property[T]` rendering and caching
- a `Task` base model with retry, timeout, assets, and worker routing
- a `RunContextFactory` and `RunVariables` assembler
- a queue-backed worker runtime
- immutable execution and task-run state models
- general flow graph resolution
- subflow execution
- namespace KV, ACL, and local-path policy
- persistent logs and structured metrics
- trigger scheduling and trigger state persistence
- plugin static configuration by plugin type

## Required Native Python Architecture

The runtime should be built as layered Python services, not as a single monolith.

```text
Catalog and Registry Plane
  service_registry / service_functions / integration_catalog_items
            |
            v
Python Plugin SDK
  Task / RunnableTask / FlowableTask / ExecutableTask / TriggerTask
  Property[T] / PluginField / TaskOutput
            |
            v
Runtime Services Plane
  RunContextFactory / RunVariables / ArtifactStore / WorkingDir
  ConnectionResolver / SecretResolver / HttpClientService
  NamespaceKV / ACL / Metrics / Logs / Assets / LocalPathPolicy
            |
            v
Execution Plane
  API submitters -> Queue -> Worker pool -> Execution repository
  Retry / timeout / concurrency / task-run state machine
            |
            v
Flow and Trigger Plane
  Graph resolver / subflow executor / scheduler / webhook ingress
  polling workers / realtime consumers / trigger state store
```

### Layer 1: Python plugin SDK

This is the compatibility contract every translated task should target.

Required components:

- `BaseTask`: common task fields and validation
- `RunnableTask`
- `FlowableTask`
- `ExecutableTask`
- `TriggerTask`
- `TaskOutput`
- `Property[T]` plus typed render helpers
- `PluginField` metadata model equivalent to `PluginProperty`

Recommended package shape:

- `app/domain/runtime/contracts.py`
- `app/domain/runtime/property.py`
- `app/domain/runtime/fields.py`

### Layer 2: Runtime services plane

This is BlockData's native Python equivalent of Kestra `RunContext`.

Required components:

- `RunContextFactory`
- `RunVariablesAssembler`
- `ArtifactStore`
- `WorkingDirectoryManager`
- `ConnectionResolver`
- `SecretResolver`
- `HttpClientService`
- `MetricsSink`
- `LogSink`
- `NamespaceKVService`
- `AclService`
- `AssetEmitter`
- `LocalPathPolicy`
- `InputOutputBridge`

Recommended package shape:

- `app/domain/runtime/context.py`
- `app/domain/runtime/variables.py`
- `app/services/artifacts.py`
- `app/services/secrets.py`
- `app/services/kv.py`
- `app/services/acl.py`
- `app/services/http_client.py`

### Layer 3: Provider abstraction layer

This layer turns one provider implementation into many translated tasks.

Required components:

- `ConnectionSpec`
- `ResolvedConnection`
- `ProviderClientFactory`
- `ProviderTaskBase`
- `ArtifactSourceTask`
- `ArtifactSinkTask`
- `ChunkedWriteMixin`
- `PollingTriggerBase`

This is where JDBC, GCP, AWS, Azure, MongoDB, Slack, and FS families should live.

Recommended package shape:

- `app/domain/providers/base.py`
- `app/domain/providers/connections.py`
- `app/domain/providers/clients.py`
- `app/plugins/providers/...`

### Layer 4: Queue and worker runtime

This is the minimum boundary between the API surface and plugin execution.

Required components:

- `ExecutionSubmitter`
- `QueueInterface` equivalent
- `WorkerRuntime`
- `TaskRunner`
- retry and timeout wrappers
- `TaskRunRepository`
- `ExecutionRepository`
- `LogRepository`
- `MetricRepository`
- concurrency limiter

The route handlers should submit work. Workers should execute plugin code.

### Layer 5: Flow orchestration engine

This is what internal `flow` plugins actually require.

Required components:

- `FlowDefinition` and parser
- `ResolvedTask` model
- graph resolver for sequential, parallel, DAG, foreach, switch, and error/finally branches
- `SubflowExecutor`
- state resolution logic for `allowFailure`, `allowWarning`, retries, and terminal states

This layer should consume the same SDK and runtime services as simple provider tasks.

### Layer 6: Trigger plane

This is separate from the worker pool, but built on the same contracts.

Required components:

- `PollingScheduler`
- `WebhookIngress`
- `RealtimeTriggerConsumers`
- `TriggerStateRepository`
- `ExecutionFactory`

This layer is what unlocks `Schedule`, `Webhook`, GCS polling triggers, JDBC polling triggers, and provider-native realtime triggers.

### Layer 7: Control-plane integration

BlockData already has the right metadata backbone. It now needs a tighter contract between that metadata and the runtime.

Required components:

- plugin schema compiler from `integration_catalog_items.task_schema`
- binding from `service_functions` to Python task classes
- generated or declarative `Property` specs from normalized input and output tables
- runtime capability flags so the UI can tell whether a function is runnable, flow-only, or trigger-only

## Dependency Order

This is the build order required for full ecosystem absorption.

| Order | Capability | Why it comes first |
|---|---|---|
| 1 | Python plugin SDK | All translated tasks need a stable native contract |
| 2 | Full runtime services plane | Every plugin depends on the equivalent of `RunContext` |
| 3 | Provider abstraction layer | This removes duplication across hundreds of external tasks |
| 4 | Queue and worker runtime | Needed before generic plugin execution can scale or isolate failures |
| 5 | Execution and task-run repositories | Needed to persist worker state, retries, metrics, and logs |
| 6 | Flow graph resolver | Required for core flow plugins and multi-step orchestration |
| 7 | Subflow execution | Required for `ExecutableTask` compatibility |
| 8 | Trigger scheduler and ingress | Required for scheduled, polling, webhook, and realtime execution |
| 9 | Dashboard and reporting tasks | These depend on the state and repository layers already existing |

## Practical Interpretation for BlockData

BlockData should treat the work as four tracks that share one runtime:

| Track | What it unlocks | Architectural requirement |
|---|---|---|
| Single-step provider tasks | Most external plugins | SDK + runtime services + provider layer |
| Multi-step pipelines | Source -> transform -> destination chains | Queue, execution state, run variables, artifact lineage |
| Flow orchestration | `If`, `ForEach`, `Parallel`, `Dag`, `Subflow` | Graph resolver, subflow executor, state machine |
| Triggered execution | `Schedule`, `Webhook`, polling, realtime | Scheduler, ingress, trigger state, execution factory |

## Final Architecture Decision

The correct target is not "more plugin handlers."

The correct target is:

- a BlockData-native Python task SDK
- a full `RunContext` equivalent
- a worker runtime behind a queue
- a graph executor for flowable and executable tasks
- a scheduler for trigger tasks
- a provider abstraction layer that turns cataloged Kestra schemas into maintainable Python task families

That architecture preserves the current BlockData direction:

- Kestra contributes patterns, task semantics, and catalog breadth
- BlockData owns the execution plane, state model, security model, and service identity

In short:

Kestra should be absorbed as a plugin and workflow source language, while BlockData remains the runtime.

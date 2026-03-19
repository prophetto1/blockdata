# Botpress vs Kestra: Architecture Comparison

> How two plugin-driven platforms solve composition differently.
>
> Date: 2026-03-19

---

## Table of Contents

1. [The Core Question](#the-core-question)
2. [Component Types Side by Side](#component-types-side-by-side)
3. [Botpress Component Types](#botpress-component-types)
4. [Kestra Component Types](#kestra-component-types)
5. [How They Align](#how-they-align)
6. [How They Differ](#how-they-differ)
7. [The Composition Layer](#the-composition-layer)
8. [The Plugin System](#the-plugin-system)
9. [External Connectors](#external-connectors)
10. [What Each Has That the Other Doesn't](#what-each-has-that-the-other-doesnt)
11. [Runtime Flow Comparison](#runtime-flow-comparison)
12. [Are They the Same Architecture?](#are-they-the-same-architecture)
13. [BD2 Translation Status](#bd2-translation-status)

---

## The Core Question

Both Botpress and Kestra are plugin-driven platforms. Both let you extend them with external connectors. Both have a composition layer that wires components together. But they solve the composition problem in fundamentally different ways.

**Botpress** uses dependency inversion — plugins depend on abstract contracts (interfaces), and the bot wires those contracts to concrete implementations (integrations) at composition time. The plugin never knows who fulfills its request.

**Kestra** uses declarative orchestration — a Flow declares exactly which tasks to run, in what order, with what inputs. Every task knows exactly what it is. There is no abstraction layer between a task and the service it calls.

---

## Component Types Side by Side

| Botpress | Count | Kestra | Count |
|----------|-------|--------|-------|
| **Package** (library) | 12 | **Core module** (model, core, executor, worker, etc.) | ~15 modules |
| **Interface** (contract) | 13 | *(no equivalent)* | — |
| **Integration** (external connector) | 68 | **RunnableTask** (external connector) | 125 plugin packages, thousands of tasks |
| **Plugin** (middleware) | 8 | **FlowableTask** (orchestrator) | ~15 core flow tasks |
| **Bot** (composition layer) | 13 | **Flow** (composition layer, YAML) | user-defined |
| **Script** (one-off utility) | 3 | *(scripts are tasks)* | — |
| *(no equivalent)* | — | **Trigger** (event source) | polling, realtime, stateful, worker |
| *(no equivalent)* | — | **Condition** (boolean gate) | ~15 built-in conditions |
| *(no equivalent)* | — | **TaskRunner** (execution environment) | process, Docker, Kubernetes |
| *(no equivalent)* | — | **Storage** (file backend) | local, S3, GCS |
| *(no equivalent)* | — | **Secret** (secret provider) | vault, env vars |
| *(no equivalent)* | — | **Chart / DataFilter / DataFilterKPI** | dashboard plugins |
| *(no equivalent)* | — | **Asset / AssetExporter** | data lineage |
| *(no equivalent)* | — | **LogExporter** | log shipping |
| *(no equivalent)* | — | **App / AppBlock** | UI plugins |

Kestra's `RegisteredPlugin` tracks 15 distinct plugin categories. Most are specialized (dashboards, assets, log exporters). The core architectural types that matter for comparison are: **Task**, **Trigger**, **Condition**, **Flow**, **TaskRunner**, and **Storage/Secret**.

---

## Botpress Component Types

Six types. The interesting architecture lives in the Interface → Integration → Plugin → Bot quad.

```
Package     = library everything imports (SDK, client, zui, cognitive, zai, llmz)
Interface   = contract with no code (schemas + action signatures)
Integration = external service connector that IMPLEMENTS interfaces
Plugin      = bot middleware that CONSUMES interfaces via lifecycle hooks
Bot         = composition layer that WIRES integrations to plugins
Script      = one-off operational utility (ignore these)
```

### How they connect

```
Packages sit at the bottom. Everything imports them.
  │
  ▼
Interfaces define contracts using SDK + zui schemas.
  │
  ├──► into Integrations (via .extend())
  │    "I promise to fulfill this contract"
  │
  └──► into Plugins (via interfaces field)
       "I need someone who fulfills this contract"
  │
  ▼
The Bot wires them together.
  │
  │  Adds integrations: "I have openai. I have telegram."
  │  Adds plugins WITH wiring: "knowledge's llm = openai"
  │
  ▼
At runtime, plugin calls actions.llm.generateContent()
  │  Proxy resolves llm → openai (from bot wiring)
  │  HTTP to platform → openai integration → OpenAI API
  │  Response flows back through the same chain
```

---

## Kestra Component Types

Fifteen registered categories, but six core architectural types.

### Tasks — the main execution unit

Three flavors based on where and how they execute:

- **RunnableTask** — runs in a Worker process. Does actual work: calls an API, queries a database, runs a script, moves a file. The `run(RunContext)` method is the entire contract.
- **FlowableTask** — runs in the Executor. Doesn't do work itself — orchestrates other tasks. Sequential, Parallel, If, ForEach, Dag, LoopUntil. These are the flow control primitives.
- **ExecutableTask** — spawns entirely new Flow executions (Subflow task). Creates child Executions that run independently.

Tasks can also implement optional interfaces:
- `InputFilesInterface` / `OutputFilesInterface` — file I/O
- `NamespaceFilesInterface` — namespace file access
- `RemoteRunnerInterface` — remote execution support
- `WorkerJobLifecycle` — onKill callbacks

### Triggers — event sources that start Flows

Four flavors based on how they detect events:

- **PollingTriggerInterface** — checks periodically (Schedule, S3 bucket watch, database query)
- **RealtimeTriggerInterface** — listens continuously (Kafka consumer, SQS listener, WebSocket)
- **StatefulTriggerInterface** — remembers state between evaluations
- **WorkerTriggerInterface** — runs in a Worker instead of the Scheduler

Triggers are standalone plugin classes, completely separate from tasks. The same plugin package (e.g. AWS) contributes both tasks AND triggers as independent classes.

### Conditions — boolean gates

Attached to triggers to decide whether they should fire. Each is a plugin class extending `Condition` with a `test(ConditionContext)` method returning boolean.

Built-in conditions: DateTimeBetween, DayWeek, ExecutionFlow, ExecutionStatus, ExecutionNamespace, ExecutionLabels, Expression, FlowCondition, MultipleCondition, etc.

### Flows — the composition layer

YAML files that declare which tasks run, in what order, with what inputs. The Flow is where abstract meets concrete — it names specific task types, specific trigger types, and specific conditions.

### TaskRunners — pluggable execution environments

Where does a task execute? The TaskRunner decides. Built-in: local Process. External plugins: Docker, Kubernetes. The task itself doesn't care — it implements `run(RunContext)` and the runner handles the execution environment.

### Storage and Secrets — infrastructure plugins

Pluggable backends for file storage (local, S3, GCS) and secret management (vault, env vars). These are extension points that let you run Kestra on different infrastructure without changing any task code.

### How they connect

```
Core modules sit at the bottom. Everything imports them.
  │
  │  model, core, executor, worker — every task, trigger,
  │  and condition imports these
  │
  ▼
Plugins are discovered via @Plugin annotation + Java ServiceLoader SPI.
  │
  │  Two tiers:
  │
  ├──► Core/internal plugins — ship inside the engine
  │    Flow control: Sequential, Parallel, If, ForEach, Dag
  │    Built-in tasks: HTTP, KV, Log, Metric, Storage, Debug
  │    Built-in triggers: Schedule, Webhook, Flow trigger
  │    Built-in conditions: date/time, execution status, namespace
  │
  └──► External plugins — separate JARs loaded at runtime
       125+ plugin packages: AWS, GCP, Azure, Kafka, dbt, Slack, etc.
       Each can contribute: tasks + triggers + conditions
       Loaded by PluginManager, registered in PluginRegistry
  │
  ▼
A Flow (YAML) pulls specific plugins together.
  │
  │  Declares tasks by fully-qualified type name:
  │    type: io.kestra.plugin.aws.s3.Download
  │    type: io.kestra.plugin.core.flow.Parallel
  │
  │  Declares triggers:
  │    type: io.kestra.plugin.core.trigger.Schedule
  │
  │  Declares conditions on triggers:
  │    type: io.kestra.plugin.core.condition.DayWeek
  │
  ▼
At runtime, the Executor + Worker execute the Flow.
  │
  │  Executor receives the Flow, creates an Execution record.
  │
  │  For each task:
  │    FlowableTask? → Executor handles directly (resolves children)
  │    RunnableTask? → Executor puts WorkerTask on Queue
  │                    Worker picks it up, calls task.run(RunContext)
  │                    Worker puts WorkerTaskResult back on Queue
  │                    Executor picks up result, advances state
  │
  │  Triggers run in the Scheduler:
  │    PollingTrigger? → Scheduler evaluates periodically
  │    RealtimeTrigger? → Runs continuously in a Worker
  │    Conditions checked before trigger fires
  │
  │  Each task creates a TaskRun record with independent state tracking.
  │  Retry, timeout, SLA violations tracked per TaskRun.
  │  Full audit trail persisted to database.
```

---

## How They Align

### Package ↔ Core module

Both have a foundation layer of libraries everything else imports. Botpress has 12 npm packages (SDK, client, zui, cognitive, zai, llmz). Kestra has ~15 Java/Gradle modules (model, core, executor, worker, scheduler, jdbc, webserver, etc.). Same concept, same role.

### Integration ↔ RunnableTask

Both connect to external services. A Botpress integration for OpenAI and a Kestra RunnableTask for OpenAI both ultimately call the OpenAI API and return results.

### Plugin ↔ FlowableTask

Both "face inward." Botpress plugins hook into the message lifecycle and orchestrate behavior. Kestra FlowableTasks sit inside the Executor and orchestrate other tasks (Sequential, Parallel, If, ForEach). Neither connects to external services directly.

### Bot ↔ Flow

Both are the composition layer where abstract meets concrete. A Botpress Bot wires plugins to integrations. A Kestra Flow wires tasks to triggers with conditions. Both are the place where you decide "what runs, in what order, connected to what."

---

## How They Differ

### 1. Contracts vs direct references

**Botpress:** A plugin says "I need `llm`" and the bot says "`llm` = openai." The plugin never imports openai. Never references openai. The Proxy resolves it at runtime from wiring metadata.

**Kestra:** A Flow says `type: io.kestra.plugin.aws.s3.Download`. That's a direct reference to a specific class. There's no indirection. If you want to swap S3 for GCS, you edit the Flow YAML and change the type.

This is the fundamental philosophical difference. Botpress was designed for runtime flexibility within a single bot. Kestra was designed for declarative explicitness where everything is visible in the YAML.

### 2. Triggers as a separate type

**Botpress:** An integration handles its own inbound traffic. Telegram's webhook handler is part of the Telegram integration. The integration has `handler()` for webhooks AND `channels` for outbound AND `actions` for callable operations — all in one component.

**Kestra:** Triggers are completely separate from tasks. The same AWS plugin contributes S3 tasks (Download, Upload, List) AND S3 triggers (watch for new objects) as independent classes. You can mix freely — an S3 trigger can start a flow that runs Slack tasks. The trigger and the tasks don't know about each other.

### 3. Conditions as a separate type

**Botpress:** A plugin decides inline whether to proceed. In a `beforeIncomingMessage` hook, it can return `{ stop: true }` to halt the chain. The gating logic lives inside the plugin's code.

**Kestra:** Conditions are externalized into declarative plugin objects. You attach them to triggers: "only fire on weekdays AND only if the previous flow succeeded AND only in namespace X." Each condition is its own `@Plugin`-annotated class with a `test()` method.

### 4. Execution environment is pluggable

**Botpress:** Everything runs on the Botpress cloud platform's servers. You don't choose where your integration runs.

**Kestra:** TaskRunners make the execution environment pluggable. A task can run as a local process, in a Docker container, or on a Kubernetes pod. The task code is the same — the runner handles the environment.

### 5. State tracking and persistence

**Botpress:** Messages flow through hooks in a single request cycle. There's no persistent execution record, no retry policies across attempts, no DAG resolution, no worker queue. The platform handles routing but not orchestration state.

**Kestra:** Every Flow execution creates an `Execution` record. Every task creates a `TaskRun` with independent state (QUEUED → RUNNING → SUCCESS/FAILED). Retries, timeouts, and SLA violations are tracked per TaskRun. Full audit trail persisted to PostgreSQL/MySQL. You can replay, resume, and inspect any historical execution.

### 6. Hook chain vs task graph

**Botpress:** Plugins form a hook chain — `beforeIncomingMessage` → bot handler → `beforeOutgoingMessage`. Each hook can stop or mutate the data. It's a linear pipeline with interception points.

**Kestra:** Tasks form a directed graph — Sequential, Parallel, Dag, If, ForEach. The Executor resolves the graph dynamically based on task results and conditions. It's not a pipeline — it's a full orchestration engine with branching, looping, and parallelism.

---

## The Composition Layer

This is where the architectural philosophies diverge most sharply.

### Botpress Bot (code)

```typescript
export default new BotDefinition({})
  .addIntegration(openai, {
    configuration: { apiKey: '{{secrets.OPENAI_KEY}}' },
  })
  .addPlugin(knowledge, {
    dependencies: {
      llm: { integrationAlias: 'openai' },  // abstract → concrete binding
    },
  })
```

The bot is code. The wiring is typed. The compiler enforces that every plugin dependency has a matching integration. You can't deploy a bot where `knowledge` needs `llm` but no integration implements `llm`.

### Kestra Flow (YAML)

```yaml
id: process-data
namespace: company.data
tasks:
  - id: download
    type: io.kestra.plugin.aws.s3.Download
    bucket: my-bucket
    key: "{{ inputs.file_path }}"

  - id: transform
    type: io.kestra.plugin.scripts.python.Script
    script: |
      import pandas as pd
      df = pd.read_csv("{{ outputs.download.uri }}")

  - id: notify
    type: io.kestra.plugin.notifications.slack.SlackIncomingWebhook
    url: "{{ secret('SLACK_WEBHOOK') }}"
    payload: "Processed {{ outputs.download.uri }}"

triggers:
  - id: daily
    type: io.kestra.plugin.core.trigger.Schedule
    cron: "0 9 * * *"
    conditions:
      - type: io.kestra.plugin.core.condition.DayWeek
        dayOfWeek: "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
```

The Flow is YAML. Every task type is a direct class reference. There's no abstraction — you see exactly what runs. Template expressions (`{{ outputs.download.uri }}`) pass data between tasks. The Pebble template engine resolves these at runtime from the RunContext.

---

## The Plugin System

### Botpress: annotation + workspace convention

- Plugins live in `plugins/` directory of the monorepo
- Discovered by pnpm workspace config (`pnpm-workspace.yaml`)
- Built by Turbo, which finds everything in the workspace
- No runtime discovery — the bot imports plugins directly at build time
- Type generation via `bp build` creates `.botpress/` with typed handler signatures

### Kestra: annotation + ServiceLoader SPI

- Internal plugins live inside the engine at `io.kestra.plugin.core.*`
- External plugins are separate JARs with `@Plugin` annotations
- Compile-time: `PluginProcessor` (annotation processor) generates `META-INF/services/io.kestra.core.models.Plugin`
- Runtime: `PluginManager` uses Java ServiceLoader to discover and load plugin classes
- `PluginRegistry` provides type-safe lookups: class name → plugin class + metadata
- External plugins can be installed from Maven coordinates at runtime

### What external plugins can contribute

**Botpress:** An integration contributes actions, channels, webhook handlers, events, and interface implementations — all bundled in one component.

**Kestra:** A plugin package can contribute ANY combination of:
- Tasks (most common)
- Triggers (common for event-driven services like Kafka, SQS, S3)
- Conditions (rare in external plugins, mostly core)
- TaskRunners (rare — Docker, Kubernetes)
- Storage backends (rare — S3, GCS)
- Secret providers (rare — Vault)
- Any of the 15 registered plugin categories

For example, the AWS plugin contributes:
- Tasks: S3 Download/Upload/List, Lambda Invoke, Athena Query, DynamoDB operations, etc.
- Triggers: SQS Trigger + RealtimeTrigger, Kinesis Trigger + RealtimeTrigger, S3 Trigger, CloudWatch Trigger, EventBridge PutEvents
- (No custom conditions — uses core conditions)

---

## External Connectors

### Botpress Integration (long-lived server)

A Botpress integration is a **server process** with multiple responsibilities:
- `register()` — setup webhooks on the external service
- `unregister()` — cleanup
- `handler()` — receive inbound webhooks from the external service
- `actions` — callable operations (e.g., `generateContent`)
- `channels` — outbound message handlers (e.g., send text to Telegram)

It's a long-lived component that maintains connections and handles bidirectional traffic.

### Kestra RunnableTask (single function call)

A Kestra task is a **single function**: `run(RunContext) → Output`. It executes, returns a result, and it's done. There's no lifecycle, no webhook registration, no persistent connection.

Bidirectional traffic is split across separate plugin types:
- **Outbound:** Tasks (call APIs, send notifications, write data)
- **Inbound:** Triggers (watch for events, poll for changes, listen to streams)

This separation means Kestra has more types but each type is simpler. A Botpress integration does five things. A Kestra task does one thing.

---

## What Each Has That the Other Doesn't

### Kestra has, Botpress doesn't

| Component | Why Kestra needs it |
|-----------|-------------------|
| **Triggers** (standalone type) | Orchestration platform must detect events independently of task execution |
| **Conditions** (standalone type) | Declarative gating avoids embedding logic in code |
| **TaskRunners** (pluggable execution env) | Self-hosted platform must support diverse infrastructure |
| **Storage/Secrets** (pluggable backends) | Self-hosted platform must adapt to customer infrastructure |
| **Execution state machine** | Long-running workflows need persistent state, retry, resume |
| **Worker queue** | Distributed task execution across multiple workers |
| **Template engine** (Pebble) | YAML-based composition needs expression evaluation |

### Botpress has, Kestra doesn't

| Component | Why Botpress needs it |
|-----------|---------------------|
| **Interfaces** (abstract contracts) | Runtime provider swapping without changing plugin code |
| **Hook chain** (middleware pattern) | Message interception and transformation in a conversational context |
| **Proxy resolution** (dependency inversion) | Plugins must be decoupled from specific integrations |
| **Build-time type generation** | TypeScript type safety across the interface/integration/plugin boundary |
| **AI stack** (Cognitive/Zai/LLMz) | Purpose-built for conversational AI with agent capabilities |

---

## Runtime Flow Comparison

### Botpress: message through a knowledge bot

```
User sends message in Telegram
  │
  ├─► Telegram webhook POST → Botpress platform
  │     → telegram integration handler() receives it
  │     → creates message on platform
  │
  ├─► Bot server receives event_received
  │     → runs beforeIncomingMessage hooks
  │
  │   knowledge plugin hook fires:
  │     → calls actions.llm.generateContent()
  │     → Proxy resolves: llm → openai (from bot wiring)
  │     → HTTP to platform → openai integration → OpenAI API
  │     → plugin gets answer, posts reply
  │
  │   personality plugin hook fires:
  │     → intercepts outgoing reply
  │     → calls actions.llm.generateContent() to rewrite
  │     → same resolution: llm → openai → OpenAI API
  │     → rewritten message continues
  │
  └─► Rewritten message → platform → telegram integration
        → Telegram Bot API → user sees reply
```

**Key characteristic:** Single request cycle. All hooks fire synchronously in one event loop. No persistent state between messages (beyond conversation state stored on platform).

### Kestra: data pipeline execution

```
Schedule trigger fires (cron: 0 9 * * *)
  │
  ├─► Scheduler checks conditions
  │     → DayWeek condition: is it a weekday? yes
  │     → Creates new Execution record (state: CREATED → RUNNING)
  │
  ├─► Executor receives Execution
  │     → Resolves first task: S3 Download (RunnableTask)
  │     → Creates TaskRun record (state: CREATED)
  │     → Puts WorkerTask on Queue
  │
  ├─► Worker picks up WorkerTask
  │     → Creates RunContext with variables, outputs, secrets
  │     → Calls task.run(runContext)
  │     → S3 Download calls AWS S3 API
  │     → Returns Output with file URI
  │     → Worker puts WorkerTaskResult on Queue
  │     → TaskRun state: RUNNING → SUCCESS
  │
  ├─► Executor picks up result
  │     → Stores output in execution variables
  │     → Resolves next task: Python Script (RunnableTask)
  │     → Template: "{{ outputs.download.uri }}" → resolved URI
  │     → Puts WorkerTask on Queue
  │     → Worker executes script → SUCCESS
  │
  ├─► Executor resolves next: Slack notification
  │     → Template: "{{ secret('SLACK_WEBHOOK') }}" → resolved secret
  │     → Puts WorkerTask on Queue
  │     → Worker sends Slack webhook → SUCCESS
  │
  └─► All tasks complete
        → Execution state: RUNNING → SUCCESS
        → Full audit trail persisted to database
```

**Key characteristic:** Long-lived execution with persistent state. Each task is a separate Worker job. Templates pass data between tasks. The Executor tracks the full state machine. Failures trigger retries based on policy. Everything is replayable.

---

## Are They the Same Architecture?

Both Botpress and Kestra are plugin-driven platforms. The question is whether they're the same machine wearing different clothes, or fundamentally different architectures. To answer this, we trace both through the five stages every plugin system must solve.

### Stage 1: Discovery — "how does the engine find plugins?"

**Kestra:** `@Plugin` annotation → compile-time `PluginProcessor` generates `META-INF/services` file → runtime `ServiceLoader` reads it → `PluginScanner` classifies each class by `instanceof` checks into buckets (Task, Trigger, Condition, etc.) → `DefaultPluginRegistry` stores them in a `ConcurrentHashMap<PluginIdentifier, Class>`.

**Botpress:** Definition file convention (`integration.definition.ts`, `plugin.definition.ts`) → CLI detects project type → `esbuild` compiles and evaluates the definition → extracts a JS object with schemas/actions/channels → code generation writes typed handler signatures to `.botpress/`.

**Verdict: Same pattern.** Annotation/convention marks what a plugin is → a processor extracts metadata at build time → a registry holds the results. The mechanism differs (Java ServiceLoader vs esbuild + codegen), but the architecture is: **scan → classify → register**.

### Stage 2: Composition — "how does the user wire plugins together?"

**Kestra:** Flow YAML names specific task types by fully-qualified class name (`type: io.kestra.plugin.aws.s3.Download`). Jackson deserializer hits `PluginDeserializer` → calls `PluginRegistry.findClassByIdentifier(typeString)` → gets the Java class → Jackson deserializes YAML properties into that class. **Direct binding.** The YAML IS the wiring.

**Botpress:** `Bot.addIntegration(openai)` + `Bot.addPlugin(knowledge, { dependencies: { llm: { integrationAlias: 'openai' } } })`. The `addPlugin` method resolves interface→integration mappings, builds `PluginInterfaceExtension` objects with action name mappings, and stores them in `PluginRuntimeProps`. **Indirect binding.** The bot definition builds a resolution table.

**Verdict: Same operation, different indirection level.** Both produce the same result: at runtime, the engine knows exactly which code to call for each plugin slot. Kestra does it by having the user write the concrete class name directly. Botpress does it by having the user declare which integration fulfills which interface.

### Stage 3: Resolution — "when a plugin needs something, how does the engine find it?"

**Kestra:** Task calls `runContext.render("{{ outputs.download.uri }}")` → `VariableRenderer` (Pebble template engine) looks up `variables["outputs"]["download"]["uri"]` from a flat Map that the Executor built from previous task results. Task calls `runContext.storage().put(file)` → direct method call on injected Storage object. **No indirection.** The RunContext is a bag of pre-resolved values.

**Botpress:** Plugin calls `actions.llm.generateContent(input)` → JavaScript `Proxy` intercepts `.llm` → looks up `props.interfaces['llm'].integrationAlias` → gets `'openai'` → intercepts `.generateContent` → looks up `props.interfaces['llm'].actions['generateContent'].name` → builds string `'openai:generateContent'` → calls `client.callAction({ type: 'openai:generateContent', input })`. **Runtime indirection.** The Proxy resolves every call dynamically from wiring metadata.

**Verdict: Different mechanism.** Both inject a context object (RunContext / actions+client). But Kestra's context is **pre-resolved** — values are already there, you just read them. Botpress's context is **lazy-resolved** — the Proxy figures out where to route each call at invocation time. The Proxy is architecturally significant: it's what makes the interface abstraction work at runtime and what makes it unnecessary in Kestra.

### Stage 4: Execution — "how does the engine run the plugin code?"

**Kestra:** `ExecutorService.process()` loops through the state machine → `handleWorkerTask()` checks `instanceof RunnableTask` → wraps in `WorkerTask` → emits to `workerJobQueue` → `DefaultWorker` picks it up → `WorkerTaskCallable.doCall()` calls `task.run(runContext)` → task returns `Output` → `WorkerTaskResult` emitted back to queue → Executor picks up result, updates state.

**Botpress:** `botHandler()` receives HTTP POST → extracts operation from headers → `onEventReceived()` → runs `before_incoming_message` hooks (plugins) in order → runs bot's `messageHandlers` → runs `after_incoming_message` hooks. When a plugin calls an action → `BotSpecificClient._run()` wraps the call with before/after hooks → `client.callAction()` sends HTTP to platform → platform routes to integration server → `onActionTriggered()` → `instance.actions[type](input)` → integration calls external API.

**Verdict: Same dispatch pattern, different lifecycle.** Both have a dispatcher that decides what to run, a transport between components, and the rule that components never call each other directly — everything goes through a central routing mechanism. The difference is shape: Kestra's dispatcher is a **state machine loop** that runs repeatedly as tasks complete (long-lived). Botpress's dispatcher is a **single-pass pipeline** that fires hooks and handlers for one event (ephemeral).

### Stage 5: Routing — "how do calls get from component A to component B?"

**Kestra:** `QueueInterface` — pluggable message queue (Kafka, PostgreSQL, in-memory). Executor emits `WorkerTask` → Worker subscribes → Worker emits `WorkerTaskResult` → Executor subscribes. Asynchronous, decoupled, distributed.

**Botpress:** `client.callAction()` → HTTP POST to Botpress cloud platform → platform routes to integration HTTP server → integration responds → platform returns response to caller. Synchronous, HTTP-based, centralized.

**Verdict: Same role, different transport.** Both use a central routing mechanism where components never talk directly to each other. Kestra's queue is async and persistent — tasks can retry, resume, replay. Botpress's HTTP is synchronous and stateless — the call either succeeds or fails, no replay.

### Summary

| Stage | Kestra | Botpress | Same? |
|-------|--------|----------|-------|
| Discovery | ServiceLoader + annotation | Convention + esbuild codegen | Same pattern |
| Composition | Direct class reference in YAML | Indirect interface binding in code | Same operation, different indirection |
| Resolution | Pre-resolved context (RunContext) | Lazy-resolved Proxy | **Different mechanism** |
| Execution | Async state machine + worker queue | Sync hook pipeline + HTTP | Same dispatch pattern, different lifecycle |
| Routing | Async queue (Kafka/PG) | Sync HTTP (platform) | Same role, different transport |

They are **the same architecture at the pattern level.** Both follow: discover plugins → compose them via a declaration → resolve references at runtime → execute through a dispatcher → route calls through a central transport.

The one genuinely architectural difference is **resolution**: Kestra resolves everything eagerly into a flat context before the task runs. Botpress resolves lazily through a Proxy at call time. That's what makes the interface abstraction possible in Botpress and unnecessary in Kestra. Everything else is the same machine wearing different clothes.

---

## BD2 Translation Status

The Python translation in BD2 has ported Kestra's architecture faithfully in structure:

| Layer | Files | Status |
|-------|-------|--------|
| **Core models** (Flow, Task, Execution, TaskRun, Trigger, Condition) | 301 | ~90% structure, ~30% logic |
| **Plugin system** (registry, manager, scanner, processor) | ~50 | Framework complete, discovery stubbed |
| **Executor** | ~10 | Architecture defined, ~20% implementation |
| **Worker** | ~10 | Architecture defined, ~20% implementation |
| **Scheduler** | ~10 | Stubbed |
| **Core plugins** (flow control, HTTP, KV, triggers) | ~100 | Stubbed |
| **External integrations** | 2,082 across 125 packages | <5% functional, structure complete |
| **Web server** | ~100 | ~40% controllers, limited logic |
| **Total** | 3,556 | ~25-30% functional |

~3,572 methods raise `NotImplementedError` with `# TODO: translate from Java`. The translation followed a skeleton-first approach: define all types, establish all relationships, then fill in implementation iteratively.

The engine translation lives at `BD2/engine/`, the integration translations at `BD2/integrations/`. Both mirror the Java original's package structure closely, with Python adaptations:
- `dataclass` with `slots=True` instead of Java POJOs
- `Protocol` types instead of Java interfaces
- Python `Enum` for state machines
- Pebble template engine integrated for expression evaluation

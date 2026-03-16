# Kestra Runtime Translation Matrix

Source inventory:
[2026-03-16-kestra-runnable-task-execution-by-file.md](E:\writing-system\docs\architecture\2026-03-16-kestra-runnable-task-execution-by-file.md)

Live BlockData target:
`services/platform-api`

Legacy reference target:
`services/pipeline-worker`

## Scope

This matrix translates the Kestra execution path into concrete owners in our repo so we can port plugin execution into Python handlers without waiting for a perfect parity proof.

Use these status labels:

- `Exists` means there is already a concrete counterpart in our repo.
- `Partial` means there is a real counterpart, but the behavior is narrower or structurally different.
- `Missing` means we still need to build the equivalent.
- `Out of Handler Scope` means the responsibility belongs to orchestration rather than individual Python handlers.

## Runtime Boundary

These are the core Python runtime files that plugin translation should target first:

| Responsibility | BlockData file |
|---|---|
| Plugin contract | `services/platform-api/app/domain/plugins/models.py` |
| Runtime context | `services/platform-api/app/domain/plugins/models.py` |
| Plugin registry | `services/platform-api/app/domain/plugins/registry.py` |
| Plugin HTTP entrypoint | `services/platform-api/app/api/routes/plugin_execution.py` |
| App boot and plugin discovery | `services/platform-api/app/main.py` |
| Script execution substrate | `services/platform-api/app/domain/plugins/execution.py` |
| Shared auth substrate | `services/platform-api/app/infra/auth_providers.py` |
| Shared storage substrate | `services/platform-api/app/infra/storage.py` |

## Function Matrix

### `JdbcExecutor.java`

| Kestra function | Responsibility | BlockData counterpart | Status | Notes |
|---|---|---|---|---|
| `executorService.process(executor)` | Resolve next work for an execution | No single equivalent. Split between route dispatch, registry resolution, and future orchestration layer | `Partial` | We have handler execution, not a full executor state machine yet |
| `executorService.onNexts(execution, nexts)` | Persist next task runs onto execution state | No current equivalent in handler runtime | `Out of Handler Scope` | This belongs to orchestration, not a single plugin handler |
| `runIf` evaluation and skip result | Evaluate task-level conditional before execution | No shared pre-handler gate | `Missing` | We need a generic task wrapper if we want Kestra-style `runIf` across all handlers |
| `isSendToWorkerTask()` branch | Decide whether task goes to worker queue | `app.api.routes.plugin_execution.execute` | `Partial` | Our current model is direct HTTP invocation, not queued dispatch |
| `workerGroupService.resolveGroupFromJob(...)` | Resolve worker affinity / routing | No equivalent | `Out of Handler Scope` | Queue and worker placement are orchestration concerns |
| `workerJobQueue.emit(...)` | Submit work to worker transport | HTTP request to plugin route | `Partial` | Equivalent entrypoint exists, transport semantics differ |
| `WorkingDirectory` special emit path | Let a flowable worker task execute children inline | No direct runtime wrapper | `Missing` | Needed if we port Kestra-style working-directory execution semantics |
| Flowable task forced `RUNNING` state | Mark container task as running while children execute | No equivalent | `Out of Handler Scope` | Requires orchestrator/task-run model |
| `addWorkerTaskResults(executor, workerTaskResults)` | Batch-join worker updates into execution state | No equivalent | `Out of Handler Scope` | Caller-side aggregation still missing |
| `workerTaskResultQueue(...)` | Consume worker results, lock execution, join result, re-emit execution | No equivalent | `Out of Handler Scope` | We return HTTP responses; we do not yet join async task-run results |
| `toExecution(executor)` | Persist/emit updated execution state | No equivalent | `Out of Handler Scope` | Another orchestrator responsibility |

### `DefaultWorker.java`

| Kestra function | Responsibility | BlockData counterpart | Status | Notes |
|---|---|---|---|---|
| `workerJobQueue.subscribe(...)` | Subscribe to incoming work | FastAPI route registration in `app.main` plus `plugin_execution.execute` | `Partial` | We have request-driven execution instead of long-lived queue consumers |
| `handleTask(task)` | Route task envelope to execution path | `app.api.routes.plugin_execution.execute` | `Exists` | This is the direct Python entrypoint for plugin execution |
| `run(workerTask, cleanUp)` | Generic worker-side wrapper around plugin execution | Split across `plugin_execution.execute`, `ExecutionContext`, and plugin `run()` | `Partial` | No single shared worker wrapper yet |
| Start log via `Logs.logTaskRun(...)` | Emit generic task-start log | No shared equivalent | `Missing` | Plugins log individually; route does not emit a standard start event |
| Kill short-circuit for killed execution | Stop task before running if execution already killed | No equivalent | `Missing` | Needs orchestration/task state and cancellation wiring |
| `runContextInitializer.forWorker(...)` | Build runtime context with variables, logger, storage, plugin config | `ExecutionContext(...)` in `app.domain.plugins.models` | `Partial` | We set IDs, user, variables, secrets, storage, temp dir; we do not yet rehydrate Kestra outputs or plugin config the same way |
| Task cache read path | Reuse cached outputs before execution | No equivalent | `Missing` | No generic plugin output cache substrate |
| `runAttempt(...)` | Execute one attempt, create attempt state, persist outputs, metrics | Split across route execution and plugin return value | `Partial` | Attempt lifecycle and metrics are missing as first-class substrate |
| Shutdown restart path | Suppress result emission during worker termination so work can be resubmitted | No equivalent | `Missing` | Requires queue/worker orchestration |
| Warning/retry/allow-failure normalization | Convert final state based on retry and tolerance rules | Plugin `PluginOutput.state` exists, but no shared policy layer | `Missing` | Needs a generic post-run policy wrapper |
| `dynamicWorkerResults(...)` | Collect dynamic task runs emitted during execution | No equivalent | `Missing` | Important for flowable/dynamic tasks |
| Final `workerTaskResultQueue.emit(...)` | Emit terminal task result | HTTP response from `plugin_execution.execute` | `Partial` | Response exists; no async result queue or task-run envelope |
| Cache upload after success | Persist execution outputs as cache artifact | No equivalent | `Missing` | No shared cache writer |
| Queue / oversized message fallback | Fail gracefully if result payload is too large for queue transport | No equivalent | `Missing` | We need size limits only if we add queue transport or persistence limits |
| Asset declaration rendering and merge | Compute input/output asset lineage from task declaration plus emitted assets | No equivalent | `Missing` | No shared asset lineage substrate in plugin runtime |
| `callJob(...)` | Wrap callable in tracing span and security context and track for kill/stop | Auth in `plugin_execution.execute`; no tracer wrapper | `Partial` | Security context exists through auth dependency, but tracing and kill tracking do not |

### `WorkerTaskCallable.java`

| Kestra function | Responsibility | BlockData counterpart | Status | Notes |
|---|---|---|---|---|
| Constructor around task, run context, metrics | Wrap plugin invocation in execution helper | Route plus plugin instance resolution | `Partial` | We do not have a dedicated callable object |
| `task.run(runContext)` | Invoke plugin body | `BasePlugin.run(params, context)` in `app.domain.plugins.models` | `Exists` | This is the core translation boundary |
| Timeout handling with `Failsafe` | Enforce task timeout and kill on timeout | Script plugins call `run_script(..., timeout=...)` | `Partial` | Exists for script plugins only; generic plugin timeout wrapper is missing |
| `taskOutput.finalState()` | Let plugin output override terminal state | `PluginOutput.state` | `Exists` | Python plugins can set `SUCCESS`, `FAILED`, or `WARNING` directly |
| `RunnableTaskException` output capture | Preserve output payload when task throws structured failure | No shared equivalent | `Missing` | Python route catches generic exceptions and drops structured failure data |
| `signalStop()` / `kill()` | Cooperative stop and forced kill hooks | No equivalent | `Missing` | Needed only if we add cancellable long-running worker execution |

### `WorkerTask.java`

| Kestra function | Responsibility | BlockData counterpart | Status | Notes |
|---|---|---|---|---|
| Worker envelope with `taskRun`, `task`, `runContext`, `executionKind` | Package execution request for worker | `PluginRequest` plus `ExecutionContext` in `plugin_execution.py` | `Partial` | We pass params, IDs, and variables, but not a full task-run envelope |
| `uid()` | Stable task-run identity | `task_run_id` field in request/context | `Partial` | Identity exists, but not as a first-class message object |
| `fail()` | Convert task to failed state based on task type | No shared equivalent | `Missing` | We currently only return `PluginOutput(state="FAILED")` |

### `WorkerTaskResult.java`

| Kestra function | Responsibility | BlockData counterpart | Status | Notes |
|---|---|---|---|---|
| Result envelope with `taskRun` | Return terminal task result to orchestrator | `PluginResponse.output` | `Partial` | Output exists, but not inside a task-run state object |
| `dynamicTaskRuns` | Attach dynamically generated child task runs | No equivalent | `Missing` | Required for dynamic flow constructs |
| `uid()` | Stable result identity | `task_run_id` on request/context | `Partial` | We do not currently stamp response identity explicitly |

## Plugin-Family Substrate Map

These are not called out in the Kestra executor file, but they are the shared Python substrates most plugin families will actually use.

| Kestra concern | BlockData counterpart | Status |
|---|---|---|
| Template rendering | `ExecutionContext.render(...)` in `app.domain.plugins.models` | `Exists` |
| Secret lookup | `ExecutionContext.get_secret(...)` in `app.domain.plugins.models` | `Partial` |
| Temp working directory | `ExecutionContext.work_dir`, `create_temp_file()`, `cleanup()` in `app.domain.plugins.models` | `Exists` |
| Storage upload/download/list/delete | `app.infra.storage` plus `ExecutionContext` wrappers | `Exists` |
| Common auth patterns | `app.infra.auth_providers.resolve_auth(...)` | `Exists` |
| Script subprocess execution | `app.domain.plugins.execution.run_script(...)` | `Exists` |
| Plugin registration and type lookup | `app.domain.plugins.registry` | `Exists` |

## What To Build Next

If the immediate goal is to start translating Kestra integrations into Python handlers, build in this order:

1. Generic pre/post execution wrapper
   - Owns `runIf`, timeout, state normalization, standard logs, and structured failures
2. Shared task envelope/result model
   - Gives us a stable counterpart for `WorkerTask` and `WorkerTaskResult`
3. Shared cache substrate
   - Read-before-run and write-after-success
4. Shared asset/output lineage substrate
   - Needed for file-heavy or artifact-heavy plugins
5. Dynamic task emission model
   - Only if we are porting flowable/dynamic task families
6. Orchestrator-side execution state machine
   - Only if we want full Kestra executor semantics instead of handler-only execution

## Hard Rule For Translation

When translating a Kestra plugin family:

- Map `task.run(RunContext)` to `BasePlugin.run(params, context)` first.
- Map any shared dependency to substrate before adding plugin-specific logic.
- Do not re-implement executor or queue semantics inside a plugin handler.
- Mark orchestration responsibilities explicitly instead of smuggling them into plugin code.

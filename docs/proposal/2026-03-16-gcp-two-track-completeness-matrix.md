# GCP Two-Track Completeness Matrix

**Date:** 2026-03-16
**Purpose:** Build the missing baseline artifact: a source-verified completeness matrix for the 55 Kestra GCP functions, split across two implementation tracks and compared against what BlockData actually has today.
**Method:** Verified against `E:/kestra/`, `E:/kestra-io/plugins/plugin-gcp/`, and `E:/writing-system/`. This document treats repo source as primary evidence and treats absence as "not found in current source," not as a claim that a feature can never exist.

---

## Executive Assessment

The current BlockData repo does **not** contain an end-to-end complete GCP implementation on either track.

- **Track 1: Kestra-compatibility path**
  - BlockData has the beginnings of the substrate: a plugin registry, a generic plugin execution route, a load-run orchestration path, service/function registry tables, and a narrow GCS implementation.
  - It does **not** yet have the GCP family implemented in any broad sense. In current source, the only directly registered Kestra GCP task alias in `platform-api` is `io.kestra.plugin.gcp.gcs.List`.

- **Track 2: normalized internal path**
  - BlockData has the normalized service registry concept and a concrete source-to-destination pattern for GCS to ArangoDB load runs.
  - It does **not** yet have normalized internal GCP capability families for BigQuery, Firestore, Pub/Sub, Dataproc, Dataform, Monitoring, GKE, or Vertex task execution.

So the real work is not "translate GCP." The real work is:

1. decide which of the 55 functions belong on Track 1, Track 2, or both
2. build the shared runtime substrate both tracks need
3. implement domain families in dependency order

---

## The Two Tracks

### Track 1: Kestra-compatibility path

Goal: support Kestra-shaped GCP task execution inside BlockData with enough fidelity that imported Kestra GCP tasks can run through BlockData's internal execution plane.

Success condition:
- a GCP task expressed as a Kestra task type can resolve credentials, execute, emit outputs/artifacts, and participate in orchestration within BlockData

### Track 2: normalized internal path

Goal: represent GCP capabilities as BlockData-native services/functions/stages rather than as a direct mirror of Kestra task classes.

Success condition:
- GCP capability is available through BlockData-native service families, execution stages, and internal contracts, even when Kestra task classes are only a compatibility shell or import source

---

## Source Corpus Reviewed

### Kestra core/runtime

- `E:/kestra/core/src/main/java/io/kestra/core/runners/RunContext.java`
- `E:/kestra/core/src/main/java/io/kestra/core/runners/DefaultRunContext.java`
- `E:/kestra/core/src/main/java/io/kestra/core/services/ExecutionService.java`
- `E:/kestra/core/src/main/java/io/kestra/core/services/FlowService.java`
- `E:/kestra/core/src/main/java/io/kestra/core/services/StorageService.java`
- `E:/kestra/core/src/main/java/io/kestra/core/services/KVStoreService.java`
- `E:/kestra/core/src/main/java/io/kestra/core/services/WebhookService.java`
- `E:/kestra/core/src/main/java/io/kestra/core/services/ExecutionLogService.java`
- `E:/kestra/core/src/main/java/io/kestra/core/runners/WorkerTask.java`
- `E:/kestra/core/src/main/java/io/kestra/core/runners/WorkerTaskRunning.java`
- `E:/kestra/core/src/main/java/io/kestra/core/runners/WorkerTaskResult.java`
- `E:/kestra/core/src/main/java/io/kestra/core/models/triggers/PollingTriggerInterface.java`
- `E:/kestra/core/src/main/java/io/kestra/core/models/triggers/RealtimeTriggerInterface.java`
- `E:/kestra/core/src/main/java/io/kestra/core/models/triggers/StatefulTriggerInterface.java`
- `E:/kestra/core/src/main/java/io/kestra/core/models/triggers/TriggerContext.java`
- `E:/kestra/core/src/main/java/io/kestra/core/models/tasks/NamespaceFilesInterface.java`
- `E:/kestra/core/src/main/java/io/kestra/core/models/tasks/InputFilesInterface.java`
- `E:/kestra/core/src/main/java/io/kestra/core/models/tasks/OutputFilesInterface.java`

### Kestra GCP plugin family

- `E:/kestra-io/plugins/plugin-gcp/src/main/resources/metadata/index.yaml`
- `E:/kestra-io/plugins/plugin-gcp/src/main/java/io/kestra/plugin/gcp/**`

### BlockData runtime and registry

- `E:/writing-system/services/platform-api/app/domain/plugins/models.py`
- `E:/writing-system/services/platform-api/app/domain/plugins/registry.py`
- `E:/writing-system/services/platform-api/app/api/routes/plugin_execution.py`
- `E:/writing-system/services/platform-api/app/api/routes/load_runs.py`
- `E:/writing-system/services/platform-api/app/plugins/gcs.py`
- `E:/writing-system/services/platform-api/app/plugins/arangodb.py`
- `E:/writing-system/services/platform-api/app/plugins/core.py`
- `E:/writing-system/services/platform-api/app/plugins/scripts.py`
- `E:/writing-system/services/platform-api/app/infra/gcs_auth.py`
- `E:/writing-system/supabase/functions/_shared/vertex_auth.ts`
- `E:/writing-system/supabase/functions/_shared/vertex_claude.ts`
- `E:/writing-system/supabase/functions/_shared/vertex_claude_stream.ts`
- `E:/writing-system/supabase/migrations/20260303130000_067_integration_catalog_seed.sql`
- `E:/writing-system/supabase/migrations/20260316020000_095_register_gcs_arangodb.sql`
- `E:/writing-system/supabase/migrations/20260316050000_096_reconciliation_cutover.sql`

---

## Verified GCP Inventory

The seeded integration catalog contains **55** GCP task entries under `io.kestra.plugin.gcp.*` in `20260303130000_067_integration_catalog_seed.sql`.

The plugin source tree identifies the Google Cloud plugin family as `io.kestra.plugin.gcp` in `plugin-gcp/src/main/resources/metadata/index.yaml`.

Task-bearing domains in the current 55-function surface:

- `auth`: 1
- `bigquery`: 16
- `cli`: 1
- `dataform`: 1
- `dataproc`: 6
- `firestore`: 4
- `function`: 1
- `gcs`: 13
- `gke`: 1
- `monitoring`: 3
- `pubsub`: 4
- `vertexai`: 4

Total: `55`

---

## What Kestra Already Provides To These Plugins

This is the part earlier proposals underplayed. The GCP plugins do not run in isolation. They run because Kestra already provides a runtime around them.

| Kestra capability | Source evidence | Why it matters to GCP completeness |
| --- | --- | --- |
| Run context and rendering | `RunContext.java`, `DefaultRunContext.java` | Gives plugins access to render variables, files, storage, temp paths, secrets, metrics, logger, tenant/execution context |
| Flow parsing/default injection | `FlowService.java` | Needed for valid imported Kestra flows and plugin resolution |
| Execution lifecycle | `ExecutionService.java`, `Execution.java` | Needed for task state, retries, outputs, execution history |
| Worker task model | `WorkerTask.java`, `WorkerTaskRunning.java`, `WorkerTaskResult.java` | Needed for long-running jobs and worker-bound execution |
| Trigger system | `PollingTriggerInterface.java`, `RealtimeTriggerInterface.java`, `StatefulTriggerInterface.java`, `TriggerContext.java` | Required for `bigquery.Trigger`, `gcs.Trigger`, `monitoring.Trigger`, `pubsub.Trigger`, `pubsub.RealtimeTrigger` |
| Namespace/input/output file contracts | `NamespaceFilesInterface.java`, `InputFilesInterface.java`, `OutputFilesInterface.java` | Required by `cli.GCloudCLI`; relevant to any task expecting injected files or exported files |
| Storage and artifact services | `StorageService.java`, `KVStoreService.java` | Required for internal file handoff, stateful trigger memory, and intermediate artifacts |
| Logging and webhook/runtime services | `ExecutionLogService.java`, `WebhookService.java` | Required for observability and trigger/webhook behavior |

Bottom line: the 55 GCP functions are sitting on top of a full execution substrate, not just a set of HTTP calls.

---

## What BlockData Actually Has Today

### Shared substrate that exists

| BlockData capability | Source evidence | Current value |
| --- | --- | --- |
| Generic plugin abstraction | `services/platform-api/app/domain/plugins/models.py` | `ExecutionContext` plus `BasePlugin` exists |
| Auto-discovered plugin registry | `services/platform-api/app/domain/plugins/registry.py` | Registry scans `app/plugins/` and resolves task types |
| Generic plugin execution route | `services/platform-api/app/api/routes/plugin_execution.py` | Can execute registered plugins by task type |
| Load-run orchestration path | `services/platform-api/app/api/routes/load_runs.py` | Concrete source-to-destination orchestration exists |
| Normalized service/function registry | `20260316050000_096_reconciliation_cutover.sql` | Canonical `service_registry`, `service_functions`, `service_runs` tables exist |
| Stage and execution-plane fields | `20260316050000_096_reconciliation_cutover.sql` | Supports internal service categorization and routing |

### GCP-specific capability that exists

| GCP capability found in current source | Source evidence | Status |
| --- | --- | --- |
| `io.kestra.plugin.gcp.gcs.List` alias | `services/platform-api/app/plugins/gcs.py` | Implemented through `GCSListPlugin` |
| GCS CSV download helper | `services/platform-api/app/plugins/gcs.py` | Implemented as BlockData-native helper, not as a Kestra GCP alias |
| GCS service registration | `20260316020000_095_register_gcs_arangodb.sql`, `20260316050000_096_reconciliation_cutover.sql` | Registered as normalized service/functions |
| GCS OAuth token exchange | `services/platform-api/app/infra/gcs_auth.py` | Implemented, but scoped to `devstorage.read_only` |
| Vertex auth/helper code | `supabase/functions/_shared/vertex_auth.ts`, `vertex_claude.ts`, `vertex_claude_stream.ts` | Exists in edge functions, not as `platform-api` GCP plugins |

### What is not found as implemented GCP functionality

Repo search across `E:/writing-system/` found **no current `platform-api` plugin implementations** for:

- BigQuery
- Firestore
- Pub/Sub
- Dataproc
- Dataform
- GKE metadata
- Cloud Monitoring
- GCP auth task surface
- GCP HTTP function task surface
- Vertex AI plugin task surface

That means the catalog currently contains many GCP items that are documented and seeded, but not backed by runnable `platform-api` handlers.

---

## Critical Current Runtime Gap

There is a source-verified gap between the generic plugin execution route and the connection-resolving plugins.

- `plugin_execution.py` constructs `ExecutionContext` with `execution_id`, `task_run_id`, and `variables`, but not `user_id`
- `gcs.py` and `arangodb.py` resolve credentials via `resolve_connection_sync(..., context.user_id)`
- `load_runs.py` does populate `ExecutionContext(..., user_id=auth.user_id)`

This means:

- the narrow load-run path is closer to working end to end for user-owned connections
- the generic plugin execution path is currently insufficient for connection-backed translated plugins

This is a blocker for both tracks wherever connection ownership matters.

---

## Shared Missing Capabilities Across Both Tracks

These are the runtime gaps that matter before the 55 functions can become end-to-end complete.

| Missing capability | Why both tracks need it | Severity |
| --- | --- | --- |
| User-bound execution context on all plugin routes | Required for connection resolution and secrets ownership | Critical |
| Broader GCP auth/token exchange by service and scope | GCS read-only token exchange is not enough for BigQuery, Firestore, Pub/Sub, Dataproc, Vertex, Monitoring | Critical |
| Shared artifact/file handoff contract | Needed for load/extract tasks, staged files, internal URIs, and reusable outputs | Critical |
| Long-running job lifecycle and polling | Required for BigQuery jobs, Dataproc jobs, Dataform invocations, Vertex custom jobs | Critical |
| Trigger runtime with polling/realtime/state | Required for all GCP trigger tasks | Critical |
| File injection/export semantics | Required for `GCloudCLI` and any runner-like task expecting namespace/input/output files | Major |
| Retry, status, and execution history parity for imported tasks | Needed for trustworthy Track 1 behavior and reliable Track 2 jobs | Major |
| Domain families beyond GCS | Needed because 54 of 55 GCP functions are not currently exposed as `platform-api` task handlers | Critical |

---

## Domain-Level Completeness Matrix

| Domain | Count | Kestra runtime shape from source | Current BlockData status | Track 1 need | Track 2 need | Main blockers |
| --- | ---: | --- | --- | --- | --- | --- |
| `auth` | 1 | runnable task | missing | implement compat auth token task | normalize as connection/token broker | GCP auth scopes, user-bound credentials |
| `bigquery` | 16 | runnable tasks plus polling trigger; `Copy`/`Query` extend `AbstractJob`; `Load`/`LoadFromGcs` extend `AbstractLoad` | missing | compat query/load/export/table/dataset tasks, plus trigger | normalized dataset/table/query/load/export family | job lifecycle, artifact handoff, triggers, auth scopes |
| `cli` | 1 | runner-like task; `GCloudCLI` implements namespace/input/output file interfaces | missing | compat CLI runner | likely not first-class normalized function; depends on internal runner/sandbox decision | sandbox, file injection/export, auth, execution isolation |
| `dataform` | 1 | runnable task | missing | compat workflow invoke task | normalized job/invocation primitive if product wants Dataform | long-running job control, auth |
| `dataproc` | 6 | runnable tasks; operationally job/cluster oriented | missing | compat batch submit and cluster tasks | normalized compute-job/cluster management family if desired | long-running job control, polling, worker model, cost/risk policy |
| `firestore` | 4 | runnable tasks | missing | compat CRUD/query tasks | normalized document store family | auth scopes, mapping to normalized data operations |
| `function` | 1 | runnable task | missing | compat HTTP function invocation | normalize as authenticated Cloud Run/function invoke action | auth scopes, HTTP/runtime contract |
| `gcs` | 13 | runnable tasks plus polling/stateful trigger | partial | expand from list to full GCS compat family | normalized storage family | broader auth scopes, write/delete/copy semantics, trigger runtime |
| `gke` | 1 | runnable task | missing | compat cluster metadata task | maybe normalized infrastructure metadata/read task | auth scopes |
| `monitoring` | 3 | runnable tasks plus polling trigger | missing | compat query/push/trigger tasks | normalized metrics/query family and event source | auth scopes, trigger runtime |
| `pubsub` | 4 | runnable publish/consume plus polling/realtime triggers | missing | compat publish/consume/trigger tasks | normalized messaging family | consume semantics, ack/state, trigger runtime, worker model |
| `vertexai` | 4 | runnable tasks; `CustomJob` is job-oriented | partial adjacent only | compat text/chat/multimodal/custom job tasks | normalized AI inference and custom-job family | auth, model contract, long-running jobs, output/artifact handling |

---

## Full 55-Function Matrix

Status values:

- `implemented`: direct runnable support found in current source
- `adjacent`: partial related capability exists, but not as the function itself
- `missing`: no current runnable implementation found in current source

| Function | Shape | Current status | Track 1 target | Track 2 target | Main missing piece | Wave |
| --- | --- | --- | --- | --- | --- | --- |
| `io.kestra.plugin.gcp.auth.OauthAccessToken` | runnable | missing | compat auth task | token broker / auth utility | generic GCP OAuth substrate | 1 |
| `io.kestra.plugin.gcp.bigquery.Copy` | job-oriented runnable | missing | compat BigQuery task | normalized BigQuery copy job | job lifecycle + BigQuery auth | 2 |
| `io.kestra.plugin.gcp.bigquery.CopyPartitions` | job-oriented runnable | missing | compat BigQuery task | normalized partition copy op | job lifecycle + partition semantics | 2 |
| `io.kestra.plugin.gcp.bigquery.CreateDataset` | runnable | missing | compat BigQuery task | normalized dataset management | BigQuery client/auth | 2 |
| `io.kestra.plugin.gcp.bigquery.CreateTable` | runnable | missing | compat BigQuery task | normalized table management | BigQuery client/auth | 2 |
| `io.kestra.plugin.gcp.bigquery.DeleteDataset` | runnable | missing | compat BigQuery task | normalized dataset management | BigQuery client/auth | 2 |
| `io.kestra.plugin.gcp.bigquery.DeletePartitions` | runnable | missing | compat BigQuery task | normalized partition management | BigQuery client/auth | 2 |
| `io.kestra.plugin.gcp.bigquery.DeleteTable` | runnable | missing | compat BigQuery task | normalized table management | BigQuery client/auth | 2 |
| `io.kestra.plugin.gcp.bigquery.ExtractToGcs` | runnable | missing | compat BigQuery task | normalized export-to-storage op | BigQuery plus GCS artifact contract | 2 |
| `io.kestra.plugin.gcp.bigquery.Load` | load-oriented runnable | missing | compat BigQuery task | normalized load-from-artifact op | internal artifact/read contract | 2 |
| `io.kestra.plugin.gcp.bigquery.LoadFromGcs` | load-oriented runnable | missing | compat BigQuery task | normalized load-from-gcs op | BigQuery plus GCS coordination | 2 |
| `io.kestra.plugin.gcp.bigquery.Query` | job-oriented runnable | missing | compat BigQuery task | normalized query job | job lifecycle + result handling | 2 |
| `io.kestra.plugin.gcp.bigquery.StorageWrite` | runnable | missing | compat BigQuery task | normalized streaming ingest op | write-stream contract | 3 |
| `io.kestra.plugin.gcp.bigquery.TableMetadata` | runnable | missing | compat BigQuery task | normalized metadata/read op | BigQuery client/auth | 2 |
| `io.kestra.plugin.gcp.bigquery.Trigger` | polling trigger | missing | compat trigger | normalized event/polling source | trigger scheduler/state | 5 |
| `io.kestra.plugin.gcp.bigquery.UpdateDataset` | runnable | missing | compat BigQuery task | normalized dataset management | BigQuery client/auth | 2 |
| `io.kestra.plugin.gcp.bigquery.UpdateTable` | runnable | missing | compat BigQuery task | normalized table management | BigQuery client/auth | 2 |
| `io.kestra.plugin.gcp.cli.GCloudCLI` | runner-dependent | missing | compat CLI task | optional internal runner capability | sandbox + namespace/input/output files | 6 |
| `io.kestra.plugin.gcp.dataform.InvokeWorkflow` | job-oriented runnable | missing | compat Dataform task | normalized workflow invocation | job lifecycle + auth | 4 |
| `io.kestra.plugin.gcp.dataproc.batches.PySparkSubmit` | job-oriented runnable | missing | compat Dataproc task | normalized compute-job submit | worker/job substrate | 4 |
| `io.kestra.plugin.gcp.dataproc.batches.RSparkSubmit` | job-oriented runnable | missing | compat Dataproc task | normalized compute-job submit | worker/job substrate | 4 |
| `io.kestra.plugin.gcp.dataproc.batches.SparkSqlSubmit` | job-oriented runnable | missing | compat Dataproc task | normalized compute-job submit | worker/job substrate | 4 |
| `io.kestra.plugin.gcp.dataproc.batches.SparkSubmit` | job-oriented runnable | missing | compat Dataproc task | normalized compute-job submit | worker/job substrate | 4 |
| `io.kestra.plugin.gcp.dataproc.clusters.Create` | job-oriented runnable | missing | compat Dataproc task | normalized cluster management | long-running infra ops | 4 |
| `io.kestra.plugin.gcp.dataproc.clusters.Delete` | job-oriented runnable | missing | compat Dataproc task | normalized cluster management | long-running infra ops | 4 |
| `io.kestra.plugin.gcp.firestore.Delete` | runnable | missing | compat Firestore task | normalized document delete | Firestore client/auth | 3 |
| `io.kestra.plugin.gcp.firestore.Get` | runnable | missing | compat Firestore task | normalized document read | Firestore client/auth | 3 |
| `io.kestra.plugin.gcp.firestore.Query` | runnable | missing | compat Firestore task | normalized document query | Firestore client/auth | 3 |
| `io.kestra.plugin.gcp.firestore.Set` | runnable | missing | compat Firestore task | normalized document write | Firestore client/auth | 3 |
| `io.kestra.plugin.gcp.function.HttpFunction` | runnable | missing | compat invoke task | normalized authenticated function invoke | auth + HTTP contract | 3 |
| `io.kestra.plugin.gcp.gcs.Compose` | runnable | missing | compat GCS task | normalized storage compose | write-capable GCS substrate | 1 |
| `io.kestra.plugin.gcp.gcs.Copy` | runnable | missing | compat GCS task | normalized storage copy | write-capable GCS substrate | 1 |
| `io.kestra.plugin.gcp.gcs.CreateBucket` | runnable | missing | compat GCS task | normalized bucket management | write-capable GCS substrate | 1 |
| `io.kestra.plugin.gcp.gcs.CreateBucketIamPolicy` | runnable | missing | compat GCS task | normalized bucket IAM op | broader auth scopes | 2 |
| `io.kestra.plugin.gcp.gcs.Delete` | runnable | missing | compat GCS task | normalized storage delete | write-capable GCS substrate | 1 |
| `io.kestra.plugin.gcp.gcs.DeleteBucket` | runnable | missing | compat GCS task | normalized bucket management | write-capable GCS substrate | 1 |
| `io.kestra.plugin.gcp.gcs.DeleteList` | runnable | missing | compat GCS task | normalized bulk delete | write-capable GCS substrate | 1 |
| `io.kestra.plugin.gcp.gcs.Download` | runnable | missing | compat GCS task | normalized storage read | artifact/file contract | 1 |
| `io.kestra.plugin.gcp.gcs.Downloads` | runnable | missing | compat GCS task | normalized bulk storage read | artifact/file contract | 1 |
| `io.kestra.plugin.gcp.gcs.List` | runnable | implemented | retain compat task | normalize as storage list primitive | broaden from current narrow list-only support | 1 |
| `io.kestra.plugin.gcp.gcs.Trigger` | polling/stateful trigger | missing | compat trigger | normalized storage event source | trigger scheduler/state | 5 |
| `io.kestra.plugin.gcp.gcs.UpdateBucket` | runnable | missing | compat GCS task | normalized bucket management | write-capable GCS substrate | 1 |
| `io.kestra.plugin.gcp.gcs.Upload` | runnable | missing | compat GCS task | normalized storage write | artifact/file contract + write scope | 1 |
| `io.kestra.plugin.gcp.gke.ClusterMetadata` | runnable | missing | compat GKE task | normalized infrastructure metadata/read | GKE auth/client | 4 |
| `io.kestra.plugin.gcp.monitoring.Push` | runnable | missing | compat Monitoring task | normalized metrics push | Monitoring client/auth | 3 |
| `io.kestra.plugin.gcp.monitoring.Query` | runnable | missing | compat Monitoring task | normalized metrics query | Monitoring client/auth | 3 |
| `io.kestra.plugin.gcp.monitoring.Trigger` | polling trigger | missing | compat trigger | normalized metrics event source | trigger scheduler/state | 5 |
| `io.kestra.plugin.gcp.pubsub.Consume` | runnable but runtime-sensitive | missing | compat consume task | normalized subscription consume op | ack/state + worker semantics | 4 |
| `io.kestra.plugin.gcp.pubsub.Publish` | runnable | missing | compat publish task | normalized message publish | Pub/Sub client/auth | 3 |
| `io.kestra.plugin.gcp.pubsub.RealtimeTrigger` | realtime trigger | missing | compat trigger | normalized realtime event source | realtime trigger substrate | 5 |
| `io.kestra.plugin.gcp.pubsub.Trigger` | polling trigger | missing | compat trigger | normalized polling event source | trigger scheduler/state | 5 |
| `io.kestra.plugin.gcp.vertexai.ChatCompletion` | runnable | adjacent | compat Vertex task | normalized AI inference op | promote existing Vertex auth/helpers into task runtime | 3 |
| `io.kestra.plugin.gcp.vertexai.CustomJob` | job-oriented runnable | adjacent | compat Vertex task | normalized AI custom job op | long-running job substrate | 4 |
| `io.kestra.plugin.gcp.vertexai.MultimodalCompletion` | runnable | adjacent | compat Vertex task | normalized multimodal inference op | promote existing Vertex auth/helpers into task runtime | 3 |
| `io.kestra.plugin.gcp.vertexai.TextCompletion` | runnable | adjacent | compat Vertex task | normalized text inference op | promote existing Vertex auth/helpers into task runtime | 3 |

---

## End-to-End Completion Requirements By Track

### Track 1 is end-to-end complete only when:

- imported or authored Kestra GCP task types can be resolved through BlockData's plugin registry
- every selected GCP task can resolve user-scoped credentials
- file/artifact-producing tasks can hand outputs to downstream tasks through a stable internal contract
- job-oriented tasks have status polling, cancellation, timeout, and output capture
- trigger tasks have scheduler/realtime infrastructure and state handling
- runner-like tasks have sandbox/file injection/export support

### Track 2 is end-to-end complete only when:

- GCP capability is represented in `service_registry` and `service_functions` as BlockData-native families
- the normalized functions are routable through the execution plane that owns them
- cross-task artifacts and outputs are standardized rather than reimplemented per plugin
- event sources, long-running jobs, and auth are provided as reusable primitives rather than one-off handlers

---

## Feasible Implementation Order

### Shared substrate first

1. fix `ExecutionContext` user propagation on generic plugin execution
2. build generic GCP auth/token support beyond GCS read-only
3. finish shared artifact/file runtime and internal URI contract
4. build long-running job status/polling substrate
5. build trigger scheduler/state/realtime substrate
6. decide whether runner/sandbox semantics are in scope for Track 1

### Then domain waves

**Wave 1: GCS family**

Reason:
- closest current implementation
- high reuse for artifact handling
- needed by other families like BigQuery export/load and some Vertex patterns

**Wave 2: BigQuery family**

Reason:
- highest leverage data-service family after GCS
- exercises load, export, metadata, and job patterns

**Wave 3: Firestore, Function, Monitoring query/push, Pub/Sub publish, Vertex inference**

Reason:
- mostly API-task shaped and useful for both tracks

**Wave 4: Dataform, Dataproc, GKE metadata, Pub/Sub consume, Vertex custom job**

Reason:
- these depend more heavily on worker/job semantics

**Wave 5: All trigger variants**

Reason:
- they require scheduler/state/realtime runtime, not just task translation

**Wave 6: `GCloudCLI`**

Reason:
- it is the least attractive first implementation because it depends on sandbox, namespace files, input files, output files, and execution isolation

---

## Objective Bottom Line

### What is available now

- a generic plugin execution substrate exists
- a normalized service/function registry exists
- a concrete GCS-to-Arango load path exists
- GCS list is the only directly implemented Kestra GCP task alias found in current `platform-api`
- Vertex auth helpers exist, but only as supporting code in edge functions

### What is missing now

- most of the 55 GCP functions as runnable handlers
- broad GCP auth scope handling
- long-running job substrate
- trigger substrate
- runner/file-injection substrate
- fully consistent user-bound execution context on plugin routes

### What this means

The correct framing is:

- **Track 1** is currently a partial compatibility substrate with one narrow GCS foothold
- **Track 2** is currently a partial normalized service model with one narrow GCS source path and no broad GCP family coverage

Neither track is currently end-to-end complete.

The best next step is not another abstract proposal. It is execution against this matrix, starting with shared substrate gaps and then the GCS and BigQuery domain families.

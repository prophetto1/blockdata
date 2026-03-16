# GCP End-to-End Requirements

**Date:** 2026-03-16  
**Purpose:** Define the exact runtime and platform requirements needed to make a copied Kestra GCP service family work end to end inside BlockData.  
**Method:** Source-verified against `E:/writing-system/docs/plugin-gcp/`, `E:/kestra/`, and `E:/writing-system/services/platform-api/`.

---

## Executive Summary

For GCP, "end to end" does not mean only:

- auth
- API request execution

It means BlockData must supply the runtime layers that Kestra GCP tasks assume already exist:

1. user-bound credential resolution
2. property rendering and typed task input handling
3. SDK / HTTP execution
4. artifact read / write support
5. temp working directory support
6. async job submission and polling
7. trigger scheduling and state
8. runner / CLI filesystem injection
9. output, logs, and metrics persistence

Without all of those, only a subset of the 55 `io.kestra.plugin.gcp.*` functions can work.

---

## What Source Shows

The copied GCP family is not one runtime shape.

- Simple runnable tasks exist:
  - `auth.OauthAccessToken`
  - many `firestore.*`
  - some `gcs.*`
  - `function.HttpFunction`
- File-backed tasks exist:
  - `gcs.Upload`
  - `bigquery.Query`
  - `bigquery.StorageWrite`
- Async job tasks exist:
  - `bigquery.Query`
  - `dataproc.batches.*`
  - `dataform.InvokeWorkflow`
  - `vertexai.CustomJob`
- Trigger tasks exist:
  - `bigquery.Trigger`
  - `gcs.Trigger`
  - `monitoring.Trigger`
  - `pubsub.Trigger`
  - `pubsub.RealtimeTrigger`
- CLI / runner tasks exist:
  - `cli.GCloudCLI`

This means "implement GCP" is really a stack of runtime capabilities, not one translation task.

---

## Requirement Layers

## 1. Identity and Credential Resolution

Required because GCP tasks render credential-related properties and then build Google credentials from them.

Source anchors:

- `E:/writing-system/docs/plugin-gcp/src/main/java/io/kestra/plugin/gcp/CredentialService.java`
- `E:/writing-system/docs/plugin-gcp/src/main/java/io/kestra/plugin/gcp/auth/OauthAccessToken.java`
- `E:/writing-system/docs/plugin-gcp/src/main/resources/doc/io.kestra.plugin.gcp.md`

BlockData must provide:

- user-bound execution context
- connection / secret lookup for the executing user
- support for inline `serviceAccount`
- support for `scopes`
- support for `impersonatedServiceAccount`
- default-project behavior
- safe secret and token output handling

What this unlocks:

- `auth.OauthAccessToken`
- all other GCP tasks, because they all depend on credential creation

Why this is not optional:

If the task context is not user-bound, connection-backed credentials resolve incorrectly. The current generic plugin execution path still needs that wiring fixed.

---

## 2. Property Rendering and Typed Input Evaluation

Required because the GCP plugin family heavily uses `runContext.render(...)` across strings, maps, lists, enums, booleans, durations, and nested objects.

Source anchors:

- `CredentialService.java`
- `bigquery/AbstractBigquery.java`
- `bigquery/AbstractDataset.java`
- `dataform/AbstractDataForm.java`
- `firestore/AbstractFirestore.java`
- `vertexai/models/**`

BlockData must provide:

- rendering for scalar values
- rendering for lists and maps
- enum coercion
- duration / numeric coercion
- nested object rendering
- stable validation errors when rendered data is invalid

What this unlocks:

- all GCP domains

Why this matters:

Even simple tasks like `OauthAccessToken` and `HttpFunction` are not correct without rendered scopes, project IDs, URLs, and structured bodies.

---

## 3. Service SDK / HTTP Execution Layer

Required because API-style tasks need actual service clients and result mapping.

Source anchors:

- `function/HttpFunction.java`
- `firestore/Get.java`
- `firestore/Set.java`
- `bigquery/TableMetadata.java`

BlockData must provide:

- service-specific client construction
- request execution with authenticated credentials
- typed response normalization
- structured error handling
- retry classification for transient vs terminal failures

What this unlocks:

- `firestore.*`
- `function.HttpFunction`
- metadata / CRUD portions of `gcs.*`
- metadata / CRUD portions of `bigquery.*`
- parts of `monitoring.*`
- parts of `vertexai.*`

This is the minimum layer most people mean when they say "API execution," but it is only one of several required layers.

---

## 4. Artifact Read / Write Contract

Required because several GCP tasks read from or write to Kestra internal storage rather than talking only to Google APIs.

Source anchors:

- `gcs/Upload.java`
- `bigquery/Query.java`
- `bigquery/StorageWrite.java`

Observed source behavior:

- `runContext.storage().getFile(from)`
- `runContext.storage().putFile(tempFile)`

BlockData must provide:

- artifact download from internal URIs
- artifact upload back to internal storage
- stable internal URI scheme
- streaming reads for larger files
- content-type and filename preservation where needed

What this unlocks:

- `gcs.Upload`
- `gcs.Download`
- `gcs.Downloads`
- `bigquery.Load`
- `bigquery.Query` when results are materialized to files
- `bigquery.StorageWrite`
- any task moving data between BD storage and GCP

Why this matters:

Without an artifact contract, the data-moving tasks are only partially implemented even if auth and API clients are correct.

---

## 5. Temp Working Directory and Local File Lifecycle

Required because some tasks create temporary local files before uploading or persisting outputs.

Source anchors:

- `bigquery/Query.java`
- `cli/GCloudCLI.java`

Observed source behavior:

- `runContext.workingDir().createTempFile(...)`

BlockData must provide:

- per-execution temp working directory
- temp file creation helpers
- cleanup after task completion
- safe handling of sensitive temp credential files

What this unlocks:

- `bigquery.Query`
- `cli.GCloudCLI`
- any future task that stages files locally before upload or response packaging

---

## 6. Async Job Lifecycle

Required because multiple GCP tasks are not single-call operations. They submit work, wait, poll, and then finalize.

Source anchors:

- `bigquery/Query.java`
- `dataproc/batches/AbstractBatch.java`
- `dataform/InvokeWorkflow.java`
- `vertexai/CustomJob.java`

BlockData must provide:

- job submission
- persisted job identifiers
- polling and status refresh
- timeout handling
- cancellation handling
- resume-safe execution state
- final output collection after completion

What this unlocks:

- `bigquery.Query`
- `dataproc.batches.*`
- `dataform.InvokeWorkflow`
- `vertexai.CustomJob`

Why this matters:

If this layer is absent, these tasks can be submitted but not managed reliably end to end.

---

## 7. Trigger Scheduler and Trigger State

Required because trigger classes are a separate runtime category, not ordinary runnable tasks.

Source anchors:

- `bigquery/Trigger.java`
- Kestra trigger interfaces in `E:/kestra/core/src/main/java/io/kestra/core/models/triggers/`

Observed source behavior:

- `bigquery.Trigger` implements `PollingTriggerInterface`
- the family also includes realtime and stateful trigger variants

BlockData must provide:

- polling scheduler
- realtime trigger ingestion path where applicable
- trigger state persistence
- watermarks / deduplication
- execution creation from trigger events
- trigger enable / disable lifecycle
- failure backoff

What this unlocks:

- `bigquery.Trigger`
- `gcs.Trigger`
- `monitoring.Trigger`
- `pubsub.Trigger`
- `pubsub.RealtimeTrigger`

Why this matters:

Without trigger runtime, trigger classes are only metadata, not functional services.

---

## 8. Runner / CLI Filesystem Support

Required because `gcloud` is not an API-only task. It is a command-runner task with file interfaces.

Source anchors:

- `cli/GCloudCLI.java`
- Kestra interfaces:
  - `NamespaceFilesInterface`
  - `InputFilesInterface`
  - `OutputFilesInterface`

Observed source behavior:

- inject namespace files
- inject input files
- collect output files
- create temp credential files
- build env vars

BlockData must provide:

- subprocess or container execution
- namespace file materialization
- input file materialization
- output file capture
- environment variable injection
- stdout / stderr capture
- temp credential-file handling

What this unlocks:

- `cli.GCloudCLI`

Why this matters:

This task belongs to the execution-runner layer, not the simple plugin layer.

---

## 9. Outputs, Logs, and Metrics

Required because the GCP tasks emit structured outputs and, in many cases, metrics.

Source anchors:

- `gcs/Upload.java`
- `bigquery/AbstractLoad.java`
- `bigquery/StorageWrite.java`
- plugin docs under `src/main/resources/doc/`

BlockData must provide:

- typed output serialization
- encrypted output handling when needed
- per-task logs
- metric recording
- artifact references inside outputs when outputs point to stored files

What this unlocks:

- correctness and observability across the full family

Why this matters:

A task that "runs" but cannot return stable outputs or record what happened is not truly end to end complete.

---

## Minimum Working Capability Sets

These are the smallest truthful bundles, by runtime shape.

### A. Simple API-backed GCP tasks

Required:

- identity and credential resolution
- property rendering and typed evaluation
- service SDK / HTTP execution
- outputs / logs / metrics

Examples:

- `auth.OauthAccessToken`
- `firestore.Get`
- `firestore.Set`
- `function.HttpFunction`
- some metadata-focused `gcs.*`

### B. Data-moving GCP tasks

Required:

- all of A
- artifact read / write contract
- temp working directory where applicable

Examples:

- `gcs.Upload`
- `gcs.Download`
- `bigquery.Load`
- `bigquery.StorageWrite`

### C. Async job tasks

Required:

- all of A
- async job lifecycle
- artifact layer if inputs or outputs are file-backed

Examples:

- `bigquery.Query`
- `dataproc.batches.*`
- `dataform.InvokeWorkflow`
- `vertexai.CustomJob`

### D. Trigger tasks

Required:

- all of A where trigger evaluation calls service APIs
- trigger scheduler and trigger state

Examples:

- `bigquery.Trigger`
- `gcs.Trigger`
- `monitoring.Trigger`
- `pubsub.Trigger`
- `pubsub.RealtimeTrigger`

### E. CLI runner tasks

Required:

- identity and credential resolution
- property rendering
- runner / CLI filesystem support
- artifact and temp-file support
- outputs / logs / metrics

Examples:

- `cli.GCloudCLI`

---

## Current Implication for BlockData

Based on current `platform-api` source, BlockData has only part of this stack today.

Present or partially present:

- plugin registry
- generic plugin execution route
- basic execution context
- upload support
- some script execution support
- narrow GCS and provider-adjacent pieces

Still required for real GCP end-to-end completeness:

- correct user-bound plugin execution context
- artifact download support
- working-directory / temp-file support
- broader typed render support
- async job control
- trigger runtime
- namespace/input/output file handling for CLI-style tasks
- broader metric/output parity

---

## Bottom Line

To make a copied Kestra GCP service family truly work end to end, we need more than auth and API execution.

We need the full runtime layers that the GCP tasks assume:

- credentials
- rendering
- service execution
- artifacts
- temp files
- async jobs
- triggers
- CLI runner support
- outputs/logs/metrics

That is the actual requirement model for GCP.

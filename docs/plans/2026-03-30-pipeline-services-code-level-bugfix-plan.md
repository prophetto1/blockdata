# Pipeline Services Code-Level Bugfix Plan

**Goal:** Fix the 10 code-level bugs that will cause pipeline jobs to fail even after the schema recovery migration (covered by the separate recovery plan) is applied. These are bugs in the Python service code itself — constraint violations, missing error handling, swallowed exceptions, fragile patterns, and credential resolution short-circuits.

**Architecture:** All fixes are in existing `services/platform-api` Python files. No new endpoints, no new tables, no frontend changes. The existing observability surface is preserved. Each fix is a targeted repair at a specific file and line range, verified by the existing test suite plus targeted new tests.

**Prerequisite:** The recovery plan (`2026-03-30-pipeline-services-operational-backend-recovery-plan.md`) must be applied first. This plan assumes the pipeline schema exists.

**Tech Stack:** FastAPI, Python, pytest

**Status:** Draft
**Author:** Jon
**Date:** 2026-03-30

---

## Pre-Implementation Contract

No major product, API, or architectural decision may be improvised during implementation. These are targeted code fixes at known locations. If a fix requires changing an endpoint contract or database schema, stop and revise this plan.

### Locked Product Decisions

1. No endpoint contracts change. Request/response shapes are preserved.
2. No new endpoints. No new tables. No new migrations.
3. No frontend changes.
4. The existing observability surface is preserved. One new structured log is added for cleanup failures.
5. Every fix has a test that reproduces the bug before fixing it.

---

## Manifest

### Platform API

No new endpoints. No contract changes.

**Modified route behavior:** `pipelines.py:create_pipeline_job` will return 409 on concurrent duplicate job instead of 500.

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Structured log | `pipeline.artifact.cleanup_failed` | `pipeline_storage.py:_cleanup_failed_artifact_upload` | Log cleanup failures instead of silently swallowing them |

### Database Migrations

No new migrations.

### Edge Functions

No edge functions.

### Frontend Surface Area

No frontend changes.

---

## Bug Inventory and Fixes

### Bug 1: `source_uid` NOT NULL violation on empty source set

**Location:** `pipelines.py:98`
**Symptom:** If a source set has no items, `source_uid` becomes None, violating the NOT NULL constraint on `pipeline_jobs.source_uid`.
**Fix:** Raise `ValueError("Source set has no items")` before the insert if `items` is empty. The existing `except ValueError` handler at line 321 will convert this to a 400.

---

### Bug 2: `doc_title` NOT NULL violation on source set creation

**Location:** `pipeline_source_sets.py:170`
**Symptom:** Source documents with null `doc_title` crash source-set item insertion.
**Fix:** Default `doc_title` to the filename portion of `source_locator` or `"Untitled"` when None.

---

### Bug 3: Unsupported embedding provider short-circuits instead of skipping

**Location:** `pipeline_embeddings.py:56-57`
**Symptom:** A non-openai/voyage provider in `model_role_assignments` throws `RuntimeError` instead of trying the next candidate. If a user has both a supported and unsupported provider configured, the unsupported one being first kills the entire resolution.
**Fix:** `continue` instead of `raise` for unsupported providers, log a warning.

---

### Bug 4: Heartbeat/stage-update crashes entire job on transient Supabase error

**Location:** `pipeline_jobs.py:104-110`
**Symptom:** Any Supabase error during heartbeat or set_stage call crashes the entire pipeline job. A 2-second network blip during a 5-minute processing run kills the job.
**Fix:** Wrap `_heartbeat()` and `_set_stage()` calls in try/except with a warning log. The job continues processing. If the final status update also fails, the reaper will catch it.

---

### Bug 5: Cleanup silently swallows all exceptions

**Location:** `pipeline_storage.py:275-283`
**Symptom:** `_cleanup_failed_artifact_upload` catches all exceptions with `pass`. Orphaned GCS blobs and reservation rows accumulate with zero logging.
**Fix:** Add `logger.warning("pipeline.artifact.cleanup_failed", ...)` inside each except block. Keep the `pass` (don't re-raise — cleanup must not mask the original error).

---

### Bug 6: Concurrent duplicate job creation returns generic 500

**Location:** `pipelines.py:418-420`
**Symptom:** Race condition between active-job check and insert. The DB unique index catches it but the error surfaces as a raw 500.
**Fix:** Catch the Supabase `APIError` for unique constraint violation in `_insert_pipeline_job` and raise `HTTPException(409, "A job is already active for this source set")`.

---

### Bug 7: `record_pipeline_job_complete` drops `deliverable_count`

**Location:** `pipeline_metrics.py:98`
**Symptom:** `del deliverable_count` — the parameter is accepted but explicitly discarded. Deliverable count is not recorded in any metric.
**Fix:** Add `deliverable_count` to the metric attributes dict.

---

### Bug 8: N+1 query in `list_source_sets`

**Location:** `pipeline_source_sets.py:109-119`
**Symptom:** `_load_latest_job_summary` is called once per source set in a loop.
**Fix:** Batch-load latest jobs for all source set IDs in one query, then join in Python. Use a CTE or subquery with `IN (...)`.

---

### Bug 9: New httpx.Client created per embedding batch

**Location:** `pipeline_embeddings.py:182-183`
**Symptom:** Each batch opens and closes a TCP connection. No connection pooling.
**Fix:** Accept an optional `httpx.Client` parameter. Create one at the top of `embed_pipeline_chunks` and reuse it across batches. Close after all batches complete.

---

### Bug 10: `_load_api_key_credential` doesn't catch decryption errors

**Location:** `pipeline_embeddings.py:126` → `crypto.py:71-105`
**Symptom:** If `APP_SECRET_ENVELOPE_KEY` is wrong or missing, `decrypt_with_fallback` throws `ValueError`. This propagates out of `resolve_embedding_selection`'s for loop unhandled, crashing the job with an opaque decryption error instead of trying the next credential candidate.
**Fix:** Wrap the decrypt call in `_load_api_key_credential` in a try/except that returns None on `ValueError`, allowing the resolution loop to continue to the next candidate.

---

## Locked File Inventory

### Modified files: `5`

| File | Bugs fixed |
|------|-----------|
| `services/platform-api/app/api/routes/pipelines.py` | Bug 1 (empty source set), Bug 6 (duplicate job 409) |
| `services/platform-api/app/services/pipeline_source_sets.py` | Bug 2 (doc_title null), Bug 8 (N+1 query) |
| `services/platform-api/app/services/pipeline_embeddings.py` | Bug 3 (unsupported provider), Bug 9 (httpx pooling), Bug 10 (decrypt error) |
| `services/platform-api/app/workers/pipeline_jobs.py` | Bug 4 (heartbeat resilience) |
| `services/platform-api/app/services/pipeline_storage.py` | Bug 5 (cleanup logging) |
| `services/platform-api/app/observability/pipeline_metrics.py` | Bug 7 (deliverable_count) |

### New test file: `1`

| File | Purpose |
|------|---------|
| `services/platform-api/tests/test_pipeline_bugfixes.py` | Targeted regression tests for each bug |

---

## Tasks

### Task 1: Bug 1 — Empty source set guard

**File(s):** `services/platform-api/app/api/routes/pipelines.py`

**Step 1:** In `_insert_pipeline_job`, before line 98, add:
```python
if not source_set.get("items"):
    raise ValueError("Source set has no items — cannot create a job for an empty source set")
```

**Step 2:** Write a test in `test_pipeline_bugfixes.py` that calls `create_pipeline_job` with a source set that has empty items and asserts 400.

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_bugfixes.py -v -k empty_source_set`

**Commit:** `fix: reject job creation for empty source sets`

---

### Task 2: Bug 2 — doc_title null fallback

**File(s):** `services/platform-api/app/services/pipeline_source_sets.py`

**Step 1:** In `create_source_set`, at line 170 where `doc_title` is read from the source, default to `"Untitled"`:
```python
"doc_title": source.get("doc_title") or "Untitled",
```

**Step 2:** Write a test that creates a source set with a source whose `doc_title` is None and asserts success.

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_bugfixes.py -v -k null_doc_title`

**Commit:** `fix: default doc_title to Untitled when null`

---

### Task 3: Bug 3 — Skip unsupported embedding providers

**File(s):** `services/platform-api/app/services/pipeline_embeddings.py`

**Step 1:** At lines 56-57, replace `raise RuntimeError(...)` with:
```python
logger.warning("Skipping unsupported embedding provider: %s", provider)
continue
```

**Step 2:** Write a test with a mock `model_role_assignments` containing an unsupported provider followed by a supported one. Assert the supported one is selected.

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_bugfixes.py -v -k unsupported_provider`

**Commit:** `fix: skip unsupported embedding providers instead of throwing`

---

### Task 4: Bug 4 — Heartbeat resilience

**File(s):** `services/platform-api/app/workers/pipeline_jobs.py`

**Step 1:** Wrap the `_heartbeat()` call at line 104-105 in try/except:
```python
try:
    _heartbeat(supabase_admin, job_id)
except Exception:
    logger.warning("Heartbeat failed for job %s, continuing", job_id)
```

**Step 2:** Same for `_set_stage()` at lines 107-110.

**Step 3:** Write a test that monkeypatches `_update_pipeline_job_sync` to throw on heartbeat calls but asserts the job still completes.

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_bugfixes.py -v -k heartbeat`

**Commit:** `fix: make pipeline heartbeat and stage-set resilient to transient errors`

---

### Task 5: Bug 5 — Log cleanup failures

**File(s):** `services/platform-api/app/services/pipeline_storage.py`

**Step 1:** In `_cleanup_failed_artifact_upload`, replace each `except Exception: pass` with:
```python
except Exception:
    logger.warning("pipeline.artifact.cleanup_failed", extra={"step": "cancel_reservation"})
```
(Use appropriate step names for each block.)

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_bugfixes.py -v -k cleanup_logging`

**Commit:** `fix: log pipeline artifact cleanup failures`

---

### Task 6: Bug 6 — Duplicate job returns 409

**File(s):** `services/platform-api/app/api/routes/pipelines.py`

**Step 1:** In `_insert_pipeline_job`, wrap the Supabase insert in try/except. Catch `APIError` where the message contains `ux_pipeline_jobs_active_source_set_kind` or `duplicate key` and raise `HTTPException(409, "A job is already active for this source set")`.

**Step 2:** Write a test that triggers the unique constraint and asserts 409.

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_bugfixes.py -v -k duplicate_job`

**Commit:** `fix: return 409 for duplicate active pipeline job`

---

### Task 7: Bug 7 — Record deliverable_count in metrics

**File(s):** `services/platform-api/app/observability/pipeline_metrics.py`

**Step 1:** At line 98, remove `del deliverable_count`. Add `"deliverable_count": deliverable_count` to the attrs dict.

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_bugfixes.py -v -k deliverable_count_metric`

**Commit:** `fix: record deliverable_count in pipeline job complete metric`

---

### Task 8: Bug 8 — Batch latest-job query

**File(s):** `services/platform-api/app/services/pipeline_source_sets.py`

**Step 1:** Replace the N+1 loop in `list_source_sets` (lines 109-119) with a single query that fetches the latest job for all source set IDs at once using an IN clause and a window function or subquery.

**Step 2:** Join the results in Python by source_set_id.

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_source_sets_routes.py -v`

**Commit:** `fix: batch latest-job lookup in list_source_sets`

---

### Task 9: Bug 9 — Reuse httpx.Client across embedding batches

**File(s):** `services/platform-api/app/services/pipeline_embeddings.py`

**Step 1:** In `embed_pipeline_chunks`, create one `httpx.Client(timeout=30.0)` before the batch loop. Pass it to `_embed_batch_with_retry` and `_request_embedding_batch`. Close it after all batches.

**Step 2:** Update `_request_embedding_batch` to accept an `httpx.Client` parameter instead of creating one per call.

**Test command:** `cd services/platform-api && python -m pytest tests/test_markdown_index_builder_pipeline.py -v`

**Commit:** `fix: reuse httpx client across embedding batches`

---

### Task 10: Bug 10 — Catch decryption errors in credential resolution

**File(s):** `services/platform-api/app/services/pipeline_embeddings.py`

**Step 1:** In `_load_api_key_credential`, wrap the `decrypt_with_fallback` call (line 126) in try/except ValueError:
```python
try:
    decrypted = decrypt_with_fallback(str(item["api_key_encrypted"]), USER_API_KEYS_CONTEXT)
except ValueError:
    logger.warning("Failed to decrypt API key for provider %s, skipping", provider)
    return None
```

**Step 2:** Write a test that monkeypatches `decrypt_with_fallback` to throw ValueError and asserts the resolution continues to the next candidate.

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline_bugfixes.py -v -k decrypt_error`

**Commit:** `fix: catch decryption errors in embedding credential resolution`

---

### Task 11: Run full pipeline test suite

**Test command:** `cd services/platform-api && python -m pytest tests/test_pipeline*.py tests/test_markdown_index_builder_pipeline.py -v`

**Expected output:** All tests pass.

**Commit:** No commit — verification only.

---

## Explicit Risks Accepted

1. Bug 4 (heartbeat resilience) means a job could complete successfully but the database might show stale stage/heartbeat data. The reaper timeout (15 minutes) is long enough that this is unlikely to cause false reaping.
2. Bug 8 (batch query) changes the query pattern but not the response shape. If the window function behaves differently on Supabase's Postgres version, the test will catch it.
3. Bug 9 (httpx pooling) means if a batch fails and the client is in a bad state, subsequent batches might also fail. The retry logic at the batch level should handle this.

## Completion Criteria

1. All 10 bugs have targeted fixes with regression tests.
2. No existing tests are broken.
3. The pipeline can run end-to-end without crashing at heartbeat, embedding resolution, or artifact storage steps (assuming schema, credentials, and GCS are configured).
4. Error messages are specific and actionable, not generic 500s or opaque tracebacks.
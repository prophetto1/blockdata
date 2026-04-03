# Storage Surface Separation — Status Report

**Date:** 2026-04-02
**Author:** jon
**Audience:** Engineering team

## Summary

Files uploaded through Assets and Pipeline Services (Index Builder) are not properly isolated. A markdown file uploaded via the Assets page appeared inside the Index Builder's available sources list. The root cause is a data model collision: `source_documents` uses `source_uid` (a content-addressed SHA-256 hash) as its primary identity key, which means the same file content uploaded through two different surfaces overwrites the same row. GCS object storage is correctly separated by directory, but the metadata layer collapses them.

This report describes the current state across all layers.

---

## 1. GCS Object Storage Layer — Working as Designed

The `build_object_key()` function in `services/platform-api/app/api/routes/storage.py` (line 57) generates distinct directory structures per surface:

| Surface | Object key pattern | Example |
|---------|-------------------|---------|
| Assets | `users/{user_id}/assets/projects/{project_id}/sources/{source_uid}/source/{filename}` | `users/ae4c.../assets/projects/b42372da.../sources/5899.../source/braintrust.md` |
| Pipeline Services | `users/{user_id}/pipeline-services/{service_slug}/projects/{project_id}/sources/{source_uid}/source/{filename}` | `users/ae4c.../pipeline-services/index-builder/projects/8e15a6ef.../sources/5899.../source/braintrust.md` |

The GCS bucket contains two separate copies of the file in two separate directory trees. The `storage_objects` table correctly has two rows with distinct `object_key` values. **This layer is correct.**

## 2. source_documents Table — Single-Row Collision

`source_documents` uses `source_uid` as its unique conflict key. The bridge function `upsert_source_document_for_storage_object()` in `services/platform-api/app/services/storage_source_documents.py` (line 29) calls:

```python
supabase_admin.table("source_documents").upsert(payload, on_conflict="source_uid").execute()
```

When the same file (same content = same SHA-256 hash = same `source_uid`) is uploaded through Assets and then through Index Builder:

1. **Assets upload completes** — `source_documents` row created with:
   - `project_id` = Assets project (`b42372da...`)
   - `source_locator` = Assets GCS path
2. **Index Builder upload completes** — same `source_uid` triggers UPSERT, which **overwrites**:
   - `project_id` = could be reassigned to the Index Builder project
   - `source_locator` = could be overwritten to the pipeline-services GCS path
   - All other metadata (doc_title, status, etc.) is also overwritten

**The last writer wins.** There is only ever one `source_documents` row per content hash.

### Observed state for `braintrust.md`

| Layer | Count | Details |
|-------|-------|---------|
| `storage_objects` rows | 2 | One `assets` path, one `pipeline-services` path |
| `source_documents` rows | 1 | Currently points to the Assets project (`b42372da`) with the Assets locator |

The row currently points to Assets because Assets was the last to write (or the upsert happened to preserve it). If the Index Builder had completed its upload second, the row would point to the Index Builder's project instead.

## 3. Frontend Query Layer — No Surface Filtering

### Assets page

`useProjectDocuments` hook (`web/src/hooks/useProjectDocuments.ts` line 19) queries:

```typescript
fetchAllProjectDocuments({ projectId, select: '*' })
```

This queries `source_documents` filtered by `project_id`. It sees all documents belonging to the selected project regardless of which surface uploaded them.

### Index Builder page

The Index Builder's available sources list queries via `GET /pipelines/{kind}/sources` which calls `_query_project_sources()` in `services/platform-api/app/api/routes/pipelines.py` (line 226):

```python
admin.table("source_documents")
  .select("source_uid, project_id, doc_title, ...")
  .eq("owner_id", owner_id)
  .eq("project_id", project_id)
```

Same pattern — filters by `project_id` only. It does post-process to detect origin:

```python
object_key = str(row.get("object_key") or row.get("source_locator") or "")
source_origin = "pipeline-services" if "/pipeline-services/" in object_key else "assets"
```

But this is informational metadata, not a filter. Both surfaces see all documents in the selected project.

### Consequence

If both surfaces use the same `project_id`, files from one surface appear in the other. Even with different `project_id` values, the `source_uid` upsert collision means a file uploaded via Assets can have its metadata overwritten when the same content is uploaded via Index Builder (or vice versa).

## 4. source_uid Identity Model — Content-Addressed, Not Surface-Scoped

Every upload path computes `source_uid` the same way:

```
source_uid = SHA-256(source_type + "\n" + file_bytes)
```

This is consistent across:
- Assets upload (`web/src/lib/storageUploadService.ts` line 122)
- Pipeline Services upload (`web/src/lib/pipelineService.ts` — reuses `prepareSourceUpload`)
- Ingest edge function (`supabase/functions/ingest/index.ts` line 46)
- Google Drive import (`supabase/functions/google-drive-import/index.ts` line 182)
- Dropbox import (`supabase/functions/dropbox-import/index.ts` line 115)

The hash does not include `project_id`, `storage_surface`, or `service_slug`. Same file content always produces the same `source_uid` regardless of where it was uploaded.

## 5. All Write Paths to source_documents

| Path | Location | Operation | Conflict key | Surface-aware? |
|------|----------|-----------|-------------|----------------|
| Assets upload bridge | `storage_source_documents.py:29` | UPSERT | `source_uid` | No |
| Ingest upload-only | `supabase/functions/ingest/process-upload-only.ts` | INSERT (idempotency check) | `source_uid` | No |
| Ingest conversion | `supabase/functions/ingest/process-convert.ts` | INSERT (idempotency check) | `source_uid` | No |
| Google Drive import | `supabase/functions/google-drive-import/index.ts` | INSERT or UPDATE | `source_uid` | No |
| Dropbox import | `supabase/functions/dropbox-import/index.ts` | INSERT or UPDATE | `source_uid` | No |
| Conversion callback | `supabase/functions/conversion-complete/index.ts` | UPDATE (status only) | `source_uid` | No |
| Tree-sitter parse | `services/platform-api/app/api/routes/parse.py` | UPDATE (status only) | `source_uid` | No |

**No write path is surface-aware.** Every path treats `source_uid` as the global document identity.

## 6. What the Previous Agreement Was

The directory-based separation at the GCS object layer was implemented as agreed — `assets/` vs `pipeline-services/{slug}/` paths. The `storage_surface` and `storage_service_slug` parameters exist in the upload request contract and are used by `build_object_key()`.

What was NOT implemented: propagating that surface separation into the `source_documents` metadata layer. The bridge function writes `source_locator = object_key` (which contains the surface path), but the upsert conflict on `source_uid` means only one surface's metadata survives.

## 7. Downstream Effects

### Preview/download broken for GCS files (separate issue, plan exists)

`resolveSignedUrlForLocators` in `web/src/lib/projectDetailHelpers.ts` only knows about Supabase Storage. GCS-uploaded files show "Preview unavailable: Object not found". A separate plan exists for this: `docs/plans/2026-04-02-gcs-download-url-and-preview-resolver-migration-plan.md`.

### Storage quota accounting is correct

`storage_objects` tracks bytes per object. Each surface upload creates its own `storage_objects` row with its own `byte_size`. The quota system (`used_bytes`, `reserved_bytes`) is computed from `storage_objects`, not `source_documents`. Uploading the same file through both surfaces correctly counts the storage twice (two GCS objects = two allocations).

### Orphaned GCS objects

If a file is uploaded via Assets (creating `storage_objects` row A and `source_documents` row), then uploaded via Index Builder (creating `storage_objects` row B and overwriting `source_documents`), the `source_documents.source_locator` now points to the Index Builder's GCS path. The Assets GCS object (row A) is still active in `storage_objects` and still counts against quota, but the `source_documents` row no longer references it. Deleting the document through the UI would not clean up the orphaned GCS object.

## 8. Options for Resolution

These are not recommendations — they are the structural options the team should evaluate.

### Option A: Make source_uid surface-scoped

Change the identity model so `source_uid` includes the surface context:
```
source_uid = SHA-256(surface + ":" + source_type + "\n" + file_bytes)
```

**Impact:** Breaks content deduplication. Same file uploaded twice creates two `source_documents` rows. Every upstream consumer of `source_uid` (conversion callbacks, parse routes, imports) would need updating. Large blast radius.

### Option B: Add a composite key to source_documents

Change the unique constraint from `(source_uid)` to `(source_uid, project_id)` or `(source_uid, storage_surface)`.

**Impact:** Allows the same content to exist as separate documents in different projects/surfaces. The bridge function and all write paths need updating. Conversion callbacks that update by `source_uid` alone would need scoping. Moderate blast radius.

### Option C: Stop bridging pipeline uploads into source_documents

Only write to `source_documents` for Assets uploads. Pipeline Services operates entirely through `storage_objects` + `pipeline_source_sets` without touching `source_documents`.

**Impact:** Cleanest separation. Index Builder already has its own data model (`pipeline_source_sets`, `pipeline_source_set_items`). Requires the Index Builder query path to read from `storage_objects` instead of `source_documents`. The "available sources" list for Index Builder would need a different data source. Moderate blast radius but localized to pipeline code.

### Option D: Filter by source_locator prefix at query time

Keep the current data model but add surface filtering when querying. Assets queries filter for `source_locator LIKE 'users/%/assets/%'`, Index Builder filters for `source_locator LIKE 'users/%/pipeline-services/%'`.

**Impact:** Smallest immediate change. Does not fix the upsert collision (last writer still wins). Masks the symptom without fixing the root cause. The `source_documents` row still flips between surfaces on each upload.

---

## 9. Current File References

| File | Role |
|------|------|
| `services/platform-api/app/api/routes/storage.py` | Upload reserve, complete, object key generation |
| `services/platform-api/app/services/storage_source_documents.py` | Bridge: storage_objects → source_documents |
| `services/platform-api/app/api/routes/pipelines.py` | Index Builder source list query |
| `web/src/lib/storageUploadService.ts` | Frontend source_uid computation + Assets upload |
| `web/src/lib/pipelineService.ts` | Frontend pipeline upload (sets storage_surface) |
| `web/src/hooks/useProjectDocuments.ts` | Assets document query |
| `web/src/hooks/useIndexBuilderJob.ts` | Index Builder upload handler |
| `supabase/migrations/20260319190000_102_user_storage_quota.sql` | storage_objects + storage_quotas schema |

## 10. Questions for the Team

1. Should the same file content uploaded through two different surfaces be treated as one document or two?
2. If two, which option (A/B/C/D) best fits the product direction?
3. Should Index Builder operate on its own data model (Option C) or continue sharing `source_documents`?
4. Is there a near-term need for cross-surface deduplication (e.g., "this file already exists in Assets, reuse it in Index Builder without re-uploading")?
# Storage Namespace and GCS Policy Runbook

This runbook covers the operational steps required by the storage namespace correction plan for direct browser uploads and signed GCS downloads.

## Scope

- Bucket: the configured `GCS_USER_STORAGE_BUCKET`
- Artifact: [ops/gcs/user-storage-cors.json](/E:/writing-system/ops/gcs/user-storage-cors.json)
- Minimum dev origins already checked in:
  - `http://127.0.0.1:5374`
  - `http://localhost:5374`
  - `http://127.0.0.1:5375`
  - `http://localhost:5375`

## Before Applying

1. Verify the exact deployed app origins that need browser upload and signed-download access.
2. Add those exact origins to [user-storage-cors.json](/E:/writing-system/ops/gcs/user-storage-cors.json).
3. Do not use wildcard origins in this batch.

## Apply Commands

```bash
gcloud storage buckets update gs://YOUR_BUCKET --cors-file=ops/gcs/user-storage-cors.json
gcloud storage buckets describe gs://YOUR_BUCKET --format="default(cors_config)"
```

## Required Policy Shape

- Methods: `PUT`, `GET`, `HEAD`, `OPTIONS`
- Response headers:
  - `Content-Type`
  - `Content-Disposition`
  - `ETag`
  - `x-goog-resumable`

## Verification

1. Start the web app on `5374` or `5375`.
2. Upload a file through the Assets uploader.
3. Confirm the browser no longer shows raw `Failed to fetch`.
4. Confirm the file finalizes successfully and appears in Assets.
5. Open preview and download for a `users/` locator and confirm both succeed.

## Failure Interpretation

- `Failed to fetch` during the signed `PUT` usually means the bucket CORS policy does not allow the current app origin.
- A platform-api 404 from `/storage/download-url` means the locator lacks an active owned `storage_objects` row.
- A successful upload with missing preview/download usually indicates locator coverage drift, not bucket CORS.

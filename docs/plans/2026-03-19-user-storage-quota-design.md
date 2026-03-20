# User Storage Quota Design

**Date:** 2026-03-19

**Status:** Approved preliminary design

## Goal

Give every newly registered user a default `50 GB` storage entitlement backed by Google Cloud Storage, with FastAPI acting as the storage control plane and Supabase/Postgres storing quota, reservation, and object metadata.

## Scope

This design covers the backend architecture for:

- provisioning a default quota on signup
- reserving quota before upload
- issuing signed GCS upload targets
- finalizing or cancelling uploads
- rejecting oversize uploads and over-quota users
- storing stable object keys and metadata for later retrieval

This design does not yet cover:

- billing and paid plan upgrades
- organization/workspace-level quotas
- resumable uploads
- ArangoDB projections for storage metadata
- full frontend migration away from the current Supabase ingest path

## Decisions

### Storage provider

Use `Google Cloud Storage`.

Why:

- the repo already leans on GCP and includes GCS integration code in [gcs.py](/home/jon/dev-projects/blockdata/services/platform-api/app/plugins/gcs.py)
- the current platform stores locators, not large blobs, in tables such as `source_documents`
- GCS pricing and signed URL support make it a good fit for bounded per-user storage

Reference material used for the decision:

- https://cloud.google.com/storage/pricing
- https://docs.cloud.google.com/storage/docs/access-control/signed-urls
- https://docs.cloud.google.com/storage/docs/objects
- https://docs.cloud.google.com/storage/docs/request-rate
- https://aws.amazon.com/s3/pricing/
- https://www.oracle.com/cloud/storage/pricing/

### Control plane

Use `FastAPI` as the runtime storage control plane.

Responsibilities:

- authenticated user quota lookups
- reservation creation before upload
- signed upload URL generation
- upload completion and cancellation
- object metadata recording

Supabase migrations remain responsible for schema creation, helper RPCs, and signup-trigger provisioning.

### Data ownership

- `GCS` is the source of truth for stored bytes
- `Supabase/Postgres` is the source of truth for entitlement, usage counters, reservations, and object metadata
- existing tables such as `source_documents` may continue to store domain-level locators, but quota accounting should rely on dedicated storage tables

## Bucket layout

Use one private bucket per environment, not one bucket per user.

Examples:

- `gs://blockdata-user-content-dev`
- `gs://blockdata-user-content-prod`

Use ID-based prefixes instead of email addresses or human names.

Recommended object key format:

```text
users/{user_id}/projects/{project_id}/sources/{source_uid}/original/{filename}
users/{user_id}/projects/{project_id}/sources/{source_uid}/converted/{artifact_name}
users/{user_id}/projects/{project_id}/sources/{source_uid}/parsed/{artifact_name}
users/{user_id}/projects/{project_id}/exports/{export_id}/{filename}
users/{user_id}/temp/{upload_id}/{filename}
```

Why this shape:

- quota owner is obvious from the path
- project grouping stays readable
- `source_uid` and `upload_id` avoid filename collisions
- the layout fits current locator patterns such as `source_locator` and `conv_locator`

## Database model

Create three storage tables.

### `public.storage_quotas`

One row per user.

Suggested columns:

- `user_id uuid primary key references auth.users(id)`
- `quota_bytes bigint not null default 53687091200`
- `used_bytes bigint not null default 0`
- `reserved_bytes bigint not null default 0`
- `plan_code text not null default 'free'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `public.storage_objects`

One row per stored object that counts toward quota.

Suggested columns:

- `storage_object_id uuid primary key default gen_random_uuid()`
- `owner_user_id uuid not null references auth.users(id)`
- `project_id uuid null references public.user_projects(project_id)`
- `bucket text not null`
- `object_key text not null`
- `byte_size bigint not null`
- `content_type text not null`
- `storage_kind text not null`
- `source_uid text null`
- `checksum_sha256 text null`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`

Unique index:

- `(bucket, object_key)`

### `public.storage_upload_reservations`

One row per upload that has reserved quota but is not yet finalized.

Suggested columns:

- `reservation_id uuid primary key default gen_random_uuid()`
- `owner_user_id uuid not null references auth.users(id)`
- `project_id uuid null references public.user_projects(project_id)`
- `bucket text not null`
- `object_key text not null`
- `requested_bytes bigint not null`
- `content_type text not null`
- `original_filename text not null`
- `status text not null default 'pending'`
- `expires_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `completed_at timestamptz null`

## Quota accounting model

Use the standard materialized-counter plus reservation pattern.

Meaning:

- `used_bytes` tracks finalized stored bytes
- `reserved_bytes` tracks in-flight uploads
- new uploads are only allowed when:

```text
used_bytes + reserved_bytes + incoming_bytes <= quota_bytes
```

This prevents race conditions when a user starts multiple uploads at once.

## RPC and transaction model

Quota mutations should be atomic in Postgres, not assembled from multiple Python updates.

Create Postgres helper functions that FastAPI calls through the Supabase admin client:

- `reserve_user_storage(...)`
- `complete_user_storage_upload(...)`
- `cancel_user_storage_reservation(...)`
- `reconcile_user_storage_usage(...)`

This keeps quota checks and counter updates transactional.

## Provisioning model

Extend the existing signup trigger function `public.handle_new_user_profile()` so that a new user also gets a `storage_quotas` row.

Provisioned default:

- `quota_bytes = 53687091200`
- `used_bytes = 0`
- `reserved_bytes = 0`
- `plan_code = 'free'`

Also include a backfill for existing users.

## FastAPI API surface

Add a new storage router in `services/platform-api`.

Suggested endpoints:

- `GET /storage/quota`
- `POST /storage/uploads`
- `POST /storage/uploads/{reservation_id}/complete`
- `DELETE /storage/uploads/{reservation_id}`

### `GET /storage/quota`

Returns current entitlement and usage for the authenticated user.

### `POST /storage/uploads`

Input:

- `project_id`
- `filename`
- `content_type`
- `expected_bytes`
- optional `storage_kind`
- optional `source_uid`

Behavior:

- validate per-file max
- atomically reserve quota
- generate signed GCS upload URL
- return reservation metadata plus object key

### `POST /storage/uploads/{reservation_id}/complete`

Input:

- optional `actual_bytes`
- optional checksum metadata

Behavior:

- verify the reservation belongs to the caller
- finalize quota usage
- insert `storage_objects` row
- mark reservation complete

### `DELETE /storage/uploads/{reservation_id}`

Behavior:

- cancel a pending reservation
- release reserved bytes

## Large upload policy

Phase 1 should enforce both:

- total user quota: `50 GB`
- per-file ceiling: configurable environment variable, default `1 GB`

The per-file ceiling is a product guardrail, not a storage-provider limit.

## Error handling

Return clear application errors for:

- missing auth
- invalid project ownership
- quota exceeded
- file too large
- expired reservation
- duplicate completion
- GCS signing failure
- GCS upload missing at completion time

Reservations should be cancellable manually and releasable by a cleanup job for expired uploads.

## Integration with current code

The current browser upload flows still point at the Supabase edge ingest function in:

- [useDirectUpload.ts](/home/jon/dev-projects/blockdata/web/src/hooks/useDirectUpload.ts)
- [useUppyTransport.ts](/home/jon/dev-projects/blockdata/web/src/components/documents/useUppyTransport.ts)
- [supabase/functions/ingest/index.ts](/home/jon/dev-projects/blockdata/supabase/functions/ingest/index.ts)

The first implementation phase can build the FastAPI control plane without immediately switching the UI. A later phase can migrate the upload clients to the new endpoints.

## Testing strategy

Test at three layers:

- migration and RPC behavior
- FastAPI route behavior with mocked GCS signing and mocked Supabase admin RPCs
- end-to-end quota edge cases such as double reservation and over-quota attempts

## Follow-up work

Likely follow-ups after phase 1:

- paid plan overrides
- workspace or org quota owners
- resumable uploads
- automated reconciliation jobs
- frontend migration away from the current Supabase ingest path

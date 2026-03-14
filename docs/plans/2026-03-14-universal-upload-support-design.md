# Universal Upload Support Design

## Goal

Accept any authenticated file upload without format-based rejection, while keeping parsing, preview, extraction, and downstream processing explicitly format-dependent.

The core rule is simple:

- upload admission is type-agnostic
- downstream processing is capability-gated

That split is not fully formalized in the current repo yet.

## Why This Needs a Design Pass

The current codebase is partway toward this model, but still mixes concerns:

- the UI already presents upload as “Any file format” in the Assets and Parse upload surfaces
- `ingest` already falls back to `upload_only` when no parse route exists
- `google-drive-import` explicitly comments that uploads should be accepted regardless of parse support
- the runtime policy still exposes `upload.allowed_extensions`, which semantically reads like an admission gate
- parser capability, parser artifacts, and upload policy all still live under the same `upload.*` namespace
- upload identity, file classification, storage path, and parse routing are still coupled more tightly than they should be

If the product goal is truly “all file types can be uploaded,” the system needs a clean ingest architecture, not just a wider extension list.

## Current-State Findings

### 1. Upload admission and parse capability are still conceptually coupled

`supabase/functions/upload-policy/index.ts` returns `upload.allowed_extensions`, even though the current upload UIs do not use that field to reject files. In practice, the product already behaves closer to unrestricted upload than the policy contract suggests.

That mismatch is dangerous because it encourages future code to reintroduce extension-based upload rejection in the wrong layer.

### 2. The `ingest` edge function is still a synchronous byte-ingest path

`supabase/functions/ingest/index.ts` reads the entire uploaded file into memory with `await file.arrayBuffer()`, computes a hash, uploads the bytes to storage, then inserts the row.

That is acceptable for small files. It is not a robust backend design for “all file types,” because arbitrary uploads imply larger files, archives, media, binaries, and unpredictable upload durations.

If the data plane remains “browser -> edge function -> memory buffer -> storage,” upload support will be limited by edge memory, timeout, and body-size ceilings no matter how permissive the file-type policy becomes.

### 3. Upload identity is coupled to file classification

The current `source_uid` is derived from `sha256(source_type + "\n" + fileBytes)`.

That creates two design problems:

1. The same raw bytes can produce different IDs if classification logic changes.
2. Two different owners cannot upload identical bytes because `source_uid` is globally unique and ownership is checked after the fact.

That is not a sound long-term model for universal file storage.

### 4. `source_type` is overloaded

Right now `source_type` is doing too much at once:

- it helps determine content hashing
- it helps determine storage MIME
- it is the parse-routing key
- it is also a user-visible file classification

Those concerns should not share one field.

### 5. Local upload and remote import duplicate ingest logic

`supabase/functions/google-drive-import/index.ts` repeats hashing, storage upload, idempotency handling, route resolution, and processing decisions that also exist in `supabase/functions/ingest/index.ts`.

That is exactly the kind of drift that turns format support into ad hoc behavior.

### 6. Arbitrary upload has security implications the current model does not fully express

If the platform accepts any file type, then “store it” and “render it inline” cannot be treated as the same decision.

For example:

- HTML and SVG are upload-safe only if preview and download semantics are controlled carefully
- executable or script-bearing files should default to attachment-only download
- malware scanning and quarantine policy become format-agnostic admission controls

The absence of file-type restrictions does not mean the absence of safety controls.

## Design Principles

### Principle 1: Separate upload from processing

Upload means:

- authenticate user
- authorize project ownership
- accept bytes
- persist object
- record metadata

Processing means:

- classify for parse/extract/preview capability
- queue parse or extract only if explicitly requested and supported
- persist derived artifacts separately

### Principle 2: Separate physical blobs from logical documents

The system should model:

- a physical blob
- one or more logical document rows that reference that blob

This lets the platform support dedupe, ownership, project association, renames, reclassification, and retries without making raw byte identity and user document identity the same thing.

### Principle 3: Separate admission policy from capability policy

Upload policy answers:

- can this user upload now
- how many files
- how large
- from which sources
- must the file be scanned or quarantined first

Capability policy answers:

- can this file be previewed
- can this file be parsed
- which parser track handles it
- which artifacts can be produced

These are different systems and should be named as such.

### Principle 4: Fail closed on execution, not on storage

If a file cannot be parsed, that is not an upload failure. It is a processing capability result.

The platform should store the file successfully, then expose:

- `parse_supported = false`
- `preview_supported = false`
- `extract_supported = false`

instead of rejecting the upload itself.

## Recommended Architecture

## 1. Two-plane upload flow

Use a control plane plus data plane:

1. Client requests an upload session.
2. Backend returns a storage target plus upload constraints.
3. Client uploads bytes directly to object storage.
4. Client calls a finalize endpoint.
5. Finalize records metadata, classifies the file, and optionally queues post-upload work.

Recommended control-plane endpoints:

- `POST /upload-sessions`
- `POST /uploads/finalize`
- `GET /capabilities/files`

Recommended data plane:

- direct signed upload to Supabase Storage or equivalent resumable/multipart path

This is the correct backend direction if “all file types” includes large or long-running uploads.

## 2. Introduce a blob/document split

Recommended persistence model:

### `stored_blobs`

- `blob_uid` = hash of raw bytes only
- `storage_bucket`
- `storage_key`
- `byte_size`
- `content_hash`
- `mime_detected`
- `created_at`

### `source_documents`

- `source_uid` = stable logical document ID, preferably UUID
- `owner_id`
- `project_id`
- `blob_uid`
- `original_filename`
- `original_extension`
- `client_mime`
- `source_type`
- `upload_status`
- `parse_status`
- `preview_status`
- `security_status`
- `doc_title`
- timestamps

This removes the current coupling between user ownership, parser classification, and blob identity.

If the team wants to postpone blob dedupe, the minimum acceptable compromise is:

- keep `source_uid` independent from `source_type`
- hash raw bytes only for dedupe checks
- do not use a global content hash as the primary user-document key

## 3. Split metadata fields by concern

Replace the overloaded `source_type` model with clearer fields:

- `original_extension`: what the filename says
- `client_mime`: what the browser or remote source reported
- `detected_mime`: what the backend or scanner detected
- `file_kind`: coarse family such as `document`, `image`, `audio`, `video`, `archive`, `binary`
- `parse_source_type`: normalized parser-facing type such as `docx`, `pdf`, `html`, `markdown`, nullable when unsupported

Then use:

- `file_kind` for generic UI and storage handling
- `parse_source_type` for routing into parse or extract systems

That gives the backend a stable place to normalize formats without distorting upload identity.

## 4. Split statuses by lifecycle

The current single `status` field is doing too much.

Recommended status split:

- `upload_status`: `pending | stored | failed | quarantined | rejected`
- `parse_status`: `not_requested | unsupported | queued | processing | parsed | failed`
- `preview_status`: `unknown | available | unavailable`
- `security_status`: `pending_scan | clean | blocked | failed_scan`

This matters because “stored but not parseable” is a healthy outcome, not an error.

## 5. Rename and restructure runtime policy

The current runtime policy should be decomposed.

Recommended namespaces:

- `ingest.admission.max_files_per_batch`
- `ingest.admission.max_file_size_bytes`
- `ingest.admission.remote_sources_enabled`
- `ingest.admission.scan_required`
- `parse.routing.extension_track_map`
- `parse.routing.mime_track_map`
- `parse.capabilities.track_catalog`
- `parse.artifacts.by_track`
- `preview.capabilities.file_kinds`

At minimum, `upload.allowed_extensions` should be removed or renamed. It is the wrong abstraction if uploads are meant to be unrestricted.

If the team needs a short migration path, use:

- `upload.allowed_extensions` -> `parse.parseable_extensions`

and stop surfacing it as upload policy immediately.

## 6. Make the backend own classification, not the browser

The browser can send hints:

- filename
- client MIME
- last modified time

But final classification must live in backend finalize logic.

That finalize step should:

1. verify upload ownership and project ownership
2. inspect stored object metadata
3. normalize extension and MIME
4. derive `file_kind`
5. derive nullable `parse_source_type`
6. write document metadata
7. optionally enqueue parse or scan jobs

This prevents hardcoded browser-side extension logic from becoming a backend contract by accident.

## 7. Unify all ingest sources behind one finalize path

Local file uploads, Google Drive imports, future Dropbox imports, and API uploads should all converge on the same backend finalize code.

The current `google-drive-import` function should not keep its own near-copy of ingest logic long term.

Recommended pattern:

- source-specific connector downloads or transfers bytes to storage
- shared finalize service records metadata and triggers downstream work

One finalize path means one place to enforce project ownership, idempotency, classification, scan policy, and status transitions.

## 8. Make preview policy explicit

For unrestricted upload, preview must be allowlisted, not assumed.

Recommended preview policy:

- inline preview only for explicitly supported safe renderers
- attachment-style download for everything else
- never treat raw signed storage URLs as safe preview for active content types

In practice that means:

- PDF, plain text, markdown, office-derived renderers, and selected images can have dedicated previewers
- HTML, SVG, archives, executables, and arbitrary binaries should default to download-only unless rendered through a sanitizer or sandbox

## 9. Keep platform-api out of the hot upload path

Platform-api should remain the processing backend, not the upload data plane.

Its responsibilities should be:

- fetch stored input through signed URLs
- produce derived artifacts
- callback results

It should not become the primary ingress point for arbitrary browser file bytes. That would create avoidable scaling and security pressure.

## Recommended Implementation Direction

### Option A: Retrofit the current `ingest` endpoint

Changes:

- stop exposing `allowed_extensions` as upload admission
- keep multipart POST uploads through the edge function
- add better status separation
- keep route resolution optional

Pros:

- fastest path
- minimal UI churn

Cons:

- still memory-bound
- still timeout-bound
- still duplicates logic across upload sources
- still not a strong foundation for large arbitrary files

### Option B: Direct-to-storage upload sessions plus finalize

Changes:

- create upload session endpoint
- upload directly to storage
- finalize into shared metadata path
- queue parse separately

Pros:

- correct backend foundation
- scales to larger files
- cleaner separation of concerns
- easier to unify local and remote imports

Cons:

- more schema and API work up front

### Recommendation

Choose Option B.

If the requirement is “properly support upload for all file types,” Option A is a tactical patch, not a durable architecture.

## Concrete Repo Changes This Design Implies

### Edge/API layer

- replace `upload-policy` with an admission-policy contract that does not expose extension allowlists as upload gates
- add upload-session and finalize endpoints
- refactor `ingest` into shared finalize logic or retire it from the primary upload path
- refactor `google-drive-import` to reuse the same finalize service

### Database layer

- introduce blob/document separation or at least decouple `source_uid` from `source_type`
- add explicit lifecycle status columns
- add original filename and MIME metadata if missing
- keep parser-facing routing metadata nullable and downstream-specific

### Runtime policy layer

- move parser routing and artifact capability out of the `upload.*` namespace
- represent parse capability as a separate catalog
- represent preview capability separately from parse capability

### Frontend layer

- do not restrict file picker by extension
- surface “uploaded successfully” independently from “parse supported”
- disable parse action based on capabilities, not admission
- render unsupported files as stored assets with download-only affordances

### Processing/backend layer

- parse workers consume stored objects after finalize
- platform-api and conversion services receive only files that are explicitly routed and requested
- unsupported formats never enter parse queues

## Migration Plan

### Phase 1: Semantic cleanup without transport change

- stop presenting parseable extensions as upload restrictions
- rename policy fields to clarify meaning
- decouple `source_uid` hashing from `source_type`
- split lifecycle statuses in the schema and UI

### Phase 2: Shared finalize service

- extract shared finalize logic from `ingest`
- route `google-drive-import` through it
- make classification and capability derivation backend-owned

### Phase 3: Direct-to-storage uploads

- add upload-session API
- move browser upload bytes out of the edge function
- keep finalize as the single metadata write path

### Phase 4: Security and rendering hardening

- add malware scanning or quarantine policy
- make preview/download policy explicit
- harden active-content handling for HTML, SVG, and other risky types

## Verification Expectations

Before calling this complete, the implementation should prove:

1. Any authenticated user can upload an arbitrary file extension without extension-based rejection.
2. Unsupported formats land in storage and `source_documents` successfully.
3. Unsupported formats are marked `parse_status=unsupported`, not `upload_status=failed`.
4. Identical bytes uploaded by two different users do not collide incorrectly.
5. Upload source variants such as local upload and Google Drive import pass through the same finalize logic.
6. Large-file upload no longer requires edge-function buffering when the direct-to-storage path is introduced.
7. Unsafe active-content formats are not previewed inline by default.
8. Parse queues only receive explicitly supported and requested formats.

## Acceptance Criteria

A correct implementation of universal upload support should satisfy all of the following:

- no extension or MIME allowlist blocks authenticated uploads by default
- upload identity is not coupled to parser classification
- parser routing is nullable and downstream-only
- blob persistence is independent from parse support
- preview support is treated separately from parse support
- local and remote import flows converge on one backend finalize path
- large files do not depend on edge-function full-buffer uploads
- security controls remain in force even when type restrictions are removed

## Final Recommendation

The product should treat universal upload as an ingest-architecture problem, not a parser-format-expansion problem.

The current repo already contains some of the right instincts:

- `binary` exists as a source type
- unsupported uploads can already fall back to `upload_only`
- the UI already hints that uploads are format-agnostic

But the backend contract is not clean enough yet. The proper path is:

1. decouple upload admission from parse capability
2. decouple blob identity from document identity
3. move to direct-to-storage plus finalize
4. keep parse, preview, and extract capability as explicit downstream decisions

That gives the platform real all-file upload support without hardcoded format gates or ad hoc exceptions.

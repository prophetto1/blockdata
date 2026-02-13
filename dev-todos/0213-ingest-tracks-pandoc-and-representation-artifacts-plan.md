# Ingest Track Standardization + Pandoc + Representation Artifacts Plan (v2 Patch)

**Date:** 2026-02-13  
**Status:** Execution record for v2 rollout (Phases 1-3 implemented and validated; Phase 4 deferred; Phase 5 required next-phase scope)  
**Working location:** `dev-todos/` (moved from `docs/ongoing-tasks/`)  

---

## 1) Purpose

This v2 patch turns the prior plan into an implementation-grade spec with concrete contracts, migration scope, routing rules, and verification gates.

Scope remains the same 3 objectives:

1. Standardize ingest control plane across tracks:
   - capability catalog,
   - runtime enablement policy,
   - runtime extension-to-track routing policy.
2. Add Pandoc as a first-class ingest track.
3. Preserve parser-native representation artifacts as first-class internal assets for deterministic downstream adapters.

Current roadmap focus is operational ingest-track breadth and hardening, not downstream adapter buildout.

---

## 2) Locked Decisions

1. **Single active parsing track per document for now** is explicitly accepted.
2. `documents_v2.conv_*` stays the active conversion slot in this phase.
3. We add `conversion_representations_v2` now as a future-safe bridge to multi-representation-per-source.
4. Pandoc rollout is policy-gated and starts with a limited enabled subset.

---

## 3) Current Repo Baseline (Evidence)

1. `documents_v2` currently has one conversion slot and parser/representation pairing checks:  
   `supabase/migrations/20260208022131_003_v2_parallel_documents_blocks.sql`
2. Source detection and routing are hardcoded:
   - `supabase/functions/ingest/storage.ts`
   - `supabase/functions/ingest/process-convert.ts`
   - `supabase/functions/conversion-complete/index.ts`
3. Runtime policy only has `upload.allowed_extensions` for ingest, no routing keys yet:
   - `supabase/functions/_shared/admin_policy.ts`
   - `supabase/functions/admin-config/index.ts`
   - `supabase/migrations/20260212114500_018_admin_runtime_policy_controls.sql`
4. Conversion service currently accepts only `docx|pdf|pptx|xlsx|html|csv|txt`:
   - `services/conversion-service/app/main.py`

---

## 4) Intended Design (Target State)

### 4.1 Two-layer model (canonical)

Layer 1: capability catalog (full supported formats per track).  
Layer 2: runtime policy (enablement + routing), independent from capability.

### 4.2 Representation artifacts as durable assets

Every successful conversion stores representation metadata as first-class records (`markdown_bytes`, `doclingdocument_json`, `pandoc_ast_json`) with deterministic identity.

### 4.3 Normalized and parser-native duality

Normalized `block_type` remains canonical. Parser-native type/path metadata becomes optional additive exposure.

---

## 5) Canonical Registries (New Required Spec)

## 5.1 Canonical `source_type` registry

Current live values remain valid. New values for initial Pandoc rollout:

1. `rst`
2. `latex`
3. `odt`
4. `epub`
5. `rtf`
6. `org`

Extension to `source_type` canonical mapping (single source of truth):

1. `.md`, `.markdown` -> `md`
2. `.docx` -> `docx`
3. `.pdf` -> `pdf`
4. `.pptx` -> `pptx`
5. `.xlsx` -> `xlsx`
6. `.html`, `.htm` -> `html`
7. `.csv` -> `csv`
8. `.txt` -> `txt`
9. `.rst` -> `rst`
10. `.tex`, `.latex` -> `latex`
11. `.odt` -> `odt`
12. `.epub` -> `epub`
13. `.rtf` -> `rtf`
14. `.org` -> `org`

Rule: this mapping is identity-impacting because `source_uid = sha256(source_type + "\n" + source_bytes)`.  
No remap is allowed without a migration note and explicit compatibility decision.

## 5.2 Track identifiers

Allowed routing targets:

1. `mdast`
2. `docling`
3. `pandoc`

---

## 6) Runtime Policy Contract (New Required Spec)

Policy keys in `admin_runtime_policy`:

1. `upload.allowed_extensions` (existing, array of extension strings without dot)
2. `upload.track_enabled` (new, object)
3. `upload.extension_track_routing` (new, object)
4. `upload.track_capability_catalog` (new, object)

Required JSON shapes:

`upload.track_enabled`
```json
{
  "mdast": true,
  "docling": true,
  "pandoc": false
}
```

`upload.extension_track_routing`
```json
{
  "md": "mdast",
  "markdown": "mdast",
  "docx": "docling",
  "pdf": "docling",
  "pptx": "docling",
  "xlsx": "docling",
  "html": "docling",
  "htm": "docling",
  "csv": "docling",
  "txt": "mdast",
  "rst": "pandoc",
  "tex": "pandoc",
  "latex": "pandoc",
  "odt": "pandoc",
  "epub": "pandoc",
  "rtf": "pandoc",
  "org": "pandoc"
}
```

`upload.track_capability_catalog`
```json
{
  "version": "2026-02-13",
  "tracks": {
    "mdast": { "extensions": ["md", "markdown", "txt"] },
    "docling": { "extensions": ["docx", "pdf", "pptx", "xlsx", "html", "htm", "csv"] },
    "pandoc": { "extensions": ["rst", "tex", "latex", "odt", "epub", "rtf", "org"] }
  }
}
```

Validation rules:

1. Every `upload.allowed_extensions` entry must exist in `upload.extension_track_routing`.
2. Every routing target must be one of `mdast|docling|pandoc`.
3. Routed track must be enabled in `upload.track_enabled`.
4. Routed extension must also be listed in `upload.track_capability_catalog.tracks[track].extensions`.
5. Unknown policy keys are still rejected by admin API; `admin_policy.ts` must explicitly support these new keys before writes.

---

## 7) Routing Algorithm (New Required Spec)

Implement a single resolver used by ingest:

1. Parse extension from filename.
2. Check extension in `upload.allowed_extensions`.
3. Resolve track from `upload.extension_track_routing`.
4. Check `upload.track_enabled[track] === true`.
5. Check extension is listed in capability catalog for that track.
6. Resolve canonical `source_type` from extension mapping table.
7. Return `{ extension, source_type, track }`.

Error behavior:

1. Disabled extension -> 400 `"Extension not enabled by runtime policy"`.
2. Missing route -> 500 `"Runtime routing policy missing extension mapping"`.
3. Track disabled -> 400 `"Track disabled by runtime policy"`.
4. Route/capability mismatch -> 500 `"Routing policy conflicts with capability catalog"`.

Enforcement points:

1. Backend: `supabase/functions/ingest/index.ts` must use resolver before `source_uid` hashing.
2. Backend: `supabase/functions/ingest/process-convert.ts` uses resolved track, not hardcoded source_type checks.
3. Frontend: `web/src/pages/Upload.tsx` must read allowed extensions from runtime config API, not hardcoded array.

---

## 8) Workstream A - Control Plane Standardization

## A.1 Required code changes

1. Extend `RuntimePolicy` type and parser in `supabase/functions/_shared/admin_policy.ts` with:
   - `upload.track_enabled`
   - `upload.extension_track_routing`
   - `upload.track_capability_catalog`
2. Seed new policy keys in a migration.
3. Add shared ingest resolver module:
   - suggested file: `supabase/functions/ingest/routing.ts`.
4. Refactor:
   - `supabase/functions/ingest/storage.ts` -> canonical extension/source_type helpers only.
   - `supabase/functions/ingest/index.ts` -> policy-driven resolution.
   - `supabase/functions/ingest/process-convert.ts` -> policy-driven sidecar selection.
5. Update docs for runtime policy and ingest pipeline.

## A.2 Acceptance criteria

1. No ingest routing branch depends on hardcoded extension lists.
2. Route flips happen via policy writes only.
3. Policy validation prevents invalid track/extension combinations.

---

## 9) Workstream B - Pandoc First-Class Track

## B.1 DB and source-type migration scope

Add new `source_type` values to `documents_v2` check constraint:

1. `rst`
2. `latex`
3. `odt`
4. `epub`
5. `rtf`
6. `org`

No change needed for parser/representation checks because `pandoc` and `pandoc_ast_json` already exist.

## B.2 Conversion service contract (required exactness)

`ConvertRequest` must include:

1. `track: "docling" | "pandoc" | "mdast"` (explicit from ingest policy resolution)
2. `pandoc_output?: OutputTarget | null` (parallel to `docling_output`)
3. Expanded `source_type` pattern to include new Pandoc values.

Callback payload must include both nullable keys:

1. `docling_key`
2. `pandoc_key`

Determinism requirements:

1. Pandoc AST bytes must be canonicalized as deterministic JSON (`sort_keys=True`, compact separators).
2. `conv_uid = sha256("pandoc\npandoc_ast_json\n" + pandoc_ast_json_bytes)`.
3. Pin Pandoc version in container image and record it in deployment notes.

## B.3 Conversion service execution details

Container build:

1. Add Pandoc binary/runtime in `services/conversion-service/Dockerfile`.
2. Keep Docling dependencies intact.

Pandoc branch behavior:

1. Convert source to markdown bytes.
2. Export Pandoc JSON AST bytes.
3. Upload markdown to `output`.
4. Upload AST JSON to `pandoc_output` when provided.
5. Set callback `pandoc_key` only when AST upload succeeds.

## B.4 Callback branch precedence and validation (required)

`supabase/functions/conversion-complete/index.ts` rules:

1. If both `docling_key` and `pandoc_key` are non-empty -> mark `conversion_failed` with `"Invalid callback payload: multiple sidecar keys"`.
2. Else if `pandoc_key` exists -> Pandoc branch.
3. Else if `docling_key` exists -> Docling branch.
4. Else -> mdast fallback branch.

Idempotency and stale job behavior remains unchanged.

## B.5 Pandoc extractor contract

Add `supabase/functions/_shared/pandoc.ts`.

Required output shape per extracted block:

1. `block_type` (normalized enum)
2. `block_content` (deterministic text serialization)
3. `path` (AST path)
4. optional parser-native metadata

`block_locator` for Pandoc:

```json
{
  "type": "pandoc_ast_path",
  "path": "$.blocks[12]"
}
```

Initial mapping table:

1. `Header` -> `heading`
2. `Para`, `Plain` -> `paragraph`
3. `BulletList`, `OrderedList` -> `list_item` (one row per item, with item index in path)
4. `CodeBlock` -> `code_block`
5. `Table` -> `table`
6. `HorizontalRule` -> `divider`
7. `DefinitionList` -> `definition`
8. `RawBlock` where format is html -> `html_block`
9. `BlockQuote`, `Div`, unknown -> `other`

Rule: unknown constructors must not fail ingest; they map to `other`.

## B.6 Initial rollout defaults

1. `md`, `markdown` -> `mdast`
2. `docx`, `pdf`, `pptx`, `xlsx`, `html`, `htm`, `csv` -> `docling`
3. `rst`, `tex`, `latex`, `odt`, `epub`, `rtf`, `org` -> `pandoc`
4. `txt` remains `mdast` for now (can be rerouted later by policy)

## B.7 File-level checklist

1. `services/conversion-service/app/main.py`
2. `services/conversion-service/Dockerfile`
3. `services/conversion-service/README.md`
4. `supabase/functions/_shared/admin_policy.ts`
5. `supabase/functions/ingest/routing.ts` (new)
6. `supabase/functions/ingest/index.ts`
7. `supabase/functions/ingest/storage.ts`
8. `supabase/functions/ingest/process-convert.ts`
9. `supabase/functions/_shared/pandoc.ts` (new)
10. `supabase/functions/conversion-complete/index.ts`
11. `web/src/pages/Upload.tsx`
12. docs-site ingest and parsing tracks docs

---

## 10) Workstream C - Representation Artifacts Table

## C.1 Table definition (required minimum)

Add migration creating `conversion_representations_v2`:

```sql
CREATE TABLE public.conversion_representations_v2 (
  representation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_uid TEXT NOT NULL REFERENCES public.documents_v2(source_uid) ON DELETE CASCADE,
  conv_uid TEXT NOT NULL UNIQUE CHECK (conv_uid ~ '^[0-9a-f]{64}$'),
  parsing_tool TEXT NOT NULL CHECK (parsing_tool IN ('mdast','docling','pandoc')),
  representation_type TEXT NOT NULL CHECK (representation_type IN ('markdown_bytes','doclingdocument_json','pandoc_ast_json')),
  artifact_locator TEXT NOT NULL,
  artifact_hash TEXT NOT NULL CHECK (artifact_hash ~ '^[0-9a-f]{64}$'),
  artifact_size_bytes INTEGER NOT NULL CHECK (artifact_size_bytes >= 0),
  artifact_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversion_representations_v2_pairing CHECK (
    (parsing_tool = 'mdast' AND representation_type = 'markdown_bytes') OR
    (parsing_tool = 'docling' AND representation_type = 'doclingdocument_json') OR
    (parsing_tool = 'pandoc' AND representation_type = 'pandoc_ast_json')
  )
);

CREATE INDEX idx_conversion_repr_source_created
  ON public.conversion_representations_v2(source_uid, created_at DESC);
```

RLS:

1. Enable RLS.
2. Select policy via join to `documents_v2.owner_id = auth.uid()`.
3. Service role writes through Edge Functions.

## C.2 Write path

On successful ingest branch completion:

1. Insert one row into `conversion_representations_v2`.
2. Keep `documents_v2.conv_*` values as active slot for current APIs.

## C.3 Cleanup and idempotency

Required updates:

1. Retry cleanup in `supabase/functions/ingest/validate.ts` must also delete artifact rows for `source_uid`.
2. `delete_document` RPC will cascade via FK from `source_uid`.
3. Storage object cleanup remains out-of-scope unless explicitly added later.

## C.4 Backfill

Backfill from existing rows:

1. For each `documents_v2` row with non-null `conv_uid`, insert one artifact row.
2. `artifact_locator = documents_v2.conv_locator`.
3. `artifact_hash = conv_uid`.
4. `artifact_size_bytes = 0` when unknown (or compute if object fetch is available).

---

## 11) Deployment and Rollback Sequence (Required)

## 11.1 Safe deploy order

1. Deploy DB migration for new policy keys and `source_type` expansion.
2. Deploy Edge Functions with backward-compatible callback parsing (`pandoc_key` optional).
3. Deploy conversion service with `pandoc_output` + `pandoc_key` support.
4. Deploy ingest policy-driven routing and sidecar generation.
5. Enable Pandoc formats by policy update (initially disabled until step 4 is live).

## 11.2 Compatibility window guarantees

1. Old conversion service + new callback handler must continue to work (`pandoc_key` missing allowed).
2. New conversion service + old ingest can still process docling/mdast requests.
3. Pandoc routes must stay disabled until both sides are deployed.

## 11.3 Rollback

1. Policy rollback first: disable `pandoc` track and reroute impacted extensions.
2. Service rollback second if needed.
3. Keep callback handler backward-compatible in all rollback states.

---

## 12) Verification Matrix (Executable)

## 12.1 Unit tests

1. Routing resolver:
   - extension not allowed,
   - track disabled,
   - route/capability mismatch,
   - valid mdast/docling/pandoc route.
2. Determinism:
   - identical AST bytes -> identical `conv_uid` for pandoc.
3. Pandoc extractor mapping:
   - constructor mapping table + unknown fallback.

## 12.2 Integration tests

Use smoke scripts plus fixture-specific assertions:

1. Docling regression:
   - run `scripts/smoke-test-non-md.ps1 -FilePath .\\docs\\tests\\test-pack\\lorem_ipsum.docx`
   - assert `conv_parsing_tool=docling`, `conv_representation_type=doclingdocument_json`, locator `docling_json_pointer`.
2. Pandoc happy path (new fixture `docs/tests/test-pack/sample.rst`):
   - run `scripts/smoke-test-non-md.ps1 -FilePath .\\docs\\tests\\test-pack\\sample.rst`
   - assert `conv_parsing_tool=pandoc`, `conv_representation_type=pandoc_ast_json`, locator `pandoc_ast_path`.
3. mdast unchanged:
   - existing markdown smoke test remains green.
4. Callback invalid payload:
   - send both keys and assert `conversion_failed`.

## 12.3 Contract tests

1. `documents_v2` active slot still consistent.
2. One row per successful ingest in `conversion_representations_v2`.
3. Retry cleanup removes stale rows from:
   - `blocks_v2`,
   - `documents_v2`,
   - `conversion_representations_v2`.

## 12.4 Docs validation

Update and verify:

1. `docs-site/src/content/docs/core-workflow/processing/runtime-policy.md`
2. `docs-site/src/content/docs/core-workflow/processing/ingest-pipeline.md`
3. `docs-site/src/content/docs/key-concepts/blocks/parsing-tracks.md`

---

## 13) Risks and Controls

1. Risk: route drift between policy and code.
   - Control: single resolver + strict policy validation.
2. Risk: Pandoc version drift changes AST bytes.
   - Control: version pin + deterministic serialization + determinism tests.
3. Risk: rollout race between Edge and conversion service.
   - Control: explicit deploy sequence + policy-gated enablement.
4. Risk: cleanup gaps create orphan artifact metadata.
   - Control: FK cascade + retry/delete path updates.

---

## 14) Phase Plan (Ordered, Step-by-Step)

## Phase 0 - Contract freeze

1. Approve canonical extension/source_type table.
2. Approve runtime policy keys and JSON schemas.
3. Approve callback precedence rules.

Exit gate: this v2 file approved.

## Phase 1 - Control plane implementation

1. Migration: seed policy keys.
2. Extend `admin_policy.ts` + `admin-config` acceptance.
3. Add routing resolver and wire ingest.
4. Remove hardcoded extension arrays from backend routing.
5. Wire frontend upload accept list to policy API.

Exit gate: route changes require policy edits only.

## Phase 2 - Pandoc track implementation

1. Migration: expand `source_type` check constraint.
2. Conversion service: add Pandoc runtime + request/response contract.
3. Ingest: add `pandoc_output` generation path.
4. Callback: add Pandoc branch and mixed-key reject behavior.
5. Add `pandoc.ts` extractor.

Exit gate: sample `rst` ingest succeeds as Pandoc.

## Phase 3 - Representation artifacts

1. Migration: create `conversion_representations_v2`.
2. Backfill existing rows.
3. Insert representation row in mdast/docling/pandoc success paths.
4. Update retry/delete cleanup logic.

Exit gate: all successful ingests create representation rows.

## Phase 4 - Downstream adapter bootstrap

Status: **Deferred to later roadmap milestone (not in current execution scope).**

1. Define adapter interface and profile versioning.
2. Build one deterministic reference adapter (docling-to-KG flatten v1).
3. Add deterministic output tests.

Exit gate: one production-ready deterministic adapter.

## Phase 5 - Parser-native view exposure

1. Add parser-native block metadata fields.
2. Add API/UI toggle for normalized vs parser-native.
3. Verify no regressions in existing normalized consumers.

Exit gate: parser-native view available without breaking defaults.

---

## 15) Team Progress Checklist

Status snapshot date: **2026-02-13**

1. `[x]` Phase 0 complete
2. `[x]` Phase 1 complete
3. `[x]` Phase 2 complete
4. `[x]` Phase 3 complete
5. `[ ]` Phase 4 complete (**deferred**)
6. `[ ]` Phase 5 complete (**required**, not started)

Current roadmap priority (active execution scope):

1. Keep all ingest tracks operational end-to-end.
2. Expand usable format coverage within each track.
3. Ensure robust source-type identification and routing.
4. Persist parser-native intermediary artifacts (`markdown_bytes`, `doclingdocument_json`, `pandoc_ast_json`) as first-class records.
5. Continue hardening ingest reliability, policy controls, and rollout safety.
6. Deliver Phase 5 parser-native view exposure (API/UI toggle and parser-native metadata path) after ingest hardening gates are stable.

Per-phase notes:

1. Phase 1 (Control plane) status: **Complete**
   - Evidence:
     - `supabase/migrations/20260213153000_019_ingest_tracks_policy_pandoc_representation.sql`
     - `supabase/functions/_shared/admin_policy.ts`
     - `supabase/functions/ingest/routing.ts`
     - `supabase/functions/ingest/index.ts`
     - `supabase/functions/ingest/process-convert.ts`
     - `supabase/functions/upload-policy/index.ts`
     - `web/src/pages/Upload.tsx`
     - `docs-site/src/content/docs/core-workflow/processing/runtime-policy.md`
     - `docs-site/src/content/docs/core-workflow/processing/ingest-pipeline.md`
     - `docs-site/src/content/docs/key-concepts/blocks/parsing-tracks.md`

2. Phase 2 (Pandoc track) status: **Complete**
   - Evidence:
     - `services/conversion-service/app/main.py`
     - `services/conversion-service/Dockerfile`
     - `services/conversion-service/README.md`
     - `supabase/functions/_shared/pandoc.ts`
     - `supabase/functions/conversion-complete/index.ts`
     - `supabase/functions/ingest/process-convert.ts`
     - `docs/tests/test-pack/sample.rst`
   - Rollout fix applied during validation:
     - `ingest` and `conversion-complete` were redeployed with `--no-verify-jwt` after observed `Invalid JWT` gateway failures.

3. Phase 3 (Representation artifacts) status: **Complete**
   - Evidence:
     - `supabase/migrations/20260213153000_019_ingest_tracks_policy_pandoc_representation.sql`
     - `supabase/functions/_shared/representation.ts`
     - `supabase/functions/ingest/process-md.ts`
     - `supabase/functions/conversion-complete/index.ts`
     - `supabase/functions/ingest/validate.ts`
   - Additional rollout migration:
     - `supabase/migrations/20260213170000_020_storage_bucket_mime_types_pandoc.sql`
     - Purpose: extend `storage.buckets.allowed_mime_types` for Pandoc input MIME types (`text/x-rst`, `application/x-tex`, `application/vnd.oasis.opendocument.text`, `application/epub+zip`, `application/rtf`).

4. Phase 4 (Downstream adapter bootstrap) status: **Deferred**
   - Reason: roadmap priority is ingest-track operation/coverage and intermediary artifact hardening first.
   - Evidence: no adapter interface or deterministic adapter implementation in current scope.

5. Phase 5 (Parser-native view exposure) status: **Required, not started**
   - Scope remains in roadmap: add parser-native block metadata fields and normalized-vs-parser-native API/UI toggle without breaking defaults.
   - Evidence: no API/UI normalized-vs-parser-native toggle implementation found in current changed files.

Test commands + results (this session):

1. `powershell -File scripts/smoke-test-non-md.ps1 -FilePath .\\docs\\tests\\test-pack\\lorem_ipsum.docx` -> **PASS**
   - `conv_parsing_tool=docling`
   - `conv_representation_type=doclingdocument_json`
   - `block_locator.type=docling_json_pointer`
2. `powershell -File scripts/smoke-test-non-md.ps1 -FilePath .\\docs\\tests\\test-pack\\sample.rst` -> **PASS**
   - `conv_parsing_tool=pandoc`
   - `conv_representation_type=pandoc_ast_json`
   - `block_locator.type=pandoc_ast_path`
3. Runtime representation check via PostgREST query on `conversion_representations_v2` -> **PASS**
   - New row observed for `source_type=rst`, `parsing_tool=pandoc`, `representation_type=pandoc_ast_json`.

Current blockers/risks:

1. Phase 4 is intentionally deferred; Phase 5 is explicitly required next-phase scope.
2. Pandoc binary is installed from apt (`pandoc`) but not version-pinned at package version granularity in Dockerfile.
3. Temporary rollout policy changes were applied for validation (`upload.track_enabled.pandoc=true`, `upload.allowed_extensions` includes `rst`) and should be treated as active runtime config.

---

## 16) Handoff Notes for Parallel Codex Sessions

1. Treat this v2 file as execution authority for ingest-track expansion.
2. If implementation diverges, patch this file first, then code and docs.
3. Keep `dev-todos/README.md` aligned with this file as progress advances.
4. Rollout is live on Cloud Run revision `writing-system-conversion-service-00022-r2v` with 100% traffic at this snapshot.
5. Deployed function state expected at snapshot:
   - `ingest` version 22 (`verify_jwt=false`)
   - `conversion-complete` version 14 (`verify_jwt=false`)
   - `upload-policy` version 1 (`verify_jwt=false`)
   - `admin-config` redeployed for new policy-key parsing support

---
name: investigating-and-writing-plan
description: Use when you have a spec or requirements for a multi-step task, before touching code — especially when the API, data, frontend, and observability surface must be locked before writing tasks
---

# Investigating and Writing Plans

## Overview

Lock the plan contract before any task-writing begins. First investigate and declare everything the plan must contain, then turn that contract into bite-sized execution tasks.

This skill shares the same core discipline as `comprehensive-systematic-debugging`: verify reality, compare intended surface area against actual seams, and stop when major decisions are still implicit. The difference is timing. `comprehensive-systematic-debugging` catches plan-reality divergence after implementation; this skill prevents that divergence before implementation begins.

**Announce at start:** "I'm using the investigating-and-writing-plans skill to lock the plan contract and create the implementation plan."

**REQUIRED READ:** Read this file in full before drafting. Do not rely on memory, samples alone, or a partial skim.

## The Rule

No implementation tasks until the plan can declare its full surface area. If you cannot name the APIs, data changes, observability, frontend surface, and zero-change cases, you are not ready to write the necessary implementation plan.

No major decision can be improvised during actual development. Every implementation plan must declare its full surface area up front. Some details may need to be improvised — exact CSS values, error message wording, internal variable names — but the architectural shape of the work must be locked before implementation begins.

Use any skill or mcp as needed. Use any tool as many times as you need. Use every resource available to you in any read-only way as much as you need. But at the end of all that, you must fully comprehend the backend requirements of the upcoming implementation across platform-apis, opentelemetry based observability requirements, database requirements (existing tables, need for new tables) — when writing the plan, you must follow the guidelines outlined below.

A plan unable to produce the required contracts is one that is not properly thought out or analyzed.

## Investigation Workflow

1. Read the intent source first.
   - Requirement doc, approved example plans, product notes.
   - Prefer intent docs before current implementation; use current code to verify reality.

2. Verify the live seams in code.
   - Which UI is actually mounted?
   - Which endpoint, table, or service is the current system of record?
   - Which compatibility path must survive during migration?
   - Which existing files already own the behavior?

3. Lock the required plan contract.
   - Read the `Required Plan Contract` section in this file.
   - Every section must be declared concretely or stated explicitly as zero.
   - Match the shape and level of detail shown in the embedded examples.
   - Build the plan skeleton from the contract headings before writing any tasks.

4. Add higher-rigor locking when the feature spans multiple systems or migrates an existing flow.
   - Locked acceptance contract
   - Locked platform API surface
   - Locked observability surface
   - Locked inventory counts and file inventory
   - Frozen seam contract for compatibility-sensitive paths
   - Explicit risks and completion criteria

5. Stop if any major decision is still implicit.
   - Unknown endpoint shape
   - Unknown mounted UI target
   - Unknown system of record
   - Unknown migration or observability impact
   - Edge function reuse that needs user confirmation
   - The draft does not yet contain every required section from this skill

6. Force the dependency cascade for every required capability.

   If the plan requires a capability that does not exist yet — tracing an untraced flow, diagnosing an opaque handoff, auditing an unrecorded decision — the plan must declare the full infrastructure chain to create it. "It doesn't exist today" is never a justification for "No changes."

   The cascade rule: **if a required capability implies a new owned runtime seam, the plan must also declare every dependency that seam requires:**

   - **API contract** — endpoints to create, update, or query the new seam
   - **Persistence contract** — tables or rows to store the seam's state
   - **Observability contract** — traces, metrics, and structured logs on those endpoints
   - **Caller surface** — frontend or backend code that invokes the new endpoints
   - **Verification path** — tests and acceptance criteria proving the seam works end-to-end

   A plan that says "No platform API changes" or "No observability" must survive this test: *does the feature require a capability that no existing traced runtime can see?* If yes, the plan is incomplete — it must declare the seam and its full dependency chain before any tasks are written.

   Common failure mode: a flow that goes browser → external service (e.g., hosted Supabase Auth) bypasses every traced runtime the app owns. The plan cannot say "No observability" just because the current code has none. It must create the observability surface.

   If investigation reveals that the feature's real owned backend/runtime seam does not match the default platform assumptions in this skill, the plan must state that inconsistency explicitly before task-writing begins. Do not force `platform-api`, database, edge-function, or frontend work into the plan just because those are common defaults. Lock the actual owned seam first, then declare zero-cases for the irrelevant surfaces.

7. Turn the locked contract into TDD tasks.
   - Write bite-sized execution tasks with exact files, commands, expected output, and commit cadence. Follow the task structure defined in the Writing Tasks section below.

8. Run the final contract check.
   - Re-open this skill file.
   - Verify the draft contains every required heading or an explicit zero-case statement.
   - For multi-system work, verify the higher-rigor sections are present before handing off.

## Where to Look

Start your investigation at these locations. Read what exists before deciding what to add.

If these default investigation paths do not match the actual backend/runtime seam for the feature, call out the mismatch explicitly in the plan and pivot to the correct seam rather than silently inheriting the default scaffold.

| Area | Start here |
|------|-----------|
| Platform API routes | `services/platform-api/app/api/routes/` — every existing endpoint lives here |
| Platform API entry point | `services/platform-api/app/main.py` — router registration |
| Observability / OTel | `services/platform-api/app/observability/` — existing instrumentation |
| Database migrations | `supabase/migrations/` — chronological, filename-prefixed |
| Database schema (current) | Run `supabase db reset` or read the latest migrations to understand live tables |
| Edge functions | `supabase/functions/` — each subdirectory is one function |
| Frontend pages | `web/src/pages/` — top-level routes and page components |
| Frontend components | `web/src/components/` — shared and domain-specific |
| Frontend hooks | `web/src/hooks/` — data fetching and state |
| Frontend services/libs | `web/src/lib/` — API clients and utilities |
| Approved example plans | `docs/plans/` — use these to calibrate expected specificity |

## Quick Reference

| Area | Must be known before tasks |
|------|----------------------------|
| Platform API | Every endpoint added, modified, or consumed; new request, response, auth, and touched tables or RPCs; modified what and why |
| Observability | Every trace span, metric, and structured log; name, where, purpose; zero case justified |
| Database | Every migration; what it creates or alters; whether existing data changes |
| Edge Functions | Usually zero; if existing reuse may be better than FastAPI, stop and confirm with the user |
| Frontend | Exact pages, components, hooks, services, and files touched; counts and paths, not vague surface names |

## Common Mistakes

- Writing tasks before checking the mounted UI and actual system of record
- Treating "No platform API changes" or "No observability" as a shortcut instead of a verified conclusion
- Planning a migration without locking the compatibility seam
- Hiding scope in phrases like "update upload flow" or "add admin page"
- Assuming the samples are enough without reading the full reference file
- Starting prose before first turning the reference headings into a plan skeleton

## What This Prevents

- Building against an endpoint that does not exist
- Instrumentation getting skipped because it was never named
- Migrating a backend flow while the UI still reads from a different table
- Scope creep disguised as implementation detail
- High-quality task structure built on top of an under-specified plan
- Plans that say "modify the upload flow" without specifying which files, which functions, or what the new behavior is
- Shipping code with zero observability because "we'll add it later"

## Required Plan Contract

Read this section completely before drafting. Then build the plan skeleton from these headings. Do not start task-writing until the skeleton exists and every required section is present or explicitly stated as zero.

The examples below are drawn from the approved user-storage implementation plan. They are not placeholders. Use them to calibrate the expected level of specificity.

### Header

Every plan starts with:

- Feature name
- Goal
- Architecture
- Tech stack

#### Example

<!-- EXAMPLE START -->
```markdown
# User Storage Signup Verification Implementation Plan

**Goal:** Build the full signup-verification storage feature: policy-backed default quota for new users, quota-aware uploads and quota display in the authenticated product, and a superuser storage policy plus provisioning monitor so a new signup can be verified end-to-end.

**Architecture:** Keep `services/platform-api` as the runtime storage control plane and extend it with superuser-only storage administration endpoints. Move new-user quota assignment from the hard-coded `50 GB` literal in SQL to `admin_runtime_policy`, preserve the current `Default Project` provisioning flow, migrate browser uploads away from the legacy Supabase `ingest` edge path to `/storage/uploads`, and have storage completion write through to `source_documents` so the current assets/parsing UI continues to function.

**Tech Stack:** Supabase Postgres migrations and RPCs, FastAPI, React + TypeScript, OpenTelemetry, pytest, Vitest.
```
<!-- EXAMPLE END -->

### Manifest

The manifest is mandatory and appears immediately after the header.

#### Platform API

Declare every endpoint that will be added, modified, or consumed.

For each new endpoint, lock:

- verb and path
- auth requirement
- request shape
- response shape
- which table, RPC, or service it touches

For each modified endpoint, lock:

- what changes
- why it changes

If there are zero platform API changes, state that explicitly.

##### Example

<!-- EXAMPLE START -->
```markdown
### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/storage/quota` | Read the authenticated user's quota summary | Existing - no contract changes |
| POST | `/storage/uploads` | Reserve upload slot and issue signed upload URL | Existing - add `source_type` and `doc_title`; require precomputed `source_uid` for `storage_kind='source'` |
| GET | `/admin/storage/policy` | Read the global default new-user storage quota | New |

#### New endpoint contracts

`GET /admin/storage/policy`

- Auth: `require_superuser`
- Request: no body
- Touches: `public.admin_runtime_policy`

#### Modified endpoint contracts

`POST /storage/uploads`

- Change: add `source_type` and `doc_title` to the request contract and require a precomputed `source_uid` for source uploads.
- Why: the current browser ingest flow computes a content-addressed `source_uid`, and the new platform upload flow must preserve that identity model so the compatibility bridge can continue populating `source_documents`.
```
<!-- EXAMPLE END -->

#### Observability

Declare every trace span, metric, and structured log that will be added.

For each item, lock:

- type
- name
- where it emits
- purpose

For each observability surface, declare allowed and forbidden attributes. PII (user_id, email, filenames, object keys) must never appear in trace or metric attributes. Structured logs may carry PII only when access is restricted to superuser-auditable paths.

If there is zero observability work, state that explicitly and justify why.

##### Example

<!-- EXAMPLE START -->
```markdown
### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `storage.upload.reserve` | `services/platform-api/app/api/routes/storage.py:create_upload` | Measure reservation latency and over-quota failures |
| Metric | `platform.storage.upload.reserve.count` | `storage.py:create_upload` | Count successful reservation attempts |
| Structured log | `admin.storage.policy.updated` | `admin_storage.py:patch_storage_policy` | Audit old value, new value, and operator reason |

Observability attribute rules:

- Allowed attributes: `storage.kind`, `source.type`, `requested.bytes`, `actual.bytes`, `quota.bytes`, `used.bytes`, `reserved.bytes`, `limit`, `status`, `result`, `http.status_code`, `has_project_id`
- Forbidden in trace or metric attributes: `user_id`, `email`, `reservation_id`, `source_uid`, raw filenames, full storage object keys
```
<!-- EXAMPLE END -->

#### Database Migrations

Declare every migration and lock:

- filename
- what it creates or alters
- whether existing data is affected

If there are zero migrations, state that explicitly.

##### Example

<!-- EXAMPLE START -->
```markdown
### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260321120000_storage_default_quota_policy.sql` | Seeds `storage.default_new_user_quota_bytes`, adds `current_default_user_storage_quota_bytes()`, replaces `handle_new_user_storage_quota()` to read policy | No - existing users keep their current quota rows |
| `20260321130000_storage_source_document_bridge.sql` | Adds `doc_title` and `source_type` to `storage_upload_reservations`, replaces the storage reservation/completion RPC contract to carry that metadata | Yes - backfills safe values for pending reservations only; no quota rewrite |
```
<!-- EXAMPLE END -->

#### Edge Functions

Default expectation: no new edge functions.

If an existing edge function may be better than a new FastAPI route, stop and confirm with the user before committing the plan to that path.

If edge functions are touched, lock:

- function name
- action
- auth

If none are touched, state that explicitly.

##### Example

<!-- EXAMPLE START -->
```markdown
### Edge Functions

No edge functions created or modified.

Existing edge functions such as `ingest` and `admin-config` are read only as compatibility references. This implementation stays in `platform-api`. If reuse of an existing edge function becomes preferable, stop and confirm with the user first.
```
<!-- EXAMPLE END -->

#### Frontend Surface Area

Declare exact counts and file paths for:

- new pages or routes
- new components
- new hooks
- new libraries or services
- modified pages
- modified components
- modified hooks or services
- other supporting files when they materially affect the change

If there are zero frontend changes, state that explicitly.

##### Example

<!-- EXAMPLE START -->
```markdown
### Frontend Surface Area

**New pages:** `0`

**New components:** `3`

| Component | File | Used by |
|-----------|------|---------|
| `StorageQuotaSummary` | `web/src/components/storage/StorageQuotaSummary.tsx` | `ProjectAssetsPage.tsx` |
| `SuperuserStoragePolicy` | `web/src/pages/superuser/SuperuserStoragePolicy.tsx` | `SuperuserWorkspace.tsx` |

**Modified pages:** `2`

| Page | File | What changes |
|------|------|--------------|
| `ProjectAssetsPage` | `web/src/pages/ProjectAssetsPage.tsx` | Add visible quota summary above the live assets workbench |
| `SuperuserWorkspace` | `web/src/pages/superuser/SuperuserWorkspace.tsx` | Replace placeholder panels with storage policy and provisioning monitor tabs |
```
<!-- EXAMPLE END -->

### Higher-Rigor Locking For Multi-System Work

Add these sections when the feature spans multiple layers, preserves compatibility, or carries high drift risk.

Do not treat these as optional when the work crosses user/admin boundaries, migrates an existing flow, preserves a compatibility seam, or depends on exact observability and inventory coverage.

#### Pre-Implementation Contract

State that no major product, API, observability, or inventory decision may be improvised during implementation.

##### Example

<!-- EXAMPLE START -->
```markdown
## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.
```
<!-- EXAMPLE END -->

#### Locked Product Decisions

List the decisions that must not drift during implementation:

- mounted UI target
- system of record
- admin surface location
- migration boundary
- compatibility ownership

##### Example

<!-- EXAMPLE START -->
```markdown
### Locked Product Decisions

1. There is one global superuser storage administration surface, not a per-user admin UI.
2. The superuser surface lives inside the existing `SuperuserWorkspace.tsx`, not a new top-level route.
3. The current app still reads user-visible asset state from `source_documents`. For this phase, `source_documents` remains the compatibility list spine.
4. The backend, not the frontend, owns the compatibility bridge from `storage_objects` to `source_documents` when `storage_kind = 'source'`.
```
<!-- EXAMPLE END -->

#### Locked Acceptance Contract

Write the end-to-end proof that determines completion. Use concrete user-visible steps and concrete expected states.

##### Example

<!-- EXAMPLE START -->
```markdown
### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A superuser can set the default new-user quota to `5 GB`.
2. A brand-new user signs up with a new email.
3. On the Assets page, the user sees `0 used / 5 GB total / 5 GB remaining`.
4. The user uploads a `1 GB` file through the migrated storage upload path.
5. The user then sees `1 GB used / 4 GB remaining`.
6. The superuser provisioning monitor shows that signup completed with no missing records.
```
<!-- EXAMPLE END -->

#### Locked Platform API Surface

When the plan spans multiple endpoints, user/admin boundaries, or contract-sensitive migrations, restate the API surface in a locked section so implementation cannot silently add or drop endpoints.

##### Example

<!-- EXAMPLE START -->
```markdown
### Locked Platform API Surface

#### New superuser-only platform API endpoints: `3`

1. `GET /admin/storage/policy`
2. `PATCH /admin/storage/policy`
3. `GET /admin/storage/provisioning/recent`

#### Existing platform API endpoints modified: `2`

1. `POST /storage/uploads` — add `source_type`, `doc_title`; require precomputed `source_uid`
2. `POST /storage/uploads/{reservation_id}/complete` — add `source_documents` write-through

#### Existing platform API endpoints reused as-is: `4`

1. `GET /storage/quota`
2. `DELETE /storage/uploads/{reservation_id}`
```
<!-- EXAMPLE END -->

#### Locked Observability Surface

When observability is material to the feature, restate the locked traces, metrics, logs, and attribute rules in one place.

##### Example

<!-- EXAMPLE START -->
```markdown
### Locked Observability Surface

#### New traces: `9`

1. `storage.quota.read`
2. `storage.upload.reserve`
3. `storage.upload.sign_url`

#### New metrics: `10 counters`, `4 histograms`

1. `platform.storage.quota.read.count`
2. `platform.storage.upload.reserve.count`
3. `platform.admin.storage.policy.update.count`
```
<!-- EXAMPLE END -->

#### Locked Inventory Counts

Lock the expected counts for migrations, backend modules, frontend artifacts, and tests when count drift would indicate scope drift.

##### Example

<!-- EXAMPLE START -->
```markdown
### Locked Inventory Counts

#### Database

- New migrations: `2`
- Modified existing migrations: `0`

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `2`
- New visual components: `3`

#### Tests

- New test modules: `4`
- Modified existing test modules: `3`
```
<!-- EXAMPLE END -->

#### Locked File Inventory

List exact new and modified files when file-level drift would signal missing work or accidental expansion.

##### Example

<!-- EXAMPLE START -->
```markdown
### Locked File Inventory

#### New files

- `supabase/migrations/20260321120000_storage_default_quota_policy.sql`
- `services/platform-api/app/api/routes/admin_storage.py`
- `web/src/lib/storageUploadService.ts`

#### Modified files

- `services/platform-api/app/api/routes/storage.py`
- `web/src/pages/ProjectAssetsPage.tsx`
- `web/src/hooks/useDirectUpload.ts`
```
<!-- EXAMPLE END -->

#### Frozen Seam Contract

If the feature preserves or migrates a compatibility-sensitive seam, describe the seam explicitly and rule out tempting but wrong implementations.

##### Example

<!-- EXAMPLE START -->
```markdown
## Frozen Source Upload Contract

The current edge ingest flow computes `source_uid` before upload and the existing app depends on that identity model. The new storage upload path must preserve it instead of improvising a different ID scheme.

Do not implement this with `file.arrayBuffer()` for large browser uploads. A `1 GB` test file would force a painful full-buffer read in the browser.
```
<!-- EXAMPLE END -->

#### Explicit Risks Accepted In This Plan

List the risks that are intentionally accepted so they are not rediscovered mid-implementation as "surprises."

##### Example

<!-- EXAMPLE START -->
```markdown
## Explicit Risks Accepted In This Plan

1. Browser-side SHA-256 hashing remains acceptable for this phase because the current ingest path already computes content-addressed IDs client-side for browser uploads.
2. The app continues to rely on `source_documents` as the visible asset list spine in this phase; a future plan can remove that compatibility layer after the product moves fully to `storage_objects`.
```
<!-- EXAMPLE END -->

#### Completion Criteria

State the conditions that must all be true before the work can be considered complete.

##### Example

<!-- EXAMPLE START -->
```markdown
## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. The locked traces, metrics, and structured logs exist exactly as specified.
3. The inventory counts in this plan match the actual set of created and modified files.
4. No browser upload path still relies on the legacy Supabase `ingest` edge function for the affected user flows.
```
<!-- EXAMPLE END -->

---

## Writing Tasks

Once the contract is locked, write bite-sized execution tasks. Do not write any tasks until every section above is present or explicitly stated as zero.

### Plan Document Header

**Every plan MUST start with this header:**

<!-- EXAMPLE START -->
```markdown
# [Feature Name] Implementation Plan

**Goal:** [One-sentence goal]

**Architecture:** [Key architectural decisions]

**Tech Stack:** [Technologies used]

**Status:** Draft | Approved | In Progress | Complete
**Author:** [who wrote or requested the plan]
**Date:** [YYYY-MM-DD]
```
<!-- EXAMPLE END -->

### Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

### Task Structure

<!-- EXAMPLE START -->
```markdown
## Task [N]: [Short title]

**File(s):** `exact/path/to/file.ts`

**Step 1:** [Exact action]
**Step 2:** [Exact action]
**Step 3:** [Exact action]

**Test command:** `npm test -- --run src/tests/specific.test.ts`
**Expected output:** [What passing looks like]

**Commit:** `type: short description`
```
<!-- EXAMPLE END -->

### Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills by name (do not use @ syntax — it force-loads files and burns context)
- DRY, YAGNI, TDD, frequent commits

## Execution Handoff

When the plan is complete and approved, hand it to the implementer (human or agent) with:

1. The plan document path
2. A reminder to read the plan fully before starting
3. A reminder to follow the plan exactly — no improvisation on locked decisions
4. A reminder to stop and revise the plan if a locked decision turns out to be wrong

## Related Skills

- `comprehensive-systematic-debugging` uses the same plan-vs-reality discipline after implementation, when you need to prove whether code matches the plan.

# Drafting New Implementation Plans

This document defines mandatory requirements for every implementation plan written in this repo. The writing-plans skill (`docs/jon/skills/writing-plans/SKILL.md`) governs task structure, TDD steps, and execution handoff. This document governs what must be decided and declared *before* any task is written.

This is how we must work to be productive and efficient - we must analyze the codebase, understand the platform-apis - what exists already and what needs to be newly created - and we must have understanding about what we are developing in order to define the traces that will be emited as a result of the development. 

A plan unable to produce this requirement set is a plan that was not properly thought out and analyzed. 

Use any skill or mcp as needed. Use any tool as many times as you need. Use every resource available to you in any read-only way as much as you want. But after all of that - when writing the plan, you must ensure you follow the guideline outlined in this document.

## The Rule

No major decision can be improvised during actual development. Every implementation plan must declare its full surface area up front. Some details may need to be improvised — exact CSS values, error message wording, internal variable names — but the architectural shape of the work must be locked before implementation begins.

## Required Manifest

Every plan must include a **Manifest** section immediately after the header. The manifest is a bill of materials for the entire plan.

### Platform API Changes

Declare every API endpoint that will be added, modified, or consumed.

```markdown
## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | /storage/quota | Read user quota | Existing — no changes |
| POST | /storage/uploads | Reserve upload slot | Existing — add `doc_title` field |
| POST | /storage/uploads/{id}/complete | Finalize upload | Existing — add source_documents write-through |
| GET | /admin/storage/provisioning | Superuser provisioning monitor | **New** |
```

For each **new** endpoint: declare request shape, response shape, auth requirement, and which RPC or table it touches.

For each **modified** endpoint: declare what changes and why.

If the plan adds or modifies zero platform API endpoints, state: "No platform API changes."

### Observability

Declare every trace, metric, and structured log that will be added.

```markdown
### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `storage.reserve_upload` | storage.py:create_upload | Track reservation latency and failures |
| Trace span | `storage.complete_upload` | storage.py:finalize_upload | Track completion latency, GCS verification |
| Metric | `storage.uploads.reserved_bytes` | storage.py | Gauge of currently reserved bytes |
| Metric | `storage.quota.utilization_ratio` | storage.py:read_quota | Histogram of user quota utilization |
| Structured log | `signup.provisioning.complete` | handle_new_user_storage_quota | Log user_id, quota_bytes on successful provisioning |
```

If the plan adds zero observability, state that explicitly and justify why.

### Database Migrations

Declare every new migration, what it creates or alters, and whether it affects existing data.

```markdown
### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|---------------|----------------------|
| `20260321_NNN_storage_default_quota_policy.sql` | New policy row + replace trigger function | No — existing users keep current quota |
```

If the plan requires zero migrations, state: "No database migrations."


** WE ARE NO LONGER ADDING NEW EDGE FUNCTIONS AS WE ARE MOVING AWAY FROM THEM. HOWEVER, THERE MAY BE  INSTANCES WHEN A EDGE FUNCTION CURRENTLY IN EXISTENCE MIGHT BE BETTER TO USE THAN TO DEFINE A NEW FASTAPI. IF THIS IS EVER THE CASE, DISCUSSION AND CONFIRMATION WITH USER IS REQUIRED ** 
### Edge Functions

Declare edge functions that will be used.

```markdown
### Edge Functions

| Function | Action | Auth |
|----------|--------|------|
| `admin-config` | Existing — extend with storage policy read | Superuser only |
| `ingest` | Existing — no changes (upload path migrates to platform-api) | Authenticated user |
```

If the plan touches zero edge functions, state: "No edge functions created or modified."

### Frontend Surface Area

Declare exact counts and file paths for every frontend artifact.

```markdown
### Frontend Surface Area

**New pages:** 2
| Page | File | Route |
|------|------|-------|
| SuperuserStoragePolicy | `web/src/pages/superuser/SuperuserStoragePolicy.tsx` | `/app/superuser/storage` |
| SuperuserProvisioningMonitor | `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx` | `/app/superuser/provisioning` |

**New components:** 3
| Component | File | Used by |
|-----------|------|---------|
| StorageQuotaSummary | `web/src/components/storage/StorageQuotaSummary.tsx` | ProjectAssetsPage |
| ProvisioningStatusTable | `web/src/components/superuser/ProvisioningStatusTable.tsx` | SuperuserProvisioningMonitor |
| PolicyEditor | `web/src/components/superuser/PolicyEditor.tsx` | SuperuserStoragePolicy |

**New hooks:** 2
| Hook | File |
|------|------|
| useStorageQuota | `web/src/hooks/useStorageQuota.ts` |
| useProvisioningHealth | `web/src/hooks/useProvisioningHealth.ts` |

**New libraries/services:** 1
| Module | File |
|--------|------|
| storageUploadService | `web/src/lib/storageUploadService.ts` |

**Modified files:** 4
| File | What changes |
|------|-------------|
| `web/src/pages/ProjectAssetsPage.tsx` | Add StorageQuotaSummary above workbench |
| `web/src/pages/useAssetsWorkbench.tsx` | Wire upload service, pass quota refresh |
| `web/src/hooks/useDirectUpload.ts` | Replace edgeFetch('ingest') with storageUploadService |
| `web/src/pages/superuser/SuperuserWorkspace.tsx` | Add storage policy and provisioning tabs |
```

If the plan has zero frontend changes, state: "No frontend changes."


## What This Prevents

- Building a frontend component then discovering the API endpoint does not exist yet
- Shipping code with zero observability because "we'll add it later"
- Discovering mid-implementation that uploads write to `storage_objects` but the UI reads from `source_documents`
- Plans that say "modify the upload flow" without specifying which files, which functions, or what the new behavior is
- Scope creep disguised as "oh we also need this"

## Relationship to Existing Skills

- **writing-plans skill** defines task structure (TDD steps, bite-sized actions, commit cadence). This document defines what must be declared before those tasks are written.
- **brainstorming skill** explores intent and requirements. The manifest is the output boundary between brainstorming and plan-writing: brainstorming produces the decisions, the manifest records them, and the plan operationalizes them.
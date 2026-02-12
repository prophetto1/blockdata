# Priority 7 Master Contracts - Schema Creation + Template Pipeline

**Date:** 2026-02-12  
**Status:** Canonical execution contract for Priority 7  
**Scope:** Define the end-to-end contracts for schema creation pathways, template usage, save semantics, and run compatibility so implementation is deterministic and avoids rework.

---

## 1) Purpose

This document is the implementation contract for Priority 7.

It merges and normalizes schema-related requirements currently spread across:

- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/ongoing-tasks/meta-configurator-integration/status.md`
- `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md`
- `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
- `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`

If any wording conflicts, this document is the Priority 7 implementation source of truth.

---

## 2) Non-Negotiables

1. Schema creation is wizard-first for non-technical users.
2. Advanced editor remains available as an escape hatch.
3. Save path is single-boundary (`POST /schemas`) across all creation modes.
4. Edit behavior is fork-by-default (new schema artifact, no in-place mutation path in P7).
5. Worker/grid compatibility contract remains top-level `properties` + optional `prompt_config`.
6. Conflict behavior is explicit and recoverable (`409` rename/fork flow).

---

## 3) Priority 7 Gate Mapping

This contract is designed to satisfy Priority 7 requirements in:
`docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`

Required execution mapping:

1. Wizard-first manual schema creation path -> Sections 5, 6, 7.
2. Advanced editor escape hatch + fork semantics -> Sections 5, 9.
3. Worker/grid compatibility (`properties`, `prompt_config`) -> Sections 8, 10.
4. Happy-path + conflict-path (`409`) evidence -> Sections 11, 15.

---

## 4) Current Repo Baseline (for contract realism)

Implemented today:

1. `POST /schemas` edge function exists with deterministic `schema_uid` hashing and conflict handling.
2. Advanced editor route exists (`/app/schemas/advanced`, `/app/schemas/advanced/:schemaId`) with fork-by-default UX.
3. Schemas list page exists but is upload-first, not wizard-first.

Not implemented today:

1. Wizard page and stepper flow.
2. Template gallery/detail/application flow.
3. Existing-schema wizard prefill flow.
4. Upload-to-wizard route decision flow.

---

## 5) Information Architecture + Route Contracts

### 5.1 Route set

Existing (keep):

- `/app/schemas` - schema hub/list
- `/app/schemas/advanced`
- `/app/schemas/advanced/:schemaId`

New (Priority 7):

- `/app/schemas/start` - start chooser (mode selection)
- `/app/schemas/templates` - template gallery
- `/app/schemas/templates/:templateId` - template detail
- `/app/schemas/wizard` - wizard create/edit
- `/app/schemas/apply` - optional apply-to-run flow after save

### 5.2 Ownership per route

1. `/app/schemas/start`
   - Chooses creation source only.
2. `/app/schemas/templates*`
   - Read-only exploration of template metadata and schema seed.
3. `/app/schemas/wizard`
   - Primary authoring and validation surface.
4. `/app/schemas/advanced*`
   - Power-user full editor; same save/conflict rules.
5. `/app/schemas/apply`
   - Binds saved schema to target docs/projects/runs.

---

## 6) Start Chooser Contract (Branch Controller)

Entry action: `Create User Schema`.

User sees five modes:

1. Browse Templates
2. From Existing Schema
3. Start from Scratch
4. Upload JSON
5. Advanced Editor

Contract rule: all five branches converge to the same persistence boundary (`POST /schemas`) and same conflict semantics.

---

## 7) Branch Pipelines (Exact Flows)

### 7.1 Path A - Browse Templates

1. `/app/schemas/start` -> choose `Browse Templates`.
2. `/app/schemas/templates` shows template cards (3-4 per row desktop, spacious layout, 8-10 per page).
3. Category bar at top filters template list.
4. User opens template detail via route or layer popup.
5. User presses `Apply Template`.
6. Navigate to `/app/schemas/wizard?source=template&templateId=<id>`.
7. Wizard prefilled with template `fields` + `prompt_config`.
8. User can save immediately or tweak then save.
9. Save hits `POST /schemas`.
10. End state: new user-owned schema (forked from template seed), available in schema list.

### 7.2 Path B - From Existing User Schema

1. `/app/schemas/start` -> choose `From Existing Schema`.
2. List only current user's schemas.
3. User selects a schema to fork.
4. Default fork ref suggestion: `<schema_ref>_v2` (slug-trimmed).
5. User chooses editor type:
   - wizard path: `/app/schemas/wizard?source=existing&schemaId=<id>`
   - advanced path: `/app/schemas/advanced/<id>`
6. Save path identical (`POST /schemas`).
7. End state: new schema row and `schema_id`; original schema unchanged.

### 7.3 Path C - Start from Scratch (Wizard Core)

1. `/app/schemas/start` -> choose `Start from Scratch`.
2. Navigate `/app/schemas/wizard?source=scratch`.
3. Step 1 Intent.
4. Step 2 Fields (visual).
5. Step 3 Prompt config (optional).
6. Step 4 Preview + compatibility checks.
7. Step 5 Save.
8. Save path identical (`POST /schemas`).
9. End state: new schema row with deterministic `schema_uid`.

### 7.4 Path D - Upload JSON

1. `/app/schemas/start` -> choose `Upload JSON`.
2. Select local `.json`.
3. Parse + classify:
   - invalid JSON/object -> blocking parse error
   - compatible subset -> route to wizard prefilled
   - complex schema features -> route to advanced editor prefilled
4. User reviews/edits.
5. Save path identical (`POST /schemas`).
6. End state: imported schema saved as user-owned artifact.

### 7.5 Path E - Advanced Editor

1. `/app/schemas/start` -> choose `Advanced Editor`.
2. Navigate `/app/schemas/advanced`.
3. Full split-view editing via embedded editor.
4. Show compatibility warnings when top-level `properties` is missing/non-object.
5. Save as new schema (fork-by-default).
6. Save path identical (`POST /schemas`).
7. End state: power-user-authored schema saved.

---

## 8) Schema Compatibility Contract (Worker/Grid)

### 8.1 Server baseline contract

The backend `schemas` function enforces only:

1. input is JSON object
2. persistence semantics and uniqueness behavior

It does not enforce full JSON Schema shape in P7.

### 8.2 P7 compatibility contract (client/UX level)

Wizard must enforce:

1. top-level `type: "object"`
2. top-level `properties` object
3. field keys unique
4. optional `prompt_config` block

Advanced editor/upload:

1. allow broader JSON authoring
2. always warn when v0 worker/grid compatibility is broken
3. allow save (with warning), unless parse/object validity fails

### 8.3 Grid derivation rule

Run grid columns derive from `schemas.schema_jsonb.properties` keys.

If `properties` is missing, run display may degrade; this must be explicitly warned in authoring UI.

---

## 9) Persistence + Conflict Contract (`POST /schemas`)

### 9.1 Method and payloads

Method: `POST` only.

Accepted payload forms:

1. `multipart/form-data`
   - `schema_ref` optional
   - `schema` file required
2. `application/json`
   - raw schema object
   - or `{ schema_ref, schema_json }`

### 9.2 Deterministic identity

1. Canonicalize schema JSON by sorted object keys (recursive).
2. Compute `schema_uid = sha256(canonical_json)`.

### 9.3 Status behavior (exact current runtime contract)

1. `200` create success.
2. `200` idempotent success when same `schema_ref` + same `schema_uid`.
3. `409` conflict when same `schema_ref` + different `schema_uid`.
4. `400` invalid request or non-object schema.
5. `405` non-POST method.

### 9.4 Conflict recovery UX contract

On `409`:

1. user remains on save step
2. inline error shows existing vs incoming conflict
3. rename input is focused
4. retry save with new `schema_ref`

---

## 10) Template Contracts (Library + Detail + Apply)

### 10.1 Template object contract

```ts
type SchemaTemplate = {
  template_id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  schema_json_seed: Record<string, unknown>;
  preview: {
    fields: Array<{ key: string; type: string; description?: string }>;
    use_case: string;
  };
};
```

### 10.2 Template UI contract

Template gallery must provide:

1. category filter strip in wide container
2. spacious card grid (3-4 columns desktop)
3. page size 8-10 templates
4. detail drilldown route or layer popup

Template detail must provide:

1. purpose and usage description
2. field/enum summary
3. schema JSON preview
4. actions:
   - `Apply Template`
   - `Apply and Start Run` (if target context already chosen)

### 10.3 Template ownership contract

Templates are never saved directly as platform-owned runtime artifacts.
Apply always creates a user-owned schema artifact through `POST /schemas`.

---

## 11) Wizard Contracts (Step-by-Step)

### 11.1 Step 1: Intent

Required:

1. task intent text

Optional:

1. sample document pointer (`conv_uid`)
2. source metadata (`template_id`, `schema_id`, `upload_name`)

### 11.2 Step 2: Fields

Required controls per field:

1. key
2. type
3. description
4. required toggle

Type-specific controls:

1. enum values
2. numeric bounds
3. array items type
4. nested object support for allowed subset

### 11.3 Step 3: Prompt Config

Optional controls:

1. `system_instructions`
2. `per_block_prompt`
3. advanced model knobs:
   - `model`
   - `temperature`
   - `max_tokens_per_block`

### 11.4 Step 4: Preview

Must show:

1. derived column preview from top-level `properties`
2. schema JSON preview
3. compatibility result and warnings

### 11.5 Step 5: Save

Must show:

1. `schema_ref` slug input
2. conflict-handling guidance
3. post-save choices:
   - return to schemas list
   - continue to apply flow

---

## 12) Upload JSON Contracts

Upload classifier outputs one of:

1. `invalid` - parse/object error
2. `wizard_compatible` - route to wizard with parsed draft
3. `advanced_recommended` - route to advanced editor with parsed draft

Classifier checks:

1. parse success
2. object at top-level
3. presence/shape of `properties`
4. presence of advanced constructs (`$ref`, `$defs`, `allOf`, `anyOf`, `oneOf`, conditionals)

Rule:

1. advanced constructs do not block save
2. they route to advanced editor by default to avoid wizard corruption

---

## 13) Apply Flow Contracts

After save, apply flow can:

1. end immediately (schema only)
2. bind schema to selected doc/project run creation

Apply flow inputs:

1. `schema_id` (saved result)
2. `conv_uid` and `schema_id` for run creation path

Run creation remains current boundary (`runs` edge function); schema flow does not bypass run contracts.

---

## 14) Security + Ownership Contracts

1. all schema save/load flows require authenticated user
2. user sees only own schemas in fork source picker
3. template catalog is read-only, no ownership mutation
4. no user API key dependency for manual wizard save behavior
5. advanced editor embed remains client editor only; host controls save calls

---

## 15) Evidence/Test Matrix (Priority 7 Closure)

### 15.1 Happy-path evidence

1. Scratch wizard -> save -> schema listed.
2. Template apply -> save -> schema listed with new user-owned row.
3. Existing-schema fork -> save -> original unchanged, new schema created.
4. Upload JSON compatible -> wizard route -> save success.
5. Advanced editor save -> success and list refresh.

### 15.2 Conflict evidence

1. save with existing `schema_ref` and different content -> `409`.
2. rename and retry -> success.
3. same ref + same content -> idempotent `200`.

### 15.3 Worker/grid compatibility evidence

1. run with wizard-created schema.
2. verify overlay columns derived from `properties` keys.
3. verify no compatibility-break regressions in run detail/grid display.

---

## 16) Implementation Phasing (No-Redo Plan)

### Phase 1 (Priority 7 core gate)

1. build `/app/schemas/start`
2. build `/app/schemas/wizard` scratch flow
3. wire existing-schema fork -> wizard prefill
4. keep advanced editor as-is, unified save semantics
5. add upload classifier and route handling
6. capture happy-path + `409` evidence

### Phase 2 (Template-enabled without backend expansion)

1. add local curated template registry (static data/module)
2. add `/templates` + detail flow
3. apply-to-wizard prefill
4. capture template path evidence

### Phase 3 (post-P7)

1. template storage/admin management model
2. schema-assist AI copilot path
3. deeper schema version lineage UX

---

## 17) Out-of-Scope for Priority 7

1. `schema-assist` runtime AI implementation.
2. template moderation/admin CMS.
3. replacing embedded editor internal widget library.
4. in-place schema mutation workflow for referenced schemas.

---

## 18) Final Contract Summary

Priority 7 implementation is correct when:

1. users can create schemas from multiple starting sources without authoring raw JSON by default,
2. all branches converge on one save contract (`POST /schemas` with deterministic idempotency/conflict behavior),
3. fork/conflict behavior is explicit and recoverable,
4. saved schemas reliably work in run + grid paths via top-level `properties`.


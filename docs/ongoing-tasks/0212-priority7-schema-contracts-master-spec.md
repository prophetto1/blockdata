# Priority 7 Master Contracts - Schema Creation, Templates, and Save Semantics

**Date:** 2026-02-12  
**Status:** Canonical implementation contract for Priority 7  
**Authority:** Primary execution contract for Priority 7 route/pipeline/save/evidence decisions; deeper reference docs remain valid where explicitly cited in this document:

- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/ongoing-tasks/meta-configurator-integration/status.md`
- `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md`

Those documents remain reference inputs and history; this document is the default tie-breaker for Priority 7 execution decisions unless a section here explicitly delegates to a source section.

---

## 1) Purpose

This document defines exact contracts for how schema creation must operate in Priority 7:

1. wizard-first creation path,
2. template-based starting path,
3. existing-schema fork path,
4. upload-JSON path,
5. advanced-editor escape hatch,
6. single persistence boundary (`POST /schemas`),
7. worker/grid compatibility expectations.

Goal: eliminate implementation ambiguity and prevent rework.

---

## 2) Scope Boundary (Gate-Critical vs Deferred)

### 2.1 Priority 7 gate-critical scope

Required for Priority 7 pass:

1. Wizard-first manual creation is operational.
2. Advanced editor remains operational with fork-by-default save semantics.
3. Save/idempotency/conflict behavior is deterministic and recoverable.
4. Wizard-created schemas are worker/grid compatible via top-level `properties` + optional `prompt_config`.
5. Happy-path and conflict-path evidence is recorded.

### 2.2 Not required for Priority 7 pass

Allowed but not required in this gate:

1. Full template gallery rollout.
2. Dedicated `/app/schemas/apply` route.
3. Schema Co-Pilot (`schema-assist`) implementation.
4. Template admin/moderation/CMS workflows.

---

## 3) Non-Negotiables

1. Schema creation is wizard-first and visual-first.
2. Advanced editor is escape hatch, not default path.
3. All creation branches converge on one save boundary: `POST /schemas`.
4. Edit behavior defaults to fork (save as new schema artifact).
5. Worker/grid compatibility in v0 is defined by top-level `properties` (plus optional `prompt_config`).
6. Conflict behavior must surface explicit, recoverable `409` rename flow.

---

## 4) Canonical Terms

- `schema_ref`: user-facing slug identifier (owner-scoped).
- `schema_uid`: deterministic content hash of canonicalized schema JSON.
- `schema_jsonb`: stored schema artifact JSON.
- `prompt_config`: optional schema-level worker instruction and model controls.
- `run`: binding of `conv_uid` + `schema_id` in `runs_v2`.
- `overlay`: per-block mutable output for a run.

---

## 5) System Requirements List (SRL)

SRL-1. Users can create a schema without writing JSON.  
SRL-2. Users can edit full schema JSON via power-user escape hatch.  
SRL-3. Saved schemas persist with stable `schema_ref` and deterministic `schema_uid`.  
SRL-4. Save is idempotent on identical `(owner_id, schema_ref, schema_uid)` submissions; owner-scoped `schema_ref` and `schema_uid` uniqueness conflicts are explicit and recoverable.  
SRL-5. Editing defaults to fork (new schema artifact), not in-place mutation of in-use schema.  
SRL-6. Wizard-created schemas are compatible with current worker/grid contract.  
SRL-7. Grid columns derive from schema and display staged/confirmed overlays correctly.  
SRL-8. Platform-provided schema assistance, when added, is isolated from user API key pathways.  
SRL-9. Advanced editor embed remains compatible with host app styling and lifecycle.

---

## 6) SRL Traceability Map

| SRL | Implemented By | Verification |
|---|---|---|
| SRL-1 | Wizard route + field editor contracts (Sections 12, 13) | Wizard create-save proof (Section 22) |
| SRL-2 | Advanced editor route + mount/save contract (Sections 15, 16) | Advanced save proof (Section 22) |
| SRL-3 | Save boundary + hash derivation (Sections 9, 10) | Save response and list evidence |
| SRL-4 | `POST /schemas` conflict semantics (Section 10) | `409` tests (`schema_ref` and `schema_uid`) + rename retry proof |
| SRL-5 | Fork-by-default for wizard/advanced edit (Sections 7.3, 16) | Existing-schema fork evidence |
| SRL-6 | Wizard compatibility enforcement (Section 12) | Run/grid compatibility evidence |
| SRL-7 | Grid display/edit/review semantics (Section 18) | Run detail + grid output check |
| SRL-8 | Out-of-scope and boundary lock (Sections 2.2, 19) | No user-key dependency in P7 flow |
| SRL-9 | Embed API/lifecycle/theming contract (Section 15) | Advanced editor lifecycle check |

---

## 7) Data Model Contracts

### 7.1 `schemas` table contract

`schemas` is the source of truth for schema artifacts:

1. `schema_id` UUID primary key.
2. `owner_id` UUID not null.
3. `schema_ref` text not null, owner-scoped unique.
4. `schema_uid` text not null (deterministic content hash), owner-scoped unique.
5. `schema_jsonb` JSONB not null (opaque payload to DB).

### 7.2 `schema_ref` format contract

Format: `^[a-z0-9][a-z0-9_-]{0,63}$`

### 7.3 Provenance contract

Runs reference `schema_id`; therefore edit defaults to fork to preserve run-time lineage.

### 7.4 Deletion contract

Schema deletion is available via `delete_schema` RPC. It succeeds only when the schema has zero referencing rows in `runs_v2`; the RPC fails if any run references the schema. The schemas list page already implements this with a confirmation dialog warning "This will fail if any runs reference it."

### 7.5 Uniqueness constraints (exact)

Database constraints enforce both:

1. `unique (owner_id, schema_ref)`
2. `unique (owner_id, schema_uid)`
3. `schema_uid` must match `^[0-9a-f]{64}$` (sha256 hex)

This means:

1. Different users may have identical `schema_uid` values (same content, different owners).
2. The same user cannot create two schema rows with identical content hash (same `schema_uid`), even under different `schema_ref` slugs.
3. Conflict detection (`409`) can be triggered by either unique key (`owner_id + schema_ref` or `owner_id + schema_uid`).
4. Duplicate `(owner_id, schema_uid)` submissions should be treated as idempotent-by-content at the UX layer (link user back to the existing schema row), even if the current API response is a generic duplicate/409.

---

## 8) Current Runtime Baseline (Must Be Preserved)

Already implemented and must not regress:

1. `POST /schemas` edge function with deterministic hashing and idempotency/conflict behavior.
2. Advanced editor routes:
   - `/app/schemas/advanced`
   - `/app/schemas/advanced/:schemaId`
3. Advanced editor save defaults to fork and handles `409` with rename guidance.
4. New schema workflow routes are wired:
   - `/app/schemas/start`
   - `/app/schemas/wizard`
   - `/app/schemas/templates`
   - `/app/schemas/templates/:templateId`
   - `/app/schemas/apply`
5. Wizard manual 5-step flow exists with save through `POST /schemas` and `409` handling.
6. Existing-schema fork prefill and template prefill paths are wired into wizard flow.
7. Template registry + template gallery/detail scaffold exists (Phase 2-capable surface).

Confirmed remaining gaps to close for P7 gate:

1. Upload JSON classifier path is not implemented end-to-end yet (Path D currently routes to wizard shell without parser/classifier behavior).
2. Wizard authoring parity gaps:
   - nullable union toggle (`type: ["...","null"]`) authoring control,
   - nested object property authoring parity,
   - explicit compatibility pass/warn result in preview step.
3. In-wizard JSON escape hatch contract is not yet implemented as specified in Section 13.6.
4. Section 22.1 gate evidence capture is still incomplete.

---

## 9) Persistence Boundary (Single Save Contract)

All branches save through `POST /schemas` only.

No alternate schema-persistence endpoint is permitted in Priority 7.

---

## 10) `POST /schemas` API Contract

### 10.1 Method

`POST` only.

### 10.2 Accepted payloads

1. `multipart/form-data`
   - `schema_ref` optional
   - `schema` file required
2. `application/json`
   - raw schema object
   - or `{ schema_ref, schema_json }`

### 10.3 Runtime status semantics (current implementation truth)

1. `200` create success.
2. `200` idempotent success when same `schema_ref` + same `schema_uid`.
3. `409` conflict when same `schema_ref` + different `schema_uid`.
4. `409` conflict when same owner submits an existing `schema_uid` under a different `schema_ref`.
5. `400` invalid payload (including non-object schema JSON).
6. `405` wrong method.

### 10.4 `schema_ref` derivation when not provided

1. use `$id` tail if present;
2. else use `title`;
3. else fallback `"schema"`;
4. slugify:
   - lowercase
   - invalid chars -> `_`
   - trim leading/trailing `_`
   - collapse repeated `_`
   - truncate to 64 chars.

### 10.5 `schema_uid` derivation

1. canonicalize by recursively sorting object keys;
2. keep array order unchanged;
3. hash canonical JSON bytes with SHA-256 hex.

---

## 11) Route and IA Contracts

### 11.1 Existing routes (kept)

1. `/app/schemas`
2. `/app/schemas/advanced`
3. `/app/schemas/advanced/:schemaId`

### 11.2 New routes (Priority 7 design set)

1. `/app/schemas/start` (mode chooser)
2. `/app/schemas/wizard` (wizard create/edit)
3. `/app/schemas/templates` (template gallery, optional in P7 gate)
4. `/app/schemas/templates/:templateId` (template detail, optional in P7 gate)
5. `/app/schemas/apply` (optional post-save apply flow)

### 11.3 Global menu contract (left rail)

Priority 7 keeps `Schemas` as the main entry and may expose a dedicated `Schema Library` menu item when template browsing is promoted as a first-class path.

1. Keep `Schemas` -> `/app/schemas` as the primary schema workflow entry.
2. When template path is surfaced in global nav, add `Schema Library` -> `/app/schemas/templates`.
3. Active-state behavior must avoid double-highlight:
   - `Schema Library` active for `/app/schemas/templates*`
   - `Schemas` active for other `/app/schemas*` paths.

### 11.4 Local sub-menu contract (schema workflow)

Schema sub-navigation is local to the schema area (page-level nav/tabs/segmented control), not global left-rail expansion.

1. Required local entries in P7 core:
   - `Start` -> `/app/schemas/start`
   - `Wizard` -> `/app/schemas/wizard`
   - `Advanced` -> `/app/schemas/advanced`
2. Optional local entries (only when shipped):
   - `Templates` -> `/app/schemas/templates`
   - `Apply` -> `/app/schemas/apply`
3. Entry/exit rules:
   - `Create schema` from `/app/schemas` opens `/app/schemas/start`.
   - `Advanced editor` from `/app/schemas` opens `/app/schemas/advanced`.
   - `Back to list` from subflows returns `/app/schemas`.

---

## 12) Wizard Output Contract (Strict)

### 12.1 Wizard must enforce top-level compatibility

Generated `schema_jsonb` must include:

1. `type: "object"`
2. `properties: Record<string, JSONSchemaFragment>`
3. optional `required: string[]`
4. optional `additionalProperties` (default false)
5. optional `$id`, `title`, `description`
6. optional `prompt_config`

### 12.2 Supported JSON Schema subset for visual authoring

Per field supported subset:

1. Common:
   - `type`
   - `description`
   - `enum`
   - `default`
2. String:
   - `minLength`
   - `maxLength`
   - `pattern`
   - `format`
3. Number/integer:
   - `minimum`
   - `maximum`
   - `multipleOf`
4. Array:
   - `items` (single schema)
   - `minItems`
   - `maxItems`
5. Object:
   - `properties`
   - `required`
   - `additionalProperties`
6. Nullable:
   - union style `type: ["string", "null"]` (and equivalents)

### 12.3 Prompt config subset

`prompt_config` optional keys:

1. `system_instructions`
2. `per_block_prompt`
3. `model`
4. `temperature`
5. `max_tokens_per_block`
6. `max_batch_size` (allowed in schema artifact; runtime usage may differ by current worker policy stack)

---

## 13) Wizard Step UX Contracts (Exact)

Wizard steps are a recommended order, not a hard linear lock. Users may jump between steps; save action performs cross-step validation and routes users back to the step requiring correction.

### 13.1 Step 1 - Intent

Required:

1. Textbox: "What do you want to extract or annotate?" (free-text intent string).

Optional:

1. Sample document selector (selects a `conv_uid`) to power preview and AI assistance (when available).
2. Source metadata carried forward from branch controller (`template_id`, `schema_id`, `upload_name`).

### 13.2 Step 2 - Fields (Visual Editor)

Visual field editor is the primary authoring surface; live JSON preview is secondary.

Per-field controls:

1. `key` (required; must be unique within schema).
2. `type` (required; from supported subset in Section 12.2).
3. `description` (recommended; treated as per-field instruction prompt for worker).
4. `required` toggle.
5. Type-specific constraints:
   - enum: allowed values list.
   - string: `minLength`, `maxLength`, `pattern`, `format`.
   - number/integer: `minimum`, `maximum`, `multipleOf`.
   - array: `items` schema, `minItems`, `maxItems`.
   - object: nested `properties`, `required`, `additionalProperties`.
   - nullable: `type: ["string", "null"]` union toggle.

Field reordering (drag or move controls) is recommended but not gate-critical.

### 13.3 Step 3 - Prompt Config (Optional)

Controls:

1. `system_instructions` (textarea).
2. `per_block_prompt` (textarea).
3. Advanced section (collapsed by default):
   - `model` (dropdown).
   - `temperature` (slider/input).
   - `max_tokens_per_block` (input).

User may leave this step entirely blank; schema is valid for manual annotation without prompt config.

### 13.4 Step 4 - Preview

Must show:

1. Column header mock derived from top-level `properties` keys and types.
2. Full schema JSON preview (read-only).
3. Compatibility result: pass/warn based on Section 12.1 rules.

If sample `conv_uid` was selected in Step 1:

4. Show 1-3 sample blocks (read-only) beside the predicted column set.

AI-powered preview (run schema against sample blocks) is deferred to post-P7.

### 13.5 Step 5 - Save

Must show:

1. `schema_ref` slug input with format enforcement (`^[a-z0-9][a-z0-9_-]{0,63}$`).
2. Inline conflict guidance (if `409` is returned, show existing vs incoming and focus rename input).
3. Post-save choices:
   - return to schemas list.
   - continue to apply flow (if `/app/schemas/apply` is implemented).

### 13.6 JSON Escape Hatch (Within Wizard)

The wizard includes a JSON tab/editor that directly edits `schema_jsonb`:

1. If JSON is invalid: wizard blocks "Next" and "Save" and shows parse errors.
2. If JSON is valid but contains constructs outside the wizard's supported subset (Section 12.2): wizard preserves unknown keys intact but may disable the visual editor for unsupported parts.
3. Switching back to visual view after manual JSON edits must not silently drop unknown keys.

---

## 14) Branch Controller Contract (`/app/schemas/start`)

User chooses one mode:

1. Browse Templates
2. From Existing Schema
3. Start from Scratch
4. Upload JSON
5. Advanced Editor

All branches must converge to Section 10 save semantics.

---

## 15) Advanced Editor Embed Contract (No Drift)

### 15.1 Asset contract

Load:

1. `/meta-configurator-embed/meta-configurator-embed.css`
2. `/meta-configurator-embed/meta-configurator-embed.js`

### 15.2 Global mount contract

`window.MetaConfiguratorEmbed.mountSchemaEditor(el, { initialSchema, onChange })`

Must return:

1. `getSchemaJson()`
2. `setSchemaJson(schemaJson)`
3. `destroy()`

Host must call `destroy()` on unmount/navigation.

### 15.3 Styling/theming contract

1. No global CSS reset/preflight that breaks host app.
2. Advanced editor may differ visually but must support host dark/light mode behavior and host color-token control.

### 15.4 Persistence contract

Embed is editor-only; host performs schema persistence via `POST /schemas`.

---

## 16) Branch Pipeline Contracts (A-E)

### 16.1 Path A - Templates (optional for P7 gate)

1. Start chooser -> templates gallery.
2. Category filter + paginated cards.
3. Template detail (route or layer).
4. Apply -> wizard prefilled.
5. Save via `POST /schemas`.
6. End: user-owned saved schema.

### 16.2 Path B - Existing schema fork

1. Start chooser -> existing schema picker (user-owned only).
2. Default new ref suggestion `<old>_v2`.
3. Open in wizard prefilled or advanced prefilled.
4. Save via `POST /schemas`.
5. End: new schema artifact; original untouched.

### 16.3 Path C - Scratch wizard

1. Start chooser -> wizard scratch.
2. Step-by-step flow per Section 13: Intent -> Fields -> Prompt Config -> Preview -> Save.
3. Save via `POST /schemas`.
4. End: new schema artifact.

### 16.4 Path D - Upload JSON

1. Start chooser -> upload file.
2. Parse/classify:
   - invalid -> blocking error
   - compatible -> wizard prefill
   - advanced -> advanced editor prefill
3. Save via `POST /schemas`.
4. End: imported schema artifact.

### 16.5 Path E - Advanced editor direct

1. Start chooser -> advanced route.
2. Edit with compatibility warnings.
3. Save via `POST /schemas`.
4. End: saved artifact.

---

## 17) Template Data Contract (Optional P7, Required for Template Path)

`SchemaTemplate` (proposed contract for Phase 2):

```ts
type SchemaTemplate = {
  template_id: string;
  template_version: string;
  name: string;
  category: string;
  description: string;
  use_case_tags: string[];
  schema_json_seed: Record<string, unknown>;
  preview: {
    fields: Array<{ key: string; type: string; description?: string }>;
    use_case: string;
  };
};
```

Template ownership rule:

1. templates are read-only seeds;
2. applying a template always produces user-owned schema artifact via `POST /schemas`.

---

## 18) Grid Display, Edit, and Review Semantics Contract

### 18.1 Column derivation

For a selected run, derive overlay columns from `schemas.schema_jsonb.properties` keys (via `extractSchemaFields` in `web/src/lib/schema-fields.ts`).

Legacy note: the grid falls back to `schema_jsonb.fields` when `properties` is absent. This is legacy behavior; the wizard MUST output `properties` (not `fields`). The `fields` fallback exists for backward compatibility with older hand-authored schemas.

### 18.2 Value selection per overlay status

1. `status === 'confirmed'` -> display `overlay_jsonb_confirmed[k]`.
2. `status === 'ai_complete'` -> display `overlay_jsonb_staging[k]`.
3. any other status (`pending`, `claimed`, `failed`) -> blank/null.

### 18.3 Cell editing

1. Cells are editable only when `overlay.status === 'ai_complete'` (staged).
2. Edits write to `overlay_jsonb_staging` via `update_overlay_staging` RPC.
3. Type-aware value parsing (number, boolean, array/object JSON) is applied before write.

### 18.4 Review actions (existing implementation)

Per-block actions (available when `status === 'ai_complete'`):

1. **Confirm**: moves overlay from staged to confirmed via `confirm_overlays` RPC (copies staging -> confirmed).
2. **Reject to pending**: reverts overlay to `pending` via `reject_overlays_to_pending` RPC (clears staged data, block returns to worker queue).

Bulk actions:

3. **Confirm All Staged**: confirms all `ai_complete` overlays in the run in one call via `confirm_overlays` RPC (no `p_block_uids` argument = all staged).

### 18.5 Degradation when `properties` is missing

If `schema_jsonb.properties` is absent or not an object, the grid falls back to legacy `schema_jsonb.fields` if present and valid (Section 18.1). If neither `properties` nor legacy `fields` is a valid object, no overlay columns are derived. The grid still shows immutable block columns; overlay data columns are simply absent. This must be warned during authoring (Sections 12.1, 15).

---

## 19) AI Assistance Boundary Contract (Not in P7 Gate)

`schema-assist` and schema copilot are deferred.

If later implemented:

1. proposals only (never auto-save),
2. must preserve compatibility rules,
3. must remain isolated from user-key run-processing path.

---

## 20) Security and Ownership Contracts

1. schema flows require authenticated user.
2. user sees only own schemas in existing-schema picker.
3. template catalog is non-mutating from normal user flow.
4. save calls are host-controlled, including advanced editor flow.

---

## 21) Key File Map (Implementation Immersion)

Backend:

1. `supabase/functions/schemas/index.ts`

Frontend current:

1. `web/src/pages/Schemas.tsx`
2. `web/src/pages/SchemaAdvancedEditor.tsx`
3. `web/src/lib/metaConfiguratorEmbed.ts`
4. `web/src/lib/schema-fields.ts`
5. `web/src/components/blocks/BlockViewerGrid.tsx`
6. `web/src/router.tsx`
7. `web/src/pages/SchemaStart.tsx`
8. `web/src/pages/SchemaWizard.tsx`
9. `web/src/pages/SchemaTemplates.tsx`
10. `web/src/pages/SchemaTemplateDetail.tsx`
11. `web/src/components/schemas/SchemaWorkflowNav.tsx`
12. `web/src/lib/schemaTemplates.ts`
13. `web/src/components/shell/nav-config.ts`
14. `web/src/components/shell/LeftRail.tsx`

Primary reference docs:

1. `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
2. `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
3. `docs/ongoing-tasks/meta-configurator-integration/status.md`

---

## 22) Priority 7 Evidence Matrix

### 22.1 Gate-required evidence

1. scratch wizard save works (new schema listed).
2. existing-schema fork save works (new schema; source unchanged).
3. advanced editor save path remains working.
4. explicit conflict behavior:
   - `409` on same ref + different content
   - `409` on same owner + same content hash (`schema_uid`) under different ref
   - rename and retry success
   - idempotent `200` on same ref + same content
5. run/grid compatibility:
   - run created with wizard schema
   - grid columns from `properties`
   - staged/confirmed display behavior preserved.

### 22.2 Optional evidence (if template path shipped)

1. template apply -> wizard prefill -> save.
2. template-derived schema appears as user-owned artifact.

---

## 23) Implementation Phasing

### Phase 1 - Priority 7 gate closure

1. Upload classifier (Path D): parse `.json`, classify wizard-compatible vs advanced-required, then route deterministically.
2. Wizard nullable toggle support: allow authoring `type: ["<base>", "null"]` for supported base types.
3. Preview compatibility indicator: explicit pass/warn result against Section 12.1 rules in Step 4.
4. Nested object authoring parity: support nested `properties` in wizard subset or explicitly route unsupported nested structures to advanced editor with non-destructive preservation warning.
5. In-wizard JSON escape hatch: JSON tab with parse/error gating and unknown-key preservation per Section 13.6.
6. Re-verify existing fork + template prefill paths after steps 1-5.
7. Capture Section 22.1 evidence artifacts (scratch save, fork save, conflict cases, run/grid compatibility).
8. Update Priority 7 gate tracker and ledger only after evidence is reproducible.

### Phase 2 - Template path

1. template registry module
2. templates gallery + detail
3. apply -> wizard prefill
4. capture Section 22.2 evidence

### Phase 3 - Post-P7 extensions

1. schema-assist copilot
2. template admin lifecycle
3. deeper schema lineage/version UX

---

## 24) Out of Scope (Priority 7)

1. replacing internal embed widget stack,
2. template CMS workflows,
3. in-place mutation flow for referenced schema artifacts,
4. any assistant/KG/vector/MCP work.

---

## 25) Final Contract Summary

Priority 7 is successful when:

1. non-technical users can create compatible schemas in wizard-first flow,
2. power users retain advanced editor escape hatch,
3. all creation branches share deterministic `POST /schemas` behavior,
4. conflict/fork behavior is explicit and recoverable,
5. saved schemas reliably flow into run + grid behavior via top-level `properties`.

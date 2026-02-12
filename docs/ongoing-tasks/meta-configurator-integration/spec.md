# Schema Creation Wizard + Schema Co-Pilot — End-to-End Spec (v0)

**Status:** Reference-only for Priority 7 execution.  
**Priority 7 authority:** `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`

This spec is written to be end-to-end: Schema authoring → save → run uses schema → overlays display in the grid.

---

## 0) Product principle (non-negotiable)

Schema creation is **wizard-first** and **visual-first** for non-technical domain experts. Direct JSON authoring is the **escape hatch**, not the default.

---

## 1) Definitions (canonical terms)

- **Schema**: A user-owned JSON artifact stored in `schemas.schema_jsonb` that defines the per-block overlay fields for a run.
- **`schema_ref`**: User-facing slug/name (stored in `schemas.schema_ref`).
- **`schema_uid`**: Content hash of canonicalized JSON bytes (stored in `schemas.schema_uid`).
- **`schema_jsonb`**: The full schema JSON object (stored as JSONB; DB treats it as opaque).
- **`prompt_config`**: Optional section inside `schema_jsonb` that provides worker instructions and model defaults.
- **Run**: A binding of `conv_uid` + `schema_id` for one execution instance (`runs_v2`).
- **Overlay**: Per-block mutable data for a run (`block_overlays_v2.*overlay_jsonb*`), exported as `user_defined.data`.

---

## 2) System Requirements List (SRL)

SRL-1. Users can create a schema without writing JSON (wizard + visual field editor).

SRL-2. Users can edit the full schema JSON directly (power-user escape hatch).

SRL-3. Saved schemas persist in `schemas` with stable `schema_ref` + deterministic `schema_uid`.

SRL-4. Schema save is idempotent on identical content; conflicts on `(owner_id, schema_ref)` with different content are explicit and recoverable.

SRL-5. Schemas are provenance artifacts: editing defaults to **fork** (save as new schema), not in-place mutation of an in-use `schema_id`.

SRL-6. Schemas created in the wizard are compatible with the worker + grid conventions (Section 4).

SRL-7. The block viewer grid derives overlay columns from the schema and displays staged/confirmed overlay values for the selected run.

SRL-8. Platform-provided schema assistance exists and is strictly separated from user-provided API keys.

SRL-9. Advanced editor embed does not break Mantine styling and supports host-controlled theming (Section 5.4.2).

---

## 3) Data model / database constraints (Supabase)

### 3.1 `schemas` table (source of truth)

- `schema_id` UUID PK
- `owner_id` UUID NOT NULL
- `schema_ref` TEXT NOT NULL, format: `^[a-z0-9][a-z0-9_-]{0,63}$`, unique per owner
- `schema_uid` TEXT NOT NULL, format: `^[0-9a-f]{64}$`, unique per owner
- `schema_jsonb` JSONB NOT NULL (**opaque blob — DB does not inspect**)

### 3.2 Provenance / immutability

Runs reference `schema_id`. If `schema_jsonb` is mutated in-place for an existing `schema_id`, past runs now point to a different schema than the one they executed under.

Therefore:
- **Default edit action is fork:** “Save as new schema” (new `schema_id`).
- In-place replace is only allowed if the schema has **0** referencing rows in `runs_v2` (explicitly detected) and the user confirms replacement.

---

## 4) Schema artifact contract (`schemas.schema_jsonb`)

### 4.1 Baseline platform validation (hard boundary)

The platform enforces only:
- `schema_jsonb` must be a JSON object.
- `schema_ref` must be a valid slug (stored in DB column; can be derived if not explicitly provided).

Everything else is user-defined and opaque.

### 4.2 v0 conventions for worker + grid compatibility

To work end-to-end with the current worker/grid contract, wizard-produced schemas MUST satisfy:

1. `schema_jsonb.type` MUST be `"object"`.
2. `schema_jsonb.properties` MUST be an object whose keys are overlay field names.
3. Each top-level `properties[k]` MUST be a JSON Schema fragment (subset below).
4. `schema_jsonb.prompt_config` MAY be present.

Compatibility note:
- Some legacy examples use a top-level `fields` object. The grid may display `fields`, but the v0 worker contract is `properties`. The wizard MUST output `properties`.

### 4.3 Supported JSON Schema subset (wizard authoring)

Wizard MUST be able to produce:

- Top level:
  - `type: "object"`
  - `properties: { ... }`
  - `required: string[]` (optional)
  - `additionalProperties: boolean` (optional; default: `false`)
  - `$id`, `title`, `description` (optional but recommended)
- Per-field subset:
  - Common: `type`, `description`, `enum`, `default`
  - String: `minLength`, `maxLength`, `pattern`, `format`
  - Number/integer: `minimum`, `maximum`, `multipleOf`
  - Array: `items` (single schema), `minItems`, `maxItems`
  - Object: `properties`, `required`, `additionalProperties`
  - Nullable types: allow `type: ["string","null"]` etc.

### 4.4 `prompt_config` (schema-level worker instruction)

`schema_jsonb.prompt_config` is optional. When present, it is:

```json
{
  "prompt_config": {
    "system_instructions": "string",
    "per_block_prompt": "string",
    "model": "string",
    "temperature": 0.2,
    "max_tokens_per_block": 2000,
    "max_batch_size": 15
  }
}
```

Priority (model selection):
1. Request override (if present)
2. `schema_jsonb.prompt_config.model`
3. `runs_v2.model_config.model`
4. User defaults (Settings)
5. Platform defaults (env)

---

## 5) Schema Creation Wizard (UX spec)

### 5.1 Entry points

From the Schemas menu (`/app/schemas`):
- Primary action: **Create schema** → opens the wizard.
- Per-row action: **View / Edit** → opens the wizard in “edit mode” (preloaded), with fork-by-default save semantics.

### 5.2 Wizard structure (exact steps)

**Step 1 — Intent**
- One required textbox: “What do you want to extract or annotate?”
- Optional selector: “Use a sample document” (selects a `conv_uid`) to power preview and AI assistance.

**Step 2 — Fields**
- Visual field editor is primary.
- For each field:
  - `key` (required; unique within schema)
  - `type` (required)
  - `description` (recommended; treated as the per-field instruction prompt)
  - `required` toggle
  - Type-specific constraints (enum, min/max, items, nested properties)
- Live JSON preview exists but is secondary; user does not need to touch it.

**Step 3 — Prompt config (optional)**
- `system_instructions` (textarea)
- `per_block_prompt` (textarea)
- Advanced (collapsed by default): model, temperature, max tokens per block

**Step 4 — Preview**
- Always show the column preview: table header mock derived from the schema field keys/types.
- If a sample `conv_uid` is selected: show 1–3 sample blocks (read-only) and the predicted column set beside them.
- Optional AI preview (platform key): run the schema against 1–3 sample blocks and show suggested outputs (never auto-saved).

**Step 5 — Save**
- Required: `schema_ref` input (slug). The wizard enforces the slug format and shows conflicts clearly.
- Save action writes to the existing schema save boundary (Edge Function).
- Optional post-save CTA: “Apply to a document” (creates a run) — out of scope for v0 if it expands scope; include only if already trivial in the UI.

### 5.3 JSON escape hatch (power-user mode)

- A JSON tab/editor can directly edit the full `schema_jsonb`.
- Rules:
  - If JSON is invalid: wizard blocks “Next” and “Save” and shows parse errors.
  - If JSON is valid but doesn’t match the wizard’s supported subset: wizard preserves unknown keys, but may disable the visual editor for unsupported parts.

### 5.4 Advanced editor mode (MetaConfigurator-style split view)

In addition to the wizard, the Schemas menu offers an **Advanced editor** for power users working on complex schemas.

**UX:**
- Full-screen editor surface (not embedded in the wizard stepper).
- Split panels with:
  - **Text View** (raw JSON)
  - **GUI View** (property tree)
  - Optional: **Diagram View** (schema graph)
- Save is still the platform’s save flow (Section 5.6): the advanced editor does not bypass schema persistence rules.

**Contract with the rest of the platform (critical):**
- v0 worker execution reads **only**:
  - `schema_jsonb.prompt_config` (if present)
  - `schema_jsonb.properties` (for structured output shape)
- Therefore, the Advanced editor MUST warn if the current schema’s effective top-level `properties` is empty/missing.
- Advanced JSON Schema constructs (`allOf/anyOf/oneOf/$ref/$defs/conditionals`) may be editable/visualized, but they are **not interpreted by v0 worker** unless `properties` is explicitly present at the top level.

**Implementation requirement (no iframe):**
- Reuse MetaConfigurator’s schema editor UI as a **mounted Vue island** (micro-frontend) that runs on a dedicated route.
- React/Mantine remains the owner of:
  - schema load (by `schema_id`)
  - schema save (calls `POST /schemas`)
  - conflict handling (`409`)
  - provenance (fork-by-default)
- The mounted editor is a pure client-side editor:
  - Input: initial `schema_jsonb` object
  - Output: updated `schema_jsonb` object via a callback/event
  - No direct DB writes from the Vue editor

#### 5.4.1 Embed contract (exact)

- The Advanced editor route loads **two static assets**:
  - `/meta-configurator-embed/meta-configurator-embed.css`
  - `/meta-configurator-embed/meta-configurator-embed.js`
- The JS registers a global:
  - `window.MetaConfiguratorEmbed.mountSchemaEditor(el, { initialSchema, onChange })`
  - Returns `{ getSchemaJson(), setSchemaJson(schemaJson), destroy() }`
- The host MUST call `destroy()` on navigation/unmount.
- Host-owned persistence:
  - Save uses `POST /schemas` (Section 5.7).
  - The embedded editor never writes to Supabase directly.

#### 5.4.2 UI theming + upgrades (requirement)

- v0 requirement is **no visual breakage** of the React/Mantine app:
  - The embedded editor CSS MUST NOT include global CSS resets (e.g., Tailwind preflight).
- The Advanced editor UI MAY differ from Mantine in v0, but MUST support:
  - system dark/light (or an explicit host-provided mode)
  - host-controlled primary color (via theme tokens / CSS variables)
- UI replacement scope:
  - Replacing MetaConfigurator’s internal PrimeVue widgets (e.g., TreeTable) with AG Grid is a **fork** and out of scope for v0.
  - AG Grid is permitted/preferred for React/Mantine surfaces (wizard tables, previews, column mocks).

### 5.5 Edit mode behavior (wizard; fork-by-default)

When opening an existing schema in the wizard:
- The user can modify it.
- Default save button is: **Save as new schema**.
- If the user attempts to save back to the same `schema_ref` with modified content, the backend conflict path (`409`) is shown, and the wizard offers “Save with a new schema_ref”.

### 5.6 Edit mode behavior in advanced editor (fork-by-default)

When opening an existing schema in the Advanced editor:
- The user can modify it.
- Default save is **Save as new schema** (fork) with a new `schema_ref`.
- Attempting to save with the same `schema_ref` and different content produces `409` and a guided rename flow.

### 5.7 Persistence boundary: `POST /schemas` (exact contract)

All schema persistence goes through the existing `schemas` Edge Function.

**Method:** `POST`

**Request formats (both supported):**

1) `multipart/form-data`
- `schema_ref` (optional string) — user-chosen slug
- `schema` (required file) — JSON file contents

2) `application/json`
- Either a raw schema JSON object, **or** an object wrapper:
  - `{ "schema_ref": "optional", "schema_json": { ... } }`

**Behavior (idempotency + conflicts):**

- If `(owner_id, schema_ref)` does not exist: insert and return `200` with `{ schema_id, schema_ref, schema_uid, created_at }`.
- If `(owner_id, schema_ref)` exists and uploaded content produces the same `schema_uid`: return `200` with the existing row.
- If `(owner_id, schema_ref)` exists but uploaded content produces a different `schema_uid`: return `409` with a conflict payload.

**`schema_ref` derivation (when not provided):**
- If `$id` exists, use the tail segment (split on `:` and `/`) as the base; else if `title` exists, use it; else `"schema"`.
- Slugify:
  - lowercase
  - replace invalid chars with `_`
  - trim leading/trailing `_`
  - collapse multiple `_`
  - truncate to 64 chars

**`schema_uid` derivation (deterministic):**
- Canonicalize the schema JSON by recursively sorting object keys (arrays preserve order).
- `schema_uid = sha256_hex(JSON.stringify(canonicalized_schema_json))`

---

## 6) Platform-provided Schema Co-Pilot (v0)

### 6.1 Boundary: two AI systems (hard separation)

- **User-provided API keys** (Settings) are used for **annotation runs**.
- **Platform-provided schema assistance** uses a **platform key** and must never read or require `user_api_keys`.

### 6.2 `schema-assist` Edge Function (contract)

Endpoint: `POST /schema-assist`

Auth:
- Requires a logged-in user JWT (same as other app functions).

Request:
```json
{
  "operation": "suggest_fields" | "suggest_prompts" | "modify_schema" | "question",
  "intent": "string",
  "current_schema_json": {},
  "sample_blocks": [
    { "block_type": "paragraph", "block_content": "..." }
  ]
}
```

Response:
- For suggest/modify: `{ "suggested_schema_json": { ... } }`
- For question: `{ "answer": "..." }`

Hard requirements:
- JSON-only responses (no Markdown code fences).
- `suggested_schema_json`, when present, MUST satisfy the v0 compatibility conventions (Section 4.2).
- The function MUST NOT call the user-key infrastructure.

Rate limiting (v0):
- Per-user throttling; return `429` when exceeded.

UX rules:
- Co-Pilot output is always presented as a **proposal**.
- User must click “Apply” to merge suggestions into the working draft.
- Co-Pilot must never directly save schemas.

---

## 7) How schema JSONB becomes grid columns (display spec)

For a selected run:

1. The frontend reads `schemas.schema_jsonb` for that run (via run → schema join).
2. The grid derives overlay columns from `schema_jsonb.properties` keys:
   - Each key becomes a column (header uses the key; optional description shown in tooltip).
3. Row values come from `block_overlays_v2`:
   - If `status = 'confirmed'`: display `overlay_jsonb_confirmed[k]`
   - If `status = 'ai_complete'`: display `overlay_jsonb_staging[k]`
   - Otherwise: blank/null

Editing rule (v0):
- Users can edit overlay cells only while the row is staged (`status = 'ai_complete'`).
- Cell edits update `overlay_jsonb_staging` for that `(run_id, block_uid)`.
- Confirm actions copy staging → confirmed (per existing confirm RPC semantics).

---

## 8) Acceptance criteria (end-to-end)

AC-1. A user can create a schema using the wizard’s visual editor and save it.

AC-2. The saved schema appears in Schemas list with stable `schema_ref` and deterministic `schema_uid`.

AC-3. A run using the schema produces overlay data that renders as grid columns derived from `schema_jsonb.properties`.

AC-4. Editing a schema defaults to fork; saving with a conflicting `schema_ref` yields a clear, recoverable conflict path.

AC-5. (If enabled) Schema Co-Pilot can propose fields/prompts/schema modifications, and the user can apply them without breaking v0 compatibility.

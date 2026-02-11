# Requirements: Schema Wizard + AI-Assisted Schema Creation

**Filed:** 2026-02-10
**Status:** Draft requirements
**Priority:** High (user-facing feature gap — currently schemas must be hand-authored as JSON)

---

## Problem

Today, creating a user-defined schema requires:
1. Writing a JSON object by hand (with `schema_ref`, `properties`, optionally `prompt_config`)
2. Uploading it via the Schemas page (raw JSON file upload)

This works for developers but is unusable for non-technical users. There's no guidance on what fields make sense for a given document type, no validation beyond "is it valid JSON with a `schema_ref`", and no way to iterate on a schema without re-uploading.

---

## Proposed Solution: Schema Builder Wizard

A multi-step wizard on the Schemas page that guides users from intent to deployed schema, with optional AI assistance.

### Step 1: Intent Capture

**Question:** "What do you want to extract or annotate?"

- Free-text description of the task (e.g., "I want to classify each paragraph by rhetorical function and extract key legal citations")
- Optional: select a document from an existing project as a reference sample
- Optional: select a template/starting point from a gallery of common schema patterns

**Output:** A natural-language intent string + optional reference document `conv_uid`.

### Step 2: Field Definition (Manual or AI-Assisted)

**Manual path:**
- Interactive form to add fields one at a time
- Per field: name (key), type (string/number/boolean/enum/array/object), description, required?
- For enum types: add allowed values
- For string types: optional max length hint
- Drag to reorder fields
- Live JSON preview on the right side

**AI-assisted path (requires AI connection):**
- User clicks "Suggest fields from description"
- System sends the intent from Step 1 (and optionally a sample block's content) to an LLM
- LLM returns a proposed field list with types, descriptions, and enum values
- User reviews, edits, adds/removes fields
- Can iterate: "Add a field for sentiment" → AI adds it to the draft

**Combined:** Both paths feed the same field editor. AI suggestions populate the form; user always has final edit control.

### Step 3: Prompt Configuration (Optional, AI-Assisted)

If the user wants the AI worker to fill overlays automatically:

- **System instructions:** What persona/context should the AI use? (e.g., "You are a legal analyst reviewing Supreme Court opinions")
- **Per-block prompt:** What should the AI do with each block? (e.g., "For this paragraph, extract the following fields: ...")
- **Model selection:** dropdown (claude-sonnet-4-5, claude-haiku-4-5, etc.)
- **Temperature / max tokens:** advanced settings, collapsed by default

**AI-assisted:** If user provided intent in Step 1, auto-generate a draft system prompt and per-block prompt. User reviews and edits.

**Without AI:** User writes prompts manually or leaves blank (schema is still valid for manual annotation).

### Step 4: Preview + Validation

- Full JSON preview of the schema artifact
- Structural validation: is JSON object? has `schema_ref`? properties are well-formed?
- If a reference document was selected: show a mock of what the grid would look like with these columns
- Optional: run the schema against 1-3 sample blocks using the AI worker to preview output quality

### Step 5: Save + Apply

- Save schema (calls existing `POST /schemas` edge function)
- Optional: immediately apply to a project or document ("Apply to project X" button)
- Returns to schema detail page or back to project

---

## AI Connection Requirements

The wizard's AI-assisted features require an LLM API connection. This has broader implications beyond the wizard.

### What Needs AI

| Feature | AI Role | Blocking? |
|---|---|---|
| Schema wizard: field suggestions | Generate field definitions from intent description | No — manual path works without AI |
| Schema wizard: prompt generation | Draft system/per-block prompts from intent | No — user can write manually |
| Schema wizard: preview run | Process sample blocks with draft schema | No — preview is optional |
| Worker: overlay generation | Process all blocks in a run | Yes — worker is the primary AI consumer |
| Future: schema refinement chat | Iterate on schema via conversation | No — nice-to-have |

### AI Connection Architecture

**Current state:** The `worker` edge function already has the Anthropic Messages API integration (`ANTHROPIC_API_KEY` secret). It uses `tool_use` for structured output constrained by the schema's properties.

**What's needed for the wizard:**

1. **A lightweight LLM endpoint** — either:
   - A new edge function `schema-assist` that accepts intent + optional sample blocks and returns suggested fields/prompts
   - Or client-side API call from the browser (requires exposing an API key or proxy)

2. **Recommended: new edge function `schema-assist`**
   - `POST /schema-assist` with JWT auth
   - Accepts: `{ intent: string, sample_blocks?: string[], current_fields?: SchemaField[] }`
   - Returns: `{ suggested_fields: SchemaField[], system_prompt?: string, per_block_prompt?: string }`
   - Uses the same `ANTHROPIC_API_KEY` as the worker
   - Rate-limited per user (schema creation is infrequent)

3. **API key management** — For now, platform-managed key (same as worker). Future: user-provided keys for higher usage.

### Setting Up the AI Connection

Before any AI features work (wizard or worker), these steps are needed:

1. Set `ANTHROPIC_API_KEY` in Supabase Edge Function secrets
2. The `worker` edge function is already deployed and ready
3. Deploy `schema-assist` edge function (new, for wizard)
4. Test: create a run → trigger worker → overlays reach `ai_complete`

---

## Schema Gallery (Future Enhancement)

A library of pre-built schema templates that users can browse and fork:

| Template | Use Case | Fields |
|---|---|---|
| `close_reading_v1` | Literary/legal close reading | rhetorical_function, key_claims, evidence_type, confidence |
| `prose_editor_v1` | Writing improvement | revised_content, issues_found, strunk_rules_violated |
| `entity_extraction_v1` | NER from paragraphs | entities (array), entity_types, relationships |
| `contract_review_v1` | Legal contract analysis | clause_type, risk_level, obligations, parties |
| `research_coding_v1` | Qualitative research coding | codes (array), themes, memo |

Users click "Use template" → pre-populates the wizard with fields and prompts → customize → save.

---

## Scope for Initial Implementation

**MVP (no AI required):**
- Step 2 manual field editor (form-based, no JSON hand-authoring)
- Step 4 JSON preview + validation
- Step 5 save
- Replace the current raw-JSON upload with this wizard

**V2 (requires AI connection):**
- Step 1 intent capture
- Step 2 AI-assisted field suggestions
- Step 3 AI-assisted prompt generation
- Step 4 preview run against sample blocks

**V3 (future):**
- Schema gallery / templates
- Schema versioning (fork + edit an existing schema)
- Schema refinement chat ("make the sentiment field an enum instead of a string")

---

## Dependencies

| Dependency | Status | Blocking? |
|---|---|---|
| `ANTHROPIC_API_KEY` in Supabase secrets | Not set | Blocks V2 (AI features) |
| `worker` edge function | Deployed, untested live | Blocks preview runs |
| `schema-assist` edge function | Not built | Blocks V2 (AI features) |
| Existing `POST /schemas` endpoint | Working | No — MVP save uses this |
| Schema field type system | Defined in `schema-fields.ts` | No — reuse for wizard form |

---

## Key Files

| File | Role |
|---|---|
| `web/src/pages/Schemas.tsx` | Current schemas page (list + raw JSON upload) |
| `web/src/lib/schema-fields.ts` | Extracts field metadata from schema JSON (types, enums) |
| `supabase/functions/schemas/index.ts` | Schema upload edge function |
| `supabase/functions/worker/index.ts` | AI worker (reference for LLM integration pattern) |

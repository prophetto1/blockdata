# Extract Feature — Structured Data Extraction from Documents

**Revision 2** — addresses all findings from `docs/assessments/2026-03-14-extract-feature-design-assessment.mdx`

## Context

The platform has a fully developed Parse workbench but Extract is placeholder-only (`web/src/pages/useExtractWorkbench.tsx:163-285`). The goal is to build a LlamaParse-style structured extraction workbench.

## Engine Decision: Parse-First Extraction (Not Docling DocumentExtractor)

Docling's `DocumentExtractor` is a beta API with unverified provider support (no documented Anthropic path, requires `docling[vlm]` runtime). The platform already has:

- **Parsed artifacts in Supabase** — DoclingDocument JSON, markdown, and blocks for every parsed document
- **Production LLM call layer** — `callLLM` / `callLLMBatch` in `supabase/functions/worker/index.ts` using tool-use structured output via Vertex AI and LiteLLM
- **Provider infrastructure** — `providerRegistry.tsx` with Anthropic, OpenAI, Google, Custom; encrypted keys in `user_api_keys` via AES-GCM (`supabase/functions/_shared/api_key_crypto.ts`)

**The extraction path is:** take already-parsed document content (markdown or blocks from Supabase storage) → send to the user's configured LLM with the extraction schema as a tool definition → store structured results.

No Cloud Run changes. No new Python service code. No `docling[vlm]` dependency. Extraction runs entirely in edge functions using the existing LLM call infrastructure.

### Provider Capability Matrix

| Provider | Auth Mechanism | Structured Output | Extraction Support |
|----------|---------------|-------------------|-------------------|
| Anthropic | API key from `user_api_keys` (AES-GCM encrypted) | Tool use (`tool_choice: { type: "tool" }`) | Full |
| OpenAI | API key from `user_api_keys` | Function calling | Full |
| Google | API key from `user_api_keys` | Tool use | Full |
| Custom | API key + base_url from `user_api_keys` | OpenAI-compatible function calling | Best-effort |
| Vertex AI | GCP service account (platform-managed) | Tool use | Full (default if no user key) |

### Supported File Formats

Extraction works on any document that has been successfully parsed (`source_documents.status = 'parsed'`). The format constraint is at the Parse layer, not Extract. Unparsed or failed documents are not selectable in the Extract workbench.

---

## Phase 1: Database

**Migration:** `supabase/migrations/20260315010000_extraction_tables.sql`

### `extraction_schemas`

```sql
CREATE TABLE extraction_schemas (
  schema_uid   TEXT PRIMARY KEY,
  owner_id     UUID NOT NULL REFERENCES auth.users(id),
  project_id   TEXT REFERENCES projects(project_id),
  schema_name  TEXT NOT NULL,
  schema_body  JSONB NOT NULL,
  extraction_target TEXT NOT NULL DEFAULT 'document'
    CHECK (extraction_target IN ('page', 'document')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE extraction_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY extraction_schemas_select_own ON extraction_schemas
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY extraction_schemas_insert_own ON extraction_schemas
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY extraction_schemas_update_own ON extraction_schemas
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY extraction_schemas_delete_own ON extraction_schemas
  FOR DELETE USING (owner_id = auth.uid());
```

`schema_body` stores JSON Schema with extended properties. Supported subset:

```jsonc
{
  "type": "object",
  "properties": {
    "invoice_number": {
      "type": "string",
      "description": "The invoice or receipt number",  // LLM extraction hint
      "examples": ["INV-2024-001", "RC-5512"]          // few-shot examples
    },
    "total": {
      "type": "number",
      "description": "Total amount due"
    },
    "line_items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "quantity": { "type": "integer" },
          "unit_price": { "type": "number" }
        }
      }
    }
  },
  "required": ["invoice_number"],
  "propertyOrdering": ["invoice_number", "total", "line_items"]
}
```

**Supported types:** `string`, `number`, `integer`, `boolean`, `object` (nested), `array`, `enum`.
**Extended fields per property:** `description` (extraction hint), `examples` (few-shot).
These map directly to the tool `input_schema` sent to the LLM.

### `extraction_jobs`

```sql
CREATE TABLE extraction_jobs (
  job_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id),
  schema_uid   TEXT NOT NULL REFERENCES extraction_schemas(schema_uid),
  source_uid   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  llm_provider TEXT NOT NULL,
  llm_model    TEXT NOT NULL,
  config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  error        TEXT,
  token_usage  JSONB,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE extraction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY extraction_jobs_select_own ON extraction_jobs
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY extraction_jobs_insert_own ON extraction_jobs
  FOR INSERT WITH CHECK (owner_id = auth.uid());
```

Jobs do NOT mutate `source_documents.status`. Extraction is non-destructive — it reads parsed artifacts but does not alter the document lifecycle.

### `extraction_results`

```sql
CREATE TABLE extraction_results (
  result_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES extraction_jobs(job_id) ON DELETE CASCADE,
  page_number    INTEGER,
  extracted_data JSONB NOT NULL,
  raw_response   JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY extraction_results_select_own ON extraction_results
  FOR SELECT USING (
    job_id IN (SELECT job_id FROM extraction_jobs WHERE owner_id = auth.uid())
  );
```

Add all three tables to realtime publication for live status updates.

**Types in `web/src/lib/types.ts`:**

```typescript
export type ExtractionSchemaRow = {
  schema_uid: string;
  owner_id: string;
  project_id: string | null;
  schema_name: string;
  schema_body: Record<string, unknown>;
  extraction_target: 'page' | 'document';
  created_at: string;
  updated_at: string;
};

export type ExtractionJobRow = {
  job_id: string;
  owner_id: string;
  schema_uid: string;
  source_uid: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  llm_provider: string;
  llm_model: string;
  config_jsonb: Record<string, unknown>;
  error: string | null;
  token_usage: { input_tokens?: number; output_tokens?: number } | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ExtractionResultRow = {
  result_id: string;
  job_id: string;
  page_number: number | null;
  extracted_data: Record<string, unknown>;
  raw_response: Record<string, unknown> | null;
  created_at: string;
};
```

---

## Phase 2: Backend — Edge Function Extraction (No Cloud Run)

Extraction runs entirely in Supabase edge functions. No platform-api changes needed.

### `supabase/functions/run-extract/index.ts`

Single edge function that handles the full extraction lifecycle. Not a trigger+callback pair — extraction is a synchronous LLM call (seconds, not minutes like Docling parsing).

**Request:** `POST` with auth token.

```typescript
{ source_uid: string, schema_uid: string, provider?: string, model?: string, temperature?: number }
```

**Flow:**

1. **Auth & validation**
   - `requireUserId(req)` — get owner_id from JWT
   - Load schema from `extraction_schemas` where `schema_uid` and `owner_id` match
   - Load document from `source_documents` — verify `owner_id` match and `status = 'parsed'`
   - Reject if document status is not `parsed`

2. **Resolve provider & key**
   - Use requested provider or fall back to user's default from `user_api_keys`
   - Decrypt API key using `decryptSecret()` from `_shared/api_key_crypto.ts`
   - Key never leaves the edge function; never logged; never stored in job row

3. **Load document content**
   - For document-level: load markdown from `conversion_representations` (type `markdown_bytes`), download from storage, decode to text
   - For page-level: load DoclingDocument JSON from storage, split content by page using provenance metadata (same logic as `doclingNativeItems.ts`)

4. **Create job row** — `extraction_jobs` with status `running`, `started_at = now()`

5. **Call LLM** — reuse `callVertexClaude` or provider-specific call from `_shared/`
   - Tool definition: `{ name: "extract_fields", input_schema: schema_body }`
   - System prompt: "Extract the requested fields from the following document content. Return only the values found in the document."
   - User message: document content (markdown text)
   - `tool_choice: { type: "tool", name: "extract_fields" }`
   - For page-level: one LLM call per page, each with that page's content

6. **Store results**
   - Parse tool use response → `extracted_data`
   - Insert into `extraction_results` (one row for document-level, N rows for page-level)
   - Update `extraction_jobs`: status `complete`, `completed_at`, `token_usage`

7. **Error handling**
   - LLM errors: update job status to `failed`, store error message (redact any key material)
   - Timeout: edge function has 60s default; for large documents, extraction may need chunking (future enhancement)

**Idempotency:** If a job already exists for the same `source_uid + schema_uid` with status `complete`, return existing results. Re-extraction creates a new job (no upsert).

**Differences from trigger-parse:**
- Does NOT mutate `source_documents.status`
- Does NOT delete/clean up storage artifacts
- Does NOT create signed upload URLs
- Does NOT use a callback pattern — synchronous response
- Has its own job table (`extraction_jobs`), not conversion_parsing

### Secret Flow

```
Browser → (JWT auth header) → run-extract edge fn
  → queries user_api_keys for provider
  → decryptSecret(encrypted_key, "user-api-keys-v1")
  → passes plaintext key to LLM API call
  → key discarded after call (never in job row, never logged)
```

The browser never handles raw provider secrets. Keys are encrypted at rest in `user_api_keys` and decrypted only in the edge function for the duration of the API call.

---

## Phase 3: Frontend — Schema Management

### Schema builder extensions

The current `Schemas.tsx` (`web/src/pages/Schemas.tsx:23-149`) supports: `string`, `number`, `integer`, `boolean`, `object`, `enum`, arrays, required, ordering.

**Extend `SchemaField` type** to add:

```typescript
type SchemaField = {
  id: string;
  name: string;
  type: SchemaFieldType;
  required: boolean;
  isArray: boolean;
  enumValues: string[];
  children: SchemaField[];
  description: string;   // NEW — extraction hint for LLM
  examples: string[];    // NEW — few-shot examples
};
```

**Extend `buildObjectSchema()`** to emit `description` and `examples` per property.
**Extend `parseObjectSchemaToFields()`** to read them back.

These extensions are additive — existing schema usage in the Schemas page is unaffected (description/examples default to empty).

### New files:

- `web/src/lib/extractionSchemaHelpers.ts` — schema uid generation (sha256 of `schema_body`), validation
- `web/src/hooks/useExtractionSchemas.ts` — CRUD against `extraction_schemas` table
- `web/src/pages/extract/ExtractionSchemaPanel.tsx` — three-mode panel:
  - **Visual** — extended field builder with description + examples fields
  - **Code** — Monaco JSON Schema editor
  - **AI Generate** — uses document markdown (from `conversion_representations`) as input to LLM, asks for a JSON Schema suggestion, loads result into visual builder

### AI schema generation

New edge function: `supabase/functions/suggest-extraction-schema/index.ts`

- Input: `{ source_uid }` + auth
- Loads the document's **markdown** from `conversion_representations` (type `markdown_bytes`) — reuses existing parse artifacts, no re-processing
- Sends first 8000 tokens to user's LLM with prompt: "Analyze this document and suggest a JSON Schema for extracting its key structured data"
- Returns JSON Schema that the frontend loads into the visual builder for editing

---

## Phase 4: Frontend — Extract Workbench Overhaul

### Primary file: `web/src/pages/useExtractWorkbench.tsx`

### Migration from current placeholder

Current tabs (`useExtractWorkbench.tsx:163-176`):
- `File List` → **Keep**, add parsed-only filter
- `Extract Config` → **Replace** with `Config` (LLM settings + run button)
- `Extract Targets` → **Remove** (replaced by schema target toggle)
- `Badges` → **Remove** (placeholder concept, not wired)
- `Token` → **Remove** (placeholder concept, not wired)
- `Contracts` → **Remove** (placeholder concept, not wired)
- **Add** `Schema` tab
- **Add** `Results` tab
- **Add** `JSON` tab

New layout:

```typescript
export const EXTRACT_TABS: WorkbenchTab[] = [
  { id: 'extract-files',   label: 'File List', icon: IconFileCode },
  { id: 'extract-schema',  label: 'Schema',    icon: IconBraces },
  { id: 'extract-config',  label: 'Config',    icon: IconSettings },
  { id: 'extract-results', label: 'Results',   icon: IconLayoutList },
  { id: 'extract-json',    label: 'JSON',      icon: IconFileText },
];

export const EXTRACT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-files',   tabs: ['extract-files'],                    activeTab: 'extract-files',   width: 28 },
  { id: 'pane-schema',  tabs: ['extract-schema', 'extract-config'], activeTab: 'extract-schema',  width: 32 },
  { id: 'pane-results', tabs: ['extract-results', 'extract-json'],  activeTab: 'extract-results', width: 40 },
]);
```

### Parsed-only document filter

`useProjectDocuments` (`web/src/hooks/useProjectDocuments.ts:12-20`) loads all documents. Extract needs only parsed ones.

**Approach:** Apply a local filter in the workbench hook, not modify the shared hook:

```typescript
const parsedDocs = useMemo(() => docs.filter(d => d.status === 'parsed'), [docs]);
```

This preserves the shared hook contract and avoids breaking Parse (which shows all statuses). Documents in other states are simply not visible in Extract's file list.

### Tab contents

| Tab | Component | Behavior |
|-----|-----------|----------|
| File List | `DocumentFileTable` with `parsedDocs` | Only shows parsed documents. Empty state: "No parsed documents. Parse a document first." |
| Schema | `ExtractionSchemaPanel` | Schema selector dropdown, Visual/Code/AI mode tabs, extraction target toggle (Page/Document), save/duplicate/delete |
| Config | `ExtractConfigPanel` | Provider dropdown (from `user_api_keys`), model selector, temperature slider. "Run Extraction" button (disabled until schema + document selected). If no API keys: link to `/app/settings/ai` |
| Results | `ExtractResultsPanel` | Document-level: single card with field name/value pairs. Page-level: accordion per page. Shows job status (pending/running) with spinner. Empty state when no extraction run yet |
| JSON | Monaco read-only | Raw `extracted_data` JSONB from results. Toggle between per-page and merged views |

### New hooks

- `web/src/hooks/useExtractionSchemas.ts` — list, create, update, delete schemas for current project
- `web/src/hooks/useExtractionJobs.ts` — submit extraction via `run-extract` edge function, realtime subscription on `extraction_jobs` for status
- `web/src/hooks/useExtractionResults.ts` — fetch from `extraction_results` for a given job_id

---

## Phase 5: Settings Integration

No new settings page. The Config tab reads from existing `user_api_keys` + `providerRegistry.tsx`. If no keys configured, show: "Configure an AI provider in Settings > AI Providers to run extractions."

---

## Implementation Order

1. Database migration + TypeScript types
2. `run-extract` edge function + `suggest-extraction-schema` edge function
3. Schema builder extensions (description, examples) + `ExtractionSchemaPanel`
4. Extraction hooks (`useExtractionSchemas`, `useExtractionJobs`, `useExtractionResults`)
5. Extract workbench overhaul (replace placeholder tabs, wire hooks)

---

## Verification

### Happy path
1. **Database:** Apply migration, verify tables + RLS with `supabase db reset`
2. **Schema CRUD:** Create/edit/delete extraction schema via UI, verify in DB
3. **Extraction run:** Select parsed document + schema → Run Extraction → verify results render
4. **Page-level:** Toggle extraction target to Page, run, verify per-page accordion
5. **AI schema:** Click AI Generate on a parsed document, verify suggested schema loads

### Failure modes
6. **No API key:** Attempt extraction without configured provider → verify clear error message
7. **Unparsed document:** Verify unparsed docs don't appear in Extract file list
8. **LLM error:** Simulate bad API key → verify job status `failed` with error, no key material in error message
9. **Duplicate extraction:** Re-run same schema on same document → verify new job created (not upsert)

### Security
10. **Key redaction:** Inspect `extraction_jobs` rows → verify no API key material stored
11. **RLS:** Query `extraction_schemas/jobs/results` as different user → verify no cross-user access

---

## Critical File Paths

| Purpose | Path |
|---------|------|
| Worker LLM call pattern (reuse) | `supabase/functions/worker/index.ts` |
| Key encryption (reuse) | `supabase/functions/_shared/api_key_crypto.ts` |
| Provider registry (reuse) | `web/src/components/agents/providerRegistry.tsx` |
| Schema builder (extend) | `web/src/pages/Schemas.tsx` |
| Parse workbench (pattern) | `web/src/pages/useParseWorkbench.tsx` |
| Parse artifacts (pattern) | `web/src/pages/parseArtifacts.ts` |
| Docling native items (page splitting) | `web/src/lib/doclingNativeItems.ts` |
| Project documents hook (filter) | `web/src/hooks/useProjectDocuments.ts` |
| Extract workbench (overhaul) | `web/src/pages/useExtractWorkbench.tsx` |
| Extract page (modify) | `web/src/pages/ExtractPage.tsx` |
| TypeScript types (extend) | `web/src/lib/types.ts` |
| Trigger-parse (lifecycle contrast) | `supabase/functions/trigger-parse/index.ts` |
| Conversion-complete (lifecycle contrast) | `supabase/functions/conversion-complete/index.ts` |

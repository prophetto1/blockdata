# Extract Feature — Structured Data Extraction from Documents

## Context

The platform has a fully developed **Parse** workbench but **Extract** is placeholder-only — UI shells exist but no backend or extraction logic is wired. The user wants to build extraction functionality similar to LlamaParse's Extract feature, powered by Docling's `DocumentExtractor` API calling external LLMs (OpenAI/Anthropic).

**User choices:**
- LLM backend: Cloud Run + OpenAI/Anthropic API
- Extraction targets: Document-level + Page-level
- Schema UX: Visual builder + raw JSON editor + AI auto-generate

## Key Docling API

```python
from docling.document_extractor import DocumentExtractor
from docling.datamodel.base_models import InputFormat

extractor = DocumentExtractor(allowed_formats=[InputFormat.IMAGE, InputFormat.PDF])

# Dict template
result = extractor.extract(source=file_path, template={"bill_no": "string", "total": "float"})
result.pages  # results organized by page

# Pydantic template
result = extractor.extract(source=file_path, template=Invoice)
invoice = Invoice.model_validate(result.pages[0].extracted_data)
```

---

## Phase 1: Database

**Migration:** `supabase/migrations/20260315010000_extraction_tables.sql`

### `extraction_schemas`
| Column | Type | Notes |
|--------|------|-------|
| schema_uid | TEXT PK | sha256 hash |
| owner_id | UUID FK auth.users | |
| project_id | TEXT FK nullable | null = global |
| schema_name | TEXT | |
| schema_body | JSONB | JSON Schema format (canonical) |
| extraction_target | TEXT | `'page'` or `'document'` |
| created_at / updated_at | TIMESTAMPTZ | |

### `extraction_jobs`
| Column | Type | Notes |
|--------|------|-------|
| job_id | UUID PK | |
| owner_id | UUID FK | |
| schema_uid | TEXT FK | |
| source_uid | TEXT | document being extracted |
| status | TEXT | pending / running / complete / failed |
| llm_provider | TEXT | openai / anthropic |
| llm_model | TEXT | |
| config_jsonb | JSONB | temperature, etc. |
| error | TEXT | |
| timestamps | TIMESTAMPTZ | created, started, completed |

### `extraction_results`
| Column | Type | Notes |
|--------|------|-------|
| result_id | UUID PK | |
| job_id | UUID FK CASCADE | |
| page_number | INTEGER nullable | null for document-level |
| extracted_data | JSONB | |
| raw_response | JSONB nullable | LLM debug |

RLS: owner-based (`auth.uid() = owner_id`), same pattern as `source_documents`.

**Types:** Add `ExtractionSchemaRow`, `ExtractionJobRow`, `ExtractionResultRow` to `web/src/lib/types.ts`.

---

## Phase 2: Backend — Cloud Run `/extract` endpoint

### Files to create/modify:
- **New:** `services/platform-api/app/api/routes/extraction.py`
- **New:** `services/platform-api/app/domain/extraction/models.py`
- **New:** `services/platform-api/app/domain/extraction/service.py`
- **Modify:** `services/platform-api/app/main.py` — mount extraction router
- **Modify:** `services/platform-api/requirements.txt` — ensure `docling` version includes `DocumentExtractor`

### `POST /extract` — follows same pattern as `/convert` in `conversion.py`

Request model:
```python
class ExtractRequest(BaseModel):
    source_uid: str
    source_download_url: str       # signed URL
    schema_template: dict           # JSON Schema → converted to dict template for Docling
    extraction_target: str          # 'page' | 'document'
    llm_provider: str               # 'openai' | 'anthropic'
    llm_model: str
    callback_url: str
    job_id: str
```

Service flow:
1. Download document to temp file
2. Set LLM API key env var (passed via header, not stored)
3. Convert JSON Schema to Docling dict template
4. Call `DocumentExtractor.extract(source=file_path, template=template_dict)`
5. Serialize `result.pages` → JSON
6. POST callback to edge function with results

Uses `get_conversion_pool()` process pool (same admission control pattern).

### Edge functions:
- **New:** `supabase/functions/trigger-extract/index.ts` — orchestrator: creates job row, gets signed URL, calls platform-api `/extract`
- **New:** `supabase/functions/extraction-complete/index.ts` — callback: inserts results rows, updates job status

Both follow the existing `trigger-parse` / `conversion-complete` patterns.

---

## Phase 3: Frontend — Schema Management

### Reuse from existing `Schemas.tsx` (`web/src/pages/Schemas.tsx`):
- `SchemaField` type (line 25-33)
- `SchemaFieldType` type (line 23)
- `buildObjectSchema()` (line 65-105) — visual fields → JSON Schema
- `parseObjectSchemaToFields()` (line 107-149) — JSON Schema → visual fields
- `useMonacoTheme()` (line 61-63) — Monaco dark/light
- Field CRUD patterns: `createSchemaField`, `updateField`, `addField`, `removeField`

### New files:
- `web/src/pages/extract/ExtractionSchemaPanel.tsx` — wrapper with three mode tabs:
  - **Visual** — field builder (reuses SchemaField patterns from Schemas.tsx)
  - **Code** — Monaco JSON Schema editor (reuses useMonacoTheme)
  - **AI Generate** — select document → call LLM to suggest schema → load into visual builder
- `web/src/hooks/useExtractionSchemas.ts` — CRUD against `extraction_schemas` table
- `web/src/lib/extractionSchemaHelpers.ts` — JSON Schema ↔ Docling dict template conversion

### AI schema generation:
- **New edge function:** `supabase/functions/suggest-extraction-schema/index.ts`
- Takes first N pages of document text, sends to user's LLM with schema-suggestion prompt
- Returns JSON Schema that loads into the visual builder for editing

---

## Phase 4: Frontend — Extract Workbench Overhaul

### Primary file: `web/src/pages/useExtractWorkbench.tsx`

Replace current placeholder tabs/panes with:

```
Tabs: File List | Schema | Config | Results | JSON
Panes: [Files 28%] [Schema+Config 32%] [Results+JSON 40%]
```

### Tab contents:

| Tab | Renders | Notes |
|-----|---------|-------|
| File List | `DocumentFileTable` | Same as Parse, filter to `status='parsed'` |
| Schema | `ExtractionSchemaPanel` | Visual/Code/AI modes + schema selector dropdown + target toggle (Page/Document) |
| Config | LLM config panel | Provider dropdown (from `user_api_keys`), model selector, temperature, "Run Extraction" button |
| Results | Structured data view | Per-page accordion or document-level card, shows field name/value/type |
| JSON | Monaco read-only | Raw JSON of extraction results |

### New hooks:
- `web/src/hooks/useExtractionJobs.ts` — submit jobs via `trigger-extract` edge function, realtime subscription on `extraction_jobs` for status updates
- `web/src/hooks/useExtractionResults.ts` — fetch from `extraction_results` for completed jobs

### New artifact module:
- `web/src/pages/extractArtifacts.ts` — cache/load extraction results, following `parseArtifacts.ts` pattern

---

## Phase 5: Settings Integration

No new settings page needed for MVP. The Config tab in the workbench reads provider/model from existing `user_api_keys` table. If no keys configured, show link to `/app/settings/ai`.

---

## Implementation Order

1. Database migration + TypeScript types
2. Backend `/extract` route + edge functions (trigger + callback)
3. Schema management (reuse Schemas.tsx patterns, add AI generate)
4. Extract workbench overhaul (tabs, hooks, result display)
5. Integration testing + deploy

---

## Verification

1. **Database:** Run migration locally, verify tables created with `\dt extraction_*`
2. **Backend:** `curl POST /extract` with a test PDF + simple dict schema, verify callback fires
3. **Edge functions:** Deploy `trigger-extract` and `extraction-complete`, test end-to-end from Supabase dashboard
4. **Frontend:** Navigate to `/app/extract`, select parsed document, create schema via visual builder, run extraction, verify results display
5. **Tests:** Add unit tests for schema conversion helpers (`extractionSchemaHelpers.ts`), edge function handler tests

---

## Critical File Paths

| Purpose | Path |
|---------|------|
| Conversion route (pattern to follow) | `services/platform-api/app/api/routes/conversion.py` |
| Conversion models (pattern) | `services/platform-api/app/domain/conversion/models.py` |
| Conversion callback (pattern) | `services/platform-api/app/domain/conversion/callbacks.py` |
| Schema builder (reuse) | `web/src/pages/Schemas.tsx` |
| Parse workbench (pattern) | `web/src/pages/useParseWorkbench.tsx` |
| Parse artifacts (pattern) | `web/src/pages/parseArtifacts.ts` |
| Extract workbench (modify) | `web/src/pages/useExtractWorkbench.tsx` |
| Extract page (modify) | `web/src/pages/ExtractPage.tsx` |
| TypeScript types (modify) | `web/src/lib/types.ts` |
| App router (may modify) | `web/src/router.tsx` |
| Trigger-parse edge fn (pattern) | `supabase/functions/trigger-parse/` |
| Conversion-complete edge fn (pattern) | `supabase/functions/conversion-complete/` |

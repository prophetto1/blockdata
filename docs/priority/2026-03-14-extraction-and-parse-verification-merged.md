# Parse Runtime Verification + Structured Extraction — Merged Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify that parse profiles are actually applied by the conversion runtime, then ship structured extraction as an async, queued job flow with a LlamaCloud-style workbench UX.

**Merges:**
- `2026-03-14-async-extraction-and-parse-runtime-verification.md` (async plan — architecture, queue model, readiness gates)
- `2026-03-14-extract-structured-extraction.md` (extract plan — UX, schema model, Docling helpers, workbench)

**Architecture:** Parse verification extends the trigger-plus-callback pipeline with requested-vs-applied audit fields. Extraction uses the async worker pattern: `run-extract` validates and enqueues durable work items, `extract-worker` claims items via `FOR UPDATE SKIP LOCKED`, writes results incrementally, and the UI watches progress through Realtime plus a client-driven worker loop.

**Tech Stack:** Supabase Postgres + Edge Functions + Realtime, Docling artifacts in Storage, React + Ark UI + Monaco Editor + Vitest, Deno tests for Edge Functions, platform-managed Vertex Claude via `callVertexClaude()`.

---

## Scope Guardrails

- **MVP extraction provider is platform-managed Vertex only.** Multi-provider extraction (user API keys, Anthropic direct, OpenAI, Google) is deferred to Phase 6. Do not implement provider resolution, API key decryption, or multi-transport LLM dispatch in this plan.
- `run-extract` must return `202 Accepted` with a `job_id`. It must not do LLM work inline.
- Extraction targets in scope: `document` and `page`. `table_row` remains out of scope.
- Self-invoking Edge Functions are out of scope.
- The external conversion service source is not in this workspace. Before Phase 2 Task 4 starts, record its exact local repo path. If that code cannot be located, stop after Phase 2 Task 3 and mark parse-runtime verification blocked on an external dependency.
- Page-level extraction is capped at 50 pages on the **requested range**, not total document pages.
- Schema delete must check for existing jobs before allowing deletion.

## Acceptance Criteria

- A parsed document shows both the requested parse profile and the applied parse runtime details.
- The conversion callback proves whether the runtime honored or adjusted the requested profile.
- Parse profiles that require unconfigured backends (VLM, enrichment models) are blocked in the UI before dispatch.
- Extraction submission returns immediately with `202` and a durable `job_id`.
- Extraction work items are durable rows claimed via RPC, not inferred from result gaps.
- Extraction work is resumable and incremental: page results appear before the job completes.
- The extract workbench disables execution when platform Vertex readiness is not proven.
- Schema builder supports visual, code, and split editing modes with bidirectional sync.

---

## Runtime Dependency Matrix

| Profile | Docling pipeline | OCR dependency | LLM or VLM dependency | Required runtime proof |
|---|---|---|---|---|
| `Fast` | `standard` | `tesseract` | None | Conversion service shows `ocr_options.kind = "tesseract"` in `applied_pipeline_config` |
| `Balanced` | `standard` | `easyocr` | None for baseline; if picture classification uses a model, that model must be declared in `parser_runtime_meta` | Conversion service shows `ocr_options.kind = "easyocr"` and any classification model identifier used |
| `High Quality` | `standard` | `easyocr` | Potentially yes if `do_picture_description` or `do_chart_extraction` is enabled | Conversion service must name the exact provider and model used for picture description or chart extraction, or reject the profile as unsupported |
| `AI Vision` | `vlm` | None beyond page image generation | Yes, always | Conversion service must name the exact VLM provider, model, and auth path in `parser_runtime_meta` |
| Structured extraction | Post-parse | None | Yes, always (Vertex Claude) | `extract-readiness` must prove Vertex auth is live before the UI allows execution |

## Required Parse Configuration Contract

The conversion service callback must include:

- `requested_pipeline_config`: the exact config received from `trigger-parse`
- `applied_pipeline_config`: the exact config actually used after defaults and normalization
- `parser_runtime_meta.parser`: parser family (e.g. `docling`)
- `parser_runtime_meta.parser_version`: concrete parser version
- `parser_runtime_meta.ocr_backend`: concrete OCR backend (e.g. `tesseract`, `easyocr`)
- `parser_runtime_meta.vlm_provider`: required when a VLM-backed profile is used
- `parser_runtime_meta.vlm_model`: required when a VLM-backed profile is used
- `parser_runtime_meta.enrichment_models`: array of provider/model identifiers used for AI enrichments

If a profile requests a backend that is not configured, the conversion service must reject the job early. It must not silently downgrade.

## Explicit Non-Goals

- Do not pretend all profiles are equivalent presets if some require different model backends.
- Do not let the UI present `AI Vision` or AI-enriched profiles as runnable unless the conversion runtime reports their dependencies are configured.
- Do not treat extraction-provider readiness as sufficient proof that parse-profile AI dependencies are configured.
- Do not implement multi-provider extraction in this plan. That is Phase 6.

---

# Phase 1 — Parse Runtime Foundation

**Prerequisite for extraction.** Proves the parse layer is trustworthy.

### Task 1.1: Parse Runtime Audit Columns

**Files:**
- Create: `supabase/migrations/20260314140000_088_parse_runtime_audit.sql`

**Migration:**

```sql
ALTER TABLE public.conversion_parsing
  ADD COLUMN IF NOT EXISTS requested_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applied_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parser_runtime_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.conversion_parsing
SET
  requested_pipeline_config = CASE
    WHEN requested_pipeline_config = '{}'::jsonb THEN COALESCE(pipeline_config, '{}'::jsonb)
    ELSE requested_pipeline_config
  END,
  applied_pipeline_config = CASE
    WHEN applied_pipeline_config = '{}'::jsonb THEN COALESCE(pipeline_config, '{}'::jsonb)
    ELSE applied_pipeline_config
  END;

CREATE OR REPLACE VIEW public.view_documents AS
SELECT
  sd.source_uid,
  sd.owner_id,
  sd.source_type,
  sd.source_filesize,
  sd.source_total_characters,
  sd.source_locator,
  sd.doc_title,
  sd.uploaded_at,
  sd.updated_at,
  sd.status,
  sd.error,
  sd.conversion_job_id,
  sd.project_id,
  cp.conv_uid,
  cp.conv_status,
  cp.conv_parsing_tool,
  cp.conv_representation_type,
  cp.conv_total_blocks,
  cp.conv_block_type_freq,
  cp.conv_total_characters,
  cp.conv_locator,
  cp.pipeline_config,
  cp.requested_pipeline_config,
  cp.applied_pipeline_config,
  cp.parser_runtime_meta
FROM public.source_documents sd
LEFT JOIN public.conversion_parsing cp ON cp.source_uid = sd.source_uid;
```

**Verify:** `npx supabase db reset` — PASS, `view_documents` exposes the three new columns.

**Note:** This migration number (`_088_`) follows the latest committed migration (`_087_`). If any new migrations are committed before this plan executes, renumber accordingly.

---

### Task 1.2: Persist Requested Config in `trigger-parse`

**Files:**
- Create: `supabase/functions/_shared/parse_pipeline_contract.ts`
- Create: `supabase/functions/_shared/parse_pipeline_contract.test.ts`
- Modify: `supabase/functions/trigger-parse/index.ts`

**Tests first:**

```typescript
// parse_pipeline_contract.test.ts
import { assertEquals } from "jsr:@std/assert";
import { buildRequestedPipelineConfig } from "./parse_pipeline_contract.ts";

Deno.test("profile config is decorated with profile metadata", () => {
  const result = buildRequestedPipelineConfig({
    profileId: "profile-1",
    profileConfig: { name: "Balanced", pipeline: "standard" },
    configOverride: null,
  });
  assertEquals(result, {
    name: "Balanced",
    pipeline: "standard",
    _profile_id: "profile-1",
    _profile_name: "Balanced",
  });
});

Deno.test("explicit config override wins over saved profile", () => {
  const result = buildRequestedPipelineConfig({
    profileId: "profile-1",
    profileConfig: { name: "Balanced" },
    configOverride: { pipeline: "vlm" },
  });
  assertEquals(result, { pipeline: "vlm" });
});
```

**Implementation:**

```typescript
// parse_pipeline_contract.ts
type BuildRequestedPipelineConfigArgs = {
  profileId: string | null;
  profileConfig: Record<string, unknown> | null;
  configOverride: Record<string, unknown> | null;
};

export function buildRequestedPipelineConfig(
  args: BuildRequestedPipelineConfigArgs,
): Record<string, unknown> {
  if (args.configOverride && Object.keys(args.configOverride).length > 0) {
    return args.configOverride;
  }
  const profileConfig = args.profileConfig ?? {};
  if (!args.profileId) return profileConfig;
  return {
    ...profileConfig,
    _profile_id: args.profileId,
    _profile_name: typeof profileConfig.name === "string" ? profileConfig.name : null,
  };
}
```

**Wire `trigger-parse`:** call `buildRequestedPipelineConfig(...)`, write `requested_pipeline_config` on the pre-insert row, keep populating legacy `pipeline_config` for backward compatibility.

---

### Task 1.3: Persist Applied Config in `conversion-complete`

**Files:**
- Create: `supabase/functions/conversion-complete/index.test.ts`
- Modify: `supabase/functions/conversion-complete/index.ts`

Accept new callback fields:

```typescript
type ConversionCompleteBody = {
  source_uid: string;
  conversion_job_id: string;
  pipeline_config?: Record<string, unknown> | null;
  applied_pipeline_config?: Record<string, unknown> | null;
  parser_runtime_meta?: Record<string, unknown> | null;
  success: boolean;
  // existing fields...
};
```

Persist:

```typescript
const requestedPipelineConfig = body.pipeline_config ?? {};
const appliedPipelineConfig = body.applied_pipeline_config ?? requestedPipelineConfig;
const parserRuntimeMeta = body.parser_runtime_meta ?? {};

// In upsert:
requested_pipeline_config: requestedPipelineConfig,
applied_pipeline_config: appliedPipelineConfig,
parser_runtime_meta: parserRuntimeMeta,
pipeline_config: requestedPipelineConfig, // backward compat
```

**Tests:** legacy callback without applied fields falls back to `pipeline_config` for both; modern callback persists all three fields distinctly.

---

### Task 1.4: Show Parse Runtime Details in UI

**Files:**
- Modify: `web/src/lib/types.ts` — add `requested_pipeline_config`, `applied_pipeline_config`, `parser_runtime_meta` to `DocumentRow`
- Modify: `web/src/pages/parseArtifacts.ts` — include new fields in cache key
- Modify: `web/src/components/documents/ParseConfigColumn.tsx` — render two cards: "Requested Profile" and "Applied Runtime"
- Create: `web/src/components/documents/ParseConfigColumn.test.tsx`

---

# Phase 2 — Readiness Gates

**Blocks unsafe dispatch.** Prevents running profiles or extraction without backend support.

### Task 2.1: Extraction Runtime Readiness Endpoint

**Files:**
- Create: `supabase/functions/extract-readiness/index.ts`
- Create: `supabase/functions/extract-readiness/index.test.ts`
- Create: `web/src/hooks/useExtractRuntimeReadiness.ts`
- Create: `web/src/hooks/useExtractRuntimeReadiness.test.ts`

Endpoint checks `GCP_VERTEX_SA_KEY`, `GCP_VERTEX_PROJECT_ID`, and attempts `getVertexAccessToken()`. Returns:

```json
{ "is_ready": true, "reasons": [] }
```

or:

```json
{ "is_ready": false, "reasons": ["Missing GCP_VERTEX_SA_KEY"] }
```

Frontend hook loads on mount, shows blocking banner when not ready, disables "Run Extraction."

---

### Task 2.2: Parse Profile Readiness Endpoint

**Files:**
- Create: `supabase/functions/parse-profile-readiness/index.ts`
- Create: `supabase/functions/parse-profile-readiness/index.test.ts`
- Modify: `web/src/components/documents/ParseConfigColumn.tsx`

Returns per-profile readiness:

```json
{
  "profiles": [
    {
      "profile_name": "Fast",
      "is_ready": true,
      "requirements": { "ocr_backend": "tesseract", "vlm_model": null, "enrichment_models": [] },
      "reasons": []
    }
  ]
}
```

UI disables unrunnable profiles, shows which dependency is missing.

---

### Task 2.3: External Conversion Service Contract (if repo accessible)

**Files:**
- Modify: `<conversion-service-repo>/app/main.py`
- Modify: `<conversion-service-repo>/app/docling_runner.py`
- Create: `<conversion-service-repo>/tests/test_pipeline_config_contract.py`

The conversion service must:
- Validate incoming `pipeline_config` before conversion starts
- Record exact options applied after defaults and normalization
- Resolve profile requirements into explicit runtime dependency set
- Fail early if a requested VLM or enrichment model is not configured
- Include `applied_pipeline_config` and `parser_runtime_meta` in callback

**If the conversion service repo cannot be located, stop here and mark Phase 2 blocked on external dependency.**

---

# Phase 3 — Extraction Schema & Queue Foundation

**Database and type layer for extraction.**

### Task 3.1: Extraction Tables Migration

**Files:**
- Create: `supabase/migrations/20260314150000_089_extraction_tables.sql`

```sql
-- Extraction schemas: user-defined JSON Schemas
CREATE TABLE IF NOT EXISTS public.extraction_schemas (
  schema_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id),
  project_id       uuid REFERENCES public.projects(project_id),
  schema_name      text NOT NULL,
  schema_body      jsonb NOT NULL,
  schema_body_hash text,
  extraction_target text NOT NULL DEFAULT 'document'
    CHECK (extraction_target IN ('page', 'document')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extraction_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_schemas_select_own ON extraction_schemas FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY extraction_schemas_insert_own ON extraction_schemas FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY extraction_schemas_update_own ON extraction_schemas FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY extraction_schemas_delete_own ON extraction_schemas FOR DELETE USING (owner_id = auth.uid());
CREATE INDEX idx_extraction_schemas_project ON extraction_schemas(project_id);
CREATE INDEX idx_extraction_schemas_body_hash ON extraction_schemas(schema_body_hash);

-- Extraction jobs: one row per extraction run
CREATE TABLE IF NOT EXISTS public.extraction_jobs (
  job_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES auth.users(id),
  source_uid       text NOT NULL REFERENCES public.source_documents(source_uid),
  schema_id        uuid NOT NULL REFERENCES public.extraction_schemas(schema_id),
  status           text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'complete', 'failed', 'cancelled')),
  llm_provider     text NOT NULL DEFAULT 'vertex_ai',
  llm_model        text NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  config_jsonb     jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_items      integer NOT NULL DEFAULT 0,
  completed_items  integer NOT NULL DEFAULT 0,
  failed_items     integer NOT NULL DEFAULT 0,
  token_usage      jsonb,
  error            text,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_jobs_select_own ON extraction_jobs FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY extraction_jobs_insert_own ON extraction_jobs FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_extraction_jobs_source ON extraction_jobs(source_uid);
CREATE INDEX idx_extraction_jobs_schema ON extraction_jobs(schema_id);

-- Extraction job items: durable work items, one per document or page
CREATE TABLE IF NOT EXISTS public.extraction_job_items (
  item_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES public.extraction_jobs(job_id) ON DELETE CASCADE,
  target_kind   text NOT NULL CHECK (target_kind IN ('document', 'page')),
  page_number   integer,
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'complete', 'failed')),
  claimed_by    text,
  claimed_at    timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error    text
);

CREATE INDEX idx_extraction_job_items_job ON extraction_job_items(job_id);
CREATE INDEX idx_extraction_job_items_pending ON extraction_job_items(job_id, status) WHERE status = 'pending';

-- Extraction results: structured data extracted
CREATE TABLE IF NOT EXISTS public.extraction_results (
  result_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        uuid NOT NULL UNIQUE REFERENCES public.extraction_job_items(item_id) ON DELETE CASCADE,
  job_id         uuid NOT NULL REFERENCES public.extraction_jobs(job_id) ON DELETE CASCADE,
  page_number    integer,
  extracted_data jsonb NOT NULL,
  raw_response   jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extraction_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_results_select_own ON extraction_results FOR SELECT USING (
  job_id IN (SELECT job_id FROM extraction_jobs WHERE owner_id = auth.uid())
);
CREATE INDEX idx_extraction_results_job ON extraction_results(job_id);

-- Claim RPC: atomic work item acquisition
CREATE OR REPLACE FUNCTION public.claim_extraction_items(
  p_owner_id uuid,
  p_job_id uuid,
  p_worker_id text,
  p_limit integer DEFAULT 1
)
RETURNS SETOF public.extraction_job_items
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT i.item_id
    FROM public.extraction_job_items i
    JOIN public.extraction_jobs j ON j.job_id = i.job_id
    WHERE i.job_id = p_job_id
      AND i.status = 'pending'
      AND j.owner_id = p_owner_id
    ORDER BY i.page_number NULLS FIRST, i.item_id
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE OF i SKIP LOCKED
  )
  UPDATE public.extraction_job_items i
  SET
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = now(),
    attempt_count = i.attempt_count + 1
  FROM candidate
  WHERE i.item_id = candidate.item_id
  RETURNING i.*;
END;
$$;

-- Guarded Realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_schemas;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_jobs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_job_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_results;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

**Verify:** `npx supabase db reset` — PASS.

---

### Task 3.2: TypeScript Types

**Files:**
- Modify: `web/src/lib/types.ts`

```typescript
export type ExtractionSchemaRow = {
  schema_id: string;
  owner_id: string;
  project_id: string | null;
  schema_name: string;
  schema_body: Record<string, unknown>;
  schema_body_hash: string | null;
  extraction_target: 'page' | 'document';
  created_at: string;
  updated_at: string;
};

export type ExtractionJobRow = {
  job_id: string;
  owner_id: string;
  schema_id: string;
  source_uid: string;
  status: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  llm_provider: string;
  llm_model: string;
  config_jsonb: Record<string, unknown>;
  total_items: number;
  completed_items: number;
  failed_items: number;
  token_usage: { input_tokens?: number; output_tokens?: number } | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ExtractionJobItemRow = {
  item_id: string;
  job_id: string;
  target_kind: 'document' | 'page';
  page_number: number | null;
  status: 'pending' | 'claimed' | 'complete' | 'failed';
  claimed_by: string | null;
  claimed_at: string | null;
  attempt_count: number;
  last_error: string | null;
};

export type ExtractionResultRow = {
  result_id: string;
  item_id: string;
  job_id: string;
  page_number: number | null;
  extracted_data: Record<string, unknown>;
  raw_response: Record<string, unknown> | null;
  created_at: string;
};
```

---

### Task 3.3: Docling Page-Text Assembly Helper

**Files:**
- Create: `supabase/functions/_shared/docling_page_text.ts`
- Create: `supabase/functions/_shared/docling_page_text.test.ts`

**Context:** Must match the exact Docling structure used in `web/src/lib/doclingNativeItems.ts`. Uses `self_ref` for item resolution, traverses both `body` and `furniture`, reconstructs tables from `table_cells` via grid, handles text, table, key_value, and form item kinds.

Exports:
- `assemblePageText(doc): Map<number, string>` — reading-order text per page
- `getPageCount(doc): number` — max page number from provenance
- `buildExtractionItems(args): Array<{ target_kind, page_number }>` — creates item descriptors for document or page-range targets

See the extract plan Task 3 for the full `assemblePageText` and `getPageCount` implementations.

Add `buildExtractionItems`:

```typescript
export function buildExtractionItems(args: {
  totalPages: number;
  extractionTarget: "document" | "page";
  pageRange?: { start: number; end: number } | null;
}) {
  if (args.extractionTarget === "document") {
    return [{ target_kind: "document" as const, page_number: null }];
  }
  const start = args.pageRange?.start ?? 1;
  const end = args.pageRange?.end ?? args.totalPages;
  const items: Array<{ target_kind: "page"; page_number: number }> = [];
  for (let page = start; page <= end; page += 1) {
    items.push({ target_kind: "page", page_number: page });
  }
  return items;
}
```

**Tests:** page grouping, table reconstruction from `table_cells`, furniture traversal, empty document, `getPageCount`, `buildExtractionItems` for document and page modes.

---

### Task 3.4: Schema CRUD Hook

**Files:**
- Create: `web/src/hooks/useExtractionSchemas.ts`
- Create: `web/src/hooks/useExtractionSchemas.test.ts`

Standard CRUD hook with Realtime subscription. **Schema delete must check for existing jobs:**

```typescript
const deleteSchema = useCallback(async (schemaId: string) => {
  // Check for existing jobs referencing this schema
  const { count } = await supabase
    .from('extraction_jobs')
    .select('job_id', { count: 'exact', head: true })
    .eq('schema_id', schemaId);

  if (count && count > 0) {
    throw new Error(`Cannot delete schema: ${count} extraction job(s) reference it`);
  }

  const { error: err } = await supabase
    .from('extraction_schemas')
    .delete()
    .eq('schema_id', schemaId);
  if (err) throw new Error(err.message);
}, []);
```

---

### Task 3.5: Schema Builder Components

**Files:**
- Create: `web/src/components/schema/SchemaFieldEditor.tsx`
- Create: `web/src/components/schema/SchemaSelector.tsx`

Extract from the existing `Schemas.tsx` and `useExtractWorkbench.tsx`. `SchemaFieldEditor` supports visual, code, and split modes with bidirectional Monaco sync. `SchemaSelector` is an Ark UI Select dropdown with "New Schema" button.

Refactor `web/src/pages/Schemas.tsx` to use the shared components.

---

# Phase 4 — Extraction Edge Functions

**The async job execution layer. Vertex-only MVP.**

### Task 4.1: `run-extract` Submitter

**Files:**
- Create: `supabase/functions/run-extract/index.ts`
- Create: `supabase/functions/run-extract/index.test.ts`

Uses existing `_shared/cors.ts`, `_shared/supabase.ts` for auth (NOT a custom `extract_helpers.ts`).

Flow:
1. Authenticate user via `requireUserId(req)`
2. Validate `source_uid`, `schema_id`, extraction target, page range
3. Load Docling artifact to determine total pages via `getPageCount`
4. Validate page range (50-page cap on requested range)
5. Insert one `extraction_jobs` row with `status = 'queued'`
6. Insert derived `extraction_job_items` via `buildExtractionItems`
7. Update `extraction_jobs.total_items` to match item count
8. Return `202` with `{ job_id, status: "queued" }`

**Test cases:** valid request returns 202, missing schema (404), unparsed document (400), invalid page ranges (400), `start > totalPages` (400).

---

### Task 4.2: Extraction Prompt Helper

**Files:**
- Create: `supabase/functions/_shared/extraction_prompt.ts`
- Create: `supabase/functions/_shared/extraction_prompt.test.ts`

```typescript
export function buildExtractionTool(args: { schemaBody: Record<string, unknown> }) {
  return {
    name: "submit_extraction",
    description: "Return structured extraction data for the requested content.",
    input_schema: args.schemaBody,
  };
}
```

---

### Task 4.3: `extract-worker` with Claim Semantics

**Files:**
- Create: `supabase/functions/extract-worker/index.ts`
- Create: `supabase/functions/extract-worker/index.test.ts`

Flow:
1. Authenticate user
2. Accept `{ job_id }`
3. Claim items via `claim_extraction_items` RPC
4. If no items claimed and no pending items remain, mark job `complete`
5. Mark job `running` if it was `queued`
6. Load Docling JSON artifact
7. For each claimed item:
   - Assemble text (document-level: all pages joined; page-level: single page from `assemblePageText`)
   - Call `callVertexClaude()` with `tool_choice: { type: "tool", name: "submit_extraction" }`
   - Parse `tool_use` response block to get `extracted_data`
   - Upsert `extraction_results` linked to `item_id`
   - Mark item `complete` or `failed`
   - Update job counters (`completed_items` / `failed_items`)
8. Track token usage per call, aggregate on job completion
9. Set job `complete` when no `pending` or `claimed` items remain

**Does not recurse. Does not self-invoke.**

**Test cases:** claim one pending item, mark parent job running, write one result row, mark item complete, mark job complete when no pending items remain, LLM failure marks item failed with sanitized error.

---

# Phase 5 — Workbench Integration

**The frontend extraction UX.**

### Task 5.1: Extraction Job Runner Hook

**Files:**
- Create: `web/src/hooks/useExtractionJobRunner.ts`
- Create: `web/src/hooks/useExtractionJobRunner.test.ts`

Calls `run-extract`, saves `job_id`, starts a loop calling `extract-worker` while status is `queued` or `running`. Stops on `complete`, `failed`, or `cancelled`.

```typescript
while (!cancelled && (job.status === 'queued' || job.status === 'running')) {
  await edgeFetch('extract-worker', {
    method: 'POST',
    body: JSON.stringify({ job_id }),
  });
  await wait(500);
  // Refresh job status from Realtime or explicit fetch
}
```

---

### Task 5.2: Extraction Results Hook

**Files:**
- Create: `web/src/hooks/useExtractionResults.ts`

Loads and subscribes to `extraction_results` for a given `job_id` via Realtime.

---

### Task 5.3: Extract Workbench Overhaul

**Files:**
- Modify: `web/src/pages/useExtractWorkbench.tsx`
- Modify: `web/src/components/documents/ExtractCompactFileList.tsx`

**Tabs and panes:**

```typescript
export const EXTRACT_TABS: WorkbenchTab[] = [
  { id: 'extract-files',   label: 'Files',   icon: IconFileCode },
  { id: 'extract-schema',  label: 'Schema',  icon: IconBraces },
  { id: 'extract-config',  label: 'Config',  icon: IconSettings },
  { id: 'extract-results', label: 'Results', icon: IconLayoutList },
  { id: 'extract-json',    label: 'JSON',    icon: IconFileText },
];

export const EXTRACT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-files',   tabs: ['extract-files'],                    activeTab: 'extract-files',   width: 28 },
  { id: 'pane-schema',  tabs: ['extract-schema', 'extract-config'], activeTab: 'extract-schema',  width: 32 },
  { id: 'pane-results', tabs: ['extract-results', 'extract-json'],  activeTab: 'extract-results', width: 40 },
]);
```

**Tab content:**
- **Files:** `DocumentFileTable` filtered to `status === 'parsed'` only. Empty state: "No parsed documents."
- **Schema:** `SchemaSelector` + `SchemaFieldEditor` with extraction target toggle. Save button.
- **Config:** Vertex-only model selector (hardcoded to platform Vertex in MVP). Advanced: system prompt, page range (page mode only), temperature. "Run Extraction" disabled when readiness is false, no schema selected, or no doc selected.
- **Results:** Job status badge. Document-level: field/value card. Page-level: accordion per page. Failed: error message.
- **JSON:** Read-only Monaco showing `JSON.stringify(results.map(r => r.extracted_data), null, 2)`.

Uses `resolvedProjectId` throughout (not `focusedProjectId`).

---

### Task 5.4: Workbench Tests

**Files:**
- Create/modify: `web/src/pages/useExtractWorkbench.test.ts`

Test cases:
- Parsed-only filter excludes unparsed docs
- Schema save/select round-trip
- "Run Extraction" disabled when no schema or doc selected
- Extraction submission stores returned job_id
- Client-driven worker loop runs until complete
- Incremental page results render before job completion
- Failed job shows error message
- Results rendering for document (single card) and page (accordion)

---

# Phase 6 — Multi-Provider Extraction (Deferred)

**Not implemented in this plan.** Documented here for future scope.

When this phase is implemented, it will add:
- Provider resolution from `user_api_keys` + `user_provider_connections`
- API key decryption via `decryptWithContext()` from `_shared/api_key_crypto.ts`
- Multi-transport LLM dispatch (Anthropic Messages API, OpenAI chat/completions)
- Config tab provider selector
- Per-provider model lists

**Known issues to resolve before implementing:**
- The extract plan's Google transport path (`generativelanguage.googleapis.com/v1beta` + `/chat/completions`) is incorrect — Google's Generative Language API does not use OpenAI-compatible endpoints
- Provider resolution must handle both `user_provider_connections` (Vertex service account) and `user_api_keys` (API key providers) without conflation
- The Anthropic direct API path uses `/v1/messages`, not `/chat/completions`

---

# Dependency Graph

```
Phase 1: Parse Runtime Foundation
  Task 1.1 (migration) → Task 1.2 (trigger-parse) → Task 1.3 (conversion-complete) → Task 1.4 (UI)
  │
Phase 2: Readiness Gates (can start after 1.1)
  Task 2.1 (extract readiness) ─┐
  Task 2.2 (parse profile readiness) ─┤
  Task 2.3 (conversion service) ─┘
  │
Phase 3: Extraction Schema & Queue (can start after 1.1)
  Task 3.1 (migration) → Task 3.2 (types) ─┐
  Task 3.3 (docling helper) ────────────────┤
  Task 3.4 (schema CRUD hook) ─────────────┤
  Task 3.5 (schema components) ────────────┘
  │
Phase 4: Extraction Edge Functions (requires 3.1 + 3.3)
  Task 4.1 (run-extract) → Task 4.2 (prompt helper) → Task 4.3 (extract-worker)
  │
Phase 5: Workbench Integration (requires all of Phase 3 + Phase 4 + Task 2.1)
  Task 5.1 (job runner hook) ─┐
  Task 5.2 (results hook) ────┤
  Task 5.3 (workbench overhaul) ← requires 5.1 + 5.2
  Task 5.4 (tests) ← requires 5.3
```

**Parallelism:** Phase 1, Phase 2, and Phase 3 (Tasks 3.1-3.5) can proceed in parallel after Task 1.1 applies the first migration. Phase 4 requires Phase 3's migration and docling helper. Phase 5 requires all prior phases.

---

# Final Verification

Before claiming completion, run:

1. `npx supabase db reset` — PASS
2. `deno test supabase/functions/_shared/parse_pipeline_contract.test.ts supabase/functions/conversion-complete/index.test.ts supabase/functions/extract-readiness/index.test.ts supabase/functions/parse-profile-readiness/index.test.ts supabase/functions/_shared/docling_page_text.test.ts supabase/functions/_shared/extraction_prompt.test.ts supabase/functions/run-extract/index.test.ts supabase/functions/extract-worker/index.test.ts` — PASS
3. `cd web && npm run test -- src/components/documents/ParseConfigColumn.test.tsx src/hooks/useExtractRuntimeReadiness.test.ts src/hooks/useExtractionSchemas.test.ts src/pages/useExtractWorkbench.test.ts src/hooks/useExtractionJobRunner.test.ts` — PASS
4. Manual smoke test:
   - Parse one PDF with "Balanced" profile
   - Verify Parse UI shows profile readiness per profile
   - Confirm requested and applied runtime info displayed
   - Submit document-level extraction → confirm 202 return
   - Watch job move `queued → running → complete`
   - Confirm incremental results appear before completion
   - Page-level extraction → confirm per-page accordion

---

# Rollout Notes

1. Deploy `trigger-parse` and `conversion-complete` with new callback contract before enabling parse-runtime UI fields.
2. Do not expose extraction run button in production until `extract-readiness` reports ready.
3. Migration `_088_` must be applied before `_089_`. Verify timestamps sort correctly.
4. First follow-up after this plan: evaluate whether the client-driven worker loop needs a server-side scheduler or cron fallback under real load.
5. Second follow-up: Phase 6 multi-provider extraction, after the Vertex-only path is proven in production.

---

# Inconsistencies Resolved by This Merge

| Issue | Resolution |
|---|---|
| No durable work items (extract plan) | Merged: uses `extraction_job_items` + `claim_extraction_items` RPC from async plan |
| Race-prone page inference (extract plan) | Replaced: worker claims items atomically, does not infer from results |
| Multi-provider over-scoping (extract plan) | Deferred to Phase 6; MVP is Vertex-only |
| Broken Google transport (extract plan) | Dropped entirely; will be redesigned in Phase 6 |
| Job status mismatch | Unified to `queued, running, complete, failed, cancelled` |
| Migration number collision | Resolved: `_088_` = parse audit, `_089_` = extraction tables |
| Auth helper duplication (extract plan) | Dropped: uses existing `_shared/cors.ts` and `_shared/supabase.ts` |
| Schema delete vs FK conflict | Resolved: delete checks for existing jobs first |
| Missing parse-runtime prerequisite (extract plan) | Resolved: Phase 1 is a hard prerequisite for extraction |
| Missing job counters (extract plan) | Added: `total_items`, `completed_items`, `failed_items` on jobs |
| Missing token tracking (async plan) | Added: `token_usage` on jobs from extract plan |

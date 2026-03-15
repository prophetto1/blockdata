# Structured Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a LlamaCloud-style structured extraction workbench that takes parsed documents, applies user-defined JSON Schemas, and extracts structured data via LLM tool-use — using the platform's Vertex AI connection by default.

**Architecture:** Extraction is a post-parse operation. Already-parsed document content (markdown or DoclingDocument JSON from Supabase storage) is sent to Claude via Vertex AI with the extraction schema as a tool definition. The LLM returns structured data conforming to the schema. No Cloud Run changes. No new Python services. Extraction runs in a single Supabase edge function (`run-extract`).

**Tech Stack:** Supabase (Postgres + Edge Functions + Realtime), Vertex AI Claude (`callVertexClaude`), React + Ark UI + Monaco Editor, existing `Workbench` multi-pane component.

**Supersedes:** `docs/plans/2026-03-14-extract-feature-design.md` (Revision 2). This plan addresses all gaps from `docs/assessments/2026-03-14-extract-feature-design-assessment.mdx`.

**Reference materials:**
- LlamaCloud UI screenshots: `docs/extract/image.png`, `docs/extract/image copy.png`
- LlamaCloud result JSON: `docs/extract/resultjson.json`
- LlamaCloud schema example: `docs/extract/schema.json`
- Docling extraction docs: `https://docling-project.github.io/docling/examples/extraction/`

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provider | Platform Vertex AI by default | Uses existing `callVertexClaude()` with `GCP_VERTEX_SA_KEY`. No per-user API key needed for MVP. |
| Extraction targets | Document + Page (Table Row deferred) | Table Row needs more design. Document and Page cover the primary use cases. |
| Config UX | Basic + Advanced accordion | Basic: model selector, extraction target. Advanced: system prompt, page range, temperature. |
| Schema UX | Shared component in both Schemas page and Extract workbench | Same `SchemaFieldEditor` component, same save/load logic. Extract workbench middle column IS the schema builder. |
| Page-level limit | 50 pages max (sync edge function) | Prevents timeout. Returns 400 for larger docs. Background job path deferred. |
| Re-runs | Always create new job | No deduplication. Every "Run Extraction" creates a new `extraction_jobs` row. |
| LLM call pattern | Tool-use with `tool_choice: { type: "tool" }` | Schema becomes the tool's `input_schema`. LLM is forced to return conforming structured output. |

## Assessment Gap Resolutions

1. **Provider layer overclaimed** — RESOLVED: MVP uses only `callVertexClaude()`. No multi-provider adapter needed.
2. **Vertex auth mismatch** — RESOLVED: Uses platform `GCP_VERTEX_SA_KEY` env, not `user_api_keys` or `user_provider_connections`.
3. **Page-level execution** — RESOLVED: 50-page hard cap. 400 error for larger docs.
4. **`decryptSecret()` wrong name** — RESOLVED: Not needed. MVP uses platform Vertex, no per-user key decryption.
5. **Idempotency undefined** — RESOLVED: Every run creates a new job. No dedup.

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260315010000_088_extraction_tables.sql`

**Step 1: Write the migration**

```sql
-- Extraction schemas: user-defined JSON Schemas for structured extraction
CREATE TABLE IF NOT EXISTS extraction_schemas (
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

-- Extraction jobs: one row per extraction run
CREATE TABLE IF NOT EXISTS extraction_jobs (
  job_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id),
  schema_uid   TEXT NOT NULL REFERENCES extraction_schemas(schema_uid),
  source_uid   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  llm_provider TEXT NOT NULL DEFAULT 'vertex_ai',
  llm_model    TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
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

-- Extraction results: structured data extracted from documents
CREATE TABLE IF NOT EXISTS extraction_results (
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

-- Realtime publication for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE extraction_schemas;
ALTER PUBLICATION supabase_realtime ADD TABLE extraction_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE extraction_results;
```

**Step 2: Verify migration applies**

Run: `npx supabase db reset` (from `supabase/` directory)
Expected: Migration applies without errors.

**Step 3: Commit**

```bash
git add supabase/migrations/20260315010000_088_extraction_tables.sql
git commit -m "feat: add extraction_schemas, extraction_jobs, extraction_results tables"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `web/src/lib/types.ts` — add extraction row types
- Modify: `web/src/lib/tables.ts` — add table name constants (if this file exists; otherwise add to types.ts)

**Step 1: Add TypeScript types to `web/src/lib/types.ts`**

Add these types alongside existing row types:

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

**Step 2: Commit**

```bash
git add web/src/lib/types.ts
git commit -m "feat: add extraction schema, job, and result TypeScript types"
```

---

## Task 3: Page-Level Text Assembly Helper

**Files:**
- Create: `supabase/functions/_shared/docling_page_text.ts`

**Context:** The existing `web/src/lib/doclingNativeItems.ts` extracts native items with page numbers, but does not assemble full reading-order text per page. This helper does that for the edge function.

**Step 1: Write the helper**

Study the DoclingDocument structure in `web/src/lib/doclingNativeItems.ts:56-170` first. The key data model is:

```
DoclingDocument.body.children[] → each has $ref → resolves to texts/tables/etc
  → each item has prov[].page_no (1-based page number)
  → each text item has text (string content)
  → each table item has text (markdown table representation)
```

Write `supabase/functions/_shared/docling_page_text.ts`:

```typescript
/**
 * Assemble reading-order text per page from a DoclingDocument JSON.
 *
 * Walks the document body tree, groups text content by page number,
 * and returns a Map<pageNumber, pageText> suitable for page-level extraction.
 */

type DocItem = {
  text?: string;
  prov?: Array<{ page_no: number }>;
  children?: Array<{ $ref: string }>;
};

type DoclingDocument = {
  texts?: DocItem[];
  tables?: DocItem[];
  key_value_items?: DocItem[];
  form_items?: DocItem[];
  body?: { children?: Array<{ $ref: string }> };
};

/**
 * Resolve a $ref like "#/texts/3" to the actual item.
 */
function resolveRef(doc: DoclingDocument, ref: string): DocItem | null {
  const match = ref.match(/^#\/(\w+)\/(\d+)$/);
  if (!match) return null;
  const [, collection, indexStr] = match;
  const items = (doc as Record<string, unknown>)[collection] as DocItem[] | undefined;
  if (!items) return null;
  return items[parseInt(indexStr, 10)] ?? null;
}

/**
 * Walk the body tree in reading order, collecting text per page.
 */
function walkChildren(
  doc: DoclingDocument,
  children: Array<{ $ref: string }>,
  pages: Map<number, string[]>,
): void {
  for (const child of children) {
    const item = resolveRef(doc, child.$ref);
    if (!item) continue;

    // Recurse into children first (reading order)
    if (item.children && item.children.length > 0) {
      walkChildren(doc, item.children, pages);
    }

    // Extract text content
    const text = item.text?.trim();
    if (!text) continue;

    // Determine page number (use first provenance entry)
    const pageNo = item.prov?.[0]?.page_no ?? 0;
    const page = pageNo > 0 ? pageNo : 1; // unlocated items go to page 1

    if (!pages.has(page)) pages.set(page, []);
    pages.get(page)!.push(text);
  }
}

/**
 * Assemble reading-order text per page from a DoclingDocument.
 *
 * @param doc  Parsed DoclingDocument JSON
 * @returns    Map where key = 1-based page number, value = concatenated text
 */
export function assemblePageText(doc: DoclingDocument): Map<number, string> {
  const pages = new Map<number, string[]>();

  if (doc.body?.children) {
    walkChildren(doc, doc.body.children, pages);
  }

  const result = new Map<number, string>();
  for (const [page, texts] of pages) {
    result.set(page, texts.join('\n\n'));
  }
  return result;
}

/**
 * Get total page count from a DoclingDocument.
 * Scans all provenance entries to find the maximum page number.
 */
export function getPageCount(doc: DoclingDocument): number {
  let max = 0;
  for (const collection of ['texts', 'tables', 'key_value_items', 'form_items'] as const) {
    const items = doc[collection];
    if (!items) continue;
    for (const item of items) {
      if (!item.prov) continue;
      for (const p of item.prov) {
        if (p.page_no > max) max = p.page_no;
      }
    }
  }
  return max;
}
```

**Step 2: Commit**

```bash
git add supabase/functions/_shared/docling_page_text.ts
git commit -m "feat: add page-level text assembly helper for DoclingDocument"
```

---

## Task 4: `run-extract` Edge Function

**Files:**
- Create: `supabase/functions/run-extract/index.ts`

**Context:** Follow the pattern of `supabase/functions/trigger-parse/index.ts` for auth and request handling. Use `callVertexClaude` from `_shared/vertex_claude.ts` for LLM calls.

**Step 1: Write the edge function**

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";
import { callVertexClaude } from "../_shared/vertex_claude.ts";
import { assemblePageText, getPageCount } from "../_shared/docling_page_text.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_PAGES = 50;
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_SYSTEM_PROMPT =
  "Extract the requested fields from the following document content. Return only the values found in the document. If a field cannot be found, use null.";

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

function userClient(token: string) {
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function requireUserId(req: Request): Promise<{ userId: string; token: string }> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  if (!token) throw new Error("Missing auth token");
  const { data: { user }, error } = await userClient(token).auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { userId: user.id, token };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { userId } = await requireUserId(req);
    const body = await req.json();
    const {
      source_uid,
      schema_uid,
      model = DEFAULT_MODEL,
      temperature = DEFAULT_TEMPERATURE,
      system_prompt = DEFAULT_SYSTEM_PROMPT,
      page_range,
    } = body as {
      source_uid: string;
      schema_uid: string;
      model?: string;
      temperature?: number;
      system_prompt?: string;
      page_range?: { start: number; end: number };
    };

    if (!source_uid || !schema_uid) {
      return new Response(
        JSON.stringify({ error: "source_uid and schema_uid are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const db = adminClient();

    // 1. Load schema — verify ownership
    const { data: schema, error: schemaErr } = await db
      .from("extraction_schemas")
      .select("*")
      .eq("schema_uid", schema_uid)
      .eq("owner_id", userId)
      .single();
    if (schemaErr || !schema) {
      return new Response(
        JSON.stringify({ error: "Schema not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Load document — verify ownership and parsed status
    const { data: doc, error: docErr } = await db
      .from("source_documents")
      .select("*")
      .eq("source_uid", source_uid)
      .eq("owner_id", userId)
      .single();
    if (docErr || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    if (doc.status !== "parsed") {
      return new Response(
        JSON.stringify({ error: "Document must be parsed before extraction" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 3. Create job row
    const { data: job, error: jobErr } = await db
      .from("extraction_jobs")
      .insert({
        owner_id: userId,
        schema_uid,
        source_uid,
        status: "running",
        llm_provider: "vertex_ai",
        llm_model: model,
        config_jsonb: { temperature, system_prompt, page_range },
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "Failed to create extraction job" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const extractionTarget = schema.extraction_target as string;

    try {
      // 4. Load document content
      let contentPayloads: Array<{ pageNumber: number | null; text: string }>;

      if (extractionTarget === "document") {
        // Document-level: load markdown from conversion_representations
        const { data: rep } = await db
          .from("conversion_representations")
          .select("storage_path")
          .eq("source_uid", source_uid)
          .eq("rep_type", "markdown_bytes")
          .single();

        if (!rep?.storage_path) {
          throw new Error("No markdown representation found for this document");
        }

        const { data: fileData } = await db.storage
          .from("conversion-artifacts")
          .download(rep.storage_path);
        if (!fileData) throw new Error("Failed to download markdown");

        const markdown = await fileData.text();
        contentPayloads = [{ pageNumber: null, text: markdown }];
      } else {
        // Page-level: load DoclingDocument JSON and split by page
        const { data: rep } = await db
          .from("conversion_representations")
          .select("storage_path")
          .eq("source_uid", source_uid)
          .eq("rep_type", "docling_document")
          .single();

        if (!rep?.storage_path) {
          throw new Error("No DoclingDocument found for this document");
        }

        const { data: fileData } = await db.storage
          .from("conversion-artifacts")
          .download(rep.storage_path);
        if (!fileData) throw new Error("Failed to download DoclingDocument");

        const docJson = JSON.parse(await fileData.text());
        const totalPages = getPageCount(docJson);

        if (totalPages > MAX_PAGES) {
          throw new Error(
            `Document has ${totalPages} pages, maximum is ${MAX_PAGES} for page-level extraction`,
          );
        }

        const pageTextMap = assemblePageText(docJson);
        const startPage = page_range?.start ?? 1;
        const endPage = page_range?.end ?? totalPages;

        contentPayloads = [];
        for (let p = startPage; p <= endPage; p++) {
          const text = pageTextMap.get(p);
          if (text) contentPayloads.push({ pageNumber: p, text });
        }
      }

      // 5. Call LLM for each content payload
      const tool = {
        name: "extract_fields",
        description: "Extract structured data from the document content",
        input_schema: schema.schema_body,
      };

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const results: Array<{
        page_number: number | null;
        extracted_data: Record<string, unknown>;
        raw_response: Record<string, unknown>;
      }> = [];

      for (const payload of contentPayloads) {
        const llmResponse = await callVertexClaude({
          model,
          max_tokens: DEFAULT_MAX_TOKENS,
          temperature,
          system: system_prompt,
          messages: [
            {
              role: "user",
              content: payload.text,
            },
          ],
          tools: [tool],
          tool_choice: { type: "tool", name: "extract_fields" },
        }) as Record<string, unknown>;

        // Parse tool_use response
        const content = llmResponse.content as Array<{
          type: string;
          input?: Record<string, unknown>;
        }>;
        const toolUseBlock = content?.find((b) => b.type === "tool_use");
        const extractedData = toolUseBlock?.input ?? {};

        // Accumulate token usage
        const usage = llmResponse.usage as {
          input_tokens?: number;
          output_tokens?: number;
        } | undefined;
        totalInputTokens += usage?.input_tokens ?? 0;
        totalOutputTokens += usage?.output_tokens ?? 0;

        results.push({
          page_number: payload.pageNumber,
          extracted_data: extractedData,
          raw_response: llmResponse,
        });
      }

      // 6. Store results
      const { error: insertErr } = await db
        .from("extraction_results")
        .insert(
          results.map((r) => ({
            job_id: job.job_id,
            page_number: r.page_number,
            extracted_data: r.extracted_data,
            raw_response: r.raw_response,
          })),
        );
      if (insertErr) throw new Error(`Failed to store results: ${insertErr.message}`);

      // 7. Update job to complete
      await db
        .from("extraction_jobs")
        .update({
          status: "complete",
          completed_at: new Date().toISOString(),
          token_usage: {
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
          },
        })
        .eq("job_id", job.job_id);

      return new Response(
        JSON.stringify({
          job_id: job.job_id,
          status: "complete",
          results_count: results.length,
          token_usage: {
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (llmError) {
      // Update job to failed — sanitize error message
      const errorMsg = (llmError as Error).message
        .replace(/Bearer\s+\S+/g, "Bearer [REDACTED]")
        .replace(/key[=:]\s*\S+/gi, "key=[REDACTED]")
        .slice(0, 500);

      await db
        .from("extraction_jobs")
        .update({
          status: "failed",
          error: errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", job.job_id);

      return new Response(
        JSON.stringify({ job_id: job.job_id, status: "failed", error: errorMsg }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
});
```

**Step 2: Deploy and test**

Run: `npx supabase functions deploy run-extract` (from `supabase/` directory)

Test with curl:
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/run-extract \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"source_uid": "<parsed-doc-uid>", "schema_uid": "<saved-schema-uid>"}'
```

Expected: `{ "job_id": "...", "status": "complete", "results_count": 1 }`

**Step 3: Commit**

```bash
git add supabase/functions/run-extract/index.ts
git commit -m "feat: add run-extract edge function for structured extraction"
```

---

## Task 5: Shared Schema Builder Component

**Files:**
- Create: `web/src/components/schema/SchemaFieldEditor.tsx`
- Create: `web/src/components/schema/SchemaSelector.tsx`

**Context:** Both `Schemas.tsx` and `useExtractWorkbench.tsx` have duplicated visual field editor code. Extract it into a shared component. The data layer (`extractionSchemaHelpers.ts`) is already shared — this task extracts the UI layer.

**Step 1: Study the current visual field editor**

Read these files to understand the duplicated UI patterns:
- `web/src/pages/Schemas.tsx` — look for the `renderFieldRows` / field editor inline code
- `web/src/pages/useExtractWorkbench.tsx` — look for the `ExtractSchemaTab` component

Both render the same pattern:
- Field name input
- Type selector (Ark UI `Select` with `SCHEMA_TYPE_OPTIONS`)
- Array toggle (`IconBrackets`)
- Required toggle (`IconAsterisk`)
- Delete button (`IconTrash`)
- Description input (extraction hint)
- Enum value editor (when type is enum)
- Nested children (when type is object, recursive)
- "Add property" button
- Monaco JSON editor with bidirectional sync

**Step 2: Create `SchemaFieldEditor.tsx`**

Extract the visual field editor + Monaco editor into a single component:

```typescript
// web/src/components/schema/SchemaFieldEditor.tsx
//
// Props:
//   fields: SchemaField[]
//   onFieldsChange: (fields: SchemaField[]) => void
//   mode: 'visual' | 'code' | 'split'
//   onModeChange?: (mode: 'visual' | 'code' | 'split') => void
//   readOnly?: boolean
//
// Renders:
//   - Visual mode: field list with inputs, type selectors, toggles
//   - Code mode: Monaco JSON editor
//   - Split mode: visual (left) + code (right) with Ark UI Splitter
//   - Bidirectional sync between visual and code representations
```

Implementation notes:
- Copy the field editor rendering logic from whichever file (`Schemas.tsx` or `useExtractWorkbench.tsx`) has the more complete version
- Use `buildObjectSchema(fields)` to generate JSON for Monaco
- Use `parseObjectSchemaToFields(schema)` to parse Monaco JSON back to fields
- Use `useMonacoTheme()` for theme sync
- The mode toggle buttons (Visual / Code / Split) are part of this component's toolbar

**Step 3: Create `SchemaSelector.tsx`**

```typescript
// web/src/components/schema/SchemaSelector.tsx
//
// Props:
//   schemas: ExtractionSchemaRow[]
//   selectedSchemaUid: string | null
//   onSelect: (schemaUid: string) => void
//   onNew: () => void
//   onDelete?: (schemaUid: string) => void
//
// Renders:
//   - Ark UI Select dropdown listing saved schemas by name
//   - "New Schema" button
//   - Optional delete action per schema
```

**Step 4: Refactor `Schemas.tsx` to use the shared components**

Replace the inlined field editor in `web/src/pages/Schemas.tsx` with:
```tsx
<SchemaFieldEditor
  fields={fields}
  onFieldsChange={setFields}
  mode={editorMode}
  onModeChange={setEditorMode}
/>
```

Verify: Load the Schemas page. Confirm the visual builder renders identically to before. Test visual ↔ code sync.

**Step 5: Commit**

```bash
git add web/src/components/schema/SchemaFieldEditor.tsx
git add web/src/components/schema/SchemaSelector.tsx
git add web/src/pages/Schemas.tsx
git commit -m "refactor: extract shared SchemaFieldEditor and SchemaSelector components"
```

---

## Task 6: Frontend Hooks — Schema CRUD

**Files:**
- Create: `web/src/hooks/useExtractionSchemas.ts`

**Step 1: Write the hook**

```typescript
// web/src/hooks/useExtractionSchemas.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeSchemaUid } from '@/lib/extractionSchemaHelpers';
import type { ExtractionSchemaRow } from '@/lib/types';

export function useExtractionSchemas(projectId: string | null) {
  const [schemas, setSchemas] = useState<ExtractionSchemaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch schemas for this project
  const fetchSchemas = useCallback(async () => {
    if (!projectId) { setSchemas([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('extraction_schemas')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });
    if (err) setError(err.message);
    else setSchemas(data ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchSchemas(); }, [fetchSchemas]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`extraction_schemas:${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'extraction_schemas',
        filter: `project_id=eq.${projectId}`,
      }, () => fetchSchemas())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchSchemas]);

  const createSchema = useCallback(async (
    schemaName: string,
    schemaBody: Record<string, unknown>,
    extractionTarget: 'page' | 'document' = 'document',
  ) => {
    const schemaUid = await computeSchemaUid(schemaBody);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error: err } = await supabase
      .from('extraction_schemas')
      .upsert({
        schema_uid: schemaUid,
        owner_id: user.id,
        project_id: projectId,
        schema_name: schemaName,
        schema_body: schemaBody,
        extraction_target: extractionTarget,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (err) throw new Error(err.message);
    return data as ExtractionSchemaRow;
  }, [projectId]);

  const updateSchema = useCallback(async (
    schemaUid: string,
    updates: Partial<Pick<ExtractionSchemaRow, 'schema_name' | 'schema_body' | 'extraction_target'>>,
  ) => {
    const { error: err } = await supabase
      .from('extraction_schemas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('schema_uid', schemaUid);
    if (err) throw new Error(err.message);
  }, []);

  const deleteSchema = useCallback(async (schemaUid: string) => {
    const { error: err } = await supabase
      .from('extraction_schemas')
      .delete()
      .eq('schema_uid', schemaUid);
    if (err) throw new Error(err.message);
  }, []);

  return { schemas, loading, error, createSchema, updateSchema, deleteSchema, refetch: fetchSchemas };
}
```

**Step 2: Commit**

```bash
git add web/src/hooks/useExtractionSchemas.ts
git commit -m "feat: add useExtractionSchemas hook for schema CRUD"
```

---

## Task 7: Frontend Hooks — Job Submission & Results

**Files:**
- Create: `web/src/hooks/useExtractionJobs.ts`
- Create: `web/src/hooks/useExtractionResults.ts`

**Step 1: Write `useExtractionJobs.ts`**

```typescript
// web/src/hooks/useExtractionJobs.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ExtractionJobRow } from '@/lib/types';

export function useExtractionJobs(sourceUid: string | null) {
  const [jobs, setJobs] = useState<ExtractionJobRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!sourceUid) { setJobs([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('extraction_jobs')
      .select('*')
      .eq('source_uid', sourceUid)
      .order('created_at', { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  }, [sourceUid]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Realtime subscription for status updates
  useEffect(() => {
    if (!sourceUid) return;
    const channel = supabase
      .channel(`extraction_jobs:${sourceUid}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'extraction_jobs',
        filter: `source_uid=eq.${sourceUid}`,
      }, () => fetchJobs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sourceUid, fetchJobs]);

  const submitExtraction = useCallback(async (params: {
    source_uid: string;
    schema_uid: string;
    model?: string;
    temperature?: number;
    system_prompt?: string;
    page_range?: { start: number; end: number };
  }) => {
    const { data, error } = await supabase.functions.invoke('run-extract', {
      body: params,
    });
    if (error) throw new Error(error.message);
    return data as { job_id: string; status: string; results_count: number };
  }, []);

  const latestJob = jobs[0] ?? null;

  return { jobs, loading, submitExtraction, latestJob, refetch: fetchJobs };
}
```

**Step 2: Write `useExtractionResults.ts`**

```typescript
// web/src/hooks/useExtractionResults.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ExtractionResultRow } from '@/lib/types';

export function useExtractionResults(jobId: string | null) {
  const [results, setResults] = useState<ExtractionResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!jobId) { setResults([]); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('extraction_results')
      .select('*')
      .eq('job_id', jobId)
      .order('page_number', { ascending: true, nullsFirst: true });
    if (err) setError(err.message);
    else setResults(data ?? []);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  return { results, loading, error, refetch: fetchResults };
}
```

**Step 3: Commit**

```bash
git add web/src/hooks/useExtractionJobs.ts web/src/hooks/useExtractionResults.ts
git commit -m "feat: add useExtractionJobs and useExtractionResults hooks"
```

---

## Task 8: Extract Workbench Overhaul

**Files:**
- Modify: `web/src/pages/useExtractWorkbench.tsx` — major overhaul

**Context:** This is the main integration task. The current file has placeholder tabs. Replace with the real extraction workflow. Reference the LlamaCloud UI in `docs/extract/image.png` and `docs/extract/image copy.png` for the target UX.

**Step 1: Replace tab/pane definitions**

Replace the current `EXTRACT_TABS` and `EXTRACT_DEFAULT_PANES` with:

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

**Step 2: Wire up hooks and state**

Add to the workbench hook:

```typescript
// Inside useExtractWorkbench():
const { focusedProjectId } = useProjectFocus();
const { docs } = useProjectDocuments(focusedProjectId);
const parsedDocs = useMemo(() => docs.filter(d => d.status === 'parsed'), [docs]);

const [activeDocUid, setActiveDocUid] = useState<string | null>(null);
const [activeSchemaUid, setActiveSchemaUid] = useState<string | null>(null);
const [fields, setFields] = useState<SchemaField[]>([]);
const [schemaName, setSchemaName] = useState('Untitled Schema');
const [extractionTarget, setExtractionTarget] = useState<'document' | 'page'>('document');
const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'split'>('visual');

// Advanced config state
const [model, setModel] = useState('claude-sonnet-4-5-20250929');
const [systemPrompt, setSystemPrompt] = useState('');
const [temperature, setTemperature] = useState(0.3);
const [pageRangeStart, setPageRangeStart] = useState<number | null>(null);
const [pageRangeEnd, setPageRangeEnd] = useState<number | null>(null);

const { schemas, createSchema, updateSchema, deleteSchema } = useExtractionSchemas(focusedProjectId);
const { jobs, submitExtraction, latestJob } = useExtractionJobs(activeDocUid);
const { results } = useExtractionResults(latestJob?.job_id ?? null);
```

**Step 3: Implement tab content renderers**

For each tab in `renderContent(tabId)`:

**`extract-files`**: Render `DocumentFileTable` with `parsedDocs`. Empty state: "No parsed documents. Parse documents first." When a doc is selected, set `activeDocUid`.

**`extract-schema`**: Render `SchemaSelector` at top + `SchemaFieldEditor` below. Include extraction target toggle (Document / Page) as a segmented control. Save button calls `createSchema(schemaName, buildObjectSchema(fields), extractionTarget)`.

**`extract-config`**: Basic section: model selector dropdown (hardcoded options for now: `claude-sonnet-4-5-20250929`, `claude-haiku-3-5-20241022`). Advanced accordion (Ark UI `Collapsible`): system prompt textarea, page range inputs (only when target is `page`), temperature slider. "Run Extraction" button — disabled until both `activeDocUid` and `activeSchemaUid` are set. On click:

```typescript
const handleRunExtraction = async () => {
  if (!activeDocUid || !activeSchemaUid) return;
  await submitExtraction({
    source_uid: activeDocUid,
    schema_uid: activeSchemaUid,
    model,
    temperature,
    system_prompt: systemPrompt || undefined,
    page_range: pageRangeStart && pageRangeEnd
      ? { start: pageRangeStart, end: pageRangeEnd }
      : undefined,
  });
};
```

**`extract-results`**: If `latestJob?.status === 'running'`, show spinner. If `complete`, render results:
- Document-level (single result): field/value card
- Page-level (multiple results): accordion per page, each showing field/value pairs
Empty state when no job has been run.

**`extract-json`**: Monaco editor in read-only mode showing `JSON.stringify(results.map(r => r.extracted_data), null, 2)`.

**Step 4: Verify**

1. Open `/app/extract`. Confirm only parsed documents appear.
2. Create a schema, save it. Confirm it appears in the selector.
3. Select a doc + schema → Run Extraction → confirm spinner, then results.
4. Check the JSON tab shows raw extracted data.
5. Re-run → confirm a new job is created.

**Step 5: Commit**

```bash
git add web/src/pages/useExtractWorkbench.tsx
git commit -m "feat: overhaul extract workbench with schema builder, config, and results"
```

---

## Task 9: Suggest Extraction Schema (Optional, Deferred)

**Files:**
- Create: `supabase/functions/suggest-extraction-schema/index.ts`

**Goal:** AI-powered schema suggestion. Given a parsed document, use the LLM to analyze its content and suggest a JSON Schema. Lower priority than the core extraction loop.

**Flow:**
1. Load markdown for `source_uid` (first 32000 chars / ~8000 tokens)
2. Call `callVertexClaude` with prompt: "Analyze this document and suggest a JSON Schema for extracting its key structured data. Return only a valid JSON Schema object."
3. Parse the tool_use response as a JSON Schema
4. Return to frontend, which loads it via `parseObjectSchemaToFields()`

**This task can be implemented after the core loop is working.**

---

## Dependency Graph

```
Task 1 (DB Migration)
  │
  ├── Task 2 (TypeScript Types)
  │
  ├── Task 3 (Page Text Helper) ──────┐
  │                                    │
  ├── Task 4 (Edge Function) ─────────┤
  │                                    │
  ├── Task 5 (Shared Components) ─────┤
  │                                    │
  ├── Task 6 (Schema CRUD Hook) ──────┤
  │                                    │
  ├── Task 7 (Job & Results Hooks) ───┤
  │                                    │
  └────────────────────────────────────┴── Task 8 (Workbench Overhaul)
                                               │
                                               └── Task 9 (AI Schema Suggest, optional)
```

Tasks 2-7 can proceed in parallel after Task 1. Task 8 requires all of 2-7.

---

## Verification Checklist

### Happy Path
- [ ] Apply migration — tables exist, RLS active
- [ ] Create schema via UI — appears in DB and schema selector
- [ ] Select parsed document + schema → Run Extraction → results render
- [ ] Page-level extraction → per-page accordion in results
- [ ] JSON tab shows raw extracted data
- [ ] Re-run same extraction → new job created (not deduped)

### Failure Modes
- [ ] Unparsed documents do not appear in Extract file list
- [ ] Run extraction without schema selected → button disabled
- [ ] Document with >50 pages in page mode → 400 error with clear message
- [ ] LLM error → job status `failed`, error displayed in UI, no key material in error

### Security
- [ ] No API key material in `extraction_jobs` rows
- [ ] RLS prevents cross-user access to schemas/jobs/results
- [ ] Error messages sanitized (no Bearer tokens, no key values)

---

## Critical File Paths

| Purpose | Path |
|---------|------|
| Vertex Claude transport (reuse) | `supabase/functions/_shared/vertex_claude.ts` |
| Vertex auth (reuse) | `supabase/functions/_shared/vertex_auth.ts` |
| Schema helpers (reuse) | `web/src/lib/extractionSchemaHelpers.ts` |
| Docling native items (pattern for page text) | `web/src/lib/doclingNativeItems.ts` |
| Parse workbench (pattern) | `web/src/pages/useParseWorkbench.tsx` |
| Workbench component (layout) | `web/src/components/workbench/Workbench.tsx` |
| Extract workbench (overhaul target) | `web/src/pages/useExtractWorkbench.tsx` |
| Schemas page (refactor target) | `web/src/pages/Schemas.tsx` |
| TypeScript types (extend) | `web/src/lib/types.ts` |
| Trigger-parse edge fn (auth pattern) | `supabase/functions/trigger-parse/index.ts` |

# Structured Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Revision 3** — addresses async architecture and provider config feedback on Revision 2.

**Goal:** Build a LlamaCloud-style structured extraction workbench that takes parsed documents, applies user-defined JSON Schemas, and extracts structured data via LLM tool-use.

**Architecture:** Extraction is a post-parse operation with an **async job pattern** (like the parse pipeline). `run-extract` is a thin trigger that validates inputs, creates a job row, and returns `202 Accepted`. A separate `extract-worker` function does the LLM work, writing results incrementally. The frontend calls the worker in a loop (client-driven, like the annotation worker) and watches progress via Supabase Realtime. Users select their own provider and model for extraction via a dedicated Config tab.

**Tech Stack:** Supabase (Postgres + Edge Functions + Realtime), Vertex AI Claude (`callVertexClaude`), React + Ark UI + Monaco Editor, existing `Workbench` multi-pane component.

**Supersedes:** `docs/plans/2026-03-14-extract-feature-design.md` (Revision 2).

**Reference materials:**
- LlamaCloud UI screenshots: `docs/extract/image.png`, `docs/extract/image copy.png`
- LlamaCloud result JSON: `docs/extract/resultjson.json`
- LlamaCloud schema example: `docs/extract/schema.json`
- Docling extraction docs: `https://docling-project.github.io/docling/examples/extraction/`
- Assessment: `web-docs/src/content/docs/assessments/2026-03-14-extract-structured-extraction-assessment.mdx`

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provider | User-configured, extraction-specific | Config tab shows all providers from `user_api_keys` + Vertex via `user_provider_connections`. User picks provider+model per extraction. |
| Async pattern | Client-driven worker (like annotations) | `run-extract` returns 202. `extract-worker` claims and processes pages. Frontend calls worker in a loop. Realtime for progress. |
| Extraction targets | Document + Page (Table Row deferred) | Table Row needs more design. Document and Page cover the primary use cases. |
| Config UX | Basic + Advanced accordion | Basic: model selector, extraction target. Advanced: system prompt, page range, temperature. |
| Schema UX | Shared component in both Schemas page and Extract workbench | Same `SchemaFieldEditor` component, same save/load logic. Extract workbench middle column IS the schema builder. |
| Schema identity | UUID primary key | Each saved schema is an independent record. Body hash stored as optional column, not used as PK. |
| Page-level limit | 50 pages max on **requested range** | Cap applies to `(end - start + 1)`, not total document pages. A 200-page doc with range 1-5 is fine. |
| Re-runs | Always create new job | No deduplication. Every "Run Extraction" creates a new `extraction_jobs` row. |
| LLM call pattern | Tool-use with `tool_choice: { type: "tool" }` | Schema becomes the tool's `input_schema`. LLM is forced to return conforming structured output. |
| Artifact contract | `representation_type`, `artifact_locator`, `documents` bucket | Matches live repo: `supabase/functions/_shared/representation.ts` |

## Assessment Gap Resolutions

### From original design assessment
1. **Provider layer overclaimed** — RESOLVED: Extraction has its own provider config. Reads from `user_api_keys` (API-key providers) and `user_provider_connections` (Vertex). Uses `decryptWithContext()` for API keys, `callVertexClaude()` for Vertex.
2. **Vertex auth mismatch** — RESOLVED: Vertex auth goes through `user_provider_connections` (service account) or falls back to platform `GCP_VERTEX_SA_KEY`. Both paths supported.
3. **`decryptSecret()` wrong name** — RESOLVED: Uses `decryptWithContext()` from `_shared/api_key_crypto.ts` with context `"user-api-keys-v1"`.
4. **Idempotency undefined** — RESOLVED: Every run creates a new job. No dedup.
5. **Synchronous edge function** — RESOLVED: Split into `run-extract` (trigger, returns 202) and `extract-worker` (processes pages incrementally). Client-driven worker loop pattern matches annotation worker.

### From structured extraction plan assessment (Revision 1 → 2)
5. **Artifact contract mismatch** — FIXED: Uses `representation_type`, `artifact_locator`, `doclingdocument_json`, `documents` bucket. Matches `_shared/representation.ts`.
6. **Schema identity collision** — FIXED: UUID primary key. Body hash is an indexed column, not the PK. No cross-user or cross-name collisions.
7. **Page-text helper wrong Docling shape** — FIXED: Rewritten to match `doclingNativeItems.ts` exactly — `self_ref` resolution, body+furniture traversal, `tableToText()` from `table_cells`, key-value and form items.
8. **`focusedProjectId` vs `resolvedProjectId`** — FIXED: Uses `resolvedProjectId` throughout, matching both existing workbenches.
9. **Page-range validation missing** — FIXED: 50-page cap on requested range (not total pages), explicit validation rules including `start > totalPages`, defined empty-result behavior.
10. **No automated tests** — FIXED: Each task includes required test files. Tests are mandatory, not optional.
11. **Migration missing indexes and FK** — FIXED: Indexes on query paths, `project_id` typed as UUID (matching `projects.project_id`), FK on `extraction_jobs.source_uid` referencing `source_documents.source_uid`, guarded publication.
12. **Docs path wrong** — FIXED: All docs references use `web-docs/src/content/docs/` for published content.

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260315010000_088_extraction_tables.sql`

**Step 1: Write the migration**

```sql
-- Extraction schemas: user-defined JSON Schemas for structured extraction
CREATE TABLE IF NOT EXISTS extraction_schemas (
  schema_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES auth.users(id),
  project_id       UUID REFERENCES projects(project_id),
  schema_name      TEXT NOT NULL,
  schema_body      JSONB NOT NULL,
  schema_body_hash TEXT,
  extraction_target TEXT NOT NULL DEFAULT 'document'
    CHECK (extraction_target IN ('page', 'document')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE INDEX idx_extraction_schemas_project ON extraction_schemas(project_id);
CREATE INDEX idx_extraction_schemas_body_hash ON extraction_schemas(schema_body_hash);

-- Extraction jobs: one row per extraction run
CREATE TABLE IF NOT EXISTS extraction_jobs (
  job_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id),
  schema_id    UUID NOT NULL REFERENCES extraction_schemas(schema_id),
  source_uid   TEXT NOT NULL REFERENCES source_documents(source_uid),
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

CREATE INDEX idx_extraction_jobs_source ON extraction_jobs(source_uid);
CREATE INDEX idx_extraction_jobs_schema ON extraction_jobs(schema_id);

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

CREATE INDEX idx_extraction_results_job ON extraction_results(job_id);

-- Realtime publication (guarded for repeatable migration)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_schemas;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_jobs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE extraction_results;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
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

**Step 1: Add TypeScript types to `web/src/lib/types.ts`**

Add these types alongside existing row types:

```typescript
export type ExtractionSchemaRow = {
  schema_id: string;  // UUID
  owner_id: string;   // UUID
  project_id: string | null;  // UUID
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
- Create: `supabase/functions/_shared/docling_page_text.test.ts`

**Context:** Must match the exact Docling structure used in `web/src/lib/doclingNativeItems.ts`. That file uses `self_ref` for item resolution, traverses both `body` and `furniture`, reconstructs tables from `table_cells` via a grid, and handles text, table, key_value, and form item kinds.

**Step 1: Write the helper**

```typescript
/**
 * Assemble reading-order text per page from a DoclingDocument JSON.
 *
 * Mirrors the traversal in web/src/lib/doclingNativeItems.ts:
 *  - resolves items by self_ref (not $ref index math)
 *  - traverses body AND furniture
 *  - reconstructs tables from table_cells via grid
 *  - includes key_value and form item text
 */

// ---------------------------------------------------------------------------
// Types (matching doclingNativeItems.ts)
// ---------------------------------------------------------------------------

type DoclingRef = { $ref: string };
type DoclingProv = { page_no?: number };

type DoclingTextItem = {
  self_ref: string;
  children?: DoclingRef[];
  label: string;
  prov?: DoclingProv[];
  text?: string;
  orig?: string;
};

type DoclingTableCell = {
  text: string;
  start_row_offset_idx: number;
  start_col_offset_idx: number;
};

type DoclingTableItem = {
  self_ref: string;
  children?: DoclingRef[];
  label: string;
  prov?: DoclingProv[];
  data?: {
    table_cells?: DoclingTableCell[];
    num_rows?: number;
    num_cols?: number;
  };
};

type DoclingPictureItem = {
  self_ref: string;
  children?: DoclingRef[];
  label?: string;
  prov?: DoclingProv[];
};

type DoclingNodeItem = {
  self_ref: string;
  children?: DoclingRef[];
  label?: string;
  name?: string;
};

type DoclingDocument = {
  body?: { children?: DoclingRef[] };
  furniture?: { children?: DoclingRef[] };
  groups?: DoclingNodeItem[];
  texts?: DoclingTextItem[];
  tables?: DoclingTableItem[];
  pictures?: DoclingPictureItem[];
  key_value_items?: DoclingTextItem[];
  form_items?: DoclingTextItem[];
};

// ---------------------------------------------------------------------------
// Table text reconstruction (same logic as doclingNativeItems.ts:198-217)
// ---------------------------------------------------------------------------

function tableToText(table: DoclingTableItem): string {
  const cells = table.data?.table_cells ?? [];
  const numRows = table.data?.num_rows ?? 0;
  const numCols = table.data?.num_cols ?? 0;
  if (cells.length === 0 || numRows === 0 || numCols === 0) {
    return cells.map((cell) => cell.text).join(" ");
  }

  const grid: string[][] = Array.from({ length: numRows }, () =>
    Array.from({ length: numCols }, () => ""),
  );

  for (const cell of cells) {
    if (
      cell.start_row_offset_idx < numRows &&
      cell.start_col_offset_idx < numCols
    ) {
      grid[cell.start_row_offset_idx]![cell.start_col_offset_idx] = cell.text;
    }
  }

  return grid.map((row) => row.join(" | ")).join("\n");
}

// ---------------------------------------------------------------------------
// Page number extraction (same logic as doclingNativeItems.ts:85-92)
// ---------------------------------------------------------------------------

function extractFirstPageNo(prov: DoclingProv[] | undefined): number | null {
  for (const item of prov ?? []) {
    const pageNo =
      typeof item.page_no === "number" && Number.isFinite(item.page_no)
        ? Math.trunc(item.page_no)
        : null;
    if (pageNo && pageNo > 0) return pageNo;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Document traversal (mirrors doclingNativeItems.ts:74-196)
// ---------------------------------------------------------------------------

export function assemblePageText(doc: DoclingDocument): Map<number, string> {
  const textsMap = new Map(
    (doc.texts ?? []).map((item) => [item.self_ref, item]),
  );
  const tablesMap = new Map(
    (doc.tables ?? []).map((item) => [item.self_ref, item]),
  );
  const kvMap = new Map(
    (doc.key_value_items ?? []).map((item) => [item.self_ref, item]),
  );
  const formMap = new Map(
    (doc.form_items ?? []).map((item) => [item.self_ref, item]),
  );
  const groupsMap = new Map(
    (doc.groups ?? []).map((item) => [item.self_ref, item]),
  );

  const pages = new Map<number, string[]>();
  const visited = new Set<string>();

  function addToPage(pageNo: number | null, text: string): void {
    const page = pageNo ?? 1; // unlocated items go to page 1
    if (!pages.has(page)) pages.set(page, []);
    pages.get(page)!.push(text);
  }

  function walk(ref: DoclingRef): void {
    const pointer = ref.$ref;
    if (visited.has(pointer)) return;
    visited.add(pointer);

    const textItem = textsMap.get(pointer);
    if (textItem) {
      const content = textItem.text ?? textItem.orig ?? "";
      if (content.trim()) addToPage(extractFirstPageNo(textItem.prov), content);
      for (const child of textItem.children ?? []) walk(child);
      return;
    }

    const tableItem = tablesMap.get(pointer);
    if (tableItem) {
      const content = tableToText(tableItem);
      if (content.trim()) addToPage(extractFirstPageNo(tableItem.prov), content);
      for (const child of tableItem.children ?? []) walk(child);
      return;
    }

    const kvItem = kvMap.get(pointer);
    if (kvItem) {
      const content = kvItem.text ?? kvItem.orig ?? "";
      if (content.trim()) addToPage(extractFirstPageNo(kvItem.prov), content);
      for (const child of kvItem.children ?? []) walk(child);
      return;
    }

    const formItem = formMap.get(pointer);
    if (formItem) {
      const content = formItem.text ?? formItem.orig ?? "";
      if (content.trim()) addToPage(extractFirstPageNo(formItem.prov), content);
      for (const child of formItem.children ?? []) walk(child);
      return;
    }

    const group = groupsMap.get(pointer);
    if (group) {
      for (const child of group.children ?? []) walk(child);
    }
  }

  // Traverse body AND furniture (same as doclingNativeItems.ts:192-193)
  for (const child of doc.body?.children ?? []) walk(child);
  for (const child of doc.furniture?.children ?? []) walk(child);

  const result = new Map<number, string>();
  for (const [page, texts] of pages) {
    result.set(page, texts.join("\n\n"));
  }
  return result;
}

/**
 * Get total page count from a DoclingDocument.
 * Scans all provenance entries to find the maximum page number.
 */
export function getPageCount(doc: DoclingDocument): number {
  let max = 0;
  for (const collection of [
    "texts",
    "tables",
    "key_value_items",
    "form_items",
  ] as const) {
    const items = doc[collection];
    if (!items) continue;
    for (const item of items) {
      if (!item.prov) continue;
      for (const p of item.prov) {
        const pageNo =
          typeof p.page_no === "number" && Number.isFinite(p.page_no)
            ? Math.trunc(p.page_no)
            : 0;
        if (pageNo > max) max = pageNo;
      }
    }
  }
  return max;
}
```

**Step 2: Write the test**

```typescript
// supabase/functions/_shared/docling_page_text.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assemblePageText, getPageCount } from "./docling_page_text.ts";

const fixture = {
  texts: [
    { self_ref: "#/texts/0", label: "title", text: "Introduction", prov: [{ page_no: 1 }] },
    { self_ref: "#/texts/1", label: "paragraph", text: "Page one content.", prov: [{ page_no: 1 }] },
    { self_ref: "#/texts/2", label: "paragraph", text: "Page two content.", prov: [{ page_no: 2 }] },
    { self_ref: "#/texts/3", label: "header", text: "Header text", prov: [{ page_no: 1 }] },
  ],
  tables: [
    {
      self_ref: "#/tables/0",
      label: "table",
      prov: [{ page_no: 2 }],
      data: {
        table_cells: [
          { text: "Name", start_row_offset_idx: 0, start_col_offset_idx: 0 },
          { text: "Age", start_row_offset_idx: 0, start_col_offset_idx: 1 },
          { text: "Alice", start_row_offset_idx: 1, start_col_offset_idx: 0 },
          { text: "30", start_row_offset_idx: 1, start_col_offset_idx: 1 },
        ],
        num_rows: 2,
        num_cols: 2,
      },
    },
  ],
  key_value_items: [
    { self_ref: "#/key_value_items/0", label: "kv", text: "Invoice: 12345", prov: [{ page_no: 1 }] },
  ],
  form_items: [
    { self_ref: "#/form_items/0", label: "form", text: "Field: Value", prov: [{ page_no: 2 }] },
  ],
  groups: [
    { self_ref: "#/groups/0", children: [{ $ref: "#/texts/0" }, { $ref: "#/texts/1" }] },
  ],
  body: {
    children: [
      { $ref: "#/groups/0" },
      { $ref: "#/texts/2" },
      { $ref: "#/tables/0" },
      { $ref: "#/key_value_items/0" },
      { $ref: "#/form_items/0" },
    ],
  },
  furniture: {
    children: [{ $ref: "#/texts/3" }],
  },
};

Deno.test("assemblePageText groups text by page in reading order", () => {
  const result = assemblePageText(fixture);
  assertEquals(result.size, 2);

  const page1 = result.get(1)!;
  // Page 1 should have: Introduction, Page one content, Invoice: 12345, Header text (from furniture)
  assertEquals(page1.includes("Introduction"), true);
  assertEquals(page1.includes("Page one content"), true);
  assertEquals(page1.includes("Invoice: 12345"), true);
  assertEquals(page1.includes("Header text"), true);

  const page2 = result.get(2)!;
  // Page 2 should have: Page two content, table, form field
  assertEquals(page2.includes("Page two content"), true);
  assertEquals(page2.includes("Name | Age"), true);
  assertEquals(page2.includes("Alice | 30"), true);
  assertEquals(page2.includes("Field: Value"), true);
});

Deno.test("assemblePageText reconstructs tables from table_cells", () => {
  const result = assemblePageText(fixture);
  const page2 = result.get(2)!;
  // Table should be reconstructed as grid, not just cell text concatenated
  assertEquals(page2.includes("Name | Age\nAlice | 30"), true);
});

Deno.test("assemblePageText traverses furniture", () => {
  const result = assemblePageText(fixture);
  const page1 = result.get(1)!;
  assertEquals(page1.includes("Header text"), true);
});

Deno.test("getPageCount returns max page number", () => {
  assertEquals(getPageCount(fixture), 2);
});

Deno.test("getPageCount returns 0 for empty document", () => {
  assertEquals(getPageCount({}), 0);
});
```

**Step 3: Run tests**

Run: `cd supabase && deno test functions/_shared/docling_page_text.test.ts`
Expected: All 5 tests pass.

**Step 4: Commit**

```bash
git add supabase/functions/_shared/docling_page_text.ts supabase/functions/_shared/docling_page_text.test.ts
git commit -m "feat: add page-level text assembly helper for DoclingDocument with tests"
```

---

## Task 4a: `run-extract` Edge Function (Async Trigger)

**Files:**
- Create: `supabase/functions/run-extract/index.ts`
- Create: `supabase/functions/_shared/extract_helpers.ts`

**Context:** This is a **thin trigger** following the pattern of `trigger-parse/index.ts`. It validates inputs, creates a job row with `pending` status, and returns `202 Accepted` immediately. No LLM work happens here.

**Step 1: Write shared helpers**

Create `supabase/functions/_shared/extract_helpers.ts` with reusable functions for both `run-extract` and `extract-worker`:

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DOCUMENTS_BUCKET = Deno.env.get("DOCUMENTS_BUCKET") ?? "documents";
export const MAX_RANGE_PAGES = 50;

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

export function userClient(token: string) {
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function requireUserId(
  req: Request,
): Promise<{ userId: string; token: string }> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  if (!token) throw new Error("Missing auth token");
  const {
    data: { user },
    error,
  } = await userClient(token).auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { userId: user.id, token };
}

/** Load an artifact by representation_type and download from the documents bucket. */
export async function loadArtifact(
  db: ReturnType<typeof adminClient>,
  sourceUid: string,
  representationType: string,
): Promise<string> {
  const { data: rep } = await db
    .from("conversion_representations")
    .select("artifact_locator")
    .eq("source_uid", sourceUid)
    .eq("representation_type", representationType)
    .maybeSingle();

  if (!rep?.artifact_locator) {
    throw new Error(
      `No ${representationType} representation found for this document`,
    );
  }

  const { data: fileData } = await db.storage
    .from(DOCUMENTS_BUCKET)
    .download(rep.artifact_locator);
  if (!fileData) {
    throw new Error(`Failed to download ${representationType} artifact`);
  }

  return fileData.text();
}

/** Validate page range and return clamped values. */
export function validatePageRange(
  pageRange: { start: number; end: number } | undefined,
  totalPages: number,
): { start: number; end: number } {
  const start = pageRange?.start ?? 1;
  const end = pageRange?.end ?? totalPages;

  if (start < 1) throw new Error("Page range start must be >= 1");
  if (end < start)
    throw new Error("Page range end must be >= start");
  if (start > totalPages)
    throw new Error(
      `Page range start (${start}) exceeds document page count (${totalPages})`,
    );

  const clampedEnd = Math.min(end, totalPages);
  const rangeSize = clampedEnd - start + 1;

  if (rangeSize > MAX_RANGE_PAGES) {
    throw new Error(
      `Requested page range (${rangeSize} pages) exceeds maximum of ${MAX_RANGE_PAGES}. Narrow the page range.`,
    );
  }

  return { start, end: clampedEnd };
}

/** Sanitize error messages — strip tokens and key material. */
export function sanitizeError(err: unknown): string {
  return ((err as Error).message ?? String(err))
    .replace(/Bearer\s+\S+/g, "Bearer [REDACTED]")
    .replace(/key[=:]\s*\S+/gi, "key=[REDACTED]")
    .slice(0, 500);
}

/** Resolve LLM transport for a given provider.
 *
 * For API-key providers (anthropic, openai, google, custom):
 *   - reads encrypted key from user_api_keys
 *   - decrypts with decryptWithContext()
 *   - returns { transport: "api_key", provider, apiKey, baseUrl? }
 *
 * For Vertex AI:
 *   - checks user_provider_connections for GCP service account
 *   - falls back to platform GCP_VERTEX_SA_KEY
 *   - returns { transport: "vertex_ai" }
 */
export type ResolvedProvider =
  | { transport: "vertex_ai" }
  | { transport: "api_key"; provider: string; apiKey: string; baseUrl?: string };

export async function resolveProvider(
  db: ReturnType<typeof adminClient>,
  userId: string,
  provider: string,
): Promise<ResolvedProvider> {
  if (provider === "vertex_ai") {
    return { transport: "vertex_ai" };
  }

  // API-key providers: load and decrypt
  const { data: keyRow } = await db
    .from("user_api_keys")
    .select("api_key_encrypted, base_url")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (!keyRow?.api_key_encrypted) {
    throw new Error(`No API key configured for provider "${provider}"`);
  }

  // Import decrypt helper
  const { decryptWithContext } = await import("../_shared/api_key_crypto.ts");
  const secret = Deno.env.get("API_KEY_ENCRYPTION_SECRET")!;
  const apiKey = await decryptWithContext(
    keyRow.api_key_encrypted,
    secret,
    "user-api-keys-v1",
  );

  return {
    transport: "api_key",
    provider,
    apiKey,
    baseUrl: keyRow.base_url ?? undefined,
  };
}
```

**Step 2: Write the trigger function**

```typescript
// supabase/functions/run-extract/index.ts
//
// Thin trigger: validates inputs, creates job, returns 202.
// No LLM work. The frontend calls extract-worker to process.

import {
  adminClient,
  requireUserId,
} from "../_shared/extract_helpers.ts";

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
      schema_id,
      provider = "vertex_ai",
      model = "claude-sonnet-4-5-20250929",
      temperature = 0.3,
      system_prompt,
      page_range,
    } = body as {
      source_uid: string;
      schema_id: string;
      provider?: string;
      model?: string;
      temperature?: number;
      system_prompt?: string;
      page_range?: { start: number; end: number };
    };

    if (!source_uid || !schema_id) {
      return new Response(
        JSON.stringify({ error: "source_uid and schema_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const db = adminClient();

    // 1. Load schema — verify ownership
    const { data: schema, error: schemaErr } = await db
      .from("extraction_schemas")
      .select("*")
      .eq("schema_id", schema_id)
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
      .select("source_uid, owner_id, status")
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

    // 3. Create job row — status "pending", return immediately
    const { data: job, error: jobErr } = await db
      .from("extraction_jobs")
      .insert({
        owner_id: userId,
        schema_id,
        source_uid,
        status: "pending",
        llm_provider: provider,
        llm_model: model,
        config_jsonb: { temperature, system_prompt, page_range },
      })
      .select()
      .single();
    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "Failed to create extraction job" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // 4. Return 202 Accepted — frontend calls extract-worker next
    return new Response(
      JSON.stringify({
        job_id: job.job_id,
        status: "pending",
      }),
      { status: 202, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
});
```

**Step 3: Commit**

```bash
git add supabase/functions/_shared/extract_helpers.ts supabase/functions/run-extract/index.ts
git commit -m "feat: add run-extract trigger (async 202 pattern) and shared extraction helpers"
```

---

## Task 4b: `extract-worker` Edge Function (LLM Processing)

**Files:**
- Create: `supabase/functions/extract-worker/index.ts`

**Context:** This is the **worker** that does the actual LLM calls. The frontend calls it after receiving a `job_id` from `run-extract`. For document-level extraction, one call suffices. For page-level, the frontend calls the worker in a loop — each call processes one or more pages and writes results incrementally. The worker resolves the user's chosen provider, decrypts their API key if needed, and calls the appropriate LLM transport.

Pattern reference: `supabase/functions/worker/index.ts` (annotation worker).

**Step 1: Write the worker**

```typescript
// supabase/functions/extract-worker/index.ts
//
// Processes extraction work for a given job_id.
// Called by the frontend after run-extract returns 202.
//
// For document-level: processes the entire document in one call.
// For page-level: processes a batch of pages per invocation.
//   The frontend calls again with the same job_id until all pages are done.
//
// Request: { job_id: string }
// Response: { job_id, status, pages_completed, pages_total }

import { callVertexClaude } from "../_shared/vertex_claude.ts";
import { assemblePageText, getPageCount } from "../_shared/docling_page_text.ts";
import {
  adminClient,
  requireUserId,
  loadArtifact,
  validatePageRange,
  resolveProvider,
  sanitizeError,
  type ResolvedProvider,
} from "../_shared/extract_helpers.ts";

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_SYSTEM_PROMPT =
  "Extract the requested fields from the following document content. Return only the values found in the document. If a field cannot be found, use null.";
const PAGES_PER_BATCH = 5; // pages processed per worker call

/** Call LLM with the appropriate transport based on resolved provider. */
async function callLLM(
  resolved: ResolvedProvider,
  params: {
    model: string;
    temperature: number;
    systemPrompt: string;
    userContent: string;
    tool: { name: string; description: string; input_schema: unknown };
  },
): Promise<Record<string, unknown>> {
  if (resolved.transport === "vertex_ai") {
    return callVertexClaude({
      model: params.model,
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: params.temperature,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userContent }],
      tools: [params.tool],
      tool_choice: { type: "tool", name: params.tool.name },
    }) as Promise<Record<string, unknown>>;
  }

  // API-key provider: OpenAI-compatible chat/completions
  const baseUrl = resolved.baseUrl ?? (
    resolved.provider === "anthropic"
      ? "https://api.anthropic.com/v1"
      : resolved.provider === "openai"
        ? "https://api.openai.com/v1"
        : resolved.provider === "google"
          ? "https://generativelanguage.googleapis.com/v1beta"
          : resolved.baseUrl
  );

  if (!baseUrl) throw new Error(`No base URL for provider "${resolved.provider}"`);

  // For Anthropic direct API
  if (resolved.provider === "anthropic") {
    const resp = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": resolved.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: DEFAULT_MAX_TOKENS,
        temperature: params.temperature,
        system: params.systemPrompt,
        messages: [{ role: "user", content: params.userContent }],
        tools: [params.tool],
        tool_choice: { type: "tool", name: params.tool.name },
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Anthropic API ${resp.status}: ${errText.slice(0, 300)}`);
    }
    return resp.json();
  }

  // For OpenAI-compatible (openai, custom)
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resolved.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      temperature: params.temperature,
      max_tokens: DEFAULT_MAX_TOKENS,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userContent },
      ],
      tools: [{
        type: "function",
        function: {
          name: params.tool.name,
          description: params.tool.description,
          parameters: params.tool.input_schema,
        },
      }],
      tool_choice: { type: "function", function: { name: params.tool.name } },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`LLM API ${resp.status}: ${errText.slice(0, 300)}`);
  }
  return resp.json();
}

/** Parse extracted data from LLM response (handles both Anthropic and OpenAI formats). */
function parseExtractedData(
  response: Record<string, unknown>,
  provider: string,
): Record<string, unknown> {
  // Anthropic format: content[].type === "tool_use", data in content[].input
  if (provider === "anthropic" || provider === "vertex_ai") {
    const content = response.content as Array<{ type: string; input?: Record<string, unknown> }> | undefined;
    const toolUseBlock = content?.find((b) => b.type === "tool_use");
    if (!toolUseBlock?.input) throw new Error("LLM did not return a tool_use response");
    return toolUseBlock.input;
  }

  // OpenAI format: choices[0].message.tool_calls[0].function.arguments (JSON string)
  const choices = response.choices as Array<{
    message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
  }> | undefined;
  const args = choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("LLM did not return a tool_calls response");
  return JSON.parse(args);
}

/** Extract token usage from LLM response (handles both formats). */
function parseTokenUsage(
  response: Record<string, unknown>,
): { input_tokens: number; output_tokens: number } {
  const usage = response.usage as Record<string, number> | undefined;
  return {
    input_tokens: usage?.input_tokens ?? usage?.prompt_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? usage?.completion_tokens ?? 0,
  };
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
    const { job_id } = (await req.json()) as { job_id: string };
    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "job_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const db = adminClient();

    // 1. Load job — verify ownership and eligible status
    const { data: job, error: jobErr } = await db
      .from("extraction_jobs")
      .select("*")
      .eq("job_id", job_id)
      .eq("owner_id", userId)
      .single();
    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    if (job.status === "complete" || job.status === "failed") {
      return new Response(
        JSON.stringify({ job_id, status: job.status, message: "Job already finished" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Load schema
    const { data: schema } = await db
      .from("extraction_schemas")
      .select("*")
      .eq("schema_id", job.schema_id)
      .single();
    if (!schema) {
      throw new Error("Schema not found");
    }

    // 3. Set status to running (if still pending)
    if (job.status === "pending") {
      await db
        .from("extraction_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("job_id", job_id);
    }

    // 4. Resolve provider + decrypt API key
    const config = job.config_jsonb as {
      temperature?: number;
      system_prompt?: string;
      page_range?: { start: number; end: number };
    };
    const resolved = await resolveProvider(db, userId, job.llm_provider);

    const extractionTarget = schema.extraction_target as string;
    const tool = {
      name: "extract_fields",
      description: "Extract structured data from the document content",
      input_schema: schema.schema_body,
    };
    const systemPrompt = config.system_prompt ?? DEFAULT_SYSTEM_PROMPT;
    const temperature = config.temperature ?? 0.3;

    try {
      if (extractionTarget === "document") {
        // Document-level: single LLM call
        const markdown = await loadArtifact(db, job.source_uid, "markdown_bytes");

        const response = await callLLM(resolved, {
          model: job.llm_model,
          temperature,
          systemPrompt,
          userContent: markdown,
          tool,
        });

        const extractedData = parseExtractedData(response, job.llm_provider);
        const usage = parseTokenUsage(response);

        // Write result
        await db.from("extraction_results").insert({
          job_id,
          page_number: null,
          extracted_data: extractedData,
          raw_response: response,
        });

        // Mark complete
        await db.from("extraction_jobs").update({
          status: "complete",
          completed_at: new Date().toISOString(),
          token_usage: usage,
        }).eq("job_id", job_id);

        return new Response(
          JSON.stringify({ job_id, status: "complete", pages_completed: 1, pages_total: 1 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // Page-level: process a batch of pages per call
      const docJsonText = await loadArtifact(db, job.source_uid, "doclingdocument_json");
      const docJson = JSON.parse(docJsonText);
      const totalPages = getPageCount(docJson);
      const range = validatePageRange(config.page_range, totalPages);
      const pageTextMap = assemblePageText(docJson);

      // Determine which pages still need processing
      const { data: existingResults } = await db
        .from("extraction_results")
        .select("page_number")
        .eq("job_id", job_id);
      const completedPages = new Set(
        (existingResults ?? []).map((r) => r.page_number),
      );

      const pendingPages: Array<{ pageNumber: number; text: string }> = [];
      for (let p = range.start; p <= range.end; p++) {
        if (completedPages.has(p)) continue;
        const text = pageTextMap.get(p);
        if (text) pendingPages.push({ pageNumber: p, text });
      }

      if (pendingPages.length === 0) {
        // All pages done
        const totalUsage = await aggregateTokenUsage(db, job_id);
        await db.from("extraction_jobs").update({
          status: "complete",
          completed_at: new Date().toISOString(),
          token_usage: totalUsage,
        }).eq("job_id", job_id);

        return new Response(
          JSON.stringify({
            job_id,
            status: "complete",
            pages_completed: completedPages.size,
            pages_total: range.end - range.start + 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // Process up to PAGES_PER_BATCH pages
      const batch = pendingPages.slice(0, PAGES_PER_BATCH);
      for (const page of batch) {
        const response = await callLLM(resolved, {
          model: job.llm_model,
          temperature,
          systemPrompt,
          userContent: page.text,
          tool,
        });

        const extractedData = parseExtractedData(response, job.llm_provider);

        // Write result incrementally (triggers realtime)
        await db.from("extraction_results").insert({
          job_id,
          page_number: page.pageNumber,
          extracted_data: extractedData,
          raw_response: response,
        });
      }

      const newCompleted = completedPages.size + batch.length;
      const totalExpected = range.end - range.start + 1;
      const allDone = newCompleted >= totalExpected;

      if (allDone) {
        const totalUsage = await aggregateTokenUsage(db, job_id);
        await db.from("extraction_jobs").update({
          status: "complete",
          completed_at: new Date().toISOString(),
          token_usage: totalUsage,
        }).eq("job_id", job_id);
      }

      return new Response(
        JSON.stringify({
          job_id,
          status: allDone ? "complete" : "running",
          pages_completed: newCompleted,
          pages_total: totalExpected,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (llmError) {
      const errorMsg = sanitizeError(llmError);
      await db.from("extraction_jobs").update({
        status: "failed",
        error: errorMsg,
        completed_at: new Date().toISOString(),
      }).eq("job_id", job_id);

      return new Response(
        JSON.stringify({ job_id, status: "failed", error: errorMsg }),
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

/** Sum token usage across all results for a job. */
async function aggregateTokenUsage(
  db: ReturnType<typeof adminClient>,
  jobId: string,
): Promise<{ input_tokens: number; output_tokens: number }> {
  const { data: results } = await db
    .from("extraction_results")
    .select("raw_response")
    .eq("job_id", jobId);

  let inputTokens = 0;
  let outputTokens = 0;
  for (const r of results ?? []) {
    const usage = parseTokenUsage(r.raw_response ?? {});
    inputTokens += usage.input_tokens;
    outputTokens += usage.output_tokens;
  }
  return { input_tokens: inputTokens, output_tokens: outputTokens };
}
```

**Step 2: Deploy and test**

Run: `npx supabase functions deploy run-extract && npx supabase functions deploy extract-worker`

Test flow:
```bash
# 1. Trigger extraction — returns 202 with job_id
JOB=$(curl -s -X POST .../functions/v1/run-extract \
  -H "Authorization: Bearer <jwt>" \
  -d '{"source_uid":"...","schema_id":"...","provider":"vertex_ai","model":"claude-sonnet-4-5-20250929"}')

# 2. Call worker — processes pages
curl -X POST .../functions/v1/extract-worker \
  -H "Authorization: Bearer <jwt>" \
  -d "{\"job_id\": \"$(echo $JOB | jq -r .job_id)\"}"

# 3. Call worker again if page-level and status is "running"
# Repeat until status is "complete"
```

**Step 3: Commit**

```bash
git add supabase/functions/extract-worker/index.ts
git commit -m "feat: add extract-worker for async LLM processing with multi-provider support"
```

---

## Task 5: Shared Schema Builder Component

**Files:**
- Create: `web/src/components/schema/SchemaFieldEditor.tsx`
- Create: `web/src/components/schema/SchemaSelector.tsx`

**Context:** Both `Schemas.tsx` and `useExtractWorkbench.tsx` have duplicated visual field editor code. Extract it into a shared component. The data layer (`extractionSchemaHelpers.ts`) is already shared — this task extracts the UI layer.

**Step 1: Study the current visual field editor**

Read these files to understand the duplicated UI patterns:
- `web/src/pages/Schemas.tsx` — look for the field editor inline code
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
//   selectedSchemaId: string | null
//   onSelect: (schemaId: string) => void
//   onNew: () => void
//   onDelete?: (schemaId: string) => void
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
    const bodyHash = await computeSchemaUid(schemaBody);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error: err } = await supabase
      .from('extraction_schemas')
      .insert({
        owner_id: user.id,
        project_id: projectId,
        schema_name: schemaName,
        schema_body: schemaBody,
        schema_body_hash: bodyHash,
        extraction_target: extractionTarget,
      })
      .select()
      .single();
    if (err) throw new Error(err.message);
    return data as ExtractionSchemaRow;
  }, [projectId]);

  const updateSchema = useCallback(async (
    schemaId: string,
    updates: Partial<Pick<ExtractionSchemaRow, 'schema_name' | 'schema_body' | 'extraction_target'>>,
  ) => {
    const patchPayload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    // Recompute body hash if schema_body changed
    if (updates.schema_body) {
      patchPayload.schema_body_hash = await computeSchemaUid(updates.schema_body);
    }
    const { error: err } = await supabase
      .from('extraction_schemas')
      .update(patchPayload)
      .eq('schema_id', schemaId);
    if (err) throw new Error(err.message);
  }, []);

  const deleteSchema = useCallback(async (schemaId: string) => {
    const { error: err } = await supabase
      .from('extraction_schemas')
      .delete()
      .eq('schema_id', schemaId);
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

  /** Submit extraction: creates job (202), then drives the worker loop. */
  const submitExtraction = useCallback(async (params: {
    source_uid: string;
    schema_id: string;
    provider?: string;
    model?: string;
    temperature?: number;
    system_prompt?: string;
    page_range?: { start: number; end: number };
  }) => {
    // 1. Trigger: create job, get job_id
    const { data: triggerData, error: triggerErr } = await supabase.functions.invoke('run-extract', {
      body: params,
    });
    if (triggerErr) throw new Error(triggerErr.message);
    const { job_id } = triggerData as { job_id: string; status: string };

    // 2. Worker loop: call extract-worker until done
    let status = 'pending';
    while (status !== 'complete' && status !== 'failed') {
      const { data: workerData, error: workerErr } = await supabase.functions.invoke('extract-worker', {
        body: { job_id },
      });
      if (workerErr) throw new Error(workerErr.message);
      status = (workerData as { status: string }).status;
    }

    return { job_id, status };
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

Add to the workbench hook, using `resolvedProjectId` (not `focusedProjectId`):

```typescript
// Inside useExtractWorkbench():
const { resolvedProjectId } = useProjectFocus();
const docState = useProjectDocuments(resolvedProjectId);
const parsedDocs = useMemo(() =>
  (docState.docs ?? []).filter(d => d.status === 'parsed'),
  [docState.docs],
);

const [activeDocUid, setActiveDocUid] = useState<string | null>(null);
const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null);
const [fields, setFields] = useState<SchemaField[]>([]);
const [schemaName, setSchemaName] = useState('Untitled Schema');
const [extractionTarget, setExtractionTarget] = useState<'document' | 'page'>('document');
const [editorMode, setEditorMode] = useState<'visual' | 'code' | 'split'>('visual');

// Provider + model config (extraction-specific)
const [provider, setProvider] = useState('vertex_ai');
const [model, setModel] = useState('claude-sonnet-4-5-20250929');

// Advanced config state
const [systemPrompt, setSystemPrompt] = useState('');
const [temperature, setTemperature] = useState(0.3);
const [pageRangeStart, setPageRangeStart] = useState<number | null>(null);
const [pageRangeEnd, setPageRangeEnd] = useState<number | null>(null);

const { schemas, createSchema, updateSchema, deleteSchema } = useExtractionSchemas(resolvedProjectId);
const { jobs, submitExtraction, latestJob } = useExtractionJobs(activeDocUid);
const { results } = useExtractionResults(latestJob?.job_id ?? null);
```

**Step 3: Implement tab content renderers**

For each tab in `renderContent(tabId)`:

**`extract-files`**: Render `DocumentFileTable` with `parsedDocs`. Empty state: "No parsed documents. Parse documents first." When a doc is selected, set `activeDocUid`.

**`extract-schema`**: Render `SchemaSelector` at top + `SchemaFieldEditor` below. Include extraction target toggle (Document / Page) as a segmented control. Save button calls `createSchema(schemaName, buildObjectSchema(fields), extractionTarget)`.

**`extract-config`**: Basic section: provider selector dropdown (reads from `user_api_keys` + adds `vertex_ai` as option), model selector (changes available models based on selected provider). Advanced accordion (Ark UI `Collapsible`): system prompt textarea, page range inputs (only when target is `page`), temperature slider. "Run Extraction" button — disabled until both `activeDocUid` and `activeSchemaId` are set. On click:

```typescript
const handleRunExtraction = async () => {
  if (!activeDocUid || !activeSchemaId) return;
  await submitExtraction({
    source_uid: activeDocUid,
    schema_id: activeSchemaId,
    provider,
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
- If `latestJob?.status === 'failed'`, show error message from `latestJob.error`
Empty state when no job has been run.

**`extract-json`**: Monaco editor in read-only mode showing `JSON.stringify(results.map(r => r.extracted_data), null, 2)`.

**Step 4: Verify**

1. Open `/app/extract`. Confirm only parsed documents appear.
2. Create a schema, save it. Confirm it appears in the selector.
3. Select a doc + schema → Run Extraction → confirm spinner, then results.
4. Check the JSON tab shows raw extracted data.
5. Re-run → confirm a new job is created.
6. Page-level → confirm per-page accordion with page range validation.

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
1. Load markdown for `source_uid` (first 32000 chars / ~8000 tokens) using `loadArtifact(db, source_uid, "markdown_bytes")`
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
  ├── Task 3 (Page Text Helper + Tests) ──┐
  │                                        │
  ├── Task 4 (Edge Function) ─────────────┤
  │                                        │
  ├── Task 5 (Shared Components) ─────────┤
  │                                        │
  ├── Task 6 (Schema CRUD Hook) ──────────┤
  │                                        │
  ├── Task 7 (Job & Results Hooks) ───────┤
  │                                        │
  └────────────────────────────────────────┴── Task 8 (Workbench Overhaul)
                                                   │
                                                   └── Task 9 (AI Schema Suggest, optional)
```

Tasks 2-7 can proceed in parallel after Task 1. Task 4b depends on Task 4a and Task 3. Task 8 requires all of 2-7.

---

## Automated Test Requirements

Each task below must have passing tests before the task is considered complete.

### Task 3: Page text helper
- **File:** `supabase/functions/_shared/docling_page_text.test.ts`
- Tests: page grouping, table reconstruction from `table_cells`, furniture traversal, empty document, `getPageCount`
- Run: `cd supabase && deno test functions/_shared/docling_page_text.test.ts`

### Task 4a: Trigger function
- **File:** `supabase/functions/run-extract/index.test.ts`
- Test paths: valid request returns 202 + job_id, missing schema (404), unparsed document (400), missing fields (400)

### Task 4b: Worker function
- **File:** `supabase/functions/extract-worker/index.test.ts`
- Test paths: document-level success, page-level batch processing, resume after partial completion, missing artifact (500 + job failed), invalid page range (500 + job failed), `start > totalPages` (500 + job failed), LLM failure (500 with sanitized error), already-complete job returns immediately, provider resolution for API-key providers

### Task 6: Schema CRUD hook
- **File:** `web/src/hooks/useExtractionSchemas.test.ts`
- Test: create schema returns UUID `schema_id` (not body hash), two schemas with same body but different names are distinct records, update preserves `schema_id`, delete removes record

### Task 8: Workbench
- **File:** `web/src/pages/ExtractWorkbench.test.tsx`
- Test: parsed-only filter excludes unparsed docs, schema save/select round-trip, "Run Extraction" button disabled when no schema or doc selected, results rendering for document-level (single card) and page-level (accordion), failed job shows error message

---

## Verification Checklist

### Happy Path
- [ ] Apply migration — tables exist, RLS active, indexes created
- [ ] Create schema via UI — UUID PK generated, appears in selector
- [ ] Two schemas with same body but different names — both save successfully
- [ ] Select parsed document + schema → Run Extraction → results render
- [ ] Page-level extraction with range 1-5 on a 200-page doc → succeeds (not rejected)
- [ ] Page-level extraction → per-page accordion in results
- [ ] JSON tab shows raw extracted data
- [ ] Re-run same extraction → new job created (not deduped)

### Failure Modes
- [ ] Unparsed documents do not appear in Extract file list
- [ ] Run extraction without schema selected → button disabled
- [ ] Page range 1-60 → 400 error "exceeds maximum of 50"
- [ ] Page range start=5, end=3 → 400 error "end must be >= start"
- [ ] Page range start=100 on 10-page doc → 400 error "exceeds document page count"
- [ ] Valid range with no content → 400 error "No extractable content found"
- [ ] LLM error → job status `failed`, error displayed in UI, no key material in error

### Security
- [ ] No API key material in `extraction_jobs` rows
- [ ] RLS prevents cross-user access to schemas/jobs/results
- [ ] Error messages sanitized (no Bearer tokens, no key values)

### Automated Tests
- [ ] `docling_page_text.test.ts` — all tests pass
- [ ] Edge function test paths validated
- [ ] Schema CRUD: UUID identity, no cross-user collision

---

## Critical File Paths

| Purpose | Path |
|---------|------|
| Vertex Claude transport (reuse) | `supabase/functions/_shared/vertex_claude.ts` |
| Vertex auth (reuse) | `supabase/functions/_shared/vertex_auth.ts` |
| API key crypto (reuse) | `supabase/functions/_shared/api_key_crypto.ts` |
| Representation types (contract) | `supabase/functions/_shared/representation.ts` |
| Extraction shared helpers (new) | `supabase/functions/_shared/extract_helpers.ts` |
| Annotation worker (pattern) | `supabase/functions/worker/index.ts` |
| Schema helpers (reuse) | `web/src/lib/extractionSchemaHelpers.ts` |
| Docling native items (pattern for page text) | `web/src/lib/doclingNativeItems.ts` |
| Parse artifact loader (pattern) | `web/src/pages/parseArtifacts.ts` |
| Parse workbench (pattern) | `web/src/pages/useParseWorkbench.tsx` |
| Project focus hook (use resolvedProjectId) | `web/src/hooks/useProjectFocus.ts` |
| Workbench component (layout) | `web/src/components/workbench/Workbench.tsx` |
| Extract workbench (overhaul target) | `web/src/pages/useExtractWorkbench.tsx` |
| Schemas page (refactor target) | `web/src/pages/Schemas.tsx` |
| TypeScript types (extend) | `web/src/lib/types.ts` |
| Trigger-parse edge fn (auth pattern) | `supabase/functions/trigger-parse/index.ts` |
| Published docs site | `web-docs/src/content/docs/` |

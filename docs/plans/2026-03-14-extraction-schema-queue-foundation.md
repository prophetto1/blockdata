# Extraction Schema & Queue Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the database tables, TypeScript types, Docling page-text helper, and schema CRUD hook that form the backend foundation for async structured extraction.

**Architecture:** One migration creates four tables (`extraction_schemas`, `extraction_jobs`, `extraction_job_items`, `extraction_results`) plus a `claim_extraction_items(p_job_id, p_worker_id)` RPC that uses `FOR UPDATE SKIP LOCKED` for atomic work item acquisition. The RPC does not verify ownership — calling edge functions must check job ownership before invoking it. A Deno helper ports the page-text assembly logic from the existing frontend `doclingNativeItems.ts` to the edge function layer, including picture-child traversal. A React hook provides schema CRUD with Realtime subscription and FK-enforced delete safety.

**Tech Stack:** Supabase Postgres migrations, Deno Edge Functions (TypeScript), React hooks, Vitest.

**Upstream context:**
- Merged plan: `docs/priority/2026-03-14-extraction-and-parse-verification-merged.md` (Phase 3)
- Quick wins (shipped): `docs/plans/2026-03-14-parse-runtime-quick-wins.md`
- Latest migration: `20260314160000_089_add_cleanup_outbox.sql`
- Docling traversal reference: `web/src/lib/doclingNativeItems.ts`
- Vertex Claude transport: `supabase/functions/_shared/vertex_claude.ts` — returns raw Anthropic Messages API response shape

---

## Prerequisites

- **conversion-complete requested-config preservation must be deployed first.** The fix at `conversion-complete/index.ts:322-333` reads the existing row's `requested_pipeline_config` when the callback omits `pipeline_config`, preventing the audit trail from being overwritten with `{}`. This fix must be committed and pushed before starting extraction queue work, because extraction depends on trustworthy parse metadata.

## Scope Guardrails

- This plan covers Phase 3, Tasks 3.1–3.4 of the merged plan.
- Task 3.5 (Schema Builder Components) is deferred to Phase 5 alongside the workbench overhaul — it requires a design pass against the live UI.
- No edge functions (`run-extract`, `extract-worker`) in this plan. Those are Phase 4.
- No workbench UI changes in this plan. Those are Phase 5.

---

### Task 1: Extraction Tables Migration

**Files:**
- Create: `supabase/migrations/20260314170000_090_extraction_tables.sql`

**Step 1: Write the migration**

Create `supabase/migrations/20260314170000_090_extraction_tables.sql`:

```sql
-- Extraction schemas: user-defined JSON Schemas for structured extraction
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

-- Updated_at trigger (reuse pattern from other tables)
CREATE OR REPLACE FUNCTION public.set_extraction_schemas_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_extraction_schemas_updated_at
  BEFORE UPDATE ON public.extraction_schemas
  FOR EACH ROW EXECUTE FUNCTION public.set_extraction_schemas_updated_at();

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
CREATE POLICY extraction_jobs_select_own ON extraction_jobs
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY extraction_jobs_insert_own ON extraction_jobs
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE INDEX idx_extraction_jobs_source ON extraction_jobs(source_uid);
CREATE INDEX idx_extraction_jobs_schema ON extraction_jobs(schema_id);

-- Extraction job items: durable work items, one per document or page.
-- No RLS — items are only accessed through the claim RPC and edge functions
-- using the admin client. The claim RPC verifies ownership via extraction_jobs.
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
CREATE INDEX idx_extraction_job_items_pending
  ON extraction_job_items(job_id, status) WHERE status = 'pending';

-- Extraction results: structured data extracted from documents
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
CREATE POLICY extraction_results_select_own ON extraction_results
  FOR SELECT USING (
    job_id IN (SELECT job_id FROM extraction_jobs WHERE owner_id = auth.uid())
  );

CREATE INDEX idx_extraction_results_job ON extraction_results(job_id);

-- Claim RPC: atomic work item acquisition using FOR UPDATE SKIP LOCKED.
--
-- Auth model: this RPC is SERVICE-ROLE-ONLY. It does not verify ownership
-- because edge functions run with the admin client (where auth.uid() is not
-- set). The calling edge function MUST verify that the authenticated user
-- owns the job BEFORE calling this RPC. Direct execution by anon or
-- authenticated clients is explicitly revoked below.
CREATE OR REPLACE FUNCTION public.claim_extraction_items(
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
    WHERE i.job_id = p_job_id
      AND i.status = 'pending'
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

-- Lock down claim RPC: only service_role (admin client in edge functions)
-- can execute. Matches the hardening pattern used elsewhere in this repo
-- (e.g. 20260215005000_033_fix_workspace_membership_rls_recursion.sql).
REVOKE ALL ON FUNCTION public.claim_extraction_items(uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_extraction_items(uuid, text, integer)
  TO service_role;

-- Guarded Realtime publication.
-- extraction_job_items is intentionally EXCLUDED: it has no RLS (items are
-- only accessed via admin-client edge functions and the claim RPC), and
-- publishing a no-RLS table to Realtime would expose all rows to any
-- authenticated subscriber. The frontend watches extraction_jobs (status,
-- counters) and extraction_results (incremental data) instead.
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

Run: `npx supabase db reset`
Expected: PASS — all tables, indexes, RLS policies, RPC, REVOKE/GRANT, triggers, and Realtime publications created without errors.

**If Docker is unavailable locally**, this step is BLOCKED. Do not skip it or substitute a file-existence check. The migration contains RPC definitions, REVOKE/GRANT, trigger creation, and publication changes that cannot be validated without a real Postgres apply. Options:
- Start Docker Desktop and retry
- Apply against a remote dev Supabase instance: `npx supabase db push --db-url <remote>`
- Apply via CI migration pipeline
Mark the task incomplete until one of these paths succeeds.

**Step 3: Commit**

```bash
git add supabase/migrations/20260314170000_090_extraction_tables.sql
git commit -m "feat: add extraction_schemas, extraction_jobs, extraction_job_items, extraction_results tables"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `web/src/lib/types.ts`

**Step 1: Add extraction row types**

Add these types to `web/src/lib/types.ts` after the existing `DocumentRow` type:

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

**Step 2: Verify the web app builds**

Run: `cd web && npx tsc --noEmit`
Expected: no type errors.

**Step 3: Commit**

```bash
git add web/src/lib/types.ts
git commit -m "feat: add extraction schema, job, item, and result TypeScript types"
```

---

### Task 3: Docling Page-Text Assembly Helper

**Files:**
- Create: `supabase/functions/_shared/docling_page_text.ts`
- Create: `supabase/functions/_shared/docling_page_text.test.ts`

**Context:** This helper ports the traversal logic from `web/src/lib/doclingNativeItems.ts` to the Deno edge function layer. It uses the same approach: resolve items by `self_ref`, traverse `body` and `furniture`, reconstruct tables from `table_cells` via grid. The difference is that this helper groups output by page number instead of emitting flat items.

**Step 1: Write the tests**

Create `supabase/functions/_shared/docling_page_text.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";
import {
  assemblePageText,
  getPageCount,
  buildExtractionItems,
} from "./docling_page_text.ts";

const fixture = {
  texts: [
    { self_ref: "#/texts/0", label: "title", text: "Introduction", prov: [{ page_no: 1 }] },
    { self_ref: "#/texts/1", label: "paragraph", text: "Page one content.", prov: [{ page_no: 1 }] },
    { self_ref: "#/texts/2", label: "paragraph", text: "Page two content.", prov: [{ page_no: 2 }] },
    { self_ref: "#/texts/3", label: "header", text: "Header text", prov: [{ page_no: 1 }] },
    { self_ref: "#/texts/4", label: "caption", text: "Figure 1: Chart caption", prov: [{ page_no: 2 }] },
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
  pictures: [
    {
      self_ref: "#/pictures/0",
      label: "picture",
      prov: [{ page_no: 2 }],
      children: [{ $ref: "#/texts/4" }],
    },
  ],
  groups: [
    { self_ref: "#/groups/0", children: [{ $ref: "#/texts/0" }, { $ref: "#/texts/1" }] },
  ],
  body: {
    children: [
      { $ref: "#/groups/0" },
      { $ref: "#/texts/2" },
      { $ref: "#/tables/0" },
      { $ref: "#/pictures/0" },
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
  assertEquals(page1.includes("Introduction"), true);
  assertEquals(page1.includes("Page one content"), true);
  assertEquals(page1.includes("Invoice: 12345"), true);
  assertEquals(page1.includes("Header text"), true);

  const page2 = result.get(2)!;
  assertEquals(page2.includes("Page two content"), true);
  assertEquals(page2.includes("Name | Age"), true);
  assertEquals(page2.includes("Alice | 30"), true);
  assertEquals(page2.includes("Field: Value"), true);
});

Deno.test("assemblePageText reconstructs tables from table_cells as grid", () => {
  const result = assemblePageText(fixture);
  const page2 = result.get(2)!;
  assertEquals(page2.includes("Name | Age\nAlice | 30"), true);
});

Deno.test("assemblePageText traverses furniture", () => {
  const result = assemblePageText(fixture);
  const page1 = result.get(1)!;
  assertEquals(page1.includes("Header text"), true);
});

Deno.test("assemblePageText walks picture children (captions)", () => {
  const result = assemblePageText(fixture);
  const page2 = result.get(2)!;
  assertEquals(page2.includes("Figure 1: Chart caption"), true);
});

Deno.test("getPageCount returns max page number from provenance", () => {
  assertEquals(getPageCount(fixture), 2);
});

Deno.test("getPageCount returns 0 for empty document", () => {
  assertEquals(getPageCount({}), 0);
});

Deno.test("getPageCount includes picture provenance", () => {
  const doc = {
    pictures: [{ self_ref: "#/pictures/0", prov: [{ page_no: 5 }] }],
  };
  assertEquals(getPageCount(doc), 5);
});

Deno.test("buildExtractionItems: document mode creates one item", () => {
  const items = buildExtractionItems({ totalPages: 4, extractionTarget: "document" });
  assertEquals(items, [{ target_kind: "document", page_number: null }]);
});

Deno.test("buildExtractionItems: page mode creates one item per page in range", () => {
  const items = buildExtractionItems({
    totalPages: 4,
    extractionTarget: "page",
    pageRange: { start: 2, end: 3 },
  });
  assertEquals(items, [
    { target_kind: "page", page_number: 2 },
    { target_kind: "page", page_number: 3 },
  ]);
});

Deno.test("buildExtractionItems: page mode defaults to full document range", () => {
  const items = buildExtractionItems({ totalPages: 3, extractionTarget: "page" });
  assertEquals(items.length, 3);
  assertEquals(items[0], { target_kind: "page", page_number: 1 });
  assertEquals(items[2], { target_kind: "page", page_number: 3 });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd supabase && deno test functions/_shared/docling_page_text.test.ts`
Expected: FAIL — `docling_page_text.ts` does not exist.

**Step 3: Implement the helper**

Create `supabase/functions/_shared/docling_page_text.ts`:

```typescript
/**
 * Assemble reading-order text per page from a DoclingDocument JSON.
 *
 * Mirrors the traversal in web/src/lib/doclingNativeItems.ts:
 *  - resolves items by self_ref (not $ref index math)
 *  - traverses body AND furniture
 *  - reconstructs tables from table_cells via grid
 *  - walks picture items and recurses into their children (captions, descriptions)
 *  - includes key_value and form item text
 */

// ---------------------------------------------------------------------------
// Types (matching web/src/lib/doclingNativeItems.ts)
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
  const picturesMap = new Map(
    (doc.pictures ?? []).map((item) => [item.self_ref, item]),
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

    // Picture items: no text content of their own, but children may contain
    // captions or descriptions that must not be silently dropped.
    // Mirrors doclingNativeItems.ts:133-146.
    const pictureItem = picturesMap.get(pointer);
    if (pictureItem) {
      for (const child of pictureItem.children ?? []) walk(child);
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
    "pictures",
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

/**
 * Build extraction work item descriptors for a job.
 * Document mode: one item with page_number null.
 * Page mode: one item per page in the requested range.
 */
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

**Step 4: Run tests to verify they pass**

Run: `cd supabase && deno test functions/_shared/docling_page_text.test.ts`
Expected: PASS — all 10 tests.

**Step 5: Commit**

```bash
git add supabase/functions/_shared/docling_page_text.ts supabase/functions/_shared/docling_page_text.test.ts
git commit -m "feat: add Docling page-text assembly helper with tests"
```

---

### Task 4: Schema CRUD Hook

**Files:**
- Create: `web/src/hooks/useExtractionSchemas.ts`

**Context:** This hook provides CRUD for `extraction_schemas` scoped to `resolvedProjectId`. It subscribes to Realtime for live updates.

**Delete strategy:** The hook attempts the delete directly and catches the Postgres FK violation from `extraction_jobs.schema_id`, translating it into a friendly error. This is correct because the database FK is the real safety net — a count-then-delete pattern is race-prone (a job could be created between the count and the delete). Letting the FK constraint do the enforcement and catching the error is both simpler and airtight.

**Important:** The existing pattern for hooks in this codebase uses `supabase` from `@/lib/supabase`. Follow the same import pattern as `web/src/hooks/useBatchParse.ts`.

**Step 1: Read the existing hook pattern**

Read `web/src/hooks/useBatchParse.ts` to confirm the import style for `supabase`.

**Step 2: Implement the hook**

Create `web/src/hooks/useExtractionSchemas.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error: err } = await supabase
      .from('extraction_schemas')
      .insert({
        owner_id: user.id,
        project_id: projectId,
        schema_name: schemaName,
        schema_body: schemaBody,
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
    const { error: err } = await supabase
      .from('extraction_schemas')
      .update(updates)
      .eq('schema_id', schemaId);
    if (err) throw new Error(err.message);
  }, []);

  const deleteSchema = useCallback(async (schemaId: string) => {
    // Attempt delete directly — the FK on extraction_jobs.schema_id is the
    // real safety net. If jobs reference this schema, Postgres returns a
    // foreign_key_violation which we translate to a friendly message.
    const { error: err } = await supabase
      .from('extraction_schemas')
      .delete()
      .eq('schema_id', schemaId);
    if (err) {
      if (err.code === '23503') {
        throw new Error('Cannot delete schema: extraction jobs reference it');
      }
      throw new Error(err.message);
    }
  }, []);

  return { schemas, loading, error, createSchema, updateSchema, deleteSchema, refetch: fetchSchemas };
}
```

**Step 3: Verify the web app builds**

Run: `cd web && npx tsc --noEmit`
Expected: no type errors.

**Step 4: Commit**

```bash
git add web/src/hooks/useExtractionSchemas.ts
git commit -m "feat: add useExtractionSchemas hook with CRUD, Realtime, and FK-safe delete"
```

---

## Final Verification

Run all tests:

1. `cd supabase && deno test functions/_shared/docling_page_text.test.ts` — PASS (10 tests)
2. `cd supabase && deno test functions/_shared/parse_pipeline_contract.test.ts` — PASS (7 tests, from quick wins)
3. `cd supabase && deno test functions/extract-readiness/index.test.ts` — PASS (2 tests, from quick wins)
4. `cd supabase && deno test functions/parse-profile-readiness/index.test.ts` — PASS (4 tests, from quick wins)
5. `cd web && npx tsc --noEmit` — PASS

---

## What This Unblocks

After this plan ships, Phase 4 (extraction edge functions) can begin immediately:
- `run-extract` uses `buildExtractionItems` from Task 3 and inserts into the tables from Task 1
- `extract-worker` uses `assemblePageText` from Task 3 and claims items via the `claim_extraction_items` RPC from Task 1
- Both use the types from Task 2
- The workbench (Phase 5) uses `useExtractionSchemas` from Task 4

---

## Design Decisions Recorded

| Decision | Rationale |
|----------|-----------|
| `extraction_job_items` has no RLS and is NOT published to Realtime | Items are only accessed via the `claim_extraction_items` RPC and admin-client edge functions. Publishing a no-RLS table to Realtime would expose all rows to any authenticated subscriber. The frontend watches `extraction_jobs` (status/counters) and `extraction_results` (incremental data) instead. |
| `claim_extraction_items` is service-role-only | The RPC takes `(p_job_id, p_worker_id)` only and does not verify ownership. Execute is explicitly `REVOKE`d from `PUBLIC`, `anon`, and `authenticated`, and `GRANT`ed only to `service_role`. Edge functions (which use the admin client / service role) must verify job ownership before calling. This matches the repo's existing hardening pattern (e.g. `_033_fix_workspace_membership_rls_recursion.sql`). |
| Schema delete relies on FK constraint, not count-then-delete | The hook attempts the delete directly and catches Postgres error code `23503` (foreign_key_violation). This is airtight against races, unlike a count-then-delete pattern where a job could be created between the two queries. |
| `updated_at` trigger on `extraction_schemas` only | Jobs, items, and results are written by edge functions using the admin client; they don't need application-level timestamp management. Schemas are modified by users through the CRUD hook. |
| `schema_body_hash` is optional | Populated by the frontend for dedup detection, not used as PK. The hash column is indexed for lookup but not required on insert. |
| Migration is `_090_` | `_089_` is taken by `cleanup_outbox` from concurrent Arango work. |

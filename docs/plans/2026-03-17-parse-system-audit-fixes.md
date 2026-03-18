# Parse System Audit Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 8 remaining bugs from the parse system audit (issues #8–#15) in one coherent pass.

**Architecture:** Three layers need fixes: edge functions (Deno/TypeScript in `supabase/functions/`), platform-api (Python in `services/platform-api/`), and frontend (React/TypeScript in `web/src/`). One new Supabase migration covers DB-level changes. Fixes are ordered so earlier tasks don't depend on later ones.

**Tech Stack:** Deno + Supabase edge functions, Python FastAPI, React + TypeScript, PostgreSQL migrations.

---

## Context

A 4-layer audit found 15 issues. Items 1–7 are fixed and deployed. This plan covers items 8–15:

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 8 | HIGH | google-drive-import imports nonexistent `process-md.ts` | `google-drive-import/index.ts:11` |
| 9 | HIGH | trigger-parse pre-insert `conv_uid: "pending:..."` violates CHECK `^[0-9a-f]{64}$` | `trigger-parse/index.ts:210` |
| 10 | HIGH | trigger-parse pre-insert `conv_status: "pending"` not in FK catalog | `trigger-parse/index.ts:211` |
| 11 | LOW | trigger-parse routes by `source_type` not extension — works today but fragile | `trigger-parse/index.ts:80` |
| 12 | HIGH | `ParseTabPanel.tsx` hardcodes `.docling.json` path for all parsers | `ParseTabPanel.tsx:156,174` |
| 12b | HIGH | `upsert_conversion_parsing` never sets `conv_locator` for tree-sitter — upstream of #12 | `repository.py:67-85` |
| 13 | LOW | `conv_total_characters` not on `source_documents` — but already on `conversion_parsing` + `view_documents` | `conversion-complete/index.ts:497` |
| 14 | MEDIUM | `parsing_profiles` has no `owner_id` — any user can edit any profile | DB schema |
| 15 | MEDIUM | `DocumentRow` type missing 8 columns from `view_documents` | `web/src/lib/types.ts:18` |

Bonus: `IngestTrack = "docling"` in `admin_policy.ts` is a known design gap but NOT addressed here. Tree-sitter correctly bypasses the edge function layer via platform-api `/parse`. Widening `IngestTrack` is a separate refactor.

---

## Task 1: Fix google-drive-import broken import (#8)

**Root cause:** Migration 081 routed markdown through docling, making the `process-md.ts` inline markdown pipeline obsolete. The file was deleted but the import in `google-drive-import` was not updated. The function will crash at deploy time on any code path.

**Files:**
- Modify: `supabase/functions/google-drive-import/index.ts`

**Step 1: Read the file to confirm current state**

The import at line 11:
```typescript
import { processMarkdown } from "../ingest/process-md.ts";
```

And usage at lines 234-235:
```typescript
} else if (source_type === "md") {
  await processMarkdown(ctx);
```

Since all formats now route through docling, markdown should use `processConversion` like everything else.

**Step 2: Remove the dead import**

Delete line 11:
```typescript
import { processMarkdown } from "../ingest/process-md.ts";
```

**Step 3: Remove the markdown special-case branch**

Replace lines 234-235:
```typescript
} else if (source_type === "md") {
  await processMarkdown(ctx);
} else {
```

With:
```typescript
} else {
```

This makes markdown flow through `processConversion` (the docling path), which is correct post-migration-081.

**Step 4: Verify no other references to process-md.ts exist**

Run: `grep -r "process-md" supabase/functions/`

Expected: No results (google-drive-import was the only consumer).

**Step 5: Commit**

```bash
git add supabase/functions/google-drive-import/index.ts
git commit -m "fix(google-drive-import): remove dead process-md import and md special-case

process-md.ts was deleted when migration 081 routed all formats through
docling. Markdown now flows through processConversion like other types."
```

---

## Task 2: Fix trigger-parse pre-insert constraint violations (#9, #10)

**Root cause:** The pre-insert at lines 205-224 writes a placeholder `conversion_parsing` row so the UI can show `pipeline_config` immediately (before async conversion completes). But it uses:
- `conv_uid: "pending:${source_uid}"` — violates CHECK `^[0-9a-f]{64}$`
- `conv_status: "pending"` — not in the allowed enum `('success', 'partial_success', 'failure')`

This means the pre-insert **always fails** when `pipeline_config` is non-empty, throwing a 500 error on every profile-based parse.

**Files:**
- Modify: `supabase/functions/trigger-parse/index.ts`

**Design decision:** The pre-insert's purpose is to persist the user's profile choice before the async conversion runs. `conversion-complete` preserves `requested_pipeline_config` if present (lines 353-360). We fix by:
1. Generating a valid SHA-256 hex for `conv_uid` (deterministic from source_uid so it's idempotent)
2. Omitting `conv_status` (the column allows NULL per migration 003 CHECK: `conv_status IS NULL OR conv_status IN (...)`)

**Step 1: Add SHA-256 helper for placeholder conv_uid**

At line 210, replace the pre-insert block (lines 205-224):

```typescript
    if (Object.keys(pipeline_config).length > 0) {
      // Generate a valid placeholder conv_uid (SHA-256 hex) so the row satisfies
      // the CHECK constraint. conversion-complete will upsert over this with the
      // real conv_uid from the conversion service.
      const placeholderBytes = new TextEncoder().encode(`placeholder:${source_uid}`);
      const hashBuffer = await crypto.subtle.digest("SHA-256", placeholderBytes);
      const placeholder_conv_uid = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const { error: preInsertErr } = await supabaseAdmin
        .from("conversion_parsing")
        .insert({
          source_uid,
          conv_uid: placeholder_conv_uid,
          conv_parsing_tool: "docling",
          conv_representation_type: "doclingdocument_json",
          conv_total_blocks: 0,
          conv_block_type_freq: {},
          conv_total_characters: 0,
          conv_locator: "",
          pipeline_config,
          requested_pipeline_config: pipeline_config,
        });
      if (preInsertErr) {
        // Non-fatal for constraint violations — conversion-complete will create the row.
        // Log at error level so monitoring catches real DB failures.
        console.error("trigger-parse: pre-insert conversion_parsing failed:", preInsertErr.message);
      }
    }
```

Key changes:
- `conv_uid` is now a valid 64-char hex string
- `conv_status` removed (defaults to NULL, which satisfies the CHECK)
- Failure is non-fatal (logged at ERROR so monitoring catches real DB issues) — the conversion will complete regardless

**⚠ CONFIRMED at runtime:** `conversion_parsing.conv_uid` is NOT NULL. Live error:
```
null value in column "conv_uid" of relation "conversion_parsing" violates not-null constraint (code 23502)
```
This also affected `upsert_conversion_parsing` in the platform-api (Task 4A) — fixed by generating a deterministic SHA-256 from `"{conv_parsing_tool}\n{source_uid}"` when no explicit conv_uid is provided.

**Step 2: Verify locally**

The fix is in an edge function (Deno). No local test runner. Verify by reading the CHECK constraints:
- `conv_uid ~ '^[0-9a-f]{64}$'` — SHA-256 hex is exactly 64 hex chars ✓
- `conv_status IS NULL OR conv_status IN (...)` — omitted = NULL ✓
- If conv_status is NOT NULL in conversion_parsing (unlike documents_v2), the insert will still fail — but now non-fatally, so the parse proceeds and conversion-complete creates the row properly

**Step 3: Commit**

```bash
git add supabase/functions/trigger-parse/index.ts
git commit -m "fix(trigger-parse): use valid SHA-256 placeholder for pre-insert conv_uid

The pre-insert used 'pending:...' which violated the ^[0-9a-f]{64}$ CHECK
constraint, and 'pending' conv_status which isn't in the enum. Now generates
a deterministic SHA-256 and omits conv_status (NULL is allowed). Made
non-fatal so parse proceeds even if pre-insert fails."
```

---

## Task 3: Harden trigger-parse source_type routing (#11)

**Severity correction:** The audit claimed `.tex files can't re-parse` (HIGH). This is **wrong**. Migration 081 seeded the routing table with both extension keys (`tex`) and source_type keys (`latex`), so `.tex` → source_type `"latex"` → routing finds `"latex": "docling"` → works fine. Verified against migration 081 lines 70-77.

**Why fix anyway:** The code does `extension_track_routing[source_type]` while `ingest/routing.ts` correctly tries both extension AND source_type. This is a robustness alignment — if a new source_type is added without a matching routing key, trigger-parse will silently break while ingest works.

**Files:**
- Modify: `supabase/functions/trigger-parse/index.ts`

**Step 1: Extract extension from source_locator for routing lookup**

At line 60, after `const source_type = doc.source_type as string;`, add extension extraction and widen the lookup:

Replace lines 80-83:
```typescript
    const track = runtimePolicy.upload.extension_track_routing[source_type];
    if (!track) {
      return json(400, { error: `No track routing for source_type: ${source_type}` });
    }
```

With:
```typescript
    // Try source_type first, then fall back to file extension from locator.
    // The routing table keys are extensions (e.g., "tex") while source_type
    // may differ (e.g., "latex"). Match by both to stay resilient.
    const sourceLocator = doc.source_locator as string | null;
    const fileExtension = sourceLocator
      ? sourceLocator.split("/").pop()?.split(".").pop()?.toLowerCase() ?? null
      : null;
    const track = runtimePolicy.upload.extension_track_routing[source_type]
      ?? (fileExtension ? runtimePolicy.upload.extension_track_routing[fileExtension] : undefined);
    if (!track) {
      return json(400, { error: `No track routing for source_type: ${source_type}` });
    }
```

**Step 2: Commit**

```bash
git add supabase/functions/trigger-parse/index.ts
git commit -m "fix(trigger-parse): fall back to file extension for track routing

The routing lookup used source_type alone, which works today because the
DB routing table contains both extensions and source_types. But source_type
can differ from extension (e.g., 'latex' vs 'tex'). Now tries source_type
first, then file extension from source_locator."
```

---

## Task 4: Fix ParseTabPanel hardcoded .docling.json (#12, #12b)

**Root cause (two layers):**

1. **Frontend:** `handleViewJson` (line 156) and `handleDownloadJson` (line 174) hardcode `.docling.json` suffix. Tree-sitter artifacts use `${source_uid}.ast.json`. Silently 404s.
2. **Platform-api:** `upsert_conversion_parsing` in `repository.py:67-85` never sets `conv_uid` (NOT NULL!), `conv_locator`, or other columns for tree-sitter. The missing `conv_uid` causes a hard crash (`23502: null value in column "conv_uid" violates not-null constraint`) — the parse artifacts upload but the DB row never gets written, leaving the document stuck in `conversion_failed`.

**The fix must be two layers:**
- Upstream: populate `conv_locator` in `upsert_conversion_parsing`
- Downstream: use `conv_locator` in the frontend

**Files:**
- Modify: `services/platform-api/app/domain/conversion/repository.py`
- Modify: `services/platform-api/app/api/routes/parse.py`
- Modify: `web/src/components/documents/ParseTabPanel.tsx`

### Part A: Fix upsert_conversion_parsing (platform-api)

**Step 1: Add missing columns to upsert_conversion_parsing**

In `repository.py`, replace the function at lines 67-85:

```python
def upsert_conversion_parsing(
    source_uid: str,
    conv_parsing_tool: str,
    conv_status: str = "success",
    pipeline_config: Optional[dict[str, Any]] = None,
    parser_runtime_meta: Optional[dict[str, Any]] = None,
) -> None:
    """Upsert a conversion_parsing row for the source document."""
    sb = get_supabase_admin()
    sb.table("conversion_parsing").upsert(
        {
            "source_uid": source_uid,
            "conv_parsing_tool": conv_parsing_tool,
            "conv_status": conv_status,
            "pipeline_config": pipeline_config or {},
            "parser_runtime_meta": parser_runtime_meta or {},
        },
        on_conflict="source_uid",
    ).execute()
```

With:

```python
def upsert_conversion_parsing(
    source_uid: str,
    conv_parsing_tool: str,
    conv_status: str = "success",
    pipeline_config: Optional[dict[str, Any]] = None,
    parser_runtime_meta: Optional[dict[str, Any]] = None,
    *,
    conv_uid: Optional[str] = None,
    conv_locator: Optional[str] = None,
    conv_total_blocks: Optional[int] = None,
    conv_total_characters: Optional[int] = None,
) -> None:
    """Upsert a conversion_parsing row for the source document."""
    sb = get_supabase_admin()
    # conv_uid is NOT NULL — generate a deterministic hash if not provided.
    effective_conv_uid = conv_uid or _sha256_hex(
        f"{conv_parsing_tool}\n{source_uid}".encode()
    )
    row: dict[str, Any] = {
        "source_uid": source_uid,
        "conv_uid": effective_conv_uid,
        "conv_parsing_tool": conv_parsing_tool,
        "conv_status": conv_status,
        "pipeline_config": pipeline_config or {},
        "parser_runtime_meta": parser_runtime_meta or {},
    }
    if conv_locator is not None:
        row["conv_locator"] = conv_locator
    if conv_total_blocks is not None:
        row["conv_total_blocks"] = conv_total_blocks
    if conv_total_characters is not None:
        row["conv_total_characters"] = conv_total_characters
    sb.table("conversion_parsing").upsert(
        row,
        on_conflict="source_uid",
    ).execute()
```

New params are keyword-only to avoid breaking existing callers.

**Step 2: Pass conv_locator from parse.py**

In `parse.py`, the call at lines 131-140:

```python
        upsert_conversion_parsing(
            source_uid=body.source_uid,
            conv_parsing_tool="tree_sitter",
            pipeline_config=body.pipeline_config or profile_config,
            parser_runtime_meta={
                "language": result.language,
                "node_count": result.node_count,
                "source_type": result.source_type,
            },
        )
```

Replace with:

```python
        # Use the first artifact locator as conv_locator for the view_documents join.
        primary_locator = ast_locator if "ast_json" in profile_artifacts else (
            symbols_locator if "symbols_json" in profile_artifacts else None
        )

        upsert_conversion_parsing(
            source_uid=body.source_uid,
            conv_parsing_tool="tree_sitter",
            pipeline_config=body.pipeline_config or profile_config,
            parser_runtime_meta={
                "language": result.language,
                "node_count": result.node_count,
                "source_type": result.source_type,
            },
            conv_locator=primary_locator,
            conv_total_characters=len(result.ast_json) if result.ast_json else 0,
        )
```

Note: `ast_locator` and `symbols_locator` are only defined inside their respective `if` blocks. We need to hoist them:

Before the `if "ast_json"` block (around line 98), add:

```python
        ast_locator = f"converted/{body.source_uid}/{body.source_uid}.ast.json" if "ast_json" in profile_artifacts else None
        symbols_locator = f"converted/{body.source_uid}/{body.source_uid}.symbols.json" if "symbols_json" in profile_artifacts else None
```

And update the existing `if` blocks to use the pre-computed variables instead of re-declaring them.

**Step 3: Commit platform-api**

```bash
git add services/platform-api/app/domain/conversion/repository.py services/platform-api/app/api/routes/parse.py
git commit -m "fix(platform-api): populate conv_locator in tree-sitter conversion_parsing rows

upsert_conversion_parsing was writing only 5 of 12 columns, leaving
conv_locator NULL for tree-sitter. The view_documents join now returns
the actual artifact path for the frontend to use."
```

### Part B: Fix ParseTabPanel (frontend)

**Step 4: Rewrite handleViewJson to use conv_locator**

Replace lines 153-169:
```typescript
  const handleViewJson = async (doc: ProjectDocumentRow) => {
    // Use conv_locator (from view_documents) which holds the actual artifact path,
    // regardless of parser. Falls back to legacy .docling.json for older rows.
    const locator = doc.conv_locator;
    const baseName = getBaseName(doc.source_locator);
    const key = locator
      || (baseName ? `converted/${doc.source_uid}/${baseName}.docling.json` : null);
    if (!key) return;
    const { data, error: urlError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(key, 60 * 20);
    if (urlError || !data?.signedUrl) return;
    try {
      const resp = await fetch(data.signedUrl);
      const text = await resp.text();
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      setJsonModal({ title: doc.doc_title, content: formatted });
    } catch {
      setJsonModal({ title: doc.doc_title, content: 'Failed to load JSON.' });
    }
  };
```

**Step 5: Rewrite handleDownloadJson to use conv_locator**

Replace lines 171-179:
```typescript
  const handleDownloadJson = async (doc: ProjectDocumentRow) => {
    const locator = doc.conv_locator;
    const baseName = getBaseName(doc.source_locator);
    const key = locator
      || (baseName ? `converted/${doc.source_uid}/${baseName}.docling.json` : null);
    if (!key) return;
    const { data } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(key, 60 * 20);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };
```

**Step 6: Update modal title to be parser-aware**

Replace line 207:
```typescript
                {jsonModal.title} — DoclingDocument
```
With:
```typescript
                {jsonModal.title} — Parse Output
```

**Note:** `doc.conv_locator` requires Task 7 (DocumentRow type fix) to be done first. If executing before Task 7, use `(doc as any).conv_locator` temporarily.

**Step 7: Commit frontend**

```bash
git add web/src/components/documents/ParseTabPanel.tsx
git commit -m "fix(ParseTabPanel): use conv_locator instead of hardcoded .docling.json

handleViewJson and handleDownloadJson hardcoded .docling.json suffix which
silently 404s for tree-sitter documents. Now uses conv_locator from the
view_documents join, with fallback to .docling.json for older rows."
```

---

## Task 5: ~~Fix conversion-complete missing source_total_characters write~~ — DROPPED

**Original audit claim:** `conversion-complete` never writes `source_total_characters` to `source_documents`.

**Why dropped:** `source_total_characters` and `conv_total_characters` are **different metrics**:
- `source_total_characters` = characters in the **original source file** (set at upload, NULL for binary formats like PDF)
- `conv_total_characters` = characters in **extracted text blocks** (computed after parsing)

Overwriting `source_total_characters` with `conv_total_characters` destroys information. A PDF has `source_total_characters = NULL` (it's binary) but `conv_total_characters = 50000` (extracted text). These should not be conflated.

`conv_total_characters` already lives in `conversion_parsing` and is exposed through `view_documents`. The data is accessible everywhere it's needed. No fix required.

---

## Task 6: Migration — parsing_profiles owner_id + RLS (#14)

**Root cause:** `parsing_profiles` (created in migration 075) has 3 columns: `id`, `parser`, `config`. No `owner_id`, no RLS. Any authenticated user can read/edit any profile.

**Design:** Add `owner_id` (nullable — system-seeded profiles have no owner). Add RLS: anyone can SELECT, only owner can UPDATE/DELETE, only authenticated can INSERT.

**Files:**
- Create: `supabase/migrations/20260317210000_099_parsing_profiles_rls.sql`

**Step 1: Write the migration**

```sql
-- Migration 099: Add owner_id + RLS to parsing_profiles.
--
-- System-seeded profiles (from migrations 075, 076, 098) have owner_id = NULL
-- and are read-only. User-created profiles have owner_id set.

ALTER TABLE public.parsing_profiles
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- RLS
ALTER TABLE public.parsing_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all profiles (system + user-created).
CREATE POLICY parsing_profiles_select ON public.parsing_profiles
  FOR SELECT USING (true);

-- Users can insert their own profiles.
CREATE POLICY parsing_profiles_insert ON public.parsing_profiles
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update/delete only their own profiles. System profiles (NULL owner) are immutable.
CREATE POLICY parsing_profiles_update ON public.parsing_profiles
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY parsing_profiles_delete ON public.parsing_profiles
  FOR DELETE USING (auth.uid() = owner_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260317210000_099_parsing_profiles_rls.sql
git commit -m "feat(db): add owner_id + RLS to parsing_profiles

System-seeded profiles keep NULL owner_id and are read-only via RLS.
Users can create, update, and delete their own profiles."
```

---

## Task 7: Fix DocumentRow type gap (#15)

**Root cause:** `DocumentRow` in `web/src/lib/types.ts` was hand-written against `source_documents` columns. When `view_documents` was created (migration 082) and extended (084, 088), only cherry-picked columns were added. 8 view columns are missing from the type, though they're present at runtime via `SELECT *`.

**Files:**
- Modify: `web/src/lib/types.ts`
- Modify: `web/src/lib/projectDetailHelpers.ts`

**Step 1: Add missing columns to DocumentRow**

The current `view_documents` (from migration 088) has these columns not in `DocumentRow`:

| Column | Type | Source |
|--------|------|--------|
| `source_locator` | `string \| null` | `source_documents` |
| `updated_at` | `string` | `source_documents` |
| `conversion_job_id` | `string \| null` | `source_documents` |
| `conv_status` | `string \| null` | `conversion_parsing` |
| `conv_representation_type` | `string \| null` | `conversion_parsing` |
| `conv_block_type_freq` | `Record<string, number> \| null` | `conversion_parsing` |
| `conv_total_characters` | `number \| null` | `conversion_parsing` |
| `conv_locator` | `string \| null` | `conversion_parsing` |

Add after `conv_parsing_tool` (line 35):

```typescript
  conv_status?: string | null;
  conv_representation_type?: string | null;
  conv_block_type_freq?: Record<string, number> | null;
  conv_total_characters?: number | null;
  conv_locator?: string | null;
  source_locator?: string | null;
  updated_at?: string | null;
  conversion_job_id?: string | null;
```

All optional (`?`) since the type is also used for non-view queries.

**Step 2: Simplify ProjectDocumentRow**

In `web/src/lib/projectDetailHelpers.ts` lines 8-11, `ProjectDocumentRow` manually adds `source_locator` and `conv_locator`:

```typescript
export type ProjectDocumentRow = DocumentRow & {
  source_locator?: string | null;
  conv_locator?: string | null;
};
```

Since both are now on `DocumentRow`, simplify to:

```typescript
export type ProjectDocumentRow = DocumentRow;
```

Keep the type alias so existing imports don't break.

**Step 3: Remove `(doc as any).conv_locator` casts from Task 4**

If Task 4 was implemented before this task, go back to `ParseTabPanel.tsx` and replace `(doc as any).conv_locator` with `doc.conv_locator`.

**Step 4: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/projectDetailHelpers.ts
git commit -m "fix(types): add 8 missing view_documents columns to DocumentRow

DocumentRow was missing conv_status, conv_representation_type,
conv_block_type_freq, conv_total_characters, conv_locator,
source_locator, updated_at, and conversion_job_id. These columns
are returned by view_documents at runtime but invisible to TypeScript."
```

---

## Execution Order

Dependencies:
- Task 7 (types) must precede Task 4B (frontend) so `doc.conv_locator` compiles without cast.
- Task 4A (platform-api) must be deployed before Task 4B is useful — otherwise `conv_locator` is NULL at runtime.
- Tasks 1-3 are all in `supabase/functions/` — can be done in any order.
- Task 5 is dropped.
- Task 6 is a standalone migration.

**Recommended order:** 7 → 1 → 2 → 3 → 4A → 4B → 6

**Deploy order:** Task 4A (platform-api Cloud Run) must deploy before Task 4B (edge functions + frontend) to ensure `conv_locator` is populated when the UI reads it.

---

## Corrections from self-assessment

| Original claim | Actual finding |
|----------------|---------------|
| #11 HIGH: `.tex files can't re-parse` | **Wrong.** Migration 081 seeds routing with both `tex` and `latex` keys. Works today. Downgraded to LOW robustness fix. |
| #13 MEDIUM: `source_total_characters` never written | **Misleading.** `source_total_characters` ≠ `conv_total_characters`. Different metrics. `conv_total_characters` is already in `conversion_parsing` + `view_documents`. Dropped. |
| #12: frontend-only fix | **Incomplete.** `upsert_conversion_parsing` never sets `conv_uid` (NOT NULL — hard crash) or `conv_locator` for tree-sitter. Confirmed at runtime: error 23502. Expanded to two-layer fix (4A + 4B) with conv_uid auto-generation. |

## Deferred (not in this plan)

| Issue | Why deferred |
|-------|-------------|
| `IngestTrack = "docling"` (#14 in audit) | Tree-sitter bypasses edge functions by design. Widening the type requires refactoring all validators, policy loaders, and capability catalogs. Not needed for correctness. |
| `DOCLING_SOURCE_TYPES` missing `"markdown"` alias | `"md"` is present and covers 99% of files. `"markdown"` as source_type maps to `"md"` via `sourceTypeFromExtension`. Edge case only. |
| Remaining skeletal tree-sitter columns | `upsert_conversion_parsing` still doesn't set `conv_uid`, `conv_total_blocks`, `conv_block_type_freq`, `conv_representation_type`. Task 4A adds the most impactful one (`conv_locator`). The rest are view cosmetics — the data exists in `conversion_representations`. Full parity is a separate task. |

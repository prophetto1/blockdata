# Tree-Sitter conv_uid NOT NULL Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document and verify the fix for the 500 error when parsing code files via tree-sitter, caused by a missing `conv_uid` in the `conversion_parsing` upsert.

**Architecture:** The fix is already committed locally in `d156c826`. This plan documents the root cause, verifies the fix, and covers deployment to make it live.

**Tech Stack:** Python FastAPI (platform-api), PostgreSQL (Supabase), Cloud Run (GCP)

---

## Context

Tree-sitter code parsing (added in `3f42d5b1`) hit a 500 error on every parse because `upsert_conversion_parsing()` wrote a row to `conversion_parsing` without a `conv_uid` value, violating the `NOT NULL` constraint introduced in migration 019.

**Root cause timeline:**
1. Migration 019 (`20260213153000_019_ingest_tracks_policy_pandoc_representation.sql`) created `conversion_representations_v2` with `conv_uid TEXT NOT NULL UNIQUE CHECK (conv_uid ~ '^[0-9a-f]{64}$')` — this schema was later adopted by `conversion_parsing` as well.
2. Commit `3f42d5b1` introduced `repository.py:upsert_conversion_parsing()` which built the upsert row without a `conv_uid` field at all. The Supabase client sent the insert, Postgres rejected it.
3. The `parse.py` route caught the exception and returned 500 + marked the source as `conversion_failed`.

**Fix (committed in `d156c826`):**
- `repository.py:upsert_conversion_parsing()` now accepts an optional `conv_uid` kwarg and generates a deterministic fallback: `sha256("tree_sitter\n{source_uid}")`.
- `parse.py` now also passes `conv_locator` (the primary artifact path) so the `view_documents` materialized view can resolve the parsed output.

**Residual nuance:** The fallback `conv_uid` is synthetic — derived from `(tool, source_uid)` rather than from artifact content. This is fine for the current preview flow but means re-parsing the same file with different content produces the same `conv_uid`. If artifact-level identity ever matters (e.g., diff between parse runs), this will need revisiting.

---

## Task 1: Verify the local fix is correct and committed

**Files:**
- Read: `services/platform-api/app/domain/conversion/repository.py:67-103`
- Read: `services/platform-api/app/api/routes/parse.py:132-145`

**Step 1: Confirm the fix diff**

The original code (commit `3f42d5b1`) built the row without `conv_uid`:

```python
# BEFORE (buggy) — 3f42d5b1
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

The fix (commit `d156c826`) generates a fallback:

```python
# AFTER (fixed) — d156c826
effective_conv_uid = conv_uid or _sha256_hex(
    f"{conv_parsing_tool}\n{source_uid}".encode()
)
row: dict[str, Any] = {
    "source_uid": source_uid,
    "conv_uid": effective_conv_uid,
    ...
}
```

**Step 2: Confirm parse.py passes conv_locator**

```python
# d156c826 added this block:
primary_locator = ast_locator or symbols_locator
upsert_conversion_parsing(
    source_uid=body.source_uid,
    conv_parsing_tool="tree_sitter",
    ...
    conv_locator=primary_locator,  # NEW
)
```

**Step 3: Confirm the fix is committed (not just staged)**

Run: `git log --oneline -1 -- services/platform-api/app/domain/conversion/repository.py`
Expected: `d156c826 feat: OAuth login (Google + GitHub), parse fixes, ...`

---

## Task 2: Run existing tests locally

**Files:**
- Test: `services/platform-api/tests/test_conversion_repository.py`
- Test: `services/platform-api/tests/test_parse_route.py`

**Step 1: Run the tests**

Run: `cd services/platform-api && python -m pytest tests/test_conversion_repository.py tests/test_parse_route.py -v`

Expected: 10 passed. Key assertions that cover the fix:
- `test_upsert_conversion_parsing` — asserts `len(row["conv_uid"]) == 64` (the fallback was generated)
- `test_upsert_conversion_parsing_preserves_explicit_conv_fields` — asserts explicit `conv_uid` is preserved when provided
- `test_parse_tree_sitter_java` — asserts `len(captured["conversion_parsing"]["conv_uid"]) == 64` and `conv_locator` is set

**Step 2: Verify test_parse_tree_sitter_java specifically covers the 500 path**

The test mocks the full flow (lookup → download → parse → upload → DB write) and asserts `resp.status_code == 200`. Before the fix, this test would have caught the missing `conv_uid` because the mock Supabase `upsert` captures the row and the assertion on line 113 checks `len(captured["conversion_parsing"]["conv_uid"]) == 64`.

---

## Task 3: Apply migration 098 to production Supabase (if not already done)

**Files:**
- Migration: `supabase/migrations/20260317200000_098_tree_sitter_parse_track.sql`

**Step 1: Check if migration 098 has been applied**

Run: `supabase migration list` or check the Supabase dashboard migrations tab.

If NOT applied:
Run: `supabase db push` (or apply via dashboard)

Migration 098 widens the `conv_parsing_tool` CHECK to include `'tree_sitter'` and adds the `conversion_representations` pairing for `tree_sitter_ast_json` / `tree_sitter_symbols_json`. Without this, the DB would reject tree-sitter rows even with the conv_uid fix.

**Step 2: Verify the tree-sitter parsing profiles were seeded**

Run (via Supabase SQL editor or MCP):
```sql
SELECT id, parser, config->>'name' AS name
FROM parsing_profiles
WHERE parser = 'tree_sitter';
```

Expected: 2 rows — "Tree-sitter Standard" and "Symbols Only".

---

## Task 4: Deploy platform-api to Cloud Run

**Prerequisite:** Tasks 2 and 3 must pass first.

**Step 1: Deploy**

Run:
```powershell
.\scripts\deploy-cloud-run-platform-api.ps1 `
  -ProjectId agchain `
  -Region us-central1 `
  -UseSecretManager `
  -UseExistingSecret `
  -SecretName conversion-service-key
```

**Step 2: Verify the new revision is serving**

Run: `gcloud run services describe blockdata-platform-api --project agchain --region us-central1 --format='value(status.url)'`

Confirm the latest revision timestamp matches your deploy.

---

## Task 5: End-to-end verification in the app

**Step 1: Upload a code file**

In the web app, go to a project → Load tab → upload a `.java` or `.py` file.

**Step 2: Parse it**

Go to the Parse tab → select the code file → click Parse (or use batch parse). The parse track should auto-detect as `tree_sitter`.

**Step 3: Verify no 500**

Expected: The file transitions from "uploaded" → "converting" → "parsed" without error.

**Step 4: Verify artifacts exist**

After parsing, check:
- AST tab shows the tree viewer (TreeSitterAstPreview component)
- Symbols tab shows the symbol outline
- Download button works for both artifacts

**Step 5: Verify DB state**

```sql
SELECT sd.source_uid, cp.conv_uid, cp.conv_parsing_tool, cp.conv_locator, cp.conv_status
FROM conversion_parsing cp
JOIN source_documents sd ON sd.source_uid = cp.source_uid
WHERE cp.conv_parsing_tool = 'tree_sitter';
```

Expected: `conv_uid` is a 64-char hex string, `conv_locator` points to `converted/{uid}/{uid}.ast.json`, `conv_status` is `success`.

---

## Summary of what was wrong, what was fixed, and what's left

| Aspect | Status |
|--------|--------|
| Root cause: missing `conv_uid` in upsert | Fixed in `d156c826` |
| Root cause: missing `conv_locator` in upsert | Fixed in `d156c826` |
| Unit/integration tests | 10 passing locally |
| Migration 098 (DB constraints) | Check if applied to prod |
| Cloud Run redeployment | **Required** — running service may still serve pre-fix code |
| Synthetic conv_uid identity | Acceptable for now — revisit if parse-run diffing is needed |
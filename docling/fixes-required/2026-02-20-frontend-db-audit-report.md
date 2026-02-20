# Frontend ↔ Database Audit Report — 2026-02-20

Comprehensive audit of every frontend page, hook, and component against the current database schema. Covers table references, RPC calls, realtime subscriptions, and RLS policies.

---

## Issues Found

### CRITICAL

| # | Issue | Location | Impact |
|---|---|---|---|
| C1 | `source_documents` not in realtime publication | `ProjectDetail.tsx:249-275` | Document status changes (uploaded→converting→ingested) never trigger real-time UI updates. User must manually refresh. |
| C2 | `delete_project` RPC references `documents_v2` compat view | Stored function `delete_project` | Works today via compat view. **Breaks when compat views are dropped.** |
| C3 | `list_projects_overview_v2` RPC references `documents_v2` compat view | Stored function `list_projects_overview_v2` | Works today via compat view. **Breaks when compat views are dropped.** |

### MEDIUM

| # | Issue | Location | Impact |
|---|---|---|---|
| M1 | `Settings.tsx` uses hardcoded `'user_api_keys'` string instead of `TABLES` constant | `Settings.tsx:148, 248` | Not broken (table wasn't renamed), but inconsistent. Risks drift if table is ever renamed. |

### LOW (Dead Code)

| # | Issue | Location | Impact |
|---|---|---|---|
| L1 | `claim_unstructured_run_batch` references dropped Track B table `unstructured_workflow_runs_v2` | Stored function | Dead code. Function exists but table was dropped. Would error if called. |
| L2 | `log_unstructured_doc_status_transition_v2` references non-existent `unstructured_state_events_v2` | Stored function | Dead code from Track B. No triggers reference it. |
| L3 | `log_unstructured_run_status_transition_v2` references non-existent `unstructured_state_events_v2` | Stored function | Dead code from Track B. No triggers reference it. |
| L4 | `enforce_unstructured_doc_status_transition_v2` — orphan trigger function | Stored function | Dead code. Target table was dropped. |
| L5 | `enforce_unstructured_run_status_transition_v2` — orphan trigger function | Stored function | Dead code. Target table was dropped. |

### FIXED THIS SESSION

| # | Issue | Fix |
|---|---|---|
| F1 | `blocks` had RLS enabled but no SELECT policy | Added `blocks_select_own` policy (joins through `conversion_parsing → source_documents.owner_id`) |
| F2 | `conversion_representations` had RLS enabled but no SELECT policy | Added `conversion_representations_select_own` policy (joins through `source_documents.owner_id`) |
| F3 | PostgREST schema cache stale after table renames | Sent `NOTIFY pgrst, 'reload schema'` |

---

## Page-by-Page Audit

### 1. Projects.tsx — Projects Overview Grid

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| List projects with doc counts | `list_projects_overview_v2` | RPC | — | **C3: references `documents_v2` internally** |
| Create project | `projects` | INSERT | `TABLES.projects` | OK |

**RLS**: `projects` has `projects_insert_own`, `projects_select_own`, `projects_update_own`, `projects_delete_own` — all check `owner_id = auth.uid()`. **OK.**

**Realtime**: None. **OK** (uses RPC refetch).

---

### 2. ProjectDetail.tsx — Project Document Grid

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load project | `projects` | SELECT | `TABLES.projects` | OK |
| Load documents | `documents_view` | SELECT | `TABLES.documents` | OK |
| Load schemas | `schemas` | SELECT | `TABLES.schemas` | OK |
| Load runs by conv_uids | `runs` | SELECT | `TABLES.runs` | OK |
| Update project name/desc | `projects` | UPDATE | `TABLES.projects` | OK |
| Delete project | `delete_project` | RPC | — | **C2: function references `documents_v2`** |

**Realtime**: Subscribes to `source_documents` table (`TABLES.sourceDocuments`), filter `project_id=eq.{id}`.
**C1: `source_documents` is NOT in `supabase_realtime` publication** — subscription receives no events.

**RLS**: `source_documents` has `source_documents_select_own` (`owner_id = auth.uid()`). `documents_view` inherits RLS from underlying tables. **OK.**

---

### 3. DocumentDetail.tsx — Single Document View

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load document | `documents_view` | SELECT | `TABLES.documents` | OK |
| Delete document | `delete_document` | RPC | — | OK (function uses new table names) |

**RLS**: Reads through `documents_view` → `source_documents` RLS + `conversion_parsing` RLS. **OK.**

---

### 4. BlockViewerGrid.tsx — Block Grid (main data grid)

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load blocks | `blocks` | SELECT | `useBlocks` → `TABLES.blocks` | OK |
| Load overlays | `block_overlays` | SELECT | `useOverlays` → `TABLES.overlays` | OK |
| Confirm overlays | `confirm_overlays` | RPC | — | OK (function uses new table names) |
| Reject overlays | `reject_overlays_to_pending` | RPC | — | OK (function uses new table names) |
| Update staging | `update_overlay_staging` | RPC | — | OK (function uses new table names) |

**Realtime**: `useOverlays` subscribes to `block_overlays` table (`TABLES.overlays`), filter `run_id=eq.{id}`.
`block_overlays` IS in `supabase_realtime` publication. **OK.**

**RLS**: `blocks` has `blocks_select_own` (F1 — fixed this session). `block_overlays` has `block_overlays_select_own` + `block_overlays_update_own`. `runs` has `runs_select_own`. **OK.**

---

### 5. RunDetail.tsx — Single Run View

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load run | `runs` | SELECT | `TABLES.runs` | OK |
| Load document project | `documents_view` | SELECT | `TABLES.documents` | OK |
| Load project name | `projects` | SELECT | `TABLES.projects` | OK |
| Cancel run | `cancel_run` | RPC | — | OK (function uses new table names) |
| Delete run | `delete_run` | RPC | — | OK (function uses new table names) |

**RLS**: `runs` has `runs_select_own` (`owner_id = auth.uid()`). **OK.**

---

### 6. Schemas.tsx — Schema List Grid

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load schemas | `schemas` | SELECT | `TABLES.schemas` | OK |
| Delete schema | `delete_schema` | RPC | — | OK (function uses new table names) |

**RLS**: `schemas` has `schemas_select_own` (`owner_id = auth.uid()`). **OK.**

---

### 7. SchemaWizard.tsx — Schema Builder

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load existing schema (edit mode) | `schemas` | SELECT | `TABLES.schemas` | OK |
| Save schema | `schemas` edge function | POST | Edge function (service_role) | OK |

**RLS**: Reads use `schemas_select_own`. Writes go through edge function (bypasses RLS). **OK.**

---

### 8. SchemaAdvancedEditor.tsx — JSON Schema Editor

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load schema | `schemas` | SELECT | `TABLES.schemas` | OK |
| Save schema | `schemas` edge function | POST | Edge function (service_role) | OK |

**RLS**: Same as SchemaWizard. **OK.**

---

### 9. SchemaApply.tsx — Apply Schema to Document

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load schema | `schemas` | SELECT | `TABLES.schemas` | OK |
| Load document | `documents_view` | SELECT | `TABLES.documents` | OK |
| Create run | `runs` edge function | POST | Edge function (calls `create_run_v2` RPC) | OK |

**RLS**: Both reads use owner-scoped policies. Run creation uses `create_run_v2` which checks `sd.owner_id = p_owner_id`. **OK.**

---

### 10. Upload.tsx — File Upload

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load project name | `projects` | SELECT | `TABLES.projects` | OK |
| Upload file | `ingest` edge function | POST | Edge function (service_role) | OK |

**RLS**: Project read uses `projects_select_own`. File upload goes through edge function. **OK.**

---

### 11. WorkspaceHome.tsx — Dashboard

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load projects | `projects` | SELECT | `TABLES.projects` | OK |
| Load document statuses | `documents_view` | SELECT | `TABLES.documents` | OK |
| Load recent documents | `documents_view` | SELECT | `TABLES.documents` | OK |

**RLS**: All reads use owner-scoped policies. **OK.**

---

### 12. Settings.tsx — API Key Settings

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load API keys | `user_api_keys` | SELECT | **Hardcoded string** | **M1: should use TABLES constant** |
| Refresh after save | `user_api_keys` | SELECT | **Hardcoded string** | **M1: should use TABLES constant** |
| Save key | `user-api-keys` edge function | POST | Edge function | OK |
| Update defaults | `update_api_key_defaults` | RPC | — | OK |
| Delete key | `delete_api_key` | RPC | — | OK |

**RLS**: `user_api_keys` has `user_api_keys_select`, `_insert`, `_update`, `_delete` — all check `auth.uid() = user_id`. **OK.**

---

### 13. SuperuserSettings.tsx — Admin Panel

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load/update policies | `admin-config` edge function | GET/POST | Edge function (service_role) | OK |

**No direct table queries.** All interactions go through the `admin-config` edge function. **OK.**

---

### 14. AuthContext.tsx — Auth Provider

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Load user profile | `profiles` | SELECT | `TABLES.profiles` | OK |

**RLS**: `profiles` has `profiles_select_own`, `profiles_insert_self`, `profiles_update_own`. **OK.**

---

### 15. LegacyRedirect.tsx — URL Redirect Handler

| Query | Table | Method | Via | Status |
|---|---|---|---|---|
| Lookup doc by source_uid | `documents_view` | SELECT | `TABLES.documents` | OK |
| Lookup run by run_id | `runs` | SELECT | `TABLES.runs` | OK |
| Lookup doc by conv_uid | `documents_view` | SELECT | `TABLES.documents` | OK |

**RLS**: Uses owner-scoped policies. **OK.**

---

## Hooks Summary

| Hook | Table(s) | Via | Status |
|---|---|---|---|
| `useBlocks` | `blocks` | `TABLES.blocks` | OK |
| `useOverlays` | `block_overlays` | `TABLES.overlays` | OK |
| `useRuns` | `runs` + `schemas` (join) | `TABLES.runs` | OK |
| `useDocuments` | `documents_view` | `TABLES.documents` | OK |

All hooks use `TABLES` constants. **OK.**

---

## Realtime Subscriptions

| Component | Subscribes to | In Publication? | Status |
|---|---|---|---|
| `useOverlays` | `block_overlays` | YES | OK |
| `ProjectDetail` | `source_documents` | **NO** | **C1: BROKEN — no realtime events delivered** |

---

## RPC Functions Called by Frontend

| RPC | Called From | Internal Tables | Status |
|---|---|---|---|
| `list_projects_overview_v2` | `Projects.tsx` | `projects`, **`documents_v2`** (compat view) | **C3: stale ref** |
| `create_run_v2` | `runs` edge function → `SchemaApply` | `source_documents`, `conversion_parsing`, `runs`, `block_overlays`, `blocks` | OK |
| `confirm_overlays` | `BlockViewerGrid.tsx` | `runs`, `block_overlays` | OK |
| `reject_overlays_to_pending` | `BlockViewerGrid.tsx` | `runs`, `block_overlays` | OK |
| `update_overlay_staging` | `BlockViewerGrid.tsx` | `block_overlays`, `runs` | OK |
| `delete_document` | `DocumentDetail.tsx` | `source_documents`, `conversion_parsing`, `blocks`, `conversion_representations`, `runs`, `block_overlays` | OK |
| `delete_project` | `ProjectDetail.tsx` | `projects`, **`documents_v2`** (compat view), calls `delete_document` | **C2: stale ref** |
| `delete_run` | `RunDetail.tsx` | `block_overlays`, `runs` | OK |
| `cancel_run` | `RunDetail.tsx` | `block_overlays`, `runs` | OK |
| `delete_schema` | `Schemas.tsx` | `runs`, `schemas` | OK |
| `claim_overlay_batch` | `worker` edge function | `block_overlays`, `blocks` | OK |
| `update_api_key_defaults` | `Settings.tsx` | `user_api_keys` | OK |
| `delete_api_key` | `Settings.tsx` | `user_api_keys` | OK |

---

## RLS Policy Coverage

| Table | SELECT | INSERT | UPDATE | DELETE | Frontend Needs | Status |
|---|---|---|---|---|---|---|
| `projects` | `projects_select_own` | `projects_insert_own` | `projects_update_own` | `projects_delete_own` | SELECT, INSERT, UPDATE | OK |
| `source_documents` | `source_documents_select_own` | — | — | — | SELECT only (writes via edge fn) | OK |
| `conversion_parsing` | `conversion_parsing_select_own` | — | — | — | SELECT only (writes via edge fn) | OK |
| `blocks` | `blocks_select_own` | — | — | — | SELECT only (writes via edge fn) | OK (fixed F1) |
| `schemas` | `schemas_select_own` | — | — | — | SELECT only (writes via edge fn) | OK |
| `runs` | `runs_select_own` | — | — | — | SELECT only (writes via RPC/edge fn) | OK |
| `block_overlays` | `block_overlays_select_own` | — | `block_overlays_update_own` | — | SELECT + UPDATE (staging edits) | OK |
| `conversion_representations` | `conversion_representations_select_own` | — | — | — | Not queried by frontend | OK (fixed F2) |
| `profiles` | `profiles_select_own` | `profiles_insert_self` | `profiles_update_own` | — | SELECT only | OK |
| `user_api_keys` | `user_api_keys_select` | `user_api_keys_insert` | `user_api_keys_update` | `user_api_keys_delete` | Full CRUD | OK |

---

## Dead Stored Functions (Track B remnants)

These functions reference tables that were dropped in the `drop_track_b_tables` migration. They are never called but should be cleaned up:

| Function | References | Status |
|---|---|---|
| `claim_unstructured_run_batch` | `unstructured_workflow_runs_v2` (dropped) | Dead code |
| `enforce_unstructured_doc_status_transition_v2` | Orphan trigger function | Dead code |
| `enforce_unstructured_run_status_transition_v2` | Orphan trigger function | Dead code |
| `log_unstructured_doc_status_transition_v2` | `unstructured_state_events_v2` (dropped) | Dead code |
| `log_unstructured_run_status_transition_v2` | `unstructured_state_events_v2` (dropped) | Dead code |

---

## Recommended Fixes (priority order)

1. **C1**: Add `source_documents` to `supabase_realtime` publication:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE source_documents;
   ```

2. **C2 + C3**: Update `delete_project` and `list_projects_overview_v2` to use `source_documents` + `conversion_parsing` instead of `documents_v2`:
   - `delete_project`: change `FROM public.documents_v2 WHERE project_id = ...` → `FROM public.source_documents WHERE project_id = ...`
   - `list_projects_overview_v2`: change `LEFT JOIN public.documents_v2 d ON d.project_id = p.project_id` → `LEFT JOIN public.source_documents d ON d.project_id = p.project_id`

3. **M1**: Update `Settings.tsx` to use `TABLES` constant instead of hardcoded `'user_api_keys'`

4. **L1-L5**: Drop 5 dead Track B stored functions

---

## `tables.ts` ↔ DB Cross-Reference (final verification)

| `TABLES` key | Resolves to | DB Object | Type | Match |
|---|---|---|---|---|
| `projects` | `'projects'` | `projects` | table | OK |
| `documents` | `'documents_view'` | `documents_view` | view | OK |
| `sourceDocuments` | `'source_documents'` | `source_documents` | table | OK |
| `conversionParsing` | `'conversion_parsing'` | `conversion_parsing` | table | OK |
| `blocks` | `'blocks'` | `blocks` | table | OK |
| `schemas` | `'schemas'` | `schemas` | table | OK |
| `runs` | `'runs'` | `runs` | table | OK |
| `overlays` | `'block_overlays'` | `block_overlays` | table | OK |
| `profiles` | `'profiles'` | `profiles` | table | OK |

All 9 `TABLES` entries point to valid DB objects.

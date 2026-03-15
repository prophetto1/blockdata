# Ongoing Issues

## 2026-03-15 Review: Last 24 Hours of Implementation

### Critical

#### ~~Missing edge-function JWT overrides for new auth-enforcing functions~~ FIXED

Added `verify_jwt = false` entries for `extract-readiness`, `parse-profile-readiness`, `manage-document`, and `manage-overlays` in `supabase/config.toml`.

### Major

#### Extract and Transform shipped as UI shells, not integrated features

The new Extract and Transform workbench surfaces look substantially more complete than they are:

- The schema library is still placeholder copy in [web/src/pages/useExtractWorkbench.tsx](/e:/writing-system/web/src/pages/useExtractWorkbench.tsx#L400).
- The Save action is still a TODO and only logs to console in [web/src/pages/useExtractWorkbench.tsx](/e:/writing-system/web/src/pages/useExtractWorkbench.tsx#L430).
- The file-list Schema column is hardcoded to `—` in [web/src/pages/useExtractWorkbench.tsx](/e:/writing-system/web/src/pages/useExtractWorkbench.tsx#L561).
- Results and Downloads are still placeholder panels in [web/src/pages/useExtractWorkbench.tsx](/e:/writing-system/web/src/pages/useExtractWorkbench.tsx#L524) and [web/src/pages/useExtractWorkbench.tsx](/e:/writing-system/web/src/pages/useExtractWorkbench.tsx#L542).

This is notable drift because the persistence hook already exists in [web/src/hooks/useExtractionSchemas.ts](/e:/writing-system/web/src/hooks/useExtractionSchemas.ts#L6) but is not wired into the workbench.

#### Project-scoped Transform routes drop project context

The redirect for `/app/transform/:projectId` now throws away the route project id in [web/src/router.tsx](/e:/writing-system/web/src/router.tsx#L70), and the focus hook only derives an active project from `/app/elt/:projectId` routes in [web/src/hooks/useProjectFocus.ts](/e:/writing-system/web/src/hooks/useProjectFocus.ts#L38). As a result, deep links into a specific Transform project can open the wrong project or whichever project is currently focused.

### Edge Function Logic Bugs

#### ~~pipeline_config divergence on failure paths~~ FALSE POSITIVE

Lines 187 and 266 are in early-failure branches (`!body.success` and missing `docling_key`) that execute before `effectivePipelineConfig` is computed. In these paths, `body.pipeline_config` is correct — it's what the conversion service sent back. The `effectivePipelineConfig` fallback only applies deeper in the success track where the callback might omit the field.

#### manage-overlays ownership check runs after mutation
- **File:** `supabase/functions/manage-overlays/index.ts` ~line 87
- The RPC (`confirm_overlays`) executes and mutates Postgres before the ownership check runs. If the check fails (403), the mutation already happened. Move ownership validation before the RPC call, or confirm the RPC itself enforces ownership via RLS/SECURITY DEFINER.

#### ~~runs/index.ts null crashes on missing ancestry~~ FIXED

Added explicit null checks with descriptive error messages before using `ancestry.source_uid` and `docRow.project_id`.

#### runs/index.ts missing cleanup_outbox retry
- **File:** `supabase/functions/runs/index.ts` ~line 167
- Arango sync errors are caught and logged but not written to `cleanup_outbox` for retry. Other functions (manage-document, manage-overlays) do write outbox rows. Runs will be missing from Arango projection.

#### trigger-parse nested query swallows errors
- **File:** `supabase/functions/trigger-parse/index.ts` ~lines 103-107
- Nested `conversion_parsing` lookup error is swallowed. If the query errors (not just returns null), `data?.conv_uid` is undefined, defaults to `"__none__"`, and silently deletes no blocks.

#### export-jsonl test name/assertion mismatch
- **File:** `supabase/functions/export-jsonl/index.test.ts` ~lines 192-194
- Test titled "treats explicit normalized overrides as raw_docling" but the request URL uses `block_view=normalized` while assertions check `raw_docling_view`. Name and intent are backwards.

### Migration Issues

#### ~~Migration 091 number collision~~ FIXED

Renamed `20260315100000_091_cleanup_outbox_overlay_sync_action.sql` to `_092_`.

#### Migration 090 not idempotent
- **File:** `supabase/migrations/20260314170000_090_add_overlay_uid.sql`
- Uses `ADD COLUMN` without `IF NOT EXISTS`. Will fail on re-run.

#### Migration 092 unsafe constraint drop
- **File:** `supabase/migrations/20260315100000_092_cleanup_outbox_overlay_sync_action.sql`
- `DROP CONSTRAINT cleanup_outbox_action_check` without `IF EXISTS`. Also relies on Postgres auto-generated constraint name matching expectations (migration 089 uses inline CHECK without explicit naming).

### Frontend Schema Drift

#### Schemas.tsx type/logic mismatch with extractionSchemaHelpers
- **File:** `web/src/pages/Schemas.tsx` ~lines 29-37, 70-154
- `SchemaField` type is missing `description` and `examples` fields that `createSchemaField()` (line 251) initializes. Also has its own `buildObjectSchema`/`parseObjectSchemaToFields` that diverge from the shared `web/src/lib/extractionSchemaHelpers.ts` — the page-local versions will lose description and examples data during round-trip. Should use the shared helpers or sync the type.

### Frontend Drift

#### ~~`normalizeDocumentViewMode` always returns `'raw_docling'`~~ FIXED

Changed truthy branch to return `value as DocumentViewMode` instead of the hardcoded `'raw_docling'` literal.

#### Superuser document-views page routed but unreachable from nav
- The route exists in `web/src/router.tsx` (line 240) but the superuser second-rail config omits it in `web/src/components/shell/nav-config.ts` (line 157). A test asserts the expected nav shape in `superuserDocumentViewsNav.test.ts` (line 10) and currently fails.

#### ~~Parse workbench Docling badge palette out of sync with tests~~ FIXED

Updated test expectations to match the intentional code changes: `text → 'dark'`, `list → 'green'`.

#### Parse tab lost in-app Docling JSON viewer
- The `docling-json` tab now renders `DownloadsTab` in `web/src/pages/useParseWorkbench.tsx` (line 843), replacing the earlier JSON preview surface. If JSON inspection was part of the intended analyst workflow, that behavior regressed. Looks like feature drift rather than a deliberate change.

### Infrastructure Gaps

#### `cleanup_outbox` has no consumer
- `manage-overlays/index.ts` and `manage-document/index.ts` both write rows to `cleanup_outbox` when Arango sync fails after Postgres commits, but no function reads or processes those rows. The outbox pattern is write-only — failed Arango syncs accumulate without retry, causing silent Arango drift.

### Verification Notes

- `web` production build passed.
- Targeted Deno tests were not reliable in this environment because Deno 2.6.9 on Windows panicked with an invalid-handle error before assertions ran.
- Targeted Vitest runs were also limited here because `esbuild` failed to spawn with `EPERM`.

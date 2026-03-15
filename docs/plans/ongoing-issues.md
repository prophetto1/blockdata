# Ongoing Issues

Updated 2026-03-15. Resolved items removed; planned items moved to their respective plans.

---

## Quick Fixes

#### manage-overlays ownership check runs after mutation
- **File:** `supabase/functions/manage-overlays/index.ts` ~line 87
- The RPC (`confirm_overlays`) executes and mutates Postgres before the Arango ownership check. If the check fails (403), the mutation already happened.
- **Action:** Verify whether `confirm_overlays` enforces ownership via RLS. If yes, remove the redundant post-RPC check. If no, move validation before the RPC.

#### trigger-parse nested query swallows errors
- **File:** `supabase/functions/trigger-parse/index.ts` ~lines 103-107
- Nested `conversion_parsing` lookup error is swallowed. If the query errors (not just returns null), `data?.conv_uid` defaults to `"__none__"` and silently deletes no blocks.
- **Action:** Extract the lookup, add error check. 3 lines.

#### export-jsonl test name/assertion mismatch
- **File:** `supabase/functions/export-jsonl/index.test.ts` ~lines 192-194
- Test title says "normalized overrides" but assertions check `raw_docling_view`. Name and intent are backwards.
- **Action:** Rename test. 1 line.

#### Superuser document-views page unreachable from nav
- Route exists in `web/src/router.tsx` (line 240) but the superuser second-rail config omits it in `web/src/components/shell/nav-config.ts` (line 157). Test in `superuserDocumentViewsNav.test.ts` fails.
- **Action:** Add nav entry. ~3 lines.

---

## Resolves with Extraction Phase 4-5

These are expected incomplete state, not bugs. They resolve when the merged extraction plan (`2026-03-14-extraction-and-parse-verification-merged.md`) reaches Phase 5.

#### Extract workbench is a UI shell
- Schema library, Save, Results, Downloads are placeholder panels.
- `useExtractionSchemas` hook exists but is not wired into the workbench.

#### Schemas.tsx diverges from shared extractionSchemaHelpers
- `SchemaField` type missing `description`/`examples` fields; local `buildObjectSchema`/`parseObjectSchemaToFields` lose data vs shared helpers.
- Resolves in Phase 3 Task 3.5 (schema builder component refactor).

---

## Resolves with Arango Hardening

#### cleanup_outbox has no consumer
- `manage-overlays`, `manage-document`, and `trigger-parse` write outbox rows on Arango sync failure, but nothing reads or retries them. Failed syncs accumulate silently.
- **Action:** Add a sweep function (pg_cron or scheduled edge function) as a task in the arango plan.

#### runs/index.ts missing cleanup_outbox write
- **File:** `supabase/functions/runs/index.ts` ~line 167
- Arango sync errors are caught/logged but not written to `cleanup_outbox`. Other functions do write outbox rows.
- **Action:** Add outbox insert to the catch block (mirrors manage-document/manage-overlays pattern). 1-line addition, but pointless until the consumer exists.

---

## Deferred (needs product decision)

#### Transform routes drop project context
- `/app/transform/:projectId` redirect discards the project id. Deep links open the wrong project.
- **Decision:** Does Transform need project scoping yet? If still a shell, defer until it gets real content.

#### ~~Parse tab lost Docling JSON viewer~~ — resolved
- The `docling-json` tab now renders `DownloadsTab`, which includes the full Docling document JSON as a downloadable artifact (`document-json` item in `getParseDownloadItems()`). Inspection functionality is preserved, just accessed differently.
- **Closed:** JSON access retained via DownloadsTab. Reopen only if inline preview is explicitly needed.

---

## Already Applied (forward-only, no action)

- Migration 090 `ADD COLUMN` without `IF NOT EXISTS` — already applied, migrations are forward-only.
- Migration 092 `DROP CONSTRAINT` without `IF EXISTS` — same; already applied.
# 2026-04-02 Storage Namespace Closure Verification Report

## Purpose

Execution evidence for the approved replay-remediation plan in
`docs/plans/2026-04-02-storage-parser-replay-remediation-plan.md`.

## Task 1: Linked Parser-Era Schema Evidence

- Status: Complete
- Linked dump command: `cd supabase; npx supabase db dump --linked --schema public --file .temp/parser-storage-linked-schema.sql`
- Linked dump artifact: `E:\writing-system\.temp\parser-storage-linked-schema.sql`
- Bootstrap-safe relations confirmed:
  - `public.source_documents`
  - `public.conversion_parsing`
  - `public.conversion_representations`
  - `public.runs`
  - `public.block_overlays`
  - additive compatibility columns plus indexes, FK, and RLS policy on legacy `public.blocks`
- Later-era exclusions confirmed:
  - `public.source_documents.document_surface`
  - `public.source_documents.storage_object_id`
  - `source_documents_document_surface_check`
  - `source_documents_storage_object_id_fkey`
  - `public.block_overlays.overlay_uid`
  - `block_overlays_confirmed_by_fkey`
  - `block_overlays_status_fkey`
  - `blocks_block_type_fkey`
  - `blocks_block_uid_check`
  - `blocks_v2_block_locator_check`
  - `conversion_parsing_conv_parsing_tool_check`
  - `conversion_parsing_conv_parsing_tool_fkey`
  - `conversion_parsing_conv_representation_type_fkey`
  - `conversion_parsing_conv_status_fkey`
  - `conversion_representations_pairing`
  - `conversion_representations_v2_parsing_tool_check`
  - `conversion_representations_parsing_tool_fkey`
  - `conversion_representations_representation_type_fkey`
  - `runs_schema_id_fkey`
  - `runs_status_fkey`
  - `source_documents_project_id_fkey`
  - `source_documents_source_type_fkey`
  - `source_documents_status_fkey`
- Notes:
  - The linked dump confirms the parser-era tables exist in the linked project and that later repo migrations really do target the unversioned parser/storage tables.
  - The local replay blocker remains anchored at `20260220194000_040_storage_documents_preview_select_policy.sql` because no earlier replayable migration creates `source_documents` or its sibling parser-era relations.
  - The bootstrap must preserve the repo's RLS-first privilege pattern and avoid broad bootstrap-added table grants.

## Task 2: Bootstrap Migration Authoring

- Status: Partially complete; storage-specific replay blockers cleared, broader migration-history blocker remains
- Migration files:
  - `supabase/migrations/20260220193000_storage_parser_compat_bootstrap.sql`
  - `supabase/migrations/20260227160000_052_integration_registry_actions.sql`
  - `supabase/migrations/20260303110000_065_service_schema_extensions.sql`
- Notes:
  - Red-phase replay failure before bootstrap: `20260220194000_040_storage_documents_preview_select_policy.sql` failed because `public.source_documents` did not exist.
  - The bootstrap migration fixed that parser/storage table gap and later expanded to cover the missing catalog layer required by `041`, `042`, `048`, and `083`.
  - Replay then failed at `20260227160000_052_integration_registry_actions.sql` because PostgreSQL does not support `ADD CONSTRAINT IF NOT EXISTS`; that historical migration was repaired in-place using guarded `pg_constraint` checks while preserving the same constraint names and FK targets.
  - Replay then failed at `20260303110000_065_service_schema_extensions.sql` because `CREATE OR REPLACE VIEW public.service_functions_view` tried to rename existing view columns in-place; that view refresh was repaired to preserve the prior column prefix and append the new metadata columns.
  - After those repairs, replay clears `040`, `041`, `042`, `048`, `052`, `065`, and `083`, and now fails at `20260309183000_073_normalize_flow_identity.sql`.
  - The current failure is `ERROR: relation "public.projects" does not exist (SQLSTATE 42P01)` at the first statement of `073`.
  - That `073` failure is outside the parser/storage replay seam this plan was written to repair and points to a broader migration-history reconciliation problem.

## Task 3: Schema-Contract Test

- Status: Pending
- Test file:
- Notes:

## Task 4: Local Replay and Backend Verification

- Status: Pending
- `supabase db reset` result:
- Local migration list:
- Schema-contract test result:
- Backend suite result:
- Notes:

## Task 5: Linked Database Apply

- Status: Pending
- Linked migration list before apply:
- `supabase db push` result:
- Linked migration list after apply:
- Partial-apply state:
- Notes:

## Task 6: Resume Closeout Plan

- Status: Pending
- Resumed task:
- Notes:

# Storage Quota Migration & History Resolution Report

Date: 2026-03-20

## Scope
- Confirm and repair Supabase migration history integrity for user-storage migrations.
- Remove legacy duplicate timestamp migration files.
- Ensure future duplicate-timestamp drift is blocked in CI.
- Verify route/DB storage contract remains present.

## Changes Applied
1. **Resolved legacy duplicate migration timestamp pairs**
   - Deleted: `supabase/migrations/20260314130000_087_upload_support_all_remove_upload_gates.sql`
   - Merged duplicate logic into: `supabase/migrations/20260317210000_099_default_project_on_signup.sql`
     - Added `parsing_profiles` owner/RLS migration blocks from the removed sibling.
   - Deleted: `supabase/migrations/20260317210000_099_parsing_profiles_rls.sql`

2. **Kept canonical storage migrations**
   - `supabase/migrations/20260319190000_102_user_storage_quota.sql`
   - `supabase/migrations/20260320100000_storage_history_drift_fixups.sql`

3. **Added migration-hygiene CI guard**
   - Added workflow: `.github/workflows/migration-history-hygiene.yml`
   - Workflow fails when duplicate migration timestamps exist under `supabase/migrations/`.

## Verification (Local + Supabase)
### Local migration file check
- Duplicate timestamps in `supabase/migrations` after cleanup: **none found**.

### Supabase migration history
- Query result:
  - `20260319190000` exists with name `102_user_storage_quota`
  - `20260320100000` exists with name `storage_history_drift_fixups`

### Storage DB objects
- `public.storage_quotas` exists
- `public.storage_upload_reservations` exists
- `public.storage_objects` exists

### Storage RPCs
All required RPCs exist in `public`:
- `reserve_user_storage`
- `complete_user_storage_upload`
- `cancel_user_storage_reservation`
- `release_expired_storage_reservations`
- `delete_user_storage_object`
- `reconcile_user_storage_usage`

## Current Config/Behavior Notes
- Per-user quota default remains **50 GB** (`storage_quotas.quota_bytes = 53687091200` in migration SQL and row seed).
- Per-file max is configured separately via env `USER_STORAGE_MAX_FILE_BYTES` (currently 1 GB in `.env`).

## Remaining actions (recommended)
1. Run a final `supabase migration list`/`db push` in the deploy machine workflow you use for release.
2. If `secrets/` is not intended to be committed, confirm and exclude it from VCS.
3. Optionally run a dry CI check on `.github/workflows/migration-history-hygiene.yml` to validate the new gate.

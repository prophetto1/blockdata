# Supabase Schema Drift Reconciliation

## Purpose

Record the exact gap between the live Supabase project and the local migration tree before generated types or adapter code depend on that state.

## Observed State

- Live Supabase already has the `kt` schema.
- Live Supabase migration history includes `20260309030831 add_kt_kestra_schema`.
- The local repo migration tree stops at `20260308150000_072_registry_superuser_profiles.sql`.
- The local repo does not yet contain the migration artifact that created the live `kt` schema.

## Reconciliation Rule

- Generated shared types may be used for preparation work.
- Generated shared types must not be treated as canonical repo state until migration parity is restored.
- Before broad page implementation starts, the repo must gain the missing migration artifact that matches the live `kt` schema addition.

## Required Next Action

- Backfill the missing Kestra schema migration into `supabase/migrations/`.
- Re-run shared type generation after the repo and live schema are back in sync.

## Evidence

- Live migration list includes `20260309030831 add_kt_kestra_schema`.
- Live table list shows the 21-table `kt` surface.
- Local migration directory currently ends at `20260308150000_072_registry_superuser_profiles.sql`.


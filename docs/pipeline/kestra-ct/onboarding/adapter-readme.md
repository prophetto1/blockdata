# Kestra Adapter README

## What This Covers

This is the short operating guide for the planned Kestra compatibility adapter. It summarizes the runtime layout frozen in [adapter-layout.md](/home/jon/blockdata/kestra-ct/onboarding/adapter-layout.md).

## Core Rule

Keep each concern in one layer.

- handler entrypoints own HTTP and route dispatch
- query modules own `kt.*` reads
- mapper modules own Kestra DTO formatting
- filter modules own normalized query-input parsing

Do not mix these layers.

## Planned Runtime Roots

- edge functions: `supabase/functions/kestra-<domain>/`
- shared adapter code: `supabase/functions/_shared/kestra-adapter/`
- promoted DB types: `supabase/functions/_shared/database.types.ts`
- promoted Kestra contract types: `supabase/functions/_shared/kestra-contract/`

## First Domain

The first domain function is:

- `supabase/functions/kestra-flows/index.ts`

That function will back the preserved frontend route:

- `GET /api/v1/main/flows/search`

through the compatibility proxy layer chosen earlier.

## File Conventions

- function entrypoint: `index.ts`
- function test: `index.test.ts`
- shared query file: `<domain>.ts`
- shared query test: `<domain>.test.ts`
- shared mapper file: `<domain>.ts`
- shared mapper test: `<domain>.test.ts`

## Promotion Rule

This README is a CT artifact only. Do not create runtime adapter files until the preparation gate approves promotion from CT into the runtime repo.

# Kestra CT Verification Matrix

## Core Commands

### `web-kt` install

- Command: `npm install`
- Working directory: `web-kt`
- Evidence: exit status and dependency resolution output

### OpenAPI generation

- Command: `npm run generate:openapi`
- Working directory: `web-kt`
- Evidence: exit status and generated file presence under `src/generated/kestra-api`

### CT DB type generation

- Primary attempt: Supabase MCP `generate_typescript_types`
- Required verification: generated file must include `kt` and the key tables `flows`, `executions`, `logs`, and `triggers`
- Fallback used for Task 6: live `kt` schema introspection via Supabase SQL metadata, written to `kestra-ct/generated/database.types.ts`
- Evidence: file presence plus fresh grep results for `kt`, `flows`, `executions`, `logs`, and `triggers`

### CT Kestra contract generation

- Command: `npx openapi-ts -i ../openapi.yml -o ../kestra-ct/generated/kestra-contract -p @hey-api/typescript`
- Working directory: `web-kt`
- Evidence: exit status and generated file presence under `kestra-ct/generated/kestra-contract`
- Post-step: restore or verify `kestra-ct/generated/kestra-contract/README.md` after regeneration because `openapi-ts` rewrites the output directory

### Page run

- Command: `npm run dev`
- Working directory: `web-kt`
- Evidence: dev server starts and the target page can be reached

### `web-kt` runtime baseline

- Command 1: `npm run generate:openapi`
- Command 2: `npm run dev`
- Working directory: `web-kt`
- Evidence:
  - `generate:openapi` exits `0` and refreshes `src/generated/kestra-api`
  - `dev` prints a local URL and reaches the ready state
- Baseline caveat:
  - in this environment, the Vite `commit()` plugin may require running `npm run dev` outside the sandbox because it spawns `/bin/sh`

### Adapter endpoint verification

- Command: `TBD by endpoint`
- Working directory: repo root
- Evidence: exact request and response shape match

### Page-level test runs

- Command: `TBD by page`
- Working directory: `web-kt`
- Evidence: exact test command output

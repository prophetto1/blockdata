---
doc_type: kestra_page_verification
page_key: "flows_list"
title: "Flows list"
status: blocked
verified_endpoint: false
verified_payload_shape: false
verified_page_render: false
verified_search: false
verified_sort: false
verified_pagination: false
evidence_commands:
  - "deno test supabase/functions/kestra-flows/index.test.ts"
  - "find supabase/functions/kestra-flows supabase/functions/_shared/kestra-adapter -maxdepth 3 -type f | sort"
  - "command -v deno || echo deno-missing"
  - "sed -n '1,120p' web-kt/vite.config.js"
evidence_tests:
  - "supabase/functions/kestra-flows/index.test.ts"
evidence_notes:
  - "`deno test` could not run because `deno` is not installed in this workspace."
  - "The new runtime slice exists on disk, but endpoint and page verification remain blocked until a Deno runtime is available."
  - "`web-kt` still proxies `/api` to `http://localhost:8080`, and there is no finished compatibility gateway serving the preserved Kestra paths there."
updated_at: 2026-03-09
---

## Results

- Added `supabase/functions/kestra-flows/index.ts` for the minimal `GET /search` handler path.
- Added `supabase/functions/_shared/kestra-adapter/filters/flows.ts` to normalize `page`, `size`, `sort`, and supported `filters[...]` query params.
- Added `supabase/functions/_shared/kestra-adapter/queries/flows.ts` to query `kt.flows` and return rows plus total.
- Added `supabase/functions/_shared/kestra-adapter/mappers/flows.ts` to map `kt.flows` rows into `PagedResultsFlow`.
- Added `supabase/functions/kestra-flows/index.test.ts` with the first handler test cases.

## Failures

- `deno test supabase/functions/kestra-flows/index.test.ts` failed immediately with `/bin/bash: line 1: deno: command not found`.
- Full page verification is still blocked by the missing compatibility gateway on `localhost:8080`.
- `Flows.vue` still issues `POST /api/v1/main/executions/latest` after the list request, so last-execution columns remain unresolved for a true end-to-end “done” status.

## Follow-Ups

- Install or provide a local Deno runtime so the edge-function test and formatting commands can run.
- Provide the shared compatibility gateway on `localhost:8080`, or another verified path that preserves `/api/v1/main/...` for `web-kt`.
- Implement `POST /api/v1/main/executions/latest` for the last-execution columns if the page must be fully completed end to end.

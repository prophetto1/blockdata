---
doc_type: kestra_page_implementation
page_key: "flows_create"
title: "Flows create"
status: planning
target_function: "supabase/functions/kestra-flows/index.ts"
target_query_module: "supabase/functions/_shared/kestra-adapter/queries/flows.ts"
target_mapper_module: "supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
runtime_targets:
  - "supabase/functions/kestra-flows/index.ts"
  - "supabase/functions/_shared/kestra-adapter/queries/flows.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
test_targets:
  - "supabase/functions/kestra-flows/index.test.ts"
depends_on:
  - "CT-generated DB types at kestra-ct/generated/database.types.ts"
  - "CT-generated contract types at kestra-ct/generated/kestra-contract/types.gen.ts"
  - "Existing flows_list adapter modules in supabase/functions/kestra-flows and supabase/functions/_shared/kestra-adapter/flows.*"
  - "Compatibility gateway availability on localhost:8080 for end-to-end page verification"
  - "Default documentation tab endpoints: /api/v1/main/plugins/groups/subgroups and /api/v1/main/plugins/icons/groups"
  - "Namespace file save endpoint: /api/v1/main/namespaces/{namespace}/files"
updated_at: 2026-03-09
---

## Intended Changes

- Extend the existing `kestra-flows/index.ts` handler to support the create page's primary `POST /flows` route in addition to the existing `GET /flows/search` route.
- Add minimal in-handler support for the create page's on-load `POST /flows/validate` and `POST /flows/graph` endpoints so the seeded editor can validate YAML and request a topology preview.
- Add flow query helpers to `queries/flows.ts` for duplicate detection and inserting a new `kt.flows` row without touching the existing Blockdata `supabase/functions/flows/` function.
- Extend the shared flow mapper so the create response returns a `FlowWithSource`-compatible payload with `source`, `updated`, `outputs`, and other JSON-backed fields preserved from `kt.flows.value`.
- Keep the first slice limited to the blank create path plus validation/graph support; leave plugin docs endpoints, namespace-file save, and duplicate-id overwrite follow-on behavior documented as residual blockers.

## File Plan

### Runtime files

- `supabase/functions/kestra-flows/index.ts` — modified; route dispatch for root `POST`, `/validate`, and `/graph`, plus YAML parsing and minimal graph/validation helpers
- `supabase/functions/_shared/kestra-adapter/queries/flows.ts` — modified; add duplicate lookup and insert helpers for `kt.flows`
- `supabase/functions/_shared/kestra-adapter/mappers/flows.ts` — modified; extend the shared flow mapper to cover the create response shape

### Test files

- `supabase/functions/kestra-flows/index.test.ts` — modified; fix the current baseline typing issue, then add integration tests for create, validate, and graph behavior

### CT files

- `kestra-ct/pages/flows-create/implement.md` — this file
- `kestra-ct/pages/flows-create/README.md` — implementation status note
- `kestra-ct/page-registry.yaml` — side-status update

## Contract Rules

- Preserve the exact Kestra route and payload shape.
- Keep `namespace` first-class in `kt.*`.
- Do not redesign the UI while making the page work.
- Accept an `application/x-yaml` request body for `POST /api/v1/main/flows`, `POST /api/v1/main/flows/validate`, and `POST /api/v1/main/flows/graph`.
- Return a single `FlowWithSource` object from the create route, not a paginated envelope.
- Keep the default blank create path primary; blueprint-prefill and duplicate-id overwrite are follow-on branches and must not distort the first slice.
- Do not import backend DTOs from generated SDK files; only use `kestra-ct/generated/kestra-contract/types.gen.ts`.

## Verification Commands

```bash
docker run --rm -v /home/jon/blockdata:/workspace -w /workspace denoland/deno:latest deno fmt supabase/functions/kestra-flows/index.ts supabase/functions/kestra-flows/index.test.ts supabase/functions/_shared/kestra-adapter/queries/flows.ts supabase/functions/_shared/kestra-adapter/mappers/flows.ts
docker run --rm -v /home/jon/blockdata:/workspace -w /workspace denoland/deno:latest deno test --node-modules-dir=auto supabase/functions/kestra-flows/index.test.ts
curl -i -X POST http://127.0.0.1:54321/functions/v1/kestra-flows -H 'Authorization: Bearer <token>' -H 'Content-Type: application/x-yaml' --data-binary $'id: demo\nnamespace: company.team\n\ntasks:\n  - id: hello\n    type: io.kestra.plugin.core.log.Log\n    message: Hello World!'
curl -i -X POST http://127.0.0.1:54321/functions/v1/kestra-flows/validate -H 'Authorization: Bearer <token>' -H 'Content-Type: application/x-yaml' --data-binary $'id: demo\nnamespace: company.team\n\ntasks:\n  - id: hello\n    type: io.kestra.plugin.core.log.Log\n    message: Hello World!'
curl -i -X POST 'http://127.0.0.1:54321/functions/v1/kestra-flows/graph?subflows=' -H 'Authorization: Bearer <token>' -H 'Content-Type: application/x-yaml' --data-binary $'id: demo\nnamespace: company.team\n\ntasks:\n  - id: hello\n    type: io.kestra.plugin.core.log.Log\n    message: Hello World!'
```

## Stop Conditions

- Missing bootstrap dependency
- Missing contract detail
- Response shape ambiguity
- The shared compatibility gateway on `localhost:8080` remains missing, so true page-level verification cannot be claimed from this slice alone.
- The default documentation tab still depends on `/plugins/groups/subgroups` and `/plugins/icons/groups`, which are outside the `kestra-flows` domain and remain unimplemented.
- Save-all can still touch `/api/v1/main/namespaces/{namespace}/files`, which is outside this slice.
- If the UI requires the duplicate-id overwrite fallback (`PUT /flows/{namespace}/{id}`) for this slice, stop and treat that as separate follow-on work.

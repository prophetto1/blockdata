---
doc_type: kestra_page_implementation
page_key: "flows_update"
title: "Flows update"
status: plan_complete
target_function: "supabase/functions/kestra-flows/index.ts"
target_query_module: "supabase/functions/_shared/kestra-adapter/queries/flows.ts"
target_mapper_module: "supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
runtime_targets:
  - "supabase/functions/kestra-flows/index.ts"
  - "supabase/functions/_shared/kestra-adapter/queries/flows.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
test_targets:
  - "supabase/functions/kestra-flows/index.test.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts"
depends_on:
  - "CT-generated DB types at kestra-ct/generated/database.types.ts"
  - "CT-generated contract types at kestra-ct/generated/kestra-contract/types.gen.ts"
  - "Existing flows_list handler at supabase/functions/kestra-flows/index.ts"
  - "Existing toFlow mapper at supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
  - "Compatibility gateway availability on localhost:8080 for end-to-end page verification"
  - "On-load secondary endpoints: /graph, /dependencies, /validate (stub or real)"
updated_at: 2026-03-09
---

## Intended Changes

- Add a detail route to the existing `kestra-flows/index.ts` handler that serves `GET /flows/{namespace}/{id}` returning a single `FlowWithSource` object.
- Add a `getFlowByNamespaceAndId` query function to `queries/flows.ts` that fetches a single row from `kt.flows` by namespace + id, with optional revision and allowDeleted support.
- Extend the existing `toFlow` mapper in `mappers/flows.ts` to include additional fields needed by FlowRoot.vue that are not needed by the list view: `updated`, `variables`, `finally`, `afterExecution`, `outputs`.
- Add a dedicated mapper unit test at `mappers/flows.test.ts` to verify the `FlowWithSource` shape independently from the handler.
- Add handler integration tests for the detail route in `index.test.ts`.
- Add minimal stub routes for the three on-load secondary endpoints (`/graph`, `/dependencies`, `/validate`) so the page does not crash on load.

## Minimum Payload Fields

The mapper must produce these fields for the page to render. Sourced from capture.md mapping table:

| Field | Type | Source | Used by |
| --- | --- | --- | --- |
| `id` | string | `kt.flows.id` | Page title, breadcrumb |
| `namespace` | string | `kt.flows.namespace` | Namespace breadcrumb |
| `revision` | integer | `kt.flows.revision` | Validation, revision comparison |
| `source` | string | `kt.flows.source_code` | YAML editor content |
| `deleted` | boolean | `kt.flows.deleted` | Deleted banner |
| `disabled` | boolean | `kt.flows.value.disabled` | Enable/disable toggle |
| `description` | string? | `kt.flows.value.description` | Overview tab |
| `labels` | object? | `kt.flows.value.labels` | Various UI elements |
| `tasks` | array | `kt.flows.value.tasks` | Topology rendering, task navigation |
| `triggers` | array? | `kt.flows.value.triggers` | Triggers tab |
| `inputs` | array? | `kt.flows.value.inputs` | Execution trigger dialog |
| `concurrency` | object? | `kt.flows.value.concurrency` | Concurrency tab |
| `updated` | string? | `kt.flows.updated` | Revision/metadata views |
| `errors` | array? | `kt.flows.value.errors` | Flow error display |
| `finally` | array? | `kt.flows.value.finally` | Topology rendering |
| `afterExecution` | array? | `kt.flows.value.afterExecution` | Topology rendering |
| `pluginDefaults` | array? | `kt.flows.value.pluginDefaults` | Editor display |
| `outputs` | array? | `kt.flows.value.outputs` | Editor display |
| `variables` | object? | `kt.flows.value.variables` | Editor display |

Fields NOT required for first slice (follow-on): `workerGroup`, `sla`, `checks`.

## File Plan

### Runtime files

All modified (not new) — the handler, query, and mapper modules already exist from `flows_list`:

- `supabase/functions/kestra-flows/index.ts` — add detail route dispatch and stub routes for `/graph`, `/dependencies`, `/validate`
- `supabase/functions/_shared/kestra-adapter/queries/flows.ts` — add `getFlowByNamespaceAndId` function
- `supabase/functions/_shared/kestra-adapter/mappers/flows.ts` — extend `toFlow` to include `updated`, `outputs`, `variables`, `finally`, `afterExecution`

### Test files

- `supabase/functions/kestra-flows/index.test.ts` — add detail route tests (modified)
- `supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts` — new unit test for `toFlow` shape verification

### CT files

- `kestra-ct/pages/flows-update/implement.md` — this file
- `kestra-ct/pages/flows-update/verify.md` — updated during verification phase
- `kestra-ct/page-registry.yaml` — status update

## Test Coverage Scope

The handler integration test (`index.test.ts`) covers the full request-to-response path for the detail route with injected dependencies. It verifies:

- Detail path dispatches correctly (not rejected as "expected /search")
- Response is a single `FlowWithSource` object (not paginated)
- 404 returned when flow not found
- `allowDeleted` param allows fetching deleted flows

The mapper unit test (`mappers/flows.test.ts`) independently verifies that `toFlow` produces the correct shape with all minimum payload fields. This is separate because:

1. The mapper is shared between `flows_list` (via `toPagedFlowsResponse`) and `flows_update` (via direct `toFlow` call).
2. A mapper-level test catches field-mapping regressions without the full handler stack.
3. The `flows_list` review flagged that mapper coverage was missing — this addresses that gap for both pages.

## Contract Rules

- Preserve the exact Kestra route and payload shape.
- Keep `namespace` first-class in `kt.*`.
- Do not redesign the UI while making the page work.
- Return a single `FlowWithSource` object (not paginated, not wrapped in `results`/`total`).
- The detail endpoint returns the full flow with `source` field (YAML source code) included.
- Do not import backend DTOs from generated SDK files; only use `kestra-ct/generated/kestra-contract/types.gen.ts`.
- The `value` column is JSON — extract nested fields in the mapper only.

## On-Load Secondary Endpoints

The page calls three additional endpoints on load. These are out of primary scope but need minimal stubs to prevent page crash:

| Endpoint | Stub response | Behavior |
| --- | --- | --- |
| `GET /flows/{namespace}/{id}/graph` | `{ nodes: [], edges: [], clusters: [], flowables: [] }` | Topology tab shows empty, page does not crash |
| `GET /flows/{namespace}/{id}/dependencies` | `{ nodes: [], edges: [] }` | Dependency badge shows 0 |
| `POST /flows/validate` | `[{}]` | No validation errors displayed |

These stubs are added to `kestra-flows/index.ts` as minimal route dispatches. They are not the primary deliverable but prevent the page from erroring on load. Full implementations are follow-on work.

## Verification Commands

All runtime targets included in format and test commands:

```bash
# Format all touched files
deno fmt supabase/functions/kestra-flows/index.ts supabase/functions/kestra-flows/index.test.ts supabase/functions/_shared/kestra-adapter/queries/flows.ts supabase/functions/_shared/kestra-adapter/mappers/flows.ts supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts

# Run all tests (handler integration + mapper unit)
deno test supabase/functions/kestra-flows/index.test.ts supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts

# Verify file structure
find supabase/functions/kestra-flows supabase/functions/_shared/kestra-adapter -maxdepth 3 -type f | sort
```

## Stop Conditions

- Missing bootstrap dependency
- Missing contract detail for `FlowWithSource` response shape
- Response shape ambiguity between detail and list endpoints
- The page still cannot boot through `http://localhost:8080` after the endpoint code exists because the compatibility gateway remains missing
- The on-load secondary endpoints (`/graph`, `/dependencies`, `/validate`) cannot be stubbed without breaking the page render

## Review Follow-Ups

- Clarify the first-slice scope: either include the overview tab's `GET /api/v1/main/executions/search` dependency in this plan, or narrow the slice so the first deliverable is topology-safe only.
- Add explicit regression verification for `flows_list` so changes to the shared `kestra-flows` handler and shared flow mapper do not break `GET /api/v1/main/flows/search`.
- Expand the verification plan so it covers the new query path and the three on-load stub endpoints (`/graph`, `/dependencies`, `/validate`), not just the detail handler and mapper shape.

# Page Investigation Procedure

This is the step-by-step procedure for the first two phases of page work: **packet** and **capture**. Follow every step in order. Do not skip steps.

This procedure produces two documents per page. No runtime code is written. No implementation decisions are made.

## Prerequisites

Before starting, you must have read these files:

1. `kestra-ct/onboarding/worker-instructions.md`
2. `kestra-ct/onboarding/page-worker-loop.md`
3. `kestra-ct/onboarding/adapter-layout.md`
4. `kestra-ct/onboarding/web-kt-baseline.md`
5. `kestra-ct/page-registry.yaml`

## Inputs

You need three reference sources open throughout:

| Source | Location | What it tells you |
| --- | --- | --- |
| Page registry | `kestra-ct/page-registry.yaml` | Route, component path, priority, current status |
| Database types | `kestra-ct/generated/database.types.ts` | `kt.*` table columns and types |
| Contract types | `kestra-ct/generated/kestra-contract/types.gen.ts` | Kestra API response shapes |

## Step 1: Pick and Claim

1. Open `kestra-ct/page-registry.yaml`.
2. Find the next unclaimed page by priority (lowest number = highest priority).
3. Confirm `ct_status` is `packet_pending` and your side status is `not_started`.
4. Open `kestra-ct/pages/<page-key>/README.md`. It tells you the current state of the page and what to do.
5. Confirm the page directory already contains stub files (`packet.md`, `capture.md`, `implement.md`, `verify.md`). All 26 pages were pre-seeded with stubs during preparation.
6. Do NOT update the registry yet. You update it at the end.

## Step 2: Read the Source Component

Read the Vue component file listed in the registry's `source_component` field.

Write down (in a scratch note, not in the final document yet):

- What store(s) does the component import?
- What store method does it call on `created()` or `onMounted()`?
- What watchers trigger additional API calls after the first load?
- Does it redirect on mount (e.g., default tab)?
- What computed properties gate rendering (e.g., `ready`)?
- What child components does it render?

## Step 3: Read the Store

Read the store file identified in Step 2. Find the method the component calls on load.

Write down:

- The HTTP method (GET, POST, PUT, DELETE).
- The URL pattern. It will look like `` `${apiUrl()}/some/path` ``.
- What query parameters are passed.
- What the store does with the response (which ref it sets, what fields it reads).

`apiUrl()` resolves to `${baseUrl}/api/v1/main`. So the preserved frontend contract path is `/api/v1/main/...`.

## Step 4: Read the Route Definition

Open `web-kt/src/routes/routes.js`. Find the route entry matching the page's `source_route_name`.

Confirm:

- The route name matches the registry.
- The route path matches the registry.
- The component import matches the registry.

If anything differs from the registry, stop and reconcile.

## Step 5: Trace Sub-Component Endpoints

For each child component the main component renders (tabs, panels, embedded views):

1. Read the child component file.
2. Identify what store methods it calls.
3. Trace those store methods to their HTTP calls.
4. Record the endpoint method, path, and query parameters.

Organize findings into two categories:

- **On-load endpoints**: Called automatically when the page loads (before user interaction).
- **User-activated endpoints**: Called only when the user clicks a tab, button, or filter.

## Step 6: Check the OpenAPI Spec

Open `openapi.yml` (repo root). Search for each endpoint path identified in Steps 3 and 5.

For each endpoint, record:

- Path parameters and their types.
- Query parameters, their types, and defaults.
- Request body content type and schema (if POST/PUT).
- Response schema name (e.g., `FlowWithSource`, `PagedResults_Flow_`).
- The key fields of the response schema, following `$ref` links to resolve nested types.

If an endpoint is not in the OpenAPI spec, record that as a risk.

## Step 7: Check the Database Types

Open `kestra-ct/generated/database.types.ts`. Find the `kt.*` table(s) that back the endpoint.

For each candidate table, record:

- Table name.
- All columns with their TypeScript types.
- Which columns map to which response fields.

The `value` column is `Json` — it stores the full Kestra object. Individual response fields come from `value.fieldName` unless the column is promoted to a top-level column (like `id`, `namespace`, `revision`).

## Step 8: Write packet.md

Overwrite the existing stub at `kestra-ct/pages/<page-key>/packet.md`. The stub was seeded from the template at `kestra-ct/onboarding/templates/packet.md` and already has partial frontmatter (page_key, title, route info). You are replacing it with a completed version.

Fill in:

- **Frontmatter**: All YAML fields. Set `status: ready_for_capture`.
- **Purpose**: One paragraph. What must this page do in the first compatibility slice? Scope it to read-only rendering unless the page is inherently write-only.
- **Trace Targets**: Route, component, store method, primary endpoint, candidate tables. Copy from your notes.
- **Success Criteria**: 4-6 checkboxes. What proves the page works? Always include: page loads, endpoint returns correct shape, data renders.
- **Stop Conditions**: What would block this page? Always include: missing contract detail, missing bootstrap dependency, request shape mismatch.
- **Notes**: Scope boundaries. What is explicitly out of scope for the first slice?

Rules for the packet:

- First slice is always read-only unless the page has no read path.
- Write operations (save, delete, create) are follow-on, not primary scope.
- Secondary endpoints used by tabs or panels are documented as blockers/dependencies, not primary scope.
- Keep `files_in_scope` to files you actually read. Keep `files_out_of_scope` to sibling pages you are NOT touching.

## Step 9: Write capture.md

Overwrite the existing stub at `kestra-ct/pages/<page-key>/capture.md`. The stub was seeded from the template at `kestra-ct/onboarding/templates/capture.md` and already has partial frontmatter. You are replacing it with a completed version.

Fill in:

- **Frontmatter**: Set all `_traced` flags to true. Set `status: complete`.
- **Observed Facts**: Bullet list of what you actually saw in the code. Every bullet must be traceable to a specific file and line. No guesses, no intentions, no fixes.
- **Request Shape**: For the primary endpoint. Method, path, path params, query params, body.
- **Response Shape**: For the primary endpoint. Top-level structure, key fields with types. If paginated, note the envelope (`results`, `total`). If single object, note the schema name.
- **Secondary Endpoints** (optional section, add if the page calls multiple endpoints on load): Repeat request/response shapes for each on-load secondary endpoint.
- **Mapping Notes**: Table with columns: UI element, Response field, Source column or JSON path, Notes. One row per visible UI element that reads from the API response. Trace the data from screen → response → database.
- **Risks**: Bullet list of anything that could block implementation. Always include the compatibility gateway status. Include any endpoint not in the OpenAPI spec. Include any dependency on endpoints outside the page's primary domain.

Rules for the capture:

- Observed facts only. If you cannot determine something from code, say "could not determine" — do not guess.
- Record the actual code paths, not what the documentation says they should be.
- If a component calls an endpoint you did not expect, record it.
- If a response field does not have an obvious `kt.*` column mapping, say so in the Notes column.

## Step 10: Confirm Stub Files

All page directories were pre-seeded with stub versions of `packet.md`, `capture.md`, `implement.md`, and `verify.md`. The stubs already contain partial frontmatter (page_key, title, route info) and empty section bodies from the templates.

During investigation, you overwrite `packet.md` and `capture.md` with your completed versions. Leave `implement.md` and `verify.md` as their existing stubs — do not modify them during investigation.

Confirm both stubs still exist after writing the packet and capture:

```bash
ls kestra-ct/pages/<page-key>/implement.md kestra-ct/pages/<page-key>/verify.md
```

The existing stubs use these frontmatter conventions (do not change them):

- `implement.md`: `doc_type: kestra_page_implementation`, fields include `target_function`, `target_query_module`, `target_mapper_module`
- `verify.md`: `doc_type: kestra_page_verification`, fields include `verified_endpoint`, `verified_payload_shape`, `verified_page_render`

## Step 11: Update the Registry

Open `kestra-ct/page-registry.yaml`. Update the page entry:

- Set `ct_status: packet_seeded`.
- Set your side status to `capturing` (e.g., `ubuntu_status: capturing`).
- Add fields: `upstream_method`, `upstream_path`.
- Add fields: `packet`, `capture`, `implement`, `verify` with full paths to each artifact.

Do not touch other pages' entries.

## Step 12: Verify Deliverables

Before claiming the investigation is complete, verify:

- [ ] Page directory exists at `kestra-ct/pages/<page-key>/`
- [ ] `README.md` updated to reflect that investigation is complete
- [ ] `packet.md` overwritten with all required sections filled (not still a stub)
- [ ] `capture.md` overwritten with all required sections filled (not still a stub)
- [ ] `implement.md` still exists as a pre-seeded stub (untouched)
- [ ] `verify.md` still exists as a pre-seeded stub (untouched)
- [ ] `page-registry.yaml` entry updated with correct statuses and artifact paths
- [ ] packet `files_in_scope` lists only files you actually read
- [ ] capture mapping table has at least one row per visible UI element
- [ ] capture risks section mentions the compatibility gateway status

Run `ls -la kestra-ct/pages/<page-key>/` and confirm all five files are present (README.md, packet.md, capture.md, implement.md, verify.md).

## What NOT To Do

- Do not write runtime code during investigation.
- Do not modify any file in `web-kt/` or `supabase/functions/`.
- Do not invent endpoints that are not in the code.
- Do not guess response shapes — trace them from store → OpenAPI spec → contract types.
- Do not combine multiple pages into one investigation. One page at a time.
- Do not update `ct_status` beyond `packet_seeded`. That status means "investigation done, ready for implementation."
- Do not skip the sub-component trace (Step 5). Pages that look simple often have tabs or embedded views that call additional endpoints.

## Reference Examples

Completed investigations you can use as format references:

- `kestra-ct/pages/flows-list/` — golden path page (list with pagination)
- `kestra-ct/pages/flows-update/` — detail page with tabbed sub-views

Read both before your first investigation to calibrate the expected depth and format.

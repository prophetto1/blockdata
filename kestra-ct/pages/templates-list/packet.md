---
doc_type: kestra_page_packet
page_key: "templates_list"
title: "Templates list"
status: ready_for_capture
priority: 6
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "templates/list"
source_route_path: "/:tenant?/templates"
source_component: "/home/jon/blockdata/web-kt/src/components/templates/Templates.vue"
source_store_file: "/home/jon/blockdata/web-kt/src/stores/template.ts"
source_store_method: "findTemplates"
upstream_method: "GET"
upstream_path: "/api/v1/main/templates/search"
candidate_tables:
  - "kt.templates"
files_in_scope:
  - "/home/jon/blockdata/web-kt/src/routes/routes.js"
  - "/home/jon/blockdata/web-kt/src/components/templates/Templates.vue"
  - "/home/jon/blockdata/web-kt/src/stores/template.ts"
  - "/home/jon/blockdata/kestra-ct/generated/database.types.ts"
  - "/home/jon/blockdata/kestra-ct/onboarding/adapter-layout.md"
files_out_of_scope:
  - "/home/jon/blockdata/web-kt/src/components/templates/TemplateEdit.vue"
  - "/home/jon/blockdata/web-kt/src/components/templates/TemplateCreate.vue"
  - "/home/jon/blockdata/web-kt/src/components/templates/TemplatesDeprecated.vue"
depends_on:
  - "HTTP compatibility proxy preserves GET /api/v1/main/templates/search"
  - "web-kt bootstrap endpoints remain available: /api/v1/configs and /api/v1/basicAuthValidationErrors"
  - "CT-generated DB types are available for promotion after the preparation gate"
blockers:
  - "Templates endpoints are NOT in the OpenAPI spec (openapi.yml) — the tag exists but no paths or schemas are defined. Response shape must be inferred from store code and component usage."
  - "No generated contract types exist for Template in kestra-ct/generated/kestra-contract/types.gen.ts."
  - "Bulk operations (export by IDs/query, delete by IDs/query, import) are secondary write operations outside first-slice scope."
updated_at: 2026-03-09
---

## Purpose

Make the copied Kestra templates list page work as a read-only compatibility slice without redesigning the UI or broadening into template creation, editing, deletion, import, or export.

## Trace Targets

- Route: `templates/list` at `/:tenant?/templates`
- Component: `web-kt/src/components/templates/Templates.vue`
- Store: `useTemplateStore().findTemplates()` in `web-kt/src/stores/template.ts`
- Upstream endpoint: `GET /api/v1/main/templates/search`
- Candidate tables: `kt.templates`

## Success Criteria

- [ ] Page loads through the preserved Kestra route shape
- [ ] `GET /api/v1/main/templates/search` returns a paginated list payload with `results` and `total`
- [ ] Template rows render in `SelectTable` with id (linked), description tooltip, and namespace columns
- [ ] Search works (q param)
- [ ] Sort by id and namespace works
- [ ] Pagination works (page, size query params)
- [ ] Namespace select filter works

## Stop Conditions

- Missing contract detail for `templates/search` (no OpenAPI spec exists — risk already identified)
- Missing bootstrap dependency in the shared UI shell
- Request shape differs from the preserved packet contract
- The `value` JSON column structure for `description` field cannot be confirmed

## Notes

- Golden path scope is read-only templates list behavior first.
- Create, edit, delete, import, export, and bulk actions stay out of scope for the first slice.
- The `Templates.vue` component uses Options API (mixins: RouteContext, RestoreUrl, DataTableActions, SelectTableActions) unlike the Composition API used in newer pages like `LogsWrapper.vue`.
- The store's `findTemplates` method has a quirk: `sort` is extracted from options and appended directly to the URL path as a query string (`?sort=id:asc`), while remaining params are passed via axios `params`.
- Templates are NOT in the OpenAPI spec. The `Templates` tag is defined but no endpoints or schemas are present. This means no generated contract types exist — the adapter must define types based on observed store and component behavior.
- Permission checks use `permission.FLOW` (not a template-specific permission), suggesting templates share auth with flows.

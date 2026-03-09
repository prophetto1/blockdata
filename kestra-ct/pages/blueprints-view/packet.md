---
doc_type: kestra_page_packet
page_key: "blueprints_view"
title: "Blueprints view"
status: draft
priority: 9
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "blueprints/view"
source_route_path: "/:tenant?/blueprints/:kind/:tab/:blueprintId"
source_component: "/home/jon/blockdata/web-kt/src/override/components/flows/blueprints/BlueprintDetail.vue"
source_store_file: ""
source_store_method: ""
upstream_method: ""
upstream_path: ""
candidate_tables: []
files_in_scope: []
files_out_of_scope: []
depends_on: []
blockers: []
updated_at: 2026-03-09
---

## Purpose

One short paragraph describing what this page must do.

## Trace Targets

- Route: `blueprints/view` at `/:tenant?/blueprints/:kind/:tab/:blueprintId`
- Component: `/home/jon/blockdata/web-kt/src/override/components/flows/blueprints/BlueprintDetail.vue`
- Store:
- Upstream endpoint:
- Candidate tables:

## Success Criteria

- [ ] Page loads
- [ ] Data renders
- [ ] Contract shape matches Kestra

## Stop Conditions

- Missing contract detail
- Missing auth/bootstrap dependency
- Request shape differs from packet

## Notes

Short factual notes only.


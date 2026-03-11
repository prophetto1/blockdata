---
doc_type: kestra_page_packet
page_key: "docs_view"
title: "Docs view"
status: draft
priority: 10
owner: ""
contract_mode: exact_kestra_compatibility
source_route_name: "docs/view"
source_route_path: "/:tenant?/docs/:path(.*)?"
source_component: "/home/jon/blockdata/web-kt/src/components/docs/Docs.vue"
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

- Route: `docs/view` at `/:tenant?/docs/:path(.*)?`
- Component: `/home/jon/blockdata/web-kt/src/components/docs/Docs.vue`
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


# Database Refactor Tracker

Date: 2026-03-03  
Mode: one table at a time, with compatibility view + verification gates

## Proposed Rename Map

### Platform Registry
| Old | New |
|---|---|
| service_registry | registry_services |
| service_functions | registry_service_functions |
| service_type_catalog | registry_service_types |
| agent_catalog | registry_agents |
| block_type_catalog | registry_block_types |
| parsing_tool_catalog | registry_parsing_tools |
| representation_type_catalog | registry_representation_types |
| source_type_catalog | registry_source_types |
| docling_label_catalog | registry_docling_labels |
| docling_group_label_catalog | registry_docling_group_labels |
| kestra_provider_enrichment | registry_external_providers_kestra |
| integration_catalog_items | kestra_plugin_items |

### Status Enums
| Old | New |
|---|---|
| document_status_catalog | status_document_uploads |
| conv_status_catalog | status_conversions |
| run_status_catalog | status_runs |
| overlay_status_catalog | status_overlays |

### User-Scoped
| Old | New |
|---|---|
| service_runs | user_service_runs |
| project_service_config | user_project_service_config |

### View Renames
| Old | New |
|---|---|
| documents_view | view_documents |
| service_functions_view | view_service_functions |
| kestra_wiring_view | view_integrations_map |

## Notes
- Keep Kestra satellite tables unchanged for now:
  - `kestra_plugin_inputs`
  - `kestra_plugin_outputs`
  - `kestra_plugin_examples`
  - `kestra_plugin_definitions`
- Drop `_v2` pass-through views only after reference scan confirms zero usage.
- If `kestra_plugin_items` becomes source-header only, split mapping writes to a dedicated mapping table before dropping mapping columns.

## Step Gate (must pass before table N+1)
1. Rename one table.
2. Create compatibility view with old table name.
3. Update imports/queries/realtime subscriptions.
4. Verify no runtime references to old table name.
5. Verify row count and FK health.
6. Drop compatibility view.


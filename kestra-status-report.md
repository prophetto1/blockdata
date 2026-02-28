# Kestra Integration Status Report

Date: 2026-02-28
Repo: e:/writing-system

## Merged to master
- 2026-02-27: unified registry migrations landed (`service_registry`, `service_functions`, seeded catalog) via commits `9353682`, `c023b92`.
- 2026-02-28: realtime publication for service tables landed via `6bab447`.
- 2026-02-28: Kestra catalog table + sync surface landed via `4501a3d` (`integration_catalog_items`, admin edge function, settings panel).

## Implemented now
- Kestra plugin catalog sync (`POST target=sync_kestra`).
- Per-plugin schema/markdown hydrate (`POST target=hydrate_detail`).
- Manual mapping to local service/function IDs (`PATCH target=item`).
- Superuser settings UI for Integration Catalog is live.
- Service registry CRUD backend is live.

## Local-only (not merged yet)
- `ServicesPanel` extraction and wiring in admin settings.
- Superuser probe hook (`useSuperuserProbe`) replacing hardcoded email checks.
- `admin-services` local diff adding full `parameter_schema` / `result_schema` read-write handling.

## Current gaps
- No `provision_function` flow yet from catalog items to executable `service_functions`.
- `hydrate_detail` currently falls back to localhost default when `source_url` is not provided by UI call.
- Mapping integrity validation is incomplete server-side (function/service pairing validation).
- Integration Catalog is in left nav, but not currently included in the Operations subtab group.

## Upstream Kestra endpoint compatibility
- `/api/v1/plugins` exists and is used for catalog sync.
- `/api/v1/plugins/{cls}` exists and is used for detail hydrate.
- `/api/v1/plugins/schemas/{type}` also exists upstream.

## Test coverage snapshot
- `admin-integration-catalog`: GET + PATCH + sync dry-run tests present.
- `admin-services`: GET + PATCH tests present.
- No test run was executed in this reporting pass.

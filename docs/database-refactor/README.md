# Database Refactor Package

This folder is the tracking package for table/view rename execution.

## Files
- `2026-03-03-table-rename-map.yaml` - source-of-truth rename manifest.
- `rename-map-tracker.md` - human-readable map and per-step gate.
- `scripts/generate-table-rename-step-sql.mjs` - generate SQL for one rename step.
- `scripts/scan-table-name-references.mjs` - scan repo for table-name references.
- `scripts/verify-table-rename-step.mjs` - verify DB state for one step.

## Typical Per-Table Sequence
```bash
node docs/database-refactor/scripts/generate-table-rename-step-sql.mjs --old service_registry --new registry_services --out .tmp/rename-step-service_registry.sql
node docs/database-refactor/scripts/scan-table-name-references.mjs --name service_registry --root e:/writing-system
node docs/database-refactor/scripts/verify-table-rename-step.mjs --old service_registry --new registry_services --env .env --allow-no-old-view
```


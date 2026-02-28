# Services & Integration Catalog — Phase 2 Development Plan

## Context

Phase 1 complete: ServicesPanel.tsx extracted from SettingsAdmin.tsx (1293 lines, zero-prop, self-contained). IntegrationCatalogPanel.tsx was already extracted. Both admin pages are functional for CRUD operations.

This plan addresses the gap between "admin CRUD works" and "services are queryable, testable, and provisionable from the UI."

---

## Corrections to Prior Analysis

The initial accuracy assessment contained errors that must be acknowledged before planning:

1. **Realtime IS configured.** Migration 056 adds `service_registry` and `service_functions` to `supabase_realtime` publication. Migration 059 adds `integration_catalog_items`. ServicesPanel.tsx subscribes to both tables via `supabase.channel('admin-services-registry')`. The original analysis document was correct; the accuracy assessment was wrong on this point.

2. **function_type CHECK is already fixed.** Migration 054 already added `ingest` and `callback` to the CHECK constraint. The plan to "fix" it in Migration 060 was redundant.

3. **parameter_schema has real data.** The dlt and dbt seed functions (migration 050) have full parameter arrays with name, type, required, default, description, and values fields. The "nothing reads it" framing is misleading — the data exists and is meaningful, the GET handler just doesn't return it.

4. **Edge function seed data uses empty arrays.** Migration 054 seeds edge functions (ingest, conversion-complete, worker, user-api-keys) with `'[]'::jsonb` for parameter_schema. So there's a split: dlt/dbt functions have rich param schemas, edge functions have empty ones.

---

## Verified Baseline (what actually exists today)

### Database
| Artifact | Status |
|----------|--------|
| `service_registry` table | 3 services seeded (dlt, dbt, docling) |
| `service_functions` table | 12 functions seeded with parameter_schema |
| `service_type_catalog` | 6 types: dlt, dbt, docling, edge, conversion, custom |
| `function_type` CHECK | 12 values (050 original 10 + 054 added ingest, callback) |
| `service_functions_view` | Joins all 3 tables, includes parameter_schema + result_schema |
| `service_runs` table | EXISTS, zero rows, no code creates runs |
| `service_run_events` + `service_run_artifacts` | EXIST (migration 051), empty |
| `integration_catalog_items` table | EXISTS (migration 059) |
| Realtime publication | service_registry, service_functions, integration_catalog_items all registered |

### admin-services Edge Function
| Capability | Status |
|------------|--------|
| GET: returns services + functions + types | YES, but **omits** parameter_schema, result_schema |
| POST target=service | YES |
| POST target=function | YES, but **omits** parameter_schema |
| POST target=import_registry | YES, with type inference |
| PATCH target=service | YES (enabled, base_url, service_name, service_type, health_status, config) |
| PATCH target=function | YES (enabled, entrypoint, function_name, function_type, http_method, label, description, tags) — **omits** parameter_schema |
| DELETE | YES (services and functions) |
| health_check target | DOES NOT EXIST |
| test_run target | DOES NOT EXIST |

### admin-integration-catalog Edge Function
| Capability | Status |
|------------|--------|
| GET: returns items + services + functions | YES |
| POST target=sync_kestra | YES |
| POST target=hydrate_detail | YES |
| PATCH target=item | YES (enabled, suggested_service_type, mapping_notes, mapped_service_id, mapped_function_id) |
| provision_function target | DOES NOT EXIST |

### Frontend
| Component | Status |
|-----------|--------|
| ServicesPanel.tsx | Full CRUD, config dialog, realtime subscription, import JSON |
| IntegrationCatalogPanel.tsx | Kestra sync, hydrate detail, manual mapping, search |
| parameter_schema display | NOT shown (type doesn't include it, GET doesn't return it) |
| Search/filter in ServicesPanel | DOES NOT EXIST |
| Health check UI | DOES NOT EXIST |
| Test run UI | DOES NOT EXIST |
| Provision button | DOES NOT EXIST |

---

## What's Actually Needed vs. What's Premature

### Needed now
These improvements have immediate value for the admin workflow:

1. **Expose parameter_schema in admin-services GET** — the data exists and is meaningful. Admin users should see what parameters each function accepts.
2. **Accept parameter_schema in POST/PATCH** — admin users should be able to define and edit function parameters, especially when manually registering new services.
3. **Show parameter_schema in ServicesPanel** — compact inline table per function.
4. **Search/filter in ServicesPanel** — with 12+ functions across 3+ services, filtering is already useful.
5. **Better schema preview in IntegrationCatalogPanel** — render task_schema properties, not just key count.

### Premature (defer until pipeline service exists)
These features depend on external services that don't exist yet:

6. **health_check target** — probes `base_url/health`, but the dlt/dbt/docling services aren't running anywhere. The seed base_urls are placeholders. Health-checking a non-existent service returns "offline" every time. Useful only after the FastAPI pipeline service is deployed on the Ubuntu box.
7. **test_run target** — proxies calls to `base_url + entrypoint`. Same problem — no running services to test against. Useful only after the FastAPI pipeline service is deployed.
8. **service_runs recording** — depends on test_run or real execution. No point creating run rows with no actual execution.
9. **provision_function** — creates service_functions rows from Kestra catalog items. But provisioned functions would point to what base_url? The Kestra instance isn't running persistently either. Useful only after Kestra or pipeline service integration is live.
10. **documentation_md column** — no documentation written for any function. Adding the column is trivial but there's no content to display. Defer until functions are documented.
11. **New service_type_catalog values** (api, ai, storage, messaging) — YAGNI until services of those types are actually being registered.

---

## Implementation Plan

### Step 1: Backend — Expose parameter_schema (admin-services)

**File: `supabase/functions/admin-services/index.ts`**

GET handler — add parameter_schema and result_schema to the service_functions SELECT:
```
Current:  "function_id,service_id,function_name,function_type,label,description,entrypoint,http_method,enabled,tags,created_at,updated_at"
Updated:  "function_id,service_id,function_name,function_type,label,description,entrypoint,http_method,parameter_schema,result_schema,enabled,tags,created_at,updated_at"
```

POST target=function — accept optional `parameter_schema`:
- Validate: must be array, each element must have `name` (string) and `type` (string)
- Default: `[]` (matches DB default)

PATCH target=function — accept optional `parameter_schema`:
- Same validation as POST
- Add to update object if present

No migration needed. No new columns. Just wiring existing data through the API.

### Step 2: Frontend — ServicesPanel parameter_schema display + search

**File: `web/src/pages/settings/ServicesPanel.tsx`**

1. Add `parameter_schema` to `ServiceFunctionRow` type:
   ```typescript
   parameter_schema: Array<{
     name: string;
     type: string;
     required?: boolean;
     default?: unknown;
     description?: string;
     values?: string[];
   }>;
   ```

2. Add `result_schema` to type (nullable JSONB, display key count only).

3. Render parameter_schema as a compact row below each function in the table — show name, type, required badge, default value. Collapsible if >3 params.

4. Add search input at top — filter `serviceRows` and `serviceFunctions` by matching against name, type, tags, description.

5. Add service_type filter chips — one per distinct `service_type` in `serviceTypes`, plus "All". Click to filter.

### Step 3: Frontend — IntegrationCatalogPanel schema preview

**File: `web/src/pages/settings/IntegrationCatalogPanel.tsx`**

1. Replace `countSchemaKeys(row.task_schema)` with an expandable property table:
   - Show first 3 properties inline (name + type)
   - Expandable to show all properties with descriptions
   - If task_schema has `properties` key (JSON Schema format), render from that
   - Otherwise show raw key count as fallback

2. Add provision status badge per item:
   - `mapped_function_id` set → "Mapped" (green)
   - `mapped_service_id` set but not function → "Partially mapped" (yellow)
   - Neither set → "Unmapped" (gray)

### Step 4: Make parameter_schema editable

**File: `web/src/pages/settings/ServicesPanel.tsx`**

1. Add "Edit Params" button per function → opens dialog with Monaco JSON editor
2. Pre-populate with current `parameter_schema` array
3. Validate on save: must be array of `{name, type, ...}` objects
4. Save via PATCH target=function with `parameter_schema` field (enabled in Step 1)

---

## Deferred Items (tracked, not forgotten)

| Item | Trigger to implement |
|------|---------------------|
| health_check endpoint + UI | FastAPI pipeline service deployed on Ubuntu box |
| test_run endpoint + UI | FastAPI pipeline service deployed on Ubuntu box |
| service_runs recording | First real execution path exists |
| provision_function endpoint | Kestra or pipeline integration goes live |
| documentation_md column | First function documentation is written |
| New service_type_catalog values | First service of new type is registered |
| parameter_json_schema column | A consumer needs full JSON Schema (not array format) |

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/admin-services/index.ts` | GET adds parameter_schema/result_schema to SELECT; POST/PATCH target=function accepts parameter_schema |
| `web/src/pages/settings/ServicesPanel.tsx` | Add parameter_schema to type + display; add search bar; add service_type filter; add edit params dialog |
| `web/src/pages/settings/IntegrationCatalogPanel.tsx` | Better schema preview; provision status badges |

No new migrations. No new files. No new edge functions.

---

## Verification

1. `GET /admin-services` returns `parameter_schema` array for each function (verify dlt functions have 5-6 params, edge functions have empty arrays)
2. `PATCH /admin-services` with `target=function` + `parameter_schema=[{name:"test",type:"string"}]` succeeds
3. ServicesPanel shows parameter table below each function with params
4. Search in ServicesPanel filters by name, returns matching services/functions
5. Service type chips filter correctly
6. IntegrationCatalogPanel shows property names instead of key count
7. Edit Params dialog opens, saves, and round-trips correctly
8. `npm run build` passes clean

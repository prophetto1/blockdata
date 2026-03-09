# Kestra Integration Baseline Readiness

## Purpose

Capture the exact starting state before further preparation work so later workers do not rely on stale chat context.

## Snapshot Date

- Date: `2026-03-09`

## Root Artifacts Confirmed

- `web-kt` exists.
- `openapi.yml` exists at the repo root.
- `kestra.plugins` exists.
- Live Supabase has the `kt` schema with the 21-table Kestra surface.

## Repo Drift Confirmed

- Live migration history includes `20260309030831 add_kt_kestra_schema`.
- The local migration tree still ends at `20260308150000_072_registry_superuser_profiles.sql`.
- Repo-to-live parity is not restored yet.

## `web-kt` Bootability Signals

- `web-kt/node_modules` is present.
- Generated client files are present under `web-kt/src/generated/kestra-api`.
- `web-kt/package.json` still defines:
  - `npm run dev`
  - `npm run generate:openapi`
  - `npm run test:unit`
- `openapi-ts.config.ts` still points to `../openapi.yml` and outputs to `src/generated/kestra-api`.

## Current Runtime Assumptions

- `web-kt` builds its primary API base as `/api/v1/main`.
- `web-kt` also uses non-tenant calls under `/api/v1`.
- The copied Vite config still proxies `^/api` to `http://localhost:8080`.
- The flow store still expects `GET /api/v1/main/flows/search`.
- The main app still bootstraps auth and config through `miscStore.loadConfigs()` and `miscStore.loadBasicAuthValidationErrors()` before routing proceeds.

## Unresolved Baseline Risks

### Auth and config bootstrap

- `web-kt/src/main.js` assumes a working config/auth bootstrap path before most routes can load.
- A Kestra-compatible page adapter is not enough by itself if the config/bootstrap surface is still missing.

### HTTP compatibility dependency

- The frontend contract expects `/api/v1/main/...`.
- Supabase functions currently live under `/functions/v1/...`.
- The concrete proxy or rewrite implementation is still deferred.

### Upstream route, store, and plugin assumptions

- Route structure remains the full Kestra UI route table, not a reduced local shell.
- Store methods assume exact Kestra response shapes.
- Plugin and non-page support endpoints still exist as implicit dependencies outside the first `Flows list` slice.

### Local migration drift

- Live `kt` is ahead of the repo migration tree.
- Generated references can support preparation, but they cannot be treated as canonical repo state until migration parity is restored.

## Inspection Commands And Results

### Shell checks

```bash
test -d web-kt && echo web-kt:present || echo web-kt:missing
test -f openapi.yml && echo openapi:present || echo openapi:missing
test -d kestra.plugins && echo kestra.plugins:present || echo kestra.plugins:missing
test -d web-kt/node_modules && echo node_modules:present || echo node_modules:missing
find web-kt/src/generated/kestra-api -maxdepth 2 -type f | sort | sed -n '1,40p'
ls supabase/migrations | tail -n 5
```

Observed results:

- `web-kt:present`
- `openapi:present`
- `kestra.plugins:present`
- `node_modules:present`
- Generated Kestra SDK files are present, including `sdk/ks-Flows.gen.ts`, `sdk/ks-Executions.gen.ts`, `sdk/ks-Logs.gen.ts`, and `sdk/ks-Plugins.gen.ts`
- Local migration tail ends at:
  - `20260303140000_068_kestra_plugin_satellite_seed.sql`
  - `20260305120000_069_flow_sources_revision_history.sql`
  - `20260305120100_070_flow_executions.sql`
  - `20260305120200_071_flow_logs.sql`
  - `20260308150000_072_registry_superuser_profiles.sql`

### Code-trace checks

Relevant files inspected:

- `web-kt/package.json`
- `web-kt/openapi-ts.config.ts`
- `web-kt/src/override/utils/route.ts`
- `web-kt/src/routes/routes.js`
- `web-kt/src/stores/flow.ts`
- `web-kt/vite.config.js`
- `web-kt/src/main.js`

Confirmed facts:

- `generate:openapi` remains configured.
- API base remains `/api/v1/main`.
- Flows list route remains `/:tenant?/flows`.
- Flows list store call remains `GET /api/v1/main/flows/search`.
- Dev proxy still targets `http://localhost:8080`.

### Supabase MCP checks

Observed results:

- Live `kt` table list includes:
  `kt.flows`, `kt.executions`, `kt.logs`, `kt.triggers`, `kt.templates`, `kt.metrics`, `kt.queues`, and the rest of the 21-table Kestra surface.
- Live migration history includes:
  `20260309030831 add_kt_kestra_schema`

## Readiness Conclusion

The preparation effort is still aligned. The repo has the expected `web-kt` and contract artifacts, and live Supabase has the expected `kt` schema. The current blockers are still the same:

1. migration parity is not restored
2. the HTTP compatibility path is chosen in principle but not yet concretely implemented
3. worker templates and later generated reference artifacts still need to be created before any page worker can start


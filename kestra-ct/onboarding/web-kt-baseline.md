# web-kt Runtime Baseline

## Purpose

This document records the current `web-kt` runtime assumptions before page workers start changing the copied Kestra UI.

## Baseline Commands

### Boot command

```bash
cd /home/jon/blockdata/web-kt
npm run dev
```

### Generated client command

```bash
cd /home/jon/blockdata/web-kt
npm run generate:openapi
```

## Fresh Command Results

### `npm run generate:openapi`

- Exit status: `0`
- Observed result: `@hey-api/openapi-ts` regenerated `src/generated/kestra-api`

### `npm run dev`

- First sandboxed attempt: failed with `Error: spawnSync /bin/sh EPERM`
- Cause: Vite config loads the local `commit()` plugin, which spawns a shell during startup
- Escalated rerun: reached ready state and served the app
- Observed local URL: `http://localhost:5174/`
- Observed note: port `5173` was already in use during this run

## Route And Boot Locations

- app entrypoint: `/home/jon/blockdata/web-kt/src/main.js`
- shared app init: `/home/jon/blockdata/web-kt/src/utils/init.js`
- route table: `/home/jon/blockdata/web-kt/src/routes/routes.js`
- tenant router hook: `/home/jon/blockdata/web-kt/src/composables/useTenant.ts`
- API route helpers: `/home/jon/blockdata/web-kt/src/override/utils/route.ts`

## Store Locations Most Relevant To First Slices

- flows store: `/home/jon/blockdata/web-kt/src/stores/flow.ts`
- executions store: `/home/jon/blockdata/web-kt/src/stores/executions.ts`
- plugins store: `/home/jon/blockdata/web-kt/src/stores/plugins.ts`
- misc config store: `/home/jon/blockdata/web-kt/src/override/stores/misc.ts`
- auth store shim: `/home/jon/blockdata/web-kt/src/override/stores/auth.ts`

## Runtime Assumptions

### Router and history

- In dev mode, router history is mounted under `/ui`
- Tenant injection defaults named routes to `main`
- The first page route for the flows list resolves to `/:tenant?/flows`, which effectively becomes `/ui/main/flows` in dev

### API base behavior

- `apiUrl()` resolves to `${baseUrl}/api/v1/main`
- `apiUrlWithoutTenants()` resolves to `${baseUrl}/api/v1`
- `baseUrl` comes from `import.meta.env.VITE_APP_API_URL` plus `window.KESTRA_BASE_PATH`, or falls back to `window.location.origin`

### Dev proxy behavior

- Vite proxies `^/api` to `http://localhost:8080`
- `web-kt` dev mode therefore assumes a backend or compatibility layer is reachable on port `8080`

### Window globals

- `window.KESTRA_UI_PATH`
- `window.KESTRA_BASE_PATH`
- `window.KESTRA_GOOGLE_ANALYTICS`

These are initialized in `index.html` for local dev.

## Global Assumptions That Can Block Page Work

### Auth and config

- `src/main.js` loads `miscStore.loadConfigs()` before most non-anonymous routes
- it also calls `loadBasicAuthValidationErrors()` when basic auth is not initialized
- page work can appear broken if `/api/v1/configs` or `/api/v1/basicAuthValidationErrors` is missing

### Plugins and schemas

- the UI loads plugin icons and plugin schemas from `/api/v1/plugins/...`
- YAML editing also depends on `/api/v1/plugins/schemas/...`
- a flows page is not fully healthy if these endpoints are absent

### Axios and auth refresh

- axios refresh logic expects `/oauth/access_token`
- route and session behavior can diverge if that path is absent but auth flows are exercised

## Minimal Evidence Required To Call A Page Wired

For the first `Flows list` slice, the minimum proof is:

- `web-kt` dev server starts
- route `/ui/main/flows` renders without boot-time redirect failure
- the page issues `GET /api/v1/main/flows/search`
- the compatibility layer returns data with the expected Kestra shape
- the list renders rows
- search works
- sort or pagination works if the page exposes them

## Immediate Implication For Page Workers

`Flows list` work is not just a `flows/search` endpoint task. The runtime baseline also depends on:

- `/api/v1/configs`
- `/api/v1/basicAuthValidationErrors`
- `/api/v1/plugins/...` for editor and plugin-driven UI surfaces
- the preserved `/api/v1/main/...` compatibility boundary

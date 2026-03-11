# Kestra Adapter Layout

## Purpose

This document freezes the runtime adapter layout before page work starts. It keeps handler, query, mapper, and test placement explicit so workers do not scatter compatibility logic across the repo.

## Chosen Runtime Layout

The runtime layout will follow the existing Supabase pattern in this repo:

- one edge function directory per public adapter domain under `supabase/functions/`
- shared adapter code under `supabase/functions/_shared/`
- contract types and DB types promoted from CT only after the preparation gate is approved

Planned layout:

```text
supabase/functions/
  kestra-flows/
    config.toml
    index.ts
    index.test.ts
  kestra-executions/
    config.toml
    index.ts
    index.test.ts
  kestra-logs/
    config.toml
    index.ts
    index.test.ts
  _shared/
    database.types.ts
    kestra-contract/
      index.ts
      types.gen.ts
    kestra-adapter/
      http/
        errors.ts
        query.ts
        response.ts
      queries/
        flows.ts
        executions.ts
        logs.ts
      mappers/
        flows.ts
        executions.ts
        logs.ts
      filters/
        flows.ts
        executions.ts
        logs.ts
```

## Boundary Rule

DB types and OpenAPI contract types meet only in mapper modules.

- Query modules read `kt.*` with DB row types.
- Mapper modules convert typed `kt.*` rows into typed Kestra DTOs.
- Handler entrypoints parse HTTP input, call queries, call mappers, and return HTTP responses.
- Handlers must not inline query logic or large response-shape construction.

## Handler Layout

Each adapter function entrypoint owns one Kestra API domain.

- `kestra-flows/index.ts`: flow list, flow detail, flow source, flow validation, and later flow mutation endpoints
- `kestra-executions/index.ts`: execution list, execution detail, state changes, replay, and follow endpoints
- `kestra-logs/index.ts`: log search and execution-log endpoints

Each entrypoint may dispatch by route and method inside the function, but it stays within one domain boundary.

## Shared Query Modules

Shared query modules live under `supabase/functions/_shared/kestra-adapter/queries/`.

Rules:

- one file per domain
- no HTTP parsing
- no Kestra DTO formatting
- accept normalized filter input
- return typed `KtRow<...>` values or domain-specific row bundles

Examples:

- `queries/flows.ts`
- `queries/executions.ts`
- `queries/logs.ts`

## Shared Mapper Modules

Shared mapper modules live under `supabase/functions/_shared/kestra-adapter/mappers/`.

Rules:

- one file per domain
- import DB row types from `database.types.ts`
- import Kestra DTO types from `kestra-contract/`
- own all response-shape translation
- normalize naming drift between SQL columns and Kestra fields in one place

Examples:

- `mappers/flows.ts`
- `mappers/executions.ts`
- `mappers/logs.ts`

## Shared Filter Modules

Shared filter modules live under `supabase/functions/_shared/kestra-adapter/filters/`.

These modules normalize HTTP query strings into typed query-input objects before query execution.

Rules:

- parse pagination, sort, namespace, search, and domain-specific filters
- return normalized internal filter objects
- do not touch the database
- do not shape final API payloads

## Shared HTTP Modules

Shared HTTP helpers live under `supabase/functions/_shared/kestra-adapter/http/`.

Use them for:

- Kestra-style error payloads
- pagination envelope helpers
- shared request parsing
- response helpers that are adapter-specific, not app-wide

Use existing generic repo utilities from `_shared/` when they already fit. Do not duplicate generic CORS or auth helpers inside `kestra-adapter/`.

## Naming Conventions

Function directories:

- `kestra-<domain>`

Entrypoints:

- `index.ts`

Function tests:

- `index.test.ts`

Shared query files:

- `<domain>.ts`

Shared query tests:

- `<domain>.test.ts`

Shared mapper files:

- `<domain>.ts`

Shared mapper tests:

- `<domain>.test.ts`

Shared filter files:

- `<domain>.ts`

Shared HTTP helpers:

- `<topic>.ts`

## First Endpoint Decision

The first adapter domain function will live at:

- `supabase/functions/kestra-flows/index.ts`

Reason:

- the HTTP compatibility decision already preserves `GET /api/v1/main/flows/search`
- `Flows list` is the first page slice
- the repo already uses one function directory per domain, so `kestra-flows` fits existing structure

## Existing Flow Function Boundary

The repo already contains `supabase/functions/flows/` for the Blockdata flow system.

Rules:

- do not modify `supabase/functions/flows/` as part of Kestra page execution
- do not reuse that function directory for the Kestra adapter
- keep Kestra adapter work in `supabase/functions/kestra-<domain>/`

## First Slice Mapping

The first end-to-end slice will use this path chain:

- frontend contract: `GET /api/v1/main/flows/search`
- compatibility boundary: proxy or rewrite layer
- backend target: `supabase/functions/kestra-flows/index.ts`
- shared query module: `_shared/kestra-adapter/queries/flows.ts`
- shared mapper module: `_shared/kestra-adapter/mappers/flows.ts`

## Out Of Scope For Task 7

- creating runtime directories
- creating runtime files
- implementing proxy configuration
- implementing query or mapper code
- changing `web-kt`

This document is a CT-side design artifact only.

# HTTP Compatibility Surface Decision

## Purpose

Choose the transport shape that lets `web-kt` keep its Kestra-style `/api/v1/main/...` contract while the implementation is backed by Supabase functions.

## Observed Frontend Contract

- `web-kt` builds its main API base as `/api/v1/main`.
- `Flows list` currently calls `GET /api/v1/main/flows/search`.
- `web-kt` also uses non-tenant paths under `/api/v1` for some plugin-related calls.

## Observed Backend Surface

- Existing Supabase edge functions are exposed under `/functions/v1/...`.
- There is no current repo-wide runtime that exposes Kestra-compatible `/api/v1/main/...` paths directly from Supabase.
- `web-kt` dev mode already assumes a proxy layer via Vite.

## Decision

Use a compatibility proxy or rewrite layer that preserves Kestra route shapes and forwards them to domain-specific Supabase functions.

## First Route Mapping

- Incoming route: `GET /api/v1/main/flows/search`
- First backend target: a domain-specific flow adapter function, expected to live at `supabase/functions/kestra-flows/index.ts`
- Compatibility layer responsibility: preserve the Kestra request shape and forward it to the flow adapter without changing the frontend contract

## Why This Strategy

- It keeps `web-kt` unmodified for the first compatibility slices.
- It avoids leaking `/functions/v1/...` paths into the Kestra UI workspace.
- It keeps request-shape translation at one boundary instead of scattering it across stores and components.

## Required Next Action

- Document the concrete dev and production proxy path once the adapter layout is frozen.
- Use the same preserved route shape for the first `Flows list` slice.


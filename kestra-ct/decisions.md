# Kestra CT Decisions

This file records explicit decisions that control the Kestra compatibility effort.

## Decision Log

### 2026-03-09: `kt.*` stays Kestra-native

- `namespace` is first-class in the Kestra compatibility surface.
- `project_id` does not belong in `kt.*` adapter DTOs, page packets, or endpoint semantics.
- Any Blockdata-specific crosswalk must live outside the `kt.*` compatibility layer.

### 2026-03-09: Repo migration parity is required before canonical type generation

- Live Supabase already has the `kt` schema.
- The repo does not yet contain the migration artifact that added it.
- Shared generated types may support preparation work, but broad implementation must wait for migration parity.

### 2026-03-09: Preserve Kestra HTTP paths through a compatibility proxy layer

- `web-kt` keeps its Kestra-style `/api/v1/main/...` contract.
- The compatibility boundary forwards those requests to domain-specific Supabase functions.
- The first route to preserve is `GET /api/v1/main/flows/search`.

### 2026-03-09: Preparation artifacts stay in CT first

- During preparation, new artifacts are staged under `kestra-ct/` only.
- Do not write generated reference types or adapter placeholder files into runtime directories during this phase.
- Promotion into repo runtime paths happens only after the preparation gate is approved.

### 2026-03-09: Task 6 shared types are staged in CT, and DB types are row-first until parity is restored

- The Kestra contract output is generated from root `openapi.yml` into `kestra-ct/generated/kestra-contract/` using `@hey-api/openapi-ts` with the `@hey-api/typescript` plugin only.
- `openapi-ts` rewrites the output directory, so `kestra-ct/generated/kestra-contract/README.md` must be restored or verified after regeneration.
- The later promotion target for those contract types is `supabase/functions/_shared/kestra-contract/`.
- The preferred Supabase generator path did not yield usable `kt` output during Task 6, so `kestra-ct/generated/database.types.ts` is staged from live `kt` schema metadata instead.
- The CT-side DB type file is intentionally row-first, with permissive `Insert` and `Update` shapes, until repo migration parity is restored and runtime promotion is approved.
- The later promotion target for the DB type file is `supabase/functions/_shared/database.types.ts`.

### 2026-03-09: The actual page unit is the page directory, not a mirrored page file

- `kestra-ct/page-registry.yaml` is the master page index and status source.
- The actual per-page work unit is `kestra-ct/pages/<page>/`.
- The canonical page workflow artifacts are `packet.md`, `capture.md`, `implement.md`, and `verify.md`.
- Do not create `page.json` or `page.yaml` as mirrored per-page state files.
- Automation should read `page-registry.yaml` and the four page docs directly.

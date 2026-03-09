---
doc_type: kestra_page_implementation
page_key: "flows_search"
title: "Flows search"
status: planning
target_function: "supabase/functions/kestra-flows/index.ts"
target_filter_module: "supabase/functions/_shared/kestra-adapter/filters/flows.ts"
target_query_module: "supabase/functions/_shared/kestra-adapter/queries/flows.ts"
target_mapper_module: "supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
runtime_targets:
  - "supabase/functions/kestra-flows/index.ts"
  - "supabase/functions/_shared/kestra-adapter/filters/flows.ts"
  - "supabase/functions/_shared/kestra-adapter/queries/flows.ts"
  - "supabase/functions/_shared/kestra-adapter/mappers/flows.ts"
test_targets:
  - "supabase/functions/kestra-flows/index.test.ts"
depends_on:
  - "CT-generated DB types at kestra-ct/generated/database.types.ts"
  - "CT-generated contract types at kestra-ct/generated/kestra-contract/types.gen.ts"
  - "Existing flows_list implementation in the same kestra-flows domain (handler, filter, query, mapper)"
  - "Compatibility gateway availability on localhost:8080 for true end-to-end page verification"
updated_at: 2026-03-09
---

## Intended Changes

- Extend the existing `kestra-flows` handler to dispatch `GET /source` requests alongside the existing `GET /search` route, using a path-based dispatch inside the same edge function.
- Add a `parseFlowSourceSearchParams` function to the filter module that extracts `q`, `namespace`, `page`, `size`, and `sort` from the request URL. The `q` parameter is required — without it, the frontend shows NoData.
- Add a `searchFlowSource` query function that searches `kt.flows.source_code` using `ilike` for matching, and generates fragment strings with `[mark]`/`[/mark]` delimiters around matched terms for frontend highlighting.
- Add a `toSearchResultFlow` mapper function that produces `SearchResultFlow` objects (with `model: Flow` and `fragments: string[]`) and a `toPagedSearchResultFlowsResponse` function that wraps them in `{ results, total }`.
- Add handler test cases for the `/source` route covering: successful search with fragments, empty `q` returning zero results, and auth rejection.

## File Plan

- Runtime files:
  - `supabase/functions/kestra-flows/index.ts` — modified: add `isSourcePath()` check, add `searchFlowSource` dep, dispatch `/source` to source search handler
  - `supabase/functions/_shared/kestra-adapter/filters/flows.ts` — modified: add `FlowSourceSearchParams` type and `parseFlowSourceSearchParams()` function
  - `supabase/functions/_shared/kestra-adapter/queries/flows.ts` — modified: add `FlowSourceSearchResult` type and `searchFlowSource()` function that queries `source_code` column and generates `[mark]`-delimited fragments
  - `supabase/functions/_shared/kestra-adapter/mappers/flows.ts` — modified: add `toSearchResultFlow()` and `toPagedSearchResultFlowsResponse()` using `SearchResultFlow` and `PagedResultsSearchResultFlow` contract types
- Test files:
  - `supabase/functions/kestra-flows/index.test.ts` — modified: add tests for `GET /source` route
- CT files:
  - `kestra-ct/pages/flows-search/implement.md` — this file
  - `kestra-ct/page-registry.yaml` — update `ubuntu_status` to `planning`

## Detailed Design

### Filter: `parseFlowSourceSearchParams(req: Request)`

```typescript
export type FlowSourceSearchParams = {
  q: string | undefined;
  namespace: string | undefined;
  page: number;
  size: number;
  sortField: string;
  sortDirection: "asc" | "desc";
};
```

Extracts from URL search params:
- `q` — search string (nullable; if absent, frontend sets total=0)
- `namespace` — namespace prefix filter (nullable)
- `page` — integer, default 1
- `size` — integer, default 10 (OpenAPI default)
- `sort` — parsed into field:direction, default `id:asc`

### Query: `searchFlowSource(supabase, params)`

```typescript
export type FlowSourceRow = KtFlowRow & {
  fragments: string[];
};

export type FlowSourceSearchResult = {
  rows: FlowSourceRow[];
  total: number;
  error: string | null;
};
```

Query logic:
1. If `q` is undefined/empty, return `{ rows: [], total: 0, error: null }` immediately.
2. Select from `kt.flows` where `deleted = false`.
3. If `namespace` is set, filter with `ilike` prefix match.
4. Filter rows where `source_code ilike %q%`.
5. For each matching row, generate fragments by:
   - Splitting `source_code` by lines
   - Finding lines containing the search term (case-insensitive)
   - Wrapping matched substrings with `[mark]`/`[/mark]`
   - Taking up to 3 surrounding context lines per match
   - Returning fragment strings
6. Apply sort, pagination via `.order()` and `.range()`.
7. Return `{ rows (with fragments), total, error }`.

Note: Fragment generation must happen in the mapper or post-query step since Supabase client doesn't support server-side text highlighting. The query returns raw rows; fragment extraction is done in-memory after fetching.

### Mapper: `toSearchResultFlow(row)` and `toPagedSearchResultFlowsResponse(rows, total)`

```typescript
import type { SearchResultFlow, PagedResultsSearchResultFlow } from "...";

export function toSearchResultFlow(row: FlowSourceRow): SearchResultFlow {
  return {
    model: toFlow(row),         // reuse existing toFlow mapper
    fragments: row.fragments,
  };
}

export function toPagedSearchResultFlowsResponse(
  rows: FlowSourceRow[], total: number
): PagedResultsSearchResultFlow {
  return {
    results: rows.map(toSearchResultFlow),
    total,
  };
}
```

### Handler: dispatch update

Current handler only matches `isSearchPath()`. Update to also match `isSourcePath()`:

```typescript
function isSourcePath(req: Request): boolean {
  const { pathname } = new URL(req.url);
  return pathname.endsWith("/source");
}
```

Dispatch logic:
- If `/search` → existing `searchFlows` path
- If `/source` → new `searchFlowSource` path → `toPagedSearchResultFlowsResponse`
- Otherwise → 400

### Fragment Generation Strategy

The Kestra backend produces `[mark]`/`[/mark]` delimiters around matched terms in source code snippets. The adapter must replicate this:

1. After query returns matching rows, process `source_code` for each row.
2. Split source into lines.
3. For each line containing the search term (case-insensitive match):
   - Replace matched substring with `[mark]matched[/mark]`.
   - Include the line as a fragment.
4. Limit fragments to a reasonable count (e.g., first 5 matches per flow).
5. Attach fragments to the row before passing to mapper.

This in-memory approach is acceptable for the first slice. Production-grade full-text search with `ts_headline` is a follow-on optimization.

## Contract Rules

- Preserve the exact Kestra route and payload shape.
- Keep `namespace` first-class in `kt.*`.
- Do not redesign the UI while making the page work.
- Return a `PagedResultsSearchResultFlow` payload with `results` (array of `SearchResultFlow`) and `total`.
- Each `SearchResultFlow` must contain `model` (a `Flow` object) and `fragments` (array of strings with `[mark]`/`[/mark]` delimiters).
- Do not import backend DTOs from generated SDK files; only use `kestra-ct/generated/kestra-contract/types.gen.ts`.

## Verification Commands

```bash
# Run all handler tests (includes both /search and /source routes)
deno test supabase/functions/kestra-flows/index.test.ts

# Format all modified files
deno fmt supabase/functions/kestra-flows/index.ts supabase/functions/kestra-flows/index.test.ts supabase/functions/_shared/kestra-adapter/queries/flows.ts supabase/functions/_shared/kestra-adapter/mappers/flows.ts supabase/functions/_shared/kestra-adapter/filters/flows.ts

# Re-run tests after formatting
deno test supabase/functions/kestra-flows/index.test.ts

# Verify all expected files exist
ls -la supabase/functions/kestra-flows/index.ts supabase/functions/kestra-flows/index.test.ts supabase/functions/_shared/kestra-adapter/filters/flows.ts supabase/functions/_shared/kestra-adapter/queries/flows.ts supabase/functions/_shared/kestra-adapter/mappers/flows.ts
```

## Stop Conditions

- Missing bootstrap dependency
- Missing contract detail
- Response shape ambiguity
- The page still cannot boot through `http://localhost:8080` after the endpoint code exists because the compatibility gateway remains missing.
- Fragment generation cannot produce acceptable output from `source_code` column (e.g., source_code is empty or not YAML text).
- The `SearchResultFlow` or `PagedResultsSearchResultFlow` types are not available in the CT-generated contract types.
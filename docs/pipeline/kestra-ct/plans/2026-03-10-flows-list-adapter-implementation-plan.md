# Flows List Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `kestra-flows` edge function that serves `GET /api/v1/main/flows/search` by querying `kt.flows` and returning a `PagedResultsFlow`-shaped response.

**Architecture:** Four-layer adapter — filter parses query params, query reads `kt.flows` rows, mapper converts rows to Kestra `Flow` DTOs, handler wires them together. Each layer is a separate module under `_shared/kestra-adapter/`. The handler lives in `supabase/functions/kestra-flows/index.ts`.

**Tech Stack:** Deno, Supabase Edge Functions, Supabase JS client, CT-staged types from `kestra-ct/generated/`.

---

## Shared Blocker Note

The dev compatibility gateway (`localhost:8080`) is missing. End-to-end page verification is not possible. This plan covers backend adapter code + unit tests only. The handler can be tested via `deno test`. True page-level verification is deferred until the gateway exists.

---

### Task 1: Scaffold directories and config

**Files:**
- Create: `supabase/functions/kestra-flows/config.toml`
- Create: (directories only) `supabase/functions/_shared/kestra-adapter/filters/`, `queries/`, `mappers/`, `http/`

**Step 1: Create the kestra-flows function directory and config**

```toml
# supabase/functions/kestra-flows/config.toml
[function]
verify_jwt = false
```

Note: `verify_jwt = false` because the Kestra compatibility surface handles auth at the gateway level, not per-function. This matches the Kestra frontend expectation where `/api/v1/...` endpoints are behind a session, not per-request JWT.

**Step 2: Create the shared adapter directory structure**

```bash
mkdir -p supabase/functions/_shared/kestra-adapter/filters
mkdir -p supabase/functions/_shared/kestra-adapter/queries
mkdir -p supabase/functions/_shared/kestra-adapter/mappers
mkdir -p supabase/functions/_shared/kestra-adapter/http
```

**Step 3: Commit**

```bash
git add supabase/functions/kestra-flows/config.toml
git commit -m "chore: scaffold kestra-flows function and shared adapter dirs"
```

---

### Task 2: Mapper — write failing test, then implement

The mapper is the core logic: it converts a `kt.flows` row into a Kestra `Flow` DTO. Test this first because it has no dependencies on DB or HTTP.

**Files:**
- Create: `supabase/functions/_shared/kestra-adapter/mappers/flows.ts`
- Create: `supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts`

**Step 1: Write the failing test**

```typescript
// supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapFlowRow } from "./flows.ts";

const SAMPLE_ROW = {
  key: "test-key",
  value: {
    description: "A test flow",
    labels: { env: "prod", team: "data" },
    triggers: [
      { id: "daily", type: "io.kestra.plugin.core.trigger.Schedule" },
    ],
    inputs: [{ id: "date", type: "STRING" }],
    tasks: [{ id: "hello", type: "io.kestra.plugin.core.log.Log" }],
  },
  deleted: false,
  id: "my_flow",
  namespace: "io.kestra.tests",
  revision: 3,
  fulltext: null,
  source_code: "id: my_flow\nnamespace: io.kestra.tests",
  tenant_id: null,
  updated: "2026-03-09T12:00:00Z",
};

Deno.test("mapFlowRow maps kt.flows row to Kestra Flow DTO", () => {
  const result = mapFlowRow(SAMPLE_ROW);

  assertEquals(result.id, "my_flow");
  assertEquals(result.namespace, "io.kestra.tests");
  assertEquals(result.revision, 3);
  assertEquals(result.description, "A test flow");
  assertEquals(result.disabled, false);
  assertEquals(result.deleted, false);
  assertEquals(result.labels, { env: "prod", team: "data" });
  assertEquals(result.triggers?.length, 1);
  assertEquals(result.triggers?.[0].id, "daily");
});

Deno.test("mapFlowRow defaults missing value fields gracefully", () => {
  const minimalRow = {
    key: "k",
    value: {},
    deleted: false,
    id: "bare",
    namespace: "ns",
    revision: 1,
    fulltext: null,
    source_code: "id: bare\nnamespace: ns",
    tenant_id: null,
    updated: null,
  };

  const result = mapFlowRow(minimalRow);

  assertEquals(result.id, "bare");
  assertEquals(result.namespace, "ns");
  assertEquals(result.description, undefined);
  assertEquals(result.labels, undefined);
  assertEquals(result.triggers, undefined);
  assertEquals(result.disabled, false);
  assertEquals(result.deleted, false);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts`
Expected: FAIL — `mapFlowRow` does not exist yet.

**Step 3: Write minimal implementation**

```typescript
// supabase/functions/_shared/kestra-adapter/mappers/flows.ts
import type { KtRow } from "../../../../kestra-ct/generated/database.types.ts";
import type { Json } from "../../../../kestra-ct/generated/database.types.ts";

/** Shape returned to the Kestra frontend. Matches the contract Flow type. */
export type FlowDto = {
  id: string;
  namespace: string;
  revision: number;
  description?: string;
  disabled: boolean;
  deleted: boolean;
  labels?: Record<string, string>;
  triggers?: Array<{ id: string; type: string; [k: string]: unknown }>;
  inputs?: Array<{ id: string; type: string; [k: string]: unknown }>;
  tasks?: Array<{ id: string; type: string; [k: string]: unknown }>;
  source?: string;
  updated?: string;
};

type FlowRow = KtRow<"flows">;

function jsonObj(v: Json | undefined): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

export function mapFlowRow(row: FlowRow): FlowDto {
  const val = jsonObj(row.value);

  return {
    id: row.id,
    namespace: row.namespace,
    revision: row.revision,
    description: typeof val.description === "string" ? val.description : undefined,
    disabled: val.disabled === true,
    deleted: row.deleted,
    labels: isStringRecord(val.labels) ? val.labels : undefined,
    triggers: Array.isArray(val.triggers) ? val.triggers as FlowDto["triggers"] : undefined,
    inputs: Array.isArray(val.inputs) ? val.inputs as FlowDto["inputs"] : undefined,
    tasks: Array.isArray(val.tasks) ? val.tasks as FlowDto["tasks"] : undefined,
    source: row.source_code,
    updated: row.updated ?? undefined,
  };
}

function isStringRecord(v: unknown): v is Record<string, string> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
```

**Step 4: Run test to verify it passes**

Run: `deno test supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/_shared/kestra-adapter/mappers/flows.ts supabase/functions/_shared/kestra-adapter/mappers/flows.test.ts
git commit -m "feat(kestra): add flows mapper with tests"
```

---

### Task 3: Filter — write failing test, then implement

The filter normalizes query string params into a typed filter object.

**Files:**
- Create: `supabase/functions/_shared/kestra-adapter/filters/flows.ts`
- Create: `supabase/functions/_shared/kestra-adapter/filters/flows.test.ts`

**Step 1: Write the failing test**

```typescript
// supabase/functions/_shared/kestra-adapter/filters/flows.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseFlowSearchParams } from "./flows.ts";

Deno.test("parseFlowSearchParams extracts page, size, sort", () => {
  const url = new URL("http://localhost/api/v1/main/flows/search?page=2&size=10&sort=namespace:desc");
  const f = parseFlowSearchParams(url.searchParams);

  assertEquals(f.page, 2);
  assertEquals(f.size, 10);
  assertEquals(f.sortBy, "namespace");
  assertEquals(f.sortDir, "desc");
});

Deno.test("parseFlowSearchParams uses defaults for missing params", () => {
  const url = new URL("http://localhost/api/v1/main/flows/search");
  const f = parseFlowSearchParams(url.searchParams);

  assertEquals(f.page, 1);
  assertEquals(f.size, 25);
  assertEquals(f.sortBy, "id");
  assertEquals(f.sortDir, "asc");
});

Deno.test("parseFlowSearchParams captures namespace and q filters", () => {
  const url = new URL("http://localhost/api/v1/main/flows/search?filters%5Bnamespace%5D%5BPREFIX%5D=io.kestra&q=hello");
  const f = parseFlowSearchParams(url.searchParams);

  assertEquals(f.namespace, "io.kestra");
  assertEquals(f.q, "hello");
});
```

**Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/_shared/kestra-adapter/filters/flows.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// supabase/functions/_shared/kestra-adapter/filters/flows.ts

export type FlowSearchFilter = {
  page: number;
  size: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  namespace?: string;
  q?: string;
};

const ALLOWED_SORT_COLUMNS = new Set(["id", "namespace", "updated"]);

export function parseFlowSearchParams(params: URLSearchParams): FlowSearchFilter {
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(params.get("size") ?? "25", 10) || 25));

  let sortBy = "id";
  let sortDir: "asc" | "desc" = "asc";
  const sortRaw = params.get("sort");
  if (sortRaw) {
    const [col, dir] = sortRaw.split(":");
    if (ALLOWED_SORT_COLUMNS.has(col)) sortBy = col;
    if (dir === "desc") sortDir = "desc";
  }

  const namespace = params.get("filters[namespace][PREFIX]") ?? undefined;
  const q = params.get("q") ?? undefined;

  return { page, size, sortBy, sortDir, namespace, q };
}
```

**Step 4: Run test to verify it passes**

Run: `deno test supabase/functions/_shared/kestra-adapter/filters/flows.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/_shared/kestra-adapter/filters/flows.ts supabase/functions/_shared/kestra-adapter/filters/flows.test.ts
git commit -m "feat(kestra): add flows search filter parser with tests"
```

---

### Task 4: Query module — write failing test, then implement

The query module reads from `kt.flows` using the Supabase client. Tests use a mock client.

**Files:**
- Create: `supabase/functions/_shared/kestra-adapter/queries/flows.ts`
- Create: `supabase/functions/_shared/kestra-adapter/queries/flows.test.ts`

**Step 1: Write the failing test**

```typescript
// supabase/functions/_shared/kestra-adapter/queries/flows.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { queryFlows } from "./flows.ts";
import type { FlowSearchFilter } from "../filters/flows.ts";

function mockClient(rows: unknown[], count: number) {
  return {
    schema: (_s: string) => ({
      from: (_t: string) => ({
        select: (_cols: string, _opts: unknown) => {
          let chain: any = {};
          chain.eq = () => chain;
          chain.ilike = () => chain;
          chain.order = () => chain;
          chain.range = () => chain;
          chain.then = (resolve: Function) => resolve({ data: rows, count, error: null });
          // Make it thenable
          return chain;
        },
      }),
    }),
  };
}

Deno.test("queryFlows returns rows and total from mock client", async () => {
  const filter: FlowSearchFilter = { page: 1, size: 25, sortBy: "id", sortDir: "asc" };
  const fakeRows = [
    { id: "flow1", namespace: "ns", revision: 1, deleted: false, key: "k", value: {}, fulltext: null, source_code: "", tenant_id: null, updated: null },
  ];

  const result = await queryFlows(mockClient(fakeRows, 1) as any, filter);

  assertEquals(result.rows.length, 1);
  assertEquals(result.rows[0].id, "flow1");
  assertEquals(result.total, 1);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/_shared/kestra-adapter/queries/flows.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// supabase/functions/_shared/kestra-adapter/queries/flows.ts
import type { KtRow } from "../../../../kestra-ct/generated/database.types.ts";
import type { FlowSearchFilter } from "../filters/flows.ts";

type FlowRow = KtRow<"flows">;

export type FlowQueryResult = {
  rows: FlowRow[];
  total: number;
};

export async function queryFlows(
  supabase: { schema: (s: string) => any },
  filter: FlowSearchFilter,
): Promise<FlowQueryResult> {
  const from = (filter.page - 1) * filter.size;
  const to = from + filter.size - 1;

  let query = supabase
    .schema("kt")
    .from("flows")
    .select("*", { count: "exact" })
    .eq("deleted", false);

  if (filter.namespace) {
    query = query.ilike("namespace", `${filter.namespace}%`);
  }

  if (filter.q) {
    query = query.ilike("fulltext", `%${filter.q}%`);
  }

  query = query.order(filter.sortBy, { ascending: filter.sortDir === "asc" });
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) throw new Error(`kt.flows query failed: ${error.message}`);

  return {
    rows: (data ?? []) as FlowRow[],
    total: count ?? 0,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `deno test supabase/functions/_shared/kestra-adapter/queries/flows.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/_shared/kestra-adapter/queries/flows.ts supabase/functions/_shared/kestra-adapter/queries/flows.test.ts
git commit -m "feat(kestra): add flows query module with tests"
```

---

### Task 5: HTTP helpers

Small shared utilities for consistent error and response formatting.

**Files:**
- Create: `supabase/functions/_shared/kestra-adapter/http/response.ts`

**Step 1: Write the module**

```typescript
// supabase/functions/_shared/kestra-adapter/http/response.ts
import { withCorsHeaders } from "../../cors.ts";

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse(status, { message });
}
```

**Step 2: Commit**

```bash
git add supabase/functions/_shared/kestra-adapter/http/response.ts
git commit -m "feat(kestra): add shared HTTP response helpers"
```

---

### Task 6: Handler — write failing test, then implement

The handler is the edge function entry point. It wires filter → query → mapper → response.

**Files:**
- Create: `supabase/functions/kestra-flows/index.ts`
- Create: `supabase/functions/kestra-flows/index.test.ts`

**Step 1: Write the failing test**

```typescript
// supabase/functions/kestra-flows/index.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleFlowsRequest } from "./index.ts";

function mockClient(rows: unknown[], count: number) {
  return {
    schema: (_s: string) => ({
      from: (_t: string) => ({
        select: (_cols: string, _opts: unknown) => {
          let chain: any = {};
          chain.eq = () => chain;
          chain.ilike = () => chain;
          chain.order = () => chain;
          chain.range = () => chain;
          chain.then = (resolve: Function) => resolve({ data: rows, count, error: null });
          return chain;
        },
      }),
    }),
  };
}

const SAMPLE_ROWS = [
  {
    key: "k1",
    value: { description: "First flow", labels: { env: "dev" }, triggers: [], inputs: [], tasks: [] },
    deleted: false,
    id: "flow_a",
    namespace: "io.kestra.demo",
    revision: 1,
    fulltext: "flow_a io.kestra.demo",
    source_code: "id: flow_a\nnamespace: io.kestra.demo",
    tenant_id: null,
    updated: "2026-03-09T00:00:00Z",
  },
];

Deno.test("handleFlowsRequest returns PagedResultsFlow shape", async () => {
  const req = new Request("http://localhost/api/v1/main/flows/search?page=1&size=25");
  const res = await handleFlowsRequest(req, mockClient(SAMPLE_ROWS, 1) as any);

  assertEquals(res.status, 200);

  const body = await res.json();
  assertEquals(typeof body.total, "number");
  assertEquals(body.total, 1);
  assertEquals(Array.isArray(body.results), true);
  assertEquals(body.results.length, 1);
  assertEquals(body.results[0].id, "flow_a");
  assertEquals(body.results[0].namespace, "io.kestra.demo");
  assertEquals(body.results[0].description, "First flow");
});

Deno.test("handleFlowsRequest returns 405 for non-GET", async () => {
  const req = new Request("http://localhost/api/v1/main/flows/search", { method: "POST" });
  const res = await handleFlowsRequest(req, mockClient([], 0) as any);

  assertEquals(res.status, 405);
});
```

**Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/kestra-flows/index.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// supabase/functions/kestra-flows/index.ts
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { parseFlowSearchParams } from "../_shared/kestra-adapter/filters/flows.ts";
import { queryFlows } from "../_shared/kestra-adapter/queries/flows.ts";
import { mapFlowRow } from "../_shared/kestra-adapter/mappers/flows.ts";
import { jsonResponse, errorResponse } from "../_shared/kestra-adapter/http/response.ts";

export async function handleFlowsRequest(
  req: Request,
  supabase: { schema: (s: string) => any },
): Promise<Response> {
  if (req.method === "OPTIONS") return corsPreflight();
  if (req.method !== "GET") return errorResponse(405, "Method not allowed");

  try {
    const url = new URL(req.url);
    const filter = parseFlowSearchParams(url.searchParams);
    const { rows, total } = await queryFlows(supabase, filter);
    const results = rows.map(mapFlowRow);

    return jsonResponse(200, { results, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(500, message);
  }
}

Deno.serve(async (req: Request) => {
  const supabase = createAdminClient();
  return handleFlowsRequest(req, supabase);
});
```

**Step 4: Run test to verify it passes**

Run: `deno test supabase/functions/kestra-flows/index.test.ts`
Expected: PASS

**Step 5: Run all kestra adapter tests together**

Run: `deno test supabase/functions/_shared/kestra-adapter/ supabase/functions/kestra-flows/`
Expected: All PASS

**Step 6: Commit**

```bash
git add supabase/functions/kestra-flows/index.ts supabase/functions/kestra-flows/index.test.ts
git commit -m "feat(kestra): add kestra-flows handler with integration test"
```

---

### Task 7: Update CT artifacts

**Files:**
- Modify: `kestra-ct/page-registry.yaml` — set `windows_status: verifying`
- Modify: `kestra-ct/pages/flows-list/README.md` — note implementation done
- Modify: `kestra-ct/page-status-summary.md` — update status

**Step 1: Update registry**

Set `windows_status: verifying` for `flows_list`.

**Step 2: Update README**

```
This page has been implemented. Read `packet.md` for scope, `capture.md` for observed facts, and `implement.md` for what was built. Backend adapter tests pass. End-to-end verification is blocked on the missing compatibility gateway.
```

**Step 3: Commit**

```bash
git add kestra-ct/page-registry.yaml kestra-ct/pages/flows-list/README.md kestra-ct/page-status-summary.md
git commit -m "chore(kestra): update flows_list CT status after implementation"
```

---

## Verification

After all tasks, run the full test suite:

```bash
deno test supabase/functions/_shared/kestra-adapter/ supabase/functions/kestra-flows/
```

Expected: All tests pass. Minimum proof:

- [x] Mapper converts `kt.flows` rows to `Flow` DTOs correctly
- [x] Filter parses pagination, sort, namespace, and search params
- [x] Query module builds correct Supabase query chain
- [x] Handler returns `{ results: Flow[], total: number }` for GET
- [x] Handler returns 405 for non-GET

**Not yet verifiable** (blocked on shared prerequisites):
- [ ] Dev server + gateway serves the page end-to-end
- [ ] `Flows.vue` renders rows from the adapter
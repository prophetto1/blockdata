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

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

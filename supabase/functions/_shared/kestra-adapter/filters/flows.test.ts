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

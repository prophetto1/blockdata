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

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleFlowsRequest } from "./index.ts";

type FakeState = {
  project: {
    project_id: string;
    project_name: string;
    description: string | null;
    workspace_id: string | null;
    updated_at: string | null;
  } | null;
  flowSource: {
    project_id: string;
    source: string;
    revision: number;
    updated_at: string | null;
  } | null;
};

function createFakeUserClient(state: FakeState) {
  return {
    from: (table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: state.project?.project_id === value ? state.project : null,
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === "flow_sources") {
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: state.flowSource?.project_id === value ? state.flowSource : null,
                  error: null,
                }),
            }),
          }),
          upsert: (row: Record<string, unknown>) => {
            state.flowSource = {
              project_id: String(row.project_id),
              source: String(row.source),
              revision: Number(row.revision ?? 1),
              updated_at: "2026-02-27T00:00:00.000Z",
            };
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

Deno.test("handleFlowsRequest rejects requests without auth header", async () => {
  const req = new Request("https://example.com/functions/v1/flows/default/flow-1", { method: "GET" });
  const resp = await handleFlowsRequest(req);
  const body = await resp.json();
  assertEquals(resp.status, 401);
  assertEquals(body.error, "Missing Authorization header");
});

Deno.test("GET /flows/{namespace}/{id}?source=true returns source and revision", async () => {
  const projectId = "11111111-1111-1111-1111-111111111111";
  const source = `id: flow-one
namespace: default

tasks:
  - id: hello
    type: io.kestra.plugin.core.log.Log
    message: "hello"`;
  const state: FakeState = {
    project: {
      project_id: projectId,
      project_name: "Flow One",
      description: null,
      workspace_id: "default",
      updated_at: "2026-02-26T01:00:00.000Z",
    },
    flowSource: {
      project_id: projectId,
      source,
      revision: 3,
      updated_at: "2026-02-26T02:00:00.000Z",
    },
  };

  const req = new Request(`https://example.com/functions/v1/flows/default/${projectId}?source=true`, {
    method: "GET",
    headers: { Authorization: "Bearer token" },
  });
  const resp = await handleFlowsRequest(req, {
    requireUserId: () => Promise.resolve("user-1"),
    createUserClient: (() => createFakeUserClient(state)) as never,
  });
  const body = await resp.json();

  assertEquals(resp.status, 200);
  assertEquals(body.id, projectId);
  assertEquals(body.revision, 3);
  assertEquals(body.source, source);
});

Deno.test("POST /flows/validate returns violations for missing required fields", async () => {
  const req = new Request("https://example.com/functions/v1/flows/validate", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/x-yaml",
    },
    body: "namespace: default",
  });

  const resp = await handleFlowsRequest(req, {
    requireUserId: () => Promise.resolve("user-1"),
    createUserClient: (() => createFakeUserClient({ project: null, flowSource: null })) as never,
  });
  const body = await resp.json();

  assertEquals(resp.status, 200);
  assert(Array.isArray(body));
  assert(body.length > 0);
  assert(body.some((item: { path?: string }) => item.path === "id"));
});

Deno.test("PUT /flows/{namespace}/{id} persists source and increments revision", async () => {
  const projectId = "22222222-2222-2222-2222-222222222222";
  const state: FakeState = {
    project: {
      project_id: projectId,
      project_name: "Flow Two",
      description: null,
      workspace_id: "default",
      updated_at: "2026-02-26T01:00:00.000Z",
    },
    flowSource: {
      project_id: projectId,
      source: "id: flow-two\nnamespace: default\ntasks: []",
      revision: 2,
      updated_at: "2026-02-26T01:00:00.000Z",
    },
  };
  const nextSource = `id: flow-two
namespace: default

tasks:
  - id: hello
    type: io.kestra.plugin.core.log.Log
    message: "updated"`;

  const putReq = new Request(`https://example.com/functions/v1/flows/default/${projectId}`, {
    method: "PUT",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/x-yaml",
    },
    body: nextSource,
  });

  const putResp = await handleFlowsRequest(putReq, {
    requireUserId: () => Promise.resolve("user-1"),
    createUserClient: (() => createFakeUserClient(state)) as never,
  });
  const putBody = await putResp.json();
  assertEquals(putResp.status, 200);
  assertEquals(putBody.revision, 3);
  assertEquals(putBody.source, nextSource);

  const getReq = new Request(`https://example.com/functions/v1/flows/default/${projectId}?source=true`, {
    method: "GET",
    headers: { Authorization: "Bearer token" },
  });
  const getResp = await handleFlowsRequest(getReq, {
    requireUserId: () => Promise.resolve("user-1"),
    createUserClient: (() => createFakeUserClient(state)) as never,
  });
  const getBody = await getResp.json();

  assertEquals(getResp.status, 200);
  assertEquals(getBody.revision, 3);
  assertEquals(getBody.source, nextSource);
});

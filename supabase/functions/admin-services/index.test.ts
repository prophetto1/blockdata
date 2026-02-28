import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleAdminServicesRequest } from "./index.ts";

Deno.test("handleAdminServicesRequest rejects requests without auth header", async () => {
  const req = new Request("https://example.com/functions/v1/admin-services", { method: "GET" });
  const resp = await handleAdminServicesRequest(req, {
    requireSuperuser: () => Promise.reject(new Error("Missing Authorization header")),
    createAdminClient: (() => ({})) as never,
  });
  const body = await resp.json();
  assertEquals(resp.status, 401);
  assertEquals(body.error, "Missing Authorization header");
});

Deno.test("GET returns service registry inventory payload", async () => {
  const fakeAdminClient = {
    from: (table: string) => {
      if (table === "service_registry") {
        return {
          select: () => Promise.resolve({
            data: [{
              service_id: "svc-1",
              service_type: "conversion",
              service_name: "conversion-service",
              base_url: "https://example.run.app",
              health_status: "online",
              last_heartbeat: null,
              enabled: true,
              config: { auth_header: "X-Conversion-Service-Key" },
              updated_at: "2026-02-28T00:00:00Z",
            }],
            error: null,
          }),
        };
      }
      if (table === "service_functions") {
        return {
          select: () => Promise.resolve({
            data: [{
              function_id: "fn-1",
              service_id: "svc-1",
              function_name: "convert_docling",
              function_type: "convert",
              label: "Docling Convert",
              description: "Convert using docling",
              entrypoint: "/convert/docling",
              http_method: "POST",
              enabled: true,
              tags: ["docling"],
              updated_at: "2026-02-28T00:00:00Z",
            }],
            error: null,
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const req = new Request("https://example.com/functions/v1/admin-services", {
    method: "GET",
    headers: { Authorization: "Bearer test" },
  });

  const resp = await handleAdminServicesRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => fakeAdminClient) as never,
  });
  const body = await resp.json();

  assertEquals(resp.status, 200);
  assertEquals(body.superuser.email, "admin@example.com");
  assertEquals(body.services.length, 1);
  assertEquals(body.functions.length, 1);
  assertEquals(body.services[0].service_name, "conversion-service");
  assertEquals(body.functions[0].function_name, "convert_docling");
});

Deno.test("PATCH updates service enabled/base_url", async () => {
  let updatePayload: Record<string, unknown> | null = null;
  let whereId: string | null = null;

  const fakeAdminClient = {
    from: (table: string) => {
      if (table !== "service_registry") throw new Error(`Unexpected table: ${table}`);
      return {
        update: (payload: Record<string, unknown>) => {
          updatePayload = payload;
          return {
            eq: (column: string, value: string) => {
              assertEquals(column, "service_id");
              whereId = value;
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const req = new Request("https://example.com/functions/v1/admin-services", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: "service",
      service_id: "svc-1",
      enabled: false,
      base_url: "https://new-host.example.com",
    }),
  });

  const resp = await handleAdminServicesRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => fakeAdminClient) as never,
  });
  const body = await resp.json();

  assertEquals(resp.status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.updated_target, "service");
  assertEquals(body.updated_id, "svc-1");
  assertEquals(whereId, "svc-1");
  assertEquals(updatePayload?.["enabled"], false);
  assertEquals(updatePayload?.["base_url"], "https://new-host.example.com");
  assertEquals(typeof updatePayload?.["updated_at"], "string");
});

Deno.test("PATCH rejects invalid payload", async () => {
  const req = new Request("https://example.com/functions/v1/admin-services", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target: "unknown" }),
  });

  const resp = await handleAdminServicesRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => ({})) as never,
  });
  const body = await resp.json();

  assertEquals(resp.status, 400);
  assertEquals(typeof body.error, "string");
});

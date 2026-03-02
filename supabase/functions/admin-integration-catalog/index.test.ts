import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleAdminIntegrationCatalogRequest } from "./index.ts";

Deno.test("admin-integration-catalog rejects requests without auth header", async () => {
  const req = new Request("https://example.com/functions/v1/admin-integration-catalog", { method: "GET" });
  const resp = await handleAdminIntegrationCatalogRequest(req, {
    requireSuperuser: () => Promise.reject(new Error("Missing Authorization header")),
    createAdminClient: (() => ({})) as never,
    fetch: (() => Promise.reject(new Error("not used"))) as never,
    nowIso: () => "2026-02-28T00:00:00Z",
  });
  const body = await resp.json();
  assertEquals(resp.status, 401);
  assertEquals(body.error, "Missing Authorization header");
});

Deno.test("admin-integration-catalog GET returns items + mapping options", async () => {
  let selectedColumns = "";
  const fakeAdminClient = {
    from: (table: string) => {
      if (table === "integration_catalog_items") {
        return {
          select: (columns: string) => {
            selectedColumns = columns;
            return Promise.resolve({
              data: [
                {
                  item_id: "i-1",
                  source: "kestra",
                  external_id: "io.kestra.plugin.dbt.cli.DbtCLI",
                  plugin_name: "plugin-dbt",
                  plugin_title: "DBT",
                  plugin_group: "io.kestra.plugin.dbt",
                  plugin_version: "1.2.1",
                  categories: ["DATA"],
                  task_class: "io.kestra.plugin.dbt.cli.DbtCLI",
                  task_title: "Run dbt commands via CLI",
                  task_description: "Run dbt",
                  task_schema: {},
                  task_markdown: null,
                  enabled: true,
                  mapped_service_id: null,
                  mapped_function_id: null,
                  mapping_notes: null,
                  source_updated_at: null,
                  created_at: "2026-02-28T00:00:00Z",
                },
              ],
              error: null,
            });
          },
        };
      }
      if (table === "service_registry") {
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  service_id: "svc-1",
                  service_type: "dbt",
                  service_name: "transform-runner",
                  base_url: "https://example.run",
                  enabled: true,
                },
              ],
              error: null,
            }),
        };
      }
      if (table === "service_functions") {
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  function_id: "fn-1",
                  service_id: "svc-1",
                  function_name: "dbt_cli",
                  function_type: "transform",
                  label: "Run dbt CLI",
                  entrypoint: "/dbt/cli",
                  enabled: true,
                },
              ],
              error: null,
            }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const req = new Request("https://example.com/functions/v1/admin-integration-catalog", {
    method: "GET",
    headers: { Authorization: "Bearer test" },
  });
  const resp = await handleAdminIntegrationCatalogRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => fakeAdminClient) as never,
    fetch: (() => Promise.reject(new Error("not used"))) as never,
    nowIso: () => "2026-02-28T00:00:00Z",
  });
  const body = await resp.json();

  assertEquals(resp.status, 200);
  assertEquals(body.superuser.email, "admin@example.com");
  assertEquals(body.items.length, 1);
  assertEquals(body.services.length, 1);
  assertEquals(body.functions.length, 1);
  assertEquals(body.items[0].task_class, "io.kestra.plugin.dbt.cli.DbtCLI");
  assertEquals(selectedColumns.includes("suggested_service_type"), false);
});

Deno.test("admin-integration-catalog PATCH updates mapping fields", async () => {
  let updated: Record<string, unknown> | null = null;
  let whereId = "";

  const fakeAdminClient = {
    from: (table: string) => {
      if (table !== "integration_catalog_items") throw new Error(`Unexpected table: ${table}`);
      return {
        update: (payload: Record<string, unknown>) => {
          updated = payload;
          return {
            eq: (column: string, value: string) => {
              assertEquals(column, "item_id");
              whereId = value;
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  const req = new Request("https://example.com/functions/v1/admin-integration-catalog", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: "item",
      item_id: "i-1",
      mapped_service_id: "svc-1",
      mapped_function_id: "fn-1",
      enabled: false,
      mapping_notes: "Approved by superuser",
    }),
  });

  const resp = await handleAdminIntegrationCatalogRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => fakeAdminClient) as never,
    fetch: (() => Promise.reject(new Error("not used"))) as never,
    nowIso: () => "2026-02-28T00:00:00Z",
  });
  const body = await resp.json();

  assertEquals(resp.status, 200, JSON.stringify(body));
  assertEquals(body.ok, true);
  assertEquals(body.updated_target, "item");
  assertEquals(body.updated_id, "i-1");
  assertEquals(whereId, "i-1");
  assertEquals(updated?.["mapped_service_id"], "svc-1");
  assertEquals(updated?.["mapped_function_id"], "fn-1");
  assertEquals(updated?.["enabled"], false);
  assertEquals(updated?.["mapping_notes"], "Approved by superuser");
  assertEquals(typeof updated?.["updated_at"], "string");
});

Deno.test("admin-integration-catalog sync_kestra dry-run summarizes internal catalog rows", async () => {
  let fetchCalled = false;
  const fakeAdminClient = {
    from: (table: string) => {
      if (table !== "integration_catalog_items") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () =>
          Promise.resolve({
            data: [
              {
                source: "kestra",
                external_id: "io.kestra.plugin.dbt.cli.DbtCLI",
                task_class: "io.kestra.plugin.dbt.cli.DbtCLI",
              },
            ],
            error: null,
          }),
      };
    },
  };

  const fakeFetch = () => {
    fetchCalled = true;
    return Promise.reject(new Error("not used"));
  };

  const req = new Request("https://example.com/functions/v1/admin-integration-catalog", {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: "sync_kestra",
      dry_run: true,
    }),
  });

  const resp = await handleAdminIntegrationCatalogRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => fakeAdminClient) as never,
    fetch: fakeFetch as never,
    nowIso: () => "2026-02-28T00:00:00Z",
  });
  const body = await resp.json();

  assertEquals(resp.status, 200, JSON.stringify(body));
  assertEquals(body.ok, true);
  assertEquals(body.dry_run, true);
  assertEquals(body.summary.total_normalized, 1);
  assertEquals(body.summary.would_update, 1);
  assertEquals(body.summary.would_insert, 0);
  assertEquals(fetchCalled, false);
  assertEquals(body.mode, "internal_catalog_only");
});

Deno.test("admin-integration-catalog sync_kestra does not call external fetch even when source_url is provided", async () => {
  let fetchCalled = false;
  const fakeAdminClient = {
    from: (table: string) => {
      if (table !== "integration_catalog_items") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () =>
          Promise.resolve({
            data: [{ source: "kestra", external_id: "io.kestra.plugin.core.log.Log", task_class: "io.kestra.plugin.core.log.Log" }],
            error: null,
          }),
      };
    },
  };

  const fakeFetch = () => {
    fetchCalled = true;
    return Promise.reject(new Error("not used"));
  };

  const req = new Request("https://example.com/functions/v1/admin-integration-catalog", {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: "sync_kestra",
      source_url: "http://example-kestra:8080/api/v1/plugins",
      dry_run: true,
    }),
  });

  const resp = await handleAdminIntegrationCatalogRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => fakeAdminClient) as never,
    fetch: fakeFetch as never,
    nowIso: () => "2026-02-28T00:00:00Z",
  });
  const body = await resp.json();

  assertEquals(resp.status, 200, JSON.stringify(body));
  assertEquals(body.ok, true);
  assertEquals(fetchCalled, false);
  assertEquals(body.mode, "internal_catalog_only");
});

Deno.test("admin-integration-catalog GET with catalog_source=temp reads from temp table", async () => {
  let selectedTable = "";

  const fakeAdminClient = {
    from: (table: string) => {
      if (table === "integration_catalog_items_temp") {
        selectedTable = table;
        return {
          select: () =>
            Promise.resolve({
              data: [
                {
                  item_id: "temp-1",
                  source: "kestra",
                  external_id: "io.kestra.plugin.core.log.Log",
                  plugin_name: "plugin-core",
                  plugin_title: "Core",
                  plugin_group: "io.kestra.plugin.core",
                  plugin_version: "1.0.0",
                  categories: ["CORE"],
                  task_class: "io.kestra.plugin.core.log.Log",
                  task_title: "Log",
                  task_description: "Temp catalog row",
                  task_schema: {},
                  task_markdown: null,
                  enabled: true,
                  mapped_service_id: null,
                  mapped_function_id: null,
                  mapping_notes: null,
                  source_updated_at: null,
                  created_at: "2026-02-28T00:00:00Z",
                },
              ],
              error: null,
            }),
        };
      }
      if (table === "service_registry") {
        return { select: () => Promise.resolve({ data: [], error: null }) };
      }
      if (table === "service_functions") {
        return { select: () => Promise.resolve({ data: [], error: null }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const req = new Request("https://example.com/functions/v1/admin-integration-catalog?catalog_source=temp", {
    method: "GET",
    headers: { Authorization: "Bearer test" },
  });
  const resp = await handleAdminIntegrationCatalogRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => fakeAdminClient) as never,
    fetch: (() => Promise.reject(new Error("not used"))) as never,
    nowIso: () => "2026-02-28T00:00:00Z",
  });
  const body = await resp.json();

  assertEquals(resp.status, 200);
  assertEquals(selectedTable, "integration_catalog_items_temp");
  assertEquals(body.items.length, 1);
  assertEquals(body.items[0].item_id, "temp-1");
});

Deno.test("admin-integration-catalog PATCH does not accept suggested_service_type field", async () => {
  const fakeAdminClient = {
    from: (_table: string) => ({
      update: (_payload: Record<string, unknown>) => ({
        eq: (_column: string, _value: string) => Promise.resolve({ error: null }),
      }),
    }),
  };

  const req = new Request("https://example.com/functions/v1/admin-integration-catalog", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: "item",
      item_id: "i-1",
      suggested_service_type: "dbt",
    }),
  });

  const resp = await handleAdminIntegrationCatalogRequest(req, {
    requireSuperuser: () => Promise.resolve({ userId: "u1", email: "admin@example.com" }),
    createAdminClient: (() => fakeAdminClient) as never,
    fetch: (() => Promise.reject(new Error("not used"))) as never,
    nowIso: () => "2026-02-28T00:00:00Z",
  });
  const body = await resp.json();

  assertEquals(resp.status, 400);
  assertEquals(body.error, "No updatable fields provided for item");
});

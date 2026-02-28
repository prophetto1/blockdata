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
  const fakeAdminClient = {
    from: (table: string) => {
      if (table === "integration_catalog_items") {
        return {
          select: () =>
            Promise.resolve({
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
                  suggested_service_type: "dbt",
                  mapped_service_id: null,
                  mapped_function_id: null,
                  mapping_notes: null,
                  source_updated_at: null,
                  last_synced_at: "2026-02-28T00:00:00Z",
                  updated_at: "2026-02-28T00:00:00Z",
                },
              ],
              error: null,
            }),
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

Deno.test("admin-integration-catalog sync_kestra dry-run summarizes inserts/updates", async () => {
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
              },
            ],
            error: null,
          }),
      };
    },
  };

  const fakeFetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify([
          {
            name: "plugin-dbt",
            title: "DBT",
            group: "io.kestra.plugin.dbt",
            version: "1.2.1",
            categories: ["DATA"],
            tasks: [
              {
                cls: "io.kestra.plugin.dbt.cli.DbtCLI",
                title: "Run dbt commands via CLI",
                description: "Run dbt",
              },
              {
                cls: "io.kestra.plugin.jdbc.vectorwise.Batch",
                title: "Run vectorwise batch",
                description: "Batch",
              },
            ],
          },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

  const req = new Request("https://example.com/functions/v1/admin-integration-catalog", {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: "sync_kestra",
      source_url: "http://localhost:8080/api/v1/plugins",
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
  assertEquals(body.summary.total_normalized, 2);
  assertEquals(body.summary.would_update, 1);
  assertEquals(body.summary.would_insert, 1);
});

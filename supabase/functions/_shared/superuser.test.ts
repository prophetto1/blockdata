import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  requireAgchainAdmin,
  requireBlockdataAdmin,
  requireSuperuser,
} from "./superuser.ts";

type RegistryRow = {
  email_normalized: string;
  is_active: boolean;
};

function createAdminClientWithRows(
  rows: RegistryRow[],
  expectedTable = "registry_superuser_profiles",
) {
  return {
    from(table: string) {
      assertEquals(table, expectedTable);
      return {
        select(column: string) {
          assertEquals(column, "email_normalized");
          const filters = new Map<string, unknown>();
          return {
            eq(column: string, value: unknown) {
              filters.set(column, value);
              return this;
            },
            limit(limitValue: number) {
              const data = rows
                .filter((row) =>
                  Array.from(filters.entries()).every(([column, value]) =>
                    (row as Record<string, unknown>)[column] === value
                  )
                )
                .slice(0, limitValue);
              return Promise.resolve({ data, error: null });
            },
          };
        },
      };
    },
  };
}

function createUserClientForEmail(email: string) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: "user-1", email } },
          error: null,
        }),
    },
  };
}

Deno.test("requireSuperuser rejects when registry_superuser_profiles has no active rows", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  await assertRejects(
    () =>
      requireSuperuser(req, {
        createUserClient: () =>
          createUserClientForEmail("admin@example.com") as never,
        createAdminClient: () => createAdminClientWithRows([]) as never,
      }),
    Error,
    "Superuser access is not configured",
  );
});

Deno.test("requireSuperuser accepts an active designated email from registry_superuser_profiles", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  const result = await requireSuperuser(req, {
    createUserClient: () =>
      createUserClientForEmail("Admin@Example.com") as never,
    createAdminClient: () =>
      createAdminClientWithRows([
        {
          email_normalized: "admin@example.com",
          is_active: true,
        },
      ]) as never,
  });

  assertEquals(result.userId, "user-1");
  assertEquals(result.email, "admin@example.com");
});

Deno.test("requireSuperuser rejects authenticated users not present in registry_superuser_profiles", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  await assertRejects(
    () =>
      requireSuperuser(req, {
        createUserClient: () =>
          createUserClientForEmail("viewer@example.com") as never,
        createAdminClient: () =>
          createAdminClientWithRows([
            {
              email_normalized: "admin@example.com",
              is_active: true,
            },
          ]) as never,
      }),
    Error,
    "Forbidden: superuser access required",
  );
});

Deno.test("requireBlockdataAdmin accepts an active designated email from registry_blockdata_admin_profiles", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  const result = await requireBlockdataAdmin(req, {
    createUserClient: () =>
      createUserClientForEmail("Admin@Example.com") as never,
    createAdminClient: () =>
      createAdminClientWithRows(
        [
          {
            email_normalized: "admin@example.com",
            is_active: true,
          },
        ],
        "registry_blockdata_admin_profiles",
      ) as never,
  });

  assertEquals(result.userId, "user-1");
  assertEquals(result.email, "admin@example.com");
});

Deno.test("requireAgchainAdmin accepts an active designated email from registry_agchain_admin_profiles", async () => {
  const req = new Request("https://example.com/functions/v1/admin-config", {
    headers: { Authorization: "Bearer test-token" },
  });

  const result = await requireAgchainAdmin(req, {
    createUserClient: () =>
      createUserClientForEmail("Admin@Example.com") as never,
    createAdminClient: () =>
      createAdminClientWithRows(
        [
          {
            email_normalized: "admin@example.com",
            is_active: true,
          },
        ],
        "registry_agchain_admin_profiles",
      ) as never,
  });

  assertEquals(result.userId, "user-1");
  assertEquals(result.email, "admin@example.com");
});

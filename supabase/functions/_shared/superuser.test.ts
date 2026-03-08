import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requireSuperuser } from "./superuser.ts";

type SuperuserRow = {
  superuser_profile_id: string;
  email_normalized: string;
  is_active: boolean;
};

function createAdminClientWithRows(rows: SuperuserRow[]) {
  return {
    from(table: string) {
      assertEquals(table, "registry_superuser_profiles");
      return {
        select() {
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
        createUserClient: () => createUserClientForEmail("admin@example.com") as never,
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
    createUserClient: () => createUserClientForEmail("Admin@Example.com") as never,
    createAdminClient: () =>
      createAdminClientWithRows([
        {
          superuser_profile_id: "su-1",
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
        createUserClient: () => createUserClientForEmail("viewer@example.com") as never,
        createAdminClient: () =>
          createAdminClientWithRows([
            {
              superuser_profile_id: "su-1",
              email_normalized: "admin@example.com",
              is_active: true,
            },
          ]) as never,
      }),
    Error,
    "Forbidden: superuser access required",
  );
});

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  handleProviderConnectionsRequest,
  parseServiceAccountJson,
  validateGcpLocation,
  validateServiceAccountShape,
} from "./index.ts";

Deno.test("handleProviderConnectionsRequest rejects requests without auth header", async () => {
  const req = new Request("https://example.com/functions/v1/provider-connections/status", { method: "GET" });
  const resp = await handleProviderConnectionsRequest(req);
  const body = await resp.json();
  assertEquals(resp.status, 401);
  assertEquals(body.error, "Missing Authorization header");
});

Deno.test("service account parser and validators enforce expected shape", () => {
  assertEquals(validateGcpLocation("us-central1"), "us-central1");
  assertEquals(validateGcpLocation("US-CENTRAL1"), null);

  const parsed = parseServiceAccountJson({
    project_id: "demo-project",
    client_email: "svc@example.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
  });
  assertEquals(parsed.ok, true);
  if (!parsed.ok) return;

  assertEquals(validateServiceAccountShape(parsed.sa), null);
  assertEquals(
    validateServiceAccountShape({
      project_id: "demo-project",
      client_email: "svc@example.com",
      private_key: "not-a-real-key",
    }),
    "service_account_json private_key looks invalid",
  );
});

Deno.test("connect stores encrypted secret and never returns plaintext key", async () => {
  const userId = "00000000-0000-0000-0000-000000000abc";
  let upsertRow: Record<string, unknown> | null = null;

  const fakeAdminClient = {
    from: (table: string) => {
      if (table !== "user_provider_connections") throw new Error(`Unexpected table: ${table}`);
      return {
        upsert: (row: Record<string, unknown>) => {
          upsertRow = row;
          return { error: null };
        },
      };
    },
  };

  const req = new Request("https://example.com/functions/v1/provider-connections/connect", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "google",
      connection_type: "gcp_service_account",
      location: "us-central1",
      service_account_json: {
        project_id: "demo-project",
        client_email: "svc@example.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nTOP-SECRET\n-----END PRIVATE KEY-----",
      },
    }),
  });

  const resp = await handleProviderConnectionsRequest(req, {
    requireUserId: () => Promise.resolve(userId),
    createAdminClient: (() => fakeAdminClient) as never,
    requireEnv: () => "service-role-test-secret",
    encryptWithContext: () => Promise.resolve("enc:v1:test-ciphertext"),
  });

  const body = await resp.json();
  assertEquals(resp.status, 200);
  assertEquals(body.status, "connected");
  assertEquals(body.metadata.project_id, "demo-project");
  assertEquals(body.metadata.location, "us-central1");

  const responseText = JSON.stringify(body);
  assertEquals(responseText.includes("BEGIN PRIVATE KEY"), false);
  assertEquals(responseText.includes("TOP-SECRET"), false);

  assert(upsertRow !== null);
  assertEquals(upsertRow["user_id"], userId);
  assertEquals(upsertRow["credential_encrypted"], "enc:v1:test-ciphertext");
  assertEquals(String(upsertRow["credential_encrypted"]).includes("TOP-SECRET"), false);
});

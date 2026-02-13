import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeReadiness,
  customConfigured,
  handleAgentConfigRequest,
  keyConfigured,
  normalizeKeyword,
  vertexConnected,
} from "./index.ts";

Deno.test("handleAgentConfigRequest rejects requests without auth header", async () => {
  const req = new Request("https://example.com/functions/v1/agent-config", { method: "GET" });
  const resp = await handleAgentConfigRequest(req);
  const body = await resp.json();
  assertEquals(resp.status, 401);
  assertEquals(body.error, "Missing Authorization header");
});

Deno.test("normalizeKeyword ensures leading slash and trims input", () => {
  assertEquals(normalizeKeyword("claude"), "/claude");
  assertEquals(normalizeKeyword("/gpt"), "/gpt");
  assertEquals(normalizeKeyword("  /gemini  "), "/gemini");
  assertEquals(normalizeKeyword("   "), "");
});

Deno.test("readiness helpers enforce provider rules", () => {
  assertEquals(keyConfigured(undefined), false);
  assertEquals(keyConfigured({ provider: "openai", key_suffix: "1234", is_valid: true, base_url: null }), true);
  assertEquals(keyConfigured({ provider: "openai", key_suffix: "1234", is_valid: false, base_url: null }), false);
  assertEquals(
    customConfigured({ provider: "custom", key_suffix: "9999", is_valid: true, base_url: "http://localhost:11434/v1" }),
    true,
  );
  assertEquals(customConfigured({ provider: "custom", key_suffix: "9999", is_valid: true, base_url: null }), false);
  assertEquals(
    vertexConnected([
      {
        provider: "google",
        connection_type: "gcp_service_account",
        status: "connected",
        metadata_jsonb: { location: "us-central1" },
      },
    ]),
    true,
  );

  assertEquals(
    computeReadiness("anthropic", { provider: "anthropic", key_suffix: "1234", is_valid: true, base_url: null }, [])
      .is_ready,
    true,
  );
  assertEquals(
    computeReadiness("google", undefined, [
      {
        provider: "google",
        connection_type: "gcp_service_account",
        status: "connected",
        metadata_jsonb: {},
      },
    ]).is_ready,
    true,
  );
  assertEquals(
    computeReadiness("custom", { provider: "custom", key_suffix: "1234", is_valid: true, base_url: null }, []).is_ready,
    false,
  );
  assertEquals(computeReadiness("unknown", undefined, []).reasons[0], "Unsupported provider");
});

Deno.test("PATCH write path pins user scope and normalizes keyword", async () => {
  const userId = "00000000-0000-0000-0000-000000000123";
  let upsertRow: Record<string, unknown> | null = null;

  const fakeUserClient = {
    from: (table: string) => {
      if (table === "agent_catalog") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { agent_slug: "anthropic", provider_family: "anthropic" },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "user_api_keys") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { provider: "anthropic", key_suffix: "1234", is_valid: true, base_url: null },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === "user_provider_connections") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const fakeAdminClient = {
    from: (table: string) => {
      if (table !== "user_agent_configs") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }),
        upsert: (row: Record<string, unknown>) => {
          upsertRow = row;
          return {
            select: () => ({
              maybeSingle: () => Promise.resolve({ data: row, error: null }),
            }),
          };
        },
      };
    },
  };

  const req = new Request("https://example.com/functions/v1/agent-config", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: "attacker-controlled-id",
      agent_slug: "anthropic",
      keyword: "claude",
      model: "claude-sonnet-4-5-20250929",
      is_default: false,
    }),
  });

  const resp = await handleAgentConfigRequest(req, {
    requireUserId: () => Promise.resolve(userId),
    createUserClient: (() => fakeUserClient) as never,
    createAdminClient: (() => fakeAdminClient) as never,
  });

  const body = await resp.json();
  assertEquals(resp.status, 200);
  assertEquals(body.is_ready, true);
  assert(upsertRow !== null);
  assertEquals(upsertRow["user_id"], userId);
  assertEquals(upsertRow["keyword"], "/claude");
});

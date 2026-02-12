import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createUserClient, requireUserId, createAdminClient } from "../_shared/supabase.ts";
import { requireEnv } from "../_shared/env.ts";
import { encryptApiKey } from "../_shared/api_key_crypto.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

type Provider = "anthropic" | "openai" | "google" | "custom";

const VALID_PROVIDERS: ReadonlySet<string> = new Set<Provider>([
  "anthropic",
  "openai",
  "google",
  "custom",
]);

function parseProvider(value: unknown): Provider | null {
  if (typeof value === "string" && VALID_PROVIDERS.has(value)) return value as Provider;
  return null;
}

function parseBaseUrl(body: Record<string, unknown>, provider: Provider):
  | { ok: true; base_url: string | null }
  | { ok: false; error: string } {
  const raw = typeof body?.base_url === "string" ? body.base_url.trim() || null : null;

  if (provider === "custom" && !raw) {
    return { ok: false, error: "Custom provider requires base_url" };
  }
  if (provider !== "custom" && raw) {
    return { ok: false, error: "base_url only applies to custom provider" };
  }
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { ok: false, error: "base_url must use http or https" };
      }
    } catch {
      return { ok: false, error: "Invalid base_url" };
    }
  }
  return { ok: true, base_url: raw };
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  try {
    const userId = await requireUserId(req);
    const body = await req.json().catch(() => ({}));
    const provider = parseProvider(body?.provider);
    if (!provider) return json(400, { error: "Unsupported provider" });

    // Use service role key as the encryption secret. It's already present in the Edge runtime.
    const cryptoSecret = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (req.method === "POST") {
      const apiKey = typeof body?.api_key === "string" ? body.api_key.trim() : "";
      if (!apiKey) return json(400, { error: "Missing api_key" });

      const default_model = typeof body?.default_model === "string" ? body.default_model : null;
      const default_temperature = typeof body?.default_temperature === "number"
        ? body.default_temperature
        : null;
      const default_max_tokens = typeof body?.default_max_tokens === "number"
        ? body.default_max_tokens
        : null;

      const urlResult = parseBaseUrl(body, provider);
      if (!urlResult.ok) return json(400, { error: urlResult.error });

      const key_suffix = apiKey.slice(-4);
      const encrypted = await encryptApiKey(apiKey, cryptoSecret);

      // Write via service role so we can set api_key_encrypted without granting the browser access.
      const admin = createAdminClient();
      const { error } = await admin
        .from("user_api_keys")
        .upsert({
          user_id: userId,
          provider,
          api_key_encrypted: encrypted,
          key_suffix,
          is_valid: null,
          base_url: urlResult.base_url,
          ...(default_model != null ? { default_model } : {}),
          ...(default_temperature != null ? { default_temperature } : {}),
          ...(default_max_tokens != null ? { default_max_tokens } : {}),
        }, { onConflict: "user_id,provider" });

      if (error) return json(400, { error: error.message });
      return json(200, { ok: true, key_suffix });
    }

    // Defaults update is safe to do using the authenticated client (keeps the privilege surface smaller).
    if (req.method === "PATCH") {
      const default_model = typeof body?.default_model === "string" ? body.default_model : null;
      const default_temperature = typeof body?.default_temperature === "number"
        ? body.default_temperature
        : null;
      const default_max_tokens = typeof body?.default_max_tokens === "number"
        ? body.default_max_tokens
        : null;
      const urlResult = parseBaseUrl(body, provider);
      if (!urlResult.ok) return json(400, { error: urlResult.error });

      const supabase = createUserClient(authHeader);
      const { data, error } = await supabase.rpc("update_api_key_defaults", {
        p_provider: provider,
        p_default_model: default_model,
        p_default_temperature: default_temperature,
        p_default_max_tokens: default_max_tokens,
        p_base_url: urlResult.base_url,
      });
      if (error) return json(400, { error: error.message });
      return json(200, data ?? { ok: true });
    }

    if (req.method === "DELETE") {
      const supabase = createUserClient(authHeader);
      const { data, error } = await supabase.rpc("delete_api_key", { p_provider: provider });
      if (error) return json(400, { error: error.message });
      return json(200, data ?? { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
});

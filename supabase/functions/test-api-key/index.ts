import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const { api_key, provider, base_url } = await req.json();
    if (!api_key || typeof api_key !== "string") {
      return json(400, { valid: false, error: "Missing api_key" });
    }

    // ── Anthropic: POST /v1/messages with minimal payload ──
    if (provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": api_key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });

      if (resp.ok) {
        return json(200, { valid: true });
      }

      const errText = await resp.text().catch(() => "");
      if (resp.status === 401 || resp.status === 403) {
        return json(200, { valid: false, error: "Invalid or disabled API key" });
      }
      return json(200, { valid: false, error: `API returned ${resp.status}: ${errText.slice(0, 200)}` });
    }

    // ── OpenAI: GET /v1/models (no tokens consumed) ──
    if (provider === "openai") {
      const resp = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { "Authorization": `Bearer ${api_key}` },
      });

      if (resp.ok) return json(200, { valid: true });
      if (resp.status === 401 || resp.status === 403) {
        return json(200, { valid: false, error: "Invalid or disabled API key" });
      }
      const errText = await resp.text().catch(() => "");
      return json(200, { valid: false, error: `API returned ${resp.status}: ${errText.slice(0, 200)}` });
    }

    // ── Google AI: GET /v1beta/models with key in query param ──
    if (provider === "google") {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(api_key)}`
      );

      if (resp.ok) return json(200, { valid: true });
      if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
        return json(200, { valid: false, error: "Invalid or disabled API key" });
      }
      const errText = await resp.text().catch(() => "");
      return json(200, { valid: false, error: `API returned ${resp.status}: ${errText.slice(0, 200)}` });
    }

    // ── Custom: GET <base_url>/models with Bearer token ──
    if (provider === "custom") {
      if (!base_url || typeof base_url !== "string") {
        return json(400, { valid: false, error: "Custom provider requires base_url" });
      }
      try {
        const parsed = new URL(base_url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return json(400, { valid: false, error: "base_url must use http or https" });
        }
      } catch {
        return json(400, { valid: false, error: "Invalid base_url" });
      }

      const modelsUrl = `${base_url.replace(/\/+$/, "")}/models`;
      try {
        const resp = await fetch(modelsUrl, {
          method: "GET",
          headers: { "Authorization": `Bearer ${api_key}` },
        });
        if (resp.ok) return json(200, { valid: true });
        if (resp.status === 401 || resp.status === 403) {
          return json(200, { valid: false, error: "Invalid or disabled API key" });
        }
        const errText = await resp.text().catch(() => "");
        return json(200, { valid: false, error: `Endpoint returned ${resp.status}: ${errText.slice(0, 200)}` });
      } catch (fetchErr) {
        return json(200, {
          valid: false,
          error: `Cannot reach endpoint: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
        });
      }
    }

    return json(400, { valid: false, error: `Unsupported provider: ${provider}` });
  } catch (e) {
    return json(500, { valid: false, error: e instanceof Error ? e.message : String(e) });
  }
});

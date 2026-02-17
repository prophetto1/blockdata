import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { requireUserId } from "../_shared/supabase.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function parseHttpUrl(value: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "base_url is required" };
  }
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, error: "base_url must use http or https" };
    }
  } catch {
    return { ok: false, error: "Invalid base_url" };
  }
  return { ok: true, value: trimmed.replace(/\/+$/, "") };
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!req.headers.get("Authorization")) return json(401, { valid: false, error: "Missing Authorization header" });

  try {
    await requireUserId(req);
    const { api_key, provider, base_url } = await req.json();
    if (!api_key || typeof api_key !== "string") {
      return json(400, { valid: false, error: "Missing api_key" });
    }

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

    if (provider === "google") {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(api_key)}`,
      );

      if (resp.ok) return json(200, { valid: true });
      if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
        return json(200, { valid: false, error: "Invalid or disabled API key" });
      }
      const errText = await resp.text().catch(() => "");
      return json(200, { valid: false, error: `API returned ${resp.status}: ${errText.slice(0, 200)}` });
    }

    if (provider === "custom") {
      const parsedBase = parseHttpUrl(base_url);
      if (!parsedBase.ok) {
        return json(400, { valid: false, error: parsedBase.error });
      }

      const modelsUrl = `${parsedBase.value}/models`;
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
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Missing Authorization header") || msg.startsWith("Invalid auth")) {
      return json(401, { valid: false, error: msg });
    }
    return json(500, { valid: false, error: msg });
  }
});

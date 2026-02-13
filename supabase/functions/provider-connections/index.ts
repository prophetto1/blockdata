import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { requireEnv } from "../_shared/env.ts";
import { encryptWithContext } from "../_shared/api_key_crypto.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

const CRYPTO_CONTEXT = "provider-connections-v1";

type ProviderConnectionsDeps = {
  requireUserId: (req: Request) => Promise<string>;
  createAdminClient: () => ReturnType<typeof createAdminClient>;
  requireEnv: (name: string) => string;
  encryptWithContext: (plaintext: string, secret: string, context: string) => Promise<string>;
};

const defaultDeps: ProviderConnectionsDeps = {
  requireUserId,
  createAdminClient,
  requireEnv,
  encryptWithContext,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

export function getAction(req: Request): string {
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("provider-connections");
  return idx >= 0 ? (parts[idx + 1] ?? "") : "";
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function validateGcpLocation(value: unknown): string | null {
  const s = parseNonEmptyString(value);
  if (!s) return null;
  if (!/^[a-z0-9-]+$/.test(s)) return null;
  return s;
}

type ServiceAccount = {
  type?: string;
  project_id?: string;
  private_key?: string;
  client_email?: string;
  [k: string]: unknown;
};

export function parseServiceAccountJson(
  value: unknown,
): { ok: true; sa: ServiceAccount; raw: string } | { ok: false; error: string } {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, error: "Missing service_account_json" };
    try {
      const parsed = JSON.parse(trimmed);
      if (!isPlainObject(parsed)) return { ok: false, error: "service_account_json must be a JSON object" };
      return { ok: true, sa: parsed as ServiceAccount, raw: trimmed };
    } catch {
      return { ok: false, error: "service_account_json must be valid JSON" };
    }
  }

  if (isPlainObject(value)) {
    const raw = JSON.stringify(value);
    return { ok: true, sa: value as ServiceAccount, raw };
  }

  return { ok: false, error: "service_account_json must be a JSON object or JSON string" };
}

export function validateServiceAccountShape(sa: ServiceAccount): string | null {
  const projectId = parseNonEmptyString(sa.project_id);
  const clientEmail = parseNonEmptyString(sa.client_email);
  const privateKey = parseNonEmptyString(sa.private_key);

  if (!projectId) return "service_account_json missing project_id";
  if (!clientEmail) return "service_account_json missing client_email";
  if (!privateKey) return "service_account_json missing private_key";
  if (!privateKey.includes("BEGIN PRIVATE KEY")) return "service_account_json private_key looks invalid";
  return null;
}

export async function handleProviderConnectionsRequest(
  req: Request,
  deps: ProviderConnectionsDeps = defaultDeps,
): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  try {
    const userId = await deps.requireUserId(req);
    const action = getAction(req);

    const admin = deps.createAdminClient();
    const cryptoSecret = deps.requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (req.method === "GET" && (action === "" || action === "status")) {
      const { data, error } = await admin
        .from("user_provider_connections")
        .select("id, user_id, provider, connection_type, status, metadata_jsonb, created_at, updated_at")
        .eq("user_id", userId);
      if (error) return json(400, { error: error.message });
      return json(200, { connections: data ?? [] });
    }

    if (req.method === "POST" && action === "disconnect") {
      const body = await req.json().catch(() => ({}));
      const provider = parseNonEmptyString((body as Record<string, unknown>)?.provider);
      const connectionType = parseNonEmptyString((body as Record<string, unknown>)?.connection_type);
      if (!provider) return json(400, { error: "Missing provider" });
      if (!connectionType) return json(400, { error: "Missing connection_type" });

      // Keep v1 scope aligned with connect: only Google Vertex service account is supported.
      if (provider !== "google" || connectionType !== "gcp_service_account") {
        return json(400, { error: "Unsupported provider/connection_type for v1" });
      }

      const { error } = await admin
        .from("user_provider_connections")
        .upsert({
          user_id: userId,
          provider,
          connection_type: connectionType,
          status: "disconnected",
          credential_encrypted: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider,connection_type" });
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true, status: "disconnected" });
    }

    if (req.method === "POST" && action === "connect") {
      const body = await req.json().catch(() => ({}));
      const provider = parseNonEmptyString((body as Record<string, unknown>)?.provider);
      const connectionType = parseNonEmptyString((body as Record<string, unknown>)?.connection_type);
      if (!provider) return json(400, { error: "Missing provider" });
      if (!connectionType) return json(400, { error: "Missing connection_type" });

      // v1: only Vertex service account connect.
      if (provider !== "google" || connectionType !== "gcp_service_account") {
        return json(400, { error: "Unsupported provider/connection_type for v1" });
      }

      const location = validateGcpLocation((body as Record<string, unknown>)?.location);
      if (!location) return json(400, { error: "Missing/invalid location" });

      const saParsed = parseServiceAccountJson((body as Record<string, unknown>)?.service_account_json);
      if (!saParsed.ok) return json(400, { error: saParsed.error });

      const shapeError = validateServiceAccountShape(saParsed.sa);
      if (shapeError) return json(400, { error: shapeError });

      const projectId = parseNonEmptyString(saParsed.sa.project_id) as string;
      const clientEmail = parseNonEmptyString(saParsed.sa.client_email) as string;

      const encrypted = await deps.encryptWithContext(saParsed.raw, cryptoSecret, CRYPTO_CONTEXT);

      const metadata_jsonb = {
        location,
        project_id: projectId,
        client_email: clientEmail,
      };

      const { error } = await admin
        .from("user_provider_connections")
        .upsert({
          user_id: userId,
          provider,
          connection_type: connectionType,
          status: "connected",
          credential_encrypted: encrypted,
          metadata_jsonb,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider,connection_type" });
      if (error) return json(400, { error: error.message });

      return json(200, { ok: true, status: "connected", metadata: metadata_jsonb });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleProviderConnectionsRequest(req));
}

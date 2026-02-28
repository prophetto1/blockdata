import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireSuperuser, type SuperuserContext } from "../_shared/superuser.ts";

type AdminServicesDeps = {
  requireSuperuser: (req: Request) => Promise<SuperuserContext>;
  createAdminClient: () => ReturnType<typeof createAdminClient>;
};

const defaultDeps: AdminServicesDeps = {
  requireSuperuser,
  createAdminClient,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHealthStatus(value: string): boolean {
  return value === "online" || value === "offline" || value === "degraded" || value === "unknown";
}

function isHttpMethod(value: string): boolean {
  return value === "GET" || value === "POST" || value === "PUT" || value === "DELETE";
}

export async function handleAdminServicesRequest(req: Request, deps: AdminServicesDeps = defaultDeps): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    const superuser = await deps.requireSuperuser(req);
    const supabaseAdmin = deps.createAdminClient();

    if (req.method === "GET") {
      const [{ data: services, error: servicesErr }, { data: functions, error: functionsErr }] = await Promise.all([
        supabaseAdmin
          .from("service_registry")
          .select(
            "service_id,service_type,service_name,base_url,health_status,last_heartbeat,enabled,config,created_at,updated_at",
          ),
        supabaseAdmin
          .from("service_functions")
          .select(
            "function_id,service_id,function_name,function_type,label,description,entrypoint,http_method,enabled,tags,created_at,updated_at",
          ),
      ]);

      if (servicesErr) return json(500, { error: `Failed to load services: ${servicesErr.message}` });
      if (functionsErr) return json(500, { error: `Failed to load functions: ${functionsErr.message}` });

      const serviceRows = Array.isArray(services) ? [...services] : [];
      serviceRows.sort((a, b) => {
        const ta = String(a.service_type ?? "");
        const tb = String(b.service_type ?? "");
        if (ta !== tb) return ta.localeCompare(tb);
        return String(a.service_name ?? "").localeCompare(String(b.service_name ?? ""));
      });

      const functionRows = Array.isArray(functions) ? [...functions] : [];
      functionRows.sort((a, b) => {
        const sa = String(a.service_id ?? "");
        const sb = String(b.service_id ?? "");
        if (sa !== sb) return sa.localeCompare(sb);
        return String(a.function_name ?? "").localeCompare(String(b.function_name ?? ""));
      });

      return json(200, {
        superuser: {
          user_id: superuser.userId,
          email: superuser.email,
        },
        services: serviceRows,
        functions: functionRows,
      });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = await req.json().catch(() => null);
      if (!isPlainObject(body)) {
        return json(400, { error: "Invalid JSON body" });
      }

      const target = typeof body.target === "string" ? body.target.trim() : "";

      if (target === "service") {
        const serviceId = typeof body.service_id === "string" ? body.service_id.trim() : "";
        if (!serviceId) return json(400, { error: "Missing service_id" });

        const update: Record<string, unknown> = {};

        if (body.enabled !== undefined) {
          if (typeof body.enabled !== "boolean") return json(400, { error: "enabled must be boolean" });
          update.enabled = body.enabled;
        }

        if (body.base_url !== undefined) {
          if (typeof body.base_url !== "string" || body.base_url.trim().length === 0) {
            return json(400, { error: "base_url must be a non-empty string" });
          }
          update.base_url = body.base_url.trim();
        }

        if (body.health_status !== undefined) {
          if (typeof body.health_status !== "string" || !isHealthStatus(body.health_status)) {
            return json(400, { error: "health_status must be one of: online, offline, degraded, unknown" });
          }
          update.health_status = body.health_status;
        }

        if (body.config !== undefined) {
          if (!isPlainObject(body.config)) return json(400, { error: "config must be an object" });
          update.config = body.config;
        }

        if (Object.keys(update).length === 0) {
          return json(400, { error: "No updatable fields provided for service" });
        }

        update.updated_at = new Date().toISOString();

        const { error: updateErr } = await supabaseAdmin
          .from("service_registry")
          .update(update)
          .eq("service_id", serviceId);

        if (updateErr) return json(500, { error: `Failed to update service: ${updateErr.message}` });

        return json(200, {
          ok: true,
          updated_target: "service",
          updated_id: serviceId,
        });
      }

      if (target === "function") {
        const functionId = typeof body.function_id === "string" ? body.function_id.trim() : "";
        if (!functionId) return json(400, { error: "Missing function_id" });

        const update: Record<string, unknown> = {};

        if (body.enabled !== undefined) {
          if (typeof body.enabled !== "boolean") return json(400, { error: "enabled must be boolean" });
          update.enabled = body.enabled;
        }

        if (body.entrypoint !== undefined) {
          if (typeof body.entrypoint !== "string" || body.entrypoint.trim().length === 0) {
            return json(400, { error: "entrypoint must be a non-empty string" });
          }
          update.entrypoint = body.entrypoint.trim();
        }

        if (body.http_method !== undefined) {
          if (typeof body.http_method !== "string" || !isHttpMethod(body.http_method)) {
            return json(400, { error: "http_method must be one of: GET, POST, PUT, DELETE" });
          }
          update.http_method = body.http_method;
        }

        if (body.label !== undefined) {
          if (typeof body.label !== "string" || body.label.trim().length === 0) {
            return json(400, { error: "label must be a non-empty string" });
          }
          update.label = body.label.trim();
        }

        if (body.description !== undefined) {
          if (!(typeof body.description === "string" || body.description === null)) {
            return json(400, { error: "description must be a string or null" });
          }
          update.description = body.description;
        }

        if (body.tags !== undefined) {
          if (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== "string")) {
            return json(400, { error: "tags must be an array of strings" });
          }
          update.tags = body.tags;
        }

        if (Object.keys(update).length === 0) {
          return json(400, { error: "No updatable fields provided for function" });
        }

        update.updated_at = new Date().toISOString();

        const { error: updateErr } = await supabaseAdmin
          .from("service_functions")
          .update(update)
          .eq("function_id", functionId);

        if (updateErr) return json(500, { error: `Failed to update function: ${updateErr.message}` });

        return json(200, {
          ok: true,
          updated_target: "function",
          updated_id: functionId,
        });
      }

      return json(400, { error: "Invalid target. Use target=service or target=function" });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Missing Authorization header") || msg.startsWith("Invalid auth")) {
      return json(401, { error: msg });
    }
    if (msg.includes("Forbidden: superuser access required")) {
      return json(403, { error: msg });
    }
    if (msg.includes("Superuser access is not configured")) {
      return json(503, { error: msg });
    }
    return json(500, { error: msg });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleAdminServicesRequest(req));
}

import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createUserClient, requireUserId } from "../_shared/supabase.ts";

type AgentConfigDeps = {
  requireUserId: (req: Request) => Promise<string>;
  createUserClient: (authHeader: string) => ReturnType<typeof createUserClient>;
  createAdminClient: () => ReturnType<typeof createAdminClient>;
};

const defaultDeps: AgentConfigDeps = {
  requireUserId,
  createUserClient,
  createAdminClient,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeKeyword(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export type KeyRow = {
  provider: string;
  key_suffix: string;
  is_valid: boolean | null;
  base_url: string | null;
};

export type ConnectionRow = {
  provider: string;
  connection_type: string;
  status: string;
  metadata_jsonb: Record<string, unknown> | null;
};

export function keyConfigured(key: KeyRow | undefined): boolean {
  if (!key) return false;
  if (key.is_valid === false) return false;
  return typeof key.key_suffix === "string" && key.key_suffix.trim().length === 4;
}

export function customConfigured(key: KeyRow | undefined): boolean {
  // v1: custom requires both base_url and an API key (matches current user_api_keys schema).
  if (!keyConfigured(key)) return false;
  return typeof key?.base_url === "string" && key.base_url.trim().length > 0;
}

export function vertexConnected(connections: ConnectionRow[]): boolean {
  return connections.some((c) =>
    c.provider === "google" && c.connection_type === "gcp_service_account" && c.status === "connected"
  );
}

export function computeReadiness(
  providerFamily: string,
  key: KeyRow | undefined,
  connections: ConnectionRow[],
): { is_ready: boolean; reasons: string[] } {
  if (providerFamily === "anthropic" || providerFamily === "openai") {
    const isReady = keyConfigured(key);
    return { is_ready: isReady, reasons: isReady ? [] : ["Missing API key"] };
  }
  if (providerFamily === "google") {
    const isReady = keyConfigured(key) || vertexConnected(connections);
    return { is_ready: isReady, reasons: isReady ? [] : ["Missing Gemini API key or Vertex connection"] };
  }
  if (providerFamily === "custom") {
    const isReady = customConfigured(key);
    return { is_ready: isReady, reasons: isReady ? [] : ["Missing base_url and/or API key"] };
  }
  return { is_ready: false, reasons: ["Unsupported provider"] };
}

export async function handleAgentConfigRequest(
  req: Request,
  deps: AgentConfigDeps = defaultDeps,
): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  try {
    const userId = await deps.requireUserId(req);
    const supabase = deps.createUserClient(authHeader);

    if (req.method === "GET") {
      const [{ data: catalog, error: catalogErr }, { data: configs, error: cfgErr }, { data: keys, error: keysErr },
        { data: connections, error: connErr }] = await Promise.all([
        supabase.from("agent_catalog").select("*").eq("enabled", true).order("agent_slug"),
        supabase.from("user_agent_configs").select("*").order("created_at"),
        supabase
          .from("user_api_keys")
          .select("provider, key_suffix, is_valid, base_url")
          .eq("user_id", userId),
        supabase
          .from("user_provider_connections")
          .select("provider, connection_type, status, metadata_jsonb")
          .eq("user_id", userId),
      ]);

      if (catalogErr) return json(400, { error: catalogErr.message });
      if (cfgErr) return json(400, { error: cfgErr.message });
      if (keysErr) return json(400, { error: keysErr.message });
      if (connErr) return json(400, { error: connErr.message });

      const keyMap = new Map<string, KeyRow>();
      for (const row of (keys ?? []) as KeyRow[]) keyMap.set(row.provider, row);
      const connRows = (connections ?? []) as ConnectionRow[];

      const readiness: Record<string, { is_ready: boolean; reasons: string[] }> = {};
      for (const cat of (catalog ?? []) as Array<{ agent_slug: string; provider_family: string }>) {
        const slug = cat.agent_slug;
        const provider = cat.provider_family;
        readiness[slug] = computeReadiness(provider, keyMap.get(provider), connRows);
      }

      const defaultAgentSlug =
        ((configs ?? []) as Array<{ agent_slug: string; is_default: boolean }>).find((c) => c.is_default)?.agent_slug ??
          null;

      return json(200, {
        catalog: catalog ?? [],
        configs: configs ?? [],
        readiness,
        default_agent_slug: defaultAgentSlug,
        user_api_keys: keys ?? [],
        provider_connections: connRows.map((c) => ({
          provider: c.provider,
          connection_type: c.connection_type,
          status: c.status,
          metadata_jsonb: c.metadata_jsonb ?? {},
        })),
      });
    }

    if (req.method === "POST" || req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      if (!isPlainObject(body)) return json(400, { error: "Invalid JSON body" });

      const agentSlug = typeof body.agent_slug === "string" ? body.agent_slug.trim() : "";
      if (!agentSlug) return json(400, { error: "Missing agent_slug" });

      // Validate slug exists in catalog.
      const { data: catRow, error: catErr } = await supabase
        .from("agent_catalog")
        .select("agent_slug, provider_family")
        .eq("agent_slug", agentSlug)
        .maybeSingle();
      if (catErr) return json(400, { error: catErr.message });
      if (!catRow) return json(400, { error: "Unknown agent_slug" });

      const keyword = typeof body.keyword === "string" ? normalizeKeyword(body.keyword) : undefined;
      const model = typeof body.model === "string" ? body.model.trim() : undefined;
      const mode = body.mode == null ? undefined : (typeof body.mode === "string" ? body.mode.trim() : undefined);

      const mcpServerIds = Array.isArray(body.mcp_server_ids)
        ? body.mcp_server_ids.filter((x) => typeof x === "string").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const configJsonb = isPlainObject(body.config_jsonb) ? body.config_jsonb : undefined;

      const isDefault = typeof body.is_default === "boolean" ? body.is_default : undefined;

      // Compute readiness based on current provider state.
      const [{ data: keyRow }, { data: connRows }] = await Promise.all([
        supabase
          .from("user_api_keys")
          .select("provider, key_suffix, is_valid, base_url")
          .eq("user_id", userId)
          .eq("provider", catRow.provider_family)
          .maybeSingle(),
        supabase
          .from("user_provider_connections")
          .select("provider, connection_type, status, metadata_jsonb")
          .eq("user_id", userId),
      ]);

      const key = keyRow as KeyRow | null;
      const connections = (connRows ?? []) as ConnectionRow[];
      const isReady = computeReadiness(catRow.provider_family, key ?? undefined, connections).is_ready;

      const admin = deps.createAdminClient();

      // Enforce keyword uniqueness per user (DB index is the final guard; this is a nicer error).
      if (keyword != null && keyword !== "") {
        const { data: existing, error: existingErr } = await admin
          .from("user_agent_configs")
          .select("agent_slug")
          .eq("user_id", userId)
          .eq("keyword", keyword)
          .neq("agent_slug", agentSlug)
          .maybeSingle();
        if (existingErr) return json(400, { error: existingErr.message });
        if (existing?.agent_slug) {
          return json(400, { error: `Keyword already in use by agent: ${existing.agent_slug}` });
        }
      }

      if (isDefault === true) {
        // Clear any existing default before setting a new one (unique partial index enforces correctness).
        const { error } = await admin
          .from("user_agent_configs")
          .update({ is_default: false })
          .eq("user_id", userId)
          .eq("is_default", true);
        if (error) return json(400, { error: error.message });
      }

      const upsertRow: Record<string, unknown> = {
        user_id: userId,
        agent_slug: agentSlug,
        is_ready: isReady,
        updated_at: new Date().toISOString(),
      };
      if (keyword !== undefined) upsertRow.keyword = keyword;
      if (model !== undefined) upsertRow.model = model;
      if (mode !== undefined) upsertRow.mode = mode;
      if (mcpServerIds !== undefined) upsertRow.mcp_server_ids = mcpServerIds;
      if (configJsonb !== undefined) upsertRow.config_jsonb = configJsonb;
      if (isDefault !== undefined) upsertRow.is_default = isDefault;

      // Write via service role so clients cannot forge is_ready/is_default/etc via direct table writes.
      const { data, error } = await admin
        .from("user_agent_configs")
        .upsert(upsertRow, { onConflict: "user_id,agent_slug" })
        .select("*")
        .maybeSingle();
      if (error) return json(400, { error: error.message });

      return json(200, { ok: true, config: data, is_ready: isReady });
    }

    return json(405, { error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleAgentConfigRequest(req));
}

import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createUserClient, requireUserId } from "../_shared/supabase.ts";

type FlowsDeps = {
  requireUserId: (req: Request) => Promise<string>;
  createUserClient: (authHeader: string) => ReturnType<typeof createUserClient>;
};

const defaultDeps: FlowsDeps = {
  requireUserId,
  createUserClient,
};

type FlowRow = {
  project_id?: string;
  project_name?: string | null;
  description?: string | null;
  workspace_id?: string | null;
  updated_at?: string | null;
};

type FlowSourceRow = {
  project_id?: string;
  source?: string | null;
  revision?: number | null;
  updated_at?: string | null;
};

type ValidateConstraintViolation = {
  path: string;
  message: string;
};

type ParsedRoute =
  | { kind: "validate" }
  | { kind: "flow"; namespace: string; flowId: string }
  | { kind: "unknown" };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function methodNotAllowed(allowed: string[]): Response {
  return json(405, { error: "Method not allowed", allowed });
}

function parseFlowPath(req: Request): ParsedRoute {
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("flows");
  if (idx < 0) return { kind: "unknown" };

  const first = parts[idx + 1] ?? "";
  const second = parts[idx + 2] ?? "";
  if (first === "validate") return { kind: "validate" };
  if (!first || !second) return { kind: "unknown" };
  return { kind: "flow", namespace: first, flowId: second };
}

function includeSource(req: Request): boolean {
  const { searchParams } = new URL(req.url);
  return searchParams.get("source") === "true";
}

function normalizeYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function extractTopLevelYamlField(source: string, field: string): string | null {
  const match = source.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  if (!match) return null;
  const value = normalizeYamlScalar(match[1] ?? "");
  return value.length > 0 ? value : null;
}

function validateFlowSource(source: string): ValidateConstraintViolation[] {
  const violations: ValidateConstraintViolation[] = [];
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    violations.push({ path: "source", message: "Flow source is required" });
    return violations;
  }

  const id = extractTopLevelYamlField(source, "id");
  if (!id) {
    violations.push({ path: "id", message: "Top-level id is required" });
  }

  const namespace = extractTopLevelYamlField(source, "namespace");
  if (!namespace) {
    violations.push({ path: "namespace", message: "Top-level namespace is required" });
  }

  if (!/^tasks:\s*$/m.test(source) && !/^tasks:\s+\S+/m.test(source)) {
    violations.push({ path: "tasks", message: "Top-level tasks is required" });
  }

  return violations;
}

async function readSourceFromRequest(req: Request): Promise<string> {
  const contentType = req.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null) as { source?: unknown } | null;
    if (typeof body?.source === "string") return body.source;
  }

  return await req.text();
}

function buildDefaultFlowSource(flowId: string, flowName: string, namespace: string): string {
  return `id: ${flowId}
namespace: ${namespace}

tasks:
  - id: hello
    type: io.kestra.plugin.core.log.Log
    message: "Hello from ${flowName}"`;
}

function toFlowResponse(
  row: FlowRow,
  fallbackFlowId: string,
  fallbackNamespace: string,
  sourceRow: FlowSourceRow | null,
  includeFlowSource: boolean,
): Record<string, unknown> {
  const namespace = typeof row.workspace_id === "string" && row.workspace_id.length > 0
    ? row.workspace_id
    : fallbackNamespace;
  const id = String(row.project_id ?? fallbackFlowId);
  const flowName = typeof row.project_name === "string" && row.project_name.length > 0
    ? row.project_name
    : `Flow ${id.slice(0, 8)}`;

  const payload: Record<string, unknown> = {
    id,
    namespace,
    revision: Number(sourceRow?.revision ?? 1),
    description: row.description ?? null,
    deleted: false,
    disabled: false,
    labels: [{ key: "name", value: flowName }],
    updated_at: sourceRow?.updated_at ?? row.updated_at ?? null,
  };

  if (includeFlowSource) {
    payload.source = sourceRow?.source ?? buildDefaultFlowSource(id, flowName, namespace);
  }

  return payload;
}

async function loadProjectRow(
  supabase: ReturnType<typeof createUserClient>,
  flowId: string,
): Promise<{ data: FlowRow | null; error: { message?: string } | null }> {
  const { data, error } = await supabase
    .from("projects")
    .select("project_id, project_name, description, workspace_id, updated_at")
    .eq("project_id", flowId)
    .maybeSingle();

  return {
    data: (data ?? null) as FlowRow | null,
    error: error ? { message: error.message } : null,
  };
}

async function loadFlowSourceRow(
  supabase: ReturnType<typeof createUserClient>,
  flowId: string,
): Promise<{ data: FlowSourceRow | null; error: { message?: string } | null }> {
  const { data, error } = await supabase
    .from("flow_sources")
    .select("project_id, source, revision, updated_at")
    .eq("project_id", flowId)
    .maybeSingle();

  return {
    data: (data ?? null) as FlowSourceRow | null,
    error: error ? { message: error.message } : null,
  };
}

async function saveFlowSourceRow(
  supabase: ReturnType<typeof createUserClient>,
  flowId: string,
  source: string,
  currentRevision: number,
): Promise<{ error: { message?: string } | null }> {
  const { error } = await supabase
    .from("flow_sources")
    .upsert({
      project_id: flowId,
      source,
      revision: currentRevision + 1,
    }, { onConflict: "project_id" });

  return { error: error ? { message: error.message } : null };
}

async function handleValidateRoute(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(["POST"]);
  const source = await readSourceFromRequest(req);
  const violations = validateFlowSource(source);
  return json(200, violations);
}

async function handleFlowRoute(
  req: Request,
  route: { namespace: string; flowId: string },
  supabase: ReturnType<typeof createUserClient>,
): Promise<Response> {
  if (req.method !== "GET" && req.method !== "PUT") {
    return methodNotAllowed(["GET", "PUT"]);
  }

  const projectResult = await loadProjectRow(supabase, route.flowId);
  if (projectResult.error) return json(400, { error: projectResult.error.message });
  if (!projectResult.data) return json(404, { error: "Flow not found" });

  const row = projectResult.data;
  const sourceResult = await loadFlowSourceRow(supabase, route.flowId);
  if (sourceResult.error) return json(400, { error: sourceResult.error.message });

  if (req.method === "PUT") {
    const source = await readSourceFromRequest(req);
    const violations = validateFlowSource(source);
    if (violations.length > 0) {
      return json(400, { error: "Invalid flow source", violations });
    }

    const currentRevision = Number(sourceResult.data?.revision ?? 0);
    const saveResult = await saveFlowSourceRow(supabase, route.flowId, source, currentRevision);
    if (saveResult.error) return json(400, { error: saveResult.error.message });

    const updatedSourceResult = await loadFlowSourceRow(supabase, route.flowId);
    if (updatedSourceResult.error) return json(400, { error: updatedSourceResult.error.message });

    const payload = toFlowResponse(row, route.flowId, route.namespace, updatedSourceResult.data, true);
    return json(200, payload);
  }

  const payload = toFlowResponse(row, route.flowId, route.namespace, sourceResult.data, includeSource(req));
  return json(200, payload);
}

export {
  parseFlowPath,
  readSourceFromRequest,
  validateFlowSource,
};

export async function handleFlowsRequest(
  req: Request,
  deps: FlowsDeps = defaultDeps,
): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  const parsedPath = parseFlowPath(req);
  if (parsedPath.kind === "unknown") {
    return json(400, { error: "Expected path /flows/validate or /flows/{namespace}/{id}" });
  }

  try {
    await deps.requireUserId(req);

    if (parsedPath.kind === "validate") {
      return await handleValidateRoute(req);
    }

    const supabase = deps.createUserClient(authHeader);
    return await handleFlowRoute(req, parsedPath, supabase);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleFlowsRequest(req));
}

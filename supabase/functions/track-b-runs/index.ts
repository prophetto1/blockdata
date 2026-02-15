import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { sha256HexOfString } from "../_shared/hash.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

type TrackBRunDeps = {
  requireUserId: (req: Request) => Promise<string>;
  createAdminClient: () => ReturnType<typeof createAdminClient>;
};

const defaultDeps: TrackBRunDeps = {
  requireUserId,
  createAdminClient,
};

type FlowMode = "transform" | "extract";

type RunCreatePayload = {
  workspace_id: string;
  project_id: string;
  flow_mode: FlowMode;
  selected_source_uids: string[];
  workflow_uid?: string;
  workflow_template_key?: string;
  user_schema_uid?: string;
};

type TrackBAuditEvent = {
  workspace_id: string;
  project_id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  detail_json: Record<string, unknown>;
  occurred_at: string;
};

type ParseResult =
  | { ok: true; value: RunCreatePayload }
  | { ok: false; error: string };

type RunDocRow = {
  source_uid: string;
  status: string;
  step_indexed_at: string | null;
  step_downloaded_at: string | null;
  step_partitioned_at: string | null;
  step_chunked_at: string | null;
  step_embedded_at: string | null;
  step_uploaded_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type ArtifactRow = {
  source_uid: string;
  step_name: string;
  artifact_type: string;
  storage_bucket: string;
  storage_key: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

type SourceRow = {
  source_uid: string;
  source_type: string;
  source_locator: string;
};

export type RunDocRowWithSourceAccess = RunDocRow & {
  source_type: string | null;
  source_locator: string | null;
  source_signed_url: string | null;
  source_signed_url_error: string | null;
  source_signed_url_expires_in_seconds: number | null;
};

export type ArtifactRowWithSignedUrl = ArtifactRow & {
  signed_url: string | null;
  signed_url_error: string | null;
  signed_url_expires_in_seconds: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_UID_RE = /^[0-9a-f]{64}$/i;
const SIGNED_URL_TTL_SECONDS = 600;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function asTrimmedString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isSourceUid(value: string): boolean {
  return SOURCE_UID_RE.test(value);
}

function getDocumentsBucketName(): string {
  return Deno.env.get("DOCUMENTS_BUCKET")?.trim() || "documents";
}

export async function attachSignedUrlsToArtifacts(input: {
  supabaseAdmin: ReturnType<typeof createAdminClient>;
  artifacts: ArtifactRow[];
  expiresInSeconds?: number;
}): Promise<ArtifactRowWithSignedUrl[]> {
  const expiresInSeconds = input.expiresInSeconds ?? SIGNED_URL_TTL_SECONDS;
  return await Promise.all(input.artifacts.map(async (artifact) => {
    const { data, error } = await input.supabaseAdmin.storage
      .from(artifact.storage_bucket)
      .createSignedUrl(artifact.storage_key, expiresInSeconds);
    return {
      ...artifact,
      signed_url: data?.signedUrl ?? null,
      signed_url_error: error?.message ?? null,
      signed_url_expires_in_seconds: expiresInSeconds,
    };
  }));
}

export async function attachSourceAccessToRunDocs(input: {
  supabaseAdmin: ReturnType<typeof createAdminClient>;
  project_id: string;
  docs: RunDocRow[];
  expiresInSeconds?: number;
  documentsBucket?: string;
}): Promise<RunDocRowWithSourceAccess[]> {
  if (input.docs.length === 0) return [];
  const expiresInSeconds = input.expiresInSeconds ?? SIGNED_URL_TTL_SECONDS;
  const sourceUids = Array.from(new Set(input.docs.map((doc) => doc.source_uid)));
  const { data: sourceRows, error: sourceErr } = await input.supabaseAdmin
    .from("documents_v2")
    .select("source_uid, source_type, source_locator")
    .eq("project_id", input.project_id)
    .in("source_uid", sourceUids);

  if (sourceErr) {
    throw new Error(`Failed to load source locators: ${sourceErr.message}`);
  }

  const sourceByUid = new Map<string, SourceRow>(
    ((sourceRows ?? []) as SourceRow[]).map((row) => [row.source_uid, row]),
  );
  const documentsBucket = input.documentsBucket ?? getDocumentsBucketName();

  return await Promise.all(input.docs.map(async (doc) => {
    const source = sourceByUid.get(doc.source_uid);
    if (!source) {
      return {
        ...doc,
        source_type: null,
        source_locator: null,
        source_signed_url: null,
        source_signed_url_error: "source_not_found_in_project",
        source_signed_url_expires_in_seconds: null,
      };
    }

    if (source.source_type !== "pdf") {
      return {
        ...doc,
        source_type: source.source_type,
        source_locator: source.source_locator,
        source_signed_url: null,
        source_signed_url_error: null,
        source_signed_url_expires_in_seconds: null,
      };
    }

    const { data, error } = await input.supabaseAdmin.storage
      .from(documentsBucket)
      .createSignedUrl(source.source_locator, expiresInSeconds);
    return {
      ...doc,
      source_type: source.source_type,
      source_locator: source.source_locator,
      source_signed_url: data?.signedUrl ?? null,
      source_signed_url_error: error?.message ?? null,
      source_signed_url_expires_in_seconds: expiresInSeconds,
    };
  }));
}

export function stableStringify(value: unknown): string {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const key of keys) {
    parts.push(`${JSON.stringify(key)}:${stableStringify(obj[key])}`);
  }
  return `{${parts.join(",")}}`;
}

export async function computeRequestFingerprint(
  payload: unknown,
): Promise<string> {
  return sha256HexOfString(stableStringify(payload));
}

export function buildIdempotencyScope(input: {
  workspace_id: string;
  actor_id: string;
  endpoint_path: string;
}): string {
  return `${input.workspace_id}:${input.actor_id}:${input.endpoint_path}`;
}

export function buildTrackBAuditEvent(
  input: TrackBAuditEvent,
): TrackBAuditEvent {
  return {
    workspace_id: input.workspace_id,
    project_id: input.project_id,
    actor_id: input.actor_id,
    action: input.action,
    target_type: input.target_type,
    target_id: input.target_id,
    detail_json: input.detail_json,
    occurred_at: input.occurred_at,
  };
}

export async function insertTrackBAuditEvent(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  row: TrackBAuditEvent,
): Promise<string | null> {
  const { error } = await supabaseAdmin.from("track_b_audit_events_v2").insert(
    row,
  );
  return error?.message ?? null;
}

export function parseRunCreatePayload(input: unknown): ParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid JSON body" };
  }
  const body = input as Record<string, unknown>;

  const workspace_id = asTrimmedString(body.workspace_id);
  if (!workspace_id || !isUuid(workspace_id)) {
    return { ok: false, error: "workspace_id must be a UUID" };
  }

  const project_id = asTrimmedString(body.project_id);
  if (!project_id || !isUuid(project_id)) {
    return { ok: false, error: "project_id must be a UUID" };
  }

  const flow_mode = asTrimmedString(body.flow_mode);
  if (flow_mode !== "transform" && flow_mode !== "extract") {
    return { ok: false, error: "flow_mode must be transform or extract" };
  }

  if (
    !Array.isArray(body.selected_source_uids) ||
    body.selected_source_uids.length === 0
  ) {
    return {
      ok: false,
      error: "selected_source_uids must be a non-empty array",
    };
  }
  const selected_source_uids: string[] = [];
  const unique = new Set<string>();
  for (const item of body.selected_source_uids) {
    const uid = asTrimmedString(item);
    if (!uid || !isSourceUid(uid)) {
      return {
        ok: false,
        error: "selected_source_uids must contain 64-char hex source_uids",
      };
    }
    if (unique.has(uid)) {
      return { ok: false, error: "selected_source_uids must be unique" };
    }
    unique.add(uid);
    selected_source_uids.push(uid);
  }

  const workflow_uid = asTrimmedString(body.workflow_uid) ?? undefined;
  const workflow_template_key = asTrimmedString(body.workflow_template_key) ??
    undefined;
  if (workflow_uid && !isUuid(workflow_uid)) {
    return { ok: false, error: "workflow_uid must be a UUID when provided" };
  }
  if (!workflow_uid && !workflow_template_key) {
    return {
      ok: false,
      error: "Either workflow_uid or workflow_template_key is required",
    };
  }

  const user_schema_uid = asTrimmedString(body.user_schema_uid) ?? undefined;
  if (flow_mode === "extract" && !user_schema_uid) {
    return {
      ok: false,
      error: "user_schema_uid is required for flow_mode=extract",
    };
  }
  if (user_schema_uid && !isUuid(user_schema_uid)) {
    return { ok: false, error: "user_schema_uid must be a UUID when provided" };
  }

  return {
    ok: true,
    value: {
      workspace_id,
      project_id,
      flow_mode,
      selected_source_uids,
      workflow_uid,
      workflow_template_key,
      user_schema_uid,
    },
  };
}

export async function handleTrackBRunsRequest(
  req: Request,
  deps: TrackBRunDeps = defaultDeps,
): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (
    req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE"
  ) {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  try {
    if (req.method === "GET" || req.method === "DELETE") {
      const actorId = await deps.requireUserId(req);
      const supabaseAdmin = deps.createAdminClient();
      const url = new URL(req.url);
      const workspace_id = asTrimmedString(
        url.searchParams.get("workspace_id"),
      );
      const run_uid = asTrimmedString(url.searchParams.get("run_uid"));
      if (!workspace_id || !run_uid) {
        return json(400, { error: "workspace_id and run_uid are required" });
      }
      if (!isUuid(workspace_id) || !isUuid(run_uid)) {
        return json(400, { error: "workspace_id and run_uid must be UUIDs" });
      }

      const { data: membership, error: membershipErr } = await supabaseAdmin
        .from("workspace_b_memberships_v2")
        .select("workspace_id, user_id, status")
        .eq("workspace_id", workspace_id)
        .eq("user_id", actorId)
        .eq("status", "active")
        .maybeSingle();
      if (membershipErr) return json(400, { error: membershipErr.message });
      if (!membership) {
        return json(403, {
          error: "Forbidden workspace",
          code: "WORKSPACE_ACCESS_DENIED",
        });
      }

      const { data: runRow, error: runErr } = await supabaseAdmin
        .from("unstructured_workflow_runs_v2")
        .select(
          "run_uid, workspace_id, project_id, workflow_uid, flow_mode, status, accepted_count, rejected_count, error, started_at, ended_at, created_at, updated_at",
        )
        .eq("workspace_id", workspace_id)
        .eq("run_uid", run_uid)
        .maybeSingle();
      if (runErr) return json(400, { error: runErr.message });
      if (!runRow) {
        return json(404, { error: "run_uid not found in workspace" });
      }

      if (req.method === "DELETE") {
        if (
          runRow.status === "success" || runRow.status === "partial_success" ||
          runRow.status === "failed"
        ) {
          return json(409, {
            error: "Cannot cancel terminal run",
            code: "RUN_ALREADY_TERMINAL",
          });
        }

        const { error: cancelDocsErr } = await supabaseAdmin
          .from("unstructured_run_docs_v2")
          .update({
            status: "cancelled",
            error: "cancelled_by_user",
          })
          .eq("run_uid", run_uid)
          .neq("status", "success")
          .neq("status", "failed")
          .neq("status", "cancelled");
        if (cancelDocsErr) return json(400, { error: cancelDocsErr.message });

        const { error: cancelRunErr } = await supabaseAdmin
          .from("unstructured_workflow_runs_v2")
          .update({
            status: "cancelled",
            ended_at: new Date().toISOString(),
            error: "cancelled_by_user",
          })
          .eq("workspace_id", workspace_id)
          .eq("run_uid", run_uid);
        if (cancelRunErr) return json(400, { error: cancelRunErr.message });

        const cancelAuditErr = await insertTrackBAuditEvent(
          supabaseAdmin,
          buildTrackBAuditEvent({
            workspace_id,
            project_id: runRow.project_id,
            actor_id: actorId,
            action: "run_cancel",
            target_type: "track_b_run",
            target_id: run_uid,
            detail_json: {},
            occurred_at: new Date().toISOString(),
          }),
        );
        if (cancelAuditErr) {
          return json(500, {
            error: `Failed to write audit event: ${cancelAuditErr}`,
          });
        }

        return json(200, {
          run_uid,
          status: "cancelled",
        });
      }

      const { data: docs, error: docsErr } = await supabaseAdmin
        .from("unstructured_run_docs_v2")
        .select(
          "source_uid, status, step_indexed_at, step_downloaded_at, step_partitioned_at, step_chunked_at, step_embedded_at, step_uploaded_at, error, created_at, updated_at",
        )
        .eq("run_uid", run_uid)
        .order("source_uid", { ascending: true });
      if (docsErr) return json(400, { error: docsErr.message });

      const { data: artifacts, error: artifactsErr } = await supabaseAdmin
        .from("unstructured_step_artifacts_v2")
        .select(
          "source_uid, step_name, artifact_type, storage_bucket, storage_key, content_type, size_bytes, created_at",
        )
        .eq("run_uid", run_uid)
        .order("created_at", { ascending: true });
      if (artifactsErr) return json(400, { error: artifactsErr.message });

      const docsWithSourceAccess = await attachSourceAccessToRunDocs({
        supabaseAdmin,
        project_id: runRow.project_id,
        docs: (docs ?? []) as RunDocRow[],
      });
      const artifactsWithSignedUrls = await attachSignedUrlsToArtifacts({
        supabaseAdmin,
        artifacts: (artifacts ?? []) as ArtifactRow[],
      });

      return json(200, {
        run: runRow,
        docs: docsWithSourceAccess,
        artifacts: artifactsWithSignedUrls,
      });
    }

    const idempotencyKey = asTrimmedString(req.headers.get("Idempotency-Key"));
    if (!idempotencyKey) {
      return json(400, {
        error: "Missing Idempotency-Key header",
        code: "IDEMPOTENCY_KEY_REQUIRED",
      });
    }
    const actorId = await deps.requireUserId(req);

    const body = await req.json().catch(() => ({}));
    const parsed = parseRunCreatePayload(body);
    if (!parsed.ok) return json(400, { error: parsed.error });

    const payload = parsed.value;
    const endpointPath =
      `/api/v1/workspaces/${payload.workspace_id}/track-b/runs`;
    const idempotencyScope = buildIdempotencyScope({
      workspace_id: payload.workspace_id,
      actor_id: actorId,
      endpoint_path: endpointPath,
    });
    const requestFingerprint = await computeRequestFingerprint(payload);
    const supabaseAdmin = deps.createAdminClient();

    const { data: membership, error: membershipErr } = await supabaseAdmin
      .from("workspace_b_memberships_v2")
      .select("workspace_id, user_id, status")
      .eq("workspace_id", payload.workspace_id)
      .eq("user_id", actorId)
      .eq("status", "active")
      .maybeSingle();
    if (membershipErr) return json(400, { error: membershipErr.message });
    if (!membership) {
      return json(403, {
        error: "Forbidden workspace",
        code: "WORKSPACE_ACCESS_DENIED",
      });
    }

    const { data: projectRow, error: projectErr } = await supabaseAdmin
      .from("projects")
      .select("project_id, workspace_id")
      .eq("project_id", payload.project_id)
      .maybeSingle();
    if (projectErr) return json(400, { error: projectErr.message });
    if (!projectRow) return json(404, { error: "project_id not found" });
    if (projectRow.workspace_id !== payload.workspace_id) {
      return json(403, {
        error: "project_id is not within workspace_id",
        code: "PROJECT_SCOPE_MISMATCH",
      });
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("unstructured_workflow_runs_v2")
      .select(
        "run_uid, status, accepted_count, rejected_count, request_fingerprint",
      )
      .eq("workspace_id", payload.workspace_id)
      .eq("idempotency_scope", idempotencyScope)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingErr) return json(400, { error: existingErr.message });
    if (existing) {
      if (existing.request_fingerprint !== requestFingerprint) {
        return json(409, {
          error: "Idempotency-Key replay fingerprint mismatch",
          code: "IDEMPOTENCY_FINGERPRINT_MISMATCH",
        });
      }
      return json(200, {
        run_uid: existing.run_uid,
        status: existing.status,
        accepted_count: existing.accepted_count,
        rejected_count: existing.rejected_count,
      });
    }

    const { data: sourceRows, error: sourceErr } = await supabaseAdmin
      .from("documents_v2")
      .select("source_uid")
      .eq("project_id", payload.project_id)
      .in("source_uid", payload.selected_source_uids);
    if (sourceErr) return json(400, { error: sourceErr.message });

    const acceptedSet = new Set<string>(
      (sourceRows ?? []).map((row: { source_uid: string }) => row.source_uid),
    );
    const accepted = payload.selected_source_uids.filter((uid) =>
      acceptedSet.has(uid)
    );
    const rejected = payload.selected_source_uids
      .filter((uid) => !acceptedSet.has(uid))
      .map((uid) => ({ source_uid: uid, reason: "not_found_in_project" }));

    if (accepted.length === 0) {
      return json(400, {
        error: "No selected_source_uids belong to project_id",
        code: "NO_ACCEPTED_DOCUMENTS",
        accepted_count: 0,
        rejected_count: rejected.length,
        rejected,
      });
    }

    const { data: runRow, error: runErr } = await supabaseAdmin
      .from("unstructured_workflow_runs_v2")
      .insert({
        workspace_id: payload.workspace_id,
        workflow_uid: payload.workflow_uid ?? null,
        project_id: payload.project_id,
        owner_id: actorId,
        flow_mode: payload.flow_mode,
        status: "queued",
        idempotency_scope: idempotencyScope,
        idempotency_key: idempotencyKey,
        request_fingerprint: requestFingerprint,
        accepted_count: accepted.length,
        rejected_count: rejected.length,
      })
      .select("run_uid, status, accepted_count, rejected_count")
      .single();
    if (runErr) {
      if (
        runErr.message.includes(
          "unstructured_workflow_runs_v2_idempotency_unique",
        )
      ) {
        const { data: collision } = await supabaseAdmin
          .from("unstructured_workflow_runs_v2")
          .select(
            "run_uid, status, accepted_count, rejected_count, request_fingerprint",
          )
          .eq("workspace_id", payload.workspace_id)
          .eq("idempotency_scope", idempotencyScope)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        if (collision?.request_fingerprint === requestFingerprint) {
          return json(200, {
            run_uid: collision.run_uid,
            status: collision.status,
            accepted_count: collision.accepted_count,
            rejected_count: collision.rejected_count,
          });
        }
        return json(409, {
          error: "Idempotency-Key replay fingerprint mismatch",
          code: "IDEMPOTENCY_FINGERPRINT_MISMATCH",
        });
      }
      return json(400, { error: runErr.message });
    }

    const run_uid = runRow.run_uid as string;
    const runDocs = accepted.map((source_uid) => ({
      run_uid,
      source_uid,
      status: "queued",
    }));
    const { error: runDocsErr } = await supabaseAdmin.from(
      "unstructured_run_docs_v2",
    ).insert(runDocs);
    if (runDocsErr) {
      await supabaseAdmin.from("unstructured_workflow_runs_v2").delete().eq(
        "run_uid",
        run_uid,
      );
      return json(500, {
        error: `Failed to persist run docs: ${runDocsErr.message}`,
      });
    }

    await supabaseAdmin.from("unstructured_state_events_v2").insert({
      run_uid,
      entity_type: "run",
      from_status: null,
      to_status: "queued",
      detail_json: {
        flow_mode: payload.flow_mode,
        accepted_count: accepted.length,
        rejected_count: rejected.length,
      },
    });

    const createAuditErr = await insertTrackBAuditEvent(
      supabaseAdmin,
      buildTrackBAuditEvent({
        workspace_id: payload.workspace_id,
        project_id: payload.project_id,
        actor_id: actorId,
        action: "run_create",
        target_type: "track_b_run",
        target_id: run_uid,
        detail_json: {
          flow_mode: payload.flow_mode,
          accepted_count: runRow.accepted_count,
          rejected_count: runRow.rejected_count,
        },
        occurred_at: new Date().toISOString(),
      }),
    );
    if (createAuditErr) {
      return json(500, {
        error: `Failed to write audit event: ${createAuditErr}`,
      });
    }

    return json(202, {
      run_uid: runRow.run_uid,
      status: runRow.status,
      accepted_count: runRow.accepted_count,
      rejected_count: runRow.rejected_count,
      rejected,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (
      message.toLowerCase().includes("invalid auth") ||
      message.toLowerCase().includes("missing authorization")
    ) {
      return json(401, { error: message });
    }
    return json(500, { error: message });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleTrackBRunsRequest(req));
}

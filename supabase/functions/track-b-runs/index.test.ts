import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachSignedUrlsToArtifacts,
  attachSourceAccessToRunDocs,
  buildIdempotencyScope,
  buildTrackBAuditEvent,
  computeRequestFingerprint,
  handleTrackBRunsRequest,
  insertTrackBAuditEvent,
  parseRunCreatePayload,
  validateWorkflowScope,
} from "./index.ts";

Deno.test("computeRequestFingerprint is stable across object key order", async () => {
  const a = {
    project_id: "11111111-1111-1111-1111-111111111111",
    flow_mode: "transform",
    selected_source_uids: ["a", "b"],
    workflow_template_key: "default",
  };
  const b = {
    selected_source_uids: ["a", "b"],
    workflow_template_key: "default",
    flow_mode: "transform",
    project_id: "11111111-1111-1111-1111-111111111111",
  };

  const fpA = await computeRequestFingerprint(a);
  const fpB = await computeRequestFingerprint(b);
  assertEquals(fpA, fpB);
});

Deno.test("parseRunCreatePayload rejects extract runs without user_schema_uid", () => {
  const result = parseRunCreatePayload({
    workspace_id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    flow_mode: "extract",
    selected_source_uids: [
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ],
    workflow_template_key: "track-b-default",
  });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(
    result.error,
    "user_schema_uid is required for flow_mode=extract",
  );
});

Deno.test("parseRunCreatePayload accepts transform runs with unique selected_source_uids", () => {
  const result = parseRunCreatePayload({
    workspace_id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    flow_mode: "transform",
    selected_source_uids: [
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    ],
    workflow_template_key: "track-b-default",
  });
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.selected_source_uids.length, 2);
});

Deno.test("parseRunCreatePayload validates extract user_schema_uid as 64-char hex", () => {
  const result = parseRunCreatePayload({
    workspace_id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    flow_mode: "extract",
    selected_source_uids: [
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ],
    workflow_template_key: "track-b-default",
    user_schema_uid: "not-a-schema-uid",
  });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(
    result.error,
    "user_schema_uid must be a 64-char hex schema_uid when provided",
  );
});

Deno.test("parseRunCreatePayload rejects duplicate selected_source_uids", () => {
  const uid =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const result = parseRunCreatePayload({
    workspace_id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    flow_mode: "transform",
    selected_source_uids: [uid, uid],
    workflow_template_key: "track-b-default",
  });
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.error, "selected_source_uids must be unique");
});

Deno.test("buildIdempotencyScope scopes by workspace, actor, and endpoint path", () => {
  const scope = buildIdempotencyScope({
    workspace_id: "workspace-a",
    actor_id: "00000000-0000-0000-0000-000000000123",
    endpoint_path: "/api/v1/workspaces/workspace-a/track-b/runs",
  });
  assertEquals(
    scope,
    "workspace-a:00000000-0000-0000-0000-000000000123:/api/v1/workspaces/workspace-a/track-b/runs",
  );
});

Deno.test("validateWorkflowScope enforces workflow scope and active state", () => {
  const ok = validateWorkflowScope({
    workflow_uid: "33333333-3333-3333-3333-333333333333",
    workspace_id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    row: {
      workflow_uid: "33333333-3333-3333-3333-333333333333",
      workspace_id: "22222222-2222-2222-2222-222222222222",
      project_id: null,
      is_active: true,
    },
  });
  assertEquals(ok.ok, true);

  const inactive = validateWorkflowScope({
    workflow_uid: "33333333-3333-3333-3333-333333333333",
    workspace_id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    row: {
      workflow_uid: "33333333-3333-3333-3333-333333333333",
      workspace_id: "22222222-2222-2222-2222-222222222222",
      project_id: null,
      is_active: false,
    },
  });
  assertEquals(inactive.ok, false);
  if (inactive.ok) return;
  assertEquals(inactive.code, "WORKFLOW_INACTIVE");
});

Deno.test("handleTrackBRunsRequest requires Idempotency-Key header", async () => {
  const req = new Request("https://example.com/functions/v1/track-b-runs", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const resp = await handleTrackBRunsRequest(req);
  const body = await resp.json();
  assertEquals(resp.status, 400);
  assertEquals(body.code, "IDEMPOTENCY_KEY_REQUIRED");
});

Deno.test("handleTrackBRunsRequest requires Authorization header", async () => {
  const req = new Request("https://example.com/functions/v1/track-b-runs", {
    method: "POST",
    headers: {
      "Idempotency-Key": "abc-123",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const resp = await handleTrackBRunsRequest(req);
  const body = await resp.json();
  assertEquals(resp.status, 401);
  assertEquals(body.error, "Missing Authorization header");
});

Deno.test("handleTrackBRunsRequest GET requires workspace_id and run_uid query params", async () => {
  const req = new Request("https://example.com/functions/v1/track-b-runs", {
    method: "GET",
    headers: {
      Authorization: "Bearer token",
    },
  });
  const resp = await handleTrackBRunsRequest(req, {
    requireUserId: () =>
      Promise.resolve("00000000-0000-0000-0000-000000000123"),
    createAdminClient: (() => ({})) as never,
  });
  const body = await resp.json();
  assertEquals(resp.status, 400);
  assertEquals(body.error, "workspace_id and run_uid are required");
});

Deno.test("handleTrackBRunsRequest DELETE requires workspace_id and run_uid query params", async () => {
  const req = new Request("https://example.com/functions/v1/track-b-runs", {
    method: "DELETE",
    headers: {
      Authorization: "Bearer token",
    },
  });
  const resp = await handleTrackBRunsRequest(req, {
    requireUserId: () =>
      Promise.resolve("00000000-0000-0000-0000-000000000123"),
    createAdminClient: (() => ({})) as never,
  });
  const body = await resp.json();
  assertEquals(resp.status, 400);
  assertEquals(body.error, "workspace_id and run_uid are required");
});

Deno.test("handleTrackBRunsRequest returns 503 when Track B API is disabled by runtime policy", async () => {
  const req = new Request(
    "https://example.com/functions/v1/track-b-runs?workspace_id=22222222-2222-2222-2222-222222222222&run_uid=33333333-3333-3333-3333-333333333333",
    {
      method: "GET",
      headers: {
        Authorization: "Bearer token",
      },
    },
  );
  const resp = await handleTrackBRunsRequest(req, {
    requireUserId: () =>
      Promise.resolve("00000000-0000-0000-0000-000000000123"),
    createAdminClient: (() => ({})) as never,
    loadRuntimePolicy: () =>
      Promise.resolve({
        track_b: {
          api_enabled: false,
        },
      }),
  });
  const body = await resp.json();
  assertEquals(resp.status, 503);
  assertEquals(body.code, "TRACK_B_API_DISABLED");
});

Deno.test("buildTrackBAuditEvent shapes audit row with required fields", () => {
  const now = "2026-02-14T00:00:00.000Z";
  const row = buildTrackBAuditEvent({
    workspace_id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    actor_id: "00000000-0000-0000-0000-000000000123",
    action: "run_create",
    target_type: "track_b_run",
    target_id: "33333333-3333-3333-3333-333333333333",
    detail_json: { flow_mode: "transform" },
    occurred_at: now,
  });
  assertEquals(row.workspace_id, "22222222-2222-2222-2222-222222222222");
  assertEquals(row.project_id, "11111111-1111-1111-1111-111111111111");
  assertEquals(row.actor_id, "00000000-0000-0000-0000-000000000123");
  assertEquals(row.action, "run_create");
  assertEquals(row.target_type, "track_b_run");
  assertEquals(row.target_id, "33333333-3333-3333-3333-333333333333");
  assertEquals(row.detail_json.flow_mode, "transform");
  assertEquals(row.occurred_at, now);
});

Deno.test("insertTrackBAuditEvent returns error when insert fails", async () => {
  const fakeAdmin = {
    from: () => ({
      insert: () => Promise.resolve({ error: { message: "boom" } }),
    }),
  };
  const row = buildTrackBAuditEvent({
    workspace_id: "22222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    actor_id: "00000000-0000-0000-0000-000000000123",
    action: "run_create",
    target_type: "track_b_run",
    target_id: "33333333-3333-3333-3333-333333333333",
    detail_json: {},
    occurred_at: "2026-02-14T00:00:00.000Z",
  });

  const err = await insertTrackBAuditEvent(fakeAdmin as never, row);
  assertEquals(err, "boom");
});

Deno.test("attachSignedUrlsToArtifacts includes signed URLs and keeps metadata", async () => {
  const fakeAdmin = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: (key: string, expiresInSeconds: number) =>
          Promise.resolve({
            data: {
              signedUrl: `https://signed.example/${bucket}/${key}?ttl=${expiresInSeconds}`,
            },
            error: null,
          }),
      }),
    },
  };

  const rows = await attachSignedUrlsToArtifacts({
    supabaseAdmin: fakeAdmin as never,
    artifacts: [{
      source_uid:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      step_name: "preview",
      artifact_type: "preview_manifest_json",
      storage_bucket: "documents",
      storage_key: "workspace_b/ws/run/doc/preview.json",
      content_type: "application/json",
      size_bytes: 123,
      created_at: "2026-02-15T00:00:00.000Z",
    }],
    expiresInSeconds: 90,
  });

  assertEquals(rows.length, 1);
  assertEquals(rows[0].signed_url?.includes("preview.json"), true);
  assertEquals(rows[0].signed_url_expires_in_seconds, 90);
  assertEquals(rows[0].artifact_type, "preview_manifest_json");
});

Deno.test("attachSourceAccessToRunDocs signs PDF docs and keeps non-PDF rows unsigned", async () => {
  const fakeAdmin = {
    from: (table: string) => {
      if (table !== "documents_v2") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            in: () =>
              Promise.resolve({
                data: [{
                  source_uid:
                    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                  source_type: "pdf",
                  source_locator: "source/path/doc-a.pdf",
                }, {
                  source_uid:
                    "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
                  source_type: "docx",
                  source_locator: "source/path/doc-b.docx",
                }],
                error: null,
              }),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        createSignedUrl: (key: string, expiresInSeconds: number) =>
          Promise.resolve({
            data: {
              signedUrl: `https://signed.example/${key}?ttl=${expiresInSeconds}`,
            },
            error: null,
          }),
      }),
    },
  };

  const rows = await attachSourceAccessToRunDocs({
    supabaseAdmin: fakeAdmin as never,
    project_id: "11111111-1111-1111-1111-111111111111",
    documentsBucket: "documents",
    docs: [{
      source_uid:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      status: "success",
      step_indexed_at: null,
      step_downloaded_at: null,
      step_partitioned_at: null,
      step_enriched_at: null,
      step_chunked_at: null,
      step_extracted_at: null,
      step_embedded_at: null,
      step_uploaded_at: null,
      error: null,
      created_at: "2026-02-15T00:00:00.000Z",
      updated_at: "2026-02-15T00:00:00.000Z",
    }, {
      source_uid:
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      status: "success",
      step_indexed_at: null,
      step_downloaded_at: null,
      step_partitioned_at: null,
      step_enriched_at: null,
      step_chunked_at: null,
      step_extracted_at: null,
      step_embedded_at: null,
      step_uploaded_at: null,
      error: null,
      created_at: "2026-02-15T00:00:00.000Z",
      updated_at: "2026-02-15T00:00:00.000Z",
    }],
    expiresInSeconds: 75,
  });

  assertEquals(rows.length, 2);
  const pdfRow = rows.find((row) => row.source_type === "pdf");
  const docxRow = rows.find((row) => row.source_type === "docx");
  assertEquals(!!pdfRow?.source_signed_url, true);
  assertEquals(pdfRow?.source_signed_url_expires_in_seconds, 75);
  assertEquals(docxRow?.source_signed_url, null);
  assertEquals(docxRow?.source_signed_url_expires_in_seconds, null);
});

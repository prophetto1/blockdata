import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { requireEnv as defaultRequireEnv } from "../_shared/env.ts";
import { sha256HexOfString } from "../_shared/hash.ts";
import { loadRuntimePolicy as defaultLoadRuntimePolicy } from "../_shared/admin_policy.ts";
import { createAdminClient as defaultCreateAdminClient } from "../_shared/supabase.ts";
import { decryptApiKey } from "../_shared/api_key_crypto.ts";
import { callVertexClaude } from "../_shared/vertex_claude.ts";

type WorkerDeps = {
  requireEnv: (name: string) => string;
  createAdminClient: () => ReturnType<typeof defaultCreateAdminClient>;
  loadRuntimePolicy?: (
    supabaseAdmin: ReturnType<typeof defaultCreateAdminClient>,
  ) => Promise<{ track_b: { worker_enabled: boolean } }>;
};

const defaultDeps: WorkerDeps = {
  requireEnv: defaultRequireEnv,
  createAdminClient: defaultCreateAdminClient,
  loadRuntimePolicy: defaultLoadRuntimePolicy,
};

type WorkerPayload = {
  batch_size: number;
};

type RunTerminalStatus = "success" | "partial_success" | "failed";
type FlowMode = "transform" | "extract";

type TrackBIds = {
  u_doc_uid: string;
  canonical_doc_uid: string;
  u_block_uid: string;
  canonical_block_uid: string;
};

type TaxonomyRow = {
  raw_element_type: string;
  platform_block_type: string;
  is_fallback: boolean | null;
};

type PartitionElement = {
  raw_element_type: string;
  text: string;
  raw_element_id: string | null;
  page_number: number | null;
  metadata_json: Record<string, unknown>;
  coordinates_json: Record<string, unknown> | null;
  raw_payload: Record<string, unknown>;
};

type PartitionServiceRequest = {
  source_uid: string;
  source_type: string;
  source_locator: string;
  doc_title: string | null;
  partition_parameters: {
    coordinates: boolean;
    strategy: "auto" | "hi_res";
    output_format: "application/json";
    unique_element_ids: boolean;
    chunking_strategy: "by_title" | null;
  };
};

type ChunkRecord = {
  chunk_ordinal: number;
  text: string;
  source_element_ordinals: number[];
};

type ChunkEmbeddingRecord = {
  chunk_ordinal: number;
  text: string;
  vector: number[];
};

type VertexServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type VertexEmbeddingConfig = {
  projectId: string;
  location: string;
  model: string;
  timeoutMs: number;
  batchSize: number;
  serviceAccount: VertexServiceAccount;
};

type ChunkEmbeddingBuildResult = {
  rows: ChunkEmbeddingRecord[];
  usage: {
    provider: "vertex_ai";
    model: string;
    request_count: number;
    prompt_token_count: number;
  };
};

const TEXT_ENCODER = new TextEncoder();
let vertexAccessTokenCache: { token: string; expiresAtMs: number } | null = null;

export type EnricherNodeName =
  | "image_description"
  | "table_description"
  | "table_to_html"
  | "ner"
  | "generative_ocr";

export type EnricherSkipReason =
  | "skipped_not_applicable"
  | "skipped_no_image_base64"
  | "disabled_by_policy"
  | "missing_provider_key";

type WorkflowExecutionConfig = {
  enrichers: Record<EnricherNodeName, boolean>;
  embedding: {
    enabled: boolean;
  };
};

type WorkflowConfigResult =
  | { ok: true; value: WorkflowExecutionConfig }
  | { ok: false; error: string };

type EnricherApplyResult = {
  node: EnricherNodeName;
  status: "applied" | "skipped";
  skip_reason: EnricherSkipReason | null;
  eligible_count: number;
  applied_count: number;
  elements: PartitionElement[];
  detail: Record<string, unknown>;
};

const TRACK_REQUIRED_ENRICHERS: EnricherNodeName[] = [
  "image_description",
  "table_description",
  "table_to_html",
  "ner",
  "generative_ocr",
];

export const DOC_STATUS_EXECUTION_ORDER_BY_FLOW = {
  transform: [
    "indexing",
    "downloading",
    "partitioning",
    "enriching",
    "chunking",
    "persisting",
  ],
  extract: [
    "indexing",
    "downloading",
    "partitioning",
    "enriching",
    "extracting",
    "persisting",
  ],
} as const;

export const DOC_STATUS_EXECUTION_ORDER =
  DOC_STATUS_EXECUTION_ORDER_BY_FLOW.transform;

type PreviewManifest = {
  status: "pending" | "ready" | "failed";
  preview_type: "source_pdf" | "preview_pdf" | "none";
  source_locator: string;
  source_type: string;
  preview_pdf_storage_key?: string;
  reason?: string;
};

type StepMarks = Partial<Record<
  | "indexing"
  | "downloading"
  | "partitioning"
  | "enriching"
  | "chunking"
  | "extracting"
  | "persisting"
  | "success",
  string
>>;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function parseWorkerPayload(input: unknown): WorkerPayload {
  const obj = (input && typeof input === "object" && !Array.isArray(input))
    ? (input as Record<string, unknown>)
    : {};
  const rawBatch =
    typeof obj.batch_size === "number" && Number.isFinite(obj.batch_size)
      ? Math.trunc(obj.batch_size)
      : 1;
  const batch_size = Math.min(Math.max(rawBatch, 1), 20);
  return { batch_size };
}

export function deriveRunTerminalStatus(input: {
  successCount: number;
  failedCount: number;
}): RunTerminalStatus {
  if (input.successCount > 0 && input.failedCount === 0) return "success";
  if (input.successCount > 0 && input.failedCount > 0) return "partial_success";
  return "failed";
}

export function buildTrackBArtifactKey(input: {
  workspace_id: string;
  run_uid: string;
  source_uid: string;
  filename: string;
}): string {
  return `workspace_b/${input.workspace_id}/track_b/runs/${input.run_uid}/${input.source_uid}/${input.filename}`;
}

export async function buildTrackBIds(input: {
  run_uid: string;
  source_uid: string;
  element_ordinal: number;
}): Promise<TrackBIds> {
  const canonical_doc_uid = input.source_uid;
  const canonical_block_uid = `${canonical_doc_uid}:${input.element_ordinal}`;
  const u_doc_uid = await sha256HexOfString(
    `track_b_doc_v1:${input.run_uid}:${input.source_uid}`,
  );
  const u_block_uid = await sha256HexOfString(
    `track_b_block_v1:${u_doc_uid}:${input.element_ordinal}`,
  );
  return { u_doc_uid, canonical_doc_uid, u_block_uid, canonical_block_uid };
}

export function resolvePlatformBlockType(input: {
  raw_element_type: string;
  mapping: Map<string, string>;
  fallback: string;
}): { platform_block_type: string; used_fallback: boolean } {
  const mapped = input.mapping.get(input.raw_element_type);
  if (mapped) {
    return { platform_block_type: mapped, used_fallback: false };
  }
  return { platform_block_type: input.fallback, used_fallback: true };
}

export function buildFallbackPartitionElements(input: {
  source_uid: string;
  doc_title: string | null;
}): PartitionElement[] {
  const out: PartitionElement[] = [];
  const title = (input.doc_title ?? "").trim();
  if (title) {
    const metadata = {
      producer: "track_b_worker_fallback_v1",
      source_uid: input.source_uid,
    };
    const raw_payload = {
      type: "Title",
      element_id: null,
      text: title,
      metadata,
    };
    out.push({
      raw_element_type: "Title",
      text: title,
      raw_element_id: null,
      page_number: null,
      metadata_json: metadata,
      coordinates_json: null,
      raw_payload,
    });
  }
  const narrativeText = title
    ? `${title}\n\nFallback partition output.`
    : `Fallback partition output for ${input.source_uid.slice(0, 12)}.`;
  const metadata = {
    producer: "track_b_worker_fallback_v1",
    source_uid: input.source_uid,
  };
  const raw_payload = {
    type: "NarrativeText",
    element_id: null,
    text: narrativeText,
    metadata,
  };
  out.push({
    raw_element_type: "NarrativeText",
    text: narrativeText,
    raw_element_id: null,
    page_number: null,
    metadata_json: metadata,
    coordinates_json: null,
    raw_payload,
  });
  return out;
}

export function coercePartitionElements(
  payload: unknown,
  fallback: PartitionElement[],
): PartitionElement[] {
  const elementsArray = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === "object" && !Array.isArray(payload) &&
          Array.isArray((payload as Record<string, unknown>).elements)
      ? (payload as Record<string, unknown>).elements as unknown[]
      : null);

  if (!elementsArray || elementsArray.length === 0) {
    return fallback;
  }

  const out: PartitionElement[] = [];
  for (const item of elementsArray) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const raw_element_type = typeof row.type === "string" ? row.type : "";
    const text = typeof row.text === "string" ? row.text : "";
    if (!raw_element_type || !text) continue;
    const metadata = row.metadata &&
        typeof row.metadata === "object" &&
        !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {};

    const pageFromRow = typeof row.page_number === "number" &&
        Number.isFinite(row.page_number)
      ? Math.trunc(row.page_number)
      : null;
    const pageFromMetadata = typeof metadata.page_number === "number" &&
        Number.isFinite(metadata.page_number)
      ? Math.trunc(metadata.page_number)
      : null;
    const coordinates = row.coordinates &&
        typeof row.coordinates === "object" &&
        !Array.isArray(row.coordinates)
      ? row.coordinates as Record<string, unknown>
      : (metadata.coordinates &&
          typeof metadata.coordinates === "object" &&
          !Array.isArray(metadata.coordinates)
        ? metadata.coordinates as Record<string, unknown>
        : null);

    out.push({
      raw_element_type,
      text,
      raw_element_id: typeof row.element_id === "string"
        ? row.element_id
        : null,
      page_number: pageFromRow ?? pageFromMetadata,
      metadata_json: metadata,
      coordinates_json: coordinates,
      raw_payload: row,
    });
  }

  return out.length > 0 ? out : fallback;
}

export function buildPartitionServiceRequest(input: {
  source_uid: string;
  source_type: string;
  source_locator: string;
  doc_title: string | null;
}): PartitionServiceRequest {
  return {
    source_uid: input.source_uid,
    source_type: input.source_type,
    source_locator: input.source_locator,
    doc_title: input.doc_title,
    partition_parameters: {
      coordinates: true,
      strategy: "hi_res",
      output_format: "application/json",
      unique_element_ids: true,
      chunking_strategy: "by_title",
    },
  };
}

export function buildChunksFromPartitionElements(
  elements: PartitionElement[],
  maxChars = 1200,
): ChunkRecord[] {
  const chunks: ChunkRecord[] = [];
  let currentText = "";
  let currentOrdinals: number[] = [];

  const flush = () => {
    const text = currentText.trim();
    if (!text) return;
    chunks.push({
      chunk_ordinal: chunks.length,
      text,
      source_element_ordinals: [...currentOrdinals],
    });
    currentText = "";
    currentOrdinals = [];
  };

  for (let idx = 0; idx < elements.length; idx++) {
    const text = (elements[idx].text || "").trim();
    if (!text) continue;
    const separator = currentText ? "\n\n" : "";
    const candidate = `${currentText}${separator}${text}`;
    if (candidate.length > maxChars && currentText) {
      flush();
    }
    currentText = currentText ? `${currentText}\n\n${text}` : text;
    currentOrdinals.push(idx);
    if (currentText.length >= maxChars) {
      flush();
    }
  }
  flush();
  return chunks;
}

export function buildDeterministicChunkEmbeddings(
  chunks: ChunkRecord[],
  dimensions = 8,
): ChunkEmbeddingRecord[] {
  const out: ChunkEmbeddingRecord[] = [];
  for (const chunk of chunks) {
    const vec = new Array<number>(dimensions).fill(0);
    const text = chunk.text;
    for (let i = 0; i < text.length; i++) {
      const bucket = i % dimensions;
      const code = text.charCodeAt(i);
      vec[bucket] += ((code % 101) - 50) / 50;
    }
    const maxAbs = Math.max(...vec.map((n) => Math.abs(n)), 1);
    const normalized = vec.map((n) => Number((n / maxAbs).toFixed(6)));
    out.push({
      chunk_ordinal: chunk.chunk_ordinal,
      text: chunk.text,
      vector: normalized,
    });
  }
  return out;
}

function base64UrlEncode(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToPkcs8Bytes(privateKeyPem: string): Uint8Array {
  const base64 = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
}

async function signJwtWithServiceAccountKey(
  privateKeyPem: string,
  signingInput: string,
): Promise<string> {
  const pkcs8 = pemToPkcs8Bytes(privateKeyPem);
  const pkcs8Buffer = new ArrayBuffer(pkcs8.byteLength);
  new Uint8Array(pkcs8Buffer).set(pkcs8);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    TEXT_ENCODER.encode(signingInput),
  );
  return base64UrlEncode(new Uint8Array(signature));
}

function loadVertexEmbeddingConfigFromEnv(): VertexEmbeddingConfig | null {
  const rawServiceAccount = Deno.env.get("GCP_VERTEX_SA_KEY")?.trim() ?? "";
  const projectId = Deno.env.get("GCP_VERTEX_PROJECT_ID")?.trim() ?? "";
  const location = Deno.env.get("GCP_VERTEX_LOCATION")?.trim() ?? "";
  if (!rawServiceAccount || !projectId || !location) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error("Invalid GCP_VERTEX_SA_KEY JSON payload");
  }
  const serviceAccount = asObject(parsed);
  if (!serviceAccount) {
    throw new Error("GCP_VERTEX_SA_KEY must decode to an object");
  }
  const clientEmail = typeof serviceAccount.client_email === "string"
    ? serviceAccount.client_email.trim()
    : "";
  const privateKey = typeof serviceAccount.private_key === "string"
    ? serviceAccount.private_key
    : "";
  const tokenUri = typeof serviceAccount.token_uri === "string"
    ? serviceAccount.token_uri.trim()
    : "";
  if (!clientEmail || !privateKey) {
    throw new Error("GCP_VERTEX_SA_KEY must include client_email and private_key");
  }
  return {
    projectId,
    location,
    model: Deno.env.get("GCP_VERTEX_EMBED_MODEL")?.trim() || "text-embedding-004",
    timeoutMs: parsePositiveIntEnv(
      Deno.env.get("TRACK_B_EMBED_TIMEOUT_MS"),
      45000,
      1000,
      300000,
    ),
    batchSize: parsePositiveIntEnv(
      Deno.env.get("TRACK_B_EMBED_BATCH_SIZE"),
      16,
      1,
      64,
    ),
    serviceAccount: {
      client_email: clientEmail,
      private_key: privateKey,
      token_uri: tokenUri || "https://oauth2.googleapis.com/token",
    },
  };
}

async function getVertexAccessToken(config: VertexEmbeddingConfig): Promise<string> {
  const nowMs = Date.now();
  if (vertexAccessTokenCache && vertexAccessTokenCache.expiresAtMs - 60_000 > nowMs) {
    return vertexAccessTokenCache.token;
  }
  const issuedAt = Math.floor(nowMs / 1000);
  const expiresAt = issuedAt + 3600;
  const header = base64UrlEncode(
    TEXT_ENCODER.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
  );
  const claim = base64UrlEncode(
    TEXT_ENCODER.encode(
      JSON.stringify({
        iss: config.serviceAccount.client_email,
        sub: config.serviceAccount.client_email,
        aud: config.serviceAccount.token_uri,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        iat: issuedAt,
        exp: expiresAt,
      }),
    ),
  );
  const signingInput = `${header}.${claim}`;
  const signature = await signJwtWithServiceAccountKey(
    config.serviceAccount.private_key,
    signingInput,
  );
  const assertion = `${signingInput}.${signature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const tokenResp = await fetchWithTimeout(
    config.serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    config.timeoutMs,
  );
  if (!tokenResp.ok) {
    const errText = await tokenResp.text().catch(() => "");
    throw new Error(
      `Vertex OAuth token request failed (${tokenResp.status}): ${errText.slice(0, 500)}`,
    );
  }
  const tokenJson = await tokenResp.json().catch(() => ({}));
  const tokenObj = asObject(tokenJson);
  const accessToken = tokenObj && typeof tokenObj.access_token === "string"
    ? tokenObj.access_token
    : "";
  if (!accessToken) {
    throw new Error("Vertex OAuth token response missing access_token");
  }
  const expiresIn = tokenObj && typeof tokenObj.expires_in === "number" &&
      Number.isFinite(tokenObj.expires_in)
    ? Math.trunc(tokenObj.expires_in)
    : 3600;
  vertexAccessTokenCache = {
    token: accessToken,
    expiresAtMs: nowMs + Math.max(60, expiresIn) * 1000,
  };
  return accessToken;
}

function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const out: number[] = [];
  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) return null;
    out.push(entry);
  }
  return out;
}

function parseVertexPredictionTokenCount(prediction: unknown): number {
  const predictionObj = asObject(prediction);
  if (!predictionObj) return 0;
  const embeddingsObj = asObject(predictionObj.embeddings) ??
    asObject(predictionObj.embedding);
  const stats = asObject(embeddingsObj?.statistics) ??
    asObject(predictionObj.statistics);
  const tokenCount = stats?.token_count;
  if (typeof tokenCount === "number" && Number.isFinite(tokenCount)) {
    return Math.max(0, Math.trunc(tokenCount));
  }
  return 0;
}

export function parseVertexPredictEmbeddingsResponse(
  payload: unknown,
  expectedCount: number,
): { vectors: number[][]; prompt_token_count: number } {
  const payloadObj = asObject(payload);
  const predictionsRaw = payloadObj?.predictions;
  if (!Array.isArray(predictionsRaw)) {
    throw new Error("Vertex embedding response missing predictions array");
  }
  if (predictionsRaw.length !== expectedCount) {
    throw new Error(
      `Vertex embedding response count mismatch: expected=${expectedCount} actual=${predictionsRaw.length}`,
    );
  }

  const vectors: number[][] = [];
  let promptTokenCount = 0;
  for (const prediction of predictionsRaw) {
    const predictionObj = asObject(prediction);
    const embeddingsObj = asObject(predictionObj?.embeddings) ??
      asObject(predictionObj?.embedding) ?? predictionObj;
    const values = asNumberArray(embeddingsObj?.values);
    if (!values || values.length === 0) {
      throw new Error("Vertex embedding response missing numeric vector values");
    }
    vectors.push(values.map((value) => Number(value.toFixed(8))));
    promptTokenCount += parseVertexPredictionTokenCount(prediction);
  }
  return { vectors, prompt_token_count: promptTokenCount };
}

async function buildVertexChunkEmbeddings(
  chunks: ChunkRecord[],
): Promise<ChunkEmbeddingBuildResult> {
  if (chunks.length === 0) {
    return {
      rows: [],
      usage: {
        provider: "vertex_ai",
        model: Deno.env.get("GCP_VERTEX_EMBED_MODEL")?.trim() || "text-embedding-004",
        request_count: 0,
        prompt_token_count: 0,
      },
    };
  }
  const config = loadVertexEmbeddingConfigFromEnv();
  if (!config) {
    throw new Error(
      "Vertex embedding config missing: set GCP_VERTEX_SA_KEY, GCP_VERTEX_PROJECT_ID, and GCP_VERTEX_LOCATION",
    );
  }

  const endpoint =
    `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${config.model}:predict`;
  const rows: ChunkEmbeddingRecord[] = [];
  let promptTokenCount = 0;
  let requestCount = 0;

  for (let start = 0; start < chunks.length; start += config.batchSize) {
    const batch = chunks.slice(start, start + config.batchSize);
    let accessToken = await getVertexAccessToken(config);
    const requestBody = {
      instances: batch.map((chunk) => ({
        content: chunk.text,
        task_type: "RETRIEVAL_DOCUMENT",
      })),
    };

    let response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      config.timeoutMs,
    );
    if (response.status === 401) {
      vertexAccessTokenCache = null;
      accessToken = await getVertexAccessToken(config);
      response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
        config.timeoutMs,
      );
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `Vertex embedding predict failed (${response.status}): ${errText.slice(0, 500)}`,
      );
    }

    const responseJson = await response.json().catch(() => ({}));
    const parsed = parseVertexPredictEmbeddingsResponse(responseJson, batch.length);
    promptTokenCount += parsed.prompt_token_count;
    requestCount += 1;
    for (let idx = 0; idx < batch.length; idx++) {
      rows.push({
        chunk_ordinal: batch[idx].chunk_ordinal,
        text: batch[idx].text,
        vector: parsed.vectors[idx],
      });
    }
  }

  rows.sort((a, b) => a.chunk_ordinal - b.chunk_ordinal);
  return {
    rows,
    usage: {
      provider: "vertex_ai",
      model: config.model,
      request_count: requestCount,
      prompt_token_count: promptTokenCount,
    },
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeWorkflowExecutionConfig(
  flowMode: FlowMode,
): WorkflowExecutionConfig {
  return {
    enrichers: {
      image_description: true,
      table_description: true,
      table_to_html: true,
      ner: true,
      generative_ocr: true,
    },
    embedding: {
      enabled: flowMode === "transform",
    },
  };
}

function applyWorkflowSpecOverrides(
  base: WorkflowExecutionConfig,
  workflowSpecJson: unknown,
): WorkflowExecutionConfig {
  const next: WorkflowExecutionConfig = {
    enrichers: { ...base.enrichers },
    embedding: { ...base.embedding },
  };
  const spec = asObject(workflowSpecJson);
  if (!spec) return next;
  const pipeline = asObject(spec.pipeline) ?? spec;
  const enrichers = asObject(pipeline.enrichers);
  if (enrichers) {
    for (const node of TRACK_REQUIRED_ENRICHERS) {
      // Track-required capability lock: workflow specs cannot disable enrichers.
      if (enrichers[node] === true) {
        next.enrichers[node] = true;
      }
    }
  }
  const embedding = asObject(pipeline.embedding);
  if (embedding && typeof embedding.enabled === "boolean") {
    next.embedding.enabled = embedding.enabled as boolean;
  }
  return next;
}

export function resolveWorkflowExecutionConfigFromTemplateKey(
  workflowTemplateKey: string,
  flowMode: FlowMode,
): WorkflowConfigResult {
  const key = workflowTemplateKey.trim();
  if (!key) {
    return {
      ok: false,
      error: "workflow_template_key is required when workflow_uid is not set",
    };
  }
  const known = new Set([
    "track-b-default",
    "track-b-transform-default",
    "track-b-extract-default",
  ]);
  if (!known.has(key)) {
    return {
      ok: false,
      error: `Unknown workflow_template_key: ${key}`,
    };
  }
  const base = normalizeWorkflowExecutionConfig(flowMode);
  if (key === "track-b-extract-default") {
    base.embedding.enabled = false;
  }
  if (key === "track-b-transform-default" && flowMode === "transform") {
    base.embedding.enabled = true;
  }
  return { ok: true, value: base };
}

async function resolveWorkflowExecutionConfig(input: {
  supabaseAdmin: ReturnType<typeof defaultCreateAdminClient>;
  workflow_uid: string | null;
  workflow_template_key: string | null;
  flow_mode: FlowMode;
}): Promise<WorkflowConfigResult> {
  if (input.workflow_uid) {
    const { data: workflowRow, error: workflowErr } = await input.supabaseAdmin
      .from("unstructured_workflows_v2")
      .select("workflow_uid, workflow_spec_json")
      .eq("workflow_uid", input.workflow_uid)
      .maybeSingle();
    if (workflowErr) {
      return { ok: false, error: `Failed to load workflow: ${workflowErr.message}` };
    }
    if (!workflowRow) {
      return { ok: false, error: "Workflow not found for run" };
    }
    const templateBase = normalizeWorkflowExecutionConfig(input.flow_mode);
    return {
      ok: true,
      value: applyWorkflowSpecOverrides(templateBase, workflowRow.workflow_spec_json),
    };
  }
  return resolveWorkflowExecutionConfigFromTemplateKey(
    input.workflow_template_key ?? "",
    input.flow_mode,
  );
}

function getMetadataImageBase64(element: PartitionElement): string | null {
  const metadata = asObject(element.metadata_json);
  if (metadata && typeof metadata.image_base64 === "string" && metadata.image_base64.trim()) {
    return metadata.image_base64.trim();
  }
  const rawPayloadMetadata = asObject(asObject(element.raw_payload)?.metadata);
  if (
    rawPayloadMetadata && typeof rawPayloadMetadata.image_base64 === "string" &&
    rawPayloadMetadata.image_base64.trim()
  ) {
    return rawPayloadMetadata.image_base64.trim();
  }
  return null;
}

function pickEntityTokens(text: string, maxItems = 3): string[] {
  const matches = text.match(/\b[A-Z][A-Za-z0-9_-]{2,}\b/g) ?? [];
  return [...new Set(matches)].slice(0, maxItems);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function applyDeterministicEnricher(input: {
  node: EnricherNodeName;
  elements: PartitionElement[];
  enabled: boolean;
  providerApiKey: string | null;
  source_uid: string;
}): EnricherApplyResult {
  const clonedElements = input.elements.map((element) => ({
    ...element,
    metadata_json: { ...element.metadata_json },
  }));

  if (!input.enabled) {
    return {
      node: input.node,
      status: "skipped",
      skip_reason: "disabled_by_policy",
      eligible_count: 0,
      applied_count: 0,
      elements: clonedElements,
      detail: {},
    };
  }

  const eligibleIndexes = clonedElements
    .map((element, index) => ({ element, index }))
    .filter(({ element }) => {
      if (input.node === "image_description" || input.node === "generative_ocr") {
        return element.raw_element_type === "Image";
      }
      if (input.node === "table_description" || input.node === "table_to_html") {
        return element.raw_element_type === "Table";
      }
      return (element.text ?? "").trim().length > 0;
    })
    .map((row) => row.index);

  if (eligibleIndexes.length === 0) {
    return {
      node: input.node,
      status: "skipped",
      skip_reason: "skipped_not_applicable",
      eligible_count: 0,
      applied_count: 0,
      elements: clonedElements,
      detail: {},
    };
  }

  const requiresProvider = input.node === "image_description" ||
    input.node === "table_description" || input.node === "table_to_html" ||
    input.node === "generative_ocr" || input.node === "ner";
  if (requiresProvider && !(input.providerApiKey ?? "").trim()) {
    return {
      node: input.node,
      status: "skipped",
      skip_reason: "missing_provider_key",
      eligible_count: eligibleIndexes.length,
      applied_count: 0,
      elements: clonedElements,
      detail: {},
    };
  }

  const requiresImageBase64 = input.node === "image_description" ||
    input.node === "table_description" || input.node === "table_to_html" ||
    input.node === "generative_ocr";
  if (requiresImageBase64) {
    const hasAtLeastOne = eligibleIndexes.some((index) =>
      Boolean(getMetadataImageBase64(clonedElements[index]))
    );
    if (!hasAtLeastOne) {
      return {
        node: input.node,
        status: "skipped",
        skip_reason: "skipped_no_image_base64",
        eligible_count: eligibleIndexes.length,
        applied_count: 0,
        elements: clonedElements,
        detail: {},
      };
    }
  }

  let appliedCount = 0;
  for (const index of eligibleIndexes) {
    const element = clonedElements[index];
    const text = (element.text ?? "").trim();
    const metadata = { ...element.metadata_json };

    if (input.node === "image_description") {
      const summary = text || `Image content summary (${input.source_uid.slice(0, 8)})`;
      metadata.enricher_image_description = {
        type: "image",
        description: summary,
      };
      element.text = summary;
      element.metadata_json = metadata;
      appliedCount += 1;
      continue;
    }

    if (input.node === "table_description") {
      const summary = text
        ? `Table summary: ${text.slice(0, 240)}`
        : "Table summary unavailable";
      metadata.enricher_table_description = {
        summary,
      };
      element.text = summary;
      element.metadata_json = metadata;
      appliedCount += 1;
      continue;
    }

    if (input.node === "table_to_html") {
      const html = `<table><tr><td>${escapeHtml(text || "table")}</td></tr></table>`;
      metadata.text_as_html = html;
      element.metadata_json = metadata;
      appliedCount += 1;
      continue;
    }

    if (input.node === "ner") {
      const entities = pickEntityTokens(text).map((token) => ({
        type: "entity",
        text: token,
      }));
      metadata.entities = {
        items: entities,
        relationships: [],
      };
      element.metadata_json = metadata;
      appliedCount += 1;
      continue;
    }

    if (input.node === "generative_ocr") {
      const corrected = text.replace(/\s+/g, " ").trim();
      metadata.generative_ocr = {
        corrected: true,
      };
      element.text = corrected || text;
      element.metadata_json = metadata;
      appliedCount += 1;
    }
  }

  return {
    node: input.node,
    status: appliedCount > 0 ? "applied" : "skipped",
    skip_reason: appliedCount > 0 ? null : "skipped_not_applicable",
    eligible_count: eligibleIndexes.length,
    applied_count: appliedCount,
    elements: clonedElements,
    detail: {},
  };
}

export function parsePositiveIntEnv(
  raw: string | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const value = Math.trunc(parsed);
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseIsoToMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function computeStepDurationsMs(marks: StepMarks): Record<string, number | null> {
  const diff = (a: string | undefined, b: string | undefined): number | null => {
    const start = parseIsoToMs(a);
    const end = parseIsoToMs(b);
    if (start == null || end == null) return null;
    return Math.max(0, end - start);
  };
  const enrichTerminal = marks.extracting ?? marks.chunking ?? marks.persisting;
  const persistStart = marks.extracting ?? marks.chunking ?? marks.enriching;
  return {
    indexing_ms: diff(marks.indexing, marks.downloading),
    downloading_ms: diff(marks.downloading, marks.partitioning),
    partitioning_ms: diff(marks.partitioning, marks.enriching),
    enriching_ms: diff(marks.enriching, enrichTerminal),
    chunking_ms: diff(marks.chunking, marks.persisting),
    extracting_ms: diff(marks.extracting, marks.persisting),
    persisting_ms: diff(persistStart, marks.success),
  };
}

function normalizePdfLineText(input: string): string {
  const cleaned = input
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
  return cleaned.length > 0 ? cleaned : "?";
}

function escapePdfTextLiteral(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapTextToLines(input: string, maxChars: number): string[] {
  const lineLength = Math.max(20, maxChars);
  const words = normalizePdfLineText(input).split(/\s+/);
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > lineLength && current) {
      out.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) out.push(current);
  return out.length > 0 ? out : ["?"];
}

function buildSinglePagePdf(lines: string[]): Uint8Array {
  const safeLines = lines.length > 0 ? lines : ["Track B Preview"];
  const contentParts = [
    "BT",
    "/F1 11 Tf",
    "14 TL",
    "50 760 Td",
  ];
  for (let i = 0; i < safeLines.length; i++) {
    const escaped = escapePdfTextLiteral(normalizePdfLineText(safeLines[i]));
    if (i === 0) {
      contentParts.push(`(${escaped}) Tj`);
    } else {
      contentParts.push("T*");
      contentParts.push(`(${escaped}) Tj`);
    }
  }
  contentParts.push("ET");
  const contentStream = `${contentParts.join("\n")}\n`;
  const contentLength = new TextEncoder().encode(contentStream).byteLength;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += `startxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

export function buildPreviewPdfBytesFromElements(input: {
  source_uid: string;
  source_type: string;
  source_locator: string;
  doc_title: string | null;
  elements: PartitionElement[];
}): Uint8Array {
  const lines: string[] = [
    "Track B Preview",
    `Title: ${input.doc_title?.trim() || "(untitled)"}`,
    `Source type: ${input.source_type}`,
    `Source uid: ${input.source_uid.slice(0, 12)}...`,
    "",
  ];
  const maxLines = 42;
  for (const element of input.elements) {
    if (lines.length >= maxLines) break;
    const head = `[${element.raw_element_type}]`;
    const parts = wrapTextToLines(`${head} ${element.text}`, 88);
    for (const part of parts) {
      if (lines.length >= maxLines) break;
      lines.push(part);
    }
  }
  return buildSinglePagePdf(lines);
}

export function buildPreviewManifest(input: {
  source_type: string;
  source_locator: string;
  preview_pdf_storage_key?: string;
  preview_error_reason?: string;
}): PreviewManifest {
  if (input.source_type.toLowerCase() === "pdf") {
    return {
      status: "ready",
      preview_type: "source_pdf",
      source_locator: input.source_locator,
      source_type: input.source_type,
    };
  }
  if (input.preview_pdf_storage_key) {
    return {
      status: "ready",
      preview_type: "preview_pdf",
      source_locator: input.source_locator,
      source_type: input.source_type,
      preview_pdf_storage_key: input.preview_pdf_storage_key,
    };
  }
  if (input.preview_error_reason) {
    return {
      status: "failed",
      preview_type: "none",
      source_locator: input.source_locator,
      source_type: input.source_type,
      reason: input.preview_error_reason,
    };
  }
  return {
    status: "pending",
    preview_type: "none",
    source_locator: input.source_locator,
    source_type: input.source_type,
    reason: "preview_generation_pending",
  };
}

export function buildRunDocStatusUpdateBody(
  status: string,
  nowIso: string,
  errorMessage?: string,
): Record<string, unknown> {
  const updateBody: Record<string, unknown> = { status };
  if (status === "indexing") {
    updateBody.step_indexed_at = nowIso;
  }
  if (status === "downloading") {
    updateBody.step_downloaded_at = nowIso;
  }
  if (status === "partitioning") {
    updateBody.step_partitioned_at = nowIso;
  }
  if (status === "chunking") {
    updateBody.step_chunked_at = nowIso;
  }
  if (status === "enriching") {
    updateBody.step_enriched_at = nowIso;
    // Back-compat for clients that still read step_embedded_at.
    updateBody.step_embedded_at = nowIso;
  }
  if (status === "extracting") {
    updateBody.step_extracted_at = nowIso;
  }
  if (status === "persisting") {
    updateBody.step_uploaded_at = nowIso;
  }
  if (errorMessage) {
    updateBody.error = errorMessage.slice(0, 1000);
  }
  return updateBody;
}

async function partitionWithOptionalService(input: {
  supabaseAdmin: ReturnType<typeof defaultCreateAdminClient>;
  source_uid: string;
  source_type: string;
  source_locator: string;
  doc_title: string | null;
}): Promise<{ elements: PartitionElement[]; backend: string }> {
  const fallback = buildFallbackPartitionElements({
    source_uid: input.source_uid,
    doc_title: input.doc_title,
  });

  const baseUrl = Deno.env.get("UNSTRUCTURED_TRACK_SERVICE_URL")?.trim() ?? "";
  if (!baseUrl) return { elements: fallback, backend: "local-fallback" };
  const partitionTimeoutMs = parsePositiveIntEnv(
    Deno.env.get("TRACK_B_PARTITION_TIMEOUT_MS"),
    60000,
    1000,
    300000,
  );

  try {
    const serviceKey = Deno.env.get("TRACK_B_SERVICE_KEY")?.trim() ?? "";
    const unstructuredApiKey =
      Deno.env.get("UNSTRUCTURED_API_KEY")?.trim() || serviceKey;

    const bucket = Deno.env.get("DOCUMENTS_BUCKET")?.trim() || "documents";
    const { data: sourceFile, error: sourceFileErr } = await input.supabaseAdmin
      .storage
      .from(bucket)
      .download(input.source_locator);

    if (!sourceFileErr && sourceFile) {
      const url = `${baseUrl.replace(/\/+$/, "")}/general/v0/general`;
      const headers: HeadersInit = {};
      if (unstructuredApiKey) {
        (headers as Record<string, string>)["unstructured-api-key"] =
          unstructuredApiKey;
      }

      const requestPayload = buildPartitionServiceRequest(input);
      const formData = new FormData();
      const filename = input.source_locator.split("/").pop() ||
        `${input.source_uid}.${input.source_type || "bin"}`;
      formData.append("files", sourceFile, filename);
      const params = requestPayload.partition_parameters;
      formData.append("coordinates", String(params.coordinates));
      formData.append("strategy", params.strategy);
      formData.append("output_format", params.output_format);
      formData.append("unique_element_ids", String(params.unique_element_ids));
      if (params.chunking_strategy) {
        formData.append("chunking_strategy", params.chunking_strategy);
      }

      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers,
        body: formData,
      }, partitionTimeoutMs);
      if (response.ok) {
        const backendHeader = response.headers.get(
          "X-Track-B-Partition-Backend",
        )?.trim();
        const payload = await response.json().catch(() => ([]));
        return {
          elements: coercePartitionElements(payload, fallback),
          backend: backendHeader
            ? `service-general:${backendHeader}`
            : "service-general",
        };
      }
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/partition`;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (serviceKey) {
      (headers as Record<string, string>)["X-Track-B-Service-Key"] = serviceKey;
    }

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: JSON.stringify(buildPartitionServiceRequest(input)),
    }, partitionTimeoutMs);
    if (!response.ok) {
      return { elements: fallback, backend: "local-fallback" };
    }
    const payload = await response.json().catch(() => ({}));
    const backendHeader = response.headers.get(
      "X-Track-B-Partition-Backend",
    )?.trim();
    return {
      elements: coercePartitionElements(payload, fallback),
      backend: backendHeader
        ? `service-partition:${backendHeader}`
        : "service-partition",
    };
  } catch {
    return { elements: fallback, backend: "local-fallback" };
  }
}

async function loadTaxonomyMapping(
  supabaseAdmin: ReturnType<typeof defaultCreateAdminClient>,
  mappingVersion: string,
): Promise<{ mapping: Map<string, string>; fallback: string }> {
  const { data, error } = await supabaseAdmin
    .from("unstructured_taxonomy_mapping_v2")
    .select("raw_element_type, platform_block_type, is_fallback")
    .eq("mapping_version", mappingVersion);
  if (error) {
    throw new Error(`Failed to load taxonomy mapping: ${error.message}`);
  }

  const rows = (data ?? []) as TaxonomyRow[];
  const mapping = new Map<string, string>();
  let fallback = "other";
  for (const row of rows) {
    if (row.is_fallback) fallback = row.platform_block_type;
    if (row.raw_element_type === "__fallback__") continue;
    mapping.set(row.raw_element_type, row.platform_block_type);
  }
  return { mapping, fallback };
}

async function resolveProviderApiKey(input: {
  supabaseAdmin: ReturnType<typeof defaultCreateAdminClient>;
  owner_id: string;
  provider: "anthropic" | "openai";
}): Promise<string | null> {
  const envKeyName = input.provider === "anthropic"
    ? "ANTHROPIC_API_KEY"
    : "OPENAI_API_KEY";
  const envFallback = Deno.env.get(envKeyName)?.trim() ?? "";
  const { data: keyRow } = await input.supabaseAdmin
    .from("user_api_keys")
    .select("api_key_encrypted")
    .eq("user_id", input.owner_id)
    .eq("provider", input.provider)
    .maybeSingle();
  const encrypted = (keyRow as { api_key_encrypted?: string | null } | null)
    ?.api_key_encrypted;
  if (!encrypted) return envFallback || null;
  try {
    const secret = defaultRequireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const decrypted = await decryptApiKey(encrypted, secret);
    const trimmed = decrypted.trim();
    return trimmed || envFallback || null;
  } catch {
    return envFallback || null;
  }
}

// ── LLM-based extract via Vertex AI Claude ──

type ExtractLlmResult = {
  data: Record<string, unknown>;
  usage: { input_tokens: number; output_tokens: number };
};

async function extractBlockWithLLM(input: {
  schema_jsonb: Record<string, unknown>;
  element_text: string;
  block_type: string;
}): Promise<ExtractLlmResult> {
  const schemaProps = asObject(input.schema_jsonb.properties) ?? {};
  const promptConfig = asObject(input.schema_jsonb.prompt_config) ?? {};

  const model = (promptConfig.model as string) ?? "claude-sonnet-4-5-20250929";
  const temperature = Number(promptConfig.temperature ?? 0.3);
  const maxTokens = Number(promptConfig.max_tokens_per_block ?? 4096);
  const systemPrompt = (promptConfig.system_instructions as string) ??
    "You are a document analysis assistant. Extract structured fields from the given block content.";
  const blockPrompt = (promptConfig.per_block_prompt as string) ??
    "Extract the following fields from this content block:";

  const tool = {
    name: "extract_fields",
    description:
      "Extract structured fields from the block content according to the schema.",
    input_schema: {
      type: "object",
      properties: schemaProps,
    },
  };

  const result = await callVertexClaude({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `${blockPrompt}\n\n---\n\nBlock type: ${input.block_type}\nBlock content:\n${input.element_text}`,
      },
    ],
    tools: [tool],
    tool_choice: { type: "tool", name: "extract_fields" },
  });

  // deno-lint-ignore no-explicit-any
  const toolUse = (result as any).content?.find(
    // deno-lint-ignore no-explicit-any
    (c: any) => c.type === "tool_use",
  );
  if (!toolUse?.input) {
    throw new Error("No tool_use block in LLM response");
  }

  // deno-lint-ignore no-explicit-any
  const usageRaw = (result as any)?.usage ?? {};
  return {
    data: toolUse.input as Record<string, unknown>,
    usage: {
      input_tokens: Number(usageRaw.input_tokens ?? 0),
      output_tokens: Number(usageRaw.output_tokens ?? 0),
    },
  };
}

// ── Deterministic extract stub (fallback / testing) ──

function buildDeterministicExtractValue(
  schemaType: unknown,
  text: string,
  fieldKey: string,
): unknown {
  if (schemaType === "string") {
    return (text || "").slice(0, 500);
  }
  if (schemaType === "number" || schemaType === "integer") {
    const firstNumber = text.match(/-?\d+(\.\d+)?/)?.[0];
    if (!firstNumber) return 0;
    const parsed = Number(firstNumber);
    if (!Number.isFinite(parsed)) return 0;
    if (schemaType === "integer") return Math.trunc(parsed);
    return parsed;
  }
  if (schemaType === "boolean") {
    const lowered = text.toLowerCase();
    if (lowered.includes(" yes ") || lowered.startsWith("yes")) return true;
    if (lowered.includes(" true ") || lowered.startsWith("true")) return true;
    if (lowered.includes(" no ") || lowered.startsWith("no")) return false;
    return false;
  }
  if (schemaType === "array") {
    return [];
  }
  return text ? `${fieldKey}:${text.slice(0, 120)}` : null;
}

function buildDeterministicExtractJson(input: {
  schema_jsonb: Record<string, unknown>;
  element_text: string;
}): Record<string, unknown> {
  const schemaProps = asObject(input.schema_jsonb.properties) ?? {};
  const output: Record<string, unknown> = {};
  for (const [fieldKey, fieldSchemaRaw] of Object.entries(schemaProps)) {
    const fieldSchema = asObject(fieldSchemaRaw) ?? {};
    const schemaType = fieldSchema.type;
    output[fieldKey] = buildDeterministicExtractValue(
      schemaType,
      input.element_text,
      fieldKey,
    );
  }
  return output;
}

async function loadUserSchemaForExtract(input: {
  supabaseAdmin: ReturnType<typeof defaultCreateAdminClient>;
  owner_id: string;
  user_schema_uid: string | null;
}): Promise<{ ok: true; schema_jsonb: Record<string, unknown> } | { ok: false; error: string }> {
  const schemaUid = input.user_schema_uid?.trim() ?? "";
  if (!schemaUid) {
    return { ok: false, error: "Extract flow requires user_schema_uid" };
  }
  const { data, error } = await input.supabaseAdmin
    .from("schemas")
    .select("schema_uid, schema_jsonb")
    .eq("owner_id", input.owner_id)
    .eq("schema_uid", schemaUid)
    .maybeSingle();
  if (error) {
    return { ok: false, error: `Failed to load extract schema: ${error.message}` };
  }
  if (!data) {
    return { ok: false, error: "Extract schema not found for owner" };
  }
  const schemaJson = asObject((data as { schema_jsonb: unknown }).schema_jsonb);
  if (!schemaJson) {
    return { ok: false, error: "Extract schema payload is invalid" };
  }
  return { ok: true, schema_jsonb: schemaJson };
}

async function updateRunDocStatus(
  supabaseAdmin: ReturnType<typeof defaultCreateAdminClient>,
  run_uid: string,
  source_uid: string,
  status: string,
  errorMessage?: string,
  atIso?: string,
): Promise<void> {
  const updateBody = buildRunDocStatusUpdateBody(
    status,
    atIso ?? new Date().toISOString(),
    errorMessage,
  );

  const { error } = await supabaseAdmin
    .from("unstructured_run_docs_v2")
    .update(updateBody)
    .eq("run_uid", run_uid)
    .eq("source_uid", source_uid);
  if (error) {
    throw new Error(`Failed to update run doc status: ${error.message}`);
  }
}

async function processRun(
  supabaseAdmin: ReturnType<typeof defaultCreateAdminClient>,
  run_uid: string,
): Promise<
  {
    run_uid: string;
    success_docs: number;
    failed_docs: number;
    status: RunTerminalStatus;
  }
> {
  const { data: runRow, error: runErr } = await supabaseAdmin
    .from("unstructured_workflow_runs_v2")
    .select(
      "run_uid, workspace_id, project_id, owner_id, flow_mode, workflow_uid, workflow_template_key, user_schema_uid",
    )
    .eq("run_uid", run_uid)
    .single();
  if (runErr || !runRow) {
    throw new Error(`Track B run not found: ${runErr?.message ?? run_uid}`);
  }

  const flowMode = runRow.flow_mode as FlowMode;
  const statusOrder = DOC_STATUS_EXECUTION_ORDER_BY_FLOW[flowMode];
  let runConfigError: string | null = null;

  const workflowConfigResult = await resolveWorkflowExecutionConfig({
    supabaseAdmin,
    workflow_uid: (runRow.workflow_uid as string | null) ?? null,
    workflow_template_key: (runRow.workflow_template_key as string | null) ?? null,
    flow_mode: flowMode,
  });
  if (!workflowConfigResult.ok) {
    runConfigError = workflowConfigResult.error;
  }
  const workflowConfig = workflowConfigResult.ok
    ? workflowConfigResult.value
    : normalizeWorkflowExecutionConfig(flowMode);

  const extractSchemaResult = flowMode === "extract"
    ? await loadUserSchemaForExtract({
      supabaseAdmin,
      owner_id: runRow.owner_id as string,
      user_schema_uid: (runRow.user_schema_uid as string | null) ?? null,
    })
    : null;
  if (!runConfigError && extractSchemaResult && !extractSchemaResult.ok) {
    runConfigError = extractSchemaResult.error;
  }

  const providerKeys = {
    anthropic: await resolveProviderApiKey({
      supabaseAdmin,
      owner_id: runRow.owner_id as string,
      provider: "anthropic",
    }),
    openai: await resolveProviderApiKey({
      supabaseAdmin,
      owner_id: runRow.owner_id as string,
      provider: "openai",
    }),
  };

  const { data: runDocs, error: runDocsErr } = await supabaseAdmin
    .from("unstructured_run_docs_v2")
    .select("source_uid")
    .eq("run_uid", run_uid)
    .order("source_uid", { ascending: true });
  if (runDocsErr) {
    throw new Error(`Failed to load run docs: ${runDocsErr.message}`);
  }
  const taxonomy = await loadTaxonomyMapping(supabaseAdmin, "2026-02-14");

  let successCount = 0;
  let failedCount = 0;
  const runStepFailureCounts: Record<string, number> = {};

  for (const doc of (runDocs ?? []) as Array<{ source_uid: string }>) {
    const source_uid = doc.source_uid;
    const stepMarks: StepMarks = {};
    let currentStep: string = "indexing";
    try {
      if (runConfigError) {
        throw new Error(runConfigError);
      }
      const advanceStatus = async (status: typeof statusOrder[number]) => {
        const nowIso = new Date().toISOString();
        currentStep = status;
        stepMarks[status] = nowIso;
        await updateRunDocStatus(
          supabaseAdmin,
          run_uid,
          source_uid,
          status,
          undefined,
          nowIso,
        );
      };

      await advanceStatus(statusOrder[0]);
      await advanceStatus(statusOrder[1]);
      await advanceStatus(statusOrder[2]);

      const { data: sourceDoc, error: sourceErr } = await supabaseAdmin
        .from("documents_v2")
        .select(
          "source_uid, source_type, source_locator, doc_title, project_id",
        )
        .eq("source_uid", source_uid)
        .single();
      if (sourceErr || !sourceDoc) {
        throw new Error(
          `Source document not found: ${sourceErr?.message ?? source_uid}`,
        );
      }
      if (sourceDoc.project_id !== runRow.project_id) {
        throw new Error("Source document project mismatch");
      }

      const partitionResult = await partitionWithOptionalService({
        supabaseAdmin,
        source_uid,
        source_type: sourceDoc.source_type,
        source_locator: sourceDoc.source_locator,
        doc_title: sourceDoc.doc_title,
      });
      const partitionElements = partitionResult.elements;
      const partitionBackend = partitionResult.backend;
      await advanceStatus("enriching");

      const enricherResults: Array<{
        node: EnricherNodeName;
        status: "applied" | "skipped";
        skip_reason: EnricherSkipReason | null;
        eligible_count: number;
        applied_count: number;
      }> = [];
      let enrichedElements = partitionElements;
      for (const node of TRACK_REQUIRED_ENRICHERS) {
        const providerForNode = node === "image_description" ||
            node === "table_description"
          ? "anthropic"
          : "openai";
        const providerApiKey = providerForNode
          ? providerKeys[providerForNode]
          : null;
        const enrichResult = applyDeterministicEnricher({
          node,
          elements: enrichedElements,
          enabled: workflowConfig.enrichers[node],
          providerApiKey,
          source_uid,
        });
        enrichedElements = enrichResult.elements;
        enricherResults.push({
          node: enrichResult.node,
          status: enrichResult.status,
          skip_reason: enrichResult.skip_reason,
          eligible_count: enrichResult.eligible_count,
          applied_count: enrichResult.applied_count,
        });
      }

      let chunkRows: ChunkRecord[] = [];
      let embeddingRows: ChunkEmbeddingRecord[] = [];
      let embeddingUsage: ChunkEmbeddingBuildResult["usage"] | null = null;
      let extractRows: Array<Record<string, unknown>> = [];
      if (flowMode === "transform") {
        await advanceStatus("chunking");
        const chunkMaxChars = parsePositiveIntEnv(
          Deno.env.get("TRACK_B_CHUNK_MAX_CHARS"),
          1200,
          200,
          8000,
        );
        chunkRows = buildChunksFromPartitionElements(
          enrichedElements,
          chunkMaxChars,
        );
        if (workflowConfig.embedding.enabled) {
          const embeddingResult = await buildVertexChunkEmbeddings(chunkRows);
          embeddingRows = embeddingResult.rows;
          embeddingUsage = embeddingResult.usage;
        }
      } else {
        await advanceStatus("extracting");
      }
      await advanceStatus("persisting");
      const now = new Date().toISOString();

      const partitionArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "partition.json",
      });
      const elementsArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "elements.json",
      });
      const embedArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "embeddings.json",
      });
      const chunkArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "chunks.json",
      });
      const extractArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "extracts.json",
      });
      const previewArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "preview.json",
      });
      const previewPdfArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "preview.pdf",
      });
      const partitionPayload = {
        backend: partitionBackend,
        elements: partitionElements,
      };
      const elementsPayload = enrichedElements;
      const chunkPayload = { chunks: chunkRows };
      const embedPayload = {
        provider: embeddingUsage?.provider ?? null,
        model: embeddingUsage?.model ?? null,
        request_count: embeddingUsage?.request_count ?? 0,
        prompt_token_count: embeddingUsage?.prompt_token_count ?? 0,
        embeddings: embeddingRows,
      };
      const extractPayload = {
        schema_uid: (runRow.user_schema_uid as string | null) ?? null,
        extracts: [] as Array<Record<string, unknown>>,
      };
      const enricherPayloadByNode = Object.fromEntries(
        enricherResults.map((row) => [row.node, row]),
      );
      let previewPdfUploaded = false;
      let previewPdfUploadSizeBytes = 0;
      let previewPayload = buildPreviewManifest({
        source_type: sourceDoc.source_type,
        source_locator: sourceDoc.source_locator,
      });
      const partitionPayloadJson = JSON.stringify(partitionPayload);
      const elementsPayloadJson = JSON.stringify(elementsPayload);
      const chunkPayloadJson = JSON.stringify(chunkPayload);
      const embedPayloadJson = JSON.stringify(embedPayload);
      const extractPayloadJson = JSON.stringify(extractPayload);
      const partitionPayloadBytes = new TextEncoder().encode(
        partitionPayloadJson,
      );
      const elementsPayloadBytes = new TextEncoder().encode(
        elementsPayloadJson,
      );
      const chunkPayloadBytes = new TextEncoder().encode(chunkPayloadJson);
      const embedPayloadBytes = new TextEncoder().encode(embedPayloadJson);
      const extractPayloadBytes = new TextEncoder().encode(extractPayloadJson);
      const artifactsBucket = Deno.env.get("DOCUMENTS_BUCKET")?.trim() ||
        "documents";

      const { error: partitionUploadErr } = await supabaseAdmin.storage
        .from(artifactsBucket)
        .upload(partitionArtifactKey, partitionPayloadJson, {
          contentType: "application/json",
          upsert: true,
        });
      if (partitionUploadErr) {
        throw new Error(
          `Failed to upload partition artifact: ${partitionUploadErr.message}`,
        );
      }

      const { error: elementsUploadErr } = await supabaseAdmin.storage
        .from(artifactsBucket)
        .upload(elementsArtifactKey, elementsPayloadJson, {
          contentType: "application/json",
          upsert: true,
        });
      if (elementsUploadErr) {
        throw new Error(
          `Failed to upload elements artifact: ${elementsUploadErr.message}`,
        );
      }
      let chunkUploaded = false;
      let embedUploaded = false;
      let extractUploaded = false;
      if (flowMode === "transform") {
        const { error: chunkUploadErr } = await supabaseAdmin.storage
          .from(artifactsBucket)
          .upload(chunkArtifactKey, chunkPayloadJson, {
            contentType: "application/json",
            upsert: true,
          });
        if (chunkUploadErr) {
          throw new Error(
            `Failed to upload chunk artifact: ${chunkUploadErr.message}`,
          );
        }
        chunkUploaded = true;

        if (workflowConfig.embedding.enabled) {
          const { error: embedUploadErr } = await supabaseAdmin.storage
            .from(artifactsBucket)
            .upload(embedArtifactKey, embedPayloadJson, {
              contentType: "application/json",
              upsert: true,
            });
          if (embedUploadErr) {
            throw new Error(
              `Failed to upload embedding artifact: ${embedUploadErr.message}`,
            );
          }
          embedUploaded = true;
        }
      }

      if (sourceDoc.source_type.toLowerCase() !== "pdf") {
        try {
          const previewPdfBytes = buildPreviewPdfBytesFromElements({
            source_uid,
            source_type: sourceDoc.source_type,
            source_locator: sourceDoc.source_locator,
            doc_title: sourceDoc.doc_title,
            elements: enrichedElements,
          });
          const { error: previewPdfUploadErr } = await supabaseAdmin.storage
            .from(artifactsBucket)
            .upload(previewPdfArtifactKey, previewPdfBytes, {
              contentType: "application/pdf",
              upsert: true,
            });
          if (previewPdfUploadErr) {
            previewPayload = buildPreviewManifest({
              source_type: sourceDoc.source_type,
              source_locator: sourceDoc.source_locator,
              preview_error_reason:
                `preview_pdf_upload_failed:${previewPdfUploadErr.message}`,
            });
          } else {
            previewPdfUploaded = true;
            previewPdfUploadSizeBytes = previewPdfBytes.byteLength;
            previewPayload = buildPreviewManifest({
              source_type: sourceDoc.source_type,
              source_locator: sourceDoc.source_locator,
              preview_pdf_storage_key: previewPdfArtifactKey,
            });
          }
        } catch (previewPdfErr) {
          previewPayload = buildPreviewManifest({
            source_type: sourceDoc.source_type,
            source_locator: sourceDoc.source_locator,
            preview_error_reason: `preview_pdf_generation_failed:${
              toErrorMessage(previewPdfErr).slice(0, 180)
            }`,
          });
        }
      }

      const previewPayloadJson = JSON.stringify(previewPayload);
      const previewPayloadBytes = new TextEncoder().encode(previewPayloadJson);
      let previewManifestUploaded = false;
      const { error: previewUploadErr } = await supabaseAdmin.storage
        .from(artifactsBucket)
        .upload(previewArtifactKey, previewPayloadJson, {
          contentType: "application/json",
          upsert: true,
        });
      if (previewUploadErr) {
        try {
          await supabaseAdmin.from("unstructured_state_events_v2").insert({
            run_uid,
            source_uid,
            entity_type: "doc",
            from_status: "persisting",
            to_status: "persisting",
            detail_json: {
              warning: "preview_manifest_upload_failed",
              reason: previewUploadErr.message.slice(0, 500),
            },
          });
        } catch {
          // Best-effort warning event.
        }
      } else {
        previewManifestUploaded = true;
      }

      const docIds = await buildTrackBIds({
        run_uid,
        source_uid,
        element_ordinal: 0,
      });

      const { error: docUpsertErr } = await supabaseAdmin
        .from("unstructured_documents_v2")
        .upsert({
          u_doc_uid: docIds.u_doc_uid,
          canonical_doc_uid: docIds.canonical_doc_uid,
          run_uid,
          source_uid,
          workspace_id: runRow.workspace_id,
          project_id: runRow.project_id,
          status: "success",
          updated_at: now,
        }, { onConflict: "run_uid,source_uid" });
      if (docUpsertErr) {
        throw new Error(
          `Failed to upsert unstructured_documents_v2: ${docUpsertErr.message}`,
        );
      }

      const blockRows: Record<string, unknown>[] = [];
      const blockIdentityRows: Array<{ u_block_uid: string; element_ordinal: number }> = [];
      const fallbackRawElementTypes: string[] = [];
      for (let idx = 0; idx < enrichedElements.length; idx++) {
        const element = enrichedElements[idx];
        const ids = await buildTrackBIds({
          run_uid,
          source_uid,
          element_ordinal: idx,
        });
        const mappedType = resolvePlatformBlockType({
          raw_element_type: element.raw_element_type,
          mapping: taxonomy.mapping,
          fallback: taxonomy.fallback,
        });
        if (mappedType.used_fallback) {
          fallbackRawElementTypes.push(element.raw_element_type);
        }
        blockRows.push({
          u_block_uid: ids.u_block_uid,
          u_doc_uid: docIds.u_doc_uid,
          canonical_block_uid: ids.canonical_block_uid,
          source_uid,
          raw_element_id: element.raw_element_id,
          element_ordinal: idx,
          page_number: element.page_number,
          platform_block_type: mappedType.platform_block_type,
          raw_element_type: element.raw_element_type,
          text: element.text,
          metadata_json: {
            ...element.metadata_json,
            raw_element_payload: element.raw_payload,
            partition_backend: partitionBackend,
            flow_mode: runRow.flow_mode,
            source_type: sourceDoc.source_type,
            source_locator: sourceDoc.source_locator,
            worker_producer: "track_b_worker_v1",
            taxonomy_mapping_version: "2026-02-14",
          },
          coordinates_json: element.coordinates_json,
        });
        blockIdentityRows.push({ u_block_uid: ids.u_block_uid, element_ordinal: idx });
      }

      const { error: blockUpsertErr } = await supabaseAdmin
        .from("unstructured_blocks_v2")
        .upsert(blockRows, { onConflict: "u_doc_uid,element_ordinal" });
      if (blockUpsertErr) {
        throw new Error(
          `Failed to upsert unstructured_blocks_v2: ${blockUpsertErr.message}`,
        );
      }

      if (flowMode === "extract") {
        const schemaJson = (extractSchemaResult as { ok: true; schema_jsonb: Record<string, unknown> })
          .schema_jsonb;
        extractRows = [];
        for (const row of blockIdentityRows) {
          const element = enrichedElements[row.element_ordinal];
          try {
            const llmResult = await extractBlockWithLLM({
              schema_jsonb: schemaJson,
              element_text: element.text,
              block_type: element.raw_element_type,
            });
            extractRows.push({
              run_uid,
              u_block_uid: row.u_block_uid,
              source_uid,
              user_schema_uid: runRow.user_schema_uid,
              extract_jsonb: llmResult.data,
              status: "success",
              llm_usage_json: {
                provider: "vertex_ai_claude",
                model: (asObject(schemaJson.prompt_config) ?? {}).model ?? "claude-sonnet-4-5-20250929",
                input_tokens: llmResult.usage.input_tokens,
                output_tokens: llmResult.usage.output_tokens,
              },
              last_error: null,
              updated_at: now,
            });
          } catch (extractErr) {
            const errMsg = extractErr instanceof Error ? extractErr.message : String(extractErr);
            extractRows.push({
              run_uid,
              u_block_uid: row.u_block_uid,
              source_uid,
              user_schema_uid: runRow.user_schema_uid,
              extract_jsonb: buildDeterministicExtractJson({
                schema_jsonb: schemaJson,
                element_text: element.text,
              }),
              status: "failed",
              llm_usage_json: { provider: "vertex_ai_claude", error: true },
              last_error: errMsg.slice(0, 1000),
              updated_at: now,
            });
          }
        }
        extractPayload.extracts = extractRows;
        const { error: extractTableErr } = await supabaseAdmin
          .from("unstructured_block_extracts_v2")
          .upsert(extractRows, { onConflict: "run_uid,u_block_uid" });
        if (extractTableErr) {
          throw new Error(
            `Failed to upsert unstructured_block_extracts_v2: ${extractTableErr.message}`,
          );
        }
        const { error: extractUploadErr } = await supabaseAdmin.storage
          .from(artifactsBucket)
          .upload(extractArtifactKey, JSON.stringify(extractPayload), {
            contentType: "application/json",
            upsert: true,
          });
        if (extractUploadErr) {
          throw new Error(
            `Failed to upload extract artifact: ${extractUploadErr.message}`,
          );
        }
        extractUploaded = true;
      }

      if (fallbackRawElementTypes.length > 0) {
        await supabaseAdmin.from("unstructured_state_events_v2").insert({
          run_uid,
          source_uid,
          entity_type: "doc",
          from_status: "partitioning",
          to_status: "partitioning",
          detail_json: {
            warning: "unknown_raw_element_type_fallback",
            raw_element_types: [...new Set(fallbackRawElementTypes)],
            fallback_platform_block_type: taxonomy.fallback,
            mapping_version: "2026-02-14",
          },
        });
      }

      const enricherArtifactRows: Array<Record<string, unknown>> = [];
      for (const enricher of enricherResults) {
        const enricherArtifactKey = buildTrackBArtifactKey({
          workspace_id: runRow.workspace_id,
          run_uid,
          source_uid,
          filename: `enrich.${enricher.node}.json`,
        });
        const enricherJson = JSON.stringify({
          node: enricher.node,
          status: enricher.status,
          skip_reason: enricher.skip_reason,
          eligible_count: enricher.eligible_count,
          applied_count: enricher.applied_count,
        });
        const { error: enricherUploadErr } = await supabaseAdmin.storage
          .from(artifactsBucket)
          .upload(enricherArtifactKey, enricherJson, {
            contentType: "application/json",
            upsert: true,
          });
        if (enricherUploadErr) {
          await supabaseAdmin.from("unstructured_state_events_v2").insert({
            run_uid,
            source_uid,
            entity_type: "doc",
            from_status: "enriching",
            to_status: "enriching",
            detail_json: {
              warning: "enricher_artifact_upload_failed",
              node: enricher.node,
              reason: enricherUploadErr.message.slice(0, 500),
            },
          });
          continue;
        }
        enricherArtifactRows.push({
          run_uid,
          source_uid,
          step_name: "enrich",
          artifact_type: `${enricher.node}_json`,
          storage_bucket: artifactsBucket,
          storage_key: enricherArtifactKey,
          content_type: "application/json",
          size_bytes: new TextEncoder().encode(enricherJson).byteLength,
        });
      }

      const stepArtifactRows: Array<Record<string, unknown>> = [
        {
          run_uid,
          source_uid,
          step_name: "partition",
          artifact_type: "partition_json",
          storage_bucket: artifactsBucket,
          storage_key: partitionArtifactKey,
          content_type: "application/json",
          size_bytes: partitionPayloadBytes.byteLength,
        },
        {
          run_uid,
          source_uid,
          step_name: "persist",
          artifact_type: "elements_json",
          storage_bucket: artifactsBucket,
          storage_key: elementsArtifactKey,
          content_type: "application/json",
          size_bytes: elementsPayloadBytes.byteLength,
        },
      ];
      if (chunkUploaded) {
        stepArtifactRows.push({
          run_uid,
          source_uid,
          step_name: "chunk",
          artifact_type: "chunk_json",
          storage_bucket: artifactsBucket,
          storage_key: chunkArtifactKey,
          content_type: "application/json",
          size_bytes: chunkPayloadBytes.byteLength,
        });
      }
      if (embedUploaded) {
        stepArtifactRows.push({
          run_uid,
          source_uid,
          step_name: "embed",
          artifact_type: "embedding_json",
          storage_bucket: artifactsBucket,
          storage_key: embedArtifactKey,
          content_type: "application/json",
          size_bytes: embedPayloadBytes.byteLength,
        });
      }
      if (extractUploaded) {
        stepArtifactRows.push({
          run_uid,
          source_uid,
          step_name: "extract",
          artifact_type: "extract_json",
          storage_bucket: artifactsBucket,
          storage_key: extractArtifactKey,
          content_type: "application/json",
          size_bytes: extractPayloadBytes.byteLength,
        });
      }
      stepArtifactRows.push(...enricherArtifactRows);
      if (previewManifestUploaded) {
        stepArtifactRows.push({
          run_uid,
          source_uid,
          step_name: "preview",
          artifact_type: "preview_manifest_json",
          storage_bucket: artifactsBucket,
          storage_key: previewArtifactKey,
          content_type: "application/json",
          size_bytes: previewPayloadBytes.byteLength,
        });
      }
      if (previewPdfUploaded) {
        stepArtifactRows.push({
          run_uid,
          source_uid,
          step_name: "preview",
          artifact_type: "preview_pdf",
          storage_bucket: artifactsBucket,
          storage_key: previewPdfArtifactKey,
          content_type: "application/pdf",
          size_bytes: previewPdfUploadSizeBytes,
        });
      }

      const { error: artifactErr } = await supabaseAdmin
        .from("unstructured_step_artifacts_v2")
        .insert(stepArtifactRows);
      if (artifactErr) {
        throw new Error(
          `Failed to insert step artifacts: ${artifactErr.message}`,
        );
      }

      const representationRows: Array<Record<string, unknown>> = [
        {
          run_uid,
          source_uid,
          representation_type: "unstructured_elements_json",
          storage_bucket: artifactsBucket,
          storage_key: elementsArtifactKey,
          content_type: "application/json",
          size_bytes: elementsPayloadBytes.byteLength,
        },
      ];
      if (embedUploaded) {
        representationRows.push({
          run_uid,
          source_uid,
          representation_type: "unstructured_chunk_embeddings_json",
          storage_bucket: artifactsBucket,
          storage_key: embedArtifactKey,
          content_type: "application/json",
          size_bytes: embedPayloadBytes.byteLength,
        });
      }
      if (extractUploaded) {
        representationRows.push({
          run_uid,
          source_uid,
          representation_type: "unstructured_block_extracts_json",
          storage_bucket: artifactsBucket,
          storage_key: extractArtifactKey,
          content_type: "application/json",
          size_bytes: extractPayloadBytes.byteLength,
        });
      }
      if (previewPdfUploaded) {
        representationRows.push({
          run_uid,
          source_uid,
          representation_type: "preview_pdf",
          storage_bucket: artifactsBucket,
          storage_key: previewPdfArtifactKey,
          content_type: "application/pdf",
          size_bytes: previewPdfUploadSizeBytes,
        });
      }

      const { error: reprErr } = await supabaseAdmin
        .from("unstructured_representations_v2")
        .insert(representationRows);
      if (reprErr) {
        throw new Error(
          `Failed to insert unstructured representation: ${reprErr.message}`,
        );
      }

      stepMarks.success = new Date().toISOString();
      await updateRunDocStatus(
        supabaseAdmin,
        run_uid,
        source_uid,
        "success",
        undefined,
        stepMarks.success,
      );

      try {
        await supabaseAdmin.from("unstructured_state_events_v2").insert({
          run_uid,
          source_uid,
          entity_type: "doc",
          from_status: "persisting",
          to_status: "persisting",
          detail_json: {
            event: "doc_observability",
            partition_backend: partitionBackend,
            step_durations_ms: computeStepDurationsMs(stepMarks),
            chunk_count: chunkRows.length,
            embedding_count: embeddingRows.length,
            embedding_usage: embeddingUsage,
            extract_count: extractRows.length,
            artifact_count: stepArtifactRows.length,
            enricher_results: enricherPayloadByNode,
            preview_status: previewPayload.status,
            preview_type: previewPayload.preview_type,
            preview_pdf_uploaded: previewPdfUploaded,
            preview_manifest_uploaded: previewManifestUploaded,
          },
        });
      } catch {
        // Best-effort observability event.
      }
      successCount += 1;
    } catch (e) {
      const msg = toErrorMessage(e);
      runStepFailureCounts[currentStep] = (runStepFailureCounts[currentStep] ?? 0) + 1;
      try {
        await supabaseAdmin.from("unstructured_state_events_v2").insert({
          run_uid,
          source_uid,
          entity_type: "doc",
          from_status: currentStep,
          to_status: currentStep,
          detail_json: {
            event: "doc_failure_observability",
            failed_step: currentStep,
            reason: msg.slice(0, 1000),
          },
        });
      } catch {
        // Best-effort observability event.
      }
      try {
        await updateRunDocStatus(
          supabaseAdmin,
          run_uid,
          source_uid,
          "failed",
          msg,
        );
      } catch {
        // Best-effort failure status update.
      }
      failedCount += 1;
    }
  }

  const status = deriveRunTerminalStatus({ successCount, failedCount });
  try {
    await supabaseAdmin.from("unstructured_state_events_v2").insert({
      run_uid,
      entity_type: "run",
      from_status: "running",
      to_status: "running",
      detail_json: {
        event: "run_observability",
        success_docs: successCount,
        failed_docs: failedCount,
        step_failure_counts: runStepFailureCounts,
      },
    });
  } catch {
    // Best-effort observability event.
  }

  const { error: runUpdateErr } = await supabaseAdmin
    .from("unstructured_workflow_runs_v2")
    .update({
      status,
      ended_at: new Date().toISOString(),
      error: failedCount > 0 ? `${failedCount} document(s) failed` : null,
    })
    .eq("run_uid", run_uid);
  if (runUpdateErr) {
    throw new Error(`Failed to finalize run status: ${runUpdateErr.message}`);
  }

  return {
    run_uid,
    success_docs: successCount,
    failed_docs: failedCount,
    status,
  };
}

export async function handleTrackBWorkerRequest(
  req: Request,
  deps: WorkerDeps = defaultDeps,
): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const expectedKey = deps.requireEnv("TRACK_B_WORKER_KEY");
  const gotKey = req.headers.get("X-Track-B-Worker-Key");
  if (!gotKey || gotKey !== expectedKey) {
    return json(401, { error: "Unauthorized" });
  }

  try {
    const loadRuntimePolicy = deps.loadRuntimePolicy ?? defaultLoadRuntimePolicy;
    const payload = parseWorkerPayload(await req.json().catch(() => ({})));
    const workerId = crypto.randomUUID();
    const supabaseAdmin = deps.createAdminClient();
    const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);
    if (!runtimePolicy.track_b.worker_enabled) {
      return json(503, {
        error: "Track B worker is disabled by runtime policy",
        code: "TRACK_B_WORKER_DISABLED",
      });
    }

    const { data: claimedRows, error: claimErr } = await supabaseAdmin.rpc(
      "claim_unstructured_run_batch",
      {
        p_batch_size: payload.batch_size,
        p_worker_id: workerId,
      },
    );
    if (claimErr) {
      return json(500, { error: `Failed to claim runs: ${claimErr.message}` });
    }

    const run_uids = ((claimedRows ?? []) as Array<{ run_uid: string }>).map((
      r,
    ) => r.run_uid);
    const processed: Array<
      {
        run_uid: string;
        success_docs: number;
        failed_docs: number;
        status: RunTerminalStatus;
      }
    > = [];
    for (const run_uid of run_uids) {
      const result = await processRun(supabaseAdmin, run_uid);
      processed.push(result);
    }

    return json(200, {
      worker_id: workerId,
      claimed_count: run_uids.length,
      processed,
    });
  } catch (e) {
    return json(500, { error: toErrorMessage(e) });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleTrackBWorkerRequest(req));
}

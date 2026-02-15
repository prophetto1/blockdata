import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { requireEnv as defaultRequireEnv } from "../_shared/env.ts";
import { sha256HexOfString } from "../_shared/hash.ts";
import { createAdminClient as defaultCreateAdminClient } from "../_shared/supabase.ts";

type WorkerDeps = {
  requireEnv: (name: string) => string;
  createAdminClient: () => ReturnType<typeof defaultCreateAdminClient>;
};

const defaultDeps: WorkerDeps = {
  requireEnv: defaultRequireEnv,
  createAdminClient: defaultCreateAdminClient,
};

type WorkerPayload = {
  batch_size: number;
};

type RunTerminalStatus = "success" | "partial_success" | "failed";

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
    strategy: "auto";
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

export const DOC_STATUS_EXECUTION_ORDER = [
  "indexing",
  "downloading",
  "partitioning",
  "chunking",
  "enriching",
  "persisting",
] as const;

type PreviewManifest = {
  status: "ready" | "unavailable";
  preview_type: "source_pdf" | "none";
  source_locator: string;
  source_type: string;
  reason?: string;
};

type StepMarks = Partial<Record<
  | "indexing"
  | "downloading"
  | "partitioning"
  | "chunking"
  | "enriching"
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
      strategy: "auto",
      output_format: "application/json",
      unique_element_ids: false,
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
  return {
    indexing_ms: diff(marks.indexing, marks.downloading),
    downloading_ms: diff(marks.downloading, marks.partitioning),
    partitioning_ms: diff(marks.partitioning, marks.chunking),
    chunking_ms: diff(marks.chunking, marks.enriching),
    enriching_ms: diff(marks.enriching, marks.persisting),
    persisting_ms: diff(marks.persisting, marks.success),
  };
}

export function buildPreviewManifest(input: {
  source_type: string;
  source_locator: string;
}): PreviewManifest {
  if (input.source_type.toLowerCase() === "pdf") {
    return {
      status: "ready",
      preview_type: "source_pdf",
      source_locator: input.source_locator,
      source_type: input.source_type,
    };
  }
  return {
    status: "unavailable",
    preview_type: "none",
    source_locator: input.source_locator,
    source_type: input.source_type,
    reason: "preview_not_generated_yet_for_source_type",
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
    updateBody.step_embedded_at = nowIso;
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

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });
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

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(buildPartitionServiceRequest(input)),
    });
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
    .select("run_uid, workspace_id, project_id, flow_mode")
    .eq("run_uid", run_uid)
    .single();
  if (runErr || !runRow) {
    throw new Error(`Track B run not found: ${runErr?.message ?? run_uid}`);
  }

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
      const advanceStatus = async (status: typeof DOC_STATUS_EXECUTION_ORDER[number]) => {
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

      await advanceStatus(DOC_STATUS_EXECUTION_ORDER[0]);
      await advanceStatus(DOC_STATUS_EXECUTION_ORDER[1]);
      await advanceStatus(DOC_STATUS_EXECUTION_ORDER[2]);

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
      await advanceStatus(DOC_STATUS_EXECUTION_ORDER[3]);
      const chunkMaxChars = parsePositiveIntEnv(
        Deno.env.get("TRACK_B_CHUNK_MAX_CHARS"),
        1200,
        200,
        8000,
      );
      const embedDimensions = parsePositiveIntEnv(
        Deno.env.get("TRACK_B_EMBED_DIMENSIONS"),
        8,
        4,
        256,
      );
      const chunkRows = buildChunksFromPartitionElements(
        partitionElements,
        chunkMaxChars,
      );
      await advanceStatus(DOC_STATUS_EXECUTION_ORDER[4]);
      const embeddingRows = buildDeterministicChunkEmbeddings(
        chunkRows,
        embedDimensions,
      );
      await advanceStatus(DOC_STATUS_EXECUTION_ORDER[5]);
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
      const chunkArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "chunks.json",
      });
      const embedArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "embeddings.json",
      });
      const previewArtifactKey = buildTrackBArtifactKey({
        workspace_id: runRow.workspace_id,
        run_uid,
        source_uid,
        filename: "preview.json",
      });
      const partitionPayload = {
        backend: partitionBackend,
        elements: partitionElements,
      };
      const elementsPayload = partitionElements;
      const chunkPayload = { chunks: chunkRows };
      const embedPayload = { embeddings: embeddingRows };
      const previewPayload = buildPreviewManifest({
        source_type: sourceDoc.source_type,
        source_locator: sourceDoc.source_locator,
      });
      const partitionPayloadJson = JSON.stringify(partitionPayload);
      const elementsPayloadJson = JSON.stringify(elementsPayload);
      const chunkPayloadJson = JSON.stringify(chunkPayload);
      const embedPayloadJson = JSON.stringify(embedPayload);
      const previewPayloadJson = JSON.stringify(previewPayload);
      const partitionPayloadBytes = new TextEncoder().encode(
        partitionPayloadJson,
      );
      const elementsPayloadBytes = new TextEncoder().encode(
        elementsPayloadJson,
      );
      const chunkPayloadBytes = new TextEncoder().encode(chunkPayloadJson);
      const embedPayloadBytes = new TextEncoder().encode(embedPayloadJson);
      const previewPayloadBytes = new TextEncoder().encode(previewPayloadJson);
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

      const { error: previewUploadErr } = await supabaseAdmin.storage
        .from(artifactsBucket)
        .upload(previewArtifactKey, previewPayloadJson, {
          contentType: "application/json",
          upsert: true,
        });
      if (previewUploadErr) {
        throw new Error(
          `Failed to upload preview artifact: ${previewUploadErr.message}`,
        );
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
      const fallbackRawElementTypes: string[] = [];
      for (let idx = 0; idx < partitionElements.length; idx++) {
        const element = partitionElements[idx];
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
      }

      const { error: blockUpsertErr } = await supabaseAdmin
        .from("unstructured_blocks_v2")
        .upsert(blockRows, { onConflict: "u_doc_uid,element_ordinal" });
      if (blockUpsertErr) {
        throw new Error(
          `Failed to upsert unstructured_blocks_v2: ${blockUpsertErr.message}`,
        );
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

      const { error: artifactErr } = await supabaseAdmin
        .from("unstructured_step_artifacts_v2")
        .insert([
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
            step_name: "chunk",
            artifact_type: "chunk_json",
            storage_bucket: artifactsBucket,
            storage_key: chunkArtifactKey,
            content_type: "application/json",
            size_bytes: chunkPayloadBytes.byteLength,
          },
          {
            run_uid,
            source_uid,
            step_name: "embed",
            artifact_type: "embedding_json",
            storage_bucket: artifactsBucket,
            storage_key: embedArtifactKey,
            content_type: "application/json",
            size_bytes: embedPayloadBytes.byteLength,
          },
          {
            run_uid,
            source_uid,
            step_name: "preview",
            artifact_type: "preview_manifest_json",
            storage_bucket: artifactsBucket,
            storage_key: previewArtifactKey,
            content_type: "application/json",
            size_bytes: previewPayloadBytes.byteLength,
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
        ]);
      if (artifactErr) {
        throw new Error(
          `Failed to insert step artifacts: ${artifactErr.message}`,
        );
      }

      const { error: reprErr } = await supabaseAdmin
        .from("unstructured_representations_v2")
        .insert([
          {
            run_uid,
            source_uid,
            representation_type: "unstructured_elements_json",
            storage_bucket: artifactsBucket,
            storage_key: elementsArtifactKey,
            content_type: "application/json",
            size_bytes: elementsPayloadBytes.byteLength,
          },
          {
            run_uid,
            source_uid,
            representation_type: "unstructured_chunk_embeddings_json",
            storage_bucket: artifactsBucket,
            storage_key: embedArtifactKey,
            content_type: "application/json",
            size_bytes: embedPayloadBytes.byteLength,
          },
        ]);
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
            artifact_count: 5,
            preview_status: previewPayload.status,
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
    const payload = parseWorkerPayload(await req.json().catch(() => ({})));
    const workerId = crypto.randomUUID();
    const supabaseAdmin = deps.createAdminClient();

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

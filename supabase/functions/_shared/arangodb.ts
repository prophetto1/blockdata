import { getEnv, requireEnv } from "./env.ts";

// --- Config ---

export type ArangoConfig = {
  baseUrl: string;
  database: string;
  username: string;
  password: string;
  documentsCollection: string;
  blocksCollection: string;
  doclingDocumentsCollection: string;
  runsCollection: string;
  overlaysCollection: string;
  fetchImpl?: typeof fetch;
};

// --- Record types ---

export type ArangoBlockRecord = {
  block_uid: string;
  block_index: number;
  block_type: string;
  block_content: string;
  block_locator: Record<string, unknown>;
};

export type ArangoAssetDocument = {
  source_uid: string;
  project_id: string | null;
  owner_id: string;
  source_type: string;
  doc_title: string;
  source_locator: string;
  source_filesize: number | null;
  source_total_characters: number | null;
  status: string;
  conversion_job_id: string | null;
  error: string | null;
  uploaded_at: string | null;
  updated_at: string | null;
  conv_uid: string | null;
  conv_locator: string | null;
  conv_status: string | null;
  conv_representation_type: string | null;
  pipeline_config: Record<string, unknown> | null;
  block_count: number | null;
};

export type ArangoParsedDocument = ArangoAssetDocument & {
  conv_uid: string;
  conv_locator: string;
  conv_status: string;
  conv_representation_type: string;
  docling_document_json?: Record<string, unknown>;
  blocks: ArangoBlockRecord[];
};

export type ArangoDoclingDocumentRecord = {
  source_uid: string;
  conv_uid: string;
  project_id: string | null;
  owner_id: string;
  doc_title: string;
  source_type: string;
  source_locator: string;
  conv_locator: string;
  docling_document_json: Record<string, unknown>;
};

export type ArangoRunRecord = {
  run_id: string;
  source_uid: string;
  conv_uid: string;
  project_id: string | null;
  owner_id: string;
  schema_id: string;
  status: string;
  total_blocks: number;
  completed_blocks: number;
  failed_blocks: number;
  started_at: string;
  completed_at: string | null;
  model_config: Record<string, unknown> | null;
};

export type ArangoOverlayRecord = {
  overlay_uid: string;
  run_id: string;
  source_uid: string;
  conv_uid: string;
  project_id: string | null;
  owner_id: string;
  block_uid: string;
  status: string;
  overlay_jsonb_staging: Record<string, unknown>;
  overlay_jsonb_confirmed: Record<string, unknown>;
  claimed_by: string | null;
  claimed_at: string | null;
  attempt_count: number;
  last_error: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
};

// --- Config loading ---

function isEnabledFlag(value: string): boolean {
  return value.trim().toLowerCase() === "true";
}

export function loadArangoConfigFromEnv(): ArangoConfig | null {
  const enabled = isEnabledFlag(getEnv("ARANGO_SYNC_ENABLED", "false"));
  if (!enabled) return null;

  return {
    baseUrl: requireEnv("ARANGO_URL").replace(/\/+$/, ""),
    database: requireEnv("ARANGO_DATABASE"),
    username: requireEnv("ARANGO_USERNAME"),
    password: requireEnv("ARANGO_PASSWORD"),
    documentsCollection: getEnv(
      "ARANGO_DOCUMENTS_COLLECTION",
      "blockdata_documents",
    ),
    blocksCollection: getEnv("ARANGO_BLOCKS_COLLECTION", "blockdata_blocks"),
    doclingDocumentsCollection: getEnv(
      "ARANGO_DOCLING_DOCUMENTS_COLLECTION",
      "blockdata_docling_documents",
    ),
    runsCollection: getEnv("ARANGO_RUNS_COLLECTION", "blockdata_runs"),
    overlaysCollection: getEnv(
      "ARANGO_OVERLAYS_COLLECTION",
      "blockdata_overlays",
    ),
  };
}

export function toArangoKey(value: string): string {
  return value.replace(/[^0-9A-Za-z_\-:.@()+,=;$!*'%]/g, "_");
}

// --- Low-level request helpers ---

function authHeader(config: ArangoConfig): string {
  return `Basic ${btoa(`${config.username}:${config.password}`)}`;
}

async function arangoRequest(
  config: ArangoConfig,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const resp = await fetchImpl(
    `${config.baseUrl}/_db/${config.database}${path}`,
    {
      ...init,
      headers: {
        Authorization: authHeader(config),
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    },
  );
  return resp;
}

// --- Collection cache ---

const _collectionCache = new Set<string>();

/** Exported for tests only. Clears the collection-exists cache. */
export function _resetCollectionCache(): void {
  _collectionCache.clear();
}

async function ensureCollection(
  config: ArangoConfig,
  name: string,
): Promise<void> {
  const resp = await arangoRequest(config, "/_api/collection", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  if (resp.ok) return;

  const body = await resp.text().catch(() => "");
  if (resp.status === 409 || body.includes('"errorNum":1207')) {
    return;
  }

  throw new Error(
    `Arango ensureCollection failed for ${name}: ${resp.status} ${
      body.slice(0, 300)
    }`,
  );
}

async function ensureCachedCollection(
  config: ArangoConfig,
  name: string,
): Promise<void> {
  if (_collectionCache.has(name)) return;
  await ensureCollection(config, name);
  _collectionCache.add(name);
}

// --- Document CRUD helpers ---

async function replaceDocument(
  config: ArangoConfig,
  collection: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const resp = await arangoRequest(
    config,
    `/_api/document/${encodeURIComponent(collection)}?overwriteMode=replace`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (resp.ok) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango replaceDocument failed for ${collection}: ${resp.status} ${
      body.slice(0, 300)
    }`,
  );
}

async function replaceDocuments(
  config: ArangoConfig,
  collection: string,
  payload: Record<string, unknown>[],
): Promise<void> {
  const resp = await arangoRequest(
    config,
    `/_api/document/${encodeURIComponent(collection)}?overwriteMode=replace`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (resp.ok) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango replaceDocuments failed for ${collection}: ${resp.status} ${
      body.slice(0, 300)
    }`,
  );
}

async function deleteDocument(
  config: ArangoConfig,
  collection: string,
  sourceUid: string,
): Promise<void> {
  const resp = await arangoRequest(
    config,
    `/_api/document/${encodeURIComponent(collection)}/${encodeURIComponent(toArangoKey(sourceUid))}`,
    { method: "DELETE" },
  );
  if (resp.ok || resp.status === 404) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango deleteDocument failed for ${collection}: ${resp.status} ${body.slice(0, 300)}`,
  );
}

async function patchDocument(
  config: ArangoConfig,
  collection: string,
  sourceUid: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const resp = await arangoRequest(
    config,
    `/_api/document/${encodeURIComponent(collection)}/${encodeURIComponent(toArangoKey(sourceUid))}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  if (resp.ok) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango patchDocument failed for ${collection}: ${resp.status} ${body.slice(0, 300)}`,
  );
}

// --- AQL delete helpers ---

async function deleteBlocksForSource(
  config: ArangoConfig,
  sourceUid: string,
): Promise<void> {
  const resp = await arangoRequest(config, "/_api/cursor", {
    method: "POST",
    body: JSON.stringify({
      query:
        "FOR b IN @@blocks FILTER b.source_uid == @source_uid REMOVE b IN @@blocks",
      bindVars: {
        "@blocks": config.blocksCollection,
        source_uid: sourceUid,
      },
    }),
  });

  if (resp.ok) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango deleteBlocksForSource failed: ${resp.status} ${body.slice(0, 300)}`,
  );
}

async function deleteBySourceUid(
  config: ArangoConfig,
  collection: string,
  sourceUid: string,
): Promise<void> {
  const resp = await arangoRequest(config, "/_api/cursor", {
    method: "POST",
    body: JSON.stringify({
      query:
        "FOR d IN @@coll FILTER d.source_uid == @source_uid REMOVE d IN @@coll",
      bindVars: {
        "@coll": collection,
        source_uid: sourceUid,
      },
    }),
  });

  if (resp.ok) return;
  const body = await resp.text().catch(() => "");
  throw new Error(
    `Arango deleteBySourceUid failed for ${collection}: ${resp.status} ${body.slice(0, 300)}`,
  );
}

// --- Reset contract ---

/**
 * Upload-stage reset payload. Every field here must match the shape
 * written by process-upload-only.ts (lines 49-69) so reset restores
 * the exact same Arango document state as a fresh upload.
 */
const UPLOAD_STAGE_RESET_FIELDS: Record<string, unknown> = {
  status: "uploaded",
  conversion_job_id: null,
  conv_uid: null,
  conv_locator: null,
  conv_status: null,
  conv_representation_type: null,
  pipeline_config: null,
  block_count: null,
  error: null,
  source_total_characters: null,
};

// --- Projection delete/reset (all five collections) ---

export async function deleteProjectionForSourceFromArango(
  config: ArangoConfig,
  sourceUid: string,
): Promise<void> {
  // Delete order: children first, then parent.
  await deleteBySourceUid(config, config.overlaysCollection, sourceUid);
  await deleteBySourceUid(config, config.runsCollection, sourceUid);
  await deleteBlocksForSource(config, sourceUid);
  await deleteBySourceUid(config, config.doclingDocumentsCollection, sourceUid);
  await deleteDocument(config, config.documentsCollection, sourceUid);
}

export async function resetProjectionForSourceInArango(
  config: ArangoConfig,
  sourceUid: string,
): Promise<void> {
  // Delete derived data, then patch the document row back to upload-stage shape.
  await deleteBySourceUid(config, config.overlaysCollection, sourceUid);
  await deleteBySourceUid(config, config.runsCollection, sourceUid);
  await deleteBlocksForSource(config, sourceUid);
  await deleteBySourceUid(config, config.doclingDocumentsCollection, sourceUid);
  await patchDocument(config, config.documentsCollection, sourceUid, {
    ...UPLOAD_STAGE_RESET_FIELDS,
    synced_at: new Date().toISOString(),
  });
}

// --- Sync helpers ---

export async function syncParsedDocumentToArango(
  config: ArangoConfig,
  document: ArangoParsedDocument,
): Promise<void> {
  await ensureCachedCollection(config, config.blocksCollection);
  const synced_at = new Date().toISOString();

  await syncAssetToArango(config, {
    ...document,
    block_count: document.blocks.length,
  });

  await deleteBlocksForSource(config, document.source_uid);

  if (document.blocks.length === 0) {
    return;
  }

  await replaceDocuments(
    config,
    config.blocksCollection,
    document.blocks.map((block) => ({
      _key: toArangoKey(`${document.source_uid}:${block.block_index}`),
      source_uid: document.source_uid,
      project_id: document.project_id,
      owner_id: document.owner_id,
      conv_uid: document.conv_uid,
      block_uid: block.block_uid,
      block_index: block.block_index,
      block_type: block.block_type,
      block_content: block.block_content,
      block_locator: block.block_locator,
      synced_at,
    })),
  );
}

export async function syncAssetToArango(
  config: ArangoConfig,
  asset: ArangoAssetDocument,
): Promise<void> {
  await ensureCachedCollection(config, config.documentsCollection);

  const synced_at = new Date().toISOString();

  await replaceDocument(config, config.documentsCollection, {
    _key: toArangoKey(asset.source_uid),
    source_uid: asset.source_uid,
    project_id: asset.project_id,
    owner_id: asset.owner_id,
    source_type: asset.source_type,
    doc_title: asset.doc_title,
    source_locator: asset.source_locator,
    source_filesize: asset.source_filesize,
    source_total_characters: asset.source_total_characters,
    status: asset.status,
    conversion_job_id: asset.conversion_job_id,
    error: asset.error,
    uploaded_at: asset.uploaded_at,
    updated_at: asset.updated_at,
    conv_uid: asset.conv_uid,
    conv_locator: asset.conv_locator,
    conv_status: asset.conv_status,
    conv_representation_type: asset.conv_representation_type,
    pipeline_config: asset.pipeline_config ?? {},
    block_count: asset.block_count,
    synced_at,
  });
}

export async function syncDoclingDocumentToArango(
  config: ArangoConfig,
  record: ArangoDoclingDocumentRecord,
): Promise<void> {
  await ensureCachedCollection(config, config.doclingDocumentsCollection);
  await replaceDocument(config, config.doclingDocumentsCollection, {
    _key: toArangoKey(record.conv_uid),
    ...record,
    synced_at: new Date().toISOString(),
  });
}

export async function syncRunToArango(
  config: ArangoConfig,
  run: ArangoRunRecord,
): Promise<void> {
  await ensureCachedCollection(config, config.runsCollection);
  await replaceDocument(config, config.runsCollection, {
    _key: toArangoKey(run.run_id),
    ...run,
    synced_at: new Date().toISOString(),
  });
}

export async function syncOverlaysToArango(
  config: ArangoConfig,
  overlays: ArangoOverlayRecord[],
): Promise<void> {
  if (overlays.length === 0) return;
  await ensureCachedCollection(config, config.overlaysCollection);
  const synced_at = new Date().toISOString();
  await replaceDocuments(
    config,
    config.overlaysCollection,
    overlays.map((o) => ({
      _key: toArangoKey(o.overlay_uid),
      ...o,
      synced_at,
    })),
  );
}
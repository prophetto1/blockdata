import { getEnv, requireEnv } from "./env.ts";

export type ArangoConfig = {
  baseUrl: string;
  database: string;
  username: string;
  password: string;
  documentsCollection: string;
  blocksCollection: string;
  fetchImpl?: typeof fetch;
};

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
  blocks: ArangoBlockRecord[];
};

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
  };
}

export function toArangoKey(value: string): string {
  return value.replace(/[^0-9A-Za-z_\-:.@()+,=;$!*'%]/g, "_");
}

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

async function ensureDocumentsCollection(config: ArangoConfig): Promise<void> {
  await ensureCollection(config, config.documentsCollection);
}

async function ensureBlocksCollection(config: ArangoConfig): Promise<void> {
  await ensureCollection(config, config.blocksCollection);
}

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

export async function syncParsedDocumentToArango(
  config: ArangoConfig,
  document: ArangoParsedDocument,
): Promise<void> {
  await ensureBlocksCollection(config);
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
  await ensureDocumentsCollection(config);

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

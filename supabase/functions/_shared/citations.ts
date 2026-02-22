import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "./env.ts";
import { concatBytes, sha256Hex } from "./hash.ts";
import { insertRepresentationArtifact, type ParsingTool } from "./representation.ts";

type BlockContent = {
  block_content: string;
};

type PersistCitationArtifactParams = {
  supabaseAdmin: SupabaseClient;
  bucket: string;
  source_uid: string;
  conv_uid: string;
  parsing_tool: ParsingTool;
  source_type: string;
  base_artifact_locator: string;
  blocks: BlockContent[];
};

type CitationsResponse = {
  citations?: unknown[];
  total?: number;
  [key: string]: unknown;
};

const KNOWN_SUFFIXES = [
  ".docling.json",
  ".pandoc.ast.json",
  ".citations.json",
  ".doctags",
  ".md",
  ".html",
];

function stripKnownSuffix(filename: string): string {
  const lowered = filename.toLowerCase();
  for (const suffix of KNOWN_SUFFIXES) {
    if (lowered.endsWith(suffix)) {
      return filename.slice(0, filename.length - suffix.length);
    }
  }
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

function parseTotal(payload: unknown): number {
  if (typeof payload !== "object" || payload === null) return 0;
  const rec = payload as CitationsResponse;
  if (typeof rec.total === "number" && Number.isFinite(rec.total) && rec.total >= 0) {
    return rec.total;
  }
  if (Array.isArray(rec.citations)) return rec.citations.length;
  return 0;
}

export function buildCitationText(blocks: BlockContent[]): string {
  return blocks
    .map((block) => block.block_content ?? "")
    .join("\n");
}

export function toCitationArtifactLocator(locator: string): string {
  const normalized = (locator || "").trim().replace(/^\/+/, "");
  if (!normalized) {
    throw new Error("Cannot derive citation artifact locator from an empty locator");
  }

  const lastSlash = normalized.lastIndexOf("/");
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : "";
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const basename = stripKnownSuffix(filename);
  if (!basename) {
    throw new Error(`Cannot derive citation artifact locator from "${locator}"`);
  }
  return `${dir}${basename}.citations.json`;
}

async function fetchCitations(text: string): Promise<CitationsResponse> {
  if (!text.trim()) {
    return { citations: [], resources: [], total: 0 };
  }

  const conversionServiceUrl = requireEnv("CONVERSION_SERVICE_URL").replace(/\/+$/, "");
  const conversionKey = requireEnv("CONVERSION_SERVICE_KEY");

  const response = await fetch(`${conversionServiceUrl}/citations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Conversion-Service-Key": conversionKey,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Citation extraction failed: HTTP ${response.status} ${details}`.slice(0, 1000));
  }
  return await response.json() as CitationsResponse;
}

export async function persistCitationArtifactForBlocks(
  params: PersistCitationArtifactParams,
): Promise<{ artifact_locator: string | null; citation_total: number; skipped: boolean }> {
  const {
    supabaseAdmin,
    bucket,
    source_uid,
    conv_uid,
    parsing_tool,
    source_type,
    base_artifact_locator,
    blocks,
  } = params;

  const text = buildCitationText(blocks);
  const payload = await fetchCitations(text);
  const citation_total = parseTotal(payload);
  if (citation_total <= 0) {
    return { artifact_locator: null, citation_total: 0, skipped: true };
  }

  const artifact_locator = toCitationArtifactLocator(base_artifact_locator);
  const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
  const hashPrefix = new TextEncoder().encode(`${parsing_tool}\ncitations_json\n`);
  const artifact_hash = await sha256Hex(concatBytes([hashPrefix, bytes]));

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(artifact_locator, bytes, {
      upsert: true,
      contentType: "application/json; charset=utf-8",
    });
  if (uploadError) {
    throw new Error(`Storage upload citations artifact failed: ${uploadError.message}`);
  }

  await insertRepresentationArtifact(supabaseAdmin, {
    source_uid,
    conv_uid,
    parsing_tool,
    representation_type: "citations_json",
    artifact_locator,
    artifact_hash,
    artifact_size_bytes: bytes.byteLength,
    artifact_meta: {
      source_type,
      role: "derived",
      citation_total,
      text_length: text.length,
    },
  });

  return { artifact_locator, citation_total, skipped: false };
}

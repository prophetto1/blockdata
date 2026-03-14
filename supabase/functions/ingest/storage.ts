import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// This is a canonicalization map, not an upload allowlist.
// Unknown extensions still upload successfully and fall back to "binary".
const SOURCE_TYPE_BY_EXTENSION: Record<string, string> = {
  adoc: "asciidoc",
  asciidoc: "asciidoc",
  md: "md",
  markdown: "md",
  docx: "docx",
  pdf: "pdf",
  pptx: "pptx",
  xlsx: "xlsx",
  html: "html",
  htm: "html",
  csv: "csv",
  txt: "txt",
  rst: "rst",
  tex: "latex",
  latex: "latex",
  odt: "odt",
  epub: "epub",
  rtf: "rtf",
  org: "org",
  vtt: "vtt",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  bmp: "image",
  tif: "image",
  tiff: "image",
  svg: "image",
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  aac: "audio",
  ogg: "audio",
  m4a: "audio",
};

const MIME_FOR_SOURCE_TYPE: Record<string, string> = {
  asciidoc: "text/plain",
  md: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  html: "text/html",
  csv: "text/csv",
  txt: "text/plain",
  rst: "text/x-rst",
  latex: "application/x-tex",
  odt: "application/vnd.oasis.opendocument.text",
  epub: "application/epub+zip",
  rtf: "application/rtf",
  org: "text/plain",
  vtt: "text/vtt",
  image: "application/octet-stream",
  audio: "application/octet-stream",
  binary: "application/octet-stream",
};

export function normalizeExtension(value: string): string {
  return value.trim().toLowerCase().replace(/^\./, "");
}

export function detectExtension(filename: string): string | null {
  const normalized = filename.trim().toLowerCase();
  const idx = normalized.lastIndexOf(".");
  if (idx < 0 || idx === normalized.length - 1) return null;
  return normalizeExtension(normalized.slice(idx + 1));
}

export function sourceTypeFromExtension(extension: string): string | null {
  const ext = normalizeExtension(extension);
  return SOURCE_TYPE_BY_EXTENSION[ext] ?? null;
}

function normalizeMimeType(value: string): string {
  return value.trim().toLowerCase();
}

export function sourceTypeFromMimeType(mimeType: string): string | null {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) return null;
  if (normalized === "text/vtt" || normalized === "application/vtt") return "vtt";
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("audio/")) return "audio";
  return null;
}

export function detectSourceTypeForUpload(
  filename: string,
  browserMime = "",
): string {
  const extension = detectExtension(filename);
  const fromExtension = extension ? sourceTypeFromExtension(extension) : null;
  if (fromExtension) return fromExtension;

  const fromMimeType = sourceTypeFromMimeType(browserMime);
  if (fromMimeType) return fromMimeType;

  return "binary";
}

export async function uploadToStorage(
  supabaseAdmin: SupabaseClient,
  bucket: string,
  key: string,
  bytes: Uint8Array,
  sourceType: string,
  browserMime: string,
): Promise<void> {
  const contentType = MIME_FOR_SOURCE_TYPE[sourceType] || browserMime || "application/octet-stream";
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(key, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

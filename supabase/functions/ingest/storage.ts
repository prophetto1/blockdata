import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SOURCE_TYPE_BY_EXTENSION: Record<string, string> = {
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
};

const MIME_FOR_SOURCE_TYPE: Record<string, string> = {
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

export function detectSourceType(filename: string): string {
  const extension = detectExtension(filename);
  const sourceType = extension ? sourceTypeFromExtension(extension) : null;
  if (!sourceType) throw new Error(`Unsupported file type: ${filename}`);
  return sourceType;
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

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIME_FOR_SOURCE_TYPE: Record<string, string> = {
  md: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
};

export function detectSourceType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".txt")) return "txt";
  throw new Error(`Unsupported file type: ${filename}`);
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

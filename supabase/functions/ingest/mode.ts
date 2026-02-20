export type IngestMode = "ingest" | "upload_only";

/**
 * Parse ingest_mode from multipart form data.
 * Defaults to "ingest" for backward compatibility.
 */
export function parseIngestMode(value: FormDataEntryValue | null): IngestMode {
  if (typeof value !== "string") return "ingest";
  const normalized = value.trim().toLowerCase();
  return normalized === "upload_only" ? "upload_only" : "ingest";
}

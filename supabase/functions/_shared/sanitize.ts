export function sanitizeFilename(name: string): string {
  const trimmed = (name || "upload").trim();
  const normalized = trimmed.replace(/[^\w.\-()]+/g, "_");
  return normalized.slice(0, 160) || "upload";
}

export function basenameNoExt(name: string): string {
  const safe = sanitizeFilename(name);
  const idx = safe.lastIndexOf(".");
  return idx > 0 ? safe.slice(0, idx) : safe;
}


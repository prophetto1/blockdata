/**
 * Vertex AI Claude Messages API transport.
 * Drop-in replacement for direct Anthropic API fetch calls.
 *
 * Differences from direct Anthropic API:
 *  - `model` is removed from body and placed in the URL path.
 *  - `anthropic_version: "vertex-2023-10-16"` is injected into body.
 *  - Auth uses Bearer token from GCP service account (not x-api-key).
 */

import {
  clearVertexTokenCache,
  getVertexAccessToken,
  getVertexConfig,
} from "./vertex_auth.ts";

/**
 * Convert Anthropic direct-API model ID to Vertex AI model ID.
 * "claude-sonnet-4-5-20250929" → "claude-sonnet-4-5@20250929"
 * "claude-opus-4-6" → "claude-opus-4-6" (no date suffix, unchanged)
 */
export function toVertexModelId(model: string): string {
  if (model.includes("@")) return model;
  // Match trailing 8-digit date: claude-{anything}-YYYYMMDD
  const m = model.match(/^(.+)-(\d{8})$/);
  if (m) return `${m[1]}@${m[2]}`;
  return model;
}

/**
 * Call Vertex AI Claude rawPredict endpoint.
 *
 * @param body  Messages API request body. Must include `model`.
 *              The `model` field is extracted for the URL and removed from the body.
 *              All other fields pass through unchanged.
 * @returns     Parsed JSON response (same shape as direct Anthropic Messages API).
 */
export async function callVertexClaude(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const model = body.model as string;
  if (!model) throw new Error("callVertexClaude: model is required in body");

  const token = await getVertexAccessToken();
  const { projectId, location } = getVertexConfig();
  const vertexModel = toVertexModelId(model);

  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/anthropic/models/${vertexModel}:rawPredict`;

  // Build Vertex-specific body: remove model, add anthropic_version
  const { model: _, ...rest } = body;
  const vertexBody = { anthropic_version: "vertex-2023-10-16", ...rest };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(vertexBody),
  });

  if (!resp.ok) {
    // On 401, clear token cache so next call re-authenticates
    if (resp.status === 401) clearVertexTokenCache();
    const errText = await resp.text();
    throw new Error(
      `Vertex Claude API ${resp.status}: ${errText.slice(0, 500)}`,
    );
  }

  return resp.json();
}

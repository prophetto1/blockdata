/**
 * Streaming Vertex AI Claude transport.
 * Returns a ReadableStream of SSE events for the assistant chat edge function.
 */

import { clearVertexTokenCache, getVertexAccessToken, getVertexConfig } from "./vertex_auth.ts";
import { toVertexModelId } from "./vertex_claude.ts";

export type StreamEvent =
  | { type: "content_block_delta"; delta: { text: string } }
  | { type: "message_start"; message: { id: string; model: string; usage: { input_tokens: number } } }
  | { type: "message_delta"; delta: { stop_reason: string }; usage: { output_tokens: number } }
  | { type: "message_stop" }
  | { type: "error"; error: string };

/**
 * Call Vertex AI Claude with streaming enabled.
 * Returns the raw Response from Vertex (SSE stream) so the caller can pipe it.
 */
export async function callVertexClaudeStream(
  body: Record<string, unknown>,
): Promise<Response> {
  const model = body.model as string;
  if (!model) throw new Error("callVertexClaudeStream: model is required in body");

  const token = await getVertexAccessToken();
  const { projectId, location } = getVertexConfig();
  const vertexModel = toVertexModelId(model);

  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/anthropic/models/${vertexModel}:streamRawPredict`;

  const { model: _, ...rest } = body;
  const vertexBody = { anthropic_version: "vertex-2023-10-16", stream: true, ...rest };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(vertexBody),
  });

  if (!resp.ok) {
    if (resp.status === 401) clearVertexTokenCache();
    const errText = await resp.text();
    throw new Error(`Vertex Claude Stream ${resp.status}: ${errText.slice(0, 500)}`);
  }

  return resp;
}

/**
 * Transform Vertex SSE stream into a normalized SSE ReadableStream
 * that the client can consume with standard EventSource parsing.
 */
export function createSSEStream(
  vertexResponse: Response,
  onComplete?: (usage: { input_tokens: number; output_tokens: number }) => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let inputTokens = 0;
  let outputTokens = 0;

  const reader = vertexResponse.body!.getReader();

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onComplete?.({ input_tokens: inputTokens, output_tokens: outputTokens });
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              if (event.type === "message_start" && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens ?? 0;
              }
              if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens ?? 0;
              }

              // Forward event as SSE to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            } catch {
              // Non-JSON line, skip
            }
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

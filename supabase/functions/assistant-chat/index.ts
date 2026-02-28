/**
 * assistant-chat: Streaming chat edge function for the AI assistant pane.
 *
 * POST /assistant-chat
 * Body: { thread_id?: string, message: string, model?: string }
 * Response: SSE stream of chat events
 */

import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";
import { getEnv } from "../_shared/env.ts";
import { decryptApiKey } from "../_shared/api_key_crypto.ts";
import { callVertexClaudeStream, createSSEStream } from "../_shared/vertex_claude_stream.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

/** Resolve which model + transport to use for assistant chat. */
async function resolveModel(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  requestModel?: string,
): Promise<{ model: string; provider: string }> {
  // 1. Explicit request override
  if (requestModel?.trim()) {
    const provider = inferProvider(requestModel);
    return { model: requestModel.trim(), provider };
  }

  // 2. User's agent config default
  const { data: agentConfig } = await supabase
    .from("user_agent_configs")
    .select("model, agent_slug")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (agentConfig?.model) {
    const provider = agentConfig.agent_slug || inferProvider(agentConfig.model);
    return { model: agentConfig.model, provider };
  }

  // 3. Platform default from model_role_assignments
  const { data: roleAssignment } = await supabase
    .from("model_role_assignments")
    .select("model_id, provider")
    .eq("role_key", "assistant_chat")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (roleAssignment) {
    return { model: roleAssignment.model_id, provider: roleAssignment.provider };
  }

  // 4. Hardcoded fallback
  return { model: "claude-sonnet-4-5-20250929", provider: "anthropic" };
}

function inferProvider(model: string): string {
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("gpt-") || model.startsWith("o3") || model.startsWith("o4")) return "openai";
  if (model.startsWith("gemini-")) return "google";
  return "anthropic";
}

/** Get user's decrypted API key for a provider, if they have one. */
async function getUserApiKey(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  provider: string,
): Promise<string | null> {
  const { data: keyRow } = await supabase
    .from("user_api_keys")
    .select("api_key_encrypted, is_valid")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (!keyRow?.api_key_encrypted) return null;
  if (keyRow.is_valid === false) return null;

  const secret = getEnv("API_KEY_ENCRYPTION_SECRET", "");
  if (!secret) return null;

  return await decryptApiKey(keyRow.api_key_encrypted, secret);
}

/** Call Anthropic direct API with streaming. */
async function callAnthropicStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<Response> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages, stream: true }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${errText.slice(0, 500)}`);
  }
  return resp;
}

/** Call OpenAI-compatible API with streaming. */
async function callOpenAIStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  baseUrl = "https://api.openai.com/v1",
): Promise<Response> {
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages, stream: true }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${errText.slice(0, 500)}`);
  }
  return resp;
}

/** Call Google Gemini API with streaming. */
async function callGeminiStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<Response> {
  // Convert messages to Gemini format
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === "system");
  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction.content }] };
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${errText.slice(0, 500)}`);
  }
  return resp;
}

/** Normalize any provider's SSE stream into a unified format for the client. */
function normalizeStreamForClient(
  provider: string,
  rawResponse: Response,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = rawResponse.body!.getReader();

  if (provider === "anthropic") {
    // Anthropic SSE: event lines + data lines — pass through mostly as-is
    return createSSEStream(rawResponse);
  }

  // OpenAI and Gemini: normalize to a simple text-delta format
  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode(`data: {"type":"message_stop"}\n\n`));
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            if (provider === "openai") {
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "content_block_delta", delta: { text: delta } })}\n\n`),
                );
              }
            } else if (provider === "google") {
              const parts = parsed.candidates?.[0]?.content?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.text) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "content_block_delta", delta: { text: part.text } })}\n\n`,
                      ),
                    );
                  }
                }
              }
            }
          } catch {
            // Non-JSON, skip
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization header" });

  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const { thread_id, message, model: requestModel } = body as {
      thread_id?: string;
      message?: string;
      model?: string;
    };

    if (!message?.trim()) return json(400, { error: "Missing message" });

    const supabase = createAdminClient();

    // Resolve model and provider
    const { model, provider } = await resolveModel(supabase, userId, requestModel);

    // Create or validate thread
    let threadId = thread_id;
    if (!threadId) {
      const { data: thread, error } = await supabase
        .from("assistant_threads")
        .insert({ user_id: userId, model, title: message.trim().slice(0, 100) })
        .select("id")
        .single();
      if (error) return json(500, { error: error.message });
      threadId = thread.id;
    } else {
      // Verify thread ownership
      const { data: existing } = await supabase
        .from("assistant_threads")
        .select("id")
        .eq("id", threadId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) return json(404, { error: "Thread not found" });
    }

    // Persist user message
    await supabase.from("assistant_messages").insert({
      thread_id: threadId,
      role: "user",
      content: message.trim(),
    });

    // Load thread history
    const { data: history } = await supabase
      .from("assistant_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(50);

    const messages: ChatMessage[] = (history ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as ChatMessage["role"],
      content: m.content,
    }));

    // Get streaming response from LLM
    let rawStream: Response;
    const maxTokens = 4096;

    if (provider === "anthropic") {
      // Try user's API key first, fall back to platform Vertex AI
      const userKey = await getUserApiKey(supabase, userId, "anthropic");
      if (userKey) {
        rawStream = await callAnthropicStream(userKey, model, messages, maxTokens);
      } else {
        rawStream = await callVertexClaudeStream({ model, max_tokens: maxTokens, messages });
      }
    } else if (provider === "openai") {
      const userKey = await getUserApiKey(supabase, userId, "openai");
      if (!userKey) return json(400, { error: "No OpenAI API key configured" });
      rawStream = await callOpenAIStream(userKey, model, messages, maxTokens);
    } else if (provider === "google") {
      const userKey = await getUserApiKey(supabase, userId, "google");
      if (!userKey) return json(400, { error: "No Google AI API key configured" });
      rawStream = await callGeminiStream(userKey, model, messages);
    } else {
      return json(400, { error: `Unsupported provider for chat: ${provider}` });
    }

    // Normalize and stream to client
    const clientStream = normalizeStreamForClient(provider, rawStream);

    // Prepend thread_id metadata event
    const encoder = new TextEncoder();
    const metaEvent = encoder.encode(
      `data: ${JSON.stringify({ type: "thread_meta", thread_id: threadId, model })}\n\n`,
    );

    const outputStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(metaEvent);
        const reader = clientStream.getReader();
        let fullText = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);

            // Accumulate text for persistence
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const evt = JSON.parse(line.slice(6));
                if (evt.type === "content_block_delta" && evt.delta?.text) {
                  fullText += evt.delta.text;
                }
              } catch { /* skip */ }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Persist assistant message after stream completes
        if (fullText.trim()) {
          await supabase.from("assistant_messages").insert({
            thread_id: threadId,
            role: "assistant",
            content: fullText,
            metadata_jsonb: { model, provider },
          });

          // Update thread timestamp
          await supabase
            .from("assistant_threads")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", threadId);
        }

        controller.close();
      },
    });

    return new Response(outputStream, {
      status: 200,
      headers: withCorsHeaders({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Missing Authorization") || msg.startsWith("Invalid auth")) {
      return json(401, { error: msg });
    }
    return json(500, { error: msg });
  }
});

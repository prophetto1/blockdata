import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";
import { getEnv } from "../_shared/env.ts";
import { callVertexClaude } from "../_shared/vertex_claude.ts";

type LlmUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

type LlmCallResult = {
  data: Record<string, unknown>;
  usage: LlmUsage;
};

type ClaimedBlock = {
  block_uid: string;
  block_type: string;
  block_content: string;
};

type BatchLlmCallResult = {
  resultsByBlockUid: Map<string, Record<string, unknown>>;
  missingBlockUids: string[];
  unexpectedBlockUids: string[];
  duplicateBlockUids: string[];
  parseIssue: string | null;
  stopReason: string | null;
  usage: LlmUsage;
};

type PlatformLlmTransport = "vertex_ai" | "litellm_openai";

type LlmRuntime = {
  transport: PlatformLlmTransport;
  litellm_base_url: string | null;
  litellm_api_key: string | null;
};

function estimateTokensFromText(text: string): number {
  // 4 chars/token is a conservative rough estimate used only for pack sizing heuristics.
  return Math.ceil(text.length / 4);
}

function isLikelyBatchOverflowError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return msg.includes("too many tokens") ||
    msg.includes("prompt is too long") ||
    msg.includes("context length") ||
    msg.includes("input length") ||
    msg.includes("maximum context") ||
    msg.includes("max tokens");
}

function isLowCreditError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return msg.includes("credit balance is too low") ||
    msg.includes("insufficient credits");
}

function normalizeTransport(value: unknown): PlatformLlmTransport {
  return value === "litellm_openai" ? "litellm_openai" : "vertex_ai";
}

function buildLiteLlmChatEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseToolArgumentsJson(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) throw new Error("LiteLLM tool arguments must be a JSON object");
    return parsed;
  }
  if (!isPlainObject(raw)) throw new Error("LiteLLM tool arguments are missing");
  return raw;
}

function parseLiteLlmToolPayload(
  response: Record<string, unknown>,
  expectedToolName: string,
): Record<string, unknown> {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = isPlainObject(choices[0]) ? choices[0] : null;
  const message = firstChoice && isPlainObject(firstChoice.message)
    ? firstChoice.message
    : null;
  const toolCalls = message && Array.isArray(message.tool_calls) ? message.tool_calls : [];
  if (toolCalls.length === 0) {
    throw new Error("LiteLLM response has no tool_calls");
  }

  const selected = toolCalls.find((entry) => {
    if (!isPlainObject(entry)) return false;
    const fn = isPlainObject(entry.function) ? entry.function : null;
    return fn?.name === expectedToolName;
  }) ?? toolCalls[0];

  if (!isPlainObject(selected)) {
    throw new Error("LiteLLM tool_call entry is invalid");
  }
  const fn = isPlainObject(selected.function) ? selected.function : null;
  if (!fn) {
    throw new Error("LiteLLM tool_call.function is missing");
  }
  return parseToolArgumentsJson(fn.arguments);
}

function parseLiteLlmUsage(response: Record<string, unknown>): LlmUsage {
  const usageRaw = isPlainObject(response.usage) ? response.usage : {};
  return {
    input_tokens: Number(usageRaw.prompt_tokens ?? 0),
    output_tokens: Number(usageRaw.completion_tokens ?? 0),
    cache_creation_input_tokens: Number(usageRaw.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: Number(usageRaw.cache_read_input_tokens ?? 0),
  };
}

function buildBatchUserMessage(
  blockPrompt: string,
  pack: ClaimedBlock[],
): string {
  const header = `${blockPrompt}\n\n` +
    "Process each block independently. Use only the text inside each block_content section.\n" +
    "Do not use content from any other block.\n" +
    "Return exactly one result for every block_uid in results.\n\n";

  const sections = pack.map((b, idx) =>
    `--- BLOCK ${idx + 1} START ---\n` +
    `block_uid: ${b.block_uid}\n` +
    `block_type: ${b.block_type}\n` +
    "block_content:\n" +
    `${b.block_content}\n` +
    `--- BLOCK ${idx + 1} END ---`
  ).join("\n\n");

  return header + sections;
}

function estimateOutputTokensPerBlock(
  schemaProperties: Record<string, unknown>,
  baselinePerBlockTokens: number,
  maxOutputTokensPerCall: number,
): number {
  const keys = Object.keys(schemaProperties);
  let estimate = Math.max(baselinePerBlockTokens, 120 + keys.length * 40);

  for (const [key, raw] of Object.entries(schemaProperties)) {
    const prop = (raw ?? {}) as Record<string, unknown>;
    const typeValue = prop.type;
    const type = typeof typeValue === "string" ? typeValue : "";
    const hasEnum = Array.isArray(prop.enum);

    if (type === "array") estimate += 60;
    else if (type === "object") estimate += 80;
    else if (type === "string" && !hasEnum) estimate += 25;

    const keyLower = key.toLowerCase();
    if (
      keyLower.includes("content") ||
      keyLower.includes("summary") ||
      keyLower.includes("analysis") ||
      keyLower.includes("reason") ||
      keyLower.includes("rewrite") ||
      keyLower.includes("revised")
    ) {
      estimate += 140;
    }
  }

  return Math.min(Math.max(estimate, baselinePerBlockTokens), maxOutputTokensPerCall);
}

function isTextHeavyOutputSchema(
  schemaProperties: Record<string, unknown>,
): boolean {
  const stack: Array<{ key: string; node: unknown }> = Object.entries(schemaProperties).map(
    ([key, node]) => ({ key, node }),
  );
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const keyLower = current.key.toLowerCase();
    const node = (current.node ?? {}) as Record<string, unknown>;
    const typeValue = node.type;
    const type = typeof typeValue === "string" ? typeValue.toLowerCase() : "";

    if (
      keyLower.includes("content") ||
      keyLower.includes("revised") ||
      keyLower.includes("rewrite") ||
      keyLower.includes("analysis") ||
      keyLower.includes("summary") ||
      keyLower.includes("reason") ||
      keyLower === "final"
    ) {
      return true;
    }

    if (type === "object" && node.properties && typeof node.properties === "object") {
      for (const [childKey, childNode] of Object.entries(
        node.properties as Record<string, unknown>,
      )) {
        stack.push({ key: childKey, node: childNode });
      }
    }
  }
  return false;
}

function countWords(text: string): number {
  const matches = text.match(/\S+/g);
  return matches ? matches.length : 0;
}

function firstNChars(text: string, n: number): string {
  return Array.from(text).slice(0, n).join("");
}

function applyDeterministicFieldOverrides(
  data: Record<string, unknown>,
  blockContent: string,
  schemaProperties: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...data };

  if (Object.hasOwn(schemaProperties, "word_count")) {
    next.word_count = countWords(blockContent);
  }
  if (Object.hasOwn(schemaProperties, "has_question")) {
    next.has_question = blockContent.includes("?");
  }
  if (Object.hasOwn(schemaProperties, "first_40_chars")) {
    next.first_40_chars = firstNChars(blockContent, 40);
  }

  return next;
}

function parseBatchResponse(
  // deno-lint-ignore no-explicit-any
  apiResponse: any,
  expectedBlockUids: string[],
): BatchLlmCallResult {
  const expectedSet = new Set(expectedBlockUids);
  const resultsByBlockUid = new Map<string, Record<string, unknown>>();
  const unexpectedBlockUids: string[] = [];
  const duplicateBlockUids: string[] = [];
  let parseIssue: string | null = null;

  // deno-lint-ignore no-explicit-any
  const toolUse = apiResponse?.content?.find((c: any) => c?.type === "tool_use");
  // deno-lint-ignore no-explicit-any
  const entries = Array.isArray(toolUse?.input?.results) ? (toolUse.input.results as any[]) : [];
  if (!toolUse?.input) {
    parseIssue = "missing_tool_use";
  } else if (!Array.isArray(toolUse?.input?.results)) {
    parseIssue = "missing_results_array";
  }

  for (const entry of entries) {
    const blockUid = typeof entry?.block_uid === "string" ? entry.block_uid : "";
    if (!blockUid) continue;
    if (!expectedSet.has(blockUid)) {
      unexpectedBlockUids.push(blockUid);
      continue;
    }
    if (resultsByBlockUid.has(blockUid)) {
      duplicateBlockUids.push(blockUid);
      continue;
    }

    let data: Record<string, unknown> | null = null;
    if (entry?.data && typeof entry.data === "object" && !Array.isArray(entry.data)) {
      // Backward-compatible parsing for old batched shape.
      data = entry.data as Record<string, unknown>;
    } else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const cloned = { ...entry } as Record<string, unknown>;
      delete cloned.block_uid;
      data = cloned;
    }

    if (!data || typeof data !== "object") continue;
    resultsByBlockUid.set(blockUid, data);
  }

  const missingBlockUids = expectedBlockUids.filter((uid) => !resultsByBlockUid.has(uid));

  // deno-lint-ignore no-explicit-any
  const usageRaw = (apiResponse as any)?.usage ?? {};
  const usage: LlmUsage = {
    input_tokens: Number(usageRaw.input_tokens ?? 0),
    output_tokens: Number(usageRaw.output_tokens ?? 0),
    cache_creation_input_tokens: Number(usageRaw.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: Number(usageRaw.cache_read_input_tokens ?? 0),
  };

  const stopReason = typeof apiResponse?.stop_reason === "string"
    ? apiResponse.stop_reason
    : null;

  return {
    resultsByBlockUid,
    missingBlockUids,
    unexpectedBlockUids,
    duplicateBlockUids,
    parseIssue,
    stopReason,
    usage,
  };
}

function buildAdaptivePacks(
  blocks: ClaimedBlock[],
  config: {
    maxBlocksPerPack: number;
    contextWindowTokens: number;
    outputReserveTokens: number;
    toolOverheadTokens: number;
    perBlockOutputBudgetTokens: number;
    maxOutputTokensPerCall: number;
    systemPrompt: string;
    blockPrompt: string;
  },
): ClaimedBlock[][] {
  if (blocks.length === 0) return [];

  const systemTokens = estimateTokensFromText(config.systemPrompt);
  const promptTokens = estimateTokensFromText(config.blockPrompt);
  const availableInputTokens = Math.max(
    config.contextWindowTokens -
      config.outputReserveTokens -
      config.toolOverheadTokens -
      systemTokens -
      promptTokens,
    512,
  );
  const outputBudgetPerPack = Math.max(config.maxOutputTokensPerCall, 512);
  const perBlockOutputBudget = Math.max(config.perBlockOutputBudgetTokens, 1);

  const packs: ClaimedBlock[][] = [];
  let current: ClaimedBlock[] = [];
  let currentInputTokens = 0;

  for (const block of blocks) {
    const blockTokenEstimate = estimateTokensFromText(
      `${block.block_uid}\n${block.block_type}\n${block.block_content}\n`,
    ) + 16;
    const nextCount = current.length + 1;
    const exceedsBlockCap = nextCount > config.maxBlocksPerPack;
    const exceedsInputCap = currentInputTokens + blockTokenEstimate > availableInputTokens;
    const exceedsOutputCap = nextCount * perBlockOutputBudget > outputBudgetPerPack;

    if (current.length > 0 && (exceedsBlockCap || exceedsInputCap || exceedsOutputCap)) {
      packs.push(current);
      current = [];
      currentInputTokens = 0;
    }

    current.push(block);
    currentInputTokens += blockTokenEstimate;
  }

  if (current.length > 0) packs.push(current);
  return packs;
}

function splitPack<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

function addUsage(target: LlmUsage, delta: LlmUsage) {
  target.input_tokens += delta.input_tokens;
  target.output_tokens += delta.output_tokens;
  target.cache_creation_input_tokens += delta.cache_creation_input_tokens;
  target.cache_read_input_tokens += delta.cache_read_input_tokens;
}

function parseOptionalPositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parsePositiveInt(value: unknown, fallback: number): number {
  return parseOptionalPositiveInt(value) ?? fallback;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function asFiniteInteger(value: unknown): number | null {
  const n = asFiniteNumber(value);
  if (n === null || !Number.isInteger(n)) return null;
  return n;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

class AuthKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthKeyError";
  }
}

class ProviderBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderBalanceError";
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

// â"€â"€ LLM call via Vertex AI Claude with tool_use for structured output â"€â"€

async function callLLM(
  llmRuntime: LlmRuntime,
  model: string,
  temperature: number,
  maxTokens: number,
  promptCachingEnabled: boolean,
  systemPrompt: string,
  blockPrompt: string,
  blockContent: string,
  blockType: string,
  schemaProperties: Record<string, unknown>,
): Promise<LlmCallResult> {
  const tool = {
    name: "extract_fields",
    description:
      "Extract structured fields from the block content according to the schema.",
    input_schema: {
      type: "object",
      properties: schemaProperties,
    },
  };

  if (llmRuntime.transport === "litellm_openai") {
    const baseUrl = llmRuntime.litellm_base_url?.trim() ?? "";
    if (!baseUrl) {
      throw new Error("LiteLLM transport selected but models.platform_litellm_base_url is missing");
    }
    const endpoint = buildLiteLlmChatEndpoint(baseUrl);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (llmRuntime.litellm_api_key?.trim()) {
      headers.Authorization = `Bearer ${llmRuntime.litellm_api_key.trim()}`;
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${blockPrompt}\n\n---\n\nBlock type: ${blockType}\nBlock content:\n${blockContent}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_fields",
            description: tool.description,
            parameters: tool.input_schema,
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_fields" } },
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`LiteLLM API ${resp.status}: ${errText.slice(0, 500)}`);
    }
    const responseJson = await resp.json() as Record<string, unknown>;
    return {
      data: parseLiteLlmToolPayload(responseJson, "extract_fields"),
      usage: parseLiteLlmUsage(responseJson),
    };
  }

  const result = await callVertexClaude({
    model,
    max_tokens: maxTokens,
    temperature,
    system: promptCachingEnabled
      ? [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ]
      : systemPrompt,
    messages: [
      {
        role: "user",
        content: `${blockPrompt}\n\n---\n\nBlock type: ${blockType}\nBlock content:\n${blockContent}`,
      },
    ],
    tools: [tool],
    tool_choice: { type: "tool", name: "extract_fields" },
  });

  // deno-lint-ignore no-explicit-any
  const toolUse = (result as any).content?.find((c: any) => c.type === "tool_use");
  if (!toolUse?.input) {
    throw new Error("No tool_use block in LLM response");
  }

  // deno-lint-ignore no-explicit-any
  const usageRaw = (result as any)?.usage ?? {};
  const usage: LlmUsage = {
    input_tokens: Number(usageRaw.input_tokens ?? 0),
    output_tokens: Number(usageRaw.output_tokens ?? 0),
    cache_creation_input_tokens: Number(usageRaw.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: Number(usageRaw.cache_read_input_tokens ?? 0),
  };

  return {
    data: toolUse.input as Record<string, unknown>,
    usage,
  };
}

async function callLLMBatch(
  llmRuntime: LlmRuntime,
  model: string,
  temperature: number,
  maxTokens: number,
  promptCachingEnabled: boolean,
  systemPrompt: string,
  blockPrompt: string,
  pack: ClaimedBlock[],
  schemaProperties: Record<string, unknown>,
): Promise<BatchLlmCallResult> {
  const tool = {
    name: "extract_fields_batch",
    description:
      "Extract structured fields for each provided block. Return exactly one result per block_uid.",
    input_schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              block_uid: { type: "string" },
              ...schemaProperties,
            },
            required: ["block_uid"],
          },
        },
      },
      required: ["results"],
    },
  };

  if (llmRuntime.transport === "litellm_openai") {
    const baseUrl = llmRuntime.litellm_base_url?.trim() ?? "";
    if (!baseUrl) {
      throw new Error("LiteLLM transport selected but models.platform_litellm_base_url is missing");
    }
    const endpoint = buildLiteLlmChatEndpoint(baseUrl);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (llmRuntime.litellm_api_key?.trim()) {
      headers.Authorization = `Bearer ${llmRuntime.litellm_api_key.trim()}`;
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: buildBatchUserMessage(blockPrompt, pack),
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_fields_batch",
            description: tool.description,
            parameters: tool.input_schema,
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_fields_batch" } },
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`LiteLLM API ${resp.status}: ${errText.slice(0, 500)}`);
    }

    const responseJson = await resp.json() as Record<string, unknown>;
    const payload = parseLiteLlmToolPayload(responseJson, "extract_fields_batch");
    const entries = Array.isArray(payload.results) ? payload.results : [];
    const expectedBlockUids = pack.map((b) => b.block_uid);
    const expectedSet = new Set(expectedBlockUids);
    const resultsByBlockUid = new Map<string, Record<string, unknown>>();
    const unexpectedBlockUids: string[] = [];
    const duplicateBlockUids: string[] = [];

    for (const entry of entries) {
      if (!isPlainObject(entry)) continue;
      const blockUid = typeof entry.block_uid === "string" ? entry.block_uid : "";
      if (!blockUid) continue;
      if (!expectedSet.has(blockUid)) {
        unexpectedBlockUids.push(blockUid);
        continue;
      }
      if (resultsByBlockUid.has(blockUid)) {
        duplicateBlockUids.push(blockUid);
        continue;
      }
      const cloned = { ...entry } as Record<string, unknown>;
      delete cloned.block_uid;
      resultsByBlockUid.set(blockUid, cloned);
    }

    const missingBlockUids = expectedBlockUids.filter((uid) => !resultsByBlockUid.has(uid));
    const choices = Array.isArray(responseJson.choices) ? responseJson.choices : [];
    const firstChoice = isPlainObject(choices[0]) ? choices[0] : null;
    const finishReason = typeof firstChoice?.finish_reason === "string" ? firstChoice.finish_reason : null;

    return {
      resultsByBlockUid,
      missingBlockUids,
      unexpectedBlockUids,
      duplicateBlockUids,
      parseIssue: Array.isArray(payload.results) ? null : "missing_results_array",
      stopReason: finishReason === "length" ? "max_tokens" : finishReason,
      usage: parseLiteLlmUsage(responseJson),
    };
  }

  const result = await callVertexClaude({
    model,
    max_tokens: maxTokens,
    temperature,
    system: promptCachingEnabled
      ? [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ]
      : systemPrompt,
    messages: [
      {
        role: "user",
        content: buildBatchUserMessage(blockPrompt, pack),
      },
    ],
    tools: [tool],
    tool_choice: { type: "tool", name: "extract_fields_batch" },
  });

  return parseBatchResponse(
    // deno-lint-ignore no-explicit-any
    result as any,
    pack.map((b) => b.block_uid),
  );
}

// â”€â”€ Main handler â”€â”€

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    let requesterId = "";
    try {
      requesterId = await requireUserId(req);
    } catch (authErr) {
      const msg = authErr instanceof Error ? authErr.message : "Invalid auth";
      return json(401, { error: msg });
    }

    const body = await req.json().catch(() => ({}));
    const runId = typeof body?.run_id === "string" ? body.run_id.trim() : "";
    if (!runId) return json(400, { error: "Missing run_id" });

    const batchSize = Math.min(Math.max(Number(body?.batch_size) || 25, 1), 100);
    const modelOverride =
      typeof body?.model_override === "string" ? body.model_override : null;
    const promptCachingOverride =
      typeof body?.prompt_caching_enabled === "boolean"
        ? body.prompt_caching_enabled
        : null;
    const batchingOverride =
      typeof body?.batching_enabled === "boolean" ? body.batching_enabled : null;
    const packSizeOverride = parseOptionalPositiveInt(body?.pack_size);
    const perBlockOutputBudgetOverride = parseOptionalPositiveInt(
      body?.estimated_output_per_block,
    );
    const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
    const envMaxRetries = Number(getEnv("WORKER_MAX_RETRIES", "3"));
    const envPromptCachingEnabled =
      getEnv("WORKER_PROMPT_CACHING_ENABLED", "true").toLowerCase() !== "false";
    const envBatchingEnabled =
      getEnv("WORKER_BATCHING_ENABLED", "true").toLowerCase() !== "false";
    const envPackSize = parsePositiveInt(getEnv("WORKER_BATCH_PACK_SIZE", "10"), 10);
    const envPackSizeMax = parsePositiveInt(getEnv("WORKER_BATCH_PACK_SIZE_MAX", "40"), 40);
    const envContextWindowTokens = parsePositiveInt(
      getEnv("WORKER_BATCH_CONTEXT_WINDOW_TOKENS", "200000"),
      200000,
    );
    const envOutputReserveTokens = parsePositiveInt(
      getEnv("WORKER_BATCH_OUTPUT_RESERVE_TOKENS", "20000"),
      20000,
    );
    const envToolOverheadTokens = parsePositiveInt(
      getEnv("WORKER_BATCH_TOOL_OVERHEAD_TOKENS", "2000"),
      2000,
    );
    const envMaxOutputTokensPerCall = parsePositiveInt(
      getEnv("WORKER_BATCH_MAX_OUTPUT_TOKENS", "8192"),
      8192,
    );
    const envPerBlockOutputBudgetTokens = Math.min(
      perBlockOutputBudgetOverride ??
        parsePositiveInt(getEnv("WORKER_BATCH_PER_BLOCK_OUTPUT_TOKENS", "200"), 200),
      envMaxOutputTokensPerCall,
    );
    const envTextHeavyMaxPackSize = parsePositiveInt(
      getEnv("WORKER_BATCH_TEXT_HEAVY_MAX_PACK_SIZE", "6"),
      6,
    );
    let maxRetries = envMaxRetries;
    let promptCachingEnabled = promptCachingOverride ?? envPromptCachingEnabled;
    let batchingEnabled = batchingOverride ?? envBatchingEnabled;
    let contextWindowTokens = envContextWindowTokens;
    let outputReserveTokens = envOutputReserveTokens;
    let toolOverheadTokens = envToolOverheadTokens;
    let maxOutputTokensPerCall = envMaxOutputTokensPerCall;
    let perBlockOutputBudgetTokens = envPerBlockOutputBudgetTokens;
    let textHeavyMaxPackSize = envTextHeavyMaxPackSize;
    let effectivePackSize = batchingEnabled
      ? Math.min(Math.max(packSizeOverride ?? envPackSize, 1), envPackSizeMax, batchSize)
      : 1;

    const supabase = createAdminClient();

    // â”€â”€ 1. Claim batch â”€â”€

    const { data: claimed, error: claimErr } = await supabase.rpc(
      "claim_overlay_batch",
      {
        p_run_id: runId,
        p_batch_size: batchSize,
        p_worker_id: workerId,
      },
    );

    if (claimErr) return json(500, { error: `Claim failed: ${claimErr.message}` });
    if (!claimed || claimed.length === 0) {
      return json(200, {
        message: "No pending blocks",
        worker_id: workerId,
        processed: 0,
        prompt_caching: {
          enabled: promptCachingEnabled,
          source: promptCachingOverride === null ? "env_default" : "request_override",
        },
        batching: {
          enabled: batchingEnabled,
          source: batchingOverride === null ? "env_default" : "request_override",
          pack_size: effectivePackSize,
        },
        usage: {
          call_count: 0,
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          cache_hit_calls: 0,
        },
      });
    }

    const claimedUids: string[] = claimed.map(
      (r: { block_uid: string }) => r.block_uid,
    );

    const releaseClaimed = async (
      lastError?: string,
      targetBlockUids: string[] = claimedUids,
    ) => {
      const target = [...new Set(targetBlockUids)];
      if (target.length === 0) return;

      const patch: {
        status: string;
        claimed_by: null;
        claimed_at: null;
        last_error?: string;
      } = {
        status: "pending",
        claimed_by: null,
        claimed_at: null,
      };
      if (typeof lastError === "string") patch.last_error = lastError;

      const { data: strictRows, error: strictErr } = await supabase
        .from("block_overlays_v2")
        .update(patch)
        .eq("run_id", runId)
        .eq("claimed_by", workerId)
        .in("status", ["pending", "claimed"])
        .in("block_uid", target)
        .select("block_uid");

      if (strictErr) {
        throw new Error(`Failed to release claimed blocks (strict): ${strictErr.message}`);
      }

      const strictSet = new Set((strictRows ?? []).map((r: { block_uid: string }) => r.block_uid));
      const missing = target.filter((uid) => !strictSet.has(uid));
      if (missing.length === 0) return;

      // Fallback to targeted run+block release in case claimed_by drifted unexpectedly.
      const { data: fallbackRows, error: fallbackErr } = await supabase
        .from("block_overlays_v2")
        .update(patch)
        .eq("run_id", runId)
        .in("status", ["pending", "claimed"])
        .in("block_uid", missing)
        .select("block_uid");

      if (fallbackErr) {
        throw new Error(`Failed to release claimed blocks (fallback): ${fallbackErr.message}`);
      }

      const fallbackSet = new Set((fallbackRows ?? []).map((r: { block_uid: string }) => r.block_uid));
      const unresolved = missing.filter((uid) => !fallbackSet.has(uid));
      if (unresolved.length > 0) {
        const sample = unresolved.slice(0, 5).join(", ");
        throw new Error(
          `Release incomplete for run ${runId}. unresolved=${unresolved.length}/${target.length}; sample=[${sample}]`,
        );
      }
    };

    // â”€â”€ 2. Load context â”€â”€

    // Run + schema (cached for entire batch)
    const { data: run, error: runErr } = await supabase
      .from("runs_v2")
      .select("run_id, owner_id, conv_uid, schema_id, model_config, status, schemas(schema_ref, schema_jsonb)")
      .eq("run_id", runId)
      .single();

    if (runErr || !run) {
      await releaseClaimed(`Run lookup failed: ${runErr?.message ?? "not found"}`);
      return json(500, { error: `Run lookup failed: ${runErr?.message ?? "not found"}` });
    }

    if (run.owner_id !== requesterId) {
      await releaseClaimed("Forbidden: run ownership mismatch");
      return json(403, {
        error: "Forbidden: run ownership mismatch",
        worker_id: workerId,
        run_id: runId,
      });
    }

    const runModelConfig = asObject(run.model_config) ?? {};
    const runPolicySnapshot = asObject(runModelConfig.policy_snapshot);
    const snapshotModels = asObject(runPolicySnapshot?.models);
    const snapshotWorker = asObject(runPolicySnapshot?.worker);
    const snapshotPromptCaching = asObject(snapshotWorker?.prompt_caching);
    const snapshotBatching = asObject(snapshotWorker?.batching);

    const snapshotPromptCachingEnabled = asBoolean(snapshotPromptCaching?.enabled);
    const snapshotBatchingEnabled = asBoolean(snapshotBatching?.enabled);
    const resolvedPackSizeMax = Math.max(
      1,
      asFiniteInteger(snapshotBatching?.pack_size_max) ?? envPackSizeMax,
    );
    const resolvedPackSizeDefault = Math.max(
      1,
      Math.min(asFiniteInteger(snapshotBatching?.pack_size) ?? envPackSize, resolvedPackSizeMax),
    );

    maxRetries = Math.max(1, Math.min(asFiniteInteger(snapshotWorker?.max_retries) ?? envMaxRetries, 10));
    promptCachingEnabled = promptCachingOverride ?? snapshotPromptCachingEnabled ?? envPromptCachingEnabled;
    batchingEnabled = batchingOverride ?? snapshotBatchingEnabled ?? envBatchingEnabled;
    contextWindowTokens = Math.max(
      1024,
      asFiniteInteger(snapshotBatching?.context_window_tokens) ?? envContextWindowTokens,
    );
    outputReserveTokens = Math.max(
      256,
      asFiniteInteger(snapshotBatching?.output_reserve_tokens) ?? envOutputReserveTokens,
    );
    toolOverheadTokens = Math.max(
      0,
      asFiniteInteger(snapshotBatching?.tool_overhead_tokens) ?? envToolOverheadTokens,
    );
    maxOutputTokensPerCall = Math.max(
      256,
      asFiniteInteger(snapshotBatching?.max_output_tokens) ?? envMaxOutputTokensPerCall,
    );
    const snapshotPerBlockOutput = asFiniteInteger(snapshotBatching?.per_block_output_tokens) ??
      envPerBlockOutputBudgetTokens;
    perBlockOutputBudgetTokens = Math.min(
      perBlockOutputBudgetOverride ?? snapshotPerBlockOutput,
      maxOutputTokensPerCall,
    );
    textHeavyMaxPackSize = Math.max(
      1,
      Math.min(
        asFiniteInteger(snapshotBatching?.text_heavy_max_pack_size) ?? envTextHeavyMaxPackSize,
        resolvedPackSizeMax,
      ),
    );
    effectivePackSize = batchingEnabled
      ? Math.min(Math.max(packSizeOverride ?? resolvedPackSizeDefault, 1), resolvedPackSizeMax, batchSize)
      : 1;

    // Check if run is cancelled
    if (run.status === "cancelled") {
      await releaseClaimed(undefined);
      return json(200, {
        message: "Run cancelled",
        worker_id: workerId,
        processed: 0,
        prompt_caching: {
          enabled: promptCachingEnabled,
          source: promptCachingOverride === null ? "env_default" : "request_override",
        },
        batching: {
          enabled: batchingEnabled,
          source: batchingOverride === null ? "env_default" : "request_override",
          pack_size: effectivePackSize,
        },
      });
    }

    const schemaRow = Array.isArray(run.schemas) ? run.schemas[0] : run.schemas;
    const schemaJsonb = asObject((schemaRow as Record<string, unknown> | null | undefined)?.schema_jsonb);
    if (!schemaJsonb) {
      await releaseClaimed("Schema not found for run");
      return json(500, { error: "Schema not found for run" });
    }

    // â"€â"€ 2b. Load user model defaults (LLM calls go via Vertex AI, no user API key needed) â"€â"€

    let userDefaults: { default_model?: string; default_temperature?: number; default_max_tokens?: number } = {};

    if (run.owner_id) {
      const { data: keyRow } = await supabase
        .from("user_api_keys")
        .select("default_model, default_temperature, default_max_tokens")
        .eq("user_id", run.owner_id)
        .eq("provider", "anthropic")
        .maybeSingle();

      if (keyRow) {
        userDefaults = {
          default_model: keyRow.default_model ?? undefined,
          default_temperature: keyRow.default_temperature ?? undefined,
          default_max_tokens: keyRow.default_max_tokens ?? undefined,
        };
      }
    }

    const promptConfig = (schemaJsonb.prompt_config ?? {}) as Record<string, unknown>;
    const schemaProperties = (schemaJsonb.properties ?? {}) as Record<string, unknown>;
    const estimatedOutputPerBlockTokens = estimateOutputTokensPerBlock(
      schemaProperties,
      perBlockOutputBudgetTokens,
      maxOutputTokensPerCall,
    );
    const schemaIsTextHeavy = isTextHeavyOutputSchema(schemaProperties);
    const schemaCappedPackSize = schemaIsTextHeavy
      ? Math.min(effectivePackSize, textHeavyMaxPackSize)
      : effectivePackSize;

    const systemPrompt =
      (promptConfig.system_instructions as string) ??
      "You are a document analysis assistant. Extract structured fields from the given block content.";
    const blockPrompt =
      (promptConfig.per_block_prompt as string) ??
      "Extract the following fields from this content block:";
    // Priority: request override > schema prompt_config > run model_config > user defaults > env default
    const model =
      modelOverride ??
      (promptConfig.model as string) ??
      (runModelConfig.model as string | undefined) ??
      userDefaults.default_model ??
      getEnv("WORKER_DEFAULT_MODEL", "claude-sonnet-4-5-20250929");
    const temperature = Number(
      promptConfig.temperature ??
        (runModelConfig.temperature as number | undefined) ??
        userDefaults.default_temperature ??
        0.3,
    );
    const maxTokensPerBlock = Number(
      promptConfig.max_tokens_per_block ??
        (runModelConfig.max_tokens_per_block as number | undefined) ??
        userDefaults.default_max_tokens ??
        4096,
    );
    const llmRuntime: LlmRuntime = {
      transport: normalizeTransport(
        runModelConfig.transport ??
          snapshotModels?.platform_llm_transport ??
          getEnv("PLATFORM_LLM_TRANSPORT", "vertex_ai"),
      ),
      litellm_base_url:
        (
          (typeof runModelConfig.litellm_base_url === "string" ? runModelConfig.litellm_base_url : null) ??
          (typeof snapshotModels?.platform_litellm_base_url === "string"
            ? snapshotModels.platform_litellm_base_url
            : null) ??
          getEnv("PLATFORM_LITELLM_BASE_URL", "")
        ).trim() || null,
      litellm_api_key: getEnv("PLATFORM_LITELLM_API_KEY", "").trim() || null,
    };
    if (llmRuntime.transport === "litellm_openai" && !llmRuntime.litellm_base_url) {
      await releaseClaimed("LiteLLM transport selected but no base URL configured");
      return json(500, { error: "LiteLLM transport selected but no base URL configured" });
    }

    // Load block content for all claimed blocks
    const { data: blocks, error: blkErr } = await supabase
      .from("blocks_v2")
      .select("block_uid, block_type, block_content")
      .in("block_uid", claimedUids);

    if (blkErr || !blocks) {
      await releaseClaimed(`Block lookup failed: ${blkErr?.message ?? "no data"}`);
      return json(500, { error: `Block lookup failed: ${blkErr?.message ?? "no data"}` });
    }

    const blockMap = new Map<string, { block_type: string; block_content: string }>();
    for (const b of blocks) {
      blockMap.set(b.block_uid, {
        block_type: b.block_type,
        block_content: b.block_content,
      });
    }

    // â”€â”€ 3. Process each block â”€â”€

    let succeeded = 0;
    let failed = 0;
    const usageTotals = {
      call_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      cache_hit_calls: 0,
    };

    const markRetryOrFailed = async (blockUid: string, errMsg: string) => {
      const { data: overlay } = await supabase
        .from("block_overlays_v2")
        .select("attempt_count")
        .eq("run_id", runId)
        .eq("block_uid", blockUid)
        .single();

      const attempts = (overlay?.attempt_count ?? 0) + 1;

      if (attempts < maxRetries) {
        await supabase
          .from("block_overlays_v2")
          .update({
            status: "pending",
            last_error: errMsg,
            attempt_count: attempts,
            claimed_by: null,
            claimed_at: null,
          })
          .eq("run_id", runId)
          .eq("block_uid", blockUid);
      } else {
        await supabase
          .from("block_overlays_v2")
          .update({
            status: "failed",
            last_error: errMsg,
            attempt_count: attempts,
          })
          .eq("run_id", runId)
          .eq("block_uid", blockUid);
      }
      failed++;
    };

    const applyUsage = (usage: LlmUsage) => {
      usageTotals.call_count += 1;
      addUsage(usageTotals, usage);
      if (usage.cache_read_input_tokens > 0) {
        usageTotals.cache_hit_calls += 1;
      }
    };

    const claimedBlocks: ClaimedBlock[] = [];
    for (const blockUid of claimedUids) {
      const block = blockMap.get(blockUid);
      if (!block) {
        await supabase
          .from("block_overlays_v2")
          .update({
            status: "failed",
            last_error: "Block not found in blocks_v2",
          })
          .eq("run_id", runId)
          .eq("block_uid", blockUid);
        failed++;
        continue;
      }
      claimedBlocks.push({
        block_uid: blockUid,
        block_type: block.block_type,
        block_content: block.block_content,
      });
    }

    const initialPacks = batchingEnabled
      ? buildAdaptivePacks(claimedBlocks, {
        maxBlocksPerPack: schemaCappedPackSize,
        contextWindowTokens,
        outputReserveTokens,
        toolOverheadTokens,
        perBlockOutputBudgetTokens: estimatedOutputPerBlockTokens,
        maxOutputTokensPerCall,
        systemPrompt,
        blockPrompt,
      })
      : claimedBlocks.map((b) => [b]);

    const batchMetrics = {
      initial_pack_count: initialPacks.length,
      packs_processed: 0,
      split_events: 0,
      blocks_covered_by_packs: 0,
    };

    const processSingleBlock = async (block: ClaimedBlock): Promise<void> => {
      try {
        const llmResult = await callLLM(
          llmRuntime,
          model,
          temperature,
          maxTokensPerBlock,
          promptCachingEnabled,
          systemPrompt,
          blockPrompt,
          block.block_content,
          block.block_type,
          schemaProperties,
        );
        applyUsage(llmResult.usage);
        const normalizedData = applyDeterministicFieldOverrides(
          llmResult.data,
          block.block_content,
          schemaProperties,
        );

        await supabase
          .from("block_overlays_v2")
          .update({
            overlay_jsonb_staging: normalizedData,
            status: "ai_complete",
          })
          .eq("run_id", runId)
          .eq("block_uid", block.block_uid);

        succeeded++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (isLowCreditError(errMsg)) {
          throw new ProviderBalanceError(errMsg);
        }
        if (
          errMsg.includes("Vertex Claude API 401") ||
          errMsg.includes("Vertex Claude API 403") ||
          errMsg.includes("LiteLLM API 401") ||
          errMsg.includes("LiteLLM API 403")
        ) {
          throw new AuthKeyError(errMsg);
        }
        await markRetryOrFailed(block.block_uid, errMsg);
      }
    };

    const processPack = async (pack: ClaimedBlock[]): Promise<void> => {
      if (pack.length === 0) return;

      batchMetrics.packs_processed += 1;
      batchMetrics.blocks_covered_by_packs += pack.length;

      if (!batchingEnabled || pack.length === 1) {
        for (const block of pack) {
          await processSingleBlock(block);
        }
        return;
      }

      const maxTokensForPack = Math.min(
        maxOutputTokensPerCall,
        Math.max(estimatedOutputPerBlockTokens * pack.length, 512),
      );

      try {
        const llmResult = await callLLMBatch(
          llmRuntime,
          model,
          temperature,
          maxTokensForPack,
          promptCachingEnabled,
          systemPrompt,
          blockPrompt,
          pack,
          schemaProperties,
        );
        applyUsage(llmResult.usage);

        const missingSet = new Set(llmResult.missingBlockUids);
        for (const block of pack) {
          const blockData = llmResult.resultsByBlockUid.get(block.block_uid);
          if (!blockData) {
            continue;
          }
          const normalizedData = applyDeterministicFieldOverrides(
            blockData,
            block.block_content,
            schemaProperties,
          );
          await supabase
            .from("block_overlays_v2")
            .update({
              overlay_jsonb_staging: normalizedData,
              status: "ai_complete",
            })
            .eq("run_id", runId)
            .eq("block_uid", block.block_uid);
          succeeded++;
        }
        const missingBlocks = pack.filter((b) => missingSet.has(b.block_uid));
        const hasOverflowStopReason = llmResult.stopReason === "max_tokens";

        let retryBlocks = missingBlocks;
        if (retryBlocks.length === 0 && (hasOverflowStopReason || llmResult.parseIssue !== null)) {
          retryBlocks = pack;
        }

        if (retryBlocks.length > 0) {
          if (retryBlocks.length > 1) {
            batchMetrics.split_events += 1;
            for (const nextPack of splitPack(retryBlocks)) {
              await processPack(nextPack);
            }
          } else {
            await processSingleBlock(retryBlocks[0]);
          }
          return;
        }

        // If mapped results are complete, ignore hallucinated extras as non-fatal noise.
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (isLowCreditError(errMsg)) {
          throw new ProviderBalanceError(errMsg);
        }
        if (errMsg.includes("Vertex Claude API 401") || errMsg.includes("Vertex Claude API 403")) {
          throw new AuthKeyError(errMsg);
        }

        const shouldSplitAndRetry = pack.length > 1 &&
          (isLikelyBatchOverflowError(errMsg) || errMsg.includes("Batch response mapping mismatch"));
        if (shouldSplitAndRetry) {
          batchMetrics.split_events += 1;
          for (const nextPack of splitPack(pack)) {
            await processPack(nextPack);
          }
          return;
        }

        for (const block of pack) {
          await markRetryOrFailed(block.block_uid, errMsg);
        }
      }
    };

    try {
      for (const pack of initialPacks) {
        await processPack(pack);
      }
    } catch (err) {
      if (err instanceof ProviderBalanceError) {
        await releaseClaimed(
          "Provider quota/balance exceeded. Check GCP Vertex AI billing, then retry.",
        );
        return json(402, {
          error:
            "Provider quota/balance exceeded. Check GCP Vertex AI billing, then retry.",
          worker_id: workerId,
          prompt_caching: {
            enabled: promptCachingEnabled,
            source: promptCachingOverride === null ? "env_default" : "request_override",
          },
          batching: {
            enabled: batchingEnabled,
            source: batchingOverride === null ? "env_default" : "request_override",
            pack_size: schemaCappedPackSize,
            initial_pack_count: batchMetrics.initial_pack_count,
            packs_processed: batchMetrics.packs_processed,
            split_events: batchMetrics.split_events,
            avg_blocks_per_pack: batchMetrics.packs_processed > 0
              ? Number((batchMetrics.blocks_covered_by_packs / batchMetrics.packs_processed).toFixed(2))
              : 0,
          },
          usage: usageTotals,
        });
      }
      if (err instanceof AuthKeyError) {
        await releaseClaimed("Vertex AI auth failed — check GCP service account config");
        return json(401, {
          error: "Vertex AI authentication failed. Check GCP service account configuration.",
          worker_id: workerId,
          prompt_caching: {
            enabled: promptCachingEnabled,
            source: promptCachingOverride === null ? "env_default" : "request_override",
          },
          batching: {
            enabled: batchingEnabled,
            source: batchingOverride === null ? "env_default" : "request_override",
            pack_size: schemaCappedPackSize,
            initial_pack_count: batchMetrics.initial_pack_count,
            packs_processed: batchMetrics.packs_processed,
            split_events: batchMetrics.split_events,
            avg_blocks_per_pack: batchMetrics.packs_processed > 0
              ? Number((batchMetrics.blocks_covered_by_packs / batchMetrics.packs_processed).toFixed(2))
              : 0,
          },
          usage: usageTotals,
        });
      }
      throw err;
    }

    const { data: counts } = await supabase
      .from("block_overlays_v2")
      .select("status")
      .eq("run_id", runId);

    const completedBlocks =
      counts?.filter((r: { status: string }) =>
        r.status === "ai_complete" || r.status === "confirmed"
      ).length ?? 0;
    const failedBlocks =
      counts?.filter((r: { status: string }) => r.status === "failed").length ?? 0;
    const pendingBlocks =
      counts?.filter((r: { status: string }) =>
        r.status === "pending" || r.status === "claimed"
      ).length ?? 0;

    const runUpdate: Record<string, unknown> = {
      completed_blocks: completedBlocks,
      failed_blocks: failedBlocks,
    };

    // If no more pending/claimed, the run is complete
    if (pendingBlocks === 0) {
      runUpdate.status = "complete";
      runUpdate.completed_at = new Date().toISOString();
    }

    await supabase.from("runs_v2").update(runUpdate).eq("run_id", runId);

    return json(200, {
      worker_id: workerId,
      run_id: runId,
      claimed: claimedUids.length,
      succeeded,
      failed,
      remaining_pending: pendingBlocks,
      prompt_caching: {
        enabled: promptCachingEnabled,
        source: promptCachingOverride === null ? "env_default" : "request_override",
      },
      batching: {
        enabled: batchingEnabled,
        source: batchingOverride === null ? "env_default" : "request_override",
        pack_size: schemaCappedPackSize,
        initial_pack_count: batchMetrics.initial_pack_count,
        packs_processed: batchMetrics.packs_processed,
        split_events: batchMetrics.split_events,
        avg_blocks_per_pack: batchMetrics.packs_processed > 0
          ? Number((batchMetrics.blocks_covered_by_packs / batchMetrics.packs_processed).toFixed(2))
          : 0,
      },
      usage: usageTotals,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
});

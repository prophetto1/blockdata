import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { decryptApiKey } from "../_shared/api_key_crypto.ts";

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
  usage: LlmUsage;
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

class AuthKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthKeyError";
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

// â”€â”€ LLM call via Anthropic Messages API with tool_use for structured output â”€â”€

async function callLLM(
  apiKey: string,
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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (promptCachingEnabled) {
    headers["anthropic-beta"] = "prompt-caching-2024-07-31";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
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
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errText.slice(0, 500)}`);
  }

  const result = await response.json();
  // deno-lint-ignore no-explicit-any
  const toolUse = result.content?.find((c: any) => c.type === "tool_use");
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
  apiKey: string,
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
              data: {
                type: "object",
                properties: schemaProperties,
              },
            },
            required: ["block_uid", "data"],
          },
        },
      },
      required: ["results"],
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (promptCachingEnabled) {
    headers["anthropic-beta"] = "prompt-caching-2024-07-31";
  }

  const blocksJson = JSON.stringify(pack.map((b) => ({
    block_uid: b.block_uid,
    block_type: b.block_type,
    block_content: b.block_content,
  })));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
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
          content:
            `${blockPrompt}\n\n` +
            "Process each block independently and return exactly one result for each block_uid.\n" +
            "Use the provided schema for each result's data field.\n\n" +
            `Blocks JSON:\n${blocksJson}`,
        },
      ],
      tools: [tool],
      tool_choice: { type: "tool", name: "extract_fields_batch" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errText.slice(0, 500)}`);
  }

  const result = await response.json();
  // deno-lint-ignore no-explicit-any
  const toolUse = result.content?.find((c: any) => c.type === "tool_use");
  if (!toolUse?.input) {
    throw new Error("No tool_use block in batch LLM response");
  }

  const resultsByBlockUid = new Map<string, Record<string, unknown>>();
  // deno-lint-ignore no-explicit-any
  const input = toolUse.input as any;
  // deno-lint-ignore no-explicit-any
  const entries = Array.isArray(input?.results) ? input.results as any[] : [];
  for (const entry of entries) {
    const blockUid = typeof entry?.block_uid === "string" ? entry.block_uid : "";
    const data = entry?.data;
    if (!blockUid || !data || typeof data !== "object") continue;
    if (!resultsByBlockUid.has(blockUid)) {
      resultsByBlockUid.set(blockUid, data as Record<string, unknown>);
    }
  }

  // deno-lint-ignore no-explicit-any
  const usageRaw = (result as any)?.usage ?? {};
  const usage: LlmUsage = {
    input_tokens: Number(usageRaw.input_tokens ?? 0),
    output_tokens: Number(usageRaw.output_tokens ?? 0),
    cache_creation_input_tokens: Number(usageRaw.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: Number(usageRaw.cache_read_input_tokens ?? 0),
  };

  return { resultsByBlockUid, usage };
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
    const maxRetries = Number(getEnv("WORKER_MAX_RETRIES", "3"));
    const envPromptCachingEnabled =
      getEnv("WORKER_PROMPT_CACHING_ENABLED", "true").toLowerCase() !== "false";
    const promptCachingEnabled = promptCachingOverride ?? envPromptCachingEnabled;
    const envBatchingEnabled =
      getEnv("WORKER_BATCHING_ENABLED", "false").toLowerCase() === "true";
    const batchingEnabled = batchingOverride ?? envBatchingEnabled;
    const envPackSize = parsePositiveInt(getEnv("WORKER_BATCH_PACK_SIZE", "10"), 10);
    const envPackSizeMax = parsePositiveInt(getEnv("WORKER_BATCH_PACK_SIZE_MAX", "40"), 40);
    const effectivePackSize = batchingEnabled
      ? Math.min(Math.max(packSizeOverride ?? envPackSize, 1), envPackSizeMax, batchSize)
      : 1;
    const contextWindowTokens = parsePositiveInt(
      getEnv("WORKER_BATCH_CONTEXT_WINDOW_TOKENS", "200000"),
      200000,
    );
    const outputReserveTokens = parsePositiveInt(
      getEnv("WORKER_BATCH_OUTPUT_RESERVE_TOKENS", "20000"),
      20000,
    );
    const toolOverheadTokens = parsePositiveInt(
      getEnv("WORKER_BATCH_TOOL_OVERHEAD_TOKENS", "2000"),
      2000,
    );
    const maxOutputTokensPerCall = parsePositiveInt(
      getEnv("WORKER_BATCH_MAX_OUTPUT_TOKENS", "8192"),
      8192,
    );
    const perBlockOutputBudgetTokens = Math.min(
      perBlockOutputBudgetOverride ??
        parsePositiveInt(getEnv("WORKER_BATCH_PER_BLOCK_OUTPUT_TOKENS", "200"), 200),
      maxOutputTokensPerCall,
    );

    const supabase = createAdminClient();
    const platformKey = getEnv("ANTHROPIC_API_KEY", "");
    const cryptoSecret = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

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

    const schemaJsonb = run.schemas?.schema_jsonb as Record<string, unknown> | undefined;
    if (!schemaJsonb) {
      await releaseClaimed("Schema not found for run");
      return json(500, { error: "Schema not found for run" });
    }

    // â”€â”€ 2b. Resolve API key: user key â†’ platform env fallback â”€â”€

    let anthropicKey = platformKey;
    let userDefaults: { default_model?: string; default_temperature?: number; default_max_tokens?: number } = {};
    let usingUserKey = false;

    if (run.owner_id) {
      const { data: keyRow } = await supabase
        .from("user_api_keys")
        .select("api_key_encrypted, default_model, default_temperature, default_max_tokens")
        .eq("user_id", run.owner_id)
        .eq("provider", "anthropic")
        .maybeSingle();

      if (keyRow?.api_key_encrypted) {
        try {
          anthropicKey = await decryptApiKey(keyRow.api_key_encrypted, cryptoSecret);
          usingUserKey = true;
        } catch {
          await supabase
            .from("user_api_keys")
            .update({ is_valid: false })
            .eq("user_id", run.owner_id)
            .eq("provider", "anthropic");
          await releaseClaimed("Saved API key could not be decrypted. Re-save it in Settings.");
          return json(401, {
            error: "Saved API key is invalid. Re-save it in Settings.",
            worker_id: workerId,
          });
        }
        userDefaults = {
          default_model: keyRow.default_model ?? undefined,
          default_temperature: keyRow.default_temperature ?? undefined,
          default_max_tokens: keyRow.default_max_tokens ?? undefined,
        };
      }
    }

    if (!anthropicKey) {
      await releaseClaimed("No API key configured. Set your Anthropic API key in Settings.");
      return json(500, { error: "No API key configured. Set your Anthropic API key in Settings." });
    }

    const promptConfig = (schemaJsonb.prompt_config ?? {}) as Record<string, unknown>;
    const schemaProperties = (schemaJsonb.properties ?? {}) as Record<string, unknown>;

    const systemPrompt =
      (promptConfig.system_instructions as string) ??
      "You are a document analysis assistant. Extract structured fields from the given block content.";
    const blockPrompt =
      (promptConfig.per_block_prompt as string) ??
      "Extract the following fields from this content block:";
    const runModelConfig = (run.model_config as Record<string, unknown> | null) ?? null;
    // Priority: request override > schema prompt_config > run model_config > user defaults > env default
    const model =
      modelOverride ??
      (promptConfig.model as string) ??
      (runModelConfig?.model as string) ??
      userDefaults.default_model ??
      getEnv("WORKER_DEFAULT_MODEL", "claude-sonnet-4-5-20250929");
    const temperature = Number(
      promptConfig.temperature ??
        (runModelConfig?.temperature as number | undefined) ??
        userDefaults.default_temperature ??
        0.3,
    );
    const maxTokensPerBlock = Number(
      promptConfig.max_tokens_per_block ??
        (runModelConfig?.max_tokens_per_block as number | undefined) ??
        userDefaults.default_max_tokens ??
        2000,
    );

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
    let markedKeyValid = false;
    const usageTotals = {
      call_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      cache_hit_calls: 0,
    };

    const markUserKeyValid = async () => {
      if (markedKeyValid || !usingUserKey || !run.owner_id) return;
      markedKeyValid = true;
      await supabase
        .from("user_api_keys")
        .update({ is_valid: true })
        .eq("user_id", run.owner_id)
        .eq("provider", "anthropic");
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
        maxBlocksPerPack: effectivePackSize,
        contextWindowTokens,
        outputReserveTokens,
        toolOverheadTokens,
        perBlockOutputBudgetTokens,
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
          anthropicKey,
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

        await supabase
          .from("block_overlays_v2")
          .update({
            overlay_jsonb_staging: llmResult.data,
            status: "ai_complete",
          })
          .eq("run_id", runId)
          .eq("block_uid", block.block_uid);

        succeeded++;
        await markUserKeyValid();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("Anthropic API 401") || errMsg.includes("Anthropic API 403")) {
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

      const expectedBlockUidSet = new Set(pack.map((b) => b.block_uid));
      const maxTokensForPack = Math.min(
        maxOutputTokensPerCall,
        Math.max(perBlockOutputBudgetTokens * pack.length, 512),
      );

      try {
        const llmResult = await callLLMBatch(
          anthropicKey,
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

        const unexpectedBlockUids: string[] = [];
        for (const uid of llmResult.resultsByBlockUid.keys()) {
          if (!expectedBlockUidSet.has(uid)) unexpectedBlockUids.push(uid);
        }
        const missingBlocks = pack.filter((b) => !llmResult.resultsByBlockUid.has(b.block_uid));
        if (missingBlocks.length > 0 || unexpectedBlockUids.length > 0) {
          const missingPreview = missingBlocks.slice(0, 3).map((b) => b.block_uid).join(",");
          const unexpectedPreview = unexpectedBlockUids.slice(0, 3).join(",");
          throw new Error(
            `Batch response mapping mismatch: missing=${missingBlocks.length}[${missingPreview}] unexpected=${unexpectedBlockUids.length}[${unexpectedPreview}]`,
          );
        }

        for (const block of pack) {
          const blockData = llmResult.resultsByBlockUid.get(block.block_uid);
          if (!blockData) {
            await markRetryOrFailed(block.block_uid, "Batch response missing block result");
            continue;
          }
          await supabase
            .from("block_overlays_v2")
            .update({
              overlay_jsonb_staging: blockData,
              status: "ai_complete",
            })
            .eq("run_id", runId)
            .eq("block_uid", block.block_uid);
          succeeded++;
        }
        await markUserKeyValid();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("Anthropic API 401") || errMsg.includes("Anthropic API 403")) {
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
      if (err instanceof AuthKeyError) {
        if (run.owner_id) {
          await supabase
            .from("user_api_keys")
            .update({ is_valid: false })
            .eq("user_id", run.owner_id)
            .eq("provider", "anthropic");
        }
        await releaseClaimed("API key invalid or disabled");
        return json(401, {
          error: "API key is invalid or disabled. Update your key in Settings.",
          worker_id: workerId,
          prompt_caching: {
            enabled: promptCachingEnabled,
            source: promptCachingOverride === null ? "env_default" : "request_override",
          },
          batching: {
            enabled: batchingEnabled,
            source: batchingOverride === null ? "env_default" : "request_override",
            pack_size: effectivePackSize,
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
        pack_size: effectivePackSize,
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

import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireEnv, getEnv } from "../_shared/env.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

// ── LLM call via Anthropic Messages API with tool_use for structured output ──

async function callLLM(
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number,
  systemPrompt: string,
  blockPrompt: string,
  blockContent: string,
  blockType: string,
  schemaProperties: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const tool = {
    name: "extract_fields",
    description:
      "Extract structured fields from the block content according to the schema.",
    input_schema: {
      type: "object",
      properties: schemaProperties,
    },
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
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

  return toolUse.input as Record<string, unknown>;
}

// ── Main handler ──

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => ({}));
    const runId = typeof body?.run_id === "string" ? body.run_id.trim() : "";
    if (!runId) return json(400, { error: "Missing run_id" });

    const batchSize = Math.min(Math.max(Number(body?.batch_size) || 25, 1), 100);
    const modelOverride =
      typeof body?.model_override === "string" ? body.model_override : null;
    const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
    const maxRetries = Number(getEnv("WORKER_MAX_RETRIES", "3"));

    const supabase = createAdminClient();
    const anthropicKey = requireEnv("ANTHROPIC_API_KEY");

    // ── 1. Claim batch ──

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
      return json(200, { message: "No pending blocks", worker_id: workerId, processed: 0 });
    }

    const claimedUids: string[] = claimed.map(
      (r: { block_uid: string }) => r.block_uid,
    );

    // ── 2. Load context ──

    // Run + schema (cached for entire batch)
    const { data: run, error: runErr } = await supabase
      .from("runs_v2")
      .select("run_id, conv_uid, schema_id, model_config, status, schemas(schema_ref, schema_jsonb)")
      .eq("run_id", runId)
      .single();

    if (runErr || !run) {
      return json(500, { error: `Run lookup failed: ${runErr?.message ?? "not found"}` });
    }

    // Check if run is cancelled
    if (run.status === "cancelled") {
      // Release claimed blocks back to pending
      await supabase
        .from("block_overlays_v2")
        .update({ status: "pending", claimed_by: null, claimed_at: null })
        .eq("run_id", runId)
        .in("block_uid", claimedUids);
      return json(200, { message: "Run cancelled", worker_id: workerId, processed: 0 });
    }

    const schemaJsonb = run.schemas?.schema_jsonb as Record<string, unknown> | undefined;
    if (!schemaJsonb) {
      return json(500, { error: "Schema not found for run" });
    }

    const promptConfig = (schemaJsonb.prompt_config ?? {}) as Record<string, unknown>;
    const schemaProperties = (schemaJsonb.properties ?? {}) as Record<string, unknown>;

    const systemPrompt =
      (promptConfig.system_instructions as string) ??
      "You are a document analysis assistant. Extract structured fields from the given block content.";
    const blockPrompt =
      (promptConfig.per_block_prompt as string) ??
      "Extract the following fields from this content block:";
    const model =
      modelOverride ??
      (promptConfig.model as string) ??
      ((run.model_config as Record<string, unknown> | null)?.model as string) ??
      getEnv("WORKER_DEFAULT_MODEL", "claude-sonnet-4-5-20250929");
    const temperature = Number(promptConfig.temperature ?? 0.2);
    const maxTokensPerBlock = Number(promptConfig.max_tokens_per_block ?? 2000);

    // Load block content for all claimed blocks
    const { data: blocks, error: blkErr } = await supabase
      .from("blocks_v2")
      .select("block_uid, block_type, block_content")
      .in("block_uid", claimedUids);

    if (blkErr || !blocks) {
      return json(500, { error: `Block lookup failed: ${blkErr?.message ?? "no data"}` });
    }

    const blockMap = new Map<string, { block_type: string; block_content: string }>();
    for (const b of blocks) {
      blockMap.set(b.block_uid, {
        block_type: b.block_type,
        block_content: b.block_content,
      });
    }

    // ── 3. Process each block ──

    let succeeded = 0;
    let failed = 0;

    for (const blockUid of claimedUids) {
      const block = blockMap.get(blockUid);
      if (!block) {
        // Block not found — mark failed
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

      try {
        const result = await callLLM(
          anthropicKey,
          model,
          temperature,
          maxTokensPerBlock,
          systemPrompt,
          blockPrompt,
          block.block_content,
          block.block_type,
          schemaProperties,
        );

        // ── 4. Write staged result ──
        await supabase
          .from("block_overlays_v2")
          .update({
            overlay_jsonb_staging: result,
            status: "ai_complete",
          })
          .eq("run_id", runId)
          .eq("block_uid", blockUid);

        succeeded++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);

        // Check attempt_count for retry eligibility
        const { data: overlay } = await supabase
          .from("block_overlays_v2")
          .select("attempt_count")
          .eq("run_id", runId)
          .eq("block_uid", blockUid)
          .single();

        const attempts = (overlay?.attempt_count ?? 0) + 1;

        if (attempts < maxRetries) {
          // Return to pending for retry by a future invocation
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
          // Max retries exceeded — mark permanently failed
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
      }
    }

    // ── 5. Update run rollup ──

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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
});
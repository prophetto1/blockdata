import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv } from "../_shared/env.ts";
import { persistCitationArtifactForBlocks } from "../_shared/citations.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

type GenerateCitationsBody = {
  source_uid?: string;
};

type ParsingTool = "mdast" | "docling" | "pandoc";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Invalid JSON body: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function toParsingTool(value: string | null | undefined): ParsingTool {
  if (value === "mdast" || value === "docling" || value === "pandoc") return value;
  throw new Error(`Unsupported parsing tool for citations generation: ${value ?? "null"}`);
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const ownerId = await requireUserId(req);
    const body = await readJson<GenerateCitationsBody>(req);
    const source_uid = (body.source_uid || "").trim();
    if (!source_uid) return json(400, { error: "Missing source_uid" });

    const supabaseAdmin = createAdminClient();
    const bucket = getEnv("DOCUMENTS_BUCKET", "documents");

    const { data: doc, error: docErr } = await supabaseAdmin
      .from("source_documents")
      .select("source_uid, owner_id, source_type, source_locator")
      .eq("source_uid", source_uid)
      .maybeSingle();
    if (docErr) throw new Error(`DB fetch source_documents failed: ${docErr.message}`);
    if (!doc) return json(404, { error: "Document not found" });
    if (doc.owner_id !== ownerId) return json(403, { error: "Document not owned by you" });

    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversion_parsing")
      .select("conv_uid, conv_parsing_tool, conv_locator")
      .eq("source_uid", source_uid)
      .maybeSingle();
    if (convErr) throw new Error(`DB fetch conversion_parsing failed: ${convErr.message}`);
    if (!conv?.conv_uid) {
      return json(409, { error: "Document must be parsed before running citations generation" });
    }

    const { data: blocks, error: blockErr } = await supabaseAdmin
      .from("blocks")
      .select("block_content")
      .eq("conv_uid", conv.conv_uid)
      .order("block_index", { ascending: true });
    if (blockErr) throw new Error(`DB fetch blocks failed: ${blockErr.message}`);
    if (!blocks || blocks.length === 0) {
      return json(409, { error: "No parsed blocks found for this document" });
    }

    const parsing_tool = toParsingTool(conv.conv_parsing_tool);
    const base_artifact_locator = (conv.conv_locator || doc.source_locator || "").trim();
    if (!base_artifact_locator) {
      throw new Error("No artifact locator available for citations output");
    }

    const result = await persistCitationArtifactForBlocks({
      supabaseAdmin,
      bucket,
      source_uid,
      conv_uid: conv.conv_uid,
      parsing_tool,
      source_type: doc.source_type,
      base_artifact_locator,
      blocks,
    });

    if (result.skipped) {
      return json(200, {
        ok: true,
        skipped: true,
        citation_total: 0,
        message: "No legal citations detected; citations output was not created.",
      });
    }

    return json(200, {
      ok: true,
      skipped: false,
      source_uid,
      conv_uid: conv.conv_uid,
      citation_total: result.citation_total,
      artifact_locator: result.artifact_locator,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});

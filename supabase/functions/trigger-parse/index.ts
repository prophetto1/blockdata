import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { concatBytes, sha256Hex } from "../_shared/hash.ts";
import { loadRuntimePolicy } from "../_shared/admin_policy.ts";
import { isConversionAckTimeoutError, raceWithAckTimeout, resolveConversionAckTimeoutMs } from "../_shared/conversion-ack-timeout.ts";
import { extractBlocks } from "../_shared/markdown.ts";
import { insertRepresentationArtifact } from "../_shared/representation.ts";
import { basenameNoExt } from "../_shared/sanitize.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

type SignedUploadTarget = {
  bucket: string;
  key: string;
  signed_upload_url: string;
  token: string | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const ownerId = await requireUserId(req);
    const { source_uid, profile_id, pipeline_config: configOverride } = await req.json() as {
      source_uid?: string;
      profile_id?: string;
      pipeline_config?: Record<string, unknown>;
    };
    if (!source_uid || typeof source_uid !== "string") {
      return json(400, { error: "Missing source_uid" });
    }

    const supabaseAdmin = createAdminClient();

    // Look up the document and validate ownership.
    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from("source_documents")
      .select("source_uid, owner_id, source_type, source_locator, doc_title, status")
      .eq("source_uid", source_uid)
      .maybeSingle();
    if (fetchErr) throw new Error(`DB fetch failed: ${fetchErr.message}`);
    if (!doc) return json(404, { error: "Document not found" });
    if (doc.owner_id !== ownerId) return json(403, { error: "Document not owned by you" });

    // Only allow re-parse from uploaded or failed states.
    const parseable = ["uploaded", "conversion_failed", "ingest_failed"];
    if (!parseable.includes(doc.status)) {
      return json(409, { error: `Cannot parse document in status: ${doc.status}` });
    }

    // Resolve track from runtime policy.
    const runtimePolicy = await loadRuntimePolicy(supabaseAdmin);
    const source_type = doc.source_type as string;

    // Resolve pipeline config: explicit override > profile lookup > empty (service defaults).
    let pipeline_config: Record<string, unknown> = {};
    if (configOverride && typeof configOverride === "object" && Object.keys(configOverride).length > 0) {
      pipeline_config = configOverride;
    } else if (profile_id && typeof profile_id === "string") {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("parsing_profiles")
        .select("config")
        .eq("id", profile_id)
        .single();
      if (profileErr) throw new Error(`Profile lookup failed: ${profileErr.message}`);
      pipeline_config = (profile.config as Record<string, unknown>) ?? {};
    }

    // Markdown files: parse inline via mdast (no conversion service needed).
    if (source_type === "md" || source_type === "markdown" || source_type === "txt") {
      const bucket = getEnv("DOCUMENTS_BUCKET", "documents");
      const source_key = doc.source_locator as string;

      // Download the file from storage.
      const { data: fileData, error: dlErr } = await supabaseAdmin.storage
        .from(bucket)
        .download(source_key);
      if (dlErr || !fileData) throw new Error(`Failed to download file: ${dlErr?.message ?? "unknown"}`);
      const fileBytes = new Uint8Array(await fileData.arrayBuffer());
      const markdown = new TextDecoder().decode(fileBytes);

      // Clean up stale DB rows from previous parse attempts.
      const prevConv = await supabaseAdmin.from("conversion_parsing").select("conv_uid").eq("source_uid", source_uid).maybeSingle();
      if (prevConv.data?.conv_uid) {
        await supabaseAdmin.from("blocks").delete().eq("conv_uid", prevConv.data.conv_uid);
      }
      await supabaseAdmin.from("conversion_representations").delete().eq("source_uid", source_uid);
      await supabaseAdmin.from("conversion_parsing").delete().eq("source_uid", source_uid);

      // Generate conv_uid and extract blocks.
      const convPrefix = new TextEncoder().encode("mdast\nmarkdown_bytes\n");
      const conv_uid = await sha256Hex(concatBytes([convPrefix, fileBytes]));
      const extracted = extractBlocks(markdown);

      const conv_total_blocks = extracted.blocks.length;
      const conv_total_characters = extracted.blocks.reduce((sum, b) => sum + b.block_content.length, 0);
      const freqMap: Record<string, number> = {};
      for (const b of extracted.blocks) {
        freqMap[b.block_type] = (freqMap[b.block_type] || 0) + 1;
      }

      // Insert conversion_parsing row.
      const { error: cpErr } = await supabaseAdmin.from("conversion_parsing").insert({
        conv_uid,
        source_uid,
        conv_status: "success",
        conv_parsing_tool: "mdast",
        conv_representation_type: "markdown_bytes",
        conv_total_blocks,
        conv_block_type_freq: freqMap,
        conv_total_characters,
        conv_locator: source_key,
        pipeline_config: pipeline_config ?? {},
      });
      if (cpErr) throw new Error(`DB insert conversion_parsing failed: ${cpErr.message}`);

      // Insert blocks.
      const blockRows = extracted.blocks.map((b, idx) => ({
        block_uid: `${conv_uid}:${idx}`,
        conv_uid,
        block_index: idx,
        block_type: b.block_type,
        block_locator: {
          type: "text_offset_range",
          start_offset: b.start_offset,
          end_offset: b.end_offset,
          parser_block_type: b.parser_block_type,
          parser_path: b.parser_path,
        },
        block_content: b.block_content,
      }));

      if (blockRows.length > 0) {
        const { error: blkErr } = await supabaseAdmin.from("blocks").insert(blockRows);
        if (blkErr) throw new Error(`DB insert blocks failed: ${blkErr.message}`);
      }

      // Insert representation artifact.
      await insertRepresentationArtifact(supabaseAdmin, {
        source_uid,
        conv_uid,
        parsing_tool: "mdast",
        representation_type: "markdown_bytes",
        artifact_locator: source_key,
        artifact_hash: conv_uid,
        artifact_size_bytes: fileBytes.byteLength,
        artifact_meta: { source_type },
      });

      // Update status to ingested.
      await supabaseAdmin
        .from("source_documents")
        .update({ status: "ingested", error: null })
        .eq("source_uid", source_uid);

      return json(200, { source_uid, conv_uid, status: "ingested", blocks_count: blockRows.length });
    }

    const track = runtimePolicy.upload.extension_track_routing[source_type];
    if (!track) {
      return json(400, { error: `No track routing for source_type: ${source_type}` });
    }
    if (!runtimePolicy.upload.track_enabled[track]) {
      return json(400, { error: `Track disabled by runtime policy: ${track}` });
    }

    const bucket = getEnv("DOCUMENTS_BUCKET", "documents");
    const source_key = doc.source_locator as string;
    const conversion_job_id = crypto.randomUUID();
    const baseName = basenameNoExt(source_key.split("/").pop() || "file");

    // Clean up stale converted files from previous attempts (createSignedUploadUrl
    // fails if the object already exists).
    const stalePrefix = `converted/${source_uid}/`;
    const { data: staleFiles } = await supabaseAdmin.storage.from(bucket).list(stalePrefix);
    if (staleFiles && staleFiles.length > 0) {
      const stalePaths = staleFiles.map((f: { name: string }) => `${stalePrefix}${f.name}`);
      await supabaseAdmin.storage.from(bucket).remove(stalePaths);
    }

    // Clean up stale DB rows from previous conversion attempts (re-parse).
    await supabaseAdmin.from("blocks").delete().eq("conv_uid",
      (await supabaseAdmin.from("conversion_parsing").select("conv_uid").eq("source_uid", source_uid).maybeSingle()).data?.conv_uid ?? "__none__"
    );
    await supabaseAdmin.from("conversion_representations").delete().eq("source_uid", source_uid);
    await supabaseAdmin.from("conversion_parsing").delete().eq("source_uid", source_uid);

    // Signed download URL for the original file.
    const { data: signedDownload, error: dlErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(source_key, 60 * 10);
    if (dlErr || !signedDownload?.signedUrl) {
      throw new Error(`Signed download URL failed: ${dlErr?.message ?? "unknown"}`);
    }

    // Signed upload URL for converted markdown.
    const md_key = `converted/${source_uid}/${baseName}.md`;
    const { data: signedUpload, error: ulErr } = await (supabaseAdmin.storage as any)
      .from(bucket)
      .createSignedUploadUrl(md_key);
    if (ulErr || !signedUpload?.signedUrl) {
      throw new Error(`Signed upload URL (md) failed: ${ulErr?.message ?? "unknown"}`);
    }

    // Docling artifact upload target (if source type supports it).
    const doclingArtifactSourceTypes = new Set(runtimePolicy.upload.parser_artifact_source_types.docling);
    let docling_output: SignedUploadTarget | null = null;
    let html_output: SignedUploadTarget | null = null;
    let doctags_output: SignedUploadTarget | null = null;
    if (doclingArtifactSourceTypes.has(source_type)) {
      const docling_key = `converted/${source_uid}/${baseName}.docling.json`;
      const { data: doclingUpload, error: doclingErr } = await (supabaseAdmin.storage as any)
        .from(bucket)
        .createSignedUploadUrl(docling_key);
      if (doclingErr || !doclingUpload?.signedUrl) {
        throw new Error(`Signed upload URL (docling) failed: ${doclingErr?.message ?? "unknown"}`);
      }
      docling_output = {
        bucket,
        key: docling_key,
        signed_upload_url: doclingUpload.signedUrl,
        token: doclingUpload.token ?? null,
      };

      const html_key = `converted/${source_uid}/${baseName}.html`;
      const { data: htmlUpload, error: htmlErr } = await (supabaseAdmin.storage as any)
        .from(bucket)
        .createSignedUploadUrl(html_key);
      if (htmlErr || !htmlUpload?.signedUrl) {
        throw new Error(`Signed upload URL (html) failed: ${htmlErr?.message ?? "unknown"}`);
      }
      html_output = {
        bucket,
        key: html_key,
        signed_upload_url: htmlUpload.signedUrl,
        token: htmlUpload.token ?? null,
      };

      const doctags_key = `converted/${source_uid}/${baseName}.doctags`;
      const { data: doctagsUpload, error: doctagsErr } = await (supabaseAdmin.storage as any)
        .from(bucket)
        .createSignedUploadUrl(doctags_key);
      if (doctagsErr || !doctagsUpload?.signedUrl) {
        throw new Error(`Signed upload URL (doctags) failed: ${doctagsErr?.message ?? "unknown"}`);
      }
      doctags_output = {
        bucket,
        key: doctags_key,
        signed_upload_url: doctagsUpload.signedUrl,
        token: doctagsUpload.token ?? null,
      };
    }

    // Pandoc artifact upload target (if source type supports it).
    const pandocArtifactSourceTypes = new Set(runtimePolicy.upload.parser_artifact_source_types.pandoc);
    let pandoc_output: SignedUploadTarget | null = null;
    if (pandocArtifactSourceTypes.has(source_type)) {
      const pandoc_key = `converted/${source_uid}/${baseName}.pandoc.ast.json`;
      const { data: pandocUpload, error: pandocErr } = await (supabaseAdmin.storage as any)
        .from(bucket)
        .createSignedUploadUrl(pandoc_key);
      if (pandocErr || !pandocUpload?.signedUrl) {
        throw new Error(`Signed upload URL (pandoc) failed: ${pandocErr?.message ?? "unknown"}`);
      }
      pandoc_output = {
        bucket,
        key: pandoc_key,
        signed_upload_url: pandocUpload.signedUrl,
        token: pandocUpload.token ?? null,
      };
    }

    // Update document status to converting.
    const { error: updateErr } = await supabaseAdmin
      .from("source_documents")
      .update({ status: "converting", error: null, conversion_job_id })
      .eq("source_uid", source_uid);
    if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`);

    // Call the conversion service.
    const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/+$/, "");
    const callback_url = `${supabaseUrl}/functions/v1/conversion-complete`;
    const conversionServiceUrl = requireEnv("CONVERSION_SERVICE_URL").replace(/\/+$/, "");
    const conversionKey = requireEnv("CONVERSION_SERVICE_KEY");
    const ackTimeoutMs = resolveConversionAckTimeoutMs(getEnv("CONVERSION_SERVICE_ACK_TIMEOUT_MS", "8000"));
    const abortController = new AbortController();

    const convertResult = await raceWithAckTimeout(
      fetch(`${conversionServiceUrl}/convert`, {
        method: "POST",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Conversion-Service-Key": conversionKey,
        },
        body: JSON.stringify({
          source_uid,
          conversion_job_id,
          track,
          source_type,
          source_download_url: signedDownload.signedUrl,
          pipeline_config,
          output: {
            bucket,
            key: md_key,
            signed_upload_url: signedUpload.signedUrl,
            token: signedUpload.token ?? null,
          },
          docling_output,
          pandoc_output,
          html_output,
          doctags_output,
          callback_url,
        }),
      }),
      ackTimeoutMs,
      () => abortController.abort(),
    );

    if (convertResult.kind === "timeout") {
      return json(202, {
        source_uid,
        status: "converting",
        conversion_job_id,
        ack_timeout_ms: ackTimeoutMs,
        warning: "conversion request acknowledgment timed out; processing continues asynchronously",
      });
    }

    if (convertResult.kind === "error") {
      const fetchErr = convertResult.error;
      if (isConversionAckTimeoutError(fetchErr)) {
        return json(202, {
          source_uid,
          status: "converting",
          conversion_job_id,
          ack_timeout_ms: ackTimeoutMs,
          warning: "conversion request acknowledgment timed out; processing continues asynchronously",
        });
      }
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      await supabaseAdmin
        .from("source_documents")
        .update({ status: "conversion_failed", error: `conversion service unreachable: ${msg}`.slice(0, 1000) })
        .eq("source_uid", source_uid);
      return json(502, { source_uid, status: "conversion_failed", error: `conversion service unreachable: ${msg}` });
    }

    const convertResp = convertResult.value;

    if (!convertResp.ok) {
      const msg = await convertResp.text().catch(() => "");
      await supabaseAdmin
        .from("source_documents")
        .update({ status: "conversion_failed", error: `conversion request failed: HTTP ${convertResp.status} ${msg}`.slice(0, 1000) })
        .eq("source_uid", source_uid);
      return json(502, { source_uid, status: "conversion_failed", error: "conversion request failed" });
    }

    return json(202, { source_uid, status: "converting", conversion_job_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const httpStatus = msg.includes("not owned by you") ? 403 : 400;
    return json(httpStatus, { error: msg });
  }
});

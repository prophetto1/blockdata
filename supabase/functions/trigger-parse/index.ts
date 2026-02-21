import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getEnv, requireEnv } from "../_shared/env.ts";
import { loadRuntimePolicy } from "../_shared/admin_policy.ts";
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
    const { source_uid } = await req.json() as { source_uid?: string };
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

    // For markdown files, parsing is instant (handled in ingest). Not applicable here.
    if (source_type === "md") {
      return json(400, { error: "Markdown files do not need conversion service parsing" });
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

    let convertResp: Response;
    try {
      convertResp = await fetch(`${conversionServiceUrl}/convert`, {
        method: "POST",
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
          output: {
            bucket,
            key: md_key,
            signed_upload_url: signedUpload.signedUrl,
            token: signedUpload.token ?? null,
          },
          docling_output,
          pandoc_output,
          callback_url,
        }),
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      await supabaseAdmin
        .from("source_documents")
        .update({ status: "conversion_failed", error: `conversion service unreachable: ${msg}`.slice(0, 1000) })
        .eq("source_uid", source_uid);
      return json(502, { source_uid, status: "conversion_failed", error: `conversion service unreachable: ${msg}` });
    }

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
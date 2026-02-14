import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type RepresentationArtifactInsert = {
  source_uid: string;
  conv_uid: string;
  parsing_tool: "mdast" | "docling" | "pandoc";
  representation_type: "markdown_bytes" | "doclingdocument_json" | "pandoc_ast_json";
  artifact_locator: string;
  artifact_hash: string;
  artifact_size_bytes: number;
  artifact_meta?: Record<string, unknown>;
};

export async function insertRepresentationArtifact(
  supabaseAdmin: SupabaseClient,
  payload: RepresentationArtifactInsert,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("conversion_representations_v2")
    .upsert({
      source_uid: payload.source_uid,
      conv_uid: payload.conv_uid,
      parsing_tool: payload.parsing_tool,
      representation_type: payload.representation_type,
      artifact_locator: payload.artifact_locator,
      artifact_hash: payload.artifact_hash,
      artifact_size_bytes: payload.artifact_size_bytes,
      artifact_meta: payload.artifact_meta ?? {},
    }, { onConflict: "conv_uid,representation_type", ignoreDuplicates: true });
  if (error) {
    throw new Error(`DB insert conversion_representations_v2 failed: ${error.message}`);
  }
}

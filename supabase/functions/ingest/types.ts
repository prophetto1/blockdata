import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { IngestTrack } from "../_shared/admin_policy.ts";

export type IngestResponse = {
  source_uid: string;
  conv_uid: string | null;
  status: string;
  blocks_count?: number;
  error?: string;
};

export type SignedUploadTarget = {
  bucket: string;
  key: string;
  signed_upload_url: string;
  token: string | null;
};

/** Shared context passed through the ingest pipeline. */
export type IngestContext = {
  supabaseAdmin: SupabaseClient;
  ownerId: string;
  ingest_track: IngestTrack;
  source_uid: string;
  source_type: string;
  source_key: string;
  bucket: string;
  fileBytes: Uint8Array;
  originalFilename: string;
  requestedTitle: string;
  project_id: string | null;
};

export type ProjectRow = {
  project_id: string;
  owner_id: string;
  project_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  source_uid: string;
  owner_id: string;
  conv_uid: string | null;
  project_id: string;
  source_type: string;
  source_filesize: number;
  source_total_characters: number | null;
  doc_title: string;
  status: 'uploaded' | 'converting' | 'ingested' | 'conversion_failed' | 'ingest_failed';
  uploaded_at: string;
  error: string | null;
};

export type BlockRow = {
  block_uid: string;
  conv_uid: string;
  block_index: number;
  block_type: string;
  block_locator: { type: string; [key: string]: unknown };
  block_content: string;
};

export type SchemaRow = {
  schema_id: string;
  owner_id: string;
  schema_ref: string;
  schema_uid: string;
  schema_jsonb: Record<string, unknown>;
  created_at: string;
};

export type RunRow = {
  run_id: string;
  owner_id: string;
  conv_uid: string;
  schema_id: string;
  status: 'running' | 'complete' | 'failed' | 'cancelled';
  total_blocks: number;
  completed_blocks: number;
  failed_blocks: number;
  started_at: string;
  completed_at: string | null;
  model_config: Record<string, unknown> | null;
};

export type RunWithSchema = RunRow & {
  schemas: Pick<SchemaRow, 'schema_ref' | 'schema_uid' | 'schema_jsonb'> | null;
};

export type BlockOverlayRow = {
  run_id: string;
  block_uid: string;
  overlay_jsonb_staging: Record<string, unknown>;
  overlay_jsonb_confirmed: Record<string, unknown>;
  status: 'pending' | 'claimed' | 'ai_complete' | 'confirmed' | 'failed';
  claimed_by: string | null;
  claimed_at: string | null;
  attempt_count: number;
  last_error: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
};

export type BlockWithOverlay = BlockRow & {
  overlay: BlockOverlayRow | null;
};

export type ProfileRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

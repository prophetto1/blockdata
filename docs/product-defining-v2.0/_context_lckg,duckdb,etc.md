1. Immutable Fields: DB vs Spec
Spec (0207-immutable-fields.md) defines three groups in the canonical export shape: source_upload, conversion, block.

documents_v2 table (stores source_upload + conversion fields)
Spec Field	DB Column	Type	Status
source_uid	source_uid (PK)	text	Present
source_type	source_type	text	Present
source_filesize	source_filesize	integer	Present, but nullable (spec implies required)
source_total_characters	source_total_characters	integer	Present, nullable (correct — null for non-text sources)
source_upload_timestamp	uploaded_at	timestamptz	Present (mapped to source_upload_timestamp in export)
conv_status	conv_status	text	Present
conv_uid	conv_uid	text	Present
conv_parsing_tool	conv_parsing_tool	text	Present
conv_representation_type	conv_representation_type	text	Present
conv_total_blocks	conv_total_blocks	integer	Present
conv_block_type_freq	conv_block_type_freq	jsonb	Present
conv_total_characters	conv_total_characters	integer	Present
One minor gap: source_filesize is nullable in the DB. Looking at your sample data, the existing ingested row has source_filesize: null — the early v1→v2 migration likely didn't populate it. The ingest edge function does set it (source_filesize: fileBytes.byteLength), so new uploads are fine. Old rows just have nulls.

blocks_v2 table (stores block fields)
Spec Field	DB Column	Type	Status
block_uid	block_uid (PK)	text	Present
block_index	block_index	integer	Present
block_type	block_type	text	Present
block_locator	block_locator	jsonb	Present
block_content	block_content	text	Present
All block fields accounted for. The export-jsonl function correctly assembles the canonical { immutable: { source_upload, conversion, block }, user_defined: { schema_ref, schema_uid, data } } shape.

Verdict: All spec-defined immutable fields are present in the DB and correctly exported.

2. How User-Defined Schemas Work
The system handles schemas through three tables working together:

schemas table
Column	Type	Purpose
schema_id	uuid (PK)	Internal ID
owner_id	uuid	Auth user who uploaded
schema_ref	text	Human-readable name (e.g., prose_optimizer_v1)
schema_uid	text	SHA256 of the JSON content (dedup)
schema_jsonb	jsonb	The full JSON Schema itself
The stored schema is a standard JSON Schema object. Your existing prose_optimizer_v1 has:


$id, type: "object", title, required, properties: {
  action: { enum: ["keep","rewrite","skip_nonprose"], ... },
  checks: { type: "array", items: { ... } },
  confidence: { type: "number", min: 0, max: 1 },
  diff_summary: { type: "string", maxLength: 400 },
  final: { type: "object", properties: { content, format } }
}
runs_v2 table — connects a document to a schema
Column	Type	Purpose
run_id	uuid (PK)	Internal ID
conv_uid	text (FK→documents_v2)	Which document
schema_id	uuid (FK→schemas)	Which schema to apply
model_config	jsonb	LLM parameters (model, temperature, etc.)
total_blocks	integer	Auto-populated by RPC
completed_blocks / failed_blocks	integer	Progress counters
block_overlays_v2 table — one row per (run, block)
Column	Type	Purpose
run_id	uuid (FK→runs_v2)	Which run
block_uid	text (FK→blocks_v2)	Which block
overlay_jsonb	jsonb (default {})	The user-defined data conforming to the schema
status	text	pending → claimed → complete / failed
claimed_by / claimed_at	text / timestamptz	Worker coordination
attempt_count	integer	Retry tracking
last_error	text	Failure diagnostics
The flow:

User uploads a JSON Schema → stored in schemas.schema_jsonb
User creates a run (document + schema) → create_run_v2 RPC auto-creates one block_overlays_v2 row per block with status='pending' and overlay_jsonb='{}'
A worker (not yet built) claims pending overlays, reads the block content + schema, calls an LLM, and writes the structured result into overlay_jsonb
The frontend reads schema_jsonb to dynamically generate AG Grid columns, and reads overlay_jsonb to populate those columns
Export-JSONL outputs user_defined: { schema_ref, schema_uid, data: overlay_jsonb }
The schema is opaque to the platform — the DB stores it as-is in jsonb. Validation against the schema (if any) would happen at the worker level, not the DB level. The platform only requires: (1) it's valid JSON, (2) schema_ref is a string.

For a future wizard-designed schema: The frontend would build a JSON Schema object programmatically (from form inputs defining field names, types, enum values, descriptions) and POST it to the /functions/v1/schemas endpoint exactly like a file upload. The DB side needs no changes — schema_jsonb already stores any valid JSON Schema.

im curious if the user defined json is uploaded - then saved as jsonb to database- but how will it be dispalyed in the table area
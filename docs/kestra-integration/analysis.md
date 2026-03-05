Good — all three explorations are back. Let me synthesize what I found and write the plan.

The picture is now complete:

What exists:

parameter_schema (inputs) — real data on 12 functions, array format
result_schema (outputs) — column exists, all nulls, zero data
task_schema (Kestra) — raw JSON Schema from Kestra plugins, different format than parameter_schema
service_runs + events + artifacts — execution tracking tables, zero rows
Action catalog design doc — 49 action types with input_schema, output_schema, config_schema defined conceptually
FlowCanvas — ReactFlow prototype with input/output handles on nodes
What's missing for composability:

No function defines its outputs (result_schema all null)
No transform from Kestra task_schema (JSON Schema object) → parameter_schema (array)
No pipeline definition table (DAG as data)
No I/O type matching (can output of A feed input of B?)
No execution engine that reads a pipeline and runs it
Let me write the plan.

Read C:\Users\jwchu\.claude\plans\adaptive-watching-creek.md
Edit C:\Users\jwchu\.claude\plans\adaptive-watching-creek.md
Added 125 lines
Plan written. The core idea:

Three layers, four phases:

Layer 1 (Phase A — now): Seed result_schema for all 12 functions so every block declares its outputs. The contract is inputs + outputs.

Layer 2 (Phase B — when Kestra runs): Auto-transform Kestra's task_schema (JSON Schema object) → blockdata's parameter_schema (simple array). Bridges 900 plugins into the composable system.

Layer 3 (Phase C — when action model ready): Pipeline definitions table — DAG stored as JSONB ({nodes, edges}), each node references a function_id, edges map output fields to input params. FlowCanvas renders it, config forms auto-generated from parameter_schema.

Phase D (when FastAPI deployed): Execution engine reads pipeline, topological sorts, dispatches nodes to base_url + entrypoint, tracks runs.

Phase A is the only thing to do now — it's a migration + small UI tweak. Everything else has concrete triggers.

Claude’s Plan
Uniform Block Contract: Making 900 Integrations Composable
Context
The service registry has parameter_schema (inputs) and result_schema (outputs) on every function. Inputs have real data — 12 seeded functions with full param arrays. Outputs have zero data — result_schema is null on every row. Without typed outputs, functions can't be composed: you can't wire function A's output to function B's input if A doesn't declare what it produces.

Mage AI proves the pattern works at small scale (40 connectors, 4-8 block pipelines). Blockdata needs it at 900 integrations, 9-25 step pipelines, 200+ full pipelines.

The borrowable pattern from Mage: uniform block contract — every block has typed inputs, config, execute(), typed outputs, status. The execution engine doesn't know block internals. It just wires contracts together.

What Exists Today
Component	State
parameter_schema (inputs)	Real data on 12 functions (name, type, required, default, description, values)
result_schema (outputs)	Column exists, all nulls
task_schema (Kestra)	JSON Schema format from Kestra plugins — different format than parameter_schema
service_runs + events + artifacts	Tables exist, zero rows
service_functions_view	Joins functions + services + types, includes both schemas
FlowCanvas	ReactFlow prototype with input/output handles on nodes
Action catalog (docs)	49 action types defined with input_schema, output_schema, config_schema — conceptual only
What's Missing
No function defines its outputs — result_schema all null
No Kestra schema transform — task_schema (JSON Schema object) ≠ parameter_schema (array of param defs)
No pipeline definition table — no way to persist a composed DAG as data
No I/O type matching — can't check if output of A feeds input of B
No execution engine — no code reads a pipeline definition and runs blocks in order
The Approach: Three Layers
Layer 1: Typed Block Contract (DB + seed data)
Goal: Every service_function declares what it produces, not just what it consumes.

Changes:

Migration: Seed result_schema for all 12 existing functions with actual output shapes
result_schema format matches parameter_schema — array of {name, type, description} objects (NOT JSON Schema, same simple format)
Example for dlt_filesystem (source function):

{
  "returns": [
    {"name": "rows_loaded", "type": "number", "description": "Total rows loaded"},
    {"name": "destination_table", "type": "string", "description": "Target table name"},
    {"name": "load_id", "type": "string", "description": "dlt load package ID"},
    {"name": "schema_name", "type": "string", "description": "dlt schema name"}
  ]
}
Example for dbt_run (transform function):

{
  "returns": [
    {"name": "success", "type": "boolean"},
    {"name": "results", "type": "json", "description": "Per-model run results array"},
    {"name": "elapsed_time", "type": "number", "description": "Total seconds"},
    {"name": "manifest_path", "type": "string", "description": "Path to manifest.json artifact"}
  ]
}
Why array format, not JSON Schema: Matches parameter_schema convention. The platform doesn't do JSON Schema validation (schema = questions, not validation). Keeping both sides in the same simple array format means the same UI renderer works for inputs AND outputs.

Layer 2: Schema Bridge (Kestra → Blockdata)
Goal: Transform Kestra's task_schema (JSON Schema object with properties) into blockdata's parameter_schema (array of param defs).

Changes:

New utility function transformTaskSchemaToParams(taskSchema) in admin-integration-catalog edge function
Reads task_schema.properties object, task_schema.required array
Produces parameter_schema array:

task_schema.properties.projectDir = {type: "string", title: "Project Directory"}
  ↓
{name: "projectDir", type: "string", required: true, description: "Project Directory"}
Called during hydrate_detail — when admin fetches schema for a Kestra plugin, the transformed params are stored alongside the raw schema
New column on integration_catalog_items: parameter_schema_preview JSONB DEFAULT '[]' — the transformed preview, auto-generated from task_schema
Admin can review the preview, edit if needed, then provision to service_functions
Why not transform on the fly in the frontend? Because:

The transform needs to handle JSON Schema edge cases (allOf, oneOf, $ref, nested objects)
Admin should be able to review and correct the transform before it becomes a real function
The preview persists — no re-computation on every page load
Layer 3: Pipeline Definition (DAG as Data)
Goal: A composed pipeline is a row in the DB with a DAG structure that references function_id nodes.

New table: pipeline_definitions


CREATE TABLE pipeline_definitions (
  pipeline_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  pipeline_name TEXT NOT NULL,
  description TEXT,
  -- DAG stored as JSONB: nodes + edges
  graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
graph JSONB structure:


{
  "nodes": [
    {
      "node_id": "n1",
      "function_id": "uuid-of-dlt-filesystem",
      "config": {"path": "/data/input", "format": "csv"},
      "position": {"x": 100, "y": 200}
    },
    {
      "node_id": "n2",
      "function_id": "uuid-of-dbt-run",
      "config": {"select": "staging.*"},
      "position": {"x": 400, "y": 200}
    }
  ],
  "edges": [
    {
      "source": "n1",
      "target": "n2",
      "mapping": {
        "destination_table": "source_table"
      }
    }
  ]
}
nodes[].config — values for that function's parameter_schema params
edges[].mapping — maps output field names from source to input param names on target
nodes[].position — for FlowCanvas rendering (x, y coordinates)
Why JSONB graph, not separate node/edge tables?

A pipeline is a single atomic document — load it, edit it, save it
ReactFlow works with {nodes, edges} natively — no ORM translation
At 9-25 nodes per pipeline, the JSONB is small
Versioning is trivial (snapshot the whole graph)
Layer 3b: Pipeline Execution (future, after FastAPI is deployed)
New table: pipeline_runs (extends existing service_runs)


CREATE TABLE pipeline_runs (
  pipeline_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipeline_definitions(pipeline_id),
  status TEXT CHECK (status IN ('pending','running','complete','failed','cancelled')),
  graph_snapshot JSONB NOT NULL, -- frozen copy of graph at execution time
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
Each node execution creates a service_runs row with pipeline_run_id as context. The existing service_run_events and service_run_artifacts tables handle per-node logging and artifact tracking.

Implementation Order
Phase A: Block Contract (do now)
Migration: seed result_schema for all 12 existing functions
Admin-services edge function: expose result_schema in GET (already done in Step 1), accept in POST/PATCH (already done)
ServicesPanel: show output schema alongside input params (small UI addition to Step 2 work already done)
Phase B: Schema Bridge (do when Kestra instance is running)
Add parameter_schema_preview column to integration_catalog_items
Add transformTaskSchemaToParams() to admin-integration-catalog edge function
Wire into hydrate_detail — auto-generate preview on schema fetch
IntegrationCatalogPanel: show preview, allow edit before provisioning
Phase C: Pipeline Definition (do when action model is ready)
Migration: create pipeline_definitions table
Pipeline editor page — FlowCanvas with node palette from service_functions_view
Each node's config form auto-generated from parameter_schema
Edge wiring validates output→input type compatibility via result_schema + parameter_schema
Phase D: Execution Engine (do when FastAPI is deployed)
Migration: create pipeline_runs table
Execution endpoint on FastAPI: accepts pipeline_id, reads graph, topological sort, runs nodes
Each node dispatches to base_url + entrypoint with config as body
Per-node results stored in service_runs, pipeline status in pipeline_runs
Files Modified
Phase A (now)
File	Change
New migration (060)	Seed result_schema for 12 existing functions
web/src/pages/settings/ServicesPanel.tsx	Show result_schema in param display row
Phase B (Kestra running)
File	Change
New migration (061)	Add parameter_schema_preview to integration_catalog_items
supabase/functions/admin-integration-catalog/index.ts	transformTaskSchemaToParams() + wire into hydrate
web/src/pages/settings/IntegrationCatalogPanel.tsx	Preview display + edit
Phase C (action model ready)
File	Change
New migration (062)	Create pipeline_definitions table
New page: web/src/pages/PipelineEditor.tsx	Pipeline composition UI
web/src/components/flows/FlowCanvas.tsx	Wire node palette from registry
Phase D (FastAPI deployed)
File	Change
New migration (063)	Create pipeline_runs table
FastAPI service	Execution endpoint
What This Achieves
After Phase A: Every function in the registry declares inputs AND outputs. The contract is complete.

After Phase B: 900 Kestra integrations have their schemas auto-transformed into composable parameter arrays. Admin can review and correct.

After Phase C: Pipelines are DAGs stored in the DB. FlowCanvas renders them. Node config forms are auto-generated from parameter_schema. Edge wiring is type-checked against result_schema → parameter_schema.

After Phase D: Hit run, get a fully indexed knowledge base. 500 docs, 15 formats, 11 DBs, 25 steps, done.

Verification
Phase A
SELECT function_name, result_schema FROM service_functions WHERE result_schema IS NOT NULL returns 12 rows
ServicesPanel shows output fields below each function's input params
npm run build passes
Phase B
hydrate_detail for a Kestra task auto-populates parameter_schema_preview
Preview matches expected params from task_schema.properties
IntegrationCatalogPanel shows preview with edit capability
Phase C
Create a 3-node pipeline in editor, save, reload — graph persists
Node config form renders from parameter_schema
Invalid edge (output type mismatch) shows warning
Phase D
Execute 3-node pipeline → 3 service_runs rows created
Pipeline status transitions: pending → running → complete
service_run_events has log entries per node
---
title: 2026-03-06-priority-areas-response
description: Structured response to Jon's priority areas document, connecting each area to the task inventory and clarifying open questions.
---

## Priority 1: Kestra Integration

**Status: Fully scoped. Ready to execute.**

Everything needed is now available:

- Docker instance running with full Postgres access (21 tables, complete schema dump in `kestra-sqls/`)
- All 945 plugin schemas in `integration_catalog_items` with normalized inputs/outputs/examples across ~17K satellite rows
- The JSONB + generated columns pattern is documented and the adaptation to Supabase (owner_id + RLS) is designed
- Frontend tab stubs exist for all 7 Kestra-inspired tabs

### Sub-areas

**Frontend design**: Tasks F1-F9 (tab wiring) + N1-N5 (new pages) in the task inventory. The Flow Workbench already exists at 78KB. The tabs are stubbed. The work is wiring them to real data.

**SQL/Postgres setup**: Tasks S1-S14. This is the foundation layer. 5 utility functions, 2 enums, 7 tables, RLS policies. The schemas are designed — it's implementation.

**Python handler development**: Tasks P1-P13. The handler contract needs defining first (P1), then BasePlugin gets extended (P2), then handlers can be ported in parallel (P6-P11). The 945 plugin schemas in the catalog provide the input/output specs for codegen.

**Non-flow features to consider from Kestra:**

| Feature | Kestra Table | Priority | Notes |
|---|---|---|---|
| Blueprints/Templates | `templates` | Medium | Pre-built flow templates. Could map to `integration_catalog_items` with a "template" category. Task N3 in inventory. |
| KV Store | `kv_metadata` | Medium | Per-namespace key-value storage for flow variables. Useful for shared state between executions. Task N6 in inventory. |
| Namespace Files | `namespace_file_metadata` | Low | File management within namespaces. Task N7 in inventory. |
| Dashboards | `dashboards` | Low | Custom dashboard builder. Separate feature track. |
| Concurrency Limits | `concurrency_limit` | Medium | Per-flow execution caps. Already in task inventory (S12, E7, F7). |

**Auto-generating Python handlers from Java schemas**: This is task P6-P11. The approach:
1. Query `integration_catalog_items` for all plugins in a group (e.g., `io.kestra.plugin.aws.s3.*`)
2. Extract `task_schema.properties` → parameter names, types, required flags, defaults
3. Use the documented Java→Python type mapping (Property\<String\> → str, etc.)
4. Generate handler stubs with parameter validation and docstrings
5. Implement the actual execution logic per handler family (boto3 for AWS, SQLAlchemy for JDBC, etc.)

This can be semi-automated with a codegen script that produces ~80% of each handler. The remaining 20% is the actual execution implementation.

---

## Priority 2: Nango

**Status: Running and accessible. Needs integration design.**

### What Nango does

Nango is an **OAuth and API integration proxy**. It solves one specific problem: managing credentials for external services.

When your platform needs to call Google Drive, Slack, GitHub, or any other OAuth-protected API on behalf of a user:

1. **Without Nango**: You build OAuth flows, store tokens, handle refresh, manage scopes, deal with token expiry — per provider. This is months of work.
2. **With Nango**: You configure the provider once (client ID, secret, scopes). Nango handles the entire OAuth lifecycle. Your code calls Nango to get a current valid token, then makes the API call.

### How it fits into Blockdata

```
Marketplace: User browses providers, clicks "Connect Google Drive"
    → provider-connections edge function → Nango OAuth flow → tokens stored

Flow execution: Task needs to read from Google Drive
    → pipeline-worker asks Nango for current token → makes API call → returns data

Token lifecycle: Access token expires after 1 hour
    → Nango auto-refreshes using stored refresh token → no user action needed
```

### Nango vs Scalar API

These are completely different tools:

| | Nango | Scalar |
|---|---|---|
| **Purpose** | OAuth token management + API proxy | API documentation + testing UI |
| **Who uses it** | Backend services (edge functions, pipeline-worker) | Developers testing/exploring APIs |
| **What it stores** | Encrypted OAuth tokens per user per provider | Nothing — it's a stateless UI |
| **Runtime role** | Called in production to get credentials | Development-only tool for exploring your own API |

**They don't overlap.** Scalar documents your APIs. Nango manages credentials for calling other people's APIs.

However, there is a useful connection: when you build the **API Playground** page (which uses Scalar), you could allow users to test external API calls using their Nango-stored credentials. That would make the playground capable of testing both internal endpoints (Blockdata's own API) and external endpoints (Google, Slack, etc.) using real auth.

### Nango Sync capability

Nango also has a **sync engine** (`_nango_sync_configs`, `_nango_sync_jobs`, `_nango_syncs`). This can run background jobs that pull data from external APIs on a schedule — essentially a lightweight ETL. This could eventually replace some of what dlt would do for external data sources. Currently unused but worth keeping in mind.

---

## Priority 3: ArangoDB Integration

**Status: Designed and approved, not implemented. Container stopped but available.**

### Scope

ArangoDB is the **read-optimized projection store**. It does NOT replace Supabase. The relationship:

| Concern | Supabase (Postgres) | ArangoDB |
|---|---|---|
| Auth + users | Yes (system of record) | No |
| Flow definitions | Yes (writes) | Projected (reads) |
| Executions + logs | Yes (writes) | Projected (reads) |
| Document graph traversal | Slow (recursive CTEs) | Fast (native AQL) |
| Block relationships | FK-based | Edge collections |
| Citation networks | JOINs | Graph queries |

### What gets projected

Collections approved for Arango projection:
- `documents` — source documents
- `blocks` (→ `document_blocks`) — parsed content blocks
- `annotations` (→ `block_annotations`) — block overlays/annotations
- `doclingdocument_json` — full Docling parse output
- `parse_artifacts` — conversion representations
- **New:** `flow_executions`, `flow_execution_logs` (once the JSONB tables exist)

### Why the JSONB pattern enables this

Every table using the `value JSONB` pattern already stores a self-contained document. Syncing to Arango is:

```sql
SELECT key AS _key, value AS doc FROM flow_executions WHERE updated_at > $last_sync;
```

No JOINs, no reconstruction. The sync mechanism (CDC trigger, pg_notify, or polling) is the only design decision remaining.

---

## Priority 4: Docs Site as Control Tower

**Status: Site running. Structure needs buildout.**

The docs site at `blockdata-ct` already has the DIRECTION.md defining it as a knowledge layer for humans, AI, and cross-branch communication. The additions needed:

### Proposal acceptance/reject system

Create a content collection for proposals:

```
src/content/docs/proposals/
  YYYY-MM-DD-proposal-title.md
  ---
  title: ...
  status: draft | proposed | accepted | rejected
  author: branch-name or worker-id
  reviewedBy: ...
  ---
```

Workers submit proposals as PRs to the docs site. The QC branch reviews and updates `status`. All branches pull the docs site to see current accepted standards.

### Standards dissemination

```
src/content/docs/standards/
  naming-conventions.md
  rls-policy-pattern.md
  jsonb-table-pattern.md
  frontend-component-contract.md
  handler-interface-contract.md
```

These become the canonical reference that all implementation workers follow. Changes go through the proposal system.

### Branch communication

```
src/content/docs/comms/
  branch-a-status.md    -- updated by Branch A workers
  branch-b-status.md    -- updated by Branch B workers
  blockers.md           -- cross-branch blockers
  decisions.md          -- decisions log
```

Each branch updates its status doc. Blockers doc is the escalation path. Decisions log is the audit trail.

---

## Priority 5: AI Functionality

**Status: Designed (chat pane), not implemented. Separate track.**

Three sub-areas:

### 5.1 AI API Integration Config Page

A settings page where users configure their AI provider credentials (OpenAI, Anthropic, Vertex AI, etc.). This connects to the existing `model_roles` and `embedding_providers` tables from migrations 058-062.

### 5.2 AI Chat Pane

Designed in `docs/plans/2026-03-04-ai-chat-window-design.md`. The convergence assessment flagged this as **"specified but not clearly integrated into the current convergence path."** Recommendation: defer to after the flow runtime is working end-to-end.

### 5.3 MCP Accessibility for End Users

This would allow users to connect Claude or other MCP-capable AI tools to their Blockdata workspace. Requires:
- MCP server endpoint (edge function or standalone)
- Tool definitions that expose Blockdata operations (create flow, run flow, query executions)
- Auth integration (user's Supabase JWT passed through MCP)

This is a significant feature. Recommend scoping it as a separate phase after the core platform is operational.

---

## Priority 6: Format and Standards Mapping

**Status: Documented in priorities.md. Needs a canonical reference page.**

This is a knowledge management task. The formats in play:

| Format | Role in Blockdata | Where Used |
|---|---|---|
| **OpenAPI Spec** | Describes REST APIs. Machine-readable API contracts. | Scalar API playground, external provider integration, future API export |
| **JSON Schema** | Describes data structure. What fields, what types, what's required. | `task_schema` in plugin catalog, flow input/output validation, schema editor |
| **Docling JSON** | Pydantic-based document IR from Docling parser. | `conversion_representations`, stored as parse artifact |
| **Pandoc AST JSON** | Universal document IR from Pandoc. | Alternative parse path, format conversion |
| **Akoma Ntoso (XML)** | Semantic legal document standard. | Legal document export/import |
| **JSON-LD** | Linked data in JSON. RDF serialization. | Future: ArangoDB graph metadata, cross-document ontologies |
| **remark/mdast JSON** | Markdown AST. | In-process markdown parsing (edge function) |
| **Kestra YAML** | Flow definitions. No-code pipeline descriptions. | Flow editor, flow_sources.source_code |
| **reStructuredText** | Python-native doc format. | Potential future parse support |

### Key clarification

**OpenAPI ≠ JSON Schema**, though OpenAPI uses a subset of JSON Schema internally.

- **OpenAPI**: "Here are the URLs you can call, what parameters they accept, and what they return." It's about API design and documentation.
- **JSON Schema**: "Here is what this JSON object should look like." It's about data validation.

In Blockdata:
- OpenAPI describes your edge function endpoints (what Scalar renders)
- JSON Schema describes the structure of data flowing through your pipelines (what `task_schema` contains)
- They intersect when an API endpoint accepts or returns structured JSON — the request/response body schema within an OpenAPI spec IS a JSON Schema

---

## Recommended Execution Order

Based on dependencies and the convergence assessment's warning about "surfaces ahead of persistence":

1. **SQL Foundation** (S1-S14) — unblocks everything
2. **Edge Functions** (E1-E10) — unblocks frontend + python in parallel
3. **Python Handlers** (P1-P13) — can start P3 immediately, rest after contract
4. **Frontend Tabs** (F1-F9) — once edge functions exist
5. **Frontend Pages** (N1-N5) — alongside tabs
6. **Docs Site Control Tower** (Priority 4) — should start immediately, independent
7. **Integration Wiring** (I1-I8) — as pieces connect
8. **AI Features** (Priority 5) — after flow runtime works end-to-end
9. **ArangoDB Projection** (Priority 3) — after JSONB tables are populated
10. **Format Standards Page** (Priority 6) — knowledge work, any time

# Phase 2 Integrations: Internal Assistant Development Direction

**Date:** 2026-02-11  
**Status:** Directional architecture + delivery plan (**deferred until core workflows/pipelines are production-stable**)  
**Core-first active plan:** `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`  
**Scope:** Internal platform assistant grounded in platform data (BlockData artifacts, specs, guides), with KG + vector retrieval + MCP tool access to platform CLI  
**Audience:** Platform engineering, data/ML engineering, product, and operations

---

## 1) Executive Direction

Use a **retrieval-first, tool-augmented assistant** architecture:

1. Keep the base model general-purpose.
2. Ground responses using platform-owned context (KG + vectors + lexical retrieval).
3. Route operational actions through explicit tools (CLI via MCP), not free-form model output.
4. Enforce strict separation between:
- `Internal Assistant AI` (platform-owned assistant in side panel)
- `Worker AI` (user-key execution for runs after schema definition)

This approach is the current production standard for specialized assistants and avoids the risk/cost of premature base-model fine-tuning.

---

## 1.1 Activation Gate (Sequencing Lock)

This assistant program is **intentionally sequenced after core platform completion**.

Do not start assistant implementation until the following gates are met:

1. Conversion/ingest pipeline is stable for required source formats.
2. Worker/run processing is live, reliable, and operationally monitored.
3. Schema core workflows (wizard + advanced editor + persistence/fork semantics) are complete.
4. Review/export core workflows are complete and hardened.
5. Core operational hardening (tests, permissions, smoke matrix, incident basics) is in place.

Until these gates are met, this document remains architectural guidance only.

---

## 2) Non-Negotiable Boundaries

### 2.1 AI system boundary

1. Internal assistant:
- Uses platform-managed credentials.
- Serves product guidance, schema guidance, and platform operations.
- Lives in the right-side assistant dock in the app shell.

2. Worker AI:
- Uses user-provided API keys (or worker-specific path already defined by platform policy).
- Performs run/block processing according to schema-defined fields and prompt config.
- Must remain a separate execution path from assistant requests.

### 2.2 Action safety boundary

1. Read-only operations are default.
2. Mutating operations require explicit confirmation and auditable execution.
3. Tool execution must be constrained to authorized project/user scope.

### 2.3 Grounding boundary

1. Assistant answers should include citations/evidence references.
2. Assistant must prefer "not enough evidence" over speculative answers when context confidence is low.

---

## 3) Current Platform Assets to Reuse

Leverage existing platform artifacts and conventions:

1. Core data flow and IDs:
- `projects` -> `documents_v2` -> `blocks_v2` -> `runs_v2` -> `block_overlays_v2`
- schema artifacts in `schemas`

2. Existing schema guidance contract:
- `schema-assist` operations already specified in `docs/ongoing-tasks/meta-configurator-integration/spec.md`

3. Existing shell surface:
- right-side assistant area already integrated in app layout and can be shown/hidden

4. Existing docs/spec ecosystem:
- `docs/ongoing-tasks/*`
- platform guides and future "how to use platform" documentation

---

## 4) Target Architecture (Reference Blueprint)

## 4.1 Layers

1. **UI layer (web app):**
- Assistant panel (thread + composer + context chips + action cards)
- Receives citations and action confirmations

2. **Assistant orchestration layer:**
- Intent classification
- Retrieval planning (KG/vector/lexical blend)
- Tool routing and confirmation logic
- Final response assembly with citations

3. **Knowledge layer:**
- Vector index for semantic retrieval
- Lexical index for exact terminology and identifiers
- Knowledge graph for hierarchical and relational traversal

4. **Tool layer:**
- Platform CLI commands (JSON outputs)
- MCP server exposing read/action tools with policy checks

5. **Policy + observability layer:**
- Access control, action logs, result traceability, eval metrics

## 4.2 Request lifecycle

1. User asks question in assistant panel.
2. Orchestrator determines intent (`question`, `suggest`, `action`).
3. Orchestrator retrieves scoped context (project/user constrained).
4. If action intent: produce plan + request confirmation.
5. Execute via MCP tool (CLI wrapper) when confirmed.
6. Return response with citations, tool results, and confidence signal.

---

## 5) Knowledge Subsystem Direction

## 5.1 Source corpus (v1)

1. BlockData artifacts:
- processed block content and metadata from `blocks_v2`
- schema and run metadata from `schemas` and `runs_v2`

2. Product/platform knowledge:
- specs, issues, status docs, implementation direction docs
- "how to use platform" guides as they are authored

## 5.2 Chunking and indexing strategy

1. Docs/specs:
- chunk by semantic sections (heading-based), paragraph-level fallback
- preserve section path metadata

2. Block content:
- chunk by block identity; optionally merge adjacent small blocks for retrieval quality
- keep `project_id`, `source_uid`, `block_uid`, `block_type`, and locator metadata

3. Vector index:
- embeddings for semantic retrieval
- include stable IDs and source metadata in each vector record

4. Lexical index:
- support exact match on schema fields, IDs, table names, error strings, and operator terms

## 5.3 KG construction direction

Build a hierarchical + relational graph from platform artifacts:

1. Node types:
- `Project`, `Document`, `Block`, `Schema`, `Run`, `OverlayField`, `GuideSection`, `SpecRequirement`, `IntegrationCapability`

2. Edge types:
- `contains`, `references`, `defines`, `generated_from`, `uses_schema`, `belongs_to`, `depends_on`, `maps_to`

3. KG goals:
- support relationship-aware retrieval ("how does X relate to Y?")
- support path-based explanations and citations

## 5.4 Sync model

1. Initial backfill pipeline.
2. Incremental updates on document/schema/run changes.
3. Scheduled reconciliation to fix drift.

---

## 6) MCP + CLI Integration Direction

## 6.1 CLI contract (required)

1. Commands return strict JSON (`--json` default for assistant-facing pathways).
2. Each action supports:
- `dry-run`
- `execute`
- machine-readable status/result/error

3. Command families:
- `read` (status, metadata, diagnostics)
- `action` (safe mutations, retries, orchestrated operations)

## 6.2 MCP tool exposure

Expose CLI and knowledge operations through an MCP server with capability-scoped tools:

1. Knowledge tools:
- `search_docs`
- `search_vectors`
- `traverse_kg`
- `resolve_context_bundle`

2. Platform read tools:
- `get_project_summary`
- `get_document_state`
- `get_run_status`
- `get_schema_summary`

3. Platform action tools:
- `apply_schema_to_project`
- `trigger_run_pending`
- `retry_failed_blocks`
- `export_project_outputs`

All action tools require explicit user confirmation in assistant UX.

## 6.3 Access control model

1. Tool invocation includes authenticated user context.
2. MCP layer validates project ownership/authorization before CLI execution.
3. No cross-tenant or cross-user leakage in retrieval or tool access.

---

## 7) Assistant Orchestration Design

## 7.1 Intent routing

Route each request to one of:

1. `KnowledgeQnA` (read-only answer + citations)
2. `SchemaGuidance` (field/prompt/schema suggestions; integrates with `schema-assist` path)
3. `PlatformAction` (proposal + confirmation + tool execution)

## 7.2 Retrieval policy

Use hybrid retrieval by default:

1. Vector candidates (semantic).
2. Lexical candidates (exact terms and IDs).
3. KG expansion (relationship and hierarchy).
4. Rerank combined candidates for final context window.

## 7.3 Response policy

1. Include source references/citations.
2. Separate "facts from retrieved context" vs "assistant inference".
3. For low confidence or low evidence, return explicit uncertainty and suggested next checks.

---

## 8) Data and API Contracts (v1 Direction)

Define assistant API contracts early:

1. `POST /assistant/query`
- input: message + UI context (`route`, `project_id`, optional `schema_id`, optional `run_id`)
- output: response text + citations + optional action plan

2. `POST /assistant/action/confirm`
- input: action token + confirmation
- output: execution result with tool logs (sanitized for UI)

3. `POST /assistant/feedback`
- input: thumbs up/down + reason category + optional correction
- output: logged feedback id

Keep contracts versioned (`v1`, `v1.1`) to avoid client/server drift.

---

## 9) Security, Governance, and Audit

1. Maintain full execution audit for every assistant action:
- who asked
- what context used
- what tool executed
- what changed
- result code

2. Redact secrets and sensitive payloads in logs.

3. Add policy checks before action execution:
- authorization
- resource state preconditions
- dry-run feasibility

4. Add reversible operations where possible (or explicit rollback guidance in action responses).

---

## 10) Evaluation and Quality Program

## 10.1 Offline eval set

Build a curated test set from:

1. platform docs/spec questions
2. schema authoring questions
3. operations diagnostics questions
4. action-intent prompts with safe/unsafe variants

## 10.2 Core metrics

1. Grounded answer rate
2. Citation precision
3. Action success rate
4. Wrong-action prevention rate
5. Hallucination/error incidence
6. Latency percentile (P50/P95)

## 10.3 Human-in-loop review

1. Weekly review of failed/low-confidence sessions.
2. Feed corrections into retrieval/reranking and prompt policy improvements.

---

## 11) Phased Delivery Plan

## Phase A — Foundation (read-only assistant)

1. Build ingestion/chunking/indexing for docs + block artifacts.
2. Implement hybrid retrieval and citation response.
3. Ship assistant for read-only knowledge help in the side panel.

**Exit criteria:** grounded Q&A with citations in authorized scope.

## Phase B — Schema guidance integration

1. Integrate schema guidance flows with `schema-assist` contract.
2. Support "suggest/apply" into schema wizard and advanced editor context.

**Exit criteria:** assistant can produce schema-help suggestions that are compatible with platform schema conventions.

## Phase C — Action tools with confirmation

1. Add MCP-exposed CLI read/action tools.
2. Enforce explicit confirmation UX for mutation actions.
3. Add action audit logs.

**Exit criteria:** assistant can execute approved operational workflows safely.

## Phase D — Optimization and governance hardening

1. Improve reranking and KG traversal quality.
2. Expand eval suite and policy checks.
3. Add progressive rollout gates and incident playbooks.

**Exit criteria:** production readiness with measurable quality and operational controls.

---

## 12) Anti-Patterns to Avoid

1. Training/fine-tuning a base model before retrieval/tool architecture is mature.
2. Letting assistant execute mutating commands without confirmation.
3. Mixing assistant credentials and worker/user-key execution paths.
4. Shipping without traceable citations or execution audit.
5. Building vector-only retrieval without lexical/KG complement.

---

## 13) Immediate Next Steps (Recommended)

1. Ratify this direction as the Phase 2 assistant architecture baseline.
2. Define v1 API contracts (`/assistant/query`, `/assistant/action/confirm`, `/assistant/feedback`).
3. Implement knowledge ingestion MVP for:
- `docs/ongoing-tasks/*`
- platform guides
- selected block artifacts with strict scope metadata
4. Stand up MCP read tools first, then add guarded action tools.
5. Run internal pilot with feature flags and capture eval telemetry before broad rollout.

---

## 14) Decision Summary

Yes, the proposed path (hierarchical KG + vectors + CLI + MCP) is architecturally correct.  
This document sets the recommended execution pattern so the assistant is:

1. grounded,
2. auditable,
3. safe for operational use,
4. aligned with BlockData’s existing schema/run/worker model.

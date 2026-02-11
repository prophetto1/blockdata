# Phase 2 Integrations: Internal Assistant Execution Checklist

**Date:** 2026-02-11  
**Status:** Implementation backlog (task-by-task)  
**Companion doc:** `docs/ongoing-tasks/phase-2-integrations/0211-internal-assistant-development-direction.md`  
**Scope:** Deliver the internal assistant with grounded retrieval and safe tool execution

---

## 1) Delivery Objective

Ship an internal assistant that is:

1. Grounded on platform knowledge (docs/specs/block artifacts).
2. Separated from worker AI execution paths.
3. Safe for operational actions through confirmed, auditable tools.
4. Measurable by quality, safety, and latency metrics.

---

## 2) Constraints and Boundaries (Must Hold)

- [ ] Internal assistant credentials and worker/user-key paths remain separated.
- [ ] Retrieval and actions enforce project/user authorization.
- [ ] Mutating actions require explicit confirmation in UX.
- [ ] Every assistant action is auditable (request, context, tool, result).
- [ ] Citations are returned for grounded answers.

---

## 3) Workstream Plan

## Workstream A: Contracts and Governance

### A1. Freeze v1 assistant API contracts
- [ ] Define request/response schemas for:
  - `POST /assistant/query`
  - `POST /assistant/action/confirm`
  - `POST /assistant/feedback`
- [ ] Add JSON schema definitions in repo.
- [ ] Add error taxonomy (`auth_error`, `validation_error`, `insufficient_context`, `tool_denied`, `tool_failed`).

**Suggested files:**
- `supabase/functions/_shared/assistant/contracts.ts` (new)
- `docs/ongoing-tasks/phase-2-integrations/assistant-api-v1.md` (new)

**Exit check:**
- [ ] Contract docs and schema definitions match implementation stubs.

### A2. Policy and access-control model
- [ ] Define authorization checks for all assistant read/action operations.
- [ ] Define redaction rules for logs and tool output.
- [ ] Define confirmation policy for mutating operations.

**Suggested files:**
- `docs/ongoing-tasks/phase-2-integrations/assistant-policy-model.md` (new)

**Exit check:**
- [ ] Policy approved and referenced by implementation tasks.

---

## Workstream B: Knowledge Ingestion and Indexing

### B1. Define canonical source registry
- [ ] Register doc/spec sources (`docs/ongoing-tasks`, platform guides, integration docs).
- [ ] Register platform artifact sources (project/document/block/schema/run references).
- [ ] Assign canonical source IDs and freshness strategy.

### B2. Build chunking pipeline
- [ ] Implement heading-aware chunker for docs.
- [ ] Implement block-aware chunking for block artifacts.
- [ ] Preserve metadata (`project_id`, `source_uid`, `block_uid`, section path, timestamps).

**Suggested files:**
- `services/assistant-indexer/chunkers/docs.ts` (new)
- `services/assistant-indexer/chunkers/blocks.ts` (new)
- `services/assistant-indexer/types.ts` (new)

### B3. Build embedding + lexical indexing jobs
- [ ] Generate embeddings for chunks.
- [ ] Build lexical index for exact matching on terms/IDs.
- [ ] Add incremental sync jobs and scheduled reconciliation.

**Suggested files:**
- `services/assistant-indexer/jobs/embed.ts` (new)
- `services/assistant-indexer/jobs/lexical.ts` (new)
- `services/assistant-indexer/jobs/reconcile.ts` (new)

**Exit checks:**
- [ ] Backfill completes without schema drift.
- [ ] Incremental sync updates changed records only.

---

## Workstream C: Knowledge Graph (KG)

### C1. Define KG ontology v1
- [ ] Node types: `Project`, `Document`, `Block`, `Schema`, `Run`, `OverlayField`, `GuideSection`, `SpecRequirement`.
- [ ] Edge types: `contains`, `references`, `defines`, `uses_schema`, `belongs_to`, `depends_on`.
- [ ] Define storage model and traversal query API.

### C2. Implement KG builder and sync
- [ ] Initial graph build from existing sources.
- [ ] Incremental edge/node updates on relevant events.
- [ ] Integrity checks (dangling node/edge detection).

**Suggested files:**
- `services/assistant-indexer/kg/ontology.ts` (new)
- `services/assistant-indexer/kg/build.ts` (new)
- `services/assistant-indexer/kg/sync.ts` (new)

**Exit checks:**
- [ ] KG traversal returns valid, scoped path results.
- [ ] No unauthorized cross-project traversal results.

---

## Workstream D: Retrieval and Orchestration

### D1. Build hybrid retrieval service
- [ ] Implement vector retrieval adapter.
- [ ] Implement lexical retrieval adapter.
- [ ] Implement KG expansion retrieval.
- [ ] Implement reranking merge layer.

**Suggested files:**
- `supabase/functions/assistant-retrieve/index.ts` (new) or service equivalent
- `supabase/functions/_shared/assistant/retrieval.ts` (new)

### D2. Build orchestration service
- [ ] Intent classification (`knowledge_qna`, `schema_guidance`, `platform_action`).
- [ ] Retrieval plan generator by intent.
- [ ] Response assembler with citations and confidence markers.
- [ ] Low-evidence fallback behavior.

**Suggested files:**
- `supabase/functions/assistant-query/index.ts` (new)
- `supabase/functions/_shared/assistant/orchestrator.ts` (new)
- `supabase/functions/_shared/assistant/prompts.ts` (new)

**Exit checks:**
- [ ] Responses include citations for grounded answers.
- [ ] Low-evidence requests return explicit uncertainty.

---

## Workstream E: MCP + CLI Tooling

### E1. Define platform CLI contract
- [ ] Ensure assistant-facing commands support JSON output.
- [ ] Add `dry-run` mode for action commands.
- [ ] Standardize result envelope (`ok`, `code`, `message`, `data`, `trace_id`).

### E2. Expose CLI via MCP server
- [ ] Add read tools first (`get_project_summary`, `get_run_status`, etc.).
- [ ] Add action tools with confirmation token flow.
- [ ] Add tool-level authorization checks and deny responses.

**Suggested files:**
- `tools/platform-cli/*` (new/updated)
- `tools/platform-mcp/server.ts` (new)
- `tools/platform-mcp/policies.ts` (new)

**Exit checks:**
- [ ] Read tools return scoped results only.
- [ ] Action tools require explicit confirmation token.

---

## Workstream F: Frontend Assistant Productization

### F1. Assistant panel core
- [ ] Add thread list and message timeline.
- [ ] Add composer with context chips.
- [ ] Add citation render blocks.
- [ ] Add action card UI with confirm/cancel.

**Suggested files:**
- `web/src/components/assistant/AssistantPanel.tsx` (new)
- `web/src/components/assistant/AssistantThread.tsx` (new)
- `web/src/components/assistant/AssistantComposer.tsx` (new)
- `web/src/components/assistant/CitationList.tsx` (new)
- `web/src/components/assistant/ActionCard.tsx` (new)

### F2. API integration
- [ ] Wire `/assistant/query`.
- [ ] Wire `/assistant/action/confirm`.
- [ ] Wire `/assistant/feedback`.
- [ ] Persist local UI state and request session IDs.

**Suggested files:**
- `web/src/lib/assistant/client.ts` (new)
- `web/src/lib/assistant/store.ts` (new)

### F3. UX safeguards
- [ ] Distinguish assistant guidance from worker execution in UI copy.
- [ ] Mark mutating actions explicitly and require confirmation.
- [ ] Show evidence/citation status with each answer.

**Exit checks:**
- [ ] No UI flow conflates assistant and worker AI systems.
- [ ] Action confirmations are mandatory and traceable.

---

## Workstream G: Evaluation and Observability

### G1. Telemetry
- [ ] Log each assistant request with trace ID.
- [ ] Log retrieval sources and ranks (sanitized).
- [ ] Log tool invocation attempts and outcomes.

### G2. Eval harness
- [ ] Build gold-set question suite for platform docs/specs.
- [ ] Build action-intent safety suite (allowed/denied/unsafe cases).
- [ ] Automate periodic eval runs and regression reports.

**Suggested files:**
- `tests/assistant/evals/*.json` (new)
- `tests/assistant/eval-runner.ts` (new)
- `docs/ongoing-tasks/phase-2-integrations/assistant-eval-report-template.md` (new)

**Exit checks:**
- [ ] Groundedness and citation thresholds met for pilot.
- [ ] Unsafe action prevention threshold met.

---

## Workstream H: Rollout and Operations

### H1. Feature flags
- [ ] `ff_assistant_query`
- [ ] `ff_assistant_actions`
- [ ] `ff_assistant_schema_guidance`

### H2. Environment and secrets
- [ ] Configure platform assistant model credentials.
- [ ] Configure retrieval/index service credentials.
- [ ] Verify secrets are isolated from worker key paths.

### H3. Rollout stages
- [ ] Stage 0: internal engineering only.
- [ ] Stage 1: small pilot users.
- [ ] Stage 2: expanded rollout with monitored thresholds.

### H4. Incident playbook
- [ ] Disable action tools quickly via flag.
- [ ] Degrade to read-only retrieval mode.
- [ ] Capture failure traces and recovery steps.

---

## 4) Suggested Milestones and Gates

### Milestone M1: Read-only grounded assistant
- [ ] A + B + D1 + F1 + F2 (query only) complete.
- [ ] Citations present and authorization scoped.

### Milestone M2: Schema guidance integration
- [ ] D2 schema-guidance path complete.
- [ ] UI apply flow integrated in schema surfaces.

### Milestone M3: Safe action tooling
- [ ] E + F3 + G1 + H1 complete.
- [ ] Confirmation + audit for actions verified.

### Milestone M4: Production readiness
- [ ] G2 + H2 + H3 + H4 complete.
- [ ] Eval and incident thresholds signed off.

---

## 5) Verification Commands (Template)

Use command equivalents appropriate to your runtime; keep machine-readable output where possible.

- [ ] Run backend tests for assistant contracts.
- [ ] Run retrieval integration tests.
- [ ] Run MCP tool policy tests (allow/deny).
- [ ] Run frontend build + assistant interaction tests.
- [ ] Run eval harness and compare to baseline thresholds.

---

## 6) Risks and Mitigations

1. **Risk:** Tool misuse for unintended mutation.  
Mitigation: strict confirmation + policy enforcement + dry-run by default.

2. **Risk:** Retrieval quality drifts as corpus grows.  
Mitigation: scheduled evals, reranking improvements, source freshness checks.

3. **Risk:** Assistant/worker boundary erosion in UX or API.  
Mitigation: explicit contract separation, copy guardrails, separate credentials and services.

4. **Risk:** Latency becomes unacceptable with hybrid retrieval.  
Mitigation: cache common retrieval bundles, tune top-k, async prefetch.

---

## 7) Definition of Done (Phase 2 Assistant)

- [ ] Internal assistant answers are grounded with citations.
- [ ] Assistant can safely perform approved platform actions with confirmation.
- [ ] Authorization boundaries hold for retrieval and actions.
- [ ] Assistant and worker AI systems remain clearly separated.
- [ ] Eval thresholds and incident playbook are in place for rollout.

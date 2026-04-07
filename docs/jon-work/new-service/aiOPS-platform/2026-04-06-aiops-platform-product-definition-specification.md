# AI Operations Platform Product Definition Specification

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Feature Name:** AI Operations Platform Product Definition

**Goal:** Define a production-oriented AI operations platform that combines provider/model governance, plan execution orchestration, human-in-the-loop curation, and event-driven workflow execution with explicit scalability for connectors and MCP-style tool ecosystems.

**Architecture:** A local-first, versioned control plane that stores structured metadata in SQLite, editable artifacts in files, and executes plans through a traced orchestration backend plus real-time frontend workbench surfaces. The product is intentionally workspace-first for operators and execution engineers.

**Tech Stack:** React + TypeScript (Vite), XYFlow, MDXEditor, FastAPI/Python service layer (`services/platform-api`), Supabase/Postgres + SQLite metadata store, filesystem-backed documents, structured observability (traces/metrics/logs), SSE/WebSocket event distribution.

**Status:** Draft  
**Author:** User-requested product extraction  
**Date:** 2026-04-06

---

## 0) Executive Summary

The product is not a single feature add-on; it is the integration of three mature subsystems into one coherent AI implementation platform:

1. `Blockdata Admin` for reliable AI provider/model/connector governance.
2. `Skill-Driven Dev` as the planning canvas surface.
3. `Plan Tracker` as the execution workbench surface.

The platform must make planning and execution deterministic through:

- canonical artifacts (`plan`, `skill`, `prompt`, `connector`, `run`, `policy`),
- clear ownership of source of truth (structured + human-edited),
- explicit versioning and traceability,
- event-driven state transitions,
- and preserved human control at approval and modification boundaries.

---

## 1) Product Shape (structural intent extracted from transcript history)

### 1.1 Primary product purpose

Enable teams to define, test, execute, and evolve implementation plans with AI assistance without losing:

- operator context,
- action auditability,
- model/provider governance,
- and future integration extensibility.

### 1.2 Core user workflows

- Define AI provider and model strategy.
- Author and adjust implementation plans.
- Route selected plans to execution.
- Monitor plan/run status in near-real-time.
- Evolve prompts/skills safely through versioned edits.
- Extend execution capabilities through connectors and external tools.

### 1.3 Non-negotiable principle

Human operators remain in control of production-impactful transitions. AI can propose and execute, but approval and version governance remain explicit.

---

## 2) Product domains

### 2.1 Blockdata Admin domain

Administrative control plane for AI infrastructure configuration and governance:

- AI providers registry and metadata
- model role mappings and model targets
- MCP/server/tool/connector surfaces
- worker and instance configuration

This domain must remain navigationally and semantically coherent (one shell context, consistent breadcrumbs, shared UI tokens/classes).

### 2.2 AGChain Admin domain

Registry of provider/model artifacts and model-target relationships. Must operate in provider-centric context so model operations are naturally scoped and safe by default.

### 2.3 Plan Orchestrator domain

The planning and execution command layer:

- visual planning (`SkillDrivenDev` canvas),
- workbench-based operational planning and run control (`PlanTracker`),
- recommendation and context preparation surfaces,
- execution run tracking and event timelines.

### 2.4 Prompt + skill library domain

An evolving knowledge layer:

- machine-generated suggestions,
- human edits,
- versioned MDX/Markdown content,
- and library reuse across plans and tasks.

### 2.5 Integration / connector domain

Future-ready execution adapter surface including MCP-like tools:

- connector definitions,
- installed connector instances,
- policy-driven tool exposure,
- run-level invocation records.

---

## 3) Core domain objects (proposed product entity model)

#### 3.1 Canonical execution objects

1. `AgentProfile` — actor/operator identity, role, and permissions context.
2. `OrchestrationSession` — operator-visible workflow instance tying canvas + workbench state.
3. `Plan` — abstract plan header and lifecycle status.
4. `PlanVersion` — immutable plan snapshot per approved change.
5. `PlanStep` — executable nodes and step order/dependencies.
6. `PromptArtifact` — reusable prompt text with metadata and ownership.
7. `SkillArtifact` — machine-operable skill/task definition bound to runtime behavior.

#### 3.2 Asset and context objects

8. `ExecutionContextBundle` — context payload attached to run and preflight checks.
9. `ContextTemplate` — reusable context presets for recurring workflows.
10. `VariationProfile` — per-task plan/skill variation record (purpose-built for task-fit tuning).
11. `PolicyRule` — constraints for approval, policy checks, and governance boundaries.
12. `ObservationEvent` — durable structured event emitted by execution runtime.
13. `Run` — concrete execution attempt with status/time bounds and result metadata.
14. `RunArtifact` — generated output pack (notes, logs, diffs, produced files/changes).

#### 3.3 Integration objects for MCP/connector scalability

15. `ConnectorDefinition` — connector capabilities, auth and version contract.
16. `ConnectorInstallation` — environment-specific installed connector state.
17. `ConnectorTool` — tool surface exposed by a connector.
18. `ToolBinding` — mapping between skill/context and connector tool.
19. `ExecutionTransport` — transport/runtime adapter details (HTTP, stdio, websocket, etc.).
20. `ConnectorPolicy` — allow/deny matrix by tool, actor, plan class.
21. `InvocationRun` — low-level connector invocation trace and durability record.

---

## 4) Backend architecture

### 4.1 Runtime layers

- **Gateway/API layer:** auth, route-level authorization, request validation.
- **Orchestration engine layer:** state machine, transition rules, precondition checks.
- **Context service:** context assembly from artifacts, history, model/provider constraints, and policy.
- **Execution layer:** scheduling and dispatch of run units.
- **Integration layer:** connector adapter execution and transport abstraction.
- **Observation layer:** event creation, metric emission, tracing, structured logging.

### 4.2 Persistence strategy

- SQLite for normalized entity metadata and workflow state:
  - fast local iteration,
  - indexable search over plans/skills/runs,
  - efficient diff/version queries.
- Filesystem + MDX/Markdown for human-editable documents:
  - readable version history,
  - review-friendly reviewability,
  - lower friction for non-technical edits.

### 4.3 Event model

All meaningful transitions emit events. Suggested immutable event classes:

- `SessionCreated`, `PlanDrafted`, `PlanApproved`, `PlanVersionPublished`,
- `ContextAssembled`, `RunStarted`, `RunStepCompleted`, `RunStepFailed`,
- `RunCompleted`, `ConnectorToolInvoked`, `ConnectorPolicyBlocked`.

Events feed:
- activity logs,
- workbench timeline,
- alerts,
- and replay/audit.

---

## 5) Frontend architecture

### 5.1 Workspace topology

- Shared shell for Blockdata Admin and orchestration domains.
- Dedicated orchestration page combining:
  - plan/session browser,
  - XYFlow canvas zone,
  - plan workbench tabs,
  - run timeline + event log,
  - prompt/skill library panel,
  - connector/policy inspectors.

### 5.2 UX constraints derived from prior findings

1. Keep navigation context correct for each surface (`Blockdata Admin`/`Superuser` shells as applicable).
2. Use shared primitives for forms, tokens, and spacing to avoid drift.
3. Preserve existing action surfaces (refresh/add/edit/delete/publish) on redesigns.
4. Avoid context-loss regressions by coupling deep links to mounted route ownership.
5. Design all destructive/impactful operations as explicit, traceable actions.

### 5.3 Data flow

Frontend must support:

- optimistic local updates where safe,
- conflict-safe sync when server-side state changes,
- event stream reconciliation for active sessions/runs,
- and deterministic rendering from versioned artifacts.

---

## 6) Routing and ownership contracts

### 6.1 Mounted route ownership

Production routes must treat plan orchestration as a superuser-owned operational workspace, while provider/model CRUD remains in blockdata-admin shell space.

### 6.2 Deep-link preservation rule

Any route containing a resource identifier must preserve that identifier through redirects and route transitions; if an identifier cannot be resolved, the UI must not silently re-route to a broader parent view without explicit user feedback.

### 6.3 Compatibility seam

Where legacy routes or old route patterns are retained:
- preserve behavior by redirecting with full parameter sets;
- keep old paths supported until explicitly decommissioned;
- treat compatibility behavior as a governed seam with tests and migration notes.

---

## 7) Governance, safety, and quality

### 7.1 Approval model

- plans require explicit approval before production-impacting execution.
- role-gated actions for approvals and destructive operations.
- every approval transition writes immutable event + metadata.

### 7.2 Versioning discipline

- immutable plan/skill/prompt versions only.
- never mutate historical versions in place.
- diff and rollback paths available for all mutable entities.

### 7.3 Observability requirements

- trace spans for planning transitions and execution dispatch,
- metrics on run outcomes and latency,
- structured logs for security-sensitive transitions,
- no sensitive raw identifiers in attributes unless explicitly constrained.

---

## 8) Scalability and integration roadmap

### 8.1 Horizontal scalability goals

- connector inventory and invocation should scale with catalog growth.
- query paths must be indexed by plan, provider, status, and artifact family.
- run/event tables partitioned or archived by age for long-lived installations.

### 8.2 Integration readiness

- connector and MCP tooling should be added through registry + installation objects, not hardcoded code paths.
- transport abstraction must support future protocols without changing core orchestration contracts.

### 8.3 Operational growth

- multi-project or multi-repo orchestration paths should reuse same artifact model with environment scoped identifiers.
- execution throughput increases via batching and queue-aware scheduling (where needed), while preserving event ordering for observability.

---

## 9) Functional scope for phase 1 (explicitly bounded)

1. Lock shell consistency for admin surfaces, breadcrumbs, and navigation contexts.
2. Implement the provider-first AGChain editing paradigm end-to-end in UI state.
3. Stabilize plan + run orchestration data contracts and eventing.
4. Introduce plan/version/prompt/skill model with immutable updates.
5. Deliver event timeline and run visibility end-to-end.
6. Add first-class connectors registry/install/binding read/write APIs.

Out of scope for phase 1:
- enterprise federation/auth SSO replatforming,
- cross-cluster orchestration,
- automatic autonomous production deployment.

---

## 10) Acceptance criteria (phase 1 target behavior)

1. Operators can navigate Blockdata Admin and AGChain actions without context loss or breadcrumb mismatch.
2. Providers and model targets can be managed in a scoped provider-first interaction model.
3. Plan creation, editing (including MDX content), approval, and run start are all versioned and auditable.
4. Runs expose a real-time timeline including step-level state and connector invocation metadata.
5. Execution surface supports connector/tool invocation through configured registry objects.
6. A full change is reproducible by replaying event history and reconstructing plan/run final state.

---

## 11) Risks and tradeoffs

1. Complexity risk: combining canvas and workbench domains can create duplicate state handling; resolved via single orchestration session state model.
2. Storage coupling risk: SQLite+filesystem duality requires clear ownership boundaries and migration policy.
3. Drift risk: old routes and shell semantics; resolved by explicit compatibility seam contracts and linted route tests.
4. Integration risk: connectors can widen attack surface; resolved through policy objects and invocation-level governance.

---

## 12) Next-step execution handoff

This specification intentionally captures the product shape only and is now ready to be converted into a full implementation plan contract.

If you want, next I can produce:
1. A locked implementation contract with endpoint/table/observability inventory and acceptance tests.
2. A tasked implementation plan file in writing-plans format (file paths + 2-5 minute steps + commit cadence).
3. A concrete initial SQL schema + TypeScript type model aligned to the objects above.


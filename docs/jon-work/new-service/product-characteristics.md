Extracted Product Shape (from transcripts)
1) Product identity and positioning
You are defining an AI engineering operations platform for your team/organization, not just a static admin UI. The system is meant to unify:

AI provider/model governance,
workflow planning and execution,
AI-assisted implementation orchestration,
prompt/instruction management,
observability of model-driven execution,
and future integration expansion (connectors/MCPs).
The platform’s core thesis is:

Humans define and govern strategy and quality boundaries,
AI executes implementation workflows using structured context,
The system tracks everything needed for repeatability and auditability.
2) Core user roles and use-cases
Superusers / technical operators

Configure providers, integrations, execution policy, and global AI/model settings.
Govern model/target mappings and prompt/tool inventories.
Plan authors and implementers

Build execution plans visually (canvas) and operationally (workbench).
Author and evolve implementation plans with approval gates.
Execution stewards

Observe run-time behavior, failures, and event-driven status.
Track versions, deltas, and propagation of plan/prompts changes.
Reviewers / maintainers

Audit history, compare versions, propagate improvements.
Ensure consistent admin UX and governance boundaries.
3) System domains confirmed by transcript
Blockdata Admin domain

Primary administrative surfaces live under /app/blockdata-admin.
Includes AI providers, model roles, MCP connectors, worker/server config.
Need to be consistently framed as one shell/domain, not mixed with legacy “Settings” framing.
AGChain domain

Manages provider registration, model targets, model lifecycle actions.
The intended interaction pattern is provider-first/master-detail behavior, not two disconnected global tables.
Dual-container pattern and scoped model interactions were required to prevent model edits from becoming context-agnostic.
Plan orchestration domain

Existing canvas (Skill-Driven Dev) and operational workbench (Plan Tracker) are separate surfaces that should be integrated into one broader orchestration workflow.
Current architecture favors visual graph planning plus operational execution visibility.
Prompt / artifact management domain

Plans and skill instructions need human-editable and machine-driven evolution paths.
Explicit emphasis on MDX-backed editing plus durable structured storage (SQLite + filesystem).
Variation management is expected to be first-class (task-specific plan/skill variations rather than one-off edits).
Integration domain

Future connectors and MCP support is treated as a primary scaling requirement, not optional.
Connector objects are foundational: definitions, installs/bindings, invocation runs, tool policy, transport abstraction.
4) Product capabilities (as reconstructed)
Provider and model governance

Register and manage providers.
Maintain model registries and provider-specific model targets.
Support add/edit/search/filter patterns without losing operational context.
Preserve all existing actions while improving structure and discoverability.
Visual planning and node/edge workflows

Use graph/canvas abstractions (nodes + edges) for implementation planning.
Surrounding shell controls and synchronization patterns matter as much as canvas primitives.
Execution is not a pure visual toy; it is a controllable operational workflow front-end.
Plan lifecycle management

Create, edit, version, and track plans.
Route accepted plans into execution.
Keep both human and AI interventions auditable.
Maintain workbench-style operations (not just conceptual plan diagrams).
Event-driven execution architecture

Events are central: status changes, transitions, failures, retries, and observations are represented as durable domain events.
Real-time UI updates are expected (SSE/WebSocket style feed).
Frontend mirrors execution state not via periodic polling only, but through stream-driven updates.
Context provisioning for AI execution

Model should receive curated context automatically from inventories, historical variants, and policy/constraints.
“Prompt management library” is part of a larger context plane, not a separate utility.
5) Data and storage design constraints implied
Hybrid persistence design

SQLite for structured, query-efficient, versioned operations metadata.
Filesystem + MDX for human-readable, editable documents and library assets.
This combination is explicitly chosen for local-first ergonomics with path toward scale.
Versioning and traceability as first-class concerns

Immutable/append-only event log concept for replay and auditability.
Multiple versions of the same skill/plan artifact are expected.
Variation propagation should be controlled and auditable.
Scalability posture

Indexing, normalized object relations, and bounded query paths are required.
Inventory retrieval must support fast reuse across plans/runs.
Integration layer should avoid ad-hoc storage; it should scale with connector count and run volume.
6) UI/product architecture inferred from transcript discussions
Shell consistency is product-critical

Routing and breadcrumb context are part of user trust and operational reliability.
“Blockdata Admin” should be coherent across admin screens to reduce operator confusion.
Workbench pattern over “single-purpose pages”

The platform should move from disconnected pages toward composable workspaces with canvas + workbench coordination.
Existing pages were reworked to preserve actions while improving flow clarity.
Provider-first interaction model

Operators should work from selected provider context.
Model management should be contextualized and constrained by that selection.
UX should prevent implicit context mismatch.
Action preservation requirement

Every redesign must keep existing capabilities on surface (refresh, edit, add, delete, etc.) while improving structure.
No silent removal of controls during redesign was tolerated.
7) Orchestration blueprint (high-level shape)
Backend command/control plane

API gateway + orchestration engines.
Engine components for context assembly, rule/constraint checks, planning, transitions, conflict resolution.
Execution service dispatching and connector execution adapters.
Observability + event ingestion for telemetry and run state.
Domain services

Inventory service for skills/prompts/plans/models/integration artifacts.
Execution service for run lifecycle and run-step state.
Connector/adapter service for external systems.
Frontend application experience

Unified “workflow session” area combining:
visual canvas for structural planning,
operational workbench for document/run management,
recommendation and recommendation provenance context,
prompt/skill/plan asset libraries,
timeline and event stream for execution truth.
8) Confirmed design principles
Local-first does not mean simplistic; it means portable, fast iteration, and controlled evolution.
Human-in-the-loop remains mandatory (approval gates, editing, version governance).
Architecture is event-driven and version-centric, not request-response only.
Scalability should be structural, not bolted-on later.
Admin and superuser workflows must be reliable at the routing and context level first, before advanced feature expansion.
9) What this says the product is not (implicit boundaries)
Not a simple settings panel for static AI config.
Not merely a plan checklist.
Not a one-way “AI does it all” system.
Not a disconnected set of proof-of-concept pages.
The transcript stream implies a deliberate transition from “admin pages + experimentation” to a cohesive, versioned AI implementation platform with production-minded observability, context management, and extension capability.

//

Borrowed Architecture Contract (AGChain, v1)

Scope and intentBorrow only the parts that are useful:

From gitagent: registry/manifest model, discoverability, provider abstraction, validation metadata.From AutoNode: registry-compiled execution graph idea, background execution worker pattern, step/action event journaling.Do not import either project as a monolith. Use only these contracts and keep AGChain route/workbench ownership intact.2) Boundaries (must hold)A registry is one module among many registries.Runtime consumes resolved registry artifacts by ID/version only.Workbench renders state and issues commands; it does not execute low-level business logic.No boundary-to-boundary direct DB coupling; only explicit contracts/API calls/events.3) Shared types (canonical contracts)export type RegistryKind = "provider" | "model" | "prompt" | "skill" | "plan" | "connector" | "workflow-template";export type RegistryStatus = "draft" | "published" | "archived";export interface RegistryIdentity {registry_id: string;kind: RegistryKind;slug: string;display_name: string;version: number;status: RegistryStatus;schema_version: string;tags: string[];owner_type: "system" | "user";created_by: string;created_at: string;updated_at: string;checksum_sha256: string;}export interface RegistryArtifact<TPayload, TMeta = Record<string, unknown>> {identity: RegistryIdentity;payload: TPayload;meta: TMeta;parent_version_id?: string;approval_required: boolean;immutable: true;}export interface ResolvedRegistryRef {registry_id: string;kind: RegistryKind;version: "latest" | number;resolved_payload: unknown;}export interface RegistryEvent {event_id: string;kind: RegistryKind;registry_id: string;action: "created" | "published" | "deprecated" | "archived";actor: string;ts_utc: string;version: number;}4) Registry boundary contractRegistry adapter provider interfaceexport interface RegistryProvider {resolve(input: { kind: RegistryKind; registry_id: string; version?: "latest" | number }): Promise<RegistryArtifact>;list(input: { kind: RegistryKind; status?: RegistryStatus; q?: string; limit?: number; offset?: number }): Promise<{ items: RegistryIdentity[]; total: number }>;writeDraft(input: Omit<RegistryIdentity, "version" | "checksum_sha256" | "created_at" | "updated_at"> & { payload: TPayload }): Promise<RegistryArtifact>;publish(input: { registry_id: string; version: number }): Promise<RegistryArtifact>;archive(input: { registry_id: string; version?: number }): Promise;}HTTP contractPOST /api/agchain/registries/{kind}Create draft artifact.GET /api/agchain/registries/{kind}List/search identities.GET /api/agchain/registries/{kind}/{registry_id}Read latest.GET /api/agchain/registries/{kind}/{registry_id}/versions/Read fixed version.POST /api/agchain/registries/{kind}/{registry_id}/publishPublish draft → immutable version.POST /api/agchain/registries/{kind}/{registry_id}/deprecateSet status to deprecated.POST /api/agchain/registries/{kind}/{registry_id}/archiveArchive artifact.Borrow source mappingKeep gitagent-style discovery and install semantics:provider-agnostic RegistryProvider interfacemanifest loading + schema validation as first-class boundaries.5) Runtime boundary contractexport interface WorkflowDefinition {workflow_id: string;workflow_version_id: string;nodes: Array<{ node_id: string; node_type: string; config: Record<string, unknown> }>;edges: Array<{ edge_id: string; from: string; to: string; condition?: Record<string, unknown> }>;bound_assets: ResolvedRegistryRef[]; // e.g. skill/prompt/provider/connector refsapproval_policy: { require_approval: boolean };}export interface OrchestratorRun {run_id: string;workflow_version_id: string;started_by: string;status: "queued" | "running" | "succeeded" | "failed" | "cancelled";started_at: string;updated_at: string;current_step_id?: string;correlation_id: string;}export interface ExecutionEngine {validateRun(input: WorkflowDefinition): Promise<{ valid: boolean; issues: string[] }>;startRun(input: { workflow_version_id: string; context_bundle_id?: string; params?: Record<string, unknown> }): Promise;stepResult(run_id: string, step_id: string): Promise<{ step_id: string; status: string; logs: string[] }>;cancelRun(run_id: string, reason: string): Promise;}HTTP contractPOST /api/agchain/execution/validatePOST /api/agchain/execution/runsGET /api/agchain/execution/runs/POST /api/agchain/execution/runs//cancelGET /api/agchain/execution/runs//events (SSE/WebSocket stream)Borrow source mappingFrom AutoNode: graph compile + worker dispatch pattern:resolve graph from registry refsexecute via job workerappend action/event rows for replayability.6) Workbench boundary contractexport interface WorkbenchSession {session_id: string;run_id: string;active_tab: "canvas" | "timeline" | "artifacts" | "context";user_facing_filters: Record<string, unknown>;last_opened_at: string;}export interface WorkbenchAction {action_id: string;session_id: string;actor: string;action_type: "run" | "approve" | "edit_plan" | "retry_step" | "open_asset" | "open_registry_version";payload: Record<string, unknown>;created_at: string;}export interface WorkbenchSurface {getSession(session_id: string): Promise;applyAction(action: WorkbenchAction): Promise;listTimeline(run_id: string): Promise<RegistryEvent[]>;getRegistrySnapshot(run_id: string): Promise<ResolvedRegistryRef[]>;}HTTP contractPOST /api/agchain/workbench/sessionsGET /api/agchain/workbench/sessions/POST /api/agchain/workbench/sessions//actionsGET /api/agchain/workbench/sessions//timelineGET /api/agchain/workbench/canvas/Borrow source mappingFrom your current AGChain UI, keep /api/agchain/… calls behind a thin service layer and pass resolved artifacts into canvas/workbench components.7) Hard invariants (do not violate)Registry writes create immutable versions; never mutate historical rows.Runtime input never contains unstructured inline plan/provider definitions; only registry refs + explicit versions.Workbench is command-focused: it reads event/state and emits actions; it does not directly mutate registry payloads.Event stream is append-only and idempotent by (run_id, step_id, event_id).All registry schema validation must happen at publish boundaries, not only at UI save time.If you want, I can convert this into a copy-paste docs/architecture/AGCHAIN-BORROWED-CONTRACT.md plus a second document that maps each interface to existing AGChain files (AgchainAdminModelsPage, SkillDrivenDev, PlanTracker, useAgchainAdminRegistry) and API route names.

Borrowing matrix (what to lift/adapt/rework)
Area	AutoNode signal	PicoClaw signal	AG platform decision
Core execution model
Adapt
Adapt
Implement a graph/plan executor where runs are first-class artifacts, but keep your own orchestration semantics.
Model/provider resolution
Adapt
Lift/adapt strongly
Lift PicoClaw’s model-centric resolution (protocol-prefix model model-list + provider fallback) rather than deep provider-mode branching.
Tool/connector extensibility
Moderate
Lift strongly
Use a registry-driven plugin model for capabilities (tool/connector/skill), with optional hidden/discoverable entries and explicit activation.
Async decoupling
Some
Lift strongly
Keep an internal message/event bus between ingress, dispatcher, runtime, and outbound emitters.
Run observability / audit
Strong
Adapt
Use action/run trails + append-only event log as first-class domain data (not just chat log text).
Capability state in UI
Moderate
Partial
Keep provider-first, registry-first admin screens; add explicit capability status + dependency visibility.
Session/state persistence
Moderate
Lift/adapt
Use append-only durable history plus logical truncation/compaction strategy; add domain event replayability.
Lifecycle/process controls
Moderate
Adapt
Model gateway/process lifecycle style for worker services, but simplify to your deployment needs.
Chat/Channels layer
Context-specific
Not reusable directly
Skip most channel adapters unless you need live IM ingress.
Why Picoclaw is useful now for your path
It already treats provider/model/tool ecosystems as registries and supports plugin-style registration (Register, RegisterHidden, factory registries), which maps directly to your “registry plane” requirement.
ToolRegistry is deterministic and capability-aware (Register vs hidden/promo + TTL) with ordered tool schema emission.
Tool/agent/channel registration is done via global registries and factories.
It has a clean async bus (inbound/outbound channels + close semantics) that cleanly separates orchestration from IO boundaries.
It already has model management endpoints and config-backed CRUD patterns that are close to the admin/workbench pattern you’re enforcing.

registry.go
33:func (r *ToolRegistry) Register(tool Tool) {
34:    r.mu.Lock()
...
51:func (r *ToolRegistry) RegisterHidden(tool Tool) {
...
100:func (r *ToolRegistry) Version() uint64 {
...
274:func (r *ToolRegistry) GetDefinitions() []map[string]any {

registry.go
10:type ChannelFactory func(cfg *config.Config, bus *bus.MessageBus) (Channel, error)
19:func RegisterFactory(name string, f ChannelFactory) {
23:    factories[name] = f

bus.go
17:type MessageBus struct {
65:func (mb *MessageBus) PublishInbound(ctx context.Context, msg InboundMessage) error {
73:func (mb *MessageBus) PublishOutbound(ctx context.Context, msg OutboundMessage) error

jsonl.go
45:// JSONLStore implements Store using append-only JSONL files.
56:type JSONLStore struct {
102:func (s *JSONLStore) readMeta(key string) (sessionMeta, error) {
223:func (s *JSONLStore) addMsg(sessionKey string, msg providers.Message) error {

factory.go
38:func resolveProviderSelection(cfg *config.Config) (providerSelection, error) {
...
246:	// Fallback: infer provider from model and configured keys.

router.go
25:type Router struct {
34:func New(cfg RouterConfig) *Router
61:func (r *Router) SelectModel(
66:	score = r.classifier.Score(features)

models.go
15:func (h *Handler) registerModelRoutes(mux *http.ServeMux) {
16:	mux.HandleFunc("GET /api/models", h.handleListModels)
18:	mux.HandleFunc("POST /api/models", h.handleAddModel)
19:	mux.HandleFunc("POST /api/models/default", h.handleSetDefaultModel)
Crisp implementation framing for you
What belongs in Registries: provider catalog, model catalog (with alias/protocol mapping), tool/connector registry, prompt/asset registry, policy registry, channel/template registry. These should be immutable in content per version and only mutated through admin workbench actions.
What belongs in Orchestration Runtime: planner/resolver, model routing, run graph execution, dependency injection of registry lookups, retry/timeout/fallback rules, and event emission.
What belongs in Workbench surfaces:
Registry cockpit (CRUD with lineage/versioning).
Canvas/workbench for composing runtime plans.
Run observability (live state, event timeline, audit replay).
Health/controls for long-running workers and connectors.
If you want, next I can produce a one-page “borrowed architecture contract” with explicit interfaces for each registry/runtime/workbench boundary so your team can implement this directly in your existing AGChain codebase.





1) PicoClaw Borrowing Matrix (for your platform)
Borrowing goal: Registry-first platform with a workbench-centric composition layer and audit-ready runtime.

High-value patterns to Lift

Registry-as-interfaces across extensions (ChannelFactory, Tool/ToolRegistry, CommandRegistry, MCP registry style).
Async message bus separating ingress/egress from runtime (inbound/outbound channels + lifecycle-safe close).
Run-time tool state management with hidden vs core capability and deterministic exposure.
JSONL append-only persistence style for history/session data (durable, crash-safe, compactable without mutation).
Unified model/provider selection flow with protocol/model aliasing and fallback resolution.
Patterns to Adapt

Tool discovery and promotion model (hidden tools surfaced only when discovered/allowed) → adapt to your connector/skill activation model.
Provider resolution pipeline (auth method, model protocol inference, fallback chain) → adapt to your auth and provider strategy.
Route+handler backend shape for model/tool/config operations (CRUD, validation, defaults, guarded state updates).
Patterns to Rework / Not Copy Directly

Telegram/Discord/IM channel architecture is less relevant unless you want external chat ingress.
PicoClaw’s exact process lifecycle (gateway, local process orchestration) should be reworked into your deployment model.
UI details of PicoClaw pages should be treated as reference patterns, not a direct layout spec.
Decision summary

Treat PicoClaw as a reference implementation for registries + runtime boundaries, not as UI/feature parity to clone.
Keep PicoClaw’s strengths around plugin registries, asynchronous bus, and deterministic tool schemas, then align surfaces to your AGChain admin/workbench model.
2) PicoClaw Architecture-to-Your-Product One-Pager
Proposed boundary plan:

Registry Plane (authoritative catalogs)

Model registry (alias + protocol model key + provider creds/config)
Tool/skill/connector registry with permission and status
Prompt/version/policy registry with immutable versions
Runtime component registry (agents/workflows/actions)
Orchestration Plane (runtime engine)

Resolver: picks model/provider + validates dependencies
Planner: composes runtime plans from registry entries
Runner: executes graph of steps (sync + async), emits structured events
Auditing: append-only event stream + deterministic IDs and correlation keys
Retry/fallback policy + circuit-like isolation around model/tool calls
Workbench Plane (UI surfaces)

Registry workbenches (admin): model/tool/connector/policy CRUD
Composition workbench (canvas): build and validate workflow graphs
Runtime workbench: live run status, event timeline, replays, retry actions
Incident/observability page: trace + event replay + audit filters
Implementation contract

Registries own definitions and versions only.
Runtime consumes registries and emits events only.
Workbench reads registries/runs, sends write commands to registries, and controls run actions (retry/cancel/pause where valid).
If you want, I can now output these two as copy-paste ready Markdown docs (one for docs/jon-plans/picoclaw-borrowing-matrix.md, one for docs/jon-plans/registry-workbench-runtime-framing.md).
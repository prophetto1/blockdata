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
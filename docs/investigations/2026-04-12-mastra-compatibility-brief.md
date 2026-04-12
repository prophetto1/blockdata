# Repo Compatibility Brief: Mastra

## Block 1: Context

- **repo_name:** mastra
- **repo_path:** `I:/mastra`
- **analysis_date:** 2026-04-12
- **our_context:** Vite+React frontend, Supabase+Python backend, three-layer config model, service registry with 174 Kestra imports (being superseded). Building toward a legal AI platform where Block Data (documents→knowledge), AGChain (evaluation), and the agent framework (orchestration) unify.
- **scope:** Agent orchestration, tool abstraction, evaluation framework, RAG/knowledge, storage abstraction, MCP, workflow engine, memory, observability.
- **target_summary:** TypeScript-first AI agent framework (YC W25, Apache 2.0). 21 core packages, 81 integrations (24 stores, 13 observability, 14 voice, 9 auth). Pluggable stores/tools/LLMs with DI container, built-in evals, MCP, graph-based workflows with suspend/resume.

## Block 2: Decision

- **fit_decision:** **high-fit**
- **thesis:** Mastra's pluggable agent-framework architecture is the "agent framework as integration layer" that replaces the Kestra connector-based model — and it ships with evals, RAG, MCP, and 40+ LLM providers out of the box.
- **go_no_go:** **prototype**
- **confidence:** **High**

## Block 3: Borrowing Matrix

| Domain | Evidence (file:function) | Decision | Why | Cost |
|---|---|---|---|---|
| **Agent orchestration** | `packages/core/src/agent/agent.ts` — 5786-line `Agent` class with tools, memory, voice, scorers, model routing, processors | **Adapt** | Core agent class maps to our AI function execution; needs legal-domain processors added | 1w+ |
| **Tool abstraction** | `packages/core/src/tools/tool.ts` — `createTool()` factory, Zod schemas, `requireApproval`, suspend/resume | **Lift** | Directly replaces our ad-hoc function registry; `requireApproval` maps to legal approval gates | 3d |
| **Workflow engine** | `packages/core/src/workflows/workflow.ts` — 4187-line `Workflow` class with `.then()/.branch()/.parallel()`, suspend/resume, execution graph | **Adapt** | Replaces Kestra flows entirely; suspend/resume is the attorney-sign-off pattern; needs legal audit hooks | 1w+ |
| **Evaluation framework** | `packages/evals/src/scorers/` — code scorers (tool-call-accuracy, trajectory, completeness, tone) + LLM scorers (answer-relevancy, bias, context-precision) | **Adapt** | Foundation for AGChain; needs legal-domain scorers (privilege compliance, jurisdictional accuracy) added on top | 1w+ |
| **Hooks/lifecycle** | `packages/core/src/hooks/index.ts` — mitt-based emitter, 3 events: `ON_EVALUATION`, `ON_GENERATION`, `ON_SCORER_RUN` | **Rework** | Too thin for governance needs (only 3 events, no blocking). Need SK-Filter-style middleware chains or agent-governance hooks from our research | 1w+ |
| **Storage abstraction** | `packages/core/src/storage/base.ts` — `MastraCompositeStore` with domain-based pluggable stores | **Lift** | Swappable stores pattern matches exactly; our Supabase becomes one store backend | 3d |
| **RAG / knowledge** | `packages/rag/src/` — document processing, graph-rag, reranking, RAG tools | **Adapt** | Foundation for Block Data's knowledge layer; needs Docling integration (Python) as document source | 1w+ |
| **Memory system** | `packages/memory/src/` — conversation history, semantic recall, working memory, thread persistence | **Lift** | Legal AI needs persistent context per matter/client; thread model maps to legal matter threads | 3d |
| **MCP support** | `packages/mcp/src/` — client + server + shared | **Lift** | Already validated MCP as our capability discovery protocol; Mastra's implementation is production-grade | 1d |
| **Model routing / BYOM** | `packages/core/src/llm/` — 40+ providers via Vercel AI SDK, model router | **Lift** | Direct implementation of our BYOM workspace feature and admin model role assignments | 1d |
| **Observability** | `observability/` — 13 integrations including Braintrust, Langfuse, Datadog, OpenTelemetry | **Lift** | Braintrust integration already exists; OTel matches our existing platform-api patterns | 1d |
| **Voice/multimodal** | `voice/` — 14 TTS/STT integrations (OpenAI, ElevenLabs, Deepgram, etc.) | **Lift** | Legal AI voice agents (client intake, deposition prep) are a differentiated feature | 3d |
| **Auth** | `auth/` — 9 providers including Supabase | **Lift** | Supabase auth adapter already exists; maps directly to our auth layer | 1d |
| **Server adapters** | `server-adapters/` — Express, Fastify, Hono, Koa | **Lift** | Hono adapter for edge/serverless; Express for our platform-api Python↔TS bridge | 1d |

## Block 4: Architecture Map

### Agent/Orchestration Layer (Mastra core → our agent framework)
- **extract:** `Agent` class, `Tool` class + `createTool()`, `Workflow` class + `createStep()`, `createWorkflow()`
- **extension_points:** Processors (input/output), tool `requireApproval`, workflow suspend/resume, hook emitter
- **contracts:** `Agent.generate()` → text/object result; `Tool.execute(input, context)` → output; `Workflow.createRun().start()` → run state with step results

### Knowledge Layer (Mastra RAG + stores → Block Data)
- **extract:** Document processing pipeline, graph-RAG, reranker interface, 24 vector/data store backends
- **extension_points:** Pluggable store backends via `MastraCompositeStore`, custom document processors
- **contracts:** Store interface: `getStore(domain)` → domain-specific store; Vector: upsert/query with filters

### Evaluation Layer (Mastra evals → AGChain)
- **extract:** Code scorers (7 types), LLM scorers (4+ types), scorer hooks, scoring sampling config
- **extension_points:** Custom scorer registration, `ON_SCORER_RUN` hook, `ON_EVALUATION` hook
- **contracts:** Scorer: `(input) → score trace`; hooks fire non-blocking via `setImmediate`

## Block 5: Risks

- **validate_first:**
  1. Python↔TypeScript boundary: Docling, ML models, and parsing are Python. Mastra is TypeScript. Verify Mastra tools can cleanly call Python services (HTTP/subprocess).
  2. Supabase as Mastra store: Confirm `stores/pg` adapter works against Supabase Postgres with RLS policies intact.
  3. Hook system adequacy: Mastra's 3-event hook system is too thin for legal governance. Must verify the mitt emitter can be extended or replaced with SK-Filter-style middleware without forking core.

- **platform_mismatch:**
  1. Mastra requires Node >= 22.13.0; verify our deployment targets support this.
  2. Mastra is Apache 2.0 with Enterprise Edition (`ee/`) directories — enterprise auth features require license review.
  3. Our existing Kestra service registry (174 entries, naming drift) will be orphaned — need migration plan or clean break.

- **license:** Apache 2.0 (Mastra) → our proprietary → **needs-review** for `ee/` directories only. Core is clean.

- **fit_breakers:** None. The TypeScript-first architecture aligns with our React frontend; the pluggable store pattern is the exact anti-Kestra architecture we articulated needing; Python services can be called as tools.

## Block 6: Verdict

**Product-fit assignment:**
- Agent/workflow/tool layer → **replaces** Kestra absorption model and service registry as orchestration backbone
- RAG/knowledge layer → **becomes** Block Data's document-to-knowledge pipeline (augmented with Docling via Python tool)
- Evals layer → **becomes** AGChain's scorer foundation (extended with legal-domain scorers)
- Observability (Braintrust, OTel) → **replaces** ad-hoc platform-api OTel patterns with unified tracing
- Voice layer → **new capability** for legal AI voice agents
- **Do NOT adopt:** Mastra Cloud (proprietary SaaS) — self-host only. Mastra's hook system as-is — too thin, needs governance extensions.

**Roadmap:**
- **First cut:** (1) Wire Mastra `createTool()` + `createWorkflow()` for one existing pipeline (document parse→extract). (2) Confirm `stores/pg` against Supabase with RLS. (3) Stand up one agent with memory + Braintrust observability.
- **Gate:** Agent successfully runs a parse→extract→store workflow against real documents, with eval scores captured in Braintrust.
- **Next wave:** (1) Migrate remaining service registry functions to Mastra tools. (2) Build legal-domain scorers for AGChain. (3) Add governance middleware layer (extending hooks or adding SK-Filter pattern). (4) Voice agent prototype for legal intake.

**Hard invariants:**
1. Python services (Docling, ML) remain Python — called as Mastra tools via HTTP, never transpiled to TypeScript.
2. Supabase remains the persistence layer — Mastra's `stores/pg` adapter connects to it, not a separate database.
3. Three-layer config model (superuser/admin/user) must be preserved — Mastra's DI container adapts to our tiers, not the other way around.
4. Legal audit trail is non-negotiable — every agent action must produce an immutable trace, even if Mastra's hook system needs extension.
5. No vendor lock-in to Mastra Cloud — self-hosted deployment only, using Vercel/Hono adapters.

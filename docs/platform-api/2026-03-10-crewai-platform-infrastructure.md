# Building a Multi-User Agent Platform on BlockData

> **For Claude:** This is a design specification and context document. Read it fully before proposing implementation.

---

## 1. Introduction

BlockData (BD2) is being extended from a document management and ELT platform into a multi-user workspace that includes AI agent orchestration. The goal is to provide the infrastructure that crewAI's open-source framework lacks — a hosted, multi-tenant platform where users can define, deploy, monitor, and manage agent workflows — built on top of BD2's existing stack: React frontend, Supabase (Postgres), FastAPI, and supporting services.

This is not a single-user playground. Every design decision assumes multiple users, multiple organizations, role-based access, isolated execution, and shared infrastructure.

---

## 2. The Problem: What crewAI Doesn't Ship

### What exists (open-source)

crewAI's open-source repos provide the **engine** — a Python framework for defining agents, tasks, crews, and flows. Specifically:

| Repo | Contents |
|------|----------|
| **crewAI** (main) | Core framework: agents, tasks, crews, flows, memory, tools, CLI, persistence, A2A protocol, telemetry. 1,013 Python files across `lib/crewai`, `lib/crewai-tools`, `lib/crewai-files`, `lib/devtools`. |
| **crewAI-examples** | ~25 example projects: content generation flows, email auto-responders, lead scoring with HITL, book writing, game building, stock analysis, trip planning, recruitment pipelines. |
| **crewAI-quickstarts** | Feature demos: collaboration patterns, custom LLM integration, guardrails, planning, reasoning. |
| **crewAI-tools** | Tool extensions (archived — tools now live in main repo under `lib/crewai-tools`). |
| **enterprise-mcp-server** | 2-tool MCP wrapper (kickoff_crew, get_crew_status) that requires a deployed platform endpoint to function. Useless without the hosted platform. |
| **template_\*** repos | Scaffolding templates for specific use cases: deep research, job fit assessment, conversational flows, PR review, support tickets. These are the templates `crewai create` pulls from. |
| **marketplace-crew-template / marketplace-flow-template** | Skeleton repos for publishing to their marketplace. |
| **course-generator** | Production example of Flow + Crew hybrid pattern. |

### What does NOT exist (proprietary, behind app.crewai.com)

1. **Build system** — Clones user git repos, resolves dependencies, builds container images
2. **Execution runtime** — Serverless container infrastructure that runs crews in isolation, handles scaling, restarts, resource limits
3. **Job queue** — Async execution: kickoff → queue → worker picks up → status polling or webhook callback
4. **API gateway** — Routes `/kickoff`, `/status/{id}`, webhook delivery, trigger ingestion
5. **Crew Studio** — Visual drag-and-drop editor for defining agents, tasks, and flows without code
6. **Traces viewer** — Real-time execution tracing: agent decisions, tool calls, LLM interactions (their LangSmith equivalent)
7. **Trigger system** — Server-side orchestration that receives Slack messages, emails, scheduled events, and routes them to crew executions
8. **OAuth server** — WorkOS/Auth0/Okta integration server-side (the client code is open-source, the server is not)
9. **Multi-tenant isolation** — Org-scoped data, RBAC, seat management
10. **Billing/metering** — Usage tracking, execution limits, overage billing
11. **Agent/tool marketplace** — Registry for sharing and discovering pre-built components
12. **The entire web frontend** — React app at app.crewai.com with dashboards, deployment management, log viewers, team settings

### What their hosted platform offers (pricing context)

- **Free tier**: 50 executions/month, 1 seat, visual editor, basic tools
- **Professional ($25/mo)**: 100 executions, 2 seats, community support
- **Enterprise (custom)**: 30K executions, unlimited seats, self-hosted option, SOC2, SSO, PII masking, dedicated VPC, forward-deployed engineers

### State persistence in the open-source

Their persistence is minimal:

- `FlowPersistence` abstract base class with `save_state(flow_uuid, method_name, state_data)` and `load_state(flow_uuid)`
- Only shipped implementation: `SQLiteFlowPersistence` — writes to a local `flow_states.db` file
- State is keyed by `flow_uuid` (a UUID on the Flow's Pydantic state model)
- Append-only: every `@persist`-decorated method completion inserts a new row with `json.dumps(state.model_dump())`
- Also supports `pending_feedback` table for human-in-the-loop pausing
- **This is local-only.** Container restart = state gone. No multi-user. No remote storage.

Their platform presumably swaps this for a Postgres-backed implementation, but that code is not shipped.

---

## 3. What Their Platform Likely Utilizes

Based on the open-source client code (API calls, auth flows, deploy commands), their hosted infrastructure likely consists of:

| Component | Likely implementation | Evidence |
|-----------|----------------------|----------|
| **Container orchestration** | Kubernetes or Cloud Run (GCP) | `crewai deploy` sends git URL, platform builds & runs. "Serverless container infrastructure" in marketing. |
| **Job queue** | Redis + Celery or Cloud Tasks | Kickoff returns immediately with ID, status polled separately. Classic async job pattern. |
| **Database** | PostgreSQL | State persistence, org data, user management. Too relational for anything else. |
| **Object storage** | GCS/S3 | Crew artifacts, logs, file outputs. |
| **Auth** | WorkOS (primary) | Client code imports WorkOS SDK, supports OIDC/OAuth2 with multiple IdP backends. |
| **API gateway** | FastAPI or similar | REST endpoints follow Python conventions, OpenAPI-style routing. |
| **Telemetry** | OpenTelemetry → custom backend | Ships spans to `telemetry.crewai.com:4319`. |
| **Event streaming** | SSE (Server-Sent Events) | A2A protocol supports SSE streaming transport. |
| **CI/CD** | GitHub Actions → container registry | Deploy flow reads git remote URL, platform clones and builds. |

---

## 4. What We Need to Build

### 4.1 The Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React (existing BD2 web app) | New pages benchmarked against crewai.com UI: crew builder, execution dashboard, traces viewer, team management |
| **API** | FastAPI (existing `services/pipeline-worker`, needs major expansion) | Python backend is now critical — crewAI, Docling, Kestra orchestration, and future Python tooling all require it |
| **Relational DB** | Supabase (PostgreSQL) | User data, org data, crew definitions, execution records, state persistence, RBAC |
| **Document/Graph DB** | ArangoDB (if needed) | Agent memory graphs, entity relationships, knowledge bases — evaluate whether Postgres + pgvector is sufficient first |
| **Job queue** | Celery + Redis, or Supabase-native (pg_cron + edge functions) | Async crew execution, status tracking, webhook delivery |
| **State persistence** | Custom `SupabaseFlowPersistence` implementing crewAI's `FlowPersistence` ABC | ~50 lines: `save_state` → Supabase insert, `load_state` → Supabase query |
| **File storage** | Supabase Storage (existing) | Crew artifacts, uploaded documents, tool outputs |
| **Auth** | Supabase Auth (existing) | Already wired into the frontend. Add org/team scoping. |
| **Containerization** | Docker | Isolate crew executions per user/org. Not strictly required for MVP — can run in-process initially. |

### 4.2 Frontend Pages (benchmarked against crewai.com)

These are the platform UI pages that crewAI provides behind their paywall. We build equivalents in BD2's React app:

1. **Crew Builder** — Define agents (role, goal, backstory, tools, LLM), define tasks (description, expected output, agent assignment), wire them into a crew with process type (sequential/hierarchical). crewAI's version is a visual drag-and-drop editor ("Crew Studio"). Ours can start as form-based and evolve.

2. **Flow Editor** — Define multi-step flows with state management. Flows chain crews together with conditional routing, parallel execution, and state passing. This is the orchestration layer above individual crews.

3. **Execution Dashboard** — List of all crew/flow runs. Status (pending, running, success, failed), start time, duration, inputs, outputs. Filterable by user, org, crew, date range. Real-time status updates via Supabase realtime subscriptions.

4. **Traces Viewer** — Detailed execution trace for a single run: which agent ran, what tools it called, what LLM prompts were sent, what responses came back, decision points, handoffs. This is their "observability" product.

5. **Triggers Management** — Configure what kicks off a crew: API call, webhook, scheduled (cron), email received, Slack message, file upload. Server-side trigger routing.

6. **Tool Registry** — Browse, configure, and assign tools to agents. Pre-built tools (web search, file read, API call) + custom tool definitions.

7. **Team/Org Settings** — Multi-user: invite members, assign roles (admin, editor, viewer), org-scoped data isolation.

8. **Deployment Management** — For crews that run as persistent services: deploy, redeploy, rollback, view logs, configure environment variables.

### 4.3 Python Backend (FastAPI — the critical expansion)

The `services/pipeline-worker` exists but is scoped to document parsing. The Python backend must now serve:

- **crewAI integration** — Import and execute crews/flows, manage agent definitions
- **Docling** — Document parsing (already partially built)
- **Kestra orchestration** — Workflow triggers and status (existing patterns)
- **State persistence** — `SupabaseFlowPersistence` implementation
- **Job management** — Queue crew executions, track status, deliver webhooks
- **Tool execution** — Sandbox for running agent tools safely
- **Memory management** — Long-term memory storage/retrieval (embeddings → pgvector or ArangoDB)

This is no longer a helper service. It's the platform's core backend.

### 4.4 Job Queue Architecture

For multi-user async execution:

```
User clicks "Run Crew" in UI
  → Frontend POST /api/crews/{id}/kickoff with inputs
    → FastAPI validates, creates execution record in Supabase (status: PENDING)
      → Pushes job to queue (Celery/Redis or Supabase pg_notify)
        → Worker picks up job
          → Worker imports crew definition, calls crew.kickoff(inputs)
            → During execution: status updates written to Supabase (RUNNING, progress events)
              → On completion: final result written (SUCCESS/FAILED)
                → Webhook delivered if configured
                  → Frontend picks up status via Supabase realtime subscription
```

### 4.5 Multi-Tenancy Model

Every table that stores user-created data needs:

- `org_id` column (foreign key to organizations)
- RLS policies scoped to org membership
- API endpoints that enforce org context from auth token

Tables affected: crew definitions, agent definitions, task definitions, execution records, flow states, tool configurations, trigger configurations, memory stores.

### 4.6 Key Decision Points

1. **ArangoDB vs pgvector** — Do agent memory/knowledge graphs need a dedicated graph DB, or can Postgres with pgvector and JSONB handle it? Start with Postgres, evaluate ArangoDB when graph traversal queries become a bottleneck.

2. **In-process vs containerized execution** — MVP can run crews in the FastAPI process. Production needs Docker isolation per execution to prevent one user's crew from affecting others. The migration path is: in-process → subprocess → Docker container → Kubernetes pod.

3. **Celery vs Supabase-native queue** — Celery + Redis is battle-tested for Python job queues. Supabase pg_notify + edge functions keeps the stack simpler but may not handle high concurrency. Start with Celery.

4. **Crew definition storage** — crewAI uses YAML files + Python classes. For a multi-user platform, crew definitions need to live in the database (JSON/JSONB), not on the filesystem. The platform must serialize crew configs to DB and deserialize them back to crewAI objects at execution time.

---

## 5. Migration Path

### Phase 1: Foundation
- Implement `SupabaseFlowPersistence`
- Expand FastAPI backend with crew execution endpoints
- Add crew/agent/task definition tables to Supabase
- Basic crew builder page in React (form-based, not visual)
- Synchronous execution (run crew, wait, return result)

### Phase 2: Async + Multi-User
- Add job queue (Celery + Redis)
- Execution dashboard with real-time status
- Multi-tenant RLS policies
- Team/org management page
- Webhook delivery on completion

### Phase 3: Observability
- Traces viewer (hook into crewAI's event bus — 60+ event types)
- Execution history with filtering
- Agent decision replay

### Phase 4: Advanced
- Trigger system (cron, webhook, email, Slack)
- Visual flow editor
- Tool marketplace
- Containerized execution isolation
- Memory/knowledge graph (evaluate ArangoDB)

---

## 6. What We Can Reuse From crewAI OSS

| Component | Reuse level | Notes |
|-----------|-------------|-------|
| Core framework (agents, tasks, crews, flows) | 100% | This is the engine. Import and use directly. |
| CLI scaffolding templates | Reference only | Useful for understanding patterns, but our crews are defined in DB, not files. |
| `FlowPersistence` ABC | Extend | Implement `SupabaseFlowPersistence` against their interface. |
| Event bus | Hook into | Subscribe to execution events for traces/monitoring. |
| Tool system | 100% | All built-in tools work. Custom tools plug in via their interface. |
| A2A protocol | Future | Agent-to-agent communication for distributed crews. Not needed for MVP. |
| Memory system | Partial | Their memory interfaces work, but storage backends need to be swapped for multi-user (Supabase/pgvector instead of local ChromaDB). |
| Auth client code | Ignore | We use Supabase Auth, not their WorkOS flow. |
| Deploy CLI | Ignore | We're building our own deployment infrastructure. |
| Telemetry | Optional | Can route their OpenTelemetry spans to our own collector. |

# BlockData AI Platform: Building the CrewAI Infrastructure We Need

## 1. Introduction

BlockData is a multi-user document processing and AI orchestration platform. It already has a React frontend, Supabase backend (Postgres + Auth + Edge Functions + Storage), FastAPI microservices for document conversion, a Kestra workflow adapter, and the beginnings of an agent system. We need to integrate CrewAI as the agent execution engine — but CrewAI's hosted platform (app.crewai.com) is proprietary. None of the frontend, deployment runtime, trace viewer, or managed infrastructure is open-source. We have to build the equivalent ourselves, on our own stack, for multiple users — not a single-developer playground.

This document defines the problem, what CrewAI actually gives us in their open-source repos, what their hosted platform likely runs on the backend, what we already have that maps to their platform's needs, and what we need to build to close the gap.

---

## 2. The Problem

### What CrewAI open-source provides

The `crewai` Python package is a complete agent orchestration framework: agents with roles/goals/backstories, tasks with expected outputs, crews that run tasks sequentially or hierarchically, flows that chain crews with state machines, memory with vector storage, RAG, 75+ built-in tools, and a CLI for scaffolding and local execution.

**What it does not provide** is anything to run this in production for multiple users:

- No web UI for defining agents, tasks, or crews
- No multi-user job queue or execution runtime
- No hosted API layer (the `POST /kickoff` + `GET /{id}/status` endpoints exist only on their proprietary platform)
- No trace viewer for debugging agent runs
- No dashboard for monitoring usage across users
- No team/org management beyond what their CLI stores locally
- No managed persistence (local SQLite only)

The CLI's `crewai deploy` command packages your code and sends it to their proprietary platform at app.crewai.com. Without paying for their hosted service, you get a Python library that runs locally and nothing else.

### What CrewAI's hosted platform includes (proprietary, not in repos)

Based on the open-source CLI code, API client endpoints, the official enterprise OpenAPI spec (`docs/enterprise-api.en.yaml`), telemetry contracts, and the platform screenshots we captured:

1. **Build system** — clones your Git repo, containerizes it, deploys to managed infrastructure
2. **Execution runtime** — runs crew processes, scales, restarts on failure
3. **REST API per deployed crew:**
   - `GET /inputs` — discover required inputs
   - `POST /kickoff` — start execution (with optional `taskWebhookUrl`, `stepWebhookUrl`, `crewWebhookUrl` for real-time callbacks, plus `meta` for passthrough metadata)
   - `GET /{kickoff_id}/status` — poll for status (`running` with progress, `completed` with per-task results, or `error`)
   - `POST /resume` — resume paused executions with human feedback (HITL)
4. **Crew Studio** — visual drag-and-drop builder for agents, tasks, crews
5. **Traces viewer** — full execution trace UI showing every LLM call, tool invocation, agent decision, token usage
6. **OAuth connector marketplace** — pre-wired integrations to 20+ SaaS apps (GitHub, Slack, Google suite, Jira, HubSpot, etc.) with OAuth flows managed by the platform
7. **Billing/usage metering** — per-execution tracking, org-level usage dashboards
8. **Agent Repository** — centralized agent definitions, versioned and shared across an org
9. **Web frontend** — the entire React application at app.crewai.com
10. **LLM connection management** — register API keys for multiple providers, platform handles routing
11. **Environment variable vault** — encrypted secrets management for deployed crews
12. **Organization management** — multi-tenant with roles, members, org-scoped tokens

---

## 3. What the CrewAI Repos Actually Contain

### Core framework (`crewAIInc/crewAI` — cloned to `E:\crewAI\`)

A monorepo with three packages:

- **`crewai`** (the framework) — agents, crews, flows, tasks, memory, RAG, knowledge, events, A2A protocol, MCP support, CLI
- **`crewai-tools`** — 75+ built-in tools (search, scraping, databases, file ops, AI generation, cloud services)
- **`crewai-files`** — multimodal file handling (images, PDFs, audio, video)
- **`docs/`** — comprehensive documentation in English, Korean, Portuguese-BR
- **`docs/enterprise-api.en.yaml`** — the OpenAPI 3.0 spec for the deployed crew API (the contract we need to implement)

Key internal architecture:
- **ReAct reasoning loop** or native function calling — the agent decision engine
- **Event bus** — 123 event types, singleton pub/sub with thread pool execution
- **Telemetry** — OpenTelemetry spans to `telemetry.crewai.com` (opt-in detail sharing)
- **Flow persistence** — abstract `FlowPersistence` base class with `save_state()` / `load_state()` / `save_pending_feedback()` / `load_pending_feedback()` / `clear_pending_feedback()` (reference implementation is SQLite; we implement against Supabase)
- **Memory storage** — abstract `StorageBackend` protocol with hierarchical scoping (`/org/crew/agent`), vector search, metadata filtering
- **A2A protocol** — gRPC, HTTP+JSON, JSONRPC transports with OAuth2/OIDC/JWS auth for inter-agent communication
- **CLI** — Click-based, handles OAuth2 device code flow, Fernet-encrypted token storage, git-based deployment, tool publishing, org management

### Other repos (28 total, cloned to `E:\crewAI-repos\`)

**Substantial:**
- `crewAI-tools` (archived) — 97 tool implementations before consolidation into monorepo
- `crewAI-examples` — 14 crew projects + 6 flow projects + 3 integration demos
- `crewai-enterprise-trigger-examples` — 7 webhook trigger patterns (Gmail, Calendar, Drive, HubSpot, Teams, Outlook, Salesforce)
- `course-generator` — production Flow+Crew hybrid pattern

**Templates (small but useful patterns):**
- `template_deep_research` — conversational research with Firecrawl
- `template_conversational_example` — chatbot with Streamlit/Flask/Slack frontends + webhook/SSE patterns
- `template_frontend_crewai_flows_streamlit_ui` — Streamlit UI for flows
- `template_job_fit_assessment` — resume analyzer with progress webhooks
- `template_support_ticket_front` — support ticket automation
- `template_pull_request_review` — GitHub PR code review

**Infrastructure reference:**
- `enterprise-mcp-server` — 2-tool FastMCP wrapper (kickoff + get_status) for Claude Desktop integration

**Educational/minimal:**
- `crewAI-quickstarts` — 5 Jupyter notebooks
- `crewai_training_step_by_step`, `nvidia-demo`, `llamacon-hackthon` — tutorials
- `awesome-crewai`, `companies-powered-by-crewai` — curated lists (README only)
- `marketplace-crew-template`, `marketplace-flow-template` — bare boilerplate
- Various demo/hackathon repos with minimal code

### Repos not locally cloned but available on GitHub

The `crewAIInc` GitHub org may add repos over time. The 29 repos cloned represent the full public catalog as of 2026-03-10. No private repos are accessible. The CrewAI documentation site (docs.crewai.com) is generated from the `docs/` directory in the main repo — there is no separate docs repo.

---

## 4. What CrewAI's Hosted Platform Likely Uses

Inferred from the API contracts, CLI code, telemetry, and enterprise OpenAPI spec:

### Database
- **PostgreSQL** (near certain) — the API is structured around CRUD operations on crews, deployments, traces, organizations. Supabase-style or managed Postgres.
- **pgvector or dedicated vector DB** — for distributed memory storage (the local implementation uses LanceDB; platform needs something scalable)
- **Possible Redis/queue** — for job dispatch (the kickoff→poll pattern implies async processing)

### Compute
- **Containerized execution** — the deploy flow sends a Git repo URL; the platform clones and runs it. Likely Docker containers on Kubernetes or similar.
- **Per-crew isolated processes** — each deployed crew gets its own URL subdomain (`your-crew-name.crewai.com`)

### Authentication
- **WorkOS** — their OAuth2 provider for login.crewai.com (client ID: `client_01JYT06R59SP0NXYGD994NFXXX`)
- **JWT-based sessions** — validated against JWKS, org-scoped via `X-Crewai-Organization-Id` header
- **Bearer tokens** — two tiers: org-level (full access) and user-level (limited permissions)

### Observability
- **OpenTelemetry** — spans collected via OTLP at `telemetry.crewai.com:4319`
- **Trace batch protocol** — events buffered client-side, sent in batches with execution metadata
- **Two channels** — persistent traces (audit trail) and ephemeral traces (shareable debugging with access codes)

### API architecture
- **Per-crew REST API** — each deployed crew exposes `GET /inputs`, `POST /kickoff`, `GET /{id}/status`, `POST /resume`
- **Platform management API** — `/crewai_plus/api/v1/` prefix for crew CRUD, deployment, tracing, tools, integrations, org management

---

## 5. What We Already Have

| Platform need | BlockData equivalent | Status |
|---|---|---|
| **Database** | Supabase (PostgreSQL) with 76+ migrations, RLS, service registry | Active, production |
| **Auth** | Supabase Auth (email/password + OAuth), JWT sessions, RLS policies, user API keys | Active |
| **Web UI** | React 19 + Vite + Ark UI + Tailwind 4. Pages for workbench, admin panels, settings, document management, flows, agents | Active, Ark UI migration in progress |
| **File storage** | Supabase Storage — upload pipeline with signed URLs, SHA256 dedup | Active |
| **API layer** | 21 Supabase Edge Functions (TypeScript/Deno) + 2 FastAPI services (Python) | Active |
| **Job status tracking** | `source_documents.status` column pattern (uploaded → converting → ingested → failed), `flow_executions.state` | Active |
| **Document pipeline** | Full ELT: upload → trigger conversion → FastAPI service processes → callback updates status → blocks ingested | Active |
| **Workflow orchestration** | Kestra adapter layer with `flow_sources`, `flow_executions`, `flow_logs` tables + pipeline worker with plugin registry | In progress |
| **Graph database** | ArangoDB planned as projection layer for document relationships, citations, metadata | Planned |
| **Python backend** | FastAPI conversion service (port 8000) + pipeline worker (port 8000) — both with plugin architectures | Active but narrow scope |

### The pattern match

The ELT document pipeline we already built follows the exact same pattern CrewAI's platform uses:

```
CrewAI platform:              BlockData ELT pipeline:
POST /kickoff                 POST /ingest (or /trigger-parse)
  → returns kickoff_id          → returns source_uid
GET /{id}/status              source_documents.status column
  → running/completed/error     → uploaded/converting/ingested/failed
Webhook callbacks             conversion-complete Edge Function callback
  → notify on completion        → processes results, updates status
```

The infrastructure is the same. The gap is wiring CrewAI's Python framework into it.

---

## 6. What We Need to Build

Everything below must be built for **multi-user, multi-tenant** operation from day one. Not a single-user playground.

### 6.1 Python Backend (FastAPI) — Extensive Build-Out

The current FastAPI services handle document conversion and Kestra plugin execution. We need a **central Python API service** that becomes the execution backbone for:

- **CrewAI agent execution** — import crewai, instantiate crews from database-stored definitions, run them
- **Kestra workflow dispatch** — already partially built, needs full integration
- **Docling document processing** — already built, continues as-is
- **Future Python-dependent services** — any tool, library, or framework that requires Python (and there will be many)

**Endpoints to implement (matching CrewAI's enterprise API spec):**

```
GET    /api/v1/crews/{crew_id}/inputs        — discover required inputs
POST   /api/v1/crews/{crew_id}/kickoff       — start execution
GET    /api/v1/crews/{crew_id}/{kickoff_id}/status  — poll status
POST   /api/v1/crews/{crew_id}/resume        — resume with human feedback
```

Plus internal endpoints:
```
POST   /api/v1/crews                         — CRUD for crew definitions
GET    /api/v1/agents                        — agent registry
POST   /api/v1/traces/batches               — trace ingestion
GET    /api/v1/traces/{batch_id}/events     — trace retrieval
```

**Auth:** Validate Supabase JWT tokens on every request. Extract user_id and org context. Enforce RLS-equivalent permissions in Python.

### 6.2 SupabaseFlowPersistence Class

CrewAI provides an abstract `FlowPersistence` base class (`crewai.flow.persistence.base.FlowPersistence`) with these methods:

```python
init_db()                                    — create tables/indexes
save_state(flow_uuid, method_name, state)    — persist after method completion
load_state(flow_uuid)                        — load most recent state
save_pending_feedback(flow_uuid, context, state)  — save HITL pause state
load_pending_feedback(flow_uuid)             — load paused state + feedback context
clear_pending_feedback(flow_uuid)            — clear after resume
```

The reference implementation is SQLite. We implement against Supabase Postgres. Estimated ~80-120 lines including the feedback methods.

**Database table:**

```sql
create table crew_flow_states (
  id            uuid primary key default gen_random_uuid(),
  flow_uuid     text not null,
  method_name   text not null,
  state_json    jsonb not null,
  pending_feedback_json jsonb,
  user_id       uuid references auth.users(id),
  created_at    timestamptz default now()
);

create index idx_flow_states_uuid on crew_flow_states(flow_uuid, created_at desc);
alter table crew_flow_states enable row level security;
```

### 6.3 Crew Management Database Schema

```sql
-- Agent definitions (reusable across crews)
create table crew_agents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) not null,
  name        text not null,
  role        text not null,
  goal        text not null,
  backstory   text,
  llm_model   text,
  tools       jsonb default '[]',
  config      jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Crew definitions (agent + task compositions)
create table crew_definitions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) not null,
  name        text not null,
  description text,
  process     text default 'sequential',  -- sequential | hierarchical
  agents      jsonb not null,              -- ordered agent refs + task assignments
  tasks       jsonb not null,              -- task definitions with expected outputs
  config      jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Execution records (the job queue)
create table crew_executions (
  id              uuid primary key default gen_random_uuid(),
  crew_id         uuid references crew_definitions(id) not null,
  user_id         uuid references auth.users(id) not null,
  kickoff_id      uuid unique default gen_random_uuid(),
  status          text not null default 'queued',
    -- queued → running → completed | failed | paused_for_feedback
  inputs          jsonb,
  result          jsonb,
  error           text,
  meta            jsonb default '{}',
  webhook_config  jsonb,
  progress        jsonb,              -- {completed_tasks, total_tasks, current_task}
  execution_time  numeric,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz default now()
);

-- Per-task results within an execution
create table crew_task_results (
  id              uuid primary key default gen_random_uuid(),
  execution_id    uuid references crew_executions(id) not null,
  task_id         text not null,
  agent_name      text,
  output          text,
  execution_time  numeric,
  created_at      timestamptz default now()
);

-- Trace events for observability
create table crew_trace_events (
  id              uuid primary key default gen_random_uuid(),
  execution_id    uuid references crew_executions(id) not null,
  event_type      text not null,
  event_data      jsonb not null,
  parent_event_id uuid,
  sequence        integer,
  created_at      timestamptz default now()
);
```

RLS on all tables. Users see only their own data. Admin/superuser roles see everything.

### 6.4 Job Queue — Python Worker

The simplest viable approach using the pattern we already have:

1. `crew_executions` table with `status = 'queued'` is the queue
2. A Python worker process polls for queued jobs (or uses Postgres `LISTEN/NOTIFY` for real-time)
3. Worker claims a job (`UPDATE ... SET status = 'running' WHERE status = 'queued' ... LIMIT 1` with row locking)
4. Worker imports crewai, builds the crew from `crew_definitions` + `crew_agents`, calls `crew.kickoff(inputs)`
5. Worker captures events via CrewAI's event bus, writes trace events to `crew_trace_events`
6. On completion: updates `crew_executions.status`, `result`, `execution_time`
7. On failure: updates `status = 'failed'`, stores error
8. If webhook_config exists: sends HTTP callback

**Scaling path:** Start with a single worker process. Scale to multiple workers with row-level locking. Later: Redis + Celery if volume demands it. Or Kestra as the job orchestrator (it's already being integrated).

### 6.5 Frontend Pages

Benchmarked against app.crewai.com (screenshots in `docs/screenshots/`):

**Must build:**

1. **Agent Builder** — form to define agents (role, goal, backstory, model selection, tool selection). CRUD list view. Maps to `crew_agents` table.

2. **Crew Builder** — compose a crew from agents + define tasks. Set process type (sequential/hierarchical). Define expected outputs. Maps to `crew_definitions` table.

3. **Crew Runner** — select a crew, provide inputs, kick off execution. Real-time status via polling or SSE. Display results with per-task breakdown. Maps to `crew_executions` and the FastAPI kickoff endpoint.

4. **Execution History** — list of past runs with status, duration, results. Filter by crew, date, status. Maps to `crew_executions`.

5. **Trace Viewer** — drill into an execution to see the event stream: LLM calls, tool invocations, agent decisions, token counts. Maps to `crew_trace_events`. This is the equivalent of CrewAI's Traces page / LangSmith.

6. **LLM Connections** — manage API keys for providers (Anthropic, OpenAI, Gemini, etc.). Store encrypted in Supabase. Inject into crew execution environment. Maps to what we saw in screenshot 1.

7. **Environment Variables** — per-crew or global secrets vault. Encrypted storage. Maps to screenshot 2.

**Can defer:**

- Crew Studio (visual drag-and-drop builder) — start with form-based, upgrade later
- OAuth connector marketplace — add integrations one at a time as needed
- Tool marketplace — use crewai's built-in tools first, custom tools later

### 6.6 ArangoDB (If Needed)

ArangoDB is already planned as a graph projection layer. For the CrewAI integration, it becomes relevant for:

- **Agent knowledge graphs** — entity relationships extracted during crew execution
- **Cross-execution memory** — graph-based memory linking related conversations, outputs, entities across runs
- **Tool result caching** — deduplicating expensive tool calls (web searches, API calls) across users

This is not required for the initial build. Start with Postgres + pgvector. Add ArangoDB when the graph relationships become valuable.

---

## 7. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite + Ark UI)              │
│  Agent Builder | Crew Builder | Runner | History | Traces       │
│  + existing: Workbench, Documents, Admin, Settings, Flows      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│              Supabase Edge Functions (TypeScript/Deno)           │
│  Existing 21 functions + new crew-management proxy endpoints    │
│  Auth validation, request routing, lightweight CRUD             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│              FastAPI Python Backend (Central Service)            │
│  /api/v1/crews/* — kickoff, status, resume                     │
│  /api/v1/agents/* — agent registry                             │
│  /api/v1/traces/* — trace ingestion + retrieval                │
│  + existing: /convert (docling), /plugins (kestra worker)      │
│                                                                 │
│  CrewAI Python SDK imported here                               │
│  SupabaseFlowPersistence class lives here                      │
│  Event bus listeners for trace capture live here               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────────┐
│  Supabase        │ │  LLM     │ │  External Tools  │
│  PostgreSQL      │ │  APIs    │ │  (search, scrape, │
│  + Storage       │ │  (keys   │ │   databases, etc) │
│  + Auth          │ │  from    │ │                    │
│                  │ │  vault)  │ │                    │
└──────────────────┘ └──────────┘ └──────────────────┘
              │
              ▼ (future)
┌──────────────────┐
│  ArangoDB        │
│  Graph layer     │
└──────────────────┘
```

### Worker process

Runs alongside or within the FastAPI service:

```
Python Worker (background thread or separate process)
  │
  ├─ Poll crew_executions WHERE status = 'queued'
  ├─ Claim job (row lock)
  ├─ Build Crew from crew_definitions + crew_agents
  ├─ Inject LLM keys from vault
  ├─ crew.kickoff(inputs) with SupabaseFlowPersistence
  ├─ Event bus → crew_trace_events (real-time)
  ├─ Update crew_executions on completion/failure
  └─ Fire webhook callbacks if configured
```

---

## 8. Multi-User Considerations

This is not optional. Every design decision must account for:

- **Row-level security** on all crew/agent/execution tables. Users cannot see or execute other users' crews.
- **Org/workspace scoping** — future multi-tenant support. The schema should include `workspace_id` or similar from the start.
- **Resource limits** — per-user execution quotas, concurrent run limits, token budgets.
- **Isolated execution** — one user's crew failure must not affect another's. Worker process isolation.
- **Audit trail** — every execution, every LLM call, every tool invocation logged with user_id.
- **Secret isolation** — LLM API keys and environment variables are per-user, never shared, never leaked to other users' executions.
- **Admin visibility** — superuser/admin role can see all executions, manage resources, view system-wide traces.

---

## 9. Implementation Sequence

1. **Database schema** — migrations for crew_agents, crew_definitions, crew_executions, crew_flow_states, crew_task_results, crew_trace_events
2. **SupabaseFlowPersistence** — implement the abstract base class against Postgres
3. **FastAPI crew endpoints** — kickoff, status, resume (matching CrewAI enterprise API spec)
4. **Worker process** — poll-based job execution with crewai SDK
5. **Event capture** — hook into CrewAI's event bus to write trace events
6. **Frontend: Agent Builder** — CRUD for agent definitions
7. **Frontend: Crew Builder** — compose agents + tasks into crews
8. **Frontend: Crew Runner** — kickoff + status polling + result display
9. **Frontend: Execution History** — list view with filters
10. **Frontend: Trace Viewer** — event stream drill-down
11. **LLM key vault** — encrypted storage + injection into crew execution
12. **Webhook callbacks** — fire on execution completion/failure
13. **Kestra integration** — use Kestra as an alternative job orchestrator for crew execution

---

## 10. Key Files to Reference

### CrewAI framework (what we import and use)
- `E:\crewAI\lib\crewai\src\crewai\flow\persistence\base.py` — the abstract base class we implement
- `E:\crewAI\lib\crewai\src\crewai\flow\persistence\sqlite.py` — reference SQLite implementation
- `E:\crewAI\docs\enterprise-api.en.yaml` — the API spec we replicate
- `E:\crewAI\lib\crewai\src\crewai\crew.py` — Crew class, `kickoff()` method
- `E:\crewAI\lib\crewai\src\crewai\agent\core.py` — Agent class
- `E:\crewAI\lib\crewai\src\crewai\task.py` — Task class
- `E:\crewAI\lib\crewai\src\crewai\events\event_bus.py` — event system we hook into for traces
- `E:\crewAI\lib\crewai\src\crewai\memory\storage\backend.py` — memory storage protocol (future: implement against Supabase + pgvector)

### BlockData platform (what we build on)
- `E:\writing-system\web\src\router.tsx` — frontend routing (add new pages here)
- `E:\writing-system\supabase\config.toml` — Supabase project config
- `E:\writing-system\supabase\migrations\` — 76+ existing migrations (add new ones here)
- `E:\writing-system\services\conversion-service\` — reference FastAPI service pattern
- `E:\writing-system\services\pipeline-worker\` — reference plugin worker pattern
- `E:\writing-system\supabase\functions\_shared\` — shared Edge Function utilities (Supabase client, auth, CORS)

### CrewAI examples (patterns to follow)
- `E:\crewAI-repos\template_conversational_example\` — Streamlit/Flask/Slack frontend patterns + webhook/SSE
- `E:\crewAI-repos\course-generator\` — production Flow+Crew hybrid
- `E:\crewAI-repos\crewai-enterprise-trigger-examples\` — webhook trigger patterns
- `E:\crewAI-repos\enterprise-mcp-server\` — MCP server wrapper (if we want Claude Desktop integration)
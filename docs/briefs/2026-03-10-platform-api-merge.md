# Problem Brief: Unifying Isolated Python Backend Services

**Date:** 2026-03-10
**System:** BlockData (BD2)
**Repo:** https://github.com/prophetto1/blockdata

---

## Problem Statement

BlockData's Python backend consists of two isolated FastAPI services — `pipeline-worker` and `conversion-service` — deployed as separate Cloud Run containers with no shared code, no direct communication, and no unified API surface. As the platform expands to include AI agent orchestration (crewAI), document embeddings, job queuing, and multi-user crew execution, this isolation creates duplication, deployment overhead, and makes it impossible for backend operations to compose (e.g., "after converting a document, immediately generate embeddings" requires an external round-trip through Supabase edge functions instead of a direct in-process call).

## Why It Matters

1. **Every new capability requires a new service or awkward glue.** Adding crew execution, embeddings, or job management as yet another isolated service compounds the problem. Adding them to pipeline-worker means conversion-service can't use them. Adding them to conversion-service means pipeline-worker can't use them.

2. **No shared auth, no shared Supabase client, no shared models.** Both services independently implement their own auth (one uses header secrets, one has a placeholder superuser module that doesn't exist yet). Both connect to Supabase independently. Both define their own request/response models.

3. **Deployment tax.** Two Cloud Run services means two container builds, two deploy scripts, two sets of environment variables, two health checks to monitor. The conversion-service container alone takes significant build time due to Docling model downloads.

4. **The Python backend is about to become critical.** crewAI integration, embedding generation, crew state persistence, job queues, and agent tool execution all require Python. This is no longer two helper services — it's becoming the platform's core backend. It needs to be one coherent system.

## Current State

### Service 1: `pipeline-worker` (`services/pipeline-worker/`)

**Purpose:** Plugin execution engine compatible with Kestra workflow orchestration.

**Architecture:**
- FastAPI app with plugin auto-discovery via `BasePlugin` subclass registry
- Plugins: core flow control (if/switch/foreach), HTTP requests, script execution (Python/Shell/Node), eyecite legal citation tools
- Routes: `POST /{function_name}` (catch-all plugin executor), `GET /health`, `GET /functions`, admin CRUD at `/admin/services/*`
- Shared modules: `ExecutionContext` (template rendering, variables), `PluginOutput` (standardized response), Supabase client, storage helpers

**Key files:**
- `app/main.py` — FastAPI app, plugin execution route, health/functions endpoints
- `app/registry.py` — auto-discovers BasePlugin subclasses at startup
- `app/plugins/{core,http,scripts,eyecite}.py` — plugin implementations
- `app/shared/{base,context,output,runner,storage,auth,supabase_client}.py` — utilities
- `app/routes/admin_services.py` — registry CRUD (imports `superuser.py` which doesn't exist yet)

**Dependencies:** fastapi, uvicorn, pydantic, httpx, supabase, eyecite, lxml

**Dockerfile:** python:3.11-slim + git + curl. Lightweight (~200MB image).

**Auth:** Admin routes import `require_superuser` from a module that hasn't been implemented.

### Service 2: `conversion-service` (`services/conversion-service/`)

**Purpose:** Document conversion using Docling (PDF/DOCX/PPTX), Pandoc (RST/LaTeX/EPUB), and plain text passthrough.

**Architecture:**
- FastAPI app with two endpoints: `POST /convert` and `POST /citations`
- `/convert`: downloads source file, runs through Docling or Pandoc, uploads artifacts (markdown, JSON, HTML, DocTags) to Supabase Storage via signed URLs, POSTs callback to edge function
- `/citations`: extracts legal citations from text using eyecite
- Auth via `X-Conversion-Service-Key` header checked in middleware

**Key files:**
- `app/main.py` — everything in one file (models, helpers, routes, auth middleware)
- `warmup.py` — forces Docling model downloads during Docker build

**Dependencies:** fastapi, uvicorn, pydantic, httpx, docling>=2.70.0, eyecite>=2.7

**Dockerfile:** python:3.11-slim + system libs (libxcb, libx11, libgl1, pandoc) + docling model downloads + RapidOCR asset baking. Heavy (~3GB+ image due to ML models).

**Auth:** Shared secret in `X-Conversion-Service-Key` header, validated in middleware.

### Service 3: `uppy-companion` (`services/uppy-companion/`)

**Purpose:** OAuth proxy for cloud file imports (Google Drive, Dropbox, OneDrive, Box). Node.js/Express. Out of scope for this merge — stays separate.

### How They Connect Today

```
User uploads file
  → Supabase edge function (ingest)
    → HTTP POST to conversion-service /convert
      → conversion-service downloads file, runs Docling/Pandoc
      → uploads artifacts to Supabase Storage (signed URLs)
      → POSTs callback to edge function (conversion-complete)
        → edge function extracts blocks, writes to Supabase tables

Kestra workflow step
  → HTTP POST to pipeline-worker /{function_name}
    → plugin executes, returns result
```

The two services never talk to each other. All coordination goes through Supabase edge functions or Kestra.

### Deployment

Both deploy to Google Cloud Run via PowerShell scripts in `scripts/`. Each has its own:
- Service account
- Artifact Registry repo
- Secret Manager secret (conversion-service only)
- Cloud Run configuration (CPU, memory, concurrency, timeout)

Conversion-service runs with 2 CPU, 4Gi memory, concurrency=1, timeout=1800s (30 min) due to Docling's resource requirements.

## Context & Constraints

### Tech Stack
- **Frontend:** React + TypeScript (Vite)
- **Database:** Supabase (PostgreSQL) with RLS, Edge Functions (Deno/TypeScript), Storage, Realtime
- **Orchestration:** Kestra (workflow engine, calls pipeline-worker)
- **Document AI:** Docling (Python, ML models for PDF/DOCX parsing)
- **Target integration:** crewAI (Python agent framework), Celery+Redis (job queue), pgvector (embeddings)

### Constraints
1. **Docling models are ~2GB.** The merged container will be large. This is unavoidable if we want in-process document conversion.
2. **Concurrency for Docling.** CPU-bound ML inference means conversion requests should not share resources with lightweight API calls. May need Cloud Run concurrency configuration or internal queuing.
3. **The `/{function_name}` catch-all route** in pipeline-worker will swallow any new routes (`/convert`, `/crews`, `/embeddings`) if mounted first. Route ordering is critical.
4. **Existing edge functions** reference `CONVERSION_SERVICE_URL` and `CONVERSION_SERVICE_KEY`. These must continue to work during and after migration.
5. **Kestra** calls pipeline-worker endpoints. The function registry and endpoint contract must not change.
6. **The `superuser.py` module** is imported by admin_services.py but doesn't exist. This is a known gap that needs to be filled as part of this work or flagged as a prerequisite.

### Decisions Already Made
- The merged service will be called `platform-api`
- All routes merge into one FastAPI app
- Conversion-service's heavier Dockerfile becomes the base
- Pipeline-worker's plugin registry pattern is preserved
- `uppy-companion` (Node.js) stays separate

## Investigation Scope

### In Scope
1. **Propose a directory structure** for `services/platform-api/` that cleanly organizes existing code and accommodates future additions (crew routes, embedding routes, execution routes, workers)
2. **Solve the route collision problem** — `/{function_name}` catch-all vs explicit routes like `/convert`, `/health`, `/crews/*`
3. **Propose a unified auth strategy** — replace both the shared-secret middleware and the missing superuser module with one auth system that works for: edge function → service calls (machine-to-machine), Kestra → service calls, and future user-facing API calls (JWT from Supabase Auth)
4. **Address the concurrency concern** — Docling conversion is CPU-bound and slow (10-60 seconds). Lightweight routes (health, plugin list, crew CRUD) should not be blocked. Propose how to handle this in a single service.
5. **Identify migration steps** — how to cut over from two services to one without downtime (edge functions, Kestra, deploy scripts)
6. **Propose where future modules plug in** — crew execution, embeddings, job queue, state persistence. Don't implement them, but show where they go in the structure.

### Out of Scope
- Implementing crewAI integration, embeddings, or job queues (separate briefs)
- Modifying Supabase edge functions (they just need URL/key updates)
- Modifying Kestra workflows (they just need URL updates)
- The uppy-companion service
- Frontend changes

## Expected Output

1. **Proposed directory structure** with file-level detail and rationale
2. **Route mounting strategy** with explicit ordering and conflict resolution
3. **Auth strategy** covering machine-to-machine and user-facing scenarios
4. **Concurrency/resource handling** recommendation
5. **Migration checklist** — ordered steps to go from two services to one with rollback plan
6. **Extension points** — where crew, embedding, and job queue modules will be added later
7. **Any risks or trade-offs** identified during investigation that weren't covered in this brief

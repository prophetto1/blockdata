# FastAPI Integration — Architectural Direction

> **Status:** Direction document (written early 2026). Partially implemented.
> **Implementation plan:** `docs/plans/2026-03-15-load-activation.md` (registry cleanup, Load end-to-end).
> **Systematic buildout:** `docs/plans/2026-03-15-fastapi-execution-plane-systematic-buildout.md`.
>
> **What already exists:**
> - `services/platform-api/` — operational FastAPI service hosting conversion, plugin execution, and admin endpoints.
> - Document parsing dispatches from edge functions (`trigger-parse`) to platform-api via HTTP — not running in-edge.
> - `service_registry`, `service_functions`, `service_type_catalog` tables exist (migration 050) but are not yet the active runtime source of truth — plugin discovery is still code-based via `app/domain/plugins/registry.py`.
> - `conversion_pool.py` provides an in-process `ProcessPoolExecutor`; no distributed queue yet.
>
> **What remains aspirational:**
> - Distributed worker/queue model (Kestra integration or equivalent).
> - DB-driven function registry replacing code-based plugin discovery.
> - Moving LLM orchestration out of `worker/index.ts` edge function.
>
> **Credential management boundary (updated 2026-03-15):**
> Existing AI provider credentials (Anthropic, OpenAI, Vertex SA) remain on Edge Functions (`provider-connections`, `test-api-key`). New integration credentials (GCS, ArangoDB, future connectors) go through the generic FastAPI route `POST /connections/*` — see `load-activation.md` Part C. The buildout doc's reference to Edge Functions handling "credential storage" applies to the existing providers only; it is NOT extended to new Load-stage integrations.

---

## Problem Statement: Over-Reliance on Edge Compute for Heavy AI Workloads

As the platform evolves to support complex, multi-step AI workflows and massive data processing pipelines, the current architectural reliance on Edge Functions is becoming a bottleneck. Edge Functions are inherently designed for short-lived, lightweight, and I/O-bound operations. They enforce strict execution timeouts, have severe memory limits, and lack native support for heavy Python data science ecosystems (e.g., PyTorch, Docling, Pandas).

Continuing to build the platform by cramming heavy Python task execution into Edge Functions will lead to frequent crashes, timeouts, and an unmanageable, fragile architecture consisting of a "giant pile of one-off endpoints." The system currently lacks a dedicated environment to reliably execute, track, and scale long-running AI operations.

Proposed Solution: Decoupling the Control Plane and Execution Plane
To build a scalable, resilient AI platform, we must formally separate the lightweight web operations (Control Plane) from the heavy computational tasks (Execution Plane). The architecture should transition to a hybrid model utilizing specialized environments for different workloads:

1. The Control Plane (Edge Functions)
Edge Functions will be strictly reserved for their intended purpose: fast, stateless, Supabase-native operations.

Responsibilities: User authentication, saving basic configurations (like the API provider keys in the Settings UI), database connection management, and simple request/response routing.

2. The API Bridge (FastAPI)
Instead of Edge Functions trying to run machine learning models, they will route heavy requests to a continuously hosted FastAPI server.

Responsibilities: Acting as the orchestration layer and plugin surface that natively supports the Python ecosystem. It receives commands from the frontend or edge, validates them, and hands them off to the execution engine.

3. The Execution Engine (Worker & Queue Model)
Long-running, multi-step Python jobs (like RAG document parsing, structural evaluations, or user-defined data transformations) will be moved to an asynchronous worker-backed system.

Responsibilities: Isolated worker nodes will claim jobs from a queue, process them without fear of arbitrary timeouts, handle retries and rate limiting, and write the final artifacts or execution history back to the database.

4. The Function Registry (The Source of Truth)
Instead of building hundreds of custom API endpoints for every new AI feature, backend Python scripts will be cataloged in a central registry.

Responsibilities: The registry will define the parameter schemas, input/output structures, and tool availability. This allows the system (and eventually the end-users) to dynamically chain together registered Python functions into complex workflows without requiring new infrastructure deployments.

Summary Direction: Stop treating Edge Functions as the final destination for AI task execution. Maintain them for lightweight platform routing, but immediately begin routing all heavy Python processing through a FastAPI bridge backed by an asynchronous, worker-driven execution plane and a centralized function registry.
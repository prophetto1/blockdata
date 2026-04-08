# Tool Integration Platforms — Assessment Report

**Date:** 2026-04-07
**Scope:** `docs/study-patterns/05-tool-integration-platforms/` + `I:\tool-registry\` junction
**Target directories assessed against:** `_agchain/`, `docs/plans/`, `jon/Tools/`, `jon/new-skills-needed/`, `jon/new-service/`, `web/`, `web-docs/`, `services/`, `supabase/`
**Status:** Assessment locked. Live demo of ToolRegistry admin dashboard validated. Open questions remain before `investigating-and-writing-plan` can run.

---

## 1. Executive Summary

Seven repositories remain in scope after the user removed three (composio, cicada, thunderbird-mcp) as out of scope. The assessment produced a **"go all-in on the Oaklight/Peng Ding ecosystem"** decision: five coherent Python packages from a single author covering the full vertical of tool registration, execution, LLM format conversion, protocol exposure, and agent CLI driving.

**Locked adoption set:**

| Package | Decision | Role |
|---|---|---|
| **ToolRegistry** | ✅ Full install (Tier 1) | In-process function registry + execution engine |
| **llm-rosetta** | ✅ Full install (Tier 1) | LLM format conversion (transitive dep of ToolRegistry) |
| **toolregistry-server** | ✅ Full install (Tier 1) | Auto-generated HTTP + MCP endpoints from a registry |
| **agentabi** | ✅ Full install (Tier 1b) | Unified driver for Claude Code / Codex / Gemini / OpenCode CLIs |
| **toolregistry-hub** | ◐ Reference only | Read `server/registry.py` as wiring template; do not install |
| **agentregistry** | ◐ Port UI only | Lift ~38 `.tsx` files into `web/src/components/marketplace/`; Go backend stays out |
| **aci (ACI.dev)** | ◐ Study for patterns | Multi-tenant auth, project/agent scoping — extract designs only |

**Removed from scope (per user direction):** composio, cicada, thunderbird-mcp.

**Key architectural insight:** The Oaklight stack is the only investigated ecosystem that coherently covers both the *tool runtime layer* (ToolRegistry + toolregistry-server) and the *agent runtime layer* (agentabi) with shared design conventions — Pydantic + Protocol-based IR + event streaming. One author to track, one license, one language, zero impedance mismatch with `services/platform-api`.

**Validation status:** ToolRegistry's embedded admin dashboard was booted live during assessment. Five sample tools registered, dashboard rendered at `http://127.0.0.1:8765`, screenshot captured. The "what is actually visible vs invisible" question is now resolved with empirical evidence (see §6).

---

## 2. Scope and Method

### 2.1 Investigation surface

The `docs/study-patterns/05-tool-integration-platforms/` directory contains symlinks (Windows junctions) to external repos cloned under `I:\`. Initial inspection found seven symlinks; mid-assessment the user flagged that `I:\tool-registry\` held more repos than were surfaced. After two passes plus user-driven scope cuts, the final in-scope set is:

| Repo | Source path | Symlinked in study-patterns? |
|---|---|---|
| ToolRegistry | `/i/tool-registry/ToolRegistry` | ✅ |
| llm-rosetta | `/i/tool-registry/llm-rosetta` | ✅ |
| toolregistry-server | `/i/tool-registry/toolregistry-server` | ✅ |
| toolregistry-hub | `/i/tool-registry/toolregistry-hub` | ✅ |
| agentabi | `/i/tool-registry/agentabi` | ❌ — needs symlink |
| aci (ACI.dev) | `/i/aci` | ✅ |
| agentregistry | `/i/agentregistry` | ✅ |

### 2.2 Repos removed from scope

| Repo | Removed because |
|---|---|
| composio | SaaS-backend dependency on `backend.composio.dev`; not self-hostable |
| cicada | CAD automation application that consumes `toolregistry`; not a platform itself |
| thunderbird-mcp | Single-app MCP connector example; not a platform |

These were investigated and have detailed findings in earlier sessions, but are not retained here. They do not influence the locked adoption set or the implementation plan.

### 2.3 Writing-system integration surfaces surveyed

The parallel investigation of project target directories identified these candidate integration points:

- **`services/platform-api/app/api/routes/admin_services.py`** — existing service registry CRUD, function management, bulk import endpoint, operating on `service_registry`, `service_functions`, and `service_type_catalog` tables
- **`services/platform-api/app/api/routes/agchain_tools.py`** — existing AGChain tool CRUD, custom tool definitions, tool composition
- **`web/src/components/services/function-reference.tsx`** — function/service reference display UI
- **`web/src/components/agchain/tools/`** — AgchainToolsTable, AgchainToolEditorDialog, AgchainToolInspector
- **`web/src/data/integrations.json`** — empty placeholder
- **`web/src/pages/settings/McpServers`** — existing MCP server settings surface (stub)
- **`web/src/pages/marketplace/IntegrationsCatalog`** — existing marketplace shell (empty catalog)
- **`jon/new-service/`** — planned Skill Prompt Management System, the vehicle for the "Agent Systems Competition" vision
- **`jon/new-skills-needed/`** — 11 existing core skills; missing tool registry, connector management, integration lifecycle flows

---

## 3. Critical Framing — What Is Actually Visible

This section was added late in the assessment after the user observed: *"Most of these services you don't see anyway. Help me frame this."* That observation is correct, and locking it in changes how every other section reads.

### 3.1 The visibility table

**Of the seven in-scope packages, only ONE has user-visible pixels by default.** Everything else is library code that lives inside `services/platform-api` and emits zero UI.

| Layer | What it is | Who sees it? |
|---|---|---|
| **ToolRegistry** | A Python `dict` of functions inside platform-api | Nobody — backend |
| **toolregistry-server** | Auto-generated HTTP endpoints from that dict | API consumers, not end users |
| **toolregistry-hub** | A Python package containing ~15 pre-written sample tools | Nobody — it's just code you could `pip install` |
| **ToolRegistry `admin.html`** | Optional embedded operator dashboard | **Operators only** (you, superusers) |
| **agentabi** | Python library to drive Claude Code / Codex / Gemini CLI | Nobody — backend |
| **llm-rosetta** | Python library to convert LLM API formats | Nobody — backend |
| **AgentRegistry UI components** (ported into `web/`) | React components | **End users** |

### 3.2 The architectural diagram, with visibility annotated

```
                            END USER
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │  web/  (your React frontend)         │  ← ONLY thing users see
            │  - marketplace (ported from agentreg)│
            │  - tool admin dashboard (embedded    │
            │    ToolRegistry admin.html)          │  ← ONLY thing operators see
            └──────────────────┬───────────────────┘
                               │ HTTP
                               ▼
            ┌──────────────────────────────────────┐
            │  services/platform-api/              │  ← INVISIBLE backend
            │                                      │
            │  Inside it lives:                    │
            │  - ToolRegistry (in-memory dict)     │  invisible
            │  - llm-rosetta (format converter)    │  invisible
            │  - toolregistry-server (route gen)   │  invisible
            │  - agentabi (CLI driver)             │  invisible
            └──────────────────┬───────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  PostgreSQL      │  invisible
                    └──────────────────┘
```

### 3.3 The framing in one paragraph

Of the five Oaklight packages, **only one has any pixels: ToolRegistry's `admin.html`**. Everything else is library code that lives inside platform-api and emits zero UI. The user-facing pixels in the final architecture come from exactly two places: the existing `web/` (with new marketplace pages ported from AgentRegistry's UI components) and ToolRegistry's `admin.html` (embedded for operators). Everything else is invisible plumbing.

---

## 4. Differentiation Q&A

This section captures the four clarifying questions the user raised during the assessment, with the locked answers. Each question reframes a piece of the architecture that was easy to misread as redundant or user-facing.

### 4.1 Q1: "We already use FastAPI/OpenAPI. What does toolregistry-server actually add?"

**The differentiation in one sentence:** FastAPI makes you write every endpoint by hand. **toolregistry-server auto-generates 1,000 endpoints from 1,000 registered functions with one line of code.**

**Today, without toolregistry-server:**

```python
# You write this for EVERY function in admin_services.py
@router.post("/admin/services/calculator")
async def calculator_endpoint(request: CalculatorRequest) -> CalculatorResponse:
    result = math_eval(request.expression)
    return CalculatorResponse(result=result)

# ...then the same boilerplate for the next 999 functions
```

**With toolregistry-server (one line, 1,000 endpoints):**

```python
from toolregistry_server import create_openapi_app

app.mount("/tools", create_openapi_app(my_tool_registry))
# That's it. Every registered function in my_tool_registry now has:
#  - POST /tools/{name} endpoint
#  - Auto-generated OpenAPI schema in /tools/openapi.json
#  - Pydantic input validation
#  - Output schema validation
#  - Bearer auth
#  - Error handling
```

**The bigger payoff — same registry, three uses simultaneously:**

1. **In-process** — `registry.execute_tool_calls(...)` for LLM tool calling inside platform-api
2. **HTTP** — `/tools/calculator` REST endpoint for external callers (webhooks, the `web/` frontend, partner integrations)
3. **MCP** — same functions exposed as an MCP server for Claude Desktop, Cursor, or any MCP client

Without toolregistry-server, you would maintain three separate definitions for every tool. With it, you write the Python function once. **That is the differentiation.**

The framing that resolves the confusion: it is not "FastAPI **OR** toolregistry-server." It is **"use toolregistry-server *inside* your FastAPI app to eliminate hand-writing 1,000 endpoints when you have 1,000 functions."**

### 4.2 Q2: "What's the benefit of the HTML admin? Why does that matter?"

**One sentence:** It is a **free operator dashboard** so you do not have to build one for the superuser/admin tier.

**What it gives you, out of the box, with zero frontend code:**

- **Tool list view** — every registered function with schema preview
- **Live execution log** — every tool call with args, result, duration, status, and who called it
- **Test harness** — fill in a form, click Run, see the result inline (essential for debugging)
- **Permission policy viewer** — see which tools are ALLOW / DENY / ASK
- **Enable/disable toggles** per tool

**The framing:** This dashboard is for **operators** (you, superusers), not end users. End users see the writing-system frontend (`web/`) and never touch the admin. The admin is the equivalent of a database GUI like DBeaver: an internal ops surface for the people running the system.

**Two ways to use it in writing-system:**

1. **Embed as-is** in a superuser-only route under `web/src/pages/admin/tool-dashboard/` — drop-in, ugly but functional, hours not days
2. **Use its REST endpoints** as a backend for a native admin UI built against Ark UI (the AgChain admin pattern)

You do not have to choose immediately. Embed it now to unblock operations, replace later when the native build is ready.

### 4.3 Q3: "What is toolregistry-hub specifically? Is that what users see?"

**No.** Nothing in this ecosystem is user-visible by default except the admin dashboard. The reframing in §3 above is the answer to this question.

**toolregistry-hub specifically:** It is a starter kit. Imagine someone wrote 15 useful tools (calculator, file ops, web search, bash, datetime, fetch, think-tool) and packaged them so you can `pip install toolregistry-hub` and instantly have those 15 tools available without writing them yourself. That is it. It is a library of pre-built tool implementations plus a CLI wrapper that boots a server exposing them via OpenAPI or MCP.

**You do not need it** because the writing-system domain tools (document processing, blockdata, Kestra-absorbed functions) are bespoke. You will not expose a calculator to your users.

**What you DO want from it:** Read the file `server/registry.py` inside it (~50 lines). It shows the exact pattern for wiring `ToolRegistry` + `toolregistry-server` together as a working server. It is a copy-paste template for what you will do inside platform-api. Reading it takes 20 minutes and gives you the full template. Possibly cherry-pick `bash_tool.py`, `fetch.py`, or `websearch/brave.py` if you need those capabilities for the Agent Systems Competition benchmark runners — but do not install the package itself.

### 4.4 Q4: "Most of these services you don't see anyway. Help me frame this."

This question prompted §3 — the visibility table and the architecture diagram with annotated visibility. The answer is captured there. The condensed version: **the only pixels in this entire ecosystem come from ToolRegistry's `admin.html` (for operators) and the AgentRegistry components you port into `web/` (for end users).** Everything else is invisible Python library code inside platform-api.

---

## 5. Per-Repo Findings

### 5.1 ToolRegistry (Oaklight, MIT, Python)

**One-line:** Protocol-agnostic Python library for LLM tool calling — register functions once, use with OpenAI, Anthropic, Gemini, LangChain, and MCP.

**Version:** 0.7.0 · **License:** MIT · **Python:** ≥3.10

**The mental model in one sentence:** ToolRegistry is a Python `dict` of registered functions, with safety rails (permissions, logging, timeouts) and a JSON Schema generator that speaks every LLM provider's dialect.

**What lives inside a `ToolRegistry()` instance:**

```
ToolRegistry instance
│
├── _tools: dict[str, Tool]            ← the actual function inventory
│   └── each Tool has:
│       ├── name                       ← unique identifier
│       ├── description                ← human-readable
│       ├── parameters                 ← JSON Schema (auto-generated from Python signature)
│       ├── callable                   ← the actual Python function
│       └── metadata: ToolMetadata
│           ├── is_async               ← async or sync?
│           ├── is_concurrency_safe    ← safe to run in parallel?
│           ├── timeout                ← max runtime
│           ├── locality               ← local / remote / any
│           ├── tags                   ← READ_ONLY / DESTRUCTIVE / NETWORK / FILE_SYSTEM / SLOW / PRIVILEGED
│           ├── search_hint            ← for BM25F discovery
│           └── think_augment          ← inject CoT scratchpad?
│
├── permission_policy: PermissionPolicy
│   └── per-tool rules: ALLOW | DENY | ASK
│       + sync/async handlers for custom logic
│
├── execution_backend: ExecutionBackend
│   ├── ThreadBackend          ← async-native, lightweight, in-process
│   └── ProcessPoolBackend     ← true isolation, multicore, cancellable
│
├── execution_log: ExecutionLog
│   └── thread-safe ring buffer:
│       tool_name, timestamp, status, duration_ms,
│       arguments, result/error, executed_by
│
├── discovery: ToolDiscoveryTool
│   └── BM25F sparse search index over
│       names, descriptions, tags, search hints
│
├── change_callbacks: list[Callback]
│   └── fire on register/unregister/enable/disable
│       (your DB layer subscribes to these)
│
└── admin_server: AdminServer (optional)
    └── starts HTTP + admin.html dashboard
        on a port of your choice
```

**How you use it (the seven verbs):**

| Verb | Method | What it does |
|---|---|---|
| **Register** | `@registry.register` or `register_from_class()` | Add a Python function or class as a tool |
| **Register from outside** | `register_from_openapi()`, `register_from_mcp()`, `register_from_langchain()` | Pull tool definitions from external sources |
| **Schema-out** | `registry.get_schemas(api_format="anthropic")` | Emit JSON schemas in OpenAI / Anthropic / Gemini format for LLM tool calling |
| **Execute** | `registry.execute_tool_calls(calls, mode="thread")` | Run a batch of LLM-generated tool calls; return results |
| **Permission** | `registry.set_permission_policy(...)` | Define which tools are allowed / denied / require asking |
| **Discover** | `registry.search("file operations")` | BM25F-search the catalog for relevant tools |
| **Inspect** | `registry.enable_admin(host=..., port=..., serve_ui=True)` | Boot the embedded web dashboard |

**Architecture details:**

- Pydantic v2 + mixin-based composition (7 mixins: RegistrationMixin, NamespaceMixin, PermissionsMixin, AdminMixin, ExecutionLoggingMixin, EnableDisableMixin, ChangeCallbackMixin)
- Protocol-agnostic tool wrapping (native Python, OpenAPI, MCP, LangChain)
- BM25F sparse-search tool discovery with deferred loading
- Dual execution backends (thread pool, process pool) with cancellation + progress callbacks
- Built-in permission policy engine (ALLOW/DENY/ASK rules, async/sync handlers)
- Ring-buffer execution log with embedded admin dashboard
- Truncation support for large tool results
- Thought-augmented tool calling (CoT injection into tool schemas)

**API format support (`API_FORMATS` enum):** `openai-chat`, `openai-chatcompletion`, `openai-response`, `anthropic`, `gemini`

**What it does NOT have:**

- **No database.** Everything is in-memory. Your DB stays the source of truth; ToolRegistry rebuilds itself on startup from `service_functions` rows.
- **No HTTP endpoints by default.** That is what `toolregistry-server` adds. ToolRegistry does have the embedded admin HTML on its own port if you call `enable_admin()`.
- **No multi-tenancy.** Single-process. Multi-tenant scoping happens at the layer above (your platform-api routes).

**Dependencies:** `pydantic>=2.7.2`, `cloudpickle>=3.0.0`, `httpx>=0.28.1`, `llm-rosetta>=0.2.6` (core); `mcp`, `PyYAML`, `jsonref`, `langchain-core` (optional)

**Code size:** ~5,445 LOC core library, excluding tests and examples.

**Decision:** ✅ **Full adoption (Tier 1)** — direct replacement and augmentation of the execution + schema layer for `service_functions`.

---

### 5.2 llm-rosetta (Oaklight, MIT, Python)

**One-line:** Hub-and-spoke converter between LLM provider API formats using a central Intermediate Representation (IR).

**Version:** 0.3.1 · **License:** MIT · **Python:** ≥3.10

**Problem solved:** Avoids the N² problem of writing provider-to-provider converters. Four providers (OpenAI Chat, OpenAI Responses, Anthropic, Google GenAI) require only 4 IR adapters instead of 12 bidirectional pair converters.

**Architecture:**

- `BaseConverter` abstract class with bidirectional interface (`request_to_provider`, `response_from_provider`, `stream_from_provider`)
- Functional domain composition: `ContentOps`, `ToolOps`, `MessageOps`, `ConfigOps`
- Central IR for messages, tools, content parts, streaming events
- `ConversionContext` / `StreamContext` manage state during conversion
- Typed stream events: `TextDeltaEvent`, `ToolCallDeltaEvent`, `FinishEvent`
- Optional HTTP gateway (Starlette + uvicorn + httpx)
- Provider auto-detection

**Converters implemented:** Anthropic Messages API, OpenAI Chat Completions, OpenAI Responses API, Google GenAI API.

**Dependencies:** Only `typing_extensions` (core); provider SDKs optional.

**Relationship to ToolRegistry:** Transitive dependency (`llm-rosetta>=0.2.6`). ToolRegistry uses it for multi-format schema emission. Pulled in automatically when installing ToolRegistry — no separate install step.

**Naming note:** The agentabi README references this as `llmir` (not `llm-rosetta`). Same author, likely rename in progress. Treat as equivalent.

**Decision:** ✅ **Full adoption (Tier 1)** — enables tool definitions to be consumed by any LLM provider without per-provider schema maintenance.

---

### 5.3 toolregistry-server (Oaklight, MIT, Python)

**One-line:** Protocol adapter layer — turns a `ToolRegistry` instance into a live HTTP API and/or MCP server.

**License:** MIT · **Python:** ≥3.10

**The differentiation versus FastAPI:** See §4.1 for the full Q&A. Short version: FastAPI requires hand-written endpoints per function. toolregistry-server auto-generates all endpoints from a registry with one line of code, and exposes the same registry as MCP simultaneously.

**Architecture:**

- `RouteTable` / `RouteEntry` — central registry mapping ToolRegistry tools to HTTP routes with metadata
- `create_openapi_app()` — returns a FastAPI app ready to mount or run with uvicorn
- `create_mcp_server()` — returns an MCP server over stdio / SSE / WebSocket
- Bearer-token auth (`BearerTokenAuth`, `create_bearer_dependency`)
- Session management for stateful tool execution
- CLI commands: `toolregistry-server openapi`, `toolregistry-server mcp`

**Key files:**

```
toolregistry_server/
├── route_table.py
├── session.py
├── auth/__init__.py
├── openapi/adapter.py
├── openapi/middleware.py
├── mcp/adapter.py
├── mcp/server.py
└── cli/openapi.py, cli/mcp.py
```

**Dependencies:** `toolregistry>=0.7.0` (core); `fastapi>=0.119`, `uvicorn>=0.24` (OpenAPI extra); `mcp>=1.8.0` (MCP extra).

**Why it matters for writing-system:**

- `platform-api` is already FastAPI-based. One line — `app.mount("/tools", create_openapi_app(my_registry))` — exposes every registered function as `/tools/{name}` with auto-generated OpenAPI docs, input validation, and output schemas.
- Simultaneous MCP exposure backs the existing `McpServers` settings page with real endpoints instead of a stub.
- Existing hand-written `admin_services.py` endpoints remain the **write path** to the DB. toolregistry-server becomes the **read/execute path**.

**File count:** ~10 Python files. Thin glue layer.

**Decision:** ✅ **Full adoption (Tier 1)** — the bridge between ToolRegistry and platform-api's external surface.

---

### 5.4 toolregistry-hub (Oaklight, MIT, Python)

**One-line:** Batteries-included package of pre-built utility tools, pre-registered and ready to serve.

**Version:** 0.8.0 · **License:** MIT · **Python:** ≥3.10

**See §4.3 for the framing question and answer.** Short version: this is a starter kit of 15 generic tools you do not need, but the `server/registry.py` inside is the canonical wiring template for your own integration.

**Pre-built tool inventory:**

| File | Capability |
|---|---|
| `calculator.py` | Math expression evaluation |
| `datetime_utils.py` | Date/time manipulation |
| `file_ops.py` | File content read/write |
| `file_reader.py` | File reading utilities |
| `file_search.py` | File searching |
| `filesystem.py` | File system operations |
| `path_info.py` | Path information |
| `bash_tool.py` | Shell command execution |
| `cron_tool.py` | Cron expression scheduling |
| `fetch.py` | HTTP GET/POST with `ua-generator` |
| `think_tool.py` | Anthropic-style scratchpad |
| `todo_list.py` | In-memory TODO manager |
| `unit_converter.py` | Unit conversions |
| `websearch/brave.py` | Brave Search backend |
| `websearch/serper.py` | Serper backend |
| `websearch/tavily.py` | Tavily backend |
| `websearch/searxng.py` | SearxNG backend |

**Server wrapper:**

```
toolregistry_hub/server/
├── cli.py          # toolregistry-hub openapi | mcp
├── registry.py     # pre-configured ToolRegistry instance
├── auth.py
├── tool_config.py
└── routes/version.py
```

**Dependencies:** `httpx>=0.28.1`, `beautifulsoup4>=4.13.4`, `pydantic>=2.7.2`, `ua-generator>=1.0.6`; `toolregistry-server>=0.1.2` for server extras.

**Why it is reference-only:**

- Hub tools are generic. The writing-system domain (document processing, blockdata, Kestra-absorbed functions) needs bespoke tools, not generic ones
- Running `toolregistry-hub mcp` would expose 15+ generic tools to users, which is not the intended product surface
- **But** `server/registry.py` and `server/cli.py` are worked reference examples — a 20-minute read that produces the template for platform-api integration
- **Cherry-pick candidates** for benchmark runners: `bash_tool.py` (safe subprocess wrapping), `fetch.py` (safe HTTP with user-agent generation), `websearch/brave.py` (multi-backend tool pattern), `think_tool.py` (scratchpad pattern)

**File count:** ~25 Python files.

**Decision:** ◐ **Reference only** — do NOT `pip install`. Read `server/registry.py` + `server/cli.py` as templates. Cherry-pick specific tool files into platform-api only if internally needed.

---

### 5.5 agentabi (Oaklight, MIT, Python)

**One-line:** Unified async Python interface layer for driving agentic coding CLIs (Claude Code, Codex, Gemini CLI, OpenCode). "One interface. Any coding agent."

**License:** MIT · **Python:** ≥3.9

**Problem solved:** Agentic coding CLIs have incompatible interfaces. Teams building multi-agent systems must maintain separate integrations per CLI. agentabi provides a stable ABI so you write once and swap backends via config.

**Status in study-patterns:** **Already downloaded** to `I:\tool-registry\agentabi\`. Not yet symlinked. One-line fix:

```
mklink /D "E:\writing-system\docs\study-patterns\05-tool-integration-platforms\agentabi" "I:\tool-registry\agentabi"
```

No clone needed.

**Supported agents (all implemented):**

| Agent | Vendor | Provider files |
|---|---|---|
| Claude Code | Anthropic | `claude_native.py`, `claude_sdk.py` |
| Codex | OpenAI | `codex_native.py`, `codex_sdk.py` |
| Gemini CLI | Google | `gemini_native.py`, `gemini_sdk.py` |
| OpenCode | Open source | `opencode_native.py` |

Each provider wraps either a subprocess call (native) or the vendor SDK.

**Core abstractions:**

- `Session` — primary class: `Session(agent=None, model=None, prefer="native"|"sdk")`
- Methods: `await session.run(prompt, ...)`, `async for event in session.stream(prompt, ...)`
- `run_sync` — blocking convenience wrapper
- `detect_agents()` — discovery
- `get_agent_capabilities(name)` — feature matrix per agent
- `Provider` protocol — runtime-checkable extensibility interface
- `TaskConfig` (TypedDict) — unified input format: `prompt`, `agent`, `model`, `working_dir`, `env`, `session_id`, `system_prompt`, `max_turns`, `timeout`, `permissions`, `mcp_config`, `agent_extensions`
- `AgentCapabilities` — declares streaming, MCP, session resume, system prompt, tool filtering, file diffs, permissions, multi-turn, transport type
- `PermissionConfig` — levels: `full_auto`, `accept_edits`, `plan`, `deny` + tool allowlist/blocklist

**IR event types (normalized across all four agents):**

- `SessionStartEvent`, `SessionEndEvent`
- `MessageStartEvent`, `MessageDeltaEvent`, `MessageEndEvent`
- `ToolUseEvent`, `ToolResultEvent`
- `PermissionRequestEvent`, `PermissionResponseEvent`
- `FileDiffEvent`
- `UsageEvent` (token counts + cost)
- `ErrorEvent`

**Example usage (`examples/quickstart.py`):**

```python
from agentabi import Session, detect_agents, get_agent_capabilities

available = detect_agents()
session = Session(agent=available[0])
result = await session.run(prompt="Fix the bug in auth.py", max_turns=2)
# result["status"], result["result_text"], result["usage"], result["cost_usd"]
```

**Example usage (`examples/streaming.py`):**

```python
async for event in session.stream(prompt="Explain this code"):
    match event["type"]:
        case "session_start":  ...
        case "message_delta":  print(event["text"], end="")
        case "tool_use":       ...
        case "tool_result":    ...
        case "usage":          ...
        case "session_end":    ...
```

**Dependencies:** `typing_extensions>=4.0.0` (core); `claude-agent-sdk>=0.1.0`, `codex-sdk-python>=0.1.0`, `gemini-cli-sdk>=0.5.0` (optional per-agent extras).

**Frontend:** None. Library only. Examples are CLI scripts.

**File count:** ~64 files; ~5,800 Python LOC.

**Ecosystem positioning** (stated in the README):

```
agentabi    → Agent CLI unified interface     (like an OS ABI)
llmir       → LLM API format IR conversion    (like a compiler IR)
```

**Use cases called out in README:**

- Fleet Management — unified entry point for managing multiple coding agents
- Agent-to-Agent Calls — inter-agent invocation translation layer
- Benchmarking — run the same task across agents, compare results
- Fallback & Routing — automatic failover and cost-aware routing
- Middleware Pipeline — logging, metering, security scanning, audit trails
- CI/CD Integration — vendor-agnostic agent pipelines

**Decision:** ✅ **Full adoption (Tier 1b)** — the agent runtime layer. Directly backs the planned skill-prompt-management service and the "Agent Systems Competition" vision.

---

### 5.6 ACI.dev (Aipolabs, Apache 2.0, Python/FastAPI + Next.js)

**One-line:** Multi-tenant tool-calling platform with 600+ pre-built integrations (Google Calendar, Slack, GitHub, Gmail, Brave, etc.) for AI agents.

**License:** Apache 2.0

**Stack:**

- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2.0+, PostgreSQL + pgvector, Alembic
- **Frontend:** Next.js 15, React 19, Tailwind, Radix UI, @tanstack/react-query, @tanstack/react-table, zod, recharts, PropelAuth React
- **Auth:** PropelAuth multi-tenant
- **Billing:** Stripe subscription management

**Core models (`backend/aci/common/db/sql_models.py`):**

- `Project` — logical container for API keys, allowed apps, quota tracking
- `Agent` — actor within a project; API keys belong to agents; controls app access
- `App` — represents an external service with security schemes
- `Function` — callable operation on an app
- `AppConfiguration` — project-level enable/disable rules
- `LinkedAccount` — user's authenticated connection (OAuth credentials, API keys)
- `APIKey` — encrypted authentication token

**Key enums:**

- `SecurityScheme`: NO_AUTH, API_KEY, HTTP_BASIC, HTTP_BEARER, OAUTH2
- `Protocol`: REST, CONNECTOR
- `Visibility`: PUBLIC, PRIVATE

**REST API surface (`/v1/...`):** `projects/`, `agents/`, `apps/`, `app-configurations/`, `functions/`, `linked-accounts/`, `organizations/`, `billing/`, `analytics/`, `webhooks/`

**Function definition format:**

```json
{
  "name": "APP__FUNCTION_NAME",
  "description": "...",
  "protocol": "rest|connector",
  "protocol_data": { "method": "GET|POST|...", "path": "/endpoint", "server_url": "https://..." },
  "parameters": { /* JSONSchema */ },
  "response": { /* JSONSchema */ }
}
```

**App integration format:** Each app has `app.json` (metadata, security schemes, logo, categories) + `functions.json` (array of function definitions). CLI tool upserts to DB.

**Frontend (`frontend/src/app/` — full Next.js 15 dev portal):**

- **Routes:** `agents/`, `api/`, `appconfigs/`, `apps/`, `home/`, `linked-accounts/`, `logs/`, `playground/`, `pricing/`, `project-setting/`, `settings/`, `usage/`
- **Component directories:** `appconfig/`, `apps/`, `charts/`, `context/`, `home/`, `layout/`, `linkedaccount/`, `playground/`, `pricing/`, `project/`, `quota/`, `settings/`, `stats/`, `ui/`, `ui-extensions/`

**Why Tier 2 (study for patterns, do not adopt wholesale):**

- Valuable: multi-tenant OAuth flow management, per-project function scoping, execution audit patterns, vector-embedding-based function discovery
- Problematic: Full stack (PropelAuth, Stripe, pgvector) is too heavy; some overlap with existing writing-system auth/billing surfaces
- **Reference patterns worth extracting:** project/agent scoping model, encrypted credential storage (`EncryptedSecurityScheme`), function execution pipeline structure

**Decision:** ◐ **Study for patterns** — extract schema and pipeline design; do not install or port wholesale.

---

### 5.7 AgentRegistry (Apache 2.0, Go backend + Next.js frontend)

**One-line:** Open-source platform providing a centralized, curated catalog for discovering, managing, and running MCP servers, AI agents, skills, and prompts. Build. Deploy. Discover.

**License:** Apache 2.0

**Stack:**

- **Backend:** Go 1.25.7+, Huma v2 (REST + OpenAPI), Cobra (CLI), pgx v5 (PostgreSQL), compose-spec/compose-go (Docker Compose parsing)
- **Frontend:** Next.js 16, React 18, Radix UI, Tailwind, lucide-react, sonner, next-themes, Storybook 9.1
- **Database:** PostgreSQL with optional pgvector for semantic search
- **Container runtime:** Docker / OCI
- **Orchestration:** Kubernetes
- **Security:** OSSF Scorecard, OSV Scanner, OIDC
- **Observability:** OpenTelemetry, Prometheus

**Models (`pkg/models/`):**

- `Agent` — AI agent with manifest, dependencies, MCP servers, skills, prompts
- `Skill` — reusable knowledge packages bundled with code, docs, PDFs
- `AgentManifest` — agent configuration specifying MCP server dependencies, skills, prompts, language, framework, model provider
- `Deployment` — deployed resource state
- `Prompt` — reusable instruction templates
- `Provider` — cloud/platform provider configuration

**File counts:**

- **500 files total**
- **281 Go files** — backend (not portable, language mismatch, stays out)
- **75 TypeScript/CSS files** in `ui/` — frontend (portable, matches `web/` stack)
- **~38 React components** of interest

**Frontend components (portable set):**

```
ui/components/
├── agent-card.tsx + .stories.tsx
├── agent-detail.tsx
├── add-agent-dialog.tsx
├── prompt-card.tsx + .stories.tsx
├── prompt-detail.tsx
├── add-prompt-dialog.tsx
├── server-card.tsx + .stories.tsx
├── server-detail.tsx
├── server-detail/environment-variables-table.tsx
├── server-detail/runtime-arguments-table.tsx
├── add-server-dialog.tsx
├── deploy-server-dialog.tsx
├── skill-card.tsx + .stories.tsx
├── skill-detail.tsx
├── add-skill-dialog.tsx
├── delete-confirmation-dialog.tsx
├── deploy-dialog.tsx
├── import-dialog.tsx
├── footer.tsx
├── navigation.tsx
├── theme-provider.tsx
├── icons/mcp.tsx
└── ui/*                     (Radix primitive wrappers)
```

**Storybook:** Already wired. `npm install && npm run storybook` boots on `:6006` and shows every component in isolation with mock data — zero Go involvement required.

**UI stack alignment with writing-system `web/`:**

- Next.js + React (same family)
- Radix UI primitives (parallel to Ark UI used in writing-system)
- Tailwind (same)
- lucide-react, sonner, next-themes (direct equivalents available)

**Decision:** ◐ **Port UI only (Tier 2)** — lift the ~38 `.tsx` component files into `web/src/components/marketplace/`, swap Radix primitives for Ark UI equivalents, repoint API calls at platform-api. The Go backend never leaves `/i/agentregistry/`. The manifest schema and approval workflow concepts are worth extracting as design references.

---

## 6. Live Demo Validation

This section captures the empirical validation of the ToolRegistry admin dashboard performed during the assessment.

### 6.1 Why a live demo

After the user observed *"most of these services you don't see anyway"* and asked *"how does that provide benefits? what differentiation are you imagining?"*, the answer needed to be grounded in something visible. Of all seven in-scope packages, only ToolRegistry's `admin.html` actually emits pixels. Booting it live is the only way to make the abstract architecture tangible.

### 6.2 What was done

1. Created a scratch venv at `/tmp/tr-demo/venv` (Windows: `C:\Users\jwchu\AppData\Local\Temp\tr-demo`)
2. `pip install toolregistry` — installed version 0.7.0 with no errors
3. Wrote a ~140-line `demo.py` that:
   - Defines five sample tools: `calculator`, `list_files`, `now`, `echo`, `search_writing_system`
   - Instantiates `ToolRegistry()` and calls `.register()` for each function
   - Prints the auto-generated OpenAI tool schema for `calculator`
   - Runs `calculator("2 + 2 * 5")` to populate the execution log
   - Calls `registry.enable_admin(host="127.0.0.1", port=8765, serve_ui=True)` to boot the admin dashboard
4. Started the script in the background
5. Verified `HTTP 200` from `http://127.0.0.1:8765/`
6. Confirmed `/api/tools` REST endpoint returned all five registered tools
7. Captured a full-page screenshot via Playwright

### 6.3 What the dashboard rendered

**Page title:** "ToolRegistry Admin Panel"
**Connection status:** "Connected" (live WebSocket to the Python process)

**Four tabs:**

| Tab | What it shows |
|---|---|
| **Tools** (active in screenshot) | The registered function inventory |
| **Namespaces** | Tools grouped by namespace (all five in `default`) |
| **Logs** | Live execution audit (every tool call with args, result, duration, status) |
| **State** | Registry-wide state: change events, permission policies, admin info |

**Overview cards (4 metrics):**

- **5 Total Tools** ← matches the `register()` calls
- **5 Enabled** ← all on
- **0 Disabled** ← none toggled off
- **0 Namespaces** ← only `default` used

**Tools table** showing all 5 functions with enable/disable toggles, search bar, namespace filter, status filter.

### 6.4 The point this proves

Everything visible in the dashboard was generated from this code:

```python
registry = ToolRegistry()
registry.register(calculator)
registry.register(list_files)
registry.register(now)
registry.register(echo)
registry.register(search_writing_system)
registry.enable_admin(host="127.0.0.1", port=8765, serve_ui=True)
```

**No HTML, CSS, JavaScript, FastAPI route, or Pydantic model was written.** No tool list view, permission toggle, execution log, or test harness was built. Five `register()` calls plus one `enable_admin()` call produced the full operator dashboard.

**For writing-system:**

- The 1,000 toolbar actions, registered through `service_functions` rows on platform-api startup, instantly get an admin surface like this
- Operators get a superuser-only ops dashboard for free, embedded in `web/src/pages/admin/tool-dashboard/`
- The **Logs** tab becomes the tool execution audit out of the box
- The **test harness** (visible when you click into a tool) becomes the debugging surface — type args, click Run, see the result inline
- The **enable/disable toggles** let operators flip a tool off in real time without a deploy

### 6.5 Demo artifacts

- **Screenshot:** `toolregistry-admin-overview.png` (full-page, 5 tools visible)
- **Demo script:** `/tmp/tr-demo/demo.py` (~140 lines)
- **venv:** `/tmp/tr-demo/venv/` (toolregistry 0.7.0 installed)
- **Server task ID:** `bpnht6zro` (background, still running at time of report)

---

## 7. Integration Method — Layered Adoption

### 7.1 Core principle

**Layered adoption, not wholesale port.** ToolRegistry becomes the execution + schema engine inside `services/platform-api`. Existing tables (`service_registry`, `service_functions`, `service_type_catalog`) remain the governance + persistence layer. Nothing is thrown away — everything is wrapped.

### 7.2 The layers

**Layer 1 — Core library inside platform-api**

```
services/platform-api/
└── app/
    └── tools/                          ← new module
        ├── registry_adapter.py         ← hydrates ToolRegistry from service_functions rows
        ├── execution_service.py        ← wraps registry.execute_tool_calls()
        ├── permission_policy.py        ← maps workspace/user/superuser tiers → ToolRegistry policies
        └── discovery_index.py          ← BM25F index for the 1000+ planned functions
```

- `pip install toolregistry toolregistry-server llm-rosetta agentabi` — four lines in `pyproject.toml` (`llm-rosetta` is transitive but listed for clarity)
- On platform-api startup, query `service_functions`, instantiate a `ToolRegistry`, and `register_from_class()` or `register_from_openapi()` for each entry
- Keep the DB as the source of truth; ToolRegistry is a hot in-memory cache rebuilt on registry change events

**Layer 2 — Protocol exposure via toolregistry-server**

- Mount the OpenAPI adapter under `platform-api/v1/tools/*` — auto-generated schemas for every registered function (see §4.1 for the full code example)
- Mount the MCP adapter as a second FastAPI sub-app — provides real backing for the `McpServers` settings page
- Existing `admin_services.py` endpoints remain the **write path** to the DB
- toolregistry-server becomes the **read/execute path**

**Layer 3 — llm-rosetta for provider-format conversion**

- Pulled in transitively. AGChain's model-tool binding system stops needing per-provider format selection
- Tools defined once, converted to OpenAI / Anthropic / Gemini format on demand
- This is the piece that makes "1,000+ functions as toolbar actions" viable across models

**Layer 4 — agentabi for the agent runtime**

```
services/platform-api/
└── app/
    └── agents/                         ← new module
        └── agentabi_driver.py          ← Session wrapper for Claude Code / Codex / Gemini CLI / OpenCode
```

- Backs the planned skill-prompt-management service
- Provides unified event stream for the "Agent Systems Competition" (run the same benchmark across multiple agent CLIs, compare results)
- Drives fallback routing, cost-aware agent selection, middleware injection (logging, metering, audit trails)

**Layer 5 — Frontend reuse strategy** (see §8)

### 7.3 Architectural story

```
┌─────────────────────────────────────────────────────────────┐
│ web/ (React + Ark UI)                                       │
│  └─ marketplace pages     ← ported from agentregistry/ui     │
│  └─ tool admin dashboard  ← embedded ToolRegistry admin.html │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│ services/platform-api (Python/FastAPI)                      │
│  ├─ tools/                                                  │
│  │   ├─ ToolRegistry        ← function registration + exec  │
│  │   ├─ llm-rosetta         ← OpenAI↔Anthropic↔Gemini conv  │
│  │   └─ toolregistry-server ← OpenAPI + MCP endpoints       │
│  └─ agents/                                                 │
│      └─ agentabi            ← Session for Claude/Codex/Gemini
│                                (backs skill-prompt-management)
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│ DB: service_registry / service_functions (already exists)   │
│   + new: agent_sessions, tool_executions, permission_policies
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Why the Oaklight stack is a rare find

All five Oaklight packages share:

- **Same author** (Peng Ding / Oaklight) — one upstream to track
- **Same license** (MIT)
- **Same language** (Python 3.10+)
- **Same design conventions:** Pydantic v2 + Protocol-based IR + event streaming + mixin composition
- **Explicit layered positioning** stated in the agentabi README: `agentabi → llmir → ToolRegistry ecosystem`
- **Zero impedance mismatch** with `services/platform-api` (FastAPI + Python + Pydantic + SQLAlchemy)
- **Four real installs + one reference** — clean, auditable adoption surface

No other candidate in the investigation provides this level of stack coherence.

---

## 8. Frontend Strategy

### 8.1 Options evaluated

| Option | Approach | Time to first pixel | Coherence with `web/` |
|---|---|---|---|
| **A. Port ACI.dev's portal layout** | Lift app/function browsing pages, strip PropelAuth/Stripe/billing, reskin to Ark UI | ~1 week | Medium |
| **B. Port AgentRegistry's card browser** | Lift 38 `.tsx` files into `web/src/components/marketplace/`, swap Radix for Ark UI, repoint at platform-api | ~3–5 days | Medium-High (stack aligned) |
| **C. Embed ToolRegistry's `admin.html`** | Drop into a superuser-only route, iframe or serve via FastAPI | Hours | Low (vanilla JS island) |
| **D. Build native against Ark UI** | Use investigated repos as visual spec, build from scratch against existing tokens/contracts | ~1–2 weeks | High |

### 8.2 Recommended path

**C + D combined:**

- **C immediately:** Drop ToolRegistry's `admin.html` into a superuser-only ops route (validated live in §6). Zero-to-useful in hours. Ugly but operational. Gives operators immediate visibility into tool registrations, execution logs, and the test harness while the real marketplace is being built.
- **D as the canonical build:** Design the real marketplace from the writing-system layout system over the next plan cycle. Use AgentRegistry's 38 `.tsx` files and ACI.dev's dev portal as visual references, not as port sources.

**Alternative path (faster time to market):**

- **Port B + reference A and D:** Lift AgentRegistry's card browser as the starting point (stack-aligned, 3–5 days), reference ACI.dev's layout polish for iteration 2, converge on native D contracts in iteration 3.

This trade-off is an **open question** requiring user decision before plan drafting (see §11).

---

## 9. Decision Trail

Captured here so decisions are not lost between sessions.

### 9.1 Repo scope evolution

| Step | Event | Resulting repo set |
|---|---|---|
| 1 | Initial symlink inspection | 7 repos: ToolRegistry, llm-rosetta, toolregistry-hub, toolregistry-server, aci, agentregistry, composio |
| 2 | User flagged `I:\tool-registry\` gap | Discovered 3 missing repos: agentabi, cicada, thunderbird-mcp |
| 3 | Second-pass investigation of the 3 missing | Preliminary recommendation: add agentabi, study cicada and thunderbird-mcp |
| 4 | **User: "we dont nee cicada"** | cicada dropped |
| 5 | **User: "only need agentabi not other two"** | thunderbird-mcp also dropped |
| 6 | **User: "for cloning repo only need to add abi"** | Final clone scope confirmed: only agentabi needs symlinking |
| 7 | **User: "for integration i am thinking oaklight/peng light is solving my rpoblems well"** | All-in on the Oaklight ecosystem confirmed |
| 8 | User question: "What does toolregistry-server actually add over FastAPI?" | Captured in §4.1 |
| 9 | User question: "What's the benefit of the HTML admin?" | Captured in §4.2; live demo booted (§6) |
| 10 | User question: "What is toolregistry-hub specifically? Is that what users see?" | Captured in §4.3 |
| 11 | User observation: "Most of these services you don't see anyway" | Triggered §3 framing rewrite |
| 12 | **User: take composio, thunderbird, cicada out of the report** | Removed from this revision |

### 9.2 Final locked assessment

| Repo | Decision | Rationale |
|---|---|---|
| **ToolRegistry** | ✅ Full adopt (Tier 1) | Core function registration + execution engine for platform-api |
| **llm-rosetta** | ✅ Full adopt (Tier 1) | LLM format conversion, transitive dependency of ToolRegistry |
| **toolregistry-server** | ✅ Full adopt (Tier 1) | Auto-generated OpenAPI + MCP endpoints; eliminates 1,000 hand-written FastAPI routes |
| **agentabi** | ✅ Full adopt (Tier 1b) | Agent CLI driver for skill-prompt-management and Agent Systems Competition |
| **toolregistry-hub** | ◐ Reference only | Read `server/registry.py` + `server/cli.py` as templates; cherry-pick individual tool files only if needed |
| **aci (ACI.dev)** | ◐ Study patterns | Multi-tenant auth, project/agent scoping, OAuth flows — extract design patterns, do not install |
| **agentregistry** | ◐ Port UI only | Lift 38 `.tsx` files from `ui/` into `web/src/components/marketplace/`; reskin to Ark UI; Go backend stays out |

### 9.3 Symlink gap to address

agentabi is downloaded to `I:\tool-registry\agentabi\` but not surfaced in `docs/study-patterns/05-tool-integration-platforms/`. One-line fix:

```
mklink /D "E:\writing-system\docs\study-patterns\05-tool-integration-platforms\agentabi" "I:\tool-registry\agentabi"
```

No clone needed.

---

## 10. Integration Touchpoints in writing-system

### 10.1 Backend (`services/platform-api`)

| File / module | Current state | Integration plan |
|---|---|---|
| `app/api/routes/admin_services.py` | Existing service registry CRUD, function management, bulk import | Remains the **write path**. ToolRegistry hydrates from the rows it manages. |
| `app/api/routes/agchain_tools.py` | Existing AGChain tool CRUD | ToolRegistry permission policies + execution logging back the tool-model binding |
| `app/tools/` (new) | Does not exist | New module: `registry_adapter.py`, `execution_service.py`, `permission_policy.py`, `discovery_index.py` |
| `app/agents/` (new) | Does not exist | New module: `agentabi_driver.py` wrapping Session for skill-prompt-management |
| `pyproject.toml` | Existing dependency declarations | Add: `toolregistry`, `toolregistry-server`, `agentabi` (`llm-rosetta` pulled transitively) |

### 10.2 Frontend (`web/`)

| File / module | Current state | Integration plan |
|---|---|---|
| `src/components/services/function-reference.tsx` | Existing function reference display | Data source switches from hand-queried API to auto-generated `/tools/*` schemas |
| `src/components/agchain/tools/` (AgchainToolsTable, AgchainToolEditorDialog, AgchainToolInspector) | Existing AGChain tool editors | Reads execution logs and permission policies from ToolRegistry admin API |
| `src/data/integrations.json` | Empty catalog placeholder | Populated from ToolRegistry registry metadata via platform-api |
| `src/pages/settings/McpServers` | Existing stub | Backed by `toolregistry-server.create_mcp_server()` on a FastAPI sub-app |
| `src/pages/marketplace/IntegrationsCatalog` | Empty marketplace shell | Populated from platform-api `/tools/*` listing |
| `src/components/marketplace/` (new) | Does not exist | Ported components from `agentregistry/ui/components/` (cards, details, dialogs), reskinned |
| `src/pages/admin/tool-dashboard` (new) | Does not exist | Hosts ToolRegistry's `admin.html` in a superuser-only route (validated live in §6) |

### 10.3 Database

| Table | Status | Change |
|---|---|---|
| `service_registry` | Existing | No schema change; ToolRegistry reads it |
| `service_functions` | Existing | No schema change; ToolRegistry reads it |
| `service_type_catalog` | Existing | No schema change |
| `agent_sessions` (new) | — | New table for agentabi session tracking (session_id, agent, model, status, started_at, ended_at, cost_usd, input_tokens, output_tokens) |
| `tool_executions` (new) | — | New table for ToolRegistry execution audit (tool_name, call_id, status, arguments, result, duration_ms, executed_at, executed_by, workspace_id) |
| `permission_policies` (new) | — | New table for workspace/user/superuser tier policy rules |

### 10.4 Study-patterns directory

- **Add:** agentabi symlink
- **Already present (keep):** ToolRegistry, llm-rosetta, toolregistry-hub, toolregistry-server, aci, agentregistry

---

## 11. Open Questions

Two decisions remain before `investigating-and-writing-plan` can draft the implementation plan.

### 11.1 Visual preview ordering

**Question:** Which additional visual surfaces should be booted for user evaluation? (ToolRegistry admin dashboard already validated live in §6.)

| Option | What it shows | Cost |
|---|---|---|
| **A. AgentRegistry Storybook** | All 38 components in isolation with mock data. Closest preview of what would be ported. | `npm install` + `npm run storybook` on `:6006` — no Go involvement |
| **B. ACI.dev dev portal** | Polished marketplace reference for design inspiration | Heavier — requires DB + auth setup |
| **C. Skip further previews, lock plan** | Already saw the ToolRegistry admin live; lock decisions and draft plan | Fastest |

### 11.2 Frontend strategy lock

**Question:** Port-and-reskin vs reference-and-rebuild for the marketplace surface?

- **Port and reskin:** Lift the 38 `.tsx` files into `web/src/components/marketplace/`, swap Radix primitives for Ark UI equivalents, repoint API calls at platform-api. ~3–5 days of UI work. Faster time to first pixel.
- **Reference and rebuild:** Use AgentRegistry's UI as visual spec only, build natively against existing design tokens and layout contracts. ~1–2 weeks. More coherent with the rest of `web/`.

---

## 12. Next Steps

1. **User resolves §11.1 and §11.2** — preview ordering + frontend strategy
2. **Symlink agentabi** into `docs/study-patterns/05-tool-integration-platforms/` (one-line fix)
3. **Invoke `investigating-and-writing-plan`** to draft the implementation plan under `docs/plans/YYYY-MM-DD-oaklight-tool-integration-adoption.md`. Expected plan sections:
   - Backend: `tools/` module layering inside `services/platform-api`
   - Backend: `agents/` module for agentabi Session wrapping
   - Backend: new DB tables (`agent_sessions`, `tool_executions`, `permission_policies`) via Supabase migrations
   - Backend: `toolregistry-server` FastAPI sub-app mount for `/tools/*` + MCP endpoints
   - Frontend: marketplace component port from `agentregistry/ui/` (or native rebuild)
   - Frontend: ToolRegistry admin dashboard embed in superuser ops route
   - Frontend: MCP Servers settings page wiring to real endpoints
   - Frontend: IntegrationsCatalog population from platform-api
   - Data migration: existing `service_functions` rows become ToolRegistry registrations on startup
   - Testing: TDD contracts for registry hydration, execution, permissions, agent sessions
   - Observability: execution audit integrated with existing operational readiness telemetry
4. **Evaluate plan** with `evaluating-plan-before-implementation` before execution
5. **Execute** via `executing-approved-plans` with subagent-driven development for parallel tracks

---

## Appendix A — Repo provenance and license summary

| Repo | Author | License | Language | Repo location |
|---|---|---|---|---|
| ToolRegistry | Oaklight (Peng Ding) | MIT | Python | `/i/tool-registry/ToolRegistry` |
| llm-rosetta | Oaklight (Peng Ding) | MIT | Python | `/i/tool-registry/llm-rosetta` |
| toolregistry-server | Oaklight (Peng Ding) | MIT | Python | `/i/tool-registry/toolregistry-server` |
| toolregistry-hub | Oaklight (Peng Ding) | MIT | Python | `/i/tool-registry/toolregistry-hub` |
| agentabi | Oaklight (Peng Ding) | MIT | Python | `/i/tool-registry/agentabi` (not symlinked) |
| aci (ACI.dev) | Aipolabs | Apache 2.0 | Python + Next.js | `/i/aci` |
| agentregistry | (separate vendor) | Apache 2.0 | Go + Next.js | `/i/agentregistry` |

**Oaklight ecosystem file count (adopted set):**

- ToolRegistry: ~5,445 LOC core library
- llm-rosetta: minimal core + 4 converter directories
- toolregistry-server: ~10 Python files (thin glue)
- toolregistry-hub: ~25 Python files (reference)
- agentabi: ~64 files, ~5,800 Python LOC

**AgentRegistry UI porting candidates:** 75 TS/CSS files, ~38 React components.

---

## Appendix B — Three-layer cake (ToolRegistry family visualization)

```
┌─────────────────────────────────────────────────────┐
│  toolregistry-hub                                   │
│  = "Batteries-included" package                     │
│  Pre-built tools (calculator, file ops, web search, │
│  bash, datetime, fetch, etc.) + a CLI that boots a  │
│  server exposing them all via HTTP/MCP              │
│  ROLE: reference implementation; cherry-pick only   │
└─────────────────────────────────────────────────────┘
                         ▼ depends on
┌─────────────────────────────────────────────────────┐
│  toolregistry-server                                │
│  = Protocol adapter layer                           │
│  Takes a ToolRegistry and exposes it as:            │
│   • OpenAPI/FastAPI HTTP endpoints                  │
│   • MCP (Model Context Protocol) server             │
│  Provides: RouteTable, auth, session mgmt           │
│  ROLE: full adoption, mount in platform-api         │
└─────────────────────────────────────────────────────┘
                         ▼ depends on
┌─────────────────────────────────────────────────────┐
│  ToolRegistry (the core library)                    │
│  = In-process function registration + execution     │
│  Register Python functions, classes, OpenAPI specs, │
│  MCP servers, or LangChain tools. Generate JSON     │
│  schemas for OpenAI/Anthropic/Gemini. Execute with  │
│  permissions, logging, BM25F discovery.             │
│  ROLE: full adoption, core of platform-api tools/   │
│  PROVES VISIBLE: admin.html dashboard validated §6  │
└─────────────────────────────────────────────────────┘

        In parallel, independent vertical:

┌─────────────────────────────────────────────────────┐
│  agentabi                                           │
│  = Agent CLI abstraction                            │
│  Unified Session interface for Claude Code, Codex,  │
│  Gemini CLI, OpenCode. Normalized IR event stream.  │
│  Runtime-checkable Provider protocol.               │
│  ROLE: full adoption, backs skill-prompt-management │
└─────────────────────────────────────────────────────┘

                ▼ both share

┌─────────────────────────────────────────────────────┐
│  llm-rosetta                                        │
│  = LLM API format IR conversion                     │
│  Hub-and-spoke converter between OpenAI, Anthropic, │
│  and Google GenAI formats via Intermediate Rep.     │
│  ROLE: transitive dependency; no direct wiring      │
└─────────────────────────────────────────────────────┘
```

---

## Appendix C — Skill/plan workflow invocations in this session

- `using-superpowers` — reference guide invoked per `/using-superpowers` command
- `brainstorming` — used to structure the assessment conversation
- `writing-clearly-and-concisely` — used during this report revision
- Pending: `investigating-and-writing-plan` — will run after §11 open questions are resolved
- Pending: `evaluating-plan-before-implementation` — will run after plan is drafted
- Pending: `executing-approved-plans` — will run after plan is evaluated
- Pending: `subagent-driven-development` — may be used for parallel backend/frontend tracks during execution

---

**End of report.**

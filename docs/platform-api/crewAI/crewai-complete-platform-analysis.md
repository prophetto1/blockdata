# The Complete Machine

## 1. CLI — The Developer's Interface

The `crewai` CLI (built on Click) is the main tool developers interact with:

- **Scaffolding**: `crewai create crew` / `crewai create flow` generates a full project from templates — `main.py`, `crew.py`, YAML configs for agents/tasks, tool stubs, tests
- **Local execution**: `crewai run`, `crewai train`, `crewai test`, `crewai chat`
- **Deployment**: `crewai deploy create` → `crewai deploy push` — packages your code and ships it to the platform
- **Triggers**: `crewai triggers run slack/message_received` — test webhook payloads locally
- **Tool publishing**: `crewai tool publish` — tarballs your tool, base64 encodes it, uploads to their registry
- **Org management**: `crewai org switch` — multi-tenant workspace switching

## 2. Authentication — OAuth2 Device Code Flow

When you run `crewai login`:

1. CLI hits `POST /oauth/device/code` → gets a device code + verification URL
2. Opens browser for you to authenticate
3. Polls `POST /oauth/token` until you complete login
4. Gets a JWT, validates it against JWKS
5. **Encrypts** the token with Fernet symmetric encryption
6. Stores it at `%LOCALAPPDATA%/crewai/credentials/tokens.enc`

Supports WorkOS (their default), Auth0, Okta, Keycloak, EntraID — so enterprises can plug in their own identity provider via `crewai enterprise configure <url>`.

## 3. Deployment — Git-Based

`crewai deploy` doesn't upload your code directly. It:
1. Reads your `pyproject.toml` for project name
2. Reads your `.env` for secrets
3. Gets your git remote URL
4. Sends `{name, repo_clone_url, env}` to `POST /crewai_plus/api/v1/crews`
5. The platform **clones your repo** and builds it server-side

This means their platform has a build system, container infrastructure, and a way to inject your env vars at runtime.

## 4. The API Contract — Simple but Complete

Every deployed crew exposes two endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /kickoff` | Start execution. Send `{"inputs": {...}}`. Get back `{"kickoff_id": "..."}` |
| `GET /status/{kickoff_id}` | Poll for results. Returns `{"state": "PROCESSING"}` or `{"state": "SUCCESS", "result": "..."}` |

Plus **webhooks** for real-time: you pass a `webhooks` config in the kickoff request, and the platform calls your URL when `flow_finished` fires.

## 5. Conversation Persistence — `@persist()` Decorator

For stateful apps (chatbots, multi-turn interactions):

```python
@persist()
class ChatFlow(Flow[ChatState]):
    ...
```

- First call: no ID → creates new conversation, returns an ID
- Subsequent calls: include the ID → loads previous state and conversation history
- State is a Pydantic model stored server-side

## 6. Event Bus — Internal Pub/Sub

A singleton event dispatcher that lets every part of the system communicate:

- **60+ event types**: crew kickoff, agent execution, task completion, tool usage, LLM calls, memory saves, A2A delegation, flow state changes
- Handlers run in a thread pool (10 workers for sync, dedicated asyncio loop for async)
- Dependency graph ensures handlers execute in order
- Streaming events (LLM chunks) run synchronously to preserve order

## 7. Telemetry — OpenTelemetry to Their Servers

Sends spans to `https://telemetry.crewai.com:4319/v1/traces`. By default collects only structural metadata (agent count, tool names, model names). **No prompts or outputs** unless you opt in with `crew.share_crew = True`.

## 8. A2A Protocol — Agent Network Communication

Full implementation of Agent-to-Agent protocol:
- **Transport**: gRPC, HTTP+JSON, or Streamable HTTP (SSE)
- **Auth**: Simple tokens, OIDC with JWT, OAuth2, JWS signing
- **Updates**: Real-time via SSE streaming, polling with backoff, or push notifications with HMAC signing
- Agents can delegate work to remote agents on different servers

## 9. Security

- **Fingerprinting**: Every agent gets a unique UUID (deterministic from role, or random) for auditing
- **Token encryption**: Fernet for local credential storage
- **Org isolation**: `X-Crewai-Organization-Id` header on every API call

## 10. Project Decorators — The Sugar Layer

```python
@CrewBase
class MyProject:
    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def researcher(self) -> Agent: ...

    @task
    def research_task(self) -> Task: ...

    @crew
    def crew(self) -> Crew: ...
```

These decorators handle memoization, auto-instantiation, lifecycle hooks (`@before_kickoff`, `@after_kickoff`), and wiring everything together.

## 11. Frontend Patterns They Ship

- **Streamlit** — polling-based chat UI, simplest option
- **Flask + Webhooks + SSE** — real-time updates without polling
- **Slack Bot** — `slack-bolt` integration that triggers crews from Slack messages
- **MCP Server** — 2-tool FastMCP wrapper so Claude Desktop can kick off and monitor crews

---

## What's Actually Proprietary (the gap)

Everything above is in the repos. What's **not** shared:

1. The **build system** that clones your repo and containerizes it
2. The **execution runtime** that manages crew processes, scaling, restarts
3. The **Crew Studio** visual builder UI
4. The **Traces viewer** (their LangSmith equivalent)
5. The **OAuth connector marketplace** (pre-wired SaaS integrations)
6. The **billing/usage metering** system
7. The **Agent Repository** storage backend
8. The entire **web frontend** (React app at app.crewai.com)

The open-source gives you the engine, the CLI, and the patterns. The platform adds managed infrastructure and a GUI on top.
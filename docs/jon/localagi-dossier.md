# LocalAGI Dossier

## Scope

This dossier covers one repository only:
`/home/jon/BD2/external/LocalAGI`

The purpose is the same as the `OpenClaw` dossier:

to answer what this repository actually is, where its core files live, how it is operationally structured, and how useful it is as a reference for `Block Data` if the target feature set includes:

- model integration
- MCP
- skills
- memory and knowledge base behavior
- multi-agent or team behavior
- operational safety and maintainability

This is a filetree-first report.
It begins with concrete repo shape and only then moves into architectural judgment.

It also separates:

- upstream repo design
- code that actually exists
- runtime claims in the README
- local modifications in this workspace

That separation matters here because `LocalAGI` is easier to understand than `OpenClaw`, but it also hides complexity in Docker, LocalAI, and the embedded knowledge-base stack.

## Repo Snapshot

| Field | Value |
| --- | --- |
| Repo name | `LocalAGI` |
| Full path | `/home/jon/BD2/external/LocalAGI` |
| Module path | `github.com/mudler/LocalAGI` |
| License | `MIT` |
| Primary runtime | `Go` |
| Primary implementation language | `Go` |
| Secondary implementation languages | `JSX`, `JavaScript`, `CSS`, HTML |
| Declared main entry | `main.go` |
| Disk size in this workspace | `14M` |
| File count in this workspace | `232` files |
| Dominant extension | `.go` |
| Deployment shape | Docker-first app stack on top of LocalAI and LocalRecall-style KB services |
| Local status in this workspace | Compose stack is up; services report running via `docker compose ps` |

## Executive Judgment

`LocalAGI` is structurally much cleaner than `OpenClaw`.
It is not a giant personal-assistant platform.
It is a Go application that exposes an agent platform through:

- a web UI
- a REST/API surface
- a pool of configured agents
- a library of actions and connectors
- an MCP-aware runtime
- a local knowledge-base layer

The repo’s main design center is:

“self-hosted local agents with a management UI.”

That is a narrower and more legible problem than the one `OpenClaw` is solving.

If `Block Data` wants:

- a local-first agent product
- a clean way to model configured agents
- built-in knowledge base support
- connectors and actions as explicit registries
- MCP integration without a huge plugin universe

then `LocalAGI` is easier to mine for patterns than `OpenClaw`.

If `Block Data` wants:

- a broad gateway/control-plane architecture
- rich multi-surface device integration
- deep operator auth surfaces
- a sprawling extension marketplace model

then `LocalAGI` is materially less complete than `OpenClaw`.

My direct judgment is:

`LocalAGI` is a better reference for a productized “agent management app” than for a general-purpose assistant platform.

For `Block Data`, that is probably a good thing.
Its value is not breadth.
Its value is that the repo expresses its concerns in a more compact and legible way.

The strongest lessons in `LocalAGI` are:

1. agent pool and config modeling
2. service registries for actions and connectors
3. MCP session ingestion into agent tools
4. integrated skills via an in-process skillserver bridge
5. built-in knowledge base and compaction logic
6. web UI and OpenAI-compatible API in one coherent application shell

The weakest areas, relative to `OpenClaw`, are:

1. smaller security and trust-boundary story
2. less formal plugin/runtime isolation
3. more hidden operational complexity in the Docker stack than the code layout suggests

## Classification

### What LocalAGI Is

`LocalAGI` is best classified as:

- a self-hosted agent application
- written primarily in Go
- with a built-in management web UI
- backed by LocalAI for model serving
- with optional local knowledge base support
- exposing agent behavior through action, connector, and skill registries

It is also:

- local-first
- configuration-driven
- container-oriented
- product-shaped rather than library-shaped

### What LocalAGI Is Not

It is not primarily:

- a generic inference server
- a giant plugin marketplace
- a multi-device personal-assistant control plane
- a minimal code-only agent SDK
- a strict enterprise multi-tenant orchestration system

That matters because the repo is easy to mistake for “just a UI around LocalAI.”
It is more than that.
It has real agent runtime code.
But it is still narrower than `OpenClaw`.

## Basic Physical Shape Of The Repository

At the highest level, the repository has four main layers:

1. Go runtime and CLI
2. core agent/state logic
3. service registries and integrations
4. web UI and API shell

That shape is much more conventional than `OpenClaw`.

The key root-level directories are:

- `cmd`
- `core`
- `pkg`
- `services`
- `webui`
- `tests`
- `example`

The highest-value directories for architecture work are:

- `core`
- `services`gents
- built-in knowledge base support
- `pkg`

The repo is small enough that you can understand most of it by reading the main files in those four directories.

## Filetree-First Anatomy

### Root-Level Intent

The root tells a straightforward story.

Files like these define the executable and deployment contract:

- `main.go`
- `go.mod`
- `README.md`
- `docker-compose.yaml`
- `Dockerfile.webui`
- `Dockerfile.sshbox`

Files like these show the repo is packaged as a real application:

- `Makefile`
- `.goreleaser.yml`
- `.github/workflows/*`

Files like these indicate runtime variants:

- `docker-compose.nvidia.yaml`
- `docker-compose.intel.yaml`
- `docker-compose.amd.yaml`

That immediately tells you that hardware-aware deployment is part of the product story.

### The Real Center Of Gravity

The most important directories by implementation role are:

- `core`
- `services`
- `webui`
- `pkg`

The largest source concentrations in those directories are:

- `core/agent`
- `services/actions`
- `services/connectors`
- `webui`

By file count:

- `core/agent` has `15` files
- `core/types` has `8`
- `core/action` has `7`
- `core/scheduler` has `6`
- `services/actions` has `41`
- `services/connectors` has `12`
- `pkg/vectorstore` has `3`
- `pkg/llm` has `2`

This distribution matters.
It says:

- the agent runtime exists, but is compact
- the capability surface is dominated by actions
- connectors are present but not structurally dominant
- the app is easier to reason about than `OpenClaw` because the code count is smaller and responsibilities are more concentrated

## Core Entry Points

### Main Process Entry

The main entrypoint is:
`/home/jon/BD2/external/LocalAGI/main.go`

It is intentionally thin:

```go
func main() {
    cmd.Execute()
}
```

That means command bootstrapping is delegated to `cmd`, not spread across the repo.

### CLI Layer

The CLI layer lives under:
`/home/jon/BD2/external/LocalAGI/cmd`

This is already more conventional than `OpenClaw`.
There is a Cobra-based command surface with an `agent` subcommand family.

The standout command is:

- `agent run`

It supports:

- running an agent by name from the pool registry
- running an agent from a JSON config file
- running an agent in foreground mode with a single prompt

That tells you the application supports both:

- long-lived managed agents
- direct one-shot agent execution

### Web App Entry

The web application entry is:
`/home/jon/BD2/external/LocalAGI/webui/app.go`

The route registration lives in:
`/home/jon/BD2/external/LocalAGI/webui/routes.go`

This split is clean:

- `app.go` defines the app shell
- `routes.go` defines the HTTP surface

### State And Agent Pool Entry

The most important runtime orchestration file is:
`/home/jon/BD2/external/LocalAGI/core/state/pool.go`

That file is central because it models:

- the agent registry
- agent lifecycle creation and recreation
- pool persistence
- default model and API settings
- connectors, actions, prompts, filters, and skills service injection
- optional RAG provider injection

If `OpenClaw` is gateway-first, `LocalAGI` is pool-first.
That is the best way to understand the architecture.

## Operational Structure

### Deployment Model

The default Docker Compose stack includes:

- `localai`
- `postgres`
- `sshbox`
- `dind`
- `localagi`

This is a more complex runtime than the repo’s small size suggests.

The stack means:

- `LocalAI` provides model-serving and embedding APIs
- `postgres` backs the knowledge-base vector engine in the default compose file
- `sshbox` provides an execution target
- `dind` provides nested Docker access
- `localagi` serves the app and API

That is an important lesson for `Block Data`.

The codebase is simpler than `OpenClaw`.
The runtime stack is not necessarily simpler.

### Published Ports In This Workspace

The current local compose stack reports:

- `localagi` on `8083 -> 3000`
- `localai` on `8081 -> 8080`
- `postgres` on `5433 -> 5432`
- `sshbox` on a high published SSH port

Fresh `docker compose ps` in this workspace shows those services as running.

However, from this shell, direct `curl` to:

- `127.0.0.1:8083`
- `127.0.0.1:8081`

still failed with connection refusal.

So the local dossier must distinguish between:

- Docker-level service state: up
- host-shell HTTP verification from this environment: not confirmed

That is not a repository design issue by itself.
It is a local runtime observation.

### Build And Packaging Model

`LocalAGI` is a Go application with a separate frontend.

The repo includes:

- Go server code
- a React frontend under `webui/react-ui`
- Dockerfiles for the web UI and helper containers

That means the product is not “just Go.”
It is:

- Go for runtime and API
- React for the operator UI
- Docker for packaged delivery

This is a conventional full-stack application shape.

## Standardized Feature Assessment For Block Data

This section answers the useful part:

What does `LocalAGI` offer as a reference for `Block Data` agent features?

### 1. Model Integration

`LocalAGI` uses an OpenAI-compatible client abstraction, but it assumes a more uniform model protocol than `OpenClaw`.

Important files:

- `pkg/llm/client.go`
- `core/state/config.go`
- `core/state/pool.go`
- `README.md`
- `docker-compose.yaml`

The key model configuration fields in `AgentConfig` are:

- `model`
- `multimodal_model`
- `transcription_model`
- `tts_model`
- `api_url`
- `api_key`

That design is simple and practical.
It does not model a large provider catalog internally.
Instead, it expects an OpenAI-compatible server, usually `LocalAI`.

That is a significant architectural difference from `OpenClaw`.

`OpenClaw` models many provider dialects explicitly.
`LocalAGI` normalizes the problem by standing on an OpenAI-compatible backend.

For `Block Data`, this is a strong design if:

- you control the model-serving layer
- you want fewer provider differences in application code

It is a weaker design if:

- you need rich multi-provider auth and catalog handling directly in the app

The key lesson is:

`LocalAGI` pushes model heterogeneity downward into infrastructure.

That is often the right choice for product teams.

### 2. MCP

`LocalAGI` has real MCP support, but its form is more direct than `OpenClaw`.

Important files:

- `core/agent/mcp.go`
- `core/state/config.go`
- `services/skills/service.go`

The agent config includes:

- `mcp_servers`
- `mcp_stdio_servers`
- `mcp_prepare_script`

The runtime then does three important things:

1. connects to remote MCP servers over HTTP or SSE
2. connects to stdio MCP servers via subprocess commands
3. injects tools from those MCP sessions into the agent action space

That is a clean and useful architecture.
It is less sophisticated than `OpenClaw`’s bundle-mapping and config-management layer, but it is easier to follow.

The best `Block Data` lesson here is:

keep MCP integration close to agent tool ingestion unless you truly need a full separate MCP management plane.

`LocalAGI` also uses MCP for skills through an in-process skills server.
That is one of the repo’s most elegant design choices.

### 3. Skills

The skills story is stronger than the small code footprint suggests.

Important files:

- `services/skills/service.go`
- `services/skills/prompt.go`
- `webui/skills_handlers.go`
- `README.md`

The repo uses `skillserver`.
Skills live under:

- `stateDir/skills`

The `Service` object does four things:

1. manages the skills directory
2. lazily builds a skill manager
3. exposes a dynamic prompt that injects the available skills
4. exposes an in-process MCP session backed by the skillserver

That is a very strong pattern.

Unlike `OpenClaw`, which has a broad bundled skill universe and more elaborate gating, `LocalAGI` treats skills as:

- managed content
- indexed by a skill manager
- optionally injected into prompt context
- made callable via MCP

For `Block Data`, this is one of the most portable ideas in the repo.

Why it matters:

- skills are not just text snippets
- they are operational assets with a manager and a tool-serving path
- the UI can manage them cleanly

This is a better design than baking every skill into product code.

### 4. Memory And Knowledge Base

This is one of the repo’s biggest strengths.

Important files:

- `core/agent/knowledgebase.go`
- `core/state/compaction.go`
- `pkg/vectorstore/*`
- `pkg/localrag/client.go`
- `webui/collections/*`
- `webui/collections_handlers.go`
- `README.md`

The repo distinguishes several memory concepts:

- conversation logging
- long-term memory
- summary memory
- knowledge base retrieval
- compaction of KB entries

The `knowledgebase.go` file shows two key behaviors:

1. retrieval at query time by searching the KB with the latest user message
2. storage of prior conversations into memory according to a configurable policy

The storage modes include:

- whole conversation
- user and assistant messages
- user-only

That is a mature design.
It acknowledges that memory is not one thing.

The compaction layer is also meaningful.
`core/state/compaction.go` groups knowledge-base entries by period and optionally summarizes them through the LLM before storing a compacted result and deleting the originals.

That is not just retrieval.
That is memory maintenance.

For `Block Data`, this is highly relevant.
If you expect long-lived agents, memory without maintenance becomes a liability.

The repo also provides an operator-facing KB UI through the collections routes.
That means memory is not hidden state only.
It is part of the management surface.

### 5. Actions

The action system is one of the clearest subsystems in the repo.

Important files:

- `services/actions.go`
- `services/actions/*`

The action catalog is explicit.
It includes actions such as:

- search
- browse
- scrape
- shell command
- call agents
- generate image
- generate song
- generate PDF
- GitHub issue and PR operations
- memory actions
- webhook
- email

This is a good design for `Block Data` because:

- the action catalog is inspectable
- defaults are structured
- configuration metadata exists for the UI
- action logic is not hidden in prompt code

The action layer in `LocalAGI` is easier to read than `OpenClaw`’s larger tool universe.

### 6. Connectors

The connector system is also simple and explicit.

Important files:

- `services/connectors.go`
- `services/connectors/*`

Supported connectors in the current repo include:

- IRC
- Telegram
- Slack
- Discord
- GitHub issues
- GitHub PRs
- Twitter
- Matrix
- Email

Unlike `OpenClaw`, the connector surface here is modest.
That is a virtue for comprehension.

For `Block Data`, the lesson is:

connectors can be modeled as declarative agent attachments, not as the architectural center of the system.

### 7. Agent Orchestration

`LocalAGI` does have multi-agent thinking, but it expresses it more simply than `OpenClaw`.

Important files:

- `core/state/pool.go`
- `core/agent/agent.go`
- `services/actions/callagents.go`
- `README.md`

The orchestrator is the `AgentPool`.
That pool owns:

- the registry of configured agents
- agent lifecycle
- defaults for model and API wiring
- injected service factories
- optional skills and RAG providers

This is a strong application-level abstraction.

For `Block Data`, the pool model is probably more directly portable than `OpenClaw`’s gateway model if the product needs:

- many configured internal agents
- one management UI
- one model-serving backend
- one shared operator environment

### 8. Web UI And API

The `webui` directory matters more than it first appears.

Important files:

- `webui/app.go`
- `webui/routes.go`
- `webui/react-ui/src/*`

This layer serves:

- the management UI
- agent CRUD
- skills CRUD
- knowledge base CRUD
- SSE status streaming
- OpenAI Responses-compatible endpoint

That last point is important.
The application is not just a dashboard.
It also exposes an API surface for agent interaction.

For `Block Data`, that is a useful example of how to combine:

- operator UI
- runtime API
- observability

without splitting them into separate repos.

## Where The Repo Is Actually Deep

The deepest areas are:

- agent pool and state modeling
- actions catalog
- knowledge base and compaction behavior
- web management and API routes
- skills service integration

The shallower areas are:

- provider heterogeneity
- security boundary sophistication
- plugin contract richness
- native app or device surfaces

This matters because you should read the repo according to where it is truly deep, not where it advertises features.

If you want architecture lessons, start with:

- `core/state/pool.go`
- `core/state/config.go`
- `core/agent/agent.go`
- `core/agent/mcp.go`
- `core/agent/knowledgebase.go`
- `services/actions.go`
- `services/connectors.go`
- `services/skills/service.go`
- `webui/routes.go`
- `core/state/compaction.go`

## Top-Level Directory Assessment

### `cmd`

This is a small and conventional Cobra command layer.
It is not overcomplicated.
That is a positive sign.

### `core`

This is the real backend heart of the repo.
If `Block Data` wants to understand the runtime, this is the first place to read.

### `pkg`

This is utility and infrastructure code:

- LLM client
- vectorstore
- LocalRAG client
- config helpers

It supports the runtime but is not the product center.

### `services`

This is one of the most important directories.
It turns abstract capability categories into explicit registries:

- actions
- connectors
- prompts
- filters
- skills

That makes the runtime composable without a huge plugin framework.

### `webui`

This directory is large relative to the repo.
That tells you the project is serious about operator management, not just backend execution.

It contains both:

- Go-side routing and handlers
- a React frontend

### `tests`

The test surface exists but is not huge.
There is an end-to-end test directory, plus unit tests spread through core and services packages.

This is fine for a product repo of this size, but it is not a massive formal verification effort.

## Local Workspace Notes

This local checkout differs from upstream in two tracked files:

- `docker-compose.yaml`
- `webui/collections_backend_http.go`

Those are local modifications from earlier bring-up work.

This matters because the dossier should not pretend those edits are upstream architectural choices.

In this workspace:

- `docker compose ps` shows the stack as up
- `localagi`, `localai`, `postgres`, `sshbox`, and `dind` are running
- host-side `curl` from this shell to `127.0.0.1:8083` and `127.0.0.1:8081` still failed

So the application is locally staged, but host-shell HTTP reachability remains environment-dependent from this terminal.

## Fit For Block Data

### If Block Data Wants A Productized Agent Console

If `Block Data` wants:

- a web-managed agent product
- actions and connectors as structured registries
- integrated knowledge base
- MCP support
- a manageable self-hosted runtime

then `LocalAGI` is a strong reference.

### If Block Data Wants A Large Assistant Control Plane

If the target is a broad personal-assistant or multi-surface control plane, `OpenClaw` remains the stronger reference.

`LocalAGI` is simply solving a narrower problem.

### Highest-Value Concepts To Borrow

If I were translating this repo into `Block Data` design work, I would borrow:

1. the `AgentPool` abstraction
2. explicit `AgentConfig` modeling
3. the service-registry pattern for actions and connectors
4. the skillserver-based skills bridge
5. operator-visible knowledge base management
6. memory compaction as a first-class lifecycle concern
7. one application shell that serves both UI and runtime APIs

### Parts I Would Not Copy Directly

I would avoid copying these blindly:

1. the full helper-container stack with `dind` and `sshbox`
2. the assumption that all model serving is normalized through one OpenAI-compatible backend
3. the smaller security surface without stronger tenant isolation
4. the product’s specific no-code framing if `Block Data` is more engineering-heavy

## Recommendation

My recommendation is:

Use `LocalAGI` as the cleaner product-application comparator to `OpenClaw`.

If `OpenClaw` shows what a broad assistant platform looks like, `LocalAGI` shows what a focused agent-management application looks like.

For `Block Data`, `LocalAGI` is the more directly portable reference if the goal is:

- “build agent features into a product with a web UI”

rather than:

- “build a full personal-assistant gateway ecosystem”

That makes it especially useful for:

- agent configuration design
- action and connector registries
- integrated knowledge base management
- skill lifecycle and MCP bridging

## Reading Order For A Future Block Data Engineer

If a `Block Data` engineer had one day to read this repo, I would suggest:

1. `README.md`
2. `go.mod`
3. `docker-compose.yaml`
4. `main.go`
5. `cmd/*`
6. `core/state/config.go`
7. `core/state/pool.go`
8. `core/agent/agent.go`
9. `core/agent/mcp.go`
10. `core/agent/knowledgebase.go`
11. `core/state/compaction.go`
12. `services/actions.go`
13. `services/connectors.go`
14. `services/skills/service.go`
15. `webui/routes.go`
16. `webui/app.go`

That path gets you from execution entry to runtime composition to management shell.

## Final Verdict

`LocalAGI` is smaller, clearer, and more application-shaped than `OpenClaw`.
Its main value is not breadth.
Its value is that the repo expresses a complete local-agent product in a compact way:

- configured agents
- one pool
- one management UI
- one model-serving substrate
- one knowledge-base subsystem
- one action and connector registry
- one MCP-capable runtime

If I had to summarize it in one line:

`LocalAGI` is a Go-based, self-hosted agent management application whose best transferable value lies in its compact pool/state architecture, service registries, and integrated skills-and-knowledge-base design.

---

## Appendix A: Root Inventory

```text
.dockerignore
.git
.github
.gitignore
.goreleaser.yml
.state
Dockerfile.realtimesst
Dockerfile.sshbox
Dockerfile.webui
LICENSE
Makefile
README.md
cmd
core
docker-compose.amd.yaml
docker-compose.intel.yaml
docker-compose.nvidia.yaml
docker-compose.yaml
example
go.mod
go.sum
jsconfig.json
main.go
pkg
services
slack.yaml
start_realtimesst.sh
tests
webui
```

## Appendix B: Top-Level Size Distribution

```text
4.0K	.dockerignore
4.0K	.gitignore
4.0K	.goreleaser.yml
4.0K	.state
4.0K	Dockerfile.realtimesst
4.0K	Dockerfile.sshbox
4.0K	Dockerfile.webui
4.0K	LICENSE
4.0K	Makefile
4.0K	docker-compose.amd.yaml
4.0K	docker-compose.intel.yaml
4.0K	docker-compose.nvidia.yaml
4.0K	docker-compose.yaml
4.0K	jsconfig.json
4.0K	main.go
4.0K	slack.yaml
4.0K	start_realtimesst.sh
8.0K	go.mod
12K	example
24K	tests
28K	.github
32K	cmd
36K	README.md
52K	go.sum
132K	pkg
380K	core
524K	services
4.5M	webui
7.7M	.git
```

## Appendix C: Root Directory Tree At Max Depth 2

```text
.
.git
.git/hooks
.git/info
.git/logs
.git/objects
.git/refs
.github
.github/workflows
.state
cmd
core
core/action
core/agent
core/conversations
core/scheduler
core/sse
core/state
core/types
example
example/custom_actions
pkg
pkg/client
pkg/config
pkg/deepface
pkg/llm
pkg/localrag
pkg/utils
pkg/vectorstore
pkg/xstrings
services
services/actions
services/connectors
services/filters
services/prompts
services/skills
tests
tests/e2e
webui
webui/collections
webui/public
webui/react-ui
webui/types
webui/views
```

## Appendix D: Extension Mix

```text
151 go
38 jsx
10 js
6 css
5 yaml
4 html
3 png
2 svg
2 md
2 json
1 webui
1 sum
1 sshbox
1 sh
1 realtimesst
1 mod
1 lock
```

## Appendix E: Core Subtree File Counts

```text
15 agent
8 types
7 action
6 scheduler
4 state
3 conversations
1 sse
```

## Appendix F: Services Subtree File Counts

```text
41 actions
12 connectors
2 skills
2 prompts
2 filters
```

## Appendix G: `pkg` Subtree File Counts

```text
4 xstrings
4 client
3 vectorstore
2 utils
2 llm
1 localrag
1 deepface
1 config
```

## Appendix H: `core/agent` Files

```text
core/agent/actions.go
core/agent/agent.go
core/agent/agent_suite_test.go
core/agent/agent_test.go
core/agent/identity.go
core/agent/knowledgebase.go
core/agent/mcp.go
core/agent/merge_test.go
core/agent/observer.go
core/agent/options.go
core/agent/prompt.go
core/agent/scheduler_executor.go
core/agent/state.go
core/agent/state_test.go
core/agent/templates.go
```

## Appendix I: `core/state` Files

```text
core/state/compaction.go
core/state/config.go
core/state/internal.go
core/state/pool.go
```

## Appendix J: `services/actions` Files

```text
services/actions/actions_suite_test.go
services/actions/browse.go
services/actions/callagents.go
services/actions/counter.go
services/actions/genimage.go
services/actions/genimage_test.go
services/actions/genpdf.go
services/actions/genpdf_markdown.go
services/actions/genpdf_test.go
services/actions/gensong.go
services/actions/githubissuecloser.go
services/actions/githubissuecomment.go
services/actions/githubissueedit.go
services/actions/githubissuelabeler.go
services/actions/githubissueopener.go
services/actions/githubissuereader.go
services/actions/githubissuesearch.go
services/actions/githubprcommenter.go
services/actions/githubprcreator.go
services/actions/githubprcreator_test.go
services/actions/githubprreader.go
services/actions/githubprreviewer.go
services/actions/githubprreviewer_test.go
services/actions/githubrepositorycreateupdatecontent.go
services/actions/githubrepositorygetallcontent.go
services/actions/githubrepositorygetallcontent_test.go
services/actions/githubrepositorygetcontent.go
services/actions/githubrepositorylistfiles.go
services/actions/githubrepositoryreadme.go
services/actions/githubrepositorysearchfiles.go
services/actions/memory.go
services/actions/memory_test.go
services/actions/pikvm.go
services/actions/scrape.go
services/actions/search.go
services/actions/sendmail.go
services/actions/sendtelegrammessage.go
services/actions/shell.go
services/actions/twitter_post.go
services/actions/webhook.go
services/actions/wikipedia.go
```

## Appendix K: `services/connectors` Files

```text
services/connectors/common/status.go
services/connectors/connectors_suite_test.go
services/connectors/discord.go
services/connectors/email.go
services/connectors/githubissue.go
services/connectors/githubpr.go
services/connectors/irc.go
services/connectors/matrix.go
services/connectors/slack.go
services/connectors/telegram.go
services/connectors/twitter.go
services/connectors/twitter/client.go
```

## Appendix L: `services/skills` Files

```text
services/skills/prompt.go
services/skills/service.go
```

## Appendix M: `pkg/vectorstore` Files

```text
pkg/vectorstore/chromem.go
pkg/vectorstore/localai.go
pkg/vectorstore/store.go
```

## Appendix N: `webui` Backend Files

```text
webui/app.go
webui/collections/inprocess.go
webui/collections/rag_provider.go
webui/collections/state.go
webui/collections/types.go
webui/collections_backend.go
webui/collections_backend_http.go
webui/collections_backend_inprocess.go
webui/collections_handlers.go
webui/collections_internal.go
webui/elements.go
webui/options.go
webui/public/logo_1.png
webui/react-ui/.gitignore
webui/react-ui/README.md
webui/react-ui/bun.lock
webui/react-ui/eslint.config.js
webui/react-ui/index.html
webui/react-ui/package.json
webui/react-ui/vite.config.js
webui/routes.go
webui/skills_handlers.go
webui/types/openai.go
webui/views/login.html
webui/views/views.go
```

## Appendix O: `webui/react-ui/src` Files

```text
webui/react-ui/src/App.css
webui/react-ui/src/App.jsx
webui/react-ui/src/assets/react.svg
webui/react-ui/src/components/ActionForm.jsx
webui/react-ui/src/components/AgentForm.jsx
webui/react-ui/src/components/CollapsibleRawSections.jsx
webui/react-ui/src/components/ConfigForm.jsx
webui/react-ui/src/components/ConnectorForm.jsx
webui/react-ui/src/components/DynamicPromptForm.jsx
webui/react-ui/src/components/FilterForm.jsx
webui/react-ui/src/components/Sidebar.jsx
webui/react-ui/src/components/ThemeToggle.jsx
webui/react-ui/src/contexts/ThemeContext.jsx
webui/react-ui/src/hooks/useAgent.js
webui/react-ui/src/hooks/useChat.js
webui/react-ui/src/hooks/useSSE.js
webui/react-ui/src/index.css
webui/react-ui/src/main.jsx
webui/react-ui/src/pages/ActionsPlayground.jsx
webui/react-ui/src/pages/AgentSettings.jsx
webui/react-ui/src/pages/AgentStatus.jsx
webui/react-ui/src/pages/AgentsList.jsx
webui/react-ui/src/pages/Chat.jsx
webui/react-ui/src/pages/CreateAgent.jsx
webui/react-ui/src/pages/GroupCreate.jsx
webui/react-ui/src/pages/Home.jsx
webui/react-ui/src/pages/ImportAgent.jsx
webui/react-ui/src/pages/Knowledge.jsx
webui/react-ui/src/pages/SkillEdit.jsx
webui/react-ui/src/pages/Skills.jsx
webui/react-ui/src/router.jsx
webui/react-ui/src/theme.css
webui/react-ui/src/utils/api.js
webui/react-ui/src/utils/config.js
```

## Appendix P: Root `services` Registry Files

```text
services/actions.go
services/common.go
services/connectors.go
services/filters.go
services/prompts.go
```

## Appendix Q: Tests Inventory

```text
tests/e2e/e2e_suite_test.go
tests/e2e/e2e_test.go
```

## Appendix R: Local Workspace Diff

```text
M docker-compose.yaml
M webui/collections_backend_http.go
```

## Appendix S: Current Compose Runtime Snapshot

```text
NAME                  IMAGE                                          COMMAND                  SERVICE    CREATED          STATUS                    PORTS
localagi-dind-1       docker:dind                                    "dockerd-entrypoint.…"   dind       52 minutes ago   Up 52 minutes (healthy)   2375-2376/tcp
localagi-localagi-1   localagi-localagi                              "/localagi serve"        localagi   52 minutes ago   Up 49 minutes             0.0.0.0:8083->3000/tcp, [::]:8083->3000/tcp
localagi-localai-1    localai/localai:master                         "/entrypoint.sh gemm…"   localai    52 minutes ago   Up 52 minutes (healthy)   0.0.0.0:8081->8080/tcp, [::]:8081->8080/tcp
localagi-postgres-1   quay.io/mudler/localrecall:v0.5.2-postgresql   "/usr/local/bin/post…"   postgres   52 minutes ago   Up 52 minutes (healthy)   0.0.0.0:5433->5432/tcp, [::]:5433->5432/tcp
localagi-sshbox-1     localagi-sshbox                                "/start.sh"              sshbox     52 minutes ago   Up 52 minutes             0.0.0.0:39005->22/tcp, [::]:39005->22/tcp
```

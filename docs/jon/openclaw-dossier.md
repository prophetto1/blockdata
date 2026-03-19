# OpenClaw Dossier

## Scope

This dossier covers one repository only:
`/home/jon/BD2/external/openclaw`

The goal is not to restate the README.
The goal is to answer a more useful question:

If `Block Data` wants to add agent features at the level of model integration, MCP, skills, memory optimization, session orchestration, and operational safety, what exactly does `OpenClaw` contain, how is it structured, and what parts are worth copying, adapting, or ignoring?

This is a filetree-first report.
It starts with the concrete shape of the repo, then works upward into architecture, then ends with a judgment about fit.

This report distinguishes between:

- upstream repo structure
- product claims in docs
- code that actually exists in the tree
- local runtime state in this workspace

That distinction matters because `OpenClaw` is broad enough that it is easy to overestimate or underestimate what it really is.

## Repo Snapshot

| Field | Value |
| --- | --- |
| Repo name | `openclaw` |
| Full path | `/home/jon/BD2/external/openclaw` |
| Version in `package.json` | `2026.3.14` |
| License | `MIT` |
| Primary runtime | `Node.js` |
| Primary implementation language | `TypeScript` |
| Secondary implementation languages | `Swift`, `Kotlin`, `Go`, `Python`, shell |
| Declared CLI binary | `openclaw` via `openclaw.mjs` |
| Main built entry | `dist/index.js` |
| Disk size in this workspace | `423M` |
| File count in this workspace | `9095` files |
| Dominant extension | `.ts` |
| Deployment shape | local gateway plus CLI plus optional apps/nodes |
| Local status in this workspace | gateway runs at `127.0.0.1:18789` |

## Executive Judgment

`OpenClaw` is not a narrow agent library.
It is a gateway-centered assistant platform.

That distinction drives almost every architectural choice in the repo.
It is optimized for an always-on, operator-controlled, multi-surface personal assistant that can:

- accept inbound messages from many chat systems
- maintain per-agent and per-session state
- expose tools through a gateway
- use skills and plugins as a large extension surface
- route work across channels, devices, browser control, cron, and nodes

If the `Block Data` goal is:

- “give our product one good internal agent with tools”

then `OpenClaw` is too broad to adopt as-is.

If the `Block Data` goal is:

- “study a full assistant platform and borrow its best patterns for routing, skill gating, MCP management, memory lifecycle, and operator safety”

then `OpenClaw` is one of the richest codebases in this workspace for that purpose.

My direct judgment is:

`OpenClaw` is a strong reference architecture, not a good drop-in dependency target.

For `Block Data`, the repo is most valuable in six areas:

1. gateway-centered orchestration
2. model catalog plus provider plugin augmentation
3. skill loading and eligibility gating
4. MCP server configuration and bundle mapping
5. session persistence plus compaction lifecycle
6. explicit operator safety controls around auth, approvals, and tool reach

It is least attractive in three areas:

1. product scope is far larger than most business applications need
2. the repository mixes core runtime, native apps, channels, docs, plugin formats, and UI in one tree
3. the security model is intentionally “personal assistant / trusted operator,” not clean hostile multi-tenant isolation

That means the right way to use `OpenClaw` as input to `Block Data` is selective extraction:

- study the patterns
- reuse the abstractions that fit
- do not copy the entire operational envelope

## Classification

### What OpenClaw Is

`OpenClaw` is best classified as:

- a personal assistant platform
- built around a local gateway control plane
- with a TypeScript core runtime
- extended by plugins, skills, bundled integrations, and device nodes
- with both CLI and web/operator surfaces

It is also:

- multi-channel
- multi-agent
- stateful
- operationally opinionated

### What OpenClaw Is Not

It is not primarily:

- a lightweight SDK
- a cleanly isolated inference server
- a single-process chat app
- a strict multi-tenant enterprise control plane
- a minimal embedded agent framework

That matters for `Block Data`.
If `Block Data` wants to embed agent capabilities into an existing product, the repo offers many reusable ideas, but it is not shaped like a small embeddable subsystem.

## Basic Physical Shape Of The Repository

At the highest level, the repository has five different personalities at once:

1. a TypeScript gateway/runtime repo
2. an extension and provider catalog
3. a skills registry and skill runtime
4. a set of native/mobile apps
5. a heavy documentation and operational tooling surface

That explains why the repo feels “big” before you even inspect the code.
It is big because it solves a platform problem, not a single feature problem.

The largest top-level code-bearing directories are:

- `src`
- `extensions`
- `docs`
- `apps`
- `ui`
- `skills`
- `scripts`
- `vendor`

The largest source concentration is under `src`.
The largest extension concentration is under `extensions`.
The largest “user teachability” surface is under `skills` and `docs`.

## Filetree-First Anatomy

### Root-Level Intent

The root of the repo tells you a lot before you read any code.

Files like these define the product contract:

- `README.md`
- `VISION.md`
- `SECURITY.md`
- `package.json`
- `docker-compose.yml`
- `openclaw.mjs`

Files like these define the repo as a large maintained production codebase:

- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `vitest.*.ts`
- `.github/workflows/*`
- `.pre-commit-config.yaml`
- `.detect-secrets.cfg`
- `.secrets.baseline`

Files like these indicate multi-runtime or multi-platform ambitions:

- `Dockerfile`
- `Dockerfile.sandbox`
- `Dockerfile.sandbox-browser`
- `pyproject.toml`
- `apps/*`
- `Swabble/*`

### The Real Center Of Gravity

The center of gravity is:
`/home/jon/BD2/external/openclaw/src`

That directory alone is about `40M` on disk in this workspace and contains the platform runtime.

By file count, the heaviest subtrees under `src` are:

- `agents` with `919` files
- `infra` with `495` files
- `gateway` with `371` files
- `commands` with `368` files
- `cli` with `310` files
- `auto-reply` with `305` files
- `config` with `246` files
- `channels` with `200` files
- `plugins` with `192` files
- `plugin-sdk` with `178` files
- `browser` with `158` files
- `cron` with `110` files
- `memory` with `103` files

That distribution is more revealing than a feature list.
It says the product is structurally dominated by:

- agent runtime behavior
- infrastructure glue
- gateway/control plane
- command surfaces
- plugin/runtime integration
- session and reply machinery

In other words, `OpenClaw` is operational software first.

## Core Entry Points

### CLI Entry

The public CLI entrypoint is:
`/home/jon/BD2/external/openclaw/openclaw.mjs`

The `package.json` declares:

- `bin.openclaw = "openclaw.mjs"`
- `main = "dist/index.js"`

That means the development and packaging model is:

- a thin executable wrapper at the root
- a compiled runtime under `dist/`
- source of truth under `src/`

### Gateway Entry

The Docker runtime shows the main operational entry:

`node dist/index.js gateway --bind ${OPENCLAW_GATEWAY_BIND:-lan} --port 18789`

That makes the gateway the actual long-running process.
The CLI is a client or operator surface around it.

### Gateway Implementation Entry

The central implementation file for the live server is:
`/home/jon/BD2/external/openclaw/src/gateway/server.impl.ts`

This file matters because it is where many platform subsystems are wired together:

- config loading
- auth setup
- control UI asset setup
- skills change listeners
- plugin loading
- model catalog loading
- node registry
- exec approvals
- Tailscale exposure
- channel management
- cron services
- secret runtime activation

If you want to know how the product actually boots, this is one of the first files to read.

## Operational Structure

### Deployment Model

The repo ships a simple Docker Compose layout with two services:

- `openclaw-gateway`
- `openclaw-cli`

That tells you the repo thinks in terms of:

- one long-running control-plane service
- one transient operator client

The gateway mounts:

- a config directory
- a workspace directory

inside:

- `/home/node/.openclaw`
- `/home/node/.openclaw/workspace`

That is a clean clue about runtime persistence boundaries.
Config and workspace are explicit.

### Runtime Ownership Model

The session deep-dive doc is blunt:
the gateway is the source of truth.

That is the correct way to read this repo.
The gateway owns:

- session state
- transcript files
- config state
- model/runtime view
- control-plane events

Everything else is a client, node, UI, tool surface, or plugin surface around that core.

That is a good architecture for an always-on assistant.
It is also a strong pattern for `Block Data` if the future agent needs:

- durable state
- central orchestration
- multiple operator surfaces
- auditable configuration

### Build Model

The README’s source workflow is straightforward:

- `pnpm install`
- `pnpm ui:build`
- `pnpm build`
- `pnpm openclaw onboard --install-daemon`
- `pnpm gateway:watch`

That means:

- the UI is its own build concern
- the repo is not “just TypeScript”
- dev mode runs source directly
- production mode expects compiled output

## Standardized Feature Assessment For Block Data

This section answers the most useful question:

If `Block Data` wants to add advanced agent features, where is `OpenClaw` strong, where is it structurally opinionated, and where would it fight the product?

### 1. Model Integration

`OpenClaw` has a serious model layer.
It is not a thin `if provider == X` abstraction.

The main high-value files are:

- `src/config/types.models.ts`
- `src/agents/model-catalog.ts`
- `src/gateway/server-model-catalog.ts`
- `src/plugins/provider-runtime.ts`
- `src/plugins/provider-discovery.ts`
- `src/plugins/provider-model-definitions.ts`
- `src/plugins/provider-validation.ts`
- provider extensions under `extensions/*`

From `src/config/types.models.ts`, the repo explicitly models:

- model APIs
- provider auth modes
- provider base URLs
- per-provider model definitions
- compatibility flags for tool calling and reasoning formats

The supported model API shapes listed in config are:

- `openai-completions`
- `openai-responses`
- `openai-codex-responses`
- `anthropic-messages`
- `google-generative-ai`
- `github-copilot`
- `bedrock-converse-stream`
- `ollama`

That is stronger than many repos because it acknowledges protocol differences directly.
It does not pretend every provider is the same.

`src/agents/model-catalog.ts` is also worth attention.
It loads a model registry, merges configured providers, and augments the catalog with provider plugins.

That is an important pattern for `Block Data`:

- core model catalog
- plugin-based augmentation
- config-based opt-in models
- provider-specific suppression or enhancement

This is a better design than hardcoding a flat provider list in product code.

For `Block Data`, the specific lesson is:

keep model selection and model capability metadata separate from chat execution logic.

### 2. MCP And Tooling

`OpenClaw` has real MCP support.
This is not marketing language.

Important files:

- `src/config/types.mcp.ts`
- `src/config/mcp-config.ts`
- `src/auto-reply/reply/commands-mcp.ts`
- `src/agents/pi-bundle-mcp-tools.ts`
- `src/plugins/bundle-mcp.ts`
- `docs/plugins/bundles.md`

The config surface is simple and useful:

- named MCP servers
- command, args, env, cwd, URL

The more interesting part is not config.
It is how bundle content is mapped into native runtime surfaces.

`OpenClaw` supports bundle plugins from:

- Codex
- Claude
- Cursor

but does not blindly execute them in-process.
It treats them as content and metadata packs, then maps supported surfaces into native `OpenClaw` behavior.

That trust boundary is one of the smartest parts of the repo.

For `Block Data`, this matters a lot.
If you want MCP, external tools, or partner-provided agent bundles, the safe default is not:

- “load and run arbitrary runtime code”

The safer default is:

- accept structured content
- normalize it
- selectively map it into trusted internal runtime surfaces

That is exactly the pattern `OpenClaw` uses for bundle plugins.

### 3. Skills

The skills system is a first-class subsystem, not an afterthought.

Important files:

- `docs/tools/skills.md`
- `src/agents/skills/config.ts`
- `src/agents/skills/filter.ts`
- `src/agents/skills/workspace.ts`
- `src/agents/skills/refresh.ts`
- `src/config/types.skills.ts`
- root `skills/*`

The most important design choice is the precedence model:

- bundled skills
- managed local skills
- workspace skills
- optional extra skill dirs

with precedence:

- workspace wins
- then managed/local
- then bundled

That is a mature design.
It supports:

- shipped defaults
- user-local customization
- per-workspace override

without making the whole system chaotic.

The second important design choice is load-time gating.

Skills are filtered based on:

- platform
- required binaries
- required env vars
- required config paths
- bundled skill allowlists
- explicit per-skill enablement

This is exactly the kind of discipline most agent products are missing.
They often treat “skills” as prompt text only.
`OpenClaw` treats them as runtime-coupled capabilities with eligibility logic.

For `Block Data`, this is one of the strongest pieces to borrow.

If you add skills:

- do not load every skill all the time
- do not trust the model alone to decide whether a skill is runnable
- do not conflate skill discovery with skill safety

### 4. Memory And Session Optimization

This is another area where `OpenClaw` is stronger than it first appears.

Important files:

- `src/config/types.memory.ts`
- `src/memory/*`
- `docs/reference/session-management-compaction.md`
- `src/config/sessions.ts`
- `src/auto-reply/reply/session.ts`

The repo has both:

- session persistence
- explicit memory/indexing machinery

The session management doc explains the persistence model clearly:

- mutable session store in `sessions.json`
- append-only transcripts in `*.jsonl`

That split is valuable.

`sessions.json` is for:

- current metadata
- counters
- toggles
- current transcript pointer

The JSONL transcripts are for:

- true conversation record
- tool results
- compaction summaries
- tree-structured context history

For `Block Data`, that is a good pattern.
Do not overload one structure to serve both mutable state and immutable history.

The repo also has real compaction semantics.
Compaction is not a temporary in-memory truncation.
It is persisted into the transcript model.

That matters for agent systems that need durable long-running context.

The memory directory itself is substantial.
It includes:

- embedding providers
- batch embedding runners
- vector dedupe
- hybrid search
- query expansion
- temporal decay
- SQLite and SQLite-vec backends
- qmd-backed memory paths
- session file integration

This is not a toy memory layer.
It is a meaningful subsystem.

The config surface in `types.memory.ts` also shows a smart choice:

- `backend?: "builtin" | "qmd"`

That means the repo separates memory policy from memory implementation.

For `Block Data`, the memory lessons are:

1. session persistence and semantic memory should be separate but connected
2. compaction should be explicit and durable
3. memory writes need lifecycle hooks, not ad hoc prompt hacks
4. retrieval policy should be configurable by scope, update timing, and limits

### 5. Agent Orchestration

The agent story in `OpenClaw` is broad.

The files under `src/agents` alone are the largest subtree in the repo.

That tells you the repo spends more code on agent behavior than on UI.
That is usually the sign of a serious agent platform.

Important operational concepts present in the repo:

- multi-agent routing
- per-agent workspaces
- per-agent sessions
- subagent registry
- tool routing
- sandbox modes
- cron-isolated runs
- session-to-session communication

The README also exposes explicit session tools:

- `sessions_list`
- `sessions_history`
- `sessions_send`

That is not just a convenience feature.
It is a structural hint that the platform treats sessions as routable execution units.

For `Block Data`, this is relevant if the future product needs:

- background workers
- specialist agents
- isolated contexts for tasks
- long-lived per-customer or per-workspace agent state

### 6. Security And Operator Controls

`OpenClaw` is opinionated about safety, but within a specific trust model.

Important files:

- `docs/gateway/security/index.md`
- `src/gateway/auth.ts`
- `src/gateway/device-auth.ts`
- `src/gateway/exec-approval-manager.ts`
- `src/gateway/origin-check.ts`
- `src/gateway/method-scopes.ts`
- `src/config/types.gateway.ts`

The repo states its trust model clearly:

- personal assistant
- one trusted operator boundary per gateway
- not a hostile multi-tenant system

That honesty is useful.

The security value of the repo is not “perfect isolation.”
The security value is:

- clear auth modes
- rate limiting
- explicit device auth
- origin checks
- control UI policies
- audit commands
- exec approvals
- sandbox toggles

For `Block Data`, this is both a strength and a warning.

Strength:
the repo has many concrete controls.

Warning:
if `Block Data` needs enterprise multi-tenant trust separation, this repo’s default model is the wrong one to copy wholesale.

## Where The Repo Is Actually Deep

The easiest mistake with `OpenClaw` is to assume it is just “a giant integration catalog.”
That is wrong.

Its deepest areas are:

- agent runtime behavior
- gateway orchestration
- plugin/provider contracts
- session lifecycle
- memory mechanics
- operator safety controls

Its shallower or more peripheral areas, relative to the repo’s core, are:

- individual provider extension directories
- some native/mobile surfaces
- some smaller one-off bundled skills

That means if you are reading the repo for architectural leverage, start with:

- `src/gateway`
- `src/agents`
- `src/config`
- `src/plugins`
- `src/memory`
- `docs/tools/skills.md`
- `docs/reference/session-management-compaction.md`
- `docs/gateway/security/index.md`

Do not start with:

- chat channel integrations
- mobile app directories
- long docs trees

Those matter later.
They are not the main architectural lesson.

## Top-Level Directory Assessment

### `src`

This is the actual product runtime.
Everything else supports, packages, documents, or extends it.

If `Block Data` wants to mine the repo for architecture, this is the main quarry.

### `extensions`

This directory is strategically important.
It shows how `OpenClaw` externalizes providers, channels, memory backends, and support services.

The presence of extensions like:

- `openai`
- `anthropic`
- `ollama`
- `openrouter`
- `memory-core`
- `memory-lancedb`
- `discord`
- `telegram`
- `slack`
- `whatsapp`

shows that the platform wants pluggable capability families, not a single monolithic runtime.

### `skills`

This directory proves the skills system is not just a config table.
It ships many real skill folders with `SKILL.md` files.

That means the agent UX and tool teaching surface is part of the product, not a hidden internal detail.

### `ui`

This is the web/operator UI surface.
It exists, but it is not the conceptual center of the platform.
The gateway is.

That is the correct architecture for a serious assistant backend.

### `apps`

This directory contains:

- `android`
- `ios`
- `macos`
- `shared`

Its existence shows that the platform is serious about device/node integration.
It also increases maintenance burden.

### `docs`

The docs tree is not fluff.
It reflects the breadth of the repo.
The number of docs categories is itself evidence of operational complexity.

For analysis work, the docs are useful because they often point directly to real implementation boundaries.

## Fit For Block Data

This section moves from anatomy to recommendation.

### If Block Data Wants A Narrow Agent Feature

If the target is a narrow internal agent feature such as:

- one chat assistant
- one tool runner
- one RAG or memory layer
- one admin console

then `OpenClaw` is overbuilt.

You would spend too much time deciding what not to adopt.

### If Block Data Wants A Long-Lived Agent Platform

If the target is:

- durable sessions
- operator-facing controls
- multiple agent contexts
- skill packs
- MCP integration
- configurable model catalogs
- local or self-hosted runtime options

then `OpenClaw` becomes far more relevant.

It already has patterns for:

- separating config from runtime
- gating risky capabilities
- routing work through a gateway
- persisting transcripts plus mutable session metadata
- mapping bundle metadata into native trusted surfaces

### The Highest-Value Concepts To Borrow

If I were translating this repo into a `Block Data` roadmap, I would borrow these patterns first:

1. A gateway-owned session model.
2. Separate mutable session metadata from append-only transcript history.
3. Keep model catalogs independent from execution logic.
4. Use provider plugins to augment catalogs and auth flows.
5. Treat skills as runtime-coupled capability bundles with gating.
6. Treat MCP config as operator-managed infrastructure, not prompt text.
7. Map third-party bundles into trusted native surfaces instead of executing arbitrary plugin code.
8. Make security posture explicit and auditable.

### The Parts I Would Not Copy Directly

I would not copy these blindly into `Block Data`:

1. the full multi-channel product scope
2. the personal-assistant trust model
3. the repo’s full native/mobile/device ambition
4. the sheer number of extensions
5. the operator UX assumptions around local-first control

Those are product decisions, not architecture necessities.

## Recommendation

My recommendation is precise:

Use `OpenClaw` as a reference implementation for `Block Data` in these layers:

- model catalog and provider abstraction
- gateway/session architecture
- skill loading and gating
- MCP registration and bundle mapping
- memory plus compaction lifecycle
- operator-facing security controls

Do not treat `OpenClaw` as the thing to embed or fork wholesale unless `Block Data` is intentionally becoming a full assistant platform.

If the `Block Data` near-term goal is an agent feature inside an existing product, the right outcome from this repo is:

- an architecture notebook
- a list of extracted patterns
- a shortlist of files worth porting conceptually

not:

- “run OpenClaw inside Block Data”

## Current Local Workspace Notes

These are local observations from this workspace, not upstream product defaults:

- the gateway is currently running locally at `http://127.0.0.1:18789`
- a workspace-local config file exists at `external/openclaw/.state/config/openclaw.json`
- this local config was modified to relax Control UI behavior for testing
- those dangerous Control UI flags should be treated as local test state, not architectural guidance

This matters because it is easy to confuse local test tweaks with upstream intended defaults.

## Reading Order For A Future Block Data Engineer

If a `Block Data` engineer were going to spend one day reading `OpenClaw`, I would recommend this order:

1. `package.json`
2. `docker-compose.yml`
3. `README.md`
4. `src/gateway/server.impl.ts`
5. `src/agents/model-catalog.ts`
6. `src/config/types.models.ts`
7. `src/config/types.skills.ts`
8. `src/config/types.mcp.ts`
9. `src/config/types.memory.ts`
10. `docs/tools/skills.md`
11. `docs/reference/session-management-compaction.md`
12. `docs/plugins/bundles.md`
13. `docs/gateway/security/index.md`
14. `src/plugins/*`
15. `src/memory/*`

That path gets you the architecture before the integrations.

## Final Verdict

`OpenClaw` is the most platform-complete agent repository in this workspace.
Its real strength is not that it supports many providers or many channels.
Its real strength is that it has already paid the cost of turning “agent features” into operating software:

- state
- config
- routing
- approvals
- bundle mapping
- compaction
- security posture
- operator tooling

For `Block Data`, that makes it valuable as a design reference.
It does not make it a clean base application.

If I had to summarize the repo in one line:

`OpenClaw` is a gateway-first personal assistant platform whose best transferable value lies in its orchestration, capability gating, and state-management design.

---

## Appendix A: Root Inventory

```text
.agent
.agents
.detect-secrets.cfg
.dockerignore
.env
.env.example
.git
.gitattributes
.github
.gitignore
.jscpd.json
.mailmap
.markdownlint-cli2.jsonc
.npmignore
.npmrc
.oxfmtrc.jsonc
.oxlintrc.json
.pi
.pre-commit-config.yaml
.prettierignore
.secrets.baseline
.shellcheckrc
.state
.swiftformat
.swiftlint.yml
.vscode
AGENTS.md
CHANGELOG.md
CLAUDE.md
CONTRIBUTING.md
Dockerfile
Dockerfile.sandbox
Dockerfile.sandbox-browser
Dockerfile.sandbox-common
LICENSE
README.md
SECURITY.md
Swabble
VISION.md
appcast.xml
apps
assets
docker-compose.yml
docker-setup.sh
docs
docs.acp.md
extensions
fly.private.toml
fly.toml
git-hooks
knip.config.ts
openclaw.mjs
openclaw.podman.env
package.json
packages
patches
pnpm-lock.yaml
pnpm-workspace.yaml
pyproject.toml
render.yaml
scripts
setup-podman.sh
skills
src
test
test-fixtures
tsconfig.json
tsconfig.plugin-sdk.dts.json
tsdown.config.ts
ui
vendor
vitest.channel-paths.mjs
vitest.channels.config.ts
vitest.config.ts
vitest.e2e.config.ts
vitest.extensions.config.ts
vitest.gateway.config.ts
vitest.live.config.ts
vitest.scoped-config.ts
vitest.unit-paths.mjs
vitest.unit.config.ts
zizmor.yml
```

## Appendix B: Top-Level Size Distribution

```text
0	CLAUDE.md
4.0K	.detect-secrets.cfg
4.0K	.dockerignore
4.0K	.env
4.0K	.env.example
4.0K	.gitattributes
4.0K	.gitignore
4.0K	.jscpd.json
4.0K	.mailmap
4.0K	.markdownlint-cli2.jsonc
4.0K	.npmignore
4.0K	.npmrc
4.0K	.oxfmtrc.jsonc
4.0K	.oxlintrc.json
4.0K	.prettierignore
4.0K	.shellcheckrc
4.0K	.swiftformat
4.0K	.swiftlint.yml
4.0K	Dockerfile.sandbox
4.0K	Dockerfile.sandbox-browser
4.0K	Dockerfile.sandbox-common
4.0K	LICENSE
4.0K	docker-compose.yml
4.0K	fly.private.toml
4.0K	fly.toml
4.0K	knip.config.ts
4.0K	openclaw.mjs
4.0K	openclaw.podman.env
4.0K	patches
4.0K	pnpm-workspace.yaml
4.0K	pyproject.toml
4.0K	render.yaml
4.0K	tsconfig.json
4.0K	tsconfig.plugin-sdk.dts.json
4.0K	vitest.channel-paths.mjs
4.0K	vitest.channels.config.ts
4.0K	vitest.e2e.config.ts
4.0K	vitest.extensions.config.ts
4.0K	vitest.gateway.config.ts
4.0K	vitest.live.config.ts
4.0K	vitest.scoped-config.ts
4.0K	vitest.unit-paths.mjs
4.0K	vitest.unit.config.ts
4.0K	zizmor.yml
8.0K	.pre-commit-config.yaml
8.0K	VISION.md
8.0K	git-hooks
8.0K	test-fixtures
8.0K	tsdown.config.ts
8.0K	vitest.config.ts
12K	.vscode
12K	CONTRIBUTING.md
12K	docs.acp.md
12K	setup-podman.sh
16K	Dockerfile
20K	.agent
20K	.agents
24K	SECURITY.md
24K	docker-setup.sh
36K	AGENTS.md
40K	package.json
44K	packages
52K	appcast.xml
68K	.pi
124K	README.md
232K	Swabble
248K	.github
312K	.state
424K	.secrets.baseline
448K	test
484K	pnpm-lock.yaml
704K	skills
764K	CHANGELOG.md
1.3M	assets
1.6M	scripts
2.0M	vendor
2.6M	ui
17M	apps
19M	docs
26M	extensions
40M	src
312M	.git
```

## Appendix C: Source Module File Counts

```text
919 agents
495 infra
371 gateway
368 commands
310 cli
305 auto-reply
246 config
200 channels
192 plugins
178 plugin-sdk
158 browser
110 cron
103 memory
74 shared
56 media-understanding
55 acp
54 daemon
52 secrets
50 hooks
48 line
47 tui
42 media
35 security
34 test-utils
30 logging
29 utils
28 process
19 terminal
16 wizard
16 node-host
14 markdown
13 sessions
13 image-generation
12 tts
11 routing
9 providers
9 pairing
8 types
7 test-helpers
7 context-engine
6 link-understanding
6 canvas-host
4 whatsapp
2 web-search
2 scripts
2 interactive
1 i18n
1 docs
1 compat
1 bindings
```

## Appendix D: `src` Tree At Max Depth 2

```text
src
src/acp
src/acp/control-plane
src/acp/runtime
src/agents
src/agents/auth-profiles
src/agents/cli-runner
src/agents/command
src/agents/pi-embedded-helpers
src/agents/pi-embedded-runner
src/agents/pi-extensions
src/agents/sandbox
src/agents/schema
src/agents/skills
src/agents/test-helpers
src/agents/tools
src/auto-reply
src/auto-reply/reply
src/auto-reply/test-helpers
src/bindings
src/browser
src/browser/routes
src/canvas-host
src/canvas-host/a2ui
src/channels
src/channels/allowlists
src/channels/plugins
src/channels/transport
src/channels/web
src/cli
src/cli/browser-cli-actions-input
src/cli/cron-cli
src/cli/daemon-cli
src/cli/gateway-cli
src/cli/node-cli
src/cli/nodes-cli
src/cli/program
src/cli/send-runtime
src/cli/shared
src/cli/update-cli
src/commands
src/commands/agent
src/commands/channel-setup
src/commands/channels
src/commands/gateway-status
src/commands/models
src/commands/onboard-non-interactive
src/commands/setup
src/commands/status-all
src/compat
src/config
src/config/sessions
src/context-engine
src/cron
src/cron/isolated-agent
src/cron/service
src/daemon
src/daemon/test-helpers
src/docs
src/gateway
src/gateway/protocol
src/gateway/server
src/gateway/server-methods
src/hooks
src/hooks/bundled
src/i18n
src/image-generation
src/image-generation/providers
src/infra
src/infra/format-time
src/infra/net
src/infra/outbound
src/infra/tls
src/interactive
src/line
src/line/flex-templates
src/link-understanding
src/logging
src/logging/test-helpers
src/markdown
src/media
src/media-understanding
src/media-understanding/providers
src/memory
src/memory/test-helpers
src/node-host
src/pairing
src/plugin-sdk
src/plugins
src/plugins/contracts
src/plugins/runtime
src/plugins/test-helpers
src/process
src/process/supervisor
src/providers
src/routing
src/scripts
src/secrets
src/security
src/sessions
src/shared
src/shared/net
src/shared/text
src/terminal
src/test-helpers
src/test-utils
src/tts
src/tts/providers
src/tui
src/tui/components
src/tui/theme
src/types
src/utils
src/web-search
src/whatsapp
src/wizard
```

## Appendix E: Top-Level Directory Inventory At Max Depth 2

```text
.
.agent
.agent/workflows
.agents
.agents/skills
.git
.git/hooks
.git/info
.git/logs
.git/objects
.git/refs
.github
.github/ISSUE_TEMPLATE
.github/actions
.github/codeql
.github/instructions
.github/workflows
.pi
.pi/extensions
.pi/git
.pi/prompts
.state
.state/config
.state/workspace
.vscode
Swabble
Swabble/.github
Swabble/Sources
Swabble/Tests
Swabble/docs
Swabble/scripts
apps
apps/android
apps/ios
apps/macos
apps/shared
assets
assets/chrome-extension
docs
docs/.generated
docs/.i18n
docs/assets
docs/automation
docs/channels
docs/cli
docs/concepts
docs/debug
docs/diagnostics
docs/gateway
docs/help
docs/images
docs/install
docs/ja-JP
docs/nodes
docs/platforms
docs/plugins
docs/providers
docs/reference
docs/security
docs/start
docs/tools
docs/web
docs/zh-CN
extensions
extensions/acpx
extensions/amazon-bedrock
extensions/anthropic
extensions/bluebubbles
extensions/brave
extensions/byteplus
extensions/chutes
extensions/cloudflare-ai-gateway
extensions/copilot-proxy
extensions/device-pair
extensions/diagnostics-otel
extensions/diffs
extensions/discord
extensions/elevenlabs
extensions/fal
extensions/feishu
extensions/firecrawl
extensions/github-copilot
extensions/google
extensions/googlechat
extensions/huggingface
extensions/imessage
extensions/irc
extensions/kilocode
extensions/kimi-coding
extensions/line
extensions/llm-task
extensions/lobster
extensions/matrix
extensions/mattermost
extensions/memory-core
extensions/memory-lancedb
extensions/microsoft
extensions/minimax
extensions/mistral
extensions/modelstudio
extensions/moonshot
extensions/msteams
extensions/nextcloud-talk
extensions/nostr
extensions/nvidia
extensions/ollama
extensions/open-prose
extensions/openai
extensions/opencode
extensions/opencode-go
extensions/openrouter
extensions/openshell
extensions/perplexity
extensions/phone-control
extensions/qianfan
extensions/qwen-portal-auth
extensions/sglang
extensions/shared
extensions/signal
extensions/slack
extensions/synology-chat
extensions/synthetic
extensions/talk-voice
extensions/telegram
extensions/thread-ownership
extensions/tlon
extensions/together
extensions/twitch
extensions/venice
extensions/vercel-ai-gateway
extensions/vllm
extensions/voice-call
extensions/volcengine
extensions/whatsapp
extensions/xai
extensions/xiaomi
extensions/zai
extensions/zalo
extensions/zalouser
git-hooks
packages
packages/clawdbot
packages/moltbot
patches
scripts
scripts/dev
scripts/docker
scripts/docs-i18n
scripts/e2e
scripts/k8s
scripts/lib
scripts/podman
scripts/pre-commit
scripts/repro
scripts/shell-helpers
scripts/systemd
skills
skills/1password
skills/apple-notes
skills/apple-reminders
skills/bear-notes
skills/blogwatcher
skills/blucli
skills/bluebubbles
skills/camsnap
skills/canvas
skills/clawhub
skills/coding-agent
skills/discord
skills/eightctl
skills/gemini
skills/gh-issues
skills/gifgrep
skills/github
skills/gog
skills/goplaces
skills/healthcheck
skills/himalaya
skills/imsg
skills/mcporter
skills/model-usage
skills/nano-pdf
skills/node-connect
skills/notion
skills/obsidian
skills/openai-image-gen
skills/openai-whisper
skills/openai-whisper-api
skills/openhue
skills/oracle
skills/ordercli
skills/peekaboo
skills/sag
skills/session-logs
skills/sherpa-onnx-tts
skills/skill-creator
skills/slack
skills/songsee
skills/sonoscli
skills/spotify-player
skills/summarize
skills/things-mac
skills/tmux
skills/trello
skills/video-frames
skills/voice-call
skills/wacli
skills/weather
skills/xurl
src
src/acp
src/agents
src/auto-reply
src/bindings
src/browser
src/canvas-host
src/channels
src/cli
src/commands
src/compat
src/config
src/context-engine
src/cron
src/daemon
src/docs
src/gateway
src/hooks
src/i18n
src/image-generation
src/infra
src/interactive
src/line
src/link-understanding
src/logging
src/markdown
src/media
src/media-understanding
src/memory
src/node-host
src/pairing
src/plugin-sdk
src/plugins
src/process
src/providers
src/routing
src/scripts
src/secrets
src/security
src/sessions
src/shared
src/terminal
src/test-helpers
src/test-utils
src/tts
src/tui
src/types
src/utils
src/web-search
src/whatsapp
src/wizard
test
test-fixtures
test/fixtures
test/helpers
test/mocks
test/scripts
ui
ui/public
ui/src
vendor
vendor/a2ui
```

## Appendix F: Extension Inventory By File Count

```text
220 discord
178 telegram
154 slack
125 feishu
113 whatsapp
104 matrix
92 open-prose
90 msteams
69 voice-call
66 mattermost
59 bluebubbles
52 signal
51 tlon
51 imessage
50 zalouser
41 zalo
39 nextcloud-talk
38 twitch
36 nostr
35 googlechat
34 irc
30 diffs
27 acpx
23 synology-chat
20 line
16 google
14 openshell
12 xai
11 lobster
10 minimax
9 openai
9 firecrawl
8 zai
8 shared
7 moonshot
7 llm-task
7 github-copilot
6 qwen-portal-auth
6 modelstudio
6 mistral
6 memory-lancedb
6 diagnostics-otel
5 xiaomi
5 vercel-ai-gateway
5 venice
5 together
5 synthetic
5 qianfan
5 perplexity
5 openrouter
5 kimi-coding
5 kilocode
5 huggingface
5 copilot-proxy
5 chutes
4 volcengine
4 vllm
4 thread-ownership
4 talk-voice
4 sglang
4 phone-control
4 opencode-go
4 opencode
4 ollama
4 nvidia
4 fal
4 device-pair
4 cloudflare-ai-gateway
4 byteplus
4 brave
4 anthropic
4 amazon-bedrock
3 microsoft
3 memory-core
3 elevenlabs
```

## Appendix G: Skill Inventory By File Count

```text
7 skill-creator
4 model-usage
3 tmux
3 openai-image-gen
3 himalaya
3 1password
2 video-frames
2 sherpa-onnx-tts
2 openai-whisper-api
1 xurl
1 weather
1 wacli
1 voice-call
1 trello
1 things-mac
1 summarize
1 spotify-player
1 sonoscli
1 songsee
1 slack
1 session-logs
1 sag
1 peekaboo
1 ordercli
1 oracle
1 openhue
1 openai-whisper
1 obsidian
1 notion
1 node-connect
1 nano-pdf
1 mcporter
1 imsg
1 healthcheck
1 goplaces
1 gog
1 github
1 gifgrep
1 gh-issues
1 gemini
1 eightctl
1 discord
1 coding-agent
1 clawhub
1 canvas
1 camsnap
1 bluebubbles
1 blucli
1 blogwatcher
1 bear-notes
1 apple-reminders
1 apple-notes
```

## Appendix H: `src/agents/skills` Files

```text
src/agents/skills/bundled-context.ts
src/agents/skills/bundled-dir.test.ts
src/agents/skills/bundled-dir.ts
src/agents/skills/compact-format.test.ts
src/agents/skills/config.ts
src/agents/skills/env-overrides.runtime.ts
src/agents/skills/env-overrides.ts
src/agents/skills/filter.test.ts
src/agents/skills/filter.ts
src/agents/skills/frontmatter.test.ts
src/agents/skills/frontmatter.ts
src/agents/skills/plugin-skills.test.ts
src/agents/skills/plugin-skills.ts
src/agents/skills/refresh.test.ts
src/agents/skills/refresh.ts
src/agents/skills/serialize.ts
src/agents/skills/tools-dir.ts
src/agents/skills/types.ts
src/agents/skills/workspace.ts
```

## Appendix I: `src/memory` Files

```text
src/memory/backend-config.test.ts
src/memory/backend-config.ts
src/memory/batch-embedding-common.ts
src/memory/batch-error-utils.test.ts
src/memory/batch-error-utils.ts
src/memory/batch-gemini.test.ts
src/memory/batch-gemini.ts
src/memory/batch-http.test.ts
src/memory/batch-http.ts
src/memory/batch-openai.ts
src/memory/batch-output.test.ts
src/memory/batch-output.ts
src/memory/batch-provider-common.ts
src/memory/batch-runner.ts
src/memory/batch-status.test.ts
src/memory/batch-status.ts
src/memory/batch-upload.ts
src/memory/batch-utils.ts
src/memory/batch-voyage.test.ts
src/memory/batch-voyage.ts
src/memory/embedding-chunk-limits.test.ts
src/memory/embedding-chunk-limits.ts
src/memory/embedding-input-limits.ts
src/memory/embedding-inputs.ts
src/memory/embedding-manager.test-harness.ts
src/memory/embedding-model-limits.ts
src/memory/embedding-vectors.ts
src/memory/embedding.test-mocks.ts
src/memory/embeddings-debug.ts
src/memory/embeddings-gemini.test.ts
src/memory/embeddings-gemini.ts
src/memory/embeddings-mistral.test.ts
src/memory/embeddings-mistral.ts
src/memory/embeddings-model-normalize.test.ts
src/memory/embeddings-model-normalize.ts
src/memory/embeddings-ollama.test.ts
src/memory/embeddings-ollama.ts
src/memory/embeddings-openai.ts
src/memory/embeddings-remote-client.ts
src/memory/embeddings-remote-fetch.test.ts
src/memory/embeddings-remote-fetch.ts
src/memory/embeddings-remote-provider.ts
src/memory/embeddings-voyage.test.ts
src/memory/embeddings-voyage.ts
src/memory/embeddings.test.ts
src/memory/embeddings.ts
src/memory/fs-utils.ts
src/memory/hybrid.test.ts
src/memory/hybrid.ts
src/memory/index.test.ts
src/memory/index.ts
src/memory/internal.test.ts
src/memory/internal.ts
src/memory/manager-embedding-ops.ts
src/memory/manager-runtime.ts
src/memory/manager-search.ts
src/memory/manager-sync-ops.ts
src/memory/manager.async-search.test.ts
src/memory/manager.atomic-reindex.test.ts
src/memory/manager.batch.test.ts
src/memory/manager.embedding-batches.test.ts
src/memory/manager.get-concurrency.test.ts
src/memory/manager.mistral-provider.test.ts
src/memory/manager.read-file.test.ts
src/memory/manager.readonly-recovery.test.ts
src/memory/manager.sync-errors-do-not-crash.test.ts
src/memory/manager.ts
src/memory/manager.vector-dedupe.test.ts
src/memory/manager.watcher-config.test.ts
src/memory/memory-schema.ts
src/memory/mmr.test.ts
src/memory/mmr.ts
src/memory/multimodal.ts
src/memory/node-llama.ts
src/memory/post-json.test.ts
src/memory/post-json.ts
src/memory/qmd-manager.test.ts
src/memory/qmd-manager.ts
src/memory/qmd-process.test.ts
src/memory/qmd-process.ts
src/memory/qmd-query-parser.test.ts
src/memory/qmd-query-parser.ts
src/memory/qmd-scope.test.ts
src/memory/qmd-scope.ts
src/memory/query-expansion.test.ts
src/memory/query-expansion.ts
src/memory/remote-http.ts
src/memory/search-manager.test.ts
src/memory/search-manager.ts
src/memory/secret-input.ts
src/memory/session-files.test.ts
src/memory/session-files.ts
src/memory/sqlite-vec.ts
src/memory/sqlite.ts
src/memory/status-format.ts
src/memory/temporal-decay.test.ts
src/memory/temporal-decay.ts
src/memory/test-embeddings-mock.ts
src/memory/test-helpers/ssrf.ts
src/memory/test-manager-helpers.ts
src/memory/test-manager.ts
src/memory/test-runtime-mocks.ts
src/memory/types.ts
```

## Appendix J: `src/config` File Inventory

```text
src/config/agent-dirs.test.ts
src/config/agent-dirs.ts
src/config/agent-limits.ts
src/config/allowed-values.test.ts
src/config/allowed-values.ts
src/config/backup-rotation.ts
src/config/bindings.ts
src/config/byte-size.ts
src/config/cache-utils.test.ts
src/config/cache-utils.ts
src/config/channel-capabilities.test.ts
src/config/channel-capabilities.ts
src/config/commands.test.ts
src/config/commands.ts
src/config/config-misc.test.ts
src/config/config-paths.ts
src/config/config.acp-binding-cutover.test.ts
src/config/config.agent-concurrency-defaults.test.ts
src/config/config.allowlist-requires-allowfrom.test.ts
src/config/config.backup-rotation.test-helpers.ts
src/config/config.backup-rotation.test.ts
src/config/config.compaction-settings.test.ts
src/config/config.discord-agent-components.test.ts
src/config/config.discord-presence.test.ts
src/config/config.discord.test.ts
src/config/config.dm-policy-alias.test.ts
src/config/config.env-vars.test.ts
src/config/config.gateway-tailscale-bind.test.ts
src/config/config.hooks-module-paths.test.ts
src/config/config.identity-avatar.test.ts
src/config/config.identity-defaults.test.ts
src/config/config.irc.test.ts
src/config/config.legacy-config-detection.accepts-imessage-dmpolicy.test.ts
src/config/config.legacy-config-detection.rejects-routing-allowfrom.test.ts
src/config/config.meta-timestamp-coercion.test.ts
src/config/config.msteams.test.ts
src/config/config.multi-agent-agentdir-validation.test.ts
src/config/config.nix-integration-u3-u5-u9.test.ts
src/config/config.plugin-validation.test.ts
src/config/config.pruning-defaults.test.ts
src/config/config.sandbox-docker.test.ts
src/config/config.schema-regressions.test.ts
src/config/config.secrets-schema.test.ts
src/config/config.skills-entries-config.test.ts
src/config/config.talk-api-key-fallback.test.ts
src/config/config.talk-validation.test.ts
src/config/config.telegram-audio-preflight.test.ts
src/config/config.telegram-custom-commands.test.ts
src/config/config.telegram-topic-agentid.test.ts
src/config/config.tools-alsoAllow.test.ts
src/config/config.ts
src/config/config.web-search-provider.test.ts
src/config/dangerous-name-matching.ts
src/config/defaults.ts
src/config/discord-preview-streaming.ts
src/config/doc-baseline.test.ts
src/config/doc-baseline.ts
src/config/env-preserve-io.test.ts
src/config/env-preserve.test.ts
src/config/env-preserve.ts
src/config/env-substitution.test.ts
src/config/env-substitution.ts
src/config/env-vars.ts
src/config/gateway-control-ui-origins.ts
src/config/group-policy.test.ts
src/config/group-policy.ts
src/config/home-env.test-harness.ts
src/config/includes-scan.ts
src/config/includes.test.ts
src/config/includes.ts
src/config/io.compat.test.ts
src/config/io.eacces.test.ts
src/config/io.owner-display-secret.test.ts
src/config/io.runtime-snapshot-write.test.ts
src/config/io.ts
src/config/io.validation-fails-closed.test.ts
src/config/io.write-config.test.ts
src/config/issue-format.test.ts
src/config/issue-format.ts
src/config/legacy-migrate.test-helpers.ts
src/config/legacy-migrate.test.ts
src/config/legacy-migrate.ts
src/config/legacy-web-search.ts
src/config/legacy.migrations.part-1.ts
src/config/legacy.migrations.part-2.ts
src/config/legacy.migrations.part-3.ts
src/config/legacy.migrations.ts
src/config/legacy.rules.ts
src/config/legacy.shared.test.ts
src/config/legacy.shared.ts
src/config/legacy.ts
src/config/logging-max-file-bytes.test.ts
src/config/logging.test.ts
src/config/logging.ts
src/config/markdown-tables.test.ts
src/config/markdown-tables.ts
src/config/mcp-config.test.ts
src/config/mcp-config.ts
src/config/media-audio-field-metadata.ts
src/config/merge-config.ts
src/config/merge-patch.proto-pollution.test.ts
src/config/merge-patch.test.ts
src/config/merge-patch.ts
src/config/model-alias-defaults.test.ts
src/config/model-input.ts
src/config/normalize-exec-safe-bin.ts
src/config/normalize-paths.test.ts
src/config/normalize-paths.ts
src/config/paths.test.ts
src/config/paths.ts
src/config/plugin-auto-enable.test.ts
src/config/plugin-auto-enable.ts
src/config/plugins-allowlist.ts
src/config/plugins-runtime-boundary.test.ts
src/config/port-defaults.ts
src/config/prototype-keys.ts
src/config/redact-snapshot.raw.ts
src/config/redact-snapshot.secret-ref.ts
src/config/redact-snapshot.test.ts
src/config/redact-snapshot.ts
src/config/runtime-group-policy.test.ts
src/config/runtime-group-policy.ts
src/config/runtime-overrides.test.ts
src/config/runtime-overrides.ts
src/config/schema.help.quality.test.ts
src/config/schema.help.ts
src/config/schema.hints.test.ts
src/config/schema.hints.ts
src/config/schema.irc.ts
src/config/schema.labels.ts
src/config/schema.shared.test.ts
src/config/schema.shared.ts
src/config/schema.tags.ts
src/config/schema.test.ts
src/config/schema.ts
src/config/sessions.cache.test.ts
src/config/sessions.test.ts
src/config/sessions.ts
src/config/slack-http-config.test.ts
src/config/slack-token-validation.test.ts
src/config/talk-defaults.test.ts
src/config/talk-defaults.ts
src/config/talk.normalize.test.ts
src/config/talk.ts
src/config/telegram-actions-poll.test.ts
src/config/telegram-custom-commands.ts
src/config/telegram-webhook-port.test.ts
src/config/telegram-webhook-secret.test.ts
src/config/test-helpers.ts
src/config/thread-bindings-config-keys.test.ts
src/config/types.acp.ts
src/config/types.agent-defaults.ts
src/config/types.agents-shared.ts
src/config/types.agents.ts
src/config/types.approvals.ts
src/config/types.auth.ts
src/config/types.base.ts
src/config/types.browser.ts
src/config/types.channel-messaging-common.ts
src/config/types.channels.ts
src/config/types.cli.ts
src/config/types.cron.ts
src/config/types.discord.ts
src/config/types.gateway.ts
src/config/types.googlechat.ts
src/config/types.hooks.ts
src/config/types.imessage.ts
src/config/types.installs.ts
src/config/types.irc.ts
src/config/types.mcp.ts
src/config/types.memory.ts
src/config/types.messages.ts
src/config/types.models.ts
src/config/types.msteams.ts
src/config/types.node-host.ts
src/config/types.openclaw.ts
src/config/types.plugins.ts
src/config/types.queue.ts
src/config/types.sandbox.ts
src/config/types.secrets.ts
src/config/types.signal.ts
src/config/types.skills.ts
src/config/types.slack.ts
src/config/types.telegram.ts
src/config/types.tools.ts
src/config/types.ts
src/config/types.tts.ts
src/config/types.whatsapp.ts
src/config/validation.allowed-values.test.ts
src/config/validation.ts
src/config/version.ts
src/config/zod-schema.agent-defaults.ts
src/config/zod-schema.agent-model.ts
src/config/zod-schema.agent-runtime.ts
src/config/zod-schema.agents.ts
src/config/zod-schema.allowdeny.ts
src/config/zod-schema.approvals.ts
src/config/zod-schema.channels.ts
src/config/zod-schema.core.ts
src/config/zod-schema.cron-retention.test.ts
src/config/zod-schema.hooks.ts
src/config/zod-schema.installs.ts
src/config/zod-schema.logging-levels.test.ts
src/config/zod-schema.providers-core.ts
src/config/zod-schema.providers-whatsapp.ts
src/config/zod-schema.providers.ts
src/config/zod-schema.secret-input-validation.ts
src/config/zod-schema.sensitive.ts
src/config/zod-schema.session-maintenance-extensions.test.ts
src/config/zod-schema.session.ts
src/config/zod-schema.signal-groups.test.ts
src/config/zod-schema.talk.test.ts
src/config/zod-schema.ts
src/config/zod-schema.tts.test.ts
src/config/zod-schema.typing-mode.test.ts
```

## Appendix K: `src/gateway` File Inventory

```text
src/gateway/agent-event-assistant-text.ts
src/gateway/agent-list.ts
src/gateway/agent-prompt.test.ts
src/gateway/agent-prompt.ts
src/gateway/android-node.capabilities.live.test.ts
src/gateway/assistant-identity.test.ts
src/gateway/assistant-identity.ts
src/gateway/auth-config-utils.ts
src/gateway/auth-install-policy.ts
src/gateway/auth-mode-policy.test.ts
src/gateway/auth-mode-policy.ts
src/gateway/auth-rate-limit.test.ts
src/gateway/auth-rate-limit.ts
src/gateway/auth.test.ts
src/gateway/auth.ts
src/gateway/boot.test.ts
src/gateway/boot.ts
src/gateway/call.test.ts
src/gateway/call.ts
src/gateway/canvas-capability.ts
src/gateway/channel-health-monitor.test.ts
src/gateway/channel-health-monitor.ts
src/gateway/channel-health-policy.test.ts
src/gateway/channel-health-policy.ts
src/gateway/channel-status-patches.test.ts
src/gateway/channel-status-patches.ts
src/gateway/chat-abort.test.ts
src/gateway/chat-abort.ts
src/gateway/chat-attachments.test.ts
src/gateway/chat-attachments.ts
src/gateway/chat-sanitize.test.ts
src/gateway/chat-sanitize.ts
src/gateway/client-callsites.guard.test.ts
src/gateway/client.test.ts
src/gateway/client.ts
src/gateway/client.watchdog.test.ts
src/gateway/config-reload-plan.ts
src/gateway/config-reload.test.ts
src/gateway/config-reload.ts
src/gateway/connection-auth.test.ts
src/gateway/connection-auth.ts
src/gateway/control-plane-audit.ts
src/gateway/control-plane-rate-limit.ts
src/gateway/control-ui-contract.ts
src/gateway/control-ui-csp.test.ts
src/gateway/control-ui-csp.ts
src/gateway/control-ui-http-utils.ts
src/gateway/control-ui-routing.test.ts
src/gateway/control-ui-routing.ts
src/gateway/control-ui-shared.ts
src/gateway/control-ui.auto-root.http.test.ts
src/gateway/control-ui.http.test.ts
src/gateway/control-ui.ts
src/gateway/credential-planner.ts
src/gateway/credential-precedence.parity.test.ts
src/gateway/credentials.test.ts
src/gateway/credentials.ts
src/gateway/device-auth.test.ts
src/gateway/device-auth.ts
src/gateway/device-metadata-normalization.ts
src/gateway/events.ts
src/gateway/exec-approval-manager.ts
src/gateway/gateway-cli-backend.live.test.ts
src/gateway/gateway-config-prompts.shared.ts
src/gateway/gateway-connection.test-mocks.ts
src/gateway/gateway-misc.test.ts
src/gateway/gateway-models.profiles.live.test.ts
src/gateway/gateway.test.ts
src/gateway/hooks-mapping.test.ts
src/gateway/hooks-mapping.ts
src/gateway/hooks-policy.ts
src/gateway/hooks-test-helpers.ts
src/gateway/hooks.test.ts
src/gateway/hooks.ts
src/gateway/http-auth-helpers.test.ts
src/gateway/http-auth-helpers.ts
src/gateway/http-common.test.ts
src/gateway/http-common.ts
src/gateway/http-endpoint-helpers.test.ts
src/gateway/http-endpoint-helpers.ts
src/gateway/http-utils.request-context.test.ts
src/gateway/http-utils.ts
src/gateway/input-allowlist.test.ts
src/gateway/input-allowlist.ts
src/gateway/live-image-probe.ts
src/gateway/live-tool-probe-utils.test.ts
src/gateway/live-tool-probe-utils.ts
src/gateway/method-scopes.test.ts
src/gateway/method-scopes.ts
src/gateway/net.test.ts
src/gateway/net.ts
src/gateway/node-command-policy.ts
src/gateway/node-invoke-sanitize.ts
src/gateway/node-invoke-system-run-approval-errors.ts
src/gateway/node-invoke-system-run-approval-match.test.ts
src/gateway/node-invoke-system-run-approval-match.ts
src/gateway/node-invoke-system-run-approval.test.ts
src/gateway/node-invoke-system-run-approval.ts
src/gateway/node-pending-work.test.ts
src/gateway/node-pending-work.ts
src/gateway/node-registry.ts
src/gateway/open-responses.schema.ts
src/gateway/openai-http.image-budget.test.ts
src/gateway/openai-http.message-channel.test.ts
src/gateway/openai-http.test.ts
src/gateway/openai-http.ts
src/gateway/openresponses-http.test.ts
src/gateway/openresponses-http.ts
src/gateway/openresponses-parity.test.ts
src/gateway/openresponses-prompt.ts
src/gateway/operator-approvals-client.ts
src/gateway/origin-check.test.ts
src/gateway/origin-check.ts
src/gateway/probe-auth.test.ts
src/gateway/probe-auth.ts
src/gateway/probe.auth.integration.test.ts
src/gateway/probe.test.ts
src/gateway/probe.ts
src/gateway/reconnect-gating.test.ts
src/gateway/resolve-configured-secret-input-string.test.ts
```

## Appendix L: `src/plugins` Inventory Excerpt

```text
src/plugins/build-smoke-entry.ts
src/plugins/bundle-claude-inspect.test.ts
src/plugins/bundle-lsp.ts
src/plugins/bundle-manifest.test.ts
src/plugins/bundle-manifest.ts
src/plugins/bundle-mcp.test-support.ts
src/plugins/bundle-mcp.test.ts
src/plugins/bundle-mcp.ts
src/plugins/bundled-compat.ts
src/plugins/bundled-dir.test.ts
src/plugins/bundled-dir.ts
src/plugins/bundled-provider-auth-env-vars.generated.ts
src/plugins/bundled-provider-auth-env-vars.test.ts
src/plugins/bundled-provider-auth-env-vars.ts
src/plugins/bundled-runtime-deps.test.ts
src/plugins/bundled-sources.test.ts
src/plugins/bundled-sources.ts
src/plugins/bundled-web-search.test.ts
src/plugins/bundled-web-search.ts
src/plugins/captured-registration.ts
src/plugins/channel-plugin-ids.ts
src/plugins/cli.test.ts
src/plugins/cli.ts
src/plugins/commands.test.ts
src/plugins/commands.ts
src/plugins/config-schema.ts
src/plugins/config-state.test.ts
src/plugins/config-state.ts
src/plugins/contracts/auth-choice.contract.test.ts
src/plugins/contracts/auth.contract.test.ts
src/plugins/contracts/catalog.contract.test.ts
src/plugins/contracts/discovery.contract.test.ts
src/plugins/contracts/loader.contract.test.ts
src/plugins/contracts/provider.contract.test.ts
src/plugins/contracts/registry.contract.test.ts
src/plugins/contracts/registry.ts
src/plugins/contracts/runtime.contract.test.ts
src/plugins/contracts/shape.contract.test.ts
src/plugins/contracts/suites.ts
src/plugins/contracts/testkit.ts
src/plugins/contracts/web-search-provider.contract.test.ts
src/plugins/contracts/wizard.contract.test.ts
src/plugins/conversation-binding.test.ts
src/plugins/conversation-binding.ts
src/plugins/copy-bundled-plugin-metadata.test.ts
src/plugins/discovery.test.ts
src/plugins/discovery.ts
src/plugins/enable.test.ts
src/plugins/enable.ts
src/plugins/hook-runner-global.test.ts
src/plugins/hook-runner-global.ts
src/plugins/hooks.before-agent-start.test.ts
src/plugins/hooks.model-override-wiring.test.ts
src/plugins/hooks.phase-hooks.test.ts
src/plugins/hooks.test-helpers.ts
src/plugins/hooks.ts
src/plugins/http-path.ts
src/plugins/http-registry.test.ts
src/plugins/http-registry.ts
src/plugins/http-route-overlap.ts
src/plugins/install.test.ts
src/plugins/install.ts
src/plugins/installs.test.ts
src/plugins/installs.ts
src/plugins/interactive-dispatch-adapters.ts
src/plugins/interactive.test.ts
src/plugins/interactive.ts
src/plugins/loader.test.ts
src/plugins/loader.ts
src/plugins/logger.test.ts
src/plugins/logger.ts
src/plugins/manifest-registry.test.ts
src/plugins/manifest-registry.ts
src/plugins/manifest.ts
src/plugins/marketplace.test.ts
src/plugins/marketplace.ts
src/plugins/path-safety.ts
src/plugins/provider-api-key-auth.runtime.ts
src/plugins/provider-api-key-auth.ts
src/plugins/provider-auth-choice-helpers.ts
src/plugins/provider-auth-choice-preference.ts
src/plugins/provider-auth-choice.runtime.ts
src/plugins/provider-auth-choice.ts
src/plugins/provider-auth-choices.test.ts
src/plugins/provider-auth-choices.ts
src/plugins/provider-auth-helpers.ts
src/plugins/provider-auth-input.ts
src/plugins/provider-auth-storage.ts
src/plugins/provider-auth-token.ts
src/plugins/provider-auth-types.ts
src/plugins/provider-catalog-metadata.ts
src/plugins/provider-catalog.test.ts
src/plugins/provider-catalog.ts
src/plugins/provider-discovery.test.ts
src/plugins/provider-discovery.ts
src/plugins/provider-model-allowlist.ts
src/plugins/provider-model-defaults.ts
src/plugins/provider-model-definitions.ts
src/plugins/provider-model-helpers.test.ts
src/plugins/provider-model-helpers.ts
src/plugins/provider-model-primary.ts
src/plugins/provider-oauth-flow.ts
src/plugins/provider-ollama-setup.ts
src/plugins/provider-onboarding-config.ts
src/plugins/provider-openai-codex-oauth-tls.ts
src/plugins/provider-openai-codex-oauth.ts
src/plugins/provider-runtime.runtime.ts
src/plugins/provider-runtime.test-support.ts
src/plugins/provider-runtime.test.ts
src/plugins/provider-runtime.ts
src/plugins/provider-self-hosted-setup.ts
src/plugins/provider-validation.test.ts
src/plugins/provider-validation.ts
src/plugins/provider-vllm-setup.ts
src/plugins/provider-wizard.test.ts
src/plugins/provider-wizard.ts
src/plugins/provider-zai-endpoint.ts
src/plugins/providers.test.ts
src/plugins/providers.ts
src/plugins/registry-empty.ts
src/plugins/registry.ts
src/plugins/roots.ts
src/plugins/runtime.test.ts
src/plugins/runtime.ts
src/plugins/runtime/gateway-request-scope.test.ts
src/plugins/runtime/gateway-request-scope.ts
src/plugins/runtime/index.test.ts
src/plugins/runtime/index.ts
src/plugins/runtime/native-deps.ts
src/plugins/runtime/runtime-agent.ts
src/plugins/runtime/runtime-channel.ts
src/plugins/runtime/runtime-config.ts
src/plugins/runtime/runtime-discord-ops.runtime.ts
src/plugins/runtime/runtime-discord-typing.test.ts
src/plugins/runtime/runtime-discord-typing.ts
src/plugins/runtime/runtime-discord.ts
src/plugins/runtime/runtime-events.ts
src/plugins/runtime/runtime-imessage.ts
src/plugins/runtime/runtime-logging.ts
src/plugins/runtime/runtime-media.ts
src/plugins/runtime/runtime-signal.ts
src/plugins/runtime/runtime-slack-ops.runtime.ts
src/plugins/runtime/runtime-slack.ts
src/plugins/runtime/runtime-system.ts
src/plugins/runtime/runtime-telegram-ops.runtime.ts
src/plugins/runtime/runtime-telegram-typing.test.ts
src/plugins/runtime/runtime-telegram-typing.ts
src/plugins/runtime/runtime-telegram.ts
src/plugins/runtime/runtime-tools.ts
src/plugins/runtime/runtime-whatsapp-login-tool.ts
src/plugins/runtime/runtime-whatsapp-login.runtime.ts
src/plugins/runtime/runtime-whatsapp-outbound.runtime.ts
src/plugins/runtime/runtime-whatsapp.ts
src/plugins/runtime/types-channel.ts
src/plugins/runtime/types-core.ts
src/plugins/runtime/types.contract.test.ts
src/plugins/runtime/types.ts
src/plugins/runtime/typing-lease.test-support.ts
src/plugins/schema-validator.test.ts
src/plugins/schema-validator.ts
src/plugins/services.test.ts
src/plugins/services.ts
src/plugins/setup-binary.ts
src/plugins/setup-browser.ts
src/plugins/signal-cli-install.ts
src/plugins/slots.test.ts
src/plugins/slots.ts
src/plugins/source-display.test.ts
src/plugins/source-display.ts
src/plugins/stage-bundled-plugin-runtime.test.ts
src/plugins/status.test.ts
src/plugins/status.ts
src/plugins/test-helpers/fs-fixtures.ts
src/plugins/toggle-config.ts
src/plugins/tools.optional.test.ts
src/plugins/tools.ts
src/plugins/types.ts
src/plugins/uninstall.test.ts
src/plugins/uninstall.ts
src/plugins/update.test.ts
```

## Appendix M: Selected Provider Extension Files

```text
extensions/openai/index.ts
extensions/openai/media-understanding-provider.ts
extensions/openai/openai-codex-catalog.ts
extensions/openai/openai-codex-provider.ts
extensions/openai/openai-provider.test.ts
extensions/openai/openai-provider.ts
extensions/openai/openclaw.plugin.json
extensions/openai/package.json
extensions/openai/shared.ts
---
extensions/anthropic/index.ts
extensions/anthropic/media-understanding-provider.ts
extensions/anthropic/openclaw.plugin.json
extensions/anthropic/package.json
---
extensions/ollama/README.md
extensions/ollama/index.ts
extensions/ollama/openclaw.plugin.json
extensions/ollama/package.json
```

# Inspect Sandboxes, Agents, Tools, and the Agent-Superarena Vision

## Inputs Reviewed

### Local references

- `E:\writing-system\docs\jon\agent-superarena\visualize-this.md`
- `E:\writing-system\_agchain\_reference\inspect_cyber\README.md`
- `E:\writing-system\_agchain\_reference\inspect_ec2_sandbox\README.md`
- `E:\writing-system\_agchain\_reference\inspect_ec2_sandbox\src\ec2sandbox\_ec2_sandbox_environment.py`
- `E:\writing-system\_agchain\_reference\inspect_evals\README.md`
- `E:\writing-system\_agchain\_reference\inspect_evals\src\inspect_evals\agentdojo\README.md`
- `E:\writing-system\_agchain\_reference\inspect_k8s_sandbox\README.md`
- `E:\writing-system\_agchain\_reference\inspect_k8s_sandbox\docs\docs\design\limitations.md`
- `E:\writing-system\_agchain\_reference\inspect_k8s_sandbox\src\k8s_sandbox\_sandbox_environment.py`

### Inspect docs

- Agents:
  - `https://inspect.aisi.org.uk/agents.html`
  - `https://inspect.aisi.org.uk/react-agent.html`
  - `https://inspect.aisi.org.uk/multi-agent.html`
  - `https://inspect.aisi.org.uk/agent-custom.html`
  - `https://inspect.aisi.org.uk/human-agent.html`
  - `https://inspect.aisi.org.uk/agent-bridge.html`
- Tools:
  - `https://inspect.aisi.org.uk/tools.html`
  - `https://inspect.aisi.org.uk/tools-standard.html`
  - `https://inspect.aisi.org.uk/tools-mcp.html`
  - `https://inspect.aisi.org.uk/tools-custom.html`
  - `https://inspect.aisi.org.uk/sandboxing.html`
  - `https://inspect.aisi.org.uk/approval.html`
- Models:
  - `https://inspect.aisi.org.uk/models.html`
  - `https://inspect.aisi.org.uk/providers.html`
  - `https://inspect.aisi.org.uk/caching.html`
  - `https://inspect.aisi.org.uk/models-batch.html`
  - `https://inspect.aisi.org.uk/compaction.html`
  - `https://inspect.aisi.org.uk/multimodal.html`
  - `https://inspect.aisi.org.uk/reasoning.html`
  - `https://inspect.aisi.org.uk/structured.html`

## Executive Take

Inspect is strong enough to be the runtime substrate for AGChain, including agent loops, tool calls, approvals, MCP servers, bridged third-party agents, human baselines, provider abstraction, and several sandbox strategies.

It is not the product-level architecture for the arena you want.

The right split remains:

1. AGChain owns the build-time and system-definition plane.
2. Inspect owns the runtime execution plane.
3. The arena product sits above both and evaluates complete configured agent systems, not just bare models.

This means your earlier JSON/YAML-first builder direction still fits. Inspect does not replace it. It plugs into it.

## What Inspect Already Gives Us

### 1. Agent runtime primitives

Inspect already supports several agent shapes:

- single-agent `react()` loops
- multi-agent systems through:
  - supervisor plus handoffs
  - explicit staged workflows
  - agents exposed as tools
- custom agents implementing Inspect's `Agent` protocol
- bridged agents from other frameworks
- sandbox-bridged CLI agents
- human agents for baseline runs

Important implication:

Inspect is not limited to one “native agent” shape. It already supports enough runtime flexibility to host:

- your own custom runtime loops
- external frameworks
- CLI agents like Codex CLI / Claude Code / Gemini CLI running in sandboxes

That is directly relevant to the arena vision.

### 2. Tooling surface

Inspect already supports:

- standard tools
- custom Python tools
- MCP servers over:
  - stdio
  - HTTP
  - sandbox transport
- tool approval policies:
  - human approval
  - auto approval
  - custom approvers with escalation

Important implication:

AGChain does not need to invent a low-level tool protocol before it can evaluate systems. Inspect already provides a strong runtime tool substrate, especially because MCP tools can be local, remote, or sandbox-hosted.

### 3. Model runtime abstraction

Inspect already normalizes:

- multiple model providers
- local and remote models
- provider/model args
- reasoning blocks
- multimodal content
- structured output
- compaction
- caching
- model roles

Important implication:

Inspect is the right place to absorb provider and model-runtime variability. AGChain should not rebuild that layer.

### 4. Human baselines

The human agent is more important than it looks.

It means the same task, scorer, and sandbox can be used for:

- model runs
- agent runs
- human baselines

That is valuable for the kinds of legal and expert workflows you have in mind.

## What AGChain Still Needs To Own

Inspect does not give you the product you are actually trying to ship. AGChain still needs to own:

- benchmark and system manifests
- event-triggered orchestration
- staged payload assembly
- inter-step contracts
- durable state and audit artifacts
- leaderboard semantics
- platform-level system configuration
- fairness and comparability rules

Most importantly, AGChain needs a first-class concept of an evaluated system.

That evaluated system is not just:

- a model

It is:

- model binding
- prompt stack
- tool set
- MCP set
- memory strategy
- persistence mode
- compaction policy
- approval policy
- agent topology
- sandbox profile
- runtime adapter

That is the core of the arena concept described in `visualize-this.md`.

## Sandboxing Options

## A. Built-in Docker sandbox

This is the default and should be treated as the primary baseline.

Strengths:

- already native to Inspect
- good fit for tool execution, filesystem tasks, and per-sample isolation
- supports multiple named environments
- supports sandbox-hosted MCP servers
- best starting point for reproducible benchmark execution

Weaknesses:

- not enough for rich network-host or VM-style scenarios
- container state is sample-scoped, not a substitute for platform persistence

Recommendation:

Use Docker as the default sandbox profile for AGChain v1 arena execution.

## B. EC2 sandbox extension

This provisions a VM per sample and uses AWS SSM plus S3 for command execution and file transport.

Strengths:

- real VM isolation
- stronger fit for cyber or infrastructure-style tasks
- more realistic for scenarios needing host-level behaviour

Weaknesses:

- significantly more operational overhead
- cleanup and timeout behaviour are still rough in the reference package
- cost and provisioning complexity are much higher than Docker

Recommendation:

Use EC2 only for specialized eval families where VM fidelity matters, especially cyber-style or host-oriented tasks.

## C. Kubernetes sandbox extension

This is the most scalable and most operationally complex option.

Strengths:

- designed for secure execution at scale
- good fit for complex multi-service environments
- multiple sandbox pods per sample

Weaknesses:

- persistence is not automatic
- denied networking can hang or fail in non-obvious ways
- some cyber behaviours are blocked by cluster security constraints
- pod exec and lifecycle complexity are materially higher

Recommendation:

Do not use K8s as the first arena sandbox.

Use it later if and when you need:

- very high parallelism
- multi-service topologies
- cluster-level isolation and scheduling

## D. What the cyber and eval refs imply

The `inspect_cyber` and `inspect_evals` references show that Inspect is already being used for:

- agentic benchmarks
- tool-rich tasks
- sandboxed tasks
- security-sensitive evaluations

This matters because it means you do not need to prove that Inspect can host serious agent evaluations. It already can.

## Recommended Product Architecture

## Plane 1: AGChain build plane

This is where you keep your JSON/YAML-first system.

Responsibilities:

- authoring benchmark definitions
- authoring evaluated-system definitions
- packaging staged task data
- step/event orchestration
- defining fairness rules
- selecting runtime adapters

## Plane 2: Inspect runtime plane

Responsibilities:

- execute model generations
- run agent loops
- run tool calls
- enforce tool approval
- host MCP tools
- bridge external agents
- provision per-sample sandboxes
- produce run logs and traces

## Plane 3: Arena product plane

Responsibilities:

- register systems that compete
- materialize comparable runtime configs
- manage leaderboard and run lifecycle
- compare complete agent systems, not raw models

## Recommended V1 runtime contract

The first useful AGChain system spec should be something like:

- `system_id`
- `model_binding`
- `agent_runtime`
  - `inspect_react`
  - `inspect_custom`
  - `inspect_bridge_python`
  - `inspect_bridge_cli`
- `tools`
  - standard
  - custom
  - MCP local
  - MCP sandbox
  - MCP remote
- `sandbox_profile`
  - docker
  - ec2
  - k8s
- `approval_policy`
- `memory_policy`
- `compaction_policy`
- `prompt_layers`
- `instructions`
- `state_policy`

This keeps AGChain's builder authoritative while letting Inspect execute the actual run.

## Concrete Recommendations

1. Keep AGChain JSON/YAML and event-driven orchestration as the primary abstraction.
2. Treat Inspect as the execution adapter and runtime capability layer.
3. Make Docker sandbox plus sandbox-hosted MCP servers the default arena environment.
4. Add bridged CLI agents as a first-class future arena path because that aligns directly with the “complete agent system” vision.
5. Reserve EC2 for specialized VM/network evals.
6. Reserve K8s for later scale and multi-service scenarios.
7. Keep long-lived platform state outside Inspect. Inspect sample state is run-scoped, not a substitute for AGChain platform persistence.
8. Use human agents for baseline and comparative studies where human expert workflows matter.

## Most Important Design Decision

Do not define the arena around “model registry plus benchmark.”

Define it around:

`evaluated system specification -> runtime materialization -> sandboxed execution -> judged outcome`

That is the cleanest way to make:

- Inspect compatibility
- JSON-first orchestration
- agent-system competition

coexist without architectural conflict.

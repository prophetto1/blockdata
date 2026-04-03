---
title: "Inspect AI architecture reference"
sidebar:
  order: 5
---

# Inspect AI — Complete Architecture Analysis

**Repo:** `github.com/UKGovernmentBEIS/inspect_ai`
**Author:** UK AI Security Institute (AISI)
**License:** MIT
**Date of analysis:** 2026-03-26
**Analyzed from:** `E:\writing-system\_agchain\_reference\inspect_ai`

---

## Stack Profile

**Primary Language:** Python 3.10+ (strict typing via mypy)
**Runtime:** CPython, async-first via anyio (asyncio + trio dual-backend)

**Backend:**
- Framework: None (library, not a server — CLI + programmatic API)
- API Style: Python function calls + CLI; no REST/GraphQL server (except the View UI server)
- Auth: Per-provider API key management via env vars

**Data Layer:**
- Database: None (file-based eval logs in `.eval` binary or JSON format)
- Storage: Local filesystem, S3, Azure Blob (via fsspec/universal-pathlib)
- Cache: File-based model output cache with TTL

**Frontend (View UI):**
- Framework: React + TypeScript + Vite
- Backend: aiohttp (primary) or FastAPI (optional)
- Default port: 7575
- Purpose: Browse eval logs, view samples, real-time monitoring

**Testing:**
- Framework: pytest with anyio dual-backend (asyncio + trio)
- Type checking: mypy (strict mode on `inspect_ai.*`)
- Linting: ruff (Google docstring convention)
- Coverage: pytest-cov

**Build:**
- Package: setuptools + setuptools_scm (version from git tags)
- Lock: uv.lock
- CLI entry: `inspect` command via `inspect_ai._cli.main:main`

**Architecture Pattern:** Monolith library with plugin registry system
**Repo Structure:** `src/inspect_ai/` main package, `src/inspect_sandbox_tools/` and `src/inspect_tool_support/` as companion packages

---

## Package Structure

```
src/inspect_ai/
  __init__.py          — Public API: eval, score, Task, view, etc.
  _cli/                — Click CLI (11 commands)
  _display/            — Terminal output (6 display modes)
  _eval/               — Core evaluation engine
  _lfs/                — Git LFS pointer resolution
  _util/               — Internal utilities (async, file, registry, etc.)
  _view/               — Web UI server (React + aiohttp/FastAPI)
  agent/               — Agent protocol and ReAct implementation
  analysis/            — pandas DataFrame extraction from eval logs
  approval/            — Tool call approval system
  dataset/             — Dataset abstraction and loaders
  event/               — 17 event types + timeline system
  hooks/               — Lifecycle hooks (eval/run/task/sample events)
  log/                 — EvalLog persistence and manipulation
  model/               — Model abstraction + 26 provider implementations
  scorer/              — Scorer protocol + built-in scorers + metrics
  solver/              — Solver protocol + built-in solvers + composition
  tool/                — Tool protocol + built-in tools + MCP
  util/                — Public utilities (sandbox, concurrency, store)
```

**Total:** ~46,000 lines of Python source.

---

## 1. Core Evaluation Engine (`_eval/`)

### 1.1 Task Definition

Source: `_eval/task/task.py`

```python
class Task:
    dataset: Dataset              # evaluation samples
    setup: Solver | list[Solver]  # always-run setup steps
    solver: Solver | Agent        # main solving strategy (default: generate())
    cleanup: Callable             # per-sample cleanup
    scorer: Scorers | None        # scoring logic
    model: str | Model | None     # default model
    config: GenerateConfig        # model generation config
    model_roles: dict[str, str | Model]  # named model roles
    sandbox: SandboxEnvironmentType      # sandbox spec
    approval: list[ApprovalPolicy]       # tool approval policies
    epochs: int | Epochs          # multi-epoch config
    metrics: list[Metric]         # custom metrics
    # Resource limits:
    message_limit, token_limit, time_limit, working_limit, cost_limit
    fail_on_error: bool | float   # error handling policy
```

Tasks are registered via `@task` decorator into a global registry. Discovery is by module import.

### 1.2 Evaluation Entry Point

Source: `_eval/eval.py`

```python
def eval(
    tasks: Tasks,
    model: str | Model | list[Model],
    solver: Solver | SolverSpec | Agent | list = ...,
    model_roles: dict[str, str | Model] = ...,
    # Resource limits per sample:
    message_limit, token_limit, time_limit, cost_limit,
    sandbox: SandboxEnvironmentType = ...,
    approval: list[ApprovalPolicy] = ...,
    epochs: int | Epochs = ...,
    display: DisplayType = ...,
    log_dir, log_level, log_images, log_model_api,
    score: bool = True,
    ...
) -> list[EvalLog]
```

Returns a list of `EvalLog` objects — one per task evaluated.

### 1.3 Execution Flow

```
eval() entry
  -> Resolve tasks from registry
  -> Resolve models (instantiate ModelAPI -> Model)
  -> eval_run() orchestration
      -> Initialize sandbox environments
      -> Per task:
          -> Initialize dataset
          -> Broadcast eval config
          -> Per sample (parallel, configurable):
              -> Create TaskState from Sample
              -> Run setup solvers
              -> Run main solver (calls model.generate())
              -> Run cleanup
              -> Emit events to Timeline
              -> Write to log (buffered)
          -> Scoring phase:
              -> Per scorer: compute Score
              -> Compute metrics over all scores
      -> Teardown sandboxes
  -> Return list[EvalLog]
```

### 1.4 Configuration Resolution Chain

```
eval() arguments
  -> CLI arguments (-M, -T, etc.) override
    -> Task-level config (Task.config) override
      -> GenerateConfig defaults
        -> Final resolved configuration
```

---

## 2. Model Provider System (`model/`)

### 2.1 Core Abstractions

Source: `model/_model.py`

**ModelAPI** — abstract base class every provider implements:

```python
class ModelAPI(abc.ABC):
    def __init__(self, model_name: str, base_url: str | None,
                 api_key: str | None, api_key_vars: list[str],
                 config: GenerateConfig): ...

    # REQUIRED — the only abstract method:
    async def generate(
        self, input: list[ChatMessage], tools: list[ToolInfo],
        tool_choice: ToolChoice, config: GenerateConfig
    ) -> ModelOutput | tuple[ModelOutput, ModelCall]

    # Token counting (with fallback heuristics):
    async def count_tokens(input) -> int
    async def count_text_tokens(text) -> int

    # Provider capability hooks:
    max_tokens() -> int | None
    max_connections() -> int
    should_retry(ex) -> bool
    is_auth_failure(ex) -> bool
    collapse_user_messages() -> bool
    tools_required() -> bool
    tool_result_images() -> bool
    force_reasoning_history() -> Literal["none", "all", "last"] | None
```

**Model** — public wrapper users interact with:

```python
class Model:
    api: ModelAPI
    config: GenerateConfig
    name: str

    async def generate(input, tools, tool_choice, config, cache) -> ModelOutput
    async def generate_loop(input, tools, config, cache) -> tuple[list[ChatMessage], ModelOutput]
```

**get_model()** — factory function:
```python
get_model("anthropic/claude-opus-4-1", config=GenerateConfig(temperature=0))
```

### 2.2 Registered Providers

Source: `model/_providers/providers.py` — verified via `@modelapi` decorator grep.

**26 registered model APIs** across 43 implementation files:

| Provider | `@modelapi` name | Key file |
|----------|-----------------|----------|
| OpenAI | `openai` | `openai.py` (22KB) |
| OpenAI-compatible | `openai-api` | `openai.py` |
| Anthropic | `anthropic` | `anthropic.py` (118KB — largest) |
| Google GenAI | `google` | `google.py` (72KB) |
| Azure AI | `azureai` | `azure.py` |
| AWS Bedrock | `bedrock` | `bedrock.py` |
| AWS SageMaker | `sagemaker` | `sagemaker.py` |
| Groq | `groq` | `groq.py` |
| Mistral | `mistral` | `mistral.py` |
| xAI/Grok | `grok` | `grok.py` |
| Together | `together` | `together.py` |
| Fireworks | `fireworks` | `fireworks.py` |
| SambaNova | `sambanova` | `sambanova.py` |
| Ollama | `ollama` | `ollama.py` |
| OpenRouter | `openrouter` | `openrouter.py` |
| Perplexity | `perplexity` | `perplexity.py` |
| HuggingFace | `hf` | `hf.py` (22KB) |
| HF Inference | `hf-inference-providers` | `hf_inference.py` |
| vLLM | `vllm` | `vllm.py` (18KB) |
| SGLang | `sglang` | `sglang.py` |
| llama.cpp | `llama-cpp-python` | `llama_cpp_python.py` |
| Cloudflare | `cf` | `cf.py` |
| TransformerLens | `transformer_lens` | `transformer_lens.py` |
| NNterp | `nnterp` | `nnterp.py` |
| Mock | `mockllm` | `mockllm.py` |
| None | `none` | `none.py` |

### 2.3 GenerateConfig

Source: `model/_generate_config.py`

```python
class GenerateConfig(BaseModel):
    max_tokens: int | None
    temperature: float | None          # 0-2
    top_p, top_k, frequency_penalty, presence_penalty
    num_choices, seed, best_of
    modalities: list[OutputModality]   # e.g., "image"
    response_schema: ResponseSchema    # structured output
    parallel_tool_calls: bool | None
    tool_choice: ToolChoice | None
    internal_tools: bool | None
    max_tool_output: int | None
    cache_prompt: Literal["auto"] | bool | None
    batch: BatchConfig | None
    max_retries, timeout, attempt_timeout
    max_connections: int | None
    system_message: str | None
    reasoning_effort: Literal[...] | None   # O1, etc.
    verbosity: Literal["low", "medium", "high"] | None  # GPT-5.x
    effort: Literal["low", "medium", "high", "max"] | None  # Claude
```

### 2.4 Message Types

Source: `model/_chat_message.py`

```python
ChatMessage = Union[
    ChatMessageSystem,      # role: "system"
    ChatMessageUser,        # role: "user"
    ChatMessageAssistant,   # role: "assistant", tool_calls, model
    ChatMessageTool,        # role: "tool", tool_call_id, function, error
]
```

All extend `ChatMessageBase(BaseModel)` with `id`, `content`, `source`, `metadata`.

### 2.5 ModelOutput

Source: `model/_model_output.py`

```python
class ModelOutput(BaseModel):
    model: str
    choices: list[ChatCompletionChoice]
    usage: ModelUsage | None
    time: float | None
    error: str | None
    # Shortcuts:
    @property completion -> str      # text of first choice
    @property message -> ChatMessageAssistant
    @property stop_reason -> StopReason

class ModelUsage(BaseModel):
    input_tokens, output_tokens, total_tokens: int
    input_tokens_cache_write, input_tokens_cache_read: int | None
    reasoning_tokens: int | None
    total_cost: float | None
```

---

## 3. Solver System (`solver/`)

### 3.1 Core Protocol

Source: `solver/_solver.py`

```python
class Solver(Protocol):
    async def __call__(self, state: TaskState, generate: Generate) -> TaskState

class Generate(Protocol):
    async def __call__(
        self, state: TaskState,
        tool_calls: Literal["loop", "single", "none"] = "loop",
        **kwargs: Unpack[GenerateConfigArgs]
    ) -> TaskState
```

- `"loop"` — recursively resolve tool calls until none remain or limits hit
- `"single"` — resolve at most one tool call iteration
- `"none"` — skip tool resolution

### 3.2 TaskState

Source: `solver/_task_state.py`

```python
class TaskState:
    model: ModelName
    sample_id: int | str
    epoch: int
    input: str | list[ChatMessage]
    messages: list[ChatMessage]       # mutable conversation history
    output: ModelOutput
    tools: list[Tool]                 # mutable tool list
    tool_choice: ToolChoice | None
    metadata: dict[str, Any]
    store: Store                      # per-sample key-value store
    choices: Choices                  # for multiple choice
    target: Target                   # expected answer(s)
    message_limit, token_limit, cost_limit
    completed: bool                  # signals early termination
    scores: dict[str, Score] | None
```

### 3.3 Composition

**chain()** — sequential composition. Early exits if `state.completed = True`.

```python
chain(
    system_message("You are helpful"),
    chain_of_thought(),
    generate()
)
```

**fork()** — parallel execution on independent copies of TaskState.

### 3.4 Built-in Solvers

| Solver | Purpose |
|--------|---------|
| `generate()` | Default — call model, resolve tool calls |
| `chain(*solvers)` | Sequential composition |
| `fork(state, solvers)` | Parallel branching |
| `system_message(template)` | Insert system message |
| `user_message(template)` | Insert user message |
| `assistant_message(template)` | Insert assistant message |
| `prompt_template(template)` | Parameterized template substitution |
| `chain_of_thought(template)` | Step-by-step reasoning prompt |
| `self_critique(template)` | Critique then regenerate |
| `multiple_choice(template)` | Multiple choice prompt engineering |
| `use_tools(*tools)` | Make tools available |
| `basic_agent(init, tools)` | Simple ReAct loop |
| `human_agent()` | Interactive human loop |
| `bridge()` | LLM bridging |

### 3.5 Extension Pattern

```python
@solver
def my_solver(param: str) -> Solver:
    async def solve(state: TaskState, generate: Generate) -> TaskState:
        state.messages.append(ChatMessageUser(content=param))
        state = await generate(state)
        return state
    return solve
```

---

## 4. Scorer System (`scorer/`)

### 4.1 Core Protocol

Source: `scorer/_scorer.py`, `scorer/_metric.py`

```python
class Scorer(Protocol):
    async def __call__(self, state: TaskState, target: Target) -> Score | None

class Score(BaseModel):
    value: Value              # str | int | float | bool | Sequence | Mapping
    answer: str | None        # extracted answer
    explanation: str | None   # scoring explanation
    metadata: dict | None
    history: list[ScoreEdit]  # edit provenance

# Constants:
CORRECT = "C"
INCORRECT = "I"
PARTIAL = "P"
NOANSWER = "N"
```

### 4.2 Metrics

```python
class MetricProtocol(Protocol):
    def __call__(self, scores: list[SampleScore]) -> Value

# Built-in:
accuracy()        # proportion correct
mean()            # mean of scores
std(), stderr(), var()  # statistical measures
bootstrap_stderr()      # bootstrap standard error
grouped(groups)         # per-group metrics
```

### 4.3 Score Reducers (Multi-Epoch)

```python
mean_score(), median_score(), max_score(), mode_score()
at_least(threshold)    # binary: did any epoch exceed threshold?
pass_at(k)             # pass@k metric
```

### 4.4 Built-in Scorers

| Scorer | Purpose |
|--------|---------|
| `answer(pattern)` | Extract answer prefaced with `ANSWER:` |
| `choice()` | Multiple choice |
| `match(target)` | String matching |
| `includes(target)` | Substring inclusion |
| `pattern(regex)` | Regex extraction |
| `exact()` | Exact match classification |
| `f1()` | F1 score classification |
| `math()` | Math expression evaluation |
| `model_graded_qa(template)` | Model grades Q&A |
| `model_graded_fact(template)` | Model grades factual claims |
| `multi_scorer(scorers, reducer)` | Combine multiple scorers |

### 4.5 Extension Pattern

```python
@scorer(metrics=[accuracy(), stderr()])
def my_scorer() -> Scorer:
    async def score(state: TaskState, target: Target) -> Score:
        answer = extract(state.output.completion)
        return Score(value="C" if answer == target.text else "I")
    return score
```

---

## 5. Agent System (`agent/`)

### 5.1 Core Protocol

Source: `agent/_agent.py`

```python
class AgentState:
    messages: list[ChatMessage]    # conversation history (mutable)
    output: ModelOutput            # synthesized from last assistant message

class Agent(Protocol):
    async def __call__(self, state: AgentState, *args, **kwargs) -> AgentState
```

AgentState is deliberately simpler than TaskState — no metadata, store, targets, or scoring.

### 5.2 Built-in: react()

Source: `agent/_react.py`

Extensible ReAct implementation. Runs a tool-use loop:
1. Insert system message
2. Call model
3. Execute tool calls
4. Check for submit tool
5. If found, evaluate answer; optionally retry on incorrect
6. Otherwise loop

Key parameters: `name`, `description`, `prompt`, `tools`, `model`, `attempts`, `submit`, `compaction`, `truncation`, `approval`.

### 5.3 Agent Bridges

| Bridge | Purpose |
|--------|---------|
| `as_solver(agent)` | Convert Agent to Solver (AgentState <-> TaskState) |
| `as_tool(agent)` | Convert Agent to Tool (receives string input) |
| `handoff(agent)` | Create tool that hands off conversation to agent |

### 5.4 Extension Pattern

```python
@agent(name="searcher", description="Searches the web")
def search_agent() -> Agent:
    async def execute(state: AgentState) -> AgentState:
        # manipulate state.messages
        return state
    return execute

# Use as solver:
task = Task(solver=as_solver(search_agent()))
```

---

## 6. Tool System (`tool/`)

### 6.1 Core Protocol

Source: `tool/_tool.py`

```python
class Tool(Protocol):
    async def __call__(self, *args, **kwargs) -> ToolResult

ToolResult = str | int | float | bool | Content | list[Content]

class ToolError(Exception):
    """Reported to model (not fatal to eval)."""

class ToolSource(Protocol):
    async def tools(self) -> list[Tool]
```

### 6.2 ToolDef Metadata

Source: `tool/_tool_def.py`

```python
class ToolDef:
    tool: Callable
    name: str
    description: str
    parameters: ToolParams        # type metadata per parameter
    parallel: bool               # concurrent execution allowed?
    viewer: ToolCallViewer       # custom rendering
    model_input: ToolCallModelInput  # custom playback
```

Parameter types and descriptions are auto-extracted from docstrings and type hints.

### 6.3 Built-in Tools

| Tool | Purpose |
|------|---------|
| `bash(timeout)` | Execute bash commands |
| `python(timeout)` | Execute Python code |
| `bash_session()` | Persistent bash session |
| `web_search(engine)` | Web search (Exa, Google, Tavily) |
| `web_browser()` | Browse and extract web content |
| `computer(display)` | Desktop control via vision |
| `text_editor(path)` | Read/edit text files |
| `memory()` | Persistent agent memory |
| `think()` | Internal reasoning step |
| `update_plan()` | Update plan state |
| `skill()` | Plugin-based tool system |
| `code_execution()` | Code execution providers |
| `mcp_tools()` | Model Context Protocol integration |

### 6.4 MCP Integration

Source: `tool/_mcp.py`

Full MCP support:
- `mcp_server_stdio(command, args)` — stdio transport
- `mcp_server_http(url)` — HTTP transport
- `mcp_server_sse(url)` — SSE transport
- `mcp_server_sandbox(command)` — sandbox transport
- `mcp_tools(server)` — expose MCP server tools to agents

### 6.5 Extension Pattern

```python
@tool
def my_tool() -> Tool:
    async def execute(query: str, limit: int = 10) -> str:
        """Search for information.

        Args:
            query: Search query string.
            limit: Max results to return.
        """
        return results
    return execute
```

---

## 7. Approval System (`approval/`)

Source: `approval/_approval.py`, `approval/_approver.py`, `approval/_policy.py`

```python
ApprovalDecision = Literal["approve", "modify", "reject", "terminate", "escalate"]

class Approval(BaseModel):
    decision: ApprovalDecision
    modified: ToolCall | None    # for "modify" decisions
    explanation: str | None

class Approver(Protocol):
    async def __call__(self, message, call, view, history) -> Approval

@dataclass
class ApprovalPolicy:
    approver: Approver
    tools: str | list[str]       # glob patterns supported (e.g., "bash*")
```

Built-in: `auto_approver(decision)`, `human_approver(choices)`.

Policies evaluated in order; `"escalate"` continues to next matching policy.

---

## 8. Hooks System (`hooks/`)

Source: `hooks/_hooks.py`

```python
class Hooks:
    def enabled(self) -> bool: ...

    # Lifecycle events:
    async def on_eval_set_start(self, data: EvalSetStart) -> None
    async def on_eval_set_end(self, data: EvalSetEnd) -> None
    async def on_run_start(self, data: RunStart) -> None
    async def on_run_end(self, data: RunEnd) -> None
    async def on_task_start(self, data: TaskStart) -> None
    async def on_task_end(self, data: TaskEnd) -> None
    async def on_sample_init(self, data: SampleInit) -> None
    async def on_sample_start(self, data: SampleStart) -> None
    async def on_sample_event(self, data: SampleEvent) -> None
    async def on_sample_end(self, data: SampleEnd) -> None
    async def on_sample_attempt_start(self, data: SampleAttemptStart) -> None
    async def on_sample_attempt_end(self, data: SampleAttemptEnd) -> None
    async def on_model_usage(self, data: ModelUsageData) -> None
    async def on_model_cache_usage(self, data: ModelCacheUsageData) -> None
    async def on_sample_scoring(self, data: SampleScoring) -> None
    async def on_api_key_override(self, data: ApiKeyOverride) -> None
```

All hooks wrapped in try/except — failures never affect evaluation.

---

## 9. Event System (`event/`)

Source: `event/__init__.py`

**17 event types:**

| Event | Purpose |
|-------|---------|
| `SampleInitEvent` | Sample started |
| `SampleLimitEvent` | Sample limit hit |
| `SandboxEvent` | Sandbox operations |
| `StateEvent` | Task state changes |
| `StoreEvent` | Store operations |
| `ModelEvent` | Model API calls |
| `ToolEvent` | Tool execution |
| `ApprovalEvent` | Tool approval |
| `CompactionEvent` | Message compaction |
| `InputEvent` | Input processing |
| `ScoreEvent` | Scoring results |
| `ScoreEditEvent` | Score edits |
| `ErrorEvent` | Errors |
| `LoggerEvent` | Logging messages |
| `InfoEvent` | Info messages |
| `SpanBeginEvent` | Timing span start |
| `SpanEndEvent` | Timing span end |
| `StepEvent` | Solver steps |
| `SubtaskEvent` | Subtask markers |

Timeline system provides hierarchical event structure with span-based timing, serialization, and tree queries.

---

## 10. Dataset System (`dataset/`)

Source: `dataset/_dataset.py`

```python
class Sample(BaseModel):
    input: str | list[ChatMessage]
    choices: list[str] | None
    target: str | list[str]
    id: int | str | None
    metadata: dict[str, Any] | None
    sandbox: SandboxEnvironmentSpec | None
    files: dict[str, str] | None
    setup: str | None

class Dataset(Sequence[Sample], abc.ABC):
    name, location, shuffled
    __getitem__, __len__, slice, sort, shuffle
```

**Loaders:** `csv_dataset()`, `json_dataset()`, `hf_dataset()`, `file_dataset()`, `example_dataset()`

---

## 11. Logging System (`log/`)

Source: `log/_log.py`

```python
class EvalLog(BaseModel):
    eval_id: str
    spec: EvalSpec
    config: EvalConfig
    status: EvalStatus           # started | success | cancelled | error
    dataset: EvalDataset
    samples: list[EvalSample]
    scores: dict[str, EvalScore] | None
    results: EvalResults | None

class EvalSample(BaseModel):
    id: int | str
    input: str | list[ChatMessage]
    target: str | list[str]
    messages: list[ChatMessage]  # conversation history
    output: ModelOutput | None
    scores: dict[str, Score] | None
    events: list[Event]          # timeline of events
```

Persistence: `write_eval_log()`, `read_eval_log()`, `list_eval_logs()`. Supports `.eval` binary format and JSON.

---

## 12. CLI (`_cli/`)

Source: `_cli/main.py` — Click-based, 11 commands.

| Command | Purpose |
|---------|---------|
| `inspect eval` | Run evaluation tasks (~600 CLI options) |
| `inspect eval-set` | Run multiple evaluations |
| `inspect eval-retry` | Retry failed evaluations |
| `inspect score` | Score existing eval logs |
| `inspect cache` | Manage model output cache |
| `inspect log` | Query and convert log files |
| `inspect list` | List tasks and logs |
| `inspect info` | Read configuration and log info |
| `inspect trace` | List and read execution traces |
| `inspect view` | Run the View web server |
| `inspect sandbox` | Manage sandbox environments |

Key eval options: `--model`, `-M` (model args), `-T` (task args), `--limit`, `--epochs`, `--sandbox`, `--approval`, `--display`, `--log-dir`, `--message-limit`, `--token-limit`, `--cost-limit`, `--time-limit`, `--max-samples`, `--max-tasks`, `--fail-on-error`, `--retry-on-error`, `--batch`.

---

## 13. View/UI System (`_view/`)

**Dual backend:** aiohttp (`server.py`, 19KB) or FastAPI (`fastapi_server.py`, 18KB).

**API endpoints:**
- `GET /api/logs/{log}` — retrieve log file
- `GET /api/log-size/{log}` — log file size
- `GET /api/log-info/{log}` — log metadata
- `GET /api/list-logs/{dir}` — list all logs
- `DELETE /api/log/{log}` — delete log
- `POST /api/log-stream/{log}` — stream log content
- `GET /api/eval-set/{id}` — eval set info
- `GET /api/eval-set-logs/{id}` — logs in eval set

**Frontend:** React + TypeScript + Vite at `_view/www/`. Auto-generated TypeScript types from Python Pydantic models via `schema.py`.

**Port management:** PID files in `~/.config/inspect/ports/<port>`, automatic cleanup.

---

## 14. Analysis System (`analysis/`)

pandas DataFrame extraction from eval logs:

```python
evals_df(logs)       # eval-level DataFrame
samples_df(log)      # sample-level DataFrame
messages_df(log)     # message-level DataFrame
events_df(log)       # event-level DataFrame
prepare(logs)        # prepare and analyze logs
```

---

## 15. Design Decisions (from `design/`)

### Temporal Data Handling
- UTC everywhere — all temporal data must be timezone-aware UTC
- Mixed timezones forbidden
- `UtcDatetime` Pydantic type for full model support
- Naive datetime objects rejected at runtime

### Model Proxy Lifecycle
- JSON-RPC over HTTP to unix socket for stateless communication
- Fire-and-forget startup pattern
- SIGTERM (5s timeout) -> SIGKILL termination

### Log Edits
- Append-only `log_updates` field with provenance tracking
- `TagsEdit` and `MetadataEdit` types
- Full audit trail of who changed what and why

### Lazy HuggingFace Datasets
- Shuffle via index permutation (not data copy)
- Lazy row access via `__getitem__`
- Falls back to MemoryDataset only when needed

---

## 16. Architectural Patterns

### Registry System
All major components use decorator-based registration:

| Decorator | Registers |
|-----------|-----------|
| `@task` | Task definitions |
| `@solver` | Solver implementations |
| `@scorer(metrics=[...])` | Scorer with associated metrics |
| `@metric` | Metric functions |
| `@tool` | Tool implementations |
| `@agent` | Agent implementations |
| `@approver` | Approver implementations |
| `@hooks` | Hook implementations |
| `@modelapi(name="...")` | Model provider implementations |

All registries support: discovery by name, parameterized creation, package namespace prefixing.

### Protocol-Based Design
Every extensible component is a `Protocol`, not an ABC:
- `Solver`, `Generate`, `Scorer`, `Agent`, `Tool`, `Approver`, `ToolSource` — all Protocols
- Enables duck typing, easy mocking, no inheritance required

### Async-First with anyio
- All model APIs, tools, scorers, agents are async
- `anyio` for backend-agnostic concurrency (asyncio + trio)
- `tg_collect()` instead of `asyncio.gather()`
- Context variables for thread-local state propagation

### Pydantic 2 Data Models
All data structures use `BaseModel`:
- `GenerateConfig`, `ModelOutput`, `ModelUsage`, `Score`, `Sample`, `EvalLog`, `EvalSample`, `Approval`
- Full JSON serialization/deserialization
- Validation at construction time

### Configuration Composition
Layered override system: eval args > CLI args > task config > GenerateConfig defaults.

### Concurrent Execution
- Parallel sample processing (`--max-samples`)
- Parallel task execution (`--max-tasks`)
- Connection pooling per provider (`--max-connections`)
- Rate limiting and retry with exponential backoff (`--max-retries`, `--timeout`)

---

## 17. Extension Points Summary

| To add a... | Implement | Decorate | Key method |
|-------------|-----------|----------|------------|
| Model provider | Subclass `ModelAPI` | `@modelapi(name="x")` | `async generate(input, tools, choice, config)` |
| Solver | Function returning `Solver` | `@solver` | `async solve(state, generate) -> TaskState` |
| Scorer | Function returning `Scorer` | `@scorer(metrics=[...])` | `async score(state, target) -> Score` |
| Metric | Function returning `Metric` | `@metric` | `def compute(scores) -> Value` |
| Tool | Function returning `Tool` | `@tool` | `async execute(**kwargs) -> ToolResult` |
| Agent | Function returning `Agent` | `@agent` | `async execute(state) -> AgentState` |
| Approver | Function returning `Approver` | `@approver` | `async approve(msg, call, view, hist) -> Approval` |
| Hooks | Subclass `Hooks` | `@hooks` | Override `on_*` methods |
| Dataset | Subclass `Dataset` or use `MemoryDataset` | N/A | `__getitem__`, `__len__` |

---

## 18. Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| pydantic | >=2.11.4 | All data models |
| httpx | any | HTTP client for model providers |
| anyio | >=4.8.0 | Async backend abstraction |
| rich | >=13.3.3 | Terminal output |
| textual | >=2.1.0 | TUI framework |
| tiktoken | >=0.12.0 | Token counting |
| click | >=8.1.3 | CLI framework |
| fsspec | >=2023.1.0 | Filesystem abstraction (local, S3, Azure) |
| numpy | any | Numerical computation |
| jsonschema | >3.1.1 | JSON validation |
| tenacity | any | Retry logic |
| shortuuid | any | ID generation |

---

## Verification Notes

All claims in this document were verified against source files on 2026-03-26:

- `ModelAPI` abstract class: confirmed at `model/_model.py:130`
- `Solver` protocol: confirmed at `solver/_solver.py:78`
- `Scorer` protocol: confirmed at `scorer/_scorer.py:34`
- `Agent` protocol: confirmed at `agent/_agent.py:92`
- `Tool` protocol: confirmed at `tool/_tool.py:81`
- `Hooks` base class: confirmed at `hooks/_hooks.py:283`
- Provider count (26 `@modelapi`): confirmed via grep of `providers.py`
- Event count (17+ types): confirmed via `event/__init__.py` exports
- CLI commands (11): confirmed via `_cli/main.py` command registration
- Public API surface: confirmed via top-level `__init__.py`

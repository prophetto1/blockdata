# Python Bundle: `agent`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `40`

## Files

- `agent/__init__.py`
- `agent/_agent.py`
- `agent/_as_solver.py`
- `agent/_as_tool.py`
- `agent/_bridge/__init__.py`
- `agent/_bridge/anthropic_api.py`
- `agent/_bridge/anthropic_api_impl.py`
- `agent/_bridge/bridge.py`
- `agent/_bridge/completions.py`
- `agent/_bridge/google_api.py`
- `agent/_bridge/google_api_impl.py`
- `agent/_bridge/responses.py`
- `agent/_bridge/responses_impl.py`
- `agent/_bridge/sandbox/__init__.py`
- `agent/_bridge/sandbox/bridge.py`
- `agent/_bridge/sandbox/proxy.py`
- `agent/_bridge/sandbox/service.py`
- `agent/_bridge/sandbox/types.py`
- `agent/_bridge/types.py`
- `agent/_bridge/util.py`
- `agent/_filter.py`
- `agent/_handoff.py`
- `agent/_human/__init__.py`
- `agent/_human/agent.py`
- `agent/_human/commands/__init__.py`
- `agent/_human/commands/clock.py`
- `agent/_human/commands/command.py`
- `agent/_human/commands/instructions.py`
- `agent/_human/commands/note.py`
- `agent/_human/commands/score.py`
- `agent/_human/commands/status.py`
- `agent/_human/commands/submit.py`
- `agent/_human/install.py`
- `agent/_human/panel.py`
- `agent/_human/service.py`
- `agent/_human/state.py`
- `agent/_human/view.py`
- `agent/_react.py`
- `agent/_run.py`
- `agent/_types.py`

## `agent/__init__.py`

```python
from inspect_ai.tool._mcp._tools_bridge import BridgedToolsSpec

from ._agent import Agent, AgentState, agent, agent_with, is_agent
from ._as_solver import as_solver
from ._as_tool import as_tool
from ._bridge.bridge import agent_bridge, bridge
from ._bridge.sandbox.bridge import sandbox_agent_bridge
from ._bridge.sandbox.types import SandboxAgentBridge
from ._bridge.types import AgentBridge
from ._filter import MessageFilter, content_only, last_message, remove_tools
from ._handoff import handoff
from ._human.agent import human_cli
from ._react import react
from ._run import run
from ._types import (
    AgentAttempts,
    AgentContinue,
    AgentPrompt,
    AgentSubmit,
)

__all__ = [
    "react",
    "bridge",
    "human_cli",
    "run",
    "handoff",
    "as_tool",
    "as_solver",
    "agent_bridge",
    "sandbox_agent_bridge",
    "AgentBridge",
    "SandboxAgentBridge",
    "BridgedToolsSpec",
    "content_only",
    "last_message",
    "remove_tools",
    "MessageFilter",
    "Agent",
    "AgentState",
    "agent",
    "agent_with",
    "is_agent",
    "AgentPrompt",
    "AgentAttempts",
    "AgentContinue",
    "AgentSubmit",
]
```

## `agent/_agent.py`

```python
from copy import copy, deepcopy
from functools import wraps
from inspect import signature
from typing import (
    Any,
    Callable,
    ParamSpec,
    Protocol,
    TypeGuard,
    cast,
    get_type_hints,
    overload,
    runtime_checkable,
)

from inspect_ai._util.registry import (
    RegistryInfo,
    extract_named_params,
    is_registry_object,
    registry_add,
    registry_info,
    registry_name,
    registry_tag,
    set_registry_info,
)
from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageAssistant,
)
from inspect_ai.model._model_output import ChatCompletionChoice, ModelOutput
from inspect_ai.util._limited_conversation import ChatMessageList


class AgentState:
    """Agent state."""

    def __init__(self, *, messages: list[ChatMessage]) -> None:
        self._messages: list[ChatMessage] = ChatMessageList(messages)
        self._output: ModelOutput | None = None

    @property
    def messages(self) -> list[ChatMessage]:
        """Conversation history."""
        return self._messages

    @messages.setter
    def messages(self, messages: list[ChatMessage]) -> None:
        self._messages = ChatMessageList(messages)

    @property
    def output(self) -> ModelOutput:
        """Model output."""
        # if there is no output yet then synthesize it from the last assistant message
        if self._output is None:
            # look for the last assistant message
            for message in reversed(self.messages):
                if isinstance(message, ChatMessageAssistant):
                    self._output = ModelOutput(
                        model=message.model or "",
                        choices=[
                            ChatCompletionChoice(
                                message=message.model_copy(),
                                stop_reason="stop",
                            )
                        ],
                    )
                    break

            # no assistant message, so generate an empty model output
            if self._output is None:
                self._output = ModelOutput()

        return self._output

    @output.setter
    def output(self, output: ModelOutput) -> None:
        """Set the model output."""
        self._output = output

    def __copy__(self) -> "AgentState":
        state = AgentState(messages=copy(self.messages))
        state.output = self.output.model_copy()
        return state

    def __deepcopy__(self, memo: dict[int, Any]) -> "AgentState":
        state = AgentState(messages=deepcopy(self.messages, memo))
        state.output = self.output.model_copy(deep=True)
        return state


@runtime_checkable
class Agent(Protocol):
    async def __call__(
        self,
        state: AgentState,
        *args: Any,
        **kwargs: Any,
    ) -> AgentState:
        """Agents perform tasks and participate in conversations.

        Agents are similar to tools however they are participants
        in conversation history and can optionally append messages
        and model output to the current conversation state.

        You can give the model a tool that enables handoff to
        your agent using the `handoff()` function.

        You can create a simple tool (that receives a string as
        input) from an agent using `as_tool()`.

        Args:
            state: Agent state (conversation history and last model output)
            *args: Arguments for the agent.
            **kwargs: Keyword arguments for the agent.

        Returns:
            AgentState: Updated agent state.
        """
        ...


P = ParamSpec("P")


@overload
def agent(func: Callable[P, Agent]) -> Callable[P, Agent]: ...


@overload
def agent() -> Callable[[Callable[P, Agent]], Callable[P, Agent]]: ...


@overload
def agent(
    *,
    name: str | None = None,
    description: str | None = None,
) -> Callable[[Callable[P, Agent]], Callable[P, Agent]]: ...


def agent(
    func: Callable[P, Agent] | None = None,
    *,
    name: str | None = None,
    description: str | None = None,
) -> Callable[P, Agent] | Callable[[Callable[P, Agent]], Callable[P, Agent]]:
    r"""Decorator for registering agents.

    Args:
        func: Agent function
        name: Optional name for agent. If the decorator has no name
            argument then the name of the agent creation function
            will be used as the name of the agent.
        description: Description for the agent when used as
            an ordinary tool or handoff tool.

    Returns:
        Agent with registry attributes.
    """

    def create_agent_wrapper(agent_type: Callable[P, Agent]) -> Callable[P, Agent]:
        from inspect_ai.solver._constants import SOLVER_ALL_PARAMS_ATTR

        # determine the name (explicit or implicit from object)
        agent_name = registry_name(
            agent_type, name if name else getattr(agent_type, "__name__")
        )

        # wrap instantiations of agent so they carry registry info and metrics
        @wraps(agent_type)
        def agent_wrapper(*args: P.args, **kwargs: P.kwargs) -> Agent:
            # create agent
            agent = agent_type(*args, **kwargs)

            # capture explicit name and description that agent may have
            # (still use passed name/description if specified)
            if is_registry_object(agent):
                info = registry_info(agent)
                registry_name = info.name
                registry_description = info.metadata.get(AGENT_DESCRIPTION, None)
            else:
                registry_name = None
                registry_description = None

            # If name was explicitly passed to decorator, use agent_name (which uses it)
            # Otherwise, preserve inner agent's name if available
            final_name = agent_name if name else (registry_name or agent_name)

            registry_tag(
                agent_type,
                agent,
                RegistryInfo(
                    type="agent",
                    name=final_name,
                    metadata={AGENT_DESCRIPTION: description or registry_description},
                ),
                *args,
                **kwargs,
            )

            named_params = extract_named_params(agent_type, True, *args, **kwargs)
            setattr(agent, SOLVER_ALL_PARAMS_ATTR, named_params)

            return agent

        # If a user's code runs "from __future__ import annotations", all type annotations are stored as strings,
        # which can break introspection-based mechanisms (like inspecting a function’s signature).
        # The following two lines resolve these string annotations using the original function's globals,
        # ensuring that any forward references (e.g., "Agent") are evaluated to their actual types,
        # and then reassign the original function's signature to the wrapper.
        agent_wrapper.__annotations__ = get_type_hints(
            agent_wrapper, agent_type.__globals__
        )
        agent_wrapper.__annotations__["return"] = Agent
        agent_wrapper.__signature__ = signature(agent_type)  # type: ignore[attr-defined]

        # register
        return agent_register(cast(Callable[P, Agent], agent_wrapper), agent_name)

    if func is not None:
        return create_agent_wrapper(func)
    else:
        return create_agent_wrapper


def agent_with(
    agent: Agent,
    *,
    name: str | None = None,
    description: str | None = None,
) -> Agent:
    """Agent with modifications to name and/or description

    This function modifies the passed agent in place and
    returns it. If you want to create multiple variations
    of a single agent using `agent_with()` you should create
    the underlying agent multiple times.

    Args:
       agent: Agent instance to modify.
       name: Agent name (optional).
       description: Agent description (optional).

    Returns:
       The passed agent with the requested modifications.
    """
    # resolve name and description
    if is_registry_object(agent):
        info = registry_info(agent)
        name = name or info.name
        description = description or info.metadata.get(AGENT_DESCRIPTION, None)

    # now set registry info
    set_registry_info(
        agent,
        RegistryInfo(
            type="agent",
            name=name or "agent",
            metadata={AGENT_DESCRIPTION: description}
            if description is not None
            else {},
        ),
    )

    return agent


def agent_register(agent: Callable[P, Agent], name: str) -> Callable[P, Agent]:
    r"""Register a function or class as an agent.

    Args:
        agent: Agent function or a class derived from Agent.
        name (str): Name of agent (Optional, defaults to object name)

    Returns:
        Agent with registry attributes.
    """
    registry_add(
        agent,
        RegistryInfo(type="agent", name=name),
    )
    return agent


def is_agent(obj: Any) -> TypeGuard[Agent]:
    """Check if an object is an Agent.

    Determines if the provided object is registered as an Agent in the system registry.
    When this function returns True, type checkers will recognize 'obj' as an Agent type.

    Args:
        obj: Object to check against the registry.

    Returns:
        True if the object is a registered Agent, False otherwise.
        Acts as a TypeGuard to provide type narrowing for static type checkers.
    """
    return is_registry_object(obj, type="agent")


AGENT_DESCRIPTION = "description"
```

## `agent/_as_solver.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from inspect_ai.util._limit import Limit, apply_limits
from inspect_ai.util._span import span

if TYPE_CHECKING:
    from inspect_ai.solver._solver import Solver

from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_info,
    registry_params,
    registry_unqualified_name,
    set_registry_info,
    set_registry_params,
)
from inspect_ai.tool._tool_info import parse_tool_info

from ._agent import Agent, AgentState


def as_solver(agent: Agent, limits: list[Limit] = [], **agent_kwargs: Any) -> Solver:
    """Convert an agent to a solver.

    Note that agents used as solvers will only receive their first parameter
    (`state`). Any other parameters must provide appropriate defaults
    or be explicitly specified in `agent_kwargs`

    Args:
       agent: Agent to convert.
       limits: List of limits to apply to the agent. Should a limit
          be exceeded, the Sample ends and proceeds to scoring.
       **agent_kwargs: Arguments to curry to Agent function (required
          if the agent has parameters without default values).

    Solver:
       Solver from agent.
    """
    from inspect_ai.solver._constants import SOLVER_ALL_PARAMS_ATTR
    from inspect_ai.solver._solver import Generate, solver
    from inspect_ai.solver._task_state import TaskState

    # agent must be registered (so we can get its name)
    if not is_registry_object(agent):
        raise RuntimeError(
            "Agent passed to as_solver was not created by an @agent decorated function"
        )
    agent_name = registry_unqualified_name(agent)

    # check to make sure we have all the parameters we need to run the agent
    agent_info = parse_tool_info(agent)
    for name, param in list(agent_info.parameters.properties.items())[1:]:
        if param.default is None and name not in agent_kwargs:
            raise ValueError(
                f"To use the {agent_name} agent as a solver "
                + f"you must pass a value for the agent's required '{name}' "
                + "parameter to the as_solver() function."
            )

    @solver
    def agent_to_solver() -> Solver:
        async def solve(state: TaskState, generate: Generate) -> TaskState:
            agent_state = AgentState(messages=state.messages)

            try:
                # run the agent with limits
                with apply_limits(limits):
                    async with span(name=agent_name, type="agent"):
                        agent_state = await agent(agent_state, **agent_kwargs)
            # if an exception occurs, we still want to update the TaskState with the
            # AgentState's messages + output so that it appears in the log and is scored
            finally:
                # update messages
                state.messages = agent_state.messages

                # update output if its not empty
                if agent_state.output:
                    state.output = agent_state.output

            return state

        # return solver
        return solve

    # create solver and forward name and registry params from agent
    slv = agent_to_solver()
    set_registry_info(slv, RegistryInfo(type="solver", name=registry_info(agent).name))
    set_registry_params(slv, registry_params(agent))
    setattr(slv, SOLVER_ALL_PARAMS_ATTR, getattr(agent, SOLVER_ALL_PARAMS_ATTR))
    return slv
```

## `agent/_as_tool.py`

```python
from typing import Any

from shortuuid import uuid as shortuuid

from inspect_ai._util.registry import (
    is_registry_object,
    registry_info,
    registry_unqualified_name,
)
from inspect_ai.model._chat_message import ChatMessageAssistant, ChatMessageUser
from inspect_ai.tool._tool import Tool, ToolResult, tool, tool_result_content
from inspect_ai.tool._tool_def import ToolDef, validate_tool_parameters
from inspect_ai.tool._tool_info import ToolInfo, parse_tool_info
from inspect_ai.tool._tool_params import ToolParam
from inspect_ai.util._limit import Limit, apply_limits
from inspect_ai.util._span import span

from ._agent import AGENT_DESCRIPTION, Agent, AgentState


@tool
def as_tool(
    agent: Agent,
    description: str | None = None,
    limits: list[Limit] = [],
    **agent_kwargs: Any,
) -> Tool:
    """Convert an agent to a tool.

    By default the model will see all of the agent's arguments as
    tool arguments (save for `state` which is converted to an `input`
    arguments of type `str`). Provide optional `agent_kwargs` to mask
    out agent parameters with default values (these parameters will
    not be presented to the model as part of the tool interface)

    Args:
       agent: Agent to convert.
       description: Tool description (defaults to agent description)
       limits: List of limits to apply to the agent. Should a limit
          be exceeded, the tool call ends and returns an error
          explaining that a limit was exceeded.
       **agent_kwargs: Arguments to curry to Agent function (arguments
          provided here will not be presented to the model as part
          of the tool interface).

    Returns:
        Tool from agent.
    """
    # agent must be registered (so we can get its name)
    if not is_registry_object(agent):
        raise RuntimeError(
            "Agent passed to as_tool was not created by an @agent decorated function"
        )

    # get tool_info
    tool_info = agent_tool_info(agent, description, **agent_kwargs)

    async def execute(input: str, *args: Any, **kwargs: Any) -> ToolResult:
        # prepare state
        state = AgentState(messages=[ChatMessageUser(content=input, source="input")])

        # pre-generate span ID so call_tool can read it after execution
        agent_span_id = shortuuid()

        # run the agent with limits
        with apply_limits(limits):
            async with span(name=tool_info.name, type="agent", id=agent_span_id):
                state = await agent(state, *args, **(agent_kwargs | kwargs))

        # Store span ID so call_tool can read it after execution
        execute.agent_span_id = agent_span_id  # type: ignore[attr-defined]

        # find assistant message to read content from (prefer output)
        if not state.output.empty:
            return tool_result_content(state.output.message.content)
        elif len(state.messages) > 0 and isinstance(
            state.messages[-1], ChatMessageAssistant
        ):
            return tool_result_content(state.messages[-1].content)
        else:
            return ""

    # add "input" param
    tool_info.parameters.properties = {
        "input": ToolParam(type="string", description="Input message.")
    } | tool_info.parameters.properties
    tool_info.parameters.required.append("input")

    # create tool
    tool_def = ToolDef(
        execute,
        name=tool_info.name,
        description=tool_info.description,
        parameters=tool_info.parameters,
    )
    return tool_def.as_tool()


def agent_tool_info(
    agent: Agent, description: str | None, **agent_kwargs: Any
) -> ToolInfo:
    # get tool_info and name
    tool_info = parse_tool_info(agent)
    tool_info.name = registry_unqualified_name(agent)

    # remove "state" param
    def remove_param(param: str) -> None:
        if param in tool_info.parameters.properties:
            del tool_info.parameters.properties[param]
        if param in tool_info.parameters.required:
            tool_info.parameters.required.remove(param)

    remove_param("state")

    # validate and remove curried params
    for agent_param in agent_kwargs.keys():
        if agent_param in tool_info.parameters.properties:
            remove_param(agent_param)
        else:
            raise ValueError(
                f"Agent {tool_info.name} does not have a '{agent_param}' parameter."
            )

    # resolve and validate description. the description in the call takes
    # precedence, then any @agent(description="<foo>"), and finally any
    # doc comment on the agent's execute function
    reg_info = registry_info(agent)
    tool_info.description = (
        description
        or reg_info.metadata.get(AGENT_DESCRIPTION, None)
        or tool_info.description
    )
    if len(tool_info.description) == 0:
        raise ValueError(
            f"Description not provided for agent function '{tool_info.name}'. Provide a "
            + "description either via @agent(description='<description>'), the description "
            + "argument to as_tool() or handoff(), or via a doc comment on the agent's "
            + "execute function."
        )

    # validate parameter descriptions and types
    validate_tool_parameters(tool_info.name, tool_info.parameters.properties)

    return tool_info
```

## `agent/_bridge/__init__.py`

```python

```

## `agent/_bridge/anthropic_api.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from inspect_ai.agent._bridge.types import AgentBridge
from inspect_ai.model._providers.providers import validate_anthropic_client
from inspect_ai.tool._tools._code_execution import CodeExecutionProviders
from inspect_ai.tool._tools._web_search._web_search import WebSearchProviders

if TYPE_CHECKING:
    from anthropic.types import Message
    from anthropic.types.beta import BetaMessage


async def inspect_anthropic_api_request(
    json_data: dict[str, Any],
    headers: dict[str, str] | None,
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: AgentBridge,
    *,
    beta: bool = False,
) -> "Message | BetaMessage":
    validate_anthropic_client("agent bridge")

    from .anthropic_api_impl import inspect_anthropic_api_request_impl

    return await inspect_anthropic_api_request_impl(
        json_data, headers, web_search, code_execution, bridge, beta=beta
    )
```

## `agent/_bridge/anthropic_api_impl.py`

```python
from __future__ import annotations

import base64
import io
from logging import getLogger
from os import PathLike
from typing import IO, Any, Literal, cast

from anthropic.types import (
    ContentBlock,
    ContentBlockParam,
    DocumentBlockParam,
    ImageBlockParam,
    Message,
    MessageParam,
    SearchResultBlockParam,
    TextBlockParam,
    ToolChoiceParam,
    ToolReferenceBlockParam,
    Usage,
    WebSearchTool20250305Param,
)
from anthropic.types import StopReason as AnthropicStopReason
from anthropic.types.beta import (
    BetaMessage,
    BetaRequestMCPServerToolConfigurationParam,
    BetaRequestMCPServerURLDefinitionParam,
)
from shortuuid import uuid

from inspect_ai._util.content import Content, ContentDocument, ContentImage, ContentText
from inspect_ai._util.images import as_data_uri
from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageAssistant,
    ChatMessageSystem,
    ChatMessageTool,
    ChatMessageUser,
)
from inspect_ai.model._generate_config import GenerateConfig
from inspect_ai.model._internal import CONTENT_INTERNAL_TAG, parse_content_with_internal
from inspect_ai.model._model import ModelName
from inspect_ai.model._model_output import ModelUsage, StopReason
from inspect_ai.model._providers._anthropic_citations import to_inspect_citation
from inspect_ai.model._providers.anthropic import (
    ToolParamDef,
    anthropic_extra_body_fields,
    assistant_message_blocks,
    content_and_tool_calls_from_assistant_content_blocks,
    is_bash_tool,
    is_code_execution_tool,
    is_computer_tool,
    is_text_editor_tool,
    is_tool_param,
    is_web_fetch_tool,
    is_web_search_tool,
)
from inspect_ai.tool._mcp._config import MCPServerConfigHTTP
from inspect_ai.tool._tool import Tool
from inspect_ai.tool._tool_call import ToolCallError
from inspect_ai.tool._tool_choice import ToolChoice, ToolFunction
from inspect_ai.tool._tool_info import ToolInfo
from inspect_ai.tool._tool_params import ToolParams
from inspect_ai.tool._tool_util import tool_to_tool_info
from inspect_ai.tool._tools._code_execution import (
    CodeExecutionProviders,
    code_execution,
)
from inspect_ai.tool._tools._computer._computer import computer
from inspect_ai.tool._tools._execute import bash
from inspect_ai.tool._tools._text_editor import text_editor
from inspect_ai.tool._tools._web_search._web_search import (
    WebSearchProviders,
    web_search,
)

from .types import AgentBridge
from .util import (
    apply_message_ids,
    bridge_generate,
    resolve_generate_config,
    resolve_inspect_model,
)

logger = getLogger(__name__)


async def inspect_anthropic_api_request_impl(
    json_data: dict[str, Any],
    headers: dict[str, str] | None,
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: AgentBridge,
    *,
    beta: bool = False,
) -> Message | BetaMessage:
    # resolve model
    bridge_model_name = str(json_data["model"])
    model = resolve_inspect_model(bridge_model_name, bridge.model_aliases, bridge.model)

    # tools
    anthropic_tools: list[ToolParamDef] | None = json_data.get("tools", None)
    anthropic_mcp_servers: list[BetaRequestMCPServerURLDefinitionParam] | None = (
        json_data.get("mcp_servers", None)
    )
    # validate computer use compatibility
    has_computer_use = any(is_computer_tool(tool) for tool in anthropic_tools or [])
    if has_computer_use and ModelName(model).api != "anthropic":
        raise RuntimeError(
            f"computer use with the Anthropic agent bridge requires an "
            f"Anthropic model, got '{ModelName(model)}'"
        )

    tools = tools_from_anthropic_tools(
        anthropic_tools, anthropic_mcp_servers, web_search, code_execution
    )

    # tool choice
    anthropic_tool_choice: ToolChoiceParam | None = json_data.get("tool_choice", None)
    tool_choice = tool_choice_from_anthropic_tool_choice(anthropic_tool_choice)

    # convert to inspect messages
    input: list[MessageParam] = json_data["messages"]
    debug_log("SCAFFOLD INPUT", input)

    messages = await messages_from_anthropic_input(input, tools)
    debug_log("INSPECT MESSAGES", messages)

    # extract generate config (hoist instructions into system_message)
    config = generate_config_from_anthropic(json_data)
    config.extra_headers = headers
    if config.system_message is not None:
        messages.insert(0, ChatMessageSystem(content=config.system_message))
        config.system_message = None

    # try to maintain id stability
    apply_message_ids(bridge, messages)

    # give inspect-level config priority over agent default config
    config = resolve_generate_config(model, config)

    # if there is a bridge filter give it a shot first
    output, c_message = await bridge_generate(
        bridge, model, messages, tools, tool_choice, config
    )
    if c_message is not None:
        messages.append(c_message)

    debug_log("INSPECT OUTPUT", output.message)

    # update state if we have more messages than the last generation
    bridge._track_state(messages, output)

    # return message (use beta message type if request came from beta endpoint)
    message_class = BetaMessage if beta else Message
    message = message_class.model_construct(
        id=output.message.id or uuid(),
        content=await assistant_message_blocks(output.message, beta=beta),
        model=output.model,
        role="assistant",
        stop_reason=anthropic_stop_reason(output.stop_reason),
        type="message",
        usage=anthropic_usage(output.usage or ModelUsage()),
    )
    debug_log("SCAFFOLD RESPONSE", message)

    return message


def debug_log(caption: str, o: Any) -> None:
    # from inspect_ai._util.json import to_json_str_safe

    # print(caption)
    # print(to_json_str_safe(o))
    pass


def generate_config_from_anthropic(json_data: dict[str, Any]) -> GenerateConfig:
    config = GenerateConfig()
    config.max_tokens = json_data.get("max_tokens", None)
    config.stop_seqs = json_data.get("stop_sequences", None) or None
    config.system_message = json_data.get("system", None)
    config.temperature = json_data.get("temperature", None)
    config.top_k = json_data.get("top_k", None)
    config.top_p = json_data.get("top_p", None)

    thinking = json_data.get("thinking", None)
    if thinking:
        if thinking.get("type", None) == "enabled":
            config.reasoning_tokens = thinking.get("budget_tokens", None)

    tool_choice = json_data.get("tool_choice", {})
    if tool_choice.get("disable_parallel_tool_use", None) is True:
        config.parallel_tool_calls = False

    # extra_body params (i.e. passthrough for native responses)
    extra_body: dict[str, Any] = {}
    for field in anthropic_extra_body_fields():
        if field in json_data:
            extra_body[field] = json_data[field]
    if len(extra_body) > 0:
        config.extra_body = extra_body

    return config


def tools_from_anthropic_tools(
    anthropic_tools: list[ToolParamDef] | None,
    anthropic_mcp_servers: list[BetaRequestMCPServerURLDefinitionParam] | None,
    web_search_providers: WebSearchProviders,
    code_execution_providers: CodeExecutionProviders,
) -> list[ToolInfo | Tool]:
    tools: list[ToolInfo | Tool] = []

    for anthropic_tool in anthropic_tools or []:
        if is_tool_param(anthropic_tool):
            tools.append(
                ToolInfo(
                    name=anthropic_tool["name"],
                    description=anthropic_tool["description"],
                    parameters=ToolParams.model_validate(
                        anthropic_tool["input_schema"]
                    ),
                )
            )
        elif is_text_editor_tool(anthropic_tool):
            tools.append(text_editor())
        elif is_computer_tool(anthropic_tool):
            tools.append(computer())
        elif is_web_search_tool(anthropic_tool):
            tools.append(
                web_search(
                    resolve_web_search_providers(anthropic_tool, web_search_providers)
                )
            )
        elif is_web_fetch_tool(anthropic_tool):
            # web fetch tool is collapsed into web_search for inspect
            pass
        elif is_code_execution_tool(anthropic_tool):
            tools.append(code_execution(providers=code_execution_providers))
        elif is_bash_tool(anthropic_tool):
            tools.append(bash())
        else:
            raise RuntimeError(
                f"ToolParam of type {anthropic_tool['type']} not supported by agent bridge."
            )

    for mcp_server in anthropic_mcp_servers or []:
        # allowed tools (default is 'all')
        tool_configuration: BetaRequestMCPServerToolConfigurationParam = (
            mcp_server.get(
                "tool_configuration", BetaRequestMCPServerToolConfigurationParam()
            )
            or BetaRequestMCPServerToolConfigurationParam()
        )
        if tool_configuration.get("enabled", False) is True:
            allowed_tools = cast(
                list[str] | Literal["all"],
                tool_configuration.get("allowed_tools", "all"),
            )
        else:
            allowed_tools = "all"

        # authorization header
        if "authorization_token" in mcp_server:
            headers: dict[str, str] | None = {
                "Authorization": f"BEARER {mcp_server['authorization_token']}"
            }
        else:
            headers = None

        # build config
        config = MCPServerConfigHTTP(
            type="sse" if "sse" in mcp_server["url"] else "http",
            name=mcp_server["name"],
            tools=allowed_tools,
            url=mcp_server["url"],
            headers=headers,
        )
        # create tool from config
        tools.append(
            ToolInfo(
                name=f"mcp_server_{config.name}",
                description=f"mcp_server_{config.name}",
                options=config.model_dump(),
            )
        )

    return tools


def resolve_web_search_providers(
    tool_param: WebSearchTool20250305Param, web_search: WebSearchProviders
) -> WebSearchProviders:
    # pass through anthropic options if there is no special anthropic config
    anthropic_options = web_search.get("anthropic", False)
    if anthropic_options is True or (
        isinstance(anthropic_options, dict) and len(anthropic_options) == 0
    ):
        # this came from the user in the external scaffold. we want
        # all the fields except the type as our 'web_search' config
        tool_param = tool_param.copy()
        del tool_param["type"]  # type: ignore[misc]

        # this came from the inspect agent_bridge() call. we want
        # to replace it with whatever the user specified in the scaffold.
        web_search = web_search.copy()
        web_search["anthropic"] = tool_param  # type: ignore[typeddict-item]

    return web_search


def tool_choice_from_anthropic_tool_choice(
    tool_choice: ToolChoiceParam | None,
) -> ToolChoice | None:
    if tool_choice is None:
        return None

    match tool_choice["type"]:
        case "any":
            return "any"
        case "auto":
            return "auto"
        case "none":
            return "none"
        case "tool":
            return ToolFunction(name=tool_choice["name"])


async def messages_from_anthropic_input(
    input: list[MessageParam], tools: list[ToolInfo | Tool]
) -> list[ChatMessage]:
    messages: list[ChatMessage] = []

    # resolve tools to tool info
    tools_info = [
        tool_to_tool_info(tool) if not isinstance(tool, ToolInfo) else tool
        for tool in tools
    ]

    # track tool names for tool ids
    tool_names: dict[str, str] = {}

    for param in input:
        if param["role"] == "assistant":
            # resolve str to block
            if isinstance(param["content"], str):
                param_content: list[ContentBlockParam | ContentBlock] = [
                    TextBlockParam(type="text", text=param["content"])
                ]
            else:
                param_content = list(param["content"])
            # create assistant message
            assistant_content, tool_calls = (
                content_and_tool_calls_from_assistant_content_blocks(
                    param_content, tools_info
                )
            )
            messages.append(
                ChatMessageAssistant(content=assistant_content, tool_calls=tool_calls)
            )

            # record tool names for creating ChatMessageTool
            for tool_call in tool_calls or []:
                tool_names[tool_call.id] = tool_call.function

        elif param["role"] == "user":
            if isinstance(param["content"], str):
                messages.append(ChatMessageUser(content=param["content"]))
            else:
                pending_user_content: list[
                    TextBlockParam | ImageBlockParam | DocumentBlockParam
                ] = []

                def flush_pending_user_content() -> None:
                    nonlocal pending_user_content
                    if len(pending_user_content) > 0:  # noqa: B023
                        messages.append(
                            ChatMessageUser(
                                content=[
                                    content_block_to_content(b)
                                    for b in pending_user_content  # noqa: B023
                                ]
                            )
                        )
                        pending_user_content.clear()  # noqa: B023

                for c in param["content"]:
                    if not isinstance(c, dict):
                        logger.warning(f"Unexpected message content: {c}")
                        continue
                    if c["type"] == "tool_result":
                        flush_pending_user_content()
                        content_value = c.get("content")
                        if content_value is None:
                            content: str | list[Content] = ""
                        elif isinstance(content_value, str):
                            content = content_value
                        else:
                            content = [
                                content_block_to_content(b) for b in content_value
                            ]
                        messages.append(
                            ChatMessageTool(
                                tool_call_id=c["tool_use_id"],
                                function=tool_names.get(c["tool_use_id"], None),
                                content=content,
                                error=ToolCallError(
                                    type="unknown",
                                    message=str(content_value) if content_value else "",
                                )
                                if c.get("is_error", False) is True
                                else None,
                            )
                        )
                    elif (
                        c["type"] == "text"
                        or c["type"] == "image"
                        or c["type"] == "document"
                    ):
                        pending_user_content.append(c)
                    else:
                        raise RuntimeError("Unexpected input parameter: {c}")

                flush_pending_user_content()

        else:
            raise RuntimeError(f"Unexpected message role: {param['role']}")

    return messages


def content_block_to_content(
    block: TextBlockParam
    | ImageBlockParam
    | DocumentBlockParam
    | SearchResultBlockParam
    | ToolReferenceBlockParam,
) -> Content:
    if block["type"] == "text":
        text = block["text"]
        text, content_internal = parse_content_with_internal(text, CONTENT_INTERNAL_TAG)
        return ContentText(
            text=text,
            internal=content_internal,
            citations=[
                to_inspect_citation(cite) for cite in block.get("citations", []) or []
            ]
            if block.get("citations", None) is not None
            else None,
        )
    elif block["type"] == "image":
        if block["source"]["type"] == "base64":
            data = base_64_data(block["source"]["data"])
            return ContentImage(
                image=as_data_uri(
                    mime_type=block["source"]["media_type"],
                    data=data,
                )
            )
        else:
            return ContentImage(image=block["source"]["url"])
    elif block["type"] == "document":
        source = block["source"]
        if source["type"] == "text":
            return ContentDocument(
                document=source["data"], mime_type=source["media_type"]
            )
        elif source["type"] == "url":
            return ContentDocument(document=source["url"])
        elif source["type"] == "base64":
            data = base_64_data(source["data"])
            return ContentDocument(
                document=as_data_uri(source["media_type"], data),
                mime_type=source["media_type"],
            )
        elif source["type"] == "content":
            c = source["content"]
            if isinstance(c, str):
                return ContentText(text=c)
            else:
                return content_block_to_content(list(c)[0])
    else:
        raise RuntimeError(f"Unsupported content block type: {type(block)}")


def base_64_data(data: str | IO[bytes] | PathLike[str]) -> str:
    if isinstance(data, io.IOBase):
        data = base64.b64encode(data.read()).decode("utf-8")
    if isinstance(data, str):
        return data
    else:
        raise RuntimeError("Unsupported image content type: {data}")


def anthropic_stop_reason(stop_reason: StopReason) -> AnthropicStopReason:
    match stop_reason:
        case "stop":
            return "end_turn"
        case "max_tokens":
            return "max_tokens"
        case "model_length":
            return "max_tokens"
        case "tool_calls":
            return "tool_use"
        case "content_filter":
            return "refusal"
        case "unknown":
            return "end_turn"


def anthropic_usage(usage: ModelUsage) -> Usage:
    return Usage(
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        cache_creation_input_tokens=usage.input_tokens_cache_write,
        cache_read_input_tokens=usage.input_tokens_cache_read,
    )
```

## `agent/_bridge/bridge.py`

```python
import contextlib
import importlib
import re
from contextvars import ContextVar
from dataclasses import dataclass, field
from functools import wraps
from typing import Any, AsyncGenerator, Awaitable, Callable, Type, cast

from jsonschema import Draft7Validator
from pydantic import BaseModel, Field, ValidationError
from pydantic_core import to_json

from inspect_ai._util._async import is_callable_coroutine
from inspect_ai.agent._agent import Agent, AgentState, agent
from inspect_ai.agent._bridge.types import AgentBridge
from inspect_ai.log._samples import sample_active
from inspect_ai.model._compaction.types import CompactionStrategy
from inspect_ai.model._model import GenerateFilter, get_model
from inspect_ai.model._model_output import ModelOutput
from inspect_ai.model._openai_convert import (
    messages_from_openai,
    messages_to_openai,
)
from inspect_ai.model._providers.providers import (
    validate_anthropic_client,
    validate_openai_client,
)
from inspect_ai.tool._tools._code_execution import CodeExecutionProviders
from inspect_ai.tool._tools._web_search._web_search import (
    WebSearchProviders,
)

from .anthropic_api import inspect_anthropic_api_request
from .completions import inspect_completions_api_request
from .google_api import inspect_google_api_request
from .responses import inspect_responses_api_request
from .util import (
    default_code_execution_providers,
    internal_web_search_providers,
    resolve_web_search_providers,
)

# Headers blocked from bridge clients (exact match, case-insensitive)
_BLOCKED_BRIDGE_HEADERS = frozenset(
    [
        # Inspect internal tracking
        "x-irid",
        # Authentication
        "authorization",
        "x-api-key",
        # Protocol headers
        "content-type",
        "content-length",
        "transfer-encoding",
        "host",
        "connection",
        # SDK internal headers
        "anthropic-version",
        # User-Agent would be misleading since Inspect transforms the request
        "user-agent",
    ]
)

# Header prefixes blocked from bridge clients
_BLOCKED_BRIDGE_HEADER_PREFIXES = ("x-stainless-",)


def filter_bridge_headers(headers: dict[str, str] | None) -> dict[str, str] | None:
    """Filter headers from bridge clients, removing sensitive/internal headers.

    Note: `anthropic-beta` is intentionally NOT blocked - it's used for
    legitimate feature flags (e.g., `code-execution-2025-08-25`).
    """
    if headers is None:
        return None
    filtered = {
        k: v
        for k, v in headers.items()
        if k.lower() not in _BLOCKED_BRIDGE_HEADERS
        and not k.lower().startswith(_BLOCKED_BRIDGE_HEADER_PREFIXES)
    }
    return filtered if filtered else None


@contextlib.asynccontextmanager
async def agent_bridge(
    state: AgentState | None = None,
    *,
    filter: GenerateFilter | None = None,
    retry_refusals: int | None = None,
    compaction: CompactionStrategy | None = None,
    web_search: WebSearchProviders | None = None,
    code_execution: CodeExecutionProviders | None = None,
) -> AsyncGenerator[AgentBridge, None]:
    """Agent bridge.

    Provide Inspect integration for 3rd party agents that use the
    the OpenAI Completions API, OpenAI Responses API, or Anthropic API.
    The bridge patches the OpenAI and Anthropic client libraries
    to redirect any model named "inspect" (or prefaced with
    "inspect/" for non-default models) into the Inspect model API.

    See the [Agent Bridge](https://inspect.aisi.org.uk/agent-bridge.html)
    documentation for additional details.

    Args:
       state: Initial state for agent bridge. Used as a basis for yielding
          an updated state based on traffic over the bridge.
       filter: Filter for bridge model generation.
       retry_refusals: Should refusals be retried? (pass number of times to retry)
       compaction: Compact the conversation when it it is close to overflowing
          the model's context window. See [Compaction](https://inspect.aisi.org.uk/compaction.html) for details on compaction strategies.
       web_search: Configuration for mapping model internal
          web_search tools to Inspect. By default, will map to the
          internal provider of the target model (supported for OpenAI,
          Anthropic, Gemini, Grok, and Perplexity). Pass an alternate
          configuration to use to use an external provider like
          Tavili or Exa for models that don't support internal search.
       code_execution: Configuration for mapping model internal
          code_execution tools to Inspect. By default, will map to the
          internal provider of the target model (supported for OpenAI,
          Anthropic, Google, and Grok). If the provider does not support
          native code execution then the bash() tool will be provided
          (note that this requires a sandbox by declared for the task).
    """
    # ensure one time init
    init_bridge_request_patch()

    # resolve web search config
    web_search = resolve_web_search_providers(web_search)
    code_execution = code_execution or default_code_execution_providers()

    # create a state value that will be used to track mesages going over the bridge
    state = state or AgentState(messages=[])

    # create the bridge
    bridge = AgentBridge(state, filter, retry_refusals, compaction)

    # set the patch config for this context and child coroutines
    token = _patch_config.set(
        PatchConfig(
            enabled=True,
            web_search=web_search,
            code_execution=code_execution,
            bridge=bridge,
        )
    )
    try:
        yield bridge
    finally:
        _patch_config.reset(token)


_patch_initialised: bool = False


@dataclass
class PatchConfig:
    enabled: bool = field(default=False)
    web_search: WebSearchProviders = field(
        default_factory=internal_web_search_providers
    )
    code_execution: CodeExecutionProviders = field(
        default_factory=default_code_execution_providers
    )
    bridge: AgentBridge = field(
        default_factory=lambda: AgentBridge(AgentState(messages=[]))
    )


_patch_config: ContextVar[PatchConfig] = ContextVar(
    "bridge_request_patch_config", default=PatchConfig()
)


def init_bridge_request_patch() -> None:
    global _patch_initialised
    if _patch_initialised:
        return

    init_openai_request_patch()
    init_anthropic_request_patch()
    init_google_request_patch()

    _patch_initialised = True


def init_openai_request_patch() -> None:
    # don't patch if no openai
    if not importlib.util.find_spec("openai"):
        return
    validate_openai_client("agent bridge")

    from openai._base_client import AsyncAPIClient, _AsyncStreamT
    from openai._models import FinalRequestOptions
    from openai._types import Omit, ResponseT

    # extract headers
    def request_headers(options: FinalRequestOptions) -> dict[str, str] | None:
        if isinstance(options.headers, dict) and len(options.headers) > 0:
            headers: dict[str, str] = {}
            for name, value in options.headers.items():
                if not isinstance(value, Omit):
                    headers[name] = value
            return headers

        return None

    # get reference to original method
    original_request = getattr(AsyncAPIClient, "request")
    if original_request is None:
        raise RuntimeError("Couldn't find 'request' method on AsyncAPIClient")

    @wraps(original_request)
    async def patched_request(
        self: AsyncAPIClient,
        cast_to: Type[ResponseT],
        options: FinalRequestOptions,
        *,
        stream: bool = False,
        stream_cls: type[_AsyncStreamT] | None = None,
    ) -> Any:
        # we have patched the underlying request method so now need to figure out when to
        # patch and when to stand down
        config = _patch_config.get()
        if (
            # enabled for this coroutine
            config.enabled
            # completions or responses request
            and options.url in ["/chat/completions", "/responses"]
        ):
            # must also be an explicit request for an inspect model
            json_data = cast(dict[str, Any], options.json_data)
            if targets_inspect_model(json_data):
                if stream:
                    raise_stream_error()

                headers = filter_bridge_headers(request_headers(options))

                if options.url == "/chat/completions":
                    return await inspect_completions_api_request(
                        json_data, headers, config.bridge
                    )
                else:
                    return await inspect_responses_api_request(
                        json_data,
                        headers,
                        config.web_search,
                        config.code_execution,
                        config.bridge,
                    )

        # otherwise just delegate
        return await original_request(
            self,
            cast_to,
            options,
            stream=stream,
            stream_cls=stream_cls,
        )

    setattr(AsyncAPIClient, "request", patched_request)


def init_anthropic_request_patch() -> None:
    # don't patch if no anthropic
    if not importlib.util.find_spec("anthropic"):
        return

    validate_anthropic_client("agent bridge")

    from anthropic._base_client import AsyncAPIClient, _AsyncStreamT
    from anthropic._models import FinalRequestOptions
    from anthropic._types import Omit, ResponseT

    # extract headers
    def request_headers(options: FinalRequestOptions) -> dict[str, str] | None:
        if isinstance(options.headers, dict) and len(options.headers) > 0:
            headers: dict[str, str] = {}
            for name, value in options.headers.items():
                if not isinstance(value, Omit):
                    headers[name] = value
            return headers

        return None

    # get reference to original method
    original_request = getattr(AsyncAPIClient, "request")
    if original_request is None:
        raise RuntimeError("Couldn't find 'request' method on AsyncAPIClient")

    @wraps(original_request)
    async def patched_request(
        self: AsyncAPIClient,
        cast_to: Type[ResponseT],
        options: FinalRequestOptions,
        *,
        stream: bool = False,
        stream_cls: type[_AsyncStreamT] | None = None,
    ) -> Any:
        # we have patched the underlying request method so now need to figure out when to
        # patch and when to stand down
        config = _patch_config.get()
        if (
            # enabled for this coroutine
            config.enabled
            # messages request
            and options.url in ["/v1/messages", "/v1/messages?beta=true"]
        ):
            # must also be an explicit request for an inspect model
            json_data = cast(dict[str, Any], options.json_data)
            if targets_inspect_model(json_data):
                if stream:
                    raise_stream_error()

                is_beta = "beta" in options.url
                return await inspect_anthropic_api_request(
                    json_data,
                    filter_bridge_headers(request_headers(options)),
                    config.web_search,
                    config.code_execution,
                    config.bridge,
                    beta=is_beta,
                )

        # otherwise just delegate
        return await original_request(
            self,
            cast_to,
            options,
            stream=stream,
            stream_cls=stream_cls,
        )

    setattr(AsyncAPIClient, "request", patched_request)


def init_google_request_patch() -> None:
    # don't patch if no google genai
    if not importlib.util.find_spec("google.genai"):
        return

    from google.genai._api_client import BaseApiClient
    from google.genai.types import HttpResponse as SdkHttpResponse

    # get reference to original method
    original_async_request = getattr(BaseApiClient, "async_request")
    if original_async_request is None:
        raise RuntimeError("Couldn't find 'async_request' method on BaseApiClient")

    @wraps(original_async_request)
    async def patched_async_request(
        self: BaseApiClient,
        http_method: str,
        path: str,
        request_dict: dict[str, object],
        http_options: Any = None,
    ) -> SdkHttpResponse:
        config = _patch_config.get()
        if config.enabled and ":generateContent" in path:
            model_name = _google_api_model_name(path)
            if model_name and targets_inspect_model({"model": model_name}):
                if ":streamGenerateContent" in path:
                    raise_stream_error()

                response = await inspect_google_api_request(
                    cast(dict[str, Any], request_dict),
                    config.web_search,
                    config.code_execution,
                    config.bridge,
                )
                import json

                return SdkHttpResponse(headers={}, body=json.dumps(response))

        # otherwise just delegate
        result: SdkHttpResponse = await original_async_request(
            self, http_method, path, request_dict, http_options
        )
        return result

    setattr(BaseApiClient, "async_request", patched_async_request)


def _google_api_model_name(path: str) -> str | None:
    """Extract model name from Google API path like 'models/inspect:generateContent'."""
    match = re.search(r"models/([^/:]+)", path)
    return match.group(1) if match else None


def targets_inspect_model(json_data: dict[str, Any]) -> bool:
    model_name = str(json_data["model"])
    return re.match(r"^inspect/?", model_name) is not None


def raise_stream_error() -> None:
    raise RuntimeError("Streaming not currently supported for agent_bridge()")


@agent
def bridge(
    agent: Callable[[dict[str, Any]], Awaitable[dict[str, Any]]],
) -> Agent:
    """Bridge an external agent into an Inspect Agent.

    ::: callout-note
    Note that this function is deprecated in favor of the `agent_bridge()`
    function. If you are creating a new agent bridge we recommend you use this function rather than `bridge()`.

    If you do choose to use the `bridge()` function, these [examples](https://github.com/UKGovernmentBEIS/inspect_ai/tree/b4670e798dc8d9ff379d4da4ef469be2468d916f/examples/bridge) demostrate its basic usage.
    :::

    Args:
      agent: Callable which takes a sample `dict` and returns a result `dict`.

    Returns:
      Inspect agent.
    """
    validate_openai_client("Agent bridge()")

    from openai.types.chat import ChatCompletionMessageParam

    class BridgeInput(BaseModel):
        messages: list[ChatCompletionMessageParam]

        # here for backward compatibilty w/ previous bridge
        # (we may choose to add this to AgentState at some point)
        metadata: dict[str, Any]

        # temporarily here for backward compatibility w/ previous bridge
        input: list[ChatCompletionMessageParam]

    class BridgeResult(BaseModel):
        output: str
        messages: list[ChatCompletionMessageParam] | None = Field(default=None)

    result_schema = BridgeResult.model_json_schema()
    result_validator = Draft7Validator(result_schema)

    # validate that the agent is an async function
    if not is_callable_coroutine(agent):
        raise TypeError(f"'{agent.__name__}' is not declared as an async callable.")

    async def execute(state: AgentState) -> AgentState:
        # create input (use standard gpt-4 message encoding -- i.e. no 'developer' messages)
        sample = sample_active()
        metadata = (sample.sample.metadata if sample is not None else None) or {}
        messages = await messages_to_openai(state.messages)
        input = BridgeInput(messages=messages, metadata=metadata, input=messages)

        # run target function with patch applied
        async with agent_bridge():
            # call the function
            result_dict = await agent(input.model_dump())
            try:
                result = BridgeResult.model_validate(result_dict)
            except ValidationError:
                # if we fail to validate provide a better human readable error
                errors = list(result_validator.iter_errors(result_dict))
                message = "\n".join(
                    ["Result returned from bridged solver is not valid:"]
                    + [f" - {error.message}" for error in errors]
                    + ["", to_json(result_dict, indent=2).decode()]
                )
                raise ValueError(message)

        # update and return state
        state.output = ModelOutput.from_content(
            model=get_model().name, content=result.output
        )
        if result.messages is not None:
            state.messages = await messages_from_openai(
                result.messages, state.output.model
            )

        return state

    return execute
```

## `agent/_bridge/completions.py`

```python
from __future__ import annotations

from logging import getLogger
from time import time
from typing import TYPE_CHECKING, Any

from shortuuid import uuid

from inspect_ai.agent._bridge.types import AgentBridge
from inspect_ai.model._chat_message import ChatMessageSystem
from inspect_ai.model._generate_config import (
    GenerateConfig,
    ResponseSchema,
)
from inspect_ai.model._openai_convert import messages_from_openai
from inspect_ai.model._providers.providers import validate_openai_client
from inspect_ai.tool._tool_choice import ToolChoice, ToolFunction
from inspect_ai.tool._tool_info import ToolInfo
from inspect_ai.tool._tool_params import ToolParams
from inspect_ai.util._json import JSONSchema

from .util import (
    apply_message_ids,
    bridge_generate,
    resolve_generate_config,
    resolve_inspect_model,
)

if TYPE_CHECKING:
    from openai.types.chat import (
        ChatCompletion,
        ChatCompletionToolChoiceOptionParam,
        ChatCompletionToolParam,
    )


logger = getLogger(__name__)


async def inspect_completions_api_request(
    json_data: dict[str, Any],
    headers: dict[str, str] | None,
    bridge: AgentBridge,
) -> "ChatCompletion":
    validate_openai_client("agent bridge")

    from openai.types.chat import (
        ChatCompletion,
        ChatCompletionMessageParam,
    )

    from inspect_ai.model._openai import (
        openai_chat_choices,
        openai_completion_usage,
    )

    bridge_model_name = str(json_data["model"])
    model = resolve_inspect_model(bridge_model_name, bridge.model_aliases, bridge.model)
    model_name = model.api.model_name

    # convert openai messages to inspect messages
    openai_messages: list[ChatCompletionMessageParam] = json_data["messages"]
    messages = await messages_from_openai(openai_messages, model_name)

    # extract generate config (hoist instructions into system_message)
    config = generate_config_from_openai_completions(json_data)
    config.extra_headers = headers
    if config.system_message is not None:
        messages.insert(0, ChatMessageSystem(content=config.system_message))
        config.system_message = None

    # try to maintain id stability
    apply_message_ids(bridge, messages)

    # read openai tools and tool choice
    openai_tools: list[ChatCompletionToolParam] = json_data.get("tools", [])
    tools = tools_from_openai_tools(openai_tools)
    openai_tool_choice: ChatCompletionToolChoiceOptionParam | None = json_data.get(
        "tool_choice", None
    )
    tool_choice = tool_choice_from_openai_tool_choice(openai_tool_choice)

    # give inspect-level config priority over agent default config
    config = resolve_generate_config(model, config)

    # if there is a bridge filter give it a shot first
    output, c_message = await bridge_generate(
        bridge, model, messages, tools, tool_choice, config
    )
    if c_message is not None:
        messages.append(c_message)

    # update state if we have more messages than the last generation
    bridge._track_state(messages, output)

    # inspect completion to openai completion
    return ChatCompletion(
        id=uuid(),
        created=int(time()),
        object="chat.completion",
        choices=openai_chat_choices(output.choices),
        model=model_name,
        usage=openai_completion_usage(output.usage) if output.usage else None,
    )


def tool_choice_from_openai_tool_choice(
    tool_choice: "ChatCompletionToolChoiceOptionParam" | None,
) -> ToolChoice | None:
    inspect_tool_choice: ToolChoice | None = None
    if tool_choice is not None:
        match tool_choice:
            case "auto" | "none":
                inspect_tool_choice = tool_choice
            case "required":
                inspect_tool_choice = "any"
            case _:
                assert tool_choice["type"] == "function", (
                    '"custom" tool calls are not supported'
                )
                inspect_tool_choice = ToolFunction(name=tool_choice["function"]["name"])
    return inspect_tool_choice


def tools_from_openai_tools(tools: "list[ChatCompletionToolParam]") -> list[ToolInfo]:
    inspect_tools: list[ToolInfo] = []
    for tool in tools:
        assert tool["type"] == "function", '"custom" tool calls are not supported'
        function = tool["function"].copy()
        inspect_tools.append(
            ToolInfo(
                name=function["name"],
                description=function["description"],
                parameters=ToolParams.model_validate(function["parameters"]),
            )
        )
    return inspect_tools


def generate_config_from_openai_completions(
    json_data: dict[str, Any],
) -> GenerateConfig:
    config = GenerateConfig()
    config.max_tokens = json_data.get(
        "max_completion_tokens", json_data.get("max_tokens", None)
    )
    config.top_p = json_data.get("top_p", None)
    config.temperature = json_data.get("temperature", None)
    stop = json_data.get("stop", None)
    if stop:
        config.stop_seqs = [stop] if isinstance(stop, str) else stop
    config.frequency_penalty = json_data.get("frequency_penalty", None)
    config.presence_penalty = json_data.get("presence_penalty", None)
    config.seed = json_data.get("seed", None)
    config.num_choices = json_data.get("n", None)
    config.logprobs = json_data.get("logprobs", None)
    config.top_logprobs = json_data.get("top_logprobs", None)
    config.logit_bias = json_data.get("logit_bias", None)
    config.parallel_tool_calls = json_data.get("parallel_tool_calls", None)
    config.reasoning_effort = json_data.get("reasoning_effort", None)

    # response format
    response_format: dict[str, Any] | None = json_data.get("response_format", None)
    if response_format is not None:
        json_schema: dict[str, Any] | None = response_format.get("json_schema", None)
        if json_schema is not None:
            config.response_schema = ResponseSchema(
                name=json_schema.get("name", "schema"),
                description=json_schema.get("description", None),
                json_schema=JSONSchema.model_validate(json_schema.get("schema", {})),
                strict=json_schema.get("strict", None),
            )

    return config
```

## `agent/_bridge/google_api.py`

```python
from __future__ import annotations

from typing import Any

from inspect_ai.agent._bridge.types import AgentBridge
from inspect_ai.tool._tools._code_execution import CodeExecutionProviders
from inspect_ai.tool._tools._web_search._web_search import WebSearchProviders


async def inspect_google_api_request(
    json_data: dict[str, Any],
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: AgentBridge,
) -> dict[str, Any]:
    from .google_api_impl import inspect_google_api_request_impl

    return await inspect_google_api_request_impl(
        json_data, web_search, code_execution, bridge
    )
```

## `agent/_bridge/google_api_impl.py`

```python
from __future__ import annotations

import base64
import hashlib
import json
from logging import getLogger
from typing import Any, Literal

from shortuuid import uuid

from inspect_ai._util.content import (
    Content,
    ContentImage,
    ContentReasoning,
    ContentText,
)
from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageAssistant,
    ChatMessageSystem,
    ChatMessageTool,
    ChatMessageUser,
)
from inspect_ai.model._generate_config import GenerateConfig
from inspect_ai.model._model import ModelName
from inspect_ai.model._model_output import ModelOutput, ModelUsage, StopReason
from inspect_ai.model._providers._google_computer_use import (
    gemini_action_from_tool_call,
)
from inspect_ai.model._reasoning import (
    parse_content_with_reasoning,
    reasoning_to_think_tag,
)
from inspect_ai.tool._tool import Tool
from inspect_ai.tool._tool_call import ToolCall
from inspect_ai.tool._tool_choice import ToolChoice, ToolFunction
from inspect_ai.tool._tool_info import ToolInfo
from inspect_ai.tool._tool_params import ToolParams
from inspect_ai.tool._tools._code_execution import (
    CodeExecutionProviders,
    code_execution,
)
from inspect_ai.tool._tools._computer._computer import computer
from inspect_ai.tool._tools._web_search._web_search import (
    WebSearchProviders,
    web_search,
)

from .types import AgentBridge
from .util import (
    apply_message_ids,
    bridge_generate,
    resolve_generate_config,
    resolve_inspect_model,
)

logger = getLogger(__name__)


async def inspect_google_api_request_impl(
    json_data: dict[str, Any],
    web_search_providers: WebSearchProviders,
    code_execution_providers: CodeExecutionProviders,
    bridge: AgentBridge,
) -> dict[str, Any]:
    # resolve model
    bridge_model_name = str(json_data.get("model", "inspect"))
    model = resolve_inspect_model(bridge_model_name, bridge.model_aliases, bridge.model)

    # extract request components
    contents: list[dict[str, Any]] = json_data.get("contents", [])
    system_instruction: dict[str, Any] | None = json_data.get(
        "systemInstruction", json_data.get("system_instruction")
    )
    google_tools: list[dict[str, Any]] | None = json_data.get("tools")
    tool_config: dict[str, Any] | None = json_data.get(
        "toolConfig", json_data.get("tool_config")
    )
    generation_config: dict[str, Any] = json_data.get(
        "generationConfig", json_data.get("generation_config", {})
    )

    debug_log("SCAFFOLD INPUT", contents)

    # validate computer use compatibility
    has_computer_use = any(
        "computerUse" in google_tool for google_tool in google_tools or []
    )
    if has_computer_use and ModelName(model).api != "google":
        raise RuntimeError(
            f"computer use with the Google agent bridge requires a "
            f"Google model, got '{ModelName(model)}'"
        )

    # translate tools
    tools = tools_from_google_tools(
        google_tools, web_search_providers, code_execution_providers
    )

    # translate tool choice
    tool_choice = tool_choice_from_google_tool_config(tool_config)

    # translate messages
    messages = messages_from_google_contents(contents, system_instruction)
    debug_log("INSPECT MESSAGES", messages)

    # extract generate config
    config = generate_config_from_google(generation_config)

    # try to maintain id stability
    apply_message_ids(bridge, messages)

    # give inspect-level config priority over agent default config
    config = resolve_generate_config(model, config)

    # generate via bridge
    output, c_message = await bridge_generate(
        bridge, model, messages, tools, tool_choice, config
    )
    if c_message is not None:
        messages.append(c_message)

    debug_log("INSPECT OUTPUT", output.message)

    # update state if we have more messages than the last generation
    bridge._track_state(messages, output)

    # translate response to Gemini format
    response = gemini_response_from_output(output, model.api.model_name)
    debug_log("SCAFFOLD RESPONSE", response)

    return response


def debug_log(caption: str, o: Any) -> None:
    # from inspect_ai._util.json import to_json_str_safe

    # print(caption)
    # print(to_json_str_safe(o))
    pass


def generate_config_from_google(generation_config: dict[str, Any]) -> GenerateConfig:
    config = GenerateConfig()
    config.temperature = generation_config.get("temperature")
    config.max_tokens = generation_config.get("maxOutputTokens")
    config.top_p = generation_config.get("topP", generation_config.get("top_p"))
    config.top_k = generation_config.get("topK", generation_config.get("top_k"))
    config.stop_seqs = generation_config.get(
        "stopSequences", generation_config.get("stop_sequences")
    )

    # NOTE: We deliberately do NOT set config.system_message from system_instruction here.
    # The system_instruction is already converted to ChatMessageSystem messages in
    # messages_from_google_contents(). Setting config.system_message would cause
    # model.generate() to prepend a duplicate system message.

    return config


def tools_from_google_tools(
    google_tools: list[dict[str, Any]] | None,
    web_search_providers: WebSearchProviders,
    code_execution_providers: CodeExecutionProviders,
) -> list[ToolInfo | Tool]:
    tools: list[ToolInfo | Tool] = []

    for google_tool in google_tools or []:
        if "functionDeclarations" in google_tool:
            for func_decl in google_tool["functionDeclarations"]:
                # Parameters can be in "parameters" or "parametersJsonSchema"
                parameters = func_decl.get(
                    "parameters", func_decl.get("parametersJsonSchema", {})
                )
                # Convert Google SDK enum types to strings before validation
                parameters = _convert_google_enums(parameters)
                tools.append(
                    ToolInfo(
                        name=func_decl.get("name", ""),
                        description=func_decl.get("description", ""),
                        parameters=ToolParams.model_validate(parameters)
                        if parameters
                        else ToolParams(),
                    )
                )
        elif "googleSearch" in google_tool:
            tools.append(web_search(web_search_providers))
        elif "codeExecution" in google_tool:
            tools.append(code_execution(providers=code_execution_providers))
        elif "googleSearchRetrieval" in google_tool:
            # Google Search Retrieval (grounding)
            tools.append(web_search(web_search_providers))
        elif "computerUse" in google_tool:
            tools.append(computer())

    return tools


def tool_choice_from_google_tool_config(
    tool_config: dict[str, Any] | None,
) -> ToolChoice | None:
    if not tool_config:
        return None

    function_calling_config = tool_config.get("functionCallingConfig", {})
    mode = function_calling_config.get("mode", "AUTO")

    match mode:
        case "AUTO":
            return "auto"
        case "ANY":
            return "any"
        case "NONE":
            return "none"
        case _:
            allowed = function_calling_config.get("allowedFunctionNames", [])
            if allowed and len(allowed) == 1:
                return ToolFunction(name=allowed[0])
            return "auto"


def messages_from_google_contents(
    contents: list[dict[str, Any]],
    system_instruction: dict[str, Any] | list[Any] | None,
) -> list[ChatMessage]:
    messages: list[ChatMessage] = []

    # track system prompt text so we can strip duplicate prefixes from user messages
    system_prompt_text: str | None = None

    if system_instruction:
        if isinstance(system_instruction, dict):
            parts = system_instruction.get("parts", [])
            system_text = _extract_text_from_parts(parts)
            if system_text:
                messages.append(ChatMessageSystem(content=system_text))
                system_prompt_text = system_text
        elif isinstance(system_instruction, list):
            texts = []
            for item in system_instruction:
                if isinstance(item, str):
                    texts.append(item)
                elif isinstance(item, dict) and "text" in item:
                    texts.append(item["text"])
            if texts:
                seen = set()
                unique_texts = []
                for t in texts:
                    if t not in seen:
                        seen.add(t)
                        unique_texts.append(t)
                combined_text = "\n\n".join(unique_texts)
                messages.append(ChatMessageSystem(content=combined_text))
                system_prompt_text = combined_text

    # prepend a user message if history starts with model function calls
    # (Gemini API requires function call turns to follow a user turn)
    if contents:
        first_content = contents[0]
        first_role = first_content.get("role", "user")
        if first_role == "model":
            first_parts = first_content.get("parts", [])
            has_function_calls = any(
                isinstance(p, dict) and ("functionCall" in p or "function_call" in p)
                for p in first_parts
            )
            if has_function_calls:
                messages.append(
                    ChatMessageUser(content="(continuing from previous context)")
                )
                logger.debug(
                    "Prepending user message before model function call to satisfy Gemini API constraints"
                )

    # track tool call IDs by function name for matching with tool results
    pending_tool_calls: dict[str, list[str]] = {}

    for content in contents:
        role = content.get("role", "user")
        parts = content.get("parts", [])

        if role == "user":
            user_content, tool_messages = _extract_user_parts(parts, pending_tool_calls)
            if user_content:
                # strip duplicate system prompt prefix
                user_content = _strip_system_prompt_prefix(
                    user_content, system_prompt_text
                )
                if user_content:
                    messages.append(ChatMessageUser(content=user_content))
            messages.extend(tool_messages)

        elif role == "model":
            assistant_content, tool_calls = _extract_model_parts(parts)

            pending_tool_calls.clear()
            for tc in tool_calls:
                if tc.function not in pending_tool_calls:
                    pending_tool_calls[tc.function] = []
                pending_tool_calls[tc.function].append(tc.id)

            messages.append(
                ChatMessageAssistant(
                    content=assistant_content if assistant_content else "",
                    tool_calls=tool_calls if tool_calls else None,
                )
            )

    return messages


def _extract_text_from_parts(parts: list[dict[str, Any]]) -> str:
    texts = []
    for part in parts:
        if isinstance(part, dict) and "text" in part:
            texts.append(part["text"])
        elif isinstance(part, str):
            texts.append(part)
    return "".join(texts)


def _strip_system_prompt_prefix(
    user_content: list[Content] | str,
    system_prompt: str | None,
) -> list[Content] | str | None:
    """Strip duplicate system prompt prefix from user message content.

    Gemini CLI sometimes prepends the full system prompt to user messages,
    particularly when sending continuation prompts.
    """
    if not system_prompt:
        return user_content

    if isinstance(user_content, str):
        if user_content.startswith(system_prompt):
            stripped = user_content[len(system_prompt) :].lstrip("\n\r\t ")
            return stripped if stripped else None
        return user_content

    if isinstance(user_content, list) and user_content:
        first_content = user_content[0]
        if isinstance(first_content, ContentText):
            if first_content.text.startswith(system_prompt):
                stripped_text = first_content.text[len(system_prompt) :].lstrip(
                    "\n\r\t "
                )
                if stripped_text:
                    return [ContentText(text=stripped_text)] + list(user_content[1:])
                elif len(user_content) > 1:
                    return list(user_content[1:])
                else:
                    return None
        return user_content

    return user_content


def _extract_user_parts(
    parts: list[dict[str, Any]],
    pending_tool_calls: dict[str, list[str]],
) -> tuple[list[Content] | str | None, list[ChatMessageTool]]:
    # pending_tool_calls maps function_name -> list of call_ids from the previous
    # model message, used to match functionResponse with the correct tool_use_id.
    content_parts: list[Content] = []
    tool_messages: list[ChatMessageTool] = []

    for part in parts:
        if not isinstance(part, dict):
            if isinstance(part, str):
                content_parts.append(ContentText(text=part))
            continue

        if "text" in part:
            content_parts.append(ContentText(text=part["text"]))

        elif "inlineData" in part or "inline_data" in part:
            inline_data = part.get("inlineData", part.get("inline_data", {}))
            mime_type = inline_data.get("mimeType", inline_data.get("mime_type", ""))
            data = inline_data.get("data", "")
            if mime_type.startswith("image/"):
                content_parts.append(
                    ContentImage(image=f"data:{mime_type};base64,{data}")
                )

        elif "functionResponse" in part or "function_response" in part:
            func_response = part.get(
                "functionResponse", part.get("function_response", {})
            )
            func_name = func_response.get("name", "")
            response = func_response.get("response", {})

            if func_name in pending_tool_calls and pending_tool_calls[func_name]:
                call_id = pending_tool_calls[func_name].pop(0)
            else:
                call_id = f"call_{func_name}_{uuid()[:8]}"
                logger.warning(
                    f"No pending tool call found for function '{func_name}', "
                    f"generating new call_id: {call_id}"
                )

            response_content = (
                json.dumps(response) if isinstance(response, dict) else str(response)
            )

            tool_messages.append(
                ChatMessageTool(
                    tool_call_id=call_id,
                    function=func_name,
                    content=response_content,
                )
            )

    if len(content_parts) == 1 and isinstance(content_parts[0], ContentText):
        return content_parts[0].text, tool_messages
    if content_parts:
        return content_parts, tool_messages
    return None, tool_messages


def _extract_model_parts(
    parts: list[dict[str, Any]],
) -> tuple[list[Content] | None, list[ToolCall]]:
    """Extract assistant content and function calls from model parts.

    Returns content as a list (never simplified to string) for message ID stability.
    """
    content_parts: list[Content] = []
    tool_calls: list[ToolCall] = []
    first_fc_signature_captured = False

    embedded_capsule = None
    for part in parts:
        if isinstance(part, dict) and "text" in part:
            _, capsule = parse_content_with_reasoning(part["text"])
            if capsule is not None:
                embedded_capsule = capsule
                break

    for part_idx, part in enumerate(parts):
        if not isinstance(part, dict):
            if isinstance(part, str):
                content_parts.append(ContentText(text=part))
            continue

        if "text" in part:
            text = part["text"]
            remaining_text, capsule = parse_content_with_reasoning(text)
            if capsule is not None:
                if remaining_text:
                    content_parts.append(ContentText(text=remaining_text))
                continue
            if text == "(no content)":
                continue
            content_parts.append(ContentText(text=text))

        elif "functionCall" in part or "function_call" in part:
            func_call = part.get("functionCall", part.get("function_call", {}))
            func_name = func_call.get("name", "")
            args = func_call.get("args", {})

            thought_sig = part.get("thoughtSignature", part.get("thought_signature"))

            if not thought_sig and not first_fc_signature_captured:
                if embedded_capsule:
                    thought_sig = embedded_capsule.reasoning

            if thought_sig and not first_fc_signature_captured:
                if isinstance(thought_sig, str):
                    sig_str = thought_sig
                else:
                    sig_str = base64.b64encode(thought_sig).decode()

                if embedded_capsule and embedded_capsule.reasoning == sig_str:
                    content_parts.append(
                        ContentReasoning(
                            reasoning=embedded_capsule.reasoning,
                            signature=embedded_capsule.signature,
                            redacted=embedded_capsule.redacted,
                            summary=embedded_capsule.summary,
                        )
                    )
                else:
                    content_parts.append(
                        ContentReasoning(
                            reasoning=sig_str,
                            redacted=True,
                        )
                    )
                first_fc_signature_captured = True

            if not isinstance(args, dict):
                args = {"value": args}

            # deterministic call ID for message ID stability
            args_str = json.dumps(args, sort_keys=True) if args else ""
            call_hash = hashlib.md5(
                f"{func_name}:{args_str}:{part_idx}".encode()
            ).hexdigest()[:8]
            call_id = f"call_{func_name}_{call_hash}"

            tool_calls.append(
                ToolCall(
                    id=call_id,
                    function=func_name,
                    arguments=args,
                    type="function",
                )
            )

    if content_parts:
        return content_parts, tool_calls
    return None, tool_calls


def gemini_response_from_output(output: ModelOutput, model_name: str) -> dict[str, Any]:
    parts: list[dict[str, Any]] = []
    working_reasoning_block: ContentReasoning | None = None

    if output.message.content:
        if isinstance(output.message.content, str):
            parts.append({"text": output.message.content})
        else:
            for c in output.message.content:
                if isinstance(c, ContentText):
                    if c.text:
                        parts.append({"text": c.text})
                elif isinstance(c, ContentReasoning):
                    if c.redacted and c.reasoning:
                        working_reasoning_block = c

    if output.message.tool_calls:
        for idx, tc in enumerate(output.message.tool_calls):
            if tc.function == "computer":
                name, args = gemini_action_from_tool_call(tc)
                fc_part: dict[str, Any] = {"functionCall": {"name": name, "args": args}}
            else:
                fc_part = {"functionCall": {"name": tc.function, "args": tc.arguments}}

            if idx == 0 and working_reasoning_block is not None:
                fc_part["thoughtSignature"] = working_reasoning_block.reasoning

            parts.append(fc_part)

    # Embed reasoning as a <think> tag text part so it survives the CLI's history
    # reconstruction (which strips API-level thoughtSignature but preserves text).
    if working_reasoning_block is not None:
        think_tag = reasoning_to_think_tag(working_reasoning_block)
        insert_pos = next((i for i, p in enumerate(parts) if "functionCall" in p), 0)
        parts.insert(insert_pos, {"text": think_tag})

    if not parts:
        parts.append({"text": ""})

    response: dict[str, Any] = {
        "candidates": [
            {
                "content": {"parts": parts, "role": "model"},
                "finishReason": gemini_finish_reason(output.stop_reason),
                "index": 0,
                "safetyRatings": [],
            }
        ],
        "usageMetadata": gemini_usage_metadata(output.usage),
        "modelVersion": model_name,
    }

    # Add convenience text field if there's text content (excluding embedded <think> tags)
    text_content = "".join(
        p.get("text", "")
        for p in parts
        if isinstance(p, dict)
        and "text" in p
        and not p["text"].strip().startswith("<think")
    )
    if text_content:
        response["text"] = text_content

    return response


def gemini_finish_reason(
    stop_reason: StopReason,
) -> Literal["STOP", "MAX_TOKENS", "SAFETY"]:
    match stop_reason:
        case "stop" | "tool_calls" | "unknown":
            return "STOP"
        case "max_tokens" | "model_length":
            return "MAX_TOKENS"
        case "content_filter":
            return "SAFETY"


def gemini_usage_metadata(usage: ModelUsage | None) -> dict[str, int]:
    if usage is None:
        return {
            "promptTokenCount": 0,
            "candidatesTokenCount": 0,
            "totalTokenCount": 0,
        }
    return {
        "promptTokenCount": usage.input_tokens,
        "candidatesTokenCount": usage.output_tokens,
        "totalTokenCount": usage.total_tokens,
    }


def _convert_google_enums(obj: Any) -> Any:
    """Convert Google SDK enum types to their string values.

    Google's genai SDK uses enum classes (e.g., Type.OBJECT, Type.STRING) for type
    fields, but ToolParams expects string literals ("object", "string"). This function
    recursively converts enum values to lowercase strings.
    """
    if isinstance(obj, dict):
        return {k: _convert_google_enums(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_google_enums(item) for item in obj]
    elif hasattr(obj, "value"):  # Enum-like object
        return str(obj.value).lower()
    return obj
```

## `agent/_bridge/responses.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from inspect_ai.agent._bridge.types import AgentBridge
from inspect_ai.model._providers.providers import validate_openai_client
from inspect_ai.tool._tools._code_execution import CodeExecutionProviders
from inspect_ai.tool._tools._web_search._web_search import WebSearchProviders

if TYPE_CHECKING:
    from openai.types.responses import Response


async def inspect_responses_api_request(
    json_data: dict[str, Any],
    headers: dict[str, str] | None,
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: AgentBridge,
) -> "Response":
    validate_openai_client("agent bridge")

    from .responses_impl import inspect_responses_api_request_impl

    return await inspect_responses_api_request_impl(
        json_data, headers, web_search, code_execution, bridge
    )
```

## `agent/_bridge/responses_impl.py`

```python
import json
from logging import getLogger
from time import time
from typing import Any, Iterable, Set, cast

from openai.types.responses import (
    Response,
    ResponseCodeInterpreterToolCall,
    ResponseCodeInterpreterToolCallParam,
    ResponseComputerToolCall,
    ResponseComputerToolCallParam,
    ResponseCustomToolCall,
    ResponseFunctionCallOutputItemListParam,
    ResponseFunctionToolCall,
    ResponseFunctionWebSearch,
    ResponseFunctionWebSearchParam,
    ResponseInputContentParam,
    ResponseInputFileParam,
    ResponseInputImageParam,
    ResponseInputItemParam,
    ResponseInputMessageContentListParam,
    ResponseInputTextParam,
    ResponseOutputItem,
    ResponseOutputMessage,
    ResponseOutputRefusal,
    ResponseOutputText,
    ToolParam,
    WebSearchToolParam,
)
from openai.types.responses import (
    Tool as ResponsesTool,
)
from openai.types.responses.response import (
    IncompleteDetails,
)
from openai.types.responses.response import (
    ToolChoice as ResponsesToolChoice,
)
from openai.types.responses.response_create_params import (
    ToolChoice as ResponsesToolChoiceParam,
)
from openai.types.responses.response_custom_tool_call_output_param import (
    OutputOutputContentList,
)
from openai.types.responses.response_function_web_search import (
    Action as WebSearchAction,
)
from openai.types.responses.response_input_item_param import McpCall as McpCallParam
from openai.types.responses.response_input_item_param import (
    McpListTools as McpListToolsParam,
)
from openai.types.responses.response_input_item_param import (
    Message,
)
from openai.types.responses.response_output_item import (
    McpCall,
    McpListTools,
    McpListToolsTool,
)
from openai.types.responses.tool_param import CodeInterpreter
from pydantic import TypeAdapter
from shortuuid import uuid

from inspect_ai._util.content import (
    Content,
    ContentDocument,
    ContentImage,
    ContentReasoning,
    ContentText,
    ContentToolUse,
)
from inspect_ai._util.json import to_json_str_safe
from inspect_ai._util.logger import warn_once
from inspect_ai.agent._bridge.types import AgentBridge
from inspect_ai.model._call_tools import parse_tool_call
from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageAssistant,
    ChatMessageSystem,
    ChatMessageTool,
    ChatMessageUser,
)
from inspect_ai.model._generate_config import (
    GenerateConfig,
    ResponseSchema,
)
from inspect_ai.model._internal import (
    CONTENT_INTERNAL_TAG,
    content_internal_tag,
    parse_content_with_internal,
)
from inspect_ai.model._model import ModelName
from inspect_ai.model._model_output import StopReason
from inspect_ai.model._openai_responses import (
    code_interpreter_to_tool_use,
    content_from_response_input_content_param,
    is_assistant_message_param,
    is_code_interpreter_tool_param,
    is_computer_call_output,
    is_computer_tool_param,
    is_custom_tool_call_output,
    is_custom_tool_param,
    is_function_call_output,
    is_function_tool_param,
    is_mcp_tool_param,
    is_response_code_interpreter_call,
    is_response_computer_tool_call,
    is_response_custom_tool_call,
    is_response_function_tool_call,
    is_response_input_message,
    is_response_mcp_call,
    is_response_mcp_list_tools,
    is_response_output_message,
    is_response_output_refusal,
    is_response_output_text,
    is_response_reasoning_item,
    is_response_web_search_call,
    is_simple_assistant_message,
    is_tool_choice_function_param,
    is_tool_choice_mcp_param,
    is_web_search_tool_param,
    mcp_call_to_tool_use,
    mcp_list_tools_to_tool_use,
    parse_web_search_action,
    reasoning_from_responses_reasoning,
    responses_extra_body_fields,
    responses_model_usage,
    to_inspect_citation,
    tool_use_to_code_interpreter_param,
    tool_use_to_mcp_call_param,
    tool_use_to_mcp_list_tools_param,
    web_search_to_tool_use,
)
from inspect_ai.model._providers._openai_computer_use import (
    tool_call_arguments_to_actions,
    tool_call_from_openai_computer_tool_call,
)
from inspect_ai.model._reasoning import (
    parse_content_with_reasoning,
    reasoning_to_think_tag,
)
from inspect_ai.tool._mcp._config import MCPServerConfigHTTP
from inspect_ai.tool._tool import Tool
from inspect_ai.tool._tool_call import ToolCall
from inspect_ai.tool._tool_choice import ToolChoice, ToolFunction
from inspect_ai.tool._tool_info import ToolInfo
from inspect_ai.tool._tool_params import ToolParams
from inspect_ai.tool._tool_util import tool_to_tool_info
from inspect_ai.tool._tools._code_execution import (
    CodeExecutionProviders,
    code_execution,
)
from inspect_ai.tool._tools._computer._computer import computer
from inspect_ai.tool._tools._web_search._web_search import (
    WebSearchProviders,
    web_search,
)
from inspect_ai.util._json import JSONSchema

from .util import (
    apply_message_ids,
    bridge_generate,
    resolve_generate_config,
    resolve_inspect_model,
)

logger = getLogger(__name__)


async def inspect_responses_api_request_impl(
    json_data: dict[str, Any],
    headers: dict[str, str] | None,
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: AgentBridge,
) -> Response:
    # resolve model
    bridge_model_name = str(json_data["model"])
    model = resolve_inspect_model(bridge_model_name, bridge.model_aliases, bridge.model)
    model_name = model.api.model_name
    is_openai = ModelName(model).api == "openai"

    # record parallel tool calls
    parallel_tool_calls = json_data.get("parallel_tool_calls", True)

    # validate computer use compatibility
    responses_tools: list[ToolParam] = json_data.get("tools", [])
    has_computer_use = any(is_computer_tool_param(tool) for tool in responses_tools)
    if has_computer_use and not is_openai:
        raise RuntimeError(
            f"computer use with the OpenAI Responses agent bridge requires an "
            f"OpenAI model, got '{ModelName(model)}'"
        )

    # convert openai tools to inspect tools (don't pass custom tools on to
    # non openai models as they don't know how to handle them)
    tools = [
        tool_from_responses_tool(tool, web_search, code_execution)
        for tool in responses_tools
        if is_openai or tool["type"] != "custom"
    ]
    tools = [tool for tool in tools if tool]
    responses_tool_choice: ResponsesToolChoiceParam | None = json_data.get(
        "tool_choice", None
    )
    tool_choice = tool_choice_from_responses_tool_choice(responses_tool_choice)

    # convert to inspect messages
    input: list[ResponseInputItemParam] = json_data["input"]

    debug_log("SCAFFOLD INPUT", input)

    messages = messages_from_responses_input(input, tools, model_name)
    debug_log("INSPECT MESSAGES", messages)

    # extract generate config (hoist instructions into system_message)
    config = generate_config_from_openai_responses(json_data)
    config.extra_headers = headers
    if config.system_message:
        messages.insert(0, ChatMessageSystem(content=config.system_message))
        config.system_message = None

    # try to maintain id stability
    apply_message_ids(bridge, messages)

    # give inspect-level config priority over agent default config
    config = resolve_generate_config(model, config)

    # if there is a bridge filter give it a shot first
    output, c_message = await bridge_generate(
        bridge, model, messages, tools, tool_choice, config
    )
    if c_message is not None:
        messages.append(c_message)

    debug_log("INSPECT OUTPUT", output.message)

    # update state if we have more messages than the last generation
    bridge._track_state(messages, output)

    # return response
    response = Response(
        id=output.message.id or uuid(),
        created_at=int(time()),
        incomplete_details=responses_incomplete_details(output.stop_reason),
        model=model_name,
        object="response",
        output=responses_output_items_from_assistant_message(output.message),
        parallel_tool_calls=parallel_tool_calls,
        tool_choice=responses_tool_choice_param_to_tool_choice(responses_tool_choice),
        tools=responses_tool_params_to_tools(responses_tools),
        usage=responses_model_usage(output.usage),
    )
    debug_log("SCAFFOLD RESPONSE", response)

    return response


def debug_log(caption: str, o: Any) -> None:
    # from inspect_ai._util.json import to_json_str_safe

    # print(caption)
    # print(to_json_str_safe(o))
    pass


def tool_choice_from_responses_tool_choice(
    tool_choice: ResponsesToolChoiceParam | None,
) -> ToolChoice | None:
    inspect_tool_choice: ToolChoice | None = None
    if tool_choice is not None:
        if tool_choice == "auto":
            inspect_tool_choice = tool_choice
        elif tool_choice == "none":
            inspect_tool_choice = tool_choice
        elif tool_choice == "required":
            inspect_tool_choice = "any"
        elif is_tool_choice_function_param(tool_choice):
            inspect_tool_choice = ToolFunction(name=tool_choice["name"])
        elif is_tool_choice_mcp_param(tool_choice):
            if tool_choice["name"] is None:
                raise RuntimeError(
                    "MCP server tool choice requires 'name' field for agent bridge"
                )
            inspect_tool_choice = ToolFunction(name=tool_choice["name"])
        elif tool_choice.get("type") == "allowed_tools":
            raise RuntimeError("ToolChoiceAllowedParam not supported by agent bridge")
        elif tool_choice.get("type") == "custom":
            raise RuntimeError("ToolChoiceCustomParam not supported by agent bridge")
        elif "type" in tool_choice:
            tool_type = str(tool_choice.get("type"))
            if tool_type in ["web_search_preview", "web_search_preview_2025_03_11"]:
                tool_type = "web_search"
            elif tool_type == "code_interpreter":
                tool_type = "code_execution"
            inspect_tool_choice = ToolFunction(name=tool_type)

    return inspect_tool_choice


tool_choice_adapter = TypeAdapter[ResponsesToolChoice](ResponsesToolChoice)


def responses_tool_choice_param_to_tool_choice(
    tool_choice: ResponsesToolChoiceParam | None,
) -> ResponsesToolChoice:
    if tool_choice is None:
        return "auto"
    else:
        return tool_choice_adapter.validate_python(tool_choice)


def tool_from_responses_tool(
    tool_param: ToolParam,
    web_search_providers: WebSearchProviders,
    code_execution_providers: CodeExecutionProviders,
) -> ToolInfo | Tool:
    if is_function_tool_param(tool_param):
        return ToolInfo(
            name=tool_param["name"],
            description=tool_param["description"] or tool_param["name"],
            parameters=ToolParams.model_validate(tool_param["parameters"]),
        )
    elif is_custom_tool_param(tool_param):
        return ToolInfo(
            name=tool_param["name"],
            description=tool_param["description"] or tool_param["name"],
            parameters=ToolParams(
                properties={"input": JSONSchema(type="string", description="Input.")},
                required=["input"],
            ),
            options={"custom_format": tool_param["format"]},
        )
    elif is_web_search_tool_param(tool_param):
        return web_search(
            resolve_web_search_providers(tool_param, web_search_providers)
        )
    elif is_code_interpreter_tool_param(tool_param):
        return code_execution(
            providers=resolve_code_interpreter_providers(
                tool_param, code_execution_providers
            )
        )
    elif is_computer_tool_param(tool_param):
        return computer()
    elif is_mcp_tool_param(tool_param):
        allowed_tools = tool_param["allowed_tools"]
        if isinstance(allowed_tools, dict):
            raise RuntimeError(
                "McpAllowedToolsMcpAllowedToolsFilter not supported by agent bridge"
            )
        config = MCPServerConfigHTTP(
            type="sse" if "sse" in tool_param["server_url"] else "http",
            name=tool_param["server_label"],
            tools=allowed_tools if isinstance(allowed_tools, list) else "all",
            url=tool_param["server_url"],
            headers=tool_param["headers"],
        )
        return ToolInfo(
            name=f"mcp_server_{config.name}",
            description=f"mcp_server_{config.name}",
            options=config.model_dump(),
        )
    else:
        raise RuntimeError(f"ToolParam of type {tool_param.get('type')} not supported.")


def resolve_code_interpreter_providers(
    tool_param: CodeInterpreter,
    code_execution: CodeExecutionProviders,
) -> CodeExecutionProviders:
    # pass through openai options if there is no special openai config
    openai_options = code_execution.get("openai", False)
    if openai_options is True or (
        isinstance(openai_options, dict) and len(openai_options) == 0
    ):
        code_execution["openai"] = {"container": tool_param["container"]}

    return code_execution


def resolve_web_search_providers(
    tool_param: WebSearchToolParam, web_search: WebSearchProviders
) -> WebSearchProviders:
    # pass through openai options if there is no special openai config
    openai_options = web_search.get("openai", False)
    if openai_options is True or (
        isinstance(openai_options, dict) and len(openai_options) == 0
    ):
        if "user_location" in tool_param or "search_context_size" in tool_param:
            # this came from the user in the external scaffold. we want
            # all the fields except the type as our 'web_search' config
            tool_param = tool_param.copy()
            del tool_param["type"]  # type: ignore[misc]

            # this came from the inspect agent_bridge() call. we want
            # to replace it with whatever the user specified in the scaffold.
            web_search = web_search.copy()
            web_search["openai"] = tool_param  # type: ignore[typeddict-item]

    return web_search


tool_list_adapter = TypeAdapter(list[ResponsesTool])


def responses_incomplete_details(stop_reason: StopReason) -> IncompleteDetails | None:
    match stop_reason:
        case "content_filter":
            return IncompleteDetails(reason="content_filter")
        case "max_tokens":
            return IncompleteDetails(reason="max_output_tokens")
        case _:
            return None


def responses_tool_params_to_tools(tool_params: list[ToolParam]) -> list[ResponsesTool]:
    return tool_list_adapter.validate_python(tool_params)


def generate_config_from_openai_responses(json_data: dict[str, Any]) -> GenerateConfig:
    # warn for unsupported params
    def warn_unsupported(param: str) -> None:
        if param in json_data:
            warn_once(logger, f"'{param}' option not supported for agent bridge")

    warn_unsupported("background")  # we don't proxy background polling requests
    warn_unsupported("prompt")  # prompt template

    # capture include if it exists
    include = cast(list[str], json_data.get("include", []))

    config = GenerateConfig()
    config.system_message = json_data.get("instructions", None)
    config.max_tokens = json_data.get("max_output_tokens", None)
    if "message.output_text.logprobs" in include:
        config.logprobs = True
    config.top_logprobs = json_data.get("top_logprobs", None)
    config.parallel_tool_calls = json_data.get("parallel_tool_calls", None)
    reasoning = json_data.get("reasoning", None)
    if reasoning:
        if "effort" in reasoning:
            config.reasoning_effort = reasoning["effort"]
        if "summary" in reasoning:
            config.reasoning_summary = reasoning["summary"]
    config.temperature = json_data.get("temperature", None)
    config.top_p = json_data.get("top_p", None)

    # response format
    text: dict[str, Any] | None = json_data.get("text", None)
    if text is not None:
        format: dict[str, Any] | None = text.get("format", None)
        if format is not None:
            if format.get("type", None) == "json_schema":
                config.response_schema = ResponseSchema(
                    name=format.get("name", "schema"),
                    description=format.get("description", None),
                    json_schema=JSONSchema.model_validate(format.get("schema", {})),
                    strict=format.get("strict", None),
                )

    # extra_body params (i.e. passthrough for native responses)
    extra_body: dict[str, Any] = {}
    for field in responses_extra_body_fields():
        if field in json_data:
            extra_body[field] = json_data[field]
    if len(extra_body) > 0:
        config.extra_body = extra_body

    # return config
    return config


def messages_from_responses_input(
    input: str | list[ResponseInputItemParam],
    tools: list[ToolInfo | Tool],
    model_name: str | None = None,
) -> list[ChatMessage]:
    # enture input is a list
    if isinstance(input, str):
        input = [
            Message(
                type="message",
                role="user",
                content=[ResponseInputTextParam(type="input_text", text=input)],
            )
        ]

    # resolve tools to tool info
    tools_info = [
        tool_to_tool_info(tool) if not isinstance(tool, ToolInfo) else tool
        for tool in tools
    ]

    messages: list[ChatMessage] = []
    function_calls_by_id: dict[str, str] = {}
    pending_assistant_message_params: list[ResponseInputItemParam] = []

    def collect_pending_assistant_message() -> None:
        # codex treats many id fields that are required in the openai sdk types
        # as optional (https://github.com/openai/codex/blob/main/codex-rs/protocol/src/models.rs#L67)
        # this is likely correct for store=False (which codex uses by default).
        # consequently, we provide some ids automatically so that validation succeeds.
        def ensure_id(
            param: ResponseFunctionWebSearchParam
            | ResponseComputerToolCallParam
            | ResponseCodeInterpreterToolCallParam
            | McpListToolsParam
            | McpCallParam,
            prefix: str = "id",
        ) -> None:
            if "id" not in param:
                param["id"] = f"{prefix}_{uuid()}"

        if len(pending_assistant_message_params) > 0:
            content: list[Content] = []
            tool_calls: list[ToolCall] = []
            for param in pending_assistant_message_params:
                # convert simple assistant message to standard format
                if is_simple_assistant_message(param):
                    if isinstance(param["content"], str):
                        param_content: ResponseInputMessageContentListParam = [
                            ResponseInputTextParam(
                                text=param["content"], type="input_text"
                            )
                        ]
                    else:
                        param_content = param["content"]
                    for c in param_content:
                        if c["type"] == "input_text":
                            asst_content, content_internal = (
                                parse_content_with_internal(
                                    c["text"], CONTENT_INTERNAL_TAG
                                )
                            )
                            # Check for serialized <think> tags and restore as ContentReasoning
                            remaining_text, reasoning_capsule = (
                                parse_content_with_reasoning(asst_content)
                            )
                            if reasoning_capsule is not None:
                                content.append(
                                    ContentReasoning(
                                        reasoning=reasoning_capsule.reasoning,
                                        signature=reasoning_capsule.signature,
                                        redacted=reasoning_capsule.redacted,
                                        summary=reasoning_capsule.summary,
                                    )
                                )
                                asst_content = remaining_text
                            if (
                                asst_content
                            ):  # Only add text if there's remaining content
                                content.append(
                                    ContentText(
                                        text=asst_content, internal=content_internal
                                    )
                                )
                        elif c["type"] == "input_image" and c["image_url"] is not None:
                            content.append(
                                ContentImage(image=c["image_url"], detail=c["detail"])
                            )
                        elif c["type"] == "input_file":
                            content.append(
                                ContentDocument(
                                    document=c["file_data"],
                                    filename=c["filename"],
                                    # mime_type auto-detected from file_data URI
                                )
                            )

                elif is_response_output_message(param):
                    for output in param["content"]:
                        text = str(output.get("text", output.get("refusal", "")))

                        asst_content, content_internal = parse_content_with_internal(
                            text, CONTENT_INTERNAL_TAG
                        )

                        if is_response_output_text(output):
                            # Check for serialized <think> tags and restore as ContentReasoning
                            remaining_text, reasoning_capsule = (
                                parse_content_with_reasoning(asst_content)
                            )
                            if reasoning_capsule is not None:
                                content.append(
                                    ContentReasoning(
                                        reasoning=reasoning_capsule.reasoning,
                                        signature=reasoning_capsule.signature,
                                        redacted=reasoning_capsule.redacted,
                                        summary=reasoning_capsule.summary,
                                    )
                                )
                                asst_content = remaining_text
                            if (
                                asst_content
                            ):  # Only add text if there's remaining content
                                content.append(
                                    ContentText(
                                        text=asst_content,
                                        internal=content_internal,
                                        citations=(
                                            [
                                                to_inspect_citation(annotation)
                                                for annotation in output["annotations"]
                                            ]
                                            if output.get("annotations", None)
                                            else None
                                        ),
                                    )
                                )
                        elif is_response_output_refusal(output):
                            content.append(
                                ContentText(
                                    text=output["refusal"],
                                    refusal=True,
                                    internal=content_internal,
                                )
                            )

                elif is_response_function_tool_call(param):
                    function_calls_by_id[param["call_id"]] = param["name"]
                    tool_calls.append(
                        parse_tool_call(
                            id=param["call_id"],
                            function=param["name"],
                            arguments=param["arguments"],
                            tools=tools_info,
                        )
                    )
                elif is_response_custom_tool_call(param):
                    function_calls_by_id[param["call_id"]] = param["name"]
                    tool_call = ToolCall(
                        id=param["call_id"],
                        function=param["name"],
                        arguments={"input": param["input"]},
                        type="custom",
                    )
                    tool_calls.append(tool_call)
                elif is_response_computer_tool_call(param):
                    ensure_id(param)
                    computer_call = ResponseComputerToolCall.model_validate(param)
                    tool_calls.append(
                        tool_call_from_openai_computer_tool_call(computer_call)
                    )

                elif is_response_reasoning_item(param):
                    content.append(reasoning_from_responses_reasoning(param))
                elif is_response_web_search_call(param):
                    ensure_id(param, "ws")
                    # Backwards compat: older SDK data may use "find" instead of
                    # "find_in_page". https://github.com/openai/openai-java/issues/526
                    action = param["action"]
                    if action["type"] == "find":  # type: ignore[comparison-overlap]
                        action["type"] = "find_in_page"
                    web_search = ResponseFunctionWebSearch.model_validate(param)
                    content.append(web_search_to_tool_use(web_search))
                elif is_response_code_interpreter_call(param):
                    ensure_id(param)
                    code_execution = ResponseCodeInterpreterToolCall.model_validate(
                        param
                    )
                    content.append(code_interpreter_to_tool_use(code_execution))
                elif is_response_mcp_list_tools(param):
                    ensure_id(param)
                    mcp_list_tools = McpListTools.model_validate(param)
                    content.append(mcp_list_tools_to_tool_use(mcp_list_tools))
                elif is_response_mcp_call(param):
                    ensure_id(param)
                    mcp_call = McpCall.model_validate(param)
                    content.append(mcp_call_to_tool_use(mcp_call))
                else:
                    raise RuntimeError(
                        f"Unexpected assitant message type: {param['type']}"
                    )

            # some scaffolds (e.g. codex) can present duplicate assistant content
            content = filter_duplicate_assistant_content(content)

            messages.append(
                ChatMessageAssistant(
                    content=content,
                    tool_calls=tool_calls,
                    model=model_name,
                )
            )

            pending_assistant_message_params.clear()

    for item in input:
        # accumulate assistant message params until we clear the assistant message
        if is_assistant_message_param(item):
            pending_assistant_message_params.append(item)
            continue

        # see if we need to collect a pending assistant message
        collect_pending_assistant_message()

        if is_response_input_message(item):
            # normalize item content
            item_content: list[ResponseInputContentParam] = (
                [ResponseInputTextParam(type="input_text", text=item["content"])]
                if isinstance(item["content"], str)
                else item["content"]
                if isinstance(item["content"], list)
                else cast(
                    list[
                        ResponseInputTextParam
                        | ResponseInputImageParam
                        | ResponseInputFileParam
                    ],
                    [item["content"]],
                )
            )

            # create inspect content
            content = [
                content_from_response_input_content_param(c) for c in item_content
            ]
            if item["role"] == "user":
                messages.append(ChatMessageUser(content=content))
            elif item["role"] == "assistant":
                messages.append(ChatMessageAssistant(content=content))
            else:
                messages.append(ChatMessageSystem(content=content))
        elif is_function_call_output(item):
            messages.append(
                ChatMessageTool(
                    tool_call_id=item["call_id"],
                    function=function_calls_by_id.get(item["call_id"]),
                    content=_tool_content_from_openai_tool_output(item["output"]),
                )
            )
        elif is_custom_tool_call_output(item):
            messages.append(
                ChatMessageTool(
                    tool_call_id=item["call_id"],
                    function=function_calls_by_id.get(item["call_id"]),
                    content=_tool_content_from_openai_tool_output(item["output"]),
                )
            )
        elif is_computer_call_output(item):
            messages.append(
                ChatMessageTool(
                    tool_call_id=item["call_id"],
                    function=function_calls_by_id.get(item["call_id"]),
                    content=[ContentImage(image=item["output"]["image_url"])],
                )
            )
        else:
            # ImageGenerationCall
            # ResponseCodeInterpreterToolCallParam
            # McpApprovalRequest
            # McpApprovalResponse
            # ResponseCustomToolCallParam
            # LocalShellCall
            # LocalShellCallOutput
            # ResponseFileSearchToolCallParam
            # ItemReference
            raise RuntimeError(
                f"Type {item['type']} is not supported by the agent bridge"
            )

    # final collect of pending assistant message
    collect_pending_assistant_message()

    return messages


def _tool_content_from_openai_tool_output(
    output: str
    | ResponseFunctionCallOutputItemListParam
    | Iterable[OutputOutputContentList],
) -> str | list[Content]:
    if isinstance(output, str):
        return output
    else:
        content: list[Content] = []
        for o in output:
            if o["type"] == "input_text":
                content.append(ContentText(text=o["text"]))
            elif o["type"] == "input_image" and "image_url" in o:
                content.append(
                    ContentImage(
                        image=o.get("image_url", "") or "",
                        detail=o.get("detail", "auto") or "auto",
                    )
                )

        return content


# some scaffolds (e.g. codex) can present duplciate assistant messages
def filter_duplicate_assistant_content(
    input: list[Content],
) -> list[Content]:
    filtered_input: list[Content] = []
    messages_ids: Set[str] = set()
    for c in reversed(input):
        if c.type == "text" and c.internal:
            internal = to_json_str_safe(c.internal)
            if internal not in messages_ids:
                filtered_input.append(c)
                messages_ids.add(internal)
        else:
            filtered_input.append(c)
    return list(reversed(filtered_input))


output_item_adapter = TypeAdapter(list[ResponseOutputItem])

mcp_tool_adapter = TypeAdapter(list[McpListToolsTool])


def responses_output_items_from_assistant_message(
    message: ChatMessageAssistant,
) -> list[ResponseOutputItem]:
    output: list[ResponseOutputItem] = []
    # normalize message content to list
    message_content = (
        [ContentText(text=message.content)]
        if isinstance(message.content, str)
        else message.content
    )
    for content in message_content:
        if isinstance(content, ContentText):
            # check for content.internal
            if content.internal:
                internal: str = f"\n{content_internal_tag(content.internal)}\n"
            else:
                internal = ""

            # apply internal to content
            content_text = f"{content.text}{internal}"

            output.append(
                ResponseOutputMessage(
                    type="message",
                    id=uuid(),
                    role="assistant",
                    content=[
                        ResponseOutputRefusal(type="refusal", refusal=content_text)
                        if content.refusal
                        else ResponseOutputText(
                            type="output_text",
                            text=content_text,
                            annotations=[],
                            logprobs=[],
                        )
                    ],
                    status="completed",
                )
            )
        elif isinstance(content, ContentReasoning):
            # Serialize reasoning as <think> tag with full attributes (signature, redacted, summary)
            # so it travels through the scaffold as opaque text and can be restored on the way back
            think_tag = reasoning_to_think_tag(content)
            output.append(
                ResponseOutputMessage(
                    type="message",
                    id=uuid(),
                    role="assistant",
                    content=[
                        ResponseOutputText(
                            type="output_text",
                            text=think_tag,
                            annotations=[],
                            logprobs=[],
                        )
                    ],
                    status="completed",
                )
            )

        elif isinstance(content, ContentToolUse):
            if content.tool_type == "web_search":
                output.append(
                    ResponseFunctionWebSearch(
                        type="web_search_call",
                        id=content.id,
                        action=cast(
                            WebSearchAction,
                            parse_web_search_action(content.arguments),
                        ),
                        status="failed" if content.error else "completed",
                    )
                )
            elif content.tool_type == "code_execution":
                code_interpreter_param = tool_use_to_code_interpreter_param(content)
                output.append(
                    ResponseCodeInterpreterToolCall.model_validate(
                        code_interpreter_param
                    )
                )

            elif content.name == "mcp_list_tools":
                # currently this is only ever done by OpenAI Responses so
                # it is safe to read in a validated way (unlike web search)
                mcp_list_tools = tool_use_to_mcp_list_tools_param(content)
                output.append(McpListTools.model_validate(mcp_list_tools))
            else:
                mcp_call = tool_use_to_mcp_call_param(content)
                output.append(McpCall.model_validate(mcp_call))

    for tool_call in message.tool_calls or []:
        if tool_call.function == "computer":
            output.append(
                ResponseComputerToolCall(
                    id=uuid(),
                    type="computer_call",
                    actions=tool_call_arguments_to_actions(tool_call.arguments),
                    call_id=tool_call.id,
                    pending_safety_checks=[],
                    status="completed",
                )
            )
        elif tool_call.type == "custom":
            output.append(
                ResponseCustomToolCall(
                    type="custom_tool_call",
                    call_id=tool_call.id,
                    name=tool_call.function,
                    input=next(iter(tool_call.arguments.values())),
                )
            )
        else:
            output.append(
                ResponseFunctionToolCall(
                    type="function_call",
                    call_id=tool_call.id,
                    name=tool_call.function,
                    arguments=json.dumps(tool_call.arguments),
                )
            )

    return output
```

## `agent/_bridge/sandbox/__init__.py`

```python

```

## `agent/_bridge/sandbox/bridge.py`

```python
import contextlib
from collections.abc import Sequence
from logging import getLogger
from typing import AsyncIterator

import anyio
from shortuuid import uuid

from inspect_ai.model._compaction.types import CompactionStrategy
from inspect_ai.model._model import GenerateFilter, Model
from inspect_ai.tool._mcp._config import MCPServerConfigHTTP
from inspect_ai.tool._mcp._tools_bridge import BridgedToolsSpec
from inspect_ai.tool._sandbox_tools_utils.sandbox import sandbox_with_injected_tools
from inspect_ai.tool._tool_def import ToolDef
from inspect_ai.tool._tools._code_execution import CodeExecutionProviders
from inspect_ai.tool._tools._web_search._web_search import (
    WebSearchProviders,
)
from inspect_ai.util._anyio import inner_exception
from inspect_ai.util._sandbox._cli import SANDBOX_CLI
from inspect_ai.util._sandbox.exec_remote import (
    ExecCompleted,
    ExecRemoteProcess,
    ExecRemoteStreamingOptions,
    ExecStderr,
)

from ..._agent import AgentState
from ..util import default_code_execution_providers, internal_web_search_providers
from .service import MODEL_SERVICE, run_model_service
from .types import SandboxAgentBridge

logger = getLogger(__name__)


@contextlib.asynccontextmanager
async def sandbox_agent_bridge(
    state: AgentState | None = None,
    *,
    model: str | None = None,
    model_aliases: dict[str, str | Model] | None = None,
    filter: GenerateFilter | None = None,
    retry_refusals: int | None = None,
    compaction: CompactionStrategy | None = None,
    sandbox: str | None = None,
    port: int = 13131,
    web_search: WebSearchProviders | None = None,
    code_execution: CodeExecutionProviders | None = None,
    bridged_tools: Sequence[BridgedToolsSpec] | None = None,
) -> AsyncIterator[SandboxAgentBridge]:
    """Sandbox agent bridge.

    Provide Inspect integration for agents running inside sandboxes. Runs
    a proxy server in the container that provides REST endpoints for the OpenAI Completions API, OpenAI Responses API, Anthropic API, and Google API. This proxy server
    runs on port 13131 and routes requests to the current Inspect model provider.

    You should set `OPENAI_BASE_URL=http://localhost:13131/v1`, `ANTHROPIC_BASE_URL=http://localhost:13131`, or `GOOGLE_GEMINI_BASE_URL=http://localhost:13131` when executing
    the agent within the container and ensure that your agent targets the
    model name "inspect" when calling OpenAI, Anthropic, or Google. Use "inspect/<full-model-name>" to target other Inspect model providers.

    Args:
        state: Initial state for agent bridge. Used as a basis for yielding
            an updated state based on traffic over the bridge.
        model: Fallback model for requests that don't use "inspect" or an "inspect/"
            prefixed model (defaults to "inspect", can also specify e.g.
            "inspect/openai/gpt-4o" to force another specific model).
        model_aliases: Map of model name aliases. When a request uses a name
            that appears here, the corresponding value (a ``Model`` instance
            or model spec string) is used instead. Checked before the fallback ``model``.
        filter: Filter for bridge model generation.
        retry_refusals: Should refusals be retried? (pass number of times to retry)
        compaction: Compact the conversation when it it is close to overflowing
            the model's context window. See [Compaction](https://inspect.aisi.org.uk/compaction.html) for details on compaction strategies.
        sandbox: Sandbox to run model proxy server within.
        port: Port to run proxy server on.
        web_search: Configuration for mapping model internal
            web_search tools to Inspect. By default, will map to the
            internal provider of the target model (supported for OpenAI,
            Anthropic, Gemini, Grok, and Perplexity). Pass an alternate
            configuration to use to use an external provider like
            Tavily or Exa for models that don't support internal search.
        code_execution: Configuration for mapping model internal
            code_execution tools to Inspect. By default, will map to the
            internal provider of the target model (supported for OpenAI,
            Anthropic, Google, and Grok). If the provider does not support
            native code execution then the bash() tool will be provided
            (note that this requires a sandbox by declared for the task).
        bridged_tools: Host-side Inspect tools to expose to the sandboxed agent
            via MCP protocol. Each BridgedToolsSpec creates an MCP server that
            makes the specified tools available to the agent. The resolved
            MCPServerConfigStdio objects to pass to CLI agents are available via
            bridge.mcp_server_configs.
    """
    # instance id for this bridge
    instance = f"proxy_{uuid()}"

    # resolve sandbox
    sandbox_env = await sandbox_with_injected_tools(sandbox_name=sandbox)

    # resolve internal services
    web_search = web_search or internal_web_search_providers()
    code_execution = code_execution or default_code_execution_providers()

    # create a state value that will be used to track mesages going over the bridge
    state = state or AgentState(messages=[])

    # Track whether the agent completed successfully. If so, cleanup errors
    # should be logged but not cause the sample to fail.
    agent_completed = False

    try:
        async with anyio.create_task_group() as tg:
            # event to signal startup of model service
            started = anyio.Event()

            # create the bridge (will register bridged tools below)
            bridge = SandboxAgentBridge(
                state=state,
                filter=filter,
                retry_refusals=retry_refusals,
                compaction=compaction,
                port=port,
                model=model,
                model_aliases=model_aliases,
            )

            # register bridged tools with the bridge
            seen_names: set[str] = set()
            for spec in bridged_tools or []:
                if spec.name in seen_names:
                    raise ValueError(
                        f"Duplicate bridged_tools name: '{spec.name}'. "
                        "Each BridgedToolsSpec must have a unique name."
                    )
                seen_names.add(spec.name)
                config = _register_bridged_tools(bridge, spec, port)
                bridge.mcp_server_configs.append(config)

            # sandbox service that receives model requests (and tool calls)
            tg.start_soon(
                run_model_service,
                sandbox_env,
                web_search,
                code_execution,
                bridge,
                instance,
                started,
            )

            # wait for model service to start
            await started.wait()

            # proxy server that runs in container and forwards to sandbox service
            proxy = await sandbox_env.exec_remote(
                cmd=[SANDBOX_CLI, "model_proxy"],
                options=ExecRemoteStreamingOptions(
                    concurrency=False,
                    env={
                        f"{MODEL_SERVICE.upper()}_PORT": str(port),
                        f"{MODEL_SERVICE.upper()}_INSTANCE": instance,
                    },
                    poll_timeout=600,
                ),
            )

            # monitor proxy for unexpected death
            tg.start_soon(_monitor_proxy, proxy)

            # main agent
            try:
                yield bridge
                agent_completed = True
            finally:
                with anyio.CancelScope(shield=True):
                    # ensure the process terminates (no-op if already dead)
                    await proxy.kill()

                # ensure the scope is cancelled
                tg.cancel_scope.cancel()
    except Exception as ex:
        # If the agent completed successfully but we got an error during cleanup,
        # log the error but don't fail the sample.
        if agent_completed:
            logger.warning(
                f"Error during sandbox_agent_bridge cleanup (agent completed successfully): {ex}"
            )
        else:
            # Error occurred before or during agent execution
            raise inner_exception(ex)


def _register_bridged_tools(
    bridge: SandboxAgentBridge, spec: BridgedToolsSpec, port: int
) -> MCPServerConfigHTTP:
    """Register bridged tools with the bridge and return MCP config.

    Tools are registered in bridge.bridged_tools for execution by the service.
    Returns an MCPServerConfigHTTP with URL pointing to the MCP HTTP endpoint.
    """
    # Build tool registry for this server
    tools_dict = {ToolDef(tool).name: tool for tool in spec.tools}
    bridge.bridged_tools[spec.name] = tools_dict

    # Return MCP config with HTTP URL
    return MCPServerConfigHTTP(
        name=spec.name,
        type="http",
        url=f"http://localhost:{port}/mcp/{spec.name}",
        tools="all",
    )


async def _monitor_proxy(proxy: ExecRemoteProcess) -> None:
    """Monitor the proxy process event stream and raise if it dies unexpectedly."""
    stderr: list[str] = []
    async for event in proxy:
        if isinstance(event, ExecStderr):
            stderr.append(event.data)
            logger.debug("model_proxy stderr: %s", event.data.rstrip())
        if isinstance(event, ExecCompleted):
            if not event.success:
                raise RuntimeError(
                    f"Model proxy process exited unexpectedly with failure: {''.join(stderr)}."
                )
            if stderr:
                logger.warning(
                    "model_proxy stderr output on clean exit:\n%s",
                    "".join(stderr).rstrip(),
                )
            return
    # Stream ended without ExecCompleted
    raise RuntimeError(
        f"Model proxy process stream ended unexpectedly: {''.join(stderr)}."
    )
```

## `agent/_bridge/sandbox/proxy.py`

```python
#!/usr/bin/env python3

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
import time
import traceback
from email.utils import formatdate
from http import HTTPStatus
from typing import (
    Any,
    AsyncIterator,
    Awaitable,
    Callable,
    Iterator,
    Optional,
    TypeAlias,
)
from urllib.parse import parse_qs, unquote, urlparse

# ---------- Types ----------
RequestHandler: TypeAlias = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]
RouteMap: TypeAlias = dict[str, RequestHandler]
MethodRoutes: TypeAlias = dict[str, RouteMap]

# ---------- Limits / Defaults ----------
MAX_HEADER_BYTES = 64 * 1024
MAX_BODY_BYTES = 50 * 1024 * 1024
READ_TIMEOUT_S = 300
WRITE_TIMEOUT_S = 300
STREAM_CHUNK = 8192

HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


class AsyncHTTPServer:
    """Async HTTP server supporting GET/POST/OPTIONS with streaming + proxy utilities."""

    def __init__(self, host: str = "127.0.0.1", port: int = 8000) -> None:
        self.host = host
        self.port = port
        self.routes: MethodRoutes = {"GET": {}, "POST": {}, "OPTIONS": {}}
        self.server: asyncio.Server | None = None
        self.enable_cors: bool = True
        self.server_name: str = "asyncio-proxy"

    # -------- Routing --------
    def route(
        self, path: str, method: str = "GET"
    ) -> Callable[[RequestHandler], RequestHandler]:
        """Decorator to register a route (supports wildcard via trailing '*')."""

        def decorator(handler: RequestHandler) -> RequestHandler:
            if method not in self.routes:
                raise ValueError(f"Unsupported method: {method}")
            self.routes[method][path] = handler
            return handler

        return decorator

    def add_route(
        self, path: str, handler: RequestHandler, method: str = "GET"
    ) -> None:
        if method not in self.routes:
            raise ValueError(f"Unsupported method: {method}")
        self.routes[method][path] = handler

    def _find_handler(self, method: str, path: str) -> Optional[RequestHandler]:
        """Find handler by exact match or wildcard (prefix with '*'). Longest prefix wins."""
        routes = self.routes.get(method, {})
        if path in routes:
            return routes[path]
        best: tuple[int, Optional[RequestHandler]] = (-1, None)
        for route, handler in routes.items():
            if route.endswith("*"):
                prefix = route[:-1]
                if path.startswith(prefix) and len(prefix) > best[0]:
                    best = (len(prefix), handler)
        return best[1]

    # -------- Parsing --------
    async def _read_headers(self, reader: asyncio.StreamReader) -> list[str]:
        """Read raw header lines until CRLFCRLF with limits."""
        buf = bytearray()
        while True:
            line = await asyncio.wait_for(reader.readline(), timeout=READ_TIMEOUT_S)
            if not line:
                break
            buf += line
            if len(buf) > MAX_HEADER_BYTES:
                raise ValueError("Header section too large")
            if buf.endswith(b"\r\n\r\n") or buf.endswith(b"\n\n"):
                break
        return buf.decode("iso-8859-1").splitlines()

    async def _read_chunked(self, reader: asyncio.StreamReader) -> bytes:
        """Read and de-chunk a chunked-encoded body into raw bytes."""
        chunks = bytearray()
        while True:
            size_line = (
                await asyncio.wait_for(reader.readline(), timeout=READ_TIMEOUT_S)
            ).strip()
            if not size_line:
                raise ValueError("Malformed chunked encoding")
            # allow chunk extensions: "<hex>;<ext>"
            hex_size = size_line.split(b";", 1)[0]
            try:
                size = int(hex_size, 16)
            except ValueError:
                raise ValueError("Invalid chunk size")
            if size == 0:
                # consume trailing headers until empty line
                while True:
                    trailer = await asyncio.wait_for(
                        reader.readline(), timeout=READ_TIMEOUT_S
                    )
                    if trailer in (b"\r\n", b"\n", b""):
                        break
                break
            chunk = await asyncio.wait_for(
                reader.readexactly(size), timeout=READ_TIMEOUT_S
            )
            chunks += chunk
            # consume CRLF after each chunk
            crlf = await asyncio.wait_for(reader.readline(), timeout=READ_TIMEOUT_S)
            if crlf not in (b"\r\n", b"\n"):
                raise ValueError("Malformed chunk terminator")
            if len(chunks) > MAX_BODY_BYTES:
                raise ValueError("Body too large")
        return bytes(chunks)

    async def _parse_request(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> tuple[str, str, str, dict[str, str], bytes]:
        """Parse an HTTP/1.1 request. Returns (method, full_path, http_version, headers, body)."""
        # Request line
        request_line = await asyncio.wait_for(reader.readline(), timeout=READ_TIMEOUT_S)
        if not request_line:
            raise ValueError("Empty request")

        parts = request_line.decode("ascii", "strict").strip().split()
        if len(parts) != 3:
            raise ValueError("Invalid request line")
        method, full_path, http_version = parts

        # Headers
        headers: dict[str, str] = {}
        raw_header_lines = await self._read_headers(reader)
        for header in raw_header_lines:
            if not header or header in ("\r",):
                continue
            if ":" in header:
                key, value = header.split(":", 1)
                headers[key.strip().lower()] = value.strip()

        # Expect: 100-continue
        expect = headers.get("expect")
        if expect and expect.lower() == "100-continue":
            try:
                writer.write(b"HTTP/1.1 100 Continue\r\n\r\n")
                await asyncio.wait_for(writer.drain(), timeout=WRITE_TIMEOUT_S)
            except Exception:
                pass

        # Body
        body: bytes = b""
        te = headers.get("transfer-encoding", "").lower()
        if "chunked" in te:
            body = await self._read_chunked(reader)
        elif "content-length" in headers:
            content_length = int(headers["content-length"])
            if content_length > MAX_BODY_BYTES:
                raise ValueError("Body too large")
            if content_length > 0:
                body = await asyncio.wait_for(
                    reader.readexactly(content_length), timeout=READ_TIMEOUT_S
                )
        else:
            body = b""

        return method, full_path, http_version, headers, body

    # -------- Response building / streaming --------
    def _cors_headers(self) -> dict[str, str]:
        if not self.enable_cors:
            return {}
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, OpenAI-Organization, OpenAI-Beta",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Max-Age": "600",
        }

    def _build_headers_block(
        self, status: int, headers: dict[str, str], reason: Optional[str] = None
    ) -> bytes:
        phrase = reason or HTTPStatus(status).phrase
        status_line = f"HTTP/1.1 {status} {phrase}\r\n"
        base = {
            "Date": _http_date(),
            "Server": self.server_name,
        }
        out = {**base, **headers}
        out.update(self._cors_headers())
        lines = [status_line]
        for k, v in out.items():
            if v is None:
                continue
            if "\r" in str(v) or "\n" in str(v):
                raise ValueError("Invalid header value")
            lines.append(f"{k}: {v}\r\n")
        lines.append("\r\n")
        return "".join(lines).encode("ascii")

    def _build_response(
        self,
        status: int,
        body: str | bytes | dict[str, Any] | None = None,
        content_type: str = "application/json; charset=utf-8",
        extra_headers: Optional[dict[str, str]] = None,
        reason: Optional[str] = None,
    ) -> bytes:
        if body is None:
            body_bytes = b""
        elif isinstance(body, dict):
            body_bytes = json.dumps(body).encode("utf-8")
        elif isinstance(body, str):
            body_bytes = body.encode("utf-8")
        else:
            body_bytes = body

        hdrs = {
            "Content-Type": content_type,
            "Content-Length": str(len(body_bytes)),
            "Connection": "close",
        }
        if extra_headers:
            hdrs.update(extra_headers)

        return self._build_headers_block(status, hdrs, reason=reason) + body_bytes

    async def _send_streaming_response(
        self,
        writer: asyncio.StreamWriter,
        status: int,
        headers: Optional[dict[str, str]],
        body_iter: AsyncIterator[bytes],
        chunked: bool = True,
        reason: Optional[str] = None,
    ) -> None:
        """Send an internally-generated streaming response (e.g., SSE)."""
        hdrs = {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
        if headers:
            hdrs.update(headers)
        hdrs.setdefault("Content-Type", "text/event-stream; charset=utf-8")
        if chunked:
            hdrs["Transfer-Encoding"] = "chunked"

        writer.write(self._build_headers_block(status, hdrs, reason=reason))
        await asyncio.wait_for(writer.drain(), timeout=WRITE_TIMEOUT_S)

        async for chunk in body_iter:
            if not chunk:
                continue
            if chunked:
                size = f"{len(chunk):X}\r\n".encode("ascii")
                writer.write(size + chunk + b"\r\n")
            else:
                writer.write(chunk)
            await asyncio.wait_for(writer.drain(), timeout=WRITE_TIMEOUT_S)

        if chunked:
            writer.write(b"0\r\n\r\n")
            await asyncio.wait_for(writer.drain(), timeout=WRITE_TIMEOUT_S)

    async def _relay_upstream_response(
        self,
        writer: asyncio.StreamWriter,
        status: int,
        reason: str,
        headers_list: list[tuple[str, str]],
        upstream_reader: asyncio.StreamReader,
        content_length: Optional[int],
    ) -> None:
        """Write upstream status/headers, then pass upstream body bytes through.

        Handles both Content-Length and Transfer-Encoding: chunked without
        re-chunking or decoding.
        """
        # Lowercase map for checks
        headers_lower = {k.lower(): v for k, v in headers_list}
        is_chunked = "chunked" in headers_lower.get("transfer-encoding", "").lower()

        # Compose headers (preserve original case), then add CORS
        cors = self._cors_headers()
        status_line = f"HTTP/1.1 {status} {reason or HTTPStatus(status).phrase}\r\n"
        writer.write(status_line.encode("ascii"))
        for k, v in headers_list:
            writer.write(f"{k}: {v}\r\n".encode("latin-1", "strict"))
        for ck, cv in cors.items():
            writer.write(f"{ck}: {cv}\r\n".encode("ascii"))
        writer.write(b"\r\n")
        await asyncio.wait_for(writer.drain(), timeout=WRITE_TIMEOUT_S)

        # Body relay
        if is_chunked:
            # Relay chunked framing verbatim until final 0-size chunk + trailers
            while True:
                size_line = await upstream_reader.readline()
                if not size_line:
                    break  # upstream closed unexpectedly
                writer.write(size_line)
                # parse size to know when to finish
                try:
                    hex_size = size_line.strip().split(b";", 1)[0]
                    size = int(hex_size, 16)
                except Exception:
                    size = None
                if size == 0:
                    # forward any trailing headers then final CRLF
                    while True:
                        trailer = await upstream_reader.readline()
                        writer.write(trailer)
                        if trailer in (b"\r\n", b"\n", b""):
                            break
                    await writer.drain()
                    break
                if size is not None and size >= 0:
                    data = await upstream_reader.readexactly(size)
                    writer.write(data)
                    crlf = await upstream_reader.readline()
                    writer.write(crlf)
                else:
                    # If size couldn't be parsed, best-effort passthrough a single chunk
                    data = await upstream_reader.read(STREAM_CHUNK)
                    if not data:
                        break
                    writer.write(data)
                await writer.drain()
        else:
            if content_length is not None:
                remaining = content_length
                while remaining > 0:
                    n = min(STREAM_CHUNK, remaining)
                    chunk = await upstream_reader.readexactly(n)
                    writer.write(chunk)
                    await writer.drain()
                    remaining -= len(chunk)
            else:
                # read until EOF
                while True:
                    chunk = await upstream_reader.read(STREAM_CHUNK)
                    if not chunk:
                        break
                    writer.write(chunk)
                    await writer.drain()

    # -------- Connection handler --------
    async def _handle_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        t0 = time.monotonic()
        try:
            method, full_path, http_version, headers, body = await self._parse_request(
                reader, writer
            )
            parsed = urlparse(full_path)
            path = unquote(parsed.path)
            query = parse_qs(parsed.query)

            # OPTIONS preflight
            if method == "OPTIONS":
                response_bytes = self._build_response(204, b"", "text/plain", {})
                writer.write(response_bytes)
                await writer.drain()
                return

            # Find handler
            handler = self._find_handler(method, path)
            if handler:
                # Build request context for handler
                request_data: dict[str, Any] = {
                    "method": method,
                    "path": path,  # decoded path
                    "full_path": full_path,  # includes query
                    "query": query,  # dict[str, list[str]]
                    "http_version": http_version,
                    "headers": headers,  # lowercase keys
                    "raw_body": body,
                    "json": None,
                    "text": None,
                }

                ctype = headers.get("content-type", "")
                if body:
                    if ctype.startswith("application/json"):
                        try:
                            request_data["json"] = json.loads(body.decode("utf-8"))
                        except Exception:
                            request_data["text"] = body.decode(
                                "utf-8", errors="replace"
                            )
                    elif ctype.startswith("text/"):
                        request_data["text"] = body.decode("utf-8", errors="replace")

                # Call handler
                response = await handler(request_data)

                # Relay upstream?
                if "_relay" in response:
                    rinfo = response["_relay"]
                    await self._relay_upstream_response(
                        writer=writer,
                        status=int(rinfo.get("status", 200)),
                        reason=rinfo.get("reason", ""),
                        headers_list=rinfo.get("headers_list", []),
                        upstream_reader=rinfo["reader"],
                        content_length=rinfo.get("content_length"),
                    )
                # Streaming from local generator?
                elif "body_iter" in response:
                    await self._send_streaming_response(
                        writer=writer,
                        status=response.get("status", 200),
                        headers=response.get("headers", {}),
                        body_iter=response["body_iter"],
                        chunked=response.get("chunked", True),
                        reason=response.get("reason"),
                    )
                else:
                    # Normal response
                    status = response.get("status", 200)
                    body_data = response.get("body")
                    content_type = response.get(
                        "content_type", "application/json; charset=utf-8"
                    )
                    headers_extra = response.get("headers", {})
                    resp_bytes = self._build_response(
                        status,
                        body_data,
                        content_type,
                        headers_extra,
                        reason=response.get("reason"),
                    )
                    writer.write(resp_bytes)
            else:
                # 404
                error_response = {
                    "error": {
                        "message": f"Path {path} not found",
                        "type": "not_found",
                        "code": 404,
                    }
                }
                writer.write(self._build_response(404, error_response))

            await writer.drain()
        except Exception as e:
            try:
                err = {
                    "error": {"message": str(e), "type": "internal_error", "code": 500}
                }
                writer.write(self._build_response(500, err))
                await writer.drain()
            except Exception:
                pass
        finally:
            dur_ms = int((time.monotonic() - t0) * 1000)
            try:
                peer = writer.get_extra_info("peername")
                print(
                    f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {peer} handled in {dur_ms} ms"
                )
            except Exception:
                pass
            try:
                writer.close()
                await writer.wait_closed()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass

    # -------- Lifecycle --------
    async def start(self) -> None:
        self.server = await asyncio.start_server(
            self._handle_client, self.host, self.port
        )
        print(f"Server running on http://{self.host}:{self.port}")
        async with self.server:
            await self.server.serve_forever()

    async def stop(self) -> None:
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.server = None


def _http_date() -> str:
    return formatdate(timeval=None, usegmt=True)


async def model_proxy_server(
    port: int, call_bridge_model_service_async: Any = None
) -> AsyncHTTPServer:
    """Create and configure the model proxy server.

    Args:
        port: Port to run the server on
        instance: Instance of service
        call_bridge_model_service_async: Optional bridge service function for testing

    Returns:
        Configured AsyncHTTPServer instance
    """
    # get generate method if not provided (for testing)
    call_bridge_model_service_async = (
        call_bridge_model_service_async or _call_bridge_model_service_async
    )

    # setup server
    server = AsyncHTTPServer(port=port)

    def _sse_bytes(payload: dict[str, Any]) -> bytes:
        # data-only SSE, as used by OpenAI's Chat Completions stream
        # https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8")

    def _iter_chunks(text: str, max_len: int = 48) -> Iterator[str]:
        # Simple fixed-width chunking; adjust max_len to change granularity
        for i in range(0, len(text), max_len):
            yield text[i : i + max_len]

    @server.route("/v1/responses", method="POST")
    async def responses(request: dict[str, Any]) -> dict[str, Any]:
        try:
            json_body = request.get("json", {}) or {}
            stream = json_body.get("stream", False)

            completion = await call_bridge_model_service_async(
                "generate_responses", json_data=json_body
            )

            if stream:

                async def stream_response() -> AsyncIterator[bytes]:
                    # Parse the completion as a dict
                    resp = (
                        completion
                        if isinstance(completion, dict)
                        else json.loads(completion)
                    )

                    # Helper to create SSE event
                    def _sse_event(
                        event_type: str, data: dict[str, Any], seq_num: int
                    ) -> bytes:
                        return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n".encode(
                            "utf-8"
                        )

                    seq_num = 0

                    # 1. response.created event
                    seq_num += 1
                    yield _sse_event(
                        "response.created",
                        {
                            "response": resp,
                            "sequence_number": seq_num,
                            "type": "response.created",
                        },
                        seq_num,
                    )

                    # 2. response.in_progress event
                    seq_num += 1
                    in_progress_resp = dict(resp)
                    in_progress_resp["status"] = "in_progress"
                    yield _sse_event(
                        "response.in_progress",
                        {
                            "response": in_progress_resp,
                            "sequence_number": seq_num,
                            "type": "response.in_progress",
                        },
                        seq_num,
                    )

                    # 3. Process each output item
                    for output_index, output_item in enumerate(resp.get("output", [])):
                        # Use dict directly - output_item is a dict
                        item_id = output_item.get("id", f"item_{output_index}")
                        item_type = output_item.get("type")

                        # 3a. response.output_item.added
                        seq_num += 1
                        # Set initial status to in_progress for streaming
                        item_dict = dict(output_item)
                        if "status" in item_dict:
                            item_dict["status"] = "in_progress"

                        yield _sse_event(
                            "response.output_item.added",
                            {
                                "item": item_dict,
                                "output_index": output_index,
                                "sequence_number": seq_num,
                                "type": "response.output_item.added",
                            },
                            seq_num,
                        )

                        # Process based on item type
                        if item_type == "message":
                            # Process message content - content is a list of dicts
                            for content_index, content in enumerate(
                                output_item.get("content", [])
                            ):
                                content_type = content.get("type")

                                # 3b. response.content_part.added
                                seq_num += 1
                                content_dict = dict(content)
                                if content_type == "output_text":
                                    # Clear text for streaming
                                    content_dict["text"] = ""
                                elif content_type == "refusal":
                                    content_dict["refusal"] = ""

                                yield _sse_event(
                                    "response.content_part.added",
                                    {
                                        "item_id": item_id,
                                        "output_index": output_index,
                                        "content_index": content_index,
                                        "part": content_dict,
                                        "sequence_number": seq_num,
                                        "type": "response.content_part.added",
                                    },
                                    seq_num,
                                )

                                # Stream content
                                if content_type == "output_text":
                                    text = content.get("text", "")
                                    # Stream text in chunks
                                    for chunk in _iter_chunks(text):
                                        seq_num += 1
                                        yield _sse_event(
                                            "response.output_text.delta",
                                            {
                                                "item_id": item_id,
                                                "output_index": output_index,
                                                "content_index": content_index,
                                                "delta": chunk,
                                                "logprobs": [],  # Empty for simulated streaming
                                                "sequence_number": seq_num,
                                                "type": "response.output_text.delta",
                                            },
                                            seq_num,
                                        )

                                    # Text done event
                                    seq_num += 1
                                    yield _sse_event(
                                        "response.output_text.done",
                                        {
                                            "item_id": item_id,
                                            "output_index": output_index,
                                            "content_index": content_index,
                                            "text": text,
                                            "logprobs": [],
                                            "sequence_number": seq_num,
                                            "type": "response.output_text.done",
                                        },
                                        seq_num,
                                    )

                                elif content_type == "refusal":
                                    refusal_text = content.get("refusal", "")
                                    # Stream refusal in chunks
                                    for chunk in _iter_chunks(refusal_text):
                                        seq_num += 1
                                        yield _sse_event(
                                            "response.refusal.delta",
                                            {
                                                "item_id": item_id,
                                                "output_index": output_index,
                                                "content_index": content_index,
                                                "delta": chunk,
                                                "sequence_number": seq_num,
                                                "type": "response.refusal.delta",
                                            },
                                            seq_num,
                                        )

                                    # Refusal done event
                                    seq_num += 1
                                    yield _sse_event(
                                        "response.refusal.done",
                                        {
                                            "item_id": item_id,
                                            "output_index": output_index,
                                            "content_index": content_index,
                                            "refusal": refusal_text,
                                            "sequence_number": seq_num,
                                            "type": "response.refusal.done",
                                        },
                                        seq_num,
                                    )

                                # 3c. response.content_part.done
                                seq_num += 1
                                yield _sse_event(
                                    "response.content_part.done",
                                    {
                                        "item_id": item_id,
                                        "output_index": output_index,
                                        "content_index": content_index,
                                        "part": content,
                                        "sequence_number": seq_num,
                                        "type": "response.content_part.done",
                                    },
                                    seq_num,
                                )

                        elif item_type == "function_call":
                            # Handle function call streaming
                            arguments = output_item.get("arguments", "")

                            # Stream function arguments
                            for chunk in _iter_chunks(arguments, max_len=32):
                                seq_num += 1
                                yield _sse_event(
                                    "response.function_call_arguments.delta",
                                    {
                                        "item_id": item_id,
                                        "output_index": output_index,
                                        "delta": chunk,
                                        "sequence_number": seq_num,
                                        "type": "response.function_call_arguments.delta",
                                    },
                                    seq_num,
                                )

                            # Function arguments done
                            seq_num += 1
                            yield _sse_event(
                                "response.function_call_arguments.done",
                                {
                                    "item_id": item_id,
                                    "output_index": output_index,
                                    "arguments": arguments,
                                    "sequence_number": seq_num,
                                    "type": "response.function_call_arguments.done",
                                },
                                seq_num,
                            )

                        elif item_type == "computer_call":
                            # Computer calls complete immediately (no streaming)
                            pass

                        elif item_type == "reasoning":
                            # Handle reasoning item streaming
                            if output_item.get("content"):
                                for reasoning_idx, reasoning_content in enumerate(
                                    output_item.get("content", [])
                                ):
                                    if (
                                        reasoning_content.get("type")
                                        == "reasoning_text"
                                    ):
                                        text = reasoning_content.get("text", "")
                                        # Stream reasoning text
                                        for chunk in _iter_chunks(text):
                                            seq_num += 1
                                            yield _sse_event(
                                                "response.reasoning_text.delta",
                                                {
                                                    "item_id": item_id,
                                                    "output_index": output_index,
                                                    "content_index": reasoning_idx,
                                                    "delta": chunk,
                                                    "sequence_number": seq_num,
                                                    "type": "response.reasoning_text.delta",
                                                },
                                                seq_num,
                                            )

                                        # Reasoning text done
                                        seq_num += 1
                                        yield _sse_event(
                                            "response.reasoning_text.done",
                                            {
                                                "item_id": item_id,
                                                "output_index": output_index,
                                                "content_index": reasoning_idx,
                                                "text": text,
                                                "sequence_number": seq_num,
                                                "type": "response.reasoning_text.done",
                                            },
                                            seq_num,
                                        )

                            # Handle reasoning summary if present
                            if output_item.get("summary"):
                                for summary_index, summary_part in enumerate(
                                    output_item.get("summary", [])
                                ):
                                    # Add summary part
                                    seq_num += 1
                                    yield _sse_event(
                                        "response.reasoning_summary_part.added",
                                        {
                                            "item_id": item_id,
                                            "output_index": output_index,
                                            "summary_index": summary_index,
                                            "part": summary_part,
                                            "sequence_number": seq_num,
                                            "type": "response.reasoning_summary_part.added",
                                        },
                                        seq_num,
                                    )

                                    if summary_part.get("type") == "summary_text":
                                        text = summary_part.get("text", "")
                                        # Stream summary text
                                        for chunk in _iter_chunks(text):
                                            seq_num += 1
                                            yield _sse_event(
                                                "response.reasoning_summary_text.delta",
                                                {
                                                    "item_id": item_id,
                                                    "output_index": output_index,
                                                    "summary_index": summary_index,
                                                    "delta": chunk,
                                                    "sequence_number": seq_num,
                                                    "type": "response.reasoning_summary_text.delta",
                                                },
                                                seq_num,
                                            )

                                        # Summary text done
                                        seq_num += 1
                                        yield _sse_event(
                                            "response.reasoning_summary_text.done",
                                            {
                                                "item_id": item_id,
                                                "output_index": output_index,
                                                "summary_index": summary_index,
                                                "text": text,
                                                "sequence_number": seq_num,
                                                "type": "response.reasoning_summary_text.done",
                                            },
                                            seq_num,
                                        )

                                    # Summary part done
                                    seq_num += 1
                                    yield _sse_event(
                                        "response.reasoning_summary_part.done",
                                        {
                                            "item_id": item_id,
                                            "output_index": output_index,
                                            "summary_index": summary_index,
                                            "part": summary_part,
                                            "sequence_number": seq_num,
                                            "type": "response.reasoning_summary_part.done",
                                        },
                                        seq_num,
                                    )

                        elif item_type == "file_search_call":
                            # File search events
                            seq_num += 1
                            yield _sse_event(
                                "response.file_search_call.in_progress",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.file_search_call.in_progress",
                                },
                                seq_num,
                            )

                            seq_num += 1
                            yield _sse_event(
                                "response.file_search_call.searching",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.file_search_call.searching",
                                },
                                seq_num,
                            )

                            seq_num += 1
                            yield _sse_event(
                                "response.file_search_call.completed",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.file_search_call.completed",
                                },
                                seq_num,
                            )

                        elif item_type == "web_search_call":
                            # Web search events
                            seq_num += 1
                            yield _sse_event(
                                "response.web_search_call.in_progress",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.web_search_call.in_progress",
                                },
                                seq_num,
                            )

                            seq_num += 1
                            yield _sse_event(
                                "response.web_search_call.searching",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.web_search_call.searching",
                                },
                                seq_num,
                            )

                            seq_num += 1
                            yield _sse_event(
                                "response.web_search_call.completed",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.web_search_call.completed",
                                },
                                seq_num,
                            )

                        elif item_type == "image_generation_call":
                            # Image generation events
                            seq_num += 1
                            yield _sse_event(
                                "response.image_generation_call.in_progress",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.image_generation_call.in_progress",
                                },
                                seq_num,
                            )

                            seq_num += 1
                            yield _sse_event(
                                "response.image_generation_call.generating",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.image_generation_call.generating",
                                },
                                seq_num,
                            )

                            # Could simulate partial images here if result is available

                            seq_num += 1
                            yield _sse_event(
                                "response.image_generation_call.completed",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.image_generation_call.completed",
                                },
                                seq_num,
                            )

                        elif item_type == "code_interpreter_call":
                            # Code interpreter events
                            seq_num += 1
                            yield _sse_event(
                                "response.code_interpreter_call.in_progress",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.code_interpreter_call.in_progress",
                                },
                                seq_num,
                            )

                            # Stream code if available
                            code = item_dict.get("code", "")
                            if code:
                                for chunk in _iter_chunks(code):
                                    seq_num += 1
                                    yield _sse_event(
                                        "response.code_interpreter_call_code.delta",
                                        {
                                            "output_index": output_index,
                                            "item_id": item_id,
                                            "delta": chunk,
                                            "sequence_number": seq_num,
                                            "type": "response.code_interpreter_call_code.delta",
                                        },
                                        seq_num,
                                    )

                                seq_num += 1
                                yield _sse_event(
                                    "response.code_interpreter_call_code.done",
                                    {
                                        "output_index": output_index,
                                        "item_id": item_id,
                                        "code": code,
                                        "sequence_number": seq_num,
                                        "type": "response.code_interpreter_call_code.done",
                                    },
                                    seq_num,
                                )

                            seq_num += 1
                            yield _sse_event(
                                "response.code_interpreter_call.interpreting",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.code_interpreter_call.interpreting",
                                },
                                seq_num,
                            )

                            seq_num += 1
                            yield _sse_event(
                                "response.code_interpreter_call.completed",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.code_interpreter_call.completed",
                                },
                                seq_num,
                            )

                        elif item_type == "mcp_call":
                            # MCP call events
                            seq_num += 1
                            yield _sse_event(
                                "response.mcp_call.in_progress",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.mcp_call.in_progress",
                                },
                                seq_num,
                            )

                            # Stream MCP arguments
                            arguments = item_dict.get("arguments", "")
                            for chunk in _iter_chunks(arguments, max_len=32):
                                seq_num += 1
                                yield _sse_event(
                                    "response.mcp_call_arguments.delta",
                                    {
                                        "output_index": output_index,
                                        "item_id": item_id,
                                        "delta": chunk,
                                        "sequence_number": seq_num,
                                        "type": "response.mcp_call_arguments.delta",
                                    },
                                    seq_num,
                                )

                            seq_num += 1
                            yield _sse_event(
                                "response.mcp_call_arguments.done",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "arguments": arguments,
                                    "sequence_number": seq_num,
                                    "type": "response.mcp_call_arguments.done",
                                },
                                seq_num,
                            )

                            # Complete or fail based on error
                            if item_dict.get("error"):
                                seq_num += 1
                                yield _sse_event(
                                    "response.mcp_call.failed",
                                    {
                                        "output_index": output_index,
                                        "item_id": item_id,
                                        "sequence_number": seq_num,
                                        "type": "response.mcp_call.failed",
                                    },
                                    seq_num,
                                )
                            else:
                                seq_num += 1
                                yield _sse_event(
                                    "response.mcp_call.completed",
                                    {
                                        "output_index": output_index,
                                        "item_id": item_id,
                                        "sequence_number": seq_num,
                                        "type": "response.mcp_call.completed",
                                    },
                                    seq_num,
                                )

                        elif item_type == "mcp_list_tools":
                            # MCP list tools events
                            seq_num += 1
                            yield _sse_event(
                                "response.mcp_list_tools.in_progress",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "sequence_number": seq_num,
                                    "type": "response.mcp_list_tools.in_progress",
                                },
                                seq_num,
                            )

                            # Complete or fail based on error
                            if item_dict.get("error"):
                                seq_num += 1
                                yield _sse_event(
                                    "response.mcp_list_tools.failed",
                                    {
                                        "output_index": output_index,
                                        "item_id": item_id,
                                        "sequence_number": seq_num,
                                        "type": "response.mcp_list_tools.failed",
                                    },
                                    seq_num,
                                )
                            else:
                                seq_num += 1
                                yield _sse_event(
                                    "response.mcp_list_tools.completed",
                                    {
                                        "output_index": output_index,
                                        "item_id": item_id,
                                        "sequence_number": seq_num,
                                        "type": "response.mcp_list_tools.completed",
                                    },
                                    seq_num,
                                )

                        elif item_type == "custom_tool_call":
                            # Custom tool call events
                            input_data = item_dict.get("input", "")

                            # Stream custom tool input
                            for chunk in _iter_chunks(input_data, max_len=32):
                                seq_num += 1
                                yield _sse_event(
                                    "response.custom_tool_call_input.delta",
                                    {
                                        "output_index": output_index,
                                        "item_id": item_id,
                                        "delta": chunk,
                                        "sequence_number": seq_num,
                                        "type": "response.custom_tool_call_input.delta",
                                    },
                                    seq_num,
                                )

                            seq_num += 1
                            yield _sse_event(
                                "response.custom_tool_call_input.done",
                                {
                                    "output_index": output_index,
                                    "item_id": item_id,
                                    "input": input_data,
                                    "sequence_number": seq_num,
                                    "type": "response.custom_tool_call_input.done",
                                },
                                seq_num,
                            )

                        # 3d. response.output_item.done
                        seq_num += 1
                        # Update status to completed
                        item_dict_completed = dict(output_item)
                        if "status" in item_dict_completed:
                            item_dict_completed["status"] = "completed"

                        yield _sse_event(
                            "response.output_item.done",
                            {
                                "item": item_dict_completed,
                                "output_index": output_index,
                                "sequence_number": seq_num,
                                "type": "response.output_item.done",
                            },
                            seq_num,
                        )

                    # 4. response.completed event
                    seq_num += 1
                    completed_resp = dict(resp)
                    completed_resp["status"] = "completed"
                    yield _sse_event(
                        "response.completed",
                        {
                            "response": completed_resp,
                            "sequence_number": seq_num,
                            "type": "response.completed",
                        },
                        seq_num,
                    )

                return {
                    "status": 200,
                    "body_iter": stream_response(),
                    "headers": {
                        "Content-Type": "text/event-stream; charset=utf-8",
                        "Cache-Control": "no-cache",
                    },
                    "chunked": True,
                }
            else:
                return {"status": 200, "body": completion}

        except Exception as ex:
            _handle_model_proxy_error(ex)
            os._exit(1)

    @server.route("/v1/chat/completions", method="POST")
    async def chat_completions(request: dict[str, Any]) -> dict[str, Any]:
        try:
            json_body = request.get("json", {}) or {}
            stream = json_body.get("stream", False)

            # the openai codex cli seems to have a bug that causes
            # it to concatenate the 'arguments' of multiple tool_calls
            # when receiving them w/ stream=True (reproduced this as
            # well w/ the SDK going live against the ChatCompletion
            # API). Disable so we can side-step the bug.
            json_body["parallel_tool_calls"] = False

            completion = await call_bridge_model_service_async(
                "generate_completions", json_data=json_body
            )

            if stream:

                async def stream_response() -> AsyncIterator[bytes]:
                    # Parse the completion as a dict
                    chat_completion = (
                        completion
                        if isinstance(completion, dict)
                        else json.loads(completion)
                    )

                    comp_id = chat_completion.get("id")
                    created = chat_completion.get("created")
                    model = chat_completion.get("model")
                    sys_fp = chat_completion.get("system_fingerprint")

                    def base_chunk() -> dict[str, Any]:
                        obj: dict[str, Any] = {
                            "id": comp_id,
                            "object": "chat.completion.chunk",
                            "created": created,
                            "model": model,
                            "choices": [],
                        }
                        if sys_fp is not None:
                            obj["system_fingerprint"] = sys_fp
                        return obj

                    # Stream each choice independently (common clients support this).
                    for choice_idx, choice in enumerate(
                        chat_completion.get("choices", [])
                    ):
                        msg = choice.get("message")
                        role = msg.get("role") if msg else "assistant"

                        # 1) Initial role chunk
                        chunk = base_chunk()
                        chunk["choices"] = [
                            {
                                "index": choice_idx,
                                "delta": {
                                    "role": role
                                },  # spec: role appears once at start
                                "finish_reason": None,
                            }
                        ]
                        yield _sse_bytes(chunk)

                        # 2) Text content chunks
                        content = msg.get("content") if msg else None
                        if isinstance(content, str) and content:
                            for piece in _iter_chunks(content):
                                chunk = base_chunk()
                                chunk["choices"] = [
                                    {
                                        "index": choice_idx,
                                        "delta": {"content": piece},
                                        "finish_reason": None,
                                    }
                                ]
                                yield _sse_bytes(chunk)
                                # Optional tiny yield to event loop; uncomment if you want pacing
                                # await asyncio.sleep(0)

                        # 3) Legacy function_call streaming (older models/libs)
                        fn_call = msg.get("function_call") if msg else None
                        if fn_call:
                            fn_name = fn_call.get("name", "")
                            fn_args = fn_call.get("arguments", "")

                            # name first
                            chunk = base_chunk()
                            chunk["choices"] = [
                                {
                                    "index": choice_idx,
                                    "delta": {"function_call": {"name": fn_name}},
                                    "finish_reason": None,
                                }
                            ]
                            yield _sse_bytes(chunk)

                            # arguments as incremental deltas
                            for piece in _iter_chunks(fn_args):
                                chunk = base_chunk()
                                chunk["choices"] = [
                                    {
                                        "index": choice_idx,
                                        "delta": {
                                            "function_call": {"arguments": piece}
                                        },
                                        "finish_reason": None,
                                    }
                                ]
                                yield _sse_bytes(chunk)

                        # 4) Modern tool_calls streaming (fixed: repeat id/type on every delta)
                        tool_calls = msg.get("tool_calls") if msg else None
                        if tool_calls:
                            for tc_i, tc in enumerate(tool_calls):
                                tc_id = tc.get("id")
                                tc_type = tc.get("type")
                                # Handle both function and custom tool calls
                                fn = tc.get("function")
                                fn_name = fn.get("name", "") if fn else ""
                                fn_args = fn.get("arguments", "") if fn else ""

                                # Emit initial tool_call with id/type/name
                                chunk = base_chunk()
                                chunk["choices"] = [
                                    {
                                        "index": choice_idx,
                                        "delta": {
                                            "tool_calls": [
                                                {
                                                    "index": tc_i,
                                                    "id": tc_id,
                                                    "type": tc_type,
                                                    "function": {"name": fn_name},
                                                }
                                            ]
                                        },
                                        "finish_reason": None,
                                    }
                                ]
                                yield _sse_bytes(chunk)

                                # Emit arguments in pieces — NOTE: repeat id/type every time
                                for piece in _iter_chunks(
                                    fn_args, max_len=len(fn_args) or 1
                                ):
                                    chunk = base_chunk()
                                    chunk["choices"] = [
                                        {
                                            "index": choice_idx,
                                            "delta": {
                                                "tool_calls": [
                                                    {
                                                        "index": tc_i,
                                                        "id": tc_id,  # ← repeat
                                                        "type": tc_type,  # ← repeat
                                                        "function": {
                                                            "arguments": piece
                                                        },
                                                    }
                                                ]
                                            },
                                            "finish_reason": None,
                                        }
                                    ]
                                    yield _sse_bytes(chunk)

                        # 5) Final chunk for this choice with finish_reason
                        finish_reason = choice.get(
                            "finish_reason"
                        )  # e.g., "stop", "length", "tool_calls"
                        chunk = base_chunk()
                        chunk["choices"] = [
                            {
                                "index": choice_idx,
                                "delta": {},  # end-of-stream sentinel for this choice
                                "finish_reason": finish_reason,
                            }
                        ]
                        yield _sse_bytes(chunk)

                    # 6) Optional usage chunk (if client requested include_usage and we have it)
                    stream_opts = json_body.get("stream_options") or {}
                    usage = chat_completion.get("usage")
                    if stream_opts.get("include_usage") and usage:
                        chunk = base_chunk()
                        chunk[
                            "choices"
                        ] = []  # per OpenAI: last chunk contains only usage
                        chunk["usage"] = usage
                        yield _sse_bytes(chunk)

                    # 7) Overall terminal sentinel
                    yield b"data: [DONE]\n\n"

                return {
                    "status": 200,
                    "body_iter": stream_response(),
                    "headers": {
                        "Content-Type": "text/event-stream; charset=utf-8",
                        "Cache-Control": "no-cache",
                    },
                    "chunked": True,
                }
            else:
                return {"status": 200, "body": completion}
        except Exception as ex:
            _handle_model_proxy_error(ex)
            os._exit(1)

    @server.route("/v1/messages", method="POST")
    async def anthropic(request: dict[str, Any]) -> dict[str, Any]:
        try:
            json_body = request.get("json", {}) or {}
            stream = json_body.get("stream", False)

            if stream:

                async def stream_response() -> AsyncIterator[bytes]:
                    def _sse_anthropic(event_type: str, data: dict[str, Any]) -> bytes:
                        # Anthropic uses both event: and data: lines
                        return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n".encode(
                            "utf-8"
                        )

                    # 1. Send message_start immediately (before awaiting completion)
                    #    so clients see data on the connection right away.
                    message_start = {
                        "type": "message_start",
                        "message": {
                            "id": f"msg_{os.urandom(12).hex()}",
                            "type": "message",
                            "role": "assistant",
                            "content": [],
                            "model": json_body.get("model", "unknown"),
                            "stop_reason": None,
                            "stop_sequence": None,
                            "usage": {
                                "input_tokens": 0,
                                "output_tokens": 0,
                            },
                        },
                    }
                    yield _sse_anthropic("message_start", message_start)

                    # 2. Await the actual completion, sending pings to keep alive.
                    #    try/finally ensures the task is cancelled if the
                    #    generator is abandoned (e.g. client disconnect).
                    PING_INTERVAL_S = 5.0
                    task = asyncio.create_task(
                        call_bridge_model_service_async(
                            "generate_anthropic", json_data=json_body
                        )
                    )
                    try:
                        while not task.done():
                            try:
                                await asyncio.wait_for(
                                    asyncio.shield(task), timeout=PING_INTERVAL_S
                                )
                            except asyncio.TimeoutError:
                                yield _sse_anthropic("ping", {"type": "ping"})
                        completion = task.result()
                    except BaseException:
                        if not task.done():
                            task.cancel()
                            try:
                                await task
                            except asyncio.CancelledError:
                                pass
                        raise

                    try:
                        # Parse the completion as a dict
                        message = (
                            completion
                            if isinstance(completion, dict)
                            else json.loads(completion)
                        )
                    except (json.JSONDecodeError, TypeError) as e:
                        # Send error event if we can't parse the response
                        error_event = {
                            "type": "error",
                            "error": {
                                "type": "invalid_response_error",
                                "message": f"Failed to parse response: {str(e)}",
                            },
                        }
                        yield f"event: error\ndata: {json.dumps(error_event)}\n\n".encode(
                            "utf-8"
                        )
                        return

                    # 2. Process content blocks
                    content = message.get("content", [])
                    for index, block in enumerate(content):
                        # Optionally send ping events between blocks
                        if index > 0 and index % 3 == 0:
                            yield _sse_anthropic("ping", {"type": "ping"})
                        block_type = block.get("type")

                        if block_type == "text":
                            # content_block_start
                            yield _sse_anthropic(
                                "content_block_start",
                                {
                                    "type": "content_block_start",
                                    "index": index,
                                    "content_block": {"type": "text", "text": ""},
                                },
                            )

                            # Stream text in chunks
                            text = block.get("text", "")
                            for chunk in _iter_chunks(text):
                                yield _sse_anthropic(
                                    "content_block_delta",
                                    {
                                        "type": "content_block_delta",
                                        "index": index,
                                        "delta": {"type": "text_delta", "text": chunk},
                                    },
                                )
                                await asyncio.sleep(0)  # Yield to event loop

                            # content_block_stop
                            yield _sse_anthropic(
                                "content_block_stop",
                                {"type": "content_block_stop", "index": index},
                            )

                        elif block_type in ["tool_use", "server_tool_use"]:
                            # content_block_start for tool_use or server_tool_use
                            content_block = {
                                "type": block_type,
                                "id": block.get("id"),
                                "name": block.get("name"),
                                "input": {},
                            }

                            yield _sse_anthropic(
                                "content_block_start",
                                {
                                    "type": "content_block_start",
                                    "index": index,
                                    "content_block": content_block,
                                },
                            )

                            # Stream input as partial JSON
                            input_data = block.get("input", {})
                            input_json = json.dumps(input_data, ensure_ascii=False)

                            # Stream the JSON in chunks
                            for i in range(0, len(input_json), 20):
                                chunk = input_json[i : i + 20]
                                yield _sse_anthropic(
                                    "content_block_delta",
                                    {
                                        "type": "content_block_delta",
                                        "index": index,
                                        "delta": {
                                            "type": "input_json_delta",
                                            "partial_json": chunk,
                                        },
                                    },
                                )
                                await asyncio.sleep(0)

                            # content_block_stop
                            yield _sse_anthropic(
                                "content_block_stop",
                                {"type": "content_block_stop", "index": index},
                            )

                        elif block_type == "web_search_tool_result":
                            # Handle web search tool result blocks
                            yield _sse_anthropic(
                                "content_block_start",
                                {
                                    "type": "content_block_start",
                                    "index": index,
                                    "content_block": {
                                        "type": "web_search_tool_result",
                                        "tool_use_id": block.get("tool_use_id"),
                                        "content": block.get("content", []),
                                    },
                                },
                            )

                            # Web search results are not streamed as deltas
                            yield _sse_anthropic(
                                "content_block_stop",
                                {"type": "content_block_stop", "index": index},
                            )

                        elif block_type == "thinking":
                            # content_block_start for thinking
                            yield _sse_anthropic(
                                "content_block_start",
                                {
                                    "type": "content_block_start",
                                    "index": index,
                                    "content_block": {
                                        "type": "thinking",
                                        "thinking": "",
                                    },
                                },
                            )

                            # Stream thinking text
                            thinking_text = block.get("thinking", "")
                            for chunk in _iter_chunks(thinking_text):
                                yield _sse_anthropic(
                                    "content_block_delta",
                                    {
                                        "type": "content_block_delta",
                                        "index": index,
                                        "delta": {
                                            "type": "thinking_delta",
                                            "thinking": chunk,
                                        },
                                    },
                                )
                                await asyncio.sleep(0)

                            # Add signature if present
                            if block.get("signature"):
                                yield _sse_anthropic(
                                    "content_block_delta",
                                    {
                                        "type": "content_block_delta",
                                        "index": index,
                                        "delta": {
                                            "type": "signature_delta",
                                            "signature": block.get("signature"),
                                        },
                                    },
                                )

                            # content_block_stop
                            yield _sse_anthropic(
                                "content_block_stop",
                                {"type": "content_block_stop", "index": index},
                            )

                        elif block_type == "compaction":
                            # Compaction blocks stream differently - a single delta
                            # with the complete content (no intermediate streaming)
                            yield _sse_anthropic(
                                "content_block_start",
                                {
                                    "type": "content_block_start",
                                    "index": index,
                                    "content_block": {
                                        "type": "compaction",
                                        "content": "",
                                    },
                                },
                            )

                            # Single delta with complete content
                            content_value = block.get("content", "")
                            yield _sse_anthropic(
                                "content_block_delta",
                                {
                                    "type": "content_block_delta",
                                    "index": index,
                                    "delta": {
                                        "type": "compaction_delta",
                                        "content": content_value,
                                    },
                                },
                            )

                            # content_block_stop
                            yield _sse_anthropic(
                                "content_block_stop",
                                {"type": "content_block_stop", "index": index},
                            )

                    # 3. message_delta event with cumulative usage
                    usage = message.get("usage", {})
                    message_delta_data: dict[str, Any] = {
                        "type": "message_delta",
                        "delta": {
                            "stop_reason": message.get("stop_reason"),
                            "stop_sequence": message.get("stop_sequence"),
                        },
                        "usage": {
                            "output_tokens": usage.get("output_tokens", 0),
                        },
                    }

                    # Add optional usage fields if present
                    if "input_tokens" in usage:
                        message_delta_data["usage"]["input_tokens"] = usage[
                            "input_tokens"
                        ]
                    if "cache_creation_input_tokens" in usage:
                        message_delta_data["usage"]["cache_creation_input_tokens"] = (
                            usage["cache_creation_input_tokens"]
                        )
                    if "cache_read_input_tokens" in usage:
                        message_delta_data["usage"]["cache_read_input_tokens"] = usage[
                            "cache_read_input_tokens"
                        ]

                    # Add server_tool_use if applicable (e.g., for web search)
                    if "server_tool_use" in usage:
                        message_delta_data["usage"]["server_tool_use"] = usage[
                            "server_tool_use"
                        ]

                    yield _sse_anthropic("message_delta", message_delta_data)

                    # 4. message_stop event
                    yield _sse_anthropic("message_stop", {"type": "message_stop"})

                return {
                    "status": 200,
                    "body_iter": stream_response(),
                    "headers": {
                        "Content-Type": "text/event-stream; charset=utf-8",
                        "Cache-Control": "no-cache",
                    },
                    "chunked": True,
                }
            else:
                completion = await call_bridge_model_service_async(
                    "generate_anthropic", json_data=json_body
                )
                return {"status": 200, "body": completion}
        except Exception as ex:
            _handle_model_proxy_error(ex)
            os._exit(1)

    # ---------- Google Gemini API routes ----------
    # Route patterns for Google's Gemini API using wildcard matching
    # Supports: /v1beta/models/{model}:generateContent and /models/{model}:generateContent

    def _extract_model_from_google_path(path: str) -> str:
        """Extract model name from Google API path.

        Examples:
            /v1beta/models/gemini-2.5-pro:generateContent -> gemini-2.5-pro
            /models/gemini-2.5-flash:streamGenerateContent -> gemini-2.5-flash
        """
        match = re.search(r"models/([^/:]+)", path)
        return match.group(1) if match else "inspect"

    @server.route("/v1beta/models/*", method="POST")
    @server.route("/models/*", method="POST")
    async def google_generate_content(request: dict[str, Any]) -> dict[str, Any]:
        try:
            path = request.get("path", "")
            json_body = request.get("json", {}) or {}

            is_streaming = ":streamGenerateContent" in path

            model_name = _extract_model_from_google_path(path)
            json_body["model"] = model_name

            completion = await call_bridge_model_service_async(
                "generate_google", json_data=json_body
            )

            resp = (
                completion if isinstance(completion, dict) else json.loads(completion)
            )

            if not is_streaming:
                return {"status": 200, "body": resp}

            async def single_chunk_stream() -> AsyncIterator[bytes]:
                yield f"data: {json.dumps(resp)}\n\n".encode("utf-8")

            return {
                "status": 200,
                "body_iter": single_chunk_stream(),
                "headers": {
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache",
                },
                "chunked": True,
            }

        except Exception as ex:
            _handle_model_proxy_error(ex)
            os._exit(1)

    # return configured server
    return server


async def run_model_proxy_server(port: int) -> None:
    """Run the model proxy server.

    Args:
        port: Port to run the server on
    """
    # Create server
    server = await model_proxy_server(port)

    # Run server
    try:
        await server.start()
    except Exception as ex:
        sys.stderr.write(f"Unexpected error running model proxy: {ex}\n")
        sys.stderr.write(traceback.format_exc())
        sys.stderr.flush()
        os._exit(1)


def _handle_model_proxy_error(ex: Exception) -> None:
    # Any error that occurs in here is essentially fatal to the entire
    # agent. The exception results either from:
    #
    #  - The call to generate (which already benefits from Inspect's std
    #    model retry behavior). In normal Inspect agents if generate fails
    #    after requisite retries the sample fails, same here
    #  - A logic error or unexpected data condition in our simulated
    #    streaming -- if we are unable to stream a request back then
    #    the agent can't proceed, so we fail the script hard
    #
    # Writing to stderr and exiting the script is seen as preferable to
    # returning 500 to the proxied agent. This is because we are in a
    # hard failure anyway so we need the user to see the error message
    # and have the task fail (the 500 error would just result in retries)
    sys.stderr.write(f"Unexpected error during model proxy call: {ex}\n")
    sys.stderr.write(traceback.format_exc())
    sys.stderr.flush()


async def _call_bridge_model_service_async(method: str, **params: Any) -> Any:
    from asyncio import sleep

    request_id = _write_bridge_model_service_request(method, **params)
    while True:
        await sleep(0.1)
        success, result = _read_bridge_model_service_response(request_id, method)
        if success:
            return result


def _write_bridge_model_service_request(method: str, **params: Any) -> str:
    from json import dump
    from uuid import uuid4

    requests_dir = _bridge_model_service_service_dir("requests")
    request_id = str(uuid4())
    request_data = dict(id=request_id, method=method, params=params)
    request_path = requests_dir / (request_id + ".json")
    with open(request_path, "w") as f:
        dump(request_data, f)
    return request_id


def _read_bridge_model_service_response(
    request_id: str, method: str
) -> tuple[bool, Any]:
    from json import JSONDecodeError, load

    responses_dir = _bridge_model_service_service_dir("responses")
    response_path = responses_dir / (request_id + ".json")
    if response_path.exists():
        # read and remove the file
        with open(response_path, "r") as f:
            # it's possible the file is still being written so
            # just catch and wait for another retry if this occurs
            try:
                response = load(f)
            except JSONDecodeError:
                return False, None
        response_path.unlink()

        # raise error if we have one
        if response.get("error", None) is not None:
            raise Exception(response["error"])

        # return response if we have one
        elif "result" in response:
            return True, response["result"]

        # invalid response
        else:
            raise RuntimeError(
                "No error or result field in response for method " + method
            )
    else:
        return False, None


def _bridge_model_service_service_dir(subdir: str) -> Any:
    import os
    from pathlib import Path

    service_dir = Path("/var/tmp/sandbox-services/bridge_model_service")
    instance = os.environ.get("BRIDGE_MODEL_SERVICE_INSTANCE", None)
    if instance is not None:
        service_dir = service_dir / instance
    return service_dir / subdir


if __name__ == "__main__":
    DEFAULT_PROXY_PORT = 13131
    port_arg = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PROXY_PORT
    asyncio.run(run_model_proxy_server(port=port_arg))
```

## `agent/_bridge/sandbox/service.py`

```python
import json
from logging import getLogger  # noqa: E402
from typing import Any, Awaitable, Callable

import anyio
from pydantic import JsonValue

from inspect_ai.model._call_tools import get_tools_info
from inspect_ai.tool._tools._code_execution import CodeExecutionProviders
from inspect_ai.tool._tools._web_search._web_search import WebSearchProviders
from inspect_ai.util._sandbox import SandboxEnvironment, sandbox_service

from ..anthropic_api import inspect_anthropic_api_request
from ..completions import inspect_completions_api_request
from ..google_api import inspect_google_api_request
from ..responses import inspect_responses_api_request
from .types import SandboxAgentBridge

logger = getLogger(__name__)

MODEL_SERVICE = "bridge_model_service"


async def run_model_service(
    sandbox: SandboxEnvironment,
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: SandboxAgentBridge,
    instance: str,
    started: anyio.Event,
) -> None:
    await sandbox_service(
        name=MODEL_SERVICE,
        methods={
            "generate_completions": generate_completions(bridge),
            "generate_responses": generate_responses(
                web_search, code_execution, bridge
            ),
            "generate_anthropic": generate_anthropic(
                web_search, code_execution, bridge
            ),
            "generate_google": generate_google(web_search, code_execution, bridge),
            "list_tools": list_tools(bridge),
            "call_tool": call_tool(bridge),
        },
        until=lambda: False,
        sandbox=sandbox,
        instance=instance,
        polling_interval=2,
        started=started,
        requires_python=False,
    )


def generate_completions(
    bridge: SandboxAgentBridge,
) -> Callable[[dict[str, JsonValue]], Awaitable[dict[str, JsonValue]]]:
    async def generate(json_data: dict[str, JsonValue]) -> dict[str, JsonValue]:
        completion = await inspect_completions_api_request(json_data, None, bridge)
        return completion.model_dump(mode="json", warnings=False)

    return generate


def generate_responses(
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: SandboxAgentBridge,
) -> Callable[[dict[str, JsonValue]], Awaitable[dict[str, JsonValue]]]:
    async def generate(json_data: dict[str, JsonValue]) -> dict[str, JsonValue]:
        completion = await inspect_responses_api_request(
            json_data, None, web_search, code_execution, bridge
        )
        return completion.model_dump(mode="json", warnings=False)

    return generate


def generate_anthropic(
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: SandboxAgentBridge,
) -> Callable[[dict[str, JsonValue]], Awaitable[dict[str, JsonValue]]]:
    async def generate(json_data: dict[str, JsonValue]) -> dict[str, JsonValue]:
        completion = await inspect_anthropic_api_request(
            json_data, None, web_search, code_execution, bridge
        )
        return completion.model_dump(mode="json", warnings=False)

    return generate


def generate_google(
    web_search: WebSearchProviders,
    code_execution: CodeExecutionProviders,
    bridge: SandboxAgentBridge,
) -> Callable[[dict[str, JsonValue]], Awaitable[dict[str, JsonValue]]]:
    async def generate(json_data: dict[str, JsonValue]) -> dict[str, JsonValue]:
        completion = await inspect_google_api_request(
            json_data, web_search, code_execution, bridge
        )
        return completion

    return generate


def list_tools(
    bridge: SandboxAgentBridge,
) -> Callable[[str], Awaitable[JsonValue]]:
    """Return tool schemas for a bridged tools server."""

    async def execute(server: str) -> JsonValue:
        if server not in bridge.bridged_tools:
            raise ValueError(f"Unknown bridged tools server: {server}")

        tools = list(bridge.bridged_tools[server].values())
        tools_info = get_tools_info(tools)

        return [
            {
                "name": info.name,
                "description": info.description,
                "inputSchema": info.parameters.model_dump(exclude_none=True),
            }
            for info in tools_info
        ]

    return execute


def call_tool(
    bridge: SandboxAgentBridge,
) -> Callable[[str, str, dict[str, Any]], Awaitable[str]]:
    """Execute a bridged tool and return result."""

    async def execute(server: str, tool: str, arguments: dict[str, Any]) -> str:
        if server not in bridge.bridged_tools:
            raise ValueError(f"Unknown bridged tools server: {server}")

        server_tools = bridge.bridged_tools[server]
        if tool not in server_tools:
            raise ValueError(f"Unknown tool '{tool}' in server '{server}'")

        tool_fn = server_tools[tool]
        result = await tool_fn(**arguments)

        # MCP returns strings, so serialize if needed
        if isinstance(result, str):
            return result
        return json.dumps(result)

    return execute
```

## `agent/_bridge/sandbox/types.py`

```python
from inspect_ai.agent._agent import AgentState
from inspect_ai.agent._bridge.types import AgentBridge
from inspect_ai.model._compaction.types import CompactionStrategy
from inspect_ai.model._model import GenerateFilter, Model
from inspect_ai.tool import Tool
from inspect_ai.tool._mcp._config import MCPServerConfigHTTP


class SandboxAgentBridge(AgentBridge):
    """Sandbox agent bridge."""

    def __init__(
        self,
        state: AgentState,
        filter: GenerateFilter | None,
        retry_refusals: int | None,
        compaction: CompactionStrategy | None,
        port: int,
        model: str | None,
        model_aliases: dict[str, str | Model] | None = None,
        mcp_server_configs: list[MCPServerConfigHTTP] | None = None,
        bridged_tools: dict[str, dict[str, Tool]] | None = None,
    ) -> None:
        super().__init__(
            state,
            filter,
            retry_refusals,
            compaction,
            model=model,
            model_aliases=model_aliases,
        )
        self.port = port
        self.mcp_server_configs = mcp_server_configs or []
        self.bridged_tools = bridged_tools or {}

    port: int
    """Model proxy server port."""

    mcp_server_configs: list[MCPServerConfigHTTP]
    """MCP server configs for bridged tools (resolved from bridged_tools parameter)."""

    bridged_tools: dict[str, dict[str, Tool]]
    """Registry of bridged tools by server name, then tool name."""
```

## `agent/_bridge/types.py`

```python
from functools import lru_cache
from typing import Sequence, Set

from shortuuid import uuid

from inspect_ai._util.hash import mm3_hash
from inspect_ai._util.json import to_json_str_safe
from inspect_ai.agent._agent import AgentState
from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.model._compaction import (
    Compact,
    CompactionStrategy,
)
from inspect_ai.model._compaction import (
    compaction as create_compaction,
)
from inspect_ai.model._model import GenerateFilter, Model
from inspect_ai.model._model_output import ModelOutput
from inspect_ai.tool._tool import Tool
from inspect_ai.tool._tool_info import ToolInfo


class AgentBridge:
    """Agent bridge."""

    def __init__(
        self,
        state: AgentState,
        filter: GenerateFilter | None = None,
        retry_refusals: int | None = None,
        compaction: CompactionStrategy | None = None,
        model: str | None = None,
        model_aliases: dict[str, str | Model] | None = None,
    ) -> None:
        self.state = state
        self.filter = filter
        self.retry_refusals = retry_refusals
        self.model = model
        self.model_aliases: dict[str, str | Model] = model_aliases or {}
        self._compaction = compaction
        self._compaction_prefix = state.messages.copy()
        self._compact: Compact | None = None
        self._message_ids = {}
        self._last_message_count = 0

    state: AgentState
    """State updated from messages traveling over the bridge."""

    filter: GenerateFilter | None
    """Filter for bridge model generation.

    A filter may substitute for the default model generation by returning a ModelOutput or return None to allow default processing to continue.
    """

    model: str | None
    """Fallback model for requests that don't use ``inspect`` or ``inspect/``
    prefixed names.  ``None`` means no fallback (the request model name is
    used as-is).
    """

    model_aliases: dict[str, str | Model]
    """Map of model name aliases.  When a request uses a name that appears
    here, the corresponding value (a ``Model`` instance or model spec string)
    is used instead.  Checked before the fallback ``model``.
    """

    def compaction(
        self, tools: Sequence[ToolInfo | Tool], model: Model
    ) -> Compact | None:
        """Compaction function for bridge.

        Note: This will always return the same compaction function for a
        given instance of the bridge.

        Args:
            tools: Tool definitions (included in token count as they consume context).
            model: Target model for compacted input.
        """
        if self._compact is None and self._compaction is not None:
            self._compact = create_compaction(
                self._compaction,
                prefix=self._compaction_prefix,
                tools=tools,
                model=model,
            )
        return self._compact

    def _id_for_message(
        self, message: ChatMessage, conversation: list[ChatMessage]
    ) -> str:
        # message_id we will return
        message_id: str | None = None

        # turn message into a hash so it can be a dictionary key
        message_key = message_json_hash(to_json_str_safe(message))

        # do we already have an id for this message that isn't in the conversation?
        conversation_ids: Set[str] = {m.id for m in conversation if m.id is not None}
        message_ids = self._message_ids.get(message_key, [])
        for id in message_ids:
            if id not in conversation_ids:
                message_id = id
                break

        # if we didn't find an id then generate a new one and update our record
        if message_id is None:
            message_id = uuid()
            message_ids.append(message_id)
            self._message_ids[message_key] = message_ids

        # return the id
        return message_id

    _message_ids: dict[str, list[str]]

    def _track_state(self, input: list[ChatMessage], output: ModelOutput) -> None:
        # automatically track agent state based on observing generations made through
        # the bridge. we need to distinguish between the "main" thread of generation
        # and various types of side / sub-agent calls to the model (e.g. claude code
        # does bash path detection using a side call). our heuristic is to keep the
        # number of messages that were in the _last_ generation, and to update the
        # state whenever the total messages exceeds it. this should pick up normal
        # agent loops that keep appending, while at the same time discarding side model
        # calls that tend to be shorter. finally, this should handle recovering from
        # history compaction, which will shorten the message history considerably
        messages = input + [output.message]
        if len(messages) > self._last_message_count:
            self.state.messages = messages
            self.state.output = output
        self._last_message_count = len(messages)


@lru_cache(maxsize=100)
def message_json_hash(message_json: str) -> str:
    return mm3_hash(message_json)
```

## `agent/_bridge/util.py`

```python
import inspect
import warnings
from typing import Sequence, cast

from typing_extensions import TypeIs

from inspect_ai.agent._bridge.types import AgentBridge
from inspect_ai.model._chat_message import ChatMessage, ChatMessageUser
from inspect_ai.model._generate_config import GenerateConfig, active_generate_config
from inspect_ai.model._model import (
    GenerateFilter,
    GenerateInput,
    Model,
    ModelGenerateFilter,
    active_model,
    get_model,
    model_roles,
)
from inspect_ai.model._model_output import ModelOutput
from inspect_ai.tool._tool import Tool
from inspect_ai.tool._tool_choice import ToolChoice
from inspect_ai.tool._tool_info import ToolInfo, parse_tool_info
from inspect_ai.tool._tools._code_execution import CodeExecutionProviders
from inspect_ai.tool._tools._web_search._web_search import (
    WebSearchProviders,
    _normalize_config,
)

_filter_type_cache: dict[int, bool] = {}


def _is_model_filter(fn: GenerateFilter) -> TypeIs[ModelGenerateFilter]:
    """True when *fn* accepts a ``Model`` as its first parameter (new-style).

    Returns ``False`` for legacy filters whose first parameter is ``str``.
    Caches per object id so ``inspect.signature`` is called at most once.
    Emits a deprecation warning the first time a legacy filter is detected.
    """
    key = id(fn)
    result = _filter_type_cache.get(key)
    if result is None:
        sig = inspect.signature(fn)  # type: ignore[arg-type]
        first = next(iter(sig.parameters.values()), None)
        if first is not None and first.annotation is str:
            result = False
            warnings.warn(
                "GenerateFilter with 'str' as the first parameter is "
                "deprecated. Update your filter to accept a 'Model' "
                "instance instead.",
                DeprecationWarning,
                stacklevel=2,
            )
        else:
            result = True
        _filter_type_cache[key] = result
    return result


async def bridge_generate(
    bridge: AgentBridge,
    model: Model,
    input: list[ChatMessage],
    tools: Sequence[ToolInfo | Tool],
    tool_choice: ToolChoice | None,
    config: GenerateConfig,
) -> tuple[ModelOutput, ChatMessageUser | None]:
    """Generate model output through the agent bridge.

    If a filter is configured, it will be called on each attempt (including retries).
    The filter can either return a ModelOutput directly or modify the generation inputs.
    Refusals (stop_reason="content_filter") from either the filter or model will trigger
    retries up to bridge.retry_refusals times, with inputs reset to original values for
    each retry to ensure clean state.
    """
    # get compaction function and run compaction once before retry loop
    compact = bridge.compaction(tools, model)
    if compact is not None:
        input_messages, c_message = await compact.compact_input(input)
    else:
        input_messages = input
        c_message = None

    # Store original inputs for potential retries (using compacted input)
    original_input = input_messages
    original_tools = tools
    original_tool_choice = tool_choice
    original_config = config

    refusals = 0
    while True:
        # Reset to original inputs for each retry
        input_messages = original_input
        tools = original_tools
        tool_choice = original_tool_choice
        config = original_config

        # Apply filter if we have it (can either return output or alternate inputs)
        output: ModelOutput | None = None
        if bridge.filter:
            tool_info = [
                parse_tool_info(tool) if not isinstance(tool, ToolInfo) else tool
                for tool in tools
            ]
            if _is_model_filter(bridge.filter):
                result = await bridge.filter(
                    model, input_messages, tool_info, tool_choice, config
                )
            else:
                result = await bridge.filter(
                    model.name, input_messages, tool_info, tool_choice, config
                )
            if isinstance(result, ModelOutput):
                output = result
            elif isinstance(result, GenerateInput):
                # Update the inputs that will be used for generation
                input_messages, tools, tool_choice, config = result

        # Run the generation if the filter didn't
        if output is None:
            output = await model.generate(
                input=input_messages,
                tool_choice=tool_choice,
                tools=tools,
                config=config,
            )

        # Update the compaction baseline with the actual input token
        # count from the generate call (most accurate source of truth)
        if compact is not None:
            compact.record_output(output)

        # Check for refusal and retry if needed
        if (
            output.stop_reason == "content_filter"
            and bridge.retry_refusals is not None
            and refusals < bridge.retry_refusals
        ):
            refusals += 1
        else:
            return output, c_message


def resolve_generate_config(
    model: Model, bridge_config: GenerateConfig
) -> GenerateConfig:
    # give config built into the model instance priority over
    # bridged agent default
    config = bridge_config.merge(model.config)

    # apply active model config if appropriate
    is_active_model = model == active_model()
    if is_active_model:
        config = config.merge(active_generate_config())

    return config


def resolve_inspect_model(
    model_name: str,
    model_aliases: dict[str, str | Model] | None = None,
    fallback_model: str | None = None,
) -> Model:
    if model_aliases and model_name in model_aliases:
        return get_model(model_aliases[model_name])

    if fallback_model is not None:
        if model_name != "inspect" or not fallback_model.startswith("inspect/"):
            model_name = fallback_model

    if model_name == "inspect":
        return get_model()

    model_name = model_name.removeprefix("inspect/")
    if model_name in model_roles():
        return get_model(role=model_name)
    return get_model(model_name)


def resolve_web_search_providers(
    providers: WebSearchProviders | None,
) -> WebSearchProviders:
    if providers is None:
        providers = internal_web_search_providers()
    return cast(WebSearchProviders, _normalize_config(providers))


def internal_web_search_providers() -> WebSearchProviders:
    return WebSearchProviders(
        openai=True, anthropic=True, grok=True, gemini=True, perplexity=True
    )


def default_code_execution_providers() -> CodeExecutionProviders:
    return CodeExecutionProviders(
        openai={}, anthropic=True, google=True, grok=True, python={}
    )


def apply_message_ids(bridge: AgentBridge, messages: list[ChatMessage]) -> None:
    # clear the ids so we can apply new ones
    for message in messages:
        message.id = None

    # allocate ids based on message content (re-applying the same id for the same
    # content, but also ensuring that if an id is already used we generate a new one)
    for message in messages:
        message.id = bridge._id_for_message(message, messages)
```

## `agent/_filter.py`

```python
from typing import Awaitable, Callable

from inspect_ai._util.content import (
    Content,
    ContentReasoning,
    ContentText,
    ContentToolUse,
)
from inspect_ai._util.format import format_function_call
from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageAssistant,
    ChatMessageSystem,
    ChatMessageTool,
    ChatMessageUser,
)

MessageFilter = Callable[[list[ChatMessage]], Awaitable[list[ChatMessage]]]
"""Filter messages sent to or received from agent handoffs."""


async def content_only(messages: list[ChatMessage]) -> list[ChatMessage]:
    """Remove (or convert) message history to pure content.

    This is the default filter for agent handoffs and is intended to
    present a history that doesn't confound the parent model with
    tools it doesn't have, reasoning traces it didn't create, etc.

    - Removes system messages
    - Removes reasoning traces
    - Removes `internal` attribute on content
    - Converts tool calls to user messages
    - Converts server tool calls to text

    Args:
        messages: Messages to filter.

    Returns:
        Messages with content only.
    """
    filtered: list[ChatMessage] = []
    for message in messages:
        # ignore system messages
        if isinstance(message, ChatMessageSystem):
            continue

        # pass through user messages
        elif isinstance(message, ChatMessageUser):
            filtered.append(message)

        # convert tool messages to user messages
        elif isinstance(message, ChatMessageTool):
            filtered.append(ChatMessageUser(id=message.id, content=message.content))

        # filter assistant content
        else:
            # ensure content block
            if isinstance(message.content, str):
                content: list[Content] = [ContentText(text=message.content)]
            else:
                content = message.content

            # append tool calls as plain content
            tool_calls = "\n".join(
                [
                    format_function_call(call.function, call.arguments)
                    for call in (message.tool_calls or [])
                ]
            )
            if tool_calls:
                content.append(ContentText(text=tool_calls))

            # remove reasoning and internal
            content = [
                c.model_copy(update={"internal": None})
                for c in content
                if not isinstance(c, ContentReasoning)
            ]

            # replace server side tool use with context text
            content = [
                ContentText(text=f"{c.name} {c.arguments}\n\n{c.result}")
                if isinstance(c, ContentToolUse)
                else c
                for c in content
            ]

            # append message with updated content and tool call
            filtered.append(
                message.model_copy(update={"content": content, "tool_calls": None})
            )

    return filtered


async def remove_tools(messages: list[ChatMessage]) -> list[ChatMessage]:
    """Remove tool calls from messages.

    Removes all instances of `ChatMessageTool` as well as the `tool_calls`
    field from `ChatMessageAssistant`.

    Args:
       messages: Messages to remove tool calls from.

    Returns:
       Messages without tool calls.
    """
    filtered: list[ChatMessage] = []
    for message in messages:
        if isinstance(message, ChatMessageTool):
            continue
        if isinstance(message, ChatMessageAssistant):
            message = message.model_copy(update=dict(tool_calls=None))
        filtered.append(message)

    return filtered


async def last_message(messages: list[ChatMessage]) -> list[ChatMessage]:
    """Remove all but the last message.

    Args:
       messages: Target messages.

    Returns:
       List containing only the last message from the input list.

    """
    return messages[-1:]
```

## `agent/_handoff.py`

```python
from typing import Any, Sequence

from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_unqualified_name,
    set_registry_info,
)
from inspect_ai.tool._tool import TOOL_PARALLEL, Tool, ToolResult, ToolSource
from inspect_ai.tool._tool_def import ToolDef
from inspect_ai.tool._tool_description import ToolDescription, set_tool_description
from inspect_ai.util._limit import Limit

from ._agent import Agent
from ._as_tool import agent_tool_info
from ._filter import MessageFilter, content_only


def handoff(
    agent: Agent,
    description: str | None = None,
    input_filter: MessageFilter | None = None,
    output_filter: MessageFilter | None = content_only,
    tool_name: str | None = None,
    limits: list[Limit] = [],
    **agent_kwargs: Any,
) -> Tool:
    """Create a tool that enables models to handoff to agents.

    Args:
        agent: Agent to hand off to.
        description: Handoff tool description (defaults to agent description)
        input_filter: Filter to modify the message history before calling the tool.
            Use the built-in `remove_tools` filter to remove all tool calls.
            Alternatively specify another `MessageFilter` function or list
            of `MessageFilter` functions.
        output_filter: Filter to modify the message history after calling the tool.
            Defaults to `content_only()`, which produces a history that should
            be safe to read by other models (tool calls are converted to text,
            and both system messages and reasoning blocks are removed).
            Alternatively specify another `MessageFilter` function or list
            of `MessageFilter` functions.
        tool_name: Alternate tool name (defaults to `transfer_to_{agent_name}`)
        limits: List of limits to apply to the agent. Limits are scoped to each
            handoff to the agent. Should a limit be exceeded, the agent stops and a user
            message is appended explaining that a limit was exceeded.
        **agent_kwargs: Arguments to curry to `Agent` function (arguments provided here
            will not be presented to the model as part of the tool interface).

    Returns:
        Tool for handing off to the agent (must be called using `execute_tools()` to be
        properly handled)
    """
    # agent must be registered (so we can get its name)
    if not is_registry_object(agent):
        raise RuntimeError(
            "Agent passed to as_tool was not created by an @agent decorated function"
        )

    # get tool_info
    tool_info = agent_tool_info(agent, description, **agent_kwargs)

    # AgentTool calls will be intercepted by execute_tools
    agent_tool = AgentTool(
        agent, tool_info.name, input_filter, output_filter, limits, **agent_kwargs
    )
    tool_name = tool_name or f"transfer_to_{tool_info.name}"
    set_registry_info(
        agent_tool,
        RegistryInfo(type="tool", name=tool_name, metadata={TOOL_PARALLEL: False}),
    )
    set_tool_description(
        agent_tool,
        ToolDescription(
            name=tool_name,
            description=tool_info.description,
            parameters=tool_info.parameters,
        ),
    )
    return agent_tool


class AgentTool(Tool):
    def __init__(
        self,
        agent: Agent,
        name: str,
        input_filter: MessageFilter | None = None,
        output_filter: MessageFilter | None = None,
        limits: list[Limit] | None = None,
        **kwargs: Any,
    ):
        self.agent = agent
        self.name = name
        self.input_filter = input_filter
        self.output_filter = output_filter
        self.limits = limits if limits is not None else []
        self.kwargs = kwargs

    @property
    def __name__(self) -> str:
        return registry_unqualified_name(self.agent)

    async def __call__(self) -> ToolResult:
        raise RuntimeError("AgentTool should not be called directly")


def has_handoff(
    tools: Sequence[Tool | ToolDef | ToolSource] | None,
) -> bool:
    if tools:
        return any([isinstance(tool, AgentTool) for tool in tools])
    else:
        return False
```

## `agent/_human/__init__.py`

```python

```

## `agent/_human/agent.py`

```python
from typing import cast

import anyio

from inspect_ai.util import display_type, input_panel, sandbox
from inspect_ai.util._sandbox.events import SandboxEnvironmentProxy

from .._agent import Agent, AgentState, agent
from .commands import human_agent_commands
from .install import install_human_agent
from .panel import HumanAgentPanel
from .service import run_human_agent_service
from .view import ConsoleView, HumanAgentView


@agent
def human_cli(
    answer: bool | str = True,
    intermediate_scoring: bool = False,
    record_session: bool = True,
    user: str | None = None,
    instructions: str | None = None,
    bashrc: str | None = None,
) -> Agent:
    """Human CLI agent for tasks that run in a sandbox.

    The Human CLI agent installs agent task tools in the default
    sandbox and presents the user with both task instructions and
    documentation for the various tools (e.g. `task submit`,
    `task start`, `task stop` `task instructions`, etc.). A human agent panel
    is displayed with instructions for logging in to the sandbox.

    If the user is running in VS Code with the Inspect extension,
    they will also be presented with links to login to the sandbox
    using a VS Code Window or Terminal.

    Args:
       answer: Is an explicit answer required for this task or is it scored
          based on files in the container? Pass a `str` with a regex to validate
          that the answer matches the expected format.
       intermediate_scoring: Allow the human agent to check their score while working.
       record_session: Record all user commands and outputs in the sandbox bash session.
       user: User to login as. Defaults to the sandbox environment's default user.
       instructions: Additional instructions beyond the default task command instructions.
       bashrc: Additional content to include in the .bashrc file for the human cli shell.

    Returns:
       Agent: Human CLI agent.
    """
    # we can only run one human agent interaction at a time (use lock to enforce)
    agent_lock = anyio.Lock()

    async def execute(state: AgentState) -> AgentState:
        async with agent_lock:
            # ensure that we have a sandbox to work with
            try:
                connection = await sandbox().connection(user=user)
            except ProcessLookupError:
                raise RuntimeError("Human agent must run in a task with a sandbox.")
            except NotImplementedError:
                raise RuntimeError(
                    "Human agent must run with a sandbox that supports connections."
                )

            # helper function to run the agent (called for fullscreen vs. fallback below)
            async def run_human_agent(view: HumanAgentView) -> AgentState:
                sandbox_proxy = cast(SandboxEnvironmentProxy, sandbox())
                with sandbox_proxy.no_events():
                    # create agent commands
                    commands = human_agent_commands(
                        state,
                        answer,
                        intermediate_scoring,
                        record_session,
                        instructions,
                    )

                    # install agent tools
                    await install_human_agent(user, commands, bashrc, record_session)

                    # hookup the view ui
                    view.connect(connection)

                    # run sandbox service
                    return await run_human_agent_service(user, state, commands, view)

            # support both fullscreen ui and fallback
            if display_type() == "full":
                async with await input_panel(HumanAgentPanel) as panel:
                    return await run_human_agent(panel)
            else:
                return await run_human_agent(ConsoleView())

    return execute
```

## `agent/_human/commands/__init__.py`

```python
from ..._agent import AgentState
from .clock import StartCommand, StopCommand
from .command import HumanAgentCommand
from .instructions import InstructionsCommand
from .note import NoteCommand
from .score import ScoreCommand
from .status import StatusCommand
from .submit import QuitCommand, SubmitCommand, ValidateCommand


def human_agent_commands(
    state: AgentState,
    answer: bool | str,
    intermediate_scoring: bool,
    record_session: bool,
    instructions: str | None,
) -> list[HumanAgentCommand]:
    # base submit, validate, and quit
    commands = [
        SubmitCommand(record_session),
        ValidateCommand(answer),
        QuitCommand(record_session),
    ]

    # optional intermediate scoring
    if intermediate_scoring:
        commands.append(ScoreCommand(state))

    # remaining commands
    commands.extend(
        [
            NoteCommand(),
            StatusCommand(),
            StartCommand(),
            StopCommand(),
        ]
    )

    # with instructions (letting it see the other commands)
    return commands + [InstructionsCommand(commands, instructions)]
```

## `agent/_human/commands/clock.py`

```python
from argparse import Namespace
from typing import Awaitable, Callable, Literal

from pydantic import JsonValue

from inspect_ai._util.format import format_progress_time

from ..state import HumanAgentState
from .command import HumanAgentCommand, call_human_agent
from .status import render_status


class StartCommand(HumanAgentCommand):
    @property
    def name(self) -> str:
        return "start"

    @property
    def description(self) -> str:
        return "Start the task clock (resume working)."

    @property
    def group(self) -> Literal[1, 2, 3]:
        return 2

    def cli(self, args: Namespace) -> None:
        print(call_human_agent("start"))

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        async def start() -> str:
            if not state.running:
                state.running = True
                clock_action_event("start", state)
            return render_status(state)

        return start


class StopCommand(HumanAgentCommand):
    @property
    def name(self) -> str:
        return "stop"

    @property
    def description(self) -> str:
        return "Stop the task clock (pause working)."

    @property
    def group(self) -> Literal[1, 2, 3]:
        return 2

    def cli(self, args: Namespace) -> None:
        print(call_human_agent("stop"))

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        async def stop() -> str:
            if state.running:
                state.running = False
                clock_action_event("stop", state)
            return render_status(state)

        return stop


def clock_action_event(
    action: Literal["start", "stop"], state: HumanAgentState
) -> None:
    from inspect_ai.log._transcript import transcript

    transcript().info(
        {
            "action": action,
            "total_time": format_progress_time(state.time, False),
        },
        source="human_agent",
    )
```

## `agent/_human/commands/command.py`

```python
import abc
from argparse import Namespace
from typing import Any, Awaitable, Callable, Literal, NamedTuple

from pydantic import JsonValue

from ..state import HumanAgentState


class HumanAgentCommand:
    @property
    @abc.abstractmethod
    def name(self) -> str:
        """Command name (e.g. 'submit')"""
        ...

    @property
    @abc.abstractmethod
    def description(self) -> str:
        """Command description."""
        ...

    @property
    def group(self) -> Literal[1, 2, 3]:
        return 1

    @property
    def contexts(self) -> list[Literal["cli", "service"]]:
        """Contexts where this command runs (defaults to both cli and service)."""
        return ["cli", "service"]

    class CLIArg(NamedTuple):
        name: str
        description: str
        required: bool = False

    @property
    def cli_args(self) -> list[CLIArg]:
        """Positional command line arguments."""
        return []

    def cli(self, args: Namespace) -> None:
        """CLI command (runs in container). Required for context "cli"."""
        pass

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        """Service handler (runs in solver). Required for context "service"."""

        async def no_handler() -> None:
            pass

        return no_handler


# Dummy functions for implementation of call methods


def call_human_agent(method: str, **params: Any) -> Any:
    return None
```

## `agent/_human/commands/instructions.py`

```python
from argparse import Namespace
from typing import Awaitable, Callable, Literal

from pydantic import JsonValue
from rich.console import Group, RenderableType
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from inspect_ai._util.ansi import render_text
from inspect_ai._util.transcript import DOUBLE_LINE

from ..state import HumanAgentState
from .command import HumanAgentCommand, call_human_agent


class InstructionsCommand(HumanAgentCommand):
    def __init__(
        self, commands: list[HumanAgentCommand], instructions: str | None
    ) -> None:
        self._commands = commands.copy() + [self]
        self._instructions = instructions

    @property
    def name(self) -> str:
        return "instructions"

    @property
    def description(self) -> str:
        return "Display task commands and instructions."

    @property
    def group(self) -> Literal[1, 2, 3]:
        return 3

    def cli(self, args: Namespace) -> None:
        print(call_human_agent("instructions", **vars(args)))

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        async def instructions() -> str:
            intro = "\nYou will be completing a task based on the instructions presented below. You can use the following commands as you work on the task:\n"
            commands_table = Table(box=None, show_header=False)
            commands_table.add_column("", justify="left")
            commands_table.add_column("", justify="left")

            def add_command_group(group: int) -> None:
                for command in filter(
                    lambda c: "cli" in c.contexts and c.group == group, self._commands
                ):
                    commands_table.add_row(f"task {command.name}", command.description)
                if group != 3:
                    commands_table.add_row("", "")

            for i in range(1, 4):
                add_command_group(i)

            header_content: list[RenderableType] = [intro, commands_table]
            if self._instructions:
                header_content.extend(["", self._instructions])

            header_panel = Panel(
                Group(*header_content),
                title=Text.from_markup("[bold]Human Agent Task[/bold]"),
                box=DOUBLE_LINE,
                padding=(0, 0),
            )

            instructions_panel = Panel(
                f"{state.instructions.strip()}",
                title="Task Instructions",
                padding=(1, 1),
            )

            return render_text(
                ["", header_panel, instructions_panel],
                styles=False,
                no_color=True,
                width=90,
            )

        return instructions
```

## `agent/_human/commands/note.py`

```python
from argparse import Namespace
from typing import Awaitable, Callable, Literal

from pydantic import JsonValue

from ..state import HumanAgentState
from .command import HumanAgentCommand, call_human_agent


class NoteCommand(HumanAgentCommand):
    @property
    def name(self) -> str:
        return "note"

    @property
    def description(self) -> str:
        return "Record a note in the task transcript."

    @property
    def group(self) -> Literal[1, 2, 3]:
        return 1

    def cli(self, args: Namespace) -> None:
        print(
            "Enter a multiline markdown note (Press Ctrl+D on a new line to finish):\n"
        )
        lines = ["## Human Agent Note"]
        try:
            while True:
                line = input()
                lines.append(line)
        except EOFError:
            pass
        call_human_agent("note", content="\n".join(lines))

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        from inspect_ai.log._transcript import transcript

        async def note(content: str) -> None:
            transcript().info(content, source="human_agent")

        return note
```

## `agent/_human/commands/score.py`

```python
from argparse import Namespace
from copy import deepcopy
from typing import Awaitable, Callable, Literal

from pydantic import JsonValue

from inspect_ai._util.ansi import render_text
from inspect_ai._util.json import to_json_str_safe
from inspect_ai.model._model_output import ModelOutput
from inspect_ai.scorer._score import score

from ..._agent import AgentState
from ..state import HumanAgentState, IntermediateScoring
from .command import HumanAgentCommand, call_human_agent


class ScoreCommand(HumanAgentCommand):
    def __init__(self, state: AgentState):
        self._state = state

    @property
    def name(self) -> str:
        return "score"

    @property
    def description(self) -> str:
        return "Score the task to check progress."

    @property
    def group(self) -> Literal[1, 2, 3]:
        return 1

    @property
    def cli_args(self) -> list[HumanAgentCommand.CLIArg]:
        return [
            HumanAgentCommand.CLIArg(
                name="answer",
                description="Answer to submit for scoring (optional, not required for all tasks)",
            )
        ]

    def cli(self, args: Namespace) -> None:
        # first validate (print and exit if we get a str back)
        call_args = vars(args)
        error = call_human_agent("validate", **call_args)
        if error:
            print(error)
            return

        print(call_human_agent("score", **call_args))

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        async def score_task(answer: str | None) -> str:
            # make a copy of TaskState, add the answer, then score
            if answer:
                agent_state = deepcopy(self._state)
                agent_state.output = ModelOutput.from_content("human_agent", answer)
                result = await score(agent_state)
            else:
                result = await score(self._state)

            # record the scoring action in our state
            state.scorings.append(IntermediateScoring(time=state.time, scores=result))

            # notify user
            result_score = (
                result[0].value
                if isinstance(result[0].value, str)
                else to_json_str_safe(result[0].value)
            )
            return render_text(
                f"[bold]Answer:[/bold] {result[0].answer}, [bold]Score:[/bold] {result_score}"
            )

        return score_task
```

## `agent/_human/commands/status.py`

```python
from argparse import Namespace
from typing import Awaitable, Callable, Literal

from pydantic import JsonValue
from rich.console import RenderableType
from rich.table import Table
from rich.text import Text

from inspect_ai._util.ansi import render_text
from inspect_ai._util.format import format_progress_time
from inspect_ai._util.json import to_json_str_safe

from ..state import HumanAgentState
from .command import HumanAgentCommand, call_human_agent


class StatusCommand(HumanAgentCommand):
    @property
    def name(self) -> str:
        return "status"

    @property
    def description(self) -> str:
        return "Print task status (clock, scoring, etc.)"

    @property
    def group(self) -> Literal[1, 2, 3]:
        return 2

    def cli(self, args: Namespace) -> None:
        print(call_human_agent("status"))

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        async def status() -> str:
            return render_status(state)

        return status


def render_status(state: HumanAgentState) -> str:
    content: list[RenderableType] = [""]
    content.append(
        f"[bold]Status:[/bold] {'Running' if state.running else 'Stopped'}  "
        + f"[bold]Time:[/bold] {format_progress_time(state.time, pad_hours=False)}"
    )

    if len(state.scorings) > 0:
        content.append("")
        content.append(Text.from_markup("[italic]Intermediate Scores[/italic]"))
        scores_table = Table(box=None, min_width=35, padding=(0, 0))
        scores_table.add_column("Answer", justify="left")
        scores_table.add_column("Score", justify="center")
        scores_table.add_column("Time", justify="right")

        for score in state.scorings:
            score_value = (
                score.scores[0].value
                if isinstance(score.scores[0].value, str)
                else to_json_str_safe(score.scores[0].value)
            )
            scores_table.add_row(
                score.scores[0].answer,
                score_value,
                format_progress_time(score.time),
            )
        content.append(scores_table)

    return render_text(content, highlight=False)
```

## `agent/_human/commands/submit.py`

```python
from argparse import Namespace
from logging import getLogger
from pathlib import PurePosixPath
from re import Pattern, compile, match
from typing import Awaitable, Callable, Literal

from pydantic import JsonValue

from inspect_ai._util.ansi import render_text
from inspect_ai.util._sandbox import sandbox

from ..install import RECORD_SESSION_DIR
from ..state import HumanAgentState
from .command import HumanAgentCommand, call_human_agent

logger = getLogger(__name__)


class SessionEndCommand(HumanAgentCommand):
    def __init__(self, record_session: bool):
        super().__init__()
        self._record_session = record_session

    @property
    def group(self) -> Literal[1, 2, 3]:
        return 1

    async def _read_session_logs(self) -> dict[str, str]:
        # retreive session logs (don't fail)
        sessions_dir = PurePosixPath(RECORD_SESSION_DIR)
        result = await sandbox().exec(["ls", "-1", sessions_dir.as_posix()])
        if not result.success:
            logger.warning(f"Error listing human agent session logs: {result.stderr}")
            return {}

        # read logs
        session_logs: dict[str, str] = {}
        for session_log in result.stdout.strip().splitlines():
            try:
                session_logs[session_log] = await sandbox().read_file(
                    (sessions_dir / session_log).as_posix()
                )
            except Exception as ex:
                logger.warning(f"Error reading human agent session log: {ex}")

        return session_logs


class QuitCommand(SessionEndCommand):
    @property
    def name(self) -> str:
        return "quit"

    @property
    def description(self) -> str:
        return "Quit the task without submitting an answer."

    def cli(self, args: Namespace) -> None:
        # verify that the user wants to proceed
        action = "quit the task without submitting an answer (ending the exercise)"
        while True:
            response = (
                input(
                    f"\nDo you definitely want to {action}?\n\nThis will disconnect you from the task environment and you won't be able to reconnect.\n\nYes (y) or No (n): "
                )
                .lower()
                .strip()
            )
            if response in ["yes", "y"]:
                break
            elif response in ["no", "n"]:
                return
            else:
                print("Please enter yes or no.")

        # thank the user!
        print(
            "\nThank you for working on this task!\n\n"
            + "Your task will now be scored and you will be disconnected from this container.\n"
        )

        call_human_agent("quit")

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        async def submit() -> None:
            if self._record_session:
                state.logs = await self._read_session_logs()
            state.running = False
            state.answer = ""

        return submit


class SubmitCommand(SessionEndCommand):
    @property
    def name(self) -> str:
        return "submit"

    @property
    def description(self) -> str:
        return "Submit your final answer for the task."

    @property
    def cli_args(self) -> list[HumanAgentCommand.CLIArg]:
        return [
            HumanAgentCommand.CLIArg(
                name="answer",
                description="Answer to submit for scoring (optional, not required for all tasks)",
            )
        ]

    def cli(self, args: Namespace) -> None:
        # read cli args
        call_args = vars(args)

        # first validate (print and exit if we get a str back)
        error = call_human_agent("validate", **call_args)
        if error:
            print(error)
            return

        # verify that the user wants to proceed
        answer = call_args.get("answer", None)
        answer_text = f" '{answer}'" if answer else ""
        action = f"end the task and submit{answer_text}"

        while True:
            response = (
                input(
                    f"\nDo you definitely want to {action}?\n\nThis will disconnect you from the task environment and you won't be able to reconnect.\n\nYes (y) or No (n): "
                )
                .lower()
                .strip()
            )
            if response in ["yes", "y"]:
                break
            elif response in ["no", "n"]:
                return
            else:
                print("Please enter yes or no.")

        # thank the user!
        print(
            "\nThank you for working on this task!\n\n"
            + "Your task will now be scored and you will be disconnected from this container.\n"
        )

        call_human_agent("submit", **call_args)

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        async def submit(answer: str) -> None:
            if self._record_session:
                state.logs = await self._read_session_logs()
            state.running = False
            state.answer = answer if answer is not None else ""

        return submit


class ValidateCommand(HumanAgentCommand):
    def __init__(self, answer: bool | str) -> None:
        self._answer = compile(answer) if isinstance(answer, str) else answer

    @property
    def name(self) -> str:
        return "validate"

    @property
    def description(self) -> str:
        return "Validate a task submission."

    @property
    def contexts(self) -> list[Literal["cli", "service"]]:
        return ["service"]

    def service(self, state: HumanAgentState) -> Callable[..., Awaitable[JsonValue]]:
        async def validate(answer: str | None) -> str | None:
            def failed(reason: str) -> str:
                return render_text(f"[bold]FAILED:[/bold] {reason}")

            if not state.running:
                return failed("Task is stopped (use 'task start' to start)")
            if self._answer:
                answer = answer.strip() if isinstance(answer, str) else answer
                if not answer:
                    return failed(
                        "An explicit answer is required for scoring this task."
                    )
                elif isinstance(self._answer, Pattern) and not match(
                    self._answer, answer
                ):
                    return failed(
                        "Your answer was not in the required format (please review the task instructions)"
                    )
            return None  # made it through verification

        return validate
```

## `agent/_human/install.py`

```python
import inspect
from textwrap import dedent

from inspect_ai.util import sandbox

from .commands.command import HumanAgentCommand

INSTALL_DIR = "human_agent_install"
HUMAN_AGENT_DIR = "/opt/human_agent"
TASK_PY = "task.py"
INSTALL_SH = "install.sh"
BASHRC = ".bashrc"
WELCOME_FILE = "welcome.txt"
WELCOME_LOGIN_FILE = "welcome_login.txt"
INSTRUCTIONS_FILE = "instructions.txt"
RECORD_SESSION_DIR = "/var/tmp/user-sessions"


async def install_human_agent(
    user: str | None,
    commands: list[HumanAgentCommand],
    bashrc_content: str | None,
    record_session: bool,
) -> None:
    # see if we have already installed
    if not (await sandbox().exec(["mkdir", HUMAN_AGENT_DIR], user="root")).success:
        return

    if not user:
        user = (await sandbox().exec(["whoami"])).stdout.strip()

    if user != "root":
        await checked_exec(["chown", user, HUMAN_AGENT_DIR], user="root")

    # setup installation directory
    await checked_exec(["mkdir", "-p", INSTALL_DIR], user="root")
    if user != "root":
        await checked_exec(["chown", user, INSTALL_DIR], user="root")

    # generate task.py
    task_py = human_agent_commands(commands)
    await checked_write_file(f"{INSTALL_DIR}/{TASK_PY}", task_py, executable=True)

    # generate .bashrc
    bash_rc = human_agent_bashrc(commands, bashrc_content, record_session)
    await checked_write_file(f"{INSTALL_DIR}/{BASHRC}", bash_rc, executable=True)

    # write and run installation script
    install_sh = human_agent_install_sh(user)
    await checked_write_file(f"{INSTALL_DIR}/{INSTALL_SH}", install_sh, executable=True)
    await checked_exec(["bash", f"./{INSTALL_SH}"], cwd=INSTALL_DIR)
    await checked_exec(["rm", "-rf", INSTALL_DIR])


def human_agent_commands(commands: list[HumanAgentCommand]) -> str:
    # filter out hidden commands
    commands = [command for command in commands if "cli" in command.contexts]

    # standard imports (including any dependencies that call methods carry)
    imports = dedent("""
    import argparse
    import sys
    from argparse import Namespace
    from pathlib import Path

    sys.path.append("/var/tmp/sandbox-services/human_agent")
    from human_agent import call_human_agent

    def format_time(t):
        minutes, seconds = divmod(t, 60)
        hours, minutes = divmod(minutes, 60)
        return f"{hours:.0f}:{minutes:02.0f}:{seconds:02.0f}"
    """)

    # command handler source code (extracted from call methods)
    command_handlers = "\n\n".join(
        dedent(
            inspect.getsource(command.cli).replace("cli(self, ", f"{command.name}(", 1)
        )
        for command in commands
    )

    # parse commands
    command_parsers: list[str] = []
    for command in commands:
        command_parsers.append(
            dedent(f"""
        {command.name}_parser = subparsers.add_parser("{command.name}", help="{command.description}")
        """).lstrip()
        )
        for arg in command.cli_args:
            if arg.name.startswith("--"):
                extras = 'action="store_true", default=False'
            else:
                extras = f"""nargs={1 if arg.required else '"?"'}"""
            command_parsers.append(
                dedent(f"""
                {command.name}_parser.add_argument("{arg.name}", {extras}, help="{arg.description}")
                """).strip()
            )

    parse = (
        dedent("""
    parser = argparse.ArgumentParser(description="Human agent tools.")
    subparsers = parser.add_subparsers(dest="command")
    """)
        + "\n"
        + "\n".join(command_parsers)
    )

    # dispatch commands
    command_dispatchers: list[str] = []
    for i, command in enumerate(commands):
        conditional = "if" if i == 0 else "elif"
        command_dispatchers.append(
            f'{conditional} command == "{command.name}": {command.name}(args)'
        )
    command_dispatchers.append("else: parser.print_help()")

    dispatch = dedent("""
    args = parser.parse_args()
    command = args.command
    delattr(args, 'command')
    """) + "\n".join(command_dispatchers)

    return "\n".join([imports, command_handlers, parse, dispatch]) + "\n"


def human_agent_bashrc(
    commands: list[HumanAgentCommand], bashrc_content: str | None, record_session: bool
) -> str:
    # only run in interative terminals
    TERMINAL_CHECK = dedent("""

    ### Inspect Human Agent Setup #########################################=

    # only run if shell is interactive
    case $- in
        *i*) ;;
        *) return ;;
    esac

    # only run if attached to a terminal
    if ! tty -s; then
        return
    fi
    """)

    # shell alias and completions
    command_names = " ".join(
        [f"{command.name}" for command in commands if "cli" in command.contexts]
    )
    COMMANDS = dedent(f"""
    # shell alias for human agent commands
    alias task='python3 {HUMAN_AGENT_DIR}/{TASK_PY}'

    # completion handler
    _task_completion() {{
        local cur
        cur="${{COMP_WORDS[COMP_CWORD]}}"
        if [ "$COMP_CWORD" -eq 1 ]; then
            local commands="{command_names}"

            # Generate completion matches
            COMPREPLY=($(compgen -W "${{commands}}" -- ${{cur}}))
        fi
    }}
    complete -F _task_completion task
    """)

    if bashrc_content:
        COMMANDS = f"{COMMANDS}\n\n{bashrc_content}"

    # session recording
    if record_session:
        RECORDING = dedent(f"""
        # record human agent session transcript
        if [ -z "$SCRIPT_RUNNING" ]; then
            export SCRIPT_RUNNING=1
            LOGDIR={RECORD_SESSION_DIR}
            mkdir -p "$LOGDIR"
            TIMESTAMP=$(date +%Y%m%d_%H%M%S)
            INPUTFILE="$LOGDIR/$(whoami)_$TIMESTAMP.input"
            OUTPUTFILE="$LOGDIR/$(whoami)_$TIMESTAMP.output"
            TIMINGFILE="$LOGDIR/$(whoami)_$TIMESTAMP.timing"
            exec script -q -f -m advanced -I "$INPUTFILE" -O "$OUTPUTFILE" -T "$TIMINGFILE" -c "bash --login -i"
        fi
        """)
    else:
        RECORDING = ""

    # display task instructions
    INSTRUCTIONS = dedent("""
    if [ -z "$INSTRUCTIONS_SHOWN" ]; then
        export INSTRUCTIONS_SHOWN=1
        task instructions > ~/instructions.txt
        cat ~/instructions.txt
    fi
    """).lstrip()

    CLOCK = dedent("""
    task start
    """).lstrip()

    # return .bashrc
    return "\n".join([TERMINAL_CHECK, COMMANDS, RECORDING, INSTRUCTIONS, CLOCK])


def human_agent_install_sh(user: str | None) -> str:
    return dedent(f"""
    #!/usr/bin/env bash

    # create installation directory
    HUMAN_AGENT="{HUMAN_AGENT_DIR}"
    mkdir -p $HUMAN_AGENT

    # copy command script
    cp {TASK_PY} $HUMAN_AGENT

    # get user's home directory
    USER="{user or ""}"
    if [ -z "$USER" ]; then
        USER=$(whoami)
    fi
    USER_HOME=$(getent passwd $USER | cut -d: -f6)

    # append to user's .bashrc
    cat {BASHRC} >> $USER_HOME/{BASHRC}
    """)


async def checked_exec(
    cmd: list[str],
    input: str | bytes | None = None,
    cwd: str | None = None,
    user: str | None = None,
) -> str:
    result = await sandbox().exec(cmd, input=input, cwd=cwd, user=user)
    if not result.success:
        raise RuntimeError(f"Error executing command {' '.join(cmd)}: {result.stderr}")
    return result.stdout


async def checked_write_file(
    file: str, contents: str, executable: bool = False, user: str | None = None
) -> None:
    await checked_exec(["tee", "--", file], input=contents)
    if user:
        await checked_exec(["chown", user, file], user="root")
    if executable:
        await checked_exec(["chmod", "+x", file])
```

## `agent/_human/panel.py`

```python
from typing import cast

from textual.app import ComposeResult
from textual.containers import (
    Container,
    Horizontal,
    VerticalScroll,
)
from textual.css.query import NoMatches
from textual.reactive import reactive
from textual.widgets import (
    Button,
    ContentSwitcher,
    Label,
    Link,
    LoadingIndicator,
    Static,
)

from inspect_ai._util.format import format_progress_time
from inspect_ai._util.vscode import (
    VSCodeCommand,
    can_execute_vscode_commands,
    execute_vscode_commands,
)
from inspect_ai.util import InputPanel, SandboxConnection, throttle

from .state import HumanAgentState


class HumanAgentPanel(InputPanel):
    DEFAULT_TITLE = "Human Agent"

    SANDBOX_VIEW_ID = "human-agent-sandbox-view"
    SANDBOX_INSTRUCTIONS_ID = "sandbox-instructions"
    VSCODE_LINKS_ID = "vscode-links"
    LOGIN_VSCODE_TERMINAL_ID = "login-vscode-terminal"
    LOGIN_VSCODE_WINDOW_ID = "login-vscode-window"
    LOGIN_VSCODE_WINDOW_LABEL_ID = "login-vscode-window-label"
    COMMAND_INSTRUCTIONS_ID = "command-instructions"
    SANDBOX_COMMAND_ID = "sandbox-command"

    INSTRUCTIONS_CLASS = "instructions"
    LINK_LABEL_CLASS = "link-label"

    DEFAULT_CSS = f"""
    #{SANDBOX_VIEW_ID} {{
        scrollbar-size-vertical: 1;
    }}
    HumanAgentPanel .{INSTRUCTIONS_CLASS} {{
        color: $text-muted;
        margin-bottom: 1;
    }}
    #{SANDBOX_COMMAND_ID} {{
        color: $secondary;
    }}
    HumanAgentPanel .{LINK_LABEL_CLASS} {{
        color: $text-muted;
    }}
    HumanAgentPanel VSCodeLink {{
        margin-left: 1;
        margin-right: 2;
    }}
    HumanAgentPanel #{VSCODE_LINKS_ID} {{
        height: 1;
        margin-bottom: 1;
    }}
    """

    connection: reactive[SandboxConnection | None] = reactive(None)

    # implement HumanAgentView
    def connect(self, connection: SandboxConnection) -> None:
        self.connection = connection

    @throttle(1)
    def update_state(self, state: HumanAgentState) -> None:
        try:
            status_bar = self.query_one(StatusBar)
            status_bar.running = state.running
            status_bar.time = state.time
        except NoMatches:
            # may not exist if we are in ContentSwitcher
            pass

    def compose(self) -> ComposeResult:
        with ContentSwitcher(initial=LoadingView.ID):
            yield LoadingView()
            with VerticalScroll(id=self.SANDBOX_VIEW_ID):
                yield StatusBar()
                yield Static(
                    id=self.SANDBOX_INSTRUCTIONS_ID,
                    classes=self.INSTRUCTIONS_CLASS,
                    markup=False,
                )
                with Horizontal(id=self.VSCODE_LINKS_ID):
                    yield Label(
                        "Login:",
                        classes=self.LINK_LABEL_CLASS,
                        id=self.LOGIN_VSCODE_WINDOW_LABEL_ID,
                    )
                    yield VSCodeLink(
                        "VS Code Window",
                        id=self.LOGIN_VSCODE_WINDOW_ID,
                    )
                    yield Label("Login:", classes=self.LINK_LABEL_CLASS)
                    yield VSCodeLink(
                        "VS Code Terminal",
                        id=self.LOGIN_VSCODE_TERMINAL_ID,
                    )
                yield Static(
                    id=self.COMMAND_INSTRUCTIONS_ID,
                    classes=self.INSTRUCTIONS_CLASS,
                    markup=False,
                )
                yield Static(id=self.SANDBOX_COMMAND_ID, markup=False)

    def watch_connection(self, connection: SandboxConnection | None) -> None:
        if connection:
            # switch to sandbox view
            self.query_one(ContentSwitcher).current = self.SANDBOX_VIEW_ID

            # note whether we are in vscode
            vscode = can_execute_vscode_commands()

            # suffix for instructions based on whether we are in vscode
            instructions_command = "Login to the system with the following command (hold down Alt or Option to select text for copying):"
            instructions_vscode = (
                "Use the links below to login to the system within VS Code:"
            )

            # update instructions
            instructions_lbl = cast(
                Static, self.query_one(f"#{self.SANDBOX_INSTRUCTIONS_ID}")
            )
            instructions = f"""You are completing a task on a Linux system (task instructions will be presented when you login). {instructions_vscode if vscode else instructions_command}"""
            instructions_lbl.update(instructions)

            # login: vscode terminal
            vscode_links = self.query_one(f"#{self.VSCODE_LINKS_ID}")
            vscode_links.display = vscode
            terminal_btn = cast(
                VSCodeLink, self.query_one(f"#{self.LOGIN_VSCODE_TERMINAL_ID}")
            )
            terminal_btn.commands = [
                VSCodeCommand(
                    command="workbench.action.terminal.new", args=[{"location": 2}]
                ),
                VSCodeCommand(
                    command="workbench.action.terminal.sendSequence",
                    args=[{"text": f"{connection.command}\n"}],
                ),
            ]

            # login: vscode window
            window_btn = cast(
                VSCodeLink, self.query_one(f"#{self.LOGIN_VSCODE_WINDOW_ID}")
            )
            window_lbl = cast(
                Label, self.query_one(f"#{self.LOGIN_VSCODE_WINDOW_LABEL_ID}")
            )
            window_btn_and_lbl_display = (
                vscode and connection.vscode_command is not None
            )
            window_btn.display = window_btn_and_lbl_display
            window_lbl.display = window_btn_and_lbl_display
            if connection.vscode_command is not None:
                window_btn.commands = [
                    VSCodeCommand(
                        command=connection.vscode_command[0],
                        args=connection.vscode_command[1:],
                    )
                ]

            # command (always available)
            command_instructions_lbl = cast(
                Static, self.query_one(f"#{self.COMMAND_INSTRUCTIONS_ID}")
            )
            command_instructions_lbl.display = vscode
            command_instructions_lbl.update(
                instructions_command.replace("Login", "Alternatively, login", 1)
            )
            command_lbl = cast(Static, self.query_one(f"#{self.SANDBOX_COMMAND_ID}"))
            command_lbl.update(connection.command)


class StatusBar(Horizontal):
    STATUS_ID = "task-status"
    TIME_ID = "task-time"

    LABEL_CLASS = "status-label"
    VALUE_CLASS = "status-value"

    DEFAULT_CSS = f"""
    StatusBar {{
        width: 1fr;
        height: 1;
        background: $surface;
        margin-bottom: 1;
        layout: grid;
        grid-size: 4 1;
        grid-columns: auto auto auto auto;
        grid-gutter: 1;
    }}
    .{LABEL_CLASS} {{
        color: $primary;
    }}
    .{VALUE_CLASS} {{
        color: $foreground;
    }}
    StatusBar Link {{
        dock: right;
        margin-right: 1;
    }}
    """

    running: reactive[bool] = reactive(True)
    time: reactive[float] = reactive(0)

    def __init__(self) -> None:
        super().__init__()

    def compose(self) -> ComposeResult:
        yield Label("Status:", classes=self.LABEL_CLASS)
        yield Static(
            "Running", id=self.STATUS_ID, classes=self.VALUE_CLASS, markup=False
        )
        yield Label(" Time:", classes=self.LABEL_CLASS)
        yield Static("0:00:00", id=self.TIME_ID, classes=self.VALUE_CLASS, markup=False)

    def watch_running(self, running: bool) -> None:
        cast(Static, self.query_one(f"#{self.STATUS_ID}")).update(
            "Running" if running else "Stopped"
        )

    def watch_time(self, time: float) -> None:
        time_display = format_progress_time(time)
        cast(Static, self.query_one(f"#{self.TIME_ID}")).update(time_display)


class LoadingView(Container):
    ID = "human-agent-loading-view"

    def __init__(self) -> None:
        super().__init__(id=self.ID)

    def compose(self) -> ComposeResult:
        yield LoadingIndicator()
        yield Button()  # add focusable widget so the tab can activate


class VSCodeLink(Link):
    def __init__(
        self,
        text: str,
        *,
        url: str | None = None,
        tooltip: str | None = None,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
        disabled: bool = False,
    ) -> None:
        super().__init__(
            text,
            url=url,
            tooltip=tooltip,
            name=name,
            id=id,
            classes=classes,
            disabled=disabled,
        )
        self.commands: list[VSCodeCommand] = []

    def on_click(self) -> None:
        execute_vscode_commands(self.commands)
```

## `agent/_human/service.py`

```python
from inspect_ai.agent._human.commands.clock import clock_action_event
from inspect_ai.model import ModelOutput
from inspect_ai.util._sandbox import sandbox
from inspect_ai.util._sandbox.service import sandbox_service

from .._agent import AgentState
from .commands.command import HumanAgentCommand
from .state import HumanAgentState
from .view import HumanAgentView


async def run_human_agent_service(
    user: str | None,
    state: AgentState,
    commands: list[HumanAgentCommand],
    view: HumanAgentView | None,
) -> AgentState:
    # initialise agent state
    instructions = "\n\n".join([message.text for message in state.messages]).strip()
    agent_state = HumanAgentState(instructions=instructions)

    # record that clock is stopped
    clock_action_event("stop", agent_state)

    # extract service methods from commands
    methods = {
        command.name: command.service(agent_state)
        for command in commands
        if "service" in command.contexts
    }

    # callback to check if task is completed (use this to periodically
    # update the view with the current state)
    def task_is_completed() -> bool:
        if view:
            view.update_state(agent_state)
        return agent_state.answer is not None

    # run the service
    await sandbox_service(
        name="human_agent",
        methods=methods,
        until=task_is_completed,
        sandbox=sandbox(),
        user=user,
    )

    # set the answer if we have one
    if agent_state.answer is not None:
        state.output = ModelOutput.from_content("human_agent", agent_state.answer)

    # return state
    return state
```

## `agent/_human/state.py`

```python
import time as python_time

from pydantic import BaseModel, Field

from inspect_ai.scorer._metric import Score
from inspect_ai.util._store_model import StoreModel


class IntermediateScoring(BaseModel):
    time: float
    scores: list[Score]


class HumanAgentState(StoreModel):
    instructions: str
    """Task instructions."""

    @property
    def running(self) -> bool:
        """Is the task currently running?"""
        return self.running_state

    @running.setter
    def running(self, running: bool) -> None:
        """Set current running state."""
        # if we are flipping to running mode then update started running
        if not self.running_state and running:
            self.started_running = python_time.time()

        # if we are exiting running mode then update accumulated time
        if self.running_state and not running:
            self.accumulated_time = self.time

        # update running
        self.running_state = running

    @property
    def time(self) -> float:
        """Total time spend on task."""
        running_time = python_time.time() - self.started_running if self.running else 0
        return self.accumulated_time + running_time

    scorings: list[IntermediateScoring] = Field(default_factory=list)
    """Intermediate scorings yielded by `task score`"""

    answer: str | None = Field(default=None)
    """Final answer provided in `task submit`"""

    logs: dict[str, str] = Field(default_factory=dict)
    """Session logs generated by `script` """

    # internal state variables used by running and time properties
    running_state: bool = Field(default=False)
    started_running: float = Field(default_factory=python_time.time)
    accumulated_time: float = Field(default=0.0)
```

## `agent/_human/view.py`

```python
from typing import Protocol

from inspect_ai.util import SandboxConnection

from .state import HumanAgentState


class HumanAgentView(Protocol):
    def connect(self, connection: SandboxConnection) -> None: ...
    def update_state(self, state: HumanAgentState) -> None: ...


class ConsoleView(HumanAgentView):
    """Fallback view for when we aren't running fullscreen UI."""

    def connect(self, connection: SandboxConnection) -> None:
        print(
            "You are completing a task on a Linux system (task instructions will be presented "
            + "when you login). Login to the system with the following command:\n"
        )
        print(f"{connection.command}\n")

    def update_state(self, state: HumanAgentState) -> None:
        pass
```

## `agent/_react.py`

```python
from logging import getLogger
from typing import Literal, Sequence

from inspect_ai._util._async import is_callable_coroutine
from inspect_ai._util.content import Content, ContentText
from inspect_ai.approval._policy import ApprovalPolicy
from inspect_ai.model._call_tools import execute_tools
from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageAssistant,
    ChatMessageSystem,
    ChatMessageTool,
    ChatMessageUser,
)
from inspect_ai.model._compaction import (
    Compact,
    CompactionStrategy,
)
from inspect_ai.model._compaction import (
    compaction as create_compaction,
)
from inspect_ai.model._model import Model, get_model
from inspect_ai.model._trim import trim_messages
from inspect_ai.scorer._score import score
from inspect_ai.tool._mcp.connection import mcp_connection
from inspect_ai.tool._tool import Tool, ToolResult, ToolSource, tool
from inspect_ai.tool._tool_def import ToolDef
from inspect_ai.tool._tool_info import parse_tool_info

from ._agent import Agent, AgentState, agent, agent_with, is_agent
from ._filter import MessageFilter
from ._handoff import has_handoff
from ._types import (
    DEFAULT_CONTINUE_PROMPT,
    DEFAULT_CONTINUE_PROMPT_NO_SUBMIT,
    AgentAttempts,
    AgentContinue,
    AgentPrompt,
    AgentSubmit,
)

logger = getLogger(__name__)


@agent
def react(
    *,
    name: str | None = None,
    description: str | None = None,
    prompt: str | AgentPrompt | None = AgentPrompt(),
    tools: Sequence[Tool | ToolDef | ToolSource] | None = None,
    model: str | Model | Agent | None = None,
    attempts: int | AgentAttempts = 1,
    submit: AgentSubmit | bool | None = None,
    on_continue: str | AgentContinue | None = None,
    retry_refusals: int | None = None,
    compaction: CompactionStrategy | None = None,
    truncation: Literal["auto", "disabled"] | MessageFilter = "disabled",
    approval: list[ApprovalPolicy] | None = None,
) -> Agent:
    """Extensible ReAct agent based on the paper [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629).

    Provide a `name` and `description` for the agent if you plan on using it
    in a multi-agent system (this is so other agents can clearly identify
    its name and purpose). These fields are not required when using `react()`
    as a top-level solver.

    The agent runs a tool use loop until the model submits an answer using the
    `submit()` tool. Use `instructions` to tailor the agent's system message
    (the default `instructions` provides a basic ReAct prompt).

    Use the `attempts` option to enable additional submissions if the initial
    submission(s) are incorrect (by default, no additional attempts are permitted).

    When using the `submit()` tool, the model will be urged to continue if it
    fails to call a tool. When not using a `submit()` tool, the agent will terminate
    if it fails to call a tool. Customise this behavior using the `on_continue` option.

    Args:
       name: Agent name (required when using with `handoff()` or `as_tool()`)
       description: Agent description (required when using with `handoff()` or `as_tool()`)
       prompt: Prompt for agent. Includes agent-specific contextual `instructions`
          as well as an optional `assistant_prompt` and `handoff_prompt` (for agents
          that use handoffs). both are provided by default but can be removed or
          customized). Pass `str` to specify the instructions and use the defaults
          for handoff and prompt messages.
       tools: Tools available for the agent.
       model: Model to use for agent (defaults to currently evaluated model).
       attempts: Configure agent to make multiple attempts.
       submit: Use a submit tool for reporting the final answer. Defaults to `True`
          which uses the default submit behavior. Pass an `AgentSubmit` to
          customize the behavior or pass `False` to disable the submit tool.
       on_continue: Message to play back to the model to urge it to continue
          when it stops calling tools. Use the placeholder {submit} to refer to
          the submit tool within the message. Alternatively, an async function
          to call to determine whether the loop should continue and what message
          to play back. Note that this function is called on _every_ iteration of
          the loop so if you only want to send a message back when the model fails
          to call tools you need to code that behavior explicitly.
       retry_refusals: Should refusals be retried? (pass number of times to retry)
       compaction: Compact the conversation when it it is close to overflowing
          the model's context window. See [Compaction](https://inspect.aisi.org.uk/compaction.html) for details on compaction strategies.
       truncation: Truncate the conversation history in the event of a context
          window overflow. Defaults to "disabled" which does no truncation. Pass
          "auto" to use `trim_messages()` to reduce the context size. Pass a
          `MessageFilter` function to do custom truncation.
       approval: Approval policies to use for tool calls within this agent.
          Temporarily replaces any active approval policies for the duration
          of tool execution.

    Returns:
        ReAct agent.
    """
    # if there is no submit tool then delegate to react_no_submit
    if submit is False:
        # if the user passes a `str` for on_continue this won't do anything
        if isinstance(on_continue, str):
            raise ValueError(
                "Passing a string to on_continue with no submit tool is not permitted, "
                + "because in this case the agent will always terminate when no tool "
                + "calls are made."
            )

        return react_no_submit(
            name=name,
            description=description,
            prompt=prompt,
            tools=tools,
            model=model,
            on_continue=on_continue,
            retry_refusals=retry_refusals,
            compaction=compaction,
            truncation=truncation,
            approval=approval,
        )

    # if submit is True or None then use default AgentSubmit
    if submit is True or submit is None:
        submit = AgentSubmit()

    # default submit tool
    @tool(name="submit")
    def default_submit_tool() -> Tool:
        async def execute(answer: str) -> ToolResult:
            """Submit an answer for evaluation.

            Args:
              answer (str): Submitted answer
            """
            return answer

        return execute

    # resolve tools
    tools = list(tools) if tools is not None else []

    # resolve submit tool
    submit_tool = (
        ToolDef(
            submit.tool or default_submit_tool(),
            name=submit.name,
            description=submit.description,
        )
        if not isinstance(submit.tool, ToolDef)
        else submit.tool
    )
    tools.append(submit_tool)

    # resolve prompt / system message
    system_message = _prompt_to_system_message(prompt, tools, submit_tool.name)

    # resolve attempts
    attempts = AgentAttempts(attempts) if isinstance(attempts, int) else attempts

    def submission(tool_results: list[ChatMessage]) -> str | None:
        return next(
            (
                result.text
                for result in tool_results
                if isinstance(result, ChatMessageTool)
                and result.function == submit_tool.name
                # Require that the submit tool call has no error
                and result.error is None
            ),
            None,
        )

    async def execute(state: AgentState) -> AgentState:
        async with mcp_connection(tools):
            # prepend system message if we have one
            if system_message:
                state.messages.insert(0, system_message)

            # resolve overflow handling
            overflow = _resolve_overflow(truncation)

            # create compact function
            compact = _agent_compact(compaction, state.messages, tools, model)

            # track attempts
            attempt_count = 0

            # track consecutive content_filter responses
            consecutive_content_filter = 0

            # main loop = will terminate after submit (subject to max_attempts)
            # or if a message or token limit is hit
            while True:
                # generate output and append assistant message
                state = await _agent_generate(
                    model, state, tools, retry_refusals, compact
                )

                # check for context window overflow
                if state.output.stop_reason == "model_length":
                    state, handled = await _handle_overflow(state, overflow)
                    if handled:
                        continue
                    else:
                        break

                # check for content filter (model refusal) -- allow a few
                # chances to recover before breaking to avoid infinite loop
                if state.output.stop_reason == "content_filter":
                    consecutive_content_filter += 1
                    if consecutive_content_filter >= 3:
                        break
                else:
                    consecutive_content_filter = 0

                # resolve tool calls (if any)
                if state.output.message.tool_calls:
                    # call tool functions
                    messages, output = await execute_tools(
                        state.messages, tools, approval=approval
                    )
                    state.messages.extend(messages)
                    if output:
                        state.output = output

                    # check for a submission
                    answer = submission(messages)
                    if answer is not None:
                        # set the output to the answer for scoring
                        if submit.answer_only:
                            state.output.completion = answer
                        else:
                            state.output.completion = f"{state.output.completion}{submit.answer_delimiter}{answer}".strip()

                        # also populate the message text (as the submit tool will be removed)
                        if (
                            not submit.keep_in_messages
                            and len(state.output.choices) > 0
                        ):
                            message = state.output.choices[0].message
                            if isinstance(message.content, str):
                                message.content = f"{message.content}{submit.answer_delimiter}{answer}".strip()
                            else:
                                message.content.append(ContentText(text=answer))

                        # exit if we are at max_attempts
                        attempt_count += 1
                        if attempt_count >= attempts.attempts:
                            break

                        # exit if the submission is successful
                        answer_scores = await score(state)
                        if attempts.score_value(answer_scores[0].value) == 1.0:
                            break

                        # otherwise notify the model that it was incorrect and continue
                        else:
                            if callable(attempts.incorrect_message):
                                if not is_callable_coroutine(
                                    attempts.incorrect_message
                                ):
                                    raise ValueError(
                                        "The incorrect_message function must be async."
                                    )
                                response_message: str = (
                                    await attempts.incorrect_message(
                                        state, answer_scores
                                    )
                                )
                            else:
                                response_message = attempts.incorrect_message

                            state.messages.append(
                                ChatMessageUser(content=response_message)
                            )

                # call the on_continue hook (if any)
                if callable(on_continue):
                    do_continue = await _call_on_continue(on_continue, state)
                    if do_continue is True:
                        # if there were no tool calls we need to send back a user message
                        if not state.output.message.tool_calls:
                            state.messages.append(
                                ChatMessageUser(
                                    content=DEFAULT_CONTINUE_PROMPT.format(
                                        submit=submit_tool.name
                                    )
                                )
                            )
                    elif isinstance(do_continue, str):
                        # send back the user message
                        state.messages.append(
                            ChatMessageUser(
                                content=do_continue.format(submit=submit_tool.name)
                            )
                        )
                    elif isinstance(do_continue, AgentState):
                        state.messages = do_continue.messages
                        state.output = do_continue.output
                    else:  # do_continue is False
                        break

                # if there is no on_continue hook then add a user message if there were no tool calls
                elif not state.output.message.tool_calls:
                    continue_msg = (
                        DEFAULT_CONTINUE_PROMPT
                        if on_continue is None
                        else str(on_continue)
                    )
                    state.messages.append(
                        ChatMessageUser(
                            content=continue_msg.format(submit=submit_tool.name)
                        )
                    )

            if not submit.keep_in_messages:
                # once we are complete, remove submit tool calls from the history
                # (as they will potentially confuse parent agents who also have
                # their own submit tools that they are 'watching' for)
                state.messages = _remove_submit_tool(state.messages, submit_tool.name)
            return state

    return _resolve_agent(execute, name, description)


def react_no_submit(
    *,
    name: str | None,
    description: str | None,
    prompt: str | AgentPrompt | None,
    tools: Sequence[Tool | ToolDef | ToolSource] | None,
    model: str | Model | Agent | None,
    on_continue: AgentContinue | None,
    retry_refusals: int | None,
    compaction: CompactionStrategy | None,
    truncation: Literal["auto", "disabled"] | MessageFilter,
    approval: list[ApprovalPolicy] | None,
) -> Agent:
    # resolve tools
    tools = list(tools) if tools is not None else []

    # resolve prompt / system message
    system_message = _prompt_to_system_message(prompt, tools, None)

    async def execute(state: AgentState) -> AgentState:
        async with mcp_connection(tools):
            # prepend system message if we have one
            if system_message:
                state.messages.insert(0, system_message)

            # resolve overflow handling
            overflow = _resolve_overflow(truncation)

            # create compact function
            compact = _agent_compact(compaction, state.messages, tools, model)

            # track consecutive content_filter responses
            consecutive_content_filter = 0

            # main loop
            while True:
                # generate output and append assistant message
                state = await _agent_generate(
                    model, state, tools, retry_refusals, compact
                )

                # check for context window overflow
                if state.output.stop_reason == "model_length":
                    state, handled = await _handle_overflow(state, overflow)
                    if handled:
                        continue
                    else:
                        break

                # check for content filter (model refusal) -- allow a few
                # chances to recover before breaking to avoid infinite loop
                if state.output.stop_reason == "content_filter":
                    consecutive_content_filter += 1
                    if consecutive_content_filter >= 3:
                        break
                else:
                    consecutive_content_filter = 0

                # resolve tool calls (if any)
                if state.output.message.tool_calls:
                    # call tool functions
                    messages, output = await execute_tools(
                        state.messages, tools, approval=approval
                    )
                    state.messages.extend(messages)
                    if output:
                        state.output = output

                # call the on_continue hook (if any)
                if on_continue:
                    do_continue = await _call_on_continue(on_continue, state)
                    if do_continue is True:
                        if not state.output.message.tool_calls:
                            state.messages.append(
                                ChatMessageUser(
                                    content=DEFAULT_CONTINUE_PROMPT_NO_SUBMIT
                                )
                            )
                    elif isinstance(do_continue, str):
                        state.messages.append(ChatMessageUser(content=do_continue))
                    elif isinstance(do_continue, AgentState):
                        state.messages = do_continue.messages
                        state.output = do_continue.output
                    else:
                        break
                elif not state.output.message.tool_calls:
                    break

            return state

    return _resolve_agent(execute, name, description)


def _prompt_to_system_message(
    prompt: str | AgentPrompt | None,
    tools: list[Tool | ToolDef | ToolSource],
    submit_tool: str | None,
) -> ChatMessage | None:
    prompt = AgentPrompt(prompt) if isinstance(prompt, str) else prompt
    if prompt:
        prompt_lines: list[str] = []
        if prompt.instructions:
            prompt_lines.append(prompt.instructions)
        if prompt.handoff_prompt and has_handoff(tools):
            prompt_lines.append(prompt.handoff_prompt)
        if prompt.assistant_prompt:
            if (
                submit_tool
                and ("{submit}" not in prompt.assistant_prompt)
                and prompt.submit_prompt
            ):
                assistant_prompt = f"{prompt.assistant_prompt}\n{prompt.submit_prompt.format(submit=submit_tool)}"
            else:
                assistant_prompt = prompt.assistant_prompt.format(
                    submit=submit_tool or "submit"
                )
            prompt_lines.append(assistant_prompt)
        prompt_content = "\n\n".join(prompt_lines)
        system_message: ChatMessage | None = ChatMessageSystem(content=prompt_content)
    else:
        system_message = None
    return system_message


def _resolve_overflow(
    truncation: Literal["auto", "disabled"] | MessageFilter,
) -> MessageFilter | None:
    # resolve overflow handling
    if truncation == "auto":
        overflow: MessageFilter | None = trim_messages
    elif truncation == "disabled":
        overflow = None
    else:
        overflow = truncation
    return overflow


async def _handle_overflow(
    state: AgentState, overflow: MessageFilter | None
) -> tuple[AgentState, bool]:
    from inspect_ai.log._transcript import transcript

    if overflow is not None:
        previous_messages = state.messages[:-1]
        state.messages = await overflow(previous_messages)
        if len(state.messages) < len(previous_messages):
            transcript().info(
                "Agent exceeded model context window, truncating messages and continuing."
            )
            return state, True

    # no overflow policy or overflow didn't reduce conversation length
    transcript().info("Agent terminated: model context window exceeded")
    return state, False


def _agent_compact(
    compaction: CompactionStrategy | None,
    prefix: list[ChatMessage],
    tools: Sequence[Tool | ToolDef | ToolSource] | None,
    model: str | Model | Agent | None,
) -> Compact | None:
    # create compact function
    if compaction is not None:
        return create_compaction(
            strategy=compaction,
            prefix=prefix,
            tools=tools,
            model=model if isinstance(model, str | Model | None) else None,
        )
    else:
        return None


async def _agent_generate(
    model: str | Model | Agent | None,
    state: AgentState,
    tools: Sequence[Tool | ToolDef | ToolSource],
    retry_refusals: int | None,
    compact: Compact | None,
) -> AgentState:
    # warn if we try to combine compaction with a custom agent
    if is_agent(model) and compact is not None:
        logger.warning(
            "react() agent: compaction has been enabled along with a custom agent as the model. Ignoring compaction strategy (the agent needs to handle compaction directly)."
        )

    # convert model to agent
    if isinstance(model, str | Model) or model is None:
        model = _model_generate(model, retry_refusals, compact)

    # resolve tools
    resolved_tools: list[Tool] = []
    for t in tools:
        if isinstance(t, ToolSource):
            resolved_tools.extend(await t.tools())
        elif isinstance(t, ToolDef):
            resolved_tools.append(t.as_tool())
        else:
            resolved_tools.append(t)

    # confirm we have a tools param
    agent_tool_info = parse_tool_info(model)
    if "tools" not in agent_tool_info.parameters.properties:
        raise ValueError(
            "Agent passed as model for react agent must have a tools parameter."
        )

    # call the agent
    return await model(state, resolved_tools)


def _model_generate(
    model: str | Model | None,
    retry_refusals: int | None,
    compact: Compact | None,
) -> Agent:
    async def generate(state: AgentState, tools: list[Tool]) -> AgentState:
        # optionally perform compaction on the input
        if compact is not None:
            input_messages, c_message = await compact.compact_input(state.messages)
            if c_message is not None:
                state.messages.append(c_message)
        else:
            input_messages = state.messages

        attempts = 0
        while True:
            # generate
            output = await get_model(model).generate(input_messages, tools)

            # if it's a refusal see if we should retry
            if output.stop_reason == "content_filter":
                if retry_refusals is not None and attempts < retry_refusals:
                    attempts += 1
                    continue

            # no retry, we are done
            state.output = output
            state.messages.append(state.output.message)

            # update the compaction baseline with the actual input token
            # count from the generate call (most accurate source of truth)
            if compact is not None:
                compact.record_output(output)

            break
        return state

    return generate


async def _call_on_continue(
    on_continue: AgentContinue, state: AgentState
) -> str | bool | AgentState:
    if not is_callable_coroutine(on_continue):
        raise ValueError("The on_continue function must be async.")
    return await on_continue(state)


def _resolve_agent(agent: Agent, name: str | None, description: str | None) -> Agent:
    if name is not None or description is not None:
        return agent_with(agent, name=name, description=description)
    else:
        return agent


def _remove_submit_tool(
    messages: list[ChatMessage], submit_name: str
) -> list[ChatMessage]:
    filtered: list[ChatMessage] = []
    for message in messages:
        # skip submit tool messages
        if isinstance(message, ChatMessageTool) and message.function == submit_name:
            continue

        # remove submit tool from assistant messages
        if isinstance(message, ChatMessageAssistant) and message.tool_calls:
            new_tools_calls = [
                tool_call
                for tool_call in message.tool_calls
                if tool_call.function != submit_name
            ]

            # If a submit tool call was removed, we need to update the message
            if len(new_tools_calls) < len(message.tool_calls):
                # Some models (OpenAI) don't like to see the reasoning
                # content item that led to the submit tool call, so we
                # remove the last reasoning item
                new_content: str | list[Content] = message.content
                if isinstance(new_content, list):
                    new_content = new_content.copy()
                    indices = [
                        i for i, x in enumerate(new_content) if x.type == "reasoning"
                    ]
                    if indices:
                        new_content.pop(indices[-1])

                # update w/ new tool calls and new content
                message = message.model_copy(
                    update=dict(
                        tool_calls=new_tools_calls,
                        content=new_content,
                    ),
                )

        # always append message
        filtered.append(message)

    return filtered
```

## `agent/_run.py`

```python
from copy import copy
from typing import Any, overload

from inspect_ai._util.registry import registry_unqualified_name
from inspect_ai.model._chat_message import ChatMessage, ChatMessageUser
from inspect_ai.util._limit import Limit, LimitExceededError, apply_limits
from inspect_ai.util._span import span

from ._agent import Agent, AgentState


@overload
async def run(
    agent: Agent,
    input: str | list[ChatMessage] | AgentState,
    limits: list[Limit],
    *,
    name: str | None = None,
    **agent_kwargs: Any,
) -> tuple[AgentState, LimitExceededError | None]: ...


@overload
async def run(
    agent: Agent,
    input: str | list[ChatMessage] | AgentState,
    limits: None = ...,
    *,
    name: str | None = None,
    **agent_kwargs: Any,
) -> AgentState: ...


async def run(
    agent: Agent,
    input: str | list[ChatMessage] | AgentState,
    limits: list[Limit] | None = None,
    *,
    name: str | None = None,
    **agent_kwargs: Any,
) -> AgentState | tuple[AgentState, LimitExceededError | None]:
    """Run an agent.

    The input messages(s) will be copied prior to running so are
    not modified in place.

    Args:
        agent: Agent to run.
        input: Agent input (string, list of messages, or an `AgentState`).
        limits: List of limits to apply to the agent. Should one of these limits be
            exceeded, the `LimitExceededError` is caught and returned.
        name: Optional display name for the transcript entry. If not provided, the
            agent's name as defined in the registry will be used.
        **agent_kwargs: Additional arguments to pass to agent.

    Returns:
        AgentState: Messages and generated output. This is all that is returned if no
            limits are supplied.
        LimitExceededError | None: If a non-empty limits list is supplied, a tuple is
            returned. If a limit was exceeded, the second value in the tuple is the
            exception instance. If no limit was exceeded, the second element is None.
    """
    # copy input so we don't mutate it in place
    input = copy(input)

    # resolve str
    if isinstance(input, str):
        input_messages: list[ChatMessage] = [
            ChatMessageUser(content=input, source="input")
        ]
    elif isinstance(input, list):
        input_messages = [
            message.model_copy(update=dict(source="input")) for message in input
        ]
    else:
        input_messages = [
            message.model_copy(update=dict(source="input"))
            for message in input.messages
        ]

    # create state
    state = AgentState(messages=input_messages)

    # run the agent with limits, catching errors which are a direct result of our limits
    with apply_limits(limits or [], catch_errors=True) as limit_scope:
        # run the agent
        agent_name = name or registry_unqualified_name(agent)
        async with span(name=agent_name, type="agent"):
            state = await agent(state, **agent_kwargs)
            if limits is None:
                return state
            else:
                return state, None

    # execution reaches this point iff one of "our" limits was exceeded
    if limits is not None:
        return state, limit_scope.limit_error
    else:
        return state
```

## `agent/_types.py`

```python
from typing import Awaitable, Callable, NamedTuple, TypeAlias

from inspect_ai.agent._agent import AgentState
from inspect_ai.scorer._metric import Score, ValueToFloat, value_to_float
from inspect_ai.tool._tool import Tool
from inspect_ai.tool._tool_def import ToolDef

DEFAULT_HANDOFF_PROMPT = """
You are part of a multi-agent system designed to make agent coordination and execution easy. Agents uses two primary abstraction: **Agents** and **Handoffs**. An agent encompasses instructions and tools and can hand off a conversation to another agent when appropriate. Handoffs are achieved by calling a handoff function,generally named `transfer_to_<agent_name>`. Transfers between agents are handled seamlessly in the background; do not mention or draw attention to these transfers in your conversation with the user.
"""


DEFAULT_ASSISTANT_PROMPT = """
You are a helpful assistant attempting to submit the best possible answer. You have several tools available to help with finding the answer. You will see the result of tool calls right after sending the message. If you need to perform multiple actions, you can always send more messages with additional tool calls. Do some reasoning before your actions, describing what tool calls you are going to use and how they fit into your plan.
"""

DEFAULT_SUBMIT_PROMPT = """
When you have completed the task and have an answer, call the {submit}() tool to report it.
"""


class AgentPrompt(NamedTuple):
    """Prompt for agent."""

    instructions: str | None = None
    """Agent-specific contextual instructions."""

    handoff_prompt: str | None = DEFAULT_HANDOFF_PROMPT
    """Prompt used when there are additional handoff agents active.
    Pass `None` for no additional handoff prompt."""

    assistant_prompt: str | None = DEFAULT_ASSISTANT_PROMPT
    """Prompt for assistant (covers tool use, CoT, etc.).
    Pass `None` for no additional assistant prompt."""

    submit_prompt: str | None = DEFAULT_SUBMIT_PROMPT
    """Prompt to tell the model about the submit tool.

    Pass `None` for no additional submit prompt.

    This prompt is not used if the `assistant_prompt` contains a
    {submit} placeholder.
    """


DEFAULT_CONTINUE_PROMPT = """
Please proceed to the next step using your best judgement. If you believe you have completed the task, please call the `{submit}()` tool with your final answer.
"""

DEFAULT_CONTINUE_PROMPT_NO_SUBMIT = """
Please proceed to the next step using your best judgement.
"""


AgentContinue: TypeAlias = Callable[[AgentState], Awaitable[bool | str | AgentState]]
"""Function called to determine whether the agent should continue.

Returns `True` to continue with a default continue message inserted,
return `False` to stop. Returns `str` to continue with an additional
custom user message inserted. Returns `AgentState` to continue with
the specified state.
"""


class AgentAttempts(NamedTuple):
    """Configure a react agent to make multiple attempts.

    Submissions are evaluated using the task's main scorer, with value of 1.0
    indicating a correct answer. Scorer values are converted to float (e.g.
    "C" becomes 1.0) using the standard value_to_float() function. Provide an
    alternate conversion scheme as required via `score_value`.
    """

    attempts: int = 1
    """Maximum number of attempts."""

    incorrect_message: str | Callable[[AgentState, list[Score]], Awaitable[str]] = (
        "Your submission was incorrect. Please proceed and attempt to find the correct answer."
    )
    """User message reply for an incorrect submission from the model. Alternatively,
    an async function which returns a message."""

    score_value: ValueToFloat = value_to_float()
    """Function used to extract float from scores (defaults to standard value_to_float())"""


class AgentSubmit(NamedTuple):
    """Configure the submit tool of a react agent."""

    name: str | None = None
    """Name for submit tool (defaults to 'submit')."""

    description: str | None = None
    """Description of submit tool (defaults to 'Submit an answer for evaluation')."""

    tool: Tool | ToolDef | None = None
    """Alternate implementation for submit tool.

    The tool can provide its `name` and `description` internally,
    or these values can be overriden by the `name` and `description`
    fields in `AgentSubmit`

    The tool should return the `answer` provided to it for scoring.
    """

    answer_only: bool = False
    """Set the completion to only the answer provided by the submit tool.

    By default, the answer is appended (with `answer_delimiter`) to whatever
    other content the model generated along with the call to `submit()`."""

    answer_delimiter: str = "\n\n"
    """Delimter used when appending submit tool answer to other content the model generated along with the call to `submit()`."""

    keep_in_messages: bool = False
    """Keep the submit tool call in the message history.

    Defaults to `False`, which results in calls to the `submit()` tool being
    removed from message history so that the model's response looks like a
    standard assistant message.

    This is particularly important for multi-agent systems where the presence
    of `submit()` calls in the history can cause coordinator agents to terminate
    early because they think they are done. You should therefore not set this to
    `True` if you are using `handoff()` in a multi-agent system.
    """
```

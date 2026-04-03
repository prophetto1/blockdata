# Python Bundle: `tool`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `70`

## Files

- `tool/__init__.py`
- `tool/_mcp/__init__.py`
- `tool/_mcp/_config.py`
- `tool/_mcp/_context.py`
- `tool/_mcp/_local.py`
- `tool/_mcp/_remote.py`
- `tool/_mcp/_sandbox.py`
- `tool/_mcp/_tools_bridge/__init__.py`
- `tool/_mcp/_tools_bridge/bridge.py`
- `tool/_mcp/_types.py`
- `tool/_mcp/connection.py`
- `tool/_mcp/sampling.py`
- `tool/_mcp/server.py`
- `tool/_mcp/tools.py`
- `tool/_sandbox_tools_utils/__init__.py`
- `tool/_sandbox_tools_utils/_build_bundled_executable.py`
- `tool/_sandbox_tools_utils/_build_config.py`
- `tool/_sandbox_tools_utils/_error_mapper.py`
- `tool/_sandbox_tools_utils/_legacy_helpers.py`
- `tool/_sandbox_tools_utils/build_executable.py`
- `tool/_sandbox_tools_utils/build_within_container.py`
- `tool/_sandbox_tools_utils/sandbox.py`
- `tool/_sandbox_tools_utils/upload_to_s3.py`
- `tool/_sandbox_tools_utils/validate_distros.py`
- `tool/_tool.py`
- `tool/_tool_call.py`
- `tool/_tool_choice.py`
- `tool/_tool_def.py`
- `tool/_tool_description.py`
- `tool/_tool_info.py`
- `tool/_tool_params.py`
- `tool/_tool_transcript.py`
- `tool/_tool_util.py`
- `tool/_tool_with.py`
- `tool/_tools/__init__.py`
- `tool/_tools/_bash_session.py`
- `tool/_tools/_code_execution.py`
- `tool/_tools/_computer/__init__.py`
- `tool/_tools/_computer/_common.py`
- `tool/_tools/_computer/_computer.py`
- `tool/_tools/_computer/_resources/test_args.py`
- `tool/_tools/_computer/_resources/tool/__init__.py`
- `tool/_tools/_computer/_resources/tool/_args.py`
- `tool/_tools/_computer/_resources/tool/_constants.py`
- `tool/_tools/_computer/_resources/tool/_logger.py`
- `tool/_tools/_computer/_resources/tool/_run.py`
- `tool/_tools/_computer/_resources/tool/_tool_result.py`
- `tool/_tools/_computer/_resources/tool/_x11_client.py`
- `tool/_tools/_computer/_resources/tool/computer_tool.py`
- `tool/_tools/_execute.py`
- `tool/_tools/_memory.py`
- `tool/_tools/_skill/__init__.py`
- `tool/_tools/_skill/install.py`
- `tool/_tools/_skill/read.py`
- `tool/_tools/_skill/tool.py`
- `tool/_tools/_skill/types.py`
- `tool/_tools/_text_editor.py`
- `tool/_tools/_think.py`
- `tool/_tools/_update_plan.py`
- `tool/_tools/_web_browser/__init__.py`
- `tool/_tools/_web_browser/_back_compat.py`
- `tool/_tools/_web_browser/_web_browser.py`
- `tool/_tools/_web_search/__init__.py`
- `tool/_tools/_web_search/_base_http_provider.py`
- `tool/_tools/_web_search/_exa.py`
- `tool/_tools/_web_search/_google.py`
- `tool/_tools/_web_search/_tavily.py`
- `tool/_tools/_web_search/_web_search.py`
- `tool/_tools/_web_search/_web_search_provider.py`
- `tool/beta.py`

## `tool/__init__.py`

```python
from inspect_ai._util.citation import (
    Citation,
    CitationBase,
    ContentCitation,
    DocumentCitation,
    UrlCitation,
)
from inspect_ai._util.content import (
    Content,
    ContentAudio,
    ContentData,
    ContentDocument,
    ContentImage,
    ContentReasoning,
    ContentText,
    ContentToolUse,
    ContentVideo,
)
from inspect_ai._util.deprecation import relocated_module_attribute

from ._mcp import (
    MCPServer,
    MCPServerConfig,
    MCPServerConfigHTTP,
    MCPServerConfigStdio,
    mcp_connection,
    mcp_server_http,
    mcp_server_sandbox,
    mcp_server_sse,
    mcp_server_stdio,
    mcp_tools,
)
from ._tool import Tool, ToolError, ToolResult, ToolSource, tool
from ._tool_call import (
    ToolCall,
    ToolCallContent,
    ToolCallError,
    ToolCallModelInput,
    ToolCallView,
    ToolCallViewer,
)
from ._tool_choice import ToolChoice, ToolFunction
from ._tool_def import ToolDef
from ._tool_info import ToolInfo
from ._tool_params import ToolParam, ToolParams
from ._tool_with import tool_with
from ._tools._bash_session import bash_session
from ._tools._code_execution import CodeExecutionProviders, code_execution
from ._tools._computer import computer
from ._tools._execute import bash, python
from ._tools._memory import memory
from ._tools._skill import Skill, SkillInfo, install_skills, read_skills, skill
from ._tools._text_editor import text_editor
from ._tools._think import think
from ._tools._update_plan import update_plan
from ._tools._web_browser import web_browser
from ._tools._web_search import WebSearchProviders, web_search

__all__ = [
    "bash",
    "bash_session",
    "code_execution",
    "CodeExecutionProviders",
    "computer",
    "memory",
    "python",
    "web_browser",
    "web_search",
    "WebSearchProviders",
    "think",
    "update_plan",
    "text_editor",
    "tool",
    "tool_with",
    "Tool",
    "ToolCallError",
    "ToolError",
    "ToolResult",
    "ToolSource",
    "mcp_tools",
    "mcp_connection",
    "mcp_server_stdio",
    "mcp_server_sse",
    "mcp_server_http",
    "mcp_server_sandbox",
    "MCPServer",
    "MCPServerConfig",
    "MCPServerConfigHTTP",
    "MCPServerConfigStdio",
    "Content",
    "ContentAudio",
    "ContentData",
    "ContentImage",
    "ContentReasoning",
    "ContentText",
    "ContentVideo",
    "ContentDocument",
    "ContentToolUse",
    "ToolCall",
    "ToolCallContent",
    "ToolCallModelInput",
    "ToolCallView",
    "ToolCallViewer",
    "ToolChoice",
    "ToolDef",
    "ToolFunction",
    "ToolInfo",
    "ToolParam",
    "ToolParams",
    "Citation",
    "CitationBase",
    "DocumentCitation",
    "ContentCitation",
    "UrlCitation",
    "skill",
    "install_skills",
    "read_skills",
    "Skill",
    "SkillInfo",
]

_UTIL_MODULE_VERSION = "0.3.19"
_JSON_MODULE_VERSION = "0.3.73"
_REMOVED_IN = "0.4"

relocated_module_attribute(
    "JSONType",
    "inspect_ai.util.JSONType",
    _JSON_MODULE_VERSION,
    _REMOVED_IN,
)

relocated_module_attribute(
    "ToolEnvironment",
    "inspect_ai.util.SandboxEnvironment",
    _UTIL_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ToolEnvironments",
    "inspect_ai.util.SandboxEnvironments",
    _UTIL_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ToolEnvironmentSpec",
    "inspect_ai.util.SandboxEnvironmentSpec",
    _UTIL_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "tool_environment",
    "inspect_ai.util.sandbox",
    _UTIL_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "toolenv", "inspect_ai.util.sandboxenv", _UTIL_MODULE_VERSION, _REMOVED_IN
)
relocated_module_attribute(
    "web_browser_tools",
    "inspect_ai.tool.web_browser",
    "0.3.19",
    _REMOVED_IN,
)
```

## `tool/_mcp/__init__.py`

```python
from ._config import MCPServerConfig, MCPServerConfigHTTP, MCPServerConfigStdio
from ._types import MCPServer
from .connection import mcp_connection
from .server import (
    mcp_server_http,
    mcp_server_sandbox,
    mcp_server_sse,
    mcp_server_stdio,
)
from .tools import mcp_tools

__all__ = [
    "mcp_tools",
    "mcp_server_stdio",
    "mcp_server_sse",
    "mcp_server_sandbox",
    "mcp_server_http",
    "mcp_connection",
    "MCPServer",
    "MCPServerConfig",
    "MCPServerConfigStdio",
    "MCPServerConfigHTTP",
]
```

## `tool/_mcp/_config.py`

```python
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MCPServerConfig(BaseModel):
    """Configuration for MCP server."""

    model_config = ConfigDict(frozen=True)

    type: Literal["stdio", "http", "sse"]
    """Server type."""

    name: str
    """Human readable server name."""

    tools: Literal["all"] | list[str] = Field(default="all")
    """Tools to make available from server ("all" for all tools)."""


class MCPServerConfigStdio(MCPServerConfig):
    """Configuration for MCP servers with stdio interface."""

    type: Literal["stdio"] = Field(default="stdio")
    """Server type."""

    command: str
    """The executable to run to start the server."""

    args: list[str] = Field(default_factory=list)
    """Command line arguments to pass to the executable."""

    cwd: str | Path | None = Field(default=None)
    """The working directory to use when spawning the process."""

    env: dict[str, str] | None = Field(default=None)
    """The environment to use when spawning the process in addition to the platform specific set of default environment variables (e.g. "HOME", "LOGNAME", "PATH","SHELL", "TERM", and "USER" for Posix-based systems)"""


class MCPServerConfigHTTP(MCPServerConfig):
    """Conifguration for MCP servers with HTTP interface."""

    type: Literal["http", "sse"]
    """Server type."""

    url: str
    """URL for remote server."""

    headers: dict[str, str] | None = Field(default=None)
    """Headers for remote server (type "http" or "sse")"""

    @property
    def authorization_token(self) -> str | None:
        if self.headers and "Authorization" in self.headers:
            authorization = str(self.headers["Authorization"])
            authorization = (
                authorization[7:]
                if authorization.upper().startswith("BEARER ")
                else authorization
            )
            return authorization
        else:
            return None
```

## `tool/_mcp/_context.py`

```python
from contextlib import _AsyncGeneratorContextManager
from typing import Callable, TypeAlias

from anyio.streams.memory import MemoryObjectReceiveStream, MemoryObjectSendStream
from mcp.shared.message import SessionMessage

MCPServerContext: TypeAlias = _AsyncGeneratorContextManager[
    tuple[
        MemoryObjectReceiveStream[SessionMessage | Exception],
        MemoryObjectSendStream[SessionMessage],
        Callable[[], str | None],
    ],
]
```

## `tool/_mcp/_local.py`

```python
import contextlib
import sys
from contextlib import AsyncExitStack
from logging import getLogger
from pathlib import Path
from types import TracebackType
from typing import Any, AsyncIterator, Callable

import anyio
from mcp import McpError
from mcp.client.session import ClientSession, SamplingFnT
from mcp.client.sse import sse_client
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.streamable_http import streamablehttp_client
from mcp.types import (
    AudioContent,
    EmbeddedResource,
    ImageContent,
    ResourceLink,
    TextContent,
    TextResourceContents,
)
from mcp.types import Tool as MCPTool
from typing_extensions import override

from inspect_ai._util._json_rpc import (
    JSONRPCErrorMapper,
    JSONRPCParamsType,
    exception_for_rpc_response_error,
)
from inspect_ai._util.format import format_function_call
from inspect_ai._util.trace import trace_action
from inspect_ai.tool._tool import Tool, ToolError, ToolParsingError, ToolResult
from inspect_ai.tool._tool_def import ToolDef
from inspect_ai.tool._tool_params import ToolParams

from ._context import MCPServerContext
from ._sandbox import sandbox_client
from ._types import MCPServer
from .sampling import as_inspect_content_list, sampling_fn

logger = getLogger(__name__)


class _McpErrorMapper(JSONRPCErrorMapper):
    """Error mapper for MCP server JSON-RPC errors.

    MCP servers are opaque — we don't know what server-defined error codes they
    might use, so all errors are mapped to ToolError/ToolParsingError so they
    are fed back to the model rather than crashing the eval.

    This preserves the behavior from when the MCP path called
    exception_for_rpc_response_error with server_error_mapper=None.

    TODO: Consider whether MCP can share SandboxToolsErrorMapper instead.
    """

    @staticmethod
    def server_error(
        code: int, message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        del code, method, params
        return ToolError(message)

    @staticmethod
    def invalid_params(
        message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        del method, params
        return ToolParsingError(message)

    @staticmethod
    def internal_error(
        message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        del method, params
        return ToolError(message)


class MCPServerLocal(MCPServer):
    def __init__(
        self,
        client: Callable[[], MCPServerContext],
        *,
        name: str,
        events: bool,
    ) -> None:
        super().__init__()
        self._client = client
        self._name = name
        self._events = events

    @override
    async def __aenter__(self) -> MCPServer:
        return await self._task_session().__aenter__()

    @override
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        await self._task_session().__aexit__(exc_type, exc_val, exc_tb)

    @override
    async def tools(self) -> list[Tool]:
        return await self._task_session().tools()

    # create a separate MCPServer session per async task / server name
    _task_sessions: dict[str, "MCPServerLocalSession"] = {}

    def _task_session(self) -> "MCPServerLocalSession":
        task_id = anyio.get_current_task().id
        session_key = f"{task_id}_{self._name}"
        if session_key not in self._task_sessions:
            MCPServerLocal._task_sessions[session_key] = MCPServerLocalSession(
                self._client, name=self._name, events=self._events
            )
        return MCPServerLocal._task_sessions[session_key]


class MCPServerLocalSession(MCPServer):
    def __init__(
        self,
        client: Callable[[], MCPServerContext],
        *,
        name: str,
        events: bool,
    ) -> None:
        super().__init__()
        self._refcount = 0
        self._client = client
        self._name = name
        self._events = events
        self._session: ClientSession | None = None
        self._exit_stack: AsyncExitStack | None = None
        self._cached_tool_list: list[MCPTool] | None = None

    @override
    async def __aenter__(self) -> MCPServer:
        if self._session is not None:
            assert self._refcount > 0
            self._refcount = self._refcount + 1
        else:
            assert self._refcount == 0
            self._exit_stack = AsyncExitStack()
            await self._exit_stack.__aenter__()
            with trace_action(logger, "MCPServer", f"create client ({self._name})"):
                read, write, *_ = await self._exit_stack.enter_async_context(
                    self._client()
                )
            with trace_action(logger, "MCPServer", f"create session ({self._name})"):
                self._session = await self._exit_stack.enter_async_context(
                    ClientSession(read, write, sampling_callback=self._sampling_fn())
                )
            with trace_action(
                logger, "MCPServer", f"initialize session ({self._name})"
            ):
                await self._session.initialize()
            self._refcount = 1

        return self

    @override
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        assert self._refcount > 0
        self._refcount = self._refcount - 1
        if self._refcount == 0:
            with trace_action(logger, "MCPServer", f"disconnect ({self._name})"):
                assert self._session is not None
                assert self._exit_stack is not None
                try:
                    await self._exit_stack.aclose()
                finally:
                    self._session = None
                    self._exit_stack = None

    @override
    async def tools(self) -> list[Tool]:
        if self._cached_tool_list:
            mcp_tools = self._cached_tool_list
        else:
            async with self._client_session() as session:
                # get the underlying tools on the server
                with trace_action(logger, "MCPServer", f"list_tools {self._name}"):
                    mcp_tools = (await session.list_tools()).tools
                self._cached_tool_list = mcp_tools

        return [
            self._tool_def_from_mcp_tool(mcp_tool).as_tool() for mcp_tool in mcp_tools
        ]

    def _tool_def_from_mcp_tool(self, mcp_tool: MCPTool) -> ToolDef:
        async def execute(**kwargs: Any) -> ToolResult:
            async with self._client_session() as tool_session:
                mcp_call = format_function_call(
                    mcp_tool.name, kwargs, width=sys.maxsize
                )
                with trace_action(
                    logger, "MCPServer", f"call_tool ({self._name}): {mcp_call}"
                ):
                    try:
                        result = await tool_session.call_tool(mcp_tool.name, kwargs)
                        if result.isError:
                            raise ToolError(tool_result_as_text(result.content))
                    except McpError as e:
                        # Some errors that are raised via McpError (e.g. -32603)
                        # need to be converted to ToolError so that they make it
                        # back to the model.
                        raise exception_for_rpc_response_error(
                            e.error.code,
                            e.error.message,
                            mcp_tool.name,
                            kwargs,
                            error_mapper=_McpErrorMapper,
                        ) from e

                return as_inspect_content_list(result.content)  # type: ignore[return-value,arg-type]

        # get parameters (fill in missing ones)
        parameters = ToolParams.model_validate(mcp_tool.inputSchema)
        for name, param in parameters.properties.items():
            param.description = param.description or name

        return ToolDef(
            execute,
            name=mcp_tool.name,
            description=mcp_tool.description,
            parameters=parameters,
        )

    # if we have been entered as a context manager then return that session,
    # otherwise, create a brand new session from the client
    @contextlib.asynccontextmanager
    async def _client_session(self) -> AsyncIterator[ClientSession]:
        # if _connect has been previously called and we still have the connection
        # to the session, we can just return nit
        if self._session is not None:
            yield self._session

        # otherwise, create a new session and yield it (it will be cleaned up
        # when the context manager exits)
        else:
            async with AsyncExitStack() as exit_stack:
                with trace_action(logger, "MCPServer", f"create client ({self._name})"):
                    read, write, *_ = await exit_stack.enter_async_context(
                        self._client()
                    )
                with trace_action(
                    logger, "MCPServer", f"create session ({self._name})"
                ):
                    session = await exit_stack.enter_async_context(
                        ClientSession(
                            read, write, sampling_callback=self._sampling_fn()
                        )
                    )
                with trace_action(
                    logger, "MCPServer", f"initialize session ({self._name})"
                ):
                    await session.initialize()
                yield session

    def _sampling_fn(self) -> SamplingFnT | None:
        from inspect_ai.model._model import active_model

        if self._events and active_model() is not None:
            return sampling_fn
        else:
            return None


def create_server_sse(
    *,
    name: str,
    url: str,
    headers: dict[str, str] | None = None,
    timeout: float = 5,
    sse_read_timeout: float = 60 * 5,
) -> MCPServer:
    return MCPServerLocal(
        lambda: sse_client(url, headers, timeout, sse_read_timeout),
        name=name,
        events=True,
    )


def create_server_streamablehttp(
    *,
    name: str,
    url: str,
    headers: dict[str, str] | None = None,
    timeout: float = 5,
    sse_read_timeout: float = 60 * 5,
) -> MCPServer:
    return MCPServerLocal(
        lambda: streamablehttp_client(url, headers, timeout, sse_read_timeout),
        name=url,
        events=True,
    )


def create_server_stdio(
    *,
    name: str,
    command: str,
    args: list[str] | None = None,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
) -> MCPServer:
    return MCPServerLocal(
        lambda: stdio_client(
            StdioServerParameters(
                command=command,
                args=args if args is not None else [],
                cwd=cwd,
                env=env,
            )
        ),
        name=name,
        events=True,
    )


def create_server_sandbox(
    *,
    name: str,
    command: str,
    args: list[str] | None = None,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
    sandbox: str | None = None,
    timeout: int | None = None,
) -> MCPServer:
    # TODO: Confirm the lifetime concepts. By the time a request makes it to the
    # sandbox, it's going to need both a session id and a server "name".
    return MCPServerLocal(
        lambda: sandbox_client(
            StdioServerParameters(
                command=command,
                args=args if args is not None else [],
                cwd=cwd,
                env=env,
            ),
            sandbox_name=sandbox,
            timeout=timeout,
        ),
        name=name,
        events=False,
    )


def tool_result_as_text(
    content: list[
        TextContent | ImageContent | AudioContent | ResourceLink | EmbeddedResource
    ],
) -> str:
    content_list: list[str] = []
    for c in content:
        if isinstance(c, TextContent):
            content_list.append(c.text)
        elif isinstance(c, ImageContent):
            content_list.append("(base64 encoded image omitted)")
        elif isinstance(c, AudioContent):
            content_list.append("(base64 encoded audio omitted)")
        elif isinstance(c, ResourceLink):
            content_list.append(f"{c.description} ({c.uri})")
        elif isinstance(c.resource, TextResourceContents):
            content_list.append(c.resource.text)

    return "\n\n".join(content_list)
```

## `tool/_mcp/_remote.py`

```python
from types import TracebackType

from typing_extensions import override

from inspect_ai.tool._tool_def import ToolDef
from inspect_ai.tool._tool_info import ToolInfo

from .._tool import Tool, ToolResult
from ._config import MCPServerConfigHTTP
from ._types import MCPServer


class MCPServerRemote(MCPServer):
    def __init__(self, config: MCPServerConfigHTTP) -> None:
        self._config = config

    @override
    async def tools(self) -> list[Tool]:
        return [mcp_server_tool(self._config)]

    # no-op async context manager as we don't manage resources
    @override
    async def __aenter__(self) -> MCPServer:
        return self

    @override
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        pass


def mcp_server_tool(config: MCPServerConfigHTTP) -> Tool:
    async def execute() -> ToolResult:
        raise RuntimeError("MCPServerTool should not be called directly")

    name = f"mcp_server_{config.name}"

    return ToolDef(
        execute,
        name=name,
        description=name,
        options=config.model_dump(),
    ).as_tool()


def is_mcp_server_tool(tool: ToolInfo) -> bool:
    return tool.name.startswith("mcp_server_") and tool.options is not None
```

## `tool/_mcp/_sandbox.py`

```python
import sys
from contextlib import asynccontextmanager
from typing import TextIO

import anyio
from anyio.streams.memory import MemoryObjectReceiveStream, MemoryObjectSendStream
from mcp import JSONRPCRequest, StdioServerParameters
from mcp.shared.message import SessionMessage
from mcp.types import JSONRPCMessage, JSONRPCNotification

from inspect_ai._util._json_rpc import (
    exec_model_request,
    exec_notification,
    exec_scalar_request,
)
from inspect_ai.tool._sandbox_tools_utils._error_mapper import (
    SandboxToolsErrorMapper,
)
from inspect_ai.tool._sandbox_tools_utils.sandbox import sandbox_with_injected_tools
from inspect_ai.util._sandbox._cli import SANDBOX_CLI
from inspect_ai.util._sandbox._json_rpc_transport import SandboxJSONRPCTransport

from ._context import MCPServerContext


# Pardon the type: ignore's here. This code is a modified clone of Anthropic code
# for stdio_client. In their case, they don't provide a type hint for the return
# value. We suspect that if they did, they'd encounter the same issues we're
# suppressing. Nevertheless, we're confident that the runtime behavior of the
# code is what we want, and that the errors are purely in the type domain.
@asynccontextmanager  # type: ignore
async def sandbox_client(  # type: ignore
    server: StdioServerParameters,
    *,
    sandbox_name: str | None = None,
    errlog: TextIO = sys.stderr,
    timeout: int | None = None,  # default 180 seconds
) -> MCPServerContext:  # type: ignore
    timeout = timeout or 180
    sandbox_environment = await sandbox_with_injected_tools(sandbox_name=sandbox_name)

    # Create transport for all RPC calls
    transport = SandboxJSONRPCTransport(sandbox_environment, SANDBOX_CLI)

    # read_stream is remote process's stdout
    read_stream: MemoryObjectReceiveStream[SessionMessage | Exception]
    read_stream_writer: MemoryObjectSendStream[SessionMessage | Exception]

    # write_stream is remote process's stdin
    write_stream: MemoryObjectSendStream[SessionMessage]
    write_stream_reader: MemoryObjectReceiveStream[SessionMessage]

    read_stream_writer, read_stream = anyio.create_memory_object_stream(0)
    write_stream, write_stream_reader = anyio.create_memory_object_stream(0)

    session_id = await exec_scalar_request(
        method="mcp_launch_server",
        params={"server_params": server.model_dump()},
        result_type=int,
        transport=transport,
        error_mapper=SandboxToolsErrorMapper,
        timeout=timeout,
    )

    async def stdout_reader() -> None:
        # This is NYI until we support unsolicited messages from the sandbox
        # back to the client
        pass

    async def stdin_writer() -> None:
        try:
            async with write_stream_reader:
                # This reads messages until the stream is closed
                async for message in write_stream_reader:
                    root = message.message.root
                    if isinstance(root, JSONRPCRequest):
                        await read_stream_writer.send(
                            SessionMessage(
                                message=await exec_model_request(
                                    method="mcp_send_request",
                                    params={
                                        "session_id": session_id,
                                        "request": root.model_dump(),
                                    },
                                    result_type=JSONRPCMessage,
                                    transport=transport,
                                    error_mapper=SandboxToolsErrorMapper,
                                    timeout=timeout,
                                )
                            )
                        )
                    elif isinstance(root, JSONRPCNotification):
                        await exec_notification(
                            method="mcp_send_notification",
                            params={
                                "session_id": session_id,
                                "notification": root.model_dump(),
                            },
                            transport=transport,
                            timeout=timeout,
                        )
                    else:
                        assert False, f"Unexpected message type {message=}"

        except anyio.ClosedResourceError:
            await anyio.lowlevel.checkpoint()

    async with anyio.create_task_group() as tg:
        tg.start_soon(stdout_reader)
        tg.start_soon(stdin_writer)

        try:
            yield read_stream, write_stream
        finally:
            await exec_scalar_request(
                method="mcp_kill_server",
                params={"session_id": session_id},
                result_type=type(None),
                transport=transport,
                error_mapper=SandboxToolsErrorMapper,
                timeout=timeout,
            )
```

## `tool/_mcp/_tools_bridge/__init__.py`

```python
"""MCP tools bridge for exposing host-side tools to sandboxed agents."""

from .bridge import BridgedToolsSpec

__all__ = ["BridgedToolsSpec"]
```

## `tool/_mcp/_tools_bridge/bridge.py`

```python
"""Bridge for exposing host-side tools via MCP in sandbox."""

from collections.abc import Sequence
from dataclasses import dataclass

from inspect_ai.tool import Tool


@dataclass
class BridgedToolsSpec:
    """Specification for host-side tools to expose via MCP bridge.

    This allows Inspect tools defined on the host to be exposed to agents
    running inside a sandbox via MCP.

    Example:
        ```python
        from inspect_ai.tool import tool
        from inspect_ai.agent import BridgedToolsSpec, sandbox_agent_bridge

        @tool
        def my_tool():
            async def execute(query: str) -> str:
                \"\"\"Search database.\"\"\"
                return f"Results for: {query}"
            return execute

        async with sandbox_agent_bridge(
            bridged_tools=[BridgedToolsSpec(name="my_tools", tools=[my_tool()])]
        ) as bridge:
            # bridge.mcp_server_configs contains resolved MCPServerConfigHTTP
            pass
        ```
    """

    name: str
    """Name of the MCP server (visible to agent as mcp__{name}_*)."""

    tools: Sequence[Tool]
    """Inspect Tool objects to expose via MCP."""
```

## `tool/_mcp/_types.py`

```python
import abc
from contextlib import AbstractAsyncContextManager
from logging import getLogger

from .._tool import Tool, ToolSource

logger = getLogger(__name__)


class MCPServer(ToolSource, AbstractAsyncContextManager["MCPServer"]):
    """Model Context Protocol server interface.

    `MCPServer` can be passed in the `tools` argument as a source of tools
    (use the `mcp_tools()` function to filter the list of tools)
    """

    @abc.abstractmethod
    async def tools(self) -> list[Tool]:
        """List of all tools provided by this server"""
        ...
```

## `tool/_mcp/connection.py`

```python
import contextlib
from typing import AsyncIterator, Sequence

from .._tool import Tool, ToolSource
from .._tool_def import ToolDef
from ._types import MCPServer
from .tools import MCPToolSourceLocal


@contextlib.asynccontextmanager
async def mcp_connection(
    tools: Sequence[Tool | ToolDef | ToolSource] | ToolSource,
) -> AsyncIterator[None]:
    """Context manager for running MCP servers required by tools.

    Any `ToolSource` passed in tools will be examined to see
    if it references an MCPServer, and if so, that server will be
    connected to upon entering the context and disconnected from
    upon exiting the context.

    Args:
       tools: Tools in current context.
    """
    # discover mcp servers in tools
    tools = tools if isinstance(tools, Sequence) else [tools]
    tool_sources = [tool for tool in tools if isinstance(tool, ToolSource)]
    mcp_servers: list[MCPServer] = []
    for tool_source in tool_sources:
        if isinstance(tool_source, MCPServer):
            mcp_servers.append(tool_source)
        elif isinstance(tool_source, MCPToolSourceLocal):
            mcp_servers.append(tool_source._server)

    # enter connection contexts
    async with contextlib.AsyncExitStack() as exit_stack:
        for mcp_server in mcp_servers:
            await exit_stack.enter_async_context(mcp_server)

        # onward
        yield
```

## `tool/_mcp/sampling.py`

```python
from typing import Any, Literal, Sequence

from mcp.client.session import ClientSession
from mcp.shared.context import RequestContext
from mcp.types import (
    INTERNAL_ERROR,
    AudioContent,
    CreateMessageRequestParams,
    CreateMessageResult,
    EmbeddedResource,
    ErrorData,
    ImageContent,
    ResourceLink,
    SamplingMessageContentBlock,
    TextContent,
    TextResourceContents,
)
from mcp.types import (
    StopReason as MCPStopReason,
)

from inspect_ai._util.content import (
    Content,
    ContentAudio,
    ContentImage,
    ContentText,
)
from inspect_ai._util.error import exception_message
from inspect_ai._util.url import data_uri_mime_type, data_uri_to_base64


async def sampling_fn(
    context: RequestContext[ClientSession, Any],
    params: CreateMessageRequestParams,
) -> CreateMessageResult | ErrorData:
    from inspect_ai.model._chat_message import (
        ChatMessage,
        ChatMessageAssistant,
        ChatMessageSystem,
        ChatMessageUser,
    )
    from inspect_ai.model._generate_config import GenerateConfig
    from inspect_ai.model._model import get_model

    try:
        # build message list
        messages: list[ChatMessage] = []
        if params.systemPrompt:
            messages.append(ChatMessageSystem(content=params.systemPrompt))

        for message in params.messages:
            if message.role == "assistant":
                messages.append(
                    ChatMessageAssistant(
                        content=as_inspect_content_list(message.content)
                    )
                )
            elif message.role == "user":
                messages.append(
                    ChatMessageUser(content=as_inspect_content_list(message.content))
                )

        # sample w/ requested params
        output = await get_model().generate(
            messages,
            config=GenerateConfig(
                temperature=params.temperature,
                max_tokens=params.maxTokens,
                stop_seqs=params.stopSequences,
            ),
        )

        # convert stop reason
        stop_reason: MCPStopReason = (
            "maxTokens" if output.stop_reason == "max_tokens" else "endTurn"
        )

        # return first compatible content
        if isinstance(output.message.content, str):
            return CreateMessageResult(
                role="assistant",
                content=TextContent(type="text", text=output.message.content),
                model=output.model,
                stopReason=stop_reason,
            )
        else:
            for content in output.message.content:
                if isinstance(content, ContentText | ContentImage):
                    return CreateMessageResult(
                        role="assistant",
                        content=as_mcp_content(content),
                        model=output.model,
                        stopReason=stop_reason,
                    )

            # if we get this far then no valid content was returned
            return ErrorData(
                code=INTERNAL_ERROR, message="No text or image content was generated."
            )

    except Exception as ex:
        return ErrorData(code=INTERNAL_ERROR, message=exception_message(ex))


def as_inspect_content_list(
    content: SamplingMessageContentBlock | Sequence[SamplingMessageContentBlock],
) -> list[Content]:
    if isinstance(content, Sequence):
        return [as_inspect_content(c) for c in content]
    else:
        return [as_inspect_content(content)]


def as_inspect_content(
    content: SamplingMessageContentBlock,
) -> ContentText | ContentImage | ContentAudio:
    if isinstance(content, TextContent):
        return ContentText(text=content.text)
    elif isinstance(content, ImageContent):
        return ContentImage(image=f"data:{content.mimeType};base64,{content.data}")
    elif isinstance(content, AudioContent):
        return ContentAudio(
            audio=f"data:{content.mimeType};base64,{content.data}",
            format=_get_audio_format(content.mimeType),
        )
    elif isinstance(content, ResourceLink):
        return ContentText(text=f"{content.description} ({content.uri})")
    elif isinstance(content, EmbeddedResource) and isinstance(
        content.resource, TextResourceContents
    ):
        return ContentText(text=content.resource.text)
    # TODO:  ToolResultContent, ToolUseContent,
    else:
        raise ValueError(f"Unexpected content: {content}")


def as_mcp_content(content: ContentText | ContentImage) -> TextContent | ImageContent:
    if isinstance(content, ContentText):
        return TextContent(type="text", text=content.text)
    else:
        return ImageContent(
            type="image",
            mimeType=data_uri_mime_type(content.image) or "image/png",
            data=data_uri_to_base64(content.image),
        )


def _get_audio_format(mime_type: str) -> Literal["wav", "mp3"]:
    """Helper function to determine audio format from MIME type."""
    if mime_type in ("audio/wav", "audio/x-wav"):
        return "wav"
    elif mime_type == "audio/mpeg":
        return "mp3"
    else:
        raise ValueError(f"Unsupported audio mime type: {mime_type}")
```

## `tool/_mcp/server.py`

```python
from logging import getLogger
from pathlib import Path
from typing import Literal

from inspect_ai._util.error import pip_dependency_error
from inspect_ai._util.version import verify_required_version

from ._config import MCPServerConfigHTTP
from ._remote import MCPServerRemote
from ._types import MCPServer

logger = getLogger(__name__)


def mcp_server_sse(
    *,
    name: str | None = None,
    url: str,
    execution: Literal["local", "remote"] = "local",
    authorization: str | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 5,
    sse_read_timeout: float = 60 * 5,
) -> MCPServer:
    """MCP Server (SSE).

    SSE interface to MCP server.  Use this for MCP servers available via a URL endpoint.

    NOTE: The SEE interface has been [deprecated](https://mcp-framework.com/docs/Transports/sse/)
    in favor of `mcp_server_http()` for MCP servers at URL endpoints.

    Args:
        name: Human readable name for the server (defaults to `url` if not specified)
        url: URL to remote server
        execution: Where to execute tool call ("local" for within the Inspect process, "remote" for execution by the model provider -- note this is currently only supported by OpenAI and Anthropic).
        authorization: OAuth Bearer token for authentication with server.
        headers: Headers to send server (typically authorization is included here)
        timeout: Timeout for HTTP operations
        sse_read_timeout: How long (in seconds) the client will wait for a new
            event before disconnecting.

    Returns:
        McpClient: Client for MCP Server
    """
    verfify_mcp_package()
    from ._local import create_server_sse

    name = name or url
    headers = _resolve_headers(authorization, headers)

    if execution == "local":
        return create_server_sse(
            name=name,
            url=url,
            headers=headers,
            timeout=timeout,
            sse_read_timeout=sse_read_timeout,
        )
    elif execution == "remote":
        return MCPServerRemote(
            MCPServerConfigHTTP(type="sse", name=name, url=url, headers=headers)
        )
    else:
        raise ValueError(f"Unexpected execution type: {execution}")


def mcp_server_http(
    *,
    name: str | None = None,
    url: str,
    execution: Literal["local", "remote"] = "local",
    authorization: str | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 5,
    sse_read_timeout: float = 60 * 5,
) -> MCPServer:
    """MCP Server (SSE).

    HTTP interface to MCP server. Use this for MCP servers available via a URL endpoint.

    Args:
        name: Human readable name for the server (defaults to `url` if not specified)
        url: URL to remote server
        execution: Where to execute tool call ("local" for within the Inspect process, "remote" for execution by the model provider -- note this is currently only supported by OpenAI and Anthropic).
        authorization: OAuth Bearer token for authentication with server.
        headers: Headers to send server (typically authorization is included here)
        timeout: Timeout for HTTP operations
        sse_read_timeout: How long (in seconds) the client will wait for a new
            event before disconnecting.

    Returns:
        McpClient: Client for MCP Server
    """
    verfify_mcp_package()
    from ._local import create_server_streamablehttp

    name = name or url
    headers = _resolve_headers(authorization, headers)

    if execution == "local":
        return create_server_streamablehttp(
            name=name,
            url=url,
            headers=headers,
            timeout=timeout,
            sse_read_timeout=sse_read_timeout,
        )
    elif execution == "remote":
        return MCPServerRemote(
            MCPServerConfigHTTP(type="http", name=name, url=url, headers=headers)
        )
    else:
        raise ValueError(f"Unexpected execution type: {execution}")


def mcp_server_stdio(
    *,
    name: str | None = None,
    command: str,
    args: list[str] | None = None,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
) -> MCPServer:
    """MCP Server (Stdio).

    Stdio interface to MCP server. Use this for MCP servers that run locally.

    Args:
        name: Human readable name for the server (defaults to `command` if not specified)
        command: The executable to run to start the server.
        args: Command line arguments to pass to the executable.
        env: The environment to use when spawning the process
            in addition to the platform specific set of default
            environment variables (e.g. "HOME", "LOGNAME", "PATH",
            "SHELL", "TERM", and "USER" for Posix-based systems).
        cwd: The working directory to use when spawning the process.

    Returns:
        McpClient: Client for MCP Server
    """
    verfify_mcp_package()
    from ._local import create_server_stdio

    return create_server_stdio(
        name=name or " ".join([command] + (args if args is not None else [])),
        command=command,
        args=args,
        cwd=cwd,
        env=env,
    )


def mcp_server_sandbox(
    *,
    name: str | None = None,
    command: str,
    args: list[str] | None = None,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
    sandbox: str | None = None,
    timeout: int | None = None,
) -> MCPServer:
    """MCP Server (Sandbox).

    Interface to MCP server running in an Inspect sandbox.

    Args:
        name: Human readable name for server (defaults to `command` with args if not specified).
        command: The executable to run to start the server.
        args: Command line arguments to pass to the executable.
        env: The environment to use when spawning the process
            in addition to the platform specific set of default
            environment variables (e.g. "HOME", "LOGNAME", "PATH",
            "SHELL", "TERM", and "USER" for Posix-based systems).
        cwd: The working directory to use when spawning the process.
        sandbox: The sandbox to use when spawning the process.
        timeout: Timeout (in seconds) for command.

    Returns:
        McpClient: Client for MCP Server
    """
    verfify_mcp_package()
    from ._local import create_server_sandbox

    return create_server_sandbox(
        name=name or " ".join([command] + (args if args is not None else [])),
        command=command,
        args=args,
        cwd=cwd,
        env=env,
        sandbox=sandbox,
        timeout=timeout,
    )


def verfify_mcp_package() -> None:
    FEATURE = "MCP tools"
    PACKAGE = "mcp"
    MIN_VERSION = "1.23.0"

    # verify we have the package
    try:
        import mcp  # noqa: F401
    except ImportError:
        raise pip_dependency_error(FEATURE, [PACKAGE])

    # verify version
    verify_required_version(FEATURE, PACKAGE, MIN_VERSION)


def _resolve_headers(
    authorization: str | None = None, headers: dict[str, str] | None = None
) -> dict[str, str] | None:
    if authorization is None and headers is None:
        return None
    if headers is None:
        headers = dict()
    if authorization is not None:
        headers["Authorization"] = f"Bearer {authorization}"
    return headers
```

## `tool/_mcp/tools.py`

```python
from fnmatch import fnmatch
from typing import Literal

from inspect_ai.tool._tool_def import ToolDef

from .._tool import Tool, ToolSource
from ._types import MCPServer


def mcp_tools(
    server: MCPServer,
    *,
    tools: Literal["all"] | list[str] = "all",
) -> ToolSource:
    """Tools from MCP server.

    Args:
       server: MCP server created with `mcp_server_stdio()`, `mcp_server_http()`,
          or `mcp_server_sandbox()`.
       tools: List of tool names (or globs) (defaults to "all")
          which returns all tools.

    Returns:
       ToolSource: Source for specified MCP server tools.
    """
    from ._local import MCPServerLocal
    from ._remote import MCPServerRemote

    if isinstance(server, MCPServerLocal):
        return MCPToolSourceLocal(server, tools)
    elif isinstance(server, MCPServerRemote):
        return MCPServerRemote(
            server._config.model_copy(update={"tools": tools}, deep=True)
        )
    else:
        raise TypeError(f"Unexpected MCPServer type: {type(server)}")


class MCPToolSourceLocal(ToolSource):
    def __init__(self, server: MCPServer, tools: Literal["all"] | list[str]) -> None:
        self._server = server
        self._tools = tools
        self._cached_tool_list: list[Tool] | None = None

    async def tools(self) -> list[Tool]:
        if self._cached_tool_list is None:
            # get the underlying tools
            mcp_tools = await self._server.tools()

            # filter them
            def include_tool(tool: Tool) -> bool:
                if self._tools == "all":
                    return True
                else:
                    return any([fnmatch(ToolDef(tool).name, t) for t in self._tools])

            self._cached_tool_list = [
                mcp_tool for mcp_tool in mcp_tools if include_tool(mcp_tool)
            ]
        return self._cached_tool_list
```

## `tool/_sandbox_tools_utils/__init__.py`

```python

```

## `tool/_sandbox_tools_utils/_build_bundled_executable.py`

```python
"""
Bundled executable builder

This module contains the core PyInstaller/StaticX build logic, separated from environment
setup and CLI concerns. It focuses purely on:
1. Building executables with PyInstaller
2. Applying StaticX for portability
3. Verifying the final build

This module has no knowledge of container structure, volume mounts, or repository
layout. It receives clean, simple parameters and produces a portable executable.
"""

import shutil
import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from inspect_ai.tool._sandbox_tools_utils._build_config import (
        SandboxToolsBuildConfig,
        filename_to_config,
    )
else:
    from _build_config import (
        SandboxToolsBuildConfig,
        filename_to_config,
    )


def build_bundled_executable(
    entrypoint: Path,
    output_path: Path,
    output_filename: str,
    no_staticx: bool,
    archive_viewer: bool,
) -> None:
    """
    Build a portable executable using PyInstaller.

    WORKFLOW:
    1. Verify PyInstaller is available
    2. Execute PyInstaller to bundle Python application and all dependencies
    3. Apply StaticX for maximum cross-distribution portability (unless requested not to)
    4. Verify the final executable and display compatibility information

    OUTPUT:
    A single executable file that contains:
    - Embedded Python interpreter
    - The Python application code
    - All required shared libraries and dependencies

    COMPATIBILITY:
    - Requires same or newer glibc version as build system (core glibc libraries are
      excluded to maintain ABI compatibility)
    - StaticX creates fully static executables for maximum portability across
      different Linux distributions

    Args:
        entrypoint: Path to the main Python script entry point
        output_path: Final path where the executable should be placed
        output_filename: Executable filename to derive build configuration from
        no_staticx: Whether to skip StaticX for faster builds
        archive_viewer: Whether to generate pyi-archive_viewer output for debugging.
            Creates a .txt file with the same name as the executable containing
            the full archive contents listing.

    Raises:
        RuntimeError: If PyInstaller fails or StaticX processing fails
        FileNotFoundError: If required tools (PyInstaller, StaticX) are not available
    """
    # Create build config from filename
    build_config: SandboxToolsBuildConfig = filename_to_config(output_filename)
    print(
        f"Configuration: arch={build_config.arch}, version={build_config.version}, suffix={build_config.suffix}"
    )

    # Verify PyInstaller is available
    _ensure_pyinstaller_available()

    # Build the executable with PyInstaller
    temp_output = _build_executable(entrypoint, output_path.name)

    # Generate pyi-archive_viewer output if requested
    if archive_viewer:
        archive_viewer_txt = _generate_archive_viewer_output(temp_output)
        # Copy the archive viewer output (.txt) to the output directory
        target_txt = output_path.with_suffix(".txt")
        if archive_viewer_txt.exists():
            shutil.copy2(str(archive_viewer_txt), str(target_txt))
            print(f"✅ Archive viewer output copied to: {target_txt}")
        else:
            print(f"⚠️ Archive viewer output not found: {archive_viewer_txt}")

    # Apply staticx for maximum portability (or just move if skipping)
    if not no_staticx:
        print("[5/5] Applying staticx for maximum portability...")
        _apply_staticx(temp_output, output_path)
    else:
        print("[5/5] Skipping staticx")
        if temp_output != output_path:
            shutil.move(str(temp_output), str(output_path))

    # Set executable permissions
    output_path.chmod(0o755)

    # Verify the build
    _verify_build(output_path, output_path.name, build_config)


def _ensure_pyinstaller_available() -> None:
    """Verify that PyInstaller is available in the current environment."""
    try:
        # Try to run PyInstaller as a module to check if it's available
        _run([sys.executable, "-m", "PyInstaller", "--version"])
    except RuntimeError as e:
        # Provide helpful error message with installation command
        raise RuntimeError(
            "PyInstaller not found in this Python environment. "
            f"Install it with:\n  {sys.executable} -m pip install pyinstaller"
        ) from e


def _build_executable(
    entrypoint: Path,
    executable_name: str,
) -> Path:
    """
    Execute PyInstaller to create the final executable.

    The resulting executable will self-extract to a temporary directory
    at runtime and set up the library paths appropriately.

    Args:
        extra_arguments: List of additional PyInstaller arguments (--add-binary, --exclude-module, etc.)
        entrypoint: Path to the main Python script
        executable_name: Name for the output executable
        custom_env: Optional dictionary of environment variables to use during build

    Returns:
        Path to the built executable
    """
    print("[4/4] Building PyInstaller onefile binary")

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",  # Single executable output
        "--noupx",  # Don't compress - prevents driver corruption
        # "--strip",  # REMOVED - can break node binary (consider re-enabling if issues are resolved)
        "--optimize",
        "2",
        "--hidden-import=psutil",
        "--copy-metadata=inspect_sandbox_tools",
        "--exclude-module",
        "tkinter",
        "--exclude-module",
        "test",
        "--exclude-module",
        "unittest",
        "--exclude-module",
        "pdb",
        "--name",
        executable_name,
    ] + [str(entrypoint)]

    print("# PyInstaller command:")
    print(" ".join(cmd))

    _run(cmd)

    # Return path to built executable
    return Path("dist") / executable_name


def _apply_staticx(input_path: Path, output_path: Path) -> None:
    """Apply StaticX to make the executable fully static."""
    # Use a temporary output path in the same directory as input to avoid cross-device issues
    temp_output = input_path.parent / f"{input_path.name}.staticx"

    _run(
        [
            "staticx",
            # "--strip",  # REMOVED - can break node binary (matches PyInstaller --strip removal)
            str(input_path),
            str(temp_output),
        ]
    )

    # Manually copy the result to the final destination
    shutil.copy2(temp_output, output_path)

    # Clean up temporary file
    temp_output.unlink()


def _verify_build(
    output_path: Path, executable_name: str, build_config: SandboxToolsBuildConfig
) -> None:
    """
    Verify the built executable and display build information.

    This matches build_executable.py's verification approach exactly.

    Args:
        output_path: Path to the final executable
        executable_name: Name of the executable
        build_config: Build configuration for architecture messaging
    """
    # Verify portability (matching build_executable.py lines 112-123)
    print("Verifying portability...")
    try:
        result = subprocess.run(
            ["ldd", str(output_path)], capture_output=True, text=True
        )
        if result.returncode != 0:
            print("✅ Fully static - maximum portability achieved")
        else:
            print(result.stdout)
    except FileNotFoundError:
        # ldd not available
        print("⚠️ ldd not available - portability could not be verified")

    # Show what we built (matching build_executable.py lines 125-127)
    try:
        subprocess.run(["ls", "-lh", str(output_path)], check=True)
        subprocess.run(["file", str(output_path)], check=True)
    except subprocess.CalledProcessError:
        # Commands might not be available in some environments
        pass

    # Final success messages (matching build_executable.py lines 129-130)
    print(f"✅ Portable executable ready: {executable_name}")

    # Architecture-specific compatibility message
    if build_config.arch == "arm64":
        print("This should run on any Linux ARM64/aarch64 system from ~2016 onwards")
    else:
        print("This should run on any Linux x86_64 system from ~2016 onwards")


def _generate_archive_viewer_output(output_path: Path) -> Path:
    """Generate a text file with pyi-archive_viewer output for debugging."""
    # Create the .txt file path with the same base name as the executable
    txt_path = output_path.with_suffix(".txt")

    print(f"Generating pyi-archive_viewer output: {txt_path.resolve()}")

    # Run pyi-archive_viewer and capture its output
    result = _run(["pyi-archive_viewer", "--list", "--recursive", str(output_path)])

    # Write the output to the .txt file
    txt_path.write_text(result)
    print(f"✅ Archive viewer output saved to: {txt_path}")

    return txt_path


def _run(
    cmd: list[str], cwd: Path | None = None, env: dict[str, str] | None = None
) -> str:
    """Run a subprocess command and return stdout."""
    # Stream output to console for user visibility, but still capture for return value
    try:
        result = subprocess.run(
            cmd, cwd=cwd, env=env, text=True, capture_output=True, check=True
        )
        # Print stdout and stderr to console so user sees the output
        if result.stdout:
            print(result.stdout, end="")
        if result.stderr:
            print(result.stderr, end="", file=sys.stderr)
        return result.stdout
    except subprocess.CalledProcessError as e:
        # Print captured output even when command fails
        if e.stdout:
            print(e.stdout, end="")
        if e.stderr:
            print(e.stderr, end="", file=sys.stderr)
        # Re-raise the exception to preserve error handling
        raise
```

## `tool/_sandbox_tools_utils/_build_config.py`

```python
import re
from typing import Literal

from pydantic import BaseModel

# Duplicated from inspect_ai.util._sandbox._cli — keep in sync.
# Cannot import it here because this module runs inside Docker build containers
# where inspect_ai is not installed.
SANDBOX_TOOLS_BASE_NAME = "inspect-sandbox-tools"


class SandboxToolsBuildConfig(BaseModel):
    arch: Literal["amd64", "arm64"]
    version: int
    suffix: Literal["dev"] | None


def filename_to_config(filename: str) -> SandboxToolsBuildConfig:
    """
    Parse a filename into strongly typed build configuration.

    Expected pattern: inspect-sandbox-tools-{arch}-v{version}[-{suffix}]
    Version is an ordinal integer (not semantic).
    """
    pattern = rf"^{SANDBOX_TOOLS_BASE_NAME}-(?P<arch>\w+)-v(?P<version>\d+)(?:-(?P<suffix>\w+))?$"
    match = re.match(pattern, filename)
    if not match:
        raise ValueError(f"Filename '{filename}' doesn't match expected pattern")

    return SandboxToolsBuildConfig.model_validate(
        {
            "arch": match.group("arch"),
            "version": int(match.group("version")),
            "suffix": match.group("suffix"),
        }
    )


def config_to_filename(config: SandboxToolsBuildConfig) -> str:
    """Convert strongly typed build configuration to filename."""
    base = f"{SANDBOX_TOOLS_BASE_NAME}-{config.arch}-v{config.version}"
    if config.suffix:
        base += f"-{config.suffix}"
    return base
```

## `tool/_sandbox_tools_utils/_error_mapper.py`

```python
"""Helper code for handling JSON-RPC communication between the inspect process and the injected tool code running in the sandbox environment."""

from inspect_ai._util._json_rpc import (
    JSONRPCErrorMapper,
    JSONRPCParamsType,
)
from inspect_ai.tool._tool import ToolError, ToolParsingError


class SandboxToolsErrorMapper(JSONRPCErrorMapper):
    """Error mapper for sandbox tool JSON-RPC error codes.

    Maps JSON-RPC errors to tool-layer exceptions so that errors are fed back
    to the model rather than crashing the eval.
    """

    @staticmethod
    def server_error(
        code: int, message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        """Map server-defined codes (-32000..-32099) to an exception."""
        del method, params
        match code:
            case -32099:  # ToolException from the container
                return ToolError(message)
            case -32098:  # Unexpected exception inside the container
                return RuntimeError(message)
            case _:
                return RuntimeError(message)

    @staticmethod
    def invalid_params(
        message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        del method, params
        return ToolParsingError(message)

    @staticmethod
    def internal_error(
        message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        del method, params
        return ToolError(message)
```

## `tool/_sandbox_tools_utils/_legacy_helpers.py`

```python
"""Legacy tool support system compatibility layer.

This module provides compatibility functions for interacting with the legacy
inspect_tool_support system, which temporarily handles web browser functionality
while the main inspect_sandbox_tools system handles all other tools (bash_session,
text_editor, MCP).

The legacy system uses Docker images built from Dockerfiles for deployment, while
the main system uses runtime executable injection. Both systems communicate via
JSON-RPC but have different deployment mechanisms and container requirements.

This module will be deprecated once the web browser functionality is fully
migrated to the PyInstaller-based executable injection approach.
"""

from textwrap import dedent

import semver

from inspect_ai._util._json_rpc import exec_scalar_request
from inspect_ai._util.error import PrerequisiteError
from inspect_ai.tool._sandbox_tools_utils._error_mapper import (
    SandboxToolsErrorMapper,
)
from inspect_ai.util._sandbox._json_rpc_transport import SandboxJSONRPCTransport
from inspect_ai.util._sandbox.context import sandbox_with
from inspect_ai.util._sandbox.environment import SandboxEnvironment

LEGACY_SANDBOX_CLI = "inspect-tool-support"
_INSPECT_TOOL_SUPPORT_IMAGE_DOCKERHUB = "aisiuk/inspect-tool-support"
_FIRST_PUBLISHED_VERSION = semver.Version.parse("0.1.6")


async def legacy_tool_support_sandbox(
    tool_name: str, *, sandbox_name: str | None = None
) -> tuple[SandboxEnvironment, semver.Version]:
    if sb := await sandbox_with(LEGACY_SANDBOX_CLI, True, name=sandbox_name):
        current_version = await _get_sandbox_tool_support_version(sb)
        return (sb, current_version)

    # This sort of programmatic sentence building will not cut it if we ever
    # support other languages.
    raise PrerequisiteError(
        dedent(f"""
            The {tool_name} service was not found in {"any of the sandboxes" if sandbox_name is None else f"the sandbox '{sandbox_name}'"} for this sample. Please add the {tool_name} to your configuration.

            For example, the following Docker compose file uses the {_INSPECT_TOOL_SUPPORT_IMAGE_DOCKERHUB} reference image as its default sandbox:

            services:
              default:
                image: "{_INSPECT_TOOL_SUPPORT_IMAGE_DOCKERHUB}"
                init: true

            Alternatively, you can include the service into your own Dockerfile:

            ENV PATH="$PATH:/opt/inspect_tool_support/bin"
            RUN python -m venv /opt/inspect_tool_support && \\
                /opt/inspect_tool_support/bin/pip install inspect-tool-support && \\
                /opt/inspect_tool_support/bin/inspect-tool-support post-install
            """).strip()
    )


async def _get_sandbox_tool_support_version(
    sandbox: SandboxEnvironment,
) -> semver.Version:
    try:
        return semver.Version.parse(
            await exec_scalar_request(
                method="version",
                params={},
                result_type=str,
                transport=SandboxJSONRPCTransport(sandbox, LEGACY_SANDBOX_CLI),
                error_mapper=SandboxToolsErrorMapper,
                timeout=5,
            )
        )
    except RuntimeError as rte:
        if "-32601" in str(rte):
            # The container doesn't even have a version method. The first version
            # published was 0.1.6, so we'll have to assume it was that old.
            return _FIRST_PUBLISHED_VERSION
        raise rte
```

## `tool/_sandbox_tools_utils/build_executable.py`

```python
#!/usr/bin/env python3
"""
PYINSTALLER BUILD SCRIPT FOR CONTAINER EXECUTION

This script runs inside Docker build containers to create portable executables for
the inspect_sandbox_tools package. It is typically launched by build_within_container.py
which sets up the container environment and mounts the repository.

EXECUTION CONTEXT:
- Runs inside PyInstaller-equipped Docker containers (linux/amd64 or linux/arm64)
- Repository is mounted at /inspect_ai via Docker volume mount
- Launched by build_within_container.py with appropriate arguments

RESPONSIBILITIES:
1. Parse command line arguments and build configuration
2. Copy source code to temporary directory to avoid mutating mounted repo
3. Install inspect_sandbox_tools package in container environment
4. Delegate PyInstaller executable creation to _build_bundled_executable module
5. Place final executable back into mounted binaries directory

BUILD WORKFLOW:
1. build_within_container.py creates Docker container with PyInstaller environment
2. Repository mounted at /inspect_ai, this script executed inside container
3. Source copied to /tmp/inspect_sandbox_tools-copy for safe building
4. Package installed via pip to ensure all dependencies available
5. PyInstaller creates single-file executable with StaticX for portability
6. Final executable placed at /inspect_ai/src/inspect_ai/binaries/<filename>

The volume mount ensures the built executable persists back to the host system.
"""

import argparse
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from inspect_ai.tool._sandbox_tools_utils._build_bundled_executable import (
        build_bundled_executable,
    )
else:
    from _build_bundled_executable import build_bundled_executable

# Directory where this build script is located
SCRIPT_DIR = Path(__file__).parent.resolve()

# Entry point for the tool support executable
ENTRY_POINT = "src/inspect_sandbox_tools/src/inspect_sandbox_tools/_cli/main.py"

# Temporary directory where collected libraries will be staged before bundling
BUILD_LIBS = SCRIPT_DIR / "build_libs"


@dataclass
class BuildArgs:
    """Strongly typed representation of command line arguments."""

    output_filename: str
    no_staticx: bool
    archive_viewer: bool


def main() -> None:
    """
    Main orchestration function that runs the complete build process.

    This function coordinates all steps in sequence:
    1. Parse command line arguments and build configuration
    2. Prepare build environment (copy source and install package)
    3. Delegate to the build module for PyInstaller execution

    The build module handles all PyInstaller-specific concerns including:
    - PyInstaller availability verification
    - Browser dependency staging (if enabled)
    - Executable creation with PyInstaller
    - StaticX application for maximum portability

    The result is a portable executable that includes everything needed
    to run on any compatible Linux system.
    """
    args = _parse_args()

    executable_name = args.output_filename
    print(f"\nBuilding portable executable for {executable_name}...\n")

    # Determine entry point (resolve relative to current working directory)
    entrypoint = Path(ENTRY_POINT)
    if not entrypoint.is_absolute():
        entrypoint = Path.cwd() / entrypoint
    entrypoint = entrypoint.resolve()  # Convert to absolute path

    print(f"Using entry point: {entrypoint}")

    # Determine output directory and path
    output_dir = Path("/inspect_ai/src/inspect_ai/binaries")

    output_path = output_dir / executable_name
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Output will be: {output_path}")

    _prepare_build_environment()

    build_bundled_executable(
        entrypoint=entrypoint,
        output_path=output_path,
        output_filename=args.output_filename,
        no_staticx=args.no_staticx,
        archive_viewer=args.archive_viewer,
    )


def _parse_args() -> BuildArgs:
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description="Build portable inspect-sandbox-tools executable"
    )
    parser.add_argument(
        "output_filename",
        help="Executable filename (e.g., 'inspect-sandbox-tools-amd64-v667-dev'),",
    )
    parser.add_argument(
        "--no-staticx",
        action="store_true",
        help="Skip staticx processing (reduces portability but faster build)",
    )
    parser.add_argument(
        "--archive-viewer",
        action="store_true",
        help="Generate pyi-archive_viewer output for debugging (creates .txt file with archive contents)",
    )

    args = parser.parse_args()

    # Convert the untyped Namespace to strongly typed BuildArgs
    return BuildArgs(
        output_filename=args.output_filename,
        no_staticx=args.no_staticx,
        archive_viewer=args.archive_viewer,
    )


def _prepare_build_environment() -> None:
    """
    Prepare the build environment by copying source and installing package.

    This matches the workflow from build_executable.py:
    1. Copy /inspect_ai/src/inspect_sandbox_tools to /tmp/inspect_sandbox_tools-copy
    2. Change to the copy directory
    3. Run pip install . to install the package
    """
    # Container paths (matching build_executable.py)
    repo_dir = Path("/inspect_ai")
    source_dir = repo_dir / "src" / "inspect_sandbox_tools"
    copy_dir = Path("/tmp/inspect_sandbox_tools-copy")

    # Verify we're in a container environment
    if not source_dir.exists():
        raise FileNotFoundError(
            f"Expected container source directory not found: {source_dir}\n"
            "This function requires the container environment setup."
        )

    # Remove existing copy directory to allow multiple runs
    if copy_dir.exists():
        shutil.rmtree(copy_dir)

    print(f"Copying source from {source_dir} to {copy_dir}")

    # Make a copy into /tmp to avoid mutating the mounted repo
    shutil.copytree(source_dir, copy_dir, ignore=shutil.ignore_patterns(".venv"))

    # Change to the copy directory
    os.chdir(copy_dir)
    print(f"Changed working directory to: {copy_dir}")

    # Install the package
    print("Installing package...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "."],
        check=True,
        stdout=None,
        stderr=None,
    )


if __name__ == "__main__":
    # Entry point when running as a script
    main()
```

## `tool/_sandbox_tools_utils/build_within_container.py`

```python
#!/usr/bin/env python3
"""
Docker-based executable build orchestrator for inspect_sandbox_tools.

This module coordinates the multi-architecture build process for creating portable
Linux executables. It handles Docker container setup, architecture validation, and
delegates the actual build work to build_executable.py running inside containers.

TYPICAL FLOW:
1. Developer/CI runs: python build_within_container.py [--arch amd64|arm64|--all]
2. This script creates PyInstaller-equipped Docker containers for target architectures
3. Mounts repository at /inspect_ai and executes build_executable.py inside container
4. build_executable.py copies source, installs package, and creates executable
5. Final executables placed in src/inspect_ai/binaries/ for runtime injection

EXECUTION CONTEXTS:
- CI/CD pipelines (GitHub Actions)
- Runtime executable rebuilding when binaries missing
- Direct developer usage for testing/development

Supports both amd64 and arm64 Linux architectures with cross-compilation capability.
"""

import argparse
import os
import platform
import subprocess
import sys
from pathlib import Path
from typing import Literal

# IMPORT CONTEXT HANDLING:
# This script runs in three different execution contexts:
# 1. GitHub Actions CI/CD - runs from source checkout, package not installed
# 2. inspect_ai runtime - called when executables missing, package installed
# 3. Direct developer usage - various working directories possible
#
# Unlike build_executable.py/_bundled_executable_builder.py (which only run in containers),
# this script needs to work at runtime in both installed and source contexts.
# TYPE_CHECKING pattern won't work here because both import paths need to work
# at runtime, not just during static analysis.
try:
    from ._build_config import SandboxToolsBuildConfig, config_to_filename
except ImportError:
    # Handle direct execution or source checkout contexts
    from _build_config import SandboxToolsBuildConfig, config_to_filename


def get_script_dir() -> Path:
    """Get the directory containing this script."""
    return Path(__file__).parent.absolute()


def read_version() -> str:
    version_file = Path("./sandbox_tools_version.txt")
    try:
        return version_file.read_text().strip()
    except FileNotFoundError:
        print(f"Version file not found: {version_file}", file=sys.stderr)
        sys.exit(1)


def detect_host_architecture() -> tuple[str, str]:
    """Detect host architecture and return (arch_suffix, platform)."""
    arch = platform.machine().lower()
    if arch == "x86_64":
        return "amd64", "linux/amd64"
    elif arch in ("aarch64", "arm64"):
        return "arm64", "linux/arm64"
    else:
        print(f"Unsupported architecture: {arch}", file=sys.stderr)
        sys.exit(1)


def validate_target_architecture(target_arch: str) -> tuple[str, str]:
    """Validate target architecture and return (arch_suffix, platform)."""
    if target_arch == "amd64":
        return "amd64", "linux/amd64"
    elif target_arch == "arm64":
        return "arm64", "linux/arm64"
    else:
        print(f"Unsupported target architecture: {target_arch}", file=sys.stderr)
        print("Supported: amd64, arm64", file=sys.stderr)
        sys.exit(1)


def run_docker_build(platform: str, image_name: str, dockerfile: str) -> None:
    """Build the Docker image."""
    print("Building Docker image...")
    cmd = [
        "docker",
        "build",
        "--platform",
        platform,
        "-t",
        image_name,
        "-f",
        dockerfile,
        ".",
    ]
    subprocess.run(cmd, check=True)


def run_docker_container(
    platform: str,
    arch_suffix: str,
    image_name: str,
    version: str,
    passthrough_args: list[str] | None = None,
) -> None:
    """Run the Docker container to build the executable."""
    print("Starting container and building executable...")

    # Ensure binaries directory exists
    Path("../../binaries").mkdir(exist_ok=True)

    # Find repository root (should be 4 levels up from this script)
    repo_root = get_script_dir().parent.parent.parent.parent

    # Parse version to extract numeric version and suffix
    parts = version.split("-", 1)
    version_num = int(parts[0])
    suffix = parts[1] if len(parts) > 1 else None

    # Validate arch_suffix for BuildConfig
    if arch_suffix not in ["amd64", "arm64"]:
        raise ValueError(
            f"Unexpected architecture suffix '{arch_suffix}'. Only 'amd64' and 'arm64' are supported."
        )

    # Validate suffix for BuildConfig
    if suffix is not None and suffix != "dev":
        raise ValueError(
            f"Unexpected version suffix '{suffix}'. Only 'dev' is supported."
        )

    # Type annotations for BuildConfig literals
    arch: Literal["amd64", "arm64"] = arch_suffix  # type: ignore
    validated_suffix: Literal["dev"] | None = suffix  # type: ignore

    # Create BuildConfig and generate filename
    config = SandboxToolsBuildConfig(
        arch=arch,
        version=version_num,
        suffix=validated_suffix,
    )
    filename = config_to_filename(config)

    cmd = [
        "docker",
        "run",
        "--rm",
        "--platform",
        platform,
        "-v",
        f"{repo_root}:/inspect_ai:rw",
        "-w",
        "/inspect_ai",
        image_name,
        "python3",
        "./src/inspect_ai/tool/_sandbox_tools_utils/build_executable.py",
        filename,
    ]

    # Add passthrough arguments if provided
    if passthrough_args:
        cmd.extend(passthrough_args)

    # Stream output from container to console so user can see build progress
    subprocess.run(cmd, check=True, stdout=None, stderr=None)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build inspect-sandbox-tools executables in containers",
        epilog="Arguments after '--' will be passed through to the script run within the container",
    )
    parser.add_argument(
        "--arch", choices=["amd64", "arm64"], help="Build for specific architecture"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Build for all architectures (amd64/arm64)",
    )
    parser.add_argument(
        "--dev",
        type=lambda x: x.lower() == "true",
        default=True,
        nargs="?",
        const=True,
        help="Build development version (adds -dev suffix). Use --dev=false for production builds.",
    )
    # Container tools does not support browser functionality

    # Parse known args to allow pass-through arguments after "--"
    args, passthrough_args = parser.parse_known_args()

    # Remove any standalone "--" from passthrough args
    passthrough_args = [arg for arg in passthrough_args if arg != "--"]

    # Save original directory
    original_dir = Path.cwd()

    try:
        # Change to script directory
        script_dir = get_script_dir()
        os.chdir(script_dir)

        # Read version and determine if dev build
        base_version = read_version()
        version = f"{base_version}-dev" if args.dev else base_version

        # Handle --all flag or no parameters (default behavior)
        if args.all or (not args.arch):
            print("Building for all architectures...")
            # Recursively call this script for each architecture
            for arch in ["amd64", "arm64"]:
                cmd = [sys.executable, __file__, "--arch", arch]
                if not args.dev:
                    cmd.append("--dev=false")
                # Add passthrough arguments if any
                if passthrough_args:
                    cmd.append("--")
                    cmd.extend(passthrough_args)
                print(f"Building {arch}...")
                subprocess.run(cmd, check=True)
            return

        # Determine target architecture (only when --arch is explicitly specified)
        arch_suffix, platform = validate_target_architecture(args.arch)

        image_name = f"pyinstaller-build-{arch_suffix}"
        dockerfile = "Dockerfile.pyinstaller"

        print(f"Building for architecture: {arch_suffix} (platform: {platform})")

        # Build Docker image
        run_docker_build(platform, image_name, dockerfile)

        # Run container to build executable
        run_docker_container(
            platform, arch_suffix, image_name, version, passthrough_args
        )

        print("Build completed. Executable available in src/inspect_ai/binaries/")

    finally:
        # Restore original directory
        os.chdir(original_dir)


if __name__ == "__main__":
    main()
```

## `tool/_sandbox_tools_utils/sandbox.py`

```python
import subprocess
import sys
import warnings
from contextlib import asynccontextmanager
from importlib import resources
from logging import getLogger
from pathlib import Path
from typing import AsyncIterator, BinaryIO, Literal
from urllib.parse import unquote, urlparse

import httpx
from rich.prompt import Prompt

import inspect_ai
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.logger import warn_once
from inspect_ai._util.package import get_package_direct_url
from inspect_ai._util.trace import trace_message
from inspect_ai.util import input_screen
from inspect_ai.util._concurrency import concurrency
from inspect_ai.util._sandbox._cli import SANDBOX_CLI
from inspect_ai.util._sandbox.context import (
    SandboxInjectable,
    sandbox_file_detector,
    sandbox_with_injection,
)
from inspect_ai.util._sandbox.environment import SandboxEnvironment
from inspect_ai.util._sandbox.recon import Architecture, detect_sandbox_os

from ._build_config import (
    SandboxToolsBuildConfig,
    config_to_filename,
)

_BUCKET_BASE_URL = "https://inspect-sandbox-tools.s3.us-east-2.amazonaws.com"

logger = getLogger(__name__)


TRACE_SANDBOX_TOOLS = "Sandbox Tools"


class SandboxInjectionError(Exception):
    """Exception raised when sandbox tools injection fails.

    This error wraps any exception that occurs during the injection process
    to provide a clear signal that the failure was specifically during injection.
    This is required because SandboxInjection happens as a side effect of making
    a tool call. We need to make sure that injection errors are not interpreted
    and handled specially (e.g. give to the model) as exceptions throw from tool
    calls are.
    """

    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause
        self.__cause__ = cause


InstallState = Literal["pypi", "clean", "edited"]
"""Represents the state of the inspect-ai installation.

- **pypi**: PyPI installation
- **clean**: Non-PyPI install with no sandbox tools changes relative to main
- **edited**: Non-PyPI install with changes to sandbox tools
"""


async def sandbox_with_injected_tools(
    *,
    sandbox_name: str | None = None,
    sandbox: SandboxEnvironment | None = None,
) -> SandboxEnvironment:
    """Create a sandbox environment with sandbox tools injection.

    Args:
        sandbox_name: Optional name for the sandbox environment.
        sandbox: Optional sandbox instance to inject into directly.

    Returns:
        A sandbox environment with container tools injected.
    """
    return await sandbox_with_injection(
        SandboxInjectable(
            sandbox_file_detector(SANDBOX_CLI),
            _inject_container_tools_code,
        ),
        name=sandbox_name,
        target=sandbox,
    )


async def _inject_container_tools_code(sandbox: SandboxEnvironment) -> None:
    try:
        info = await detect_sandbox_os(sandbox)

        async with _open_executable_for_arch(info["architecture"]) as (_, f):
            # TODO: The first tuple member, filename, isn't currently used, but it will be
            await sandbox.write_file(SANDBOX_CLI, f.read())
            # .write_file used `tee` which dropped execute permissions
            result = await sandbox.exec(["chmod", "+x", SANDBOX_CLI], user="root")
            if not result.success:
                raise RuntimeError(
                    f"Failed to chmod sandbox tools binary: {result.stderr}"
                )
    except Exception as e:
        raise SandboxInjectionError(
            f"Failed to inject sandbox tools into sandbox: {e}", cause=e
        ) from e


@asynccontextmanager
async def _open_executable(executable: str) -> AsyncIterator[BinaryIO]:
    """Open the executable file from the binaries package."""
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=DeprecationWarning)
        with resources.path("inspect_ai.binaries", executable) as executable_path:
            with open(executable_path, "rb") as f:
                yield f


def _prompt_user_action(message: str, executable_name: str, arch: Architecture) -> None:
    """Prompt user for confirmation and raise PrerequisiteError if declined.

    Args:
        message: The message to display to the user
        executable_name: Name of the executable for error message
        arch: Architecture for build instructions

    Raises:
        PrerequisiteError: If user declines the action
    """
    with input_screen():
        response = Prompt.ask(
            message,
            choices=["y", "n"],
            default="y",
            case_sensitive=False,
        )
        if response != "y":
            raise PrerequisiteError(
                f"Container tools executable {executable_name} is required but not present. "
                f"To build it, run: python src/inspect_ai/tool/sandbox_tools/build_within_container.py --arch {arch}"
            )


@asynccontextmanager
async def _open_executable_for_arch(
    arch: Architecture,
) -> AsyncIterator[tuple[str, BinaryIO]]:
    install_state = _get_install_state()

    executable_name = _get_executable_name(arch, install_state == "edited")

    trace_message(logger, TRACE_SANDBOX_TOOLS, f"looking for {executable_name}")

    # Only let one task at a time try to resolve the file.
    async with concurrency(executable_name, 1, visible=False):
        # Local Executable Check
        try:
            async with _open_executable(executable_name) as f:
                trace_message(logger, TRACE_SANDBOX_TOOLS, f"found {executable_name}")
                yield executable_name, f
                return
        except (FileNotFoundError, ModuleNotFoundError, NotADirectoryError):
            if install_state == "pypi":
                msg = f"Tool support executable {executable_name} is missing from the PyPI package installation. This indicates a problem with the package. Please reinstall inspect_ai."
                # TODO: once we get the github CI/CD actions robust, this should be fatal
                # raise PrerequisiteError(msg)
                warn_once(logger, msg)

        # S3 Download Attempt
        if install_state == "clean":
            if await _download_from_s3(executable_name):
                async with _open_executable(executable_name) as f:
                    trace_message(
                        logger,
                        TRACE_SANDBOX_TOOLS,
                        f"downloaded {executable_name} from s3",
                    )
                    yield executable_name, f
                    return
            # TODO: One could argue that we should not fall through here. If they
            # haven't made any edits to sandbox_tools, they 100% should be able to
            # download from S3. This scenario is similar to the pypi error just above.

        # Build it locally
        await _build_it(arch, executable_name)

        async with _open_executable(executable_name) as f:
            yield executable_name, f


def _get_sandbox_tools_version() -> str:
    """Get the container tools version from sandbox_tools_version.txt file."""
    # Look in the same directory as this module
    version_file = Path(__file__).parent / "sandbox_tools_version.txt"
    return version_file.read_text().strip()


def _get_executable_name(arch: Architecture, dev: bool) -> str:
    return config_to_filename(
        SandboxToolsBuildConfig(
            arch=arch,
            version=int(_get_sandbox_tools_version()),
            suffix="dev" if dev else None,
        )
    )


async def _download_from_s3(filename: str) -> bool:
    """Download executable from S3. Returns True if successful, False otherwise.

    Handles expected failures (404 - not yet promoted) silently.
    Logs unexpected failures but doesn't raise exceptions.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Download the executable
            response = await client.get(f"{_BUCKET_BASE_URL}/{filename}")
            response.raise_for_status()

            # Save to binaries directory
            binaries_path = Path(inspect_ai.__file__).parent / "binaries"
            binaries_path.mkdir(exist_ok=True)

            # Save with versioned name to match what we're looking for
            executable_path = binaries_path / filename
            executable_path.write_bytes(response.content)
            executable_path.chmod(0o755)

            return True

    except httpx.HTTPStatusError as e:
        if e.response.status_code in (403, 404):
            print(f"Executable '{filename}' not found on S3")
            return False
        raise


async def _build_it(arch: Architecture, dev_executable_name: str) -> None:
    _prompt_user_action(
        f"Executable '{dev_executable_name}' not found. Build locally? (requires Docker)",
        dev_executable_name,
        arch,
    )

    # Find the build script
    build_script_path = Path(__file__).parent / "build_within_container.py"

    if not build_script_path.exists():
        raise FileNotFoundError(f"Build script not found at {build_script_path}")

    print(f"Building missing executable {dev_executable_name}...")

    # Run the build script
    subprocess.run(
        [sys.executable, str(build_script_path), "--arch", arch],
        capture_output=True,
        text=True,
        check=True,
    )

    print(f"Successfully built {dev_executable_name}")


def _get_install_state() -> InstallState:
    """Detect the state of the inspect-ai installation."""
    if (direct_url := get_package_direct_url("inspect-ai")) is None:
        return "pypi"

    if (
        editable_url := (
            direct_url.url
            if direct_url.dir_info and direct_url.dir_info.editable
            else None
        )
    ) is None:
        return "clean"

    return _check_main_divergence(editable_url)


def _check_main_divergence(url: str) -> Literal["clean", "edited"]:
    """Check if there are changes to sandbox tools files relative to main.

    Returns:
        Literal["clean", "edited"]: The state of changes to sandbox tools files.
            - "clean": No changes to sandbox tools files relative to main branch,
              or git is not available/functioning
            - "edited": Changes detected to tool support files - either
              uncommitted changes (staged/unstaged) or committed changes relative
              to main branch
    """
    parsed_url = urlparse(url)
    if parsed_url.scheme != "file":
        return "clean"

    git_root = Path(unquote(parsed_url.path))

    trace_message(
        logger, TRACE_SANDBOX_TOOLS, f"_check_for_changes: checking {git_root=}"
    )

    try:
        # Check if we're in a git repo
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            capture_output=True,
            text=True,
            check=False,
            cwd=git_root,
        )
        if result.returncode != 0:
            trace_message(
                logger,
                TRACE_SANDBOX_TOOLS,
                f"_check_for_changes: git rev-parse failed {result}",
            )
            # Not a git repo, assume clean (not sure this is even possible)
            return "clean"

        # Check for staged or unstaged changes to relevant paths
        paths_to_check = [
            "src/inspect_ai/tool/_sandbox_tools_utils/sandbox_tools_version.txt",
            "src/inspect_sandbox_tools",
        ]

        for path in paths_to_check:
            # Check for uncommitted changes (staged + unstaged)
            result = subprocess.run(
                ["git", "status", "--porcelain", path],
                capture_output=True,
                text=True,
                check=False,
                cwd=git_root,
            )
            if result.returncode == 0 and result.stdout.strip():
                trace_message(
                    logger,
                    TRACE_SANDBOX_TOOLS,
                    f"_check_for_changes: uncommitted changes (staged + unstaged) detected for {path}",
                )
                return "edited"

            # Check for committed changes relative to main
            result = subprocess.run(
                ["git", "diff", "main", "--quiet", path],
                capture_output=True,
                text=True,
                check=False,
                cwd=git_root,
            )
            if result.returncode != 0:
                trace_message(
                    logger,
                    TRACE_SANDBOX_TOOLS,
                    f"_check_for_changes: diff's from main detected for {path}",
                )
                return "edited"

        trace_message(
            logger, TRACE_SANDBOX_TOOLS, "_check_for_changes: do changes detected"
        )
        return "clean"

    except (subprocess.SubprocessError, FileNotFoundError) as ex:
        # If git commands fail, assume clean
        trace_message(
            logger, TRACE_SANDBOX_TOOLS, f"_check_for_changes: caught exception {ex}"
        )
        return "clean"
```

## `tool/_sandbox_tools_utils/upload_to_s3.py`

```python
#!/usr/bin/env python3
"""Upload sandbox tools executables to S3 for a given version."""

import argparse
import subprocess
import sys
from pathlib import Path

BINARIES_DIR = Path(__file__).parent.parent / "binaries"
S3_BUCKET = "s3://inspect-sandbox-tools/"  # Region: us-east-2
ARCHS = ["amd64", "arm64"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload sandbox tools to S3")
    parser.add_argument("version", type=int, help="Version number to upload")
    args = parser.parse_args()

    for arch in ARCHS:
        filename = f"inspect-sandbox-tools-{arch}-v{args.version}"
        filepath = BINARIES_DIR / filename
        if not filepath.exists():
            print(f"Error: {filepath} not found", file=sys.stderr)
            sys.exit(1)

        cmd = [
            "aws",
            "s3",
            "cp",
            str(filepath),
            S3_BUCKET,
            "--acl",
            "public-read",
        ]
        print(f"Uploading {filename}...")
        subprocess.run(cmd, check=True)

    print("Done.")


if __name__ == "__main__":
    main()
```

## `tool/_sandbox_tools_utils/validate_distros.py`

```python
#!/usr/bin/env python3
"""
Distribution compatibility validator for inspect-sandbox-tools executables.

This script validates that built executables work across different Linux distributions
by running them in Docker containers with the 'healthcheck' command.

USAGE:
    python -m inspect_ai.tool._sandbox_tools_utils.validate_distros

NOTE: Must be run as a module (with -m flag) to ensure proper package imports.
Run from the inspect_ai source root or with the package installed.
"""

import subprocess
import sys
from pathlib import Path
from typing import List

from inspect_ai.util._sandbox._cli import SANDBOX_TOOLS_BASE_NAME


class Colors:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    BLUE = "\033[0;34m"
    NC = "\033[0m"  # No Color


def print_colored(message: str, color: str = Colors.NC) -> None:
    """Print a colored message to stdout."""
    print(f"{color}{message}{Colors.NC}")


def test_distro(distro: str, executable_path: Path) -> bool:
    """Test a single distro with the given executable."""
    print_colored(f"Testing {distro} with {executable_path.name}", Colors.BLUE)

    # Docker command to test the executable
    cmd = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{executable_path}:/app/executable:ro",
        distro,
        "bash",
        "-c",
        """
        cd /app
        ./executable healthcheck
        """,
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=False)
        print_colored(f"✓ {distro}: SUCCESS", Colors.GREEN)
        return True
    except subprocess.CalledProcessError:
        print_colored(f"✗ {distro}: FAILED", Colors.RED)
        return False


def find_executables() -> List[Path]:
    """Find available executables in the binaries directory."""
    binaries_dir = Path(__file__).parent.parent.parent / "binaries"
    executables = []

    # Find all executables matching the prefix pattern
    for executable in binaries_dir.glob(f"{SANDBOX_TOOLS_BASE_NAME}-*"):
        # Check if it's for a supported architecture
        if "amd64" in executable.name or "arm64" in executable.name:
            executables.append(executable)

    return executables


def main() -> None:
    """Main execution function."""
    distros = [
        "ubuntu:20.04",
        "ubuntu:22.04",
        "ubuntu:24.04",
        "debian:11",
        "debian:12",
        "kalilinux/kali-rolling:latest",
    ]

    print_colored(
        "Starting compatibility tests across multiple Linux distributions...",
        Colors.BLUE,
    )

    # Find available executables
    executables = find_executables()

    if not executables:
        print_colored(
            "No executables found in binaries/. Run build_within_container.py first.",
            Colors.RED,
        )
        sys.exit(1)

    executable_names = [exe.name for exe in executables]
    print_colored(f"Found executables: {', '.join(executable_names)}", Colors.BLUE)

    # Test results tracking
    total_tests = 0
    passed_tests = 0

    # Test each executable against each distro
    for executable in executables:
        print_colored(f"\n=== Testing {executable.name} ===", Colors.BLUE)

        for distro in distros:
            total_tests += 1
            if test_distro(distro, executable):
                passed_tests += 1
            print()  # Blank line for readability

    # Summary
    print_colored("\n=== TEST SUMMARY ===", Colors.BLUE)
    print(f"Total tests: {total_tests}")
    print_colored(f"Passed: {passed_tests}", Colors.GREEN)
    print_colored(f"Failed: {total_tests - passed_tests}", Colors.RED)

    if passed_tests == total_tests:
        print_colored(
            "\n🎉 All tests passed! Executables are compatible across all tested distributions.",
            Colors.GREEN,
        )
        sys.exit(0)
    else:
        print_colored(
            "\n❌ Some tests failed. Check the output above for details.", Colors.RED
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
```

## `tool/_tool.py`

```python
import re
from functools import wraps
from logging import getLogger
from typing import (
    Any,
    Callable,
    ParamSpec,
    Protocol,
    cast,
    overload,
    runtime_checkable,
)

from inspect_ai._util.content import (
    Content,
    ContentAudio,
    ContentDocument,
    ContentImage,
    ContentText,
    ContentVideo,
)
from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_add,
    registry_name,
    registry_tag,
)

from ._tool_call import ToolCallModelInput, ToolCallViewer

logger = getLogger(__name__)


ToolResult = (
    str
    | int
    | float
    | bool
    | ContentText
    | ContentImage
    | ContentAudio
    | ContentVideo
    | ContentDocument
    | list[ContentText | ContentImage | ContentAudio | ContentVideo | ContentDocument]
)
"""Valid types for results from tool calls."""


class ToolError(Exception):
    """Exception thrown from tool call.

    If you throw a `ToolError` form within a tool call,
    the error will be reported to the model for further
    processing (rather than ending the sample). If you want
    to raise a fatal error from a tool call use an appropriate
    standard exception type (e.g. `RuntimeError`, `ValueError`, etc.)
    """

    def __init__(self, message: str) -> None:
        """Create a ToolError.

        Args:
          message: Error message to report to the model.
        """
        super().__init__(message)
        self.message = message


class ToolParsingError(ToolError):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class ToolApprovalError(ToolError):
    def __init__(self, message: str | None) -> None:
        super().__init__(message or "Tool call not approved.")


@runtime_checkable
class Tool(Protocol):
    async def __call__(
        self,
        *args: Any,
        **kwargs: Any,
    ) -> ToolResult:
        r"""Additional tool that an agent can use to solve a task.

        Args:
          *args: Arguments for the tool.
          **kwargs: Keyword arguments for the tool.

        Returns:
            Result of tool call.

        Examples:
          ```python
          @tool
          def add() -> Tool:
              async def execute(x: int, y: int) -> int:
                  return x + y

              return execute
          ```
        """
        ...


@runtime_checkable
class ToolSource(Protocol):
    """Protocol for dynamically providing a set of tools."""

    async def tools(self) -> list[Tool]:
        """Retrieve tools from tool source.

        Returns:
            List of tools
        """
        ...


P = ParamSpec("P")


def tool_register(tool: Callable[P, Tool], name: str) -> Callable[P, Tool]:
    r"""Register a function or class as a tool.

    Args:
        tool (ToolType):
            Tool function or a class derived from Tool.
        docstring (Docstring): Docstring for the tool. Used to extract arg descriptions.
        name (str): Name of tool (Optional, defaults to object name)

    Returns:
        Tool with registry attributes.
    """
    registry_add(
        tool,
        RegistryInfo(type="tool", name=name),
    )
    return tool


@overload
def tool(func: Callable[P, Tool]) -> Callable[P, Tool]: ...


@overload
def tool() -> Callable[[Callable[P, Tool]], Callable[P, Tool]]: ...


@overload
def tool(
    *,
    name: str | None = None,
    viewer: ToolCallViewer | None = None,
    model_input: ToolCallModelInput | None = None,
    parallel: bool = True,
    prompt: str | None = None,
) -> Callable[[Callable[P, Tool]], Callable[P, Tool]]: ...


def tool(
    func: Callable[P, Tool] | None = None,
    *,
    name: str | None = None,
    viewer: ToolCallViewer | None = None,
    model_input: ToolCallModelInput | None = None,
    parallel: bool = True,
    prompt: str | None = None,
) -> Callable[P, Tool] | Callable[[Callable[P, Tool]], Callable[P, Tool]]:
    r"""Decorator for registering tools.

    Args:
        func: Tool function
        name: Optional name for tool. If the decorator has no name
            argument then the name of the tool creation function
            will be used as the name of the tool.
        viewer: Provide a custom view of tool call and context.
        model_input: Provide a custom function for playing back tool results as model input.
        parallel: Does this tool support parallel execution? (defaults to `True`).
        prompt: Deprecated (provide all descriptive information about
            the tool within the tool function's doc comment)


    Returns:
        Tool with registry attributes.

    Examples:
        ```python
        @tool
        def add() -> Tool:
            async def execute(x: int, y: int) -> int:
                return x + y

            return execute
        ```
    """
    if prompt:
        from inspect_ai._util.logger import warn_once

        warn_once(
            logger,
            "The prompt parameter is deprecated (please relocate "
            + "to the tool function's description doc comment)",
        )
        prompt = re.sub(r"\s+", " ", prompt)

    def create_tool_wrapper(tool_type: Callable[P, Tool]) -> Callable[P, Tool]:
        # determine the name (explicit or implicit from object)
        tool_name = registry_name(
            tool_type, name if name else getattr(tool_type, "__name__")
        )

        # wrap instantiations of scorer so they carry registry info and metrics
        @wraps(tool_type)
        def tool_wrapper(*args: P.args, **kwargs: P.kwargs) -> Tool:
            # create the tool
            tool = tool_type(*args, **kwargs)

            # this might already have registry info, in that case
            # capture it and use it as defaults
            from inspect_ai.tool._tool_def import tool_registry_info

            tool_parallel = parallel
            tool_viewer = viewer
            tool_model_input = model_input
            tool_options: dict[str, object] | None = None
            if is_registry_object(tool):
                _, _, reg_parallel, reg_viewer, reg_model_input, options = (
                    tool_registry_info(tool)
                )
                tool_parallel = parallel and reg_parallel
                tool_viewer = viewer or reg_viewer
                tool_model_input = model_input or reg_model_input
                tool_options = options

            # tag the object
            registry_tag(
                tool_type,
                tool,
                RegistryInfo(
                    type="tool",
                    name=tool_name,
                    metadata={
                        TOOL_PROMPT: prompt,
                        TOOL_PARALLEL: tool_parallel,
                        TOOL_VIEWER: tool_viewer,
                        TOOL_MODEL_INPUT: (
                            tool_model_input
                            or getattr(tool, TOOL_INIT_MODEL_INPUT, None)
                        ),
                        TOOL_OPTIONS: tool_options,
                    },
                ),
                *args,
                **kwargs,
            )
            return tool

        # register
        return tool_register(cast(Callable[P, Tool], tool_wrapper), tool_name)

    if func is not None:
        return create_tool_wrapper(func)
    else:
        return create_tool_wrapper


def tool_result_content(
    content: str | list[Content],
) -> (
    str
    | list[ContentText | ContentImage | ContentAudio | ContentVideo | ContentDocument]
):
    if isinstance(content, str):
        return content
    else:
        result: list[
            ContentText | ContentImage | ContentAudio | ContentVideo | ContentDocument
        ] = []
        for c in content:
            if isinstance(c, ContentText):
                # Strip citations — they reference server-side tool results
                # from the inner context and are invalid in tool result blocks
                if c.citations:
                    c = c.model_copy(update={"citations": None})
                result.append(c)
            elif isinstance(
                c, ContentImage | ContentAudio | ContentVideo | ContentDocument
            ):
                result.append(c)
        return result


TOOL_PROMPT = "prompt"
TOOL_PARALLEL = "parallel"
TOOL_VIEWER = "viewer"
TOOL_MODEL_INPUT = "model_input"
TOOL_OPTIONS = "options"


TOOL_INIT_MODEL_INPUT = "__TOOL_INIT_MODEL_INPUT__"
```

## `tool/_tool_call.py`

```python
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Literal

from pydantic import BaseModel, Field, JsonValue, field_validator
from pydantic.dataclasses import dataclass as pydantic_dataclass
from typing_extensions import TypedDict

from inspect_ai._util.content import Content


class ToolCallContent(BaseModel):
    """Content to include in tool call view."""

    title: str | None = Field(default=None)
    """Optional (plain text) title for tool call content."""

    format: Literal["text", "markdown"]
    """Format (text or markdown)."""

    content: str = Field(default_factory=str)
    """Text or markdown content."""


class ToolCallView(BaseModel):
    """Custom view of a tool call.

    Both `context` and `call` are optional. If `call` is not specified
    then the view will default to a syntax highlighted Python function call.
    """

    context: ToolCallContent | None = Field(default=None)
    """Context for the tool call (i.e. current tool state)."""

    call: ToolCallContent | None = Field(default=None)
    """Custom representation of tool call."""


@pydantic_dataclass
class ToolCall:
    id: str
    """Unique identifier for tool call."""

    function: str
    """Function called."""

    arguments: dict[str, Any]
    """Arguments to function."""

    parse_error: str | None = field(default=None)
    """Error which occurred parsing tool call."""

    view: ToolCallContent | None = field(default=None)
    """Custom view of tool call input."""

    type: Literal["function", "custom"] = field(default="function")
    """Type of tool call."""

    @field_validator("type", mode="before")
    @classmethod
    def migrate_type(cls, v: Any) -> Any:
        """Migrate None values from deprecated type field to 'function'."""
        if v is None:
            return "function"
        return v


@dataclass
class ToolCallError:
    """Error raised by a tool call."""

    type: Literal[
        "parsing",
        "timeout",
        "unicode_decode",
        "permission",
        "file_not_found",
        "is_a_directory",
        "limit",
        "approval",
        "unknown",
        # Retained for backward compatibility when loading logs created with an older
        # version of inspect.
        "output_limit",
    ]
    """Error type."""

    message: str
    """Error message."""


ToolCallViewer = Callable[[ToolCall], ToolCallView]
"""Custom view renderer for tool calls."""


def substitute_tool_call_content(
    content: ToolCallContent, arguments: dict[str, JsonValue]
) -> ToolCallContent:
    """Substitute ``{{param_name}}`` placeholders in *content* from *arguments*.

    Placeholders whose ``param_name`` does not appear in *arguments* are left
    as-is.  Returns a **new** ``ToolCallContent`` – the original is not mutated.
    """

    def _replace(text: str) -> str:
        def _sub(m: re.Match[str]) -> str:
            key = m.group(1)
            if key in arguments:
                return str(arguments[key])
            return m.group(0)

        return re.sub(r"\{\{(\w+)\}\}", _sub, text)

    return ToolCallContent(
        title=_replace(content.title) if content.title else content.title,
        format=content.format,
        content=_replace(content.content),
    )


class ToolCallModelInputHints(TypedDict):
    # This type is a little sketchy but it allows tools to customize their
    # input hook behavior based on model limitations without creating a tight
    # coupling to the model provider.
    disable_computer_screenshot_truncation: bool
    """The model does not support the truncation/redaction of computer screenshots."""


ToolCallModelInput = Callable[
    [int, int, str | list[Content], ToolCallModelInputHints], str | list[Content]
]
"""Determine how tool call results are played back as model input.

The first argument is an index into the total number of tool results
for this tool in the message history, the second is the total number.
"""
```

## `tool/_tool_choice.py`

```python
from dataclasses import dataclass
from typing import Literal, Union


@dataclass
class ToolFunction:
    """Indicate that a specific tool function should be called."""

    name: str
    """The name of the tool function to call."""


ToolChoice = Union[Literal["auto", "any", "none"], ToolFunction]
"""Specify which tool to call.

"auto" means the model decides; "any" means use at least one tool,
"none" means never call a tool; ToolFunction instructs the model
to call a specific function.
"""
```

## `tool/_tool_def.py`

```python
from copy import copy
from typing import (
    Any,
    Callable,
    NamedTuple,
    Sequence,
)

from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_info,
    set_registry_info,
    set_registry_params,
)

from ._tool import (
    TOOL_MODEL_INPUT,
    TOOL_OPTIONS,
    TOOL_PARALLEL,
    TOOL_PROMPT,
    TOOL_VIEWER,
    Tool,
    ToolSource,
)
from ._tool_call import ToolCallModelInput, ToolCallViewer
from ._tool_description import (
    ToolDescription,
    set_tool_description,
    tool_description,
)
from ._tool_info import parse_tool_info
from ._tool_params import ToolParam, ToolParams


class ToolDef:
    """Tool definition."""

    def __init__(
        self,
        tool: Callable[..., Any],
        name: str | None = None,
        description: str | None = None,
        parameters: dict[str, str] | ToolParams | None = None,
        parallel: bool | None = None,
        viewer: ToolCallViewer | None = None,
        model_input: ToolCallModelInput | None = None,
        options: dict[str, object] | None = None,
    ) -> None:
        """Create a tool definition.

        Args:
          tool: Callable to execute tool.
          name: Name of tool. Discovered automatically if not specified.
          description: Description of tool. Discovered automatically
            by parsing doc comments if not specified.
          parameters: Tool parameter descriptions and types.
             Discovered automatically by parsing doc comments if not specified.
          parallel: Does the tool support parallel execution
             (defaults to True if not specified)
          viewer: Optional tool call viewer implementation.
          model_input: Optional function that determines how
              tool call results are played back as model input.
          options: Optional property bag that can be used by the model provider
              to customize the implementation of the tool

        Returns:
          Tool definition.
        """
        # tool
        self.tool = tool

        # if this is already a tool then initialise defaults from the tool
        if is_registry_object(tool) and registry_info(tool).type == "tool":
            tdef = tool_def_fields(tool)
            self.name = name or tdef.name
            self.description = description or tdef.description
            if isinstance(parameters, ToolParams):
                self.parameters = parameters
            else:
                self.parameters = tdef.parameters
                if parameters is not None:
                    apply_description_overrides(self.parameters, parameters)

            parameters = parameters if parameters is not None else tdef.parameters
            self.parallel = parallel if parallel is not None else tdef.parallel
            self.viewer = viewer or tdef.viewer
            self.model_input = model_input or tdef.model_input
            self.options = options or tdef.options

        # if its not a tool then extract tool_info if all fields have not
        # been provided explicitly
        else:
            if (
                name is None
                or description is None
                or parameters is None
                or not isinstance(parameters, ToolParams)
            ):
                tool_info = parse_tool_info(tool)
                self.name = name or tool_info.name
                self.description = description or tool_info.description
                if parameters:
                    if not isinstance(parameters, ToolParams):
                        self.parameters = copy(tool_info.parameters)
                        apply_description_overrides(self.parameters, parameters)
                    else:
                        self.parameters = parameters
                else:
                    self.parameters = tool_info.parameters
            else:
                self.name = name
                self.description = description
                self.parameters = parameters

            # behavioral attributes
            self.parallel = parallel is not False
            self.viewer = viewer
            self.model_input = model_input
            self.options = options

    tool: Callable[..., Any]
    """Callable to execute tool."""

    name: str
    """Tool name."""

    description: str
    """Tool description."""

    parameters: ToolParams
    """Tool parameter descriptions."""

    parallel: bool
    """Supports parallel execution."""

    viewer: ToolCallViewer | None
    """Custom viewer for tool call"""

    model_input: ToolCallModelInput | None
    """Custom model input presenter for tool calls."""

    options: dict[str, object] | None = None
    """Optional property bag that can be used by the model provider to customize the implementation of the tool"""

    def as_tool(self) -> Tool:
        """Convert a ToolDef to a Tool."""
        tool = self.tool
        info = RegistryInfo(
            type="tool",
            name=self.name,
            metadata={
                TOOL_PARALLEL: self.parallel,
                TOOL_VIEWER: self.viewer,
                TOOL_OPTIONS: self.options,
            },
        )
        set_registry_info(tool, info)
        set_registry_params(tool, {})
        set_tool_description(
            tool,
            ToolDescription(
                name=self.name,
                description=self.description,
                parameters=self.parameters,
            ),
        )
        return tool


# helper function to apply description overrides
def apply_description_overrides(target: ToolParams, overrides: dict[str, str]) -> None:
    for param, value in overrides.items():
        if param not in target.properties.keys():
            raise ValueError(
                f"'{param}' is not a valid parameter for the target function."
            )
        target.properties[param].description = value


async def tool_defs(
    tools: Sequence[Tool | ToolDef | ToolSource] | ToolSource,
) -> list[ToolDef]:
    if isinstance(tools, ToolSource):
        tools = await tools.tools()

    tool_defs: list[ToolDef] = []
    for tool in tools:
        if isinstance(tool, ToolSource):
            tool_defs.extend([ToolDef(t) for t in await tool.tools()])
        elif not isinstance(tool, ToolDef):
            tool_defs.append(ToolDef(tool))
        else:
            tool_defs.append(tool)
    return tool_defs


class ToolDefFields(NamedTuple):
    name: str
    description: str
    parameters: ToolParams
    parallel: bool
    viewer: ToolCallViewer | None
    model_input: ToolCallModelInput | None
    options: dict[str, object] | None


def tool_def_fields(tool: Tool) -> ToolDefFields:
    # get tool_info
    name, prompt, parallel, viewer, model_input, options = tool_registry_info(tool)
    tool_info = parse_tool_info(tool)

    # if there is a description then append any prompt to the
    # the description (note that 'prompt' has been depreacted
    # in favor of just providing a description in the doc comment.
    if tool_info.description:
        if prompt:
            tool_info.description = f"{tool_info.description}. {prompt}"

    # if there is no description and there is a prompt, then use
    # the prompt as the description
    elif prompt:
        tool_info.description = prompt

    # no description! we can't proceed without one
    else:
        raise ValueError(f"Description not provided for tool function '{name}'")

    # validate that we have types/descriptions for paramters
    validate_tool_parameters(name, tool_info.parameters.properties)

    # see if the user has overriden any of the tool's descriptions
    desc = tool_description(tool)
    if desc.name:
        name = desc.name
    if desc.description:
        tool_info.description = desc.description
    if desc.parameters:
        for key, param in desc.parameters.properties.items():
            if key in tool_info.parameters.properties.keys():
                tool_info.parameters.properties[key].description = param.description

    # build tool def
    return ToolDefFields(
        name=name,
        description=tool_info.description,
        parameters=tool_info.parameters,
        parallel=parallel,
        viewer=viewer,
        model_input=model_input,
        options=options,
    )


def tool_registry_info(
    tool: Tool,
) -> tuple[
    str,
    str | None,
    bool,
    ToolCallViewer | None,
    ToolCallModelInput | None,
    dict[str, object] | None,
]:
    info = registry_info(tool)
    name = info.name.split("/")[-1]
    prompt = info.metadata.get(TOOL_PROMPT, None)
    parallel = info.metadata.get(TOOL_PARALLEL, True)
    viewer = info.metadata.get(TOOL_VIEWER, None)
    model_input = info.metadata.get(TOOL_MODEL_INPUT, None)
    options = info.metadata.get(TOOL_OPTIONS, None)
    return name, prompt, parallel, viewer, model_input, options


def validate_tool_parameters(tool_name: str, parameters: dict[str, ToolParam]) -> None:
    # validate that we have types/descriptions for paramters
    for param_name, param in parameters.items():

        def raise_not_provided_error(
            context: str,
            # Use the default value trick to avoid Python's late binding of
            # closures issue.
            # see: https://docs.python.org/3/faq/programming.html#why-do-lambdas-defined-in-a-loop-with-different-values-all-return-the-same-result
            bound_name: str = param_name,
        ) -> None:
            raise ValueError(
                f"{context} provided for parameter '{bound_name}' of function '{tool_name}'."
            )

        if not param.description:
            raise_not_provided_error("Description not")
```

## `tool/_tool_description.py`

```python
from dataclasses import dataclass

from ._tool import Tool
from ._tool_params import ToolParams


@dataclass
class ToolDescription:
    name: str | None = None
    description: str | None = None
    parameters: ToolParams | None = None


def tool_description(tool: Tool) -> ToolDescription:
    return getattr(tool, TOOL_DESCRIPTION, ToolDescription())


def set_tool_description(tool: Tool, description: ToolDescription) -> None:
    setattr(tool, TOOL_DESCRIPTION, description)


TOOL_DESCRIPTION = "__TOOL_DESCRIPTION__"
```

## `tool/_tool_info.py`

```python
import inspect
from typing import (
    Any,
    Callable,
    Dict,
    get_args,
    get_type_hints,
)

from docstring_parser import Docstring, parse
from pydantic import BaseModel, Field

from inspect_ai.util._json import JSONType, json_schema

from ._tool_description import tool_description
from ._tool_params import ToolParam, ToolParams


class ToolInfo(BaseModel):
    """Specification of a tool (JSON Schema compatible)

    If you are implementing a ModelAPI, most LLM libraries can
    be passed this object (dumped to a dict) directly as a function
    specification. For example, in the OpenAI provider:

    ```python
    ChatCompletionToolParam(
        type="function",
        function=tool.model_dump(exclude_none=True),
    )
    ```

    In some cases the field names don't match up exactly. In that case
    call `model_dump()` on the `parameters` field. For example, in the
    Anthropic provider:

    ```python
    ToolParam(
        name=tool.name,
        description=tool.description,
        input_schema=tool.parameters.model_dump(exclude_none=True),
    )
    ```
    """

    name: str
    """Name of tool."""
    description: str
    """Short description of tool."""
    parameters: ToolParams = Field(default_factory=ToolParams)
    """JSON Schema of tool parameters object."""
    options: dict[str, Any] | None = Field(default=None)
    """Optional property bag that can be used by the model provider to customize the implementation of the tool"""


def parse_tool_info(func: Callable[..., Any]) -> ToolInfo:
    # tool may already have registry attributes w/ tool info
    description = tool_description(func)
    if (
        description.name
        and description.description
        and description.parameters is not None
    ):
        return ToolInfo(
            name=description.name,
            description=description.description,
            parameters=description.parameters,
        )

    # get_type_hints requires a function, method, module, or class
    # For callable instances (objects with __call__),
    # resolve type hints from the __call__ method instead.
    if inspect.isfunction(func) or inspect.ismethod(func):
        type_hints = get_type_hints(func)
        func_name = func.__name__
    else:
        type_hints = get_type_hints(type(func).__call__)
        func_name = type(func).__name__

    signature = inspect.signature(func)
    docstring = inspect.getdoc(func)
    parsed_docstring: Docstring | None = parse(docstring) if docstring else None

    info = ToolInfo(name=func_name, description="")

    for param_name, param in signature.parameters.items():
        tool_param = ToolParam()

        # Parse docstring
        docstring_info = parse_docstring(docstring, param_name)

        # Get type information from type annotations
        if param_name in type_hints:
            tool_param = json_schema(type_hints[param_name])
        # as a fallback try to parse it from the docstring
        # (this is minimally necessary for backwards compatiblity
        #  with tools gen1 type parsing, which only used docstrings)
        elif "docstring_type" in docstring_info:
            json_type = python_type_to_json_type(docstring_info["docstring_type"])
            if json_type and (json_type in get_args(JSONType)):
                tool_param = ToolParam(type=json_type)

        # Get default value
        if param.default is param.empty:
            info.parameters.required.append(param_name)
        else:
            tool_param.default = param.default

        # Add description from docstring
        if "description" in docstring_info:
            tool_param.description = docstring_info["description"]

        # append the tool param
        info.parameters.properties[param_name] = tool_param

    # Add function description if available
    if parsed_docstring:
        if parsed_docstring.description:
            info.description = parsed_docstring.description.strip()
        elif parsed_docstring.long_description:
            info.description = parsed_docstring.long_description.strip()
        elif parsed_docstring.short_description:
            info.description = parsed_docstring.short_description.strip()

        # Add examples if available
        if parsed_docstring.examples:
            examples = "\n\n".join(
                [(example.description or "") for example in parsed_docstring.examples]
            )
            info.description = f"{info.description}\n\nExamples\n\n{examples}"

    return info


def parse_docstring(docstring: str | None, param_name: str) -> Dict[str, str]:
    if not docstring:
        return {}

    parsed_docstring: Docstring = parse(docstring)

    for param in parsed_docstring.params:
        if param.arg_name == param_name:
            schema: Dict[str, str] = {"description": param.description or ""}

            if param.type_name:
                schema["docstring_type"] = param.type_name

            return schema

    return {}


def python_type_to_json_type(python_type: str) -> JSONType | None:
    match python_type:
        case "str":
            return "string"
        case "int":
            return "integer"
        case "float":
            return "number"
        case "bool":
            return "boolean"
        case "list":
            return "array"
        case "dict":
            return "object"
        case "None":
            return "null"
        case _:
            return None
```

## `tool/_tool_params.py`

```python
from typing import (
    Literal,
    Optional,
    TypeAlias,
)

from pydantic import BaseModel, Field

from inspect_ai.util._json import JSONSchema

ToolParam: TypeAlias = JSONSchema
"""Description of tool parameter in JSON Schema format."""


class ToolParams(BaseModel):
    """Description of tool parameters object in JSON Schema format."""

    type: Literal["object"] = Field(default="object")
    """Params type (always 'object')"""

    properties: dict[str, ToolParam] = Field(default_factory=dict)
    """Tool function parameters."""

    required: list[str] = Field(default_factory=list)
    """List of required fields."""

    additionalProperties: Optional[JSONSchema] | bool = Field(default=False)
    """Are additional object properties allowed?"""
```

## `tool/_tool_transcript.py`

```python
import re

from pydantic import JsonValue
from rich.console import RenderableType
from rich.markup import escape
from rich.text import Text
from typing_extensions import Protocol

from inspect_ai._util.transcript import transcript_function, transcript_markdown

from ._tool_call import ToolCallContent, substitute_tool_call_content


class TranscriptToolCall(Protocol):
    function: str
    arguments: dict[str, JsonValue]
    view: ToolCallContent | None


def transcript_tool_call(call: TranscriptToolCall) -> list[RenderableType]:
    content: list[RenderableType] = []
    if call.view:
        view = substitute_tool_call_content(call.view, call.arguments)
        if view.title:
            content.append(Text.from_markup(f"[bold]{escape(view.title)}[/bold]\n"))
        if view.format == "markdown":
            content.append(transcript_markdown(_collapse_details(view.content)))
        else:
            content.append(view.content)
    else:
        content.append(transcript_function(call.function, call.arguments))
    return content


def _collapse_details(text: str) -> str:
    """Replace <details> blocks with just their <summary> content."""

    def replace_details(m: re.Match[str]) -> str:
        summary_match = re.search(r"<summary>(.*?)</summary>", m.group(0), re.DOTALL)
        return summary_match.group(1).strip() if summary_match else ""

    return re.sub(r"<details>.*?</details>", replace_details, text, flags=re.DOTALL)
```

## `tool/_tool_util.py`

```python
from ._tool import Tool
from ._tool_def import ToolDef
from ._tool_info import ToolInfo


def tool_to_tool_info(tool: Tool) -> ToolInfo:
    tool_def = ToolDef(tool)
    return ToolInfo(
        name=tool_def.name,
        description=tool_def.description,
        parameters=tool_def.parameters,
        options=tool_def.options,
    )
```

## `tool/_tool_with.py`

```python
from inspect_ai._util.registry import (
    registry_info,
    registry_params,
    set_registry_info,
    set_registry_params,
)
from inspect_ai.tool._tool_call import ToolCallModelInput, ToolCallViewer

from ._tool import TOOL_MODEL_INPUT, TOOL_PARALLEL, TOOL_VIEWER, Tool
from ._tool_description import ToolDescription, set_tool_description
from ._tool_info import parse_tool_info


def tool_with(
    tool: Tool,
    name: str | None = None,
    description: str | None = None,
    parameters: dict[str, str] | None = None,
    parallel: bool | None = None,
    viewer: ToolCallViewer | None = None,
    model_input: ToolCallModelInput | None = None,
) -> Tool:
    """Tool with modifications to various attributes.

    This function modifies the passed tool in place and
    returns it. If you want to create multiple variations
    of a single tool using `tool_with()` you should create
    the underlying tool multiple times.

    Args:
       tool: Tool instance to modify.
       name: Tool name (optional).
       description: Tool description (optional).
       parameters: Parameter descriptions (optional)
       parallel: Does the tool support parallel execution
          (defaults to True if not specified)
       viewer: Optional tool call viewer implementation.
       model_input: Optional function that determines how
           tool call results are played back as model input.

    Returns:
       The passed tool with the requested modifications.
    """
    # get the existing tool info
    tool_info = parse_tool_info(tool)

    # provide parameter overrides
    if parameters:
        signature_param_names = tool_info.parameters.properties.keys()
        for param_name in parameters.keys():
            if param_name not in signature_param_names:
                raise ValueError(
                    f"tool_with error: no parameter named '{param_name}' "
                    + f"(valid parameters are {', '.join(signature_param_names)})"
                )
            tool_info.parameters.properties[param_name].description = parameters[
                param_name
            ]

    # resolve attributes
    info = registry_info(tool).model_copy()
    if parallel is not None:
        info.metadata[TOOL_PARALLEL] = parallel
    elif viewer is not None:
        info.metadata[TOOL_VIEWER] = viewer
    elif model_input is not None:
        info.metadata[TOOL_MODEL_INPUT] = model_input

    # set attributes
    set_registry_info(tool, info)
    set_registry_params(tool, registry_params(tool))
    set_tool_description(
        tool,
        ToolDescription(
            name=name, description=description, parameters=tool_info.parameters
        ),
    )
    return tool
```

## `tool/_tools/__init__.py`

```python

```

## `tool/_tools/_bash_session.py`

```python
from typing import Annotated, Literal

from pydantic import BaseModel, Discriminator, Field, RootModel

from inspect_ai._util._json_rpc import exec_model_request, exec_scalar_request
from inspect_ai.tool import ToolResult
from inspect_ai.tool._sandbox_tools_utils._error_mapper import (
    SandboxToolsErrorMapper,
)
from inspect_ai.tool._sandbox_tools_utils.sandbox import sandbox_with_injected_tools
from inspect_ai.util import StoreModel, store_as
from inspect_ai.util._sandbox._cli import SANDBOX_CLI
from inspect_ai.util._sandbox._json_rpc_transport import SandboxJSONRPCTransport
from inspect_ai.util._sandbox.environment import SandboxEnvironment

from .._tool import Tool, ToolParsingError, tool

# These models are cloned from the container code. If/when we decide to create
# a package that is shared between the inspect and tool-container codebases, we'll
# just have to live with it.


class NewSessionResult(BaseModel):
    session_name: str


class BashRestartResult(BaseModel):
    pass


class BashSessionStore(StoreModel):
    session_id: str = Field(default_factory=str)
    sandbox: SandboxEnvironment | None = Field(default=None)


# Action-specific parameter models


class TypeParams(BaseModel):
    action: Literal["type"] = "type"
    input: str


class TypeSubmitParams(BaseModel):
    action: Literal["type_submit"] = "type_submit"
    input: str


class RestartParams(BaseModel):
    action: Literal["restart"] = "restart"


class ReadParams(BaseModel):
    action: Literal["read"] = "read"


class InterruptParams(BaseModel):
    action: Literal["interrupt"] = "interrupt"


class BashSessionParams(
    RootModel[
        TypeParams | TypeSubmitParams | RestartParams | ReadParams | InterruptParams
    ]
):
    root: Annotated[
        TypeParams | TypeSubmitParams | RestartParams | ReadParams | InterruptParams,
        Discriminator("action"),
    ]


DEFAULT_WAIT_FOR_OUTPUT = 30
DEFAULT_IDLE_TIME = 0.5
# this is how long we're willing to wait for the basic RPC call overhead.
TRANSPORT_TIMEOUT = 180  # Some K8's deployments can be very slow


@tool()
def bash_session(
    *,
    timeout: int | None = None,  # default is max_wait + 5 seconds
    wait_for_output: int | None = None,  # default is 30 seconds
    user: str | None = None,
    instance: str | None = None,
) -> Tool:
    """Interactive bash shell session tool.

    Interact with a bash shell in a long running session using a sandbox
    environment (e.g. "docker"). This tool allows sending text to the shell,
    which could be a command followed by a newline character or any other input
    text such as the response to a password prompt.

    To create a separate bash process for each
    call to `bash_session()`, pass a unique value for `instance`

    See complete documentation at <https://inspect.aisi.org.uk/tools-standard.html#sec-bash-session>.

    Args:
      timeout: Timeout (in seconds) for command.
      wait_for_output: Maximum time (in seconds) to wait for output. If no
          output is received within this period, the function will return an
          empty string. The model may need to make multiple tool calls to obtain
          all output from a given command.
      user: Username to run commands as
      instance: Instance id (each unique instance id has its own bash process)

    Returns:
      String with output from the shell.
    """
    wait_for_output = wait_for_output or DEFAULT_WAIT_FOR_OUTPUT
    min_timeout = wait_for_output + TRANSPORT_TIMEOUT
    if timeout is None:
        timeout = min_timeout
    elif timeout < min_timeout:
        raise ValueError(
            f"Timeout must be at least {min_timeout} seconds, but got {timeout}."
        )

    async def execute(
        action: Literal["type", "type_submit", "restart", "read", "interrupt"],
        input: str | None = None,
    ) -> ToolResult:
        r"""
        Interact with a bash shell.

        Interact with a bash shell by sending it input text and retrieving output
        from it. There is no guarantee that all output will be returned in a
        single call. Call this function multiple times to retrieve additional
        output from the shell.

        USAGE NOTES:
        - Ensure that the shell is at a command prompt (typically when the
          output ends in "$ " or "# ") before submitting a new command.
        - Control characters must be sent as Unicode escape sequences (e.g., use
          "\u0003" for Ctrl+C/ETX, "\u0004" for Ctrl+D/EOT). The literal string
          "Ctrl+C" will not be interpreted as a control character.
        - Use the "read" action to retrieve output from the shell without
          sending any input. This is useful for long-running commands that
          produce output over time. The "read" action will return any new output
          since the last call.
        - If a long-running command is in progress, additional input to execute
          a new command will not be processed until the previous completes. To
          abort a long-running command, use the "interrupt" action:
          `bash_session(action="interrupt")`
        - If output ends with "> " (the shell's continuation prompt), it means
          the previous input contained unmatched quotes, backticks, or other
          incomplete syntax. Either complete the quoted input or use the
          "interrupt" action to cancel, then retry with corrected input.

        Example use case:
        - For a short-running command with a nominal amount of output, a single
          call may suffice.
          ```
          bash_session(action="type_submit", input="echo foo") -> "foo\nuser@host:/# "
          ```
        - For a long-running command with output over time, multiple calls to are needed.
          ```
          bash_session(action="type_submit", input="tail -f /tmp/foo.log") -> <some output>
          bash_session(action="read") -> <more output>
          # Send interrupt (Ctrl+C)
          bash_session(action="interrupt") -> "<final output>^Cuser@host:/# "
          ```
        - Interactive command awaiting more input from the user.
          ```
          bash_session(action="type_submit", input="ssh fred@foo.com") -> "foo.com's password: "
          bash_session(action="type_submit", input="secret") -> "fred@foo.com:~$ "
          ```

        Args:
          action: The action to execute:
                - "type": Send input without a return key
                - "type_submit": Send input followed by a return key
                - "read": Read any new output without sending input
                - "interrupt": Send a Ctrl+C (ETX character) to interrupt the current process
                - "restart": Restart the bash session
          input: The input to send to the shell.
                Required for "type". Optional for "type_submit" actions. Must
                not be provided for "restart", "read", or "interrupt" actions.

        Returns:
          The accumulated output of the shell.
        """
        # Validate parameters based on action
        match action:
            case "type":
                if input is None:
                    raise ToolParsingError(
                        f"'input' is required for '{action}' action."
                    )
            case "restart" | "read" | "interrupt":
                if input is not None:
                    raise ToolParsingError(
                        f"Do not provide 'input' with '{action}' action."
                    )

        store = store_as(BashSessionStore, instance=instance)
        sandbox = await _get_sandbox(store)

        # Create transport for all RPC calls
        transport = SandboxJSONRPCTransport(sandbox, SANDBOX_CLI)

        if not store.session_id:
            try:
                store.session_id = (
                    await exec_model_request(
                        method="bash_session_new_session",
                        params={},
                        result_type=NewSessionResult,
                        transport=transport,
                        error_mapper=SandboxToolsErrorMapper,
                        timeout=TRANSPORT_TIMEOUT,
                        user=user,
                    )
                ).session_name
            except TimeoutError:
                raise RuntimeError("Timed out creating new session")

        timing: dict[str, object] = {
            "wait_for_output": wait_for_output,
            "idle_timeout": DEFAULT_IDLE_TIME,
        }
        action_specific: dict[str, dict[str, object]] = {
            "type": {"input": input, **timing},
            "type_submit": {"input": f"{input}\n", **timing},
            "interrupt": {"input": "\u0003", **timing},
            "read": timing,
            "restart": {"restart": True},
        }

        result = await exec_scalar_request(
            method="bash_session",
            params={"session_name": store.session_id, **(action_specific[action])},
            result_type=str,
            transport=transport,
            error_mapper=SandboxToolsErrorMapper,
            timeout=timeout,
            user=user,
        )

        # Return the appropriate response
        return (
            "Bash session restarted."
            if isinstance(result, BashRestartResult)
            else result
        )

    return execute


async def _get_sandbox(store: BashSessionStore) -> SandboxEnvironment:
    if not store.sandbox:
        store.sandbox = await sandbox_with_injected_tools()

    return store.sandbox
```

## `tool/_tools/_code_execution.py`

```python
from typing import Any, Literal, TypeAlias, get_args

from typing_extensions import TypedDict

from inspect_ai.tool._tool import Tool, ToolResult, tool
from inspect_ai.tool._tool_def import ToolDef
from inspect_ai.tool._tools._execute import code_viewer, python

CodeExecutionProvider: TypeAlias = Literal[
    "openai", "anthropic", "google", "grok", "mistral", "python"
]
"""Model providers that support native `code_execution()` tools."""

valid_providers = set(get_args(CodeExecutionProvider))


class CodeExecutionProviders(TypedDict, total=False):
    """Provider configuration for `code_execution()` tool.

    The `code_execution()` tool provides models the ability to execute code using an sandboxed environment. Several model providers including OpenAI, Anthropic, Google, Grok, and Mistral have native support for code execution (where code is executed on the provider's servers).

    By default, native code execution is enabled for all providers that support it. If you are using a provider that doesn't support code execution then a fallback using the `python()` tool is available. Additionally, you can optionally disable code execution for a provider with a native implementation and use the `python()` tool instead.

    Each model provider has a field that can be used to disable native code execution. For some providers (e.g. OpenAI) a `dict` of provider specific options may also be passed.

    When falling back to the `python()` provider you should ensure that your `Task` has a `sandbox` with support for executing Python code enabled.
    """

    openai: dict[str, Any] | bool
    """Use OpenAI native code interpreter. Defaults to `True`. Pass `False` to use a sandbox instead or pass a `dict` with custom options (see  <https://platform.openai.com/docs/guides/tools-code-interpreter>)."""

    anthropic: bool
    """Use Anthropoic native code execution. Defaults to `True`. Pass `False` to use a sandbox instead."""

    google: bool
    """Use Google native code execution. Defaults to `True`. Pass `False` to use a sandbox instead."""

    grok: bool
    """Use Grok native code execution. Defaults to `True`. Pass `False` to use a sandbox instead."""

    mistral: bool
    """Use Mistral native code execution. Defaults to `True`. Pass `False` to use a sandbox instead."""

    python: dict[str, Any] | bool
    """Use `python()` tool as a fallback for providers that don't support code execution. Defaults to `True`. Pass `False` to disable the fallback or pass a `dict` with `python()` tool options (`timeout` and `sandbox`)"""


@tool(viewer=code_viewer("python", "code", title="code_execution"))
def code_execution(
    *,
    providers: CodeExecutionProviders | None = None,
) -> Tool:
    """Code execution tool.

    The `code_execution()` tool provides models the ability to execute code using a sandboxed environment. Several model providers including OpenAI, Anthropic, Google, Grok, and Mistral have native support for code execution (where the code is executed on the provider's servers).

    By default, native code execution is enabled for all providers that support it. If you are using a provider that doesn't support code execution then a fallback using the `python()` tool is available. Additionally, you can optionally disable code execution for a provider with a native implementation and use the `python()` tool instead.

    The `providers` option enables selective disabling of native code execution for providers. For some providers (e.g. OpenAI) a `dict` of provider specific options may also be provided.

    When falling back to the `python()` provider you should ensure that your `Task` has a `sandbox` with support for executing Python code enabled.

    See further documentation at <https://inspect.aisi.org.uk/tools-standard.html#sec-code-execution>.

    Args:
      providers: Configuration for the code execution providers to use. Currently supported providers are "openai", "anthropic", "google", "grok", "mistral", and "python". For example:

        ```python
        # default (native interpreter for all providers, `python()` as fallback):
        code_interpreter()

        # disable native code interpeter for some providers:
        code_interpreter({ "grok": False, "openai": False })

        # disable python fallback
        code_interpreter({ "python": False })

        # provide openai container options
        code_interpreter(
            {"openai": {"container": {"type": "auto", "memory_limit": "4g" }}}
        )
        ```
    """
    # normalize various config syntaxes
    normalized_providers = _normalize_config(providers)

    # default implementation is just the python tool
    python_tool: Tool | None = None
    python_sandbox: str | None = None
    python_timeout: int | None = None
    if "python" in normalized_providers.keys():
        python_options = normalized_providers["python"]
        python_timeout = python_options.get("timeout", None)
        python_sandbox = python_options.get("sandbox", None)
        python_tool = python(timeout=python_timeout, sandbox=python_sandbox)

    async def execute(code: str) -> ToolResult:
        """
        Use the python function to execute Python code.

        The Python tool executes single-run Python scripts. Important notes:
        1. Each execution is independent - no state is preserved between runs
        2. You must explicitly use print() statements to see any output
        3. Simply writing expressions (like in notebooks) will not display results
        4. The script cannot accept interactive input during execution
        5. Return statements alone won't produce visible output
        6. All variables and imports are cleared between executions
        7. Standard output (via print()) is the only way to see results

        Args:
          code (str): The python code to execute.

        Returns:
          The output of the Python code.
        """
        if python_tool is not None:
            return await python_tool(code)
        else:
            raise RuntimeError(
                "Fallback for `code_execution()` tool requires that `python` be enabled."
            )

    return ToolDef(
        execute,
        name="code_execution",
        options=dict(providers=normalized_providers),
    ).as_tool()


class _NormalizedProviders(TypedDict, total=False):
    openai: dict[str, Any]
    anthropic: dict[str, Any]
    google: dict[str, Any]
    grok: dict[str, Any]
    mistral: dict[str, Any]
    python: dict[str, Any]


def _normalize_config(
    providers: CodeExecutionProviders | None = None,
) -> _NormalizedProviders:
    # default to all providers enabled
    normalized = _NormalizedProviders(
        openai={}, anthropic={}, google={}, grok={}, mistral={}, python={}
    )
    for provider, options in (providers or {}).items():
        # dict means explicit options
        if isinstance(options, dict):
            normalized[provider] = options  # type: ignore[literal-required]

        # False means blank it out
        elif options is False:
            normalized.pop(provider)  # type: ignore[misc]

        # else leave it alone
        else:
            pass

    return normalized
```

## `tool/_tools/_computer/__init__.py`

```python
from ._computer import computer, is_computer_tool_info

__all__ = ["computer", "is_computer_tool_info"]
```

## `tool/_tools/_computer/_common.py`

```python
import json
from textwrap import dedent
from typing import Literal

from pydantic import BaseModel, Field

from inspect_ai._util.content import ContentText
from inspect_ai._util.error import PrerequisiteError
from inspect_ai.model import ContentImage
from inspect_ai.tool import ToolError, ToolResult
from inspect_ai.util._sandbox.context import sandbox_with
from inspect_ai.util._sandbox.environment import SandboxEnvironment


class ToolExecResult(BaseModel):
    output: str | None = Field(default=None)
    error: str | None = Field(default=None)
    base64_image: str | None = Field(default=None)


async def cursor_position(timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["cursor_position"], timeout=timeout)


async def screenshot(timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["screenshot"], timeout=timeout)


async def wait(duration: int, timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["wait", "--duration", f"{duration}"], timeout=timeout)


async def mouse_move(coordinate: list[int], timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        ["mouse_move", "--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"],
        timeout=timeout,
    )


async def left_mouse_down(timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["left_mouse_down"], timeout=timeout)


async def left_mouse_up(timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["left_mouse_up"], timeout=timeout)


async def left_click(coordinate: list[int], timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        ["left_click", "--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"],
        timeout=timeout,
    )


async def left_click_drag(
    start_coordinate: list[int], coordinate: list[int], timeout: int | None = None
) -> ToolResult:
    return await _send_cmd(
        [
            "left_click_drag",
            "--start_coordinate",
            f"{start_coordinate[0]}",
            f"{start_coordinate[1]}",
            "--coordinate",
            f"{coordinate[0]}",
            f"{coordinate[1]}",
        ],
        timeout=timeout,
    )


async def right_click(coordinate: list[int], timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        ["right_click", "--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"],
        timeout=timeout,
    )


async def middle_click(coordinate: list[int], timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        ["middle_click", "--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"],
        timeout=timeout,
    )


async def back_click(coordinate: list[int], timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        ["back_click", "--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"],
        timeout=timeout,
    )


async def forward_click(
    coordinate: list[int], timeout: int | None = None
) -> ToolResult:
    return await _send_cmd(
        ["forward_click", "--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"],
        timeout=timeout,
    )


async def double_click(coordinate: list[int], timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        ["double_click", "--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"],
        timeout=timeout,
    )


async def triple_click(coordinate: list[int], timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        ["triple_click", "--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"],
        timeout=timeout,
    )


async def scroll(
    scroll_amount: int,
    scroll_direction: Literal["up", "down", "left", "right"],
    coordinate: list[int] | None,
    timeout: int | None = None,
) -> ToolResult:
    return await _send_cmd(
        [
            "scroll",
            "--scroll_amount",
            f"{scroll_amount}",
            "--scroll_direction",
            f"{scroll_direction}",
        ]
        + (
            ["--coordinate", f"{coordinate[0]}", f"{coordinate[1]}"]
            if coordinate
            else []
        ),
        timeout=timeout,
    )


async def press_key(key: str, timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["key", "--text", _normalize_key_text(key)], timeout=timeout)


async def hold_key(key: str, duration: int, timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        ["hold_key", "--text", _normalize_key_text(key), "--duration", f"{duration}"],
        timeout=timeout,
    )


async def type(text: str, timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["type", f"--text={text}"], timeout=timeout)


async def zoom(region: list[int], timeout: int | None = None) -> ToolResult:
    return await _send_cmd(
        [
            "zoom",
            "--region",
            str(region[0]),
            str(region[1]),
            str(region[2]),
            str(region[3]),
        ],
        timeout=timeout,
    )


async def open_web_browser(timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["open_web_browser"], timeout=timeout)


async def navigate(text: str, timeout: int | None = None) -> ToolResult:
    return await _send_cmd(["navigate", "--text", text], timeout=timeout)


async def _send_cmd(cmdTail: list[str], timeout: int | None = None) -> ToolResult:
    from inspect_ai.log._samples import sample_active

    sample = sample_active()
    assert sample
    sample_id = sample.sample.id
    assert sample_id

    cmd = ["python3", "/opt/inspect/tool/computer_tool.py"] + cmdTail

    raw_exec_result = await (await computer_sandbox()).exec(cmd, timeout=timeout)

    if not raw_exec_result.success:
        raise RuntimeError(
            f"Failure executing command: ${cmd} {raw_exec_result.stderr}"
        )

    result = ToolExecResult(**json.loads(raw_exec_result.stdout))

    if result.error:
        raise ToolError(result.error)

    image = (
        ContentImage(image=f"data:image/png;base64,{result.base64_image}")
        if result.base64_image
        else None
    )
    text = result.output if result.output and len(result.output) > 0 else None

    if text is not None and image is not None:
        return [ContentText(text=text), image]

    if text is not None:
        return text

    if image is not None:
        return [image]

    return "OK"


# Translate model key names to xdotool keysyms.
#
# xdotool's XStringToKeysym is case-sensitive (e.g. "Return" not "return").
# Anthropic's reference impl (anthropics/anthropic-quickstarts) passes key text
# straight to xdotool with no normalization, implying Claude is trained to emit
# xdotool keysyms — but this isn't formally documented.  OpenAI uses its own key
# vocabulary (UPPERCASE), mapped upstream in _openai_computer_use.py.  Non-native
# models see the tool docstring which lists xdotool examples.
#
# This table handles case normalization of keysyms plus common alternate names
# (e.g. "Enter" -> "Return").  Unrecognized keys pass through to xdotool which
# will error back to the model.  Modifiers (ctrl/alt/shift/super/meta) are
# already case-insensitive in xdotool so they're excluded.  Single characters
# are handled separately in _normalize_key_combo.
_KEY_ALIASES: dict[str, str] = {}
for _name in [
    "Return",
    "Escape",
    "BackSpace",
    "Tab",
    "Delete",
    "Insert",
    "Home",
    "End",
    "Prior",
    "Next",
    "Left",
    "Up",
    "Right",
    "Down",
    "Pause",
    "space",
    "Scroll_Lock",
    "Num_Lock",
    "Caps_Lock",
    "Shift_L",
    "Shift_R",
    "Control_L",
    "Control_R",
    "Alt_L",
    "Alt_R",
    "Super_L",
    "Super_R",
    "Meta_L",
    "Meta_R",
    *[f"F{i}" for i in range(1, 13)],
    *[
        f"KP_{s}"
        for s in [
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "Enter",
            "Add",
            "Subtract",
            "Multiply",
            "Divide",
            "Decimal",
            "Equal",
            "Home",
            "Up",
            "Prior",
            "Left",
            "Begin",
            "Right",
            "End",
            "Down",
            "Next",
            "Insert",
            "Delete",
        ]
    ],
]:
    _KEY_ALIASES[_name.lower()] = _name

# Common alternate names that models use but aren't xdotool keysyms.
_KEY_ALIASES.update(
    {
        "enter": "Return",
        "esc": "Escape",
        "pageup": "Prior",
        "pagedown": "Next",
        "arrowleft": "Left",
        "arrowup": "Up",
        "arrowright": "Right",
        "arrowdown": "Down",
        # Modifier abbreviations — map to xdotool's built-in aliases
        "ctl": "ctrl",
        "control": "ctrl",
        "cmd": "super",
        "command": "super",
        "win": "super",
        "windows": "super",
        "opt": "alt",
        "option": "alt",
    }
)


def _normalize_key_combo(combo: str) -> str:
    """Normalize a single key combo (e.g. "ctrl+ENTER") for xdotool."""
    parts = combo.split("+")
    is_combo = len(parts) > 1
    normalized = []
    for part in parts:
        if len(part) == 1 and part.isalpha():
            normalized.append(part.lower() if is_combo else part)
        else:
            normalized.append(_KEY_ALIASES.get(part.lower(), part))
    return "+".join(normalized)


def _normalize_key_text(text: str) -> str:
    """Normalize key text which may contain space-separated combos."""
    return " ".join(_normalize_key_combo(part) for part in text.split())


async def computer_sandbox() -> SandboxEnvironment:
    sb = await sandbox_with("/opt/inspect/tool/computer_tool.py")
    if sb:
        return sb
    else:
        raise PrerequisiteError(
            dedent("""
                The computer tool service was not found in any of the sandboxes for this sample. Please add the computer tool service to your configuration. For example, the following Docker compose file uses the aisiuk/inspect-computer-tool image as its default sandbox:

                services:
                  default:
                    image: "aisiuk/inspect-computer-tool"
                    init: true
                """).strip()
        )
```

## `tool/_tools/_computer/_computer.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Awaitable, Callable, Literal, TypeVar, cast

if TYPE_CHECKING:
    from inspect_ai.tool._tool_info import ToolInfo

from inspect_ai._util.content import Content, ContentImage, ContentText
from inspect_ai.tool import Tool, ToolResult, tool
from inspect_ai.tool._tool import TOOL_INIT_MODEL_INPUT, ToolParsingError
from inspect_ai.tool._tool_call import ToolCallModelInput, ToolCallModelInputHints
from inspect_ai.tool._tool_info import ToolInfo

from . import _common as common

# this is duplicated from ._resources.tool._constants import Action
# changes should be synchronized!

Action = Literal[
    "key",
    "hold_key",
    "type",
    "cursor_position",
    "mouse_move",
    "left_mouse_down",
    "left_mouse_up",
    "left_click",
    "left_click_drag",
    "right_click",
    "middle_click",
    "back_click",
    "forward_click",
    "double_click",
    "triple_click",
    "scroll",
    "wait",
    "screenshot",
    "zoom",
    "open_web_browser",
    "navigate",
]


ActionFunction = Callable[[str], ToolResult | Awaitable[ToolResult]]

_COMPUTER_TOOL_PARAMETERS: frozenset[str] = frozenset(
    [
        "action",
        "coordinate",
        "duration",
        "region",
        "scroll_amount",
        "scroll_direction",
        "start_coordinate",
        "text",
        "actions",
    ]
)


def is_computer_tool_info(tool: ToolInfo) -> bool:
    """Check whether a ToolInfo is inspect's built-in computer() tool - this tool.

    Model providers use this to decide whether to substitute their native
    computer-use support. Comparing just the name is insufficient because a
    third-party tool could share the name "computer".
    """
    return (
        tool.name == "computer"
        and tool.parameters.properties.keys() == _COMPUTER_TOOL_PARAMETERS
    )


@tool
def computer(max_screenshots: int | None = 1, timeout: int | None = 180) -> Tool:
    """Desktop computer tool.

    See documentation at <https://inspect.aisi.org.uk/tools-standard.html#sec-computer>.

    Args:
      max_screenshots: The maximum number of screenshots to play
        back to the model as input. Defaults to 1 (set to `None` to have no limit).
      timeout: Timeout in seconds for computer tool actions.
        Defaults to 180 (set to `None` for no timeout).
    """

    # NOTE: Models with native computer use (Anthropic, OpenAI) never see this
    # docstring or parameter schema — they use provider-specific tool params
    # (e.g. ComputerUseToolParam, BetaToolComputerUse*Param). This signature
    # only matters for models without native support, where the added complexity
    # of the `actions` parameter is acceptable.
    async def execute(
        action: Action | None = None,
        coordinate: list[int] | None = None,
        duration: int | None = None,
        region: list[int] | None = None,
        scroll_amount: int | None = None,
        scroll_direction: Literal["up", "down", "left", "right"] | None = None,
        start_coordinate: list[int] | None = None,
        text: str | None = None,
        actions: list[dict[str, object]] | None = None,
    ) -> ToolResult:
        """
        Use this tool to interact with a computer.

        Use a mouse and keyboard to interact with a computer's desktop GUI.

        Keep in mind that icons require double clicks to open while other UI affordances like menu items and buttons require a single click.

        Args:
          action (Action): The action to perform.
              - `key`: Press a key or key-combination on the keyboard.
                  - Example: execute(action="key", text="ctrl+s")
                  - Text can be any key name supported by xdotool's `key` such as:
                      "Return", "Escape", "alt+Tab", "BackSpace", "Tab", "alt+Tab", "ctrl+s", "Up", "KP_0" (for the numpad 0 key),
                      "Insert", "Delete", "Home", "End", "Prior", "Next", "Left", "Up", "Right", "Down",
                      "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
                      "Shift_L", "Shift_R", "Control_L", "Control_R", "Alt_L", "Alt_R", "Scroll_Lock", "Num_Lock", "Caps_Lock", "Pause",
                      "KP_Multiply", "KP_Home", "KP_Up", "KP_Prior", "KP_Subtract", "KP_Left", "KP_Begin", "KP_Right", "KP_Add", "KP_End","KP_Down",
                      "KP_Next", "KP_Insert", "KP_Delete", "KP_Enter", "KP_Divide", "KP_Equal", "KP_Decimal",
              - 'hold_key': Hold down a key or multiple keys for a specified duration (in seconds). Supports the same syntax as `key`.
              - `type`: Type a string of text on the keyboard. If the text contains spaces, enclose it in quotes.
                  - Example: execute(action="type", text="The crux of the biscuit is the apostrophe!")
              - `cursor_position`: Get the current (x, y) pixel coordinate of the cursor on the screen.
              - `mouse_move`: Move the cursor to a specified (x, y) pixel coordinate on the screen.
                  - Example: execute(action="mouse_move", coordinate=(100, 200))
              - `left_mouse_down`: Press the left mouse button.
              - `left_mouse_up`: Release the left mouse button.
              - `left_click`: Click the left mouse button.
              - `left_click_drag`: Click and drag the cursor to a specified (x, y) pixel coordinate on the screen.
                  - Example: execute(action="left_click_drag", coordinate=(150, 250))
              - `right_click`: Click the right mouse button.
              - `middle_click`: Click the middle mouse button.
              - `back_click`: Click the 'back' mouse button.
              - `forward_click`: Click the 'forward' mouse button.
              - `double_click`: Double-click the left mouse button.
              - `triple_click`: Triple-click the left mouse button.
              - `wait`: Wait for a specified duration (in seconds).
              - `screenshot`: Take a screenshot.
              - `zoom`: Take a zoomed-in screenshot of a specified region at native resolution.
                  - Example: execute(action="zoom", region=[100, 100, 500, 400])
              - `open_web_browser`: Open the web browser in full screen view.
              - `navigate`: Navigate to a URL in the browser.
                  - Example: execute(action="navigate", text="https://example.com")
          coordinate (tuple[int, int] | None): The (x, y) pixel coordinate on the screen to which to move or drag. Required only by `action=mouse_move` and `action=left_click_drag`.
          duration (int | None): The duration to wait or hold the key down for. Required only by `action=hold_key` and `action=wait`.
          region (list[int] | None): The region to zoom into as [x0, y0, x1, y1] coordinates. Required only by `action=zoom`.
          scroll_amount (int | None): The number of 'clicks' to scroll. Required only by `action=scroll`.
          scroll_direction (Literal["up", "down", "left", "right] | None): The direction to scroll the screen. Required only by `action=scroll`.
          start_coordinate (tuple[int, int] | None): The (x, y) pixel coordinate on the screen from which to initiate a drag. Required only by `action=scroll`.
          text (str | None): The text to type or the key to press. Required when action is "key" or "type".
          actions (list[dict] | None): A list of action dicts to execute sequentially (OpenAI multi-action format).

        Returns:
          The output of the command. Many commands will include a screenshot reflecting the result of the command in their output.
        """
        action_list = (
            actions
            if actions is not None
            else [
                _build_action_args(
                    action,
                    coordinate,
                    duration,
                    region,
                    scroll_amount,
                    scroll_direction,
                    start_coordinate,
                    text,
                )
            ]
            if action is not None
            else None
        )
        assert action_list, "Either 'action' or 'actions' must be provided"

        result: ToolResult = "OK"
        for action_args in action_list:
            result = await _execute_single_action(action_args, timeout)
        return result

    async def _execute_single_action(
        args: dict[str, object], timeout: int | None
    ) -> ToolResult:
        action = str(args.get("action", ""))
        coordinate = cast(list[int] | None, args.get("coordinate"))
        text = cast(str | None, args.get("text"))
        duration = cast(int | None, args.get("duration"))
        scroll_amount = cast(int | None, args.get("scroll_amount"))
        scroll_direction = cast(
            Literal["up", "down", "left", "right"] | None,
            args.get("scroll_direction"),
        )
        start_coordinate = cast(list[int] | None, args.get("start_coordinate"))
        region = cast(list[int] | None, args.get("region"))

        match action:
            case "key":
                return await common.press_key(not_none(text, "text"), timeout=timeout)
            case "hold_key":
                return await common.hold_key(
                    not_none(text, "text"),
                    not_none(duration, "duration"),
                    timeout=timeout,
                )
            case "type":
                if coordinate is not None:
                    await common.left_click(coordinate, timeout=timeout)
                return await common.type(not_none(text, "text"), timeout=timeout)
            case "cursor_position":
                return await common.cursor_position(timeout=timeout)
            case "mouse_move":
                return await common.mouse_move(
                    not_none(coordinate, "coordinate"), timeout=timeout
                )
            case "left_mouse_down":
                return await common.left_mouse_down(timeout=timeout)
            case "left_mouse_up":
                return await common.left_mouse_up(timeout=timeout)
            case "left_click":
                return await common.left_click(
                    not_none(coordinate, "coordinate"), timeout=timeout
                )
            case "left_click_drag":
                return await common.left_click_drag(
                    not_none(start_coordinate, "start_coordinate"),
                    not_none(coordinate, "coordinate"),
                    timeout=timeout,
                )
            case "right_click":
                return await common.right_click(
                    not_none(coordinate, "coordinate"), timeout=timeout
                )
            case "middle_click":
                return await common.middle_click(
                    not_none(coordinate, "coordinate"), timeout=timeout
                )
            case "back_click":
                return await common.back_click(
                    not_none(coordinate, "coordinate"), timeout=timeout
                )
            case "forward_click":
                return await common.forward_click(
                    not_none(coordinate, "coordinate"), timeout=timeout
                )
            case "double_click":
                return await common.double_click(
                    not_none(coordinate, "coordinate"), timeout=timeout
                )
            case "triple_click":
                return await common.triple_click(
                    not_none(coordinate, "coordinate"), timeout=timeout
                )
            case "scroll":
                return await common.scroll(
                    not_none(scroll_amount, "scroll_amount"),
                    not_none(scroll_direction, "scroll_direction"),
                    coordinate,
                    timeout=timeout,
                )
            case "wait":
                return await common.wait(
                    not_none(duration, "duration"), timeout=timeout
                )
            case "screenshot":
                return await common.screenshot(timeout=timeout)
            case "zoom":
                return await common.zoom(not_none(region, "region"), timeout=timeout)
            case "open_web_browser":
                return await common.open_web_browser(timeout=timeout)
            case "navigate":
                return await common.navigate(not_none(text, "text"), timeout=timeout)

        raise ToolParsingError(f"Invalid action: {action}")

    def _build_action_args(
        action: Action,
        coordinate: list[int] | None,
        duration: int | None,
        region: list[int] | None,
        scroll_amount: int | None,
        scroll_direction: Literal["up", "down", "left", "right"] | None,
        start_coordinate: list[int] | None,
        text: str | None,
    ) -> dict[str, object]:
        return {
            k: v
            for k, v in dict(
                action=action,
                coordinate=coordinate,
                duration=duration,
                region=region,
                scroll_amount=scroll_amount,
                scroll_direction=scroll_direction,
                start_coordinate=start_coordinate,
                text=text,
            ).items()
            if v is not None
        }

    # if max_screenshots is specified then polk model input into where @tool can find it
    if max_screenshots is not None:
        setattr(execute, TOOL_INIT_MODEL_INPUT, _computer_model_input(max_screenshots))

    return execute


def _computer_model_input(max_screenshots: int) -> ToolCallModelInput:
    def model_input(
        message_index: int,
        message_total: int,
        content: str | list[Content],
        hints: ToolCallModelInputHints,
    ) -> str | list[Content]:
        if hints.get("disable_computer_screenshot_truncation", False):
            return content

        # nothing to do for scalars
        if isinstance(content, str):
            return content

        # if we are inside max_screenshots then return as is
        elif (message_total - message_index) <= max_screenshots:
            return content

        # otherwise convert images to text placeholdrs
        else:
            input_content: list[Content] = []
            for c in content:
                if isinstance(c, ContentImage):
                    input_content.append(
                        ContentText(
                            text="Screenshot removed to reduce size of input. Please consult the latest screenshots for the most up to date state of the screen."
                        )
                    )
                else:
                    input_content.append(c)
            return input_content

    return model_input


T = TypeVar("T")


def not_none(value: T | None, name: str) -> T:
    if value is None:
        raise ToolParsingError(f"{name} must be provided")
    return value
```

## `tool/_tools/_computer/_resources/test_args.py`

```python
import pytest

from .tool._args import parse_arguments


def test_parse_args_screenshot() -> None:
    args = parse_arguments(["screenshot"])
    assert args.action == "screenshot"


def test_parse_args_cursor_position() -> None:
    args = parse_arguments(["cursor_position"])
    assert args.action == "cursor_position"


def test_parse_args_type() -> None:
    args = parse_arguments(["type", "--text", "hello"])
    assert args.action == "type"
    assert args.text == "hello"


def test_parse_args_mouse_move() -> None:
    args = parse_arguments(["mouse_move", "--coordinate", "100", "200"])
    assert args.action == "mouse_move"
    assert args.coordinate == [100, 200]


def test_parse_args_left_click() -> None:
    args = parse_arguments(["left_click", "--coordinate", "100", "200"])
    assert args.action == "left_click"
    assert args.coordinate == [100, 200]


def test_parse_args_right_click() -> None:
    args = parse_arguments(["right_click", "--coordinate", "100", "200"])
    assert args.action == "right_click"
    assert args.coordinate == [100, 200]


def test_parse_args_middle_click() -> None:
    args = parse_arguments(["middle_click", "--coordinate", "100", "200"])
    assert args.action == "middle_click"
    assert args.coordinate == [100, 200]


def test_parse_args_double_click() -> None:
    args = parse_arguments(["double_click", "--coordinate", "100", "200"])
    assert args.action == "double_click"
    assert args.coordinate == [100, 200]


def test_parse_args_triple_click() -> None:
    args = parse_arguments(["triple_click", "--coordinate", "100", "200"])
    assert args.action == "triple_click"
    assert args.coordinate == [100, 200]


def test_parse_args_hold_key() -> None:
    args = parse_arguments(["hold_key", "--text", "a", "--duration", "5"])
    assert args.action == "hold_key"
    assert args.text == "a"
    assert args.duration == 5


def test_parse_args_left_click_drag() -> None:
    args = parse_arguments(
        [
            "left_click_drag",
            "--start_coordinate",
            "100",
            "200",
            "--coordinate",
            "300",
            "400",
            "--text",
            "drag",
        ]
    )
    assert args.action == "left_click_drag"
    assert args.start_coordinate == [100, 200]
    assert args.coordinate == [300, 400]
    assert args.text == "drag"


def test_parse_args_scroll() -> None:
    args = parse_arguments(
        [
            "scroll",
            "--scroll_direction",
            "up",
            "--scroll_amount",
            "10",
            "--coordinate",
            "100",
            "200",
        ]
    )
    assert args.action == "scroll"
    assert args.scroll_direction == "up"
    assert args.scroll_amount == 10
    assert args.coordinate == [100, 200]


def test_parse_args_wait() -> None:
    args = parse_arguments(["wait", "--duration", "5"])
    assert args.action == "wait"
    assert args.duration == 5


def test_parse_args_type_missing_text() -> None:
    with pytest.raises(SystemExit):
        parse_arguments(["type"])


def test_parse_args_invalid_action() -> None:
    with pytest.raises(SystemExit):
        parse_arguments(["invalid_action"])


def test_parse_args_mouse_move_missing_coordinate() -> None:
    with pytest.raises(SystemExit):
        parse_arguments(["mouse_move"])


def test_parse_args_click_invalid_coordinate() -> None:
    with pytest.raises(SystemExit):
        parse_arguments(["left_click", "--coordinate", "100"])


def test_parse_args_hold_key_missing_duration() -> None:
    with pytest.raises(SystemExit):
        parse_arguments(["hold_key", "--text", "a"])


def test_parse_args_left_click_drag_missing_start_coordinate() -> None:
    with pytest.raises(SystemExit):
        parse_arguments(
            ["left_click_drag", "--coordinate", "300", "400", "--text", "drag"]
        )


def test_parse_args_scroll_missing_scroll_direction() -> None:
    with pytest.raises(SystemExit):
        parse_arguments(
            ["scroll", "--scroll_amount", "10", "--coordinate", "100", "200"]
        )


def test_parse_args_wait_missing_duration() -> None:
    with pytest.raises(SystemExit):
        parse_arguments(["wait"])
```

## `tool/_tools/_computer/_resources/tool/__init__.py`

```python

```

## `tool/_tools/_computer/_resources/tool/_args.py`

```python
from argparse import Action, ArgumentParser, Namespace
from typing import Sequence


def parse_arguments(args: Sequence[str] | None = None) -> Namespace:
    return _create_parser().parse_args(args)


def _create_parser() -> ArgumentParser:
    parser = ArgumentParser(prog="computer_tool")
    subparsers = parser.add_subparsers(dest="action", required=True)

    # these take no additional arguments
    subparsers.add_parser(
        "screenshot",
        aliases=["cursor_position", "left_mouse_down", "left_mouse_up"],
    )

    subparsers.add_parser("open_web_browser")

    navigate = subparsers.add_parser("navigate")
    _add_text(navigate)

    key_and_type = subparsers.add_parser("type", aliases=["key"])
    _add_text(key_and_type)

    hold_key = subparsers.add_parser("hold_key")
    _add_text(hold_key)
    _add_duration(hold_key)

    mouse_move = subparsers.add_parser("mouse_move")
    _add_coordinate(mouse_move)

    click = subparsers.add_parser(
        "left_click",
        aliases=["right_click", "middle_click", "double_click", "triple_click"],
    )
    _add_coordinate(click, False)
    _add_text(click, False)

    left_click_drag = subparsers.add_parser("left_click_drag")
    _add_start_coordinate(left_click_drag)
    _add_coordinate(left_click_drag)
    _add_text(left_click_drag, False)

    scroll = subparsers.add_parser("scroll")
    _add_scroll_direction(scroll)
    _add_scroll_amount(scroll)
    # despite what the doc says, the model doesn't always provide a coordinate
    _add_coordinate(scroll, False)

    wait = subparsers.add_parser("wait")
    _add_duration(wait)

    zoom = subparsers.add_parser("zoom")
    _add_region(zoom)

    return parser


def _add_scroll_direction(subparser: ArgumentParser) -> Action:
    return subparser.add_argument(
        "--scroll_direction", choices=["up", "down", "left", "right"], required=True
    )


def _add_scroll_amount(subparser: ArgumentParser) -> Action:
    return subparser.add_argument("--scroll_amount", type=int, required=True)


def _add_coordinate(subparser: ArgumentParser, required: bool = True) -> Action:
    return subparser.add_argument("--coordinate", type=int, nargs=2, required=required)


def _add_start_coordinate(subparser: ArgumentParser) -> Action:
    return subparser.add_argument(
        "--start_coordinate", type=int, nargs=2, required=True
    )


def _add_duration(subparser: ArgumentParser) -> Action:
    return subparser.add_argument("--duration", type=int, required=True)


def _add_text(subparser: ArgumentParser, required: bool = True) -> Action:
    return subparser.add_argument("--text", type=str, required=required)


def _add_region(subparser: ArgumentParser) -> Action:
    return subparser.add_argument("--region", type=int, nargs=4, required=True)
```

## `tool/_tools/_computer/_resources/tool/_constants.py`

```python
from typing import Literal

# this is duplicated in _computer.py
# changes should be synchronized!
Action = Literal[
    "key",
    "hold_key",
    "type",
    "cursor_position",
    "mouse_move",
    "left_mouse_down",
    "left_mouse_up",
    "left_click",
    "left_click_drag",
    "right_click",
    "middle_click",
    "back_click",
    "forward_click",
    "double_click",
    "triple_click",
    "scroll",
    "wait",
    "screenshot",
    "zoom",
    "open_web_browser",
    "navigate",
]
```

## `tool/_tools/_computer/_resources/tool/_logger.py`

```python
import logging


def setup_logger(level=logging.INFO):
    """
    This logger emits all of its output to PID 1's stdout.

    This makes it so that logging from invocations of the computer_tool cli show up in `docker logs` output.
    """
    new_logger = logging.getLogger("computer_tool")
    new_logger.setLevel(level)

    stdout_handler = logging.FileHandler("/proc/1/fd/1", mode="w")
    stdout_handler.setLevel(level)
    stdout_handler.setFormatter(
        logging.Formatter("%(name)s(pid=%(process)d) - %(levelname)s - %(message)s")
    )

    if not new_logger.handlers:
        new_logger.addHandler(stdout_handler)

    return new_logger
```

## `tool/_tools/_computer/_resources/tool/_run.py`

```python
"""Utility to run shell commands asynchronously with a timeout."""

import asyncio

TRUNCATED_MESSAGE: str = "<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>"
MAX_RESPONSE_LEN: int = 16000


def maybe_truncate(content: str, truncate_after: int | None = MAX_RESPONSE_LEN):
    """Truncate content and append a notice if content exceeds the specified length."""
    return (
        content
        if not truncate_after or len(content) <= truncate_after
        else content[:truncate_after] + TRUNCATED_MESSAGE
    )


async def run(
    cmd: str,
    timeout: float | None = 120.0,  # seconds
    truncate_after: int | None = MAX_RESPONSE_LEN,
):
    """Run a shell command asynchronously with a timeout."""
    process = await asyncio.create_subprocess_shell(
        cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )

    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        return (
            process.returncode or 0,
            maybe_truncate(stdout.decode(), truncate_after=truncate_after),
            maybe_truncate(stderr.decode(), truncate_after=truncate_after),
        )
    except (TimeoutError, asyncio.TimeoutError) as exc:
        try:
            process.kill()
        except ProcessLookupError:
            pass
        raise TimeoutError(
            f"Command '{cmd}' timed out after {timeout} seconds"
        ) from exc
```

## `tool/_tools/_computer/_resources/tool/_tool_result.py`

```python
from dataclasses import dataclass, fields, replace


@dataclass(kw_only=True, frozen=True)
class ToolResult:
    """Represents the result of a tool execution."""

    output: str | None = None
    error: str | None = None
    base64_image: str | None = None

    def __bool__(self):
        return any(getattr(self, field.name) for field in fields(self))

    def __add__(self, other: "ToolResult"):
        def combine_fields(
            field: str | None, other_field: str | None, concatenate: bool = True
        ):
            if field and other_field:
                if concatenate:
                    return field + other_field
                raise ValueError("Cannot combine tool results")
            return field or other_field

        return ToolResult(
            output=combine_fields(self.output, other.output),
            error=combine_fields(self.error, other.error),
            base64_image=combine_fields(self.base64_image, other.base64_image, False),
        )

    def replace(self, **kwargs):
        """Returns a new ToolResult with the given fields replaced."""
        return replace(self, **kwargs)
```

## `tool/_tools/_computer/_resources/tool/_x11_client.py`

```python
"""Inspired by https://github.com/anthropics/anthropic-quickstarts/blob/main/computer-use-demo/computer_use_demo/tools/computer.py"""

import asyncio
import base64
import logging
import os
import shlex
from pathlib import Path
from typing import Literal
from uuid import uuid4

from typing_extensions import TypedDict

from _run import run
from _tool_result import ToolResult

OUTPUT_DIR = "/tmp/outputs"

TYPING_DELAY_MS = 12
TYPING_GROUP_SIZE = 50

ColorCount = Literal[4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4]


class X11ClientError(Exception):
    def __init__(self, message):
        self.message = message


class Resolution(TypedDict):
    width: int
    height: int


# sizes above XGA/WXGA are not recommended (see README.md)
# scale down to one of these targets if ComputerTool._scaling_enabled is set
MAX_SCALING_TARGETS: dict[str, Resolution] = {
    "XGA": Resolution(width=1024, height=768),  # 4:3 - 1.33 - 768k pixels
    "WXGA": Resolution(width=1280, height=800),  # 16:10 - 1.60 -  1,000k pixels
    "FWXGA": Resolution(width=1366, height=768),  # ~16:9 - 1.79 - 1,025k pixels
}


ScaleDirection = Literal["api_to_native", "native_to_api"]


class ComputerToolOptions(TypedDict):
    display_height_px: int
    display_width_px: int
    display_number: int | None


def chunks(s: str, chunk_size: int) -> list[str]:
    return [s[i : i + chunk_size] for i in range(0, len(s), chunk_size)]


class X11Client:
    """
    A tool that allows the agent to interact with the screen, keyboard, and mouse of the current computer.

    The tool parameters are defined by Anthropic and are not editable.
    """

    width: int
    height: int
    display_num: int | None
    # TODO: Complete plumbing this or remove it
    color_count: ColorCount | None = 256

    _screenshot_delay = 2.0
    _scaling_enabled = True

    @property
    def options(self) -> ComputerToolOptions:
        width, height = self._scale_coordinates(
            "native_to_api", self.width, self.height
        )
        return {
            "display_width_px": width,
            "display_height_px": height,
            "display_number": self.display_num,
        }

    def __init__(self):
        super().__init__()

        self.width = int(os.getenv("WIDTH") or 0)
        self.height = int(os.getenv("HEIGHT") or 0)
        assert self.width and self.height, "WIDTH, HEIGHT must be set"
        if (display_num := os.getenv("DISPLAY_NUM")) is not None:
            self.display_num = int(display_num)
            self._display_prefix = f"DISPLAY=:{self.display_num} "
        else:
            self.display_num = None
            self._display_prefix = ""

        self.xdotool = f"{self._display_prefix}xdotool"

    async def key(self, text: str) -> ToolResult:
        return await self._shell(f"{self.xdotool} key -- {_key_arg_for_text(text)}")

    async def hold_key(self, text: str, duration: int) -> ToolResult:
        key_arg = _key_arg_for_text(text)
        await self._shell(f"{self.xdotool} keydown -- {key_arg}", False)
        await asyncio.sleep(duration)
        return await self._shell(f"{self.xdotool} keyup -- {key_arg}")

    async def type(self, text: str) -> ToolResult:
        results: list[ToolResult] = []
        for chunk in chunks(text, TYPING_GROUP_SIZE):
            cmd = (
                f"{self.xdotool} type --delay {TYPING_DELAY_MS} -- {shlex.quote(chunk)}"
            )
            results.append(await self._shell(cmd, take_screenshot=False))

        screenshot_base64 = await self._take_screenshot_after_delay()
        return ToolResult(
            output="".join(result.output or "" for result in results),
            error="".join(result.error or "" for result in results),
            base64_image=screenshot_base64,
        )

    async def cursor_position(self) -> ToolResult:
        result = await self._shell(
            f"{self.xdotool} getmouselocation --shell",
            take_screenshot=False,
        )
        output = result.output or ""
        x, y = self._scale_coordinates(
            "native_to_api",
            int(output.split("X=")[1].split("\n")[0]),
            int(output.split("Y=")[1].split("\n")[0]),
        )
        return result.replace(output=f"X={x},Y={y}")

    async def left_mouse_down(self) -> ToolResult:
        return await self._shell(f"{self.xdotool} mousedown 1")

    async def left_mouse_up(self) -> ToolResult:
        return await self._shell(f"{self.xdotool} mouseup 1")

    async def mouse_move(self, coordinate: tuple[int, int]) -> ToolResult:
        return await self._mouse_move_and("mouse_move", coordinate, None)

    async def left_click(
        self, coordinate: tuple[int, int] | None, text: str | None
    ) -> ToolResult:
        return await self._mouse_move_and("left_click", coordinate, text)

    async def right_click(
        self, coordinate: tuple[int, int] | None, text: str | None
    ) -> ToolResult:
        return await self._mouse_move_and("right_click", coordinate, text)

    async def middle_click(
        self, coordinate: tuple[int, int] | None, text: str | None
    ) -> ToolResult:
        return await self._mouse_move_and("middle_click", coordinate, text)

    # https://wiki.archlinux.org/title/Mouse_buttons#Thumb_buttons_-_forward_and_back
    # suggests that, although not in any spec, the de facto standard is 8 for
    # back and 9 for forward.
    async def back_click(
        self, coordinate: tuple[int, int] | None, text: str | None
    ) -> ToolResult:
        return await self._mouse_move_and("back_click", coordinate, text)

    async def forward_click(
        self, coordinate: tuple[int, int] | None, text: str | None
    ) -> ToolResult:
        return await self._mouse_move_and("forward_click", coordinate, text)

    async def double_click(
        self, coordinate: tuple[int, int] | None, text: str | None
    ) -> ToolResult:
        return await self._mouse_move_and("double_click", coordinate, text)

    async def triple_click(
        self, coordinate: tuple[int, int] | None, text: str | None
    ) -> ToolResult:
        return await self._mouse_move_and("triple_click", coordinate, text)

    async def left_click_drag(
        self, start_coordinate: tuple[int, int], coordinate: tuple[int, int]
    ) -> ToolResult:
        await self._move_mouse_to_coordinate(start_coordinate, False)
        x, y = self._scale_coordinates("api_to_native", *coordinate)
        return await self._shell(
            f"{self.xdotool} mousedown 1 mousemove --sync {x} {y} mouseup 1"
        )

    async def scroll(
        self,
        scroll_direction: Literal["up", "down", "left", "right"],
        scroll_amount: int,
        coordinate: tuple[int, int] | None,
        text: str | None,
    ) -> ToolResult:
        if coordinate:
            await self._move_mouse_to_coordinate(coordinate, False)
        scroll_button = {
            "up": 4,
            "down": 5,
            "left": 6,
            "right": 7,
        }[scroll_direction]

        if text:
            key_arg = _key_arg_for_text(text)
            await self._shell(f"{self.xdotool} keydown -- {key_arg}", False)
            await self._shell(
                f"{self.xdotool} click --repeat {scroll_amount} {scroll_button}",
                False,
            )
            return await self._shell(f"{self.xdotool} keyup -- {key_arg}")
        else:
            return await self._shell(
                f"{self.xdotool} click --repeat {scroll_amount} {scroll_button}"
            )

    async def wait(self, duration: int) -> ToolResult:
        await asyncio.sleep(duration)
        return await self.screenshot()

    async def screenshot(self) -> ToolResult:
        return await self._screenshot()

    async def open_web_browser(self) -> ToolResult:
        """Open the web browser (Firefox) in full screen view."""
        await run(f"{self._display_prefix}firefox-esr --new-window >/dev/null 2>&1 &")
        # Wait for a visible Firefox window to appear, then activate it
        await run(f"{self.xdotool} search --sync --onlyvisible --class firefox-esr")
        await self._activate_browser()
        await run(f"{self.xdotool} key F11")
        await asyncio.sleep(1)
        return await self.screenshot()

    async def navigate(self, url: str) -> ToolResult:
        """Navigate to a URL in the browser."""
        await self._activate_browser()
        await run(f"{self.xdotool} key ctrl+l")
        await asyncio.sleep(0.5)
        await self.type(url)
        await run(f"{self.xdotool} key Return")
        await asyncio.sleep(1)
        return await self.screenshot()

    async def _activate_browser(self) -> None:
        """Find and activate the most recent Firefox window."""
        _, stdout, _ = await run(
            f"{self.xdotool} search --onlyvisible --class firefox-esr"
        )
        window_id = stdout.strip().splitlines()[-1] if stdout.strip() else ""
        if window_id:
            await run(f"{self.xdotool} windowactivate --sync {window_id}")

    async def zoom(self, region: list[int]) -> ToolResult:
        """Take a zoomed screenshot of a specified region at native resolution."""
        if (
            len(region) != 4
            or any(r < 0 for r in region)
            or region[2] <= region[0]
            or region[3] <= region[1]
        ):
            raise X11ClientError("Invalid region")

        # Scale coordinates from API space to native screen space
        x0, y0 = self._scale_coordinates("api_to_native", region[0], region[1])
        x1, y1 = self._scale_coordinates("api_to_native", region[2], region[3])

        return await self._screenshot(zoom_region=(x0, y0, x1, y1))

    async def _mouse_move_and(
        self,
        action: Literal[
            "mouse_move",
            "left_click",
            "right_click",
            "middle_click",
            "back_click",
            "forward_click",
            "double_click",
            "triple_click",
        ],
        coordinate: tuple[int, int] | None,
        text: str | None,
    ):
        should_move = action == "mouse_move" or coordinate
        if should_move:
            assert coordinate  # coding/type safety error
            move_result = await self._move_mouse_to_coordinate(
                coordinate, action == "mouse_move"
            )
            if action == "mouse_move":
                return move_result
        click_arg = {
            "left_click": "1",
            "right_click": "3",
            "middle_click": "2",
            "back_click": "8",
            "forward_click": "9",
            "double_click": "--repeat 2 --delay 300 1",
            "triple_click": "--repeat 3 --delay 300 1",
        }[action]

        if text:
            key_arg = _key_arg_for_text(text)
            await self._shell(f"{self.xdotool} keydown -- {key_arg}", False)
            await self._shell(f"{self.xdotool} click {click_arg}", False)
            return await self._shell(f"{self.xdotool} keyup -- {key_arg}")
        else:
            return await self._shell(f"{self.xdotool} click {click_arg}")

    async def _move_mouse_to_coordinate(
        self, coordinate: tuple[int, int], take_screenshot: bool
    ):
        x, y = self._scale_coordinates("api_to_native", *coordinate)
        return await self._shell(
            f"{self.xdotool} mousemove --sync {x} {y}", take_screenshot=take_screenshot
        )

    async def _screenshot(
        self,
        zoom_region: tuple[int, int, int, int] | None = None,
    ) -> ToolResult:
        """Take a screenshot.

        Args:
            zoom_region: If provided, crop to native coords (x0, y0, x1, y1) at native
                resolution. If None, capture full screen scaled to API dimensions.
        """
        output_dir = Path(OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        path = output_dir / f"screenshot_{uuid4().hex}.png"

        result = await self._shell(
            f"{self._display_prefix}scrot --silent -p {path}", take_screenshot=False
        )

        # Build convert command with all needed operations
        convert_ops: list[str] = []
        if zoom_region:
            x0, y0, x1, y1 = zoom_region
            convert_ops.append(f"-crop {x1 - x0}x{y1 - y0}+{x0}+{y0} +repage")
        elif self._scaling_enabled:
            x, y = self._scale_coordinates("native_to_api", self.width, self.height)
            convert_ops.append(f"-resize {x}x{y}!")
        if self.color_count is not None:
            convert_ops.append(f"-colors {self.color_count}")

        if convert_ops:
            convert_cmd = f"convert {path} {' '.join(convert_ops)} {path}"
            await self._shell(convert_cmd, take_screenshot=False)

        if path.exists():
            return result.replace(
                base64_image=base64.b64encode(path.read_bytes()).decode()
            )
        raise X11ClientError(f"Failed to take screenshot: {result.error}")

    async def _shell(self, command: str, take_screenshot=True) -> ToolResult:
        """Run a shell command and return the output, error, and optionally a screenshot."""
        logging.debug(f"running shell command {command}")
        _, stdout, stderr = await run(command)
        logging.debug(f"shell command returned stdout: {stdout}, stderr: {stderr}")
        return ToolResult(
            output=stdout,
            error=stderr,
            base64_image=(await self._take_screenshot_after_delay())
            if take_screenshot
            else None,
        )

    async def _take_screenshot_after_delay(self) -> str:
        # delay to let things settle before taking a screenshot
        await asyncio.sleep(self._screenshot_delay)
        return (await self._screenshot()).base64_image

    def _scale_coordinates(self, direction: ScaleDirection, x: int, y: int):
        """Scale coordinates between API and native coordinate spaces.

        Args:
            direction: Conversion direction
                - "api_to_native": Scale UP for mouse actions (API → native)
                - "native_to_api": Scale DOWN for reporting (native → API)
            x: X coordinate
            y: Y coordinate
        """
        if not self._scaling_enabled:
            return x, y
        ratio = self.width / self.height
        target_dimension = None
        for dimension in MAX_SCALING_TARGETS.values():
            # allow some error in the aspect ratio - not ratios are exactly 16:9
            if abs(dimension["width"] / dimension["height"] - ratio) < 0.02:
                if dimension["width"] < self.width:
                    target_dimension = dimension
                break
        if target_dimension is None:
            return x, y
        # should be less than 1
        x_scaling_factor = target_dimension["width"] / self.width
        y_scaling_factor = target_dimension["height"] / self.height
        if direction == "api_to_native":
            if x > self.width or y > self.height:
                raise X11ClientError(f"Coordinates {x}, {y} are out of bounds")
            # scale up
            return round(x / x_scaling_factor), round(y / y_scaling_factor)
        # scale down
        return round(x * x_scaling_factor), round(y * y_scaling_factor)


def _key_arg_for_text(text: str) -> str:
    return " ".join(shlex.quote(part) for part in text.split())
```

## `tool/_tools/_computer/_resources/tool/computer_tool.py`

```python
import asyncio
import json
import logging
import os
import sys
import time
from argparse import Namespace
from typing import TypeVar

from _args import parse_arguments
from _constants import Action
from _logger import setup_logger
from _tool_result import ToolResult
from _x11_client import X11Client


class ComputerToolError(Exception):
    def __init__(self, message):
        self.message = message


# This is a bit sketchy. We really want to use relative imports here. Using absolute imports
# works at runtime, but it prevents intellisense from working. However, when this folder is
# copied to the container, by default relative imports won't work if this file is launched
# normally. To overcome this, two things need to happen:
# 1. PYTHONPATH must be set to the parent of the container folder. `PYTHONPATH=/opt`
# 2. The program must be launched with the -m flag. `python3 -m computer_tool.computer_tool`
#
# TODO: There's got to be a cleaner way.

my_logger = setup_logger(logging.INFO)


def main():
    try:
        args = parse_arguments()
        my_logger.info(f"({args})")
        result = asyncio.run(execute_action(args))

        print(
            json.dumps(
                {
                    "output": result.output,
                    "error": result.error,
                    "base64_image": result.base64_image,
                }
            )
        )
        my_logger.debug("SUCCESS")
    except Exception as e:
        my_logger.warning(f"An error occurred: {e}")
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)


async def execute_action(args: Namespace) -> ToolResult:
    # we can't do anything until X11 is ready to go.
    await wait_for_file("/tmp/xfce_started")

    computer = X11Client()
    action: Action = args.action
    match action:
        case "key":
            return await computer.key(not_none(args.text, "text"))
        case "hold_key":
            return await computer.hold_key(
                not_none(args.text, "text"), not_none(args.duration, "duration")
            )
        case "type":
            return await computer.type(not_none(args.text, "text"))
        case "cursor_position":
            return await computer.cursor_position()
        case "left_mouse_down":
            return await computer.left_mouse_down()
        case "left_mouse_up":
            return await computer.left_mouse_up()
        case "mouse_move":
            return await computer.mouse_move(not_none(args.coordinate, "coordinate"))
        case "left_click":
            return await computer.left_click(
                getattr(args, "coordinate", None), getattr(args, "text", None)
            )
        case "right_click":
            return await computer.right_click(
                getattr(args, "coordinate", None), getattr(args, "text", None)
            )
        case "middle_click":
            return await computer.middle_click(
                getattr(args, "coordinate", None), getattr(args, "text", None)
            )
        case "double_click":
            return await computer.double_click(
                getattr(args, "coordinate", None), getattr(args, "text", None)
            )
        case "triple_click":
            return await computer.triple_click(
                getattr(args, "coordinate", None), getattr(args, "text", None)
            )
        case "left_click_drag":
            return await computer.left_click_drag(
                not_none(args.start_coordinate, "start_coordinate"),
                not_none(args.coordinate, "coordinate"),
            )
        case "scroll":
            return await computer.scroll(
                not_none(args.scroll_direction, "scroll_direction"),
                not_none(args.scroll_amount, "scroll_amount"),
                getattr(args, "coordinate", None),
                getattr(args, "text", None),
            )
        case "wait":
            return await computer.wait(not_none(args.duration, "duration"))
        case "screenshot":
            return await computer.screenshot()
        case "zoom":
            return await computer.zoom(not_none(args.region, "region"))
        case "open_web_browser":
            return await computer.open_web_browser()
        case "navigate":
            return await computer.navigate(not_none(args.text, "text"))

    raise ComputerToolError(f"Invalid action: {action}")


async def wait_for_file(file_path, check_interval=1):
    if os.path.exists(file_path):
        return
    my_logger.info(f"Waiting for {file_path}")
    start_time = time.time()
    while not os.path.exists(file_path):
        await asyncio.sleep(check_interval)
    my_logger.info(
        f"Done waiting for {file_path} after {time.time() - start_time:.1f} seconds"
    )


T = TypeVar("T")


def not_none(value: T | None, name: str) -> T:
    if value is None:
        raise ComputerToolError(f"{name} must be provided")
    return value


if __name__ == "__main__":
    main()
```

## `tool/_tools/_execute.py`

```python
from inspect_ai.util import sandbox as sandbox_env

from .._tool import Tool, tool
from .._tool_call import ToolCall, ToolCallContent, ToolCallView, ToolCallViewer


# custom viewer for bash and python code blocks
def code_viewer(
    language: str, code_param: str, title: str | None = None
) -> ToolCallViewer:
    title = title or language

    def viewer(tool_call: ToolCall) -> ToolCallView:
        code = tool_call.arguments.get(code_param, None)
        code = str(code or tool_call.function).strip()
        call = ToolCallContent(
            title=title,
            format="markdown",
            content=f"```{language}\n" + code + "\n```\n",
        )
        return ToolCallView(call=call)

    return viewer


@tool(viewer=code_viewer("bash", "cmd"))
def bash(
    timeout: int | None = None, user: str | None = None, sandbox: str | None = None
) -> Tool:
    """Bash shell command execution tool.

    Execute bash shell commands using a sandbox environment (e.g. "docker").

    Args:
      timeout: Timeout (in seconds) for command.
      user: User to execute commands as.
      sandbox: Optional sandbox environment name.

    Returns:
      String with command output (stdout) or command error (stderr).
    """

    async def execute(cmd: str) -> str:
        """
        Use this function to execute bash commands.

        Args:
          cmd (str): The bash command to execute.

        Returns:
          The output of the command.
        """
        # execute the command
        result = await sandbox_env(sandbox).exec(
            cmd=["bash", "--login", "-c", cmd], timeout=timeout, user=user
        )
        # return output (including stderr if any)
        output = ""
        if result.stderr:
            output = f"{result.stderr}\n"
        return f"{output}{result.stdout}"

    return execute


@tool(viewer=code_viewer("python", "code"))
def python(
    timeout: int | None = None, user: str | None = None, sandbox: str | None = None
) -> Tool:
    """Python code execution tool.

    Execute Python code using a sandbox environment (e.g. "docker").

    Args:
      timeout: Timeout (in seconds) for command.
      user: User to execute commands as.
      sandbox: Optional sandbox environment name.

    Returns:
      String with command output (stdout) or command error (stderr).
    """

    async def execute(code: str) -> str:
        """
        Use the python function to execute Python code.

        The Python tool executes single-run Python scripts. Important notes:
        1. Each execution is independent - no state is preserved between runs
        2. You must explicitly use print() statements to see any output
        3. Simply writing expressions (like in notebooks) will not display results
        4. The script cannot accept interactive input during execution
        5. Return statements alone won't produce visible output
        6. All variables and imports are cleared between executions
        7. Standard output (via print()) is the only way to see results

        Args:
          code (str): The python code to execute.

        Returns:
          The output of the Python code.
        """
        result = await sandbox_env(sandbox).exec(
            cmd=["bash", "--login", "-c", "python3 -"],
            input=code,
            timeout=timeout,
            user=user,
        )
        # return output (including stderr if any)
        output = ""
        if result.stderr:
            output = f"{result.stderr}\n"
        return f"{output}{result.stdout}"

    return execute
```

## `tool/_tools/_memory.py`

```python
"""Memory tool for managing persistent information in /memories directory."""

from pathlib import Path
from typing import Literal

from pydantic import Field

from inspect_ai.tool import Tool, ToolError, tool
from inspect_ai.util import StoreModel, store_as
from inspect_ai.util._resource import resource

SNIPPET_LINES: int = 4


class MemoryStore(StoreModel):
    seeding_complete: bool = Field(default=False)
    files: dict[str, str] = Field(default_factory=dict)
    dirs: list[str] = Field(default_factory=list)


@tool
def memory(*, initial_data: dict[str, str] | None = None) -> Tool:
    """Memory tool for managing persistent information.

    The description for the memory tool is based on the documentation for the Claude
    [system prompt](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool#prompting-guidance) associated with the use of the memory tool.

    Args:
        initial_data: Optional dict mapping file paths to content for pre-seeding
            the memory store. Keys should be valid /memories paths (e.g.,
            "/memories/file.txt"). Values are resolved via resource(), supporting
            inline strings, file paths, or remote resources (s3://, https://).
            Seeding happens once on first tool execution.

    Returns:
        Memory tool for file operations in /memories directory.
    """

    async def execute(
        command: Literal["view", "create", "str_replace", "insert", "delete", "rename"],
        path: str | None = None,
        file_text: str | None = None,
        old_str: str | None = None,
        new_str: str | None = None,
        insert_line: int | None = None,
        insert_text: str | None = None,
        view_range: list[int] | None = None,
        old_path: str | None = None,
        new_path: str | None = None,
    ) -> str:
        """Memory tool for managing persistent information.

        IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE.

        MEMORY PROTOCOL:
        1. Use the `view` command of your `memory` tool to check for earlier progress.
        2. ... (work on the task) ...
            - As you make progress, record status / progress / thoughts etc in your memory.
        ASSUME INTERRUPTION: Your context window might be reset at any moment, so you risk losing any progress that is not recorded in your memory directory.

        Note: when editing your memory folder, always try to keep its content up-to-date, coherent and organized. You can rename or delete files that are no longer relevant. Do not create new files unless necessary.

        Args:
            command: Command to execute (view, create, str_replace, insert, delete,
                rename)
            path: Required parameter for `view`, `create`, `str_replace`, `insert`,
                and `delete` commands. Path to file or directory in /memories, e.g.
                `/memories/file.txt` or `/memories/dir`.
            file_text: Required parameter for `create` command, with the content
                of the file to be created.
            old_str: Required parameter for `str_replace` command containing the
                string in `path` to replace.
            new_str: Optional parameter for `str_replace` command containing the
                new string (if not given, the string will be deleted).
            insert_line: Required parameter for `insert` command. The `insert_text`
                will be inserted AFTER the line `insert_line` of `path`.
            insert_text: Required parameter for `insert` command containing the
                text to insert.
            view_range: Optional parameter for `view` command when `path` points
                to a file. If none is given, the full file is shown. If provided,
                the file will be shown in the indicated line number range, e.g. [11, 12]
                will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]`
                shows all lines from `start_line` to the end of the file.
            old_path: Required parameter for `rename` command containing the current
                path.
            new_path: Required parameter for `rename` command containing the target
                path.

        Returns:
            Result message string
        """
        store = store_as(MemoryStore)
        if not store.seeding_complete:
            if initial_data:
                for seed_path, value in initial_data.items():
                    _create(store, seed_path, resource(value))
            store.seeding_complete = True

        match command:
            case "view":
                return _view(store, path, view_range)
            case "create":
                return _create(store, path, file_text)
            case "str_replace":
                return _str_replace(store, path, old_str, new_str)
            case "insert":
                return _insert(store, path, insert_line, insert_text)
            case "delete":
                return _delete(store, path)
            case "rename":
                return _rename(store, old_path, new_path)
            case _:
                raise ToolError(f"Unknown command: {command}")

    return execute


def _validate_path(path: str) -> str:
    """Validate path starts with /memories and has no traversal."""
    if not path:
        raise ToolError("Path cannot be empty")

    # Normalize separators
    path = path.replace("\\", "/")

    # Must start with /memories
    if not path.startswith("/memories"):
        raise ToolError(
            f"Invalid path: all paths must start with /memories, got {path}"
        )

    try:
        # Convert to pathlib Path and resolve (eliminates .., symlinks, etc)
        resolved = Path(path).resolve()
        base = Path("/memories").resolve()

        # Verify resolved path is within /memories
        resolved.relative_to(base)
    except ValueError:
        raise ToolError(f"Invalid path: {path} resolves outside /memories directory")

    # Remove trailing slash except for /memories itself
    if path != "/memories" and path.endswith("/"):
        path = path.rstrip("/")

    return path


def _path_exists(store: MemoryStore, path: str) -> bool:
    return path in store.files or path in store.dirs


def _is_dir(store: MemoryStore, path: str) -> bool:
    return path in store.dirs


def _read_file(store: MemoryStore, path: str) -> str:
    if path not in store.files:
        raise ToolError(f"File not found: {path}")
    return store.files[path]


def _write_file(store: MemoryStore, path: str, content: str) -> None:
    # Normalize line endings
    content = content.replace("\r\n", "\n").replace("\r", "\n")

    # Create parent directories
    parts = path.rsplit("/", 1)
    if len(parts) == 2:
        parent = parts[0]
        if parent and parent != "/memories":
            _ensure_parent_dirs(store, parent)

    store.files[path] = content


def _ensure_parent_dirs(store: MemoryStore, path: str) -> None:
    # Build all parent paths
    parts = path.split("/")
    current = ""
    for part in parts:
        if not part:
            continue
        if current:
            current += "/" + part
        else:
            current = "/" + part
        if current not in store.dirs:
            store.dirs.append(current)


def _list_directory(store: MemoryStore, path: str, max_depth: int = 2) -> list[str]:
    results = []

    # Normalize path for comparison
    prefix = path if path == "/memories" else path + "/"
    base_depth = path.count("/")

    # Add directories
    for dir_path in sorted(store.dirs):
        if dir_path.startswith(prefix) and dir_path != path:
            depth = dir_path.count("/") - base_depth
            if depth <= max_depth:
                results.append(dir_path)

    # Add files
    for file_path in sorted(store.files.keys()):
        if file_path.startswith(prefix):
            depth = file_path.count("/") - base_depth
            if depth <= max_depth:
                results.append(file_path)

    return results


def _make_output(file_content: str, file_descriptor: str, init_line: int = 1) -> str:
    lines = file_content.split("\n")
    numbered_lines = [f"{i + init_line:6}\t{line}" for i, line in enumerate(lines)]
    content = "\n".join(numbered_lines)
    return f"Here's the result of running `cat -n` on {file_descriptor}:\n{content}\n"


def _view(
    store: MemoryStore, path: str | None, view_range: list[int] | None = None
) -> str:
    if not path:
        raise ToolError("Path is required for view command")

    path = _validate_path(path)

    if not _path_exists(store, path):
        raise ToolError(f"The path {path} does not exist. Please provide a valid path.")

    if _is_dir(store, path):
        # List directory contents
        contents = _list_directory(store, path)
        if not contents:
            return f"Directory {path} is empty.\n"
        contents_str = "\n".join(contents)
        return f"Here are the files and directories up to 2 levels deep in {path}, excluding hidden items:\n{contents_str}\n"

    # Read file
    file_content = _read_file(store, path)
    init_line = 1

    if view_range:
        if len(view_range) != 2 or not all(isinstance(i, int) for i in view_range):
            raise ToolError(
                "Invalid `view_range`. It should be a list of two integers."
            )

        file_lines = file_content.split("\n")
        n_lines_file = len(file_lines)
        init_line, final_line = view_range

        if init_line < 1 or init_line > n_lines_file:
            raise ToolError(
                f"Invalid `view_range`: {view_range}. Its first element `{init_line}` should be within the range of lines of the file: {[1, n_lines_file]}"
            )

        if final_line > n_lines_file:
            final_line = -1

        if final_line != -1 and final_line < init_line:
            raise ToolError(
                f"Invalid `view_range`: {view_range}. Its second element `{final_line}` should be larger or equal than its first `{init_line}`"
            )

        if final_line == -1:
            file_content = "\n".join(file_lines[init_line - 1 :])
        else:
            file_content = "\n".join(file_lines[init_line - 1 : final_line])

    return _make_output(file_content, str(path), init_line=init_line)


def _create(store: MemoryStore, path: str | None, file_text: str | None) -> str:
    if not path:
        raise ToolError("Path is required for create command")
    if file_text is None:
        raise ToolError("file_text is required for create command")

    path = _validate_path(path)

    # Unlike text_editor, memory tool allows overwriting
    _write_file(store, path, file_text)
    return f"File created successfully at: {path}"


def _str_replace(
    store: MemoryStore, path: str | None, old_str: str | None, new_str: str | None
) -> str:
    if not path:
        raise ToolError("Path is required for str_replace command")
    if not old_str:
        raise ToolError(
            "str_replace: The `old_str` parameter cannot be empty. Consider using the `insert` command instead."
        )

    path = _validate_path(path)

    if not _path_exists(store, path):
        raise ToolError(f"The path {path} does not exist. Please provide a valid path.")

    if _is_dir(store, path):
        raise ToolError(
            f"The path {path} is a directory and only the `view` command can be used on directories"
        )

    # Read file content
    file_content = _read_file(store, path).expandtabs()
    old_str = old_str.expandtabs()
    new_str = new_str.expandtabs() if new_str is not None else ""

    # Check if old_str is unique
    occurrences = file_content.count(old_str)
    if occurrences == 0:
        raise ToolError(
            f"No replacement was performed, old_str `{old_str}` did not appear verbatim in {path}."
        )
    elif occurrences > 1:
        file_content_lines = file_content.split("\n")
        lines = [
            idx + 1 for idx, line in enumerate(file_content_lines) if old_str in line
        ]
        raise ToolError(
            f"No replacement was performed. Multiple occurrences of old_str `{old_str}` in lines {lines}. Please ensure it is unique"
        )

    # Replace
    new_file_content = file_content.replace(old_str, new_str)
    _write_file(store, path, new_file_content)

    # Create snippet
    replacement_line = file_content.split(old_str)[0].count("\n")
    start_line = max(0, replacement_line - SNIPPET_LINES)
    end_line = replacement_line + SNIPPET_LINES + new_str.count("\n")
    snippet = "\n".join(new_file_content.split("\n")[start_line : end_line + 1])

    success_msg = f"The file {path} has been edited. "
    success_msg += _make_output(snippet, f"a snippet of {path}", start_line + 1)
    success_msg += "Review the changes and make sure they are as expected. Edit the file again if necessary."

    return success_msg


def _insert(
    store: MemoryStore,
    path: str | None,
    insert_line: int | None,
    insert_text: str | None,
) -> str:
    """Insert text at line number."""
    if not path:
        raise ToolError("Path is required for insert command")
    if insert_line is None:
        raise ToolError("insert_line is required for insert command")
    if insert_text is None:
        raise ToolError("insert_text is required for insert command")

    path = _validate_path(path)

    if not _path_exists(store, path):
        raise ToolError(f"The path {path} does not exist. Please provide a valid path.")

    if _is_dir(store, path):
        raise ToolError(
            f"The path {path} is a directory and only the `view` command can be used on directories"
        )

    file_text = _read_file(store, path).expandtabs()
    insert_text = insert_text.expandtabs()
    file_text_lines = file_text.split("\n")
    n_lines_file = len(file_text_lines)

    if insert_line < 0 or insert_line > n_lines_file:
        raise ToolError(
            f"Invalid `insert_line` parameter: {insert_line}. It should be within the range of lines of the file: {[0, n_lines_file]}"
        )

    insert_text_lines = insert_text.split("\n")
    new_file_text_lines = (
        file_text_lines[:insert_line]
        + insert_text_lines
        + file_text_lines[insert_line:]
    )
    snippet_lines = (
        file_text_lines[max(0, insert_line - SNIPPET_LINES) : insert_line]
        + insert_text_lines
        + file_text_lines[insert_line : insert_line + SNIPPET_LINES]
    )

    new_file_text = "\n".join(new_file_text_lines)
    snippet = "\n".join(snippet_lines)

    _write_file(store, path, new_file_text)

    success_msg = f"The file {path} has been edited. "
    success_msg += _make_output(
        snippet,
        "a snippet of the edited file",
        max(1, insert_line - SNIPPET_LINES + 1),
    )
    success_msg += "Review the changes and make sure they are as expected (correct indentation, no duplicate lines, etc). Edit the file again if necessary."

    return success_msg


def _delete(store: MemoryStore, path: str | None) -> str:
    if not path:
        raise ToolError("Path is required for delete command")

    path = _validate_path(path)

    if not _path_exists(store, path):
        raise ToolError(f"The path {path} does not exist. Please provide a valid path.")

    if _is_dir(store, path):
        # Delete directory and all contents
        prefix = path + "/"

        # Delete all files in directory
        files_to_delete = [f for f in store.files if f.startswith(prefix) or f == path]
        for f in files_to_delete:
            del store.files[f]

        # Delete all subdirectories
        dirs_to_delete = [d for d in store.dirs if d.startswith(prefix) or d == path]
        for d in dirs_to_delete:
            if d in store.dirs:
                store.dirs.remove(d)
    else:
        # Delete file
        del store.files[path]

    return f"Successfully deleted: {path}"


def _rename(store: MemoryStore, old_path: str | None, new_path: str | None) -> str:
    if not old_path:
        raise ToolError("old_path is required for rename command")
    if not new_path:
        raise ToolError("new_path is required for rename command")

    old_path = _validate_path(old_path)
    new_path = _validate_path(new_path)

    if not _path_exists(store, old_path):
        raise ToolError(
            f"The path {old_path} does not exist. Please provide a valid path."
        )

    if _is_dir(store, old_path):
        # Rename directory and all contents
        old_prefix = old_path + "/"

        # Rename all files in directory
        files_to_rename = {
            f: f.replace(old_path, new_path, 1)
            for f in store.files
            if f.startswith(old_prefix) or f == old_path
        }

        for old_f, new_f in files_to_rename.items():
            store.files[new_f] = store.files.pop(old_f)

        # Rename all subdirectories
        dirs_to_rename = {
            d: d.replace(old_path, new_path, 1)
            for d in store.dirs
            if d.startswith(old_prefix) or d == old_path
        }

        for old_d in dirs_to_rename:
            if old_d in store.dirs:
                store.dirs.remove(old_d)
        for new_d in dirs_to_rename.values():
            if new_d not in store.dirs:
                store.dirs.append(new_d)
    else:
        # Rename file
        store.files[new_path] = store.files.pop(old_path)

        # Ensure parent directories exist
        parts = new_path.rsplit("/", 1)
        if len(parts) == 2:
            parent = parts[0]
            if parent and parent != "/memories":
                _ensure_parent_dirs(store, parent)

    return f"Successfully renamed {old_path} to {new_path}"
```

## `tool/_tools/_skill/__init__.py`

```python
from .install import install_skills
from .read import read_skills
from .tool import skill
from .types import Skill, SkillInfo

__all__ = ["skill", "install_skills", "read_skills", "Skill", "SkillInfo"]
```

## `tool/_tools/_skill/install.py`

```python
from pathlib import Path, PurePosixPath
from typing import Sequence

from inspect_ai.util import sandbox as sandbox_env
from inspect_ai.util._sandbox.environment import SandboxEnvironment

from .read import read_skills
from .types import Skill, SkillInfo


async def install_skills(
    skills: Sequence[str | Path | Skill],
    sandbox: str | SandboxEnvironment | None = None,
    user: str | None = None,
    dir: str | None = None,
) -> list[SkillInfo]:
    """Install skills into a sandbox.

    Args:
        skills: Agent skills to install.
        sandbox: Sandbox environment name to copy skills to.
        user: User to write skills files with.
        dir: Directory to install into (defaults to "./skills").

    Returns:
        List of `SkillInfo` with skill names, descriptions, and locations.
    """
    # resolve sandbox
    sbox = sandbox if isinstance(sandbox, SandboxEnvironment) else sandbox_env(sandbox)

    # exec helper
    async def checked_exec(
        cmd: list[str], *, cwd: str | None = None, as_user: str | None = None
    ) -> str:
        result = await sbox.exec(cmd, cwd=cwd, user=as_user or user, timeout=60)
        if not result.success:
            raise RuntimeError(
                f"Error executing command {' '.join(cmd)}: {result.stderr}"
            )
        return result.stdout.strip()

    # write helper
    async def write_skill_file(
        file: str, contents: str | bytes | Path, executable: bool = False
    ) -> None:
        # if it's a path read it as bytes
        if isinstance(contents, Path):
            with open(contents, "rb") as f:
                contents = f.read()

        # write the file
        await sbox.write_file(file, contents)

        # change user if required
        if user:
            await checked_exec(["chown", user, file], as_user="root")

        # mark executable if required
        if executable:
            await checked_exec(["chmod", "+x", file])

    # determine skills dir
    skills_dir = PurePosixPath(dir or "skills")
    if not skills_dir.is_absolute():
        skills_dir = PurePosixPath(await checked_exec(["sh", "-c", "pwd"])) / skills_dir

    # helper to write supporting files
    async def write_supporting_files(
        subdir: str, files: dict[str, str | bytes | Path], executable: bool = False
    ) -> None:
        for file, contents in files.items():
            await write_skill_file(str(skill_dir / subdir / file), contents, executable)

    # install skills
    skills_info: list[SkillInfo] = []
    for skill in read_skills(skills):
        # determine root skill dir
        skill_dir = skills_dir / skill.name

        # compute skill info and write main skill file
        skill_info = SkillInfo(
            name=skill.name,
            description=skill.description,
            instructions=skill.instructions,
            location=str(skill_dir / "SKILL.md"),
        )
        await write_skill_file(skill_info.location, skill.skill_md())
        await write_supporting_files("scripts", skill.scripts, executable=True)
        await write_supporting_files("references", skill.references)
        await write_supporting_files("assets", skill.assets)

        skills_info.append(skill_info)

    return skills_info
```

## `tool/_tools/_skill/read.py`

```python
from pathlib import Path
from typing import Any, Sequence

import yaml
from jsonschema import Draft7Validator

from .types import Skill


def read_skills(skills: Sequence[str | Path | Skill]) -> list[Skill]:
    """Read skill specifications.

    See the [agent skills specification](https://agentskills.io/specification) for details on defining skills.

    Args:
       skills: Directories containing SKILL.md files.

    Returns:
       List of parsed and validated Skills.

    Raises:
       SkillParsingError: If SKILL.md is missing, malformed, or invalid.
    """
    return [
        skill if isinstance(skill, Skill) else _read_skill(skill) for skill in skills
    ]


def _read_skill(location: str | Path) -> Skill:
    """Read a skill specification.

    See the [agent skills specification](https://agentskills.io/specification) for details on defining skills.

    Args:
       location: Directory containing SKILL.md file.

    Returns:
       Parsed and validated Skill object.

    Raises:
       SkillParsingError: If SKILL.md is missing, malformed, or invalid.
    """
    # Convert to Path and validate
    skill_dir = Path(location) if isinstance(location, str) else location
    skill_dir = skill_dir.absolute()

    if not skill_dir.exists():
        raise SkillParsingError(f"Skill directory does not exist: {skill_dir}")
    if not skill_dir.is_dir():
        raise SkillParsingError(f"Skill location is not a directory: {skill_dir}")

    # Check SKILL.md exists
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        raise SkillParsingError(f"SKILL.md not found in: {skill_dir}")

    # Read and parse SKILL.md
    content = skill_file.read_text(encoding="utf-8")
    frontmatter, instructions = _parse_frontmatter(content)

    # Validate frontmatter
    _validate_frontmatter(frontmatter)

    # Validate name matches directory name
    skill_name = frontmatter["name"]
    if skill_name != skill_dir.name:
        raise SkillParsingError(
            f"Skill name '{skill_name}' does not match directory name '{skill_dir.name}'"
        )

    # Enumerate optional directories
    scripts = _enumerate_directory(skill_dir / "scripts")
    references = _enumerate_directory(skill_dir / "references")
    assets = _enumerate_directory(skill_dir / "assets")

    # Construct and return Skill
    return Skill(
        name=skill_name,
        description=frontmatter["description"],
        instructions=instructions,
        scripts=scripts,
        references=references,
        assets=assets,
        license=frontmatter.get("license"),
        compatibility=frontmatter.get("compatibility"),
        metadata=frontmatter.get("metadata"),
        **{"allowed-tools": frontmatter.get("allowed-tools")},
    )


def _parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content.

    Args:
        content: Markdown content potentially containing YAML frontmatter.

    Returns:
        Tuple of (frontmatter dict, markdown body).
    """
    if not content.startswith("---"):
        return {}, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    frontmatter_str = parts[1].strip()
    body = parts[2].lstrip("\n")

    try:
        frontmatter = yaml.safe_load(frontmatter_str)
    except yaml.YAMLError as ex:
        raise SkillParsingError(f"Invalid YAML frontmatter: {ex}") from ex

    return frontmatter if isinstance(frontmatter, dict) else {}, body


def _skill_schema() -> dict[str, Any]:
    """Return JSON schema for skill frontmatter validation."""
    return {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
            "name": {
                "type": "string",
                "maxLength": 64,
                "pattern": r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$",
            },
            "description": {
                "type": "string",
                "maxLength": 1024,
            },
            "license": {
                "type": "string",
            },
            "compatibility": {
                "type": "string",
                "maxLength": 500,
            },
            "metadata": {
                "type": "object",
            },
            "allowed-tools": {
                "type": "string",
            },
        },
        "additionalProperties": False,
    }


def _validate_frontmatter(frontmatter: dict[str, Any]) -> None:
    """Validate frontmatter against JSON schema.

    Args:
        frontmatter: Parsed frontmatter dictionary.

    Raises:
        SkillParsingError: If validation fails.
    """
    schema = _skill_schema()
    validator = Draft7Validator(schema)
    errors = list(validator.iter_errors(frontmatter))

    if errors:
        error_messages = [error.message for error in errors]
        message = "\n".join(
            [f"Found {len(errors)} validation error(s) parsing SKILL.md:"]
            + [f"- {msg}" for msg in error_messages]
        )
        raise SkillParsingError(message, error_messages)


def _enumerate_directory(dir_path: Path) -> dict[str, str | bytes | Path]:
    """Enumerate files in a directory recursively, returning relative_path->Path mapping.

    Args:
        dir_path: Directory to enumerate.

    Returns:
        Dictionary mapping relative path (e.g., 'bash/script.sh') to absolute path.
        Excludes files/directories starting with '.' or '_'.
    """
    if not dir_path.exists() or not dir_path.is_dir():
        return {}

    result: dict[str, str | bytes | Path] = {}
    for file_path in dir_path.rglob("*"):
        # Skip directories, only include files
        if not file_path.is_file():
            continue
        # Skip hidden files/dirs (any path component starting with . or _)
        relative = file_path.relative_to(dir_path)
        if any(part.startswith((".", "_")) for part in relative.parts):
            continue
        result[str(relative)] = file_path.absolute()

    return result


class SkillParsingError(Exception):
    """Exception raised when skill parsing fails."""

    def __init__(self, message: str, errors: list[str] | None = None) -> None:
        self.message = message
        self.errors = errors or []
        super().__init__(message)
```

## `tool/_tools/_skill/tool.py`

```python
from pathlib import Path
from textwrap import dedent
from typing import Sequence

from pydantic import Field

from inspect_ai.tool._tool import Tool, ToolError, tool
from inspect_ai.tool._tool_def import ToolDef
from inspect_ai.util._store_model import StoreModel, store_as

from .install import install_skills
from .read import read_skills
from .types import Skill, SkillInfo


@tool
def skill(
    skills: Sequence[str | Path | Skill],
    *,
    sandbox: str | None = None,
    user: str | None = None,
    dir: str | None = None,
) -> Tool:
    """Make skills available to an agent.

    See the `Skill` documentation for details on defining skills.

    Args:
        skills: Agent skill specifications. Either a directory containing a skill or a full `Skill` specification.
        sandbox: Sandbox environment name to copy skills to.
        user: User to write skills files with.
        dir: Directory to install into (defaults to "./skills").
    """
    # resolve skills
    resolved_skills = read_skills(skills)

    async def execute(command: str) -> str:
        """Execute a skill within the main conversation.

        Args:
           command: The skill name (no arguments). E.g., "pdf" or "xlsx"
        """
        # see if we need to install the skills
        installed = store_as(InstalledSkills)
        if installed.skills is None:
            installed.skills = await install_skills(resolved_skills, sandbox, user, dir)

        # lookup skill
        skill_info = next((si for si in installed.skills if si.name == command), None)
        if skill_info is None:
            raise ToolError(f"Unknown skill: {command}")

        # return indicating the skill is running along with skill dir/instructions
        lines = [
            f'<command-message>The "{skill_info.name}" skill is running</command-message>',
            f"<command-name>{skill_info.name}</command-name>",
            "",
            f"Base Path: {skill_info.location}",
            "",
            skill_info.instructions,
        ]
        return "\n".join(lines)

    # skills prompt (derived from claude code and codex cli skills prompts)
    description = dedent(rf"""
    Invoke a skill to get specialized instructions for a task.

    <skills_instructions>
    Skills provide specialized capabilities and domain knowledge. Each skill contains instructions, and may include scripts, references, and assets.

    When to use:
    - Before starting a task, check if any skill in <available_skills> matches the request
    - Use the description field to determine relevance

    How to invoke:
    - Call this tool with the skill name only
    - Example: command: "pdf"
    - Example: command: "research"

    After invoking:
    - Follow the instructions returned by the skill
    - If the skill references folders like `references/`, `scripts/`, or `assets/` load only the specific files needed — don't bulk-load
    - If specific files are referended, their paths are relative to the indicated Base Path.
    - If scripts exist, prefer running them over rewriting equivalent code
    - If assets or templates exist, reuse them instead of recreating from scratch

    Multiple skills:
    - If multiple skills apply, choose the minimal set and invoke them in sequence
    - State which skills you're using and why

    Important:
    - When a skill is relevant, invoke this tool IMMEDIATELY as your first action — NEVER just mention a skill without actually calling this tool
    - Invoke the skill tool BEFORE generating any other response about the task
    - Only invoke skills listed in <available_skills>
    - Do not invoke a skill that is already running
    - If a skill can't be applied (missing files, unclear instructions), state the issue and proceed with the best alternative
    </skills_instructions>

    {_available_skills(resolved_skills)}
    """)

    return ToolDef(execute, name="skill", description=description).as_tool()


class InstalledSkills(StoreModel):
    skills: list[SkillInfo] | None = Field(default=None)


def _available_skills(skills: Sequence[Skill]) -> str:
    prompt = ["<available_skills>"]
    for skill_info in skills:
        prompt.extend(
            [
                "<skill>",
                f"<name>{skill_info.name}</name>",
                f"<description>{skill_info.description}</description></skill>",
            ]
        )
    prompt.append("</available_skills>")
    return "\n".join(prompt)
```

## `tool/_tools/_skill/types.py`

```python
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, ConfigDict, Field, JsonValue


class Skill(BaseModel):
    """Agent skill specification.

    See https://agentskills.io/specification for additional details.
    """

    name: str = Field(max_length=64, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
    """Skill name. Max 64 characters. Lowercase letters, numbers, and hyphens only. Must not start or end with a hyphen."""

    description: str = Field(max_length=1024)
    """Describes what the skill does and when to use it. Max 1024 characters."""

    instructions: str
    """Skill instructions.

    Information agents need to perform the task effectively including step-by-step instructions, examples of inputs and outputs, and common edge cases.

    Note that the agent will load this entire file once it's decided to activate a skill so you should try to keep it under 500 lines long. You can break additional information into scripts/, references/ and assets/ directories.

    If you do use scripts/, references/, etc. you should mention them explicitly in the `instructions` so models know to read them as required.
    """

    scripts: dict[str, str | bytes | Path] = Field(default_factory=dict)
    """Executable code that agents can run.

    Scripts should:

    - Be self-contained or clearly document dependencies
    - Include helpful error messages
    - Handle edge cases gracefully

    Supported languages depend on the agent implementation. Common options include Python, Bash, and JavaScript."""

    references: dict[str, str | bytes | Path] = Field(default_factory=dict)
    """Additional documentation that agents can read when needed.

    - REFERENCE.md - Detailed technical reference
    - FORMS.md - Form templates or structured data formats
    - Domain-specific files (finance.md, legal.md, etc.)

    Keep individual reference files focused. Agents load these on demand, so smaller files mean less use of context.
    """

    assets: dict[str, str | bytes | Path] = Field(default_factory=dict)
    """Static resources.

    - Templates (document templates, configuration templates)
    - Images (diagrams, examples)
    - Data files (lookup tables, schemas)
    """

    license: str | None = Field(default=None)
    """License name or reference to a bundled license file."""

    compatibility: str | None = Field(max_length=500, default=None)
    """Indicates environment requirements (intended product, system packages, network access, etc.). Max 500 characters."""

    metadata: dict[str, JsonValue] | None = Field(default=None)
    """Arbitrary key-value mapping for additional metadata."""

    allowed_tools: str | None = Field(default=None, alias="allowed-tools")
    """Space-delimited list of pre-approved tools the skill may use. (Experimental)."""

    model_config = ConfigDict(populate_by_name=True)

    def skill_md(self) -> str:
        """Render the skill as SKILL.md content.

        Returns:
            SKILL.md formatted string with YAML frontmatter and instructions body.
        """
        # Build frontmatter dict with only non-None values
        frontmatter: dict[str, Any] = {
            "name": self.name,
            "description": self.description,
        }
        if self.license is not None:
            frontmatter["license"] = self.license
        if self.compatibility is not None:
            frontmatter["compatibility"] = self.compatibility
        if self.metadata is not None:
            frontmatter["metadata"] = self.metadata
        if self.allowed_tools is not None:
            frontmatter["allowed-tools"] = self.allowed_tools

        # Render YAML frontmatter
        yaml_str = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)

        return f"---\n{yaml_str}---\n\n{self.instructions}"


class SkillInfo(BaseModel):
    """Agent skill info."""

    name: str = Field(max_length=64, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
    """Skill name. Max 64 characters. Lowercase letters, numbers, and hyphens only. Must not start or end with a hyphen."""

    description: str = Field(max_length=1024)
    """Describes what the skill does and when to use it. Max 1024 characters."""

    instructions: str
    """Skill instructions."""

    location: str
    """Full path to skill description file (SKILL.md)"""
```

## `tool/_tools/_text_editor.py`

```python
import inspect
from typing import Annotated, Literal

from pydantic import BaseModel, Discriminator, RootModel

from inspect_ai._util._json_rpc import exec_scalar_request
from inspect_ai.tool import ToolResult
from inspect_ai.tool._sandbox_tools_utils._error_mapper import (
    SandboxToolsErrorMapper,
)
from inspect_ai.tool._sandbox_tools_utils.sandbox import sandbox_with_injected_tools
from inspect_ai.util._sandbox._cli import SANDBOX_CLI
from inspect_ai.util._sandbox._json_rpc_transport import SandboxJSONRPCTransport

from .._tool import Tool, tool

# These models are cloned from the container code. If/when we decide to create
# a package that is shared between the inspect and tool-container codebases, we'll
# just have to live with it.


class BaseParams(BaseModel):
    path: str


class ViewParams(BaseParams):
    command: Literal["view"] = "view"
    view_range: list[int] | None = None


class CreateParams(BaseParams):
    command: Literal["create"] = "create"
    file_text: str


class StrReplaceParams(BaseParams):
    command: Literal["str_replace"] = "str_replace"
    old_str: str
    new_str: str | None = None


class InsertParams(BaseParams):
    command: Literal["insert"] = "insert"
    insert_line: int
    new_str: str


class UndoEditParams(BaseParams):
    command: Literal["undo_edit"] = "undo_edit"


class TextEditorParams(
    RootModel[
        ViewParams | CreateParams | StrReplaceParams | InsertParams | UndoEditParams
    ]
):
    root: Annotated[
        ViewParams | CreateParams | StrReplaceParams | InsertParams | UndoEditParams,
        Discriminator("command"),
    ]


TextEditorResult = str


@tool()
def text_editor(timeout: int | None = None, user: str | None = None) -> Tool:
    """Custom editing tool for viewing, creating and editing files.

    Perform text editor operations using a sandbox environment (e.g. "docker").

    IMPORTANT: This tool does not currently support Subtask isolation. This means
    that a change made to a file by on Subtask will be visible to another Subtask.

    Args:
      timeout: Timeout (in seconds) for command. Defaults to 180 if not provided.
      user: User to execute commands as.

    Returns:
      String with command output (stdout) or command error (stderr).
    """
    timeout = timeout or 180

    async def execute(
        command: Literal["view", "create", "str_replace", "insert", "undo_edit"],
        path: str,
        file_text: str | None = None,
        insert_line: int | None = None,
        insert_text: str | None = None,
        new_str: str | None = None,
        old_str: str | None = None,
        view_range: list[int] | None = None,
    ) -> ToolResult:
        """
        Use this function to execute text editing commands.

        Args:
          command: The command to execute.
          path: Path to file or directory, e.g. `/repo/file.py` or `../repo`.
          file_text: Required parameter of `create` command, with the content of the file to be created.
          insert_line: Required parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`.
          insert_text: Required parameter of `insert` command containing the string to insert.
          new_str: Optional parameter of `str_replace` command containing the new string (if not given, no string will be added).
          old_str: Required parameter of `str_replace` command containing the string in `path` to replace.
          view_range: Optional parameter of `view` command when `path` points to a file. If none is given, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all lines from `start_line` to the end of the file.

        Returns:
          The output of the command.
        """
        sandbox = await sandbox_with_injected_tools()

        # re-wire insert_text => new_str
        if command == "insert" and new_str is None and insert_text is not None:
            new_str = insert_text

        # Create a dictionary of the parameters
        params = {
            k: v
            for k, v in locals().items()
            if k in inspect.signature(execute).parameters
        }

        return await exec_scalar_request(
            method="text_editor",
            params=params,
            result_type=TextEditorResult,
            transport=SandboxJSONRPCTransport(sandbox, SANDBOX_CLI),
            error_mapper=SandboxToolsErrorMapper,
            timeout=timeout,
            user=user,
        )

    return execute
```

## `tool/_tools/_think.py`

```python
from .._tool import Tool, tool
from .._tool_call import ToolCall, ToolCallContent, ToolCallView, ToolCallViewer
from .._tool_def import ToolDef


@tool
def think(
    description: str | None = None,
    thought_description: str | None = None,
) -> Tool:
    """Think tool for extra thinking.

    Tool that provides models with the ability to include an additional thinking step as part of getting to its final answer.

    Note that the `think()` tool is not a substitute for reasoning and extended thinking, but rather an an alternate way of letting models express thinking that is better suited to some tool use scenarios. Please see the documentation on using the [think tool](https://inspect.aisi.org.uk/tools-standard.html#sec-think) before using it in your evaluations.

    Args:
        description: Override the default description of the think tool.
        thought_description: Override the default description of the thought parameter.
    """

    async def execute(thought: str) -> str:
        """Use the tool to think about something.

        The will not obtain new information or change the environment, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed.

        Args:
            thought: A thought to think about.
        """
        return ""

    return ToolDef(
        execute,
        name="think",
        description=description,
        parameters=(dict(thought=thought_description) if thought_description else None),
        viewer=think_tool_viewer(),
    ).as_tool()


def think_tool_viewer() -> ToolCallViewer:
    def viewer(tool_call: ToolCall) -> ToolCallView:
        call = ToolCallContent(
            format="markdown", content=tool_call.arguments.get("thought", "")
        )
        return ToolCallView(call=call)

    return viewer
```

## `tool/_tools/_update_plan.py`

```python
from pydantic import BaseModel, Field

from .._tool import Tool, tool
from .._tool_def import ToolDef


class PlanStep(BaseModel):
    step: str = Field(description="Step name.")
    status: str = Field(description="One of: pending, in_progress, completed")


@tool
def update_plan(description: str | None = None) -> Tool:
    """Planning tool to track steps and progress in a longer horizon task.

    The update_plan tool is based on the update_plan provided by [Codex CLI](https://github.com/openai/codex).

    The default tool description is taken from the GPT 5.1 system prompt for Codex. Pass a custom `description` to override this.

    Args:
        description: Override the default description of the update_plan tool.
    """

    async def execute(plan: list[PlanStep], explanation: str | None = None) -> str:
        """Update the task plan.

        You have access to an update_plan tool which tracks steps and progress and renders them to the user. Using the tool helps demonstrate that you've understood the task and convey how you're approaching it. Plans can help to make complex, ambiguous, or multi-phase work clearer and more collaborative for the user. A good plan should break the task into meaningful, logically ordered steps that are easy to verify as you go.

        Provide an optional explanation and a list of plan items, each with a step and status. At most one step can be in_progress at a time.

        Note that plans are not for padding out simple work with filler steps or stating the obvious. The content of your plan should not involve doing anything that you aren't capable of doing (i.e. don't try to test things that you can't test). Do not use plans for simple or single-step queries that you can just do or answer immediately.

        Do not repeat the full contents of the plan after an update_plan call — the harness already displays it. Instead, summarize the change made and highlight any important context or next step.

        Before running a command, consider whether or not you have completed the previous step, and make sure to mark it as completed before moving on to the next step. It may be the case that you complete all steps in your plan after a single pass of implementation. If this is the case, you can simply mark all the planned steps as completed. Sometimes, you may need to change plans in the middle of a task: call update_plan with the updated plan and make sure to provide an explanation of the rationale when doing so.

        Maintain statuses in the tool: exactly one item in_progress at a time; mark items complete when done; post timely status transitions. Do not jump an item from pending to completed: always set it to in_progress first. Do not batch-complete multiple items after the fact. Finish with all items completed or explicitly canceled/deferred before ending the turn. Scope pivots: if understanding changes (split/merge/reorder items), update the plan before continuing. Do not let the plan go stale while coding.

        Use a plan when:

        - The task is non-trivial and will require multiple actions over a long time horizon.
        - There are logical phases or dependencies where sequencing matters.
        - The work has ambiguity that benefits from outlining high-level goals.
        - You want intermediate checkpoints for feedback and validation.
        - When the user asked you to do more than one thing in a single prompt
        - The user has asked you to use the plan tool (aka "TODOs")
        - You generate additional steps while working, and plan to do them before yielding to the user

        ### Examples

        High-quality plans

        Example 1:
        - Add CLI entry with file args
        - Parse Markdown via CommonMark library
        - Apply semantic HTML template
        - Handle code blocks, images, links
        - Add error handling for invalid files

        Example 2:
        - Define CSS variables for colors
        - Add toggle with localStorage state
        - Refactor components to use variables
        - Verify all views for readability
        - Add smooth theme-change transition

        Example 3:
        - Set up Node.js + WebSocket server
        - Add join/leave broadcast events
        - Implement messaging with timestamps
        - Add usernames + mention highlighting
        - Persist messages in lightweight DB
        - Add typing indicators + unread count

        Low-quality plans

        Example 1:
        - Create CLI tool
        - Add Markdown parser
        - Convert to HTML

        Example 2:
        - Add dark mode toggle
        - Save preference
        - Make styles look good

        Example 3:
        - Create single-file HTML game
        - Run quick sanity check
        - Summarize usage instructions

        If you need to write a plan, only write high quality plans, not low quality ones.

        Args:
            plan: The list of steps.
            explanation: Optional explanation.
        """
        return "Plan updated"

    return ToolDef(
        execute,
        name="update_plan",
        description=description,
    ).as_tool()
```

## `tool/_tools/_web_browser/__init__.py`

```python
from ._web_browser import web_browser

__all__ = ["web_browser"]
```

## `tool/_tools/_web_browser/_back_compat.py`

```python
"""This module provides the "old" client code for running against the, now deprecated, `aisiuk/inspect-web-browser-tool` image."""

import re
from logging import getLogger
from textwrap import dedent

from pydantic import Field

from inspect_ai._util.content import ContentText
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.logger import warn_once
from inspect_ai.tool import ToolError, ToolResult
from inspect_ai.util import SandboxEnvironment, StoreModel, sandbox_with, store_as
from inspect_ai.util._sandbox.docker.internal import (
    INSPECT_WEB_BROWSER_IMAGE_DOCKERHUB_DEPRECATED,
)

logger = getLogger("web_browser")

WEB_CLIENT_REQUEST = "/app/web_browser/web_client.py"
WEB_CLIENT_NEW_SESSION = "/app/web_browser/web_client_new_session.py"


class WebBrowserStore(StoreModel):
    main_content: str = Field(default_factory=str)
    web_at: str = Field(default_factory=str)
    session_id: str = Field(default_factory=str)


async def old_web_browser_cmd(cmd: str, *args: str) -> ToolResult:
    sandbox_env = await _web_browser_sandbox()
    warn_once(
        logger,
        "WARNING: Use of the `aisiuk/inspect-web-browser-tool` image is deprecated. Please update your configuration to use the `aisiuk/inspect-tool-support` image or install the `inspect-tool-support` package into your own image.",
    )

    store = store_as(WebBrowserStore)
    if not store.session_id:
        result = await sandbox_env.exec(
            ["python3", WEB_CLIENT_NEW_SESSION], timeout=180
        )

        if not result.success:
            raise RuntimeError(
                f"Error creating new web browser session: {result.stderr}"
            )

        store.session_id = result.stdout.strip("\n")

    session_flag = f"--session_name={store.session_id}"

    arg_list = None
    if session_flag:
        arg_list = ["python3", WEB_CLIENT_REQUEST, session_flag, cmd] + list(args)
    else:
        arg_list = ["python3", WEB_CLIENT_REQUEST, cmd] + list(args)

    result = await sandbox_env.exec(arg_list, timeout=180)
    if not result.success:
        raise RuntimeError(
            f"Error executing web browser command {cmd}({', '.join(args)}): {result.stderr}"
        )
    else:
        response = _parse_web_browser_output(result.stdout)
        if "error" in response and response.get("error", "").strip() != "":
            raise ToolError(str(response.get("error")) or "(unknown error)")
        elif "web_at" in response:
            main_content = str(response.get("main_content")) or None
            web_at = (
                str(response.get("web_at")) or "(no web accessibility tree available)"
            )
            # Remove base64 data from images.
            web_at_lines = web_at.split("\n")
            web_at_lines = [
                line.partition("data:image/png;base64")[0] for line in web_at_lines
            ]

            store_as(WebBrowserStore).main_content = (
                main_content or "(no main text summary)"
            )
            store_as(WebBrowserStore).web_at = web_at

            web_at = "\n".join(web_at_lines)
            return (
                [
                    ContentText(text=f"main content:\n{main_content}\n\n"),
                    ContentText(text=f"accessibility tree:\n{web_at}"),
                ]
                if main_content
                else web_at
            )
        else:
            raise RuntimeError(
                f"web_browser output must contain either 'error' or 'web_at' field: {result.stdout}"
            )


async def _web_browser_sandbox() -> SandboxEnvironment:
    sb = await sandbox_with(WEB_CLIENT_REQUEST)
    if sb:
        return sb
    else:
        msg = dedent(f"""
                The web browser service was not found in any of the sandboxes for this sample. Please add the web browser service to your configuration. For example, the following Docker compose file uses the {INSPECT_WEB_BROWSER_IMAGE_DOCKERHUB_DEPRECATED} image as its default sandbox:

                services:
                  default:
                    image: "{INSPECT_WEB_BROWSER_IMAGE_DOCKERHUB_DEPRECATED}"
                    init: true

                Alternatively, this Docker compose file creates a dedicated image for the web browser service:

                services:
                  default:
                    image: "python:3.12-bookworm"
                    init: true
                    command: "tail -f /dev/null"

                  web_browser:
                    image: "{INSPECT_WEB_BROWSER_IMAGE_DOCKERHUB_DEPRECATED}"
                    init: true
                """).strip()
        raise PrerequisiteError(msg)


def _parse_web_browser_output(output: str) -> dict[str, str]:
    response: dict[str, str] = dict(
        web_url="", main_content="", web_at="", info="", error=""
    )
    active_field: str | None = None
    active_field_lines: list[str] = []

    def collect_active_field() -> None:
        if active_field is not None:
            response[active_field] = "\n".join(active_field_lines)
        active_field_lines.clear()

    for line in output.splitlines():
        field_match = re.match(
            r"^(error|main_content|web_at|web_url|info)\s*:\s*(.+)$", line
        )
        if field_match:
            collect_active_field()
            active_field = field_match.group(1)
            active_field_lines.append(field_match.group(2))
        else:
            active_field_lines.append(line)
    collect_active_field()

    return response
```

## `tool/_tools/_web_browser/_web_browser.py`

```python
import re

from pydantic import BaseModel, Field

from inspect_ai._util._json_rpc import exec_model_request
from inspect_ai._util.content import ContentText
from inspect_ai._util.error import PrerequisiteError
from inspect_ai.tool._sandbox_tools_utils._error_mapper import (
    SandboxToolsErrorMapper,
)
from inspect_ai.tool._sandbox_tools_utils._legacy_helpers import (
    LEGACY_SANDBOX_CLI,
    legacy_tool_support_sandbox,
)
from inspect_ai.tool._tool import Tool, ToolError, ToolResult, tool
from inspect_ai.tool._tool_call import ToolCall, ToolCallContent, ToolCallView
from inspect_ai.tool._tool_info import parse_tool_info
from inspect_ai.tool._tool_with import tool_with
from inspect_ai.util._sandbox._json_rpc_transport import SandboxJSONRPCTransport
from inspect_ai.util._store_model import StoreModel, store_as

from ._back_compat import old_web_browser_cmd


# These two models are cloned from the container code. If/when we decide to create
# a package that is shared between the inspect and tool-container codebases, we'll
# just have to live with it.
class NewSessionResult(BaseModel):
    session_name: str


class CrawlerResult(BaseModel):
    web_url: str
    main_content: str | None = None
    web_at: str
    error: str | None = None


def web_browser(*, interactive: bool = True, instance: str | None = None) -> list[Tool]:
    """Tools used for web browser navigation.

    To create a separate web browser process for each
    call to `web_browser()`, pass a unique value for `instance`.

    See complete documentation at <https://inspect.aisi.org.uk/tools-standard.html#sec-web-browser>.

    Args:
       interactive: Provide interactive tools (enable
          clicking, typing, and submitting forms). Defaults
          to True.
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       List of tools used for web browser navigation.

    """
    # start with go tool (excluding interactive docs if necessary)
    go = web_browser_go(instance)
    if not interactive:
        go = go_without_interactive_docs(go)
    tools = [go]

    # add interactive tools if requested
    if interactive:
        tools = tools + [
            tool_with_web_at_viewer(web_browser_click(instance), instance),
            tool_with_web_at_viewer(web_browser_type_submit(instance), instance),
            tool_with_web_at_viewer(web_browser_type(instance), instance),
        ]

    # add navigational tools
    return tools + [
        web_browser_scroll(instance),
        web_browser_back(instance),
        web_browser_forward(instance),
        web_browser_refresh(instance),
    ]


@tool(parallel=False)
def web_browser_go(instance: str | None = None) -> Tool:
    """Web Browser tool for navigation to a URL.

    Args:
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       Web browser navigation tool.
    """

    async def execute(url: str) -> ToolResult:
        """Navigate the web browser to a URL.

        Once you have navigated to a page, you will be presented with a web accessibility tree of the elements on the page. Each element has an ID, which is displayed in brackets at the beginning of its line. For example:

        ```
        [1] RootWebArea "Google" [focused: True, url: https://www.google.com/]
          [76] link "About" [url: https://about.google/]
          [85] link "Gmail " [url: https://mail.google.com/mail/&ogbl]
            [4] StaticText "Gmail"
          [91] button "Google apps" [expanded: False]
          [21] combobox "Search" [editable: plaintext, autocomplete: both, hasPopup: listbox, required: False, expanded: False, controls: Alh6id]
        ```

        To execute a Google Search for 'dogs', you would type into the "Search" combobox with element ID 21 and then press ENTER using the web_browser_type_submit tool:

        web_browser_type_submit(21, "dogs")

        You should only attempt to navigate the web browser one page at a time (parallel calls to web browser tools are not permitted).

        Args:
          url (str): URL to navigate to.

        Returns:
          Web accessibility tree of the visible elements of the web page. The element_id of each element is displayed in brackets at the beginning of the line.
        """
        return await _web_browser_cmd("web_go", instance, locals())

    return execute


def go_without_interactive_docs(tool: Tool) -> Tool:
    tool_info = parse_tool_info(tool)
    description_lines = tool_info.description.splitlines()
    description_lines = [
        line for line in description_lines if "web_browser_type_submit" not in line
    ]
    return tool_with(tool, description="\n".join(description_lines))


# custom viewer for interactive tool calls that shows a truncated
# version of current the web accessibility tree if available


class WebBrowserStore(StoreModel):
    main_content: str = Field(default_factory=str)
    web_at: str = Field(default_factory=str)
    session_id: str = Field(default_factory=str)


def tool_with_web_at_viewer(tool: Tool, instance: str | None = None) -> Tool:
    def web_at_viewer(call: ToolCall) -> ToolCallView:
        # get the web accessibility tree, if we have it create a view from it
        web_at = store_as(WebBrowserStore, instance=instance).web_at
        element_id = call.arguments.get("element_id", 0)
        if web_at and element_id:
            lines = web_at.splitlines()
            pattern = re.compile(rf"^\s+\[{element_id}\] .*$")
            for i, line in enumerate(lines):
                if pattern.match(line):
                    snippet = (
                        lines[0:1]
                        + ["  ..."]
                        + lines[max(i - 2, 1) : i]
                        + [line.replace(" ", "*", 1)]
                        + lines[i + 1 : min(i + 3, len(lines))]
                        + ["  ..."]
                    )

                    return ToolCallView(
                        context=ToolCallContent(
                            format="text", content="\n".join(snippet)
                        )
                    )

        # no view found
        return ToolCallView()

    return tool_with(tool, viewer=web_at_viewer)


@tool(parallel=False)
def web_browser_click(instance: str | None = None) -> Tool:
    """Web Browser tool for clicking an element on a web page.

    Args:
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       Web browser clicking tool.
    """

    async def execute(element_id: int) -> ToolResult:
        """Click an element on the page currently displayed by the web browser.

        For example, with the following web accessibility tree:

        ```
        [304] RootWebArea "Poetry Foundation" [focused: True, url: https://www.poetryfoundation.org/]
          [63] StaticText "POETRY FOUNDATION"
          [427] button "POEMS & POETS" [expanded: False]
          [434] button "FEATURES" [expanded: False]
        ```

        You could click on the "POEMS & POETS" button with:

        web_browser_click(427)

        Args:
           element_id (int): ID of the element to click.

        Returns:
           Web accessibility tree of the visible elements of the web page. The element_id of each element is displayed in brackets at the beginning of the line.
        """
        return await _web_browser_cmd("web_click", instance, locals())

    return execute


@tool(parallel=False)
def web_browser_type_submit(instance: str | None = None) -> Tool:
    """Web Browser tool for typing and submitting input.

    Args:
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       Web browser type and submit tool.
    """

    async def execute(element_id: int, text: str) -> ToolResult:
        """Type text into a form input on a web browser page and press ENTER to submit the form.

        For example, to execute a search for "Yeats" from this page:

        ```
        [2] RootWebArea "Moon - Wikipedia" [focused: True, url: https://en.wikipedia.org/wiki/Moon]
          [91] StaticText "Jump to content"
          [682] button "Main menu" [hasPopup: menu]
          [751] searchbox "Search Wikipedia" [editable: plaintext, keyshortcuts: Alt+f]
          [759] button "Search"
          [796] button "Personal tools" [hasPopup: menu]
        ```

        You would type into the searchbox and press ENTER using the following tool call:

        web_browser_type_submit(751, "Yeats")

        Args:
           element_id (int): ID of the element to type text into.
           text (str): Text to type.

        Returns:
           Web accessibility tree of the visible elements of the web page. The element_id of each element is displayed in brackets at the beginning of the line.
        """
        return await _web_browser_cmd("web_type_submit", instance, locals())

    return execute


@tool(parallel=False)
def web_browser_type(instance: str | None = None) -> Tool:
    """Web Browser tool for typing into inputs.

    Args:
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       Web browser typing tool.
    """

    async def execute(element_id: int, text: str) -> ToolResult:
        """Type text into an input on a web browser page.

        For example, to type "Norah" into the "First Name" search box on this page:

        ```
        [106] RootWebArea "My Profile" [focused: True, url: https://profile.example.com]
          [305] link "My library" [url: https://profile.example.com/library]
          [316] textbox "First Name" [focused: True, editable: plaintext, required: False]
          [316] textbox "Last Name" [focused: True, editable: plaintext, required: False]
        ```

        You would use the following command:

        web_browser_type(316, "Norah")

        Note that the web_browser_type_submit tool is typically much more useful than the web_browser_type tool since it enters input and submits the form. You would typically only need to use the web_browser_type tool to fill out forms with multiple inputs.

        Args:
           element_id (int): ID of the element to type text into.
           text (str): Text to type.

        Returns:
           Web accessibility tree of the visible elements of the web page. The element_id of each element is displayed in brackets at the beginning of the line.
        """
        return await _web_browser_cmd("web_type", instance, locals())

    return execute


@tool(parallel=False)
def web_browser_scroll(instance: str | None = None) -> Tool:
    """Web Browser tool for scrolling up or down one page.

    Args:
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       Web browser scrolling tool.
    """

    async def execute(direction: str) -> ToolResult:
        """Scroll the web browser up or down by one page.

        Occasionally some very long pages don't display all of their content at once. To see additional content you can scroll the page down with:

        web_browser_scroll("down")

        You can then return to the previous scroll position with:

        web_browser_scroll("up")

        Args:
           direction (str): "up" or "down"

        Returns:
           Web accessibility tree of the visible elements of the web page. The element_id of each element is displayed in brackets at the beginning of the line.
        """
        return await _web_browser_cmd("web_scroll", instance, locals())

    return execute


@tool(parallel=False)
def web_browser_back(instance: str | None = None) -> Tool:
    """Web Browser tool for navigating back in the browser history.

    Args:
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       Web browser back navigation tool.
    """

    async def execute() -> ToolResult:
        """Navigate the web browser back in the browser history.

        If you want to view a page that you have previously browsed (or perhaps just didn't find what you were looking for on a page and want to backtrack) use the web_browser_back tool.

        Returns:
           Web accessibility tree of the visible elements of the web page. The element_id of each element is displayed in brackets at the beginning of the line.
        """
        return await _web_browser_cmd("web_back", instance, locals())

    return execute


@tool(parallel=False)
def web_browser_forward(instance: str | None = None) -> Tool:
    """Web Browser tool for navigating forward in the browser history.

    Args:
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       Web browser forward navigation tool.
    """

    async def execute() -> ToolResult:
        """Navigate the web browser forward in the browser history.

        If you have navigated back in the browser history and then want to navigate forward use the web_browser_forward tool.

        Returns:
           Web accessibility tree of the visible elements of the web page. The element_id of each element is displayed in brackets at the beginning of the line.
        """
        return await _web_browser_cmd("web_forward", instance, locals())

    return execute


@tool(parallel=False)
def web_browser_refresh(instance: str | None = None) -> Tool:
    """Web Browser tool for refreshing the current page.

    Args:
       instance: Instance id (each unique instance id has its own web browser process)

    Returns:
       Web browser page refresh tool.
    """

    async def execute() -> ToolResult:
        """Refresh the current page of the web browser.

        If you have interacted with a page by clicking buttons and want to reset it to its original state, use the web_browser_refresh tool.

        Returns:
           Web accessibility tree of the visible elements of the web page. The element_id of each element is displayed in brackets at the beginning of the line.
        """
        return await _web_browser_cmd("web_refresh", instance, locals())

    return execute


async def _web_browser_cmd(
    tool_name: str, instance: str | None, params: dict[str, object]
) -> ToolResult:
    # TODO: Is it worth it to plumb this down from the @tool?
    timeout = 180
    try:
        (sandbox_env, _) = await legacy_tool_support_sandbox("web browser")
    except PrerequisiteError as e:
        # The user may have the old, incompatible, sandbox. If so, use that and
        # execute the old compatible code.
        try:
            return await old_web_browser_cmd(
                tool_name, *(str(value) for value in params.values())
            )
        except PrerequisiteError:
            raise e

    # bind to store (use instance id if provided)
    store = store_as(WebBrowserStore, instance=instance)

    # Create transport for all RPC calls
    transport = SandboxJSONRPCTransport(sandbox_env, LEGACY_SANDBOX_CLI)

    if not store.session_id:
        store.session_id = (
            await exec_model_request(
                method="web_new_session",
                params={"headful": False},
                result_type=NewSessionResult,
                transport=transport,
                error_mapper=SandboxToolsErrorMapper,
                timeout=timeout,
            )
        ).session_name

    params["session_name"] = store.session_id

    crawler_result = await exec_model_request(
        method=tool_name,
        params=params,
        result_type=CrawlerResult,
        transport=transport,
        error_mapper=SandboxToolsErrorMapper,
        timeout=timeout,
    )
    if crawler_result.error and crawler_result.error.strip() != "":
        raise ToolError(crawler_result.error)
    else:
        main_content = crawler_result.main_content
        web_at = crawler_result.web_at or "(no web accessibility tree available)"
        # Remove base64 data from images.
        web_at_lines = web_at.split("\n")
        web_at_lines = [
            line.partition("data:image/png;base64")[0] for line in web_at_lines
        ]

        store.main_content = main_content or "(no main text summary)"
        store.web_at = web_at

        web_at = "\n".join(web_at_lines)
        return (
            [
                ContentText(text=f"main content:\n{main_content}\n\n"),
                ContentText(text=f"accessibility tree:\n{web_at}"),
            ]
            if main_content
            else web_at
        )
```

## `tool/_tools/_web_search/__init__.py`

```python
from ._web_search import WebSearchProviders, web_search

__all__ = ["WebSearchProviders", "web_search"]
```

## `tool/_tools/_web_search/_base_http_provider.py`

```python
import os
from abc import ABC, abstractmethod
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    stop_after_delay,
    wait_exponential_jitter,
)

from inspect_ai._util.content import ContentText
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.httpx import httpx_should_retry, log_httpx_retry_attempt
from inspect_ai.util._concurrency import concurrency


class BaseHttpProvider(ABC):
    """Base class for HTTP-based web search providers (Exa, Tavily, etc.)."""

    def __init__(
        self,
        env_key_name: str,
        api_endpoint: str,
        provider_name: str,
        concurrency_key: str,
        options: dict[str, Any] | None = None,
    ):
        self.env_key_name = env_key_name
        self.api_endpoint = api_endpoint
        self.provider_name = provider_name
        self.concurrency_key = concurrency_key

        self.max_connections = self._extract_max_connections(options)
        self.api_options = self._prepare_api_options(options)
        self.api_key = self._validate_api_key()
        self.client = httpx.AsyncClient(timeout=30)

    @abstractmethod
    def prepare_headers(self, api_key: str) -> dict[str, str]:
        """Prepare HTTP headers for the request."""
        pass

    @abstractmethod
    def parse_response(self, response_data: dict[str, Any]) -> ContentText | None:
        """Parse the API response and extract content with citations."""
        pass

    @abstractmethod
    def set_default_options(self, options: dict[str, Any]) -> dict[str, Any]:
        """Set provider-specific default options."""
        pass

    def _extract_max_connections(self, options: dict[str, Any] | None) -> int:
        """Extract max_connections from options, defaulting to 10."""
        if not options:
            return 10
        max_conn = options.get("max_connections", 10)
        return int(max_conn) if max_conn is not None else 10

    def _prepare_api_options(self, options: dict[str, Any] | None) -> dict[str, Any]:
        """Prepare API options by removing max_connections and setting defaults."""
        if not options:
            api_options = {}
        else:
            # Remove max_connections as it's not an API option
            api_options = {k: v for k, v in options.items() if k != "max_connections"}

        # Apply provider-specific defaults
        return self.set_default_options(api_options)

    def _validate_api_key(self) -> str:
        """Validate that the required API key is set in environment."""
        api_key = os.environ.get(self.env_key_name)
        if not api_key:
            raise PrerequisiteError(
                f"{self.env_key_name} not set in the environment. Please ensure this variable is defined to use {self.provider_name} with the web_search tool.\n\nLearn more about the {self.provider_name} web search provider at https://inspect.aisi.org.uk/tools.html#{self.provider_name.lower()}-provider"
            )
        return api_key

    async def search(self, query: str) -> ContentText | None:
        """Execute a search query using the provider's API."""

        # Common retry logic for all HTTP providers
        @retry(
            wait=wait_exponential_jitter(),
            stop=stop_after_attempt(5) | stop_after_delay(60),
            retry=retry_if_exception(httpx_should_retry),
            before_sleep=log_httpx_retry_attempt(self.api_endpoint),
        )
        async def _search() -> httpx.Response:
            response = await self.client.post(
                self.api_endpoint,
                headers=self.prepare_headers(self.api_key),
                json={"query": query, **self.api_options},
            )
            response.raise_for_status()
            return response

        async with concurrency(self.concurrency_key, self.max_connections):
            response_data = (await _search()).json()
            return self.parse_response(response_data)
```

## `tool/_tools/_web_search/_exa.py`

```python
from typing import Any, Literal

from pydantic import BaseModel

from inspect_ai._util.citation import UrlCitation
from inspect_ai._util.content import ContentText

from ._base_http_provider import BaseHttpProvider
from ._web_search_provider import SearchProvider


class ExaOptions(BaseModel):
    # See https://docs.exa.ai/reference/answer
    text: bool | None = None
    """Whether to include text content in citations"""
    model: Literal["exa", "exa-pro"] | None = None
    """LLM model to use for generating the answer"""
    max_connections: int | None = None
    """max_connections is not an Exa API option, but an inspect option"""


class ExaCitation(BaseModel):
    id: str
    url: str
    title: str
    author: str | None = None
    publishedDate: str | None = None
    text: str


class ExaSearchResponse(BaseModel):
    answer: str
    citations: list[ExaCitation]


class ExaSearchProvider(BaseHttpProvider):
    def __init__(self, options: dict[str, Any] | None = None):
        super().__init__(
            env_key_name="EXA_API_KEY",
            api_endpoint="https://api.exa.ai/answer",
            provider_name="Exa",
            concurrency_key="exa_web_search",
            options=options,
        )

    def prepare_headers(self, api_key: str) -> dict[str, str]:
        return {
            "x-api-key": api_key,
            "Content-Type": "application/json",
        }

    def set_default_options(self, options: dict[str, Any]) -> dict[str, Any]:
        return options

    def parse_response(self, response_data: dict[str, Any]) -> ContentText | None:
        exa_search_response = ExaSearchResponse.model_validate(response_data)

        if not exa_search_response.answer and not exa_search_response.citations:
            return None

        return ContentText(
            text=exa_search_response.answer,
            citations=[
                UrlCitation(
                    cited_text=citation.text, title=citation.title, url=citation.url
                )
                for citation in exa_search_response.citations
            ],
        )


def exa_search_provider(
    in_options: dict[str, object] | None = None,
) -> SearchProvider:
    options = ExaOptions.model_validate(in_options) if in_options else None
    return ExaSearchProvider(
        options.model_dump(exclude_none=True) if options else None
    ).search
```

## `tool/_tools/_web_search/_google.py`

```python
import os
from urllib.parse import urlencode

import anyio
import httpx
from pydantic import BaseModel
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    stop_after_delay,
    wait_exponential_jitter,
)

from inspect_ai._util.citation import UrlCitation
from inspect_ai._util.content import ContentText
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.httpx import httpx_should_retry, log_httpx_retry_attempt
from inspect_ai.util._concurrency import concurrency

from ._web_search_provider import SearchProvider

DEFAULT_RELEVANCE_PROMPT = """I am trying to answer the following question and need to find the most relevant information on the web. Please let me know if the following content is relevant to the question or not. You should just respond with "yes" or "no".

Question: {question}
Page Content: {text}
"""


class GoogleOptions(BaseModel):
    num_results: int | None = None
    max_provider_calls: int | None = None
    max_connections: int | None = None
    model: str | None = None


class SearchLink:
    def __init__(self, url: str, snippet: str, title: str) -> None:
        self.url = url
        self.snippet = snippet
        self.title = title


def maybe_get_google_api_keys() -> tuple[str, str] | None:
    """
    Get Google API keys from environment variables.

    Returns:
        tuple: A tuple containing the Google API key and the Google CSE ID.
    """
    google_api_key = os.environ.get("GOOGLE_CSE_API_KEY", None)
    google_cse_id = os.environ.get("GOOGLE_CSE_ID", None)
    return (google_api_key, google_cse_id) if google_api_key and google_cse_id else None


def google_search_provider(
    in_options: dict[str, object] | None = None,
) -> SearchProvider:
    options = GoogleOptions.model_validate(in_options) if in_options else None
    num_results = (options.num_results if options else None) or 3
    max_provider_calls = (options.max_provider_calls if options else None) or 3
    max_connections = (options.max_connections if options else None) or 10
    model = options.model if options else None

    keys = maybe_get_google_api_keys()
    if not keys:
        raise PrerequisiteError(
            "GOOGLE_CSE_ID and/or GOOGLE_CSE_API_KEY not set in the environment. Please ensure these variables are defined to use Google Custom Search with the web_search tool.\n\nLearn more about the Google web search provider at https://inspect.aisi.org.uk/tools.html#google-provider"
        )
    google_api_key, google_cse_id = keys

    # Create the client within the provider
    client = httpx.AsyncClient()

    async def search(query: str) -> list[ContentText] | None:
        # limit number of concurrent searches
        results: list[ContentText] = []
        search_calls = 0

        # Paginate through search results until we have successfully extracted num_results pages or we have reached max_provider_calls
        while len(results) < num_results and search_calls < max_provider_calls:
            async with concurrency("google_web_search", max_connections):
                links = await _search(query, start_idx=search_calls * 10)

            async with anyio.create_task_group() as tg:

                async def process_link(link: SearchLink) -> None:
                    try:
                        if page := await page_if_relevant(
                            link.url, query, model, client
                        ):
                            results.append(page)
                    # exceptions fetching pages are very common!
                    except Exception:
                        pass

                for lk in links:
                    tg.start_soon(process_link, lk)

            search_calls += 1

        return results or None

    async def _search(query: str, start_idx: int) -> list[SearchLink]:
        # List of allowed parameters can be found https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list
        search_params = {
            "q": query,
            "key": google_api_key,
            "cx": google_cse_id,
            "start": start_idx,
        }
        search_url = "https://www.googleapis.com/customsearch/v1?" + urlencode(
            search_params
        )

        # retry up to 5 times over a period of up to 1 minute
        @retry(
            wait=wait_exponential_jitter(),
            stop=stop_after_attempt(5) | stop_after_delay(60),
            retry=retry_if_exception(httpx_should_retry),
            before_sleep=log_httpx_retry_attempt(search_url),
        )
        async def execute_search() -> httpx.Response:
            # See https://developers.google.com/custom-search/v1/reference/rest/v1/Search
            return await client.get(search_url)

        result = await execute_search()
        data = result.json()

        if "items" in data:
            return [
                SearchLink(
                    url=item["link"],
                    snippet=item.get("snippet", ""),  # sometimes not present
                    title=item["title"],
                )
                for item in data["items"]
            ]
        else:
            return []

    return search


async def page_if_relevant(
    url: str, query: str, relevance_model: str | None, client: httpx.AsyncClient
) -> ContentText | None:
    """
    Use parser model to determine if a web page contents is relevant to a query.

    Args:
        url (str): Web page url.
        query (str): Search query.
        relevance_model (Model): Model used to parse web pages for relevance.
        client: (httpx.Client): HTTP client to use to fetch the page

    Returns:
        str: Web page contents if relevant, else None.
    """
    from bs4 import BeautifulSoup, NavigableString

    # resolve model
    from inspect_ai.model._model import get_model

    model = get_model(relevance_model)

    # retrieve document
    try:
        response = await client.get(url)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise Exception(f"HTTP error occurred: {exc}")

    # parse it
    encoding_scheme = response.encoding or "utf-8"
    soup = BeautifulSoup(response.content.decode(encoding_scheme), "html.parser")
    page_title = soup.title.get_text(strip=True) if soup.title else None

    main_content = soup.find("main") or soup.find("body") or soup
    if not isinstance(main_content, NavigableString):
        paragraphs = main_content.find_all("p")
        full_text = ""
        for p in paragraphs:
            full_text += ("\n" if full_text else "") + p.get_text(
                strip=True, separator=" "
            )
            if len(full_text.split()) > 2000:
                break
    else:
        full_text = " ".join(
            main_content.get_text(strip=True, separator=" ").split()[:2000]
        )

    is_relevant = (
        await model.generate(
            DEFAULT_RELEVANCE_PROMPT.format(question=query, text=full_text)
        )
    ).message.text

    if "yes" in is_relevant.lower():
        return ContentText(
            text=(f"{page_title}\n" if page_title else "") + full_text,
            citations=[UrlCitation(url=url, title=page_title)],
        )
    else:
        return None
```

## `tool/_tools/_web_search/_tavily.py`

```python
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field

from inspect_ai._util.citation import UrlCitation
from inspect_ai._util.content import ContentText
from inspect_ai.tool._tool import ToolError

from ._base_http_provider import BaseHttpProvider
from ._web_search_provider import SearchProvider


class TavilyOptions(BaseModel):
    topic: Literal["general", "news"] | None = None
    search_depth: Literal["basic", "advanced"] | None = None
    chunks_per_source: Literal[1, 2, 3] | None = None
    max_results: int | None = None
    time_range: Literal["day", "week", "month", "year", "d", "w", "m", "y"] | None = (
        None
    )
    days: int | None = None
    include_answer: bool | Literal["basic", "advanced"] | None = None
    include_raw_content: bool | None = None
    include_images: bool | None = None
    include_image_descriptions: bool | None = None
    include_domains: list[str] | None = None
    exclude_domains: list[str] | None = None
    # max_connections is not a Tavily API option, but an inspect option
    max_connections: int | None = None


class TavilySearchResult(BaseModel):
    title: str
    url: str
    content: str
    score: float


class TavilySearchResponse(BaseModel):
    query: str
    answer: str | None = Field(default=None)
    images: list[object]
    results: list[TavilySearchResult]
    response_time: float


class TavilySearchProvider(BaseHttpProvider):
    """Tavily-specific implementation of HttpSearchProvider."""

    def __init__(self, options: dict[str, Any] | None = None):
        super().__init__(
            env_key_name="TAVILY_API_KEY",
            api_endpoint="https://api.tavily.com/search",
            provider_name="Tavily",
            concurrency_key="tavily_web_search",
            options=options,
        )

    def prepare_headers(self, api_key: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key}",
        }

    def set_default_options(self, options: dict[str, Any]) -> dict[str, Any]:
        # Force inclusion of answer if not specified
        new_options = options.copy()
        new_options["include_answer"] = True
        return new_options

    async def search(self, query: str) -> ContentText | None:
        """Execute a search, converting query-too-long 400s to ToolError."""
        try:
            return await super().search(query)
        except httpx.HTTPStatusError as ex:
            if ex.response.status_code == 400:
                detail = _is_query_too_long_error(ex)
                if detail:
                    raise ToolError(detail) from ex
            raise

    def parse_response(self, response_data: dict[str, Any]) -> ContentText | None:
        tavily_search_response = TavilySearchResponse.model_validate(response_data)

        if not tavily_search_response.results and not tavily_search_response.answer:
            return None

        return ContentText(
            text=tavily_search_response.answer or "No answer found.",
            citations=[
                UrlCitation(
                    cited_text=result.content, title=result.title, url=result.url
                )
                for result in tavily_search_response.results
            ],
        )


_QUERY_TOO_LONG = "query is too long"


def _is_query_too_long_error(ex: httpx.HTTPStatusError) -> str | None:
    """Check if a Tavily 400 is a query-too-long error.

    Returns the error message if it matches, or None otherwise.
    """
    try:
        body = ex.response.json()
        detail = body.get("detail", {})
        if isinstance(detail, dict):
            message = detail.get("error", "")
        elif isinstance(detail, str):
            message = detail
        else:
            return None
        if _QUERY_TOO_LONG in message.lower():
            return str(message)
    except Exception:
        pass
    return None


def tavily_search_provider(
    in_options: dict[str, object] | None = None,
) -> SearchProvider:
    options = TavilyOptions.model_validate(in_options) if in_options else None
    return TavilySearchProvider(
        options.model_dump(exclude_none=True) if options else None
    ).search
```

## `tool/_tools/_web_search/_web_search.py`

```python
from typing import (
    Any,
    Literal,
    TypeAlias,
    get_args,
)

from typing_extensions import TypedDict, Unpack

from inspect_ai._util.deprecation import deprecation_warning
from inspect_ai.tool._tool_def import ToolDef

from ..._tool import Tool, ToolResult, tool
from ._exa import ExaOptions, exa_search_provider
from ._google import GoogleOptions, google_search_provider, maybe_get_google_api_keys
from ._tavily import TavilyOptions, tavily_search_provider
from ._web_search_provider import SearchProvider

WebSearchProvider: TypeAlias = Literal[
    "grok",
    "gemini",
    "openai",
    "anthropic",
    "mistral",
    "perplexity",
    "tavily",
    "google",
    "exa",
]
valid_providers = set(get_args(WebSearchProvider))


# It would have been nice if the values below were TypedDicts. The problem is
# that if the caller creates a literal dict variable (rather than passing the
# dict inline), the type checker will erase the type of the literal to something
# that doesn't conform the the required TypedDict when passed. This is lame, but
# we'll do runtime validation instead.
#
# If the caller uses this dict form and uses a value of `None`, it means that
# they want to use that provider and to use the default options.
class WebSearchProviders(TypedDict, total=False):
    """Provider configuration for `web_search()` tool.

    The `web_search()` tool provides models the ability to enhance their context window by performing a search. Web searches are executed using a provider. Providers are split into two categories:

    -   Internal providers: `"openai"`, `"anthropic"`, `"gemini"`, `"grok"`, `mistral`, and `"perplexity"` - these use the model's built-in search capability and do not require separate API keys. These work only for their respective model provider (e.g. the "openai" search provider works only for `openai/*` models).

    -   External providers: `"tavily"`, `"exa"`, and `"google"`. These are external services that work with any model and require separate accounts and API keys. Note that "google" is different from "gemini" - "google" refers to Google's Programmable Search Engine service, while "gemini" refers to Google's built-in search capability for Gemini models.

    By default, all internal providers are enabled if there are no external providers defined.
    If an external provider is defined then you need to explicitly enable internal providers
    that you want to use.

    Internal providers will be prioritized if running on the corresponding model (e.g., "openai" provider will be used when running on `openai` models). If an internal provider is specified but the evaluation is run with a different model, a fallback external provider must also be specified.
    """

    openai: dict[str, Any] | bool
    """Use OpenAI internal provider. For available options see <https://platform.openai.com/docs/guides/tools-web-search?api-mode=responses>."""

    anthropic: dict[str, Any] | bool
    """Use Anthropic internal provider. For available options see <https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/web-search-tool>."""

    grok: dict[str, Any] | bool
    """Use Grok internal provider. For available options see <https://docs.x.ai/docs/guides/tools/search-tools#web-search-parameters>."""

    gemini: dict[str, Any] | bool
    """Use Gemini internal provider. For available options see <https://ai.google.dev/gemini-api/docs/google-search>."""

    mistral: dict[str, Any] | bool
    """Use Mistral internal provider. For available options see <https://docs.mistral.ai/agents/tools/built-in/websearch>."""

    perplexity: dict[str, Any] | bool
    """Use Perplexity internal provider. For available options see <https://docs.perplexity.ai/api-reference/chat-completions-post>"""

    tavily: dict[str, Any] | bool
    """Use Tavili external provider. For available options see <Use Exa external provider. For available options see <https://inspect.aisi.org.uk/tools-standard.html#tavili-options>."""

    google: dict[str, Any] | bool
    """Use Google external provider. For available options see <https://inspect.aisi.org.uk/tools-standard.html#google-options>."""

    exa: dict[str, Any] | bool
    """Use Exa external provider. For available options see <https://inspect.aisi.org.uk/tools-standard.html#exa-options>."""


class _NormalizedProviders(TypedDict, total=False):
    openai: dict[str, Any]
    anthropic: dict[str, Any]
    grok: dict[str, Any]
    gemini: dict[str, Any]
    mistral: dict[str, Any]
    perplexity: dict[str, Any]
    tavily: dict[str, Any]
    google: dict[str, Any]
    exa: dict[str, Any]


class WebSearchDeprecatedArgs(TypedDict, total=False):
    provider: Literal["tavily", "google"] | None
    num_results: int | None
    max_provider_calls: int | None
    max_connections: int | None
    model: str | None


@tool
def web_search(
    providers: WebSearchProvider
    | WebSearchProviders
    | list[WebSearchProvider | WebSearchProviders]
    | None = None,
    **deprecated: Unpack[WebSearchDeprecatedArgs],
) -> Tool:
    """Web search tool.

    Web searches are executed using a provider. Providers are split
    into two categories:

    - Internal providers: "openai", "anthropic", "grok", "gemini", "mistral", "perplexity".
      These use the model's built-in search capability and do not require separate
      API keys. These work only for their respective model provider (e.g. the
      "openai" search provider works only for `openai/*` models).

    - External providers: "tavily", "google", and "exa". These are external services
      that work with any model and require separate accounts and API keys.

    By default, all internal providers are enabled if there are no external providers defined.
    If an external provider is defined then you need to explicitly enable internal providers
    that you want to use.

    Internal providers will be prioritized if running on the corresponding model
    (e.g., "openai" provider will be used when running on `openai` models). If an
    internal provider is specified but the evaluation is run with a different
    model, a fallback external provider must also be specified.

    See further documentation at <https://inspect.aisi.org.uk/tools-standard.html#sec-web-search>.

    Args:
      providers: Configuration for the search providers to use. Currently supported
        providers are "openai", "anthropic", "perplexity", "tavily", "gemini", "mistral", "grok",
        "google", and "exa". The `providers` parameter supports several formats
        based on either a `str` specifying a provider or a `dict` whose keys are
        the provider names and whose values are the provider-specific options. A
        single value or a list of these can be passed.

        Use built-in search for all providers:
        ```
        web_search()
        ```

        Single external provider:
        ```
        web_search("tavily")
        web_search({"tavily": {"max_results": 5}})  # Tavily-specific options
        ```

        Multiple providers:
        ```
        # "openai" used for OpenAI models, "tavily" for other models
        web_search(["openai", "tavily"])

        # The True value means to use the provider with default options
        web_search({"openai": True, "tavily": {"max_results": 5}}
        ```

        Mixed format:
        ```
        web_search(["openai", "anthropic", {"tavily": {"max_results": 5}}])
        ```

        When specified in the `dict` format, the `None` value for a provider means
        to use the provider with default options.

        Provider-specific options:
        - openai: Supports OpenAI's web search parameters.
          See https://platform.openai.com/docs/guides/tools-web-search?api-mode=responses

        - anthropic: Supports Anthropic's web search parameters.
          See https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/web-search-tool#tool-definition

        - perplexity: Supports Perplexity's web search parameters.
          See https://docs.perplexity.ai/api-reference/chat-completions-post

        - tavily: Supports options like `max_results`, `search_depth`, etc.
          See https://docs.tavily.com/documentation/api-reference/endpoint/search

        - exa: Supports options like `text`, `model`, etc.
          See https://docs.exa.ai/reference/answer

        - google: Supports options like `num_results`, `max_provider_calls`,
          `max_connections`, and `model`

        - grok: Supports X-AI's live search parameters.
          See https://docs.x.ai/docs/guides/live-search#live-search

      **deprecated: Deprecated arguments.

    Returns:
       A tool that can be registered for use by models to search the web.
    """
    normalized_providers = _normalize_config(providers, **deprecated)

    search_provider: SearchProvider | None = None

    async def execute(query: str) -> ToolResult:
        """
        Use the web_search tool to perform keyword searches of the web.

        Args:
            query (str): Search query.
        """
        nonlocal search_provider
        if not search_provider:
            search_provider = _create_external_provider(normalized_providers)
        search_result = await search_provider(query)

        # This is gunky here because ToolResult is typed with a List rather than
        # a Sequence, and Lists are variant (rather than covariant). This means
        # it's illegal to assign a List of a narrower type to a List of a broader
        # type. By making a copy of the list and not capturing an alias to it,
        # mypy knows it's safe.
        return (
            list(search_result)
            if isinstance(search_result, list)
            else search_result
            if search_result is not None
            else "I couldn't find any relevant information on the web."
        )

    return ToolDef(
        execute, name="web_search", options=dict(normalized_providers)
    ).as_tool()


def _normalize_config(
    providers: WebSearchProvider
    | WebSearchProviders
    | list[WebSearchProvider | WebSearchProviders]
    | None,
    **deprecated: Unpack[WebSearchDeprecatedArgs],
) -> _NormalizedProviders:
    """
    Deal with breaking changes in the web_search parameter list.

    This function adapts (hopefully) all of the old variants of how the tool
    factory may have been called converts to the new config format.
    """
    # Cases to handle:
    # 1. Both deprecated_provider and providers are set
    #     ValueError
    # 2. Neither is set and google env vars are defined
    #     act as if they passed provider="google"
    # 3. Only providers is set
    #     if any of the other deprecated parameters is set, then ValueError
    #     else Happy path
    # 4. Only deprecated_provider is set
    #     convert to new config format - including processing old other params

    # can't use both provider and providers
    deprecated_provider = deprecated.get("provider", None)
    if deprecated_provider and providers:
        raise ValueError("`provider` is deprecated. Please only specify `providers`.")

    # no providers but google env vars are set
    if (
        providers is None
        and deprecated_provider is None
        and maybe_get_google_api_keys() is not None
    ):
        deprecated_provider = "google"

    num_results = deprecated.get("num_results", None)
    max_provider_calls = deprecated.get("max_provider_calls", None)
    max_connections = deprecated.get("max_connections", None)
    model = deprecated.get("model", None)

    # Getting here means that we have either a providers or a deprecated_provider
    if deprecated_provider:
        return _get_config_via_back_compat(
            deprecated_provider,
            num_results=num_results,
            max_provider_calls=max_provider_calls,
            max_connections=max_connections,
            model=model,
        )

    # normalize providers to list
    providers = providers or []
    providers = providers if isinstance(providers, list) else [providers]

    # determine default -- if there is at least one external provider then
    # internal providers are disabled by default, otherwise they are enabled
    if _has_external_provider(providers):
        normalized: _NormalizedProviders = {}
    else:
        normalized = {
            "openai": {},
            "anthropic": {},
            "grok": {},
            "gemini": {},
            "mistral": {},
            "perplexity": {},
        }
    for entry in providers:
        if isinstance(entry, str):
            if entry not in valid_providers:
                raise ValueError(f"Invalid provider: '{entry}'")
            normalized[entry] = {}  # type: ignore
        else:
            for key, value in entry.items():
                if key not in valid_providers:
                    raise ValueError(f"Invalid provider: '{key}'")

                if not isinstance(value, dict | bool) and value is not None:
                    raise ValueError(
                        f"Invalid value for provider '{key}': {value}. Expected a dict, bool, or None"
                    )
                if value is False:
                    normalized.pop(key, None)  # type: ignore[misc]
                else:
                    normalized[key] = value if isinstance(value, dict) else {}  # type: ignore
    return normalized


EXTERNAL_PROVIDERS = ["tavily", "google", "exa"]


def _has_external_provider(
    providers: list[WebSearchProvider | WebSearchProviders],
) -> bool:
    for provider in providers:
        if isinstance(provider, str):
            if provider in EXTERNAL_PROVIDERS:
                return True
        elif isinstance(provider, dict):
            for key in provider.keys():
                if key in EXTERNAL_PROVIDERS and provider[key] is not False:  # type: ignore[literal-required]
                    return True

    return False


def _get_config_via_back_compat(
    provider: Literal["tavily", "google", "exa"],
    num_results: int | None,
    max_provider_calls: int | None,
    max_connections: int | None,
    model: str | None,
) -> _NormalizedProviders:
    if (
        num_results is None
        and max_provider_calls is None
        and max_connections is None
        and model is None
    ):
        if provider == "google":
            return {"google": {}}
        elif provider == "exa":
            return {"exa": {}}
        else:
            return {"tavily": {}}

    # If we get here, we have at least one old school parameter
    deprecation_warning(
        "The `num_results`, `max_provider_calls`, `max_connections`, and `model` parameters are deprecated. Please use the `config` parameter instead."
    )

    if provider == "google":
        return {
            "google": GoogleOptions(
                num_results=num_results,
                max_provider_calls=max_provider_calls,
                max_connections=max_connections,
                model=model,
            ).model_dump(exclude_none=True)
        }
    elif provider == "exa":
        return {
            "exa": ExaOptions(max_connections=max_connections).model_dump(
                exclude_none=True
            )
        }
    else:
        return {
            "tavily": TavilyOptions(
                max_results=num_results, max_connections=max_connections
            ).model_dump(exclude_none=True)
        }


def _create_external_provider(
    providers: _NormalizedProviders,
) -> SearchProvider:
    if "tavily" in providers:
        return tavily_search_provider(providers.get("tavily"))

    if "exa" in providers:
        return exa_search_provider(providers.get("exa"))

    if "google" in providers:
        return google_search_provider(providers.get("google"))

    raise ValueError("No valid provider found.")
```

## `tool/_tools/_web_search/_web_search_provider.py`

```python
from typing import Awaitable, Callable, TypeAlias

from inspect_ai._util.content import ContentText

SearchProvider: TypeAlias = Callable[
    [str], Awaitable[str | ContentText | list[ContentText] | None]
]
```

## `tool/beta.py`

```python
from inspect_ai._util.deprecation import relocated_module_attribute

relocated_module_attribute("computer", "inspect_ai.tool.computer", "0.3.62", "0.4")
```

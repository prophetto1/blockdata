# Python Bundle: `_util`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `68`

## Files

- `_util/__init__.py`
- `_util/_async.py`
- `_util/_json_rpc.py`
- `_util/ansi.py`
- `_util/answer.py`
- `_util/appdirs.py`
- `_util/async_bytes_reader.py`
- `_util/async_zip.py`
- `_util/asyncfiles.py`
- `_util/azure.py`
- `_util/background.py`
- `_util/citation.py`
- `_util/compression.py`
- `_util/compression_transcoding.py`
- `_util/config.py`
- `_util/constants.py`
- `_util/content.py`
- `_util/dateutil.py`
- `_util/decorator.py`
- `_util/deprecation.py`
- `_util/dev.py`
- `_util/dict.py`
- `_util/dotenv.py`
- `_util/entrypoints.py`
- `_util/environ.py`
- `_util/error.py`
- `_util/exception.py`
- `_util/file.py`
- `_util/format.py`
- `_util/future.py`
- `_util/git.py`
- `_util/hash.py`
- `_util/html.py`
- `_util/http.py`
- `_util/httpx.py`
- `_util/images.py`
- `_util/json.py`
- `_util/kvstore.py`
- `_util/list.py`
- `_util/local_server.py`
- `_util/logger.py`
- `_util/metadata.py`
- `_util/module.py`
- `_util/notebook.py`
- `_util/notgiven.py`
- `_util/package.py`
- `_util/path.py`
- `_util/pattern.py`
- `_util/platform.py`
- `_util/port_names.py`
- `_util/registry.py`
- `_util/retry.py`
- `_util/rich.py`
- `_util/samples.py`
- `_util/task.py`
- `_util/terminal.py`
- `_util/text.py`
- `_util/thread.py`
- `_util/throttle.py`
- `_util/timer.py`
- `_util/trace.py`
- `_util/transcript.py`
- `_util/url.py`
- `_util/version.py`
- `_util/vscode.py`
- `_util/working.py`
- `_util/zip_common.py`
- `_util/zipfile.py`

## `_util/__init__.py`

```python

```

## `_util/_async.py`

```python
import asyncio
import inspect
import os
import sys
from logging import Logger
from typing import Any, Awaitable, Callable, Coroutine, Iterable, Literal, TypeVar, cast

import anyio
import nest_asyncio2 as nest_asyncio  # type: ignore
import sniffio

if sys.version_info >= (3, 11):
    from typing import TypeVarTuple, Unpack
else:
    from exceptiongroup import ExceptionGroup
    from typing_extensions import TypeVarTuple, Unpack


PosArgsT = TypeVarTuple("PosArgsT")


def is_callable_coroutine(func_or_cls: Any) -> bool:
    if inspect.iscoroutinefunction(func_or_cls):
        return True
    elif inspect.isasyncgenfunction(func_or_cls):
        return True
    elif callable(func_or_cls):
        return inspect.iscoroutinefunction(
            func_or_cls.__call__
        ) or inspect.isasyncgenfunction(func_or_cls.__call__)
    return False


T = TypeVar("T")


async def tg_collect(
    funcs: Iterable[Callable[[], Awaitable[T]]], exception_group: bool = False
) -> list[T]:
    """Runs all of the passed async functions and collects their results.

    The results will be returned in the same order as the input `funcs`.

    Args:
       funcs: Iterable of async functions.
       exception_group: `True` to raise an ExceptionGroup or
          `False` (the default) to raise only the first exception.

    Returns:
       List of results of type T.

    Raises:
       Exception: First exception occurring in failed tasks
          (for `exception_group == False`, the default)
       ExceptionGroup: Exceptions that occurred in failed tasks
         (for `exception_group == True`)
    """
    try:
        results: list[tuple[int, T]] = []

        async with anyio.create_task_group() as tg:

            async def run_task(func: Callable[[], Awaitable[T]], index: int) -> None:
                result = await func()
                results.append((index, result))

            for index, func in enumerate(funcs):
                tg.start_soon(run_task, func, index)

        # sort results by original index and return just the values
        return [r for _, r in sorted(results)]
    except ExceptionGroup as ex:
        if exception_group:
            raise
        else:
            raise ex.exceptions[0] from None


async def coro_print_exceptions(
    context: str,
    func: Callable[[Unpack[PosArgsT]], Awaitable[Any]],
    *args: Unpack[PosArgsT],
) -> None:
    try:
        await func(*args)
    except Exception as ex:
        print(f"Error {context}: {ex}")


async def coro_log_exceptions(
    logger: Logger,
    context: str,
    func: Callable[[Unpack[PosArgsT]], Awaitable[Any]],
    *args: Unpack[PosArgsT],
) -> None:
    try:
        await func(*args)
    except Exception as ex:
        logger.warning(f"Error {context}: {ex}")


_initialised_nest_asyncio: bool = False


def init_nest_asyncio() -> None:
    global _initialised_nest_asyncio
    if not _initialised_nest_asyncio:
        nest_asyncio.apply()
        _initialised_nest_asyncio = True


def run_coroutine(coroutine: Coroutine[None, None, T]) -> T:
    from inspect_ai._util.asyncfiles import AsyncFilesystem
    from inspect_ai._util.platform import running_in_notebook

    if current_async_backend() == "trio":
        raise RuntimeError("run_coroutine cannot be used with trio")

    async def _run_with_async_filesystem() -> T:
        async with AsyncFilesystem():
            return await coroutine

    if running_in_notebook():
        init_nest_asyncio()
        result = asyncio.run(_run_with_async_filesystem())
        return result
    else:
        try:
            # this will throw if there is no running loop
            asyncio.get_running_loop()

            # initialize nest_asyncio then we are clear to run
            init_nest_asyncio()

        except RuntimeError:
            # No running event loop so we are clear to run. Exit the exception handler
            # and run it.
            pass

        result = asyncio.run(_run_with_async_filesystem())
        return result


def current_async_backend() -> Literal["asyncio", "trio"] | None:
    try:
        return _validate_backend(sniffio.current_async_library().lower())
    except sniffio.AsyncLibraryNotFoundError:
        return None


def configured_async_backend() -> Literal["asyncio", "trio"]:
    backend = os.environ.get("INSPECT_ASYNC_BACKEND", "asyncio").lower() or "asyncio"
    return _validate_backend(backend)


def _validate_backend(backend: str) -> Literal["asyncio", "trio"]:
    if backend in ["asyncio", "trio"]:
        return cast(Literal["asyncio", "trio"], backend)
    else:
        raise RuntimeError(f"Unknown async backend: {backend}")
```

## `_util/_json_rpc.py`

```python
import json
from abc import ABC, abstractmethod
from itertools import count
from typing import Any, Literal, Protocol, Type, TypeAlias, TypeVar

from pydantic import BaseModel, RootModel


class JSONRPCResponseBase(BaseModel):
    jsonrpc: Literal["2.0"]
    id: int | float | str


class JSONRPCSuccessResponse(JSONRPCResponseBase):
    result: object


JSONRPCParamsType: TypeAlias = list[object] | dict[str, object] | None


class JSONRPCIncoming(BaseModel):
    jsonrpc: Literal["2.0"]
    method: str
    params: JSONRPCParamsType = None


class JSONRPCRequest(JSONRPCIncoming):
    id: int | float | str


class JSONRPCNotification(JSONRPCIncoming):
    pass


class JSONRPCError(BaseModel):
    """See: https://www.jsonrpc.org/specification#error_object"""

    code: int
    message: str
    data: object | None = None


class JSONRPCErrorResponse(JSONRPCResponseBase):
    error: JSONRPCError


class JSONRPCResponse(RootModel[JSONRPCSuccessResponse | JSONRPCErrorResponse]):
    pass


BaseModelT = TypeVar("BaseModelT", bound=BaseModel)
ScalarT = TypeVar("ScalarT", str, int, float, bool, None)


class JSONRPCTransport(Protocol):
    """Protocol for JSON-RPC transport implementations.

    Defines the interface for transport mechanisms that handle the actual
    communication with JSON-RPC servers. Different implementations may use
    different underlying protocols (HTTP, Unix sockets, docker exec, etc.)
    but all must conform to this interface.

    The transport is responsible for:
    - Serializing the JSON-RPC request
    - Sending it via the appropriate communication channel
    - Receiving the response
    - Returning the raw response string for parsing

    Args:
        method: The JSON-RPC method name to call
        params: Parameters to pass to the method (list, dict, or None)
        is_notification: Whether this is a notification (no response expected)
        **transport_extra_args: Implementation-specific transport options
                              (e.g., timeout, authentication, etc.)

    Returns:
        The raw JSON-RPC response string from the server
    """

    async def __call__(
        self,
        method: str,
        params: JSONRPCParamsType,
        is_notification: bool,
        **transport_extra_args: Any,
    ) -> str: ...


class JSONRPCErrorMapper(ABC):
    """Abstract base for mapping JSON-RPC error codes to appropriate exceptions.

    Implementors provide domain-specific exception types for three categories
    of JSON-RPC errors. For example, a tool-layer implementation might map
    invalid_params to ToolParsingError and internal_error to ToolError so that
    those errors are fed back to the model rather than crashing the eval.

    All methods are static — implementations are stateless so there is no need
    to instantiate the mapper. Pass the *class* rather than an instance.
    """

    @staticmethod
    @abstractmethod
    def server_error(
        code: int, message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        """Map a server-defined error code (-32000..-32099) to an exception."""
        ...

    @staticmethod
    @abstractmethod
    def invalid_params(
        message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        """Map a -32602 (Invalid params) error to an exception."""
        ...

    @staticmethod
    @abstractmethod
    def internal_error(
        message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        """Map a -32603 (Internal error) error to an exception."""
        ...


class GenericJSONRPCErrorMapper(JSONRPCErrorMapper):
    """Default error mapper that uses standard Python exception types."""

    @staticmethod
    def server_error(
        code: int, message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        del code, method, params
        return RuntimeError(message)

    @staticmethod
    def invalid_params(
        message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        del method, params
        return ValueError(message)

    @staticmethod
    def internal_error(
        message: str, method: str, params: JSONRPCParamsType
    ) -> Exception:
        del method, params
        return RuntimeError(message)


async def exec_scalar_request(
    method: str,
    params: JSONRPCParamsType,
    result_type: Type[ScalarT],
    transport: JSONRPCTransport,
    error_mapper: type[JSONRPCErrorMapper],
    **transport_extra_args: Any,
) -> ScalarT:
    """
    Execute a JSON-RPC command expecting a scalar result.

    Args:
      method (str): The JSON-RPC method to call.
      params (JSONRPCParamsType): The parameters for the JSON-RPC method.
      result_type (Type[ScalarT]): The scalar type (str, int, float, bool, None) to validate the result against.
      transport (JSONRPCTransport): The transport callable to use for the RPC communication.
      error_mapper (JSONRPCErrorMapper): Maps JSON-RPC error codes to appropriate exceptions.
      **transport_extra_args: Additional arguments passed to the transport (e.g. timeout, user).

    Returns:
      ScalarT: The scalar result of the JSON-RPC call.

    Raises:
      RuntimeError: If execution fails or if there is an error in the JSON-RPC response.
      ValueError: If the result is not of the expected scalar type.
    """
    rpc_result = await _exec_request(
        method=method,
        params=params,
        transport=transport,
        error_mapper=error_mapper,
        **transport_extra_args,
    )
    if (result_type is type(None) and rpc_result is not None) or not isinstance(
        rpc_result, result_type
    ):
        raise ValueError(f"Expected {result_type} result, got {type(rpc_result)}")
    return rpc_result


async def exec_model_request(
    method: str,
    params: JSONRPCParamsType,
    result_type: Type[BaseModelT],
    transport: JSONRPCTransport,
    error_mapper: type[JSONRPCErrorMapper],
    **transport_extra_args: Any,
) -> BaseModelT:
    """
    Execute a JSON-RPC command to a sandbox environment expecting a model result.

    Args:
      method (str): The JSON-RPC method to call.
      params (JSONRPCParamsType): The parameters for the JSON-RPC method.
      result_type (Type[BaseModelT]): The Pydantic model class to validate and parse the result.
      transport (JSONRPCTransport): The transport callable to use for the RPC communication.
      error_mapper (JSONRPCErrorMapper): Maps JSON-RPC error codes to appropriate exceptions.
      **transport_extra_args: Additional arguments passed to the transport (e.g. timeout, user).

    Returns:
      BaseModelT: The parsed and validated result of the JSON-RPC call.

    Raises:
      RuntimeError: If the sandbox execution fails or if there is an error in the JSON-RPC response.
      ValueError: If the result cannot be validated against the provided model class.
    """
    rpc_result = await _exec_request(
        method=method,
        params=params,
        transport=transport,
        error_mapper=error_mapper,
        **transport_extra_args,
    )
    return result_type.model_validate(rpc_result, strict=True)


async def exec_notification(
    method: str,
    params: JSONRPCParamsType,
    transport: JSONRPCTransport,
    **transport_extra_args: Any,
) -> None:
    """
    Execute a JSON-RPC notification to a sandbox environment.

    A notification is a JSON-RPC request that doesn't expect any response.

    Args:
      method (str): The JSON-RPC method to call.
      params (JSONRPCParamsType): The parameters for the JSON-RPC method.
      transport (JSONRPCTransport): The transport callable to use for the RPC communication.
      **transport_extra_args: Additional arguments passed to the transport (e.g. timeout, user).

    Returns:
      None: The function always returns None if successful.

    Raises:
      RuntimeError: If the sandbox execution fails or if there is an unexpected response to the notification.
    """
    stdout = await transport(
        method=method,
        params=params,
        is_notification=True,
        **transport_extra_args,
    )
    if stdout.strip():
        raise RuntimeError(
            f"Unexpected response to a Notification: {rpc_call_description(method, params)}: {stdout}"
        )


async def _exec_request(
    *,
    method: str,
    params: JSONRPCParamsType,
    transport: JSONRPCTransport,
    error_mapper: type[JSONRPCErrorMapper],
    **transport_extra_args: Any,
) -> object:
    """Execute a request using the provided transport mechanism."""
    return parse_json_rpc_response(
        await transport(
            method=method,
            params=params,
            is_notification=False,
            **transport_extra_args,
        ),
        method,
        params,
        error_mapper,
    )


def parse_json_rpc_response(
    response_str: str,
    method: str,
    params: JSONRPCParamsType,
    error_mapper: type[JSONRPCErrorMapper],
) -> object:
    """Validates the JSON RPC response and returns the result or raises a proper Inspect error."""
    match JSONRPCResponse.model_validate_json(response_str).root:
        case JSONRPCSuccessResponse(result=rpc_result):
            return rpc_result
        case JSONRPCErrorResponse(error=JSONRPCError(code=code, message=message)):
            raise exception_for_rpc_response_error(
                code, message, method, params, error_mapper
            )
        case _:
            raise ValueError(
                f"Unexpected JSON RPC response to request {rpc_call_description(method, params)}: {response_str}"
            )


def exception_for_rpc_response_error(
    code: int,
    message: str,
    method: str,
    params: JSONRPCParamsType,
    error_mapper: type[JSONRPCErrorMapper],
) -> Exception:
    """Maps JSON-RPC error codes to exceptions via the provided error mapper."""
    # code    message           meaning
    # -32000
    #    |    Server error      Reserved for implementation-defined server-errors.
    # -32099
    # -32600  Invalid Request   The JSON sent is not a valid Request object.
    # -32601  Method not found  The method does not exist / is not available.
    # -32602  Invalid params    Invalid method parameter(s).
    # -32603  Internal error    Internal JSON-RPC error.
    # -32700  Parse error       Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.

    if -32099 <= code <= -32000:
        return error_mapper.server_error(code, message, method, params)
    elif code == -32602:
        return error_mapper.invalid_params(message, method, params)
    elif code == -32603:
        return error_mapper.internal_error(message, method, params)
    else:
        # -32600 (Invalid Request)
        #   If we sent a bogus request, it's 100% a code bug.
        # -32601 (Method not found)
        # -32700 (Parse error)
        #   shouldn't be seen in this flow since we're processing responses, and
        #   this is a request oriented error.
        #
        return RuntimeError(
            f"Error executing tool command{f'  {rpc_call_description(method, params)}' if method and params else ''}: {code=} {message}"
        )


def rpc_call_description(method: str, params: JSONRPCParamsType) -> str:
    """
    Generate a string description of an RPC call.

    Args:
        method (str): The name of the RPC method.
        params (JSONRPCParamsType): The parameters for the RPC method.

    Returns:
        str: A string description of the RPC call.

    Examples:
        >>> rpc_call_description("subtract", {"minuend": 42, "subtrahend": 23})
        'subtract(minuend: 42, subtrahend: 23)'

        >>> rpc_call_description("subtract", (42, 23))
        'subtract(42, 23)'
    """
    normalized_params = (
        ""
        if params is None
        else list(map(str, params))
        if isinstance(params, list)
        else [f"{k}: {v}" for k, v in params.items()]
    )
    return f"{method}({', '.join(normalized_params)})"


id_generator = count(666)


def create_json_rpc_request(
    method: str,
    params: JSONRPCParamsType,
    is_notification: bool,
) -> str:
    return json.dumps(
        remove_none_values(
            {
                "jsonrpc": "2.0",
                "method": method,
                **({"params": params} if params else {}),
                **({"id": next(id_generator)} if not is_notification else {}),
            }
        )
    )


def remove_none_values(obj: object) -> object:
    if isinstance(obj, dict):
        return {k: remove_none_values(v) for k, v in obj.items() if v is not None}
    elif isinstance(obj, list):
        return [remove_none_values(item) for item in obj if item is not None]
    return obj
```

## `_util/ansi.py`

```python
import os
from typing import Any

from rich.console import Console, RenderableType


def render_text(
    text: RenderableType | list[RenderableType], styles: bool = True, **options: Any
) -> str:
    """Render text from Rich renderables.

    Args:
      text (RenderableType | list[RenderableType]): Renderables.
      styles (bool): If True, ansi escape codes will be included. False for plain text.
        Defaults to True.
      **options (Any): Additonal keyword arguments to pass to `Console` constructor.

    Returns:
       str: Rendered text (with ansi codes if `styles=True`)
    """
    # resolve to text
    text = text if isinstance(text, list) else [text]

    # print to console attached to /dev/null
    with open(os.devnull, "w") as f:
        console = Console(file=f, record=True, force_terminal=True, **options)
        for t in text:
            console.print(t)

    # export (optionally w/ ansi styles)
    return console.export_text(styles=styles).strip()
```

## `_util/answer.py`

```python
def answer_character(index: int) -> str:
    r"""
    Helper to go from array index to char, for example:

        0 -> 'A', 1 -> 'B', etc
    """
    if index < 26:
        return chr(ord("A") + index)
    else:
        return str(index - 25)


def answer_index(char: str) -> int:
    r"""
    Helper to go from char to array index, for example:

        'A' -> 0, 'B' -> 1, etc
    """
    if char.isalpha() or char == "," or char == " ":
        return ord(char.upper()) - ord("A")
    elif char.isnumeric():
        return 25 + int(char)
    else:
        raise ValueError(
            f"Unexpected multiple choice answer: {char} (must be a letter or number)"
        )
```

## `_util/appdirs.py`

```python
from pathlib import Path

from platformdirs import user_cache_path, user_data_path

from inspect_ai._util.constants import PKG_NAME


def inspect_data_dir(subdir: str | None) -> Path:
    return package_data_dir(PKG_NAME, subdir)


def package_data_dir(package_name: str, subdir: str | None) -> Path:
    data_dir = user_data_path(package_name)
    if subdir:
        data_dir = data_dir / subdir
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def inspect_cache_dir(subdir: str | None) -> Path:
    cache_dir = user_cache_path(PKG_NAME)
    if subdir:
        cache_dir = cache_dir / subdir
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir
```

## `_util/async_bytes_reader.py`

```python
from collections.abc import AsyncIterable, AsyncIterator
from typing import IO, Protocol, TypeGuard, cast

import anyio
from typing_extensions import Self


class AsyncBytesReader(Protocol):
    """Protocol defining the minimal async file-like interface for ijson.

    ijson.parse_async() requires an async file-like object with a read() method that:
    - Can be awaited (is an async method)
    - Returns bytes (binary mode)
    - Accepts a size parameter for the number of bytes to read

    This protocol captures that minimal requirement without requiring the full BinaryIO
    interface that includes methods like seek(), tell(), close(), etc.

    Also supports async context manager protocol for usage ensuring proper resource
    cleanup.
    """

    async def read(self, size: int) -> bytes: ...
    async def aclose(self) -> None: ...
    async def __aenter__(self) -> Self: ...
    async def __aexit__(self, *args: object) -> None: ...


def _is_async_iterable(
    io_or_iter: IO[bytes] | AsyncIterable[bytes],
) -> TypeGuard[AsyncIterable[bytes]]:
    return hasattr(io_or_iter, "__aiter__")


def adapt_to_reader(io_or_iter: IO[bytes] | AsyncIterable[bytes]) -> AsyncBytesReader:
    """Adapt a byte source to an async file-like interface (e.g. for ijson).

    Use as async context manager to ensure cleanup of underlying async iterators.
    """
    return (
        _BytesIterableReader(io_or_iter)
        if _is_async_iterable(io_or_iter)
        else _BytesIOReader(cast(IO[bytes], io_or_iter))
    )


class _BytesIOReader(AsyncBytesReader):
    """Wrapper to make synchronous I/O operations async-compatible.

    This class is needed because zipfile.ZipFile and other standard library I/O
    operations are strictly synchronous. To achieve concurrency and avoid blocking
    the main thread, this wrapper uses anyio.to_thread to run blocking I/O operations
    in a thread pool while maintaining async/await compatibility.

    The internal lock ensures thread-safe access to the underlying synchronous I/O object.
    """

    def __init__(self, sync_io: IO[bytes]):
        self._sync_io = sync_io
        self._lock = anyio.Lock()

    async def read(self, size: int) -> bytes:
        async with self._lock:
            return await anyio.to_thread.run_sync(self._sync_io.read, size)

    async def aclose(self) -> None:
        pass  # caller owns the IO[bytes]

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()


class _BytesIterableReader(AsyncBytesReader):
    """AsyncBytesReader implementation that reads from an AsyncIterable[bytes]."""

    def __init__(self, async_iterable: AsyncIterable[bytes]):
        self._async_iter: AsyncIterator[bytes] = aiter(async_iterable)
        self._current_chunk: bytes = b""
        self._offset = 0

    async def read(self, size: int) -> bytes:
        if size < 0:
            raise ValueError("size must be non-negative")
        if size == 0:
            return b""

        chunks_to_return: list[bytes] = []
        total = 0

        while total < size:
            # Get more data from current chunk if available
            available = len(self._current_chunk) - self._offset
            if available > 0:
                bytes_to_take = min(size - total, available)
                chunks_to_return.append(
                    self._current_chunk[self._offset : self._offset + bytes_to_take]
                )
                self._offset += bytes_to_take
                total += bytes_to_take
            else:
                # Current chunk exhausted, fetch next
                try:
                    self._current_chunk = await anext(self._async_iter)
                    self._offset = 0
                except StopAsyncIteration:
                    break  # No more data

        return b"".join(chunks_to_return)

    async def aclose(self) -> None:
        if hasattr(self._async_iter, "aclose"):
            await self._async_iter.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()
```

## `_util/async_zip.py`

```python
"""Async ZIP file reader with streaming decompression support.

Supports reading individual members from large ZIP archives (including ZIP64)
stored locally or remotely (e.g., S3) using async range requests.
"""

import struct
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import anyio
from typing_extensions import Self

from inspect_ai._util.asyncfiles import AsyncFilesystem

from .compression import decompress_bytes
from .compression_transcoding import CompressedToUncompressedStream
from .zip_common import ZipCompressionMethod, ZipEntry

# Default chunk size for streaming compressed data (1MB)
DEFAULT_CHUNK_SIZE = 1024 * 1024


@dataclass
class CentralDirectoryLocation:
    """Location and raw data needed to parse the central directory."""

    offset: int
    size: int
    tail: bytes
    tail_start: int
    etag: str | None = None


@dataclass
class CentralDirectory:
    """Parsed central directory with entries and file metadata."""

    entries: list[ZipEntry]
    etag: str | None = None


async def _find_central_directory(
    filesystem: AsyncFilesystem, filename: str
) -> CentralDirectoryLocation:
    """Locate and parse the central directory metadata.

    Uses a suffix range request to avoid a separate HEAD for the file size.

    Returns:
        CentralDirectoryLocation with offset, size, tail data, and etag.

    Raises:
        ValueError: If EOCD signature not found or ZIP64 structure is corrupt
    """
    suffix = await filesystem.read_file_suffix(filename, 65536)
    tail = suffix.data
    tail_start = suffix.file_size - len(tail)

    # Search backward for EOCD signature
    eocd_sig = b"PK\x05\x06"
    idx = tail.rfind(eocd_sig)
    if idx == -1:
        raise ValueError("EOCD not found")

    # Parse 32-bit EOCD fields
    (
        disk_no,
        cd_start_disk,
        num_entries_disk,
        num_entries_total,
        cd_size_32,
        cd_offset_32,
        _comment_len,
    ) = struct.unpack_from("<HHHHIIH", tail, idx + 4)

    cd_offset = cd_offset_32
    cd_size = cd_size_32

    # Only look for ZIP64 structures when the standard EOCD has overflow
    # sentinel values. Searching unconditionally can match the PK\x06\x07
    # signature inside compressed entry data, causing false positives.
    needs_zip64 = (
        disk_no == 0xFFFF
        or cd_start_disk == 0xFFFF
        or num_entries_disk == 0xFFFF
        or num_entries_total == 0xFFFF
        or cd_size_32 == 0xFFFFFFFF
        or cd_offset_32 == 0xFFFFFFFF
    )

    if needs_zip64:
        # The ZIP64 EOCD Locator is exactly 20 bytes and per the spec
        # appears immediately before the standard EOCD record.
        loc_sig = b"PK\x06\x07"
        loc_idx = idx - 20
        if loc_idx >= 0 and tail[loc_idx : loc_idx + 4] == loc_sig:
            pass  # found at expected position
        else:
            # Fall back to searching (handles non-standard writers)
            loc_idx = tail.rfind(loc_sig, 0, idx)

        if loc_idx >= 0 and tail[loc_idx : loc_idx + 4] == loc_sig:
            # Parse ZIP64 EOCD locator to get EOCD64 offset
            fields = struct.unpack_from("<IQI", tail, loc_idx + 4)
            eocd64_offset = fields[1]

            # Sanity check: offset must be within the file
            file_size = tail_start + len(tail)
            if eocd64_offset >= file_size:
                raise ValueError("Corrupt ZIP64 structure")

            # Read ZIP64 EOCD (reuse tail if possible)
            if eocd64_offset >= tail_start:
                rel = eocd64_offset - tail_start
                eocd64_data = tail[rel : rel + 56]
            else:
                eocd64_data = await filesystem.read_file_bytes_fully(
                    filename, eocd64_offset, eocd64_offset + 56
                )

            # Verify ZIP64 EOCD signature
            eocd64_sig = b"PK\x06\x06"
            if not eocd64_data.startswith(eocd64_sig):
                raise ValueError("Corrupt ZIP64 structure")

            # Parse ZIP64 central directory size and offset
            cd_size, cd_offset = struct.unpack_from("<QQ", eocd64_data, 40)

    return CentralDirectoryLocation(cd_offset, cd_size, tail, tail_start, suffix.etag)


async def _parse_central_directory(
    filesystem: AsyncFilesystem, filename: str
) -> CentralDirectory:
    """Parse the central directory and return all entries.

    Returns:
        CentralDirectory with entries and etag.
    """
    cd_loc = await _find_central_directory(filesystem, filename)

    # Reuse the tail buffer if the central directory falls within it
    if cd_loc.offset >= cd_loc.tail_start:
        rel = cd_loc.offset - cd_loc.tail_start
        buf = cd_loc.tail[rel : rel + cd_loc.size]
    else:
        buf = await filesystem.read_file_bytes_fully(
            filename, cd_loc.offset, cd_loc.offset + cd_loc.size
        )

    entries = []
    pos = 0
    sig = b"PK\x01\x02"

    while pos < len(buf):
        if pos + 4 > len(buf) or not buf[pos : pos + 4] == sig:
            break

        # Parse central directory file header (46 bytes)
        (
            _ver_made,
            _ver_needed,
            _flags,
            method,
            _time,
            _date,
            _crc,
            compressed_size,
            uncompressed_size,
            name_len,
            extra_len,
            comment_len,
            _disk,
            _int_attr,
            _ext_attr,
            local_header_off,
        ) = struct.unpack_from("<HHHHHHIIIHHHHHII", buf, pos + 4)

        # Extract filename
        name_start = pos + 46
        name = buf[name_start : name_start + name_len].decode("utf-8")

        # Extract extra field
        extra_start = name_start + name_len
        extra = buf[extra_start : extra_start + extra_len]

        # Handle ZIP64 extra fields (0x0001)
        if (
            compressed_size == 0xFFFFFFFF
            or uncompressed_size == 0xFFFFFFFF
            or local_header_off == 0xFFFFFFFF
        ):
            i = 0
            while i + 4 <= len(extra):
                header_id, data_size = struct.unpack_from("<HH", extra, i)
                i += 4
                if header_id == 0x0001:  # ZIP64 extended information
                    # Parse available 64-bit fields in order
                    num_fields = data_size // 8
                    if num_fields > 0:
                        fields = struct.unpack_from(f"<{num_fields}Q", extra, i)
                        field_idx = 0
                        if uncompressed_size == 0xFFFFFFFF and field_idx < len(fields):
                            uncompressed_size = fields[field_idx]
                            field_idx += 1
                        if compressed_size == 0xFFFFFFFF and field_idx < len(fields):
                            compressed_size = fields[field_idx]
                            field_idx += 1
                        if local_header_off == 0xFFFFFFFF and field_idx < len(fields):
                            local_header_off = fields[field_idx]
                    break
                i += data_size

        entries.append(
            ZipEntry(
                name,
                method,
                compressed_size,
                uncompressed_size,
                local_header_off,
            )
        )
        pos += 46 + name_len + extra_len + comment_len

    return CentralDirectory(entries, cd_loc.etag)


class _ZipMemberBytes:
    """AsyncIterable + AsyncContextManager for zip member data.

    Each iteration creates a fresh decompression stream, enabling re-reads:

        async with await zip_reader.open_member("file.json") as member:
            async for chunk in member:  # first read
                process(chunk)

            async for chunk in member:  # second read (e.g., retry on error)
                process_differently(chunk)
    """

    def __init__(
        self,
        filesystem: AsyncFilesystem,
        filename: str,
        range_and_method: tuple[int, int, ZipCompressionMethod],
        *,
        raw: bool = False,
    ):
        self._filesystem = filesystem
        self._filename = filename
        self._offset, self._end, self._method = range_and_method
        self._raw = raw
        self._active_streams: set[CompressedToUncompressedStream] = set()

    async def __aiter__(self) -> AsyncIterator[bytes]:
        byte_stream = await self._filesystem.read_file_bytes(
            self._filename, self._offset, self._end
        )

        if self._raw or self._method == ZipCompressionMethod.STORED:
            # Pass through raw bytes directly - no decompression needed
            try:
                async for chunk in byte_stream:
                    yield chunk
            finally:
                await byte_stream.aclose()
        else:
            # Decompress using the appropriate method
            stream = CompressedToUncompressedStream(byte_stream, self._method)
            self._active_streams.add(stream)
            try:
                async for chunk in stream:
                    yield chunk
            finally:
                self._active_streams.discard(stream)
                await stream.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *_args: Any) -> None:
        for stream in list(self._active_streams):
            await stream.aclose()
        self._active_streams.clear()


class AsyncZipReader:
    """Async ZIP reader that supports streaming decompression of individual members.

    This reader minimizes data transfer by using range requests to read only
    the necessary portions of the ZIP file (central directory + requested member).
    Supports ZIP64 archives and streams decompressed data incrementally.

    For example:

        async with AsyncFilesystem() as fs:
            reader = AsyncZipReader(fs, "s3://bucket/large-archive.zip")
            async with await reader.open_member("trajectory_001.json") as iterable:
                async for chunk in iterable:
                    process(chunk)
    """

    def __init__(
        self,
        filesystem: AsyncFilesystem,
        filename: str,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
    ):
        """Initialize the async ZIP reader.

        Args:
            filesystem: AsyncFilesystem instance for reading files
            filename: Path or URL to ZIP file (local path or s3:// URL)
            chunk_size: Size of chunks for streaming compressed data

        Raises:
            ValueError: If filename is empty or None
        """
        if not filename:
            raise ValueError("filename must not be empty")
        self._filesystem = filesystem
        self._filename = filename
        self._chunk_size = chunk_size
        self._central_directory: CentralDirectory | None = None
        self._lock = anyio.Lock()

    @property
    def etag(self) -> str | None:
        """ETag from the S3 response used to read the central directory."""
        cd = self._central_directory
        return cd.etag if cd is not None else None

    async def entries(self) -> CentralDirectory:
        """Load and cache the central directory."""
        if self._central_directory is None:
            async with self._lock:
                if self._central_directory is None:
                    self._central_directory = await _parse_central_directory(
                        self._filesystem, self._filename
                    )
        return self._central_directory

    async def get_member_entry(self, member_name: str) -> ZipEntry:
        cd = await self.entries()
        entry = next((e for e in cd.entries if e.filename == member_name), None)
        if entry is None:
            raise KeyError(member_name)
        return entry

    async def open_member_raw(self, member: str | ZipEntry) -> _ZipMemberBytes:
        """Open a ZIP member for streaming its raw (likely compressed) bytes.

        Unlike open_member(), this does NOT decompress the data. Use this when
        you want to pass through the raw bytes (e.g., for HTTP streaming with
        Content-Encoding: deflate).

        Returns a "cold" iterable - the stream is not opened until iteration.

        Args:
            member: Name or ZipEntry of the member file within the archive

        Returns:
            _ZipMemberBytes that yields raw bytes (may be compressed)
        """
        return _ZipMemberBytes(
            self._filesystem,
            self._filename,
            await self._get_member_range_and_method(member),
            raw=True,
        )

    async def open_member(self, member: str | ZipEntry) -> _ZipMemberBytes:
        """Open a ZIP member and stream its decompressed contents.

        Must be used as an async context manager to ensure proper cleanup.
        Can be re-iterated within the same context manager scope.

        Args:
            member: Name or ZipEntry of the member file within the archive

        Returns:
            AsyncIterable of decompressed data chunks

        Raises:
            KeyError: If member_name not found in archive
            NotImplementedError: If compression method is not supported

        Example:
            async with await zip_reader.open_member("file.json") as stream:
                async for chunk in stream:
                    process(chunk)
        """
        return _ZipMemberBytes(
            self._filesystem,
            self._filename,
            await self._get_member_range_and_method(member),
        )

    async def read_member_fully(self, member: str | ZipEntry) -> bytes:
        """Read a member's decompressed content fully into memory.

        Reads the local file header and compressed data in a single request,
        then decompresses. More efficient than ``open_member`` for small members
        because it avoids a separate request for the local file header.

        Args:
            member: Name or ZipEntry of the member file within the archive

        Returns:
            Decompressed member content as bytes
        """
        entry = (
            member
            if isinstance(member, ZipEntry)
            else await self.get_member_entry(member)
        )

        # Estimate variable header size from central directory filename
        # plus generous padding for the extra field
        name_len_estimate = len(entry.filename.encode("utf-8"))
        variable_header_padding = name_len_estimate + 256

        # Read local header + compressed data in one request
        read_start = entry.local_header_offset
        read_end = read_start + 30 + variable_header_padding + entry.compressed_size
        buf = await self._filesystem.read_file_bytes_fully(
            self._filename, read_start, read_end
        )

        # Parse local header to find exact data offset
        _, _, _, _, _, _, _, _, _, name_len, extra_len = struct.unpack_from(
            "<4sHHHHHIIIHH", buf
        )
        data_start = 30 + name_len + extra_len

        if data_start + entry.compressed_size <= len(buf):
            compressed_data = buf[data_start : data_start + entry.compressed_size]
        else:
            # Variable header was larger than estimated; fall back to separate read
            abs_data_start = read_start + data_start
            compressed_data = await self._filesystem.read_file_bytes_fully(
                self._filename,
                abs_data_start,
                abs_data_start + entry.compressed_size,
            )

        return decompress_bytes(compressed_data, entry.compression_method)

    async def _get_member_range_and_method(
        self, member: str | ZipEntry
    ) -> tuple[int, int, ZipCompressionMethod]:
        entry = (
            member
            if isinstance(member, ZipEntry)
            else await self.get_member_entry(member)
        )

        # Read local file header to determine actual data offset
        local_header = await self._filesystem.read_file_bytes_fully(
            self._filename,
            entry.local_header_offset,
            entry.local_header_offset + 30,
        )
        _, _, _, _, _, _, _, _, _, name_len, extra_len = struct.unpack_from(
            "<4sHHHHHIIIHH", local_header
        )

        data_offset = entry.local_header_offset + 30 + name_len + extra_len
        data_end = data_offset + entry.compressed_size
        return (data_offset, data_end, entry.compression_method)
```

## `_util/asyncfiles.py`

```python
import io
import shutil
from contextlib import AbstractAsyncContextManager
from contextvars import ContextVar
from dataclasses import dataclass
from types import TracebackType
from typing import Any, BinaryIO, Callable, Coroutine, TypeVar, cast
from urllib.parse import urlparse

import anyio
import anyio.to_thread
import boto3
from aiobotocore.config import AioConfig
from aiobotocore.response import StreamingBody
from anyio import AsyncFile, EndOfStream, open_file
from anyio.abc import ByteReceiveStream
from boto3.s3.transfer import TransferConfig
from botocore.config import Config
from typing_extensions import override

from inspect_ai._util._async import current_async_backend
from inspect_ai._util.file import FileInfo, file, filesystem


class _BytesByteReceiveStream(ByteReceiveStream):
    """
    Adapt bytes into an AnyIO ByteReceiveStream

    This adapter is needed when using sync S3 under Trio
    """

    def __init__(self, data: bytes, chunk_size: int = 1024 * 1024):
        """Initialize with bytes data and chunk size (default 1MB)."""
        self._data = data
        self._chunk_size = chunk_size
        self._position = 0

    async def receive(self, max_bytes: int = 65536) -> bytes:
        """Receive up to max_bytes from the stream."""
        if self._position >= len(self._data):
            raise EndOfStream

        # Use the smaller of max_bytes or remaining data
        end = min(self._position + max_bytes, len(self._data))
        chunk = self._data[self._position : end]
        self._position = end
        return chunk

    async def aclose(self) -> None:
        """Close the stream."""
        pass


class _StreamingBodyByteReceiveStream(ByteReceiveStream):
    """
    Adapt AioBoto's StreamingBody into an AnyIO ByteReceiveStream

    This adapter is needed when using async S3 under asyncio
    """

    def __init__(self, body: StreamingBody):
        """Initialize with S3 response body stream."""
        self._body = body

    async def receive(self, max_bytes: int = 65536) -> bytes:
        """Receive up to max_bytes from the S3 body stream."""
        # TODO: It's kind of lame that we're forced to provide an arbitrary max_bytes
        # It would be preferable if we could just read whatever is naturally in
        # the http response buffer
        chunk = await self._body.read(max_bytes)
        if not chunk:
            raise EndOfStream
        return chunk

    async def aclose(self) -> None:
        """Close the underlying S3 body stream."""
        self._body.close()


class _AnyIOFileByteReceiveStream(ByteReceiveStream):
    """
    Adapt a file's contents into an AnyIO ByteReceiveStream

    This adapter is needed when reading files.

    NOTE: This class does not support concurrent calls to receive.
    """

    def __init__(self, filename: str, start: int, end: int):
        """Initialize with file path and byte range."""
        self._filename = filename
        self._start = start
        self._end = end
        self._position = start
        self._file: AsyncFile[bytes] | None = None

    async def receive(self, max_bytes: int = 65536) -> bytes:
        """Receive up to max_bytes from the file."""
        if self._file is None:
            self._file = await open_file(self._filename, "rb")
            await self._file.seek(self._start)

        if self._position >= self._end or not (
            chunk := await self._file.read(min(max_bytes, self._end - self._position))
        ):
            raise EndOfStream

        self._position += len(chunk)

        return chunk

    async def aclose(self) -> None:
        """Close the file if it was opened."""
        if self._file is not None:
            await self._file.aclose()
            self._file = None


@dataclass
class SuffixResult:
    """Result of reading the suffix of a file."""

    data: bytes
    file_size: int
    etag: str | None = None


class AsyncFilesystem(AbstractAsyncContextManager["AsyncFilesystem"]):
    """Interface for reading/writing files that uses different interfaces depending on context

    1. Use aioboto3 when accessing s3 under the asyncio backend
    2. Use boto3 with anyio.to_thread when using s3 under the trio backend
    3. Use fsspec when using any other filesystem

    When used as a context manager, the filesystem is registered in a ContextVar
    so that it is shared with all downstream code within the same async context.
    If a shared filesystem already exists, the context manager reuses it and does
    not close it on exit (the original owner handles cleanup).
    """

    def __init__(self, anonymous: bool = False, region_name: str | None = None) -> None:
        self._anonymous = anonymous
        self._region_name = region_name
        self._s3_client: Any | None = None
        self._s3_client_async: Any | None = None
        self._s3_lock = anyio.Lock()
        self._owns_context: bool = False

    async def get_size(self, filename: str) -> int:
        return (await self.info(filename)).size

    async def info(self, filename: str) -> FileInfo:
        if is_s3_filename(filename):
            bucket, key = s3_bucket_and_key(filename)
            if current_async_backend() == "asyncio":
                response = await (await self.s3_client_async()).head_object(
                    Bucket=bucket, Key=key
                )
                return _s3_head_to_file_info(filename, response)
            return await anyio.to_thread.run_sync(
                s3_info, self.s3_client(), bucket, key, filename
            )
        else:
            return filesystem(filename).info(filename)

    async def read_file(self, filename: str) -> bytes:
        if is_s3_filename(filename):
            bucket, key = s3_bucket_and_key(filename)
            if current_async_backend() == "asyncio":
                response = await (await self.s3_client_async()).get_object(
                    Bucket=bucket, Key=key
                )
                body = response["Body"]
                try:
                    return cast(bytes, await body.read())
                finally:
                    body.close()

            else:
                return await anyio.to_thread.run_sync(
                    s3_read_file, self.s3_client(), bucket, key
                )
        else:
            with file(filename, "rb") as f:
                return f.read()

    async def read_file_bytes(
        self, filename: str, start: int, end: int
    ) -> ByteReceiveStream:
        if is_s3_filename(filename):
            bucket, key = s3_bucket_and_key(filename)
            if current_async_backend() == "asyncio":
                response = await (await self.s3_client_async()).get_object(
                    Bucket=bucket, Key=key, Range=f"bytes={start}-{end - 1}"
                )
                return _StreamingBodyByteReceiveStream(response["Body"])
            return _BytesByteReceiveStream(
                await anyio.to_thread.run_sync(
                    s3_read_file_bytes, self.s3_client(), bucket, key, start, end
                )
            )
        else:
            fs = filesystem(filename)
            if fs.is_local():
                # If local, use AnyIO's async/chunking file reading support
                return _AnyIOFileByteReceiveStream(_local_path(filename), start, end)
            with file(filename, "rb") as f:
                f.seek(start)
                return _BytesByteReceiveStream(f.read(end - start))

    async def read_file_bytes_fully(self, filename: str, start: int, end: int) -> bytes:
        """Read a byte range from a file and consume the stream fully into bytes."""
        stream = await self.read_file_bytes(filename, start, end)
        chunks = []
        async for chunk in stream:
            chunks.append(chunk)
        return b"".join(chunks)

    async def read_file_suffix(self, filename: str, suffix_length: int) -> SuffixResult:
        """Read the last suffix_length bytes of a file.

        Uses a suffix range request (``bytes=-N``) to avoid a separate
        HEAD request for the file size.

        Returns:
            SuffixResult with data, file_size, and etag (S3 only).
        """
        if is_s3_filename(filename):
            bucket, key = s3_bucket_and_key(filename)
            if current_async_backend() == "asyncio":
                response = await (await self.s3_client_async()).get_object(
                    Bucket=bucket, Key=key, Range=f"bytes=-{suffix_length}"
                )
                content_range: str = response["ContentRange"]
                total_size = int(content_range.split("/")[-1])
                etag_raw = response.get("ETag")
                etag = cast(str, etag_raw).strip('"') if etag_raw else None
                body = response["Body"]
                try:
                    data = cast(bytes, await body.read())
                finally:
                    body.close()
                return SuffixResult(data, total_size, etag)
            else:
                return await anyio.to_thread.run_sync(
                    s3_read_file_suffix,
                    self.s3_client(),
                    bucket,
                    key,
                    suffix_length,
                )
        else:
            file_size = filesystem(filename).info(filename).size
            start = max(0, file_size - suffix_length)
            data = await self.read_file_bytes_fully(filename, start, file_size)
            return SuffixResult(data, file_size)

    async def write_file(self, filename: str, content: bytes) -> None:
        if is_s3_filename(filename):
            bucket, key = s3_bucket_and_key(filename)
            if current_async_backend() == "asyncio":
                client = await self.s3_client_async()
                await client.upload_fileobj(
                    Fileobj=io.BytesIO(content), Bucket=bucket, Key=key
                )
            else:
                await anyio.to_thread.run_sync(
                    s3_write_file, self.s3_client(), bucket, key, content
                )
        else:
            with file(filename, "wb") as f:
                f.write(content)

    async def write_file_streaming(self, filename: str, source: BinaryIO) -> None:
        """Write a file from a binary stream without reading it all into memory.

        Uses the appropriate backend for streaming writes:
        - S3: native upload_fileobj with TransferConfig for multipart chunking
        - Local/other: chunked copy via fsspec with explicit block_size

        Args:
            filename: Destination file path or URL.
            source: A readable binary file-like object.
        """
        if is_s3_filename(filename):
            bucket, key = s3_bucket_and_key(filename)
            if current_async_backend() == "asyncio":
                client = await self.s3_client_async()
                await client.upload_fileobj(
                    Fileobj=source,
                    Bucket=bucket,
                    Key=key,
                    Config=_S3_TRANSFER_CONFIG,
                )
            else:
                await anyio.to_thread.run_sync(
                    s3_write_file_streaming,
                    self.s3_client(),
                    bucket,
                    key,
                    source,
                )
        else:
            with file(
                filename, "wb", fs_options={"block_size": _FSSPEC_WRITE_BLOCK_SIZE}
            ) as f:
                shutil.copyfileobj(source, f, length=_STREAMING_COPY_BUFSIZE)

    @override
    async def __aenter__(self) -> "AsyncFilesystem":
        existing = _current_async_fs.get()
        if existing is not None:
            self._owns_context = False
            return existing
        self._owns_context = True
        _current_async_fs.set(self)
        return self

    @override
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        if self._owns_context:
            _current_async_fs.set(None)
            await self.close()

    async def close(
        self,
    ) -> None:
        if self._s3_client_async is not None:
            client = self._s3_client_async
            self._s3_client_async = None
            await client.__aexit__(None, None, None)

    def s3_client(self) -> Any:
        if self._s3_client is None:
            from botocore import UNSIGNED

            config = Config(
                max_pool_connections=50,
                retries={"max_attempts": 10, "mode": "adaptive"},
                **({"signature_version": UNSIGNED} if self._anonymous else {}),
            )
            self._s3_client = boto3.client(
                "s3", config=config, region_name=self._region_name
            )

        return self._s3_client

    async def s3_client_async(self) -> Any:
        if self._s3_client_async is None:
            async with self._s3_lock:
                if self._s3_client_async is None:
                    self._s3_client_async = await self._create_s3_client_async(
                        anonymous=self._anonymous,
                        region_name=self._region_name,
                    )
        return self._s3_client_async

    @staticmethod
    async def _create_s3_client_async(
        anonymous: bool = False, region_name: str | None = None
    ) -> Any:
        import aioboto3
        from botocore import UNSIGNED

        session = aioboto3.Session()
        config = AioConfig(
            max_pool_connections=50,
            retries={"max_attempts": 10, "mode": "adaptive"},
            **({"signature_version": UNSIGNED} if anonymous else {}),
        )
        return await session.client(
            "s3", config=config, region_name=region_name
        ).__aenter__()


def _s3_head_to_file_info(filename: str, response: dict[str, Any]) -> FileInfo:
    size = cast(int, response["ContentLength"])
    last_modified = response.get("LastModified")
    mtime = last_modified.timestamp() * 1000 if last_modified else None
    etag_raw = response.get("ETag")
    etag = cast(str, etag_raw).strip('"') if etag_raw else None
    return FileInfo(name=filename, type="file", size=size, mtime=mtime, etag=etag)


def s3_info(s3: Any, bucket: str, key: str, filename: str) -> FileInfo:
    response = s3.head_object(Bucket=bucket, Key=key)
    return _s3_head_to_file_info(filename, response)


def s3_read_file(s3: Any, bucket: str, key: str) -> bytes:
    response = s3.get_object(Bucket=bucket, Key=key)
    return cast(bytes, response["Body"].read())


def s3_read_file_bytes(s3: Any, bucket: str, key: str, start: int, end: int) -> bytes:
    range_header = f"bytes={start}-{end - 1}"
    response = s3.get_object(Bucket=bucket, Key=key, Range=range_header)
    return cast(bytes, response["Body"].read())


def s3_read_file_suffix(
    s3: Any, bucket: str, key: str, suffix_length: int
) -> SuffixResult:
    response = s3.get_object(Bucket=bucket, Key=key, Range=f"bytes=-{suffix_length}")
    content_range: str = response["ContentRange"]
    total_size = int(content_range.split("/")[-1])
    etag_raw = response.get("ETag")
    etag = cast(str, etag_raw).strip('"') if etag_raw else None
    data = cast(bytes, response["Body"].read())
    return SuffixResult(data, total_size, etag)


def s3_write_file(s3: Any, bucket: str, key: str, content: bytes) -> None:
    s3.upload_fileobj(Fileobj=io.BytesIO(content), Bucket=bucket, Key=key)


def s3_write_file_streaming(s3: Any, bucket: str, key: str, source: BinaryIO) -> None:
    """Upload a file-like stream to S3 using multipart upload."""
    s3.upload_fileobj(
        Fileobj=source, Bucket=bucket, Key=key, Config=_S3_TRANSFER_CONFIG
    )


def s3_bucket_and_key(filename: str) -> tuple[str, str]:
    parsed = urlparse(filename)
    bucket = parsed.netloc
    key = parsed.path.lstrip("/")
    return bucket, key


def is_s3_filename(filename: str) -> bool:
    return filename.startswith("s3://")


def _local_path(filename: str) -> str:
    """Convert a file:// URL to a local path, or return as-is."""
    if filename.startswith("file://"):
        return urlparse(filename).path
    return filename


_current_async_fs: ContextVar[AsyncFilesystem | None] = ContextVar(
    "_current_async_fs", default=None
)


_T = TypeVar("_T")


def with_async_fs(
    main: Callable[[], Coroutine[Any, Any, _T]],
) -> Callable[[], Coroutine[Any, Any, _T]]:
    """Wrap an async callable so it runs with a shared AsyncFilesystem."""

    async def wrapper() -> _T:
        async with AsyncFilesystem():
            return await main()

    return wrapper


def get_async_filesystem() -> AsyncFilesystem:
    """Get the current shared AsyncFilesystem from the ContextVar.

    Raises:
        RuntimeError: If no AsyncFilesystem has been established via
            ``async with AsyncFilesystem()``.
    """
    fs = _current_async_fs.get()
    if fs is None:
        raise RuntimeError(
            "No AsyncFilesystem is available. "
            "Use 'async with AsyncFilesystem()' to establish one."
        )
    return fs


# boto3 S3 multipart upload configuration for streaming writes.
# Values are the boto3.s3.transfer.TransferConfig library defaults
# as of 2026-03-07.
# - multipart_threshold: use multipart upload for files larger than this
# - multipart_chunksize: size of each part in a multipart upload
# - max_concurrency: maximum threads for concurrent part uploads
_S3_TRANSFER_CONFIG = TransferConfig(
    multipart_threshold=8 * 1024 * 1024,  # 8 MB
    multipart_chunksize=8 * 1024 * 1024,  # 8 MB
    max_concurrency=10,
)

# fsspec write buffer size for cloud storage backends (GCS, Azure, etc.).
# 4MB is the fsspec AbstractFileSystem.blocksize library default
# as of 2026-03-07. We set to 8 MB to match boto3 values above.
# When the in-memory write buffer reaches this size, it is flushed as
# a multipart upload part. Individual backends may override this class
# attribute with a different default.
_FSSPEC_WRITE_BLOCK_SIZE = 8 * 1024 * 1024  # 8 MB

# Size of chunks read from the source stream per iteration when
# copying to local or fsspec-backed files via shutil.copyfileobj.
_STREAMING_COPY_BUFSIZE = 16 * 1024 * 1024  # 16 MB
```

## `_util/azure.py`

```python
import os
from typing import Any, Callable, TypeVar
from urllib.parse import urlparse

AZURE_SCHEMES = {"az", "abfs", "abfss"}


def apply_azure_fs_options(options: dict[str, Any]) -> None:
    """Inject Azure credentials for fsspec filesystem options on demand."""
    account_name = os.getenv("AZURE_STORAGE_ACCOUNT_NAME") or os.getenv(
        "AZURE_ACCOUNT_NAME"
    )
    if account_name:
        options.setdefault("account_name", account_name)

    # Auth resolution order (secure-first):
    # 1. Managed identity / DefaultAzureCredential (implicit if no explicit secret vars set)
    # 2. SAS token (scoped, time-bound)
    # 3. Account key (broad access)
    # 4. Connection string (legacy / broad)
    sas_token = os.getenv("AZURE_STORAGE_SAS_TOKEN") or os.getenv("AZURE_SAS_TOKEN")
    account_key = os.getenv("AZURE_STORAGE_ACCOUNT_KEY") or os.getenv(
        "AZURE_ACCOUNT_KEY"
    )
    connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")

    if sas_token:
        options.setdefault("credential", sas_token.lstrip("?"))
    elif account_key:
        options.setdefault("credential", account_key)
    elif connection_string:
        options.setdefault("connection_string", connection_string)

    # Disable caching explicitly (mirrors S3 behavior).
    options.setdefault("use_listings_cache", False)
    options.setdefault("skip_instance_cache", False)


def is_azure_auth_error(error: Exception) -> bool:
    msg = str(error).lower()
    return (
        "noauthenticationinformation" in msg
        or "authenticationfailed" in msg
        or "server failed to authenticate the request" in msg
    )


def is_azure_delete_permission_error(error: Exception) -> bool:
    msg = str(error).lower()
    return (
        "authorizationpermissionmismatch" in msg
        or "not authorized" in msg
        or "this request is not authorized" in msg
        or is_azure_auth_error(error)
    )


T = TypeVar("T")


def call_with_azure_auth_fallback(
    func: Callable[[], T],
    fallback_return_value: T,
) -> T:
    """Call func and swallow Azure auth errors, returning fallback instead."""
    try:
        return func()
    except Exception as ex:
        if is_azure_auth_error(ex):
            return fallback_return_value
        raise


def is_azure_path(path: str) -> bool:
    """Return True if the URI/path uses an Azure-backed scheme."""
    scheme = urlparse(path).scheme.lower()
    return scheme in AZURE_SCHEMES
```

## `_util/background.py`

```python
import asyncio
from contextvars import ContextVar
from typing import Awaitable, Callable

from anyio.abc import TaskGroup
from typing_extensions import Unpack

from ._async import PosArgsT, current_async_backend


def run_in_background(
    func: Callable[[Unpack[PosArgsT]], Awaitable[None]],
    *args: Unpack[PosArgsT],
) -> None:
    """
    Runs the given asynchronous function in the background using the most appropriate form of structured concurrency.

    Args:
      func (Callable[[Unpack[PosArgsT]], Awaitable[None]]): The asynchronous function to run in the background.
      *args (Unpack[PosArgsT]): Positional arguments to pass to the function.

    Note:
      The passed function must ensure that it does not raise any exceptions. Exceptions
      that do escape are considered coding errors, and the behavior is not strictly
      defined. For example, if within the context of an eval, the eval will fail.
    """
    if tg := background_task_group():
        tg.start_soon(func, *args)
    else:
        if (backend := current_async_backend()) == "asyncio":

            async def wrapper() -> None:
                try:
                    await func(*args)
                except Exception as ex:
                    raise RuntimeError("Exception escaped from background task") from ex

            asyncio.create_task(wrapper())
        else:
            raise RuntimeError(
                f"run_coroutine cannot be used {'with trio' if backend == 'trio' else 'outside of an async context'}"
            )


_background_task_group: ContextVar[TaskGroup | None] = ContextVar(
    "background_task_group", default=None
)


def set_background_task_group(tg: TaskGroup | None) -> None:
    _background_task_group.set(tg)


def background_task_group() -> TaskGroup | None:
    return _background_task_group.get()
```

## `_util/citation.py`

```python
from typing import Annotated, Literal, TypeAlias, Union

from pydantic import BaseModel, Discriminator, Field, JsonValue


class CitationBase(BaseModel):
    """Base class for citations."""

    cited_text: str | tuple[int, int] | None = Field(
        default=None,
        # without helping the schema generator, this will turn into [unknown, unknown] in TypeScript
        json_schema_extra={
            "anyOf": [
                {"type": "string"},
                {
                    "type": "array",
                    "items": {"type": "integer"},
                    "minItems": 2,
                    "maxItems": 2,
                },
                {"type": "null"},
            ]
        },
    )
    """
    The cited text

    This can be the text itself or a start/end range of the text content within
    the container that is the cited text.
    """

    title: str | None = None
    """Title of the cited resource."""

    internal: dict[str, JsonValue] | None = Field(default=None)
    """Model provider specific payload - typically used to aid transformation back to model types."""


class ContentCitation(CitationBase):
    """A generic content citation."""

    type: Literal["content"] = Field(default="content")
    """Type."""


class DocumentRange(BaseModel):
    """A range specifying a section of a document."""

    type: Literal["block", "page", "char"]
    """The type of the document section specified by the range."""

    start_index: int
    """0 based index of the start of the range."""

    end_index: int
    """0 based index of the end of the range."""


class DocumentCitation(CitationBase):
    """A citation that refers to a page range in a document."""

    type: Literal["document"] = Field(default="document")
    """Type."""

    range: DocumentRange | None = Field(default=None)
    """Range of the document that is cited."""


class UrlCitation(CitationBase):
    """A citation that refers to a URL."""

    type: Literal["url"] = Field(default="url")
    """Type."""

    url: str
    """URL of the cited resource."""


Citation: TypeAlias = Annotated[
    Union[
        ContentCitation,
        DocumentCitation,
        UrlCitation,
    ],
    Discriminator("type"),
]
"""A citation sent to or received from a model."""
```

## `_util/compression.py`

```python
import zlib
from collections.abc import AsyncIterator
from typing import Protocol

import zstandard

from .zip_common import ZipCompressionMethod


class Decompressor(Protocol):
    """Protocol for async decompressors that read from a stream iterator."""

    @property
    def exhausted(self) -> bool:
        """Whether the decompressor has finished processing all input."""
        ...

    async def decompress_next(self, stream_iterator: AsyncIterator[bytes]) -> bytes:
        """Read compressed chunks until decompressed output is available.

        The decompressor may buffer multiple input chunks before producing output,
        as it needs to accumulate enough compressed data to decode a full block.
        This method keeps reading from the source stream until decompression
        yields non-empty output.

        Raises:
            StopAsyncIteration: When the stream is exhausted.
        """
        ...


class ZstdDecompressor(Decompressor):
    """Decompressor for zstd compressed data."""

    def __init__(self) -> None:
        self._decompressor: zstandard.ZstdDecompressionObj | None = None
        self._exhausted = False

    @property
    def exhausted(self) -> bool:
        return self._exhausted

    async def decompress_next(self, stream_iterator: AsyncIterator[bytes]) -> bytes:
        """Read compressed chunks until decompressed output is available."""
        if self._decompressor is None:
            self._decompressor = zstandard.ZstdDecompressor().decompressobj()
        while True:
            try:
                chunk = await stream_iterator.__anext__()
                decompressed = self._decompressor.decompress(chunk)
                if decompressed:
                    return decompressed
            except StopAsyncIteration:
                # Note: Unlike zlib, zstandard's decompressobj doesn't have
                # a flush() method. Passing empty bytes can trigger output
                # of any remaining buffered data in some edge cases.
                try:
                    final = self._decompressor.decompress(b"")
                except zstandard.ZstdError:
                    final = b""
                self._decompressor = None
                self._exhausted = True
                if final:
                    return final
                raise


class DeflateDecompressor(Decompressor):
    """Decompressor for DEFLATE (raw) compressed data."""

    def __init__(self) -> None:
        self._decompressor: zlib._Decompress | None = None
        self._exhausted = False

    @property
    def exhausted(self) -> bool:
        return self._exhausted

    async def decompress_next(self, stream_iterator: AsyncIterator[bytes]) -> bytes:
        """Read compressed chunks until decompressed output is available."""
        if self._decompressor is None:
            self._decompressor = zlib.decompressobj(-15)  # Raw DEFLATE
        while True:
            try:
                chunk = await stream_iterator.__anext__()
                decompressed = self._decompressor.decompress(chunk)
                if decompressed:
                    return decompressed
            except StopAsyncIteration:
                final = self._decompressor.flush()
                self._decompressor = None
                self._exhausted = True
                if final:
                    return final
                raise


def decompress_bytes(data: bytes, method: ZipCompressionMethod) -> bytes:
    """Decompress a complete buffer using the given ZIP compression method."""
    if method == ZipCompressionMethod.STORED:
        return data
    elif method == ZipCompressionMethod.DEFLATE:
        return zlib.decompress(data, -15)
    elif method == ZipCompressionMethod.ZSTD:
        return zstandard.ZstdDecompressor().stream_reader(data).read()
    else:
        raise NotImplementedError(f"Unsupported compression method: {method}")


class Compressor(Protocol):
    """Protocol for async compressors that read from a stream iterator."""

    @property
    def exhausted(self) -> bool:
        """Whether the compressor has finished processing all input."""
        ...

    async def compress_next(self, stream_iterator: AsyncIterator[bytes]) -> bytes:
        """Read uncompressed chunks until compressed output is available.

        The compressor may buffer multiple input chunks before producing output,
        as it needs to accumulate enough data to form a compressed block.
        This method keeps reading from the source stream until compression
        yields non-empty output.

        Raises:
            StopAsyncIteration: When the stream is exhausted.
        """
        ...


class DeflateCompressor(Compressor):
    """Compressor for DEFLATE (raw) compressed data."""

    def __init__(self) -> None:
        # wbits=-15 produces raw DEFLATE (no zlib/gzip wrapper)
        self._compressor: zlib._Compress | None = zlib.compressobj(
            level=6,
            wbits=-15,
        )
        self._exhausted = False

    @property
    def exhausted(self) -> bool:
        return self._exhausted

    async def compress_next(self, stream_iterator: AsyncIterator[bytes]) -> bytes:
        """Read uncompressed chunks until compressed output is available."""
        while True:
            try:
                chunk = await stream_iterator.__anext__()
                if self._compressor is None:
                    raise StopAsyncIteration
                compressed = self._compressor.compress(chunk)
                if compressed:
                    return compressed
                # If no compressed data yet (buffered), continue reading
            except StopAsyncIteration:
                # Input stream exhausted, flush any remaining data
                if self._compressor:
                    final = self._compressor.flush()
                    self._compressor = None
                    self._exhausted = True
                    if final:
                        return final
                raise
```

## `_util/compression_transcoding.py`

```python
from collections.abc import AsyncIterable, AsyncIterator
from contextlib import AbstractAsyncContextManager
from types import TracebackType
from typing import Literal

import zstandard
from anyio.abc import ByteReceiveStream

from .compression import DeflateCompressor, DeflateDecompressor, ZstdDecompressor
from .zip_common import ZipCompressionMethod


class CompressedToUncompressedStream(AsyncIterator[bytes]):
    """AsyncIterator that decompresses ZIP member data streams.

    Supports DEFLATE (mode 8) and zstd (mode 93) compression methods.
    For uncompressed data (COMPRESSION_STORED), use the source stream directly.

    This class provides explicit control over resource cleanup via the aclose()
    method, fixing Python 3.12 issues where async generator cleanup could fail
    with "generator already running" errors during event loop shutdown.
    """

    def __init__(
        self,
        compressed_stream: ByteReceiveStream,
        compression_method: Literal[
            ZipCompressionMethod.DEFLATE, ZipCompressionMethod.ZSTD
        ],
    ):
        """Initialize the decompression stream.

        Args:
            compressed_stream: The compressed input byte stream
            compression_method: Compression format of input (8=DEFLATE, 93=zstd).
        """
        self._compressed_stream = compressed_stream
        self._decompressor = (
            DeflateDecompressor()
            if compression_method == ZipCompressionMethod.DEFLATE
            else ZstdDecompressor()
        )
        self._stream_iterator: AsyncIterator[bytes] | None = None
        self._closed = False

    def __aiter__(self) -> AsyncIterator[bytes]:
        """Return self as the async iterator."""
        return self

    async def __anext__(self) -> bytes:
        if self._closed or self._decompressor.exhausted:
            raise StopAsyncIteration

        # Initialize stream iterator on first call
        if self._stream_iterator is None:
            self._stream_iterator = self._compressed_stream.__aiter__()

        return await self._decompressor.decompress_next(self._stream_iterator)

    async def aclose(self) -> None:
        """Explicitly close the stream and underlying resources.

        This method ensures the ByteReceiveStream is properly closed even
        when the iterator is not fully consumed.
        """
        if self._closed:
            return

        self._closed = True

        # Close the underlying stream
        await self._compressed_stream.aclose()


class CompressedToDeflateStream:
    """Async context manager that transcodes a potentially compressed stream to deflate.

    Decompresses the source stream (if compressed) and re-compresses to deflate
    for HTTP streaming (browsers support Content-Encoding: deflate but not zstd).

    Example:
        async with DeflateTranscodingStream(zstd_cm, COMPRESSION_ZSTD) as stream:
            async for chunk in stream:
                yield chunk
    """

    def __init__(
        self,
        source_cm: AbstractAsyncContextManager[AsyncIterable[bytes]],
        source_compression: ZipCompressionMethod = ZipCompressionMethod.STORED,
    ) -> None:
        """Initialize the transcoding stream.

        Args:
            source_cm: Async context manager that yields compressed bytes
            source_compression: Compression method of source (0=stored, 93=zstd)
        """
        self._source_cm = source_cm
        self._source_compression = source_compression
        self._deflate_stream: _DeflateCompressStream | None = None
        self._closed = False

    async def __aenter__(self) -> AsyncIterator[bytes]:
        source_iter = await self._source_cm.__aenter__()
        try:
            # Decompress source if needed, then deflate-compress
            if self._source_compression == ZipCompressionMethod.DEFLATE:
                # Already deflate-compressed, pass through unchanged
                return source_iter.__aiter__()
            elif self._source_compression == ZipCompressionMethod.ZSTD:
                decompressed_iter = _ZstdDecompressIterator(source_iter.__aiter__())
                self._deflate_stream = _DeflateCompressStream(decompressed_iter)
            else:
                # Source is uncompressed (COMPRESSION_STORED), just deflate-compress
                self._deflate_stream = _DeflateCompressStream(source_iter.__aiter__())
            return self._deflate_stream
        except Exception:
            # Clean up source if stream creation fails
            await self._source_cm.__aexit__(None, None, None)
            raise

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        if self._closed:
            return
        self._closed = True
        if self._deflate_stream:
            await self._deflate_stream.aclose()
        await self._source_cm.__aexit__(exc_type, exc_val, exc_tb)

    async def aclose(self) -> None:
        """Explicitly close resources without entering the context manager.

        Safe to call multiple times or after __aexit__.
        """
        if self._closed:
            return
        self._closed = True
        # source_cm was never entered, nothing to close


class _DeflateCompressStream(AsyncIterator[bytes]):
    """AsyncIterator wrapper for deflate-compressing an async byte stream.

    Used to transcode zstd-compressed data to deflate for HTTP streaming,
    since browsers support Content-Encoding: deflate but not zstd.
    """

    def __init__(self, source_stream: AsyncIterator[bytes]):
        """Initialize the deflate compression stream.

        Args:
            source_stream: The input byte stream to compress
        """
        self._source_stream = source_stream
        self._compressor = DeflateCompressor()
        self._closed = False

    def __aiter__(self) -> AsyncIterator[bytes]:
        """Return self as the async iterator."""
        return self

    async def __anext__(self) -> bytes:
        """Get the next chunk of deflate-compressed data.

        Returns:
            Next chunk of compressed bytes

        Raises:
            StopAsyncIteration: When stream is exhausted
        """
        if self._closed or self._compressor.exhausted:
            raise StopAsyncIteration

        return await self._compressor.compress_next(self._source_stream)

    async def aclose(self) -> None:
        """Explicitly close the stream.

        Safe to call multiple times.
        """
        if self._closed:
            return

        self._closed = True


class _ZstdDecompressIterator(AsyncIterator[bytes]):
    """AsyncIterator that decompresses zstd data from a source iterator."""

    def __init__(self, source: AsyncIterator[bytes]):
        self._source = source
        dctx = zstandard.ZstdDecompressor()
        self._decompressor: zstandard.ZstdDecompressionObj | None = dctx.decompressobj()
        self._exhausted = False

    def __aiter__(self) -> AsyncIterator[bytes]:
        return self

    async def __anext__(self) -> bytes:
        if self._exhausted or self._decompressor is None:
            raise StopAsyncIteration

        while True:
            try:
                chunk = await self._source.__anext__()
                decompressed = self._decompressor.decompress(chunk)
                if decompressed:
                    return decompressed
            except StopAsyncIteration:
                # Flush any remaining data
                if self._decompressor:
                    try:
                        final = self._decompressor.decompress(b"")
                    except zstandard.ZstdError:
                        final = b""
                    self._decompressor = None
                    self._exhausted = True
                    if final:
                        return final
                raise
```

## `_util/config.py`

```python
import json
from typing import Any

import yaml

from inspect_ai.util._resource import resource

from .error import PrerequisiteError
from .file import filesystem


def resolve_args(args: dict[str, Any] | str) -> dict[str, Any]:
    # if its a file, read as JSON or YAML
    if isinstance(args, str):
        fs = filesystem(args)
        if not fs.exists(args):
            raise PrerequisiteError(f"The config file {args} does not exist.")
        args = read_config_object(resource(args, type="file"))

    return args


def read_config_object(obj: str) -> dict[str, Any]:
    # detect json vs. yaml
    is_json = obj.strip().startswith("{")
    config = json.loads(obj) if is_json else yaml.safe_load(obj)
    if not isinstance(config, dict):
        raise ValueError(f"The config is not a valid object: {obj}")
    else:
        return config
```

## `_util/constants.py`

```python
from pathlib import Path
from typing import Any, Literal

PKG_AUTHOR = "UK AI Security Institute"
PKG_AUTHOR_DIR = "UK-AISI"
PKG_NAME = Path(__file__).parent.parent.stem
PKG_PATH = Path(__file__).parent.parent
DEFAULT_EPOCHS = 1
DEFAULT_MAX_CONNECTIONS = 10
DEFAULT_MAX_CONNECTIONS_BATCH = 10000
DEFAULT_MAX_TOKENS = 2048
DEFAULT_VIEW_PORT = 7575
DEFAULT_SERVER_HOST = "127.0.0.1"
HTTP = 15
HTTP_LOG_LEVEL = "HTTP"
TRACE = 13
TRACE_LOG_LEVEL = "TRACE"
ALL_LOG_LEVELS = [
    "DEBUG",
    TRACE_LOG_LEVEL,
    HTTP_LOG_LEVEL,
    "INFO",
    "WARNING",
    "ERROR",
    "CRITICAL",
    "NOTSET",
]
DEFAULT_LOG_LEVEL = "warning"
DEFAULT_LOG_LEVEL_TRANSCRIPT = "info"
DEFAULT_LOG_SHARED = 10
DEFAULT_RETRY_ON_ERROR = 1
ALL_LOG_FORMATS = ["eval", "json"]
DEFAULT_LOG_FORMAT: Literal["eval", "json"] = "eval"
JSON_LOG_FORMAT = "json"
EVAL_LOG_FORMAT = "eval"
DEFAULT_DISPLAY = "full"
LOG_SCHEMA_VERSION = 2
SCORED_SUFFIX = "-scored"
CONSOLE_DISPLAY_WIDTH = 120
BASE_64_DATA_REMOVED = "<base64-data-removed>"
SANDBOX_SETUP_TIMEOUT = 300
NO_CONTENT = "(no content)"
MODEL_NONE = "none/none"
DEFAULT_BATCH_SIZE = 100
DEFAULT_CACHE_DAYS = 7

DESERIALIZING = "deserializing"
MESSAGE_CACHE = "message_cache"


def get_deserializing_context() -> dict[str, Any]:
    return {DESERIALIZING: True, MESSAGE_CACHE: {}}


def log_condense_enabled() -> bool:
    """Return whether pool-based event condensing is enabled."""
    import os

    val = os.environ.get("INSPECT_LOG_CONDENSE", "")
    return val.lower() in ("1", "true", "yes")
```

## `_util/content.py`

```python
import mimetypes
from pathlib import Path
from typing import Any, Literal, Sequence, Union

from pydantic import BaseModel, Field, JsonValue, model_validator

from inspect_ai._util.citation import Citation
from inspect_ai._util.url import data_uri_mime_type


class ContentBase(BaseModel):
    internal: JsonValue | None = Field(default=None)
    """Model provider specific payload - typically used to aid transformation back to model types."""


class ContentText(ContentBase):
    """Text content."""

    type: Literal["text"] = Field(default="text")
    """Type."""

    text: str
    """Text content."""

    refusal: bool | None = Field(default=None)
    """Was this a refusal message?"""

    citations: Sequence[Citation] | None = Field(default=None)
    """Citations supporting the text block."""


class ContentReasoning(ContentBase):
    """Reasoning content.

    See the specification for [thinking blocks](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking#understanding-thinking-blocks) for Claude models.
    """

    type: Literal["reasoning"] = Field(default="reasoning")
    """Type."""

    reasoning: str
    """Reasoning content."""

    summary: str | None = Field(default=None)
    """Reasoning summary or readable reasoning text, if available."""

    signature: str | None = Field(default=None)
    """Signature for reasoning content (used by some models to ensure that reasoning content is not modified for replay)"""

    redacted: bool = Field(default=False)
    """Indicates that the explicit content of this reasoning block has been redacted."""

    @property
    def text(self) -> str:
        """Pure text rendering of reasoning (used for replay/interop)."""
        thinking = self.reasoning if not self.redacted else (self.summary or "")
        return f"<think>{thinking}</think>"


class ContentToolUse(ContentBase):
    """Server side tool use."""

    type: Literal["tool_use"] = Field(default="tool_use")
    """Type."""

    tool_type: Literal["web_search", "mcp_call", "code_execution"]
    """The type of the tool call."""

    id: str
    """The unique ID of the tool call."""

    name: str
    """Name of the tool."""

    context: str | None = Field(default=None)
    """Tool context (e.g. MCP Server)"""

    arguments: str
    """Arguments passed to the tool."""

    result: str
    """Result from the tool call."""

    error: str | None = Field(default=None)
    """The error from the tool call (if any)."""


class ContentImage(ContentBase):
    """Image content."""

    type: Literal["image"] = Field(default="image")
    """Type."""

    image: str
    """Either a URL of the image or the base64 encoded image data."""

    detail: Literal["auto", "low", "high", "original"] = Field(default="auto")
    """Specifies the detail level of the image.

    Currently only supported for OpenAI. Learn more in the    [Vision guide](https://platform.openai.com/docs/guides/vision/low-or-high-fidelity-image-understanding).
    """


class ContentAudio(ContentBase):
    """Audio content."""

    type: Literal["audio"] = Field(default="audio")
    """Type."""

    audio: str
    """Audio file path or base64 encoded data URL."""

    format: Literal["wav", "mp3"]
    """Format of audio data ('mp3' or 'wav')"""


class ContentVideo(ContentBase):
    """Video content."""

    type: Literal["video"] = Field(default="video")
    """Type."""

    video: str
    """Video file path or base64 encoded data URL."""

    format: Literal["mp4", "mpeg", "mov"]
    """Format of video data ('mp4', 'mpeg', or 'mov')"""


class ContentDocument(ContentBase):
    """Document content (e.g. a PDF)."""

    type: Literal["document"] = Field(default="document")
    """Type."""

    document: str
    """Document file path or base64 encoded data URL."""

    filename: str = Field(default_factory=str)
    """Document filename (automatically determined from 'document' if not specified)."""

    mime_type: str = Field(default_factory=str)
    """Document mime type (automatically determined from 'document' if not specified)."""

    @model_validator(mode="before")
    @classmethod
    def set_name_and_mime_type(cls, data: Any) -> Any:
        """Automatically set name and mime_type if not provided."""
        if not isinstance(data, dict):
            return data
        document: str | None = data.get("document")
        filename: str | None = data.get("filename")
        mime_type: str | None = data.get("mime_type")

        if not document:
            # Let Pydantic handle the missing required field
            return data

        if document.startswith("data:"):
            if not mime_type:
                mime_type = data_uri_mime_type(document) or "application/octet-stream"
            if not filename:
                extension = mime_type.split("/")[-1]
                filename = f"document.{extension}"

        else:
            path = Path(document)
            if not filename:
                filename = path.name

            if not mime_type:
                guessed_type, _ = mimetypes.guess_type(str(path))
                mime_type = guessed_type or "application/octet-stream"

        data["filename"] = filename
        data["mime_type"] = mime_type

        return data


class ContentData(ContentBase):
    """Model internal."""

    type: Literal["data"] = Field(default="data")
    """Type."""

    data: dict[str, JsonValue]
    """Model provider specific payload - required for internal content."""


Content = Union[
    ContentText,
    ContentReasoning,
    ContentImage,
    ContentAudio,
    ContentVideo,
    ContentData,
    ContentToolUse,
    ContentDocument,
]
"""Content sent to or received from a model."""
```

## `_util/dateutil.py`

```python
import sys
from datetime import date, datetime, time, timedelta, timezone
from logging import getLogger
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import AwareDatetime, BeforeValidator


def iso_now(
    timespec: Literal[
        "auto", "hours", "minutes", "seconds", "milliseconds", "microseconds"
    ] = "seconds",
) -> "UtcDatetimeStr":
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat(timespec=timespec)


logger = getLogger(__name__)


def _normalize_iso_z_suffix(input: str) -> str:
    """Normalize Z suffix in ISO format strings for Python 3.10 compatibility.

    Python 3.10's fromisoformat() doesn't support Z suffix for UTC.
    Python 3.11+ handles Z natively.

    Args:
        input: ISO format string (may end with Z or z)

    Returns:
        ISO format string with Z/z replaced by +00:00 (if Python < 3.11)
    """
    return (
        input
        if sys.version_info >= (3, 11) or not input.endswith(("Z", "z"))
        else input[:-1] + "+00:00"
    )


def is_file_older_than(path: str | Path, delta: timedelta, *, default: bool) -> bool:
    """Check if a file's modification time is older than a given time delta.

    Args:
        path: Path to the file to check
        delta: Time delta to compare against
        default: Value to return if file doesn't exist or isn't accessible

    Returns:
        True if file was last modified before (now - delta), False otherwise.
    """
    try:
        path = Path(path)
        mtime = path.lstat().st_mtime
        path_mtime = datetime.fromtimestamp(mtime, tz=timezone.utc)
        cutoff_time = datetime.now(timezone.utc) - delta
        return path_mtime < cutoff_time
    # OSError is expected in cases where the file doesn't exist or
    # for some reason isn't accessible (e.g. due to permissions)
    except OSError:
        return default


def datetime_now_utc() -> "UtcDatetime":
    """Return current datetime in UTC with timezone info."""
    # This function may seem silly, but it's useful as a parameterless factory in
    # scenarios like `Field(default_factory=datetime_now_utc)`
    return datetime.now(timezone.utc)


def datetime_from_iso_format_safe(
    input: str, fallback_tz: timezone = timezone.utc
) -> "UtcDatetime":
    """Parse ISO format datetime string, applying fallback timezone if none specified.

    Args:
        input: ISO format datetime string (e.g., '2025-04-17T12:00:00' or '2025-04-17T12:00:00Z')
        fallback_tz: Timezone to apply if input lacks timezone info (default: UTC)

    Returns:
        Timezone-aware datetime object. If input has timezone, uses it; otherwise
        applies fallback_tz.
    """
    return datetime_safe(
        datetime.fromisoformat(_normalize_iso_z_suffix(input)), fallback_tz
    )


def datetime_safe(dt: datetime, fallback_tz: timezone = timezone.utc) -> "UtcDatetime":
    """Ensure datetime has timezone info, applying fallback if naive.

    Args:
        dt: Datetime object (may or may not have timezone)
        fallback_tz: Timezone to apply if dt lacks timezone info (default: UTC)

    Returns:
        Timezone-aware datetime. If dt has timezone, returns as-is; otherwise
        applies fallback_tz.
    """
    return dt if dt.tzinfo else dt.replace(tzinfo=fallback_tz)


def datetime_to_iso_format_safe(
    dt: datetime, fallback_tz: timezone = timezone.utc
) -> str:
    """Convert datetime to ISO format string, applying fallback timezone if naive.

    Args:
        dt: Datetime object (may or may not have timezone)
        fallback_tz: Timezone to apply if dt lacks timezone info (default: UTC)

    Returns:
        ISO format string of timezone-aware datetime.
    """
    return datetime_safe(dt, fallback_tz).isoformat()


def _before_validate_utc_datetime(v: Any) -> Any:
    """Pre-validation coercion for UtcDatetime.

    - Strings: Parse with UTC fallback (legacy logs)
    - Aware datetimes: Convert to UTC
    - Naive datetimes: Coerce to UTC (treats as UTC per design)
    - Numeric: Pass through to AwareDatetime (handles int/float timestamps)
    """
    if isinstance(v, str):
        return datetime_from_iso_format_safe(v).astimezone(timezone.utc)
    if isinstance(v, datetime):
        # Design requirement: "transforms naive data to UTC rather than rejecting it"
        return datetime_safe(v, timezone.utc).astimezone(timezone.utc)
    # Pass through numeric timestamps for AwareDatetime to handle
    return v


def _before_validate_utc_date(v: Any) -> Any:
    """Pre-validation coercion for UtcDate."""
    if isinstance(v, str):
        return date.fromisoformat(_normalize_iso_z_suffix(v))
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    # Pass through - let Pydantic handle invalid input
    return v


def _before_validate_utc_time(v: Any) -> Any:
    """Pre-validation coercion for UtcTime."""
    if isinstance(v, str):
        return time.fromisoformat(_normalize_iso_z_suffix(v))
    if isinstance(v, datetime):
        return v.timetz() if v.tzinfo else v.time()
    if isinstance(v, time):
        return v
    # Pass through - let Pydantic handle invalid input
    return v


def _before_validate_utc_datetime_str(v: Any) -> str:
    """Parse and normalize ISO datetime string to UTC.

    For legacy string temporal fields that cannot be converted to UtcDatetime
    without breaking API compatibility. Accepts ISO 8601 strings, normalizes
    to UTC, returns as ISO string.

    Args:
        v: ISO 8601 datetime string

    Returns:
        UTC-normalized ISO 8601 string

    Raises:
        ValueError: If v is not a string or not a valid ISO datetime
    """
    if not isinstance(v, str):
        raise ValueError(f"Expected str, got {type(v)}")
    return (
        datetime_from_iso_format_safe(v, fallback_tz=timezone.utc)
        .astimezone(timezone.utc)
        .isoformat()
    )


UtcDatetime = Annotated[AwareDatetime, BeforeValidator(_before_validate_utc_datetime)]
UtcDate = Annotated[date, BeforeValidator(_before_validate_utc_date)]
UtcTime = Annotated[time, BeforeValidator(_before_validate_utc_time)]
UtcDatetimeStr = Annotated[str, BeforeValidator(_before_validate_utc_datetime_str)]
```

## `_util/decorator.py`

```python
import ast
from logging import getLogger
from pathlib import Path
from typing import Any

from .error import exception_message
from .file import file

logger = getLogger(__name__)


def parse_decorators(
    path: Path, decorator_name: str
) -> list[tuple[str, dict[str, Any]]]:
    # read code from python source file
    if path.suffix.lower() == ".py":
        with file(path.as_posix(), "r", encoding="utf-8") as f:
            code = f.read()

    # read code from notebook
    elif path.suffix.lower() == ".ipynb":
        try:
            from inspect_ai._util.notebook import read_notebook_code
        except ImportError:
            return []

        code = read_notebook_code(path)

    # unsupported file type
    else:
        raise ModuleNotFoundError(f"Invalid extension for module file: {path.suffix}")

    # parse the top level decorators out of the code
    decorators: list[tuple[str, dict[str, Any]]] = []
    try:
        tree = ast.parse(code)
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.FunctionDef):
                for decorator in node.decorator_list:
                    result = parse_decorator(node, decorator, decorator_name)
                    if result:
                        decorators.append(result)
    except SyntaxError:
        pass

    return decorators


def parse_decorator(
    node: ast.FunctionDef, decorator: ast.expr, decorator_name: str
) -> tuple[str, dict[str, Any]] | None:
    if isinstance(decorator, ast.Name):
        if str(decorator.id) == decorator_name:
            return node.name, {}
    elif isinstance(decorator, ast.Call):
        if isinstance(decorator.func, ast.Name):
            if str(decorator.func.id) == decorator_name:
                return parse_decorator_name_and_params(node, decorator)
    return None


def parse_decorator_name_and_params(
    node: ast.FunctionDef, decorator: ast.Call
) -> tuple[str, dict[str, Any]]:
    name = node.name
    attribs: dict[str, Any] = {}
    for arg in decorator.keywords:
        if arg.arg is not None:
            try:
                value = ast.literal_eval(arg.value)
                if arg.arg == "name":
                    name = value
                else:
                    attribs[arg.arg] = value
            except ValueError as ex:
                # when parsing, we can't provide the values of expressions that execute code
                logger.debug(
                    f"Error parsing attribute {arg.arg} of {node.name}: {exception_message(ex)}"
                )
                pass
    return name, attribs
```

## `_util/deprecation.py`

```python
# from https://pyomo.readthedocs.io/en/stable/_modules/pyomo/common/deprecation.html


import inspect
import logging
from types import FrameType
from typing import Any, Set


def relocated_module_attribute(
    local: str,
    target: str,
    version: str | None = None,
    remove_in: str | None = None,
    msg: str | None = None,
    f_globals: dict[str, Any] | None = None,
) -> None:
    """Provide a deprecation path for moved / renamed module attributes

    This function declares that a local module attribute has been moved
    to another location.  For Python 3.7+, it leverages a
    module.__getattr__ method to manage the deferred import of the
    object from the new location (on request), as well as emitting the
    deprecation warning.

    Params:

        local (str): The original (local) name of the relocated attribute
        target (str): The new absolute import name of the relocated attribute
        version (str): The Pyomo version when this move was released
          (passed to deprecation_warning)
        remove_in (str | None): The Pyomo version when this deprecation path
          will be removed (passed to deprecation_warning)
        msg (str | None): If not None, then this specifies a custom deprecation
          message to be emitted when the attribute is accessed from its original
         location.

    """
    # Historical note: This method only works for Python >= 3.7.  There
    # were backports to previous Python interpreters, but were removed
    # after SHA 4e04819aaeefc2c08b7718460918885e12343451
    if f_globals is None:
        frame = inspect.currentframe()
        if frame:
            back = frame.f_back
            if back:
                f_globals = back.f_globals
                if f_globals["__name__"].startswith("importlib."):
                    raise RuntimeError(
                        "relocated_module_attribute() called from a cythonized "
                        "module without passing f_globals"
                    )
    if f_globals is None:
        raise RuntimeError("No f_globals available.")
    _relocated = f_globals.get("__relocated_attrs__", None)
    if _relocated is None:
        f_globals["__relocated_attrs__"] = _relocated = {}
        _mod_getattr = f_globals.get("__getattr__", None)

        def __getattr__(name: str) -> Any:
            info = _relocated.get(name, None)
            if info is not None:
                target_obj = _import_object(name, *info)
                f_globals[name] = target_obj
                return target_obj
            elif _mod_getattr is not None:
                return _mod_getattr(name)
            raise AttributeError(
                "module '%s' has no attribute '%s'" % (f_globals["__name__"], name)
            )

        f_globals["__getattr__"] = __getattr__
    _relocated[local] = (target, version, remove_in, msg)


def _import_object(
    name: str,
    target: str,
    version: str | None = None,
    remove_in: str | None = None,
    msg: str | None = None,
) -> Any:
    from importlib import import_module

    modname, targetname = target.rsplit(".", 1)
    _object = getattr(import_module(modname), targetname)
    if msg is None:
        if inspect.isclass(_object):
            _type = "class"
        elif inspect.isfunction(_object):
            _type = "function"
        else:
            _type = "attribute"
        msg = (
            f"the '{name}' {_type} has been moved to '{target}'."
            " Please update your import."
        )
    deprecation_warning(msg, version=version, remove_in=remove_in)
    return _object


def deprecation_warning(
    msg: str,
    version: str | None = None,
    remove_in: str | None = None,
    calling_frame: FrameType | None = None,
) -> None:
    logger = logging.getLogger(__name__)

    msg = f"DEPRECATED: {default_deprecation_msg(None, msg, version, remove_in)}"

    if calling_frame is None:
        # The useful thing to let the user know is what called the
        # function that generated the deprecation warning.  The current
        # globals() is *this* module.  Walking up the stack to find the
        # frame where the globals() changes tells us the module that is
        # issuing the deprecation warning.  As we assume that *that*
        # module will not trigger its own deprecation warnings, we will
        # walk farther up until the globals() changes again.
        calling_frame = _find_calling_frame(2)
    if calling_frame is not None:
        info = inspect.getframeinfo(calling_frame)
        msg += " (called from %s:%s)" % (info.filename.strip(), info.lineno)
        if msg in _emitted_warnings:
            return
        _emitted_warnings.add(msg)

    from inspect_ai._util.logger import warn_once

    warn_once(logger, msg)


_emitted_warnings: Set[str] = set()


def _find_calling_frame(module_offset: int) -> FrameType | None:
    g = [globals()]
    frame = inspect.currentframe()
    if frame is not None:
        calling_frame = frame.f_back
        while calling_frame is not None:
            if calling_frame.f_globals is g[-1]:
                calling_frame = calling_frame.f_back
            elif len(g) < module_offset:
                g.append(calling_frame.f_globals)
            else:
                break
        return calling_frame
    else:
        return None


def default_deprecation_msg(
    obj: Any, user_msg: str, version: str | None, remove_in: str | None
) -> str:
    """Generate the default deprecation message.

    See deprecated() function for argument details.
    """
    if user_msg is None:
        if inspect.isclass(obj):
            _obj = " class"
        elif inspect.ismethod(obj):
            _obj = " method"
        elif inspect.isfunction(obj) or inspect.isbuiltin(obj):
            _obj = " function"
        else:
            # either @deprecated() an unknown type or called from
            # deprecation_warning()
            _obj = ""

        _qual = getattr(obj, "__qualname__", "") or ""
        if _qual.endswith(".__init__") or _qual.endswith(".__new__"):
            _obj = f" class ({_qual.rsplit('.', 1)[0]})"
        elif _qual and _obj:
            _obj += f" ({_qual})"

        user_msg = (
            "This%s has been deprecated and may be removed in a "
            "future release." % (_obj,)
        )
    comment = []
    if version:
        comment.append("deprecated in %s" % (version,))
    if remove_in:
        comment.append("will be removed in %s" % (remove_in))
    if comment:
        return user_msg + " (%s)" % (", ".join(comment),)
    else:
        return user_msg
```

## `_util/dev.py`

```python
import os


def is_dev_mode() -> bool:
    return os.environ.get("INSPECT_DEV_MODE", None) is not None
```

## `_util/dict.py`

```python
from typing import Any


def omit(x: dict[str, Any], vars: list[str]) -> dict[str, Any]:
    x = x.copy()
    for var in vars:
        if var in x:
            del x[var]
    return x
```

## `_util/dotenv.py`

```python
import contextlib
import os
from pathlib import Path
from typing import Any, Generator
from urllib.parse import urlparse

from dotenv import dotenv_values, find_dotenv, load_dotenv

from .file import absolute_file_path
from .platform import is_running_in_vscode

INSPECT_LOG_DIR_VAR = "INSPECT_LOG_DIR"


def init_dotenv() -> None:
    # if we are running in vscode, the vscode python extension is already reading in the
    # .env file. This means that editing the .env file within a given session does not
    # actually work! (since load_dotenv doesn't overwrite existing vars by default).
    # so, in this case we actually specify override so we get the more intuitive behavior
    override = is_running_in_vscode()

    # look up the directory tree for a .env file
    dotenv_file = find_dotenv(usecwd=True)

    # we found one, process it
    if dotenv_file:
        # is there an INSPECT_LOG_DIR currently in the environment? (we will give it preference)
        environment_log_dir = os.environ.get(INSPECT_LOG_DIR_VAR, None)
        dotenv_log_dir = dotenv_values(dotenv_file).get(INSPECT_LOG_DIR_VAR, None)

        # If the environment is providing a log_dir that is the same as what is configured
        # in the environment, treat this as if the environment is providing the log_dir
        # (which means it will be interpreted relative to the env file)
        #
        # If the log_dir is coming from the environment, interpret it relative to the cwd
        inspect_log_dir = None
        if environment_log_dir == dotenv_log_dir or not environment_log_dir:
            # check for a relative dir, if we find one then resolve to absolute
            if dotenv_log_dir:
                fs_scheme = urlparse(dotenv_log_dir).scheme
                if not fs_scheme and not os.path.isabs(dotenv_log_dir):
                    inspect_log_dir = (
                        (Path(dotenv_file).parent / dotenv_log_dir).resolve().as_posix()
                    )
        elif environment_log_dir:
            inspect_log_dir = absolute_file_path(environment_log_dir)

        # do the load, overriding as necessary if we are in vscode
        load_dotenv(dotenv_file, override=override)

        # apply the log_dir, giving preference to the existing environment var
        if inspect_log_dir:
            os.environ[INSPECT_LOG_DIR_VAR] = inspect_log_dir

        # re-apply any env vars specified at the cli w/ --env
        apply_cli_env()


@contextlib.contextmanager
def dotenv_environ(
    override: bool = is_running_in_vscode(),
) -> Generator[Any, Any, None]:
    # determine values to update
    update: dict[str, str] = {}
    values = dotenv_values(".env")
    for key, value in values.items():
        if value is not None and (override or (key not in os.environ.keys())):
            update[key] = value

    # vars to restore and remove on exit
    stomped = set(update.keys()) & set(os.environ.keys())
    update_after = {k: os.environ[k] for k in stomped}
    remove_after = frozenset(k for k in update if k not in os.environ)

    # do the thing
    try:
        os.environ.update(update)
        yield
    finally:
        os.environ.update(update_after)
        [os.environ.pop(k) for k in remove_after]


_cli_env: dict[str, Any] = {}


def init_cli_env(env: dict[str, Any]) -> None:
    global _cli_env
    _cli_env = env
    apply_cli_env()


def apply_cli_env() -> None:
    for var, value in _cli_env.items():
        os.environ[var] = str(value)
```

## `_util/entrypoints.py`

```python
from importlib.metadata import entry_points
from logging import getLogger

logger = getLogger(__name__)


def ensure_entry_points(package: str | None = None) -> None:
    # have we already loaded all entry points?

    global _inspect_ai_eps_loaded_all
    if _inspect_ai_eps_loaded_all:
        return None

    # have we already loaded entry points for this package?
    if package in _inspect_ai_eps_loaded:
        return None

    # enumerate entry points
    eps = entry_points(group="inspect_ai")
    for ep in eps:
        try:
            # if there is a package filter then condition on that
            if package is not None:
                if ep.name and (ep.name == package):
                    ep.load()
                    _inspect_ai_eps_loaded.append(package)

            # if there is no package filter then load unconditionally
            # and mark us as fully loaded
            else:
                ep.load()
                _inspect_ai_eps_loaded_all = True

        except Exception as ex:
            logger.warning(
                f"Unexpected exception loading entrypoints from '{ep.value}': {ex}"
            )
    # if we didn't find any entry points, mark us as fully loaded
    if package is not None and package not in _inspect_ai_eps_loaded:
        _inspect_ai_eps_loaded.append(package)
    elif len(eps) == 0:
        _inspect_ai_eps_loaded_all = True


def clear_entry_points_state() -> None:
    global _inspect_ai_eps_loaded_all
    _inspect_ai_eps_loaded_all = False
    _inspect_ai_eps_loaded.clear()


# inspect extension entry points
_inspect_ai_eps_loaded: list[str] = []
_inspect_ai_eps_loaded_all: bool = False
```

## `_util/environ.py`

```python
import os
from contextlib import contextmanager
from typing import Iterator


@contextmanager
def environ_var(name: str, value: str) -> Iterator[None]:
    """
    Temporarily set an environment variable within a context.

    Args:
        name: Name of the environment variable to set
        value: Value to set the environment variable to

    Yields:
        None
    """
    previous_value = os.environ.get(name)
    os.environ[name] = value
    try:
        yield
    finally:
        if previous_value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = previous_value


@contextmanager
def environ_vars(env_vars: dict[str, str]) -> Iterator[None]:
    """
    Temporarily set multiple environment variables within a context.

    Args:
        env_vars: Dictionary mapping environment variable names to values

    Yields:
        None
    """
    # save previous values
    previous_values = {}
    for name in env_vars:
        previous_values[name] = os.environ.get(name)

    # set new values
    for name, value in env_vars.items():
        os.environ[name] = value

    try:
        yield
    finally:
        # Restore previous environment
        for name in env_vars:
            previous_value = previous_values[name]
            if previous_value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = previous_value
```

## `_util/error.py`

```python
import sys
from importlib.metadata import version
from types import TracebackType
from typing import Callable

from pydantic import BaseModel
from rich import print
from rich.console import RenderableType


class EvalError(BaseModel):
    """Eval error details."""

    message: str
    """Error message."""

    traceback: str
    """Error traceback."""

    traceback_ansi: str
    """Error traceback with ANSI color codes."""


def pip_dependency_error(feature: str, dependencies: list[str]) -> Exception:
    return PrerequisiteError(
        f"[bold]ERROR[/bold]: {feature} requires optional dependencies. "
        f"Install with:\n\n[bold]pip install {' '.join(dependencies)}[/bold]"
    )


def module_version_error(
    feature: str, package: str, required_version: str
) -> Exception:
    return PrerequisiteError(
        f"ERROR: {feature} requires at least version {required_version} of package {package} "
        f"(you have version {version(package)} installed).\n\n"
        f"Upgrade with: pip install --upgrade {package}"
    )


def module_max_version_error(feature: str, package: str, max_version: str) -> Exception:
    return PrerequisiteError(
        f"[bold]ERROR[/bold]: {feature} supports only version {max_version} and earlier of package {package} "
        f"(you have version {version(package)} installed).\n\n"
        f"Install the older version with with:\n\n[bold]pip install {package}=={max_version}[/bold]"
    )


def exception_message(ex: BaseException) -> str:
    return getattr(ex, "message", repr(ex))


class PrerequisiteError(Exception):
    def __init__(self, message: RenderableType) -> None:
        self.message = message


class SilentException(Exception):
    pass


class WriteConflictError(Exception):
    """Exception raised when a conditional write fails due to concurrent modification.

    This error occurs when attempting to write to a log file that has been
    modified by another process since it was last read, indicating a race
    condition between concurrent evaluation runs.
    """


def exception_hook() -> Callable[..., None]:
    sys_handler = sys.excepthook

    def handler(
        exception_type: type[BaseException],
        exception: BaseException,
        traceback: TracebackType,
    ) -> None:
        if isinstance(exception, PrerequisiteError):
            print(f"\n{exception.message}\n")
        elif not isinstance(exception, SilentException):
            sys_handler(exception_type, exception, traceback)
        else:
            sys.exit(1)

    return handler


_exception_hook_set: bool = False


def set_exception_hook() -> None:
    global _exception_hook_set
    if not _exception_hook_set:
        sys.excepthook = exception_hook()
        _exception_hook_set = True
```

## `_util/exception.py`

```python
class TerminateSampleError(RuntimeError):
    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)
```

## `_util/file.py`

```python
import datetime
import io
import logging
import os
import re
import string
import unicodedata
from contextlib import contextmanager
from copy import deepcopy
from pathlib import Path
from typing import Any, BinaryIO, Iterator, Literal, cast, overload
from urllib.parse import urlparse

import fsspec  # type: ignore  # type: ignore
from fsspec.core import split_protocol  # type: ignore  # type: ignore
from fsspec.implementations.local import make_path_posix  # type: ignore
from pydantic import BaseModel, Field
from s3fs import S3FileSystem  # type: ignore
from shortuuid import uuid

from inspect_ai._util._async import configured_async_backend, current_async_backend
from inspect_ai._util.azure import (
    AZURE_SCHEMES,
    apply_azure_fs_options,
    is_azure_delete_permission_error,
    is_azure_path,
)
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.trace import trace_message

# https://filesystem-spec.readthedocs.io/en/latest/_modules/fsspec/spec.html#AbstractFileSystem
# https://filesystem-spec.readthedocs.io/en/latest/api.html#fsspec.generic.GenericFileSystem


OpenTextMode = Literal["r", "a", "w"]
OpenBinaryMode = Literal["rb", "ab", "wb"]


@overload
@contextmanager
def file(
    file: str,
    mode: OpenTextMode,
    encoding: str = "utf-8",
    fs_options: dict[str, Any] = {},
) -> Iterator[io.TextIOWrapper]: ...


@overload
@contextmanager
def file(
    file: str,
    mode: OpenBinaryMode,
    encoding: str = "utf-8",
    fs_options: dict[str, Any] = {},
) -> Iterator[BinaryIO]: ...


@contextmanager
def file(
    file: str,
    mode: OpenTextMode | OpenBinaryMode,
    encoding: str = "utf-8",
    fs_options: dict[str, Any] = {},
) -> Iterator[io.TextIOWrapper] | Iterator[BinaryIO]:
    """Open local or remote file stream.

    Open a file stream for reading or writing. Refer to a local file or
    use a URI with a remove filesystem prefix (e.g. 's3://'). The
    `fsspec` package is used to resolve filesystem URLs.

    Args:
        file (str):
          Local file path or remove filesystem URL (e.g. 's3://')
        mode (str): Mode for accessing file ("r", "rb", "w", "wb", etc.).
        encoding: (str): Encoding for text files (defaults to "utf-8")
        fs_options (dict[str, Any]): Optional. Addional arguments to pass through
          to the filesystem provider (e.g. `S3FileSystem`). Use `{"anon": True }`
          if you are accessing a public S3 bucket with no credentials.

    """
    # get the default storage options for the scheme then apply passed options
    options = default_fs_options(file)
    options.update(fs_options)

    # open the file
    open_file = fsspec.open(file, mode=mode, encoding=encoding, **options)

    # yield the file and ensure it is closed when we exit the context
    with open_file as f:
        try:
            yield f
        finally:
            f.close()


def open_file(
    file: str,
    mode: OpenTextMode | OpenBinaryMode,
    encoding: str = "utf-8",
    fs_options: dict[str, Any] = {},
) -> fsspec.core.OpenFile:
    # get the default storage options for the scheme then apply passed options
    options = default_fs_options(file)
    options.update(fs_options)

    # open the file and return the stream
    return fsspec.open(file, mode=mode, encoding=encoding, **options)


# utility to copy a file
def copy_file(
    input_file: str,
    output_file: str,
    buffer_size: int = 1024 * 1024,
) -> None:
    """Copy a file across filesystems."""
    with file(input_file, "rb") as fin, file(output_file, "wb") as fout:
        while True:
            chunk = fin.read(buffer_size)
            if not chunk:
                break
            fout.write(chunk)


def basename(file: str) -> str:
    """Get the base name of the file.

    Works for all variations of fsspec providers, posix/windows/etc.

    Args:
       file (str): File name

    Returns:
       Base name for file
    """
    # windows paths aren't natively handled on posix so flip backslashes
    if os.sep == "/":
        file = file.replace("\\", "/")
    normalized_path = make_path_posix(file)
    _, path_without_protocol = split_protocol(normalized_path)
    name: str = path_without_protocol.rstrip("/").split("/")[-1]
    return name


def dirname(file: str) -> str:
    base = basename(file)
    return file[: -(len(base) + 1)]


def exists(file: str) -> bool:
    fs = filesystem(file)
    return fs.exists(file)


class FileInfo(BaseModel):
    name: str
    """Name of file."""

    type: str
    """Type of file (file or directory)"""

    size: int
    """File size in bytes."""

    mtime: float | None
    """File modification time (None if the file is a directory on S3)."""

    etag: str | None = Field(default=None)
    """Etag (provided by some remote filesystems)"""


class FileSystem:
    def __init__(self, fs: Any) -> None:
        self.fs = fs

    @property
    def sep(self) -> str:
        return cast(str, self.fs.sep)

    def exists(self, path: str) -> bool:
        return self.fs.exists(path) is True

    def touch(self, path: str) -> None:
        self.fs.touch(path)

    def rm(
        self, path: str, recursive: bool = False, maxdepth: int | None = None
    ) -> None:
        self.fs.rm(path, recursive=recursive, maxdepth=maxdepth)

    def mv(self, lpath: str, rpath: str) -> None:
        self.fs.mv(lpath, rpath)

    def mkdir(self, path: str, exist_ok: bool = False) -> None:
        if self.is_s3():
            # try to avoid calling create_bucket on s3 filesystems (as that requires distinct
            # privileges from being able to write to an existing bucket). we do this by
            # first calling mkdir w/ create_parents=False and then only if that fails
            # with FileNotFound do we attempt to create the bucket by calling mkdirs
            try:
                self.fs.makedir(path, create_parents=False)
            except FileExistsError:
                if exist_ok:
                    pass
                else:
                    raise
            except FileNotFoundError:
                self.fs.makedirs(path, exist_ok=exist_ok)
        else:
            self.fs.makedirs(path, exist_ok=exist_ok)

    def info(self, path: str, **kwargs: dict[str, Any]) -> FileInfo:
        return self._file_info(self.fs.info(path, **kwargs))

    def path_as_uri(self, path: str) -> str:
        return str(self.fs.unstrip_protocol(path))

    def ls(
        self, path: str, recursive: bool = False, **kwargs: dict[str, Any]
    ) -> list[FileInfo]:
        # prevent caching of listings
        self.fs.invalidate_cache(path)

        # enumerate the files
        if recursive:
            files: list[dict[str, Any]] = []
            for _, _, filenames in self.fs.walk(path=path, detail=True, **kwargs):
                files.extend(filenames.values())
        else:
            files = cast(
                list[dict[str, Any]],
                self.fs.ls(path, detail=True, **kwargs),
            )

        # return FileInfo
        return [self._file_info(file) for file in files]

    def is_local(self) -> bool:
        return isinstance(self.fs, fsspec.implementations.local.LocalFileSystem)

    def is_writeable(self, path: str) -> bool:
        # first, attempt to create a zero-byte blob/file. If this fails outright we are not
        # writeable. Azure gets a constant touch file name b/c some azure credentials can create
        # but not delete (e.g. SAS without 'd' delete permission or managed identity with only
        # Data Writer). The marker file can just be gc'd later.
        _WRITE_TEST_FILENAME = ".inspect_write_test"
        touch_filename = _WRITE_TEST_FILENAME if is_azure_path(path) else uuid()
        path.rstrip("/\\")
        touch_file = f"{path}{self.fs.sep}{touch_filename}"
        try:
            self.touch(touch_file)
        except PermissionError:
            return False
        except Exception:
            # azure may throw other error types, treat those as non-writeable
            return False

        # attempt to remove the test file.
        try:
            self.rm(touch_file)
        except Exception as ex:
            # tolerate azure write permission w/o delete permission
            if is_azure_delete_permission_error(ex):
                return True

            # if delete failed for some other reason, report non-writeable
            return False

        # writeable!
        return True

    def is_async(self) -> bool:
        return isinstance(self.fs, fsspec.asyn.AsyncFileSystem)

    def is_s3(self) -> bool:
        return isinstance(self.fs, S3FileSystem)

    def put_file(self, lpath: str, rpath: str) -> None:
        self.fs.put_file(lpath, rpath)

    def get_file(self, rpath: str, lpath: str) -> None:
        self.fs.get_file(rpath, lpath)

    def read_bytes(
        self, path: str, start: int | None = None, end: int | None = None
    ) -> bytes:
        return cast(bytes, self.fs.read_bytes(path, start, end))

    def _file_info(self, info: dict[str, Any]) -> FileInfo:
        # name needs the protocol prepended
        file = info.copy()
        file["name"] = self.fs.unstrip_protocol(file["name"])

        file["mtime"] = self._determine_mtime(file)

        # S3 filesystems provided an ETag
        if "ETag" in file.keys():
            etag: str | None = file["ETag"].strip('"')
        else:
            etag = None

        return FileInfo(
            name=file["name"],
            type=file["type"],
            size=file.get("size") or 0,
            mtime=file["mtime"],
            etag=etag,
        )

    def _determine_mtime(self, file: dict[str, Any]) -> float | None:
        # Prefer provider supplied mtime if present.
        if "mtime" in file:
            normalized = self._normalize_timestamp(file["mtime"])
            if normalized is not None:
                return normalized

        # S3 style dictionaries expose LastModified.
        if "LastModified" in file:
            normalized = self._normalize_timestamp(file["LastModified"])
            if normalized is not None:
                return normalized

        if file.get("type") != "file":
            return None

        # When listings omit an mtime, fall back to filesystem APIs.
        if hasattr(self.fs, "created"):
            try:
                created = self.fs.created(file["name"])
                normalized = self._normalize_timestamp(created)
                if normalized is not None:
                    return normalized
            except Exception:
                pass

        if hasattr(self.fs, "modified"):
            try:
                modified = self.fs.modified(file["name"])
                normalized = self._normalize_timestamp(modified)
                if normalized is not None:
                    return normalized
            except Exception:
                pass

        return None

    def _normalize_timestamp(self, mtime: Any) -> float | None:
        if isinstance(mtime, datetime.datetime):
            return mtime.timestamp() * 1000
        if isinstance(mtime, (int, float)):
            return float(mtime) * 1000
        return None


def filesystem(path: str, fs_options: dict[str, Any] = {}) -> FileSystem:
    """Return the filesystem used to host the specified path.

    Args:
      path (str): Local path or remote URL e.g. s3://).  The
        `fsspec` package is used to resolve filesystem URLs.
      fs_options (dict[str, Any]): Optional. Additional arguments to pass through
        to the filesystem provider (e.g. `S3FileSystem`). Use `{"anon": True }`
        if you are accessing a public S3 bucket with no credentials.

    Returns:
       An tuple with an `fsspec` compatible filesystem and the
       file-systems-specific URL for file.
    """
    # determine options
    options = default_fs_options(path)
    options.update(fs_options)

    # create filesystem
    fs, path = fsspec.core.url_to_fs(path, **options)
    return FileSystem(fs)


def absolute_file_path(file: str) -> str:
    # check for a relative dir, if we find one then resolve to absolute
    fs_scheme = urlparse(file).scheme
    if not fs_scheme and not os.path.isabs(file):
        file = Path(file).resolve().as_posix()
    return strip_trailing_sep(file)


def to_uri(path_or_uri: str) -> str:
    # Check if it's already a URI
    parsed = urlparse(path_or_uri)

    if parsed.scheme:
        # Already has a scheme, return as is
        return path_or_uri

    # It's a file path, convert to URI
    path_obj = Path(path_or_uri).absolute()
    return path_obj.as_uri()


def default_fs_options(file: str) -> dict[str, Any]:
    scheme = urlparse(file).scheme
    if (
        scheme == "s3"
        and configured_async_backend() == "trio"
        and current_async_backend() == "trio"
    ):
        raise PrerequisiteError(
            "ERROR: The s3 interface is not supported when running under the trio async backend."
        )

    options = deepcopy(DEFAULT_FS_OPTIONS.get(scheme, {}))
    # Inject Azure Blob/DataLake credentials only when the path actually uses an
    # Azure scheme—this lets the optional `adlfs` dependency be imported/configured
    # on demand rather than for every filesystem.
    if scheme in AZURE_SCHEMES:
        apply_azure_fs_options(options)
    # disable caching for all filesystems
    options.update(
        dict(
            skip_instance_cache=False,
            use_listings_cache=False,
        )
    )
    return options


def size_in_mb(file: str) -> float:
    # Open the file using fsspec and retrieve the file's information
    fs, path = fsspec.core.url_to_fs(file)

    # Use the filesystem's info method to get the size
    file_info = fs.info(path)

    # Extract the size from the file information
    file_size_in_bytes = cast(float, file_info["size"])

    # Get the size in megabytes
    file_size_in_mb = file_size_in_bytes / (1024 * 1024)
    return file_size_in_mb


def safe_filename(s: str, max_length: int = 255) -> str:
    """
    Convert a string into a safe filename by removing or replacing unsafe characters.

    Args:
        s (str): The input string to convert
        max_length (int): Maximum length of the resulting filename (default 255)

    Returns:
        str: A safe filename string

    Examples:
        >>> safe_filename("Hello/World?.txt")
        'Hello_World.txt'
    """
    # normalize unicode characters
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ASCII", "ignore").decode("ASCII")

    # remove or replace unsafe characters
    # Keep only alphanumeric characters, dots, dashes, and underscores
    safe_chars = string.ascii_letters + string.digits + ".-_"
    s = "".join(c if c in safe_chars else "_" for c in s)

    # remove consecutive underscores
    s = re.sub(r"_+", "_", s)

    # remove leading/trailing periods and underscores
    s = s.strip("._")

    # handle empty string case
    if not s:
        s = "untitled"

    # handle starting with a period (hidden files)
    if s.startswith("."):
        s = "_" + s

    # enforce length limit
    if len(s) > max_length:
        # If we need to truncate, preserve the file extension if present
        name, ext = os.path.splitext(s)
        ext_len = len(ext)
        if ext_len > 0:
            max_name_length = max_length - ext_len
            s = name[:max_name_length] + ext
        else:
            s = s[:max_length]

    return s


# clean underscores, slashes, colons, and + from the file name component so we can
# reliably parse components out later without worrying about underscores
def clean_filename_component(component: str) -> str:
    return (
        component.replace("_", "-")
        .replace("/", "-")
        .replace(":", "-")
        .replace("+", "-")
    )


def strip_trailing_sep(path: str) -> str:
    """Remove trailing separators from a path, preserving the root.

    Matches pathlib behavior: exactly ``//`` is preserved per POSIX,
    any other all-separator path collapses to a single separator.
    """
    fs = filesystem(path)
    stripped = path.rstrip(fs.sep)
    if stripped:
        return stripped
    # All separators — preserve exactly "//" per POSIX, otherwise collapse
    if path == fs.sep * 2:
        return path
    return fs.sep


logger = logging.getLogger(__name__)


async def cleanup_s3_sessions() -> None:
    """Close cached S3FileSystem sessions to prevent 'Unclosed connector' errors.

    s3fs caches S3FileSystem instances via fsspec's instance cache. Each holds an
    aiobotocore client with an open aiohttp.ClientSession. At process exit, s3fs's
    weakref finalizer fails to close these properly due to a bug in its close_session
    method (it accesses _connector instead of _sessions on AIOHTTPSession), causing
    aiohttp.ClientSession.__del__ to emit 'Unclosed client session' / 'Unclosed
    connector' warnings. See https://github.com/fsspec/s3fs/issues/943

    This function explicitly closes the sessions via the proper async cleanup path
    and clears the instance cache so the weakref finalizer has nothing to do.
    """
    instances = list(S3FileSystem._cache.values())
    if not instances:
        return

    try:
        for instance in instances:
            s3creator = getattr(instance, "_s3creator", None)
            if s3creator is not None:
                try:
                    await s3creator.__aexit__(None, None, None)
                except Exception:
                    pass
    finally:
        try:
            S3FileSystem.clear_instance_cache()
        except Exception:
            logger.warning("Failed to clear S3FileSystem instance cache", exc_info=True)
        else:
            trace_message(
                logger,
                "s3",
                "Cleaned up %d cached S3FileSystem instance(s)",
                len(instances),
            )


DEFAULT_FS_OPTIONS: dict[str, dict[str, Any]] = dict(
    # disable all S3 native caching
    s3=dict(
        default_fill_cache=False,
        default_cache_type="none",
        cache_regions=False,
        config_kwargs={"signature_version": "s3v4"},
    ),
    # Azure schemes (credentials resolved dynamically in default_fs_options)
    az=dict(),
    abfs=dict(),
    abfss=dict(),
)
```

## `_util/format.py`

```python
import pprint
from string import Formatter
from textwrap import indent
from typing import Any


def format_function_call(
    func_name: str, args_dict: dict[str, Any], indent_spaces: int = 4, width: int = 80
) -> str:
    formatted_args = []
    for key, value in args_dict.items():
        formatted_value = format_value(value, width)
        formatted_args.append(f"{key}={formatted_value}")

    args_str = ", ".join(formatted_args)

    if len(args_str) <= width - 1 - len(func_name) - 2:  # 2 for parentheses
        return f"{func_name}({args_str})"
    else:
        indented_args = indent(",\n".join(formatted_args), " " * indent_spaces)
        return f"{func_name}(\n{indented_args}\n)"


def format_value(value: object, width: int) -> str:
    if isinstance(value, str):
        return f"'{value}'"
    elif isinstance(value, list | tuple | dict):
        return pprint.pformat(value, width=width)
    return str(value)


def format_progress_time(time: float, pad_hours: bool = True) -> str:
    minutes, seconds = divmod(time, 60)
    hours, minutes = divmod(minutes, 60)
    hours_fmt = f"{hours:2.0f}" if pad_hours else f"{hours:.0f}"
    return f"{hours_fmt}:{minutes:02.0f}:{seconds:02.0f}"


def format_template(
    template: str,
    params: dict[str, Any],
    skip_unknown: bool = True,
) -> str:
    """Format a template string, optionally preserving unknown placeholders.

    Args:
        template: A string containing {placeholders} to be formatted
        params: Dictionary of parameters to substitute into the template
        skip_unknown: If True, preserve unknown placeholders; if False, raise KeyError

    Returns:
        The formatted string with parameters substituted

    Examples:
        >>> format_template("Hello {name}!", {"name": "World"})
        'Hello World!'
        >>> format_template("Hello {name}!", {}, skip_unknown=True)
        'Hello {name}!'
    """

    class SafeFormatter(Formatter):
        def get_field(self, field_name: str, args: Any, kwargs: Any) -> Any:
            try:
                # Handle array indexing and nested attributes
                first, rest = (
                    field_name.split(".", 1)
                    if "." in field_name
                    else (field_name, None)
                )
                first = first.split("[")[0]  # Remove any array indexing for the check

                if first not in params and skip_unknown:
                    return "{" + field_name + "}", field_name

                obj = params.get(first)
                if obj is None and skip_unknown:
                    return "{" + field_name + "}", field_name

                return super().get_field(field_name, args, kwargs)
            except (AttributeError, KeyError, IndexError) as e:
                if skip_unknown:
                    return "{" + field_name + "}", field_name
                raise KeyError(f"Failed to format field '{field_name}'") from e

        def format_field(self, value: Any, format_spec: str) -> Any:
            try:
                return super().format_field(value, format_spec)
            except (ValueError, TypeError):
                if skip_unknown:
                    return "{" + str(value) + ":" + format_spec + "}"
                raise

    return SafeFormatter().format(template, **params)
```

## `_util/future.py`

```python
from typing import Generic, TypeVar

import anyio

T = TypeVar("T")


class Future(Generic[T]):
    def __init__(self) -> None:
        self._result: T | None = None
        self._ex: Exception | None = None
        self._event = anyio.Event()

    def set_result(self, result: T) -> None:
        self._result = result
        self._event.set()

    def set_exception(self, ex: Exception) -> None:
        self._ex = ex
        self._event.set()

    async def result(self) -> T:
        await self._event.wait()
        if self._result is not None:
            return self._result
        elif self._ex is not None:
            raise self._ex
        else:
            raise RuntimeError("Future completed without a result or error")

    @staticmethod
    def set_future_result(future: "Future[T]", result: T) -> None:
        future.set_result(result)

    @staticmethod
    def set_future_exception(future: "Future[T]", error: Exception) -> None:
        future.set_exception(error)
```

## `_util/git.py`

```python
import os
import shutil
import subprocess

from pydantic import BaseModel


class GitContext(BaseModel):
    origin: str
    commit: str
    dirty: bool


def git_context() -> GitContext | None:
    # skip git operations when running under pytest
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None

    # check for git
    git = shutil.which("git")
    if not git:
        return None

    # check for a git revision in this directory
    commit_result = subprocess.run(
        [git, "rev-parse", "--short", "HEAD"], capture_output=True, text=True
    )
    if commit_result.returncode != 0:
        return None

    # check for git origin (if any)
    origin = subprocess.run(
        [git, "remote", "get-url", "origin"],
        capture_output=True,
        text=True,
    ).stdout.strip()

    # check if working tree is dirty
    status_result = subprocess.run(
        [git, "status", "--porcelain"],
        capture_output=True,
        text=True,
    )
    dirty = bool(status_result.stdout.strip())

    # return context
    return GitContext(origin=origin, commit=commit_result.stdout.strip(), dirty=dirty)
```

## `_util/hash.py`

```python
import hashlib

import mmh3


def mm3_hash(message: str) -> str:
    # Generate the 128-bit hash as two 64-bit integers
    h1, h2 = mmh3.hash64(message.encode("utf-8"))  # pylint: disable=E0633

    # Convert to unsigned integers and then to hexadecimal
    return f"{h1 & 0xFFFFFFFFFFFFFFFF:016x}{h2 & 0xFFFFFFFFFFFFFFFF:016x}"


def base57_id_hash(content: str) -> str:
    """Generate base67 hash for content.

    Hash the content, truncate to 128 bits, and then further truncate to 93 bits,
    returning a 22-character Base-57-URL string. Collision probability reaches 50%
    at approximately 70 trillion items.
    """
    digest_size = 16  # 128 bits
    digest = hashlib.blake2s(content.encode(), digest_size=digest_size).digest()

    # Truncate to ~93 bits (log₂57^22 ≈ 128.3)
    as_int = int.from_bytes(digest, "big")
    base57_str = to_base57(as_int)
    if len(base57_str) > 22:
        return base57_str[-22:]  # Take last 22 chars if longer
    else:
        # This is unlikely with a 128-bit input
        return base57_str.rjust(22, ALPHABET57[0])


# shortuuid uses these 57 characters (excluding similar-looking characters like 0/O, 1/I/l, etc.)
ALPHABET57 = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def to_base57(n: int) -> str:
    if n == 0:
        return ALPHABET57[0]

    out = []
    while n:
        n, rem = divmod(n, 57)
        out.append(ALPHABET57[rem])

    # reverse and return
    return "".join(reversed(out))
```

## `_util/html.py`

```python
def as_html_id(prefix: str, text: str) -> str:
    id = "".join(c if c.isalnum() else "-" for c in text.lower())
    return f"{prefix}-{id}" if id[0].isdigit() else id
```

## `_util/http.py`

```python
# see https://cloud.google.com/storage/docs/retry-strategy
def is_retryable_http_status(status_code: int) -> bool:
    return status_code in [408, 429] or (500 <= status_code < 600)
```

## `_util/httpx.py`

```python
import logging
from typing import Callable

import httpcore
import httpx
from httpx import HTTPStatusError
from tenacity import RetryCallState

from inspect_ai._util.constants import HTTP
from inspect_ai._util.http import is_retryable_http_status

logger = logging.getLogger(__name__)


def httpx_should_retry(ex: BaseException) -> bool:
    """Check whether an exception raised from httpx should be retried.

    Implements the strategy described here: https://cloud.google.com/storage/docs/retry-strategy

    Args:
      ex (BaseException): Exception to examine for retry behavior

    Returns:
      True if a retry should occur
    """
    if isinstance(ex, HTTPStatusError):
        return is_retryable_http_status(ex.response.status_code)

    elif httpx_should_retry_no_status_code(ex):
        return True

    # don't retry
    else:
        return False


def log_httpx_retry_attempt(context: str) -> Callable[[RetryCallState], None]:
    def log_attempt(retry_state: RetryCallState) -> None:
        logger.log(
            HTTP,
            f"{context} connection retry {retry_state.attempt_number} (retrying in {retry_state.upcoming_sleep:,.0f} seconds)",
        )

    return log_attempt


def httpx_should_retry_no_status_code(ex: BaseException) -> bool:
    """
    Check whether an exception (without an HTTP status code) should be retried.

    To understand this function, it may be helpful to look at the exception hierarchies for
    httpx and httpcore, which are reproduced below.


    # HTTPX Exception Hierarchy
    Exception (Python built-in)
    |
    +-- HTTPError
    |   |
    |   +-- RequestError
    |   |   |
    |   |   +-- TransportError
    |   |   |   |
    |   |   |   +-- TimeoutException
    |   |   |   |   |
    |   |   |   |   +-- ConnectTimeout
    |   |   |   |   +-- ReadTimeout
    |   |   |   |   +-- WriteTimeout
    |   |   |   |   +-- PoolTimeout
    |   |   |   |
    |   |   |   +-- NetworkError
    |   |   |   |   |
    |   |   |   |   +-- ConnectError
    |   |   |   |   +-- ReadError
    |   |   |   |   +-- WriteError
    |   |   |   |   +-- CloseError
    |   |   |   |
    |   |   |   +-- ProtocolError
    |   |   |   |   |
    |   |   |   |   +-- LocalProtocolError
    |   |   |   |   +-- RemoteProtocolError
    |   |   |   |
    |   |   |   +-- ProxyError
    |   |   |   +-- UnsupportedProtocol
    |   |   |
    |   |   +-- DecodingError
    |   |   +-- TooManyRedirects
    |   |
    |   +-- HTTPStatusError
    |
    +-- InvalidURL
    +-- CookieConflict
    +-- RuntimeError (Python built-in)
        |
        +-- StreamError
            |
            +-- StreamConsumed
            +-- StreamClosed
            +-- ResponseNotRead
            +-- RequestNotRead


    # HTTPCore Exception Hierarchy
    Exception (Python built-in)
    |
    +-- ConnectionNotAvailable
    +-- ProxyError
    +-- UnsupportedProtocol
    +-- ProtocolError
    |   |
    |   +-- RemoteProtocolError
    |   +-- LocalProtocolError
    |
    +-- TimeoutException
    |   |
    |   +-- PoolTimeout
    |   +-- ConnectTimeout
    |   +-- ReadTimeout
    |   +-- WriteTimeout
    |
    +-- NetworkError
        |
        +-- ConnectError
        +-- ReadError
        +-- WriteError
    """
    # Base class for all exceptions that occur at the level of the Transport API.
    is_transport_error = isinstance(ex, httpx.TransportError)

    # Sometimes exceptions are raised directly by httpcore, the lower-level library that httpx uses
    is_httpcore_network_error = isinstance(ex, httpcore.NetworkError)
    is_httpcore_timeout_error = isinstance(ex, httpcore.TimeoutException)
    is_httpcore_protocol_error = isinstance(ex, httpcore.ProtocolError)

    # extensible in case we notice other cases
    return any(
        [
            is_transport_error,
            is_httpcore_network_error,
            is_httpcore_timeout_error,
            is_httpcore_protocol_error,
        ]
    )
```

## `_util/images.py`

```python
import base64
import mimetypes

import httpx

from .file import file as open_file
from .url import (
    data_uri_mime_type,
    data_uri_to_base64,
    is_data_uri,
    is_http_url,
)


async def file_as_data(file: str) -> tuple[bytes, str]:
    if is_data_uri(file):
        # resolve mime type and base64 content
        mime_type = data_uri_mime_type(file) or "image/png"
        file_base64 = data_uri_to_base64(file)
        file_bytes = base64.b64decode(file_base64)
    else:
        # guess mime type; need strict=False for webp images
        type, _ = mimetypes.guess_type(file, strict=False)
        if type:
            mime_type = type
        else:
            mime_type = "image/png"

        # handle url or file
        if is_http_url(file):
            client = httpx.AsyncClient()
            file_bytes = (await client.get(file)).content
        else:
            with open_file(file, "rb") as f:
                file_bytes = f.read()

    # return bytes and type
    return file_bytes, mime_type


async def file_as_data_uri(file: str) -> str:
    if is_data_uri(file):
        return file
    else:
        bytes, mime_type = await file_as_data(file)
        base64_file = base64.b64encode(bytes).decode("utf-8")
        return as_data_uri(mime_type, base64_file)


def as_data_uri(mime_type: str, data: str) -> str:
    return f"data:{mime_type};base64,{data}"
```

## `_util/json.py`

```python
import re
from copy import deepcopy
from typing import (
    TYPE_CHECKING,
    Any,
    Literal,
    Mapping,
    TypeAlias,
)

import jsonpatch

if TYPE_CHECKING:
    from ijson import IncompleteJSONError  # type: ignore[import-untyped]
    from ijson.backends.python import UnexpectedSymbol  # type: ignore[import-untyped]
from jsonpointer import (  # type: ignore  # jsonpointer is already a dependency of jsonpatch
    JsonPointerException,
    resolve_pointer,
)
from pydantic import BaseModel, Field, JsonValue
from pydantic_core import PydanticSerializationError, to_json, to_jsonable_python

# Pre-compile regex to quickly find paths ending in an index for json_changes (e.g., /items/0)
_ARRAY_INDEX_RE = re.compile(r"^(.*)/(\d+)$")


def is_ijson_nan_inf_error(
    ex: "ValueError | IncompleteJSONError | UnexpectedSymbol",
) -> bool:
    """Check if an ijson exception is due to NaN/Inf values.

    ijson doesn't support NaN and Inf which are valid in Python's JSON
    (and supported by pydantic). This helper identifies these errors so
    callers can fall back to standard json.load.

    Args:
        ex: Exception from ijson parsing (ValueError, IncompleteJSONError,
            or UnexpectedSymbol).

    Returns:
        True if the exception is due to NaN/Inf parsing issues.
    """
    error_msg = str(ex).lower()
    return (
        "invalid json character" in error_msg
        or "invalid char in json text" in error_msg
        or "unexpected symbol" in error_msg
    )


JSONType = Literal["string", "integer", "number", "boolean", "array", "object", "null"]
"""Valid types within JSON schema."""


def jsonable_python(x: Any) -> Any:
    return to_jsonable_python(x, exclude_none=True, fallback=lambda _x: None)


def jsonable_dict(x: Any) -> dict[str, JsonValue]:
    x = to_jsonable_python(x, exclude_none=True, fallback=lambda _x: None)
    if isinstance(x, dict):
        return x
    else:
        raise TypeError(
            f"jsonable_dict must be passed an object with fields (type passed was {type(x)})"
        )


_IncEx: TypeAlias = (
    set[int] | set[str] | Mapping[int, "_IncEx | bool"] | Mapping[str, "_IncEx | bool"]
)


def to_json_safe(
    x: Any,
    exclude: _IncEx | None = None,
    indent: int | None = 2,
) -> bytes:
    normalized = jsonable_python(x)

    def clean_utf8_json(obj: Any) -> Any:
        if isinstance(obj, str):
            return obj.encode("utf-8", errors="backslashreplace").decode("utf-8")
        elif isinstance(obj, dict):
            return {k: clean_utf8_json(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [clean_utf8_json(item) for item in obj]
        return obj

    try:
        return to_json(
            value=normalized,
            indent=indent,
            exclude_none=True,
            fallback=lambda _x: None,
            exclude=exclude,
        )
    except PydanticSerializationError as ex:
        if "surrogates not allowed" in str(ex):
            cleaned = clean_utf8_json(normalized)
            return to_json(
                cleaned, indent=indent, exclude_none=True, fallback=lambda _x: None
            )
        raise


def to_json_str_safe(x: Any) -> str:
    return to_json_safe(x).decode("utf-8")


def python_type_to_json_type(python_type: str | None) -> JSONType:
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
        # treat 'unknown' as string as anything can be converted to string
        case None:
            return "string"
        case _:
            raise ValueError(
                f"Unsupported type: {python_type} for Python to JSON conversion."
            )


class JsonChange(BaseModel):
    """Describes a change to data using JSON Patch format."""

    op: Literal["remove", "add", "replace", "move", "test", "copy"]
    """Change operation."""

    path: str
    """Path within object that was changed (uses / to delimit levels)."""

    from_: str | None = Field(default=None, alias="from")
    """Location from which data was moved or copied."""

    value: JsonValue = Field(default=None, exclude=False)
    """Changed value."""

    replaced: JsonValue = Field(default=None, exclude=False)
    """Replaced value."""

    model_config = {"populate_by_name": True}


def _get_tracked_containers(patch_list: list[dict[str, Any]]) -> set[str]:
    """Identifies which array paths need state tracking for json_changes.

    We only need to track the state of an array if it undergoes structural changes (add/remove) AND contains a 'replace' operation later in the patch list.
    """
    # Find all arrays being structurally modified (add/remove)
    structural_containers = set()
    for op in patch_list:
        if op["op"] in ("add", "remove"):
            if match := _ARRAY_INDEX_RE.match(op["path"]):
                structural_containers.add(match.group(1))

    # Filter down to only those that actually impact a 'replace' op
    tracked = set()
    if structural_containers:
        for op in patch_list:
            if op["op"] == "replace":
                for container in structural_containers:
                    if op["path"].startswith(container + "/"):
                        tracked.add(container)
                        break
    return tracked


def _get_active_container(
    path: str, tracked_paths: set[str]
) -> tuple[str | None, str | None]:
    """Checks if a specific path belongs to a tracked container for json_changes.

    Returns:
        (container, relative_path_without_slash) e.g., ("/items", "0")
    """
    if not tracked_paths:
        return None, None

    # Find the most specific (longest) matching container to handle nested arrays
    best_match: str | None = None
    for container in tracked_paths:
        if path.startswith(container + "/"):
            if best_match is None or len(container) > len(best_match):
                best_match = container

    if best_match is not None:
        # Return container and the path relative to it (stripping the slash)
        return best_match, path[len(best_match) + 1 :]

    return None, None


def _apply_fast_list_op(target: list[Any], op: dict[str, Any], rel_path: str) -> None:
    """Mutates a list in-place to apply a JSON patch operation efficiently.

    This function optimises the "hot path" by using native Python list methods (.insert, .pop) for simple index operations, avoiding the significant overhead of the jsonpatch library. It falls back to the library for complex paths.

    Args:
        target: The list to mutate.
        op: The patch operation dictionary containing 'op' and 'value'.
        rel_path: The relative path within the list (e.g., "0", "15", "-").
    """
    # Fast path: Simple index (e.g. "0", "15", "-")
    # We check for '/' to ensure it's not a nested path like "0/id"
    if "/" not in rel_path:
        if op["op"] == "add":
            idx = len(target) if rel_path == "-" else int(rel_path)
            target.insert(idx, op["value"])
        elif op["op"] == "remove":
            target.pop(int(rel_path))
    else:
        # Slow path: Complex/Nested path (e.g., "0/details/id")
        # Prepend '/' because jsonpatch requires pointers to start with /
        target[:] = jsonpatch.apply_patch(target, [{**op, "path": "/" + rel_path}])  # type: ignore


def json_changes(
    before: dict[str, Any] | list[Any], after: dict[str, Any] | list[Any]
) -> list[JsonChange] | None:
    """Calculates JSON changes including the 'replaced' value for replace operations.

    Standard JSON Patch does not include the value that was overwritten during a 'replace' operation. This function calculates that value.

    Optimisation Strategy:
        Looking up the 'replaced' value is trivial for static paths. However, if
        an array has items inserted/removed, the indices shift. To resolve the
        correct 'replaced' value, we normally need to apply patches sequentially.

        Instead of deepcopying the entire document (slow), this function identifies
        only the specific arrays that shift and creates small "shadow" copies of
        them. It applies patches to these shadow arrays to track the correct
        indices, whilst ignoring the rest of the document.

    Args:
        before: The original dictionary.
        after: The modified dictionary.

    Returns:
        A list of JsonChange objects (which mimic JSON patch ops but include the 'replaced' field), or None if there are no changes.
    """
    patch_list = list(jsonpatch.make_patch(before, after))
    if not patch_list:
        return None

    # Identify which arrays need isolated tracking
    tracked_paths = _get_tracked_containers(patch_list)

    # Create shadow copies of ONLY those arrays
    # resolve_pointer handles traversing 'before' to find the sub-list.
    shadow_state = {
        path: deepcopy(resolve_pointer(before, path)) for path in tracked_paths
    }

    changes: list[JsonChange] = []

    for op in patch_list:
        container, rel_path = _get_active_container(op["path"], tracked_paths)

        # Calculate the 'replaced' value if this is a 'replace' op
        replaced_val = None
        if op["op"] == "replace":
            source = shadow_state[container] if container else before

            # Ensure lookup_path has a leading slash for resolve_pointer
            if container:
                assert rel_path is not None  # Shouldn't be since container is set
                lookup_path = "/" + rel_path
            else:
                lookup_path = op["path"]

            try:
                replaced_val = resolve_pointer(source, lookup_path)
            except JsonPointerException:
                # Usually implies the path doesn't exist in the shadow state. Just leave replaced_val as None
                pass

        # Update shadow state if the structure changed due to an 'add' or 'remove' op
        if container and op["op"] in ("add", "remove"):
            assert rel_path is not None  # Shouldn't be since container is set
            if isinstance(shadow_state[container], list):
                _apply_fast_list_op(shadow_state[container], op, rel_path)

        # Build Result
        change = JsonChange(**op)
        if op["op"] == "replace":
            change.replaced = replaced_val
        changes.append(change)

    return changes
```

## `_util/kvstore.py`

```python
import sqlite3
from contextlib import AbstractContextManager
from typing import Any, Optional, cast

from .appdirs import inspect_data_dir


class KVStore(AbstractContextManager["KVStore"]):
    def __init__(self, filename: str, max_entries: int | None = None):
        self.filename = filename
        self.max_entries = max_entries

    def __enter__(self) -> "KVStore":
        self.conn = sqlite3.connect(self.filename)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()
        return self

    def __exit__(self, *excinfo: Any) -> None:
        self.conn.close()

    def put(self, key: str, value: str) -> None:
        # Insert or update the value
        self.conn.execute(
            """
            INSERT OR REPLACE INTO kv_store (key, value, created_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        """,
            (key, value),
        )

        # If we have a max_entries limit, remove oldest entries
        if self.max_entries:
            count = self.count()
            if count > self.max_entries:
                self.conn.execute(
                    """
                    DELETE FROM kv_store
                    WHERE key IN (
                        SELECT key FROM kv_store
                        ORDER BY created_at ASC
                        LIMIT ?
                    )
                    """,
                    (max(0, count - self.max_entries),),
                )

        self.conn.commit()

    def get(self, key: str) -> Optional[str]:
        cursor = self.conn.execute("SELECT value FROM kv_store WHERE key = ?", (key,))
        result = cursor.fetchone()
        return result[0] if result else None

    def delete(self, key: str) -> bool:
        cursor = self.conn.execute("DELETE FROM kv_store WHERE key = ?", (key,))
        self.conn.commit()
        return cursor.rowcount > 0

    def count(self) -> int:
        cursor = self.conn.execute("SELECT COUNT(*) FROM kv_store")
        return cast(int, cursor.fetchone()[0])


def inspect_kvstore(name: str, max_entries: int | None = None) -> KVStore:
    filename = inspect_data_dir("kvstore") / f"{name}.db"
    return KVStore(filename.as_posix(), max_entries=max_entries)
```

## `_util/list.py`

```python
from typing import Callable, TypeVar

T = TypeVar("T")


def remove_last_match_and_after(
    lst: list[T], predicate: Callable[[T], bool]
) -> list[T]:
    last_match_index = max((i for i, x in enumerate(lst) if predicate(x)), default=-1)
    return lst[: last_match_index + 1]


def find_last_match(lst: list[T], predicate: Callable[[T], bool]) -> int | None:
    for i in range(len(lst) - 1, -1, -1):
        if predicate(lst[i]):
            return i
    return None
```

## `_util/local_server.py`

```python
import json
import logging
import os
import platform
import random
import socket
import subprocess
import time
from typing import Any, Dict, Optional, Tuple

import httpx

# Set up logger for this module
logger = logging.getLogger(__name__)

# Global dictionary to keep track of process -> reserved port mappings
process_socket_map: dict[subprocess.Popen[str], socket.socket] = {}

DEFAULT_RETRY_DELAY = 5

DEFAULT_TIMEOUT = 60 * 10  # fairly conservative default timeout of 10 minutes


def reserve_port(
    host: str, start: int = 30000, end: int = 40000
) -> Tuple[int, socket.socket]:
    """
    Reserve an available port by trying to bind a socket.

    Args:
        host: Host to bind to
        start: Minimum port number to try
        end: Maximum port number to try

    Returns:
        A tuple (port, lock_socket) where `lock_socket` is kept open to hold the lock.
    """
    is_macos = platform.system() == "Darwin"

    if is_macos:
        logger.info(
            "MacOS system detected. A free binding port will be identified, but not reserved until the server binds to it."
        )
        # On macOS, let the OS pick a free port but not open it
        # It leads to a small racode condition window until the port
        # is actually opened by the llm server
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind((host, 0))  # Bind to any free port
            port = s.getsockname()[1]
        return port, s

    # Non-macOS behavior: try ports in range
    candidates = list(range(start, end))
    random.shuffle(candidates)

    for port in candidates:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            # Attempt to bind to the port on localhost
            sock.bind((host, port))
            return port, sock
        except socket.error:
            sock.close()  # Failed to bind, try next port
            continue
    raise RuntimeError("No free port available.")


def release_port(lock_socket: socket.socket) -> None:
    """
    Release the reserved port by closing the lock socket.

    Args:
        lock_socket: The socket to close
    """
    try:
        lock_socket.close()
    except Exception as e:
        logger.error(f"Error closing socket: {e}")


def execute_shell_command(
    command: list[str], env: Optional[dict[str, str]] = None
) -> subprocess.Popen[str]:
    """
    Execute a command and return its process handle.

    Args:
        command: List of command arguments
        env: Optional environment variables to pass to the subprocess

    Returns:
        A subprocess.Popen object representing the running process
    """
    # Create a process environment by copying current environment and updating with new values
    process_env = os.environ.copy()
    if env:
        process_env.update(env)

    # Create a process that redirects output to pipes so we can capture it
    process = subprocess.Popen(
        command,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=1,  # Line buffered
        env=process_env,  # Pass the environment variables
    )

    # Set up background thread to read and log stdout
    def log_output() -> None:
        if process.stdout is None:
            return
        for line in iter(process.stdout.readline, ""):
            if line:
                logger.debug(line.strip())
        process.stdout.close()

    # Set up background thread to read and log stderr
    def log_error() -> None:
        if process.stderr is None:
            return
        for line in iter(process.stderr.readline, ""):
            if line:
                logger.info(line.strip())
        process.stderr.close()

    # Start background threads to handle output
    import threading

    threading.Thread(target=log_output, daemon=True).start()
    threading.Thread(target=log_error, daemon=True).start()

    logger.info(f"Started server with command: {' '.join(command)}")
    return process


def kill_process_tree(pid: int) -> None:
    """
    Kill a process and all its children.

    Args:
        pid: Process ID to kill
    """
    try:
        # Send SIGTERM
        subprocess.run(["pkill", "-TERM", "-P", str(pid)], check=False)
        subprocess.run(["kill", "-TERM", str(pid)], check=False)
        time.sleep(1)

        # If process still exists, send SIGKILL
        try:
            os.kill(pid, 0)  # Check if process exists
            subprocess.run(["pkill", "-KILL", "-P", str(pid)], check=False)
            subprocess.run(["kill", "-KILL", str(pid)], check=False)
        except OSError:
            pass  # Process already terminated
    except Exception as e:
        logger.error(f"Error killing process tree: {e}")


def launch_server_cmd(
    command: list[str],
    host: str = "0.0.0.0",
    port: Optional[int] = None,
    env: Optional[dict[str, str]] = None,
) -> Tuple[subprocess.Popen[str], int, list[str]]:
    """
    Launch a server process with the given base command and return the process, port, and full command.

    Args:
        command: Base command to execute
        host: Host to bind to
        port: Port to bind to. If None, a free port is reserved.
        env: Optional environment variables to pass to the subprocess

    Returns:
        Tuple of (process, port, full_command)
    """
    if port is None:
        port, lock_socket = reserve_port(host)
    else:
        lock_socket = None

    full_command = command + ["--port", str(port)]
    logger.info(f"Launching server on port {port}")

    process = execute_shell_command(full_command, env=env)

    if lock_socket is not None:
        process_socket_map[process] = lock_socket

    return process, port, full_command


def terminate_process(process: subprocess.Popen[str]) -> None:
    """
    Terminate the process and automatically release the reserved port.

    Args:
        process: The process to terminate
    """
    kill_process_tree(process.pid)

    lock_socket = process_socket_map.pop(process, None)
    if lock_socket is not None:
        release_port(lock_socket)


def wait_for_server(
    base_url: str,
    process: subprocess.Popen[str],
    full_command: Optional[list[str]] = None,
    env: Optional[dict[str, str]] = None,
    timeout: Optional[int] = None,
    api_key: Optional[str] = None,
) -> None:
    """
    Wait for the server to be ready by polling the /v1/models endpoint.

    Args:
        base_url: The base URL of the server
        process: The subprocess running the server
        full_command: The full command used to launch the server
        env: The environment variables to use for the request
        timeout: Maximum time to wait in seconds. None means wait forever.
        api_key: The API key to use for the request
    """
    logger.info(f"Waiting for server at {base_url} to become ready...")
    start_time = time.time()
    debug_advice = "Try rerunning with '--log-level debug' to see the full traceback."
    if full_command:
        debug_advice += " Alternatively, you can run the following launch command manually to see the full traceback:\n\n"
        if env:
            debug_advice += " ".join([f"{k}={v}" for k, v in env.items()]) + " "
        debug_advice += " ".join(full_command) + "\n\n"

    while True:
        # Check for timeout first
        if timeout and time.time() - start_time > timeout:
            error_msg = f"Server did not become ready within timeout period ({timeout} seconds). Try increasing the timeout with '-M timeout=...'. {debug_advice}"
            logger.error(error_msg)
            raise TimeoutError(error_msg)

        # Check if the process is still alive
        if process.poll() is not None:
            exit_code = process.poll()
            error_msg = f"Server process exited unexpectedly with code {exit_code}. {debug_advice}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        try:
            response = httpx.get(
                f"{base_url}/v1/models",
                headers={"Authorization": f"Bearer {api_key or 'None'}"},
                timeout=5.0,  # Short timeout for individual requests
            )
            if response.status_code == 200:
                logger.info("Server is ready.")
                break

            # Log non-200 status but don't treat as hard error yet
            logger.debug(
                f"Server check returned status {response.status_code}, retrying..."
            )
        except httpx.RequestError as e:
            # Log connection errors but don't treat as hard error yet
            logger.debug(f"Server check failed: {e}, retrying...")
            pass  # Request failed (e.g., connection refused), will retry

        # Wait before the next poll attempt
        time.sleep(1)


def start_local_server(
    base_cmd: list[str],
    host: str,
    port: Optional[int] = None,
    api_key: Optional[str] = None,
    server_type: str = "server",
    timeout: Optional[int] = DEFAULT_TIMEOUT,
    server_args: Optional[dict[str, Any]] = None,
    env: Optional[dict[str, str]] = None,
) -> Tuple[str, subprocess.Popen[str], int]:
    """
    Start a server with the given command and handle potential errors.

    Args:
        base_cmd: List of base command arguments
        host: Host to bind to
        port: Port to bind to. If None, a free port is reserved.
        api_key: API key to use for server authentication
        server_type: Type of server being started (for error messages)
        timeout: Maximum time to wait for server to become ready
        server_args: Additional server arguments to pass to the command
        env: Optional environment variables to pass to the subprocess
    Returns:
        Tuple of (base_url, process, port)

    Raises:
        RuntimeError: If server fails to start
    """
    full_command = base_cmd
    server_process = None

    # Initialize environment variables if not provided
    process_env = {} if env is None else env.copy()

    if server_args:
        for key, value in server_args.items():
            # Convert Python style args (underscore) to CLI style (dash)
            cli_key = key.replace("_", "-")
            if isinstance(value, bool):
                if value:
                    full_command.append(f"--{cli_key}")
                else:
                    logger.info(f"Skipping --{cli_key} (set to False)")
            elif value is None:
                full_command.append(f"--{cli_key}")
            else:
                full_command.extend([f"--{cli_key}", str(value)])

    try:
        server_process, found_port, full_command = launch_server_cmd(
            full_command, host=host, port=port, env=process_env
        )
        base_url = f"http://localhost:{found_port}/v1"
        wait_for_server(
            f"http://localhost:{found_port}",
            server_process,
            api_key=api_key,
            timeout=timeout,
            full_command=full_command,
            env=process_env,
        )
        return base_url, server_process, found_port
    except Exception as e:
        # Cleanup any partially started server
        if server_process:
            terminate_process(server_process)

        # Re-raise with more context
        raise RuntimeError(f"Failed to start {server_type} server: {str(e)}") from e


def merge_env_server_args(
    env_var_name: str,
    provided_args: Dict[str, Any],
    logger: logging.Logger,
) -> Dict[str, Any]:
    """
    Load server arguments from an environment variable and merge them with provided arguments.

    Args:
        env_var_name: Name of the environment variable containing JSON server args
        provided_args: Dictionary of server arguments provided by the user
        logger: Logger instance to log messages

    Returns:
        Dictionary of merged server arguments, with provided args taking precedence
    """
    env_server_args = {}
    server_args_json = os.environ.get(env_var_name)

    if server_args_json:
        try:
            env_server_args = json.loads(server_args_json)
            logger.info(
                f"Loaded server args from environment {env_var_name}: {env_server_args}"
            )
        except json.JSONDecodeError:
            logger.warning(
                f"Failed to parse {env_var_name} as JSON: {server_args_json}"
            )

    # Merge environment args with provided args (provided args take precedence)
    return {**env_server_args, **provided_args}


def configure_devices(
    server_args: dict[str, Any], parallel_size_param: str = "tensor_parallel_size"
) -> tuple[dict[str, Any], dict[str, str]]:
    """Configure device settings and return updated server args and environment variables.

    Args:
        server_args: Dictionary of server arguments
        parallel_size_param: Name of parameter to set with device count if not specified

    Returns:
        Tuple of (updated server arguments dict, environment variables dict)
    """
    result = server_args.copy()
    env_vars = {}

    devices = None
    if "device" in result and "devices" in result:
        raise ValueError("Cannot specify both device and devices in server args")
    elif "devices" in result:
        devices = result.pop("devices")
    elif "device" in result:
        devices = result.pop("device")

    if devices is not None:
        # Convert device list to comma-separated string if needed
        if isinstance(devices, list):
            device_str = ",".join(map(str, devices))
        else:
            device_str = str(devices)

        # Add to env_vars instead of setting os.environ directly
        env_vars["CUDA_VISIBLE_DEVICES"] = device_str

        device_count = len(device_str.split(","))

        # Set parallel size parameter if not explicitly provided
        if parallel_size_param not in result:
            result[parallel_size_param] = device_count

    return result, env_vars


def get_machine_ip() -> str | None:
    try:
        # Create a socket to determine the primary network interface IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0)
        # Connect to an external address (doesn't actually send data)
        s.connect(("8.8.8.8", 80))
        ip = str(s.getsockname()[0])
        s.close()
        return ip
    except Exception:
        return None
```

## `_util/logger.py`

```python
import atexit
import os
from logging import (
    INFO,
    NOTSET,
    WARNING,
    FileHandler,
    Formatter,
    Logger,
    LogRecord,
    addLevelName,
    getLevelName,
    getLogger,
)
from pathlib import Path

import rich
from rich.console import ConsoleRenderable
from rich.logging import RichHandler
from rich.text import Text
from typing_extensions import TypedDict, override

from .constants import (
    ALL_LOG_LEVELS,
    DEFAULT_LOG_LEVEL,
    DEFAULT_LOG_LEVEL_TRANSCRIPT,
    HTTP,
    HTTP_LOG_LEVEL,
    PKG_NAME,
    TRACE,
    TRACE_LOG_LEVEL,
)
from .error import PrerequisiteError
from .trace import (
    TraceFormatter,
    compress_trace_log,
    inspect_trace_file,
    rotate_trace_files,
)

TRACE_FILE_NAME = "trace.log"


# log handler that filters messages to stderr and the log file
class LogHandler(RichHandler):
    def __init__(
        self,
        capture_levelno: int,
        display_levelno: int,
        transcript_levelno: int,
        env_prefix: str = "INSPECT",
        trace_dir: Path | None = None,
    ) -> None:
        super().__init__(capture_levelno, console=rich.get_console())
        self.transcript_levelno = transcript_levelno
        self.display_level = display_levelno
        # log into an external file if requested via env var
        file_logger = os.environ.get(f"{env_prefix}_PY_LOGGER_FILE", None)
        self.file_logger = FileHandler(file_logger) if file_logger else None
        if self.file_logger:
            self.file_logger.setFormatter(
                Formatter("%(asctime)s - %(levelname)s - %(message)s")
            )

        # see if the user has a special log level for the file
        file_logger_level = os.environ.get(f"{env_prefix}_PY_LOGGER_LEVEL", "")
        if file_logger_level:
            self.file_logger_level = int(getLevelName(file_logger_level.upper()))
        else:
            self.file_logger_level = 0

        # add a trace file handler
        rotate_trace_files(trace_dir)  # remove oldest if > 10 trace files
        env_trace_file = os.environ.get(f"{env_prefix}_TRACE_FILE", None)
        trace_file = (
            Path(env_trace_file) if env_trace_file else inspect_trace_file(trace_dir)
        )
        self.trace_logger = FileHandler(trace_file)
        self.trace_logger.setFormatter(TraceFormatter())
        atexit.register(compress_trace_log(self.trace_logger))

        # set trace level
        trace_level = os.environ.get(f"{env_prefix}_TRACE_LEVEL", TRACE_LOG_LEVEL)
        self.trace_logger_level = int(getLevelName(trace_level.upper()))

    @override
    def emit(self, record: LogRecord) -> None:
        # write to stderr if we are at or above the threshold
        if record.levelno >= self.display_level and self.display_level != NOTSET:
            super().emit(record)

        # write to file if the log file level matches. if the
        # user hasn't explicitly specified a level then we
        # take the minimum of 'info' and the display level
        if self.file_logger and record.levelno >= (
            self.file_logger_level or min(self.display_level, INFO)
        ):
            self.file_logger.emit(record)

        # write to trace if the trace level matches.
        if self.trace_logger and record.levelno >= self.trace_logger_level:
            self.trace_logger.emit(record)

        # eval log gets transcript level or higher
        if record.levelno >= self.transcript_levelno:
            log_to_transcript(record)

    @override
    def render_message(self, record: LogRecord, message: str) -> ConsoleRenderable:
        return Text.from_ansi(message)


class LogHandlerVar(TypedDict):
    """Mutable container for LogHandler that can be passed by reference."""

    handler: LogHandler | None


# initialize logging
def init_logger(
    log_level: str | None,
    log_level_transcript: str | None = None,
    env_prefix: str = "INSPECT",
    pkg_name: str = PKG_NAME,
    trace_dir: Path | None = None,
    log_handler_var: LogHandlerVar | None = None,
) -> None:
    # provide default log_handler_var (use TypedDict as mutable container)
    if log_handler_var is None:
        log_handler_var = _logHandler

    # backwards compatibility for 'tools'
    if log_level == "sandbox" or log_level == "tools":
        log_level = "trace"

    # register http, trace, and none levels
    addLevelName(HTTP, HTTP_LOG_LEVEL)
    addLevelName(TRACE, TRACE_LOG_LEVEL)

    def validate_level(option: str, level: str) -> None:
        if level not in ALL_LOG_LEVELS:
            log_levels = ", ".join([level.lower() for level in ALL_LOG_LEVELS])
            raise PrerequisiteError(
                f"Invalid {option} '{level.lower()}'. Log level must be one of {log_levels}"
            )

    # resolve default log level
    log_level = (
        log_level
        if log_level
        else os.getenv(f"{env_prefix}_LOG_LEVEL", DEFAULT_LOG_LEVEL)
    ).upper()
    validate_level("log level", log_level)

    # reolve transcript log level
    log_level_transcript = (
        log_level_transcript
        if log_level_transcript
        else os.getenv(
            f"{env_prefix}_LOG_LEVEL_TRANSCRIPT", DEFAULT_LOG_LEVEL_TRANSCRIPT
        )
    ).upper()
    validate_level("log file level", log_level_transcript)

    # convert to integer
    levelno = getLevelName(log_level)
    transcript_levelno = getLevelName(log_level_transcript)

    # set capture level for our logs (we won't actually display/write all of them)
    if levelno != NOTSET:
        capture_level = min(TRACE, levelno, transcript_levelno)
    else:
        capture_level = min(TRACE, transcript_levelno)

    # init logging handler on demand
    if log_handler_var["handler"] is None:
        log_handler = LogHandler(
            capture_levelno=capture_level,
            display_levelno=levelno,
            transcript_levelno=transcript_levelno,
            env_prefix=env_prefix,
            trace_dir=trace_dir,
        )
        log_handler_var["handler"] = log_handler

        if log_level != "NOTSET":
            # set the global log level
            getLogger().setLevel(log_level)
            # httpx currently logs all requests at the INFO level
            # this is a bit aggressive and we already do this at
            # our own HTTP level
            getLogger("httpx").setLevel(WARNING)

        # set the log level for our package and inspect_ai
        def configure_logger(pkg: str) -> None:
            getLogger(pkg).setLevel(capture_level)
            getLogger(pkg).addHandler(log_handler)
            getLogger(pkg).propagate = False

        configure_logger(pkg_name)
        if pkg_name != PKG_NAME:
            configure_logger(PKG_NAME)

        # add our logger to the global handlers
        getLogger().addHandler(log_handler)


_logHandler: LogHandlerVar = {"handler": None}


def log_to_transcript(record: LogRecord) -> None:
    from inspect_ai.event._logger import LoggerEvent, LoggingMessage
    from inspect_ai.log._transcript import transcript

    transcript()._event(LoggerEvent(message=LoggingMessage._from_log_record(record)))


def warn_once(logger: Logger, message: str) -> None:
    if message not in _warned:
        logger.warning(message)
        _warned.append(message)


_warned: list[str] = []
```

## `_util/metadata.py`

```python
from typing import Any, Type, TypeVar

from pydantic import BaseModel, ValidationError

MT = TypeVar("MT", bound=BaseModel)


def metadata_as(metadata: dict[str, Any], metadata_cls: Type[MT]) -> MT:
    # validate that metadata_cls is frozen
    if not metadata_cls.model_config.get("frozen", False):
        raise ValueError(
            f"Metadata model {metadata_cls.__name__} must have frozen=True"
        )

    # filter to only fields in the model
    model_fields = {
        k: v
        for k, v in metadata.items()
        if k in metadata_cls.__pydantic_fields__.keys()
    }

    # parse and return model instance
    try:
        return metadata_cls(**model_fields)
    except ValidationError as ex:
        raise ValueError(f"Could not parse metadata into {metadata_cls.__name__}: {ex}")
```

## `_util/module.py`

```python
from importlib.machinery import SourceFileLoader
from importlib.util import module_from_spec, spec_from_loader
from pathlib import Path
from types import ModuleType
from typing import Callable

from typing_extensions import overload


@overload
def load_module(
    module_path: Path, filter: Callable[[str], bool]
) -> ModuleType | None: ...


@overload
def load_module(module_path: Path, filter: None = None) -> ModuleType: ...


def load_module(
    module_path: Path, filter: Callable[[str], bool] | None = None
) -> ModuleType | None:
    if module_path.suffix == ".py":
        # bail if the code doesn't pass the filter
        with open(module_path, "r", encoding="utf-8") as file:
            if filter and not filter(file.read()):
                return None

        module_name = module_path.as_posix()
        loader = SourceFileLoader(module_name, module_path.absolute().as_posix())
        spec = spec_from_loader(loader.name, loader)
        if not spec:
            raise ModuleNotFoundError(f"Module {module_name} not found")
        module = module_from_spec(spec)
        loader.exec_module(module)
        return module

    elif module_path.suffix == ".ipynb":
        try:
            from inspect_ai._util.notebook import NotebookLoader
        except ImportError:
            return None

        # bail if the code doesn't pass the filter
        def exec_filter(cells: list[str]) -> bool:
            code = "\n\n".join(cells)
            return not filter or filter(code)

        notebook_loader = NotebookLoader(exec_filter)
        return notebook_loader.load_module(module_path.as_posix())

    else:
        raise ModuleNotFoundError(
            f"Invalid extension for task file: {module_path.suffix}"
        )
```

## `_util/notebook.py`

```python
import io
import sys
import types
from pathlib import Path
from typing import Callable

from IPython import get_ipython  # type: ignore
from IPython.core.interactiveshell import InteractiveShell
from nbformat import NBFormatError, ValidationError, read
from nbformat.reader import NotJSONError

# from https://jupyter-notebook.readthedocs.io/en/stable/examples/Notebook/Importing%20Notebooks.html


class NotebookLoader(object):
    """Module Loader for Jupyter Notebooks"""

    def __init__(self, exec_filter: Callable[[list[str]], bool] | None = None) -> None:
        self.shell = InteractiveShell.instance()
        self.exec_filter = exec_filter

    def load_module(self, fullname: str) -> types.ModuleType:
        # load the notebook object
        with io.open(fullname, "r", encoding="utf-8") as f:
            nb = read(f, 4)  # type: ignore

        # create the module and add it to sys.modules
        # if name in sys.modules:
        #    return sys.modules[name]
        mod = types.ModuleType(fullname)
        mod.__file__ = fullname
        mod.__loader__ = self
        mod.__dict__["get_ipython"] = get_ipython
        sys.modules[fullname] = mod

        # extra work to ensure that magics that would affect the user_ns
        # actually affect the notebook module's ns
        save_user_ns = self.shell.user_ns
        self.shell.user_ns = mod.__dict__

        try:
            # get source code for all the calls
            cells_code: list[str] = []
            for cell in nb.cells:
                # transform the input to executable Python for each cell
                if cell.cell_type == "code":
                    code = self.shell.input_transformer_manager.transform_cell(
                        cell.source
                    )
                    cells_code.append(code)

            # check the exec filter to make sure we should execute the
            # notebook cells, if not just return an empty module
            if self.exec_filter and not self.exec_filter(cells_code):
                del sys.modules[fullname]
                return mod

            # run the code in each cell
            for code in cells_code:
                exec(code, mod.__dict__)

            return mod
        finally:
            self.shell.user_ns = save_user_ns


def read_notebook_code(path: Path) -> str:
    try:
        # load the notebook object
        with io.open(path, "r", encoding="utf-8") as f:
            nb = read(f, 4)  # type: ignore
    except NotJSONError:
        return ""
    except ValidationError:
        return ""
    except NBFormatError:
        return ""

    # for dealing w/ magics
    shell = InteractiveShell.instance()

    # get the code
    lines: list[str] = []
    for cell in nb.cells:
        # transform the input to executable Python for each cell
        if cell.cell_type == "code":
            code = shell.input_transformer_manager.transform_cell(cell.source)
            lines.append(code)
    return "\n".join(lines)
```

## `_util/notgiven.py`

```python
# Sentinel class used until PEP 0661 is accepted
from typing import Any, Literal

from typing_extensions import override


class NotGiven:
    """A sentinel singleton class used to distinguish omitted keyword arguments from those passed in with the value None (which may have different behavior)."""

    def __bool__(self) -> Literal[False]:
        return False

    @override
    def __repr__(self) -> str:
        return "NOT_GIVEN"


def _is_notgiven(value: Any) -> bool:
    return isinstance(value, NotGiven) or type(value).__name__ == "NotGiven"


def sanitize_notgiven(value: Any) -> Any:
    if _is_notgiven(value):
        return None
    if isinstance(value, dict):
        return {
            k: sanitize_notgiven(v)
            for k, v in value.items()  # pyright: ignore[reportUnknownVariableType]
            if not _is_notgiven(v)
        }
    if isinstance(value, list | tuple | set):
        return type(value)(  # pyright: ignore[reportUnknownArgumentType,reportUnknownVariableType]
            [
                sanitize_notgiven(v)
                for v in value  # pyright: ignore[reportUnknownVariableType]
                if not _is_notgiven(v)
            ]
        )

    return value


NOT_GIVEN = NotGiven()
```

## `_util/package.py`

```python
import importlib.util
import inspect
import json
import site
import sys
from functools import lru_cache
from importlib.metadata import Distribution, PackageNotFoundError
from typing import Any, Literal

from pydantic import BaseModel, Field


def get_installed_package_name(obj: Any) -> str | None:
    # special handling for built-in functions
    if inspect.isbuiltin(obj):
        # try to get the module name
        if getattr(obj, "__module__") is not None:
            module_name = obj.__module__
            if module_name:
                return module_name.split(".")[0]

        # try to get the class that defines this method
        if hasattr(obj, "__objclass__"):
            cls = obj.__objclass__
        elif hasattr(obj, "__self__"):
            cls = type(obj.__self__)
        else:
            return None

        for base_cls in inspect.getmro(cls):
            module = inspect.getmodule(base_cls)
            if module:
                return module.__name__.split(".")[0]

    # get the module of the object
    module = inspect.getmodule(obj)
    if module is None:
        return None

    # find the origin (install path) for the module
    module_name = module.__name__
    try:
        spec = importlib.util.find_spec(module_name)
    except Exception:
        return None
    if spec is None or spec.origin is None:
        return None

    # check if this is a package (either in library or installed editable)
    package_name = module_name.split(".")[0]
    if package_path_is_in_site_packages(spec.origin):
        return package_name
    if package_is_installed_editable(package_name):
        return package_name
    else:
        return None


@lru_cache(maxsize=None)
def package_path_is_in_site_packages(path: str) -> bool:
    path = path.lower()
    return (
        any(path.startswith(p.lower()) for p in site.getsitepackages())
        or path.startswith(site.getusersitepackages().lower())
        or any(
            "site-packages" in p.lower() and path.startswith(p.lower())
            for p in sys.path
        )
    )


class VcsInfo(BaseModel):
    vcs: Literal["git", "hg", "bzr", "svn"]
    commit_id: str
    requested_revision: str | None = None
    resolved_revision: str | None = None


class ArchiveInfo(BaseModel):
    hash: str | None = None  # Deprecated format: "<algorithm>=<hash>"
    hashes: dict[str, str] | None = None  # New format: {"sha256": "<hex>"}


class DirInfo(BaseModel):
    editable: bool = Field(default=False)  # Default: False


class DirectUrl(BaseModel):
    url: str
    vcs_info: VcsInfo | None = None
    archive_info: ArchiveInfo | None = None
    dir_info: DirInfo | None = None
    subdirectory: str | None = None


@lru_cache(maxsize=None)
def get_package_direct_url(package: str) -> DirectUrl | None:
    """Retrieve the PEP 610 direct_url.json

    `direct_url.json` is a metadata file created by pip (and other Python package
    installers) in the .dist-info directory of installed packages. It's defined by
    PEP 610 and records how a package was installed when it came from a direct URL
    source rather than PyPI.

    When is it created?

    This file is created when installing packages via:
    - Git URLs: pip install git+https://github.com/user/repo.git
    - Local directories: pip install /path/to/package
    - Editable installs: pip install -e /path/to/package or pip install -e git+...
    - Direct archive URLs: pip install https://example.com/package.tar.gz
    """
    try:
        distribution = Distribution.from_name(package)
    except (ValueError, PackageNotFoundError):
        return None

    if (json_text := distribution.read_text("direct_url.json")) is None:
        return None

    try:
        return DirectUrl.model_validate_json(json_text)
    except (json.JSONDecodeError, ValueError):
        return None


def package_is_installed_editable(package: str) -> bool:
    return (
        (direct_url := get_package_direct_url(package)) is not None
        and direct_url.dir_info is not None
        and direct_url.dir_info.editable
    )
```

## `_util/path.py`

```python
import os
import sys
from collections import deque
from contextlib import AbstractContextManager, contextmanager
from copy import deepcopy
from pathlib import PurePath
from typing import Any, Iterator, overload

from fsspec.implementations.local import LocalFileSystem  # type: ignore

from inspect_ai._util.file import filesystem


@contextmanager
def add_to_path(p: str) -> Iterator[None]:
    old_path = sys.path
    sys.path = sys.path[:]
    sys.path.insert(0, p)
    try:
        yield
    finally:
        sys.path = old_path


# NOTE: this code is adapted from
# https://github.com/python/cpython/blob/b3722ca058f6a6d6505cf2ea9ffabaf7fb6b6e19/Lib/contextlib.py#L767-L779)
class chdir(AbstractContextManager[None]):
    """Non thread-safe context manager to change the working directory.

    Changes the current working directory
    """

    def __init__(self, path: str):
        self.path = path
        self._old_cwd: list[str] = []

    def __enter__(self) -> None:
        self._old_cwd.append(os.getcwd())
        os.chdir(self.path)

    def __exit__(self, *excinfo: Any) -> None:
        os.chdir(self._old_cwd.pop())


class add_to_syspath(AbstractContextManager[None]):
    """Non thread-safe context manager to add to the python syspath."""

    def __init__(self, path: str):
        self.path = path
        self._old_sys_path: list[list[str]] = []

    def __enter__(self) -> None:
        self._old_sys_path.append(deepcopy(sys.path))
        sys.path.append(self.path)

    def __exit__(self, *excinfo: Any) -> None:
        sys.path = self._old_sys_path.pop()


class chdir_python(AbstractContextManager[None]):
    """Non thread-safe context manager to change the runtime Python directory.

    Changes the current working directory and adds the directory to
    the Python sys.path (so local module references resolve correctly).
    """

    def __init__(self, path: str):
        self.path = path
        self._old_sys_path: list[list[str]] = []
        self._old_cwd: list[str] = []

    def __enter__(self) -> None:
        self._old_cwd.append(os.getcwd())
        self._old_sys_path.append(deepcopy(sys.path))
        os.chdir(self.path)
        sys.path.append(self.path)

    def __exit__(self, *excinfo: Any) -> None:
        os.chdir(self._old_cwd.pop())
        sys.path = self._old_sys_path.pop()


@overload
def cwd_relative_path(file: str, walk_up: bool = False) -> str: ...


@overload
def cwd_relative_path(file: None, walk_up: bool = False) -> None: ...


def cwd_relative_path(file: str | None, walk_up: bool = False) -> str | None:
    if file:
        cwd = PurePath(os.getcwd())
        task_path = PurePath(file)
        if task_path.is_relative_to(cwd):
            return task_path.relative_to(cwd).as_posix()
        elif walk_up:
            return relative_walk(cwd, task_path)
        else:
            return file
    else:
        return None


def pretty_path(file: str) -> str:
    fs = filesystem(file)
    if fs.is_local():
        file = LocalFileSystem._strip_protocol(file)
        return cwd_relative_path(file)
    else:
        return file


def native_path(file: str) -> str:
    fs = filesystem(file)
    if fs.is_local():
        file = LocalFileSystem._strip_protocol(file)
        return file
    else:
        return file


# A slightly modified implementation of task_path.relative(d, walk_up=True)
# since that wasn't introduced until python 3.12
def relative_walk(from_path: PurePath, to_path: PurePath) -> str:
    if from_path.anchor != to_path.anchor:
        raise ValueError(
            f"{str(from_path)!r} and {str(to_path)!r} have different anchors"
        )

    from_parts = deque(from_path.parts)
    to_parts = deque(to_path.parts)

    while from_parts and to_parts and from_parts[0] == to_parts[0]:
        from_parts.popleft()
        to_parts.popleft()

    # Process the remaining segments in the base_parts
    relative_parts: list[str] = []
    for part in from_parts:
        if not part or part == ".":
            pass
        elif part == "..":
            raise ValueError(f"'..' segment in {str(from_path)!r} cannot be walked")
        else:
            relative_parts.append("..")

    # Add the remaining parts of other_parts
    relative_parts.extend(to_parts)
    return str(PurePath(*relative_parts))
```

## `_util/pattern.py`

```python
ANSWER_PATTERN_LETTER = r"(?i)ANSWER\s*:\s*([A-Za-z])(?:[^\w]|\n|$)"
ANSWER_PATTERN_WORD = r"(?i)ANSWER\s*:\s*(\w+)(?:\n|$)"
ANSWER_PATTERN_LINE = r"(?i)ANSWER\s*:\s*([^\n]+)\s*\Z"
```

## `_util/platform.py`

```python
import importlib.util
import os

from inspect_ai._util._async import init_nest_asyncio

from .error import set_exception_hook


def running_in_notebook() -> bool:
    try:
        from IPython import get_ipython  # type: ignore

        if "IPKernelApp" not in get_ipython().config:  # type: ignore
            return False
    except ImportError:
        return False
    except AttributeError:
        return False
    return True


def platform_init(hooks: bool = True) -> None:
    if hooks:
        from inspect_ai.hooks._startup import init_hooks

        init_hooks()

    # set exception hook if we haven't already
    set_exception_hook()

    # if we are running in a notebook...
    if running_in_notebook():
        # check for required packages
        if not have_package("ipywidgets"):
            raise ModuleNotFoundError(
                "To using inspect_ai within a notebook, please install ipywidgets with:\n\n"
                + "pip install ipywidgets\n"
            )

        # setup nested asyncio
        init_nest_asyncio()


def have_package(package: str) -> bool:
    return importlib.util.find_spec(package) is not None


def is_running_in_jupyterlab() -> bool:
    return os.getenv("JPY_SESSION_NAME", None) is not None


def is_running_in_vscode() -> bool:
    # Check if running in VS Code Jupyter notebook or interactive window
    if (
        os.getenv("VSCODE_IPYTHON_KERNEL") is not None
        or os.getenv("VSCODE_CLI_REQUIRE_TOKEN") is not None
        or os.getenv("VSCODE_PID") is not None
        or os.getenv("VSCODE_CWD") is not None
    ):
        return True
    # Check if running in a VS Code terminal
    if os.getenv("TERM_PROGRAM") == "vscode":
        return True

    # If none of the conditions are met, we assume it's not running in VS Code
    return False


def is_windows() -> bool:
    return os.name == "nt"
```

## `_util/port_names.py`

```python
from typing import Literal


def get_service_by_port(port: int, protocol: Literal["tcp", "udp"]) -> str | None:
    """
    Returns the likely service running on a given port number.

    Args:
        port (int): The port number to look up
        protocol (str): Either 'tcp' or 'udp'

    Returns:
        str: Description of the likely service, or None if not found
    """
    # Common port mappings based on IANA assignments and common usage
    port_mappings = {
        "tcp": {
            20: "FTP (Data)",
            21: "FTP (Control)",
            22: "SSH",
            23: "Telnet",
            25: "SMTP",
            53: "DNS",
            80: "HTTP",
            110: "POP3",
            143: "IMAP",
            443: "HTTPS",
            445: "Microsoft-DS (SMB)",
            587: "SMTP (Submission)",
            993: "IMAPS",
            995: "POP3S",
            1433: "Microsoft SQL Server",
            1521: "Oracle Database",
            3306: "MySQL",
            3389: "RDP (Remote Desktop)",
            5432: "PostgreSQL",
            5900: "VNC",
            5901: "VNC Display :1",
            5902: "VNC Display :2",
            6080: "noVNC",
            8080: "HTTP Alternate",
            8443: "HTTPS Alternate",
            27017: "MongoDB",
            27018: "MongoDB Shard",
            27019: "MongoDB Config Server",
        },
        "udp": {
            53: "DNS",
            67: "DHCP Server",
            68: "DHCP Client",
            69: "TFTP",
            123: "NTP",
            161: "SNMP",
            162: "SNMP Trap",
            514: "Syslog",
            1194: "OpenVPN",
            5353: "mDNS",
        },
    }

    return port_mappings.get(protocol, {}).get(port, None)
```

## `_util/registry.py`

```python
from __future__ import annotations

import inspect
from inspect import get_annotations, isclass
from typing import (
    TYPE_CHECKING,
    Any,
    Callable,
    Literal,
    TypeGuard,
    cast,
    overload,
)

from pydantic import BaseModel, Field
from pydantic_core import to_jsonable_python
from typing_extensions import TypedDict

from inspect_ai._util.json import jsonable_python
from inspect_ai._util.package import get_installed_package_name

from .constants import PKG_NAME
from .entrypoints import ensure_entry_points

if TYPE_CHECKING:
    from inspect_ai import Task
    from inspect_ai.agent import Agent
    from inspect_ai.approval import Approver
    from inspect_ai.hooks._hooks import Hooks
    from inspect_ai.model import ModelAPI
    from inspect_ai.scorer import Metric, Scorer, ScoreReducer
    from inspect_ai.solver import Plan, Solver
    from inspect_ai.tool import Tool
    from inspect_ai.util import SandboxEnvironment

obj_type = type

RegistryType = Literal[
    "agent",
    "approver",
    "hooks",
    "metric",
    "modelapi",
    "plan",
    "sandboxenv",
    "score_reducer",
    "scorer",
    "solver",
    "task",
    "tool",
    "loader",
    "scanner",
    "scanjob",
]
"""Enumeration of registry object types.

These are the types of objects in this system that can be
registered using a decorator (e.g. `@task`, `@solver`).
Registered objects can in turn be created dynamically using
the `registry_create()` function.
"""


class RegistryInfo(BaseModel):
    """Registry information for registered object (e.g. solver, scorer, etc.)."""

    type: RegistryType
    """Type of registry object."""

    name: str
    """Registered name."""

    metadata: dict[str, Any] = Field(default_factory=dict)
    """Additional registry metadata."""


def registry_add(o: object, info: RegistryInfo) -> None:
    r"""Add an object to the registry.

    Add the passed object to the registry using the RegistryInfo
    to index it for retrieval. The RegistryInfo is also added
    to the object as an attribute, which can retrieved by calling
    registry_info() on an object instance.

    Args:
        o (object): Object to be registered (Metric, Solver, etc.)
        info (RegistryInfo): Metadata (name, etc.) for object.
    """
    # tag the object
    setattr(o, REGISTRY_INFO, info)

    # add to registry
    _registry[registry_key(info.type, info.name)] = o


def registry_tag(
    type: Callable[..., Any],
    o: object,
    info: RegistryInfo,
    *args: Any,
    **kwargs: Any,
) -> None:
    r"""Tag an object w/ registry info.

    Tag the passed object with RegistryInfo. This function DOES NOT
    add the object to the registry (call registry_add() to both
    tag and add an object to the registry). Call registry_info()
    on a tagged/registered object to retrieve its info

    Args:
        type (T): type of object being tagged
        o (object): Object to be registered (Metric, Solver, etc.)
        info (RegistryInfo): Metadata (name, etc.) for object.
        *args (list[Any]): Creation arguments
        **kwargs (dict[str,Any]): Creation keyword arguments
    """
    # bind arguments to params
    named_params = extract_named_params(type, False, *args, **kwargs)

    # set attribute
    setattr(o, REGISTRY_INFO, info)
    setattr(o, REGISTRY_PARAMS, named_params)


def extract_named_params(
    type: Callable[..., Any], apply_defaults: bool, *args: Any, **kwargs: Any
) -> dict[str, Any]:
    # bind arguments to params
    named_params: dict[str, Any] = {}

    if apply_defaults:
        bound_params = inspect.signature(type).bind_partial(*args, **kwargs)
        bound_params.apply_defaults()
    else:
        bound_params = inspect.signature(type).bind(*args, **kwargs)

    for param, value in bound_params.arguments.items():
        named_params[param] = registry_value(value)

    # callables are not serializable so use their names
    for param in named_params.keys():
        if is_registry_object(named_params[param]):
            named_params[param] = registry_info(named_params[param]).name
        elif callable(named_params[param]) and hasattr(named_params[param], "__name__"):
            named_params[param] = getattr(named_params[param], "__name__")
        elif isinstance(named_params[param], dict | list | BaseModel):
            named_params[param] = to_jsonable_python(
                named_params[param], fallback=lambda x: getattr(x, "__name__", None)
            )
        elif isinstance(named_params[param], str | int | float | str | bool | None):
            named_params[param] = named_params[param]
        else:
            named_params[param] = (
                getattr(named_params[param], "name", None)
                or getattr(named_params[param], "__name__", None)
                or getattr(obj_type(named_params[param]), "__name__", None)
                or "<unknown>"
            )

    return named_params


def registry_name(o: object, name: str) -> str:
    r"""Compute the registry name of an object.

    This function checks whether the passed object is in a package,
    and if it is, prepends the package name as a namespace
    """
    package = get_installed_package_name(o)
    return f"{package}/{name}" if package else name


def registry_lookup(type: RegistryType, name: str) -> object | None:
    r"""Lookup an object in the registry by type and name.

    Objects that defined in inspect extension packages (i.e. not
    directly within the core inspect_ai package) must be namespaced
    (e.g. "fancy_prompts/jailbreaker")

    Args:
        type: Type of object to find
        name: Name of object to find

    Returns:
        Object or None if not found.
    """

    def _lookup() -> object | None:
        # first try
        object = _registry.get(registry_key(type, name))
        if object:
            return object
        # unnamespaced objects can also be found in inspect_ai
        elif name.find("/") == -1:
            return _registry.get(registry_key(type, f"{PKG_NAME}/{name}"))
        else:
            return None

    o = _lookup()

    # try to recover
    if o is None:
        # load entry points for this package as required
        if name.find("/") != -1 and name.find(".") == -1:
            package = name.split("/")[0]
            ensure_entry_points(package)

        return _lookup()
    else:
        return o


def registry_package_name(name: str) -> str | None:
    if name.find("/") != -1 and name.find(".") == -1:
        return name.split("/")[0]
    else:
        return None


def registry_find(predicate: Callable[[RegistryInfo], bool]) -> list[object]:
    r"""Find objects in the registry that match the passed predicate.

    Args:
        predicate (Callable[[RegistryInfo], bool]): Predicate to find

    Returns:
        List of registry objects found
    """

    def _find() -> list[object]:
        return [
            object for object in _registry.values() if predicate(registry_info(object))
        ]

    o = _find()
    if len(o) == 0:
        ensure_entry_points()
        return _find()
    else:
        return o


@overload
def registry_create(type: Literal["agent"], name: str, **kwargs: Any) -> Agent: ...


@overload
def registry_create(
    type: Literal["approver"], name: str, **kwargs: Any
) -> Approver: ...


@overload
def registry_create(type: Literal["hooks"], name: str, **kwargs: Any) -> Hooks: ...


@overload
def registry_create(type: Literal["metric"], name: str, **kwargs: Any) -> Metric: ...


@overload
def registry_create(
    type: Literal["modelapi"], name: str, **kwargs: Any
) -> ModelAPI: ...


@overload
def registry_create(type: Literal["plan"], name: str, **kwargs: Any) -> Plan: ...


@overload
def registry_create(
    type: Literal["sandboxenv"], name: str, **kwargs: Any
) -> SandboxEnvironment: ...


@overload
def registry_create(type: Literal["scorer"], name: str, **kwargs: Any) -> Scorer: ...


@overload
def registry_create(
    type: Literal["score_reducer"], name: str, **kwargs: Any
) -> ScoreReducer: ...


@overload
def registry_create(type: Literal["solver"], name: str, **kwargs: Any) -> Solver: ...


@overload
def registry_create(type: Literal["task"], name: str, **kwargs: Any) -> Task: ...


@overload
def registry_create(type: Literal["tool"], name: str, **kwargs: Any) -> Tool: ...


@overload
def registry_create(type: Literal["loader"], name: str, **kwargs: Any) -> Any: ...


@overload
def registry_create(type: Literal["scanner"], name: str, **kwargs: Any) -> Any: ...


@overload
def registry_create(type: Literal["scanjob"], name: str, **kwargs: Any) -> Any: ...


def registry_create(type: RegistryType, name: str, **kwargs: Any) -> object:  # type: ignore[return]
    r"""Create a registry object.

    Creates objects registered via decorator (e.g. `@task`, `@solver`). Note
    that this can also create registered objects within Python packages, in
    which case the name of the package should be used a prefix, e.g.

    ```python
    registry_create("scorer", "mypackage/myscorer", ...)
    ```

    Object within the Inspect package do not require a prefix, nor do
    objects from imported modules that aren't in a package.

    Args:
        type: Type of registry object to create
        name: Name of registry object to create
        **kwargs: Optional creation arguments

    Returns:
        Instance of specified name and type.

    Raises:
        LookupError: If the named object was not found in the registry.
        TypeError: If the specified parameters are not valid for the object.
    """
    # lookup the object
    obj = registry_lookup(type, name)

    # forward registry info to the instantiated object
    def with_registry_info(o: object) -> object:
        return set_registry_info(o, registry_info(obj))

    # instantiate registry and model objects
    kwargs = registry_kwargs(**kwargs)

    if isclass(obj):
        return with_registry_info(obj(**kwargs))
    elif callable(obj):
        return_type = get_annotations(obj, eval_str=True).get("return")
        # Until we remove the MetricDeprecated symbol we need this extra
        # bit to map the Metric union back to Metric
        if "_metric.Metric" in str(return_type):
            return_type = "Metric"
        else:
            return_type = getattr(return_type, "__name__", None)
        if return_type and return_type.lower() == type:
            return with_registry_info(obj(**kwargs))
        else:
            return obj
    else:
        raise LookupError(f"{name} was not found in the registry")


def registry_info(o: object) -> RegistryInfo:
    r"""Lookup RegistryInfo for an object.

    Args:
        o (object): Object to lookup info for

    Returns:
        RegistryInfo for object.

    Raises:
        ValueError: If the object does not have registry info.
    """
    info = getattr(o, REGISTRY_INFO, None)
    if info is not None:
        return cast(RegistryInfo, info)
    else:
        name = getattr(o, "__name__", "unknown")
        decorator = " @solver " if name == "solve" else " "
        raise ValueError(
            f"Object '{name}' does not have registry info. Did you forget to add a{decorator}decorator somewhere?"
        )


def registry_params(o: object) -> dict[str, Any]:
    r"""Lookup parameters used to instantiate a registry object.

    Args:
        o (object): Object to lookup info for

    Returns:
        Dictionary of parameters used to instantiate object.
    """
    params = getattr(o, REGISTRY_PARAMS, None)
    if params is not None:
        return cast(dict[str, Any], params)
    else:
        raise ValueError("Object does not have registry info")


def registry_log_name(o: str | object) -> str:
    r"""Name of object for logging.

    Registry objects defined by the inspect_ai package have their
    prefix stripped when written to the log (they in turn can also
    be created/referenced without the prefix).

    Args:
        o (str | object): Name or object to get name for

    Returns:
        Name of object for logging.
    """
    name = o if isinstance(o, str) else registry_info(o).name
    return name.replace(f"{PKG_NAME}/", "", 1)


def registry_unqualified_name(o: str | object | RegistryInfo) -> str:
    r"""Unqualified name of object (i.e. without package prefix).

    Args:
        o (str | object | RegistryInfo): string, registry object, or RegistryInfo to get unqualified name for.

    Returns:
        Unqualified name of object
    """
    if isinstance(o, str):
        name = o
    else:
        info = o if isinstance(o, RegistryInfo) else registry_info(o)
        name = info.name
    parts = name.split("/")
    if len(parts) == 1:
        return parts[0]
    else:
        return "/".join(parts[1:])


def is_registry_object(o: object, type: RegistryType | None = None) -> bool:
    r"""Check if an object is a registry object.

    Args:
        o (object): Object to lookup info for
        type: (RegistryType | None): Optional. Check for a specific type

    Returns:
        True if the object is a registry object (optionally of the specified
        type). Otherwise, False
    """
    info = getattr(o, REGISTRY_INFO, None)
    if info:
        reg_info = cast(RegistryInfo, info)
        if type:
            return reg_info.type == type
        else:
            return True
    else:
        return False


def set_registry_info(o: object, info: RegistryInfo) -> object:
    r"""Set the RegistryInfo for an object.

    Args:
        o (object): Object to set the registry info for
        info: (object): Registry info

    Returns:
        Passed object, with RegistryInfo attached
    """
    setattr(o, REGISTRY_INFO, info)
    return o


def set_registry_params(o: object, params: dict[str, Any]) -> object:
    r"""Set the registry params for an object.

    Args:
        o (object): Object to set the registry params for
        params: (dict[str, Any]): Registry params

    Returns:
        Passed object, with registry params attached
    """
    setattr(o, REGISTRY_PARAMS, params)
    return o


def has_registry_params(o: object) -> bool:
    r"""Check if the object has registry params.

    Args:
        o (object): Object to check.

    Returns:
        True if the object has registry params, else False.
    """
    return is_registry_object(o) and hasattr(o, REGISTRY_PARAMS)


def registry_key(type: RegistryType, name: str) -> str:
    return f"{type}:{name}"


REGISTRY_INFO = "__registry_info__"
REGISTRY_PARAMS = "__registry_params__"
_registry: dict[str, object] = {}


class RegistryDict(TypedDict):
    type: RegistryType
    name: str
    params: dict[str, Any]


def is_registry_dict(o: object) -> TypeGuard[RegistryDict]:
    return isinstance(o, dict) and "type" in o and "name" in o and "params" in o


def registry_value(o: object) -> Any:
    from inspect_ai.model._model import Model

    # treat tuple as list
    if isinstance(o, tuple):
        o = list(o)

    # recurse through collection types
    if isinstance(o, list):
        return [registry_value(x) for x in o]
    elif isinstance(o, dict):
        return {k: registry_value(v) for k, v in o.items()}
    elif has_registry_params(o):
        return RegistryDict(
            type=registry_info(o).type,
            name=registry_log_name(o),
            params=registry_params(o),
        )
    elif isinstance(o, Model):
        return ModelDict(
            model=str(o),
            config=jsonable_python(o.config),
            base_url=o.api.base_url,
            model_args=o.model_args,
        )
    else:
        return o


def registry_arg(arg: Any) -> Any:
    if isinstance(arg, dict):
        if is_registry_dict(arg):
            return registry_create(arg["type"], arg["name"], **arg["params"])
        elif is_model_dict(arg):
            return model_create_from_dict(arg)
        else:
            return {k: registry_arg(v) for k, v in arg.items()}
    elif isinstance(arg, (list, tuple)):
        return [registry_arg(item) for item in arg]
    else:
        return arg


# resolve embedded registry objects and models
def registry_kwargs(**kwargs: Any) -> dict[str, Any]:
    """Resolve any registry and model dicts in the given kwargs."""
    return {k: registry_arg(v) for k, v in kwargs.items()}


def registry_create_from_dict(d: RegistryDict) -> object:
    return registry_create(d["type"], d["name"], **d["params"])


class ModelDict(TypedDict):
    model: str
    config: dict[str, Any]
    base_url: str | None
    model_args: dict[str, Any]


def is_model_dict(o: object) -> TypeGuard[ModelDict]:
    return (
        isinstance(o, dict)
        and "model" in o
        and "config" in o
        and "base_url" in o
        and "model_args" in o
    )


def model_create_from_dict(d: ModelDict) -> object:
    from inspect_ai.model._generate_config import GenerateConfig
    from inspect_ai.model._model import get_model

    return get_model(
        d["model"],
        config=GenerateConfig(**d["config"]),
        base_url=d["base_url"],
        **d["model_args"],
    )
```

## `_util/retry.py`

```python
_http_retries_count: int = 0


def report_http_retry() -> None:
    from inspect_ai.log._samples import report_active_sample_retry

    # bump global counter
    global _http_retries_count
    _http_retries_count = _http_retries_count + 1

    # report sample retry
    report_active_sample_retry()


def http_retries_count() -> int:
    return _http_retries_count
```

## `_util/rich.py`

```python
import asyncio
import os
import sys
import traceback
import unicodedata
from types import TracebackType
from typing import Any, Tuple, Type

import click
import tenacity
from rich.console import Console, RenderableType
from rich.style import Style
from rich.text import Text
from rich.traceback import Traceback

from inspect_ai._util.constants import CONSOLE_DISPLAY_WIDTH, PKG_NAME
from inspect_ai._util.text import truncate_lines


def tool_result_display(
    text: str, max_lines: int = 100, style: str | Style = ""
) -> list[RenderableType]:
    return lines_display(
        clean_control_characters(text), max_lines=max_lines, style=style
    )


def lines_display(
    text: str, max_lines: int = 100, style: str | Style = ""
) -> list[RenderableType]:
    lines, truncated = truncate_lines(text, max_lines)

    content: list[RenderableType] = [Text(lines, style=style)]
    if truncated is not None:
        content.append(Text())
        content.append(
            Text.from_markup(
                f"[italic]Output truncated ({truncated} additional lines)...[/italic]",
                style=style,
            )
        )

    return content


# clean control characters sent by untrusted sources (e.g. tool output)
# which can trigger rich text measurement bugs
def clean_control_characters(text: str) -> str:
    return "".join(
        c for c in text if c in "\n\t" or unicodedata.category(c) not in ("Cc", "Cf")
    )


def rich_traceback(
    exc_type: Type[Any], exc_value: BaseException, exc_traceback: TracebackType | None
) -> RenderableType:
    rich_tb = Traceback.from_exception(
        exc_type=exc_type,
        exc_value=exc_value,
        traceback=exc_traceback,
        suppress=[click, asyncio, tenacity, sys.modules[PKG_NAME]],
        show_locals=os.environ.get("INSPECT_TRACEBACK_LOCALS", None) == "1",
        width=CONSOLE_DISPLAY_WIDTH,
    )
    return rich_tb


def truncate_traceback(
    exc_type: Type[Any],
    exc_value: BaseException,
    exc_traceback: TracebackType | None,
    max_length: int = 1048576,  # 1MB
) -> Tuple[str, bool]:
    tb_list = traceback.format_exception(exc_type, exc_value, exc_traceback)

    # Keep the front and back of the traceback
    header = tb_list[0]
    error_msg = tb_list[-1]

    # Join the middle parts (stack frames)
    frames = "".join(tb_list[1:-1])

    # It all fits, use it as is
    full_tb = header + frames + error_msg
    if len(full_tb) <= max_length:
        return full_tb, False

    ellipsis = "\n...\n"

    # Minimum header size
    header_size = min(len(header), 1024)

    # Minimum frames size
    frames_size = min(len(frames), 1024)

    # Remaining space for error message
    error_msg_size = max(0, max_length - header_size - frames_size)

    def truncate_middle(text: str, size: int) -> str:
        if len(text) <= size:
            return text
        half = (size - len(ellipsis)) // 2
        return f"{text[:half]}{ellipsis}{text[-half:]}"

    # Truncate each part as needed
    truncated_header = truncate_middle(header, header_size)
    truncated_frames = truncate_middle(frames, frames_size)
    truncated_error = truncate_middle(error_msg, error_msg_size)

    return truncated_header + truncated_frames + truncated_error, True


def format_traceback(
    exc_type: Type[BaseException],
    exc_value: BaseException,
    exc_traceback: TracebackType | None,
) -> tuple[str, str]:
    """Format exception traceback as plain text and ANSI-colored."""
    traceback_text, truncated = truncate_traceback(exc_type, exc_value, exc_traceback)

    if not truncated:
        with open(os.devnull, "w") as f:
            console = Console(record=True, file=f, legacy_windows=True)
            console.print(rich_traceback(exc_type, exc_value, exc_traceback))
            traceback_ansi = console.export_text(styles=True)
    else:
        traceback_ansi = traceback_text

    return traceback_text, traceback_ansi
```

## `_util/samples.py`

```python
def parse_samples_limit(limit: str | None) -> int | tuple[int, int] | None:
    if limit is not None:
        if "-" not in limit:
            return int(limit)
        else:
            limit_split = [int(r) for r in limit.split("-")]
            return (limit_split[0] - 1, limit_split[1])
    else:
        return None


def parse_sample_id(sample_id: str | None) -> list[str] | None:
    if sample_id is not None:
        return [id.strip() for id in sample_id.split(",")]
    else:
        return None
```

## `_util/task.py`

```python
from inspect_ai._util.registry import registry_unqualified_name


def task_display_name(task_name: str) -> str:
    if task_name.startswith("hf/"):
        return task_name
    else:
        return registry_unqualified_name(task_name)
```

## `_util/terminal.py`

```python
import functools
import re
import select
import sys
from dataclasses import dataclass
from logging import getLogger
from typing import Any

logger = getLogger(__name__)


@dataclass
class RGB:
    r: int
    g: int
    b: int


@dataclass
class TerminalBackground:
    color: RGB
    brightness: float
    dark: bool


@functools.cache
def detect_terminal_background(
    default_color: RGB = RGB(0, 0, 0),
) -> TerminalBackground:
    """Query the terminal background color using OSC escape sequence.

    Based on https://dystroy.org/blog/terminal-light/#detect-whether-the-terminal-is-dark-or-light
    and https://github.com/Canop/terminal-light/blob/main/src/xterm.rs

    The `default_color` parameter ensures that you always get back a color
    even if when on windows or if an error occurs while querying the terminal
    (dark terminal is detected in this case).

    Args:
        default_color (Rgb): Default color in the case that we
          are unable to successfully query for colors.

    Returns:
        TerminalBackground: Terminal background color, brightness, and type.
    """

    def background_from_color(color: RGB) -> TerminalBackground:
        # compute brightness
        brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000

        # return background
        return TerminalBackground(
            color=color, brightness=brightness, dark=brightness <= 128
        )

    # this does not work on windows so in that case we return the default
    if sys.platform == "win32":
        return background_from_color(default_color)

    try:
        # Send OSC 11 query for background color
        response = _query("\x1b]11;?\x07", 500)

        # Parse the response
        # Expected format: ]11;rgb:RRRR/GGGG/BBBB
        match = re.search(
            r"]11;rgb:([0-9a-fA-F]{2,4})/([0-9a-fA-F]{2,4})/([0-9a-fA-F]{2,4})",
            response,
        )
        if not match:
            raise RuntimeError(f"Unexpected OSC response format: {response}")

        # Extract RGB values (using first 2 digits of each component)
        r = int(match.group(1)[:2], 16)
        g = int(match.group(2)[:2], 16)
        b = int(match.group(3)[:2], 16)
        color = RGB(r, g, b)

        # return background
        return background_from_color(color)

    except Exception as e:
        logger.debug("Error attempting to query terminal background color: " + str(e))
        return background_from_color(default_color)


if sys.platform != "win32":
    import termios
    import tty

    def _query(query_str: str, timeout_ms: int) -> str:
        """Send a query to the terminal and wait for response"""
        old_settings = None

        try:
            switch_to_raw = not _is_raw_mode_enabled()
            if switch_to_raw:
                old_settings = _enable_raw_mode()

            # Send the query
            sys.stdout.write(query_str)
            sys.stdout.flush()

            # Wait for response
            readable, _, _ = select.select([sys.stdin], [], [], timeout_ms / 1000.0)
            if not readable:
                raise RuntimeError("Timeout waiting for terminal query response")

            # Read response
            response: str = ""
            while True:
                char = sys.stdin.read(1)
                response += char
                if char == "\\" or (len(response) > 1 and response[-2:] == "\x1b\\"):
                    break

            return response

        finally:
            if old_settings is not None:
                _disable_raw_mode(old_settings)

    def _is_raw_mode_enabled() -> bool:
        """Check if the terminal is in raw mode"""
        mode = termios.tcgetattr(sys.stdin.fileno())
        return not bool(mode[3] & termios.ICANON)

    def _enable_raw_mode() -> Any:
        """Enable raw mode for the terminal"""
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        tty.setraw(fd)
        return old_settings

    def _disable_raw_mode(old_settings: Any) -> None:
        """Disable raw mode for the terminal"""
        fd = sys.stdin.fileno()
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
```

## `_util/text.py`

```python
import random
import re
import string
import textwrap
from logging import getLogger
from typing import List, NamedTuple

logger = getLogger(__name__)


def truncate_text(text: str, max_length: int) -> str:
    if len(text) <= max_length:
        return text
    return textwrap.shorten(text, width=max_length, placeholder="...")


def strip_punctuation(s: str) -> str:
    return s.strip(string.whitespace + string.punctuation)


def strip_numeric_punctuation(s: str) -> str:
    # strip $, €, £, and ,
    # *,_ to string formatting characters sometimes added by LLMs
    stripped = re.sub(r"[$,£,€,*,_]", "", s)

    # strip . if it's followed by a space, the end of the string,
    # or a non-digit character
    stripped = re.sub(r"\.(?=\s|$|\D)", "", stripped)
    return stripped


class TruncatedOutput(NamedTuple):
    output: str
    original_bytes: int


def truncate_string_to_bytes(input: str, max_bytes: int) -> TruncatedOutput | None:
    """Truncate a string to a maximum number of bytes.

    Args:
       input (str): String to truncate
       max_bytes (int): Maximum number of bytes

    Returns:
       Tuple of truncated string, original size if truncation occurred,
       otherwise None
    """
    # early return for empty string or max_bytes of 0
    if not input or max_bytes <= 0:
        return None

    # fast path for ASCII strings
    if input.isascii():
        if len(input) <= max_bytes:
            return None
        else:
            return truncate_str(input, max_bytes)

    # fast path for smaller strings (4 bytes/char is max for unicode)
    if len(input) * 4 <= max_bytes:
        return None

    # encode and truncate (never fail, just warn)
    try:
        encoded = input.encode("utf-8", errors="replace")
        if len(encoded) <= max_bytes:
            return None
        else:
            return truncate_bytes(encoded, max_bytes)
    except Exception as ex:
        logger.warning(f"Unexpected error occurred truncating string: {ex}")
        return None


def truncate_str(input: str, max_bytes: int) -> TruncatedOutput | None:
    """Truncate ASCII string with middle truncation, taking half chars from front and half from back."""
    # If input fits within limit, no truncation needed
    if len(input) <= max_bytes:
        return None

    # If max_bytes is 0, truncate to empty string
    if max_bytes == 0:
        return TruncatedOutput("", len(input))

    # Split chars in half (same as bytes for ASCII)
    half_chars = max_bytes // 2
    start_portion = input[:half_chars]
    end_portion = input[-(max_bytes - half_chars) :]

    # Combine portions
    result = start_portion + end_portion

    return TruncatedOutput(result, len(input))


def truncate_bytes(input: bytes, max_bytes: int) -> TruncatedOutput | None:
    """Truncate bytes with middle truncation, taking half bytes from front and half from back."""
    # If input fits within limit, no truncation needed
    if len(input) <= max_bytes:
        return None

    # If max_bytes is 0, truncate to empty string
    if max_bytes == 0:
        return TruncatedOutput("", len(input))

    # Split bytes in half
    half_bytes = max_bytes // 2
    start_portion = input[:half_bytes]
    end_portion = input[-(max_bytes - half_bytes) :]

    # Combine portions
    result_bytes = start_portion + end_portion

    return TruncatedOutput(result_bytes.decode("utf-8", errors="replace"), len(input))


def str_to_float(s: str) -> float:
    """Convert a str to float, handling exponent characters and Unicode fractions.

    The Python isnumeric() function returns True for strings that include exponents
    (e.g. 5²) and Unicode fractions (e.g. ½, ¾), however the float() function doesn't
    handle these characters. This function correctly handles both exponents and
    Unicode fractions when converting from str to float.

    Args:
       s (str): String to convert to float

    Returns:
       float: Converted value

    Raises:
       ValueError: If the string is not a valid numeric value.
    """
    # handle empty input
    if not s:
        raise ValueError("Input string is empty.")

    # Define common Unicode fractions and their float values
    fraction_map = {
        "½": 0.5,
        "⅓": 1 / 3,
        "⅔": 2 / 3,
        "¼": 0.25,
        "¾": 0.75,
        "⅕": 0.2,
        "⅖": 0.4,
        "⅗": 0.6,
        "⅘": 0.8,
        "⅙": 1 / 6,
        "⅚": 5 / 6,
        "⅐": 1 / 7,
        "⅛": 0.125,
        "⅜": 0.375,
        "⅝": 0.625,
        "⅞": 0.875,
        "⅑": 1 / 9,
        "⅒": 0.1,
    }

    superscript_map = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹", "0123456789")
    superscript_chars = "⁰¹²³⁴⁵⁶⁷⁸⁹"

    # Special case: if string is a single fraction character
    if len(s) == 1 and s in fraction_map:
        return fraction_map[s]

    # Process the string character by character to handle mixed cases
    base_part = ""
    fraction_char = None
    exponent_part = ""

    i = 0
    while i < len(s):
        char = s[i]

        if char in fraction_map:
            # We found a fraction character - store it
            if fraction_char is not None:
                # If we already have a fraction character, that's invalid
                raise ValueError(f"Multiple fraction characters in '{s}'")
            fraction_char = char
        elif char in superscript_chars:
            # We found the start of an exponent - collect all superscript chars
            exponent_part = s[i:]
            break  # Stop processing - we've captured the exponent
        else:
            # Regular character - add to base part
            base_part += char

        i += 1

    # Calculate the base value (whole number + fraction if present)
    base_value = 0.0

    if base_part:
        # find the first valid float (LLMs may include additional spurious output)
        match = re.match(r"^([+-]?\d+(?:\.\d+)?)", base_part)
        if match is None:
            raise ValueError(f"Value could not be parsed as a float: {s}")
        base_part = match.group(1)

        try:
            base_value = float(base_part)
        except ValueError:
            raise ValueError(f"Invalid base part in '{s}'")

    if fraction_char:
        fraction_value = fraction_map[fraction_char]
        if base_value < 0:
            # For negative values, subtract the fraction (e.g., -2½ = -2.5)
            base_value -= fraction_value
        else:
            # For zero or positive values, add the fraction
            base_value += fraction_value
    elif not base_part:
        # If there's no base part and no fraction, default to 1.0
        base_value = 1.0

    # Handle exponent part if present
    if exponent_part:
        exponent_str = exponent_part.translate(superscript_map)
        try:
            # Interpret multiple superscript digits as a multi-digit exponent
            # e.g., "2⁴⁵" is 2^45, "½²³" is 0.5^23
            exponent = int(exponent_str)
            return base_value**exponent
        except ValueError:
            raise ValueError(f"Invalid exponent in '{s}'")
    else:
        return base_value


def truncate(text: str, length: int, overflow: str = "...", pad: bool = True) -> str:
    """
    Truncate text to specified length with optional padding and overflow indicator.

    Args:
        text (str): Text to truncate
        length (int): Maximum length including overflow indicator
        overflow (str): String to indicate truncation (defaults to '...')
        pad (bool): Whether to pad the result to full length (defaults to padding)

    Returns:
        Truncated string, padded if requested

    """
    if len(text) <= length:
        return text + (" " * (length - len(text))) if pad else text

    overflow_length = len(overflow)
    truncated = text[: length - overflow_length] + overflow

    return truncated


def truncate_lines(
    text: str, max_lines: int = 100, max_characters: int | None = 100 * 100
) -> tuple[str, int | None]:
    if max_characters is not None:
        text = truncate(text, max_characters)
    lines = text.splitlines()
    if len(lines) > max_lines:
        output = "\n".join(lines[0:max_lines])
        return output, len(lines) - max_lines
    else:
        return text, None


def generate_large_text(target_tokens: int) -> str:
    """Generate a large amount of text with approximately the target number of tokens"""
    generated_text = []
    estimated_tokens = 0

    while estimated_tokens < target_tokens:
        sentence = generate_sentence()

        # Add paragraph breaks occasionally
        if random.random() < 0.1:
            sentence += "\n\n"

        generated_text.append(sentence)

        # Rough estimate of tokens (words + punctuation)
        estimated_tokens += len(sentence.split()) + 2

    return " ".join(generated_text)


def generate_sentence() -> str:
    """Generate a random sentence using predefined templates"""
    adjectives, nouns, verbs = create_word_lists()

    templates = [
        f"The {random.choice(adjectives)} {random.choice(nouns)} {random.choice(verbs)} the {random.choice(adjectives)} {random.choice(nouns)}.",
        f"A {random.choice(adjectives)} {random.choice(nouns)} {random.choice(verbs)} near the {random.choice(nouns)}.",
        f"In the {random.choice(adjectives)} {random.choice(nouns)}, the {random.choice(nouns)} {random.choice(verbs)} {random.choice(adjectives)}.",
        f"When the {random.choice(nouns)} {random.choice(verbs)}, a {random.choice(adjectives)} {random.choice(nouns)} {random.choice(verbs)}.",
        f"The {random.choice(nouns)} {random.choice(verbs)} while the {random.choice(adjectives)} {random.choice(nouns)} {random.choice(verbs)}.",
    ]

    return random.choice(templates)


def create_word_lists() -> tuple[List[str], List[str], List[str]]:
    """Create basic word lists for sentence generation"""
    # Common adjectives
    adjectives = [
        "red",
        "blue",
        "green",
        "dark",
        "bright",
        "quiet",
        "loud",
        "small",
        "large",
        "quick",
        "slow",
        "happy",
        "sad",
        "clever",
        "wise",
        "ancient",
        "modern",
        "complex",
        "simple",
        "elegant",
        "rough",
        "smooth",
        "sharp",
        "dull",
        "fresh",
        "stale",
        "clean",
        "dirty",
        "heavy",
        "light",
        "hot",
        "cold",
        "dry",
        "wet",
        "rich",
        "poor",
        "thick",
        "thin",
        "strong",
        "weak",
        "early",
        "late",
        "young",
        "old",
        "good",
        "bad",
        "high",
        "low",
        "long",
        "short",
        "deep",
        "shallow",
        "hard",
        "soft",
        "near",
        "far",
        "wide",
        "narrow",
        "big",
        "little",
        "fast",
        "slow",
        "busy",
        "lazy",
        "new",
        "old",
        "full",
        "empty",
        "loud",
        "quiet",
        "sweet",
        "sour",
        "brave",
        "scared",
    ]

    # Common nouns
    nouns = [
        "time",
        "person",
        "year",
        "way",
        "day",
        "thing",
        "man",
        "world",
        "life",
        "hand",
        "part",
        "child",
        "eye",
        "woman",
        "place",
        "work",
        "week",
        "case",
        "point",
        "group",
        "number",
        "room",
        "fact",
        "idea",
        "water",
        "money",
        "month",
        "book",
        "line",
        "city",
        "business",
        "night",
        "question",
        "story",
        "job",
        "word",
        "house",
        "power",
        "game",
        "country",
        "plant",
        "animal",
        "tree",
        "stone",
        "river",
        "fire",
        "problem",
        "theory",
        "street",
        "family",
        "history",
        "mind",
        "car",
        "music",
        "art",
        "nation",
        "science",
        "nature",
        "truth",
        "peace",
        "voice",
        "class",
        "paper",
        "space",
        "ground",
        "market",
        "court",
        "force",
        "price",
        "action",
        "reason",
        "love",
        "law",
        "bird",
        "literature",
        "knowledge",
        "society",
        "valley",
        "ocean",
        "machine",
        "energy",
        "metal",
        "mountain",
    ]

    # Common verbs (present tense)
    verbs = [
        "run",
        "walk",
        "jump",
        "sing",
        "dance",
        "write",
        "read",
        "speak",
        "listen",
        "watch",
        "think",
        "grow",
        "live",
        "play",
        "work",
        "move",
        "stop",
        "start",
        "create",
        "destroy",
        "build",
        "break",
        "push",
        "pull",
        "open",
        "close",
        "rise",
        "fall",
        "increase",
        "decrease",
        "begin",
        "end",
        "love",
        "hate",
        "help",
        "hurt",
        "make",
        "take",
        "give",
        "receive",
        "buy",
        "sell",
        "eat",
        "drink",
        "sleep",
        "wake",
        "laugh",
        "cry",
        "learn",
        "teach",
        "change",
        "stay",
        "come",
        "go",
        "arrive",
        "leave",
        "enter",
        "exit",
        "succeed",
        "fail",
        "win",
        "lose",
        "fight",
        "defend",
        "attack",
        "protect",
        "save",
        "waste",
        "gather",
        "scatter",
        "collect",
        "distribute",
        "join",
        "separate",
        "unite",
        "divide",
        "share",
    ]

    return adjectives, nouns, verbs
```

## `_util/thread.py`

```python
import threading


def is_main_thread() -> bool:
    return threading.current_thread() is threading.main_thread()
```

## `_util/throttle.py`

```python
import time
from functools import wraps
from typing import Any, Callable


def throttle(seconds: float) -> Callable[..., Any]:
    """Throttle a function to ensure it is called no more than every n seconds.

    Args:
       seconds (float): Throttle time.

    Returns:
       Callable: Throttled function.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        last_called: float = 0
        last_result: Any = None

        @wraps(func)
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            nonlocal last_called
            nonlocal last_result
            current_time = time.time()
            if current_time - last_called >= seconds:
                last_result = func(*args, **kwargs)
                last_called = current_time
            return last_result

        return wrapped

    return decorator
```

## `_util/timer.py`

```python
import time
from contextlib import contextmanager
from typing import Iterator


@contextmanager
def execution_timer(name: str | None = None) -> Iterator[None]:
    start_time = time.perf_counter()
    yield
    end_time = time.perf_counter()
    print(
        f"{name if name else ''} execution time: {end_time - start_time:.6f} seconds".strip()
    )
```

## `_util/trace.py`

```python
import datetime
import gzip
import json
import logging
import os
import shutil
import time
import traceback
from contextlib import contextmanager
from dataclasses import dataclass
from logging import FileHandler, Logger
from pathlib import Path
from typing import Any, Callable, Generator, Literal, TextIO

import anyio
import jsonlines
from pydantic import BaseModel, Field, JsonValue
from shortuuid import uuid

from .appdirs import inspect_data_dir
from .constants import TRACE


def inspect_trace_dir() -> Path:
    return inspect_data_dir("traces")


def inspect_trace_file(trace_dir: Path | None = None) -> Path:
    trace_dir = trace_dir or inspect_trace_dir()
    return trace_dir / f"trace-{os.getpid()}.log"


@contextmanager
def trace_action(
    logger: Logger, action: str, message: str, *args: Any, **kwargs: Any
) -> Generator[None, None, None]:
    """Trace a long running or poentially unreliable action.

    Trace actions for which you want to collect data on the resolution
    (e.g. succeeded, cancelled, failed, timed out, etc.) and duration of.

    Traces are written to the `TRACE` log level (which is just below
    `HTTP` and `INFO`). List and read trace logs with `inspect trace list`
    and related commands (see `inspect trace --help` for details).

    Args:
       logger (Logger): Logger to use for tracing (e.g. from `getLogger(__name__)`)
       action (str): Name of action to trace (e.g. 'Model', 'Subprocess', etc.)
       message (str): Message describing action (can be a format string w/ args or kwargs)
       *args (Any): Positional arguments for `message` format string.
       **kwargs (Any): Named args for `message` format string.
    """
    trace_id = uuid()
    start_monotonic = time.monotonic()
    start_wall = time.time()
    detail = message % args if args else message % kwargs if kwargs else message

    def trace_message(event: str) -> str:
        return f"{action}: {detail} ({event})"

    logger.log(
        TRACE,
        trace_message("enter"),
        extra={
            "action": action,
            "detail": detail,
            "event": "enter",
            "trace_id": str(trace_id),
            "start_time": start_wall,
        },
    )

    try:
        yield
        duration = time.monotonic() - start_monotonic
        logger.log(
            TRACE,
            trace_message("exit"),
            extra={
                "action": action,
                "detail": detail,
                "event": "exit",
                "trace_id": str(trace_id),
                "duration": duration,
            },
        )
    except (KeyboardInterrupt, anyio.get_cancelled_exc_class()):
        duration = time.monotonic() - start_monotonic
        logger.log(
            TRACE,
            trace_message("cancel"),
            extra={
                "action": action,
                "detail": detail,
                "event": "cancel",
                "trace_id": str(trace_id),
                "duration": duration,
            },
        )
        raise
    except TimeoutError:
        duration = time.monotonic() - start_monotonic
        logger.log(
            TRACE,
            trace_message("timeout"),
            extra={
                "action": action,
                "detail": detail,
                "event": "timeout",
                "trace_id": str(trace_id),
                "duration": duration,
            },
        )
        raise
    except Exception as ex:
        duration = time.monotonic() - start_monotonic
        logger.log(
            TRACE,
            trace_message("error"),
            extra={
                "action": action,
                "detail": detail,
                "event": "error",
                "trace_id": str(trace_id),
                "duration": duration,
                "error": getattr(ex, "message", str(ex)) or repr(ex),
                "error_type": type(ex).__name__,
                "stacktrace": traceback.format_exc(),
            },
        )
        raise


def trace_message(
    logger: Logger, category: str, message: str, *args: Any, **kwargs: Any
) -> None:
    """Log a message using the TRACE log level.

    The `TRACE` log level is just below `HTTP` and `INFO`). List and
    read trace logs with `inspect trace list` and related commands
    (see `inspect trace --help` for details).

    Args:
       logger (Logger): Logger to use for tracing (e.g. from `getLogger(__name__)`)
       category (str): Category of trace message.
       message (str): Trace message (can be a format string w/ args or kwargs)
       *args (Any): Positional arguments for `message` format string.
       **kwargs (Any): Named args for `message` format string.
    """
    logger.log(TRACE, f"[{category}] {message}", *args, **kwargs)


class TraceFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        # Base log entry with standard fields
        output: dict[str, JsonValue] = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),  # This handles the % formatting of the message
        }

        # Add basic context its not a TRACE message
        if record.levelname != "TRACE":
            if hasattr(record, "module"):
                output["module"] = record.module
            if hasattr(record, "funcName"):
                output["function"] = record.funcName
            if hasattr(record, "lineno"):
                output["line"] = record.lineno

        # Add any structured fields from extra
        elif hasattr(record, "action"):
            # This is a trace_action log
            for key in [
                "action",
                "detail",
                "event",
                "trace_id",
                "start_time",
                "duration",
                "error",
                "error_type",
                "stacktrace",
            ]:
                if hasattr(record, key):
                    output[key] = getattr(record, key)

        # Handle any unexpected extra attributes
        for key, value in record.__dict__.items():
            if key not in output and key not in (
                "args",
                "lineno",
                "funcName",
                "module",
                "asctime",
                "created",
                "exc_info",
                "exc_text",
                "filename",
                "levelno",
                "levelname",
                "msecs",
                "msg",
                "name",
                "pathname",
                "process",
                "processName",
                "relativeCreated",
                "stack_info",
                "thread",
                "threadName",
            ):
                output[key] = value

        return json.dumps(
            output, default=str
        )  # default=str handles non-serializable objects

    def formatTime(self, record: logging.LogRecord, datefmt: str | None = None) -> str:
        # ISO format with timezone
        dt = datetime.datetime.fromtimestamp(record.created).astimezone()
        return dt.isoformat()


class TraceRecord(BaseModel):
    timestamp: str
    level: str
    message: str


class SimpleTraceRecord(TraceRecord):
    action: None = Field(default=None)


class ActionTraceRecord(TraceRecord):
    action: str
    event: Literal["enter", "cancel", "error", "timeout", "exit"]
    trace_id: str
    detail: str = Field(default="")
    start_time: float | None = Field(default=None)
    duration: float | None = Field(default=None)
    error: str | None = Field(default=None)
    error_type: str | None = Field(default=None)
    stacktrace: str | None = Field(default=None)


@dataclass
class TraceFile:
    file: Path
    mtime: float


def list_trace_files(trace_dir: Path | None = None) -> list[TraceFile]:
    trace_dir = trace_dir or inspect_trace_dir()
    trace_files: list[TraceFile] = [
        TraceFile(file=f, mtime=f.lstat().st_mtime)
        for f in trace_dir.iterdir()
        if f.is_file()
    ]
    trace_files.sort(key=lambda f: f.mtime, reverse=True)
    return trace_files


def read_trace_file(file: Path) -> list[TraceRecord]:
    def read_file(f: TextIO) -> list[TraceRecord]:
        jsonlines_reader = jsonlines.Reader(f)
        trace_records: list[TraceRecord] = []
        for trace in jsonlines_reader.iter(type=dict):
            if "action" in trace:
                trace_records.append(ActionTraceRecord(**trace))
            else:
                trace_records.append(SimpleTraceRecord(**trace))
        return trace_records

    if file.name.endswith(".gz"):
        with gzip.open(file, "rt") as f:
            return read_file(f)
    else:
        with open(file, "r") as f:
            return read_file(f)


def rotate_trace_files(trace_dir: Path | None = None) -> None:
    # if multiple inspect processes start up at once they
    # will all be attempting to rotate at the same time,
    # which can lead to FileNotFoundError -- ignore these
    # errors if they occur
    try:
        rotate_files = list_trace_files(trace_dir)[10:]
        for file in rotate_files:
            file.file.unlink(missing_ok=True)
    except (FileNotFoundError, OSError):
        pass


def compress_trace_log(log_handler: FileHandler) -> Callable[[], None]:
    def compress() -> None:
        # ensure log is closed
        log_handler.close()

        # compress
        trace_file = Path(log_handler.baseFilename)
        if trace_file.exists():
            with open(trace_file, "rb") as f_in:
                with gzip.open(trace_file.with_suffix(".log.gz"), "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)
            trace_file.unlink()

    return compress
```

## `_util/transcript.py`

```python
import html
import re
from typing import Any

from rich.align import AlignMethod
from rich.box import ROUNDED, Box
from rich.console import Group, RenderableType
from rich.markdown import Markdown
from rich.panel import Panel
from rich.rule import Rule
from rich.text import Text

from inspect_ai._util.content import ContentReasoning

from .format import format_function_call


def transcript_code_theme() -> str:
    return "github-dark"


def transcript_markdown(content: str, *, escape: bool = False) -> Markdown:
    code_theme = transcript_code_theme()
    return Markdown(
        html_escape_markdown(content) if escape else content,
        code_theme=code_theme,
        inline_code_lexer="python",
        inline_code_theme=code_theme,
    )


def html_escape_markdown(content: str) -> str:
    """Escape markdown lines that aren't in a code block."""
    codeblock_pattern = re.compile("`{3,}")
    current_codeblock = ""
    escaped: list[str] = []
    lines = content.splitlines()
    for line in lines:
        # look for matching end of codeblock
        if current_codeblock:
            if current_codeblock in line:
                current_codeblock = ""
                escaped.append(line)
                continue

        # look for beginning of codeblock
        match = codeblock_pattern.search(line)
        if match:
            current_codeblock = match[0]
            escaped.append(line)
            continue

        # escape if we are not in a codeblock
        if current_codeblock:
            escaped.append(line)
        else:
            escaped.append(html.escape(line, quote=False))

    return "\n".join(escaped)


def set_transcript_markdown_options(markdown: Markdown) -> None:
    code_theme = transcript_code_theme()
    markdown.code_theme = code_theme
    markdown.inline_code_lexer = "python"
    markdown.inline_code_theme = code_theme


def transcript_panel(
    title: str,
    subtitle: str | None = None,
    content: RenderableType | list[RenderableType] | None = None,
    level: int = 1,
) -> Panel:
    # resolve content to list
    if content is None:
        content = []
    elif not isinstance(content, list):
        content = [content]

    # no padding if there is no content
    padding = (0, 1) if content else (0, 0)

    # handle title/level
    if level == 1:
        title = f"[bold][blue]{title}[/blue][/bold]"
        title_align: AlignMethod = "left"
        # box if content, else line
        box = ROUNDED if content else LINE
    else:
        title = f"[bold]{title}[/bold]"
        title_align = "center"
        if level == 2:
            box = LINE
        else:
            box = DOTTED

    # inject subtitle
    if subtitle:
        content.insert(0, Text())
        content.insert(0, Text.from_markup(f"[bold]{subtitle}[/bold]"))

    # use xcode theme for markdown code
    for c in content:
        if isinstance(c, Markdown):
            set_transcript_markdown_options(c)

    return Panel(
        Group(*content),
        title=title,
        title_align=title_align,
        box=box,
        padding=padding,
        highlight=True,
        expand=True,
    )


def transcript_reasoning(reasoning: ContentReasoning) -> list[RenderableType]:
    content: list[RenderableType] = []
    text = (
        (reasoning.reasoning or reasoning.summary or "")
        if not reasoning.redacted
        else (reasoning.summary or "Reasoning encrypted by model provider.")
    ).strip()

    if len(text) > 0:
        content.append(
            transcript_markdown(
                f"**<think>**  \n{text}  \n**</think>**\n\n", escape=True
            )
        )
        content.append(Text())
    return content


def transcript_separator(
    title: str, color: str, characters: str = "─"
) -> RenderableType:
    return Rule(
        title=title,
        characters=characters,
        style=f"{color} bold",
        align="center",
        end="\n\n",
    )


def transcript_function(function: str, arguments: dict[str, Any]) -> RenderableType:
    call = format_function_call(function, arguments)
    return transcript_markdown("```python\n" + call + "\n```\n")


DOUBLE_LINE = Box(" ══ \n    \n    \n    \n    \n    \n    \n    \n")

LINE = Box(" ── \n    \n    \n    \n    \n    \n    \n    \n")

DOTTED = Box(" ·· \n    \n    \n    \n    \n    \n    \n    \n")

NOBORDER = Box("    \n    \n    \n    \n    \n    \n    \n    \n")
```

## `_util/url.py`

```python
import re


def is_http_url(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def is_data_uri(url: str) -> bool:
    pattern = r"^data:([^;]+);base64,.*"
    return re.match(pattern, url) is not None


def data_uri_mime_type(data_url: str) -> str | None:
    pattern = r"^data:([^;]+);.*"
    match = re.match(pattern, data_url)
    if match:
        mime_type = match.group(1)
        return mime_type
    else:
        return None


def data_uri_to_base64(data_uri: str) -> str:
    pattern = r"^data:[^,]+,"
    stripped_uri = re.sub(pattern, "", data_uri)
    return stripped_uri
```

## `_util/version.py`

```python
from importlib.metadata import version

import semver

from .error import module_max_version_error, module_version_error


def verify_required_version(feature: str, package: str, version: str) -> None:
    if not has_required_version(package, version):
        raise module_version_error(feature, package, version)


def verify_max_version(feature: str, package: str, max_version: str) -> None:
    if semver.Version.parse(version(package)).compare(max_version) > 0:
        raise module_max_version_error(feature, package, max_version)


def has_required_version(package: str, required_version: str) -> bool:
    if semver.Version.parse(version(package)).compare(required_version) >= 0:
        return True
    else:
        return False
```

## `_util/vscode.py`

```python
import os
from logging import getLogger
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from pydantic_core import to_json
from semver import Version
from shortuuid import uuid

from .appdirs import inspect_data_dir

logger = getLogger(__name__)

EXTENSION_COMMAND_OPEN_SAMPLE = "open_sample"
EXTENSION_COMMAND_VERSIONS = {"inspect.openLogViewer": Version(0, 3, 61)}
EXTENSION_COMMAND_VERSIONS = {
    f"inspect.openLogViewer:{EXTENSION_COMMAND_OPEN_SAMPLE}": Version(0, 3, 62)
}


class VSCodeCommand(BaseModel):
    command: str
    args: list[Any] = Field(default_factory=list)


def execute_vscode_commands(commands: VSCodeCommand | list[VSCodeCommand]) -> None:
    # resolve to list
    commands = commands if isinstance(commands, list) else [commands]

    # ensure there is someone listening
    command_dir = vs_code_commands_dir()
    if command_dir is None:
        raise NotImplementedError(
            "Not running in VS Code session or have older version of Inspect AI extension"
        )

    command_file = command_dir / uuid()
    with open(command_file, "w") as f:
        f.write(to_json(commands).decode())


def can_execute_vscode_commands() -> bool:
    return vs_code_commands_dir() is not None


def can_execute_vscode_command(command: str, context: str | None = None) -> bool:
    if not can_execute_vscode_commands():
        return False

    key = command if context is None else f"{command}:{context}"
    required_version = EXTENSION_COMMAND_VERSIONS.get(key)
    if required_version is None:
        return True
    else:
        return has_vscode_version(required_version)


def has_vscode_version(required_version: Version) -> bool:
    current_version = vscode_extension_version()
    if current_version is None:
        return False
    else:
        return current_version.is_compatible(required_version)


def vs_code_commands_dir() -> Path | None:
    workspace_id = vscode_workspace_id()
    if workspace_id:
        workspace_dir = inspect_data_dir(os.path.join("vscode", workspace_id))
        if workspace_dir.exists():
            commands_dir = workspace_dir / "commands"
            return commands_dir if commands_dir.exists() else None
        else:
            return None
    else:
        return None


def vscode_workspace_id() -> str | None:
    return os.environ.get("INSPECT_WORKSPACE_ID", None)


def vscode_extension_version() -> Version | None:
    version = os.environ.get("INSPECT_VSCODE_EXT_VERSION", None)
    if version is not None:
        try:
            return Version.parse(version)
        except Exception:
            logger.warning(f"Invalid Inspect vscode extension version: {version}")
            return None
    else:
        return None
```

## `_util/working.py`

```python
import contextlib
import time
from contextvars import ContextVar
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, AsyncIterator


@dataclass
class SampleTiming:
    start_time: float = 0.0
    waiting_time: float = 0.0
    start_datetime: datetime | None = None
    # Track concurrent waiting to avoid double-counting overlapping waits
    concurrent_wait_count: int = 0
    concurrent_wait_start: float | None = None


def init_sample_working_time(start_time: float) -> None:
    _sample_timing.set(
        SampleTiming(
            start_time=start_time,
            start_datetime=datetime.now(timezone.utc),
        )
    )


def sample_waiting_time() -> float:
    return _sample_timing.get().waiting_time


def sample_working_time() -> float:
    timing = _sample_timing.get()
    return time.monotonic() - timing.start_time - timing.waiting_time


def sample_start_datetime() -> datetime | None:
    return _sample_timing.get().start_datetime


def report_sample_waiting_time(waiting_time: float) -> None:
    # record waiting time
    from inspect_ai.util._limit import record_waiting_time

    record_waiting_time(waiting_time)

    # record sample-level limits
    _sample_timing.get().waiting_time = _sample_timing.get().waiting_time + waiting_time


_sample_timing: ContextVar[SampleTiming] = ContextVar(
    "sample_timing", default=SampleTiming()
)


@contextlib.asynccontextmanager
async def sample_waiting_for(
    semaphore: contextlib.AbstractAsyncContextManager[Any],
) -> AsyncIterator[None]:
    """Acquire a semaphore while tracking sample waiting time.

    This context manager wraps semaphore acquisition and ensures that
    concurrent waits within the same sample are not double-counted.
    Only wall-clock time when at least one task is waiting is reported.

    Args:
        semaphore: The semaphore to acquire (as an async context manager)
    """
    timing = _sample_timing.get()

    # Start waiting - record start time if we're the first waiter
    if timing.concurrent_wait_count == 0:
        timing.concurrent_wait_start = time.monotonic()
    timing.concurrent_wait_count += 1

    acquired = False
    try:
        async with semaphore:
            acquired = True
            _end_sample_wait()
            yield
    finally:
        if not acquired:
            _end_sample_wait()


def _end_sample_wait() -> None:
    """Internal: decrement wait count and report time if this was the last waiter."""
    timing = _sample_timing.get()
    timing.concurrent_wait_count -= 1
    if timing.concurrent_wait_count == 0 and timing.concurrent_wait_start is not None:
        waiting_time = time.monotonic() - timing.concurrent_wait_start
        timing.concurrent_wait_start = None
        report_sample_waiting_time(waiting_time)
```

## `_util/zip_common.py`

```python
from dataclasses import dataclass
from enum import IntEnum


class ZipCompressionMethod(IntEnum):
    """ZIP compression method constants.

    See: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
      '4.4.5 compression method:'
    """

    STORED = 0  # No compression
    DEFLATE = 8  # DEFLATE
    ZSTD = 93  # Zstandard


@dataclass
class ZipEntry:
    """Metadata for a single ZIP archive member."""

    filename: str
    compression_method: ZipCompressionMethod
    compressed_size: int
    uncompressed_size: int
    local_header_offset: int
```

## `_util/zipfile.py`

```python
import logging
import os
import zipfile
from typing import Any

logger = logging.getLogger(__name__)

zipfile_compress_kwargs: dict[str, Any]
if os.getenv("INSPECT_USE_ZSTD"):
    zipfile_compress_kwargs = {
        "compression": zipfile.ZIP_ZSTANDARD,  # type: ignore[attr-defined]
        "compresslevel": None,
    }
else:
    zipfile_compress_kwargs = {
        "compression": zipfile.ZIP_DEFLATED,
        "compresslevel": 5,
    }


__all__ = ["zipfile_compress_kwargs"]
```

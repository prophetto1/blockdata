# Python Bundle: `util`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `42`

## Files

- `util/__init__.py`
- `util/_anyio.py`
- `util/_background.py`
- `util/_collect.py`
- `util/_concurrency.py`
- `util/_console.py`
- `util/_conversation.py`
- `util/_display.py`
- `util/_early_stopping.py`
- `util/_json.py`
- `util/_limit.py`
- `util/_limited_conversation.py`
- `util/_panel.py`
- `util/_resource.py`
- `util/_sandbox/__init__.py`
- `util/_sandbox/_cli.py`
- `util/_sandbox/_json_rpc_transport.py`
- `util/_sandbox/compose.py`
- `util/_sandbox/context.py`
- `util/_sandbox/docker/cleanup.py`
- `util/_sandbox/docker/compose.py`
- `util/_sandbox/docker/config.py`
- `util/_sandbox/docker/docker.py`
- `util/_sandbox/docker/internal.py`
- `util/_sandbox/docker/prereqs.py`
- `util/_sandbox/docker/service.py`
- `util/_sandbox/docker/util.py`
- `util/_sandbox/environment.py`
- `util/_sandbox/events.py`
- `util/_sandbox/exec_remote.py`
- `util/_sandbox/limits.py`
- `util/_sandbox/local.py`
- `util/_sandbox/recon.py`
- `util/_sandbox/registry.py`
- `util/_sandbox/self_check.py`
- `util/_sandbox/service.py`
- `util/_span.py`
- `util/_store.py`
- `util/_store_model.py`
- `util/_subprocess.py`
- `util/_subtask.py`
- `util/_throttle.py`

## `util/__init__.py`

```python
from inspect_ai._util.logger import warn_once
from inspect_ai._util.registry import (
    RegistryInfo,
    RegistryType,
    registry_create,
    registry_info,
)
from inspect_ai._util.trace import trace_action, trace_message
from inspect_ai.util._limit import (
    Limit,
    LimitExceededError,
    LimitScope,
    SampleLimits,
    apply_limits,
    cost_limit,
    message_limit,
    sample_limits,
    time_limit,
    token_limit,
    working_limit,
)

from ._background import background
from ._collect import collect
from ._concurrency import concurrency
from ._console import input_screen
from ._display import DisplayType, display_counter, display_type
from ._early_stopping import (
    EarlyStop,
    EarlyStopping,
    EarlyStoppingSummary,
)
from ._json import JSONSchema, JSONType, json_schema
from ._panel import InputPanel, input_panel
from ._resource import resource
from ._sandbox import (
    ComposeBuild,
    ComposeConfig,
    ComposeHealthcheck,
    ComposeService,
    ExecCompleted,
    ExecOutput,
    ExecRemoteAwaitableOptions,
    ExecRemoteProcess,
    ExecRemoteStreamingOptions,
    ExecStderr,
    ExecStdout,
    OutputLimitExceededError,
    SandboxConnection,
    SandboxEnvironment,
    SandboxEnvironmentConfigType,
    SandboxEnvironmentLimits,
    SandboxEnvironments,
    SandboxEnvironmentSpec,
    SandboxEnvironmentType,
    is_compose_yaml,
    is_dockerfile,
    parse_compose_yaml,
    sandbox,
    sandbox_default,
    sandbox_service,
    sandbox_with,
    sandboxenv,
)
from ._span import current_span_id, span
from ._store import Store, store, store_from_events, store_from_events_as
from ._store_model import StoreModel, store_as
from ._subprocess import (
    ExecResult,
    subprocess,
)
from ._subtask import Subtask, subtask
from ._throttle import throttle

__all__ = [
    "apply_limits",
    "sample_limits",
    "SampleLimits",
    "ComposeBuild",
    "ComposeConfig",
    "ComposeHealthcheck",
    "ComposeService",
    "ExecResult",
    "concurrency",
    "DisplayType",
    "display_counter",
    "display_type",
    "InputPanel",
    "input_panel",
    "input_screen",
    "is_compose_yaml",
    "is_dockerfile",
    "JSONType",
    "JSONSchema",
    "json_schema",
    "Limit",
    "message_limit",
    "OutputLimitExceededError",
    "parse_compose_yaml",
    "resource",
    "subprocess",
    "LimitExceededError",
    "LimitScope",
    "SandboxEnvironment",
    "SandboxEnvironmentConfigType",
    "SandboxEnvironmentLimits",
    "SandboxEnvironments",
    "SandboxEnvironmentSpec",
    "SandboxEnvironmentType",
    "SandboxConnection",
    "sandboxenv",
    "sandbox",
    "sandbox_with",
    "sandbox_default",
    "sandbox_service",
    "Store",
    "store",
    "store_from_events",
    "store_from_events_as",
    "StoreModel",
    "store_as",
    "span",
    "current_span_id",
    "collect",
    "Subtask",
    "subtask",
    "throttle",
    "background",
    "cost_limit",
    "token_limit",
    "time_limit",
    "working_limit",
    "trace_action",
    "trace_message",
    "warn_once",
    "RegistryInfo",
    "RegistryType",
    "registry_create",
    "registry_info",
    "EarlyStopping",
    "EarlyStop",
    "EarlyStoppingSummary",
    "ExecCompleted",
    "ExecOutput",
    "ExecRemoteAwaitableOptions",
    "ExecRemoteProcess",
    "ExecRemoteStreamingOptions",
    "ExecStderr",
    "ExecStdout",
]
```

## `util/_anyio.py`

```python
import itertools
import sys

import anyio

from inspect_ai._util._async import current_async_backend

if sys.version_info < (3, 11):
    from exceptiongroup import ExceptionGroup


def inner_exception(exc: Exception) -> Exception:
    return _flatten_exception(exc, set())[0]


def _flatten_exception(exc: Exception, seen: set[int] | None = None) -> list[Exception]:
    """Recursively flatten an exception to get all related (__context__) and contained (ExceptionGroup) exceptions."""
    if seen is None:
        seen = set()

    # Prevent infinite recursion by tracking seen exceptions by their id
    exc_id = id(exc)
    if exc_id in seen:
        return []
    seen.add(exc_id)

    context_to_follow = (
        [exc.__context__]
        # conceptually, if __cause__ is present, it means that this exception
        # wraps the cause - rather than cause being a separate error. We'll
        # follow __context__ only if __cause__ is None
        if exc.__cause__ is None and isinstance(exc.__context__, Exception)
        else []
    )

    (maybe_this_exception, children_to_follow) = (
        ([], exc.exceptions)
        # if it's a group, follow the children discarding the group
        if isinstance(exc, ExceptionGroup)
        else ([exc], [])
    )

    # We have to use a set since the same exception is likely to be included in
    # both __context__ and .exceptions
    other_exceptions = [
        flattened_e
        for e in set(itertools.chain(context_to_follow, children_to_follow))
        for flattened_e in _flatten_exception(e, seen)
    ]

    return maybe_this_exception + other_exceptions


def safe_current_task_id() -> int | None:
    if current_async_backend() is not None:
        return anyio.get_current_task().id
    else:
        return None
```

## `util/_background.py`

```python
import sys
from logging import getLogger
from typing import Any, Awaitable, Callable

if sys.version_info >= (3, 11):
    from typing import TypeVarTuple
else:
    from typing_extensions import TypeVarTuple


from typing_extensions import Unpack

logger = getLogger(__name__)


PosArgsT = TypeVarTuple("PosArgsT")


def background(
    func: Callable[[Unpack[PosArgsT]], Awaitable[Any]],
    *args: Unpack[PosArgsT],
) -> None:
    """Run an async function in the background of the current sample.

    Background functions must be run from an executing sample.
    The function will run as long as the current sample is running.

    When the sample terminates, an anyio cancelled error will be
    raised in the background function. To catch this error and
    cleanup:

    ```python
    import anyio

    async def run():
        try:
            # background code
        except anyio.get_cancelled_exc_class():
            ...
    ```

    Args:
       func: Async function to run
       *args: Optional function arguments.
    """
    from inspect_ai.log._samples import sample_active

    # get the active sample
    sample = sample_active()
    if sample is None:
        raise RuntimeError(
            "background() function must be called from a running sample."
        )
    if sample.tg is None:
        raise RuntimeError(
            "background() function must be called after sample has been started."
        )

    # handle and log background exceptions
    async def run() -> None:
        try:
            await func(*args)
        except Exception as ex:
            logger.error(f"Background worker error: {ex}")
            raise

    # kick it off
    sample.tg.start_soon(run)
```

## `util/_collect.py`

```python
import sys
from typing import Awaitable, TypeVar, cast

import anyio

if sys.version_info < (3, 11):
    from exceptiongroup import ExceptionGroup


T = TypeVar("T")


async def collect(*tasks: Awaitable[T]) -> list[T]:
    """Run and collect the results of one or more async coroutines.

    Similar to [`asyncio.gather()`](https://docs.python.org/3/library/asyncio-task.html#asyncio.gather),
    but also works when [Trio](https://trio.readthedocs.io/en/stable/) is the async backend.

    Automatically includes each task in a `span()`, which
    ensures that its events are grouped together in the transcript.

    Using `collect()` in preference to `asyncio.gather()` is highly recommended
    for both Trio compatibility and more legible transcript output.

    Args:
        *tasks: Tasks to run

    Returns:
        List of task results.
    """
    from ._span import span

    results: list[None | T] = [None] * len(tasks)

    try:
        async with anyio.create_task_group() as tg:

            async def run_task(index: int, task: Awaitable[T]) -> None:
                async with span(f"task-{index + 1}", type="task"):
                    results[index] = await task

            for i, task in enumerate(tasks):
                tg.start_soon(run_task, i, task)
    except ExceptionGroup as ex:
        if len(ex.exceptions) == 1:
            raise ex.exceptions[0] from None
        else:
            raise

    return cast(list[T], results)
```

## `util/_concurrency.py`

```python
import contextlib
from collections.abc import Iterable
from typing import Any, AsyncIterator, Protocol

import anyio

from inspect_ai._util.working import sample_waiting_for


class ConcurrencySemaphore(Protocol):
    """Protocol for concurrency semaphores."""

    name: str
    concurrency: int
    semaphore: contextlib.AbstractAsyncContextManager[Any]
    visible: bool

    @property
    def value(self) -> int:
        """Return the number of available tokens in the semaphore."""
        ...


class ConcurrencySemaphoreRegistry(Protocol):
    """Protocol for managing a registry of concurrency semaphores.

    This abstraction allows plugging in different storage strategies
    (e.g., local dict vs cross-process shared storage).
    """

    async def get_or_create(
        self,
        name: str,
        concurrency: int,
        key: str | None,
        visible: bool,
    ) -> ConcurrencySemaphore:
        """Get existing semaphore or create a new one.

        Args:
            name: Display name for the semaphore
            concurrency: Maximum concurrent holders
            key: Unique key for storage (defaults to name if None)
            visible: Whether visible in status display

        Returns:
            The semaphore instance
        """
        ...

    def values(self) -> Iterable[ConcurrencySemaphore]:
        """Return all registered semaphores for status display."""
        ...


async def get_or_create_semaphore(
    name: str, concurrency: int, key: str | None, visible: bool
) -> ConcurrencySemaphore:
    """Get or create a concurrency semaphore.

    Delegates to the global _concurrency_registry.
    """
    return await _concurrency_registry.get_or_create(name, concurrency, key, visible)


@contextlib.asynccontextmanager
async def concurrency(
    name: str, concurrency: int, key: str | None = None, visible: bool = True
) -> AsyncIterator[None]:
    """Concurrency context manager.

    A concurrency context can be used to limit the number of coroutines
    executing a block of code (e.g calling an API). For example, here
    we limit concurrent calls to an api ('api-name') to 10:

    ```python
    async with concurrency("api-name", 10):
        # call the api
    ```

    Note that concurrency for model API access is handled internally
    via the `max_connections` generation config option. Concurrency
    for launching subprocesses is handled via the `subprocess` function.

    Args:
      name: Name for concurrency context. This serves as the
         display name for the context, and also the unique context
         key (if the `key` parameter is omitted)
      concurrency: Maximum number of coroutines that can
         enter the context.
      key: Unique context key for this context. Optional.
         Used if the unique key isn't human readable -- e.g. includes
         api tokens or account ids so that the more readable `name`
         can be presented to users e.g in console UI>
      visible: Should context utilization be visible in the status bar.
    """
    # sort out key
    key = key if key else name

    # do we have an existing semaphore? if not create one and store it
    semaphore = await get_or_create_semaphore(name, concurrency, key, visible)

    # wait and yield to protected code (sample_waiting_for tracks concurrent waits
    # to avoid double-counting overlapping wait times within a sample)
    async with sample_waiting_for(semaphore.semaphore):
        yield


def concurrency_status_display() -> dict[str, tuple[int, int]]:
    status: dict[str, tuple[int, int]] = {}
    semaphores = list(_concurrency_registry.values())
    names = [c.name for c in semaphores]
    for c in semaphores:
        # respect visibility
        if not c.visible:
            continue

        # compute name for status display. some resources (e.g. models) use
        # a / prefix. if there are no duplicates of a given prefix then shorten
        # it to be only the prefix (e.g. 'openai' rather than 'openai/gpt-4o')
        prefix = c.name.split("/")[0]
        prefix_count = sum([1 for name in names if name.startswith(prefix + "/")])
        if prefix_count == 1:
            name = prefix
        else:
            name = c.name

        # status display entry
        status[name] = (c.concurrency - c.value, c.concurrency)

    return status


def init_concurrency(
    registry: ConcurrencySemaphoreRegistry | None = None,
) -> None:
    """Initialize the concurrency system with a custom registry.

    Args:
        registry: A ConcurrencySemaphoreRegistry instance, or None for default local registry.
    """
    global _concurrency_registry
    _concurrency_registry = _AnyIOSemaphoreRegistry() if registry is None else registry


class _AnyIOSemaphoreRegistry:
    """Default local semaphore registry using anyio.Semaphore."""

    def __init__(self) -> None:
        self._semaphores: dict[str, ConcurrencySemaphore] = {}

    async def get_or_create(
        self,
        name: str,
        concurrency: int,
        key: str | None,
        visible: bool,
    ) -> ConcurrencySemaphore:
        k = key if key else name
        if k in self._semaphores:
            return self._semaphores[k]

        sem = _create_anyio_semaphore(name, concurrency, visible)
        self._semaphores[k] = sem
        return sem

    def values(self) -> Iterable[ConcurrencySemaphore]:
        return self._semaphores.values()


def _create_anyio_semaphore(
    name: str, concurrency: int, visible: bool
) -> ConcurrencySemaphore:
    """Create a local ConcurrencySemaphore using anyio.Semaphore."""

    class _ConcurrencySemaphore(ConcurrencySemaphore):
        def __init__(self, name: str, concurrency: int, visible: bool) -> None:
            self.name = name
            self.concurrency = concurrency
            self.visible = visible
            self._sem = anyio.Semaphore(concurrency)
            self.semaphore: contextlib.AbstractAsyncContextManager[Any] = self._sem

        @property
        def value(self) -> int:
            return self._sem.value

    return _ConcurrencySemaphore(name, concurrency, visible)


# Global registry instance
_concurrency_registry: ConcurrencySemaphoreRegistry = _AnyIOSemaphoreRegistry()
```

## `util/_console.py`

```python
import os

if os.name == "posix":
    # This makes Rich console input better if imported, but
    # raises a ModuleNotFound error on Windows, so posix only
    import readline  # noqa: F401
from contextlib import contextmanager
from typing import Iterator

from rich.console import Console


@contextmanager
def input_screen(
    header: str | None = None,
    transient: bool | None = None,
    width: int | None = None,
) -> Iterator[Console]:
    """Input screen for receiving user input.

    Context manager that clears the task display and provides a
    screen for receiving console input.

    Args:
      header (str | None): Header line to print above console
        content (defaults to printing no header)
      transient (bool): Return to task progress display after
        the user completes input (defaults to `True` for normal
        sessions and `False` when trace mode is enabled).
      width (int): Input screen width in characters (defaults to
        full width)

    Returns:
       Console to use for input.
    """
    from inspect_ai._display.core.active import task_screen

    with task_screen().input_screen(
        header=header, transient=transient, width=width
    ) as console:
        yield console
```

## `util/_conversation.py`

```python
from rich import print
from rich.console import RenderableType
from rich.text import Text

from inspect_ai._util.transcript import transcript_panel


def conversation_panel(
    title: str,
    *,
    subtitle: str | None = None,
    content: RenderableType | list[RenderableType] | None = None,
) -> None:
    """Trace content into a standard trace panel display.

    Typically you would call `display_type() == "conversation"` to confirm that
    we are in conversation mode before calling `conversation_panel()`.

    Args:
      title (str): Panel title.
      subtitle (str | None): Panel subtitle. Optional.
      content (RenderableType | list[RenderableType]): One or more Rich renderables.
    """
    print(
        transcript_panel(title, subtitle, content),
        Text(),
    )
```

## `util/_display.py`

```python
import os
from logging import getLogger
from typing import Literal

from inspect_ai._util._async import configured_async_backend
from inspect_ai._util.constants import DEFAULT_DISPLAY
from inspect_ai._util.thread import is_main_thread

logger = getLogger(__name__)

DisplayType = Literal["full", "conversation", "rich", "plain", "log", "none"]
"""Console display type."""


_display_type: DisplayType | None = None


def init_display_type(display: str | None = None) -> DisplayType:
    global _display_type
    display = (
        display or os.environ.get("INSPECT_DISPLAY", DEFAULT_DISPLAY).lower().strip()
    )

    # if trio is configured as the backend then throttle down to "rich"
    # (as textual uses asyncio directly so is not compatible with trio)
    if configured_async_backend() == "trio" and display == "full":
        display = "rich"

    # if we are on a background thread then throttle down to "plain"
    # ("full" requires textual which cannot run in a background thread
    # b/c it calls the Python signal function; "rich" assumes exclusive
    # display access which may not be the case for threads)
    if display in ["full", "rich"] and not is_main_thread():
        display = "plain"

    match display:
        case "full" | "conversation" | "rich" | "plain" | "log" | "none":
            _display_type = display
        case _:
            logger.warning(
                f"Unknown display type '{display}' (setting display to 'full')"
            )
            _display_type = "full"
    return _display_type


def display_type() -> DisplayType:
    """Get the current console display type.

    Returns:
       DisplayType: Display type.
    """
    global _display_type
    if _display_type:
        return _display_type
    else:
        return init_display_type()


def display_type_plain() -> bool:
    """Does the current display type prefer plain text?

    Returns:
       bool: True if the display type is "plain" or "log".
    """
    return display_type() in ["plain", "log"]


def display_type_initialized() -> bool:
    global _display_type
    return _display_type is not None


def display_counter(caption: str, value: str) -> None:
    """Display a counter in the UI.

    Args:
        caption: The counter's caption e.g. "HTTP rate limits".
        value: The counter's value e.g. "42".
    """
    from inspect_ai._display.core.active import display

    display().display_counter(caption, value)
```

## `util/_early_stopping.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

from pydantic import BaseModel, Field, JsonValue

if TYPE_CHECKING:
    from inspect_ai.dataset._dataset import Sample
    from inspect_ai.log._log import EvalSpec
    from inspect_ai.scorer._metric import SampleScore


class EarlyStop(BaseModel):
    """Directive to stop a sample early."""

    id: str | int
    """Sample dataset id."""

    epoch: int
    """Sample epoch."""

    reason: str | None = Field(default=None)
    """Reason for the early stop."""

    metadata: dict[str, JsonValue] | None = Field(default=None)
    """Metadata related to early stop."""


class EarlyStoppingSummary(BaseModel):
    """Summary of early stopping applied to task."""

    manager: str
    """Name of early stopping manager."""

    early_stops: list[EarlyStop]
    """Samples that were stopped early."""

    metadata: dict[str, JsonValue]
    """Metadata about early stopping"""


class EarlyStopping(Protocol):
    """Early stopping manager for skipping selected samples/epochs."""

    async def start_task(
        self, task: "EvalSpec", samples: list["Sample"], epochs: int
    ) -> str:
        """Called at the beginning of an eval run to register the tasks that will be run.

        Args:
            task: Task metadata.
            samples: List of samples that will be executed for this task.
            epochs: Number of epochs to run for each sample.

        Returns:
            Name of early stopping manager.
        """
        ...

    async def schedule_sample(self, id: str | int, epoch: int) -> EarlyStop | None:
        """Called prior to scheduling a sample to cheeck for an early stop.

        Args:
            id: Sample dataset id.
            epoch: Sample epoch.

        Returns:
            `EarlyStop` if the sample should be stopped early, otherwise `None`.
        """
        ...

    async def complete_sample(
        self,
        id: str | int,
        epoch: int,
        scores: dict[str, "SampleScore"],
    ) -> None:
        """Called when a sample is complete.

        Args:
           id: Sample dataset id.
           epoch: Sample epoch.
           scores: Scores for this sample.
        """
        ...

    async def complete_task(self) -> dict[str, JsonValue]:
        """Called when the task is complete.

        Returns:
            Metadata (e.g. diagnostics) about early stopping.
        """
        ...
```

## `util/_json.py`

```python
import types
import typing
from copy import deepcopy
from dataclasses import MISSING, is_dataclass
from datetime import date, datetime, time
from enum import EnumMeta
from typing import (
    Any,
    Dict,
    List,
    Literal,
    Optional,
    Set,
    Tuple,
    Type,
    Union,
    cast,
    get_args,
    get_origin,
    get_type_hints,
)

from pydantic import BaseModel, Field, create_model
from typing_extensions import is_typeddict

JSONType = Literal["string", "integer", "number", "boolean", "array", "object", "null"]
"""Valid types within JSON schema."""


class JSONSchema(BaseModel):
    """JSON Schema for type."""

    type: JSONType | list[JSONType] | None = Field(default=None)
    """JSON type of tool parameter."""

    format: str | None = Field(default=None)
    """Format of the parameter (e.g. date-time)."""

    description: str | None = Field(default=None)
    """Parameter description."""

    default: Any = Field(default=None)
    """Default value for parameter."""

    enum: list[Any] | None = Field(default=None)
    """Valid values for enum parameters."""

    items: Optional["JSONSchema"] = Field(default=None)
    """Valid type for array parameters."""

    properties: dict[str, "JSONSchema"] | None = Field(default=None)
    """Valid fields for object parametrs."""

    additionalProperties: Optional["JSONSchema"] | bool | None = Field(default=None)
    """Are additional properties allowed?"""

    anyOf: list["JSONSchema"] | None = Field(default=None)
    """Valid types for union parameters."""

    required: list[str] | None = Field(default=None)
    """Required fields for object parameters."""


def json_schema(t: Type[Any]) -> JSONSchema:
    """Provide a JSON Schema for the specified type.

    Schemas can be automatically inferred for a wide variety of
    Python class types including Pydantic BaseModel, dataclasses,
    and typed dicts.

    Args:
        t: Python type

    Returns:
        JSON Schema for type.
    """
    origin = get_origin(t)
    args = get_args(t)

    if origin is None:
        if t is int:
            return JSONSchema(type="integer")
        elif t is float:
            return JSONSchema(type="number")
        elif t is str:
            return JSONSchema(type="string")
        elif t is bool:
            return JSONSchema(type="boolean")
        elif t is datetime:
            return JSONSchema(type="string", format="date-time")
        elif t is date:
            return JSONSchema(type="string", format="date")
        elif t is time:
            return JSONSchema(type="string", format="time")
        elif t is list or t is set:
            return JSONSchema(type="array", items=JSONSchema())
        elif t is dict:
            return JSONSchema(type="object", additionalProperties=JSONSchema())
        elif (
            is_dataclass(t)
            or is_typeddict(t)
            or (isinstance(t, type) and issubclass(t, BaseModel))
        ):
            return cls_json_schema(t)
        elif isinstance(t, EnumMeta):
            enum_values = [item.value for item in t]
            # Determine the type from the enum values
            if enum_values:
                first_val = enum_values[0]
                if isinstance(first_val, str):
                    enum_type: JSONType = "string"
                elif isinstance(first_val, bool):
                    enum_type = "boolean"
                elif isinstance(first_val, int):
                    enum_type = "integer"
                elif isinstance(first_val, float):
                    enum_type = "number"
                else:
                    enum_type = "string"
                return JSONSchema(type=enum_type, enum=enum_values)
            return JSONSchema(enum=enum_values)
        elif t is type(None):
            return JSONSchema(type="null")
        else:
            return JSONSchema()
    elif (
        origin is list
        or origin is List
        or origin is tuple
        or origin is Tuple
        or origin is set
        or origin is Set
    ):
        return JSONSchema(
            type="array", items=json_schema(args[0]) if args else JSONSchema()
        )
    elif origin is dict or origin is Dict:
        return JSONSchema(
            type="object",
            additionalProperties=json_schema(args[1])
            if len(args) > 1
            else JSONSchema(),
        )
    elif origin is Union or origin is types.UnionType:
        return JSONSchema(anyOf=[json_schema(arg) for arg in args])
    elif origin is Optional:
        return JSONSchema(
            anyOf=[json_schema(arg) for arg in args] + [JSONSchema(type="null")]
        )
    elif origin is typing.Literal:
        # Determine the type from the literal values
        # All values in a Literal should be the same type
        if args:
            first_val = args[0]
            if isinstance(first_val, str):
                literal_type: JSONType = "string"
            elif isinstance(first_val, bool):
                # Note: bool must be checked before int since bool is a subclass of int
                literal_type = "boolean"
            elif isinstance(first_val, int):
                literal_type = "integer"
            elif isinstance(first_val, float):
                literal_type = "number"
            else:
                literal_type = "string"  # Default to string
            return JSONSchema(type=literal_type, enum=list(args))
        return JSONSchema(enum=list(args))

    return JSONSchema()  # Default case if we can't determine the type


def cls_json_schema(cls: Type[Any]) -> JSONSchema:
    properties: Dict[str, JSONSchema] = {}
    required: List[str] = []

    if is_dataclass(cls):
        fields = cls.__dataclass_fields__  # type: ignore
        for name, field in fields.items():
            properties[name] = json_schema(field.type)  # type: ignore
            if field.default is MISSING and field.default_factory is MISSING:
                required.append(name)
    elif isinstance(cls, type) and issubclass(cls, BaseModel):
        schema = cls.model_json_schema()
        schema = resolve_schema_references(schema)
        for name, prop in schema.get("properties", {}).items():
            properties[name] = JSONSchema(**prop)
        required = schema.get("required", [])
    elif is_typeddict(cls):
        annotations = get_type_hints(cls)
        for name, type_hint in annotations.items():
            properties[name] = json_schema(type_hint)
            if name in cls.__required_keys__:
                required.append(name)

    return JSONSchema(
        type="object",
        properties=properties,
        required=required if required else None,
        additionalProperties=False,
    )


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


def resolve_schema_references(schema: dict[str, Any]) -> dict[str, Any]:
    """Resolves all $ref references in a JSON schema by inlining the definitions."""
    schema = deepcopy(schema)
    definitions = schema.pop("$defs", {})

    def _resolve_refs(obj: Any) -> Any:
        if isinstance(obj, dict):
            if "$ref" in obj and obj["$ref"].startswith("#/$defs/"):
                ref_key = obj["$ref"].split("/")[-1]
                if ref_key in definitions:
                    # Replace with a deep copy of the definition
                    resolved = deepcopy(definitions[ref_key])
                    # Process any nested references in the definition
                    resolved = _resolve_refs(resolved)

                    # Merge in the current object fields, which should take priority
                    # This means that if you have e.g.
                    # {"$ref": "#/$defs/SubType", "description": "subtype of type SubType"},
                    # and SubType resolves to
                    # {"description": "The SubType Class", "parameters": {"param1": {"type": "string"}}},
                    # the final result will be:
                    # {"description": "subtype of type SubType", "parameters": {"param1": {"type": "string"}}}
                    return resolved | {k: o for k, o in obj.items() if k != "$ref"}

            # Process all entries in the dictionary
            return {k: _resolve_refs(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [_resolve_refs(item) for item in obj]
        else:
            return obj

    return cast(dict[str, Any], _resolve_refs(schema))


def set_additional_properties_false(schema: JSONSchema) -> None:
    # Set on top level
    schema.additionalProperties = False

    # Recursively process nested schemas
    if schema.items:
        set_additional_properties_false(schema.items)

    if schema.properties:
        for prop_schema in schema.properties.values():
            set_additional_properties_false(prop_schema)

    if schema.anyOf:
        for any_schema in schema.anyOf:
            set_additional_properties_false(any_schema)


def json_schema_to_base_model(
    schema: JSONSchema | dict[str, Any], model_name: str = "DynamicModel"
) -> type[BaseModel]:
    """Convert JSON schema to Pydantic BaseModel.

    Handles nested objects, arrays, and basic validations.

    Args:
        schema: JSON schema to convert (either JSONSchema object or dict)
        model_name: Name for the generated Pydantic model

    Returns:
        A Pydantic BaseModel class

    Raises:
        ValueError: If the schema is malformed or invalid
    """
    type_map = {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
        "null": type(None),
    }

    if isinstance(schema, JSONSchema):
        schema = schema.model_dump(exclude_none=True)

    # Validate schema structure
    if not isinstance(schema, dict):
        raise ValueError(
            f"Schema must be a dict or JSONSchema object, got {type(schema)}"
        )

    properties = schema.get("properties")
    if properties is None:
        properties = {}
    elif not isinstance(properties, dict):
        raise ValueError(f"Schema 'properties' must be a dict, got {type(properties)}")

    required_fields_list = schema.get("required", [])
    if not isinstance(required_fields_list, list):
        raise ValueError(
            f"Schema 'required' must be a list, got {type(required_fields_list)}"
        )

    required_fields = set(required_fields_list)

    fields: dict[str, Any] = {}

    for prop_name, prop_schema in properties.items():
        field_type = get_type_from_schema(prop_schema, type_map, prop_name, model_name)

        # Determine if required or optional
        is_required = prop_name in required_fields

        # Get default value
        if is_required:
            default = ...
        elif "default" in prop_schema:
            default = prop_schema["default"]
        else:
            # No default specified - make the field Optional
            # Check if it's already Optional/Union with None
            origin = get_origin(field_type)
            if origin is Union:
                args = get_args(field_type)
                if type(None) not in args:
                    field_type = Optional[field_type]
            else:
                field_type = Optional[field_type]
            default = None

        # Create Field with additional validation
        field_kwargs = {}

        # Add constraints from JSON schema
        if "minimum" in prop_schema:
            field_kwargs["ge"] = prop_schema["minimum"]
        if "maximum" in prop_schema:
            field_kwargs["le"] = prop_schema["maximum"]
        if "minLength" in prop_schema:
            field_kwargs["min_length"] = prop_schema["minLength"]
        if "maxLength" in prop_schema:
            field_kwargs["max_length"] = prop_schema["maxLength"]
        if "pattern" in prop_schema:
            field_kwargs["pattern"] = prop_schema["pattern"]
        if "description" in prop_schema:
            field_kwargs["description"] = prop_schema["description"]

        if field_kwargs:
            field_value = (field_type, Field(default, **field_kwargs))
        else:
            field_value = (field_type, default)

        fields[prop_name] = field_value

    return cast(type[BaseModel], create_model(model_name, **fields))


def get_type_from_schema(
    prop_schema: dict[str, Any],
    type_map: dict[str, Any],
    field_name: str | None = None,
    parent_name: str = "Model",
) -> Any:
    """Extract Python type from JSON schema property.

    Returns a type suitable for Pydantic model fields, which can be
    a basic type, generic alias (List[T], Dict[K,V]), or Union type.

    Args:
        prop_schema: JSON schema for the property
        type_map: Mapping from JSON types to Python types
        field_name: Name of the field (for nested model naming)
        parent_name: Name of the parent model (for nested model naming)

    Raises:
        ValueError: If the schema is malformed
    """
    if not isinstance(prop_schema, dict):
        raise ValueError(f"Property schema must be a dict, got {type(prop_schema)}")

    prop_type = prop_schema.get("type")

    # Handle anyOf (union types)
    if "anyOf" in prop_schema:
        any_of_schemas = prop_schema["anyOf"]
        if not isinstance(any_of_schemas, list):
            raise ValueError(f"'anyOf' must be a list, got {type(any_of_schemas)}")
        if not any_of_schemas:
            raise ValueError("'anyOf' cannot be empty")
        any_of_types = [
            get_type_from_schema(schema, type_map, field_name, parent_name)
            for schema in any_of_schemas
        ]
        # Remove duplicates while preserving order
        unique_types = []
        for t in any_of_types:
            if t not in unique_types:
                unique_types.append(t)
        return Union[tuple(unique_types)] if len(unique_types) > 1 else unique_types[0]

    # Handle arrays
    if prop_type == "array":
        items_schema = prop_schema.get("items", {})
        item_type = get_type_from_schema(
            items_schema, type_map, field_name, parent_name
        )
        # Using List with runtime type parameter - mypy doesn't like this but it works at runtime
        return List[item_type]  # type: ignore[valid-type]

    # Handle nested objects
    elif prop_type == "object":
        if "properties" in prop_schema:
            # Create nested model recursively with descriptive name
            if "title" in prop_schema:
                nested_name = prop_schema["title"]
            elif field_name:
                # Use parent name + field name for clarity
                nested_name = f"{parent_name}_{field_name.title().replace('_', '')}"
            else:
                nested_name = f"{parent_name}_NestedObject"
            return json_schema_to_base_model(prop_schema, nested_name)
        return Dict[str, Any]

    # Handle multiple types (JSON schema "type" can be an array)
    elif isinstance(prop_type, list):
        types = [type_map.get(t, Any) for t in prop_type if t != "null"]
        if "null" in prop_type:
            return (
                Optional[Union[tuple(types)]] if len(types) > 1 else Optional[types[0]]
            )
        return Union[tuple(types)] if len(types) > 1 else types[0]

    # Handle enums - use Literal types for better type safety
    elif "enum" in prop_schema:
        enum_values = prop_schema["enum"]
        if enum_values:
            # Use Literal type for enums
            return Literal[tuple(enum_values)]  # type: ignore[valid-type]
        # Fallback to string if empty enum
        return str if prop_type is None else type_map.get(prop_type, str)

    # Standard type
    if prop_type is not None:
        return type_map.get(prop_type, Any)

    # No type specified
    return Any
```

## `util/_limit.py`

```python
from __future__ import annotations

import abc
import logging
from contextlib import ExitStack, contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from types import TracebackType
from typing import TYPE_CHECKING, Generic, Iterator, Literal, TypeVar

import anyio
from typing_extensions import Self, override

from inspect_ai._util.logger import warn_once

if TYPE_CHECKING:
    # These imports are used as type hints only - prevent circular imports.
    from inspect_ai.model._model_output import ModelUsage
    from inspect_ai.solver._task_state import TaskState


logger = logging.getLogger(__name__)
TNode = TypeVar("TNode", bound="_Node")


class LimitExceededError(Exception):
    """Exception raised when a limit is exceeded.

    In some scenarios this error may be raised when `value >= limit` to
    prevent another operation which is guaranteed to exceed the limit from being
    wastefully performed.

    Args:
       type: Type of limit exceeded.
       value: Value compared to.
       limit: Limit applied.
       message (str | None): Optional. Human readable message.
       source (Limit | None): Optional. The `Limit` instance which was responsible for raising this error.
    """

    def __init__(
        self,
        type: Literal[
            "message", "time", "working", "token", "cost", "operator", "custom"
        ],
        *,
        value: float,
        limit: float,
        message: str | None = None,
        source: Limit | None = None,
    ) -> None:
        self.type = type
        self.value = value
        self.value_str = self._format_float_or_int(value)
        self.limit = limit
        self.limit_str = self._format_float_or_int(limit)
        self.message = f"Exceeded {type} limit: {limit:,}"
        self.source = source
        super().__init__(message)

    def with_state(self, state: TaskState) -> LimitExceededError:
        warn_once(
            logger,
            "LimitExceededError.with_state() is deprecated (no longer required).",
        )
        return self

    def _format_float_or_int(self, value: float | int) -> str:
        if isinstance(value, int):
            return f"{value:,}"
        else:
            return f"{value:,.2f}"


class Limit(abc.ABC):
    """Base class for all limit context managers."""

    def __init__(self) -> None:
        self._entered = False

    @abc.abstractmethod
    def __enter__(self) -> Limit:
        pass

    @abc.abstractmethod
    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        pass

    @property
    @abc.abstractmethod
    def limit(self) -> float | None:
        """The value of the limit being applied.

        Can be None which represents no limit.
        """
        pass

    @property
    @abc.abstractmethod
    def usage(self) -> float:
        """The current usage of the resource being limited."""
        pass

    @property
    def remaining(self) -> float | None:
        """The remaining "unused" amount of the resource being limited.

        Returns None if the limit is None.
        """
        if self.limit is None:
            return None
        return self.limit - self.usage

    def _check_reuse(self) -> None:
        if self._entered:
            raise RuntimeError(
                "Each Limit may only be used once in a single 'with' block. Please "
                "create a new instance of the Limit."
            )
        self._entered = True


@contextmanager
def apply_limits(
    limits: list[Limit], catch_errors: bool = False
) -> Iterator[LimitScope]:
    """
    Apply a list of limits within a context manager.

    Optionally catches any `LimitExceededError` raised by the applied limits, while
    allowing other limit errors from any other scope (e.g. the Sample level) to
    propagate.

    Yields a `LimitScope` object which can be used once the context manager is closed
    to determine which, if any, limits were exceeded.

    Args:
      limits: List of limits to apply while the context manager is open. Should a
        limit be exceeded, a `LimitExceededError` is raised.
      catch_errors: If True, catch any `LimitExceededError` raised by the applied
        limits. Callers can determine whether any limits were exceeded by checking the
        limit_error property of the `LimitScope` object yielded by this function. If
        False, all `LimitExceededError` exceptions will be allowed to propagate.
    """
    limit_scope = LimitScope()
    # Try scope is outside the `with ExitStack()` so that we can catch any errors raised
    # when exiting it (which will be where time_limit() would raise LimitExceededError).
    try:
        with ExitStack() as stack:
            for limit in limits:
                stack.enter_context(limit)
            yield limit_scope
    except LimitExceededError as e:
        # If it was not one of the limits we applied.
        if e.source is None or e.source not in limits:
            raise
        limit_scope.limit_error = e
        if not catch_errors:
            raise


class LimitScope:
    """Object returned from `apply_limits()`.

    Used to check which, if any, limits were exceeded.
    """

    def __init__(self) -> None:
        self.limit_error: LimitExceededError | None = None


@dataclass
class SampleLimits:
    """Data class to hold the limits applied to a Sample.

    This is used to return the limits from `sample_limits()`.
    """

    token: Limit
    """Token limit."""

    cost: Limit
    """Cost limit."""

    message: Limit
    """Message limit."""

    working: Limit
    """Working limit."""

    time: Limit
    """Time limit."""


def sample_limits() -> SampleLimits:
    """Get the top-level limits applied to the current `Sample`."""
    # if there is _sample_limit_data recorded then the limit trees have
    # gone out of scope for the sample so we just return that snapshot
    limit_data = _sample_limit_data.get()
    if limit_data is not None:
        return limit_data

    def get_root_node(node: TNode | None, name: str) -> TNode:
        if node is None:
            raise RuntimeError(
                f"No {name} limit node found. Is there a running sample?"
            )
        while node.parent is not None:
            node = node.parent
        return node

    return SampleLimits(
        token=get_root_node(token_limit_tree.get(), "token"),
        cost=get_root_node(cost_limit_tree.get(), "cost"),
        message=get_root_node(message_limit_tree.get(), "message"),
        working=get_root_node(working_limit_tree.get(), "working"),
        time=get_root_node(time_limit_tree.get(), "time"),
    )


def record_sample_limit_data(message_usage: float) -> None:
    current_limits = sample_limits()
    _sample_limit_data.set(
        SampleLimits(
            token=_LimitData(current_limits.token),
            cost=_LimitData(current_limits.cost),
            message=_LimitData(current_limits.message, usage=message_usage),
            working=_LimitData(current_limits.working),
            time=_LimitData(current_limits.time),
        )
    )


_sample_limit_data: ContextVar[SampleLimits | None] = ContextVar(
    "SampleLimitData", default=None
)


def token_limit(limit: int | None) -> _TokenLimit:
    """Limits the total number of tokens which can be used.

    The counter starts when the context manager is opened and ends when it is closed.

    These limits can be stacked.

    This relies on "cooperative" checking - consumers must call `check_token_limit()`
    themselves whenever tokens are consumed.

    When a limit is exceeded, a `LimitExceededError` is raised.

    Args:
      limit: The maximum number of tokens that can be used while the context manager is
        open. Tokens used before the context manager was opened are not counted. A value
        of None means unlimited tokens.
    """
    return _TokenLimit(limit)


def record_model_usage(usage: ModelUsage) -> None:
    """Record model usage against any active token limits.

    Does not check if the limit has been exceeded.
    """
    node = token_limit_tree.get()
    if node is None:
        return
    node.record(usage)


def check_token_limit() -> None:
    """Check if the current token usage exceeds _any_ of the token limits.

    Within the current execution context (e.g. async task) and its parent contexts only.

    Note that all active token limits are checked, not just the most recent one.
    """
    node = token_limit_tree.get()
    if node is None:
        return
    node.check()


def cost_limit(limit: float | None) -> _CostLimit:
    """Limits the total cost (in dollars) which can be used.

    The counter starts when the context manager is opened and ends when it is closed.

    These limits can be stacked.

    This relies on "cooperative" checking - consumers must call `check_cost_limit()`
    themselves whenever cost is recorded.

    When a limit is exceeded, a `LimitExceededError` is raised.

    Args:
      limit: The maximum cost (in dollars) that can be used while the context manager is
        open. A value of None means unlimited cost.
    """
    return _CostLimit(limit)


def record_model_cost(cost: float) -> None:
    """Record model cost against any active cost limits.

    Does not check if the limit has been exceeded.
    """
    node = cost_limit_tree.get()
    if node is None:
        return
    node.record(cost)


def check_cost_limit() -> None:
    """Check if the current cost exceeds _any_ of the cost limits.

    Within the current execution context (e.g. async task) and its parent contexts only.

    Note that all active cost limits are checked, not just the most recent one.
    """
    node = cost_limit_tree.get()
    if node is None:
        return
    node.check()


def message_limit(limit: int | None) -> _MessageLimit:
    """Limits the number of messages in a conversation.

    The total number of messages in the conversation are compared to the limit (not just
    "new" messages).

    These limits can be stacked.

    This relies on "cooperative" checking - consumers must call check_message_limit()
    themselves whenever the message count is updated.

    When a limit is exceeded, a `LimitExceededError` is raised.

    Args:
      limit: The maximum conversation length (number of messages) allowed while the
        context manager is open. A value of None means unlimited messages.
    """
    return _MessageLimit(limit)


def check_message_limit(count: int, raise_for_equal: bool) -> None:
    """Check if the current message count exceeds the active message limit.

    Only the most recent message limit is checked. Ancestors are not checked.

    Args:
      count: The number of messages in the conversation.
      raise_for_equal: If True, raise an error if the message count is equal to the
        limit, otherwise, only raise an error if the message count is greater than the
        limit.
    """
    node = message_limit_tree.get()
    if node is None:
        return
    node.check(count, raise_for_equal)


def time_limit(limit: float | None) -> _TimeLimit:
    """Limits the wall clock time which can elapse.

    The timer starts when the context manager is opened and stops when it is closed.

    These limits can be stacked.

    When a limit is exceeded, the code block is cancelled and a `LimitExceededError` is
    raised.

    Uses anyio's cancellation scopes meaning that the operations within the context
    manager block are cancelled if the limit is exceeded. The `LimitExceededError` is
    therefore raised at the level that the `time_limit()` context manager was opened,
    not at the level of the operation which caused the limit to be exceeded (e.g. a call
    to `generate()`). Ensure you handle `LimitExceededError` at the level of opening the context manager.

    Args:
      limit: The maximum number of seconds that can pass while the context manager is
        open. A value of None means unlimited time.
    """
    return _TimeLimit(limit)


def working_limit(limit: float | None) -> _WorkingLimit:
    """Limits the working time which can elapse.

    Working time is the wall clock time minus any waiting time e.g. waiting before
    retrying in response to rate limits or waiting on a semaphore.

    The timer starts when the context manager is opened and stops when it is closed.

    These limits can be stacked.

    When a limit is exceeded, a `LimitExceededError` is raised.

    Args:
      limit: The maximum number of seconds of working that can pass while the context
        manager is open. A value of None means unlimited time.
    """
    return _WorkingLimit(limit)


def record_waiting_time(waiting_time: float) -> None:
    node = working_limit_tree.get()
    if node is None:
        return
    node.record_waiting_time(waiting_time)


def check_working_limit() -> None:
    from inspect_ai.event._sample_limit import SampleLimitEvent
    from inspect_ai.log._transcript import transcript

    error = working_limit_exceeded()
    if error is not None:
        transcript()._event(
            SampleLimitEvent(type="working", message=error.message, limit=error.limit)
        )

        raise error


def monitor_working_limit(interval: float = 1) -> None:
    from inspect_ai.log._samples import has_active_model_event, sample_active

    # get the active sample
    sample = sample_active()
    if sample is None:
        raise RuntimeError(
            "monitor_working_limit() must be called from a running sample."
        )
    if sample.tg is None:
        raise RuntimeError(
            "monitor_working_limit() must be called after sample has been started."
        )

    # check every second
    async def run() -> None:
        while True:
            await anyio.sleep(interval)

            # don't continue after the sample is completed
            if sample.completed:
                return

            # don't check if there is an active model event
            # (need to wait until it completes for the working time
            # computation to be done)
            if has_active_model_event():
                continue

            error = working_limit_exceeded()
            if error is not None:
                sample.limit_exceeded(error)
                return

    # kick it off
    sample.tg.start_soon(run)


def working_limit_exceeded() -> LimitExceededError | None:
    node = working_limit_tree.get()
    if node is None:
        return None
    return node.check()


class _Tree(Generic[TNode]):
    """A tree data structure of limit nodes.

    Each node has a pointer to its parent, or None if it is a root node.

    Each additional context manager inserts a new child node into the tree. The fact
    that there can be multiple execution contexts is what makes this a tree rather than
    a stack and why a context variable is used to store the leaf node.
    """

    def __init__(self, id: str) -> None:
        self._leaf_node: ContextVar[TNode | None] = ContextVar(id, default=None)

    def get(self) -> TNode | None:
        return self._leaf_node.get()

    def push(self, new_node: TNode) -> None:
        current_leaf = self._leaf_node.get()
        new_node.parent = current_leaf
        self._leaf_node.set(new_node)

    def pop(self) -> TNode:
        current_leaf = self._leaf_node.get()
        if current_leaf is None:
            raise RuntimeError("Limit tree is empty. Cannot pop from an empty tree.")
        self._leaf_node.set(current_leaf.parent)
        return current_leaf


token_limit_tree: _Tree[_TokenLimit] = _Tree("token_limit_tree")
cost_limit_tree: _Tree[_CostLimit] = _Tree("cost_limit_tree")
message_limit_tree: _Tree[_MessageLimit] = _Tree("message_limit_tree")
working_limit_tree: _Tree[_WorkingLimit] = _Tree("working_limit_tree")
time_limit_tree: _Tree[_TimeLimit] = _Tree("time_limit_tree")


class _Node:
    """Mixin for objects used as nodes in a limit tree.

    This allows us to have an "internal" parent property which is not exported as part
    of the public API.
    """

    parent: Self | None

    def _pop_and_check_identity(self, tree: _Tree[TNode]) -> None:
        popped = tree.pop()
        if popped is not self:
            raise RuntimeError(
                "The limit context manager being closed is not the leaf node in the "
                "tree. Make sure to open and close the context managers in a "
                "stack-like manner using a `with` statement."
            )


class _TokenLimit(Limit, _Node):
    def __init__(self, limit: int | None) -> None:
        from inspect_ai.model._model_output import ModelUsage

        super().__init__()
        self._validate_token_limit(limit)
        self._limit = limit
        self._usage = ModelUsage()

    def __enter__(self) -> Limit:
        super()._check_reuse()
        token_limit_tree.push(self)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        self._pop_and_check_identity(token_limit_tree)

    @property
    def usage(self) -> float:
        return self._usage.total_tokens

    @property
    def limit(self) -> int | None:
        """Get the configured token limit value."""
        return self._limit

    @limit.setter
    def limit(self, value: int | None) -> None:
        """Update the token limit value.

        This does not trigger a check of the token limit (which could now have been
        exceeded).
        """
        self._validate_token_limit(value)
        self._limit = value

    def record(self, usage: ModelUsage) -> None:
        """Record model usage for this node and its ancestor nodes."""
        if self.parent is not None:
            self.parent.record(usage)
        self._usage += usage

    def check(self) -> None:
        """Check if this token limit or any ancestor limits have been exceeded.

        The checks occur from root to leaf. This is so that if multiple limits are
        simultaneously exceeded, the outermost (closest to root) one raises the error,
        preventing certain sub-agent architectures from ending up in an infinite loop.
        """
        if self.parent is not None:
            self.parent.check()
        self._check_self()

    def _validate_token_limit(self, value: int | None) -> None:
        if value is not None and value < 0:
            raise ValueError(
                f"Token limit value must be a non-negative integer or None: {value}"
            )

    def _check_self(self) -> None:
        from inspect_ai.event._sample_limit import SampleLimitEvent
        from inspect_ai.log._transcript import transcript

        if self.limit is None:
            return
        total = self._usage.total_tokens
        if total > self.limit:
            message = f"Token limit exceeded. value: {total:,}; limit: {self.limit:,}"
            transcript()._event(
                SampleLimitEvent(type="token", limit=self.limit, message=message)
            )
            raise LimitExceededError(
                "token", value=total, limit=self.limit, message=message, source=self
            )


class _CostLimit(Limit, _Node):
    def __init__(self, limit: float | None) -> None:
        super().__init__()
        self._validate_cost_limit(limit)
        self._limit = limit
        self._cost: float = 0.0

    def __enter__(self) -> Limit:
        super()._check_reuse()
        cost_limit_tree.push(self)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        self._pop_and_check_identity(cost_limit_tree)

    @property
    def usage(self) -> float:
        return self._cost

    @property
    def limit(self) -> float | None:
        """Get the configured cost limit value."""
        return self._limit

    @limit.setter
    def limit(self, value: float | None) -> None:
        """Update the cost limit value.

        This does not trigger a check of the cost limit (which could now have been
        exceeded).
        """
        self._validate_cost_limit(value)
        self._limit = value

    def record(self, cost: float) -> None:
        """Record cost for this node and its ancestor nodes."""
        if self.parent is not None:
            self.parent.record(cost)
        self._cost += cost

    def check(self) -> None:
        """Check if this cost limit or any ancestor limits have been exceeded.

        The checks occur from root to leaf. This is so that if multiple limits are
        simultaneously exceeded, the outermost (closest to root) one raises the error,
        preventing certain sub-agent architectures from ending up in an infinite loop.
        """
        if self.parent is not None:
            self.parent.check()
        self._check_self()

    def _validate_cost_limit(self, value: float | None) -> None:
        if value is not None and value < 0:
            raise ValueError(
                f"Cost limit value must be a non-negative float or None: {value}"
            )

    def _check_self(self) -> None:
        from inspect_ai.event._sample_limit import SampleLimitEvent
        from inspect_ai.log._transcript import transcript

        if self.limit is None:
            return
        if self._cost > self.limit:
            message = f"Cost limit exceeded. value: ${self._cost:,.4f}; limit: ${self.limit:,.4f}"
            transcript()._event(
                SampleLimitEvent(type="cost", limit=self.limit, message=message)
            )
            raise LimitExceededError(
                "cost",
                value=self._cost,
                limit=self.limit,
                message=message,
                source=self,
            )


class _MessageLimit(Limit, _Node):
    def __init__(self, limit: int | None) -> None:
        super().__init__()
        self._validate_message_limit(limit)
        self._limit = limit

    def __enter__(self) -> Limit:
        super()._check_reuse()
        message_limit_tree.push(self)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        self._pop_and_check_identity(message_limit_tree)

    @property
    def usage(self) -> float:
        raise NotImplementedError(
            "Retrieving the message count from a limit is not supported. Please query "
            "the messages property on the task or agent state instead."
        )

    @property
    def limit(self) -> int | None:
        """Get the configured message limit value."""
        return self._limit

    @limit.setter
    def limit(self, value: int | None) -> None:
        """Update the message limit value.

        This will affect the limit for all active message limit nodes derived from this
        context manager.

        This does not trigger a check of the message limit (which could now have been
        exceeded).
        """
        self._validate_message_limit(value)
        self._limit = value

    def check(self, count: int, raise_for_equal: bool) -> None:
        """Check if this message limit has been exceeded.

        Does not check ancestors.
        """
        from inspect_ai.event._sample_limit import SampleLimitEvent
        from inspect_ai.log._transcript import transcript

        if self.limit is None:
            return
        if count > self.limit or (raise_for_equal and count == self.limit):
            reached_or_exceeded = "reached" if count == self.limit else "exceeded"
            message = (
                f"Message limit {reached_or_exceeded}. count: {count:,}; "
                f"limit: {self.limit:,}"
            )
            transcript()._event(
                SampleLimitEvent(type="message", limit=self.limit, message=message)
            )
            raise LimitExceededError(
                "message", value=count, limit=self.limit, message=message, source=self
            )

    def _validate_message_limit(self, value: int | None) -> None:
        if value is not None and value < 0:
            raise ValueError(
                f"Message limit value must be a non-negative integer or None: {value}"
            )


class _TimeLimit(Limit, _Node):
    def __init__(self, limit: float | None) -> None:
        super().__init__()
        _validate_time_limit("Time", limit)
        self._limit = limit
        self._start_time: float | None = None
        self._end_time: float | None = None

    def __enter__(self) -> Limit:
        super()._check_reuse()
        time_limit_tree.push(self)
        self._cancel_scope = anyio.move_on_after(self._limit)
        self._cancel_scope.__enter__()
        self._start_time = anyio.current_time()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        from inspect_ai.event._sample_limit import SampleLimitEvent
        from inspect_ai.log._transcript import transcript

        self._cancel_scope.__exit__(exc_type, exc_val, exc_tb)
        self._end_time = anyio.current_time()
        self._pop_and_check_identity(time_limit_tree)
        if self._cancel_scope.cancel_called and self._limit is not None:
            message = f"Time limit exceeded. limit: {self._limit} seconds"
            assert self._start_time is not None
            # Note we've measured the elapsed time independently of anyio's cancel scope
            # so this is an approximation.
            time_elapsed = self._end_time - self._start_time
            transcript()._event(
                SampleLimitEvent(type="time", message=message, limit=self._limit)
            )
            raise LimitExceededError(
                "time",
                value=time_elapsed,
                limit=self._limit,
                message=message,
                source=self,
            ) from exc_val

    @property
    def limit(self) -> float | None:
        return self._limit

    @property
    def usage(self) -> float:
        if self._start_time is None:
            return 0.0
        if self._end_time is None:
            return anyio.current_time() - self._start_time
        return self._end_time - self._start_time


class _WorkingLimit(Limit, _Node):
    def __init__(self, limit: float | None) -> None:
        super().__init__()
        _validate_time_limit("Working time", limit)
        self._limit = limit
        self.parent: _WorkingLimit | None = None
        self._start_time: float | None = None
        self._end_time: float | None = None

    def __enter__(self) -> Limit:
        super()._check_reuse()
        self._start_time = anyio.current_time()
        self._waiting_time = 0.0
        working_limit_tree.push(self)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        self._end_time = anyio.current_time()
        self._pop_and_check_identity(working_limit_tree)

    @property
    def limit(self) -> float | None:
        return self._limit

    @property
    def usage(self) -> float:
        if self._start_time is None:
            return 0.0
        if self._end_time is None:
            return anyio.current_time() - self._start_time - self._waiting_time
        return self._end_time - self._start_time - self._waiting_time

    def record_waiting_time(self, waiting_time: float) -> None:
        """Record waiting time for this node and its ancestor nodes."""
        if self.parent is not None:
            self.parent.record_waiting_time(waiting_time)
        self._waiting_time += waiting_time

    def check(self) -> LimitExceededError | None:
        """Check if this working time limit or any ancestor limits have been exceeded.

        The checks occur from root to leaf. This is so that if multiple limits are
        simultaneously exceeded, the outermost (closest to root) one raises the error,
        preventing certain sub-agent architectures from ending up in an infinite loop.
        """
        if self.parent is not None:
            error = self.parent.check()
            if error is not None:
                return error
        return self._check_self()

    def _check_self(self) -> LimitExceededError | None:
        if self._limit is None:
            return None
        if self.usage > self._limit:
            message = f"Working time limit exceeded. limit: {self._limit} seconds"
            return LimitExceededError(
                "working",
                value=self.usage,
                limit=self._limit,
                message=message,
                source=self,
            )
        else:
            return None


def _validate_time_limit(name: str, value: float | None) -> None:
    if value is not None and value < 0:
        raise ValueError(
            f"{name} limit value must be a non-negative float or None: {value}"
        )


class _LimitData(Limit):
    """Limit which copies its values from another limit."""

    def __init__(self, limit: Limit, *, usage: float | None = None) -> None:
        self._limit = limit.limit
        self._usage = usage if usage is not None else limit.usage

    @override
    def __enter__(self) -> Limit:
        return self

    @override
    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        pass

    @property
    @override
    def limit(self) -> float | None:
        return self._limit

    @property
    @override
    def usage(self) -> float:
        return self._usage
```

## `util/_limited_conversation.py`

```python
from itertools import tee
from typing import Iterable, SupportsIndex, overload

from inspect_ai.model._chat_message import ChatMessage, ChatMessageBase
from inspect_ai.util._limit import check_message_limit


class ChatMessageList(list[ChatMessage]):
    """A limited list of ChatMessage items.

    Raises an exception if an operation would exceed the active message limit.
    """

    def __init__(self, iterable: Iterable[ChatMessage]):
        items, length = self._iterable_length(iterable)
        self._check_size(length)
        super().__init__(items)

    def _check_size(self, additional_items: int) -> None:
        check_message_limit(len(self) + additional_items, raise_for_equal=False)

    def append(self, item: ChatMessage) -> None:
        self._check_size(1)
        super().append(item)

    def extend(self, items: Iterable[ChatMessage]) -> None:
        items, length = self._iterable_length(items)
        self._check_size(length)
        super().extend(items)

    def insert(self, index: SupportsIndex, item: ChatMessage) -> None:
        self._check_size(1)
        super().insert(index, item)

    @overload
    def __setitem__(self, index: SupportsIndex, item: ChatMessage) -> None: ...

    @overload
    def __setitem__(self, index: slice, item: Iterable[ChatMessage]) -> None: ...

    def __setitem__(
        self, index: SupportsIndex | slice, item: ChatMessage | Iterable[ChatMessage]
    ) -> None:
        if isinstance(index, slice) and not isinstance(item, ChatMessageBase):
            item, length = self._iterable_length(item)
            size_change = length - len(self[index])
            if size_change > 0:
                self._check_size(size_change)

        super().__setitem__(index, item)  # type: ignore[assignment,index]

    def _iterable_length(
        self, items: Iterable[ChatMessage]
    ) -> tuple[Iterable[ChatMessage], int]:
        items, counter = tee(items)
        length = sum(1 for _ in counter)
        return items, length
```

## `util/_panel.py`

```python
from typing import Any, Protocol, TypeVar

from textual.containers import Container
from typing_extensions import Self


class InputPanel(Container):
    """Base class for for Inspect input panels."""

    DEFAULT_TITLE = "Panel"

    DEFAULT_CLASSES = "task-input-panel"

    DEFAULT_CSS = """
    InputPanel {
        padding: 0 1 1 1;
    }
    """

    class Host(Protocol):
        def set_title(self, title: str) -> None: ...
        def activate(self) -> None: ...
        def deactivate(self) -> None: ...
        def close(self) -> None: ...

    def __init__(self, host: Host) -> None:
        """Initialise the panel.

        Panels are created as required by the input_panel() function so
        you should NOT override __init__ with your own initisation (rather,
        you should define reactive props and/or methods that perform
        initialisation).

        You should also override the `DEFAULT_TITLE` variable for your panel to
        provide a default tab title (you can change the table dynamically as
        required using the `title` property).

        Args:
           host (InputPanel.Host): Interface to UI host of input panel.
        """
        super().__init__()
        self._title = self.DEFAULT_TITLE
        self._host = host

    async def __aenter__(self) -> Self:
        self.activate()
        return self

    async def __aexit__(
        self,
        *execinfo: Any,
    ) -> None:
        self.close()

    @property
    def title(self) -> str:
        return self._title

    @title.setter
    def title(self, title: str) -> None:
        self._title = title
        self._host.set_title(title)

    def activate(self) -> None:
        self._host.activate()

    def deactivate(self) -> None:
        self._host.deactivate()

    def close(self) -> None:
        self._host.close()

    def update(self) -> None:
        """Update method (called periodically e.g. once every second)"""
        pass


TP = TypeVar("TP", bound=InputPanel, covariant=True)


async def input_panel(panel: type[TP]) -> TP:
    """Create an input panel in the task display.

    There can only be a single instance of an InputPanel with a given
    'title' running at once. Therefore, if the panel doesn't exist it
    is created, otherwise a reference to the existing panel is returned.

    Examples:
        Create/activate an input panel (the panel will remain after
        the scope exits -- see below for open/close semantics)

        ```python
        panel = await input_panel(CustomPanel)
        panel.activate()
        ```

        Activate and close an input panel using a context manager:

        ```python
        async with await input_panel(CustomPanel) as panel:
            ...
        ```

    Args:
       panel (type[TP]): Type of panel widget (must derive from `InputPanel`)

    Returns:
       InputPanel: Instance of widget running in the task display.

    Raises:
       NotImplementedError: If Inspect is not running in display='full' model.
    """
    from inspect_ai._display.core.active import task_screen

    return await task_screen().input_panel(panel)
```

## `util/_resource.py`

```python
import errno
from typing import Any, Literal
from urllib.parse import urlparse
from urllib.request import url2pathname

from inspect_ai._util.file import file, filesystem


def resource(
    resource: str,
    type: Literal["auto", "file"] = "auto",
    fs_options: dict[str, Any] = {},
) -> str:
    """Read and resolve a resource to a string.

    Resources are often used for templates, configuration, etc.
    They are sometimes hard-coded strings, and sometimes paths
    to external resources (e.g. in the local filesystem or
    remote stores e.g. s3:// or https://).

    The `resource()` function will resolve its argument to
    a resource string. If a protocol-prefixed file name
    (e.g. s3://) or the path to a local file that exists
    is passed then it will be read and its contents returned.
    Otherwise, it will return the passed `str` directly
    This function is mostly intended as a helper for other
    functions that take either a string or a resource path
    as an argument, and want to easily resolve them to
    the underlying content.

    If you want to ensure that only local or remote files
    are consumed, specify `type="file"`. For example:
    `resource("templates/prompt.txt", type="file")`

    Args:
        resource: Path to local or remote (e.g. s3://)
            resource, or for `type="auto"` (the default),
            a string containing the literal resource value.
        type: For "auto" (the default),
            interpret the resource as a literal string if its not
            a valid path. For "file", always interpret it as
            a file path.
        fs_options: Optional. Additional
            arguments to pass through to the `fsspec` filesystem
            provider (e.g. `S3FileSystem`). Use `{"anon": True }`
            if you are accessing a public S3 bucket with no
            credentials.

    Returns:
       Text content of resource.
    """

    # helper function to read the resource as a file
    def read_resource() -> str:
        with file(resource, "r", fs_options=fs_options) as f:
            return f.read()

    if type == "file":
        return read_resource()
    else:
        # parse the url
        try:
            parsed = urlparse(resource)
        except (ValueError, OSError):
            return resource

        # if it has a scheme then its likely a file
        if parsed.scheme:
            try:
                return read_resource()
            except (ValueError, FileNotFoundError):
                return resource
            except OSError as ex:
                if ex.errno == errno.ENAMETOOLONG:
                    return resource
                else:
                    raise ex

        # no scheme means either a local file or a string
        else:
            # extract the path
            try:
                path = url2pathname(parsed.path)
            except (ValueError, OSError):
                return resource

            # check if there is a path (otherwise return the str)
            if len(path) == 0:
                return resource

            # return it if it exists (otherwise return the str)
            try:
                fs = filesystem(path)
                if fs.exists(path):
                    return read_resource()
                else:
                    return resource
            except ValueError:
                return resource
```

## `util/_sandbox/__init__.py`

```python
# note: unused imports are still required to ensure that our built-in sandbox environments are registered

from .compose import (
    ComposeBuild,
    ComposeConfig,
    ComposeHealthcheck,
    ComposeService,
    is_compose_yaml,
    is_dockerfile,
    parse_compose_yaml,
)
from .context import sandbox, sandbox_default, sandbox_with
from .docker.docker import DockerSandboxEnvironment  # noqa: F401
from .environment import (
    SandboxConnection,
    SandboxEnvironment,
    SandboxEnvironmentConfigType,
    SandboxEnvironments,
    SandboxEnvironmentSpec,
    SandboxEnvironmentType,
)
from .events import SandboxTimeoutError
from .exec_remote import (
    ExecCompleted,
    ExecOutput,
    ExecRemoteAwaitableOptions,
    ExecRemoteProcess,
    ExecRemoteStreamingOptions,
    ExecStderr,
    ExecStdout,
)
from .limits import OutputLimitExceededError, SandboxEnvironmentLimits
from .local import LocalSandboxEnvironment  # noqa: F401
from .registry import sandboxenv
from .service import sandbox_service

__all__ = [
    "ComposeBuild",
    "ComposeConfig",
    "ComposeHealthcheck",
    "ComposeService",
    "ExecCompleted",
    "ExecOutput",
    "ExecRemoteAwaitableOptions",
    "ExecRemoteProcess",
    "ExecRemoteStreamingOptions",
    "ExecStderr",
    "ExecStdout",
    "is_compose_yaml",
    "is_dockerfile",
    "OutputLimitExceededError",
    "parse_compose_yaml",
    "SandboxEnvironment",
    "SandboxEnvironmentConfigType",
    "SandboxEnvironmentLimits",
    "SandboxEnvironments",
    "SandboxEnvironmentSpec",
    "SandboxEnvironmentType",
    "SandboxConnection",
    "SandboxTimeoutError",
    "sandboxenv",
    "sandbox",
    "sandbox_with",
    "sandbox_default",
    "sandbox_service",
]
```

## `util/_sandbox/_cli.py`

```python
"""Path to the sandbox CLI binary injected into sandbox environments.

We choose /var/tmp as the injection location since:
  1) it is accessible in all major linux distributions
  2) all users have permissions to read/write to it (i.e. world-writable)
  3) it is unlikely to be cleared during an evaluation
     (https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard)
  4) it is unlikely to be accidentally stumbled upon by an LLM solving a
     task that requires interacting with temp files

We additionally choose a dot-prefixed random hash sub-directory to further
attempt to prevent LLMs from stumbling on the injected tools.
"""

# Also defined in inspect_ai.tool._sandbox_tools_utils._build_config — keep in sync.
SANDBOX_TOOLS_BASE_NAME = "inspect-sandbox-tools"

SANDBOX_CLI = f"/var/tmp/.da7be258e003d428/{SANDBOX_TOOLS_BASE_NAME}"
```

## `util/_sandbox/_json_rpc_transport.py`

```python
"""JSON-RPC transport implementation for sandbox environments."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from inspect_ai._util._json_rpc import (
    JSONRPCParamsType,
    JSONRPCTransport,
    create_json_rpc_request,
    rpc_call_description,
)

if TYPE_CHECKING:
    from .environment import SandboxEnvironment


class SandboxJSONRPCTransport(JSONRPCTransport):
    """A transport that uses a sandbox for RPC communication.

    This class implements the JSONRPCTransport protocol. The timeout and user
    parameters are passed via transport_extra_args in the __call__ method.
    """

    def __init__(
        self,
        sandbox: SandboxEnvironment,
        cli: str,
    ):
        """Initialize a new SandboxJSONRPCTransport.

        Args:
            sandbox: The sandbox environment to use.
            cli: The path to the cli available in the sandbox.
        """
        self.sandbox = sandbox
        self.cli = cli

    async def __call__(
        self,
        method: str,
        params: JSONRPCParamsType,
        is_notification: bool,
        **transport_extra_args: Any,
    ) -> str:
        """Execute an RPC request using the sandbox transport.

        Args:
            method: The JSON-RPC method to call.
            params: The parameters for the JSON-RPC method.
            is_notification: Whether this is a notification (no response expected).
            **transport_extra_args: Additional parameters including timeout and user.

        Returns:
            The response from the RPC call.

        Raises:
            RuntimeError: If the sandbox execution fails.
        """
        exec_result = await self.sandbox.exec(
            [self.cli, "exec"],
            input=create_json_rpc_request(method, params, is_notification),
            timeout=transport_extra_args.get("timeout", None),
            timeout_retry=transport_extra_args.get("timeout_retry", True),
            user=transport_extra_args.get("user", None),
            concurrency=transport_extra_args.get("concurrency", True),
        )

        if not exec_result.success:
            raise RuntimeError(
                f"Sandbox.exec failure executing {rpc_call_description(method, params)}: {exec_result.stderr}"
            )
        return exec_result.stdout
```

## `util/_sandbox/compose.py`

```python
"""Docker Compose file parsing for sandbox providers.

This module provides Pydantic models and utilities for parsing Docker Compose
files into typed structures that sandbox providers can use for configuration.

Sandbox providers can use these utilities to accept compose files as configuration,
enabling portability across different sandbox types (Docker, Modal, K8s, etc.).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Callable, TypeGuard, cast

import yaml
from pydantic import BaseModel, ConfigDict, Field, model_validator

from inspect_ai.util._sandbox.environment import SandboxEnvironment
from inspect_ai.util._sandbox.registry import registry_find_sandboxenv

COMPOSE_FILES = [
    "compose.yaml",
    "compose.yml",
    "docker-compose.yaml",
    "docker-compose.yml",
]

DOCKERFILE = "Dockerfile"

# Legacy auto-compose filename (written to working directory)
AUTO_COMPOSE_YAML = ".compose.yaml"

# Central directory for auto-compose files
AUTO_COMPOSE_SUBDIR = "docker-compose"

# Pattern for auto-compose filenames (e.g., "foo-compose.yaml", ".compose.yaml")
COMPOSE_PATTERN = re.compile(r"[-.]compose\.yaml$")


def is_compose_yaml(file: Any) -> TypeGuard[str]:
    """Check if a path is a Docker Compose file.

    Args:
        file: Path to check.

    Returns:
        True if the path is a compose file (compose.yaml, compose.yml,
        docker-compose.yaml, docker-compose.yml), an auto-generated
        compose file (.compose.yaml or in the auto-compose directory),
        or False otherwise.
    """
    if isinstance(file, str):
        path = Path(file)

        # Standard compose files
        if path.name in COMPOSE_FILES:
            return True

        # compose-alike files (e.g., ".compose.yaml", "foo-compose.yaml")
        if COMPOSE_PATTERN.search(path.name):
            return True

        # New auto-compose files (in central directory)
        # Use lazy import to avoid circular dependency with docker/config.py
        from inspect_ai._util.appdirs import inspect_data_dir

        auto_compose_dir = inspect_data_dir(AUTO_COMPOSE_SUBDIR)
        if path.parent == auto_compose_dir and path.suffix == ".yaml":
            return True

    return False


def is_dockerfile(file: Any) -> TypeGuard[str]:
    """Check if a path is a Dockerfile.

    Args:
        file: Path to check.

    Returns:
        True if the path is a Dockerfile (Dockerfile, name.Dockerfile,
        or Dockerfile.name), False otherwise.
    """
    if isinstance(file, str):
        path = Path(file)
        return path.stem == DOCKERFILE or path.suffix == f".{DOCKERFILE}"
    else:
        return False


class ComposeModel(BaseModel):
    """Base model that allows x- extensions while rejecting other unknown fields."""

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="before")
    @classmethod
    def allow_only_extensions(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        field_names = set(cls.model_fields.keys())
        # Also allow aliased field names (e.g., "x-default" for x_default)
        for field_info in cls.model_fields.values():
            if field_info.alias:
                field_names.add(field_info.alias)
        for key in data:
            if key not in field_names and not key.startswith("x-"):
                raise ValueError(f"Unknown field: '{key}'")
        return data

    @property
    def extensions(self) -> dict[str, Any]:
        """Get x- extension fields."""
        return self.model_extra or {}


class ComposeHealthcheck(ComposeModel):
    """Healthcheck configuration for a compose service."""

    test: list[str] | str | None = Field(default=None)
    """Command to run to check health."""

    interval: str | None = Field(default=None)
    """Time between health checks (e.g., '30s', '1m')."""

    timeout: str | None = Field(default=None)
    """Maximum time to wait for a check to complete."""

    start_period: str | None = Field(default=None)
    """Time to wait before starting health checks."""

    start_interval: str | None = Field(default=None)
    """Time between checks during the start period."""

    retries: int | None = Field(default=None)
    """Number of consecutive failures needed to consider unhealthy."""


class ComposeBuild(ComposeModel):
    """Build configuration for a compose service."""

    context: str | None = Field(default=None)
    """Path to the build context directory."""

    dockerfile: str | None = Field(default=None)
    """Path to the Dockerfile, relative to context."""


class ComposeResources(ComposeModel):
    """Resource limits/reservations for a compose service."""

    cpus: str | None = Field(default=None)
    """CPU limit (e.g., '0.5', '2')."""

    memory: str | None = Field(default=None)
    """Memory limit (e.g., '512m', '2g')."""


class ComposeDeviceReservation(ComposeModel):
    """Device reservation for GPU and other devices."""

    driver: str | None = Field(default=None)
    """Device driver (e.g., 'nvidia')."""

    count: int | str | None = Field(default=None)
    """Number of devices to reserve, or 'all'."""

    device_ids: list[str] | None = Field(default=None)
    """Specific device IDs to reserve."""

    capabilities: list[str] | None = Field(default=None)
    """Required device capabilities (e.g., ['gpu'])."""

    options: dict[str, str] | None = Field(default=None)
    """Driver-specific options."""


class ComposeResourceReservations(ComposeModel):
    """Resource reservations including devices."""

    cpus: str | None = Field(default=None)
    """Reserved CPU (e.g., '0.5', '2')."""

    memory: str | None = Field(default=None)
    """Reserved memory (e.g., '512m', '2g')."""

    devices: list[ComposeDeviceReservation] | None = Field(default=None)
    """Device reservations (e.g., GPUs)."""


class ComposeResourceConfig(ComposeModel):
    """Deploy resources configuration."""

    limits: ComposeResources | None = Field(default=None)
    """Resource limits for the service."""

    reservations: ComposeResourceReservations | None = Field(default=None)
    """Resource reservations for the service."""


class ComposeDeploy(ComposeModel):
    """Deploy configuration for a compose service."""

    resources: ComposeResourceConfig | None = Field(default=None)
    """Resource limits and reservations."""


class ComposeService(ComposeModel):
    """A service definition from a compose file."""

    image: str | None = Field(default=None)
    """Docker image to use (e.g., 'python:3.11')."""

    build: ComposeBuild | str | None = Field(default=None)
    """Build configuration or path to build context."""

    command: list[str] | str | None = Field(default=None)
    """Command to run in the container."""

    entrypoint: list[str] | str | None = Field(default=None)
    """Entrypoint for the container."""

    working_dir: str | None = Field(default=None)
    """Working directory inside the container."""

    environment: list[str] | dict[str, str | None] | None = Field(default=None)
    """Environment variables."""

    env_file: list[str] | str | None = Field(default=None)
    """Path(s) to file(s) containing environment variables."""

    user: str | None = Field(default=None)
    """User to run the container as."""

    healthcheck: ComposeHealthcheck | None = Field(default=None)
    """Health check configuration."""

    ports: list[str | int] | None = Field(default=None)
    """Port mappings (host:container)."""

    expose: list[str | int] | None = Field(default=None)
    """Ports to expose without publishing to the host."""

    volumes: list[str] | None = Field(default=None)
    """Volume mounts."""

    networks: list[str] | dict[str, Any] | None = Field(default=None)
    """Networks to connect to."""

    network_mode: str | None = Field(default=None)
    """Network mode (e.g., 'host', 'none', 'bridge')."""

    hostname: str | None = Field(default=None)
    """Container hostname."""

    runtime: str | None = Field(default=None)
    """Runtime to use (e.g., 'nvidia')."""

    init: bool | None = Field(default=None)
    """Run an init process inside the container."""

    deploy: ComposeDeploy | None = Field(default=None)
    """Deployment configuration including resources."""

    mem_limit: str | None = Field(default=None)
    """Memory limit (shortcut for deploy.resources.limits.memory)."""

    mem_reservation: str | None = Field(default=None)
    """Memory reservation (shortcut for deploy.resources.reservations.memory)."""

    cpus: float | None = Field(default=None)
    """CPU limit (shortcut for deploy.resources.limits.cpus)."""

    x_default: bool | None = Field(default=None, alias="x-default")
    """Mark this service as the default for sandbox providers."""


class ComposeConfig(ComposeModel):
    """Parsed Docker Compose configuration."""

    services: dict[str, ComposeService]
    """Service definitions, keyed by service name."""

    volumes: dict[str, Any] | None = Field(default=None)
    """Volume definitions."""

    networks: dict[str, Any] | None = Field(default=None)
    """Network definitions."""

    def __hash__(self) -> int:
        """Make ComposeConfig hashable by hashing its JSON representation."""
        return hash(self.model_dump_json())

    def __eq__(self, other: object) -> bool:
        """Compare ComposeConfig objects by their content."""
        if not isinstance(other, ComposeConfig):
            return NotImplemented
        return self.model_dump() == other.model_dump()


def parse_compose_yaml(
    file: str,
    *,
    multiple_services: bool = True,
) -> ComposeConfig:
    """Parse a Docker Compose file into a ComposeConfig.

    Args:
        file: Path to the compose file.
        multiple_services: Whether the provider supports multiple services.
            If False and the compose file has multiple services, a ValueError
            will be raised.

    Returns:
        Parsed ComposeConfig.

    Raises:
        FileNotFoundError: If the compose file does not exist.
        ValueError: If the compose file is invalid or has multiple services
            when multiple_services=False.
    """
    path = Path(file)
    if not path.exists():
        raise FileNotFoundError(f"Compose file not found: {file}")

    with open(path) as f:
        raw = yaml.safe_load(f)

    if not isinstance(raw, dict):
        raise ValueError(f"Invalid compose file format: {file}")

    if "services" not in raw:
        raise ValueError(f"Compose file must have 'services' key: {file}")

    config = ComposeConfig.model_validate(raw)

    if not multiple_services and len(config.services) > 1:
        service_names = list(config.services.keys())
        raise ValueError(
            f"Provider does not support multiple services. "
            f"Found {len(config.services)} services: {service_names}"
        )

    return config


def is_docker_compatible_config(config: BaseModel | str | None) -> bool:
    if isinstance(config, str):
        return is_dockerfile(config) or is_compose_yaml(config)
    elif isinstance(config, ComposeConfig):
        return True
    else:
        return False


def is_docker_compatible_sandbox_type(
    sandbox_type: type[SandboxEnvironment] | str,
) -> bool:
    if isinstance(sandbox_type, str):
        sandbox_type = registry_find_sandboxenv(sandbox_type)

    is_docker_compatible_fn = cast(
        Callable[..., bool], getattr(sandbox_type, "is_docker_compatible")
    )

    return is_docker_compatible_fn()
```

## `util/_sandbox/context.py`

```python
import os
from contextlib import contextmanager
from contextvars import ContextVar
from logging import getLogger
from typing import Any, Awaitable, Callable, Iterator, NamedTuple, NoReturn, cast

import anyio
from shortuuid import uuid

from inspect_ai._util.constants import SANDBOX_SETUP_TIMEOUT
from inspect_ai.util._sandbox.events import SandboxEnvironmentProxy

from .environment import (
    SampleCleanup,
    SampleInit,
    SandboxConnection,
    SandboxEnvironment,
    SandboxEnvironmentConfigType,
)
from .registry import registry_find_sandboxenv

logger = getLogger(__name__)

# Type definitions for sandbox injection
Detector = Callable[["SandboxEnvironment"], Awaitable[bool]]
Injector = Callable[["SandboxEnvironment"], Awaitable[None]]


class SandboxInjectable(NamedTuple):
    """A detector/injector pair for sandbox injection.

    Attributes:
        detector: Function that checks if injection is needed.
        injector: Function that performs the injection.
    """

    detector: Detector
    injector: Injector


def sandbox(name: str | None = None) -> SandboxEnvironment:
    """Get the SandboxEnvironment for the current sample.

    Args:
      name (str | None): Optional sandbox environment name.

    Return:
      SandboxEnvironment instance.

    Raises:
      ProcessLookupError: If there are no sandboxes available.
      ValueError: If an invalid sandbox name is specified.
    """
    # verify we have a context
    environments = sandbox_environments_context_var.get(None)
    if not environments:
        raise raise_no_sandbox()

    # For None, 'default', or a single environment only take the first environment
    if name is None or name == "default" or len(environments) == 1:
        return default_sandbox_environment(environments)
    else:
        environment = environments.get(name, None)
        if not environment:
            raise ValueError(
                f"SandboxEnvironment '{name}' is not a recognized environment name."
            )
        return environment


async def sandbox_with(
    file: str, on_path: bool = False, *, name: str | None = None
) -> SandboxEnvironment | None:
    """Get the SandboxEnvironment for the current sample that has the specified file.

    Args:
      file (str): Path to file to check for if on_path is False. If on_path is
        True, file should be a filename that exists on the system path.
      on_path (bool): If True, file is a filename to be verified using "which".
        If False, file is a path to be checked within the sandbox environments.
      name (str | None): Optional sandbox environment name.


    Return:
      SandboxEnvironment instance or None if none of the sandboxes (or the named
      sandbox) had the file.
    """
    # get environments and with mapping
    environments = sandbox_environments_context_var.get(None)
    if environments is None:
        raise_no_sandbox()
    environments_with = sandbox_with_environments_context_var.get(None)
    if environments_with is None:
        raise_no_sandbox()

    # if we've already discovered the sandbox for this file then return it
    environment_with_key = f"{name or ''}:{file}:{on_path}"
    environment = environments_with.get(environment_with_key, None)
    if environment is not None:
        return environment

    # look in each (or the named) sandbox
    detector = sandbox_file_detector(file, on_path)
    for environment in (
        environments.values()
        if name is None
        else [named_env]
        if (named_env := environments.get(name, None))
        else []
    ):
        # can we find the file on the path?
        if await detector(environment):
            # if so this is our environment, cache and return it
            environments_with[environment_with_key] = environment
            return environment

    # not found
    return None


async def _is_file_readable(environment: SandboxEnvironment, file: str) -> bool:
    # Lightweight check — avoids transferring file contents (Linux/macOS).
    try:
        result = await environment.exec(["test", "-r", file])
        if result.success:
            return True
    except Exception:
        # Catch broadly because sandbox providers may raise a variety of
        # provider-specific exceptions that we can't predict here.
        pass

    # Fallback: read the file. Cross-platform but transfers full contents.
    try:
        await environment.read_file(file, False)
        return True
    # allow exception types known to be raised from read_file
    except (
        FileNotFoundError,
        UnicodeDecodeError,
        PermissionError,
        IsADirectoryError,
    ):
        return False


def sandbox_file_detector(file: str, on_path: bool = False) -> Detector:
    """Create a detector for use with sandbox_with_injection that checks a sandbox for file existence.

    Args:
        file: Path to file to check for if on_path is False. If on_path is
            True, file should be a filename that exists on the system path.
        on_path: If True, file is a filename to be verified using "which".
            If False, file is a path to be checked within the sandbox.

    Returns:
        Detector function that returns True if the file exists.
    """

    async def detect_on_path(sandbox: SandboxEnvironment) -> bool:
        return (await sandbox.exec(["which", file])).success

    async def detect_file(sandbox: SandboxEnvironment) -> bool:
        return await _is_file_readable(sandbox, file)

    return detect_on_path if on_path else detect_file


async def sandbox_with_injection(
    injectables: SandboxInjectable | list[SandboxInjectable],
    name: str | None = None,
    target: SandboxEnvironment | None = None,
) -> SandboxEnvironment:
    """Get a SandboxEnvironment that satisfies all the given injection requirements.

    Args:
        injectables: Single SandboxInjectable or list of SandboxInjectables.
            Each injectable is a (detector, injector) tuple.
        name: Optional sandbox environment name.
        target: Optional sandbox instance to inject into directly.

    Returns:
        SandboxEnvironment instance that satisfies all injection requirements.

    Raises:
        ProcessLookupError: If there are no sandboxes available.
        ValueError: If an invalid sandbox name is specified.
        RuntimeError: If injection fails.
    """
    if isinstance(injectables, tuple):
        injectables = [injectables]

    if target is not None:
        target_sandbox = target
    elif name:
        # Named sandbox: inject directly into the specified sandbox
        target_sandbox = sandbox(name)
    else:
        # Unnamed sandbox: find best candidate (fewest injections needed)
        target_sandbox, _ = await _get_injection_target(injectables)

    # belt and suspenders in case subclasses forget to call __init__
    if not hasattr(target_sandbox, "_inject_lock"):
        target_sandbox._inject_lock = anyio.Lock()

    async with target_sandbox._inject_lock:
        # refresh the needed injections
        needed_injections = await _get_needed_injections(target_sandbox, injectables)

        for detector, injector in needed_injections:
            await injector(target_sandbox)
            # Verify injection succeeded
            if not await detector(target_sandbox):
                raise RuntimeError(
                    "Injection failed - detector still returns False after injection"
                )

    return target_sandbox


async def sandbox_connections() -> dict[str, SandboxConnection]:
    environments = sandbox_environments_context_var.get(None)
    if environments:
        connections: dict[str, SandboxConnection] = {}
        for name, environment in environments.items():
            try:
                connections[name] = await environment.connection()
            except (NotImplementedError, ConnectionError):
                pass
        return connections
    else:
        return {}


def raise_no_sandbox() -> NoReturn:
    raise ProcessLookupError(
        "No sandbox environment has been provided for the current sample or task. "
        + "Please specify a sandbox for the sample or a global default sandbox for the task"
    )


async def init_sandbox_environments_sample(
    sandboxenv_type: type[SandboxEnvironment],
    task_name: str,
    config: SandboxEnvironmentConfigType | None,
    files: dict[str, bytes],
    setup: bytes | None,
    metadata: dict[str, Any],
) -> dict[str, SandboxEnvironment]:
    # get setup and cleanup functions
    sample_init = cast(SampleInit, getattr(sandboxenv_type, "sample_init"))
    sample_cleanup = cast(SampleCleanup, getattr(sandboxenv_type, "sample_cleanup"))

    # create environments
    environments = await sample_init(task_name, config, metadata)

    # verify that there is at least one environment and a 'default' env
    validate_sandbox_environments(sandboxenv_type, environments)

    # proxy environments (for recording SandboxEvent)
    environments = {k: SandboxEnvironmentProxy(v) for k, v in environments.items()}

    try:
        # set context
        sandbox_environments_context_var.set(environments)
        sandbox_with_environments_context_var.set({})
        default_name = next(iter(environments.keys()))
        sandbox_default_context_var.set(default_name)

        # copy files into environments
        await copy_sandbox_environment_files(files, environments)

        # run setup script
        if setup:
            await setup_sandbox_environment(setup, environments)

        # return environments
        return environments

    except Exception as ex:
        environments = unproxy_environments(environments)
        await sample_cleanup(task_name, config, environments, True)
        raise ex


async def cleanup_sandbox_environments_sample(
    type: str,
    task_name: str,
    config: SandboxEnvironmentConfigType | None,
    environments: dict[str, SandboxEnvironment],
    interrupted: bool,
) -> None:
    sandboxenv_type = registry_find_sandboxenv(type)
    sample_cleanup = cast(SampleCleanup, getattr(sandboxenv_type, "sample_cleanup"))
    environments = unproxy_environments(environments)
    await sample_cleanup(task_name, config, environments, interrupted)


def unproxy_environments(
    environments: dict[str, SandboxEnvironment],
) -> dict[str, SandboxEnvironment]:
    return {
        k: v._sandbox
        for k, v in cast(dict[str, SandboxEnvironmentProxy], environments).items()
    }


async def copy_sandbox_environment_files(
    files: dict[str, bytes], environments: dict[str, SandboxEnvironment]
) -> None:
    default_environment = default_sandbox_environment(environments)
    for file, contents in files.items():
        # does it have an environment prefix? if so target that env
        parts = file.split(":", maxsplit=1)
        if len(parts) > 1:
            envname = parts[0]
            file = parts[1]
            target_env = environments.get(envname, None)
            if not target_env:
                raise RuntimeError(
                    f"Environment referenced in sample file not found: '{envname}:{file}'. "
                    + "Note that ':' can be optionally used to specify an explicit environment name for sample files (e.g. 'envname:file') so cannot be used as a character within filenames."
                )
        else:
            target_env = default_environment

        await target_env.write_file(file, contents)


async def setup_sandbox_environment(
    setup: bytes, environments: dict[str, SandboxEnvironment]
) -> None:
    # get default sandboxenv
    env = default_sandbox_environment(environments)

    # copy to container
    setup_file = f"/tmp/{uuid()}"
    await env.write_file(setup_file, setup)

    # execute and then remove setup script (don't retry it on timeout
    # in case it is not idempotent)
    try:
        await env.exec(["chmod", "+x", setup_file], timeout=120)
        timeout = int(
            os.environ.get("INSPECT_SANDBOX_SETUP_TIMEOUT", SANDBOX_SETUP_TIMEOUT)
        )
        result = await env.exec(
            ["env", setup_file], timeout=timeout, timeout_retry=False
        )
        if not result.success:
            raise RuntimeError(
                f"Failed to execute setup script for sample: {result.stderr}"
            )
        await env.exec(["rm", setup_file], timeout=120)
    except TimeoutError:
        raise RuntimeError("Timed out executing setup command in sandbox")


def default_sandbox_environment(
    environments: dict[str, SandboxEnvironment],
) -> SandboxEnvironment:
    default_name = sandbox_default_context_var.get()
    if default_name in environments:
        return environments[default_name]
    else:
        raise ValueError(
            f"Default sandbox environment '{default_name}' not found in environments"
        )


def validate_sandbox_environments(
    type: type[SandboxEnvironment], environments: dict[str, SandboxEnvironment]
) -> None:
    if len(environments) == 0:
        raise ValueError(
            "No environments returned from sample_init() method "
            + f"of '{type.__name__}'. Did you provide an implementation "
            + "of the sample_init() class method? "
        )


@contextmanager
def sandbox_default(name: str) -> Iterator[None]:
    """Set the default sandbox environment for the current context.

    Args:
       name: Sandbox to set as the default.
    """
    token = sandbox_default_context_var.set(name)
    try:
        yield
    finally:
        sandbox_default_context_var.reset(token)


sandbox_environments_context_var = ContextVar[dict[str, SandboxEnvironment]](
    "sandbox_environments"
)

sandbox_with_environments_context_var = ContextVar[dict[str, SandboxEnvironment]](
    "sandbox_with_environments"
)

sandbox_default_context_var = ContextVar[str]("sandbox_default")


async def _get_injection_target(
    injectables: list[SandboxInjectable],
) -> tuple[SandboxEnvironment, list[SandboxInjectable]]:
    """Find the best sandbox for injection and return it with needed injections.

    Args:
        injectables: List of detector/injector pairs to evaluate.

    Returns:
        Tuple of (sandbox_environment, needed_injections) where needed_injections
        contains only the injectables that require injection into the sandbox.

    Raises:
        ProcessLookupError: If no sandboxes are available.
    """
    environments = sandbox_environments_context_var.get(None)
    if not environments:
        raise_no_sandbox()

    # Find sandbox needing fewest injections
    best_candidate: tuple[SandboxEnvironment, list[SandboxInjectable]] | None = None
    for sb in environments.values():
        needed_injections = await _get_needed_injections(sb, injectables)

        if len(needed_injections) == 0:
            return sb, []
        elif best_candidate is None:
            best_candidate = (sb, needed_injections)
        elif len(needed_injections) < len(best_candidate[1]):
            best_candidate = (sb, needed_injections)

    if not best_candidate:
        raise_no_sandbox()

    return best_candidate


async def _get_needed_injections(
    sb: SandboxEnvironment, injectables: list[SandboxInjectable]
) -> list[SandboxInjectable]:
    """Get list of injections needed for this sandbox."""
    return [
        injectable for injectable in injectables if not await injectable.detector(sb)
    ]
```

## `util/_sandbox/docker/cleanup.py`

```python
from contextvars import ContextVar
from logging import getLogger
from pathlib import Path
from typing import Awaitable, Callable, Set

import anyio
from rich import box, print
from rich.panel import Panel
from rich.table import Table

from inspect_ai._util._async import coro_print_exceptions
from inspect_ai._util.trace import trace_message

from .compose import compose_down, compose_ls, compose_ps
from .config import auto_compose_dir, is_auto_compose_file, safe_cleanup_auto_compose
from .util import TRACE_DOCKER, ComposeProject, is_inspect_project

logger = getLogger(__name__)


def project_cleanup_startup() -> None:
    _running_projects.set([])
    _auto_compose_files.set(set())
    _cleanup_completed.set(False)


def _cleanup_orphaned_auto_compose_files(running_project_names: set[str]) -> None:
    """Remove auto-compose files that no longer have running Docker projects.

    Args:
        running_project_names: Set of currently running inspect project names.

    This handles cleanup for files left behind by crashed processes.
    """
    compose_dir = auto_compose_dir()

    # Remove files for projects no longer running
    for file in compose_dir.iterdir():
        if file.suffix == ".yaml" and file.stem not in running_project_names:
            try:
                file.unlink()
            except Exception as ex:
                trace_message(
                    logger,
                    TRACE_DOCKER,
                    f"Failed to remove orphaned compose file {file}: {ex}",
                )


def project_startup(project: ComposeProject) -> None:
    # track running projects
    running_projects().append(project)

    # track auto compose we need to cleanup
    project_record_auto_compose(project)


def project_record_auto_compose(project: ComposeProject) -> None:
    if project.config and is_auto_compose_file(project.config):
        auto_compose_files().add(project.config)


async def project_cleanup(project: ComposeProject, quiet: bool = True) -> None:
    # bring down services
    await compose_down(project=project, quiet=quiet)

    # remove the project from the list of running projects
    if project in running_projects():
        running_projects().remove(project)


async def project_cleanup_shutdown(cleanup: bool) -> None:
    # cleanup is global so we do it only once
    if not _cleanup_completed.get():
        # get projects that still need shutting down
        shutdown_projects = running_projects().copy()

        # full cleanup if requested
        if len(shutdown_projects) > 0:
            if cleanup:
                await cleanup_projects(shutdown_projects)

            elif not _cleanup_completed.get():
                print("")
                table = Table(
                    title="Docker Sandbox Environments (not yet cleaned up):",
                    box=box.SQUARE_DOUBLE_HEAD,
                    show_lines=True,
                    title_style="bold",
                    title_justify="left",
                )
                table.add_column("Sample ID")
                table.add_column("Epoch")
                table.add_column("Container(s)", no_wrap=True)
                for project in shutdown_projects:
                    containers = await compose_ps(project, all=True)
                    table.add_row(
                        str(project.sample_id) if project.sample_id is not None else "",
                        str(project.epoch if project.epoch is not None else ""),
                        "\n".join(container["Name"] for container in containers),
                    )
                print(table)
                print(
                    "\n"
                    "Cleanup all containers  : [blue]inspect sandbox cleanup docker[/blue]\n"
                    "Cleanup single container: [blue]inspect sandbox cleanup docker <container-id>[/blue]",
                    "\n",
                )

        # remove auto-compose files
        for file in auto_compose_files().copy():
            safe_cleanup_auto_compose(file)

        _cleanup_completed.set(True)


async def cleanup_projects(
    projects: list[ComposeProject],
    cleanup_fn: Callable[[ComposeProject, bool], Awaitable[None]] = project_cleanup,
) -> None:
    # urge the user to let this operation complete
    print(
        Panel(
            "[bold][blue]Cleaning up Docker environments "
            + "(please do not interrupt this operation!):[/blue][/bold]",
        )
    )

    # cleanup all of the projects in parallel
    async with anyio.create_task_group() as tg:
        for project in projects:
            tg.start_soon(
                coro_print_exceptions,
                "cleaning up Docker environment",
                cleanup_fn,
                project,
                False,
            )


async def cli_cleanup(project_name: str | None) -> None:
    # enumerate all inspect projects
    projects = await compose_ls()

    # get set of running project names for orphan cleanup
    running_names = {p.Name for p in projects if is_inspect_project(p.Name)}

    # filter by project name
    if project_name:
        projects = list(filter(lambda p: p.Name == project_name, projects))

    # if the config files are missing then blank them out so we get auto-compose
    for project in projects:
        if project.ConfigFiles and not Path(project.ConfigFiles).exists():
            project.ConfigFiles = None

    # clean them up
    if len(projects) > 0:
        # create compose projects
        compose_projects = [
            await ComposeProject.create(name=project.Name, config=project.ConfigFiles)
            for project in projects
        ]

        # do the cleanup
        await cleanup_projects(compose_projects, cleanup_fn=compose_down)

        # remove auto compose files
        for compose_project in compose_projects:
            safe_cleanup_auto_compose(compose_project.config)

    # clean up orphaned auto-compose files from crashed processes
    _cleanup_orphaned_auto_compose_files(running_names)


def running_projects() -> list[ComposeProject]:
    return _running_projects.get()


def auto_compose_files() -> Set[str]:
    return _auto_compose_files.get()


_running_projects: ContextVar[list[ComposeProject]] = ContextVar(
    "docker_running_projects", default=[]
)

_auto_compose_files: ContextVar[Set[str]] = ContextVar("docker_auto_compose_files")

_cleanup_completed: ContextVar[bool] = ContextVar(
    "docker_cleanup_executed", default=False
)
```

## `util/_sandbox/docker/compose.py`

```python
import contextlib
import json
import os
import shlex
from logging import getLogger
from pathlib import Path
from typing import Any, Literal, cast

import yaml
from pydantic import BaseModel

from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.trace import trace_message
from inspect_ai.util._concurrency import concurrency as concurrency_manager
from inspect_ai.util._display import display_type, display_type_plain
from inspect_ai.util._subprocess import ExecResult, subprocess

from .prereqs import (
    DOCKER_COMPOSE_REQUIRED_VERSION_PULL_POLICY,
    validate_docker_compose,
)
from .service import ComposeService, services_healthcheck_time
from .util import TRACE_DOCKER, ComposeProject, is_inspect_project

logger = getLogger(__name__)

# How long to wait for compose environment to pass a health check
COMPOSE_WAIT = 600


async def compose_up(
    project: ComposeProject, services: dict[str, ComposeService]
) -> ExecResult[str]:
    # compute the maximum amount of time we will
    up_command = ["up", "--detach", "--wait"]

    # are there healthchecks in the service definitions? if so then peg our timeout
    # at the maximum total wait time. otherwise, pick a reasonable default
    healthcheck_time = services_healthcheck_time(services)
    if healthcheck_time > 0:
        timeout: int = healthcheck_time
        trace_message(
            logger, TRACE_DOCKER, f"Docker services healthcheck timeout: {timeout}"
        )
    else:
        timeout = COMPOSE_WAIT

    # align global wait timeout to maximum healthcheck timeout
    up_command.extend(["--wait-timeout", str(timeout + 1)])

    # Start the environment. Note that we don't check the result because docker will
    # return a non-zero exit code for services that exit (even successfully) when
    # passing the --wait flag (see https://github.com/docker/compose/issues/10596).
    # In practice, we will catch any errors when calling compose_check_running()
    # immediately after we call compose_up().
    result = await compose_command(up_command, project=project, timeout=timeout)
    return result


async def compose_down(project: ComposeProject, quiet: bool = True) -> None:
    # set cwd to config file directory
    cwd = os.path.dirname(project.config) if project.config else None

    # shut down docker containers. default internal timeout is 10 seconds
    # but we've seen reports of this handing, so add a proess timeout
    TIMEOUT = 300
    try:
        result = await compose_command(
            ["down", "--volumes"],
            project=project,
            cwd=cwd,
            timeout=TIMEOUT,
            capture_output=quiet,
            ansi="never",
        )

        if not result.success:
            msg = f"Failed to stop docker service {result.stderr}"
            logger.warning(msg)

    except TimeoutError:
        logger.warning(
            f"Docker compose down for project '{project.name}' timed out after {TIMEOUT} seconds."
        )

    try:
        await compose_cleanup_images(project=project, cwd=cwd, timeout=TIMEOUT)
    except TimeoutError:
        logger.warning(
            f"Docker image cleanup for project '{project.name}' timed out after {TIMEOUT} seconds."
        )


async def compose_cp(
    src: str,
    dest: str,
    project: ComposeProject,
    cwd: str | Path | None = None,
    output_limit: int | None = None,
) -> None:
    result = await compose_command(
        ["cp", "-L", "--", src, dest],
        project=project,
        timeout=600,  # 10-minute timeout for file copies
        cwd=cwd,
        output_limit=output_limit,
    )
    if not result.success:
        msg = f"Failed to copy file from '{src}' to '{dest}': {result.stderr}"
        raise RuntimeError(msg)


async def compose_check_running(
    services: list[str], project: ComposeProject
) -> list[str]:
    # Check to ensure that the status of containers is healthy
    running_services = await compose_ps(project=project, status="running")
    exited_services = await compose_ps(project=project, status="exited")
    successful_services = running_services + [
        service for service in exited_services if service["ExitCode"] == 0
    ]

    if len(successful_services) > 0:
        if len(successful_services) != len(services):
            unhealthy_services = services
            for successful_service in successful_services:
                unhealthy_services.remove(successful_service["Service"])
            return []
    else:
        return []

    return [service["Service"] for service in running_services]


async def compose_ps(
    project: ComposeProject,
    status: Literal[
        "paused", "restarting", "removing", "running", "dead", "created", "exited"
    ]
    | None = None,
    all: bool = False,
) -> list[dict[str, Any]]:
    command = ["ps", "--format", "json"]
    if all:
        command.append("--all")
    if status:
        command = command + ["--status", status]
    result = await compose_command(command, project=project, timeout=300)
    if not result.success:
        msg = f"Error querying for running services: {result.stderr}"
        raise RuntimeError(msg)

    output = result.stdout.strip()
    if len(output) > 0:
        return [
            cast(dict[str, Any], json.loads(service)) for service in output.split("\n")
        ]
    else:
        return []


async def compose_build(project: ComposeProject, capture_output: bool = False) -> None:
    result = await compose_command(
        ["build"],
        project=project,
        timeout=None,  # no timeout for build
        capture_output=capture_output,
    )
    if not result.success:
        msg = "Failed to build docker containers"
        raise PrerequisiteError(msg)


async def compose_pull(
    service: str, project: ComposeProject, capture_output: bool = False
) -> ExecResult[str]:
    await validate_docker_compose(DOCKER_COMPOSE_REQUIRED_VERSION_PULL_POLICY)

    return await compose_command(
        ["pull", "--ignore-buildable", "--policy", "missing", service],
        project=project,
        timeout=None,  # no timeout for pull
        capture_output=capture_output,
    )


async def compose_exec(
    command: list[str],
    *,
    project: ComposeProject,
    timeout: int | None,
    timeout_retry: bool = True,
    concurrency: bool = True,
    input: str | bytes | None = None,
    output_limit: int | None = None,
) -> ExecResult[str]:
    return await compose_command(
        ["exec"] + command,
        project=project,
        timeout=timeout,
        timeout_retry=timeout_retry,
        input=input,
        forward_env=False,
        output_limit=output_limit,
        concurrency=concurrency,
    )


async def compose_services(project: ComposeProject) -> dict[str, ComposeService]:
    result = await compose_command(["config"], project=project, timeout=300)
    if not result.success:
        raise RuntimeError(f"Error reading docker config: {result.stderr}")
    return cast(dict[str, ComposeService], yaml.safe_load(result.stdout)["services"])


class Project(BaseModel):
    Name: str
    Status: str
    ConfigFiles: str | None


async def compose_ls() -> list[Project]:
    result = await subprocess(["docker", "compose", "ls", "--all", "--format", "json"])
    if result.success:
        projects: list[dict[str, Any]] = json.loads(result.stdout)
        projects = list(filter(lambda p: is_inspect_project(p["Name"]), projects))
        return [Project(**project) for project in projects]
    else:
        raise RuntimeError(result.stderr)


async def compose_cleanup_images(
    project: ComposeProject,
    *,
    cwd: str | None = None,
    timeout: int | None,
) -> None:
    # List the images that would be created for this compose
    images_result = await compose_command(
        ["config", "--images"], project=project, timeout=timeout, cwd=cwd
    )

    # Remove those images explicitly
    if images_result.success:
        for image in images_result.stdout.strip().split("\n"):
            # See if this image was created by
            # inspect directly
            if image.startswith(project.name):
                # see if this image is present
                image_result = await subprocess(
                    ["docker", "images", "-q", image],
                    timeout=timeout,
                    capture_output=True,
                )

                remove_image = True
                if image_result.success:
                    remove_image = len(image_result.stdout) != 0

                # remove the image
                if remove_image:
                    result = await subprocess(
                        ["docker", "rmi", image],
                        timeout=timeout,
                        capture_output=True,
                    )
                    if not result.success:
                        msg = f"Failed to cleanup docker image {result.stderr}"
                        logger.warning(msg)


async def compose_command(
    command: list[str],
    *,
    project: ComposeProject,
    timeout: int | None,
    timeout_retry: bool = True,
    concurrency: bool = True,
    input: str | bytes | None = None,
    cwd: str | Path | None = None,
    forward_env: bool = True,
    capture_output: bool = True,
    output_limit: int | None = None,
    ansi: Literal["never", "always", "auto"] | None = None,
) -> ExecResult[str]:
    # The base docker compose command
    compose_command = ["docker", "compose"]

    # env to forward
    env = project.env if (project.env and forward_env) else {}

    # ansi (apply global override)
    if display_type_plain():
        ansi = "never"
    if ansi:
        compose_command = compose_command + ["--ansi", ansi]

    # quiet if display is none
    if display_type() == "none":
        compose_command = compose_command + ["--progress", "quiet"]

    # add project scope
    compose_command = compose_command + ["--project-name", project.name]

    # add config file if specified
    if project.config:
        compose_command = compose_command + ["-f", project.config]

    # build final command
    compose_command = compose_command + command

    # set a concurrency limit for docker CLI invocations.
    # this should help with running more containers in parallel while avoiding hangs on some systems
    DEFAULT_CLI_CONCURRENCY = max((os.cpu_count() or 1) * 2, 4)
    docker_cli_concurrency = int(
        os.environ.get("INSPECT_DOCKER_CLI_CONCURRENCY", DEFAULT_CLI_CONCURRENCY)
    )

    # function to run command (wrapped in concurrency limiter)
    async def run_command(command_timeout: int | None) -> ExecResult[str]:
        concurrency_ctx = (
            concurrency_manager("docker-cli", docker_cli_concurrency, visible=False)
            if concurrency
            else contextlib.nullcontext()
        )
        async with concurrency_ctx:
            result = await subprocess(
                compose_command,
                input=input,
                cwd=cwd,
                env=env,
                timeout=command_timeout,
                capture_output=capture_output,
                output_limit=output_limit,
                concurrency=concurrency,
            )
            return result

    # we have observed underlying unreliability in docker compose in some linux
    # environments on EC2 -- this exhibits in very simple commands (e.g. compose config)
    # simply never returning. this tends to happen when we know there is a large
    # number of commands in flight (task/sample init) so could be some sort of
    # timing issue / race condition in the docker daemon. we've also observed that
    # these same commands succeed if you just retry them. therefore, we add some
    # extra resiliance by retrying commands with a timeout once. we were observing
    # commands hanging at a rate of ~ 1/1000, so we retry up to twice (tweaking the
    # retry time down) to make the odds of hanging vanishingly small

    if timeout is not None:
        MAX_RETRIES = 2
        retries = 0
        while True:
            try:
                command_timeout = max(
                    timeout if retries == 0 else (min(timeout, 60) // retries), 1
                )
                return await run_command(command_timeout)
            except TimeoutError as e:
                retries += 1
                if timeout_retry and (retries <= MAX_RETRIES):
                    logger.info(
                        f"Retrying docker compose command: {shlex.join(compose_command)}"
                    )
                else:
                    raise TimeoutError(
                        f"Docker compose command '{command}' timed out after {timeout} seconds"
                    ) from e

    else:
        return await run_command(timeout)
```

## `util/_sandbox/docker/config.py`

```python
import os
from logging import getLogger
from pathlib import Path

import yaml

from inspect_ai._util.appdirs import inspect_data_dir

from ..compose import AUTO_COMPOSE_SUBDIR, AUTO_COMPOSE_YAML, COMPOSE_FILES, DOCKERFILE

logger = getLogger(__name__)


def auto_compose_dir() -> Path:
    """Get the directory for storing auto-generated compose files."""
    return inspect_data_dir(AUTO_COMPOSE_SUBDIR)


def resolve_compose_file(parent: str = "", project_name: str | None = None) -> str:
    """Resolve compose file, creating auto-compose if needed.

    Args:
        parent: Directory to search for existing compose/Dockerfile
        project_name: If provided, auto-compose files go to central directory
    """
    # existing compose file provides all the config we need
    compose = find_compose_file(parent)
    if compose is not None:
        return Path(os.path.join(parent, compose)).resolve().as_posix()

    # temporary auto-compose in local dir (legacy pattern)
    if has_auto_compose_file(parent):
        return Path(os.path.join(parent, AUTO_COMPOSE_YAML)).resolve().as_posix()

    # dockerfile just needs a compose.yaml synthesized
    if has_dockerfile(parent):
        if project_name:
            return auto_compose_file(
                COMPOSE_DOCKERFILE_YAML.format(dockerfile=DOCKERFILE),
                project_name,
                base_dir=Path(parent).resolve().as_posix() if parent else os.getcwd(),
            )
        # Fallback for calls without project_name
        return _auto_compose_file_local(
            COMPOSE_DOCKERFILE_YAML.format(dockerfile=DOCKERFILE), parent
        )

    # otherwise provide a generic python container
    if project_name:
        return auto_compose_file(COMPOSE_GENERIC_YAML, project_name)
    return _auto_compose_file_local(COMPOSE_GENERIC_YAML, parent)


def find_compose_file(parent: str = "") -> str | None:
    for file in COMPOSE_FILES:
        if os.path.isfile(os.path.join(parent, file)):
            return file
    return None


def has_dockerfile(parent: str = "") -> bool:
    return os.path.isfile(os.path.join(parent, DOCKERFILE))


def has_auto_compose_file(parent: str = "") -> bool:
    return os.path.isfile(os.path.join(parent, AUTO_COMPOSE_YAML))


def is_auto_compose_file(file: str) -> bool:
    """Check if a file is an auto-generated compose file.

    Recognizes both patterns:
    - New pattern: file is in the central auto-compose directory
    - Legacy pattern: filename is .compose.yaml
    """
    path = Path(file)
    # New pattern: file is in the auto-compose directory
    if path.parent == auto_compose_dir():
        return True
    # Legacy pattern: filename is .compose.yaml
    return path.name == AUTO_COMPOSE_YAML


def ensure_auto_compose_file(file: str | None, project_name: str | None = None) -> None:
    """Ensure auto-compose file exists, recreating if necessary.

    Args:
        file: Path to the compose file
        project_name: Project name for central directory files
    """
    if file is not None and is_auto_compose_file(file) and not os.path.exists(file):
        path = Path(file)
        # For central directory files, we need project_name to recreate
        if project_name and path.parent == auto_compose_dir():
            resolve_compose_file(project_name=project_name)
        else:
            # Legacy local file - recreate in place
            resolve_compose_file(os.path.dirname(file))


def safe_cleanup_auto_compose(file: str | None) -> None:
    if file:
        try:
            if is_auto_compose_file(file) and os.path.exists(file):
                os.unlink(file)
        except Exception as ex:
            logger.warning(f"Error cleaning up compose file: {ex}")


COMPOSE_COMMENT = """# inspect auto-generated docker compose file
# (will be removed when task is complete)"""

COMPOSE_GENERIC_YAML = f"""{COMPOSE_COMMENT}
services:
  default:
    image: "aisiuk/inspect-tool-support"
    command: "tail -f /dev/null"
    init: true
    network_mode: none
    stop_grace_period: 1s
"""

COMPOSE_DOCKERFILE_YAML = f"""{COMPOSE_COMMENT}
services:
  default:
    build:
      context: "."
      dockerfile: "{{dockerfile}}"
    command: "tail -f /dev/null"
    init: true
    network_mode: none
    stop_grace_period: 1s
"""


def auto_compose_file(
    contents: str, project_name: str, base_dir: str | None = None
) -> str:
    """Write auto-compose file for a project to the central directory.

    Args:
        contents: The YAML content to write
        project_name: Unique project name (used as filename)
        base_dir: Directory to resolve relative build paths against (e.g., CWD)

    Returns:
        Absolute path to the created compose file
    """
    if base_dir:
        contents = _update_build_context(contents, base_dir)

    compose_dir = auto_compose_dir()
    path = compose_dir / f"{project_name}.yaml"
    with open(path, "w", encoding="utf-8") as f:
        f.write(contents)
    return path.resolve().as_posix()


def _auto_compose_file_local(contents: str, parent: str = "") -> str:
    """Fallback: Write auto-compose file to local directory (for backward compat)."""
    path = os.path.join(parent, AUTO_COMPOSE_YAML)
    with open(path, "w", encoding="utf-8") as f:
        f.write(contents)
    return Path(path).resolve().as_posix()


def _update_build_context(yaml_content: str, base_dir: str) -> str:
    """Resolve relative build.context paths to absolute paths.

    When auto-compose files are stored in a central directory, relative paths
    like "." won't work. This resolves relative paths against base_dir,
    leaving absolute paths unchanged.

    Args:
        yaml_content: The YAML content to update
        base_dir: Base directory to resolve relative paths against (e.g., CWD)

    Returns:
        Updated YAML content with absolute build context paths
    """
    data = yaml.safe_load(yaml_content)
    if data and "services" in data:
        for service in data["services"].values():
            if "build" in service:
                if isinstance(service["build"], dict):
                    ctx = service["build"].get("context", ".")
                    if not Path(ctx).is_absolute():
                        # Resolve relative path against base_dir
                        service["build"]["context"] = str(Path(base_dir) / ctx)
                elif isinstance(service["build"], str):
                    # build is just a context path string
                    ctx = service["build"]
                    if not Path(ctx).is_absolute():
                        service["build"] = {"context": str(Path(base_dir) / ctx)}
    return yaml.dump(data, default_flow_style=False, sort_keys=False)
```

## `util/_sandbox/docker/docker.py`

```python
import base64
import errno
import json
import os
import shlex
import tempfile
from logging import getLogger
from pathlib import Path, PurePosixPath
from typing import Literal, NamedTuple, Union, overload

from typing_extensions import override

from inspect_ai._util.error import PrerequisiteError
from inspect_ai.util._subprocess import ExecResult, subprocess

from ..compose import COMPOSE_FILES, DOCKERFILE, ComposeConfig
from ..environment import (
    HostMapping,
    PortMapping,
    SandboxConnection,
    SandboxEnvironment,
    SandboxEnvironmentConfigType,
)
from ..limits import (
    SandboxEnvironmentLimits,
    verify_read_file_size,
)
from ..registry import sandboxenv
from .cleanup import (
    cli_cleanup,
    project_cleanup,
    project_cleanup_shutdown,
    project_cleanup_startup,
    project_record_auto_compose,
    project_startup,
)
from .compose import (
    compose_build,
    compose_check_running,
    compose_cleanup_images,
    compose_cp,
    compose_exec,
    compose_ps,
    compose_pull,
    compose_services,
    compose_up,
)
from .internal import build_internal_image, is_internal_image
from .prereqs import validate_prereqs
from .util import ComposeProject, task_project_name

logger = getLogger(__name__)


@sandboxenv(name="docker")
class DockerSandboxEnvironment(SandboxEnvironment):
    @classmethod
    def config_files(cls) -> list[str]:
        return COMPOSE_FILES + [DOCKERFILE]

    @classmethod
    def is_docker_compatible(cls) -> bool:
        return True

    @classmethod
    def default_concurrency(cls) -> int | None:
        count = os.cpu_count() or 1
        return 2 * count

    @classmethod
    async def task_init(
        cls, task_name: str, config: SandboxEnvironmentConfigType | None
    ) -> None:
        # validate prereqs
        await validate_prereqs()

        # intialize project cleanup
        project_cleanup_startup()

        try:
            # create project
            project = await ComposeProject.create(
                name=task_project_name(task_name), config=config
            )

            # record auto compose
            project_record_auto_compose(project)

            # build containers which are out of date
            await compose_build(project)

            # cleanup images created during build
            await compose_cleanup_images(project, timeout=300)

            services = await compose_services(project)
            for name, service in services.items():
                # if the service has an explicit container_name then
                # error (as this won't work w/ epochs > 1)
                container_name = service.get("container_name", None)
                if container_name:
                    raise PrerequisiteError(
                        f"ERROR: Docker service '{name}' includes an explicitly configured container_name ('{container_name}'). This is not permitted, as container names should be provisioned by Docker compose and an explicit container_name will not work with epochs > 1."
                    )

                # build internal images
                image = service.get("image", None)
                if image and is_internal_image(image):
                    await build_internal_image(image)
                # pull any remote images
                elif (
                    service.get("build", None) is None
                    and service.get("x-local", None) is None
                ):
                    pull_result = await compose_pull(name, project)
                    if not pull_result.success:
                        image = service.get("image", "(unknown)")
                        logger.error(
                            f"Failed to pull docker image '{image}' from remote registry. If this is a locally built image add 'x-local: true' to the the service definition to prevent this error."
                        )

            # provide some space above task display
            print("")

        except BaseException as ex:
            await project_cleanup_shutdown(True)
            raise ex

    @override
    @classmethod
    async def task_init_environment(
        cls, config: SandboxEnvironmentConfigType | None, metadata: dict[str, str]
    ) -> dict[str, str]:
        # get interpolated environment variables and underlying config path and text
        resolved = resolve_config_environment(config, metadata)

        # don't even consider sample-specific environment if there are no sample metadata refs
        if resolved and len(resolved.env) > 0:
            # resolve images using our env vars
            result = await subprocess(
                ["docker", "compose", "-f", resolved.config_file, "config", "--images"],
                env=resolved.env,
            )
            if result.success:
                # look through the images, if one of them doesn't apper in the the
                # config text then this compose file requires its own sample specific
                # environment for resolution
                images = result.stdout.strip().splitlines()
                for image in images:
                    if image not in resolved.config_text:
                        return resolved.env
            else:
                logger.warning(
                    f"Unexpected error reading compose file '{resolved.config_file}': {result.stderr}"
                )

        # no per-sample environment required
        return {}

    @override
    @classmethod
    async def sample_init(
        cls,
        task_name: str,
        config: SandboxEnvironmentConfigType | None,
        metadata: dict[str, str],
    ) -> dict[str, SandboxEnvironment]:
        # create environment variables for sample metadata
        resolved = resolve_config_environment(config, metadata)
        env = resolved.env if resolved is not None else {}

        # create project
        from inspect_ai.log._samples import sample_active

        sample = sample_active()
        project = await ComposeProject.create(
            name=task_project_name(task_name),
            config=config,
            sample_id=sample.sample.id if sample is not None else None,
            epoch=sample.epoch if sample is not None else None,
            env=env,
        )

        # note that the project is running
        project_startup(project)

        try:
            # enumerate the services that will be created
            services = await compose_services(project)

            # start the services
            result = await compose_up(project, services)

            # check to ensure that the services are running
            running_services = await compose_check_running(
                list(services.keys()), project=project
            )

            if not running_services:
                raise RuntimeError(
                    f"No services started.\nCompose up stderr: {result.stderr}"
                )

            # create sandbox environments for all running services
            default_service: str | None = None
            environments: dict[str, SandboxEnvironment] = {}
            for service, service_info in services.items():
                if service in running_services:
                    # update the project w/ the working directory
                    working_dir = await container_working_dir(service, project)

                    # create the docker sandbox environemnt
                    docker_env = DockerSandboxEnvironment(service, project, working_dir)

                    # save reference to default service if requested
                    if service_info.get("x-default", False):
                        default_service = service

                    # record service => environment
                    environments[service] = docker_env

            # confirm that we have a 'default' environemnt
            if environments.get("default", None) is None and default_service is None:
                raise RuntimeError(
                    "No 'default' service found in Docker compose file. "
                    + "You should either name a service 'default' or add "
                    + "'x-default: true' to one of your service definitions."
                )

            # ensure that the default service is first in the dictionary
            default_service = default_service or "default"
            default_environment = environments[default_service]
            del environments[default_service]
            environments = {default_service: default_environment} | environments

        except BaseException as ex:
            await project_cleanup(project, True)
            raise ex

        return environments

    @override
    @classmethod
    async def sample_cleanup(
        cls,
        task_name: str,
        config: SandboxEnvironmentConfigType | None,
        environments: dict[str, SandboxEnvironment],
        interrupted: bool,
    ) -> None:
        # if we were interrupted then wait unil the end of the task to cleanup
        # (this enables us to show output for the cleanup operation)
        if not interrupted:
            # extract project from first environment
            project = (
                next(iter(environments.values()))
                .as_type(DockerSandboxEnvironment)
                ._project
            )
            # cleanup the project
            await project_cleanup(project=project, quiet=True)

    @classmethod
    async def task_cleanup(
        cls, task_name: str, config: SandboxEnvironmentConfigType | None, cleanup: bool
    ) -> None:
        await project_cleanup_shutdown(cleanup)

    @classmethod
    async def cli_cleanup(cls, id: str | None) -> None:
        await cli_cleanup(id)

    def __init__(self, service: str, project: ComposeProject, working_dir: str) -> None:
        super().__init__()
        self._service = service
        self._project = project
        self._working_dir = working_dir

    @override
    async def exec(
        self,
        cmd: list[str],
        input: str | bytes | None = None,
        cwd: str | None = None,
        env: dict[str, str] | None = None,
        user: str | None = None,
        timeout: int | None = None,
        timeout_retry: bool = True,
        concurrency: bool = True,
    ) -> ExecResult[str]:
        # additional args
        args = []

        final_cwd = PurePosixPath(self._working_dir if cwd is None else cwd)
        if not final_cwd.is_absolute():
            final_cwd = self._working_dir / final_cwd

        args.append("--workdir")
        args.append(str(final_cwd))

        if user:
            args.append("--user")
            args.append(user)

        # Forward environment commands to docker compose exec so they
        # will be available to the bash command
        if env:
            for key, value in env.items():
                args.append("--env")
                args.append(f"{key}={value}")

        exec_result = await compose_exec(
            args + [self._service] + cmd,
            project=self._project,
            timeout=timeout,
            timeout_retry=timeout_retry,
            input=input,
            output_limit=SandboxEnvironmentLimits.MAX_EXEC_OUTPUT_SIZE,
            concurrency=concurrency,
        )
        if exec_result.returncode == 126 and "permission denied" in exec_result.stdout:
            raise PermissionError(f"Permission denied executing command: {exec_result}")

        return exec_result

    @override
    async def write_file(self, file: str, contents: str | bytes) -> None:
        # defualt timeout for write_file operations
        TIMEOUT = 600

        # resolve relative file paths
        file = self.container_file(file)

        # ensure that the directory exists
        parent = Path(file).parent.as_posix()
        if parent != ".":
            result = await self.exec(["mkdir", "-p", parent])
            if not result.success:
                msg = f"Failed to create container directory {parent}: {result.stderr}"
                raise RuntimeError(msg)

        # write the file
        if isinstance(contents, str):
            result = await self.exec(
                [
                    "sh",
                    "-e",
                    "-c",
                    'tee -- "$1" > /dev/null',
                    "write_file_script",
                    file,
                ],
                input=contents,
                timeout=TIMEOUT,
            )
        else:
            base64_contents = base64.b64encode(contents).decode("US-ASCII")
            result = await self.exec(
                [
                    "sh",
                    "-e",
                    "-c",
                    'base64 -d | tee -- "$1" > /dev/null',
                    "write_file_script",
                    file,
                ],
                input=base64_contents,
                timeout=TIMEOUT,
            )
        if result.returncode != 0:
            if "permission denied" in result.stderr.casefold():
                ls_result = await self.exec(["ls", "-la", "."])
                error_string = f"Permission was denied. Error details: {result.stderr}; ls -la: {ls_result.stdout}"
                raise PermissionError(error_string)
            elif (
                "cannot overwrite directory" in result.stderr.casefold()
                or "is a directory" in result.stderr.casefold()
            ):
                raise IsADirectoryError(
                    f"Failed to write file: {file} because it is a directory already"
                )
            else:
                raise RuntimeError(f"failed to copy during write_file: {result}")

    @overload
    async def read_file(self, file: str, text: Literal[True] = True) -> str: ...

    @overload
    async def read_file(self, file: str, text: Literal[False]) -> bytes: ...

    @override
    async def read_file(self, file: str, text: bool = True) -> Union[str, bytes]:
        # Write the contents to a temp file
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
            # resolve relative file paths
            original_file = file
            file = self.container_file(file)

            # copy the file
            dest_file = os.path.join(temp_dir, os.path.basename(file))
            try:
                await compose_cp(
                    src=f"{self._service}:{file}",
                    dest=os.path.basename(dest_file),
                    project=self._project,
                    cwd=os.path.dirname(dest_file),
                    output_limit=SandboxEnvironmentLimits.MAX_READ_FILE_SIZE,
                )
            except RuntimeError as ex:
                # extract the message and normalise case
                message = str(ex).lower()

                # FileNotFoundError
                if "could not find the file" in message:
                    raise FileNotFoundError(
                        errno.ENOENT, "No such file or directory.", original_file
                    )

                # PermissionError
                elif "permission denied" in message:
                    raise PermissionError(
                        errno.EACCES, "Permission denied.", original_file
                    )
                else:
                    raise ex

            verify_read_file_size(dest_file)

            # read and return w/ appropriate encoding
            if text:
                with open(dest_file, "r", newline="", encoding="utf-8") as f:
                    return f.read()
            else:
                with open(dest_file, "rb") as f:
                    return f.read()

    @override
    async def connection(self, *, user: str | None = None) -> SandboxConnection:
        # find container for service
        services = await compose_ps(project=self._project)
        container = next(
            (
                service["Name"]
                for service in services
                if service["Service"] == self._service
            ),
            None,
        )

        # vscode doesn't support attaching to a container as a specific user,
        # so don't include the vscode command if a user is specified
        vscode_command = (
            [
                "remote-containers.attachToRunningContainer",
                container,
            ]
            if user is None
            else None
        )

        # return container connection
        if container:
            return SandboxConnection(
                type="docker",
                command=shlex.join(
                    [
                        "docker",
                        "exec",
                        "-it",
                        *(["--user", user] if user else []),
                        container,
                        "bash",
                        "-l",
                    ]
                ),
                vscode_command=vscode_command,
                ports=await get_ports_info(container),
                container=container,
            )
        # error (not currently running)
        else:
            raise ConnectionError(
                f"Service '{self._service} is not currently running.'"
            )

    def default_polling_interval(self) -> float:
        return 0.2

    def container_file(self, file: str) -> str:
        path = Path(file)
        if not path.is_absolute():
            path = Path(self._working_dir) / path
        return path.as_posix()


async def container_working_dir(
    service: str, project: ComposeProject, default: str = "/"
) -> str:
    result = await compose_exec(
        [service, "sh", "-c", "pwd"], timeout=60, project=project
    )
    if result.success:
        return result.stdout.strip()
    else:
        logger.warning(
            f"Failed to get working directory for docker container '{service}': "
            + f"{result.stderr}"
        )
        return default


async def get_ports_info(container: str) -> list[PortMapping] | None:
    try:
        result = await subprocess(
            [
                "docker",
                "inspect",
                container,
                "--format",
                "{{json .NetworkSettings.Ports}}",
            ],
            timeout=60,
        )

        if not result.success:
            raise RuntimeError(result.stderr)

        return parse_docker_inspect_ports(result.stdout)

    # It's currently a policy decision to let docker timeouts to be silent.
    except TimeoutError:
        return None


def parse_docker_inspect_ports(json_str: str) -> list[PortMapping] | None:
    """
    Parses the JSON output from `docker inspect {container_name} --format='{{json .NetworkSettings.Ports}}'` to extract port mappings.

    Args:
        json_str (str): A JSON string representing the `NetworkSettings.Ports` output of `docker inspect`. e.g.
          ```
          {
              "5900/tcp": [{"HostIp": "0.0.0.0", "HostPort": "54023"}],
              "8080/tcp": [{"HostIp": "0.0.0.0", "HostPort": "54024"}]
          }
          ```

    Returns:
        list[PortMapping] | None: A list of PortMapping objects if any port mappings are found,
                                   otherwise None.
    """
    data = json.loads(json_str)
    port_mappings = []
    for port_protocol, mappings in data.items():
        if mappings is None:
            continue
        container_port, protocol = port_protocol.split("/")
        host_mappings = [
            HostMapping(host_ip=mapping["HostIp"], host_port=int(mapping["HostPort"]))
            for mapping in mappings
        ]
        port_mapping = PortMapping(
            container_port=int(container_port),
            protocol=protocol,
            mappings=host_mappings,
        )
        port_mappings.append(port_mapping)
    return port_mappings if port_mappings else None


class ConfigEnvironment(NamedTuple):
    config_file: str
    config_text: str
    env: dict[str, str]


def resolve_config_environment(
    config: SandboxEnvironmentConfigType | None,
    metadata: dict[str, str],
) -> ConfigEnvironment | None:
    # create environment variables for sample metadata
    if isinstance(config, str) and Path(config).exists():
        # read the config file
        config_file = config
        with open(config, "r") as f:
            config_text = f.read()

        # only add metadata files if the key is in the file
        env: dict[str, str] = {}
        for key, value in metadata.items():
            key = f"SAMPLE_METADATA_{key.replace(' ', '_').upper()}"
            if key in config_text:
                env[key] = str(value)

        # return resolved
        return ConfigEnvironment(config_file, config_text, env)
    elif isinstance(config, ComposeConfig):
        # ComposeConfig objects don't support metadata interpolation
        # (they are already fully resolved)
        return None
    else:
        return None
```

## `util/_sandbox/docker/internal.py`

```python
from inspect_ai._util.constants import PKG_PATH
from inspect_ai._util.error import PrerequisiteError
from inspect_ai.util._display import display_type
from inspect_ai.util._subprocess import subprocess

INSPECT_WEB_BROWSER_IMAGE_DOCKERHUB_DEPRECATED = "aisiuk/inspect-web-browser-tool"

INSPECT_WEB_BROWSER_IMAGE_DEPRECATED = "inspect_web_browser"
INSPECT_COMPUTER_IMAGE = "inspect-computer-tool"

INTERNAL_IMAGES = {
    INSPECT_WEB_BROWSER_IMAGE_DEPRECATED: PKG_PATH
    / "tool"
    / "_tools"
    / "_web_browser"
    / "_resources",
    INSPECT_COMPUTER_IMAGE: PKG_PATH / "tool" / "beta" / "_computer" / "_resources",
}


async def is_internal_image_built(image: str) -> bool:
    result = await subprocess(
        ["docker", "images", "--filter", f"reference={image}", "--format", "json"]
    )
    return len(result.stdout.strip()) > 0


async def build_internal_image(image: str) -> None:
    args = [
        "docker",
        "build",
        "--tag",
        image,
        "--progress",
        "plain" if display_type() == "plain" else "auto",
    ]
    if display_type() == "none":
        args.append("--quiet")
    result = await subprocess(
        args + [INTERNAL_IMAGES[image].as_posix()],
        capture_output=False,
    )
    if not result.success:
        raise PrerequisiteError(f"Unexpected error building Docker image '{image}'")


def is_internal_image(image: str) -> bool:
    return any([image == internal for internal in INTERNAL_IMAGES.keys()])
```

## `util/_sandbox/docker/prereqs.py`

```python
import json
import shlex
from logging import getLogger
from typing import Callable

import semver
from pydantic import BaseModel

from inspect_ai._util.error import PrerequisiteError
from inspect_ai.util._subprocess import subprocess

logger = getLogger(__name__)


class DockerClientVersion(BaseModel):
    Version: str
    ApiVersion: str


class DockerVersion(BaseModel):
    Client: DockerClientVersion


async def validate_prereqs() -> None:
    await validate_docker_engine()
    await validate_docker_compose()


# Version that corresponds to Docker Desktop w/ Compose v2.21.0
# Linux versions of Docker Engine (docker-ce) also include
# Docker Compose as a dependency as of this version
# https://docs.docker.com/engine/release-notes/24.0/#2407
DOCKER_ENGINE_REQUIRED_VERSION = "24.0.6"


async def validate_docker_engine(version: str = DOCKER_ENGINE_REQUIRED_VERSION) -> None:
    def parse_version(stdout: str) -> semver.Version:
        version = DockerVersion(**json.loads(stdout)).Client.Version
        return semver.Version.parse(version)

    await validate_version(
        cmd=["docker", "version", "--format", "json"],
        parse_fn=parse_version,
        required_version=version,
        feature="Docker Engine",
    )


# We require Compose v2.21.0, however if we are going to use
# the pull '--policy' option we call this again with 2.22.0

DOCKER_COMPOSE_REQUIRED_VERSION = "2.21.0"
DOCKER_COMPOSE_REQUIRED_VERSION_PULL_POLICY = "2.22.0"


async def validate_docker_compose(
    version: str = DOCKER_COMPOSE_REQUIRED_VERSION,
) -> None:
    def parse_version(stdout: str) -> semver.Version:
        version = json.loads(stdout)["version"].removeprefix("v").split("+")[0]
        return semver.Version.parse(version)

    await validate_version(
        cmd=["docker", "compose", "version", "--format", "json"],
        parse_fn=parse_version,
        required_version=version,
        feature="Docker Compose",
    )


async def validate_version(
    cmd: list[str],
    parse_fn: Callable[[str], semver.Version],
    required_version: str,
    feature: str,
) -> None:
    # attempt to read version
    try:
        version = semver.Version(0)
        result = await subprocess(cmd)
        if result.success:
            version = parse_fn(result.stdout)
    except Exception as ex:
        # we expect FileNotFoundError (when docker is not installed) however
        # other errors would be a surprise so we alert the user w/ a warning
        if not isinstance(ex, FileNotFoundError):
            logger.warning(f"Unexpected error executing docker: {ex}")

        raise PrerequisiteError(
            "ERROR: Docker sandbox environments require Docker Engine\n\n"
            + "Install: https://docs.docker.com/engine/install/"
        )

    if not result.success:
        raise PrerequisiteError(
            "ERROR: Docker sandbox environments require a working Docker Engine\n\n"
            + f"{cmd[0]} exited with return code {result.returncode} when executing: {shlex.join(cmd)}\n"
            + result.stderr
        )

    # validate version
    if version.compare(required_version) < 0:
        raise PrerequisiteError(
            f"ERROR: Docker sandbox environments require {feature} >= {required_version} (current: {version})\n\n"
            + "Upgrade: https://docs.docker.com/engine/install/"
        )
```

## `util/_sandbox/docker/service.py`

```python
import re
from dataclasses import dataclass

from typing_extensions import TypedDict


class ComposeServiceHealthcheck(TypedDict, total=False):
    start_period: str
    interval: str
    retries: int
    timeout: str


ComposeService = TypedDict(
    "ComposeService",
    {
        "image": str,
        "build": str,
        "container_name": str,
        "x-default": bool,
        "x-local": bool,
        "healthcheck": ComposeServiceHealthcheck,
    },
    total=False,
)


def services_healthcheck_time(services: dict[str, ComposeService]) -> int:
    max_time = 0

    for _, service in services.items():
        service_time = service_healthcheck_time(service)
        max_time = max(max_time, service_time)

    return max_time


def service_healthcheck_time(service: ComposeService) -> int:
    """
    Calculate the maximum time a single service's healthcheck could take.

    The total time is:
    (retries * (interval + timeout))

    Default values (from Docker documentation):
    - retries: 3
    - interval: 30s
    - timeout: 30s
    """
    healthcheck = service.get("healthcheck", None)
    if healthcheck is None:
        return 0

    # Parse duration strings with defaults
    retries = healthcheck.get("retries", 3)
    interval = parse_duration(healthcheck.get("interval", "30s"))
    timeout = parse_duration(healthcheck.get("timeout", "30s"))

    # Calculate total time in seconds
    total_time = retries * (interval.seconds + timeout.seconds)

    return int(total_time)


@dataclass
class Duration:
    nanoseconds: int

    @property
    def seconds(self) -> float:
        return self.nanoseconds / 1_000_000_000


def parse_duration(duration_str: str) -> Duration:
    """Parse a Docker compose style duration string."""
    if not duration_str:
        return Duration(0)

    units = {
        "ns": 1,
        "us": 1_000,
        "ms": 1_000_000,
        "s": 1_000_000_000,
        "m": 60_000_000_000,
        "h": 3_600_000_000_000,
    }

    duration_str = "".join(duration_str.split())
    pattern = re.compile(r"(\d+)([a-z]+)")
    matches = pattern.findall(duration_str)

    if not matches:
        raise ValueError(f"Invalid duration format: {duration_str}")

    total_nanoseconds = 0
    for number, unit in matches:
        if unit not in units:
            raise ValueError(f"Invalid unit: {unit}")
        total_nanoseconds += int(number) * units[unit]

    return Duration(total_nanoseconds)
```

## `util/_sandbox/docker/util.py`

```python
import re
from dataclasses import dataclass
from logging import getLogger
from pathlib import Path

import yaml
from shortuuid import uuid

from ..compose import ComposeConfig, is_dockerfile
from ..environment import SandboxEnvironmentConfigType
from .config import (
    COMPOSE_DOCKERFILE_YAML,
    auto_compose_file,
    ensure_auto_compose_file,
    resolve_compose_file,
)

logger = getLogger(__name__)

TRACE_DOCKER = "Docker"


@dataclass
class ComposeProject:
    name: str
    config: str | None
    sample_id: int | str | None
    epoch: int | None
    env: dict[str, str] | None

    @classmethod
    async def create(
        cls,
        name: str,
        config: SandboxEnvironmentConfigType | None,
        *,
        sample_id: int | str | None = None,
        epoch: int | None = None,
        env: dict[str, str] | None = None,
    ) -> "ComposeProject":
        import os

        # resolve config to full path if we have one
        config_path = None
        if isinstance(config, str):
            config_path = Path(config).resolve()
        elif isinstance(config, ComposeConfig):
            # serialize ComposeConfig to YAML and write to auto-compose file
            config_yaml = yaml.dump(
                config.model_dump(mode="json", by_alias=True, exclude_none=True),
                default_flow_style=False,
                sort_keys=False,
            )
            # Use project name for unique file, resolve paths against CWD
            config = auto_compose_file(config_yaml, name, base_dir=os.getcwd())
        elif config is not None:
            raise ValueError(
                f"Unsupported config type: {type(config)}. Expected str or ComposeConfig."
            )

        # if its a Dockerfile, then config is the auto-generated .compose.yaml
        if config_path and is_dockerfile(config_path.name):
            config = auto_compose_file(
                COMPOSE_DOCKERFILE_YAML.format(dockerfile=config_path.name),
                name,
                base_dir=config_path.parent.resolve().as_posix(),
            )

        # if its another config file, just take its path
        elif config_path:
            config = config_path.as_posix()

        # no config passed, look for 'auto-config' (compose.yaml, Dockerfile, etc.)
        elif config is None:
            config = resolve_compose_file(project_name=name)

        # this could be a cleanup where docker has tracked a .compose.yaml file
        # as part of its ConfigFiles and passed it back to us -- we in the
        # meantime have cleaned it up so we re-create it here as required
        ensure_auto_compose_file(config, name)

        # return project
        return ComposeProject(name, config, sample_id=sample_id, epoch=epoch, env=env)

    def __init__(
        self,
        name: str,
        config: str | None,
        sample_id: int | str | None,
        epoch: int | None,
        env: dict[str, str] | None,
    ) -> None:
        self.name = name
        self.config = config
        self.sample_id = sample_id
        self.epoch = epoch
        self.env = env

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, ComposeProject):
            return NotImplemented
        else:
            return self.name == other.name


def task_project_name(task: str) -> str:
    # ensure that task conforms to docker project name constraints
    task = task.lower()
    task = re.sub(r"[^a-z\d\-_]", "-", task)
    task = re.sub(r"-+", "-", task)
    if len(task) == 0:
        task = "task"

    # _- breaks docker project name constraints so we strip trailing underscores.
    return f"inspect-{task[:12].rstrip('_')}-i{uuid().lower()[:6]}"


inspect_project_pattern = r"^inspect-[a-z\d\-_]*-i[a-z\d]{6,}$"


def is_inspect_project(name: str) -> bool:
    return re.match(inspect_project_pattern, name) is not None
```

## `util/_sandbox/environment.py`

```python
from __future__ import annotations

import abc
import logging
from dataclasses import dataclass, field
from typing import (
    Annotated,
    Any,
    Awaitable,
    Callable,
    Literal,
    Type,
    TypeVar,
    Union,
    cast,
    overload,
)

import anyio
from pydantic import BaseModel, Field, model_validator

from inspect_ai._util.logger import warn_once

from .._subprocess import ExecResult
from .exec_remote import (
    ExecRemoteAwaitableOptions,
    ExecRemoteProcess,
    ExecRemoteStreamingOptions,
    exec_remote_awaitable,
    exec_remote_streaming,
)

logger = logging.getLogger(__name__)

ST = TypeVar("ST", bound="SandboxEnvironment")

TaskInit = Callable[[str, Union["SandboxEnvironmentConfigType", None]], Awaitable[None]]
TaskInitEnvironment = Callable[
    [Union["SandboxEnvironmentConfigType", None], dict[str, str]],
    Awaitable[dict[str, str]],
]
TaskCleanup = Callable[
    [str, Union["SandboxEnvironmentConfigType", None], bool], Awaitable[None]
]

SampleInit = Callable[
    [str, Union["SandboxEnvironmentConfigType", None], dict[str, str]],
    Awaitable[dict[str, "SandboxEnvironment"]],
]
SampleCleanup = Callable[
    [
        str,
        Union["SandboxEnvironmentConfigType", None],
        dict[str, "SandboxEnvironment"],
        bool,
    ],
    Awaitable[None],
]
ConfigDeserialize = Callable[[dict[str, Any]], BaseModel]


class HostMapping(BaseModel):
    host_ip: str
    host_port: int


class PortMapping(BaseModel):
    container_port: int
    protocol: Literal["tcp", "udp"]
    mappings: list[HostMapping]


class SandboxConnection(BaseModel):
    """Information required to connect to sandbox."""

    type: str
    """Sandbox type name (e.g. 'docker', 'local', etc.)"""

    command: str
    """Shell command to connect to sandbox."""

    vscode_command: list[Any] | None = Field(default=None)
    """Optional vscode command (+args) to connect to sandbox."""

    ports: list[PortMapping] | None = Field(default=None)
    """Optional list of port mappings into container"""

    container: str | None = Field(default=None)
    """Optional container name (does not apply to all sandboxes)."""


class SandboxEnvironment(abc.ABC):
    """Environment for executing arbitrary code from tools.

    Sandbox environments provide both an execution environment as well as a per-sample
    filesystem context to copy samples files into and resolve relative paths to.
    """

    def __init__(self) -> None:
        self._inject_lock = anyio.Lock()

    @abc.abstractmethod
    async def exec(
        self,
        cmd: list[str],
        input: str | bytes | None = None,
        cwd: str | None = None,
        env: dict[str, str] | None = None,
        user: str | None = None,
        timeout: int | None = None,
        timeout_retry: bool = True,
        concurrency: bool = True,
    ) -> ExecResult[str]:
        """Execute a command within a sandbox environment.

        The current working directory for execution will be the per-sample
        filesystem context.

        Each output stream (stdout and stderr) is limited to 10 MiB. If exceeded, an
        `OutputLimitExceededError` will be raised.

        Args:
          cmd: Command or command and arguments to execute.
          input: Standard input (optional).
          cwd: Current working dir (optional). If relative, will be relative to the per-sample filesystem context.
          env: Environment variables for execution.
          user: Optional username or UID to run the command as.
          timeout: Optional execution timeout (seconds).
          timeout_retry: Retry the command in the case that it times out.
            Commands will be retried up to twice, with a timeout of no greater
            than 60 seconds for the first retry and 30 for the second.
          concurrency: For sandboxes that run locally, request that the `concurrency()`
            function be used to throttle concurrent subprocesses.

        Returns:
          Execution result (status code, stderr/stdout, etc.)

        Raises:
          TimeoutError: If the specified `timeout` expires
            (and `timeout_retry` attempts also timeout).
          UnicodeDecodeError: If an error occurs while
            decoding the command output.
          PermissionError: If the user does not have
            permission to execute the command.
          OutputLimitExceededError: If an output stream
            exceeds the 10 MiB limit.
        """
        ...

    @abc.abstractmethod
    async def write_file(self, file: str, contents: str | bytes) -> None:
        """Write a file into the sandbox environment.

        If the parent directories of the file path do not exist they
        should be automatically created.

        Args:
          file: Path to file (relative file paths will resolve to the
            per-sample working directory).
          contents: Text or binary file contents.

        Raises:
          TimeoutError: If the operation times out.
          PermissionError: If the current user does not have permission to
            write to the specified path.
          IsADirectoryError: If the file exists already and
            is a directory.
        """
        ...

    @overload
    async def read_file(self, file: str, text: Literal[True] = True) -> str: ...

    @overload
    async def read_file(self, file: str, text: Literal[False]) -> bytes: ...

    @abc.abstractmethod
    async def read_file(self, file: str, text: bool = True) -> Union[str | bytes]:
        """Read a file from the sandbox environment.

        File size is limited to 100 MiB.

        When reading text files, implementations should preserve newline constructs
        (e.g. crlf should be preserved not converted to lf). This is equivalent
        to specifying `newline=""` in a call to the Python `open()` function.

        Args:
          file: Path to file (relative file paths will resolve to the
            per-sample working directory).
          text: Read as a utf-8 encoded text file.

        Returns:
          Contents of file (as str or bytes for binary files)

        Raises:
          TimeoutError: If the operation times out.
          FileNotFoundError: If the file does not exist.
          UnicodeDecodeError: If an encoding error occurs
            while reading the file.
            (only applicable when `text = True`)
          PermissionError: If the user does not have
            permission to read from the specified path.
          IsADirectoryError: If the file is a directory.
          OutputLimitExceededError: If the file size
            exceeds the 100 MiB limit.
        """
        ...

    async def connection(self, *, user: str | None = None) -> SandboxConnection:
        """Information required to connect to sandbox environment.

        Args:
          user: User to login as.

        Returns:
           SandboxConnection: connection information.

        Raises:
           NotImplementedError: For sandboxes that don't provide connections
           ConnectionError: If sandbox is not currently running.
        """
        raise NotImplementedError("connection not implemented")

    @overload
    async def exec_remote(
        self,
        cmd: list[str],
        options: ExecRemoteStreamingOptions | None = None,
        *,
        stream: Literal[True] = True,
    ) -> ExecRemoteProcess: ...

    @overload
    async def exec_remote(
        self,
        cmd: list[str],
        options: ExecRemoteAwaitableOptions | None = None,
        *,
        stream: Literal[False],
    ) -> ExecResult[str]: ...

    async def exec_remote(
        self,
        cmd: list[str],
        options: ExecRemoteStreamingOptions | ExecRemoteAwaitableOptions | None = None,
        *,
        stream: bool = True,
    ) -> ExecRemoteProcess | ExecResult[str]:
        """Start a command and return a process handle or result.

        In streaming mode (stream=True), the function returns only after the
        process has been successfully launched in the sandbox. The returned
        ExecRemoteProcess handle can then be iterated for output events or
        killed later.

        Both modes support automatic cleanup on cancellation: if the calling
        task is cancelled (e.g., via task group cancellation), the subprocess
        is automatically killed before the cancellation exception propagates.

        Usage patterns:

        1. Streaming (stream=True, default): iterate over events
           ```python
           proc = await sandbox.exec_remote(["pytest", "-v"])
           async for event in proc:
               match event:
                   case ExecStdout(data=data): print(data, end="")
                   case ExecStderr(data=data): print(data, end="", file=sys.stderr)
                   case ExecCompleted(exit_code=code): print(f"Done: {code}")
           ```

        2. Fire-and-forget with explicit kill:
           ```python
           proxy = await sandbox.exec_remote(["./model-proxy"])
           # ... do other work ...
           await proxy.kill()  # terminate when done
           ```

        3. Simple await (stream=False): get result without streaming
           ```python
           result = await sandbox.exec_remote(["pytest", "-v"], stream=False)
           if result.success:
               print(result.stdout)
           ```

        4. Long-running process with automatic cleanup via task cancellation:
           ```python
           async with anyio.create_task_group() as tg:
               tg.start_soon(run_server)  # uses exec_remote(..., stream=False)
               yield  # do work while server runs
               tg.cancel_scope.cancel()  # server killed automatically
           ```

        Args:
            cmd: Command and arguments to execute.
            options: Execution options (see ExecRemoteOptions).
            stream: If True (default), returns ExecRemoteProcess for streaming.
                If False, returns ExecResult[str] directly.

        Returns:
            If stream=True: ExecRemoteProcess handle with events iterator and kill() method.
                The process is guaranteed to have been started in the sandbox when this returns.
            If stream=False: ExecResult[str] with success, returncode, stdout, and stderr.

        Raises:
            TimeoutError: If `timeout` is specified in ExecRemoteAwaitableOptions and the command exceeds it (only applicable when `stream=False`).
        """
        from inspect_ai.tool._sandbox_tools_utils.sandbox import (
            sandbox_with_injected_tools,
        )

        # inject tools (use flag for fast path)
        if not getattr(self, "_tools_injected", False):
            await sandbox_with_injected_tools(sandbox=self)
            self._tools_injected = True

        return await (exec_remote_streaming if stream else exec_remote_awaitable)(
            self, cmd, self.default_polling_interval(), options
        )

    def as_type(self, sandbox_cls: Type[ST]) -> ST:
        """Verify and return a reference to a subclass of SandboxEnvironment.

        Args:
           sandbox_cls: Class of sandbox (subclass of SandboxEnvironment)

        Returns:
           Reference to the sandbox using the requested type.

        Raises:
           TypeError: If the sandbox is not of the requested type.
        """
        if isinstance(self, sandbox_cls):
            return self
        else:
            raise TypeError(
                f"Expected instance of {sandbox_cls.__name__}, got {type(self).__name__}"
            )

    def default_polling_interval(self) -> float:
        """Polling interval for sandbox service requests."""
        return 2

    @classmethod
    def default_concurrency(cls) -> int | None:
        """Default max_sandboxes for this provider (`None` means no maximum)"""
        return None

    @classmethod
    async def task_init(
        cls, task_name: str, config: SandboxEnvironmentConfigType | None
    ) -> None:
        """Called at task startup initialize resources.

        Args:
          task_name: Name of task using the sandbox environment.
          config: Implementation defined configuration (optional).
        """
        pass

    @classmethod
    async def task_init_environment(
        cls, config: SandboxEnvironmentConfigType | None, metadata: dict[str, str]
    ) -> dict[str, str]:
        """Called at task startup to identify environment variables required by task_init for a sample.

        Return 1 or more environment variables to request a dedicated call to task_init
        for samples that have exactly these environment variables (by default there is
        only one call to task_init for all of the samples in a task if they share a
        sandbox configuration).

        This is useful for situations where config files are dynamic (e.g. through
        sample metadata variable interpolation) and end up yielding different images
        that need their own init (e.g. 'docker pull').

        Args:
            config: Implementation defined configuration (optional).
            metadata: metadata: Sample `metadata` field

        Returns:
            Environment variables to set for call to task_init.
        """
        return {}

    @classmethod
    async def sample_init(
        cls,
        task_name: str,
        config: SandboxEnvironmentConfigType | None,
        metadata: dict[str, str],
    ) -> dict[str, "SandboxEnvironment"]:
        """Initialize sandbox environments for a sample.

        Args:
          task_name: Name of task using the sandbox environment.
          config: Implementation defined configuration (optional).
          metadata: Sample `metadata` field

        Returns:
          Dictionary of named sandbox environments. The environment which represents
          the default environment (resolved by `sandbox("default")` or `sandbox()`) must
          be the first key/value pair in the dictionary.
        """
        return {}

    @classmethod
    @abc.abstractmethod
    async def sample_cleanup(
        cls,
        task_name: str,
        config: SandboxEnvironmentConfigType | None,
        environments: dict[str, "SandboxEnvironment"],
        interrupted: bool,
    ) -> None:
        """Cleanup sandbox environments.

        Args:
          task_name: Name of task using the sandbox environment.
          config: Implementation defined configuration (optional).
          environments: Sandbox environments created for this sample.
          interrupted: Was the task interrupted by an error or cancellation
        """
        ...

    @classmethod
    async def task_cleanup(
        cls, task_name: str, config: SandboxEnvironmentConfigType | None, cleanup: bool
    ) -> None:
        """Called at task exit as a last chance to cleanup resources.

        Args:
          task_name: Name of task using the sandbox environment.
          config: Implementation defined configuration (optional).
          cleanup: Whether to actually cleanup environment resources
            (False if `--no-sandbox-cleanup` was specified)
        """
        pass

    @classmethod
    async def cli_cleanup(cls, id: str | None) -> None:
        """Handle a cleanup invoked from the CLI (e.g. inspect sandbox cleanup).

        Args:
          id: Optional ID to limit scope of cleanup.
        """
        pass

    @classmethod
    def config_files(cls) -> list[str]:
        """Standard config files for this provider (used for automatic discovery)"""
        return []

    @classmethod
    def is_docker_compatible(cls) -> bool:
        """Is the provider docker compatible (accepts Dockerfile and compose.yaml)"""
        return any(["compose.yaml" in f for f in cls.config_files()])

    @classmethod
    def config_deserialize(cls, config: dict[str, Any]) -> BaseModel:
        """Deserialize a sandbox-specific configuration model from a dict.

        Override this method if you support a custom configuration model.

        A basic implementation would be: `return MySandboxEnvironmentConfig(**config)`

        Args:
          config: Configuration dictionary produced by serializing the configuration
            model.

        Returns:
          The sandbox-specific configuration model.
        """
        raise NotImplementedError(
            "The SandboxEnvironment provider has not implemented config_deserialize."
        )


@dataclass
class SandboxEnvironments:
    """Collection of sandbox environments used for an evaluation."""

    environments: dict[str, SandboxEnvironment]
    """Sandbox environments by name."""

    cleanup: Callable[[bool], Awaitable[None]] | None = field(default=None)
    """Optional global cleanup function.

    Called with a boolean indicating whether the sample was cancelled.
    """


class SandboxEnvironmentSpec(BaseModel, frozen=True):
    """Specification of a SandboxEnvironment."""

    type: str
    """Sandbox type (e.g. 'local', 'docker')"""

    # Any is used to prevent Pydantic from trying to initialise a BaseModel.
    config: Annotated[Any, "BaseModel, str or None"] = None
    """Sandbox configuration (filename or config object)."""

    def __init__(self, type: str, config: BaseModel | str | None = None):
        super().__init__(type=type, config=config)

    @model_validator(mode="before")
    @classmethod
    def load_config_model(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        type = data["type"]
        config = data.get("config")
        # Pydantic won't know what concrete type to instantiate for config, so
        # ask the relevant sandbox environment to deserialize it.
        if isinstance(config, dict) and len(config) > 0:
            data["config"] = deserialize_sandbox_specific_config(type, config)
        return data


SandboxEnvironmentConfigType = BaseModel | str

SandboxEnvironmentType = str | tuple[str, str] | SandboxEnvironmentSpec
"""SandboxEnvironmentSpec and str and tuple shorthands for it.

A plain str, e.g. "docker", is equivalent to SandboxEnvironmentSpec("docker")
A tuple, e.g. ("docker", "compose.yaml"), is equivalent to SandboxEnvironmentSpec("docker", "compose.yaml")
"""


def resolve_sandbox_environment(
    sandbox: SandboxEnvironmentType | None,
) -> SandboxEnvironmentSpec | None:
    # do the resolution
    if isinstance(sandbox, str):
        return SandboxEnvironmentSpec(type=sandbox)
    elif isinstance(sandbox, SandboxEnvironmentSpec):
        return sandbox
    elif isinstance(sandbox, tuple):
        return SandboxEnvironmentSpec(sandbox[0], sandbox[1])
    else:
        return None


def deserialize_sandbox_specific_config(
    type: str, config: dict[str, Any]
) -> BaseModel | dict[str, Any]:
    # Avoid circular import
    from inspect_ai.util._sandbox.registry import registry_find_sandboxenv

    try:
        sandboxenv_type = registry_find_sandboxenv(type)
    except ValueError:
        warn_once(
            logger,
            f"Could not find sandbox environment plugin for type '{type}'. "
            "Ensure the plugin is installed in your environment.",
        )
        return config
    # If the provider is docker compatible and the config is a valid
    # ComposeConfig, deserialize it automatically so providers don't
    # need to handle this case in config_deserialize.
    is_docker_compatible_fn = cast(
        Callable[..., bool], getattr(sandboxenv_type, "is_docker_compatible")
    )
    if is_docker_compatible_fn():
        from pydantic import ValidationError

        from inspect_ai.util._sandbox.compose import ComposeConfig

        try:
            return ComposeConfig.model_validate(config)
        except ValidationError:
            pass

    config_deserialize = cast(
        ConfigDeserialize, getattr(sandboxenv_type, "config_deserialize")
    )
    return config_deserialize(config)
```

## `util/_sandbox/events.py`

```python
import contextlib
import inspect
import shlex
from datetime import datetime, timezone
from typing import Any, Iterator, Literal, Type, Union, overload

from pydantic import JsonValue
from pydantic_core import to_jsonable_python
from typing_extensions import override

from inspect_ai._util.text import truncate_lines, truncate_string_to_bytes
from inspect_ai.util._subprocess import ExecResult

from .environment import (
    ST,
    SandboxConnection,
    SandboxEnvironment,
    SandboxEnvironmentConfigType,
)
from .limits import OutputLimitExceededError, SandboxEnvironmentLimits
from .service import SERVICES_DIR


class SandboxTimeoutError(TimeoutError):
    """Raised when a sandbox operation times out."""

    pass


class SandboxEnvironmentProxy(SandboxEnvironment):
    def __init__(self, sandbox: SandboxEnvironment) -> None:
        super().__init__()
        self._sandbox = sandbox
        self._events = True

    @override
    async def exec(
        self,
        cmd: list[str],
        input: str | bytes | None = None,
        cwd: str | None = None,
        env: dict[str, str] | None = None,
        user: str | None = None,
        timeout: int | None = None,
        timeout_retry: bool = True,
        concurrency: bool = True,
    ) -> ExecResult[str]:
        from inspect_ai.event._sandbox import SandboxEvent
        from inspect_ai.log._transcript import transcript

        # started
        timestamp = datetime.now(timezone.utc)

        # check how many parameters the target sandbox method has
        # (if only 7 then don't send concurrency param)
        sig = inspect.signature(self._sandbox.exec)
        params: dict[str, Any] = dict(
            cmd=cmd,
            input=input,
            cwd=cwd,
            env=env or {},
            user=user,
            timeout=timeout,
            timeout_retry=timeout_retry,
        )
        if len(sig.parameters) == 8:
            params["concurrency"] = concurrency

        # make call
        try:
            result = await self._sandbox.exec(**params)
        except TimeoutError as ex:
            raise SandboxTimeoutError(str(ex)) from ex

        # skip sandbox service events
        if any(SERVICES_DIR in c for c in cmd):
            return result

        # yield event
        options: dict[str, JsonValue] = {}
        if cwd:
            options["cwd"] = cwd
        if env:
            options["env"] = to_jsonable_python(env)
        if user:
            options["user"] = user
        if timeout is not None:
            options["timeout"] = timeout
        if timeout_retry is not True:
            options["timeout_retry"] = timeout_retry

        if self._events:
            transcript()._event(
                SandboxEvent(
                    timestamp=timestamp,
                    action="exec",
                    cmd=" ".join([shlex.quote(c) for c in cmd]),
                    input=content_display(input) if input is not None else None,
                    options=options,
                    result=result.returncode,
                    output=content_display(
                        f"{result.stderr}\n\n{result.stdout}"
                        if result.stderr
                        else result.stdout
                    ),
                    completed=datetime.now(timezone.utc),
                )
            )

        # verify output size
        SandboxEnvironmentProxy.verify_exec_result_size(result)

        # return result
        return result

    @staticmethod
    def verify_exec_result_size(exec_result: ExecResult[str]) -> None:
        """Verify the size of the output streams in an ``ExecResult``.

        Raises:
            OutputLimitExceededError: If an output stream exceeds the limit.
        """
        limit = SandboxEnvironmentLimits.MAX_EXEC_OUTPUT_SIZE
        stdout_truncated = truncate_string_to_bytes(exec_result.stdout, limit)
        stderr_truncated = truncate_string_to_bytes(exec_result.stderr, limit)
        if not stdout_truncated and not stderr_truncated:
            return
        stdout = stdout_truncated.output if stdout_truncated else exec_result.stdout
        stderr = stderr_truncated.output if stderr_truncated else exec_result.stderr
        raise OutputLimitExceededError(
            limit_str=SandboxEnvironmentLimits.MAX_EXEC_OUTPUT_SIZE_STR,
            truncated_output=f"{stdout}{stderr}",
        )

    @override
    async def write_file(self, file: str, contents: str | bytes) -> None:
        from inspect_ai.event._sandbox import SandboxEvent
        from inspect_ai.log._transcript import transcript

        timestamp = datetime.now(timezone.utc)

        # make call
        try:
            await self._sandbox.write_file(file, contents)
        except TimeoutError as ex:
            raise SandboxTimeoutError(str(ex)) from ex

        # yield event
        if self._events:
            transcript()._event(
                SandboxEvent(
                    timestamp=timestamp,
                    action="write_file",
                    file=file,
                    input=content_display(contents),
                    completed=datetime.now(timezone.utc),
                )
            )

    @overload
    async def read_file(self, file: str, text: Literal[True] = True) -> str: ...

    @overload
    async def read_file(self, file: str, text: Literal[False]) -> bytes: ...

    @override
    async def read_file(self, file: str, text: bool = True) -> Union[str | bytes]:
        from inspect_ai.event._sandbox import SandboxEvent
        from inspect_ai.log._transcript import transcript

        timestamp = datetime.now(timezone.utc)

        # make call
        try:
            if text is True:
                output: str | bytes = await self._sandbox.read_file(file, True)
            else:
                output = await self._sandbox.read_file(file, False)
        except TimeoutError as ex:
            raise SandboxTimeoutError(str(ex)) from ex

        # yield event
        if self._events:
            transcript()._event(
                SandboxEvent(
                    timestamp=timestamp,
                    action="read_file",
                    file=file,
                    output=content_display(output),
                    completed=datetime.now(timezone.utc),
                )
            )

        # return result
        return output

    @override
    async def connection(self, *, user: str | None = None) -> SandboxConnection:
        params: dict[str, Any] = {"user": user} if user is not None else {}
        return await self._sandbox.connection(**params)

    @override
    def as_type(self, sandbox_cls: Type[ST]) -> ST:
        if isinstance(self._sandbox, sandbox_cls):
            return self._sandbox
        else:
            raise TypeError(
                f"Expected instance of {sandbox_cls.__name__}, got {type(self._sandbox).__name__}"
            )

    @override
    def default_polling_interval(self) -> float:
        return self._sandbox.default_polling_interval()

    @contextlib.contextmanager
    def no_events(self) -> Iterator[None]:
        self._events = False
        try:
            yield
        finally:
            self._events = True

    @classmethod
    async def sample_cleanup(
        cls,
        task_name: str,
        config: SandboxEnvironmentConfigType | None,
        environments: dict[str, SandboxEnvironment],
        interrupted: bool,
    ) -> None:
        pass


def content_display(content: str | bytes) -> str:
    if isinstance(content, str):
        content, truncated = truncate_lines(content, 20)
        if truncated:
            content = f"{content}\n\nOutput truncated ({truncated} additional lines)"
        return content
    else:
        return f"binary ({pretty_size(len(content))})"


def pretty_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.2f} KB"

    return f"{size / (1024 * 1024):.2f} MB"
```

## `util/_sandbox/exec_remote.py`

```python
"""ExecRemote - Asynchronous command execution with streaming output.

This module provides the host-side implementation for exec_remote, enabling
long-running commands in sandbox environments with streaming output.
"""

from __future__ import annotations

import logging
import shlex
from dataclasses import dataclass
from typing import TYPE_CHECKING, ClassVar, Literal, TypeVar, Union, cast

import anyio
from pydantic import BaseModel
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    stop_after_delay,
    wait_exponential_jitter,
)

from inspect_ai._util._json_rpc import GenericJSONRPCErrorMapper, exec_model_request

from ._cli import SANDBOX_CLI
from ._json_rpc_transport import SandboxJSONRPCTransport

if TYPE_CHECKING:
    from .._subprocess import ExecResult
    from .environment import SandboxEnvironment


# ============================================================================
# Event Types
# ============================================================================


@dataclass
class ExecStdout:
    """A chunk of stdout data from the running process."""

    type: ClassVar[str] = "stdout"
    """Event type discriminator."""

    data: str
    """The stdout data."""


@dataclass
class ExecStderr:
    """A chunk of stderr data from the running process."""

    type: ClassVar[str] = "stderr"
    """Event type discriminator."""

    data: str
    """The stderr data."""


@dataclass
class ExecCompleted:
    """Process completed (successfully or with error)."""

    type: ClassVar[str] = "completed"
    """Event type discriminator."""

    exit_code: int
    """The process exit code (0 = success)"""

    @property
    def success(self) -> bool:
        """True if the process exited successfully (exit code 0)."""
        return self.exit_code == 0


ExecOutput = Union[ExecStdout, ExecStderr, ExecCompleted]
"""Union type for all events that can be yielded by ExecRemoteProcess.events."""


# ============================================================================
# Options
# ============================================================================


@dataclass
class ExecRemoteCommonOptions:
    """Common options for exec_remote() command execution.

    This base class contains options valid for both streaming and awaitable
    modes. Use ExecRemoteStreamingOptions or ExecRemoteAwaitableOptions for
    mode-specific options.
    """

    input: str | bytes | None = None
    """Standard input to send to the command"""

    cwd: str | None = None
    """Working directory for command execution"""

    env: dict[str, str] | None = None
    """Additional environment variables"""

    user: str | None = None
    """User to run the command as"""

    poll_interval: float | None = None
    """Interval between poll requests in seconds"""

    poll_timeout: float | None = None
    """Timeout for individual RPC poll requests in seconds. Defaults to 120 seconds."""

    poll_timeout_retry: bool | None = None
    """Retry individual RPC poll requests when they time out.
    Requests will be retried up to twice, with a timeout of no greater
    than 60 seconds for the first retry and 30 for the second."""

    concurrency: bool = True
    """For sandboxes that run locally, request that the `concurrency()`
    function be used to throttle concurrent subprocesses."""


@dataclass
class ExecRemoteStreamingOptions(ExecRemoteCommonOptions):
    """Options for exec_remote() in streaming mode (stream=True)."""

    stdin_open: bool = False
    """If True, keep stdin open after writing initial input, enabling write_stdin()
    and close_stdin() on the returned ExecRemoteProcess. If False (default), stdin
    is closed immediately after writing initial input (or not opened at all)"""


@dataclass
class ExecRemoteAwaitableOptions(ExecRemoteCommonOptions):
    """Options for exec_remote() in awaitable mode (stream=False)."""

    timeout: float | None = None
    """Maximum execution time in seconds. On timeout, the process is killed and
    TimeoutError is raised"""


# ============================================================================
# JSON-RPC Response Types (mirrors server-side types)
# ============================================================================


class _StartResult(BaseModel):
    """Result from exec_remote_start."""

    pid: int


class _PollResult(BaseModel):
    """Result from exec_remote_poll."""

    state: Literal["running", "completed", "killed"]
    exit_code: int | None = None
    seq: int
    stdout: str
    stderr: str


class _KillResult(BaseModel):
    """Result from exec_remote_kill."""

    seq: int
    stdout: str
    stderr: str


class _WriteStdinResult(BaseModel):
    """Result from exec_remote_write_stdin."""

    seq: int
    stdout: str
    stderr: str


class _CloseStdinResult(BaseModel):
    """Result from exec_remote_close_stdin."""

    seq: int
    stdout: str
    stderr: str


# ============================================================================
# Constants
# ============================================================================

MIN_POLL_INTERVAL = 5

RPC_TIMEOUT = 120
"""Timeout for individual JSON-RPC calls in seconds."""

T = TypeVar("T", bound=BaseModel)


class ExecRemoteProcess:
    r"""Handle to a running exec_remote process.

    This class is an async iterator that yields events as they arrive.
    It can only be iterated once (single-use iterator pattern).

    Usage patterns:

    1. Streaming: iterate over the process directly
       ```python
       proc = await sandbox.exec_remote(["cmd"])
       async for event in proc:
           match event:
               case ExecStdout(data=data): print(data)
               case ExecCompleted(exit_code=code): print(f"Done: {code}")
       ```

    2. Fire-and-forget with explicit kill:
       ```python
       proxy = await sandbox.exec_remote(["./proxy"])
       # ... do other work ...
       await proxy.kill()  # terminate when done
       ```

    3. Interactive stdin (requires stdin_open=True):
       ```python
       opts = ExecRemoteStreamingOptions(stdin_open=True)
       proc = await sandbox.exec_remote(["cat"], opts)
       await proc.write_stdin("hello\n")
       await proc.write_stdin("world\n")
       await proc.close_stdin()  # signal EOF
       async for event in proc:
           ...
       ```
    """

    def __init__(
        self,
        sandbox: SandboxEnvironment,
        cmd: list[str],
        options: ExecRemoteStreamingOptions | ExecRemoteCommonOptions,
        sandbox_default_poll_interval: float,
    ) -> None:
        """Initialize an ExecRemoteProcess.

        Args:
            sandbox: The sandbox environment where the process will run.
            cmd: Command and arguments to execute.
            options: Execution options.
            sandbox_default_poll_interval: Default poll interval in seconds,
                provided by the sandbox (e.g. from _default_poll_interval()).
        """
        self._sandbox = sandbox
        self._cmd = cmd
        self._options = options
        self._poll_interval = max(
            MIN_POLL_INTERVAL, options.poll_interval or sandbox_default_poll_interval
        )
        self._pid: int | None = None
        self._last_seq: int = 0
        self._killed = False
        self._completed = False
        self._iteration_started = False
        self._pending_events: list[ExecOutput] = []
        self._transport = SandboxJSONRPCTransport(sandbox, SANDBOX_CLI)

    @property
    def pid(self) -> int:
        """Return the process ID."""
        if self._pid is None:
            raise RuntimeError("Process has not been submitted yet")
        return self._pid

    # -------------------------------------------------------------------------
    # RPC helpers
    # -------------------------------------------------------------------------

    async def _rpc(
        self, method: str, params: dict[str, object], result_type: type[T]
    ) -> T:
        """Make an RPC call to the sandbox."""
        extra_args: dict[str, object] = dict(
            timeout=RPC_TIMEOUT
            if self._options.poll_timeout is None
            else self._options.poll_timeout,
            user=self._options.user,
            concurrency=self._options.concurrency,
        )
        if self._options.poll_timeout_retry is not None:
            extra_args["timeout_retry"] = self._options.poll_timeout_retry
        return await exec_model_request(
            method=method,
            params=params,
            result_type=result_type,
            transport=self._transport,
            error_mapper=GenericJSONRPCErrorMapper,
            **extra_args,
        )

    async def _start(self) -> None:
        """Submit the job to the sandbox."""
        # Build params, converting bytes input to string if needed
        params: dict[str, object] = {"command": shlex.join(self._cmd)}
        if self._options.input is not None:
            if isinstance(self._options.input, bytes):
                params["input"] = self._options.input.decode("utf-8")
            else:
                params["input"] = self._options.input
        if (
            isinstance(self._options, ExecRemoteStreamingOptions)
            and self._options.stdin_open
        ):
            params["stdin_open"] = True
        if self._options.env:
            params["env"] = self._options.env
        if self._options.cwd:
            params["cwd"] = self._options.cwd

        result = await self._rpc("exec_remote_start", params, _StartResult)
        self._pid = result.pid

    # -------------------------------------------------------------------------
    # Async Iterator Protocol
    # -------------------------------------------------------------------------

    def __aiter__(self) -> "ExecRemoteProcess":
        """Return self as the async iterator.

        This class implements the async iterator protocol directly.
        It can only be iterated once - subsequent iterations will raise RuntimeError.
        """
        if self._iteration_started:
            raise RuntimeError("ExecRemoteProcess can only be iterated once")
        self._iteration_started = True
        return self

    async def __anext__(self) -> ExecOutput:
        """Return the next event from the process.

        Yields ExecStdout and ExecStderr events as output becomes available,
        then yields a final ExecCompleted event when the process terminates.

        Note: After the ExecCompleted event is yielded, the job is automatically
        cleaned up on the server side.

        If cancelled, the process will be killed before re-raising the exception.

        Raises:
            StopAsyncIteration: When the process has completed or been killed.
            RuntimeError: If the process has not been submitted yet.
        """
        if self._pid is None:
            raise RuntimeError("Process has not been submitted yet")

        # Return any pending events first
        if self._pending_events:
            return self._pending_events.pop(0)

        # If already in terminal state, stop iteration
        if self._completed or self._killed:
            raise StopAsyncIteration

        try:
            while True:
                # Perform the poll
                result = await self._poll()

                # Collect events from this poll
                events: list[ExecOutput] = []
                if result.stdout:
                    events.append(ExecStdout(data=result.stdout))
                if result.stderr:
                    events.append(ExecStderr(data=result.stderr))

                # Check for terminal state
                if result.state == "completed":
                    self._completed = True
                    if result.exit_code is None:
                        raise RuntimeError(
                            "Server returned completed state without exit_code"
                        )
                    events.append(ExecCompleted(exit_code=result.exit_code))
                elif result.state == "killed":
                    # Process was killed (possibly by another call to kill())
                    self._killed = True
                    # Don't yield ExecCompleted for killed processes - kill() discards output

                # If we have events, return the first and queue the rest
                if events:
                    self._pending_events = events[1:]
                    return events[0]

                # If killed with no events, stop iteration
                if self._killed:
                    raise StopAsyncIteration

                # Still running with no output, wait before polling again
                await anyio.sleep(self._poll_interval)

        except anyio.get_cancelled_exc_class():
            # Kill the process on cancellation to avoid leaving orphaned processes.
            with anyio.CancelScope(shield=True):
                await self.kill()
            raise

    async def _poll(self) -> _PollResult:
        @retry(
            wait=wait_exponential_jitter(initial=2),
            stop=(stop_after_attempt(5) | stop_after_delay(30)),
            retry=retry_if_exception(lambda e: isinstance(e, RuntimeError)),
        )
        async def poll() -> _PollResult:
            from inspect_ai.util._sandbox.events import SandboxEnvironmentProxy

            sandbox_proxy = cast(SandboxEnvironmentProxy, self._transport.sandbox)
            with sandbox_proxy.no_events():
                result = await self._rpc(
                    "exec_remote_poll",
                    {"pid": self._pid, "ack_seq": self._last_seq},
                    _PollResult,
                )
            self._last_seq = result.seq
            return result

        return await poll()

    def _enqueue_output(self, stdout: str, stderr: str) -> None:
        """Enqueue any non-empty output as pending events for the iterator."""
        if stdout:
            self._pending_events.append(ExecStdout(data=stdout))
        if stderr:
            self._pending_events.append(ExecStderr(data=stderr))

    async def write_stdin(self, data: str | bytes) -> None:
        """Write data to the process's stdin.

        Requires that the process was started with stdin_open=True in
        ExecRemoteStreamingOptions.

        Args:
            data: Data to write. Bytes are decoded to UTF-8.

        Raises:
            RuntimeError: If stdin_open was not set, the process has not
                been started yet, or the process has already terminated.
        """
        if not (
            isinstance(self._options, ExecRemoteStreamingOptions)
            and self._options.stdin_open
        ):
            raise RuntimeError(
                "write_stdin() requires stdin_open=True in ExecRemoteStreamingOptions"
            )
        if self._pid is None:
            raise RuntimeError("Process has not been submitted yet")
        if self._completed or self._killed:
            raise RuntimeError("Cannot write to stdin: process has terminated")

        if isinstance(data, bytes):
            data = data.decode("utf-8")

        result = await self._rpc(
            "exec_remote_write_stdin",
            {"pid": self._pid, "data": data, "ack_seq": self._last_seq},
            _WriteStdinResult,
        )
        self._last_seq = result.seq
        self._enqueue_output(result.stdout, result.stderr)

    async def close_stdin(self) -> None:
        """Close the process's stdin to signal EOF.

        Requires that the process was started with stdin_open=True in
        ExecRemoteStreamingOptions. Idempotent: calling after stdin is already
        closed is a no-op.

        Raises:
            RuntimeError: If stdin_open was not set, or the process has not
                been started yet.
        """
        if not (
            isinstance(self._options, ExecRemoteStreamingOptions)
            and self._options.stdin_open
        ):
            raise RuntimeError(
                "close_stdin() requires stdin_open=True in ExecRemoteStreamingOptions"
            )
        if self._pid is None:
            raise RuntimeError("Process has not been submitted yet")
        if self._completed or self._killed:
            return

        result = await self._rpc(
            "exec_remote_close_stdin",
            {"pid": self._pid, "ack_seq": self._last_seq},
            _CloseStdinResult,
        )
        self._last_seq = result.seq
        self._enqueue_output(result.stdout, result.stderr)

    async def kill(self) -> None:
        """Terminate the process.

        Any output buffered since the last poll is enqueued as pending events
        so the async iterator can yield them before StopAsyncIteration.

        If the process has already completed or been killed, this is a no-op.
        """
        if self._pid is None or self._completed or self._killed:
            return

        self._killed = True
        try:
            result = await self._rpc(
                "exec_remote_kill",
                {"pid": self._pid, "ack_seq": self._last_seq},
                _KillResult,
            )
            self._last_seq = result.seq
            self._enqueue_output(result.stdout, result.stderr)
        except Exception:
            logging.debug(
                f"exec_remote kill RPC failed for pid {self._pid}", exc_info=True
            )


# ============================================================================
# Factory Functions
# ============================================================================


async def exec_remote_streaming(
    sandbox: SandboxEnvironment,
    cmd: list[str],
    sandbox_default_poll_interval: float,
    options: ExecRemoteStreamingOptions | ExecRemoteCommonOptions | None = None,
) -> ExecRemoteProcess:
    """Create and start an exec_remote process for streaming.

    Submits the start command to the sandbox and returns only after the process
    has been successfully launched (i.e. after the exec_remote_start RPC completes
    and a PID has been assigned).

    Args:
        sandbox: The sandbox environment to run the command in.
        cmd: Command and arguments to execute.
        sandbox_default_poll_interval: Default poll interval in seconds,
            provided by the sandbox (e.g. from _default_poll_interval()).
        options: Execution options.

    Returns:
        ExecRemoteProcess handle that can be iterated for events, or killed.
        The process is guaranteed to have been started when this returns.
    """
    proc = ExecRemoteProcess(
        sandbox,
        cmd,
        options or ExecRemoteCommonOptions(),
        sandbox_default_poll_interval,
    )
    await proc._start()
    return proc


async def exec_remote_awaitable(
    sandbox: SandboxEnvironment,
    cmd: list[str],
    sandbox_default_poll_interval: float,
    options: ExecRemoteAwaitableOptions | ExecRemoteCommonOptions | None = None,
) -> ExecResult[str]:
    """Run a command and return the result without streaming.

    Submits the command, polls until completion, and returns ExecResult.
    If cancelled or timed out, the process will be killed.

    Each output stream (stdout and stderr) is limited to 10 MiB. If output
    exceeds this limit, only the most recent 10 MiB is kept.

    Args:
        sandbox: The sandbox environment to run the command in.
        cmd: Command and arguments to execute.
        sandbox_default_poll_interval: Default poll interval in seconds,
            provided by the sandbox (e.g. from _default_poll_interval()).
        options: Execution options.

    Returns:
        ExecResult[str] with success, returncode, stdout, and stderr.

    Raises:
        TimeoutError: If options.timeout is set and the command exceeds it.
    """
    from .._subprocess import CircularByteBuffer
    from .._subprocess import ExecResult as ExecResultClass
    from .limits import SandboxEnvironmentLimits

    opts = options or ExecRemoteCommonOptions()
    proc = await exec_remote_streaming(
        sandbox, cmd, sandbox_default_poll_interval, opts
    )

    # Accumulate output chunks with memory limiting
    output_limit = SandboxEnvironmentLimits.MAX_EXEC_OUTPUT_SIZE
    stdout_buffer = CircularByteBuffer(output_limit)
    stderr_buffer = CircularByteBuffer(output_limit)

    timeout = opts.timeout if isinstance(opts, ExecRemoteAwaitableOptions) else None

    try:
        with anyio.fail_after(timeout):
            async for event in proc:
                if isinstance(event, ExecStdout):
                    stdout_buffer.write(event.data.encode("utf-8"))
                elif isinstance(event, ExecStderr):
                    stderr_buffer.write(event.data.encode("utf-8"))
                elif isinstance(event, ExecCompleted):
                    return ExecResultClass[str](
                        success=event.success,
                        returncode=event.exit_code,
                        stdout=stdout_buffer.getvalue().decode(
                            "utf-8", errors="replace"
                        ),
                        stderr=stderr_buffer.getvalue().decode(
                            "utf-8", errors="replace"
                        ),
                    )
    except TimeoutError:
        # Kill the process (the cancellation handler in __anext__ already
        # does this, but we call it explicitly in case the timeout fires
        # between iterations rather than inside __anext__)
        with anyio.CancelScope(shield=True):
            await proc.kill()
        raise

    # If we get here, the process was killed (no Completed event)
    return ExecResultClass[str](
        success=False,
        returncode=-1,
        stdout=stdout_buffer.getvalue().decode("utf-8", errors="replace"),
        stderr=stderr_buffer.getvalue().decode("utf-8", errors="replace"),
    )
```

## `util/_sandbox/limits.py`

```python
from pathlib import Path


class SandboxEnvironmentLimits:
    """Encapsulates limits for sandbox environments."""

    MAX_EXEC_OUTPUT_SIZE = 10 * 1024**2
    MAX_EXEC_OUTPUT_SIZE_STR = "10 MiB"

    MAX_READ_FILE_SIZE = 100 * 1024**2
    MAX_READ_FILE_SIZE_STR = "100 MiB"


class OutputLimitExceededError(Exception):
    """Exception raised when a sandbox invocation results in excessive output."""

    def __init__(self, limit_str: str, truncated_output: str | None) -> None:
        self.limit_str = limit_str
        self.truncated_output = truncated_output
        super().__init__(
            f"The sandbox output stream limit of {self.limit_str} was exceeded."
        )


def verify_read_file_size(file: str) -> None:
    """Verify the size of a file to be read into memory.

    Raises:
      OutputLimitExceededError: If the file size exceeds the 100 MiB limit.
    """
    file_size = Path(file).stat().st_size
    if file_size > SandboxEnvironmentLimits.MAX_READ_FILE_SIZE:
        raise OutputLimitExceededError(
            limit_str=SandboxEnvironmentLimits.MAX_READ_FILE_SIZE_STR,
            # The potentially large, and potentially binary content is not included.
            truncated_output=None,
        )
```

## `util/_sandbox/local.py`

```python
import tempfile
import warnings
from pathlib import Path
from typing import Literal, Union, overload

from typing_extensions import override

from .._subprocess import ExecResult, subprocess
from .environment import (
    SandboxEnvironment,
    SandboxEnvironmentConfigType,
)
from .limits import (
    SandboxEnvironmentLimits,
    verify_read_file_size,
)
from .registry import sandboxenv


@sandboxenv(name="local")
class LocalSandboxEnvironment(SandboxEnvironment):
    @override
    @classmethod
    async def sample_init(
        cls,
        task_name: str,
        config: SandboxEnvironmentConfigType | None,
        metadata: dict[str, str],
    ) -> dict[str, SandboxEnvironment]:
        return {"default": LocalSandboxEnvironment()}

    @override
    @classmethod
    async def sample_cleanup(
        cls,
        task_name: str,
        config: SandboxEnvironmentConfigType | None,
        environments: dict[str, SandboxEnvironment],
        interrupted: bool,
    ) -> None:
        for environment in environments.values():
            sandbox = environment.as_type(LocalSandboxEnvironment)
            sandbox.directory.cleanup()

    def __init__(self) -> None:
        self.directory = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)

    @override
    async def exec(
        self,
        cmd: list[str],
        input: str | bytes | None = None,
        cwd: str | None = None,
        env: dict[str, str] | None = None,
        user: str | None = None,
        timeout: int | None = None,
        timeout_retry: bool = True,
        concurrency: bool = True,
    ) -> ExecResult[str]:
        if user is not None:
            warnings.warn(
                "The 'user' parameter is ignored in LocalSandboxEnvironment. Commands will run as the current user.",
                UserWarning,
            )

        final_cwd = Path(self.directory.name if cwd is None else cwd)
        if not final_cwd.is_absolute():
            final_cwd = self.directory.name / final_cwd

        result = await subprocess(
            args=cmd,
            input=input,
            cwd=final_cwd,
            env=env,
            timeout=timeout,
            output_limit=SandboxEnvironmentLimits.MAX_EXEC_OUTPUT_SIZE,
            concurrency=concurrency,
        )
        return result

    @override
    async def write_file(self, file: str, contents: str | bytes) -> None:
        # resolve file and ensure the parent dir exists
        file = self._resolve_file(file)
        Path(file).parent.mkdir(parents=True, exist_ok=True)

        if isinstance(contents, str):
            with open(file, "w", encoding="utf-8") as f:
                f.write(contents)
        else:
            with open(file, "wb") as f:
                f.write(contents)

    @overload
    async def read_file(self, file: str, text: Literal[True] = True) -> str: ...

    @overload
    async def read_file(self, file: str, text: Literal[False]) -> bytes: ...

    @override
    async def read_file(self, file: str, text: bool = True) -> Union[str | bytes]:
        file = self._resolve_file(file)
        verify_read_file_size(file)
        if text:
            with open(file, "r", newline="", encoding="utf-8") as f:
                return f.read()
        else:
            with open(file, "rb") as f:
                return f.read()

    def default_polling_interval(self) -> float:
        return 0.2

    def _resolve_file(self, file: str) -> str:
        path = Path(file)
        if path.is_absolute():
            return file
        else:
            return (Path(self.directory.name) / Path(file)).as_posix()
```

## `util/_sandbox/recon.py`

```python
from typing import Literal, TypeAlias

from typing_extensions import TypedDict

from inspect_ai.util._sandbox.environment import SandboxEnvironment

Architecture: TypeAlias = Literal[
    "amd64",  # 64-bit Intel/AMD
    "arm64",  # 64-bit ARM
]


class SupportedContainerOSInfo(TypedDict, total=False):
    os: Literal["Linux"]
    distribution: Literal["Ubuntu", "Debian", "Kali Linux", "Debian-based"]
    version: str
    version_info: str
    architecture: Architecture
    uname: str


async def detect_sandbox_os(sandbox: SandboxEnvironment) -> SupportedContainerOSInfo:
    """Detect OS information using standard platform.uname() system values."""
    # First, determine the system type using uname -s (similar to platform.uname().system)
    system_cmd = """
if command -v uname >/dev/null 2>&1; then
    uname -s
else
    echo "unknown"
fi
"""

    system_output = await _sandbox_exec(sandbox, system_cmd)
    system = system_output.strip() if system_output else "unknown"

    # Only Linux is supported for tool injection
    if system == "Linux":
        return await _detect_linux(sandbox)
    else:
        raise NotImplementedError(
            f"Tool support injection is not implemented for OS: {system}. "
            "Only Linux containers are currently supported."
        )


async def _sandbox_exec(sandbox: SandboxEnvironment, command: str) -> str:
    """Execute a command in the container and return the output."""
    result = await sandbox.exec(["sh", "-c", command], timeout=120)
    if not result.success:
        raise RuntimeError(
            f"Error executing command {' '.join(command)}: {result.stderr}"
        )
    return result.stdout.strip()


async def _detect_architecture(sandbox: SandboxEnvironment) -> Architecture:
    """Detect the architecture of the container using standard platform.uname() machine values."""
    arch_cmd = """
if command -v uname >/dev/null 2>&1; then
    uname -m
else
    echo "unknown"
fi
"""

    arch_output = await _sandbox_exec(sandbox, arch_cmd)
    if not arch_output or arch_output == "unknown":
        raise RuntimeError("Unable to determine sandbox architecture")

    arch = arch_output.lower()
    arch_mapping: dict[str, Architecture] = {
        "x86_64": "amd64",
        "amd64": "amd64",  # Windows/Docker often reports as amd64
        "aarch64": "arm64",
        "arm64": "arm64",  # macOS/Docker often reports as arm64
    }

    if arch not in arch_mapping:
        raise NotImplementedError(f"Architecture {arch} is not supported.")
    return arch_mapping[arch]


async def _detect_linux(sandbox: SandboxEnvironment) -> SupportedContainerOSInfo:
    """Detect Linux distribution information."""
    # Check /etc/os-release first
    os_release_cmd = """
if [ -f /etc/os-release ]; then
    cat /etc/os-release
else
    echo "not_found"
fi
"""

    architecture = await _detect_architecture(sandbox)
    os_release_output = await _sandbox_exec(sandbox, os_release_cmd)
    if os_release_output and os_release_output != "not_found":
        os_info = {
            key: value.strip('"')
            for line in os_release_output.split("\n")
            if "=" in line
            for key, value in [line.split("=", 1)]
        }

        distro_id = os_info.get("ID", "").lower()

        return SupportedContainerOSInfo(
            os="Linux",
            distribution=(
                "Ubuntu"
                if distro_id == "ubuntu"
                else "Debian"
                if distro_id == "debian"
                else "Kali Linux"
            ),
            version=os_info.get("VERSION", "Unknown"),
            architecture=architecture,
        )

    # Fallback: check for Kali version file
    kali_version = await _sandbox_exec(
        sandbox, "[ -f /etc/kali_version ] && cat /etc/kali_version"
    )
    if kali_version:
        return SupportedContainerOSInfo(
            os="Linux",
            distribution="Kali Linux",
            version=kali_version,
            architecture=architecture,
        )

    # Fallback: check for Debian version file
    debian_version = await _sandbox_exec(
        sandbox, "[ -f /etc/debian_version ] && cat /etc/debian_version"
    )
    if debian_version:
        return SupportedContainerOSInfo(
            os="Linux",
            distribution="Debian-based",
            version=debian_version,
            architecture=architecture,
        )

    # Last resort: raise error if OS/distribution could not be determined
    raise RuntimeError("Could not determine OS/distribution")
```

## `util/_sandbox/registry.py`

```python
from typing import Callable, Type, TypeVar, cast

from inspect_ai._util.registry import (
    RegistryInfo,
    registry_add,
    registry_find,
    registry_name,
    registry_unqualified_name,
)

from .environment import SandboxEnvironment

_SANDBOX_PACKAGES: dict[str, str] = {
    "k8s": "inspect-k8s-sandbox",
    "ec2": "git+https://github.com/UKGovernmentBEIS/inspect_ec2_sandbox.git",
    "proxmox": "git+https://github.com/UKGovernmentBEIS/inspect_proxmox_sandbox.git",
    "modal": "inspect-sandboxes",
    "daytona": "inspect-sandboxes",
}

T = TypeVar("T", bound=SandboxEnvironment)


def sandboxenv(name: str) -> Callable[..., Type[T]]:
    r"""Decorator for registering sandbox environments.

    Args:
        name (str): Name of SandboxEnvironment type
    """

    def wrapper(sandboxenv_type: Type[T] | Callable[..., Type[T]]) -> Type[T]:
        # resolve if its a function
        if not isinstance(sandboxenv_type, type):
            sandboxenv_type = sandboxenv_type()
        # determine name
        sandboxenv_name = registry_name(sandboxenv_type, name)

        # register
        return sandboxenv_register(sandboxenv_type, sandboxenv_name)

    return wrapper


def sandboxenv_register(sandboxenv_type: Type[T], name: str) -> Type[T]:
    registry_add(
        sandboxenv_type,
        RegistryInfo(type="sandboxenv", name=name),
    )
    return sandboxenv_type


def registry_find_sandboxenv(envtype: str) -> type[SandboxEnvironment]:
    # find a matching sandboxenv_type
    sanxboxenv_types = registry_find(registry_match_sandboxenv(envtype))
    if len(sanxboxenv_types) > 0:
        sandboxenv_type = cast(type[SandboxEnvironment], sanxboxenv_types[0])
        return sandboxenv_type
    else:
        package = _SANDBOX_PACKAGES.get(envtype)
        if package:
            package_msg = (
                f". Please install the '{package}' package to use this sandbox."
            )
        else:
            package_msg = ""
        raise ValueError(
            f"SandboxEnvironment type '{envtype}' not recognized.{package_msg}"
        )


def registry_has_sandboxenv(envtype: str) -> bool:
    # see if we have this type
    return len(registry_find(registry_match_sandboxenv(envtype))) > 0


def registry_match_sandboxenv(envtype: str) -> Callable[[RegistryInfo], bool]:
    # check for sandboxenv name matching unqualified name (package prefix not
    # required as sandboxenv providers are registred globally for ease of
    # use from the command line and .env files)
    def match(info: RegistryInfo) -> bool:
        if info.type == "sandboxenv" and registry_unqualified_name(info) == envtype:
            return True
        else:
            return False

    return match
```

## `util/_sandbox/self_check.py`

```python
from typing import Any, Callable, Coroutine, Generic, Optional, Type, TypeVar
from unittest import mock

from inspect_ai.util import (
    OutputLimitExceededError,
    SandboxEnvironment,
    SandboxEnvironmentLimits,
)

# If you're wondering these tests are not using pytest fixtures,
# see the discussion https://github.com/UKGovernmentBEIS/inspect_ai/pull/347
# It's not ideal, so a PR to fix this would be welcome.
#
# If you are struggling to debug a failing one of these, two tips:
# 1. Comment out everything apart from the failing test in the list in the `self_check` function
# 2. Get rid of the try/catch in check_test_fn (the body can just be `await fn(sandbox_env); return True`


async def check_test_fn(
    fn: Callable[[SandboxEnvironment], Coroutine[Any, Any, None]],
    sandbox_env: SandboxEnvironment,
) -> bool | str:
    # Import this here rather than in module header in case of breakages because
    # it's internal
    from _pytest.outcomes import Failed

    try:
        await fn(sandbox_env)
        return True
    except AssertionError as e:
        return f"FAILED: [{str(e)}]"
    except Failed as e:
        return f"FAILED: [{str(e)}]"
    except Exception as e:
        return f"ERROR: [{repr(e)}]"


async def self_check(sandbox_env: SandboxEnvironment) -> dict[str, bool | str]:
    # Note that these tests reuse the same sandbox environment. This means that
    # if a test fails to clean up after itself, it may affect other tests.

    results = {}

    for fn in [
        test_read_and_write_file_text,
        test_read_and_write_file_binary,
        test_read_and_write_large_file_binary,
        test_write_file_text_utf,
        test_read_and_write_file_including_directory_absolute,
        test_read_and_write_file_including_directory_relative,
        test_read_file_zero_length,
        test_read_file_not_found,
        test_read_file_not_allowed,
        test_read_file_is_directory,
        test_read_file_nonsense_name,
        test_read_file_limit,
        test_write_text_file_zero_length,
        test_write_text_file_space,
        test_write_text_file_is_directory,
        test_write_text_file_without_permissions,
        test_write_text_file_exists,
        test_write_binary_file_zero_length,
        test_write_binary_file_space,
        test_write_binary_file_is_directory,
        test_write_binary_file_without_permissions,
        test_write_binary_file_exists,
        test_exec_output,
        test_exec_stderr,
        test_exec_returncode,
        test_exec_timeout,
        test_exec_permission_error,
        test_exec_env_vars,
        test_exec_as_user,
        test_exec_as_nonexistent_user,
        test_cwd_unspecified,
        test_cwd_custom,
        test_cwd_relative,
        test_cwd_absolute,
    ]:
        print(f"self_check: running {fn.__name__}")
        results[fn.__name__] = await check_test_fn(fn, sandbox_env)

    return results


async def _cleanup_file(sandbox_env: SandboxEnvironment, filename: str) -> None:
    res = await sandbox_env.exec(["rm", "-f", "--", filename])
    assert res.success


async def test_read_and_write_file_text(sandbox_env: SandboxEnvironment) -> None:
    file_name = "test_read_and_write_file_text.file"
    await sandbox_env.write_file(file_name, "great #content\nincluding newlines")
    written_file_string = await sandbox_env.read_file(file_name, text=True)
    assert "great #content\nincluding newlines" == written_file_string, (
        f"unexpected content: [{written_file_string}]"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_write_file_text_utf(sandbox_env: SandboxEnvironment) -> None:
    utf_content = "✨☽︎✨🌞︎︎✨🚀✨"
    file_name = "test_write_file_text_utf.file"
    await sandbox_env.write_file(file_name, utf_content)
    file_with_utf_content = await sandbox_env.read_file(file_name, text=True)
    assert isinstance(file_with_utf_content, str), (
        f"Expected file content to be a string, got {type(file_with_utf_content)}"
    )
    assert file_with_utf_content == utf_content, (
        f"UTF-8 content should match, got {file_with_utf_content=}; expected {utf_content=}"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_read_and_write_file_binary(sandbox_env: SandboxEnvironment) -> None:
    file_name = "test_read_and_write_file_binary.file"
    await sandbox_env.write_file(
        file_name, b"\xc3\x28"
    )  # invalid UTF-8 from https://stackoverflow.com/a/17199164/116509

    written_file_bytes = await sandbox_env.read_file(file_name, text=False)
    assert b"\xc3\x28" == written_file_bytes, "Binary content should match"
    await _cleanup_file(sandbox_env, file_name)


async def test_read_and_write_large_file_binary(
    sandbox_env: SandboxEnvironment,
) -> None:
    file_name = "test_read_and_write_large_file_binary.file"
    long_bytes = b"\xc3" * 5_000_000
    await sandbox_env.write_file(file_name, long_bytes)
    written_file_bytes = await sandbox_env.read_file(file_name, text=False)
    assert long_bytes == written_file_bytes, "Large binary content should match"
    await _cleanup_file(sandbox_env, file_name)


async def test_read_and_write_file_including_directory_absolute(
    sandbox_env: SandboxEnvironment,
) -> None:
    file_name = "/tmp/test_rw_including_directory_absolute/test.file"
    await sandbox_env.write_file(file_name, "absolutely enjoying being in a directory")
    written_file_string = await sandbox_env.read_file(file_name, text=True)
    assert "absolutely enjoying being in a directory" == written_file_string, (
        f"Absolute directory content should match, got {written_file_string=}"
    )
    await _cleanup_file(sandbox_env, file_name)
    await sandbox_env.exec(["rmdir", "/tmp/test_rw_including_directory_absolute"])


async def test_read_and_write_file_including_directory_relative(
    sandbox_env: SandboxEnvironment,
) -> None:
    file_name = "test_rw_including_directory_relative/test.file"
    await sandbox_env.write_file(file_name, "relatively enjoying being in a directory")
    written_file_string = await sandbox_env.read_file(file_name, text=True)
    assert "relatively enjoying being in a directory" == written_file_string, (
        f"Relative directory content should match, got {written_file_string=}"
    )
    await _cleanup_file(sandbox_env, file_name)
    await sandbox_env.exec(["rmdir", "test_rw_including_directory_relative"])


async def test_read_file_zero_length(sandbox_env: SandboxEnvironment) -> None:
    file_name = "zero_length_file.file"
    await sandbox_env.exec(["touch", file_name])
    zero_length = await sandbox_env.read_file(file_name, text=True)
    assert isinstance(zero_length, str), (
        f"Zero-length file should return a string, got {type(zero_length)}"
    )
    assert zero_length == "", (
        f"Zero-length file should be an empty string, got {zero_length=}"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_read_file_not_found(sandbox_env: SandboxEnvironment) -> None:
    file_name = "nonexistent"
    with Raises(FileNotFoundError) as e_info:
        await sandbox_env.read_file(file_name, text=True)
    assert e_info is not None, "FileNotFoundError should be raised"
    assert file_name in str(e_info.value), (
        f"FileNotFoundError should contain the filename, got {e_info.value=}"
    )


async def test_read_file_not_allowed(sandbox_env: SandboxEnvironment) -> None:
    file_name = "test_read_file_not_allowed.file"
    await sandbox_env.write_file(file_name, "inaccessible #content")
    await sandbox_env.exec(["chmod", "-r", file_name])
    with Raises(PermissionError) as e_info:
        await sandbox_env.read_file(file_name, text=True)
    assert e_info is not None, "PermissionError should be raised"
    assert file_name in str(e_info.value), (
        f"PermissionError should contain the filename, got {e_info.value=}"
    )
    await sandbox_env.exec(["chmod", "+r", file_name])
    await _cleanup_file(sandbox_env, file_name)


async def test_read_file_is_directory(sandbox_env: SandboxEnvironment) -> None:
    file_name = "/etc"
    with Raises(IsADirectoryError) as e_info:
        await sandbox_env.read_file(file_name, text=True)
        assert e_info is not None, "IsADirectoryError should be raised"
    assert "directory" in str(e_info.value), (
        f"IsADirectoryError should mention 'directory', got {e_info.value=}"
    )


async def test_read_file_nonsense_name(
    sandbox_env: SandboxEnvironment,
) -> None:
    file_name = "https:/en.wikipedia.org/wiki/Bart%C5%82omiej_Kasprzykowski"
    with Raises(FileNotFoundError) as e_info:
        await sandbox_env.read_file(file_name, text=True)
    assert e_info is not None, "FileNotFoundError should be raised"
    assert "wikipedia" in str(e_info.value), (
        f"FileNotFoundError should contain the filename, got {e_info.value=}"
    )


async def test_read_file_limit(sandbox_env: SandboxEnvironment) -> None:
    file_name = "large.file"
    await sandbox_env.write_file(file_name, "a" * 2048)  # 2 KiB
    # Patch limit down to 1KiB for the test to save us from writing a 100 MiB file.
    with mock.patch.object(SandboxEnvironmentLimits, "MAX_READ_FILE_SIZE", 1024):
        with Raises(OutputLimitExceededError) as e_info:
            await sandbox_env.read_file(file_name, text=True)
    assert e_info is not None, "OutputLimitExceededError should be raised"
    assert "limit of 100 MiB was exceeded" in str(e_info.value), (
        f"OutputLimitExceededError should mention the limit, got {e_info.value=}"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_write_text_file_zero_length(sandbox_env: SandboxEnvironment) -> None:
    file_name = "zero_length_file.file"
    await sandbox_env.write_file(file_name, "")
    zero_length = await sandbox_env.read_file(file_name, text=True)
    assert isinstance(zero_length, str), (
        f"Zero-length file should return a string, got {type(zero_length)}"
    )
    assert zero_length == "", (
        f"Zero-length file should be an empty string, got {zero_length=}"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_write_text_file_space(sandbox_env: SandboxEnvironment) -> None:
    space = "to the moon"
    file_name = "file with space.file"
    await sandbox_env.write_file(file_name, space)
    file_with_space = await sandbox_env.read_file(file_name, text=True)
    assert isinstance(file_with_space, str), (
        f"File with space should return a string, got {type(file_with_space)}"
    )
    assert file_with_space == space, (
        f"File with space content should match, got {file_with_space=}; expected {space=}"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_write_text_file_is_directory(
    sandbox_env: SandboxEnvironment,
) -> None:
    # ensure /tmp/directory exists
    await sandbox_env.write_file(
        "/tmp/inspect_ai_test_write_text_file_is_directory/file", "unused content"
    )
    with Raises(IsADirectoryError) as e_info:
        await sandbox_env.write_file(
            "/tmp/inspect_ai_test_write_text_file_is_directory",
            "content cannot go in a directory, dummy",
        )
    assert e_info is not None, "IsADirectoryError should be raised"
    assert "directory" in str(e_info.value), (
        f"IsADirectoryError should mention 'directory', got {e_info.value=}"
    )
    await sandbox_env.exec(
        ["rm", "-rf", "/tmp/inspect_ai_test_write_text_file_is_directory"]
    )


async def test_write_text_file_without_permissions(
    sandbox_env: SandboxEnvironment,
) -> None:
    file_name = "test_write_text_file_without_permissions.file"
    await sandbox_env.write_file(file_name, "impervious #content")
    await sandbox_env.exec(["chmod", "-w", file_name])
    with Raises(PermissionError) as e_info:
        await sandbox_env.write_file(file_name, "this won't stick")
    assert e_info is not None, "PermissionError should be raised"
    assert file_name in str(e_info.value), (
        f"PermissionError should contain the filename, got {e_info.value=}"
    )
    await sandbox_env.exec(["chmod", "+w", file_name])
    await _cleanup_file(sandbox_env, file_name)


async def test_write_text_file_exists(
    sandbox_env: SandboxEnvironment,
) -> None:
    file_name = "file_exists.file"
    await sandbox_env.write_file(file_name, "mundane content")
    await sandbox_env.write_file(file_name, "altered content")
    altered_content = await sandbox_env.read_file(file_name, text=True)
    assert altered_content == "altered content", (
        f"Existing file content should be overwritten, got {altered_content=}"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_write_binary_file_zero_length(sandbox_env: SandboxEnvironment) -> None:
    file_name = "zero_length_file.file"
    await sandbox_env.write_file(file_name, b"")
    zero_length = await sandbox_env.read_file(file_name, text=False)
    assert isinstance(zero_length, bytes), (
        f"Zero-length file should return bytes, got {type(zero_length)}"
    )
    assert zero_length == b"", (
        f"Zero-length file should be empty bytes, got {zero_length=}"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_write_binary_file_space(sandbox_env: SandboxEnvironment) -> None:
    binary_content = b"\xc3\x28"
    file_name = "file with space.file"
    await sandbox_env.write_file(file_name, binary_content)
    file_with_space = await sandbox_env.read_file(file_name, text=False)
    assert isinstance(file_with_space, bytes), (
        f"File with space should return bytes, got {type(file_with_space)}"
    )
    assert file_with_space == binary_content, "File with space content should match"
    await _cleanup_file(sandbox_env, file_name)


async def test_write_binary_file_is_directory(
    sandbox_env: SandboxEnvironment,
) -> None:
    # ensure /tmp/directory exists
    await sandbox_env.write_file(
        "/tmp/inspect_ai_test_write_binary_file_is_directory/file", "unused content"
    )
    with Raises(IsADirectoryError) as e_info:
        await sandbox_env.write_file(
            "/tmp/inspect_ai_test_write_binary_file_is_directory",
            b"\xc3\x28",
        )
    assert e_info is not None, "IsADirectoryError should be raised"
    assert "directory" in str(e_info.value), (
        f"IsADirectoryError should mention 'directory', got {e_info.value=}"
    )
    await sandbox_env.exec(
        ["rm", "-rf", "/tmp/inspect_ai_test_write_binary_file_is_directory"]
    )


async def test_write_binary_file_without_permissions(
    sandbox_env: SandboxEnvironment,
) -> None:
    file_name = "test_write_binary_file_without_permissions.file"
    await sandbox_env.write_file(file_name, "impervious #content")
    await sandbox_env.exec(["chmod", "-w", file_name])
    with Raises(PermissionError) as e_info:
        await sandbox_env.write_file(file_name, b"\xc3\x28")
    assert e_info is not None, "PermissionError should be raised"
    assert file_name in str(e_info.value), (
        f"PermissionError should contain the filename, got {e_info.value=}"
    )
    await sandbox_env.exec(["chmod", "+w", file_name])
    await _cleanup_file(sandbox_env, file_name)


async def test_write_binary_file_exists(
    sandbox_env: SandboxEnvironment,
) -> None:
    file_name = "file_exists.file"
    await sandbox_env.write_file(file_name, b"\xc3\x28")
    await sandbox_env.write_file(file_name, b"\xc3\x29")
    altered_content = await sandbox_env.read_file(file_name, text=False)
    assert altered_content == b"\xc3\x29", "Existing file content should be overwritten"
    await _cleanup_file(sandbox_env, file_name)


async def test_exec_output(sandbox_env: SandboxEnvironment) -> None:
    exec_result = await sandbox_env.exec(["sh", "-c", "echo foo; echo bar"])
    expected = "foo\nbar\n"
    # in the assertion message, we show the actual bytes to help debug newline issues
    assert exec_result.stdout == expected, (
        f"Unexpected output:expected {expected.encode('UTF-8')!r}; got {exec_result.stdout.encode('UTF-8')!r}"
    )


async def test_exec_stderr(sandbox_env: SandboxEnvironment) -> None:
    exec_result = await sandbox_env.exec(["sh", "-c", "echo boof; echo baz >&2"])
    assert exec_result.stderr == "baz\n", (
        f"stderr output should match; got {exec_result.stderr=}, expected 'baz\n'"
    )


async def test_exec_returncode(sandbox_env: SandboxEnvironment) -> None:
    exec_result = await sandbox_env.exec(["sh", "-c", "echo foo; exit 70"])
    assert exec_result.returncode == 70, (
        f"Return code should match, got {exec_result.returncode=}, expected 70"
    )


async def test_exec_timeout(sandbox_env: SandboxEnvironment) -> None:
    with Raises(TimeoutError):
        await sandbox_env.exec(["sleep", "4"], timeout=2)


async def test_exec_permission_error(sandbox_env: SandboxEnvironment) -> None:
    with Raises(PermissionError):
        # /etc/password is not an executable file so this should fail
        await sandbox_env.exec(["/etc/passwd"])


async def test_exec_env_vars(sandbox_env: SandboxEnvironment) -> None:
    exec_result = await sandbox_env.exec(
        cmd=["sh", "-c", "echo $CUSTOM_ENV_VAR_1; echo $CUSTOM_ENV_VAR_2"],
        env={
            "CUSTOM_ENV_VAR_1": "chonko zamboodle",
            "CUSTOM_ENV_VAR_2": "zeddle_zom",
        },
    )
    assert exec_result.stdout == "chonko zamboodle\nzeddle_zom\n", (
        f"env var not passed to script; got {exec_result.stdout=}"
    )


async def test_exec_as_user(sandbox_env: SandboxEnvironment) -> None:
    username = "inspect-ai-test-exec-as-user"

    # Neither adduser nor useradd are part of POSIX, so we need some brittle logic here
    adduser_help_exec_result = await sandbox_env.exec(["adduser", "--help"])
    adduser_help_text = (
        adduser_help_exec_result.stdout + adduser_help_exec_result.stderr
    )

    if "BusyBox" in adduser_help_text:
        adduser_command = ["adduser", "-D", username]
    else:
        adduser_command = [
            "adduser",
            "--comment",
            "self_check.py",
            "--disabled-password",
            username,
        ]

    try:
        # Create a new user
        add_user_result = await sandbox_env.exec(
            adduser_command,
            user="root",
            timeout=10,  # in one case adduser decided to ask for input which caused the test to hang indefinitely
        )
        assert add_user_result.success, f"Failed to add user: {add_user_result.stderr}"

        # Test exec as different users
        root_result = await sandbox_env.exec(["whoami"], user="root")
        assert root_result.stdout.strip() == "root", (
            f"Expected 'root', got '{root_result.stdout.strip()}'"
        )
        myuser_result = await sandbox_env.exec(["whoami"], user=username)
        assert myuser_result.stdout.strip() == username, (
            f"Expected '{username}', got '{myuser_result.stdout.strip()}'"
        )
    finally:
        # Clean up
        await sandbox_env.exec(["userdel", "-r", username], user="root")


async def test_exec_as_nonexistent_user(sandbox_env: SandboxEnvironment) -> None:
    nonexistent_username = "nonexistent"
    result = await sandbox_env.exec(["whoami"], user=nonexistent_username)
    assert not result.success, "Command should have failed for nonexistent user"
    assert (
        nonexistent_username in result.stdout or nonexistent_username in result.stderr
    ), (
        f"Error not found in command output: '{result.stdout}' nor stderr '{result.stderr}"
    )


async def test_cwd_unspecified(sandbox_env: SandboxEnvironment) -> None:
    file_name = "test_cwd_unspecified.file"
    await sandbox_env.write_file(file_name, "ls me plz")
    current_dir_contents = (await sandbox_env.exec(["ls", "-1"])).stdout
    assert file_name in current_dir_contents, (
        f"File should be in current directory contents; got {current_dir_contents=}"
    )
    await _cleanup_file(sandbox_env, file_name)


async def test_cwd_custom(sandbox_env: SandboxEnvironment) -> None:
    current_dir_contents = (await sandbox_env.exec(["ls"], cwd="/usr/bin")).stdout
    assert "env" in current_dir_contents, (
        f"env should be in /usr/bin; got {current_dir_contents=}"
    )


async def test_cwd_relative(sandbox_env: SandboxEnvironment) -> None:
    cwd_subdirectory = "subdir"
    await sandbox_env.exec(["mkdir", cwd_subdirectory])
    file_name = "test_cwd_relative.file"
    file_path = cwd_subdirectory + "/" + file_name
    await sandbox_env.write_file(file_path, "ls me plz")
    current_dir_contents = (await sandbox_env.exec(["ls"], cwd=cwd_subdirectory)).stdout
    assert file_name in current_dir_contents, (
        f"{file_name} not found in {current_dir_contents}"
    )
    await _cleanup_file(sandbox_env, file_path)


async def test_cwd_absolute(sandbox_env: SandboxEnvironment) -> None:
    cwd_directory = "/tmp/test_cwd_absolute"
    await sandbox_env.exec(["mkdir", cwd_directory])
    file_name = "/tmp/test_cwd_absolute/test_cwd_absolute.file"
    await sandbox_env.write_file(file_name, "ls me plz")
    current_dir_contents = (await sandbox_env.exec(["ls"], cwd=cwd_directory)).stdout
    assert "test_cwd_absolute.file" in current_dir_contents, (
        f"File should be in current directory contents, got {current_dir_contents=}"
    )
    await _cleanup_file(sandbox_env, file_name)
    await sandbox_env.exec(["rmdir", cwd_directory])


# TODO: write a test for when cwd doesn't exist

# Generic type variable for exceptions
E = TypeVar("E", bound=BaseException)


class Raises(Generic[E]):
    def __init__(self, expected_exception: Type[E]):
        self.expected_exception = expected_exception
        self.value: Optional[E] = None  # Store the caught exception

    def __enter__(self) -> "Raises[E]":
        return self

    def __exit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_value: Optional[BaseException],
        traceback: Optional[Any],
    ) -> bool:
        if exc_type is None:
            raise AssertionError(
                f"Expected exception {self.expected_exception.__name__} but no exception was raised."
            )
        if not issubclass(exc_type, self.expected_exception):
            raise AssertionError(
                f"Expected exception {self.expected_exception.__name__}, but got {exc_type.__name__}."
            )
        self.value = exc_value  # type: ignore
        return True
```

## `util/_sandbox/service.py`

```python
import json
import traceback
from logging import getLogger
from pathlib import PurePosixPath
from textwrap import dedent
from typing import (
    Awaitable,
    Callable,
    Literal,
    cast,
    overload,
)

import anyio
from pydantic import JsonValue

from inspect_ai._util._async import coro_log_exceptions
from inspect_ai._util.error import PrerequisiteError
from inspect_ai.util._subprocess import ExecResult

from .environment import SandboxEnvironment

logger = getLogger(__name__)


REQUESTS_DIR = "requests"
RESPONSES_DIR = "responses"
SERVICES_DIR = "/var/tmp/sandbox-services"

ID = "id"
METHOD = "method"
PARAMS = "params"

ERROR = "error"
RESULT = "result"

POLLING_INTERVAL = 0.1

SandboxServiceMethod = Callable[..., Awaitable[JsonValue]]


@overload
async def sandbox_service(
    name: str,
    methods: list[SandboxServiceMethod] | dict[str, SandboxServiceMethod],
    until: Callable[[], bool],
    sandbox: SandboxEnvironment,
    user: str | None = ...,
    instance: str | None = ...,
    polling_interval: float | None = ...,
    started: anyio.Event | None = ...,
    requires_python: bool = ...,
    handle_requests: Literal[True] = ...,
) -> None: ...


@overload
async def sandbox_service(
    name: str,
    methods: list[SandboxServiceMethod] | dict[str, SandboxServiceMethod],
    until: Callable[[], bool],
    sandbox: SandboxEnvironment,
    user: str | None = ...,
    instance: str | None = ...,
    polling_interval: float | None = ...,
    started: anyio.Event | None = ...,
    requires_python: bool = ...,
    handle_requests: Literal[False] = ...,
) -> Callable[[], Awaitable[None]]: ...


async def sandbox_service(
    name: str,
    methods: list[SandboxServiceMethod] | dict[str, SandboxServiceMethod],
    until: Callable[[], bool],
    sandbox: SandboxEnvironment,
    user: str | None = None,
    instance: str | None = None,
    polling_interval: float | None = None,
    started: anyio.Event | None = None,
    requires_python: bool = True,
    handle_requests: bool = True,
) -> None | Callable[[], Awaitable[None]]:
    """Run a service that is callable from within a sandbox.

    The service makes available a set of methods to a sandbox
    for calling back into the main Inspect process.

    To use the service from within a sandbox, either add it to the sys path
    or use importlib. For example, if the service is named 'foo':

    ```python
    import sys
    sys.path.append("/var/tmp/sandbox-services/foo")
    import foo
    ```

    Or:

    ```python
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "foo", "/var/tmp/sandbox-services/foo/foo.py"
    )
    foo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(foo)
    ```

    Args:
        name: Service name
        methods: Service methods.
        until: Function used to check whether the service should stop.
        sandbox: Sandbox to publish service to.
        user: User to login as. Defaults to the sandbox environment's default user.
        instance: If you want multiple instances of a service in a single sandbox
            then use the `instance` param.
        polling_interval: Polling interval for request checking. If not specified uses
            sandbox specific default (2 seconds if not specified, 0.2 seconds for Docker).
        started: Event to set when service has been started
        requires_python: Does the sandbox service require Python? Note that ALL sandbox services require Python unless they've injected an alternate implementation of the sandbox service client code.
        handle_requests: If `True` (the default), handle requests immediately -- will run so long as until() returns `True`. If `False`, returns an async function which can be called to handle requests.
    """
    # validate python in sandbox
    if requires_python:
        await validate_sandbox_python(name, sandbox, user)

    # sort out polling interval
    default_polling_interval = sandbox.default_polling_interval()
    if polling_interval is None:
        polling_interval = default_polling_interval
    else:
        # use the default as a limit which you can't go beneath
        polling_interval = max(polling_interval, default_polling_interval)

    # setup and start service
    service = SandboxService(name, sandbox, user, instance, started)
    if isinstance(methods, list):
        methods = {v.__name__: v for v in methods}
    for name, method in methods.items():
        service.add_method(name, method)
    await service.start()

    # function to handle requests catching errors and logging a warning
    async def safe_handle_requests() -> None:
        try:
            await service.handle_requests()
        except RuntimeError as ex:
            logger.warning(f"Error waiting for sandbox rpc: {ex}")

    # wait for and process methods
    if handle_requests:
        while not until():
            await anyio.sleep(polling_interval)
            await safe_handle_requests()
        return None
    else:
        return safe_handle_requests


class SandboxService:
    """Sandbox service.

    Service that makes available a set of methods to a sandbox
    for calling back into the main Inspect process.

    To use the service from within a sandbox, either add it to the sys path
    or use importlib. For example, if the service is named 'foo':

    ```python
    import sys
    sys.path.append("/var/tmp/sandbox-services/foo")
    import foo
    ```

    Or:

    ```python
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "foo", "/var/tmp/sandbox-services/foo/foo.py"
    )
    foo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(foo)
    ```

    If you are using an `instance`, then include that in the
    path after the service name:

    ```python
    spec = importlib.util.spec_from_file_location(
        "foo", "/var/tmp/sandbox-services/foo/<instance>/foo.py"
    )
    ```
    """

    def __init__(
        self,
        name: str,
        sandbox: SandboxEnvironment,
        user: str | None = None,
        instance: str | None = None,
        started: anyio.Event | None = None,
    ) -> None:
        """Create a SandboxService.

        Args:
            name (str): Service name
            sandbox (SandboxEnvironment): Sandbox to publish service to.
            user (str | None): User to login as. Defaults to the sandbox environment's
              default user.
            instance: Unique identifier for an instance of this named service
               (should be a valid posix filename)
            started: Event to set when service has been started
        """
        self._name = name
        self._sandbox = sandbox
        self._user = user
        self._started = started
        self._service_dir = PurePosixPath(SERVICES_DIR, self._name)
        self._root_service_dir = self._service_dir
        if instance is not None:
            self._service_dir = self._service_dir / instance
        self._methods: dict[str, SandboxServiceMethod] = {}
        self._requests_dir: str = ""
        self._responses_dir: str = ""
        self._client_script: str = ""

    def add_method(self, name: str, method: SandboxServiceMethod) -> None:
        """Add a method to the service.

        Args:
            name (str): Method name.
            method (SandboxServiceMethod): Function that implements method.
        """
        self._methods[name] = method

    async def start(self) -> None:
        """Start running the service."""
        # requests dir
        assert not self._requests_dir
        self._requests_dir = await self._create_rpc_dir(REQUESTS_DIR)

        # responses dir
        assert not self._responses_dir
        self._responses_dir = await self._create_rpc_dir(RESPONSES_DIR)

        # client script
        assert not self._client_script
        client_script = PurePosixPath(self._service_dir, f"{self._name}.py").as_posix()
        client_code = self._generate_client()
        await self._write_text_file(client_script, client_code)
        self._client_script = client_script

        # set started event if provided
        if self._started:
            self._started.set()

    async def handle_requests(self) -> None:
        """Handle all pending service requests."""
        # list pending requests
        list_requests = f"ls -1 {self._requests_dir}/*.json"
        result = await self._exec(["bash", "-c", list_requests])

        # process requests
        if result.success:
            request_files = result.stdout.strip().splitlines()
            if request_files:
                async with anyio.create_task_group() as tg:
                    for file in request_files:
                        tg.start_soon(
                            coro_log_exceptions,
                            logger,
                            "handling sandbox service request",
                            self._handle_request,
                            file,
                        )

    async def _handle_request(self, request_file: str) -> None:
        # read request
        read_request = f"cat {request_file}"
        result = await self._exec(["bash", "-c", read_request])
        if not result.success:
            raise RuntimeError(
                f"Error reading request for service {self._name}: '{read_request}' ({result.stderr})"
            )

        # parse request (decode error could occur if its incomplete so bypass this)
        try:
            request_data = json.loads(result.stdout)
        except json.JSONDecodeError:
            logger.warning(
                f"JSON decoding error reading service request: {result.stdout}"
            )
            return None
        if not isinstance(request_data, dict):
            raise TypeError(f"Service request is not a dict (type={request_data})")

        # read id (after we have this we can write responses)
        request_id = request_data.get(ID, None)
        if not isinstance(request_id, str):
            raise TypeError(
                f"Service request id is not a string (type={type(request_id)})"
            )

        # helpers to write responses and errors

        async def write_response(
            result: JsonValue | None, error: str | None = None
        ) -> None:
            # form response payload
            response_data = {
                ID: request_id,
                RESULT: result,
                ERROR: error,
            }

            # compute response path
            response_path = PurePosixPath(
                self._responses_dir, f"{request_id}.json"
            ).as_posix()

            # write response
            await self._write_text_file(response_path, json.dumps(response_data))

            # remove request file
            exec_rm = await self._exec(["rm", "-f", request_file])
            if not exec_rm.success:
                raise RuntimeError(
                    f"Error removing request file '{request_file}': {exec_rm.stderr}"
                )

        async def write_error_response(error: str) -> None:
            await write_response(None, error)

        # read and validate params
        method_name = request_data.get(METHOD, None)
        params = request_data.get(PARAMS, None)
        if not isinstance(method_name, str):
            await write_error_response(
                f"Service {METHOD} not passed or not a string (type={type(method_name)})"
            )
        elif method_name not in self._methods:
            await write_error_response(f"Unknown method '{method_name}'")
        elif not isinstance(params, dict):
            await write_error_response(
                f"{PARAMS} not passed or not a dict (type={params})"
            )

        # all clear, call the method
        else:
            from inspect_ai.log._samples import sample_active
            from inspect_ai.util._limit import LimitExceededError

            try:
                params = cast(dict[str, JsonValue], request_data.get(PARAMS))
                try:
                    method = self._methods[method_name]
                    await write_response(await method(**params))
                except LimitExceededError as ex:
                    active = sample_active()
                    if active is not None:
                        active.limit_exceeded(ex)
                    await write_error_response(
                        f"Limit exceeded calling method {method_name}: {ex.message}"
                    )
            except Exception as err:
                err_traceback = traceback.format_exc()
                await write_error_response(
                    f"Error calling method {method_name}: {err}: {err_traceback}"
                )

    async def _create_rpc_dir(self, name: str) -> str:
        rpc_dir = PurePosixPath(self._service_dir, name).as_posix()
        result = await self._exec(["rm", "-rf", rpc_dir])
        result = await self._exec(["mkdir", "-p", rpc_dir])
        if not result.success:
            raise RuntimeError(
                f"Error creating rpc directory '{name}' for sandbox '{self._name}': {result.stderr}"
            )
        return rpc_dir

    async def _write_text_file(self, file: str, contents: str) -> None:
        result = await self._exec(["tee", "--", file], input=contents)
        if not result.success:
            msg = f"Failed to write file '{file}' into container: {result.stderr}"
            raise RuntimeError(msg)

    async def _exec(self, cmd: list[str], input: str | None = None) -> ExecResult[str]:
        try:
            return await self._sandbox.exec(
                cmd, user=self._user, input=input, timeout=600, concurrency=False
            )
        except TimeoutError:
            raise RuntimeError(
                f"Timed out executing command {' '.join(cmd)} in sandbox"
            )

    # NOTE: A snapshot of the generated code for the bridge_model_service lives
    # within the bridge model proxy implementation. If you change this method you
    # should therefore re-generate this source code and sync it to the proxy:
    #   sandbox_service_script('bridge_model_service')
    # in point of fact we don't expect this code to ever change which is why
    # we haven't invested in an automated code syncing regimen.
    def _generate_client(self) -> str:
        return dedent(f"""
        from typing import Any

        def call_{self._name}(method: str, **params: Any) -> Any:
            from time import sleep
            request_id = _write_{self._name}_request(method, **params)
            while True:
                sleep({POLLING_INTERVAL})
                success, result = _read_{self._name}_response(request_id, method)
                if success:
                    return result

        async def call_{self._name}_async(method: str, **params: Any) -> Any:
            from asyncio import sleep
            request_id = _write_{self._name}_request(method, **params)
            while True:
                await sleep({POLLING_INTERVAL})
                success, result = _read_{self._name}_response(request_id, method)
                if success:
                    return result

        def _write_{self._name}_request(method: str, **params: Any) -> str:
            from json import dump
            from uuid import uuid4

            requests_dir = _{self._name}_service_dir("{REQUESTS_DIR}")
            request_id = str(uuid4())
            request_data = dict({ID}=request_id, {METHOD}=method, {PARAMS}=params)
            request_path = requests_dir / (request_id + ".json")
            with open(request_path, "w") as f:
                dump(request_data, f)
            return request_id

        def _read_{self._name}_response(request_id: str, method: str) -> tuple[bool, Any]:
            from json import JSONDecodeError, load

            responses_dir = _{self._name}_service_dir("{RESPONSES_DIR}")
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
                if response.get("{ERROR}", None) is not None:
                    raise Exception(response["{ERROR}"])

                # return response if we have one
                elif "{RESULT}" in response:
                    return True, response["{RESULT}"]

                # invalid response
                else:
                    raise RuntimeError(
                        "No {ERROR} or {RESULT} field in response for method " + method
                    )
            else:
                return False, None

        def _{self._name}_service_dir(subdir: str) -> Any:
            import os
            from pathlib import Path
            service_dir = Path("{self._root_service_dir}")
            instance = os.environ.get("{self._name.upper()}_INSTANCE", None)
            if instance is not None:
                service_dir = service_dir / instance
            return service_dir / subdir
        """)


def sandbox_service_script(name: str) -> str:
    # create a service just to generate the script (pass no sandbox)
    service = SandboxService(name, None)  # type: ignore[arg-type]
    return service._generate_client()


async def validate_sandbox_python(
    service_name: str, sandbox: SandboxEnvironment, user: str | None = None
) -> None:
    # validate python in sandbox
    result = await sandbox.exec(["which", "python3"], user=user, concurrency=False)
    if not result.success:
        raise PrerequisiteError(
            f"The {service_name} requires that Python be installed in the sandbox."
        )
```

## `util/_span.py`

```python
import contextlib
import inspect
from contextvars import ContextVar
from logging import getLogger
from typing import AsyncIterator

from shortuuid import uuid as shortuuid

logger = getLogger(__name__)


@contextlib.asynccontextmanager
async def span(
    name: str, *, type: str | None = None, id: str | None = None
) -> AsyncIterator[None]:
    """Context manager for establishing a transcript span.

    Args:
        name (str): Step name.
        type (str | None): Optional span type.
        id (str | None): Optional span ID. Generated if not provided.
    """
    from inspect_ai.event._span import SpanBeginEvent, SpanEndEvent
    from inspect_ai.log._transcript import (
        track_store_changes,
        transcript,
    )

    # span id
    id = id or shortuuid()

    # capture parent id
    parent_id = _current_span_id.get()

    # set new current span (reset at the end)
    token = _current_span_id.set(id)

    # run the span
    try:
        # span begin event
        transcript()._event(
            SpanBeginEvent(
                id=id,
                parent_id=parent_id,
                type=type or name,
                name=name,
            )
        )

        # run span w/ store change events
        with track_store_changes():
            yield

    finally:
        # send end event
        transcript()._event(SpanEndEvent(id=id))

        try:
            _current_span_id.reset(token)
        except ValueError:
            frame = inspect.stack()[1]
            caller = f"{frame.function}() [{frame.filename}:{frame.lineno}]"
            logger.warning(f"Exiting span created in another context: {caller}")


def current_span_id() -> str | None:
    """Return the current span id (if any)."""
    return _current_span_id.get()


_current_span_id: ContextVar[str | None] = ContextVar("_current_span_id", default=None)
```

## `util/_store.py`

```python
from contextvars import ContextVar
from copy import deepcopy
from typing import (
    TYPE_CHECKING,
    Any,
    ItemsView,
    KeysView,
    Type,
    TypeVar,
    ValuesView,
    cast,
    overload,
)

if TYPE_CHECKING:
    from inspect_ai.event._event import Event
    from inspect_ai.event._store import StoreEvent

import jsonpatch
from pydantic_core import to_jsonable_python

from inspect_ai._util.json import JsonChange, json_changes

VT = TypeVar("VT")


class Store:
    """The `Store` is used to record state and state changes.

    The `TaskState` for each sample has a `Store` which can be
    used when solvers and/or tools need to coordinate changes
    to shared state. The `Store` can be accessed directly from
    the `TaskState` via `state.store` or can be accessed using
    the `store()` global function.

    Note that changes to the store that occur are automatically
    recorded to transcript as a `StoreEvent`. In order to be
    serialised to the transcript, values and objects must be
    JSON serialisable (you can make objects with several fields
    serialisable using the `@dataclass` decorator or by
    inheriting from Pydantic `BaseModel`)
    """

    def __init__(self, data: dict[str, Any] | None = None) -> None:
        self._data = deepcopy(data) if data else {}

    @overload
    def get(self, key: str, default: None = None) -> Any: ...

    @overload
    def get(self, key: str, default: VT) -> VT: ...

    def get(self, key: str, default: VT | None = None) -> VT | Any:
        """Get a value from the store.

        Provide a `default` to automatically initialise a named
        store value with the default when it does not yet exist.

        Args:
           key (str): Name of value to get
           default (VT | None): Default value (defaults to `None`)

        Returns:
           Value if is exists, otherwise default.
        """
        if default is not None:
            if key not in self._data.keys():
                self._data[key] = default
        return cast(VT, self._data.get(key, default))

    def set(self, key: str, value: Any) -> None:
        """Set a value into the store.

        Args:
           key (str): Name of value to set
           value (Any): Value to set
        """
        self._data[key] = value

    def delete(self, key: str) -> None:
        """Remove a value from the store.

        Args:
           key (str): Name of value to remove
        """
        del self._data[key]

    def keys(self) -> KeysView[str]:
        """View of keys within the store."""
        return self._data.keys()

    def values(self) -> ValuesView[Any]:
        """View of values within the store."""
        return self._data.values()

    def items(self) -> ItemsView[str, Any]:
        """View of items within the store."""
        return self._data.items()

    def __contains__(self, key: object) -> bool:
        return key in self._data

    def __eq__(self, other: object) -> bool:
        return self._data.__eq__(other)

    def __ne__(self, value: object) -> bool:
        return self._data.__ne__(value)


def store() -> Store:
    """Get the currently active `Store`."""
    return _subtask_store.get()


def init_subtask_store(store: Store) -> None:
    _subtask_store.set(store)


_subtask_store: ContextVar[Store] = ContextVar("subtask_store", default=Store())


def store_changes(
    before: Store | dict[str, Any], after: Store | dict[str, Any]
) -> list[JsonChange] | None:
    if isinstance(before, Store):
        before = store_jsonable(before)
    if isinstance(after, Store):
        after = store_jsonable(after)
    return json_changes(before, after)


def store_jsonable(store: Store) -> dict[str, Any]:
    return dict_jsonable(store._data)


def dict_jsonable(data: dict[str, Any]) -> dict[str, Any]:
    return cast(
        dict[str, Any],
        to_jsonable_python(data, exclude_none=True, fallback=lambda _x: None),
    )


def store_from_events(events: list["Event"]) -> Store:
    """Reconstruct a Store by replaying StoreEvent changes.

    Uses event_tree() to ensure proper ordering of parallel events.
    Only processes StoreEvents from root-level spans (which encompass
    all nested changes) to avoid redundant replay.

    Args:
        events: List of Event objects (typically from EvalSample.events).

    Returns:
        Store: A new Store with reconstructed state.
    """
    from inspect_ai.event._store import StoreEvent
    from inspect_ai.event._tree import EventTreeSpan, event_tree

    tree = event_tree(events)
    data: dict[str, Any] = {}

    # Process only root-level items
    for node in tree:
        if isinstance(node, EventTreeSpan):
            # Find StoreEvents that are direct children (not nested in child spans)
            for child in node.children:
                if isinstance(child, StoreEvent):
                    data = _apply_store_event(data, child)
        elif isinstance(node, StoreEvent):
            # Root-level StoreEvent not in any span
            data = _apply_store_event(data, node)

    return Store(data)


def store_from_events_as(
    events: list["Event"],
    model_cls: Type["SMT"],
    instance: str | None = None,
) -> "SMT":
    """Reconstruct a StoreModel from events.

    Args:
        events: List of Event objects.
        model_cls: Pydantic model type (must derive from StoreModel).
        instance: Optional instance name for namespaced store keys.

    Returns:
        StoreModel: Instance populated with reconstructed data.
    """
    from inspect_ai.util._store_model import SMT as SMT_TypeVar  # noqa: F401

    reconstructed = store_from_events(events)

    # Un-namespace keys (following EvalSample.store_as pattern)
    prefix = f"{model_cls.__name__}:"
    data: dict[str, Any] = {}
    for key, value in reconstructed._data.items():
        if key.startswith(prefix):
            unprefixed = key[len(prefix) :]

            if instance is not None:
                # When instance specified, only include keys with that instance prefix
                if unprefixed.startswith(f"{instance}:"):
                    unprefixed = unprefixed[len(instance) + 1 :]
                else:
                    continue  # Skip keys for other instances or no instance
            else:
                # When no instance specified, skip keys that have any instance prefix
                if ":" in unprefixed:
                    continue  # This key belongs to a specific instance

            data[unprefixed] = value

    data["store"] = Store()  # Detached store
    if instance is not None:
        data["instance"] = instance

    return model_cls.model_validate(data)


# Type variable for store_from_events_as
from inspect_ai.util._store_model import SMT  # noqa: E402


def _json_change_to_patch_op(change: JsonChange) -> dict[str, Any]:
    """Convert a JsonChange to a jsonpatch operation dict with validation.

    Args:
        change: The JsonChange to convert.

    Returns:
        A dict suitable for use with jsonpatch.apply_patch().

    Raises:
        ValueError: If move/copy operation is missing required 'from' field.
    """
    op: dict[str, Any] = {"op": change.op, "path": change.path}

    if change.op in ("add", "replace", "test"):
        # These operations require a value (None is valid for explicit null)
        op["value"] = change.value
    elif change.op in ("move", "copy"):
        if change.from_ is None:
            raise ValueError(
                f"JsonChange operation '{change.op}' requires 'from' field"
            )
        op["from"] = change.from_
    # "remove" doesn't need additional fields

    return op


def _apply_store_event(
    data: dict[str, Any], store_event: "StoreEvent"
) -> dict[str, Any]:
    """Apply a StoreEvent's changes to a data dict.

    Args:
        data: The current state dict to modify.
        store_event: The StoreEvent containing changes to apply.

    Returns:
        The modified data dict.
    """
    patch_ops = [_json_change_to_patch_op(change) for change in store_event.changes]
    result: dict[str, Any] = jsonpatch.apply_patch(
        data,
        patch_ops,  # type: ignore[arg-type]
        in_place=True,
    )
    return result
```

## `util/_store_model.py`

```python
from typing import Any, Type, TypeVar

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from ._store import Store, store


class StoreModel(BaseModel):
    """Store backed Pydandic BaseModel.

    The model is initialised from a Store, so that Store should
    either already satisfy the validation constraints of the model
    OR you should provide Field(default=) annotations for all of
    your model fields (the latter approach is recommended).
    """

    store: Store = Field(exclude=True, default_factory=store)
    instance: str | None = Field(exclude=True, default=None)

    def model_post_init(self, __context: Any) -> None:
        for name in self.__class__.model_fields.keys():
            if name == "store":
                continue
            # if its in the store, then have our dict reflect that
            ns_name = self._ns_name(name)
            if ns_name in self.store:
                self._get_and_coerce_field(name)
            # if its not in the store, then reflect dict into store
            elif name in self.__dict__.keys():
                self.store.set(ns_name, self.__dict__[name])

            # validate that we aren't using a nested StoreModel
            self._validate_value(name, self.__dict__[name])

    def __getattribute__(self, name: str) -> Any:
        # sidestep dunders and pydantic fields
        if name.startswith("__") or name.startswith("model_"):
            return object.__getattribute__(self, name)
        # handle model_fields (except 'store' and 'namespace') by reading the store
        elif name in self.__class__.model_fields and name not in [
            "store",
            "instance",
        ]:
            store_key = self._ns_name(name)
            if store_key in self.store:
                return self._get_and_coerce_field(name)
            else:
                return object.__getattribute__(self, name)
        # default to super
        else:
            return super().__getattribute__(name)

    def __setattr__(self, name: str, value: Any) -> None:
        self._validate_value(name, value)
        if name in self.__class__.model_fields:
            # validate with the new value (can throw ValidationError)
            temp_data = self.store._data.copy()
            temp_data[self._ns_name(name)] = value
            self._validate_store(temp_data)

            # update the store and sync the underlying __dict__
            self.store.set(self._ns_name(name), value)
            self.__dict__[name] = value
        else:
            super().__setattr__(name, value)

    def model_dump(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        self._sync_model()  # in case store was updated behind our back
        return super().model_dump(*args, **kwargs)

    def model_dump_json(self, *args: Any, **kwargs: Any) -> str:
        self._sync_model()  # in case store was updated behind our back
        return super().model_dump_json(*args, **kwargs)

    def _sync_model(self) -> None:
        self._validate_store()
        for field_name in self.__class__.model_fields.keys():
            if field_name == "store":
                continue
            self._get_and_coerce_field(field_name)

    def _validate_store(self, data: dict[str, Any] | None = None) -> None:
        # validate store or custom dict
        data = data if data is not None else self.store._data

        # pick out keys to validate
        validate: dict[str, Any] = {}
        for k, v in data.items():
            if k.startswith(f"{self.__class__.__name__}:"):
                unprefixed = self._un_ns_name(k)
                validate[unprefixed] = v

        # perform validation
        self.__class__.model_validate(validate)

    def _validate_value(self, name: str, value: Any) -> None:
        # validate that we aren't using a nested StoreModel
        if isinstance(value, StoreModel):
            raise TypeError(
                f"{name} is a StoreModel and you may not embed a StoreModel "
                "inside another StoreModel (derive from BaseModel for fields in a StoreModel)."
            )

    def _ns_name(self, name: str) -> str:
        namespace = f"{self.instance}:" if self.instance is not None else ""
        return f"{self.__class__.__name__}:{namespace}{name}"

    def _un_ns_name(self, name: str) -> str:
        name = name.replace(f"{self.__class__.__name__}:", "", 1)
        if self.instance:
            name = name.replace(f"{self.instance}:", "", 1)
        return name

    def _get_and_coerce_field(self, field_name: str) -> Any:
        """Get a field value from the store, coerce it to the proper type, and update if needed.

        This method:
        1. Gets the raw value from the store
        2. Coerces it to the proper type if needed
        3. Updates both the store and __dict__ if coercion occurred
        4. Returns the coerced value
        """
        ns_name = self._ns_name(field_name)
        raw_value = self.store.get(ns_name)
        coerced_value = self._coerce_value(field_name, raw_value)

        # If we coerced the value (created a new object), update the store
        # so future reads are fast and mutations to mutable objects persist
        if coerced_value is not raw_value:
            self.store.set(ns_name, coerced_value)

        # Always update __dict__ to keep it in sync
        self.__dict__[field_name] = coerced_value

        return coerced_value

    def _coerce_value(self, field_name: str, value: Any) -> Any:
        """Coerce a raw value from the store to the proper field type.

        This handles nested Pydantic models, lists of models, dicts of models,
        TypedDicts, dataclasses, tuples, and other complex types.
        """
        if field_name not in self.__class__.model_fields or value is None:
            return value

        field_info = self.__class__.model_fields[field_name]  # pylint: disable=unsubscriptable-object
        field_type = field_info.annotation

        # Skip coercion for scalar types (they don't need it)
        if self._is_scalar(value):
            return value

        # For everything else, attempt coercion with TypeAdapter
        # This handles BaseModels, TypedDicts, dataclasses, tuples, lists, dicts, etc.
        # Since we cache the result in the Store, this only happens once per field
        try:
            adapter: TypeAdapter[Any] = TypeAdapter(field_type)
            return adapter.validate_python(value)
        except Exception:
            # If coercion fails, return the raw value
            return value

    def _is_scalar(self, value: Any) -> bool:
        """Check if a value is a scalar type that doesn't need coercion.

        Scalars include: str, int, float, bool, None, bytes
        Everything else (lists, dicts, tuples, objects) might need coercion.
        """
        return isinstance(value, str | int | float | bool | type(None) | bytes)

    model_config = ConfigDict(arbitrary_types_allowed=True)


SMT = TypeVar("SMT", bound=StoreModel)


def store_as(model_cls: Type[SMT], instance: str | None = None) -> SMT:
    """Get a Pydantic model interface to the store.

    Args:
      model_cls: Pydantic model type (must derive from StoreModel)
      instance: Optional instance name for store (enables multiple instances
        of a given StoreModel type within a single sample)


    Returns:
      StoreModel: model_cls bound to current Store.
    """
    return model_cls(store=store(), instance=instance)
```

## `util/_subprocess.py`

```python
import contextlib
import functools
import io
import os
import shlex
from collections import deque
from contextvars import ContextVar
from dataclasses import dataclass
from logging import getLogger
from pathlib import Path
from subprocess import DEVNULL, PIPE
from typing import Generic, Literal, TypeVar, Union, overload

import anyio
from anyio import ClosedResourceError, create_task_group, open_process
from anyio.abc import ByteReceiveStream, Process

from inspect_ai._util._async import tg_collect
from inspect_ai._util.trace import trace_action

from ._concurrency import concurrency as concurrency_manager

logger = getLogger(__name__)

T = TypeVar("T", str, bytes)


@dataclass
class ExecResult(Generic[T]):
    """Execution result from call to `subprocess()`."""

    success: bool
    """Did the process exit with success."""

    returncode: int
    """Return code from process exit."""

    stdout: T
    """Contents of stdout."""

    stderr: T
    """Contents of stderr."""


@overload
# type: ignore
async def subprocess(
    args: str | list[str],
    text: Literal[True] = True,
    input: str | bytes | memoryview | None = None,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
    capture_output: bool = True,
    output_limit: int | None = None,
    timeout: int | None = None,
    concurrency: bool = True,
) -> ExecResult[str]: ...


@overload
async def subprocess(
    args: str | list[str],
    text: Literal[False] = False,
    input: str | bytes | memoryview | None = None,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
    capture_output: bool = True,
    output_limit: int | None = None,
    timeout: int | None = None,
    concurrency: bool = True,
) -> ExecResult[bytes]: ...


async def subprocess(
    args: str | list[str],
    text: bool = True,
    input: str | bytes | memoryview | None = None,
    cwd: str | Path | None = None,
    env: dict[str, str] | None = None,
    capture_output: bool = True,
    output_limit: int | None = None,
    timeout: int | None = None,
    concurrency: bool = True,
) -> Union[ExecResult[str], ExecResult[bytes]]:
    """Execute and wait for a subprocess.

    Convenience method for solvers, scorers, and tools to launch
    subprocesses. Automatically enforces a limit on concurrent
    subprocesses (defaulting to os.cpu_count() but controllable
    via the `max_subprocesses` eval config option).

    Args:
       args (str | list[str]): Command and arguments to execute.
       text (bool): Return stdout and stderr as text (defaults to True)
       input (str | bytes | memoryview | None): Optional stdin
          for subprocess.
       cwd (str | Path | None): Switch to directory for execution.
       env (dict[str, str]): Additional environment variables.
       capture_output (bool): Capture stderr and stdout into ExecResult
          (if False, then output is redirected to parent stderr/stdout
          or to logging if INSPECT_SUBPROCESS_REDIRECT_TO_LOGGER is set)
       output_limit (int | None): Maximum bytes to retain from stdout/stderr.
          If output exceeds this limit, only the most recent bytes are kept
          (older output is discarded). The process continues to completion.
       timeout (int | None): Timeout. If the timeout expires then
          a `TimeoutError` will be raised.
       concurrency: Request that the `concurrency()` function is used
          to throttle concurrent subprocesses.

    Returns:
       Subprocess result (text or binary depending on `text` param)

    Raises:
       TimeoutError: If the specified `timeout` expires.
    """
    # resolve input
    input = (
        input.encode()
        if isinstance(input, str)
        else bytes(input)
        if input is not None
        else None
    )

    async def run_command() -> Union[ExecResult[str], ExecResult[bytes]]:
        redirect_output_to_logger = (
            not capture_output
            and os.environ.get("INSPECT_SUBPROCESS_REDIRECT_TO_LOGGER") is not None
        )
        process = await open_process(
            args,
            stdin=PIPE if input else DEVNULL,
            stdout=PIPE if (capture_output or redirect_output_to_logger) else None,
            stderr=PIPE if (capture_output or redirect_output_to_logger) else None,
            cwd=cwd,
            env={**os.environ, **(env or {})},
        )
        try:
            # write to stdin (convert input to bytes)
            if process.stdin and input:
                await process.stdin.send(input)
                await process.stdin.aclose()

            if redirect_output_to_logger:
                consume = _log_stream
            else:
                consume = functools.partial(_read_stream, output_limit=output_limit)

            stdout, stderr = await tg_collect(
                [
                    functools.partial(consume, process.stdout),
                    functools.partial(consume, process.stderr),
                ]
            )

            returncode = await process.wait()
            success = returncode == 0
            if text:
                return ExecResult[str](
                    success=success,
                    returncode=returncode,
                    stdout=stdout.decode(errors="replace") if capture_output else "",
                    stderr=stderr.decode(errors="replace") if capture_output else "",
                )
            else:
                return ExecResult[bytes](
                    success=success,
                    returncode=returncode,
                    stdout=stdout if capture_output else bytes(),
                    stderr=stderr if capture_output else bytes(),
                )
        # Handle cancellation before aclose() is called to avoid deadlock.
        except anyio.get_cancelled_exc_class():
            await gracefully_terminate_cancelled_subprocess(process)
            raise
        finally:
            try:
                await process.aclose()
            except ProcessLookupError:
                # the anyio ansycio backend calls process.kill() from within
                # its aclose() method without an enclosing exception handler
                # (which in turn can throw ProcessLookupError if the process
                # is already gone)
                pass

    # wrapper for run command that implements timeout
    async def run_command_timeout() -> Union[ExecResult[str], ExecResult[bytes]]:
        # wrap in timeout handler if requested
        if timeout is not None:
            with anyio.fail_after(timeout):
                # run_command() handles terminating the process if it is cancelled.
                return await run_command()
        else:
            return await run_command()

    # run command
    concurrency_ctx = (
        concurrency_manager("subprocesses", max_subprocesses_context_var.get())
        if concurrency
        else contextlib.nullcontext()
    )
    async with concurrency_ctx:
        message = args if isinstance(args, str) else shlex.join(args)
        with trace_action(logger, "Subprocess", message):
            return await run_command_timeout()


def init_max_subprocesses(max_subprocesses: int | None = None) -> None:
    max_subprocesses = (
        max_subprocesses if max_subprocesses else default_max_subprocesses()
    )
    max_subprocesses_context_var.set(max_subprocesses)


def default_max_subprocesses() -> int:
    cpus = os.cpu_count()
    return cpus if cpus else 1


async def gracefully_terminate_cancelled_subprocess(process: Process) -> None:
    with anyio.CancelScope(shield=True):
        try:
            # Terminate timed out process -- try for graceful termination then kill if
            # required.
            process.terminate()
            await anyio.sleep(2)
            if process.returncode is None:
                process.kill()
            # With anyio's asyncio backend, process.aclose() calls process.wait() which
            # can deadlock if the process generates so much output that it blocks
            # waiting for the OS pipe buffer to accept more data. See
            # https://docs.python.org/3/library/asyncio-subprocess.html#asyncio.subprocess.Process.wait
            # Therefore, we need to ensure that the process's stdout and stderr streams
            # are drained before we call process.wait() in aclose().
            async with create_task_group() as tg:
                tg.start_soon(drain_stream, process.stdout)
                tg.start_soon(drain_stream, process.stderr)
            # Wait for the process to exit. Will be called again by aclose().
            await process.wait()
        # The process may have already exited, in which case we can ignore the error.
        except ProcessLookupError:
            pass


async def drain_stream(stream: ByteReceiveStream | None) -> None:
    if stream is None:
        return
    try:
        async for _ in stream:
            pass
    except ClosedResourceError:
        pass


async def _read_stream(
    stream: ByteReceiveStream | None, *, output_limit: int | None = None
) -> bytes:
    if stream is None:
        return bytes()
    if output_limit is None:
        bytesio = io.BytesIO()
        async for chunk in stream:
            bytesio.write(chunk)
        return bytesio.getvalue()
    else:
        circular = CircularByteBuffer(output_limit)
        async for chunk in stream:
            circular.write(chunk)
        return circular.getvalue()


async def _log_stream(stream: ByteReceiveStream | None) -> bytes:
    if stream is None:
        return bytes()
    buffer = bytes()
    async for chunk in stream:
        parts = (buffer + chunk).split(b"\n")
        buffer = parts[-1]
        for line in parts[:-1]:
            logger.info(line.decode(errors="replace").rstrip())
    if buffer:
        logger.info(buffer.decode(errors="replace").rstrip())
    return bytes()


max_subprocesses_context_var = ContextVar[int](
    "max_subprocesses", default=default_max_subprocesses()
)


class CircularByteBuffer:
    """Memory-efficient circular buffer that keeps only the most recent bytes."""

    def __init__(self, max_bytes: int) -> None:
        if max_bytes <= 0:
            raise ValueError("max_bytes must be positive")
        self._max_bytes = max_bytes
        self._chunks: deque[bytes] = deque()
        self._total_bytes = 0

    def write(self, data: bytes) -> None:
        if not data:
            return
        self._chunks.append(data)
        self._total_bytes += len(data)

        # Discard oldest chunks until under limit
        while self._total_bytes > self._max_bytes and len(self._chunks) > 1:
            removed = self._chunks.popleft()
            self._total_bytes -= len(removed)

        # If single chunk still over limit, truncate from front
        if self._total_bytes > self._max_bytes and self._chunks:
            excess = self._total_bytes - self._max_bytes
            self._chunks[0] = self._chunks[0][excess:]
            self._total_bytes = self._max_bytes

    def getvalue(self) -> bytes:
        return b"".join(self._chunks)
```

## `util/_subtask.py`

```python
import inspect
from datetime import datetime, timezone
from functools import wraps
from logging import getLogger
from typing import (
    Any,
    Callable,
    Protocol,
    TypeVar,
    cast,
    overload,
    runtime_checkable,
)

from inspect_ai._util._async import is_callable_coroutine, tg_collect
from inspect_ai._util.content import Content
from inspect_ai._util.trace import trace_action
from inspect_ai._util.working import sample_waiting_time
from inspect_ai.util._span import span
from inspect_ai.util._store import Store, dict_jsonable, init_subtask_store

SubtaskResult = str | int | float | bool | list[Content]

RT = TypeVar("RT", SubtaskResult, Any)


logger = getLogger(__name__)


@runtime_checkable
class Subtask(Protocol):
    async def __call__(
        self,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        """Subtask with distinct `Store` and `Transcript`.

        Args:
            *args (Any): Arguments for the subtask.
            **kwargs (Any): Keyword arguments for the subtask.

        Returns:
            Result of subtask.
        """
        ...


@overload
def subtask(
    name: str,
    store: Store | None = None,
    type: str | None = None,
    input: dict[str, Any] | None = None,
) -> Callable[..., Subtask]: ...


@overload
def subtask(
    name: Subtask,
    store: Store | None = None,
    type: str | None = None,
    input: dict[str, Any] | None = None,
) -> Subtask: ...


def subtask(
    name: str | Subtask,
    store: Store | None = None,
    type: str | None = None,
    input: dict[str, Any] | None = None,
) -> Callable[..., Subtask] | Subtask:
    r"""Decorator for subtasks.

    Args:
        name: Name for subtask (defaults to function name)
        store: Store to use for subtask
        type: Type to use for subtask
        input: Input to log for subtask

    Returns:
        Function which runs the Subtask, providing an isolated
        `Store` and `Transcript`, and recording a `SubtaskEvent`
        when it is complete.
    """

    def create_subtask_wrapper(func: Subtask, name: str | None = None) -> Subtask:
        from inspect_ai.event._subtask import SubtaskEvent
        from inspect_ai.log._transcript import (
            transcript,
        )

        @wraps(func)
        async def run_subtask(*args: Any, **kwargs: Any) -> RT:
            # resolve name
            subtask_name = (
                name
                if name is not None
                else cast(str, getattr(func, "__name__", "subtask"))
            )

            # verify async
            if not is_callable_coroutine(func):
                raise TypeError(
                    f"'{subtask_name}' is not declared as an async callable."
                )

            # capture input for logging if required
            if input is not None:
                log_input = dict_jsonable(input)
            else:
                log_input = {}
                if len(args) > 0:
                    params = list(inspect.signature(func).parameters.keys())
                    for i, arg in enumerate(args):
                        log_input[params[i]] = arg
                log_input = dict_jsonable(log_input | kwargs)

            # create coroutine so we can provision a subtask contextvars
            async def run() -> RT:
                # initialise subtask (provisions store and transcript)
                init_subtask_store(store if store else Store())

                # run the subtask
                with trace_action(logger, "Subtask", subtask_name):
                    async with span(name=subtask_name, type="subtask"):
                        # create subtask event
                        waiting_time_start = sample_waiting_time()
                        event = SubtaskEvent(
                            name=subtask_name, input=log_input, type=type, pending=True
                        )
                        transcript()._event(event)

                        # run the subtask
                        result = await func(*args, **kwargs)

                        # time accounting
                        completed = datetime.now(timezone.utc)
                        waiting_time_end = sample_waiting_time()
                        event.completed = completed
                        event.working_time = (
                            completed - event.timestamp
                        ).total_seconds() - (waiting_time_end - waiting_time_start)

                        # update event
                        event.result = result
                        event.pending = None
                        transcript()._event_updated(event)

                        # return result
                        return result  # type: ignore[no-any-return]

            # create and run the task as a coroutine
            result = (await tg_collect([run]))[0]
            return result

        return run_subtask

    if isinstance(name, str):

        def wrapper(func: Subtask) -> Subtask:
            return create_subtask_wrapper(func, name)

        return wrapper
    else:
        return create_subtask_wrapper(name)
```

## `util/_throttle.py`

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

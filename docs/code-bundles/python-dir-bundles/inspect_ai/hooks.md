# Python Bundle: `hooks`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `4`

## Files

- `hooks/__init__.py`
- `hooks/_hooks.py`
- `hooks/_legacy.py`
- `hooks/_startup.py`

## `hooks/__init__.py`

```python
from inspect_ai.hooks._hooks import (
    ApiKeyOverride,
    EvalSetEnd,
    EvalSetStart,
    Hooks,
    ModelCacheUsageData,
    ModelUsageData,
    RunEnd,
    RunStart,
    SampleAttemptEnd,
    SampleAttemptStart,
    SampleEnd,
    SampleEvent,
    SampleInit,
    SampleScoring,
    SampleStart,
    TaskEnd,
    TaskStart,
    hooks,
)

__all__ = [
    "ApiKeyOverride",
    "ModelCacheUsageData",
    "Hooks",
    "ModelUsageData",
    "EvalSetStart",
    "EvalSetEnd",
    "RunEnd",
    "RunStart",
    "SampleAttemptEnd",
    "SampleAttemptStart",
    "SampleEnd",
    "SampleInit",
    "SampleScoring",
    "SampleStart",
    "SampleEvent",
    "TaskEnd",
    "TaskStart",
    "hooks",
]
```

## `hooks/_hooks.py`

```python
import math
from dataclasses import dataclass
from logging import getLogger
from typing import Awaitable, Callable, Type, TypeVar, cast

import anyio
from anyio.streams.memory import MemoryObjectReceiveStream

from inspect_ai._eval.eval import EvalLogs
from inspect_ai._eval.task.log import TaskLogger
from inspect_ai._eval.task.resolved import ResolvedTask
from inspect_ai._util.error import EvalError
from inspect_ai._util.registry import (
    RegistryInfo,
    registry_add,
    registry_find,
    registry_name,
)
from inspect_ai.event import Event
from inspect_ai.hooks._legacy import override_api_key_legacy
from inspect_ai.log._log import EvalLog, EvalSample, EvalSampleSummary, EvalSpec
from inspect_ai.log._samples import sample_active
from inspect_ai.model._model_output import ModelUsage
from inspect_ai.util._limit import LimitExceededError

logger = getLogger(__name__)


@dataclass(frozen=True)
class EvalSetStart:
    """Eval set start hook event data."""

    eval_set_id: str
    """The globally unique identifier for the eval set.  Note that the `eval_set_id` will be stable across multiple invocations of `eval_set()` for the same log directory
    """

    log_dir: str
    """The log directory for the eval set."""


@dataclass(frozen=True)
class EvalSetEnd:
    """Eval set end event data."""

    eval_set_id: str
    """The globally unique identifier for the eval set.  Note that the `eval_set_id` will be stable across multiple invocations of `eval_set()` for the same log directory
    """

    log_dir: str
    """The log directory for the eval set."""


@dataclass(frozen=True)
class RunStart:
    """Run start hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    task_names: list[str]
    """The names of the tasks which will be used in the run."""


@dataclass(frozen=True)
class RunEnd:
    """Run end hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    exception: BaseException | None
    """The exception that occurred during the run, if any. If None, the run completed
    successfully."""
    logs: EvalLogs
    """All eval logs generated during the run. Can be headers only if the run was an
    `eval_set()`."""


@dataclass(frozen=True)
class TaskStart:
    """Task start hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for this task execution."""
    spec: EvalSpec
    """Specification of the task."""


@dataclass(frozen=True)
class TaskEnd:
    """Task end hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for the task execution."""
    log: EvalLog
    """The log generated for the task. Can be header only if the run was an
    `eval_set()`"""


@dataclass(frozen=True)
class SampleInit:
    """Sample init hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for the task execution."""
    sample_id: str
    """The globally unique identifier for the sample execution."""
    summary: EvalSampleSummary
    """Summary of the sample to be initialized."""


@dataclass(frozen=True)
class SampleStart:
    """Sample start hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for the task execution."""
    sample_id: str
    """The globally unique identifier for the sample execution."""
    summary: EvalSampleSummary
    """Summary of the sample to be run."""


@dataclass(frozen=True)
class SampleEvent:
    """Sample event hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for the task execution."""
    sample_id: str
    """The globally unique identifier for the sample execution."""
    event: Event
    """Sample events."""


@dataclass(frozen=True)
class SampleEnd:
    """Sample end hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for the task execution."""
    sample_id: str
    """The globally unique identifier for the sample execution."""
    sample: EvalSample
    """The sample that has run."""


@dataclass(frozen=True)
class SampleAttemptStart:
    """Sample attempt start hook event data.

    Fired at the beginning of every attempt (including the first).
    Unlike on_sample_start which fires once per sample, this fires on retries too.
    """

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for the task execution."""
    sample_id: str
    """The globally unique identifier for the sample execution."""
    summary: EvalSampleSummary
    """Summary of the sample to be run."""
    attempt: int
    """1-based attempt number."""


@dataclass(frozen=True)
class SampleAttemptEnd:
    """Sample attempt end hook event data.

    Fired at the end of every attempt (including the last).
    Unlike on_sample_end which fires once per sample, this fires on retries too.
    """

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for the task execution."""
    sample_id: str
    """The globally unique identifier for the sample execution."""
    summary: EvalSampleSummary
    """Summary of the sample."""
    attempt: int
    """1-based attempt number."""
    error: EvalError | None
    """The error from this attempt, if any."""
    will_retry: bool
    """Whether the sample will be retried after this attempt."""


@dataclass(frozen=True)
class ModelUsageData:
    """Model usage hook event data."""

    model_name: str
    """The name of the model that was used."""
    usage: ModelUsage
    """The model usage metrics."""
    call_duration: float
    """The duration of the model call in seconds. If HTTP retries were made, this is the
    time taken for the successful call. This excludes retry waiting (e.g. exponential
    backoff) time."""
    eval_set_id: str | None = None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str | None = None
    """The globally unique identifier for the run (if any)."""
    eval_id: str | None = None
    """The globally unique identifier for the task execution (if any)."""
    task_name: str | None = None
    """The name of the task that generated this usage (if any)."""
    retries: int = 0
    """The number of HTTP retries made before the successful call."""


@dataclass(frozen=True)
class ModelCacheUsageData:
    """Model cache usage hook event data.

    Like ModelUsageData, but without the call_duration field, since no external call is made when the cache is hit.
    """

    model_name: str
    """The name of the model that was used."""
    usage: ModelUsage
    """The model usage metrics."""


@dataclass(frozen=True)
class SampleScoring:
    """Sample scoring hook event data."""

    eval_set_id: str | None
    """The globally unique identifier for the eval set (if any)."""
    run_id: str
    """The globally unique identifier for the run."""
    eval_id: str
    """The globally unique identifier for the task execution."""
    sample_id: str
    """The globally unique identifier for the sample execution."""


@dataclass(frozen=True)
class ApiKeyOverride:
    """Api key override hook event data."""

    env_var_name: str
    """The name of the environment var containing the API key (e.g. OPENAI_API_KEY)."""
    value: str
    """The original value of the environment variable."""


class Hooks:
    """Base class for hooks.

    Note that whenever hooks are called, they are wrapped in a try/except block to
    catch any exceptions that may occur. This is to ensure that a hook failure does not
    affect the overall execution of the eval. If a hook fails, a warning will be logged.
    """

    def enabled(self) -> bool:
        """Check if the hook should be enabled.

        Default implementation returns True.

        Hooks may wish to override this to e.g. check the presence of an environment
        variable or a configuration setting.

        Will be called frequently, so consider caching the result if the computation is
        expensive.
        """
        return True

    async def on_eval_set_start(self, data: EvalSetStart) -> None:
        """On eval set start.

        A "eval set" is an invocation of `eval_set()` for a log directory. Note
        that the `eval_set_id` will be stable across multiple invocations of
        `eval_set()` for the same log directory.

        Args:
           data: Eval set start data.
        """
        pass

    async def on_eval_set_end(self, data: EvalSetEnd) -> None:
        """On eval set end.

        Args:
           data: Eval set end data.
        """
        pass

    async def on_run_start(self, data: RunStart) -> None:
        """On run start.

        A "run" is a single invocation of `eval()` or `eval_retry()` which may contain
        many Tasks, each with many Samples and many epochs. Note that `eval_retry()`
        can be invoked multiple times within an `eval_set()`.

        Args:
           data: Run start data.
        """
        pass

    async def on_run_end(self, data: RunEnd) -> None:
        """On run end.

        Args:
           data: Run end data.
        """
        pass

    async def on_task_start(self, data: TaskStart) -> None:
        """On task start.

        Args:
           data: Task start data.
        """
        pass

    async def on_task_end(self, data: TaskEnd) -> None:
        """On task end.

        Args:
           data: Task end data.
        """
        pass

    async def on_sample_init(self, data: SampleInit) -> None:
        """On sample init.

        Called when a sample has been scheduled and is about to begin
        initialization, before sandbox environments are created. This hook can
        be used to gate sandbox resource provisioning.

        If the sample errors and retries, this will not be called again.

        If a sample is run for multiple epochs, this will be called once per epoch.

        Args:
           data: Sample init data.
        """
        pass

    async def on_sample_start(self, data: SampleStart) -> None:
        """On sample start.

        Called when a sample is about to be start. If the sample errors and retries,
        this will not be called again.

        If a sample is run for multiple epochs, this will be called once per epoch.

        Args:
           data: Sample start data.
        """
        pass

    async def on_sample_event(self, data: SampleEvent) -> None:
        """On sample event.

        Called when a sample event is emmitted. Pending events are not
        logged here (i.e. ToolEvent and ModelEvent are not logged until
        they are complete).

        Args:
           data: Sample event.
        """
        pass

    async def on_sample_end(self, data: SampleEnd) -> None:
        """On sample end.

        Called when a sample has either completed successfully, or when a sample has
        errored and has no retries remaining.

        If a sample is run for multiple epochs, this will be called once per epoch.

        Args:
           data: Sample end data.
        """
        pass

    async def on_sample_attempt_start(self, data: SampleAttemptStart) -> None:
        """On sample attempt start.

        Fired at the beginning of every attempt (including the first).
        Unlike on_sample_start which fires once per sample, this fires on retries too.

        Args:
           data: Sample attempt start data.
        """
        pass

    async def on_sample_attempt_end(self, data: SampleAttemptEnd) -> None:
        """On sample attempt end.

        Fired at the end of every attempt (including the last).
        Unlike on_sample_end which fires once per sample, this fires on retries too.

        Args:
           data: Sample attempt end data.
        """
        pass

    async def on_model_usage(self, data: ModelUsageData) -> None:
        """Called when a call to a model's generate() method completes successfully without hitting Inspect's local cache.

        Note that this is not called when Inspect's local cache is used and is a cache
        hit (i.e. if no external API call was made). Provider-side caching will result
        in this being called.

        Args:
           data: Model usage data.
        """
        pass

    async def on_model_cache_usage(self, data: ModelCacheUsageData) -> None:
        """Called when a call to a model's generate() method completes successfully by hitting Inspect's local cache.

        Args:
           data: Cached model usage data.
        """
        pass

    async def on_sample_scoring(self, data: SampleScoring) -> None:
        """Called before the sample is scored.

        Can be used by hooks to demarcate the end of solver execution and the start of scoring.

        Args:
           data: Sample scoring data.
        """
        pass

    def override_api_key(self, data: ApiKeyOverride) -> str | None:
        """Optionally override an API key.

        When overridden, this method may return a new API key value which will be used
        in place of the original one during the eval.

        Args:
            data: Api key override data.

        Returns:
            str | None: The new API key value to use, or None to use the original value.
        """
        return None


T = TypeVar("T", bound=Hooks)


def hooks(name: str, description: str) -> Callable[..., Type[T]]:
    """Decorator for registering a hook subscriber.

    Either decorate a subclass of `Hooks`, or a function which returns the type
    of a subclass of `Hooks`. This decorator will instantiate the hook class
    and store it in the registry.

    Args:
        name (str): Name of the subscriber (e.g. "audit logging").
        description (str): Short description of the hook (e.g. "Copies eval files to
            S3 bucket for auditing.").
    """

    def wrapper(hook_type: Type[T] | Callable[..., Type[T]]) -> Type[T]:
        # Resolve the hook type if it's a function.
        if not isinstance(hook_type, type):
            hook_type = hook_type()
        if not issubclass(hook_type, Hooks):
            raise TypeError(f"Hook must be a subclass of Hooks, got {hook_type}")

        # Instantiate an instance of the Hooks class.
        hook_instance = hook_type()
        hook_name = registry_name(hook_instance, name)
        registry_add(
            hook_instance,
            RegistryInfo(
                type="hooks", name=hook_name, metadata={"description": description}
            ),
        )
        return hook_type

    return wrapper


async def emit_eval_set_start(eval_set_id: str, log_dir: str) -> None:
    data = EvalSetStart(eval_set_id=eval_set_id, log_dir=log_dir)
    await _emit_to_all(lambda hook: hook.on_eval_set_start(data))


async def emit_eval_set_end(eval_set_id: str, log_dir: str) -> None:
    data = EvalSetEnd(eval_set_id=eval_set_id, log_dir=log_dir)
    await _emit_to_all(lambda hook: hook.on_eval_set_end(data))


async def emit_run_start(
    eval_set_id: str | None, run_id: str, tasks: list[ResolvedTask]
) -> None:
    data = RunStart(
        eval_set_id=eval_set_id,
        run_id=run_id,
        task_names=[task.task.name for task in tasks],
    )
    await _emit_to_all(lambda hook: hook.on_run_start(data))


async def emit_run_end(
    eval_set_id: str | None,
    run_id: str,
    logs: EvalLogs,
    exception: BaseException | None = None,
) -> None:
    data = RunEnd(
        eval_set_id=eval_set_id, run_id=run_id, logs=logs, exception=exception
    )
    await _emit_to_all(lambda hook: hook.on_run_end(data))


async def emit_task_start(logger: TaskLogger) -> None:
    data = TaskStart(
        eval_set_id=logger.eval.eval_set_id,
        run_id=logger.eval.run_id,
        eval_id=logger.eval.eval_id,
        spec=logger.eval,
    )
    await _emit_to_all(lambda hook: hook.on_task_start(data))


async def emit_task_end(logger: TaskLogger, log: EvalLog) -> None:
    data = TaskEnd(
        eval_set_id=logger.eval.eval_set_id,
        run_id=logger.eval.run_id,
        eval_id=logger.eval.eval_id,
        log=log,
    )
    await _emit_to_all(lambda hook: hook.on_task_end(data))


async def emit_sample_init(
    eval_set_id: str | None,
    run_id: str,
    eval_id: str,
    sample_id: str,
    summary: EvalSampleSummary,
) -> None:
    data = SampleInit(
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
        sample_id=sample_id,
        summary=summary,
    )
    await _emit_to_all(lambda hook: hook.on_sample_init(data))


async def emit_sample_start(
    eval_set_id: str | None,
    run_id: str,
    eval_id: str,
    sample_id: str,
    summary: EvalSampleSummary,
) -> None:
    data = SampleStart(
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
        sample_id=sample_id,
        summary=summary,
    )
    await _emit_to_all(lambda hook: hook.on_sample_start(data))


def emit_sample_event(
    eval_set_id: str | None,
    run_id: str,
    eval_id: str,
    sample_id: str,
    event: Event,
) -> None:
    active = sample_active()
    if active is None or active.event_send is None:
        return
    if event.pending:
        return
    data = SampleEvent(
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
        sample_id=sample_id,
        event=event,
    )
    try:
        active.event_send.send_nowait(data)
    except (anyio.ClosedResourceError, anyio.BrokenResourceError):
        pass


def start_sample_event_emitter() -> None:
    """Start the background coroutine that emits sample events to hooks.

    Must be called after active.start(tg) so that the task group is available.
    """
    active = sample_active()
    if active is None or active.tg is None:
        return

    send_stream, receive_stream = anyio.create_memory_object_stream[SampleEvent](
        math.inf
    )
    active.event_send = send_stream
    active.event_receive = receive_stream
    active.event_done = anyio.Event()

    async def _emit_loop(
        receive: MemoryObjectReceiveStream[SampleEvent],
        done: anyio.Event,
    ) -> None:
        try:
            async for data in receive:
                try:

                    async def _call_hook(hook: Hooks, d: SampleEvent = data) -> None:
                        await hook.on_sample_event(d)

                    await _emit_to_all(_call_hook)
                except Exception as ex:
                    logger.warning(f"Exception in sample event emitter: {ex}")
        finally:
            done.set()

    active.tg.start_soon(_emit_loop, receive_stream, active.event_done)


async def drain_sample_events() -> None:
    """Drain all queued sample events and wait for the emitter to finish.

    Must be called before emit_sample_end() to ensure all queued events are
    delivered before the sample end hook fires.
    """
    active = sample_active()
    if active is None:
        return

    try:
        # Close the send stream to signal no more events
        if active.event_send is not None:
            await active.event_send.aclose()

        # Wait for the background emitter to finish processing
        if active.event_done is not None:
            with anyio.move_on_after(5):
                await active.event_done.wait()
            if not active.event_done.is_set():
                logger.warning("Timed out waiting for sample event emitter to drain")

        # Process any remaining events the background emitter didn't get to
        # (e.g. scoring events queued after the solver task group was cancelled)
        if active.event_receive is not None:
            try:
                while True:
                    data = active.event_receive.receive_nowait()

                    async def _emit_event(hook: Hooks, d: SampleEvent = data) -> None:
                        await hook.on_sample_event(d)

                    await _emit_to_all(_emit_event)
            except (anyio.WouldBlock, anyio.EndOfStream, anyio.ClosedResourceError):
                pass
    except Exception as ex:
        logger.warning(f"Exception draining sample events: {ex}")
    finally:
        # Clean up regardless of success/failure
        active.event_send = None
        active.event_receive = None
        active.event_done = None


async def emit_sample_end(
    eval_set_id: str | None,
    run_id: str,
    eval_id: str,
    sample_id: str,
    sample: EvalSample,
) -> None:
    data = SampleEnd(
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
        sample_id=sample_id,
        sample=sample,
    )
    await _emit_to_all(lambda hook: hook.on_sample_end(data))


async def emit_sample_attempt_start(
    eval_set_id: str | None,
    run_id: str,
    eval_id: str,
    sample_id: str,
    summary: EvalSampleSummary,
    attempt: int,
) -> None:
    data = SampleAttemptStart(
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
        sample_id=sample_id,
        summary=summary,
        attempt=attempt,
    )
    await _emit_to_all(lambda hook: hook.on_sample_attempt_start(data))


async def emit_sample_attempt_end(
    eval_set_id: str | None,
    run_id: str,
    eval_id: str,
    sample_id: str,
    summary: EvalSampleSummary,
    attempt: int,
    error: EvalError | None,
    will_retry: bool,
) -> None:
    data = SampleAttemptEnd(
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
        sample_id=sample_id,
        summary=summary,
        attempt=attempt,
        error=error,
        will_retry=will_retry,
    )
    await _emit_to_all(lambda hook: hook.on_sample_attempt_end(data))


async def emit_model_usage(
    model_name: str, usage: ModelUsage, call_duration: float
) -> None:
    from inspect_ai.log._samples import sample_active

    # Read eval context from the active sample contextvar (if available).
    active = sample_active()
    eval_set_id: str | None = None
    run_id: str | None = None
    eval_id: str | None = None
    task_name: str | None = None
    retries: int = 0
    if active is not None:
        eval_set_id = active.eval_set_id
        run_id = active.run_id
        eval_id = active.eval_id
        task_name = active.task

    # Read retry count from the active model event (if available).
    from inspect_ai.log._samples import _active_model_event

    model_event = _active_model_event.get()
    if model_event is not None and model_event.retries is not None:
        retries = model_event.retries

    data = ModelUsageData(
        model_name=model_name,
        usage=usage,
        call_duration=call_duration,
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
        task_name=task_name,
        retries=retries,
    )
    await _emit_to_all(lambda hook: hook.on_model_usage(data))


async def emit_model_cache_usage(model_name: str, usage: ModelUsage) -> None:
    data = ModelCacheUsageData(model_name=model_name, usage=usage)
    await _emit_to_all(lambda hook: hook.on_model_cache_usage(data))


async def emit_sample_scoring(
    eval_set_id: str | None, run_id: str, eval_id: str, sample_id: str
) -> None:
    data = SampleScoring(
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
        sample_id=sample_id,
    )

    await _emit_to_all(lambda hook: hook.on_sample_scoring(data))


def has_api_key_override() -> bool:
    """Check if any hooks have implemented `override_api_key()`."""
    for hook in get_all_hooks():
        for cls in type(hook).mro():
            if "override_api_key" in cls.__dict__:
                if cls is not Hooks:
                    return True
                break
    return False


def override_api_key(env_var_name: str, value: str) -> str | None:
    data = ApiKeyOverride(env_var_name=env_var_name, value=value)
    for hook in get_all_hooks():
        if not hook.enabled():
            continue
        try:
            overridden = hook.override_api_key(data)
            if overridden is not None:
                return overridden
        except Exception as ex:
            logger.warning(
                f"Exception calling override_api_key on hook '{hook.__class__.__name__}': {ex}"
            )
    # If none have been overridden, fall back to legacy behaviour.
    return override_api_key_legacy(env_var_name, value)


def get_all_hooks() -> list[Hooks]:
    """Get all registered hooks."""
    results = registry_find(lambda info: info.type == "hooks")
    return cast(list[Hooks], results)


async def _emit_to_all(callable: Callable[[Hooks], Awaitable[None]]) -> None:
    for hook in get_all_hooks():
        if not hook.enabled():
            continue
        try:
            await callable(hook)
        # We propagate LimitExceededError so that limits can be enforced via hooks.
        except LimitExceededError:
            raise
        except Exception as ex:
            logger.warning(f"Exception calling hook '{hook.__class__.__name__}': {ex}")
```

## `hooks/_legacy.py`

```python
"""Legacy hooks for telemetry and API key overrides.

These are deprecated and will be removed in a future release. Please use the new hooks
defined in `inspect_ai.hooks` instead.
"""

import importlib
import os
from typing import Any, Awaitable, Callable, Literal, cast

from inspect_ai._util.error import PrerequisiteError

# Hooks are functions inside packages that are installed with an
# environment variable (e.g. INSPECT_TELEMETRY='mypackage.send_telemetry')
# If one or more hooks are enabled a message will be printed at startup
# indicating this, as well as which package/function implements each hook


# Telemetry (INSPECT_TELEMETRY)
#
# Telemetry can be optionally enabled by setting an INSPECT_TELEMETRY
# environment variable that points to a function in a package which
# conforms to the TelemetrySend signature below. A return value of True
# indicates that the telemetry event was handled.

# There are currently three types of telemetry sent:
#    - model_usage       (JSON string of the model usage)
#    - eval_log_location (file path or URL string of the eval log)
#    - eval_log          (JSON string of the eval log)
#                        [only sent if eval_log_location unhandled]
# The eval_log_location type is preferred over eval_log as it means we can take
# advantage of the .eval format and avoid loading the whole log into memory.

TelemetrySend = Callable[[str, str], Awaitable[bool]]


async def send_telemetry_legacy(
    type: Literal["model_usage", "eval_log", "eval_log_location"], json: str
) -> Literal["handled", "not_handled", "no_subscribers"]:
    global _send_telemetry
    if _send_telemetry:
        if await _send_telemetry(type, json):
            return "handled"
        return "not_handled"
    return "no_subscribers"


_send_telemetry: TelemetrySend | None = None

# API Key Override (INSPECT_API_KEY_OVERRIDE)
#
# API Key overrides can be optionally enabled by setting an
# INSPECT_API_KEY_OVERRIDE environment variable which conforms to the
# ApiKeyOverride signature below.
#
# The api key override function will be called with the name and value
# of provider specified environment variables that contain api keys,
# and it can optionally return an override value.

ApiKeyOverride = Callable[[str, str], str | None]


def override_api_key_legacy(var: str, value: str) -> str | None:
    global _override_api_key
    if _override_api_key:
        return _override_api_key(var, value)
    else:
        return None


_override_api_key: ApiKeyOverride | None = None


def init_legacy_hooks() -> list[str]:
    messages: list[str] = []
    # telemetry
    global _send_telemetry
    if not _send_telemetry:
        result = init_legacy_hook(
            "telemetry",
            "INSPECT_TELEMETRY",
            "(eval logs and token usage will be recorded by the provider)",
        )
        if result:
            _send_telemetry, message = result
            messages.append(message)

    # api key override
    global _override_api_key
    if not _override_api_key:
        result = init_legacy_hook(
            "api key override",
            "INSPECT_API_KEY_OVERRIDE",
            "(api keys will be read and modified by the provider)",
        )
        if result:
            _override_api_key, message = result
            messages.append(message)

    return messages


def init_legacy_hook(
    name: str, env: str, message: str
) -> tuple[Callable[..., Any], str] | None:
    hook = os.environ.get(env, "")
    if hook:
        # parse module/function
        module_name, function_name = hook.strip().rsplit(".", 1)
        # load (fail gracefully w/ clear error)
        try:
            module = importlib.import_module(module_name)
            return (
                cast(Callable[..., Any], getattr(module, function_name)),
                f"[bold]{name} enabled: {hook}[/bold]\n  {message}",
            )
        except (AttributeError, ModuleNotFoundError):
            raise PrerequisiteError(
                f"{env} provider not found: {hook}\n"
                + "Please correct (or undefine) this environment variable before proceeding."
            )
    else:
        return None
```

## `hooks/_startup.py`

```python
import importlib
import os

from rich import print

from inspect_ai._util.constants import PKG_NAME
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.registry import registry_info
from inspect_ai.hooks._hooks import Hooks
from inspect_ai.hooks._legacy import init_legacy_hooks

_registry_hooks_loaded: bool = False


def init_hooks() -> None:
    # messages we'll print for hooks if we have them
    messages = init_legacy_hooks()

    registry_hooks = _load_registry_hooks()
    if registry_hooks:
        enabled_hooks = [h for h in registry_hooks if h.enabled()]
        hook_names = [f"  {_format_hook_for_printing(hook)}" for hook in enabled_hooks]
        hook_names_joined = "\n".join(hook_names)
        messages.append(
            f"[bold]hooks enabled: {len(hook_names)}[/bold]\n{hook_names_joined}"
        )

    # if any hooks are enabled, let the user know
    if len(messages) > 0:
        version = importlib.metadata.version(PKG_NAME)
        all_messages = "\n".join([f"- {message}" for message in messages])
        print(
            f"[blue][bold]inspect_ai v{version}[/bold][/blue]\n"
            f"[bright_black]{all_messages}[/bright_black]\n"
        )


def _load_registry_hooks() -> list[Hooks]:
    global _registry_hooks_loaded
    if _registry_hooks_loaded:
        return []

    from inspect_ai.hooks._hooks import get_all_hooks

    # Note that hooks loaded by virtue of load_file_tasks() -> load_module() (e.g.
    # if the user defines an @hook alongside their task) won't be loaded by now.
    hooks = get_all_hooks()
    _registry_hooks_loaded = True
    _verify_all_required_hooks(hooks)
    return hooks


def _verify_all_required_hooks(installed: list[Hooks]) -> None:
    """Verify that all required hooks are installed.

    Required hooks are configured via the `INSPECT_REQUIRED_HOOKS` environment variable.
    If any required hooks are missing, a `PrerequisiteError` is raised.

    Set the `INSPECT_REQUIRED_HOOKS` environment variable to a comma-separated list of
    required hook names e.g. `INSPECT_REQUIRED_HOOKS=package/hooks_1,package/hooks_2`.
    """
    required_hooks_env_var = os.environ.get("INSPECT_REQUIRED_HOOKS", "")
    # Create a set of required hook names, remove the empty string element if it exists.
    required_names = set(required_hooks_env_var.split(",")) - {""}
    if not required_names:
        return
    installed_names = {registry_info(hook).name for hook in installed}
    missing_names = required_names - installed_names
    if missing_names:
        raise PrerequisiteError(
            f"Required hook(s) missing: {missing_names}.\n"
            f"INSPECT_REQUIRED_HOOKS is set to '{required_hooks_env_var}'.\n"
            f"Installed hooks: {installed_names}.\n"
            "Please ensure required hooks are installed in your virtual environment."
        )


def _format_hook_for_printing(hook: Hooks) -> str:
    info = registry_info(hook)
    description = info.metadata["description"]
    return f"[bold]{info.name}[/bold]: {description}"
```

# Python Bundle: `_eval`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `25`

## Files

- `_eval/__init__.py`
- `_eval/context.py`
- `_eval/eval.py`
- `_eval/evalset.py`
- `_eval/list.py`
- `_eval/loader.py`
- `_eval/registry.py`
- `_eval/run.py`
- `_eval/score.py`
- `_eval/task/__init__.py`
- `_eval/task/constants.py`
- `_eval/task/epochs.py`
- `_eval/task/error.py`
- `_eval/task/generate.py`
- `_eval/task/hf.py`
- `_eval/task/images.py`
- `_eval/task/log.py`
- `_eval/task/resolved.py`
- `_eval/task/results.py`
- `_eval/task/run.py`
- `_eval/task/sandbox.py`
- `_eval/task/store.py`
- `_eval/task/task.py`
- `_eval/task/tasks.py`
- `_eval/task/util.py`

## `_eval/__init__.py`

```python

```

## `_eval/context.py`

```python
from anyio.abc import TaskGroup

from inspect_ai._util.background import set_background_task_group
from inspect_ai._util.dotenv import init_dotenv
from inspect_ai._util.logger import init_logger
from inspect_ai.approval._apply import have_tool_approval, init_tool_approval
from inspect_ai.approval._human.manager import init_human_approval_manager
from inspect_ai.approval._policy import ApprovalPolicy
from inspect_ai.log._refusal import init_refusal_tracking
from inspect_ai.log._samples import init_active_samples
from inspect_ai.model import GenerateConfig, Model
from inspect_ai.model._model import (
    init_active_model,
    init_model_roles,
    init_model_usage,
    init_role_usage,
)
from inspect_ai.util._concurrency import init_concurrency
from inspect_ai.util._subprocess import init_max_subprocesses


def init_runtime_context(
    max_subprocesses: int | None = None,
) -> None:
    init_dotenv()
    init_concurrency()
    init_max_subprocesses(max_subprocesses)


def init_eval_context(
    log_level: str | None,
    log_level_transcript: str | None,
    log_refusals: bool | None,
    max_subprocesses: int | None = None,
    task_group: TaskGroup | None = None,
) -> None:
    init_runtime_context(max_subprocesses)
    init_logger(log_level, log_level_transcript)
    init_refusal_tracking(log_refusals)
    init_active_samples()
    init_human_approval_manager()
    set_background_task_group(task_group)


def init_model_context(
    model: Model,
    model_roles: dict[str, Model] | None = None,
    config: GenerateConfig = GenerateConfig(),
) -> None:
    init_active_model(model, config)
    init_model_roles(model_roles or {})
    init_model_usage()
    init_role_usage()


def init_task_context(
    model: Model,
    model_roles: dict[str, Model] | None = None,
    config: GenerateConfig = GenerateConfig(),
    approval: list[ApprovalPolicy] | None = None,
) -> None:
    init_model_context(model, model_roles, config)
    if not have_tool_approval():
        init_tool_approval(approval)
```

## `_eval/eval.py`

```python
import copy
import logging
import os
import sys
from contextlib import nullcontext
from pathlib import Path
from typing import Any, Literal, cast

import anyio
from anyio.abc import TaskGroup

from inspect_ai._util.notgiven import NOT_GIVEN, NotGiven
from inspect_ai.agent._agent import Agent, is_agent
from inspect_ai.agent._as_solver import as_solver
from inspect_ai.model._model_config import model_roles_config_to_model_roles
from inspect_ai.model._model_data.model_data import ModelCost
from inspect_ai.model._model_info import set_model_cost
from inspect_ai.model._util import resolve_model_costs, resolve_model_roles
from inspect_ai.util._anyio import inner_exception

if sys.version_info < (3, 11):
    from exceptiongroup import ExceptionGroup

from shortuuid import uuid
from typing_extensions import Unpack

from inspect_ai._cli.util import parse_cli_args
from inspect_ai._display.core.active import active_display as active_task_display
from inspect_ai._display.core.active import display as task_display
from inspect_ai._util.asyncfiles import with_async_fs
from inspect_ai._util.config import resolve_args
from inspect_ai._util.constants import (
    DEFAULT_LOG_FORMAT,
    DEFAULT_LOG_SHARED,
    JSON_LOG_FORMAT,
)
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.file import absolute_file_path
from inspect_ai._util.logger import warn_once
from inspect_ai._util.platform import platform_init
from inspect_ai._util.registry import registry_lookup, registry_package_name
from inspect_ai.approval._apply import init_tool_approval
from inspect_ai.approval._policy import (
    ApprovalPolicy,
    ApprovalPolicyConfig,
    approval_policies_from_config,
    config_from_approval_policies,
)
from inspect_ai.log import EvalConfig, EvalLog, EvalLogInfo
from inspect_ai.log._file import read_eval_log_async
from inspect_ai.log._recorders import create_recorder_for_format
from inspect_ai.log._recorders.buffer import cleanup_sample_buffers
from inspect_ai.model import (
    GenerateConfig,
    GenerateConfigArgs,
    Model,
)
from inspect_ai.model._model import (
    get_model,
    init_active_model,
    init_model_roles,
    init_model_usage,
    init_role_usage,
    resolve_models,
)
from inspect_ai.scorer._reducer import reducer_log_names
from inspect_ai.solver._chain import chain
from inspect_ai.solver._solver import Solver, SolverSpec
from inspect_ai.util import SandboxEnvironmentType
from inspect_ai.util._display import (
    DisplayType,
    display_type,
    display_type_initialized,
    init_display_type,
)

from .context import init_eval_context
from .loader import resolve_tasks
from .run import eval_run
from .task import Epochs, PreviousTask
from .task.resolved import ResolvedTask, resolved_model_names
from .task.tasks import Tasks

log = logging.getLogger(__name__)


def eval(
    tasks: Tasks,
    model: str | Model | list[str] | list[Model] | None | NotGiven = NOT_GIVEN,
    model_base_url: str | None = None,
    model_args: dict[str, Any] | str = dict(),
    model_roles: dict[str, str | Model] | None = None,
    task_args: dict[str, Any] | str = dict(),
    sandbox: SandboxEnvironmentType | None = None,
    sandbox_cleanup: bool | None = None,
    solver: Solver | SolverSpec | Agent | list[Solver] | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    trace: bool | None = None,
    display: DisplayType | None = None,
    approval: str | list[ApprovalPolicy] | ApprovalPolicyConfig | None = None,
    log_level: str | None = None,
    log_level_transcript: str | None = None,
    log_dir: str | None = None,
    log_format: Literal["eval", "json"] | None = None,
    limit: int | tuple[int, int] | None = None,
    sample_id: str | int | list[str] | list[int] | list[str | int] | None = None,
    sample_shuffle: bool | int | None = None,
    epochs: int | Epochs | None = None,
    fail_on_error: bool | float | None = None,
    continue_on_fail: bool | None = None,
    retry_on_error: int | None = None,
    debug_errors: bool | None = None,
    message_limit: int | None = None,
    token_limit: int | None = None,
    time_limit: int | None = None,
    working_limit: int | None = None,
    cost_limit: float | None = None,
    model_cost_config: str | dict[str, ModelCost] | None = None,
    max_samples: int | None = None,
    max_dataset_memory: int | None = None,
    max_tasks: int | None = None,
    max_subprocesses: int | None = None,
    max_sandboxes: int | None = None,
    log_samples: bool | None = None,
    log_realtime: bool | None = None,
    log_images: bool | None = None,
    log_model_api: bool | None = None,
    log_refusals: bool | None = None,
    log_buffer: int | None = None,
    log_shared: bool | int | None = None,
    log_header_only: bool | None = None,
    run_samples: bool = True,
    score: bool = True,
    score_display: bool | None = None,
    eval_set_id: str | None = None,
    **kwargs: Unpack[GenerateConfigArgs],
) -> list[EvalLog]:
    r"""Evaluate tasks using a Model.

    Args:
        tasks: Task(s) to evaluate. If None, attempt
            to evaluate a task in the current working directory
        model: Model(s) for evaluation. If not specified use the value of the INSPECT_EVAL_MODEL
            environment variable. Specify `None` to define no default model(s), which will
            leave model usage entirely up to tasks.
        model_base_url: Base URL for communicating
            with the model API.
        model_args: Model creation args
            (as a dictionary or as a path to a JSON or YAML config file)
        model_roles: Named roles for use in `get_model()`.
        task_args: Task creation arguments
            (as a dictionary or as a path to a JSON or YAML config file)
        sandbox: Sandbox environment type
            (or optionally a str or tuple with a shorthand spec)
        sandbox_cleanup: Cleanup sandbox environments after task completes
            (defaults to True)
        solver: Alternative solver for task(s).
            Optional (uses task solver by default).
        tags: Tags to associate with this evaluation run.
        metadata: Metadata to associate with this evaluation run.
        trace: Trace message interactions with evaluated model to terminal.
        display: Task display type (defaults to 'full').
        approval: Tool use approval policies.
            Either a path to an approval policy config file, an ApprovalPolicyConfig, or a list of approval policies.
            Defaults to no approval policy.
        log_level: Level for logging to the console: "debug", "http", "sandbox",
            "info", "warning", "error", "critical", or "notset" (defaults to "warning")
        log_level_transcript: Level for logging to the log file (defaults to "info")
        log_dir: Output path for logging results
            (defaults to file log in ./logs directory).
        log_format: Format for writing log files (defaults
            to "eval", the native high-performance format).
        limit: Limit evaluated samples
            (defaults to all samples).
        sample_id: Evaluate specific sample(s) from the dataset. Use plain ids or preface with task names as required to disambiguate ids across tasks (e.g. `popularity:10`)..
        sample_shuffle: Shuffle order of samples (pass a seed to make the order deterministic).
        epochs: Epochs to repeat samples for and optional score
            reducer function(s) used to combine sample scores (defaults to "mean")
        fail_on_error: `True` to fail on first sample error
            (default); `False` to never fail on sample errors; Value between 0 and 1
            to fail if a proportion of total samples fails. Value greater than 1 to fail
            eval if a count of samples fails.
        continue_on_fail: `True` to continue running and only fail at the end if the `fail_on_error` condition is met.
            `False` to fail eval immediately when the `fail_on_error` condition is met (default).
        retry_on_error: Number of times to retry samples if they encounter errors
            (by default, no retries occur).
        debug_errors: Raise task errors (rather than logging them)
            so they can be debugged (defaults to False).
        message_limit: Limit on total messages used for each sample.
        token_limit: Limit on total tokens used for each sample.
        time_limit: Limit on clock time (in seconds) for samples.
        working_limit: Limit on working time (in seconds) for sample. Working
            time includes model generation, tool calls, etc. but does not include
            time spent waiting on retries or shared resources.
        cost_limit: Limit on total cost (in dollars) for each sample.
            Requires model cost data via set_model_cost() or --model-cost-config.
        model_cost_config: YAML or JSON file with model prices for cost tracking
            or dict of model -> `ModelCost`
        max_samples: Maximum number of samples to run in parallel
            (default is max_connections)
        max_dataset_memory: Maximum MB of dataset sample data to hold in
            memory per task. When exceeded, samples are paged to a temporary
            file on disk (defaults to None, which keeps all samples in memory).
        max_tasks: Maximum number of tasks to run in parallel
            (defaults to number of models being evaluated)
        max_subprocesses: Maximum number of subprocesses to
            run in parallel (default is os.cpu_count())
        max_sandboxes: Maximum number of sandboxes (per-provider)
            to run in parallel.
        log_samples: Log detailed samples and scores (defaults to True)
        log_realtime: Log events in realtime (enables live viewing of samples in inspect view). Defaults to True.
        log_images: Log base64 encoded version of images,
            even if specified as a filename or URL (defaults to False)
        log_model_api: Log raw model api requests and responses. Note that error requests/responses are always logged.
        log_refusals: Log warnings for model refusals.
        log_buffer: Number of samples to buffer before writing log file.
            If not specified, an appropriate default for the format and filesystem is
            chosen (10 for most all cases, 100 for JSON logs on remote filesystems).
        log_shared: Sync sample events to log directory so that users on other systems
            can see log updates in realtime (defaults to no syncing). Specify `True`
            to sync every 10 seconds, otherwise an integer to sync every `n` seconds.
        log_header_only: If `True`, the function should return only log headers rather
            than full logs with samples (defaults to `False`).
        run_samples: Run samples. If `False`, a log with `status=="started"` and an
            empty `samples` list is returned.
        score: Score output (defaults to True)
        score_display: Show scoring metrics in realtime (defaults to True)
        eval_set_id: Unique id for eval set (this is passed from `eval_set()` and should not be specified directly).
        **kwargs: Model generation options.

    Returns:
        List of EvalLog (one for each task)
    """
    # standard platform init for top level entry points
    platform_init()

    # resolve eval trace
    max_tasks, max_samples = init_eval_display(
        display, trace, max_tasks, max_samples, model, run_samples
    )

    async def run_task_app() -> list[EvalLog]:
        try:
            return await eval_async(
                tasks=tasks,
                model=model,
                model_base_url=model_base_url,
                model_args=model_args,
                model_roles=model_roles,
                task_args=task_args,
                sandbox=sandbox,
                sandbox_cleanup=sandbox_cleanup,
                solver=solver,
                tags=tags,
                metadata=metadata,
                approval=approval,
                log_level=log_level,
                log_level_transcript=log_level_transcript,
                log_dir=log_dir,
                log_format=log_format,
                limit=limit,
                sample_id=sample_id,
                sample_shuffle=sample_shuffle,
                epochs=epochs,
                fail_on_error=fail_on_error,
                continue_on_fail=continue_on_fail,
                retry_on_error=retry_on_error,
                debug_errors=debug_errors,
                message_limit=message_limit,
                token_limit=token_limit,
                time_limit=time_limit,
                working_limit=working_limit,
                cost_limit=cost_limit,
                model_cost_config=model_cost_config,
                max_samples=max_samples,
                max_dataset_memory=max_dataset_memory,
                max_tasks=max_tasks,
                max_subprocesses=max_subprocesses,
                max_sandboxes=max_sandboxes,
                log_samples=log_samples,
                log_realtime=log_realtime,
                log_images=log_images,
                log_model_api=log_model_api,
                log_refusals=log_refusals,
                log_buffer=log_buffer,
                log_shared=log_shared,
                log_header_only=log_header_only,
                run_samples=run_samples,
                score=score,
                score_display=score_display,
                eval_set_id=eval_set_id,
                **kwargs,
            )
        # exceptions can escape when debug_errors is True and that's okay
        except ExceptionGroup as ex:
            if debug_errors:
                raise ex.exceptions[0] from None
            else:
                raise

    return task_display().run_task_app(with_async_fs(run_task_app))


# single call to eval_async at a time
_eval_async_running = False


async def eval_async(
    tasks: Tasks,
    model: str | Model | list[str] | list[Model] | None | NotGiven = NOT_GIVEN,
    model_base_url: str | None = None,
    model_args: dict[str, Any] | str = dict(),
    model_roles: dict[str, str | Model] | None = None,
    task_args: dict[str, Any] | str = dict(),
    sandbox: SandboxEnvironmentType | None = None,
    sandbox_cleanup: bool | None = None,
    solver: Solver | SolverSpec | Agent | list[Solver] | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    approval: str | list[ApprovalPolicy] | ApprovalPolicyConfig | None = None,
    log_level: str | None = None,
    log_level_transcript: str | None = None,
    log_dir: str | None = None,
    log_format: Literal["eval", "json"] | None = None,
    limit: int | tuple[int, int] | None = None,
    sample_id: str | int | list[str] | list[int] | list[str | int] | None = None,
    sample_shuffle: bool | int | None = None,
    epochs: int | Epochs | None = None,
    fail_on_error: bool | float | None = None,
    continue_on_fail: bool | None = None,
    retry_on_error: int | None = None,
    debug_errors: bool | None = None,
    message_limit: int | None = None,
    token_limit: int | None = None,
    time_limit: int | None = None,
    working_limit: int | None = None,
    cost_limit: float | None = None,
    model_cost_config: str | dict[str, ModelCost] | None = None,
    max_samples: int | None = None,
    max_dataset_memory: int | None = None,
    max_tasks: int | None = None,
    max_subprocesses: int | None = None,
    max_sandboxes: int | None = None,
    log_samples: bool | None = None,
    log_realtime: bool | None = None,
    log_images: bool | None = None,
    log_model_api: bool | None = None,
    log_refusals: bool | None = None,
    log_buffer: int | None = None,
    log_shared: bool | int | None = None,
    log_header_only: bool | None = None,
    run_samples: bool = True,
    score: bool = True,
    score_display: bool | None = None,
    eval_set_id: str | None = None,
    **kwargs: Unpack[GenerateConfigArgs],
) -> list[EvalLog]:
    r"""Evaluate tasks using a Model (async).

    Args:
        tasks: Task(s) to evaluate. If None, attempt
            to evaluate a task in the current working directory
        model: Model(s) for evaluation. If not specified use the value of the INSPECT_EVAL_MODEL
            environment variable. Specify `None` to define no default model(s), which will
            leave model usage entirely up to tasks.
        model_base_url: Base URL for communicating with the model API.
        model_args: Model creation args (as a dictionary or as a path to a JSON or YAML config file
        model_roles: Named roles for use in `get_model()`.
        task_args: Task creation arguments (as a dictionary or as a path to a JSON or YAML config file)
        sandbox: Sandbox environment type (or optionally a str or tuple with a shorthand spec)
        sandbox_cleanup: Cleanup sandbox environments after task completes (defaults to True)
        solver: Alternative solver for task(s).  Optional (uses task solver by default).
        tags: Tags to associate with this evaluation run.
        metadata: Metadata to associate with this evaluation run.
        approval: Tool use approval policies.
          Either a path to an approval policy config file, an ApprovalPolicyConfig, or a list of approval policies.
          Defaults to no approval policy.
        log_level: Level for logging to the console: "debug", "http", "sandbox",
          "info", "warning", "error", "critical", or "notset" (defaults to "warning")
        log_level_transcript: Level for logging to the log file (defaults to "info")
        log_dir: Output path for logging results (defaults to file log in ./logs directory).
        log_format: Format for writing log files (defaults to "eval", the native high-performance format).
        limit: Limit evaluated samples (defaults to all samples).
        sample_id: Evaluate specific sample(s) from the dataset. Use plain ids or preface with task names as required to disambiguate ids across tasks (e.g. `popularity:10`).
        sample_shuffle: Shuffle order of samples (pass a seed to make the order deterministic).
        epochs: Epochs to repeat samples for and optional score
            reducer function(s) used to combine sample scores (defaults to "mean")
        fail_on_error: `True` to fail on first sample error
            (default); `False` to never fail on sample errors; Value between 0 and 1
            to fail if a proportion of total samples fails. Value greater than 1 to fail eval if a count of samples fails.
        continue_on_fail: `True` to continue running and only fail at the end if the `fail_on_error` condition is met.
            `False` to fail eval immediately when the `fail_on_error` condition is met (default).
        retry_on_error: Number of times to retry samples if they encounter errors
            (by default, no retries occur).
        debug_errors: Raise task errors (rather than logging them) so they can be debugged (defaults to False).
        message_limit: Limit on total messages used for each sample.
        token_limit: Limit on total tokens used for each sample.
        time_limit: Limit on clock time (in seconds) for samples.
        working_limit: Limit on working time (in seconds) for sample. Working
            time includes model generation, tool calls, etc. but does not include
            time spent waiting on retries or shared resources.
        cost_limit: Limit on total cost (in dollars) for each sample.
            Requires model cost data via set_model_cost() or --model-cost-config.
        model_cost_config: YAML or JSON file with model prices for cost tracking
            or dict of model -> `ModelCost`
        max_samples: Maximum number of samples to run in parallel (default is max_connections)
        max_dataset_memory: Maximum MB of dataset sample data to hold in
            memory per task. When exceeded, samples are paged to a temporary
            file on disk (defaults to None, which keeps all samples in memory).
        max_tasks: Maximum number of tasks to run in parallel
            (defaults to number of models being evaluated)
        max_subprocesses: Maximum number of subprocesses to run in parallel (default is os.cpu_count())
        max_sandboxes: Maximum number of sandboxes (per-provider) to run in parallel.
        log_samples: Log detailed samples and scores (defaults to True)
        log_realtime: Log events in realtime (enables live viewing of samples in inspect view). Defaults to True.
        log_images: Log base64 encoded version of images, even if specified as a filename or URL (defaults to False)
        log_model_api: Log raw model requests and responses. Note that error requests/responses are always logged.
        log_refusals: Log warnings for model refusals.
        log_buffer: Number of samples to buffer before writing log file.
           If not specified, an appropriate default for the format and filesystem is
           chosen (10 for most all cases, 100 for JSON logs on remote filesystems).
        log_shared: Indicate that the log directory is shared, which results in additional
        syncing of realtime log data for Inspect View.
        log_header_only: If `True`, the function should return only log headers rather than full logs with samples (defaults to `False`).
        run_samples: Run samples. If `False`, a log with `status=="started"` and an
           empty `samples` list is returned.
        score: Score output (defaults to True)
        score_display: Show scoring metrics in realtime (defaults to True)
        eval_set_id: Unique id for eval set (this is passed from `eval_set()` and should not be specified directly).
        **kwargs: Model generation options.

    Returns:
        List of EvalLog (one for each task)
    """
    result: list[EvalLog] | None = None

    async def run(tg: TaskGroup) -> None:
        try:
            nonlocal result
            result = await _eval_async_inner(
                tg=tg,
                tasks=tasks,
                model=model,
                model_base_url=model_base_url,
                model_args=model_args,
                model_roles=model_roles,
                task_args=task_args,
                sandbox=sandbox,
                sandbox_cleanup=sandbox_cleanup,
                solver=solver,
                tags=tags,
                metadata=metadata,
                approval=approval,
                log_level=log_level,
                log_level_transcript=log_level_transcript,
                log_dir=log_dir,
                log_format=log_format,
                limit=limit,
                sample_id=sample_id,
                sample_shuffle=sample_shuffle,
                epochs=epochs,
                fail_on_error=fail_on_error,
                continue_on_fail=continue_on_fail,
                retry_on_error=retry_on_error,
                debug_errors=debug_errors,
                message_limit=message_limit,
                token_limit=token_limit,
                time_limit=time_limit,
                working_limit=working_limit,
                cost_limit=cost_limit,
                model_cost_config=model_cost_config,
                max_samples=max_samples,
                max_dataset_memory=max_dataset_memory,
                max_tasks=max_tasks,
                max_subprocesses=max_subprocesses,
                max_sandboxes=max_sandboxes,
                log_samples=log_samples,
                log_realtime=log_realtime,
                log_images=log_images,
                log_model_api=log_model_api,
                log_refusals=log_refusals,
                log_buffer=log_buffer,
                log_shared=log_shared,
                log_header_only=log_header_only,
                run_samples=run_samples,
                score=score,
                score_display=score_display,
                eval_set_id=eval_set_id,
                **kwargs,
            )
        finally:
            tg.cancel_scope.cancel()

    try:
        async with anyio.create_task_group() as tg:
            tg.start_soon(run, tg)
    except Exception as ex:
        raise inner_exception(ex)
    except anyio.get_cancelled_exc_class():
        # Cancelled exceptions are expected and handled by _eval_async_inner
        if result is None:
            raise

    assert result is not None, "Eval async did not return a result."

    return result


async def _eval_async_inner(
    tg: TaskGroup,
    tasks: Tasks,
    model: str | Model | list[str] | list[Model] | None | NotGiven = NOT_GIVEN,
    model_base_url: str | None = None,
    model_args: dict[str, Any] | str = dict(),
    model_roles: dict[str, str | Model] | None = None,
    task_args: dict[str, Any] | str = dict(),
    sandbox: SandboxEnvironmentType | None = None,
    sandbox_cleanup: bool | None = None,
    solver: Solver | SolverSpec | Agent | list[Solver] | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    approval: str | list[ApprovalPolicy] | ApprovalPolicyConfig | None = None,
    log_level: str | None = None,
    log_level_transcript: str | None = None,
    log_dir: str | None = None,
    log_format: Literal["eval", "json"] | None = None,
    limit: int | tuple[int, int] | None = None,
    sample_id: str | int | list[str] | list[int] | list[str | int] | None = None,
    sample_shuffle: bool | int | None = None,
    epochs: int | Epochs | None = None,
    fail_on_error: bool | float | None = None,
    continue_on_fail: bool | None = None,
    retry_on_error: int | None = None,
    debug_errors: bool | None = None,
    message_limit: int | None = None,
    token_limit: int | None = None,
    time_limit: int | None = None,
    working_limit: int | None = None,
    cost_limit: float | None = None,
    model_cost_config: str | dict[str, ModelCost] | None = None,
    max_samples: int | None = None,
    max_dataset_memory: int | None = None,
    max_tasks: int | None = None,
    max_subprocesses: int | None = None,
    max_sandboxes: int | None = None,
    log_samples: bool | None = None,
    log_realtime: bool | None = None,
    log_images: bool | None = None,
    log_model_api: bool | None = None,
    log_refusals: bool | None = None,
    log_buffer: int | None = None,
    log_shared: bool | int | None = None,
    log_header_only: bool | None = None,
    run_samples: bool = True,
    score: bool = True,
    score_display: bool | None = None,
    eval_set_id: str | None = None,
    **kwargs: Unpack[GenerateConfigArgs],
) -> list[EvalLog]:
    from inspect_ai.hooks._hooks import emit_run_end, emit_run_start

    # only a single call to eval_async can be active at a time, this used
    # to be due to running tasks switching to the task's directory, however
    # that feature no longer exists so we may be able to revisit this
    # restriction (probably just need to examine if there is *global* state
    # that could have conflicts in the case of multiple eval_async calls)
    global _eval_async_running
    if _eval_async_running:
        raise RuntimeError("Multiple concurrent calls to eval_async are not allowed.")

    _eval_async_running = True

    # if we are called outside of eval() then set display type to "plain"
    if not display_type_initialized():
        init_display_type("plain")

    # resolve model and task args
    model_args = resolve_args(model_args)
    task_args = resolve_args(task_args)

    # apply model cost config
    if isinstance(model_cost_config, str):
        cost_data = resolve_args(model_cost_config)
        for cost_model_name, cost in cost_data.items():
            set_model_cost(cost_model_name, ModelCost(**cost))
    elif isinstance(model_cost_config, dict):
        for k, v in model_cost_config.items():
            set_model_cost(k, v)

    run_id = uuid()

    try:
        # intialise eval
        model = eval_init(
            model=model,
            model_base_url=model_base_url,
            model_args=model_args,
            max_subprocesses=max_subprocesses,
            log_level=log_level,
            log_level_transcript=log_level_transcript,
            log_refusals=log_refusals,
            task_group=tg,
            **kwargs,
        )

        # resolve tasks
        resolved_tasks, approval = eval_resolve_tasks(
            tasks,
            task_args,
            model,
            model_roles,
            GenerateConfig(**kwargs),
            approval,
            sandbox,
            sample_shuffle,
        )

        # warn and return empty string if we resolved no tasks
        if len(resolved_tasks) == 0:
            raise PrerequisiteError(
                "Error: No inspect tasks were found at the specified paths."
            )

        resolve_model_costs(resolved_tasks, cost_limit)

        # if there is no max tasks then base it on unique model names
        if max_tasks is None:
            model_count = len(resolved_model_names(resolved_tasks))
            if model_count > 1:
                max_tasks = model_count

        # apply conversation display constraints
        if display_type() == "conversation":
            # single task at a time
            if max_tasks is not None:
                max_tasks = 1

            # single sample at a time
            max_samples = 1

            # multiple models not allowed in trace mode
            if len(model) > 1:
                raise PrerequisiteError(
                    "Trace mode cannot be used when evaluating multiple models."
                )

        # resolve recorder (confirm writeable)
        log_dir = log_dir if log_dir else os.environ.get("INSPECT_LOG_DIR", "./logs")
        log_dir = absolute_file_path(log_dir)
        recorder = create_recorder_for_format(log_format or DEFAULT_LOG_FORMAT, log_dir)
        if not recorder.is_writeable():
            raise PrerequisiteError(
                f"ERROR: You do not have write permission for the log_dir '{log_dir}'"
            )

        # resolve log_shared
        log_shared = DEFAULT_LOG_SHARED if log_shared is True else log_shared

        # resolve header only
        log_header_only = log_header_only is True

        # validate that --log-shared can't use used with 'json' format
        if log_shared and log_format == JSON_LOG_FORMAT:
            raise PrerequisiteError(
                "ERROR: --log-shared is not compatible with the json log format."
            )

        # resolve solver
        if isinstance(solver, list):
            solver = chain(solver)
        elif is_agent(solver):
            solver = as_solver(solver)
        else:
            solver = cast(Solver | SolverSpec | None, solver)

        # ensure consistency of limit and sample_id/sample_shuffe
        if sample_id is not None and limit is not None:
            raise ValueError("You cannot specify both sample_id and limit.")
        if sample_id is not None and sample_shuffle is not None:
            raise ValueError("You cannot specify both sample_id and sample_shuffle")

        # resolve epochs
        if isinstance(epochs, int):
            epochs = Epochs(epochs)
        if epochs is not None and epochs.epochs < 1:
            raise ValueError("epochs must be a positive integer.")

        # resolve log_model_api from env var if not explicitly set
        if log_model_api is None:
            log_model_api_env = os.environ.get("INSPECT_EVAL_LOG_MODEL_API")
            if log_model_api_env is not None:
                log_model_api = log_model_api_env.lower() in ("true", "1", "yes")

        # create config
        epochs_reducer = epochs.reducer if epochs else None
        eval_config = EvalConfig(
            limit=limit,
            sample_id=sample_id,
            sample_shuffle=sample_shuffle,
            epochs=epochs.epochs if epochs else None,
            epochs_reducer=reducer_log_names(epochs_reducer)
            if epochs_reducer is not None
            else None,
            approval=config_from_approval_policies(approval) if approval else None,
            fail_on_error=fail_on_error,
            continue_on_fail=continue_on_fail,
            retry_on_error=retry_on_error,
            message_limit=message_limit,
            token_limit=token_limit,
            cost_limit=cost_limit,
            time_limit=time_limit,
            working_limit=working_limit,
            max_samples=max_samples,
            max_dataset_memory=max_dataset_memory,
            max_tasks=max_tasks,
            max_subprocesses=max_subprocesses,
            max_sandboxes=max_sandboxes,
            sandbox_cleanup=sandbox_cleanup,
            log_samples=log_samples,
            log_realtime=log_realtime,
            log_images=log_images,
            log_model_api=log_model_api,
            log_buffer=log_buffer,
            log_shared=log_shared,
            score_display=score_display,
        )

        # run tasks - 2 codepaths, one for the traditional task at a time
        # (w/ optional multiple models) and the other for true multi-task
        # (which requires different scheduling and UI)
        task_definitions = len(resolved_tasks) // len(model)
        parallel = 1 if (task_definitions == 1 or max_tasks is None) else max_tasks

        await emit_run_start(eval_set_id, run_id, resolved_tasks)

        # single task definition (could be multi-model) or max_tasks capped to 1
        if parallel == 1:
            results: list[EvalLog] = []
            for sequence in sorted(set(t.sequence for t in resolved_tasks)):
                task_batch = list(
                    filter(lambda t: t.sequence == sequence, resolved_tasks)
                )
                results.extend(
                    await eval_run(
                        eval_set_id=eval_set_id,
                        run_id=run_id,
                        tasks=task_batch,
                        parallel=parallel,
                        eval_config=eval_config,
                        eval_sandbox=sandbox,
                        recorder=recorder,
                        header_only=log_header_only,
                        epochs_reducer=epochs_reducer,
                        solver=solver,
                        tags=tags,
                        metadata=metadata,
                        run_samples=run_samples,
                        score=score,
                        debug_errors=debug_errors is True,
                        **kwargs,
                    )
                )
                # exit the loop if there was a cancellation
                if any([result.status == "cancelled" for result in results]):
                    break

            # return list of eval logs
            logs = EvalLogs(results)

        # multiple task definitions AND tasks not capped at 1
        else:
            results = await eval_run(
                eval_set_id=eval_set_id,
                run_id=run_id,
                tasks=resolved_tasks,
                parallel=parallel,
                eval_config=eval_config,
                eval_sandbox=sandbox,
                recorder=recorder,
                header_only=log_header_only,
                epochs_reducer=epochs_reducer,
                solver=solver,
                tags=tags,
                metadata=metadata,
                run_samples=run_samples,
                score=score,
                **kwargs,
            )
            logs = EvalLogs(results)

        # cleanup sample buffers if required
        cleanup_sample_buffers(log_dir)

        try:
            await emit_run_end(eval_set_id, run_id, logs)
        except UnboundLocalError:
            await emit_run_end(eval_set_id, run_id, EvalLogs([]))
        _eval_async_running = False

    except BaseException as e:
        await emit_run_end(eval_set_id, run_id, EvalLogs([]), e)
        _eval_async_running = False
        raise e

    # return logs
    return logs


def eval_retry(
    tasks: str | EvalLogInfo | EvalLog | list[str] | list[EvalLogInfo] | list[EvalLog],
    log_level: str | None = None,
    log_level_transcript: str | None = None,
    log_dir: str | None = None,
    log_format: Literal["eval", "json"] | None = None,
    max_samples: int | None = None,
    max_tasks: int | None = None,
    max_subprocesses: int | None = None,
    max_sandboxes: int | None = None,
    sandbox_cleanup: bool | None = None,
    trace: bool | None = None,
    display: DisplayType | None = None,
    fail_on_error: bool | float | None = None,
    continue_on_fail: bool | None = None,
    retry_on_error: int | None = None,
    debug_errors: bool | None = None,
    log_samples: bool | None = None,
    log_realtime: bool | None = None,
    log_images: bool | None = None,
    log_model_api: bool | None = None,
    log_refusals: bool | None = None,
    log_buffer: int | None = None,
    log_shared: bool | int | None = None,
    score: bool = True,
    score_display: bool | None = None,
    max_retries: int | None = None,
    timeout: int | None = None,
    attempt_timeout: int | None = None,
    max_connections: int | None = None,
) -> list[EvalLog]:
    """Retry a previously failed evaluation task.

    Args:
        tasks: Log files for task(s) to retry.
        log_level: Level for logging to the console: "debug", "http", "sandbox",
            "info", "warning", "error", "critical", or "notset" (defaults to "warning")
        log_level_transcript: Level for logging to the log file (defaults to "info")
        log_dir: Output path for logging results
            (defaults to file log in ./logs directory).
        log_format: Format for writing log files (defaults
            to "eval", the native high-performance format).
        max_samples: Maximum number of samples to run in parallel
            (default is max_connections)
        max_tasks: Maximum number of tasks to run in parallel
            (defaults to number of models being evaluated)
        max_subprocesses: Maximum number of subprocesses to
            run in parallel (default is os.cpu_count())
        max_sandboxes: Maximum number of sandboxes (per-provider)
            to run in parallel.
        sandbox_cleanup: Cleanup sandbox environments after task completes
            (defaults to True)
        trace: Trace message interactions with evaluated model to terminal.
        display: Task display type (defaults to 'full').
        fail_on_error: `True` to fail on a sample error
            (default); `False` to never fail on sample errors; Value between 0 and 1
            to fail if a proportion of total samples fails. Value greater than 1 to fail
            eval if a count of samples fails.
        continue_on_fail: `True` to continue running and only fail at the end if the `fail_on_error` condition is met.
            `False` to fail eval immediately when the `fail_on_error` condition is met (default).
        retry_on_error: Number of times to retry samples if they encounter errors
            (by default, no retries occur).
        debug_errors: Raise task errors (rather than logging them)
            so they can be debugged (defaults to False).
        log_samples: Log detailed samples and scores (defaults to True)
        log_realtime: Log events in realtime (enables live viewing of samples in inspect view). Defaults to True.
        log_images: Log base64 encoded version of images,
            even if specified as a filename or URL (defaults to False)
        log_model_api: Log raw model api requests and responses. Note that error requests/responses are always logged.
        log_refusals: Log warnings for model refusals.
        log_buffer: Number of samples to buffer before writing log file.
            If not specified, an appropriate default for the format and filesystem is
            chosen (10 for most all cases, 100 for JSON logs on remote filesystems).
        log_shared: Sync sample events to log directory so that users on other systems
            can see log updates in realtime (defaults to no syncing). Specify `True`
            to sync every 10 seconds, otherwise an integer to sync every `n` seconds.
        score: Score output (defaults to True)
        score_display: Show scoring metrics in realtime (defaults to True)
        max_retries:
            Maximum number of times to retry request.
        timeout:
            Request timeout (in seconds)
        attempt_timeout:
            Timeout (in seconds) for any given attempt (if exceeded, will abandon attempt and retry according to max_retries).
        max_connections:
            Maximum number of concurrent connections to Model API (default is per Model API)

    Returns:
        List of EvalLog (one for each task)
    """
    # standard platform init for top level entry points
    platform_init()

    # resolve eval trace
    max_tasks, max_samples = init_eval_display(display, trace, max_tasks, max_samples)

    async def run_task_app() -> list[EvalLog]:
        return await eval_retry_async(
            tasks=tasks,
            log_level=log_level,
            log_level_transcript=log_level_transcript,
            log_dir=log_dir,
            log_format=log_format,
            max_samples=max_samples,
            max_tasks=max_tasks,
            max_subprocesses=max_subprocesses,
            max_sandboxes=max_sandboxes,
            sandbox_cleanup=sandbox_cleanup,
            fail_on_error=fail_on_error,
            continue_on_fail=continue_on_fail,
            retry_on_error=retry_on_error,
            debug_errors=debug_errors,
            log_samples=log_samples,
            log_realtime=log_realtime,
            log_images=log_images,
            log_model_api=log_model_api,
            log_refusals=log_refusals,
            log_buffer=log_buffer,
            log_shared=log_shared,
            score=score,
            score_display=score_display,
            max_retries=max_retries,
            timeout=timeout,
            attempt_timeout=attempt_timeout,
            max_connections=max_connections,
        )

    return task_display().run_task_app(with_async_fs(run_task_app))


async def eval_retry_async(
    tasks: str | EvalLogInfo | EvalLog | list[str] | list[EvalLogInfo] | list[EvalLog],
    log_level: str | None = None,
    log_level_transcript: str | None = None,
    log_dir: str | None = None,
    log_format: Literal["eval", "json"] | None = None,
    max_samples: int | None = None,
    max_tasks: int | None = None,
    max_subprocesses: int | None = None,
    max_sandboxes: int | None = None,
    sandbox_cleanup: bool | None = None,
    fail_on_error: bool | float | None = None,
    continue_on_fail: bool | None = None,
    retry_on_error: int | None = None,
    debug_errors: bool | None = None,
    log_samples: bool | None = None,
    log_realtime: bool | None = None,
    log_images: bool | None = None,
    log_model_api: bool | None = None,
    log_refusals: bool | None = None,
    log_buffer: int | None = None,
    log_shared: bool | int | None = None,
    score: bool = True,
    score_display: bool | None = None,
    max_retries: int | None = None,
    timeout: int | None = None,
    attempt_timeout: int | None = None,
    max_connections: int | None = None,
) -> list[EvalLog]:
    """Retry a previously failed evaluation task.

    Args:
        tasks: Log files for task(s) to retry.
        log_level: Level for logging to the console: "debug", "http", "sandbox",
          "info", "warning", "error", "critical", or "notset" (defaults to "warning")
        log_level_transcript: Level for logging to the log file (defaults to "info")
        log_dir: Output path for logging results (defaults to file log in ./logs directory).
        log_format: Format for writing log files (defaults to "eval", the native high-performance format).
        max_samples: Maximum number of samples to run in parallel
           (default is max_connections)
        max_tasks: Maximum number of tasks to run in parallel (default is 1)
        max_subprocesses: Maximum number of subprocesses to run in parallel (default is os.cpu_count())
        max_sandboxes: Maximum number of sandboxes (per-provider) to run in parallel.
        sandbox_cleanup: Cleanup sandbox environments after task completes
           (defaults to True)
        fail_on_error: `True` to fail on first sample error
           (default); `False` to never fail on sample errors; Value between 0 and 1
           to fail if a proportion of total samples fails. Value greater than 1 to fail
           eval if a count of samples fails.
        continue_on_fail: `True` to continue running and only fail at the end if the `fail_on_error` condition is met.
            `False` to fail eval immediately when the `fail_on_error` condition is met (default).
        retry_on_error: Number of times to retry samples if they encounter errors
           (by default, no retries occur).
        debug_errors: Raise task errors (rather than logging them)
           so they can be debugged (defaults to False).
        log_samples: Log detailed samples and scores (defaults to True)
        log_realtime: Log events in realtime (enables live viewing of samples in inspect view). Defaults to True.
        log_images: Log base64 encoded version of images,
           even if specified as a filename or URL (defaults to False)
        log_model_api: Log raw model api request and response. Note that error requests/responses are always logged.
        log_refusals: Log warnings for model refusals.
        log_buffer: Number of samples to buffer before writing log file.
           If not specified, an appropriate default for the format and filesystem is
           chosen (10 for most all cases, 100 for JSON logs on remote filesystems).
        log_shared: Indicate that the log directory is shared, which results in
            additional syncing of realtime log data for Inspect View.
        score: Score output (defaults to True)
        score_display: Show scoring metrics in realtime (defaults to True)
        max_retries: Maximum number of times to retry request.
        timeout: Request timeout (in seconds)
        attempt_timeout: Timeout (in seconds) for any given attempt (if exceeded, will abandon attempt and retry according to max_retries).
        max_connections: Maximum number of concurrent connections to Model API (default is per Model API)

    Returns:
        List of EvalLog (one for each task)
    """
    # resolve into a list of eval logs
    if isinstance(tasks, EvalLogInfo):
        tasks = [tasks]
    elif isinstance(tasks, EvalLog):
        tasks = [tasks]
    elif isinstance(tasks, str):
        tasks = [tasks]
    retry_eval_logs = [
        (
            task
            if isinstance(task, EvalLog)
            else (
                await read_eval_log_async(task.name)
                if isinstance(task, EvalLogInfo)
                else await read_eval_log_async(task)
            )
        )
        for task in tasks
    ]

    # eval them in turn
    eval_logs: list[EvalLog] = []
    for eval_log in retry_eval_logs:
        # the task needs to be either filesystem or registry
        # based in order to do a retry (we don't have enough
        # context to reconstruct ephemeral Task instances)
        task: str | None
        task_id = eval_log.eval.task_id
        task_name = eval_log.eval.task_registry_name or eval_log.eval.task
        task_file = eval_log.eval.task_file
        if task_file:
            if not Path(task_file).exists():
                raise FileNotFoundError(f"Task file '{task_file}' not found")
            task = f"{task_file}@{task_name}"
        else:
            if registry_lookup("task", task_name) is None and not task_name.startswith(
                "hf/"
            ):
                # if this object is in a package then let the user know
                # that they need to register it to work with eval-retry
                package_name = registry_package_name(task_name)
                if package_name is not None:
                    raise FileNotFoundError(
                        f"Task '{task_name}' is located in package '{package_name}' but has not been registered so cannot be retried. See https://inspect.aisi.org.uk/tasks.html#packaging for additional details on registering tasks in packages."
                    )
                else:
                    raise FileNotFoundError(f"Task '{task_name}' not found.")
            task = task_name

        # see if there is solver spec in the eval log
        solver = (
            SolverSpec(
                eval_log.eval.solver,
                eval_log.eval.solver_args or {},
                eval_log.eval.solver_args_passed or {},
            )
            if eval_log.eval.solver
            else None
        )

        # resolve the model
        model = get_model(
            model=eval_log.eval.model,
            config=eval_log.eval.model_generate_config,
            base_url=eval_log.eval.model_base_url,
            **eval_log.eval.model_args,
        )

        # resolve model roles
        model_roles = model_roles_config_to_model_roles(eval_log.eval.model_roles)

        # collect the rest of the params we need for the eval
        task_args = eval_log.eval.task_args_passed
        tags = eval_log.eval.tags
        metadata = eval_log.eval.metadata
        limit = eval_log.eval.config.limit
        # try to match log format of retried log
        if log_format is None and eval_log.location:
            ext = os.path.splitext(eval_log.location)[1]
            match ext:
                case ".eval":
                    log_format = "eval"
                case ".json":
                    log_format = "json"
        sample_id = eval_log.eval.config.sample_id
        sample_shuffle = eval_log.eval.config.sample_shuffle
        epochs = (
            Epochs(eval_log.eval.config.epochs, eval_log.eval.config.epochs_reducer)
            if eval_log.eval.config.epochs
            else None
        )
        approval = eval_log.eval.config.approval
        message_limit = eval_log.eval.config.message_limit
        token_limit = eval_log.eval.config.token_limit
        time_limit = eval_log.eval.config.time_limit
        working_limit = eval_log.eval.config.working_limit
        max_samples = max_samples or eval_log.eval.config.max_samples
        max_tasks = max_tasks or eval_log.eval.config.max_tasks
        max_subprocesses = max_subprocesses or eval_log.eval.config.max_subprocesses
        max_sandboxes = max_sandboxes or eval_log.eval.config.max_sandboxes
        sandbox_cleanup = (
            sandbox_cleanup
            if sandbox_cleanup is not None
            else eval_log.eval.config.sandbox_cleanup
        )
        fail_on_error = (
            fail_on_error
            if fail_on_error is not None
            else eval_log.eval.config.fail_on_error
        )
        continue_on_fail = (
            continue_on_fail
            if continue_on_fail is not None
            else eval_log.eval.config.continue_on_fail
        )
        retry_on_error = (
            retry_on_error
            if retry_on_error is not None
            else eval_log.eval.config.retry_on_error
        )
        log_samples = (
            log_samples if log_samples is not None else eval_log.eval.config.log_samples
        )
        log_realtime = (
            log_realtime
            if log_realtime is not None
            else eval_log.eval.config.log_realtime
        )
        log_images = (
            log_images if log_images is not None else eval_log.eval.config.log_images
        )
        # resolve log_model_api from env var if not explicitly set
        if log_model_api is None:
            log_model_api_env = os.environ.get("INSPECT_EVAL_LOG_MODEL_API")
            if log_model_api_env is not None:
                log_model_api = log_model_api_env.lower() in ("true", "1", "yes")
        log_model_api = (
            log_model_api
            if log_model_api is not None
            else eval_log.eval.config.log_model_api
        )
        # resolve log_refusals from env var if not explicitly set
        if log_refusals is None:
            log_refusals_env = os.environ.get("INSPECT_EVAL_LOG_REFUSALS")
            if log_refusals_env is not None:
                log_refusals = log_refusals_env.lower() in ("true", "1", "yes")
        log_buffer = (
            log_buffer if log_buffer is not None else eval_log.eval.config.log_buffer
        )
        log_shared = (
            log_shared if log_shared is not None else eval_log.eval.config.log_shared
        )
        score_display = (
            score_display
            if score_display is not None
            else eval_log.eval.config.score_display
        )

        config = eval_log.plan.config
        config.max_retries = max_retries or config.max_retries
        config.timeout = timeout or config.timeout
        config.attempt_timeout = attempt_timeout or config.attempt_timeout
        config.max_connections = max_connections or config.max_connections

        # extract previous model usage to continue token counting (make a deep copy to avoid modifying the original log)
        initial_model_usage = (
            copy.deepcopy(eval_log.stats.model_usage)
            if eval_log.stats.model_usage
            else None
        )
        if initial_model_usage:
            init_model_usage(initial_model_usage)

        initial_role_usage = (
            copy.deepcopy(eval_log.stats.role_usage)
            if eval_log.stats.role_usage
            else None
        )
        if initial_role_usage:
            init_role_usage(initial_role_usage)

        # run the eval
        log = (
            await eval_async(
                tasks=PreviousTask(
                    id=task_id,
                    task=task,
                    task_args=task_args,
                    model=None,
                    model_roles=None,
                    log=eval_log,
                    log_info=None,
                ),
                model=model,
                model_roles=cast(dict[str, str | Model], model_roles),
                task_args=task_args,
                sandbox=eval_log.eval.sandbox,
                sandbox_cleanup=sandbox_cleanup,
                solver=solver,
                tags=tags,
                metadata=metadata,
                approval=approval,
                log_level=log_level,
                log_level_transcript=log_level_transcript,
                log_dir=log_dir,
                log_format=log_format,
                limit=limit,
                sample_id=sample_id,
                sample_shuffle=sample_shuffle,
                epochs=epochs,
                fail_on_error=fail_on_error,
                continue_on_fail=continue_on_fail,
                retry_on_error=retry_on_error,
                debug_errors=debug_errors,
                message_limit=message_limit,
                token_limit=token_limit,
                time_limit=time_limit,
                working_limit=working_limit,
                max_samples=max_samples,
                max_tasks=max_tasks,
                max_subprocesses=max_subprocesses,
                max_sandboxes=max_sandboxes,
                log_samples=log_samples,
                log_realtime=log_realtime,
                log_images=log_images,
                log_model_api=log_model_api,
                log_refusals=log_refusals,
                log_buffer=log_buffer,
                log_shared=log_shared,
                score=score,
                score_display=score_display,
                **dict(config),
            )
        )[0]

        # add it to our results
        eval_logs.append(log)

    return EvalLogs(eval_logs)


def eval_init(
    model: str | Model | list[str] | list[Model] | None | NotGiven = NOT_GIVEN,
    model_base_url: str | None = None,
    model_args: dict[str, Any] | str = dict(),
    max_subprocesses: int | None = None,
    log_level: str | None = None,
    log_level_transcript: str | None = None,
    log_refusals: bool | None = None,
    task_group: TaskGroup | None = None,
    **kwargs: Unpack[GenerateConfigArgs],
) -> list[Model]:
    # init eval context
    init_eval_context(
        log_level, log_level_transcript, log_refusals, max_subprocesses, task_group
    )

    # resolve model and task args
    model_args = resolve_args(model_args)

    # resolve model args from environment if not specified
    if len(model_args) == 0:
        env_model_args = os.environ.get("INSPECT_EVAL_MODEL_ARGS", None)
        if env_model_args:
            args = [arg.strip() for arg in env_model_args.split(" ")]
            model_args = parse_cli_args(args)

    # resolve and return models
    generate_config = GenerateConfig(**kwargs)
    models = resolve_models(model, model_base_url, model_args, generate_config)
    return models


def eval_resolve_tasks(
    tasks: Tasks,
    task_args: dict[str, Any] | str,
    models: list[Model],
    model_roles: dict[str, str | Model] | None,
    config: GenerateConfig,
    approval: str | list[ApprovalPolicy] | ApprovalPolicyConfig | None,
    sandbox: SandboxEnvironmentType | None,
    sample_shuffle: bool | int | None,
) -> tuple[list[ResolvedTask], list[ApprovalPolicy] | None]:
    # resolve model roles and initialize them in the eval context -- this
    # will enable tasks that reference model roles in their initialization
    # to pickup these mappings
    resolved_model_roles = resolve_model_roles(model_roles)
    init_model_roles(resolved_model_roles or {})

    task_args = resolve_args(task_args)
    # To support inspect-flow using this method directly, make sure not to create the display if it does not already exist.
    active_display = active_task_display()
    with active_display.suspend_task_app() if active_display else nullcontext():
        resolved_tasks: list[ResolvedTask] = []
        for m in models:
            init_active_model(m, config)
            resolved_tasks.extend(
                resolve_tasks(
                    tasks, task_args, m, resolved_model_roles, sandbox, sample_shuffle
                )
            )

    if isinstance(approval, str | ApprovalPolicyConfig):
        approval = approval_policies_from_config(approval)
    init_tool_approval(approval)

    # return tasks and approval
    return resolved_tasks, approval


def init_eval_display(
    display: DisplayType | None,
    trace: bool | None,
    max_tasks: int | None,
    max_samples: int | None,
    model: Any = None,
    run_samples: bool = True,
) -> tuple[int | None, int | None]:
    # propagate any trace value to display_type
    if trace:
        warn_once(
            log,
            "WARNING: The --trace flag is deprecated (use --display=conversation instead)",
        )
        display = "conversation"

    # apply default and init
    if not run_samples:
        display = "none"
    else:
        display = display or display_type()
    init_display_type(display)

    # adapt task/samples as required if we are in conversation mode
    if display_type() == "conversation":
        # single task at a time
        if max_tasks is not None:
            max_tasks = 1

        # single sample at a time
        max_samples = 1

        # multiple models not allowed in trace mode
        if isinstance(model, list) and len(model) > 1:
            raise PrerequisiteError(
                "Conversation mode cannot be used when evaluating multiple models."
            )

    return max_tasks, max_samples


# A list of eval logs is returned from eval(). We've already displayed
# all of the output we need to to though, so we make the return
# value 'invisible'
class EvalLogs(list[EvalLog]):
    def _ipython_display_(self) -> None:
        pass

    def __repr__(self) -> str:
        return ""

    def __str__(self) -> str:
        return list.__repr__(self)
```

## `_eval/evalset.py`

```python
import contextlib
import hashlib
import logging
import threading
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any, Literal, NamedTuple, Set, cast

import rich
from pydantic import BaseModel
from pydantic_core import to_json
from rich.status import Status
from shortuuid import uuid
from tenacity import (
    RetryCallState,
    Retrying,
    retry_if_not_result,
    stop_after_attempt,
    wait_exponential,
)
from typing_extensions import Unpack

from inspect_ai._display import display as display_manager
from inspect_ai._eval.task.log import plan_to_eval_plan
from inspect_ai._eval.task.run import resolve_plan
from inspect_ai._util._async import run_coroutine
from inspect_ai._util.azure import call_with_azure_auth_fallback
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.file import (
    FileSystem,
    basename,
    file,
    filesystem,
)
from inspect_ai._util.json import to_json_safe
from inspect_ai._util.notgiven import NOT_GIVEN, NotGiven
from inspect_ai.agent._agent import Agent, is_agent
from inspect_ai.agent._as_solver import as_solver
from inspect_ai.approval._policy import ApprovalPolicy, ApprovalPolicyConfig
from inspect_ai.log import EvalLog
from inspect_ai.log._bundle import bundle_log_dir, embed_log_dir
from inspect_ai.log._file import (
    EvalLogInfo,
    ReadEvalLogsProgress,
    list_eval_logs,
    read_eval_log_headers,
    write_log_dir_manifest,
    write_log_listing,
)
from inspect_ai.log._log import EvalConfig
from inspect_ai.model import (
    GenerateConfigArgs,
    Model,
)
from inspect_ai.model._generate_config import GenerateConfig
from inspect_ai.model._model import ModelName
from inspect_ai.model._model_config import (
    model_args_for_log,
    model_roles_to_model_roles_config,
)
from inspect_ai.model._model_data.model_data import ModelCost
from inspect_ai.scorer._reducer import reducer_log_name
from inspect_ai.solver._chain import chain
from inspect_ai.solver._solver import Solver, SolverSpec
from inspect_ai.util import DisplayType, SandboxEnvironmentType
from inspect_ai.util._display import (
    display_type_initialized,
    display_type_plain,
    init_display_type,
)

from .eval import eval, eval_init, eval_resolve_tasks
from .loader import resolve_task_args, solver_from_spec
from .task import Epochs
from .task.resolved import ResolvedTask
from .task.task import PreviousTask, resolve_epochs
from .task.tasks import Tasks

logger = logging.getLogger(__name__)


class Log(NamedTuple):
    info: EvalLogInfo
    header: EvalLog
    task_identifier: str


@dataclass
class EvalSetArgsInTaskIdentifier:
    config: GenerateConfig
    solver: Solver | SolverSpec | Agent | list[Solver] | None = None
    message_limit: int | None = None
    token_limit: int | None = None
    time_limit: int | None = None
    working_limit: int | None = None
    cost_limit: float | None = None


def eval_set(
    tasks: Tasks,
    log_dir: str,
    retry_attempts: int | None = None,
    retry_wait: float | None = None,
    retry_connections: float | None = None,
    retry_cleanup: bool | None = None,
    model: str | Model | list[str] | list[Model] | None | NotGiven = NOT_GIVEN,
    model_base_url: str | None = None,
    model_args: dict[str, Any] | str = dict(),
    model_roles: dict[str, str | Model] | None = None,
    task_args: dict[str, Any] | str = dict(),
    sandbox: SandboxEnvironmentType | None = None,
    sandbox_cleanup: bool | None = None,
    solver: Solver | SolverSpec | Agent | list[Solver] | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    trace: bool | None = None,
    display: DisplayType | None = None,
    approval: str | list[ApprovalPolicy] | ApprovalPolicyConfig | None = None,
    score: bool = True,
    log_level: str | None = None,
    log_level_transcript: str | None = None,
    log_format: Literal["eval", "json"] | None = None,
    limit: int | tuple[int, int] | None = None,
    sample_id: str | int | list[str] | list[int] | list[str | int] | None = None,
    sample_shuffle: bool | int | None = None,
    epochs: int | Epochs | None = None,
    fail_on_error: bool | float | None = None,
    continue_on_fail: bool | None = None,
    retry_on_error: int | None = None,
    debug_errors: bool | None = None,
    message_limit: int | None = None,
    token_limit: int | None = None,
    time_limit: int | None = None,
    working_limit: int | None = None,
    cost_limit: float | None = None,
    model_cost_config: str | dict[str, ModelCost] | None = None,
    max_samples: int | None = None,
    max_dataset_memory: int | None = None,
    max_tasks: int | None = None,
    max_subprocesses: int | None = None,
    max_sandboxes: int | None = None,
    log_samples: bool | None = None,
    log_realtime: bool | None = None,
    log_images: bool | None = None,
    log_model_api: bool | None = None,
    log_refusals: bool | None = None,
    log_buffer: int | None = None,
    log_shared: bool | int | None = None,
    bundle_dir: str | None = None,
    bundle_overwrite: bool = False,
    log_dir_allow_dirty: bool | None = None,
    eval_set_id: str | None = None,
    embed_viewer: bool = False,
    **kwargs: Unpack[GenerateConfigArgs],
) -> tuple[bool, list[EvalLog]]:
    r"""Evaluate a set of tasks.

    Args:
        tasks: Task(s) to evaluate. If None, attempt
            to evaluate a task in the current working directory
        log_dir: Output path for logging results
            (required to ensure that a unique storage scope is assigned for the set).
        retry_attempts: Maximum number of retry attempts before giving up
            (defaults to 10).
        retry_wait: Time to wait between attempts, increased exponentially.
            (defaults to 30, resulting in waits of 30, 60, 120, 240, etc.). Wait time
            per-retry will in no case by longer than 1 hour.
        retry_connections: Reduce max_connections at this rate with each retry
            (defaults to 1.0, which results in no reduction).
        retry_cleanup: Cleanup failed log files after retries
            (defaults to True)
        model: Model(s) for evaluation. If not specified use the value of the INSPECT_EVAL_MODEL
            environment variable. Specify `None` to define no default model(s), which will
            leave model usage entirely up to tasks.
        model_base_url: Base URL for communicating
            with the model API.
        model_args: Model creation args
            (as a dictionary or as a path to a JSON or YAML config file)
        model_roles: Named roles for use in `get_model()`.
        task_args: Task creation arguments
            (as a dictionary or as a path to a JSON or YAML config file)
        sandbox: Sandbox environment type
            (or optionally a str or tuple with a shorthand spec)
        sandbox_cleanup: Cleanup sandbox environments after task completes
            (defaults to True)
        solver: Alternative solver(s) for
            evaluating task(s). Optional (uses task solver by default).
        tags: Tags to associate with this evaluation run.
        metadata: Metadata to associate with this evaluation run.
        trace: Trace message interactions with evaluated model to terminal.
        display: Task display type (defaults to 'full').
        approval: Tool use approval policies.
            Either a path to an approval policy config file, an ApprovalPolicyConfig, or a list of approval policies.
            Defaults to no approval policy.
        score: Score output (defaults to True)
        log_level: Level for logging to the console: "debug", "http", "sandbox",
            "info", "warning", "error", "critical", or "notset" (defaults to "warning")
        log_level_transcript: Level for logging to the log file (defaults to "info")
        log_format: Format for writing
            log files (defaults to "eval", the native high-performance format).
        limit: Limit evaluated samples
            (defaults to all samples).
        sample_id: Evaluate specific sample(s) from the dataset. Use plain ids or preface with task names as required to disambiguate ids across tasks (e.g. `popularity:10`).
        sample_shuffle: Shuffle order of samples (pass a seed to make the order deterministic).
        epochs: Epochs to repeat samples for and optional score
            reducer function(s) used to combine sample scores (defaults to "mean")
        fail_on_error: `True` to fail on first sample error
            (default); `False` to never fail on sample errors; Value between 0 and 1
            to fail if a proportion of total samples fails. Value greater than 1 to fail
            eval if a count of samples fails.
        continue_on_fail: `True` to continue running and only fail at the end if the `fail_on_error` condition is met.
            `False` to fail eval immediately when the `fail_on_error` condition is met (default).
        retry_on_error: Number of times to retry samples if they encounter errors
            (by default, no retries occur).
        debug_errors: Raise task errors (rather than logging them)
            so they can be debugged (defaults to False).
        message_limit: Limit on total messages used for each sample.
        token_limit: Limit on total tokens used for each sample.
        time_limit: Limit on clock time (in seconds) for samples.
        working_limit: Limit on working time (in seconds) for sample. Working
            time includes model generation, tool calls, etc. but does not include
            time spent waiting on retries or shared resources.
        cost_limit: Limit on total cost (in dollars) for each sample.
            Requires model cost data via set_model_cost() or --model-cost-config.
        model_cost_config: YAML or JSON file with model prices for cost tracking.
        max_samples: Maximum number of samples to run in parallel
            (default is max_connections)
        max_dataset_memory: Maximum MB of dataset sample data to hold in
            memory per task. When exceeded, samples are paged to a temporary
            file on disk (defaults to None, which keeps all samples in memory).
        max_tasks: Maximum number of tasks to run in parallel
            (defaults to the greater of 4 and the number of models being evaluated)
        max_subprocesses: Maximum number of subprocesses to
            run in parallel (default is os.cpu_count())
        max_sandboxes: Maximum number of sandboxes (per-provider)
            to run in parallel.
        log_samples: Log detailed samples and scores (defaults to True)
        log_realtime: Log events in realtime (enables live viewing of samples in inspect view). Defaults to True.
        log_images: Log base64 encoded version of images,
            even if specified as a filename or URL (defaults to False)
        log_model_api: Log raw model api requests and responses. Note that error requests/responses are always logged.
        log_refusals: Log warnings for model refusals.
        log_buffer: Number of samples to buffer before writing log file.
            If not specified, an appropriate default for the format and filesystem is
            chosen (10 for most all cases, 100 for JSON logs on remote filesystems).
        log_shared: Sync sample events to log directory so that users on other systems
            can see log updates in realtime (defaults to no syncing). Specify `True`
            to sync every 10 seconds, otherwise an integer to sync every `n` seconds.
        bundle_dir: If specified, the log viewer and logs generated
            by this eval set will be bundled into this directory.
        bundle_overwrite: Whether to overwrite files in the bundle_dir.
            (defaults to False).
        log_dir_allow_dirty: If True, allow the log directory to contain
            unrelated logs. If False, ensure that the log directory only contains logs
            for tasks in this eval set (defaults to False).
        eval_set_id: ID for the eval set. If not specified, a unique ID will be generated.
        embed_viewer: If True, embed a log viewer into the log directory.
        **kwargs: Model generation options.

    Returns:
        A tuple of bool (whether all tasks completed successfully) and a list of `EvalLog` headers (i.e. raw sample data is not included in the logs returned).
    """
    from inspect_ai.hooks._hooks import emit_eval_set_end, emit_eval_set_start

    # helper function to run a set of evals
    def run_eval(
        eval_set_id: str,
        tasks: list[ResolvedTask]
        | list[PreviousTask]
        | list[ResolvedTask | PreviousTask],
    ) -> list[EvalLog]:
        # run evals
        results = eval(
            tasks=tasks,
            model=None,  # ResolvedTask/PreviousTask already carries its model
            model_base_url=model_base_url,
            model_args=model_args,
            model_roles=model_roles,
            task_args=task_args,
            sandbox=sandbox,
            sandbox_cleanup=sandbox_cleanup,
            solver=solver,
            tags=tags,
            metadata=metadata,
            trace=trace,
            display=display,
            approval=approval,
            log_level=log_level,
            log_level_transcript=log_level_transcript,
            log_dir=log_dir,
            log_format=log_format,
            limit=limit,
            sample_id=sample_id,
            sample_shuffle=sample_shuffle,
            epochs=epochs,
            fail_on_error=fail_on_error,
            continue_on_fail=continue_on_fail,
            retry_on_error=retry_on_error,
            debug_errors=debug_errors,
            message_limit=message_limit,
            token_limit=token_limit,
            time_limit=time_limit,
            working_limit=working_limit,
            cost_limit=cost_limit,
            model_cost_config=model_cost_config,
            max_samples=max_samples,
            max_dataset_memory=max_dataset_memory,
            max_tasks=max_tasks,
            max_subprocesses=max_subprocesses,
            max_sandboxes=max_sandboxes,
            log_samples=log_samples,
            log_realtime=log_realtime,
            log_images=log_images,
            log_model_api=log_model_api,
            log_refusals=log_refusals,
            log_buffer=log_buffer,
            log_shared=log_shared,
            log_header_only=True,
            score=score,
            eval_set_id=eval_set_id,
            **kwargs,
        )

        # check for cancelled
        if evals_cancelled(results):
            raise KeyboardInterrupt

        # return results
        return results

    # initialise display (otherwise eval_init will set it to full)
    if not display_type_initialized():
        display = init_display_type(display)
    if display == "conversation":
        raise RuntimeError("eval_set cannot be used with conversation display.")

    # initialize eval
    models = eval_init(
        model=model,
        model_base_url=model_base_url,
        model_args=model_args,
        max_subprocesses=max_subprocesses,
        log_level=log_level,
        log_level_transcript=log_level_transcript,
        log_refusals=log_refusals,
        **kwargs,
    )

    # ensure log_dir
    fs = filesystem(log_dir)
    fs.mkdir(log_dir, exist_ok=True)

    # get eval set id
    eval_set_id = eval_set_id_for_log_dir(log_dir, eval_set_id=eval_set_id)

    # resolve some parameters
    retry_connections = retry_connections or 1.0
    retry_cleanup = retry_cleanup is not False
    max_connections = starting_max_connections(models, GenerateConfig(**kwargs))
    max_tasks = max_tasks if max_tasks is not None else max(len(models), 4)
    log_dir_allow_dirty = log_dir_allow_dirty is True

    # prepare console/status
    console = rich.get_console()
    status: Status | None = None

    # before sleep
    def before_sleep(retry_state: RetryCallState) -> None:
        # compute/update next max_connections
        nonlocal max_connections
        max_connections = max(round(max_connections * retry_connections), 1)
        kwargs["max_connections"] = max_connections

        # print waiting status
        msg = (
            f"Evals not complete, waiting {round(retry_state.upcoming_sleep)} "
            + "seconds before retrying...\n"
        )
        if display_type_plain():
            display_manager().print(msg)
        else:
            nonlocal status
            console.print("")
            status = console.status(status_msg(msg), spinner="clock")
            status.start()

    def before(retry_state: RetryCallState) -> None:
        # clear waiting status
        nonlocal status
        if status is not None:
            status.stop()
            status = None

    # function which will be called repeatedly to attempt to complete
    # the evaluations. for this purpose we will divide tasks into:
    #   - tasks with no log at all (they'll be attempted for the first time)
    #   - tasks with a successful log (they'll just be returned)
    #   - tasks with failed logs (they'll be retried)
    def try_eval() -> list[EvalLog]:
        config = GenerateConfig(**kwargs)
        # resolve tasks
        resolved_tasks, _ = eval_resolve_tasks(
            tasks,
            task_args,
            models,
            model_roles,
            config,
            approval,
            sandbox,
            sample_shuffle,
        )

        # list all logs currently in the log directory (update manifest if there are some)
        all_logs = list_all_eval_logs(log_dir)
        if len(all_logs) > 0:
            write_log_dir_manifest(log_dir)

        eval_set_args = EvalSetArgsInTaskIdentifier(
            config=config,
            solver=solver,
            message_limit=message_limit,
            token_limit=token_limit,
            time_limit=time_limit,
            working_limit=working_limit,
            cost_limit=cost_limit,
        )
        # validate that:
        #  (1) All tasks have a unique identifier
        #  (2) All logs have identifiers that map to tasks
        all_logs = validate_eval_set_prerequisites(
            resolved_tasks, all_logs, log_dir_allow_dirty, eval_set_args
        )

        # write eval-set info containing data about
        # all the tasks that are a part of this eval set
        # (include all tasks, not just tasks that need to be
        # run in this pass)
        write_eval_set_info(
            eval_set_id, log_dir, resolved_tasks, all_logs, eval_set_args
        )

        # see which tasks are yet to run (to complete successfully we need
        # a successful eval for every [task_file/]task_name/model combination)
        # for those that haven't run, schedule them into models => tasks groups
        # (exclude logs where sample_shuffle changed with a limit -- a different
        # shuffle selects a different subset of samples so the log can't be reused)
        reusable_logs = [
            log
            for log in all_logs
            if not shuffle_changed(sample_shuffle, log.header.eval.config, limit)
        ]
        log_task_identifiers = [log.task_identifier for log in reusable_logs]
        all_tasks = [
            (task_identifier(task, eval_set_args), task) for task in resolved_tasks
        ]
        pending_tasks = [
            task[1] for task in all_tasks if task[0] not in log_task_identifiers
        ]
        tasks_to_run: (
            list[ResolvedTask | PreviousTask] | list[ResolvedTask] | list[PreviousTask]
        )
        if len(pending_tasks) == len(all_tasks):
            tasks_to_run = pending_tasks
            success_logs: list[Log] = []
        else:
            # look for retryable eval logs and cleave them into success/failed
            success_logs, failed_logs = list_latest_eval_logs(
                all_tasks,
                all_logs,
                epochs=epochs,
                limit=limit,
                cleanup_older=retry_cleanup,
            )
            if not failed_logs:
                failed_tasks = []
            else:
                failed_task_identifiers = [log.task_identifier for log in failed_logs]
                failed_resolved_tasks = [
                    task
                    for task in resolved_tasks
                    if task_identifier(task, eval_set_args) in failed_task_identifiers
                ]
                failed_tasks = as_previous_tasks(
                    failed_resolved_tasks, failed_logs, eval_set_args
                )
            tasks_to_run = pending_tasks + failed_tasks
            if not tasks_to_run:
                # no new tasks and no failed logs to retry, just return success logs
                return [log.header for log in success_logs]

        # run the tasks
        run_logs = run_eval(eval_set_id, tasks_to_run)

        # if this was the entire list of resolved tasks, return results
        if len(tasks_to_run) == len(all_tasks):
            return run_logs
        # otherwise combine the successful logs with the newly run logs
        else:
            return [log.header for log in success_logs] + run_logs

    # create retry policy
    retry = Retrying(
        retry=retry_if_not_result(all_evals_succeeded),
        retry_error_callback=return_last_value,
        reraise=True,
        stop=stop_after_attempt(10 if retry_attempts is None else retry_attempts),
        wait=wait_exponential(retry_wait or 30, max=(60 * 60)),
        before_sleep=before_sleep,
        before=before,
    )

    with _embed_viewer(log_dir) if embed_viewer else contextlib.nullcontext():
        # emit start event
        run_coroutine(emit_eval_set_start(eval_set_id, log_dir))

        # execute w/ retry
        results = retry(try_eval)

        # final sweep to remove failed log files
        if retry_cleanup:
            task_ids = {result.eval.task_id for result in results}
            cleanup_older_eval_logs(log_dir, task_ids)

    # if specified, bundle the output directory
    if bundle_dir:
        bundle_log_dir(
            log_dir=log_dir, output_dir=bundle_dir, overwrite=bundle_overwrite
        )

    # report final status
    success = all_evals_succeeded(results)
    if success:
        msg = status_msg(f"Completed all tasks in '{log_dir}' successfully")
    else:
        msg = status_msg(f"Did not successfully complete all tasks in '{log_dir}'.")
    console.print(f"{msg}")

    # update manifest
    write_log_dir_manifest(log_dir)

    # emit end event
    run_coroutine(emit_eval_set_end(eval_set_id, log_dir))

    # return status + results
    return success, results


@contextlib.contextmanager
def _embed_viewer(log_dir: str, interval: float = 30) -> Iterator[None]:
    embed_log_dir(log_dir=log_dir)

    stop_event = threading.Event()
    last_state: frozenset[tuple[str, float | None]] = frozenset()

    def update_listing() -> None:
        nonlocal last_state
        while not stop_event.wait(interval):
            try:
                logs = list_eval_logs(log_dir)
                current_state = frozenset((log.name, log.mtime) for log in logs)
                if current_state != last_state:
                    write_log_listing(log_dir, logs=logs)
                    last_state = current_state
            except Exception:
                pass

    threading.Thread(target=update_listing, daemon=True, name="listing-updater").start()
    try:
        yield
    finally:
        stop_event.set()
        write_log_listing(log_dir)


def eval_set_id_for_log_dir(log_dir: str, eval_set_id: str | None = None) -> str:
    EVAL_SET_ID_FILE = ".eval-set-id"
    fs = filesystem(log_dir)
    eval_set_id_file = f"{log_dir}{fs.sep}{EVAL_SET_ID_FILE}"
    if fs.exists(eval_set_id_file):
        with file(eval_set_id_file, "r") as f:
            eval_set_id_existing = f.read().strip()
            if eval_set_id and eval_set_id != eval_set_id_existing:
                raise PrerequisiteError(
                    f"[bold]ERROR[/bold]: The eval set ID '{eval_set_id}' is not the same as the existing eval set ID '{eval_set_id_existing}'."
                )
            return eval_set_id_existing

    if not eval_set_id:
        eval_set_id = uuid()
    with file(eval_set_id_file, "w") as f:
        f.write(eval_set_id)
    return eval_set_id


# convert resolved tasks to previous tasks
def as_previous_tasks(
    tasks: list[ResolvedTask],
    failed_logs: list[Log],
    eval_set_args: EvalSetArgsInTaskIdentifier,
) -> list[PreviousTask]:
    def task_to_failed_log(task: ResolvedTask) -> Log:
        resolved_task_identifier = task_identifier(task, eval_set_args)
        return next(
            log
            for log in failed_logs
            if log.task_identifier == resolved_task_identifier
        )

    previous_tasks: list[PreviousTask] = []
    for task, log in zip(tasks, map(task_to_failed_log, tasks)):
        previous_tasks.append(
            PreviousTask(
                id=log.header.eval.task_id,
                task=task.task,
                task_args=resolve_task_args(task.task),
                model=task.model,
                model_roles=task.model_roles,
                log=log.header,
                log_info=log.info,
            )
        )

    return previous_tasks


# filters to determine when we are done


def all_evals_succeeded(logs: list[EvalLog]) -> bool:
    return all([log.status == "success" and not log.invalidated for log in logs])


# filter for determining when we are done
def evals_cancelled(logs: list[EvalLog]) -> bool:
    return any([log.status == "cancelled" for log in logs])


# return last value if we get to the end
def return_last_value(retry_state: RetryCallState) -> list[EvalLog]:
    if retry_state.outcome:
        return cast(list[EvalLog], retry_state.outcome.result())
    else:
        return []


# list all eval logs
# recursive=False and progress are used by inspect_flow
def list_all_eval_logs(
    log_dir: str, recursive: bool = True, progress: ReadEvalLogsProgress | None = None
) -> list[Log]:
    log_files = list_eval_logs(log_dir, recursive=recursive)
    log_headers = read_eval_log_headers(log_files, progress)
    task_identifiers = [task_identifier(log_header, None) for log_header in log_headers]
    return [
        Log(info=info, header=header, task_identifier=task_identifier)
        for info, header, task_identifier in zip(
            log_files, log_headers, task_identifiers
        )
    ]


# get the latest logs (cleaning if requested). returns tuple of successful/unsuccessful
def list_latest_eval_logs(
    all_tasks: list[tuple[str, ResolvedTask]],
    logs: list[Log],
    epochs: int | Epochs | None,
    limit: int | tuple[int, int] | None,
    cleanup_older: bool,
) -> tuple[list[Log], list[Log]]:
    latest_logs = latest_completed_task_eval_logs(
        logs=logs, cleanup_older=cleanup_older
    )

    # resolve epochs
    epochs = resolve_epochs(epochs)

    # figure out which logs still need work
    complete_logs: list[Log] = []
    incomplete_logs: list[Log] = []
    for log in latest_logs:
        if epochs_changed(epochs, log.header.eval.config):
            incomplete_logs.append(log)
        elif log.header.status != "success":
            incomplete_logs.append(log)
        elif log.header.invalidated:
            incomplete_logs.append(log)
        elif not log_samples_complete(log, all_tasks, epochs=epochs, limit=limit):
            incomplete_logs.append(log)
        else:
            complete_logs.append(log)

    return (complete_logs, incomplete_logs)


def log_samples_complete(
    log: Log,
    all_tasks: list[tuple[str, ResolvedTask]],
    epochs: Epochs | None,
    limit: int | tuple[int, int] | None,
) -> bool:
    if not log.header.results:
        return False
    id = task_identifier(log.header, None)
    task = next((task for tid, task in all_tasks if tid == id), None)
    if not task:
        # This should not happen since we have already validated prerequisites
        raise PrerequisiteError(
            f"[bold]ERROR[/bold]: Could not find task for log '{log.header.location}'."
        )
    epochs = epochs or resolve_epochs(task.task.epochs or 1)
    if epochs_changed(epochs, log.header.eval.config):
        return False
    epoch_count = epochs.epochs if epochs else 1

    count = len(task.task.dataset)
    if isinstance(limit, tuple):
        start, stop = limit
        if start >= count:
            count = 0
        else:
            count = min(stop, count) - start
    elif isinstance(limit, int):
        count = min(limit, count)

    if log.header.results.total_samples < count * epoch_count:
        return False
    return True


def shuffle_changed(
    sample_shuffle: bool | int | None,
    config: EvalConfig,
    limit: int | tuple[int, int] | None,
) -> bool:
    # shuffle only matters when there's a limit constraining which samples run
    if limit is None:
        return False
    return sample_shuffle != config.sample_shuffle


def epochs_changed(epochs: Epochs | None, config: EvalConfig) -> bool:
    # user didn't say anything about epochs on subsequent call (not changed)
    if epochs is None:
        return False
    # user did specify epochs and previous call had no epochs config (changed)
    elif config.epochs is None:
        return True
    # number of epochs differs (changed)
    elif epochs.epochs != config.epochs:
        return True
    # default to mean reducer should match (not changed)
    if epochs.reducer is None and config.epochs_reducer == ["mean"]:
        return False
    # different reducer list (changed)
    elif [reducer_log_name(r) for r in (epochs.reducer or [])] != [
        r for r in (config.epochs_reducer or [])
    ]:
        return True
    # fall through (not changed)
    else:
        return False


# cleanup logs that aren't the latest
def cleanup_older_eval_logs(log_dir: str, task_ids: set[str]) -> None:
    logs = [
        log
        for log in list_all_eval_logs(log_dir)
        if log.header.eval.task_id in task_ids
    ]
    latest_completed_task_eval_logs(logs=logs, cleanup_older=True)


def latest_completed_task_eval_logs(
    logs: list[Log], cleanup_older: bool = False
) -> list[Log]:
    # collect logs by id
    logs_by_id: dict[str, list[Log]] = {}
    for log in logs:
        id = log.header.eval.task_id
        if id not in logs_by_id:
            logs_by_id[id] = []
        logs_by_id[id].append(log)

    # take the most recent completed log for each id
    latest_completed_logs: list[Log] = []
    for id, id_logs in logs_by_id.items():
        # continue if there are no target logs
        if len(id_logs) == 0:
            continue

        # sort by last file write time
        id_logs.sort(
            key=lambda id_log: (id_log[0].mtime if id_log[0].mtime else 0), reverse=True
        )

        # take the most recent
        latest_completed_logs.append(id_logs[0])

        # remove the rest if requested
        # (don't remove 'started' in case its needed for post-mortum debugging)
        if cleanup_older:
            fs = filesystem(id_logs[0][0].name)
            for id_log in id_logs[1:]:
                try:
                    if id_log.header.status != "started":
                        fs.rm(id_log.info.name)
                except Exception as ex:
                    logger.warning(f"Error attempt to remove '{id_log[0].name}': {ex}")

    return latest_completed_logs


# ensure that preconditions for eval_set are met:
#  (1) all tasks have unique identfiers (so we can pair task -> log file)
#  (2) all log files have identifiers that map to tasks (so we know we
#      are running in a log dir created for this eval_set)
def validate_eval_set_prerequisites(
    resolved_tasks: list[ResolvedTask],
    all_logs: list[Log],
    log_dir_allow_dirty: bool,
    eval_set_args: EvalSetArgsInTaskIdentifier,
) -> list[Log]:
    # do all resolved tasks have unique identfiers?
    task_identifiers: Set[str] = set()
    for task in resolved_tasks:
        identifier = task_identifier(task, eval_set_args)
        if identifier in task_identifiers:
            raise PrerequisiteError(
                f"[bold]ERROR[/bold]: The task '{task.task.name}' is not distinct.\n\nTasks in an eval_set must have distinct names OR use the @task decorator and have distinct combinations of name and task args. Solvers passed to tasks should also use the @solver decorator."
            )
        else:
            task_identifiers.add(identifier)

    # do all logs in the log directory correspond to task identifiers?
    if log_dir_allow_dirty:
        return [log for log in all_logs if log.task_identifier in task_identifiers]
    else:
        for log in all_logs:
            if log.task_identifier not in task_identifiers:
                raise PrerequisiteError(
                    f"[bold]ERROR[/bold]: Existing log file '{basename(log.info.name)}' in log_dir is not "
                    + "associated with a task passed to eval_set (you must run eval_set "
                    + "in a fresh log directory). You can use the `--log-dir-allow-dirty` option to allow "
                    + "logs from other eval sets to be present in the log directory."
                )
        return all_logs


# these generate config fields should not affect task identity
_GENERATE_CONFIG_FIELDS_TO_EXCLUDE = {
    "max_retries",
    "timeout",
    "attempt_timeout",
    "max_connections",
    "batch",
}


def resolve_solver(
    solver: Solver | SolverSpec | Agent | list[Solver] | None,
) -> Solver | None:
    # resolve solver
    if isinstance(solver, list):
        return chain(solver)
    elif is_agent(solver):
        return as_solver(solver)
    elif isinstance(solver, SolverSpec):
        return solver_from_spec(solver)
    else:
        return cast(Solver | None, solver)


# Version of the task_identifier computation. Bump this when the task_identifier
# logic changes, so that persisted identifiers (e.g. in inspect_flow) can be
# recomputed.
TASK_IDENTIFIER_VERSION = 1


# yield a unique identifier for a task (used to pair resolved tasks to log files)
def task_identifier(
    task: ResolvedTask | EvalLog,
    eval_set_args: EvalSetArgsInTaskIdentifier | None,
) -> str:
    @dataclass
    class AdditionalHashFields:
        model_args: dict[str, Any]
        version: int | str
        message_limit: int | None
        token_limit: int | None
        time_limit: int | None
        working_limit: int | None
        cost_limit: float | None

    if isinstance(task, ResolvedTask):
        assert eval_set_args is not None, (
            "eval_set_args must be provided for ResolvedTask"
        )
        solver = resolve_solver(eval_set_args.solver)

        task_file = task.task_file or ""
        task_name = task.task.name
        task_args = task.task_args
        model = str(task.model)
        model_generate_config = task.model.config
        model_roles = model_roles_to_model_roles_config(task.model_roles) or {}
        plan = resolve_plan(task.task, solver)
        eval_plan = plan_to_eval_plan(
            plan, task.task.config.merge(eval_set_args.config)
        )
        additional_hash_fields = AdditionalHashFields(
            model_args=model_args_for_log(task.model.model_args),
            version=task.task.version,
            message_limit=task.task.message_limit
            if eval_set_args.message_limit is None
            else eval_set_args.message_limit,
            token_limit=task.task.token_limit
            if eval_set_args.token_limit is None
            else eval_set_args.token_limit,
            time_limit=task.task.time_limit
            if eval_set_args.time_limit is None
            else eval_set_args.time_limit,
            working_limit=task.task.working_limit
            if eval_set_args.working_limit is None
            else eval_set_args.working_limit,
            cost_limit=task.task.cost_limit
            if eval_set_args.cost_limit is None
            else eval_set_args.cost_limit,
        )
    else:
        task_file = task.eval.task_file or ""
        task_name = task.eval.task
        task_args = task.eval.task_args_passed
        model = str(task.eval.model)
        model_generate_config = task.eval.model_generate_config
        model_roles = task.eval.model_roles or {}
        eval_plan = task.plan
        additional_hash_fields = AdditionalHashFields(
            model_args=task.eval.model_args,
            version=task.eval.task_version,
            message_limit=task.eval.config.message_limit,
            token_limit=task.eval.config.token_limit,
            time_limit=task.eval.config.time_limit,
            working_limit=task.eval.config.working_limit,
            cost_limit=task.eval.config.cost_limit,
        )

    # strip args from eval_plan as we've changed the way this is serialized
    # and we want to be compatible with older logs. this effectively uses
    # 'params_passed' as the basis of comparison as opposed to 'params' which
    # in newer logs includes the fully resolve params
    eval_plan = eval_plan.model_copy(
        update={
            "finish": None,
            "steps": [
                step.model_copy(update={"params": None}) for step in eval_plan.steps
            ],
        }
    )

    # hash for task args
    task_args_hash = hashlib.sha256(
        to_json(task_args, exclude_none=True, fallback=lambda _x: None)
    ).hexdigest()

    # hash for eval plan
    additional_hash_input = to_json_safe(
        eval_plan,
        exclude={"config": _GENERATE_CONFIG_FIELDS_TO_EXCLUDE},
    )

    # hash for model generate config
    additional_hash_input += to_json_safe(
        model_generate_config,
        exclude=_GENERATE_CONFIG_FIELDS_TO_EXCLUDE,
    )

    # hash for model roles
    if len(model_roles):
        additional_hash_input += to_json_safe(model_roles)

    additional_hash_input += to_json_safe(additional_hash_fields)

    additional_hash = hashlib.sha256(additional_hash_input).hexdigest()

    if task_file:
        return f"{task_file}@{task_name}#{task_args_hash}/{model}/{additional_hash}"
    else:
        return f"{task_name}#{task_args_hash}/{model}/{additional_hash}"


class ModelList:
    def __init__(self, models: list[Model]) -> None:
        self.models = models

    def __hash__(self) -> int:
        # Hash based on the result of the key function
        return hash(self._key())

    def __eq__(self, other: object) -> bool:
        # Compare based on the result of the key function
        if not isinstance(other, ModelList):
            return False
        return self._key() == other._key()

    def __str__(self) -> str:
        return ",".join([str(model) for model in self.models])

    def _key(self) -> str:
        model_names = [str(model) for model in self.models]
        model_names.sort()
        return ",".join(model_names)


def starting_max_connections(models: list[Model], config: GenerateConfig) -> int:
    # if there is an explicit config use that
    if config.max_connections is not None:
        return config.max_connections

    # else take the smallest model max connections
    else:
        return min(
            models, key=lambda model: model.api.max_connections()
        ).api.max_connections()


def status_msg(msg: str) -> str:
    STATUS_FMT = "blue bold"
    return f"[{STATUS_FMT}]{msg}[/{STATUS_FMT}]"


class EvalSetTask(BaseModel):
    name: str | None = None
    task_id: str
    task_file: str | None = None
    task_args: dict[str, Any]
    model: str
    model_args: dict[str, Any]
    model_roles: dict[str, str] | None = None
    sequence: int


class EvalSet(BaseModel):
    eval_set_id: str
    tasks: list[EvalSetTask]


def to_eval_set_task(
    task: ResolvedTask,
    all_logs: list[Log],
    eval_set_args: EvalSetArgsInTaskIdentifier,
) -> EvalSetTask:
    # resolve core model info
    model_name = str(ModelName(task.model))
    model_args = task.model.model_args

    # resolve model roles to names
    model_roles = (
        {k: v.name for k, v in task.model_roles.items()} if task.model_roles else None
    )

    # see if there an existing task_id that should be used for this
    eval_set_identifier = task_identifier(task, eval_set_args)
    previous_task_ids = [
        log.info.task_id
        for log in all_logs
        if log.task_identifier == eval_set_identifier
    ]

    # Use the existing task_id, if there is one
    existing_task_id = None
    if len(previous_task_ids) > 0:
        existing_task_id = previous_task_ids[0]

    return EvalSetTask(
        name=task.task.name,
        task_id=existing_task_id or task.id or eval_set_identifier,
        task_file=task.task_file,
        task_args=task.task_args,
        model=model_name,
        model_args=model_args,
        model_roles=model_roles,
        sequence=task.sequence or 0,
    )


def to_eval_set(
    id: str,
    tasks: list[ResolvedTask],
    all_logs: list[Log],
    eval_set_args: EvalSetArgsInTaskIdentifier,
) -> EvalSet:
    return EvalSet(
        eval_set_id=id,
        tasks=[to_eval_set_task(task, all_logs, eval_set_args) for task in tasks],
    )


def write_eval_set_info(
    eval_set_id: str,
    log_dir: str,
    tasks: list[ResolvedTask],
    all_logs: list[Log],
    eval_set_args: EvalSetArgsInTaskIdentifier,
    fs_options: dict[str, Any] = {},
) -> None:
    # resolve log dir to full path
    fs = filesystem(log_dir)
    log_dir = _resolve_log_dir(fs, log_dir)

    # get info
    eval_set_info = to_eval_set(eval_set_id, tasks, all_logs, eval_set_args)

    # form target path and write
    manifest = f"{log_dir}{fs.sep}eval-set.json"
    eval_set_json = to_json_safe(eval_set_info)
    with file(manifest, mode="wb", fs_options=fs_options) as f:
        f.write(eval_set_json)


def read_eval_set_info(log_dir: str, fs_options: dict[str, Any] = {}) -> EvalSet | None:
    # resolve log dir to full path
    fs = filesystem(log_dir)
    log_dir = _resolve_log_dir(fs, log_dir)

    # form target path and read
    manifest = f"{log_dir}{fs.sep}eval-set.json"
    exists = _manifest_exists(fs, manifest)

    if not exists:
        return None

    eval_set_json = _read_manifest_bytes(manifest, fs_options)
    if eval_set_json is None:
        return None

    # parse and return
    return EvalSet.model_validate_json(eval_set_json)


def _resolve_log_dir(fs: FileSystem, log_dir: str) -> str:
    return call_with_azure_auth_fallback(
        lambda: fs.info(log_dir).name, fallback_return_value=log_dir
    )


def _read_manifest_bytes(manifest: str, fs_options: dict[str, Any]) -> bytes | None:
    def _read_manifest_bytes_strict() -> bytes:
        with file(manifest, mode="rb", fs_options=fs_options) as f:
            return f.read()

    return call_with_azure_auth_fallback(
        _read_manifest_bytes_strict, fallback_return_value=None
    )


def _manifest_exists(fs: FileSystem, path: str) -> bool:
    return call_with_azure_auth_fallback(
        lambda: fs.exists(path), fallback_return_value=False
    )
```

## `_eval/list.py`

```python
import os
import re
from logging import getLogger
from pathlib import Path
from typing import Callable

from inspect_ai._util.decorator import parse_decorators

from .task import TaskInfo

logger = getLogger(__name__)


def list_tasks(
    globs: str | list[str] = [],
    absolute: bool = False,
    root_dir: Path = Path.cwd(),
    filter: Callable[[TaskInfo], bool] | None = None,
) -> list[TaskInfo]:
    """List the tasks located at the specified locations.

    Args:
        globs (str | list[str]): File location(s). Can be
           globs (e.g. have bash-style wildcards).
        absolute (bool): Return absolute paths (defaults
           to False)
        root_dir (Path): Base directory to scan from
           (defaults to current working directory)
        filter (Callable[[TaskInfo], bool] | None):
           Filtering function.

    Returns:
        List of TaskInfo
    """
    # resolve globs
    globs = globs if isinstance(globs, list) else [globs]

    # build list of tasks to return
    tasks: list[TaskInfo] = []
    files = task_files(globs, root_dir)
    for task_file in files:
        tasks.extend(parse_tasks(task_file, root_dir, absolute))

    # filter if necessary
    tasks = [task for task in tasks if filter is None or filter(task)]

    # return sorted
    return sorted(tasks, key=lambda t: f"{t.file}@{t.name}")


def task_files(globs: list[str] = [], root_dir: Path | None = None) -> list[Path]:
    # root dir
    root_dir = root_dir if root_dir else Path.cwd()

    # no globs is cwds
    if len(globs) == 0:
        return tasks_in_dir(root_dir)

    # resolve the first level of globs
    paths: list[Path] = []
    for glob in globs:
        # we will have matched a set of directories and files
        # (depending on how the user wrote the globs). for
        # each file, add it to to our list if its a task file;
        # for each dir, recursively search it for task files
        expanded = list(root_dir.glob(glob))
        for path in expanded:
            if path.is_dir():
                paths.extend(tasks_in_dir(path))
            elif is_task_path(path):
                paths.append(path)

    return [path.absolute() for path in paths]


def tasks_in_dir(path: Path) -> list[Path]:
    paths: list[Path] = []
    for dir, dirnames, filenames in os.walk(path):
        # compute dir_path
        dir_path = Path(dir)

        # remove dirs that start with . or _
        dirnames[:] = [
            dirname for dirname in dirnames if not is_task_path_excluded(dirname)
        ]

        # select files w/ the right extension
        for filename in filenames:
            file_path = dir_path / filename
            if is_task_path(file_path):
                paths.append(file_path)

    return paths


excluded_pattern = re.compile("^[_\\.].*$")


def is_task_path_excluded(path: str) -> bool:
    return (
        re.match(excluded_pattern, path) is not None
        or path == "env"
        or path == "venv"
        or path == "tests"
    )


def is_task_path(path: Path) -> bool:
    return (
        path.suffix == ".py" or path.suffix == ".ipynb"
    ) and not is_task_path_excluded(path.name)


def parse_tasks(path: Path, root_dir: Path, absolute: bool) -> list[TaskInfo]:
    task_decorators = parse_decorators(path, "task")
    return [
        TaskInfo(
            file=task_path(path, root_dir, absolute),
            name=decorator[0],
            attribs=decorator[1],
        )
        for decorator in task_decorators
    ]


# manage relative vs. absolute paths
def task_path(path: Path, root_dir: Path, absolute: bool) -> str:
    if absolute:
        return path.resolve().as_posix()
    else:
        return path.relative_to(root_dir.resolve()).as_posix()
```

## `_eval/loader.py`

```python
import ast
import contextlib
import inspect
import os
from dataclasses import replace
from logging import getLogger
from pathlib import Path
from typing import Any, Callable, Tuple, cast

from shortuuid import uuid

from inspect_ai._eval.task.resolved import ResolvedTask
from inspect_ai._eval.task.util import split_spec, task_file, task_run_dir
from inspect_ai._util.decorator import parse_decorators
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.logger import warn_once
from inspect_ai._util.module import load_module
from inspect_ai._util.path import chdir_python, cwd_relative_path
from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_create,
    registry_info,
    registry_lookup,
    registry_params,
)
from inspect_ai.agent._as_solver import as_solver
from inspect_ai.model import Model
from inspect_ai.scorer._metric import Metric, MetricSpec, metric_create
from inspect_ai.scorer._scorer import Scorer, ScorerSpec, scorer_create
from inspect_ai.solver._bridge import bridge
from inspect_ai.solver._constants import SOLVER_ALL_PARAMS_ATTR
from inspect_ai.solver._solver import Solver, SolverSpec
from inspect_ai.util import SandboxEnvironmentSpec, SandboxEnvironmentType
from inspect_ai.util._sandbox.compose import (
    is_docker_compatible_config,
    is_docker_compatible_sandbox_type,
)
from inspect_ai.util._sandbox.environment import (
    resolve_sandbox_environment,
)
from inspect_ai.util._sandbox.registry import registry_find_sandboxenv

from .list import task_files
from .registry import task_create
from .task import PreviousTask, Task, TaskInfo
from .task.constants import TASK_FILE_ATTR, TASK_RUN_DIR_ATTR
from .task.hf import task_create_from_hf
from .task.run import eval_log_sample_source
from .task.tasks import Tasks

logger = getLogger(__name__)


def _merge_model_roles(
    *roles_dicts: dict[str, Model] | None,
) -> dict[str, Model] | None:
    """Merge model_roles dicts with later dicts taking priority."""
    merged: dict[str, Model] = {}
    for d in roles_dicts:
        if d:
            merged.update(d)
    return merged or None


def resolve_tasks(
    tasks: Tasks,
    task_args: dict[str, Any],
    model: Model,
    model_roles: dict[str, Model] | None,
    sandbox: SandboxEnvironmentType | None,
    sample_shuffle: bool | int | None,
) -> list[ResolvedTask]:
    def as_resolved_tasks(tasks: list[Task]) -> list[ResolvedTask]:
        # shuffle data in tasks if requested
        if sample_shuffle:
            for task in tasks:
                if not task.dataset.shuffled:
                    task.dataset.shuffle(
                        None if sample_shuffle is True else sample_shuffle
                    )

        return [
            ResolvedTask(
                id=uuid(),
                task=task,
                task_args=resolve_task_args(task),
                task_file=task_file(task, relative=True),
                model=task.model or model,
                model_roles=_merge_model_roles(task.model_roles, model_roles),
                sandbox=resolve_task_sandbox(task, sandbox),
                sequence=sequence,
            )
            for sequence, task in enumerate(tasks)
        ]

    # reflect resolved tasks right back
    if isinstance(tasks, ResolvedTask):
        return [tasks]
    if isinstance(tasks, PreviousTask):
        tasks = [tasks]
    if isinstance(tasks, list) and isinstance(tasks[0], (ResolvedTask, PreviousTask)):
        tasks = cast(
            list[PreviousTask] | list[ResolvedTask] | list[ResolvedTask | PreviousTask],
            tasks,
        )
        return resolve_previous_tasks(
            tasks, sample_shuffle=sample_shuffle, model=model, model_roles=model_roles
        )

    # take empty lists out of play
    if isinstance(tasks, list) and len(tasks) == 0:
        return as_resolved_tasks(load_tasks(None, task_args))

    # simple cases of passing us Task objects
    if isinstance(tasks, Task):
        return as_resolved_tasks([tasks])
    elif isinstance(tasks, list) and isinstance(tasks[0], Task):
        return as_resolved_tasks(cast(list[Task], tasks))

    # convert TaskInfo to str
    if isinstance(tasks, TaskInfo):
        tasks = [tasks]
    if isinstance(tasks, list) and isinstance(tasks[0], TaskInfo):
        tasks = [f"{task.file}@{task.name}" for task in cast(list[TaskInfo], tasks)]

    # handle functions that return tasks (we get their registry name)
    if isinstance(tasks, list) and callable(tasks[0]):
        tasks = [registry_info(task).name for task in tasks]
    elif callable(tasks):
        tasks = [registry_info(tasks).name]

    # str to list[str]
    if isinstance(tasks, str):
        tasks = [tasks]

    # done! let's load the tasks
    return as_resolved_tasks(load_tasks(cast(list[str] | None, tasks), task_args))


def resolve_previous_tasks(
    tasks: list[ResolvedTask] | list[PreviousTask] | list[ResolvedTask | PreviousTask],
    sample_shuffle: bool | int | None,
    model: Model,
    model_roles: dict[str, Model] | None,
) -> list[ResolvedTask]:
    result = []
    for sequence, task in enumerate(tasks):
        if isinstance(task, ResolvedTask):
            sequenced_task = replace(task, sequence=sequence)
            result.append(sequenced_task)
        else:
            # for previous tasks, prefer recreating from the registry (so we have
            # a fresh instance) but also allow recycling of task instances for
            # fully dynamic tasks
            previous_task = task
            if isinstance(previous_task.task, Task):
                loaded_task_args = previous_task.task_args
                loaded_task = previous_task.task
            else:
                loaded_task_args = previous_task.task_args
                loaded_task = load_tasks([previous_task.task], loaded_task_args)[0]
            if sample_shuffle is not None:
                if not loaded_task.dataset.shuffled:
                    loaded_task.dataset.shuffle(
                        None if sample_shuffle is True else sample_shuffle
                    )
            result.append(
                resolve_previous_task(
                    loaded_task,
                    loaded_task_args,
                    model,
                    model_roles,
                    previous_task,
                    sequence,
                )
            )
    return result


def resolve_previous_task(
    loaded_task: Task,
    loaded_task_args: dict[str, Any],
    model: Model,
    model_roles: dict[str, Model] | None,
    previous_task: PreviousTask,
    sequence: int,
) -> ResolvedTask:
    return ResolvedTask(
        task=loaded_task,
        task_args=loaded_task_args,
        task_file=previous_task.log.eval.task_file,
        model=previous_task.model or loaded_task.model or model,
        model_roles=_merge_model_roles(
            model_roles, loaded_task.model_roles, previous_task.model_roles
        ),
        sandbox=resolve_task_file_sandbox(
            previous_task.log.eval.task_file, previous_task.log.eval.sandbox
        ),
        sequence=sequence,
        id=previous_task.id,
        sample_source=eval_log_sample_source(
            previous_task.log, previous_task.log_info, loaded_task.dataset
        ),
    )


def resolve_task_args(task: Task) -> dict[str, Any]:
    # was the task instantiated via the registry or a decorator?
    # if so then we can get the task_args from the registry.
    try:
        task_args = dict(registry_params(task))
        return task_args

    # if it wasn't instantiated via the registry or a decorator
    # then it will not be in the registy and not have formal
    # task args (as it was simply synthesized via ad-hoc code)
    except ValueError:
        return {}


def resolve_task_sandbox(
    task: Task, sandbox: SandboxEnvironmentType | None
) -> SandboxEnvironmentSpec | None:
    # do the resolution
    resolved_sandbox = resolve_sandbox_environment(sandbox) or task.sandbox

    # if we have a sandbox with no config, see if there are implcit
    # config files available for the provider
    if resolved_sandbox is not None:
        # look for default
        if resolved_sandbox.config is None:
            # get config files for this type
            sandboxenv_type = registry_find_sandboxenv(resolved_sandbox.type)
            config_files_fn = cast(
                Callable[..., list[str]], getattr(sandboxenv_type, "config_files")
            )
            config_files = config_files_fn()

            # probe for them in task src dir
            src_dir = task_run_dir(task)
            for config_file in config_files:
                config_file_path = os.path.join(src_dir, config_file)
                if os.path.isfile(config_file_path):
                    resolved_sandbox = SandboxEnvironmentSpec(
                        resolved_sandbox.type, config_file
                    )
                    break

            # if we found an override without a config then we may still
            # want to forward the task config if it's docker config ->
            # docker compatible sandbox
            if (
                resolved_sandbox.config is None
                and task.sandbox is not None
                and is_docker_compatible_config(task.sandbox.config)
                and is_docker_compatible_sandbox_type(resolved_sandbox.type)
            ):
                resolved_sandbox = SandboxEnvironmentSpec(
                    resolved_sandbox.type, task.sandbox.config
                )

        # resolve relative paths
        if isinstance(resolved_sandbox.config, str):
            file_path = Path(resolved_sandbox.config)
            if not file_path.is_absolute():
                file_path = Path(task_run_dir(task)) / file_path
                resolved_sandbox = SandboxEnvironmentSpec(
                    resolved_sandbox.type, file_path.as_posix()
                )

    # return resolved sandbox
    return resolved_sandbox


def resolve_task_file_sandbox(
    task_file: str | None, sandbox: SandboxEnvironmentSpec | None
) -> SandboxEnvironmentSpec | None:
    if sandbox is None or not isinstance(sandbox.config, str):
        return sandbox

    if task_file is None:
        return sandbox

    file_path = Path(sandbox.config)
    if file_path.is_absolute():
        return sandbox

    # resolve relative sandbox config paths from logged task file location
    src_dir = Path(task_file).parent
    file_path = (src_dir / file_path).resolve()
    return SandboxEnvironmentSpec(sandbox.type, file_path.as_posix())


def load_tasks(
    task_specs: list[str] | None, task_args: dict[str, Any] = {}
) -> list[Task]:
    """Load one more more tasks (if no tasks are specified, load from the current working directory"""
    # load tasks
    return [
        spec
        for task_spec in (task_specs if task_specs else [Path.cwd().as_posix()])
        for spec in load_task_spec(task_spec, task_args)
    ]


def load_task_spec(task_spec: str, task_args: dict[str, Any] = {}) -> list[Task]:
    # task in a python package
    if registry_lookup("task", task_spec) is not None:
        # create the task from a python package
        return [task_create(task_spec, **task_args)]
    elif task_spec.startswith("hf/"):
        # load task from huggingface
        return task_create_from_hf(task_spec, **task_args)
    else:
        # load tasks from glob
        return create_tasks([task_spec], task_args)


def create_tasks(
    globs: list[str],
    task_args: dict[str, Any] = {},
    root_dir: Path | None = None,
) -> list[Task]:
    tasks: list[Task] = []

    root_dir = root_dir if root_dir is not None else Path.cwd()

    for glob in globs:
        # sometimes globs are direct references to files
        # that include an @ index. for this case directly
        # create the task (we also need to load the file
        # so the task is registered before we create it)
        spec_split = split_spec(glob)
        if spec_split[1] is not None:
            task_path = Path(spec_split[0])
            load_file_tasks(task_path.absolute())
            tasks.extend(create_file_tasks(task_path, [spec_split[1]], task_args))
        else:
            # if the glob is the root dir then set it to empty (will result in
            # enumeration of the root dir)
            target = [] if Path(glob).resolve() == root_dir.resolve() else [glob]
            files = task_files(target, root_dir)
            files = sorted(files, key=lambda f: f.as_posix())
            for file in files:
                tasks.extend(create_file_tasks(file, None, task_args))
    return tasks


def load_file_tasks(file: Path) -> None:
    with chdir_python(file.parent.as_posix()):
        _load_task_specs(file)


def create_file_tasks(
    file: Path,
    task_specs: list[str] | list[RegistryInfo] | None = None,
    task_args: dict[str, Any] = {},
) -> list[Task]:
    run_dir = file.parent.resolve().as_posix()
    with chdir_python(file.parent.as_posix()):
        # if we don't have task specs then go get them (also,
        # turn them into plain names)
        if task_specs is None:
            task_specs = _load_task_specs(file)
        # convert to plain names
        task_specs = [
            spec if isinstance(spec, str) else spec.name for spec in task_specs
        ]

        tasks: list[Task] = []
        for task_spec in task_specs:
            # create the task from the loaded source file and
            # note that it was loaded from this directory
            # (will be used later to ensure it runs in the directory)
            task = task_create(task_spec, **task_args)
            setattr(task, TASK_FILE_ATTR, file.as_posix())
            setattr(task, TASK_RUN_DIR_ATTR, run_dir)
            tasks.append(task)

            # warn that chdir has been removed
            if "chdir" in task.attribs:
                warn_once(
                    logger,
                    "The 'chdir' task attribute is no longer supported "
                    + "(you should write your tasks to not depend on their runtime working directory)",
                )

        return tasks


# don't call this function directly, rather, call one of the
# higher level loading functions above (those functions
# change the working directory, this one does not b/c it is
# intended as a helper function)
def _load_task_specs(task_path: Path) -> list[str]:
    # load the module
    module = load_module(task_path, code_has_task)
    if module:
        # find the tasks in the module
        tasks = parse_decorators(task_path, "task")
        return [task[0] for task in tasks]
    else:
        return []


def code_has_decorator(code: str, decorator: str) -> bool:
    try:
        tree = ast.parse(code)
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.FunctionDef):
                for dec in node.decorator_list:
                    if isinstance(dec, ast.Name):
                        if str(dec.id) == decorator:
                            return True
                    elif (
                        isinstance(dec, ast.Call)
                        and isinstance(dec.func, ast.Name)
                        and str(dec.func.id) == decorator
                    ):
                        return True
    except SyntaxError:
        pass

    return False


def code_has_task(code: str) -> bool:
    return code_has_decorator(code, "task")


def as_solver_spec(solver: Solver) -> SolverSpec:
    if not is_registry_object(solver):
        raise PrerequisiteError(
            f"The solver {getattr(solver, '__name__', '<unknown>')} was not created by a function decorated with @solver so cannot be recorded."
        )
    return SolverSpec(
        solver=registry_info(solver).name,
        args=getattr(solver, SOLVER_ALL_PARAMS_ATTR, {}),
        args_passed=registry_params(solver),
    )


def solver_from_spec(spec: SolverSpec) -> Solver:
    # resolve @ reference
    solver_file, solver_name = parse_spec_str(spec.solver)

    # switch contexts if we are loading from a file
    create_cm = (
        chdir_python(solver_file.parent.as_posix())
        if solver_file is not None
        else contextlib.nullcontext()
    )

    # pretty solver name for error messages
    pretty_solver_file = (
        cwd_relative_path(solver_file.as_posix()) if solver_file else None
    )

    with create_cm:
        # if there is no solver file then just create from the registry by name
        if solver_file is None:
            if solver_name is None:
                raise ValueError(f"Unable to resolve solver name from {spec.solver}")
            elif registry_lookup("solver", solver_name) is not None:
                return registry_create("solver", solver_name, **spec.args_passed)
            elif registry_lookup("agent", solver_name) is not None:
                agent = registry_create("agent", solver_name, **spec.args_passed)
                return as_solver(agent)
            else:
                raise ValueError(
                    f"Unknown solver {solver_name} (not registered as a @solver or @agent)"
                )

        # we do have a solver file
        else:
            # load the module and parse decorators
            solver_module = load_module(solver_file)
            solver_decorators = parse_decorators(solver_file, "solver")
            agent_decorators = parse_decorators(solver_file, "agent")

            # if there is no solver_name see if we can discover it
            if solver_name is None:
                if len(solver_decorators) == 1:
                    # decorator based solver
                    solver_name = solver_decorators[0][0]
                elif len(agent_decorators) == 1:
                    # decorator based agent
                    solver_name = agent_decorators[0][0]
                elif len(solver_decorators) == 0 and len(agent_decorators) == 0:
                    # see if we can find an agent based solver
                    functions = [
                        function
                        for function in inspect.getmembers(
                            solver_module, inspect.isfunction
                        )
                        if function[1].__module__ == solver_module.__name__
                    ]
                    agent_functions = [
                        function
                        for function in functions
                        if "agent" in function[0] and not function[0].startswith("_")
                    ]
                    if len(agent_functions) == 1:
                        # agent based solver
                        solver_name = agent_functions[0][0]

                    elif len(agent_functions) == 0:
                        raise PrerequisiteError(
                            f"The source file {pretty_solver_file} does not contain any @solver, @agent or bridged agent functions."
                        )
                    else:
                        raise PrerequisiteError(
                            f"The source file {pretty_solver_file} has more than one bridged agent function (qualify which agent using e.g. '{solver_file.name}@agent_fn')"
                        )
                elif len(solver_decorators) > 1:
                    raise PrerequisiteError(
                        f"The source file {pretty_solver_file} has more than one @solver function (qualify which solver using e.g. '{solver_file.name}@solver_fn')"
                    )
                else:
                    raise PrerequisiteError(
                        f"The source file {pretty_solver_file} has more than one @agent function (qualify which agent using e.g. '{solver_file.name}@agent_fn')"
                    )

            # create decorator based solvers using the registry
            if any(solver[0] == solver_name for solver in solver_decorators):
                return registry_create("solver", solver_name, **spec.args_passed)

            # create decorator based agents using the registry
            elif any(agent[0] == solver_name for agent in agent_decorators):
                agent = registry_create("agent", solver_name, **spec.args_passed)
                return as_solver(agent)

            # create bridge based solvers by calling the function and wrapping it in bridge()
            else:
                agent_fn = getattr(solver_module, solver_name, None)
                if inspect.isfunction(agent_fn):
                    return bridge(agent_fn(**spec.args_passed))
                elif agent_fn is not None:
                    raise PrerequisiteError(
                        f"The object {solver_name} in file {pretty_solver_file} is not a Python function."
                    )
                else:
                    raise PrerequisiteError(
                        f"The function {solver_name} was not found in file {pretty_solver_file}."
                    )


def scorer_from_spec(spec: ScorerSpec, task_path: Path | None, **kwargs: Any) -> Scorer:
    """
    Load a scorer

    Args:
        spec: The scorer spec
        task_path: An optional path to the task file
        **kwargs: Additional keyword arguments passed to the scorer initialization

    Returns:
        Scorer: the loaded scorer

    Raises:
        PrerequisiteError: If the scorer cannot be found, loaded, or lacks required type annotations
    """
    # resolve @ reference
    scorer_file, scorer_name = parse_spec_str(spec.scorer)

    # switch contexts if we are loading from a file
    create_cm = (
        chdir_python(scorer_file.parent.as_posix())
        if scorer_file is not None
        else contextlib.nullcontext()
    )

    # pretty solver name for error messages
    pretty_scorer_file = (
        cwd_relative_path(scorer_file.as_posix()) if scorer_file else None
    )

    # See if the scorer doesn't have type annotations. Currently the registry will not load
    # the function without type annotations.
    # TODO: We could consider calling this ourselves if we're certain it is what we're looking for
    def validate_scorer(scorer_fn: Scorer, scorer_name: str, scorer_path: str) -> None:
        signature = inspect.signature(scorer_fn)
        if signature.return_annotation is inspect.Signature.empty:
            raise PrerequisiteError(
                f"The function '{scorer_name}' in the file '{scorer_path}' requires a return type annotation. Please add a return type annotation to use this function with scoring."
            )

    def create_scorer(scorer_name: str, **kwargs: Any) -> Scorer:
        # handle scorers and scanners
        if registry_lookup("scorer", scorer_name) is not None:
            return scorer_create(scorer_name, **kwargs)
        elif registry_lookup("scanner", scorer_name) is not None:
            from inspect_scout import Scanner, Transcript, as_scorer

            scanner = registry_create("scanner", scorer_name, **kwargs)
            return as_scorer(cast(Scanner[Transcript], scanner))
        else:
            raise ValueError(
                f"Unknown scorer {scorer_name} (not registered as a @scorrer or @scanner)"
            )

    with create_cm:
        # is there a scorer file being provided? if not, load from registry
        if scorer_file is None:
            if scorer_name is None:
                raise ValueError(f"Unable to resolve scorer name from {spec.scorer}")

            try:
                return scorer_create(scorer_name, **kwargs)
            except ValueError:
                # We need a valid path to a scorer file to try to load the scorer from there
                if not task_path:
                    raise PrerequisiteError(
                        f"The scorer '{scorer_name}' couldn't be loaded. Please provide a path to the file containing the scorer using the '--scorer' parameter"
                    )

                task_pretty_path = task_path.as_posix()
                if not task_path.exists():
                    raise PrerequisiteError(
                        f"The scorer `{scorer_name}` couldn't be loaded. The file '{task_pretty_path}' was not found. Please provide a path to the file containing the scorer using the '--scorer' parameter"
                    )

                # We have the path to a file, so load that and try again
                try:
                    load_module(task_path)
                    scorer_fn = create_scorer(scorer_name, **kwargs)
                    validate_scorer(scorer_fn, scorer_name, task_pretty_path)
                    return scorer_fn
                except ValueError:
                    # we still couldn't load this, request the user provide a path
                    raise PrerequisiteError(
                        f"The scorer '{scorer_name}' in the file '{task_pretty_path}' couldn't be loaded. Please provide a path to the file containing the scorer using the '--scorer' parameter."
                    )
                except ModuleNotFoundError:
                    # we still couldn't load this, request the user provide a path
                    raise PrerequisiteError(
                        f"The scorer '{scorer_name}' in the file '{task_pretty_path}' couldn't be loaded. Please provide a path to the file containing the scorer using the '--scorer' parameter."
                    )

        # solver is a path, so load it that way
        else:
            load_module(scorer_file)
            scorer_decorators = parse_decorators(scorer_file, "scorer")
            scanner_decorators = parse_decorators(scorer_file, "scanner")

            # if there is no scorer_name see if we can discover it
            if scorer_name is None:
                if len(scorer_decorators) == 1:
                    scorer_name = scorer_decorators[0][0]
                elif len(scanner_decorators) == 1:
                    scorer_name = scanner_decorators[0][0]
                elif len(scorer_decorators) == 0 and len(scanner_decorators) == 0:
                    raise PrerequisiteError(
                        f"The source file {pretty_scorer_file} does not contain any @scorer or @scanner functions."
                    )
                else:
                    raise PrerequisiteError(
                        f"The source file {pretty_scorer_file} has more than one @scorer or @scanner function (qualify which scorer using e.g. '{scorer_file.name}y@scorer_fn')"
                    )

            # create decorator based solvers using the registry
            if any(
                solver[0] == scorer_name
                for solver in (scorer_decorators + scanner_decorators)
            ):
                scorer_fn = create_scorer(scorer_name, **kwargs)
                validate_scorer(scorer_fn, scorer_name, pretty_scorer_file or "")
                return scorer_fn
            else:
                raise PrerequisiteError(
                    f"The function {scorer_name} was not found in file {pretty_scorer_file}."
                )


def metric_from_spec(spec: MetricSpec, **kwargs: Any) -> Metric:
    """
    Load a metric

    Args:
        spec: The metric spec
        **kwargs: Additional keyword arguments passed to the metric initialization

    Returns:
        Metric: the loaded metric

    Raises:
        PrerequisiteError: If the metric cannot be found or loaded
    """
    # resolve @ reference
    metric_file, metric_name = parse_spec_str(spec.metric)

    # switch contexts if we are loading from a file
    create_cm = (
        chdir_python(metric_file.parent.as_posix())
        if metric_file is not None
        else contextlib.nullcontext()
    )

    # pretty metric name for error messages
    pretty_metric_file = (
        cwd_relative_path(metric_file.as_posix()) if metric_file else None
    )

    with create_cm:
        # is there a metric file being provided? if not, load from registry
        if metric_file is None:
            if metric_name is None:
                raise ValueError(f"Unable to resolve metric name from {spec.metric}")

            return metric_create(metric_name, **kwargs)

        # metric is a path, so load it that way
        else:
            load_module(metric_file)
            metric_decorators = parse_decorators(metric_file, "metric")

            # if there is no metric_name see if we can discover it
            if metric_name is None:
                if len(metric_decorators) == 1:
                    metric_name = metric_decorators[0][0]
                elif len(metric_decorators) == 0:
                    raise PrerequisiteError(
                        f"The source file {pretty_metric_file} does not contain any @metric functions."
                    )
                else:
                    raise PrerequisiteError(
                        f"The source file {pretty_metric_file} has more than one @metric function (qualify which metric using e.g. '{metric_file.name}@metric_fn')"
                    )

            # create decorator based metrics using the registry
            if any(metric[0] == metric_name for metric in metric_decorators):
                return metric_create(metric_name, **kwargs)
            else:
                raise PrerequisiteError(
                    f"The function {metric_name} was not found in file {pretty_metric_file}."
                )


def parse_spec_str(spec_str: str) -> Tuple[Path | None, str | None]:
    spec_split = split_spec(spec_str)
    if spec_split[1] is not None:
        file: Path | None = Path(spec_split[0]).resolve()
        name: str | None = spec_split[1]
    elif Path(spec_split[0]).exists():
        file = Path(spec_split[0]).resolve()
        name = None
    else:
        file = None
        name = spec_split[0]
    return file, name
```

## `_eval/registry.py`

```python
import inspect
import logging
from functools import wraps
from pathlib import Path
from typing import Any, Callable, TypeVar, cast, overload

from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.package import get_installed_package_name
from inspect_ai._util.registry import (
    RegistryInfo,
    extract_named_params,
    registry_add,
    registry_create,
    registry_info,
    registry_lookup,
    registry_name,
    registry_tag,
)

from .task import Task
from .task.constants import TASK_ALL_PARAMS_ATTR, TASK_FILE_ATTR, TASK_RUN_DIR_ATTR

MODEL_PARAM = "model"

logger = logging.getLogger(__name__)


TaskType = TypeVar("TaskType", bound=Callable[..., Task])


def task_register(
    task: TaskType, name: str, attribs: dict[str, Any], params: list[str]
) -> TaskType:
    r"""Register a task.

    Args:
        task (TaskType):
            function that returns a Task or class
            deriving from Task
        name (str): Name of task
        attribs (dict[str,Any]): Attributes of task decorator
        params (list[str]): Task parameter names

    Returns:
        Task with registry attributes.
    """
    registry_add(
        task,
        RegistryInfo(
            type="task", name=name, metadata=dict(attribs=attribs, params=params)
        ),
    )
    return task


def task_create(name: str, **kwargs: Any) -> Task:
    r"""Create a Task based on its registered name.

    Tasks can be a function that returns a Task or a
    class deriving from Task.

    Args:
        name (str): Name of task (Optional, defaults to object name)
        **kwargs (dict): Optional creation arguments for the task

    Returns:
        Task with registry info attribute
    """
    # match kwargs params to signature (warn if param not found)
    # (note that we always pass the 'model' param but tasks aren't
    # required to consume it, so we don't warn for 'model')
    task = registry_lookup("task", name)
    if not task:
        raise PrerequisiteError(f"Task named '{name}' not found.")
    task_info = registry_info(task)
    task_params: list[str] = task_info.metadata["params"]
    task_args: dict[str, Any] = {}
    for param in kwargs.keys():
        if param in task_params or "kwargs" in task_params:
            task_args[param] = kwargs[param]
        else:
            logger.warning(f"param '{param}' not used by task '{name}'")

    return registry_create("task", name, **task_args)


@overload
def task(func: TaskType) -> TaskType: ...


@overload
def task(
    *, name: str | None = ..., **attribs: Any
) -> Callable[[TaskType], TaskType]: ...


def task(*args: Any, name: str | None = None, **attribs: Any) -> Any:
    r"""Decorator for registering tasks.

    Args:
      *args: Function returning `Task` targeted by
        plain task decorator without attributes (e.g. `@task`)
      name (str | None):
        Optional name for task. If the decorator has no name
        argument then the name of the function
        will be used to automatically assign a name.
      **attribs: (dict[str,Any]): Additional task attributes.

    Returns:
        Task with registry attributes.
    """

    def create_task_wrapper(task_type: TaskType) -> TaskType:
        # Get the name and parameters of the task
        task_name = registry_name(task_type, name or getattr(task_type, "__name__"))
        params = list(inspect.signature(task_type).parameters.keys())

        # Create and return the wrapper function
        @wraps(task_type)
        def wrapper(*w_args: Any, **w_kwargs: Any) -> Task:
            # Create the task
            task_instance = task_type(*w_args, **w_kwargs)

            # Tag the task with registry information
            registry_tag(
                task_type,
                task_instance,
                RegistryInfo(
                    type="task",
                    name=task_name,
                    metadata=dict(attribs=attribs, params=params),
                ),
                *w_args,
                **w_kwargs,
            )

            # extract all task parameters including defaults
            named_params = extract_named_params(task_type, True, *w_args, **w_kwargs)
            setattr(task_instance, TASK_ALL_PARAMS_ATTR, named_params)

            # if its not from an installed package then it is a "local"
            # module import, so set its task file and run dir
            if get_installed_package_name(task_type) is None:
                module = inspect.getmodule(task_type)
                if module and hasattr(module, "__file__") and module.__file__:
                    file = Path(getattr(module, "__file__"))
                    setattr(task_instance, TASK_FILE_ATTR, file.as_posix())
                    setattr(task_instance, TASK_RUN_DIR_ATTR, file.parent.as_posix())

            # Return the task instance
            return task_instance

        # functools.wraps overrides the return type annotation of the inner function, so
        # we explicitly set it again
        wrapper.__annotations__["return"] = Task

        # Register the task and return the wrapper
        return task_register(
            task=cast(TaskType, wrapper), name=task_name, attribs=attribs, params=params
        )

    if args:
        # The decorator was used without arguments: @task
        func = args[0]
        return create_task_wrapper(func)
    else:
        # The decorator was used with arguments: @task(name="foo")
        def decorator(func: TaskType) -> TaskType:
            return create_task_wrapper(func)

        return decorator
```

## `_eval/run.py`

```python
import logging
import os
import sys
from typing import Any, Awaitable, Callable, Set, cast

from inspect_ai._eval.task.constants import TASK_ALL_PARAMS_ATTR
from inspect_ai._eval.task.task import Task
from inspect_ai._util.environ import environ_vars
from inspect_ai._util.file import cleanup_s3_sessions
from inspect_ai._util.task import task_display_name
from inspect_ai._util.trace import trace_action
from inspect_ai.util._anyio import inner_exception

if sys.version_info < (3, 11):
    from exceptiongroup import ExceptionGroup

import anyio
from typing_extensions import Unpack

from inspect_ai._display import display
from inspect_ai._display.core.active import (
    clear_task_screen,
    init_task_screen,
)
from inspect_ai._display.core.display import TaskSpec
from inspect_ai._util.error import PrerequisiteError, exception_message
from inspect_ai._util.path import chdir
from inspect_ai.dataset._dataset import Dataset
from inspect_ai.log import EvalConfig, EvalLog
from inspect_ai.log._recorders import Recorder
from inspect_ai.model import GenerateConfigArgs
from inspect_ai.model._model import ModelName
from inspect_ai.scorer._metric import to_metric_specs
from inspect_ai.scorer._reducer import ScoreReducer, reducer_log_names
from inspect_ai.scorer._reducer.registry import validate_reducer
from inspect_ai.scorer._scorer import as_scorer_spec
from inspect_ai.solver._solver import Solver, SolverSpec
from inspect_ai.util._sandbox.environment import (
    SandboxEnvironmentConfigType,
    SandboxEnvironmentSpec,
    SandboxEnvironmentType,
    TaskCleanup,
    TaskInit,
    resolve_sandbox_environment,
)
from inspect_ai.util._sandbox.registry import registry_find_sandboxenv

from .loader import (
    as_solver_spec,
    solver_from_spec,
)
from .task.log import TaskLogger
from .task.resolved import ResolvedTask
from .task.run import TaskRunOptions, task_run
from .task.sandbox import TaskSandboxEnvironment, resolve_sandbox_for_task_and_sample
from .task.util import slice_dataset, task_run_dir

log = logging.getLogger(__name__)


async def eval_run(
    eval_set_id: str | None,
    run_id: str,
    tasks: list[ResolvedTask],
    parallel: int,
    eval_config: EvalConfig,
    eval_sandbox: SandboxEnvironmentType | None,
    recorder: Recorder,
    header_only: bool,
    epochs_reducer: list[ScoreReducer] | None = None,
    solver: Solver | SolverSpec | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    debug_errors: bool = False,
    run_samples: bool = True,
    score: bool = True,
    **kwargs: Unpack[GenerateConfigArgs],
) -> list[EvalLog]:
    # are sandboxes in play?
    has_sandbox = any(task.has_sandbox for task in tasks)

    # get cwd before any switching
    eval_wd = os.getcwd()

    # ensure sample ids
    task: Task | None = None
    for resolved_task in tasks:
        # add sample ids to dataset if they aren't there (start at 1 not 0)
        task = resolved_task.task
        for id, sample in enumerate(task.dataset):
            if sample.id is None:
                sample.id = id + 1

        # Ensure sample ids are unique
        ensure_unique_ids(task.dataset)

    assert task, "Must encounter a task"

    # run startup pass for the sandbox environments
    shutdown_sandbox_environments: Callable[[], Awaitable[None]] | None = None
    if has_sandbox and run_samples:
        cleanup = eval_config.sandbox_cleanup is not False
        shutdown_sandbox_environments = await startup_sandbox_environments(
            resolve_sandbox_environment(eval_sandbox), tasks, eval_config, cleanup
        )

    # resolve solver and solver spec
    if isinstance(solver, Solver):
        eval_solver = solver
        eval_solver_spec = as_solver_spec(solver)
    elif isinstance(solver, SolverSpec):
        eval_solver = solver_from_spec(solver)
        eval_solver_spec = solver
    else:
        eval_solver = None
        eval_solver_spec = None

    try:
        # create run tasks
        task_run_options: list[TaskRunOptions] = []
        for resolved_task in tasks:
            with chdir(task_run_dir(resolved_task.task)):
                # tasks can provide their epochs, message_limit,
                # token_limit, time_limit, and fail_on_error so broadcast these
                # into the eval config (so long as they aren't overriding a
                # value specified from eval() or the CLI)
                task = resolved_task.task
                task_eval_config = eval_config.model_copy()

                # sample_ids can be specified per task
                task_eval_config.sample_id = resolve_task_sample_ids(
                    resolved_task.task.name, task_eval_config.sample_id
                )

                # resolve the task scorers
                eval_scorer_specs = (
                    [as_scorer_spec(scorer) for scorer in task.scorer]
                    if task.scorer is not None
                    else None
                )

                # resolve task metrics
                eval_metrics = (
                    to_metric_specs(task.metrics) if task.metrics is not None else None
                )

                # epochs
                if task_eval_config.epochs is None:
                    task_eval_config.epochs = task.epochs
                else:
                    task.epochs = task_eval_config.epochs

                # epochs reducer
                if epochs_reducer is not None:
                    # override task (eval_config already reflects epochs_reducer)
                    task.epochs_reducer = epochs_reducer
                else:
                    # use task (eval_config needs to be updated to reflect task reducer)
                    task_eval_config.epochs_reducer = reducer_log_names(
                        task.epochs_reducer
                    )

                # validate task epochs
                if task.epochs and task.epochs_reducer:
                    for reducer in task.epochs_reducer:
                        validate_reducer(task.epochs, reducer)

                # sample message limit
                if task_eval_config.message_limit is None:
                    task_eval_config.message_limit = task.message_limit
                else:
                    task.message_limit = task_eval_config.message_limit

                # sample token limit
                if task_eval_config.token_limit is None:
                    task_eval_config.token_limit = task.token_limit
                else:
                    task.token_limit = task_eval_config.token_limit

                # sample time limit
                if task_eval_config.time_limit is None:
                    task_eval_config.time_limit = task.time_limit
                else:
                    task.time_limit = task_eval_config.time_limit

                # sample execution limit
                if task_eval_config.working_limit is None:
                    task_eval_config.working_limit = task.working_limit
                else:
                    task.working_limit = task_eval_config.working_limit

                # sample cost limit
                if task_eval_config.cost_limit is None:
                    task_eval_config.cost_limit = task.cost_limit
                else:
                    task.cost_limit = task_eval_config.cost_limit

                # fail_on_error
                if task_eval_config.fail_on_error is None:
                    task_eval_config.fail_on_error = task.fail_on_error
                else:
                    task.fail_on_error = task_eval_config.fail_on_error

                # continue_on_fail
                if task_eval_config.continue_on_fail is None:
                    task_eval_config.continue_on_fail = task.continue_on_fail
                else:
                    task.continue_on_fail = task_eval_config.continue_on_fail

                # merge eval-level and task-level tags
                merged_tags = list(set(tags or []) | set(task.tags or [])) or None

                # create and track the logger
                logger = TaskLogger(
                    task_name=task.name,
                    task_version=task.version,
                    task_file=resolved_task.task_file,
                    task_registry_name=resolved_task.task.registry_name,
                    task_display_name=resolved_task.task.display_name,
                    task_id=resolved_task.id,
                    eval_set_id=eval_set_id,
                    run_id=run_id,
                    solver=eval_solver_spec,
                    tags=merged_tags,
                    model=resolved_task.model,
                    model_roles=resolved_task.model_roles,
                    dataset=task.dataset,
                    scorer=eval_scorer_specs,
                    metrics=eval_metrics,
                    sandbox=resolved_task.sandbox,
                    task_attribs=task.attribs,
                    task_args=getattr(
                        task, TASK_ALL_PARAMS_ATTR, resolved_task.task_args
                    ),
                    task_args_passed=resolved_task.task_args,
                    model_args=resolved_task.model.model_args,
                    eval_config=task_eval_config,
                    metadata=((metadata or {}) | (task.metadata or {})) or None,
                    recorder=recorder,
                    header_only=header_only,
                )
                await logger.init()

                # append task
                task_run_options.append(
                    TaskRunOptions(
                        task=task,
                        model=resolved_task.model,
                        model_roles=resolved_task.model_roles,
                        sandbox=resolved_task.sandbox,
                        logger=logger,
                        eval_wd=eval_wd,
                        config=task_eval_config,
                        solver=eval_solver,
                        tags=merged_tags,
                        run_samples=run_samples,
                        score=score,
                        debug_errors=debug_errors,
                        sample_source=resolved_task.sample_source,
                        kwargs=kwargs,
                    )
                )

        # multiple mode is for running/displaying multiple
        # task definitions, which requires some smart scheduling
        # to ensure that we spread work among models
        if parallel > 1:
            return await run_multiple(task_run_options, parallel)
        else:
            return await run_single(task_run_options, debug_errors)

    finally:
        # shutdown sandbox environments
        if shutdown_sandbox_environments:
            try:
                await shutdown_sandbox_environments()
            except BaseException as ex:
                log.warning(
                    f"Error occurred shutting down sandbox environments: {exception_message(ex)}"
                )

        # clean up cached S3 sessions to prevent "Unclosed connector" warnings
        try:
            await cleanup_s3_sessions()
        except Exception as ex:
            log.warning(f"Error cleaning up S3 sessions: {exception_message(ex)}")


# single mode -- run a single logical task (could consist of multiple
# executable tasks if we are evaluating against multiple models)
async def run_single(tasks: list[TaskRunOptions], debug_errors: bool) -> list[EvalLog]:
    async with display().task_screen(task_specs(tasks), parallel=False) as screen:
        # init ui
        init_task_screen(screen)

        results: list[tuple[int, EvalLog]] = []
        try:
            async with anyio.create_task_group() as tg:

                async def run_task(index: int) -> None:
                    result = await task_run(tasks[index])
                    results.append((index, result))

                for i in range(0, len(tasks)):
                    tg.start_soon(run_task, i)
        # exceptions can escape when debug_errors is True and that's okay
        except ExceptionGroup as ex:
            if debug_errors:
                raise ex.exceptions[0]
            else:
                raise
        except anyio.get_cancelled_exc_class():
            # child tasks have already each handled this and updated results
            pass
        finally:
            # clear ui
            clear_task_screen()

        # sort results by original index and return just the values
        return [r for _, r in sorted(results)]


# multiple mode -- run multiple logical tasks (requires some smart
# schedluing to ensure that we are spreading work among models)
async def run_multiple(tasks: list[TaskRunOptions], parallel: int) -> list[EvalLog]:
    # track current usage of each model
    models: Set[str] = set()
    for task in tasks:
        models.add(str(task.model))
    model_counts = {model: 0 for model in models}

    # setup pending tasks, queue, and results
    pending_tasks = tasks.copy()
    results: list[tuple[int, EvalLog]] = []
    tasks_completed = 0
    total_tasks = len(tasks)

    # Create a mapping from task to its original index
    task_to_original_index = {id(task): i for i, task in enumerate(tasks)}

    # produce/consume tasks
    send_channel, receive_channel = anyio.create_memory_object_stream[TaskRunOptions](
        parallel * 2
    )

    # find a task that keeps as many different models as possible running concurrently
    async def enque_next_task() -> bool:
        if tasks_completed < total_tasks:
            # filter out models that have no pending tasks
            models_with_pending = {
                model
                for model in model_counts
                if any(str(t.model) == model for t in pending_tasks)
            }
            if not models_with_pending:
                return False

            # among those models, pick one with the least usage
            model = min(models_with_pending, key=lambda m: model_counts[m])

            # now we know there's at least one pending task for this model so it's safe to pick it
            next_task = next(t for t in pending_tasks if str(t.model) == model)
            pending_tasks.remove(next_task)
            model_counts[str(next_task.model)] += 1
            with trace_action(
                log, "Enque Task", f"task: {next_task.task.name} ({next_task.model})"
            ):
                await send_channel.send(next_task)
            return True
        else:
            return False

    async def worker() -> None:
        try:
            nonlocal tasks_completed
            async for task_options in receive_channel:
                result: EvalLog | None = None
                # Get the original index of this task
                original_index = task_to_original_index[id(task_options)]

                # run the task
                try:
                    with trace_action(
                        log,
                        "Run Task",
                        f"task: {task_options.task.name} ({task_options.model})",
                    ):
                        async with anyio.create_task_group() as tg:
                            # Create a factory function that captures the current
                            # task_options. Otherwise, we suffer from Python's
                            # late/by reference binding behavior.
                            # see: https://docs.python.org/3/faq/programming.html#why-do-lambdas-defined-in-a-loop-with-different-values-all-return-the-same-result
                            def create_task_runner(
                                options: TaskRunOptions = task_options,
                                idx: int = original_index,
                            ) -> Callable[[], Awaitable[None]]:
                                async def run_task() -> None:
                                    nonlocal result
                                    result = await task_run(options)
                                    # Store result with its original index
                                    results.append((idx, result))

                                return run_task

                            tg.start_soon(create_task_runner())

                except Exception as ex:
                    # errors generally don't escape from tasks (the exception being if an error
                    # occurs during the final write of the log)
                    log.error(
                        f"Task '{task_options.task.name}' encountered an error during finalisation: {inner_exception(ex)}"
                    )
                    raise

                # tracking
                tasks_completed += 1
                model_counts[str(task_options.model)] -= 1

                # if a task was cancelled we are done
                if not result or result.status == "cancelled":
                    break

                # check if there are more tasks to process
                if tasks_completed < total_tasks:
                    await enque_next_task()
                elif tasks_completed == total_tasks:
                    # all tasks are complete, close the stream
                    try:
                        await send_channel.aclose()
                    except anyio.ClosedResourceError:
                        # another worker might have already closed it
                        pass
        except anyio.EndOfStream:
            pass

    # with task display
    async with display().task_screen(task_specs(tasks), parallel=True) as screen:
        # init screen
        init_task_screen(screen)

        # Use anyio task group instead of manual task management
        try:
            async with anyio.create_task_group() as tg:
                # computer number of workers (never more than total_tasks)
                num_workers = min(parallel, total_tasks)

                # start worker tasks
                for _ in range(num_workers):
                    tg.start_soon(worker)

                # enqueue initial set of tasks
                for _ in range(num_workers):
                    await enque_next_task()
        except anyio.get_cancelled_exc_class():
            pass
        finally:
            # Always ensure channels are closed
            try:
                await send_channel.aclose()
            except anyio.ClosedResourceError:
                pass

            try:
                await receive_channel.aclose()
            except anyio.ClosedResourceError:
                pass

            clear_task_screen()

        # Sort results by original index and return just the values
        return [r for _, r in sorted(results)]


def resolve_task_sample_ids(
    task: str, sample_id: str | int | list[str] | list[int] | list[str | int] | None
) -> str | int | list[str] | list[int] | list[str | int] | None:
    def collect_for_task(sample: str | int) -> str | int | None:
        if isinstance(sample, str):
            scoped = sample.split(":", maxsplit=1)
            if len(scoped) > 1:
                if scoped[0].lower() == task.lower():
                    return scoped[1]
                else:
                    return None
            else:
                return sample
        else:
            return sample

    if sample_id is not None:
        if isinstance(sample_id, list):
            ids: list[int | str] = []
            for id in sample_id:
                collect = collect_for_task(id)
                if collect is not None:
                    ids.append(collect)
            return ids

        else:
            collect = collect_for_task(sample_id)
            if collect is not None:
                return collect
            else:
                return []

    else:
        return sample_id


async def startup_sandbox_environments(
    eval_sandbox: SandboxEnvironmentSpec | None,
    tasks: list[ResolvedTask],
    config: EvalConfig,
    cleanup: bool,
) -> Callable[[], Awaitable[None]]:
    # find unique sandboxenvs
    sandboxenvs: Set[TaskSandboxEnvironment] = set()
    for task in tasks:
        # resolve each sample and add to sandboxenvs
        resolved_task_sample_ids = resolve_task_sample_ids(
            task.task.name, config.sample_id
        )
        dataset = slice_dataset(
            task.task.dataset, config.limit, resolved_task_sample_ids
        )
        for sample in dataset:
            sandbox = await resolve_sandbox_for_task_and_sample(
                eval_sandbox, task.task, sample
            )
            if sandbox is not None and sandbox not in sandboxenvs:
                sandboxenvs.add(sandbox)

    # initialiase sandboxenvs (track cleanups)
    cleanups: list[tuple[TaskCleanup, SandboxEnvironmentConfigType | None, str]] = []
    with display().suspend_task_app():
        for sandboxenv in sandboxenvs:
            # find type
            sandboxenv_type = registry_find_sandboxenv(sandboxenv.sandbox.type)

            # run startup
            task_init = cast(TaskInit, getattr(sandboxenv_type, "task_init"))
            with chdir(sandboxenv.run_dir), environ_vars(dict(sandboxenv.env)):
                await task_init("startup", sandboxenv.sandbox.config)

            # append cleanup method
            task_cleanup = cast(TaskCleanup, getattr(sandboxenv_type, "task_cleanup"))
            cleanups.append(
                (task_cleanup, sandboxenv.sandbox.config, sandboxenv.run_dir)
            )

    # return shutdown method
    async def shutdown() -> None:
        with anyio.CancelScope(shield=True):
            for cleanup_jobs in cleanups:
                try:
                    cleanup_fn, config, task_run_dir = cleanup_jobs
                    with chdir(task_run_dir):
                        await cleanup_fn("shutdown", config, cleanup)
                except BaseException as ex:
                    log.warning(
                        f"Error occurred shutting down sandbox environments: {exception_message(ex)}"
                    )

    return shutdown


def task_specs(tasks: list[TaskRunOptions]) -> list[TaskSpec]:
    return [
        TaskSpec(task_display_name(task.task.name), ModelName(task.model))
        for task in tasks
    ]


def ensure_unique_ids(dataset: Dataset) -> None:
    """
    Validates that all samples in the dataset have unique IDs.

    Raises a error if duplicates are found.

    Args:
        dataset (Datatset): The dataset

    Raises:
        PrerequisiteError: If duplicate IDs are found in the dataset.
    """
    seen_ids = set()
    for sample in dataset:
        if sample.id in seen_ids:
            raise PrerequisiteError(
                f"The dataset contains duplicate sample ids (duplicate id: {sample.id}). Please ensure each sample has a unique id."
            )
        seen_ids.add(sample.id)
```

## `_eval/score.py`

```python
from __future__ import annotations

import contextlib
import functools
from copy import deepcopy
from pathlib import Path
from typing import (
    TYPE_CHECKING,
    Any,
    AsyncContextManager,
    AsyncGenerator,
    Callable,
    Literal,
    Sequence,
    Tuple,
)

if TYPE_CHECKING:
    from inspect_ai.scorer._scorers import Scorers

import anyio

from inspect_ai._display import display as display_manager
from inspect_ai._eval.context import init_task_context
from inspect_ai._eval.loader import scorer_from_spec
from inspect_ai._eval.task.task import resolve_scorer, resolve_scorer_metrics
from inspect_ai._util._async import configured_async_backend, run_coroutine, tg_collect
from inspect_ai._util.platform import platform_init, running_in_notebook
from inspect_ai._util.registry import registry_create, registry_unqualified_name
from inspect_ai.event._event import Event
from inspect_ai.event._score import ScoreEvent
from inspect_ai.event._tree import (
    EventTreeSpan,
    event_sequence,
    event_tree,
    walk_node_spans,
)
from inspect_ai.log import (
    EvalLog,
)
from inspect_ai.log._log import EvalMetricDefinition, EvalSample
from inspect_ai.log._score import _find_scorers_span
from inspect_ai.log._transcript import Transcript, init_transcript, transcript
from inspect_ai.model import ModelName
from inspect_ai.model._model import get_model
from inspect_ai.model._model_config import model_roles_config_to_model_roles
from inspect_ai.scorer import Metric, Scorer, Target
from inspect_ai.scorer._metric import SampleScore, Score
from inspect_ai.scorer._reducer import (
    ScoreReducer,
    ScoreReducers,
    create_reducers,
    reducer_log_names,
)
from inspect_ai.scorer._scorer import ScorerSpec, unique_scorer_name
from inspect_ai.solver import TaskState
from inspect_ai.util._display import (
    DisplayType,
    display_type_initialized,
    init_display_type,
)
from inspect_ai.util._span import span
from inspect_ai.util._store import init_subtask_store

from .task.results import eval_results

ScoreAction = Literal["append", "overwrite"]


def score(
    log: EvalLog,
    scorers: "Scorers",
    metrics: list[Metric | dict[str, list[Metric]]]
    | dict[str, list[Metric]]
    | None = None,
    epochs_reducer: ScoreReducers | None = None,
    action: ScoreAction | None = None,
    display: DisplayType | None = None,
    copy: bool = True,
) -> EvalLog:
    """Score an evaluation log.

    Args:
       log (EvalLog): Evaluation log.
       scorers (Scorer): List of Scorers to apply to log
       metrics (list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]] | None):
           Alternative metrics (overrides the metrics provided by the
           specified scorer and log).
       epochs_reducer (ScoreReducers | None):
           Reducer function(s) for aggregating scores in each sample.
           Defaults to previously used reducer(s).
       action: Whether to append or overwrite this score
       display: Progress/status display
       copy: Whether to deepcopy the log before scoring.

    Returns:
       Log with scores yielded by scorer.
    """
    # standard platform init for top level entry points
    platform_init()

    # initialize display type
    init_display_type(display)

    # resolve scorers into a list
    scorers = [scorers] if isinstance(scorers, Scorer) else scorers

    if running_in_notebook():
        return run_coroutine(
            score_async(log, scorers, metrics, epochs_reducer, action, copy=copy)
        )
    else:
        return anyio.run(
            functools.partial(score_async, copy=copy),
            log,
            scorers,
            metrics,
            epochs_reducer,
            action,
            backend=configured_async_backend(),
        )


def _get_updated_scores(
    sample: EvalSample, scores: dict[str, SampleScore], action: ScoreAction
) -> dict[str, Score]:
    if action == "overwrite":
        return {k: v.score for k, v in scores.items()}

    updated_scores: dict[str, Score] = {**(sample.scores or {})}
    for key, score in scores.items():
        new_key = key
        count = 0
        while new_key in updated_scores:
            # This key already exists, dedupe its name
            count = count + 1
            new_key = f"{key}-{count}"

        updated_scores[new_key] = score.score

    return updated_scores


def _get_updated_events(
    sample: EvalSample, new_events: Sequence[Event], action: ScoreAction
) -> list[Event]:
    sample_event_tree = event_tree(sample.events)
    final_scorers_node = _find_scorers_span(sample_event_tree)

    if final_scorers_node is None:
        return [*sample.events, *new_events]

    (new_scorers_tree,) = event_tree(new_events)
    assert isinstance(new_scorers_tree, EventTreeSpan)
    if action == "append":
        # Add the new score nodes to the existing scorer node's children
        for child in new_scorers_tree.children:
            if isinstance(child, EventTreeSpan):
                child.parent_id = final_scorers_node.id
        final_scorers_node.children.extend(new_scorers_tree.children)
    else:
        # Entirely replace the existing scorer node and its children, which will
        # also mean updating the timestamps associated with the scorers span
        if final_scorers_node.parent_id is None:
            siblings = sample_event_tree
        else:
            scorer_insert_point = None
            for node in walk_node_spans(sample_event_tree):
                if node.id == final_scorers_node.parent_id:
                    scorer_insert_point = node
                    break

            assert scorer_insert_point is not None
            siblings = scorer_insert_point.children

        idx_scorer_event = siblings.index(final_scorers_node)
        siblings[idx_scorer_event] = new_scorers_tree
        new_scorers_tree.parent_id = final_scorers_node.parent_id
    return list(event_sequence(sample_event_tree))


async def score_async(
    log: EvalLog,
    scorers: "Scorers",
    metrics: list[Metric | dict[str, list[Metric]]]
    | dict[str, list[Metric]]
    | None = None,
    epochs_reducer: ScoreReducers | None = None,
    action: ScoreAction | None = None,
    display: DisplayType | None = None,
    copy: bool = True,
    samples: Callable[[int], AsyncContextManager[EvalSample]] | None = None,
) -> EvalLog:
    """Score an evaluation log.

    Args:
       log (EvalLog):
         Evaluation log. Only the headers are needed if `samples`
         is passed as well.
       scorers (list[Scorer]): Scorers to apply to log
       metrics (list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]] | None):
         Alternative metrics (overrides the metrics provided by the
         specified scorer and log).
       epochs_reducer (ScoreReducers  | None):
         Reducer function(s) for aggregating scores in each sample.
         Defaults to previously used reducer(s).
       action: Whether to append or overwrite this score
       display: Progress/status display
       copy: Whether to deepcopy the log before scoring.
       samples:
         Function to read samples from the log, which accepts the
         sample index and async yields an EvalSample. Can be used to
         stream samples without loading the entire log into memory.

    Returns:
       Log with scores yielded by scorer.
    """
    if samples is None and log.samples is None:
        raise ValueError("There are no samples to score in the log.")

    # resolve scorers
    resolved_scorers = resolve_scorer(scorers)

    if copy:
        # deepcopy so we don't mutate the passed log
        log = deepcopy(log)

    total_samples: int | None = None
    if samples is None:
        _samples = log.samples
        assert _samples is not None

        @contextlib.asynccontextmanager
        async def _read_sample(idx_sample: int) -> AsyncGenerator[EvalSample, None]:
            yield _samples[idx_sample]

        samples = _read_sample
        total_samples = len(_samples)
    else:
        total_samples = log.results.total_samples if log.results else None

    assert total_samples is not None

    if not display_type_initialized():
        init_display_type(display or "plain")

    # prime the scoring tasks
    action = action or "append"

    with display_manager().progress(total=total_samples) as p:
        scorer_names: list[str] | None = None
        scores: list[dict[str, SampleScore] | None] = [None] * total_samples

        async def _score_sample(idx_sample: int) -> None:
            nonlocal scorer_names
            sample_score: dict[str, SampleScore] = {}

            async with samples(idx_sample) as sample:
                # run the task, capturing the resulting sample scores
                # and sample names for later use. The sample scores
                # returned here are only the _newly created_ scores
                # which means that metrics below are being computed
                # only for the new scores (not all scores on the sample)
                #
                # We need to capture the the full sample score here
                # since the sample score carries the scorer name that generated
                # it (so using sample.scores directly isn't enough)
                sample_score, names = await _run_score_task(
                    log, sample, resolved_scorers, action
                )

            assert sample.scores is not None
            scores[idx_sample] = sample_score
            if scorer_names is None:
                scorer_names = names
            p.update(1)

        await tg_collect(
            (
                functools.partial(_score_sample, idx_sample)
                for idx_sample in range(total_samples)
            )
        )

        # collect metrics from EvalLog (they may overlap w/ the scorer metrics,
        # that will be taken care of in eval_results). For append, the new scorer
        # uses its own metrics -- the original eval's metrics are already baked
        # into log.results.scores and don't need to be recreated.
        log_metrics = metrics or (
            metrics_from_log_header(log) if action != "append" else None
        )

        # resolve the scorer metrics onto the scorers
        resolved_scorers = resolve_scorer_metrics(resolved_scorers, log_metrics) or []

        # override epochs_reducer if specified
        epochs_reducer = create_reducers(epochs_reducer)
        if epochs_reducer is not None:
            log.eval.config.epochs_reducer = reducer_log_names(epochs_reducer)
        else:
            epochs_reducer = reducers_from_log_header(log)

        # compute metrics
        results, reductions = eval_results(
            total_samples,
            list(filter(None, scores)),
            epochs_reducer,
            resolved_scorers,
            log_metrics,
            scorer_names,
            log.results.early_stopping if log.results else None,
        )

        # Since the metrics calculation above is only be done using the scorers
        # and scores that were generated during this scoring run, we need to process
        # the results carefully, depending upon whether the action was "append" or "overwrite"
        log.reductions = reductions
        if action == "overwrite" or log.results is None:
            # Completely replace the results with the new results
            log.results = results
        else:
            # Only update the results with the new scores, leaving the rest
            # of the results as they were
            log.results.scores.extend(results.scores)

    return log


async def _run_score_task(
    log_header: EvalLog,
    sample: EvalSample,
    scorers: list[Scorer],
    action: ScoreAction,
) -> Tuple[dict[str, SampleScore], list[str]]:
    target = Target(sample.target)
    state = TaskState(
        model=ModelName(log_header.eval.model),
        sample_id=sample.id,
        epoch=sample.epoch,
        input=sample.input,
        target=target,
        choices=sample.choices,
        messages=sample.messages,
        output=sample.output,
        completed=True,
        metadata=sample.metadata,
        store=sample.store,
        scores=(sample.scores or {}).copy() if action == "append" else {},
        sample_uuid=sample.uuid,
    )

    # get the model then initialize the async context
    model = get_model(
        model=log_header.eval.model,
        config=log_header.plan.config.merge(log_header.eval.model_generate_config),
        **log_header.eval.model_args,
    )

    # get the model roles
    model_roles = model_roles_config_to_model_roles(log_header.eval.model_roles)

    # initialize active model and store
    init_task_context(model, model_roles)
    init_subtask_store(state.store)

    # load a copy of the current sample events into the transcript
    init_transcript(Transcript([*sample.events], log_model_api=False))

    if state.scores is None:
        state.scores = {}
    existing_score_names = [*state.scores]

    results: dict[str, SampleScore] = {}
    scorer_names: list[str] = []
    async with span(name="scorers"):
        for scorer in scorers:
            scorer_name = unique_scorer_name(
                scorer, list({*existing_score_names, *results})
            )
            scorer_names.append(scorer_name)
            async with span(name=scorer_name, type="scorer"):
                score_result = await scorer(state, target)
                if scorer_name in state.scores:
                    raise RuntimeError(
                        f"Scorer {scorer_name} has modified state.scores"
                    )
                if score_result is not None:
                    state.scores[scorer_name] = score_result

                    transcript()._event(
                        ScoreEvent(
                            score=score_result,
                            target=target.target,
                            model_usage=sample.model_usage or None,
                            role_usage=sample.role_usage or None,
                        )
                    )

                    results[scorer_name] = SampleScore(
                        score=score_result,
                        sample_id=state.sample_id,
                        sample_metadata=state.metadata,
                        scorer=registry_unqualified_name(scorer),
                    )

    # slice off only the newly added events
    new_events = transcript().events[len(sample.events) :]

    sample.scores = _get_updated_scores(sample, results, action=action)
    sample.events = _get_updated_events(sample, new_events, action=action)

    # return the actual sample scorers and scorer names that
    # were used to generate this set of scores
    return results, scorer_names


def metrics_from_log_header(
    log: EvalLog,
) -> list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]] | None:
    # See if we have metrics in the eval itself
    if log.eval.metrics:
        if isinstance(log.eval.metrics, list):
            result: list[Metric | dict[str, list[Metric]]] = []
            for metric_item in log.eval.metrics:
                if isinstance(metric_item, dict):
                    # It's a dict of metric groups
                    result.append(
                        {
                            key: [metric_from_log(metric) for metric in metrics]
                            for key, metrics in metric_item.items()
                        }
                    )
                else:
                    # It's a direct metric
                    result.append(metric_from_log(metric_item))
            return result
        else:
            return {
                key: [metric_from_log(metric) for metric in metrics]
                for key, metrics in log.eval.metrics.items()
            }
    return None


def metric_from_log(metric: EvalMetricDefinition) -> Metric:
    return registry_create("metric", metric.name, **(metric.options or {}))


def reducers_from_log_header(log: EvalLog) -> list[ScoreReducer] | None:
    return create_reducers(log.eval.config.epochs_reducer)


def resolve_scorers(
    log: EvalLog, scorer: str | None = None, scorer_args: dict[str, Any] | None = None
) -> list[Scorer]:
    """
    Create a list of Scorer objects from an evaluation log.

    Args:
        log: EvalLog object containing evaluation configuration and results
        scorer:: Scorer name (simple name or file.py@name).
        scorer_args: Dictionary of scorer arguments

    Returns:
        list[Scorer]: List of initialized scorers
    """
    # resolve the scorer path
    task_path = Path(log.eval.task_file) if log.eval.task_file else None

    # If there is an explicit scorer
    if scorer:
        return [
            scorer_from_spec(
                spec=ScorerSpec(scorer=scorer),
                task_path=task_path,
                **(scorer_args or {}),
            )
        ]
    # See if we can create scorers from the eval itself
    elif log.eval.scorers is not None:
        return (
            [
                scorer_from_spec(
                    spec=ScorerSpec(scorer=score.name),
                    task_path=task_path,
                    **(score.options or {}),
                )
                for score in log.eval.scorers
            ]
            if log.results
            else []
        )

    # Otherwise, perhaps we can re-create them from the results
    return (
        [
            scorer_from_spec(
                spec=ScorerSpec(scorer=score.name), task_path=task_path, **score.params
            )
            for score in log.results.scores
        ]
        if log.results
        else []
    )
```

## `_eval/task/__init__.py`

```python
from .task import Task, TaskInfo, PreviousTask, task_with  # noqa: I001, F401
from .epochs import Epochs

__all__ = ["Epochs", "Task", "TaskInfo", "PreviousTask", "task_with"]
```

## `_eval/task/constants.py`

```python
TASK_FILE_ATTR = "__task_file__"
TASK_RUN_DIR_ATTR = "__task_run_dir__"
TASK_ALL_PARAMS_ATTR = "__task_all_params__"
```

## `_eval/task/epochs.py`

```python
from inspect_ai.scorer._reducer import ScoreReducer, ScoreReducers, create_reducers


class Epochs:
    """Task epochs.

    Number of epochs to repeat samples over and optionally one or more
    reducers used to combine scores from samples across epochs. If not
    specified the "mean" score reducer is used.
    """

    def __init__(self, epochs: int, reducer: ScoreReducers | None = None) -> None:
        """Task epochs.

        Args:
           epochs (int): Number of epochs
           reducer (ScoreReducers): One or more reducers used to combine
              scores from samples across epochs (defaults to "mean")
        """
        self.epochs = epochs
        self._reducer_spec = reducer
        self._reducer: list[ScoreReducer] | None = None

    @property
    def reducer(self) -> list[ScoreReducer] | None:
        """One or more reducers used to combine scores from samples across epochs (defaults to "mean")"""
        if self._reducer is None:
            self._reducer = create_reducers(self._reducer_spec)
        return self._reducer
```

## `_eval/task/error.py`

```python
from inspect_ai._util.error import EvalError
from inspect_ai.log._log import eval_error


def _should_eval_fail(
    sample_error_count: int, total_sample_count: int, fail_on_error: bool | float | None
) -> bool:
    if fail_on_error is False:
        # if fail_on_error is False, we never fail
        return False
    elif fail_on_error is None or fail_on_error is True:
        # if fail_on_error is None or True, we fail if there is any error
        return sample_error_count > 0
    else:
        if fail_on_error < 1:
            # if fail_on_error is less than 1, we make a fractional check of errors
            return sample_error_count >= fail_on_error * total_sample_count
        else:
            # if fail_on_error is larger than 1, we check the absolute count of errors
            return sample_error_count >= fail_on_error


class SampleErrorHandler:
    def __init__(self, fail_on_error: bool | float | None, total_samples: int) -> None:
        self.error_count = 0
        self.fail_on_error = True if fail_on_error is None else fail_on_error
        self.total_samples = total_samples

    def __call__(self, ex: BaseException) -> tuple[EvalError, BaseException | None]:
        # increment error count
        self.error_count += 1

        # create error (we may return it)
        def sample_error(
            *, raise_error: bool
        ) -> tuple[EvalError, BaseException | None]:
            return eval_error(
                ex, type(ex), ex, ex.__traceback__
            ), ex if raise_error else None

        # check against limits
        raise_error = _should_eval_fail(
            self.error_count, self.total_samples, self.fail_on_error
        )
        return sample_error(raise_error=raise_error)
```

## `_eval/task/generate.py`

```python
from typing import Literal

from inspect_ai._util.notgiven import NotGiven
from inspect_ai.model import CachePolicy, GenerateConfig, Model
from inspect_ai.model._cache import epoch
from inspect_ai.model._call_tools import execute_tools
from inspect_ai.solver import TaskState
from inspect_ai.tool import ToolFunction


async def task_generate(
    model: Model,
    state: TaskState,
    tool_calls: Literal["loop", "single", "none"],
    cache: bool | CachePolicy | NotGiven,
    config: GenerateConfig,
) -> TaskState:
    # track tool_choice (revert to "auto" after first forced call of a tool)
    tool_choice = state.tool_choice

    while True:
        # If we don't update the epoch here as we go, it's entirely possible
        # we'd cache the same response for every single epoch, which would
        # completely defeat the point!
        epoch.set(state.epoch)

        # call the model
        state.output = await model.generate(
            input=state.messages,
            tools=state.tools,
            tool_choice=tool_choice,
            config=config,
            cache=cache,
        )

        # append the assistant message
        message = state.output.message
        state.messages.append(message)

        # check for completed
        if state.completed:
            return state

        # resolve tool calls if necessary
        if tool_calls != "none" and message.tool_calls:
            # call tools and update messages and output
            messages, output = await execute_tools(
                state.messages, state.tools, config.max_tool_output
            )
            state.messages.extend(messages)
            if output is not None:
                state.output = output

            # check for completed or only executing a single tool call
            if state.completed or tool_calls == "single":
                return state

            # if a tool_call was forced set tool_choice to 'auto'
            # (otherwise it will get forced over and over again)
            if isinstance(tool_choice, ToolFunction):
                tool_choice = "auto"

        # no tool calls or not resolving tool calls, we are done!
        else:
            return state
```

## `_eval/task/hf.py`

```python
from dataclasses import dataclass, field
from pathlib import Path
from string import ascii_uppercase
from typing import TYPE_CHECKING, Annotated, Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from inspect_ai._eval.task import Task
from inspect_ai._eval.task.epochs import Epochs
from inspect_ai._eval.task.util import split_spec
from inspect_ai._util.content import ContentImage, ContentText
from inspect_ai._util.error import PrerequisiteError, pip_dependency_error
from inspect_ai._util.version import verify_required_version
from inspect_ai.dataset import FieldSpec, Sample, hf_dataset
from inspect_ai.dataset._dataset import DatasetRecord
from inspect_ai.model import ChatMessageUser
from inspect_ai.scorer._scorer import Scorer, ScorerSpec
from inspect_ai.solver._solver import Solver, SolverSpec

if TYPE_CHECKING:
    from inspect_ai.model import ChatMessage


class HFSolver(BaseModel):
    name: Literal[
        "prompt_template",
        "system_message",
        "user_message",
        "chain_of_thought",
        "use_tools",
        "generate",
        "self_critique",
        "multiple_choice",
    ]
    args: dict[str, Any] = Field(default_factory=dict)


class HFScorer(BaseModel):
    name: Literal[
        "includes",
        "match",
        "pattern",
        "answer",
        "exact",
        "f1",
        "model_graded_qa",
        "model_graded_fact",
        "choice",
        "math",
    ]
    args: dict[str, Any] = Field(default_factory=dict)


@dataclass
class HFFieldSpec(FieldSpec):
    choices: str | list[str] | None = field(default=None)  # type: ignore[assignment]
    """ Overriding the FieldSpec to fit field spec coming from the eval.yaml """
    input_image: str | None = field(default=None)
    """ Optional field name for image data (data URI) to combine with text input for multimodal tasks """


HFEpochReducer = Annotated[
    str,
    StringConstraints(pattern=r"^(pass_at_\d+|at_least_\d+|max|mode|median|mean)$"),
]


class HFTask(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = Field(default=None)
    config: str = Field(default="default")
    split: str = Field(default="test")
    field_spec: HFFieldSpec
    shuffle_choices: bool | None = Field(default=None)
    epochs: int = Field(default=1, ge=1)
    epoch_reducer: HFEpochReducer | None = Field(default=None)
    solvers: list[HFSolver] = Field(min_length=1)
    scorers: list[HFScorer] = Field(min_length=1)


def task_create_from_hf(task_name: str, **kwargs: Any) -> list[Task]:
    """Build a Task from a full config definition (solvers, scorers, dataset, etc.)."""
    from inspect_ai._eval.loader import scorer_from_spec, solver_from_spec

    try:
        from huggingface_hub import errors as hf_errors
        from huggingface_hub import hf_hub_download

        verify_required_version("HuggingFace Tasks", "huggingface_hub", "1.0.0")

    except ImportError:
        raise pip_dependency_error(
            "HuggingFace Dataset Tasks (hf/)", ["huggingface_hub"]
        ) from None

    # see if there is a revision in the repo_id (otherwise use task arg)
    task_spec, revision = split_spec(task_name.replace("hf/", ""))
    if revision is None:
        revision = kwargs.get("revision", "main")

    # see if there is a name in the spec or just a repo id
    # (if there is a name we'll use it to filter the task list)
    repo_id, name = parse_task_spec(task_spec)

    # load config
    try:
        yaml_path = Path(
            hf_hub_download(
                repo_id=repo_id,
                filename="eval.yaml",
                repo_type="dataset",
                revision=revision,
            )
        )
    except hf_errors.EntryNotFoundError:
        raise PrerequisiteError(
            f"No 'eval.yaml' file found for Hugging Face Dataset '{repo_id}'"
        )

    # read tasks
    with open(yaml_path, "r") as f:
        global_config = yaml.safe_load(f)
    task_configs = global_config.get("tasks", None)
    if task_configs is None:
        raise PrerequisiteError("eval.yaml does not include 'tasks' field.")

    tasks: list[Task] = []
    for task_config in task_configs:
        # validate config
        hf_task = HFTask.model_validate(task_config)

        # if there is more than one task then 'id' is required
        if len(task_configs) > 1 and hf_task.id is None:
            raise PrerequisiteError(
                "Task 'id' field is required if there are more than 1 tasks in 'eval.yaml'"
            )

        # filter on id if specified
        if name is not None and hf_task.id != name:
            continue

        def record_to_sample_hf(
            record: DatasetRecord, field_spec: HFFieldSpec = hf_task.field_spec
        ) -> Sample:
            return _record_to_sample_hf(record, field_spec)

        # create dataset
        dataset = hf_dataset(
            path=repo_id,
            revision=revision,
            name=hf_task.config,
            split=hf_task.split,
            sample_fields=record_to_sample_hf,
        )

        # shuffle choides if requested
        if hf_task.shuffle_choices:
            dataset.shuffle_choices()

        # Build solvers
        solvers: list[Solver] = []
        for solver in hf_task.solvers:
            solvers.append(
                solver_from_spec(
                    SolverSpec(
                        solver=solver.name, args=solver.args, args_passed=solver.args
                    )
                )
            )

        # Build scorers
        scorers: list[Scorer] = []
        for scorer in hf_task.scorers:
            scorers.append(
                scorer_from_spec(
                    ScorerSpec(
                        scorer=scorer.name,
                    ),
                    task_path=None,
                    **scorer.args,
                )
            )

        # Build and return task (use id disambiguator if more than 1 task)
        task = Task(
            name=f"{task_name}/{hf_task.id}" if len(task_configs) > 1 else task_name,
            dataset=dataset,
            solver=solvers,
            scorer=scorers,
            epochs=Epochs(hf_task.epochs, hf_task.epoch_reducer),
        )

        # Set file attributes
        tasks.append(task)

    # raise if there are no tasks
    if len(tasks) == 0:
        raise PrerequisiteError(f"No tasks matching '{task_name}' were found.")

    return tasks


def parse_task_spec(task_spec: str) -> tuple[str, str | None]:
    parts = task_spec.split("/")

    if len(parts) == 2:
        repo_id = task_spec
        taskname: str | None = None
    elif len(parts) == 3:
        repo_id = f"{parts[0]}/{parts[1]}"
        taskname = parts[2]
    else:
        raise ValueError(f"Expected 2 or 3 components, got {len(parts)}")

    return repo_id, taskname


def _sanitize_target(record: DatasetRecord, target: str, is_choices: bool) -> str:
    # if the target is a literal, return the value after the colon without checking the record.
    if target.startswith("literal:"):
        target = target.split(":")[1]
        return target

    # otherwise, get the target from the record and convert to a letter if it's a number.
    target = record[target]
    if isinstance(target, int) and is_choices:
        target = ascii_uppercase[target]

    return str(target)


def _sanitize_choices(
    record: DatasetRecord, choices: str | list[str] | None
) -> Any | None:
    # if the choices are a list, return the values from the record.
    if choices is None:
        return None

    if isinstance(choices, list):
        return [record[choice] for choice in choices]
    else:
        return record[choices]


def _record_to_sample_hf(record: DatasetRecord, field_spec: HFFieldSpec) -> Sample:
    # Handle multimodal input if input_image is specified
    if field_spec.input_image and record[field_spec.input_image] not in [None, ""]:
        text_input = record[field_spec.input]
        image_data_uri = record[field_spec.input_image]
        input_value: str | list[ChatMessage] = [
            ChatMessageUser(
                content=[
                    ContentText(text=text_input),
                    ContentImage(image=image_data_uri),
                ]
            )
        ]
    else:
        # Standard text input
        input_value = record[field_spec.input]

    sample_kwargs: dict[str, Any] = {"input": input_value}

    if target := _sanitize_target(
        record, field_spec.target, field_spec.choices is not None
    ):
        sample_kwargs["target"] = target

    if choices := _sanitize_choices(record, field_spec.choices):
        sample_kwargs["choices"] = choices

    if metadata_keys := field_spec.metadata:
        assert isinstance(metadata_keys, list)  # to appease mypy
        metadata = {name: record[name] for name in metadata_keys}
        sample_kwargs["metadata"] = metadata

    return Sample(**sample_kwargs)
```

## `_eval/task/images.py`

```python
import functools

from inspect_ai._util._async import tg_collect
from inspect_ai._util.constants import BASE_64_DATA_REMOVED
from inspect_ai._util.content import (
    Content,
    ContentAudio,
    ContentDocument,
    ContentImage,
    ContentVideo,
)
from inspect_ai._util.images import file_as_data_uri
from inspect_ai._util.url import is_data_uri
from inspect_ai.dataset import Sample
from inspect_ai.model import ChatMessage
from inspect_ai.solver import TaskState


async def states_with_base64_content(states: list[TaskState]) -> list[TaskState]:
    return await tg_collect(
        [functools.partial(state_with_base64_content, state) for state in states]
    )


async def state_with_base64_content(state: TaskState) -> TaskState:
    state.messages = await messages_with_base64_content(state.messages)
    return state


def state_without_base64_content(state: TaskState) -> TaskState:
    state.messages = messages_without_base64_content(state.messages)
    return state


async def samples_with_base64_content(samples: list[Sample]) -> list[Sample]:
    return await tg_collect(
        [functools.partial(sample_with_base64_content, sample) for sample in samples]
    )


async def sample_with_base64_content(sample: Sample) -> Sample:
    if isinstance(sample.input, list):
        return sample.model_copy(
            update={"input": await messages_with_base64_content(sample.input)}
        )
    else:
        return sample


def sample_without_base64_content(sample: Sample) -> Sample:
    if isinstance(sample.input, list):
        return sample.model_copy(
            update={"input": messages_without_base64_content(sample.input)}
        )
    else:
        return sample


async def messages_with_base64_content(
    messages: list[ChatMessage],
) -> list[ChatMessage]:
    return await tg_collect(
        [
            functools.partial(message_with_base64_content, message)
            for message in messages
        ]
    )


def messages_without_base64_content(messages: list[ChatMessage]) -> list[ChatMessage]:
    return [message_without_base64_content(message) for message in messages]


async def message_with_base64_content(message: ChatMessage) -> ChatMessage:
    if not isinstance(message.content, str):
        return message.model_copy(
            update=dict(
                content=[
                    await chat_content_with_base64_content(content)
                    for content in message.content
                ]
            )
        )

    else:
        return message


def message_without_base64_content(message: ChatMessage) -> ChatMessage:
    if not isinstance(message.content, str):
        return message.model_copy(
            update=dict(
                content=[
                    chat_content_without_base64_content(content)
                    for content in message.content
                ]
            )
        )

    else:
        return message


async def chat_content_with_base64_content(content: Content) -> Content:
    if isinstance(content, ContentImage):
        return ContentImage(
            image=await file_as_data_uri(content.image),
            detail=content.detail,
        )
    elif isinstance(content, ContentAudio):
        return ContentAudio(
            audio=await file_as_data_uri(content.audio), format=content.format
        )
    elif isinstance(content, ContentVideo):
        return ContentVideo(
            video=await file_as_data_uri(content.video), format=content.format
        )
    elif isinstance(content, ContentDocument):
        document = await file_as_data_uri(content.document)
        return ContentDocument(
            document=document, filename=content.filename, mime_type=content.mime_type
        )
    else:
        return content


def chat_content_without_base64_content(content: Content) -> Content:
    if isinstance(content, ContentImage) and is_data_uri(content.image):
        return ContentImage(image=BASE_64_DATA_REMOVED, detail=content.detail)
    elif isinstance(content, ContentAudio) and is_data_uri(content.audio):
        return ContentAudio(audio=BASE_64_DATA_REMOVED, format="mp3")
    elif isinstance(content, ContentVideo) and is_data_uri(content.video):
        return ContentVideo(video=BASE_64_DATA_REMOVED, format="mp4")
    elif isinstance(content, ContentDocument) and is_data_uri(content.document):
        return ContentDocument(
            document=BASE_64_DATA_REMOVED,
            filename=content.filename,
            mime_type=content.mime_type,
        )
    else:
        return content
```

## `_eval/task/log.py`

```python
import logging
import os
from importlib import metadata as importlib_metadata
from typing import Any, cast

from shortuuid import uuid

from inspect_ai._display.core.display import TaskDisplayMetric
from inspect_ai._eval.task.util import slice_dataset
from inspect_ai._util.constants import PKG_NAME
from inspect_ai._util.dateutil import iso_now
from inspect_ai._util.git import git_context
from inspect_ai._util.path import cwd_relative_path
from inspect_ai._util.registry import (
    registry_log_name,
    registry_package_name,
    registry_params,
)
from inspect_ai.dataset import Dataset
from inspect_ai.event._event import Event
from inspect_ai.log import (
    EvalConfig,
    EvalDataset,
    EvalError,
    EvalPlan,
    EvalPlanStep,
    EvalResults,
    EvalRevision,
    EvalSample,
    EvalSpec,
    EvalStats,
    EvalStatus,
)
from inspect_ai.log._log import (
    EvalLog,
    EvalMetricDefinition,
    EvalSampleReductions,
    EvalSampleSummary,
    EvalScorer,
    eval_config_defaults,
)
from inspect_ai.log._recorders import Recorder
from inspect_ai.log._recorders.buffer import SampleBufferDatabase
from inspect_ai.log._recorders.types import SampleEvent
from inspect_ai.model import (
    GenerateConfig,
    Model,
    ModelName,
)
from inspect_ai.model._model import model_usage, role_usage
from inspect_ai.model._model_config import (
    model_args_for_log,
    model_roles_to_model_roles_config,
)
from inspect_ai.scorer._metric import MetricSpec
from inspect_ai.scorer._scorer import ScorerSpec
from inspect_ai.solver._constants import SOLVER_ALL_PARAMS_ATTR
from inspect_ai.solver._plan import Plan
from inspect_ai.solver._solver import Solver, SolverSpec
from inspect_ai.util._sandbox.environment import SandboxEnvironmentSpec

logger = logging.getLogger(__name__)


def resolve_revision() -> EvalRevision | None:
    git = git_context()
    return (
        EvalRevision(type="git", origin=git.origin, commit=git.commit, dirty=git.dirty)
        if git
        else None
    )


def resolve_external_registry_package_version(
    task_registry_name: str | None,
) -> tuple[str, str] | None:
    if task_registry_name is None:
        return None

    package_name = registry_package_name(task_registry_name)

    is_external = package_name != PKG_NAME
    if package_name is None or not is_external:
        return None

    try:
        package_version = importlib_metadata.version(package_name)
    except importlib_metadata.PackageNotFoundError:
        logger.warning(f"Could not resolve version for {package_name=}")
        return None

    return package_name, package_version


def _effective_max_samples(eval_config: EvalConfig, model: Model) -> int:
    """Resolve effective max_samples for high-throughput detection.

    Follows the resolution chain from create_sample_semaphore (run.py),
    excluding batch mode (which is not inherently high-throughput).
    """
    if eval_config.max_samples is not None:
        return eval_config.max_samples
    if model.config.max_connections is not None:
        return model.config.max_connections
    return model.api.max_connections()


def _is_high_throughput(sample_count: int, effective_max_samples: int) -> bool:
    """Detect high-throughput runs that benefit from reduced logging overhead."""
    return effective_max_samples >= 100 or sample_count >= 1000


class TaskLogger:
    def __init__(
        self,
        task_name: str,
        task_version: int | str,
        task_file: str | None,
        task_registry_name: str | None,
        task_display_name: str | None,
        task_id: str | None,
        eval_set_id: str | None,
        run_id: str,
        solver: SolverSpec | None,
        tags: list[str] | None,
        model: Model,
        model_roles: dict[str, Model] | None,
        dataset: Dataset,
        scorer: list[ScorerSpec] | None,
        metrics: list[MetricSpec | dict[str, list[MetricSpec]]]
        | dict[str, list[MetricSpec]]
        | None,
        sandbox: SandboxEnvironmentSpec | None,
        task_attribs: dict[str, Any],
        task_args: dict[str, Any],
        task_args_passed: dict[str, Any],
        model_args: dict[str, Any],
        eval_config: EvalConfig,
        metadata: dict[str, Any] | None,
        recorder: Recorder,
        header_only: bool,
    ) -> None:
        packages = {
            PKG_NAME: importlib_metadata.version(PKG_NAME),
        }
        revision = resolve_revision()
        resolved_registry = resolve_external_registry_package_version(
            task_registry_name
        )
        if resolved_registry:
            external_package, external_package_version = resolved_registry
            packages[external_package] = external_package_version

        # redact authentication oriented model_args
        model_args = model_args_for_log(model_args)

        # cwd_relative_path for sandbox config
        if sandbox and isinstance(sandbox.config, str):
            sandbox = SandboxEnvironmentSpec(
                sandbox.type, cwd_relative_path(sandbox.config)
            )

        # ensure that the dataset has sample ids and record them
        sample_ids = cast(
            list[int | str],
            [
                sample.id
                for sample in slice_dataset(
                    dataset, eval_config.limit, eval_config.sample_id
                )
            ],
        )

        # total samples accounting for slicing and epochs
        epochs = eval_config.epochs if eval_config.epochs else 1
        total_samples = len(sample_ids) * epochs

        # adaptive defaults for high-throughput runs
        eff_max_samples = _effective_max_samples(eval_config, model)
        high_throughput = _is_high_throughput(total_samples, eff_max_samples)
        if high_throughput:
            if eval_config.log_realtime is None:
                eval_config.log_realtime = False
            if eval_config.score_display is None:
                eval_config.score_display = False

        # write defaults for unspecified config
        for name, value in eval_config_defaults().items():
            if getattr(eval_config, name, None) is None:
                setattr(eval_config, name, value)

        # resolve scorers
        eval_scorers = resolve_eval_scorers(scorer)

        # resolve metrics
        eval_metrics = resolve_eval_metrics(metrics)

        # create eval spec
        self.eval = EvalSpec(
            eval_set_id=eval_set_id,
            run_id=run_id,
            created=iso_now(),
            task=f"{task_name}",
            task_id=task_id if task_id else uuid(),
            task_version=task_version,
            task_file=task_file,
            task_registry_name=task_registry_name,
            task_display_name=task_display_name,
            task_attribs=task_attribs,
            task_args=task_args,
            task_args_passed=task_args_passed,
            solver=solver.solver if solver else None,
            tags=tags,
            solver_args=solver.args if solver else None,
            solver_args_passed=solver.args_passed if solver else None,
            model=f"{ModelName(model).api}/{model.name}",
            model_generate_config=model.config,
            model_base_url=model.explicit_base_url,
            model_roles=model_roles_to_model_roles_config(model_roles),
            dataset=EvalDataset(
                name=dataset.name,
                location=cwd_relative_path(dataset.location),
                samples=len(dataset),
                sample_ids=sample_ids,
                shuffled=dataset.shuffled,
            ),
            scorers=eval_scorers,
            metrics=eval_metrics,
            sandbox=sandbox,
            model_args=model_args,
            config=eval_config,
            revision=revision,
            packages=packages,
            metadata=metadata,
        )

        # stack recorder and location
        self.recorder = recorder
        self.header_only = header_only

        # number of samples logged
        self._samples_completed = 0

        # size of flush buffer (how many samples we buffer before hitting storage)
        self.flush_buffer = eval_config.log_buffer or recorder.default_log_buffer(
            total_samples, high_throughput
        )
        if high_throughput and eval_config.log_buffer is None:
            eval_config.log_buffer = self.flush_buffer
        self.flush_pending: list[tuple[str | int, int]] = []

        # sample buffer db
        self._buffer_db: SampleBufferDatabase | None = None

    async def init(self) -> None:
        self._location = await self.recorder.log_init(self.eval)

        if self.eval.config.log_realtime is False or os.environ.get(
            "PYTEST_CURRENT_TEST"
        ):
            return

        self._buffer_db = SampleBufferDatabase(
            location=self._location,
            log_images=self.eval.config.log_images is not False,
            log_shared=self.eval.config.log_shared,
        )

    @property
    def location(self) -> str:
        return self._location

    @property
    def samples_completed(self) -> int:
        return self._samples_completed

    async def log_start(self, plan: EvalPlan) -> None:
        await self.recorder.log_start(self.eval, plan)
        await self.recorder.flush(self.eval)

    async def start_sample(self, sample: EvalSampleSummary) -> None:
        if self._buffer_db is not None:
            self._buffer_db.start_sample(sample)

    def log_sample_event(self, id: str | int, epoch: int, event: Event) -> None:
        # log the sample event
        if self._buffer_db is not None:
            self._buffer_db.log_events([SampleEvent(id=id, epoch=epoch, event=event)])

    def remove_sample(self, id: str | int, epoch: int) -> None:
        if self._buffer_db is not None:
            self._buffer_db.remove_samples([(id, epoch)])

    async def complete_sample(self, sample: EvalSample, *, flush: bool) -> None:
        # log the sample
        await self.recorder.log_sample(self.eval, sample)

        # mark complete
        if self._buffer_db is not None:
            self._buffer_db.complete_sample(sample.summary())

        # flush if requested
        if flush:
            self.flush_pending.append((sample.id, sample.epoch))
            if len(self.flush_pending) >= self.flush_buffer:
                # flush to disk
                await self.recorder.flush(self.eval)

                # notify the event db it can remove these
                if self._buffer_db is not None:
                    self._buffer_db.remove_samples(self.flush_pending)

                # Clear
                self.flush_pending.clear()

        # track sucessful samples logged
        if sample.error is None:
            self._samples_completed += 1

    def update_metrics(self, metrics: list[TaskDisplayMetric]) -> None:
        if self._buffer_db is not None:
            self._buffer_db.update_metrics(metrics)

    async def log_finish(
        self,
        status: EvalStatus,
        stats: EvalStats,
        results: EvalResults | None = None,
        reductions: list[EvalSampleReductions] | None = None,
        error: EvalError | None = None,
    ) -> EvalLog:
        # finish and get log
        log = await self.recorder.log_finish(
            self.eval, status, stats, results, reductions, error, self.header_only
        )

        # cleanup the events db
        if self._buffer_db is not None:
            self._buffer_db.cleanup()
            self._buffer_db = None

        # return log
        return log


def plan_to_eval_plan(plan: Plan, config: GenerateConfig) -> EvalPlan:
    def eval_plan_step(solver: Solver) -> EvalPlanStep:
        return EvalPlanStep(
            solver=registry_log_name(solver),
            params=getattr(solver, SOLVER_ALL_PARAMS_ATTR, {}),
            params_passed=registry_params(solver),
        )

    eval_plan = EvalPlan(
        name=plan.name,
        steps=[eval_plan_step(solver) for solver in plan.steps],
        finish=eval_plan_step(plan.finish) if plan.finish else None,
        config=config,
    )
    if plan.finish:
        eval_plan.steps.append(eval_plan_step(plan.finish))
    return eval_plan


async def log_start(
    logger: TaskLogger,
    plan: Plan,
    config: GenerateConfig,
) -> None:
    eval_plan = plan_to_eval_plan(plan, config)
    await logger.log_start(eval_plan)


def collect_eval_data(stats: EvalStats) -> None:
    # collect stats
    stats.completed_at = iso_now()
    stats.model_usage = model_usage()
    stats.role_usage = role_usage()


def resolve_eval_metrics(
    metrics: list[MetricSpec | dict[str, list[MetricSpec]]]
    | dict[str, list[MetricSpec]]
    | None,
) -> (
    list[EvalMetricDefinition | dict[str, list[EvalMetricDefinition]]]
    | dict[str, list[EvalMetricDefinition]]
    | None
):
    if metrics is None:
        return None
    elif isinstance(metrics, list):
        result: list[EvalMetricDefinition | dict[str, list[EvalMetricDefinition]]] = []
        for metric_item in metrics:
            if isinstance(metric_item, dict):
                # It's a dict of metric groups
                result.append(
                    {
                        k: [
                            EvalMetricDefinition(name=v.metric, options=v.args)
                            for v in metric_list
                        ]
                        for k, metric_list in metric_item.items()
                    }
                )
            else:
                # It's a direct MetricSpec
                result.append(
                    EvalMetricDefinition(
                        name=metric_item.metric, options=metric_item.args
                    )
                )
        return result
    else:
        return {
            k: [
                EvalMetricDefinition(name=v.metric, options=v.args) for v in metric_list
            ]
            for k, metric_list in metrics.items()
        }


def resolve_eval_scorers(scorers: list[ScorerSpec] | None) -> list[EvalScorer] | None:
    if scorers is None:
        return None
    else:
        results = []
        for scorer in scorers:
            results.append(
                EvalScorer(
                    name=scorer.scorer,
                    metrics=resolve_scorer_metrics(scorer.metrics),
                    options=scorer.args,
                    metadata=scorer.metadata,
                )
            )
        return results


def resolve_scorer_metrics(
    metrics: list[MetricSpec | dict[str, list[MetricSpec]]]
    | dict[str, list[MetricSpec]]
    | None,
) -> (
    list[EvalMetricDefinition | dict[str, list[EvalMetricDefinition]]]
    | dict[str, list[EvalMetricDefinition]]
    | None
):
    if metrics is None:
        return None
    elif isinstance(metrics, list):
        resolved_metrics: list[
            EvalMetricDefinition | dict[str, list[EvalMetricDefinition]]
        ] = []
        for metric_item in metrics:
            if isinstance(metric_item, MetricSpec):
                resolved_metrics.append(
                    EvalMetricDefinition(
                        name=metric_item.metric, options=metric_item.args
                    )
                )
            elif isinstance(metric_item, dict):
                resolved_metrics.append(
                    {
                        metric_group: [
                            EvalMetricDefinition(
                                name=metric_spec.metric, options=metric_spec.args
                            )
                            for metric_spec in metric_specs
                        ]
                        for metric_group, metric_specs in metric_item.items()
                    }
                )
            else:
                raise TypeError(f"Unexpected item in list: {metric_item}")
        return resolved_metrics
    else:
        return {
            metric_group: [
                EvalMetricDefinition(name=metric_spec.metric, options=metric_spec.args)
                for metric_spec in metric_specs
            ]
            for metric_group, metric_specs in metrics.items()
        }
```

## `_eval/task/resolved.py`

```python
from dataclasses import dataclass, field
from typing import Any, Set

from inspect_ai._eval.task import Task
from inspect_ai._eval.task.run import EvalSampleSource
from inspect_ai.model import Model
from inspect_ai.util import SandboxEnvironmentSpec


@dataclass(frozen=True)
class ResolvedTask:
    id: str
    task: Task
    task_args: dict[str, Any]
    task_file: str | None
    model: Model
    model_roles: dict[str, Model] | None
    sandbox: SandboxEnvironmentSpec | None
    sequence: int
    sample_source: EvalSampleSource | None = field(default=None)

    @property
    def has_sandbox(self) -> bool:
        if self.sandbox:
            return True
        else:
            return any(
                [True if sample.sandbox else False for sample in self.task.dataset]
            )


def resolved_model_names(tasks: list[ResolvedTask]) -> list[str]:
    models: Set[str] = set()
    for task in tasks:
        models.add(str(task.model))
    return list(models)
```

## `_eval/task/results.py`

```python
import fnmatch
import inspect
import logging
import re
from collections import defaultdict
from collections.abc import Mapping, Sequence
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Tuple, TypeGuard, cast, get_args, get_origin, get_type_hints

import numpy as np

from inspect_ai._util.logger import warn_once
from inspect_ai._util.registry import (
    registry_info,
    registry_log_name,
    registry_params,
    registry_unqualified_name,
)
from inspect_ai.log import (
    EvalMetric,
    EvalResults,
    EvalSampleScore,
    EvalScore,
)
from inspect_ai.log._log import EvalSampleReductions
from inspect_ai.scorer import Metric, Score, Scorer
from inspect_ai.scorer._metric import (
    MetricDeprecated,
    MetricProtocol,
    SampleScore,
    Value,
)
from inspect_ai.scorer._metrics.accuracy import accuracy
from inspect_ai.scorer._metrics.std import stderr
from inspect_ai.scorer._reducer import ScoreReducer, mean_score, reducer_log_name
from inspect_ai.scorer._scorer import (
    SCORER_METRICS,
    ScorerSpec,
    scorer_metrics,
    unique_scorer_name,
)
from inspect_ai.util._early_stopping import EarlyStoppingSummary

logger = logging.getLogger(__name__)


@dataclass
class ScorerInfo:
    name: str
    metrics: list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]]
    params: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def from_scorer(scorer: Scorer) -> "ScorerInfo":
        name = registry_unqualified_name(scorer)
        metrics = scorer_metrics(scorer)
        metadata = deepcopy(registry_info(scorer).metadata)
        del metadata[SCORER_METRICS]
        params = registry_params(scorer)
        return ScorerInfo(name=name, metrics=metrics, params=params, metadata=metadata)

    @staticmethod
    def from_name(name: str) -> "ScorerInfo":
        from inspect_ai._eval.loader import scorer_from_spec

        # load the scorer to gather that scorer's metrics
        try:
            scorer = scorer_from_spec(ScorerSpec(scorer=name), task_path=None)
        except Exception:
            scorer = None

        # use the metrics if we were able to load the scorer
        # otherwise, use the default metrics
        if scorer is not None:
            metrics = scorer_metrics(scorer)
        else:
            metrics = [accuracy(), stderr()]

        return ScorerInfo(name=name, metrics=metrics)


def eval_results(
    samples: int,
    scores: list[dict[str, SampleScore]],
    reducers: ScoreReducer | list[ScoreReducer] | None,
    scorers: list[Scorer] | None,
    metrics: list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]] | None,
    scorer_names: list[str] | None = None,
    early_stopping: EarlyStoppingSummary | None = None,
) -> Tuple[EvalResults, list[EvalSampleReductions] | None]:
    # initialise results
    results = EvalResults(
        total_samples=samples,
        completed_samples=len(scores),
        early_stopping=early_stopping,
    )
    reductions = None

    # extract scorers info from scorers then create scorers info for any
    # scores not already accounted for by a scorer name
    scorers_info = [ScorerInfo.from_scorer(scorer) for scorer in (scorers or [])]

    # use resolved scorer names to detect scores that are present in task state
    # that don't have a corresponding scorer
    resolved_scorer_names = (
        set(scorer_names)
        if scorer_names is not None
        else {info.name for info in scorers_info}
    )

    for sample_scores in scores:
        for name, sample_score in sample_scores.items():
            if sample_score.scorer is None and name not in resolved_scorer_names:
                # the scorer info for this score
                scorer_info = ScorerInfo.from_name(name)

                # resolve the task scores
                if metrics is not None:
                    scorer_info.metrics = metrics

                # capture the scorer information
                scorers_info.append(scorer_info)
                resolved_scorer_names.add(name)

    # record scorer
    if len(scorers_info) > 0:
        result_scores: list[EvalScore] = []
        sample_reductions: list[EvalSampleReductions] = []
        for index, scorer_info in enumerate(scorers_info):
            # this scorer (if an explicit list of scorer name is provided, use those
            # otherwise, generate a unique name for the scorer)
            scorer_name = (
                scorer_names[index]
                if scorer_names
                else unique_scorer_name(
                    scorer_info.name, [eval_score.name for eval_score in result_scores]
                )
            )

            # scores for this scorer
            resolved_scores = [
                score[scorer_name] for score in scores if scorer_name in score
            ]

            # Group the scores by sample_id
            reducers, use_reducer_name = resolve_reducer(reducers)
            if len(reducers) == 0:
                # Compute metrics without reduction since no reducers were
                # explicitly specified
                eval_scores = compute_eval_scores(
                    resolved_scores,
                    scorer_info.metrics,
                    scorer_name,
                    scorer_info,
                    None,
                )
                result_scores.extend(eval_scores)

            else:
                for reducer in reducers:
                    reducer_display_nm = (
                        reducer_log_name(reducer) if use_reducer_name else None
                    )
                    reduced_scores = reduce_scores(resolved_scores, reducer=reducer)

                    # record this scorer's intermediate results
                    reduced_samples = EvalSampleReductions(
                        scorer=scorer_name,
                        reducer=reducer_display_nm,
                        samples=[
                            EvalSampleScore(**ss.score.__dict__, sample_id=ss.sample_id)
                            for ss in reduced_scores
                        ],
                    )
                    sample_reductions.append(reduced_samples)

                    # Compute metrics for this scorer
                    eval_scores = compute_eval_scores(
                        reduced_scores,
                        scorer_info.metrics,
                        scorer_name,
                        scorer_info,
                        reducer_display_nm,
                    )
                    result_scores.extend(eval_scores)

            # build results
        results.scores = result_scores
        reductions = sample_reductions

    return results, reductions


def compute_eval_scores(
    scores: list[SampleScore],
    metrics: list[MetricProtocol | MetricDeprecated]
    | dict[str, list[MetricProtocol | MetricDeprecated]]
    | list[
        MetricProtocol
        | MetricDeprecated
        | dict[str, list[MetricProtocol | MetricDeprecated]]
    ],
    scorer_name: str,
    scorer_info: ScorerInfo,
    reducer_display_nm: str | None = None,
) -> list[EvalScore]:
    result_scores: list[EvalScore] = []
    # Compute metrics for this scorer
    if isinstance(metrics, list):
        ## split the metrics into the simple metrics and any dictionary
        ## metrics, to be processed independently
        simple_metrics, dict_metrics = split_metrics(
            cast(list[Metric | dict[str, list[Metric]]], metrics)
        )

        # If there is a simple list of metrics
        # just compute the metrics for this scorer
        result_scores.extend(
            scorer_for_metrics(
                scorer_name=scorer_name,
                scorer_info=scorer_info,
                sample_scores=scores,
                metrics=simple_metrics,
                reducer_name=reducer_display_nm,
            )
        )
        for dict_metric in dict_metrics:
            result_scores.extend(
                scorers_from_metric_dict(
                    scorer_name=scorer_name,
                    scorer_info=scorer_info,
                    sample_scores=scores,
                    metrics=dict_metric,
                    reducer_name=reducer_display_nm,
                )
            )
    else:
        # If there is a dictionary of metrics, apply
        # the metrics to the values within the scores
        # (corresponding by key) and emit an EvalScorer for
        # each key (which effectively creates multiple scorers
        # by expanding a dictionary score value into multiple
        # results with metrics)
        result_scores.extend(
            scorers_from_metric_dict(
                scorer_name=scorer_name,
                scorer_info=scorer_info,
                sample_scores=scores,
                metrics=metrics,
                reducer_name=reducer_display_nm,
            )
        )

    return result_scores


def resolve_reducer(
    reducers: ScoreReducer | list[ScoreReducer] | None,
) -> tuple[list[ScoreReducer], bool]:
    if reducers is None:
        return ([mean_score()], False)
    elif isinstance(reducers, list) and len(reducers) == 0:
        return ([], True)
    else:
        return (reducers if isinstance(reducers, list) else [reducers], True)


def split_metrics(
    metrics: list[Metric | dict[str, list[Metric]]],
) -> tuple[list[Metric], list[dict[str, list[Metric]]]]:
    metric_list: list[Metric] = []
    dict_list: list[dict[str, list[Metric]]] = []

    for metric in metrics:
        if isinstance(metric, Metric):
            metric_list.append(metric)
        elif isinstance(metric, dict):
            dict_list.append(metric)

    return metric_list, dict_list


def scorer_for_metrics(
    scorer_name: str,
    scorer_info: ScorerInfo,
    sample_scores: list[SampleScore],
    metrics: list[Metric],
    reducer_name: str | None = None,
) -> list[EvalScore]:
    results: list[EvalScore] = []

    ## filter the sample_scores to exclude Nan values, which will not be scored
    ## unscored_samples to note the number of samples that were not scored
    sample_scores_with_values = []
    for sample_score in sample_scores:
        if not isinstance(sample_score.score.value, float) or not np.isnan(
            sample_score.score.value
        ):
            sample_scores_with_values.append(sample_score)

    unscored_samples = len(sample_scores) - len(sample_scores_with_values)
    scored_samples = len(sample_scores_with_values)

    # we want to use simple names for metrics in the metrics dict
    # (i.e. without package prefixes). we do this by getting the
    # unqualified name, then appending a suffix if there are duplicates
    # this keeps the code straightforward and intuitive for users
    # programming against the log (e.g. metrics["accuracy"]) vs.
    # metrics["pkgname/accuracy"])
    list_metrics: dict[str, EvalMetric] = {}
    for metric in metrics:
        key = metrics_unique_key(
            registry_unqualified_name(metric), list(list_metrics.keys())
        )
        params = registry_params(metric)
        # process metric values
        if len(sample_scores_with_values) > 0:
            metric_value = call_metric(metric, sample_scores_with_values)
        else:
            metric_value = float("Nan")
        base_metric_name = registry_log_name(metric)

        # If the metric value is a dictionary, turn each of the entries
        # in the dictionary into a result
        if isinstance(metric_value, Mapping):
            for metric_key, value in metric_value.items():
                if value is not None:
                    name = metrics_unique_key(metric_key, list(list_metrics.keys()))
                    list_metrics[name] = EvalMetric(
                        name=name, value=float(value), params=params
                    )

        # If the metric value is a list, turn each element in the list
        # into a result
        elif isinstance(metric_value, Sequence):
            for index, value in enumerate(metric_value):
                if value is not None:
                    count = str(index + 1)
                    name = metrics_unique_key(
                        with_suffix(key, count), list(list_metrics.keys())
                    )

                    list_metrics[name] = EvalMetric(
                        name=name, value=float(value), params=params
                    )

        # the metric is a float, str, or int
        else:
            list_metrics[key] = EvalMetric(
                name=base_metric_name, value=float(metric_value), params=params
            )

    # build results
    results.append(
        EvalScore(
            scorer=scorer_name,
            reducer=reducer_name,
            name=scorer_name,
            params=scorer_info.params,
            metadata=scorer_info.metadata
            if len(scorer_info.metadata.keys()) > 0
            else None,
            metrics=list_metrics,
            scored_samples=scored_samples,
            unscored_samples=unscored_samples,
        )
    )
    return results


def scorers_from_metric_dict(
    scorer_name: str,
    scorer_info: ScorerInfo,
    sample_scores: list[SampleScore],
    metrics: dict[str, list[Metric]],
    reducer_name: str | None = None,
) -> list[EvalScore]:
    results: list[EvalScore] = []

    # Expand any metric keys
    resolved_metrics = (
        resolve_glob_metric_keys(metrics, sample_scores[0].score)
        if len(sample_scores) > 0
        else metrics
    )

    for metric_key, metric_list in resolved_metrics.items():
        # filter scores to a list of scalars with the value of the metric name
        metric_scores: list[SampleScore] = []

        ## filter the sample_scores to exclude Nan values, which will not be scored
        ## unscored_samples to note the number of samples that were not scored
        unscored_samples = 0
        scored_samples = 0

        for sample_score in sample_scores:
            if isinstance(sample_score.score.value, dict):
                if metric_key in sample_score.score.value:
                    # Convert the score into a simple scalar value to apply metrics
                    metric_score = deepcopy(sample_score)
                    metric_score.score.value = cast(
                        float, sample_score.score.value[metric_key]
                    )
                    if isinstance(metric_score.score.value, float) and np.isnan(
                        metric_score.score.value
                    ):
                        unscored_samples += 1
                    else:
                        scored_samples += 1
                        metric_scores.append(metric_score)
                else:
                    raise TypeError(
                        f"key '{metric_key}' isn't present in the score value dictionary"
                    )
            else:
                raise TypeError(
                    "A dictionary of metrics specified for a non-dictionary score"
                )

        result_metrics: dict[str, EvalMetric] = {}
        for target_metric in metric_list:
            # compute the metric value
            metric_name = registry_log_name(target_metric)
            metric_params = registry_params(target_metric)
            if len(metric_scores) > 0:
                value = call_metric(target_metric, metric_scores)
            else:
                value = float("Nan")

            # convert the value to a float (either by expanding the dict or array)
            # or by casting to a float
            if isinstance(value, dict):
                for key, val in value.items():
                    name = f"{metric_name}_{key}"
                    result_metrics[name] = EvalMetric(
                        name=name, value=cast(float, val), params=metric_params
                    )
            elif isinstance(value, list):
                for idx, item in enumerate(value):
                    name = f"{metric_name}_{idx}"
                    result_metrics[name] = EvalMetric(
                        name=name, value=cast(float, item), params=metric_params
                    )
            else:
                result_metrics[metric_name] = EvalMetric(
                    name=metric_name, value=cast(float, value), params=metric_params
                )

        # create a scorer result for this metric
        # TODO: What if there is separate simple scorer which has a name collision with
        # a score created by this scorer
        results.append(
            EvalScore(
                scorer=scorer_name,
                reducer=reducer_name,
                name=metric_key,
                params=scorer_info.params,
                metadata=scorer_info.metadata
                if len(scorer_info.metadata.keys()) > 0
                else None,
                metrics=result_metrics,
                scored_samples=scored_samples,
                unscored_samples=unscored_samples,
            )
        )
    return results


def call_metric(metric: Metric, sample_scores: list[SampleScore]) -> Value:
    if is_metric_deprecated(metric):
        warn_once(
            logger,
            f"Metric {registry_log_name(metric)} should be updated to take list[SampleScore]. "
            f"Metrics with list[Score] are deprecated.",
        )
        scores = [sample_score.score for sample_score in sample_scores]
        return metric(scores)
    else:
        metric = cast(MetricProtocol, metric)
        return metric(sample_scores)


def is_metric_deprecated(metric: Metric) -> TypeGuard[MetricDeprecated]:
    """Type guard to check if a metric follows the deprecated signature."""
    try:
        # signature and params
        sig = inspect.signature(metric)
        param_types = get_type_hints(metric)

        # there should be only one param, check it
        first_param = next(iter(sig.parameters.values()), None)
        if first_param is None:
            # No parameters, who knows what this is, treat it as deprecated
            return True

        expected_type: Any = param_types.get(first_param.name, None)

        if expected_type is None or expected_type is Any:
            # no helpful type info, treat it as deprecated
            return True

        # Extract generic base type and arguments to check if it matches list[Score]
        origin = get_origin(expected_type)
        args = get_args(expected_type)

        return origin is list and args == (Score,)
    except (AttributeError, ValueError, TypeError):
        return False


def resolve_glob_metric_keys(
    metrics: dict[str, list[Metric]], base_score: Score
) -> dict[str, list[Metric]]:
    if not isinstance(base_score.value, dict):
        # this value isn't a dictionary (unexpected)
        raise TypeError(
            "A dictionary of metrics was specified for a non-dictionary score. Dictionaries of metrics are only valid when the score value is a dictionary."
        )

    # Expand any metric keys
    resolved_metrics: dict[str, list[Metric]] = {}

    # the value is a dictionary, so go through the dictionary
    # and expand any metric globs into their literal values
    # and apply matching metrics to those keys
    for metric_key, metric_list in metrics.items():
        # compile the key as a glob into a regex and use that to match keys
        key_glob_re = re.compile(fnmatch.translate(metric_key))

        for score_key in base_score.value.keys():
            if key_glob_re.match(score_key):
                # The key matched, so either create a new entry for it and add metrics
                # or add metrics to the existing key
                resolved_metrics.setdefault(score_key, [])
                existing_metric_names = {
                    registry_log_name(m) for m in resolved_metrics[score_key]
                }

                # Add metrics that aren't already in the list
                for metric in metric_list:
                    metric_name = registry_log_name(metric)
                    if metric_name not in existing_metric_names:
                        resolved_metrics[score_key].append(metric)
                        existing_metric_names.add(metric_name)
    return resolved_metrics


def reduce_scores(
    scores: list[SampleScore], reducer: ScoreReducer
) -> list[SampleScore]:
    # Group the scores by sample_id
    grouped_scores: dict[str, list[SampleScore]] = defaultdict(list)
    for sample_score in scores:
        if sample_score.sample_id is not None:
            grouped_scores[str(sample_score.sample_id)].append(sample_score)

    # reduce the scores
    reduced_scores: list[SampleScore] = []
    for scores in grouped_scores.values():
        reduced = reducer([score.score for score in scores])
        reduced_scores.append(
            SampleScore(
                sample_id=scores[0].sample_id,
                sample_metadata=scores[0].sample_metadata,
                score=reduced,
            )
        )

    return reduced_scores


def metrics_unique_key(key: str, existing: list[str]) -> str:
    if key not in existing:
        return key
    else:
        key_index = 2
        pattern = re.compile(f"{re.escape(key)}(\\d+)")
        for existing_key in existing:
            match = pattern.match(existing_key)
            index = int(match.group(1)) if match else None
            if index and (index >= key_index):
                key_index = index + 1
        return f"{key}{key_index}"


def with_suffix(prefix: str, suffix: str) -> str:
    return prefix + "-" + suffix
```

## `_eval/task/run.py`

```python
import contextlib
import functools
import importlib
import sys
import time
from copy import copy, deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from logging import getLogger
from pathlib import PurePath
from typing import Awaitable, Callable, Literal

import anyio
from anyio.abc import TaskGroup
from typing_extensions import Unpack

from inspect_ai._display import (
    TaskCancelled,
    TaskError,
    TaskProfile,
    TaskSuccess,
    display,
)
from inspect_ai._display.core.display import TaskDisplayMetric
from inspect_ai._util._async import tg_collect
from inspect_ai._util.async_zip import AsyncZipReader
from inspect_ai._util.asyncfiles import get_async_filesystem
from inspect_ai._util.constants import (
    DEFAULT_EPOCHS,
    DEFAULT_MAX_CONNECTIONS,
    DEFAULT_MAX_CONNECTIONS_BATCH,
)
from inspect_ai._util.dateutil import iso_now
from inspect_ai._util.error import exception_message
from inspect_ai._util.exception import TerminateSampleError
from inspect_ai._util.json import to_json_str_safe
from inspect_ai._util.notgiven import NOT_GIVEN
from inspect_ai._util.registry import (
    is_registry_object,
    registry_log_name,
    registry_unqualified_name,
)
from inspect_ai._util.working import (
    init_sample_working_time,
    sample_start_datetime,
    sample_waiting_time,
)
from inspect_ai._view.notify import view_notify_eval
from inspect_ai.dataset import Dataset, Sample
from inspect_ai.event._error import ErrorEvent
from inspect_ai.event._sample_init import SampleInitEvent
from inspect_ai.event._sample_limit import SampleLimitEvent
from inspect_ai.event._score import ScoreEvent
from inspect_ai.log import (
    EvalConfig,
    EvalError,
    EvalLog,
    EvalResults,
    EvalSample,
    EvalStats,
)
from inspect_ai.log._condense import condense_sample
from inspect_ai.log._file import (
    EvalLogInfo,
    eval_log_json_str,
    read_eval_log_sample_async,
)
from inspect_ai.log._log import (
    EvalSampleLimit,
    EvalSampleReductions,
    EvalSampleSummary,
    eval_error,
)
from inspect_ai.log._samples import (
    active_sample,
)
from inspect_ai.log._transcript import (
    Transcript,
    init_transcript,
    transcript,
)
from inspect_ai.model import (
    GenerateConfig,
    GenerateConfigArgs,
    Model,
    ModelAPI,
    ModelName,
)
from inspect_ai.model._model import (
    init_sample_model_usage,
    init_sample_role_usage,
    sample_model_usage,
    sample_role_usage,
)
from inspect_ai.scorer import Scorer, Target
from inspect_ai.scorer._metric import Metric, SampleScore
from inspect_ai.scorer._reducer.types import ScoreReducer
from inspect_ai.scorer._score import init_scoring_context
from inspect_ai.scorer._scorer import unique_scorer_name
from inspect_ai.solver import Generate, Plan, TaskState
from inspect_ai.solver._chain import Chain, unroll
from inspect_ai.solver._fork import set_task_generate
from inspect_ai.solver._solver import Solver
from inspect_ai.solver._task_state import sample_state, set_sample_state, state_jsonable
from inspect_ai.util._anyio import inner_exception
from inspect_ai.util._early_stopping import (
    EarlyStop,
    EarlyStopping,
    EarlyStoppingSummary,
)
from inspect_ai.util._limit import (
    LimitExceededError,
    monitor_working_limit,
    record_sample_limit_data,
)
from inspect_ai.util._limit import time_limit as create_time_limit
from inspect_ai.util._limit import working_limit as create_working_limit
from inspect_ai.util._sandbox import SandboxTimeoutError
from inspect_ai.util._sandbox.context import sandbox_connections
from inspect_ai.util._sandbox.environment import SandboxEnvironmentSpec
from inspect_ai.util._span import span
from inspect_ai.util._store import init_subtask_store

from ..context import init_task_context
from ..task import Task
from .error import SampleErrorHandler, _should_eval_fail
from .generate import task_generate
from .images import (
    sample_with_base64_content,
    sample_without_base64_content,
    state_without_base64_content,
    states_with_base64_content,
)
from .log import TaskLogger, collect_eval_data, log_start
from .results import eval_results
from .sandbox import sandboxenv_context
from .store import DiskSampleStore, maybe_page_to_disk
from .util import sample_messages, slice_dataset

py_logger = getLogger(__name__)


EvalSampleSource = Callable[[int | str, int], Awaitable[EvalSample | None]]

# Units allocated for sample progress - the total units
# represents the total units of progress for an individual sample
# the remainder are increments of progress within a sample (and
# must sum to the total_progress_units when the sample is complete)
SAMPLE_TOTAL_PROGRESS_UNITS = 1


@dataclass
class TaskRunOptions:
    task: Task
    model: Model
    model_roles: dict[str, Model] | None
    sandbox: SandboxEnvironmentSpec | None
    logger: TaskLogger
    eval_wd: str
    config: EvalConfig = field(default_factory=EvalConfig)
    solver: Solver | None = field(default=None)
    tags: list[str] | None = field(default=None)
    run_samples: bool | None = field(default=True)
    score: bool = field(default=True)
    debug_errors: bool = field(default=False)
    sample_source: EvalSampleSource | None = field(default=None)
    kwargs: GenerateConfigArgs = field(default_factory=lambda: GenerateConfigArgs())


def resolve_plan(task: Task, solver: Solver | None) -> Plan:
    # resolve the plan (unroll chains)
    solver = solver or task.solver
    if isinstance(solver, Plan):
        plan = solver
    elif isinstance(solver, Chain):
        plan = Plan(list(solver), internal=True)
    else:
        plan = Plan(unroll(solver), internal=True)

    # add setup solver(s) if specified
    if task.setup:
        plan.steps = unroll(task.setup) + plan.steps

    return plan


async def task_run(options: TaskRunOptions) -> EvalLog:
    from inspect_ai.hooks._hooks import (
        emit_task_end,
        emit_task_start,
    )
    from inspect_ai.hooks._legacy import send_telemetry_legacy

    # destructure options
    task = options.task
    model = options.model
    model_roles = options.model_roles
    sandbox = options.sandbox
    logger = options.logger
    eval_wd = options.eval_wd
    config = options.config
    solver = options.solver
    tags = options.tags
    score = options.score
    sample_source = options.sample_source
    kwargs = options.kwargs

    # resolve default generate_config for task
    generate_config = task.config.merge(GenerateConfigArgs(**kwargs))

    # init task context
    init_task_context(
        model,
        model_roles,
        generate_config,
        options.task.approval,
    )

    # track stats and error
    results: EvalResults | None = None
    reductions: list[EvalSampleReductions] | None = None
    stats = EvalStats(started_at=iso_now())

    # handle sample errors (raise as required)
    sample_error_handler = SampleErrorHandler(
        config.fail_on_error if config.continue_on_fail is not True else False,
        len(task.dataset),
    )

    # resolve some config
    model_name = ModelName(model)
    epochs = config.epochs if config.epochs else DEFAULT_EPOCHS
    sandbox_cleanup = config.sandbox_cleanup is not False
    log_images = config.log_images is not False
    log_model_api = config.log_model_api is True
    log_samples = config.log_samples is not False

    # slice dataset (but don't materialize all sample+state pairs upfront --
    # they are created lazily inside run_sample to keep memory at
    # O(concurrent_samples) instead of O(total_samples * epochs))
    dataset = slice_dataset(task.dataset, config.limit, config.sample_id)
    total_samples = len(dataset) * epochs

    # optionally page dataset to disk if it exceeds the memory budget
    sample_store = maybe_page_to_disk(dataset, config.max_dataset_memory)

    # release in-memory samples now that they're paged to disk
    if sample_store is not dataset:
        del dataset

    # resolve the plan (unroll chains)
    solver = solver or task.solver
    plan = resolve_plan(task, solver)

    # resolve the scorer
    score = score and task.scorer is not None
    scorers: list[Scorer] | None = task.scorer if (score and task.scorer) else None
    scorer_profiles = (
        [registry_log_name(scorer) for scorer in scorers if is_registry_object(scorer)]
        if scorers is not None
        else ["(none)"]
    )

    # compute an eval directory relative log location if we can
    if PurePath(logger.location).is_relative_to(PurePath(eval_wd)):
        log_location = PurePath(logger.location).relative_to(eval_wd).as_posix()
    else:
        log_location = logger.location

    # create task profile for display
    profile = TaskProfile(
        name=task.name,
        file=logger.eval.task_file,
        model=model_name,
        dataset=task.dataset.name or "(samples)",
        scorer=", ".join(scorer_profiles),
        samples=total_samples,
        steps=total_samples * SAMPLE_TOTAL_PROGRESS_UNITS,
        eval_config=config,
        task_args=logger.eval.task_args_passed,
        generate_config=generate_config,
        tags=tags,
        log_location=log_location,
    )

    with display().task(
        profile,
    ) as td:
        # start the log (do this outside fo the try b/c the try/except assumes
        # that the log is initialized)
        await log_start(logger, plan, generate_config)

        try:
            # return immediately if we are not running samples
            if not options.run_samples:
                return await logger.log_finish("started", stats)

            # call hook
            await emit_task_start(logger)

            # call early stopping if we have it
            stopping_manager: str = ""
            if options.task.early_stopping is not None:
                stopping_manager = await options.task.early_stopping.start_task(
                    logger.eval,
                    samples=[
                        deepcopy(sample_store[i]) for i in range(len(sample_store))
                    ],
                    epochs=epochs,
                )

            with td.progress() as p:
                # forward progress
                def progress(number: int) -> None:
                    p.update(number)

                # provide solvers a function that they can use to generate output
                async def generate(
                    state: TaskState,
                    tool_calls: Literal["loop", "single", "none"] = "loop",
                    **kwargs: Unpack[GenerateConfigArgs],
                ) -> TaskState:
                    return await task_generate(
                        model=model,
                        state=state,
                        tool_calls=tool_calls,
                        cache=kwargs.get("cache", False) or NOT_GIVEN,
                        config=generate_config.merge(kwargs),
                    )

                # set generate for fork module
                set_task_generate(generate)

                # semaphore to limit concurrency
                sample_semaphore = create_sample_semaphore(
                    config, generate_config, model.api
                )

                # track when samples complete and update progress as we go
                progress_results: list[dict[str, SampleScore]] = []

                def update_metrics(metrics: list[TaskDisplayMetric]) -> None:
                    td.update_metrics(metrics)
                    logger.update_metrics(metrics)

                update_metrics_display = update_metrics_display_fn(
                    update_metrics,
                    display_metrics=profile.eval_config.score_display is not False,
                )

                async def sample_complete(
                    sample_id: int | str,
                    epoch: int,
                    sample_score: dict[str, SampleScore],
                ) -> None:
                    # Capture the result
                    progress_results.append(sample_score)

                    # Increment the segment progress
                    td.sample_complete(
                        complete=len(progress_results), total=total_samples
                    )

                    # Update metrics
                    update_metrics_display(
                        len(progress_results),
                        progress_results,
                        scorers,
                        task.epochs_reducer,
                        task.metrics,
                    )

                    # call the early stopping hook
                    if options.task.early_stopping is not None:
                        await options.task.early_stopping.complete_sample(
                            sample_id, epoch, sample_score
                        )

                # initial progress
                td.sample_complete(complete=0, total=total_samples)

                # Update metrics to empty state
                update_metrics_display(
                    len(progress_results),
                    progress_results,
                    scorers,
                    task.epochs_reducer,
                    task.metrics,
                )

                async def run_sample(
                    sample_index: int, epoch: int
                ) -> dict[str, SampleScore] | EarlyStop | None:
                    # check for cached result from previous eval (before
                    # materialization to avoid unnecessary deepcopy + image I/O)
                    sample_id = sample_store[sample_index].id
                    if sample_source and sample_id is not None:
                        previous_sample = await sample_source(sample_id, epoch)
                        if previous_sample:
                            progress(SAMPLE_TOTAL_PROGRESS_UNITS)
                            if logger and log_samples:
                                await logger.complete_sample(
                                    previous_sample, flush=False
                                )
                            sample_scores = (
                                {
                                    key: SampleScore(
                                        score=score,
                                        sample_id=previous_sample.id,
                                        sample_metadata=previous_sample.metadata,
                                    )
                                    for key, score in previous_sample.scores.items()
                                }
                                if previous_sample.scores
                                else {}
                            )
                            await sample_complete(sample_id, epoch, sample_scores)
                            return sample_scores

                    # factory to create sample+state lazily (after semaphore)
                    # so only concurrently executing samples consume memory
                    async def create_sample_state(
                        sample_uuid: str | None = None,
                    ) -> tuple[Sample, TaskState]:
                        sample = deepcopy(sample_store[sample_index])
                        if log_images:
                            sample = await sample_with_base64_content(sample)
                        state = deepcopy(
                            TaskState(
                                sample_id=sample.id or 0,
                                epoch=epoch,
                                model=model_name,
                                input=sample.input,
                                target=Target(sample.target),
                                choices=sample.choices,
                                messages=sample_messages(sample),
                                message_limit=config.message_limit,
                                token_limit=config.token_limit,
                                cost_limit=config.cost_limit,
                                completed=False,
                                metadata=sample.metadata if sample.metadata else {},
                                sample_uuid=sample_uuid,
                            )
                        )
                        return sample, state

                    return await task_run_sample(
                        task_name=task.name,
                        log_location=profile.log_location,
                        create_sample_state=create_sample_state,
                        sandbox=sandbox,
                        max_sandboxes=config.max_sandboxes,
                        sandbox_cleanup=sandbox_cleanup,
                        plan=plan,
                        scorers=scorers,
                        cleanup=task.cleanup,
                        generate=generate,
                        progress=progress,
                        logger=logger if log_samples else None,
                        log_images=log_images,
                        log_model_api=log_model_api,
                        sample_error=sample_error_handler,
                        sample_complete=sample_complete,
                        early_stopping=options.task.early_stopping,
                        fails_on_error=(
                            config.fail_on_error is not False
                            and config.continue_on_fail is not True
                        ),
                        retry_on_error=config.retry_on_error or 0,
                        error_retries=[],
                        time_limit=config.time_limit,
                        working_limit=config.working_limit,
                        semaphore=sample_semaphore,
                        eval_set_id=logger.eval.eval_set_id,
                        run_id=logger.eval.run_id,
                        task_id=logger.eval.eval_id,
                    )

                sample_results = await tg_collect(
                    [
                        functools.partial(run_sample, sample_index, epoch)
                        for epoch in range(1, epochs + 1)
                        for sample_index in range(len(sample_store))
                    ]
                )

            # compute and record metrics if we have scores
            completed_scores = [
                score_dict
                for score_dict in sample_results
                if isinstance(score_dict, dict)
            ]

            early_stops = [
                stopped_sample
                for stopped_sample in sample_results
                if isinstance(stopped_sample, EarlyStop)
            ]

            # call early stopping if we have it
            stopping_summary: EarlyStoppingSummary | None = None
            if options.task.early_stopping is not None:
                stopping_metadata = await options.task.early_stopping.complete_task()
                stopping_summary = EarlyStoppingSummary(
                    manager=stopping_manager,
                    early_stops=early_stops,
                    metadata=stopping_metadata,
                )

            if len(completed_scores) > 0:
                results, reductions = eval_results(
                    samples=profile.samples,
                    scores=completed_scores,
                    reducers=task.epochs_reducer,
                    scorers=scorers,
                    metrics=task.metrics,
                    early_stopping=stopping_summary,
                )

            # collect eval data
            collect_eval_data(stats)

            sample_error_count = sum(result is None for result in sample_results)
            mark_log_as_error = _should_eval_fail(
                sample_error_count, profile.samples, config.fail_on_error
            )

            # finish
            eval_log = await logger.log_finish(
                "error" if mark_log_as_error else "success", stats, results, reductions
            )

            await emit_task_end(logger, eval_log)

            # display task summary
            td.complete(
                TaskSuccess(
                    samples_completed=logger.samples_completed,
                    stats=stats,
                    results=results or EvalResults(),
                )
            )

        except anyio.get_cancelled_exc_class():
            with anyio.CancelScope(shield=True):
                # collect eval data
                collect_eval_data(stats)

                # finish w/ cancelled status
                eval_log = await logger.log_finish(
                    "cancelled", stats, results, reductions
                )

                # display task cancelled
                td.complete(TaskCancelled(logger.samples_completed, stats))

        except BaseException as ex:
            if options.debug_errors:
                raise
            else:
                # get exception info
                type, value, traceback = sys.exc_info()
                type = type if type else BaseException
                value = value if value else ex

                # build eval error
                error = eval_error(ex, type, value, traceback)

                # collect eval data
                collect_eval_data(stats)

                # finish with error status
                eval_log = await logger.log_finish(
                    "error", stats, results, reductions, error
                )

                # display it
                td.complete(TaskError(logger.samples_completed, type, value, traceback))

    # cleanup disk sample store if used
    if isinstance(sample_store, DiskSampleStore):
        sample_store.close()

    # notify the view module that an eval just completed
    # (in case we have a view polling for new evals)
    view_notify_eval(logger.location)

    try:
        # Log file locations are emitted to the "new" hooks via the "task end" event,
        if (
            await send_telemetry_legacy("eval_log_location", eval_log.location)
            == "not_handled"
        ):
            # Converting the eval log to JSON is expensive. Only do so if
            # eval_log_location was not handled.
            await send_telemetry_legacy("eval_log", eval_log_json_str(eval_log))
    except Exception as ex:
        py_logger.warning(f"Error occurred sending telemetry: {exception_message(ex)}")

    # return eval log
    return eval_log


def update_metrics_display_fn(
    update_fn: Callable[[list[TaskDisplayMetric]], None],
    initial_interval: float = 0,
    min_interval: float = 0.9,
    display_metrics: bool = True,
) -> Callable[
    [
        int,
        list[dict[str, SampleScore]],
        list[Scorer] | None,
        ScoreReducer | list[ScoreReducer] | None,
        list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]] | None,
    ],
    None,
]:
    next_compute_time = time.perf_counter() + initial_interval

    def compute(
        sample_count: int,
        sample_scores: list[dict[str, SampleScore]],
        scorers: list[Scorer] | None,
        reducers: ScoreReducer | list[ScoreReducer] | None,
        metrics: list[Metric | dict[str, list[Metric]]]
        | dict[str, list[Metric]]
        | None,
    ) -> None:
        # Don't compute metrics if they are not being displayed
        if not display_metrics:
            return None

        nonlocal next_compute_time
        time_start = time.perf_counter()
        if time_start >= next_compute_time:
            # compute metrics
            results, reductions = eval_results(
                samples=sample_count,
                scores=sample_scores,
                reducers=reducers,
                scorers=scorers,
                metrics=metrics,
            )

            # Name, reducer, value
            task_metrics: list[TaskDisplayMetric] = []
            if len(results.scores) > 0:
                for score in results.scores:
                    for key, metric in score.metrics.items():
                        task_metrics.append(
                            TaskDisplayMetric(
                                scorer=score.name,
                                name=metric.name,
                                value=metric.value,
                                reducer=score.reducer,
                                params=metric.params,
                            )
                        )
                update_fn(task_metrics)

            # determine how long to wait before recomputing metrics
            time_end = time.perf_counter()
            elapsed_time = time_end - time_start
            wait = max(min_interval, elapsed_time * 10)
            next_compute_time = time_end + wait

    return compute


async def task_run_sample(
    *,
    task_name: str,
    log_location: str,
    create_sample_state: Callable[[str | None], Awaitable[tuple[Sample, TaskState]]],
    sandbox: SandboxEnvironmentSpec | None,
    max_sandboxes: int | None,
    sandbox_cleanup: bool,
    plan: Plan,
    scorers: list[Scorer] | None,
    cleanup: Callable[[TaskState], Awaitable[None]] | None,
    generate: Generate,
    progress: Callable[[int], None],
    logger: TaskLogger | None,
    log_images: bool,
    log_model_api: bool,
    sample_error: SampleErrorHandler,
    sample_complete: Callable[
        [int | str, int, dict[str, SampleScore]], Awaitable[None]
    ],
    fails_on_error: bool,
    early_stopping: EarlyStopping | None,
    retry_on_error: int,
    error_retries: list[EvalError],
    time_limit: int | None,
    working_limit: int | None,
    semaphore: anyio.Semaphore,
    eval_set_id: str | None,
    run_id: str,
    task_id: str,
    sample_uuid: str | None = None,
) -> dict[str, SampleScore] | EarlyStop | None:
    from inspect_ai.event import Event
    from inspect_ai.hooks._hooks import (
        drain_sample_events,
        emit_sample_attempt_end,
        emit_sample_attempt_start,
        emit_sample_end,
        emit_sample_event,
        emit_sample_init,
        emit_sample_scoring,
        emit_sample_start,
        start_sample_event_emitter,
    )

    # execute under sample semaphore
    async with semaphore:
        # materialize sample+state lazily (deferred until semaphore acquired)
        sample, state = await create_sample_state(sample_uuid)

        # validate that we have sample_id (mostly for the typechecker)
        sample_id = sample.id
        if sample_id is None:
            raise ValueError("sample must have id to run")

        def on_sample_event(event: Event) -> None:
            if logger:
                logger.log_sample_event(sample_id, state.epoch, event)
            emit_sample_event(
                eval_set_id=eval_set_id,
                run_id=run_id,
                eval_id=task_id,
                sample_id=state.uuid,
                event=event,
            )

        # initialise subtask and scoring context
        init_sample_model_usage()
        init_sample_role_usage()
        set_sample_state(state)
        sample_transcript = Transcript(log_model_api=log_model_api)
        init_transcript(sample_transcript)
        init_subtask_store(state.store)
        sample_transcript._subscribe(on_sample_event)
        if scorers:
            init_scoring_context(scorers, Target(sample.target))
        init_sample_assistant_internal()

        # use sandbox if provided
        sandboxenv_cm = (
            sandboxenv_context(
                task_name, sandbox, max_sandboxes, sandbox_cleanup, sample
            )
            if sandbox or sample.sandbox is not None
            else contextlib.nullcontext()
        )

        # helper to handle exceptions (will throw if we've exceeded the limit)
        def handle_error(ex: BaseException) -> tuple[EvalError, BaseException | None]:
            # helper to log sample error
            def log_sample_error() -> None:
                msg = f"Sample error (id: {sample.id}, epoch: {state.epoch}): {exception_message(ex)})"
                if retry_on_error > 0:
                    msg = f"{msg}. Sample will be retried."
                py_logger.warning(msg)

            # if we have retries left then return EvalError
            if retry_on_error > 0:
                log_sample_error()
                return eval_error(ex, type(ex), ex, ex.__traceback__), None
            else:
                err = sample_error(ex)
                # if we aren't raising the error then print a warning
                if err[1] is None:
                    log_sample_error()
                transcript()._event(ErrorEvent(error=err[0]))
                return err

        async with active_sample(
            task=task_name,
            log_location=log_location,
            model=str(state.model),
            sample=sample,
            epoch=state.epoch,
            message_limit=state.message_limit,
            token_limit=state.token_limit,
            cost_limit=state.cost_limit,
            time_limit=time_limit,
            working_limit=working_limit,
            fails_on_error=fails_on_error or (retry_on_error > 0),
            transcript=sample_transcript,
            eval_set_id=eval_set_id,
            run_id=run_id,
            eval_id=task_id,
        ) as active:
            # check for early stopping
            if early_stopping is not None and logger is not None:
                early_stop = await early_stopping.schedule_sample(
                    state.sample_id, state.epoch
                )
                if early_stop is not None:
                    return early_stop

            start_time: float | None = None
            error: EvalError | None = None
            raise_error: BaseException | None = None
            cancelled_error: BaseException | None = None
            results: dict[str, SampleScore] = {}
            limit: EvalSampleLimit | None = None
            sample_summary: EvalSampleSummary | None = None
            attempt_started = False

            async def emit_attempt_end(will_retry: bool) -> None:
                if sample_summary is None or not attempt_started:
                    return
                await emit_sample_attempt_end(
                    eval_set_id,
                    run_id,
                    task_id,
                    state.uuid,
                    summary=sample_summary,
                    attempt=len(error_retries) + 1,
                    error=error,
                    will_retry=will_retry,
                )

            # begin init
            init_span = span("init", type="init")
            await init_span.__aenter__()
            cleanup_span: contextlib.AbstractAsyncContextManager[None] | None = (
                init_span
            )

            try:
                # sample init event (remove file bodies as they have content or absolute paths)
                event_sample = sample.model_copy(
                    update=dict(files={k: "" for k in sample.files.keys()})
                    if sample.files
                    else None
                )
                transcript()._event(
                    SampleInitEvent(sample=event_sample, state=state_jsonable(state))
                )

                # construct sample summary, used by both emit_sample_init and emit_sample_start
                sample_summary = EvalSampleSummary(
                    id=sample_id,
                    epoch=state.epoch,
                    input=sample.input,
                    choices=sample.choices,
                    target=sample.target,
                    metadata=sample.metadata or {},
                )

                # emit sample init before sandbox creation
                # (only on the first attempt; not re-emitted when the sample is retried after an error)
                if not error_retries:
                    await emit_sample_init(
                        eval_set_id,
                        run_id,
                        task_id,
                        state.uuid,
                        sample_summary,
                    )

                async with sandboxenv_cm:
                    try:
                        # update active sample wth sandboxes now that we are initialised
                        # (ensure that we still exit init context in presence of sandbox error)
                        try:
                            active.sandboxes = await sandbox_connections()
                        finally:
                            await init_span.__aexit__(None, None, None)
                            cleanup_span = None

                        # record start time
                        start_time = time.monotonic()
                        init_sample_working_time(start_time)

                        # run sample w/ optional limits
                        with (
                            state._token_limit,
                            state._cost_limit,
                            state._message_limit,
                            create_time_limit(time_limit),
                            create_working_limit(working_limit),
                        ):

                            async def run(tg: TaskGroup) -> None:
                                # access to state, limit, and errors
                                nonlocal state, limit, error, raise_error

                                try:
                                    # start the sample
                                    active.start(tg)

                                    # monitor working limit in the background
                                    monitor_working_limit()

                                    # start background sample event emitter
                                    start_sample_event_emitter()

                                    # set progress for plan then run it
                                    async with span("solvers"):
                                        state = await plan(state, generate)

                                # some 'cancel' exceptions are actually user interrupts or the
                                # result of monitor_working_limit() - for these exceptions we
                                # want to intercept them and apply the appropriate control flow
                                # so they can continue on and be scored.
                                except anyio.get_cancelled_exc_class() as ex:
                                    if active.interrupt_action:
                                        # record event
                                        transcript()._event(
                                            SampleLimitEvent(
                                                type="operator",
                                                message="Sample completed: interrupted by operator",
                                            )
                                        )

                                        # handle the action
                                        match active.interrupt_action:
                                            case "score":
                                                # continue to scoring (capture the most recent state)
                                                state = sample_state() or state
                                                limit = EvalSampleLimit(
                                                    type="operator", limit=1
                                                )
                                            case "error":
                                                # default error handling
                                                error, raise_error = handle_error(ex)

                                    elif active.limit_exceeded_error:
                                        # record event
                                        transcript()._event(
                                            SampleLimitEvent(
                                                type="working",
                                                message=active.limit_exceeded_error.message,
                                                limit=active.limit_exceeded_error.limit,
                                            )
                                        )

                                        # capture most recent state for scoring
                                        state = sample_state() or state
                                        limit = EvalSampleLimit(
                                            type=active.limit_exceeded_error.type,
                                            limit=active.limit_exceeded_error.limit
                                            if active.limit_exceeded_error.limit
                                            is not None
                                            else -1,
                                        )

                                    # this was not a user interrupt or working time limit so propagate
                                    else:
                                        raise
                                finally:
                                    # ensures that monitor_working_limit() and any coroutines
                                    # created w/ background() are cancelled
                                    tg.cancel_scope.cancel()

                            try:
                                # emit/log sample start
                                if logger is not None:
                                    await logger.start_sample(sample_summary)

                                # only emit the sample start once: not on retries
                                if not error_retries:
                                    await emit_sample_start(
                                        eval_set_id,
                                        run_id,
                                        task_id,
                                        state.uuid,
                                        sample_summary,
                                    )

                                await emit_sample_attempt_start(
                                    eval_set_id,
                                    run_id,
                                    task_id,
                                    state.uuid,
                                    sample_summary,
                                    attempt=len(error_retries) + 1,
                                )
                                attempt_started = True

                                async with anyio.create_task_group() as tg:
                                    tg.start_soon(run, tg)
                            except Exception as ex:
                                raise inner_exception(ex)
                            finally:
                                # capture sample limits
                                record_sample_limit_data(
                                    len((sample_state() or state).messages)
                                )

                    except SandboxTimeoutError as ex:
                        raise RuntimeError(str(ex)) from ex

                    except TimeoutError:
                        # Scoped time limits manifest themselves as LimitExceededError, not
                        # TimeoutError.
                        py_logger.warning(
                            "Unexpected timeout error reached top of sample stack. Are you handling TimeoutError when applying timeouts?"
                        )

                        # capture most recent state for scoring
                        state = sample_state() or state

                    except LimitExceededError as ex:
                        # capture most recent state for scoring
                        state = sample_state() or state
                        limit = EvalSampleLimit(
                            type=ex.type, limit=ex.limit if ex.limit is not None else -1
                        )

                    except TerminateSampleError as ex:
                        # emit event
                        transcript()._event(
                            SampleLimitEvent(
                                type="operator", limit=1, message=ex.reason
                            )
                        )

                        # capture most recent state for scoring
                        state = sample_state() or state
                        limit = EvalSampleLimit(type="operator", limit=1)

                    except anyio.get_cancelled_exc_class() as ex:
                        with anyio.CancelScope(shield=True):
                            cancelled_error = ex
                            # convert to standard error
                            error = eval_error(ex, type(ex), ex, ex.__traceback__)
                            transcript()._event(ErrorEvent(error=error))

                    except Exception as ex:
                        error, raise_error = handle_error(ex)

                    # mark completed
                    state.completed = True

                    # set timeout for scoring. if the original timeout was hit we still
                    # want to provide opportunity for scoring, but we don't necessarily
                    # want to wait the full timeout again (especially in the case where
                    # the cause of the timeout is a hung container and scoring requires
                    # interacting with the container). as a middle ground we use half
                    # of the original timeout value for scoring.
                    scoring_time_limit = time_limit / 2 if time_limit else None

                    set_sample_state(state)
                    if state.scores is None:
                        state.scores = {}
                    solver_score_names = [*state.scores]

                    # scoring
                    with anyio.CancelScope(shield=cancelled_error is not None):
                        await emit_sample_scoring(
                            eval_set_id,
                            run_id,
                            task_id,
                            state.uuid,
                        )
                        try:
                            # timeout during scoring will result in an ordinary sample error
                            with create_time_limit(scoring_time_limit):
                                if error is None:
                                    async with span(name="scorers"):
                                        for scorer in scorers or []:
                                            scorer_name = unique_scorer_name(
                                                scorer,
                                                list({*solver_score_names, *results}),
                                            )
                                            async with span(
                                                name=scorer_name, type="scorer"
                                            ):
                                                if not scorer:
                                                    continue
                                                score_result = await scorer(
                                                    state, Target(sample.target)
                                                )
                                                if scorer_name in state.scores:
                                                    raise RuntimeError(
                                                        f"Scorer {scorer_name} has modified state.scores"
                                                    )
                                                if score_result is not None:
                                                    state.scores[scorer_name] = (
                                                        score_result
                                                    )

                                                    transcript()._event(
                                                        ScoreEvent(
                                                            score=score_result,
                                                            target=sample.target,
                                                            model_usage=sample_model_usage()
                                                            or None,
                                                            role_usage=sample_role_usage()
                                                            or None,
                                                        )
                                                    )

                                                    results[scorer_name] = SampleScore(
                                                        score=score_result,
                                                        sample_id=sample.id,
                                                        sample_metadata=sample.metadata,
                                                        scorer=registry_unqualified_name(
                                                            scorer
                                                        ),
                                                    )

                                for name in solver_score_names:
                                    score = state.scores[name]
                                    transcript()._event(
                                        ScoreEvent(
                                            score=score,
                                            target=sample.target,
                                            model_usage=sample_model_usage() or None,
                                            role_usage=sample_role_usage() or None,
                                        )
                                    )
                                    results[name] = SampleScore(
                                        score=score,
                                        sample_id=state.sample_id,
                                        sample_metadata=state.metadata,
                                    )

                        except anyio.get_cancelled_exc_class() as ex:
                            with anyio.CancelScope(shield=True):
                                cancelled_error = ex
                                if active.interrupt_action:
                                    transcript()._event(
                                        SampleLimitEvent(
                                            type="operator",
                                            message="Unable to score sample due to operator interruption",
                                        )
                                    )

                                # convert to standard error
                                error = eval_error(ex, type(ex), ex, ex.__traceback__)
                                transcript()._event(ErrorEvent(error=error))

                        except Exception as ex:
                            # handle error
                            error, raise_error = handle_error(ex)
                        finally:
                            # run task cleanup if required (inside sandbox context)
                            if cleanup is not None:
                                with anyio.CancelScope(shield=True):
                                    try:
                                        await cleanup(state)
                                    except Exception as ex:
                                        py_logger.warning(
                                            f"Exception occurred during task cleanup: {ex}",
                                            exc_info=ex,
                                        )

            except Exception as ex:
                error, raise_error = handle_error(ex)
            finally:
                # cleanup the task init span if required
                if cleanup_span is not None:
                    with anyio.CancelScope(shield=cancelled_error is not None):
                        await cleanup_span.__aexit__(None, None, None)

            # complete the sample if there is no error or if there is no retry_on_error in play
            with anyio.CancelScope(shield=cancelled_error is not None):
                # drain sample events for both completion and retry paths
                await drain_sample_events()

                if not error or (retry_on_error == 0) or (cancelled_error is not None):
                    progress(SAMPLE_TOTAL_PROGRESS_UNITS)

                    # if we are logging images then be sure to base64 images injected by solvers
                    if log_images:
                        state = (await states_with_base64_content([state]))[0]

                    # otherwise ensure there are no base64 images in sample or messages
                    else:
                        sample = sample_without_base64_content(sample)
                        state = state_without_base64_content(state)

                    # emit/log sample end
                    eval_sample = create_eval_sample(
                        start_time=start_time,
                        sample=sample,
                        state=state,
                        scores=results,
                        error=error,
                        limit=limit,
                        error_retries=error_retries,
                        started_at=sample_start_datetime(),
                    )
                    if logger:
                        await log_sample(
                            eval_sample=eval_sample,
                            logger=logger,
                            log_images=log_images,
                        )
                    await emit_attempt_end(will_retry=False)
                    await emit_sample_end(
                        eval_set_id, run_id, task_id, state.uuid, eval_sample
                    )

    # error that should be retried (we do this outside of the above scope so that we can
    # retry outside of the original semaphore -- our retry will therefore go to the back
    # of the sample queue)
    if error and retry_on_error > 0 and cancelled_error is None:
        await emit_attempt_end(will_retry=True)

        # remove any buffered sample events
        if logger is not None:
            logger.remove_sample(state.sample_id, state.epoch)

        # recurse w/ tick down of retry_on_error and append of error to error_retries
        return await task_run_sample(
            task_name=task_name,
            log_location=log_location,
            create_sample_state=create_sample_state,
            sandbox=sandbox,
            max_sandboxes=max_sandboxes,
            sandbox_cleanup=sandbox_cleanup,
            plan=plan,
            scorers=scorers,
            cleanup=cleanup,
            generate=generate,
            progress=progress,
            logger=logger,
            log_images=log_images,
            log_model_api=log_model_api,
            sample_error=sample_error,
            sample_complete=sample_complete,
            early_stopping=early_stopping,
            fails_on_error=fails_on_error,
            # tick retry count down
            retry_on_error=retry_on_error - 1,
            # forward on error that caused retry
            error_retries=copy(error_retries) + [error],
            time_limit=time_limit,
            working_limit=working_limit,
            semaphore=semaphore,
            eval_set_id=eval_set_id,
            run_id=run_id,
            task_id=task_id,
            sample_uuid=state.uuid,
        )

    # re-raise cancellation after logging to preserve structured concurrency
    elif cancelled_error is not None:
        raise cancelled_error

    # no error
    elif error is None:
        # call sample_complete callback if we have score results
        if results is not None:
            await sample_complete(state.sample_id, state.epoch, results)
        return results

    # we have an error and should raise it
    elif raise_error is not None:
        raise raise_error

    # we have an error and should not raise it
    else:
        return None


def create_eval_sample(
    start_time: float | None,
    sample: Sample,
    state: TaskState,
    scores: dict[str, SampleScore],
    error: EvalError | None,
    limit: EvalSampleLimit | None,
    error_retries: list[EvalError],
    started_at: datetime | None = None,
) -> EvalSample:
    # sample must have id to be logged
    id = sample.id
    if id is None:
        raise ValueError(
            f"Samples without IDs cannot be logged: {to_json_str_safe(sample)}"
        )

    # construct sample for logging

    # compute total time if we can
    total_time = time.monotonic() - start_time if start_time is not None else None

    return EvalSample(
        id=id,
        epoch=state.epoch,
        input=sample.input,
        choices=sample.choices,
        target=sample.target,
        metadata=state.metadata or {},
        sandbox=sample.sandbox,
        files=list(sample.files.keys()) if sample.files else None,
        setup=sample.setup,
        messages=state.messages,
        output=state.output,
        scores={k: v.score for k, v in scores.items()},
        store=dict(state.store.items()),
        uuid=state.uuid,
        events=list(transcript().events),
        timelines=list(transcript().timelines) or None,
        attachments=dict(transcript().attachments),
        model_usage=sample_model_usage(),
        role_usage=sample_role_usage(),
        started_at=started_at.isoformat() if started_at is not None else None,
        completed_at=datetime.now(timezone.utc).isoformat(),
        total_time=round(total_time, 3) if total_time is not None else None,
        working_time=round(total_time - sample_waiting_time(), 3)
        if total_time is not None
        else None,
        error=error,
        error_retries=error_retries,
        limit=limit,
    )


async def log_sample(
    eval_sample: EvalSample, logger: TaskLogger, log_images: bool
) -> None:
    await logger.complete_sample(condense_sample(eval_sample, log_images), flush=True)


# we can reuse samples from a previous eval_log if and only if:
#   - The datasets have not been shuffled OR the samples in the dataset have unique ids
#   - The datasets have the exact same length
def eval_log_sample_source(
    eval_log: EvalLog | None,
    eval_log_info: EvalLogInfo | None,
    dataset: Dataset,
) -> EvalSampleSource:
    # return dummy function for no sample source
    async def no_sample_source(id: int | str, epoch: int) -> None:
        return None

    # take care of no log or no samples in log
    if not eval_log:
        return no_sample_source
    elif (not eval_log.samples or len(eval_log.samples) == 0) and not eval_log_info:
        return no_sample_source

    # determine whether all samples in the dataset have ids (if not, then we can't
    # provide a sample source in the case where either dataset is shuffled, as the ids
    # will be auto-assigned based on position, and therefore not stable)
    samples_have_ids = (
        next((sample for sample in dataset if sample.id is None), None) is None
    )

    if (eval_log.eval.dataset.shuffled or dataset.shuffled) and not samples_have_ids:
        py_logger.warning(
            "Unable to re-use samples from retry log file because the dataset was shuffled "
            + "and some samples in the dataset do not have an 'id' field."
        )
        return no_sample_source

    elif eval_log.eval.dataset.samples != len(dataset):
        py_logger.warning(
            "Unable to re-use samples from retry log file because the dataset size changed "
            + f"(log samples {eval_log.eval.dataset.samples}, dataset samples {len(dataset)})"
        )
        return no_sample_source
    elif eval_log_info:
        reader: AsyncZipReader | None = None

        async def read_from_file(id: int | str, epoch: int) -> EvalSample | None:
            nonlocal reader
            if not reader:
                reader = AsyncZipReader(get_async_filesystem(), eval_log_info.name)
            try:
                sample = await read_eval_log_sample_async(
                    eval_log_info, id, epoch, reader=reader
                )
                if sample.error is not None or sample.invalidation is not None:
                    return None
                return sample
            except IndexError:
                return None

        return read_from_file
    else:

        async def read_from_memory(id: int | str, epoch: int) -> EvalSample | None:
            return next(
                (
                    sample
                    for sample in (eval_log.samples or [])
                    if sample.id == id
                    and sample.epoch == epoch
                    and sample.error is None
                    and sample.invalidation is None
                ),
                None,
            )

        return read_from_memory


# semaphore to limit concurrency. default max_samples to
# max_connections + 1 if not explicitly specified (this is
# to make sure it always saturates the connection pool)
def create_sample_semaphore(
    config: EvalConfig,
    generate_config: GenerateConfig,
    modelapi: ModelAPI | None = None,
) -> anyio.Semaphore:
    # if the user set max_samples then use that
    if config.max_samples is not None:
        return anyio.Semaphore(config.max_samples)

    # use max_connections
    max_samples = (
        generate_config.max_connections
        if generate_config.max_connections is not None
        else DEFAULT_MAX_CONNECTIONS_BATCH
        if generate_config.batch
        else modelapi.max_connections()
        if modelapi
        else DEFAULT_MAX_CONNECTIONS
    )

    # return the semaphore
    return anyio.Semaphore(max_samples)


def init_sample_assistant_internal() -> None:
    if importlib.util.find_spec("openai"):
        try:
            from inspect_ai.model._openai_responses import (
                init_sample_openai_assistant_internal,
            )

            init_sample_openai_assistant_internal()
        except ImportError:
            pass

    if importlib.util.find_spec("anthropic"):
        try:
            from inspect_ai.model._providers.anthropic import (
                init_sample_anthropic_assistant_internal,
            )

            init_sample_anthropic_assistant_internal()
        except ImportError:
            pass
```

## `_eval/task/sandbox.py`

```python
import base64
import contextlib
import os
from random import random
from typing import AsyncGenerator, Callable, NamedTuple, cast

import anyio
import httpx
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    stop_after_delay,
    wait_exponential_jitter,
)

from inspect_ai._eval.task.task import Task
from inspect_ai._eval.task.util import task_run_dir
from inspect_ai._util.file import FileSystem, file, filesystem
from inspect_ai._util.httpx import httpx_should_retry, log_httpx_retry_attempt
from inspect_ai._util.path import chdir
from inspect_ai._util.registry import registry_unqualified_name
from inspect_ai._util.url import data_uri_to_base64, is_data_uri, is_http_url
from inspect_ai.dataset import Sample
from inspect_ai.util._concurrency import concurrency
from inspect_ai.util._sandbox.compose import (
    is_docker_compatible_config,
    is_docker_compatible_sandbox_type,
)
from inspect_ai.util._sandbox.context import (
    cleanup_sandbox_environments_sample,
    init_sandbox_environments_sample,
)
from inspect_ai.util._sandbox.environment import (
    SandboxEnvironment,
    SandboxEnvironmentConfigType,
    SandboxEnvironmentSpec,
    TaskInitEnvironment,
)
from inspect_ai.util._sandbox.registry import registry_find_sandboxenv


@contextlib.asynccontextmanager
async def sandboxenv_context(
    task_name: str,
    sandbox: SandboxEnvironmentSpec | None,
    max_sandboxes: int | None,
    cleanup: bool,
    sample: Sample,
) -> AsyncGenerator[None, None]:
    # resolve sandbox
    sandbox = await resolve_sandbox(sandbox, sample)
    if not sandbox:
        raise ValueError("sandboxenv_context called with no sandbox specified")

    # get sandboxenv_type
    sandboxenv_type = registry_find_sandboxenv(sandbox.type)

    # see if there is a max_sandboxes in play (passed or from type)
    if max_sandboxes is None:
        default_concurrency_fn = cast(
            Callable[[], int | None], getattr(sandboxenv_type, "default_concurrency")
        )
        max_sandboxes = default_concurrency_fn()

    # if we are enforcing max_sandboxes, then when samples are scheduled they may
    # not get interleaved properly across tasks (because the first task will come
    # in and grab all of the sandboxes). Therefore, in this case we wait a random
    # delay so that all tasks/samples have an equal shot at getting scheduled.
    if max_sandboxes is not None:
        await anyio.sleep(random())

    # enforce concurrency if required
    sandboxes_cm = (
        concurrency(sandbox.type, max_sandboxes, f"sandboxes/{sandbox.type}")
        if max_sandboxes is not None
        else contextlib.nullcontext()
    )

    async with sandboxes_cm:
        # read files from sample
        files: dict[str, bytes] = {}
        if sample.files:
            resolved_files = resolve_sample_files(sample.files)
            for path, contents in resolved_files.items():
                files[path] = await read_sandboxenv_file(contents)

        # read setup script from sample (add bash shebang if necessary)
        setup: bytes | None = None
        if sample.setup:
            setup = await read_sandboxenv_file(sample.setup)
            setup_str = setup.decode(encoding="utf-8")
            if not setup_str.strip().startswith("#!"):
                setup_str = f"#!/usr/bin/env bash\n\n{setup_str}"
                setup = setup_str.encode(encoding="utf-8")

        interrupted = False
        environments: dict[str, SandboxEnvironment] | None = None
        try:
            # initialize sandbox environment,
            environments = await init_sandbox_environments_sample(
                sandboxenv_type=sandboxenv_type,
                task_name=registry_unqualified_name(task_name),
                config=sandbox.config,
                files=files,
                setup=setup,
                metadata=sample.metadata if sample.metadata else {},
            )

            # run sample
            yield

        except anyio.get_cancelled_exc_class() as ex:
            interrupted = True
            raise ex

        finally:
            # cleanup sandbox environment
            if environments and cleanup:
                with anyio.CancelScope(shield=interrupted):
                    await cleanup_sandbox_environments_sample(
                        type=sandbox.type,
                        task_name=task_name,
                        config=sandbox.config,
                        environments=environments,
                        interrupted=interrupted,
                    )


def resolve_sample_files(files: dict[str, str]) -> dict[str, str]:
    # if the source path is a directory then add its files recursively
    resolved_files: dict[str, str] = dict()
    for key, contents in files.items():
        fs = filesystem_for_file(contents)
        if (
            fs is not None
            and fs.exists(contents)
            and fs.info(contents).type == "directory"
        ):
            root_uri = fs.path_as_uri(contents)
            for file in fs.ls(contents, recursive=True):
                if file.type == "file":
                    file_uri = fs.path_as_uri(file.name)
                    file_relative = file_uri.removeprefix(root_uri)[1:]
                    resolved_files[os.path.join(key, file_relative)] = file.name
        else:
            resolved_files[key] = contents

    return resolved_files


async def read_sandboxenv_file(contents: str) -> bytes:
    if is_data_uri(contents):
        contents_base64 = data_uri_to_base64(contents)
        file_bytes = base64.b64decode(contents_base64)
    elif is_http_url(contents):
        file_bytes = await _retrying_httpx_get(contents)
    else:
        # try to read as a file (if it doesn't exist or has a path not cool w/
        # the filesystem then we fall back to contents)
        try:
            fs = filesystem(contents)
            if fs.exists(contents):
                with file(contents, "rb") as f:
                    file_bytes = f.read()
            else:
                file_bytes = contents.encode("utf-8")
        except Exception:
            file_bytes = contents.encode("utf-8")

    return file_bytes


def filesystem_for_file(contents: str) -> FileSystem | None:
    if is_data_uri(contents):
        return None
    elif is_http_url(contents):
        return None
    else:
        try:
            return filesystem(contents)
        except Exception:
            return None


class TaskSandboxEnvironment(NamedTuple):
    sandbox: SandboxEnvironmentSpec
    run_dir: str
    env: tuple[tuple[str, str], ...]


async def resolve_sandbox_for_task_and_sample(
    eval_sandbox: SandboxEnvironmentSpec | None,
    task: Task,
    sample: Sample,
) -> TaskSandboxEnvironment | None:
    # eval_sandbox overrides task or sample sandbox
    sandbox = eval_sandbox or await resolve_sandbox(task.sandbox, sample)
    if sandbox is not None:
        # see if there are environment variables required for init of this sample
        run_dir = task_run_dir(task)
        with chdir(run_dir):
            sandboxenv_type = registry_find_sandboxenv(sandbox.type)
            task_init_environment = cast(
                TaskInitEnvironment, getattr(sandboxenv_type, "task_init_environment")
            )
            env = await task_init_environment(sandbox.config, sample.metadata or {})

        return TaskSandboxEnvironment(
            sandbox=sandbox, run_dir=run_dir, env=tuple(sorted(env.items()))
        )
    else:
        return None


async def resolve_sandbox(
    sandbox: SandboxEnvironmentSpec | None,
    sample: Sample,
) -> SandboxEnvironmentSpec | None:
    # resolved sandbox
    resolved_sandbox: SandboxEnvironmentSpec | None = None

    # resolve sandbox (task type overrides sample type, but sample config
    # file overrides task config file if they have the same type or if
    # the sample has a docker compatible config)
    task_sandbox = sandbox
    if task_sandbox is not None:
        if (
            sample.sandbox
            and sample.sandbox.config is not None
            and (
                # share the same type
                (sample.sandbox.type == task_sandbox.type)
                # have a docker compatible config => docker compatible sandbox type
                or (
                    is_docker_compatible_config(sample.sandbox.config)
                    and is_docker_compatible_sandbox_type(task_sandbox.type)
                )
            )
        ):
            sandbox_config: SandboxEnvironmentConfigType | None = sample.sandbox.config
        else:
            sandbox_config = task_sandbox.config
        resolved_sandbox = SandboxEnvironmentSpec(task_sandbox.type, sandbox_config)
    elif sample.sandbox is not None:
        resolved_sandbox = sample.sandbox

    return resolved_sandbox


async def _retrying_httpx_get(
    url: str,
    client: httpx.AsyncClient = httpx.AsyncClient(),
    timeout: int = 30,  # per-attempt timeout
    max_retries: int = 10,
    total_timeout: int = 120,  #  timeout for the whole retry loop. not for an individual attempt
) -> bytes:
    @retry(
        wait=wait_exponential_jitter(),
        stop=(stop_after_attempt(max_retries) | stop_after_delay(total_timeout)),
        retry=retry_if_exception(httpx_should_retry),
        before_sleep=log_httpx_retry_attempt(url),
    )
    async def do_get() -> bytes:
        response = await client.get(
            url=url,
            follow_redirects=True,
            timeout=(timeout, timeout, timeout, timeout),
        )
        response.raise_for_status()
        return response.content

    return await do_get()
```

## `_eval/task/store.py`

```python
"""Disk-paged sample store for large datasets."""

import os
import pickle
import sys
import tempfile
from typing import Any, BinaryIO, Sequence, cast

from inspect_ai.dataset import Dataset, Sample


class DiskSampleStore:
    """Stores samples on disk, providing indexed access via pickle."""

    def __init__(self, samples: Sequence[Sample]) -> None:
        self._len = len(samples)
        fd, self._path = tempfile.mkstemp(suffix=".pkl")
        try:
            with os.fdopen(fd, "wb") as f:
                self._offsets: list[int] = []
                for sample in samples:
                    self._offsets.append(f.tell())
                    pickle.dump(sample, f)
        except Exception:
            try:
                os.close(fd)
            except OSError:
                pass
            try:
                os.unlink(self._path)
            except OSError:
                pass
            raise
        self._reader: BinaryIO | None = None

    def __len__(self) -> int:
        return self._len

    def __getitem__(self, index: int) -> Sample:
        if self._reader is None:
            self._reader = open(self._path, "rb")
        self._reader.seek(self._offsets[index])
        return cast(Sample, pickle.load(self._reader))  # noqa: S301

    def close(self) -> None:
        try:
            if self._reader is not None:
                self._reader.close()
                self._reader = None
            os.unlink(self._path)
        except Exception:
            pass


def deep_getsizeof(obj: Any, seen: set[int] | None = None) -> int:
    """Recursively measure total memory of an object graph."""
    if seen is None:
        seen = set()
    obj_id = id(obj)
    if obj_id in seen:
        return 0
    seen.add(obj_id)
    size = sys.getsizeof(obj)
    if isinstance(obj, dict):
        size += sum(
            deep_getsizeof(k, seen) + deep_getsizeof(v, seen) for k, v in obj.items()
        )
    elif isinstance(obj, (list, tuple, set, frozenset)):
        size += sum(deep_getsizeof(i, seen) for i in obj)
    elif hasattr(obj, "__dict__"):
        size += deep_getsizeof(obj.__dict__, seen)
    elif hasattr(obj, "__slots__"):
        size += sum(
            deep_getsizeof(getattr(obj, s), seen)
            for s in obj.__slots__
            if hasattr(obj, s)
        )
    return size


def maybe_page_to_disk(
    dataset: Dataset, max_dataset_memory_mb: int | None
) -> Dataset | DiskSampleStore:
    """Page dataset to disk if estimated memory exceeds budget."""
    if max_dataset_memory_mb is None or len(dataset) == 0:
        return dataset

    # Probe a few samples to estimate per-sample memory
    probe_count = min(10, len(dataset))
    total_bytes = sum(deep_getsizeof(dataset[i]) for i in range(probe_count))
    avg_bytes = total_bytes / probe_count
    estimated_memory = avg_bytes * len(dataset)
    budget_bytes = max_dataset_memory_mb * 1024 * 1024

    if estimated_memory > budget_bytes:
        return DiskSampleStore(dataset)
    return dataset
```

## `_eval/task/task.py`

```python
from __future__ import annotations

from dataclasses import dataclass
from logging import getLogger
from typing import TYPE_CHECKING, Any, Awaitable, Callable, Sequence, cast, overload

from inspect_ai.util._early_stopping import EarlyStopping

if TYPE_CHECKING:
    from inspect_ai.scorer._scorers import Scorers

from pydantic import BaseModel
from typing_extensions import TypedDict, Unpack

from inspect_ai._util.logger import warn_once
from inspect_ai._util.notgiven import NOT_GIVEN, NotGiven
from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_info,
    registry_unqualified_name,
    set_registry_info,
)
from inspect_ai.agent._agent import Agent, is_agent
from inspect_ai.agent._as_solver import as_solver
from inspect_ai.approval._policy import (
    ApprovalPolicy,
    ApprovalPolicyConfig,
    approval_policies_from_config,
)
from inspect_ai.dataset import Dataset, MemoryDataset, Sample
from inspect_ai.log import EvalLog, EvalLogInfo
from inspect_ai.model import GenerateConfig
from inspect_ai.model._model import Model
from inspect_ai.model._util import resolve_model, resolve_model_roles
from inspect_ai.scorer import Metric, Scorer
from inspect_ai.scorer._reducer import ScoreReducers, create_reducers
from inspect_ai.solver import Plan, Solver, generate
from inspect_ai.solver._chain import chain
from inspect_ai.solver._task_state import TaskState
from inspect_ai.util._sandbox.environment import (
    SandboxEnvironmentSpec,
    SandboxEnvironmentType,
    resolve_sandbox_environment,
)

from .epochs import Epochs

logger = getLogger(__name__)


class TaskDeprecatedArgs(TypedDict, total=False):
    plan: Plan | Solver | list[Solver]
    tool_environment: str | SandboxEnvironmentSpec | None
    epochs_reducer: ScoreReducers | None
    max_messages: int | None


class Task:
    r"""Evaluation task.

    Tasks are the basis for defining and running evaluations.
    """

    def __init__(
        self,
        dataset: Dataset | Sequence[Sample] | None = None,
        setup: Solver | list[Solver] | None = None,
        solver: Solver | Agent | list[Solver] = generate(),
        cleanup: Callable[[TaskState], Awaitable[None]] | None = None,
        scorer: "Scorers" | None = None,
        metrics: list[Metric | dict[str, list[Metric]]]
        | dict[str, list[Metric]]
        | None = None,
        model: str | Model | None = None,
        config: GenerateConfig = GenerateConfig(),
        model_roles: dict[str, str | Model] | None = None,
        sandbox: SandboxEnvironmentType | None = None,
        approval: str | ApprovalPolicyConfig | list[ApprovalPolicy] | None = None,
        epochs: int | Epochs | None = None,
        fail_on_error: bool | float | None = None,
        continue_on_fail: bool | None = None,
        message_limit: int | None = None,
        token_limit: int | None = None,
        time_limit: int | None = None,
        working_limit: int | None = None,
        cost_limit: float | None = None,
        early_stopping: "EarlyStopping" | None = None,
        display_name: str | None = None,
        name: str | None = None,
        version: int | str = 0,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
        **kwargs: Unpack[TaskDeprecatedArgs],
    ) -> None:
        """Create a task.

        Args:
            dataset: Dataset to evaluate
            setup: Setup step (always run even when the main `solver` is replaced).
            solver: Solver or list of solvers. Defaults to generate(), a normal call to the model.
            cleanup: Optional cleanup function for task. Called after
                all solvers and scorers have run for each sample (including if an
                exception occurs during the run)
            scorer: Scorer used to evaluate model output.
            metrics: Alternative metrics (overrides the metrics provided by the specified scorer).
            model: Default model for task (Optional, defaults to eval model).
            config: Model generation config for default model (does not apply to model roles)
            model_roles: Named roles for use in `get_model()`.
            sandbox: Sandbox environment type (or optionally a str or tuple with a shorthand spec)
            approval: Tool use approval policies.
                Either a path to an approval policy config file, an ApprovalPolicyConfig, or a list of approval policies. Defaults to no approval policy.
            epochs: Epochs to repeat samples for and optional score
                reducer function(s) used to combine sample scores (defaults to "mean")
            fail_on_error: `True` to fail on first sample error
                (default); `False` to never fail on sample errors; Value between 0 and 1
                to fail if a proportion of total samples fails. Value greater than 1 to fail
                eval if a count of samples fails.
            continue_on_fail: `True` to continue running and only fail at the end if the `fail_on_error` condition is met.
                `False` to fail eval immediately when the `fail_on_error` condition is met (default).
            message_limit: Limit on total messages used for each sample.
            token_limit: Limit on total tokens used for each sample.
            time_limit: Limit on clock time (in seconds) for samples.
            working_limit: Limit on working time (in seconds) for sample. Working
                time includes model generation, tool calls, etc. but does not include
                time spent waiting on retries or shared resources.
            cost_limit: Limit on total cost (in dollars) for each sample.
                Requires model cost data via set_model_cost() or --model-cost-config.
            early_stopping: Early stopping callbacks.
            name: Task name. If not specified is automatically
                determined based on the registered name of the task.
            display_name: Task display name (e.g. for plotting). If not specified then defaults to the registered task name.
            version: Version of task (to distinguish evolutions
                of the task spec or breaking changes to it)
            metadata:  Additional metadata to associate with the task.
            tags: Tags to associate with the task.
            **kwargs: Deprecated arguments.
        """
        # handle deprecated args
        for arg, value in kwargs.items():
            newarg = ""
            if arg == "tool_environment":
                newarg = "sandbox"
                sandbox = cast(str | SandboxEnvironmentSpec | None, value)
            elif arg == "epochs_reducer":
                newarg = "epochs"
                if isinstance(epochs, int):
                    epochs = Epochs(
                        epochs, create_reducers(cast(ScoreReducers | None, value))
                    )
            elif arg == "plan":
                # no deprecation warning (yet) as it would affect 100% of evals in the wild
                solver = cast(Solver, value)
            elif arg == "max_messages":
                # no deprecation warning (yet) as many tasks set this
                message_limit = int(cast(int, value))
            if newarg:
                warn_once(
                    logger,
                    f"DEPRECATED: the '{arg}' parameter is deprecated (please use the '{newarg}' parameter instead)",
                )

        self.dataset = resolve_dataset(dataset)
        self.setup = setup
        self.solver = resolve_solver(solver)
        self.cleanup = cleanup
        self.scorer = resolve_scorer_metrics(resolve_scorer(scorer), metrics)
        self.metrics = metrics
        self.model = resolve_model(model)
        self.config = config
        self.model_roles = resolve_model_roles(model_roles)
        self.sandbox = resolve_sandbox_environment(sandbox)
        self.approval = resolve_approval(approval)
        epochs = resolve_epochs(epochs)
        self.epochs = epochs.epochs if epochs else None
        self.epochs_reducer = epochs.reducer if epochs else None
        self.fail_on_error = fail_on_error
        self.continue_on_fail = continue_on_fail
        self.message_limit = message_limit
        self.token_limit = token_limit
        self.time_limit = time_limit
        self.working_limit = working_limit
        self.cost_limit = cost_limit
        self.early_stopping = early_stopping
        self.version = version
        self._display_name = display_name
        self._name = name
        self.metadata = metadata
        self.tags = tags

    @property
    def name(self) -> str:
        if self._name is not None:
            return self._name
        elif is_registry_object(self):
            return registry_info(self).name
        else:
            return "task"

    @property
    def registry_name(self) -> str | None:
        if is_registry_object(self):
            return registry_info(self).name
        else:
            return None

    @property
    def display_name(self) -> str:
        if self._display_name is not None:
            return self._display_name
        elif self._name is not None:
            return self._name
        elif is_registry_object(self):
            return registry_unqualified_name(self)
        else:
            return "task"

    @property
    def attribs(self) -> dict[str, Any]:
        if is_registry_object(self):
            return cast(dict[str, Any], registry_info(self).metadata.get("attribs", {}))
        else:
            return dict()


def task_with(
    task: Task,
    *,
    dataset: Dataset | Sequence[Sample] | None | NotGiven = NOT_GIVEN,
    setup: Solver | list[Solver] | None | NotGiven = NOT_GIVEN,
    solver: Solver | Agent | list[Solver] | NotGiven = NOT_GIVEN,
    cleanup: Callable[[TaskState], Awaitable[None]] | None | NotGiven = NOT_GIVEN,
    scorer: "Scorers" | None | NotGiven = NOT_GIVEN,
    metrics: list[Metric | dict[str, list[Metric]]]
    | dict[str, list[Metric]]
    | None
    | NotGiven = NOT_GIVEN,
    model: str | Model | NotGiven = NOT_GIVEN,
    config: GenerateConfig | NotGiven = NOT_GIVEN,
    model_roles: dict[str, str | Model] | NotGiven = NOT_GIVEN,
    sandbox: SandboxEnvironmentType | None | NotGiven = NOT_GIVEN,
    approval: str
    | ApprovalPolicyConfig
    | list[ApprovalPolicy]
    | None
    | NotGiven = NOT_GIVEN,
    epochs: int | Epochs | None | NotGiven = NOT_GIVEN,
    fail_on_error: bool | float | None | NotGiven = NOT_GIVEN,
    continue_on_fail: bool | None | NotGiven = NOT_GIVEN,
    message_limit: int | None | NotGiven = NOT_GIVEN,
    token_limit: int | None | NotGiven = NOT_GIVEN,
    time_limit: int | None | NotGiven = NOT_GIVEN,
    working_limit: int | None | NotGiven = NOT_GIVEN,
    cost_limit: float | None | NotGiven = NOT_GIVEN,
    early_stopping: EarlyStopping | None | NotGiven = NOT_GIVEN,
    name: str | None | NotGiven = NOT_GIVEN,
    version: int | str | NotGiven = NOT_GIVEN,
    metadata: dict[str, Any] | None | NotGiven = NOT_GIVEN,
    tags: list[str] | None | NotGiven = NOT_GIVEN,
) -> Task:
    """Task adapted with alternate values for one or more options.

    This function modifies the passed task in place and returns it.
    If you want to create multiple variations of a single task using
    `task_with()` you should create the underlying task multiple times.

    Args:
        task: Task to adapt
        dataset: Dataset to evaluate
        setup: Setup step (always run even when the main `solver` is replaced).
        solver: Solver or list of solvers. Defaults to generate(), a normal call to the model.
        cleanup: Optional cleanup function for task. Called after
            all solvers and scorers have run for each sample (including if an
            exception occurs during the run)
        scorer: Scorer used to evaluate model output.
        metrics: Alternative metrics (overrides the metrics provided by the specified scorer).
        model: Default model for task (Optional, defaults to eval model).
        config: Model generation config for default model (does not apply to model roles)
        model_roles: Named roles for use in `get_model()`.
        sandbox: Sandbox environment type (or optionally a str or tuple with a shorthand spec)
        approval: Tool use approval policies.
            Either a path to an approval policy config file, an ApprovalPolicyConfig, or a list of approval policies. Defaults to no approval policy.
        epochs: Epochs to repeat samples for and optional score
            reducer function(s) used to combine sample scores (defaults to "mean")
        fail_on_error: `True` to fail on first sample error
            (default); `False` to never fail on sample errors; Value between 0 and 1
            to fail if a proportion of total samples fails. Value greater than 1 to fail
            eval if a count of samples fails.
        continue_on_fail: `True` to continue running and only fail at the end if the `fail_on_error` condition is met.
            `False` to fail eval immediately when the `fail_on_error` condition is met (default).
        message_limit: Limit on total messages used for each sample.
        token_limit: Limit on total tokens used for each sample.
        time_limit: Limit on clock time (in seconds) for samples.
        working_limit: Limit on working time (in seconds) for sample. Working
            time includes model generation, tool calls, etc. but does not include
            time spent waiting on retries or shared resources.
        cost_limit: Limit on total cost (in dollars) for each sample.
            Requires model cost data via set_model_cost() or --model-cost-config.
        early_stopping: Early stopping callbacks.
        name: Task name. If not specified is automatically
            determined based on the name of the task directory (or "task")
            if its anonymous task (e.g. created in a notebook and passed to
            eval() directly)
        version: Version of task (to distinguish evolutions
            of the task spec or breaking changes to it)
        metadata:  Additional metadata to associate with the task.
        tags: Tags to associate with the task.

    Returns:
        Task: Passed `task` with modifications.
    """
    if not isinstance(dataset, NotGiven):
        task.dataset = resolve_dataset(dataset)
    if not isinstance(setup, NotGiven):
        task.setup = setup
    if not isinstance(solver, NotGiven):
        task.solver = resolve_solver(solver)
    if not isinstance(cleanup, NotGiven):
        task.cleanup = cleanup
    if not isinstance(scorer, NotGiven):
        task.scorer = resolve_scorer(scorer)
    if not isinstance(metrics, NotGiven):
        task.metrics = metrics
    if not isinstance(model, NotGiven):
        task.model = resolve_model(model)
    if not isinstance(config, NotGiven):
        task.config = config
    if not isinstance(model_roles, NotGiven):
        task.model_roles = resolve_model_roles(model_roles)
    if not isinstance(sandbox, NotGiven):
        task.sandbox = resolve_sandbox_environment(sandbox)
    if not isinstance(approval, NotGiven):
        task.approval = resolve_approval(approval)
    if not isinstance(epochs, NotGiven):
        epochs = resolve_epochs(epochs)
        task.epochs = epochs.epochs if epochs else None
        task.epochs_reducer = epochs.reducer if epochs else None
    if not isinstance(fail_on_error, NotGiven):
        task.fail_on_error = fail_on_error
    if not isinstance(continue_on_fail, NotGiven):
        task.continue_on_fail = continue_on_fail
    if not isinstance(message_limit, NotGiven):
        task.message_limit = message_limit
    if not isinstance(token_limit, NotGiven):
        task.token_limit = token_limit
    if not isinstance(time_limit, NotGiven):
        task.time_limit = time_limit
    if not isinstance(working_limit, NotGiven):
        task.working_limit = working_limit
    if not isinstance(cost_limit, NotGiven):
        task.cost_limit = cost_limit
    if not isinstance(early_stopping, NotGiven):
        task.early_stopping = early_stopping
    if not isinstance(version, NotGiven):
        task.version = version
    if not isinstance(name, NotGiven):
        task._name = name
    if not isinstance(metadata, NotGiven):
        task.metadata = metadata
    if not isinstance(tags, NotGiven):
        task.tags = tags

    # return modified task
    return task


class TaskInfo(BaseModel):
    """Task information (file, name, and attributes)."""

    file: str
    """File path where task was loaded from."""

    name: str
    """Task name (defaults to function name)"""

    attribs: dict[str, Any]
    """Task attributes (arguments passed to `@task`)"""

    def __str__(self) -> str:
        return f"{self.file}@{self.name}"

    def __hash__(self) -> int:
        return hash(
            (self.file, self.name)
            + tuple(self.attribs.keys())
            + tuple(self.attribs.values())
        )


@dataclass
class PreviousTask:
    id: str
    task: str | Task
    task_args: dict[str, Any]
    model: Model | None
    model_roles: dict[str, Model] | None
    log: EvalLog
    log_info: EvalLogInfo | None


def resolve_approval(
    approval: str | ApprovalPolicyConfig | list[ApprovalPolicy] | None,
) -> list[ApprovalPolicy] | None:
    return (
        approval_policies_from_config(approval)
        if isinstance(approval, str | ApprovalPolicyConfig)
        else approval
    )


def resolve_epochs(epochs: int | Epochs | None) -> Epochs | None:
    if isinstance(epochs, int):
        epochs = Epochs(epochs)
    if epochs is not None and epochs.epochs < 1:
        raise ValueError("epochs must be a positive integer.")
    return epochs


def resolve_dataset(dataset: Dataset | Sequence[Sample] | None) -> Dataset:
    # this is a convenience for tests that don't want to define a dummy sample
    if dataset is None:
        dataset = [Sample(input="prompt")]

    # raise error if the dataset is empty
    if len(dataset) == 0:
        raise ValueError("The specified dataset is empty (has no samples)")

    # resolve sequence to dataset if necessary
    return dataset if isinstance(dataset, Dataset) else MemoryDataset(list(dataset))


def resolve_solver(solver: Solver | Agent | list[Solver]) -> Solver:
    if isinstance(solver, list):
        return chain(solver)
    elif is_agent(solver):
        return as_solver(solver)
    else:
        return cast(Solver, solver)


@overload
def resolve_scorer(scorer: "Scorers") -> list[Scorer]: ...


@overload
def resolve_scorer(scorer: None) -> None: ...


def resolve_scorer(
    scorer: "Scorers" | None = None,
) -> list[Scorer] | None:
    if scorer is None:
        return scorer

    scorers = list(scorer) if isinstance(scorer, Sequence) else [scorer]
    return [to_scorer(s) for s in scorers]


def to_scorer(s: Any) -> Scorer:
    if is_registry_object(s, type="scanner"):
        from inspect_scout import as_scorer

        return as_scorer(s)
    elif is_registry_object(s, type="scorer"):
        return cast(Scorer, s)
    else:
        raise TypeError(f"Unexpected scorer type: {type(s)}")


AGENT_DESCRIPTION = "description"


def resolve_scorer_metrics(
    scorers: list[Scorer] | None,
    metrics: list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]] | None,
) -> list[Scorer] | None:
    if scorers is not None and metrics is not None:
        for scorer in scorers:
            scorer_info = registry_info(scorer)
            new_metadata = {**scorer_info.metadata, "metrics": metrics}
            new_info = RegistryInfo(
                type=scorer_info.type, name=scorer_info.name, metadata=new_metadata
            )
            set_registry_info(scorer, new_info)
    return scorers
```

## `_eval/task/tasks.py`

```python
from typing import Callable, TypeAlias

from .resolved import ResolvedTask
from .task import PreviousTask, Task, TaskInfo

Tasks: TypeAlias = (
    str
    | PreviousTask
    | ResolvedTask
    | TaskInfo
    | Task
    | Callable[..., Task]
    | type[Task]
    | list[str]
    | list[PreviousTask]
    | list[ResolvedTask]
    | list[PreviousTask | ResolvedTask]
    | list[TaskInfo]
    | list[Task]
    | list[Callable[..., Task]]
    | list[type[Task]]
    | None
)
r"""One or more tasks.

Tasks to be evaluated. Many forms of task specification are
supported including directory names, task functions, task
classes, and task instances (a single task or list of tasks
can be specified). None is a request to read a task out
of the current working directory.
"""
```

## `_eval/task/util.py`

```python
import os
import reprlib
from copy import deepcopy
from fnmatch import fnmatch
from logging import getLogger
from typing import cast

from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.logger import warn_once
from inspect_ai._util.path import cwd_relative_path
from inspect_ai.dataset import Sample
from inspect_ai.dataset._dataset import Dataset
from inspect_ai.dataset._util import normalise_sample_id
from inspect_ai.model import ChatMessage, ChatMessageUser

from ..task import Task
from .constants import TASK_FILE_ATTR, TASK_RUN_DIR_ATTR

logger = getLogger(__name__)


def sample_messages(sample: Sample) -> list[ChatMessage]:
    if isinstance(sample.input, str):
        return [ChatMessageUser(content=sample.input, source="input")]
    else:
        messages = deepcopy(sample.input)
        for message in messages:
            message.source = "input"
        return messages


def task_run_dir(task: Task) -> str:
    return getattr(task, TASK_RUN_DIR_ATTR, os.getcwd())


def task_file(task: Task, relative: bool = False) -> str | None:
    file = cast(str | None, getattr(task, TASK_FILE_ATTR, None))
    if file:
        if relative:
            return cwd_relative_path(file)
        else:
            return file
    else:
        return None


def slice_dataset(
    dataset: Dataset,
    limit: int | tuple[int, int] | None,
    sample_id: str | int | list[str] | list[int] | list[str | int] | None,
) -> Dataset:
    if sample_id is not None:
        # reduce to list of normalized sample ids
        sample_ids = sample_id if isinstance(sample_id, list) else [sample_id]
        sample_id = [normalise_sample_id(id) for id in sample_ids]

        # validate all the sample ids and warn if they aren't in the dataset
        all_sample_ids_raw = [sample.id for sample in dataset]
        all_sample_ids = [normalise_sample_id(id) for id in all_sample_ids_raw]
        for id in sample_id:
            if id not in all_sample_ids:
                warn_once(
                    logger, f"sample id '{id}' not found in dataset '{dataset.name}'."
                )

        # helper to check for a matching sample id
        def include_sample(sample: Sample) -> bool:
            id = normalise_sample_id(sample.id)
            return any(fnmatch(id, pat) for pat in sample_id)

        # filter the dataset
        filtered = dataset.filter(include_sample)

        # raise error if we got no hits
        if len(filtered) == 0:
            filter = ",".join([str(id) for id in sample_id])
            r = reprlib.Repr()
            r.maxlist = 8
            raise PrerequisiteError(
                f"No matches in dataset '{dataset.name}' for sample_id filter '{filter}'\n({dataset.name} ids: {r.repr(all_sample_ids_raw)})"
            )

        return filtered
    else:
        dataset_limit = (
            slice(0, len(dataset))
            if limit is None
            else (slice(*limit) if isinstance(limit, tuple) else slice(0, limit))
        )
        return dataset[dataset_limit]


def split_spec(spec: str) -> tuple[str, str | None]:
    parts = spec.rsplit("@", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    else:
        return spec, None
```

# Python Bundle: `log`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `28`

## Files

- `log/__init__.py`
- `log/_bundle.py`
- `log/_condense.py`
- `log/_convert.py`
- `log/_edit.py`
- `log/_file.py`
- `log/_log.py`
- `log/_message.py`
- `log/_metric.py`
- `log/_pool.py`
- `log/_recorders/__init__.py`
- `log/_recorders/buffer/__init__.py`
- `log/_recorders/buffer/buffer.py`
- `log/_recorders/buffer/database.py`
- `log/_recorders/buffer/filestore.py`
- `log/_recorders/buffer/types.py`
- `log/_recorders/create.py`
- `log/_recorders/eval.py`
- `log/_recorders/file.py`
- `log/_recorders/json.py`
- `log/_recorders/recorder.py`
- `log/_recorders/types.py`
- `log/_refusal.py`
- `log/_retry.py`
- `log/_samples.py`
- `log/_score.py`
- `log/_transcript.py`
- `log/_util.py`

## `log/__init__.py`

```python
import sys

from inspect_ai._util.deprecation import relocated_module_attribute
from inspect_ai._util.error import EvalError, WriteConflictError

from ._bundle import bundle_log_dir
from ._condense import (
    condense_events,
    condense_sample,
    expand_events,
    resolve_sample_attachments,
)
from ._convert import convert_eval_logs
from ._edit import (
    LogEdit,
    LogUpdate,
    MetadataEdit,
    ProvenanceData,
    TagsEdit,
    edit_eval_log,
    invalidate_samples,
    uninvalidate_samples,
)
from ._file import (
    EvalLogInfo,
    list_eval_logs,
    read_eval_log,
    read_eval_log_async,
    read_eval_log_sample,
    read_eval_log_sample_summaries,
    read_eval_log_samples,
    write_eval_log,
    write_eval_log_async,
    write_log_dir_manifest,
)
from ._log import (
    EvalConfig,
    EvalDataset,
    EvalLog,
    EvalMetric,
    EvalPlan,
    EvalPlanStep,
    EvalResults,
    EvalRevision,
    EvalSample,
    EvalSampleLimit,
    EvalSampleReductions,
    EvalSampleScore,
    EvalSampleSummary,
    EvalScore,
    EvalSpec,
    EvalStats,
    EvalStatus,
    EventsData,
)
from ._metric import recompute_metrics
from ._pool import resolve_sample_events_data
from ._retry import retryable_eval_logs
from ._score import edit_score
from ._transcript import (
    Transcript,
    transcript,
)

__all__ = [
    "WriteConflictError",
    "EvalConfig",
    "EvalError",
    "EvalDataset",
    "EvalLog",
    "EvalMetric",
    "EvalPlan",
    "EvalPlanStep",
    "EvalResults",
    "EvalRevision",
    "EvalSample",
    "EvalSampleLimit",
    "EvalSampleScore",
    "EvalSampleReductions",
    "EvalSampleSummary",
    "EvalScore",
    "EvalSpec",
    "EvalStats",
    "EvalStatus",
    "EvalLogInfo",
    "Transcript",
    "transcript",
    "convert_eval_logs",
    "list_eval_logs",
    "read_eval_log",
    "read_eval_log_async",
    "read_eval_log_sample",
    "read_eval_log_samples",
    "read_eval_log_sample_summaries",
    "condense_sample",
    "condense_events",
    "EventsData",
    "expand_events",
    "resolve_sample_attachments",
    "resolve_sample_events_data",
    "write_eval_log",
    "write_eval_log_async",
    "write_log_dir_manifest",
    "retryable_eval_logs",
    "bundle_log_dir",
    "edit_score",
    "recompute_metrics",
    "ProvenanceData",
    "LogEdit",
    "LogUpdate",
    "MetadataEdit",
    "TagsEdit",
    "edit_eval_log",
    "invalidate_samples",
    "uninvalidate_samples",
]


_EVENT_MODULE_VERSION_3_137 = "0.3.137"
_REMOVED_IN = "0.4"
relocated_module_attribute(
    "ApprovalEvent",
    "inspect_ai.event.ApprovalEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ErrorEvent",
    "inspect_ai.event.ErrorEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "Event",
    "inspect_ai.event.Event",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "InfoEvent",
    "inspect_ai.event.InfoEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "InputEvent",
    "inspect_ai.event.InputEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "LoggerEvent",
    "inspect_ai.event.LoggerEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "LoggingLevel",
    "inspect_ai.event.LoggingLevel",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "LoggingMessage",
    "inspect_ai.event.LoggingMessage",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ModelEvent",
    "inspect_ai.event.ModelEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SampleInitEvent",
    "inspect_ai.event.SampleInitEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SampleLimitEvent",
    "inspect_ai.event.SampleLimitEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SandboxEvent",
    "inspect_ai.event.SandboxEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ScoreEvent",
    "inspect_ai.event.ScoreEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SpanBeginEvent",
    "inspect_ai.event.SpanBeginEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SpanEndEvent",
    "inspect_ai.event.SpanEndEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "StateEvent",
    "inspect_ai.event.StateEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "StepEvent",
    "inspect_ai.event.StepEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "StoreEvent",
    "inspect_ai.event.StoreEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SubtaskEvent",
    "inspect_ai.event.SubtaskEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ToolEvent",
    "inspect_ai.event.ToolEvent",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EventNode",
    "inspect_ai.event.EventNode",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EventTree",
    "inspect_ai.event.EventTree",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SpanNode",
    "inspect_ai.event.SpanNode",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "event_sequence",
    "inspect_ai.event.event_sequence",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)
relocated_module_attribute(
    "event_tree",
    "inspect_ai.event.event_tree",
    _EVENT_MODULE_VERSION_3_137,
    _REMOVED_IN,
)

if sys.version_info < (3, 14):
    # On Python < 3.14, this monkey-patches zipfile to support zstandard compression.
    import zipfile_zstd  # type: ignore[import-not-found, import-untyped]  # noqa: F401
```

## `log/_bundle.py`

```python
import logging
import math
import os
import shutil
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Iterator

from inspect_ai._util.error import PrerequisiteError, pip_dependency_error
from inspect_ai._util.file import absolute_file_path, filesystem

from ._file import log_files_from_ls, write_log_listing

# INSPECT_VIEW_BUNDLE_OUT_DIR

logger = logging.getLogger(__name__)


DIST_DIR = os.path.join(Path(__file__).parent, "..", "_view", "www", "dist")


def _push_bundle_to_hf(
    working_dir: str,
    repo_id: str,
    fs_options: dict[str, Any] = {},
) -> None:
    from inspect_ai._display import display

    try:
        from huggingface_hub import HfApi
    except ImportError:
        raise pip_dependency_error(
            "HuggingFace Hub upload", ["huggingface_hub"]
        ) from None

    api = HfApi()
    repo_id = repo_id.replace("hf/", "")

    api.create_repo(
        repo_id=repo_id,
        repo_type="space",
        space_sdk="static",
        private=fs_options.get("private", True),  # default to Private
        exist_ok=True,
    )

    api.upload_folder(
        folder_path=working_dir,
        repo_id=repo_id,
        repo_type="space",
    )
    display().print(f"View at: https://huggingface.co/spaces/{repo_id}")


def _check_hf_space_exists(repo_id: str) -> bool:
    from huggingface_hub import HfApi

    api = HfApi()
    try:
        api.repo_info(repo_id=repo_id, repo_type="space")
        return True
    except Exception:
        return False


def bundle_log_dir(
    log_dir: str | None = None,
    output_dir: str | None = None,
    overwrite: bool = False,
    fs_options: dict[str, Any] = {},
) -> None:
    r"""Bundle a log_dir into a statically deployable viewer

    Args:
        log_dir: (str | None): The log_dir to bundle
        output_dir: (str | None): The directory to place bundled output. If no directory
            is specified, the env variable `INSPECT_VIEW_BUNDLE_OUTPUT_DIR` will be used.
            If the path starts with 'hf/', it will be uploaded to HuggingFace Hub.
        overwrite: (bool): Optional. Whether to overwrite files in the output directory.
            Defaults to False.
        fs_options (dict[str, Any]): Optional. Additional arguments to pass through
            to the filesystem provider (e.g. `S3FileSystem`).
    """
    # resolve the log directory
    log_dir = log_dir if log_dir else os.getenv("INSPECT_LOG_DIR", "./logs")

    # resolve the output directory
    output_dir = (
        output_dir if output_dir else os.getenv("INSPECT_VIEW_BUNDLE_OUTPUT_DIR", "")
    )
    if output_dir == "":
        raise PrerequisiteError("You must provide an 'output_dir'")

    # ensure output_dir is not a subdirectory of log_dir
    log_fs = filesystem(log_dir, fs_options)
    log_dir_abs = absolute_file_path(log_dir).rstrip(log_fs.sep) + log_fs.sep
    output_dir_abs = absolute_file_path(output_dir).rstrip(log_fs.sep) + log_fs.sep
    if output_dir_abs.startswith(log_dir_abs):
        raise PrerequisiteError(
            f"The output directory '{output_dir}' cannot be a subdirectory of the log directory '{log_dir}'"
        )

    # ensure output_dir doesn't exist
    if output_dir.startswith("hf/"):
        if _check_hf_space_exists(output_dir.replace("hf/", "")) and not overwrite:
            raise PrerequisiteError(
                f"The HuggingFace space '{output_dir.replace('hf/', '')}' already exists. Choose another output directory or use 'overwrite' to overwrite the directory and contents"
            )
    else:
        if filesystem(output_dir, fs_options).exists(output_dir) and not overwrite:
            raise PrerequisiteError(
                f"The output directory '{output_dir}' already exists. Choose another output directory or use 'overwrite' to overwrite the directory and contents"
            )

    from inspect_ai._display import display

    display().print(f"Creating view bundle in '{output_dir}'")
    with display().progress(total=500) as p:
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as working_dir:
            # prepare viewer assets
            log_dir_name = "logs"
            _prepare_viewer(
                working_dir,
                log_dir=log_dir_name,
                abs_log_dir=absolute_file_path(log_dir),
            )
            p.update(25)

            # create a logs dir and copy logs into it
            view_logs_dir = os.path.join(working_dir, log_dir_name)
            os.makedirs(view_logs_dir)
            copy_log_files(log_dir, view_logs_dir, p.update, fs_options)
            p.update(25)

            write_log_listing(view_logs_dir)
            p.update(25)

            if output_dir.startswith("hf/"):
                _push_bundle_to_hf(working_dir, output_dir, fs_options)
            else:
                move_output(working_dir, output_dir, p.update, fs_options)
            p.complete()
    display().print(f"View bundle '{output_dir}' created")


def copy_dir_contents(source_dir: str, dest_dir: str) -> None:
    for root, _dirs, files in os.walk(source_dir):
        # Calculate the relative path from the source directory
        relative_path = os.path.relpath(root, source_dir)

        # Create the corresponding directory in the destination
        dest_path = os.path.join(dest_dir, relative_path)
        if not os.path.exists(dest_path):
            os.makedirs(dest_path)

        # Copy all files in the current directory
        for file in files:
            src_file_path = os.path.join(root, file)
            dest_file_path = os.path.join(dest_path, file)
            shutil.copy2(src_file_path, dest_file_path)


def inject_configuration(
    html_file: str, log_dir: str, abs_log_dir: str | None = None
) -> None:
    # update the index html to embed the log_dir
    with open(html_file, "r") as file:
        index_contents = file.read()

    # inject the log dir information into the viewer html
    # so it will load directly
    context: dict[str, str] = {"log_dir": log_dir}
    if abs_log_dir is not None:
        context["abs_log_dir"] = abs_log_dir
    import json

    context_json = json.dumps(context)
    content = index_contents.replace(
        "</head>",
        f'  <script id="log_dir_context" type="application/json">{context_json}</script>\n  </head>',
    )

    # Open the file for writing to save the updated content
    with open(html_file, "w") as file:
        file.write(content)


def write_robots_txt(dir: str) -> None:
    # Full path to the robots.txt file
    file_path = os.path.join(dir, "robots.txt")

    # Content for the robots.txt file
    content = """User-agent: *
Disallow: /
"""

    # Write the content to the file
    with open(file_path, "w") as f:
        f.write(content)


def _prepare_viewer(
    working_dir: str, log_dir: str, abs_log_dir: str | None = None
) -> None:
    """Prepare viewer assets in a working directory."""
    copy_dir_contents(DIST_DIR, working_dir)
    inject_configuration(
        os.path.join(working_dir, "index.html"),
        log_dir=log_dir,
        abs_log_dir=abs_log_dir,
    )
    write_robots_txt(working_dir)


def copy_file_to_bundle(
    file_path: str, base_log_dir: str, target_dir: str, log_fs: Any
) -> None:
    """Copy a single file to the bundle target directory."""
    relative_path = os.path.relpath(file_path, base_log_dir)
    output_path = os.path.join(target_dir, relative_path)

    # Make directories containing output_path if they don't exist.
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Copy log to output_path
    log_fs.get_file(file_path, output_path)


def copy_log_files(
    log_dir: str,
    target_dir: str,
    p: Callable[[int], None],
    fs_options: dict[str, Any] = {},
) -> None:
    log_fs = filesystem(log_dir, fs_options)
    if log_fs.exists(log_dir):
        eval_logs = log_files_from_ls(
            log_fs.ls(log_dir, recursive=True), ["json", "eval"], False
        )
        if len(eval_logs) == 0:
            raise PrerequisiteError(
                f"The log directory {log_dir} doesn't contain any log files."
            )

        # find any eval-set files and move those as well
        eval_set_files = set()
        for eval_log in eval_logs:
            eval_set_path = os.path.join(
                os.path.dirname(eval_log.name), "eval-set.json"
            )
            if log_fs.exists(eval_set_path):
                eval_set_files.add(eval_set_path)

        base_log_dir = log_fs.info(log_dir).name
        with progress_adapter(p, 200, len(eval_logs) + len(eval_set_files)) as tick:
            for eval_log in eval_logs:
                copy_file_to_bundle(eval_log.name, base_log_dir, target_dir, log_fs)
                tick()
            for eval_set_file in eval_set_files:
                copy_file_to_bundle(eval_set_file, base_log_dir, target_dir, log_fs)
                tick()

    else:
        raise PrerequisiteError(f"The log directory {log_dir} doesn't exist.")


def move_output(
    from_dir: str,
    to_dir: str,
    p: Callable[[int], None],
    fs_options: dict[str, Any] = {},
) -> None:
    output_fs = filesystem(to_dir, fs_options)

    # remove any existing target directory
    if output_fs.exists(to_dir):
        output_fs.rm(to_dir, recursive=True)

    # Now copy the files
    dir_contents = list(os.walk(from_dir))

    # count the title files to copy
    total_count = 0
    for root, dirs, files in dir_contents:
        total_count += len(dirs) + len(files)

    with progress_adapter(p, 200, total_count) as tick:
        for root, _dirs, files in dir_contents:
            # The relative path of the file to move
            relative_dir = os.path.relpath(root, from_dir)

            # make sure the directory exists
            dir_path = os.path.join(to_dir, relative_dir)
            if not output_fs.exists(dir_path):
                output_fs.mkdir(dir_path)
            tick()

            # Copy the files, preserving relative mtime ordering
            for _, working_file in sorted(
                (os.stat(os.path.join(root, f)).st_mtime, f) for f in files
            ):
                target_path = (
                    os.path.join(relative_dir, working_file)
                    if relative_dir != "."
                    else working_file
                )

                src = os.path.join(root, working_file)
                dest = os.path.join(to_dir, target_path)
                output_fs.put_file(src, dest)
                tick()


@contextmanager
def progress_adapter(
    p: Callable[[int], None], units: int, total_ticks: int
) -> Iterator[Callable[[], None]]:
    # Allocate 'units' ticks to represent the progress in
    # in 'total_ticks', adjusting the size of the increments based
    # upon the total ticks
    ticks = 0.0
    increment = units / total_ticks

    def tick() -> None:
        nonlocal ticks
        ticks = ticks + increment
        tick_value = math.floor(ticks)
        if tick_value >= 1:
            # increment the count
            p(tick_value)

            # hang on to 'leftover' ticks to accumulate with the next increment
            ticks = ticks - tick_value

    yield tick


def _copy_viewer_to_log_dir(from_dir: str, to_dir: str, output_fs: Any) -> None:
    """Copy viewer files from a local temp directory into the log directory.

    Unlike move_output, this does not remove existing files in the target
    directory, so log files are preserved.
    """
    for root, _dirs, files in os.walk(from_dir):
        relative_dir = os.path.relpath(root, from_dir)

        # ensure target subdirectory exists
        if relative_dir != ".":
            dir_path = os.path.join(to_dir, relative_dir)
            if not output_fs.exists(dir_path):
                output_fs.mkdir(dir_path)

        # copy files
        for file in files:
            src = os.path.join(root, file)
            target = os.path.join(relative_dir, file) if relative_dir != "." else file
            dest = os.path.join(to_dir, target)
            output_fs.put_file(src, dest)


def embed_log_dir(
    log_dir: str | None = None,
    fs_options: dict[str, Any] = {},
) -> None:
    r"""Embed a log viewer into a log_dir.

    Places the viewer HTML, assets, listing.json, and robots.txt directly
    in the log_dir alongside the log files. The viewer is configured with
    log_dir="." to read logs from the same directory.
    Requires an HTTP server to function (file:// won't work due to CORS).

    Args:
        log_dir: (str | None): The log_dir to embed the viewer in.
        fs_options (dict[str, Any]): Optional. Additional arguments to pass through
            to the filesystem provider (e.g. `S3FileSystem`).
    """
    from inspect_ai._display import display

    # resolve the log directory
    log_dir = log_dir if log_dir else os.getenv("INSPECT_LOG_DIR", "./logs")

    # resolve paths
    log_dir = absolute_file_path(log_dir)
    log_fs = filesystem(log_dir, fs_options)

    # check that log_dir exists
    if not log_fs.exists(log_dir):
        raise PrerequisiteError(f"The log directory '{log_dir}' doesn't exist.")

    display().print(f"Embedding viewer in '{log_dir}'")

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as working_dir:
        _prepare_viewer(working_dir, log_dir=".", abs_log_dir=log_dir)
        write_log_listing(log_dir, output_dir=working_dir)
        _copy_viewer_to_log_dir(working_dir, log_dir, log_fs)

    if log_fs.is_local():
        display().print(f"Run: cd '{log_dir}' && python -m RangeHTTPServer")
        display().print("View: http://localhost:8000/index.html")
```

## `log/_condense.py`

```python
import json
from functools import lru_cache
from logging import getLogger
from typing import (
    Callable,
    Literal,
    Sequence,
)

from pydantic import JsonValue, TypeAdapter
from typing_extensions import TypedDict

from inspect_ai._util.constants import BASE_64_DATA_REMOVED, log_condense_enabled
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
from inspect_ai._util.hash import mm3_hash
from inspect_ai._util.json import JsonChange
from inspect_ai._util.url import is_data_uri
from inspect_ai.dataset._dataset import Sample
from inspect_ai.model._chat_message import ChatMessage, ChatMessageAssistant
from inspect_ai.model._model_call import ModelCall
from inspect_ai.model._model_output import ModelOutput
from inspect_ai.tool._tool_call import ToolCall
from inspect_ai.tool._tool_info import ToolInfo

from ..event._event import (
    Event,
)
from ..event._info import InfoEvent
from ..event._model import ModelEvent
from ..event._sample_init import SampleInitEvent
from ..event._state import StateEvent
from ..event._store import StoreEvent
from ..event._subtask import SubtaskEvent
from ..event._tool import ToolEvent
from ._log import EvalSample, EventsData
from ._pool import (
    _build_call_index,
    _build_msg_index,
    condense_model_event_calls,
    condense_model_event_inputs,
    resolve_model_event_calls,
    resolve_model_event_inputs,
)


@lru_cache(maxsize=1)
def _events_adapter() -> TypeAdapter[list[Event]]:
    return TypeAdapter(list[Event])


@lru_cache(maxsize=1)
def _chat_messages_adapter() -> TypeAdapter[list[ChatMessage]]:
    return TypeAdapter(list[ChatMessage])


logger = getLogger(__name__)


ATTACHMENT_PROTOCOL = "attachment://"


class WalkContext(TypedDict):
    message_cache: dict[str, ChatMessage]
    only_core: bool


def condense_events(
    events: Sequence[Event],
) -> tuple[list[Event], EventsData]:
    """De-duplicate repeated content in a sequence of events.

    Extracts repeated ModelEvent inputs and calls into shared pools,
    replacing inline content with pool index references.

    Args:
        events: Events to condense.

    Returns:
        Tuple of (condensed events, events data containing message and call pools).
    """
    condensed_events, message_pool = condense_model_event_inputs(events, [], {})
    condensed_events, call_pool = condense_model_event_calls(condensed_events, [], {})
    return condensed_events, EventsData(messages=message_pool, calls=call_pool)


def expand_events(
    events: Sequence[Event] | str,
    data: EventsData | str,
) -> list[Event]:
    """Reverse :func:`condense_events` — restore pooled content into events.

    Args:
        events: Condensed events (with pool index references), or a JSON-serialized
            ``list[Event]``.
        data: Events data returned by :func:`condense_events`, or a JSON-serialized
            ``EventsData``.

    Returns:
        Events with full message inputs and call request messages restored.
    """
    if isinstance(events, str):
        events = _events_adapter().validate_json(events)
    if isinstance(data, str):
        raw = json.loads(data)
        data = EventsData(
            messages=_chat_messages_adapter().validate_python(raw.get("messages", [])),
            calls=raw.get("calls", []),
        )
    result = resolve_model_event_inputs(list(events), data["messages"])
    result = resolve_model_event_calls(result, data["calls"])
    return result


def condense_sample(sample: EvalSample, log_images: bool = True) -> EvalSample:
    """Reduce the storage size of the eval sample.

    Reduce size by:
    1. De-duplicating larger content fields (especially important for images
       but also for message repeated over and over in the event stream)
    2. Removing base64 encoded images if log_images is True

    The de-duplication of content fields can be reversed by calling
    `resolve_attachments()`. Removal of base64 encoded images is a
    one-way operation.

    Args:
       sample (EvalSample): Eval sample to condense.
       log_images (bool): Should base64 images be logged for this sample.

    Returns:
       EvalSample: Eval sample in condensed form.
    """
    attachments: dict[str, str] = dict(sample.attachments)
    events_fn = events_attachment_fn(attachments, log_images)
    messages_fn = messages_attachment_fn(attachments, log_images)
    context = WalkContext(message_cache={}, only_core=False)

    condensed_events = walk_events(sample.events, events_fn, context)

    events_data: EventsData | None = None
    if log_condense_enabled():
        existing = sample.events_data
        existing_msgs = existing["messages"] if existing else []
        existing_calls = existing["calls"] if existing else []

        msg_index = _build_msg_index(existing_msgs)
        condensed_events, message_pool = condense_model_event_inputs(
            condensed_events, existing_msgs, msg_index
        )

        call_index = _build_call_index(existing_calls)
        condensed_events, call_pool = condense_model_event_calls(
            condensed_events, existing_calls, call_index
        )
        events_data = EventsData(messages=message_pool, calls=call_pool)

    return sample.model_copy(
        update={
            "input": walk_input(sample.input, messages_fn, context),
            "messages": walk_chat_messages(sample.messages, messages_fn, context),
            "events": condensed_events,
            "attachments": attachments,
            "events_data": events_data,
        }
    )


def condense_event(
    event: Event,
    attachments: dict[str, str],
    log_images: bool = True,
    context: WalkContext | None = None,
) -> Event:
    event_fn = events_attachment_fn(attachments, log_images)
    if context is None:
        context = WalkContext(message_cache={}, only_core=False)
    return walk_event(event, event_fn, context)


def events_attachment_fn(
    attachments: dict[str, str], log_images: bool = True
) -> Callable[[str], str]:
    create_attachment = attachment_fn(attachments)

    # for events, we want to strip images when requested and
    # create attachments for text > 100
    def fn(text: str) -> str:
        if not log_images and is_data_uri(text):
            return BASE_64_DATA_REMOVED
        elif len(text) > 100:
            return create_attachment(text)
        else:
            return text

    return fn


def messages_attachment_fn(
    attachments: dict[str, str], log_images: bool = True
) -> Callable[[str], str]:
    create_attachment = attachment_fn(attachments)

    # for messages, we only want to handle images (either stripping
    # them or turning them into attachments as required)
    def fn(text: str) -> str:
        if is_data_uri(text):
            if log_images:
                return create_attachment(text)
            else:
                return BASE_64_DATA_REMOVED
        else:
            return text

    return fn


def attachment_fn(attachments: dict[str, str]) -> Callable[[str], str]:
    def create_attachment(text: str) -> str:
        hash = mm3_hash(text)
        attachments[hash] = text
        return f"{ATTACHMENT_PROTOCOL}{hash}"

    return create_attachment


def resolve_sample_attachments(
    sample: EvalSample,
    resolve_attachments: bool | Literal["full", "core"] = "core",
) -> EvalSample:
    """Resolve content attachments (typically images) in sample.

    Take 'attachment://*` references and resolve them to their
    underlying content, then remove the 'attachments' field.

    Args:
       sample (EvalSample): Eval sample with attachments.
       resolve_attachments: Should attachments be resolved. "core" means only resolving attachments in the core fields.

    Returns:
       EvalSample: Sample with attachment content resolved.
    """
    if resolve_attachments is False:
        return sample

    def content_fn(text: str) -> str:
        # migrate previous flavor of content reference
        CONTENT_PROTOCOL = "tc://"
        if text.startswith(CONTENT_PROTOCOL):
            text = text.replace(CONTENT_PROTOCOL, ATTACHMENT_PROTOCOL, 1)
        if text.startswith(ATTACHMENT_PROTOCOL):
            return sample.attachments.get(
                text.replace(ATTACHMENT_PROTOCOL, "", 1), text
            )
        else:
            return text

    context = WalkContext(
        message_cache={},
        only_core=resolve_attachments == "core",
    )

    # Resolve pools before events — pool messages may contain attachment:// refs
    ed = sample.events_data
    msg_pool = ed["messages"] if ed else []
    call_pool = ed["calls"] if ed else []

    resolved_pool: list[ChatMessage] = [
        walk_chat_message(v, content_fn, context) for v in msg_pool
    ]
    resolved_call_pool: list[JsonValue] = (
        call_pool
        if context.get("only_core")
        else [walk_json_value(v, content_fn, context) for v in call_pool]
    )

    resolved_events = walk_events(sample.events, content_fn, context)
    resolved_events = resolve_model_event_inputs(resolved_events, resolved_pool)
    resolved_events = resolve_model_event_calls(resolved_events, resolved_call_pool)

    return sample.model_copy(
        update={
            "input": walk_input(sample.input, content_fn, context),
            "messages": walk_chat_messages(sample.messages, content_fn, context),
            "events": resolved_events,
            "attachments": {},
            "events_data": None,
        }
    )


def attachments_content_fn(
    log_images: bool, max_length: int, attachments: dict[str, str]
) -> Callable[[str], str]:
    def create_attachment(text: str) -> str:
        hash = mm3_hash(text)
        attachments[hash] = text
        return f"{ATTACHMENT_PROTOCOL}{hash}"

    def content_fn(text: str) -> str:
        if not log_images and is_data_uri(text):
            return BASE_64_DATA_REMOVED
        elif len(text) > max_length:
            return create_attachment(text)
        else:
            return text

    return content_fn


def walk_events(
    events: list[Event], content_fn: Callable[[str], str], context: WalkContext
) -> list[Event]:
    return [walk_event(event, content_fn, context) for event in events]


def walk_event(
    event: Event, content_fn: Callable[[str], str], context: WalkContext
) -> Event:
    if isinstance(event, SampleInitEvent):
        return walk_sample_init_event(event, content_fn, context)
    elif isinstance(event, ModelEvent):
        return walk_model_event(event, content_fn, context)
    elif isinstance(event, StateEvent):
        return walk_state_event(event, content_fn, context)
    elif isinstance(event, StoreEvent):
        return walk_store_event(event, content_fn, context)
    elif isinstance(event, SubtaskEvent):
        return walk_subtask_event(event, content_fn, context)
    elif isinstance(event, ToolEvent):
        return walk_tool_event(event, content_fn, context)
    elif isinstance(event, InfoEvent):
        return walk_info_event(event, content_fn, context)
    else:
        return event


def walk_subtask_event(
    event: SubtaskEvent, content_fn: Callable[[str], str], context: WalkContext
) -> SubtaskEvent:
    return event.model_copy(
        update=dict(events=walk_events(event.events, content_fn, context))
    )


def walk_tool_event(
    event: ToolEvent, content_fn: Callable[[str], str], context: WalkContext
) -> ToolEvent:
    return event.model_copy(
        update=dict(
            arguments=walk_json_dict(event.arguments, content_fn, context),
            events=walk_events(event.events, content_fn, context),
        )
    )


def walk_info_event(
    event: InfoEvent, content_fn: Callable[[str], str], context: WalkContext
) -> InfoEvent:
    return event.model_copy(
        update=dict(data=walk_json_value(event.data, content_fn, context))
    )


def walk_sample_init_event(
    event: SampleInitEvent, content_fn: Callable[[str], str], context: WalkContext
) -> SampleInitEvent:
    return event.model_copy(
        update=dict(
            sample=walk_sample(event.sample, content_fn, context),
            state=walk_json_value(event.state, content_fn, context),
        )
    )


def walk_sample(
    sample: Sample, content_fn: Callable[[str], str], context: WalkContext
) -> Sample:
    if isinstance(sample.input, str):
        return sample.model_copy(
            update=dict(input=walk_json_value(sample.input, content_fn, context))
        )
    else:
        return sample.model_copy(
            update=dict(input=walk_chat_messages(sample.input, content_fn, context))
        )


def walk_model_event(
    event: ModelEvent, content_fn: Callable[[str], str], context: WalkContext
) -> ModelEvent:
    return event.model_copy(
        update=dict(
            tools=walk_tools(event.tools, content_fn, context),
            input=walk_chat_messages(event.input, content_fn, context),
            output=walk_model_output(event.output, content_fn, context),
            call=walk_model_call(event.call, content_fn, context),
        ),
    )


def walk_model_output(
    output: ModelOutput, content_fn: Callable[[str], str], context: WalkContext
) -> ModelOutput:
    return output.model_copy(
        update=dict(
            choices=[
                choice.model_copy(
                    update=dict(
                        message=walk_chat_message(choice.message, content_fn, context)
                    )
                )
                for choice in output.choices
            ]
        )
    )


def walk_model_call(
    call: ModelCall | None, content_fn: Callable[[str], str], context: WalkContext
) -> ModelCall | None:
    if context.get("only_core") is True:
        return call
    if call:
        return call.model_copy(
            update={
                "request": walk_json_dict(call.request, content_fn, context),
                "response": walk_json_dict(call.response, content_fn, context)
                if call.response
                else None,
            }
        )
    else:
        return None


def walk_state_event(
    event: StateEvent, content_fn: Callable[[str], str], context: WalkContext
) -> StateEvent:
    event = event.model_copy(
        update=dict(
            changes=[
                walk_state_json_change(change, content_fn, context)
                for change in event.changes
            ]
        )
    )
    return event


def walk_store_event(
    event: StoreEvent, content_fn: Callable[[str], str], context: WalkContext
) -> StoreEvent:
    event = event.model_copy(
        update=dict(
            changes=[
                walk_state_json_change(change, content_fn, context)
                for change in event.changes
            ]
        )
    )
    return event


def walk_state_json_change(
    change: JsonChange, content_fn: Callable[[str], str], context: WalkContext
) -> JsonChange:
    return change.model_copy(
        update=dict(value=walk_json_value(change.value, content_fn, context))
    )


def walk_json_value(
    value: JsonValue, content_fn: Callable[[str], str], context: WalkContext
) -> JsonValue:
    if isinstance(value, str):
        return content_fn(value)
    elif isinstance(value, list):
        return [walk_json_value(v, content_fn, context) for v in value]
    elif isinstance(value, dict):
        return walk_json_dict(value, content_fn, context)
    else:
        return value


def walk_json_dict(
    value: dict[str, JsonValue],
    content_fn: Callable[[str], str],
    context: WalkContext,
) -> dict[str, JsonValue]:
    updates: dict[str, JsonValue] = {}
    for k, v in value.items():
        updates[k] = walk_json_value(v, content_fn, context)
    if updates:
        value = value.copy()
        value.update(updates)
    return value


def walk_input(
    input: str | list[ChatMessage],
    content_fn: Callable[[str], str],
    context: WalkContext,
) -> str | list[ChatMessage]:
    if isinstance(input, str):
        return input
    else:
        return walk_chat_messages(input, content_fn, context)


def walk_chat_messages(
    messages: list[ChatMessage],
    content_fn: Callable[[str], str],
    context: WalkContext,
) -> list[ChatMessage]:
    return [walk_chat_message(message, content_fn, context) for message in messages]


def walk_chat_message(
    message: ChatMessage, content_fn: Callable[[str], str], context: WalkContext
) -> ChatMessage:
    cache = context.get("message_cache")
    if cache is not None and message.id is not None:
        hit = cache.get(message.id)
        if hit is not None and hit == message:
            return hit
    if isinstance(message.content, str):
        res = message.model_copy(update=dict(content=content_fn(message.content)))
    else:
        res = message.model_copy(
            update=dict(
                tool_calls=[
                    walk_tool_call(tool_call, content_fn, context)
                    for tool_call in message.tool_calls
                ]
                if isinstance(message, ChatMessageAssistant) and message.tool_calls
                else None,
                content=[
                    walk_content(content, content_fn, context)
                    for content in message.content
                ],
            )
        )
    if cache is not None and message.id is not None:
        cache[message.id] = res
    return res


def walk_content(
    content: Content, content_fn: Callable[[str], str], context: WalkContext
) -> Content:
    if isinstance(content, ContentText):
        return content.model_copy(update=dict(text=content_fn(content.text)))
    elif isinstance(content, ContentImage):
        return content.model_copy(update=dict(image=content_fn(content.image)))
    elif isinstance(content, ContentAudio):
        return content.model_copy(update=dict(audio=content_fn(content.audio)))
    elif isinstance(content, ContentVideo):
        return content.model_copy(update=dict(video=content_fn(content.video)))
    elif isinstance(content, ContentReasoning):
        return content.model_copy(update=dict(reasoning=content_fn(content.reasoning)))
    elif isinstance(content, ContentToolUse):
        return content.model_copy(
            update=dict(
                arguments=walk_json_value(content.arguments, content_fn, context),
                result=walk_json_value(content.result, content_fn, context),
                error=content_fn(content.error) if content.error else content.error,
            )
        )
    elif isinstance(content, ContentData):
        return content.model_copy(
            update=dict(data=walk_json_value(content.data, content_fn, context))
        )
    elif isinstance(content, ContentDocument):
        return content.model_copy(update=dict(document=content_fn(content.document)))


def walk_tools(
    tools: list[ToolInfo], content_fn: Callable[[str], str], context: WalkContext
) -> list[ToolInfo]:
    return [
        tool.model_copy(
            update=dict(
                description=content_fn(tool.description),
            )
        )
        for tool in tools
    ]


def walk_tool_call(
    tool_call: ToolCall, content_fn: Callable[[str], str], context: WalkContext
) -> ToolCall:
    return ToolCall(
        id=tool_call.id,
        function=tool_call.function,
        arguments=walk_json_dict(tool_call.arguments, content_fn, context),
        parse_error=tool_call.parse_error,
        view=tool_call.view.model_copy(
            update=dict(
                content=content_fn(tool_call.view.content)
                if tool_call.view and tool_call.view.content
                else None,
            )
        )
        if tool_call.view
        else None,
        type=tool_call.type,
    )
```

## `log/_convert.py`

```python
import os
from typing import Literal

import anyio

from inspect_ai._util._async import run_coroutine
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.file import exists, filesystem
from inspect_ai.log import resolve_sample_attachments
from inspect_ai.log._condense import condense_sample
from inspect_ai.log._file import (
    log_files_from_ls,
    read_eval_log,
    read_eval_log_async,
    write_eval_log,
)
from inspect_ai.log._pool import resolve_sample_events_data
from inspect_ai.log._recorders import create_recorder_for_location
from inspect_ai.log._recorders.create import recorder_type_for_location


def convert_eval_logs(
    path: str,
    to: Literal["eval", "json"],
    output_dir: str,
    overwrite: bool = False,
    resolve_attachments: bool | Literal["full", "core"] = False,
    stream: int | bool = False,
) -> None:
    """Convert between log file formats.

    Convert log file(s) to a target format. If a file is already in the target
    format it will just be copied to the output dir.

    Args:
        path (str): Path to source log file(s). Should be either a single
            log file or a directory containing log files.
        to (Literal["eval", "json"]): Format to convert to. If a file is
            already in the target format it will just be copied to the output dir.
        output_dir (str): Output directory to write converted log file(s) to.
        overwrite (bool): Overwrite existing log files (defaults to `False`,
            raising an error if the output file path already exists).
        resolve_attachments (bool): Resolve attachments (duplicated content blocks)
            to their full content.
        stream (int | bool): Stream samples through the conversion process instead of
            reading the entire log into memory. Useful for large logs.
    """
    from inspect_ai._display import display

    # confirm that path exists
    fs = filesystem(path)
    if not fs.exists(path):
        raise PrerequisiteError(f"Error: path '{path}' does not exist.")

    # normalise output dir and ensure it exists
    output_fs = filesystem(output_dir)
    if output_dir.endswith(fs.sep):
        output_dir = output_dir[:-1]
    output_fs.mkdir(output_dir, exist_ok=True)

    # convert a single file (input file is relative to the 'path')
    def convert_file(input_file: str) -> None:
        # compute input and ensure output dir exists
        input_name, _ = os.path.splitext(input_file)
        input_dir = os.path.dirname(input_name.replace("\\", "/"))

        # Compute paths, handling directories being converted
        # and files being converted specially
        path_is_dir = fs.info(path).type == "directory"
        if path_is_dir:
            target_dir = f"{output_dir}{output_fs.sep}{input_dir}"
            input_file = f"{path}{fs.sep}{input_file}"
            output_file_basename = input_name
        else:
            target_dir = output_dir
            output_file_basename = os.path.basename(input_name)

        output_fs.mkdir(target_dir, exist_ok=True)

        # compute full output file and enforce overwrite
        output_file = f"{output_dir}{output_fs.sep}{output_file_basename}.{to}"
        if exists(output_file) and not overwrite:
            raise FileExistsError(
                f"Output file {output_file} already exists (use --overwrite to overwrite existing files)"
            )

        # do a full read/write (normalized deprecated constructs and adds sample summaries)
        if stream:
            run_coroutine(
                _stream_convert_file(
                    input_file,
                    output_file,
                    output_dir,
                    resolve_attachments,
                    stream,
                )
            )
        else:
            log = read_eval_log(input_file, resolve_attachments=resolve_attachments)
            if log.samples:
                log.samples = [condense_sample(sample) for sample in log.samples]
            write_eval_log(log, output_file)

    if fs.info(path).type == "file":
        convert_file(path)
    else:
        root_dir = fs.info(path).name
        eval_logs = log_files_from_ls(fs.ls(path, recursive=True), None, True)
        input_files = [
            eval_log.name.replace(f"{root_dir}/", "", 1) for eval_log in eval_logs
        ]
        display().print("Converting log files...")
        with display().progress(total=len(input_files)) as p:
            for input_file in input_files:
                convert_file(input_file)
                p.update()


async def _stream_convert_file(
    input_file: str,
    output_file: str,
    output_dir: str,
    resolve_attachments: bool | Literal["full", "core"],
    stream: int | Literal[True],
) -> None:
    input_recorder = recorder_type_for_location(input_file)
    output_recorder = create_recorder_for_location(output_file, output_dir)

    sample_map = await input_recorder.read_log_sample_ids(input_file)

    concurrent_limit = len(sample_map) if stream is True else stream
    semaphore = anyio.Semaphore(concurrent_limit)
    samples_processed = 0

    async def _convert_sample(sample_id: str | int, epoch: int) -> None:
        async with semaphore:
            sample = await input_recorder.read_log_sample(input_file, sample_id, epoch)
            if resolve_attachments:
                sample = resolve_sample_attachments(sample, resolve_attachments)
            else:
                # Must resolve message pool refs before re-condensing,
                # otherwise condense_sample will overwrite pools with empty lists
                sample = resolve_sample_events_data(sample)
            sample = condense_sample(sample)
            await output_recorder.log_sample(
                log_header.eval,
                sample,
            )

            nonlocal samples_processed
            samples_processed += 1
            # Flush periodically to avoid too much buffering
            if samples_processed % concurrent_limit == 0:
                await output_recorder.flush(log_header.eval)

    log_header = await read_eval_log_async(
        input_file, header_only=True, resolve_attachments=resolve_attachments
    )
    await output_recorder.log_init(log_header.eval, location=output_file)
    await output_recorder.log_start(log_header.eval, log_header.plan)

    async with anyio.create_task_group() as tg:
        for sample_id, epoch in sample_map:
            tg.start_soon(_convert_sample, sample_id, epoch)

    await output_recorder.log_finish(
        log_header.eval,
        log_header.status,
        log_header.stats,
        log_header.results,
        log_header.reductions,
        invalidated=log_header.invalidated,
        log_updates=log_header.log_updates,
    )
```

## `log/_edit.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Annotated, Any, Literal, Sequence

from pydantic import BaseModel, Field

from inspect_ai._util.dateutil import UtcDatetime, datetime_now_utc

if TYPE_CHECKING:
    from inspect_ai.log._log import EvalLog, EvalSample


class ProvenanceData(BaseModel):
    """Metadata about who made an edit and why."""

    timestamp: UtcDatetime = Field(default_factory=datetime_now_utc)
    """Timestamp when the edit was made."""

    author: str
    """Author who made the edit."""

    reason: str | None = Field(default=None)
    """Reason for the edit."""

    metadata: dict[str, Any] = Field(default_factory=dict)
    """Additional metadata about the edit."""


class LogEdit(BaseModel):
    """A single edit action on log tags and/or metadata."""


class TagsEdit(LogEdit):
    """Edit action for tags."""

    type: Literal["tags"] = "tags"

    tags_add: list[str] = Field(default_factory=list)
    """Tags to add."""

    tags_remove: list[str] = Field(default_factory=list)
    """Tags to remove."""


class MetadataEdit(LogEdit):
    """Edit action for metadata."""

    type: Literal["metadata"] = "metadata"

    metadata_set: dict[str, Any] = Field(default_factory=dict)
    """Metadata keys to set."""

    metadata_remove: list[str] = Field(default_factory=list)
    """Metadata keys to remove."""


LogEditType = Annotated[TagsEdit | MetadataEdit, Field(discriminator="type")]


class LogUpdate(BaseModel):
    """A group of edits that share provenance."""

    edits: list[LogEditType] = Field(default_factory=list)
    """List of edits in this update."""

    provenance: ProvenanceData
    """Provenance for this update."""


def edit_eval_log(
    log: EvalLog,
    edits: Sequence[LogEdit],
    provenance: ProvenanceData,
) -> EvalLog:
    """Apply edits to a log.

    Creates a LogUpdate from the edits and provenance, appends it to
    log.log_updates, and recomputes cached tags/metadata.
    Returns modified log (not persisted). Use write_eval_log() to save.

    Args:
        log: Eval log to edit.
        edits: List of edits to apply.
        provenance: Provenance data for the edits.

    Returns:
        Modified EvalLog with edits applied.
    """
    # validate and filter noop edits, advancing state after each edit
    current_tags = set(log.tags)
    current_metadata = dict(log.metadata)
    filtered: list[LogEditType] = []
    for edit in edits:
        if isinstance(edit, TagsEdit):
            for tag in edit.tags_add + edit.tags_remove:
                if not tag.strip():
                    raise ValueError("Tag must be a non-empty string.")
            overlap = set(edit.tags_add) & set(edit.tags_remove)
            if overlap:
                raise ValueError(
                    f"Tag(s) {overlap} appear in both tags_add and tags_remove."
                )
            tags_add = [t for t in edit.tags_add if t not in current_tags]
            tags_remove = [t for t in edit.tags_remove if t in current_tags]
            if tags_add or tags_remove:
                filtered.append(TagsEdit(tags_add=tags_add, tags_remove=tags_remove))
                current_tags -= set(tags_remove)
                current_tags |= set(tags_add)
        elif isinstance(edit, MetadataEdit):
            for key in list(edit.metadata_set.keys()) + edit.metadata_remove:
                if not key.strip():
                    raise ValueError("Metadata key must be a non-empty string.")
            overlap = set(edit.metadata_set.keys()) & set(edit.metadata_remove)
            if overlap:
                raise ValueError(
                    f"Metadata key(s) {overlap} appear in both metadata_set and metadata_remove."
                )
            metadata_set = {
                k: v
                for k, v in edit.metadata_set.items()
                if current_metadata.get(k) != v
            }
            metadata_remove = [k for k in edit.metadata_remove if k in current_metadata]
            if metadata_set or metadata_remove:
                filtered.append(
                    MetadataEdit(
                        metadata_set=metadata_set,
                        metadata_remove=metadata_remove,
                    )
                )
                for k in metadata_remove:
                    current_metadata.pop(k, None)
                current_metadata.update(metadata_set)

    if not filtered:
        return log

    update = LogUpdate(edits=filtered, provenance=provenance)
    log_updates = list(log.log_updates or [])
    log_updates.append(update)
    log = log.model_copy(update={"log_updates": log_updates})
    # recompute tags/metadata fields
    log.recompute_tags_and_metadata()
    return log


def _prepare_samples(
    log: EvalLog, sample_uuids: Sequence[str] | Literal["all"]
) -> dict[str, tuple[int, EvalSample]]:
    sample_uuid_map = {
        str(sample.uuid): (idx_sample, sample)
        for idx_sample, sample in enumerate(log.samples or [])
    }

    if sample_uuids == "all":
        sample_uuid_list = list(sample_uuid_map.keys())
    else:
        invalid_sample_uuids = [
            sample_uuid
            for sample_uuid in sample_uuids
            if sample_uuid not in sample_uuid_map
        ]
        if invalid_sample_uuids:
            raise ValueError(f"Samples {invalid_sample_uuids} not found in log")

        sample_uuid_list = list(sample_uuids)

    return {
        sample_uuid: sample_uuid_map[sample_uuid] for sample_uuid in sample_uuid_list
    }


def _update_sample_invalidation(
    log: EvalLog,
    sample_uuid_map: dict[str, tuple[int, EvalSample]],
    provenance: ProvenanceData | None = None,
) -> EvalLog:
    if not sample_uuid_map:
        return log

    samples = (log.samples or []).copy()
    for idx_sample, sample in sample_uuid_map.values():
        if provenance is None:
            if sample.invalidation is None:
                continue
            invalidation = None
        else:
            if sample.invalidation is not None:
                continue
            invalidation = provenance.model_copy()

        samples[idx_sample] = sample.model_copy(update={"invalidation": invalidation})

    return log.model_copy(update={"samples": samples})


def invalidate_samples(
    log: EvalLog,
    sample_uuids: Sequence[str] | Literal["all"],
    provenance: ProvenanceData,
) -> EvalLog:
    """Invalidate samples in the log.

    Additionally, sets `EvalLog.invalidated = True`. Logs with invalidated samples will be automatically retried when executing eval sets.

    The log with invalidated samples is returned but not persisted to storage. Use `write_eval_log()` to save the new log with invalidated samples.

    Args:
       log: Eval log
       sample_uuids: List of sample uuids to invalidate (or "all" to invaliate all samples).
       provenance: Timestamp and optional author, reason, and metadata for the invalidation.

    Returns:
       `EvalLog` with invalidated samples and `invalidated=True`.
    """
    sample_uuid_map = _prepare_samples(log, sample_uuids)
    if not sample_uuid_map:
        return log
    log = _update_sample_invalidation(log, sample_uuid_map, provenance=provenance)
    log.invalidated = True
    return log


def uninvalidate_samples(
    log: EvalLog, sample_uuids: Sequence[str] | Literal["all"]
) -> EvalLog:
    """Uninvalidate samples in the log.

    Additionally, sets `EvalLog.invalidated = False` if there are no more invalidated samples.

    The log with uninvalidated samples is returned but not persisted to storage. Use `write_eval_log()` to save the new log with uninvalidated samples.

    Args:
       log: Eval log
       sample_uuids: List of sample uuids to uninvalidate (or "all" to uninvalidate all samples).

    Returns:
       `EvalLog` with uninvalidate samples and updated global `invalidated` state.
    """
    sample_uuid_map = _prepare_samples(log, sample_uuids)
    if not sample_uuid_map:
        return log
    log = _update_sample_invalidation(log, sample_uuid_map, provenance=None)
    log.invalidated = any(
        sample.invalidation is not None for sample in log.samples or []
    )
    return log
```

## `log/_file.py`

```python
import os
import re
from functools import partial
from logging import getLogger
from pathlib import Path
from typing import IO, Any, Callable, Generator, Literal, cast

from pydantic import (
    BaseModel,
    Field,
)

from inspect_ai._util._async import current_async_backend, run_coroutine, tg_collect
from inspect_ai._util.async_zip import AsyncZipReader
from inspect_ai._util.asyncfiles import get_async_filesystem
from inspect_ai._util.constants import ALL_LOG_FORMATS, EVAL_LOG_FORMAT
from inspect_ai._util.dateutil import UtcDatetimeStr
from inspect_ai._util.error import EvalError
from inspect_ai._util.file import (
    FileInfo,
    file,
    filesystem,
)
from inspect_ai._util.json import to_json_safe
from inspect_ai.log._condense import resolve_sample_attachments
from inspect_ai.log._log import EvalSampleSummary
from inspect_ai.log._pool import resolve_sample_events_data

from ._log import EvalLog, EvalMetric, EvalSample, EvalStatus
from ._recorders import (
    recorder_type_for_bytes,
    recorder_type_for_format,
    recorder_type_for_location,
)

logger = getLogger(__name__)


class EvalLogInfo(BaseModel):
    """File info and task identifiers for eval log."""

    name: str
    """Name of file."""

    type: str
    """Type of file (file or directory)"""

    size: int
    """File size in bytes."""

    mtime: float | None
    """File modification time (None if the file is a directory on S3)."""

    task: str
    """Task name."""

    task_id: str
    """Task id."""

    suffix: str | None
    """Log file suffix (e.g. "-scored")"""


class LogOverview(BaseModel):
    """The log overview is a thinned manifest summarizing an evaluation log"""

    eval_id: str
    run_id: str

    task: str
    task_id: str
    task_version: int | str

    version: int
    status: EvalStatus
    invalidated: bool = Field(default=False)
    error: EvalError | None = Field(default=None)

    model: str

    started_at: UtcDatetimeStr | Literal[""]
    completed_at: UtcDatetimeStr | Literal[""]

    primary_metric: EvalMetric | None = Field(default=None)


def list_eval_logs(
    log_dir: str = os.environ.get("INSPECT_LOG_DIR", "./logs"),
    formats: list[Literal["eval", "json"]] | None = None,
    filter: Callable[[EvalLog], bool] | None = None,
    recursive: bool = True,
    descending: bool = True,
    fs_options: dict[str, Any] = {},
) -> list[EvalLogInfo]:
    """List all eval logs in a directory.

    Args:
      log_dir (str): Log directory (defaults to INSPECT_LOG_DIR)
      formats (Literal["eval", "json"]): Formats to list (default
        to listing all formats)
      filter (Callable[[EvalLog], bool]): Filter to limit logs returned.
         Note that the EvalLog instance passed to the filter has only
         the EvalLog header (i.e. does not have the samples or logging output).
      recursive (bool): List log files recursively (defaults to True).
      descending (bool): List in descending order.
      fs_options (dict[str, Any]): Optional. Additional arguments to pass through
          to the filesystem provider (e.g. `S3FileSystem`).

    Returns:
       List of EvalLog Info.

    """
    # get the eval logs
    fs = filesystem(log_dir, fs_options)
    if fs.exists(log_dir):
        logger.debug(f"Listing eval logs for {log_dir}")
        eval_logs = log_files_from_ls(
            fs.ls(log_dir, recursive=recursive), formats, descending
        )
        logger.debug(f"Listing eval logs for {log_dir} completed")
    else:
        return []

    # apply filter if requested
    if filter:
        return [
            log
            for log in eval_logs
            if filter(read_eval_log(log.name, header_only=True))
        ]
    else:
        return eval_logs


def write_eval_log(
    log: EvalLog,
    location: str | Path | FileInfo | None = None,
    format: Literal["eval", "json", "auto"] = "auto",
    if_match_etag: str | None = None,
) -> None:
    """Write an evaluation log.

    Args:
       log (EvalLog): Evaluation log to write.
       location (str | FileInfo): Location to write log to.
       format (Literal["eval", "json", "auto"]): Write to format
          (defaults to 'auto' based on `log_file` extension)
       if_match_etag (str | None): ETag for conditional write. If provided
          and writing to S3, will only write if the current ETag matches.

    Raises:
       WriteConflictError: If if_match_etag is provided and doesn't match
          the current ETag of the file in S3.
    """
    # don't mix trio and asyncio
    if current_async_backend() == "trio":
        raise RuntimeError(
            "write_eval_log cannot be called from a trio async context (please use write_eval_log_async instead)"
        )

    # will use s3fs and is not called from main inspect solver/scorer/tool/sandbox
    # flow, so force the use of asyncio
    run_coroutine(write_eval_log_async(log, location, format, if_match_etag))


async def write_eval_log_async(
    log: EvalLog,
    location: str | Path | FileInfo | None = None,
    format: Literal["eval", "json", "auto"] = "auto",
    if_match_etag: str | None = None,
) -> None:
    """Write an evaluation log.

    Args:
       log (EvalLog): Evaluation log to write.
       location (str | FileInfo): Location to write log to.
       format (Literal["eval", "json", "auto"]): Write to format
          (defaults to 'auto' based on `log_file` extension)
       if_match_etag (str | None): ETag for conditional write. If provided
          and writing to S3, will only write if the current ETag matches.
    """
    # resolve location
    if location is None:
        if log.location:
            location = log.location
        else:
            raise ValueError(
                "EvalLog passe to write_eval_log does not have a location, so you must pass an explicit location"
            )
    location = (
        location
        if isinstance(location, str)
        else location.as_posix()
        if isinstance(location, Path)
        else location.name
    )

    logger.debug(f"Writing eval log to {location}")

    # get recorder type
    if format == "auto":
        recorder_type = recorder_type_for_location(location)
    else:
        recorder_type = recorder_type_for_format(format)
    await recorder_type.write_log(location, log, if_match_etag)

    logger.debug(f"Writing eval log to {location} completed")


def write_log_dir_manifest(
    log_dir: str,
    *,
    filename: str = "logs.json",
    output_dir: str | None = None,
    fs_options: dict[str, Any] = {},
) -> None:
    """Write a manifest for a log directory.

    A log directory manifest is a dictionary of EvalLog headers (EvalLog w/o samples)
    keyed by log file names (names are relative to the log directory)

    Args:
      log_dir (str): Log directory to write manifest for.
      filename (str): Manifest filename (defaults to "logs.json")
      output_dir (str | None): Output directory for manifest (defaults to log_dir)
      fs_options (dict[str,Any]): Optional. Additional arguments to pass through
        to the filesystem provider (e.g. `S3FileSystem`).
    """
    # resolve log dir to full path
    fs = filesystem(log_dir)
    log_dir = fs.info(log_dir).name

    # list eval logs
    logs = list_eval_logs(log_dir)

    # resolve to manifest (make filenames relative to the log dir)
    names = [manifest_eval_log_name(log, log_dir, fs.sep) for log in logs]
    headers = read_eval_log_headers(logs)

    manifest_logs = dict(zip(names, headers))

    # form target path and write
    output_dir = output_dir or log_dir
    fs = filesystem(output_dir)
    manifest = f"{output_dir}{fs.sep}{filename}"
    manifest_json = to_json_safe(manifest_logs)
    with file(manifest, mode="wb", fs_options=fs_options) as f:
        f.write(manifest_json)


def read_eval_log(
    log_file: str | Path | EvalLogInfo | IO[bytes],
    header_only: bool = False,
    resolve_attachments: bool | Literal["full", "core"] = False,
    format: Literal["eval", "json", "auto"] = "auto",
) -> EvalLog:
    """Read an evaluation log.

    Args:
       log_file (str | Path | EvalLogInfo | IO[bytes]): Log file to read.
          When providing IO[bytes], the returned EvalLog will have an
          empty location (which can be set manually if needed).
       header_only (bool): Read only the header (i.e. exclude
          the "samples" and "logging" fields). Defaults to False.
       resolve_attachments (bool): Resolve attachments (duplicated content blocks)
          to their full content.
       format (Literal["eval", "json", "auto"]): Read from format
          (defaults to 'auto' based on `log_file` extension).

    Returns:
       EvalLog object read from file.
    """
    # don't mix trio and asyncio
    if current_async_backend() == "trio":
        raise RuntimeError(
            "read_eval_log cannot be called from a trio async context (please use read_eval_log_async instead)"
        )

    # will use s3fs and is not called from main inspect solver/scorer/tool/sandbox
    # flow, so force the use of asyncio
    return run_coroutine(
        read_eval_log_async(
            log_file,
            header_only,
            resolve_attachments,
            format,
        )
    )


async def read_eval_log_async(
    log_file: str | Path | EvalLogInfo | IO[bytes],
    header_only: bool = False,
    resolve_attachments: bool | Literal["full", "core"] = False,
    format: Literal["eval", "json", "auto"] = "auto",
) -> EvalLog:
    """Read an evaluation log.

    Args:
       log_file (str | Path | EvalLogInfo | IO[bytes]): Log file to read.
          When providing IO[bytes], the returned EvalLog will have an
          empty location (which can be set manually if needed).
       header_only (bool): Read only the header (i.e. exclude
          the "samples" and "logging" fields). Defaults to False.
       resolve_attachments (bool): Resolve attachments (duplicated content blocks)
          to their full content.
       format (Literal["eval", "json", "auto"]): Read from format
          (defaults to 'auto' based on `log_file` extension).

    Returns:
       EvalLog object read from file.
    """
    is_bytes = not isinstance(log_file, (str, Path, EvalLogInfo))
    if is_bytes:
        log_bytes = cast("IO[bytes]", log_file)
        if format == "auto":
            recorder_type = recorder_type_for_bytes(log_bytes)
        else:
            recorder_type = recorder_type_for_format(format)

        logger.debug("Reading eval log from stream")
        log = await recorder_type.read_log_bytes(log_bytes, header_only)
    else:
        # resolve to file path
        log_file = (
            log_file
            if isinstance(log_file, str)
            else log_file.as_posix()
            if isinstance(log_file, Path)
            else log_file.name
        )
        logger.debug(f"Reading eval log from {log_file}")

        # get recorder type
        if format == "auto":
            recorder_type = recorder_type_for_location(log_file)
        else:
            recorder_type = recorder_type_for_format(format)
        log = await recorder_type.read_log(log_file, header_only)

    # always resolve message pool refs so ModelEvent.input is populated
    if log.samples:
        log.samples = [resolve_sample_events_data(sample) for sample in log.samples]
        if resolve_attachments:
            log.samples = [
                resolve_sample_attachments(sample, resolve_attachments)
                for sample in log.samples
            ]

    # provide sample ids if they aren't there
    if log.eval.dataset.sample_ids is None and log.samples is not None:
        sample_ids: dict[str | int, None] = {}
        for sample in log.samples:
            if sample.id not in sample_ids:
                sample_ids[sample.id] = None
        log.eval.dataset.sample_ids = list(sample_ids.keys())

    location = "stream" if is_bytes else log_file
    logger.debug(f"Completed reading eval log from {location}")

    return log


class ReadEvalLogsProgress:
    def before_reading_logs(self, total_files: int) -> None:
        pass

    def after_read_log(self, log_file: str) -> None:
        pass


def read_eval_log_headers(
    log_files: list[str] | list[EvalLogInfo],
    progress: ReadEvalLogsProgress | None = None,
) -> list[EvalLog]:
    # will use s3fs and is not called from main inspect solver/scorer/tool/sandbox
    # flow, so force the use of asyncio
    return run_coroutine(read_eval_log_headers_async(log_files, progress))


async def read_eval_log_headers_async(
    log_files: list[str] | list[Path] | list[EvalLogInfo],
    progress: ReadEvalLogsProgress | None = None,
) -> list[EvalLog]:
    if progress:
        progress.before_reading_logs(len(log_files))

    async def _read(lf: str | Path | EvalLogInfo) -> EvalLog:
        log = await read_eval_log_async(lf, header_only=True)
        if progress:
            progress.after_read_log(
                lf.name if isinstance(lf, EvalLogInfo) else str(lf),
            )
        return log

    return await tg_collect([partial(_read, lf) for lf in log_files])


def read_eval_log_sample(
    log_file: str | Path | EvalLogInfo,
    id: int | str | None = None,
    epoch: int = 1,
    uuid: str | None = None,
    resolve_attachments: bool | Literal["full", "core"] = False,
    format: Literal["eval", "json", "auto"] = "auto",
    exclude_fields: set[str] | None = None,
) -> EvalSample:
    """Read a sample from an evaluation log.

    Args:
       log_file (str | FileInfo): Log file to read.
       id (int | str): Sample id to read. Optional, alternatively
         specify `uuid` (you must specify `id` or `uuid`)
       epoch (int): Epoch for sample id (defaults to 1)
       uuid: Sample uuid to read. Optional, alternatively specify
         `id` and `epoch` (you must specify either `uuid` or `id`)
       resolve_attachments (bool): Resolve attachments (duplicated content blocks)
          to their full content.
       format (Literal["eval", "json", "auto"]): Read from format
          (defaults to 'auto' based on `log_file` extension)
       exclude_fields (set[str] | None): Set of field names to exclude when reading
          the sample. Useful when reading large samples with fields like
          'store' or 'attachments' that aren't needed.

    Returns:
       EvalSample object read from file.

    Raises:
       IndexError: If the passed id and epoch are not found.
    """
    # don't mix trio and asyncio
    if current_async_backend() == "trio":
        raise RuntimeError(
            "read_eval_log_sample cannot be called from a trio async context (please use read_eval_log_sample_async instead)"
        )

    # resolve to file path
    log_file = (
        log_file
        if isinstance(log_file, str)
        else log_file.as_posix()
        if isinstance(log_file, Path)
        else log_file.name
    )

    # will use s3fs and is not called from main inspect solver/scorer/tool/sandbox
    # flow, so force the use of asyncio
    async def do_read() -> EvalSample:
        reader = AsyncZipReader(get_async_filesystem(), log_file)
        return await read_eval_log_sample_async(
            log_file,
            id,
            epoch,
            uuid,
            resolve_attachments,
            format,
            exclude_fields,
            reader,
        )

    return run_coroutine(do_read())


async def read_eval_log_sample_async(
    log_file: str | Path | EvalLogInfo,
    id: int | str | None = None,
    epoch: int = 1,
    uuid: str | None = None,
    resolve_attachments: bool | Literal["full", "core"] = False,
    format: Literal["eval", "json", "auto"] = "auto",
    exclude_fields: set[str] | None = None,
    reader: AsyncZipReader | None = None,
) -> EvalSample:
    """Read a sample from an evaluation log.

    Args:
       log_file (str | FileInfo): Log file to read.
       id (int | str): Sample id to read.
       epoch (int): Epoch for sample id (defaults to 1)
       uuid: Sample uuid to read.
       resolve_attachments (bool): Resolve attachments (duplicated content blocks)
          to their full content.
       format (Literal["eval", "json", "auto"]): Read from format
          (defaults to 'auto' based on `log_file` extension)
       exclude_fields (set[str] | None): Set of field names to exclude when reading
          the sample. Useful when reading large samples with fields like
          'store' or 'attachments' that aren't needed.
       reader (AsyncZipReader | None): Optional async zip reader to use when reading the sample.

    Returns:
       EvalSample object read from file.

    Raises:
       IndexError: If the passed id and epoch are not found.
    """
    # resolve to file path
    log_file = (
        log_file
        if isinstance(log_file, str)
        else log_file.as_posix()
        if isinstance(log_file, Path)
        else log_file.name
    )

    # validate that either id or uuid is passed
    if id is None and uuid is None:
        raise ValueError(
            "You must specify either a sample 'id' and 'epoch' or a sample 'uuid'"
        )

    if format == "auto":
        recorder_type = recorder_type_for_location(log_file)
    else:
        recorder_type = recorder_type_for_format(format)
    if exclude_fields:
        if "events" not in exclude_fields:
            # events_data is needed to resolve refs in events
            exclude_fields = exclude_fields - {"events_data"}
        else:
            # no events means events_data is useless
            exclude_fields = exclude_fields | {"events_data"}

    sample = await recorder_type.read_log_sample(
        log_file, id, epoch, uuid, exclude_fields, reader
    )

    # always resolve message pool refs so ModelEvent.input is populated
    sample = resolve_sample_events_data(sample)
    if resolve_attachments:
        sample = resolve_sample_attachments(sample, resolve_attachments)

    return sample


def read_eval_log_sample_summaries(
    log_file: str | Path | EvalLogInfo,
    format: Literal["eval", "json", "auto"] = "auto",
) -> list[EvalSampleSummary]:
    """Read sample summaries from an eval log.

    Args:
       log_file (str | FileInfo): Log file to read.
       format (Literal["eval", "json", "auto"]): Read from format
          (defaults to 'auto' based on `log_file` extension)

    Returns:
       Sample summaries for eval log.
    """
    # don't mix trio and asyncio
    if current_async_backend() == "trio":
        raise RuntimeError(
            "read_eval_log_sample_summaries cannot be called from a trio async context (please use read_eval_log_sample_summaries_asymc instead)"
        )

    # will use s3fs and is not called from main inspect solver/scorer/tool/sandbox
    # flow, so force the use of asyncio
    return run_coroutine(read_eval_log_sample_summaries_async(log_file, format))


async def read_eval_log_sample_summaries_async(
    log_file: str | Path | EvalLogInfo,
    format: Literal["eval", "json", "auto"] = "auto",
) -> list[EvalSampleSummary]:
    """Read sample summaries from an eval log.

    Args:
       log_file (str | FileInfo): Log file to read.
       format (Literal["eval", "json", "auto"]): Read from format
          (defaults to 'auto' based on `log_file` extension)

    Returns:
       Sample summaries for eval log.
    """
    # resolve to file path
    log_file = (
        log_file
        if isinstance(log_file, str)
        else log_file.as_posix()
        if isinstance(log_file, Path)
        else log_file.name
    )

    if format == "auto":
        recorder_type = recorder_type_for_location(log_file)
    else:
        recorder_type = recorder_type_for_format(format)
    return await recorder_type.read_log_sample_summaries(log_file)


def read_eval_log_samples(
    log_file: str | Path | EvalLogInfo,
    all_samples_required: bool = True,
    resolve_attachments: bool | Literal["full", "core"] = False,
    format: Literal["eval", "json", "auto"] = "auto",
    exclude_fields: set[str] | None = None,
) -> Generator[EvalSample, None, None]:
    """Read all samples from an evaluation log incrementally.

    Generator for samples in a log file. Only one sample at a time
    will be read into memory and yielded to the caller.

    Args:
       log_file (str | FileInfo): Log file to read.
       all_samples_required (bool): All samples must be included in
          the file or an IndexError is thrown.
       resolve_attachments (bool): Resolve attachments (duplicated content blocks)
          to their full content.
       format (Literal["eval", "json", "auto"]): Read from format
          (defaults to 'auto' based on `log_file` extension)
       exclude_fields (set[str] | None): Set of field names to exclude when reading
          the sample. Useful when reading large samples with fields like
          'store' or 'attachments' that aren't needed.

    Returns:
       Generator of EvalSample objects in the log file.

    Raises:
       IndexError: If `all_samples_required` is `True` and one of the target
          samples does not exist in the log file.
    """
    # read header
    log_header = read_eval_log(log_file, header_only=True, format=format)

    # do we have the list of samples?
    if log_header.eval.dataset.sample_ids is None:
        raise RuntimeError(
            "This log file does not include sample_ids "
            + "(fully reading and re-writing the log will add sample_ids)"
        )

    # if the status is not success and all_samples_required, this is an error
    if all_samples_required and (
        log_header.status != "success" or log_header.invalidated
    ):
        raise RuntimeError(
            f"This log does not have all samples (status={log_header.status}). "
            + "Specify all_samples_required=False to read the samples that exist."
        )

    # loop over samples and epochs
    for sample_id in log_header.eval.dataset.sample_ids:
        for epoch_id in range(1, (log_header.eval.config.epochs or 1) + 1):
            try:
                sample = read_eval_log_sample(
                    log_file=log_file,
                    id=sample_id,
                    epoch=epoch_id,
                    resolve_attachments=resolve_attachments,
                    format=format,
                    exclude_fields=exclude_fields,
                )
                yield sample
            except IndexError:
                if all_samples_required:
                    raise


def manifest_eval_log_name(info: EvalLogInfo, log_dir: str, sep: str) -> str:
    # ensure that log dir has a trailing seperator
    if not log_dir.endswith(sep):
        log_dir = f"{log_dir}/"

    # slice off log_dir from the front
    log = info.name.replace(log_dir, "")

    # manifests are web artifacts so always use forward slash
    return log.replace("\\", "/")


def log_files_from_ls(
    ls: list[FileInfo],
    formats: list[Literal["eval", "json"]] | None = None,
    descending: bool = True,
    sort: bool = True,
) -> list[EvalLogInfo]:
    extensions = [f".{format}" for format in (formats or ALL_LOG_FORMATS)]
    return [
        log_file_info(file)
        for file in (
            sorted(
                ls,
                key=lambda file: file.mtime if file.mtime else 0,
                reverse=descending,
            )
            if sort
            else ls
        )
        if file.type == "file" and is_log_file(file.name, extensions)
    ]


log_file_pattern = r"^\d{4}-\d{2}-\d{2}T\d{2}[:-]\d{2}[:-]\d{2}.*$"


def is_log_file(file: str, extensions: list[str]) -> bool:
    parts = file.replace("\\", "/").split("/")
    name = parts[-1]

    if name.endswith(f".{EVAL_LOG_FORMAT}"):
        return True
    else:
        return re.match(log_file_pattern, name) is not None and any(
            [name.endswith(suffix) for suffix in extensions]
        )


def log_file_info(info: FileInfo) -> "EvalLogInfo":
    # extract the basename and split into parts
    # (deal with previous logs had the model in their name)
    basename = os.path.splitext(info.name)[0]
    parts = basename.split("/").pop().split("_")
    if len(parts) == 1:
        task = ""
        task_id = ""
        suffix = None
    elif len(parts) == 2:
        task = parts[1]
        task_id = ""
        suffix = None
    else:
        last_idx = 3 if len(parts) > 3 else 2
        task = parts[1]
        part3 = parts[last_idx].split("-")
        task_id = part3[0]
        suffix = task_id[2] if len(part3) > 1 else None
    return EvalLogInfo(
        name=info.name,
        type=info.type,
        size=info.size,
        mtime=info.mtime,
        task=task,
        task_id=task_id,
        suffix=suffix,
    )


def eval_log_json(log: EvalLog) -> bytes:
    # serialize to json (ignore values that are unserializable)
    # these values often result from solvers using metadata to
    # pass around 'live' objects -- this is fine to do and we
    # don't want to prevent it at the serialization level
    return to_json_safe(log)


def eval_log_json_str(log: EvalLog) -> str:
    return eval_log_json(log).decode()


def write_log_listing(
    log_dir: str,
    *,
    logs: list[EvalLogInfo] | None = None,
    filename: str = "listing.json",
    output_dir: str | None = None,
    fs_options: dict[str, Any] = {},
) -> None:
    """Write a listing file for a log directory.

    A listing file is a thinned manifest summarizing the logs in the directory (but with much less information than a full manifest of headers).

    Args:
      log_dir (str): Log directory to write overview for.
      logs (list[EvalLogInfo] | None): Pre-fetched log list (defaults to listing log_dir).
      filename (str): Manifest filename (defaults to "overview.json")
      output_dir (str | None): Output directory for manifest (defaults to log_dir)
      fs_options (dict[str,Any]): Optional. Additional arguments to pass through
        to the filesystem provider (e.g. `S3FileSystem`).
    """
    # resolve log dir to full path
    fs = filesystem(log_dir)
    log_dir = fs.info(log_dir).name

    # list eval logs
    if logs is None:
        logs = list_eval_logs(log_dir)

    # resolve to overview (make filenames relative to the log dir)
    names = [manifest_eval_log_name(log, log_dir, fs.sep) for log in logs]
    headers = read_eval_log_headers(logs)
    overviews = [to_overview(header) for header in headers]

    file_overviews = dict(zip(names, overviews))

    # form target path and write
    output_dir = output_dir or log_dir
    fs = filesystem(output_dir)
    manifest = f"{output_dir}{fs.sep}{filename}"
    manifest_json = to_json_safe(file_overviews)
    with file(manifest, mode="wb", fs_options=fs_options) as f:
        f.write(manifest_json)


def to_overview(header: EvalLog) -> LogOverview:
    """Convert an EvalLog header to a thinned overview."""
    # Get the primary metric if it exists
    primary_metric: EvalMetric | None = None
    if (
        header.results is not None
        and header.results.scores
        and (first_scorer := header.results.scores[0]).metrics
    ):
        primary_metric = next(iter(first_scorer.metrics.values()))

    return LogOverview(
        eval_id=header.eval.eval_id,
        run_id=header.eval.run_id,
        task=header.eval.task,
        task_id=header.eval.task_id,
        task_version=header.eval.task_version,
        version=header.version,
        status=header.status,
        invalidated=header.invalidated,
        error=header.error,
        model=header.eval.model,
        started_at=header.stats.started_at,
        completed_at=header.stats.completed_at,
        primary_metric=primary_metric,
    )
```

## `log/_log.py`

```python
from logging import getLogger
from types import TracebackType
from typing import Any, Literal, Type

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    JsonValue,
    PrivateAttr,
    ValidationInfo,
    field_serializer,
    model_validator,
)
from shortuuid import uuid
from typing_extensions import TypedDict

from inspect_ai._util.constants import DESERIALIZING
from inspect_ai._util.dateutil import UtcDatetimeStr
from inspect_ai._util.error import EvalError, exception_message
from inspect_ai._util.hash import base57_id_hash
from inspect_ai._util.json import to_json_str_safe
from inspect_ai._util.logger import warn_once
from inspect_ai._util.metadata import MT, metadata_as
from inspect_ai._util.rich import format_traceback
from inspect_ai.approval._policy import ApprovalPolicyConfig
from inspect_ai.event._timeline import Timeline
from inspect_ai.log._edit import LogUpdate, MetadataEdit, ProvenanceData, TagsEdit
from inspect_ai.model import (
    ChatMessage,
    GenerateConfig,
    ModelOutput,
    ModelUsage,
)
from inspect_ai.model._model_config import ModelConfig
from inspect_ai.scorer import Score
from inspect_ai.util._early_stopping import EarlyStoppingSummary
from inspect_ai.util._sandbox.environment import SandboxEnvironmentSpec
from inspect_ai.util._store import Store
from inspect_ai.util._store_model import SMT

from ..event._event import Event
from ._util import thin_input, thin_metadata, thin_target, thin_text

logger = getLogger(__name__)


class EventsData(TypedDict):
    """Pooled data extracted by condense_events / condense_sample."""

    messages: list[ChatMessage]
    calls: list[JsonValue]


EvalStatus = Literal["started", "success", "cancelled", "error"]
"""Status of an evaluation run."""

SCORER_PLACEHOLDER = "88F74D2C"


class EvalConfigDefaults(TypedDict):
    epochs: int
    epochs_reducer: list[str]
    fail_on_error: bool
    continue_on_fail: bool
    sandbox_cleanup: bool
    log_samples: bool
    log_realtime: bool
    log_images: bool
    log_model_api: bool
    score_display: bool


def eval_config_defaults() -> EvalConfigDefaults:
    return {
        "epochs": 1,
        "epochs_reducer": ["mean"],
        "fail_on_error": True,
        "continue_on_fail": False,
        "sandbox_cleanup": True,
        "log_samples": True,
        "log_realtime": True,
        "log_images": True,
        "log_model_api": False,
        "score_display": True,
    }


class EvalConfig(BaseModel):
    """Configuration used for evaluation."""

    limit: int | tuple[int, int] | None = Field(default=None)
    """Sample limit (number of samples or range of samples)."""

    sample_id: str | int | list[str] | list[int] | list[str | int] | None = Field(
        default=None
    )
    """Evaluate specific sample(s)."""

    sample_shuffle: bool | int | None = Field(default=None)
    """Shuffle order of samples."""

    epochs: int | None = Field(default=None)
    """Number of epochs to run samples over."""

    epochs_reducer: list[str] | None = Field(default=None)
    """Reducers for aggregating per-sample scores."""

    approval: ApprovalPolicyConfig | None = Field(default=None)
    """Approval policy for tool use."""

    fail_on_error: bool | float | None = Field(default=None)
    """Fail eval when sample errors occur.

    `True` to fail on first sample error (default); `False` to never
    fail on sample errors; Value between 0 and 1 to fail if a proportion
    of total samples fails. Value greater than 1 to fail eval if a count
    of samples fails.
    """

    continue_on_fail: bool | None = Field(default=None)
    """Continue eval even if the `fail_on_error` condition is met.

    `True` to continue running and only fail at the end if the `fail_on_error` condition is met.
    `False` to fail eval immediately when the `fail_on_error` condition is met (default).
    """

    retry_on_error: int | None = Field(default=None)
    """Number of times to retry samples if they encounter errors."""

    message_limit: int | None = Field(default=None)
    """Maximum messages to allow per sample."""

    token_limit: int | None = Field(default=None)
    """Maximum tokens usage per sample."""

    time_limit: int | None = Field(default=None)
    """Maximum clock time per sample."""

    working_limit: int | None = Field(default=None)
    """Meximum working time per sample."""

    cost_limit: float | None = Field(default=None)
    """Maximum cost (in dollars) per sample."""

    max_samples: int | None = Field(default=None)
    """Maximum number of samples to run in parallel."""

    max_dataset_memory: int | None = Field(default=None)
    """Maximum MB of dataset sample data to hold in memory per task.
    When exceeded, samples are paged to a temporary file on disk."""

    max_tasks: int | None = Field(default=None)
    """Maximum number of tasks to run in parallel."""

    max_subprocesses: int | None = Field(default=None)
    """Maximum number of subprocesses to run concurrently."""

    max_sandboxes: int | None = Field(default=None)
    """Maximum number of sandboxes to run concurrently."""

    sandbox_cleanup: bool | None = Field(default=None)
    """Cleanup sandbox environments after task completes."""

    log_samples: bool | None = Field(default=None)
    """Log detailed information on each sample."""

    log_realtime: bool | None = Field(default=None)
    """Log events in realtime (enables live viewing of samples in inspect view)."""

    log_images: bool | None = Field(default=None)
    """Log base64 encoded versions of images."""

    log_model_api: bool | None = Field(default=None)
    """Log raw model api requests and responses."""

    log_buffer: int | None = Field(default=None)
    """Number of samples to buffer before writing log file."""

    log_shared: int | None = Field(default=None)
    """Interval (in seconds) for syncing sample events to log directory."""

    score_display: bool | None = Field(default=None)
    """Display scoring metrics realtime."""

    @property
    def max_messages(self) -> int | None:
        """Deprecated max_messages property."""
        return self.message_limit

    @model_validator(mode="before")
    @classmethod
    def convert_max_messages_to_message_limit(
        cls: Type["EvalConfig"], values: Any
    ) -> Any:
        """Migrate deprecated max_messages property."""
        if not isinstance(values, dict):
            return values
        max_messages = values.get("max_messages", None)
        if max_messages:
            values["message_limit"] = max_messages
        return values


class EvalSampleLimit(BaseModel):
    """Limit encountered by sample."""

    type: Literal[
        "context", "time", "working", "message", "token", "cost", "operator", "custom"
    ]
    """The type of limit"""

    limit: float
    """The limit value"""


class EvalSampleSummary(BaseModel):
    """Summary information (including scoring) for a sample."""

    id: int | str
    """Unique id for sample."""

    epoch: int
    """Epoch number for sample."""

    input: str | list[ChatMessage]
    """Sample input (text inputs only)."""

    choices: list[str] | None = Field(default=None)
    """Sample choices."""

    target: str | list[str]
    """Sample target value(s)"""

    metadata: dict[str, Any] = Field(default_factory=dict)
    """Sample metadata (only fields < 1k; strings truncated to 1k)."""

    scores: dict[str, Score] | None = Field(default=None)
    """Scores for sample (only metadata fields < 1k; strings truncated to 1k)."""

    model_usage: dict[str, ModelUsage] = Field(default_factory=dict)
    """Model token usage for sample."""

    role_usage: dict[str, ModelUsage] = Field(default_factory=dict)
    """Model token usage by role for sample."""

    started_at: UtcDatetimeStr | None = Field(default=None)
    """Time sample started."""

    completed_at: UtcDatetimeStr | None = Field(default=None)
    """Time sample completed."""

    total_time: float | None = Field(default=None)
    """Total time that the sample was running."""

    working_time: float | None = Field(default=None)
    """Time spent working (model generation, sandbox calls, etc.)"""

    uuid: str | None = Field(default=None)
    """Globally unique identifier for sample run (exists for samples created in Inspect >= 0.3.70)"""

    error: str | None = Field(default=None)
    """Error that halted sample."""

    limit: str | None = Field(default=None)
    """Limit that halted the sample"""

    retries: int | None = Field(default=None)
    """Number of retries for the sample."""

    completed: bool = Field(default=False)
    """Is the sample complete."""

    message_count: int | None = Field(default=None)
    """Number of messages in the sample conversation."""

    @model_validator(mode="after")
    def thin_data(self) -> "EvalSampleSummary":
        # thin input
        self.input = thin_input(self.input)

        # thin target
        self.target = thin_target(self.target)

        # thin metadata
        self.metadata = thin_metadata(self.metadata)

        # thin score explanations and metadata
        if self.scores is not None:
            self.scores = {
                key: Score(
                    value=score.value,
                    answer=thin_text(score.answer)
                    if score.answer is not None
                    else None,
                    explanation=thin_text(score.explanation)
                    if score.explanation is not None
                    else None,
                    metadata=thin_metadata(score.metadata)
                    if score.metadata is not None
                    else None,
                )
                for key, score in self.scores.items()
            }
        return self

    # allow field model_usage
    model_config = ConfigDict(protected_namespaces=())


class EvalSample(BaseModel):
    """Sample from evaluation task."""

    id: int | str
    """Unique id for sample."""

    epoch: int
    """Epoch number for sample."""

    input: str | list[ChatMessage]
    """Sample input."""

    choices: list[str] | None = Field(default=None)
    """Sample choices."""

    target: str | list[str]
    """Sample target value(s)"""

    sandbox: SandboxEnvironmentSpec | None = Field(default=None)
    """Sandbox environment type and optional config file."""

    files: list[str] | None = Field(default=None)
    """Files that go along with the sample (copied to SandboxEnvironment)"""

    setup: str | None = Field(default=None)
    """Setup script to run for sample (run within default SandboxEnvironment)."""

    messages: list[ChatMessage] = Field(default_factory=list)
    """Chat conversation history for sample."""

    output: ModelOutput = Field(default_factory=ModelOutput)
    """Model output from sample."""

    scores: dict[str, Score] | None = Field(default=None)
    """Scores for sample."""

    metadata: dict[str, Any] = Field(default_factory=dict)
    """Additional sample metadata."""

    def metadata_as(self, metadata_cls: Type[MT]) -> MT:
        """Pydantic model interface to metadata.

        Args:
          metadata_cls: Pydantic model type

        Returns:
          BaseModel: Instance of metadata_cls bound to sample metadata.
        """
        return metadata_as(self.metadata, metadata_cls)

    store: dict[str, Any] = Field(default_factory=dict)
    """State at end of sample execution."""

    def store_as(self, model_cls: Type[SMT], instance: str | None = None) -> SMT:
        """Pydantic model interface to the store.

        Args:
          model_cls: Pydantic model type (must derive from StoreModel)
          instance: Optional instances name for store (enables multiple instances
            of a given StoreModel type within a single sample)

        Returns:
          StoreModel: model_cls bound to sample store data.
        """
        # un-namespace names for creation
        data = {
            k.replace(f"{model_cls.__name__}:", "", 1): v for k, v in self.store.items()
        }

        # since we are reading from the log provide a fully detached store
        data["store"] = Store()

        # provide instance if specified
        if instance is not None:
            data["instance"] = instance

        # create the model
        return model_cls.model_validate(data)

    events: list[Event] = Field(default_factory=list)
    """Events that occurred during sample execution."""

    timelines: list[Timeline] | None = Field(default=None)
    """Custom timelines for this sample."""

    model_usage: dict[str, ModelUsage] = Field(default_factory=dict)
    """Model token usage for sample."""

    role_usage: dict[str, ModelUsage] = Field(default_factory=dict)
    """Model token usage by role for sample."""

    started_at: UtcDatetimeStr | None = Field(default=None)
    """Time sample started."""

    completed_at: UtcDatetimeStr | None = Field(default=None)
    """Time sample completed."""

    total_time: float | None = Field(default=None)
    """Total time that the sample was running."""

    working_time: float | None = Field(default=None)
    """Time spent working (model generation, sandbox calls, etc.)"""

    uuid: str | None = Field(default=None)
    """Globally unique identifier for sample run (exists for samples created in Inspect >= 0.3.70)"""

    invalidation: ProvenanceData | None = Field(default=None)
    """Provenance data for invalidation."""

    error: EvalError | None = Field(default=None)
    """Error that halted sample."""

    error_retries: list[EvalError] | None = Field(default=None)
    """Errors that were retried for this sample."""

    attachments: dict[str, str] = Field(default_factory=dict)
    """Attachments referenced from messages and events.

    Resolve attachments for a sample (replacing attachment://* references with
    attachment content) by passing `resolve_attachments=True` to log reading functions.
    """

    events_data: EventsData | None = Field(default=None)
    """Pooled dedup data for condensed events (messages and calls)."""

    limit: EvalSampleLimit | None = Field(default=None)
    """The limit that halted the sample"""

    def summary(self) -> EvalSampleSummary:
        """Summary of sample.

        The summary excludes potentially large fields like messages, output,
        events, store, and metadata so that it is always fast to load.

        If there are images, audio, or video in the input, they are
        replaced with a placeholder.

        Returns:
           Summary of sample.
        """
        return EvalSampleSummary(
            id=self.id,
            epoch=self.epoch,
            input=self.input,
            choices=self.choices,
            target=self.target,
            metadata=self.metadata,
            scores=self.scores,
            model_usage=self.model_usage,
            started_at=self.started_at,
            completed_at=self.completed_at,
            total_time=self.total_time,
            working_time=self.working_time,
            uuid=self.uuid,
            error=self.error.message if self.error is not None else None,
            limit=f"{self.limit.type}" if self.limit is not None else None,
            retries=len(self.error_retries) if self.error_retries is not None else None,
            completed=True,
            message_count=len(self.messages),
        )

    # deprecated properties

    @property
    def score(self) -> Score | None:
        """Score for sample (deprecated)."""
        warn_once(
            logger,
            "The 'score' field is deprecated. Access sample scores through 'scores' instead.",
        )

        return list(self.scores.values())[0] if self.scores else None

    @property
    def transcript(self) -> "EvalEvents":
        """Transcript of sample events (deprecated)."""
        warn_once(
            logger,
            "EvalSample 'transcript' field is deprecated. Please use 'events' and 'attachments' fields instead.",
        )
        return EvalEvents(events=self.events, content=self.attachments)

    @model_validator(mode="before")
    @classmethod
    def migrate_deprecated(cls: Type["EvalSample"], values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        if "score" in values:
            # There cannot be a scorers property too
            if "scores" in values:
                raise TypeError(
                    "Unexpected value `scores` present when `score` has already been specified."
                )

            # Convert the scorer to the new schema
            score = values["score"]
            values["scores"] = {SCORER_PLACEHOLDER: score}

            # Get rid of the 'scorer' property
            del values["score"]

        if "transcript" in values:
            # promote 'transcript' up to 'events' and 'attachments'
            eval_events = EvalEvents(**values["transcript"])
            values["events"] = eval_events.events
            values["attachments"] = eval_events.content

            # get rid of transcript (property accessor w/ deprecation
            # warning will handle this)
            del values["transcript"]

        return migrate_values(values)

    @model_validator(mode="wrap")
    @classmethod
    def _resolve_timelines(
        cls, data: Any, handler: Any, info: ValidationInfo
    ) -> "EvalSample":
        raw_timelines = None
        if isinstance(data, dict) and data.get("timelines"):
            raw_timelines = data.pop("timelines")

        sample: EvalSample = handler(data)

        if raw_timelines:
            events_by_uuid = {e.uuid: e for e in sample.events if e.uuid}
            ctx: dict[str, Any] = {"events_by_uuid": events_by_uuid}
            if info.context:
                ctx.update(info.context)
            sample.timelines = [
                Timeline.model_validate(t, context=ctx) for t in raw_timelines
            ]

        return sample

    # allow field model_usage
    model_config = ConfigDict(protected_namespaces=())


class EvalEvents(BaseModel):
    events: list[Event] = Field(default_factory=list)
    """List of events."""

    content: dict[str, str] = Field(default_factory=dict)
    """Content references."""


class EvalPlanStep(BaseModel):
    """Solver step."""

    solver: str
    """Name of solver."""

    params: dict[str, Any] = Field(default_factory=dict)
    """Parameters used to instantiate solver."""

    params_passed: dict[str, Any] = Field(default_factory=dict)
    """Parameters explicitly passed to the eval plan."""

    @model_validator(mode="before")
    @classmethod
    def read_params(cls: Type["EvalPlanStep"], values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        if "params_passed" not in values:
            values["params_passed"] = values.get("params", {})
        return values


class EvalPlan(BaseModel):
    """Plan (solvers) used in evaluation."""

    name: str = Field(default="plan")
    """Plan name."""

    steps: list[EvalPlanStep] = Field(default=[])
    """Steps in plan."""

    finish: EvalPlanStep | None = Field(default=None)
    """Step to always run at the end."""

    config: GenerateConfig = Field(default=GenerateConfig())
    """Generation config."""


class EvalMetric(BaseModel):
    """Metric for evaluation score."""

    name: str
    """Metric name."""

    value: int | float
    """Metric value."""

    params: dict[str, Any] = Field(default_factory=dict)
    """Params specified when creating metric."""

    metadata: dict[str, Any] | None = Field(default=None)
    """Additional metadata associated with metric."""


class EvalScore(BaseModel):
    """Score for evaluation task."""

    name: str
    """Score name."""

    scorer: str
    """Scorer name."""

    reducer: str | None = Field(default=None)
    """Reducer name."""

    scored_samples: int | None = Field(default=None)
    """Number of samples scored by this scorer."""

    unscored_samples: int | None = Field(default=None)
    """Number of samples not scored by this scorer."""

    params: dict[str, Any] = Field(default_factory=dict)
    """Parameters specified when creating scorer."""

    metrics: dict[str, EvalMetric] = Field(default_factory=dict)
    """Metrics computed for this scorer."""

    metadata: dict[str, Any] | None = Field(default=None)
    """Additional scorer metadata."""


class EvalSampleScore(Score):
    """Score and sample_id scored."""

    sample_id: str | int | None = Field(default=None)
    """Sample ID."""


class EvalSampleReductions(BaseModel):
    """Score reductions."""

    scorer: str
    """Name the of scorer"""

    reducer: str | None = Field(default=None)
    """Name the of reducer"""

    samples: list[EvalSampleScore]
    """List of reduced scores"""


class EvalResults(BaseModel):
    """Scoring results from evaluation."""

    total_samples: int = Field(default=0)
    """Total samples in eval (dataset samples * epochs)"""

    completed_samples: int = Field(default=0)
    """Samples completed without error.

    Will be equal to total_samples except when --fail-on-error is enabled
    or when there is early stopping.
    """

    early_stopping: EarlyStoppingSummary | None = Field(default=None)
    """Early stopping summary (if an early stopping manager was present)."""

    @property
    def scorer(self) -> EvalScore | None:
        """Scorer used to compute results (deprecated)."""
        warn_once(
            logger,
            "The 'scorer' field is deprecated. Use 'scores' instead.",
        )
        return self.scores[0] if self.scores else None

    @property
    def metrics(self) -> dict[str, EvalMetric]:
        """Metrics computed (deprecated)."""
        warn_once(
            logger,
            "The 'metrics' field is deprecated. Access metrics through 'scores' instead.",
        )
        return self.scores[0].metrics if self.scores else {}

    scores: list[EvalScore] = Field(default=[])
    """Scorers used to compute results"""

    metadata: dict[str, Any] | None = Field(default=None)
    """Additional results metadata."""

    _sample_reductions: list[EvalSampleReductions] | None = PrivateAttr(default=None)
    """Private member to hold sample reductions"""

    @property
    def sample_reductions(self) -> list[EvalSampleReductions] | None:
        """List of per sample scores reduced across epochs"""
        warn_once(
            logger,
            "The 'sample_reductions' field is deprecated. Access reductions through the 'reductions' field on EvalLog instead.",
        )
        return self._sample_reductions

    @sample_reductions.setter
    def sample_reductions(self, value: list[EvalSampleReductions] | None) -> None:
        """Set list of per sample scores reduced across epochs"""
        self._sample_reductions = value

    @model_validator(mode="before")
    @classmethod
    def convert_scorer_to_scorers(cls: Type["EvalResults"], values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        if "scorer" in values:
            # There cannot be a scorers property too
            if "scores" in values:
                raise TypeError(
                    "Unexpected value `scores` present when `scorer` has already been specified."
                )

            # Gather metrics
            if "metrics" in values:
                metrics = values["metrics"]
                del values["metrics"]
            else:
                metrics = None
            # Convert the scorer to the new schema
            score = values["scorer"]
            if metrics:
                score["metrics"] = metrics
            score["scorer"] = score["name"]
            values["scores"] = [score]

            # Get rid of the 'scorer' property
            del values["scorer"]

        return values


class EvalDataset(BaseModel):
    """Dataset used for evaluation."""

    name: str | None = Field(default=None)
    """Dataset name."""

    location: str | None = Field(default=None)
    """Dataset location (file path or remote URL)"""

    samples: int | None = Field(default=None)
    """Number of samples in the dataset."""

    sample_ids: list[str] | list[int] | list[str | int] | None = Field(default=None)
    """IDs of samples in the dataset."""

    shuffled: bool | None = Field(default=None)
    """Was the dataset shuffled after reading."""


class EvalMetricDefinition(BaseModel):
    name: str
    """Metric name"""

    options: dict[str, Any] | None = Field(default=None)


class EvalScorer(BaseModel):
    name: str
    """Scorer name"""

    options: dict[str, Any] | None = Field(default=None)
    """Scorer arguments"""

    metrics: (
        list[EvalMetricDefinition | dict[str, list[EvalMetricDefinition]]]
        | dict[str, list[EvalMetricDefinition]]
        | None
    ) = Field(default=None)

    metadata: dict[str, Any] | None = Field(default=None)
    """Scorer metadata"""


class EvalRevision(BaseModel):
    """Git revision for evaluation."""

    type: Literal["git"]
    """Type of revision (currently only "git")"""

    origin: str
    """Revision origin server"""

    commit: str
    """Revision commit."""

    dirty: bool | None = Field(default=None)
    """Working tree has uncommitted changes or untracked files."""


class EvalSpec(BaseModel):
    """Eval target and configuration."""

    eval_set_id: str | None = Field(default=None)
    """Globally unique id for eval set (if any)."""

    eval_id: str = Field(default_factory=str)
    """Globally unique id for eval."""

    run_id: str = Field(default_factory=str)
    """Unique run id"""

    created: UtcDatetimeStr
    """Time created."""

    task: str
    """Task name."""

    task_id: str = Field(default_factory=str)
    """Unique task id."""

    task_version: int | str = Field(default=0)
    """Task version."""

    task_file: str | None = Field(default=None)
    """Task source file."""

    task_display_name: str | None = Field(default=None)
    """Task display name."""

    task_registry_name: str | None = Field(default=None)
    """Task registry name."""

    task_attribs: dict[str, Any] = Field(default_factory=dict)
    """Attributes of the @task decorator."""

    task_args: dict[str, Any] = Field(default_factory=dict)
    """Arguments used for invoking the task (including defaults)."""

    task_args_passed: dict[str, Any] = Field(default_factory=dict)
    """Arguments explicitly passed by caller for invoking the task."""

    solver: str | None = Field(default=None)
    """Solver name."""

    solver_args: dict[str, Any] | None = Field(default=None)
    """Arguments used for invoking the solver."""

    solver_args_passed: dict[str, Any] | None = Field(default=None)
    """Arguments explicitly passed by caller for invoking the solver."""

    tags: list[str] | None = Field(default=None)
    """Tags associated with evaluation run."""

    dataset: EvalDataset
    """Dataset used for eval."""

    sandbox: SandboxEnvironmentSpec | None = Field(default=None)
    """Sandbox environment type and optional config file."""

    model: str
    """Model used for eval."""

    model_generate_config: GenerateConfig = Field(default_factory=GenerateConfig)
    """Generate config specified for model instance."""

    model_base_url: str | None = Field(default=None)
    """Optional override of model base url"""

    model_args: dict[str, Any] = Field(default_factory=dict)
    """Model specific arguments."""

    model_roles: dict[str, ModelConfig] | None = Field(default=None)
    """Model roles."""

    config: EvalConfig
    """Configuration values for eval."""

    revision: EvalRevision | None = Field(default=None)
    """Source revision of eval."""

    packages: dict[str, str] = Field(default_factory=dict)
    """Package versions for eval."""

    metadata: dict[str, Any] | None = Field(default=None)
    """Additional eval metadata."""

    scorers: list[EvalScorer] | None = Field(default=None)
    """Scorers and args for this eval"""

    metrics: (
        list[EvalMetricDefinition | dict[str, list[EvalMetricDefinition]]]
        | dict[str, list[EvalMetricDefinition]]
        | None
    ) = Field(default=None)
    """metrics and args for this eval"""

    # allow field model_args
    model_config = ConfigDict(protected_namespaces=())

    def model_post_init(self, __context: Any) -> None:
        # check if deserializing
        is_deserializing = isinstance(__context, dict) and __context.get(
            DESERIALIZING, False
        )

        # Generate eval_id if needed
        if self.eval_id == "":
            if is_deserializing:
                # we want the eval_id to be stable across reads of the eval log so we compose it
                # as a hash that matches the size/apperance of shortuuid-based uuids
                self.eval_id = base57_id_hash(self.run_id + self.task_id + self.created)
            else:
                self.eval_id = uuid()

    @model_validator(mode="before")
    @classmethod
    def read_sandbox_spec(cls: Type["EvalSpec"], values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        return migrate_values(values)


def migrate_values(values: dict[str, Any]) -> dict[str, Any]:
    if "sandbox" in values:
        sandbox = values.get("sandbox")
        if isinstance(sandbox, list):
            values["sandbox"] = SandboxEnvironmentSpec(
                type=sandbox[0], config=sandbox[1]
            )
    if "task_args_passed" not in values:
        values["task_args_passed"] = values.get("task_args", {})
    if "solver_args_passed" not in values:
        values["solver_args_passed"] = values.get("solver_args", {})
    return values


def eval_error(
    exception: BaseException,
    exc_type: Type[Any],
    exc_value: BaseException,
    exc_traceback: TracebackType | None,
) -> EvalError:
    traceback_text, traceback_ansi = format_traceback(
        exc_type, exc_value, exc_traceback
    )

    return EvalError(
        message=exception_message(exception),
        traceback=traceback_text,
        traceback_ansi=traceback_ansi,
    )


class EvalStats(BaseModel):
    """Timing and usage statistics."""

    started_at: UtcDatetimeStr | Literal[""] = Field(default_factory=str)
    """Evaluation start time. Empty string if eval interrupted before start time set."""

    completed_at: UtcDatetimeStr | Literal[""] = Field(default_factory=str)
    """Evaluation completion time. Empty string if eval interrupted before completion."""

    model_usage: dict[str, ModelUsage] = Field(default_factory=dict)
    """Model token usage for evaluation."""

    role_usage: dict[str, ModelUsage] = Field(default_factory=dict)
    """Model token usage by role for evaluation."""

    # allow field model_usage
    model_config = ConfigDict(protected_namespaces=())


class EvalLog(BaseModel):
    """Evaluation log."""

    # WARNING: The order of these fields is important for the log file format.
    # Do not change the order of these fields without incrementing the version number,
    # updating the log file read/write functionality (such as read_eval_log),
    # and updating the tests.
    version: int = Field(default=2)
    """Eval log file format version."""

    status: EvalStatus = Field(default="started")
    """Status of evaluation (did it succeed or fail)."""

    eval: EvalSpec
    """Eval identity and configuration."""

    plan: EvalPlan = Field(default_factory=EvalPlan)
    """Eval plan (solvers and config)"""

    results: EvalResults | None = None
    """Eval results (scores and metrics)."""

    stats: EvalStats = Field(default_factory=EvalStats)
    """Eval stats (runtime, model usage)"""

    error: EvalError | None = Field(default=None)
    """Error that halted eval (if status=="error")"""

    invalidated: bool = Field(default=False)
    """Whether any samples were invalidated."""

    log_updates: list[LogUpdate] | None = Field(default=None)
    """Post-eval edits to tags and metadata."""

    tags: list[str] = Field(default_factory=list)
    """Current tags (eval-time + edits). Do not set directly; use edit_eval_log()."""

    metadata: dict[str, Any] = Field(default_factory=dict)
    """Current metadata (eval-time + edits). Do not set directly; use edit_eval_log()."""

    samples: list[EvalSample] | None = Field(default=None)
    """Samples processed by eval."""

    reductions: list[EvalSampleReductions] | None = Field(default=None)
    """Reduced sample values"""

    location: str = Field(default_factory=str, exclude=True)
    """Location that the log file was read from."""

    etag: str | None = Field(default=None, exclude=True)
    """ETag from S3 for conditional writes."""

    @model_validator(mode="after")
    def _validate_tags_and_metadata(self) -> "EvalLog":
        self.recompute_tags_and_metadata()
        return self

    def recompute_tags_and_metadata(self) -> None:
        """Recompute tags and metadata from eval-time values + log_updates."""
        tags = set(self.eval.tags or [])
        metadata = dict(self.eval.metadata or {})
        for update in self.log_updates or []:
            for edit in update.edits:
                if isinstance(edit, TagsEdit):
                    tags -= set(edit.tags_remove)
                    tags |= set(edit.tags_add)
                elif isinstance(edit, MetadataEdit):
                    for key in edit.metadata_remove:
                        metadata.pop(key, None)
                    metadata.update(edit.metadata_set)
        self.tags = sorted(tags)
        self.metadata = metadata

    @model_validator(mode="after")
    def populate_scorer_name_for_samples(self) -> "EvalLog":
        if self.samples and self.results and self.results.scores:
            scorer_name = self.results.scores[0].name
            for sample in self.samples:
                if sample.scores and SCORER_PLACEHOLDER in sample.scores:
                    sample.scores[scorer_name] = sample.scores[SCORER_PLACEHOLDER]
                    del sample.scores[SCORER_PLACEHOLDER]

        return self

    @field_serializer("samples", "reductions")
    @classmethod
    def _serialize_lazy_lists(cls, value: Any) -> Any:
        """Ensure LazyList instances are materialized before Pydantic serializes.

        Pydantic v2's Rust serializer accesses the C-level list array directly,
        bypassing Python __len__/__iter__ overrides. For empty LazyList instances
        (not yet loaded), this means Pydantic sees an empty list and never
        triggers the lazy load. Calling _ensure_loaded() here populates the
        underlying C array in-place — no copy needed.
        """
        if value is None:
            return value
        from ._recorders.eval import LazyList

        if isinstance(value, LazyList):
            value._ensure_loaded()
        return value

    @model_validator(mode="before")
    @classmethod
    def resolve_sample_reductions(cls: Type["EvalLog"], values: Any) -> Any:
        if not isinstance(values, dict):
            return values
        has_reductions = "reductions" in values
        has_results = values.get("results", None) is not None
        has_sample_reductions = has_results and (
            "sample_reductions" in values["results"]
        )

        if has_sample_reductions and not has_reductions:
            values["reductions"] = values["results"]["sample_reductions"]
        elif has_reductions and (has_results and not has_sample_reductions):
            values["results"]["sample_reductions"] = values["reductions"]
        return values

    def __repr__(self) -> str:
        return to_json_str_safe(
            self.model_dump(
                exclude={"samples", "reductions"},
                exclude_none=True,
                fallback=lambda _: None,
            )
        )


def sort_samples(samples: list[EvalSample]) -> None:
    # convert into string zfilled so order is preserved
    samples.sort(
        key=lambda sample: (
            sample.epoch,
            (sample.id if isinstance(sample.id, str) else str(sample.id).zfill(20)),
        )
    )
```

## `log/_message.py`

```python

```

## `log/_metric.py`

```python
"""Score metrics recomputation functionality."""

from inspect_ai._eval.task.results import eval_results
from inspect_ai.scorer._metric import SampleScore

from ._log import EvalLog


def recompute_metrics(log: EvalLog) -> None:
    """Recompute aggregate metrics after score edits.

    Args:
        log: The evaluation log to recompute metrics for

    Raises:
        ValueError: If log is missing required data for recomputation
    """
    # Import here to avoid circular imports
    from inspect_ai._eval.score import (
        metrics_from_log_header,
        reducers_from_log_header,
        resolve_scorers,
    )

    if log.samples is None:
        raise ValueError("Log contains no samples")

    # Extract scores from all samples
    scores = []
    for sample in log.samples:
        if sample.scores:
            sample_scores = {}
            for score_name, score in sample.scores.items():
                sample_scores[score_name] = SampleScore(
                    score=score, sample_id=sample.id, sample_metadata=sample.metadata
                )
            scores.append(sample_scores)

    reducers = reducers_from_log_header(log)
    metrics = metrics_from_log_header(log)
    scorers = resolve_scorers(log)

    # Recompute
    results, reductions = eval_results(
        samples=len(log.samples),
        scores=scores,
        reducers=reducers,
        scorers=scorers,
        metrics=metrics,
        early_stopping=log.results.early_stopping if log.results else None,
    )

    # Update the log's results and reductions
    log.results = results
    log.reductions = reductions
```

## `log/_pool.py`

```python
"""Message and call pool deduplication for eval samples.

Design note — hash-based dedup
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Pool dedup keys on a murmur3 hash of the full sorted-keys JSON serialisation
of each ChatMessage.  This is correct-by-construction: identical content
always produces the same hash, and mutated content (even with a stale
``msg.id``) produces a different hash.

The theoretical cost is O(N²) serialisations per sample (each of the N
model events carries the full conversation history of ~N messages).
In practice an ``id(obj)`` → hash cache avoids re-serialising the same
Python object, bringing the common case back to O(N) while remaining
correct even when users mutate objects (same object identity = same
content by definition).
"""

import json
from collections.abc import Mapping, Sequence
from typing import Final, TypeVar

from pydantic import JsonValue

from inspect_ai._util.hash import mm3_hash
from inspect_ai.model._chat_message import ChatMessage

from ..event._event import Event
from ..event._model import ModelEvent
from ._log import EvalSample


def _msg_hash(msg: ChatMessage) -> str:
    """Compute a content hash for dedup keying."""
    return mm3_hash(json.dumps(json.loads(msg.model_dump_json()), sort_keys=True))


def _build_msg_index(pool: list[ChatMessage]) -> dict[str, int]:
    """Build msg_id -> pool index mapping, matching condense_model_event_inputs logic."""
    index: dict[str, int] = {}
    for i, msg in enumerate(pool):
        index[_msg_hash(msg)] = i
    return index


def _build_call_index(pool: list[JsonValue]) -> dict[str, int]:
    """Build hash -> pool index mapping, matching condense_model_event_calls logic."""
    index: dict[str, int] = {}
    for i, call_msg in enumerate(pool):
        index[mm3_hash(json.dumps(call_msg, sort_keys=True))] = i
    return index


def condense_model_event_inputs(
    events: Sequence[Event],
    message_pool: Sequence[ChatMessage],
    msg_index: Mapping[str, int],
) -> tuple[list[Event], list[ChatMessage]]:
    """Replace ModelEvent.input with message_pool references.

    Collects all messages from ModelEvent inputs into a message pool
    and replaces each ModelEvent's input with range-encoded input_refs.

    See module docstring for the hash-based dedup strategy.

    Returns:
        A tuple of (condensed events, message pool).
    """
    pool = list(message_pool)
    index = dict(msg_index)
    obj_id_cache: dict[int, str] = {}
    result: list[Event] = []
    for event in events:
        if isinstance(event, ModelEvent):
            if event.input_refs is not None and not event.input:
                # Already condensed — preserve existing refs
                result.append(event)
                continue
            if event.input:
                raw_indices: list[int] = []
                for msg in event.input:
                    obj_key = id(msg)
                    h = obj_id_cache.get(obj_key) or obj_id_cache.setdefault(
                        obj_key, _msg_hash(msg)
                    )
                    if h not in index:
                        index[h] = len(pool)
                        pool.append(msg)
                    raw_indices.append(index[h])
                event = event.model_copy(
                    update={"input": [], "input_refs": _compress_refs(raw_indices)}
                )
        result.append(event)
    return result, pool


# Known keys for messages array in provider wire formats
_CALL_MESSAGE_KEYS: Final = ("messages", "contents", "input", "inputs")


def _compress_refs(indices: list[int]) -> list[tuple[int, int]]:
    """Compress contiguous int indices into range-encoded refs.

    Every element is a ``(start, end_exclusive)`` range pair.

    Examples::

        [0,1,2,3]   -> [(0,4)]
        [0,3,4,5,9] -> [(0,1),(3,6),(9,10)]
        [2,5,8]     -> [(2,3),(5,6),(8,9)]
        [3,4]       -> [(3,5)]
    """
    if not indices:
        return []
    result: list[tuple[int, int]] = []
    start = indices[0]
    end_exclusive = start + 1
    for i in indices[1:]:
        if i == end_exclusive:
            end_exclusive += 1
        else:
            result.append((start, end_exclusive))
            start = i
            end_exclusive = i + 1
    result.append((start, end_exclusive))
    return result


_T = TypeVar("_T")


def _expand_refs(
    refs: list[tuple[int, int]],
    pool: list[_T],
) -> list[_T]:
    """Expand range-encoded refs against a pool.

    Each element is ``(start, end_exclusive)``: yields ``pool[start:end_exclusive]``.
    """
    result: list[_T] = []
    for start, end_exclusive in refs:
        result.extend(pool[start:end_exclusive])
    return result


def condense_model_event_calls(
    events: Sequence[Event],
    call_pool: Sequence[JsonValue],
    call_index: Mapping[str, int],
) -> tuple[list[Event], list[JsonValue]]:
    """Replace call.request messages with call_pool references.

    Returns:
        A tuple of (condensed events, call pool).
    """
    pool = list(call_pool)
    index = dict(call_index)
    result: list[Event] = []
    for event in events:
        if isinstance(event, ModelEvent) and event.call:
            if event.call.call_refs is not None:
                # Already condensed — preserve existing refs
                result.append(event)
                continue
            msg_key = next(
                (k for k in _CALL_MESSAGE_KEYS if k in event.call.request), None
            )
            msgs = event.call.request.get(msg_key) if msg_key else None
            if msgs and isinstance(msgs, list):
                raw_indices: list[int] = []
                for msg in msgs:
                    h = mm3_hash(json.dumps(msg, sort_keys=True))
                    if h not in index:
                        index[h] = len(pool)
                        pool.append(msg)
                    raw_indices.append(index[h])
                new_request = {
                    k: v for k, v in event.call.request.items() if k != msg_key
                }
                new_call = event.call.model_copy(
                    update={
                        "request": new_request,
                        "call_refs": _compress_refs(raw_indices),
                        "call_key": msg_key,
                    }
                )
                event = event.model_copy(update={"call": new_call})
        result.append(event)
    return result, pool


def resolve_model_event_calls(
    events: list[Event],
    call_pool: list[JsonValue],
) -> list[Event]:
    """Restore call.request messages from call_pool references."""
    if not call_pool:
        return events
    result: list[Event] = []
    for event in events:
        if isinstance(event, ModelEvent) and event.call and event.call.call_refs:
            msgs = _expand_refs(event.call.call_refs, call_pool)
            msg_key = event.call.call_key or "messages"
            new_request = dict(event.call.request)
            new_request[msg_key] = msgs
            new_call = event.call.model_copy(
                update={
                    "request": new_request,
                    "call_refs": None,
                    "call_key": None,
                }
            )
            event = event.model_copy(update={"call": new_call})
        result.append(event)
    return result


def resolve_model_event_inputs(
    events: list[Event],
    message_pool: list[ChatMessage],
) -> list[Event]:
    """Resolve ModelEvent input_refs back to full input lists."""
    if not message_pool:
        return events
    result: list[Event] = []
    for event in events:
        if isinstance(event, ModelEvent) and event.input_refs is not None:
            resolved_input = _expand_refs(event.input_refs, message_pool)
            event = event.model_copy(
                update={"input": resolved_input, "input_refs": None}
            )
        result.append(event)
    return result


def resolve_sample_events_data(sample: EvalSample) -> EvalSample:
    """Resolve events_data pool references in model events.

    Always called on read to ensure ModelEvent.input is populated,
    regardless of the resolve_attachments setting.
    """
    if sample.events_data is None:
        return sample
    msg_pool = sample.events_data["messages"]
    call_pool = sample.events_data["calls"]
    resolved_events = resolve_model_event_inputs(sample.events, msg_pool)
    resolved_events = resolve_model_event_calls(resolved_events, call_pool)
    return sample.model_copy(
        update={
            "events": resolved_events,
            "events_data": None,
        }
    )
```

## `log/_recorders/__init__.py`

```python
from .._log import EvalSampleSummary
from .create import (
    create_recorder_for_format,
    create_recorder_for_location,
    recorder_type_for_bytes,
    recorder_type_for_format,
    recorder_type_for_location,
)
from .recorder import Recorder

__all__ = [
    "EvalSampleSummary",
    "Recorder",
    "create_recorder_for_format",
    "create_recorder_for_location",
    "recorder_type_for_bytes",
    "recorder_type_for_format",
    "recorder_type_for_location",
]
```

## `log/_recorders/buffer/__init__.py`

```python
from .buffer import cleanup_sample_buffers, sample_buffer
from .database import SampleBufferDatabase
from .types import AttachmentData, EventData, SampleBuffer, SampleData, Samples

__all__ = [
    "AttachmentData",
    "EventData",
    "SampleData",
    "Samples",
    "SampleBuffer",
    "SampleBufferDatabase",
    "sample_buffer",
    "cleanup_sample_buffers",
]
```

## `log/_recorders/buffer/buffer.py`

```python
from logging import getLogger

from .database import SampleBufferDatabase, cleanup_sample_buffer_databases
from .filestore import SampleBufferFilestore, cleanup_sample_buffer_filestores
from .types import SampleBuffer

logger = getLogger(__name__)


def sample_buffer(location: str) -> SampleBuffer:
    try:
        return SampleBufferDatabase(location, create=False)
    except FileNotFoundError:
        return SampleBufferFilestore(location, create=False)


def running_tasks(log_dir: str) -> list[str]:
    tasks = SampleBufferDatabase.running_tasks(log_dir)
    if tasks is not None:
        return tasks
    else:
        return SampleBufferFilestore.running_tasks(log_dir) or []


def cleanup_sample_buffers(log_dir: str) -> None:
    try:
        cleanup_sample_buffer_databases()
        cleanup_sample_buffer_filestores(log_dir)
    except Exception as ex:
        logger.warning(f"Unexpected error cleaning up sample buffers: {ex}")
```

## `log/_recorders/buffer/database.py`

```python
import datetime
import hashlib
import json
import os
import sqlite3
import time
from contextlib import contextmanager
from logging import getLogger
from pathlib import Path
from sqlite3 import Connection, OperationalError
from typing import Callable, Iterator, Literal

import psutil
from pydantic import BaseModel
from shortuuid import uuid
from typing_extensions import override

from inspect_ai._display.core.display import TaskDisplayMetric
from inspect_ai._util.appdirs import inspect_data_dir
from inspect_ai._util.dateutil import is_file_older_than
from inspect_ai._util.file import basename, dirname, filesystem
from inspect_ai._util.json import to_json_str_safe
from inspect_ai._util.trace import trace_action
from inspect_ai.model import ChatMessage

from ..._condense import (
    ATTACHMENT_PROTOCOL,
    WalkContext,
    attachments_content_fn,
    walk_events,
    walk_input,
    walk_json_dict,
)
from ..._log import EvalSampleSummary
from ..types import SampleEvent
from .filestore import (
    Manifest,
    SampleBufferFilestore,
    SampleManifest,
    Segment,
    SegmentFile,
)
from .types import (
    AttachmentData,
    EventData,
    JsonData,
    SampleBuffer,
    SampleData,
    Samples,
)

logger = getLogger(__name__)


class TaskData(BaseModel):
    version: int
    metrics: list[TaskDisplayMetric]


class SampleBufferDatabase(SampleBuffer):
    SCHEMA = """

    CREATE TABLE IF NOT EXISTS task_database (
        version INTEGER PRIMARY KEY DEFAULT 1,
        metrics TEXT DEFAULT '[]',
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE samples (
        id TEXT,
        epoch INTEGER,
        data TEXT, -- JSON containing all other sample fields
        PRIMARY KEY (id, epoch)
    );

    CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT,
        sample_id TEXT,
        sample_epoch INTEGER,
        data TEXT -- JSON containing full event
    );

    CREATE TABLE attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_id TEXT,
        sample_epoch INTEGER,
        hash TEXT,
        content TEXT,
        UNIQUE(sample_id, sample_epoch, hash)
    );

    -- Indices for foreign keys and common queries
    CREATE INDEX IF NOT EXISTS idx_events_sample ON events(sample_id, sample_epoch);
    CREATE INDEX IF NOT EXISTS idx_attachments_hash ON attachments(hash);

    -- Note the version
    INSERT INTO task_database (version) VALUES (1);
    """

    def __init__(
        self,
        location: str,
        *,
        create: bool = True,
        log_images: bool = True,
        log_shared: int | None = None,
        update_interval: int = 2,
        db_dir: Path | None = None,
    ):
        self.location = filesystem(location).path_as_uri(location)
        self.log_images = log_images
        self.log_shared = log_shared
        self.update_interval = update_interval

        # location subdir and file
        dir, file = location_dir_and_file(self.location)

        # establish dirs
        db_dir = resolve_db_dir(db_dir)
        log_subdir = db_dir / dir

        # if we are creating then create dirs, use filename w/pid,
        # and create the database as required
        if create:
            log_subdir.mkdir(parents=True, exist_ok=True)
            self.db_path = log_subdir / f"{file}.{os.getpid()}.db"

            # initialize the database schema
            with self._get_connection() as conn:
                conn.executescript(self.SCHEMA)
                conn.commit()

        # if we are not creating then find a log in an existing directory
        # which matches the base filename (it will also have a pid)
        else:
            logs = list(log_subdir.glob(f"{file}.*.db"))
            if len(logs) > 0:
                self.db_path = logs[0]
            else:
                raise FileNotFoundError("Log database for '{location}' not found.")

        # create sync filestore if log_shared
        self._sync_filestore = (
            SampleBufferFilestore(location, update_interval=log_shared)
            if log_shared
            else None
        )
        self._sync_time = time.monotonic()

    def start_sample(self, sample: EvalSampleSummary) -> None:
        with self._get_connection(write=True) as conn:
            sample = self._condense_sample(conn, sample)
            conn.execute(
                """
                INSERT INTO samples (id, epoch, data)
                VALUES (?, ?, ?)
            """,
                (str(sample.id), sample.epoch, to_json_str_safe(sample)),
            )

    def log_events(self, events: list[SampleEvent]) -> None:
        with self._get_connection(write=True) as conn:
            # collect the values for all events
            values: list[str | int] = []
            for event in events:
                event = self._condense_event(conn, event)
                values.extend(
                    (
                        event.event.uuid or uuid(),
                        str(event.id),
                        event.epoch,
                        to_json_str_safe(event.event),
                    )
                )

            # dynamically create the SQL query
            placeholders = ", ".join(["(?, ?, ?, ?)"] * len(events))
            sql = f"""
            INSERT INTO events (event_id, sample_id, sample_epoch, data)
            VALUES {placeholders}
            """

            # Insert all rows
            conn.execute(sql, values)

    def complete_sample(self, summary: EvalSampleSummary) -> None:
        with self._get_connection(write=True) as conn:
            summary = self._condense_sample(conn, summary)
            conn.execute(
                """
                UPDATE samples SET data = ? WHERE id = ? and epoch = ?
            """,
                (to_json_str_safe(summary), str(summary.id), summary.epoch),
            )

    def update_metrics(self, metrics: list[TaskDisplayMetric]) -> None:
        with self._get_connection(write=True) as conn:
            conn.execute(
                """
                UPDATE task_database
                SET metrics = ?,
                    last_updated = CURRENT_TIMESTAMP;
                """,
                [to_json_str_safe(metrics)],
            )

    def remove_samples(self, samples: list[tuple[str | int, int]]) -> None:
        # short circuit no samples
        if len(samples) == 0:
            return

        with self._get_connection(write=True) as conn:
            cursor = conn.cursor()
            try:
                BATCH_SIZE = 100
                for i in range(0, len(samples), BATCH_SIZE):
                    # Slice out the batch
                    batch = samples[i : i + BATCH_SIZE]

                    # Build a query using individual column comparisons instead of row values
                    placeholders = " OR ".join(
                        ["(sample_id=? AND sample_epoch=?)" for _ in batch]
                    )

                    # Flatten parameters for binding
                    parameters = [item for tup in batch for item in tup]

                    # Delete associated events first
                    events_query = f"""
                        DELETE FROM events
                        WHERE {placeholders}
                    """
                    cursor.execute(events_query, parameters)

                    # Then delete the samples using the same approach
                    placeholders = " OR ".join(["(id=? AND epoch=?)" for _ in batch])

                    samples_query = f"""
                        DELETE FROM samples
                        WHERE {placeholders}
                    """
                    cursor.execute(samples_query, parameters)
            except OperationalError as ex:
                logger.warning(f"Unexpcted error cleaning up samples: {ex}")
            finally:
                cursor.close()

    def cleanup(self) -> None:
        cleanup_sample_buffer_db(self.db_path)
        if self._sync_filestore is not None:
            self._sync_filestore.cleanup()

    @classmethod
    @override
    def running_tasks(cls, log_dir: str) -> list[str] | None:
        log_subdir = log_dir_hash(log_dir)
        db_dir = resolve_db_dir() / log_subdir

        if db_dir.exists():
            logs = [log.name.rsplit(".", 2)[0] for log in db_dir.rglob("*.*.db")]
            return logs
        else:
            return None

    @override
    def get_samples(
        self, etag: str | None = None
    ) -> Samples | Literal["NotModified"] | None:
        if not self.db_path.exists():
            return None

        try:
            with self._get_connection() as conn:
                # note version
                task_data = self._get_task_data(conn)

                # apply etag if requested
                if etag == str(task_data.version):
                    return "NotModified"

                # fetch data
                return Samples(
                    samples=list(self._get_samples(conn, True)),
                    metrics=task_data.metrics,
                    refresh=self.update_interval,
                    etag=str(task_data.version),
                )
        except FileNotFoundError:
            return None

    @override
    def get_sample_data(
        self,
        id: str | int,
        epoch: int,
        after_event_id: int | None = None,
        after_attachment_id: int | None = None,
    ) -> SampleData | None:
        if not self.db_path.exists():
            return None

        try:
            with self._get_connection() as conn:
                return SampleData(
                    events=list(self._get_events(conn, id, epoch, after_event_id)),
                    attachments=list(
                        self._get_attachments(conn, id, epoch, after_attachment_id)
                    ),
                )
        except FileNotFoundError:
            return None

    @contextmanager
    def _get_connection(self, *, write: bool = False) -> Iterator[Connection]:
        """Get a database connection."""
        max_retries = 5
        retry_delay = 0.1

        conn: Connection | None = None
        last_error: Exception | None = None

        for attempt in range(max_retries):
            try:
                conn = sqlite3.connect(self.db_path, timeout=30)
                conn.row_factory = sqlite3.Row  # enable row factory for named columns

                # Enable foreign key constraints
                conn.execute("PRAGMA foreign_keys = ON")

                # concurrency setup
                conn.execute("PRAGMA busy_timeout=30000")
                conn.execute("PRAGMA synchronous=OFF")
                conn.execute("PRAGMA cache_size=-64000")
                conn.execute("PRAGMA temp_store=MEMORY")

                break

            except sqlite3.OperationalError as e:
                last_error = e
                if "locked" in str(e) and attempt < max_retries - 1:
                    if conn:
                        conn.close()
                    time.sleep(retry_delay * (2**attempt))
                    continue
                raise

        # ensure we have a connection
        if conn is None:
            raise sqlite3.OperationalError(
                f"Failed to establish connection after {max_retries} attempts"
            ) from last_error

        try:
            # do work
            yield conn

            # if this was for a write then bump the version
            if write:
                conn.execute("""
                UPDATE task_database
                SET version = version + 1,
                    last_updated = CURRENT_TIMESTAMP;
                """)

            # commit
            conn.commit()

        except Exception:
            # rollback on any error
            conn.rollback()
            raise
        finally:
            # close the connection
            conn.close()

            # if this was for write then sync (throttled)
            if write:
                self._sync()

    def _sync(self) -> None:
        if self.log_shared is not None and self._sync_filestore is not None:
            if (time.monotonic() - self._sync_time) > self.log_shared:
                with trace_action(logger, "Log Sync", self.location):
                    sync_to_filestore(self, self._sync_filestore)

                self._sync_time = time.monotonic()

    def _increment_version(self, conn: Connection) -> None:
        conn.execute("""
        UPDATE task_database
        SET version = version + 1,
            last_updated = CURRENT_TIMESTAMP;
        """)

    def _get_task_data(self, conn: Connection) -> TaskData:
        row = conn.execute("SELECT version, metrics FROM task_database").fetchone()
        task_data = dict(version=row["version"], metrics=json.loads(row["metrics"]))
        return TaskData(**task_data)

    def _get_samples(
        self,
        conn: Connection,
        resolve_attachments: bool | Literal["full", "core"] = False,
    ) -> Iterator[EvalSampleSummary]:
        cursor = conn.execute(
            """
            SELECT s.data as sample_data
            FROM samples s
            ORDER BY s.id
        """
        )

        for row in cursor:
            summary = EvalSampleSummary.model_validate_json(row["sample_data"])
            if resolve_attachments:
                summary = self._resolve_sample_attachments(conn, summary)
            yield summary

    def _get_events(
        self,
        conn: Connection,
        id: str | int,
        epoch: int,
        after_event_id: int | None = None,
        resolve_attachments: bool | Literal["full", "core"] = False,
    ) -> Iterator[EventData]:
        query = """
            SELECT id, event_id, data
            FROM events e WHERE sample_id = ? AND sample_epoch = ?
        """
        params: list[str | int] = [str(id), epoch]

        if after_event_id is not None:
            query += " AND e.id > ?"
            params.append(after_event_id)

        query += " ORDER BY e.id"

        cursor = conn.execute(query, params)

        message_cache: dict[str, ChatMessage] = {}

        for row in cursor:
            event = json.loads(row["data"])
            if resolve_attachments is True or resolve_attachments == "full":
                event = self._resolve_event_attachments(conn, event, message_cache)
            yield EventData(
                id=row["id"],
                event_id=row["event_id"],
                sample_id=str(id),
                epoch=epoch,
                event=event,
            )

    def _get_attachments(
        self,
        conn: Connection,
        id: str | int,
        epoch: int,
        after_attachment_id: int | None = None,
    ) -> Iterator[AttachmentData]:
        query = """
            SELECT id, hash, content FROM attachments
            WHERE sample_id = ? AND sample_epoch = ?
        """
        params: list[str | int] = [id, epoch]

        if after_attachment_id is not None:
            query += " AND id > ?"
            params.append(after_attachment_id)

        cursor = conn.execute(query, params)

        for row in cursor:
            yield AttachmentData(
                id=row["id"],
                sample_id=str(id),
                epoch=epoch,
                hash=row["hash"],
                content=row["content"],
            )

    def _condense_sample(
        self, conn: Connection, sample: EvalSampleSummary
    ) -> EvalSampleSummary:
        # alias attachments
        attachments: dict[str, str] = {}
        sample = sample.model_copy(
            update={
                "input": walk_input(
                    sample.input,
                    self._create_attachments_content_fn(attachments),
                    WalkContext(message_cache={}, only_core=False),
                )
            }
        )

        # insert attachments
        self._insert_attachments(conn, sample.id, sample.epoch, attachments)

        # return sample with aliases
        return sample

    def _resolve_sample_attachments(
        self, conn: Connection, sample: EvalSampleSummary
    ) -> EvalSampleSummary:
        return sample.model_copy(
            update={
                "input": walk_input(
                    sample.input,
                    self._resolve_attachments_content_fn(conn),
                    WalkContext(message_cache={}, only_core=False),
                )
            }
        )

    def _condense_event(self, conn: Connection, event: SampleEvent) -> SampleEvent:
        # alias attachments
        attachments: dict[str, str] = {}
        event.event = walk_events(
            [event.event],
            self._create_attachments_content_fn(attachments),
            WalkContext(message_cache={}, only_core=False),
        )[0]

        # insert attachments
        self._insert_attachments(conn, event.id, event.epoch, attachments)

        # return events with aliases
        return event

    def _resolve_event_attachments(
        self, conn: Connection, event: JsonData, message_cache: dict[str, ChatMessage]
    ) -> JsonData:
        return walk_json_dict(
            event,
            self._resolve_attachments_content_fn(conn),
            WalkContext(message_cache=message_cache, only_core=False),
        )

    def _create_attachments_content_fn(
        self, attachments: dict[str, str]
    ) -> Callable[[str], str]:
        return attachments_content_fn(self.log_images, 100, attachments)

    def _resolve_attachments_content_fn(self, conn: Connection) -> Callable[[str], str]:
        def content_fn(text: str) -> str:
            if text.startswith(ATTACHMENT_PROTOCOL):
                hash = text.replace(ATTACHMENT_PROTOCOL, "", 1)
                attachments = self._get_attachments_content(conn, [hash])
                content = attachments.get(hash, None)
                if content is not None:
                    return content
                else:
                    return text
            else:
                return text

        return content_fn

    def _insert_attachments(
        self, conn: Connection, id: int | str, epoch: int, attachments: dict[str, str]
    ) -> None:
        parameters: list[list[int | str]] = []
        for k, v in attachments.items():
            parameters.append([id, epoch, k, v])

        conn.executemany(
            """
            INSERT OR IGNORE INTO attachments (sample_id, sample_epoch, hash, content)
            VALUES (?, ?, ?, ?)
            """,
            parameters,
        )

    def _get_attachments_content(
        self, conn: Connection, hashes: list[str]
    ) -> dict[str, str | None]:
        # Create placeholders for the IN clause
        placeholders = ",".join("?" * len(hashes))

        cursor = conn.execute(
            f"""
            SELECT hash, content
            FROM attachments
            WHERE hash IN ({placeholders})
            """,
            hashes,
        )

        # Create result dictionary with all requested hashes initialized to None
        results: dict[str, str | None] = {hash_: None for hash_ in hashes}

        # Update with found values
        for row in cursor:
            results[row["hash"]] = row["content"]

        return results


def sync_to_filestore(
    db: SampleBufferDatabase, filestore: SampleBufferFilestore
) -> None:
    # read existing manifest (create an empty one if there is none)
    manifest = filestore.read_manifest() or Manifest()

    # prepare a list of buffered samples from the db
    samples = db.get_samples()
    if samples is None:
        return
    assert isinstance(samples, Samples)

    # at the end of the sync, the manifest should contain only the samples
    # in the db -- create a new list of sample manifests propagating the
    # segment lists from the existing sample manifests
    sample_manifests: list[SampleManifest] = []
    for sample in samples.samples:
        # lookup sample segments in the existing manifest
        segments: list[int] = next(
            (
                s.segments
                for s in manifest.samples
                if s.summary.id == sample.id and s.summary.epoch == sample.epoch
            ),
            [],
        )
        # add to manifests
        sample_manifests.append(SampleManifest(summary=sample, segments=segments))

    # draft of new manifest has the new sample list and the existing segments
    manifest.metrics = samples.metrics
    manifest.samples = sample_manifests

    # determine what segment data we already have so we can limit
    # sample queries accordingly
    if len(manifest.segments) > 0:
        last_segment = manifest.segments[-1]
        last_segment_id = last_segment.id
    else:
        last_segment_id = 0

    # work through samples and create segment files for those that need it
    # (update the manifest with the segment id). track the largest event
    # and attachment ids we've seen
    segment_id = last_segment_id + 1
    last_event_id = 0
    last_attachment_id = 0
    segment_files: list[SegmentFile] = []
    for manifest_sample in manifest.samples:
        # get last ids we've seen for this sample
        sample_last_segment_id = (
            manifest_sample.segments[-1] if manifest_sample.segments else None
        )
        sample_last_segment = next(
            (
                segment
                for segment in manifest.segments
                if segment.id == sample_last_segment_id
            ),
            None,
        )
        if sample_last_segment is not None:
            after_event_id = sample_last_segment.last_event_id
            after_attachment_id = sample_last_segment.last_attachment_id
        else:
            after_event_id, after_attachment_id = (0, 0)

        # get sample data
        sample_data = db.get_sample_data(
            id=manifest_sample.summary.id,
            epoch=manifest_sample.summary.epoch,
            after_event_id=after_event_id,
            after_attachment_id=after_attachment_id,
        )
        # if we got sample data....
        if sample_data is not None and (
            len(sample_data.events) > 0 or len(sample_data.attachments) > 0
        ):
            # add to segment file
            segment_files.append(
                SegmentFile(
                    id=manifest_sample.summary.id,
                    epoch=manifest_sample.summary.epoch,
                    data=sample_data,
                )
            )
            # update manifest
            manifest_sample.segments.append(segment_id)

            # update maximums
            last_event_id, last_attachment_id = maximum_ids(
                last_event_id, last_attachment_id, sample_data
            )

    # write the segment file and update the manifest
    if len(segment_files) > 0:
        filestore.write_segment(segment_id, segment_files)
        manifest.segments.append(
            Segment(
                id=segment_id,
                last_event_id=last_event_id,
                last_attachment_id=last_attachment_id,
            )
        )

    # write the manifest (do this even if we had no segments to pickup adds/deletes)
    filestore.write_manifest(manifest)


def maximum_ids(
    event_id: int, attachment_id: int, sample_data: SampleData
) -> tuple[int, int]:
    if sample_data.events:
        event_id = max(event_id, sample_data.events[-1].id)
    if sample_data.attachments:
        attachment_id = max(attachment_id, sample_data.attachments[-1].id)
    return event_id, attachment_id


def cleanup_sample_buffer_databases(db_dir: Path | None = None) -> None:
    try:
        db_dir = resolve_db_dir(db_dir)
        for db in db_dir.rglob("*.*.db"):
            # this is a failsafe cleanup method for buffer db's leaked during
            # abnormal terminations. therefore, it's not critical that we clean
            # it up immediately. it's also possible that users are _sharing_
            # their inspect_data_dir across multiple pid namespaces (e.g. in an
            # effort to share their cache) one eval could remove the db of
            # another running eval if we don't put in a delay.
            if is_file_older_than(db, datetime.timedelta(days=3), default=False):
                _, pid_str, _ = db.name.rsplit(".", 2)
                if pid_str.isdigit():
                    pid = int(pid_str)
                    if not psutil.pid_exists(pid):
                        cleanup_sample_buffer_db(db)
    except Exception as ex:
        logger.warning(f"Error cleaning up sample buffer databases at {db_dir}: {ex}")


def cleanup_sample_buffer_db(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
        try:
            # Remove the directory if it's empty
            path.parent.rmdir()
        except OSError:
            # Not empty or other error, which is fine
            pass
    except Exception as ex:
        logger.warning(f"Error cleaning up sample buffer database at {path}: {ex}")


def resolve_db_dir(db_dir: Path | None = None) -> Path:
    return db_dir or inspect_data_dir("samplebuffer")


def location_dir_and_file(location: str) -> tuple[str, str]:
    dir = log_dir_hash(dirname(location))
    file = basename(location)
    return dir, file


def log_dir_hash(log_dir: str) -> str:
    log_dir = log_dir.rstrip("/\\")
    return hashlib.sha256(log_dir.encode()).hexdigest()
```

## `log/_recorders/buffer/filestore.py`

```python
import os
import tempfile
from logging import getLogger
from pathlib import Path
from typing import Literal
from zipfile import ZipFile

from pydantic import BaseModel, Field
from typing_extensions import override

from inspect_ai._display.core.display import TaskDisplayMetric
from inspect_ai._util.constants import DEFAULT_LOG_SHARED, EVAL_LOG_FORMAT
from inspect_ai._util.file import FileSystem, basename, dirname, file, filesystem
from inspect_ai._util.json import to_json_safe, to_json_str_safe
from inspect_ai._util.zipfile import zipfile_compress_kwargs
from inspect_ai.log._file import read_eval_log

from ..._log import EvalSampleSummary
from .types import SampleBuffer, SampleData, Samples

logger = getLogger(__name__)


class Segment(BaseModel):
    id: int
    last_event_id: int
    last_attachment_id: int


class SegmentFile(BaseModel):
    id: str | int
    epoch: int
    data: SampleData


class SampleManifest(BaseModel):
    summary: EvalSampleSummary
    segments: list[int] = Field(default_factory=list)


class Manifest(BaseModel):
    metrics: list[TaskDisplayMetric] = Field(default_factory=list)
    samples: list[SampleManifest] = Field(default_factory=list)
    segments: list[Segment] = Field(default_factory=list)


MANIFEST = "manifest.json"


class SampleBufferFilestore(SampleBuffer):
    def __init__(
        self,
        location: str,
        *,
        create: bool = True,
        update_interval: int = DEFAULT_LOG_SHARED,
    ) -> None:
        self._fs = filesystem(location)
        self._dir = f"{sample_buffer_dir(dirname(location), self._fs)}{self._fs.sep}{os.path.splitext(basename(location))[0]}{self._fs.sep}"
        self.update_interval = update_interval

        if create:
            self._fs.mkdir(self._dir, exist_ok=True)

            # place a file in the dir to force it to be created
            self._fs.touch(f"{self._dir}.keep")

    def write_manifest(self, manifest: Manifest) -> None:
        with file(self._manifest_file(), "wb") as f:
            f.write(to_json_safe(manifest))

    def write_segment(self, id: int, files: list[SegmentFile]) -> None:
        # write the file locally
        with tempfile.NamedTemporaryFile(mode="wb", delete=False) as segment_file:
            name = segment_file.name
            with ZipFile(segment_file, mode="w", **zipfile_compress_kwargs) as zip:
                for sf in files:
                    zip.writestr(
                        segment_file_name(sf.id, sf.epoch),
                        to_json_str_safe(sf.data),
                    )
            segment_file.flush()
            os.fsync(segment_file.fileno())

        # write then move for atomicity
        try:
            with open(name, "rb") as zf:
                with file(f"{self._dir}{segment_name(id)}", "wb") as f:
                    f.write(zf.read())
                    f.flush()
        finally:
            os.unlink(name)

    def read_manifest(self) -> Manifest | None:
        try:
            with file(self._manifest_file(), "r") as f:
                contents = f.read()
                return Manifest.model_validate_json(contents)
        except FileNotFoundError:
            return None

    def read_segment_data(
        self, id: int, sample_id: str | int, epoch_id: int
    ) -> SampleData:
        segment_file = f"{self._dir}{segment_name(id)}"
        with file(segment_file, "rb") as f:
            with ZipFile(f, mode="r") as zip:
                with zip.open(segment_file_name(sample_id, epoch_id), "r") as sf:
                    return SampleData.model_validate_json(sf.read())

    def cleanup(self) -> None:
        cleanup_sample_buffer_filestore(self._dir, self._fs)

    @classmethod
    @override
    def running_tasks(cls, log_dir: str) -> list[str] | None:
        buffer_dir = Path(sample_buffer_dir(log_dir))
        if buffer_dir.exists():
            return [
                f"{basename(path.name)}.{EVAL_LOG_FORMAT}"
                for path in buffer_dir.iterdir()
                if path.is_dir()
            ]
        else:
            return None

    @override
    def get_samples(
        self, etag: str | None = None
    ) -> Samples | Literal["NotModified"] | None:
        # get the etag on the filestore
        try:
            info = self._fs.info(self._manifest_file())
            fs_etag = info.etag or f"{info.mtime}{info.size}"
        except FileNotFoundError:
            return None

        # if the etag matches then return not modified
        if etag == fs_etag:
            return "NotModified"

        # read the manifest
        manifest = self.read_manifest()
        if manifest is None:
            return None

        # provide samples + etag from the manifest
        return Samples(
            samples=[sm.summary for sm in manifest.samples],
            metrics=manifest.metrics,
            refresh=self.update_interval,
            etag=fs_etag,
        )

    @override
    def get_sample_data(
        self,
        id: str | int,
        epoch: int,
        after_event_id: int | None = None,
        after_attachment_id: int | None = None,
    ) -> SampleData | None:
        # read the manifest
        manifest = self.read_manifest()
        if manifest is None:
            return None

        # find this sample in the manifest
        sample = next(
            (
                sample
                for sample in manifest.samples
                if sample.summary.id == id and sample.summary.epoch == epoch
            ),
            None,
        )
        if sample is None:
            return None

        # determine which segments we need to return in order to
        # satisfy the after_event_id and after_attachment_id
        after_event_id = after_event_id or -1
        after_attachment_id = after_attachment_id or -1
        segments = [
            segment for segment in manifest.segments if segment.id in sample.segments
        ]
        segments = [
            segment
            for segment in segments
            if segment.last_event_id > after_event_id
            or segment.last_attachment_id > after_attachment_id
        ]

        # collect data from the segments
        try:
            sample_data = SampleData(events=[], attachments=[])
            for segment in segments:
                data = self.read_segment_data(segment.id, id, epoch)
                sample_data.events.extend(data.events)
                sample_data.attachments.extend(data.attachments)
        except FileNotFoundError:
            # the sample might complete while this is running, in which case
            # we'll just return None
            return None

        return sample_data

    def _manifest_file(self) -> str:
        return f"{self._dir}{MANIFEST}"


def cleanup_sample_buffer_filestores(log_dir: str) -> None:
    # read log buffer dirs (bail if there is no buffer_dir)
    fs = filesystem(log_dir)
    buffer_dir = sample_buffer_dir(log_dir, fs)
    try:
        log_buffers = [
            buffer for buffer in fs.ls(buffer_dir) if buffer.type == "directory"
        ]
    except FileNotFoundError:
        return

    # for each buffer dir, confirm there is a running .eval file
    # (remove the buffer dir if there is no .eval or the eval is finished)
    for log_buffer in log_buffers:
        try:
            log_file = f"{log_dir}{fs.sep}{basename(log_buffer.name)}.{EVAL_LOG_FORMAT}"
            log_header = read_eval_log(log_file, header_only=True)
            if log_header.status != "started":
                cleanup_sample_buffer_filestore(log_buffer.name, fs)

        except FileNotFoundError:
            cleanup_sample_buffer_filestore(log_buffer.name, fs)

    # remove the .buffer dir if it's empty
    try:
        if len(fs.ls(buffer_dir)) == 0:
            fs.rm(buffer_dir, recursive=True)
    except FileNotFoundError:
        pass


def cleanup_sample_buffer_filestore(buffer_dir: str, fs: FileSystem) -> None:
    try:
        fs.rm(buffer_dir, recursive=True)
    except Exception as ex:
        logger.warning(
            f"Error cleaning up sample buffer database at {buffer_dir}: {ex}"
        )


def segment_name(id: int) -> str:
    return f"segment.{id}.zip"


def segment_file_name(id: str | int, epoch: int) -> str:
    return f"{id}_{epoch}.json"


def sample_buffer_dir(log_dir: str, fs: FileSystem | None = None) -> str:
    log_dir = log_dir.rstrip("/\\")
    fs = fs or filesystem(log_dir)
    return f"{log_dir}{fs.sep}.buffer"
```

## `log/_recorders/buffer/types.py`

```python
import abc
from typing import Literal, TypeAlias

from pydantic import BaseModel, JsonValue

from inspect_ai._display.core.display import TaskDisplayMetric

from ..._log import EvalSampleSummary

JsonData: TypeAlias = dict[str, JsonValue]


class Samples(BaseModel):
    samples: list[EvalSampleSummary]
    metrics: list[TaskDisplayMetric]
    refresh: int
    etag: str


class EventData(BaseModel):
    id: int
    event_id: str
    sample_id: str
    epoch: int
    event: JsonData


class AttachmentData(BaseModel):
    id: int
    sample_id: str
    epoch: int
    hash: str
    content: str


class SampleData(BaseModel):
    events: list[EventData]
    attachments: list[AttachmentData]


class SampleBuffer(abc.ABC):
    @classmethod
    @abc.abstractmethod
    def running_tasks(cls, log_dir: str) -> list[str] | None: ...

    @abc.abstractmethod
    def get_samples(
        self, etag: str | None = None
    ) -> Samples | Literal["NotModified"] | None:
        """Get the manifest of all running samples.

        Args:
          etag: Optional etag (returned in `Samples`) for checking
            whether there are any changes in the datatabase.

        Returns:
          - `Samples` if the database exists and has updates
          - "NotModifed" if the database exists and has no updates.
          - None if the database no longer exists

        """
        ...

    @abc.abstractmethod
    def get_sample_data(
        self,
        id: str | int,
        epoch: int,
        after_event_id: int | None = None,
        after_attachment_id: int | None = None,
    ) -> SampleData | None:
        """Get event and attachment data for a sample.

        Args:
          id: Sample id
          epoch: Sample epoch
          after_event_id: Optional. Fetch only event data greater than this id.
          after_attachment_id: Optioinal. Fetch only attachment data greater than this id.

        Returns:
          - `SampleData` with event and attachment data.
          - None if the database no longer exists
        """
        ...
```

## `log/_recorders/create.py`

```python
from typing import IO, Any, Callable, Literal, cast

from .eval import EvalRecorder
from .json import JSONRecorder
from .recorder import Recorder

_recorders: dict[str, type[Recorder]] = {"eval": EvalRecorder, "json": JSONRecorder}


def create_recorder_for_format(
    format: Literal["eval", "json"], *args: Any, **kwargs: Any
) -> Recorder:
    recorder = recorder_type_for_format(format)
    return recorder(*args, **kwargs)


def recorder_type_for_format(format: Literal["eval", "json"]) -> type[Recorder]:
    recorder = _recorders.get(format, None)
    if recorder:
        return recorder
    else:
        raise ValueError(f"No recorder for format: {format}")


def create_recorder_for_location(location: str, log_dir: str) -> Recorder:
    recorder = recorder_type_for_location(location)
    return cast(Callable[[str], Recorder], recorder)(log_dir)


def recorder_type_for_location(location: str) -> type[Recorder]:
    for recorder in _recorders.values():
        if recorder.handles_location(location):
            return recorder

    raise ValueError(f"No recorder for location: {location}")


def recorder_type_for_bytes(log_bytes: IO[bytes]) -> type[Recorder]:
    first_bytes = log_bytes.read(4)
    log_bytes.seek(0)

    for recorder in _recorders.values():
        if recorder.handles_bytes(first_bytes):
            return recorder

    raise ValueError(f"No recorder for bytes: {first_bytes!r}")
```

## `log/_recorders/eval.py`

```python
import copy
import json
import logging
import math
import os
import tempfile
from logging import getLogger
from typing import (
    IO,
    Any,
    BinaryIO,
    Generic,
    Iterator,
    SupportsIndex,
    TypeVar,
    cast,
    overload,
)
from zipfile import ZipFile

import anyio
from pydantic import BaseModel, Field
from typing_extensions import override

from inspect_ai._util.async_bytes_reader import adapt_to_reader
from inspect_ai._util.async_zip import AsyncZipReader
from inspect_ai._util.asyncfiles import AsyncFilesystem
from inspect_ai._util.constants import (
    LOG_SCHEMA_VERSION,
    get_deserializing_context,
)
from inspect_ai._util.error import EvalError, WriteConflictError
from inspect_ai._util.file import FileSystem, dirname, filesystem
from inspect_ai._util.json import is_ijson_nan_inf_error, to_json_safe
from inspect_ai._util.trace import trace_action
from inspect_ai._util.zip_common import ZipEntry
from inspect_ai._util.zipfile import zipfile_compress_kwargs

from .._edit import LogUpdate
from .._log import (
    EvalLog,
    EvalPlan,
    EvalResults,
    EvalSample,
    EvalSampleReductions,
    EvalSampleSummary,
    EvalSpec,
    EvalStats,
    EvalStatus,
    sort_samples,
)
from .._pool import resolve_sample_events_data
from .file import FileRecorder

logger = getLogger(__name__)


class LogStart(BaseModel):
    version: int
    eval: EvalSpec
    plan: EvalPlan


class LogResults(BaseModel):
    status: EvalStatus
    stats: EvalStats
    results: EvalResults | None = Field(default=None)
    error: EvalError | None = Field(default=None)


JOURNAL_DIR = "_journal"
SUMMARY_DIR = "summaries"
SAMPLES_DIR = "samples"

START_JSON = "start.json"
RESULTS_JSON = "results.json"
REDUCTIONS_JSON = "reductions.json"
SUMMARIES_JSON = "summaries.json"
HEADER_JSON = "header.json"


class EvalRecorder(FileRecorder):
    @override
    @classmethod
    def handles_location(cls, location: str) -> bool:
        return location.endswith(".eval")

    @override
    @classmethod
    def handles_bytes(cls, first_bytes: bytes) -> bool:
        return first_bytes == b"PK\x03\x04"  # ZIP local file header

    @override
    def default_log_buffer(self, sample_count: int, high_throughput: bool) -> int:
        if high_throughput:
            # High-throughput: flush ~10 times over the run
            return max(10, sample_count // 10)
        else:
            # .eval files are 5-8x smaller than .json files so we
            # are much less worried about flushing frequently
            # scale flushes in alignment with sample_count so small runs
            # flush more often (sample by sample) and large runs less often
            return max(1, min(math.floor(sample_count / 3), 10))

    def __init__(self, log_dir: str, fs_options: dict[str, Any] | None = None):
        super().__init__(log_dir, ".eval", fs_options)

        # each eval has a unique key (created from run_id and task name/version)
        # which we use to track the output path, accumulated data, and event counter
        self.data: dict[str, ZipLogFile] = {}

    @override
    async def log_init(
        self, eval: EvalSpec, location: str | None = None, *, clean: bool = False
    ) -> str:
        # if the file exists then read summaries
        if not clean and location is not None and self.fs.exists(location):
            async with AsyncFilesystem() as fs:
                reader = AsyncZipReader(fs, location)
                log_start = await _read_start_async(reader)
                summaries, summary_counter = await _read_all_summaries_async(reader)
        else:
            log_start = None
            summary_counter = 0
            summaries = []

        # create zip wrapper
        zip_file = location or self._log_file_path(eval)
        zip_log_file = ZipLogFile(file=zip_file)
        await zip_log_file.init(log_start, summary_counter, summaries)

        # track zip
        self.data[self._log_file_key(eval)] = zip_log_file

        # return file path
        return zip_file

    @override
    async def log_start(self, eval: EvalSpec, plan: EvalPlan) -> None:
        log = self.data[self._log_file_key(eval)]
        start = LogStart(version=LOG_SCHEMA_VERSION, eval=eval, plan=plan)
        await log.start(start)

    @override
    async def log_sample(self, eval: EvalSpec, sample: EvalSample) -> None:
        log = self.data[self._log_file_key(eval)]
        await log.buffer_sample(sample)

    @override
    async def flush(self, eval: EvalSpec) -> None:
        # get the zip log
        log = self.data[self._log_file_key(eval)]

        # write the buffered samples
        await log.write_buffered_samples()

        # flush to underlying stream
        await log.flush()

    @override
    async def log_finish(
        self,
        eval: EvalSpec,
        status: EvalStatus,
        stats: EvalStats,
        results: EvalResults | None,
        reductions: list[EvalSampleReductions] | None,
        error: EvalError | None = None,
        header_only: bool = False,
        invalidated: bool = False,
        log_updates: list[LogUpdate] | None = None,
    ) -> EvalLog:
        # get the key and log
        key = self._log_file_key(eval)
        log = self.data[key]

        # write the buffered samples
        await log.write_buffered_samples()

        # write consolidated summaries
        await log.write(SUMMARIES_JSON, log._summaries)

        # write reductions
        if reductions is not None:
            await log.write(REDUCTIONS_JSON, reductions)

        # Get the results
        log_results = LogResults(
            status=status, stats=stats, results=results, error=error
        )

        # add the results to the original eval log from start.json
        log_start = log.log_start
        if log_start is None:
            raise RuntimeError("Log not properly initialised")

        eval_header = EvalLog(
            version=log_start.version,
            invalidated=invalidated,
            log_updates=log_updates,
            eval=log_start.eval,
            plan=log_start.plan,
            results=log_results.results,
            stats=log_results.stats,
            status=log_results.status,
            error=log_results.error,
        )
        await log.write(HEADER_JSON, eval_header)

        # flush and write the results
        await log.flush()
        result = await log.close(header_only)

        # stop tracking this eval
        del self.data[key]

        return result

    @classmethod
    @override
    async def read_log(
        cls,
        location: str,
        header_only: bool = False,
    ) -> EvalLog:
        async with AsyncFilesystem() as async_fs:
            # if the log is not stored in the local filesystem then download it
            # first, and then read it from a temp file (eliminates the possiblity
            # of hundreds of small fetches from the zip file streams)
            temp_log: str | None = None
            etag: str | None = None
            fs = filesystem(location)

            if not fs.is_local() and header_only is False:
                with tempfile.NamedTemporaryFile(delete=False) as temp:
                    temp_log = temp.name
                    if fs.is_s3():
                        # download file and get ETag so it matches the content
                        etag = await _s3_download_with_etag(
                            location, temp_log, async_fs
                        )
                    else:
                        fs.get_file(location, temp_log)

            # read log (use temp_log if we have it)
            try:
                read_location = temp_log or location
                reader = AsyncZipReader(async_fs, read_location)
                cd = await reader.entries()
                log = await _read_log(reader, cd.entries, location, header_only)

                if etag is not None:
                    log.etag = etag
                elif fs.is_s3() and header_only:
                    # ETag is captured from the S3 response used to read the
                    # central directory, so no extra request is needed.
                    log.etag = reader.etag

                return log
            finally:
                if temp_log:
                    os.unlink(temp_log)

    @override
    @classmethod
    async def read_log_bytes(
        cls, log_bytes: IO[bytes], header_only: bool = False
    ) -> EvalLog:
        return _read_log_from_bytes(log_bytes, location="", header_only=header_only)

    @override
    @classmethod
    async def read_log_sample(
        cls,
        location: str,
        id: str | int | None = None,
        epoch: int = 1,
        uuid: str | None = None,
        exclude_fields: set[str] | None = None,
        reader: AsyncZipReader | None = None,
    ) -> EvalSample:
        if not reader:
            async with AsyncFilesystem() as fs:
                reader = AsyncZipReader(fs, location)
                return await cls._read_log_sample_impl(
                    reader, location, id, epoch, uuid, exclude_fields
                )
        return await cls._read_log_sample_impl(
            reader, location, id, epoch, uuid, exclude_fields
        )

    @classmethod
    async def _read_log_sample_impl(
        cls,
        reader: AsyncZipReader,
        location: str,
        id: str | int | None = None,
        epoch: int = 1,
        uuid: str | None = None,
        exclude_fields: set[str] | None = None,
    ) -> EvalSample:
        try:
            # if a uuid was specified then read the summaries and find the matching sample
            if id is None:
                if uuid is None:
                    raise ValueError("You must specify an 'id' or 'uuid' to read")
                summaries, _ = await _read_all_summaries_async(reader)
                sample = next(
                    (summary for summary in summaries if summary.uuid == uuid),
                    None,
                )
                if sample is None:
                    raise ValueError(f"Sample with uuid '{uuid}' not found in log.")
                id = sample.id
                epoch = sample.epoch

            if exclude_fields:
                # Use streaming JSON parser to skip large fields
                # This significantly reduces memory usage for large samples
                import ijson  # type: ignore
                from ijson import IncompleteJSONError
                from ijson.backends.python import (  # type: ignore[import-untyped]
                    UnexpectedSymbol,
                )

                try:
                    data: dict[str, Any] = {}
                    async with await reader.open_member(
                        _sample_filename(id, epoch)
                    ) as f:
                        async for key, value in ijson.kvitems_async(
                            adapt_to_reader(f), "", use_float=True
                        ):
                            if key not in exclude_fields:
                                data[key] = value
                except (
                    ValueError,
                    IncompleteJSONError,
                    UnexpectedSymbol,
                ) as ex:
                    # ijson doesn't support NaN/Inf which are valid in
                    # Python's JSON. Fall back to standard json.load
                    # and manually remove excluded fields.
                    if is_ijson_nan_inf_error(ex):
                        data = json.loads(
                            await reader.read_member_fully(_sample_filename(id, epoch))
                        )
                        for field in exclude_fields:
                            data.pop(field, None)
                    else:
                        raise
            else:
                data = json.loads(
                    await reader.read_member_fully(_sample_filename(id, epoch))
                )
            return EvalSample.model_validate(data, context=get_deserializing_context())
        except KeyError:
            raise IndexError(
                f"Sample id {id} for epoch {epoch} not found in log {location}"
            )

    @classmethod
    @override
    async def read_log_sample_summaries(cls, location: str) -> list[EvalSampleSummary]:
        async with AsyncFilesystem() as fs:
            reader = AsyncZipReader(fs, location)
            summaries, _ = await _read_all_summaries_async(reader)
            return summaries

    @classmethod
    @override
    async def write_log(
        cls, location: str, log: EvalLog, if_match_etag: str | None = None
    ) -> None:
        if filesystem(location).is_s3() and if_match_etag:
            # Use S3 conditional write
            await cls._write_log_s3_conditional(location, log, if_match_etag)
        else:
            # Standard write using the recorder (so we get all of the extra streams)
            await _write_eval_log_with_recorder(log, dirname(location), location)

    @classmethod
    async def _write_log_s3_conditional(
        cls, location: str, log: EvalLog, etag: str
    ) -> None:
        """Perform S3 conditional write for .eval format using boto3."""
        import tempfile

        bucket, key = _s3_bucket_and_key(location)

        # create the eval log in a temporary directory first
        import os

        with tempfile.TemporaryDirectory() as tmpdir:
            # create a temporary eval file name
            temp_eval_file = os.path.join(tmpdir, "temp_log.eval")

            # write using the normal recorder to get proper .eval format
            await _write_eval_log_with_recorder(log, tmpdir, temp_eval_file)

            # read the created file in bytes
            with open(temp_eval_file, "rb") as f:
                log_bytes = f.read()

        async with AsyncFilesystem() as async_fs:
            await _write_s3_conditional(
                async_fs,
                bucket,
                key,
                log_bytes,
                etag,
                location,
                logger,
            )


async def _write_eval_log_with_recorder(
    log: EvalLog, recorder_dir: str, output_file: str
) -> None:
    """Helper function to write EvalLog using EvalRecorder pattern."""
    recorder = EvalRecorder(recorder_dir)
    await recorder.log_init(log.eval, output_file, clean=True)
    await recorder.log_start(log.eval, log.plan)
    for sample in log.samples or []:
        await recorder.log_sample(log.eval, sample)
    await recorder.log_finish(
        log.eval,
        log.status,
        log.stats,
        log.results,
        log.reductions,
        log.error,
        invalidated=log.invalidated,
        log_updates=log.log_updates,
    )


def _s3_bucket_and_key(location: str) -> tuple[str, str]:
    """Extract S3 bucket and key from an S3 URL."""
    from urllib.parse import urlparse

    parsed = urlparse(location)
    bucket = parsed.netloc
    key = parsed.path.lstrip("/")
    return bucket, key


async def _s3_conditional_put_object(
    async_fs: AsyncFilesystem, bucket: str, key: str, body: bytes, etag: str
) -> None:
    """Helper function to perform S3 conditional write with aioboto3."""
    s3_client = await async_fs.s3_client_async()
    await s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        IfMatch=f'"{etag}"',  # S3 requires quotes around ETag
    )


async def _s3_download_with_etag(
    location: str, local_path: str, async_fs: AsyncFilesystem
) -> str:
    """
    Download S3 file and get its ETag in a single operation.

    Returns:
        ETag of the downloaded file (guaranteed to match the downloaded content)
    """
    bucket, key = _s3_bucket_and_key(location)

    s3_client = await async_fs.s3_client_async()
    response = await s3_client.get_object(Bucket=bucket, Key=key)

    content = await response["Body"].read()
    with open(local_path, "wb") as f:
        f.write(content)

    etag: str = response["ETag"]
    return etag.strip('"')  # S3 returns ETag with quotes


async def _write_s3_conditional(
    async_fs: AsyncFilesystem,
    bucket: str,
    key: str,
    body: bytes,
    etag: str,
    location: str,
    logger: logging.Logger,
) -> None:
    """Write to S3 with conditional check and error handling."""
    from botocore.exceptions import ClientError

    from inspect_ai._util.trace import trace_action

    with trace_action(logger, "Log Conditional Write", location):
        try:
            await _s3_conditional_put_object(async_fs, bucket, key, body, etag)
        except ClientError as e:
            if e.response["Error"]["Code"] == "PreconditionFailed":
                raise WriteConflictError(
                    f"Log file was modified by another process. Expected ETag: {etag}"
                )
            raise


class ZipLogFile:
    _zip: ZipFile | None
    _temp_file: BinaryIO
    _fs: FileSystem

    def __init__(self, file: str) -> None:
        self._file = file
        self._zip = None
        self._fs = filesystem(file)
        self._lock = anyio.Lock()
        self._temp_file = tempfile.TemporaryFile()
        self._samples: list[EvalSample] = []
        self._summary_counter = 0
        self._summaries: list[EvalSampleSummary] = []
        self._log_start: LogStart | None = None

    async def init(
        self,
        log_start: LogStart | None,
        summary_counter: int,
        summaries: list[EvalSampleSummary],
    ) -> None:
        async with self._lock:
            self._open()
            self._summary_counter = summary_counter
            self._summaries = summaries
            self._log_start = log_start

    @property
    def log_start(self) -> LogStart | None:
        return self._log_start

    async def start(self, start: LogStart) -> None:
        async with self._lock:
            self._log_start = start
            self._zip_writestr(_journal_path(START_JSON), start)

    async def buffer_sample(self, sample: EvalSample) -> None:
        async with self._lock:
            self._samples.append(sample)

    async def write_buffered_samples(self) -> None:
        async with self._lock:
            # Write the buffered samples
            summaries: list[EvalSampleSummary] = []
            for sample in self._samples:
                # Write the sample
                self._zip_writestr(_sample_filename(sample.id, sample.epoch), sample)

                # Capture the summary
                summaries.append(sample.summary())

            self._samples.clear()

            # write intermediary summaries and add to master list
            if len(summaries) > 0:
                self._summary_counter += 1
                summary_file = _journal_summary_file(self._summary_counter)
                summary_path = _journal_summary_path(summary_file)
                self._zip_writestr(summary_path, summaries)
                self._summaries.extend(summaries)

    async def write(self, filename: str, data: Any) -> None:
        async with self._lock:
            self._zip_writestr(filename, data)

    async def flush(self) -> None:
        async with self._lock:
            # close the zip file so it is flushed
            if self._zip:
                self._zip.close()

            # Stream temp file to output using the appropriate backend
            # (native S3 multipart upload, or chunked copy via fsspec)
            self._temp_file.seek(0)

            with trace_action(logger, "Log Write", self._file):
                try:
                    async with AsyncFilesystem() as async_fs:
                        await async_fs.write_file_streaming(self._file, self._temp_file)
                finally:
                    # re-open zip file w/ self.temp_file pointer at end
                    self._open()

    async def close(self, header_only: bool) -> EvalLog:
        async with self._lock:
            try:
                self._temp_file.seek(0)
                # Always read header only from temp file (fast path)
                eval_log = _read_log_from_bytes(
                    self._temp_file, self._file, header_only=True
                )
                if not header_only:
                    # Attach lazy lists that load samples/reductions on first access.
                    # The lazy load inspects zip contents and only populates what exists.
                    lazy_data = _LazyLogData(self._file)
                    samples_lazy: LazyList[EvalSample] = LazyList(lazy_data)
                    lazy_data.samples_list = samples_lazy
                    eval_log.samples = samples_lazy  # type: ignore[assignment]

                    # Only attach lazy reductions if reductions were actually written
                    has_reductions = (
                        self._zip is not None
                        and REDUCTIONS_JSON in self._zip.namelist()
                    )
                    if has_reductions:
                        reductions_lazy: LazyList[EvalSampleReductions] = LazyList(
                            lazy_data
                        )
                        lazy_data.reductions_list = reductions_lazy
                        eval_log.reductions = reductions_lazy  # type: ignore[assignment]
                return eval_log
            finally:
                self._temp_file.close()
                if self._zip:
                    self._zip.close()

    # cleanup zip file if we didn't in normal course
    def __del__(self) -> None:
        if self._zip:
            self._zip.close()

    def _open(self) -> None:
        self._zip = ZipFile(
            self._temp_file,
            mode="a",
            **zipfile_compress_kwargs,
        )

    # raw unsynchronized version of write
    def _zip_writestr(self, filename: str, data: Any) -> None:
        assert self._zip
        self._zip.writestr(
            filename,
            to_json_safe(data, indent=None),
        )


async def _read_log(
    reader: AsyncZipReader,
    entries: list[ZipEntry],
    location: str,
    header_only: bool = False,
) -> EvalLog:
    entry_names = {e.filename for e in entries}

    eval_log = await _read_header_async(reader, entry_names, location)

    if REDUCTIONS_JSON in entry_names:
        data = await _read_member_json(reader, REDUCTIONS_JSON)
        reductions = [
            EvalSampleReductions.model_validate(
                reduction, context=get_deserializing_context()
            )
            for reduction in data
        ]
        if eval_log.results is not None:
            eval_log.reductions = reductions

    if not header_only:
        samples: list[EvalSample] = []
        for entry in entries:
            if entry.filename.startswith(f"{SAMPLES_DIR}/") and entry.filename.endswith(
                ".json"
            ):
                data = await _read_member_json(reader, entry.filename)
                samples.append(
                    EvalSample.model_validate(
                        data, context=get_deserializing_context()
                    ),
                )
        sort_samples(samples)
        eval_log.samples = samples

    return eval_log


def _read_log_from_bytes(
    log: IO[bytes], location: str, header_only: bool = False
) -> EvalLog:
    with ZipFile(log, mode="r") as zip:
        eval_log = _read_header(zip, location)
        if REDUCTIONS_JSON in zip.namelist():
            with zip.open(REDUCTIONS_JSON, "r") as f:
                reductions = [
                    EvalSampleReductions.model_validate(
                        reduction, context=get_deserializing_context()
                    )
                    for reduction in json.load(f)
                ]
                if eval_log.results is not None:
                    eval_log.reductions = reductions

        samples_list: list[EvalSample] | None = None
        if not header_only:
            samples_list = []
            for name in zip.namelist():
                if name.startswith(f"{SAMPLES_DIR}/") and name.endswith(".json"):
                    with zip.open(name, "r") as f:
                        samples_list.append(
                            EvalSample.model_validate(
                                json.load(f), context=get_deserializing_context()
                            ),
                        )
            sort_samples(samples_list)
            eval_log.samples = [resolve_sample_events_data(s) for s in samples_list]
        return eval_log


async def _read_member_json(reader: AsyncZipReader, member: str) -> Any:
    return json.loads(await reader.read_member_fully(member))


async def _read_header_async(
    reader: AsyncZipReader, entry_names: set[str], location: str
) -> EvalLog:
    if HEADER_JSON in entry_names:
        data = await _read_member_json(reader, HEADER_JSON)
        log = EvalLog.model_validate(data, context=get_deserializing_context())
        log.location = location
        return log
    else:
        data = await _read_member_json(reader, _journal_path(START_JSON))
        start = LogStart.model_validate(data, context=get_deserializing_context())
        return EvalLog(
            version=start.version,
            eval=start.eval,
            plan=start.plan,
            location=location,
        )


async def _read_start_async(reader: AsyncZipReader) -> LogStart | None:
    cd = await reader.entries()
    start_path = _journal_path(START_JSON)
    if any(e.filename == start_path for e in cd.entries):
        return cast(LogStart, await _read_member_json(reader, start_path))
    else:
        return None


async def _read_summary_counter(reader: AsyncZipReader) -> int:
    cd = await reader.entries()
    current_count = 0
    summary_prefix = _journal_summary_path()
    for entry in cd.entries:
        if entry.filename.startswith(summary_prefix) and entry.filename.endswith(
            ".json"
        ):
            this_count = int(entry.filename.split("/")[-1].split(".")[0])
            current_count = max(this_count, current_count)
    return current_count


def _parse_summaries(data: Any, source: str) -> list[EvalSampleSummary]:
    if isinstance(data, list):
        return [
            EvalSampleSummary.model_validate(value, context=get_deserializing_context())
            for value in data
        ]
    else:
        raise ValueError(f"Expected a list of summaries when reading {source}")


async def _read_all_summaries_async(
    reader: AsyncZipReader,
) -> tuple[list[EvalSampleSummary], int]:
    cd = await reader.entries()
    entry_names = {e.filename for e in cd.entries}
    count = await _read_summary_counter(reader)
    if SUMMARIES_JSON in entry_names:
        return _parse_summaries(
            await _read_member_json(reader, SUMMARIES_JSON), SUMMARIES_JSON
        ), count
    else:
        summaries: list[EvalSampleSummary] = []
        for i in range(1, count + 1):
            summary_file = _journal_summary_file(i)
            summary_path = _journal_summary_path(summary_file)
            summaries.extend(
                _parse_summaries(
                    await _read_member_json(reader, summary_path), summary_file
                )
            )
        return summaries, count


def _read_header(zip: ZipFile, location: str) -> EvalLog:
    # first see if the header is here
    if HEADER_JSON in zip.namelist():
        with zip.open(HEADER_JSON, "r") as f:
            log = EvalLog.model_validate(
                json.load(f), context=get_deserializing_context()
            )
            log.location = location
            return log
    else:
        with zip.open(_journal_path(START_JSON), "r") as f:
            start = LogStart.model_validate(
                json.load(f), context=get_deserializing_context()
            )
        return EvalLog(
            version=start.version, eval=start.eval, plan=start.plan, location=location
        )


def _sample_filename(id: str | int, epoch: int) -> str:
    return f"{SAMPLES_DIR}/{id}_epoch_{epoch}.json"


def _journal_path(file: str) -> str:
    return JOURNAL_DIR + "/" + file


def _journal_summary_path(file: str | None = None) -> str:
    if file is None:
        return _journal_path(SUMMARY_DIR)
    else:
        return f"{_journal_path(SUMMARY_DIR)}/{file}"


def _journal_summary_file(index: int) -> str:
    return f"{index}.json"


T = TypeVar("T")


class _LazyLogData:
    """Shared state for coordinated lazy loading of samples and reductions."""

    def __init__(self, location: str) -> None:
        self.location = location
        self.loaded = False
        self.samples_list: LazyList[EvalSample] | None = None
        self.reductions_list: LazyList[EvalSampleReductions] | None = None

    def load(self) -> None:
        if self.loaded:
            return
        from .._file import read_eval_log

        log = read_eval_log(self.location, header_only=False)
        if self.samples_list is not None:
            list.extend(self.samples_list, log.samples or [])
        if self.reductions_list is not None:
            list.extend(self.reductions_list, log.reductions or [])
        self.loaded = True


class LazyList(list[T], Generic[T]):
    """A list subclass that defers loading until first access.

    Used by ZipLogFile.close() to avoid deserializing all samples into memory
    when the caller doesn't actually need them (which is the common case after
    eval() returns).
    """

    def __init__(self, lazy_data: _LazyLogData) -> None:
        super().__init__()
        self._lazy_data: _LazyLogData | None = lazy_data

    def _ensure_loaded(self) -> None:
        if self._lazy_data is not None and not self._lazy_data.loaded:
            self._lazy_data.load()
            self._lazy_data = None

    def __len__(self) -> int:
        self._ensure_loaded()
        return super().__len__()

    def __iter__(self) -> Iterator[T]:
        self._ensure_loaded()
        return super().__iter__()

    @overload
    def __getitem__(self, index: SupportsIndex) -> T: ...
    @overload
    def __getitem__(self, index: slice) -> list[T]: ...
    def __getitem__(self, index: SupportsIndex | slice) -> T | list[T]:
        self._ensure_loaded()
        return super().__getitem__(index)

    def __contains__(self, item: object) -> bool:
        self._ensure_loaded()
        return super().__contains__(item)

    def __reversed__(self) -> Iterator[T]:
        self._ensure_loaded()
        return super().__reversed__()

    def __bool__(self) -> bool:
        self._ensure_loaded()
        return len(self) > 0

    def __deepcopy__(self, memo: dict[int, Any]) -> list[T]:
        self._ensure_loaded()
        return copy.deepcopy(list(self), memo)

    def __eq__(self, other: object) -> bool:
        self._ensure_loaded()
        if isinstance(other, LazyList):
            other._ensure_loaded()
        return super().__eq__(other)

    def __add__(self, other: list[Any]) -> list[Any]:
        self._ensure_loaded()
        if isinstance(other, LazyList):
            other._ensure_loaded()
        return super().__add__(other)

    def __radd__(self, other: list[Any]) -> list[Any]:
        self._ensure_loaded()
        return other.__add__(list(self))

    def __copy__(self) -> list[T]:
        self._ensure_loaded()
        return list(self)

    def __repr__(self) -> str:
        self._ensure_loaded()
        return super().__repr__()
```

## `log/_recorders/file.py`

```python
import os
from logging import getLogger
from typing import Any

from typing_extensions import override

from inspect_ai._util.async_zip import AsyncZipReader
from inspect_ai._util.constants import MODEL_NONE
from inspect_ai._util.file import clean_filename_component, filesystem
from inspect_ai._util.task import task_display_name
from inspect_ai.dataset._util import normalise_sample_id

from .._log import EvalLog, EvalSample, EvalSampleSummary, EvalSpec
from .recorder import Recorder

logger = getLogger(__name__)


class FileRecorder(Recorder):
    __last_read_sample_log: tuple[str, EvalLog] | None = None

    def __init__(
        self, log_dir: str, suffix: str, fs_options: dict[str, Any] | None = None
    ) -> None:
        self.log_dir = log_dir.rstrip("/\\")
        self.suffix = suffix

        # initialise filesystem
        self.fs = filesystem(log_dir, fs_options if fs_options is not None else {})
        self.fs.mkdir(self.log_dir, exist_ok=True)

    def is_local(self) -> bool:
        return self.fs.is_local()

    @override
    def is_writeable(self) -> bool:
        return self.fs.is_writeable(self.log_dir)

    @override
    @classmethod
    async def read_log_sample(
        cls,
        location: str,
        id: str | int | None = None,
        epoch: int = 1,
        uuid: str | None = None,
        exclude_fields: set[str] | None = None,
        reader: AsyncZipReader | None = None,
    ) -> EvalSample:
        # establish the log to read from (might be cached)
        eval_log = await cls._log_file_maybe_cached(location)

        # throw if no samples
        if not eval_log.samples:
            raise IndexError(f"No samples found in log {location}")

        # find the sample
        id = normalise_sample_id(id) if id is not None else id
        eval_sample = next(
            (
                sample
                for sample in (eval_log.samples)
                if (
                    id
                    and normalise_sample_id(sample.id) == id
                    and sample.epoch == epoch
                )
                or (uuid and sample.uuid == uuid)
            ),
            None,
        )
        if eval_sample is None:
            raise IndexError(
                f"Sample id {id} for epoch {epoch} not found in log {location}"
            )
        else:
            return eval_sample

    @classmethod
    @override
    async def read_log_sample_summaries(cls, location: str) -> list[EvalSampleSummary]:
        # establish the log to read from (might be cached)
        eval_log = await cls._log_file_maybe_cached(location)
        if not eval_log.samples:
            return []
        return [sample.summary() for sample in eval_log.samples]

    @classmethod
    async def _log_file_maybe_cached(cls, location: str) -> EvalLog:
        # establish the log to read from (might be cached)
        if cls.__last_read_sample_log and (cls.__last_read_sample_log[0] == location):
            eval_log = cls.__last_read_sample_log[1]
        else:
            eval_log = await cls.read_log(location)
            cls.__last_read_sample_log = (location, eval_log)
        return eval_log

    def _log_file_key(self, eval: EvalSpec) -> str:
        # remove package from task name
        task = task_display_name(eval.task)  # noqa: F841

        # derive log file pattern
        log_file_pattern = os.getenv("INSPECT_EVAL_LOG_FILE_PATTERN", "{task}_{id}")

        # compute and return log file name
        log_file_name = f"{clean_filename_component(eval.created)}_" + log_file_pattern
        log_file_name = log_file_name.replace("{task}", clean_filename_component(task))
        log_file_name = log_file_name.replace(
            "{id}", clean_filename_component(eval.task_id)
        )
        model = clean_filename_component(eval.model) if eval.model != MODEL_NONE else ""
        log_file_name = log_file_name.replace("{model}", model)
        return log_file_name

    def _log_file_path(self, eval: EvalSpec) -> str:
        return f"{self.log_dir}{self.fs.sep}{self._log_file_key(eval)}{self.suffix}"
```

## `log/_recorders/json.py`

```python
from logging import getLogger
from typing import IO, Any, get_args

import ijson  # type: ignore
from ijson import IncompleteJSONError
from ijson.backends.python import UnexpectedSymbol  # type: ignore
from pydantic import BaseModel
from pydantic_core import from_json
from typing_extensions import override

from inspect_ai._util.asyncfiles import AsyncFilesystem
from inspect_ai._util.constants import (
    LOG_SCHEMA_VERSION,
    get_deserializing_context,
)
from inspect_ai._util.error import EvalError
from inspect_ai._util.file import absolute_file_path, file, filesystem
from inspect_ai._util.json import is_ijson_nan_inf_error
from inspect_ai._util.trace import trace_action

from .._edit import LogUpdate
from .._log import (
    EvalLog,
    EvalPlan,
    EvalResults,
    EvalSample,
    EvalSampleReductions,
    EvalSpec,
    EvalStats,
    EvalStatus,
    sort_samples,
)
from .eval import _s3_bucket_and_key, _write_s3_conditional
from .file import FileRecorder

logger = getLogger(__name__)


class JSONRecorder(FileRecorder):
    @override
    @classmethod
    def handles_location(cls, location: str) -> bool:
        return location.endswith(".json")

    @override
    @classmethod
    def handles_bytes(cls, first_bytes: bytes) -> bool:
        return first_bytes[:1] == b"{"

    @override
    def default_log_buffer(self, sample_count: int, high_throughput: bool) -> int:
        if high_throughput:
            # High-throughput: flush ~10 times over the run
            return max(10, sample_count // 10)
        else:
            # we write the entire file in one shot and the files can
            # get fairly large (> 100MB) so we are a bit more sparing
            # for remote filesystem writes
            if self.is_local():
                return 10
            else:
                return 100

    class JSONLogFile(BaseModel):
        file: str
        data: EvalLog

    def __init__(
        self,
        log_dir: str,
        suffix: str = ".json",
        fs_options: dict[str, Any] | None = None,
    ):
        # call super
        super().__init__(log_dir, suffix, fs_options)

        # each eval has a unique key (created from run_id and task name/version)
        # which we use to track the output path, accumulated data, and event counter
        self.data: dict[str, JSONRecorder.JSONLogFile] = {}

    @override
    async def log_init(self, eval: EvalSpec, location: str | None = None) -> str:
        # initialize file log for this eval
        # compute an absolute path if it's a relative ref
        # (so that the writes go to the correct place even
        # if the working directory is switched for a task)
        file = location or absolute_file_path(self._log_file_path(eval))

        # compute an absolute path if it's a relative ref
        # (so that the writes go to the correct place even
        # if the working directory is switched for a task)
        self.data[self._log_file_key(eval)] = JSONRecorder.JSONLogFile(
            file=file, data=EvalLog(eval=eval)
        )

        # attempt to
        return file

    @override
    async def log_start(self, eval: EvalSpec, plan: EvalPlan) -> None:
        log = self.data[self._log_file_key(eval)]
        log.data.plan = plan

    @override
    async def log_sample(self, eval: EvalSpec, sample: EvalSample) -> None:
        log = self.data[self._log_file_key(eval)]
        if log.data.samples is None:
            log.data.samples = []
        log.data.samples.append(sample)

    @override
    async def log_finish(
        self,
        eval: EvalSpec,
        status: EvalStatus,
        stats: EvalStats,
        results: EvalResults | None,
        reductions: list[EvalSampleReductions] | None,
        error: EvalError | None = None,
        header_only: bool = False,
        invalidated: bool = False,
        log_updates: list[LogUpdate] | None = None,
    ) -> EvalLog:
        log = self.data[self._log_file_key(eval)]
        log.data.status = status
        log.data.stats = stats
        log.data.results = results
        log.data.invalidated = invalidated
        log.data.log_updates = log_updates
        log.data.recompute_tags_and_metadata()
        if error:
            log.data.error = error
        if reductions:
            log.data.reductions = reductions
        await self.write_log(log.file, log.data)
        log.data.location = log.file

        # stop tracking this data
        del self.data[self._log_file_key(eval)]

        # return the log
        return log.data

    @override
    async def flush(self, eval: EvalSpec) -> None:
        log = self.data[self._log_file_key(eval)]
        await self.write_log(log.file, log.data)

    @override
    @classmethod
    async def read_log(
        cls,
        location: str,
        header_only: bool = False,
    ) -> EvalLog:
        fs = filesystem(location)

        if header_only:
            # Fast path: header only
            try:
                log = _read_header_streaming(location)
                if fs.is_s3():
                    file_info = fs.info(location)
                    log.etag = file_info.etag
                return log
            # The Python JSON serializer supports NaN and Inf, however
            # this isn't technically part of the JSON spec. The json-stream
            # library shares this limitation, so if we fail with an
            # invalid character (or Unexpected symbol) then we move on and and parse w/ pydantic
            # (which does support NaN and Inf by default)
            except (ValueError, IncompleteJSONError, UnexpectedSymbol) as ex:
                if is_ijson_nan_inf_error(ex):
                    pass
                else:
                    raise ValueError(f"Unable to read log file: {location}") from ex

        # full reads (and fallback to streaming reads if they encounter invalid json characters)
        if fs.is_s3():
            # read content and get ETag such that they always match
            content, etag = await _s3_read_with_etag(location)
            raw_data = from_json(content)
        else:
            with file(location, "r") as f:
                raw_data = from_json(f.read())
            etag = None

        log = _parse_json_log(raw_data, header_only)
        log.location = location
        if etag:
            log.etag = etag

        return log

    @override
    @classmethod
    async def read_log_bytes(
        cls, log_bytes: IO[bytes], header_only: bool = False
    ) -> EvalLog:
        return _parse_json_log(from_json(log_bytes.read()), header_only)

    @override
    @classmethod
    async def write_log(
        cls, location: str, log: EvalLog, if_match_etag: str | None = None
    ) -> None:
        from inspect_ai.log._file import eval_log_json

        # sort samples before writing as they can come in out of order
        if log.samples:
            sort_samples(log.samples)

        fs = filesystem(location)
        if fs.is_s3() and if_match_etag:
            # Use S3 conditional write
            await cls._write_log_s3_conditional(location, log, if_match_etag)
        else:
            # Standard write
            # get log as bytes
            log_bytes = eval_log_json(log)

            with trace_action(logger, "Log Write", location):
                with file(location, "wb") as f:
                    f.write(log_bytes)

    @classmethod
    async def _write_log_s3_conditional(
        cls, location: str, log: EvalLog, etag: str
    ) -> None:
        """Perform S3 conditional write using aioboto3."""
        from inspect_ai.log._file import eval_log_json

        bucket, key = _s3_bucket_and_key(location)

        # get log as bytes
        log_bytes = eval_log_json(log)

        async with AsyncFilesystem() as async_fs:
            await _write_s3_conditional(
                async_fs,
                bucket,
                key,
                log_bytes,
                etag,
                location,
                logger,
            )


def _validate_version(ver: int) -> None:
    if ver > LOG_SCHEMA_VERSION:
        raise ValueError(f"Unable to read version {ver} of log format.")


def _parse_json_log(raw_data: Any, header_only: bool) -> EvalLog:
    """Parse raw JSON data into an EvalLog, validating version and pruning if header_only."""
    log = EvalLog.model_validate(raw_data, context=get_deserializing_context())

    # fail for unknown version
    _validate_version(log.version)

    # set the version to the schema version we'll be returning
    log.version = LOG_SCHEMA_VERSION

    # prune if header_only
    if header_only:
        # exclude samples
        log.samples = None

        # prune sample reductions
        if log.results is not None:
            log.results.sample_reductions = None
            log.reductions = None

    return log


async def _s3_read_with_etag(
    location: str,
) -> tuple[str, str]:
    """
    Read S3 file content and get ETag in a single operation.

    Returns:
        (content, etag) - etag is guaranteed to match content
    """
    bucket, key = _s3_bucket_and_key(location)

    async with AsyncFilesystem() as async_fs:
        s3_client = await async_fs.s3_client_async()
        response = await s3_client.get_object(Bucket=bucket, Key=key)
        content = await response["Body"].read()
        content = content.decode("utf-8")
        etag = response["ETag"].strip('"')  # S3 returns ETag with quotes

        return content, etag


def _read_header_streaming(log_file: str) -> EvalLog:
    with file(log_file, "rb") as f:
        # Do low-level parsing to get the version number and also
        # detect the presence of results or error sections
        version: int | None = None
        last_header_field = "stats"

        for prefix, event, value in ijson.parse(f):
            if (prefix, event) == ("version", "number"):
                version = value
            elif prefix == "samples":
                # Break as soon as we hit samples as that can be very large
                break
            elif event == "map_key" and prefix == "":
                last_header_field = value

        if version is None:
            raise ValueError("Unable to read version of log format.")

        _validate_version(version)
        version = LOG_SCHEMA_VERSION

        # Rewind the file to the beginning to re-parse the contents of fields
        f.seek(0)

        # Parse all header fields, stopping before samples
        invalidated = False
        status: EvalStatus | None = None
        eval: EvalSpec | None = None
        plan: EvalPlan | None = None
        results: EvalResults | None = None
        stats: EvalStats | None = None
        error: EvalError | None = None
        log_updates: list[LogUpdate] | None = None
        for k, v in ijson.kvitems(f, ""):
            if k == "status":
                assert v in get_args(EvalStatus)
                status = v
            elif k == "invalidated":
                invalidated = v
            elif k == "eval":
                eval = EvalSpec.model_validate(v, context=get_deserializing_context())
            elif k == "plan":
                plan = EvalPlan.model_validate(v)
            elif k == "results":
                results = EvalResults.model_validate(v)
            elif k == "stats":
                stats = EvalStats.model_validate(v)
            elif k == "error":
                error = EvalError.model_validate(v)
            elif k == "log_updates":
                log_updates = [LogUpdate.model_validate(u) for u in v]
            if k == last_header_field:
                break

    assert status, "Must encounter a 'status'"
    assert eval, "Must encounter a 'eval'"
    assert plan, "Must encounter a 'plan'"
    assert stats, "Must encounter a 'stats'"

    return EvalLog(
        eval=eval,
        plan=plan,
        results=results,
        stats=stats,
        status=status,
        invalidated=invalidated,
        log_updates=log_updates,
        version=version,
        error=error,
        location=log_file,
    )
```

## `log/_recorders/recorder.py`

```python
import abc
from typing import IO

from inspect_ai._util.async_zip import AsyncZipReader
from inspect_ai._util.error import EvalError
from inspect_ai.log._edit import LogUpdate
from inspect_ai.log._log import (
    EvalLog,
    EvalPlan,
    EvalResults,
    EvalSample,
    EvalSampleReductions,
    EvalSampleSummary,
    EvalSpec,
    EvalStats,
    EvalStatus,
)


class Recorder(abc.ABC):
    @classmethod
    @abc.abstractmethod
    def handles_location(cls, location: str) -> bool: ...

    @classmethod
    @abc.abstractmethod
    def handles_bytes(cls, first_bytes: bytes) -> bool: ...

    @abc.abstractmethod
    def default_log_buffer(self, sample_count: int, high_throughput: bool) -> int: ...

    @abc.abstractmethod
    def is_writeable(self) -> bool: ...

    @abc.abstractmethod
    async def log_init(self, eval: EvalSpec, location: str | None = None) -> str: ...

    @abc.abstractmethod
    async def log_start(self, eval: EvalSpec, plan: EvalPlan) -> None: ...

    @abc.abstractmethod
    async def log_sample(self, eval: EvalSpec, sample: EvalSample) -> None: ...

    @abc.abstractmethod
    async def flush(self, eval: EvalSpec) -> None: ...

    @abc.abstractmethod
    async def log_finish(
        self,
        eval: EvalSpec,
        status: EvalStatus,
        stats: EvalStats,
        results: EvalResults | None,
        reductions: list[EvalSampleReductions] | None,
        error: EvalError | None = None,
        header_only: bool = False,
        invalidated: bool = False,
        log_updates: list[LogUpdate] | None = None,
    ) -> EvalLog: ...

    @classmethod
    @abc.abstractmethod
    async def read_log(
        cls,
        location: str,
        header_only: bool = False,
    ) -> EvalLog: ...

    @classmethod
    @abc.abstractmethod
    async def read_log_bytes(
        cls, log_bytes: IO[bytes], header_only: bool = False
    ) -> EvalLog: ...

    @classmethod
    @abc.abstractmethod
    async def read_log_sample(
        cls,
        location: str,
        id: str | int | None = None,
        epoch: int = 1,
        uuid: str | None = None,
        exclude_fields: set[str] | None = None,
        reader: AsyncZipReader | None = None,
    ) -> EvalSample: ...

    @classmethod
    @abc.abstractmethod
    async def read_log_sample_summaries(
        cls, location: str
    ) -> list[EvalSampleSummary]: ...

    @classmethod
    async def read_log_sample_ids(cls, location: str) -> list[tuple[str | int, int]]:
        return sorted(
            (
                (sample_summary.id, sample_summary.epoch)
                for sample_summary in await cls.read_log_sample_summaries(location)
            ),
            key=lambda x: (
                x[1],
                (x[0] if isinstance(x[0], str) else str(x[0]).zfill(20)),
            ),
        )

    @classmethod
    @abc.abstractmethod
    async def write_log(
        cls, location: str, log: EvalLog, if_match_etag: str | None = None
    ) -> None: ...
```

## `log/_recorders/types.py`

```python
from pydantic import BaseModel

from inspect_ai.event._event import Event


class SampleEvent(BaseModel):
    id: str | int
    epoch: int
    event: Event
```

## `log/_refusal.py`

```python
from logging import getLogger

logger = getLogger(__name__)

_refusal_count: int = 0
_log_refusals: bool = False


def report_refusal(refusal: str) -> None:
    from inspect_ai.log._samples import sample_active

    # update counter
    global _refusal_count
    _refusal_count = _refusal_count + 1

    # log warning
    global _log_refusals
    if _log_refusals:
        active = sample_active()
        if active:
            sample = f" ({active.task}/{active.id}/{active.epoch})"
        else:
            sample = ""
        warning = f"Model refusal{sample}: {refusal}"
        logger.warning(warning)


def refusal_count() -> int:
    return _refusal_count


def init_refusal_tracking(log_refusals: bool | None) -> None:
    global _refusal_count, _log_refusals
    _refusal_count = 0
    _log_refusals = log_refusals is True
```

## `log/_retry.py`

```python
from logging import getLogger

from inspect_ai._util.logger import warn_once

from ._file import EvalLogInfo, read_eval_log_headers

logger = getLogger(__name__)


def retryable_eval_logs(logs: list[EvalLogInfo]) -> list[EvalLogInfo]:
    """Extract the list of retryable logs from a list of logs.

    Retryable logs are logs with status "error" or "cancelled" that
    do not have a corresponding log with status "success" (indicating
    they were subsequently retried and completed)

    Args:
      logs (list[EvalLogInfo]): List of logs to examine.

    Returns:
      List of retryable eval logs found in the list of logs.
    """
    warn_once(
        logger,
        "The retryable_eval_logs function is deprecated. Please use the eval_set() function instead.",
    )

    # first collect up all of the headers (so we can look at status)
    log_headers = read_eval_log_headers(logs)

    # build a set of completed task ids
    completed_task_ids = set(
        [
            log_header.eval.task_id
            for log_header in log_headers
            if (log_header.status == "success" and not log_header.invalidated)
        ]
    )

    # find all logs for incomplete tasks ("started", "error", or "cancelled") that # # have not been subsequently completed (keep a map by task_id, and perserve only
    # the most recent one)
    retryable_logs: dict[str, EvalLogInfo] = {}
    for log, log_header in zip(logs, log_headers):
        if (
            log_header.status == "cancelled"
            or log_header.status == "error"
            or log_header.invalidated
        ):
            if log_header.eval.task_id not in completed_task_ids:
                existing_log = retryable_logs.get(log_header.eval.task_id, None)
                if existing_log:
                    if (
                        existing_log.mtime is not None
                        and log.mtime is not None
                        and log.mtime > existing_log.mtime
                    ):
                        retryable_logs[log_header.eval.task_id] = log
                else:
                    retryable_logs[log_header.eval.task_id] = log

    # return the retryable logs
    return list(retryable_logs.values())
```

## `log/_samples.py`

```python
import contextlib
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, AsyncGenerator, Iterator, Literal

if TYPE_CHECKING:
    from anyio.streams.memory import MemoryObjectReceiveStream, MemoryObjectSendStream

    from inspect_ai.hooks._hooks import SampleEvent
    from inspect_ai.model._model_call import ModelCall, ModelCallFilter

import anyio
from anyio.abc import TaskGroup
from shortuuid import uuid

from inspect_ai.dataset._dataset import Sample
from inspect_ai.util._limit import LimitExceededError
from inspect_ai.util._sandbox import SandboxConnection
from inspect_ai.util._sandbox.context import sandbox_connections

from ..event._model import ModelEvent
from ._transcript import Transcript


class ActiveSample:
    def __init__(
        self,
        *,
        task: str,
        log_location: str,
        model: str,
        sample: Sample,
        epoch: int,
        message_limit: int | None,
        token_limit: int | None,
        cost_limit: float | None,
        time_limit: int | None,
        working_limit: int | None,
        fails_on_error: bool,
        transcript: Transcript,
        sandboxes: dict[str, SandboxConnection],
        eval_set_id: str | None = None,
        run_id: str | None = None,
        eval_id: str | None = None,
    ) -> None:
        self.id = uuid()
        self.started: float | None = None
        self.tg: TaskGroup | None = None
        self.completed: float | None = None
        self.task = task
        self.log_location = log_location
        self.model = model
        self.sample = sample
        self.epoch = epoch
        self.message_limit = message_limit
        self.token_limit = token_limit
        self.cost_limit = cost_limit
        self.time_limit = time_limit
        self.working_limit = working_limit
        self.fails_on_error = fails_on_error
        self.total_messages = 0
        self.total_tokens = 0
        self.total_cost: float | None = None
        self.transcript = transcript
        self.sandboxes = sandboxes
        self.eval_set_id = eval_set_id
        self.run_id = run_id
        self.eval_id = eval_id
        self._interrupt_action: Literal["score", "error"] | None = None
        self._limit_exceeded_error: LimitExceededError | None = None
        self.event_send: MemoryObjectSendStream[SampleEvent] | None = None
        self.event_receive: MemoryObjectReceiveStream[SampleEvent] | None = None
        self.event_done: anyio.Event | None = None

    def start(self, tg: TaskGroup) -> None:
        self.started = datetime.now(timezone.utc).timestamp()
        self.tg = tg

    def complete(self) -> None:
        self.completed = datetime.now(timezone.utc).timestamp()

    @property
    def running_time(self) -> float:
        if self.started is not None:
            completed = (
                self.completed
                if self.completed is not None
                else datetime.now(timezone.utc).timestamp()
            )
            return completed - self.started
        else:
            return 0

    def interrupt(self, action: Literal["score", "error"]) -> None:
        self._interrupt_action = action
        if self.tg is None:
            raise RuntimeError(
                "Attempted to interrupt sample without enclosing task group."
            )
        self.tg.cancel_scope.cancel()

    def limit_exceeded(self, error: LimitExceededError) -> None:
        self._limit_exceeded_error = error
        if self.tg is None:
            raise RuntimeError(
                "Attempted to interrupt sample for limit without enclosing task group."
            )
        self.tg.cancel_scope.cancel()

    @property
    def interrupt_action(self) -> Literal["score", "error"] | None:
        return self._interrupt_action

    @property
    def limit_exceeded_error(self) -> LimitExceededError | None:
        return self._limit_exceeded_error


def init_active_samples() -> None:
    _active_samples.clear()


@contextlib.asynccontextmanager
async def active_sample(
    *,
    task: str,
    log_location: str,
    model: str,
    sample: Sample,
    epoch: int,
    message_limit: int | None,
    token_limit: int | None,
    cost_limit: float | None,
    time_limit: int | None,
    working_limit: int | None,
    fails_on_error: bool,
    transcript: Transcript,
    eval_set_id: str | None = None,
    run_id: str | None = None,
    eval_id: str | None = None,
) -> AsyncGenerator[ActiveSample, None]:
    # create the sample
    active = ActiveSample(
        task=task,
        log_location=log_location,
        model=model,
        sample=sample,
        epoch=epoch,
        message_limit=message_limit,
        token_limit=token_limit,
        cost_limit=cost_limit,
        time_limit=time_limit,
        working_limit=working_limit,
        sandboxes=await sandbox_connections(),
        fails_on_error=fails_on_error,
        transcript=transcript,
        eval_set_id=eval_set_id,
        run_id=run_id,
        eval_id=eval_id,
    )

    _active_samples.append(active)
    _sample_active.set(active)
    try:
        yield active
    finally:
        active.complete()
        _active_samples.remove(active)
        _sample_active.set(None)


def sample_active() -> ActiveSample | None:
    return _sample_active.get(None)


def set_active_sample_token_limit(token_limit: int | None) -> None:
    active = sample_active()
    if active:
        active.token_limit = token_limit


def set_active_sample_total_tokens(total_tokens: int) -> None:
    active = sample_active()
    if active:
        active.total_tokens = total_tokens


def set_active_sample_cost_limit(cost_limit: float | None) -> None:
    active = sample_active()
    if active:
        active.cost_limit = cost_limit


def set_active_sample_total_cost(total_cost: float | None) -> None:
    active = sample_active()
    if active:
        active.total_cost = total_cost


def active_sample_message_limit() -> int | None:
    active = sample_active()
    if active:
        return active.message_limit
    else:
        return None


def set_active_sample_message_limit(message_limit: int | None) -> None:
    active = sample_active()
    if active:
        active.message_limit = message_limit


def set_active_sample_total_messages(total_messages: int) -> None:
    active = sample_active()
    if active:
        active.total_messages = total_messages


_active_model_event: ContextVar[ModelEvent | None] = ContextVar(
    "_active_model_event", default=None
)


@contextlib.contextmanager
def track_active_model_event(event: ModelEvent) -> Iterator[None]:
    token = _active_model_event.set(event)
    try:
        yield
    finally:
        _active_model_event.reset(token)


def has_active_model_event() -> bool:
    return _active_model_event.get() is not None


def set_active_model_event_call(
    request: Any,
    filter: "ModelCallFilter | None" = None,
) -> "ModelCall":
    """Create a ModelCall and register it with the active model event."""
    from inspect_ai.log._transcript import transcript
    from inspect_ai.model._model_call import ModelCall

    if request is None:
        request = {}
    model_call = ModelCall.create(request, None, filter)
    event = _active_model_event.get()
    if event is not None:
        event.call = model_call
        transcript()._event_updated(event)
    return model_call


def report_active_sample_retry() -> None:
    model_event = _active_model_event.get()
    if model_event is not None:
        if model_event.retries is None:
            model_event.retries = 0
        model_event.retries = model_event.retries + 1


_sample_active: ContextVar[ActiveSample | None] = ContextVar(
    "_sample_active", default=None
)


def active_samples() -> list[ActiveSample]:
    return _active_samples


_active_samples: list[ActiveSample] = []
```

## `log/_score.py`

```python
"""Score editing functionality."""

from inspect_ai.event._score_edit import ScoreEditEvent
from inspect_ai.event._tree import EventTree, EventTreeSpan, event_tree, walk_node_spans
from inspect_ai.scorer._metric import Score, ScoreEdit

from ._log import EvalLog
from ._metric import recompute_metrics as _recompute_metrics


def edit_score(
    log: EvalLog,
    sample_id: int | str,
    score_name: str,
    edit: ScoreEdit,
    recompute_metrics: bool = True,
    epoch: int | None = None,
) -> None:
    """Edit or add a score in-place.

    Args:
        log: The evaluation log containing the samples and scores
        sample_id: ID of the sample containing the score to edit or add to
        score_name: Name of the score to edit. If the score does not exist,
            a new score will be created with this name.
        edit: The edit to apply to the score. When creating a new score,
            the 'value' field must be provided (cannot be UNCHANGED).
        recompute_metrics: Whether to recompute aggregate metrics after editing
        epoch: Epoch number of the sample to edit (required when there are multiple epochs)

    Raises:
        ValueError: If the sample cannot be found, if epoch is not specified
            and there are multiple matching samples for an ID, or if creating
            a new score without providing a value.
    """
    if log.samples is None:
        raise ValueError("Log contains no samples")

    if epoch is not None:
        sample = next(
            (
                sample
                for sample in log.samples
                if sample.id == sample_id and sample.epoch == epoch
            ),
            None,
        )
        if sample is None:
            raise ValueError(f"Sample with id {sample_id} and epoch {epoch} not found")
    else:
        samples = [sample for sample in log.samples if sample.id == sample_id]

        if not samples:
            raise ValueError(f"Sample with id {sample_id} not found")

        if len(samples) > 1:
            raise ValueError(
                f"Multiple samples found with id {sample_id}. You must specify the epoch parameter."
            )

        sample = samples[0]

    if sample.scores is None:
        sample.scores = {}

    is_new_score = score_name not in sample.scores

    if is_new_score:
        if edit.value == "UNCHANGED":
            raise ValueError(
                f"Cannot add new score '{score_name}' without providing a value. "
                "The 'value' field is required when creating a new score."
            )

        new_score = Score(
            value=edit.value,
            answer=edit.answer if edit.answer != "UNCHANGED" else None,
            explanation=edit.explanation if edit.explanation != "UNCHANGED" else None,
            metadata=edit.metadata if edit.metadata != "UNCHANGED" else None,
            history=[edit],
        )
        sample.scores[score_name] = new_score
    else:
        score = sample.scores[score_name]

        if not score.history:
            original = ScoreEdit(
                value=score.value,
                answer=score.answer,
                explanation=score.explanation,
                metadata=score.metadata or {},
            )
            score.history.append(original)

        if edit.value != "UNCHANGED":
            score.value = edit.value
        if edit.answer != "UNCHANGED":
            score.answer = edit.answer
        if edit.explanation != "UNCHANGED":
            score.explanation = edit.explanation
        if edit.metadata != "UNCHANGED":
            score.metadata = edit.metadata

        score.history.append(edit)

    final_scorers_node = _find_scorers_span(event_tree(sample.events))
    score_edit_event = ScoreEditEvent(score_name=score_name, edit=edit)

    if final_scorers_node:
        score_edit_event.span_id = final_scorers_node.begin.id

    # Insert event just before the end of the scorers span, or at end if no span
    end_index = len(sample.events)
    if final_scorers_node and final_scorers_node.end is not None:
        for i, ev in enumerate(reversed(sample.events)):
            if ev == final_scorers_node.end:
                end_index = len(sample.events) - 1 - i
                break

    sample.events.insert(end_index, score_edit_event)

    if recompute_metrics:
        _recompute_metrics(log)


def _find_scorers_span(tree: EventTree) -> EventTreeSpan | None:
    last_scorers_node = None
    for node in walk_node_spans(tree):
        if node.type == "scorers" and node.name == "scorers":
            last_scorers_node = node
    return last_scorers_node
```

## `log/_transcript.py`

```python
import contextlib
from contextvars import ContextVar
from logging import getLogger
from typing import (
    Callable,
    Iterator,
    Sequence,
    TypeVar,
    overload,
)

from pydantic import (
    JsonValue,
)

from inspect_ai._util.logger import warn_once
from inspect_ai.event._base import BaseEvent
from inspect_ai.event._event import Event
from inspect_ai.event._info import InfoEvent
from inspect_ai.event._model import ModelEvent
from inspect_ai.event._store import StoreEvent
from inspect_ai.event._timeline import Timeline
from inspect_ai.log._condense import (
    WalkContext,
    events_attachment_fn,
    walk_model_call,
)
from inspect_ai.util._store import store, store_changes, store_jsonable

logger = getLogger(__name__)


ET = TypeVar("ET", bound=BaseEvent)


class Transcript:
    """Transcript of events."""

    _event_logger: Callable[[Event], None] | None
    _context: WalkContext

    @overload
    def __init__(self, *, log_model_api: bool = False) -> None: ...

    @overload
    def __init__(self, events: list[Event], log_model_api: bool = False) -> None: ...

    def __init__(
        self, events: list[Event] | None = None, log_model_api: bool = False
    ) -> None:
        self._event_logger = None
        self._log_model_api = log_model_api
        self._context = WalkContext(message_cache={}, only_core=False)
        self._events: list[Event] = events if events is not None else []
        self._attachments: dict[str, str] = {}
        self._timelines: list[Timeline] = []

    def info(self, data: JsonValue, *, source: str | None = None) -> None:
        """Add an `InfoEvent` to the transcript.

        Args:
           data: Data associated with the event.
           source: Optional event source.
        """
        self._event(InfoEvent(source=source, data=data))

    @contextlib.contextmanager
    def step(self, name: str, type: str | None = None) -> Iterator[None]:
        """Context manager for recording StepEvent.

        The `step()` context manager is deprecated and will be removed in a future version.
        Please use the `span()` context manager instead.

        Args:
            name (str): Step name.
            type (str | None): Optional step type.
        """
        warn_once(
            logger,
            "The `transcript().step()` context manager is deprecated and will "
            + "be removed in a future version. Please replace the call to step() "
            + "with a call to span().",
        )
        yield

    @property
    def events(self) -> Sequence[Event]:
        return self._events

    @property
    def attachments(self) -> dict[str, str]:
        return self._attachments

    @property
    def timelines(self) -> Sequence[Timeline]:
        return self._timelines

    def add_timeline(self, timeline: Timeline) -> None:
        """Add a named timeline to the transcript.

        Args:
            timeline: Timeline to add.

        Raises:
            ValueError: If a timeline with the same name already exists.
        """
        for existing in self._timelines:
            if existing.name == timeline.name:
                raise ValueError(
                    f"A timeline with the name '{timeline.name}' already exists."
                )
        self._timelines.append(timeline)

    def _event(self, event: Event) -> None:
        self._process_event(event)
        self._events.append(event)

    def _event_updated(self, event: Event) -> None:
        self._process_event(event)

    def _process_event(self, event: Event) -> None:
        # remove call if requested
        is_error_call = (
            isinstance(event, ModelEvent)
            and event.call is not None
            and event.call.error
        )
        if (
            isinstance(event, ModelEvent)
            and not is_error_call
            and not self._log_model_api
        ):
            event.call = None

        if self._event_logger:
            self._event_logger(event)

        # condense model event calls immediately to prevent O(N) memory usage
        if isinstance(event, ModelEvent) and event.call is not None:
            event_fn = events_attachment_fn(self.attachments)
            event.call = walk_model_call(event.call, event_fn, self._context)

    def _subscribe(self, event_logger: Callable[[Event], None]) -> None:
        self._event_logger = event_logger


def transcript() -> Transcript:
    """Get the current `Transcript`."""
    return _transcript.get()


@contextlib.contextmanager
def track_store_changes() -> Iterator[None]:
    before = store_jsonable(store())
    yield
    after = store_jsonable(store())

    changes = store_changes(before, after)
    if changes:
        transcript()._event(StoreEvent(changes=changes))


def init_transcript(transcript: Transcript) -> None:
    _transcript.set(transcript)


_transcript: ContextVar[Transcript] = ContextVar(
    "subtask_transcript", default=Transcript()
)
```

## `log/_util.py`

```python
import textwrap
from datetime import date, datetime, time
from typing import Any

from inspect_ai._util.content import (
    ContentAudio,
    ContentData,
    ContentDocument,
    ContentImage,
    ContentReasoning,
    ContentText,
    ContentToolUse,
    ContentVideo,
)
from inspect_ai._util.json import to_json_str_safe
from inspect_ai.model._chat_message import ChatMessage

# the maximum length of summary inputs
MAX_TEXT_LENGTH = 5120


def thin_input(inputs: str | list[ChatMessage]) -> str | list[ChatMessage]:
    # Clean the input of any images or documents
    if isinstance(inputs, list):
        input: list[ChatMessage] = []
        for message in inputs:
            if not isinstance(message.content, str):
                filtered_content: list[
                    ContentText
                    | ContentReasoning
                    | ContentToolUse
                    | ContentImage
                    | ContentAudio
                    | ContentVideo
                    | ContentData
                    | ContentDocument
                ] = []
                for content in message.content:
                    if content.type == "text":
                        truncated_input = truncate_text(content.text)
                        if content.text != truncated_input:
                            truncated_content = ContentText(
                                text=truncated_input,
                                citations=content.citations,
                                refusal=content.refusal,
                            )
                            filtered_content.append(truncated_content)
                        else:
                            filtered_content.append(content)
                    else:
                        filtered_content.append(
                            ContentText(text=f"({content.type.capitalize()})")
                        )
                message.content = filtered_content
                input.append(message)
            else:
                message.content = truncate_text(message.content)
                input.append(message)
        return input
    else:
        return truncate_text(inputs)


def thin_target(target: str | list[str]) -> str | list[str]:
    """Thin the target by truncating if necessary."""
    if isinstance(target, list):
        return [truncate_text(t) for t in target]
    else:
        return truncate_text(target)


def truncate_text(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """Truncate text to a maximum length, appending as ellipsis if truncated."""
    if len(text) > max_length:
        return text[:max_length] + "...\n(content truncated)"
    return text


def thin_text(text: str) -> str:
    return textwrap.shorten(text, width=1024, placeholder="...")


def thin_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    thinned: dict[str, Any] = {}
    for key, value in metadata.items():
        if isinstance(value, int | float | bool | date | time | datetime):
            thinned[key] = value
        elif isinstance(value, str):
            thinned[key] = thin_text(value)
        else:
            size = len(to_json_str_safe(value))
            if size <= 1024:
                thinned[key] = value
            else:
                thinned[key] = "Key removed from summary (> 1k)"
    return thinned
```

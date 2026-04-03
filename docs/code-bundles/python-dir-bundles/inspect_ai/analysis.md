# Python Bundle: `analysis`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `33`

## Files

- `analysis/__init__.py`
- `analysis/_dataframe/__init__.py`
- `analysis/_dataframe/columns.py`
- `analysis/_dataframe/evals/__init__.py`
- `analysis/_dataframe/evals/columns.py`
- `analysis/_dataframe/evals/extract.py`
- `analysis/_dataframe/evals/table.py`
- `analysis/_dataframe/events/__init__.py`
- `analysis/_dataframe/events/columns.py`
- `analysis/_dataframe/events/extract.py`
- `analysis/_dataframe/events/table.py`
- `analysis/_dataframe/extract.py`
- `analysis/_dataframe/messages/__init__.py`
- `analysis/_dataframe/messages/columns.py`
- `analysis/_dataframe/messages/extract.py`
- `analysis/_dataframe/messages/table.py`
- `analysis/_dataframe/progress.py`
- `analysis/_dataframe/record.py`
- `analysis/_dataframe/samples/__init__.py`
- `analysis/_dataframe/samples/columns.py`
- `analysis/_dataframe/samples/extract.py`
- `analysis/_dataframe/samples/table.py`
- `analysis/_dataframe/util.py`
- `analysis/_dataframe/validate.py`
- `analysis/_prepare/__init__.py`
- `analysis/_prepare/frontier.py`
- `analysis/_prepare/log_viewer.py`
- `analysis/_prepare/model_info.py`
- `analysis/_prepare/operation.py`
- `analysis/_prepare/prepare.py`
- `analysis/_prepare/score_to_float.py`
- `analysis/_prepare/task_info.py`
- `analysis/beta/__init__.py`

## `analysis/__init__.py`

```python
from inspect_ai._util.deprecation import relocated_module_attribute
from inspect_ai.model._model_data.model_data import ModelInfo

from ._dataframe.columns import (
    Column,
    ColumnError,
    ColumnType,
)
from ._dataframe.evals.columns import (
    EvalColumn,
    EvalColumns,
    EvalConfiguration,
    EvalDataset,
    EvalInfo,
    EvalModel,
    EvalResults,
    EvalScores,
    EvalTask,
)
from ._dataframe.evals.table import evals_df
from ._dataframe.events.columns import (
    EventColumn,
    EventInfo,
    EventTiming,
    ModelEventColumns,
    ToolEventColumns,
)
from ._dataframe.events.table import events_df
from ._dataframe.messages.columns import (
    MessageColumn,
    MessageColumns,
    MessageContent,
    MessageToolCalls,
)
from ._dataframe.messages.table import MessageFilter, messages_df
from ._dataframe.samples.columns import (
    SampleColumn,
    SampleMessages,
    SampleScores,
    SampleSummary,
)
from ._dataframe.samples.table import samples_df
from ._prepare.frontier import frontier
from ._prepare.log_viewer import log_viewer
from ._prepare.model_info import model_info
from ._prepare.operation import Operation
from ._prepare.prepare import prepare
from ._prepare.score_to_float import score_to_float
from ._prepare.task_info import task_info

__all__ = [
    "evals_df",
    "EvalColumn",
    "EvalColumns",
    "EvalInfo",
    "EvalTask",
    "EvalModel",
    "EvalColumns",
    "EvalConfiguration",
    "EvalDataset",
    "EvalResults",
    "EvalScores",
    "samples_df",
    "SampleColumn",
    "SampleSummary",
    "SampleScores",
    "SampleMessages",
    "messages_df",
    "MessageColumn",
    "MessageContent",
    "MessageToolCalls",
    "MessageColumns",
    "MessageFilter",
    "events_df",
    "EventColumn",
    "EventInfo",
    "EventTiming",
    "ModelEventColumns",
    "ToolEventColumns",
    "Column",
    "ColumnType",
    "ColumnError",
    "prepare",
    "log_viewer",
    "Operation",
    "model_info",
    "score_to_float",
    "task_info",
    "ModelInfo",
    "frontier",
]

_MODEL_INFO_VERSION_3_158 = "0.3.158"
_REMOVED_IN = "0.4"

relocated_module_attribute(
    "ModelInfo",
    "inspect_ai.model.ModelInfo",
    _MODEL_INFO_VERSION_3_158,
    _REMOVED_IN,
)
```

## `analysis/_dataframe/__init__.py`

```python

```

## `analysis/_dataframe/columns.py`

```python
import abc
from dataclasses import KW_ONLY, dataclass
from datetime import date, datetime, time
from typing import Any, Callable, Mapping, Type, TypeAlias

from jsonpath_ng import JSONPath  # type: ignore
from jsonpath_ng.ext import parse  # type: ignore
from pydantic import JsonValue

from inspect_ai.log._log import EvalLog

from .validate import jsonpath_in_schema

ColumnType: TypeAlias = int | float | bool | str | date | time | datetime | None
"""Valid types for columns.

Values of `list` and `dict` are converted into column values as JSON `str`.
"""


class Column(abc.ABC):
    """
    Specification for importing a column into a dataframe.

    Extract columns from an `EvalLog` path either using [JSONPath](https://github.com/h2non/jsonpath-ng) expressions
    or a function that takes `EvalLog` and returns a value.

    By default, columns are not required, pass `required=True` to make them required. Non-required
    columns are extracted as `None`, provide a `default` to yield an alternate value.

    The `type` option serves as both a validation check and a directive to attempt to coerce the
    data into the specified `type`. Coercion from `str` to other types is done after interpreting
    the string using YAML (e.g. `"true"` -> `True`).

    The `value` function provides an additional hook for transformation of the value read
    from the log before it is realized as a column (e.g. list to a comma-separated string).

    The `root` option indicates which root eval log context the columns select from.
    """

    def __init__(
        self,
        name: str,
        *,
        path: str | JSONPath | None,
        required: bool = False,
        default: JsonValue | None = None,
        type: Type[ColumnType] | None = None,
        value: Callable[[JsonValue], JsonValue] | None = None,
    ) -> None:
        self._name = name
        self._path: str | JSONPath | None = path
        self._required = required
        self._default = default
        self._type = type
        self._value = value
        self._validated: bool | None = None

    @property
    def name(self) -> str:
        """Column name."""
        return self._name

    @property
    def path(self) -> JSONPath | None:
        """Path to column in `EvalLog`"""
        if isinstance(self._path, str):
            self._path = parse(self._path)
        return self._path

    @property
    def required(self) -> bool:
        """Is the column required? (error is raised if required columns aren't found)."""
        return self._required

    @property
    def default(self) -> JsonValue | None:
        """Default value for column when it is read from the log as `None`."""
        return self._default

    @property
    def type(self) -> Type[ColumnType] | None:
        """Column type (import will attempt to coerce to the specified type)."""
        return self._type

    def value(self, x: JsonValue) -> JsonValue:
        """Convert extracted value into a column value (defaults to identity function).

        Params:
            x: Value to convert.

        Returns:
            Converted value.
        """
        if self._value:
            return self._value(x)
        else:
            return x

    def validate_path(self) -> bool:
        if self.path is not None:
            if self._validated is None:
                schema = self.path_schema()
                self._validated = (
                    jsonpath_in_schema(self.path, schema) if schema else True
                )
            return self._validated
        else:
            return True

    @abc.abstractmethod
    def path_schema(self) -> Mapping[str, Any] | None: ...


@dataclass
class ColumnError:
    """Error which occurred parsing a column."""

    column: str
    """Target column name."""

    _: KW_ONLY

    path: str | None
    """Path to select column value. """

    error: Exception
    """Underlying error."""

    log: EvalLog
    """Eval log where the error occurred.

    Use log.location to determine the path where the log was read from.
    """

    def __str__(self) -> str:
        msg = f"Error reading column '{self.column}'"
        if self.path:
            msg = f"{msg} from path '{self.path}'"
        return f"{msg}: {self.error} (log: {self.log.location})"
```

## `analysis/_dataframe/evals/__init__.py`

```python

```

## `analysis/_dataframe/evals/columns.py`

```python
from datetime import datetime
from typing import Any, Callable, Mapping, Type

from jsonpath_ng import JSONPath  # type: ignore
from pydantic import JsonValue
from typing_extensions import override

from inspect_ai.log._log import EvalLog

from ..columns import Column, ColumnType
from ..extract import list_as_str, remove_namespace
from ..validate import resolved_schema
from .extract import (
    eval_log_headline_stderr,
    eval_log_location,
    eval_log_scores_dict,
    eval_log_task_display_name,
)


class EvalColumn(Column):
    """Column which maps to `EvalLog`."""

    def __init__(
        self,
        name: str,
        *,
        path: str | JSONPath | Callable[[EvalLog], JsonValue],
        required: bool = False,
        default: JsonValue | None = None,
        type: Type[ColumnType] | None = None,
        value: Callable[[JsonValue], JsonValue] | None = None,
    ) -> None:
        super().__init__(
            name=name,
            path=path if not callable(path) else None,
            required=required,
            default=default,
            type=type,
            value=value,
        )
        self._extract_eval = path if callable(path) else None

    @override
    def path_schema(self) -> Mapping[str, Any]:
        return self.schema

    schema = resolved_schema(EvalLog)


EvalId: list[Column] = [
    EvalColumn("eval_id", path="eval.eval_id", required=True),
]
"""Eval id column."""

EvalLogPath: list[Column] = [
    EvalColumn("log", path=eval_log_location, required=True),
]
"""Eval log column."""

EvalInfo: list[Column] = [
    EvalColumn("eval_set_id", path="eval.eval_set_id"),
    EvalColumn("run_id", path="eval.run_id", required=True),
    EvalColumn("task_id", path="eval.task_id", required=True),
    *EvalLogPath,
    EvalColumn("created", path="eval.created", type=datetime, required=True),
    EvalColumn("tags", path="tags", default="", value=list_as_str),
    EvalColumn("git_origin", path="eval.revision.origin"),
    EvalColumn("git_commit", path="eval.revision.commit"),
    EvalColumn("packages", path="eval.packages"),
    EvalColumn("metadata", path="metadata"),
]
"""Eval basic information columns."""

EvalTask: list[Column] = [
    EvalColumn("task_name", path="eval.task", required=True, value=remove_namespace),
    EvalColumn("task_display_name", path=eval_log_task_display_name),
    EvalColumn("task_version", path="eval.task_version", required=True),
    EvalColumn("task_file", path="eval.task_file"),
    EvalColumn("task_attribs", path="eval.task_attribs"),
    EvalColumn("task_arg_*", path="eval.task_args"),
    EvalColumn("solver", path="eval.solver"),
    EvalColumn("solver_args", path="eval.solver_args"),
    EvalColumn("sandbox_type", path="eval.sandbox.type"),
    EvalColumn("sandbox_config", path="eval.sandbox.config"),
]
"""Eval task configuration columns."""

EvalModel: list[Column] = [
    EvalColumn("model", path="eval.model", required=True),
    EvalColumn("model_base_url", path="eval.model_base_url"),
    EvalColumn("model_args", path="eval.model_base_url"),
    EvalColumn("model_generate_config", path="eval.model_generate_config"),
    EvalColumn("model_roles", path="eval.model_roles"),
]
"""Eval model columns."""

EvalDataset: list[Column] = [
    EvalColumn("dataset_name", path="eval.dataset.name"),
    EvalColumn("dataset_location", path="eval.dataset.location"),
    EvalColumn("dataset_samples", path="eval.dataset.samples"),
    EvalColumn("dataset_sample_ids", path="eval.dataset.sample_ids"),
    EvalColumn("dataset_shuffled", path="eval.dataset.shuffled"),
]
"""Eval dataset columns."""

EvalConfiguration: list[Column] = [
    EvalColumn("epochs", path="eval.config.epochs"),
    EvalColumn("epochs_reducer", path="eval.config.epochs_reducer"),
    EvalColumn("approval", path="eval.config.approval"),
    EvalColumn("message_limit", path="eval.config.message_limit"),
    EvalColumn("token_limit", path="eval.config.token_limit"),
    EvalColumn("time_limit", path="eval.config.time_limit"),
    EvalColumn("working_limit", path="eval.config.working_limit"),
]
"""Eval configuration columns."""

EvalResults: list[Column] = [
    EvalColumn("status", path="status", required=True),
    EvalColumn("error_message", path="error.message"),
    EvalColumn("error_traceback", path="error.traceback"),
    EvalColumn("total_samples", path="results.total_samples"),
    EvalColumn("completed_samples", path="results.completed_samples"),
    EvalColumn("score_headline_name", path="results.scores[0].scorer"),
    EvalColumn("score_headline_metric", path="results.scores[0].metrics.*.name"),
    EvalColumn("score_headline_value", path="results.scores[0].metrics.*.value"),
    EvalColumn("score_headline_stderr", path=eval_log_headline_stderr),
]
"""Eval results columns."""

EvalScores: list[Column] = [
    EvalColumn("score_*_*", path=eval_log_scores_dict),
]
"""Eval scores (one score/metric per-columns)."""

EvalColumns: list[Column] = (
    EvalInfo
    + EvalTask
    + EvalModel
    + EvalDataset
    + EvalConfiguration
    + EvalResults
    + EvalScores
)
"""Default columns to import for `evals_df()`."""
```

## `analysis/_dataframe/evals/extract.py`

```python
from typing import cast

from inspect_ai._util.path import native_path
from inspect_ai.log._log import EvalLog

from ..extract import remove_namespace


def eval_log_location(log: EvalLog) -> str:
    return native_path(log.location)


def eval_log_task_display_name(log: EvalLog) -> str:
    if log.eval.task_display_name is not None:
        return log.eval.task_display_name
    else:
        return cast(str, remove_namespace(log.eval.task))


def eval_log_scores_dict(
    log: EvalLog,
) -> list[dict[str, dict[str, int | float]]] | None:
    if log.results is not None:
        metrics = [
            {
                score.name: {
                    metric.name: metric.value for metric in score.metrics.values()
                }
            }
            for score in log.results.scores
        ]
        return metrics
    else:
        return None


def eval_log_headline_stderr(log: EvalLog) -> float | None:
    if log.results is not None and len(log.results.scores) > 0:
        headline_score = log.results.scores[0]
        if "stderr" in headline_score.metrics:
            return headline_score.metrics["stderr"].value

    return None
```

## `analysis/_dataframe/evals/table.py`

```python
from __future__ import annotations

from functools import partial
from logging import getLogger
from typing import TYPE_CHECKING, Callable, Literal, Sequence, overload

from inspect_ai._util._async import run_coroutine, tg_collect
from inspect_ai._util.platform import running_in_notebook
from inspect_ai.analysis._dataframe.progress import import_progress, no_progress
from inspect_ai.log._file import read_eval_log_async
from inspect_ai.log._log import EvalLog

from ..columns import Column, ColumnError, ColumnType
from ..record import import_record, resolve_duplicate_columns
from ..util import (
    LogPaths,
    add_unreferenced_columns,
    records_to_pandas,
    resolve_columns,
    resolve_logs,
    verify_prerequisites,
)
from .columns import EvalColumns, EvalId, EvalLogPath

logger = getLogger(__name__)

if TYPE_CHECKING:
    import pandas as pd

EVAL_ID = "eval_id"
EVAL_LOG_PATH = "log"
EVAL_SUFFIX = "_eval"


@overload
def evals_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = EvalColumns,
    strict: Literal[True] = True,
    quiet: bool | None = None,
) -> "pd.DataFrame": ...


@overload
def evals_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = EvalColumns,
    strict: Literal[False] = False,
    quiet: bool | None = None,
) -> tuple["pd.DataFrame", Sequence[ColumnError]]: ...


def evals_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = EvalColumns,
    strict: bool = True,
    quiet: bool | None = None,
) -> "pd.DataFrame" | tuple["pd.DataFrame", Sequence[ColumnError]]:
    """Read a dataframe containing evals.

    Args:
       logs: One or more paths to log files, log directories, or EvalLog objects.
          Defaults to the contents of the currently active log directory
          (e.g. ./logs or INSPECT_LOG_DIR).
       columns: Specification for what columns to read from log files.
       strict: Raise import errors immediately. Defaults to `True`.
          If `False` then a tuple of `DataFrame` and errors is returned.
       quiet: If `True`, do not show any output or progress. Defaults to `False`
          for terminal environments, and `True` for notebooks.

    Returns:
       For `strict`, a Pandas `DataFrame` with information for the specified logs.
       For `strict=False`, a tuple of Pandas `DataFrame` and a dictionary of errors
       encountered (by log file) during import.
    """
    verify_prerequisites()

    # resolve logs
    logs = resolve_logs(logs)

    # establish progress
    quiet = quiet if quiet is not None else running_in_notebook()
    progress_cm = (
        import_progress("reading logs", total=len(logs)) if not quiet else no_progress()
    )

    with progress_cm as p:
        if strict:
            evals_table, _, _ = _read_evals_df(logs, columns, True, p.update)
            return evals_table
        else:
            evals_table, _, all_errors, _ = _read_evals_df(
                logs, columns, False, p.update
            )
            return evals_table, all_errors


@overload
def _read_evals_df(
    logs: Sequence[str] | Sequence[EvalLog],
    columns: Sequence[Column],
    strict: Literal[True],
    progress: Callable[[], None],
) -> tuple["pd.DataFrame", Sequence[EvalLog], int]: ...


@overload
def _read_evals_df(
    logs: Sequence[str] | Sequence[EvalLog],
    columns: Sequence[Column],
    strict: Literal[False],
    progress: Callable[[], None],
) -> tuple["pd.DataFrame", Sequence[EvalLog], Sequence[ColumnError], int]: ...


def _read_evals_df(
    logs: Sequence[str] | Sequence[EvalLog],
    columns: Sequence[Column],
    strict: bool,
    progress: Callable[[], None],
) -> (
    tuple["pd.DataFrame", Sequence[EvalLog], int]
    | tuple["pd.DataFrame", Sequence[EvalLog], Sequence[ColumnError], int]
):
    verify_prerequisites()

    # resolve duplicate columns
    columns = resolve_duplicate_columns(columns)

    # accumulate errors for strict=False
    all_errors: list[ColumnError] = []

    # ensure eval_id
    columns = ensure_eval_data(columns)

    # read logs
    total_samples = 0
    eval_ids: set[str] = set()
    eval_logs: list[EvalLog] = []
    records: list[dict[str, ColumnType]] = []

    async def read_eval_df(item: str | EvalLog) -> EvalLog:
        log = (
            await read_eval_log_async(item, header_only=True)
            if isinstance(item, str)
            else item
        )
        progress()
        return log

    logs = run_coroutine(tg_collect([partial(read_eval_df, item) for item in logs]))

    for log in logs:
        if strict:
            record = import_record(log, log, columns, strict=True)
        else:
            record, errors = import_record(log, log, columns, strict=False)
            all_errors.extend(errors)

        # don't add duplicate ids
        eval_id = str(record.get(EVAL_ID, ""))
        if eval_id not in eval_ids:
            eval_ids.add(eval_id)
            eval_logs.append(log)
            records.append(record)
            total_samples += (
                len(log.eval.dataset.sample_ids)
                if log.eval.dataset.sample_ids is not None
                else (log.eval.dataset.samples or 100)
            )

    # return table (+errors if strict=False)
    evals_table = records_to_pandas(records)
    evals_table = reorder_evals_df_columns(evals_table, columns)

    if strict:
        return evals_table, eval_logs, total_samples
    else:
        return evals_table, eval_logs, all_errors, total_samples


def ensure_eval_data(columns: Sequence[Column]) -> Sequence[Column]:
    result = list(columns)

    # Add EvalId if not present
    if not any(column.name == EVAL_ID for column in columns):
        result.extend(EvalId)

    # Add EvalLogPath if 'log' not present
    if not any(column.name == EVAL_LOG_PATH for column in result):
        result.extend(EvalLogPath)

    return result


def reorder_evals_df_columns(
    df: "pd.DataFrame", eval_columns: Sequence[Column]
) -> "pd.DataFrame":
    actual_columns = list(df.columns)
    ordered_columns: list[str] = []

    # eval_id first
    if EVAL_ID in actual_columns:
        ordered_columns.append(EVAL_ID)

    # eval columns
    for col in eval_columns:
        col_pattern = col.name
        if col_pattern == EVAL_ID:
            continue  # Already handled

        ordered_columns.extend(
            resolve_columns(col_pattern, EVAL_SUFFIX, actual_columns, ordered_columns)
        )

    # add any unreferenced columns
    ordered_columns = add_unreferenced_columns(actual_columns, ordered_columns)

    # reorder the DataFrame
    return df[ordered_columns]
```

## `analysis/_dataframe/events/__init__.py`

```python

```

## `analysis/_dataframe/events/columns.py`

```python
from datetime import datetime
from typing import Any, Callable, Mapping, Type

from jsonpath_ng import JSONPath  # type: ignore
from pydantic import JsonValue
from typing_extensions import override

from inspect_ai.event._event import Event

from ..columns import Column, ColumnType
from .extract import (
    completion_as_str,
    model_event_input_as_str,
    tool_choice_as_str,
    tool_view_as_str,
)


class EventColumn(Column):
    """Column which maps to `Event`."""

    def __init__(
        self,
        name: str,
        *,
        path: str | JSONPath | Callable[[Event], JsonValue],
        required: bool = False,
        default: JsonValue | None = None,
        type: Type[ColumnType] | None = None,
        value: Callable[[JsonValue], JsonValue] | None = None,
    ) -> None:
        super().__init__(
            name=name,
            path=path if not callable(path) else None,
            required=required,
            default=default,
            type=type,
            value=value,
        )
        self._extract_event = path if callable(path) else None

    @override
    def path_schema(self) -> Mapping[str, Any] | None:
        return None


EventInfo: list[Column] = [
    EventColumn("event_id", path="uuid"),
    EventColumn("event", path="event"),
    EventColumn("span_id", path="span_id"),
]
"""Event basic information columns."""

EventTiming: list[Column] = [
    EventColumn("timestamp", path="timestamp", type=datetime),
    EventColumn("completed", path="completed", type=datetime),
    EventColumn("working_start", path="working_start"),
    EventColumn("working_time", path="working_time"),
]
"""Event timing columns."""

ModelEventColumns: list[Column] = [
    EventColumn("model_event_model", path="model"),
    EventColumn("model_event_role", path="role"),
    EventColumn("model_event_input", path=model_event_input_as_str),
    EventColumn("model_event_tools", path="tools"),
    EventColumn("model_event_tool_choice", path=tool_choice_as_str),
    EventColumn("model_event_config", path="config"),
    EventColumn("model_event_usage", path="output.usage"),
    EventColumn("model_event_time", path="output.time"),
    EventColumn("model_event_completion", path=completion_as_str),
    EventColumn("model_event_retries", path="retries"),
    EventColumn("model_event_error", path="error"),
    EventColumn("model_event_cache", path="cache"),
    EventColumn("model_event_call", path="call"),
]
"""Model event columns."""

ToolEventColumns: list[Column] = [
    EventColumn("tool_event_function", path="function"),
    EventColumn("tool_event_arguments", path="arguments"),
    EventColumn("tool_event_view", path=tool_view_as_str),
    EventColumn("tool_event_result", path="result"),
    EventColumn("tool_event_truncated", path="truncated"),
    EventColumn("tool_event_error_type", path="error.type"),
    EventColumn("tool_event_error_message", path="error.message"),
]
"""Tool event columns."""
```

## `analysis/_dataframe/events/extract.py`

```python
from inspect_ai.event._model import ModelEvent
from inspect_ai.event._tool import ToolEvent
from inspect_ai.tool._tool_call import substitute_tool_call_content

from ..extract import messages_as_str


def model_event_input_as_str(event: ModelEvent) -> str:
    return messages_as_str(event.input)


def tool_choice_as_str(event: ModelEvent) -> str:
    if isinstance(event.tool_choice, str):
        return event.tool_choice
    else:
        return event.tool_choice.name


def completion_as_str(event: ModelEvent) -> str:
    return event.output.completion


def tool_view_as_str(event: ToolEvent) -> str | None:
    if event.view is not None:
        view = substitute_tool_call_content(event.view, event.arguments)
        title = f"{view.title}\n\n" if view.title is not None else ""
        return f"{title}{view.content}"
    else:
        return None
```

## `analysis/_dataframe/events/table.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Callable, Literal, Sequence, TypeAlias

from inspect_ai._util.platform import running_in_notebook
from inspect_ai.analysis._dataframe.events.columns import EventInfo
from inspect_ai.event._event import Event

if TYPE_CHECKING:
    import pandas as pd

from typing_extensions import overload

from inspect_ai.log._log import EvalLog

from ..columns import Column, ColumnError
from ..samples.table import EventsDetail, _read_samples_df
from ..util import LogPaths, resolve_logs, verify_prerequisites

EventFilter: TypeAlias = Callable[[Event], bool]
"""Filter for `events_df()` rows."""


@overload
def events_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = EventInfo,
    filter: EventFilter | None = None,
    strict: Literal[True] = True,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> "pd.DataFrame": ...


@overload
def events_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = EventInfo,
    filter: EventFilter | None = None,
    strict: Literal[False] = False,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> tuple["pd.DataFrame", list[ColumnError]]: ...


def events_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = EventInfo,
    filter: EventFilter | None = None,
    strict: bool = True,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> "pd.DataFrame" | tuple["pd.DataFrame", list[ColumnError]]:
    """Read a dataframe containing events from a set of evals.

    Args:
       logs: One or more paths to log files, log directories, or EvalLog objects.
          Defaults to the contents of the currently active log directory
          (e.g. ./logs or INSPECT_LOG_DIR).
       columns: Specification for what columns to read from log files.
       filter: Callable that filters event types.
       strict: Raise import errors immediately. Defaults to `True`.
          If `False` then a tuple of `DataFrame` and errors is returned.
       parallel: If `True`, use `ProcessPoolExecutor` to read logs in parallel
          (with workers based on `mp.cpu_count()`, capped at 8). If `int`, read
          in parallel with the specified number of workers. If `False` (the default)
          do not read in parallel.
       quiet: If `True`, do not show any output or progress. Defaults to `False`
          for terminal environments, and `True` for notebooks.

    Returns:
       For `strict`, a Pandas `DataFrame` with information for the specified logs.
       For `strict=False`, a tuple of Pandas `DataFrame` and a dictionary of errors
       encountered (by log file) during import.
    """
    verify_prerequisites()

    # resolve filter/detail
    detail = EventsDetail(filter=filter) if callable(filter) else EventsDetail()
    quiet = quiet if quiet is not None else running_in_notebook()
    logs = resolve_logs(logs)

    return _read_samples_df(
        logs,
        columns,
        strict=strict,
        detail=detail,
        progress=not quiet,
        parallel=parallel,
    )
```

## `analysis/_dataframe/extract.py`

```python
import hashlib
import uuid
from typing import Any, cast

import shortuuid
from pydantic import BaseModel, JsonValue

from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageAssistant,
    ChatMessageTool,
    ChatMessageUser,
)


def model_to_record(model: BaseModel) -> dict[str, JsonValue]:
    return cast(dict[str, JsonValue], model.model_dump(mode="json", exclude_none=True))


def list_as_str(x: JsonValue) -> str:
    return ",".join([str(e) for e in (x if isinstance(x, list) else [x])])


def remove_namespace(x: JsonValue) -> JsonValue:
    if isinstance(x, str):
        parts = x.split("/", maxsplit=1)
        if len(parts) == 1:
            return parts[0]
        else:
            return parts[1]
    else:
        return x


def score_values(x: JsonValue) -> dict[str, JsonValue]:
    scores = cast(dict[str, Any], x)
    return {k: v["value"] for k, v in scores.items()}


def score_value(x: JsonValue) -> JsonValue:
    scores = cast(dict[str, Any], x)
    return next(iter(scores.values()), None)


def score_details(x: JsonValue) -> dict[str, JsonValue]:
    if not isinstance(x, dict):
        return {}

    details: dict[str, JsonValue] = {}
    for key, value in x.items():
        if not isinstance(value, dict):
            continue

        details[key] = value.get("value")
        for extra_field in ("answer", "explanation", "metadata"):
            extra_value = value.get(extra_field)
            if extra_value:
                details[f"{key}_{extra_field}"] = extra_value

    return details


def auto_id(base: str, index: str) -> str:
    seed = f"{base}_{index}"
    hash_bytes = hashlib.md5(seed.encode("utf-8")).digest()
    long_uuid = uuid.UUID(bytes=hash_bytes)
    return shortuuid.encode(long_uuid)


def messages_as_str(messages: str | list[ChatMessage]) -> str:
    if isinstance(messages, str):
        messages = [ChatMessageUser(content=messages)]
    return "\n\n".join([message_as_str(message) for message in messages])


def message_as_str(message: ChatMessage) -> str:
    transcript: list[str] = []
    role = message.role
    content = message.text.strip() if message.text else ""

    # assistant messages with tool calls
    if isinstance(message, ChatMessageAssistant) and message.tool_calls is not None:
        entry = f"{role}:\n{content}\n"

        for tool in message.tool_calls:
            func_name = tool.function
            args = tool.arguments

            if isinstance(args, dict):
                args_text = "\n".join(f"{k}: {v}" for k, v in args.items())
                entry += f"\nTool Call: {func_name}\nArguments:\n{args_text}"
            else:
                entry += f"\nTool Call: {func_name}\nArguments: {args}"

        transcript.append(entry)

    # tool responses with errors
    elif isinstance(message, ChatMessageTool) and message.error is not None:
        func_name = message.function or "unknown"
        entry = f"{role}:\n{content}\n\nError in tool call '{func_name}':\n{message.error.message}\n"
        transcript.append(entry)

    # normal messages
    else:
        transcript.append(f"{role}:\n{content}\n")

    return "\n".join(transcript)
```

## `analysis/_dataframe/messages/__init__.py`

```python

```

## `analysis/_dataframe/messages/columns.py`

```python
from typing import Any, Callable, Mapping, Type

from jsonpath_ng import JSONPath  # type: ignore
from pydantic import JsonValue
from typing_extensions import override

from inspect_ai.model._chat_message import ChatMessage

from ..columns import Column, ColumnType
from .extract import (
    message_text,
    message_tool_calls,
)


class MessageColumn(Column):
    """Column which maps to `ChatMessage`."""

    def __init__(
        self,
        name: str,
        *,
        path: str | JSONPath | Callable[[ChatMessage], JsonValue],
        required: bool = False,
        default: JsonValue | None = None,
        type: Type[ColumnType] | None = None,
        value: Callable[[JsonValue], JsonValue] | None = None,
    ) -> None:
        super().__init__(
            name=name,
            path=path if not callable(path) else None,
            required=required,
            default=default,
            type=type,
            value=value,
        )
        self._extract_message = path if callable(path) else None

    @override
    def path_schema(self) -> Mapping[str, Any] | None:
        return None


MessageContent: list[Column] = [
    MessageColumn("message_id", path="id"),
    MessageColumn("role", path="role", required=True),
    MessageColumn("source", path="source"),
    MessageColumn("content", path=message_text),
]
"""Message content columns."""

MessageToolCalls: list[Column] = [
    MessageColumn("tool_calls", path=message_tool_calls),
    MessageColumn("tool_call_id", path="tool_call_id"),
    MessageColumn("tool_call_function", path="function"),
    MessageColumn("tool_call_error", path="error.message"),
]
"""Message tool call columns."""

MessageColumns: list[Column] = MessageContent + MessageToolCalls
"""Chat message columns."""
```

## `analysis/_dataframe/messages/extract.py`

```python
from inspect_ai._util.format import format_function_call
from inspect_ai.model._chat_message import ChatMessage, ChatMessageAssistant


def message_text(message: ChatMessage) -> str:
    return message.text


def message_tool_calls(message: ChatMessage) -> str | None:
    if isinstance(message, ChatMessageAssistant) and message.tool_calls is not None:
        tool_calls = "\n".join(
            [
                format_function_call(
                    tool_call.function, tool_call.arguments, width=1000
                )
                for tool_call in message.tool_calls
            ]
        )
        return tool_calls
    else:
        return None
```

## `analysis/_dataframe/messages/table.py`

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Callable, Literal, Sequence, TypeAlias

from inspect_ai._util.platform import running_in_notebook
from inspect_ai.model._chat_message import ChatMessage

if TYPE_CHECKING:
    import pandas as pd

from typing_extensions import overload

from inspect_ai.log._log import EvalLog

from ..columns import Column, ColumnError
from ..samples.table import MessagesDetail, _read_samples_df
from ..util import LogPaths, resolve_logs, verify_prerequisites
from .columns import MessageColumns

MessageFilter: TypeAlias = Callable[[ChatMessage], bool]
"""Filter for `messages_df()` rows."""


@overload
def messages_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = MessageColumns,
    filter: MessageFilter | None = None,
    strict: Literal[True] = True,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> "pd.DataFrame": ...


@overload
def messages_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = MessageColumns,
    filter: MessageFilter | None = None,
    strict: Literal[False] = False,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> tuple["pd.DataFrame", list[ColumnError]]: ...


def messages_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = MessageColumns,
    filter: MessageFilter | None = None,
    strict: bool = True,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> "pd.DataFrame" | tuple["pd.DataFrame", list[ColumnError]]:
    """Read a dataframe containing messages from a set of evals.

    Args:
       logs: One or more paths to log files, log directories, or EvalLog objects.
          Defaults to the contents of the currently active log directory
          (e.g. ./logs or INSPECT_LOG_DIR).
       columns: Specification for what columns to read from log files.
       filter: Callable that filters messages
       strict: Raise import errors immediately. Defaults to `True`.
          If `False` then a tuple of `DataFrame` and errors is returned.
       parallel: If `True`, use `ProcessPoolExecutor` to read logs in parallel
          (with workers based on `mp.cpu_count()`, capped at 8). If `int`, read
          in parallel with the specified number of workers. If `False` (the default)
          do not read in parallel.
       quiet: If `True`, do not show any output or progress. Defaults to `False`
          for terminal environments, and `True` for notebooks.

    Returns:
       For `strict`, a Pandas `DataFrame` with information for the specified logs.
       For `strict=False`, a tuple of Pandas `DataFrame` and a dictionary of errors
       encountered (by log file) during import.
    """
    verify_prerequisites()

    # resolve filter/detail
    detail = MessagesDetail(filter=filter) if callable(filter) else MessagesDetail()
    quiet = quiet if quiet is not None else running_in_notebook()
    logs = resolve_logs(logs)

    return _read_samples_df(
        logs,
        columns,
        strict=strict,
        detail=detail,
        parallel=parallel,
        progress=not quiet,
    )
```

## `analysis/_dataframe/progress.py`

```python
from contextlib import contextmanager
from typing import Iterator, Protocol

from rich.progress import (
    BarColumn,
    Progress,
    TaskID,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
)


class ImportProgress(Protocol):
    def update(self) -> None: ...
    def reset(self, description: str, completed: int, total: int) -> None: ...


class NoProgress(ImportProgress):
    def update(self) -> None:
        pass

    def reset(self, description: str, completed: int, total: int) -> None:
        pass


class RichImportProgress(ImportProgress):
    def __init__(self, progress: Progress, task_id: TaskID) -> None:
        self._progress = progress
        self._task_id = task_id

    def update(self) -> None:
        self._progress.update(self._task_id, advance=1)

    def reset(self, description: str, completed: int, total: int) -> None:
        self._progress.reset(
            self._task_id, description=description, completed=completed, total=total
        )


@contextmanager
def no_progress() -> Iterator[ImportProgress]:
    yield NoProgress()


@contextmanager
def import_progress(description: str, total: float | None) -> Iterator[ImportProgress]:
    with Progress(
        TextColumn("[progress.description]{task.description:<18}"),
        BarColumn(),
        TaskProgressColumn(),
        TimeElapsedColumn(),
        transient=True,
    ) as progress:
        task_id = progress.add_task(description, total=total)
        yield RichImportProgress(progress, task_id)
```

## `analysis/_dataframe/record.py`

```python
import json
from datetime import date, datetime, time, timezone
from typing import Any, Literal, Sequence, Type, cast, overload

import yaml
from jsonpath_ng import JSONPath  # type: ignore
from pydantic import JsonValue

from inspect_ai._util.dateutil import datetime_from_iso_format_safe
from inspect_ai.analysis._dataframe.events.columns import EventColumn
from inspect_ai.analysis._dataframe.messages.columns import MessageColumn
from inspect_ai.analysis._dataframe.samples.columns import SampleColumn
from inspect_ai.event._base import BaseEvent
from inspect_ai.event._event import Event
from inspect_ai.log._log import EvalLog, EvalSample, EvalSampleSummary
from inspect_ai.model._chat_message import ChatMessage, ChatMessageBase

from .columns import Column, ColumnError, ColumnType
from .evals.columns import EvalColumn
from .extract import model_to_record


@overload
def import_record(
    log: EvalLog,
    record: (
        EvalLog
        | EvalSampleSummary
        | EvalSample
        | ChatMessage
        | Event
        | dict[str, JsonValue]
    ),
    columns: Sequence[Column],
    strict: Literal[True] = True,
) -> dict[str, ColumnType]: ...


@overload
def import_record(
    log: EvalLog,
    record: (
        EvalLog
        | EvalSampleSummary
        | EvalSample
        | ChatMessage
        | Event
        | dict[str, JsonValue]
    ),
    columns: Sequence[Column],
    strict: Literal[False],
) -> tuple[dict[str, ColumnType], list[ColumnError]]: ...


def import_record(
    log: EvalLog,
    record: (
        EvalLog
        | EvalSampleSummary
        | EvalSample
        | ChatMessage
        | Event
        | dict[str, JsonValue]
    ),
    columns: Sequence[Column],
    strict: bool = True,
) -> dict[str, ColumnType] | tuple[dict[str, ColumnType], list[ColumnError]]:
    # resolve the record BaseModel into a dict (and optionally a summary dict).
    # summary dict will be required in the case that record is for samples.
    # we also want to save the original BaseModel (if any) for playing back
    # to columns that yield their value using a callable.
    record_target = record
    record_summary: dict[str, JsonValue] | None = None
    if isinstance(record, EvalSample):
        record_summary = model_to_record(record.summary())
        record = model_to_record(record)
    elif isinstance(record, EvalSampleSummary):
        record_summary = model_to_record(record)
        record = record_summary
    elif isinstance(record, EvalLog | ChatMessageBase | BaseEvent):
        record = model_to_record(record)
    else:
        record = record

    # return values
    result: dict[str, ColumnType] = {}
    errors: list[ColumnError] = []

    # helper to record a field w/ optional type checking/coercion
    def set_result(name: str, column: Column, value: JsonValue) -> None:
        try:
            result[name] = _resolve_value(value, column.type)
        except ValueError as ex:
            error = ColumnError(name, path=column.path, error=ex, log=log)
            if strict:
                raise ValueError(str(error))
            else:
                errors.append(error)

    # helper to raise or record errror
    def field_not_found(
        name: str, path: JSONPath | None, required_type: str | None = None
    ) -> None:
        ex = ValueError(
            f"field not of type {required_type}" if required_type else "field not found"
        )
        error = ColumnError(name, path=path, error=ex, log=log)
        if strict:
            raise ValueError(str(error))
        else:
            errors.append(error)

    # process each column
    for column in columns:
        # start with none
        value: JsonValue = None

        # resolve path
        try:
            # read by path or extract function
            if column.path is not None:
                if not column.validate_path():
                    raise ValueError("Specified path is not valid")
                # sample columns may read from summary of full sample
                if isinstance(column, SampleColumn):
                    matches = column.path.find(
                        record if column._full else record_summary
                    )
                else:
                    matches = column.path.find(record)

                if matches:
                    value = matches[0].value
            # some eval columns yield their value with an extract function
            elif (
                isinstance(column, EvalColumn)
                and column._extract_eval is not None
                and isinstance(record_target, EvalLog)
            ):
                value = column._extract_eval(record_target)
            # some sample columns yield their value with an extract function
            elif (
                isinstance(column, SampleColumn)
                and column._extract_sample is not None
                and isinstance(record_target, EvalSample | EvalSampleSummary)
            ):
                value = column._extract_sample(record_target)  # type: ignore[arg-type]
            elif (
                isinstance(column, MessageColumn)
                and column._extract_message is not None
                and isinstance(record_target, ChatMessageBase)
            ):
                value = column._extract_message(record_target)
            elif (
                isinstance(column, EventColumn)
                and column._extract_event is not None
                and isinstance(record_target, BaseEvent)
            ):
                value = column._extract_event(record_target)
            else:
                raise ValueError("column must have path or extract function")

            # call value function on column if it exists
            if value is not None:
                value = column.value(value)

        except Exception as ex:
            error = ColumnError(
                column.name,
                path=str(column.path) if column.path else None,
                error=ex,
                log=log,
            )
            if strict:
                raise ValueError(str(error))
            else:
                errors.append(error)
                continue

        # provide default if None
        if value is None and column.default is not None:
            value = column.default

        # check for required
        if column.required and value is None:
            field_not_found(column.name, column.path)

        # handle wildcard vs. no wildcard
        if column.name.endswith("*"):
            values = value if isinstance(value, list) else [value]
            for value in values:
                expanded = _expand_fields(column.name, value)
                for k, v in expanded.items():
                    set_result(k, column, v)
        else:
            set_result(column.name, column, value)

    # optionally return errors if we aren't in strict mode
    if strict:
        return result
    else:
        return result, errors


def resolve_duplicate_columns(columns: Sequence[Column]) -> list[Column]:
    """Remove duplicate columns (with the later columns winning)"""
    seen = set[str]()
    deduped: list[Column] = []
    for col in reversed(columns):
        if col.name not in seen:
            deduped.append(col)
            seen.add(col.name)
    deduped.reverse()
    return deduped


def _resolve_value(
    value: JsonValue,
    type_: Type[ColumnType] | None = None,
) -> ColumnType:
    """
    Coerce *value* to *type_* (if supplied).

    Supported conversions
    ---------------------
    * Normal Python constructor coercion (`int("5")`, `str(3.14)` …)
    * Strings through YAML (handles "`true`", "`3.2`", "`2025-05-01`", …)
    * ISO-8601 strings to ``date``, ``time``, ``datetime``
    * POSIX timestamps (int/float **or** numeric string) → temporal types
    * When *value* is a ``list`` or ``dict`` **and** either
        - *type_* is ``str`` **or**
        - *type_* is ``None`` (unspecified),
      the structure is serialised with `json.dumps`
    """
    ## reflect none back
    if value is None:
        return None

    # auto-stringify compound types
    if isinstance(value, list | dict) and (type_ is None or type_ is str):
        return json.dumps(value)

    # we have now narrowed the value to not be none or a compound type
    value = cast(int | str | float | bool, value)

    # no target type or None → nothing to do
    if type_ is None:
        return value

    # already correct
    if isinstance(value, type_) and not _is_bool_int_mismatch(type_, value):
        return value

    # numeric timestamp → temporal
    if isinstance(value, int | float):
        coerced = _from_timestamp(type_, value)
        if coerced is not None:
            return coerced

    # straight constructor
    coerced = _try_constructor(type_, value)
    if coerced is not None:
        return coerced

    # 4) string handling (YAML, ISO, numeric-string timestamp, …)
    if isinstance(value, str):
        coerced = _coerce_from_str(type_, value)
        if coerced is not None:
            return coerced

    # give up
    raise ValueError(
        f"Cannot coerce {value} from type {type(value).__name__}) to {type_.__name__}"
    )


def _is_bool_int_mismatch(tp: Type[ColumnType], obj: Any) -> bool:
    """True when an *int* coercion would silently produce a *bool* (undesired)."""
    return tp is int and isinstance(obj, bool)


def _try_constructor(tp: Type[ColumnType], obj: Any) -> ColumnType:
    """Run `tp(obj)` but swallow any exception, return None on failure."""
    # Constructors of date / time / datetime require ≥3 positional ints, so don’t even try them.
    if tp in (date, time, datetime):
        return None

    # reflect None back
    if obj is None:
        return obj

    try:
        coerced = tp(obj)  # type: ignore[call-arg, misc]
    except Exception:
        return None
    return None if _is_bool_int_mismatch(tp, coerced) else coerced


def _from_timestamp(tp: Type[ColumnType], ts: int | float) -> ColumnType | None:
    """Convert POSIX timestamp to the requested temporal type, UTC zone."""
    if tp in (datetime, date, time):
        dt = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(timezone.utc)
        if tp is datetime:
            return dt
        if tp is date:
            return dt.date()
        return dt.time()
    else:
        return None


def _from_iso(tp: Type[ColumnType], iso: str) -> ColumnType | None:
    if tp in (datetime, date, time):
        dt = datetime_from_iso_format_safe(iso).astimezone(timezone.utc)
        if tp is datetime:
            return dt
        if tp is date:
            return dt.date()
        return dt.time()
    else:
        return None


def _coerce_from_str(tp: Type[ColumnType], text: str) -> ColumnType:
    """
    Best-effort coercion from *text* to *tp*:

    1. YAML parsing (catches booleans, numbers, ISO timestamps, …)
    2. `fromisoformat` when available on the target class
    3. Numeric-string → POSIX timestamp (for temporal targets)
    4. Constructor fall-back
    """
    # 1) YAML
    try:
        parsed = yaml.safe_load(text)
    except Exception:
        parsed = None

    if parsed is not None:
        # exact match?
        if isinstance(parsed, tp) and not _is_bool_int_mismatch(tp, parsed):
            if isinstance(parsed, datetime):
                parsed = parsed.astimezone(timezone.utc)
            return cast(ColumnType, parsed)
        # try constructor on the YAML result (e.g. str→float via YAML "1.5")
        coerced = _try_constructor(tp, parsed)
        if coerced is not None:
            return coerced

    # 2) fromisoformat — only on temporal types and str itself
    try:
        if (parsed := _from_iso(tp, text)) is not None:
            return parsed
    except Exception:
        pass

    # 3) numeric string timestamp?
    try:
        tstmp = float(text)
    except ValueError:
        tstmp = None
    if tstmp is not None:
        coerced = _from_timestamp(tp, tstmp)
        if coerced is not None:
            return coerced

    # 4) plain constructor last
    return _try_constructor(tp, text)


def _expand_fields(name: str, value: JsonValue) -> dict[str, JsonValue]:
    result: dict[str, JsonValue] = {}

    # Base case: no asterisks in the field name
    if "*" not in name:
        result[name] = value
        return result

    # If there's an asterisk but value isn't a dictionary, we can't expand
    if not isinstance(value, dict):
        # Handle this case - either return empty dict, skip it, or use a default name
        # For now, I'll just return an empty dict
        return result

    # Get the position of the first asterisk
    asterisk_pos = name.find("*")
    prefix = name[:asterisk_pos]
    suffix = name[asterisk_pos + 1 :]

    # recursive case: expand each key in the dictionary
    for key, val in value.items():
        new_field = prefix + key + suffix
        # recursively expand any remaining asterisks
        if "*" in suffix:
            if isinstance(val, dict):
                expanded = _expand_fields(new_field, val)
                result.update(expanded)
            # If suffix has '*' but val is not a dict, skip it
            else:
                pass
        else:
            result[new_field] = val

    return result
```

## `analysis/_dataframe/samples/__init__.py`

```python

```

## `analysis/_dataframe/samples/columns.py`

```python
from typing import Any, Callable, Mapping, Type

from jsonpath_ng import JSONPath  # type: ignore
from pydantic import JsonValue
from typing_extensions import override

from inspect_ai.log._log import EvalSample, EvalSampleSummary

from ..columns import Column, ColumnType
from ..extract import list_as_str, score_details, score_values
from ..validate import resolved_schema
from .extract import (
    sample_input_as_str,
    sample_messages_as_str,
    sample_path_requires_full,
    sample_total_tokens,
)


class SampleColumn(Column):
    """Column which maps to `EvalSample` or `EvalSampleSummary`."""

    def __init__(
        self,
        name: str,
        *,
        path: str
        | JSONPath
        | Callable[[EvalSampleSummary], JsonValue]
        | Callable[[EvalSample], JsonValue],
        required: bool = False,
        default: JsonValue | None = None,
        type: Type[ColumnType] | None = None,
        value: Callable[[JsonValue], JsonValue] | None = None,
        full: bool | None = None,
    ) -> None:
        super().__init__(
            name=name,
            path=path if not callable(path) else None,
            required=required,
            default=default,
            type=type,
            value=value,
        )
        self._extract_sample = path if callable(path) else None
        if full is None:
            self._full = sample_path_requires_full(path)
        else:
            self._full = full

    @override
    def path_schema(self) -> Mapping[str, Any]:
        if self._full:
            return self.full_schema
        else:
            return self.summary_schema

    summary_schema = resolved_schema(EvalSampleSummary)
    full_schema = resolved_schema(EvalSample)


SampleSummary: list[Column] = [
    SampleColumn("id", path="id", required=True, type=str),
    SampleColumn("epoch", path="epoch", required=True),
    SampleColumn("input", path=sample_input_as_str, required=True),
    SampleColumn("choices", path="choices", full=False),
    SampleColumn("target", path="target", required=True, value=list_as_str),
    SampleColumn("metadata_*", path="metadata"),
    SampleColumn("score_*", path="scores", value=score_values),
    SampleColumn("model_usage", path="model_usage"),
    SampleColumn("total_tokens", path=sample_total_tokens),
    SampleColumn("total_time", path="total_time"),
    SampleColumn("working_time", path="total_time"),
    SampleColumn("message_count", path="message_count", default=None),
    SampleColumn("error", path="error", default=""),
    SampleColumn("limit", path="limit"),
    SampleColumn("retries", path="retries"),
]
"""Sample summary columns."""

SampleMessages: list[Column] = [
    SampleColumn("messages", path=sample_messages_as_str, required=True, full=True)
]
"""Sample messages as a string."""

SampleScores: list[Column] = [
    SampleColumn("score_*", path="scores", value=score_values, full=True),
    SampleColumn("score_*", path="scores", value=score_details, full=True),
]
"""Score values, answer, explanation, and metadata."""
```

## `analysis/_dataframe/samples/extract.py`

```python
from typing import Callable

from jsonpath_ng import JSONPath  # type: ignore
from pydantic import JsonValue

from inspect_ai.log._log import EvalSample, EvalSampleSummary

from ..extract import auto_id, messages_as_str


def sample_input_as_str(sample: EvalSample) -> str:
    return messages_as_str(sample.input)


def sample_total_tokens(sample: EvalSampleSummary) -> int:
    total_tokens = 0
    for usage in sample.model_usage.values():
        total_tokens += usage.total_tokens
    return total_tokens


def sample_messages_as_str(sample: EvalSample) -> str:
    return messages_as_str(sample.messages)


def sample_path_requires_full(
    path: str
    | JSONPath
    | Callable[[EvalSampleSummary], JsonValue]
    | Callable[[EvalSample], JsonValue],
) -> bool:
    if callable(path):
        return False
    else:
        path = str(path)
        return any(
            [
                path.startswith(prefix)
                for prefix in [
                    "choices",
                    "sandbox",
                    "files",
                    "setup",
                    "messages",
                    "output",
                    "store",
                    "events",
                    "uuid",
                    "error_retries",
                    "attachments",
                ]
            ]
        )


def auto_sample_id(eval_id: str, sample: EvalSample | EvalSampleSummary) -> str:
    return auto_id(eval_id, f"{sample.id}_{sample.epoch}")


def auto_detail_id(sample_id: str, name: str, index: int) -> str:
    return auto_id(sample_id, f"{name}_{index}")
```

## `analysis/_dataframe/samples/table.py`

```python
from __future__ import annotations

import functools
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, as_completed
from copy import deepcopy
from dataclasses import dataclass
from functools import lru_cache, partial
from itertools import chain
from typing import (
    TYPE_CHECKING,
    Any,
    Callable,
    Iterable,
    Literal,
    Sequence,
    cast,
    overload,
)

from inspect_ai._util._async import run_coroutine, tg_collect
from inspect_ai._util.hash import mm3_hash
from inspect_ai._util.platform import running_in_notebook
from inspect_ai.analysis._dataframe.progress import import_progress, no_progress
from inspect_ai.event._event import Event
from inspect_ai.log._file import (
    read_eval_log_async,
    read_eval_log_sample_summaries_async,
)
from inspect_ai.log._log import EvalLog, EvalSample, EvalSampleSummary
from inspect_ai.model._chat_message import ChatMessage

from ..columns import Column, ColumnError, ColumnType
from ..evals.columns import EvalColumn
from ..evals.table import EVAL_ID, EVAL_SUFFIX, _read_evals_df, ensure_eval_data
from ..events.columns import EventColumn
from ..extract import message_as_str
from ..messages.columns import MessageColumn
from ..record import import_record, resolve_duplicate_columns
from ..util import (
    LogPaths,
    add_unreferenced_columns,
    records_to_pandas,
    resolve_columns,
    resolve_logs,
    verify_prerequisites,
)
from .columns import SampleColumn, SampleSummary
from .extract import auto_detail_id, auto_sample_id

if TYPE_CHECKING:
    import pandas as pd


SAMPLE_ID = "sample_id"
SAMPLE_SUFFIX = "_sample"


@overload
def samples_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = SampleSummary,
    full: bool = False,
    strict: Literal[True] = True,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> "pd.DataFrame": ...


@overload
def samples_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = SampleSummary,
    full: bool = False,
    strict: Literal[False] = False,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> tuple["pd.DataFrame", list[ColumnError]]: ...


def samples_df(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
    columns: Sequence[Column] = SampleSummary,
    full: bool = False,
    strict: bool = True,
    parallel: bool | int = False,
    quiet: bool | None = None,
) -> "pd.DataFrame" | tuple["pd.DataFrame", list[ColumnError]]:
    """Read a dataframe containing samples from a set of evals.

    Args:
       logs: One or more paths to log files, log directories, or EvalLog objects.
          Defaults to the contents of the currently active log directory
          (e.g. ./logs or INSPECT_LOG_DIR).
       columns: Specification for what columns to read from log files.
       full: Read full sample `metadata`. This will be much slower, but will include
          the unfiltered values of sample `metadata` rather than the abbreviated
          metadata from sample summaries (which includes only scalar values and limits
          string values to 1k).
       strict: Raise import errors immediately. Defaults to `True`.
          If `False` then a tuple of `DataFrame` and errors is returned.
       parallel: If `True`, use `ProcessPoolExecutor` to read logs in parallel
          (with workers based on `mp.cpu_count()`, capped at 8). If `int`, read
          in parallel with the specified number of workers. If `False` (the default)
          do not read in parallel.
       quiet: If `True`, do not show any output or progress. Defaults to `False`
          for terminal environments, and `True` for notebooks.

    Returns:
       For `strict`, a Pandas `DataFrame` with information for the specified logs.
       For `strict=False`, a tuple of Pandas `DataFrame` and a dictionary of errors
       encountered (by log file) during import.
    """
    verify_prerequisites()

    quiet = quiet if quiet is not None else running_in_notebook()
    logs = resolve_logs(logs)

    return _read_samples_df(
        logs,
        columns,
        full=full,
        strict=strict,
        progress=not quiet,
        parallel=parallel,
    )


@dataclass
class MessagesDetail:
    name: str = "message"
    col_type = MessageColumn
    filter: Callable[[ChatMessage], bool] | None = None


@dataclass
class EventsDetail:
    name: str = "event"
    col_type = EventColumn
    filter: Callable[[Event], bool] | None = None


def _read_samples_df(
    logs: list[str] | list[EvalLog],
    columns: Sequence[Column],
    *,
    full: bool = False,
    strict: bool = True,
    detail: MessagesDetail | EventsDetail | None = None,
    progress: bool = True,
    parallel: bool | int = False,
) -> "pd.DataFrame" | tuple["pd.DataFrame", list[ColumnError]]:
    import pandas as pd

    # Parallel only makes sense for path-based reads
    is_paths = len(logs) == 0 or isinstance(logs[0], str)

    if parallel and is_paths:
        # resolve number of workers (cap at 8 as eventually we run into disk/memory contention)
        if parallel is True:
            parallel = max(min(mp.cpu_count(), 8), 2)

        log_paths = cast(list[str], logs)

        # establish progress
        entity = detail.name if detail else "sample"
        progress_cm = (
            import_progress(f"reading {entity}s", total=len(log_paths))
            if progress
            else no_progress()
        )

        # run the parallel reads (setup arrays for holding results in order)
        df_results: list[pd.DataFrame | None] = [None] * len(log_paths)
        error_results: list[list[ColumnError] | None] = [None] * len(log_paths)
        executor = ProcessPoolExecutor(max_workers=parallel)
        try:
            with progress_cm as p:
                futures = {
                    executor.submit(
                        _read_samples_df_serial,  # type: ignore[arg-type]
                        logs=[log_path],
                        columns=columns,
                        full=full,
                        strict=strict,
                        detail=detail,
                        progress=False,
                    ): idx
                    for idx, log_path in enumerate(log_paths)
                }
                for fut in as_completed(futures):
                    idx = futures[fut]
                    if strict:
                        df_results[idx] = cast(pd.DataFrame, fut.result())
                    else:
                        df, errs = cast(
                            tuple[pd.DataFrame, list[ColumnError]], fut.result()
                        )
                        df_results[idx] = df
                        error_results[idx] = errs
                    p.update()
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

        # recombine df
        df = pd.concat(df_results, ignore_index=True)
        subset = f"{detail.name}_id" if detail else SAMPLE_ID
        try:
            df.drop_duplicates(subset=subset, ignore_index=True, inplace=True)
        except Exception as e:
            # Check if it's specifically the pyarrow offset overflow error
            if "offset overflow" in str(e):
                # Convert to large_string and retry
                df = _convert_to_large_string(df)
                df.drop_duplicates(subset=subset, ignore_index=True, inplace=True)
            else:
                raise

        # recombine errors
        errors: list[ColumnError] = list(
            chain.from_iterable(e for e in error_results if e)
        )

        # return as required
        if strict:
            return df
        else:
            return df, errors

    # non-parallel (or EvalLog objects which don't benefit from parallel)
    else:
        return _read_samples_df_serial(
            logs=logs,
            columns=columns,
            full=full,
            strict=strict,
            detail=detail,
            progress=progress,
        )


def _read_samples_df_serial(
    logs: list[str] | list[EvalLog],
    columns: Sequence[Column],
    *,
    full: bool = False,
    strict: bool = True,
    detail: MessagesDetail | EventsDetail | None = None,
    progress: bool = True,
) -> "pd.DataFrame" | tuple["pd.DataFrame", list[ColumnError]]:
    # split columns by type
    columns_eval: list[Column] = []
    columns_sample: list[Column] = []
    columns_detail: list[Column] = []
    for column in columns:
        if isinstance(column, EvalColumn):
            columns_eval.append(column)
        elif isinstance(column, SampleColumn):
            if full and not column._full and (column.name == "metadata_*"):
                column = deepcopy(column)
                column._full = True
            columns_sample.append(column)
            if column._full:
                require_full_samples = True
        elif detail and isinstance(column, detail.col_type):
            columns_detail.append(column)
        else:
            raise ValueError(
                f"Unexpected column type passed to samples_df: {type(column)}"
            )
    # resolve duplicates
    columns_eval = resolve_duplicate_columns(columns_eval)
    columns_sample = resolve_duplicate_columns(columns_sample)
    columns_detail = resolve_duplicate_columns(columns_detail)

    # determine if we require full samples
    require_full_samples = len(columns_detail) > 0 or any(
        [isinstance(column, SampleColumn) and column._full for column in columns_sample]
    )

    # make sure eval_id is present
    columns_eval = list(ensure_eval_data(columns_eval))

    # determine if we have paths or EvalLog objects
    is_eval_logs = len(logs) > 0 and isinstance(logs[0], EvalLog)

    # establish progress
    progress_cm = (
        import_progress("scanning logs", total=len(logs)) if progress else no_progress()
    )

    # determine how we will allocate progress
    with progress_cm as p:
        # read samples from each log
        sample_records: list[dict[str, ColumnType]] = []
        detail_records: list[dict[str, ColumnType]] = []
        all_errors: list[ColumnError] = []

        # read logs and note total samples
        evals_table, eval_logs, total_samples = _read_evals_df(
            logs, columns=columns_eval, strict=True, progress=p.update
        )

        # update progress now that we know the total samples
        entity = detail.name if detail else "sample"
        p.reset(description=f"reading {entity}s", completed=0, total=total_samples)

        # read samples
        async def read_samples_async(
            eval_id: str, eval_log: EvalLog
        ) -> Iterable[EvalSample | EvalSampleSummary]:
            # get samples (in-memory, full log, or summaries from disk)
            if (
                is_eval_logs
                and eval_log.samples is not None
                and len(eval_log.samples) > 0
            ):
                samples: Iterable[EvalSample | EvalSampleSummary] = eval_log.samples
            elif require_full_samples:
                full_log = await read_eval_log_async(
                    eval_log.location, resolve_attachments=True
                )
                samples = full_log.samples or []
            else:
                samples = await read_eval_log_sample_summaries_async(eval_log.location)
            p.update()
            return samples

        log_samples = run_coroutine(
            tg_collect(
                [
                    partial(read_samples_async, eval_id, eval_log)
                    for eval_id, eval_log in zip(
                        evals_table[EVAL_ID].to_list(), eval_logs
                    )
                ]
            )
        )

        for samples, eval_id, eval_log in zip(
            log_samples, evals_table[EVAL_ID].to_list(), eval_logs
        ):
            for sample in samples:
                if strict:
                    record = import_record(
                        eval_log, sample, columns_sample, strict=True
                    )
                else:
                    record, errors = import_record(
                        eval_log, sample, columns_sample, strict=False
                    )
                    all_errors.extend(errors)

                # inject ids
                sample_id = sample.uuid or auto_sample_id(eval_id, sample)
                ids: dict[str, ColumnType] = {
                    EVAL_ID: eval_id,
                    SAMPLE_ID: sample_id,
                }

                # record with ids
                record = ids | record

                # if there are detail columns then blow out w/ detail
                if detail is not None:
                    # filter detail records
                    assert isinstance(sample, EvalSample)
                    if isinstance(detail, MessagesDetail):
                        detail_items: list[ChatMessage] | list[Event] = (
                            sample_messages_from_events(sample.events, detail.filter)
                        )
                    elif isinstance(detail, EventsDetail):
                        detail_items = [
                            e
                            for e in sample.events
                            if detail.filter is None or detail.filter(e)
                        ]
                    else:
                        detail_items = []

                    # read detail records (provide auto-ids)
                    for index, item in enumerate(detail_items):
                        if strict:
                            detail_record = import_record(
                                eval_log,
                                item,
                                columns_detail,
                                strict=True,
                            )
                        else:
                            detail_record, errors = import_record(
                                eval_log,
                                item,
                                columns_detail,
                                strict=False,
                            )
                            all_errors.extend(errors)

                        # ensure ids
                        detail_id_field = f"{detail.name}_id"
                        detail_id = detail_record.get(detail_id_field, None)
                        if detail_id is None:
                            detail_record[detail_id_field] = auto_detail_id(
                                sample_id, detail.name, index
                            )
                        ids = {SAMPLE_ID: sample_id}
                        detail_record = ids | detail_record

                        # inject order
                        detail_record["order"] = index + 1

                        # append detail record
                        detail_records.append(detail_record)

                # record sample record
                sample_records.append(record)

    # normalize records and produce samples table
    samples_table = records_to_pandas(sample_records)
    samples_table.drop_duplicates(
        "sample_id", keep="first", inplace=True, ignore_index=True
    )

    # if we have detail records then join them into the samples table
    if detail is not None:
        details_table = records_to_pandas(detail_records)
        details_table.drop_duplicates(
            f"{detail.name}_id", keep="first", inplace=True, ignore_index=True
        )
        if len(details_table) > 0:
            samples_table = details_table.merge(
                samples_table,
                on=SAMPLE_ID,
                how="left",
                suffixes=(f"_{detail.name}", SAMPLE_SUFFIX),
            )

    # join eval_records
    if len(samples_table) > 0:
        samples_table = samples_table.merge(
            evals_table, on=EVAL_ID, how="left", suffixes=(SAMPLE_SUFFIX, EVAL_SUFFIX)
        )
        # re-order based on original specification
        samples_table = reorder_samples_df_columns(
            samples_table,
            columns_eval,
            columns_sample,
            columns_detail,
            detail.name if detail else "",
        )

    # return
    if strict:
        return samples_table
    else:
        return samples_table, all_errors


def sample_messages_from_events(
    events: list[Event], filter: Callable[[ChatMessage], bool] | None
) -> list[ChatMessage]:
    # don't yield the same event twice
    ids: set[str] = set()

    # we need to look at the full input to every model event and add
    # messages we haven't seen before
    messages: list[ChatMessage] = []
    for event in events:
        if event.event == "model":
            event_messages = event.input + (
                [event.output.message] if not event.output.empty else []
            )
            for message in event_messages:
                id = message.id or message_hash(message_as_str(message))
                if id not in ids:
                    messages.append(message)
                    ids.add(id)

    # remove duplicated assistant messages (can happen in agent bridge or any other
    # time that the message list is fully re-constituted)
    messages = functools.reduce(duplicate_assistant_message_reducer, messages, [])

    # then apply the filter
    return [message for message in messages if filter is None or filter(message)]


def duplicate_assistant_message_reducer(
    messages: list[ChatMessage],
    message: ChatMessage,
) -> list[ChatMessage]:
    if (
        message.role == "assistant"
        and len(messages) > 0
        and messages[-1].role == "assistant"
        and message.text == messages[-1].text
        and [tool.function for tool in (message.tool_calls or [])]
        == [tool.function for tool in (messages[-1].tool_calls or [])]
    ):
        return messages
    else:
        messages.append(message)
        return messages


@lru_cache(maxsize=100)
def message_hash(message: str) -> str:
    return mm3_hash(message)


def reorder_samples_df_columns(
    df: "pd.DataFrame",
    eval_columns: list[Column],
    sample_columns: list[Column],
    detail_columns: list[Column],
    details_name: str,
) -> "pd.DataFrame":
    """Reorder columns in the merged DataFrame.

    Order with:
    1. sample_id first
    2. eval_id second
    3. eval columns
    4. sample columns
    5. any remaining columns
    """
    actual_columns = list(df.columns)
    ordered_columns: list[str] = []

    # detail first if we have detail
    if details_name:
        ordered_columns.append(f"{details_name}_id")

    # sample_id first
    if SAMPLE_ID in actual_columns:
        ordered_columns.append(SAMPLE_ID)

    # eval_id next
    if EVAL_ID in actual_columns:
        ordered_columns.append(EVAL_ID)

    # eval columns
    for column in eval_columns:
        if column.name == EVAL_ID or column.name == SAMPLE_ID:
            continue  # Already handled

        ordered_columns.extend(
            resolve_columns(column.name, EVAL_SUFFIX, actual_columns, ordered_columns)
        )

    # then sample columns
    for column in sample_columns:
        if column.name == EVAL_ID or column.name == SAMPLE_ID:
            continue  # Already handled

        ordered_columns.extend(
            resolve_columns(column.name, SAMPLE_SUFFIX, actual_columns, ordered_columns)
        )

    # then detail columns
    for column in detail_columns:
        if column.name == EVAL_ID or column.name == SAMPLE_ID:
            continue  # Already handled

        ordered_columns.extend(
            resolve_columns(
                column.name, f"_{details_name}", actual_columns, ordered_columns
            )
        )

    # add any unreferenced columns
    ordered_columns = add_unreferenced_columns(actual_columns, ordered_columns)

    # reorder the DataFrame
    return df[ordered_columns]


def _convert_to_large_string(df: "pd.DataFrame") -> "pd.DataFrame":
    """Convert PyArrow string columns to large_string to avoid offset overflow.

    PyArrow's default string type uses 32-bit offsets, which limits total string
    data to ~2GB. This function converts string columns to large_string (64-bit
    offsets) to handle larger datasets.

    Only columns that are approaching or exceeding the 2GB limit are converted.

    Args:
        df: DataFrame with potential PyArrow string columns

    Returns:
        DataFrame with string columns converted to large_string where needed
    """
    import pandas as pd
    import pyarrow as pa

    # 2^31 bytes is the limit for 32-bit offsets
    # Use a threshold of 1.5GB to catch columns that might be close
    SIZE_THRESHOLD = int(1.5 * 1024**3)

    # Build a new DataFrame with converted columns
    new_columns: dict[str, Any] = {}
    for col in df.columns:
        # Check if this is a PyArrow-backed column
        col_dtype = df[col].dtype
        if hasattr(col_dtype, "pyarrow_dtype"):
            dtype = col_dtype.pyarrow_dtype  # type: ignore[attr-defined]
            if pa.types.is_string(dtype):
                # Check the size of this column's string data
                col_array = df[col].array
                if hasattr(col_array, "_pa_array"):
                    arrow_array = col_array._pa_array  # type: ignore[attr-defined]
                    # Get the total size of string data in this column
                    total_size = arrow_array.nbytes
                    # Only convert if this column is large enough to potentially cause issues
                    if total_size > SIZE_THRESHOLD:
                        large_string_array = arrow_array.cast(pa.large_string())
                        new_columns[col] = pd.arrays.ArrowExtensionArray(  # type: ignore[attr-defined]
                            large_string_array
                        )
                        continue
        # Keep original column if not converted
        new_columns[col] = df[col]

    return pd.DataFrame(new_columns, index=df.index)
```

## `analysis/_dataframe/util.py`

```python
from __future__ import annotations

import re
from functools import partial
from itertools import chain
from os import PathLike
from pathlib import Path
from re import Pattern
from typing import TYPE_CHECKING, Sequence, TypeAlias, cast

from inspect_ai._util._async import run_coroutine, tg_collect
from inspect_ai._util.asyncfiles import AsyncFilesystem
from inspect_ai._util.error import pip_dependency_error
from inspect_ai._util.file import FileInfo, filesystem
from inspect_ai._util.version import verify_required_version
from inspect_ai.log._file import EvalLogInfo, list_eval_logs, log_files_from_ls
from inspect_ai.log._log import EvalLog

if TYPE_CHECKING:
    import pandas as pd
    import pyarrow as pa

from .columns import ColumnType

LogPaths: TypeAlias = (
    PathLike[str] | str | EvalLogInfo | Sequence[PathLike[str] | str | EvalLogInfo]
)


def verify_prerequisites() -> None:
    # ensure we have all of the optional packages we need
    required_packages: list[str] = []
    try:
        import pandas  # noqa: F401
    except ImportError:
        required_packages.append("pandas")

    try:
        import pyarrow  # noqa: F401
    except ImportError:
        required_packages.append("pyarrow")

    if len(required_packages) > 0:
        raise pip_dependency_error("inspect_ai.analysis", required_packages)

    # enforce version constraints
    verify_required_version("inspect_ai.analysis", "pandas", "2.1.0")
    verify_required_version("inspect_ai.analysis", "pyarrow", "10.0.1")


def resolve_logs(
    logs: LogPaths | EvalLog | Sequence[EvalLog] | None = None,
) -> list[str] | list[EvalLog]:
    # Handle EvalLog inputs (pass through as list)
    if isinstance(logs, EvalLog):
        return [logs]
    if (
        isinstance(logs, Sequence)
        and not isinstance(logs, str)
        and len(logs) > 0
        and isinstance(logs[0], EvalLog)
    ):
        return cast(list[EvalLog], list(logs))

    # Handle path-based inputs (including falsy for default)
    path_logs: LogPaths = list_eval_logs() if not logs else cast(LogPaths, logs)

    # normalize to list of str
    path_logs = (
        [path_logs]
        if isinstance(path_logs, str | PathLike | EvalLogInfo)
        else path_logs
    )
    logs_str = [
        Path(log).as_posix()
        if isinstance(log, PathLike)
        else log.name
        if isinstance(log, EvalLogInfo)
        else log
        for log in path_logs
    ]

    # expand directories
    async def expand_log(log_str: str) -> list[FileInfo]:
        async with AsyncFilesystem() as async_fs:
            info = await async_fs.info(log_str)
        if info.type == "directory":
            fs = filesystem(log_str)
            return [fi for fi in fs.ls(info.name, recursive=True) if fi.type == "file"]
        else:
            return [info]

    log_paths = list(
        chain.from_iterable(
            run_coroutine(tg_collect([partial(expand_log, s) for s in logs_str]))
        )
    )

    log_files = log_files_from_ls(log_paths, sort=False)
    return [log_file.name for log_file in log_files]


def normalize_records(
    records: list[dict[str, ColumnType]],
) -> list[dict[str, ColumnType]]:
    all_keys: set[str] = set()
    for record in records:
        all_keys.update(record.keys())
    normalized_records = []
    for record in records:
        normalized_record = {key: record.get(key, None) for key in all_keys}
        normalized_records.append(normalized_record)
    return normalized_records


def resolve_columns(
    col_pattern: str, suffix: str, columns: list[str], processed_columns: list[str]
) -> list[str]:
    resolved_columns: list[str] = []

    if "*" not in col_pattern:
        # Regular column - check with suffix
        col_with_suffix = f"{col_pattern}{suffix}"
        if col_with_suffix in columns and col_with_suffix not in processed_columns:
            resolved_columns.append(col_with_suffix)
        # Then without suffix
        elif col_pattern in columns and col_pattern not in processed_columns:
            resolved_columns.append(col_pattern)
    else:
        # Wildcard pattern - check both with and without suffix
        suffix_pattern = col_pattern + suffix
        matching_with_suffix = match_col_pattern(
            suffix_pattern, columns, processed_columns
        )
        matching_without_suffix = match_col_pattern(
            col_pattern, columns, processed_columns
        )

        # Add all matches
        matched_columns = sorted(set(matching_with_suffix + matching_without_suffix))
        resolved_columns.extend(matched_columns)

    return resolved_columns


def match_col_pattern(
    pattern: str, columns: list[str], processed_columns: list[str]
) -> list[str]:
    regex = _col_pattern_to_regex(pattern)
    return [c for c in columns if regex.match(c) and c not in processed_columns]


def _col_pattern_to_regex(pattern: str) -> Pattern[str]:
    parts = []
    for part in re.split(r"(\*)", pattern):
        if part == "*":
            parts.append(".*")
        else:
            parts.append(re.escape(part))
    return re.compile("^" + "".join(parts) + "$")


def add_unreferenced_columns(
    columns: list[str], referenced_columns: list[str]
) -> list[str]:
    unreferenced_columns = sorted([c for c in columns if c not in referenced_columns])
    return referenced_columns + unreferenced_columns


def records_to_pandas(records: list[dict[str, ColumnType]]) -> "pd.DataFrame":
    import pandas as pd
    import pyarrow as pa

    # arrow backed df w/ our types mapper
    df = pd.DataFrame(records)

    # Handle mixed-type object columns that PyArrow can't convert.
    # Score columns often have mixed types (e.g., string 'INVALID' and float 0.5)
    for col in df.columns:
        if df[col].dtype == "object":
            non_null = df[col].dropna()
            if len(non_null) > 0:
                types = set(type(v).__name__ for v in non_null)
                # If mixed types (not all str/bytes), convert to string
                if len(types) > 1 and not types.issubset({"str", "bytes"}):
                    df[col] = df[col].apply(
                        lambda x: str(x)
                        if x is not None and not isinstance(x, str)
                        else x
                    )

    table = pa.Table.from_pandas(df)
    return table.to_pandas(types_mapper=arrow_types_mapper)


def arrow_types_mapper(arrow_type: pa.DataType) -> pd.ArrowDtype:
    import pandas as pd
    import pyarrow as pa

    if pa.types.is_null(arrow_type):
        arrow_type = pa.string()
    return pd.ArrowDtype(arrow_type)


# sample_id                       string[pyarrow]
# eval_id                         string[pyarrow]
# id                              string[pyarrow]
# epoch                            int64[pyarrow]
# input                           string[pyarrow]
# target                          string[pyarrow]
# metadata_challenge_address      string[pyarrow]
# metadata_challenge_type         string[pyarrow]
# metadata_color                  string[pyarrow]
# metadata_cookie                 string[pyarrow]
# metadata_foo                    string[pyarrow]
# metadata_get_flag_cmd           string[pyarrow]
# metadata_get_flag_service       string[pyarrow]
# metadata_label_confidence       double[pyarrow]
# metadata_long                   string[pyarrow]
# metadata_objective_prompt       string[pyarrow]
# metadata_prompt                 string[pyarrow]
# metadata_variant                string[pyarrow]
# score_another_rand_score        double[pyarrow]
# score_check_flag                string[pyarrow]
# score_choice                    string[pyarrow]
# score_compare_quantities        double[pyarrow]
# score_complex_scorer            string[pyarrow]
# score_exact                     string[pyarrow]
# score_foo                       double[pyarrow]
# score_generating_scorer         double[pyarrow]
# score_includes                  string[pyarrow]
# score_letter_count              string[pyarrow]
# score_match                     string[pyarrow]
# score_model_graded_fact         string[pyarrow]
# score_model_graded_qa           string[pyarrow]
# score_nested_dict_scorer        string[pyarrow]
# score_nested_list_scorer        string[pyarrow]
# score_rand_score                double[pyarrow]
# score_score_color               string[pyarrow]
# score_score_table               string[pyarrow]
# score_simple_score              string[pyarrow]
# score_simple_score1             string[pyarrow]
# score_simple_score2             string[pyarrow]
# score_slow_scorer               double[pyarrow]
# score_token_consuming_scorer    double[pyarrow]
# score_wildcard_scorer           string[pyarrow]
# model_usage                     string[pyarrow]
# total_time                      double[pyarrow]
# working_time                    double[pyarrow]
# error                           string[pyarrow]
# limit                           string[pyarrow]
# retries                          int64[pyarrow]
# dtype: object

# sample_id                       string[pyarrow]
# eval_id                         string[pyarrow]
# id                              string[pyarrow]
# epoch                            int64[pyarrow]
# input                           string[pyarrow]
# target                          string[pyarrow]
# metadata_challenge_address      string[pyarrow]
# metadata_challenge_type         string[pyarrow]
# metadata_color                  string[pyarrow]
# metadata_cookie                 string[pyarrow]
# metadata_foo                    string[pyarrow]
# metadata_get_flag_cmd           string[pyarrow]
# metadata_get_flag_service       string[pyarrow]
# metadata_label_confidence       double[pyarrow]
# metadata_long                   string[pyarrow]
# metadata_objective_prompt       string[pyarrow]
# metadata_prompt                 string[pyarrow]
# metadata_variant                string[pyarrow]
# score_another_rand_score         int64[pyarrow]
# score_check_flag                string[pyarrow]
# score_choice                    string[pyarrow]
# score_compare_quantities        double[pyarrow]
# score_complex_scorer            string[pyarrow]
# score_exact                     string[pyarrow]
# score_foo                       double[pyarrow]
# score_generating_scorer          int64[pyarrow]
# score_includes                  string[pyarrow]
# score_letter_count              string[pyarrow]
# score_match                     string[pyarrow]
# score_model_graded_fact         string[pyarrow]
# score_model_graded_qa           string[pyarrow]
# score_nested_dict_scorer        string[pyarrow]
# score_nested_list_scorer        string[pyarrow]
# score_rand_score                 int64[pyarrow]
# score_score_color               string[pyarrow]
# score_score_table               string[pyarrow]
# score_simple_score              string[pyarrow]
# score_simple_score1             string[pyarrow]
# score_simple_score2             string[pyarrow]
# score_slow_scorer                int64[pyarrow]
# score_token_consuming_scorer     int64[pyarrow]
# score_wildcard_scorer           string[pyarrow]
# model_usage                     string[pyarrow]
# total_time                      double[pyarrow]
# working_time                    double[pyarrow]
# error                           string[pyarrow]
# limit                           string[pyarrow]
# retries                          int64[pyarrow]
# dtype: object
```

## `analysis/_dataframe/validate.py`

```python
from __future__ import annotations

from logging import getLogger
from typing import Any, Iterator, Mapping, Type

import jsonref  # type: ignore
from jsonpath_ng import Fields, Index, JSONPath, Slice, Where  # type: ignore
from jsonpath_ng.ext.filter import Filter  # type: ignore
from pydantic import BaseModel

logger = getLogger(__name__)

Schema = Mapping[str, Any]


def resolved_schema(model: Type[BaseModel]) -> Schema:
    schema_dict = model.model_json_schema()
    base = "file:///memory/inspect_schema.json"
    schema: Schema = jsonref.replace_refs(
        schema_dict, base_uri=base, jsonschema=True, proxies=False
    )
    return schema


def jsonpath_in_schema(expr: JSONPath, schema: Schema) -> bool:
    # don't validate unsupported constructs
    if find_unsupported(expr):
        return True

    def descend(sch: Schema, tok: str | int | None) -> list[Schema]:
        # First, branch through anyOf/oneOf/allOf
        outs: list[Schema] = []
        for branch in _expand_union(sch):
            outs.extend(descend_concrete(branch, tok))
        return outs

    def descend_concrete(sch: Schema, tok: str | int | None) -> list[Schema]:
        # totally open object – accept any child
        if sch == {}:
            return [{}]  # stay alive, accept any key

        outs: list[Schema] = []

        def open_dict(node: Schema) -> None:
            """Append the schema that governs unknown keys.

            - None / missing  -> open object  ->   {}
            - True            -> open object  ->   {}
            - Mapping         -> that mapping (could be {} or a real subschema)
            - False           -> closed object ->   (do nothing)
            """
            if "additionalProperties" not in node:
                if not node.get("properties"):
                    outs.append({})
            else:
                ap = node["additionalProperties"]
                if ap is True:
                    outs.append({})
                elif isinstance(ap, Mapping):  # {} or {...}
                    outs.append(ap)
                # ap is False  -> closed dict  ->  ignore

        # Wildcard -----------------------------------------------------------
        if tok is None:
            if "properties" in sch:
                outs.extend(sch["properties"].values())
            if "object" in _types(sch):
                open_dict(sch)
            if "array" in _types(sch) and "items" in sch:
                outs.extend(_normalize_items(sch["items"]))
            return outs

        # Property access ----------------------------------------------------
        if isinstance(tok, str):
            if "properties" in sch and tok in sch["properties"]:
                outs.append(sch["properties"][tok])
            elif "additionalProperties" in sch:  # PRESENCE, not truthiness
                open_dict(sch)
            elif "object" in _types(sch):
                open_dict(sch)

        # Array index --------------------------------------------------------
        else:  # tok is int or None from an Index node
            if "array" in _types(sch) and "items" in sch:
                outs.extend(_normalize_items(sch["items"], index=tok))

        return outs

    def _types(sch: Schema) -> set[str]:
        t = sch.get("type")
        return set(t) if isinstance(t, list) else {t} if t else set()

    def _normalize_items(items: Any, index: int | None = None) -> list[Schema]:
        if isinstance(items, list):
            if index is None:  # wildcard/slice
                return items
            if 0 <= index < len(items):
                return [items[index]]
            return []
        if isinstance(items, Mapping):
            return [items]
        return []

    states = [schema]
    for tok in iter_tokens(expr):
        next_states: list[Schema] = []
        for st in states:
            next_states.extend(descend(st, tok))
        if not next_states:  # nothing matched this segment
            return False
        states = next_states
    return True  # every segment found at least one schema


def iter_tokens(node: JSONPath) -> Iterator[str | int | None]:
    """Linearise a jsonpath-ng AST into a stream of tokens we care about."""
    if hasattr(node, "left"):  # Child, Descendants, etc.
        yield from iter_tokens(node.left)
        yield from iter_tokens(node.right)
    elif isinstance(node, Fields):
        yield from node.fields  # e.g. ["foo"]
    elif isinstance(node, Index):
        yield node.indices[0]  # 0 / -1
    elif isinstance(node, Slice):
        yield None  # treat any slice as wildcard


COMBINATORS = ("anyOf", "oneOf", "allOf")


def _expand_union(sch: Schema) -> list[Schema]:
    """Return sch itself or the list of subschemas if it is a combinator."""
    for key in COMBINATORS:
        if key in sch:
            subs: list[Schema] = []
            for sub in sch[key]:
                # a sub-schema might itself be an anyOf/oneOf/allOf
                subs.extend(_expand_union(sub))
            return subs
    return [sch]


UNSUPPORTED: tuple[type[JSONPath], ...] = (
    Filter,  # [?foo > 0]
    Where,  # .foo[(@.bar < 42)]
    Slice,  # [1:5]  (wildcard "[*]" is Index/None, not Slice)
)


def find_unsupported(node: JSONPath) -> list[type[JSONPath]]:
    """Return a list of node types present in `node` that we do not validate."""
    bad: list[type[JSONPath]] = []
    stack: list[JSONPath] = [node]
    while stack:
        n = stack.pop()
        if isinstance(n, UNSUPPORTED):
            bad.append(type(n))
        # Drill into children (jsonpath-ng uses .left / .right / .child attributes)
        for attr in ("left", "right", "child", "expression"):
            stack.extend(
                [getattr(n, attr)]
                if hasattr(n, attr) and isinstance(getattr(n, attr), JSONPath)
                else []
            )
        # handle containers like Fields(fields=[...]) and Index(index=[...])
        if hasattr(n, "__dict__"):
            for v in n.__dict__.values():
                if isinstance(v, list):
                    stack.extend(x for x in v if isinstance(x, JSONPath))
    return bad
```

## `analysis/_prepare/__init__.py`

```python

```

## `analysis/_prepare/frontier.py`

```python
from typing import Hashable

from inspect_ai.analysis._prepare.operation import Operation


def frontier(
    task_column: str = "task_name",
    date_column: str = "model_release_date",
    score_column: str = "score_headline_value",
    frontier_column: str = "frontier",
) -> Operation:
    """Add a frontier column to an eval data frame.

    Tranform operation to add a frontier column to a data frame based using a task, release date, and score.

    The frontier column will be True if the model was the top-scoring model on the task among all models available at the moment the model was released; otherwise it will be False.

    Args:
        task_column: The column in the data frame containing the task name (defaults to "task_name").
        date_column: The column in the data frame containing the model release date (defaults to "model_release_date").
        score_column: The column in the data frame containing the score (defaults to "score_headline_value").
        frontier_column: The column to create with the frontier value (defaults to "frontier").
    """
    import pandas as pd

    def transform(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df

        # Ensure required columns exist
        required_columns = [task_column, date_column, score_column]
        for col in required_columns:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in DataFrame")

        # Initialize frontier column
        df = df.copy()
        df[frontier_column] = False

        # Group by task_name and process each task
        for _, task_group in df.groupby(task_column):
            # Filter out models with missing release dates for frontier calculation
            task_group_with_dates = task_group.dropna(subset=[date_column])

            # For each release date, keep only the highest scoring model
            best_per_date = task_group_with_dates.dropna(subset=[score_column]).loc[
                task_group_with_dates.groupby(date_column)[score_column].idxmax()
            ]

            # Sort by model_release_date to process chronologically
            best_per_date = best_per_date.sort_values(date_column)

            # Track the highest score seen so far
            highest_score = float("-inf")
            frontier_indices: list[Hashable] = []

            for idx, row in best_per_date.iterrows():
                current_score = row[score_column]

                # If this is a new high score, it's on the frontier
                if current_score > highest_score:
                    highest_score = current_score
                    frontier_indices.append(idx)

            # Mark frontier models
            if frontier_indices:
                df.loc[pd.Index(frontier_indices), frontier_column] = True

        return df

    return transform
```

## `analysis/_prepare/log_viewer.py`

```python
import os
from typing import Literal

from inspect_ai._util.file import absolute_file_path
from inspect_ai.analysis._prepare.operation import Operation


def log_viewer(
    target: Literal["eval", "sample", "event", "message"],
    url_mappings: dict[str, str],
    log_column: str = "log",
    log_viewer_column: str = "log_viewer",
) -> Operation:
    """Add a log viewer column to an eval data frame.

    Tranform operation to add a log_viewer column to a data frame based on one more more `url_mappings`.

    URL mappings define the relationship between log file paths (either fileystem or S3) and URLs where logs are published. The URL target should be the location where the output of the [`inspect view bundle`](../log-viewer.qmd#sec-publishing) command was published.

    Args:
        target: Target for log viewer ("eval", "sample", "event", or "message").
        url_mappings: Map log file paths (either filesystem or S3) to URLs where logs are published.
        log_column: Column in the data frame containing log file path (defaults to "log").
        log_viewer_column: Column to create with log viewer URL (defaults to "log_viewer")
    """
    import pandas as pd

    # normalize mappings
    url_mappings = {
        _normalize_log_dir(k): _ensure_trailing_slash(v)
        for k, v in url_mappings.items()
    }

    def resolve_base_url(
        row: pd.Series,  # type: ignore[type-arg]
        log_column: str,
        url_mappings: dict[str, str],
    ) -> str:
        """Resolve base URL from log path using URL mappings."""
        log = _normalize_file_path(row[log_column])
        for k, v in url_mappings.items():
            if log.startswith(k):
                return log.replace(k, f"{v}#/logs/", 1)

        raise ValueError(
            f"Unable to resolve log viewer URL for log {row[log_column]} "
            + "(no valid url mapping provided for log)"
        )

    def validate_required_columns(row: pd.Series, required_columns: list[str]) -> None:  # type: ignore[type-arg]
        """Validate that row contains all required columns."""
        missing = [col for col in required_columns if col not in row]
        if missing:
            raise ValueError(
                f"Row must contain {', '.join(repr(col) for col in required_columns)} "
                f"columns to generate {target} log viewer URL"
            )

    # function to resolve mappings
    def log_viewer_url(row: pd.Series) -> str:  # type: ignore[type-arg]
        return resolve_base_url(row, log_column, url_mappings)

    def sample_log_viewer_url(row: pd.Series) -> str:  # type: ignore[type-arg]
        # validate columns
        validate_required_columns(row, ["id", "epoch"])

        # form the url
        base_url = resolve_base_url(row, log_column, url_mappings)
        return f"{base_url}/samples/sample/{row.id}/{row.epoch}"

    def sample_event_log_viewer_url(row: pd.Series) -> str:  # type: ignore[type-arg]
        ## validate columns
        validate_required_columns(row, ["sample_id", "event_id"])

        # form the url
        base_url = resolve_base_url(row, log_column, url_mappings)
        return f"{base_url}/samples/sample_uuid/{row.sample_id}/transcript?event={row.event_id}"

    def sample_message_log_viewer_url(row: pd.Series) -> str:  # type: ignore[type-arg]
        ## validate columns
        validate_required_columns(row, ["sample_id", "message_id"])

        # form the url
        base_url = resolve_base_url(row, log_column, url_mappings)
        return f"{base_url}/samples/sample_uuid/{row.sample_id}/messages?message={row.message_id}"

    def transform(df: pd.DataFrame) -> pd.DataFrame:
        if target == "sample":
            df[log_viewer_column] = df.apply(sample_log_viewer_url, axis=1)
        elif target == "event":
            df[log_viewer_column] = df.apply(sample_event_log_viewer_url, axis=1)
        elif target == "message":
            df[log_viewer_column] = df.apply(sample_message_log_viewer_url, axis=1)
        else:
            df[log_viewer_column] = df.apply(log_viewer_url, axis=1)
        return df

    return transform


def _normalize_file_path(file: str) -> str:
    file = os.path.expanduser(file)
    return absolute_file_path(file)


def _normalize_log_dir(dir: str) -> str:
    dir = _normalize_file_path(dir)
    return _ensure_trailing_slash(dir)


def _ensure_trailing_slash(dir: str) -> str:
    if not dir.endswith("/"):
        return f"{dir}/"
    else:
        return dir
```

## `analysis/_prepare/model_info.py`

```python
from typing import Dict

from inspect_ai.analysis._prepare.operation import Operation
from inspect_ai.model import get_model_info
from inspect_ai.model._model_data.model_data import ModelInfo


def model_info(
    model_info: Dict[str, ModelInfo] | None = None,
) -> Operation:
    """Amend data frame with model metadata.

    Fields added (when available) include:

    `model_organization_name`
    : Displayable model organization (e.g. OpenAI, Anthropic, etc.)

    `model_display_name`
    : Displayable model name (e.g. Gemini Flash 2.5)

    `model_snapshot`
    : A snapshot (version) string, if available (e.g. "latest" or "20240229")

    `model_release_date`
    : The model's release date

    `model_knowledge_cutoff_date`
    : The model's knowledge cutoff date

    Inspect includes built in support for many models (based upon the `model` string in the dataframe). If you are using models for which Inspect does not include model metadata, you may include your own model metadata via the `model_info` argument.

    Args:
        model_info: Additional model info for models not supported directly by Inspect's internal database.
    """
    import pandas as pd

    def transform(df: pd.DataFrame) -> pd.DataFrame:
        # Column mapping from DataFrame to ModelInfo field to read
        fields = {
            "model_organization_name": "organization",
            "model_display_name": "model",
            "model_snapshot": "snapshot",
            "model_release_date": "release_date",
            "model_knowledge_cutoff_date": "knowledge_cutoff_date",
        }

        # Set default values for all fields
        for field in fields.keys():
            if field == "model_display_name":
                df[field] = df["model"].astype(str)
            else:
                df[field] = None

        for idx in df.index:
            model = str(df.loc[idx, "model"])

            # Check transient user-provided model_info first
            model_data = model_info.get(model) if model_info else None

            # Fall back to get_model_info() for built-in + globally registered models
            if model_data is None:
                model_data = get_model_info(model)

            if model_data is not None:
                for df_field, model_field in fields.items():
                    value = getattr(model_data, model_field, None)
                    if value is not None:
                        df.loc[idx, df_field] = value

        return df

    return transform
```

## `analysis/_prepare/operation.py`

```python
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    import pandas as pd


class Operation(Protocol):
    def __call__(self, df: "pd.DataFrame") -> "pd.DataFrame":
        """Operation to transform a data frame for analysis.

        Args:
            df: Input data frame.
        """
        ...
```

## `analysis/_prepare/prepare.py`

```python
from typing import TYPE_CHECKING, Sequence

from .._dataframe.util import verify_prerequisites
from .operation import Operation

if TYPE_CHECKING:
    import pandas as pd


def prepare(
    df: "pd.DataFrame", operation: Operation | Sequence[Operation]
) -> "pd.DataFrame":
    """Prepare a data frame for analysis using one or more transform operations.

    Args:
       df: Input data frame.
       operation: `Operation` or sequence of operations to apply.
    """
    verify_prerequisites()

    operation = operation if isinstance(operation, Sequence) else [operation]
    for op in operation:
        df = op(df)
    return df
```

## `analysis/_prepare/score_to_float.py`

```python
from typing import Sequence

from inspect_ai.analysis._prepare.operation import Operation
from inspect_ai.scorer._metric import ValueToFloat, value_to_float


def score_to_float(
    columns: str | Sequence[str], *, value_to_float: ValueToFloat = value_to_float()
) -> Operation:
    """Converts score columns to float values.

    For each column specified, this operation will convert the values to floats using the provided `value_to_float` function. The column value will be replaced with the float value.

    Args:
        columns: The name of the score column(s) to convert to float. This can be a single column name or a sequence of column names.
        value_to_float: Function to convert values to float. Defaults to the built-in `value_to_float` function.
    """
    import pandas as pd

    def transform(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df

        # Ensure required columns exist
        column_list = [columns] if isinstance(columns, str) else columns
        for col in column_list:
            if col not in df.columns:
                raise ValueError(f"Column '{col}' not found in DataFrame")

        # Apply value_to_float function to each specified column
        df_copy = df.copy()
        for col in column_list:
            df_copy[col] = df_copy[col].apply(value_to_float)

        return df_copy

    return transform
```

## `analysis/_prepare/task_info.py`

```python
from typing import cast

from .operation import Operation


def task_info(
    display_names: dict[str, str],
    task_name_column: str = "task_name",
    task_display_name_column: str = "task_display_name",
) -> Operation:
    """Amend data frame with task display name.

    Maps task names to task display names for plotting (e.g. "gpqa_diamond" -> "GPQA Diamond")

    If no mapping is provided for a task then name will come from the `display_name` attribute of
    the `Task` (or failing that from the registered name of the `Task`).

    Args:
        display_names: Mapping of task log names (e.g. "gpqa_diamond") to task display names (e.g. "GPQA Diamond").
        task_name_column: Column to draw the task name from (defaults to "task_name").
        task_display_name_column: Column to populate with the task display name (defaults to "task_display_name")
    """
    import pandas as pd

    # function to resolve display name mappings
    def task_display_name(row: pd.Series) -> str:  # type: ignore[type-arg]
        if task_name_column not in row.keys():
            raise ValueError(f"The data frame has no column named '{task_name_column}'")

        # map task names to display names
        task_name = row[task_name_column]
        for k, v in display_names.items():
            if k == task_name:
                return v

        # none found, reflect any existing column value or fallback to task_name
        return cast(str, row.get(task_display_name_column, default=task_name))

    def transform(df: pd.DataFrame) -> pd.DataFrame:
        df[task_display_name_column] = df.apply(task_display_name, axis=1)
        return df

    return transform
```

## `analysis/beta/__init__.py`

```python
from inspect_ai._util.deprecation import relocated_module_attribute

_ANALYSIS_MODULE_VERSION_3_18 = "0.3.119"
_REMOVED_IN = "0.4"
relocated_module_attribute(
    "evals_df",
    "inspect_ai.analysis.evals_df",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalColumn",
    "inspect_ai.analysis.EvalColumn",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalColumns",
    "inspect_ai.analysis.EvalColumns",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalInfo",
    "inspect_ai.analysis.EvalInfo",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalTask",
    "inspect_ai.analysis.EvalTask",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalModel",
    "inspect_ai.analysis.EvalModel",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalColumns",
    "inspect_ai.analysis.EvalColumns",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalConfiguration",
    "inspect_ai.analysis.EvalConfiguration",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalTask",
    "inspect_ai.analysis.EvalTask",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalDataset",
    "inspect_ai.analysis.EvalDataset",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalResults",
    "inspect_ai.analysis.EvalResults",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EvalScores",
    "inspect_ai.analysis.EvalScores",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "samples_df",
    "inspect_ai.analysis.samples_df",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SampleColumn",
    "inspect_ai.analysis.SampleColumn",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SampleSummary",
    "inspect_ai.analysis.SampleSummary",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SampleMessages",
    "inspect_ai.analysis.SampleMessages",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "messages_df",
    "inspect_ai.analysis.messages_df",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "MessageColumn",
    "inspect_ai.analysis.MessageColumn",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "MessageContent",
    "inspect_ai.analysis.MessageContent",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "MessageToolCalls",
    "inspect_ai.analysis.MessageToolCalls",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "MessageColumns",
    "inspect_ai.analysis.MessageColumns",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "MessageFilter",
    "inspect_ai.analysis.MessageFilter",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "events_df",
    "inspect_ai.analysis.events_df",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EventColumn",
    "inspect_ai.analysis.EventColumn",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "EventTiming",
    "inspect_ai.analysis.EventTiming",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ModelEventColumns",
    "inspect_ai.analysis.ModelEventColumns",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ToolEventColumns",
    "inspect_ai.analysis.ToolEventColumns",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "Column",
    "inspect_ai.analysis.Column",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ColumnType",
    "inspect_ai.analysis.ColumnType",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ColumnError",
    "inspect_ai.analysis.ColumnError",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "prepare",
    "inspect_ai.analysis.prepare",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "log_viewer",
    "inspect_ai.analysis.log_viewer",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "Operation",
    "inspect_ai.analysis.Operation",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "model_info",
    "inspect_ai.analysis.model_info",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "task_info",
    "inspect_ai.analysis.task_info",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ModelInfo",
    "inspect_ai.analysis.ModelInfo",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "frontier",
    "inspect_ai.analysis.frontier",
    _ANALYSIS_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
```

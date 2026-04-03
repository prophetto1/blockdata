# Python Bundle: `_display`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `31`

## Files

- `_display/__init__.py`
- `_display/core/active.py`
- `_display/core/config.py`
- `_display/core/display.py`
- `_display/core/footer.py`
- `_display/core/panel.py`
- `_display/core/progress.py`
- `_display/core/results.py`
- `_display/core/rich.py`
- `_display/core/textual.py`
- `_display/log/__init__.py`
- `_display/log/display.py`
- `_display/plain/__init__.py`
- `_display/plain/display.py`
- `_display/rich/__init__.py`
- `_display/rich/display.py`
- `_display/textual/app.py`
- `_display/textual/display.py`
- `_display/textual/theme.py`
- `_display/textual/widgets/clock.py`
- `_display/textual/widgets/console.py`
- `_display/textual/widgets/footer.py`
- `_display/textual/widgets/port_mappings.py`
- `_display/textual/widgets/samples.py`
- `_display/textual/widgets/sandbox.py`
- `_display/textual/widgets/task_detail.py`
- `_display/textual/widgets/tasks.py`
- `_display/textual/widgets/titlebar.py`
- `_display/textual/widgets/toggle.py`
- `_display/textual/widgets/transcript.py`
- `_display/textual/widgets/vscode.py`

## `_display/__init__.py`

```python
from .core.active import display
from .core.display import (
    Display,
    Progress,
    TaskCancelled,
    TaskError,
    TaskProfile,
    TaskResult,
    TaskScreen,
    TaskSuccess,
    TaskWithResult,
)

__all__ = [
    "display",
    "Display",
    "Progress",
    "TaskCancelled",
    "TaskError",
    "TaskProfile",
    "TaskResult",
    "TaskScreen",
    "TaskWithResult",
    "TaskSuccess",
]
```

## `_display/core/active.py`

```python
import sys
from contextvars import ContextVar

import rich

from inspect_ai.util._display import display_type

from ..log.display import LogDisplay
from ..plain.display import PlainDisplay
from ..rich.display import RichDisplay
from ..textual.display import TextualDisplay
from .display import Display, TaskScreen

_active_display: Display | None = None


def active_display() -> Display | None:
    global _active_display
    return _active_display


def display() -> Display:
    global _active_display
    if _active_display is None:
        if display_type() == "plain":
            _active_display = PlainDisplay()
        elif (
            display_type() == "full"
            and sys.stdout.isatty()
            and not rich.get_console().is_jupyter
        ):
            _active_display = TextualDisplay()
        elif display_type() == "log":
            _active_display = LogDisplay()
        else:
            _active_display = RichDisplay()

    return _active_display


def task_screen() -> TaskScreen:
    screen = _active_task_screen.get(None)
    if screen is None:
        raise RuntimeError(
            "console input function called outside of running evaluation."
        )
    return screen


def init_task_screen(screen: TaskScreen) -> None:
    _active_task_screen.set(screen)


def clear_task_screen() -> None:
    _active_task_screen.set(None)


_active_task_screen: ContextVar[TaskScreen | None] = ContextVar(
    "task_screen", default=None
)
```

## `_display/core/config.py`

```python
from rich.console import RenderableType
from rich.text import Text

from inspect_ai._util.registry import is_model_dict, is_registry_dict
from inspect_ai._util.text import truncate_text
from inspect_ai.log._log import eval_config_defaults
from inspect_ai.model._cache import CachePolicy

from .display import TaskProfile


def task_config_str(profile: TaskProfile, generate_config: bool = True) -> str:
    # merge config
    # wind params back for display
    task_args = dict(profile.task_args)
    for key in task_args.keys():
        value = task_args[key]
        if is_registry_dict(value):
            task_args[key] = value["name"]
        if is_model_dict(value):
            task_args[key] = value["model"]
    # get eval_config overrides
    eval_config = dict(profile.eval_config.model_dump(exclude_none=True))
    for name, default_value in eval_config_defaults().items():
        if eval_config.get(name, None) == default_value:
            del eval_config[name]
    config = eval_config | task_args
    if generate_config:
        config = dict(profile.generate_config.model_dump(exclude_none=True)) | config
    if profile.tags:
        config["tags"] = ",".join(profile.tags)
    config["dataset"] = profile.dataset
    config_print: list[str] = []
    for name, value in config.items():
        if name == "approval" and isinstance(value, dict):
            config_print.append(
                f"{name}: {','.join([approver['name'] for approver in value['approvers']])}"
            )
        elif name == "cache":
            value = (
                profile.generate_config.cache.expiry
                if isinstance(profile.generate_config.cache, CachePolicy)
                else "1W"
                if profile.generate_config.cache is True
                else profile.generate_config.cache
            )
            config_print.append(f"{name}: {value}")
        elif name == "sample_id":
            value = value if isinstance(value, list) else [value]
            value = [str(v) for v in value]
            config_print.append(f"{name}: {','.join(value)}")
        elif name == "epochs_reducer":
            if isinstance(value, list):
                if len(value) == 0:
                    value = "none"
                else:
                    value = ",".join([str(v) for v in value])
            config_print.append(f"{name}: {value}")
        elif name not in ["limit", "model", "response_schema", "log_shared"]:
            if isinstance(value, list):
                value = ",".join([str(v) for v in value])
            elif isinstance(value, dict):
                value = "{...}"
            if isinstance(value, str):
                value = truncate_text(value, 50)
                value = value.replace("[", "\\[")
            config_print.append(f"{name}: {value}")
    values = ", ".join(config_print)
    return values


def task_config(
    profile: TaskProfile, generate_config: bool = True, style: str = ""
) -> RenderableType:
    values = task_config_str(profile, generate_config)
    if values:
        values_text = Text(values, style=style)
        values_text.truncate(500, overflow="ellipsis")
        return values_text
    else:
        return ""


def task_dict(d: dict[str, str], bold_value: bool = False) -> str:
    slot1, slot2 = ("", "[/bold]") if bold_value else ("[/bold]", "")
    return "  ".join(
        [f"[bold]{key}:{slot1} {value}{slot2}" for key, value in d.items()]
    )
```

## `_display/core/display.py`

```python
import contextlib
from dataclasses import dataclass
from types import TracebackType
from typing import (
    Any,
    AsyncIterator,
    Callable,
    Coroutine,
    Iterator,
    Protocol,
    Type,
    TypeVar,
    Union,
    runtime_checkable,
)

import rich
from pydantic import BaseModel, Field, field_validator
from rich.console import Console

from inspect_ai.log import EvalConfig, EvalResults, EvalStats
from inspect_ai.model import GenerateConfig, ModelName

from ...util._panel import InputPanel


@runtime_checkable
class Progress(Protocol):
    def update(self, n: int = 1) -> None: ...

    def complete(self) -> None: ...


@dataclass
class TaskSpec:
    name: str
    model: ModelName


@dataclass
class TaskProfile:
    name: str
    file: str | None
    model: ModelName
    dataset: str
    scorer: str
    samples: int
    steps: int
    eval_config: EvalConfig
    task_args: dict[str, Any]
    generate_config: GenerateConfig
    tags: list[str] | None
    log_location: str


@dataclass
class TaskError:
    samples_completed: int
    exc_type: Type[Any]
    exc_value: BaseException
    traceback: TracebackType | None


@dataclass
class TaskCancelled:
    samples_completed: int
    stats: EvalStats


@dataclass
class TaskSuccess:
    samples_completed: int
    stats: EvalStats
    results: EvalResults


TaskResult = Union[TaskError, TaskCancelled, TaskSuccess]


@dataclass
class TaskWithResult:
    profile: TaskProfile
    result: TaskResult | None


TR = TypeVar("TR")

TP = TypeVar("TP", bound=InputPanel)


class TaskScreen(contextlib.AbstractContextManager["TaskScreen"]):
    def __exit__(self, *excinfo: Any) -> None:
        pass

    @contextlib.contextmanager
    def input_screen(
        self,
        header: str | None = None,
        transient: bool | None = None,
        width: int | None = None,
    ) -> Iterator[Console]:
        yield rich.get_console()

    async def input_panel(self, panel_type: type[TP]) -> TP:
        raise NotImplementedError("input_panel not implemented by current display")


class TaskDisplayMetric(BaseModel):
    scorer: str
    name: str
    value: float | int | None = Field(default=None)
    reducer: str | None = Field(default=None)
    params: dict[str, Any] | None = Field(default=None)

    @field_validator("value", mode="before")
    @classmethod
    def handle_null_value(cls, v: Any) -> Union[float, int, None]:
        if v is None:
            return None
        if isinstance(v, float | int):
            return v
        raise ValueError(f"Expected float, int, or None, got {type(v)}")


@runtime_checkable
class TaskDisplay(Protocol):
    @contextlib.contextmanager
    def progress(self) -> Iterator[Progress]: ...

    def sample_complete(self, complete: int, total: int) -> None: ...

    def update_metrics(self, scores: list[TaskDisplayMetric]) -> None: ...

    def complete(self, result: TaskResult) -> None: ...


@runtime_checkable
class Display(Protocol):
    def print(self, message: str) -> None: ...

    @contextlib.contextmanager
    def progress(self, total: int) -> Iterator[Progress]: ...

    def run_task_app(self, main: Callable[[], Coroutine[None, None, TR]]) -> TR: ...

    @contextlib.contextmanager
    def suspend_task_app(self) -> Iterator[None]: ...

    @contextlib.asynccontextmanager
    async def task_screen(
        self, tasks: list[TaskSpec], parallel: bool
    ) -> AsyncIterator[TaskScreen]:
        yield TaskScreen()

    @contextlib.contextmanager
    def task(self, profile: TaskProfile) -> Iterator[TaskDisplay]: ...

    def display_counter(self, caption: str, value: str) -> None: ...
```

## `_display/core/footer.py`

```python
from rich.console import RenderableType
from rich.text import Text

from inspect_ai._util.retry import http_retries_count
from inspect_ai.log._refusal import refusal_count
from inspect_ai.util._concurrency import concurrency_status_display
from inspect_ai.util._throttle import throttle

from .config import task_dict


@throttle(1)
def task_footer(
    counters: dict[str, str], style: str = ""
) -> tuple[RenderableType, RenderableType]:
    return (
        Text.from_markup(task_resources(), style=style),
        Text.from_markup(task_counters(counters), style=style),
    )


def task_resources() -> str:
    resources: dict[str, str] = {}
    for model, resource in concurrency_status_display().items():
        resources[model] = f"{resource[0]}/{resource[1]}"
    return task_dict(resources)


def task_counters(counters: dict[str, str]) -> str:
    counters = counters | task_http_retries()
    refusals = refusal_count()
    if refusals > 0:
        counters = counters | {"Refusals": f"{refusals:,}"}

    return task_dict(counters)


def task_http_retries() -> dict[str, str]:
    return {"HTTP retries": f"{http_retries_count():,}"}


def task_http_retries_str() -> str:
    return f"HTTP retries: {http_retries_count():,}"


def task_refusals_str() -> str:
    refusals = refusal_count()
    if refusals > 0:
        return f"Refusals: {refusals:,}"
    else:
        return ""
```

## `_display/core/panel.py`

```python
from typing import Tuple

import rich
from rich.console import Group, RenderableType
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from inspect_ai._util.constants import CONSOLE_DISPLAY_WIDTH
from inspect_ai._util.path import cwd_relative_path
from inspect_ai._util.task import task_display_name
from inspect_ai.util._display import display_type_plain

from .display import TaskProfile
from .rich import is_vscode_notebook, rich_theme


def task_panel(
    profile: TaskProfile,
    show_model: bool,
    body: RenderableType,
    subtitle: RenderableType
    | str
    | Tuple[RenderableType | str, RenderableType | str]
    | None,
    footer: RenderableType | tuple[RenderableType, RenderableType] | None,
    log_location: str | None,
) -> RenderableType:
    # dispatch to plain handler if we are in plain mode
    if display_type_plain():
        return task_panel_plain(
            profile, show_model, body, subtitle, footer, log_location
        )

    # rendering context
    theme = rich_theme()
    console = rich.get_console()
    width = CONSOLE_DISPLAY_WIDTH if is_vscode_notebook(console) else None
    jupyter = console.is_jupyter

    # root table
    table = Table.grid(expand=True)
    table.add_column()

    # setup table
    if subtitle is not None:
        subtitle_table = Table.grid(expand=True)
        subtitle_table.add_column()
        if isinstance(subtitle, tuple):
            subtitle_table.add_column(justify="right")
            subtitle_table.add_row(
                to_renderable(subtitle[0]), to_renderable(subtitle[1], style=theme.meta)
            )
        else:
            subtitle_table.add_row(to_renderable(subtitle))

        table.add_row(subtitle_table)

    # main progress and task info
    if body:
        table.add_row(body)

    # spacing if there is more content
    if footer or log_location:
        table.add_row()

    # footer if specified
    if footer:
        footer_table = Table.grid(expand=True)
        footer_table.add_column()
        if isinstance(footer, tuple):
            footer_table.add_column(justify="right")
            footer_table.add_row(footer[0], footer[1])
        else:
            footer_table.add_row(footer)
        table.add_row(footer_table)

    # enclose in outer table for log link footer
    root = table
    if log_location:
        # if we are in jupyter then use a real hyperlink
        if jupyter:
            log_location = f"[link={log_location}]{log_location}[/link]"

        # Print a cwd relative path
        try:
            log_location_relative = cwd_relative_path(log_location, walk_up=True)
        except ValueError:
            log_location_relative = log_location

        root = Table.grid(expand=True)
        root.add_column(overflow="fold")
        root.add_row(table)
        root.add_row()
        root.add_row(
            f"[bold][{theme.light}]Log:[/{theme.light}][/bold] "
            + f"[{theme.link}]{log_location_relative}[/{theme.link}]"
        )
        root.add_row()

        panel = Panel(
            task_panel_title(profile, show_model),
            padding=(0, 0),
            width=width,
            height=3,
            expand=True,
        )
        return Group(panel, root)
    else:
        return Panel(
            root,
            title=task_panel_title(profile, show_model),
            title_align="left",
            width=width,
            expand=True,
        )


def task_panel_plain(
    profile: TaskProfile,
    show_model: bool,
    body: RenderableType,
    subtitle: RenderableType
    | str
    | Tuple[RenderableType | str, RenderableType | str]
    | None,
    footer: RenderableType | tuple[RenderableType, RenderableType] | None,
    log_location: str | None,
) -> RenderableType:
    # delimiter text
    delimeter = "---------------------------------------------------------"

    # root table for output
    table = Table.grid(expand=False)
    table.add_column()
    table.add_row(delimeter)

    # title and subtitle
    table.add_row(task_panel_title(profile, show_model))
    if isinstance(subtitle, tuple):
        subtitle = subtitle[0]
    table.add_row(subtitle)

    # task info
    if body:
        table.add_row(body)

    # footer
    if isinstance(footer, tuple):
        footer = footer[0]
    if footer:
        table.add_row(footer)

    # log location
    if log_location:
        # Print a cwd relative path
        try:
            log_location_relative = cwd_relative_path(log_location, walk_up=True)
        except ValueError:
            log_location_relative = log_location
        table.add_row(f"Log: {log_location_relative}")

    table.add_row(delimeter)
    table.add_row("")

    return table


def task_panel_title(profile: TaskProfile, show_model: bool) -> str:
    theme = rich_theme()
    return (
        f"[bold][{theme.meta}]{task_title(profile, show_model)}[/{theme.meta}][/bold]"
    )


def to_renderable(item: RenderableType | str, style: str = "") -> RenderableType:
    if isinstance(item, str):
        return Text.from_markup(item, style=style)
    else:
        return item


def tasks_title(completed: int, total: int) -> str:
    return f"{completed}/{total} tasks complete"


def task_title(profile: TaskProfile, show_model: bool) -> str:
    eval_epochs = profile.eval_config.epochs or 1
    epochs = f" x {profile.eval_config.epochs}" if eval_epochs > 1 else ""
    samples = f"{profile.samples // eval_epochs:,}{epochs} sample{'s' if profile.samples != 1 else ''}"
    title = f"{task_display_name(profile.name)} ({samples})"
    if show_model:
        title = f"{title}: {profile.model}"
    return title


def task_targets(profile: TaskProfile) -> str:
    return f"dataset: {profile.dataset}"
```

## `_display/core/progress.py`

```python
from typing import Callable

import rich
from rich.progress import (
    BarColumn,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
)
from rich.progress import Progress as RProgress
from rich.text import Text
from typing_extensions import override

from inspect_ai._util.task import task_display_name
from inspect_ai.model._model import ModelName

from .display import Progress, TaskCancelled, TaskError, TaskProfile, TaskResult
from .rich import is_vscode_notebook, rich_theme

# Note that use of rich progress seems to result in an extra
# empty cell after execution, see: https://github.com/Textualize/rich/issues/3274

PROGRESS_TOTAL = 102


class RichProgress(Progress):
    def __init__(
        self,
        total: int,
        progress: RProgress,
        description: str = "",
        model: str = "",
        status: Callable[[], str] | None = None,
        on_update: Callable[[], None] | None = None,
        count: str = "",
        score: str = "",
    ) -> None:
        self.total = total
        self.progress = progress
        self.status = status if status else lambda: ""
        self.on_update = on_update
        self.task_id = progress.add_task(
            description,
            total=PROGRESS_TOTAL,
            model=model,
            status=self.status(),
            count=count,
            score=score,
        )

    @override
    def update(self, n: int = 1) -> None:
        advance = (float(n) / float(self.total)) * 100
        self.progress.update(
            task_id=self.task_id, advance=advance, refresh=True, status=self.status()
        )
        if self.on_update:
            self.on_update()

    @override
    def complete(self) -> None:
        self.progress.update(
            task_id=self.task_id, completed=PROGRESS_TOTAL, status=self.status()
        )

    def update_count(self, complete: int, total: int) -> None:
        self.progress.update(
            task_id=self.task_id, count=progress_count(complete, total), refresh=True
        )
        if self.on_update:
            self.on_update()

    def update_score(self, score: str) -> None:
        self.progress.update(task_id=self.task_id, score=score)


def rich_progress() -> RProgress:
    console = rich.get_console()
    return RProgress(
        TextColumn("{task.fields[status]}"),
        TextColumn("{task.description}"),
        TextColumn("{task.fields[model]}"),
        BarColumn(bar_width=40 if is_vscode_notebook(console) else None),
        TaskProgressColumn(),
        TextColumn("{task.fields[count]}"),
        TextColumn("{task.fields[score]}"),
        TimeElapsedColumn(),
        transient=True,
        console=console,
        expand=True,
    )


MAX_MODEL_NAME_WIDTH = 25
MAX_DESCRIPTION_WIDTH = 40


def progress_model_name(
    model_name: ModelName, max_width: int = MAX_MODEL_NAME_WIDTH, pad: bool = False
) -> Text:
    model = Text(model_name.name)
    model.truncate(max_width, overflow="ellipsis", pad=pad)
    return model


def progress_description(
    profile: TaskProfile, max_width: int = MAX_DESCRIPTION_WIDTH, pad: bool = False
) -> Text:
    description = Text(task_display_name(profile.name))
    description.truncate(max_width, overflow="ellipsis", pad=pad)
    return description


def progress_status_icon(result: TaskResult | None) -> str:
    theme = rich_theme()
    if result:
        if isinstance(result, TaskError):
            return f"[{theme.error}]✗[{theme.error}]"
        elif isinstance(result, TaskCancelled):
            return f"[{theme.error}]✗[{theme.error}]"
        else:
            return f"[{theme.success}]✔[{theme.success}]"
    else:
        return f"[{theme.meta}]⠿[{theme.meta}]"


def progress_count(complete: int, total: int, width: int | None = None) -> str:
    # Pad the display to keep it stable as the
    # complete metrics
    total_str = f"{total:,}"
    complete_str = f"{complete:,}"
    padding = max(0, len(total_str) - len(complete_str))
    padded = " " * padding + f"{complete_str}/{total_str}"

    # If a width has ben specified, pad up to this width as well
    if width is not None:
        padded = padded.rjust(width)
    return padded
```

## `_display/core/results.py`

```python
from typing import Sequence, Set

import numpy as np
from rich.console import Group, RenderableType
from rich.table import Table
from rich.text import Text

from inspect_ai._util.dateutil import datetime_from_iso_format_safe
from inspect_ai._util.rich import rich_traceback
from inspect_ai.log import EvalStats
from inspect_ai.log._log import EvalScore
from inspect_ai.model._model_output import ModelUsage

from .config import task_config, task_dict
from .display import (
    TaskCancelled,
    TaskDisplayMetric,
    TaskError,
    TaskProfile,
    TaskSuccess,
    TaskWithResult,
)
from .panel import task_panel
from .rich import rich_theme


def tasks_results(tasks: Sequence[TaskWithResult]) -> RenderableType:
    def render_task(task: TaskWithResult) -> RenderableType:
        if isinstance(task.result, TaskCancelled):
            return task_result_cancelled(task.profile, task.result)
        elif isinstance(task.result, TaskError):
            return task_result_error(task.profile, task.result)
        elif isinstance(task.result, TaskSuccess):
            return task_result_summary(task.profile, task.result)
        else:
            return ""

    return Group(*[render_task(task) for task in tasks])


def task_result_cancelled(
    profile: TaskProfile, cancelled: TaskCancelled
) -> RenderableType:
    # The contents of the panel
    config = task_config(profile)
    body = task_stats(cancelled.stats)

    # The panel
    return task_panel(
        profile=profile,
        show_model=True,
        body=body,
        subtitle=config,
        footer=task_interrupted(profile, cancelled.samples_completed),
        log_location=profile.log_location,
    )


def task_results(profile: TaskProfile, success: TaskSuccess) -> RenderableType:
    theme = rich_theme()

    grid = Table.grid(expand=True)
    grid.add_column()

    if success.results.scores:
        for row in task_scores(success.results.scores):
            grid.add_row(row)

    # note if some of our samples had errors or were stopped early
    if success.samples_completed < profile.samples:
        # pending message
        message: list[str] = []

        # early stopped
        samples_early_stopped = (
            len(success.results.early_stopping.early_stops)
            if success.results.early_stopping
            else 0
        )
        if samples_early_stopped > 0:
            sample_early_stop_pct = int(
                float(samples_early_stopped) / float(profile.samples) * 100
            )
            message.append(
                f"[{theme.meta}]NOTE: {samples_early_stopped} of {profile.samples} samples ({sample_early_stop_pct}%) were not executed due to early stopping.[/{theme.meta}]"
            )

        # executed
        samples_executed = profile.samples - samples_early_stopped

        # errors
        sample_errors = samples_executed - success.samples_completed
        if sample_errors > 0:
            sample_error_pct = int(float(sample_errors) / float(samples_executed) * 100)
            message.append(
                f"[{theme.warning}]WARNING: {sample_errors} of {samples_executed} executed samples ({sample_error_pct}%) had errors and were not scored.[/{theme.warning}]"
            )

        # return special messages if we have them
        if len(message) > 0:
            return Group(grid, "\n" + "\n\n".join(message))

    return grid


SCORES_PER_ROW = 4


def task_scores(scores: list[EvalScore], pad_edge: bool = False) -> list[Table]:
    rows: list[Table] = []

    # Process scores in groups
    for i in range(0, len(scores), SCORES_PER_ROW):
        # Create a grid for this row of scores
        score_row = Table.grid(
            expand=False,
            padding=(0, 2, 0, 0),
        )

        # Add columns for each score in this row
        for _ in range(SCORES_PER_ROW):
            score_row.add_column()

        # Create individual score tables and add them to the row
        score_tables: list[Table | str] = []
        for score in scores[i : i + SCORES_PER_ROW]:
            table = Table(
                show_header=False,
                show_lines=False,
                box=None,
                show_edge=False,
                pad_edge=pad_edge,
            )
            table.add_column()
            table.add_column()

            # Add score name and metrics
            table.add_row(f"[bold]{score.name}[/bold]")
            for name, metric in score.metrics.items():
                table.add_row(f"{name}", f"{metric.value:.3f}")

            score_tables.append(table)

        # Fill remaining slots with empty tables if needed
        while len(score_tables) < SCORES_PER_ROW:
            score_tables.append("")

        # Add the score tables to this row
        score_row.add_row(*score_tables)

        # Add this row of scores to the main grid
        rows.append(score_row)

    return rows


def task_result_summary(profile: TaskProfile, success: TaskSuccess) -> RenderableType:
    # The contents of the panel
    config = task_config(profile)
    body = task_stats(success.stats)

    # the panel
    return task_panel(
        profile=profile,
        show_model=True,
        body=body,
        subtitle=config,
        footer=task_results(profile, success),
        log_location=profile.log_location,
    )


def task_result_error(profile: TaskProfile, error: TaskError) -> RenderableType:
    return task_panel(
        profile=profile,
        show_model=True,
        body=rich_traceback(error.exc_type, error.exc_value, error.traceback),
        subtitle=None,
        footer=task_interrupted(profile, error.samples_completed),
        log_location=profile.log_location,
    )


def task_stats(stats: EvalStats) -> RenderableType:
    theme = rich_theme()
    panel = Table.grid(expand=True)
    panel.add_column()
    if len(stats.model_usage) < 2:
        panel.add_row()

    table = Table.grid(expand=True)
    table.add_column(style="bold")
    table.add_column()

    # eval time
    started = datetime_from_iso_format_safe(stats.started_at)
    completed = datetime_from_iso_format_safe(stats.completed_at)
    elapsed = completed - started
    table.add_row(Text("total time:", style="bold"), f"  {elapsed}", style=theme.light)

    # token usage
    for model, usage in stats.model_usage.items():
        table.add_row(
            *model_usage_summary(model, usage),
            style=theme.light,
        )

    panel.add_row(table)

    # role usage
    if stats.role_usage and len(stats.role_usage) > 0:
        role_table = Table.grid(expand=True)
        role_table.add_column(style="bold")
        role_table.add_column()

        for role, usage in stats.role_usage.items():
            role_table.add_row(
                *model_usage_summary(f"{role} (role)", usage),
                style=theme.light,
            )

        panel.add_row(role_table)

    return panel


def model_usage_summary(model: str, usage: ModelUsage) -> list[RenderableType]:
    if (
        usage.input_tokens_cache_read is not None
        or usage.input_tokens_cache_write is not None
    ):
        input_tokens_cache_read = usage.input_tokens_cache_read or 0
        input_tokens_cache_write = usage.input_tokens_cache_write or 0
        input_tokens = f"[bold]I: [/bold]{usage.input_tokens:,}, [bold]CW: [/bold]{input_tokens_cache_write:,}, [bold]CR: [/bold]{input_tokens_cache_read:,}"
    else:
        input_tokens = f"[bold]I: [/bold]{usage.input_tokens:,}"

    if usage.reasoning_tokens is not None:
        reasoning_tokens = f", [bold]R: [/bold]{usage.reasoning_tokens:,}"
    else:
        reasoning_tokens = ""

    return [
        Text(model, style="bold"),
        f"  {usage.total_tokens:,} tokens [{input_tokens}, [bold]O: [/bold]{usage.output_tokens:,}{reasoning_tokens}]",
    ]


def task_can_retry(profile: TaskProfile) -> bool:
    return profile.file is not None or "/" in profile.name


def task_interrupted(profile: TaskProfile, samples_completed: int) -> RenderableType:
    log_location = profile.log_location
    theme = rich_theme()
    message = f"[bold][{theme.error}]Task interrupted ("
    if samples_completed > 0:
        message = f"{message}{samples_completed:,} of {profile.samples:,} total samples logged before interruption)."
        if task_can_retry(profile):
            message = (
                f"{message} Resume task with:[/{theme.error}][/bold]\n\n"
                + f"[bold][{theme.light}]inspect eval-retry {log_location}[/{theme.light}][/bold]"
            )
        else:
            message = f"{message}[/{theme.error}][/bold]"
    else:
        message = (
            f"{message}no samples completed before interruption)[/{theme.error}][/bold]"
        )

    return message


def task_metric(metrics: list[TaskDisplayMetric], width: int | None = None) -> str:
    reducer_names: Set[str] = {
        metric.reducer for metric in metrics if metric.reducer is not None
    }
    show_reducer = len(reducer_names) > 1 or (
        len(reducer_names) == 1 and "avg" not in reducer_names
    )

    metric = metrics[0]
    if metric.value is None or np.isnan(metric.value):
        value = " n/a"
    else:
        value = f"{metric.value:.2f}"

    if show_reducer and metric.reducer is not None:
        metric_str = f"{metric.name}/{metric.reducer}: {value}"
    else:
        metric_str = f"{metric.name}: {value}"

    if width is not None:
        metric_str = metric_str.rjust(width)
    return metric_str


def task_metrics(scores: list[EvalScore]) -> str:
    theme = rich_theme()
    scorer_names: Set[str] = {score.name for score in scores}
    reducer_names: Set[str] = {
        score.reducer for score in scores if score.reducer is not None
    }
    show_reducer = len(reducer_names) > 1 or "avg" not in reducer_names
    output: dict[str, str] = {}
    for score in scores:
        for name, metric in score.metrics.items():
            value = (
                "1.0"
                if metric.value == 1
                else (
                    str(metric.value)
                    if isinstance(metric.value, int)
                    else f"{metric.value:.3g}"
                )
            )
            name = (
                rf"{name}\[{score.reducer}]"
                if show_reducer and score.reducer is not None
                else name
            )
            key = f"{score.name}/{name}" if (len(scorer_names) > 1) else name
            output[key] = value

    if output:
        return f"[{theme.metric}]{task_dict(output, True)}[/{theme.metric}]"
    else:
        return ""
```

## `_display/core/rich.py`

```python
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator

import rich
from rich.console import Console, ConsoleOptions, RenderResult
from rich.markdown import CodeBlock, Markdown
from rich.segment import Segment
from rich.syntax import Syntax
from typing_extensions import override

from inspect_ai._util.platform import is_running_in_jupyterlab, is_running_in_vscode
from inspect_ai._util.transcript import transcript_code_theme
from inspect_ai.util._display import DisplayType, display_type, display_type_plain


def is_vscode_notebook(console: Console) -> bool:
    return console.is_jupyter and is_running_in_vscode()


def rich_no_color(plain: bool) -> bool:
    return plain or not is_running_in_vscode() or is_running_in_jupyterlab()


def rich_initialise(
    display: DisplayType | None = None, plain: bool | None = None
) -> None:
    # default args
    display = display if display is not None else display_type()
    plain = plain if plain is not None else display_type_plain()

    # reflect ansi prefs
    if plain:
        rich.reconfigure(no_color=True, force_terminal=False, force_interactive=False)
    elif rich_no_color(plain):
        rich.reconfigure(no_color=True)

    # reflect display == none
    if display == "none":
        rich.reconfigure(quiet=True)

    # consistent markdown code bock background
    class CustomCodeBlock(CodeBlock):
        @override
        def __rich_console__(
            self, console: Console, options: ConsoleOptions
        ) -> RenderResult:
            code = str(self.text).rstrip()
            syntax = Syntax(
                code,
                self.lexer_name,
                theme=transcript_code_theme(),
                word_wrap=True,
                background_color="#282c34",
                padding=0,
            )
            yield syntax

    Markdown.elements["fence"] = CustomCodeBlock
    Markdown.elements["code_block"] = CustomCodeBlock


@dataclass
class RichTheme:
    meta: str = "blue"
    light: str = "bright_black"
    metric: str = "green"
    link: str = "blue"
    success: str = "green"
    error: str = "red"
    warning: str = "orange3"


def rich_theme() -> RichTheme:
    global _theme
    if _theme is None:
        _theme = RichTheme()
    return _theme


_theme: RichTheme | None = None


@contextmanager
def record_console_input() -> Iterator[None]:
    # monkey patch .input method to record inputs
    input_original = Console.input

    def input_with_record(self: Console, *args: Any, **kwargs: Any) -> str:
        result = input_original(self, *args, **kwargs)
        if self.record:
            with self._record_buffer_lock:
                self._record_buffer.append(Segment(result))
        return result

    Console.input = input_with_record  # type: ignore

    try:
        yield
    finally:
        Console.input = input_original  # type: ignore
```

## `_display/core/textual.py`

```python
from logging import getLogger

from textual.driver import Driver

logger = getLogger(__name__)


# force mouse support for textual -- this works around an issue where
# mouse events are disabled after a reload of the vs code ide, see:
#   https://github.com/Textualize/textual/issues/5380
# we try/catch since we aren't 100% sure there aren't cases where doing
# this won't raise and we'd rather not fail hard in in these case
def textual_enable_mouse_support(driver: Driver) -> None:
    enable_mouse_support = getattr(driver, "_enable_mouse_support", None)
    if enable_mouse_support:
        try:
            enable_mouse_support()
            # Re-enable SGR-Pixels format if it was previously enabled.
            # See #1943.
            enable_mouse_pixels = getattr(driver, "_enable_mouse_pixels", None)
            if enable_mouse_pixels and getattr(driver, "_mouse_pixels", False):
                enable_mouse_pixels()
        except Exception as ex:
            logger.warning(f"Error enabling mouse support: {ex}")
```

## `_display/log/__init__.py`

```python

```

## `_display/log/display.py`

```python
import contextlib
import logging
from typing import AsyncIterator, Callable, Coroutine, Iterator

import anyio

from inspect_ai._util._async import configured_async_backend, run_coroutine
from inspect_ai._util.dateutil import datetime_from_iso_format_safe
from inspect_ai._util.platform import running_in_notebook
from inspect_ai.log import EvalStats

from ...util import throttle
from ...util._concurrency import concurrency_status_display
from ..core.config import task_config_str
from ..core.display import (
    TR,
    Display,
    Progress,
    TaskCancelled,
    TaskDisplay,
    TaskDisplayMetric,
    TaskError,
    TaskProfile,
    TaskResult,
    TaskScreen,
    TaskSpec,
    TaskSuccess,
    TaskWithResult,
)
from ..core.footer import task_http_retries_str, task_refusals_str
from ..core.panel import task_title
from ..core.results import task_metric


class LogDisplay(Display):
    def __init__(self) -> None:
        self.total_tasks: int = 0
        self.tasks: list[TaskWithResult] = []
        self.parallel = False

    def print(self, message: str) -> None:
        logging.info(message, stacklevel=2)

    @contextlib.contextmanager
    def progress(self, total: int) -> Iterator[Progress]:
        yield LogProgress(total)

    def run_task_app(self, main: Callable[[], Coroutine[None, None, TR]]) -> TR:
        if running_in_notebook():
            return run_coroutine(main())
        else:
            return anyio.run(main, backend=configured_async_backend())

    @contextlib.contextmanager
    def suspend_task_app(self) -> Iterator[None]:
        yield

    @contextlib.asynccontextmanager
    async def task_screen(
        self, tasks: list[TaskSpec], parallel: bool
    ) -> AsyncIterator[TaskScreen]:
        self.total_tasks = len(tasks)
        self.tasks = []
        self.parallel = parallel
        logging.info(f"Running {self.total_tasks} tasks...", stacklevel=3)
        yield TaskScreen()

    @contextlib.contextmanager
    def task(self, profile: TaskProfile) -> Iterator[TaskDisplay]:
        # Create and yield task display
        task = TaskWithResult(profile, None)
        self.tasks.append(task)
        yield LogTaskDisplay(task)
        self._log_result(task)
        self._log_status()

    def display_counter(self, caption: str, value: str) -> None:
        logging.info(f"{caption}: {value}", stacklevel=2)

    def _log_status(self) -> None:
        """Log status updates for all tasks"""
        completed_tasks = sum(1 for task in self.tasks if task.result is not None)
        total_tasks = len(self.tasks)
        logging.info(f"{completed_tasks}/{total_tasks} tasks complete", stacklevel=4)

    def _task_stats_str(self, stats: EvalStats) -> str:
        # eval time
        started = datetime_from_iso_format_safe(stats.started_at)
        completed = datetime_from_iso_format_safe(stats.completed_at)
        elapsed = completed - started
        res = f"total time: {elapsed}"
        # token usage
        for model, usage in stats.model_usage.items():
            if (
                usage.input_tokens_cache_read is not None
                or usage.input_tokens_cache_write is not None
            ):
                input_tokens_cache_read = usage.input_tokens_cache_read or 0
                input_tokens_cache_write = usage.input_tokens_cache_write or 0
                input_tokens = f"I: {usage.input_tokens:,}, CW: {input_tokens_cache_write:,}, CR: {input_tokens_cache_read:,}"
            else:
                input_tokens = f"I: {usage.input_tokens:,}"

            if usage.reasoning_tokens is not None:
                reasoning_tokens = f", R: {usage.reasoning_tokens:,}"
            else:
                reasoning_tokens = ""

            model_token_usage = f"{model}:  {usage.total_tokens:,} tokens [{input_tokens}, O: {usage.output_tokens:,}{reasoning_tokens}]"

            res += f"\n{model_token_usage}"

        return res

    def _log_result(self, task: TaskWithResult) -> None:
        """Log final result"""
        title = task_title(task.profile, True)
        if isinstance(task.result, TaskCancelled):
            config = task_config_str(task.profile)
            stats = self._task_stats_str(task.result.stats)
            logging.info(
                f"{title} cancelled ({task.result.samples_completed}/{task.profile.samples} logged)\n{config}\n{stats}",
                stacklevel=4,
            )
        elif isinstance(task.result, TaskError):
            logging.error(
                f"{title} failed ({task.result.samples_completed}/{task.profile.samples} logged)",
                exc_info=(
                    task.result.exc_type,
                    task.result.exc_value,
                    task.result.traceback,
                ),
                stacklevel=4,
            )
        elif isinstance(task.result, TaskSuccess):
            config = task_config_str(task.profile)
            stats = self._task_stats_str(task.result.stats)
            logging.info(f"{title} succeeded\n{config}\n{stats}", stacklevel=4)


class LogProgress(Progress):
    def __init__(self, total: int):
        self.total = total
        self.current = 0

    def update(self, n: int = 1) -> None:
        self.current += n

    def complete(self) -> None:
        self.current = self.total


class LogTaskDisplay(TaskDisplay):
    def __init__(self, task: TaskWithResult):
        self.task = task
        self.progress_display: LogProgress | None = None
        self.samples_complete = 0
        self.samples_total = 0
        self.current_metrics: list[TaskDisplayMetric] | None = None

    @contextlib.contextmanager
    def progress(self) -> Iterator[Progress]:
        self.progress_display = LogProgress(self.task.profile.steps)
        yield self.progress_display

    @throttle(5)
    def _log_status_throttled(self, stacklevel: int) -> None:
        self._log_status(stacklevel=stacklevel + 2)

    def _log_status(self, stacklevel: int) -> None:
        """Log status updates"""
        status_parts: list[str] = []

        # Add task name and model
        status_parts.append(f"Task: {self.task.profile.name}")
        status_parts.append(f"Model: {self.task.profile.model}")

        # Add step progress
        if self.progress_display:
            progress_percent = int(
                self.progress_display.current / self.progress_display.total * 100
            )
            status_parts.append(
                f"Steps: {self.progress_display.current}/{self.progress_display.total} {progress_percent}%"
            )

        # Add sample progress
        status_parts.append(f"Samples: {self.samples_complete}/{self.samples_total}")

        # Add metrics
        if self.current_metrics:
            metric_str = task_metric(self.current_metrics)
            status_parts.append(metric_str)

        # Add resource usage
        resources_dict: dict[str, str] = {}
        for model, resource in concurrency_status_display().items():
            resources_dict[model] = f"{resource[0]}/{resource[1]}"
        resources = ", ".join(
            [f"{key}: {value}" for key, value in resources_dict.items()]
        )
        status_parts.append(resources)

        # Add rate limits and refusals
        rate_limits = task_http_retries_str()
        if rate_limits:
            status_parts.append(rate_limits)
        refusals = task_refusals_str()
        if refusals:
            status_parts.append(refusals)

        # Print on new line
        logging.info(", ".join(status_parts), stacklevel=stacklevel)

    def sample_complete(self, complete: int, total: int) -> None:
        self.samples_complete = complete
        self.samples_total = total
        self._log_status_throttled(stacklevel=3)

    def update_metrics(self, metrics: list[TaskDisplayMetric]) -> None:
        self.current_metrics = metrics
        self._log_status_throttled(stacklevel=3)

    def complete(self, result: TaskResult) -> None:
        self.task.result = result
        self._log_status(stacklevel=3)
```

## `_display/plain/__init__.py`

```python

```

## `_display/plain/display.py`

```python
import contextlib
from typing import AsyncIterator, Callable, Coroutine, Iterator

import anyio
import rich

from inspect_ai._display.core.rich import rich_initialise
from inspect_ai._util._async import configured_async_backend, run_coroutine
from inspect_ai._util.platform import running_in_notebook
from inspect_ai._util.text import truncate
from inspect_ai._util.throttle import throttle

from ...util._concurrency import concurrency_status_display
from ..core.config import task_config
from ..core.display import (
    TR,
    Display,
    Progress,
    TaskDisplay,
    TaskDisplayMetric,
    TaskProfile,
    TaskResult,
    TaskScreen,
    TaskSpec,
    TaskWithResult,
)
from ..core.footer import task_http_retries_str, task_refusals_str
from ..core.panel import task_panel
from ..core.results import task_metric, tasks_results


class PlainDisplay(Display):
    def __init__(self) -> None:
        self.total_tasks: int = 0
        self.tasks: list[TaskWithResult] = []
        self.parallel = False
        rich_initialise()

    def print(self, message: str) -> None:
        print(message)

    @contextlib.contextmanager
    def progress(self, total: int) -> Iterator[Progress]:
        yield PlainProgress(total)

    def run_task_app(self, main: Callable[[], Coroutine[None, None, TR]]) -> TR:
        if running_in_notebook():
            return run_coroutine(main())
        else:
            return anyio.run(main, backend=configured_async_backend())

    @contextlib.contextmanager
    def suspend_task_app(self) -> Iterator[None]:
        yield

    @contextlib.asynccontextmanager
    async def task_screen(
        self, tasks: list[TaskSpec], parallel: bool
    ) -> AsyncIterator[TaskScreen]:
        self.total_tasks = len(tasks)
        self.multiple_task_names = len({task.name for task in tasks}) > 1
        self.multiple_model_names = len({str(task.model) for task in tasks}) > 1
        self.tasks = []
        self.parallel = parallel
        try:
            # Print header for task(s)
            if parallel:
                print(f"Running {self.total_tasks} tasks...")
            yield TaskScreen()
        finally:
            # Print final results
            if self.tasks:
                self._print_results()

    @contextlib.contextmanager
    def task(self, profile: TaskProfile) -> Iterator[TaskDisplay]:
        # Print initial task information using a rich panel
        panel = task_panel(
            profile=profile,
            show_model=True,
            body="",  # Empty body since we haven't started yet
            subtitle=task_config(profile),
            footer=None,
            log_location=None,
        )
        rich.print(panel)

        # Create and yield task display
        task = TaskWithResult(profile, None)
        self.tasks.append(task)
        yield PlainTaskDisplay(
            task,
            show_task_names=self.multiple_task_names,
            show_model_names=self.multiple_model_names,
        )

    def display_counter(self, caption: str, value: str) -> None:
        # Not supported for plain display as counters are only shown for tasks.
        pass

    def _print_results(self) -> None:
        """Print final results using rich panels"""
        panels = tasks_results(self.tasks)
        rich.print(panels)


class PlainProgress(Progress):
    def __init__(self, total: int):
        self.total = total
        self.current = 0

    def update(self, n: int = 1) -> None:
        self.current += n
        # No direct printing - PlainTaskDisplay handles it

    def complete(self) -> None:
        self.current = self.total


class PlainTaskDisplay(TaskDisplay):
    def __init__(
        self, task: TaskWithResult, *, show_task_names: bool, show_model_names: bool
    ):
        self.task = task
        self.show_task_names = show_task_names
        self.show_model_names = show_model_names
        self.progress_display: PlainProgress | None = None
        self.samples_complete = 0
        self.samples_total = 0
        self.current_metrics: list[TaskDisplayMetric] | None = None
        self.last_progress = 0

    @contextlib.contextmanager
    def progress(self) -> Iterator[Progress]:
        self.progress_display = PlainProgress(self.task.profile.steps)
        yield self.progress_display

    @throttle(5)
    def _print_status_throttled(self) -> None:
        self._print_status()

    def _print_status(self) -> None:
        """Print status updates on new lines when there's meaningful progress"""
        if not self.progress_display:
            return

        # Only print when step count changes to avoid too much output
        if self.progress_display.current != self.last_progress:
            status_parts: list[str] = []

            # if this is parallel print task and model to distinguish (limit both to 12 chars)
            MAX_NAME_WIDTH = 12
            if self.show_task_names:
                status_parts.append(truncate(self.task.profile.name, MAX_NAME_WIDTH))
            if self.show_model_names:
                status_parts.append(
                    truncate(str(self.task.profile.model), MAX_NAME_WIDTH)
                )

            # Add step progress
            progress_percent = int(
                self.progress_display.current / self.progress_display.total * 100
            )
            status_parts.append(
                f"Steps: {self.progress_display.current:3d}/{self.progress_display.total} {progress_percent:3d}%"
            )

            # Add sample progress
            status_parts.append(
                f"Samples: {self.samples_complete:3d}/{self.samples_total:3d}"
            )

            # Add metrics
            if self.current_metrics:
                metric_str = task_metric(self.current_metrics)
                status_parts.append(metric_str)

            # Add resource usage
            # Very similar to ``inspect_ai._display.core.footer.task_resources``, but without
            # the rich formatting added in the ``task_dict`` call
            resources_dict: dict[str, str] = {}
            for model, resource in concurrency_status_display().items():
                resources_dict[model] = f"{resource[0]:2d}/{resource[1]:2d}"
            resources = ", ".join(
                [f"{key}: {value}" for key, value in resources_dict.items()]
            )
            status_parts.append(resources)

            # Add rate limits
            rate_limits = task_http_retries_str()
            if rate_limits:
                status_parts.append(rate_limits)
            refusals = task_refusals_str()
            if refusals:
                status_parts.append(refusals)

            # Print on new line
            print(" | ".join(status_parts))

            self.last_progress = self.progress_display.current

    def sample_complete(self, complete: int, total: int) -> None:
        self.samples_complete = complete
        self.samples_total = total
        self._print_status_throttled()

    def update_metrics(self, metrics: list[TaskDisplayMetric]) -> None:
        self.current_metrics = metrics
        self._print_status_throttled()

    def complete(self, result: TaskResult) -> None:
        self.task.result = result
        self._print_status()
        print("")
```

## `_display/rich/__init__.py`

```python

```

## `_display/rich/display.py`

```python
import contextlib
from dataclasses import dataclass
from typing import Any, AsyncIterator, Callable, Coroutine, Iterator

import anyio
import rich
from rich.console import Console, Group, RenderableType
from rich.live import Live
from rich.panel import Panel
from rich.progress import Progress as RProgress
from rich.table import Table
from typing_extensions import override

from inspect_ai._util._async import configured_async_backend, run_coroutine
from inspect_ai._util.constants import CONSOLE_DISPLAY_WIDTH
from inspect_ai._util.platform import running_in_notebook
from inspect_ai.event._input import InputEvent
from inspect_ai.log._transcript import transcript
from inspect_ai.util._display import display_type
from inspect_ai.util._throttle import throttle

from ..core.config import task_config
from ..core.display import (
    TR,
    Display,
    Progress,
    TaskDisplay,
    TaskDisplayMetric,
    TaskProfile,
    TaskResult,
    TaskScreen,
    TaskSpec,
    TaskWithResult,
)
from ..core.footer import task_footer
from ..core.panel import task_panel, task_title, tasks_title
from ..core.progress import (
    RichProgress,
    progress_description,
    progress_model_name,
    progress_status_icon,
    rich_progress,
)
from ..core.results import task_metric, tasks_results
from ..core.rich import (
    is_vscode_notebook,
    record_console_input,
    rich_initialise,
    rich_theme,
)


@dataclass
class TaskStatus(TaskWithResult):
    progress: RProgress


class RichDisplay(Display):
    def __init__(self) -> None:
        self.total_tasks: int = 0
        self.tasks: list[TaskStatus] = []
        self.progress_ui: RProgress | None = None
        self.parallel = False
        self.live: Live | None = None
        self.counters: dict[str, str] = {}
        rich_initialise()

    @override
    def print(self, message: str) -> None:
        rich.get_console().print(message, markup=False, highlight=False)

    @override
    @contextlib.contextmanager
    def progress(self, total: int) -> Iterator[Progress]:
        with rich_progress() as progress:
            yield RichProgress(total, progress)

    @override
    def run_task_app(self, main: Callable[[], Coroutine[None, None, TR]]) -> TR:
        if running_in_notebook():
            return run_coroutine(main())
        else:
            return anyio.run(main, backend=configured_async_backend())

    @override
    @contextlib.contextmanager
    def suspend_task_app(self) -> Iterator[None]:
        yield

    @override
    @contextlib.asynccontextmanager
    async def task_screen(
        self, tasks: list[TaskSpec], parallel: bool
    ) -> AsyncIterator[TaskScreen]:
        self.total_tasks = len(tasks)
        self.tasks = []
        self.progress_ui = rich_progress()
        self.parallel = parallel
        try:
            with (
                Live(
                    None,
                    console=rich.get_console(),
                    transient=True,
                    auto_refresh=False,
                ) as live,
            ):
                # save reference to live
                with RichTaskScreen(live) as task_screen:
                    self.live = live

                    async with anyio.create_task_group() as tg:
                        # update display every second while running
                        tg.start_soon(self._update_display_loop)

                        # let the task screen run
                        try:
                            yield task_screen
                        finally:
                            tg.cancel_scope.cancel()

                # render task results (re-enable live if necessary)
                if not live.is_started:
                    live.start()
                live.transient = False
                live.update(tasks_results(self.tasks), refresh=True)
        finally:
            # clear tasks and progress
            self.total_tasks = 0
            self.tasks = []
            self.progress_ui = None
            self.parallel = False
            self.live = None

    @override
    @contextlib.contextmanager
    def task(self, profile: TaskProfile) -> Iterator[TaskDisplay]:
        # for typechekcer
        if self.tasks is None:
            self.tasks = []
        if self.progress_ui is None:
            self.progress_ui = rich_progress()

        status = TaskStatus(profile, None, self.progress_ui)
        self.tasks.append(status)
        self._update_display()
        yield RichTaskDisplay(
            status, show_name=self.parallel, on_update=self._update_display
        )

    @throttle(1)
    def _update_display(self) -> None:
        if (
            display_type() != "conversation"
            and self.tasks is not None
            and self.tasks
            and self.progress_ui is not None
            and self.live is not None
            and self.live.is_started
        ):
            if self.parallel:
                r = tasks_live_status(
                    self.total_tasks, self.tasks, self.progress_ui, self.counters
                )
            else:
                r = task_live_status(self.tasks, self.progress_ui, self.counters)
            self.live.update(r, refresh=True)

    async def _update_display_loop(self) -> None:
        try:
            while True:
                await anyio.sleep(1)
                self._update_display()
        except Exception:
            pass

    @override
    def display_counter(self, caption: str, value: str) -> None:
        self.counters[caption] = value
        self._update_display()


class RichTaskScreen(TaskScreen):
    def __init__(self, live: Live) -> None:
        self.theme = rich_theme()
        self.live = live
        status_text = "Working" if display_type() == "conversation" else "Task running"
        self.status = self.live.console.status(
            f"[{self.theme.meta} bold]{status_text}...[/{self.theme.meta} bold]",
            spinner="clock",
        )

    def __exit__(self, *excinfo: Any) -> None:
        self.status.stop()

    @override
    @contextlib.contextmanager
    def input_screen(
        self,
        header: str | None = None,
        transient: bool | None = None,
        width: int | None = None,
    ) -> Iterator[Console]:
        # determine transient based on trace mode
        if transient is None:
            transient = display_type() != "conversation"

        # clear live task status and transient status
        self.live.update("", refresh=True)
        self.status.stop()

        # show cursor for input
        self.live.console.show_cursor(True)

        # set width
        old_width: int | None = None
        if width:
            old_width = self.live.console.width
            self.live.console.width = min(old_width, width)

        # record console activity for event
        self.live.console.record = True

        try:
            # print header if requested
            if header:
                style = f"{rich_theme().meta} bold"
                self.live.console.rule(f"[{style}]{header}[/{style}]", style="black")
                self.live.console.print("")

            # yield the console
            with record_console_input():
                yield self.live.console

        finally:
            # capture recording then yield input event
            input = self.live.console.export_text(clear=False, styles=False)
            input_ansi = self.live.console.export_text(clear=True, styles=True)
            self.live.console.record = False
            transcript()._event(InputEvent(input=input, input_ansi=input_ansi))

            # print one blank line
            self.live.console.print("")

            # reset width
            if old_width:
                self.live.console.width = old_width

            # disable cursor while not collecting input
            self.live.console.show_cursor(False)

            # if transient then disable live updates entirely
            if transient is False and self.live.is_started:
                self.live.stop()

            # otherwise make sure they are enabled
            elif transient is True and not self.live.is_started:
                self.live.start()

            # if not transient then display mini-status
            if not transient:
                self.status.start()


class RichTaskDisplay(TaskDisplay):
    def __init__(
        self,
        status: TaskStatus,
        show_name: bool,
        on_update: Callable[[], None] | None = None,
    ) -> None:
        self.status = status
        model = progress_model_name(self.status.profile.model)
        description = progress_description(self.status.profile)

        def task_status() -> str:
            return progress_status_icon(self.status.result)

        self.p = RichProgress(
            total=self.status.profile.steps,
            progress=self.status.progress,
            description=f"{description.markup}",
            model=f"{model.markup} ",
            status=task_status,
            on_update=on_update,
        )

    @override
    @contextlib.contextmanager
    def progress(self) -> Iterator[Progress]:
        yield self.p

    @override
    def sample_complete(self, complete: int, total: int) -> None:
        self.p.update_count(complete, total)

    @override
    def update_metrics(self, metrics: list[TaskDisplayMetric]) -> None:
        if len(metrics) > 0:
            self.p.update_score(task_metric(metrics))

    @override
    def complete(self, result: TaskResult) -> None:
        self.status.result = result
        self.p.complete()


def task_live_status(
    tasks: list[TaskStatus], progress: RProgress, counters: dict[str, str]
) -> RenderableType:
    theme = rich_theme()

    # the panel contents
    config = task_config(tasks[0].profile, style=theme.light)

    # the panel
    return task_panel(
        profile=tasks[0].profile,
        show_model=len(tasks) == 1,
        body=Group("", progress),
        subtitle=config,
        footer=task_footer(counters, theme.light),
        log_location=None,
    )


def tasks_live_status(
    total_tasks: int,
    tasks: list[TaskStatus],
    progress: RProgress,
    counters: dict[str, str],
) -> RenderableType:
    # rendering context
    theme = rich_theme()
    console = rich.get_console()
    width = CONSOLE_DISPLAY_WIDTH if is_vscode_notebook(console) else None

    # compute completed tasks
    completed = sum(1 for task in tasks if task.result is not None)

    # get config
    config = task_config(tasks[0].profile, generate_config=False, style=theme.light)

    # build footer table
    footer_table = Table.grid(expand=True)
    footer_table.add_column()
    footer_table.add_column(justify="right")
    footer = task_footer(counters, theme.light)
    footer_table.add_row()
    footer_table.add_row(footer[0], footer[1])

    # build a layout table
    layout_table = Table.grid(expand=True)
    layout_table.add_column()
    layout_table.add_row(config)
    if config:
        layout_table.add_row("")
    layout_table.add_row(progress)
    layout_table.add_row(footer_table)

    # create panel w/ title
    panel = Panel(
        layout_table,
        title=f"[bold][{theme.meta}]{tasks_title(completed, total_tasks)}[/{theme.meta}][/bold]",
        title_align="left",
        width=width,
        expand=True,
    )
    return panel


def task_no_ansi(profile: TaskProfile) -> str:
    theme = rich_theme()
    message = f"Running task {task_title(profile, True)}"
    config = task_config(profile, style=theme.light)
    if config:
        message = f"{message} (config: {config})"
    return f"{message}...\n"
```

## `_display/textual/app.py`

```python
import contextlib
from asyncio import CancelledError
from typing import (
    Any,
    AsyncIterator,
    Awaitable,
    Callable,
    ClassVar,
    Generic,
    Iterator,
    cast,
)

import anyio
import anyio.from_thread
import rich
from rich.console import Console
from textual.app import App, ComposeResult
from textual.binding import Binding, BindingType
from textual.css.query import NoMatches
from textual.events import Print
from textual.widget import Widget
from textual.widgets import TabbedContent, TabPane
from textual.widgets.tabbed_content import ContentTabs
from textual.worker import Worker, WorkerState
from typing_extensions import override

from inspect_ai._display.core.textual import textual_enable_mouse_support
from inspect_ai._util.html import as_html_id
from inspect_ai.event._input import InputEvent
from inspect_ai.log._samples import active_samples
from inspect_ai.log._transcript import transcript

from ...util._panel import InputPanel
from ..core.config import task_config
from ..core.display import (
    TP,
    TR,
    TaskDisplay,
    TaskProfile,
    TaskScreen,
    TaskSpec,
    TaskWithResult,
)
from ..core.footer import task_footer
from ..core.panel import task_title, tasks_title
from ..core.rich import record_console_input, rich_initialise, rich_theme
from .theme import inspect_dark, inspect_light
from .widgets.console import ConsoleView
from .widgets.footer import AppFooter
from .widgets.samples import SamplesView
from .widgets.tasks import TasksView
from .widgets.titlebar import AppTitlebar


class TaskScreenResult(Generic[TR]):
    def __init__(
        self,
        value: TR | BaseException,
        tasks: list[TaskWithResult],
        output: list[str],
        warnings: list[str],
    ) -> None:
        self.value = value
        self.tasks = tasks
        self.output = output
        self.warnings = warnings


class TaskScreenApp(App[TR]):
    CSS_PATH = "app.tcss"

    BINDINGS: ClassVar[list[BindingType]] = [
        Binding(
            "ctrl+c",
            "quit",
            "Interrupt",
            tooltip="Interrupt the app and return to the command prompt.",
            show=False,
            priority=True,
        )
    ]

    def __init__(self) -> None:
        # call super
        super().__init__()

        # worker and output
        self._worker: Worker[TR] | None = None
        self._error: BaseException | None = None
        self._output: list[str] = []
        self._warnings: list[str] = []

        # task screen
        self._total_tasks = 0
        self._parallel = False
        self._tasks: list[TaskWithResult] = []
        self._counters: dict[str, str] = {}

        # all tasks processed by app
        self._app_tasks: list[TaskWithResult] = []

        # enable rich hooks
        rich_initialise()

    def _watch_app_focus(self, focus: bool) -> None:
        super()._watch_app_focus(focus)

        if focus and self.app._driver:
            textual_enable_mouse_support(self.app._driver)

    def run_app(self, main: Callable[[], Awaitable[TR]]) -> TaskScreenResult[TR]:
        self._worker = self.run_worker(main(), start=False, exit_on_error=False)

        # run the app
        self.run()

        # determine result value
        if self.return_value is not None:
            value: TR | BaseException = self.return_value
        elif self._error is not None:
            value = self._error
        else:
            value = CancelledError()

        # return result w/ output
        return TaskScreenResult(
            value=value,
            tasks=self._app_tasks,
            output=self._output,
            warnings=self._warnings,
        )

    async def on_load(self) -> None:
        # events used to synchronise loading
        self._on_load_app = anyio.Event()
        self._on_app_loaded = anyio.Event()

        # run the workers
        self.workers.start_all()

        # wait until we are given the signal to load
        # if the worker completes in the meantime then there was an error during
        # initialisation, in that case return early, which will enable delivery of
        # the worker error event and standard exit control flow
        while not self._on_load_app.is_set():
            if len(self.workers._workers) == 0:
                return
            await anyio.sleep(0.1)

    @contextlib.contextmanager
    def suspend_app(self) -> Iterator[None]:
        # suspend only if the app is already loaded
        # (otherwise its not yet displayed )
        if self._on_app_loaded.is_set():
            with self.app.suspend():
                try:
                    yield
                finally:
                    self.app.refresh(repaint=True)
        else:
            yield

    # exit the app when the worker terminates
    def on_worker_state_changed(self, event: Worker.StateChanged) -> None:
        if event.worker.state == WorkerState.ERROR:
            self._error = event.worker.error
            self.exit(None, 1)
        elif event.worker.state == WorkerState.CANCELLED:
            self._error = CancelledError()
            self.exit(None, 1)
        elif event.worker.state == WorkerState.SUCCESS:
            self.exit(event.worker.result)

    # notification that a new top level set of tasks are being run
    @contextlib.asynccontextmanager
    async def task_screen(
        self, tasks: list[TaskSpec], parallel: bool
    ) -> AsyncIterator[TaskScreen]:
        # indicate its time to load then wait on the load
        self._on_load_app.set()
        await self._on_app_loaded.wait()

        # reset state
        self._tasks = []
        self._total_tasks = len(tasks)
        self._parallel = parallel

        # clear existing task progress
        tasks_view = self.query_one(TasksView)
        tasks_view.init_tasks(tasks)

        # update display
        self.update_display()

        # force repaint
        self.refresh(repaint=True)

        # enable mouse support (this broke in textual 2.0 when running in VS Code
        # however is fixed in textual 2.1)
        assert self.app._driver
        textual_enable_mouse_support(self.app._driver)

        try:
            yield TextualTaskScreen(self)
        finally:
            self._tasks = []
            self._total_tasks = 0
            self._parallel = False

    # notification that a task is running and requires display
    @contextlib.contextmanager
    def task_display(self, profile: TaskProfile) -> Iterator[TaskDisplay]:
        # create and track task
        task = TaskWithResult(profile, None)
        self._app_tasks.append(task)
        self._tasks.append(task)

        # update display
        self.update_display()

        # add task
        try:
            task_view = self.query_one(TasksView)
            task_view.set_display_metrics(
                profile.eval_config.score_display is not False
            )
            yield task_view.add_task(task)
        finally:
            pass

    # compose use
    def compose(self) -> ComposeResult:
        yield AppTitlebar()
        yield AppFooter()

        with TabbedContent(id="tabs", initial="tasks"):
            with TabPane("Tasks", id="tasks"):
                yield TasksView()
            with TabPane("Running Samples", id="samples"):
                yield SamplesView()
            with TabPane("Console", id="console"):
                yield ConsoleView()

    def on_mount(self) -> None:
        # register and set theme
        self.register_theme(inspect_dark)
        self.register_theme(inspect_light)
        self.theme = "inspect-dark"

        # capture stdout/stderr (works w/ on_print)
        self.begin_capture_print(self)

        # handle tab activations
        self.handle_tab_activations()

        # handle console unread
        self.handle_console_unread()

        # update display every second
        self.set_interval(1, self.update_display)

        # indicate that the app is loaded
        self._on_app_loaded.set()

    # update dynamic parts of display
    def update_display(self) -> None:
        self.update_title()
        self.update_tasks()
        self.update_samples()
        self.update_footer()
        for input_panel in self.query(f".{InputPanel.DEFAULT_CLASSES}"):
            cast(InputPanel, input_panel).update()

    # update the header title
    def update_title(self) -> None:
        # determine title
        if self._worker and self._worker.is_cancelled:
            title = "eval interrupted (cancelling running samples...)"
        elif len(self._tasks) > 0:
            if self._parallel:
                completed = sum(1 for task in self._tasks if task.result is not None)
                title = f"{tasks_title(completed, self._total_tasks)}"
            else:
                title = f"{task_title(self._tasks[0].profile, show_model=len(self._tasks) == 1)}"
        else:
            title = ""

        # set if required
        header = self.query_one(AppTitlebar)
        if header.title != title:
            header.title = title

    def update_tasks(self) -> None:
        tasks = self.query_one(TasksView)
        if len(self._tasks) > 0:
            tasks.config = task_config(
                self._tasks[0].profile, generate_config=not self._parallel
            )
        else:
            tasks.config = ""

    def update_samples(self) -> None:
        samples_view = self.query_one(SamplesView)
        active_and_started_samples = [
            sample for sample in active_samples() if sample.started is not None
        ]
        samples_view.set_samples(active_and_started_samples)

    def update_footer(self) -> None:
        left, right = task_footer(self._counters)
        footer = self.query_one(AppFooter)
        footer.left = left
        footer.right = right

    # track and display console unread state
    def handle_console_unread(self) -> None:
        # unread management
        tabs = self.query_one(TabbedContent)
        console_tab = tabs.get_tab("console")
        console_view = self.query_one(ConsoleView)

        def set_unread(unread: int | None) -> None:
            if unread is not None:
                console_tab.label = f"Console ({unread})"  # type: ignore[assignment]
            else:
                console_tab.label = "Console"  # type: ignore[assignment]

        self.watch(console_view, "unread", set_unread)

    # handle tab activations
    def handle_tab_activations(self) -> None:
        tabs = self.query_one(TabbedContent)
        console_view = self.query_one(ConsoleView)
        samples_view = self.query_one(SamplesView)

        async def set_active_tab(active: str) -> None:
            await console_view.notify_active(active == "console")
            await samples_view.notify_active(active == "samples")

        self.watch(tabs, "active", set_active_tab)

    # activate the tasks tab
    def activate_tasks_tab(self) -> None:
        tasks = self.query_one(TasksView)
        tasks.tasks.focus()  # force the tab to switch by focusing a child
        self.query_one(ContentTabs).focus()  # focus the tab control

    # capture output and route to console view and our buffer
    def on_print(self, event: Print) -> None:
        # remove trailing newline
        text = event.text
        if text.endswith("\n"):
            text = text[:-1]

        # track output and warnings (for printing at the end)
        if "WARNING" in text:
            self._warnings.append(text)
        else:
            self._output.append(text)

        # write to console view
        self.query_one(ConsoleView).write_ansi(text)

    # map ctrl+c to cancelling the worker
    @override
    async def action_quit(self) -> None:
        if self._worker and self._worker.is_running and not self._worker.is_cancelled:
            self._worker.cancel()
            self.update_title()

    # dynamic input panels
    async def add_input_panel(self, panel: InputPanel) -> None:
        tabs = self.query_one(TabbedContent)
        await tabs.add_pane(
            TabPane(panel.title, panel, id=as_input_panel_id(type(panel)))
        )

    def get_input_panel(self, panel_type: type) -> InputPanel | None:
        try:
            tab_pane = self.query_one(f"#{as_input_panel_id(panel_type)}")
            if len(tab_pane.children) > 0:
                return cast(InputPanel, tab_pane.children[0])
            else:
                return None
        except NoMatches:
            return None

    def display_counter(self, caption: str, value: str) -> None:
        self._counters[caption] = value
        self.update_footer()

    class InputPanelHost(InputPanel.Host):
        def __init__(self, app: "TaskScreenApp[TR]", tab_id: str) -> None:
            self.app = app
            self.tab_id = tab_id

        def set_title(self, title: str) -> None:
            tabs = self.app.query_one(TabbedContent)
            tab = tabs.get_tab(self.tab_id)
            tab.label = title  # type: ignore[assignment]

        def activate(self) -> None:
            # show the tab
            tabs = self.app.query_one(TabbedContent)
            tabs.show_tab(self.tab_id)

            # focus the first focuable child (this seems to be necessary
            # to get textual to reliably make the switch). after that, focus
            # the tabs control so the user can switch back w/ the keyboard
            tab_pane = self.app.query_one(f"#{self.tab_id}")
            panel = cast(InputPanel, tab_pane.children[0])
            for child in panel.walk_children(Widget):
                if child.focusable:
                    child.focus()
                    self.app.query_one(ContentTabs).focus()
                    break

        def deactivate(self) -> None:
            tabs = self.app.query_one(TabbedContent)
            if tabs.active == self.tab_id:
                self.app.activate_tasks_tab()

        def close(self) -> None:
            tabs = self.app.query_one(TabbedContent)
            tabs.remove_pane(self.tab_id)
            self.app.activate_tasks_tab()


class TextualTaskScreen(TaskScreen, Generic[TR]):
    def __init__(self, app: TaskScreenApp[TR]) -> None:
        self.app = app
        self.lock = anyio.Lock()

    def __exit__(self, *excinfo: Any) -> None:
        pass

    @override
    @contextlib.contextmanager
    def input_screen(
        self,
        header: str | None = None,
        transient: bool | None = None,
        width: int | None = None,
    ) -> Iterator[Console]:
        with self.app.suspend_app():
            # get rich console
            console = rich.get_console()

            # set width
            old_width: int | None = None
            if width:
                old_width = console.width
                console.width = min(old_width, width)

            # record console activity for event
            console.record = True

            try:
                # print header if requested
                if header:
                    style = f"{rich_theme().meta} bold"
                    console.rule(f"[{style}]{header}[/{style}]", style="black")
                    console.print("")

                # yield the console
                with record_console_input():
                    yield console

            finally:
                # capture recording then yield input event
                input = console.export_text(clear=False, styles=False)
                input_ansi = console.export_text(clear=True, styles=True)
                console.record = False
                transcript()._event(InputEvent(input=input, input_ansi=input_ansi))

                # print one blank line
                console.print("")

                # reset width
                if old_width:
                    console.width = old_width

    @override
    async def input_panel(self, panel_type: type[TP]) -> TP:
        async with self.lock:
            panel_widget = self.app.get_input_panel(panel_type)
            if panel_widget is None:
                panel_widget = panel_type(
                    TaskScreenApp[TR].InputPanelHost(
                        self.app, as_input_panel_id(panel_type)
                    ),
                )
                await self.app.add_input_panel(panel_widget)
            return cast(TP, panel_widget)


def as_input_panel_id(panel_type: type) -> str:
    return as_html_id("id-input-panel", panel_type.__name__)
```

## `_display/textual/display.py`

```python
import contextlib
from typing import AsyncIterator, Callable, Coroutine, Iterator

import rich
from typing_extensions import override

from ..core.display import (
    TR,
    Display,
    Progress,
    TaskDisplay,
    TaskProfile,
    TaskScreen,
    TaskSpec,
)
from ..core.progress import RichProgress, rich_progress
from ..core.results import tasks_results
from .app import TaskScreenApp


class TextualDisplay(Display):
    @override
    def print(self, message: str) -> None:
        rich.get_console().print(message, markup=False, highlight=False)

    @override
    @contextlib.contextmanager
    def progress(self, total: int) -> Iterator[Progress]:
        with rich_progress() as progress:
            yield RichProgress(total, progress)

    @override
    def run_task_app(self, main: Callable[[], Coroutine[None, None, TR]]) -> TR:
        # create and run the app
        self.app = TaskScreenApp[TR]()
        result = self.app.run_app(main)

        # print output
        if result.output:
            print("\n".join(result.output))

        # print tasks
        rich.print(tasks_results(result.tasks))

        # print warnings
        if result.warnings:
            print("\n".join(result.warnings))

        # raise error as required
        if isinstance(result.value, BaseException):
            raise result.value

        # success! return value
        else:
            return result.value

    @override
    @contextlib.contextmanager
    def suspend_task_app(self) -> Iterator[None]:
        if getattr(self, "app", None) and self.app.is_running:
            with self.app.suspend_app():
                yield
        else:
            yield

    @override
    @contextlib.asynccontextmanager
    async def task_screen(
        self, tasks: list[TaskSpec], parallel: bool
    ) -> AsyncIterator[TaskScreen]:
        async with self.app.task_screen(tasks, parallel) as task_screen:
            yield task_screen

    @override
    @contextlib.contextmanager
    def task(self, profile: TaskProfile) -> Iterator[TaskDisplay]:
        with self.app.task_display(profile) as task_display:
            yield task_display

    @override
    def display_counter(self, caption: str, value: str) -> None:
        self.app.display_counter(caption, value)
```

## `_display/textual/theme.py`

```python
from textual.theme import Theme

inspect_dark = Theme(
    name="inspect-dark",
    primary="#3376CD",
    secondary="#004578",
    accent="#ffa62b",
    warning="#ffa62b",
    error="#ba3c5b",
    success="#408558",
    foreground="#e0e0e0",
)


inspect_light = Theme(
    name="inspect-light",
    primary="#4283CA",
    secondary="#0178D4",
    accent="#ffa62b",
    warning="#ffa62b",
    error="#ba3c5b",
    success="#54B98F",
    surface="#D8D8D8",
    panel="#DFDFDF",
    background="#F8F8F8",
    dark=False,
    variables={
        "footer-key-foreground": "#0178D4",
    },
)
```

## `_display/textual/widgets/clock.py`

```python
from datetime import datetime

from textual.reactive import reactive
from textual.timer import Timer
from textual.widgets import Static

from inspect_ai._util.format import format_progress_time


class Clock(Static):
    DEFAULT_CSS = """
    Clock {
        color: $primary-lighten-3;
    }
    """

    time: reactive[float] = reactive(datetime.now().timestamp)  # noqa: DTZ005
    timer: Timer | None = None

    def __init__(self, interval: int = 1) -> None:
        super().__init__()
        self.start_time: float | None = None
        self.time = datetime.now().timestamp()  # noqa: DTZ005
        self.interval = interval

    def start(self, start_time: float) -> None:
        if start_time != self.start_time:
            self.stop()
            self.start_time = start_time
            self.update_time()
            self.timer = self.set_interval(self.interval, self.update_time)

    def stop(self) -> None:
        self.start_time = None
        if self.timer:
            self.timer.stop()
            self.timer = None

    def on_unmount(self) -> None:
        self.stop()

    def watch_start_time(self, start_time: float | None) -> None:
        if start_time is not None:
            if self.timer is None:
                self.timer = self.set_interval(self.interval, self.update_time)
            self.update(format_progress_time(start_time))
        else:
            self.stop()

    def update_time(self) -> None:
        if self.start_time is not None:
            self.time = datetime.now().timestamp() - self.start_time  # noqa: DTZ005

    def watch_time(self, time: float) -> None:
        self.update(format_progress_time(time))
```

## `_display/textual/widgets/console.py`

```python
from rich.text import Text
from textual.reactive import reactive
from textual.widgets import RichLog

# maximum number of lines to keep in the console
MAX_CONSOLE_LINES = 100


class ConsoleView(RichLog):
    DEFAULT_CSS = """
    ConsoleView {
        scrollbar-size-horizontal: 1;
        scrollbar-size-vertical: 1;
        scrollbar-gutter: stable;
        background: transparent;
    }
    """

    # enable tab container to print our unread count
    unread: reactive[int | None] = reactive(None)

    def __init__(self) -> None:
        super().__init__()
        self.active = False
        self.show_horizontal_scrollbar = False
        self.max_lines = MAX_CONSOLE_LINES

    async def notify_active(self, active: bool) -> None:
        self.active = active
        if self.active:
            self.unread = None

    def write_ansi(self, text: str) -> None:
        # process line by line
        for line in text.splitlines():
            self.write_ansi_line(line)

        # tick unread if we aren't active
        if not self.active and len(text.strip()) > 0:
            self.unread = (self.unread or 0) + 1

    def write_ansi_line(self, line: str) -> None:
        # tweak rich console lines with path at end to not go under the scrollbar
        # (remove two inner spaces and add a space at the end)
        if "[2m" in line:
            chars = list(line)
            removed = 0
            for i in range(len(chars) - 1, -1, -1):
                if chars[i].isspace():
                    chars.pop(i)
                    removed += 1
                    if removed > 1:
                        break
            line = "".join(chars) + " "

        self.write(Text.from_ansi(line))
```

## `_display/textual/widgets/footer.py`

```python
from typing import cast

from rich.console import RenderableType
from textual.app import ComposeResult
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Static


class AppFooter(Widget):
    DEFAULT_CSS = """
    AppFooter {
        layout: grid;
        grid-size: 2 1;
        grid-columns: 1fr auto;
        grid-gutter: 2;
        background: $foreground 5%;
        color: $text-muted;
        dock: bottom;
        height: auto;
        padding: 0 1
    }
    """

    left: reactive[RenderableType] = reactive("")
    right: reactive[RenderableType] = reactive("")

    def compose(self) -> ComposeResult:
        yield Static(id="footer-left", markup=False)
        yield Static(id="footer-right", markup=False)

    def watch_left(self, new_left: RenderableType) -> None:
        footer_left = cast(Static, self.query_one("#footer-left"))
        footer_left.update(new_left)

    def watch_right(self, new_right: RenderableType) -> None:
        footer_right = cast(Static, self.query_one("#footer-right"))
        footer_right.update(new_right)
        if footer_right.tooltip is None:
            footer_right.tooltip = (
                "Execute 'inspect trace http' for a log of all HTTP requests."
            )
```

## `_display/textual/widgets/port_mappings.py`

```python
from typing import Literal

from textual.app import ComposeResult
from textual.containers import HorizontalScroll
from textual.widget import Widget
from textual.widgets import Link, Static

from inspect_ai._util.port_names import get_service_by_port
from inspect_ai.util._sandbox.environment import PortMapping


class PortMappingsView(HorizontalScroll):
    DEFAULT_CSS = """
    PortMappingsView {
      layout: grid;
      height: auto;
      grid-size: 4 3;
      grid-columns: auto auto auto auto;
      grid-gutter: 0 1;
    }
    """

    def __init__(self, ports: list[PortMapping] | None) -> None:
        super().__init__()
        self.ports = ports

    def compose(self) -> ComposeResult:
        if not self.ports:
            return
        yield Static("service")
        yield Static("sandbox")
        yield Static("client")
        yield Static("endpoint")
        mappings_and_services = [
            (mapping, get_service_by_port(mapping.container_port, mapping.protocol))
            for mapping in self.ports
        ]
        remaining_widgets = [
            widget
            for mapping_and_service in mappings_and_services
            for widget in widgets_from_port_mapping(mapping_and_service)
        ]
        for widget in remaining_widgets:
            yield widget


def widgets_for_port_mappings(
    port_mappings: list[PortMapping] | None,
) -> list[Widget]:
    if port_mappings is None:
        return []
    return [
        static
        for mapping in [
            (mapping, get_service_by_port(mapping.container_port, mapping.protocol))
            for mapping in port_mappings
        ]
        for static in widgets_from_port_mapping(mapping)
    ]


def widgets_from_port_mapping(
    mapping_service_tuple: tuple[PortMapping, str | None],
) -> list[Widget]:
    port_mapping, service = mapping_service_tuple
    return [
        widget
        for host_mapping in port_mapping.mappings
        for widget in get_row_widgets(
            port_mapping.protocol,
            host_mapping.host_port,
            port_mapping.container_port,
            service,
        )
    ]


def get_row_widgets(
    protocol: Literal["tcp", "udp"],
    host_port: int,
    container_port: int,
    service: str | None,
) -> list[Widget]:
    url = get_url(
        host_port,
        service,
    )
    return [
        Static(service if service is not None else protocol),
        Static(str(container_port)),
        Static(str(host_port)),
        Link(url) if url is not None else Static("asdf"),
    ]


def get_url(
    host_port: int,
    service: str | None,
) -> str | None:
    if service is not None:
        if service == "noVNC":
            return f"http://localhost:{host_port}?view_only=true&autoconnect=true&resize=scale"

        if service.startswith("HTTP"):
            return f"https://localhost:{host_port}"

        if service.startswith("VNC"):
            return f"vnc://localhost:{host_port}"

    return None
```

## `_display/textual/widgets/samples.py`

```python
import time
from typing import cast
from urllib.parse import urlencode, urlparse, urlunparse

from rich.console import RenderableType
from rich.table import Table
from rich.text import Text
from textual.app import ComposeResult
from textual.containers import (
    Horizontal,
    HorizontalGroup,
    Right,
    Vertical,
    VerticalGroup,
)
from textual.css.query import NoMatches
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import (
    Button,
    Collapsible,
    Link,
    LoadingIndicator,
    OptionList,
    Static,
)
from textual.widgets.option_list import Option, OptionDoesNotExist

from inspect_ai._display.textual.widgets.port_mappings import get_url
from inspect_ai._display.textual.widgets.vscode import conditional_vscode_link
from inspect_ai._util.file import to_uri
from inspect_ai._util.format import format_progress_time
from inspect_ai._util.port_names import get_service_by_port
from inspect_ai._util.task import task_display_name
from inspect_ai._util.vscode import EXTENSION_COMMAND_OPEN_SAMPLE, VSCodeCommand
from inspect_ai.event._tool import ToolEvent
from inspect_ai.log._samples import ActiveSample

from .clock import Clock
from .sandbox import SandboxView
from .transcript import TranscriptView


class SamplesView(Widget):
    DEFAULT_CSS = """
    SamplesView {
        width: 1fr;
        height: 1fr;
        padding: 0 1 0 1;
        layout: grid;
        grid-size: 2 3;
        grid-rows: auto 1fr 3;
        grid-columns: 32 1fr;
        grid-gutter: 1;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self.samples: list[ActiveSample] = []
        self.last_updated = time.perf_counter()

    def compose(self) -> ComposeResult:
        yield SamplesList()
        yield SampleInfo()
        yield TranscriptView()
        yield SampleToolbar()

    def on_mount(self) -> None:
        self.watch(
            self.query_one(SamplesList), "highlighted", self.set_highlighted_sample
        )

    async def notify_active(self, active: bool) -> None:
        try:
            await self.query_one(TranscriptView).notify_active(active)
        except NoMatches:
            pass

    def set_samples(self, samples: list[ActiveSample]) -> None:
        # throttle more aggressively with larger numbers of samples
        throttle = 1 + len(samples) / 500
        current = time.perf_counter()
        if (current - self.last_updated) > throttle:
            self.query_one(SamplesList).set_samples(samples)
            self.last_updated = current

    async def set_highlighted_sample(self, highlighted: int | None) -> None:
        sample_info = self.query_one(SampleInfo)
        sample_vnc = self.query_one(SampleVNC)
        transcript_view = self.query_one(TranscriptView)
        sample_toolbar = self.query_one(SampleToolbar)
        if highlighted is not None:
            sample = self.query_one(SamplesList).sample_for_highlighted(highlighted)
            if sample is not None:
                sample_info.display = True
                transcript_view.display = True
                sample_toolbar.display = True
                await sample_info.sync_sample(sample)
                await sample_vnc.sync_sample(sample)
                await transcript_view.sync_sample(sample)
                await sample_toolbar.sync_sample(sample)
                return

        # otherwise hide ui
        sample_info.display = False
        sample_vnc.display = False
        transcript_view.display = False
        sample_toolbar.display = False


class SamplesList(OptionList):
    DEFAULT_CSS = """
    SamplesList {
        height: 100%;
        scrollbar-size-vertical: 1;
        margin-bottom: 1;
        row-span: 3;
        background: transparent;
    }
    SamplesList:focus > .option-list--option-highlighted {
        background: $primary 40%;
    }

    SamplesList  > .option-list--option-highlighted {
        background: $primary 40%;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self.samples: list[ActiveSample] = []

    def set_samples(self, samples: list[ActiveSample]) -> None:
        # check for a highlighted sample (make sure we don't remove it)
        highlighted_id = (
            self.get_id_at_index(self.highlighted)
            if self.highlighted is not None
            else None
        )
        highlighted_sample = (
            sample_for_id(self.samples, highlighted_id)
            if highlighted_id is not None
            else None
        )

        # assign the new samples
        self.samples = samples.copy()

        # add the highlighted sample if its no longer in the list
        if highlighted_sample and (highlighted_sample not in self.samples):
            self.samples.append(highlighted_sample)

        # sort the samples by running time
        self.samples.sort(key=lambda sample: sample.running_time, reverse=True)

        # rebuild the list
        self.clear_options()
        options: list[Option] = []
        for sample in self.samples:
            table = Table.grid(expand=True)
            table.add_column(width=20)
            table.add_column(width=11, justify="right")
            table.add_column(width=1)
            task_name = Text.from_markup(f"{task_display_name(sample.task)}")
            task_name.truncate(18, overflow="ellipsis", pad=True)
            task_time = Text.from_markup(f"{format_progress_time(sample.running_time)}")
            table.add_row(task_name, task_time, " ")
            sample_id = Text.from_markup(f"id: {sample.sample.id}")
            sample_id.truncate(18, overflow="ellipsis", pad=True)
            sample_epoch = Text.from_markup(f"epoch: {sample.epoch:.0f}")
            table.add_row(
                sample_id,
                sample_epoch,
                " ",
            )
            table.add_row("", "", "")
            options.append(Option(table, id=sample.id))

        self.add_options(options)

        # select sample (re-select the highlighted sample if there is one)
        if len(self.samples) > 0:
            if highlighted_id is not None:
                index = sample_index_for_id(self.samples, highlighted_id)
            else:
                index = 0
            self.highlighted = index
            self.scroll_to_highlight()

    def sample_for_highlighted(self, highlighted: int) -> ActiveSample | None:
        highlighted_id = self.get_id_at_index(highlighted)
        if highlighted_id is not None:
            return sample_for_id(self.samples, highlighted_id)
        else:
            return None

    def get_id_at_index(self, index: int) -> str | None:
        try:
            return self.get_option_at_index(index).id
        except OptionDoesNotExist:
            return None


class SampleVNC(Horizontal):
    DEFAULT_CSS = """
    SampleVNC {
        layout: grid;
        grid-size: 2 1;
        grid-columns: auto 1fr;
    }
    SampleVNC Static {
        color: $secondary;
    }
    SampleVNC Link {
        color: $accent;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self._sample: ActiveSample | None = None

    def compose(self) -> ComposeResult:
        yield Static("VNC: ")
        yield Link("")

    async def sync_sample(self, sample: ActiveSample) -> None:
        if sample == self._sample:
            return

        # defult to hidden (show if we find a vnc connection)
        self.display = False

        # is there a vnc connection? if so populate
        for connection in [c for c in sample.sandboxes.values() if c.ports]:
            for port in connection.ports or []:
                service = get_service_by_port(port.container_port, port.protocol)
                if service == "noVNC" and port.mappings:
                    host_mappings = port.mappings
                    link = self.query_one(Link)
                    vnc_url = get_url(host_mappings[0].host_port, service)
                    if vnc_url:
                        link.text = vnc_url
                        link.url = link.text
                        self.display = True
                        break


class SampleInfo(Vertical):
    DEFAULT_CSS = """
    SampleInfo {
        color: $text-muted;
        layout: grid;
        grid-size: 1 2;
        grid-rows: auto 1;
        grid-gutter: 1;
    }
    SampleInfo Collapsible {
        padding: 0;
        border-top: none;
    }
    SampleInfo Collapsible CollapsibleTitle {
        padding: 0;
        color: $secondary;
        &:hover {
            background: $block-hover-background;
            color: $primary;
        }
        &:focus {
            background: $block-hover-background;
            color: $primary;
        }
    }
    SampleInfo Collapsible Contents {
        padding: 1 0 1 2;
        height: auto;
        overflow-x: auto;
    }
    SampleInfo Static {
        width: 1fr;
        background: $surface;
        color: $secondary;
    }
    SampleInfo #sample-link {
        height: auto;
        width: 11;
        margin-left: 1;
        background: $background;
    }
    SampleInfo #sample-link Link {
        color: $accent;
        background: $background;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self._sample: ActiveSample | None = None
        self._sandbox_count: int | None = None

    def compose(self) -> ComposeResult:
        with Horizontal():
            with Collapsible(title=""):
                yield SampleLimits()
                yield SandboxesView()
            yield Right(id="sample-link")

        yield SampleVNC()

    async def sync_sample(self, sample: ActiveSample | None) -> None:
        if sample is None:
            self.display = False
            self._sample = None
        else:
            # update sample limits
            limits = self.query_one(SampleLimits)
            await limits.sync_sample(sample)

            new_sandbox_count = len(sample.sandboxes)
            # bail if we've already processed this sample
            if self._sample == sample and self._sandbox_count == new_sandbox_count:
                return

            # set sample
            self._sample = sample
            self._sandbox_count = new_sandbox_count

            # update UI
            self.display = True
            title = f"{task_display_name(sample.task)} (id: {sample.sample.id}, epoch {sample.epoch}): {sample.model}"
            self.query_one(Collapsible).title = title
            sandboxes = self.query_one(SandboxesView)
            await sandboxes.sync_sample(sample)
            await self.query_one(SampleVNC).sync_sample(sample)

            # View Log Link
            base_uri = sample.log_location
            query_params = {
                "sample_id": sample.sample.id,
                "epoch": sample.epoch,
            }

            parsed = urlparse(to_uri(base_uri))
            view_link = urlunparse(parsed._replace(query=urlencode(query_params)))

            link_container = self.query_one("#sample-link")
            link_container.remove_children()
            link = conditional_vscode_link(
                "[View Log]",
                VSCodeCommand(
                    command="inspect.openLogViewer",
                    args=[view_link] if sample.log_location else [],
                ),
                EXTENSION_COMMAND_OPEN_SAMPLE,
            )
            link_container.mount(link)


class SampleLimits(Widget):
    DEFAULT_CSS = """
    SampleLimits {
        padding: 0 0 0 0;
        color: $secondary;
        background: transparent;
        height: auto;
    }
    SampleLimits Static {
        background: transparent;
        color: $secondary;
    }
    """

    messages = reactive(0)
    message_limit = reactive(0)
    tokens = reactive(0)
    token_limit = reactive(0)
    started = reactive(0)
    time_limit = reactive(0)

    def __init__(self) -> None:
        super().__init__()

    def render(self) -> RenderableType:
        limits = f"[bold]messages[/bold]: {self.messages}"
        if self.message_limit:
            limits = f"{limits} (limit {self.message_limit})"
        limits = f"{limits}, [bold]tokens[/bold]: {self.tokens:,}"
        if self.token_limit:
            limits = f"{limits} ({self.token_limit:,})"
        return limits

    async def sync_sample(self, sample: ActiveSample) -> None:
        self.messages = sample.total_messages
        self.message_limit = sample.message_limit or 0
        self.tokens = sample.total_tokens
        self.token_limit = sample.token_limit or 0


class SandboxesView(Vertical):
    DEFAULT_CSS = """
    SandboxesView {
        padding: 1 0 0 0;
        background: transparent;
        height: auto;
    }
    #sandboxes-list {
        height: auto;
    }
    SandboxesView Static {
        background: transparent;
    }
    .clipboard-message {
        height: auto;
        margin-top: 1;
    }
    """

    def __init__(self) -> None:
        super().__init__()

    def compose(self) -> ComposeResult:
        yield Static(id="sandboxes-caption", markup=True)
        yield Vertical(id="sandboxes-list")

    async def sync_sample(self, sample: ActiveSample) -> None:
        if len(sample.sandboxes) > 0:
            multiple_sandboxes = len(sample.sandboxes) > 1
            sandboxes_caption = cast(Static, self.query_one("#sandboxes-caption"))
            sandboxes_caption.update(
                f"[bold]sandbox container{'s' if multiple_sandboxes else ''}:[/bold]"
            )

            sandboxes_list = self.query_one("#sandboxes-list")
            await sandboxes_list.remove_children()

            await sandboxes_list.mount_all(
                [
                    SandboxView(connection, name if multiple_sandboxes else None)
                    for name, connection in sample.sandboxes.items()
                ]
            )

            await sandboxes_list.mount(
                Static(
                    "[italic]Hold down Alt (or Option) to select text for copying[/italic]",
                    classes="clipboard-message",
                    markup=True,
                )
            )
            self.display = True
        else:
            self.display = False


class SampleToolbar(Horizontal):
    STATUS_GROUP = "status_group"
    TIMEOUT_TOOL_CALL = "timeout_tool_call"
    CANCEL_SCORE_OUTPUT = "cancel_score_output"
    CANCEL_RAISE_ERROR = "cancel_raise_error"
    PENDING_STATUS = "pending_status"
    PENDING_CAPTION = "pending_caption"

    TIMEOUT_TOOL_CALL_ENABLED = (
        "Cancel the tool call and report a timeout to the model."
    )
    TIMEOUT_TOOL_CALL_DISABLED = "Cancelling tool call..."
    CANCEL_SCORE_OUTPUT_ENABLED = (
        "Cancel the sample and score whatever output has been generated so far."
    )
    CANCEL_RAISE_ERROR_ENABLED = "Cancel the sample and raise an error"
    CANCEL_DISABLED = "Cancelling sample..."

    DEFAULT_CSS = f"""
    SampleToolbar #{STATUS_GROUP} {{
        width: 22;
    }}
    SampleToolbar Button {{
        margin-bottom: 1;
        margin-right: 2;
        min-width: 18;
    }}
    SampleToolbar #{TIMEOUT_TOOL_CALL} {{
        color: $secondary-darken-3;
        min-width: 16;
    }}
    SampleToolbar #{CANCEL_SCORE_OUTPUT} {{
        color: $primary-darken-3;
    }}
    SampleToolbar #{CANCEL_RAISE_ERROR} {{
        color: $warning-darken-3;
    }}
    """

    def __init__(self) -> None:
        super().__init__()
        self.sample: ActiveSample | None = None

    def compose(self) -> ComposeResult:
        with HorizontalGroup(id=self.STATUS_GROUP):
            with VerticalGroup(id=self.PENDING_STATUS):
                yield Static("Executing...", id=self.PENDING_CAPTION)
                yield HorizontalGroup(EventLoadingIndicator(), Clock())
        yield Button(
            Text("Timeout Tool"),
            id=self.TIMEOUT_TOOL_CALL,
            tooltip=self.TIMEOUT_TOOL_CALL_ENABLED,
        )
        yield Horizontal()
        yield Button(
            Text("Cancel (Score)"),
            id=self.CANCEL_SCORE_OUTPUT,
            tooltip=self.CANCEL_SCORE_OUTPUT_ENABLED,
        )
        yield Button(
            Text("Cancel (Error)"),
            id=self.CANCEL_RAISE_ERROR,
            tooltip=self.CANCEL_RAISE_ERROR_ENABLED,
        )

    def on_mount(self) -> None:
        self.query_one("#" + self.PENDING_STATUS).visible = False
        self.query_one("#" + self.TIMEOUT_TOOL_CALL).display = False
        self.query_one("#" + self.CANCEL_SCORE_OUTPUT).display = False
        self.query_one("#" + self.CANCEL_RAISE_ERROR).display = False

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if self.sample:
            if event.button.id == self.TIMEOUT_TOOL_CALL:
                last_event = (
                    self.sample.transcript.events[-1]
                    if self.sample.transcript.events
                    else None
                )
                if isinstance(last_event, ToolEvent):
                    last_event._cancel()
                    event.button.disabled = True
                    event.button.tooltip = self.TIMEOUT_TOOL_CALL_DISABLED
            else:
                if event.button.id == self.CANCEL_SCORE_OUTPUT:
                    self.sample.interrupt("score")
                elif event.button.id == self.CANCEL_RAISE_ERROR:
                    self.sample.interrupt("error")
                cancel_score_output = self.query_one("#" + self.CANCEL_SCORE_OUTPUT)
                cancel_score_output.disabled = True
                cancel_score_output.tooltip = self.CANCEL_DISABLED
                cancel_with_error = self.query_one("#" + self.CANCEL_RAISE_ERROR)
                cancel_with_error.disabled = True
                cancel_with_error.tooltip = self.CANCEL_DISABLED

    async def sync_sample(self, sample: ActiveSample | None) -> None:
        from inspect_ai.event._model import ModelEvent

        # is it a new sample?
        new_sample = sample != self.sample

        # track the sample
        self.sample = sample

        status_group = self.query_one("#" + self.STATUS_GROUP)
        pending_status = self.query_one("#" + self.PENDING_STATUS)
        timeout_tool = self.query_one("#" + self.TIMEOUT_TOOL_CALL)
        clock = self.query_one(Clock)
        cancel_score_output = cast(
            Button, self.query_one("#" + self.CANCEL_SCORE_OUTPUT)
        )
        cancel_with_error = cast(Button, self.query_one("#" + self.CANCEL_RAISE_ERROR))
        if sample and not sample.completed:
            # update visibility and button status
            self.display = True
            cancel_score_output.display = True
            cancel_with_error.display = not sample.fails_on_error

            # if its a new sample then reset enabled states
            if new_sample:
                cancel_score_output.disabled = False
                cancel_score_output.tooltip = self.CANCEL_SCORE_OUTPUT_ENABLED
                cancel_with_error.disabled = False
                cancel_with_error.tooltip = self.CANCEL_RAISE_ERROR_ENABLED

            # if we have a pending event then start the clock and show pending status
            last_event = (
                sample.transcript.events[-1]
                if len(sample.transcript.events) > 0
                else None
            )
            if last_event and last_event.pending:
                pending_status.visible = True
                pending_caption = cast(
                    Static, self.query_one("#" + self.PENDING_CAPTION)
                )
                if isinstance(last_event, ModelEvent):
                    # see if there are retries in play
                    if last_event.retries:
                        suffix = "retry" if last_event.retries == 1 else "retries"
                        pending_caption_text = (
                            f"Generating ({last_event.retries:,} {suffix})..."
                        )
                    else:
                        pending_caption_text = "Generating..."
                else:
                    pending_caption_text = "Executing..."
                status_group.styles.width = max(22, len(pending_caption_text))

                pending_caption.update(
                    Text.from_markup(f"[italic]{pending_caption_text}[/italic]")
                )

                timeout_tool.display = isinstance(last_event, ToolEvent)
                timeout_tool.disabled = False
                timeout_tool.tooltip = self.TIMEOUT_TOOL_CALL_ENABLED

                clock.start(last_event.timestamp.timestamp())
            else:
                pending_status.visible = False
                timeout_tool.display = False
                clock.stop()

        else:
            self.display = False
            pending_status.visible = False
            timeout_tool.display = False
            clock.stop()


class EventLoadingIndicator(LoadingIndicator):
    DEFAULT_CSS = """
    EventLoadingIndicator {
        width: auto;
        height: 1;
        color: $primary;
        text-style: not reverse;
        margin-right: 1;
    }
    """

    def __init__(self) -> None:
        super().__init__()


def sample_for_id(samples: list[ActiveSample], id: str) -> ActiveSample | None:
    index = sample_index_for_id(samples, id)
    if index != -1:
        return samples[index]
    else:
        return None


def sample_index_for_id(samples: list[ActiveSample], id: str) -> int:
    for i, sample in enumerate(samples):
        if sample.id == id:
            return i
    return -1
```

## `_display/textual/widgets/sandbox.py`

```python
from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Static

from inspect_ai.util._sandbox.environment import SandboxConnection

from .port_mappings import PortMappingsView


class SandboxView(Vertical):
    DEFAULT_CSS = """
    SandboxView {
        height: auto;
    }
    SandboxView * {
        height: auto;
    }
    .indent {
        width: 2;
    }
    .no_indent {
        width: 0;
    }
    """

    def __init__(
        self,
        connection: SandboxConnection,
        name: str | None,  # if None, no header or indent
    ) -> None:
        super().__init__()
        self.sandbox_name = name
        self.connection = connection

    def compose(self) -> ComposeResult:
        if self.sandbox_name:
            yield Static(self.sandbox_name)
        with Horizontal():
            yield Static("", classes="indent" if self.sandbox_name else "no_indent")
            with Vertical():
                yield Static(self.connection.command, markup=False)
                if self.connection.ports:
                    yield PortMappingsView(self.connection.ports)
```

## `_display/textual/widgets/task_detail.py`

```python
import re
from dataclasses import dataclass

import numpy as np
from textual.app import ComposeResult
from textual.containers import Center, Grid, Horizontal
from textual.reactive import Reactive, reactive
from textual.widget import Widget
from textual.widgets import Static

from inspect_ai._display.core.display import TaskDisplayMetric


@dataclass
class TaskMetric:
    name: str
    value: float | int | None


class TaskDetail(Widget):
    hidden = reactive(False)
    DEFAULT_CSS = """
    TaskDetail {
        background: $boost;
        width: 100%;
        height: auto;
        padding: 1 0 1 0;
    }
    TaskDetail Grid {
        width: 100%;
        height: auto;
        grid-gutter: 1 3;
        grid-size-columns: 3;
        grid-columns: 1fr 1fr 1fr;
    }
    """

    def __init__(
        self,
        *,
        hidden: bool = True,
        id: str | None = None,
        classes: str | None = None,
    ) -> None:
        super().__init__(id=id, classes=classes)
        self.hidden = hidden
        self.existing_metrics: dict[str, TaskMetrics] = {}
        self.grid = Grid()
        self.by_reducer: dict[str | None, dict[str, list[TaskMetric]]] = {}
        self.metrics: list[TaskDisplayMetric] = []

    def watch_hidden(self, hidden: bool) -> None:
        """React to changes in the `visible` property."""
        if hidden:
            self.add_class("hidden")
        else:
            self.remove_class("hidden")

    def compose(self) -> ComposeResult:
        yield self.grid

    def on_mount(self) -> None:
        self.refresh_grid()

    def update_metrics(self, metrics: list[TaskDisplayMetric]) -> None:
        # Group by reducer then scorer within reducers
        self.metrics = metrics

        # clear the existing computed reducers
        self.by_reducer = {}
        for metric in metrics:
            reducer_group = (
                self.by_reducer[metric.reducer]
                if metric.reducer in self.by_reducer
                else {}
            )

            by_scorer_metrics = (
                reducer_group[metric.scorer] if metric.scorer in reducer_group else []
            )
            by_scorer_metrics.append(TaskMetric(name=metric.name, value=metric.value))
            reducer_group[metric.scorer] = by_scorer_metrics
            self.by_reducer[metric.reducer] = reducer_group

        self.refresh_grid()

    def refresh_grid(self) -> None:
        # Don't refresh the grid if not attached
        # since we may explicitly mount new widgets
        if not self.grid.is_attached:
            return

        # don't refresh the grid if there are no scores
        if len(self.by_reducer) == 0:
            return

        # In order to reduce flashing the below tracks use of widgets
        # and updates them when possible (removing and adding them as needed)
        # Makes keys for tracking Task Metric widgets
        def metric_key(reducer: str | None, scorer: str) -> str:
            reducer = reducer or "none"
            return valid_id(f"task-{reducer}-{scorer}-tbl")

        # Remove keys that are no longer present
        existing_keys = set(self.existing_metrics.keys())
        new_keys = set(metric_key(m.reducer, m.scorer) for m in self.metrics)
        to_remove = existing_keys - new_keys
        for remove in to_remove:
            task_metric = self.existing_metrics[remove]
            task_metric.remove()
            del self.existing_metrics[remove]

        # add or update widgets with metrics
        for reducer, scorers in self.by_reducer.items():
            for scorer, scores in scorers.items():
                key = metric_key(reducer=reducer, scorer=scorer)
                if key in self.existing_metrics:
                    task_metrics = self.existing_metrics[key]
                    task_metrics.update(scores)
                else:
                    task_metrics = TaskMetrics(
                        id=key, scorer=scorer, reducer=reducer, metrics=scores
                    )
                    self.grid.mount(task_metrics)
                    self.existing_metrics[key] = task_metrics


class TaskMetrics(Widget):
    DEFAULT_CSS = """
    TaskMetrics {
        width: auto;
        height: auto;
        border: solid $foreground 20%;
    }
    TaskMetrics Grid {
        width: auto;
        grid-size: 2;
        grid-columns: auto;
        grid-gutter: 0 3;
        padding: 0 2 0 2;
    }
    TaskMetric Center {
        width: auto;
    }
    TaskMetrics Center Static {
        width: auto;
    }
    TaskMetrics Center Horizontal {
        width: auto;
        height: auto;
    }
    TaskMetrics Center Horizontal Static {
        width: auto;
        height: auto;
    }
    TaskMetrics .scorer {
        padding: 0 1 0 0;
        text-style: bold;
    }
    TaskMetrics .reducer {
        color: $foreground-darken-3;
    }
    """

    metrics: Reactive[list[TaskMetric]] = reactive([])

    def __init__(
        self,
        *,
        scorer: str | None,
        reducer: str | None,
        metrics: list[TaskMetric],
        id: str | None = None,
        classes: str | None = None,
    ) -> None:
        super().__init__(id=id, classes=classes)
        self.scorer = scorer
        self.reducer = reducer
        self.metrics = metrics
        self.grid: Grid = Grid()
        self.value_widgets: dict[str, Static] = {}

    def grid_id(self) -> str:
        return f"{self.id}-grid"

    def compose(self) -> ComposeResult:
        # Yield the title and base grid
        yield Center(self._title())
        yield Grid(id=self.grid_id())

    def update(self, metrics: list[TaskMetric]) -> None:
        self.metrics = metrics

        # We assume that generally the initial metric names will
        # always match future updates (so we can just update values in line)
        # but if an unrecognized metric appears on the scene, just
        # recompute the whole grid
        need_recompute = False
        for metric in metrics:
            widget = self.value_widgets.get(metric.name)
            if widget:
                # Just update the values themselves
                widget.update(content=f"{metric.value:,.3f}")
            else:
                # Don't have a widget for this, recompute the whole grid
                need_recompute = True
                break

        if need_recompute:
            self.recompute_grid()

    def on_mount(self) -> None:
        self.call_after_refresh(self.recompute_grid)

    def recompute_grid(self) -> None:
        if not self.is_mounted:
            return

        grid = self.query_one(f"#{self.grid_id()}")
        grid.remove_children()
        for metric in self.metrics:
            # Add the value static but keep it around
            # for future updates
            if metric.value is not None:
                self.value_widgets[metric.name] = Static(
                    self._metric_value(metric.value), markup=False
                )
            if grid.is_attached:
                grid.mount(Static(metric.name, markup=False))
                grid.mount(self.value_widgets[metric.name])

    def _title(self) -> Widget:
        if self.scorer is None:
            return Static("")
        elif self.reducer is None:
            return Static(self.scorer, markup=False)
        else:
            return Horizontal(
                Static(self.scorer, classes="scorer", markup=False),
                Static(f"({self.reducer})", classes="reducer", markup=False),
            )

    def _metric_value(self, val: float) -> str:
        if np.isnan(val):
            return " n/a "
        else:
            return f"{val:.3f}"


def valid_id(identifier: str) -> str:
    # Remove invalid characters
    valid_part = re.sub(r"[^a-zA-Z0-9_-]", "_", identifier)

    # Ensure it doesn't start with a number
    if valid_part and valid_part[0].isdigit():
        valid_part = "_" + valid_part

    # If the string is empty return a default valid identifier
    return valid_part or "default_identifier"
```

## `_display/textual/widgets/tasks.py`

```python
import contextlib
from datetime import datetime
from typing import Iterator, cast

from rich.console import RenderableType
from rich.text import Text
from textual import on
from textual.app import ComposeResult
from textual.containers import Container, Horizontal, ScrollableContainer
from textual.css.query import NoMatches
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import ProgressBar, Static
from typing_extensions import override

from inspect_ai._display.core.results import task_metric
from inspect_ai._display.textual.widgets.clock import Clock
from inspect_ai._display.textual.widgets.task_detail import TaskDetail
from inspect_ai._display.textual.widgets.toggle import Toggle
from inspect_ai._display.textual.widgets.vscode import conditional_vscode_link
from inspect_ai._util.file import to_uri
from inspect_ai._util.vscode import (
    VSCodeCommand,
)

from ...core.display import (
    Progress,
    TaskCancelled,
    TaskDisplay,
    TaskDisplayMetric,
    TaskError,
    TaskResult,
    TaskSpec,
    TaskWithResult,
)
from ...core.progress import (
    MAX_DESCRIPTION_WIDTH,
    MAX_MODEL_NAME_WIDTH,
    progress_count,
    progress_description,
    progress_model_name,
)

MAX_METRIC_WIDTH = 25
MAX_COUNT_WIDTH = 15


class TasksView(Container):
    DEFAULT_CSS = """
    TasksView {
        padding: 0 1;
        layout: grid;
        grid-size: 2 2;
        grid-columns: 1fr auto;
        grid-rows: auto 1fr;
    }
    #tasks-progress {
        column-span: 2;
        scrollbar-size-vertical: 1;
        margin-top: 1;
        margin-bottom: 1;
    }
    #tasks-config {
        color: $text-muted;
    }
    #tasks-targets {
        text-align: right;
        color: $text-muted;
    }
    """

    config: reactive[RenderableType] = reactive("")
    targets: reactive[RenderableType] = reactive("")

    def __init__(self) -> None:
        super().__init__()
        self.description_width = MAX_DESCRIPTION_WIDTH
        self.model_name_width = MAX_MODEL_NAME_WIDTH
        self.sample_count_width = 0
        self.display_metrics = True

    def init_tasks(self, tasks: list[TaskSpec]) -> None:
        # clear existing tasks
        self.tasks.remove_children()

        # compute the column widths by looking all of the tasks
        self.description_width = min(
            max([len(task.name) for task in tasks]), MAX_DESCRIPTION_WIDTH
        )
        self.model_name_width = min(
            max([len(str(task.model)) for task in tasks]), MAX_MODEL_NAME_WIDTH
        )
        self.update_progress_widths()

    def add_task(self, task: TaskWithResult) -> TaskDisplay:
        self.update_count_width(task.profile.samples)
        task_display = TaskProgressView(
            task,
            self.description_width,
            self.model_name_width,
            self.sample_count_width,
            self.display_metrics,
        )
        self.tasks.mount(task_display)
        self.tasks.scroll_to_widget(task_display)
        self.update_progress_widths()

        return task_display

    def set_display_metrics(self, display_metrics: bool) -> None:
        self.display_metrics = display_metrics

    def update_count_width(self, samples: int) -> None:
        sample_count_str = progress_count(samples, samples, self.sample_count_width)
        self.sample_count_width = min(
            max(self.sample_count_width, len(sample_count_str)), MAX_COUNT_WIDTH
        )

    def update_progress_widths(self) -> None:
        progress_views = self.tasks.query_children(TaskProgressView)
        metrics_size = 0
        for progress_view in progress_views:
            metrics_size = max(
                metrics_size,
                progress_view.metrics_width
                if progress_view.metrics_width is not None
                else 0,
            )
        metrics_size = min(metrics_size, MAX_METRIC_WIDTH)

        for progress_view in progress_views:
            progress_view.update_metrics_width(metrics_size)
            progress_view.update_count_width(self.sample_count_width)

    def compose(self) -> ComposeResult:
        yield Static(id="tasks-config", markup=False)
        yield Static(id="tasks-targets", markup=False)
        yield ScrollableContainer(id="tasks-progress")

    def watch_config(self, new_config: RenderableType) -> None:
        tasks_config = cast(Static, self.query_one("#tasks-config"))
        tasks_config.update(new_config)

    def watch_targets(self, new_targets: RenderableType) -> None:
        tasks_targets = cast(Static, self.query_one("#tasks-targets"))
        tasks_targets.update(new_targets)

    @property
    def tasks(self) -> ScrollableContainer:
        return cast(ScrollableContainer, self.query_one("#tasks-progress"))


class TaskProgressView(Widget):
    DEFAULT_CSS = """
    TaskProgressView {
        height: auto;
        width: 1fr;
        layout: vertical;
    }
    #task-progress-panel {
        height: auto;
    }
    #task-progress-panel > * {
        width: auto;
        padding-left: 1;
    }
    #task-progress-bar {
        width: 1fr;
    }
    TaskProgressView Bar {
        width: 1fr;
        &> .bar--bar {
            color: $warning 90%;
        }
        &> .bar--complete {
            color: $success;
        }
    }
    #task-metrics {
        color:$text-secondary;
    }
    .hidden {
        display: none;
    }
    """

    def __init__(
        self,
        task: TaskWithResult,
        description_width: int,
        model_name_width: int,
        sample_count_width: int,
        display_metrics: bool,
    ) -> None:
        super().__init__()
        self.t = task

        self.description_width = description_width
        self.model_name_width = model_name_width

        self.progress_bar = ProgressBar(
            id="task-progress-bar", total=task.profile.steps, show_eta=False
        )
        self.count_display = Static(markup=False)
        self.metrics_display = Static(id="task-metrics", markup=False)
        self.task_progress = TaskProgress(self.progress_bar)

        self.toggle = Toggle()
        self.task_detail = TaskDetail(id="task-detail", classes="hidden")

        self.sample_count_width: int = sample_count_width
        self.display_metrics = display_metrics
        self.view_log_link = conditional_vscode_link(
            "[View Log]",
            VSCodeCommand(
                command="inspect.openLogViewer",
                args=[to_uri(task.profile.log_location)]
                if task.profile.log_location
                else [],
            ),
        )

    metrics: reactive[list[TaskDisplayMetric] | None] = reactive(None)
    metrics_width: reactive[int | None] = reactive(None)
    sample_count_width: reactive[int] = reactive(0)
    samples_complete: reactive[int] = reactive(0)
    samples_total: reactive[int] = reactive(0)

    def compose(self) -> ComposeResult:
        with Horizontal(id="task-progress-panel"):
            yield (self.toggle if self.display_metrics else Static())
            yield TaskStatusIcon()
            yield Static(
                progress_description(self.t.profile, self.description_width, pad=True),
                markup=False,
            )
            yield Static(
                progress_model_name(
                    self.t.profile.model, self.model_name_width, pad=True
                ),
                markup=False,
            )
            yield self.progress_bar
            yield self.count_display
            yield self.metrics_display
            yield Clock()
            yield self.view_log_link

        yield self.task_detail

    @on(Toggle.Toggled)
    def handle_title_toggle(self, event: Toggle.Toggled) -> None:
        self.task_detail.hidden = not self.toggle.toggled
        event.stop()

    def on_mount(self) -> None:
        self.query_one(Clock).start(datetime.now().timestamp())  # noqa: DTZ005

    @contextlib.contextmanager
    def progress(self) -> Iterator[Progress]:
        yield self.task_progress

    def complete(self, result: TaskResult) -> None:
        self.t.result = result
        try:
            self.query_one(TaskStatusIcon).result = result
            self.query_one(Clock).stop()
        except NoMatches:
            pass
        self.task_progress.complete()

    def sample_complete(self, complete: int, total: int) -> None:
        self.samples_complete = complete
        self.samples_total = total

    def update_metrics(self, metrics: list[TaskDisplayMetric]) -> None:
        self.metrics = metrics

    def update_metrics_width(self, width: int) -> None:
        self.metrics_width = width

    def update_count_width(self, width: int) -> None:
        self.sample_count_width = width

    def _watch_sample_count_width(self, width: int) -> None:
        self.refresh_count()

    def _watch_samples_complete(self, complete: int) -> None:
        self.refresh_count()

    def _watch_samples_total(self, total: int) -> None:
        self.refresh_count()

    def _watch_metrics_width(self, width: int) -> None:
        self.update_metrics_label()

    def _watch_metrics(self, metrics: list[TaskDisplayMetric] | None) -> None:
        if metrics is not None and len(metrics) > 0:
            # update label
            self.update_metrics_label()

            # update details
            self.task_detail.update_metrics(metrics)

    def refresh_count(self) -> None:
        progress_label = progress_count(
            self.samples_complete, self.samples_total, self.sample_count_width
        )
        self.count_display.update(progress_label)

    def update_metrics_label(self) -> None:
        # compute the label (with a min size)
        if self.metrics is not None and self.metrics_display is not None:
            metric_label = task_metric(self.metrics, self.metrics_width)
            self.metrics_width = len(metric_label)
            self.metrics_display.update(metric_label)


class TaskStatusIcon(Static):
    result: reactive[TaskResult | None] = reactive(None)

    def __init__(self) -> None:
        super().__init__()
        self.watch_result(None)

    def watch_result(self, new_result: TaskResult | None) -> None:
        self.update(self._status_icon(new_result))

    def _status_icon(self, result: TaskResult | None) -> RenderableType:
        error = self.app.current_theme.error or ""
        succcess = self.app.current_theme.success or ""
        running = self.app.current_theme.secondary or ""
        if result:
            if isinstance(result, TaskError):
                return Text("✗", style=error)
            elif isinstance(result, TaskCancelled):
                return Text("✗", style=error)
            else:
                return Text("✔", style=succcess)
        else:
            return Text("⠿", style=running)


MAX_PROGRESS_PERCENT = 0.02
MIN_PROGRESS_PERCENT = 0.98


class TaskProgress(Progress):
    def __init__(self, progress_bar: ProgressBar) -> None:
        self.progress_bar = progress_bar
        self.current_progress = 0

        # always show a minimum amount of progress
        minimum_steps = (
            MAX_PROGRESS_PERCENT * progress_bar.total
            if progress_bar.total is not None
            else 0
        )
        self.progress_bar.update(progress=minimum_steps)

    @override
    def update(self, n: int = 1) -> None:
        self.current_progress = self.current_progress + n

        # enforce a maximum cap on task progress
        max_progress = (
            MIN_PROGRESS_PERCENT * self.progress_bar.total
            if self.progress_bar.total is not None
            else 0
        )
        if (
            self.current_progress > self.progress_bar.progress
            and self.current_progress < max_progress
        ):
            self.progress_bar.update(progress=self.current_progress)

    @override
    def complete(self) -> None:
        if self.progress_bar.total is not None:
            self.progress_bar.update(progress=self.progress_bar.total)
```

## `_display/textual/widgets/titlebar.py`

```python
from __future__ import annotations

from typing import Iterator

from rich.console import RenderableType
from rich.text import Text
from textual.reactive import Reactive
from textual.widget import Widget


class AppTitlebar(Widget):
    DEFAULT_CSS = """
    AppTitlebar {
        dock: top;
        width: 100%;
        background: $panel;
        color: $primary;
        height: 1;
        text-style: bold;
    }
    """

    DEFAULT_CLASSES = ""

    def __init__(
        self,
        *,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
    ):
        """Initialise the header widget.

        Args:
            name: The name of the header widget.
            id: The ID of the header widget in the DOM.
            classes: The CSS classes of the header widget.
        """
        super().__init__(name=name, id=id, classes=classes)

    def compose(self) -> Iterator[Widget]:
        yield AppTitlebarTitle()

    @property
    def title(self) -> str:
        return self._header_title().text

    @title.setter
    def title(self, title: str) -> None:
        self._header_title().text = title

    @property
    def sub_title(self) -> str:
        return self._header_title().sub_text

    @sub_title.setter
    def sub_title(self, sub_title: str) -> None:
        self._header_title().sub_text = sub_title

    def _header_title(self) -> AppTitlebarTitle:
        return self.query_one(AppTitlebarTitle)


class AppTitlebarTitle(Widget):
    """Display the title / subtitle in the header."""

    DEFAULT_CSS = """
    AppTitlebarTitle {
        content-align: center middle;
        width: 100%;
    }
    """

    text: Reactive[str] = Reactive("")
    """The main title text."""

    sub_text = Reactive("")
    """The sub-title text."""

    def render(self) -> RenderableType:
        """Render the title and sub-title.

        Returns:
            The value to render.
        """
        text = Text(self.text, no_wrap=True, overflow="ellipsis")
        if self.sub_text:
            text.append(" — ")
            text.append(self.sub_text, "dim")
        return text
```

## `_display/textual/widgets/toggle.py`

```python
from textual.events import Click
from textual.message import Message
from textual.reactive import reactive
from textual.widgets import Static


class Toggle(Static, can_focus=True):
    toggled = reactive(True)

    def __init__(
        self, on_symbol: str = "▼", off_symbol: str = "▶", toggled: bool = False
    ) -> None:
        super().__init__()

        self.on_symbol = on_symbol
        self.off_symbol = off_symbol
        self.toggled = toggled

    class Toggled(Message):
        """Request toggle."""

    async def _on_click(self, event: Click) -> None:
        """Inform ancestor we want to toggle."""
        event.stop()
        self.toggled = not self.toggled
        self.post_message(self.Toggled())

    def _watch_toggled(self, toggled: bool) -> None:
        if toggled:
            self.update(self.on_symbol)
        else:
            self.update(self.off_symbol)
```

## `_display/textual/widgets/transcript.py`

```python
from typing import Any, Callable, NamedTuple, Sequence, Type

from pydantic import JsonValue
from pydantic_core import to_json
from rich.console import Group, RenderableType
from rich.markdown import Markdown
from rich.table import Table
from rich.text import Text
from textual.containers import ScrollableContainer
from textual.widget import Widget
from textual.widgets import Static

from inspect_ai._util.content import ContentReasoning, ContentText
from inspect_ai._util.rich import tool_result_display
from inspect_ai._util.transcript import (
    set_transcript_markdown_options,
    transcript_function,
    transcript_markdown,
    transcript_reasoning,
    transcript_separator,
)
from inspect_ai.event._approval import ApprovalEvent
from inspect_ai.event._compaction import CompactionEvent
from inspect_ai.event._error import ErrorEvent
from inspect_ai.event._event import (
    Event,
)
from inspect_ai.event._info import InfoEvent
from inspect_ai.event._input import InputEvent
from inspect_ai.event._logger import LoggerEvent
from inspect_ai.event._model import ModelEvent
from inspect_ai.event._sample_init import SampleInitEvent
from inspect_ai.event._sample_limit import SampleLimitEvent
from inspect_ai.event._score import ScoreEvent
from inspect_ai.event._span import SpanBeginEvent
from inspect_ai.event._subtask import SubtaskEvent
from inspect_ai.log._samples import ActiveSample
from inspect_ai.model._chat_message import (
    ChatMessage,
    ChatMessageTool,
    ChatMessageUser,
)
from inspect_ai.model._render import messages_preceding_assistant, render_tool_calls
from inspect_ai.tool._tool import ToolResult


class TranscriptView(ScrollableContainer):
    DEFAULT_CSS = """
    TranscriptView {
        scrollbar-size-vertical: 1;
        scrollbar-gutter: stable;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self._sample_id: str | None = None
        self._sample_events: int | None = None

        self._active = False
        self._pending_sample: ActiveSample | None = None

    async def notify_active(self, active: bool) -> None:
        self._active = active
        if self._active and self._pending_sample:
            await self.sync_sample(self._pending_sample)
            self._pending_sample = None

    async def sync_sample(self, sample: ActiveSample | None) -> None:
        # if sample is none then reset
        if sample is None:
            self._sample = None
            self._sample_events = None
            await self.remove_children()

        # process sample if we are active
        elif self._active:
            # if we have either a new sample or a new event count then proceed
            if (
                sample.id != self._sample_id
                or len(sample.transcript.events) != self._sample_events
            ):
                # update (scrolling to end if we are already close to it)
                new_sample = sample.id != self._sample_id
                scroll_to_end = (
                    new_sample or abs(self.scroll_y - self.max_scroll_y) <= 20
                )

                async with self.batch():
                    await self.remove_children()
                    await self.mount_all(
                        self._widgets_for_events(sample.transcript.events)
                    )
                if scroll_to_end:
                    self.scroll_end(animate=not new_sample)

                # set members
                self._sample_id = sample.id
                self._sample_events = len(sample.transcript.events)

        # if we aren't active then save as a pending sample
        else:
            self._pending_sample = sample

    def _widgets_for_events(
        self, events: Sequence[Event], limit: int = 15
    ) -> list[Widget]:
        widgets: list[Widget] = []

        # function to append content
        def append_content(c: RenderableType) -> None:
            if isinstance(c, Markdown):
                set_transcript_markdown_options(c)
            widgets.append(Static(c, markup=False))

        # first set aside events we don't render
        filtered_events = [e for e in events if can_render_event(e)]

        # filter the events to the <limit> most recent
        if len(events) > limit:
            filtered_events = filtered_events[-limit:]

        # find the sample init event
        sample_init: SampleInitEvent | None = None
        for event in events:
            if isinstance(event, SampleInitEvent):
                sample_init = event
                break

        # add the sample init event if it isn't already in the event list
        if sample_init and sample_init not in filtered_events:
            filtered_events = [sample_init] + list(filtered_events)

        # compute how many events we filtered out
        filtered_count = len(events) - len(filtered_events)
        showed_filtered_count = False
        for event in filtered_events:
            display = render_event(event)
            if display:
                for d in display:
                    if d.prefix:
                        append_content(d.prefix)
                    if d.content:
                        widgets.append(
                            Static(
                                transcript_separator(
                                    d.title, self.app.current_theme.primary
                                )
                            )
                        )
                        append_content(d.content)
                        widgets.append(Static(Text(" ")))

                        if not showed_filtered_count and filtered_count > 0:
                            showed_filtered_count = True

                            widgets.append(
                                Static(
                                    transcript_separator(
                                        f"{filtered_count} events..."
                                        if filtered_count > 1
                                        else "1 event...",
                                        self.app.current_theme.primary,
                                    )
                                )
                            )
                            widgets.append(Static(Text(" ")))

        return widgets


class EventDisplay(NamedTuple):
    """Display for an event group."""

    title: str
    """Text for title bar"""

    content: RenderableType | None = None
    """Optional custom content to display."""

    prefix: RenderableType | None = None
    """Optional content to display above."""


def can_render_event(event: Event) -> bool:
    for event_type, _ in _renderers:
        if isinstance(event, event_type):
            return True
    return False


def render_event(event: Event) -> list[EventDisplay] | None:
    # see if we have a renderer
    for event_type, renderer in _renderers:
        if isinstance(event, event_type):
            display = renderer(event)
            if display is not None:
                return display if isinstance(display, list) else [display]

    # no renderer
    return None


def render_sample_init_event(event: SampleInitEvent) -> EventDisplay:
    # alias sample
    sample = event.sample

    # input
    messages: list[ChatMessage] = (
        [ChatMessageUser(content=sample.input)]
        if isinstance(sample.input, str)
        else sample.input
    )
    content: list[RenderableType] = []
    for message in messages:
        content.extend(render_message(message))

    # target
    if sample.target:
        content.append(Text())
        content.append(Text("Target", style="bold"))
        content.append(Text())
        content.append(str(sample.target).strip())

    return EventDisplay("sample init", Group(*content))


def render_sample_limit_event(event: SampleLimitEvent) -> EventDisplay:
    return EventDisplay(f"limit: {event.type}", Text(event.message))


def render_model_event(event: ModelEvent) -> EventDisplay:
    # content
    prefix: list[RenderableType] = []
    content: list[RenderableType] = []

    # render preceding messages
    preceding = messages_preceding_assistant(event.input)
    for message in preceding:
        if isinstance(message, ChatMessageTool):
            prefix.extend(render_message(message))
            prefix.append(Text())
        else:
            content.extend(render_message(message))
            content.append(Text())

    # display assistant message
    if event.output.message and event.output.message.text:
        content.extend(render_message(event.output.message))
        if event.output.message.tool_calls:
            content.append(Text())

    # render tool calls
    if event.output.message.tool_calls:
        content.extend(render_tool_calls(event.output.message.tool_calls))

    return EventDisplay(
        f"model: {event.model}",
        Group(*content),
        Group(*prefix) if len(prefix) > 0 else None,
    )


def render_sub_events(events: list[Event]) -> list[RenderableType]:
    content: list[RenderableType] = []
    for e in events:
        event_displays = render_event(e) or []
        for d in event_displays:
            if d.content:
                content.append(Text("  "))
                content.append(transcript_separator(d.title, "black", "··"))
                if isinstance(d.content, Markdown):
                    set_transcript_markdown_options(d.content)
                content.append(d.content)

    return content


def render_score_event(event: ScoreEvent) -> EventDisplay:
    table = Table(box=None, show_header=False)
    table.add_column("", min_width=10, justify="left")
    table.add_column("", justify="left")
    table.add_row("Target", str(event.target).strip())
    if event.score.answer:
        table.add_row("Answer", transcript_markdown(event.score.answer, escape=True))
    table.add_row("Score", str(event.score.value).strip())
    if event.score.explanation:
        table.add_row(
            "Explanation", transcript_markdown(event.score.explanation, escape=True)
        )

    return EventDisplay("score", table)


def render_subtask_event(event: SubtaskEvent) -> list[EventDisplay]:
    # render header
    content: list[RenderableType] = [transcript_function(event.name, event.input)]

    if event.result:
        content.append(Text())
        if isinstance(event.result, str | int | float | bool | None):
            content.append(Text(str(event.result)))
        else:
            content.append(render_as_json(event.result))

    return [EventDisplay(f"subtask: {event.name}", Group(*content))]


def render_input_event(event: InputEvent) -> EventDisplay:
    return EventDisplay("input", Text.from_ansi(event.input_ansi.strip()))


def render_approval_event(event: ApprovalEvent) -> EventDisplay:
    content: list[RenderableType] = [
        f"[bold]{event.approver}[/bold]: {event.decision} ({event.explanation})"
    ]

    return EventDisplay("approval", Group(*content))


def render_info_event(event: InfoEvent) -> EventDisplay:
    if isinstance(event.data, str):
        content: RenderableType = transcript_markdown(event.data)
    else:
        content = render_as_json(event.data)
    return EventDisplay("info", content)


def render_compaction_event(event: CompactionEvent) -> EventDisplay:
    compaction: dict[str, JsonValue] = {}
    if event.source is not None:
        compaction["source"] = event.source
    if event.tokens_before is not None:
        compaction["tokens_before"] = event.tokens_before
    if event.tokens_after is not None:
        compaction["tokens_after"] = event.tokens_after
    if event.metadata:
        compaction["metadata"] = event.metadata

    content = render_as_json(compaction)
    return EventDisplay("compaction", content)


def render_logger_event(event: LoggerEvent) -> EventDisplay:
    content = event.message.level.upper()
    if event.message.name:
        content = f"{content} (${event.message.name})"
    content = f"{content}: {event.message.message}"
    return EventDisplay("logger", content)


def render_error_event(event: ErrorEvent) -> EventDisplay:
    return EventDisplay("error", event.error.traceback.strip())


def render_as_json(json: Any) -> RenderableType:
    return transcript_markdown(
        "```json\n"
        + to_json(json, indent=2, fallback=lambda _: None).decode()
        + "\n```\n"
    )


def render_message(message: ChatMessage) -> list[RenderableType]:
    content: list[RenderableType] = []

    # use truncation for tool messages
    if isinstance(message, ChatMessageTool):
        # render the error or the output
        if message.error:
            result: ToolResult = f"{message.error.type}: {message.error.message}"
        elif isinstance(message.content, list):
            result = "\n".join(
                [
                    content.text
                    for content in message.content
                    if isinstance(content, ContentText)
                ]
            )
        else:
            result = message.content

        if result:
            result = str(result).strip()
            content.extend(tool_result_display(result, 50))
        else:
            content.append("(no output)")

    else:
        # header
        content.extend([Text(message.role.capitalize(), style="bold"), Text()])

        # deal with plain text or with content blocks
        if isinstance(message.content, str):
            content.extend([transcript_markdown(message.text.strip(), escape=True)])
        else:
            for c in message.content:
                if isinstance(c, ContentReasoning):
                    content.extend(transcript_reasoning(c))
                elif isinstance(c, ContentText):
                    content.extend([transcript_markdown(c.text.strip(), escape=True)])

    return content


def span_title(event: SpanBeginEvent) -> str:
    return f"{event.type or 'span'}: {event.name}"


EventRenderer = Callable[[Any], EventDisplay | list[EventDisplay] | None]

_renderers: list[tuple[Type[Event], EventRenderer]] = [
    (SampleInitEvent, render_sample_init_event),
    (SampleLimitEvent, render_sample_limit_event),
    (ModelEvent, render_model_event),
    (SubtaskEvent, render_subtask_event),
    (ScoreEvent, render_score_event),
    (InputEvent, render_input_event),
    (ApprovalEvent, render_approval_event),
    (InfoEvent, render_info_event),
    (CompactionEvent, render_compaction_event),
    (LoggerEvent, render_logger_event),
    (ErrorEvent, render_error_event),
]
```

## `_display/textual/widgets/vscode.py`

```python
from textual.widget import Widget
from textual.widgets import Link, Static

from inspect_ai._util.vscode import (
    VSCodeCommand,
    can_execute_vscode_command,
    execute_vscode_commands,
)


def conditional_vscode_link(
    text: str, command: VSCodeCommand, context: str | None = None
) -> Widget:
    if can_execute_vscode_command(command.command, context=context):
        vscode_link = VSCodeLink(text)
        vscode_link.commands = [command]
        return vscode_link
    else:
        return Static()


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

    def action_open_link(self) -> None:
        # Workaround to prevent the default action of opening the link in a browser
        return None
```

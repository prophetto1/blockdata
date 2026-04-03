# Python Bundle: `_cli`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `12`

## Files

- `_cli/cache.py`
- `_cli/common.py`
- `_cli/eval.py`
- `_cli/info.py`
- `_cli/list.py`
- `_cli/log.py`
- `_cli/main.py`
- `_cli/sandbox.py`
- `_cli/score.py`
- `_cli/trace.py`
- `_cli/util.py`
- `_cli/view.py`

## `_cli/cache.py`

```python
import click
from rich import print
from rich.table import Table

from inspect_ai._util.logger import init_logger
from inspect_ai.model import (
    ModelName,
    cache_clear,
    cache_list_expired,
    cache_path,
    cache_prune,
    cache_size,
)

from .common import log_level_options


def _readable_size(size: int) -> str:
    if size < 1024:
        return f"{size}  B"
    if size < 1024 * 1024:
        return f"{size / 1024:.2f} KB"

    return f"{size / (1024 * 1024):.2f} MB"


def _print_table(title: str, paths: list[tuple[str, int]]) -> None:
    """Lists all current model caches with their sizes.

    Args:
        title(str): Title of the table.
        paths(list[tuple[str, int]]): List of paths and their sizes (in bytes).
    """
    table = Table(title=title)
    table.add_column("Model")
    table.add_column("Size", justify="right")
    for model, size in paths:
        table.add_row(model, _readable_size(size))

    print(table)


@click.group("cache")
def cache_command() -> None:
    """Manage the inspect model output cache.

    Learn more about model output caching at https://inspect.aisi.org.uk/caching.html.
    """
    return None


@cache_command.command()
@log_level_options
@click.option(
    "--all",
    is_flag=True,
    default=False,
    help="Clear all cache files in the cache directory.",
)
@click.option(
    "--model",
    default=None,
    metavar="MODEL",
    multiple=True,
    type=str,
    help="Clear the cache for a specific model (e.g. --model=openai/gpt-4). Can be passed multiple times.",
)
def clear(all: bool, model: tuple[str, ...], log_level: str) -> None:
    """Clear all cache files. Requires either --all or --model flags."""
    init_logger(log_level)

    if model:
        _print_table(
            title="Clearing the following caches", paths=cache_size(subdirs=list(model))
        )
        for single_model in model:
            cache_clear(model=str(ModelName(single_model)))
    elif all:
        _print_table(title="Clearing the following caches", paths=cache_size())
        cache_clear()
    else:
        raise click.ClickException("Need to specify either --all or --model.")


@cache_command.command()
def path() -> None:
    """Prints the location of the cache directory."""
    print(cache_path())


@cache_command.command(name="list")
@click.option(
    "--pruneable",
    is_flag=True,
    default=False,
    help="Only list cache entries that can be pruned due to expiry (see inspect cache prune --help).",
)
def list_caches(pruneable: bool) -> None:
    """Lists all current model caches with their sizes."""
    if pruneable:
        expired_cache_entries = cache_list_expired()
        if expired_cache_entries:
            _print_table(
                title="The following models can be pruned due to cache expiry",
                paths=cache_size(files=expired_cache_entries),
            )
        else:
            print("No expired cache entries.")
    else:
        _print_table(title="Cache Sizes", paths=cache_size())


@cache_command.command()
@log_level_options
@click.option(
    "--model",
    default=None,
    metavar="MODEL",
    multiple=True,
    type=str,
    help="Only prune a specific model (e.g. --model=openai/gpt-4). Can be passed multiple times.",
)
def prune(log_level: str, model: tuple[str, ...]) -> None:
    """Prune all expired cache entries

    Over time the cache directory can grow, but many cache entries will be
    expired. This command will remove all expired cache entries for ease of
    maintenance.
    """
    init_logger(log_level)

    expired_cache_entries = cache_list_expired(list(model))

    if expired_cache_entries:
        _print_table(
            title="Pruning the following caches",
            paths=cache_size(files=expired_cache_entries),
        )

        cache_prune(expired_cache_entries)
    else:
        print("No expired cache entries to prune.")
```

## `_cli/common.py`

```python
import functools
import os
from typing import Any, Callable, Literal, cast

import click
import rich
from typing_extensions import TypedDict

from inspect_ai._util.constants import (
    ALL_LOG_LEVELS,
    DEFAULT_DISPLAY,
    DEFAULT_LOG_LEVEL,
)
from inspect_ai._util.dotenv import init_cli_env
from inspect_ai.util._display import init_display_type

from .util import parse_cli_args


class CommonOptions(TypedDict):
    log_level: str
    log_dir: str
    display: Literal["full", "conversation", "rich", "plain", "none"]
    no_ansi: bool | None
    traceback_locals: bool
    env: tuple[str, ...] | None
    debug: bool
    debug_port: int
    debug_errors: bool


def log_level_options(func: Callable[..., Any]) -> Callable[..., click.Context]:
    @click.option(
        "--log-level",
        type=click.Choice(
            [level.lower() for level in ALL_LOG_LEVELS],
            case_sensitive=False,
        ),
        default=DEFAULT_LOG_LEVEL,
        envvar="INSPECT_LOG_LEVEL",
        help=f"Set the log level (defaults to '{DEFAULT_LOG_LEVEL}')",
    )
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> click.Context:
        return cast(click.Context, func(*args, **kwargs))

    return wrapper


def common_options(func: Callable[..., Any]) -> Callable[..., click.Context]:
    @log_level_options
    @click.option(
        "--log-dir",
        type=str,
        default="./logs",
        callback=clean_log_dir,
        envvar="INSPECT_LOG_DIR",
        help="Directory for log files.",
    )
    @click.option(
        "--display",
        type=click.Choice(
            ["full", "conversation", "rich", "plain", "log", "none"],
            case_sensitive=False,
        ),
        default=DEFAULT_DISPLAY,
        envvar="INSPECT_DISPLAY",
        help="Set the display type (defaults to 'full')",
    )
    @click.option(
        "--no-ansi",
        type=bool,
        is_flag=True,
        hidden=True,
        help="Do not print ANSI control characters.",
        envvar="INSPECT_NO_ANSI",
    )
    @click.option(
        "--traceback-locals",
        type=bool,
        is_flag=True,
        envvar="INSPECT_TRACEBACK_LOCALS",
        help="Include values of local variables in tracebacks (note that this can leak private data e.g. API keys so should typically only be enabled for targeted debugging).",
    )
    @click.option(
        "--env",
        multiple=True,
        type=str,
        envvar="INSPECT_EVAL_ENV",
        help="Define an environment variable e.g. --env NAME=value (--env can be specified multiple times)",
    )
    @click.option(
        "--debug", is_flag=True, envvar="INSPECT_DEBUG", help="Wait to attach debugger"
    )
    @click.option(
        "--debug-port",
        default=5678,
        envvar="INSPECT_DEBUG_PORT",
        help="Port number for debugger",
    )
    @click.option(
        "--debug-errors",
        type=bool,
        is_flag=True,
        envvar="INSPECT_DEBUG_ERRORS",
        help="Raise task errors (rather than logging them) so they can be debugged.",
    )
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> click.Context:
        return cast(click.Context, func(*args, **kwargs))

    return wrapper


def process_common_options(options: CommonOptions) -> None:
    # set environment variables
    env_args = parse_cli_args(options["env"])
    init_cli_env(env_args)

    # set traceback locals env var
    if options.get("traceback_locals", False):
        os.environ["INSPECT_TRACEBACK_LOCALS"] = "1"

    # propagate display
    if options["no_ansi"]:
        display = "rich"
        rich.reconfigure(no_color=True)
    else:
        display = options["display"].lower().strip()
    init_display_type(display)

    # attach debugger if requested
    if options["debug"]:
        import debugpy  # type: ignore

        debugpy.listen(options["debug_port"])
        print("Waiting for debugger attach")
        debugpy.wait_for_client()
        print("Debugger attached")


def clean_log_dir(
    ctx: click.Context, param: click.Option, value: str | None
) -> str | None:
    if value is not None:
        value = value.rstrip("/\\")
    return value
```

## `_cli/eval.py`

```python
import functools
import json
from typing import Any, Callable, Literal, cast

import click
import yaml
from pydantic import TypeAdapter
from typing_extensions import Unpack

from inspect_ai import Epochs, eval, eval_retry
from inspect_ai._eval.evalset import eval_set
from inspect_ai._util.config import resolve_args
from inspect_ai._util.constants import (
    ALL_LOG_LEVELS,
    DEFAULT_BATCH_SIZE,
    DEFAULT_CACHE_DAYS,
    DEFAULT_EPOCHS,
    DEFAULT_LOG_LEVEL_TRANSCRIPT,
    DEFAULT_LOG_SHARED,
    DEFAULT_MAX_CONNECTIONS,
    DEFAULT_RETRY_ON_ERROR,
)
from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.file import filesystem
from inspect_ai._util.samples import parse_sample_id, parse_samples_limit
from inspect_ai.log._file import log_file_info
from inspect_ai.model import GenerateConfigArgs
from inspect_ai.model._cache import CachePolicy
from inspect_ai.model._generate_config import (  # noqa: F811
    BatchConfig,
    ImageOutput,
    OutputModality,
    ResponseSchema,
)
from inspect_ai.scorer._reducer import create_reducers
from inspect_ai.solver._solver import SolverSpec
from inspect_ai.util._resource import resource

from .common import (
    CommonOptions,
    common_options,
    process_common_options,
)
from .util import (
    int_bool_or_str_flag_callback,
    int_or_bool_flag_callback,
    parse_cli_args,
    parse_cli_config,
    parse_model_role_cli_args,
    parse_sandbox,
)

MAX_SAMPLES_HELP = "Maximum number of samples to run in parallel (default is running all samples in parallel)"
MAX_TASKS_HELP = "Maximum number of tasks to run in parallel (default is 1 for eval and 4 for eval-set)"
MAX_SUBPROCESSES_HELP = (
    "Maximum number of subprocesses to run in parallel (default is os.cpu_count())"
)
MAX_SANDBOXES_HELP = "Maximum number of sandboxes (per-provider) to run in parallel."
NO_SANDBOX_CLEANUP_HELP = "Do not cleanup sandbox environments after task completes"
FAIL_ON_ERROR_HELP = "Threshold of sample errors to tolerage (by default, evals fail when any error occurs). Value between 0 to 1 to set a proportion; value greater than 1 to set a count."
NO_LOG_SAMPLES_HELP = "Do not include samples in the log file."
NO_LOG_REALTIME_HELP = (
    "Do not log events in realtime (affects live viewing of samples in inspect view)"
)
NO_FAIL_ON_ERROR_HELP = "Do not fail the eval if errors occur within samples (instead, continue running other samples)"
CONTINUE_ON_FAIL_HELP = "Do not immediately fail the eval if the error threshold is exceeded (instead, continue running other samples until the eval completes, and then possibly fail the eval)."
RETRY_ON_ERROR_HELP = "Retry samples if they encounter errors (by default, no retries occur). Specify --retry-on-error to retry a single time, or specify e.g. `--retry-on-error=3` to retry multiple times."
LOG_IMAGES_HELP = (
    "Include base64 encoded versions of filename or URL based images in the log file."
)
LOG_MODEL_API_HELP = "Log raw model api requests and responses. Note that error requests/responses are always logged."
LOG_REFUSALS_HELP = "Log warnings for model refusals."
LOG_BUFFER_HELP = "Number of samples to buffer before writing log file. If not specified, an appropriate default for the format and filesystem is chosen (10 for most all cases, 100 for JSON logs on remote filesystems)."
LOG_SHARED_HELP = "Sync sample events to log directory so that users on other systems can see log updates in realtime (defaults to no syncing). If enabled will sync every 10 seconds (or pass a value to sync every `n` seconds)."
NO_SCORE_HELP = (
    "Do not score model output (use the inspect score command to score output later)"
)
NO_SCORE_DISPLAY = "Do not display scoring metrics in realtime."
MAX_CONNECTIONS_HELP = f"Maximum number of concurrent connections to Model API (defaults to {DEFAULT_MAX_CONNECTIONS})"
MAX_RETRIES_HELP = (
    "Maximum number of times to retry model API requests (defaults to unlimited)"
)
TIMEOUT_HELP = "Model API request timeout in seconds (defaults to no timeout)"
ATTEMPT_TIMEOUT_HELP = "Timeout (in seconds) for any given attempt (if exceeded, will abandon attempt and retry according to max_retries)."
CACHE_HELP = "Policy for caching of model generations. Specify --cache to cache with 7 day expiration (7D). Specify an explicit duration (e.g. (e.g. 1h, 3d, 6M) to set the expiration explicitly (durations can be expressed as s, m, h, D, W, M, or Y). Alternatively, pass the file path to a YAML or JSON config file with a full `CachePolicy` configuration."
BATCH_HELP = "Batch requests together to reduce API calls when using a model that supports batching (by default, no batching). Specify --batch to batch with default configuration,  specify a batch size e.g. `--batch=1000` to configure batches of 1000 requests, or pass the file path to a YAML or JSON config file with batch configuration."


def eval_options(func: Callable[..., Any]) -> Callable[..., click.Context]:
    @click.option(
        "--model",
        type=str,
        help="Model used to evaluate tasks.",
        envvar="INSPECT_EVAL_MODEL",
    )
    @click.option(
        "--model-base-url",
        type=str,
        help="Base URL for for model API",
    )
    @click.option(
        "-M",
        multiple=True,
        type=str,
        envvar="INSPECT_EVAL_MODEL_ARGS",
        help="One or more native model arguments (e.g. -M arg=value)",
    )
    @click.option(
        "--model-config",
        type=str,
        envvar="INSPECT_EVAL_MODEL_CONFIG",
        help="YAML or JSON config file with model arguments.",
    )
    @click.option(
        "--model-role",
        multiple=True,
        type=str,
        envvar="INSPECT_EVAL_MODEL_ROLE",
        help='Named model role with model name or YAML/JSON config, e.g. --model-role critic=openai/gpt-4o or --model-role grader="{model: mockllm/model, temperature: 0.5}"',
    )
    @click.option(
        "-T",
        multiple=True,
        type=str,
        envvar="INSPECT_EVAL_TASK_ARGS",
        help="One or more task arguments (e.g. -T arg=value)",
    )
    @click.option(
        "--task-config",
        type=str,
        envvar="INSPECT_EVAL_TASK_CONFIG",
        help="YAML or JSON config file with task arguments.",
    )
    @click.option(
        "--solver",
        type=str,
        envvar="INSPECT_EVAL_SOLVER",
        help="Solver to execute (overrides task default solver)",
    )
    @click.option(
        "-S",
        multiple=True,
        type=str,
        envvar="INSPECT_EVAL_SOLVER_ARGS",
        help="One or more solver arguments (e.g. -S arg=value)",
    )
    @click.option(
        "--solver-config",
        type=str,
        envvar="INSPECT_EVAL_SOLVER_CONFIG",
        help="YAML or JSON config file with solver arguments.",
    )
    @click.option(
        "--tags",
        type=str,
        help="Tags to associate with this evaluation run.",
        envvar="INSPECT_EVAL_TAGS",
    )
    @click.option(
        "--metadata",
        multiple=True,
        type=str,
        help="Metadata to associate with this evaluation run (more than one --metadata argument can be specified).",
        envvar="INSPECT_EVAL_METADATA",
    )
    @click.option(
        "--trace",
        type=bool,
        is_flag=True,
        hidden=True,
        envvar="INSPECT_EVAL_TRACE",
        help="Trace message interactions with evaluated model to terminal.",
    )
    @click.option(
        "--approval",
        type=str,
        envvar="INSPECT_EVAL_APPROVAL",
        help="Config file for tool call approval.",
    )
    @click.option(
        "--sandbox",
        type=str,
        help="Sandbox environment type (with optional config file). e.g. 'docker' or 'docker:compose.yml'",
        envvar="INSPECT_EVAL_SANDBOX",
    )
    @click.option(
        "--no-sandbox-cleanup",
        type=bool,
        is_flag=True,
        help=NO_SANDBOX_CLEANUP_HELP,
        envvar="INSPECT_EVAL_NO_SANDBOX_CLEANUP",
    )
    @click.option(
        "--limit",
        type=str,
        help="Limit samples to evaluate e.g. 10 or 10-20",
        envvar="INSPECT_EVAL_LIMIT",
    )
    @click.option(
        "--sample-id",
        type=str,
        help="Evaluate specific sample(s) (comma separated list of ids)",
        envvar="INSPECT_EVAL_SAMPLE_ID",
    )
    @click.option(
        "--sample-shuffle",
        is_flag=False,
        flag_value="true",
        default=None,
        callback=int_or_bool_flag_callback(-1),
        help="Shuffle order of samples (pass a seed to make the order deterministic)",
        envvar=["INSPECT_EVAL_SAMPLE_SHUFFLE"],
    )
    @click.option(
        "--epochs",
        type=int,
        help=f"Number of times to repeat dataset (defaults to {DEFAULT_EPOCHS}) ",
        envvar="INSPECT_EVAL_EPOCHS",
    )
    @click.option(
        "--epochs-reducer",
        type=str,
        is_flag=False,
        help="Method for reducing per-epoch sample scores into a single score. Built in reducers include 'mean', 'median', 'mode', 'max', and 'at_least_{n}'.",
        envvar="INSPECT_EVAL_EPOCHS_REDUCER",
    )
    @click.option(
        "--no-epochs-reducer",
        type=bool,
        is_flag=True,
        default=False,
        help="Do not reduce per-epoch sample scores.",
        envvar="INSPECT_EVAL_NO_EPOCHS_REDUCER",
    )
    @click.option(
        "--max-connections",
        type=int,
        help=MAX_CONNECTIONS_HELP,
        envvar="INSPECT_EVAL_MAX_CONNECTIONS",
    )
    @click.option(
        "--max-retries",
        type=int,
        help=MAX_RETRIES_HELP,
        envvar="INSPECT_EVAL_MAX_RETRIES",
    )
    @click.option(
        "--timeout", type=int, help=TIMEOUT_HELP, envvar="INSPECT_EVAL_TIMEOUT"
    )
    @click.option(
        "--attempt-timeout",
        type=int,
        help=ATTEMPT_TIMEOUT_HELP,
        envvar="INSPECT_EVAL_ATTEMPT_TIMEOUT",
    )
    @click.option(
        "--max-samples",
        type=int,
        help=MAX_SAMPLES_HELP,
        envvar="INSPECT_EVAL_MAX_SAMPLES",
    )
    @click.option(
        "--max-dataset-memory",
        type=click.IntRange(min=0),
        help="Maximum MB of dataset sample data to hold in memory per task. When exceeded, samples are paged to disk.",
        envvar="INSPECT_EVAL_MAX_DATASET_MEMORY",
    )
    @click.option(
        "--max-tasks", type=int, help=MAX_TASKS_HELP, envvar="INSPECT_EVAL_MAX_TASKS"
    )
    @click.option(
        "--max-subprocesses",
        type=int,
        help=MAX_SUBPROCESSES_HELP,
        envvar="INSPECT_EVAL_MAX_SUBPROCESSES",
    )
    @click.option(
        "--max-sandboxes",
        type=int,
        help=MAX_SANDBOXES_HELP,
        envvar="INSPECT_EVAL_MAX_SANDBOXES",
    )
    @click.option(
        "--message-limit",
        type=int,
        help="Limit on total messages used for each sample.",
        envvar="INSPECT_EVAL_MESSAGE_LIMIT",
    )
    @click.option(
        "--token-limit",
        type=int,
        help="Limit on total tokens used for each sample.",
        envvar="INSPECT_EVAL_TOKEN_LIMIT",
    )
    @click.option(
        "--cost-limit",
        type=float,
        help="Limit on total cost (in dollars) for each sample.",
        envvar="INSPECT_EVAL_COST_LIMIT",
    )
    @click.option(
        "--model-cost-config",
        type=str,
        help="YAML or JSON file with model prices for cost tracking.",
        envvar="INSPECT_EVAL_MODEL_COST_CONFIG",
    )
    @click.option(
        "--time-limit",
        type=int,
        help="Limit on total running time for each sample.",
        envvar="INSPECT_EVAL_TIME_LIMIT",
    )
    @click.option(
        "--working-limit",
        type=int,
        help="Limit on total working time (e.g. model generation, tool calls, etc.) for each sample.",
        envvar="INSPECT_EVAL_WORKING_LIMIT",
    )
    @click.option(
        "--fail-on-error",
        type=float,
        is_flag=False,
        flag_value=0.0,
        help=FAIL_ON_ERROR_HELP,
        envvar="INSPECT_EVAL_FAIL_ON_ERROR",
    )
    @click.option(
        "--no-fail-on-error",
        type=bool,
        is_flag=True,
        default=False,
        help=NO_FAIL_ON_ERROR_HELP,
        envvar="INSPECT_EVAL_NO_FAIL_ON_ERROR",
    )
    @click.option(
        "--continue-on-fail",
        type=bool,
        is_flag=True,
        default=False,
        help=CONTINUE_ON_FAIL_HELP,
        envvar="INSPECT_EVAL_CONTINUE_ON_FAIL",
    )
    @click.option(
        "--retry-on-error",
        is_flag=False,
        flag_value="true",
        default=None,
        callback=int_or_bool_flag_callback(DEFAULT_RETRY_ON_ERROR),
        help=RETRY_ON_ERROR_HELP,
        envvar="INSPECT_EVAL_RETRY_ON_ERROR",
    )
    @click.option(
        "--no-log-samples",
        type=bool,
        is_flag=True,
        help=NO_LOG_SAMPLES_HELP,
        envvar="INSPECT_EVAL_NO_LOG_SAMPLES",
    )
    @click.option(
        "--no-log-realtime",
        type=bool,
        is_flag=True,
        help=NO_LOG_REALTIME_HELP,
        envvar="INSPECT_EVAL_NO_LOG_REALTIME",
    )
    @click.option(
        "--log-images/--no-log-images",
        type=bool,
        default=True,
        is_flag=True,
        help=LOG_IMAGES_HELP,
    )
    @click.option(
        "--log-model-api/--no-log-model-api",
        type=bool,
        default=False,
        is_flag=True,
        help=LOG_MODEL_API_HELP,
        envvar="INSPECT_EVAL_LOG_MODEL_API",
    )
    @click.option(
        "--log-refusals/--no-log-refusals",
        type=bool,
        default=False,
        is_flag=True,
        help=LOG_REFUSALS_HELP,
        envvar="INSPECT_EVAL_LOG_REFUSALS",
    )
    @click.option(
        "--log-buffer", type=int, help=LOG_BUFFER_HELP, envvar="INSPECT_EVAL_LOG_BUFFER"
    )
    @click.option(
        "--log-shared",
        is_flag=False,
        flag_value="true",
        default=None,
        callback=int_or_bool_flag_callback(DEFAULT_LOG_SHARED),
        help=LOG_SHARED_HELP,
        envvar=["INSPECT_LOG_SHARED", "INSPECT_EVAL_LOG_SHARED"],
    )
    @click.option(
        "--no-score",
        type=bool,
        is_flag=True,
        help=NO_SCORE_HELP,
        envvar="INSPECT_EVAL_NO_SCORE",
    )
    @click.option(
        "--no-score-display",
        type=bool,
        is_flag=True,
        help=NO_SCORE_HELP,
        envvar="INSPECT_EVAL_SCORE_DISPLAY",
    )
    @click.option(
        "--generate-config",
        type=str,
        envvar="INSPECT_EVAL_GENERATE_CONFIG",
        help="YAML or JSON config file with GenerateConfig (alternatively, use the options for individual config values).",
    )
    @click.option(
        "--max-tokens",
        type=int,
        help="The maximum number of tokens that can be generated in the completion (default is model specific)",
        envvar="INSPECT_EVAL_MAX_TOKENS",
    )
    @click.option(
        "--system-message",
        type=str,
        help="Override the default system message.",
        envvar="INSPECT_EVAL_SYSTEM_MESSAGE",
    )
    @click.option(
        "--best-of",
        type=int,
        help="Generates best_of completions server-side and returns the 'best' (the one with the highest log probability per token). OpenAI only.",
        envvar="INSPECT_EVAL_BEST_OF",
    )
    @click.option(
        "--frequency-penalty",
        type=float,
        help="Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. OpenAI, Google, Grok, Groq, llama-cpp-python and vLLM only.",
        envvar="INSPECT_EVAL_FREQUENCY_PENALTY",
    )
    @click.option(
        "--presence-penalty",
        type=float,
        help="Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. OpenAI, Google, Grok, Groq, llama-cpp-python and vLLM only.",
        envvar="INSPECT_EVAL_PRESENCE_PENALTY",
    )
    @click.option(
        "--logit-bias",
        type=str,
        help='Map token Ids to an associated bias value from -100 to 100 (e.g. "42=10,43=-10"). OpenAI, Grok, and Grok only.',
        envvar="INSPECT_EVAL_LOGIT_BIAS",
    )
    @click.option(
        "--seed",
        type=int,
        help="Random seed. OpenAI, Google, Groq, Mistral, HuggingFace, and vLLM only.",
        envvar="INSPECT_EVAL_SEED",
    )
    @click.option(
        "--stop-seqs",
        type=str,
        help="Sequences where the API will stop generating further tokens. The returned text will not contain the stop sequence.",
        envvar="INSPECT_EVAL_STOP_SEQS",
    )
    @click.option(
        "--temperature",
        type=float,
        help="What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.",
        envvar="INSPECT_EVAL_TEMPERATURE",
    )
    @click.option(
        "--top-p",
        type=float,
        help="An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass.",
        envvar="INSPECT_EVAL_TOP_P",
    )
    @click.option(
        "--top-k",
        type=int,
        help="Randomly sample the next word from the top_k most likely next words. Anthropic, Google, HuggingFace, and vLLM only.",
        envvar="INSPECT_EVAL_TOP_K",
    )
    @click.option(
        "--num-choices",
        type=int,
        help="How many chat completion choices to generate for each input message. OpenAI, Grok, Google, TogetherAI, and vLLM only.",
        envvar="INSPECT_EVAL_NUM_CHOICES",
    )
    @click.option(
        "--logprobs",
        type=bool,
        is_flag=True,
        help="Return log probabilities of the output tokens. OpenAI, Google, TogetherAI, Huggingface, llama-cpp-python, and vLLM only.",
        envvar="INSPECT_EVAL_LOGPROBS",
    )
    @click.option(
        "--top-logprobs",
        type=int,
        help="Number of most likely tokens (0-20) to return at each token position, each with an associated log probability. OpenAI, Google, TogetherAI, Huggingface, and vLLM only.",
        envvar="INSPECT_EVAL_TOP_LOGPROBS",
    )
    @click.option(
        "--parallel-tool-calls/--no-parallel-tool-calls",
        type=bool,
        is_flag=True,
        default=True,
        help="Whether to enable parallel function calling during tool use (defaults to True) OpenAI and Groq only.",
        envvar="INSPECT_EVAL_PARALLEL_TOOL_CALLS",
    )
    @click.option(
        "--internal-tools/--no-internal-tools",
        type=bool,
        is_flag=True,
        default=True,
        help="Whether to automatically map tools to model internal implementations (e.g. 'computer' for anthropic).",
        envvar="INSPECT_EVAL_INTERNAL_TOOLS",
    )
    @click.option(
        "--max-tool-output",
        type=int,
        help="Maximum size of tool output (in bytes). Defaults to 16 * 1024.",
        envvar="INSPECT_EVAL_MAX_TOOL_OUTPUT",
    )
    @click.option(
        "--cache-prompt",
        type=click.Choice(["auto", "true", "false"]),
        help='Cache prompt prefix (Anthropic only). Defaults to "auto", which will enable caching for requests with tools.',
        envvar="INSPECT_EVAL_CACHE_PROMPT",
    )
    @click.option(
        "--verbosity",
        type=click.Choice(["low", "medium", "high"]),
        help='Constrains the verbosity of the model\'s response. Lower values will result in more concise responses, while higher values will result in more verbose responses. GPT 5.x models only (defaults to "medium" for OpenAI models)',
        envvar="INSPECT_EVAL_EFFORT",
    )
    @click.option(
        "--effort",
        type=click.Choice(["low", "medium", "high", "max"]),
        help="Control how many tokens are used for a response, trading off between response thoroughness and token efficiency. Anthropic Claude Opus 4.5 and 4.6 only (`max` only supported on 4.6).",
        envvar="INSPECT_EVAL_EFFORT",
    )
    @click.option(
        "--reasoning-effort",
        type=click.Choice(["none", "minimal", "low", "medium", "high", "xhigh"]),
        help="Constrains effort on reasoning. Defaults vary by provider and model and not all models support all values (please consult provider documentation for details).",
        envvar="INSPECT_EVAL_REASONING_EFFORT",
    )
    @click.option(
        "--reasoning-tokens",
        type=int,
        help="Maximum number of tokens to use for reasoning. Anthropic Claude models only.",
        envvar="INSPECT_EVAL_REASONING_TOKENS",
    )
    @click.option(
        "--reasoning-summary",
        type=click.Choice(["none", "concise", "detailed", "auto"]),
        help="Provide summary of reasoning steps (OpenAI reasoning models only). Use 'auto' to access the most detailed summarizer available for the current model (defaults to 'auto' if your organization is verified by OpenAI).",
        envvar="INSPECT_EVAL_REASONING_SUMMARY",
    )
    @click.option(
        "--reasoning-history",
        type=click.Choice(["none", "all", "last", "auto"]),
        help='Include reasoning in chat message history sent to generate (defaults to "auto", which uses the recommended default for each provider)',
        envvar="INSPECT_EVAL_REASONING_HISTORY",
    )
    @click.option(
        "--response-schema",
        type=str,
        help="JSON schema for desired response format (output should still be validated). OpenAI, Google, and Mistral only.",
        envvar="INSPECT_EVAL_RESPONSE_SCHEMA",
    )
    @click.option(
        "--cache",
        is_flag=False,
        flag_value="true",
        default=None,
        callback=int_bool_or_str_flag_callback(DEFAULT_CACHE_DAYS, None),
        help=CACHE_HELP,
        envvar="INSPECT_EVAL_CACHE",
    )
    @click.option(
        "--batch",
        is_flag=False,
        flag_value="true",
        default=None,
        callback=int_bool_or_str_flag_callback(DEFAULT_BATCH_SIZE, None),
        help=BATCH_HELP,
        envvar="INSPECT_EVAL_BATCH",
    )
    @click.option(
        "--modalities",
        type=str,
        help="Additional output modalities beyond text (e.g. 'image'). Comma-separated names or a YAML/JSON config file path. OpenAI and Google only.",
        envvar="INSPECT_EVAL_MODALITIES",
    )
    @click.option(
        "--log-format",
        type=click.Choice(["eval", "json"], case_sensitive=False),
        envvar=["INSPECT_LOG_FORMAT", "INSPECT_EVAL_LOG_FORMAT"],
        help="Format for writing log files.",
    )
    @click.option(
        "--log-level-transcript",
        type=click.Choice(
            [level.lower() for level in ALL_LOG_LEVELS],
            case_sensitive=False,
        ),
        default=DEFAULT_LOG_LEVEL_TRANSCRIPT,
        envvar="INSPECT_LOG_LEVEL_TRANSCRIPT",
        help=f"Set the log level of the transcript (defaults to '{DEFAULT_LOG_LEVEL_TRANSCRIPT}')",
    )
    @common_options
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> click.Context:
        return cast(click.Context, func(*args, **kwargs))

    return wrapper


@click.command("eval")
@click.argument("tasks", nargs=-1)
@eval_options
def eval_command(
    tasks: tuple[str, ...] | None,
    solver: str | None,
    model: str | None,
    model_base_url: str | None,
    m: tuple[str, ...] | None,
    model_config: str | None,
    model_role: tuple[str, ...] | None,
    t: tuple[str, ...] | None,
    task_config: str | None,
    s: tuple[str, ...] | None,
    solver_config: str | None,
    tags: str | None,
    metadata: tuple[str, ...] | None,
    trace: bool | None,
    approval: str | None,
    sandbox: str | None,
    no_sandbox_cleanup: bool | None,
    epochs: int | None,
    epochs_reducer: str | None,
    no_epochs_reducer: bool | None,
    limit: str | None,
    sample_id: str | None,
    sample_shuffle: int | None,
    generate_config: str | None,
    max_retries: int | None,
    timeout: int | None,
    attempt_timeout: int | None,
    max_connections: int | None,
    max_tokens: int | None,
    system_message: str | None,
    best_of: int | None,
    frequency_penalty: float | None,
    presence_penalty: float | None,
    logit_bias: str | None,
    seed: int | None,
    stop_seqs: str | None,
    temperature: float | None,
    top_p: float | None,
    top_k: int | None,
    num_choices: int | None,
    logprobs: bool | None,
    top_logprobs: int | None,
    parallel_tool_calls: bool | None,
    internal_tools: bool | None,
    max_tool_output: int | None,
    cache_prompt: str | None,
    verbosity: Literal["low", "medium", "high"] | None,
    effort: Literal["low", "medium", "high"] | None,
    reasoning_effort: str | None,
    reasoning_tokens: int | None,
    reasoning_summary: Literal["none", "concise", "detailed", "auto"] | None,
    reasoning_history: Literal["none", "all", "last", "auto"] | None,
    response_schema: ResponseSchema | None,
    cache: int | str | None,
    batch: int | str | None,
    modalities: str | None,
    message_limit: int | None,
    token_limit: int | None,
    time_limit: int | None,
    working_limit: int | None,
    cost_limit: float | None,
    model_cost_config: str | None,
    max_samples: int | None,
    max_dataset_memory: int | None,
    max_tasks: int | None,
    max_subprocesses: int | None,
    max_sandboxes: int | None,
    fail_on_error: bool | float | None,
    no_fail_on_error: bool | None,
    continue_on_fail: bool | None,
    retry_on_error: int | None,
    no_log_samples: bool | None,
    no_log_realtime: bool | None,
    log_images: bool | None,
    log_model_api: bool | None,
    log_refusals: bool | None,
    log_buffer: int | None,
    log_shared: int | None,
    no_score: bool | None,
    no_score_display: bool | None,
    log_format: Literal["eval", "json"] | None,
    log_level_transcript: str,
    **common: Unpack[CommonOptions],
) -> None:
    """Evaluate tasks."""
    # read config
    config = config_from_locals(dict(locals()))

    # resolve common options
    process_common_options(common)

    # exec eval
    eval_exec(
        tasks=tasks,
        solver=solver,
        log_level=common["log_level"],
        log_level_transcript=log_level_transcript,
        log_dir=common["log_dir"],
        log_format=log_format,
        model=model,
        model_base_url=model_base_url,
        m=m,
        model_config=model_config,
        model_role=model_role,
        t=t,
        task_config=task_config,
        s=s,
        solver_config=solver_config,
        tags=tags,
        metadata=metadata,
        trace=trace,
        approval=approval,
        sandbox=sandbox,
        no_sandbox_cleanup=no_sandbox_cleanup,
        epochs=epochs,
        epochs_reducer=epochs_reducer,
        no_epochs_reducer=no_epochs_reducer,
        limit=limit,
        sample_id=sample_id,
        sample_shuffle=sample_shuffle,
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
        fail_on_error=fail_on_error,
        no_fail_on_error=no_fail_on_error,
        continue_on_fail=continue_on_fail,
        retry_on_error=retry_on_error,
        debug_errors=common["debug_errors"],
        no_log_samples=no_log_samples,
        no_log_realtime=no_log_realtime,
        log_images=log_images,
        log_model_api=log_model_api,
        log_refusals=log_refusals,
        log_buffer=log_buffer,
        log_shared=log_shared,
        no_score=no_score,
        no_score_display=no_score_display,
        is_eval_set=False,
        **config,
    )


@click.command("eval-set")
@click.argument("tasks", nargs=-1)
@click.option(
    "--retry-attempts",
    type=int,
    help="Maximum number of retry attempts before giving up (defaults to 10).",
    envvar="INSPECT_EVAL_RETRY_ATTEMPS",
)
@click.option(
    "--retry-wait",
    type=int,
    help="Time in seconds wait between attempts, increased exponentially. "
    + "(defaults to 30, resulting in waits of 30, 60, 120, 240, etc.). Wait time "
    + "per-retry will in no case by longer than 1 hour.",
    envvar="INSPECT_EVAL_RETRY_WAIT",
)
@click.option(
    "--retry-connections",
    type=float,
    help="Reduce max_connections at this rate with each retry (defaults to 1.0, which results in no reduction).",
    envvar="INSPECT_EVAL_RETRY_CONNECTIONS",
)
@click.option(
    "--no-retry-cleanup",
    type=bool,
    is_flag=True,
    help="Do not cleanup failed log files after retries",
    envvar="INSPECT_EVAL_NO_RETRY_CLEANUP",
)
@click.option(
    "--bundle-dir",
    type=str,
    is_flag=False,
    help="Bundle viewer and logs into output directory",
)
@click.option(
    "--bundle-overwrite",
    type=str,
    is_flag=True,
    help="Overwrite existing bundle dir.",
)
@click.option(
    "--embed-viewer",
    type=bool,
    is_flag=True,
    help="Embed a log viewer into the log directory.",
)
@click.option(
    "--log-dir-allow-dirty",
    type=bool,
    is_flag=True,
    help="Do not fail if the log-dir contains files that are not part of the eval set.",
)
@click.option(
    "--id",
    "eval_set_id",
    type=str,
    help="ID for the eval set. If not specified, a unique ID will be generated.",
)
@eval_options
@click.pass_context
def eval_set_command(
    ctx: click.Context,
    tasks: tuple[str, ...] | None,
    retry_attempts: int | None,
    retry_wait: int | None,
    retry_connections: float | None,
    no_retry_cleanup: bool | None,
    solver: str | None,
    trace: bool | None,
    approval: str | None,
    model: str | None,
    model_base_url: str | None,
    m: tuple[str, ...] | None,
    model_config: str | None,
    model_role: tuple[str, ...] | None,
    t: tuple[str, ...] | None,
    task_config: str | None,
    s: tuple[str, ...] | None,
    solver_config: str | None,
    tags: str | None,
    metadata: tuple[str, ...] | None,
    sandbox: str | None,
    no_sandbox_cleanup: bool | None,
    epochs: int | None,
    epochs_reducer: str | None,
    no_epochs_reducer: bool | None,
    limit: str | None,
    sample_id: str | None,
    sample_shuffle: int | None,
    generate_config: str | None,
    max_retries: int | None,
    timeout: int | None,
    attempt_timeout: int | None,
    max_connections: int | None,
    max_tokens: int | None,
    system_message: str | None,
    best_of: int | None,
    frequency_penalty: float | None,
    presence_penalty: float | None,
    logit_bias: str | None,
    seed: int | None,
    stop_seqs: str | None,
    temperature: float | None,
    top_p: float | None,
    top_k: int | None,
    num_choices: int | None,
    logprobs: bool | None,
    top_logprobs: int | None,
    parallel_tool_calls: bool | None,
    internal_tools: bool | None,
    max_tool_output: int | None,
    cache_prompt: str | None,
    verbosity: Literal["low", "medium", "high"] | None,
    effort: Literal["low", "medium", "high"] | None,
    reasoning_effort: str | None,
    reasoning_tokens: int | None,
    reasoning_summary: Literal["none", "concise", "detailed", "auto"] | None,
    reasoning_history: Literal["none", "all", "last", "auto"] | None,
    response_schema: ResponseSchema | None,
    cache: int | str | None,
    batch: int | str | None,
    modalities: str | None,
    message_limit: int | None,
    token_limit: int | None,
    time_limit: int | None,
    working_limit: int | None,
    cost_limit: float | None,
    model_cost_config: str | None,
    max_samples: int | None,
    max_dataset_memory: int | None,
    max_tasks: int | None,
    max_subprocesses: int | None,
    max_sandboxes: int | None,
    fail_on_error: bool | float | None,
    no_fail_on_error: bool | None,
    continue_on_fail: bool | None,
    retry_on_error: int | None,
    no_log_samples: bool | None,
    no_log_realtime: bool | None,
    log_images: bool | None,
    log_model_api: bool | None,
    log_refusals: bool | None,
    log_buffer: int | None,
    log_shared: int | None,
    no_score: bool | None,
    no_score_display: bool | None,
    bundle_dir: str | None,
    bundle_overwrite: bool | None,
    embed_viewer: bool | None,
    log_dir_allow_dirty: bool | None,
    log_format: Literal["eval", "json"] | None,
    log_level_transcript: str,
    eval_set_id: str | None,
    **common: Unpack[CommonOptions],
) -> int:
    """Evaluate a set of tasks with retries.

    Learn more about eval sets at https://inspect.aisi.org.uk/eval-sets.html.
    """
    # read config
    config = config_from_locals(dict(locals()))

    # resolve common options
    process_common_options(common)

    # exec eval
    success = eval_exec(
        tasks=tasks,
        solver=solver,
        log_level=common["log_level"],
        log_level_transcript=log_level_transcript,
        log_dir=common["log_dir"],
        log_format=log_format,
        model=model,
        model_base_url=model_base_url,
        m=m,
        model_config=model_config,
        model_role=model_role,
        t=t,
        task_config=task_config,
        s=s,
        solver_config=solver_config,
        tags=tags,
        metadata=metadata,
        trace=trace,
        approval=approval,
        sandbox=sandbox,
        no_sandbox_cleanup=no_sandbox_cleanup,
        epochs=epochs,
        epochs_reducer=epochs_reducer,
        no_epochs_reducer=no_epochs_reducer,
        limit=limit,
        sample_id=sample_id,
        sample_shuffle=sample_shuffle,
        message_limit=message_limit,
        token_limit=token_limit,
        cost_limit=cost_limit,
        model_cost_config=model_cost_config,
        time_limit=time_limit,
        working_limit=working_limit,
        max_samples=max_samples,
        max_dataset_memory=max_dataset_memory,
        max_tasks=max_tasks,
        max_subprocesses=max_subprocesses,
        max_sandboxes=max_sandboxes,
        fail_on_error=fail_on_error,
        no_fail_on_error=no_fail_on_error,
        continue_on_fail=continue_on_fail,
        retry_on_error=retry_on_error,
        debug_errors=common["debug_errors"],
        no_log_samples=no_log_samples,
        no_log_realtime=no_log_realtime,
        log_images=log_images,
        log_model_api=log_model_api,
        log_refusals=log_refusals,
        log_buffer=log_buffer,
        log_shared=log_shared,
        no_score=no_score,
        no_score_display=no_score_display,
        is_eval_set=True,
        retry_attempts=retry_attempts,
        retry_wait=retry_wait,
        retry_connections=retry_connections,
        retry_cleanup=not no_retry_cleanup,
        bundle_dir=bundle_dir,
        bundle_overwrite=True if bundle_overwrite else False,
        embed_viewer=True if embed_viewer else False,
        log_dir_allow_dirty=log_dir_allow_dirty,
        eval_set_id=eval_set_id,
        **config,
    )

    # exit code indicating whether the evals are all complete
    ctx.exit(0 if success else 1)


def eval_exec(
    tasks: tuple[str, ...] | None,
    solver: str | None,
    log_level: str,
    log_level_transcript: str,
    log_dir: str,
    log_format: Literal["eval", "json"] | None,
    model: str | None,
    model_base_url: str | None,
    m: tuple[str, ...] | None,
    model_config: str | None,
    model_role: tuple[str, ...] | None,
    t: tuple[str, ...] | None,
    task_config: str | None,
    s: tuple[str, ...] | None,
    solver_config: str | None,
    tags: str | None,
    metadata: tuple[str, ...] | None,
    trace: bool | None,
    approval: str | None,
    sandbox: str | None,
    no_sandbox_cleanup: bool | None,
    epochs: int | None,
    epochs_reducer: str | None,
    no_epochs_reducer: bool | None,
    limit: str | None,
    sample_id: str | None,
    sample_shuffle: int | None,
    message_limit: int | None,
    token_limit: int | None,
    time_limit: int | None,
    working_limit: int | None,
    cost_limit: float | None,
    model_cost_config: str | None,
    max_samples: int | None,
    max_dataset_memory: int | None,
    max_tasks: int | None,
    max_subprocesses: int | None,
    max_sandboxes: int | None,
    fail_on_error: bool | float | None,
    no_fail_on_error: bool | None,
    continue_on_fail: bool | None,
    retry_on_error: int | None,
    debug_errors: bool | None,
    no_log_samples: bool | None,
    no_log_realtime: bool | None,
    log_images: bool | None,
    log_model_api: bool | None,
    log_refusals: bool | None,
    log_buffer: int | None,
    log_shared: int | None,
    no_score: bool | None,
    no_score_display: bool | None,
    is_eval_set: bool = False,
    retry_attempts: int | None = None,
    retry_wait: int | None = None,
    retry_connections: float | None = None,
    retry_cleanup: bool | None = None,
    bundle_dir: str | None = None,
    bundle_overwrite: bool = False,
    embed_viewer: bool = False,
    log_dir_allow_dirty: bool | None = None,
    eval_set_id: str | None = None,
    **kwargs: Unpack[GenerateConfigArgs],
) -> bool:
    # parse task, solver, and model args
    task_args = parse_cli_config(t, task_config)
    solver_args = parse_cli_config(s, solver_config)
    model_args = parse_cli_config(m, model_config)

    # parse model roles
    eval_model_roles = parse_model_role_cli_args(model_role)

    # parse tags
    eval_tags = parse_comma_separated(tags)

    # parse metadata
    eval_metadata = parse_cli_args(metadata)

    # resolve epochs
    eval_epochs = (
        Epochs(
            epochs,
            []
            if no_epochs_reducer
            else create_reducers(parse_comma_separated(epochs_reducer)),
        )
        if epochs
        else None
    )

    # resolve range and sample id
    eval_limit = parse_samples_limit(limit)
    eval_sample_id = parse_sample_id(sample_id)

    # resolve sample_shuffle
    if sample_shuffle == -1:
        eval_sample_shuffle: Literal[True] | int | None = True
    elif sample_shuffle == 0:
        eval_sample_shuffle = None
    else:
        eval_sample_shuffle = sample_shuffle

    # resolve fail_on_error
    if no_fail_on_error is True:
        fail_on_error = False
    elif fail_on_error == 0.0:
        fail_on_error = True

    # resolve retry_on_error
    if retry_on_error == 0:
        retry_on_error = None

    # resolve negating options
    sandbox_cleanup = False if no_sandbox_cleanup else None
    log_samples = False if no_log_samples else None
    log_realtime = False if no_log_realtime else None
    log_images = False if log_images is False else None
    trace = True if trace else None
    score = False if no_score else True
    score_display = False if no_score_display else None

    # build params
    params: dict[str, Any] = (
        dict(
            tasks=list(tasks) if tasks else None,
            model=model,
            model_base_url=model_base_url,
            model_args=model_args,
            model_roles=eval_model_roles,
            task_args=task_args,
            solver=SolverSpec(solver, solver_args, solver_args) if solver else None,
            tags=eval_tags,
            metadata=eval_metadata,
            trace=trace,
            approval=approval,
            sandbox=parse_sandbox(sandbox),
            sandbox_cleanup=sandbox_cleanup,
            log_level=log_level,
            log_level_transcript=log_level_transcript,
            log_dir=log_dir,
            log_format=log_format,
            limit=eval_limit,
            sample_id=eval_sample_id,
            sample_shuffle=eval_sample_shuffle,
            epochs=eval_epochs,
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
            score=score,
            score_display=score_display,
        )
        | kwargs
    )

    # evaluate
    if is_eval_set:
        params["retry_attempts"] = retry_attempts
        params["retry_wait"] = retry_wait
        params["retry_connections"] = retry_connections
        params["retry_cleanup"] = retry_cleanup
        params["bundle_dir"] = bundle_dir
        params["bundle_overwrite"] = bundle_overwrite
        params["embed_viewer"] = embed_viewer
        params["log_dir_allow_dirty"] = log_dir_allow_dirty
        params["eval_set_id"] = eval_set_id
        success, _ = eval_set(**params)
        return success
    else:
        params["log_header_only"] = True  # cli invocation doesn't need full log
        eval(**params)
        return True


def config_from_locals(locals: dict[str, Any]) -> GenerateConfigArgs:
    # start with config file if specified
    adapter = TypeAdapter(GenerateConfigArgs)
    generate_config_file = locals.pop("generate_config", None)
    if generate_config_file:
        # read file
        generate_config = resolve_args(generate_config_file)

        # validate all the fields are valid
        extra_keys = generate_config.keys() - GenerateConfigArgs.__annotations__.keys()
        if extra_keys:
            raise PrerequisiteError(
                f"Unexpected GenerateConfig fields in {generate_config_file}: {extra_keys}"
            )

        # create base config
        base_config = adapter.validate_python(generate_config, strict=True)
    else:
        base_config = GenerateConfigArgs()

    # build generate config
    config_keys = list(GenerateConfigArgs.__mutable_keys__)  # type: ignore
    config = GenerateConfigArgs(**base_config)
    for key, value in locals.items():
        if key in config_keys and value is not None:
            if key == "stop_seqs":
                value = value.split(",")
            if key == "logprobs" and value is False:
                value = None
            if key == "logit_bias" and value is not None:
                value = parse_logit_bias(value)
            if key == "cache_prompt":
                if value.lower() == "true":
                    value = True
                elif value.lower() == "false":
                    value = False
            if key == "parallel_tool_calls":
                if value is not False:
                    value = None
            if key == "internal_tools":
                if value is not False:
                    value = None
            if key == "response_schema":
                if value is not None:
                    value = ResponseSchema.model_validate_json(value)
            if key == "cache":
                match value:
                    case str():
                        policy = CachePolicy.from_string(value)
                        if policy is not None:
                            value = policy
                        else:
                            value = CachePolicy.model_validate(resolve_args(value))
                    case int():
                        value = CachePolicy(expiry=f"{value}D")

            if key == "batch":
                match value:
                    case str():
                        value = BatchConfig.model_validate(resolve_args(value))

            if key == "modalities":
                value = parse_modalities(value)

            config[key] = value  # type: ignore
    return config


def parse_modalities(value: str) -> list[Any]:
    """Parse modalities from comma-separated names or YAML/JSON file."""
    # Check if it's a file path
    fs = filesystem(value)
    if fs.exists(value):
        content = resource(value, type="file")
        is_json = content.strip().startswith("[") or content.strip().startswith("{")
        config = json.loads(content) if is_json else yaml.safe_load(content)
        if not isinstance(config, list):
            raise PrerequisiteError(
                f"Modalities config file must contain a list, got: {type(config).__name__}"
            )
        result: list[OutputModality] = []
        for item in config:
            if isinstance(item, str):
                result.append(item)  # type: ignore[arg-type]
            elif isinstance(item, dict):
                result.append(ImageOutput.model_validate(item))
            else:
                raise PrerequisiteError(f"Invalid modality item: {item}")
        return result
    else:
        # Check if it looks like a file path that doesn't exist
        if "/" in value or "\\" in value or value.endswith((".json", ".yaml", ".yml")):
            raise PrerequisiteError(f"Modalities file not found: {value}")
        # Comma-separated literal names (e.g. "image" or "image,audio")
        tokens = [m.strip() for m in value.split(",")]
        return [t for t in tokens if t]  # type: ignore[misc]


def parse_logit_bias(logit_bias: str | None) -> dict[int, float] | None:
    logit_biases = parse_cli_args(logit_bias.split(",")) if logit_bias else None
    if logit_biases:
        return dict(
            zip([int(key) for key in logit_biases.keys()], logit_biases.values())
        )
    else:
        return None


def parse_comma_separated(value: str | None) -> list[str] | None:
    if value is not None:
        return value.split(",")
    else:
        return None


@click.command("eval-retry")
@click.argument("log_files", nargs=-1, required=True)
@click.option(
    "--max-samples", type=int, help=MAX_SAMPLES_HELP, envvar="INSPECT_EVAL_MAX_SAMPLES"
)
@click.option(
    "--max-tasks", type=int, help=MAX_TASKS_HELP, envvar="INSPECT_EVAL_MAX_TASKS"
)
@click.option(
    "--max-subprocesses",
    type=int,
    help=MAX_SUBPROCESSES_HELP,
    envvar="INSPECT_EVAL_MAX_SUBPROCESSES",
)
@click.option(
    "--max-sandboxes",
    type=int,
    help=MAX_SANDBOXES_HELP,
    envvar="INSPECT_EVAL_MAX_SANDBOXES",
)
@click.option(
    "--no-sandbox-cleanup",
    type=bool,
    is_flag=True,
    help=NO_SANDBOX_CLEANUP_HELP,
)
@click.option(
    "--trace",
    type=bool,
    is_flag=True,
    hidden=True,
    help="Trace message interactions with evaluated model to terminal.",
    envvar="INSPECT_EVAL_TRACE",
)
@click.option(
    "--fail-on-error",
    type=float,
    is_flag=False,
    flag_value=0.0,
    help=FAIL_ON_ERROR_HELP,
    envvar="INSPECT_EVAL_FAIL_ON_ERROR",
)
@click.option(
    "--no-fail-on-error",
    type=bool,
    is_flag=True,
    default=False,
    help=NO_FAIL_ON_ERROR_HELP,
    envvar="INSPECT_EVAL_NO_FAIL_ON_ERROR",
)
@click.option(
    "--continue-on-fail",
    type=bool,
    is_flag=True,
    default=False,
    help=CONTINUE_ON_FAIL_HELP,
    envvar="INSPECT_EVAL_CONTINUE_ON_FAIL",
)
@click.option(
    "--retry-on-error",
    is_flag=False,
    flag_value="true",
    default=None,
    callback=int_or_bool_flag_callback(DEFAULT_RETRY_ON_ERROR),
    help=RETRY_ON_ERROR_HELP,
    envvar="INSPECT_EVAL_RETRY_ON_ERROR",
)
@click.option(
    "--no-log-samples",
    type=bool,
    is_flag=True,
    help=NO_LOG_SAMPLES_HELP,
    envvar="INSPECT_EVAL_LOG_SAMPLES",
)
@click.option(
    "--no-log-realtime",
    type=bool,
    is_flag=True,
    help=NO_LOG_REALTIME_HELP,
    envvar="INSPECT_EVAL_LOG_REALTIME",
)
@click.option(
    "--log-images/--no-log-images",
    type=bool,
    default=True,
    is_flag=True,
    help=LOG_IMAGES_HELP,
    envvar="INSPECT_EVAL_LOG_IMAGES",
)
@click.option(
    "--log-model-api/--no-log-model-api",
    type=bool,
    default=False,
    is_flag=True,
    help=LOG_MODEL_API_HELP,
    envvar="INSPECT_EVAL_LOG_MODEL_API",
)
@click.option(
    "--log-refusals/--no-log-refusals",
    type=bool,
    default=False,
    is_flag=True,
    help=LOG_REFUSALS_HELP,
    envvar="INSPECT_EVAL_LOG_REFUSALS",
)
@click.option(
    "--log-buffer", type=int, help=LOG_BUFFER_HELP, envvar="INSPECT_EVAL_LOG_BUFFER"
)
@click.option(
    "--log-shared",
    is_flag=False,
    flag_value="true",
    default=None,
    callback=int_or_bool_flag_callback(DEFAULT_LOG_SHARED),
    help=LOG_SHARED_HELP,
    envvar=["INSPECT_LOG_SHARED", "INSPECT_EVAL_LOG_SHARED"],
)
@click.option(
    "--no-score",
    type=bool,
    is_flag=True,
    help=NO_SCORE_HELP,
    envvar="INSPECT_EVAL_SCORE",
)
@click.option(
    "--no-score-display",
    type=bool,
    is_flag=True,
    help=NO_SCORE_HELP,
    envvar="INSPECT_EVAL_SCORE_DISPLAY",
)
@click.option(
    "--max-connections",
    type=int,
    help=MAX_CONNECTIONS_HELP,
    envvar="INSPECT_EVAL_MAX_CONNECTIONS",
)
@click.option(
    "--max-retries", type=int, help=MAX_RETRIES_HELP, envvar="INSPECT_EVAL_MAX_RETRIES"
)
@click.option("--timeout", type=int, help=TIMEOUT_HELP, envvar="INSPECT_EVAL_TIMEOUT")
@click.option(
    "--attempt-timeout",
    type=int,
    help=ATTEMPT_TIMEOUT_HELP,
    envvar="INSPECT_EVAL_ATTEMPT_TIMEOUT",
)
@click.option(
    "--log-level-transcript",
    type=click.Choice(
        [level.lower() for level in ALL_LOG_LEVELS],
        case_sensitive=False,
    ),
    default=DEFAULT_LOG_LEVEL_TRANSCRIPT,
    envvar="INSPECT_LOG_LEVEL_TRANSCRIPT",
    help=f"Set the log level of the transcript (defaults to '{DEFAULT_LOG_LEVEL_TRANSCRIPT}')",
)
@common_options
def eval_retry_command(
    log_files: tuple[str, ...],
    max_samples: int | None,
    max_tasks: int | None,
    max_subprocesses: int | None,
    max_sandboxes: int | None,
    no_sandbox_cleanup: bool | None,
    trace: bool | None,
    fail_on_error: bool | float | None,
    no_fail_on_error: bool | None,
    continue_on_fail: bool | None,
    retry_on_error: int | None,
    no_log_samples: bool | None,
    no_log_realtime: bool | None,
    log_images: bool | None,
    log_model_api: bool | None,
    log_refusals: bool | None,
    log_buffer: int | None,
    log_shared: int | None,
    no_score: bool | None,
    no_score_display: bool | None,
    max_connections: int | None,
    max_retries: int | None,
    timeout: int | None,
    attempt_timeout: int | None,
    log_level_transcript: str,
    **common: Unpack[CommonOptions],
) -> None:
    """Retry failed evaluation(s)"""
    # resolve common options
    process_common_options(common)

    # resolve negating options
    sandbox_cleanup = False if no_sandbox_cleanup else None
    log_samples = False if no_log_samples else None
    log_realtime = False if no_log_realtime else None
    log_images = False if log_images is False else None
    log_model_api = True if log_model_api is True else None
    log_refusals = True if log_refusals is True else None
    score = False if no_score else True
    score_display = False if no_score_display else None

    # resolve fail_on_error
    if no_fail_on_error is True:
        fail_on_error = False
    elif fail_on_error == 0.0:
        fail_on_error = True

    # resolve retry on error
    if retry_on_error == 0:
        retry_on_error = None

    # resolve log file
    retry_log_files = [
        log_file_info(filesystem(log_file).info(log_file)) for log_file in log_files
    ]

    # retry
    eval_retry(
        retry_log_files,
        log_level=common["log_level"],
        log_level_transcript=log_level_transcript,
        log_dir=common["log_dir"],
        max_samples=max_samples,
        max_tasks=max_tasks,
        max_subprocesses=max_subprocesses,
        max_sandboxes=max_sandboxes,
        sandbox_cleanup=sandbox_cleanup,
        trace=trace,
        fail_on_error=fail_on_error,
        continue_on_fail=continue_on_fail,
        retry_on_error=retry_on_error,
        debug_errors=common["debug_errors"],
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
```

## `_cli/info.py`

```python
from json import dumps

import click

from inspect_ai import __version__
from inspect_ai._util.constants import PKG_PATH
from inspect_ai._view.common import resolve_header_only
from inspect_ai.log._file import eval_log_json_str, read_eval_log

from .log import headers, schema, types


@click.group("info")
def info_command() -> None:
    """Read configuration and log info."""
    return None


@info_command.command("version")
@click.option(
    "--json",
    type=bool,
    is_flag=True,
    default=False,
    help="Output version and path info as JSON",
)
def version(json: bool) -> None:
    """Output version and path info."""
    if json:
        print(dumps(dict(version=__version__, path=PKG_PATH.as_posix()), indent=2))
    else:
        print(f"version: {__version__}")
        print(f"path: {PKG_PATH.as_posix()}")


@info_command.command("log-file", hidden=True)
@click.argument("path")
@click.option(
    "--header-only",
    type=int,
    is_flag=False,
    flag_value=0,
    help="Read and print only the header of the log file (i.e. no samples).",
)
def log(path: str, header_only: int) -> None:
    """Print log file contents as JSON."""
    header_only = resolve_header_only(path, header_only)

    log = read_eval_log(path, header_only=header_only)
    print(eval_log_json_str(log))


@info_command.command("log-file-headers", hidden=True)
@click.argument("files", nargs=-1)
def log_file_headers(files: tuple[str, ...]) -> None:
    """Read and print a JSON list of log file headers."""
    headers(files)


@info_command.command("log-schema", hidden=True)
def log_schema() -> None:
    """Print JSON schema for log files."""
    schema()


@info_command.command("log-types", hidden=True)
def log_types() -> None:
    """Print TS declarations for log files."""
    types()
```

## `_cli/list.py`

```python
from json import dumps

import click
from pydantic_core import to_jsonable_python
from typing_extensions import Unpack

from inspect_ai._cli.common import CommonOptions, common_options, process_common_options
from inspect_ai._cli.log import list_logs_options, log_list
from inspect_ai._cli.util import parse_cli_args
from inspect_ai._eval.list import list_tasks
from inspect_ai._eval.task import TaskInfo
from inspect_ai.log import EvalStatus


@click.group("list")
def list_command() -> None:
    """List tasks on the filesystem."""
    return None


@list_command.command("tasks")
@click.option(
    "-F",
    multiple=True,
    type=str,
    help="One or more boolean task filters (e.g. -F light=true or -F draft~=false)",
)
@click.option(
    "--absolute",
    type=bool,
    is_flag=True,
    default=False,
    help="List absolute paths to task scripts (defaults to relative to the cwd).",
)
@click.option(
    "--json",
    type=bool,
    is_flag=True,
    default=False,
    help="Output listing as JSON",
)
@click.argument("paths", nargs=-1)
@common_options
def tasks(
    paths: tuple[str, ...] | None,
    f: tuple[str, ...] | None,
    absolute: bool,
    json: bool,
    **kwargs: Unpack[CommonOptions],
) -> None:
    """List tasks in given directories."""
    # resolve common options
    process_common_options(kwargs)

    # parse filter expressions and build a filter from it
    filters = parse_cli_args(f)

    def task_filter(task: TaskInfo) -> bool:
        for name, value in filters.items():
            if name.endswith("~"):
                name = name[:-1]
                include = task.attribs.get(name, None) != value
            else:
                include = task.attribs.get(name, None) == value
            if not include:
                return False
        return True

    # list tasks
    tasks = list_tasks(
        globs=list(paths) if paths else [], absolute=absolute, filter=task_filter
    )

    # print as JSON or plain text
    if json:
        print(dumps(to_jsonable_python(tasks, exclude_none=True), indent=2))
    else:
        print("\n".join([f"{task.file}@{task.name}" for task in tasks]))


@list_command.command("logs", hidden=True)
@list_logs_options
def list_logs_command(
    status: EvalStatus | None,
    absolute: bool,
    json: bool,
    no_recursive: bool | None,
    **common: Unpack[CommonOptions],
) -> None:
    log_list(status, absolute, json, no_recursive, **common)
```

## `_cli/log.py`

```python
import functools
import os
from json import dumps
from typing import Any, Callable, Literal, cast
from urllib.parse import urlparse

import click
from fsspec.core import split_protocol  # type: ignore
from pydantic_core import to_jsonable_python
from typing_extensions import Unpack

from inspect_ai._cli.common import CommonOptions, common_options, process_common_options
from inspect_ai._cli.util import int_or_bool_flag_callback
from inspect_ai._util.constants import PKG_PATH
from inspect_ai.log import EvalStatus, list_eval_logs
from inspect_ai.log._convert import convert_eval_logs
from inspect_ai.log._file import (
    eval_log_json_str,
    read_eval_log,
    read_eval_log_headers,
)


@click.group("log")
def log_command() -> None:
    """Query, read, and convert logs.

    Inspect supports two log formats: 'eval' which is a compact, high performance binary format and 'json' which represents logs as JSON.

    The default format is 'eval'. You can change this by setting the INSPECT_LOG_FORMAT environment variable or using the --log-format command line option.

    The 'log' commands enable you to read Inspect logs uniformly as JSON no matter their physical storage format, and also enable you to read only the headers (everything but the samples) from log files, which is useful for very large logs.

    Learn more about managing log files at https://inspect.aisi.org.uk/eval-logs.html.
    """
    return None


def list_logs_options(func: Callable[..., Any]) -> Callable[..., click.Context]:
    @click.option(
        "--status",
        type=click.Choice(
            ["started", "success", "cancelled", "error"], case_sensitive=False
        ),
        help="List only log files with the indicated status.",
    )
    @click.option(
        "--absolute",
        type=bool,
        is_flag=True,
        default=False,
        help="List absolute paths to log files (defaults to relative to the cwd).",
    )
    @click.option(
        "--json",
        type=bool,
        is_flag=True,
        default=False,
        help="Output listing as JSON",
    )
    @click.option(
        "--no-recursive",
        type=bool,
        is_flag=True,
        help="List log files recursively (defaults to True).",
    )
    @common_options
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> click.Context:
        return cast(click.Context, func(*args, **kwargs))

    return wrapper


def log_list(
    status: EvalStatus | None,
    absolute: bool,
    json: bool,
    no_recursive: bool | None,
    **common: Unpack[CommonOptions],
) -> None:
    process_common_options(common)

    # list the logs
    logs = list_eval_logs(
        log_dir=common["log_dir"],
        filter=(lambda log: log.status == status) if status else None,
        recursive=no_recursive is not True,
    )

    # convert file names
    for log in logs:
        if urlparse(log.name).scheme == "file":
            _, path = split_protocol(log.name)
            log.name = path
            if not absolute:
                log.name = os.path.relpath(log.name, os.path.curdir)

    if json:
        logs_dicts = [log.model_dump() for log in logs]
        print(dumps(logs_dicts, indent=2))

    else:
        for log in logs:
            print(log.name)


def resolve_attachments_callback(
    ctx: click.Context, param: click.Parameter, value: str
) -> bool | Literal["full", "core"]:
    source = ctx.get_parameter_source(param.name) if param.name else ""
    if source == click.core.ParameterSource.DEFAULT:
        return False

    if value is None:
        return False
    elif value == "full":
        return "full"
    elif value == "core":
        return "core"
    else:
        raise click.BadParameter(f"Expected 'full', or 'core'. Got: {value}")


@log_command.command("list")
@list_logs_options
def list_command(
    status: EvalStatus | None,
    absolute: bool,
    json: bool,
    no_recursive: bool | None,
    **common: Unpack[CommonOptions],
) -> None:
    """List all logs in the log directory."""
    log_list(status, absolute, json, no_recursive, **common)


@log_command.command("dump")
@click.argument("path")
@click.option(
    "--header-only",
    type=bool,
    is_flag=True,
    default=False,
    help="Read and print only the header of the log file (i.e. no samples).",
)
@click.option(
    "--resolve-attachments",
    type=click.Choice(["full", "core"]),
    flag_value="core",
    is_flag=False,
    default=None,
    callback=resolve_attachments_callback,
    help="Resolve attachments (duplicated content blocks) to their full content.",
)
def dump_command(
    path: str, header_only: bool, resolve_attachments: bool | Literal["full", "core"]
) -> None:
    """Print log file contents as JSON."""
    log = read_eval_log(
        path, header_only=header_only, resolve_attachments=resolve_attachments
    )
    print(eval_log_json_str(log))


@log_command.command("convert")
@click.argument("path")
@click.option(
    "--to",
    type=click.Choice(["eval", "json"], case_sensitive=False),
    required=True,
    help="Target format to convert to.",
)
@click.option(
    "--output-dir",
    required=True,
    help="Directory to write converted log files to.",
)
@click.option(
    "--overwrite",
    type=bool,
    is_flag=True,
    default=False,
    help="Overwrite files in the output directory.",
)
@click.option(
    "--resolve-attachments",
    type=click.Choice(["full", "core"]),
    flag_value="core",
    is_flag=False,
    default=None,
    callback=resolve_attachments_callback,
    help="Resolve attachments (duplicated content blocks) to their full content.",
)
@click.option(
    "--stream",
    flag_value="true",
    type=str,
    is_flag=False,
    default=False,
    callback=int_or_bool_flag_callback(True, false_value=False, is_one_true=False),
    help="Stream the samples through the conversion process instead of reading the entire log into memory. Useful for large logs. Set to an integer to limit the number of concurrent samples being converted.",
)
def convert_command(
    path: str,
    to: Literal["eval", "json"],
    output_dir: str,
    overwrite: bool,
    resolve_attachments: bool | Literal["full", "core"],
    stream: int | bool = False,
) -> None:
    """Convert between log file formats."""
    convert_eval_logs(
        path,
        to,
        output_dir,
        overwrite,
        resolve_attachments=resolve_attachments,
        stream=stream,
    )


@log_command.command("headers", hidden=True)
@click.argument("files", nargs=-1)
def headers_command(files: tuple[str, ...]) -> None:
    """Print log file headers as JSON."""
    headers(files)


def headers(files: tuple[str, ...]) -> None:
    """Print log file headers as JSON."""
    headers = read_eval_log_headers(list(files))
    print(dumps(to_jsonable_python(headers, exclude_none=True), indent=2))


@log_command.command("schema")
def schema_command() -> None:
    """Print JSON schema for log files."""
    schema()


def schema() -> None:
    print(view_resource("log-schema.json"))


@log_command.command("types", hidden=True)
def types_command() -> None:
    """Print TS declarations for log files."""
    types()


def types() -> None:
    print(view_type_resource("log.d.ts"))


def view_resource(file: str) -> str:
    resource = PKG_PATH / "_view" / "www" / file
    with open(resource, "r", encoding="utf-8") as f:
        return f.read()


def view_type_resource(file: str) -> str:
    resource = PKG_PATH / "_view" / "www" / "src" / "@types" / file
    with open(resource, "r", encoding="utf-8") as f:
        return f.read()
```

## `_cli/main.py`

```python
import click

from inspect_ai._util.dotenv import init_dotenv
from inspect_ai._util.error import set_exception_hook

from .. import __version__
from .cache import cache_command
from .eval import eval_command, eval_retry_command, eval_set_command
from .info import info_command
from .list import list_command
from .log import log_command
from .sandbox import sandbox_command
from .score import score_command
from .trace import trace_command
from .view import view_command


@click.group(invoke_without_command=True)
@click.option(
    "--version",
    type=bool,
    is_flag=True,
    default=False,
    help="Print the Inspect version.",
)
@click.pass_context
def inspect(ctx: click.Context, version: bool) -> None:
    # if this was a subcommand then allow it to execute
    if ctx.invoked_subcommand is not None:
        return

    if version:
        print(__version__)
        ctx.exit()
    else:
        click.echo(ctx.get_help())
        ctx.exit()


inspect.add_command(cache_command)
inspect.add_command(eval_command)
inspect.add_command(eval_set_command)
inspect.add_command(eval_retry_command)
inspect.add_command(info_command)
inspect.add_command(list_command)
inspect.add_command(log_command)
inspect.add_command(score_command)
inspect.add_command(view_command)
inspect.add_command(sandbox_command)
inspect.add_command(trace_command)


def main() -> None:
    set_exception_hook()
    init_dotenv()
    inspect(auto_envvar_prefix="INSPECT")  # pylint: disable=no-value-for-parameter


if __name__ == "__main__":
    main()
```

## `_cli/sandbox.py`

```python
import anyio
import click

from inspect_ai._util._async import configured_async_backend
from inspect_ai.util._sandbox.registry import registry_find_sandboxenv


@click.group("sandbox")
def sandbox_command() -> None:
    """Manage Sandbox Environments.

    Learn more about sandboxing at https://inspect.aisi.org.uk/sandboxing.html.
    """
    return None


@sandbox_command.command("cleanup")
@click.argument("type", type=str, required=True)
@click.argument("environment_id", type=str, required=False)
def sandbox_cleanup(type: str, environment_id: str | None) -> None:
    """Cleanup Sandbox Environments.

    TYPE specifies the sandbox environment type (e.g. 'docker')

    Pass an ENVIRONMENT_ID to cleanup only a single environment
    (otherwise all environments will be cleaned up).
    """
    sandboxenv_type = registry_find_sandboxenv(type)
    cli_cleanup = getattr(sandboxenv_type, "cli_cleanup")
    anyio.run(cli_cleanup, environment_id, backend=configured_async_backend())
```

## `_cli/score.py`

```python
from __future__ import annotations

import contextlib
from typing import AsyncGenerator

import anyio
import click
import rich
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from typing_extensions import Unpack

from inspect_ai._cli.util import int_or_bool_flag_callback, parse_cli_config
from inspect_ai._display import display
from inspect_ai._display.core.results import task_scores
from inspect_ai._display.core.rich import rich_theme
from inspect_ai._eval.context import init_eval_context
from inspect_ai._eval.loader import metric_from_spec
from inspect_ai._eval.score import (
    ScoreAction,
    resolve_scorers,
    score_async,
)
from inspect_ai._util._async import configured_async_backend
from inspect_ai._util.file import filesystem
from inspect_ai._util.platform import platform_init
from inspect_ai.log._log import EvalLog, EvalSample
from inspect_ai.log._recorders import create_recorder_for_location
from inspect_ai.scorer._metric import Metric, MetricSpec

from .common import CommonOptions, common_options, process_common_options


@click.command("score")
@click.argument("log-file", type=str, required=True)
@click.option(
    "--scorer",
    type=str,
    envvar="INSPECT_SCORE_SCORER",
    help="Scorer to use for scoring",
)
@click.option(
    "-S",
    multiple=True,
    type=str,
    envvar="INSPECT_SCORE_SCORER_ARGS",
    help="One or more scorer arguments (e.g. -S arg=value)",
)
@click.option(
    "--metric",
    multiple=True,
    type=str,
    envvar="INSPECT_SCORE_METRIC",
    help="Metric to use for scoring (overrides metrics in the log).",
)
@click.option(
    "--action",
    type=click.Choice(["append", "overwrite"]),
    envvar="INSPECT_SCORE_SCORER_ACTION",
    help="Whether to append or overwrite the existing scores.",
)
@click.option(
    "--overwrite",
    type=bool,
    is_flag=True,
    envvar="INSPECT_SCORE_OVERWRITE",
    help="Overwrite log file with the scored version",
)
@click.option(
    "--output-file",
    type=click.Path(dir_okay=False, writable=True),
    envvar="INSPECT_SCORE_OUTPUT_FILE",
    help="Output file to write the scored log to.",
)
@click.option(
    "--stream",
    flag_value="true",
    type=str,
    is_flag=False,
    default=False,
    callback=int_or_bool_flag_callback(True, false_value=False, is_one_true=False),
    help="Stream the samples through the scoring process instead of reading the entire log into memory. Useful for large logs. Set to an integer to limit the number of concurrent samples being scored.",
    envvar="INSPECT_SCORE_STREAM",
)
@common_options
def score_command(
    log_file: str,
    overwrite: bool | None,
    output_file: str | None,
    scorer: str | None,
    s: tuple[str, ...] | None,
    metric: tuple[str, ...] | None,
    action: ScoreAction | None,
    stream: int | bool = False,
    **common: Unpack[CommonOptions],
) -> None:
    """Score a previous evaluation run."""
    process_common_options(common)

    async def run_score() -> None:
        return await score(
            log_dir=common["log_dir"],
            log_file=log_file,
            output_file=output_file,
            scorer=scorer,
            s=s,
            metric=metric,
            overwrite=False if overwrite is None else overwrite,
            action=action,
            log_level=common["log_level"],
            stream=stream,
        )

    anyio.run(run_score, backend=configured_async_backend())


async def score(
    log_dir: str,
    log_file: str,
    scorer: str | None,
    s: tuple[str, ...] | None,
    metric: tuple[str, ...] | None,
    overwrite: bool,
    action: ScoreAction | None,
    log_level: str | None,
    output_file: str | None = None,
    stream: int | bool = False,
) -> None:
    platform_init()

    init_eval_context(log_level, None, log_refusals=True)
    scorer_args = parse_cli_config(args=s, config=None)

    recorder = create_recorder_for_location(log_file, log_dir)
    eval_log = await recorder.read_log(log_file, header_only=bool(stream))
    num_samples = (
        len(eval_log.samples)
        if eval_log.samples
        else eval_log.results.total_samples
        if eval_log.results
        else None
    )
    if num_samples is None or num_samples == 0:
        raise ValueError(
            f"Cannot determine the number of samples to score for {log_file}"
        )

    scorers = resolve_scorers(eval_log, scorer, scorer_args)
    if len(scorers) == 0:
        raise ValueError(
            "Unable to resolve any scorers for this log. Please specify a scorer using the '--scorer' param."
        )

    metrics = resolve_metrics(metric)

    action = resolve_action(eval_log, action)
    output_file = _resolve_output_file(
        log_file, output_file=output_file, overwrite=overwrite
    )
    write_recorder = create_recorder_for_location(output_file, log_dir)

    read_sample = None
    if stream:
        sample_map = await recorder.read_log_sample_ids(log_file)
        semaphore = anyio.Semaphore(len(sample_map) if stream is True else stream)

        @contextlib.asynccontextmanager
        async def _read_sample(idx_sample: int) -> AsyncGenerator[EvalSample, None]:
            async with semaphore:
                sample = await recorder.read_log_sample(
                    log_file, *sample_map[idx_sample]
                )
                yield sample
                await write_recorder.log_sample(eval_log.eval, sample)
                del sample

        read_sample = _read_sample
        await write_recorder.log_init(eval_log.eval, location=output_file)
        await write_recorder.log_start(eval_log.eval, eval_log.plan)

    eval_log = await score_async(
        log=eval_log,
        scorers=scorers,
        metrics=metrics,
        action=action,
        copy=False,
        samples=read_sample,
    )

    if stream:
        await write_recorder.log_finish(
            eval_log.eval,
            eval_log.status,
            eval_log.stats,
            eval_log.results,
            eval_log.reductions,
            eval_log.error,
            invalidated=eval_log.invalidated,
            log_updates=eval_log.log_updates,
        )
    else:
        await recorder.write_log(output_file, eval_log)

    print_results(output_file, eval_log)


def print_results(output_file: str, eval_log: EvalLog) -> None:
    # the theme
    theme = rich_theme()

    # Create results panel
    grid = Table.grid(expand=True)
    grid.add_column()
    grid.add_row("")

    if eval_log.results:
        for row in task_scores(eval_log.results.scores, pad_edge=True):
            grid.add_row(row)

    grid.add_row("")
    grid.add_row(f" Log: [{theme.link}]{output_file}[/{theme.link}]")

    p = Panel(
        title=f"[bold][{theme.meta}]Results for {eval_log.eval.task}[/bold][/{theme.meta}]",
        title_align="left",
        renderable=grid,
    )

    # Print the results panel
    display().print("")
    console = rich.get_console()
    console.print(p)


def _resolve_output_file(
    log_file: str, output_file: str | None, overwrite: bool
) -> str:
    # resolve the output file (we may overwrite, use the passed file name, or suggest a new name)
    output_file = output_file or log_file
    output_fs = filesystem(output_file or log_file)

    if not output_fs.exists(output_file) or overwrite:
        return output_file

    # Ask if we should overwrite
    file_action = Prompt.ask(
        f"Overwrite {output_file} or create new file?",
        choices=["overwrite", "create", "o", "c"],
        default="create",
    )
    if file_action in ["overwrite", "o"]:
        return output_file

    # parse the file path, which could be a local file path
    # or an S3 url.
    dir_name = output_fs.sep.join(output_file.split(output_fs.sep)[:-1])
    file_name = output_file.split(output_fs.sep)[-1]
    file_stem = file_name.split(".")[0]
    file_ext = ".".join(file_name.split(".")[1:])

    # suggest a new file name
    new_output_file = f"{dir_name}{output_fs.sep}{file_stem}-scored.{file_ext}"
    count = 0
    while output_fs.exists(new_output_file):
        count = count + 1
        new_output_file = (
            f"{dir_name}{output_fs.sep}{file_stem}-scored-{count}.{file_ext}"
        )

    # confirm the file name
    user_file = Prompt.ask("Output file name?", default=new_output_file)
    return user_file


def resolve_metrics(
    metric: tuple[str, ...] | None,
) -> list[Metric | dict[str, list[Metric]]] | dict[str, list[Metric]] | None:
    if metric is not None and len(metric) > 0:
        return [metric_from_spec(MetricSpec(m)) for m in metric]
    else:
        return None


def resolve_action(eval_log: EvalLog, action: ScoreAction | None) -> ScoreAction:
    if action is not None:
        return action

    if eval_log.results is not None and len(eval_log.results.scores) > 0:
        user_action = Prompt.ask(
            "Overwrite existing scores or append as additional scores?",
            choices=["overwrite", "append", "o", "a"],
            default="append",
        )
        return "overwrite" if user_action in ["overwrite", "o"] else "append"
    else:
        return "overwrite"
```

## `_cli/trace.py`

```python
import os
import shlex
import time
from datetime import datetime
from json import dumps
from pathlib import Path
from typing import Callable

import click
from pydantic_core import to_json
from rich import print as r_print
from rich.console import Console, RenderableType
from rich.table import Column, Table

from inspect_ai._util.error import PrerequisiteError
from inspect_ai._util.trace import (
    ActionTraceRecord,
    TraceRecord,
    inspect_trace_dir,
    list_trace_files,
    read_trace_file,
)


@click.group("trace")
def trace_command() -> None:
    """List and read execution traces.

    Inspect includes a TRACE log-level which is right below the HTTP and INFO log levels (so not written to the console by default). However, TRACE logs are always recorded to a separate file, and the last 10 TRACE logs are preserved. The 'trace' command provides ways to list and read these traces.

    Learn more about execution traces at https://inspect.aisi.org.uk/tracing.html.
    """
    return None


@trace_command.command("list")
@click.option(
    "--json",
    type=bool,
    is_flag=True,
    default=False,
    help="Output listing as JSON",
)
def list_command(json: bool) -> None:
    """List all trace files."""
    list_command_impl(json)


def list_command_impl(json: bool, trace_dir: Path | None = None) -> None:
    """List all trace files."""
    trace_files = list_trace_files(trace_dir)
    if json:
        print(
            dumps(
                [dict(file=str(file.file), mtime=file.mtime) for file in trace_files],
                indent=2,
            )
        )
    else:
        table = Table(box=None, show_header=True, pad_edge=False)
        table.add_column("Time")
        table.add_column("Trace File")
        for file in trace_files:
            mtime = datetime.fromtimestamp(file.mtime).astimezone()
            table.add_row(
                mtime.strftime("%d-%b %H:%M:%S %Z"), shlex.quote(str(file.file))
            )
        r_print(table)


@trace_command.command("dump")
@click.argument("trace-file", type=str, required=False)
@click.option(
    "--filter",
    type=str,
    help="Filter (applied to trace message field).",
)
def dump_command(trace_file: str | None, filter: str | None) -> None:
    """Dump a trace file to stdout (as a JSON array of log records)."""
    dump_command_impl(trace_file, filter)


def dump_command_impl(
    trace_file: str | None, filter: str | None, trace_dir: Path | None = None
) -> None:
    """Dump a trace file to stdout (as a JSON array of log records)."""
    trace_file_path = _resolve_trace_file_path(trace_file, trace_dir)

    traces = read_trace_file(trace_file_path)

    if filter:
        filter = filter.lower()
        traces = [trace for trace in traces if filter in trace.message.lower()]

    print(
        to_json(traces, indent=2, exclude_none=True, fallback=lambda _: None).decode()
    )


@trace_command.command("http")
@click.argument("trace-file", type=str, required=False)
@click.option(
    "--filter",
    type=str,
    help="Filter (applied to trace message field).",
)
@click.option(
    "--failed",
    type=bool,
    is_flag=True,
    default=False,
    help="Show only failed HTTP requests (non-200 status)",
)
def http_command(trace_file: str | None, filter: str | None, failed: bool) -> None:
    """View all HTTP requests in the trace log."""
    http_command_impl(trace_file, filter, failed)


def http_command_impl(
    trace_file: str | None,
    filter: str | None,
    failed: bool,
    trace_dir: Path | None = None,
) -> None:
    """View all HTTP requests in the trace log."""
    _, traces = _read_traces(trace_file, "HTTP", filter, trace_dir)

    last_timestamp = ""
    table = Table(Column(), Column(), box=None)
    for trace in traces:
        if failed and "200 OK" in trace.message:
            continue
        timestamp = trace.timestamp.split(".")[0]
        if timestamp == last_timestamp:
            timestamp = ""
        else:
            last_timestamp = timestamp
            timestamp = f"[{timestamp}]"
        table.add_row(timestamp, trace.message)

    if table.row_count > 0:
        r_print(table)


@trace_command.command("anomalies")
@click.argument("trace-file", type=str, required=False)
@click.option(
    "--filter",
    type=str,
    help="Filter (applied to trace message field).",
)
@click.option(
    "--all",
    is_flag=True,
    default=False,
    help="Show all anomolies including errors and timeouts (by default only still running and cancelled actions are shown).",
)
def anomolies_command(trace_file: str | None, filter: str | None, all: bool) -> None:
    """Look for anomalies in a trace file (never completed or cancelled actions)."""
    anomolies_command_impl(trace_file, filter, all)


def anomolies_command_impl(
    trace_file: str | None, filter: str | None, all: bool, trace_dir: Path | None = None
) -> None:
    """Look for anomalies in a trace file (never completed or cancelled actions)."""
    trace_file_path, traces = _read_traces(trace_file, None, filter, trace_dir)

    # Track started actions
    running_actions: dict[str, ActionTraceRecord] = {}
    canceled_actions: dict[str, ActionTraceRecord] = {}
    error_actions: dict[str, ActionTraceRecord] = {}
    timeout_actions: dict[str, ActionTraceRecord] = {}
    start_trace: ActionTraceRecord | None = None

    def action_started(trace: ActionTraceRecord) -> None:
        running_actions[trace.trace_id] = trace

    def action_completed(trace: ActionTraceRecord) -> ActionTraceRecord:
        nonlocal start_trace
        start_trace = running_actions.get(trace.trace_id)
        if start_trace:
            del running_actions[trace.trace_id]
            return start_trace
        else:
            raise RuntimeError(f"Expected {trace.trace_id} in action dictionary.")

    def action_failed(trace: ActionTraceRecord) -> None:
        nonlocal start_trace
        if all:
            assert start_trace
            error_actions[start_trace.trace_id] = trace

    def action_canceled(trace: ActionTraceRecord) -> None:
        nonlocal start_trace
        assert start_trace
        canceled_actions[start_trace.trace_id] = trace

    def action_timeout(trace: ActionTraceRecord) -> None:
        nonlocal start_trace
        if all:
            assert start_trace
            timeout_actions[start_trace.trace_id] = trace

    for trace in traces:
        if isinstance(trace, ActionTraceRecord):
            match trace.event:
                case "enter":
                    action_started(trace)
                case "exit":
                    action_completed(trace)
                case "cancel":
                    start_trace = action_completed(trace)
                    trace.start_time = start_trace.start_time
                    action_canceled(trace)
                case "error":
                    start_trace = action_completed(trace)
                    trace.start_time = start_trace.start_time
                    action_failed(trace)
                case "timeout":
                    start_trace = action_completed(trace)
                    trace.start_time = start_trace.start_time
                    action_timeout(trace)
                case _:
                    print(f"Unknown event type: {trace.event}")

    # do we have any traces?
    if (
        len(running_actions)
        + len(canceled_actions)
        + len(error_actions)
        + len(timeout_actions)
        == 0
    ):
        print(f"TRACE: {shlex.quote(trace_file_path.as_posix())}\n")
        if all:
            print("No anomalies found in trace log.")
        else:
            print(
                "No running or cancelled actions found in trace log (pass --all to see errors and timeouts)."
            )
        return

    with open(os.devnull, "w") as f:
        # generate output
        console = Console(record=True, file=f)

        def print_fn(o: RenderableType) -> None:
            console.print(o, highlight=False)

        print_fn(f"[bold]TRACE: {shlex.quote(trace_file_path.as_posix())}[bold]")

        _print_bucket(print_fn, "Running Actions", running_actions)
        _print_bucket(print_fn, "Cancelled Actions", canceled_actions)
        _print_bucket(print_fn, "Error Actions", error_actions)
        _print_bucket(print_fn, "Timeout Actions", timeout_actions)

        # print
        print(console.export_text(styles=True).strip())


def _read_traces(
    trace_file: str | None,
    level: str | None = None,
    filter: str | None = None,
    trace_dir: Path | None = None,
) -> tuple[Path, list[TraceRecord]]:
    trace_file_path = _resolve_trace_file_path(trace_file, trace_dir)
    traces = read_trace_file(trace_file_path)

    if level:
        traces = [trace for trace in traces if trace.level == level]

    if filter:
        filter = filter.lower()
        traces = [trace for trace in traces if filter in trace.message.lower()]

    return (trace_file_path, traces)


def _print_bucket(
    print_fn: Callable[[RenderableType], None],
    label: str,
    bucket: dict[str, ActionTraceRecord],
) -> None:
    if len(bucket) > 0:
        # Sort the items in chronological order of when
        # they finished so the first finished item is at the top
        sorted_actions = sorted(
            bucket.values(),
            key=lambda record: (record.start_time or 0) + (record.duration or 0),
            reverse=True,
        )

        # create table
        table = Table(
            Column(""),
            Column("", justify="right"),
            Column(""),
            Column("", width=22),
            box=None,
            title=label,
            title_justify="left",
            title_style="bold",
            pad_edge=False,
            padding=(0, 1),
        )

        for action in sorted_actions:
            # Compute duration (use the event duration or time since started)
            duration = (
                action.duration
                if action.duration is not None
                else time.time() - action.start_time
                if action.start_time is not None
                else 0.0
            )

            # The event start time
            start_time = formatTime(action.start_time) if action.start_time else "None"

            # Event detail
            detail = (
                f"{action.detail or action.message} {action.error}"
                if action.event == "error"
                else (action.detail or action.message)
            )

            table.add_row(
                action.action,
                f"{round(duration, 2):.2f}s".rjust(8),
                f" {detail}",
                start_time,
            )

        print_fn("")
        print_fn(table)


def _resolve_trace_file(trace_file: str | None, trace_dir: Path | None = None) -> str:
    if trace_file is None:
        trace_files = list_trace_files(trace_dir)
        if len(trace_files) == 0:
            raise PrerequisiteError("No trace files currently availalble.")
        trace_file = str(trace_files[0].file)
    return trace_file


def _resolve_trace_file_path(
    trace_file: str | None, trace_dir: Path | None = None
) -> Path:
    trace_dir = trace_dir or inspect_trace_dir()
    trace_file = _resolve_trace_file(trace_file, trace_dir)
    trace_file_path = Path(trace_file)
    if not trace_file_path.is_absolute():
        trace_file_path = trace_dir / trace_file_path

    if not trace_file_path.exists():
        raise PrerequisiteError(
            f"The specified trace file '{trace_file_path}' does not exist."
        )

    return trace_file_path


def formatTime(timestamp: float) -> str:
    dt = datetime.fromtimestamp(timestamp).astimezone()
    return dt.strftime("%H:%M:%S %Z")
```

## `_cli/util.py`

```python
from typing import Any, Callable

import click
import yaml
from pydantic import ValidationError

from inspect_ai._util.config import resolve_args
from inspect_ai.model import GenerateConfig, Model, get_model
from inspect_ai.util._sandbox.environment import SandboxEnvironmentSpec


def int_or_bool_flag_callback(
    true_value: int, false_value: int = 0, is_one_true: bool = True
) -> Callable[[click.Context, click.Parameter, Any], int]:
    def callback(ctx: click.Context, param: click.Parameter, value: Any) -> int:
        """Callback to parse the an option that can either be a boolean flag or integer.

        Desired behavior:
        - Not specified at all -> false_value
        - Specified with no value -> true_value
        - Specified with "true"/"false" -> true_value or false_value respectively
        - Specified with an integer -> that integer
        """
        # 1. If this parameter was never given on the command line,
        #    then we return 0.
        source = ctx.get_parameter_source(param.name) if param.name else ""
        if source == click.core.ParameterSource.DEFAULT:
            # Means the user did NOT specify the flag at all
            return false_value

        # 2. The user did specify the flag. If value is None,
        #    that means they used the flag with no argument, e.g. --my-flag
        if value is None:
            return true_value

        # 3. If there is a value, try to parse booleans or an integer.
        lower_val = value.lower()
        true_vals = {"true", "yes"}
        if is_one_true:
            true_vals.add("1")
        if lower_val in true_vals:
            return true_value
        elif lower_val in ("false", "no", "0"):
            return false_value
        else:
            # 4. Otherwise, assume it is an integer
            try:
                return int(value)
            except ValueError:
                raise click.BadParameter(
                    f"Expected 'true', 'false', or an integer for --{param.name}. Got: {value}"
                )

    return callback


def int_bool_or_str_flag_callback(
    true_value: int, false_value: int | None = None
) -> Callable[[click.Context, click.Parameter, Any], int | str | None]:
    """Callback to parse an option that can be a boolean flag, integer, or string.

    This is an extended version of int_or_bool_flag_callback that also supports
    string values when the input cannot be parsed as a boolean or integer.

    Args:
        true_value: Value to return when flag is specified without argument or with "true"
        false_value: Value to return when flag is not specified or with "false"

    Returns:
        A click callback function that returns int, str, or None
    """

    def callback(
        ctx: click.Context, param: click.Parameter, value: Any
    ) -> int | str | None:
        """Callback to parse an option that can be a boolean flag, integer, or string.

        Desired behavior:
        - Not specified at all -> false_value
        - Specified with no value -> true_value
        - Specified with "true"/"false" -> true_value or false_value respectively
        - Specified with an integer -> that integer
        - Specified with any other string -> that string
        """
        # 1. If this parameter was never given on the command line,
        #    then we return false_value.
        source = ctx.get_parameter_source(param.name) if param.name else ""
        if source == click.core.ParameterSource.DEFAULT:
            # Means the user did NOT specify the flag at all
            return false_value

        # 2. The user did specify the flag. If value is None,
        #    that means they used the flag with no argument, e.g. --my-flag
        if value is None:
            return true_value

        # 3. If there is a value, try to parse booleans first.
        lower_val = value.lower()
        if lower_val in ("true", "yes", "1"):
            return true_value
        elif lower_val in ("false", "no", "0"):
            return false_value
        else:
            # 4. Try to parse as an integer
            try:
                return int(value)
            except ValueError:
                return str(value)

    return callback


def parse_cli_config(
    args: tuple[str, ...] | list[str] | None, config: str | None
) -> dict[str, Any]:
    # start with file if any
    cli_config: dict[str, Any] = {}
    if config is not None:
        cli_config = cli_config | resolve_args(config)

    # merge in cli args
    cli_args = parse_cli_args(args)
    cli_config.update(**cli_args)
    return cli_config


def parse_cli_args(
    args: tuple[str, ...] | list[str] | None, force_str: bool = False
) -> dict[str, Any]:
    params: dict[str, Any] = dict()
    if args:
        for arg in list(args):
            parts = arg.split("=")
            if len(parts) > 1:
                key = parts[0].replace("-", "_")
                value = yaml.safe_load("=".join(parts[1:]))
                if isinstance(value, str):
                    value = value.split(",")
                    value = value if len(value) > 1 else value[0]
                params[key] = str(value) if force_str else value
    return params


def parse_model_role_cli_args(
    model_roles: tuple[str, ...] | None,
) -> dict[str, str | Model]:
    """Parse model roles from CLI args. Supports key-value, YAML, and JSON formats.

    Args:
        model_roles: Tuple of strings to parse as model roles.

    Returns:
        Dictionary of role names to model names or model instances.

    Examples:
        ("grader=mockllm/model",) -> {'grader': 'mockllm/model'}
        ("grader={model: mockllm/model, temperature: 0.5}",) -> {'grader': <Model>}
        ('grader={"model": "mockllm/model", "temperature": 0.5}',) -> {'grader': <Model>}
    """
    try:
        parsed_args = parse_cli_args(model_roles, force_str=False)
    except Exception as e:
        raise ValueError(
            "Could not parse model role arguments. Should be key-value pairs or valid YAML/JSON."
        ) from e
    for role_name, params in parsed_args.items():
        # if value is a dict, create a model instance
        if isinstance(params, dict):
            model_name = params.pop("model", None)
            model_args = params.pop("model_args", {})
            if not isinstance(model_args, dict):
                raise ValueError("model_args must be a dict")
            try:
                config = GenerateConfig(**params)
            except ValidationError as e:
                raise ValueError(
                    f"Invalid config for model role '{role_name}': {e}"
                ) from e
            parsed_args[role_name] = get_model(model_name, config=config, **model_args)
        # else assume it is just a model name and leave it as a string
    return parsed_args


def parse_sandbox(sandbox: str | None) -> SandboxEnvironmentSpec | None:
    if sandbox is not None:
        parts = sandbox.split(":", maxsplit=1)
        if len(parts) == 1:
            return SandboxEnvironmentSpec(sandbox)
        else:
            return SandboxEnvironmentSpec(parts[0], parts[1])
    else:
        return None
```

## `_cli/view.py`

```python
import functools
import os
from typing import Any, Callable, cast

import click
from typing_extensions import Unpack

from inspect_ai._util.constants import DEFAULT_SERVER_HOST, DEFAULT_VIEW_PORT
from inspect_ai._view.view import view
from inspect_ai.log._bundle import bundle_log_dir, embed_log_dir

from .common import CommonOptions, common_options, process_common_options


def start_options(func: Callable[..., Any]) -> Callable[..., click.Context]:
    @click.option(
        "--recursive",
        type=bool,
        is_flag=True,
        default=True,
        help="Include all logs in log_dir recursively.",
    )
    @click.option(
        "--host",
        default=DEFAULT_SERVER_HOST,
        help="Tcp/Ip host. Note: you can use `0.0.0.0` to expose the viewer and connect remotely (e.g. SSH).",
    )
    @click.option("--port", default=DEFAULT_VIEW_PORT, help="TCP/IP port")
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> click.Context:
        return cast(click.Context, func(*args, **kwargs))

    return wrapper


# Define the base command group
@click.group(name="view", invoke_without_command=True)
@start_options
@common_options
@click.pass_context
def view_command(ctx: click.Context, **kwargs: Unpack[CommonOptions]) -> None:
    """Inspect log viewer.

    Learn more about using the log viewer at https://inspect.aisi.org.uk/log-viewer.html.
    """
    if ctx.invoked_subcommand is None:
        ctx.invoke(start, **kwargs)
    else:
        pass


@view_command.command("start")
@start_options
@common_options
def start(
    recursive: bool,
    host: str,
    port: int,
    **common: Unpack[CommonOptions],
) -> None:
    """View evaluation logs."""
    # read common options
    process_common_options(common)

    # resolve optional auth token
    INSPECT_VIEW_AUTHORIZATION_TOKEN = "INSPECT_VIEW_AUTHORIZATION_TOKEN"
    authorization = os.environ.get(INSPECT_VIEW_AUTHORIZATION_TOKEN, None)
    if authorization:
        # this indicates we are in vscode -- we want to set the log level to HTTP
        # in vscode, updated versions of the extension do this but we set it
        # manually here as a temporary bridge for running against older versions
        common["log_level"] = "HTTP"
        del os.environ[INSPECT_VIEW_AUTHORIZATION_TOKEN]
        os.unsetenv(INSPECT_VIEW_AUTHORIZATION_TOKEN)

    # run the viewer
    view(
        log_dir=common["log_dir"],
        recursive=recursive,
        host=host,
        port=port,
        authorization=authorization,
        log_level=common["log_level"],
    )


@view_command.command("bundle")
@common_options
@click.option(
    "--output-dir",
    required=True,
    help="The directory where bundled output will be placed.",
)
@click.option(
    "--overwrite",
    type=bool,
    is_flag=True,
    default=False,
    help="Overwrite files in the output directory.",
)
def bundle_command(
    output_dir: str,
    overwrite: bool,
    **common: Unpack[CommonOptions],
) -> None:
    """Bundle evaluation logs"""
    # process common options
    process_common_options(common)

    bundle_log_dir(
        output_dir=output_dir, log_dir=common["log_dir"], overwrite=overwrite
    )


@view_command.command("embed")
@common_options
def embed_command(
    **common: Unpack[CommonOptions],
) -> None:
    """Embed a lightweight viewer into a log directory."""
    process_common_options(common)

    embed_log_dir(log_dir=common["log_dir"])
```

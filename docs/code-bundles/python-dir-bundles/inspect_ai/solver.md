# Python Bundle: `solver`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `17`

## Files

- `solver/__init__.py`
- `solver/_basic_agent.py`
- `solver/_bridge.py`
- `solver/_chain.py`
- `solver/_constants.py`
- `solver/_critique.py`
- `solver/_fork.py`
- `solver/_human_agent.py`
- `solver/_multiple_choice.py`
- `solver/_plan.py`
- `solver/_prompt.py`
- `solver/_run.py`
- `solver/_solver.py`
- `solver/_task_state.py`
- `solver/_transcript.py`
- `solver/_use_tools.py`
- `solver/_util.py`

## `solver/__init__.py`

```python
from inspect_ai._util.deprecation import relocated_module_attribute

from ._basic_agent import basic_agent
from ._bridge import bridge
from ._chain import chain
from ._critique import self_critique
from ._fork import fork
from ._human_agent import human_agent
from ._multiple_choice import MultipleChoiceTemplate, multiple_choice
from ._plan import Plan, plan
from ._prompt import (
    assistant_message,
    chain_of_thought,
    prompt_template,
    system_message,
    user_message,
)
from ._solver import Generate, Solver, SolverSpec, generate, solver
from ._task_state import Choice, Choices, TaskState
from ._use_tools import use_tools

__all__ = [
    "basic_agent",
    "bridge",
    "human_agent",
    "chain",
    "fork",
    "generate",
    "prompt_template",
    "chain_of_thought",
    "multiple_choice",
    "system_message",
    "user_message",
    "assistant_message",
    "self_critique",
    "use_tools",
    "plan",
    "Plan",
    "Solver",
    "SolverSpec",
    "solver",
    "Choice",
    "Choices",
    "TaskState",
    "Generate",
    "MultipleChoiceTemplate",
]


_TOOL_MODULE_VERSION_3_18 = "0.3.18"
_TOOL_MODULE_VERSION_3_19 = "0.3.19"
_SUBTASKS_MODULE_VERSION = "0.3.26"
_SAMPLE_LIMIT_VERSION = "0.3.91"
_REMOVED_IN = "0.4"
relocated_module_attribute(
    "Tool", "inspect_ai.tool.Tool", _TOOL_MODULE_VERSION_3_18, _REMOVED_IN
)
relocated_module_attribute(
    "ToolEnvironment",
    "inspect_ai.util.SandboxEnvironment",
    _TOOL_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ToolEnvironments",
    "inspect_ai.util.SandboxEnvironments",
    _TOOL_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ToolEnvironmentSpec",
    "inspect_ai.util.SandboxEnvironmentSpec",
    _TOOL_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "ToolError", "inspect_ai.tool.ToolError", _TOOL_MODULE_VERSION_3_18, _REMOVED_IN
)
relocated_module_attribute(
    "ToolResult", "inspect_ai.tool.ToolResult", _TOOL_MODULE_VERSION_3_18, _REMOVED_IN
)
relocated_module_attribute(
    "tool", "inspect_ai.tool.tool", _TOOL_MODULE_VERSION_3_18, _REMOVED_IN
)
relocated_module_attribute(
    "tool_environment",
    "inspect_ai.util.sandbox",
    _TOOL_MODULE_VERSION_3_18,
    _REMOVED_IN,
)
relocated_module_attribute(
    "toolenv", "inspect_ai.util.sandboxenv", _TOOL_MODULE_VERSION_3_18, _REMOVED_IN
)
relocated_module_attribute(
    "bash", "inspect_ai.tool.bash", _TOOL_MODULE_VERSION_3_19, _REMOVED_IN
)
relocated_module_attribute(
    "python", "inspect_ai.tool.python", _TOOL_MODULE_VERSION_3_19, _REMOVED_IN
)
relocated_module_attribute(
    "web_search", "inspect_ai.tool.web_search", _TOOL_MODULE_VERSION_3_19, _REMOVED_IN
)
relocated_module_attribute(
    "Transcript",
    "inspect_ai.log.Transcript",
    _SUBTASKS_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "transcript",
    "inspect_ai.log.transcript",
    _SUBTASKS_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "Store",
    "inspect_ai.util.Store",
    _SUBTASKS_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "store",
    "inspect_ai.util.store",
    _SUBTASKS_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "Subtask",
    "inspect_ai.util.Subtask",
    _SUBTASKS_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "subtask",
    "inspect_ai.util.subtask",
    _SUBTASKS_MODULE_VERSION,
    _REMOVED_IN,
)
relocated_module_attribute(
    "SampleLimitExceededError",
    "inspect_ai.util.LimitExceededError",
    _SAMPLE_LIMIT_VERSION,
    _REMOVED_IN,
)
```

## `solver/_basic_agent.py`

```python
from logging import getLogger
from typing import Awaitable, Callable, cast

from typing_extensions import TypedDict, Unpack

from inspect_ai._util._async import is_callable_coroutine
from inspect_ai.model._cache import CachePolicy
from inspect_ai.model._call_tools import execute_tools
from inspect_ai.model._chat_message import ChatMessage, ChatMessageTool, ChatMessageUser
from inspect_ai.model._model import get_model
from inspect_ai.scorer._metric import Score, ValueToFloat, value_to_float
from inspect_ai.scorer._score import score
from inspect_ai.solver._chain import chain
from inspect_ai.tool._tool import Tool, ToolResult, tool
from inspect_ai.tool._tool_with import tool_with
from inspect_ai.util._limit import token_limit as create_token_limit

from ._prompt import system_message
from ._solver import Generate, Solver, solver
from ._task_state import TaskState
from ._use_tools import use_tools

logger = getLogger(__name__)

DEFAULT_SYSTEM_MESSAGE = """
You are a helpful assistant attempting to submit the correct answer. You have
several functions available to help with finding the answer. Each message
may perform one function call. You will see the result of the function right
after sending the message. If you need to perform multiple actions, you can
always send more messages with subsequent function calls. Do some reasoning
before your actions, describing what function calls you are going to use and
how they fit into your plan.

When you have completed the task and have an answer, call the {submit}()
function to report it.
"""

DEFAULT_INCORRECT_MESSAGE = """
Your submission was incorrect. Please proceed and attempt to find the correct answer.
"""
DEFAULT_CONTINUE_MESSAGE = "Please proceed to the next step using your best judgement."
DEFAULT_SUBMIT_NAME = "submit"
DEFAULT_SUBMIT_DESCRIPTION = "Submit an answer for evaluation."


class BasicAgentDeprecatedArgs(TypedDict, total=False):
    max_messages: int | None


@solver
def basic_agent(
    *,
    init: Solver | list[Solver] | None = None,
    tools: list[Tool] | Solver | None = None,
    cache: bool | CachePolicy = False,
    max_attempts: int = 1,
    message_limit: int | None = None,
    token_limit: int | None = None,
    max_tool_output: int | None = None,
    score_value: ValueToFloat | None = None,
    incorrect_message: str
    | Callable[
        [TaskState, list[Score]], str | Awaitable[str]
    ] = DEFAULT_INCORRECT_MESSAGE,
    continue_message: str = DEFAULT_CONTINUE_MESSAGE,
    submit_name: str = DEFAULT_SUBMIT_NAME,
    submit_description: str = DEFAULT_SUBMIT_DESCRIPTION,
    submit_append: bool = False,
    **kwargs: Unpack[BasicAgentDeprecatedArgs],
) -> Solver:
    """Basic ReAct agent.

    Agent that runs a tool use loop until the model submits an answer using the
    `submit()` tool. Tailor the model's instructions by passing a `system_message()`
    and/or other steps to `init` (if no `init` is specified then a default system
    message will be used). Use `max_attempts` to support additional submissions if
    the initial submission(s) are incorrect.

    Submissions are evaluated using the task's main scorer, with value of 1.0
    indicating a correct answer. Scorer values are converted to float (e.g.
    "C" becomes 1.0) using the standard value_to_float() function. Provide an
    alternate conversion scheme as required via `score_value`.

    Args:
       init: Agent initialisation (defaults to system_message with basic ReAct prompt)
       tools: Tools available for the agent. Either a list of tools or a Solver that
          can yield dynamic tools per-sample.
       cache: Caching behaviour for generate responses (defaults to no caching).
       max_attempts: Maximum number of submissions to accept before terminating.
       message_limit: Limit on messages in sample before terminating agent.
          If not specified, will use limit_messages defined for the task. If there is none
          defined for the task and there is no `token_limit`, 50 will be used as a default.
       token_limit: Limit on tokens used in sample before terminating agent.
       max_tool_output: Maximum output length (in bytes).
          Defaults to max_tool_output from active GenerateConfig.
       score_value: Function used to extract float from scores (defaults
          to standard value_to_float())
       incorrect_message: User message reply for an incorrect submission from the model.
          Alternatively, a function which returns a message (function may optionally be async)
       continue_message: User message to urge the model to continue when it
          doesn't make a tool call.
       submit_name: Name for tool used to make submissions
          (defaults to 'submit')
       submit_description: Description of submit tool (defaults to
          'Submit an answer for evaluation')
       submit_append: Append the submit tool output to the model completion
           text (defaults to `False`, which means the submission overwrites
           the model completion).
       **kwargs: Deprecated arguments for backward compatibility.

    Returns:
        Plan for agent.
    """
    # resolve deprecated
    for arg, value in kwargs.items():
        if arg == "max_messages":
            # deprecated, don't warn yet
            message_limit = int(cast(int, value))

    # resolve init
    if init is None:
        init = system_message(DEFAULT_SYSTEM_MESSAGE, submit=submit_name)
    init = init if isinstance(init, list) else [init]

    # resolve tools
    if tools is None:
        tools = []
    tools = tools if isinstance(tools, Solver) else use_tools(tools, append=True)

    # resolve score_value function
    score_value_fn = score_value or value_to_float()

    # submission tool
    @tool
    def submit() -> Tool:
        async def execute(answer: str) -> ToolResult:
            """Submit an answer for evaluation.

            Args:
              answer (str): Submitted answer
            """
            return answer

        return execute

    # solver that adds submission tool
    @solver
    def submit_tool() -> Solver:
        async def solve(state: TaskState, generate: Generate) -> TaskState:
            state.tools.append(tool_with(submit(), submit_name, submit_description))
            return state

        return solve

    # helper to extract a submitted answer
    def submission(tool_results: list[ChatMessage]) -> str | None:
        return next(
            (
                result.text
                for result in tool_results
                if isinstance(result, ChatMessageTool)
                and result.function == submit_name
            ),
            None,
        )

    # main agent loop
    @solver
    def basic_agent_loop() -> Solver:
        async def solve(state: TaskState, generate: Generate) -> TaskState:
            # resolve message_limit -- prefer parameter then fall back to task.
            # if there is no message limit AND no token limit then provide
            # a default message limit of 50 (so that the task can't run forever
            # if the model never submits)
            state.message_limit = message_limit or state.message_limit
            if state.message_limit is None and token_limit is None:
                state.message_limit = 50

            # track attempts
            attempts = 0

            with create_token_limit(token_limit):
                # main loop
                while not state.completed:
                    # generate output and append assistant message
                    state.output = await get_model().generate(
                        input=state.messages, tools=state.tools, cache=cache
                    )
                    state.messages.append(state.output.message)

                    # check for context window overflow
                    if state.output.stop_reason == "model_length":
                        from inspect_ai.log._transcript import transcript

                        transcript().info(
                            "Agent terminated: model context window exceeded"
                        )
                        break

                    # resolve tools calls (if any)
                    if state.output.message.tool_calls:
                        # execute tool functions
                        tool_results, _ = await execute_tools(
                            [state.output.message],
                            state.tools,
                            max_output=max_tool_output,
                        )
                        state.messages.extend(tool_results)

                        # was an answer submitted?
                        answer = submission(tool_results)
                        if answer:
                            if submit_append:
                                state.output.completion = (
                                    f"{state.output.completion}\n\n{answer}".strip()
                                )
                            else:
                                state.output.completion = answer

                            # exit if we are at max_attempts
                            attempts += 1
                            if attempts >= max_attempts:
                                break

                            # exit if the submission is successful
                            answer_scores = await score(state)
                            if score_value_fn(answer_scores[0].value) == 1.0:
                                break

                            # otherwise notify the model that it was incorrect and continue
                            else:
                                if is_callable_coroutine(incorrect_message):
                                    response_message: str = await incorrect_message(
                                        state, answer_scores
                                    )  # type: ignore[misc,operator]
                                elif callable(incorrect_message):
                                    response_message = cast(
                                        str, incorrect_message(state, answer_scores)
                                    )
                                else:
                                    response_message = incorrect_message

                                state.messages.append(
                                    ChatMessageUser(content=response_message)
                                )

                    # no tool calls, urge the model to continue
                    else:
                        state.messages.append(ChatMessageUser(content=continue_message))

            return state

        return solve

    # return chain
    return chain(
        init
        + [
            tools,
            submit_tool(),
            basic_agent_loop(),
        ]
    )
```

## `solver/_bridge.py`

```python
from logging import getLogger
from typing import Any, Awaitable, Callable

from inspect_ai._util.logger import warn_once
from inspect_ai.agent._as_solver import as_solver

from ._solver import Solver, solver

logger = getLogger(__name__)


@solver
def bridge(agent: Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]) -> Solver:
    """Bridge an external agent into an Inspect Solver.

    See documentation at <https://inspect.ai-safety-institute.org.uk/agent-bridge.html>

    Args:
      agent: Callable which takes a sample `dict` and returns a result `dict`.

    Returns:
      Standard Inspect solver.
    """
    from inspect_ai.agent._bridge.bridge import bridge as agent_bridge

    warn_once(
        logger,
        "The bridge solver is deprecated. Please use the bridge agent from the agents module instead.",
    )

    return as_solver(agent_bridge(agent))
```

## `solver/_chain.py`

```python
from typing import Sequence, cast, overload

from typing_extensions import override

from inspect_ai.agent._agent import Agent, is_agent
from inspect_ai.agent._as_solver import as_solver

from ._solver import Generate, Solver, solver
from ._task_state import TaskState


@solver
def chain(
    *solvers: Solver | Agent | list[Solver] | list[Solver | Agent],
) -> Solver:
    """Compose a solver from multiple other solvers and/or agents.

    Solvers are executed in turn, and a solver step event
    is added to the transcript for each. If a solver returns
    a state with `completed=True`, the chain is terminated
    early.

    Args:
      *solvers: One or more solvers or agents to chain together.

    Returns:
      Solver that executes the passed solvers and agents as a chain.
    """
    # flatten lists and chains
    all_solvers: list[Solver] = []
    for s in solvers:
        all_solvers.extend(unroll(s))

    return Chain(all_solvers)


def unroll(
    solver: Solver | Agent | list[Solver] | list[Solver | Agent],
) -> list[Solver]:
    if isinstance(solver, list):
        unrolled: list[Solver] = []
        for s in solver:
            unrolled.extend(unroll(s))
        return unrolled
    elif is_agent(solver):
        return [as_solver(solver)]
    elif isinstance(solver, Chain):
        return unroll(solver._solvers)
    else:
        return [cast(Solver, solver)]


class Chain(Sequence[Solver], Solver):
    """Solver composed from multiple other solvers.

    Args:
      solvers (*Solver): One or more solvers to chain together.
    """

    def __init__(self, solvers: list[Solver]) -> None:
        self._solvers = solvers

    @overload
    def __getitem__(self, index: int) -> Solver: ...

    @overload
    def __getitem__(self, index: slice) -> Sequence[Solver]: ...

    @override
    def __getitem__(self, index: int | slice) -> Solver | Sequence[Solver]:
        return self._solvers[index]

    @override
    def __len__(self) -> int:
        return len(self._solvers)

    async def __call__(
        self,
        state: TaskState,
        generate: Generate,
    ) -> TaskState:
        from ._transcript import solver_transcript

        for slv in self._solvers:
            async with solver_transcript(slv, state) as st:
                state = await slv(state, generate)
                st.complete(state)
            if state.completed:
                break

        # return state
        return state
```

## `solver/_constants.py`

```python
SOLVER_ALL_PARAMS_ATTR = "__solver_all_params__"
```

## `solver/_critique.py`

```python
from inspect_ai._util.dict import omit
from inspect_ai.model import (
    ChatMessageUser,
    Model,
    get_model,
)
from inspect_ai.util import resource

from ._solver import Generate, Solver, solver
from ._task_state import TaskState


@solver
def self_critique(
    critique_template: str | None = None,
    completion_template: str | None = None,
    model: str | Model | None = None,
) -> Solver:
    """Solver which uses a model to critique the original answer.

    The `critique_template` is used to generate a critique
    and the `completion_template` is used to play that critique
    back to the model for an improved response. Note that you
    can specify an alternate `model` for critique (you don't
    need to use the model being evaluated).

    Args:
      critique_template: String or path to file
         containing critique template. The template uses two
         variables: `question` and `completion`.
         Variables from sample `metadata` are also available
         in the template.
      completion_template: String or path to file
          containing completion template. The template uses
          three variables: `question`,  `completion`, and `critique`
      model: Alternate model to be used
         for critique (by default the model being evaluated
         is used).
    """
    # resolve templates
    critique_templ = resource(critique_template or DEFAULT_CRITIQUE_TEMPLATE)
    completion_templ = resource(
        completion_template or DEFAULT_CRITIQUE_COMPLETION_TEMPLATE
    )

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        # resolve model
        nonlocal model
        model = model if isinstance(model, Model) else get_model(model)

        # metadata without critique template variables
        metadata = omit(state.metadata, ["question", "completion", "critique"])

        # run critique
        critique = await model.generate(
            critique_templ.format(
                question=state.input_text,
                completion=state.output.completion,
                **metadata,
            )
        )

        # add the critique as a user message
        state.messages.append(
            ChatMessageUser(
                content=completion_templ.format(
                    question=state.input_text,
                    completion=state.output.completion,
                    critique=critique.completion,
                    **metadata,
                ),
            )
        )

        # regenerate
        return await generate(state)

    return solve


DEFAULT_CRITIQUE_TEMPLATE = r"""
Given the following question and answer, please critique the answer. A good answer comprehensively answers the question and NEVER refuses to answer. If the answer is already correct do not provide critique - simply respond 'The original answer is fully correct'.

[BEGIN DATA]
***
[Question]: {question}
***
[Answer]: {completion}
***
[END DATA]

Critique: """


DEFAULT_CRITIQUE_COMPLETION_TEMPLATE = r"""
Given the following question, initial answer and critique please generate an improved answer to the question:

[BEGIN DATA]
***
[Question]: {question}
***
[Answer]: {completion}
***
[Critique]: {critique}
***
[END DATA]

If the original answer is already correct, just repeat the original answer exactly. Provide your answer at the end on its own line in the form "ANSWER: $ANSWER" (without quotes) where $ANSWER is the answer to the question.
"""
```

## `solver/_fork.py`

```python
import functools
from contextvars import ContextVar
from copy import deepcopy
from typing import Any, cast

from typing_extensions import overload

from inspect_ai._util._async import tg_collect
from inspect_ai._util.registry import registry_log_name, registry_params
from inspect_ai.util._subtask import subtask

from ._chain import Chain
from ._solver import Generate, Solver
from ._task_state import TaskState


@overload
async def fork(state: TaskState, solvers: Solver) -> TaskState: ...


@overload
async def fork(state: TaskState, solvers: list[Solver]) -> list[TaskState]: ...


async def fork(
    state: TaskState, solvers: Solver | list[Solver]
) -> TaskState | list[TaskState]:
    """Fork the TaskState and evaluate it against multiple solvers in parallel.

    Run several solvers against independent copies of a TaskState. Each
    Solver gets its own copy of the TaskState and is run (in parallel)
    in an independent Subtask (meaning that is also has its own independent
    Store that doesn't affect the Store of other subtasks or the parent).

    Args:
      state: Beginning TaskState
      solvers: Solvers to apply on the TaskState.
        Each Solver will get a standalone copy of the TaskState.

    Returns:
      Single TaskState or list of TaskState (depending on the input)
      with the results of applying the solver(s) to a forked copy
      of the TaskState.
    """
    if isinstance(solvers, Solver):
        return await solver_subtask(state, solvers)
    else:
        return await tg_collect(
            [functools.partial(solver_subtask, state, solver) for solver in solvers]
        )


async def solver_subtask(state: TaskState, solver: Solver) -> TaskState:
    # get the generate function for the current task
    generate = task_generate()
    if generate is None:
        raise RuntimeError("Called fork() outside of a running task.")

    # deepcopy the state
    state = deepcopy(state)

    # create a subtask so we get an independent store and transcript
    from ._transcript import solver_transcript

    # derive name and input
    if isinstance(solver, Chain):
        name = "chain"
        input: dict[str, Any] = {}
    else:
        name = registry_log_name(solver)
        input = registry_params(solver)

    @subtask(name=name, store=state.store, type="fork", input=input)  # type: ignore
    async def solve() -> TaskState:
        if not isinstance(solver, Chain):
            async with solver_transcript(solver, state) as st:
                new_state = await solver(state, generate)
                st.complete(new_state)
            return new_state
        else:
            return await solver(state, generate)

    # call it and return TaskState
    return cast(TaskState, await solve())


def set_task_generate(generate: Generate) -> None:
    _generate.set(generate)


def task_generate() -> Generate | None:
    return _generate.get(None)


_generate: ContextVar[Generate] = ContextVar("_generate")
```

## `solver/_human_agent.py`

```python
from logging import getLogger

from inspect_ai._util.logger import warn_once
from inspect_ai.agent._as_solver import as_solver

from ._solver import Solver, solver

logger = getLogger(__name__)


@solver
def human_agent(
    answer: bool | str = True,
    intermediate_scoring: bool = False,
    record_session: bool = True,
    user: str | None = None,
) -> Solver:
    """Human solver for agentic tasks that run in a Linux environment.

    The Human agent solver installs agent task tools in the default
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

    Returns:
       Solver: Human agent solver.
    """
    from inspect_ai.agent._human.agent import human_cli

    warn_once(
        logger,
        "The human_agent solver is deprecated. Please use the human_cli agent from the agents module instead.",
    )

    return as_solver(
        human_cli(
            answer=answer,
            intermediate_scoring=intermediate_scoring,
            record_session=record_session,
            user=user,
        )
    )
```

## `solver/_multiple_choice.py`

```python
import logging
import re
from enum import Enum
from random import Random

from typing_extensions import TypedDict, Unpack

from inspect_ai._util.answer import answer_character, answer_index
from inspect_ai._util.logger import warn_once
from inspect_ai.util import resource

from ._solver import Generate, Solver, solver
from ._task_state import Choices, TaskState

logger = logging.getLogger(__name__)

SINGLE_ANSWER_TEMPLATE = r"""
Answer the following multiple choice question. The entire content of your response should be of the following format: 'ANSWER: $LETTER' (without quotes) where LETTER is one of {letters}.

{question}

{choices}
""".strip()

SINGLE_ANSWER_TEMPLATE_COT = r"""
Answer the following multiple choice question. The last line of your response should be of the following format: 'ANSWER: $LETTER' (without quotes) where LETTER is one of {letters}. Think step by step before answering.

{question}

{choices}
""".strip()

MULTIPLE_ANSWER_TEMPLATE = r"""
Answer the following multiple choice question where multiple answers may be correct. The entire content of your response should be of the following format: 'ANSWER: $LETTERS' (without quotes) where LETTERS is one or more of {letters}.

{question}

{choices}
""".strip()


MULTIPLE_ANSWER_TEMPLATE_COT = r"""
Answer the following multiple choice question where multiple answers may be correct. The last line of your response should be of the following format: 'ANSWER: $LETTERS' (without quotes) where LETTERS is one or more of {letters}. Think step by step before answering.

{question}

{choices}
""".strip()


def unshuffle_choices(choices: Choices) -> Choices:
    # `sorted` returns `list[Choice]`, but for consistency we wrap this back
    # into a `Choices` object
    return Choices(sorted(choices, key=lambda choice: choice.original_position))


def answer_options(choices: Choices) -> str:
    r"""
    Returns the `choices` formatted as a multiple choice question, e.g.:

    ["choice 1", "choice 2", "choice 3"] ->
        "A) choice 1\nB) choice 2\nC) choice 3"
    """
    indexes = list(range(len(choices)))

    return "\n".join(
        [f"{answer_character(i)}) {choices[j].value}" for i, j in enumerate(indexes)]
    )


def prompt(question: str, choices: Choices, template: str) -> str:
    choices_text = answer_options(choices)
    letters = ",".join(answer_character(i) for i in range(len(choices)))

    return template.format(
        choices=choices_text,
        letters=letters,
        question=question,
    )


def parse_answers(state: TaskState, multiple_correct: bool) -> set[str]:
    """
    Convenience function for extracting answers from the state output.

    The generated response must be in the format 'ANSWER: <answers>',
    otherwise we can't extract what the model thinks is "true". We can be a
    bit flexible whether these are "AB" vs "A,B" vs "A B".

    However, if the answer isn't in the expected format the model has
    failed in the task so we'll ultimately just mark it as incorrect
    """
    # First check whether the string strictly ends with the expected answer
    # In this case, we're looking for a single line which contains the expected
    # ANSWER: <answer> string with only whitespace or a period/full stop at the end.
    match = re.search(
        r"(?i)^ANSWER\s*:\s*([A-Za-z\d ,]+)\s*(?:$|\n|\.)",
        state.output.completion,
        flags=re.MULTILINE,
    )

    # If we couldn't match the strict version, we can try the less strict
    # version for backward compatibility
    if match is None:
        match = re.search(
            r"(?i)ANSWER\s*:\s*([A-Za-z\d ,]+)(?:[^\w]|\n|$|\.)",
            state.output.completion,
        )

    if match is None:
        return set()

    matched = match.group(1)

    # Strip trailing period / full stop
    matched = matched.strip()
    matched = matched.rstrip(".")

    allowed_options = set(answer_character(i) for i in range(len(state.choices)))

    if multiple_correct:
        # Match must contain only the allowed choices
        # (may be separated by commas, spaces, the word 'and', or nothing at all)

        matched = matched.replace(" and ", "")

        matched = matched.replace(" ", "")

        split_comma = set(matched.split(","))
        if split_comma.issubset(allowed_options):
            answers = split_comma
            return answers

        split_nothing = set(matched)
        if split_nothing.issubset(allowed_options):
            answers = split_nothing
            return answers

    else:
        # Match must contain a single letter in the allowed choices
        if matched in allowed_options:
            answers = {matched}
            return answers

    return set()


def set_choices_based_on_generated_response(
    state: TaskState, answers: set[str]
) -> None:
    true_answers = [answer_index(letter) for letter in answers]

    for i in range(len(state.choices)):
        if i in true_answers:
            state.choices.mark_choice(i, True)
        else:
            state.choices.mark_choice(i, False)


def pretend_we_didnt_shuffle(
    state: TaskState, original_question: str, template: str
) -> None:
    """
    If we shuffled the choices, revert them to their unshuffled versions in the message history

    This is essentially just for usability. Without doing this, matching up the
    sample choices to the target value(s) can be misleading:

        * You may be expecting a particular result from your dataset which
          doesn't show up in the logs, for example you're expecting all correct
          answers to be "A" but they're not.
        * The Log Viewer knows nothing about the `TaskState` or shuffling, it's
          just looking at the messages and the Score. This leads to
          inconsistencies between the raw `Target` and the answers we're getting
          back from the models.

    By pretending we didn't shuffle in the message history, these
    inconsistencies are easily resolved as the output is what's expected for a
    given `Sample` and `Target`.

    Note that this just rewrites message history. The `TaskState.choices` are
    left shuffled, to allow us to be transparent about this elsewhere (e.g. in
    the scoring explanation).
    """
    # First, change the prompt to the unshuffled version
    pretend_prompt = prompt(
        question=original_question,
        choices=unshuffle_choices(state.choices),
        template=template,
    )
    state.user_prompt.text = pretend_prompt

    # Then, change the last message to appear as though we received unshuffled
    # answers
    answer_text = ", ".join(
        sorted(
            [
                answer_character(choice.original_position)
                for choice in state.choices
                if choice.correct is True
            ]
        )
    )
    pretend_answer = f"ANSWER: {answer_text}"

    state.output.completion = pretend_answer
    state.messages[-1].content = pretend_answer


def valid_template(template: str) -> bool:
    """Check if a template has the required capture groups for a multiple choice question"""
    return bool(
        re.search(r"\{question\}", template) and re.search(r"\{choices\}", template)
    )


class MultipleChoiceTemplate(str, Enum):
    """Templates for multiple choice questions.

    Based on the multiple choice template in openai simple evals:
    https://github.com/openai/simple-evals/blob/main/mmlu_eval.py
    """

    SINGLE_ANSWER = SINGLE_ANSWER_TEMPLATE
    SINGLE_ANSWER_COT = SINGLE_ANSWER_TEMPLATE_COT
    MULTIPLE_ANSWER = MULTIPLE_ANSWER_TEMPLATE
    MULTIPLE_ANSWER_COT = MULTIPLE_ANSWER_TEMPLATE_COT


class DeprecatedArgs(TypedDict, total=False):
    shuffle: bool | Random


@solver
def multiple_choice(
    *,
    template: str | None = None,
    cot: bool = False,
    multiple_correct: bool = False,
    max_tokens: int | None = None,
    **kwargs: Unpack[DeprecatedArgs],
) -> Solver:
    """Multiple choice question solver. Formats a multiple choice question prompt, then calls `generate()`.

    Note that due to the way this solver works, it has some constraints:

    1. The `Sample` must have the `choices` attribute set.
    2. The only built-in compatible scorer is the `choice` scorer.
    3. It calls `generate()` internally, so you don't need to call it again

    Args:
      template: Template to use for the multiple choice question.
        The defaults vary based on the options and are taken from the `MultipleChoiceTemplate` enum. The template will have questions and possible answers substituted into it before being sent to the model. Consequently it requires three specific template variables:

          - `{question}`: The question to be asked.
          - `{choices}`: The choices available, which will be formatted as a
            list of A) ... B) ... etc. before sending to the model.
          - `{letters}`: (optional) A string of letters representing the choices, e.g.
            "A,B,C". Used to be explicit to the model about the possible answers.
      cot: Default `False`. Whether the solver should perform chain-of-thought
        reasoning before answering. NOTE: this has no effect if you provide a custom template.
      multiple_correct: Default `False`. Whether to allow multiple
        answers to the multiple choice question. For example, "What numbers are
        squares? A) 3, B) 4, C) 9" has multiple correct answers, B and C. Leave
        as `False` if there's exactly one correct answer from the choices
        available. NOTE: this has no effect if you provide a custom template.
      max_tokens: Default `None`. Controls the number of tokens generated through the call
        to generate().
      **kwargs (Any): Deprecated arguments for backward compatibility.

    #### Shuffling

    You can shuffle choices when you load your dataset by using the `shuffle_choices` method or parameter of the datasets API.
    """
    shuffle: bool | Random = False
    if "shuffle" in kwargs:
        shuffle = kwargs["shuffle"]

        if shuffle:
            warn_once(
                logger,
                "The multiple choice shuffle parameter is deprecated. Please shuffle choices at the time your dataset is read by using the shuffle_choices method/parameter of the datasets API.",
            )

    if template and not valid_template(template):
        raise ValueError(
            "The template must contain '{question}' and '{choices}' placeholders for string substitution."
        )

    if template is None:
        if multiple_correct:
            if cot:
                template = MULTIPLE_ANSWER_TEMPLATE_COT
            else:
                template = MULTIPLE_ANSWER_TEMPLATE
        else:
            if cot:
                template = SINGLE_ANSWER_TEMPLATE_COT
            else:
                template = SINGLE_ANSWER_TEMPLATE

    template = resource(template)

    if shuffle is True:
        shuffle = Random()

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        if not state.choices:
            raise ValueError("The multiple_choice solver requires samples with choices")

        if isinstance(shuffle, Random):
            state.choices.shuffle(shuffle)

        # Memoise the current prompt (which is the raw "question" part of the
        # sample). Required in case we unshuffle, because we then alter message
        # history based on the multiple-choice template.
        original_question = state.user_prompt.text

        state.user_prompt.text = prompt(
            question=state.user_prompt.text,
            choices=state.choices,
            template=str(template),
        )

        state = await generate(state, max_tokens=max_tokens)

        answers = parse_answers(state, multiple_correct)
        if answers:
            # If we've found answers, update the state appropriately
            set_choices_based_on_generated_response(
                state=state,
                answers=answers,
            )
            if shuffle:
                pretend_we_didnt_shuffle(
                    state=state,
                    original_question=original_question,
                    template=str(template),
                )

        return state

    return solve
```

## `solver/_plan.py`

```python
import inspect
from logging import getLogger
from typing import Any, Awaitable, Callable, TypeVar, cast

from inspect_ai._util.registry import (
    RegistryInfo,
    is_registry_object,
    registry_add,
    registry_create,
    registry_info,
    registry_name,
    registry_tag,
)

from ._solver import Generate, Solver
from ._task_state import TaskState

logger = getLogger(__name__)


class Plan(Solver):
    """Task plan: List of solvers with an optional finishing solver.

    The optional `finish` solver is called after executing the steps (including in the case
    where the steps were exited early due to `TaskState.completed = True`, `message_limit`,
    or `token_limit`).

    The optional `cleanup` function is called when the plan is complete (even if the plan
    is terminated due to an exception).
    """

    def __init__(
        self,
        steps: Solver | list[Solver],
        finish: Solver | None = None,
        cleanup: Callable[[TaskState], Awaitable[None]] | None = None,
        name: str | None = None,
        internal: bool = False,
    ) -> None:
        """Create a task plan.

        Args:
          steps (list[Solver]): Solvers to run for this plan.
          finish (Solver | None): Finishing solver that is always run even for early exit.
            Note that this solver is NOT run when exception are thrown (use `cleanup` for this)
          cleanup (Callable[[TaskState], Awaitable[None]] | None): Optional cleanup handler that
            is called at the end (even if an exception occurs). Note that this function takes
            a `TaskState` but does not return one (it is only for cleanup not for transforming
            the state).
          name (str | None): Optional name for plan (for log files).
          internal (bool): Internal use of Plan (prevent deprecation warning)
        """
        if isinstance(steps, Solver):
            self.steps = [steps]
        else:
            self.steps = steps

        self.finish = finish
        self.cleanup = cleanup
        self._name = name

        if not internal:
            from inspect_ai._util.logger import warn_once

            warn_once(
                logger,
                "Plan is deprecated: use chain() to compose a list of solvers.",
            )

    @property
    def name(self) -> str:
        if self._name is not None:
            return self._name
        elif is_registry_object(self):
            return registry_info(self).name
        else:
            return "plan"

    steps: list[Solver]
    """Solvers to run for this plan."""

    finish: Solver | None = None
    """Finishing solver that is always run even for early exit."""

    cleanup: Callable[[TaskState], Awaitable[None]] | None = None
    """Function  called at the end of the plan (even if an exception occurs).

    Note that this function takes a `TaskState` but does not return one
    (it is only for cleanup not for transforming the state). Note also that
    this function should be declared `async`.
    """

    async def __call__(
        self,
        state: TaskState,
        generate: Generate,
    ) -> TaskState:
        from ._transcript import solver_transcript

        try:
            # execute steps
            for index, solver in enumerate(self.steps):
                # run solver
                async with solver_transcript(solver, state) as st:
                    state = await solver(state, generate)
                    st.complete(state)

                # check for completed
                if state.completed:
                    # exit loop
                    break

            # execute finish
            if self.finish:
                async with solver_transcript(self.finish, state) as st:
                    state = await self.finish(state, generate)
                    st.complete(state)

        finally:
            # always do cleanup if we have one
            if self.cleanup:
                try:
                    await self.cleanup(state)
                except Exception as ex:
                    logger.warning(
                        f"Exception occurred during plan cleanup: {ex}", exc_info=ex
                    )

        return state


PlanType = TypeVar("PlanType", bound=Callable[..., Plan])


def plan(*plan: PlanType | None, name: str | None = None, **attribs: Any) -> Any:
    r"""Decorator for registering plans.

    Args:
      *plan (PlanType): Function returning `Plan` targeted by
        plain plan decorator without attributes (e.g. `@plan`)
      name (str | None):
        Optional name for plan. If the decorator has no name
        argument then the name of the function
        will be used to automatically assign a name.
      **attribs: (dict[str,Any]): Additional plan attributes.

    Returns:
        Plan with registry attributes.
    """

    def create_plan_wrapper(plan_type: PlanType) -> PlanType:
        # get the name and params
        plan_name = registry_name(plan_type, name or getattr(plan_type, "__name__"))
        params = list(inspect.signature(plan_type).parameters.keys())

        # create and return the wrapper
        def wrapper(*w_args: Any, **w_kwargs: Any) -> Plan:
            # create the plan
            plan = plan_type(*w_args, **w_kwargs)

            # tag it
            registry_tag(
                plan_type,
                plan,
                RegistryInfo(
                    type="plan",  # type: ignore[arg-type]
                    name=plan_name,
                    metadata=dict(attribs=attribs, params=params),
                ),
                *w_args,
                **w_kwargs,
            )

            # return it
            return plan

        return plan_register(
            plan=cast(PlanType, wrapper),
            name=plan_name,
            attribs=attribs,
            params=params,
        )

    from inspect_ai._util.logger import warn_once

    warn_once(
        logger,
        "@plan is deprecated: use @solver and chain() to compose a list of solvers.",
    )

    if plan:
        return create_plan_wrapper(cast(PlanType, plan[0]))
    else:
        return create_plan_wrapper


def plan_register(
    plan: PlanType, name: str, attribs: dict[str, Any], params: list[str]
) -> PlanType:
    r"""Register a plan.

    Args:
        plan (PlanType): function that returns a Plan
        name (str): Name of plan
        attribs (dict[str,Any]): Attributes of plan decorator
        params (list[str]): Plan parameter names

    Returns:
        Plan with registry attributes.
    """
    registry_add(
        plan,
        RegistryInfo(
            type="plan",  # type: ignore[arg-type]
            name=name,
            metadata=dict(attribs=attribs, params=params),
        ),
    )
    return plan


def plan_create(name: str, **kwargs: Any) -> Plan:
    r"""Create a Plan based on its registered name.

    Args:
        name (str): Name of plan
        **kwargs (dict): Optional creation arguments for the plan

    Returns:
        Plan with registry info attribute
    """
    return registry_create("plan", name, **kwargs)
```

## `solver/_prompt.py`

```python
from typing import Any

from inspect_ai._util.dict import omit
from inspect_ai._util.format import format_template
from inspect_ai.model._chat_message import (
    ChatMessageAssistant,
    ChatMessageSystem,
    ChatMessageUser,
)
from inspect_ai.util import resource

from ._solver import Generate, Solver, solver
from ._task_state import TaskState
from ._util import append_system_message


@solver
def prompt_template(template: str, **params: Any) -> Solver:
    """Parameterized prompt template.

    Prompt template containing a `{prompt}` placeholder and any
    number of additional `params`. All values contained in sample
    `metadata` and `store` are also automatically included in the
    `params`.

    Args:
      template: Template for prompt.
      **params: Parameters to fill into the template.

    Returns:
      A solver that uses the specified prompt template.
    """
    # determine the prompt template
    prompt_template = resource(template)

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        prompt = state.user_prompt
        kwargs = omit(state.metadata | state.store._data, ["prompt"]) | params
        prompt.text = format_template(prompt_template, {"prompt": prompt.text} | kwargs)
        return state

    return solve


@solver
def system_message(template: str, **params: Any) -> Solver:
    """Solver which inserts a system message into the conversation.

    System message template containing any number of optional `params`.
    for substitution using the `str.format()` method. All values
    contained in sample `metadata` and `store` are also automatically
    included in the `params`.

    The new message will go after other system messages (if there
    are none it will be inserted at the beginning of the conversation).

    Args:
      template: Template for system message.
      **params: Parameters to fill into the template.

    Returns:
      A solver that inserts the parameterised system message.
    """
    # read template
    content = resource(template)

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        kwargs = state.metadata | state.store._data | params
        append_system_message(
            state.messages, ChatMessageSystem(content=format_template(content, kwargs))
        )
        return state

    return solve


@solver
def user_message(template: str, **params: Any) -> Solver:
    """Solver which inserts a user message into the conversation.

    User message template containing any number of optional `params`.
    for substitution using the `str.format()` method. All values
    contained in sample `metadata` and `store` are also automatically
    included in the `params`.

    Args:
      template: Template for user message.
      **params: Parameters to fill into the template.

    Returns:
      A solver that inserts the parameterised user message.
    """
    # read template
    content = resource(template)

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        kwargs = state.metadata | state.store._data | params
        state.messages.append(ChatMessageUser(content=format_template(content, kwargs)))
        return state

    return solve


@solver
def assistant_message(template: str, **params: Any) -> Solver:
    """Solver which inserts an assistant message into the conversation.

    Assistant message template containing any number of optional `params`.
    for substitution using the `str.format()` method. All values
    contained in sample `metadata` and `store` are also automatically
    included in the `params`.

    Args:
      template: Template for assistant message.
      **params: Parameters to fill into the template.

    Returns:
      A solver that inserts the parameterised assistant message.
    """
    # read template
    content = resource(template)

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        kwargs = state.metadata | state.store._data | params
        state.messages.append(
            ChatMessageAssistant(
                content=format_template(content, kwargs), model=state.model.name
            )
        )
        return state

    return solve


DEFAULT_COT_TEMPLATE = r"""
{prompt}

Before answering, reason in a step-by-step manner as to get the right answer. Provide your answer at the end on its own line in the form "ANSWER: $ANSWER" (without quotes) where $ANSWER is the answer to the question.
"""


@solver
def chain_of_thought(template: str = DEFAULT_COT_TEMPLATE) -> Solver:
    """Solver which modifies the user prompt to encourage chain of thought.

    Args:
       template: String or path to file containing CoT template.
          The template uses a single variable: `prompt`.
    """

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        state.user_prompt.text = template.format(prompt=state.user_prompt.text)
        return state

    return solve
```

## `solver/_run.py`

```python
from copy import copy

from inspect_ai.model import ChatMessage, ChatMessageUser, ModelName, ModelOutput

from ._fork import task_generate
from ._solver import Solver
from ._task_state import TaskState


async def run(
    solver: Solver, input: str | list[ChatMessage]
) -> tuple[list[ChatMessage], ModelOutput | None]:
    """Run a solver over chat message input.

    Args:
        solver: Solver to run.
        input: Chat message input

    Returns:
        Tuple of `list[ChatMessage], ModelOutput | None` (returns
        [], None if no generates were done by the solver)
    """
    from inspect_ai.log._samples import sample_active

    # get the generate function for the current task
    generate = task_generate()
    if generate is None:
        raise RuntimeError("Called run() outside of a running task.")

    # get the active sample
    active = sample_active()
    if active is None:
        raise RuntimeError("Called run() outside of a running task")
    assert active.sample.id

    # build messages list
    messages: list[ChatMessage] = (
        [ChatMessageUser(content=input)] if isinstance(input, str) else input
    )

    # build state
    state = TaskState(
        model=ModelName(active.model),
        sample_id=active.sample.id,
        epoch=active.epoch,
        input=input,
        messages=copy(messages),
    )

    # run solver
    state = await solver(state, generate)

    # return any messages that don't match our initial prefix
    new_messages: list[ChatMessage] = []
    for index, message in enumerate(state.messages):
        if index >= len(messages) or message.id != messages[index].id:
            new_messages.append(message)

    return new_messages, state.output if len(state.output.choices) > 0 else None
```

## `solver/_solver.py`

```python
import inspect
from dataclasses import dataclass, field
from functools import wraps
from typing import (
    Any,
    Callable,
    Literal,
    ParamSpec,
    Protocol,
    TypeAlias,
    cast,
    overload,
    runtime_checkable,
)

from typing_extensions import Unpack

from inspect_ai._util._async import is_callable_coroutine
from inspect_ai._util.registry import (
    RegistryInfo,
    extract_named_params,
    registry_add,
    registry_create,
    registry_name,
    registry_tag,
)
from inspect_ai.agent._agent import Agent, is_agent
from inspect_ai.agent._as_solver import as_solver
from inspect_ai.model import GenerateConfigArgs
from inspect_ai.solver._constants import SOLVER_ALL_PARAMS_ATTR

from ._task_state import TaskState, set_sample_state


@runtime_checkable
class Generate(Protocol):
    async def __call__(
        self,
        state: TaskState,
        tool_calls: Literal["loop", "single", "none"] = "loop",
        **kwargs: Unpack[GenerateConfigArgs],
    ) -> TaskState:
        """Generate using the model and add the assistant message to the task state.

        Args:
            state: Beginning task state.
            tool_calls:
                - `"loop"` resolves tools calls and then invokes `generate()`,
                    proceeding in a loop which terminates when there are no more
                    tool calls, or `message_limit` or `token_limit` is exceeded.
                    This is the default behavior.
                - `"single"` resolves at most a single set of tool calls and then returns.
                - `"none"` does not resolve tool calls at all (in this
                    case you will need to invoke `call_tools()` directly).
            **kwargs: Optional generation config arguments.

        Returns:
            Updated TaskState.
        """
        ...


@dataclass(frozen=True)
class SolverSpec:
    """Solver specification used to (re-)create solvers."""

    solver: str
    """Solver name (simple name or file.py@name)."""

    args: dict[str, Any] = field(default_factory=dict)
    """Solver arguments."""

    args_passed: dict[str, Any] = field(default_factory=dict)
    """Solver arguments passed for invocation."""


@runtime_checkable
class Solver(Protocol):
    async def __call__(
        self,
        state: TaskState,
        generate: Generate,
    ) -> TaskState:
        r"""Contribute to solving an evaluation task.

        Transform a `TaskState`, returning the new state. Solvers may
        optionally call the `generate()` function to create a new
        state resulting from model generation. Solvers may also do
        prompt engineering or other types of elicitation.

        Args:
          state: State for tasks being evaluated.
          generate: Function for generating outputs.

        Returns:
          Updated TaskState.

        Examples:
          ```python
          @solver
          def prompt_cot(template: str) -> Solver:
              def solve(state: TaskState, generate: Generate) -> TaskState:
                  # insert chain of thought prompt
                  return state

              return solve
          ```
        """
        ...


P = ParamSpec("P")


def solver_register(solver: Callable[P, Solver], name: str = "") -> Callable[P, Solver]:
    r"""Register a function or class as a solver.

    Args:
        solver (Callable[P, Solver]):
            Function that returns a Solver or class derived Solver.
        name (str): Name of solver (Optional, defaults to object name)

    Returns:
        Solver with registry attributes.
    """
    solver_name = name if name else getattr(solver, "__name__")
    registry_add(solver, RegistryInfo(type="solver", name=solver_name))
    return solver


def solver_create(name: str, **kwargs: Any) -> Solver:
    r"""Create a Solver based on its registered name.

    Args:
        name (str): Name of solver (Optional, defaults to object name)
        **kwargs (dict): Optional creation arguments for the solver

    Returns:
        Solver with registry info attribute
    """
    return registry_create("solver", name, **kwargs)


SolverType: TypeAlias = Solver | Agent
"""Return type for @solver decorated functions. """


@overload
def solver(name: str) -> Callable[[Callable[P, Solver]], Callable[P, Solver]]: ...


@overload
def solver(name: Callable[P, SolverType]) -> Callable[P, Solver]: ...


def solver(
    name: str | Callable[P, SolverType],
) -> Callable[[Callable[P, Solver]], Callable[P, Solver]] | Callable[P, Solver]:
    r"""Decorator for registering solvers.

    Args:
        name:
            Optional name for solver. If the decorator has no name
            argument then the name of the underlying Callable[P, SolverType]
            object will be used to automatically assign a name.

    Returns:
        Solver with registry attributes.

    Examples:
        ```python
        @solver
        def prompt_cot(template: str) -> Solver:
            def solve(state: TaskState, generate: Generate) -> TaskState:
                # insert chain of thought prompt
                return state

            return solve
        ```
    """

    # create_solver_wrapper:
    #  (a) Add the SolverType to the registry using the appropriately
    #      package-namespaced name
    #  (b) Ensure that instances of Solver created by SolverType also
    #      carry registry info.
    def create_solver_wrapper(
        solver_type: Callable[P, SolverType], name: str | None = None
    ) -> Callable[P, Solver]:
        solver_name = registry_name(
            solver_type, name if name else getattr(solver_type, "__name__")
        )

        @wraps(solver_type)
        def solver_wrapper(*args: P.args, **kwargs: P.kwargs) -> Solver:
            solver = solver_type(*args, **kwargs)
            if is_agent(solver):
                solver = as_solver(solver)
            solver = cast(Solver, solver)

            if not is_callable_coroutine(solver):
                raise TypeError(f"'{solver}' is not declared as an async callable.")

            # if the solver is a class then we inject state tracking
            # by patching the __call__ method (this is because we
            # want to preserve the type, especially for code that e.g.
            # checks for Chain or Plan)
            if inspect.isclass(type(solver)):
                original_call = solver.__call__

                @wraps(original_call)
                async def call_with_state(
                    state: TaskState, generate: Generate
                ) -> TaskState:
                    state = await original_call(state, generate)
                    set_sample_state(state)
                    return state

                registered_solver = solver
                setattr(registered_solver, "__call__", call_with_state)

            # if its a function then use ordinary @wraps to preserve
            # the wrapped solver
            else:

                @wraps(solver)
                async def registered_solver(
                    state: TaskState, generate: Generate
                ) -> TaskState:
                    state = await solver(state, generate)
                    set_sample_state(state)
                    return state

            registry_tag(
                solver_type,
                registered_solver,
                RegistryInfo(type="solver", name=solver_name),
                *args,
                **kwargs,
            )

            named_params = extract_named_params(solver_type, True, *args, **kwargs)
            setattr(registered_solver, SOLVER_ALL_PARAMS_ATTR, named_params)

            return registered_solver

        # functools.wraps overrides the return type annotation of the inner function, so
        # we explicitly set it again
        solver_wrapper.__annotations__["return"] = Solver

        return solver_register(cast(Callable[P, Solver], solver_wrapper), solver_name)

    # for decorators with an explicit name, one more wrapper for the name
    if isinstance(name, str):

        def wrapper(solver_type: Callable[..., Solver]) -> Callable[..., Solver]:
            return create_solver_wrapper(solver_type, name)

        return wrapper

    # create a solver wrapper for the passed solver_type
    else:
        solver_type = name
        return create_solver_wrapper(solver_type)


@solver
def generate(
    tool_calls: Literal["loop", "single", "none"] = "loop",
    **kwargs: Unpack[GenerateConfigArgs],
) -> Solver:
    r"""Generate output from the model and append it to task message history.

    generate() is the default solver if none is specified for a given task.

    Args:
      tool_calls (Literal["loop", "single", "none"]): Resolve tool calls:
        - `"loop"` resolves tools calls and then invokes `generate()`,
            proceeding in a loop which terminates when there are no more
            tool calls or `message_limit` or `token_limit` is exceeded.
            This is the default behavior.
        - `"single"` resolves at most a single set of tool calls and then returns.
        - `"none"` does not resolve tool calls at all (in this
            case you will need to invoke `call_tools()` directly).

      **kwargs: Optional generation config arguments.
    """

    # call generate on the tasks
    async def solve(state: TaskState, generate: Generate) -> TaskState:
        return await generate(state, tool_calls=tool_calls, **kwargs)

    # return solve
    return solve
```

## `solver/_task_state.py`

```python
from collections.abc import Sequence
from contextvars import ContextVar
from copy import deepcopy
from dataclasses import dataclass
from random import Random
from typing import Any, Type, Union, cast, overload

from pydantic_core import to_jsonable_python
from shortuuid import uuid

from inspect_ai._util.metadata import MT, metadata_as
from inspect_ai.dataset._dataset import Sample
from inspect_ai.model import (
    ChatMessage,
    ChatMessageUser,
    ModelName,
    ModelOutput,
)
from inspect_ai.model._call_tools import get_tools_info
from inspect_ai.model._model import sample_total_cost, sample_total_tokens
from inspect_ai.model._prompt import user_prompt
from inspect_ai.scorer._metric import Score
from inspect_ai.scorer._target import Target
from inspect_ai.tool import Tool, ToolChoice
from inspect_ai.tool._tool_def import ToolDef
from inspect_ai.util._limit import (
    check_cost_limit,
    check_message_limit,
    check_token_limit,
)
from inspect_ai.util._limit import cost_limit as create_cost_limit
from inspect_ai.util._limit import message_limit as create_message_limit
from inspect_ai.util._limit import token_limit as create_token_limit
from inspect_ai.util._limited_conversation import ChatMessageList
from inspect_ai.util._store import Store, store_jsonable
from inspect_ai.util._store_model import SMT


@dataclass
class Choice:
    """
    A `Choice` represents a single choice in a multiple choice question.

    It is only relevant for the `multiple_choice` solver and corresponding
    `choice` scorer.
    """

    value: str
    """The original value of the choice from the `Sample`."""

    correct: bool | None
    """Did the model think this choice satisfies the question? `None`
    indicates this has not been set yet"""

    original_position: int
    """Choices may be re-ordered during processing, this represents the
    original position in the sample's list of choices"""


class Choices(Sequence[Choice]):
    """
    Wrapper class for a list of `Choice` objects.

    Primarily simply to abstract away implementations of choice-specific
    functionality from the already-big `TaskState` class.
    """

    def __init__(self, choices: list[str] | list[Choice]) -> None:
        """
        Setter for choices, intended to only be used with the `multiple_choice` scorer.

        Choices come from a list of choices for the sample, specifically used by
        the `multiple_choice` scorer.

        For example, if the sample was a multiple choice question like "What is
        the capital of France? A) Paris B) London C) Berlin", we would store the
        possible answers here.
        """
        self._choices: list[Choice] = []

        for i, choice in enumerate(choices):
            if isinstance(choice, str):
                self._choices.append(
                    Choice(value=choice, correct=None, original_position=i)
                )
            elif isinstance(choice, Choice):
                self._choices.append(choice)

    @overload
    def __getitem__(self, index: int) -> Choice: ...

    @overload
    def __getitem__(self, index: slice) -> Sequence[Choice]: ...

    def __getitem__(self, index: Union[int, slice]) -> Union[Choice, Sequence[Choice]]:
        return self._choices[index]

    def __len__(self) -> int:
        return len(self._choices)

    def mark_choice(self, index: int, correct: bool) -> None:
        """Set the value of a specific choice"""
        self._choices[index].correct = correct

    def shuffle(self, rand: Random = Random()) -> None:
        """
        Shuffle the choice order, setting the `original_position` so they can be mapped back to their original order.

        Some evals will shuffle the choices from the original sample to try to
        avoid the model answering correctly due to fine-tuning (or similar) on
        specific datasets.
        """
        shuffled_positions = list(range(len(self._choices)))
        rand.shuffle(shuffled_positions)

        shuffled_choices = [Choice("notachoice", None, -1)] * len(self._choices)

        for i, shuffled_position in enumerate(shuffled_positions):
            shuffled_choices[i] = self._choices[shuffled_position]
            shuffled_choices[i].original_position = shuffled_position

        self._choices = shuffled_choices

    def prompt(self, question: str, template: str) -> str:
        """Format a prompt for these choices.

        Args:
          question (str): Question to pose.
          template (str): Prompt template

        Returns:
          Prompt for question and choices using the provided template.
        """
        from ._multiple_choice import prompt

        return prompt(question, self, template)


class TaskState:
    """
    The `TaskState` represents the internal state of the `Task` being run for a single `Sample`.

    The `TaskState` is passed to and returned from each solver during a sample's
    evaluation. It allows us to maintain the manipulated message history, the tools
    available to the model, the final output of the model, and whether the task
    is completed or has hit a limit.
    """

    def __init__(
        self,
        model: ModelName,
        sample_id: int | str,
        epoch: int,
        input: str | list[ChatMessage],
        messages: list[ChatMessage],
        target: Target = Target(""),
        choices: list[str] | None = None,
        output: ModelOutput | None = None,
        message_limit: int | None = None,
        token_limit: int | None = None,
        cost_limit: float | None = None,
        completed: bool = False,
        metadata: dict[str, Any] | None = None,
        store: dict[str, Any] | None = None,
        scores: dict[str, Score] | None = None,
        sample_uuid: str | None = None,
    ) -> None:
        self._model = model
        self._sample_id = sample_id
        self._epoch = epoch
        self._input = input
        self._target = target
        self._metadata = metadata if metadata is not None else {}
        self._messages: list[ChatMessage] = ChatMessageList(messages)
        self._tools: list[Tool] = []
        self._output = output if output else ModelOutput(model=str(model))
        self._message_limit = create_message_limit(message_limit)
        self._token_limit = create_token_limit(token_limit)
        self._cost_limit = create_cost_limit(cost_limit)
        self._completed = completed
        self._store = Store(store)
        self._uuid = sample_uuid or uuid()
        self._scores = scores

        if choices:
            self.choices = Choices(choices)
        else:
            self.choices = Choices([])

    @property
    def model(self) -> ModelName:
        """Name of model being evaluated."""
        return self._model

    @property
    def sample_id(self) -> int | str:
        """Unique id for sample."""
        return self._sample_id

    @property
    def epoch(self) -> int:
        """Epoch number for sample."""
        return self._epoch

    @property
    def input(self) -> str | list[ChatMessage]:
        """Input from the `Sample`, should be considered immutable."""
        return self._input

    @property
    def input_text(self) -> str:
        """
        Convenience function for accessing the initial input from the `Sample` as a string.

        If the `input` is a `list[ChatMessage]`, this will return the text from
        the last chat message
        """
        if isinstance(self._input, str):
            return self._input
        else:
            input = next(
                (
                    message.text
                    for message in reversed(self._input)
                    if message.role == "user"
                ),
                None,
            )
            if input:
                return input
            else:
                raise ValueError(
                    "input_text requested from TaskState but none available"
                )

    @property
    def user_prompt(self) -> ChatMessageUser:
        """User prompt for this state.

        Tasks are very general and can have may types of inputs.
        However, in many cases solvers assume they can interact with
        the state as a "chat" in a predictable fashion (e.g. prompt
        engineering solvers). This property enables easy read and
        write access to the user chat prompt. Raises an
        exception if there is no user prompt
        """
        return user_prompt(self.messages)

    @property
    def metadata(self) -> dict[str, Any]:
        """Metadata from the `Sample` for this `TaskState`"""
        return self._metadata

    @metadata.setter
    def metadata(self, metadata: dict[str, Any]) -> None:
        self._metadata = metadata

    @property
    def messages(self) -> list[ChatMessage]:
        """
        Chat conversation history for sample.

        This will generally get appended to every time a `generate` call is made
        to the model. Useful for both debug and for solvers/scorers to assess
        model performance or choose the next step.
        """
        return self._messages

    @messages.setter
    def messages(self, messages: list[ChatMessage]) -> None:
        self._messages = ChatMessageList(messages)

    @property
    def output(self) -> ModelOutput:
        """
        The 'final' model output once we've completed all solving.

        For simple evals this may just be the last `message` from the
        conversation history, but more complex solvers may set this directly.
        """
        return self._output

    @output.setter
    def output(self, output: ModelOutput) -> None:
        self._output = output

    @property
    def store(self) -> Store:
        """Store for shared data"""
        return self._store

    @property
    def tools(self) -> list[Tool]:
        """Tools available to the model."""
        return self._tools

    @tools.setter
    def tools(self, tools: Sequence[Tool | ToolDef]) -> None:
        self._tools.clear()
        for tool in tools:
            self._tools.append(tool if isinstance(tool, Tool) else tool.as_tool())

    tool_choice: ToolChoice | None = None
    """Tool choice directive."""

    @property
    def max_messages(self) -> int | None:
        """Deprecated (use message_limit)."""
        return self.message_limit

    @max_messages.setter
    def max_messages(self, messages: int | None) -> None:
        """Deprecated (use message_limit)."""
        self.message_limit = messages

    @property
    def message_limit(self) -> int | None:
        """Limit on total messages allowed per conversation."""
        return self._message_limit.limit

    @message_limit.setter
    def message_limit(self, messages: int | None) -> None:
        """Set limit on total messages allowed per conversation.

        Also checks whether the current message count exceeds the new limit.
        """
        self._message_limit.limit = messages
        check_message_limit(len(self.messages), raise_for_equal=False)

        from inspect_ai.log._samples import set_active_sample_message_limit

        set_active_sample_message_limit(messages)

    @property
    def token_limit(self) -> int | None:
        """Limit on total tokens allowed per conversation."""
        return self._token_limit.limit

    @token_limit.setter
    def token_limit(self, tokens: int | None) -> None:
        """Set limit on total tokens allowed per conversation.

        Also checks whether the current token usage exceeds the new limit.
        """
        self._token_limit.limit = tokens
        check_token_limit()

        from inspect_ai.log._samples import set_active_sample_token_limit

        set_active_sample_token_limit(tokens)

    @property
    def token_usage(self) -> int:
        """Total tokens used for the current sample."""
        return sample_total_tokens()

    @property
    def cost_limit(self) -> float | None:
        """Limit on total cost (in dollars) allowed per sample."""
        return self._cost_limit.limit

    @cost_limit.setter
    def cost_limit(self, cost: float | None) -> None:
        """Set limit on total cost allowed per sample.

        Also checks whether the current cost usage exceeds the new limit.
        """
        self._cost_limit.limit = cost
        check_cost_limit()

        from inspect_ai.log._samples import set_active_sample_cost_limit

        set_active_sample_cost_limit(cost)

    @property
    def cost_usage(self) -> float:
        """Total cost (in dollars) used for the current sample."""
        return sample_total_cost()

    @property
    def completed(self) -> bool:
        """Is the task completed.

        Additionally, checks for an operator interrupt of the sample.
        """
        from inspect_ai.log._samples import set_active_sample_total_messages

        # update messages
        set_active_sample_total_messages(len(self.messages))

        if self._completed:
            return True
        else:
            return self._completed

    @completed.setter
    def completed(self, completed: bool) -> None:
        """Set the completed status."""
        self._completed = completed

    @property
    def target(self) -> Target:
        """The scoring target for this `Sample`."""
        return self._target

    @property
    def scores(self) -> dict[str, Score] | None:
        """Scores yielded by running task."""
        return self._scores

    @scores.setter
    def scores(self, scores: dict[str, Score] | None) -> None:
        self._scores = scores

    @property
    def uuid(self) -> str:
        """Globally unique identifier for sample run."""
        return self._uuid

    def metadata_as(self, metadata_cls: Type[MT]) -> MT:
        """Pydantic model interface to metadata.

        Args:
          metadata_cls: Pydantic model type

        Returns:
          BaseModel: Instance of metadata_cls bound to current Store.
        """
        if not self.metadata:
            raise ValueError("Sample does not have metadata")

        return metadata_as(self.metadata, metadata_cls)

    def store_as(self, model_cls: Type[SMT], instance: str | None = None) -> SMT:
        """Pydantic model interface to the store.

        Args:
          model_cls: Pydantic model type (must derive from StoreModel)
          instance: Optional instances name for store (enables multiple instances
            of a given StoreModel type within a single sample)

        Returns:
          StoreModel: model_cls bound to sample store data.
        """
        return model_cls(store=self.store, instance=instance)


def sample_state() -> TaskState | None:
    return _sample_state.get(None)


def set_sample_state(state: TaskState) -> None:
    _sample_state.set(state)


_sample_state: ContextVar[TaskState] = ContextVar("sample_state")


def state_jsonable(state: TaskState | None = None) -> dict[str, Any]:
    # use current sample state if none specified
    if state is None:
        state = sample_state()
        if state is None:
            return dict()

    state_data = dict(
        messages=state.messages,
        tools=get_tools_info(state.tools),
        tool_choice=state.tool_choice,
        store=store_jsonable(state.store),
        output=state.output,
        completed=state.completed,
        metadata=state.metadata,
    )
    jsonable = to_jsonable_python(
        state_data,
        exclude_none=True,
        fallback=lambda _x: None,
    )
    return cast(dict[str, Any], jsonable)


def sample_jsonable(sample: Sample) -> dict[str, Any]:
    jsonable = to_jsonable_python(sample, exclude_none=True, fallback=lambda _x: None)
    return cast(dict[str, Any], deepcopy(jsonable))
```

## `solver/_transcript.py`

```python
import contextlib
from typing import AsyncIterator

from inspect_ai._util.json import json_changes
from inspect_ai._util.registry import registry_log_name
from inspect_ai.event._state import StateEvent
from inspect_ai.util._span import span

from ._solver import Solver
from ._task_state import TaskState, state_jsonable


class SolverTranscript:
    def __init__(self, name: str, before_state: TaskState) -> None:
        self.name = name
        self.before = state_jsonable(before_state)

    def complete(self, after_state: TaskState) -> None:
        from inspect_ai.log._transcript import transcript

        after = state_jsonable(after_state)
        changes = json_changes(self.before, after)
        if changes:
            transcript()._event(StateEvent(changes=changes))


@contextlib.asynccontextmanager
async def solver_transcript(
    solver: Solver, state: TaskState, name: str | None = None
) -> AsyncIterator[SolverTranscript]:
    name = registry_log_name(name or solver)
    async with span(name=name, type="solver"):
        yield SolverTranscript(name, state)
```

## `solver/_use_tools.py`

```python
from typing import Sequence

from inspect_ai.tool import Tool, ToolChoice
from inspect_ai.tool._tool import ToolSource
from inspect_ai.tool._tool_def import ToolDef

from ._solver import Generate, Solver, solver
from ._task_state import TaskState


@solver
def use_tools(
    *tools: Tool | ToolDef | ToolSource | Sequence[Tool | ToolDef | ToolSource],
    tool_choice: ToolChoice | None = "auto",
    append: bool = False,
) -> Solver:
    """
    Inject tools into the task state to be used in generate().

    Args:
      *tools: One or more tools or lists of tools
        to make available to the model. If no tools are passed, then
        no change to the currently available set of `tools` is made.
      tool_choice: Directive indicating which
        tools the model should use. If `None` is passed, then no
        change to `tool_choice` is made.
      append: If `True`, then the passed-in tools are appended
        to the existing tools; otherwise any existing tools are
        replaced (the default)

    Returns:
        A solver that injects the tools and tool_choice into the task state.
    """

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        # build up tools
        tools_update: list[Tool] = []

        # add tool function to take care of tool/tool_def
        async def add_tools(tool: Tool | ToolDef | ToolSource) -> None:
            if isinstance(tool, ToolSource):
                tools_update.extend(await tool.tools())
            else:
                if isinstance(tool, ToolDef):
                    tool = tool.as_tool()
                tools_update.append(tool)

        for tool in tools:
            if isinstance(tool, Sequence):
                for t in tool:
                    await add_tools(t)
            else:
                await add_tools(tool)
        if len(tools_update) > 0:
            if append:
                existing_tools = state.tools
                state.tools = existing_tools + tools_update
            else:
                state.tools = tools_update

        # set tool choice if specified
        if tool_choice is not None:
            state.tool_choice = tool_choice

        # return state
        return state

    return solve
```

## `solver/_util.py`

```python
from inspect_ai.model import ChatMessage, ChatMessageSystem


def append_system_message(
    messages: list[ChatMessage], message: ChatMessageSystem
) -> None:
    # find last index of any existing system message
    lastIndex = -1
    for i in list(reversed(range(0, len(messages)))):
        if isinstance(messages[i], ChatMessageSystem):
            lastIndex = i
            break

    # insert it
    messages.insert(lastIndex + 1, message)
```

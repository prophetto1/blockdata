# Python Bundle: `approval`

- Source root: `E:\writing-system\_agchain\_reference\inspect_ai\src\inspect_ai`
- Python files: `14`

## Files

- `approval/__init__.py`
- `approval/_apply.py`
- `approval/_approval.py`
- `approval/_approver.py`
- `approval/_auto.py`
- `approval/_call.py`
- `approval/_human/__init__.py`
- `approval/_human/approver.py`
- `approval/_human/console.py`
- `approval/_human/manager.py`
- `approval/_human/panel.py`
- `approval/_human/util.py`
- `approval/_policy.py`
- `approval/_registry.py`

## `approval/__init__.py`

```python
from ._apply import approval
from ._approval import Approval, ApprovalDecision
from ._approver import Approver
from ._auto import auto_approver
from ._human.approver import human_approver
from ._policy import ApprovalPolicy
from ._registry import approver

__all__ = [
    "Approver",
    "Approval",
    "ApprovalDecision",
    "ApprovalPolicy",
    "approval",
    "approver",
    "human_approver",
    "auto_approver",
]
```

## `approval/_apply.py`

```python
import contextlib
from collections.abc import Iterator
from contextvars import ContextVar

from inspect_ai._util.format import format_function_call
from inspect_ai.approval._approval import Approval
from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.tool._tool_call import (
    ToolCall,
    ToolCallContent,
    ToolCallView,
    ToolCallViewer,
)

from ._approver import Approver
from ._policy import ApprovalPolicy, policy_approver


async def apply_tool_approval(
    message: str,
    call: ToolCall,
    viewer: ToolCallViewer | None,
    history: list[ChatMessage],
) -> tuple[bool, Approval | None]:
    approver = _tool_approver.get(None)
    if approver:
        # resolve view
        if viewer:
            view = viewer(call)
            if not view.call:
                view.call = default_tool_call_viewer(call).call
        else:
            view = default_tool_call_viewer(call)

        # call approver
        approval = await approver(
            message=message,
            call=call,
            view=view,
            history=history,
        )

        # process decision
        match approval.decision:
            case "approve" | "modify":
                return True, approval
            case "reject":
                return False, approval
            case "terminate":
                return False, approval
            case "escalate":
                raise RuntimeError("Unexpected 'escalate' from policy approver.")

    # no approval system registered
    else:
        return True, None


def default_tool_call_viewer(call: ToolCall) -> ToolCallView:
    return ToolCallView(
        call=ToolCallContent(
            format="markdown",
            content="```python\n"
            + format_function_call(call.function, call.arguments)
            + "\n```\n",
        )
    )


@contextlib.contextmanager
def approval(
    policies: list[ApprovalPolicy],
) -> Iterator[None]:
    """Context manager to temporarily replace tool approval policies.

    Args:
        policies: Approval policies to use within the context.
    """
    token = _tool_approver.set(policy_approver(policies))
    try:
        yield
    finally:
        _tool_approver.reset(token)


def init_tool_approval(approval: list[ApprovalPolicy] | None) -> None:
    if approval:
        _tool_approver.set(policy_approver(approval))
    else:
        _tool_approver.set(None)


def have_tool_approval() -> bool:
    return _tool_approver.get(None) is not None


_tool_approver: ContextVar[Approver | None] = ContextVar("tool_approver", default=None)
```

## `approval/_approval.py`

```python
from typing import Literal

from pydantic import BaseModel, Field

from inspect_ai.tool._tool_call import ToolCall

ApprovalDecision = Literal["approve", "modify", "reject", "terminate", "escalate"]
"""Represents the possible decisions in an approval.

Possible values:
  "approve": The action is approved.
  "modify": The action is approved with modification.
  "reject": The action is rejected.
  "terminate": Evaluation of the sample should be terminated.
  "escalate": The decision is escalated to another approver.
"""


class Approval(BaseModel):
    """Approval details (decision, explanation, etc.)"""

    decision: ApprovalDecision
    """Approval decision."""

    modified: ToolCall | None = Field(default=None)
    """Modified tool call for decision 'modify'."""

    explanation: str | None = Field(default=None)
    """Explanation for decision."""
```

## `approval/_approver.py`

```python
from typing import Protocol

from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.tool._tool_call import ToolCall, ToolCallView

from ._approval import Approval


class Approver(Protocol):
    """Protocol for approvers."""

    async def __call__(
        self,
        message: str,
        call: ToolCall,
        view: ToolCallView,
        history: list[ChatMessage],
    ) -> Approval:
        """
        Approve or reject a tool call.

        Args:
            message: Message genreated by the model along with the tool call.
            call: The tool call to be approved.
            view: Custom rendering of tool context and call.
            history: The current conversation history.

        Returns:
            Approval: An Approval object containing the decision and explanation.
        """
        ...
```

## `approval/_auto.py`

```python
from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.tool._tool_call import ToolCall, ToolCallView

from ._approval import Approval, ApprovalDecision
from ._approver import Approver
from ._registry import approver


@approver(name="auto")
def auto_approver(decision: ApprovalDecision = "approve") -> Approver:
    """Automatically apply a decision to tool calls.

    Args:
       decision: Decision to apply.

    Returns:
       Approver: Auto approver.
    """

    async def approve(
        message: str,
        call: ToolCall,
        view: ToolCallView,
        history: list[ChatMessage],
    ) -> Approval:
        return Approval(decision=decision, explanation="Automatic decision.")

    return approve
```

## `approval/_call.py`

```python
import inspect
from logging import getLogger

from inspect_ai._util.logger import warn_once
from inspect_ai._util.registry import registry_log_name
from inspect_ai.event._approval import ApprovalEvent
from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.tool._tool_call import ToolCall, ToolCallView

from ._approval import Approval
from ._approver import Approver

logger = getLogger(__name__)


async def call_approver(
    approver: Approver,
    message: str,
    call: ToolCall,
    view: ToolCallView,
    history: list[ChatMessage],
) -> Approval:
    # run approver (if the approval is still using state then
    # provide that but issue a warning)
    signature = inspect.signature(approver)
    if "state" in signature.parameters.keys():
        from inspect_ai.solver._task_state import sample_state

        warn_once(
            logger, "Approver 'state' parameter is deprecated (use 'history' instead)"
        )
        approval = await approver(message, call, view, sample_state())  # type: ignore[arg-type]
    else:
        approval = await approver(message, call, view, history)

    # record
    record_approval(registry_log_name(approver), message, call, view, approval)

    # return approval
    return approval


def record_approval(
    approver_name: str,
    message: str,
    call: ToolCall,
    view: ToolCallView | None,
    approval: Approval,
) -> None:
    from inspect_ai.log._transcript import transcript

    transcript()._event(
        ApprovalEvent(
            message=message,
            call=call,
            view=view,
            approver=approver_name,
            decision=approval.decision,
            modified=approval.modified,
            explanation=approval.explanation,
        )
    )
```

## `approval/_human/__init__.py`

```python

```

## `approval/_human/approver.py`

```python
from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.tool._tool_call import ToolCall, ToolCallView

from .._approval import Approval, ApprovalDecision
from .._approver import Approver
from .._registry import approver
from .console import console_approval
from .panel import panel_approval


@approver(name="human")
def human_approver(
    choices: list[ApprovalDecision] = ["approve", "reject", "terminate"],
) -> Approver:
    """Interactive human approver.

    Args:
       choices: Choices to present to human.

    Returns:
       Approver: Interactive human approver.
    """

    async def approve(
        message: str,
        call: ToolCall,
        view: ToolCallView,
        history: list[ChatMessage],
    ) -> Approval:
        # try to use the panel approval (available in fullscreen display)
        try:
            return await panel_approval(message, call, view, history, choices)

        # fallback to plain console approval (available in all displays)
        except NotImplementedError:
            return console_approval(message, view, choices, call.arguments)

    return approve
```

## `approval/_human/console.py`

```python
from pydantic import JsonValue
from rich.prompt import Prompt

from inspect_ai._util.transcript import transcript_panel
from inspect_ai.tool._tool_call import ToolCallView
from inspect_ai.util._console import input_screen

from .._approval import Approval, ApprovalDecision
from .util import (
    HUMAN_APPROVED,
    HUMAN_ESCALATED,
    HUMAN_REJECTED,
    HUMAN_TERMINATED,
    render_tool_approval,
)


def console_approval(
    message: str,
    view: ToolCallView,
    choices: list[ApprovalDecision],
    arguments: dict[str, JsonValue] | None = None,
) -> Approval:
    with input_screen(width=None) as console:
        console.print(
            transcript_panel(
                title="Approve Tool",
                content=render_tool_approval(message, view, arguments),
            )
        )

        # provide choices
        prompts: dict[str, str] = {}
        for choice in choices:
            prompts[choice[0]] = f"{choice.capitalize()} ({choice[0]})"
        values = list(prompts.values())
        prompt = ", ".join(values[:-1])
        prompt = f"{prompt}, or {values[-1]}"

        def render_approval(approval: Approval) -> Approval:
            console.print(f"Decision: {approval.decision.capitalize()}")
            return approval

        while True:
            decision = Prompt.ask(
                prompt=prompt,
                console=console,
                choices=list(prompts.keys()),
                default="a",
            ).lower()

            if decision == "a":
                return render_approval(
                    Approval(decision="approve", explanation=HUMAN_APPROVED)
                )
            elif decision == "r":
                return render_approval(
                    Approval(decision="reject", explanation=HUMAN_REJECTED)
                )
            elif decision == "t":
                return render_approval(
                    Approval(decision="terminate", explanation=HUMAN_TERMINATED)
                )
            elif decision == "e":
                return render_approval(
                    Approval(decision="escalate", explanation=HUMAN_ESCALATED)
                )
```

## `approval/_human/manager.py`

```python
import uuid
from contextvars import ContextVar
from typing import Callable, Literal, NamedTuple

from inspect_ai._util.future import Future
from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.tool._tool_call import ToolCall, ToolCallView

from .._approval import Approval, ApprovalDecision


class ApprovalRequest(NamedTuple):
    message: str
    call: ToolCall
    view: ToolCallView
    history: list[ChatMessage]
    choices: list[ApprovalDecision]


class PendingApprovalRequest(NamedTuple):
    request: ApprovalRequest
    task: str
    model: str
    id: int | str
    epoch: int


class HumanApprovalManager:
    def __init__(self) -> None:
        self._approval_requests: dict[
            str, tuple[PendingApprovalRequest, Future[Approval]]
        ] = {}
        self._change_callbacks: list[Callable[[Literal["add", "remove"]], None]] = []

    def request_approval(self, request: ApprovalRequest) -> str:
        from inspect_ai.log._samples import sample_active

        id = str(uuid.uuid4())
        sample = sample_active()
        assert sample
        assert sample.sample.id is not None
        pending = PendingApprovalRequest(
            request=request,
            task=sample.task,
            model=sample.model,
            id=sample.sample.id,
            epoch=sample.epoch,
        )
        self._approval_requests[id] = (pending, Future[Approval]())
        self._notify_change("add")
        return id

    def withdraw_request(self, id: str) -> None:
        del self._approval_requests[id]
        self._notify_change("remove")

    async def wait_for_approval(self, id: str) -> Approval:
        _, future = self._approval_requests[id]
        return await future.result()

    def on_change(
        self, callback: Callable[[Literal["add", "remove"]], None]
    ) -> Callable[[], None]:
        self._change_callbacks.append(callback)

        def unsubscribe() -> None:
            if callback in self._change_callbacks:
                self._change_callbacks.remove(callback)

        return unsubscribe

    def approval_requests(self) -> list[tuple[str, PendingApprovalRequest]]:
        return [(aid, data) for aid, (data, _) in self._approval_requests.items()]

    def complete_approval(self, id: str, result: Approval) -> None:
        if id in self._approval_requests:
            _, future = self._approval_requests[id]
            future.set_result(result)
            del self._approval_requests[id]
            self._notify_change("remove")

    def fail_approval(self, id: str, error: Exception) -> None:
        if id in self._approval_requests:
            _, future = self._approval_requests[id]
            future.set_exception(error)
            del self._approval_requests[id]
            self._notify_change("remove")

    def _notify_change(self, action: Literal["add", "remove"]) -> None:
        for callback in self._change_callbacks:
            callback(action)


def human_approval_manager() -> HumanApprovalManager:
    return _human_approval_manager.get()


def init_human_approval_manager() -> None:
    _human_approval_manager.set(HumanApprovalManager())


_human_approval_manager: ContextVar[HumanApprovalManager] = ContextVar(
    "_human_approval_manager"
)
```

## `approval/_human/panel.py`

```python
from typing import Callable, Literal

import anyio
from rich.console import RenderableType
from rich.text import Text
from textual.app import ComposeResult
from textual.containers import Horizontal, ScrollableContainer
from textual.reactive import reactive
from textual.widgets import Button, Static
from typing_extensions import override

from inspect_ai._util.task import task_display_name
from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.tool._tool_call import ToolCall, ToolCallView
from inspect_ai.util._panel import InputPanel, input_panel

from .._approval import Approval, ApprovalDecision
from .manager import ApprovalRequest, PendingApprovalRequest, human_approval_manager
from .util import (
    HUMAN_APPROVED,
    HUMAN_ESCALATED,
    HUMAN_REJECTED,
    HUMAN_TERMINATED,
    render_tool_approval,
)


async def panel_approval(
    message: str,
    call: ToolCall,
    view: ToolCallView,
    history: list[ChatMessage],
    choices: list[ApprovalDecision],
) -> Approval:
    # ensure the approvals panel is shown
    await input_panel(ApprovalInputPanel)

    # submit to human approval manager (will be picked up by panel)
    approvals = human_approval_manager()
    id = approvals.request_approval(
        ApprovalRequest(
            message=message, call=call, view=view, history=history, choices=choices
        )
    )
    try:
        return await approvals.wait_for_approval(id)
    except anyio.get_cancelled_exc_class():
        approvals.withdraw_request(id)
        raise


class ApprovalInputPanel(InputPanel):
    DEFAULT_TITLE = "Approval"

    DEFAULT_CSS = """
    ApprovalInputPanel {
        layout: grid;
        grid-size: 1 3;
        grid-rows: auto 1fr auto;
    }
    """

    _approvals: list[tuple[str, PendingApprovalRequest]] = []
    _unsubscribe: Callable[[], None] | None = None

    @override
    def compose(self) -> ComposeResult:
        yield ApprovalRequestHeading()
        yield ApprovalRequestContent()
        yield ApprovalRequestActions()

    def on_mount(self) -> None:
        self._unsubscribe = human_approval_manager().on_change(
            self.on_approvals_changed
        )

    def on_unmount(self) -> None:
        if self._unsubscribe is not None:
            self._unsubscribe()

    def on_approvals_changed(self, action: Literal["add", "remove"]) -> None:
        heading = self.query_one(ApprovalRequestHeading)
        content = self.query_one(ApprovalRequestContent)
        actions = self.query_one(ApprovalRequestActions)
        self._approvals = human_approval_manager().approval_requests()
        if len(self._approvals) > 0:
            approval_id, approval_request = self._approvals[0]
            self.title = f"{self.DEFAULT_TITLE} ({len(self._approvals):,})"
            heading.request = approval_request
            content.approval = approval_request.request
            actions.approval_request = approval_id, approval_request
            if action == "add":
                self.activate()
                actions.activate()
            self.visible = True
        else:
            self.title = self.DEFAULT_TITLE
            heading.request = None
            content.approval = None
            actions.approval_request = None
            self.deactivate()
            self.visible = False


class ApprovalRequestHeading(Static):
    DEFAULT_CSS = """
    ApprovalRequestHeading {
        width: 1fr;
        background: $surface;
        color: $secondary;
        margin-left: 1;
    }
    """

    request: reactive[PendingApprovalRequest | None] = reactive(None)

    def render(self) -> RenderableType:
        if self.request is not None:
            return f"{task_display_name(self.request.task)} (id: {self.request.id}, epoch {self.request.epoch}): {self.request.model}"
        else:
            return ""


class ApprovalRequestContent(ScrollableContainer):
    DEFAULT_CSS = """
    ApprovalRequestContent {
        scrollbar-size-vertical: 1;
        scrollbar-gutter: stable;
        border: solid $foreground 20%;
        padding: 0 1 0 1;
    }
    """

    approval: reactive[ApprovalRequest | None] = reactive(None)

    async def watch_approval(self, approval: ApprovalRequest | None) -> None:
        await self.remove_children()
        if approval:
            self.mount_all(
                Static(r)
                for r in render_tool_approval(
                    approval.message, approval.view, approval.call.arguments
                )
            )
            self.scroll_end(animate=False)


class ApprovalRequestActions(Horizontal):
    APPROVE_TOOL_CALL = "approve-tool-call"
    REJECT_TOOL_CALL = "reject-tool-call"
    ESCALATE_TOOL_CALL = "escalate-tool-call"
    TERMINATE_TOOL_CALL_SAMPLE = "terminate-tool-call-sample"

    DEFAULT_CSS = f"""
    ApprovalRequestActions Button {{
        margin-right: 1;
        min-width: 20;
    }}
    ApprovalRequestActions #{APPROVE_TOOL_CALL} {{
        color: $success;
    }}
    ApprovalRequestActions #{REJECT_TOOL_CALL} {{
        color: $warning-darken-3;
    }}
    ApprovalRequestActions #{ESCALATE_TOOL_CALL} {{
        color: $primary-darken-3;
        margin-left: 3;
    }}
    ApprovalRequestActions #{TERMINATE_TOOL_CALL_SAMPLE} {{
        color: $error-darken-1;
        margin-left: 3;
    }}
    """

    approval_request: reactive[tuple[str, PendingApprovalRequest] | None] = reactive(
        None
    )

    def compose(self) -> ComposeResult:
        yield Button(
            Text("Approve"),
            id=self.APPROVE_TOOL_CALL,
            tooltip="Approve the tool call.",
        )
        yield Button(
            Text("Reject"),
            id=self.REJECT_TOOL_CALL,
            tooltip="Reject the tool call.",
        )
        yield Button(
            Text("Escalate"),
            id=self.ESCALATE_TOOL_CALL,
            tooltip="Escalate the tool call to another approver.",
        )
        yield Button(
            Text("Terminate"),
            id=self.TERMINATE_TOOL_CALL_SAMPLE,
            tooltip="Terminate the sample.",
        )

    def activate(self) -> None:
        approve = self.query_one(f"#{self.APPROVE_TOOL_CALL}")
        approve.focus()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if self.approval_request is not None:
            id, _ = self.approval_request
            if event.button.id == self.APPROVE_TOOL_CALL:
                approval = Approval(decision="approve", explanation=HUMAN_APPROVED)
            elif event.button.id == self.REJECT_TOOL_CALL:
                approval = Approval(decision="reject", explanation=HUMAN_REJECTED)
            elif event.button.id == self.ESCALATE_TOOL_CALL:
                approval = Approval(decision="escalate", explanation=HUMAN_ESCALATED)
            elif event.button.id == self.TERMINATE_TOOL_CALL_SAMPLE:
                approval = Approval(decision="terminate", explanation=HUMAN_TERMINATED)
            else:
                raise ValueError(f"Unexpected button id: {event.button.id}")
            human_approval_manager().complete_approval(id, approval)

    def watch_approval_request(
        self, approval_request: tuple[str, PendingApprovalRequest] | None
    ) -> None:
        choices = (
            approval_request[1].request.choices if approval_request is not None else []
        )

        def update_visible(id: str, choice: ApprovalDecision) -> None:
            self.query_one(f"#{id}").display = choice in choices

        update_visible(self.APPROVE_TOOL_CALL, "approve")
        update_visible(self.REJECT_TOOL_CALL, "reject")
        update_visible(self.ESCALATE_TOOL_CALL, "escalate")
        update_visible(self.TERMINATE_TOOL_CALL_SAMPLE, "terminate")
```

## `approval/_human/util.py`

```python
from pydantic import JsonValue
from rich.console import RenderableType
from rich.highlighter import ReprHighlighter
from rich.markup import escape
from rich.rule import Rule
from rich.text import Text

from inspect_ai._util.transcript import transcript_markdown
from inspect_ai.tool._tool_call import (
    ToolCallContent,
    ToolCallView,
    substitute_tool_call_content,
)
from inspect_ai.util._display import display_type

HUMAN_APPROVED = "Human operator approved tool call."
HUMAN_REJECTED = "Human operator rejected the tool call."
HUMAN_TERMINATED = "Human operator asked that the sample be terminated."
HUMAN_ESCALATED = "Human operator escalated the tool call approval."


def render_tool_approval(
    message: str, view: ToolCallView, arguments: dict[str, JsonValue] | None = None
) -> list[RenderableType]:
    renderables: list[RenderableType] = []
    text_highlighter = ReprHighlighter()

    # substitute placeholders in view content
    if arguments is not None:
        view = ToolCallView(
            context=substitute_tool_call_content(view.context, arguments)
            if view.context
            else None,
            call=substitute_tool_call_content(view.call, arguments)
            if view.call
            else None,
        )

    # ignore content if trace enabled
    message = message.strip() if display_type() != "conversation" else ""

    def add_view_content(view_content: ToolCallContent) -> None:
        if view_content.title:
            renderables.append(
                Text.from_markup(f"[bold]{escape(view_content.title)}[/bold]\n")
            )
        if view_content.format == "markdown":
            renderables.append(transcript_markdown(view_content.content))
        else:
            text_content = text_highlighter(Text(view_content.content))
            renderables.append(text_content)

    # assistant content (don't add if trace_enabled as we already have it in that case)
    if message:
        renderables.append(Text.from_markup("[bold]Assistant[/bold]\n"))
        renderables.append(Text(f"{message.strip()}"))

    # extra context provided by tool view
    if view.context:
        renderables.append(Text())
        add_view_content(view.context)
        renderables.append(Text())

    # tool call view
    if view.call:
        if message or view.context:
            renderables.append(Rule("", style="#282c34", align="left", characters="․"))
        renderables.append(Text())
        add_view_content(view.call)
        renderables.append(Text())

    return renderables
```

## `approval/_policy.py`

```python
import fnmatch
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Generator

from pydantic import BaseModel, Field, model_validator

from inspect_ai._util.config import read_config_object
from inspect_ai._util.format import format_function_call
from inspect_ai._util.registry import registry_create, registry_lookup
from inspect_ai.model._chat_message import ChatMessage
from inspect_ai.tool._tool_call import ToolCall, ToolCallView
from inspect_ai.util._resource import resource

from ._approval import Approval
from ._approver import Approver
from ._call import call_approver, record_approval


@dataclass
class ApprovalPolicy:
    """Policy mapping approvers to tools."""

    approver: Approver
    """Approver for policy."""

    tools: str | list[str]
    """Tools to use this approver for (can be full tool names or globs)."""


def policy_approver(policies: str | list[ApprovalPolicy]) -> Approver:
    # if policies is a str, it is a config file or an approver
    if isinstance(policies, str):
        policies = approval_policies_from_config(policies)

    # compile policy into approvers and regexes for matching
    policy_matchers: list[tuple[list[str], Approver]] = []
    for policy in policies:
        tools = [policy.tools] if isinstance(policy.tools, str) else policy.tools
        globs = [f"{tool}*" for tool in tools]
        policy_matchers.append((globs, policy.approver))

    # generator for policies that match a tool_call
    def tool_approvers(tool_call: ToolCall) -> Generator[Approver, None, None]:
        for policy_matcher in iter(policy_matchers):
            function_call = format_function_call(
                tool_call.function, tool_call.arguments, width=sys.maxsize
            )
            if any(
                [
                    fnmatch.fnmatch(function_call, pattern)
                    for pattern in policy_matcher[0]
                ]
            ):
                yield policy_matcher[1]

    async def approve(
        message: str,
        call: ToolCall,
        view: ToolCallView,
        history: list[ChatMessage],
    ) -> Approval:
        # process approvers for this tool call (continue loop on "escalate")
        has_approver = False
        for approver in tool_approvers(call):
            has_approver = True
            approval = await call_approver(approver, message, call, view, history)
            if approval.decision != "escalate":
                return approval

        # if there are no approvers then we reject
        reject = Approval(
            decision="reject",
            explanation=f"No {'approval granted' if has_approver else 'approvers registered'} for tool {call.function}",
        )
        # record and return the rejection
        record_approval("policy", message, call, view, reject)
        return reject

    return approve


class ApproverPolicyConfig(BaseModel):
    """
    Configuration format for approver policies.

    For example, here is a configuration in YAML:

    ```yaml
    approvers:
      - name: human
        tools: web_browser*, bash, pyhton
        choices: [approve, reject]

      - name: auto
        tools: *
        decision: approve
    ```
    """

    name: str
    tools: str | list[str]
    params: dict[str, Any] = Field(default_factory=dict)

    model_config = {
        "extra": "allow",
    }

    @model_validator(mode="before")
    @classmethod
    def collect_unknown_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        known_fields = set(["name", "tools", "params"])
        unknown_fields = {k: v for k, v in data.items() if k not in known_fields}

        if unknown_fields:
            data["params"] = data.get("params", {}) | unknown_fields
            for k in unknown_fields:
                data.pop(k, None)

        return data


class ApprovalPolicyConfig(BaseModel):
    approvers: list[ApproverPolicyConfig]


def approver_from_config(policy_config: str) -> Approver:
    policies = approval_policies_from_config(policy_config)
    return policy_approver(policies)


def approval_policies_from_config(
    policy_config: str | ApprovalPolicyConfig,
) -> list[ApprovalPolicy]:
    # create approver policy
    def create_approval_policy(
        name: str, tools: str | list[str], params: dict[str, Any] = {}
    ) -> ApprovalPolicy:
        approver = registry_create("approver", name, **params)
        return ApprovalPolicy(approver, tools)

    # map config -> policy
    def policy_from_config(config: ApproverPolicyConfig) -> ApprovalPolicy:
        return create_approval_policy(config.name, config.tools, config.params)

    # resolve config if its a string
    if isinstance(policy_config, str):
        if Path(policy_config).exists():
            policy_config = read_policy_config(policy_config)
        elif registry_lookup("approver", policy_config):
            policy_config = ApprovalPolicyConfig(
                approvers=[ApproverPolicyConfig(name=policy_config, tools="*")]
            )
        else:
            raise ValueError(f"Invalid approval policy: {policy_config}")

    # resolve into approval policies
    return [policy_from_config(config) for config in policy_config.approvers]


def config_from_approval_policies(
    policies: list[ApprovalPolicy],
) -> ApprovalPolicyConfig:
    from inspect_ai._util.registry import (
        registry_log_name,
        registry_params,
    )

    approvers: list[ApproverPolicyConfig] = []
    for policy in policies:
        name = registry_log_name(policy.approver)
        params = registry_params(policy.approver)
        approvers.append(
            ApproverPolicyConfig(name=name, tools=policy.tools, params=params)
        )

    return ApprovalPolicyConfig(approvers=approvers)


def read_policy_config(policy_config: str) -> ApprovalPolicyConfig:
    # save specified policy for error message
    specified_policy_config = policy_config

    # read config file
    policy_config = resource(policy_config, type="file")

    # detect json vs. yaml
    policy_config_dict = read_config_object(policy_config)
    if not isinstance(policy_config_dict, dict):
        raise ValueError(f"Invalid approval policy: {specified_policy_config}")

    # parse and validate config
    return ApprovalPolicyConfig(**policy_config_dict)
```

## `approval/_registry.py`

```python
import inspect
from typing import Any, Callable, TypeVar, cast

from typing_extensions import overload

from inspect_ai._util.registry import (
    RegistryInfo,
    registry_add,
    registry_name,
    registry_tag,
)

from ._approver import Approver

ApproverType = TypeVar("ApproverType", bound=Callable[..., Approver])


@overload
def approver(func: ApproverType) -> ApproverType: ...


@overload
def approver(
    *, name: str | None = ..., **attribs: Any
) -> Callable[[ApproverType], ApproverType]: ...


def approver(*args: Any, name: str | None = None, **attribs: Any) -> Any:
    r"""Decorator for registering approvers.

    Args:
      *args: Function returning `Approver` targeted by
        plain approver decorator without attributes (e.g. `@approver`)
      name:
        Optional name for approver. If the decorator has no name
        argument then the name of the function
        will be used to automatically assign a name.
      **attribs: Additional approver attributes.

    Returns:
        Approver with registry attributes.
    """

    def create_approver_wrapper(approver_type: ApproverType) -> ApproverType:
        # Get the name and parameters of the task
        approver_name = registry_name(
            approver_type, name or getattr(approver_type, "__name__")
        )
        params = list(inspect.signature(approver_type).parameters.keys())

        # Create and return the wrapper function
        def wrapper(*w_args: Any, **w_kwargs: Any) -> Approver:
            # Create the approver
            approver_instance = approver_type(*w_args, **w_kwargs)

            # Tag the approver with registry information
            registry_tag(
                approver_type,
                approver_instance,
                RegistryInfo(
                    type="approver",
                    name=approver_name,
                    metadata=dict(attribs=attribs, params=params),
                ),
                *w_args,
                **w_kwargs,
            )

            # Return the approver instance
            return approver_instance

        # Register the approver and return the wrapper
        return approver_register(
            approver=cast(ApproverType, wrapper),
            name=approver_name,
            attribs=attribs,
            params=params,
        )

    if args:
        # The decorator was used without arguments: @approver
        func = args[0]
        return create_approver_wrapper(func)
    else:
        # The decorator was used with arguments: @approver(name="foo")
        def decorator(func: ApproverType) -> ApproverType:
            return create_approver_wrapper(func)

        return decorator


def approver_register(
    approver: ApproverType, name: str, attribs: dict[str, Any], params: list[str]
) -> ApproverType:
    registry_add(
        approver,
        RegistryInfo(
            type="approver", name=name, metadata=dict(attribs=attribs, params=params)
        ),
    )
    return approver
```

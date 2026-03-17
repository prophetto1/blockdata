from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Members(AbstractSlackClientConnection, RunnableTask):
    """List members of a Slack channel"""
    channel: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        uri: str | None = None
        size: int | None = None

    @dataclass(slots=True)
    class MemberOutput:
        member_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    uri: str | None = None
    size: int | None = None


@dataclass(slots=True, kw_only=True)
class MemberOutput:
    member_id: str | None = None

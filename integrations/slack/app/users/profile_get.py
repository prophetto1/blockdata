from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ProfileGet(AbstractSlackClientConnection, RunnableTask):
    """Get Slack user profile"""
    user: Property[str] | None = None
    include_labels: Property[bool] | None = None

    def run(self, run_context: RunContext) -> ProfileOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ProfileOutput(io):
        title: str | None = None
        phone: str | None = None
        real_name: str | None = None
        display_name: str | None = None
        email: str | None = None
        status_text: str | None = None
        status_emoji: str | None = None

        def of(self, profile: com) -> ProfileOutput:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class ProfileOutput(io):
    title: str | None = None
    phone: str | None = None
    real_name: str | None = None
    display_name: str | None = None
    email: str | None = None
    status_text: str | None = None
    status_emoji: str | None = None

    def of(self, profile: com) -> ProfileOutput:
        raise NotImplementedError  # TODO: translate from Java

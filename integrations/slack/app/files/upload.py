from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractSlackClientConnection, RunnableTask):
    """Upload a file to Slack"""
    from: Property[str]
    channels: Property[list[String]] | None = None
    filename: Property[str]
    title: Property[str] | None = None
    alt_txt: Property[str] | None = None
    snippet_type: Property[str] | None = None
    timestamp: Property[datetime] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        id: str
        title: str | None = None
        name: str | None = None
        permalink: str | None = None
        permalink_public: str | None = None
        url_private: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    id: str
    title: str | None = None
    name: str | None = None
    permalink: str | None = None
    permalink_public: str | None = None
    url_private: str | None = None

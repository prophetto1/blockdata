from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\files\Upload.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractSlackClientConnection):
    """Upload a file to Slack"""
    from: Property[str]
    filename: Property[str]
    channels: Property[list[str]] | None = None
    title: Property[str] | None = None
    alt_txt: Property[str] | None = None
    snippet_type: Property[str] | None = None
    timestamp: Property[datetime] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        id: str
        title: str | None = None
        name: str | None = None
        permalink: str | None = None
        permalink_public: str | None = None
        url_private: str | None = None

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.utils.rethrow import Rethrow
from engine.core.runners.run_context import RunContext
from integrations.singer.taps.slack import Slack
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSlackClientConnection(Task):
    token: Property[str]
    slack: Slack | None = None

    def client(self, run_context: RunContext) -> MethodsClient:
        raise NotImplementedError  # TODO: translate from Java

    def call(self, run_context: RunContext, call: Rethrow) -> R:
        raise NotImplementedError  # TODO: translate from Java

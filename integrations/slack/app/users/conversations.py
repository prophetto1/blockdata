from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\users\Conversations.java
# WARNING: Unresolved types: ConversationType, Exception, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.slack.abstract_slack_client_connection import AbstractSlackClientConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Conversations(AbstractSlackClientConnection):
    """List a user's Slack conversations"""
    exclude_archived: Property[bool] = Property.ofValue(false)
    types: Property[java.util.List[ConversationType]] = Property.ofValue(java.util.List.of(ConversationType.PUBLIC_CHANNEL))
    user: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        size: int | None = None

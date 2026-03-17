from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\models\ConversationTopicOutput.java
# WARNING: Unresolved types: Purpose, Topic, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class ConversationTopicOutput:
    """Conversation topic/purpose output"""
    value: str
    creator: str | None = None
    last_set: datetime | None = None

    @staticmethod
    def of(topic: Topic) -> ConversationTopicOutput:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(purpose: Purpose) -> ConversationTopicOutput:
        raise NotImplementedError  # TODO: translate from Java

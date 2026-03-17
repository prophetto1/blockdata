from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime


@dataclass(slots=True, kw_only=True)
class ConversationTopicOutput(io):
    """Conversation topic/purpose output"""
    value: str
    creator: str | None = None
    last_set: datetime | None = None

    def of(self, topic: Topic) -> ConversationTopicOutput:
        raise NotImplementedError  # TODO: translate from Java

    def of(self, purpose: Purpose) -> ConversationTopicOutput:
        raise NotImplementedError  # TODO: translate from Java

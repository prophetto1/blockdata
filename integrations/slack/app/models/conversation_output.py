from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.slack.app.models.conversation_topic_output import ConversationTopicOutput


@dataclass(slots=True, kw_only=True)
class ConversationOutput(io):
    """Conversation details output"""
    id: str
    name: str | None = None
    is_private: bool | None = None
    is_channel: bool | None = None
    is_group: bool | None = None
    is_instant_message: bool | None = None
    is_multi_person_instant_message: bool | None = None
    created: datetime | None = None
    is_archived: bool | None = None
    is_general: bool | None = None
    topic: ConversationTopicOutput | None = None
    purpose: ConversationTopicOutput | None = None

    def of(self, channel: Conversation) -> ConversationOutput:
        raise NotImplementedError  # TODO: translate from Java

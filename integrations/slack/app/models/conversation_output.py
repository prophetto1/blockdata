from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\models\ConversationOutput.java
# WARNING: Unresolved types: Conversation, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.slack.app.models.conversation_topic_output import ConversationTopicOutput
from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class ConversationOutput:
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

    @staticmethod
    def of(channel: Conversation) -> ConversationOutput:
        raise NotImplementedError  # TODO: translate from Java

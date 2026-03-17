from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\models\MessageOutput.java
# WARNING: Unresolved types: api, com, core, io, kestra, model, models, slack, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.slack.app.models.file_output import FileOutput
from integrations.amqp.models.message import Message
from integrations.aws.glue.model.output import Output
from integrations.slack.app.models.reaction_output import ReactionOutput


@dataclass(slots=True, kw_only=True)
class MessageOutput:
    type: str | None = None
    subtype: str | None = None
    team: str | None = None
    channel: str | None = None
    user: str | None = None
    username: str | None = None
    text: str | None = None
    payload: dict[str, Any] | None = None
    timestamp: datetime | None = None
    thread_timestamp: str | None = None
    is_intro: bool | None = None
    is_starred: bool | None = None
    pinned_to: list[str] | None = None
    reactions: list[ReactionOutput] | None = None
    app_id: str | None = None
    bot_id: str | None = None
    bot_link: str | None = None
    is_display_as_bot: bool | None = None
    file: FileOutput | None = None
    files: list[FileOutput] | None = None
    is_upload: bool | None = None
    parent_user_id: str | None = None
    inviter: str | None = None
    client_msg_id: str | None = None
    topic: str | None = None
    purpose: str | None = None
    edited: Edited | None = None
    is_unfurl_links: bool | None = None
    is_unfurl_media: bool | None = None
    is_thread_broadcast: bool | None = None
    is_locked: bool | None = None
    reply_count: int | None = None
    reply_users: list[str] | None = None
    reply_users_count: int | None = None
    latest_reply: str | None = None
    is_subscribed: bool | None = None
    x_files: list[str] | None = None
    is_hidden: bool | None = None
    last_read: str | None = None
    item_type: str | None = None
    is_no_notifications: bool | None = None

    @staticmethod
    def of(message: com.slack.api.model.Message) -> MessageOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Edited:
        user: str | None = None
        timestamp: str | None = None

        @staticmethod
        def of(edited: com.slack.api.model.Message.Edited) -> Edited:
            raise NotImplementedError  # TODO: translate from Java

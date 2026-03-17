from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.slack.app.models.file_output import FileOutput
from integrations.slack.app.models.reaction_output import ReactionOutput


@dataclass(slots=True, kw_only=True)
class MessageOutput(io):
    type: str | None = None
    subtype: str | None = None
    team: str | None = None
    channel: str | None = None
    user: str | None = None
    username: str | None = None
    text: str | None = None
    payload: dict[String, Object] | None = None
    timestamp: datetime | None = None
    thread_timestamp: str | None = None
    is_intro: bool | None = None
    is_starred: bool | None = None
    pinned_to: list[String] | None = None
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
    reply_users: list[String] | None = None
    reply_users_count: int | None = None
    latest_reply: str | None = None
    is_subscribed: bool | None = None
    x_files: list[String] | None = None
    is_hidden: bool | None = None
    last_read: str | None = None
    item_type: str | None = None
    is_no_notifications: bool | None = None

    def of(self, message: com) -> MessageOutput:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Edited:
        user: str | None = None
        timestamp: str | None = None

        def of(self, edited: com) -> Edited:
            raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Edited:
    user: str | None = None
    timestamp: str | None = None

    def of(self, edited: com) -> Edited:
        raise NotImplementedError  # TODO: translate from Java

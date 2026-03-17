from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\domain\MessageDetail.java
# WARNING: Unresolved types: OffsetDateTime

from dataclasses import dataclass
from typing import Any

from integrations.microsoft365.outlook.domain.attachment_info import AttachmentInfo


@dataclass(slots=True, kw_only=True)
class MessageDetail:
    id: str | None = None
    subject: str | None = None
    body_content: str | None = None
    body_type: str | None = None
    body_preview: str | None = None
    sender_mail: str | None = None
    from_mail: str | None = None
    to_recipients: list[str] | None = None
    cc_recipients: list[str] | None = None
    bcc_recipients: list[str] | None = None
    received_date_time: OffsetDateTime | None = None
    sent_date_time: OffsetDateTime | None = None
    is_read: bool | None = None
    has_attachments: bool | None = None
    importance: str | None = None
    conversation_id: str | None = None
    conversation_index: str | None = None
    internet_message_id: str | None = None
    attachments: list[AttachmentInfo] | None = None

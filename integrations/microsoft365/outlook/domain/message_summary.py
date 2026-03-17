from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class MessageSummary:
    id: str | None = None
    subject: str | None = None
    sender_mail: str | None = None
    from_mail: str | None = None
    received_date_time: OffsetDateTime | None = None
    sent_date_time: OffsetDateTime | None = None
    is_read: bool | None = None
    has_attachments: bool | None = None
    body_preview: str | None = None
    importance: str | None = None
    conversation_id: str | None = None

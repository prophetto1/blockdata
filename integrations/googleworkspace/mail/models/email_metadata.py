from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\mail\models\EmailMetadata.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class EmailMetadata:
    id: str | None = None
    thread_id: str | None = None
    label_ids: list[str] | None = None
    snippet: str | None = None
    history_id: str | None = None
    internal_date: datetime | None = None
    size_estimate: int | None = None
    headers: dict[str, str] | None = None
    subject: str | None = None
    from: str | None = None
    to: list[str] | None = None
    cc: list[str] | None = None
    bcc: list[str] | None = None

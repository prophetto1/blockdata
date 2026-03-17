from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Attachment:
    """Gmail message attachment"""
    attachment_id: str | None = None
    mime_type: str | None = None
    filename: str | None = None
    size: int | None = None
    data: str | None = None

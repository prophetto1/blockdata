from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class AttachmentInfo:
    id: str | None = None
    name: str | None = None
    content_type: str | None = None
    size: int | None = None
    uri: str | None = None

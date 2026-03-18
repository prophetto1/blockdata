from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\mail\models\Attachment.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Attachment:
    """Gmail message attachment"""
    attachment_id: str | None = None
    mime_type: str | None = None
    filename: str | None = None
    size: int | None = None
    data: str | None = None

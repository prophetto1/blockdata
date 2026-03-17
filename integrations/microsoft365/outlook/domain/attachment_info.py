from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\domain\AttachmentInfo.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AttachmentInfo:
    id: str | None = None
    name: str | None = None
    content_type: str | None = None
    size: int | None = None
    uri: str | None = None

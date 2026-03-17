from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class FileInfo:
    uri: str | None = None
    content_length: int | None = None
    content_type: str | None = None
    metadata: dict[String, String] | None = None
    version_id: str | None = None
    e_tag: str | None = None

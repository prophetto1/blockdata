from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\models\FileInfo.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class FileInfo:
    uri: str | None = None
    content_length: int | None = None
    content_type: str | None = None
    metadata: dict[str, str] | None = None
    version_id: str | None = None
    e_tag: str | None = None

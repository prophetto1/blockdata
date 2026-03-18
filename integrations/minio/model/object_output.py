from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\model\ObjectOutput.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ObjectOutput:
    e_tag: str | None = None
    version_id: str | None = None

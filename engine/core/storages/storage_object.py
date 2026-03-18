from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\StorageObject.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class StorageObject:
    metadata: dict[str, str] | None = None
    input_stream: Any | None = None

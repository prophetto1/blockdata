from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airbyte\src\main\java\io\kestra\plugin\airbyte\models\StreamDescriptor.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class StreamDescriptor:
    name: str | None = None
    namespace: str | None = None

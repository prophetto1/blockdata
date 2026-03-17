from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\kv\KVValue.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class KVValue:
    value: Any | None = None

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

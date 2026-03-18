from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\kv\KVMetadata.java

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any


@dataclass(slots=True, kw_only=True)
class KVMetadata:
    description: str | None = None
    expiration_date: datetime | None = None

    def to_map(self) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

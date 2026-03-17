from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\PebbleUtils.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PebbleUtils:
    server_type: str | None = None

    def called_on_worker(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

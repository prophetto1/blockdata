from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\listeners\RetryEvents.java
# WARNING: Unresolved types: RetryEvent

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class RetryEvents:

    def on_retry(self, event: RetryEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java

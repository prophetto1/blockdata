from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\queues\QueueService.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class QueueService:

    def key(self, object: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java

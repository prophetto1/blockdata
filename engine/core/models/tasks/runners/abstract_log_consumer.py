from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\AbstractLogConsumer.java
# WARNING: Unresolved types: AtomicInteger, BiConsumer

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class AbstractLogConsumer:
    std_out_count: AtomicInteger = new AtomicInteger()
    std_err_count: AtomicInteger = new AtomicInteger()
    outputs: dict[str, Any] = field(default_factory=dict)

    def accept(self, line: str, is_std_err: bool, instant: datetime) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_std_out_count(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_std_err_count(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

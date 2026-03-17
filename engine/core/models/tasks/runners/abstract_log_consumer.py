from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\AbstractLogConsumer.java
# WARNING: Unresolved types: AtomicInteger, BiConsumer

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True, kw_only=True)
class AbstractLogConsumer(ABC):
    std_out_count: AtomicInteger
    std_err_count: AtomicInteger
    outputs: dict[str, Any] = field(default_factory=dict)

    @abstractmethod
    def accept(self, line: str, is_std_err: bool, instant: datetime) -> None:
        ...

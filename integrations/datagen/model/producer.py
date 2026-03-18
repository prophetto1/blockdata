from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\model\Producer.java
# WARNING: Unresolved types: T

from typing import Any, Protocol


class Producer(Protocol):
    def produce(self) -> T: ...

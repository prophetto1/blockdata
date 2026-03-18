from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\utils\DataUtils.java
# WARNING: Unresolved types: Logger

from typing import Any, Protocol


class DataUtils(Protocol):
    def compute_size(o: Any, logger: Logger) -> int: ...

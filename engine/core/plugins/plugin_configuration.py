from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginConfiguration.java
# WARNING: Unresolved types: Comparator

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class PluginConfiguration:
    comparator: ClassVar[Comparator[PluginConfiguration]]
    order: int | None = None
    type: str | None = None
    values: dict[str, Any] | None = None

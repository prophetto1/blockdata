from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\PluginDefault.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PluginDefault:
    type: str
    forced: bool = False
    values: dict[str, Any] | None = None

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\docs\PluginIcon.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PluginIcon:
    name: str | None = None
    icon: str | None = None
    flowable: bool | None = None

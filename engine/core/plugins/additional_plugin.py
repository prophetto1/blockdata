from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\AdditionalPlugin.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.plugin import Plugin


@dataclass(slots=True, kw_only=True)
class AdditionalPlugin:
    type: str

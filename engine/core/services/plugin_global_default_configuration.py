from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\PluginGlobalDefaultConfiguration.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.plugin_default import PluginDefault


@dataclass(slots=True, kw_only=True)
class PluginGlobalDefaultConfiguration:
    defaults: list[PluginDefault] | None = None

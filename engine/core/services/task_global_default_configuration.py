from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\TaskGlobalDefaultConfiguration.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.plugin_default import PluginDefault


@dataclass(slots=True, kw_only=True)
class TaskGlobalDefaultConfiguration:
    defaults: list[PluginDefault] | None = None

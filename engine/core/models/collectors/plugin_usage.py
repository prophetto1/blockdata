from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\collectors\PluginUsage.java

from dataclasses import dataclass
from typing import Any

from engine.core.plugins.plugin_registry import PluginRegistry


@dataclass(slots=True, kw_only=True)
class PluginUsage:
    manifest: dict[str, str] | None = None

    @staticmethod
    def of(registry: PluginRegistry) -> list[PluginUsage]:
        raise NotImplementedError  # TODO: translate from Java

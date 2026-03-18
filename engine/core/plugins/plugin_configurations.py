from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginConfigurations.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.plugin import Plugin
from engine.core.plugins.plugin_configuration import PluginConfiguration


@dataclass(slots=True, kw_only=True)
class PluginConfigurations:
    configurations: list[PluginConfiguration] | None = None

    def get_configuration_by_plugin_type(self, plugin_type: str) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_configuration_by_plugin_type_or_aliases(self, plugin_type: str, plugin: type[Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

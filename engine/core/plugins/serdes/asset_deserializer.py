from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\serdes\AssetDeserializer.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.assets.asset import Asset
from engine.core.models.plugin import Plugin
from engine.core.plugins.serdes.plugin_deserializer import PluginDeserializer


@dataclass(slots=True, kw_only=True)
class AssetDeserializer(PluginDeserializer):

    def fallback_class(self) -> type[Any]:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\converters\PluginDefaultConverter.java
# WARNING: Unresolved types: Class, ConversionContext, TypeConverter

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.plugin_default import PluginDefault


@dataclass(slots=True, kw_only=True)
class PluginDefaultConverter:

    def convert(self, map: dict, target_type: Class[PluginDefault], context: ConversionContext) -> Optional[PluginDefault]:
        raise NotImplementedError  # TODO: translate from Java

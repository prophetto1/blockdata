from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginClassAndMetadata.java

from dataclasses import dataclass
from typing import Any

from engine.core.plugins.registered_plugin import RegisteredPlugin


@dataclass(slots=True, kw_only=True)
class PluginClassAndMetadata:
    type: type[Any] | None = None
    base_class: type[T] | None = None
    group: str | None = None
    license: str | None = None
    title: str | None = None
    icon: str | None = None
    alias: str | None = None

    @staticmethod
    def create(registered: RegisteredPlugin, plugin_class: type[Any], plugin_base_class: type[T], alias: str) -> PluginClassAndMetadata[T]:
        raise NotImplementedError  # TODO: translate from Java

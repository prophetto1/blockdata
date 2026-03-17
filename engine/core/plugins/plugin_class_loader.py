from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginClassLoader.java
# WARNING: Unresolved types: ClassLoader, ClassNotFoundException, Enumeration, URLClassLoader

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class PluginClassLoader(URLClassLoader):
    excludes: ClassVar[re.Pattern]
    logger: ClassVar[Logger] = getLogger(__name__)
    parent: ClassLoader | None = None
    plugin_location: str | None = None

    @staticmethod
    def of(plugin_location: str, urls: list[str], parent: ClassLoader) -> PluginClassLoader:
        raise NotImplementedError  # TODO: translate from Java

    def location(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def load_class(self, name: str, resolve: bool | None = None) -> type[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def should_load_from_urls(name: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def get_resources(self, name: str) -> Enumeration[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_resource(self, name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

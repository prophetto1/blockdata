from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginScanner.java
# WARNING: Unresolved types: ClassLoader, Manifest

from dataclasses import dataclass, field
from logging import Logger, getLogger
from pathlib import Path
from typing import Any, ClassVar

from engine.core.plugins.external_plugin import ExternalPlugin
from engine.core.plugins.registered_plugin import RegisteredPlugin


@dataclass(slots=True, kw_only=True)
class PluginScanner:
    logger: ClassVar[Logger] = getLogger(__name__)
    parent: ClassLoader | None = None

    def scan(self, plugin_paths: Path | None = None) -> list[RegisteredPlugin]:
        raise NotImplementedError  # TODO: translate from Java

    def scan_class_loader(self, class_loader: ClassLoader, external_plugin: ExternalPlugin, manifest: Manifest) -> RegisteredPlugin:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def add_guides_through_new_file_system(guides_directory: str, guides: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def add_guides(root: Path, guides: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_manifest(class_loader: ClassLoader) -> Manifest:
        raise NotImplementedError  # TODO: translate from Java

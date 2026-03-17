from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\DefaultPluginRegistry.java
# WARNING: Unresolved types: AtomicBoolean, Class, ConcurrentHashMap, Predicate, ReentrantLock

from dataclasses import dataclass, field
from logging import logging
from pathlib import Path
from typing import Any, ClassVar, Optional

from engine.core.models.plugin import Plugin
from engine.core.plugins.plugin_class_and_metadata import PluginClassAndMetadata
from engine.core.plugins.plugin_identifier import PluginIdentifier
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.plugins.plugin_scanner import PluginScanner
from engine.core.plugins.registered_plugin import RegisteredPlugin


@dataclass(slots=True, kw_only=True)
class DefaultPluginRegistry:
    plugin_class_by_identifier: dict[PluginIdentifier, PluginClassAndMetadata[Any]]
    plugins: dict[PluginBundleIdentifier, RegisteredPlugin]
    scanner: PluginScanner
    initialized: AtomicBoolean
    lock: ReentrantLock
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    scanned_plugin_paths: set[Path] = field(default_factory=set)

    @staticmethod
    def get_or_create() -> DefaultPluginRegistry:
        raise NotImplementedError  # TODO: translate from Java

    def init(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_all_versions_for_type(self, type: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def register_if_absent(self, plugin_path: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_plugin_path_scanned(self, plugin_path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def register(self, plugin_path: Path) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def unregister(self, plugins_to_unregister: list[RegisteredPlugin]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def register_class_for_identifier(self, identifier: PluginIdentifier, plugin: PluginClassAndMetadata[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_plugin_path_valid(plugin_path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def register(self, plugin: RegisteredPlugin) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def register_all(self, plugins: dict[PluginIdentifier, PluginClassAndMetadata[Any]]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_plugin_classes_by_identifier(self, plugin: RegisteredPlugin) -> dict[PluginIdentifier, PluginClassAndMetadata[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def contains_plugin_bundle(self, identifier: PluginBundleIdentifier) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def plugins(self) -> list[RegisteredPlugin]:
        raise NotImplementedError  # TODO: translate from Java

    def external_plugins(self) -> list[RegisteredPlugin]:
        raise NotImplementedError  # TODO: translate from Java

    def plugins(self, predicate: Predicate[RegisteredPlugin]) -> list[RegisteredPlugin]:
        raise NotImplementedError  # TODO: translate from Java

    def find_class_by_identifier(self, identifier: PluginIdentifier) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def find_class_by_identifier(self, identifier: str) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def find_metadata_by_identifier(self, identifier: str) -> Optional[PluginClassAndMetadata[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def find_metadata_by_identifier(self, identifier: PluginIdentifier) -> Optional[PluginClassAndMetadata[Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def clear(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_versioning_supported(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class LazyHolder:
        instance: ClassVar[DefaultPluginRegistry]

    @dataclass(slots=True)
    class PluginBundleIdentifier:
        core: PluginBundleIdentifier
        location: str | None = None

        @staticmethod
        def of(plugin: RegisteredPlugin) -> PluginBundleIdentifier:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ClassTypeIdentifier:
        type: str | None = None

        @staticmethod
        def create(identifier: str) -> ClassTypeIdentifier:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginResolver.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from pathlib import Path
from typing import Any, ClassVar

from engine.core.plugins.external_plugin import ExternalPlugin


@dataclass(slots=True, kw_only=True)
class PluginResolver:
    logger: ClassVar[Logger] = getLogger(__name__)
    plugin_path: Path | None = None

    @staticmethod
    def is_archive_file(path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_class_file(path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def resolves(self) -> list[ExternalPlugin]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_urls_for_plugin_path(path: Path) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

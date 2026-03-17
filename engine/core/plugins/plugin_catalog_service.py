from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginCatalogService.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from datetime import datetime
from datetime import timedelta
from typing import Any, ClassVar

from engine.core.http.client.http_client import HttpClient
from engine.core.plugins.plugin_artifact import PluginArtifact
from engine.core.plugins.plugin_resolution_result import PluginResolutionResult
from engine.core.utils.version import Version


@dataclass(slots=True, kw_only=True)
class PluginCatalogService:
    max_cache_duration: ClassVar[timedelta]
    loaded: list[PluginManifest]
    cache_last_loaded: datetime
    is_loaded: bool
    logger: ClassVar[Logger] = getLogger(__name__)
    http_client: HttpClient | None = None
    plugins: Any[list[PluginManifest]] | None = None
    icons: bool | None = None
    oss: bool | None = None
    current_stable_version: Version | None = None

    def resolve_versions(self, artifacts: list[PluginArtifact]) -> list[PluginResolutionResult]:
        raise NotImplementedError  # TODO: translate from Java

    def get(self) -> list[PluginManifest]:
        raise NotImplementedError  # TODO: translate from Java

    def load(self) -> list[PluginManifest]:
        raise NotImplementedError  # TODO: translate from Java

    def get_all_compatible_plugins(self) -> list[ApiPluginArtifact]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PluginManifest:
        title: str | None = None
        icon: str | None = None
        group_id: str | None = None
        artifact_id: str | None = None

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ApiPluginArtifact:
        group_id: str | None = None
        artifact_id: str | None = None
        license: str | None = None
        versions: list[str] | None = None

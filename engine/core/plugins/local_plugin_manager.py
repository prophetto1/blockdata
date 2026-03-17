from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\LocalPluginManager.java
# WARNING: Unresolved types: Provider

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.core.plugins.maven_plugin_downloader import MavenPluginDownloader
from engine.core.contexts.maven_plugin_repository_config import MavenPluginRepositoryConfig
from engine.core.plugins.plugin_artifact import PluginArtifact
from engine.core.plugins.plugin_artifact_metadata import PluginArtifactMetadata
from engine.core.plugins.plugin_manager import PluginManager
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.plugins.plugin_resolution_result import PluginResolutionResult


@dataclass(slots=True, kw_only=True)
class LocalPluginManager:
    plugin_registry_provider: Provider[PluginRegistry] | None = None
    maven_plugin_downloader: MavenPluginDownloader | None = None
    local_repository_path: Path | None = None

    def start(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def is_ready(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def list(self) -> list[PluginArtifactMetadata]:
        raise NotImplementedError  # TODO: translate from Java

    def install(self, artifact: PluginArtifact, repository_configs: list[MavenPluginRepositoryConfig], install_for_registration: bool, local_repository_path: Path) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def install(self, artifact: PluginArtifact, install_for_registration: bool, local_repository_path: Path) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def install(self, file: Path, install_for_registration: bool, local_repository_path: Path, force_install_on_existing_versions: bool) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def install(self, artifacts: list[PluginArtifact], repository_configs: list[MavenPluginRepositoryConfig], refresh_plugin_registry: bool, local_repository_path: Path) -> list[PluginArtifact]:
        raise NotImplementedError  # TODO: translate from Java

    def get_local_plugin_path(self, local_repository_path: Path, artifact: PluginArtifact) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def uninstall(self, artifacts: list[PluginArtifact], refresh_plugin_registry: bool, local_repository_path: Path) -> list[PluginArtifact]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_versions(self, artifacts: list[PluginArtifact]) -> list[PluginResolutionResult]:
        raise NotImplementedError  # TODO: translate from Java

    def do_uninstall(self, artifact: PluginArtifact, local_repository_path: Path) -> bool:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\MavenPluginDownloader.java
# WARNING: Unresolved types: Closeable, IOException, RemoteRepository, RepositorySystem, RepositorySystemSession

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.contexts.maven_plugin_repository_config import MavenPluginRepositoryConfig
from engine.core.plugins.plugin_artifact import PluginArtifact
from engine.core.plugins.plugin_resolution_result import PluginResolutionResult


@dataclass(slots=True, kw_only=True)
class MavenPluginDownloader:
    http_proxy_host: ClassVar[str]
    http_proxy_port: ClassVar[str]
    https_proxy_host: ClassVar[str]
    https_proxy_port: ClassVar[str]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    default_local_repository_prefix: ClassVar[str] = "kestra-plugins-m2-repository"
    default_repository_type: ClassVar[str] = "default"
    latest: ClassVar[str] = "latest"
    repository_configs: list[MavenPluginRepositoryConfig] | None = None
    system: RepositorySystem | None = None
    session: RepositorySystemSession | None = None

    def resolve(self, dependency: str) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def list_all_versions(self, dependency: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve(self, dependency: str, repositories: list[MavenPluginRepositoryConfig]) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def do_resolve(self, repositories: list[RemoteRepository], dependency: str) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_versions(self, artifacts: list[PluginArtifact]) -> list[PluginResolutionResult]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def build_remote_repositories(repository_configs: list[MavenPluginRepositoryConfig]) -> list[RemoteRepository]:
        raise NotImplementedError  # TODO: translate from Java

    def repository_system_session(self, system: RepositorySystem, local_repository_path: str) -> RepositorySystemSession:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_artifact(self, repositories: list[RemoteRepository], dependency: str) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

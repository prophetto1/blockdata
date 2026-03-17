from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\MavenPluginDownloader.java
# WARNING: Unresolved types: Closeable, IOException, RemoteRepository, RepositorySystem, RepositorySystemSession

from dataclasses import dataclass
from typing import Any

from engine.core.contexts.maven_plugin_repository_config import MavenPluginRepositoryConfig
from engine.core.plugins.plugin_artifact import PluginArtifact
from engine.core.plugins.plugin_resolution_result import PluginResolutionResult


@dataclass(slots=True, kw_only=True)
class MavenPluginDownloader:
    d_e_f_a_u_l_t__l_o_c_a_l__r_e_p_o_s_i_t_o_r_y__p_r_e_f_i_x: str = "kestra-plugins-m2-repository"
    d_e_f_a_u_l_t__r_e_p_o_s_i_t_o_r_y__t_y_p_e: str = "default"
    h_t_t_p__p_r_o_x_y__h_o_s_t: str = System.getProperty("http.proxyHost")
    h_t_t_p__p_r_o_x_y__p_o_r_t: str = System.getProperty("http.proxyPort")
    h_t_t_p_s__p_r_o_x_y__h_o_s_t: str = System.getProperty("https.proxyHost")
    h_t_t_p_s__p_r_o_x_y__p_o_r_t: str = System.getProperty("https.proxyPort")
    l_a_t_e_s_t: str = "latest"
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

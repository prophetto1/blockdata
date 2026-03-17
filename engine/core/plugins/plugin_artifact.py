from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginArtifact.java
# WARNING: Unresolved types: Comparable, IOException, Pattern

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class PluginArtifact:
    a_r_t_i_f_a_c_t__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile(
        "([^: ]+):([^: ]+)(:([^: ]*)(:([^: ]+))?)?:([^: ]+)"
    )
    f_i_l_e_n_a_m_e__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile(
        "^(?<groupId>[\\w_]+)__(?<artifactId>[\\w-_]+)(?:__(?<classifier>[\\w-_]+))?__(?<version>\\d+_\\d+_\\d+(-[a-zA-Z0-9-]+)?|([a-zA-Z0-9]+))\\.jar$"
    )
    j_a_r__e_x_t_e_n_s_i_o_n: ClassVar[str] = "jar"
    k_e_s_t_r_a__g_r_o_u_p__i_d: ClassVar[str] = "io.kestra"
    group_id: str | None = None
    artifact_id: str | None = None
    extension: str | None = None
    classifier: str | None = None
    version: str | None = None
    uri: str | None = None

    @staticmethod
    def from_file(file: Path) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_coordinates(coordinates: str) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_file_name(file_name: str) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def relocate_to(self, uri: str) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def is_official(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def to_coordinates(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_file_name(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def compare_to(self, that: PluginArtifact) -> int:
        raise NotImplementedError  # TODO: translate from Java

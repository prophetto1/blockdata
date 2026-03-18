from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginArtifact.java

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class PluginArtifact:
    artifact_pattern: ClassVar[re.Pattern]
    filename_pattern: ClassVar[re.Pattern]
    jar_extension: ClassVar[str] = "jar"
    kestra_group_id: ClassVar[str] = "io.kestra"
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

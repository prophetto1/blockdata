from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginArtifactMetadata.java

from dataclasses import dataclass
from typing import Any

from engine.core.plugins.plugin_artifact import PluginArtifact


@dataclass(slots=True, kw_only=True)
class PluginArtifactMetadata:
    uri: str | None = None
    name: str | None = None
    size: int | None = None
    last_modified_time: int | None = None
    creation_time: int | None = None

    def to_plugin_artifact(self) -> PluginArtifact:
        raise NotImplementedError  # TODO: translate from Java

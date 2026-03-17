from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginResolutionResult.java

from dataclasses import dataclass
from typing import Any

from engine.core.plugins.plugin_artifact import PluginArtifact


@dataclass(slots=True, kw_only=True)
class PluginResolutionResult:
    artifact: PluginArtifact | None = None
    version: str | None = None
    versions: list[str] | None = None
    resolved: bool | None = None

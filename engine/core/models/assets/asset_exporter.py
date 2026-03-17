from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\assets\AssetExporter.java
# WARNING: Unresolved types: Exception, Flux, T, core, io, kestra, models

from dataclasses import dataclass
from typing import Any

from engine.core.models.assets.asset_lineage import AssetLineage
from engine.core.models.tasks.output import Output
from engine.core.models.annotations.plugin import Plugin
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AssetExporter:
    id: str
    type: str

    def send_assets(self, run_context: RunContext, records: Flux[AssetLineage]) -> T:
        raise NotImplementedError  # TODO: translate from Java

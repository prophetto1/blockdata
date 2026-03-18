from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\assets\AssetManagerFactory.java

from dataclasses import dataclass
from typing import Any

from engine.core.runners.asset_emitter import AssetEmitter


@dataclass(slots=True, kw_only=True)
class AssetManagerFactory:

    def of(self, enabled: bool) -> AssetEmitter:
        raise NotImplementedError  # TODO: translate from Java

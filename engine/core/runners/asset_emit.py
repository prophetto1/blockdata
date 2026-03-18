from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\AssetEmit.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.assets.asset import Asset
from engine.core.models.assets.asset_identifier import AssetIdentifier


@dataclass(slots=True, kw_only=True)
class AssetEmit:
    inputs: list[AssetIdentifier] | None = None
    outputs: list[Asset] | None = None

from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\assets\AssetsDeclaration.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.assets.asset import Asset
from engine.core.models.assets.asset_identifier import AssetIdentifier
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AssetsDeclaration:
    enable_auto: Property[bool] | None = None
    inputs: Property[list[AssetIdentifier]] | None = None
    outputs: Property[list[Asset]] | None = None

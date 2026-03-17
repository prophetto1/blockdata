from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\assets\AssetIdentifier.java

from dataclasses import dataclass, replace
from typing import Any

from engine.core.models.assets.asset import Asset


@dataclass(slots=True, kw_only=True)
class AssetIdentifier:
    tenant_id: str | None = None
    namespace: str | None = None
    id: str | None = None
    type: str | None = None

    def with_tenant_id(self, tenant_id: str) -> AssetIdentifier:
        return replace(self, tenant_id=tenant_id)

    def uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(asset: Asset) -> AssetIdentifier:
        raise NotImplementedError  # TODO: translate from Java

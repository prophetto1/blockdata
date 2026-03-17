from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\assets\Asset.java

from abc import ABC, abstractmethod
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Any

from engine.core.models.has_uid import HasUID
from engine.core.models.plugin import Plugin
from engine.core.models.soft_deletable import SoftDeletable


@dataclass(slots=True, kw_only=True)
class Asset(ABC):
    id: str
    type: str
    tenant_id: str | None = None
    namespace: str | None = None
    display_name: str | None = None
    description: str | None = None
    metadata: dict[str, Any] | None = None
    created: datetime | None = None
    updated: datetime | None = None
    deleted: bool | None = None

    def to_updated(self, previous_asset: T) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> Asset:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def uid(tenant_id: str | None = None, id: str | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def with_tenant_id(self, tenant_id: str) -> Asset:
        return replace(self, tenant_id=tenant_id)

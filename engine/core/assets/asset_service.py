from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\assets\AssetService.java

from dataclasses import dataclass
from typing import Any, Protocol

from engine.core.models.assets.asset import Asset
from engine.core.models.assets.asset_identifier import AssetIdentifier
from engine.core.models.assets.asset_user import AssetUser
from engine.core.queues.queue_exception import QueueException


class AssetService(Protocol):
    def async_upsert(self, asset_user: AssetUser, asset: Asset) -> None: ...

    def sync_upsert(self, in_repository: Asset, asset_user: AssetUser, asset_to_upsert: Asset) -> Asset: ...

    def asset_lineage(self, asset_user: AssetUser, inputs: list[AssetIdentifier], outputs: list[AssetIdentifier]) -> None: ...

    def delete_asset(self, to_delete: Asset, asset_user: AssetUser) -> None: ...

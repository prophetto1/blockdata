from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\sharepoint\models\Item.java
# WARNING: Unresolved types: DriveItem, OffsetDateTime

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Item:
    id: str | None = None
    name: str | None = None
    size: int | None = None
    created_date_time: OffsetDateTime | None = None
    last_modified_date_time: OffsetDateTime | None = None
    web_url: str | None = None
    is_folder: bool | None = None
    is_file: bool | None = None

    @staticmethod
    def from_drive_item(drive_item: DriveItem) -> Item:
        raise NotImplementedError  # TODO: translate from Java

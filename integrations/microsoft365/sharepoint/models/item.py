from __future__ import annotations

from dataclasses import dataclass, field
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

    def from_drive_item(self, drive_item: DriveItem) -> Item:
        raise NotImplementedError  # TODO: translate from Java

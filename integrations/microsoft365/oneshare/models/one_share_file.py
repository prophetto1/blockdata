from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class OneShareFile:
    id: str | None = None
    name: str | None = None
    mime_type: str | None = None
    created_date_time: OffsetDateTime | None = None
    last_modified_date_time: OffsetDateTime | None = None
    web_url: str | None = None
    size: int | None = None
    is_folder: bool | None = None

    def of(self, drive_item: DriveItem) -> OneShareFile:
        raise NotImplementedError  # TODO: translate from Java

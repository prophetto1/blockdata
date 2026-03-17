from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class AirtableRecord:
    id: str | None = None
    created_time: str | None = None
    fields: dict[String, Object] | None = None

    def is_deleted(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

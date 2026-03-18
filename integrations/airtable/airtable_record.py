from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airtable\src\main\java\io\kestra\plugin\airtable\AirtableRecord.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class AirtableRecord:
    id: str | None = None
    created_time: str | None = None
    fields: dict[str, Any] | None = None

    def is_deleted(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

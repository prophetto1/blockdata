from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.airtable.airtable_record import AirtableRecord


@dataclass(slots=True, kw_only=True)
class AirtableListResponse:
    records: list[AirtableRecord] | None = None
    offset: str | None = None

    def has_more_pages(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\HubspotSearchResponse.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class HubspotSearchResponse:
    results: list[Result] | None = None
    paging: Paging | None = None
    total: Any | None = None

    @dataclass(slots=True)
    class Result:
        id: str | None = None
        properties: dict[str, Any] | None = None
        created_at: str | None = None
        updated_at: str | None = None
        archived: bool | None = None

    @dataclass(slots=True)
    class Paging:
        next: dict[str, Any] | None = None
        prev: dict[str, Any] | None = None

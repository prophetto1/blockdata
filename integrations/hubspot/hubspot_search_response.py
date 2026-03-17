from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class HubspotSearchResponse:
    results: list[Result] | None = None
    paging: Paging | None = None
    total: Any | None = None

    @dataclass(slots=True)
    class Result:
        id: str | None = None
        properties: dict[String, Object] | None = None
        created_at: str | None = None
        updated_at: str | None = None
        archived: bool | None = None

    @dataclass(slots=True)
    class Paging:
        next: dict[String, Object] | None = None
        prev: dict[String, Object] | None = None


@dataclass(slots=True, kw_only=True)
class Result:
    id: str | None = None
    properties: dict[String, Object] | None = None
    created_at: str | None = None
    updated_at: str | None = None
    archived: bool | None = None


@dataclass(slots=True, kw_only=True)
class Paging:
    next: dict[String, Object] | None = None
    prev: dict[String, Object] | None = None

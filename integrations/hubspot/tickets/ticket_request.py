from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class TicketRequest:
    properties: Properties | None = None

    @dataclass(slots=True)
    class Properties:
        subject: str | None = None
        content: str | None = None
        hs_pipeline_stage: int | None = None
        hs_pipeline: int | None = None
        hs_ticket_priority: str | None = None


@dataclass(slots=True, kw_only=True)
class Properties:
    subject: str | None = None
    content: str | None = None
    hs_pipeline_stage: int | None = None
    hs_pipeline: int | None = None
    hs_ticket_priority: str | None = None

from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hubspot\src\main\java\io\kestra\plugin\hubspot\tickets\TicketRequest.java

from dataclasses import dataclass
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

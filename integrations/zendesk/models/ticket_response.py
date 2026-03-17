from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.zendesk.models.ticket import Ticket


@dataclass(slots=True, kw_only=True)
class TicketResponse:
    ticket: Ticket | None = None
    audit: Ticket | None = None

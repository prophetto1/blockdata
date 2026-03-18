from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-zendesk\src\main\java\io\kestra\plugin\zendesk\models\TicketResponse.java

from dataclasses import dataclass
from typing import Any

from integrations.zendesk.models.ticket import Ticket


@dataclass(slots=True, kw_only=True)
class TicketResponse:
    ticket: Ticket | None = None
    audit: Ticket | None = None

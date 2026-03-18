from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-zendesk\src\main\java\io\kestra\plugin\zendesk\models\TicketRequest.java

from dataclasses import dataclass
from typing import Any

from integrations.zendesk.models.ticket import Ticket


@dataclass(slots=True, kw_only=True)
class TicketRequest:
    ticket: Ticket | None = None

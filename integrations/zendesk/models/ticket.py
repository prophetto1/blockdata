from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-zendesk\src\main\java\io\kestra\plugin\zendesk\models\Ticket.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Ticket:
    id: int | None = None
    url: str | None = None
    subject: str | None = None
    description: str | None = None
    priority: str | None = None
    type: str | None = None
    assignee_id: int | None = None
    tags: list[str] | None = None

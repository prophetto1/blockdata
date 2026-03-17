from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\calendar\models\Event.java
# WARNING: Unresolved types: api, calendar, com, google, model, services

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Event:
    id: str | None = None
    status: str | None = None
    summary: str | None = None
    description: str | None = None
    location: str | None = None

    @staticmethod
    def of(event: com.google.api.services.calendar.model.Event) -> Event:
        raise NotImplementedError  # TODO: translate from Java

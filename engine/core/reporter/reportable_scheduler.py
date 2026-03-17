from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\ReportableScheduler.java
# WARNING: Unresolved types: Clock

from dataclasses import dataclass
from typing import Any

from engine.core.reporter.reportable_registry import ReportableRegistry
from engine.core.reporter.server_event_sender import ServerEventSender


@dataclass(slots=True, kw_only=True)
class ReportableScheduler:
    registry: ReportableRegistry | None = None
    sender: ServerEventSender | None = None
    clock: Clock | None = None

    def tick(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\listeners\GracefulEmbeddedServiceShutdownListener.java
# WARNING: Unresolved types: ApplicationEventListener, ShutdownEvent

from dataclasses import dataclass
from typing import Any

from engine.core.server.local_service_state import LocalServiceState
from engine.core.server.service_registry import ServiceRegistry


@dataclass(slots=True, kw_only=True)
class GracefulEmbeddedServiceShutdownListener:
    service_registry: ServiceRegistry | None = None

    def supports(self, event: ShutdownEvent) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def on_application_event(self, event: ShutdownEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close_service(self, state: LocalServiceState) -> None:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\WebserverService.java
# WARNING: Unresolved types: ApplicationEventPublisher, AtomicBoolean, AtomicReference, ServerShutdownEvent, ServerStartupEvent, ServiceState

from dataclasses import dataclass
from typing import Any

from engine.core.server.service import Service
from engine.core.server.service_state_change_event import ServiceStateChangeEvent
from engine.core.server.service_type import ServiceType


@dataclass(slots=True, kw_only=True)
class WebserverService:
    shutdown: AtomicBoolean = new AtomicBoolean(false)
    id: str = IdUtils.create()
    state: AtomicReference[ServiceState] = new AtomicReference<>()
    event_publisher: ApplicationEventPublisher[ServiceStateChangeEvent] | None = None

    def get_id(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self) -> ServiceType:
        raise NotImplementedError  # TODO: translate from Java

    def get_state(self) -> ServiceState:
        raise NotImplementedError  # TODO: translate from Java

    def post_construct(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_server_startup(self, event: ServerStartupEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def on_serve_shutdown(self, event: ServerShutdownEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java

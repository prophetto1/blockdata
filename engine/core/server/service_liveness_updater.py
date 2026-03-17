from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServiceLivenessUpdater.java
# WARNING: Unresolved types: Response, ServiceState

from typing import Any, Protocol

from engine.core.server.service import Service
from engine.core.server.service_instance import ServiceInstance
from engine.core.server.service_state_transition import ServiceStateTransition


class ServiceLivenessUpdater(Protocol):
    def update(self, instance: ServiceInstance, new_state: Service.ServiceState | None = None, reason: str | None = None) -> ServiceStateTransition.Response: ...

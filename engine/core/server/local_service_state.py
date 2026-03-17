from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\LocalServiceState.java
# WARNING: Unresolved types: AtomicBoolean

from dataclasses import dataclass
from typing import Any

from engine.core.server.service import Service
from engine.core.server.service_instance import ServiceInstance


@dataclass(slots=True, kw_only=True)
class LocalServiceState:
    service: Service | None = None
    instance: ServiceInstance | None = None
    is_state_updatable: AtomicBoolean | None = None

    def with(self, instance: ServiceInstance) -> LocalServiceState:
        raise NotImplementedError  # TODO: translate from Java

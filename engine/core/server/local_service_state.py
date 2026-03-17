from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\LocalServiceState.java

from dataclasses import dataclass
from typing import Any

from engine.core.server.service import Service
from engine.core.server.service_instance import ServiceInstance


@dataclass(slots=True, kw_only=True)
class LocalServiceState:
    service: Service | None = None
    instance: ServiceInstance | None = None
    is_state_updatable: bool | None = None

    def with(self, instance: ServiceInstance) -> LocalServiceState:
        raise NotImplementedError  # TODO: translate from Java

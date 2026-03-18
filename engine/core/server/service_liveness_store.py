from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServiceLivenessStore.java
# WARNING: Unresolved types: ServiceState

from typing import Any, Protocol

from engine.core.server.service_instance import ServiceInstance


class ServiceLivenessStore(Protocol):
    def find_all_instances_in_states(self, states: set[ServiceState]) -> list[ServiceInstance]: ...

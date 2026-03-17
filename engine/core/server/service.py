from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\Service.java
# WARNING: Unresolved types: AutoCloseable, T

from typing import Any, Protocol

from engine.core.server.metric import Metric
from engine.core.server.service_type import ServiceType


class Service(Protocol):
    def get_id(self) -> str: ...

    def get_type(self) -> ServiceType: ...

    def get_state(self) -> ServiceState: ...

    def get_metrics(self) -> set[Metric]: ...

    def skip_graceful_termination(self, skip_graceful_termination: bool) -> None: ...

    def unwrap(self) -> T: ...

    def close(self) -> None: ...

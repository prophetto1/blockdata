from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServiceStateTransition.java
# WARNING: Unresolved types: ImmutablePair, ServiceState

from dataclasses import dataclass
from enum import Enum
from typing import Any

from engine.core.server.service import Service
from engine.core.server.service_instance import ServiceInstance


@dataclass(slots=True, kw_only=True)
class ServiceStateTransition:

    @staticmethod
    def maybe_transition_service_state(from: ServiceInstance, to: ServiceInstance, new_state: Service.ServiceState, reason: str) -> Response:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_transition_and_get_response(initial: ServiceInstance, new_state: Service.ServiceState, result: ImmutablePair[ServiceInstance, ServiceInstance]) -> Response:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Response:
        result: Result | None = None
        instance: ServiceInstance | None = None

        def is(self, result: Result) -> bool:
            raise NotImplementedError  # TODO: translate from Java

    class Result(str, Enum):
        SUCCEEDED = "SUCCEEDED"
        FAILED = "FAILED"
        ABORTED = "ABORTED"

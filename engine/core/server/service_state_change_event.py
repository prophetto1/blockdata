from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServiceStateChangeEvent.java
# WARNING: Unresolved types: ApplicationEvent

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.server.service import Service


@dataclass(slots=True, kw_only=True)
class ServiceStateChangeEvent(ApplicationEvent):
    serial_version_uid: ClassVar[int] = 1
    properties: dict[str, Any] | None = None

    def properties(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_service(self) -> Service:
        raise NotImplementedError  # TODO: translate from Java

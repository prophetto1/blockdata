from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\LocalServiceStateFactory.java

from dataclasses import dataclass
from typing import Any

from engine.core.server.local_service_state import LocalServiceState
from engine.core.server.server_config import ServerConfig
from engine.core.server.server_instance_factory import ServerInstanceFactory
from engine.core.server.service import Service


@dataclass(slots=True, kw_only=True)
class LocalServiceStateFactory:
    server_config: ServerConfig | None = None
    server_instance_factory: ServerInstanceFactory | None = None

    def new_local_service_state(self, service: Service, properties: dict[str, Any]) -> LocalServiceState:
        raise NotImplementedError  # TODO: translate from Java

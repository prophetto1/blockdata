from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\server\ServerInstanceFactory.java
# WARNING: Unresolved types: Environment

from dataclasses import dataclass
from typing import Any

from engine.core.contexts.kestra_context import KestraContext
from engine.core.server.server_instance import ServerInstance
from engine.core.models.server_type import ServerType
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ServerInstanceFactory:
    context: KestraContext | None = None
    environment: Environment | None = None

    def new_server_instance(self) -> ServerInstance:
        raise NotImplementedError  # TODO: translate from Java

    def get_instance_type(self) -> ServerInstance.Type:
        raise NotImplementedError  # TODO: translate from Java

    def get_server_type(self) -> ServerType:
        raise NotImplementedError  # TODO: translate from Java

    def get_server_port(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_server_management_port(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

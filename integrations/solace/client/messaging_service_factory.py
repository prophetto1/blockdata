from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\client\MessagingServiceFactory.java
# WARNING: Unresolved types: Exception, MessagingService

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from integrations.solace.solace_connection_interface import SolaceConnectionInterface


@dataclass(slots=True, kw_only=True)
class MessagingServiceFactory:

    @staticmethod
    def create(config: SolaceConnectionInterface, run_context: RunContext) -> MessagingService:
        raise NotImplementedError  # TODO: translate from Java

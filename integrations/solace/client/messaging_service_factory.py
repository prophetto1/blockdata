from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext
from integrations.solace.solace_connection_interface import SolaceConnectionInterface


@dataclass(slots=True, kw_only=True)
class MessagingServiceFactory:

    def create(self, config: SolaceConnectionInterface, run_context: RunContext) -> MessagingService:
        raise NotImplementedError  # TODO: translate from Java

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.pulsar.pulsar_connection_interface import PulsarConnectionInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PulsarService:

    def decode_base64(self, run_context: RunContext, value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, pulsar_connection_interface: PulsarConnectionInterface, run_context: RunContext) -> PulsarClient:
        raise NotImplementedError  # TODO: translate from Java

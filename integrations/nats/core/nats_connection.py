from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.models.connection import Connection
from integrations.nats.core.nats_connection_interface import NatsConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class NatsConnection(Task, NatsConnectionInterface):
    url: str | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    token: Property[str] | None = None
    creds: Property[str] | None = None

    def connect(self, run_context: RunContext) -> Connection:
        raise NotImplementedError  # TODO: translate from Java

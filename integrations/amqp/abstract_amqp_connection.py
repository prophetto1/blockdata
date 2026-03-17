from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.amqp.amqp_connection_interface import AmqpConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAmqpConnection(Task, AmqpConnectionInterface):
    url: Property[str] | None = None
    host: Property[str]
    port: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    virtual_host: Property[str] | None = None

    def connection_factory(self, run_context: RunContext) -> ConnectionFactory:
        raise NotImplementedError  # TODO: translate from Java

    def parse_from_url(self, run_context: RunContext, url: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

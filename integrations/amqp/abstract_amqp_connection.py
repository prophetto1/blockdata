from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\AbstractAmqpConnection.java
# WARNING: Unresolved types: ConnectionFactory, Exception, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.amqp.amqp_connection_interface import AmqpConnectionInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAmqpConnection(ABC, Task):
    host: Property[str]
    port: Property[str] = Property.ofValue("5672")
    virtual_host: Property[str] = Property.ofValue("/")
    url: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None

    def connection_factory(self, run_context: RunContext) -> ConnectionFactory:
        raise NotImplementedError  # TODO: translate from Java

    def parse_from_url(self, run_context: RunContext, url: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

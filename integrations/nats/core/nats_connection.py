from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\core\NatsConnection.java
# WARNING: Unresolved types: IOException, InterruptedException, NoSuchAlgorithmException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.kubernetes.models.connection import Connection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.nats.core.nats_connection_interface import NatsConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class NatsConnection(ABC, Task):
    url: str | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    token: Property[str] | None = None
    creds: Property[str] | None = None

    def connect(self, run_context: RunContext) -> Connection:
        raise NotImplementedError  # TODO: translate from Java
